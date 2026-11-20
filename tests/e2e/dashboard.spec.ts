/**
 * My dashboard and Your progress, as a reader meets them: first with nothing
 * kept (what the page will show and three ways to start, no wall of zeros),
 * then with a browser holding visits, saved pages, subtopics marked
 * complete, question bank ratings, Paper 2 practice, flashcards and a
 * revision plan: the queue for today, progress by unit at the reader's
 * level, the weak areas by their stated rule, practice by source, where the
 * reader left off, and each subtopic's record on the progress page. Every
 * item kept is declared on the privacy page; both pages pass an
 * accessibility scan and fit a 320 pixel screen.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page) => {
  await expect(page.locator('[data-ix="progress"].is-enhanced')).toBeVisible();
};

const axe = async (page: Page) => {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
};

const fits = async (page: Page) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
};

/** A reader who has been working for a few days, with a plan that has a session today. */
async function seed(page: Page) {
  await page.goto('/privacy/');
  await page.evaluate(() => {
    const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
    const d = new Date();
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const visit = (kind: string, url: string, title: string, h: number) => ({ kind, url, title, first: ago(h + 48), last: ago(h), count: 2 });
    localStorage.setItem(
      'bb:learner',
      JSON.stringify({
        v: 1,
        paused: false,
        checks: {},
        visits: [visit('topic', '/topics/break-even-analysis/', '5.5 Break-even analysis', 1), visit('mindmap', '/mindmaps/break-even-analysis/', '5.5 Break-even analysis', 2), visit('topic', '/topics/stakeholders/', '1.4 Stakeholders', 26), visit('case', '/cases/atelier-barro/', 'Atelier Barro', 30)],
      }),
    );
    localStorage.setItem('bb:saved', JSON.stringify({ v: 1, items: [{ url: '/mindmaps/break-even-analysis/', title: '5.5 Break-even analysis', kind: 'mindmap', saved: ago(2) }, { url: '/topics/stakeholders/', title: '1.4 Stakeholders', kind: 'topic', saved: ago(26) }] }));
    localStorage.setItem('bb:studied', JSON.stringify({ v: 1, done: { '1.4': ago(25) } }));
    localStorage.setItem('bb:bank', JSON.stringify({ v: 1, items: { 'n-break-even-analysis-1': { attempts: 2, rating: 1, last: day }, 'n-stakeholders-1': { attempts: 1, rating: 3, last: day } }, sets: [] }));
    localStorage.setItem('bb:p2-practice', JSON.stringify({ v: 1, kinds: { 'break-even-quantity': { tried: 4, right: 1 } }, timed: [] }));
    localStorage.setItem('bb:cards', JSON.stringify({ v: 1, cards: { c1: { box: 1, due: day, seen: 3, last: ago(30), rating: 'again', codes: ['5.5'], title: 'Break-even quantity' }, c2: { box: 3, due: '2099-01-01', seen: 2, last: ago(30), rating: 'good', codes: ['1.4'], title: 'Stakeholder mapping' } } }));
    localStorage.setItem(
      'bb:planner',
      JSON.stringify({
        v: 1,
        gen: 1,
        input: { start: day, exam: '2099-01-01', level: 'HL', hours: 6, days: [1, 2, 3, 4, 5, 6, 7], topics: ['1.1'], weak: [], studied: [] },
        made: ago(1),
        plan: { from: day, last: day, exam: '2099-01-01', buffer: 5, slot: 40, perDay: 1, gap: 7, finalFrom: day, notFitted: [], warnings: [] },
        sessions: [{ id: '1-1', date: day, kind: 'learn', minutes: 40, code: '1.1', n: 1 }],
        done: {},
      }),
    );
  });
}

