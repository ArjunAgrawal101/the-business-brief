/**
 * The Entrepreneurship and Innovation Lab's six tools, driven as a learner
 * would drive them: each recalculates, validates, announces, keeps the work
 * on this device, exports, and hands its results to the business plan.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page, ix: string) => {
  await expect(page.locator(`[data-ix="${ix}"].is-enhanced`)).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
});

test('the canvas ranks a new critical assumption first, keeps it, and saves and opens JSON', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/business-model-canvas/');
  await ready(page, 'lab-canvas');
  const tool = page.locator('[data-ix="lab-canvas"]');
  await expect(tool.locator('[data-riskiest] li').first()).toContainText('Subscribers stay about a year');
  await tool.locator('[data-add="customer-segments"]').click();
  const entry = tool.locator('[data-entries="customer-segments"] [data-entry]').last();
  await expect(entry.locator('textarea')).toBeFocused();
  await entry.locator('textarea').fill('Students in shared houses will pay for refills');
  await entry.locator('select[data-k="risk"]').selectOption('5');
  // Equal risk is broken by testing what customers want first: customer segments come before customer relationships.
  await expect(tool.locator('[data-riskiest] li').first()).toContainText('Students in shared houses');
  await expect(tool.locator('[data-board]')).toContainText('Students in shared houses');
  await entry.locator('select[data-k="kind"]').selectOption('evidence');
  await expect(entry.locator('.lab-entry__note label')).toHaveText('The evidence');
  await expect(tool.locator('[data-riskiest] li').first()).toContainText('Subscribers stay about a year');

  await page.reload();
  await ready(page, 'lab-canvas');
  await expect(tool.locator('[data-board]')).toContainText('Students in shared houses');

  const [download] = await Promise.all([page.waitForEvent('download'), tool.locator('[data-json]').click()]);
  expect(download.suggestedFilename()).toBe('refill-round-canvas.json');
  const file = await download.path();
  const json = JSON.parse(readFileSync(file, 'utf8'));
  expect(json.format).toBe('the-business-brief/business-model-canvas');
  expect(json.entries).toHaveLength(19);

  await tool.locator('[data-blank]').click();
  await expect(tool.locator('[data-riskiest]')).toContainText('No assumptions yet');
  await expect(tool.locator('[data-board] .lab-note')).toHaveCount(0);

  await tool.locator('[data-file]').setInputFiles(file);
  await expect(tool.locator('[data-board] .lab-note')).toHaveCount(19);
  await expect(tool.locator('[data-status]')).toContainText('Opened Refill Round');
});

test('the start-up cost calculator recalculates the runway, validates and exports CSV', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/start-up-costs/');
  await ready(page, 'lab-costs');
  const tool = page.locator('[data-ix="lab-costs"]');
  await expect(tool.locator('[data-figures]')).toContainText('5 months');
  await expect(tool.locator('[data-figures]')).toContainText('$4,275');
  await tool.locator('[data-field="contribution"]').fill('3000');
  await expect(tool.locator('[data-figures]')).toContainText('24+ months');
  await expect(tool.locator('[data-figures]')).toContainText('None');
  await expect(tool.locator('[data-chart] svg')).toHaveAttribute('role', 'img');

  const amount = tool.locator('[data-lines="monthly"] [data-k="amount"]').first();
  await amount.fill('-5');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(tool.locator('[data-err="monthly:rent:amount"]')).toHaveText('An amount cannot be negative.');
  await amount.fill('1150');
  await expect(amount).not.toHaveAttribute('aria-invalid', 'true');

  await tool.locator('[data-add="oneOff"]').click();
  const line = tool.locator('[data-lines="oneOff"] [data-line]').last();
  await expect(line.locator('[data-k="label"]')).toBeFocused();
  await line.locator('[data-k="label"]').fill('Second washing machine');
  await line.locator('[data-k="amount"]').fill('2800');
  await expect(tool.locator('[data-total="oneOff"]')).toHaveText('$30,000');
  await line.locator('[data-remove]').click();
  await expect(tool.locator('[data-total="oneOff"]')).toHaveText('$27,200');

  const [download] = await Promise.all([page.waitForEvent('download'), tool.locator('[data-csv]').click()]);
  expect(download.suggestedFilename()).toMatch(/^start-up-cash-projection-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync(await download.path(), 'utf8').split('\n');
  expect(csv[0]).toBe('Month,Opening balance,Outgoings,Contribution,Closing balance,Closing balance with no sales');
  expect(csv[1]).toBe('1,17800.00,-5050.00,3000.00,15750.00,12750.00');
});

test('the revenue planner forecasts subscriptions and units, and switches a stream between them', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/revenue-planner/');
  await ready(page, 'lab-revenue');
  const tool = page.locator('[data-ix="lab-revenue"]');
  await expect(tool.locator('[data-figures]')).toContainText('$106,081');
  await expect(tool.locator('[data-figures]')).toContainText('529');
  await tool.locator('[data-stream="subscription"] [data-k="churn"]').fill('16');
  await expect(tool.locator('[data-figures]')).not.toContainText('$106,081');
  await expect(tool.locator('[data-sens]')).toContainText('Churn doubled');

  await tool.locator('[data-add]').click();
  await expect(tool.locator('[data-stream]')).toHaveCount(4);
  await expect(tool.locator('[data-add]')).toBeDisabled();
  const fresh = tool.locator('[data-stream]').last();
  await fresh.locator('[data-k="label"]').fill('Café wholesale');
  await fresh.locator('select[data-k="kind"]').selectOption('subscription');
  await expect(fresh.locator('[data-kind-fields="subscription"]')).toBeVisible();
  await expect(fresh.locator('[data-kind-fields="units"]')).toBeHidden();
  await fresh.locator('[data-kind-fields="subscription"] [data-k="price"]').fill('40');
  await fresh.locator('[data-kind-fields="subscription"] [data-k="joining"]').fill('2');
  await expect(tool.locator('[data-table]')).toContainText('Café wholesale');
  await expect(tool.locator('[data-legend]')).toContainText('Café wholesale');
});

test('the unit economics calculator runs the scenarios and shows every working', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/unit-economics/');
  await ready(page, 'lab-unit');
  const tool = page.locator('[data-ix="lab-unit"]');
  await expect(tool.locator('[data-figures]')).toContainText('4.7 to 1');
  await tool.locator('[data-scenario="churn-doubles"]').click();
  await expect(tool.locator('[data-scenario="churn-doubles"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(tool.locator('[data-field="churn"]')).toHaveValue('16');
  await expect(tool.locator('[data-figures]')).toContainText('2.3 to 1');
  await expect(tool.locator('[data-working="ltv"]')).toContainText('$93.13');
  await expect(tool.locator('[data-status]')).toContainText('$93.13');
  await tool.locator('[data-field="customers"]').fill('0');
  await expect(tool.locator('[data-field="customers"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(tool.locator('[data-err="customers"]')).toContainText('at least one');
  await tool.locator('[data-reset]').click();
  await expect(tool.locator('[data-figures]')).toContainText('4.7 to 1');
});

test('the feasibility assessment flags a failed must-have and re-ranks on the weights', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/feasibility/');
  await ready(page, 'lab-feasibility');
  const tool = page.locator('[data-ix="lab-feasibility"]');
  await expect(tool.locator('[data-ranking] tr').first()).toContainText('Refill Round');
  await expect(tool.locator('[data-impl]')).toContainText('Office refills would rank first instead');
  await tool.locator('select[data-score="refill-round"][data-crit="pay"]').selectOption('1');
  await expect(tool.locator('[data-ranking] tr', { hasText: 'Refill Round' })).toContainText('Fix a must-have first');
  await tool.locator('select[data-score="refill-round"][data-crit="pay"]').selectOption('3');
  await tool.locator('[data-idea="office-refills"] [data-k="name"]').fill('Office contracts');
  await expect(tool.locator('[data-ranking]')).toContainText('Office contracts');
  await expect(tool.locator('label', { hasText: 'Office contracts' }).first()).toBeVisible();
  await tool.locator('[data-mark]').selectOption('75');
  await expect(tool.locator('[data-ranking] tr', { hasText: 'Refill Round' })).toContainText('Below the pass mark');
});

test('the business plan counts progress, quotes the other tools and exports Markdown', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/unit-economics/');
  await ready(page, 'lab-unit');
  // Nothing is offered to the plan until the learner changes something.
  await page.goto('/entrepreneurship-lab/business-plan/');
  await ready(page, 'lab-plan');
  await expect(page.locator('[data-figs="model"]')).toBeHidden();
  await page.goto('/entrepreneurship-lab/unit-economics/');
  await ready(page, 'lab-unit');
  await page.locator('[data-field="churn"]').fill('10');

  await page.goto('/entrepreneurship-lab/business-plan/');
  await ready(page, 'lab-plan');
  const tool = page.locator('[data-ix="lab-plan"]');
  await expect(tool.locator('[data-figs="model"]')).toBeVisible();
  await expect(tool.locator('[data-figs="model"]')).toContainText('for about 10.0 months');
  await tool.locator('[data-title]').fill('Refill Round plan');
  await tool.locator('[data-section="summary"]').fill('Refills to the door, every month, with no plastic thrown away.');
  await expect(tool.locator('[data-count="summary"]')).toContainText('11 words');
  await expect(tool.locator('[data-state="summary"]')).toHaveText('Started');
  await expect(tool.locator('[data-progress]')).toContainText('0 of 12 sections drafted, 11 words');

  const [download] = await Promise.all([page.waitForEvent('download'), tool.locator('[data-md]').click()]);
  expect(download.suggestedFilename()).toBe('refill-round-plan.md');
  const md = readFileSync(await download.path(), 'utf8');
  expect(md).toContain('# Refill Round plan');
  expect(md).toContain('## 1. Executive summary\n\nRefills to the door');
  expect(md).toContain('**From the Lab tools**');
  expect(md).toContain('*Not written yet. Questions to answer:*');

  await page.reload();
  await ready(page, 'lab-plan');
  await expect(tool.locator('[data-section="summary"]')).toHaveValue(/Refills to the door/);
});

test('the Lab home links every briefing and tool, and lists the room among all rooms', async ({ page }) => {
  await page.goto('/entrepreneurship-lab/');
  await expect(page.locator('h1')).toHaveText('Entrepreneurship and Innovation Lab');
  await expect(page.locator('.lab-route__station')).toHaveCount(6);
  await expect(page.locator('.lab-pin')).toHaveCount(6);
  await expect(page.locator('.lab-pin').first()).toContainText('70%');
  await page.goto('/rooms/');
  await expect(page.locator('#room-entrepreneurship-lab a')).toHaveAttribute('href', '/entrepreneurship-lab/');
});
