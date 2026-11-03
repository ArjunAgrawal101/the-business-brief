/**
 * The Case Vault and the case file's decision exercise, driven as a reader
 * would: the filters narrow the archive, announce the count and keep the
 * selection in the address; the Case of the Week follows the reader's date
 * (with the clock fixed) and never presents itself as news; without
 * JavaScript the whole archive is listed and the feature says it is the case
 * for the week of the build. The exercise refuses a commit without a choice,
 * keeps a decision after a reload, opens the debrief and clears on request.
 */
import { expect, test, type Page } from '@playwright/test';
import { caseOfTheWeek, weekLabel, type CalendarDate, type VaultCase } from '../../src/lib/case-vault';

const items = (page: Page) => page.locator('[data-list] > li:not([hidden])');
const total = async (page: Page) => page.locator('[data-list] > li').count();

test.describe('the archive', () => {
  test('filters narrow the list, announce the count and stay in the address', async ({ page }) => {
    await page.goto('/case-vault/');
    const all = await total(page);
    expect(all).toBeGreaterThanOrEqual(9);
    const count = page.locator('[data-count]');
    await expect(count).toHaveText(`All ${all} cases`);
    await expect(count).toHaveAttribute('aria-live', 'polite');

    await page.getByLabel('Industry').selectOption('retail');
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText('Bellbird Home and Garden');
    await expect(count).toHaveText(`Showing 1 of ${all} cases`);
    await expect(page).toHaveURL(/\?industry=retail$/);

    // Every other filter counts what it would leave, given this one; values that would leave nothing are disabled.
    const concept = page.getByLabel('Key concept');
    await expect(concept.locator('option[value="sustainability"]')).toHaveText('Sustainability (1)');
    await expect(concept.locator('option[value="ethics"]')).toBeDisabled();

    await page.getByRole('button', { name: 'Clear the filters' }).click();
    await expect(items(page)).toHaveCount(all);
    await expect(page).toHaveURL(/\/case-vault\/$/);

    await page.getByLabel('Topic', { exact: true }).selectOption('unit-3');
    const unit3 = await items(page).count();
    expect(unit3).toBeGreaterThan(1);
    // No case in unit 3 is about human resources, so that choice is offered as disabled rather than leading nowhere.
    await expect(page.getByLabel('Business function').locator('option[value="human-resources"]')).toBeDisabled();
    await page.getByLabel('Search the archive').fill('no such case anywhere');
    await expect(items(page)).toHaveCount(0);
    await expect(page.locator('[data-empty]')).toBeVisible();
    await expect(count).toHaveText(`Showing 0 of ${all} cases`);
    await page.getByLabel('Search the archive').fill('');
    await expect(items(page)).toHaveCount(unit3);

    await page.getByRole('button', { name: 'Clear the filters' }).click();
    await page.getByLabel('Search the archive').fill('glasgow');
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).toContainText('Patchwork Digital');
  });

  test('a shared address opens the same selection, in the chosen order', async ({ page }) => {
    await page.goto('/case-vault/?concept=ethics&sort=difficulty-up');
    await expect(page.getByLabel('Key concept')).toHaveValue('ethics');
    await expect(page.getByLabel('Order')).toHaveValue('difficulty-up');
    const titles = (await items(page).locator('h3').allTextContents()).map((t) => t.trim());
    expect(titles.length).toBeGreaterThanOrEqual(4);
    // Intermediate cases come before advanced ones.
    expect(titles).toEqual(expect.arrayContaining(['Halden Distribution', 'Silvertree Clinics', 'Larkspur Software', 'Patchwork Digital']));
    expect(titles.indexOf('Halden Distribution')).toBeLessThan(titles.indexOf('Larkspur Software'));
    await page.goto('/case-vault/?industry=no-such-industry');
    await expect(page.getByLabel('Industry')).toHaveValue('');
    await expect(items(page)).toHaveCount(await total(page));
  });
});

