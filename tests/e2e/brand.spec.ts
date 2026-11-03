/**
 * The opening: it plays on every fresh entry to the site (a new tab, a new
 * browser, a link from elsewhere, a reload), never between the site's own
 * pages, finishes by itself in about five seconds, can be skipped by button,
 * key, click or tap, never traps the keyboard or hides the page from screen
 * readers, and becomes a still card under reduced motion.
 *
 * Browsers under automation skip it (navigator.webdriver), so the rest of the
 * suite sees pages as readers do once it has gone. These tests present the
 * browser as an ordinary one, so the real rule is tested.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
});

const playing = (page: Page) => expect(page.locator('html')).toHaveClass(/\bcx-on\b/);
const notPlaying = (page: Page) => expect(page.locator('html')).not.toHaveClass(/\bcx-on\b/);

test('plays on a fresh entry and again on the next one, with nothing stored', async ({ page }) => {
  await page.goto('/');
  await playing(page);
  await expect(page.locator('html')).toHaveClass(/\bcx-full\b/);
  await expect(page.locator('.cx')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeVisible();
  // An old "seen" flag from an earlier version changes nothing.
  await page.evaluate(() => localStorage.setItem('bb:intro-seen', '2026-11-02'));
  await page.goto('/glossary/');
  await playing(page);
});

test('the Skip intro button ends it at once and the page is usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 1500 });
  await notPlaying(page);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main#main')).not.toHaveAttribute('inert', /.*/);
});

test('the keyboard is never trapped: Tab ends it and lands on Skip to content', async ({ page }) => {
  await page.goto('/');
  await playing(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 1500 });
});

test('Escape and a click anywhere end it', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Escape');
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 1500 });
  await page.goto('/topics/');
  await playing(page);
  await page.mouse.click(400, 300);
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 1500 });
});

test('it does not play when moving between the site\'s own pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 1500 });
  await page.locator('a[href="/glossary/"]:visible').first().click();
  await page.waitForURL('**/glossary/');
  await notPlaying(page);
  await expect(page.locator('.cx')).toHaveCount(0);
});

test('it plays again on a reload', async ({ page }) => {
  await page.goto('/about/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 1500 });
  await page.reload();
  await playing(page);
});

test('it finishes by itself in about five seconds, settling the monogram into the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cx.cx-fly')).toHaveCount(1, { timeout: 4800 });
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 2500 });
  await notPlaying(page);
  await expect(page.locator('main h1')).toBeVisible();
});

test('the page stays readable to assistive technology while it plays', async ({ page }) => {
  await page.goto('/');
  await playing(page);
  await expect(page.locator('.cx')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('main#main')).not.toHaveAttribute('inert', /.*/);
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const axe = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('under reduced motion it is a brief still card', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bcx-still\b/);
  await expect(page.locator('.cx__world')).toBeHidden();
  await expect(page.locator('.cx')).toHaveCount(0, { timeout: 2500 });
  await expect(page.locator('main h1')).toBeVisible();
  await context.close();
});

test('automation skips it unless ?intro asks for it', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto('/');
  await notPlaying(page);
  await page.goto('/?intro');
  await playing(page);
  await context.close();
});
