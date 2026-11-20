/**
 * The IA Studio's tools in a browser, used as a student would: the research
 * question builder checking a question against the guide as it is typed,
 * the supporting-document checker on the internal assessment page reading a
 * date to the month, and the research methodology, evidence analysis and
 * word count tools answering a change, labelling each check by its standing,
 * keeping the work after a reload under a declared key and clearing it only
 * after a confirmation. Each new page is checked with axe-core with work in
 * it, at 320 pixels wide, and without JavaScript.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const NEW_TOOLS = ['research-question', 'methodology', 'evidence', 'word-count'];

async function ready(page: Page, ix: string): Promise<Locator> {
  const root = page.locator(`[data-ix="${ix}"]`).first();
  await expect(root).toHaveAttribute('data-ready', 'true');
  await expect(root).not.toHaveClass(/is-broken/);
  return root;
}

/**
 * axe-core from the top of the page, as the page checks run it: scrolled down, the sticky header lies over the
 * controls beneath it, and axe would count each covered control as a target too small to press.
 */
const axe = async (page: Page) => {
  await page.evaluate(() => window.scrollTo(0, 0));
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

/** Script errors on the page, collected from the start. */
const errorsOn = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('the research question builder drafts a question and checks it against the guide as it is typed', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/assessment/internal-assessment/research-question/');
  const root = await ready(page, 'rq-builder');
  await root.locator('[data-f="org"]').fill('Harbour Cycles');
  await root.locator('[data-f="decision"]').fill('open a second workshop');
  const q = root.locator('[data-q]');
  await expect(q).toHaveValue('Should Harbour Cycles open a second workshop?');
  const guide = root.locator('[data-guide]');
  await expect(guide).toContainText('It names Harbour Cycles: the project must refer directly to a single organization.');
  await expect(guide).toContainText('IB requirement, Guide, p. 53');
  await expect(guide).toContainText('It reads as forward looking');
  await expect(guide).toContainText('Recommended strategy');

  await q.fill('To what extent should Harbour Cycles open a second workshop?');
  await expect(guide).toContainText('Examiner emphasis, IA research guide, p. 2');
  await q.fill('Should Harbour Cycles weigh ethics and sustainability in opening a workshop?');
  await expect(guide).toContainText('Problem');
  await expect(guide).toContainText('only one of the four key concepts');

  await root.locator('.rq__tests input[value="focused"]').check();
  await expect(root.locator('[data-count]')).toContainText('1 of 6 tests met');
  await page.reload();
  const again = await ready(page, 'rq-builder');
  await expect(again.locator('[data-q]')).toHaveValue('Should Harbour Cycles weigh ethics and sustainability in opening a workshop?');
  await expect(again.locator('.rq__tests input[value="focused"]')).toBeChecked();
  await expectDeclared(page);
  expect(errors).toEqual([]);
});

test('the checker on the internal assessment page reads a publication date to the month', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/assessment/internal-assessment/');
  const root = await ready(page, 'sd-analyser');
  await root.locator('[data-sub-month]').selectOption('april');
  await root.locator('[data-sub-year]').fill('2027');
  const row = root.locator('[data-row]').first();
  await row.locator('[data-k="title"]').fill('Council footfall survey');
  await row.locator('[data-k="year"]').fill('2024');
  const checks = root.locator('[data-checks]');
  await expect(checks).toContainText('without a month');
  await row.locator('[data-k="month"]').selectOption('03');
  await expect(checks).toContainText('1 published more than three years before your submission: the earliest allowed is April 2024.');
  await expect(checks).toContainText('IB requirement, Guide, p. 54');
  await row.locator('[data-k="month"]').selectOption('04');
  await expect(checks).toContainText('Published within the three years before submission.');
  await page.reload();
  const again = await ready(page, 'sd-analyser');
  await expect(again.locator('[data-row]').first().locator('[data-k="month"]')).toHaveValue('04');
  await expectDeclared(page);
  expect(errors).toEqual([]);
});

