import { notFound } from "next/navigation";
import { CityScreen } from "@/components/screens/city";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, catalog] = await Promise.all([params, getItalyCatalog()]);
  if (!catalog.cities.some((city) => city.slug === slug)) notFound();
  return <CityScreen key={slug} slug={slug} />;
}
