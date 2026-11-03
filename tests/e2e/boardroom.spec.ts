/**
 * The Boardroom, played as a learner would play it: take a seat, decide every
 * round, read the consequences, write the memo and open the debrief. Every
 * stage is scanned with axe-core, the figures shown must match the engine,
 * and progress must survive a reload. Without JavaScript the page must read
 * as a complete casebook.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];

const axe = async (page: Page, where: string) => {
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(
    r.violations.map((v) => `${where}: ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`),
    `axe violations at ${where}`,
  ).toEqual([]);
};

test.describe('the Boardroom with JavaScript', () => {
  test('a scenario plays through from seat to debrief, accessibly, and is kept on this device', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/boardroom/kestle-cycles/');
    await page.evaluate(() => localStorage.removeItem('bb:boardroom:kestle-cycles'));
    await page.reload();
    const sim = page.locator('[data-ix="boardroom"]');
    await expect(sim).toHaveClass(/is-enhanced/);
    // The casebook gives way to the simulation, and the debrief waits.
    await expect(page.locator('.bb-casebook')).toBeHidden();
    await expect(page.locator('[data-debrief-body]')).toBeHidden();
    await expect(page.locator('[data-debrief-locked]')).toBeVisible();

    // A seat is required, and the message says so.
    await page.click('[data-act="seat"]');
    await expect(page.locator('[data-seat-msg]')).toHaveText('Choose a seat first.');
    await page.check('#bb-kestle-cycles-role-finance');
    await page.click('[data-act="seat"]');
    await expect(page.locator('#bb-round-h')).toBeFocused();
    await expect(page.locator('[data-board-seat]')).toContainText('Finance director');
    await expect(page.locator('[data-board-tiles] .bb-kpi.is-pinned')).toHaveCount(3);
    await axe(page, 'round 1');

    // An option is required too.
    await page.click('[data-act="commit"]');
    await expect(page.locator('[data-commit-msg]')).toContainText('Choose one of the three options');

    const picks = ['factor', 'partial', 'share', 'term-loan'];
    for (const [k, p] of picks.entries()) {
      await page.check(`#bb-opt-${p}`);
      await page.fill('#bb-why', `Because of round ${k + 1}.`);
      await page.click('[data-act="commit"]');
      await expect(page.locator('#bb-res-h')).toBeFocused();
      await expect(page.locator('[data-status]')).toContainText('Decision taken');
      // Every function reports, and the flow says which way each change went in words.
      await expect(page.locator('[data-stage] .bb-fn')).toHaveCount(4);
      if (k === 0) {
        await axe(page, 'the first consequences');
        await page.click('[data-act="undo"]');
        await expect(page.locator('#bb-round-h')).toBeFocused();
        await page.check(`#bb-opt-${p}`);
        await page.click('[data-act="commit"]');
      }
      if (k < picks.length - 1) await expect(page.locator('[data-stage] .bb-event')).toBeVisible();
      await page.click('[data-act="continue"]');
    }

    // The memo, with a live preview, and the debrief opened.
    await expect(page.locator('#bb-memoform-h')).toBeFocused();
    await page.fill('[data-memo="recommendation"]', 'Keep factoring until the overdraft is cleared.');
    await expect(page.locator('[data-memo-preview]')).toContainText('Keep factoring until the overdraft is cleared.');
    await expect(page.locator('[data-memo-preview] .bb-memo__meta')).toContainText('Finance director');
    await axe(page, 'the memo');
    const download = page.waitForEvent('download');
    await page.click('[data-act="download-csv"]');
    expect((await download).suggestedFilename()).toBe('kestle-cycles-figures.csv');
    await expect(page.locator('[data-debrief-body]')).toBeVisible();
    await expect(page.locator('[data-yours] .bb-score.is-mine')).toContainText('Finance director');
    await expect(page.locator('[data-yours] .bb-paths tr.is-yours')).toHaveCount(1);
    await axe(page, 'the debrief');

    // The minutes keep every round, and the choices survive a reload.
    await expect(page.locator('.bb-minute')).toHaveCount(4);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bb:boardroom:kestle-cycles') ?? '{}'));
    expect(saved.picks).toEqual(picks);
    expect(saved.role).toBe('finance');
    await page.reload();
    await expect(page.locator('#bb-memoform-h')).toBeVisible();
    await expect(page.locator('[data-memo="recommendation"]')).toHaveValue('Keep factoring until the overdraft is cleared.');

    // Starting again clears the decisions and keeps the seat.
    await page.click('[data-act="restart"]');
    await expect(page.locator('#bb-round-h')).toBeFocused();
    await expect(page.locator('[data-debrief-body]')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('the casebook, which a reader sees when the script cannot run, passes the same checks', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/boardroom/hotel-mareluce/');
    await expect(page.locator('[data-ix="boardroom"]')).toHaveClass(/is-enhanced/);
    // A failed script marks the component broken, and the casebook comes back (src/styles/boardroom.css).
    await page.evaluate(() => document.querySelector('[data-ix="boardroom"]')?.classList.add('is-broken'));
    await expect(page.locator('.bb-casebook')).toBeVisible();
    await expect(page.locator('[data-shell]')).toBeHidden();
    await axe(page, 'the casebook');
  });

  test('the index says how far this browser has got', async ({ page }) => {
    await page.goto('/boardroom/');
    await page.evaluate(() => localStorage.setItem('bb:boardroom:hotel-mareluce', JSON.stringify({ role: 'hr', picks: ['eco', 'local'], notes: {}, memo: {}, ack: 2 })));
    await page.reload();
    await expect(page.locator('[data-progress="hotel-mareluce"]')).toHaveText('Saved on this device: 2 of 4 rounds decided, as HR director.');
    await expect(page.locator('[data-progress="kestle-cycles"]')).toBeHidden();
  });
});

test.describe('the Boardroom without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a scenario reads as a complete casebook, with one path narrated and the debrief open', async ({ page }) => {
    await page.goto('/boardroom/kilbrack-bakery/');
    await expect(page.locator('.bb-casebook')).toBeVisible();
    await expect(page.locator('.bb-cround')).toHaveCount(4);
    await expect(page.locator('.bb-copt')).toHaveCount(12);
    await expect(page.locator('.bb-walk .bb-result')).toHaveCount(4);
    await expect(page.locator('.bb-walk .bb-score')).toHaveCount(5);
    await expect(page.locator('[data-debrief-body]')).toBeVisible();
    await expect(page.locator('[data-shell]')).toBeHidden();
    await expect(page.locator('.bb-exhibit')).toHaveCount(8);
    const buttons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.getBoundingClientRect().width > 0).length);
    expect(buttons, 'visible buttons without JavaScript').toBe(0);
  });
});
