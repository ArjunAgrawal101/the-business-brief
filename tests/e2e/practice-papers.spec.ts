/**
 * The practice papers as a candidate uses them: a Paper 1 practice case from
 * the pre-released statement to a timed, self-marked paper; the Paper 2 tasks
 * beyond a single calculation (spot the slip, read a chart, build a grid with
 * credit on your own figures, a timed set of them); and the Paper 3 plan
 * builder, step by step, on a practice stimulus and on Haven Lunchbox.
 *
 * The models behind them are tested in tests/unit (p1-cases, p2-more,
 * p3-plan, p3-stimuli); this spec proves the pages wire them up, keep the
 * work, and declare what they keep.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { generateAny, isChoice, isGrid, type AnyQuestion } from '../../src/lib/p2-practice';
import type { GridQuestion } from '../../src/lib/p2-tasks';

async function ready(page: Page, ix: string): Promise<Locator> {
  const root = page.locator(`[data-ix="${ix}"]`).first();
  await expect(root).toHaveAttribute('data-ready', 'true');
  await expect(root).not.toHaveClass(/is-broken/);
  await expect(root.locator('[data-error]').first()).toBeHidden();
  return root;
}

/** Every bb: key this browser keeps is declared on the privacy page, by name or as the prefix of a family ("bb:p3:plan:…"). */
async function expectDeclared(page: Page) {
  const html = await (await page.request.get('/privacy/')).text();
  const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
  expect(kept.length, 'something was kept').toBeGreaterThan(0);
  const undeclared = kept.filter((k) => !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
  expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
}

const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test.describe('Paper 1 practice case', () => {
  test('from the statement to a timed, self-marked paper, kept after a reload', async ({ page }) => {
    const errors = watchErrors(page);
    await page.clock.install();
    await page.goto('/assessment/paper-1/workspace/volta-ridge/');
    const root = await ready(page, 'p1-case');

    // The pre-released statement: research notes, and evidence tagged in the opening.
    await root.locator('[data-note-topic="0"]').fill('Fair trade premiums and cooperatives');
    const count = root.locator('[data-count]');
    await expect(count).toHaveText(/^Nothing tagged yet\./);
    const opening = await root.locator('[data-case] [data-para]').count();
    await root.locator('[data-case] .ws-s').first().click();
    await root.locator('[data-palette] button[data-tag]').first().click();
    await expect(root.locator('[data-live]')).toContainText('Tagged as');
    await expect(count).not.toHaveText(/^Nothing tagged yet/);
    const tagged = await count.textContent();

    // Preparation: a stakeholder compared with the model, and a tool with its feedback.
    await root.locator('[data-stake-add]').click();
    const row = root.locator('[data-stake-rows] tr[data-row]').last();
    await row.locator('[data-k="name"]').fill('Efua Mensah');
    await row.locator('[data-k="power"]').selectOption('High');
    await expect(root.locator('[data-stake-compare]')).toContainText(/You have named 1 of the \d+ stakeholders in the model\./);
    await root.locator('[data-tool]').first().check();
    await expect(root.locator('[data-tool-notes] li').first()).not.toBeEmpty();

    // The timed paper: five minutes' reading, then writing time, with the full case open.
    await root.locator('[data-start-paper]').click();
    const bar = root.locator('[data-clock-bar]');
    await expect(bar).toBeVisible();
    await expect(root.locator('[data-clock-state]')).toHaveText('Reading time');
    await expect.poll(() => root.locator('[data-case] [data-para]').count()).toBeGreaterThan(opening);
    await page.clock.fastForward('05:01');
    await expect(root.locator('[data-clock-state]')).toHaveText('Writing time');

    // An answer built in parts, with its structure checks.
    const q1 = root.locator('[data-q]').first();
    const checksBefore = await q1.locator('[data-checks]').textContent();
    await q1.locator('textarea[data-slot]').first().fill('A cooperative is owned and run by its members, who share the surplus it makes.');
    await expect.poll(() => q1.locator('[data-checks]').textContent()).not.toBe(checksBefore);

    await root.locator('[data-clock-finish]').click();
    await expect(bar).toBeHidden();
    await expect(root.locator('[data-attempts] tr')).toHaveCount(1);

    // Self-marking against the platform's guidance.
    await q1.locator('[data-guide] summary').click();
    await q1.locator('[data-mark-point]').first().check();
    await expect(root.locator('[data-total]')).toContainText('Your self-marked total:');
    const total = await root.locator('[data-total]').textContent();

    await page.reload();
    const again = await ready(page, 'p1-case');
    await expect(again.locator('[data-note-topic="0"]')).toHaveValue('Fair trade premiums and cooperatives');
    await expect(again.locator('[data-count]')).toHaveText(tagged ?? '');
    await expect(again.locator('[data-stake-rows] [data-k="name"]').last()).toHaveValue('Efua Mensah');
    await expect(again.locator('[data-attempts] tr')).toHaveCount(1);
    await expect(again.locator('[data-total]')).toHaveText(total ?? '');
    await expect(again.locator('[data-q]').first().locator('textarea[data-slot]').first()).toHaveValue(/cooperative is owned/);
    await expectDeclared(page);
    // The dashboard can name and link the work.
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:p1-case:volta-ridge') ?? '{}'));
    expect(kept).toMatchObject({ title: 'Paper 1 practice case: Volta Ridge Chocolate Ltd', href: '/assessment/paper-1/workspace/volta-ridge/' });
    expect(errors).toEqual([]);
  });

  test('the workspace links to every practice case', async ({ page }) => {
    await page.goto('/assessment/paper-1/workspace/');
    for (const href of ['/assessment/paper-1/workspace/volta-ridge/', '/assessment/paper-1/workspace/cairnside/']) await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  });
});

test.describe('Paper 2 practice: tasks beyond a single calculation', () => {
  async function load(page: Page, code: string): Promise<Locator> {
    const root = await ready(page, 'p2-practice');
    await root.locator('#pp-code').fill(code);
    await root.locator('[data-code-form]').getByRole('button', { name: 'Load' }).click();
    await expect(root.locator('[data-q-code]')).toHaveText(`Question code ${code}`);
    return root;
  }
  const check = (root: Locator) => root.locator('[data-answer-form]').getByRole('button', { name: 'Check answer' }).click();

  test('spot the slip: a wrong line is explained, and the slip is named', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/assessment/paper-2/practice/');
    const q = generateAny('slip-ratio', 12345) as AnyQuestion;
    if (!isChoice(q)) throw new Error('expected a choice question');
    const root = await load(page, q.code);
    await expect(root.locator('[data-q-task]')).toContainText(/slip/i);
    const wrong = q.options.find((o) => o.id !== q.answer);
    if (!wrong) throw new Error('no wrong option');
    await root.locator(`[data-choice][value="${wrong.id}"]`).check();
    await check(root);
    await expect(root.locator('[data-feedback]')).toContainText('Not this one.');
    await expect(root.locator('[data-feedback]')).toContainText(`The answer is ${q.answerText}`);
    await expect(root.locator('[data-session]')).toHaveText('This session: 0 of 1 question right first time.');

    await root.locator(`[data-choice][value="${q.answer}"]`).check();
    await check(root);
    await expect(root.locator('[data-feedback]')).toContainText('Right.');
    await expectDeclared(page);
    expect(errors).toEqual([]);
  });

  test('read a chart: the figure is drawn, and the reading is checked', async ({ page }) => {
    await page.goto('/assessment/paper-2/practice/');
    const q = generateAny('read-break-even-chart', 24680);
    if (isChoice(q) || isGrid(q)) throw new Error('expected a number to read');
    const root = await load(page, q.code);
    await expect(root.locator('[data-q-body] svg').first()).toBeVisible();
    await root.locator('#pp-answer').fill(String(q.answer));
    await check(root);
    await expect(root.locator('[data-feedback]')).toContainText('Right.');
  });

  test('build a cash flow forecast: each cell is marked, with credit on your own earlier figures', async ({ page }) => {
    await page.goto('/assessment/paper-2/practice/');
    const q = generateAny('build-cash-flow', 12345) as AnyQuestion;
    if (!isGrid(q)) throw new Error('expected a grid');
    const grid = q as GridQuestion;
    const root = await load(page, grid.code);
    const cell = (id: string) => root.locator(`[data-answer-form] [data-cell="${id}"]`);

    // Every cell right.
    for (const c of grid.cells) if (c.kind === 'number') await cell(c.id).fill(String(c.exact));
    await check(root);
    await expect(root.locator('[data-feedback]')).toContainText('All right.');

    // A wrong closing balance, carried forward as the next opening balance: the carry is credited.
    const numbers = grid.cells.flatMap((c) => (c.kind === 'number' ? [c] : []));
    const carried = numbers.find((c) => c.own?.op === 'copy' && typeof c.own.terms[0] === 'string');
    const from = numbers.find((c) => c.id === carried?.own?.terms[0]);
    if (!carried || !from) throw new Error('expected a carried balance');
    await page.goto('/assessment/paper-2/practice/');
    const fresh = await load(page, grid.code);
    for (const c of grid.cells) if (c.kind === 'number') await fresh.locator(`[data-answer-form] [data-cell="${c.id}"]`).fill(String(c.exact));
    const wrongFigure = from.exact + 1000;
    await fresh.locator(`[data-answer-form] [data-cell="${from.id}"]`).fill(String(wrongFigure));
    await fresh.locator(`[data-answer-form] [data-cell="${carried.id}"]`).fill(String(wrongFigure));
    await check(fresh);
    await expect(fresh.locator('[data-feedback]')).toContainText('on your own earlier figures');
    await expect(fresh.locator('[data-feedback]')).not.toContainText('All right.');
  });

  test('a timed set of spotting and building tasks is marked at the end and kept in the record', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/assessment/paper-2/practice/');
    const root = await ready(page, 'p2-practice');
    const tasks = root.locator('input[name="task"]');
    for (const t of await tasks.all()) {
      const v = await t.getAttribute('value');
      if (v === 'spot' || v === 'build') await t.check();
      else await t.uncheck();
    }
    await root.locator('input[name="mode"][value="timed"]').check();
    await expect(root.locator('[data-timed-bar]')).toBeVisible();
    await root.locator('[data-n]').selectOption('3');
    await root.locator('[data-start]').click();
    await expect(root.locator('[data-set]')).toBeVisible();
    await expect(root.locator('[data-set-list] > li')).toHaveCount(3);
    await root.locator('[data-finish]').click();
    await expect(root.locator('[data-result]')).toBeVisible();
    await expect(root.locator('[data-result-rows] tr')).toHaveCount(3);
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:p2-practice') ?? '{}'));
    expect(record.v).toBe(1);
    expect(Array.isArray(record.timed) && record.timed.length).toBe(1);
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:p2-prefs') ?? '{}'));
    expect([...prefs.tasks].sort()).toEqual(['build', 'spot']);
    await expectDeclared(page);
    expect(errors).toEqual([]);
  });
});

