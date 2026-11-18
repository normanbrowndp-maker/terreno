import {
  parseSavedPlaces,
  savedPlacesKey,
  toggleSavedPlace,
} from "./saved-places";

/** One store per mounted browser provider, never a shared server singleton. */
export function createSavedPlacesStore(allowed: readonly string[]) {
  let temporary: string | null = null;
  const pending = new Map<string, boolean>();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const snapshot = (): string => {
    if (temporary !== null) return `memory|${temporary}`;
    try {
      return `disk|${window.localStorage.getItem(savedPlacesKey) ?? ""}`;
    } catch {
      return "memory|";
    }
  };
  return {
    getSnapshot: snapshot,
    getServerSnapshot: () => "disk|",
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === savedPlacesKey || event.key === null) {
          if (temporary !== null) {
            const external = new Set(
              parseSavedPlaces(event.newValue, allowed).ids,
            );
            for (const [id, saved] of pending) {
              if (saved) external.add(id);
              else external.delete(id);
            }
            temporary = JSON.stringify({ version: 1, ids: [...external] });
          }
          notify();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    toggle(id: string) {
      if (!allowed.includes(id)) return;
      const previous = snapshot();
      const raw = previous.slice(previous.indexOf("|") + 1) || null;
      const next = toggleSavedPlace(parseSavedPlaces(raw, allowed).ids, id);
      pending.set(id, next.includes(id));
      const serialized = JSON.stringify({ version: 1, ids: next });
      try {
        window.localStorage.setItem(savedPlacesKey, serialized);
        if (window.localStorage.getItem(savedPlacesKey) !== serialized)
          throw new Error("Storage write not retained");
        temporary = null;
        pending.clear();
      } catch {
        temporary = serialized;
      }
      notify();
    },
  };
}
