import { test, expect } from '@playwright/test';

test('opens the actual foundation page and real health/version endpoints', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Туристическая платформа' })).toBeVisible();
  await expect(page.getByText('Пилотные направления: Астана, Алматы и Бурабай.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Проверка приложения' })).toBeVisible();
  await page.getByRole('link', { name: 'Работа приложения', exact: true }).focus();
  await expect(page.getByRole('link', { name: 'Работа приложения', exact: true })).toBeFocused();
  expect(await (await request.get('/health/live')).json()).toEqual({ status: 'ok' });
  const ready = await request.get('/health/ready');
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ status: 'ready' });
  expect(await (await request.get('/api/v1')).json()).toEqual({ data: { apiVersion: 'v1', stage: 'foundation' } });
  expect((await request.get('/api/v1/places')).status()).toBe(404);
});

test('foundation remains usable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
