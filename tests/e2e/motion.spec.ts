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

/** Notes, on each page, whether the page transition began and whether it finished. */
const watchTransition = () =>
  window.addEventListener('pagereveal', (e) => {
    const vt = (e as Event & { viewTransition?: { finished: Promise<void> } | null }).viewTransition;
    const w = window as unknown as { __vt?: string };
    w.__vt = vt ? 'started' : 'none';
    vt?.finished.then(() => (w.__vt = 'finished'));
  });

test('moving between pages runs the page transition, without an error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(watchTransition);
  // Several pages, since the transition used to be skipped on some and not others ("opt-in disabled").
  const routes: Array<[string, string]> = [
    ['/pathways/', '/pathways/mba/'],
    ['/topics/', '/topics/cash-flow/'],
    ['/boardroom/', '/boardroom/kestle-cycles/'],
  ];
  for (const [from, to] of routes) {
    await page.goto(from);
    await Promise.all([page.waitForURL((u) => u.pathname === to), page.locator(`main a[href="${to}"]`).first().click()]);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __vt?: string }).__vt), { message: `the transition into ${to}` }).toBe('finished');
  }
  expect(errors).toEqual([]);
});

test('under reduced motion, pages change without a transition', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(watchTransition);
  await page.goto('/pathways/');
  await Promise.all([page.waitForURL('**/pathways/mba/'), page.locator('main a[href="/pathways/mba/"]').first().click()]);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __vt?: string }).__vt)).toBe('none');
  await context.close();
});
