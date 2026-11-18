"use client";
import { useSearchParams } from "next/navigation";

/** Native history integrates with the installed Next router, including back/forward. */
export function useQueryValue(
  key: string,
  fallback = "",
  allowed?: readonly string[],
) {
  const params = useSearchParams();
  const raw = params.get(key) ?? fallback;
  const value = allowed && !allowed.includes(raw) ? fallback : raw.slice(0, 80);
  function setValue(next: string, replace = false) {
    const url = new URL(window.location.href);
    if (!next || next === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, next.slice(0, 80));
    const target = `${url.pathname}${url.search}${url.hash}`;
    if (
      target !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    )
      window.history[replace ? "replaceState" : "pushState"](null, "", target);
  }
  return [value, setValue] as const;
}
