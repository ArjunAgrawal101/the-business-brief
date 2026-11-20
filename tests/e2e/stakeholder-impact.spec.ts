/**
 * The Stakeholder Impact Simulator, driven as a reader would: the worked
 * example shows all seven groups; choosing a decision and changing the
 * settings with the keyboard redraws the impact with the same rules the unit
 * tests check (more compensation helps employees and costs the owners; a
 * faster closure hurts the community more); the choice is kept in the
 * address and the evaluation on this device; and the page works on a phone
 * and without JavaScript.
 */
import { expect, test, type Page } from '@playwright/test';
import { DECISIONS } from '../../src/lib/stakeholder-impact/decisions';
import { DEFAULT_SETTINGS, DIRECTION_WORDS, GROUPS, simulate } from '../../src/lib/stakeholder-impact/model';

async function open(page: Page, query = '') {
  await page.goto(`/decision-room/stakeholder-impact/${query}`);
  const root = page.locator('[data-ix="stakeholder-impact"]');
  await expect(root).toHaveClass(/is-enhanced/);
  return root;
}

/** A group's first-year score as the bar writes it: +1.5, −2.3. */
async function firstYear(page: Page, group: string): Promise<number> {
  const t = (await page.locator(`[data-group="${group}"] .si-bar`).first().locator('.si-bar__value').textContent()) ?? '';
  return Number(t.replace('−', '-').replace('+', ''));
}

test('shows the worked example with every group, its direction, size, timescale and reason', async ({ page }) => {
  await open(page);
  const first = DECISIONS[0]!;
  const sim = simulate(first, DEFAULT_SETTINGS);
  await expect(page.locator('.si-group')).toHaveCount(GROUPS.length);
  await expect(page.locator('[data-headline]')).toHaveText(sim.headline);
  const emp = sim.results.find((r) => r.group === 'employees')!;
  await expect(page.locator('[data-group="employees"] .si-dir')).toHaveText(DIRECTION_WORDS[emp.direction]);
  await expect(page.locator('[data-group="employees"] .si-group__why')).toContainText(first.effects.employees.why);
  await expect(page.locator('[data-grid] svg')).toBeVisible();
  await expect(page.locator('[data-quads]')).toContainText('Manage closely');
  await expect(page.locator('.si-rules li')).toHaveCount(6);
});

test('more compensation reduces the harm to employees and raises the cost to owners', async ({ page }) => {
  await open(page, '?d=close-branch&mitigation=none');
  await expect(page.locator('#si-decision')).toHaveValue('close-branch');
  const empNone = await firstYear(page, 'employees');
  const ownNone = await firstYear(page, 'owners');
  // Keyboard: focus the mitigation group and move to Generous with the arrow keys.
  await page.locator('input[name="si-mitigation"][value="none"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="si-mitigation"][value="generous"]')).toBeChecked();
  await expect(page).toHaveURL(/mitigation=generous/);
  const empGen = await firstYear(page, 'employees');
  const ownGen = await firstYear(page, 'owners');
  expect(empGen).toBeGreaterThan(empNone);
  expect(ownGen).toBeLessThan(ownNone);
  await expect(page.locator('[data-group="employees"] .si-group__why')).toContainText('Generous redundancy pay and transfers to other branches soften the loss.');
  await expect(page.locator('[data-tradeoffs]')).toContainText('Generous mitigation');
});

test('a faster closure raises the harm to the community', async ({ page }) => {
  await open(page, '?d=close-branch&speed=phased');
  const phased = await firstYear(page, 'community');
  await page.locator('input[name="si-speed"][value="fast"]').check();
  const fast = await firstYear(page, 'community');
  expect(fast).toBeLessThan(phased);
  await expect(page.locator('[data-group="community"] .si-group__why')).toContainText('Doing it fast concentrates the disruption');
});

test('changing the decision redraws the brief, the scale and the prompts, and keeps the evaluation on this device', async ({ page }) => {
  await open(page);
  await page.locator('#si-decision').focus();
  await page.locator('#si-decision').selectOption('accept-takeover');
  await expect(page.locator('[data-business]')).toHaveText('Corrib Lens Works');
  await expect(page.locator('[data-scale-text]')).toContainText('sales and office work merge');
  await expect(page).toHaveURL(/d=accept-takeover/);
  await expect(page.locator('[data-prompts]')).toContainText('Job guarantees lower the price');
  await expect(page.locator('[data-status]')).toHaveText(/Accept a takeover offer at Corrib Lens Works/);
  await page.locator('[data-note]').fill('The family should accept, but only with guarantees for the staff.');
  await page.reload();
  await expect(page.locator('[data-ix="stakeholder-impact"]')).toHaveClass(/is-enhanced/);
  await expect(page.locator('#si-decision')).toHaveValue('accept-takeover');
  await expect(page.locator('[data-note]')).toHaveValue('The family should accept, but only with guarantees for the staff.');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:stakeholder-impact') ?? '{}'));
  expect(stored.decision).toBe('accept-takeover');
  expect(stored.headline).toMatch(/^Accept a takeover offer at Corrib Lens Works/);
  const html = await (await page.request.get('/privacy/')).text();
  expect(html).toContain('bb:stakeholder-impact');
});

test('opens on the decision and settings in the address, ignoring anything it does not know', async ({ page }) => {
  await open(page, '?d=raise-prices&scale=large&speed=nonsense');
  await expect(page.locator('#si-decision')).toHaveValue('raise-prices');
  await expect(page.locator('input[name="si-scale"][value="large"]')).toBeChecked();
  await expect(page.locator('input[name="si-speed"][value="standard"]')).toBeChecked();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('puts the decision first, and never scrolls sideways', async ({ page }) => {
    await open(page);
    const sel = (await page.locator('#si-decision').boundingBox())!;
    expect(sel.y + sel.height).toBeLessThanOrEqual(844);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // The groups stack: the reason sits below the verdict, not beside it.
    const verdict = (await page.locator('[data-group="employees"] .si-group__verdict').boundingBox())!;
    const why = (await page.locator('[data-group="employees"] .si-group__why').boundingBox())!;
    expect(why.y).toBeGreaterThan(verdict.y);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the worked example and its rules', async ({ page }) => {
    await page.goto('/decision-room/stakeholder-impact/');
    await expect(page.locator('.si-group')).toHaveCount(GROUPS.length);
    await expect(page.locator('#si-decision')).toBeHidden();
    await expect(page.locator('.si-nojs').first()).toBeVisible();
    await expect(page.locator('.si-rules li')).toHaveCount(6);
  });
});
