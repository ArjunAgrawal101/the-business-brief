/**
 * Quick revision in a browser: the index of revision sheets with each
 * subtopic's level and the cards due today; a sheet's outlines revealed on
 * demand, its print layout, the three addresses the revision briefs had, and
 * the sheet without JavaScript; and the flashcards, driven as a reader drives
 * them: turning and rating with the mouse and the keyboard, the filters and
 * ?topic=, the cards due today, the session summary, shuffle, reset, the
 * progress kept after a reload, the recall cards on a notes page scheduling
 * the same cards, axe-core in the middle of a session, and the page without
 * JavaScript. Every item kept must be declared on the privacy page.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addDays, localDay, matchesFilters, NO_FILTERS, type Deck, type DeckCard } from '../../src/lib/flashcards';

const FC = '/revision/flashcards/';

const axe = async (page: Page) => {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
};

async function expectDeclared(page: Page) {
  const html = await (await page.request.get('/privacy/')).text();
  const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
  expect(kept.length).toBeGreaterThan(0);
  const undeclared = kept.filter((k) => !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
  expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
}

let deckCache: Deck | null = null;
const deckOf = async (page: Page): Promise<Deck> => (deckCache ??= (await (await page.request.get(`${FC}deck.json`)).json()) as Deck);
const select = (deck: Deck, f: Partial<typeof NO_FILTERS>): DeckCard[] => deck.cards.filter((c) => matchesFilters(c, { ...NO_FILTERS, ...f }));
/** A count as the page writes it: 1,332 cards, 1 card. */
const cardsText = (n: number) => `${n.toLocaleString('en-GB')} ${n === 1 ? 'card' : 'cards'}`;

/** The page's own local calendar day, as the script computes it. */
const today = (page: Page) => page.evaluate(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('bb:cards') ?? 'null') as { v: number; cards: Record<string, { box: number; due: string; seen: number; last: string; rating: string; codes: string[]; title: string }> } | null);

/** The page has its deck: the status line counts the selection. */
const loaded = async (page: Page) => {
  await expect(page.locator('[data-status]')).toContainText('in this selection');
};

const status = (page: Page) => page.locator('[data-status]');
const card = (page: Page) => page.locator('[data-card]');

const seed = async (page: Page, cards: Record<string, unknown>) => {
  await page.goto('/privacy/');
  await page.evaluate((v) => localStorage.setItem('bb:cards', JSON.stringify({ v: 1, cards: v })), cards);
};

test.describe('Quick revision: the index', () => {
  test('lists every subtopic by unit, with its level, its sheet and its flashcards', async ({ page }) => {
    await page.goto('/revision/');
    await expect(page.locator('h1')).toHaveText('Quick revision');
    await expect(page.locator('.rv-row')).toHaveCount(37);
    const perUnit = [6, 7, 9, 6, 9];
    for (const [i, n] of perUnit.entries()) await expect(page.locator(`#unit-${i + 1} .rv-row`)).toHaveCount(n);
    await expect(page.locator('.rv-row[data-code="2.5"] .rv-row__meta .tag')).toHaveText('HL only');
    await expect(page.locator('.rv-row[data-code="1.4"] .rv-row__meta .tag')).toHaveText('SL and HL');
    await expect(page.locator('.rv-row[data-code="2.4"] .rv-row__meta .tag')).toHaveText('SL and HL, with HL-only content');
    for (const slug of ['growth-and-evolution', 'leadership-and-management', 'costs-and-revenues']) await expect(page.locator(`.rv-row a[href="/revision/${slug}/"]`)).toHaveCount(1);
    await expect(page.locator('.rv-row a[href="/revision/flashcards/?topic=3.5"]')).toHaveCount(1);
    expect(await axe(page)).toEqual([]);
  });

  test('says how many cards are due today in this browser', async ({ page }) => {
    await page.goto('/revision/');
    const day = await today(page);
    await page.evaluate(
      ({ due, later }) =>
        localStorage.setItem(
          'bb:cards',
          JSON.stringify({
            v: 1,
            cards: {
              'term:liquidity': { box: 1, due, seen: 1, last: '2026-01-01T09:00:00.000Z', rating: 'again', codes: ['3.5', '3.7'], title: 'Liquidity' },
              'term:current-ratio': { box: 3, due: later, seen: 2, last: '2026-01-01T09:00:00.000Z', rating: 'good', codes: ['3.5'], title: 'Current ratio' },
            },
          }),
        ),
      { due: addDays(day, -1), later: addDays(day, 4) },
    );
    await page.reload();
    await expect(page.locator('[data-due="3.5"]')).toHaveText('1 due today');
    await expect(page.locator('[data-due="3.7"]')).toHaveText('1 due today');
    await expect(page.locator('[data-due="3.6"]')).toBeHidden();
    await expect(page.locator('[data-due-total]')).toContainText('1 card is due today, of 2 cards you have rated');
  });
});

