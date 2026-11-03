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
| Vault cases | `tests/unit/vault-cases.test.ts`, `tests/unit/case-vault.test.ts` | The ratios, appraisals, market shares, elasticity, labour turnover and costed options of the six vault cases, recomputed with the platform's functions; ISO weeks and the weekly rotation against dates worked by hand, the filters, sorts and the address |
| Case figures | `scripts/qa/case-figures.py` (`python3 -I scripts/qa/case-figures.py`, needs PyYAML) | Every exhibit of every vault case rebuilt from its stated model, and every figure written in the case's text accounted for by the model at the precision shown |
| Cash flow | `tests/unit/cashflow.test.ts` | Atelier Barro's forecast month by month, every way of paying for the kiln and every measure, and the reconciliation of profit to cash, against figures worked by hand |
| Ratios and investment | `tests/unit/ratios.test.ts`, `investment.test.ts` | Every guide ratio for both years, the statements balancing, every strategy; payback, ARR and NPV with the guide's printed discount factors |
| Plans | `tests/unit/plan.test.ts` | Critical path analysis worked by hand: earliest and latest times, total and free float, the critical path, and the case lab's plan |
| Studio tools | `tests/unit/market.test.ts`, `operations.test.ts`, `studio-integrity.test.ts` | Market share and growth, position maps, capacity utilization and productivity, stock control, location scores, and the studio data's own checks |
| Strategy Studio | `tests/unit/strategy-models.test.ts`, `strategy-content.test.ts` | Every tool's model against values worked by hand (SWOT totals and TOWS weights, the placement prompts, STEEPLE scores and bands, the five forces' average and what-ifs, Ansoff directions, relative market share and BCG categories, generic strategies, stakeholder quadrants, the decision tree's rolled-back values and spread, force field totals, weighted scores and their sensitivity); every reader of saved work survives damaged input; the studio passes its integrity check, catches a mislabelled tool and a mistyped example, and its worked examples agree with each other |
| IA planner | `tests/unit/ia.test.ts` | The supporting document rules, dates counted back from submission, the word count and the self-mark total |
| Assessment Centre | `tests/unit/answer-builder.test.ts`, `p3-plan.test.ts` | The Paper 1 answer builder's structure checks and the Paper 3 Boardroom plan's review against criteria A to D, without marking or predicting a grade |
| Boardroom | `tests/unit/boardroom.test.ts` | The engine against a small business worked by hand (working capital, a year of trading, overtime, factoring, sale and leaseback, refinancing, lagged investment, profit share); every path through every scenario (243) with the accounting identities on every period and cash reconciled period to period; the scenarios' integrity; that every comparative claim the debriefs make about their named paths is true, and that no path meets every director's goals; formatting and narration |
| Diagrams | `tests/unit/figures.test.ts` | Every number the diagram library computes, against values worked by hand (critical path times and floats, the least-squares line and correlation, quartiles and the mean, the statements, depreciation, the cash flow forecast, payback and ARR, variances, market share and growth); and every one of the 79 diagrams renders, describes itself, names real subtopics and contains no dash |
| Diagram labels | `scripts/qa/diagrams.mjs` (`npm run qa:diagrams`) | In a browser with the site's fonts, no label on any diagram runs outside its frame or overlaps another label |
| Links | `scripts/qa/link-check.mjs` | Every internal link, asset and `#fragment` in the built site exists; internal links end with a slash |
| Contrast | `scripts/qa/contrast.mjs` | WCAG contrast of the token pairs used for text and outlines |
| Pages | `tests/e2e/pages.spec.ts` | Every built page returns 200, has no script errors, one `h1`, a main landmark, no horizontal scrolling, and no axe-core violations (WCAG 2.2 A and AA), at desktop and phone sizes; unknown addresses get the 404 page. Every page of every kind is checked except glossary term pages, which all come from one template: a fixed sample of every 25th is checked. Redirect stubs are skipped. Tests run as a returning visitor (the opening already seen); the opening has its own spec |
| Navigation | `tests/e2e/navigation.spec.ts` | Skip link, the current section in the primary navigation (Mindmaps, Assessment, Glossary), the Explore menu at both sizes (every room listed, planned rooms not linked) and Escape, the SL and HL switch and its memory, search |
| Brand opening | `tests/e2e/brand.spec.ts` | The opening plays on a first visit with focus on Skip, skips, leaves the page usable and not inert, does not replay, replays with `?intro`, finishes by itself, and never plays under reduced motion |
| Motion | `tests/e2e/motion.spec.ts` | Groups below the fold wait for the reader and then arrive; nothing on screen at load is hidden; nothing is held back under reduced motion |
| Case Vault | `tests/e2e/case-vault.spec.ts` | The archive's filters, counts, disabled choices, empty state, address and order; the Case of the Week under a fixed clock; the page and a case file without JavaScript; the decision exercise from a refused commit to a kept, cleared decision; the progress page |
| Interactions | `tests/e2e/interactions.spec.ts` | Each interaction driven as a learner would: right and wrong answers, validation messages, scenarios, persistence after reload, the Decision Room from commit to debrief, the case lab from the first stage to the memo, the cash flow lab, the ratio and appraisal desks, the studio tools, the IA planner, the paper 3 criteria self-check, the progress page, the practice filters, clearing stored data |
| Strategy Studio tools | `tests/e2e/strategy-studio.spec.ts` | Each tool driven as a reader would: prompts and field errors tied to their fields, rows added and removed with focus kept, rankings and charts redrawn, work kept after reload, JSON exported and loaded back, CSV and the memo copied, the memo gathering headlines from other tools, the home page marking saved work, print showing the analysis only, and every tool reading as a finished worked example with no visible button when scripts are off |
| Boardroom in a browser | `tests/e2e/boardroom.spec.ts` | A scenario played from seat to debrief: validation messages, focus after each step, undo, the memo's live preview and downloads, axe-core on every stage, the casebook a reader sees when the script fails, the index's saved progress, persistence after reload, and the casebook without JavaScript |
| Entrepreneurship and Innovation Lab | `tests/unit/lab-models.test.ts`, `lab-content.test.ts`, `tests/e2e/lab.spec.ts` | Runway, revenue, unit economics, feasibility, the canvas and the plan against values worked by hand; every briefing and tool passes its schema and the Lab's integrity checks, which catch the mistakes they exist for; in a browser, each of the six tools recalculates, validates, keeps work only after the learner changes something, exports (JSON, CSV, Markdown) and hands its results to the business plan |
| Without JavaScript | `tests/e2e/nojs.spec.ts` | Topic briefs, Decision Rooms, search, the cash flow lab and the case lab work with JavaScript off, and no page shows a button that needs a script |
| Screenshots | `scripts/qa/screens.mjs` | Sixteen key pages at 1440, 1024, 768 and 390 px, for visual review, with a check for horizontal scrolling; taken with reduced motion so every section shows |

