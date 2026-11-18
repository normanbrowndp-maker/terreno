import { checkDatabaseReadiness } from "@/shared/db/pool";
import { readiness } from "@/shared/db/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return readiness(checkDatabaseReadiness);
}
