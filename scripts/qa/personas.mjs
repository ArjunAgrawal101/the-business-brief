/**
 * Persona walkthroughs: six kinds of reader follow a route through the site
 * the way they would, by clicking links that are on the page (never by typing
 * an address after the first), on the device they would use. Each step must
 * have a visible link to the next page in its main content, arrive there,
 * show one heading and raise no script error. The opening is seen as a first
 * visitor sees it, and skipped.
 *
 * Run against a preview of the build:
 *   npm run build && npx astro preview --port 4321
 *   node scripts/qa/personas.mjs            (BASE=http://127.0.0.1:4321 by default)
 *
 * Exits with 1 if any step fails, and prints each route with its outcome.
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4321';
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const TABLET = { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true };
const PHONE = devices['Pixel 7'];

/** Each route: who, on what, where they start, and the pages they click through to. */
const ROUTES = [
  {
    who: 'First-time visitor',
    device: ['desktop', DESKTOP],
    start: '/?intro',
    opening: true,
    path: ['/case-vault/', '/cases/tausi-beverages/'],
    expect: 'Tausi Beverages',
  },
  {
    who: 'IB student revising cash flow',
    device: ['phone', PHONE],
    start: '/',
    path: ['/topics/', '/topics/cash-flow/', '/finance-desk/lab/cash-flow-forecast/', '/assessment/paper-2/practice/#CFB-24680'],
    // The practice page opens on the question the calculator links to: a closing balance.
    expect: 'CFB-24680',
  },
  {
    who: 'Teacher planning a unit',
    device: ['desktop', DESKTOP],
    start: '/',
    path: ['/pathways/', '/pathways/teachers/', '/ib/coverage/', '/topics/budgets/'],
    expect: 'Budgets',
  },
  {
    who: 'Undergraduate studying strategy',
    device: ['tablet', TABLET],
    start: '/pathways/',
    path: ['/pathways/undergraduate/', '/mindmaps/enrichment/strategy-formulation/', '/glossary/porters-five-forces/', '/frameworks/five-forces/', '/strategy-studio/five-forces/'],
    expect: 'five forces',
  },
  {
    who: 'MBA student preparing a board decision',
    device: ['desktop', DESKTOP],
    start: '/pathways/',
    path: ['/pathways/mba/', '/boardroom/', '/boardroom/kestle-cycles/'],
    expect: 'Kestle Cycles',
  },
  {
    who: 'Entrepreneur testing an idea',
    device: ['phone', PHONE],
    start: '/pathways/',
    path: ['/pathways/entrepreneurs/', '/entrepreneurship-lab/', '/entrepreneurship-lab/business-model-canvas/', '/entrepreneurship-lab/business-plan/'],
    expect: 'business plan',
  },
];

const browser = await chromium.launch();
let failures = 0;

for (const route of ROUTES) {
  const [deviceName, device] = route.device;
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const lines = [];
  let ok = true;
  const fail = (msg) => {
    ok = false;
    lines.push(`    FAIL ${msg}`);
  };

  try {
    const res = await page.goto(BASE + route.start);
    if (!res?.ok()) fail(`${route.start} answered ${res?.status()}`);
    if (route.opening) {
      // Browsers under automation skip the opening unless ?intro asks for it, as here.
      const skip = page.locator('.cx-skip');
      await skip.waitFor({ state: 'visible', timeout: 4000 });
      await page.waitForTimeout(1200);
      await skip.click();
      await page.waitForFunction(() => !document.documentElement.classList.contains('cx-on'), null, { timeout: 4000 });
      lines.push('    the opening played and was skipped');
    }
    for (const href of route.path) {
      if (!ok) break;
      const link = page.locator(`main a[href="${href}"]:visible`).first();
      if (!(await link.count())) {
        fail(`no visible link to ${href} on ${new URL(page.url()).pathname}`);
        break;
      }
      await link.scrollIntoViewIfNeeded();
      const [path, hash = ''] = href.split('#');
      await Promise.all([page.waitForURL((u) => u.pathname === path && u.hash === (hash ? `#${hash}` : u.hash), { timeout: 15000 }), link.click()]);
      await page.waitForLoadState('domcontentloaded');
      const h1 = await page.locator('h1').count();
      if (h1 !== 1) fail(`${href} has ${h1} h1 headings`);
      const title = (await page.locator('h1').first().textContent())?.replace(/\s+/g, ' ').trim();
      lines.push(`    ${href}  "${title}"`);
    }
    if (ok && route.expect) {
      const text = (await page.locator('main').textContent()) ?? '';
      if (!text.toLowerCase().includes(route.expect.toLowerCase())) fail(`the last page does not mention "${route.expect}"`);
    }
  } catch (e) {
    fail(String(e.message ?? e).split('\n')[0]);
  }
  if (errors.length) fail(`script errors: ${errors.join('; ')}`);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${route.who} (${deviceName}): ${route.path.length} clicks from ${route.start}`);
  lines.forEach((l) => console.log(l));
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} of ${ROUTES.length} routes failed.` : `\nAll ${ROUTES.length} routes passed.`);
process.exit(failures ? 1 : 0);
