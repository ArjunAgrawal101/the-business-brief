/**
 * Visual learning: the diagrams a reader can explore, switch, compare, change
 * and expand, each with a keyboard way in and a reading without JavaScript;
 * their labels at 12 pixels or more on a 320 pixel screen; no diagram or
 * framework page scrolling sideways at 320 pixels; and the mindmaps' phone
 * mode, readable zoom and informative index.
 */
import { expect, test, type Page } from '@playwright/test';
import { builtPages } from './pages';

const NEW = [
  'growth-timeline',
  'entity-comparison',
  'stakeholder-conflict',
  'triple-bottom-line',
  'span-of-control',
  'leadership-compare',
  'communication-flows',
  'finance-decision-tree',
  'ratio-dashboard',
  'cash-flow-timeline',
  'investment-compare',
  'segmentation-map',
  'plc-extension-strategies',
  'operations-compare',
  'quality-management',
  'lean-process',
  'toolkit-map',
];

/** The smallest text drawn in the visible diagrams, in CSS pixels on screen. */
async function smallestText(page: Page): Promise<{ px: number; text: string }> {
  return page.evaluate(() => {
    let min = { px: Infinity, text: '' };
    for (const svg of document.querySelectorAll<SVGSVGElement>('figure.dg svg')) {
      const box = svg.getBoundingClientRect();
      if (!box.width || !svg.checkVisibility()) continue;
      const vb = svg.viewBox.baseVal;
      const k = box.width / vb.width;
      for (const t of svg.querySelectorAll('text')) {
        if (!t.textContent?.trim()) continue;
        const px = parseFloat(getComputedStyle(t).fontSize) * k;
        if (px < min.px) min = { px, text: t.textContent.trim().slice(0, 40) };
      }
    }
    return min;
  });
}

test.describe('exploring the parts of a diagram', () => {
  test('focus, hover and Enter: the explanation shows, and the part opens its subtopic', async ({ page }) => {
    await page.goto('/diagrams/communication-flows/');
    const readout = page.locator('[data-readout]');
    await expect(readout).toContainText('Point to a flow');
    // The list of parts closes once the readout carries the explanations; it is still one click away.
    await expect(page.locator('[data-parts]')).not.toHaveAttribute('open', '');
    const upward = page.locator('.dg__view--wide a.dgp[data-part="upward"]');
    await upward.focus();
    await expect(readout).toContainText('Upward communication');
    await expect(readout).toContainText('feedback, reports');
    await expect(upward).toHaveAttribute('aria-describedby', /-k-upward$/);
    await page.locator('.dg__view--wide a.dgp[data-part="horizontal"]').hover();
    await expect(readout).toContainText('Horizontal communication');
    await upward.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/topics\/communication\/$/);
  });

  test('every part can be reached from the keyboard', async ({ page }) => {
    await page.goto('/diagrams/triple-bottom-line/');
    const parts = page.locator('.dg__view--wide a.dgp');
    await expect(parts).toHaveCount(7);
    for (const p of await parts.all()) {
      await p.focus();
      await expect(p).toBeFocused();
    }
    await expect(page.locator('[data-readout]')).toContainText('Sustainable');
  });
});

test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the first tap on a part explains it and the second opens it', async ({ page }) => {
    await page.goto('/diagrams/quality-management/');
    const part = page.locator('.dg__view--narrow a.dgp[data-part="qa"]');
    await expect(part).toBeVisible();
    // Tap its heading: quality control sits inside it, in the middle.
    await part.tap({ position: { x: 30, y: 16 } });
    await expect(page.locator('[data-readout]')).toContainText('Quality assurance');
    await expect(page).toHaveURL(/\/diagrams\/quality-management\/$/);
    await part.tap({ position: { x: 30, y: 16 } });
    await expect(page).toHaveURL(/\/topics\/lean-production-and-quality-management\/$/);
  });
});

