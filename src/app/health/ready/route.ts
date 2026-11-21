import { checkDatabaseReadiness } from "@/shared/db/pool";
import { readiness } from "@/shared/db/readiness";
import { getItalyCatalog } from "@/modules/catalog/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return readiness(async () => {
    await checkDatabaseReadiness();
    if (process.env.NODE_ENV === "production") {
      const catalog = await getItalyCatalog();
      if (catalog.backend !== "postgres" || catalog.availability !== "ready") {
        throw new Error("Catalog not ready");
      }
    }
  });
}
