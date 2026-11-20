/**
 * The connections between subtopics and the rest of the platform, driven as
 * a reader would: the connections map (a unit filter, choosing a subtopic by
 * click, by keyboard and from the address, the panel beside the map, and the
 * readable lists that are also the page without JavaScript); a subtopic
 * page's tools, connections and connected learning, down to the question
 * bank filtered to it; the glossary's filters, its two counted parts, its
 * tolerant search, formula links and A to Z on a phone; and the link back to
 * the subtopic on every kind of tool page.
 */
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { parse } from 'yaml';

const read = (path: string) => parse(readFileSync(new URL(`../../src/content/${path}`, import.meta.url), 'utf8')) as Array<Record<string, unknown>>;
const connections = read('data/topic-connections.yaml') as Array<{ id: string; between: [string, string] }>;
const worked = (code: string) => connections.filter((x) => x.between.includes(code)).length;
/** Every glossary term, from its YAML files: the IB terms and those beyond the course (provenance: enrichment). */
const glossary = readdirSync(new URL('../../src/content/glossary/', import.meta.url))
  .filter((f) => f.endsWith('.yaml'))
  .flatMap((f) => read(`glossary/${f}`) as Array<{ id: string; provenance?: string; level?: string; subtopics?: string[] }>);
const ibTerms = glossary.filter((g) => g.provenance !== 'enrichment');
const beyondTerms = glossary.filter((g) => g.provenance === 'enrichment');

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
}

const map = async (page: Page) => {
  const root = page.locator('[data-ix="connections"]');
  await expect(root).toHaveClass(/is-enhanced/);
  return root;
};
const node = (page: Page, code: string) => page.locator(`.tcm-node[data-code="${code}"]`);

