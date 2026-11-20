import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { City, EditorialPlace } from "../../src/modules/catalog";

test("map selection follows the city card and the keyboard marker", async ({ page }) => {
  await page.goto("/cities/firenze");
  const map = page.getByRole("region", { name: "Map of Firenze" });
  const card = page.locator(".places-grid article").filter({ hasText: "Giardino Bardini" });
  await card.getByRole("button", { name: "Show Giardino Bardini on map" }).click();
  await expect(page).toHaveURL(/place=giardino-bardini/);
  await expect(map.getByRole("button", { name: "Show Giardino Bardini on map" })).toHaveAttribute("aria-pressed", "true");
  const next = map.getByRole("button", { name: "Show Basilica di Santa Croce on map" });
  await next.focus();
  await next.press("Space");
  await expect(page).toHaveURL(/place=santa-croce/);
  await expect(next).toHaveAttribute("aria-pressed", "true");
  await expect(card).not.toHaveAttribute("data-selected", "true");
  await page.goBack();
  await expect(card).toHaveAttribute("data-selected", "true");
});

test("saved places have their own map markers and a matching preview", async ({ page }) => {
  for (const slug of ["giardino-bardini", "colosseo"]) {
    await page.goto(`/places/${slug}`);
    await page.getByRole("button", { name: "Save place", exact: true }).click();
  }
  await page.goto("/saved");
  const row = page.getByTestId("saved-row").filter({ hasText: "Colosseo" });
  await row.getByRole("button", { name: "Show Colosseo on map" }).click();
  await expect(page.locator(".saved-map-preview")).toContainText("Colosseo");
  await expect(page.getByRole("region", { name: "Map of Italy" }).getByRole("button", { name: "Show Colosseo on map" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".terreno-marker[data-kind=place]")).toHaveCount(2);
  await row.getByRole("button", { name: "Remove Colosseo" }).click();
  await expect(page.locator(".saved-map-preview")).toContainText("Giardino Bardini");
  await expect(page.locator(".terreno-marker[data-kind=place]")).toHaveCount(1);
});

test("touch selection reveals the map without motion when requested", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("The Playwright base URL is required");
  const context = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("/cities/firenze");
    const card = page.locator(".places-grid article").filter({ hasText: "Giardino Bardini" });
    await card.getByRole("button", { name: "Show Giardino Bardini on map" }).tap();
    const map = page.getByRole("region", { name: "Map of Firenze" });
    await expect(map.getByRole("button", { name: "Show Giardino Bardini on map" })).toBeInViewport();
    await expect(page.getByTestId("map-canvas")).toHaveAttribute("data-detail", "streets");
  } finally {
    await context.close();
  }
});

test("keyboard search reopens after Escape and ArrowUp selects the last result", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search cities and places" });
  await search.fill("Roma");
  const options = page.locator(".global-search").getByRole("option");
  await expect(options.first()).toBeVisible();
  const last = options.last();
  const destination = await last.getAttribute("href");
  await search.press("Escape");
  await expect(options).toHaveCount(0);
  await search.press("ArrowUp");
  await expect(last).toHaveAttribute("aria-selected", "true");
  await search.press("Enter");
  await expect(page).toHaveURL(path => path.pathname === destination);
});

