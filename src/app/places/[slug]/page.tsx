import { notFound } from "next/navigation";
import { PlaceScreen } from "@/components/screens/place";
import { getItalyCatalog } from "@/modules/catalog/server";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = (await getItalyCatalog()).places.find(
    (item) => item.slug === slug,
  );
  return {
    title: place?.name ?? "Place not found",
    description: place?.description,
  };
}
export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getItalyCatalog();
  if (!catalog.places.some((place) => place.slug === slug)) notFound();
  return <PlaceScreen key={slug} slug={slug} />;
}
