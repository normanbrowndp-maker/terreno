import type { Principal } from '@/modules/identity';

export interface TripSummary { id: string; title: string; version: number; updatedAt: string }
/** The owner is mandatory at the application boundary, never from request body. */
export interface OwnedTripReader {
  findById(principal: Principal, tripId: string): Promise<TripSummary | null>;
}
