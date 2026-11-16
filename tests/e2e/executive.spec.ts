/**
 * The Boardroom's executive simulation, played as a learner would: choose a
 * role, answer every stage (with a wrong answer and a refused one on the way),
 * choose a strategy, set and commit a plan for each year (with a plan the
 * rules refuse), evaluate it and open the debrief. Every stage is scanned with
 * axe-core, progress must survive a reload, and the page must read as a
 * complete casebook when the script fails or JavaScript is off.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];

const axe = async (page: Page, where: string) => {
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(
    r.violations.map((v) => `${where}: ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`),
    `axe violations at ${where}`,
  ).toEqual([]);
};

const SIM = '/boardroom/executive/simulation/';
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('bb:executive') ?? '{}'));

/** Choose an option and check it. */
async function answer(page: Page, q: string, option: string) {
  await page.check(`#q-${q}-${option}`);
  await page.click(`.ex-q[data-q="${q}"] [data-act="check"]`);
  await expect(page.locator(`.ex-q[data-q="${q}"] [data-verdict]`)).toBeVisible();
}

test.describe('the executive simulation with JavaScript', () => {
  test('a full run as the chief operating officer: validated at every step, accessible, and kept on this device', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('dialog', (d) => void d.accept());
    await page.goto(SIM);
    await page.evaluate(() => localStorage.removeItem('bb:executive'));
    await page.reload();
    await expect(page.locator('[data-ix="executive"]')).toHaveClass(/is-enhanced/);

    // Before a role is chosen, the stages wait and the casebook's note gives way.
    await expect(page.locator('.ex-casebook-note')).toBeHidden();
    await expect(page.locator('#stage-finance')).toBeHidden();
    await expect(page.locator('#brief')).toBeVisible();

    // A role is required, and the message says so.
    await page.click('[data-act="role"]');
    await expect(page.locator('[data-role-msg]')).toHaveText('Choose a role first.');
    await page.check('#ex-role-coo');
    await page.click('[data-act="role"]');
    await expect(page.locator('#stage-finance-h')).toBeFocused();
    await expect(page.locator('[data-dash-role]')).toContainText('Chief operating officer (COO)');
    await expect(page.locator('[data-dash-tiles] .bb-kpi.is-pinned')).toHaveCount(4);
    await expect(page.locator('[data-stage="finance"] [data-lens]')).toContainText('As chief operating officer');
    await expect(page.locator('#stage-causes')).toBeHidden();
    await axe(page, 'stage 1');

    // Stage 1: nothing moves on until both answers are checked; a figure that is not a number is refused.
    await page.click('[data-stage="finance"] [data-act="next"]');
    await expect(page.locator('[data-stage="finance"] [data-next-msg]')).toHaveText('Check your answer to every question in this stage first.');
    await page.fill('#q-margin-2026-in', 'about one');
    await page.click('.ex-q[data-q="margin-2026"] [data-act="check"]');
    await expect(page.locator('#q-margin-2026-msg')).toHaveText('Enter a number, such as 4.2.');
    await expect(page.locator('#q-margin-2026-in')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-after] .ex-after__body')).toBeHidden();
    await page.fill('#q-margin-2026-in', '1.0');
    await page.click('.ex-q[data-q="margin-2026"] [data-act="check"]');
    await expect(page.locator('.ex-q[data-q="margin-2026"] [data-verdict]')).toContainText('Right.');
    await expect(page.locator('.ex-q[data-q="margin-2026"] [data-answer]')).toBeVisible();
    // A wrong answer is marked in words, with its own feedback.
    await answer(page, 'how-profit-fell', 'collapse');
    await expect(page.locator('.ex-q[data-q="how-profit-fell"] [data-verdict]')).toContainText('Not quite.');
    await expect(page.locator('#q-how-profit-fell-squeeze')).toBeDisabled();
    // With both checked, the ratios open.
    await expect(page.locator('[data-after] .ex-after__body')).toBeVisible();
    await axe(page, 'stage 1 checked');
    await page.click('[data-stage="finance"] [data-act="next"]');
    await expect(page.locator('#stage-causes-h')).toBeFocused();
    await expect(page.locator('[data-stage="finance"] [data-act="toggle"]')).toHaveText('Review this stage');

    // Stage 2: at least two pieces of evidence, then feedback on every one.
    await page.check('#ev-materials');
    await page.click('.ex-q[data-q="causes"] [data-act="check"]');
    await expect(page.locator('#q-causes-msg')).toHaveText('Choose at least 2 pieces of evidence first.');
    for (const id of ['competitors', 'morale', 'interest']) await page.check(`#ev-${id}`);
    await page.click('.ex-q[data-q="causes"] [data-act="check"]');
    await expect(page.locator('.ex-q[data-q="causes"] [data-verdict]')).toHaveText(/You found 3 of the 5 causes, and chose 1 the evidence does not support\./);
    await expect(page.locator('[data-ev="interest"] [data-mark]')).toHaveText('You chose it, but the evidence does not support it.');
    await expect(page.locator('[data-ev="marketing"] [data-mark]')).toHaveText('You left it out, but it is a cause.');
    await axe(page, 'stage 2 checked');
    await page.click('[data-stage="causes"] [data-act="next"]');

    // Stages 3 to 5.
    await answer(page, 'price-rise', 'small-fall');
    await answer(page, 'export-offer', 'balanced');
    await page.click('[data-stage="market"] [data-act="next"]');
    await page.fill('#q-spare-capacity-in', '1,955');
    await page.click('.ex-q[data-q="spare-capacity"] [data-act="check"]');
    await expect(page.locator('.ex-q[data-q="spare-capacity"] [data-verdict]')).toContainText('Right.');
    await answer(page, 'demand-up', 'overtime-quality');
    await axe(page, 'stage 4 checked');
    await page.click('[data-stage="operations"] [data-act="next"]');
    await answer(page, 'conflict', 'fund-workforce');
    await answer(page, 'morale-response', 'training-pay');
    await page.click('[data-stage="people"] [data-act="next"]');

    // Stage 6: a strategy is required; choosing one shows how each fits.
    await page.click('.ex-q[data-q="strategy"] [data-act="check"]');
    await expect(page.locator('#q-strategy-msg')).toHaveText('Choose a strategy first.');
    await page.check('#st-restore');
    await page.click('.ex-q[data-q="strategy"] [data-act="check"]');
    await expect(page.locator('.ex-q[data-q="strategy"] [data-verdict]')).toContainText('You will lead with Restore the core');
    await expect(page.locator('[data-strat="cut"] [data-answer]')).toBeVisible();
    await axe(page, 'stage 6 checked');
    await page.click('[data-stage="strategy"] [data-act="next"]');

    // Stage 7: the form opens with the strategy's figures; the rules refuse a plan over budget and a price out of range.
    await expect(page.locator('#ex-lever-marketing')).toHaveValue('1100');
    await page.fill('#ex-lever-price', '15');
    await page.fill('#ex-lever-marketing', '2000');
    await page.fill('#ex-lever-capacity', '800');
    await expect(page.locator('[data-meter-text]')).toContainText('too much');
    await page.click('[data-act="commit"]');
    await expect(page.locator('[data-err="price"]')).toHaveText('Enter a figure from −10% to 10%.');
    await expect(page.locator('[data-err="budget"]')).toContainText('more than the budget');
    await expect(page.locator('#ex-lever-price')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#ex-lever-price')).toBeFocused();
    await axe(page, 'the plan refused');
    await page.fill('#ex-lever-price', '3');
    await page.fill('#ex-lever-marketing', '1000');
    await page.fill('#ex-lever-capacity', '400');
    await page.click('[data-act="commit"]');
    await expect(page.locator('#ex-y2027-h')).toBeFocused();
    await expect(page.locator('[data-years] .ex-year')).toHaveCount(1);
    await expect(page.locator('[data-years] .ex-area--marketing li').first()).toContainText('The brand moved from');
    // The next year's form keeps the recurring levers and starts the one-off ones at none.
    await expect(page.locator('#ex-lever-marketing')).toHaveValue('1000');
    await expect(page.locator('#ex-lever-capacity')).toHaveValue('0');
    await expect(page.locator('#ex-lever-costCut')).toHaveValue('0');
    await expect(page.locator('[data-dash-when]')).toHaveText('after 2027');
    await axe(page, 'the first year');

    // The plan survives a reload.
    let s = await saved(page);
    expect(s.role).toBe('coo');
    expect(s.plan).toHaveLength(1);
    expect(s.plan[0]).toMatchObject({ price: 3, costCut: 5, marketing: 1000000, capacity: 400000, people: 200000, international: 0 });
    await page.reload();
    await expect(page.locator('[data-years] .ex-year')).toHaveCount(1);
    await expect(page.locator('#ex-form-h')).toHaveText('The plan for 2028');
    await expect(page.locator('#stage-finance')).toBeVisible();
    await expect(page.locator('[data-stage="finance"] [data-body]')).toBeHidden();

    // Undo brings the year's figures back into the form; commit 2028 and 2029.
    await page.click('[data-act="undo-year"]');
    await expect(page.locator('#ex-form-h')).toHaveText('The plan for 2027');
    await expect(page.locator('#ex-lever-capacity')).toHaveValue('400');
    await page.click('[data-act="commit"]');
    await expect(page.locator('#ex-y2027-h')).toBeFocused();
    await page.click('[data-act="commit"]');
    await expect(page.locator('#ex-y2028-h')).toBeFocused();
    await expect(page.locator('[data-years] .ex-news')).toContainText('The pound strengthens');
    await page.fill('#ex-lever-people', '300');
    await page.click('[data-act="commit"]');
    await expect(page.locator('#ex-y2029-h')).toBeFocused();
    await expect(page.locator('[data-years] .ex-year')).toHaveCount(3);
    await page.click('[data-act="to-evaluate"]');
    await expect(page.locator('#stage-evaluate-h')).toBeFocused();

    // Stage 9: the debrief waits for the question; the answer is checked against the learner's own year.
    await expect(page.locator('[data-eval] .bb-score.is-mine')).toContainText('Chief operating officer (COO)');
    await page.click('[data-act="to-debrief"]');
    await expect(page.locator('[data-debrief-msg]')).toHaveText('Check your answer to the question first.');
    const roce = await page.evaluate(() => {
      const row = [...document.querySelectorAll('[data-eval] .bb-range tbody tr')].find((tr) => tr.querySelector('th')?.textContent?.includes('Return on capital employed'));
      return row?.querySelectorAll('td')[1]?.textContent ?? '';
    });
    await page.fill('#ex-eval-in', roce.replace('%', ''));
    await page.click('.ex-q[data-q="roce-final"] [data-act="check"]');
    await expect(page.locator('.ex-q[data-q="roce-final"] [data-verdict]')).toContainText('Right.');
    await page.fill('#ex-r-worked', 'Marketing rebuilt the brand by 2029.');
    await axe(page, 'the evaluation');
    await page.click('[data-act="to-debrief"]');
    await expect(page.locator('#debrief-h')).toBeFocused();

    // The debrief: your plan beside every strategy and carrying on as before, lever by lever, every role's scorecard.
    await expect(page.locator('[data-yours] .ex-compare tbody tr')).toHaveCount(6);
    await expect(page.locator('[data-yours] .ex-compare tr.is-yours th')).toHaveText('Your plan');
    await expect(page.locator('[data-yours] .ex-attr tbody tr')).not.toHaveCount(0);
    await expect(page.locator('[data-yours] .bb-score')).toHaveCount(7);
    await expect(page.locator('[data-yours] .bb-score.is-mine')).toContainText('(your role)');
    await expect(page.locator('[data-debrief-body] .bb-theory__card').first()).toBeVisible();
    await axe(page, 'the debrief');

    // Everything is kept, and the debrief is still open after a reload.
    s = await saved(page);
    expect(s.at).toBe(9);
    expect(s.plan).toHaveLength(3);
    expect(s.reflections.worked).toBe('Marketing rebuilt the brand by 2029.');
    expect(s.summary).toMatch(/^Finished as the chief operating officer: a profit margin of .+ in 2029\.$/);
    await page.reload();
    await expect(page.locator('[data-yours] .ex-compare')).toBeVisible();
    await expect(page.locator('#ex-r-worked')).toHaveValue('Marketing rebuilt the brand by 2029.');

    // Starting again clears the work and keeps the role.
    await page.click('[data-act="restart"]');
    await expect(page.locator('#stage-finance-h')).toBeFocused();
    await expect(page.locator('#q-margin-2026-in')).toHaveValue('');
    s = await saved(page);
    expect(s.role).toBe('coo');
    expect(s.plan).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the casebook comes back if the script fails, and passes the same checks', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(SIM);
    await expect(page.locator('[data-ix="executive"]')).toHaveClass(/is-enhanced/);
    await page.evaluate(() => document.querySelector('[data-ix="executive"]')?.classList.add('is-broken'));
    await expect(page.locator('.ex-casebook-note')).toBeVisible();
    await expect(page.locator('#stage-strategy')).toBeVisible();
    await expect(page.locator('.ex-walk .ex-year')).toHaveCount(3);
    await expect(page.locator('[data-roles]')).toBeHidden();
    await axe(page, 'the casebook');
  });

  test('the front page offers the seven roles and says how far this browser has got', async ({ page }) => {
    await page.goto('/boardroom/executive/');
    await expect(page.locator('.ex-role')).toHaveCount(7);
    await expect(page.locator('[data-ex-saved]')).toBeHidden();
    await page.evaluate(() => localStorage.setItem('bb:executive', JSON.stringify({ v: 1, role: 'cfo', at: 3, summary: 'Stage 4 of 9, as the chief financial officer.' })));
    await page.reload();
    await expect(page.locator('[data-ex-saved]')).toContainText('Saved on this device: Stage 4 of 9, as the chief financial officer.');
    // A role's link opens the simulation with that role chosen in the picker.
    await page.click('#role-cmo .ex-role__play');
    await page.evaluate(() => localStorage.removeItem('bb:executive'));
    await page.reload();
    await expect(page.locator('#ex-role-cmo')).toBeChecked();
  });
});

