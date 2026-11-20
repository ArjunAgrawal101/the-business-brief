/**
 * The Business Scenario Generator, driven as a reader would: a scenario opens
 * from its code, each step is answered with the keyboard and checked, the
 * feedback explains the verdict in words, a missing answer or a thin
 * justification is refused beside the field, a slip in the calculation is
 * named, the model answer and the summary open at the end, the results are
 * kept in bb:scenarios and come back after a reload, the filters narrow the
 * families and are kept in the address, and the page works on a phone and
 * without JavaScript.
 */
import { expect, test, type Page } from '@playwright/test';
import { FAMILIES, filtered, scenarioFor } from '../../src/lib/scenario-generator';
import type { Scenario } from '../../src/lib/scenario-generator/types';

const CODE = 'entry-route-7';
const s = scenarioFor(CODE)!;
const bestId = (q: { choices: Array<{ id: string; verdict: string }> }) => q.choices.find((c) => c.verdict === 'best')!.id;

async function open(page: Page, query = `?s=${CODE}`) {
  await page.goto(`/decision-room/scenarios/${query}`);
  const root = page.locator('[data-ix="scenario-generator"]');
  await expect(root).toHaveClass(/is-enhanced/);
  return root;
}

/** Everything kept in this browser must be declared on the privacy page. */
async function expectDeclared(page: Page) {
  const html = await (await page.request.get('/privacy/')).text();
  const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
  const undeclared = kept.filter((k) => !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
  expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
}

async function check(page: Page, step: string) {
  await page.locator(`[data-check="${step}"]`).click();
  await expect(page.locator(`[data-feedback="${step}"]`)).not.toBeEmpty();
}

/** Answers every step with the best answer except the calculation, which takes `calc`. */
async function workThrough(page: Page, sc: Scenario, calc: string) {
  await page.locator(`input[name="sg-problem"][value="${bestId(sc.problem)}"]`).check();
  await check(page, 'problem');
  for (const e of sc.evidence.exhibits.filter((x) => x.relevant)) await page.locator(`input[name="sg-evidence"][value="${e.id}"]`).check();
  await check(page, 'evidence');
  await page.locator(`input[name="sg-tool"][value="${sc.tool}"]`).check();
  await check(page, 'tool');
  if (sc.analysis.calc) await page.locator('[data-calc]').fill(calc);
  for (const it of sc.analysis.sort?.items ?? []) await page.locator(`[data-sort="${it.id}"]`).selectOption(it.answer);
  await check(page, 'analysis');
  await page.locator(`input[name="sg-recommend"][value="${bestId(sc.recommend)}"]`).check();
  await page.locator('[data-justify]').fill('The expected values are close, so the route that puts less money at risk is the better choice here.');
  await check(page, 'recommend');
  for (const k of ['stakeholders', 'risk', 'change'] as const) await page.locator(`input[name="sg-${k}"][value="${bestId(sc.evaluate[k])}"]`).check();
  await check(page, 'evaluate');
}

test.describe('a scenario, step by step', () => {
  test('opens from its code and checks each step with feedback in words', async ({ page }) => {
    await open(page);
    await expect(page.locator('#sg-title')).toHaveText(s.title);
    await expect(page.locator('.sg-head')).toContainText('Fictional');
    await expect(page.locator('.sg-pack')).toContainText('Simulated data');
    // Later steps are locked until the one before is checked.
    await expect(page.locator('[data-step="evidence"] [data-body]')).toBeHidden();
    await expect(page.locator('[data-step="evidence"] [data-locked]')).toBeVisible();
    // Checking with no answer is refused beside the button.
    await page.locator('[data-check="problem"]').click();
    await expect(page.locator('[data-msg="problem"]')).toHaveText('Choose an answer first.');
    // A choice that is not the best is explained, and the best is named.
    const weak = s.problem.choices.find((c) => c.verdict === 'weak')!;
    await page.locator(`input[name="sg-problem"][value="${weak.id}"]`).check();
    await check(page, 'problem');
    const fb = page.locator('[data-feedback="problem"]');
    await expect(fb).toContainText('Does not fit');
    await expect(fb).toContainText(weak.why);
    await expect(fb).toContainText('The best answer:');
    await expect(fb).toBeFocused();
    // The step is locked, and the next one opens.
    await expect(page.locator(`input[name="sg-problem"][value="${weak.id}"]`)).toBeDisabled();
    await expect(page.locator('[data-step="evidence"] [data-body]')).toBeVisible();
  });

  test('is worked with the keyboard alone', async ({ page }) => {
    await open(page);
    const first = page.locator('input[name="sg-problem"]').first();
    await first.focus();
    await page.keyboard.press('Space');
    await expect(first).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('input[name="sg-problem"]').nth(1)).toBeChecked();
    await page.locator('[data-check="problem"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-feedback="problem"]')).toBeFocused();
    await expect(page.locator('[data-feedback="problem"]')).toContainText(/Best fit|Partly fits|Does not fit/);
    // The evidence: tick a box with the space bar.
    const box = page.locator('input[name="sg-evidence"]').first();
    await box.focus();
    await page.keyboard.press('Space');
    await expect(box).toBeChecked();
  });

  test('names a slip in the calculation, refuses a thin justification, and opens the model answer and the summary at the end', async ({ page }) => {
    await open(page);
    await page.evaluate(() => localStorage.removeItem('bb:scenarios'));
    await page.reload();
    await expect(page.locator('[data-ix="scenario-generator"]')).toHaveClass(/is-enhanced/);
    // A figure that is not a number is refused beside the field.
    await page.locator(`input[name="sg-problem"][value="${bestId(s.problem)}"]`).check();
    await check(page, 'problem');
    for (const e of s.evidence.exhibits.filter((x) => x.relevant)) await page.locator(`input[name="sg-evidence"][value="${e.id}"]`).check();
    await check(page, 'evidence');
    await page.locator(`input[name="sg-tool"][value="${s.tool}"]`).check();
    await check(page, 'tool');
    await page.locator('[data-calc]').fill('about four hundred thousand');
    await page.locator('[data-check="analysis"]').click();
    await expect(page.locator('[data-msg="analysis"]')).toContainText('Enter a number');
    await expect(page.locator('[data-calc]')).toHaveAttribute('aria-invalid', 'true');
    // Forgetting the cost is named as a slip: 0.6 x 1,250,000 + 0.4 x 140,000 = 806,000.
    await page.locator('[data-calc]').fill('806,000');
    await check(page, 'analysis');
    await expect(page.locator('[data-feedback="analysis"]')).toContainText('did not subtract the cost');
    await expect(page.locator('[data-feedback="analysis"]')).toContainText('The working');
    // The justification must be at least eight words.
    await page.locator(`input[name="sg-recommend"][value="${bestId(s.recommend)}"]`).check();
    await page.locator('[data-justify]').fill('Lower risk.');
    await page.locator('[data-check="recommend"]').click();
    await expect(page.locator('[data-msg="recommend"]')).toContainText('at least 8 words');
    await expect(page.locator('[data-justify]')).toBeFocused();
    await page.locator('[data-justify]').fill('The expected values are close, so the route that puts less money at risk is better.');
    await check(page, 'recommend');
    await expect(page.locator('[data-feedback="recommend"]')).toContainText('A strong one:');
    await expect(page.locator('[data-end-body]')).toBeHidden();
    for (const k of ['stakeholders', 'risk', 'change'] as const) await page.locator(`input[name="sg-${k}"][value="${bestId(s.evaluate[k])}"]`).check();
    await check(page, 'evaluate');
    // The end: the model answer outline and the summary by step.
    await expect(page.locator('[data-end-body]')).toBeVisible();
    await expect(page.locator('.sg-model__row')).toHaveCount(6);
    const summary = page.locator('[data-summary]');
    await expect(summary.locator('tbody tr')).toHaveCount(6);
    await expect(summary).toContainText('Partly fits');
    await expect(summary).toContainText('Best fit');
    // Kept in bb:scenarios, and back after a reload.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:scenarios') ?? '{}'));
    expect(stored.items[0].code).toBe(CODE);
    expect(stored.items[0].checked).toHaveLength(6);
    expect(stored.items[0].verdicts.analysis).toBe('fair');
    await expectDeclared(page);
    await page.reload();
    await expect(page.locator('[data-ix="scenario-generator"]')).toHaveClass(/is-enhanced/);
    await expect(page.locator('[data-end-body]')).toBeVisible();
    await expect(page.locator('.sg-step.is-done')).toHaveCount(6);
    await expect(page.locator('[data-record]')).toContainText(s.title);
    // Starting again clears this scenario's answers.
    await page.locator('[data-restart]').click();
    await expect(page.locator('.sg-step.is-done')).toHaveCount(0);
    await expect(page.locator('[data-end-body]')).toBeHidden();
  });

  test('works a quantitative scenario through to the end with the right answers', async ({ page }) => {
    const sc = scenarioFor('two-machines-12')!;
    await open(page, '?s=two-machines-12');
    await workThrough(page, sc, String(sc.analysis.calc!.answer));
    await expect(page.locator('[data-summary]')).not.toContainText('Does not fit');
    await expect(page.locator('[data-summary] .sg-summary__v--right')).toHaveCount(6);
  });
});

