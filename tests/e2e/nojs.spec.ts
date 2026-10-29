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
