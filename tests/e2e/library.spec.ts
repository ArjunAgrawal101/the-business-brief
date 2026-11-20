/**
 * The Resources Library and the Teacher resource area, driven as a reader
 * would: the search narrows the list, announces the count and keeps the query
 * in the address; categories and filters narrow it further and a shared
 * address opens the same selection; on a phone the filters sit behind one
 * Filter button; the list view and "Show more" work; every download on the
 * page returns its file; lesson presentations say plainly that they are not
 * yet available; without JavaScript every resource is listed. In the teacher
 * area, the lesson sequences follow the lesson length, the checklists print
 * and download as a CSV, and an activity's lesson adds up.
 */
import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('li[data-id]:not([hidden])');
const all = (page: Page) => page.locator('li[data-id]');

test.describe('the Resources Library', () => {
  test('search narrows the list, announces the count and keeps the query in the address', async ({ page }) => {
    await page.goto('/resources/');
    const total = await all(page).count();
    expect(total).toBeGreaterThan(200);
    const count = page.locator('[data-count]');
    await expect(count).toHaveText(`All ${total} resources`);
    await expect(count).toHaveAttribute('aria-live', 'polite');

    await page.getByLabel('Search the library').fill('break-even');
    await expect(count).toHaveText(/^\d+ of \d+ resources$/);
    await expect(page).toHaveURL(/\?q=break-even/);
    const shownText = (await count.textContent()) ?? '';
    const shown = Number(shownText.split(' ')[0]);
    expect(shown).toBeGreaterThan(3);
    expect(shown).toBeLessThan(total);
    // The notes on break-even analysis are among the results.
    await expect(page.locator('li[data-id="notes-break-even-analysis"]')).toBeVisible();

    await page.getByLabel('Search the library').fill('no such resource anywhere');
    await expect(count).toHaveText(`0 of ${total} resources`);
    await expect(page.locator('[data-empty]')).toBeVisible();
    await page.locator('[data-empty]').getByRole('button', { name: 'Clear the filters and the search' }).click();
    await expect(count).toHaveText(`All ${total} resources`);
    await expect(page).toHaveURL(/\/resources\/$/);
  });

  test('a category, the filters and a topic tag narrow the list; a shared address opens the same selection', async ({ page }) => {
    await page.goto('/resources/');
    await page.locator('a[data-cat="mindmaps"]').click();
    await expect(page).toHaveURL(/\?category=mindmaps/);
    await expect(page.locator('section[data-cat-section="notes"]')).toBeHidden();
    const maps = page.locator('section[data-cat-section="mindmaps"] li[data-id]');
    const mapCount = await maps.count();
    // A chosen category shows a page of 24, then "Show more" adds the rest.
    await expect(page.locator('section[data-cat-section="mindmaps"] li[data-id]:not([hidden])')).toHaveCount(Math.min(24, mapCount));
    await page.locator('section[data-cat-section="mindmaps"]').getByRole('button', { name: /^Show \d+ more$/ }).click();
    await expect(page.locator('section[data-cat-section="mindmaps"] li[data-id]:not([hidden])')).toHaveCount(mapCount);
    await expect(page.locator('[data-count]')).toHaveText(`${mapCount} of ${await all(page).count()} resources`);

    // HL only: every resource left says so.
    await page.getByLabel('HL-only material').check();
    await expect(page).toHaveURL(/level=hl/);
    const hl = await visible(page).count();
    expect(hl).toBeGreaterThan(3);
    await expect(visible(page).locator('.lib-lvl')).toHaveText(Array(hl).fill('HL only'));

    // The same address in a new visit gives the same selection.
    const url = page.url();
    await page.goto(url);
    await expect(page.getByLabel('HL-only material')).toBeChecked();
    await expect(visible(page)).toHaveCount(hl);

    // A topic tag narrows everything to its subtopic.
    await page.goto('/resources/');
    await page.locator('li[data-id]:not([hidden]) a.lib-tag[data-subtopic="5.5"]').first().click();
    await expect(page).toHaveURL(/subtopic=5\.5/);
    await expect(page.getByLabel('Topic', { exact: true })).toHaveValue('5.5');
    for (const id of ['notes-break-even-analysis', 'mindmap-break-even-analysis', 'checklist-break-even-analysis']) {
      await expect(page.locator(`li[data-id="${id}"]`)).toBeVisible();
    }
    // Each choice says how many it would leave, and one that would leave nothing is disabled: no guide is about 5.5 alone.
    await expect(page.getByLabel('Format').locator('option[value="pdf"]')).toBeDisabled();
    await expect(page.getByLabel('Format').locator('option[value="svg"]')).toHaveText(/^SVG image \(\d+\)$/);
  });

  test('shows a list as well as cards, and keeps the choice in the address', async ({ page }) => {
    await page.goto('/resources/');
    const lib = page.locator('[data-ix="library"]');
    await expect(lib).toHaveAttribute('data-view', 'cards');
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(lib).toHaveAttribute('data-view', 'list');
    await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/view=list/);
    // In the list, each resource is one row: its preview beside its title.
    const row = page.locator('li[data-id^="mindmap-"]').first();
    const [preview, title] = await Promise.all([row.locator('.lib-item__preview').boundingBox(), row.locator('h3').boundingBox()]);
    expect(preview && title && preview.x + preview.width <= title.x).toBe(true);
    // Every category starts with a few, and "Show all" opens the category.
    const notes = page.locator('section[data-cat-section="notes"]');
    await expect(notes.locator('li[data-id]:not([hidden])')).toHaveCount(8);
    await notes.getByRole('button', { name: /^Show all \d+$/ }).click();
    await expect(page).toHaveURL(/category=notes/);
    await expect(notes.locator('h2')).toBeFocused();
  });

  test('says plainly that lesson presentations are not yet available, and counts nothing there', async ({ page }) => {
    await page.goto('/resources/');
    const link = page.locator('a[data-cat="presentations"]');
    await expect(link).toContainText('Not yet available');
    const section = page.locator('section[data-cat-section="presentations"]');
    await expect(section).toContainText('Not yet available');
    await expect(section.locator('li[data-id]')).toHaveCount(0);
    await link.click();
    await expect(section).toBeVisible();
    await expect(page.locator('[data-empty]')).toBeHidden();
  });

  test('every download on the page returns its file', async ({ page, request }) => {
    await page.goto('/resources/');
    const hrefs = [...new Set(await page.locator('a[download]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? '')))];
    expect(hrefs.filter((h) => h.endsWith('.pdf'))).toHaveLength(4);
    expect(hrefs).toContain('/downloads/glossary.csv');
    expect(hrefs).toContain('/downloads/topic-checklists.csv');
    expect(hrefs.length).toBeGreaterThan(100);
    const TYPES: Record<string, RegExp> = { pdf: /application\/pdf/, csv: /text\/csv/, svg: /image\/svg\+xml/ };
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      const ext = href.split('.').pop() ?? '';
      expect(res.headers()['content-type'] ?? '', href).toMatch(TYPES[ext] ?? /./);
      expect((await res.body()).length, href).toBeGreaterThan(100);
    }
  });

  test('a guide shows the first page of its PDF and downloads it', async ({ page, request }) => {
    await page.goto('/resources/guide-paper-1/');
    await expect(page.locator('h1')).toHaveText('Paper 1 Assessment Guide');
    await expect(page.locator('.rd__preview img')).toHaveAttribute('alt', 'The first page of Paper 1 Assessment Guide');
    const img = await page.locator('.rd__preview img').evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(img).toBeGreaterThan(0);
    const link = page.getByRole('link', { name: /^Download PDF, 5 pages, 1\.\d MB$/ });
    const res = await request.get((await link.getAttribute('href')) ?? '');
    expect(res.status()).toBe(200);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('the search comes first and the filters sit behind one Filter button', async ({ page }) => {
      await page.goto('/resources/');
      const search = page.getByLabel('Search the library');
      const button = page.getByRole('button', { name: /^Filter/ });
      // The controls are in the first screen.
      for (const el of [search, button]) {
        const box = await el.boundingBox();
        expect(box && box.y + box.height).toBeLessThan(844);
      }
      const panel = page.locator('#lib-panel');
      await expect(panel).toBeHidden();
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await button.click();
      await expect(panel).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await page.getByLabel('Unit', { exact: true }).selectOption('3');
      await expect(button).toHaveText(/Filter \(1 in use\)/);
      await page.getByRole('button', { name: 'Show the results' }).click();
      await expect(panel).toBeHidden();
      await expect(page.locator('#lib-results')).toBeFocused();
      await expect(page).toHaveURL(/unit=3/);
      // Escape closes the panel and returns to the button.
      await button.click();
      await page.getByLabel('Unit', { exact: true }).focus();
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(button).toBeFocused();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});

test.describe('the Resources Library without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('lists every resource, category by category, with a contents list to jump to each', async ({ page }) => {
    await page.goto('/resources/');
    const total = await all(page).count();
    await expect(visible(page)).toHaveCount(total);
    await expect(page.locator('li[data-id]').first()).toBeVisible();
    await expect(page.getByLabel('Search the library')).toBeHidden();
    await expect(page.locator('[data-filters]')).toBeHidden();
    await page.locator('a[data-cat="diagrams"]').click();
    await expect(page).toHaveURL(/#cat-diagrams$/);
  });
});

test.describe('the Teacher resource area', () => {
  test('is marked for teachers, links the teachers’ pathway both ways, and its sequences follow the lesson length', async ({ page }) => {
    await page.goto('/teachers/');
    await expect(page.locator('.tr-mark__label')).toHaveText('For teachers');
    await expect(page.locator('main a[href="/pathways/teachers/"]').first()).toBeVisible();
    const row = page.locator('tr[data-row="3.5"]');
    const at60 = Number(await row.locator('[data-hl]').textContent());
    await page.getByLabel('Lesson length').selectOption('40');
    const at40 = Number(await row.locator('[data-hl]').textContent());
    expect(at40).toBeGreaterThanOrEqual(at60);
    await page.getByLabel('Lesson length').selectOption('90');
    expect(Number(await row.locator('[data-hl]').textContent())).toBeLessThanOrEqual(at60);
    // The choice is the lesson library's own, so the library opens on the same length.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bb:lesson-plan') ?? '{}').length)).toBe(90);
    await page.goto('/pathways/teachers/');
    await expect(page.getByLabel('Lesson length')).toHaveValue('90');
    await expect(page.locator('main a[href="/teachers/"]').first()).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('bb:lesson-plan'));
  });

  test('every subtopic has discussion prompts and a checklist', async ({ page }) => {
    await page.goto('/teachers/');
    const subtopics = await page.locator('#checklists .tr-checks a').count();
    expect(subtopics).toBe(37);
    await expect(page.locator('#prompts .tr-prompts__sub')).toHaveCount(subtopics);
  });

  test('a topic checklist lists its statements with their depth and level, and every checklist downloads as a CSV', async ({ page, request }) => {
    await page.goto('/teachers/checklists/production-planning/');
    await expect(page.locator('h1')).toHaveText('5.6 Production planning');
    const rows = page.locator('table.tr-cl tbody tr');
    await expect(rows).toHaveCount(7);
    await expect(rows.first().locator('.tr-cl__lvl')).toHaveText('HL only');
    await expect(page.getByRole('button', { name: 'Print this checklist' })).toBeVisible();
    const res = await request.get('/downloads/topic-checklists.csv');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/text\/csv/);
    const lines = (await res.text()).trim().split('\r\n');
    expect(lines[0]).toContain('"Content statement","Depth of teaching","Statement level","Guide page","Taught","Checked","Notes"');
    expect(lines.some((l) => l.startsWith('"5","Operations management","5.6","Production planning","HL only","5.6.1"'))).toBe(true);
  });

  test('an activity sets out its roles from the case, a lesson that adds up and a debrief', async ({ page }) => {
    await page.goto('/teachers/activities/bellbird-board-meeting/');
    await expect(page.locator('.tr-mark__label')).toHaveText('For teachers');
    await expect(page.locator('.tr-role')).toHaveCount(6);
    await expect(page.locator('.tr-role').first()).toContainText('Wants');
    const minutes = await page.locator('table.tr-plan tbody td.n:first-child').allTextContents();
    const total = minutes.reduce((t, m) => t + Number(m), 0);
    await expect(page.locator('table.tr-plan tfoot th')).toHaveText(String(total));
    await expect(page.locator('.tr-facts dd').first()).toHaveText(`${total} minutes`);
    await expect(page.locator('.tr-debrief li').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print this activity' })).toBeVisible();
  });
});

test.describe('the formula sheet', () => {
  test('keeps the IB formulae sheet apart from the formulas the site also uses, each marked as beyond it', async ({ page }) => {
    await page.goto('/resources/formula-sheet/');
    const ib = page.locator('.fs__part--ib');
    await expect(ib.locator('.fs__f')).toHaveCount(14);
    await expect(ib).toContainText('Formulae for ratio analysis (SL/HL)');
    await expect(ib).toContainText('Efficiency ratios (HL only)');
    await expect(ib.locator('.fs__f').first().locator('dt')).toHaveText('Gross profit margin');
    await expect(ib.locator('.fs__f').first().locator('.fs__eq .sr-only')).toHaveText('(gross profit) ÷ (sales revenue) × 100');
    const site = page.locator('.fs__part--site .fs__s');
    const n = await site.count();
    expect(n).toBeGreaterThan(30);
    await expect(page.locator('.fs__part--site .fs__mark')).toHaveText(Array(n).fill('Beyond the IB formulae sheet'));
    await expect(page.locator('.fs__part--site')).toContainText('Degree of operating leverage');
    await expect(page.locator('.fs__part--site')).toContainText('In the syllabus: 5.6 Production planning, HL only (guide, p. 35)');
    await expect(page.locator('.fs__part--ib')).not.toContainText('operating leverage');
  });
});
