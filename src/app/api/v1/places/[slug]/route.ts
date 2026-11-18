import { getItalyCatalog } from "@/modules/catalog/server";
import { catalogMeta } from "@/modules/catalog/api";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const catalog = await getItalyCatalog();
  const place = catalog.places.find(
    (item) => item.slug === slug || item.id === slug,
  );
  return place
    ? Response.json(
        { data: place, meta: catalogMeta(catalog) },
        { headers: { "Cache-Control": "no-store" } },
      )
    : Response.json(
        { error: { code: "NOT_FOUND", message: "Place not found" } },
        { status: 404 },
      );
}
