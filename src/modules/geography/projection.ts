import boundary from "./data/italy-boundary.json";
export const italyBoundary = boundary;
export type Bounds = readonly [number, number, number, number];
export type MapPoint = readonly [number, number];
const mercatorY = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));

/** Uniform Web Mercator projection; coordinates are always longitude, latitude. */
export function createProjection(
  bounds: Bounds,
  width: number,
  height: number,
  padding = 35,
): (point: MapPoint) => [number, number] {
  const [west, south, east, north] = bounds;
  if (
    ![...bounds, width, height].every(Number.isFinite) ||
    west >= east ||
    south >= north ||
    south <= -85 ||
    north >= 85 ||
    width <= 2 * padding ||
    height <= 2 * padding
  )
    throw new Error("Invalid map bounds");
  const x0 = (west * Math.PI) / 180,
    x1 = (east * Math.PI) / 180;
  const y0 = mercatorY(south),
    y1 = mercatorY(north);
  const scale = Math.min(
    (width - 2 * padding) / (x1 - x0),
    (height - 2 * padding) / (y1 - y0),
  );
  const offsetX = (width - (x1 - x0) * scale) / 2;
  const offsetY = (height - (y1 - y0) * scale) / 2;
  // Math.log/tan may differ by a final bit between V8 builds. Quantize display
  // pixels, never source coordinates, so React SSR and hydration agree exactly.
  return ([longitude, latitude]) => [
    Number((offsetX + ((longitude * Math.PI) / 180 - x0) * scale).toFixed(3)),
    Number((offsetY + (y1 - mercatorY(latitude)) * scale).toFixed(3)),
  ];
}
export function clampMapZoom(value: number): number {
  return Number.isFinite(value) ? Math.min(5, Math.max(1, value)) : 1;
}
export const streetSnapshotCities: readonly string[] = [
  "firenze",
  "roma",
  "milano",
];
