/**
 * Every built page: it loads, has no script errors, has one h1 and a main
 * landmark, does not scroll sideways, and passes an axe-core scan for WCAG
 * 2.2 A and AA.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { builtPages } from './pages';

const PAGES = builtPages();

test('the site has the expected pages', () => {
  expect(PAGES.length).toBeGreaterThanOrEqual(50);
});

for (const path of PAGES) {
  test(`page ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    // Let arrival animations finish, so the scan sees the page as a reader does after the first half-second.
    await page.evaluate(async () => {
      const running = document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity);
      await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
    });
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main#main')).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0);
    // @axe-core/playwright is typed against an older Page; the object is the same at run time.
    type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
    const axe = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const summary = axe.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
    expect(summary, 'axe violations').toEqual([]);
    expect(errors, 'script errors').toEqual([]);
  });
}

test('the 404 page is served for an unknown address', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('not in the brief');
});
