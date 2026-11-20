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
  await page.goto('/tutorials/');
  await expect(page.locator('.mega.is-current > summary')).toContainText('Discover');
  await expect(page.locator('a.hdr-btn--cta[href="/tutorials/"]')).toHaveAttribute('aria-current', 'page');
  await page.goto('/advanced/');
  await expect(page.locator('.mega.is-current > summary')).toContainText('Discover');
});

test('the Tutorials button is in the header on wide screens, and first in the drawer on small ones', async ({ page, isMobile }) => {
  await page.goto('/');
  if (!isMobile) {
    await expect(page.locator('a.hdr-btn--cta[href="/tutorials/"]')).toBeVisible();
    return;
  }
  const drawer = page.locator('[data-drawer]');
  await drawer.locator('summary').first().click();
  await expect(drawer.locator('.drawer__tutorials')).toBeVisible();
  await drawer.locator('.drawer__tutorials').click();
  await expect(page).toHaveURL(/\/tutorials\/$/);
});

test('the five groups, Explore, Practise, Tools, Assess and Discover, fit the header at the narrowest wide-screen width', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.mega-nav')).toBeVisible();
  await expect(page.locator('.mega-nav__item .mega > summary')).toHaveText([/Explore/, /Practise/, /Tools/, /Assess/, /Discover/]);
  // The Academic Ecosystem lives in the Discover panel, not in the bar.
  await page.locator('.mega--discover > summary').click();
  await expect(page.locator('.mega--discover .mega__feature a[target="_blank"]')).toHaveCount(2);
  const overflow = await page.evaluate(() => {
    const bar = document.querySelector('.site-header__bar')!;
    return bar.scrollWidth - bar.clientWidth;
  });
  expect(overflow, 'the header bar does not overflow').toBeLessThanOrEqual(0);
  const tools = await page.locator('.site-header__tools').boundingBox();
  expect(tools && tools.x + tools.width).toBeLessThanOrEqual(1024);
  await context.close();
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
  await expect(drawer.locator('.drawer__search input[type="search"]')).toBeVisible();
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

test('the header search suggests as you type, forgives a slip and opens the full results on Enter', async ({ page, isMobile }) => {
  await page.goto('/topics/cash-flow/');
  await page.goto('/glossary/');
  const panel = page.locator('[data-hsearch]');
  await panel.locator('summary').click();
  const box = page.locator('#hsearch-q');
  await expect(box).toBeFocused();
  // With the box empty, the pages this browser opened most recently.
  await expect(page.locator('[data-hs-recent-list] a').first()).toContainText('Cash flow');
  await box.fill('liqudity');
  await expect(page.locator('[data-hs-list] a').first()).toBeVisible();
  await expect(page.locator('[data-hs-list]')).toContainText(/liquidity/i);
  await expect(page.locator('[data-hs-status]')).toContainText('close spelling');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-hs-list] a').first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(box).toBeFocused();
  await box.fill('gearing ratio');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/search\/\?q=gearing\+ratio/);
  if (!isMobile) {
    await page.locator('[data-hsearch] summary').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-hsearch]')).not.toHaveAttribute('open', '');
  }
});

test('the search page ranks every kind together and offers close spellings when nothing matches', async ({ page }) => {
  await page.goto('/search/?q=liquidity');
  await expect(page.locator('[data-best]')).toBeVisible();
  await expect(page.locator('[data-best-list] a').first()).toHaveText('Liquidity');
  await page.goto('/search/?q=liqudity');
  await expect(page.locator('[data-none]')).toBeVisible();
  await expect(page.locator('[data-close-list] a').filter({ hasText: /^Liquidity$/ })).toHaveCount(1);
  await page.locator('#q').press('ArrowDown');
  await expect(page.locator('[data-close-list] a').first()).toBeFocused();
});
