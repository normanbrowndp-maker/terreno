import { Client } from "pg";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, readFileSync, unlinkSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { createServer } from "node:net";
import manifest from "../../db/bootstrap/neon-test/manifest.json";

/** Local disposable cluster only. Does not read .env.local or current local admin state. */
export async function localCluster(options: { port?: 55432 | 55433 } = {}) {
  if (process.platform !== "win32") throw Error("Bootstrap rehearsal requires the documented Windows portable PG17 binaries");
  if (options.port !== undefined && ![55432, 55433].includes(options.port)) throw Error("Unsafe application rehearsal port");
  // Reserve/probe loopback before creating files. Never adopt or stop an occupied listener.
  const port = await new Promise<number>((ok, fail) => {
    const s = createServer(); s.once("error", fail); s.listen(options.port ?? 0, "127.0.0.1", () => {
      const p = (s.address() as { port: number }).port; s.close(() => ok(p));
    });
  });
  const bin = resolve(".local/postgresql/bin");
  const root = resolve(".local/bootstrap-rehearsal"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, "run-")), data = join(dir, "data");
  const token = randomBytes(16).toString("hex"), clusterName = `travel_bootstrap_${token}`;
  // New test-only local secret, never Neon credentials. Values are neither logged nor persisted in tracked files.
  const password = randomBytes(32).toString("hex"), passFile = join(dir, "init-secret");
  writeFileSync(passFile, password, { mode: 0o600 });
  function run(exe: string, args: string[]) {
    const r = spawnSync(join(bin, `${exe}.exe`), args, { windowsHide: true, stdio: "ignore" });
    if (r.status !== 0) throw Error(`Local rehearsal ${exe} failed (details kept private)`);
  }
  run("initdb", ["-D", data, "-U", "rehearsal_admin", "--pwfile", passFile, "--auth=scram-sha-256", "--encoding=UTF8", "--locale-provider=builtin", "--builtin-locale=C.UTF-8"]);
  unlinkSync(passFile);
  let started = false;
  const clients: Client[] = [];
  try {
    run("pg_ctl", ["-D", data, "-l", join(dir, "server.log"), "-o", `-h 127.0.0.1 -p ${port} -c cluster_name=${clusterName} -c max_connections=12 -c shared_buffers=32MB`, "-w", "start"]); started = true;
    async function connect(database: string) {
      const c = new Client({ host: "127.0.0.1", port, user: "rehearsal_admin", password, database, connectionTimeoutMillis: 3000 });
      await c.connect(); clients.push(c);
      const identity = (await c.query("SELECT current_setting('cluster_name') AS cluster,current_setting('data_directory') AS dir,current_setting('server_version_num')::int AS version")).rows[0];
      if (identity.cluster !== clusterName || realpathSync(identity.dir) !== realpathSync(data) || Math.floor(identity.version / 10000) !== 17) throw Error("Local rehearsal physical identity mismatch");
      return c;
    }
    const admin = await connect("postgres");
    await admin.query("CREATE ROLE terreno_bootstrap_owner NOLOGIN SUPERUSER CREATEDB CREATEROLE INHERIT; CREATE ROLE neon_superuser NOLOGIN");
    await admin.query("CREATE DATABASE travel_test_foundation OWNER terreno_bootstrap_owner");
    const db = await connect("travel_test_foundation");
    async function bootstrapSession() {
      await db.query("RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION terreno_bootstrap_owner");
      for (const [key, value] of Object.entries({ project_id: manifest.projectId, branch_id: manifest.branchId, endpoint_id: manifest.endpointId, host: manifest.host }))
        await db.query("SELECT set_config($1,$2,false)", [`travel.bootstrap.${key}`, value]);
    }
    await bootstrapSession();
    const sql = (file: string) => readFileSync(`db/bootstrap/neon-test/${file}`, "utf8");
    async function prepare(text = sql("10_prepare.sql") + "\n" + sql("20_verify.sql")) {
      try { await db.query(text); }
      catch (error) {
        await db.query("ROLLBACK");
        const e = error as { code?: string; detail?: string };
        const phase = e.detail && /^(guard|roles|drift|extensions|marker|acl|ownership):[0-9A-Z]{5}$/.test(e.detail) ? e.detail : "unknown";
        throw Object.assign(Error(`Local bootstrap rehearsal refused (${phase})`), { code: e.code });
      }
    }
    return { db, admin, sql, prepare, bootstrapSession, dir, clusterName, async close() {
      await Promise.all(clients.map(c => c.end()));
      if (started) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
      started = false;
      const actual = realpathSync(dir), parent = realpathSync(root);
      if (!actual.startsWith(parent + sep) || actual === parent) throw Error("Unsafe rehearsal cleanup path");
      rmSync(actual, { recursive: true });
    } };
  } catch {
    await Promise.all(clients.map(c => c.end().catch(() => undefined)));
    if (started) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
    throw Error("Local bootstrap rehearsal setup refused");
  }
}
