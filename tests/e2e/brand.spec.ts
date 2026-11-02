/**
 * The brand opening: it plays once per browser, can be skipped at any moment,
 * finishes by itself, leaves the page usable, never plays under reduced
 * motion, and replays only when asked (/?intro).
 */
import { expect, test } from '@playwright/test';

// A first visit: nothing stored yet.
test.use({ storageState: { cookies: [], origins: [] } });

test('the opening plays once, can be skipped, and does not replay', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveClass(/intro-on/);
  const skip = page.locator('[data-intro-skip]');
  await expect(skip).toBeFocused();
  await skip.click();
  await expect(page.locator('[data-brand-intro]')).toHaveCount(0);
  await expect(html).not.toHaveClass(/intro-on/);
  await expect(page.locator('main#main')).not.toHaveAttribute('inert', /.*/);
  await page.goto('/');
  await expect(html).not.toHaveClass(/intro-on/);
  await page.goto('/?intro');
  await expect(html).toHaveClass(/intro-on/);
});

test('the opening finishes by itself and leaves the page usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-brand-intro]')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main#main')).not.toHaveAttribute('inert', /.*/);
});

test('the opening never plays under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/intro-on/);
  await expect(page.locator('main h1')).toBeVisible();
  await context.close();
});
