/**
 * The Financial Laboratory in the browser: results follow the typing, the live
 * region waits for a pause, errors sit beside their fields, lines and years
 * can be added and removed, figures travel by link, and without JavaScript
 * each page still shows its full worked example.
 */
import { expect, test } from '@playwright/test';

const hero = '.lab-hero__value';

test('break-even quantity updates as the reader types, and announces calmly', async ({ page }) => {
  await page.goto('/finance-desk/lab/break-even-quantity/');
  await expect(page.locator(hero)).toHaveText('3,021 bags a month');
  await expect(page.locator('[data-status]')).toHaveText('');
  await page.fill('input[name="price"]', '30');
  await expect(page.locator(hero)).toHaveText('1,859 bags a month');
  await expect(page.locator('[data-status]')).toContainText('Break-even quantity 1,859 bags', { timeout: 4000 });
  await expect(page.locator('[data-source]')).toHaveText('Your own figures.');
});

test('a blank or impossible figure is explained beside its field', async ({ page }) => {
  await page.goto('/finance-desk/lab/break-even-quantity/');
  await page.fill('input[name="price"]', '');
  await expect(page.locator('[data-err="price"]')).toHaveText('Enter a number for the selling price.');
  await expect(page.locator('input[name="price"]')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('input[name="price"]', '10');
  await expect(page.locator(hero)).toHaveText('No break-even point');
  await page.click('[data-act="reset"]');
  await expect(page.locator(hero)).toHaveText('3,021 bags a month');
  await expect(page.locator('input[name="price"]')).toHaveAttribute('aria-invalid', 'false');
});

test('the reader’s own words for units, period and currency', async ({ page }) => {
  await page.goto('/finance-desk/lab/contribution/');
  await page.click('.lab-settings > summary');
  await page.selectOption('[data-setting="currency"]', '£');
  await page.fill('[data-setting="unit"]', 'loaf');
  await page.fill('[data-setting="units"]', 'loaves');
  await expect(page.locator('.lab-hero__label')).toHaveText('Contribution per loaf');
  await expect(page.locator(hero)).toHaveText('£9.60');
});

test('figures travel by link to another calculator', async ({ page }) => {
  await page.goto('/finance-desk/lab/break-even-quantity/?quantity=4000');
  await expect(page.locator('input[name="quantity"]')).toHaveValue('4000');
  await page.goto('/finance-desk/lab/margin-of-safety/?quantity=4000');
  await expect(page.locator(hero)).toHaveText('979 bags');
});

test('the cash flow forecast grows and shrinks', async ({ page }) => {
  await page.goto('/finance-desk/lab/cash-flow-forecast/');
  await expect(page.locator(hero)).toHaveText('−$25,700.00');
  await page.click('[data-act="add-inflow"]');
  const name = await page.evaluate(() => document.activeElement?.getAttribute('name') ?? '');
  expect(name).toMatch(/\.label$/);
  await page.fill(`input[name="${name.replace('.label', '.m2')}"]`, '20000');
  await expect(page.locator(hero)).toHaveText('−$14,000.00');
  await page.selectOption('select[name="months"]', '12');
  await expect(page.locator('.cff thead th.n')).toHaveCount(12);
  await page.fill('input[name="out-1.m0"]', '-5');
  await expect(page.locator('[data-err-list]')).toContainText('positive amount');
});

test('budget lines and project years can be added and removed', async ({ page }) => {
  await page.goto('/finance-desk/lab/budget-variances/');
  await page.click('[data-act="add-cost"]');
  const id = (await page.evaluate(() => document.activeElement?.getAttribute('name') ?? '')).split('.')[0];
  await page.fill(`input[name="${id}.actual"]`, '3000');
  await expect(page.locator(hero)).toHaveText('$10,050 [A]');
  await page.click(`[data-act="remove-line"][data-line="${id}"]`);
  await expect(page.locator(hero)).toHaveText('$7,050 [A]');

  await page.goto('/finance-desk/lab/net-present-value/');
  await page.selectOption('select[name="rate"]', '10');
  await expect(page.locator(hero)).toHaveText('−$1,096.40');
  await page.click('[data-act="add-year"]');
  await expect(page.locator('input[name="r6"]')).toBeVisible();
  await page.click('[data-act="remove-year"]');
  await expect(page.locator('input[name="r6"]')).toHaveCount(0);
});

test('the CSV export holds the figures and the results', async ({ page }) => {
  await page.goto('/finance-desk/lab/gross-profit-margin/');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="csv"]')]);
  expect(download.suggestedFilename()).toBe('gross-profit-margin.csv');
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(path, 'utf8');
  expect(text).toContain('Gross profit margin, latest year');
  expect(text).toContain('43.5232');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('each calculator shows its full worked example and says the inputs need JavaScript', async ({ page }) => {
    for (const path of ['/finance-desk/lab/margin-of-safety/', '/finance-desk/lab/cash-flow-forecast/', '/finance-desk/lab/net-present-value/']) {
      await page.goto(path);
      await expect(page.locator('.lab-given')).toBeVisible();
      await expect(page.locator('.lab-given__note')).toContainText('needs JavaScript');
      await expect(page.locator('.lab-form')).toBeHidden();
      await expect(page.locator('[data-act="csv"]')).toBeHidden();
      await expect(page.locator('.lab-workings .working').first()).toBeVisible();
    }
  });
});
