/**
 * Framework comparisons, driven as a reader would: the tool puts any two
 * frameworks side by side from the library's data, by the lists or by
 * searching, keeps the pair in the address, points to a curated comparison
 * or to the PESTLE against STEEPLE page where one exists, and refuses the
 * same framework twice; a curated page lays its sides side by side on a wide
 * screen and stacks them on a phone, and links both frameworks and their
 * subtopics; framework pages link to their comparisons; and without
 * JavaScript the curated comparisons and the library are still listed.
 */
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, query = '') {
  await page.goto(`/frameworks/compare/${query}`);
  const root = page.locator('[data-ix="fw-compare"]');
  await expect(root).toHaveClass(/is-enhanced/);
  return root;
}

test.describe('the comparison tool', () => {
  test('puts two frameworks side by side from the lists, with the keyboard, and keeps them in the address', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-empty]')).toBeVisible();
    await page.locator('#cmp-a').focus();
    await page.locator('#cmp-a').selectOption('lewin-change-model');
    await page.locator('#cmp-b').selectOption('kotter-eight-steps');
    const out = page.locator('[data-output]');
    await expect(out.locator('.cmp-row')).toHaveCount(9);
    await expect(out.locator('.cmp-cell')).toHaveCount(18);
    await expect(out.locator('#cmp-out-h')).toContainText('against');
    await expect(out.locator('[data-dim="context"]').first()).toContainText('Look elsewhere when');
    await expect(out.locator('[data-dim="exam"]').first()).toContainText('Recommended strategy');
    await expect(out.locator('[data-dim="application"]').first()).toContainText('Fictional');
    await expect(out.locator('.cmp-cell__side a[href="/frameworks/lewin-change-model/"]')).toHaveCount(9);
    await expect(page).toHaveURL(/a=lewin-change-model&b=kotter-eight-steps/);
    // The pair survives a reload, and the swap button swaps it.
    await page.reload();
    await expect(page.locator('[data-ix="fw-compare"]')).toHaveClass(/is-enhanced/);
    await expect(page.locator('#cmp-a')).toHaveValue('lewin-change-model');
    await expect(page.locator('[data-output] .cmp-row')).toHaveCount(9);
    await page.locator('[data-swap]').click();
    await expect(page.locator('#cmp-a')).toHaveValue('kotter-eight-steps');
    await expect(page).toHaveURL(/a=kotter-eight-steps&b=lewin-change-model/);
  });

  test('finds frameworks by searching, and sets them with the buttons', async ({ page }) => {
    await open(page);
    await page.locator('#cmp-q').fill('motivation hygiene');
    const results = page.locator('[data-results]');
    await expect(results).toBeVisible();
    await expect(results).toContainText('Herzberg');
    await results.getByRole('button', { name: /Compare as first\s*:\s*Herzberg/ }).click();
    await expect(page.locator('#cmp-a')).toHaveValue('herzbergs-motivation-hygiene-theory');
    await page.locator('#cmp-q').fill('hierarchy');
    await results.getByRole('button', { name: /Compare as second\s*:\s*Maslow/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#cmp-b')).toHaveValue('maslows-hierarchy-of-needs');
    // The pair has a curated comparison, and the tool says so.
    await expect(page.locator('.cmp-notice')).toContainText('There is a curated comparison');
    await expect(page.locator('.cmp-notice a')).toHaveAttribute('href', '/frameworks/compare/maslow-vs-herzberg/');
    await page.locator('#cmp-q').fill('zzzz');
    await expect(results).toContainText('No framework matches');
  });

  test('points to the PESTLE against STEEPLE page, and refuses the same framework twice', async ({ page }) => {
    await open(page, '?a=pestle&b=steeple-analysis');
    await expect(page.locator('.cmp-notice')).toContainText('The library already compares these on one page');
    await expect(page.locator('.cmp-notice a[href="/frameworks/pestle/"]')).toHaveCount(1);
    await page.locator('#cmp-b').selectOption('pestle');
    await expect(page.locator('[data-output]')).toContainText('Choose two different frameworks');
    await expect(page.locator('[data-output] .cmp-row')).toHaveCount(0);
  });
});

