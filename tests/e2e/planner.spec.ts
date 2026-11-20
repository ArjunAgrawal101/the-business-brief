/**
 * The revision planner, driven as a reader would: a plan refused with the
 * reason beside its field, then made; a session marked done, kept after a
 * reload, and kept when the plan is made again; the weak areas offered from
 * the reader's own results and put first; SL leaving out the HL-only
 * subtopics; the calendar file; print; clearing after a confirmation; an
 * accessibility scan with a plan and no sideways scroll on a phone; and the
 * illustrative plan without JavaScript.
 */
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const URL = '/revision/planner/';

const ready = async (page: Page) => {
  await expect(page.locator('[data-ix="planner"].is-enhanced')).toBeVisible();
};

const axe = async (page: Page) => {
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  const r = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
};

/** A day from today in the browser's own time zone, as YYYY-MM-DD. */
const dayFromNow = (page: Page, n: number) =>
  page.evaluate((days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, n);

const stored = async (page: Page) => JSON.parse((await page.evaluate(() => localStorage.getItem('bb:planner'))) ?? '{}');

test.describe('The revision planner', () => {
  test('refuses a plan with no examination date, beside the field, then makes one', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    await page.getByRole('button', { name: 'Make my plan' }).click();
    const exam = page.getByLabel('The date of your first examination paper');
    await expect(exam).toHaveAttribute('aria-invalid', 'true');
    await expect(exam).toBeFocused();
    await expect(page.locator('[data-err="exam"]')).toHaveText('Enter the date of your first examination paper, as a full date.');
    await expect(page.locator('[data-form-err]')).toContainText('The plan could not be made');

    await exam.fill(await dayFromNow(page, 56));
    await page.getByRole('button', { name: 'Make my plan' }).click();
    await expect(exam).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-err="exam"]')).toBeHidden();
    const sum = page.locator('[data-sum]');
    await expect(sum).toContainText('Your HL plan, to the examination on');
    await expect(sum).toContainText('37 subtopics each met at least twice');
    await expect(sum).toContainText('0 of');
    await expect(page.locator('[data-ix="planner"] [data-live]')).toContainText(/^Plan made: \d+ sessions over \d+ weeks\./);
    await expect(page.locator('.pl-week').first().locator('.pl-week__h')).toContainText('Week 1');
    await expect(page.locator('.pl-week--free')).toContainText('Free before the examination');
    const state = await stored(page);
    expect(state.v).toBe(1);
    expect(state.sessions.length).toBeGreaterThan(30);
    expect(state.plan.buffer).toBe(4);
    // Every session is linked to where it is done.
    const first = page.locator('.pl-s').first();
    await expect(first.locator('a.pl-s__t')).toHaveAttribute('href', /^\/topics\/[a-z0-9-]+\/$/);
    expect(await axe(page), 'axe violations with a plan').toEqual([]);
  });

  test('a session marked done is kept after a reload and when the plan is made again', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    await page.getByLabel('The date of your first examination paper').fill(await dayFromNow(page, 40));
    await page.getByLabel('Hours a week').fill('5');
    await page.getByRole('button', { name: 'Make my plan' }).click();
    const box = page.locator('input[data-done]').first();
    const label = (await page.locator('.pl-s').first().locator('a.pl-s__t').innerText()).trim();
    await box.check();
    await expect(box).toBeFocused();
    await expect(page.locator('.pl-s').first()).toHaveClass(/is-done/);
    await expect(page.locator('[data-sum]')).toContainText(/^[\s\S]*1 of \d+ sessions done/);
    await expect(page.locator('[data-ix="planner"] [data-live]')).toContainText(`${label}: done.`);
    const id = (await stored(page)).sessions[0].id;
    expect(Object.keys((await stored(page)).done)).toEqual([id]);

    await page.reload();
    await ready(page);
    await expect(page.locator(`input[data-done="${id}"]`)).toBeChecked();
    // The form remembers what the plan was made from.
    await expect(page.getByLabel('Hours a week')).toHaveValue('5');

    await page.getByRole('button', { name: 'Make the plan again, keeping what is done' }).click();
    await expect(page.locator('[data-ix="planner"] [data-live]')).toContainText('1 of them already done');
    await expect(page.locator(`input[data-done="${id}"]`)).toBeChecked();
    const again = await stored(page);
    expect(again.gen).toBe(2);
    expect(again.done[id]).toBeTruthy();
    expect(again.sessions.filter((s: { id: string }) => s.id.startsWith('2-')).length).toBeGreaterThan(10);
  });

  test('offers the weak areas from this browser’s results, and puts them first', async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => {
      const card = (rating: string) => ({ box: 1, due: '2026-01-01', seen: 2, last: '2026-01-01T10:00:00Z', rating, codes: ['5.5'], title: 'Break-even' });
      localStorage.setItem('bb:cards', JSON.stringify({ v: 1, cards: { a: card('again'), b: card('again'), c: card('hard') } }));
    });
    await page.reload();
    await ready(page);
    const offer = page.locator('[data-weak-offer]');
    await expect(offer).toBeVisible();
    await expect(offer).toContainText('one weak area: 5.5 Break-even analysis');
    await offer.getByRole('button', { name: 'Choose them and put them first' }).click();
    await expect(page.locator('input[name="weak"][value="5.5"]')).toBeChecked();
    await expect(page.locator('input[name="topics"][value="5.5"]')).toBeChecked();
    await page.getByLabel('The date of your first examination paper').fill(await dayFromNow(page, 30));
    await page.getByRole('button', { name: 'Make my plan' }).click();
    // Practised already, so it starts with a review.
    await expect(page.locator('.pl-s a.pl-s__t').first()).toHaveText('Review 5.5 Break-even analysis');
  });

  test('at SL the HL-only subtopics leave the list and the plan', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    await page.locator('.pl-level label', { hasText: 'SL' }).click();
    await page.locator('[data-topics-box] summary').click();
    await expect(page.locator('[data-topic][data-hl="true"]').first()).toBeHidden();
    const shown = await page.locator('[data-topic]:visible').count();
    await expect(page.locator('[data-topics-count]')).toHaveText(`${shown} of ${shown} at SL`);
    await page.getByRole('button', { name: 'None' }).click();
    await expect(page.locator('[data-topics-count]')).toHaveText(`0 of ${shown} at SL`);
    await page.getByLabel('The date of your first examination paper').fill(await dayFromNow(page, 30));
    await page.getByRole('button', { name: 'Make my plan' }).click();
    await expect(page.locator('[data-err="topics"]')).toHaveText('Choose at least one subtopic to revise.');
    await page.getByRole('button', { name: 'Every subtopic at my level' }).click();
    await page.getByRole('button', { name: 'Make my plan' }).click();
    await expect(page.locator('[data-sum]')).toContainText('Your SL plan');
    await expect(page.locator('[data-sum]')).toContainText(`${shown} subtopics each met at least twice`);
    await expect(page.locator('.pl-s--paper3')).toHaveCount(0);
  });

  test('exports a calendar file, prints the plan without the form, and clears after a confirmation', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    await page.getByLabel('The date of your first examination paper').fill(await dayFromNow(page, 21));
    await page.getByRole('button', { name: 'Make my plan' }).click();
    await expect(page.locator('[data-actions]')).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to my calendar (.ics)' }).click()]);
    expect(download.suggestedFilename()).toBe('business-brief-revision-plan.ics');
    const ics = readFileSync(await download.path(), 'utf8');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    const days = new Set((await stored(page)).sessions.map((s: { date: string }) => s.date));
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(days.size + 1);
    expect(ics).toContain('SUMMARY:Examination: your first paper');
    expect(ics).toMatch(/DESCRIPTION:.*http:\/\/127\.0\.0\.1:\d+\/topics\//);

    await page.evaluate(() => {
      (window as unknown as { printed: number }).printed = 0;
      window.print = () => {
        (window as unknown as { printed: number }).printed += 1;
      };
    });
    await page.getByRole('button', { name: 'Print the plan' }).click();
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-form]')).toBeHidden();
    await expect(page.locator('[data-actions]')).toBeHidden();
    await expect(page.locator('.pl-week').first()).toBeVisible();
    await expect(page.locator('#pl-assume-h')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    await page.getByRole('button', { name: 'Clear the plan' }).click();
    await expect(page.getByRole('button', { name: 'Keep it' })).toBeFocused();
    await page.getByRole('button', { name: 'Keep it' }).click();
    expect((await stored(page)).sessions.length).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Clear the plan' }).click();
    await page.getByRole('button', { name: 'Clear it' }).click();
    await expect(page.locator('[data-ix="planner"] [data-live]')).toHaveText('The plan is cleared. Your choices in the form are kept.');
    const cleared = await stored(page);
    expect(cleared.plan).toBeNull();
    expect(cleared.sessions).toEqual([]);
    expect(cleared.input.exam).toBeTruthy();
    await expect(page.locator('[data-actions]')).toBeHidden();
  });

  test('fits a 320 pixel screen with a plan, and the dashboard lists today’s sessions', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(URL);
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.getByLabel('The date of your first examination paper').fill(await dayFromNow(page, 30));
    await page.locator('input[name="days"]').evaluateAll((els) => els.forEach((e) => ((e as HTMLInputElement).checked = true)));
    await page.getByRole('button', { name: 'Make my plan' }).click();
    await expect(page.locator('.pl-week').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // With every day a study day, the plan starts today.
    const today = await dayFromNow(page, 0);
    expect((await stored(page)).sessions[0].date).toBe(today);

    await page.goto('/dashboard/');
    await expect(page.locator('[data-ix="progress"].is-enhanced')).toBeVisible();
    await expect(page.locator('[data-queue] .db-q--plan').first()).toBeVisible();
    await expect(page.locator('[data-plan-line]')).toContainText(/Your revision plan: 0 of \d+ sessions done/);
  });
});

test.describe('The revision planner without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows an illustrative plan with invented dates, and no form it cannot run', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('h1')).toHaveText('Revision planner');
    await expect(page.locator('[data-sum]')).toContainText('Illustrative example, with invented dates');
    await expect(page.locator('.pl-week')).toHaveCount(2);
    await expect(page.locator('[data-form]')).toBeHidden();
    await expect(page.locator('[data-actions]')).toBeHidden();
    await expect(page.locator('#pl-assume-h')).toBeVisible();
  });
});