test.describe('the executive simulation without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('reads as a casebook: the brief, the evidence with its answers, and the worked example with its debrief', async ({ page }) => {
    await page.goto(SIM);
    await expect(page.locator('.ex-casebook-note')).toBeVisible();
    await expect(page.locator('#brief .bb-brief__story p').first()).toBeVisible();
    await expect(page.locator('.ex-stage')).toHaveCount(10);
    for (const st of ['finance', 'causes', 'market', 'operations', 'people', 'strategy', 'allocate', 'implement', 'evaluate']) await expect(page.locator(`#stage-${st}`)).toBeVisible();
    await expect(page.locator('.ex-card')).toHaveCount(11);
    await expect(page.locator('.ex-strat')).toHaveCount(4);
    await expect(page.locator('.ex-walk .ex-year')).toHaveCount(3);
    await expect(page.locator('.ex-walkeval .bb-score')).toHaveCount(7);
    await expect(page.locator('.ex-walkdebrief .ex-compare tbody tr')).toHaveCount(5);
    await expect(page.locator('[data-debrief-body]')).toBeVisible();
    await expect(page.locator('[data-roles]')).toBeHidden();
    const buttons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.getBoundingClientRect().width > 0).length);
    expect(buttons, 'visible buttons without JavaScript').toBe(0);
  });

  test('the Boardroom index introduces the executive simulation in a section of its own, beside the unchanged scenarios', async ({ page }) => {
    await page.goto('/boardroom/');
    await expect(page.locator('section[aria-labelledby="companies-h"] .bb-paper')).toHaveCount(3);
    const section = page.locator('#executive');
    await expect(section).toBeVisible();
    await expect(section.locator('h2')).toContainText('The executive simulation');
    await expect(section.locator('a[href="/boardroom/executive/"]').first()).toBeVisible();
  });
});