test('the research methodology planner checks a plan, keeps it and clears it after a confirmation', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/assessment/internal-assessment/methodology/');
  const root = await ready(page, 'ia-method');
  const checks = root.locator('[data-checks]');
  await expect(checks).toContainText('Choose the research you plan');
  await root.locator('input[name="use-survey"]').check();
  await root.locator('input[name="who-survey"]').fill('Cyclists near the proposed site');
  await root.locator('input[name="size-survey"]').fill('12');
  await root.locator('input[name="size-survey"]').press('Tab');
  await expect(checks).toContainText('A survey or questionnaire: attach a blank copy of the questionnaire, and a tally or summary of the responses');
  await expect(checks).toContainText('A survey of 12 gives little to generalize from');
  await expect(root.locator('[data-attach]')).toContainText('a blank copy of the questionnaire');
  await root.locator('input[name="secondary"][value="textbook"]').check();
  await expect(checks).toContainText('Textbooks and class notes must be referenced, but are not accepted as supporting documents.');
  await expect(checks).toContainText('IB requirement, Guide, p. 55');
  await root.locator('select[name="mainly"]').selectOption('primary');
  await root.locator('select[name="form"]').selectOption('backward');
  await expect(checks).toContainText('IB teacher support material, TSM, p. 70');
  await expect(root.locator('[data-ee-only]')).toBeHidden();
  await root.locator('input[name="ee"]').check();
  await expect(root.locator('[data-ee-only]')).toBeVisible();
  await expect(checks).toContainText('different research approaches');

  await page.reload();
  const again = await ready(page, 'ia-method');
  await expect(again.locator('input[name="size-survey"]')).toHaveValue('12');
  await expect(again.locator('input[name="secondary"][value="textbook"]')).toBeChecked();
  await expectDeclared(page);
  expect(await axe(page), 'axe with a plan in place').toEqual([]);

  await again.locator('[data-reset]').click();
  await expect(again.locator('[data-reset-confirm]')).toBeVisible();
  await again.locator('[data-reset-no]').click();
  await expect(again.locator('input[name="size-survey"]')).toHaveValue('12');
  await again.locator('[data-reset]').click();
  await again.locator('[data-reset-yes]').click();
  await expect(again.locator('input[name="use-survey"]')).not.toBeChecked();
  await expect(again.locator('[data-checks]')).toContainText('Choose the research you plan');
  expect(errors).toEqual([]);
});

test('the evidence log reads each piece as quoted, used or integrated, and exports it', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/assessment/internal-assessment/evidence/');
  const root = await ready(page, 'ia-evidence');
  const first = root.locator('[data-item="0"]');
  await first.locator('[data-f="sd"]').selectOption('SD1');
  await first.locator('[data-f="finding"]').fill('Revenue rose from $280,000 to $310,000');
  await expect(first.locator('[data-level]')).toHaveText('Reading: Quoted');
  await expect(first.locator('[data-advice]')).toContainText('Examiner emphasis, IA research guide, p. 4');
  await first.locator('[data-f="tool"]').fill('Ratio analysis');
  await first.locator('[data-f="result"]').fill('Growth of 10.7% a year');
  await expect(first.locator('[data-level]')).toHaveText('Reading: Used');
  await first.locator('[data-f="assumption"]').fill('Summer trade only');
  await first.locator('[data-f="implication"]').fill('The second workshop is safe only if winter demand holds');
  await expect(first.locator('[data-level]')).toHaveText('Reading: Integrated');
  const summary = root.locator('[data-summary]');
  await expect(summary).toContainText('1 piece of evidence: 0 quoted, 0 used, 1 integrated.');
  await expect(summary).toContainText('SD2, SD3, SD4, SD5 are not used in any of your evidence yet.');
  await root.locator('select[name="docs"]').selectOption('3');
  await expect(summary).toContainText('SD2, SD3 are not used');

  await root.locator('[data-add]').click();
  await expect(root.locator('[data-item]')).toHaveCount(4);
  await expect(root.locator('[data-item="3"] [data-f="sd"]')).toBeFocused();
  await root.locator('[data-item="3"] [data-remove]').click();
  await expect(root.locator('[data-item]')).toHaveCount(3);

  const download = page.waitForEvent('download');
  await root.locator('[data-csv]').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('business-brief-ia-evidence.csv');

  await page.reload();
  const again = await ready(page, 'ia-evidence');
  await expect(again.locator('[data-item="0"] [data-level]')).toHaveText('Reading: Integrated');
  await expect(again.locator('select[name="docs"]')).toHaveValue('3');
  await expectDeclared(page);
  expect(await axe(page), 'axe with evidence logged').toEqual([]);
  expect(errors).toEqual([]);
});

