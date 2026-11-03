/**
 * The learner's own record: saving, the dashboard, the recorder, export,
 * import and clearing, and the search that finds everything. Driven as a
 * reader would drive them.
 */
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { NAV } from '../../src/lib/navigation';

const ready = async (page: Page, selector: string) => {
  await expect(page.locator(`${selector}.is-enhanced`).first()).toBeVisible();
};

const axe = async (page: Page) => {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
};

test.describe('Saved items and the dashboard', () => {
  test('a saved page is listed on the dashboard with the visit, and removing it there unsaves it', async ({ page }) => {
    await page.goto('/topics/stakeholders/');
    await ready(page, '[data-ix="save"]');
    const save = page.locator('[data-ix="save"] [data-save]').first();
    await expect(save).toHaveAttribute('aria-pressed', 'false');
    await save.click();
    await expect(save).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-save-link]').first()).toBeVisible();

    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    await expect(page.locator('[data-empty]')).toBeHidden();
    await expect(page.locator('[data-saved] a[href="/topics/stakeholders/"]')).toHaveText('1.4 Stakeholders');
    await expect(page.locator('[data-visits]')).toContainText('1.4 Stakeholders');
    await expect(page.locator('.db-row[data-code="1.4"] [data-you]')).toHaveText('Read');
    await expect(page.locator('.db-row[data-code="1.4"]')).toHaveClass(/is-explored/);
    await expect(page.locator('[data-summary]')).toContainText('Saved items1');
    expect(await axe(page), 'axe violations with data').toEqual([]);

    await page.locator('[data-saved] [data-remove]').click();
    await expect(page.locator('[data-saved]')).toContainText('Nothing saved yet');
    await expect(page.locator('[data-msg]')).toHaveText('Removed 1.4 Stakeholders from your saved items.');
    await expect(page.locator('#db-saved-list-h')).toBeFocused();
    await page.goto('/topics/stakeholders/');
    await ready(page, '[data-ix="save"]');
    await expect(page.locator('[data-ix="save"] [data-save]').first()).toHaveAttribute('aria-pressed', 'false');
  });

  test('items inside a page are saved by their own address', async ({ page }) => {
    await page.goto('/exam-desk/practice/');
    await ready(page, '[data-ix="save"]');
    const card = page.locator('[data-ix="question"]').first();
    const title = (await card.locator('.qcard__title').innerText()).trim();
    await card.locator('[data-save]').click();
    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    const link = page.locator('[data-saved] .db-saved__title');
    await expect(link).toHaveText(title);
    expect(await link.getAttribute('href')).toMatch(/^\/exam-desk\/practice\/#q-/);
    await expect(page.locator('[data-saved] .db-saved__kind')).toHaveText('Practice question');
  });

  test('the recorder notes checked exercise items, and the dashboard says what was right', async ({ page }) => {
    await page.goto('/topics/costs-and-revenues/');
    await ready(page, '[data-ix="quiz"]');
    const item = page.locator('[data-ix="quiz"]').first().locator('[data-item]').first();
    const groups = item.locator('[data-group]');
    for (let g = 0; g < (await groups.count()); g++) await groups.nth(g).locator('label').first().click();
    await item.locator('[data-check]').click();
    await expect(item).toHaveClass(/is-(right|partial|wrong)/);
    const verdict = (await item.getAttribute('class'))?.match(/is-(right|partial|wrong)/)?.[1];
    const words = { right: '1 right', partial: '1 partly right', wrong: '1 not yet right' }[verdict ?? 'right'] ?? '1 right';

    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    const row = page.locator('[data-groups] li', { hasText: "Classify Atelier Barro's costs" });
    await expect(row).toContainText('Checked 1 of');
    await expect(row).toContainText(words);
    await expect(page.locator('[data-summary]')).toContainText('Exercise items checked1');
    await expect(page.locator('.db-row[data-code="3.3"]')).toHaveClass(/is-practised/);
  });

  test('the old progress address shows the dashboard', async ({ page }) => {
    await page.goto('/progress/');
    await ready(page, '[data-ix="progress"]');
    await expect(page.locator('h1')).toHaveText('Your dashboard');
  });

  test('a room tool\'s work is listed under its room, with a link back to the tool', async ({ page }) => {
    await page.goto('/dashboard/');
    await page.evaluate(() => {
      localStorage.setItem('bb:strategy:swot', JSON.stringify({ v: 1, tool: 'swot', savedAt: new Date().toISOString(), headline: 'Two strengths outweigh one threat' }));
      localStorage.setItem('bb:boardroom:kestle-cycles', JSON.stringify({ role: 'hr', picks: ['a'] }));
    });
    await page.reload();
    await ready(page, '[data-ix="progress"]');
    const group = page.locator('[data-work] .pr-group', { hasText: 'Strategy Studio' });
    await expect(group.locator('a[href="/strategy-studio/swot/"]')).toBeVisible();
    await expect(group).toContainText('Two strengths outweigh one threat, saved today');
    await expect(page.locator('[data-summary]')).toContainText(/Strategy Studio analyses1 of \d+/);
    await expect(page.locator('[data-groups] a[href="/boardroom/kestle-cycles/"]')).toBeVisible();
    await expect(page.locator('[data-groups]')).toContainText(/1 of \d rounds decided/);
  });
});