test.describe('Quick revision: a sheet', () => {
  test('gathers definitions, formulae, frameworks, mistakes and exercises, with each outline revealed on demand', async ({ page }) => {
    await page.goto('/revision/profitability-and-liquidity-ratio-analysis/');
    await expect(page.locator('h1')).toContainText('Profitability and liquidity ratio analysis');
    await expect(page.locator('.rs__terms > div')).not.toHaveCount(0);
    await expect(page.locator('.rs__formulae tbody tr')).not.toHaveCount(0);
    await expect(page.locator('.rs__mistakes > li')).not.toHaveCount(0);
    const exercises = page.locator('.rs__exs > li');
    await expect(exercises).toHaveCount(3);
    for (const x of await exercises.all()) await expect(x.locator('.tag--simulated')).toHaveText('Fictional');
    const first = exercises.first();
    await expect(first.locator('.rs__outline ul')).toBeHidden();
    await first.locator('.rs__outline summary').click();
    await expect(first.locator('.rs__outline ul')).toBeVisible();
    await expect(page.locator('a[href="/topics/profitability-and-liquidity-ratio-analysis/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/revision/flashcards/?topic=3.5"]').first()).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test('labels the mistakes written for the sheet Recommended strategy, and links the rest to their source', async ({ page }) => {
    // 3.2's content holds too few sourced mistakes, so its sheet writes three of its own (src/content/revision/sources-of-finance.yaml).
    await page.goto('/revision/sources-of-finance/');
    await expect(page.locator('.rs__mistakes .gl-label--strategy')).toHaveCount(3);
    await page.goto('/revision/profitability-and-liquidity-ratio-analysis/');
    await expect(page.locator('.rs__mistakes .gl-label--strategy')).toHaveCount(0);
    await expect(page.locator('.rs__mistakes .rs__src a').first()).toHaveAttribute('href', /^\/(glossary|finance-desk|topics|frameworks)\//);
  });

  test('prints as a sheet: the controls and the site around it go, and the outlines open', async ({ page }) => {
    await page.goto('/revision/stakeholders/');
    await page.emulateMedia({ media: 'print' });
    // Printing opens every disclosure first (src/scripts/print.ts), as the browser's print does.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await expect(page.locator('.rs__actions')).toBeHidden();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.rs__pager')).toBeHidden();
    await expect(page.locator('.rs__outline ul').first()).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('keeps the three addresses of the revision briefs, with their key points, traps, formulae and recall questions', async ({ page }) => {
    await page.goto('/revision/costs-and-revenues/');
    await expect(page.locator('h1')).toContainText('Costs and revenues');
    await expect(page.locator('.rs__points li')).not.toHaveCount(0);
    await expect(page.locator('.rs__mistakes .rs__src a[href="/topics/costs-and-revenues/#revision"]').first()).toBeVisible();
    await expect(page.locator('.rs__formulae')).toContainText('Break-even quantity');
    await page.locator('.rs__recall > summary').click();
    await expect(page.locator('#rc-rev-costs-and-revenues .rcard')).not.toHaveCount(0);
    for (const slug of ['growth-and-evolution', 'leadership-and-management']) {
      const res = await page.goto(`/revision/${slug}/`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('.rs__exs > li')).not.toHaveCount(0);
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('reads in full, with no button that needs a script', async ({ page }) => {
      await page.goto('/revision/budgets/');
      await expect(page.locator('h1')).toContainText('Budgets');
      await expect(page.locator('.rs__terms > div')).not.toHaveCount(0);
      await expect(page.locator('[data-print]')).toBeHidden();
      await page.locator('.rs__outline summary').first().click();
      await expect(page.locator('.rs__outline ul').first()).toBeVisible();
    });
  });
});

test.describe('Flashcards', () => {
  test('?topic= opens on that subtopic, and a card turns and is rated with the mouse, kept after a reload', async ({ page }) => {
    await page.goto(`${FC}?topic=3.5`);
    await loaded(page);
    const deck = await deckOf(page);
    const own = select(deck, { code: '3.5' });
    await expect(page.locator('#fc-code')).toHaveValue('3.5');
    await expect(page.locator('#fc-unit')).toHaveValue('3');
    await expect(status(page)).toContainText(`${cardsText(own.length)} in this selection: 0 due today, ${own.length} new`);

    await page.getByRole('button', { name: /^Learn new cards/ }).click();
    await expect(page.locator('[data-study]')).toBeVisible();
    await expect(page.locator('[data-progress]')).toContainText('Card 1 of 20');
    const id = await card(page).getAttribute('data-card-id');
    expect(id).toBe(own[0]?.id);
    await expect(page.locator('[data-back]')).toBeHidden();
    await expect(page.locator('[data-rate]')).toBeHidden();
    await page.getByRole('button', { name: 'Turn the card' }).click();
    await expect(page.locator('[data-back]')).toBeVisible();
    await expect(page.locator('[data-rate]')).toBeVisible();
    await expect(page.locator('[data-when="good"]')).toHaveText('in 2 days');
    await page.locator('[data-rating="good"]').click();
    await expect(page.locator('[data-progress]')).toContainText('Card 2 of 20');

    const day = await today(page);
    const kept = await stored(page);
    expect(kept?.v).toBe(1);
    expect(kept?.cards[id!]).toMatchObject({ box: 2, due: addDays(day, 2), seen: 1, rating: 'good', codes: own[0]?.codes });
    expect(kept?.cards[id!]?.title.length).toBeGreaterThan(0);
    expect(Date.parse(kept?.cards[id!]?.last ?? '')).not.toBeNaN();

    await page.reload();
    await loaded(page);
    await expect(status(page)).toContainText(`${cardsText(own.length)} in this selection: 0 due today, ${own.length - 1} new and 1 not due yet`);
    await expect(page.locator('[data-box="2"]')).toHaveText('1');
    await expectDeclared(page);
  });

  test('works from the keyboard while the card has focus: Space and Enter turn it, 1 to 4 rate it', async ({ page }) => {
    await page.goto(`${FC}?topic=5.7`);
    await loaded(page);
    await page.getByRole('button', { name: /^Learn new cards/ }).click();
    await expect(card(page)).toBeFocused();
    const first = await card(page).getAttribute('data-card-id');
    await page.keyboard.press('3');
    await expect(page.locator('[data-live]')).toHaveText('Turn the card first, with Space or Enter.');
    await page.keyboard.press('Space');
    await expect(page.locator('[data-back]')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-rate]')).toBeHidden();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-rate]')).toBeVisible();
    await page.keyboard.press('1');
    // Again: back to box 1, due today, and round once more at the end of the session.
    const total = Number((await page.locator('[data-progress]').textContent())?.match(/of (\d+)/)?.[1]);
    expect((await stored(page))?.cards[first!]).toMatchObject({ box: 1, due: await today(page), rating: 'again' });
    await expect(card(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('4');
    const second = (await stored(page))?.cards;
    expect(Object.values(second ?? {}).some((r) => r.rating === 'easy' && r.box === 3)).toBe(true);
    expect(total).toBeGreaterThan(1);
  });

  test('filters by unit, subtopic, kind and level, and keeps the choices in the address', async ({ page }) => {
    await page.goto(FC);
    await loaded(page);
    const deck = await deckOf(page);
    const count = async (f: Partial<typeof NO_FILTERS>) => expect(status(page)).toContainText(`${cardsText(select(deck, f).length)} in this selection`);
    await page.selectOption('#fc-level', 'all');
    await count({});
    await page.selectOption('#fc-unit', '2');
    await expect(page).toHaveURL(/\?unit=2$/);
    await count({ unit: '2' });
    await page.selectOption('#fc-code', '3.6');
    await expect(page).toHaveURL(/\?topic=3\.6$/);
    await expect(page.locator('#fc-unit')).toHaveValue('3');
    await count({ unit: '3', code: '3.6' });
    await page.selectOption('#fc-kind', 'formula');
    await expect(page).toHaveURL(/\?topic=3\.6&type=formula$/);
    await count({ unit: '3', code: '3.6', kind: 'formula' });
    // 3.6 is HL only, but a formula it shares with 3.5, such as capital employed, is SL content too.
    await page.selectOption('#fc-level', 'sl');
    const shared = select(deck, { unit: '3', code: '3.6', kind: 'formula', level: 'sl' });
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((c) => c.codes.some((code) => code !== '3.6'))).toBe(true);
    await count({ unit: '3', code: '3.6', kind: 'formula', level: 'sl' });
    expect(select(deck, { unit: '3', code: '3.6', kind: 'recall', level: 'sl' })).toEqual([]);
    await page.selectOption('#fc-kind', 'recall');
    await expect(status(page)).toHaveText('No cards match these choices. Clear one of them to see more.');
    await expect(page.getByRole('button', { name: /^Study every card here/ })).toBeDisabled();
    await page.selectOption('#fc-unit', '1');
    await expect(page.locator('#fc-code')).toHaveValue('');
    await page.selectOption('#fc-level', 'all');
    await page.selectOption('#fc-kind', 'framework');
    await count({ unit: '1', kind: 'framework' });
    await page.locator('input[name="enrichment"]').check();
    await count({ unit: '1', kind: 'framework', enrichment: true });
    expect(select(deck, { unit: '1', kind: 'framework', enrichment: true }).length).toBeGreaterThan(select(deck, { unit: '1', kind: 'framework' }).length);
    await page.getByRole('button', { name: 'Clear the choices' }).click();
    await expect(page).toHaveURL(new RegExp(`${FC.replace(/\//g, '\\/')}$`));
    await count({});
  });

  test('reviews the cards due today first, longest overdue first, and sums up the session', async ({ page }) => {
    await page.goto(FC);
    const deck = await deckOf(page);
    const own = select(deck, { code: '3.5' });
    const day = await today(page);
    const rec = (box: number, due: string) => ({ box, due, seen: 2, last: '2026-01-01T09:00:00.000Z', rating: 'good', codes: ['3.5'], title: 't' });
    await seed(page, { [own[3]!.id]: rec(3, addDays(day, -1)), [own[5]!.id]: rec(1, addDays(day, -3)), [own[7]!.id]: rec(2, addDays(day, 5)) });
    await page.goto(`${FC}?topic=3.5`);
    await loaded(page);
    await expect(status(page)).toContainText('2 due today');
    await page.getByRole('button', { name: 'Review the cards due today (2)' }).click();
    await expect(card(page)).toHaveAttribute('data-card-id', own[5]!.id);
    await page.keyboard.press('Enter');
    await page.keyboard.press('3');
    await expect(card(page)).toHaveAttribute('data-card-id', own[3]!.id);
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
    // Answered Again, it comes round once more before the session ends.
    await expect(card(page)).toHaveAttribute('data-card-id', own[3]!.id);
    await expect(page.locator('[data-progress]')).toContainText('Card 3 of 3');
    await page.keyboard.press('Enter');
    await page.keyboard.press('3');
    await expect(page.locator('[data-summary]')).toBeVisible();
    await expect(page.locator('#fc-sum-h')).toBeFocused();
    await expect(page.locator('[data-summary-text]')).toHaveText('You rated 2 cards (3 answers in all): 1 Again, 2 Good. Next: 2 cards due in 2 days.');
    await expect(page.locator('[data-again-missed]')).toBeHidden();
    expect(await axe(page)).toEqual([]);
    await page.getByRole('button', { name: 'Back to your cards' }).click();
    await expect(status(page)).toContainText('0 due today');
  });

  test('goes back over the cards missed in a session', async ({ page }) => {
    await page.goto(`${FC}?topic=2.6&type=distinction`);
    await loaded(page);
    await page.getByRole('button', { name: /^Learn new cards/ }).click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
    await page.getByRole('button', { name: 'End the session' }).click();
    await expect(page.locator('[data-summary-text]')).toContainText('You rated 1 card: 1 Again. 1 card is still due today.');
    await page.getByRole('button', { name: 'Review the 1 card you missed' }).click();
    await expect(page.locator('[data-progress]')).toContainText('Card 1 of 1');
  });

  test('shuffles the cards without losing any', async ({ page }) => {
    // A fixed random source: with it, the shuffle moves the first card to the back.
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await page.goto(`${FC}?topic=2.6&type=distinction`);
    await loaded(page);
    const deck = await deckOf(page);
    const own = select(deck, { code: '2.6', kind: 'distinction' });
    expect(own.length).toBe(2);
    await page.getByRole('button', { name: /^Study every card here/ }).click();
    await expect(card(page)).toHaveAttribute('data-card-id', own[0]!.id);
    await page.getByRole('button', { name: 'End the session' }).click();
    await page.locator('[data-shuffle]').check();
    await page.getByRole('button', { name: /^Study every card here/ }).click();
    await expect(card(page)).toHaveAttribute('data-card-id', own[1]!.id);
    await expect(page.locator('[data-progress]')).toContainText('Card 1 of 2');
  });

  test('resets the cards in a selection, or all of them, after a confirmation', async ({ page }) => {
    await page.goto(FC);
    const deck = await deckOf(page);
    const a = select(deck, { code: '3.5' })[0]!.id;
    const b = select(deck, { code: '4.4' })[0]!.id;
    const rec = { box: 2, due: '2026-01-02', seen: 1, last: '2026-01-01T09:00:00.000Z', rating: 'good', codes: ['3.5'], title: 't' };
    await seed(page, { [a]: rec, [b]: { ...rec, codes: ['4.4'] } });
    await page.goto(`${FC}?topic=3.5`);
    await loaded(page);
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.accept();
    });
    await page.locator('[data-reset-box] summary').click();
    await page.getByRole('button', { name: 'Reset the cards in this selection' }).click();
    await expect(page.locator('[data-live]')).toContainText('1 card reset');
    expect(Object.keys((await stored(page))?.cards ?? {})).toEqual([b]);
    await page.locator('[data-reset-box] summary').click();
    await page.getByRole('button', { name: 'Reset all flashcard progress' }).click();
    await expect(page.locator('[data-reset-box]')).toBeHidden();
    expect(await stored(page)).toBeNull();
    expect(dialogs).toHaveLength(2);
  });

  test('passes axe-core with a card turned', async ({ page }) => {
    await page.goto(`${FC}?topic=1.4`);
    await loaded(page);
    expect(await axe(page)).toEqual([]);
    await page.getByRole('button', { name: /^Learn new cards/ }).click();
    await page.getByRole('button', { name: 'Turn the card' }).click();
    await expect(page.locator('[data-rate]')).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test('takes the ratings of the recall cards on a notes page as ratings of the same flashcards', async ({ page }) => {
    await page.goto('/topics/stakeholders/');
    const set = page.locator('#rc-notes-1-4');
    await expect(set).toHaveClass(/is-enhanced/);
    await set.locator('.rcard').first().locator('summary').click();
    await set.locator('.rcard').first().getByRole('button', { name: 'Got it' }).click();
    const kept = await stored(page);
    const ids = Object.keys(kept?.cards ?? {});
    expect(ids).toHaveLength(1);
    expect(ids[0]).toMatch(/^recall:1-4-/);
    expect(kept?.cards[ids[0]!]).toMatchObject({ box: 2, rating: 'good', codes: ['1.4'], seen: 1 });
    // Changing the rating replaces it rather than counting a second review.
    await set.locator('.rcard').first().getByRole('button', { name: 'Partly' }).click();
    expect((await stored(page))?.cards[ids[0]!]).toMatchObject({ box: 1, rating: 'hard', seen: 1 });
    expect(await page.evaluate(() => localStorage.getItem('bb:rc:notes-1-4'))).toBe('{"0":1}');
    await page.goto(`${FC}?topic=1.4`);
    await loaded(page);
    await expect(status(page)).toContainText('1 not due yet');
    await expectDeclared(page);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('points to every revision sheet, and shows no control that needs a script', async ({ page }) => {
      await page.goto(FC);
      await expect(page.locator('h1')).toHaveText('Flashcards');
      await expect(page.locator('.fc-fallback')).toBeVisible();
      await expect(page.locator('.fc-fallback a[href^="/revision/"]')).toHaveCount(37);
      await expect(page.locator('[data-setup]')).toBeHidden();
      await expect(page.locator('[data-study]')).toBeHidden();
      await expect(page.getByRole('button', { name: /Turn the card|Learn new cards/ })).toHaveCount(0);
    });
  });
});

test('the deck is the site’s own file, with stable ids, codes and levels', async ({ page }) => {
  const deck = await deckOf(page);
  expect(deck.v).toBe(1);
  expect(deck.cards.length).toBeGreaterThan(1000);
  for (const c of deck.cards.slice(0, 50)) {
    expect(c.id.startsWith(`${c.kind}:`)).toBe(true);
    expect(c.codes.length).toBeGreaterThan(0);
  }
  expect(localDay(new Date(2026, 10, 20))).toBe('2026-11-20');
});
