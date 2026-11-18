import { Client } from "pg";
import { loadLocalEnv } from "./load-local-env";
import { assertLocalDatabaseTarget } from "../src/shared/db/target";
import { seedItalyDemo } from "../src/modules/catalog/seed";

loadLocalEnv();
const test = process.argv.includes("--test");
const url = test
  ? process.env.TEST_DATABASE_URL
  : process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("An owned local database is required");
assertLocalDatabaseTarget(url, test ? "test" : "development");
const db = new Client({
  connectionString: url,
  connectionTimeoutMillis: 2000,
  query_timeout: 10000,
});
try {
  await db.connect();
  await seedItalyDemo(db, test ? "test" : "development");
  console.log(
    "Italy editorial demo provisioned:48 cities,12 places. Production records untouched.",
  );
} finally {
  await db.end();
}
