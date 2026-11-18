export type Coordinates = readonly [longitude: number, latitude: number];
export type CountryCode = string;
export interface Region { id: string; countryCode: CountryCode; code: string; timezone: string }

export function coordinates(longitude: number, latitude: number): Coordinates {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
    throw new Error('Invalid WGS84 coordinates');
  }
  return [longitude, latitude];
}
