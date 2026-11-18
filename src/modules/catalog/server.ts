import "server-only";
import { cache } from "react";
import { withCatalogDatabase } from "@/shared/db/pool";
import { italyDemo } from "./demo";
import { collectionSchema, type CatalogSnapshot } from "./model";
import { readItalyCatalog } from "./postgres";

/** Shared by SSR and API; the actual storage source is always disclosed. */
export const getItalyCatalog = cache(async (): Promise<CatalogSnapshot> => {
  const bundled = collectionSchema.parse(italyDemo);
  if (!process.env.DATABASE_URL)
    return {
      ...bundled,
      backend: "bundled",
      availability: "database-not-configured",
    };
  try {
    const catalog = await withCatalogDatabase(readItalyCatalog);
    return catalog
      ? { ...catalog, backend: "postgres", availability: "ready" }
      : { ...bundled, backend: "bundled", availability: "not-seeded" };
  } catch {
    console.warn("italy_editorial_database_unavailable"); // Never serialize SQL or credentials.
    return {
      ...bundled,
      backend: "bundled",
      availability: "database-unavailable",
    };
  }
});
