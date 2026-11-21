import { getItalyCatalog } from "@/modules/catalog/server";
import { catalogMeta, catalogUnavailableResponse } from "@/modules/catalog/api";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const catalog = await getItalyCatalog();
  if (catalog.backend === "unavailable") return catalogUnavailableResponse(catalog);
  const city = catalog.cities.find(
    (item) => item.slug === slug || item.id === slug,
  );
  return city
    ? Response.json(
        {
          data: {
            ...city,
            places: catalog.places.filter(
              (place) => place.citySlug === city.slug,
            ),
          },
          meta: catalogMeta(catalog),
        },
        { headers: { "Cache-Control": "no-store" } },
      )
    : Response.json(
        { error: { code: "NOT_FOUND", message: "City not found" } },
        { status: 404 },
      );
}