test('the word count planner adds up the plan and the writing against 1,800 words', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/assessment/internal-assessment/word-count/');
  const root = await ready(page, 'ia-words');
  await expect(root.locator('[data-planned]')).toHaveText('1,770 of 1,800');
  const rows = root.locator('[data-row]');
  await expect(rows).toHaveCount(5);
  const intro = rows.first().locator('[data-f="planned"]');
  await intro.fill('600');
  await intro.press('Tab');
  await expect(root.locator('[data-planned]')).toHaveText('2,160 of 1,800: 360 over');
  const checks = root.locator('[data-checks]');
  await expect(checks).toContainText('Your plan is 360 words over the limit of 1,800.');
  await expect(checks).toContainText('Examiner emphasis, IA research guide, p. 5');
  await rows.nth(1).locator('[data-f="written"]').fill('1900');
  await rows.nth(1).locator('[data-f="written"]').press('Tab');
  await expect(checks).toContainText('You have written 100 words more than the limit.');
  await root.locator('input[name="excluded"][value="tables"]').check();
  await expect(root.locator('[data-excluded]')).toContainText('1 of 9 checked.');

  await page.reload();
  const again = await ready(page, 'ia-words');
  await expect(again.locator('[data-row]').first().locator('[data-f="planned"]')).toHaveValue('600');
  await expect(again.locator('input[name="excluded"][value="tables"]')).toBeChecked();
  await again.locator('[data-suggest]').click();
  await expect(again.locator('[data-planned]')).toHaveText('1,770 of 1,800');
  await again.locator('[data-add]').click();
  await expect(again.locator('[data-row]')).toHaveCount(6);
  await expect(again.locator('[data-row]').last().locator('[data-f="name"]')).toBeFocused();
  await expectDeclared(page);
  expect(await axe(page), 'axe with a plan in place').toEqual([]);
  expect(errors).toEqual([]);
});

test('the IA Studio planner adds a candidate row with every field, and removes it', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto('/ia-studio/');
  const root = await ready(page, 'ia-plan');
  const rows = root.locator('tr[data-doc]');
  const before = await rows.count();
  await root.locator('[data-add-doc]').click();
  await expect(rows).toHaveCount(before + 1);
  const added = rows.last();
  await expect(added.locator('[data-f="title"]')).toBeFocused();
  await expect(added.locator('[data-f="pages"]')).toHaveAttribute('aria-label', `Document ${before + 1}: length in A4 pages`);
  await added.locator('[data-f="selected"]').check();
  await added.locator('[data-f="title"]').fill('Trade press report');
  await added.locator('[data-f="pages"]').fill('9');
  await added.locator('[data-f="pages"]').press('Tab');
  await expect(root.locator('[data-findings]')).toContainText('Trade press report: 9 pages.');
  await added.locator('[data-remove]').click();
  await expect(rows).toHaveCount(before);
  expect(errors).toEqual([]);
});

test.describe('on a phone 320 pixels wide', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  for (const slug of NEW_TOOLS) {
    test(`${slug} does not scroll sideways`, async ({ page }) => {
      await page.goto(`/assessment/internal-assessment/${slug}/`);
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(width.scroll, `${slug} at 320 pixels`).toBeLessThanOrEqual(width.client);
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const slug of NEW_TOOLS) {
    test(`${slug} still reads as a page to fill in and print`, async ({ page }) => {
      await page.goto(`/assessment/internal-assessment/${slug}/`);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.nojs-only').first()).toBeVisible();
      // The guide's rules are there without a script, and no button that needs one is shown.
      await expect(page.locator('.it-rules').first()).toBeVisible();
      const visibleButtons = await page.locator('main button:visible').count();
      expect(visibleButtons, 'no visible button needs a script').toBe(0);
    });
  }
});
