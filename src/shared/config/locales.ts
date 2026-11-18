export type Locale = 'ru' | 'kk' | 'en';
export const supportedLocales: readonly Locale[] = ['ru', 'kk', 'en'];

export function resolveLocale(requested: Locale, available: readonly Locale[]): Locale | undefined {
  return [requested, ...supportedLocales].find((locale) => available.includes(locale));
}
