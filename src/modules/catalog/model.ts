import { z } from "zod";

const httpsUrl = z
  .string()
  .url()
  .refine(
    (value) => new URL(value).protocol === "https:",
    "HTTPS source required",
  );
const coordinates = {
  longitude: z.number().min(6).max(19),
  latitude: z.number().min(35).max(48),
};
export const categories = [
  "cafe",
  "food",
  "viewpoint",
  "event",
  "garden",
  "museum",
  "landmark",
] as const;
export type PlaceCategory = (typeof categories)[number];
export const sourceSchema = z.object({
  name: z.string().min(1),
  url: httpsUrl,
  license: z.string().min(1),
  licenseUrl: httpsUrl,
});
export const photoSchema = z.object({
  src: z.string().regex(/^\/images\/italy\/[A-Za-z0-9-]+\.jpg$/),
  depicts: z.string().min(1),
  alt: z.string().min(1),
  author: z.string().min(1),
  sourceUrl: httpsUrl,
  originalUrl: httpsUrl,
  license: z.string().min(1),
  licenseUrl: httpsUrl,
  attribution: z.string().min(1),
  verifiedAt: z.iso.date(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Photo = z.infer<typeof photoSchema>;
export const citySchema = z.object({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  countryCode: z.literal("IT"),
  region: z.string().min(1),
  regionSlug: z.string().min(1),
  ...coordinates,
  wikidataId: z.string().regex(/^Q\d+$/),
  verifiedAt: z.iso.date(),
  featured: z.boolean(),
  subtitle: z.string(),
  description: z.string(),
  photo: photoSchema.nullable(),
  sources: z.array(sourceSchema).min(1),
});
export type City = z.infer<typeof citySchema>;
export const placeSchema = z.object({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  citySlug: z.string().min(1),
  countryCode: z.literal("IT"),
  categories: z.array(z.enum(categories)).min(1),
  subtitle: z.string(),
  description: z.string().min(1),
  address: z.string().nullable(),
  ...coordinates,
  wikidataId: z.string().regex(/^Q\d+$/),
  verifiedAt: z.iso.date(),
  officialUrl: httpsUrl,
  hours: z.null(),
  admission: z.null(),
  photo: photoSchema.nullable(),
  sources: z.array(sourceSchema).min(2),
});
export type EditorialPlace = z.infer<typeof placeSchema>;
export const collectionSchema = z.object({
  dataset: z.literal("italy-editorial-demo-v1"),
  verifiedAt: z.iso.date(),
  countryCode: z.literal("IT"),
  sourcePdfSha256: z.string().regex(/^[a-f0-9]{64}$/),
  cities: z.array(citySchema).max(500),
  places: z.array(placeSchema).max(1000),
});
export type EditorialCatalog = z.infer<typeof collectionSchema>;
export interface CatalogSnapshot extends EditorialCatalog {
  backend: "postgres" | "bundled";
  availability:
    "ready" | "database-unavailable" | "not-seeded" | "database-not-configured";
}
