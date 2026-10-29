/**
 * The interactions, driven as a learner would drive them: each one must give
 * the right feedback, announce it, and keep the learner's work.
 */
import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page, selector: string) => {
  await expect(page.locator(`${selector}.is-enhanced`).first()).toBeVisible();
};

test.describe('Finance Desk', () => {
  test('the break-even workspace recalculates, validates and runs scenarios', async ({ page }) => {
    await page.goto('/finance-desk/break-even/');
    await ready(page, '[data-ix="break-even"]');
    const ws = page.locator('[data-ix="break-even"]');
    await expect(ws.locator('[data-figures]')).toContainText('550 mugs');
    await ws.locator('input[name="price"]').fill('24');
    await ws.locator('input[name="quantity"]').fill('590');
    await expect(ws.locator('[data-figures]')).toContainText('487 mugs');
    await expect(ws.locator('[data-figures]')).toContainText('€1,736.60');
    await expect(ws.locator('[data-working]')).toContainText('487 mugs');
    await ws.locator('input[name="price"]').fill('');
    await expect(ws.locator('input[name="price"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(ws.locator('[data-err="price"]')).toContainText('Enter a number');
    await ws.locator('[data-scenario="cut-marketing"]').click();
    await expect(ws.locator('[data-scenario="cut-marketing"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(ws.locator('input[name="fixedCosts"]')).toHaveValue('7860');
    await expect(ws.locator('[data-figures]')).toContainText('531 mugs');
    await ws.locator('[data-reset]').click();
    await expect(ws.locator('input[name="variableCost"]')).toHaveValue('6.30');
    await expect(ws.locator('[data-figures]')).toContainText('550 mugs');
  });

  test('the error diagnosis marks the chosen line', async ({ page }) => {
    await page.goto('/finance-desk/break-even/');
    await ready(page, '[data-ix="quiz"]');
    const item = page.locator('[data-item="round-down"]');
    await item.locator('label:has(input[value="1"])').click();
    await item.locator('[data-check]').click();
    await expect(item.locator('[data-key]')).toBeVisible();
    await expect(item.locator('[data-verdict]')).toHaveText('Not this line');
    await expect(item.locator('.opt.is-answer')).toHaveCount(1);
    await item.locator('label:has(input[value="2"])').click();
    await item.locator('[data-check]').click();
    await expect(item.locator('[data-verdict]')).toHaveText('Right line');
  });

  test('the special order panel shows when the order loses money', async ({ page }) => {
    await page.goto('/finance-desk/contribution/');
    await ready(page, '[data-ix="special-order"]');
    const so = page.locator('[data-ix="special-order"]');
    await expect(so.locator('[data-figures]')).toContainText('+€1,395.00');
    await so.locator('[data-scenario="december"]').click();
    await expect(so.locator('[data-figures]')).toContainText('Fall in profit');
    await expect(so.locator('[data-figures]')).toContainText('€383.40');
    await expect(so.locator('[data-working]')).toContainText('displaced');
  });
});

test.describe('Costs and revenues brief', () => {
  test('the cost classifier checks both questions and remembers answers', async ({ page }) => {
    await page.goto('/topics/costs-and-revenues/');
    await ready(page, '[data-ix="quiz"]');
    const clay = page.locator('[data-item="clay"]');
    await clay.locator('[data-group="behaviour"] label:has(input[value="variable"])').click();
    await clay.locator('[data-check]').click();
    await expect(clay.locator('[data-msg]')).toContainText('Choose');
    await clay.locator('[data-group="directness"] label:has(input[value="indirect"])').click();
    await clay.locator('[data-check]').click();
    await expect(clay.locator('[data-verdict]')).toHaveText('One of two right');
    await clay.locator('[data-group="directness"] label:has(input[value="direct"])').click();
    await clay.locator('[data-check]').click();
    await expect(clay.locator('[data-verdict]')).toHaveText('Right');
    await page.reload();
    await ready(page, '[data-ix="quiz"]');
    await expect(page.locator('[data-item="clay"] input[value="direct"]')).toBeChecked();
  });
});

test.describe('Growth and evolution brief', () => {
  test('Ansoff placements appear on the matrix', async ({ page }) => {
    await page.goto('/topics/growth-and-evolution/');
    await ready(page, '[data-ix="quiz"]');
    const quiz = page.locator('.quiz--ansoff');
    await quiz.locator('[data-item="franchise"] label:has(input[value="market-development"])').click();
    await expect(quiz.locator('[data-cell="market-development"] .chip')).toHaveCount(1);
    await quiz.locator('[data-item="franchise"] [data-check]').click();
    await expect(quiz.locator('[data-cell="market-development"] .chip--right')).toHaveCount(1);
  });

  test('the decision tree asks for a prediction, then explains the cost error', async ({ page }) => {
    await page.goto('/topics/growth-and-evolution/');
    await ready(page, '[data-ix="tree"]');
    const lab = page.locator('[data-ix="tree"]');
    await expect(lab.locator('[data-lab]')).toBeHidden();
    await lab.locator('label:has(input[value="organic"])').click();
    await lab.locator('[data-check-prediction]').click();
    await expect(lab.locator('[data-prediction-feedback]')).toContainText('Forgetting to subtract the cost');
    await expect(lab.locator('[data-lab]')).toBeVisible();
    await expect(lab.locator('[data-table] tr.is-lead')).toContainText('Franchising');
    await lab.locator('[data-edit] summary').click();
    await lab.locator('input[name="franchise-p0"]').fill('0.5');
    await expect(lab.locator('[data-problems="franchise"]')).toContainText('add up to 0.9');
  });

  test('the scale explorer moves along the curve', async ({ page }) => {
    await page.goto('/topics/growth-and-evolution/');
    await ready(page, '[data-ix="scale"]');
    const sc = page.locator('[data-ix="scale"]');
    await sc.locator('input[data-n]').fill('20');
    await expect(sc.locator('[data-reading]')).toContainText('diseconomies of scale');
    await sc.locator('input[type="number"]').fill('24');
    await sc.locator('[data-check-guess]').click();
    await expect(sc.locator('[data-guess-feedback]')).toContainText('lowest average cost is at 11 restaurants');
  });
});

test.describe('Leadership brief', () => {
  test('the force field totals follow the sliders', async ({ page }) => {
    await page.goto('/topics/leadership-and-management/');
    await ready(page, '[data-ix="force-field"]');
    const ff = page.locator('[data-ix="force-field"]').first();
    await expect(ff.locator('[data-total="restraining"]')).toHaveText('15');
    await ff.locator('input[data-side="restraining"][data-index="0"]').fill('1');
    await expect(ff.locator('[data-total="restraining"]')).toHaveText('12');
    await ff.locator('label:has(input[value="1"])').first().click();
    await expect(ff.locator('[data-weaken-feedback]')).toContainText('restraining total would fall');
  });

  test('the style matcher sums up the styles chosen', async ({ page }) => {
    await page.goto('/topics/leadership-and-management/');
    await ready(page, '.quiz--styles');
    const sm = page.locator('.quiz--styles');
    const ids = await sm.locator('[data-item]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.item));
    for (const id of ids) await sm.locator(`[data-item="${id}"] label:has(input[value="democratic"])`).click();
    await sm.locator('[data-check-all]').click();
    await expect(sm.locator('[data-summary]')).toContainText('1 different style');
  });
});

test.describe('Decision Room', () => {
  test('commit, consequence, implementation, debrief', async ({ page }) => {
    await page.goto('/decision-room/atelier-pricing/');
    await ready(page, '[data-ix="decision-room"]');
    const room = page.locator('[data-ix="decision-room"]');
    await expect(room.locator('[data-round="order"] [data-body]')).toBeHidden();
    await expect(room.locator('[data-debrief-body]')).toBeHidden();
    await room.locator('[data-commit="price"]').click();
    await expect(room.locator('[data-round-msg="price"]')).toContainText('Choose one option first');
    await room.locator('[data-round="price"] input[value="raise-24"]').check();
    await room.locator('[data-why="price"]').fill('Tested evidence from the price test.');
    await room.locator('[data-commit="price"]').click();
    await expect(room.locator('[data-result="price"] .dr-outcome__headline')).toBeFocused();
    await expect(room.locator('[data-board]')).toContainText('€1,736.60');
    await room.locator('[data-round="order"] input[value="accept"]').check();
    await room.locator('[data-commit="order"]').click();
    await expect(room.locator('[data-debrief-body]')).toBeVisible();
    await expect(room.locator('[data-yours]')).toContainText('Tested evidence');
    await room.locator('[data-restart]').click();
    await expect(room.locator('[data-debrief-body]')).toBeHidden();
  });
});

test.describe('Exam Desk', () => {
  test('a practice answer is kept and the self-check adds up the marks', async ({ page }) => {
    await page.goto('/exam-desk/practice/');
    const q = page.locator('#q-q-costs-p2-price');
    await expect(q).toHaveClass(/is-enhanced/);
    await q.locator('[data-answer]').fill('Variable cost is €7.26 at €24.');
    await q.locator('[data-ms] summary').click();
    await q.locator('[data-point="0"]').check();
    await q.locator('[data-point="1"]').check();
    await expect(q.locator('[data-score]')).toContainText('2 of 3 marks');
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.locator('#q-q-costs-p2-price [data-answer]')).toHaveValue('Variable cost is €7.26 at €24.');
  });

  test('the filters narrow the practice set', async ({ page }) => {
    await page.goto('/exam-desk/practice/');
    await page.selectOption('#f-paper', 'paper-3');
    await expect(page.locator('[data-count]')).toHaveText('1 question');
    await page.selectOption('#f-paper', '');
    await page.selectOption('#f-calc', 'calc');
    await expect(page.locator('[data-filter-item]:visible')).toHaveCount(6);
  });
});

test.describe('Cash flow lab', () => {
  test('the forecast changes with the way the kiln is paid for, and keeps the choice', async ({ page }) => {
    await page.goto('/finance-desk/cash-flow/');
    await ready(page, '[data-ix="cash-flow"]');
    const lab = page.locator('[data-ix="cash-flow"]');
    const closing = lab.locator('tr.cff__closing td');
    await expect(closing.nth(2)).toHaveText('(5,290.80)');
    await expect(lab.locator('[data-headline]')).toContainText('January');
    await lab.locator('label:has(input[name="finance"][value="lease"])').click();
    await expect(closing.nth(2)).toHaveText('12,189.20');
    await expect(lab.locator('[data-figures]')).toContainText('€10,496.00');
    await expect(lab.locator('[data-headline]')).toContainText('stays in credit');
    await lab.locator('label:has(input[name="finance"][value="delay"])').click();
    await expect(closing.nth(5)).toHaveText('(3,924.00)');
    await expect(lab.locator('[data-headline]')).toContainText('April');
    await lab.locator('label:has(input[name="measure"][value="overdraft"])').click();
    await expect(lab.locator('tr.cff__status td').nth(5)).toHaveText('Overdrawn, within the limit');
    await page.reload();
    await ready(page, '[data-ix="cash-flow"]');
    await expect(lab.locator('input[name="finance"][value="delay"]')).toBeChecked();
    await expect(closing.nth(5)).toHaveText('(3,924.00)');
    await lab.locator('[data-plan-reset]').click();
    await expect(closing.nth(2)).toHaveText('(5,290.80)');
  });

  test('the questions check the reading of the forecast', async ({ page }) => {
    await page.goto('/finance-desk/cash-flow/');
    await ready(page, '[data-ix="quiz"]');
    const item = page.locator('[data-item="why-differ"]');
    await item.locator('label:has(input[value="kiln"])').click();
    await item.locator('[data-check]').click();
    await expect(item.locator('[data-key]')).toBeVisible();
    await expect(item.locator('[data-verdict]')).toHaveText('Right');
  });
});

test.describe('Case lab', () => {
  test('stages open in turn, the plan moves with a duration, and the memo keeps the sentences', async ({ page }) => {
    await page.goto('/case-room/halden-diagnosis/');
    await ready(page, '[data-ix="case-lab"]');
    const lab = page.locator('[data-ix="case-lab"]');
    const stage = (id: string) => lab.locator(`[data-stage="${id}"]`);
    await expect(stage('cause')).toHaveClass(/is-locked/);
    await expect(stage('problem').locator('[data-next]')).toBeDisabled();
    const finish = async (id: string, sentence: string) => {
      const s = stage(id);
      const quizzes = s.locator('[data-ix="quiz"]');
      for (let i = 0; i < (await quizzes.count()); i++) {
        const q = quizzes.nth(i);
        const items = q.locator('[data-item]');
        for (let j = 0; j < (await items.count()); j++) await items.nth(j).locator('label.opt').first().click();
        await q.locator('[data-check-all]').click();
      }
      await s.locator('textarea[data-reflect]').fill(sentence);
      await expect(s.locator('[data-next]')).toBeEnabled();
      await s.locator('[data-next]').click();
      await expect(s).toHaveClass(/is-done/);
    };
    await finish('problem', 'The night shift cannot yet use the system.');
    await expect(stage('cause')).toHaveClass(/is-open/);
    await finish('cause', 'Training first.');
    await finish('strategy', 'Retrain and redesign.');
    const plan = stage('implementation').locator('[data-plan]');
    await expect(plan.locator('[data-plan-read]')).toContainText('13 weeks: 1 week inside the deadline');
    await plan.locator('[data-vary]').selectOption('5');
    await expect(plan.locator('[data-plan-read]')).toContainText('15 weeks: 1 week after the deadline');
    await finish('implementation', 'Retraining has no room to slip.');
    await finish('evaluation', 'Go back to the causes.');
    const memo = lab.locator('[data-memo]');
    await expect(memo.locator('[data-memo-stage="problem"] [data-memo-yours]')).toHaveText('The night shift cannot yet use the system.');
    await page.reload();
    await ready(page, '[data-ix="case-lab"]');
    await expect(stage('evaluation')).toHaveClass(/is-done/);
    await expect(memo.locator('[data-memo-stage="evaluation"] [data-memo-yours]')).toHaveText('Go back to the causes.');
    await stage('problem').locator('[data-toggle]').click();
    await expect(stage('problem')).toHaveClass(/is-open/);
    await expect(stage('problem').locator('[data-toggle]')).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('IA Studio', () => {
  test('the planner checks supporting documents, totals the marks and keeps the plan', async ({ page }) => {
    await page.goto('/ia-studio/');
    await ready(page, '[data-ix="ia-plan"]');
    const plan = page.locator('[data-ix="ia-plan"]');
    await plan.locator('#ia-submission').fill('2027-04');
    await expect(plan.locator('[data-tl-earliest]')).toContainText('April 2024');
    await plan.locator('#ia-deadline').fill('2027-03-05');
    await expect(plan.locator('[data-tl-selfmark]')).toContainText('19 February 2027');
    const rows = plan.locator('tr[data-doc]');
    const docs: Array<[string, string, string, string]> = [
      ['Annual report', 'Firm', '2026-02', 'secondary'],
      ['Press article', 'Paper', '2023-11', 'secondary'],
      ['Interview', 'Me', '2026-09', 'transcript'],
      ['Podcast', 'Radio', '2026-01', 'transcript'],
    ];
    for (const [i, [title, publisher, date, kind]] of docs.entries()) {
      const r = rows.nth(i);
      await r.locator('[data-f="selected"]').check();
      await r.locator('[data-f="title"]').fill(title);
      await r.locator('[data-f="publisher"]').fill(publisher);
      await r.locator('[data-f="published"]').fill(date);
      await r.locator('[data-f="kind"]').selectOption(kind);
    }
    const findings = plan.locator('[data-findings]');
    await expect(findings).toContainText('4 selected, within three to five');
    await expect(findings).toContainText('Press article: published more than three years before submission');
    await expect(findings).toContainText('At most one supporting document may be a transcript');
    await expect(rows.nth(1)).toHaveClass(/is-problem/);
    await plan.locator('#ia-words').fill('1850');
    await expect(plan.locator('[data-words-status]')).toContainText('50 words over');
    await plan.locator('select[name="mark-A"]').selectOption('4');
    await plan.locator('select[name="mark-C"]').selectOption('3');
    await expect(plan.locator('[data-mark-total]')).toHaveText('7');
    await plan.locator('input[name="done-1"]').check();
    await expect(plan.locator('[data-progress-text]')).toHaveText('1 of 10 steps done');
    await expect(plan.locator('[data-saved]')).toHaveText('Saved on this device.');
    await page.reload();
    await ready(page, '[data-ix="ia-plan"]');
    await expect(plan.locator('tr[data-doc]').nth(1).locator('[data-f="title"]')).toHaveValue('Press article');
    await expect(plan.locator('[data-mark-total]')).toHaveText('7');
    await expect(plan.locator('[data-findings]')).toContainText('At most one supporting document may be a transcript');
  });
});

test.describe('Privacy', () => {
  test('clearing removes everything the site stored', async ({ page }) => {
    await page.goto('/privacy/');
    await page.evaluate(() => {
      localStorage.setItem('bb:level', 'SL');
      localStorage.setItem('bb:q:test', '{}');
      localStorage.setItem('other-site', 'keep');
    });
    await page.reload();
    await expect(page.locator('[data-count]')).toContainText('2 items');
    page.once('dialog', (d) => d.accept());
    await page.locator('[data-clear]').click();
    await expect(page.locator('[data-count]')).toContainText('holds nothing');
    expect(await page.evaluate(() => localStorage.getItem('other-site'))).toBe('keep');
  });
});
