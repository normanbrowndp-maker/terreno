import type { Coordinates, CountryCode } from "@/modules/geography";
import type { Locale } from "@/shared/config/locales";

export interface PlaceSummary {
  id: string;
  name: string;
  contentLocale: Locale;
  countryCode: CountryCode;
  regionId: string;
  categoryCodes: readonly string[];
  location: { type: "Point"; coordinates: Coordinates };
  version: number;
}

/** Port only: no catalog implementation, fixtures or public endpoint yet. */
export interface CatalogReader {
  findPublishedById(id: string, locale: Locale): Promise<PlaceSummary | null>;
}

export * from "./model";
export * from "./queries";
export { italyDemo } from "./demo";

export * from "./countries";
