/**
 * Reflow (WCAG 2.2, 1.4.10): at 320 CSS pixels wide, no page scrolls
 * sideways. Wide tables, charts and diagrams scroll inside their own region;
 * the page itself never does. The page checks (pages.spec.ts) test the same
 * pages at a phone's width with axe-core; this spec tests the narrowest
 * width the platform promises, where long tags, long words and text kept for
 * screen readers inside a wide table used to push the page wider.
 */
import { expect, test } from '@playwright/test';
import { builtPages } from './pages';

const PAGES = builtPages();
const CHUNKS = 8;

test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });

for (let n = 0; n < CHUNKS; n++) {
  const chunk = PAGES.filter((_, i) => i % CHUNKS === n);
  test(`pages ${n + 1} of ${CHUNKS} (${chunk.length}) fit a 320 pixel screen`, async ({ page }) => {
    test.setTimeout(240_000);
    const wide: string[] = [];
    for (const path of chunk) {
      await page.goto(path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 0) wide.push(`${path} (${over} px)`);
    }
    expect(wide, 'pages that scroll sideways at 320 pixels').toEqual([]);
  });
}