test.describe('the connections map', () => {
  test('draws every subtopic and every worked connection, and lists them in words', async ({ page }) => {
    await page.goto('/ib/connections/');
    const root = await map(page);
    await expect(root.locator('.tcm-node')).toHaveCount(37);
    await expect(root.locator('.tcm-edge--worked')).toHaveCount(connections.length);
    await expect(root.locator('.tcm-link')).toHaveCount(connections.length);
    await expect(root.locator('.tcm-topic')).toHaveCount(37);
    expect(connections.length).toBeGreaterThanOrEqual(40);
    // The five the platform leads with come first, in course order.
    await expect(root.locator('.tcm-links').first().locator('.tcm-link__title')).toHaveText([
      /Sustainability and stakeholder interests/,
      /Business growth and sources of finance/,
      /HR decisions and productivity/,
      /Marketing decisions and financial performance/,
      /Operations and quality management/,
    ]);
    await expectNoAxeViolations(page);
  });

  test('narrows the map and both lists to a unit, and says so', async ({ page }) => {
    await page.goto('/ib/connections/');
    const root = await map(page);
    await root.locator('label.tcm-unit', { hasText: 'Unit 3' }).click();
    await expect(root.locator('[data-status]')).toContainText('Unit 3, Finance and accounts: 9 subtopics');
    await expect(node(page, '3.5')).not.toHaveClass(/is-dim/);
    await expect(node(page, '1.1')).toHaveClass(/is-dim/);
    await expect(root.locator('[data-unit-block="3"]')).toBeVisible();
    await expect(root.locator('[data-unit-block="1"]')).toBeHidden();
    const shown = await root.locator('.tcm-link:visible').count();
    expect(shown).toBe(connections.filter((x) => x.between.some((c) => c.startsWith('3.'))).length);
    await expect(root.locator('[data-links-count]')).toContainText(`${shown} worked connections that reach Unit 3`);
    await root.locator('label.tcm-unit', { hasText: 'All units' }).click();
    await expect(node(page, '1.1')).not.toHaveClass(/is-dim/);
    await expect(root.locator('.tcm-link:visible')).toHaveCount(connections.length);
  });

  test('shows a chosen subtopic’s connections on the map and in the panel', async ({ page }) => {
    await page.goto('/ib/connections/');
    const root = await map(page);
    await node(page, '3.5').click();
    await expect(node(page, '3.5')).toHaveClass(/is-selected/);
    await expect(node(page, '3.5')).toHaveAttribute('aria-current', 'true');
    await expect(root.locator('.tcm-edge--worked.is-on')).toHaveCount(worked('3.5'));
    await expect(node(page, '4.5')).toHaveClass(/is-near/);
    await expect(node(page, '1.1')).toHaveClass(/is-dim/);
    const panel = root.locator('[data-panel-body]');
    await expect(panel.locator('h3')).toContainText('3.5 Profitability and liquidity ratio analysis');
    await expect(panel).toContainText('Marketing decisions and financial performance');
    await expect(panel.locator('[id]')).toHaveCount(0);
    await expect(root.locator('[data-status]')).toContainText(`3.5 Profitability and liquidity ratio analysis: ${worked('3.5')} worked connections`);
    // The notes' links are drawn for the chosen subtopic even while the rest stay hidden.
    expect(await root.locator('.tcm-edge--notes.is-on').count()).toBeGreaterThan(0);
    await expect(root.locator('.tcm-edge--notes:not(.is-on)').first()).toBeHidden();
    await root.locator('[data-notes-toggle]').check();
    await expect(root.locator('.tcm-edge--notes:not(.is-on)').first()).toBeVisible();
    await root.getByRole('button', { name: 'Clear the selection' }).click();
    await expect(node(page, '3.5')).not.toHaveClass(/is-selected/);
    await expect(node(page, '3.5')).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test('works from the keyboard: arrows round the ring, Enter or Space to choose, Escape to clear', async ({ page }) => {
    await page.goto('/ib/connections/');
    const root = await map(page);
    // One stop in the tab order for the whole ring.
    await expect(root.locator('.tcm-node[tabindex="0"]')).toHaveCount(1);
    await node(page, '1.1').focus();
    await page.keyboard.press('ArrowRight');
    await expect(node(page, '1.2')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(node(page, '5.9')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(node(page, '1.1')).toBeFocused();
    await page.keyboard.press('End');
    await expect(node(page, '5.9')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(node(page, '5.9')).toHaveClass(/is-selected/);
    await expect(page).toHaveURL(/\/ib\/connections\/$/);
    await page.keyboard.press('Escape');
    await expect(node(page, '5.9')).not.toHaveClass(/is-selected/);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press(' ');
    await expect(node(page, '1.1')).toHaveClass(/is-selected/);
    await expect(root.locator('.tcm-node[tabindex="0"]')).toHaveCount(1);
    // With a unit chosen, the arrows keep to it.
    await root.locator('label.tcm-unit', { hasText: 'Unit 2' }).click();
    await node(page, '2.7').focus();
    await page.keyboard.press('ArrowRight');
    await expect(node(page, '2.1')).toBeFocused();
  });

  test('opens on the subtopic named in the address, as the subtopic pages link to it', async ({ page }) => {
    await page.goto('/ib/connections/#t-2-6');
    await map(page);
    await expect(node(page, '2.6')).toHaveClass(/is-selected/);
    await expect(page.locator('[data-panel-body] h3')).toContainText('2.6 Communication');
  });

  test('a subtopic in the list can be shown on the map', async ({ page }) => {
    await page.goto('/ib/connections/');
    const root = await map(page);
    await root.locator('#t-4-6').getByRole('button', { name: 'Show 4.6 on the map' }).click();
    await expect(node(page, '4.6')).toHaveClass(/is-selected/);
    await expect(node(page, '4.6')).toBeFocused();
  });

  test('scrolls inside its own region on a phone, never the page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/ib/connections/');
    await map(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const region = page.locator('[data-map]');
    expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(page.locator('label.tcm-unit').first()).toBeInViewport();
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('is a readable list, and every point on the map links to its entry', async ({ page }) => {
      await page.goto('/ib/connections/');
      await expect(page.locator('.tcm-controls')).toBeHidden();
      await expect(page.locator('[data-panel]')).toBeHidden();
      await expect(page.locator('.tcm-link').first()).toBeVisible();
      await expect(page.locator('#t-3-5')).toContainText('Marketing decisions and financial performance');
      const hrefs = await page.locator('.tcm-node').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs).toHaveLength(37);
      for (const h of hrefs) await expect(page.locator(h ?? '#none')).toHaveCount(1);
      await page.locator('#t-3-5 a[href^="#link-"]').first().click();
      await expect(page).toHaveURL(/#link-/);
    });
  });
});

test.describe('a subtopic page', () => {
  test('lists its tools, its connections and everything connected, down to the bank filtered to it', async ({ page }) => {
    await page.goto('/topics/communication/');
    // 2.6 had no tools section before; its tools come from tools that do not name it themselves, each with what to use it for.
    const tools = page.locator('#tools');
    await expect(tools.getByRole('heading', { name: 'Tools and practice' })).toBeVisible();
    await expect(tools.locator('a[href="/people-and-culture/organization-chart/"]')).toBeVisible();
    await expect(tools).toContainText('chains of command');
    const conn = page.locator('#how-it-connects');
    await expect(conn.locator('.tcs__item')).toHaveCount(worked('2.6'));
    await expect(conn).toContainText('Exam-style question');
    await expect(conn.locator('a[href="/ib/connections/#t-2-6"]')).toBeVisible();
    const cl = page.locator('#connected-learning');
    await expect(cl.locator('[data-group="revise"] a[href="/mindmaps/communication/"]')).toBeVisible();
    await expect(cl.locator('[data-group="briefings"] .tag', { hasText: 'Fictional' }).first()).toBeVisible();
    const bank = cl.locator('[data-group="bank"] a');
    await expect(bank).toHaveAttribute('href', '/assessment/question-bank/?topic=2.6');
    await bank.click();
    await page.waitForURL(/\/assessment\/question-bank\/\?topic=2\.6$/);
    // The bank is a long page; its script runs once it has all loaded.
    await expect(page.locator('[data-ix="bank"]')).toHaveClass(/is-enhanced/, { timeout: 30_000 });
    await expect(page.locator('#bf-code')).toHaveValue('2.6');
    await expect(page.locator('[data-count]')).toContainText(/^Showing \d+ of \d+ questions/);
    await page.locator('#bf-code').selectOption('3.5');
    await expect(page).toHaveURL(/\?topic=3\.5$/);
  });

  test('labels Business Intelligence real-world and Advanced Management enrichment', async ({ page }) => {
    await page.goto('/topics/management-information-systems/');
    const cl = page.locator('#connected-learning');
    await expect(cl.locator('[data-group="intelligence"] .tag').first()).toHaveText('Real-world');
    await expect(cl.locator('[data-group="advanced"] .tag').first()).toHaveText('Enrichment');
    await expect(cl.locator('[data-group="tools"] a')).toHaveAttribute('href', '#tools');
  });
});

test.describe('the glossary', () => {
  const visible = (page: Page) => page.locator('[data-entry]:visible');

  test('keeps the IB terms and the terms beyond the course apart, each with its count', async ({ page }) => {
    await page.goto('/glossary/');
    const ib = page.locator('[data-part="ib"]');
    const beyond = page.locator('[data-part="beyond"]');
    const nIb = await ib.locator('[data-entry]').count();
    const nBeyond = await beyond.locator('[data-entry]').count();
    expect(nIb).toBe(ibTerms.length);
    expect(nBeyond).toBe(beyondTerms.length);
    await expect(ib.locator('[data-part-count="ib"]')).toHaveText(String(nIb));
    await expect(beyond.locator('[data-part-count="beyond"]')).toHaveText(String(nBeyond));
    await expect(beyond.getByRole('heading', { name: /Beyond the IB course/ })).toContainText('Enrichment');
    expect(await beyond.locator('[data-entry] .tag--enrichment').count()).toBe(nBeyond);
    await expect(page.locator('label[for="gl-qual"]')).toHaveText('Qualification');
  });

  test('filters by subtopic, keeps it in the address, and counts each part', async ({ page }) => {
    await page.goto('/glossary/');
    await expect(page.locator('[data-ix="glossary"]')).toHaveClass(/is-enhanced/);
    await page.locator('#gl-topic').selectOption('3.5');
    await expect(page).toHaveURL(/\?topic=3\.5$/);
    const codes = await visible(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-codes') ?? ''));
    expect(codes.length).toBeGreaterThan(10);
    for (const c of codes) expect(c.split(' ')).toContain('3.5');
    await expect(page.locator('[data-part="beyond"]')).toBeHidden();
    await expect(page.locator('[data-count]')).toHaveText(`${codes.length} terms from the IB course and 0 beyond it match`);
    await expect(page.locator('[data-part-of="ib"]')).toBeVisible();
    // The level filter still works with it.
    await page.locator('#gl-level').selectOption('hl');
    const hl = ibTerms.filter((g) => g.subtopics?.includes('3.5') && g.level === 'HL').length;
    if (hl) await expect(visible(page)).toHaveCount(hl);
    else await expect(page.locator('[data-none]')).toBeVisible();
    await page.goto('/glossary/?topic=5.6');
    await expect(page.locator('#gl-topic')).toHaveValue('5.6');
    for (const c of await visible(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-codes') ?? ''))) expect(c.split(' ')).toContain('5.6');
  });

  test('finds a term from the start of a word, and forgives a slip when nothing matches exactly', async ({ page }) => {
    await page.goto('/glossary/');
    await expect(page.locator('[data-ix="glossary"]')).toHaveClass(/is-enhanced/);
    await page.locator('#gq').fill('gearing');
    await expect(visible(page).first()).toBeVisible();
    await expect(page.locator('#term-gearing-ratio')).toBeVisible();
    await page.locator('#gq').fill('liqudity');
    await expect(page.locator('#term-liquidity')).toBeVisible();
    await expect(page.locator('[data-count]')).toContainText('allowing for a slip in the spelling');
    await expect(page).toHaveURL(/\?q=liqudity$/);
  });

  test('links a formula to where it is worked', async ({ page }) => {
    await page.goto('/glossary/');
    await expect(page.locator('#term-return-on-capital-employed .gl-entry__calc')).toHaveAttribute('href', '/finance-desk/lab/roce/');
    await page.goto('/glossary/break-even-quantity/');
    const link = page.locator('[data-formula-link]');
    await expect(link).toHaveAttribute('href', '/finance-desk/lab/break-even-quantity/');
    await link.click();
    await expect(page.locator('h1')).toHaveText('Break-even quantity');
  });

  test('on a phone, browses from one opaque A to Z row that scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/glossary/');
    const az = page.locator('.gl-az');
    const tops = await az.locator('li').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))]);
    expect(tops).toHaveLength(1);
    expect(await az.locator('ul').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const bg = await az.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toMatch(/^rgb\(/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('on a term page, the side rail is no taller than what it holds', async ({ page }) => {
    await page.goto('/glossary/return-on-capital-employed/');
    const side = page.locator('.gt__side');
    const [box, last] = await Promise.all([side.boundingBox(), side.locator(':scope > *').last().boundingBox()]);
    expect(box && last).toBeTruthy();
    expect(box!.y + box!.height - (last!.y + last!.height)).toBeLessThan(60);
  });
});

test.describe('the way back from a tool to its subtopic', () => {
  const PAGES: Array<[string, string]> = [
    ['/finance-desk/costs-and-revenue/', '3.3 Costs and revenues'],
    ['/finance-desk/break-even/', '5.5 Break-even analysis'],
    ['/finance-desk/contribution/', '5.5 Break-even analysis'],
    ['/finance-desk/ratios/', '3.5 Profitability and liquidity ratio analysis'],
    ['/finance-desk/cash-flow/', '3.7 Cash flow'],
    ['/finance-desk/investment-appraisal/', '3.8 Investment appraisal'],
    ['/finance-desk/lab/gearing-ratio/', '3.6 Efficiency ratio analysis'],
    ['/finance-desk/advanced/capital-budgeting/', '3.8 Investment appraisal'],
    ['/strategy-studio/stakeholder-map/', '1.4 Stakeholders'],
    ['/market-studio/customer-persona/', '4.2 Marketing planning'],
    ['/people-and-culture/organization-chart/', '2.2 Organizational structure'],
    ['/operations-floor/location-assessment/', '5.4 Location'],
    ['/entrepreneurship-lab/unit-economics/', '5.5 Break-even analysis'],
    ['/case-room/halden-diagnosis/', '2.3 Leadership and management'],
  ];

  for (const [path, subtopic] of PAGES) {
    test(`${path} leads back to ${subtopic}`, async ({ page }) => {
      await page.goto(path);
      const back = page.locator('[data-back-to-topic] .btt__link');
      await expect(back).toHaveText(`← Back to ${subtopic}`);
      // Near the top: within the first screen of a desktop window.
      const box = await back.boundingBox();
      expect(box!.y).toBeLessThan(900);
    });
  }

  test('names the other subtopics a desk serves, and leads to the subtopic page', async ({ page }) => {
    await page.goto('/finance-desk/ratios/');
    await expect(page.locator('[data-back-to-topic] .btt__also')).toContainText('3.6 Efficiency ratio analysis');
    await page.locator('[data-back-to-topic] .btt__link').click();
    await expect(page).toHaveURL(/\/topics\/profitability-and-liquidity-ratio-analysis\/$/);
  });

  test('is absent where a tool serves no subtopic', async ({ page }) => {
    await page.goto('/strategy-studio/five-forces/');
    await expect(page.locator('[data-back-to-topic]')).toHaveCount(0);
  });
});
