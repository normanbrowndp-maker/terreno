import { CityIndexScreen } from "@/components/screens/city-index";
export const metadata = { title: "48 ways in" };
export default async function CityIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  return <CityIndexScreen key={query} initialQuery={query} />;
}
