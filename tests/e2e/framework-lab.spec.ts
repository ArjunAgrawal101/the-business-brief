/**
 * The Framework Application Lab, driven as a reader would drive it: the hub
 * narrows the questions and opens a framework's application mode; each
 * framework page sets out how to read and apply the framework, and its
 * worksheet keeps the reader's work on this device; the three tools added to
 * the Strategy Studio recalculate, check their inputs and keep the work; and
 * without scripts the hub, the pages and the tools are complete.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** Everything kept in this browser must be declared on the privacy page, by name or by a prefix ending in "…". */
async function expectDeclared(page: Page) {
  const html = await (await page.request.get('/privacy/')).text();
  const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
  const undeclared = kept.filter((k) => !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
  expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
}

const studio = async (page: Page, tool: string) => {
  const root = page.locator(`[data-ix="studio"][data-tool="${tool}"]`);
  await expect(root).toHaveClass(/is-enhanced/);
  return root;
};

test.describe('the Lab hub', () => {
  test('narrows the questions and opens a framework\'s application mode', async ({ page }) => {
    await page.goto('/frameworks/lab/');
    const root = page.locator('[data-ix="fw-lab"]');
    await expect(root).toHaveClass(/is-enhanced/);
    await expect(root.locator('[data-count]')).toContainText('18 questions');
    await expect(page.locator('.fl-judgement')).toContainText('Frameworks structure judgement; they do not produce answers.');
    await page.locator('#fl-question').selectOption('uncertain-future');
    await expect(root.locator('.fl-q:visible')).toHaveCount(1);
    await expect(page).toHaveURL(/#q-uncertain-future$/);
    await expect(root.locator('#q-uncertain-future')).toContainText('Scenario planner');
    // Of PESTLE (enrichment), STEEPLE and decision trees (both toolkit), the toolkit tools remain.
    await page.locator('#fl-status').selectOption('toolkit');
    await expect(root.locator('#q-uncertain-future .fl-fw:visible')).toHaveCount(2);
    await expect(root.locator('[data-count]')).toContainText('1 question, 2 suggestions from 2 frameworks');
    await root.locator('#q-uncertain-future .fl-fw:visible').first().getByRole('link', { name: 'Open its application mode' }).click();
    await expect(page).toHaveURL(/\/frameworks\/steeple-analysis\/#apply$/);
    await expect(page.locator('#apply')).toBeInViewport();
  });

  test('opens on the question named in the address', async ({ page }) => {
    await page.goto('/frameworks/lab/#q-motivate');
    const root = page.locator('[data-ix="fw-lab"]');
    await expect(root).toHaveClass(/is-enhanced/);
    await expect(page.locator('#fl-question')).toHaveValue('motivate');
    await expect(root.locator('.fl-q:visible')).toHaveCount(1);
    await expect(root.locator('#q-motivate .fl-fw')).toHaveCount(7);
    await page.locator('#fl-group').selectOption('strategy');
    await expect(page.locator('[data-none]')).toBeVisible();
  });

  test('features the advanced applications, each linked to its tool', async ({ page }) => {
    await page.goto('/frameworks/lab/');
    const adv = page.locator('.fl-adv__item');
    await expect(adv).toHaveCount(7);
    for (const href of ['/strategy-studio/five-forces/', '/strategy-studio/ansoff/', '/strategy-studio/bcg-matrix/', '/strategy-studio/decision-tree/', '/strategy-studio/scenarios/', '/strategy-studio/stakeholder-salience/', '/strategy-studio/strategic-fit/'])
      await expect(page.locator(`.fl-adv a[href="${href}"]`)).toHaveCount(1);
  });
});

test.describe('a framework page, applied', () => {
  test('sets out the new parts and the application mode', async ({ page }) => {
    await page.goto('/frameworks/five-forces/');
    // Section heads read "Section 03: How it is built" to a screen reader.
    for (const h of ['How it is built', 'When to use it', 'Reading the result', 'Common mistakes', 'Apply it']) await expect(page.getByRole('heading', { name: new RegExp(`^Section \\d+: ${h}$`) })).toBeVisible();
    await expect(page.locator('#apply .fw-tool').first()).toContainText('Five Forces assessor');
    await expect(page.locator('#apply')).toContainText('Frameworks structure judgement; they do not produce answers.');
    await expect(page.locator('.fw-works')).toContainText('How Competitive Forces Shape Strategy');
    await page.locator('.fw-guide--apply').click();
    await expect(page).toHaveURL(/#apply$/);
    // A framework that no tool applies in full says so: its worksheet is its application mode.
    await page.goto('/frameworks/hofstedes-cultural-dimensions/');
    await expect(page.locator('.fw-apply__none')).toContainText('No interactive tool on the platform applies');
    await expect(page.locator('[data-ix="fw-apply"] [data-field^="part:"]')).toHaveCount(6);
  });

  test('keeps the worksheet on this device, downloads it and clears it', async ({ page }) => {
    await page.goto('/frameworks/raci-matrix/');
    const sheet = page.locator('[data-ix="fw-apply"]');
    await expect(sheet).toHaveClass(/is-enhanced/);
    await page.locator('#fwa-decision').fill('Who decides the menu at the new café?');
    await page.locator('#fwa-part-0').fill('Choose the site; agree the budget; plan the opening week.');
    await expect(sheet.locator('[data-status]')).toContainText('Saved on this device');
    await page.reload();
    await expect(page.locator('#fwa-decision')).toHaveValue('Who decides the menu at the new café?');
    await expect(page.locator('#fwa-part-0')).toHaveValue('Choose the site; agree the budget; plan the opening week.');
    await expect(sheet.locator('[data-status]')).toContainText('is back');
    const [dl] = await Promise.all([page.waitForEvent('download'), sheet.locator('[data-download]').click()]);
    expect(dl.suggestedFilename()).toBe('framework-apply-raci-matrix-worksheet.txt');
    const text = readFileSync(await dl.path(), 'utf8');
    expect(text).toContain('TASKS AND DECISIONS (THE ROWS)\nChoose the site');
    expect(text).toContain('Who decides the menu at the new café?');
    await expectDeclared(page);
    const clear = sheet.locator('[data-clear]');
    await clear.click();
    await expect(clear).toHaveText('Press again to clear');
    await clear.click();
    await expect(page.locator('#fwa-decision')).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('bb:framework-apply:raci-matrix'))).toBeNull();
  });
});

test.describe('the Lab tools in the Strategy Studio', () => {
  test('Scenario planner: ratings move an option between verdicts, the axes are checked, and the work is kept', async ({ page }) => {
    await page.goto('/strategy-studio/scenarios/');
    const root = await studio(page, 'scenarios');
    const row = root.locator('[data-outputs] tbody tr', { hasText: 'City bikes for dealers abroad' });
    await expect(row).toContainText('Robust');
    await root.locator('#sx-scenarios-o3-a1b1').selectOption('2');
    await expect(row).toContainText('Fragile');
    await root.locator('#sx-scenarios-axisB').selectOption('d1');
    await expect(root.locator('[data-outputs]')).toContainText('The two axes are the same driver.');
    await root.locator('#sx-scenarios-axisB').selectOption('d2');
    await expect(root.locator('[data-reading]').first()).toContainText('Four futures built on how far cities restrict vans');
    // Naming a future renames its column and the rating labels.
    await root.locator('#sx-scenarios-a2b2-name').fill('Fleet rush');
    await expect(root.locator('label[for="sx-scenarios-o1-a2b2"]')).toContainText('Fleet rush');
    await root.locator('[data-act="add-driver"]').click();
    await expect(page.locator(':focus')).toHaveAttribute('data-k', 'drivers.d7.name');
    await page.keyboard.type('Rider shortages');
    await page.waitForTimeout(500);
    await page.reload();
    const again = await studio(page, 'scenarios');
    await expect(again.locator('#sx-scenarios-d7-name')).toHaveValue('Rider shortages');
    const [json] = await Promise.all([page.waitForEvent('download'), again.locator('[data-tool-act="json"]').click()]);
    expect(json.suggestedFilename()).toBe('northvale-cycles-scenarios.json');
    await expectDeclared(page);
  });

  test('Stakeholder salience: urgency makes the bank definitive, power the delivery firms', async ({ page }) => {
    await page.goto('/strategy-studio/stakeholder-salience/');
    const root = await studio(page, 'stakeholder-salience');
    await expect(root.locator('[data-place="s4"]')).toContainText('Dominant');
    await root.locator('#sx-stakeholder-salience-s4-urgent').selectOption('yes');
    await expect(root.locator('[data-place="s4"]')).toContainText('Definitive');
    await expect(root.locator('[data-outputs] tbody tr', { hasText: 'The bank' })).toContainText('Definitive');
    await root.locator('#sx-stakeholder-salience-s6-power').selectOption('utilitarian');
    await expect(root.locator('[data-place="s6"]')).toContainText('Definitive');
    await expect(root.locator('svg.chart desc').first()).toContainText('6 Delivery firms: definitive');
  });

  test('Strategic fit: closing a capability gap raises readiness; conflicts can be added', async ({ page }) => {
    await page.goto('/strategy-studio/strategic-fit/');
    const root = await studio(page, 'strategic-fit');
    await expect(root.locator('[data-reading]').first()).toContainText('capability readiness 57% (major gaps)');
    // Servicing from 2 to 5: (49 + 5 x 3) / 86 = 64 / 86, 74%.
    await root.locator('#sx-strategic-fit-c3-cur').selectOption('5');
    await expect(root.locator('[data-reading]').first()).toContainText('capability readiness 74% (gaps to close)');
    await expect(root.locator('[data-reading]').first()).toContainText('the organization is not aligned behind the strategy');
    await root.locator('[data-act="add-conflict"]').click();
    await expect(page.locator(':focus')).toHaveAttribute('data-k', 'conflicts.k4.a');
  });
});

test.describe('the Lab without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the hub lists every question with its frameworks', async ({ page }) => {
    await page.goto('/frameworks/lab/');
    await expect(page.locator('.fl-q')).toHaveCount(18);
    await expect(page.locator('.fl-filters')).toBeHidden();
    await expect(page.locator('#q-grow')).toContainText('The Ansoff matrix');
  });

  test('a framework page offers its worksheet, and says it is not saved', async ({ page }) => {
    await page.goto('/frameworks/value-chain/');
    await expect(page.locator('#apply .fw-sheet')).toBeVisible();
    await expect(page.locator('#apply')).toContainText('Not saved without JavaScript');
    await expect(page.locator('#apply [data-download]')).toBeHidden();
  });

  for (const tool of ['scenarios', 'stakeholder-salience', 'strategic-fit']) {
    test(`${tool} reads as a finished worked example`, async ({ page }) => {
      await page.goto(`/strategy-studio/${tool}/`);
      await expect(page.locator('.sx-nojs')).toBeVisible();
      await expect(page.locator('[data-outputs] .sx-out__block').first()).toBeVisible();
      await expect(page.locator('[data-outputs] svg.chart').first()).toBeVisible();
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