test.describe('switching, comparing, changing and expanding', () => {
  test('a switch shows one state at a time, from the keyboard too, and says which', async ({ page }) => {
    await page.goto('/diagrams/stakeholder-conflict/');
    await expect(page.locator('[data-state]:visible')).toHaveCount(1);
    await expect(page.locator('[data-state="automate"]')).toBeVisible();
    await page.getByRole('radio', { name: 'Automate the packing line' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-state="relocate"]')).toBeVisible();
    await expect(page.locator('[data-state="automate"]')).toBeHidden();
    await expect(page.locator('[data-status]')).toContainText('Move the factory to a cheaper region');
  });

  test('a comparison sets two side by side and marks what differs, in words', async ({ page }) => {
    await page.goto('/diagrams/entity-comparison/');
    await expect(page.locator('[data-panel]:visible')).toHaveCount(2);
    await page.locator('[data-pick="b"]').selectOption('cooperative');
    await expect(page.locator('[data-panel="cooperative"]')).toBeVisible();
    await expect(page.locator('[data-panel="privately-held"]')).toBeHidden();
    await expect(page.locator('[data-panel="sole-trader"] [data-fact="Liability"] .dg__differs')).toBeVisible();
    await expect(page.locator('[data-status]')).toContainText('Sole trader beside Cooperative');
    await page.locator('[data-pick="b"]').selectOption('sole-trader');
    await expect(page.locator('[data-same]')).toBeVisible();
    await expect(page.locator('[data-panel]:visible')).toHaveCount(1);
  });

  test('the cash flow timeline recalculates, names a bad figure and goes back to the example', async ({ page }) => {
    await page.goto('/diagrams/cash-flow-timeline/');
    const reading = page.locator('[data-read] .dg-read__text');
    await expect(reading).toContainText('February, March and April');
    await page.getByLabel('Customers pay after').selectOption('0');
    await expect(reading).toContainText('It never needs its overdraft.');
    // Paid on delivery, the balance at the end of June is the opening $4,000 plus the $19,800 of profit.
    await expect(page.locator('[data-read] table tbody tr').last()).toContainText('23,800');
    const opening = page.getByLabel('Cash at the start');
    await opening.fill('-5');
    await expect(page.locator('[data-err="opening"]')).toHaveText('Enter a whole number from 0 to 50,000.');
    await expect(opening).toHaveAttribute('aria-invalid', 'true');
    await page.getByRole('button', { name: 'Back to the example’s figures' }).click();
    await expect(opening).not.toHaveAttribute('aria-invalid', 'true');
    await expect(reading).toContainText('February, March and April');
    await expect(page.locator('[data-status]')).toContainText('Larkfield Cycles makes a profit every month');
  });

  test('the span of control redraws the levels as the span changes', async ({ page }) => {
    await page.goto('/diagrams/span-of-control/');
    const rows = page.locator('[data-read] .dg-read__rows');
    await expect(rows).toContainText('Managers above the front line21');
    await page.getByLabel('Span of control (people per manager)').fill('8');
    await expect(rows).toContainText('Managers above the front line9');
    await expect(page.locator('.dg__view--wide svg')).toContainText('8 managers');
  });

  test('the ratio dashboard and the investment comparison follow their figures', async ({ page }) => {
    await page.goto('/diagrams/ratio-dashboard/');
    await page.getByLabel('of which stock').fill('60');
    // (190 − 60) ÷ 118 = 1.10
    await expect(page.locator('[data-read] table')).toContainText('1.10');
    await expect(page.locator('[data-read] .dg-read__text')).not.toContainText('acid test ratio is below 1');
    await page.goto('/diagrams/investment-compare/');
    const table = page.locator('[data-read] table');
    await expect(table.locator('tbody tr').first()).toContainText('2 years and 6 months');
    await page.getByRole('group', { name: 'Project A: a delivery van' }).getByLabel('Year 1').fill('100');
    await expect(table.locator('tbody tr').first()).toContainText('1 year');
  });

  test('the decision tree opens and closes, all at once or one question at a time', async ({ page }) => {
    await page.goto('/diagrams/finance-decision-tree/');
    const questions = page.locator('[data-tree-q]');
    await expect(questions).toHaveCount(5);
    await expect(page.locator('[data-tree-q][open]')).toHaveCount(5);
    await page.getByRole('button', { name: 'Close every question' }).click();
    await expect(page.locator('[data-tree-q][open]')).toHaveCount(1);
    const second = questions.nth(1).locator('summary').first();
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(questions.nth(1)).toHaveAttribute('open', '');
    await expect(page.getByRole('link', { name: 'Retained profit' })).toHaveAttribute('href', '/glossary/retained-profit/');
  });

  test('each diagram downloads as an SVG file and prints on its own', async ({ page, request }) => {
    await page.goto('/diagrams/ratio-dashboard/');
    const link = page.getByRole('link', { name: 'Download SVG' });
    await expect(link).toHaveAttribute('href', '/downloads/diagrams/ratio-dashboard.svg');
    const file = await request.get('/downloads/diagrams/ratio-dashboard.svg');
    expect(file.headers()['content-type']).toContain('image/svg+xml');
    expect(await file.text()).toContain('Profitability and liquidity at a glance');
    await page.evaluate(() => {
      // Printing is the browser's: here only the frame it prints from is checked.
      HTMLIFrameElement.prototype.focus = () => undefined;
    });
    await page.getByRole('button', { name: 'Print' }).click();
    const frame = page.locator('iframe[srcdoc]');
    await expect(frame).toHaveCount(1);
    expect(await frame.getAttribute('srcdoc')).toContain('Profitability and liquidity at a glance');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every interactive diagram reads in full', async ({ page }) => {
    await page.goto('/diagrams/stakeholder-conflict/');
    await expect(page.locator('[data-state]')).toHaveCount(3);
    for (const s of await page.locator('[data-state]').all()) await expect(s).toBeVisible();
    await expect(page.locator('.dg-switch')).toBeHidden();
    await page.goto('/diagrams/entity-comparison/');
    await expect(page.locator('[data-panel]:visible')).toHaveCount(8);
    await page.goto('/diagrams/cash-flow-timeline/');
    await expect(page.locator('[data-live-form]')).toBeHidden();
    await expect(page.locator('[data-read] .dg-read__text')).toContainText('February, March and April');
    await page.goto('/diagrams/communication-flows/');
    await expect(page.locator('[data-parts]')).toHaveAttribute('open', '');
    await expect(page.locator('[data-dg-entry="diagonal"]')).toBeVisible();
    await page.goto('/diagrams/finance-decision-tree/');
    await expect(page.locator('[data-tree-q][open]')).toHaveCount(5);
    await expect(page.getByRole('link', { name: 'Crowdfunding' })).toBeVisible();
  });
});

test.describe('at 320 pixels', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });

  test('every new diagram is drawn for the phone, with no label under 12 pixels', async ({ page }) => {
    test.setTimeout(120_000);
    const small: string[] = [];
    for (const id of NEW) {
      await page.goto(`/diagrams/${id}/`);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const { px, text } = await smallestText(page);
      if (px < 11.95) small.push(`${id}: "${text}" at ${px.toFixed(1)} px`);
    }
    expect(small).toEqual([]);
  });

  test('the framework diagrams are drawn for the phone, with no label under 12 pixels', async ({ page }) => {
    test.setTimeout(180_000);
    const pages = builtPages().filter((p) => /^\/frameworks\/[^/]+\/$/.test(p) && p !== '/frameworks/lab/');
    expect(pages.length).toBeGreaterThanOrEqual(30);
    const small: string[] = [];
    for (const path of pages) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const { px, text } = await smallestText(page);
      if (px < 11.95) small.push(`${path}: "${text}" at ${px.toFixed(1)} px`);
    }
    expect(small).toEqual([]);
  });

  test('no diagram or framework page scrolls sideways, and no diagram scrolls inside its frame', async ({ page }) => {
    test.setTimeout(300_000);
    const pages = builtPages().filter((p) => /^\/(diagrams|frameworks)\//.test(p));
    expect(pages.length).toBeGreaterThanOrEqual(140);
    const wide: string[] = [];
    for (const path of pages) {
      await page.goto(path, { waitUntil: 'load' });
      const found = await page.evaluate(() => {
        const out: string[] = [];
        const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        if (over > 0) out.push(`the page, by ${over} px`);
        for (const el of document.querySelectorAll<HTMLElement>('main *')) {
          if (!/(auto|scroll)/.test(getComputedStyle(el).overflowX)) continue;
          if (el.scrollWidth - el.clientWidth > 1 && el.getClientRects().length) out.push(`${el.className || el.tagName} by ${el.scrollWidth - el.clientWidth} px`);
        }
        return out;
      });
      if (found.length) wide.push(`${path}: ${found.join('; ')}`);
    }
    expect(wide).toEqual([]);
  });
});

