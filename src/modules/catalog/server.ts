import "server-only";
import { cache } from "react";
import { withCatalogDatabase } from "@/shared/db/pool";
import { italyDemo } from "./demo";
import { collectionSchema, type CatalogSnapshot } from "./model";
import { readItalyCatalog, IncompleteItalySeedError } from "./postgres";

/** Shared by SSR and API; the actual storage source is always disclosed. */
export const getItalyCatalog = cache(async (): Promise<CatalogSnapshot> => {
  const bundled = collectionSchema.parse(italyDemo);
  const unavailable = (availability: Exclude<CatalogSnapshot["availability"], "ready">): CatalogSnapshot =>
    process.env.NODE_ENV === "production"
      ? { ...bundled, backend: "unavailable", availability, cities: [], places: [] }
      : { ...bundled, backend: "bundled", availability };
  if (!process.env.DATABASE_URL)
    return unavailable("database-not-configured");
  try {
    const catalog = await withCatalogDatabase(readItalyCatalog);
    return catalog
      ? { ...catalog, backend: "postgres", availability: "ready" }
      : unavailable("not-seeded");
  } catch (error) {
    if (error instanceof IncompleteItalySeedError)
      return unavailable("incomplete-seed");
    console.warn("italy_editorial_database_unavailable"); // Never serialize SQL or credentials.
    return unavailable("database-unavailable");
  }
});
