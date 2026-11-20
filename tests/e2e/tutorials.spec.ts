/**
 * The Tutorials page and its links across the site: the terms are exactly the
 * Economics platform's (US$20 for a one-hour session and four packages), every
 * enquiry goes to the real address with the owner's subject line, the enquiry
 * builder carries the reader's choices into the email, the page works
 * without JavaScript, and the contextual notes elsewhere state the same price.
 */
import { expect, test } from '@playwright/test';

const SUBJECT = 'IB DP Business Management Tutorials Enquiry';
const decode = (href: string) => {
  const [addr, query] = href.replace(/^mailto:/, '').split('?');
  const q = new URLSearchParams(query);
  return { addr, subject: q.get('subject') ?? '', body: q.get('body') ?? '' };
};

test('the five pathways carry exactly the Economics terms, and nothing else is priced', async ({ page }) => {
  await page.goto('/tutorials/');
  const cards = page.locator('.tu-card');
  await expect(cards).toHaveCount(5);
  const prices = await cards.locator('.tu-card__amt').allTextContents();
  expect(prices).toEqual(['20', '100', '150', '300', '200']);
  await expect(page.locator('#tu-regular')).toContainText('1 hour');
  await expect(page.locator('#tu-ia')).toContainText('6 sessions');
  await expect(page.locator('#tu-marathon')).toContainText('20 sessions');
  await expect(page.locator('#tu-exam')).toContainText('12 sessions');
  await expect(page.locator('#tu-ee')).toContainText('Agreed at enquiry');
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const amounts = [...text.matchAll(/US\$ ?(\d+)/g)].map((m) => Number(m[1]));
  expect(amounts.length).toBeGreaterThan(0);
  expect(amounts.every((a) => [20, 100, 150, 200, 300].includes(a))).toBe(true);
  expect(text).not.toMatch(/90[- ]?min|ninety minutes|two-hour/i);
  expect(text).not.toMatch(/guarantee|guaranteed|best tutor|limited (seats|places|slots)/i);
  expect(text).toContain('Group discounts are available');
});

test('every enquiry goes to the real address with the owner’s subject line', async ({ page }) => {
  await page.goto('/tutorials/');
  const hrefs = await page.locator('main a[href^="mailto:"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
  expect(hrefs.length).toBeGreaterThanOrEqual(7);
  for (const h of hrefs) {
    const m = decode(h);
    expect(m.addr).toBe('arjun1agr@gmail.com');
    if (m.subject) expect(m.subject.startsWith(SUBJECT)).toBe(true);
  }
  const main = decode((await page.getByRole('link', { name: 'Enquire About Business Management Tutorials' }).getAttribute('href')) ?? '');
  expect(main.subject).toBe(SUBJECT);
  expect(main.body).toContain('SL or HL:');
  expect(decode((await page.locator('#tu-ia .tu-card__cta').getAttribute('href')) ?? '').subject).toBe(`${SUBJECT}: IA support`);
});

test('the enquiry builder writes the reader’s choices into the email, and keeps nothing', async ({ page }) => {
  await page.goto('/tutorials/');
  const root = page.locator('[data-ix="tutorials"]');
  await expect(root).toHaveAttribute('data-ready', 'true');
  await root.locator('select[name="pathway"]').selectOption('Exam Practice');
  await root.locator('select[name="level"]').selectOption('DP2');
  await root.locator('input[name="option"][value="HL"]').check();
  await root.locator('input[name="topics"][value="Paper 1"]').check();
  await root.locator('input[name="topics"][value="Paper 3"]').check();
  await root.locator('input[name="arrangement"]').fill('Weekday evenings, IST');
  const m = decode((await root.locator('[data-compose]').getAttribute('href')) ?? '');
  expect(m.subject).toBe(`${SUBJECT}: Exam Practice`);
  expect(m.body).toContain('Year or level (for example DP1 or DP2): DP2');
  expect(m.body).toContain('SL or HL: HL');
  expect(m.body).toContain('Topics or papers I would like help with: Paper 1, Paper 3');
  expect(m.body).toContain('Weekday evenings, IST');
  await expect(root.locator('.nojs-only')).toBeHidden();
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bb:') && k !== 'bb:learner'));
  expect(kept).toEqual([]);
});

test('every question opens, and the page names no testimonial or grade', async ({ page }) => {
  await page.goto('/tutorials/');
  const faqs = page.locator('.tu-faq details');
  await expect(faqs).toHaveCount(10);
  await faqs.first().locator('summary').click();
  await expect(faqs.first()).toHaveAttribute('open', '');
  await expect(page.locator('main')).toContainText('There are no testimonials, ratings, student counts or grade claims on this page');
});

test('without JavaScript the enquiry still works by plain email links', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/tutorials/');
  await expect(page.locator('.tu-builder')).toBeHidden();
  await expect(page.locator('.tu-nojs')).toBeVisible();
  await expect(page.locator('.tu-nojs a[href^="mailto:arjun1agr@gmail.com"]')).toBeVisible();
  await expect(page.locator('.tu-faq details')).toHaveCount(10);
  await context.close();
});

test('the contextual notes appear once a page, with the same price, where help is useful', async ({ page }) => {
  for (const path of ['/topics/cash-flow/', '/assessment/', '/assessment/paper-2/practice/', '/revision/', '/cases/halden-distribution/']) {
    await page.goto(path);
    const notes = page.locator('.tutor-note');
    await expect(notes, path).toHaveCount(1);
    await expect(notes).toContainText('US$20 for a one-hour session');
    await expect(notes.locator('a[href="/tutorials/"]')).toHaveCount(1);
  }
  await page.goto('/about/');
  await expect(page.locator('.ab-contact a[href="/tutorials/"]')).toBeVisible();
  await expect(page.locator('.ab-contact')).toContainText('US$20 for a one-hour session');
  await page.goto('/pathways/ib-dp/');
  await expect(page.locator('main a[href="/tutorials/"]').first()).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.hcr__actions a[href="/tutorials/"]')).toContainText('US$20 for a one-hour online session');
});