test.describe('mindmaps on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('open as an outline in the first screen, with a short toolbar and the rest under More', async ({ page }) => {
    await page.goto('/mindmaps/break-even-analysis/');
    const mm = page.locator('[data-ix="mindmap"]');
    await expect(mm).toHaveAttribute('data-mode', 'outline');
    await expect(page.locator('[data-viewport]')).toBeHidden();
    const firstBranch = page.locator('[data-branch]').first();
    await expect(firstBranch).toBeVisible();
    expect((await firstBranch.boundingBox())!.y).toBeLessThan(844);
    await expect(page.locator('.mm-bar button:visible')).toHaveCount(4);
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'PNG' })).toBeVisible();
  });

  test('fold a branch of the outline, and see only the essentials in the revision view', async ({ page }) => {
    await page.goto('/mindmaps/break-even-analysis/');
    const branch = page.locator('[data-branch]').first();
    await branch.locator('summary').click();
    await expect(branch).not.toHaveAttribute('open', '');
    await branch.locator('summary').click();
    const all = await page.locator('.mm-outline .mo-item:visible').count();
    await page.getByRole('button', { name: 'Revision view' }).click();
    await expect(page.getByRole('button', { name: 'Revision view' })).toHaveAttribute('aria-pressed', 'true');
    const core = await page.locator('.mm-outline .mo-item:visible').count();
    expect(core).toBeGreaterThan(0);
    expect(core).toBeLessThan(all);
  });

  test('switch to the map, which opens folded to its branches with labels of 12 pixels or more', async ({ page }) => {
    await page.goto('/mindmaps/break-even-analysis/');
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(page.locator('[data-ix="mindmap"]')).toHaveAttribute('data-mode', 'map');
    await expect(page.locator('[data-viewport] svg')).toBeVisible();
    await expect(page.locator('[data-status]')).toContainText('drawn map');
    const px = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>('[data-viewport] svg')!;
      const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return Math.min(...[...svg.querySelectorAll('text')].map((t) => parseFloat(getComputedStyle(t).fontSize) * k));
    });
    expect(px).toBeGreaterThanOrEqual(11.95);
  });
});

