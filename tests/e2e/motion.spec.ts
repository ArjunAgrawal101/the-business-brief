/**
 * Motion: reveals never hide content that is already on screen, never hide
 * anything under reduced motion, and reveal the rest as it scrolls into view.
 */
import { expect, test } from '@playwright/test';

test('below the fold, groups wait until they are scrolled into view', async ({ page }) => {
  await page.goto('/');
  const units = page.locator('.hc[data-reveal]');
  await expect(units).toHaveClass(/is-pending/);
  await expect(units).not.toHaveClass(/is-in/);
  await units.scrollIntoViewIfNeeded();
  await expect(units).toHaveClass(/is-in/);
  await expect(units.locator('> li').last()).toHaveCSS('opacity', '1');
});

test('nothing is held back under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.is-pending')).toHaveCount(0);
  await expect(page.locator('.hc > li').last()).toHaveCSS('opacity', '1');
  // The hero arrives at once.
  await expect(page.locator('.hh .btn--primary').first()).toHaveCSS('opacity', '1');
  await context.close();
});

test('nothing on screen at load is hidden', async ({ page }) => {
  await page.goto('/');
  const firstScreen = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight * 0.9)
      .map((el) => el.className),
  );
  for (const cls of firstScreen) expect(cls).not.toContain('is-pending');
});