test.describe('Your data', () => {
  test('pausing the record notes nothing new', async ({ page }) => {
    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    await page.locator('label.db-switch').click();
    await expect(page.locator('[data-record]')).not.toBeChecked();
    await expect(page.locator('[data-msg]')).toContainText('Paused');
    await expect(page.locator('[data-statusline]')).toContainText('paused');
    const cases = page.locator('[data-visits] .db-col', { hasText: 'Cases' });
    await page.goto('/cases/atelier-barro/');
    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    await expect(cases.locator('.db-count')).toHaveText('0');
    await page.locator('label.db-switch').click();
    await expect(page.locator('[data-record]')).toBeChecked();
    await page.goto('/cases/atelier-barro/');
    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    await expect(cases.locator('.db-count')).toHaveText('1');
    await expect(cases.locator('.db-list a[href="/cases/atelier-barro/"]')).toHaveText('Atelier Barro');
  });

  test('export, clear and import each ask first, and a copy brings everything back', async ({ page }) => {
    await page.goto('/glossary/');
    await page.evaluate(() => {
      localStorage.setItem('bb:q:q-costs-p2-beq', JSON.stringify({ answer: '550 mugs', points: [0, 1, 2] }));
      localStorage.setItem('bb:saved', JSON.stringify({ v: 1, items: [{ url: '/cases/atelier-barro/', title: 'Atelier Barro', kind: 'case', saved: '2026-11-01T10:00:00.000Z' }] }));
      localStorage.setItem('bb:level', 'SL');
    });
    await page.goto('/dashboard/');
    await ready(page, '[data-ix="progress"]');
    const dialog = page.locator('[data-dialog]');

    // Export: cancel, then confirm
    await page.locator('[data-export]').click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Download a copy of your data?');
    await dialog.locator('button[value="cancel"]').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-msg]')).toHaveText('Nothing was downloaded.');
    await page.locator('[data-export]').click();
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.locator('[data-dialog-confirm]').click()]);
    expect(download.suggestedFilename()).toMatch(/^business-brief-data-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    const file = JSON.parse(readFileSync(path, 'utf8'));
    expect(file.format).toBe('the-business-brief/learner-data');
    expect(file.items['bb:level']).toBe('SL');
    expect(JSON.parse(file.items['bb:saved']).items[0].title).toBe('Atelier Barro');

    // Clear everything
    await page.locator('[data-reset]').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('input[value="all"]').check();
    await dialog.locator('[data-dialog-confirm]').click();
    await expect(page.locator('[data-msg]')).toContainText('Everything this site kept in this browser is cleared.');
    await expect(page.locator('[data-empty]')).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')))).toEqual([]);

    // A file that is not an export is refused, with the reason beside the field
    await page.locator('[data-import]').setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"world"}') });
    await expect(page.locator('[data-import-err]')).toBeVisible();
    await expect(page.locator('[data-import-err]')).toContainText('not exported from this dashboard');
    await expect(page.locator('[data-import]')).toHaveAttribute('aria-invalid', 'true');

    // The copy brings everything back, after a confirmation
    await page.locator('[data-import]').setInputFiles(path);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Import this copy?');
    await expect(dialog).toContainText(`holds ${Object.keys(file.items).length} items`);
    await dialog.locator('[data-dialog-confirm]').click();
    await expect(page.locator('[data-msg]')).toHaveText(`Imported ${Object.keys(file.items).length} items.`);
    await expect(page.locator('[data-import]')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-saved]')).toContainText('Atelier Barro');
    await expect(page.locator('[data-groups]')).toContainText('Self-marked: 3 of 3 marks');
    await expect(page.locator('html')).toHaveAttribute('data-level', 'SL');
  });
});

