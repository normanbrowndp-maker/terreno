/** Browser-only bookmarks. This is deliberately separate from authenticated trips. */
export const savedPlacesKey = "terreno.saved.v1";
export function parseSavedPlaces(
  raw: string | null,
  allowed: readonly string[],
): { ids: string[]; valid: boolean } {
  if (raw === null) return { ids: [], valid: true };
  if (raw.length > 20000) return { ids: [], valid: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1 ||
      !("ids" in value) ||
      !Array.isArray(value.ids) ||
      value.ids.length > 128 ||
      value.ids.some((id: unknown) => typeof id !== "string")
    )
      return { ids: [], valid: false };
    const validIds = new Set(allowed);
    return {
      ids: [...new Set(value.ids as string[])].filter((id) => validIds.has(id)),
      valid: true,
    };
  } catch {
    return { ids: [], valid: false };
  }
}
export function toggleSavedPlace(
  previous: readonly string[],
  id: string,
): string[] {
  return previous.includes(id)
    ? previous.filter((value) => value !== id)
    : [...previous, id].slice(-128);
}
