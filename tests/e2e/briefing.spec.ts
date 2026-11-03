/**
 * The Business Intelligence Briefing: its filters narrow the dated list and
 * say so in a polite live region, keep their state in the address, recover
 * from an empty result, and leave a complete list without JavaScript; and on
 * every item page each fact's citation leads to a source entry that shows its
 * publisher, publication and access dates and an https address.
 */
import { expect, test, type Page } from '@playwright/test';

const visibleRows = (page: Page) => page.locator('[data-item]:visible');

/** How many rows carry a facet value, read from the page itself. */
async function rowsWith(page: Page, attr: 'units' | 'concepts' | 'kinds', value: string, also?: ['units' | 'concepts' | 'kinds', string]) {
  return page.locator('[data-item]').evaluateAll(
    (els, [a, v, b]) =>
      els.filter((e) => {
        const has = (k: string, x: string) => (e.getAttribute(`data-${k}`) ?? '').split(' ').includes(x);
        return has(a as string, v as string) && (!b || has((b as [string, string])[0], (b as [string, string])[1]));
      }).length,
    [attr, value, also] as const,
  );
}

test.describe('the Business Intelligence Briefing', () => {
  test('filters the list by unit, key concept and kind, announcing the count', async ({ page }) => {
    await page.goto('/intelligence/');
    const total = await page.locator('[data-item]').count();
    expect(total).toBeGreaterThanOrEqual(8);
    const count = page.locator('[data-count]');
    await expect(count).toHaveAttribute('aria-live', 'polite');
    await expect(count).toHaveText(`Showing all ${total} items`);
    await expect(page.locator('.ib-filters [data-reset]')).toBeHidden();

    await page.selectOption('#ib-unit', '5');
    const inUnit5 = await rowsWith(page, 'units', '5');
    expect(inUnit5).toBeGreaterThan(0);
    expect(inUnit5).toBeLessThan(total);
    await expect(visibleRows(page)).toHaveCount(inUnit5);
    await expect(count).toHaveText(`Showing ${inUnit5} of ${total} items`);
    await expect(page).toHaveURL(/\/intelligence\/\?unit=5$/);
    await expect(page.locator('.ib-filters [data-reset]')).toBeVisible();

    await page.selectOption('#ib-concept', 'ethics');
    const both = await rowsWith(page, 'units', '5', ['concepts', 'ethics']);
    await expect(visibleRows(page)).toHaveCount(both);
    await expect(page).toHaveURL(/\?unit=5&concept=ethics$/);

    await page.locator('.ib-filters [data-reset]').click();
    await expect(visibleRows(page)).toHaveCount(total);
    await expect(page.locator('#ib-unit')).toBeFocused();
    await expect(page).toHaveURL(/\/intelligence\/$/);
  });

  test('shows a way back when no item matches', async ({ page }) => {
    await page.goto('/intelligence/');
    const total = await page.locator('[data-item]').count();
    await page.selectOption('#ib-kind', 'leadership');
    await page.selectOption('#ib-concept', 'sustainability');
    const none = await rowsWith(page, 'kinds', 'leadership', ['concepts', 'sustainability']);
    expect(none).toBe(0);
    await expect(visibleRows(page)).toHaveCount(0);
    await expect(page.locator('[data-none]')).toBeVisible();
    await expect(page.locator('[data-count]')).toHaveText(`No items match these filters, out of ${total} items`);
    await page.locator('[data-none] [data-reset]').click();
    await expect(visibleRows(page)).toHaveCount(total);
    await expect(page.locator('[data-none]')).toBeHidden();
  });

  test('applies filters given in the address, and ignores values it does not offer', async ({ page }) => {
    await page.goto('/intelligence/?kind=leadership');
    await expect(page.locator('#ib-kind')).toHaveValue('leadership');
    await expect(visibleRows(page)).toHaveCount(await rowsWith(page, 'kinds', 'leadership'));

    await page.goto('/intelligence/?unit=9&concept=nothing');
    const total = await page.locator('[data-item]').count();
    await expect(page.locator('#ib-unit')).toHaveValue('');
    await expect(visibleRows(page)).toHaveCount(total);
  });

  test('lists every item without JavaScript and shows no filters', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/intelligence/');
    const total = await page.locator('[data-item]').count();
    expect(total).toBeGreaterThanOrEqual(8);
    await expect(visibleRows(page)).toHaveCount(total);
    await expect(page.locator('.ib-filters')).toBeHidden();
    await context.close();
  });

  test('ties every fact on every item page to a complete source entry', async ({ page }) => {
    await page.goto('/intelligence/');
    const hrefs = await page.locator('.ib-row__title a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThanOrEqual(8);
    for (const href of hrefs) {
      await page.goto(href);
      const facts = page.locator('.ib-fact');
      expect(await facts.count()).toBeGreaterThanOrEqual(3);
      const targets = await page.locator('.ib-fact__src a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(targets.length).toBeGreaterThanOrEqual(await facts.count());
      for (const t of new Set(targets)) await expect(page.locator(t), `${href} ${t}`).toHaveCount(1);
      const sources = page.locator('.ib-sources > li');
      const n = await sources.count();
      expect(n).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < n; i++) {
        const s = sources.nth(i);
        await expect(s.locator('dt', { hasText: 'Publisher' })).toHaveCount(1);
        await expect(s.locator('dt', { hasText: 'Published' })).toHaveCount(1);
        await expect(s.locator('dt', { hasText: 'Accessed' })).toHaveCount(1);
        expect(await s.locator('h3 a').getAttribute('href')).toMatch(/^https:\/\//);
        await expect(s.locator('.ib-sources__supports li').first()).toBeVisible();
      }
      // Facts and analysis are labelled apart, and the question is marked as the platform's own.
      await expect(page.locator('.ib-provenance')).toContainText('External evidence');
      await expect(page.locator('.ib-analysis-mark')).toContainText("The Business Brief's analysis");
      await expect(page.locator('.ib-question')).toContainText('Original practice question');
    }
  });
});