test.describe('Search', () => {
  test('filters by kind, unit and level, and keeps them in the address', async ({ page }) => {
    await page.goto('/search/?q=ratio&kind=formulas');
    await ready(page, '[data-ix="search"]');
    await expect(page.locator('#q')).toHaveValue('ratio');
    await expect(page.locator('input[name="kind"][value="formulas"]')).toBeChecked();
    await expect(page.locator('[data-group]:visible')).toHaveCount(1);
    await expect(page.locator('[data-group="formulas"]')).toBeVisible();
    const visible = page.locator('[data-group="formulas"] [data-entry]:visible');
    expect(await visible.count()).toBeGreaterThan(2);
    await expect(page.locator('[data-count]')).toContainText('in formulas');

    await page.locator('select[data-f="unit"]').selectOption('3');
    await expect(page).toHaveURL(/[?&]unit=3/);
    for (const units of await visible.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.units ?? ''))) expect(units.split(' ')).toContain('3');

    await page.locator('select[data-f="level"]').selectOption('hl');
    await expect(page).toHaveURL(/[?&]level=hl/);
    for (const hl of await visible.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.hl ?? ''))) expect(hl).toBe('1');

    await page.locator('label.sx-kind', { hasText: 'Everything' }).click();
    await expect(page).not.toHaveURL(/kind=/);
    await page.locator('[data-clear]').click();
    await expect(page).toHaveURL(/\/search\/$/);
    await expect(page.locator('#q')).toHaveValue('');
    await expect(page.locator('#q')).toBeFocused();
  });

  test('groups results by kind with counts, and shows all of a kind on request', async ({ page }) => {
    await page.goto('/search/?q=cost');
    await ready(page, '[data-ix="search"]');
    const defs = page.locator('[data-group="definitions"]');
    const n = Number((await defs.locator('[data-group-n]').innerText()).replace(/,/g, ''));
    expect(n).toBeGreaterThan(5);
    await expect(page.locator('[data-kind-n="definitions"]')).toHaveText(String(n));
    await expect(defs.locator('[data-entry]:visible')).toHaveCount(5);
    await defs.locator('[data-more]').click();
    await expect(page).toHaveURL(/kind=definitions/);
    await expect(defs.locator('[data-entry]:visible')).toHaveCount(n);
    await expect(page.locator('[data-group]:visible')).toHaveCount(1);
  });

  test('finds a formula by its name, best match first', async ({ page }) => {
    await page.goto('/search/?q=break-even%20quantity&kind=formulas');
    await ready(page, '[data-ix="search"]');
    await expect(page.locator('[data-group="formulas"] [data-entry]:visible').first().locator('a')).toHaveText('Break-even quantity');
    await expect(page.locator('[data-group="formulas"] [data-entry]:visible').first().locator('mark').first()).toHaveText('Break');
  });

  test('the arrow keys move through the results, and Enter opens one', async ({ page }) => {
    await page.goto('/search/');
    await ready(page, '[data-ix="search"]');
    const box = page.locator('#q');
    await box.fill('gearing');
    const links = page.locator('[data-entry]:visible a');
    await expect(links.first()).toBeVisible();
    await box.press('ArrowDown');
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(box).toBeFocused();
    const href = await links.first().getAttribute('href');
    await box.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${(href ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  });

  test('with a query and filters set, the page passes an accessibility scan', async ({ page }) => {
    await page.goto('/search/?q=marketing&unit=4');
    await ready(page, '[data-ix="search"]');
    await expect(page.locator('[data-count]')).toContainText('for unit 4');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('Without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('search lists every entry, every link in the menu and a contents list', async ({ page }) => {
    await page.goto('/search/');
    await expect(page.locator('.sx-toc')).toBeVisible();
    const hrefs = new Set(await page.locator('[data-results] [data-entry] a').evaluateAll((els) => els.map((e) => e.getAttribute('href'))));
    for (const g of NAV) for (const l of g.links) expect(hrefs.has(l.href), l.href).toBe(true);
    await expect(page.locator('[data-entry] a[href="/topics/stakeholders/"]')).toBeVisible();
  });

  test('the dashboard says what it would show, and lists the course with its coverage', async ({ page }) => {
    await page.goto('/dashboard/');
    await expect(page.locator('.db-nojs')).toBeVisible();
    await expect(page.locator('.db-row')).toHaveCount(37);
    await expect(page.locator('.db-row').first().locator('.db-cov')).toBeVisible();
    await expect(page.locator('[data-empty]')).toBeHidden();
    await expect(page.locator('[data-export]')).toBeHidden();
  });
});