test.describe('mindmaps on a desktop', () => {
  test('open at a zoom where every label is 12 pixels or more, and Whole map shows it all', async ({ page }) => {
    await page.goto('/mindmaps/motivation-and-demotivation/');
    const scale = () =>
      page.evaluate(() => {
        const svg = document.querySelector<SVGSVGElement>('[data-viewport] svg')!;
        const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        return { px: Math.min(...[...svg.querySelectorAll('text')].map((t) => parseFloat(getComputedStyle(t).fontSize) * k)) };
      });
    expect((await scale()).px).toBeGreaterThanOrEqual(11.95);
    await page.getByRole('button', { name: 'Whole map' }).click();
    // This map is too big to read whole: Whole map trades size for the overview.
    expect((await scale()).px).toBeLessThan(11.95);
  });

  test('the map page links to its topic as a link, and the index previews each map by its branches', async ({ page }) => {
    await page.goto('/mindmaps/break-even-analysis/');
    const link = page.getByRole('link', { name: /^Read the topic: 5\.5 Break-even analysis/ });
    await expect(link).toHaveAttribute('href', '/topics/break-even-analysis/');
    await expect(link).not.toHaveClass(/tag/);
    await page.goto('/mindmaps/');
    const preview = page.locator('.mp', { has: page.getByRole('link', { name: 'Break-even analysis', exact: true }) });
    await expect(preview.getByRole('list', { name: 'The branches of Break-even analysis' }).locator('li')).toHaveCount(5);
    await expect(preview).toContainText('33 ideas in 5 branches');
    await expect(page.locator('.mmi-unit').first()).toContainText(/\d+ maps, \d+ ideas/);
  });
});