test.describe('a curated comparison', () => {
  test('sets the sides side by side on a wide screen, with their standing and links', async ({ page }) => {
    await page.goto('/frameworks/compare/ansoff-matrix-vs-bcg-matrix/');
    await expect(page.locator('h1')).toHaveText('The Ansoff matrix against the BCG matrix');
    for (const h of ['Standing in the IB course', 'Purpose', 'Structure', 'The context it suits', 'Strengths', 'Limitations', 'Common mistakes', 'A business application', 'In an examination answer'])
      await expect(page.getByRole('heading', { name: h, exact: true })).toBeVisible();
    const cells = page.locator('[data-dim="purpose"] .cmp-cell');
    const a = (await cells.nth(0).boundingBox())!;
    const b = (await cells.nth(1).boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x + a.width - 2);
    await expect(page.locator('[data-dim="standing"]')).toContainText('IB toolkit');
    await expect(page.locator('a[href="/frameworks/ansoff-matrix/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/frameworks/bcg-matrix/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/frameworks/ansoff-matrix/#fw-when"]')).toHaveCount(1);
    await expect(page.locator('.cmp-more')).toContainText('1.5 Growth and evolution');
    await expect(page.locator('.cmp-when li')).toHaveCount(3);
  });

  test('gives a syllabus side its statement and level from the curriculum', async ({ page }) => {
    await page.goto('/frameworks/compare/payback-vs-arr-vs-npv/');
    const npv = page.locator('[data-dim="standing"] .cmp-cell').nth(2);
    await expect(npv).toContainText('3.8 Investment appraisal');
    await expect(npv).toContainText('HL only');
    await expect(page.locator('[data-dim="standing"] .cmp-cell').nth(0)).not.toContainText('HL only');
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('stacks the sides, each cell naming its side, with no sideways scroll', async ({ page }) => {
      await page.goto('/frameworks/compare/job-vs-batch-vs-flow-production/');
      const cells = page.locator('[data-dim="purpose"] .cmp-cell');
      const a = (await cells.nth(0).boundingBox())!;
      const b = (await cells.nth(1).boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
      await expect(cells.nth(1).locator('.cmp-cell__side')).toBeVisible();
      await expect(cells.nth(1).locator('.cmp-cell__side')).toHaveText('Batch production');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      // The grid is the first thing after the introduction.
      expect((await page.locator('.cmp-grid').boundingBox())!.y).toBeLessThan(844 * 1.5);
    });

    test('puts the tool’s controls in the first screen', async ({ page }) => {
      await open(page);
      const sel = (await page.locator('#cmp-b').boundingBox())!;
      expect(sel.y + sel.height).toBeLessThanOrEqual(844);
    });
  });
});

test('a framework page links to its comparisons', async ({ page }) => {
  await page.goto('/frameworks/ansoff-matrix/');
  await expect(page.locator('.fw-rel__cmp[href="/frameworks/compare/ansoff-matrix-vs-bcg-matrix/"]')).toHaveText(/Read the comparison/);
  await expect(page.locator('.fw-compare a[href="/frameworks/compare/?a=ansoff-matrix"]')).toHaveCount(1);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('lists the curated comparisons and the library, and hides the picker', async ({ page }) => {
    await page.goto('/frameworks/compare/');
    await expect(page.locator('[data-picker]')).toBeHidden();
    await expect(page.locator('.cmp-nojs')).toBeVisible();
    expect(await page.locator('.cmp-index li').count()).toBeGreaterThanOrEqual(16);
    await expect(page.locator('.cmp-lib a[href="/frameworks/swot-analysis/"]')).toHaveCount(1);
    await page.goto('/frameworks/compare/jit-vs-jic/');
    await expect(page.locator('.cmp-row')).toHaveCount(9);
  });
});
