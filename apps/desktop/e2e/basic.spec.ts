import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Noteece/);
});

test('vault creation flow renders unlock screen', async ({ page }) => {
  await page.goto('/');
  // On first visit, the app should show vault creation or unlock UI
  const vaultUI = page.locator(
    '[data-testid="vault-screen"], [data-testid="unlock-screen"], [data-testid="create-vault"]',
  );
  await expect(vaultUI.first()).toBeVisible({ timeout: 10_000 });
});

test('navigation between main views', async ({ page }) => {
  await page.goto('/');
  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Check that sidebar/navigation exists
  const nav = page.locator('nav, [data-testid="sidebar"], [role="navigation"]');
  await expect(nav.first()).toBeVisible({ timeout: 10_000 });
});

test('note editor is accessible after navigation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Look for note-related UI elements
  const noteArea = page.locator('[data-testid="note-list"], [data-testid="note-editor"], [data-testid="notes-view"]');
  const count = await noteArea.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

test('dashboard renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Verify no critical JavaScript errors occurred
  const criticalErrors = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('favicon'));
  expect(criticalErrors).toHaveLength(0);
});

test('search input is present', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Search should be accessible somewhere in the UI
  const search = page.locator(
    'input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i], [data-testid="search-input"]',
  );
  const count = await search.count();
  expect(count).toBeGreaterThanOrEqual(1);
});
