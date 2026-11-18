import { notFound } from "next/navigation";
import { CityScreen } from "@/components/screens/city";
import { categories, type PlaceCategory } from "@/modules/catalog";
import { getItalyCatalog } from "@/modules/catalog/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = (await getItalyCatalog()).cities.find(
    (item) => item.slug === slug,
  );
  return { title: city?.name ?? "City not found", description: city?.subtitle };
}
export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ slug }, query, catalog] = await Promise.all([
    params,
    searchParams,
    getItalyCatalog(),
  ]);
  if (!catalog.cities.some((city) => city.slug === slug)) notFound();
  const category =
    typeof query.category === "string" &&
    categories.includes(query.category as PlaceCategory)
      ? (query.category as PlaceCategory)
      : "";
  return (
    <CityScreen
      key={`${slug}:${category}`}
      slug={slug}
      initialCategory={category}
    />
  );
}
