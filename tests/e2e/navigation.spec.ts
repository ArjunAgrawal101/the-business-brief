import { expect, test } from '@playwright/test';

test('the skip link moves focus to the main content', async ({ page }) => {
  await page.goto('/topics/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('the current section is marked in the navigation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The primary navigation is in the menu on small screens.');
  await page.goto('/finance-desk/break-even/');
  await expect(page.locator('header a[aria-current="page"], header a[aria-current="true"]').first()).toHaveText(/Finance Desk/);
});

test('the menu lists every room, opens, closes with Escape and returns focus', async ({ page, isMobile }) => {
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  await expect(toggle).toHaveAccessibleName(isMobile ? 'Menu' : 'All rooms');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('#menu-panel');
  await expect(panel).toBeVisible();
  const rooms = panel.locator('.rooms-menu__item');
  await expect(rooms).toHaveCount(14);
  // A planned room is listed, but is not a link that leads nowhere.
  await expect(panel.locator('.rooms-menu__item.is-planned a')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the SL switch hides HL-only material with a notice, and is remembered', async ({ page }) => {
  await page.goto('/topics/costs-and-revenues/');
  const hlBlock = page.locator('.block[data-level="HL"]').first();
  await expect(hlBlock).toBeVisible();
  await page.locator('[data-level-switch] label:has(input[value="SL"])').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-level', 'SL');
  await expect(hlBlock).toBeHidden();
  await expect(page.locator('.hl-notice').first()).toBeVisible();
  await page.goto('/topics/leadership-and-management/');
  await expect(page.locator('html')).toHaveAttribute('data-level', 'SL');
  await page.locator('[data-level-switch] label:has(input[value="HL"])').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-level', 'HL');
});

test('search filters as you type and keeps the query in the address', async ({ page }) => {
  await page.goto('/search/');
  const box = page.locator('#q');
  await expect(box).toBeVisible();
  await box.fill('break-even');
  await expect(page.locator('[data-count]')).toContainText('result');
  await expect(page.locator('[data-entry]:visible').first()).toContainText(/break-even/i);
  expect(page.url()).toContain('q=break-even');
  await page.goto('/search/?q=franchising');
  await expect(page.locator('#q')).toHaveValue('franchising');
  await box.fill('zzzzqqq');
  await expect(page.locator('[data-none]')).toBeVisible();
});
