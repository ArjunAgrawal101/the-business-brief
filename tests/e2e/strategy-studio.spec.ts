/**
 * The Strategy Studio, driven as a reader would drive it: every tool
 * recalculates, checks its inputs, announces its result, keeps the work on
 * this device and exports it; without scripts every tool reads as a finished
 * worked example with no button it cannot run.
 */
import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page, tool: string) => {
  const root = page.locator(`[data-ix="studio"][data-tool="${tool}"]`);
  await expect(root).toHaveClass(/is-enhanced/);
  return root;
};

test.describe('Strategy Studio tools', () => {
  test('SWOT: prompts on a factor in the wrong box, adds and moves factors, keeps the work', async ({ page }) => {
    await page.goto('/strategy-studio/swot/');
    const root = await ready(page, 'swot');
    const s1 = root.locator('#sx-swot-s1-text');
    await s1.fill('Growing demand for cargo bikes');
    await expect(root.locator('#sx-swot-s1-text-chk')).toContainText('outside the business');
    await expect(s1).toHaveAttribute('aria-describedby', /sx-swot-s1-text-chk/);
    await expect(root.locator('[data-outputs]')).toContainText('may be in the wrong box');
    await expect(root).toHaveClass(/is-own/);
    // Move it to the opportunities, where it belongs.
    await root.locator('#sx-swot-s1-q').selectOption('O');
    await expect(root.locator('#sx-swot-s1-text-chk')).toBeEmpty();
    await expect(page.locator('[data-status]')).toContainText(/Moved to opportunities/);
    // Add a strength: focus moves to its first field.
    await root.locator('[data-act="add-factor"][data-quadrant="S"]').click();
    await expect(page.locator(':focus')).toHaveAttribute('data-k', /factors\.f1\.text/);
    await page.keyboard.type('Own assembly works');
    // The work is kept: reload and it is still there.
    await page.waitForTimeout(500);
    await page.reload();
    const again = await ready(page, 'swot');
    await expect(again.locator('#sx-swot-f1-text')).toHaveValue('Own assembly works');
    await expect(again.locator('[data-save-status]')).toContainText('saved analysis');
    // Restore the example after confirming.
    page.once('dialog', (d) => void d.accept());
    await again.locator('[data-tool-act="example"]').click();
    await expect(again.locator('#sx-swot-s1-text')).toHaveValue('Leads the cargo e-bike segment');
    await expect(again).not.toHaveClass(/is-own/);
  });

  test('SWOT: exports JSON that loads back, and CSV', async ({ page }) => {
    await page.goto('/strategy-studio/swot/');
    const root = await ready(page, 'swot');
    await root.locator('#sx-swot-business').fill('Test Bikes');
    const [json] = await Promise.all([page.waitForEvent('download'), root.locator('[data-tool-act="json"]').click()]);
    expect(json.suggestedFilename()).toBe('test-bikes-swot.json');
    const path = await json.path();
    const [csv] = await Promise.all([page.waitForEvent('download'), root.locator('[data-tool-act="csv"]').click()]);
    expect(csv.suggestedFilename()).toBe('test-bikes-swot.csv');
    page.once('dialog', (d) => void d.accept());
    await root.locator('[data-tool-act="example"]').click();
    await expect(root.locator('#sx-swot-business')).toHaveValue('Northvale Cycles');
    await root.locator('[data-import]').setInputFiles(path);
    await expect(root.locator('#sx-swot-business')).toHaveValue('Test Bikes');
  });

  test('STEEPLE: rescoring a factor reorders the list', async ({ page }) => {
    await page.goto('/strategy-studio/steeple/');
    const root = await ready(page, 'steeple');
    const first = root.locator('.sx-prio tbody tr').first();
    await expect(first).toContainText('Low-emission zones restricting vans');
    await root.locator('#sx-steeple-po2-imp').selectOption('5');
    await root.locator('#sx-steeple-po2-lik').selectOption('5');
    await expect(first).toContainText('A possible grant for business cargo bikes');
    await expect(first).toContainText('25');
    await root.locator('[data-act="add"][data-category="ethical"]').click();
    await expect(root.locator('[data-outputs]')).toContainText('Plan for it');
  });

  test('Five Forces: a stronger force changes the reading', async ({ page }) => {
    await page.goto('/strategy-studio/five-forces/');
    const root = await ready(page, 'five-forces');
    await expect(root.locator('[data-outputs]')).toContainText('Moderately attractive');
    await root.locator('#sx-five-forces-rivalry-r').selectOption('5');
    await root.locator('#sx-five-forces-entry-r').selectOption('5');
    await expect(root.locator('[data-reading]').first()).toContainText('unattractive');
    await expect(root.locator('svg.chart desc')).toContainText('Average force 4.2');
  });

  test('Ansoff: the placement follows the choices', async ({ page }) => {
    await page.goto('/strategy-studio/ansoff/');
    const root = await ready(page, 'ansoff');
    await expect(root.locator('[data-place="o2"]')).toContainText('Market penetration');
    await root.locator('#sx-ansoff-o2-product-new').check();
    await expect(root.locator('[data-place="o2"]')).toContainText('Product development');
    await expect(root.locator('.sx-ansoff__cell--product')).toContainText('Win back commuters with lower prices');
  });

  test('BCG: figures are checked and the portfolio redrawn', async ({ page }) => {
    await page.goto('/strategy-studio/bcg-matrix/');
    const root = await ready(page, 'bcg-matrix');
    const share = root.locator('#sx-bcg-matrix-commuter-share');
    await share.fill('95');
    await expect(root.locator('#sx-bcg-matrix-commuter-rival')).toHaveAttribute('aria-invalid', 'true');
    await expect(root.locator('#sx-bcg-matrix-commuter-rival-err')).toContainText('cannot exceed 100%');
    await expect(root.locator('[data-outputs]')).toContainText('left off the chart');
    await share.fill('20');
    await expect(root.locator('#sx-bcg-matrix-commuter-rival')).not.toHaveAttribute('aria-invalid', 'true');
    // 20 / 18 = 1.11: the commuter e-bike becomes a star.
    await expect(root.locator('.table tbody tr', { hasText: 'Commuter e-bikes' })).toContainText('Star');
  });

  test('Generic strategies: a clear premium moves the business out of the middle', async ({ page }) => {
    await page.goto('/strategy-studio/generic-strategies/');
    const root = await ready(page, 'generic-strategies');
    await expect(root.locator('[data-place="now"]')).toContainText('Stuck in the middle');
    await root.locator('#sx-generic-strategies-now-diff').selectOption('4');
    await expect(root.locator('[data-place="now"]')).toContainText('Differentiation');
  });

  test('Stakeholder map: power moves a group between quadrants', async ({ page }) => {
    await page.goto('/strategy-studio/stakeholder-map/');
    const root = await ready(page, 'stakeholder-map');
    await root.locator('#sx-stakeholder-map-s7-power').selectOption('8');
    await expect(root.locator('[data-place="s7"]')).toContainText('Manage closely');
    await expect(root.locator('[data-outputs] table')).toContainText('could block it');
  });

  test('Decision tree: probabilities are checked, branches added, types changed', async ({ page }) => {
    await page.goto('/strategy-studio/decision-tree/');
    const root = await ready(page, 'decision-tree');
    await expect(root.locator('[data-reading]').first()).toContainText('€2.28m');
    const p = root.locator('#sx-decision-tree-onweak-p');
    await p.fill('0.4');
    await expect(root.locator('#sx-decision-tree-online-sum-err')).toContainText('add up to 0.9, not 1');
    await expect(p).toHaveAttribute('aria-invalid', 'true');
    await p.fill('0.5');
    await expect(root.locator('#sx-decision-tree-online-sum-err')).toBeEmpty();
    // A fifth option with one outcome: add it, and make it a chance node.
    await root.locator('[data-act="add"][data-id="root"]').click();
    const fresh = page.locator(':focus');
    await expect(fresh).toHaveAttribute('data-k', /nodes\.n1\.label/);
    await fresh.fill('Sell the works');
    await root.locator('#sx-decision-tree-n1-kind').selectOption('chance');
    await expect(page.locator('[data-status]')).toContainText('new branches');
    await expect(root.locator('[data-outputs]')).toContainText('Enter a probability for every outcome');
  });

  test('Force field: weakening a restraining force is tested', async ({ page }) => {
    await page.goto('/strategy-studio/force-field/');
    const root = await ready(page, 'force-field');
    await root.locator('#sx-force-field-test').selectOption('r3');
    await root.locator('#sx-force-field-by').selectOption('3');
    await expect(root.locator('[data-outputs]')).toContainText('If "Cash needed for tooling and stock" fell from 4 to 1');
    await root.locator('#sx-force-field-r1-s').selectOption('5');
    await expect(root.locator('[data-reading]').first()).toContainText('level (15 each)');
    await root.locator('#sx-force-field-r2-s').selectOption('4');
    await expect(root.locator('[data-reading]').first()).toContainText('restraining forces (16) outweigh');
  });

  test('Option appraisal: weights rerank, the memo gathers saved headlines and copies', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // Save some work in the Five Forces tool first.
    await page.goto('/strategy-studio/five-forces/');
    const ff = await ready(page, 'five-forces');
    await ff.locator('#sx-five-forces-buyers-r').selectOption('5');
    await page.waitForTimeout(500);
    await page.goto('/strategy-studio/option-appraisal/');
    const root = await ready(page, 'option-appraisal');
    const first = root.locator('[data-outputs] tbody tr').first();
    await expect(first).toContainText('Fleet cargo bikes for delivery firms');
    await root.locator('#sx-option-appraisal-profit-w').selectOption('1');
    await expect(first).toContainText('City bikes for dealers abroad');
    await expect(root.locator('[data-outputs]')).toContainText('rank below');
    await root.locator('[data-act="import-evidence"]').click();
    await expect(root.locator('#sx-option-appraisal-evidence')).toHaveValue(/Five Forces: /);
    await root.locator('[data-memo-act="copy"]').click();
    await expect(page.locator('[data-status]')).toContainText('memo is copied');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('Recommended: Fleet cargo bikes for delivery firms.');
  });

  test('the home page marks the tools with saved work', async ({ page }) => {
    await page.goto('/strategy-studio/ansoff/');
    const root = await ready(page, 'ansoff');
    await root.locator('#sx-ansoff-o1-name').fill('Fleet bikes, direct');
    await page.waitForTimeout(500);
    await page.goto('/strategy-studio/');
    await expect(page.locator('.sx-register [data-saved-for="ansoff"]')).toContainText('Saved');
    await expect(page.locator('[data-saved-summary]')).toContainText('1 of the tools');
    // The progress page lists it too.
    await page.goto('/progress/');
    await expect(page.locator('.pr-group', { hasText: 'Strategy Studio' })).toContainText('Ansoff planner');
    await expect(page.locator('[data-summary]')).toContainText('Strategy Studio analyses');
  });

  test('printing shows the analysis, not the inputs', async ({ page }) => {
    await page.goto('/strategy-studio/bcg-matrix/');
    await ready(page, 'bcg-matrix');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.sx-panel--in')).toBeHidden();
    await expect(page.locator('.sx-bar')).toBeHidden();
    await expect(page.locator('.sx-panel--out svg.chart')).toBeVisible();
    await expect(page.locator('.sx-example-flag')).toBeVisible();
  });
});

test.describe('Strategy Studio without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const tool of ['swot', 'steeple', 'five-forces', 'ansoff', 'bcg-matrix', 'generic-strategies', 'stakeholder-map', 'decision-tree', 'force-field', 'option-appraisal']) {
    test(`${tool} reads as a finished worked example`, async ({ page }) => {
      await page.goto(`/strategy-studio/${tool}/`);
      await expect(page.locator('.sx-nojs')).toBeVisible();
      await expect(page.locator('[data-outputs] .sx-out__block').first()).toBeVisible();
      await expect(page.locator('.sx-example-flag')).toBeVisible();
      const visible = await page.evaluate(() =>
        [...document.querySelectorAll('button')].filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }).length,
      );
      expect(visible).toBe(0);
    });
  }
});
