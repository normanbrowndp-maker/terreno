import { expect, it } from "vitest";
import {
  createProjection,
  italyBoundary,
  clampMapZoom,
} from "@/modules/geography";
import { italyDemo } from "@/modules/catalog";

it("projects genuine Italian coordinates with north up and preserves relative geography", () => {
  const project = createProjection([6, 35, 19, 48], 1000, 900);
  const milano = project([9.19, 45.4669]);
  const roma = project([12.4828, 41.8931]);
  expect(milano[0]).toBeLessThan(roma[0]);
  expect(milano[1]).toBeLessThan(roma[1]);
  for (const city of italyDemo.cities.filter(c=>c.countryCode==="IT")) {
    const [x, y] = project([city.longitude, city.latitude]);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(1000);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(900);
  }
  expect(italyBoundary.features[0]?.geometry.type).toBe("MultiPolygon");
  expect(italyBoundary.features[0]?.geometry.coordinates).toHaveLength(3);
});
it("bounds map zoom and refuses non-finite or reversed projection bounds", () => {
  expect(clampMapZoom(Infinity)).toBe(1);
  expect(clampMapZoom(0)).toBe(1);
  expect(clampMapZoom(20)).toBe(5);
  expect(() => createProjection([19, 48, 6, 35], 1000, 900)).toThrow(
    "Invalid map bounds",
  );
});
it("serializes projected SVG coordinates deterministically across server and browser math engines", () => {
  const project = createProjection(
    [11.229166666667, 43.751388888889, 11.279166666667, 43.791388888889],
    1000,
    900,
    5,
  );
  for (const value of project([11.25735833, 43.76374722]))
    expect(value).toBe(Number(value.toFixed(3)));
});
