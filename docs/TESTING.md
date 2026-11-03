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
| Learner record | `tests/unit/learner.test.ts`, `dashboard.test.ts` | The recorder's parsing (anything malformed or not a page on this site is dropped), its caps on pages, exercises and size, a visit counted once in half an hour, nothing noted while paused; exercise verdicts kept only while the answer stands; saved items; merging records without double counting; the export, and every reason an import is refused; the dashboard's self-checks, tallies, course progress by unit, links back to room tools, and the course chart's title and description |
| Search | `tests/unit/search.test.ts` | Matching at the start of words with plurals, ranking, filters by kind, unit and level, the address kept and read back, highlighting, and the index: every subtopic, every navigation link, every calculation by name, every glossary term, section of notes and practice question |
| Financial Laboratory | `tests/unit/finance-lab.test.ts` | The example business hangs together; every calculator's model, working, sensitivity and charts against values worked by hand, budget variances (3.9) included; every calculator's practice link names a real practice kind at the same level and opens the question it names |
| Market Studio | `tests/unit/market-studio.test.ts`, `market-studio-content.test.ts` | Market metrics, the questionnaire checks, the persona, STP, positioning, the mix, the product life cycle, the campaign and budget allocation against hand-worked values; the instruments' content and integrity |
| People and Culture, Operations Floor | `tests/unit/motivation.test.ts`, `org-chart.test.ts`, `workforce.test.ts`, `change-plan.test.ts`, `scenarios.test.ts`, `location-tool.test.ts`, `productivity.test.ts`, `stock-sim.test.ts`, `eoq.test.ts`, `room-tools.test.ts` | Each theory's reading of a job worked by hand (Maslow, Herzberg and the rest); spans, levels, chains of command and delayering; labour turnover and the workforce plan; force fields and stakeholder maps; the scenario readings; weighted location scores and their sensitivity; capacity utilization, productivity and defects; the stock simulation with a busy spell and a late delivery; the economic order quantity, how flat its cost curve is and the quantity discount; that each tool lives in its room |
| Question bank and practice | `tests/unit/bank.test.ts`, `p2-practice.test.ts`, `p1-workspace.test.ts`, `ia-tools.test.ts` | The bank built from the corpus, each paper's scope, filters, self-ratings, timed sets and export; Paper 2 practice against figures worked by hand and across many seeds, reading answers within tolerance and naming the slip; the Paper 1 workspace's case splitting, evidence and plan; the IA tools (key concept, documents against the guide's rules, tool selection, timeline, progress) |
| Knowledge | `tests/unit/glossary.test.ts`, `frameworks.test.ts`, `framework-figures.test.ts`, `enrichment-maps.test.ts`, `pathways.test.ts` | Glossary qualifications, scope and dictionary fields; every framework's labels, links and search entry, and its figure; the enrichment maps; each pathway's audience, route and stages, and that only the IB route is mapped to a syllabus |
| Briefings and home | `tests/unit/intelligence.test.ts`, `briefing.test.ts`, `home.test.ts`, `intro.test.ts` | Every Business Intelligence fact tied to a complete, dated source and its integrity check; the briefing's dates, facets and filters; the home page's ISO week, weekly challenges and live preview; when the opening plays (every fresh entry, never between the site's own pages, never under automation unless asked) |
| Diagram labels | `scripts/qa/diagrams.mjs` (`npm run qa:diagrams`) | In a browser with the site's fonts, no label on any diagram runs outside its frame or overlaps another label |
| Links | `scripts/qa/link-check.mjs` | Every internal link, asset and `#fragment` in the built site exists; internal links end with a slash |
| Contrast | `scripts/qa/contrast.mjs` | WCAG contrast of the token pairs used for text and outlines |
| Pages | `tests/e2e/pages.spec.ts` | Every built page returns 200, has no script errors, one `h1`, a main landmark, no horizontal scrolling, and no axe-core violations (WCAG 2.2 A and AA), at desktop and phone sizes; unknown addresses get the 404 page. Every page of every kind is checked except glossary term pages, which all come from one template: a fixed sample of every 25th is checked. Redirect stubs are skipped. Browsers under automation skip the opening (`navigator.webdriver`), so pages are tested as readers see them once it has gone; the opening has its own spec |
| Navigation | `tests/e2e/navigation.spec.ts` | Skip link; the current section marked in the navigation; on wide screens the groups open as panels one at a time, every link listed, and Escape closes the open one and returns focus to it; on small screens the drawer holds all five groups, opens on the current group with the page marked, and closes with Escape, returning focus; the SL and HL switch and its memory; search |
| Brand opening | `tests/e2e/brand.spec.ts` | The opening plays on a fresh entry and again on the next, with nothing stored; Skip intro ends it at once; Tab ends it and lands on Skip to content; Escape and a click end it; it does not play between the site's own pages; it plays on a reload; it finishes by itself in about five seconds, settling the monogram into the header; the page stays readable to assistive technology while it plays; under reduced motion it is a brief still card; automation skips it unless `?intro` asks |
| Motion | `tests/e2e/motion.spec.ts` | Groups below the fold wait for the reader and then arrive; nothing on screen at load is hidden; nothing is held back under reduced motion; moving between pages runs and finishes the page transition with no script error, and under reduced motion there is none |
| Case Vault | `tests/e2e/case-vault.spec.ts` | The archive's filters, counts, disabled choices, empty state, address and order; the Case of the Week under a fixed clock; the page and a case file without JavaScript; the decision exercise from a refused commit to a kept, cleared decision; the progress page |
| Interactions | `tests/e2e/interactions.spec.ts` | Each interaction driven as a learner would: right and wrong answers, validation messages, scenarios, persistence after reload, the Decision Room from commit to debrief, the case lab from the first stage to the memo, the cash flow lab, the ratio and appraisal desks, the studio tools, the IA planner, the paper 3 criteria self-check, the progress page (now the dashboard), the practice filters, clearing stored data |
| Learner | `tests/e2e/learner.spec.ts` | Saving a page and an item on a page, seeing them and the visit on the dashboard, removing them; the recorder noting checked exercise items with their verdicts; pausing; export, clear and import, each confirmed first, with a refused file and a full round trip; search filters, counts, kinds, the address, a formula by name, the arrow keys and Enter; axe-core on the dashboard with data and on filtered search; search and the dashboard without JavaScript |
| Strategy Studio tools | `tests/e2e/strategy-studio.spec.ts` | Each tool driven as a reader would: prompts and field errors tied to their fields, rows added and removed with focus kept, rankings and charts redrawn, work kept after reload, JSON exported and loaded back, CSV and the memo copied, the memo gathering headlines from other tools, the home page marking saved work, print showing the analysis only, and every tool reading as a finished worked example with no visible button when scripts are off |
| Boardroom in a browser | `tests/e2e/boardroom.spec.ts` | A scenario played from seat to debrief: validation messages, focus after each step, undo, the memo's live preview and downloads, axe-core on every stage, the casebook a reader sees when the script fails, the index's saved progress, persistence after reload, and the casebook without JavaScript |
| Entrepreneurship and Innovation Lab | `tests/unit/lab-models.test.ts`, `lab-content.test.ts`, `tests/e2e/lab.spec.ts` | Runway, revenue, unit economics, feasibility, the canvas and the plan against values worked by hand; every briefing and tool passes its schema and the Lab's integrity checks, which catch the mistakes they exist for; in a browser, each of the six tools recalculates, validates, keeps work only after the learner changes something, exports (JSON, CSV, Markdown) and hands its results to the business plan |
| Without JavaScript | `tests/e2e/nojs.spec.ts` | Topic briefs, Decision Rooms, search, the cash flow lab and the case lab work with JavaScript off, and no page shows a button that needs a script |
| The newest tools | `tests/e2e/tools.spec.ts` | Each People and Culture, Operations Floor and internal assessment tool starts without an error, answers a change with new results and keeps the work after a reload; Paper 2 practice explains a slip, shows the working and accepts the right answer; the question bank searches and keeps a self-rating; the Paper 1 workspace tags a sentence as evidence and keeps it |
| Financial Laboratory in a browser | `tests/e2e/finance-lab.spec.ts` | Results follow the typing, the live region waits for a pause, errors sit beside their fields, lines and years can be added and removed, figures travel by link, and without JavaScript each page shows its full worked example |
| Business Intelligence | `tests/e2e/briefing.spec.ts` | The list filters by unit, key concept and kind and announces the count; a way back when nothing matches; filters from the address; every item listed without JavaScript; every fact on every item page tied to a complete source entry |
| Reflow | `tests/e2e/reflow.spec.ts` | At 320 CSS pixels wide (WCAG 1.4.10), no page the page checks cover scrolls sideways |
| Persona walkthroughs | `scripts/qa/personas.mjs` (`npm run qa:personas`, against a preview) | Six readers (a first-time visitor, an IB student on a phone, a teacher, an undergraduate on a tablet, an MBA student, an entrepreneur on a phone) follow a route by clicking visible links in each page's main content; every step arrives, shows one heading and raises no script error |
| Screenshots | `scripts/qa/screens.mjs` | Sixteen key pages at 1440, 1024, 768 and 390 px, for visual review, with a check for horizontal scrolling; taken with reduced motion so every section shows |

## Results for this release (2.1.0, 3 November 2026)

On the final 2.1 source and build:

| Suite | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints (606 files) |
| ESLint | No problems |
| Content lint | No problems (835 source files, 1,011 built pages) |
| Unit tests | 899 passed in 51 files |
| Build | 1,011 pages; the integrity checks pass |
| Link check | 171,077 internal links and assets, none broken; 31 external links listed, not fetched |
| Contrast | 52 pairs, all pass |
| Reflow | A scan of all 974 pages that are not redirects found none that scrolls sideways at 320 pixels; `reflow.spec.ts` checks the 333 pages the page checks cover on every run |
| Persona walkthroughs | 6 routes passed, 22 clicks in all, with no script error |
| Browser tests | 872 passed and 3 skipped by design (two wide-screen navigation tests on the phone, one drawer test on the desktop), in 19.4 minutes, with no failures and no retries, on the build of `562bde5`. After two small content changes (a storage item added to the privacy page, a pathway marked live) the affected specs were run again on the final build: tools, reflow, navigation, the privacy and pathway pages and the privacy test, 55 passed and 3 skipped |
| GitHub CI | The QA workflow (check, lint, unit tests, build, links, the full browser suite and contrast) passed on `562bde5`, with the same browser result |

Problems the checks found during 2.1 and that were fixed before release:

- **Page transitions.** They were skipped on most navigations, with an uncaught error, because the opt-in was not yet loaded when Chromium decided.
- **Sideways scrolling at 320 pixels** on dozens of pages, from three causes:
  - long tags that could not wrap;
  - a long word in a flex heading;
  - text kept for screen readers escaping a wide table's scroll region.

  One of these failed CI on a glossary page, through font metrics that differ on the runner.
- **Tool tests.** A tool test reloaded before a delayed save; the test now waits for the results, as a reader would.
- **Missing links.** The finance subtopics did not link to their calculators, nor the calculators to practice.
- **Rooms.** A type clash let each room's code treat the other room's tools as its own.
- **Content and wording:**
  - an HL question labelled as Paper 1 style;
  - a broken anchor after a merge;
  - a YAML quote that stopped 19 test files loading;
  - two room lists split by unquoted commas;
  - stale wording once every subtopic was complete;
  - a browser storage item missing from the privacy page.

## What is not tested

- **Firefox and Safari.** Only Chromium is installed in the build environment. The code uses widely supported features (`:has()`, `structuredClone`, CSS grid, and `inert`, used only while the opening plays), but this should be checked.
- **Real devices and assistive technology.** See [ACCESSIBILITY.md](ACCESSIBILITY.md#known-gaps).
- **The deployed site.** Vercel deploys from `main`, but `the-business-brief-dun.vercel.app` cannot be reached from this environment, so the live site was not checked; see [DEPLOYMENT.md](DEPLOYMENT.md).
- **External links.** They are listed by the link check but not fetched, because the environment's network policy blocks most outside sites.
- **Performance on slow networks.** Page weight is modest (about 260 KB of scripts in total across 30 files, each page loading only its own, and about 130 KB of CSS) but was not measured under throttling.
- **Page transitions in other browsers.** Cross-document view transitions run in Chromium; other browsers navigate without them, which is the intended fallback, but this was not checked.
- **Visual regression.** Screenshots are produced for review; no baseline is stored for automatic comparison. In 2.1 the home page, the rooms, the Financial Laboratory, the Strategy Studio, the Boardroom, the Case Vault, the Entrepreneurship Lab, the question bank, the dashboard, the briefing, the frameworks, a pathway and a subtopic with notes were reviewed by eye at phone and desktop widths, and the reflow fixes at 320 pixels.
- **The Astro 7.4 upgrade.** See SECURITY.md.

## Adding tests

- A new calculation needs hand-worked values in `finance.test.ts`.
- New case figures need a recomputation in `cases.test.ts`, or, for a vault case, a model in `scripts/qa/case-figures.py` and tests in `vault-cases.test.ts`.
- A new interaction needs a test in `interactions.spec.ts` that makes a wrong choice, a right choice, and checks the feedback in words.
