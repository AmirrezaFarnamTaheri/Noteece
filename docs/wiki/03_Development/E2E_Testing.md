# E2E Testing with Playwright

We use Playwright for End-to-End (E2E) testing of the desktop application.

## Setup

1. Install dependencies:
   ```bash
   cd apps/desktop
   pnpm install
   npx playwright install --with-deps chromium
   ```

## Running Tests

Run all tests:

```bash
cd apps/desktop
npx playwright test
```

Run a specific test file:

```bash
npx playwright test e2e/basic.spec.ts
```

## Writing Tests

Tests are located in `apps/desktop/e2e/`.

Example `basic.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Noteece/);
});
```

## Configuration

Configuration is in `apps/desktop/playwright.config.ts`. It is configured to launch the Vite dev server automatically.
