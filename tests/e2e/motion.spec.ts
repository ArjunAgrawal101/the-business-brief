/**
 * Motion: reveals never hide content that is already on screen, never hide
 * anything under reduced motion, and reveal the rest as it scrolls into view.
 */
import { expect, test } from '@playwright/test';

test('below the fold, groups wait until they are scrolled into view', async ({ page }) => {
  await page.goto('/');
  const rooms = page.locator('.rooms[data-reveal]');
  await expect(rooms).toHaveClass(/is-pending/);
  await expect(rooms).not.toHaveClass(/is-in/);
  await rooms.scrollIntoViewIfNeeded();
  await expect(rooms).toHaveClass(/is-in/);
  await expect(rooms.locator('> li').last()).toHaveCSS('opacity', '1');
});

test('nothing is held back under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.is-pending')).toHaveCount(0);
  await expect(page.locator('.rooms > li').last()).toHaveCSS('opacity', '1');
  // The hero arrives at once.
  await expect(page.locator('.hero .btn--primary')).toHaveCSS('opacity', '1');
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