## Results for this release (2.0.0, 2 November 2026)

On the final 2.0 source and build:

| Suite | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints (252 files) |
| ESLint | No problems |
| Content lint | No problems (378 source files, 723 built pages) |
| Unit tests | 245 passed in 15 files (89 of them for the diagram library) |
| Build | 723 pages; the integrity checks pass |
| Link check | 85,057 internal links and assets, none broken; 16 external links listed, not fetched |
| Contrast | 34 pairs, all pass |
| Diagram labels | 79 diagrams, no label outside its frame or overlapping another |
| Browser tests | 444 passed and 1 skipped by design (the current-section test on mobile, where the navigation is in the menu), in 8.4 minutes; no failures and no retries |

Problems the checks found during 2.0 and that were fixed before release: interactive mindmaps marked as images while holding links (axe `nested-interactive`); a gold button on navy taking the band's ivory link colour (1.97:1); plain gold numerals on ivory (2.59:1); muted text on the navy brief panel (2.77:1); two script-only controls shown without JavaScript; Assessment Centre tables and long selects widening phone pages by up to 157 px; HL points and statements still showing in the SL view because component styles outranked the SL rule; section numbers restarting after the notes; a mindmap fitted before layout dividing by zero; the opening's stored flag counted by the privacy test.

## What is not tested

- **Firefox and Safari.** Only Chromium is installed in the build environment. The code uses widely supported features (`:has()`, `structuredClone`, CSS grid, and `inert`, used only while the opening plays), but this should be checked.
- **Real devices and assistive technology.** See [ACCESSIBILITY.md](ACCESSIBILITY.md#known-gaps).
- **The deployed site.** Vercel deploys from `main`, but `the-business-brief-dun.vercel.app` cannot be reached from this environment, so the live site was not checked; see [DEPLOYMENT.md](DEPLOYMENT.md).
- **External links.** They are listed by the link check but not fetched, because the environment's network policy blocks most outside sites.
- **Performance on slow networks.** Page weight is modest (about 260 KB of scripts in total across 30 files, each page loading only its own, and about 130 KB of CSS) but was not measured under throttling.
- **Page transitions in other browsers.** Cross-document view transitions run in Chromium; other browsers navigate without them, which is the intended fallback, but this was not checked.
- **Visual regression.** Screenshots are produced for review; no baseline is stored for automatic comparison. In 2.0 the home page, About, the topic library and subtopic pages with notes, the mindmaps, every diagram, the glossary, the Assessment Centre pages and the Resources Library were reviewed by eye at desktop and phone widths.
- **The Astro 7.4 upgrade.** See SECURITY.md.

## Adding tests

- A new calculation needs hand-worked values in `finance.test.ts`.
- New case figures need a recomputation in `cases.test.ts`, or, for a vault case, a model in `scripts/qa/case-figures.py` and tests in `vault-cases.test.ts`.
- A new interaction needs a test in `interactions.spec.ts` that makes a wrong choice, a right choice, and checks the feedback in words.
