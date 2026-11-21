import { notFound } from "next/navigation";
import { CityScreen } from "@/components/screens/city";
import { getItalyCatalog } from "@/modules/catalog/server";
import { CatalogUnavailable } from "@/components/catalog-unavailable";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getItalyCatalog();
  if (catalog.backend === "unavailable") return { title: "Catalog temporarily unavailable" };
  const city = catalog.cities.find(
    (item) => item.slug === slug,
  );
  return { title: city?.name ?? "City not found", description: city?.subtitle };
}
export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, catalog] = await Promise.all([params, getItalyCatalog()]);
  if (catalog.backend === "unavailable") return <CatalogUnavailable />;
  if (!catalog.cities.some((city) => city.slug === slug)) notFound();
  return <CityScreen key={slug} slug={slug} />;
}
