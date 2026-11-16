/**
 * The Boardroom Briefings in a browser: the index reads as a numbered series
 * and every briefing opens from it; the edition switch shows one edition at a
 * time, keeps the choice in the address, announces it, follows links into the
 * other edition and returns focus sensibly; without JavaScript the Student
 * edition comes first and the Analysis edition follows it as a closed
 * disclosure; and both editions pass axe-core and fit a 320 pixel screen.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const BRIEFING = '/boardroom-briefings/international-market-entry/';
const QUESTIONS = [
  'Should a company enter a new international market?',
  'Should a business acquire a competitor?',
  'How should a company respond to declining profitability?',
  'Should a business automate its operations?',
  'How should a CEO manage a major organizational crisis?',
  'Should a start-up prioritize growth or profitability?',
  'How should a company respond to a disruptive competitor?',
  'Should a business vertically integrate its supply chain?',
  'How should a company balance shareholder returns with long-term investment?',
  'How should a company respond to reputational damage?',
];

const student = (page: Page) => page.locator('[data-panel="student"]');
const analysis = (page: Page) => page.locator('details[data-panel="analysis"]');

async function axe(page: Page) {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const result = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
}

test.describe('the index', () => {
  test('reads as a numbered series, each issue with its question, industry, decision and functions', async ({ page }) => {
    await page.goto('/boardroom-briefings/');
    await expect(page.locator('h1')).toHaveText('The Boardroom Briefings');
    const issues = page.locator('.bbr-issue');
    await expect(issues).toHaveCount(10);
    await expect(issues.locator('.bbr-issue__no')).toHaveText(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
    const questions = (await issues.locator('.bbr-issue__q a').allTextContents()).map((t) => t.trim().replace(/^No\. \d+:\s*/, ''));
    expect(questions).toEqual(QUESTIONS);
    for (const label of ['Industry', 'Decision', 'Functions', 'Company']) await expect(issues.first().locator('dt', { hasText: label })).toHaveCount(1);
    await expect(issues.nth(1).locator('dd').nth(1)).toHaveText('Acquisition');
    await expect(issues.nth(3)).toContainText('Operations management');
  });

  test('opens every briefing, each with one h1 that asks its question', async ({ page }) => {
    await page.goto('/boardroom-briefings/');
    const hrefs = await page.locator('.bbr-issue__q a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs).toHaveLength(10);
    for (const [i, href] of hrefs.entries()) {
      const res = await page.goto(href);
      expect(res?.status(), href).toBe(200);
      await expect(page.locator('h1')).toHaveText(QUESTIONS[i] ?? '');
    }
  });

  test('passes axe-core', async ({ page }) => {
    await page.goto('/boardroom-briefings/');
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('the edition switch', () => {
  test('shows the Student edition first, then switches, announces and keeps the choice in the address', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BRIEFING);
    await expect(student(page)).toBeVisible();
    await expect(analysis(page)).toBeHidden();
    await expect(page.getByRole('radio', { name: /Student edition/ })).toBeChecked();
    await expect(page.locator('[data-edition-note]')).toContainText('The recommendation is withheld');

    await page.getByRole('radio', { name: /Analysis edition/ }).check();
    await expect(analysis(page)).toBeVisible();
    await expect(student(page)).toBeHidden();
    await expect(page).toHaveURL(/#analysis$/);
    await expect(page.locator('[data-edition-live]')).toHaveText(/Showing the Analysis edition/);
    await expect(page.locator('#a-recommendation')).toBeVisible();
    // The disclosure's own control is not shown once the switch is working.
    await expect(analysis(page).locator('> summary')).toBeHidden();

    await page.getByRole('radio', { name: /Student edition/ }).check();
    await expect(student(page)).toBeVisible();
    await expect(analysis(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${BRIEFING}$`));
    expect(errors).toEqual([]);
  });

  test('opens the Analysis edition from its address', async ({ page }) => {
    await page.goto(`${BRIEFING}#analysis`);
    await expect(analysis(page)).toBeVisible();
    await expect(student(page)).toBeHidden();
    await expect(page.getByRole('radio', { name: /Analysis edition/ })).toBeChecked();
    await page.goto(`${BRIEFING}#a-measures`);
    await expect(page.locator('#a-measures')).toBeVisible();
  });

  test('follows a link to an exhibit into the Student edition, and Back returns to the analysis', async ({ page }) => {
    await page.goto(`${BRIEFING}#analysis`);
    await analysis(page).locator('a[href="#ex-4"]').first().click();
    await expect(student(page)).toBeVisible();
    await expect(page.locator('#ex-4')).toBeInViewport();
    await expect(page.getByRole('radio', { name: /Student edition/ })).toBeChecked();
    await page.goBack();
    await expect(analysis(page)).toBeVisible();
    await expect(student(page)).toBeHidden();
  });

  test('moves focus to the start of the other edition from the button at the end of each', async ({ page }) => {
    await page.goto(BRIEFING);
    await page.getByRole('button', { name: 'Read the Analysis edition' }).click();
    await expect(analysis(page)).toBeVisible();
    await expect(analysis(page).locator('[data-edition-start]')).toBeFocused();
    await page.getByRole('button', { name: 'Back to the Student edition' }).click();
    await expect(student(page)).toBeVisible();
    await expect(student(page).locator('[data-edition-start]')).toBeFocused();
  });

  test('passes axe-core in both editions', async ({ page }) => {
    await page.goto(BRIEFING);
    expect(await axe(page)).toEqual([]);
    await page.getByRole('radio', { name: /Analysis edition/ }).check();
    await expect(analysis(page)).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the Student edition comes first and the Analysis edition follows it, closed', async ({ page }) => {
    await page.goto(BRIEFING);
    await expect(page.locator('.bbr-switch')).toBeHidden();
    await expect(student(page)).toBeVisible();
    await expect(page.locator('#questions')).toBeVisible();
    const disclosure = analysis(page);
    await expect(disclosure).toBeVisible();
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(page.locator('#a-recommendation')).toBeHidden();
    // The analysis comes after the student material in the page.
    const order = await page.evaluate(() => {
      const s = document.querySelector('[data-panel="student"]');
      const a = document.querySelector('details[data-panel="analysis"]');
      return s && a ? Boolean(s.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
    });
    expect(order).toBe(true);
    await disclosure.locator('> summary').click();
    await expect(page.locator('#a-recommendation')).toBeVisible();
    await expect(page.locator('#a-recommendation')).toContainText('Kasumi Trading');
  });

  test('no control that needs a script is shown', async ({ page }) => {
    await page.goto(BRIEFING);
    await expect(page.getByRole('button', { name: 'Read the Analysis edition' })).toBeHidden();
    await expect(page.locator('.bbr-nojs')).toBeVisible();
  });
});

test.describe('at 320 pixels', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });

  test('neither edition scrolls sideways', async ({ page }) => {
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.goto(BRIEFING);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByRole('radio', { name: /Analysis edition/ }).check();
    await expect(analysis(page)).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto('/boardroom-briefings/');
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
