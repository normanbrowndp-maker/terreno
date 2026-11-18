import { describe, expect, it } from 'vitest';
import { coordinates } from '@/modules/geography';
import { resolveLocale } from '@/shared/config/locales';

describe('geography and language primitives', () => {
  it('uses GeoJSON longitude before latitude', () => {
    expect(coordinates(76.9, 43.2)).toEqual([76.9, 43.2]);
  });
  it.each([[181, 0], [0, 91], [NaN, 0], [0, Infinity]])('rejects non-WGS84 input', (longitude, latitude) => {
    expect(() => coordinates(longitude!, latitude!)).toThrow('Invalid WGS84 coordinates');
  });
  it('uses the requested translation then ru then kk/en', () => {
    expect(resolveLocale('kk', ['ru', 'kk'])).toBe('kk');
    expect(resolveLocale('en', ['kk', 'ru'])).toBe('ru');
    expect(resolveLocale('ru', ['en', 'kk'])).toBe('kk');
  });
  it('does not pretend that a missing translation exists', () => {
    expect(resolveLocale('en', [])).toBeUndefined();
  });
});
