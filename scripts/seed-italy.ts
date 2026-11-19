import { Client } from "pg";
import { loadLocalEnv } from "./load-local-env";
import { resolveDatabaseConnection } from "../src/shared/db/connection-profile";
import { seedItalyDemo } from "../src/modules/catalog/seed";

async function main() {
  loadLocalEnv();
  const test = process.argv.includes("--test");
  const url = test
    ? process.env.TEST_DATABASE_URL
    : process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("An owned local database is required");
  const connection = resolveDatabaseConnection(
    url,
    test ? "test" : "development",
  );
  const db = connection.withConnectionString(
    (connectionString) =>
      new Client({
        connectionString,
        connectionTimeoutMillis: 2000,
        query_timeout: 10000,
      }),
  );
  try {
    await db.connect();
    await seedItalyDemo(db, test ? "test" : "development", connection.target);
    console.log(
      "Italy editorial demo provisioned:48 cities,12 places. Production records untouched.",
    );
  } finally {
    await db.end();
  }
}
main().catch(() => {
  console.error(
    "Demo seed failed. Check approved target and database readiness; credentials are not logged.",
  );
  process.exitCode = 1;
});
