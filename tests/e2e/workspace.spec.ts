/**
 * My Business Workspace, driven as a reader would drive it: the learning list
 * (order, status, a note, pages added from the workspace), notes started
 * beside a Save button and written, edited, searched and deleted in the
 * workspace, saved analyses from the rooms' tools and a result saved from the
 * Financial Laboratory, and a selection exported as Markdown and as JSON and
 * imported back. Everything is checked again after a reload, every item kept
 * must be declared on the privacy page, and the page is checked with axe-core,
 * at 320 pixels, without JavaScript and with storage blocked.
 */
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WS = '/dashboard/';

const ready = async (page: Page, selector: string) => {
  await expect(page.locator(`${selector}.is-enhanced`).first()).toBeVisible();
};

/** The component's script has run, whether or not it then hid the component. */
const settled = async (page: Page, selector: string) => {
  await expect(page.locator(selector).first()).toHaveAttribute('data-ready', 'true');
};

const axe = async (page: Page) => {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
};

/** Every item kept in this browser is declared on the privacy page, by name or by a family ending in "…". */
async function expectDeclared(page: Page) {
  const html = await (await page.request.get('/privacy/')).text();
  const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
  expect(kept.length).toBeGreaterThan(0);
  const undeclared = kept.filter((k) => !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
  expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
}

const save = async (page: Page, path: string) => {
  await page.goto(path);
  await ready(page, '[data-ix="save"]');
  const btn = page.locator('[data-ix="save"] [data-save]').first();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
};

const titles = (page: Page) => page.locator('[data-saved] .db-saved__title').allInnerTexts();

test.describe('My Business Workspace', () => {
  test('is the page at both addresses', async ({ page }) => {
    for (const path of [WS, '/progress/']) {
      await page.goto(path);
      await ready(page, '[data-ix="progress"]');
      await expect(page.locator('h1')).toHaveText('My Business Workspace');
      await expect(page).toHaveTitle(/^My Business Workspace/);
      await expect(page.locator('#db-saved-h')).toContainText('My learning list');
    }
  });

  test('the learning list is put in order, marked and noted, and kept after a reload', async ({ page }) => {
    await save(page, '/topics/stakeholders/');
    await save(page, '/cases/atelier-barro/');
    await save(page, '/mindmaps/break-even-analysis/');
    await page.goto(WS);
    await ready(page, '[data-ix="progress"]');
    // Newest first until the reader arranges the list.
    expect(await titles(page)).toEqual([expect.stringMatching(/Break-even/), 'Atelier Barro', '1.4 Stakeholders']);

    const item = (title: string) => page.locator('[data-saved] .ws-li', { has: page.locator('.db-saved__title', { hasText: title }) });
    await item('1.4 Stakeholders').getByRole('button', { name: /^Move up/ }).click();
    expect(await titles(page)).toEqual([expect.stringMatching(/Break-even/), '1.4 Stakeholders', 'Atelier Barro']);
    await expect(item('1.4 Stakeholders').getByRole('button', { name: /^Move up/ })).toBeFocused();
    await expect(page.locator('[data-msg]')).toHaveText('Moved 1.4 Stakeholders up: now 2 of 3.');
    await item('1.4 Stakeholders').getByRole('button', { name: /^Move up/ }).click();
    // At the top, Move up is not available, so focus moves to Move down.
    await expect(item('1.4 Stakeholders').getByRole('button', { name: /^Move down/ })).toBeFocused();
    await expect(item('1.4 Stakeholders').getByRole('button', { name: /^Move up/ })).toBeDisabled();

    await item('1.4 Stakeholders').getByLabel(/^Status/).selectOption('doing');
    await expect(page.locator('[data-msg]')).toHaveText('1.4 Stakeholders: In progress.');
    await item('Atelier Barro').getByLabel(/^Status/).selectOption('done');
    await item('1.4 Stakeholders').getByLabel(/^Note/).fill('Revise the power and interest grid');
    await item('1.4 Stakeholders').getByLabel(/^Note/).press('Tab');
    await expect(page.locator('[data-list-counts]')).toContainText('1 to do, 1 in progress, 1 done');
    await expect(page.locator('[data-summary]')).toContainText('Saved items3');

    await page.reload();
    await ready(page, '[data-ix="progress"]');
    expect(await titles(page)).toEqual(['1.4 Stakeholders', expect.stringMatching(/Break-even/), 'Atelier Barro']);
    await expect(item('1.4 Stakeholders').getByLabel(/^Status/)).toHaveValue('doing');
    await expect(item('1.4 Stakeholders').getByLabel(/^Note/)).toHaveValue('Revise the power and interest grid');
    await expect(item('Atelier Barro').getByLabel(/^Status/)).toHaveValue('done');
    await expect(item('Atelier Barro')).toHaveClass(/is-done/);

    // Removing an item forgets its place, status and note.
    await item('Atelier Barro').getByRole('button', { name: /^Remove/ }).click();
    await expect(page.locator('[data-msg]')).toHaveText('Removed Atelier Barro from your saved items.');
    expect(await titles(page)).toEqual(['1.4 Stakeholders', expect.stringMatching(/Break-even/)]);
    const list = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:workspace:list') ?? '{}'));
    expect(Object.keys(list.entries)).toEqual(['/topics/stakeholders/']);
    await expectDeclared(page);
  });

  test('a tool or a briefing, which have no Save button, can be added from the workspace', async ({ page }) => {
    await page.goto(WS);
    await ready(page, '[data-ix="progress"]');
    const pick = page.locator('[data-list-pick]');
    const add = page.getByRole('button', { name: 'Add to my list' });
    await add.click();
    await expect(page.locator('[data-list-add-err]')).toHaveText('Choose a page to add.');
    await expect(pick).toHaveAttribute('aria-invalid', 'true');

    await pick.selectOption('/strategy-studio/swot/');
    await add.click();
    await expect(page.locator('[data-list-add-err]')).toBeHidden();
    await pick.selectOption('/entrepreneurship-lab/opportunity-and-validation/');
    await add.click();
    await expect(page.locator('[data-msg]')).toContainText('to the top of your list: 2 items in all.');
    await expect(page.locator('[data-saved] .db-saved__kind')).toHaveText(['Briefing', 'Tool']);
    await expect(page.locator('[data-saved] .db-saved__title').first()).toHaveAttribute('href', '/entrepreneurship-lab/opportunity-and-validation/');
    // A page on the list cannot be added twice.
    await expect(pick.locator('option[value="/strategy-studio/swot/"]')).toBeDisabled();
    await expect(pick.locator('option[value="/strategy-studio/swot/"]')).toHaveText(/\(on your list\)$/);
    await page.reload();
    await ready(page, '[data-ix="progress"]');
    await expect(page.locator('[data-saved] .db-saved__kind')).toHaveText(['Briefing', 'Tool']);
  });

  test('"Add a note" beside Save opens a compact editor prefilled with the page, and the note reaches the workspace', async ({ page }) => {
    await page.goto('/cases/atelier-barro/');
    await ready(page, '[data-ix="note-add"]');
    const add = page.locator('[data-note-add]').first();
    await expect(add).toBeVisible();
    await add.click();
    const dialog = page.locator('dialog.ne-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Add a note' })).toBeVisible();
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Atelier Barro');
    await expect(dialog.locator('[data-ne-on-url]')).toHaveText('/cases/atelier-barro/');
    // A case file opens on the case notebook's headings.
    await expect(dialog.getByLabel(/Case notes/)).toBeChecked();
    await expect(dialog.getByLabel('Problem identified')).toBeFocused();
    expect(await axe(page), 'axe with the note editor open').toEqual([]);

    await dialog.getByRole('button', { name: 'Save note' }).click();
    await expect(dialog.locator('[data-ne-err="problem"]')).toHaveText('Write under at least one of the headings before saving the note.');
    await expect(dialog.getByLabel('Problem identified')).toHaveAttribute('aria-invalid', 'true');
    await dialog.getByLabel('Problem identified').fill('Margins are falling as clay costs rise.');
    await dialog.getByLabel('Evidence').fill('Clay costs rose 18% in a year.\nPrices have not moved.');
    await dialog.getByRole('button', { name: 'Save note' }).click();
    await expect(dialog).toBeHidden();
    await expect(add).toBeFocused();
    const link = page.locator('[data-note-link]').first();
    await expect(link).toHaveText('1 note in your workspace');
    await page.reload();
    await ready(page, '[data-ix="note-add"]');
    await expect(page.locator('[data-note-link]').first()).toHaveText('1 note in your workspace');

    await page.locator('[data-note-link]').first().click();
    await expect(page).toHaveURL(/\/dashboard\/#notes$/);
    await ready(page, '[data-ix="progress"]');
    const note = page.locator('[data-notes] .ws-note').first();
    await expect(note.locator('.ws-note__title')).toHaveText('Atelier Barro');
    await expect(note.locator('.ws-note__meta')).toHaveText('Case notes, changed today');
    await expect(note.locator('.ws-note__on a')).toHaveAttribute('href', '/cases/atelier-barro/');
    await note.locator('summary').click();
    await expect(note.locator('.ws-note__fields')).toContainText('Problem identified');
    await expect(note.locator('.ws-note__fields')).toContainText('Clay costs rose 18% in a year.');
    await expectDeclared(page);
  });

  test('notes are written, edited, searched and deleted in the workspace, and kept after a reload', async ({ page }) => {
    await page.goto(WS);
    await ready(page, '[data-ix="progress"]');
    await expect(page.locator('[data-notes]')).toContainText('No notes yet.');
    const editor = page.locator('[data-note-editor]');
    const newNote = page.getByRole('button', { name: 'New note' });

    // A free note, standing alone.
    await newNote.click();
    await expect(editor).toBeVisible();
    await expect(newNote).toHaveAttribute('aria-expanded', 'true');
    await editor.getByLabel(/A free note/).check();
    await editor.getByLabel('Title', { exact: true }).fill('Kiln questions');
    await editor.getByLabel('Note', { exact: true }).fill('Lease or buy the kiln?');
    await editor.getByRole('button', { name: 'Save note' }).click();
    await expect(editor).toBeHidden();
    await expect(page.locator('[data-msg]')).toHaveText('Note added: Kiln questions.');
    await expect(page.locator('[data-notes] summary').first()).toBeFocused();

    // Case notes, without a title: the first words name it.
    await newNote.click();
    await editor.getByLabel('Recommendation').fill('Raise prices by 6% and renegotiate the clay contract.');
    await editor.getByLabel('Strategic alternatives').fill('Raise prices; cut the range; change supplier.');
    await editor.getByRole('button', { name: 'Save note' }).click();
    const notes = page.locator('[data-notes] .ws-note');
    await expect(notes).toHaveCount(2);
    await expect(notes.first().locator('.ws-note__title')).toHaveText('Raise prices; cut the range; change supplier.');
    await expect(page.locator('[data-note-count]')).toHaveText('2 notes, the most recently changed first. Open one to read it.');

    // Search keeps the notes holding every word.
    await page.getByLabel('Search your notes').fill('KILN lease');
    await expect(notes).toHaveCount(1);
    await expect(page.locator('[data-note-count]')).toHaveText('1 note of 2 matches “KILN lease”.');
    await page.getByLabel('Search your notes').fill('kiln supplier');
    await expect(notes).toHaveCount(0);
    await expect(page.locator('[data-note-count]')).toContainText('No note matches');
    await page.getByLabel('Search your notes').fill('');
    await expect(notes).toHaveCount(2);

    // Edit
    const kiln = notes.filter({ hasText: 'Kiln questions' });
    await kiln.getByRole('button', { name: /^Edit/ }).click();
    await expect(page.locator('[data-note-editor-h]')).toHaveText('Edit the note');
    await expect(editor.getByLabel('Note', { exact: true })).toHaveValue('Lease or buy the kiln?');
    await editor.getByLabel('Note', { exact: true }).fill('Lease the kiln: it keeps cash for the busy season.');
    await editor.getByRole('button', { name: 'Save note' }).click();
    await expect(page.locator('[data-msg]')).toHaveText('Note saved: Kiln questions.');
    await expect(notes.first().locator('.ws-note__title')).toHaveText('Kiln questions');
    await expect(notes.first().locator('details')).toHaveAttribute('open', '');
    await expect(notes.first().locator('.ws-note__body')).toHaveText('Lease the kiln: it keeps cash for the busy season.');

    await page.reload();
    await ready(page, '[data-ix="progress"]');
    await expect(notes).toHaveCount(2);
    await expect(page.locator('[data-summary]')).toContainText('Notes2');

    // Delete, after a confirmation
    await notes.filter({ hasText: 'Kiln questions' }).getByRole('button', { name: /^Delete/ }).click();
    const dialog = page.locator('[data-dialog]');
    await expect(dialog).toContainText('Delete this note?');
    await dialog.locator('button[value="cancel"]').click();
    await expect(notes).toHaveCount(2);
    await notes.filter({ hasText: 'Kiln questions' }).getByRole('button', { name: /^Delete/ }).click();
    await dialog.locator('[data-dialog-confirm]').click();
    await expect(notes).toHaveCount(1);
    await expect(page.locator('[data-msg]')).toHaveText('Note deleted: Kiln questions.');
    await expectDeclared(page);
  });

  test('saved analyses come from the tools\' own items, and a Financial Laboratory result can be saved to the workspace', async ({ page }) => {
    await page.goto('/privacy/');
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem('bb:strategy:swot', JSON.stringify({ v: 1, tool: 'swot', savedAt: now, headline: 'Two strengths outweigh one threat', state: {} }));
      localStorage.setItem('bb:people:org-chart', JSON.stringify({ v: 1, data: { tool: 'organization-chart', organization: 'Kestrel Bikes', posts: [{ id: 'a' }, { id: 'b' }] } }));
      localStorage.setItem('bb:boardroom:kestle-cycles', JSON.stringify({ role: 'finance', picks: ['x'], notes: {}, memo: {}, ack: 0 }));
    });
    const before = await page.evaluate(() => localStorage.getItem('bb:people:org-chart'));

    await page.goto('/finance-desk/lab/break-even-quantity/');
    await page.fill('input[name="price"]', '30');
    await expect(page.locator('.fl-hero__value')).toHaveText('1,859 bags a month');
    const keep = page.getByRole('button', { name: 'Save this result to my workspace' });
    await keep.click();
    await expect(page.locator('[data-ws-link]')).toBeVisible();
    await expect(page.locator('[data-status]')).toContainText('Saved to your workspace: Break-even quantity, 1,859 bags a month.');
    // New figures make a new result: the link to the saved one goes.
    await page.fill('input[name="price"]', '31');
    await expect(page.locator('[data-ws-link]')).toBeHidden();

    await page.goto(WS);
    await ready(page, '[data-ix="progress"]');
    const room = (name: string) => page.locator('[data-work] .pr-group', { has: page.locator('.db-workgroup__h', { hasText: name }) });
    await expect(page.locator('[data-work] .db-workgroup__h')).toHaveText([/^Strategy Studio/, /^Financial Laboratory/, /^People and Culture/, /^Boardroom/]);
    await expect(room('Strategy Studio')).toContainText('Two strengths outweigh one threat, saved today');
    const snap = room('Financial Laboratory').locator('.ws-snap');
    await expect(snap).toContainText('Break-even quantity: 1,859 bags a month');
    await expect(snap).toContainText('Your own figures, saved today');
    await snap.locator('summary').click();
    await expect(snap.locator('.ws-snap__dl')).toContainText('Selling price');
    await expect(room('People and Culture').locator('a[href="/people-and-culture/organization-chart/"]')).toBeVisible();
    await expect(room('People and Culture')).toContainText('Kestrel Bikes: 2 posts on the chart');
    await expect(room('Boardroom')).toContainText('1 of');
    await expect(room('Boardroom')).toContainText('as the finance director');
    // The tools' own items are read, never changed.
    expect(await page.evaluate(() => localStorage.getItem('bb:people:org-chart'))).toBe(before);

    await page.reload();
    await ready(page, '[data-ix="progress"]');
    await expect(page.locator('[data-summary]')).toContainText('Saved analyses4');
    // The saved result opens its calculator with the figures it was worked from.
    const href = await snap.locator('a.db-work__title').getAttribute('href');
    expect(href).toMatch(/^\/finance-desk\/lab\/break-even-quantity\/\?.*price=30/);
    await snap.getByRole('button', { name: /^Remove the saved result/ }).click();
    await expect(page.locator('[data-msg]')).toHaveText('Removed the saved result: Break-even quantity.');
    await expect(room('Financial Laboratory')).toHaveCount(0);
    await expectDeclared(page);
    await page.goto(href ?? '/');
    await expect(page.locator('.fl-hero__value')).toHaveText('1,859 bags a month');
  });

  test('selected work exports as Markdown and as JSON, and the JSON imports back', async ({ page }) => {
    await page.goto('/privacy/');
    await page.evaluate(() => {
      const t = '2026-11-02T12:00:00.000Z';
      localStorage.setItem(
        'bb:saved',
        JSON.stringify({ v: 1, items: [{ url: '/topics/stakeholders/', title: '1.4 Stakeholders', kind: 'topic', saved: t }, { url: '/cases/atelier-barro/', title: 'Atelier Barro', kind: 'case', saved: t }] }),
      );
      localStorage.setItem('bb:workspace:list', JSON.stringify({ v: 1, order: [], entries: { '/topics/stakeholders/': { status: 'doing', note: 'Grid first', updated: t } } }));
      localStorage.setItem(
        'bb:workspace:notes',
        JSON.stringify({
          v: 1,
          notes: [
            { id: 'n-test-00001', kind: 'case', title: 'Pricing at Atelier Barro', page: { url: '/cases/atelier-barro/', title: 'Atelier Barro' }, fields: { problem: 'Margins are falling.' }, body: '', created: t, updated: t },
            { id: 'n-test-00002', kind: 'free', title: 'Private thoughts', page: null, fields: {}, body: 'Not for export.', created: t, updated: t },
          ],
        }),
      );
      localStorage.setItem('bb:strategy:swot', JSON.stringify({ v: 1, tool: 'swot', savedAt: t, headline: 'Two strengths outweigh one threat', state: { s: ['Brand'] } }));
    });
    await page.goto(`${WS}#export`);
    await ready(page, '[data-ix="progress"]');
    const exp = page.locator('#export');

    await exp.getByRole('button', { name: 'Download Markdown' }).click();
    await expect(page.locator('[data-export-err]')).toHaveText('Choose at least one item, note or analysis to export.');

    await exp.getByLabel(/1\.4 Stakeholders/).check();
    await exp.getByLabel(/Pricing at Atelier Barro/).check();
    await exp.getByLabel(/SWOT builder/).check();
    await expect(page.locator('[data-sel-count]')).toHaveText('Chosen: 1 item, 1 note and 1 analysis.');

    const [md] = await Promise.all([page.waitForEvent('download'), exp.getByRole('button', { name: 'Download Markdown' }).click()]);
    expect(md.suggestedFilename()).toMatch(/^business-brief-workspace-\d{4}-\d{2}-\d{2}\.md$/);
    const text = readFileSync(await md.path(), 'utf8');
    expect(text).toContain('# My Business Workspace');
    expect(text).toContain('1. **1.4 Stakeholders** (Subtopic): In progress');
    expect(text).toContain('   Note: Grid first');
    expect(text).toContain('### Pricing at Atelier Barro');
    expect(text).toContain('#### Problem identified');
    expect(text).toContain('### Strategy Studio');
    expect(text).toContain('- **SWOT builder**: Two strengths outweigh one threat');
    expect(text).not.toContain('Private thoughts');
    expect(text).not.toContain('Atelier Barro** (Case)');

    const [js] = await Promise.all([page.waitForEvent('download'), exp.getByRole('button', { name: 'Download JSON' }).click()]);
    expect(js.suggestedFilename()).toMatch(/^business-brief-selection-\d{4}-\d{2}-\d{2}\.json$/);
    const jsonPath = await js.path();
    const file = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(file.format).toBe('the-business-brief/learner-data');
    expect(file.selection).toEqual({ list: 1, notes: 1, analyses: 1 });
    expect(Object.keys(file.items).sort()).toEqual(['bb:saved', 'bb:strategy:swot', 'bb:workspace:list', 'bb:workspace:notes']);

    // Clear everything, then import the selection.
    const dialog = page.locator('[data-dialog]');
    await page.locator('[data-reset]').click();
    await dialog.locator('input[value="all"]').check();
    await dialog.locator('[data-dialog-confirm]').click();
    await expect(page.locator('[data-empty]')).toBeVisible();
    await page.locator('[data-import]').setInputFiles(jsonPath);
    await expect(dialog).toContainText('Import this copy?');
    await expect(dialog).toContainText('holds 4 items: 4 new to this browser');
    await dialog.locator('[data-dialog-confirm]').click();
    await expect(page.locator('[data-msg]')).toHaveText('Imported 4 items.');
    await expect(page.locator('[data-saved] .db-saved__title')).toHaveText(['1.4 Stakeholders']);
    await expect(page.locator('[data-saved] .ws-li').first().getByLabel(/^Status/)).toHaveValue('doing');
    await expect(page.locator('[data-notes] .ws-note__title')).toHaveText(['Pricing at Atelier Barro']);
    await expect(page.locator('[data-work]')).toContainText('Two strengths outweigh one threat');

    // Importing the same file again changes nothing.
    await page.locator('[data-import]').setInputFiles(jsonPath);
    await expect(dialog).toContainText('0 new to this browser, 0 replacing or adding to an item kept here, and 4 the same already');
    await dialog.locator('button[value="cancel"]').click();
  });

  test('with work in it, the workspace passes an accessibility scan and fits a 320 pixel screen', async ({ page }) => {
    await page.goto('/privacy/');
    await page.evaluate(() => {
      const t = new Date().toISOString();
      localStorage.setItem('bb:saved', JSON.stringify({ v: 1, items: [{ url: '/topics/stakeholders/', title: '1.4 Stakeholders', kind: 'topic', saved: t }, { url: '/strategy-studio/option-appraisal/', title: 'Option appraisal and recommendation memo', kind: 'tool', saved: t }] }));
      localStorage.setItem('bb:workspace:list', JSON.stringify({ v: 1, order: [], entries: { '/topics/stakeholders/': { status: 'done', note: 'A note long enough to wrap on a narrow screen, about the grid', updated: t } } }));
      localStorage.setItem('bb:workspace:notes', JSON.stringify({ v: 1, notes: [{ id: 'n-test-00001', kind: 'case', title: 'A long title for a note about pricing decisions at Atelier Barro', page: { url: '/cases/atelier-barro/', title: 'Atelier Barro' }, fields: { problem: 'Margins are falling.', evidence: 'Clay costs rose.' }, body: '', created: t, updated: t }] }));
      localStorage.setItem('bb:workspace:snapshots', JSON.stringify({ v: 1, items: [{ id: 's-test-00001', calc: 'net-present-value', name: 'Net present value', url: '/finance-desk/lab/net-present-value/', headline: { label: 'Net present value', value: '−$1,096.40', note: '' }, inputs: [{ label: 'Capital cost', value: '$20,000' }], mine: false, saved: t }] }));
      localStorage.setItem('bb:strategy:swot', JSON.stringify({ v: 1, tool: 'swot', savedAt: t, headline: 'Two strengths outweigh one threat' }));
    });
    await page.goto(WS);
    await ready(page, '[data-ix="progress"]');
    await page.locator('[data-notes] summary').first().click();
    await page.getByRole('button', { name: 'New note' }).click();
    await expect(page.locator('[data-note-editor]')).toBeVisible();
    // Scanned from the top: opening the editor scrolls, and a control under the sticky header would read as obscured.
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await axe(page), 'axe violations with work kept').toEqual([]);
    await page.setViewportSize({ width: 320, height: 700 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.goto('/exam-desk/practice/');
    await ready(page, '[data-ix="note-add"]');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe('When this browser keeps nothing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('storage blocked');
        },
      });
    });
  });

  test('the workspace says so, and the note and result buttons do not appear', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(WS);
    await ready(page, '[data-ix="progress"]');
    await expect(page.locator('[data-unavailable]')).toBeVisible();
    await expect(page.locator('#notes')).toBeHidden();
    await page.goto('/cases/atelier-barro/');
    await settled(page, '[data-ix="save"]');
    await settled(page, '[data-ix="note-add"]');
    await expect(page.locator('[data-save]')).toBeHidden();
    await expect(page.locator('[data-note-add]')).toBeHidden();
    await page.goto('/finance-desk/lab/break-even-quantity/');
    await ready(page, '[data-ix="finance-lab"]');
    await expect(page.locator('.fl-hero__value')).toHaveText('3,021 bags a month');
    await expect(page.locator('[data-act="csv"]')).toBeVisible();
    await expect(page.locator('[data-act="workspace"]')).toBeHidden();
    expect(errors).toEqual([]);
  });
});

test.describe('Without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the workspace says what it would show, and no control it cannot run is shown', async ({ page }) => {
    await page.goto(WS);
    await expect(page.locator('h1')).toHaveText('My Business Workspace');
    const nojs = page.locator('.db-nojs');
    await expect(nojs).toBeVisible();
    for (const part of ['My learning list:', 'Notes:', 'Saved analyses:', 'Export selected work:']) await expect(nojs).toContainText(part);
    await expect(page.locator('.db-row')).toHaveCount(37);
    for (const sel of ['#saved', '#notes', '#analyses', '#export', '[data-note-new]', '[data-list-pick]', '[data-export]']) await expect(page.locator(sel).first()).toBeHidden();
  });

  test('pages with a Save button show neither it nor Add a note, and the Financial Laboratory keeps its worked example', async ({ page }) => {
    await page.goto('/cases/atelier-barro/');
    await expect(page.locator('[data-note-add]')).toBeHidden();
    await expect(page.locator('[data-save]')).toBeHidden();
    await page.goto('/finance-desk/lab/break-even-quantity/');
    await expect(page.locator('[data-act="workspace"]')).toBeHidden();
    await expect(page.locator('.fl-given')).toBeVisible();
  });
});
