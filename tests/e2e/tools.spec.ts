/**
 * The newest working tools, used as a learner would use them: the People and
 * Culture and Operations Floor tools, the internal assessment tools, the
 * Paper 1 workspace, Paper 2 calculation practice and the question bank.
 *
 * Every tool must start without an error, answer a change with new results,
 * and (where it keeps work) still show that work after a reload. The models
 * behind the figures are tested by hand-worked values in tests/unit; this
 * spec proves that the pages wire them up.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Wait for the tool's script to take over its section, and fail on a crash. */
async function ready(page: Page, ix: string): Promise<Locator> {
  const root = page.locator(`[data-ix="${ix}"]`).first();
  await expect(root).toHaveAttribute('data-ready', 'true');
  await expect(root).not.toHaveClass(/is-broken/);
  await expect(root.locator('[data-error]').first()).toBeHidden();
  return root;
}

/**
 * What the reader sees in a tool, without the lines that give the time of
 * saving and the announcements made only to screen readers (whose text is
 * not on screen); and, separately, the state of its
 * controls, which change as soon as the reader types, before the tool has
 * worked anything out.
 */
const snapshot = (root: Locator) =>
  root.evaluate((el) => {
    const controls = [...el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')]
      .filter((c) => c.type !== 'file' && c.type !== 'hidden')
      .map((c) => (c instanceof HTMLInputElement && (c.type === 'radio' || c.type === 'checkbox') ? (c.checked ? '1' : '0') : c.value))
      .join('|');
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.sr-only, [data-save-status], [data-saved], script, template').forEach((n) => n.remove());
    return { text: (copy.textContent ?? '').replace(/\s+/g, ' ').trim(), controls };
  });

/**
 * Change one thing as a reader would: a figure (half as much again), else a
 * choice, else a list, else a box to tick, else some words. The control is
 * the first visible one in the tool's form, never in its toolbar.
 */
async function changeSomething(root: Locator): Promise<string> {
  const picked = await root.evaluate((el) => {
    const scope = el.querySelector<HTMLElement>('[data-form]') ?? el;
    const usable = (c: HTMLElement) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !c.closest('[data-toolbar], [hidden], .sr-only') && !(c as HTMLInputElement).disabled && !(c as HTMLInputElement).readOnly;
    };
    const all = (sel: string) => [...scope.querySelectorAll<HTMLElement>(sel)].filter(usable);
    document.querySelectorAll('[data-smoke]').forEach((n) => n.removeAttribute('data-smoke'));
    const mark = (c: HTMLElement, kind: string, value = '') => {
      c.setAttribute('data-smoke', '1');
      return { kind, value };
    };
    const num = all('input[type="number"], input[inputmode="decimal"], input[inputmode="numeric"]')[0] as HTMLInputElement | undefined;
    if (num) {
      const v = Number(num.value || 0);
      const step = Number(num.step) > 0 ? Number(num.step) : 1;
      let next = v ? v * 1.5 : 5 * step;
      next = Math.round(next / step) * step;
      const max = num.max === '' ? Infinity : Number(num.max);
      const min = num.min === '' ? -Infinity : Number(num.min);
      if (next > max || next === v) next = Math.max(min, Math.round((v / 2) / step) * step);
      if (next === v) next = v + step <= max ? v + step : v - step;
      return mark(num, 'fill', String(Number(next.toFixed(6))));
    }
    const radio = all('input[type="radio"]').find((r) => !(r as HTMLInputElement).checked);
    if (radio) return mark(radio, 'check');
    const select = all('select').find((s) => (s as HTMLSelectElement).options.length > 1) as HTMLSelectElement | undefined;
    if (select) {
      const other = [...select.options].find((o) => !o.selected && !o.disabled && o.value !== '') ?? [...select.options].find((o) => !o.selected);
      return mark(select, 'select', other?.value ?? '');
    }
    const box = all('input[type="checkbox"]').find((b) => !(b as HTMLInputElement).checked);
    if (box) return mark(box, 'check');
    const text = all('textarea, input[type="text"], input:not([type])')[0];
    if (text) return mark(text, 'fill', 'Staff turnover rose after the move to the new site.');
    return { kind: 'none', value: '' };
  });
  const target = root.locator('[data-smoke="1"]');
  if (picked.kind === 'fill') {
    await target.fill(picked.value);
    await target.press('Tab');
  } else if (picked.kind === 'check') await target.check();
  else if (picked.kind === 'select') await target.selectOption(picked.value);
  return picked.kind;
}

/** A change a reader would make, for the tools where the first control is not a fair test. */
type Act = (root: Locator) => Promise<void>;

/** Change something, see the results change, reload, and see the work kept. */
async function useAndKeep(page: Page, url: string, ix: string, act?: Act) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  const root = await ready(page, ix);
  const before = (await snapshot(root)).text;
  if (act) await act(root);
  else expect(await changeSomething(root), 'the tool has a control a reader can change').not.toBe('none');
  // The results, not just the control, must change; the tools save in the same step as they redraw.
  await expect.poll(async () => (await snapshot(root)).text, { message: 'the tool answers the change' }).not.toBe(before);
  const after = await snapshot(root);
  await page.reload();
  const again = await ready(page, ix);
  await expect.poll(() => snapshot(again), { message: 'the work is still there after a reload' }).toEqual(after);
  expect(errors, 'no script errors').toEqual([]);
}

