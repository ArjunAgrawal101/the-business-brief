/**
 * The Business Intelligence Briefing: its standfirst states the span of the
 * developments it lists, computed from their dates; its filters narrow the dated list and
 * say so in a polite live region, keep their state in the address, recover
 * from an empty result, and leave a complete list without JavaScript; its
 * themes are pages of their own that list exactly the items filed under them,
 * without JavaScript; every list shows when each item was published and
 * checked; every item page answers the six questions in order, keeps the
 * course apart from what lies beyond it, and ties each fact's citation to a
 * source entry that shows its publisher, publication and access dates and an
 * https address.
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
    // A theme and a key concept that no item shares, found from the page so that new items cannot break the test.
    const kinds = await page.locator('#ib-kind option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    const concepts = await page.locator('#ib-concept option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    let pair: [string, string] | undefined;
    for (const k of kinds) {
      for (const c of concepts) if (!pair && (await rowsWith(page, 'kinds', k, ['concepts', c])) === 0) pair = [k, c];
    }
    expect(pair, 'a theme and a key concept that no item shares').toBeDefined();
    const [kind, concept] = pair!;
    await page.selectOption('#ib-kind', kind);
    await page.selectOption('#ib-concept', concept);
    const none = await rowsWith(page, 'kinds', kind, ['concepts', concept]);
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

  test('states the span of the developments it lists, computed from their dates', async ({ page }) => {
    await page.goto('/intelligence/');
    // The development dates of every row, oldest first; a month without a day sorts before the days in it.
    const dates = await page.locator('[data-item] .ib-row__date time').evaluateAll((ts) =>
      ts
        .map((t) => t.getAttribute('datetime') ?? '')
        .filter(Boolean)
        .sort(),
    );
    expect(dates.length).toBeGreaterThanOrEqual(8);
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
    const first = monthYear(dates[0]!);
    const last = monthYear(dates[dates.length - 1]!);
    const span = first === last ? `in ${first}` : `from ${first} to ${last}`;
    await expect(page.locator('.ib-mast__lead')).toContainText(`Real business developments ${span},`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', `Real business developments ${span}, curated by hand, dated and sourced to the organizations' own documents, filed under twelve themes and read through the ideas of IB Business Management and beyond.`);
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

  test('answers the six questions in order on every item page, with its dates in view', async ({ page }) => {
    await page.goto('/intelligence/');
    const hrefs = await page.locator('.ib-row__title a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    const questions = [
      'What happened?',
      'What is the business context?',
      'Which management concepts are relevant?',
      'What choices did the organization face?',
      'What were the implications?',
      'What can a student or manager learn?',
    ];
    for (const href of hrefs) {
      await page.goto(href);
      const heads = (await page.locator('.ib-doc__main .sec-head h2').allInnerTexts()).map((t) => t.replace(/^Section \d+:\s*/, '').trim());
      expect(heads.slice(0, 6), href).toEqual(questions);
      // The facts come first and are labelled; the analysis follows the mark.
      const order = await page.evaluate(() => {
        const mark = document.querySelector('.ib-analysis-mark');
        const facts = document.querySelector('#happened-h');
        const context = document.querySelector('#context-h');
        return Boolean(mark && facts && context && facts.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING && mark.compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(order, `${href}: facts, then the analysis mark, then the context`).toBe(true);
      const stamp = page.locator('.ib-head__stamp');
      await expect(stamp).toContainText('Published');
      await expect(stamp).toContainText('Sources checked');
      await expect(stamp.locator('time')).toHaveCount(2);
      // Material beyond the course, where there is any, sits in its own labelled group.
      const beyond = page.locator('.ib-group--beyond');
      if (await beyond.count()) await expect(beyond).toContainText('Enrichment');
    }
  });

  test('shows when every item in the list was published and checked', async ({ page }) => {
    await page.goto('/intelligence/');
    const rows = page.locator('[data-item]');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const dates = rows.nth(i).locator('.ib-dates');
      await expect(dates).toContainText('Published');
      await expect(dates).toContainText('Checked');
      await expect(dates.locator('time')).toHaveCount(2);
    }
    await expect(page.locator('.ib-lead .ib-dates time')).toHaveCount(2);
  });

  test('lists each theme on a page of its own, with exactly the items filed under it, without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/intelligence/');
    const themes = await page.locator('.ib-theme__name a, .ib-themes__more a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(themes.length).toBeGreaterThanOrEqual(12);
    // Every item's themes, read from the list on the front page.
    const filed = await page.locator('[data-item]').evaluateAll((els) =>
      els.map((e) => ({ href: e.querySelector('.ib-row__title a')?.getAttribute('href') ?? '', kinds: (e.getAttribute('data-kinds') ?? '').split(' ') })),
    );
    // The theme filter's options pair each theme's label with its id.
    const options = await page.locator('#ib-kind option').evaluateAll((os) => os.map((o) => ({ value: (o as HTMLOptionElement).value, text: (o.textContent ?? '').trim() })).filter((o) => o.value));
    for (const href of themes) {
      await page.goto(href);
      await expect(page.locator('h1')).toHaveCount(1);
      const listed = await page.locator('[data-theme-item] .ib-row__title a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      // The theme page names its theme in the navigation of every theme, marked as the current page.
      const current = page.locator('.ib-theme-nav a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      const label = (await page.locator('h1').innerText()).trim();
      await expect(current).toContainText(label);
      const kind = options.find((o) => o.text === label)?.value;
      if (!kind) {
        // A theme no item carries is not offered as a filter, and its page says it is empty.
        expect(listed, href).toEqual([]);
        await expect(page.locator('.state')).toContainText('No item is filed under this theme yet');
        continue;
      }
      expect(listed.sort(), href).toEqual(filed.filter((f) => f.kinds.includes(kind)).map((f) => f.href).sort());
      await expect(page.locator('[data-theme-item] .ib-dates time')).toHaveCount(listed.length * 2);
    }
    await context.close();
  });

  test('covers all twelve themes, and links each item to the themes it is filed under', async ({ page }) => {
    await page.goto('/intelligence/');
    const counts = await page.locator('.ib-theme__count').allInnerTexts();
    expect(counts.length).toBeGreaterThanOrEqual(12);
    expect(counts.slice(0, 12).every((c) => !/^0 /.test(c)), counts.join(', ')).toBe(true);
    const first = await page.locator('.ib-row__title a').first().getAttribute('href');
    await page.goto(first ?? '/intelligence/');
    const themeLinks = page.locator('.ib-side__facts a[href^="/intelligence/themes/"]');
    expect(await themeLinks.count()).toBeGreaterThan(0);
    await themeLinks.first().click();
    await expect(page).toHaveURL(/\/intelligence\/themes\/[a-z-]+\/$/);
    await expect(page.locator(`[data-theme-item] a[href="${first}"]`)).toHaveCount(1);
  });
});
