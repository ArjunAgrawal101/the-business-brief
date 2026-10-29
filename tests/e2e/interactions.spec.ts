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

test.describe('Market Studio', () => {
  test('the market share workspace catches rising sales with a falling share', async ({ page }) => {
    await page.goto('/market-studio/');
    await ready(page, '[data-ix="market-share"]');
    const ws = page.locator('[data-ix="market-share"]');
    await expect(ws.locator('[data-figures]')).toContainText('10.0%');
    await expect(ws.locator('[data-interp]')).toContainText('its share fell from 18.0% to 17.5%');
    await expect(ws.locator('[data-interp]')).toContainText('Growing sales are not the same as a growing share');
    await ws.locator('[data-scenario="flat"]').click();
    await expect(ws.locator('[data-scenario="flat"]')).toHaveAttribute('aria-pressed', 'true');
    // 7,680 of an unchanged 40,000 is 19.2%
    await expect(ws.locator('[data-interp]')).toContainText('its share rose from 18.0% to 19.2%');
    await ws.locator('input[name="barro-now"]').fill('-5');
    await expect(ws.locator('input[name="barro-now"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(ws.locator('[data-err="barro-now"]')).toContainText('cannot be negative');
    await ws.locator('[data-reset]').click();
    await expect(ws.locator('input[name="barro-now"]')).toHaveValue('7680');
    await expect(ws.locator('[data-working-share]')).toContainText('7,680 ÷ 44,000 × 100');
  });

  test('the position map redraws for new axes and checks the gap', async ({ page }) => {
    await page.goto('/market-studio/');
    await ready(page, '[data-ix="position-map"]');
    const pm = page.locator('[data-ix="position-map"]');
    await pm.locator('label[data-value="high-low"]').click();
    await pm.locator('[data-check]').click();
    await expect(pm.locator('[data-feedback]')).toContainText('empty for a good reason');
    await expect(pm.locator('label[data-value="high-low"]')).toHaveClass(/is-right/);
    // Design across, ease of buying up: every part of the map has a seller
    await pm.locator('[data-axis="x"]').selectOption('design');
    await pm.locator('[data-axis="y"]').selectOption('convenience');
    await expect(pm.locator('[data-head-x]')).toHaveText('Design');
    await expect(pm.locator('[data-feedback]')).toBeHidden();
    await pm.locator('label[data-value="none"]').click();
    await pm.locator('[data-check]').click();
    await expect(pm.locator('[data-feedback]')).toContainText('every part of the map has at least one seller');
    // Choosing the other axis's attribute swaps the axes rather than plotting one attribute against itself
    await pm.locator('[data-axis="x"]').selectOption('convenience');
    await expect(pm.locator('[data-axis="y"]')).toHaveValue('design');
    await page.reload();
    await ready(page, '[data-ix="position-map"]');
    await expect(pm.locator('[data-axis="x"]')).toHaveValue('convenience');
  });
});

test.describe('Operations Floor', () => {
  test('location weights change the ranking where the reading says they will', async ({ page }) => {
    await page.goto('/operations-floor/');
    await ready(page, '[data-ix="location"]');
    const loc = page.locator('[data-ix="location"]');
    await expect(loc.locator('[data-interp]')).toContainText('Site C ranks first with 117 points, 6 ahead of Site A');
    await expect(loc.locator('[data-interp]')).toContainText('at a weight of 2 on rent and running costs (now 4), Site A ranks first');
    await loc.locator('input[data-weight="rent"]').fill('2');
    await expect(loc.locator('[data-interp]')).toContainText('Site A ranks first with 105 points');
    await expect(loc.locator('[data-ranking] tr').first()).toContainText('Site A');
    await loc.locator('[data-reset]').click();
    await expect(loc.locator('[data-interp]')).toContainText('Site C ranks first with 117 points');
  });

  test('capacity utilization follows the month and validates the figures', async ({ page }) => {
    await page.goto('/operations-floor/');
    await ready(page, '[data-ix="capacity"]');
    const cp = page.locator('[data-ix="capacity"]');
    await expect(cp.locator('[data-figures]')).toContainText('53.3%');
    await cp.locator('[data-month="november"]').click();
    await expect(cp.locator('[data-month="november"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(cp.locator('[data-figures]')).toContainText('94.2%');
    await expect(cp.locator('[data-interp]')).toContainText('70 mugs of spare capacity');
    await cp.locator('input[name="output"]').fill('1300');
    await expect(cp.locator('input[name="output"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(cp.locator('[data-err="output"]')).toContainText('cannot be more than capacity');
  });

  test('the stock control chart answers its questions from the plan on screen', async ({ page }) => {
    await page.goto('/operations-floor/');
    await ready(page, '[data-ix="stock-control"]');
    const st = page.locator('[data-ix="stock-control"]');
    await st.locator('#ix-ops-stock-control-atelier-q-rol').fill('6');
    await st.locator('[data-check="rol"]').click();
    await expect(st.locator('[data-feedback="rol"]')).toContainText('leaves out the buffer');
    await st.locator('#ix-ops-stock-control-atelier-q-rol').fill('10');
    await st.locator('[data-check="rol"]').click();
    await expect(st.locator('[data-feedback="rol"]')).toContainText('Right');
    await st.locator('label[data-value="some"]').click();
    await st.locator('[data-check="buffer"]').click();
    await expect(st.locator('[data-feedback="buffer"]')).toContainText('The lowest point is 2 bags');
    await expect(st.locator('[data-scenario="rush"]')).toHaveAttribute('aria-pressed', 'true');
    // A larger buffer changes the plan, and the answer is worked out again from it
    await st.locator('input[name="buffer"]').fill('6');
    await st.locator('#ix-ops-stock-control-atelier-q-rol').fill('12');
    await st.locator('[data-check="rol"]').click();
    await expect(st.locator('[data-feedback="rol"]')).toContainText('6 + 3 × 2 = 12 bags');
  });

  test('HL tools are hidden when SL is chosen', async ({ page }) => {
    await page.goto('/operations-floor/');
    await page.locator('[data-level-switch] label:has(input[value="SL"])').first().click();
    await expect(page.locator('[data-ix="capacity"]')).toBeHidden();
    await expect(page.locator('[data-ix="stock-control"]')).toBeHidden();
    await expect(page.locator('[data-ix="location"]')).toBeVisible();
    await expect(page.locator('.hl-notice')).toBeVisible();
  });
});
