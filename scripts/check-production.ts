import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

// Local HTTP-only rehearsal of the built application; never reads a credential file.
// The second case must be rejected by the unchanged guard before opening a DB socket.
const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(pkg.scripts["start:railway"], "next start --hostname 0.0.0.0");
const config = JSON.parse(await readFile("railway.json", "utf8"));
assert.equal(config.deploy.startCommand, "npm run start:railway");
assert.equal(config.deploy.healthcheckPath, "/health/ready");

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

const sentinel = randomBytes(24).toString("hex"); // Synthetic test value, not a credential.
for (const scenario of ["missing-database", "unapproved-external-database"] as const) {
  const port = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: scenario === "missing-database" ? "" : `postgresql://fixture:${sentinel}@unapproved.invalid/travel_railway_fixture`,
    TRAVEL_DATABASE_PROFILE: "local",
    TRAVEL_DATABASE_ID: "travel_railway_fixture",
  };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"], {
    env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let spawnFailed = false;
  const closed = new Promise<void>(resolve => child.once("close", () => resolve()));
  child.on("error", () => { spawnFailed = true; });
  child.stdout.on("data", chunk => { output += String(chunk); });
  child.stderr.on("data", chunk => { output += String(chunk); });
  const request = (path: string) => fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(5000) });
  try {
    let started = false;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline && child.exitCode === null && !spawnFailed) {
      try { if ((await request("/health/live")).status === 200) { started = true; break; } } catch { /* wait for owned child */ }
      await delay(100);
    }
    assert(started, "Production server did not start on the PORT environment variable");
    assert.deepEqual(await (await request("/health/live")).json(), { status: "ok" });
    const readiness = await request("/health/ready");
    assert.equal(readiness.status, 503, "Unconfigured DB must not pass readiness");
    assert.deepEqual(await readiness.json(), { status: "not_ready" });
    for (const path of ["/api/v1/cities", "/api/v1/places", "/api/v1/cities/firenze", "/api/v1/places/uffizi-gallery"]) {
      const response = await request(path);
      assert.equal(response.status, 503, "Catalog outage must be an explicit API failure");
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      const body = await response.json();
      assert.equal(body.error.code, "CATALOG_UNAVAILABLE");
      assert.equal(body.meta.backend, "unavailable");
      assert(!("data" in body), "Outage must not expose bundled catalog records");
      assert(!JSON.stringify(body).includes(sentinel), "Response contains sensitive details");
    }
    for (const path of ["/", "/cities", "/cities/firenze", "/places/uffizi-gallery", "/saved"]) {
      const response = await request(path);
      assert.equal(response.status, 200); // App Router maintenance UI, not a claim of HTTP 503.
      const body = await response.text();
      assert(body.includes("Catalog temporarily unavailable."), "Maintenance UI missing");
      assert(!body.includes('data-catalog-backend="bundled"'), "Production must not render bundled fallback");
      assert(!body.includes(sentinel), "HTML contains sensitive details");
    }
    console.log(`Production HTTP: ${scenario} PASS (PORT, live/ready, 4 catalog endpoints, 5 pages)`);
  } finally {
    child.kill(); // Only the direct Next process started above; no shell, existing server or port is terminated.
    await Promise.race([closed, delay(10000).then(() => { throw new Error("Owned production server did not stop"); })]);
    assert(!output.includes(sentinel), "Production logs contain sensitive details");
    assert(!output.includes("postgresql://"), "Production logs contain a database URL");
  }
}
