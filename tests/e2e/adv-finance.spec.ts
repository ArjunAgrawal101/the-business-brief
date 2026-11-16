/**
 * Advanced financial analysis in the browser: each tool answers a change,
 * explains a problem beside its field, keeps the reader's figures in this
 * browser under a declared key, resets with a confirmation, exports a CSV, and
 * reads as a complete worked example without JavaScript. The pages fit a 320
 * pixel screen, and the Finance Desk and the Financial Laboratory lead to them.
 */
import { expect, test, type Page } from '@playwright/test';

const hero = '[data-region="headline"] .fl-hero__value';
const BASE = '/finance-desk/advanced/';
const PAGES = [BASE, `${BASE}integrated-forecast/`, `${BASE}capital-budgeting/`, `${BASE}break-even-scenarios/`, `${BASE}performance-dashboard/`];

async function ready(page: Page, path: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(path);
  await expect(page.locator('[data-ix="adv-finance"]')).toHaveAttribute('data-ready', 'true');
  return errors;
}

/** Everything kept in this browser must be declared on the privacy page. */
async function expectDeclared(page: Page) {
  const html = await (await page.request.get('/privacy/')).text();
  const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
  expect(kept.length).toBeGreaterThan(0);
  const undeclared = kept.filter((k) => !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
  expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
}

test('the forecast follows the drivers, balances, keeps the figures and resets', async ({ page }) => {
  const errors = await ready(page, `${BASE}integrated-forecast/`);
  await expect(page.locator(hero)).toHaveText('−$14,425');
  await expect(page.locator('[data-status]')).toHaveText('');
  await page.fill('input[name="price"]', '25');
  await expect(page.locator(hero)).toHaveText('$9,053');
  await expect(page.locator('[data-status]')).toContainText('lowest year-end cash $9,053', { timeout: 4000 });
  await expect(page.locator('[data-source]')).toHaveText('Your own figures.');
  await expect(page.locator('[data-region="figures"]')).toContainText('Balances every year');
  await expect(page.locator('[data-region="figures"]')).toContainText('$357,242');

  // The figures are still there after a reload, and the key is declared.
  await page.reload();
  await expect(page.locator('input[name="price"]')).toHaveValue('25');
  await expect(page.locator(hero)).toHaveText('$9,053');
  await expect(page.locator('[data-save-status]')).toContainText('earlier visit');
  await expectDeclared(page);

  // Reset asks first, then puts the example back and forgets the figures.
  await page.click('[data-act="reset"]');
  await expect(page.locator('[data-act="reset"]')).toContainText('Confirm');
  await page.click('[data-act="reset"]');
  await expect(page.locator(hero)).toHaveText('−$14,425');
  await expect(page.locator('input[name="price"]')).toHaveValue('24');
  expect(await page.evaluate(() => localStorage.getItem('bb:finance:advanced:forecast'))).toBeNull();
  expect(errors).toEqual([]);
});

test('the forecast shows any scenario with any option, and explains a problem beside its field', async ({ page }) => {
  await ready(page, `${BASE}integrated-forecast/`);
  await page.check('input[name="view.scenario"][value="upside"]');
  await expect(page.locator(hero)).toHaveText('−$389');
  await page.check('input[name="view.scenario"][value="base"]');
  await page.check('input[name="view.option"][value="b"]');
  await expect(page.locator(hero)).toHaveText('$1,969');
  await expect(page.locator('[data-region="case"]')).toContainText('Base case: Outsource the packing');
  await expect(page.locator('[data-region="bs"] caption')).toContainText('Outsource the packing');

  // A renamed alternative is named everywhere.
  await page.click('summary:has-text("Two strategic alternatives")');
  await page.fill('input[name="b.name"]', 'Use a co-packer');
  await expect(page.locator('[data-alt-name="b"]')).toHaveText('Use a co-packer');
  await expect(page.locator('[data-region="options"]')).toContainText('Use a co-packer');

  // A blank figure is explained beside its field, and the results wait for it.
  await page.fill('input[name="price"]', '');
  await expect(page.locator('[data-err="price"]')).toHaveText('Enter a number for the selling price.');
  await expect(page.locator('input[name="price"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.fl-paused')).toBeVisible();
  // A problem inside a closed group opens the group.
  await page.fill('input[name="price"]', '24');
  await page.click('summary:has-text("Working capital")');
  await page.fill('input[name="debtorDays"]', '400');
  await expect(page.locator('[data-err="debtorDays"]')).toHaveText('Debtor days must be no more than 365.');
});

test('the comparator: rate, years and projects, and the CSV', async ({ page }) => {
  const errors = await ready(page, `${BASE}capital-budgeting/`);
  await expect(page.locator(hero)).toHaveText('$49,956');
  await expect(page.locator('[data-region="figures"]')).toContainText('8.625%');

  await page.check('input[name="rateSource"][value="own"]');
  await expect(page.locator('input[name="ownRate"]')).toBeVisible();
  await page.fill('input[name="ownRate"]', '10');
  await expect(page.locator(hero)).toHaveText('$38,134');
  await expect(page.locator('[data-region="compare"]')).toContainText('−$1,093');

  // A year added to the third project, then removed again.
  await page.click('[data-act="add-year"][data-project="2"]');
  await expect(page.locator('input[name="p2.r4"]')).toBeFocused();
  await page.fill('input[name="p2.r4"]', '5000');
  await expect(page.locator('[data-region="compare"]')).toContainText('4 years');
  await page.click('[data-act="remove-year"][data-project="2"]');
  await expect(page.locator('input[name="p2.r4"]')).toHaveCount(0);

  // Three projects at most; one removed leaves two, and a third can come back.
  await expect(page.locator('[data-act="add-project"]')).toHaveAttribute('aria-disabled', 'true');
  await page.click('[data-act="remove-project"][data-project="0"]');
  await expect(page.locator('fieldset.af-project')).toHaveCount(2);
  await expect(page.locator('[data-act="remove-project"]')).toHaveCount(0);
  await page.click('[data-act="add-project"]');
  await expect(page.locator('fieldset.af-project')).toHaveCount(3);

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="csv"]')]);
  expect(download.suggestedFilename()).toBe('capital-budgeting.csv');
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(await download.path(), 'utf8');
  expect(text).toContain('Second roaster for supermarket orders: NPV');
  expect(text).toContain('Advanced financial analysis, beyond the IB course');
  await expectDeclared(page);
  expect(errors).toEqual([]);
});

