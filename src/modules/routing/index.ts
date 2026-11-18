import type { Coordinates } from '@/modules/geography';

export interface RoutingRequest { points: readonly Coordinates[]; mode: 'driving'; signal?: AbortSignal }
export interface RouteLeg {
  fromIndex: number;
  toIndex: number;
  status: 'calculated' | 'unavailable';
  distanceM: number | null;
  durationS: number | null;
  geometry: { type: 'LineString'; coordinates: readonly Coordinates[] } | null;
}
/** Future provider boundary; no provider is connected at foundation stage. */
export interface RoutingProvider {
  calculate(request: RoutingRequest): Promise<{ provider: string; calculatedAt: string; legs: readonly RouteLeg[] }>;
}