test.describe('generating and filtering', () => {
  test('filters the families by unit, subtopic and tool, keeps them in the address, and generates a matching scenario', async ({ page }) => {
    await open(page);
    await page.locator('#sg-unit').selectOption('5');
    const n5 = filtered({ unit: '5' }).length;
    await expect(page.locator('[data-count]')).toHaveText(`${n5} of ${FAMILIES.length} families match`);
    await expect(page).toHaveURL(/unit=5/);
    await expect(page.locator('[data-family]:visible')).toHaveCount(n5);
    await page.locator('#sg-tool').selectOption('decision-trees');
    const both = filtered({ unit: '5', tool: 'decision-trees' });
    await expect(page.locator('[data-count]')).toHaveText(`${both.length} of ${FAMILIES.length} families match`);
    await page.locator('[data-new]').click();
    await expect(page).toHaveURL(new RegExp(`s=(${both.map((f) => f.id).join('|')})-\\d+`));
    const code = new URL(page.url()).searchParams.get('s')!;
    await expect(page.locator('#sg-title')).toHaveText(scenarioFor(code)!.title);
    // Another version of the same case: the same family, a new seed.
    await page.locator('[data-variant]').click();
    await expect(page).not.toHaveURL(new RegExp(`s=${code}(&|$)`));
    expect(new URL(page.url()).searchParams.get('s')!.startsWith(code.replace(/-\d+$/, '-'))).toBe(true);
    // No family for a unit and a tool that never meet.
    await page.locator('#sg-unit').selectOption('1');
    await page.locator('#sg-tool').selectOption('gantt-chart');
    await expect(page.locator('[data-count]')).toHaveText(`0 of ${FAMILIES.length} families match`);
    await expect(page.locator('[data-none]')).toBeVisible();
    await expect(page.locator('[data-new]')).toBeDisabled();
  });

  test('opens a scenario from the address after a reload, and says so when a code is unknown', async ({ page }) => {
    await open(page, '?s=defect-rate-321');
    await expect(page.locator('#sg-title')).toHaveText(scenarioFor('defect-rate-321')!.title);
    await page.reload();
    await expect(page.locator('#sg-title')).toHaveText(scenarioFor('defect-rate-321')!.title);
    await open(page, '?s=no-such-case-12');
    await expect(page.locator('[data-bar-msg]')).toContainText('There is no scenario with the code');
    await expect(page.locator('#sg-title')).toHaveText(scenarioFor(`${FAMILIES[0]!.id}-1`)!.title);
  });

  test('offers the link to share', async ({ page }) => {
    await open(page);
    await page.locator('[data-share]').click();
    await expect(page.locator('[data-bar-msg]')).toContainText(`s=${CODE}`);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('puts the controls in the first screen, stacks the steps and never scrolls sideways', async ({ page }) => {
    await open(page);
    const gen = await page.locator('[data-new]').boundingBox();
    expect(gen).not.toBeNull();
    expect(gen!.y + gen!.height).toBeLessThanOrEqual(844);
    expect((await page.locator('#sg-unit').boundingBox())!.y).toBeLessThan(844);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.locator(`input[name="sg-problem"][value="${bestId(s.problem)}"]`).check();
    await check(page, 'problem');
    const a = (await page.locator('input[name="sg-evidence"]').nth(0).boundingBox())!;
    const b = (await page.locator('input[name="sg-evidence"]').nth(1).boundingBox())!;
    expect(b.y).toBeGreaterThan(a.y);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('reads as one worked scenario with every answer explained', async ({ page }) => {
    await page.goto('/decision-room/scenarios/');
    await expect(page.locator('#sg-title')).toBeVisible();
    await expect(page.locator('.sg-why').first()).toBeVisible();
    await expect(page.locator('.sg-why')).toHaveCount(6);
    await expect(page.locator('[data-check]').first()).toBeHidden();
    await expect(page.locator('[data-bar]')).toBeHidden();
    await expect(page.locator('[data-end-body]')).toBeVisible();
    await expect(page.locator('.sg-nojs')).toBeVisible();
  });
});