test.describe('Paper 3 plan builder', () => {
  test('builds a plan step by step on a practice stimulus, checks it and keeps it', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/assessment/paper-3/practice/ripplestone/');
    await expect(page.locator('h1')).toHaveText('Ripplestone Water');
    await expect(page.locator('.tag--simulated').first()).toHaveText('Fictional');
    const root = await ready(page, 'plan-builder');
    const status = root.locator('[data-status]');
    await expect(status).toHaveText(/^0 of \d+ checks met/);
    const step = (n: number) => root.locator(`[data-step="${n}"]`);
    const checks = (n: number) => step(n).locator('[data-checks]');

    // Step 1: the need and the challenges.
    await expect(checks(1)).toContainText('Choose the human need the plan meets');
    await root.locator('[data-need="n-water"]').check();
    await root.locator('[data-need="c-filters"]').check();
    await expect(checks(1)).toContainText('The plan meets a human need: Families need safe drinking water close to home.');

    // Step 2: the direction, from the resources.
    await root.locator('[data-direction]').selectOption('market-penetration');
    await root.locator('[data-why]').fill('More families in the villages already served (R1, R3)');
    await expect(checks(2)).toContainText('Direction: Market penetration, from R1 and R3.');

    // Step 3: a recommendation tied to the need and to evidence, shaped by a tool.
    const r1 = (n: number) => step(n).locator('[data-rec="a1"]');
    await r1(3).locator('[data-k="text"]').fill('Hold a buffer stock of filter cartridges');
    await expect(checks(3)).toContainText('Recommendation 1 answers no need or challenge you chose; Recommendation 1 cites no resource.');
    await r1(3).locator('[data-k="serves"][value="c-filters"]').check();
    await r1(3).locator('[data-k="serves"][value="n-water"]').check();
    await r1(3).locator('[data-k="evidence"][value="R4"]').check();
    await r1(3).locator('[data-k="tool"]').selectOption('force-field');
    await expect(r1(3).locator('[data-tool-hint]')).toContainText('Whether a change is likely to succeed');
    await expect(checks(3)).toContainText('Every recommendation answers a need or challenge you chose, with evidence from the resources.');
    // The title follows into the later steps.
    await expect(r1(4).locator('[data-title="a1"]')).toHaveText('Hold a buffer stock of filter cartridges');

    // Step 4: what it uses, how it is paid for, when, and its first step.
    await r1(4).locator('[data-k="uses"]').fill('The dry-season surplus of $410 a kiosk');
    await r1(4).locator('[data-k="funding"]').selectOption('donation');
    await expect(checks(4)).toContainText('Recommendation 1 leans on donations or grants.');
    await r1(4).locator('[data-k="funding"]').selectOption('surplus');
    await expect(checks(4)).not.toContainText('leans on donations');
    await r1(4).locator('[data-k="step"]').fill('Grace orders three months of cartridges');
    await expect(checks(4)).toContainText('Every recommendation has a first implementation step.');

    // Step 5: impact, the other areas, and a trade-off.
    await r1(5).locator('[data-k="gain"]').fill('Kiosks stop breaking down');
    await r1(5).locator('[data-k="areas"][value="finance"]').check();
    await r1(5).locator('[data-k="tradeoff"]').fill('It costs money.');
    await expect(checks(5)).toContainText('the trade-off reads like a disadvantage');
    await r1(5).locator('[data-k="tradeoff"]').fill('Cash is tied up in stock, but every working day sells water');
    await expect(checks(5)).not.toContainText('reads like a disadvantage');

    // The plan in order, and the checks by criterion.
    await expect(root.locator('[data-view]')).toContainText('Hold a buffer stock of filter cartridges');
    await expect(root.locator('[data-review]')).toContainText('A: Use of resource materials (4 marks)');
    await expect(status).not.toHaveText(/^0 of/);

    // Add a recommendation; remove it; undo.
    await root.locator('[data-add]').click();
    await expect(page.locator('#pb-ripplestone-a4-text')).toBeFocused();
    await expect(step(3).locator('[data-rec]')).toHaveCount(4);
    await step(3).locator('[data-rec="a2"]').getByRole('button', { name: 'Remove recommendation 2' }).click();
    await expect(step(3).locator('[data-rec]')).toHaveCount(3);
    await expect(step(4).locator('[data-rec]')).toHaveCount(3);
    await root.getByRole('button', { name: 'Undo' }).click();
    await expect(step(3).locator('[data-rec]')).toHaveCount(4);

    await page.reload();
    const again = await ready(page, 'plan-builder');
    await expect(again.locator('[data-need="n-water"]')).toBeChecked();
    await expect(again.locator('[data-direction]')).toHaveValue('market-penetration');
    await expect(again.locator('[data-step="3"] [data-rec="a1"] [data-k="text"]')).toHaveValue('Hold a buffer stock of filter cartridges');
    await expect(again.locator('[data-step="4"] [data-rec="a1"] [data-k="funding"]')).toHaveValue('surplus');
    await expect(again.locator('[data-step="5"] [data-rec="a1"] [data-k="areas"][value="finance"]')).toBeChecked();
    await expectDeclared(page);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:p3:plan:ripplestone') ?? '{}'));
    expect(kept).toMatchObject({ v: 2, title: 'Paper 3 plan: Ripplestone Water', href: '/assessment/paper-3/practice/ripplestone/#pb-ripplestone' });
    expect(errors).toEqual([]);
  });

  test('reads a plan kept by the first version of the builder on the Paper 3 page', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(
        'bb:p3:plan',
        JSON.stringify({
          direction: 'market-development',
          why: 'Offices ask for catering (R4)',
          actions: [{ text: 'Pilot afternoon catering for two offices', fn: 'marketing', stage: 'first', resources: ['R2', 'R4'], tool: 'ansoff', gain: 'Orders', tradeoff: 'Afternoons only, but lunches are safe' }],
        }),
      );
    });
    await page.goto('/assessment/paper-3/');
    const root = await ready(page, 'plan-builder');
    await expect(root.locator('[data-direction]')).toHaveValue('market-development');
    const r1 = root.locator('[data-step="3"] [data-rec="a1"]');
    await expect(r1.locator('[data-k="text"]')).toHaveValue('Pilot afternoon catering for two offices');
    await expect(r1.locator('[data-k="evidence"][value="R4"]')).toBeChecked();
    await expect(r1.locator('[data-k="tool"]')).toHaveValue('ansoff');
    await expect(root.locator('[data-step="1"] [data-checks]')).toContainText('Choose the human need the plan meets');
  });

  test('the practice stimuli are listed and linked from the Paper 3 page', async ({ page }) => {
    await page.goto('/assessment/paper-3/');
    await page.locator('a[href="/assessment/paper-3/practice/"]').first().click();
    await expect(page.locator('h1')).toHaveText('Paper 3 practice stimuli');
    for (const href of ['/assessment/paper-3/practice/ripplestone/', '/assessment/paper-3/practice/relay/']) await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  });
});

test.describe('Question bank', () => {
  test('uses every command term, and finds the questions for a term it did not use before', async ({ page }) => {
    await page.goto('/assessment/question-bank/');
    const stats = page.locator('.ch__stats');
    await expect(stats).toContainText(/Command terms\s*(\d+) of \1/);
    const root = await ready(page, 'bank');
    const shown = () => root.locator('[data-bq]:visible').count();
    await root.locator('#bf-command').selectOption('plot');
    await expect.poll(shown).toBeGreaterThan(0);
    await expect(root.locator('[data-bq]:visible').first()).toContainText('Plot');
    await root.locator('#bf-command').selectOption('compare-and-contrast');
    await expect.poll(shown).toBeGreaterThan(0);
  });

  test('the new questions have their mark schemes on the practice questions page', async ({ page }) => {
    await page.goto('/exam-desk/practice/#q-q-ct-determine-variance');
    const card = page.locator('#q-q-ct-determine-variance');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Gallery Nine Café (a fictional business)');
    await card.locator('[data-ms] summary').click();
    await expect(card.locator('[data-ms]')).toContainText('$5,400 adverse');
    await expect(page.locator('h2', { hasText: '3.9 Budgets' })).toBeVisible();
  });
});