test.describe('People and Culture tools', () => {
  const tools: Array<[string, string, Act?]> = [
    ['motivation-analysis', 'motivation-analysis'],
    ['leadership-scenarios', 'scenario-chooser'],
    // More people in a post with no one reporting to it: a change the chart can draw. (A post held by several people cannot manage anyone, so the first post is not a fair test.)
    [
      'organization-chart',
      'org-chart',
      async (root) => {
        const count = root.locator('li[data-post]').last().locator('[name="count"]');
        await count.fill('5');
        await count.press('Tab');
        await expect(root.locator('[data-problems]')).toBeHidden();
      },
    ],
    ['workforce-planning', 'workforce-planner'],
    ['change-planner', 'change-planner'],
  ];
  for (const [slug, ix, act] of tools) {
    test(`${slug} answers a change and keeps the work`, async ({ page }) => {
      await useAndKeep(page, `/people-and-culture/${slug}/`, ix, act);
    });
  }
});

test.describe('Operations Floor tools', () => {
  const tools: Array<[string, string]> = [
    ['production-methods', 'scenario-chooser'],
    ['location-assessment', 'location-assessment'],
    ['capacity-and-productivity', 'capacity-calculator'],
    ['stock-control', 'stock-simulator'],
    ['economic-order-quantity', 'eoq-calculator'],
  ];
  for (const [slug, ix] of tools) {
    test(`${slug} answers a change and keeps the work`, async ({ page }) => {
      await useAndKeep(page, `/operations-floor/${slug}/`, ix);
    });
  }
});

/** A date some days from now, as a date field takes it. */
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

test.describe('Internal assessment tools', () => {
  const tools: Array<[string, string, Act?]> = [
    // A named document longer than the guide's recommended five A4 pages draws the warning. (The list starts empty, and a document without a title is not counted.)
    [
      'documents',
      'ia-documents',
      async (root) => {
        await root.locator('[data-doc="0"] [data-f="title"]').fill('Annual report extract');
        const pages = root.locator('#sd-0-pages');
        await pages.fill('12');
        await pages.press('Tab');
        await expect(root.locator('[data-set]')).toContainText('12 pages. The guide recommends no more than the equivalent of five A4 pages');
      },
    ],
    ['key-concept', 'ia-concept'],
    ['progress', 'ia-progress'],
    // The plan is made from the reader's own deadline.
    [
      'timeline',
      'ia-timeline',
      async (root) => {
        const deadline = root.locator('input[name="deadline"]');
        await deadline.fill(daysAhead(120));
        await deadline.press('Tab');
        await expect(root.locator('[data-title]')).toContainText('Your plan:');
      },
    ],
    ['tool-selection', 'ia-tools'],
  ];
  for (const [slug, ix, act] of tools) {
    test(`${slug} answers a change and keeps the work`, async ({ page }) => {
      await useAndKeep(page, `/assessment/internal-assessment/${slug}/`, ix, act);
    });
  }
});

test('Paper 2 practice explains a slip, shows the working and accepts the right answer', async ({ page }) => {
  await page.goto('/assessment/paper-2/practice/');
  const root = await ready(page, 'p2-practice');
  const answer = root.locator('#pp-answer');
  const check = root.getByRole('button', { name: 'Check answer' });

  await answer.fill('lots');
  await check.click();
  await expect(root.locator('[data-feedback]')).toContainText('Enter a number.');
  await expect(answer).toHaveAttribute('aria-invalid', 'true');

  await answer.fill('0.000123');
  await check.click();
  await expect(root.locator('[data-feedback]')).toContainText(/Not this time\.|Nearly\./);
  await expect(answer).not.toHaveAttribute('aria-invalid', 'true');
  await expect(root.locator('[data-session]')).toHaveText('This session: 0 of 1 question right first time.');

  await root.locator('[data-reveal]').click();
  await expect(root.locator('[data-live]')).toContainText('The answer is ');
  const said = (await root.locator('[data-live]').textContent()) ?? '';
  const right = /The answer is (.+?)\. The working/.exec(said)?.[1] ?? '';
  expect(right).not.toBe('');
  await answer.fill(right);
  await check.click();
  await expect(root.locator('[data-feedback]')).toContainText('Right.');
});

test('the question bank searches, and keeps a self-rating after a reload', async ({ page }) => {
  await page.goto('/assessment/question-bank/');
  const root = await ready(page, 'bank');
  const shown = () => root.locator('[data-bq]:visible').count();
  const all = await shown();
  await root.locator('#bf-q').fill('break-even');
  await expect.poll(shown).toBeLessThan(all);
  expect(await shown()).toBeGreaterThan(0);

  const first = root.locator('[data-bq]:visible').first();
  const id = await first.getAttribute('data-bq');
  await first.locator('[data-rate] input[value="1"]').check();
  await expect(first.locator('[data-clear-record]')).toBeVisible();

  await page.reload();
  await ready(page, 'bank');
  await expect(page.locator(`[data-bq="${id}"] [data-rate] input[value="1"]`)).toBeChecked();
});

test('the Paper 1 workspace tags a sentence as evidence and keeps it', async ({ page }) => {
  await page.goto('/assessment/paper-1/workspace/');
  const root = await ready(page, 'p1-workspace');
  const board = root.locator('[data-board]');
  const before = await board.textContent();
  await root.locator('.ws-s').first().click();
  const tag = root.locator('[data-palette] button[data-tag]').first();
  await expect(tag).toBeVisible();
  await tag.click();
  await expect(root.locator('[data-live]')).toContainText('Tagged as');
  await expect.poll(() => board.textContent()).not.toBe(before);
  const after = await board.textContent();

  await page.reload();
  const again = await ready(page, 'p1-workspace');
  await expect.poll(() => again.locator('[data-board]').textContent()).toBe(after);
});