test("city filters include published categories and the interface identifies the database source", async ({ page, request }) => {
  const api = await request.get("/api/v1/places?city=firenze&category=garden");
  expect(api.status()).toBe(200);
  const body = await api.json();
  expect(body.meta).toMatchObject({ backend: "postgres", availability: "ready" });
  expect(body.data.length).toBeGreaterThan(0);
  await page.goto("/cities/firenze");
  await expect(page.getByText("Served from the database", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gardens", exact: true }).click();
  await expect(page).toHaveURL(/category=garden/);
  await expect(page.locator(".places-grid .place-card")).toHaveCount(body.data.length);
  await page.reload();
  await expect(page.getByRole("button", { name: "Gardens", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("filter URLs survive reload and back navigation, including clears", async ({
  page,
}) => {
  await page.goto("/cities?q=Roma");
  const search = page.getByRole("searchbox", { name: "Filter cities" });
  await search.fill("Florence");
  await expect(page).toHaveURL(/q=Florence/);
  await page.reload();
  await expect(search).toHaveValue("Florence");
  await page.getByRole("button", { name: "Clear city search" }).click();
  await expect(page).toHaveURL(/\/cities$/);
  await page.reload();
  await expect(page.getByTestId("city-row")).toHaveCount(48);
  await page.goto("/cities/firenze");
  await page.getByRole("button", { name: "Cafés", exact: true }).click();
  await expect(page).toHaveURL(/category=cafe/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cafés", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page).toHaveURL(/\/cities\/firenze$/);
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Cafés", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("all Italian editorial cities and places load with matching photos or honest placeholders", async ({
  page,
  request,
}) => {
  const cities = (await (await request.get("/api/v1/cities?country=IT")).json())
    .data as City[];
  const places = (await (await request.get("/api/v1/places?country=IT")).json())
    .data as EditorialPlace[];
  expect(cities).toHaveLength(48);
  expect(places).toHaveLength(26);
  expect(
    cities
      .filter((city) => city.featured)
      .map((city) => city.name)
      .sort(),
  ).toEqual(["Firenze", "Milano", "Napoli", "Roma", "Venezia"]);
  for (const city of cities.filter((item) => item.featured)) {
    await page.goto(`/cities/${city.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: city.name, exact: true }),
    ).toBeVisible();
    expect((await request.get(`/api/v1/cities/${city.slug}`)).status()).toBe(
      200,
    );
  }
  for (const place of places) {
    await page.goto(`/places/${place.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: place.name, exact: true }),
    ).toBeVisible();
    if(place.photo) {
    const photo = page.locator("img[data-photo]:visible").first();
    await expect(photo).toHaveJSProperty("complete", true);
    expect(
      await photo.evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBeGreaterThan(0);
    } else {await expect(page.getByRole("img",{name:place.name+": photograph unavailable"}).first()).toBeVisible();}
    const data = await (
      await request.get(`/api/v1/places/${place.slug}`)
    ).json();
    expect(data.data.wikidataId).toBe(place.wikidataId);
    expect(data.meta.backend).toBe("postgres");
  }
  await page.goto("/cities/pisa");
  await expect(
    page.getByText("Its places are being checked before we publish them.", {
      exact: false,
    }),
  ).toBeVisible();
  expect((await request.get("/cities/not-a-real-city")).status()).toBe(404);
});

test("real city index, search and category empty states navigate to verified details", async ({
  page,
  request,
}) => {
  await page.goto("/cities");
  await expect(
    page.getByRole("heading", { name: "48 ways in." }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Filter cities" }).fill("Florence");
  await expect(page.getByTestId("city-row")).toHaveCount(1);
  await page.getByTestId("city-row").click();
  await expect(page).toHaveURL(/\/cities\/firenze/);
  await expect(
    page.getByRole("heading", { name: "Firenze", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cafés", exact: true }).click();
  await expect(
    page.getByText("No verified cafés in this collection yet."),
  ).toBeVisible();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page
    .getByRole("link", { name: "See Giardino Bardini", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Giardino Bardini", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Check the official website", exact: true }),
  ).toBeVisible();
  const api = await request.get("/api/v1/places?city=firenze");
  expect(api.status()).toBe(200);
  const body = await api.json();
  expect(body.data).toHaveLength(10);
  expect(body.meta.dataset).toBe("italy-editorial-demo-v1");
  expect((await request.get("/api/v1/places?limit=10000")).status()).toBe(400);
  expect((await request.get("/api/v1/places/not-real")).status()).toBe(404);
});

test("device saves start empty, persist on reload, filter and remove honestly", async ({
  page,
}) => {
  await page.goto("/saved");
  await expect(
    page.getByText("Your own little index starts here."),
  ).toBeVisible();
  await page.goto("/places/giardino-bardini");
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove saved place", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove saved place", exact: true }),
  ).toBeVisible();
  await page.goto("/saved");
  await expect(page.getByTestId("saved-row")).toHaveCount(1);
  await expect(
    page.getByText("Saved on this device only", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove Giardino Bardini", exact: true })
    .click();
  await expect(
    page.getByText("Your own little index starts here."),
  ).toBeVisible();
});

test("corrupt or unavailable browser storage does not fabricate persistence", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("terreno.saved.v1", "invalid-json");
  });
  await page.goto("/saved");
  await expect(
    page.getByText(
      "Your saved list could not be read. Start a new list on this device.",
    ),
  ).toBeVisible();
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await page.goto("/places/giardino-bardini");
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await expect(
    page.getByText(
      "Saved for this visit only. Browser storage is unavailable.",
    ),
  ).toBeVisible();
});

test("bookmarks synchronize across tabs and removing a filtered city reveals remaining saves", async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await second.goto("/saved");
  await page.goto("/places/giardino-bardini");
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await expect(second.getByTestId("saved-row")).toHaveCount(1);
  await page.goto("/places/colosseo");
  await page.getByRole("button", { name: "Save place", exact: true }).click();
  await expect(second.getByTestId("saved-row")).toHaveCount(2);
  await second
    .getByRole("combobox", { name: "Filter saved places by city" })
    .selectOption("firenze");
  await expect(second.getByTestId("saved-row")).toHaveCount(1);
  await second
    .getByRole("button", { name: "Remove Giardino Bardini", exact: true })
    .click();
  await expect(second.getByTestId("saved-row")).toHaveCount(1);
  await expect(
    second.getByRole("combobox", { name: "Filter saved places by city" }),
  ).toHaveValue("");
  await expect(
    second.getByRole("link", { name: "Colosseo", exact: true }),
  ).toBeVisible();
  await second.close();
});

test("genuine map supports zoom, keyboard and city links; global search finds a place", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your kind of Italy." }),
  ).toBeVisible();
  await expect(page.locator(".terreno-marker:visible, .terreno-cluster:visible").first()).toBeVisible();
  const before = Number(await page.getByTestId("map-canvas").getAttribute("data-zoom"));
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect.poll(async () => Number(await page.getByTestId("map-canvas").getAttribute("data-zoom"))).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Italy overview" }).click();
  await expect.poll(async () => Number(await page.getByTestId("map-canvas").getAttribute("data-zoom"))).toBeLessThan(before + 0.1);
  await page
    .getByRole("combobox", { name: "Search cities and places" })
    .fill("pantheon");
  await page.getByRole("option", { name: /Pantheon/ }).click();
  await expect(page).toHaveURL(/\/places\/pantheon/);
});

test("pages hydrate without runtime errors and an unavailable photo becomes an honest placeholder", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/cities/firenze",
    "/places/giardino-bardini",
    "/saved",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
  await page.route("**/_next/image?**", (route) => route.abort());
  await page.goto("/places/pantheon");
  await expect(
    page
      .getByRole("img", {
        name: "Pantheon: photograph unavailable",
        exact: true,
      })
      .first(),
  ).toBeVisible();
});

for (const width of [1440, 768, 390, 360]) {
  test(`all screen families stay usable at ${width}px with real photos`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/cities",
      "/cities/firenze",
      "/places/giardino-bardini",
      "/saved",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('[data-catalog-backend="postgres"]')).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("navigation", {
          name: width < 768 ? "Main mobile navigation" : "Main navigation",
        }),
      ).toBeVisible();
      const photos = page.locator("img[data-photo]:visible");
      for (const photo of await photos.all()) {
        await photo.scrollIntoViewIfNeeded();
        await expect(photo).toHaveJSProperty("complete", true);
        expect(
          await photo.evaluate((image: HTMLImageElement) => image.naturalWidth),
        ).toBeGreaterThan(0);
      }
      if (process.env.TERRENO_CAPTURE_SCREENS === "1" && [1440, 390].includes(width)) {
        const folder = "artifacts/terreno/travel027";
        await mkdir(folder, { recursive: true });
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: "instant" });
          document.querySelector(".editorial-panel")?.scrollTo({ top: 0, behavior: "instant" });
        });
        const screen = path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
        await page.screenshot({ path: `${folder}/${width}-${screen}.png`, animations: "disabled" });
      }
    }
  });
}
