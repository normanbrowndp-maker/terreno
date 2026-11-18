import { afterEach, expect, it, vi } from "vitest";
import { createSavedPlacesStore } from "@/modules/trips/browser-store";
import { parseSavedPlaces } from "@/modules/trips";

afterEach(() => vi.unstubAllGlobals());
it("retains pending temporary additions and removals when another tab updates storage", () => {
  let disk = JSON.stringify({ version: 1, ids: ["a"] });
  let onStorage:
    ((event: { key: string; newValue: string }) => void) | undefined;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => disk,
      setItem: () => {
        throw new Error("blocked");
      },
    },
    addEventListener: (_: string, listener: typeof onStorage) => {
      onStorage = listener;
    },
    removeEventListener: () => {},
  });
  const store = createSavedPlacesStore(["a", "b", "c"]);
  const unsubscribe = store.subscribe(() => {});
  store.toggle("a");
  store.toggle("b");
  disk = JSON.stringify({ version: 1, ids: ["a", "c"] });
  onStorage!({ key: "terreno.saved.v1", newValue: disk });
  expect(store.getSnapshot().startsWith("memory|")).toBe(true);
  expect(
    parseSavedPlaces(store.getSnapshot().split("|")[1]!, [
      "a",
      "b",
      "c",
    ]).ids.sort(),
  ).toEqual(["b", "c"]);
  unsubscribe();
});
