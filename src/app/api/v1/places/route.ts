import { getItalyCatalog } from "@/modules/catalog/server";
import { catalogListResponse } from "@/modules/catalog/api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return catalogListResponse(
    await getItalyCatalog(),
    "places",
    new URL(request.url).searchParams,
  );
}