test.describe('My dashboard', () => {
  test('a first visit sees what the page will show and three ways to start, not empty sections', async ({ page }) => {
    await page.goto('/dashboard/');
    await ready(page);
    const empty = page.locator('[data-empty]');
    await expect(empty).toBeVisible();
    await expect(empty.locator('h2')).toHaveText('Nothing is kept on this device yet');
    await expect(empty.locator('.db-empty__starts li')).toHaveCount(3);
    await expect(empty.locator('a[href="/revision/planner/"]')).toBeVisible();
    await expect(empty.locator('a[href="/assessment/question-bank/"]')).toBeVisible();
    await expect(empty.locator('a[href^="/topics/"]')).toBeVisible();
    for (const id of ['#today', '#units', '#weak', '#practice', '#recent', '#analyses', '#export']) await expect(page.locator(id)).toBeHidden();
    for (const id of ['#saved', '#notes', '#data']) await expect(page.locator(id)).toBeVisible();
    await expect(page.locator('[data-statusline]')).toContainText('0 items kept in this browser');
    expect(await axe(page), 'axe violations when empty').toEqual([]);
    await fits(page);
  });

  test('with work kept: the queue, progress by unit, weak areas, practice and where the reader left off', async ({ page }) => {
    await seed(page);
    await page.goto('/dashboard/');
    await ready(page);
    await expect(page.locator('[data-empty]')).toBeHidden();

    // Revision priorities: today's planned session first, then the cards due, the weak area and subtopics not started.
    const queue = page.locator('[data-queue] .db-q');
    await expect(queue.first()).toContainText('Learn 1.1 What is a business?');
    await expect(queue.first()).toContainText('In your plan for today (40 minutes)');
    await expect(queue.nth(1)).toContainText('Review 1 flashcard on 5.5 Break-even analysis');
    await expect(queue.nth(1).locator('a')).toHaveAttribute('href', '/revision/flashcards/?topic=5.5');
    await expect(page.locator('[data-queue] .db-q--new').first()).toContainText('Not opened yet, and on the HL course');
    await expect(page.locator('[data-plan-line]')).toContainText('Your revision plan: 0 of 1 sessions done');

    // Progress by unit, at the reader's level.
    await expect(page.locator('[data-level-text]')).toContainText('of the HL course');
    await expect(page.locator('[data-units-chart] svg title')).toHaveText(/^Subtopics at HL: 2 of \d+ studied, 1 completed$/);
    await expect(page.locator('[data-studied]')).toContainText('1.4 Stakeholders');
    await expect(page.locator('[data-studied]')).toContainText('Marked complete');
    await page.locator('#units [data-level-switch] label', { hasText: 'SL' }).click();
    await expect(page.locator('[data-level-text]')).toContainText('of the SL course; the');
    await expect(page.locator('[data-units-chart] svg title')).toHaveText(/^Subtopics at SL: 2 of \d+ studied, 1 completed$/);
    await page.locator('#units [data-level-switch] label', { hasText: 'HL' }).click();

    // The weak area, by the rule the page states.
    await expect(page.locator('#weak .sec-head__dek')).toContainText('at least 3 results on it and they average under 60%');
    const weak = page.locator('[data-weak] .db-weak__i');
    await expect(weak).toHaveCount(1);
    await expect(weak).toContainText('5.5 Break-even analysis');
    await expect(weak).toContainText('averaging 17%');
    await expect(weak.locator('a', { hasText: 'Revision sheet' })).toHaveAttribute('href', '/revision/break-even-analysis/');

    // Practice by source, the question bank among it rather than an unexplained saved analysis.
    const practice = page.locator('[data-practice]');
    await expect(practice).toContainText(/2 of \d+ questions/);
    await expect(practice).toContainText('1 secure, 0 partly, 1 not yet');
    await expect(practice).toContainText('4 calculations checked');
    await expect(practice).toContainText('1 right first time (25%)');
    await expect(practice).toContainText('2 cards reviewed');
    await expect(practice.locator('.db-pr__n')).toHaveText('6');
    await expect(page.locator('[data-work]')).not.toContainText('Bank');
    await expect(page.locator('#analyses')).toBeVisible();

    // Where the reader left off.
    await expect(page.locator('[data-recent]')).toContainText('Atelier Barro');
    await expect(page.locator('[data-recent] #bookmarks')).toContainText('5.5 Break-even analysis');
    await expect(page.locator('[data-recent] #bookmarks')).toContainText('Mindmap, saved');

    expect(await axe(page), 'axe violations with work kept').toEqual([]);
    await fits(page);
  });

  test('the progress page marks each subtopic with what was done on it, and counts every result as practice', async ({ page }) => {
    await seed(page);
    await page.goto('/progress/');
    await ready(page);
    await expect(page.locator('h1')).toHaveText('Your progress');
    await expect(page.locator('.db-row[data-code="1.4"] [data-you]')).toHaveText(/^Completed .+ · Read · results average 100% of 2$/);
    await expect(page.locator('.db-row[data-code="1.4"]')).toHaveClass(/is-completed/);
    // Ratings in the question bank and calculations make 5.5 practised.
    await expect(page.locator('.db-row[data-code="5.5"]')).toHaveClass(/is-practised/);
    await expect(page.locator('.db-row[data-code="5.5"] [data-you]')).toContainText('results average 17% of 6');
    await expect(page.locator('[data-summary]')).toContainText('Mindmaps viewed1');
    expect(await axe(page), 'axe violations on the progress page').toEqual([]);
    await fits(page);
  });

  test('every item the dashboard and its tools keep is declared on the privacy page', async ({ page }) => {
    await seed(page);
    await page.goto('/topics/stakeholders/');
    await expect(page.locator('[data-ix="study"].is-enhanced')).toBeVisible();
    await page.getByRole('button', { name: 'Low light' }).click();
    const html = await (await page.request.get('/privacy/')).text();
    const declared = [...html.matchAll(/<code[^>]*>\s*(bb:[^<]+?)\s*<\/code>/g)].map((m) => (m[1] ?? '').trim());
    for (const key of ['bb:studied', 'bb:study', 'bb:planner']) expect(declared).toContain(key);
    const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:')));
    // bb:cards belongs to the flashcards, declared with them.
    const undeclared = kept.filter((k) => k !== 'bb:cards' && !declared.some((d) => (d.endsWith('…') ? k.startsWith(d.slice(0, -1)) : k === d)));
    expect(undeclared, 'kept in this browser but not declared on the privacy page').toEqual([]);
  });
});
