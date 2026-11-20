/**
 * Study mode on the subtopic pages, driven as a reader would: the text in
 * three sizes, kept and applied before the page is drawn; low light, scoped
 * to the article and passing an accessibility scan; the On this page list as
 * a rail on a wide screen and a jump menu on a phone, following the SL and
 * HL choice; Mark as complete reaching the dashboard; Save; print; and the
 * page as it was without JavaScript.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const NOTES = '/topics/break-even-analysis/';
const BRIEF = '/topics/costs-and-revenues/';

const ready = async (page: Page) => {
  await expect(page.locator('[data-ix="study"].is-enhanced')).toBeVisible();
};

const axe = async (page: Page) => {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
};

const root = (page: Page) => page.locator('[data-study-root]');

test.describe('Study mode', () => {
  test('text size: three steps, kept on this device and applied before the page is drawn', async ({ page }) => {
    await page.goto(NOTES);
    await ready(page);
    await expect(root(page)).toHaveAttribute('data-study-size', '0');
    const standard = await page.locator('#sh-ib-h').evaluate((el) => el.getBoundingClientRect().height);
    await page.getByLabel('Larger').check();
    await expect(root(page)).toHaveAttribute('data-study-size', '2');
    await expect(page.locator('[data-ix="study"] [data-live]')).toHaveText('Text size: Larger.');
    expect(await page.locator('#sh-ib-h').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(standard * 1.1);
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('bb:study'))) ?? '{}')).toEqual({ v: 1, size: 2, low: false });

    // The next page opens in the same size, set by the inline script before any module runs.
    await page.goto('/topics/stakeholders/');
    await expect(root(page)).toHaveAttribute('data-study-size', '2');
    await ready(page);
    await expect(page.getByLabel('Larger')).toBeChecked();
    // The tools themselves are not enlarged, and nothing spills sideways on a phone.
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.getByLabel('Standard').check();
    await expect(root(page)).toHaveAttribute('data-study-size', '0');
  });

  test('low light: ivory on navy, in the article only, kept, and accessible', async ({ page }) => {
    await page.goto(NOTES);
    await ready(page);
    const low = page.getByRole('button', { name: 'Low light' });
    await expect(low).toHaveAttribute('aria-pressed', 'false');
    await low.click();
    await expect(low).toHaveAttribute('aria-pressed', 'true');
    await expect(root(page)).toHaveAttribute('data-study-low', '');
    // The article is on navy; the page's header and the subtopic's title above it are not.
    expect(await root(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(11, 26, 51)');
    expect(await page.locator('.sh').evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgb(11, 26, 51)');
    // A diagram keeps its light sheet.
    expect(await page.locator('[data-study-root] figure.dg').first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    expect(await axe(page), 'axe violations in low light').toEqual([]);
    await page.reload();
    await expect(root(page)).toHaveAttribute('data-study-low', '');
    await ready(page);
    await page.getByRole('button', { name: 'Low light' }).click();
    await expect(root(page)).not.toHaveAttribute('data-study-low', '');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('bb:study'))) ?? '{}')).toMatchObject({ low: false });
  });

  test('On this page: a rail beside the article on a wide screen, marking the section in view', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(NOTES);
    await ready(page);
    const rail = page.locator('nav.sm-rail');
    await expect(rail).toBeVisible();
    await expect(page.locator('[data-strip]')).toBeHidden();
    const links = rail.locator('a[data-i]');
    // One entry for each section heading of the article, in order.
    const headings = await page.locator('[data-study-root] h2').evaluateAll((els) => els.filter((e) => !e.closest('aside, .sm, .sm-rail') && e.getClientRects().length).length);
    await expect(links).toHaveCount(headings);
    await expect(links.first()).toContainText('What the IB course asks');
    const terms = rail.locator('a', { hasText: 'Key terms' });
    await terms.click();
    await expect(page.locator('#sh-terms-h')).toBeFocused();
    await expect(terms).toHaveAttribute('aria-current', 'location');
    await expect(page).toHaveURL(/#terms$/);
    // The rail's reading progress has moved on.
    await expect(rail.locator('[data-read]')).not.toHaveText('0% read');
  });

  test('On this page: a jump menu under the header on a phone, which closes and moves focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(NOTES);
    await ready(page);
    await expect(page.locator('nav.sm-rail')).toBeHidden();
    const jump = page.locator('[data-jump]');
    await expect(jump).toBeVisible();
    await jump.locator('summary').click();
    await expect(jump).toHaveAttribute('open', '');
    await jump.getByRole('link', { name: /Check your recall/ }).click();
    await expect(jump).not.toHaveAttribute('open', '');
    await expect(page.locator('#sh-rev-h')).toBeFocused();
    await expect(page.locator('[data-now]')).toContainText('Check your recall');
    // The strip stays under the header as the page scrolls, and the progress bar has moved.
    const top = await page.locator('[data-strip]').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThan(40);
    expect(top).toBeLessThan(120);
    expect(await page.locator('[data-strip] [data-fill]').evaluate((el) => (el as HTMLElement).style.transform)).not.toBe('scaleX(0.0000)');
    // Escape closes the menu and returns to it.
    await jump.locator('summary').click();
    await page.keyboard.press('Escape');
    await expect(jump).not.toHaveAttribute('open', '');
    await expect(jump.locator('summary')).toBeFocused();
    expect(await axe(page), 'axe violations on a phone').toEqual([]);
  });

  test('the contents follow the SL and HL choice', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/topics/final-accounts/');
    await ready(page);
    const rail = page.locator('nav.sm-rail');
    const hlOnly = rail.getByRole('link', { name: 'Depreciation: straight line and units of production', exact: true });
    await expect(hlOnly).toHaveCount(1);
    const all = await rail.locator('a').count();
    await page.locator('[data-level-switch] label', { hasText: 'SL' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-level', 'SL');
    await expect(hlOnly).toHaveCount(0);
    await expect(rail.locator('a')).toHaveCount(all - 2);
    await page.locator('[data-level-switch] label', { hasText: 'HL' }).first().click();
    await expect(hlOnly).toHaveCount(1);
  });

  test('Mark as complete is kept, can be undone, and reaches the dashboard', async ({ page }) => {
    await page.goto(NOTES);
    await ready(page);
    const done = page.getByRole('button', { name: /^Mark as complete/ });
    await expect(done).toHaveAttribute('aria-pressed', 'false');
    await done.click();
    await expect(done).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-complete-link]')).toBeVisible();
    await expect(page.locator('[data-ix="study"] [data-live]')).toContainText('5.5 Break-even analysis is marked as complete');
    const kept = JSON.parse((await page.evaluate(() => localStorage.getItem('bb:studied'))) ?? '{}');
    expect(Object.keys(kept.done)).toEqual(['5.5']);
    await page.reload();
    await ready(page);
    await expect(page.getByRole('button', { name: /^Mark as complete/ })).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/dashboard/');
    await expect(page.locator('[data-ix="progress"].is-enhanced')).toBeVisible();
    await expect(page.locator('[data-studied]')).toContainText('5.5 Break-even analysis');
    await expect(page.locator('[data-units-table] tfoot')).toContainText(/1\s*1\s*$/);

    await page.goto(NOTES);
    await ready(page);
    await page.getByRole('button', { name: /^Mark as complete/ }).click();
    await expect(page.getByRole('button', { name: /^Mark as complete/ })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-complete-link]')).toBeHidden();
  });

  test('Save is in the bar, once; a brief keeps its own Save and contents list, and gains the strip', async ({ page }) => {
    await page.goto(NOTES);
    await ready(page);
    await expect(page.locator('[data-ix="save"]')).toHaveCount(1);
    await expect(page.locator('[data-ix="study"] [data-ix="save"] [data-save]')).toBeVisible();

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(BRIEF);
    await ready(page);
    await expect(page.locator('[data-ix="study"] [data-ix="save"]')).toHaveCount(0);
    await expect(page.locator('nav.sm-rail')).toHaveCount(0);
    await expect(page.locator('.brief-toc')).toBeVisible();
    await page.locator('.brief-toc a[href="#revision"]').click();
    await expect(page.locator('.brief-toc a[href="#revision"]')).toHaveAttribute('aria-current', 'location');
    await page.getByLabel('Large', { exact: true }).check();
    await expect(page.locator('.brief__main')).toHaveAttribute('data-study-size', '1');
  });

  test('printing shows the article in the standard size and daylight, without the study tools', async ({ page }) => {
    await page.goto(NOTES);
    await ready(page);
    await page.getByLabel('Larger').check();
    await page.getByRole('button', { name: 'Low light' }).click();
    await page.evaluate(() => {
      (window as unknown as { printed: number }).printed = 0;
      window.print = () => {
        (window as unknown as { printed: number }).printed += 1;
      };
    });
    await page.locator('[data-ix="study"] [data-print]').click();
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-ix="study"]')).toBeHidden();
    await expect(page.locator('[data-strip]')).toBeHidden();
    expect(await page.locator('[data-study-root] > section').first().evaluate((el) => getComputedStyle(el).zoom)).toBe('1');
    expect(await root(page).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgb(11, 26, 51)');
  });
});

test.describe('Study mode without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page reads as before, with no control it cannot run', async ({ page }) => {
    await page.goto(NOTES);
    await expect(page.locator('h1')).toContainText('Break-even analysis');
    await expect(page.locator('[data-ix="study"] [data-size]').first()).toBeHidden();
    await expect(page.getByRole('button', { name: 'Low light' })).toBeHidden();
    await expect(page.locator('[data-strip]')).toBeHidden();
    await expect(page.locator('nav.sm-rail')).toHaveCount(0);
    await expect(page.locator('#sh-ib-h')).toBeVisible();
  });
});
