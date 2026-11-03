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
  test.skip(isMobile, 'On small screens the groups are in the drawer, tested below.');
  await page.goto('/mindmaps/');
  await expect(page.locator('.mega.is-current > summary')).toContainText('Explore');
  await expect(page.locator('.mega-nav a[aria-current="page"]')).toContainText('Mindmaps');
  await page.goto('/assessment/paper-2/');
  await expect(page.locator('.mega.is-current > summary')).toContainText('Assess');
  await expect(page.locator('.mega-nav a[aria-current="page"]')).toContainText('Paper 2');
  await page.goto('/glossary/break-even-quantity/');
  await expect(page.locator('.mega.is-current > summary')).toContainText('Explore');
  await expect(page.locator('.mega-nav a[aria-current="true"]')).toContainText('Glossary');
});

test('the mega menu opens one group at a time and closes with Escape, returning focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The mega menu is for wide screens; the drawer is tested below.');
  await page.goto('/');
  const tools = page.locator('.mega--tools');
  const assess = page.locator('.mega--assess');
  await tools.locator('summary').click();
  await expect(tools).toHaveAttribute('open', '');
  await expect(tools.locator('.mega__panel')).toBeVisible();
  await expect(tools.locator('.mega__links a')).toHaveCount(await tools.locator('.mega__links li').count());
  await assess.locator('summary').click();
  await expect(assess).toHaveAttribute('open', '');
  await expect(tools).not.toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(assess).not.toHaveAttribute('open', '');
  await expect(assess.locator('summary')).toBeFocused();
});

test('the drawer holds every group on small screens and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The drawer replaces the mega menu on small screens.');
  await page.goto('/finance-desk/');
  const drawer = page.locator('[data-drawer]');
  const toggle = drawer.locator('summary').first();
  await expect(toggle).toHaveAccessibleName('Menu');
  await toggle.click();
  await expect(drawer).toHaveAttribute('open', '');
  await expect(drawer.locator('.drawer__group')).toHaveCount(5);
  // The current group opens with the drawer, its page marked.
  await expect(drawer.locator('.drawer__group.is-current')).toHaveAttribute('open', '');
  await expect(drawer.locator('a[aria-current="page"]')).toContainText('Finance Desk');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toHaveAttribute('open', '');
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