test.describe('the Case of the Week', () => {
  for (const day of ['2026-11-10T09:00:00', '2027-01-01T09:00:00']) {
    test(`follows the reader's date (${day.slice(0, 10)})`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(day));
      await page.goto('/case-vault/');
      const cfg = JSON.parse((await page.locator('[data-ix="case-of-the-week"] script[data-config]').textContent()) ?? '{}') as { order: string[]; cases: VaultCase[] };
      const [y, m, d] = day.slice(0, 10).split('-').map(Number) as [number, number, number];
      const date: CalendarDate = { y, m, d };
      const pick = caseOfTheWeek(cfg.order, date);
      const expected = cfg.cases.find((c) => c.id === pick?.id);
      if (!pick || !expected) throw new Error('no pick');
      const feature = page.locator('[data-feature]');
      await expect(page.locator('[data-ix="case-of-the-week"]')).toHaveAttribute('data-featured', expected.id);
      await expect(feature.locator('h2')).toContainText(expected.title);
      await expect(feature).toContainText(weekLabel(pick));
      await expect(feature).toContainText("chosen for the week of your device's date");
      await expect(feature).toContainText('not news');
      await expect(feature).not.toContainText(/\b(today|latest|breaking)\b/i);
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the whole archive is listed and the feature says it is the week of the build', async ({ page }) => {
    await page.goto('/case-vault/');
    await expect(items(page)).toHaveCount(await total(page));
    await expect(page.locator('[data-filters]')).toBeHidden();
    await expect(page.locator('.vault-nojs')).toBeVisible();
    await expect(page.locator('[data-feature]')).toContainText('the week this page was built');
  });

  test('a case file keeps its brief, criteria and debrief, and hides the form', async ({ page }) => {
    await page.goto('/cases/bellbird-home-and-garden/');
    await expect(page.locator('.exercise__criteria')).toBeVisible();
    await expect(page.locator('[data-form]')).toBeHidden();
    await page.locator('[data-debrief] > summary').click();
    await expect(page.locator('[data-debrief-option]').first()).toBeVisible();
  });
});

test.describe('the decision exercise', () => {
  test('refuses a commit without a choice, then keeps the decision and opens the debrief', async ({ page }) => {
    await page.goto('/cases/bellbird-home-and-garden/#exercise');
    const form = page.locator('[data-form]');
    await form.getByRole('button', { name: 'Commit to this decision' }).click();
    await expect(form.locator('[data-err]')).toBeVisible();
    await expect(form.locator('input[type="radio"]').first()).toHaveAttribute('aria-invalid', 'true');

    await form.getByLabel(/Working capital package/).check();
    await expect(form.locator('[data-err]')).toBeHidden();
    await form.getByLabel('Your recommendation and reasons').fill('The package keeps every month within the limit at a one-off cost of A$200k.');
    await expect(form.locator('[data-words]')).toHaveText('14 words');
    await form.getByRole('button', { name: 'Commit to this decision' }).click();

    const result = page.locator('[data-result]');
    await expect(result).toBeVisible();
    await expect(result).toBeFocused();
    await expect(result).toContainText('Working capital package');
    await expect(result).toContainText('Best supported by the evidence');
    await expect(page.locator('[data-debrief]')).toHaveAttribute('open', '');
    await expect(page.locator('[data-debrief-option="working-capital"] [data-yours]')).toBeVisible();
    await expect(page.locator('[data-debrief-option="sale-leaseback"] [data-yours]')).toBeHidden();

    await page.reload();
    await expect(page.locator('[data-result]')).toBeVisible();
    await expect(page.getByLabel(/Working capital package/)).toBeChecked();
    await expect(page.getByLabel('Your recommendation and reasons')).toHaveValue(/one-off cost/);
    const stored = await page.evaluate(() => localStorage.getItem('bb:case:bellbird-home-and-garden'));
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ choice: 'working-capital' });

    await page.getByRole('button', { name: 'Clear and start again' }).click();
    await expect(page.locator('[data-result]')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('bb:case:bellbird-home-and-garden'))).toBeNull();
  });
});

test('the progress page lists a decision kept in a case file', async ({ page }) => {
  await page.goto('/progress/');
  await page.evaluate(() => localStorage.setItem('bb:case:tausi-beverages', JSON.stringify({ choice: 'prune-focus', reasons: 'Drop the dog.', committed: '3 November 2026' })));
  await page.reload();
  await expect(page.locator('[data-summary]')).toContainText(/Case decisions made1 of \d+/);
  await expect(page.locator('[data-groups] a[href="/cases/tausi-beverages/#exercise"]')).toBeVisible();
  await expect(page.locator('[data-groups]')).toContainText('Decided on 3 November 2026');
});
