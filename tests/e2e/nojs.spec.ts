/** Without JavaScript every page still teaches: answers are in disclosures and every choice shows what happens. */
import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('a topic brief is complete without JavaScript', async ({ page }) => {
  await page.goto('/topics/costs-and-revenues/');
  await expect(page.locator('.working').first()).toBeVisible();
  await expect(page.locator('[data-key]').first()).toBeVisible();
  await expect(page.locator('[data-check]').first()).toBeHidden();
  await expect(page.locator('svg.chart').first()).toBeVisible();
});

test('a Decision Room reads as a case study without JavaScript', async ({ page }) => {
  await page.goto('/decision-room/marigold-growth/');
  await expect(page.locator('.dr-peek').first()).toBeVisible();
  await expect(page.locator('[data-commit]').first()).toBeHidden();
  await expect(page.locator('[data-debrief-body]')).toBeVisible();
  await expect(page.locator('.dr-choice__after').first()).toContainText('After:');
});

test('search lists every entry without JavaScript', async ({ page }) => {
  await page.goto('/search/');
  await expect(page.locator('[data-entry]').first()).toBeVisible();
  await expect(page.locator('[data-search-form]')).toBeHidden();
});

test('no page shows a button that needs a script it cannot run', async ({ page }) => {
  test.setTimeout(180_000);
  const { builtPages } = await import('./pages');
  const offenders: string[] = [];
  for (const path of builtPages()) {
    await page.goto(path);
    const visible = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => b.type !== 'submit' && b.type !== 'reset')
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden';
        })
        .map((b) => (b.textContent ?? '').trim().slice(0, 40)),
    );
    if (visible.length) offenders.push(`${path}: ${visible.join(', ')}`);
  }
  expect(offenders).toEqual([]);
});

test('the cash flow lab and the case lab read in full without JavaScript', async ({ page }) => {
  await page.goto('/finance-desk/cash-flow/');
  await expect(page.locator('tr.cff__closing td').nth(2)).toHaveText('(5,290.80)');
  await expect(page.locator('[data-key]').first()).toBeVisible();
  await page.goto('/case-room/halden-diagnosis/');
  for (const id of ['problem', 'cause', 'strategy', 'implementation', 'evaluation']) await expect(page.locator(`[data-stage="${id}"] [data-body]`)).toBeVisible();
  await expect(page.locator('[data-plan-chart] svg')).toBeVisible();
});