test('break-even scenarios: the indifference volume moves, and the words are the reader’s', async ({ page }) => {
  await ready(page, `${BASE}break-even-scenarios/`);
  await expect(page.locator(hero)).toHaveText('3,765.6 bags a month');
  await page.fill('input[name="b.fixedCosts"]', '27000');
  await expect(page.locator(hero)).toHaveText('2,890.6 bags a month');
  await page.click('.fl-settings > summary');
  await page.fill('[data-setting="unit"]', 'loaf');
  await page.fill('[data-setting="units"]', 'loaves');
  await expect(page.locator(hero)).toHaveText('2,890.6 loaves a month');
  await expect(page.locator('label[for="af-be-price"]')).toHaveText('Selling price per loaf');
  await page.fill('input[name="forecast"]', '5000');
  await expect(page.locator('[data-err="forecast"]')).toHaveText('Forecast sales cannot be more than capacity.');
});

test('the dashboard: a year added and removed, and accounts that do not agree', async ({ page }) => {
  await ready(page, `${BASE}performance-dashboard/`);
  await expect(page.locator(hero)).toHaveText('22.1%');
  await expect(page.locator('[data-region="checks"]')).toContainText('The accounts agree');
  await page.fill('input[name="y3.cash"]', '9400');
  await expect(page.locator('[data-region="checks"]')).toContainText('does not balance');
  await page.fill('input[name="y3.cash"]', '8400');
  await expect(page.locator('[data-region="checks"]')).toContainText('The accounts agree');

  await page.click('[data-act="add-year"]');
  await expect(page.locator('input[name="y4.label"]')).toHaveValue('2026');
  await expect(page.locator('[data-region="checks"]')).toContainText('retained earnings do not follow');
  await expect(page.locator('[data-act="add-year"]')).toHaveAttribute('aria-disabled', 'true');
  await page.click('[data-act="remove-year"]');
  await expect(page.locator('input[name="y4.label"]')).toHaveCount(0);
  await expect(page.locator('[data-region="checks"]')).toContainText('The accounts agree');
});

test('saved work shows on the dashboard', async ({ page }) => {
  await ready(page, `${BASE}break-even-scenarios/`);
  await page.fill('input[name="price"]', '25');
  await expect(page.locator('[data-save-status]')).toContainText('saved at');
  await page.goto('/dashboard/');
  await expect(page.locator('main')).toContainText('Break-even scenarios');
});

test('the Finance Desk and the Financial Laboratory lead to the advanced mode, labelled beyond the course', async ({ page }) => {
  for (const path of ['/finance-desk/', '/finance-desk/lab/']) {
    await page.goto(path);
    const door = page.locator('.af-door');
    await expect(door).toContainText('Beyond the IB course');
    await expect(door.locator(`a[href="${BASE}"]`)).toBeVisible();
    await expect(door.locator('a[href^="/finance-desk/advanced/"]')).toHaveCount(5);
  }
});

test.describe('at 320 pixels', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });

  test('no advanced page scrolls sideways', async ({ page }) => {
    for (const path of [...PAGES, '/finance-desk/', '/finance-desk/lab/']) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('each tool reads as a complete worked example, labelled beyond the course', async ({ page }) => {
    for (const path of PAGES.slice(1)) {
      await page.goto(path);
      await expect(page.locator('.af-notice')).toContainText('not IB content');
      await expect(page.locator('#where-the-course-stops')).toBeVisible();
      await expect(page.locator('.fl-given')).toBeVisible();
      await expect(page.locator('.fl-given__note')).toContainText('needs JavaScript');
      await expect(page.locator('[data-af-form]')).toBeHidden();
      await expect(page.locator('[data-act="csv"]')).toBeHidden();
      await expect(page.locator('svg.chart').first()).toBeVisible();
      // No button a reader could press without the script to run it.
      const buttons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => (b as HTMLElement).getBoundingClientRect().width > 0).length);
      expect(buttons, path).toBe(0);
    }
    await page.goto(`${BASE}integrated-forecast/`);
    await expect(page.locator('[data-region="bs"] tr.af-st__final').last()).toContainText('369,224');
    await expect(page.locator('[data-region="pl"]')).toContainText('58,575');
  });
});
