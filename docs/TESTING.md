# Testing

## Commands

```bash
npm run qa
```

runs, in order: `astro check`, ESLint and the content lint, the unit tests, the build, the link check and the browser tests. Each can also be run on its own (see the README).

## What is tested

| Suite | File | What it proves |
| --- | --- | --- |
| Type check | `astro check` | Astro and TypeScript files type-check under strict settings |
| ESLint | `eslint.config.js` | TypeScript and JavaScript follow the recommended rules |
| Content lint | `scripts/qa/content-lint.mjs` | No en or em dashes in any source or built page; no leaked `undefined`, `NaN` or `[object Object]`; no placeholder text; no claim that a practice question is an IB question; every page has `lang`, a title and one `h1`; YAML shape (no values split by commas in flow style, table rows the right width) |
| Integrity | `tests/unit/integrity.test.ts` and the build | Every reference between content resolves; the rules in ARCHITECTURE.md hold |
| Finance | `tests/unit/finance.test.ts` | Every calculation against values worked by hand; rounding of break-even and target output; formatting; every eight-part working builder |
| Models | `tests/unit/models.test.ts` | The break-even workspace and its scenarios, the special order (including displaced sales), decision trees and the exact crossover point, the scale model, force fields, and the Decision Room's formatting |
| Cases | `tests/unit/cases.test.ts` | Every exhibit total; every Decision Room board pack for every choice, recomputed from the exhibits; the practice question answers |
| Cash flow | `tests/unit/cashflow.test.ts` | Atelier Barro's forecast month by month, every way of paying for the kiln and every measure, and the reconciliation of profit to cash, against figures worked by hand |
| Ratios and investment | `tests/unit/ratios.test.ts`, `investment.test.ts` | Every guide ratio for both years, the statements balancing, every strategy; payback, ARR and NPV with the guide's printed discount factors |
| Plans | `tests/unit/plan.test.ts` | Critical path analysis worked by hand: earliest and latest times, total and free float, the critical path, and the case lab's plan |
| Studio tools | `tests/unit/market.test.ts`, `operations.test.ts`, `studio-integrity.test.ts` | Market share and growth, position maps, capacity utilization and productivity, stock control, location scores, and the studio data's own checks |
| IA planner | `tests/unit/ia.test.ts` | The supporting document rules, dates counted back from submission, the word count and the self-mark total |
| Links | `scripts/qa/link-check.mjs` | Every internal link, asset and `#fragment` in the built site exists; internal links end with a slash |
| Contrast | `scripts/qa/contrast.mjs` | WCAG contrast of the token pairs used for text and outlines |
| Pages | `tests/e2e/pages.spec.ts` | Every built page returns 200, has no script errors, one `h1`, a main landmark, no horizontal scrolling, and no axe-core violations (WCAG 2.2 A and AA), at desktop and phone sizes; unknown addresses get the 404 page |
| Navigation | `tests/e2e/navigation.spec.ts` | Skip link, current section, the All rooms menu at both sizes (every room listed, planned rooms not linked) and Escape, the SL and HL switch and its memory, search |
| Motion | `tests/e2e/motion.spec.ts` | Groups below the fold wait for the reader and then arrive; nothing on screen at load is hidden; nothing is held back under reduced motion |
| Interactions | `tests/e2e/interactions.spec.ts` | Each interaction driven as a learner would: right and wrong answers, validation messages, scenarios, persistence after reload, the Decision Room from commit to debrief, the case lab from the first stage to the memo, the cash flow lab, the ratio and appraisal desks, the studio tools, the IA planner, the paper 3 criteria self-check, the progress page, the practice filters, clearing stored data |
| Without JavaScript | `tests/e2e/nojs.spec.ts` | Topic briefs, Decision Rooms, search, the cash flow lab and the case lab work with JavaScript off, and no page shows a button that needs a script |
| Screenshots | `scripts/qa/screens.mjs` | Sixteen key pages at 1440, 1024, 768 and 390 px, for visual review, with a check for horizontal scrolling; taken with reduced motion so every section shows |

## Results for this release (0.2.0, 29 October 2026)

| Suite | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints (189 files) |
| ESLint | No problems |
| Content lint | No problems (255 source files, 66 built pages) |
| Unit tests | 146 passed in 12 files |
| Build | 66 pages |
| Link check | 7,717 internal links and assets, none broken; 16 external links listed, not fetched |
| Contrast | 23 pairs, all pass |
| Browser tests | 205 passed, 1 skipped by design (the current-section test on mobile, where the navigation is in the menu) |
| Screenshots | 64 (16 pages at 4 widths), no horizontal scrolling; reviewed by eye at phone, tablet and desktop widths for the home page, the case lab, the cash flow lab, the ratio and appraisal desks, the studios, the course map, the IA planner and the menu |

## What is not tested

- **Firefox and Safari.** Only Chromium is installed in the build environment. The code uses widely supported features (`:has()`, `inert` is not relied on, `structuredClone`, CSS grid), but this should be checked.
- **Real devices and assistive technology.** See [ACCESSIBILITY.md](ACCESSIBILITY.md#known-gaps).
- **The deployed site.** No deployment was made from this environment; see [DEPLOYMENT.md](DEPLOYMENT.md).
- **External links.** They are listed by the link check but not fetched, because the environment's network policy blocks most outside sites.
- **Performance on slow networks.** Page weight is modest (about 260 KB of scripts in total across 30 files, each page loading only its own, and about 130 KB of CSS) but was not measured under throttling.
- **Page transitions in other browsers.** Cross-document view transitions run in Chromium; other browsers navigate without them, which is the intended fallback, but this was not checked.
- **Visual regression.** Screenshots are produced for review; no baseline is stored for automatic comparison.
- **The Astro 7.4 upgrade.** See SECURITY.md.

## Adding tests

- A new calculation needs hand-worked values in `finance.test.ts`.
- New case figures need a recomputation in `cases.test.ts`.
- A new interaction needs a test in `interactions.spec.ts` that makes a wrong choice, a right choice, and checks the feedback in words.
