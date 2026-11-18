import { expect, it } from "vitest";
import { parseSavedPlaces, toggleSavedPlace } from "@/modules/trips";

it("accepts only bounded, versioned IDs from the actual collection", () => {
  const allowed = ["a", "b"];
  expect(parseSavedPlaces(null, allowed)).toEqual({ ids: [], valid: true });
  expect(
    parseSavedPlaces('{"version":1,"ids":["a","a","unknown","b"]}', allowed),
  ).toEqual({ ids: ["a", "b"], valid: true });
  for (const value of [
    "broken",
    '{"version":2,"ids":["a"]}',
    '{"version":1,"ids":[3]}',
    "x".repeat(50000),
  ]) {
    expect(parseSavedPlaces(value, allowed)).toEqual({ ids: [], valid: false });
  }
});
it("toggles saves without duplicates or mutating the previous snapshot", () => {
  const previous = ["a"];
  expect(toggleSavedPlace(previous, "b")).toEqual(["a", "b"]);
  expect(toggleSavedPlace(previous, "a")).toEqual([]);
  expect(previous).toEqual(["a"]);
});
