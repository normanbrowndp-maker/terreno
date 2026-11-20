import { expect, it } from "vitest";
import { italyDemo, collectionSchema } from "@/modules/catalog";
it("retains the 48 Italian cities and publishes ten sourced places each in Firenze and Roma", () => {
 expect(collectionSchema.safeParse(italyDemo).success).toBe(true);
 expect(italyDemo.cities.filter(c=>c.countryCode==="IT")).toHaveLength(48);
 for(const city of ["firenze","roma"]) {
  const places=italyDemo.places.filter(p=>p.citySlug===city);
  expect(places.length).toBeGreaterThanOrEqual(10);
  expect(new Set(places.map(p=>p.wikidataId)).size).toBe(places.length);
  for(const p of places) expect(p.sources.length).toBeGreaterThanOrEqual(2);
 }
});
