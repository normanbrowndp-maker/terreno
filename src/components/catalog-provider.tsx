"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CatalogSnapshot } from "@/modules/catalog";
import { createSavedPlacesStore, parseSavedPlaces } from "@/modules/trips";

interface CatalogContextValue {
  catalog: CatalogSnapshot;
  savedIds: string[];
  toggleSaved(id: string): void;
  savingNotice: string | null;
}
const CatalogContext = createContext<CatalogContextValue | null>(null);
export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: CatalogSnapshot;
  children: ReactNode;
}) {
  const allowed = useMemo(
    () => catalog.places.map((place) => place.id),
    [catalog.places],
  );
  const [store] = useState(() => createSavedPlacesStore(allowed));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const raw = snapshot.slice(snapshot.indexOf("|") + 1) || null;
  const parsed = useMemo(() => parseSavedPlaces(raw, allowed), [raw, allowed]);
  const savingNotice = snapshot.startsWith("memory|")
    ? "Saved for this visit only. Browser storage is unavailable."
    : !parsed.valid
      ? "Your saved list could not be read. Start a new list on this device."
      : null;
  return (
    <CatalogContext
      value={{
        catalog,
        savedIds: parsed.ids,
        toggleSaved: store.toggle,
        savingNotice,
      }}
    >
      {children}
    </CatalogContext>
  );
}
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("CatalogProvider is required");
  return value;
}
