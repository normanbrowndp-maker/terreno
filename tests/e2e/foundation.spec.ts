import { test, expect } from "@playwright/test";

test("opens the Italian guide on the preserved foundation and real health/version endpoints", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Find your kind of Italy.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "terreno home", exact: true }).focus();
  await expect(
    page.getByRole("link", { name: "terreno home", exact: true }),
  ).toBeFocused();
  expect(await (await request.get("/health/live")).json()).toEqual({
    status: "ok",
  });
  const ready = await request.get("/health/ready");
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ status: "ready" });
  expect(await (await request.get("/api/v1")).json()).toEqual({
    data: { apiVersion: "v1", stage: "foundation" },
  });
  const places = await request.get("/api/v1/places?country=IT");
  expect(places.status()).toBe(200);
  const catalog = await places.json();
  expect(catalog.data).toHaveLength(26);
  expect(
    catalog.data.every(
      (place: { countryCode: string }) => place.countryCode === "IT",
    ),
  ).toBe(true);
  expect(catalog.meta.backend).toBe("postgres");
  const international = await (await request.get("/api/v1/places")).json();
  expect(international.meta).toMatchObject({backend:"postgres",availability:"ready",total:49});
  expect(international.data).toHaveLength(49);
  expect([...new Set(international.data.map((place:{countryCode:string})=>place.countryCode))].sort()).toEqual(["CH","FI","IT"]);
});

test("foundation remains usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
