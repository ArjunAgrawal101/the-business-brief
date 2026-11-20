# Architecture

## In one paragraph

The Business Brief is a static site built with Astro from structured YAML content. Every page is complete HTML at build time. The build loads all content through Zod schemas, checks every relationship between topics, cases, decisions, tools, calculations and questions, and fails if any reference is broken. Calculations are done by one set of pure TypeScript functions that run both at build time (worked examples, case figures, answers) and in the browser (live calculators), so the two can never disagree. Interactions are progressive enhancement: the server renders a complete default state, and a small script per component adds behaviour.

## Stack

| Part | Choice | Version |
| --- | --- | --- |
| Site generator | Astro, static output | 6.4.8 (see SECURITY.md for the 7.4 upgrade) |
| Language | TypeScript, strict, `noUncheckedIndexedAccess` | 6.0.3 |
| Content validation | Zod 4, through `astro/zod` | bundled with Astro |
| Content format | YAML | `yaml` 2.9.1 |
| Unit tests | Vitest | 5.0.5 |
| Browser tests | Playwright with axe-core | 1.63.0, 4.11.3 |
| Lint | ESLint with typescript-eslint | 10.13.0, 8.72.1 |
| Hosting | Vercel (static), configured in `vercel.json` | |

There is no UI framework. Components are `.astro` files; browser behaviour is plain TypeScript modules bundled by Vite. The whole site ships about 260 KB of JavaScript in 30 files (uncompressed), split by component, and each page loads only the scripts it uses.

## Why static

The platform has no accounts and stores nothing on a server. A static site is the simplest thing that meets the requirements: it is fast, cheap to host, has no runtime attack surface, and can be read offline once loaded. My Business Workspace (the learner dashboard) keeps the reader's record, learning list, notes and saved results in that reader's browser, where it can be paused, exported, imported and cleared, and is described on the privacy page; anything that would leave the device, such as accounts, analytics or progress across devices, needs a privacy and consent review first (see `src/pages/privacy.astro`).

## The content layer

`src/content.config.ts` defines the collections:

| Collection | Source | Loader |
| --- | --- | --- |
| topics, cases, decisions, tools, interactives, curricula, mindmaps, notes, boardroom, intelligence, executive | one YAML file per entry | Astro `glob` |
| questions, glossary | several YAML files, each a list of entries with ids | custom `yamlList` loader (checks for duplicate ids) |
| calculations, assessment, commandTerms, concepts, pathways, modules, claims, resources, topicConnections, subtopicTools | one YAML file of entries in `src/content/data/` | Astro `file` |
| sources | the register, one YAML file per area in `src/content/sources/`, each a list of entries with ids | `yamlList` (checks for duplicate ids across the files) |
| advanced | one YAML file per Advanced Management module in `src/content/advanced/`, with its schema in `src/lib/advanced-schema.ts` and its checks in `src/lib/integrity-advanced.ts` | `yamlFiles` |
| studio | one YAML file per Strategy Studio tool, and one for its engagement, in `src/content/studio/` (schema in `src/lib/schemas-strategy.ts`) | Astro `glob` |
| briefings, labTools | one YAML file per entry in `src/content/briefings/` and `src/content/lab/`, with their schemas in `src/lib/lab/schemas.ts` | Astro `glob` |
| boardroomBriefings | one YAML file per briefing in `src/content/boardroom-briefings/`, with its schema in `src/lib/boardroom-briefings/schema.ts` | Astro `glob` |
| revision | one YAML file per subtopic in `src/content/revision/`, named after its slug, with its schema in `src/lib/revision/schema.ts`: only what the revision sheet and the flashcards need beyond the rest of the content | Astro `glob` |

| comparisons | one YAML file per curated framework comparison in `src/content/comparisons/`, named for its sides joined by `-vs-`, with its schema in `src/lib/compare/schema.ts` | `yamlFiles` |

Two kinds of material are code rather than content, because they are drawn or computed: the diagram library (`src/lib/diagrams.ts`, with the drawings in `src/lib/figures/`) and the Resources Library catalogue (`src/lib/library/catalogue.ts`, built once per build by `src/lib/resources.ts`), which joins the curated `resources.yaml` with entries generated from the content (notes and briefs, revision, every mindmap and diagram, frameworks, cases, Decision Rooms and simulations, practice, the teacher area and the enrichment material) and files them under the library's twelve categories.

The Decision Room's two practice tools are code for the same reason. The Business Scenario Generator's families (`src/lib/scenario-generator/families/`, one file per unit) generate a scenario from a seed with the seeded generator in `src/lib/random.ts`, so a code such as `growth-route-7` always gives the same business, figures and order of choices; its page refuses to build if a family names a subtopic or toolkit tool that does not exist, and `problems()` in `src/lib/scenario-generator/engine.ts` checks every family across 120 seeds in the unit tests. The Stakeholder Impact Simulator's decisions (`src/lib/stakeholder-impact/decisions.ts`) are read through the rules in `src/lib/stakeholder-impact/model.ts`, which the page prints in plain words and the unit tests hold to their stated properties.

Schemas live in `src/lib/schemas.ts`. Every content block, exhibit and interaction carries a `provenance` label; every claim about the IB course carries a `verification` status. See [CONTENT_MODEL.md](CONTENT_MODEL.md).

### The integrity gate

`src/lib/content.ts` exposes `corpus()`, which loads every collection once per build and runs `checkIntegrity()` from `src/lib/integrity.ts`. `BaseLayout.astro` awaits it, so **no page can be built if any reference is broken**. The checks include:

- every id a topic, case, decision, tool, question, curriculum or claim refers to exists;
- every topic has a case, practice questions and at least one misconception;
- every worked block's calculation has a function, and every complete calculation has a worked example that runs without error;
- every interaction a block or tool names exists and is of the right kind;
- exhibits in a simulated case are labelled `simulated-data`, and a fictional organization cannot carry real data;
- table rows have as many cells as the table has columns;
- Decision Room baselines and outcomes use only declared metrics, first-round outcomes report the same metrics, every metric is reported somewhere, later-round choices follow from real first-round choices, and each first-round choice has at least two follow-ups;
- practice question mark schemes add up to the question's marks, and their command terms exist at the guide's AO level;
- no HL question is in the style of paper 1 (which excludes HL-only content), a paper 3 question is HL, and a paper 3 question marked on criteria uses the guide's criteria A to D;
- every interaction names subtopics that exist; a case lab's evidence comes from its case, its answers are among its options, and its plan has no loops;
- the ratio desk's statements balance and link across the two years, and every strategy keeps them balanced; the Market Studio and Operations Floor data pass their own checks (`src/lib/integrity-studio.ts`);
- in the Strategy Studio (`src/lib/integrity-strategy.ts`, run by the studio's pages and its unit test), a tool called an IB toolkit tool names its entry in `src/content/tools` and has the same level, a tool outside the toolkit is labelled enrichment and says so, every subtopic, Decision Room and toolkit guide named exists, and every worked example reads back unchanged through the tool's own reader of saved work and passes the tool's checks;
- for the Case Vault (`src/lib/integrity-cases.ts`): a classified case carries the whole classification; subtopics, glossary terms, tools and supplied sources resolve; every question's command term is at the guide's AO level, and a question or framework on an HL-only subtopic is marked HL; a decision exercise has a debrief that judges every alternative once; the industry context has no figures; a fictional case has simulated data, and a case offered to undergraduate or MBA readers has seminar prompts;
- every Market Studio instrument is listed in `src/lib/market-tools.ts` and lives at its address, quotes the guide's statements exactly as the curriculum file has them, names glossary terms that exist, and has a worked example that passes its own validation; the questionnaire's deliberately flawed questions are exactly the ones its rules flag; and the worked examples agree where they share a figure (`src/lib/integrity-market.ts`);
- for the 2.0 learning collections (`src/lib/integrity-learning.ts`): every mindmap names a real subtopic in the right unit (one map each), is marked HL exactly when its subtopic is HL only, has enough nodes to revise from (16 or more), gives every branch at least two children and a core node for the revision view, gives every formula node its formula, links only to glossary terms that exist and gives the sources it was checked against; every set of notes carries the guide's exact subtopic title, is marked HL when its subtopic is, and names only glossary terms, questions, subtopics, sources and diagrams that exist; every glossary entry names a real subtopic, has a name no other entry uses, is not related to itself, and is marked HL when all its subtopics are HL only;
- for the glossary's dictionary fields and the frameworks library (`src/lib/integrity-frameworks.ts`): a term beyond the IB course is complete, names no subtopic and never carries the IB qualification; every framework names its standing honestly (a syllabus framework its subtopic and the guide's page, a toolkit tool its guide, enrichment no IB qualification) and every term, diagram, tool, studio tool, related framework and published work it names exists; every tool its application mode names (`apply`) is a room's working page, a Finance Desk workspace or a Financial Laboratory calculator, its Strategy Studio tool is among them, and every question of the Framework Application Lab has a framework to offer (`checkApplications`);
- for the Business Intelligence Briefing (`src/lib/integrity-intelligence.ts`, run by `src/lib/briefing-content.ts` before any briefing page is built, with the frameworks library and the Strategy Studio): every fact cites a complete source dated on or after the fact; every source is read on or after the day the briefing began and supports something on the page; every subtopic, term, tool, framework and platform tool named exists, and a toolkit tool is named as a tool; every item links to a tool or framework; exactly one item is the lead; and the items cover all twelve editorial themes;
- a resource is offered as a download only when its file exists in `public/` or is one the build writes (`/downloads/glossary.csv`, `/downloads/topic-checklists.csv`, `/downloads/mindmaps/*.svg`, `/downloads/mindmaps/enrichment/*.svg`, `/downloads/diagrams/*.svg`), and its format, size and pages are measured from the file (`src/lib/library/downloads.ts`, whose writers the endpoints share);
- every classroom activity of the Teacher resource area is built on a fictional case or Decision Room that exists, takes each role from a stakeholder the case names, teaches real subtopics, is marked HL when any of them is HL only, and lasts 30 to 120 minutes (`src/lib/teachers/integrity.ts`, run by `activities()` in `src/lib/resources.ts`);
- for the Boardroom Briefings (`src/lib/boardroom-briefings/integrity.ts`, run by `src/lib/boardroom-briefings/content.ts` before any briefing page is built): the series is numbered without gaps and asks no question twice; the fictional flag matches the sourcing (a fictional company's exhibits are all simulated data and it cites no source about a real organization; a real company's are external evidence with dated, addressed sources); every source exists and is used, and research and ideas beyond the course cite one; the strategic context, market and research evidence carry no figures; every subtopic, term, framework, tool and command term resolves, with HL-only material marked HL; every option is judged and scored once, the weights add up to 100, the weighted scores are right and the recommendation is the best-scored option unless it says why not; and every figure recomputes: each exhibit's checks rework its cells, every declared figure works out, and every figure written in the text is a cell, a figure or a score (`src/lib/boardroom-briefings/figures.ts`);
- for the Entrepreneurship and Innovation Lab (`src/lib/integrity-lab.ts`, run by `src/lib/lab/content.ts` before any Lab page is built): every briefing section is mapped to an IB subtopic, marked as enrichment, or both; every idea in a briefing's register says whether it is IB content, a toolkit tool or enrichment, with the guide's page for the first two; every code, glossary term, tool and source resolves; each tool's example is a valid input to its own model; briefings and tools pair one to one by order; and the room's entry in `modules.yaml` lists exactly the Lab's pages and only the subtopics its material maps to.
- for Advanced Management (`src/lib/integrity-advanced.ts`, run by `src/lib/advanced-content.ts` before any of its pages is built): every module is on the plan in `src/lib/advanced.ts` and covers each topic planned for it; orders and titles are unique within a domain; every source, framework and IB bridge code exists; a real application carries sources and the date its facts were read, and a real case carries sources; exhibit rows fit their columns; IB documents are never offered as further reading; and every module reaches 1,500 words, so no thin page is published.
- for the framework comparisons (`src/lib/compare/integrity.ts`, run by `src/lib/compare/content.ts` before any comparison page is built): the address names the sides joined by `-vs-`; no two comparisons cover the same ideas, and none repeats the PESTLE against STEEPLE page; every side is a framework in the library, a toolkit tool or a syllabus statement, and every framework, tool, subtopic, glossary term and source it names exists; a toolkit framework names its tool; each side's syllabus words match exactly one content statement in the curriculum file, and its level agrees with those statements, the toolkit and the library; and "which to use when" names real sides, more than one of them.

- for quick revision (`src/lib/revision/integrity.ts`, run by `src/lib/revision/content.ts` before any revision page or the flashcard deck is built): every subtopic has a revision file named after its slug; every exercise's command term exists and sits at or below the AO level of the statements it is set on (AO4 terms only where a statement carries AO4), and every exercise, card and mistake on an HL-only subtopic is marked HL; every stem names its fictional business; card ids are unique; every formula and recall card a file names exists, and no formula is described twice.

The same checks run in the unit tests (`tests/unit/integrity.test.ts`, and `tests/unit/revision.test.ts` for quick revision), which load the YAML directly without Astro.

## The shell: opening, navigation, rooms and home

| Module | Responsibility |
| --- | --- |
| `src/lib/intro.ts` | When the opening plays: the rule as source text, run in the head before the first paint and unit-tested as the same text (every fresh entry; never between pages, on Back or Forward, or under automation) |
| `src/components/brand/CinematicIntro.astro` | The five-second sequence, in a `<template>` cloned only when it plays, with its own small script and a CSS failsafe |
| `src/lib/navigation.ts` | The five groups (Explore, Practise, Tools, Assess, Discover) and their links, read by the header's mega menu and drawer, the footer, search and the dashboard; `navPosition()` marks the current group |
| `src/lib/tutorials.ts` | The tutoring terms (the session, the five pathways, group discounts), the owner's contact details and `enquiryMailto()`, which every enquiry link and the enquiry builder use; `src/components/ui/TutorNote.astro` states the same terms in the quiet notes on study pages |
| `src/styles/rooms.css` | Each room's accent, text shade and drawing, keyed on `data-room` (BaseLayout's `room` prop), generated by `scripts/brand/rooms-css.py` |
| `src/lib/coverage.ts` | `coverageSummary()`: the headline figures (complete, with notes, in a brief, partly built, planned, verified) that the home page, the topic library, the coverage tracker and the menu all quote |
| `src/lib/home.ts`, `src/lib/home-preview.ts` | The home page's weekly features (challenges worked by the finance functions, insights, frameworks), learning objectives and dated additions; the live break-even preview |

## One set of numbers

| Module | Responsibility |
| --- | --- |
| `src/lib/finance.ts` | Revenue, cost, profit, contribution, break-even, margin of safety, target output and price, labour turnover, special order, and the eight-part working for each |
| `src/lib/breakeven.ts` | The break-even model behind the workspace, input validation and the plain-language reading |
| `src/lib/special-order.ts` | Special orders, including displaced regular sales when capacity runs out |
| `src/lib/decision-tree.ts` | Expected values, validation of probabilities, exact crossover points for sensitivity |
| `src/lib/scale.ts` | The simulated economies and diseconomies of scale model |
| `src/lib/force-field.ts` | Force field totals and the effect of weakening a force |
| `src/lib/decision-room.ts` | Which choices a round offers, how outcomes combine into the board pack, how measures are written and compared |
| `src/lib/boardroom/` | The Boardroom: `engine.ts` (one business worked period by period: pure, deterministic, its cross-functional links and lags documented at the top), `scenario.ts` (history, rounds, events chosen by the state, scorecards, every path compared), `kpis.ts`, `narrate.ts` (tokens, effects and consequences in words), `charts.ts`, `render.ts` (markup shared by server and browser), `view.ts` (the board pack's statements), `schema.ts` and `roles.ts`; `src/lib/integrity-boardroom.ts` runs every path and fails the build on a broken identity or reference |
| `src/lib/executive/` | The Boardroom's executive simulation: `engine.ts` (one business worked a year at a time from a budget across six levers: pure, deterministic, its links and lags documented at the top; statements, cash flow and position reconcile every year), `sim.ts` (history, plans, the rules a year's plan must keep, scorecards, the comparison of strategies, each lever's contribution, the figures the questions quote), `kpis.ts`, `narrate.ts` (tokens such as `{{revenue@2026}}`, and each year explained), `render.ts` and `charts.ts` (markup shared by server and browser, reusing the Boardroom's tiles and sparklines), `view.ts`, `config.ts`, `schema.ts`, `roles.ts`, `content.ts`; `integrity.ts` fails the build on a broken reference, an unfillable token or a broken identity |
| `src/lib/cashflow.ts` | The cash flow forecast in the guide's layout, ways of paying for an investment, working capital measures, the profit for the period and its reconciliation to cash, worked in cents |
| `src/lib/ratios.ts`, `src/lib/investment.ts` | The guide's ratios from two years of statements, with strategies applied to the accounts; payback, ARR and NPV with the guide's printed discount factors |
| `src/lib/budget.ts` | Budget variances for 3.9, marked [F] or [A] by their effect on profit, with totals in the layout of the guide's budget |
| `src/lib/finance-lab/` | The Financial Laboratory: the catalogue of calculators, the example business's figures, and for each family of calculators the report (headline, figures, workings, chart, sensitivity, interpretation, CSV rows) built from the modules above; `render.ts` turns a report into the page's HTML on the server and in the browser |
| `src/lib/adv-finance/` | Advanced financial analysis, beyond the IB course: the integrated forecast (`forecast.ts`: drivers to three linked statements that balance every year, scenarios and alternatives), the capital budgeting comparator (`capital.ts`: NPV at any rate, the IRR by bracketing and bisection, payback, discounted payback, the profitability index, the tornado, the WACC and CAPM), break-even scenarios (`cost-structure.ts`, on `finance.ts`) and the performance dashboard (`performance.ts`: the DuPont split of ROE and its exact attribution, the cash conversion cycle, interest cover, on `ratios.ts`); each with a `-view.ts` report used by the server and the browser, the SVG charts (`charts.ts`), the forms (`forms.ts`), the readers of saved work (`state.ts`), the catalogue with each tool's standing against the course (`catalogue.ts`) and the example's figures, joined to the lab's (`business.ts`) |
| `src/lib/plan.ts` | Critical path analysis: earliest and latest times, total and free float, the critical path |
| `src/lib/strategy/*.ts` | The Strategy Studio's thirteen tools: each tool's model, checks, reader of saved work, editor and analysis HTML, chart and exports; the decision tree reuses `decision-tree.ts`, the force field `force-field.ts` and the option appraisal the weighted scoring in `operations.ts`. Three were added with the Framework Application Lab: scenario planning (`scenarios.ts`), stakeholder salience (`salience.ts`) and the strategic fit check (`fit.ts`) |
| `src/lib/framework-lab.ts` | The Framework Application Lab: the directory of pages a framework can be applied in (the rooms' working pages in modules.yaml, the Finance Desk's workspaces and the Financial Laboratory's calculators), each framework's tools split into those that apply it in full and those for part of it, the hub's questions and the advanced applications it features; the worksheet on each framework page is `src/components/frameworks/ApplyWorksheet.astro` with `src/scripts/framework-apply.ts` |
| `src/lib/market.ts`, `src/lib/operations.ts` | Market share and growth, position maps; capacity utilization, productivity, stock control, weighted location scores |
| `src/lib/lab/` | The Entrepreneurship and Innovation Lab: start-up costs and runway (`costs.ts`), the revenue model (`revenue.ts`), unit economics (`unit-economics.ts`), the feasibility assessment (`feasibility.ts`, on the weighted scoring of `operations.ts`), the Business Model Canvas (`canvas.ts`), the business plan outline and its digest of the other tools (`plan.ts`), with their charts, renderers and form markup |
| `src/lib/market-*.ts` | The Market Studio instruments: metrics and customer lifetime value, the questionnaire's wording rules and sampling, personas, STP scoring, the competitor map's open spaces, the mix's consistency rules, the product life cycle model, the campaign's funnel and timeline, and the budget response model; `market-tools.ts` lists the instruments, `market-kit.ts` reads saved state safely and writes CSV, and the `-view.ts` files and `market-charts.ts` draw them |
| `src/lib/ia.ts` | The guide's rules for supporting documents, used by every IA tool that checks them: the count, the three-year rule to the month (`threeYearRule`, which also judges a year without its month only when it can), transcripts and textbooks; the word count and self-marks, each citing its page |
| `src/lib/ia-docs.ts`, `ia-tools.ts`, `ia-method.ts`, `ia-evidence.ts`, `ia-words.ts` | The IA tools: the checker on the internal assessment page (on `ia.ts`'s rules), the research question builder, key concept, documents, tool selection, timeline and progress (`ia-tools.ts`, which also lists the tools and their storage keys), research methodology, evidence analysis and word count planning; every check carries its standing and source |
| `src/lib/guide-labels.ts` | The Assessment Centre's five labels of standing and what each means, read by the labels, the checklists and the IA tools' feedback |
| `src/lib/format.ts` | en-GB number and money formatting with the typographic minus |
| `src/lib/charts.ts`, `cashflow-chart.ts`, `plan-chart.ts`, `charts-studio.ts` | SVG charts (break-even, decision tree, scale, cash flow, plans, the studio tools), each with a title and a text description |
| `src/lib/render.ts`, `tree-view.ts`, `cashflow-render.ts`, `render-studio.ts` | HTML fragments used by both the server render and the browser scripts |

`tests/unit/cases.test.ts` recomputes the case figures, the Decision Room board packs and the practice question answers from the exhibits with these functions.

## The library and the teacher area

| Module | Responsibility |
| --- | --- |
| `src/lib/library/catalogue.ts` | The Resources Library's catalogue, pure: every item with its category, kind, level, standing, topic tags, formats, links and preview; the twelve categories with counts computed from the items; lesson presentations marked Not yet available and never counted. `src/lib/resources.ts` gathers the content and builds it once per build; it also lists the revision workstream's sheets (`/revision/<slug>/`) and flashcards (`/revision/flashcards/`) once the flashcards page is in `src/pages/revision/`, and only the three revision briefs until then |
| `src/lib/library/filter.ts`, `categories.ts` | The search, the filters, the counts each choice would leave, "Show more" and the selection in the address; imports nothing the browser should not load, so `src/scripts/library.ts` uses it as it is |
| `src/lib/library/downloads.ts` | Which downloads exist and their format, size and pages, measured from the file; the writers of the build's own files, shared with the endpoints in `src/pages/downloads/` |
| `src/lib/library/previews.ts` | The first-page images of the PDF guides, from the manifest `scripts/brand/guide-covers.mjs` writes |
| `src/lib/library/formula-sheet.ts` | The IB formulae sheet as the guide prints it, and every other formula the platform uses with its place in the course |
| `src/lib/teachers/` | Topic checklists and their CSV (`checklists.ts`), classroom activities (`schema.ts`, `integrity.ts`), discussion prompts for every subtopic (`prompts.ts`) and the lesson sequences across the course, worked by the lesson library's own functions (`sequences.ts`) |
## Connections and connected learning

| Module | Responsibility |
| --- | --- |
| `src/lib/connections.ts` | The worked connections between subtopics (`topic-connections.yaml`) and the links the notes name: their checks (codes exist and differ, no pair twice, a command term no deeper than the statements allow, every subtopic joined, curated tool links that name real tool pages), the lists for one subtopic, and the ring layout of the map at `/ib/connections/` |
| `src/lib/connected.ts` | The tool index: every tool and desk page with the subtopics its own data names (Finance Desk interactions and calculations, the Financial Laboratory's catalogue, the Studio's and the Lab's status, the rooms' interactions, advanced financial analysis), which gives each subtopic page its Tools and practice and each tool page its link back (`BackToTopic.astro`); and Connected learning, the groups each subtopic page shows, labelled by standing |
| `src/lib/connected-content.ts` | Gathers what the two read once per build and throws on any broken connection or tool link; the revision sheet and flashcard links appear once a revision route of their own exists |
| `src/lib/bank-address.ts` | The question bank's address for one subtopic (`?topic=3.5`), read by the bank's script |

## Progressive enhancement

Each interaction follows the same pattern:

1. The `.astro` component renders the complete default state on the server: inputs with their default values, results, chart, data table and working, or, for the classification exercises, every item with its answer inside an "Answer and explanation" disclosure.
2. The component embeds its configuration as JSON in `<script type="application/json" data-config>`, escaped with `jsonForScript()` so no string can close the element.
3. A script in `src/scripts/` finds every instance with `each()` from `src/scripts/ix.ts`, adds the class `is-enhanced`, and attaches behaviour. Elements marked `js-only` are hidden until then; elements marked `nojs-only` are hidden after.
4. Changing results are announced through a polite live region; errors are shown beside the field and marked with `aria-invalid`.
5. If a script fails, the component shows its own error message and the server-rendered content remains.

Work that a learner might want back is kept in `localStorage` under keys starting `bb:` (listed on the privacy page). Storage access never throws: if it is blocked, the interaction still works for the visit. The reader's own pages are one component, `src/components/learner/Dashboard.astro`, with a view for each address: My dashboard (`/dashboard/`: the revision queue for today, progress by unit, weak areas, practice by source, where the reader left off, then My Business Workspace and the reader's data) and Your progress (`/progress/`, the old address: every count, every subtopic with what was done on it, every page opened by kind and every piece of practice). Both read these keys through `workspaceView()` in `src/lib/workspace.ts`, which builds on `dashboardView()` in `src/lib/dashboard.ts`; the dashboard's own additions (results counted as practice, the plan and study settings cleaned on import) are in `src/lib/workspace-progress.ts`, so pages with a Save button do not load them. Three keys belong to the learner record, with their rules (parsing, size caps, merging, the import check) in `src/lib/learner.ts`: `bb:learner`, written by the recorder `src/scripts/learner.ts` with the pages opened by kind and the exercise items checked (it listens for the quiz engine's `quiz:progress`); `bb:saved`, written by the save button (`src/components/ui/SaveButton.astro`) and by the workspace's "Add a page to your list"; and `bb:studied`, the subtopics marked complete with study mode's **Mark as complete**. The recorder runs once a page, only when storage works and the reader has not paused it. `recentVisits(log, n)` gives the pages last opened, newest first and once each, for "Recently viewed".

Progress, weak areas and the revision queue are pure functions in `src/lib/progress.ts`: results by subtopic from the question bank (`bb:bank`), the practice questions (`bb:q:…`), Paper 2 calculation practice (`bb:p2-practice`), the flashcards (`bb:cards`, read defensively), the recall cards (`bb:rc:…`) and the exercises, each a value from 0 to 1; the weak-area rule (at least 3 results averaging under 60%), stated to the reader in one sentence; studied and completed by unit at the reader's level; and the queue for today (planned sessions, cards due, weak subtopics, subtopics not started). What they need to know about the course is built from the content by `src/lib/progress-build.ts`. The revision planner (`/revision/planner/`) is `src/lib/planner.ts` (the schedule, the kept plan in `bb:planner`, progress and the calendar file) with `src/scripts/planner.ts`. Study mode on the subtopic pages is `src/components/learn/StudyMode.astro`, `src/scripts/study-mode.ts` and `src/lib/study.ts` (text size and low light in `bb:study`, applied by an inline script before the article is drawn; the reading progress and the On this page list read from the article's own section headings).

Three keys are the workspace's own, with every rule (parsing damaged input, caps, merging, the selection export and the import's cleaning) in `src/lib/workspace.ts`:

- `bb:workspace:list`: the learning list's arrangement, the order the reader gave the saved items and each one's status (to do, in progress, done) and short note. `bb:saved` itself is unchanged; items saved since the reader last arranged the list come first.
- `bb:workspace:notes`: the notebook, case notes under six headings (problem identified, evidence, relevant theory, strategic alternatives, recommendation, evaluation) or free notes, each attached to a page or standalone. Notes are written in the workspace or with "Add a note" beside every Save button (`src/scripts/note-button.ts`, one dialog per page built on first use); both use the form in `src/scripts/note-editor.ts`.
- `bb:workspace:snapshots`: results saved from the Financial Laboratory with "Save this result to my workspace" (in `src/scripts/finance-lab/engine.ts`): the calculator, its figures as `report.given` lists them, the headline and the date, with an address that reopens the calculator on the same figures where it can read them back.

The workspace's saved analyses are read from each tool's own items (`bb:strategy:`, `bb:market:`, `bb:people:`, `bb:ops:`, `bb:lab:` with its summaries, `bb:boardroom:` and the rest), never written. A selection of work exports as Markdown or as JSON in the whole-record export's format, holding only the chosen items, so "Import a copy" reads either file and combines the list, the notebook and the snapshots with what is there. The page's parts are in `src/scripts/workspace/` (the list, notes, analyses and export), joined by `src/scripts/dashboard.ts`.

Controls that need a script outside an interaction carry `needs-js`; an inline script in the head adds the class `js` to `<html>` before the first paint, and the controls stay hidden without it. A browser test checks that no page shows a button it cannot run.

Quick revision keeps one item, `bb:cards`: the flashcards' Leitner boxes, due days and last ratings, card by card, written by the flashcards page and by the recall cards on the subtopic pages, whose ratings schedule the same cards (`src/lib/flashcards.ts` holds every rule, from parsing to merging on import).

The quiz engine (`src/scripts/quiz.ts`) dispatches a bubbling `quiz:progress` event whenever an item is checked, so a component around it, such as a case lab, can follow the learner without knowing the quiz's internals.

## Motion

`src/styles/motion.css` holds the motion patterns and `src/scripts/motion.ts` the scroll reveals; see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#motion). Page transitions are native cross-document view transitions (`@view-transition`), so browsers without them simply navigate. The opt-in is an inline style at the top of every page's head (BaseLayout), not in a linked stylesheet: Chromium decides whether the new page takes part before its stylesheets may have arrived, and from a stylesheet it often skipped the transition and reported an error. Chart animation uses `tween()` from `src/scripts/ix.ts`, which draws the end state at once under reduced motion.

## Routes

| Route | Page |
| --- | --- |
| `/` | Home |
| `/topics/` | The topic library: all 37 subtopics by unit |
| `/topics/[id]/` | Topic briefs (1.5, 2.3, 3.3) |
| `/topics/[slug]/` | A page for every other subtopic: what the course asks, notes, mindmap, diagrams, key terms, tools, recall, connections |
| `/mindmaps/`, `/mindmaps/[id]/` | Mindmaps for every subtopic and unit |
| `/diagrams/` | The diagram library |
| `/glossary/`, `/glossary/[id]/` | The glossary, and a page for every term |
| `/frameworks/`, `/frameworks/[id]/` | The frameworks library: an index by purpose and standing, and a page for every framework, each with its Apply it mode at `#apply` |
| `/frameworks/lab/` | The Framework Application Lab: choose a framework by the decision you face, by purpose and by standing, and open its application mode; the advanced applications in the Strategy Studio |
| `/frameworks/compare/`, `/frameworks/compare/[slug]/`, `/frameworks/compare/data/[id].json` | Framework comparison: the tool sets any two frameworks in the library side by side under nine headings, from one JSON file per framework that the build writes, with the pair kept in the address (`?a=&b=`); each curated comparison of the `comparisons` collection has a page of its own, which also lists and works without JavaScript |
| `/assessment/`, `/assessment/internal-assessment/`, `/assessment/paper-1/`, `/assessment/paper-2/`, `/assessment/paper-3/` | The Assessment Centre (Paper 3 is the HL Strategic Planning Centre) |
| `/assessment/internal-assessment/[tool]/` | The IA tools, in the order a project uses them: `research-question`, `key-concept`, `methodology`, `documents`, `tool-selection`, `evidence`, `word-count`, `timeline`, `progress` |
| `/assessment/question-bank/`, `/assessment/paper-2/practice/`, `/assessment/paper-1/workspace/` | The question bank, Paper 2 calculation practice (a question opens from its code after `#`) and the Paper 1 workspace |
| `/mindmaps/enrichment/[id]/` | The nine enrichment maps beyond the course |
| `/intelligence/`, `/intelligence/[id]/`, `/intelligence/themes/[theme]/` | The Business Intelligence Briefing laid out as an issue, its items (each answering six questions, every fact tied to a dated source) and a page for each theme, so the themes work without JavaScript |
| `/resources/`, `/resources/[id]/`, `/resources/formula-sheet/` | The Resources Library in twelve categories (search, filters behind one Filter button on a phone, cards or a list, the selection kept in the address), a details page for each curated download, and the formula sheet: the IB formulae sheet as printed, then the other formulas the platform uses, each placed in the course |
| `/teachers/`, `/teachers/checklists/`, `/teachers/checklists/[slug]/`, `/teachers/activities/[id]/` | The Teacher resource area, marked For teachers on every page: lesson sequences, discussion prompts, classroom activities, topic checklists (one printable page per subtopic and all on one page), teaching downloads and how to set work. It links both ways with the teachers' pathway (`/pathways/teachers/`) |
| `/downloads/glossary.csv`, `/downloads/topic-checklists.csv`, `/downloads/mindmaps/[id].svg`, `/downloads/mindmaps/enrichment/[id].svg`, `/downloads/diagrams/[id].svg`, `/downloads/guides/*.pdf` | Downloads (the PDFs are files in `public/`, with first-page previews in `public/images/resources/` rendered once by `scripts/brand/guide-covers.mjs`; the rest are written by the build) |
| `/case-vault/`, `/cases/[id]/` | The Case Vault (the archive, its filters and the Case of the Week) and the case files; `/cases/` sends readers on to the vault |
| `/decision-room/`, `/decision-room/[id]/` | Decision Rooms |
| `/decision-room/scenarios/` | The Business Scenario Generator: a fictional scenario from a family and a seed, shared as `?s=<family>-<seed>`, worked in six steps with feedback, a model answer outline and a summary; filters by unit, subtopic and toolkit tool |
| `/decision-room/stakeholder-impact/` | The Stakeholder Impact Simulator: a decision, its scale, speed, mitigation and communication (kept in the address), and the effect on seven stakeholder groups with the trade-offs and a power and interest grid |
| `/boardroom/`, `/boardroom/[id]/` | The Boardroom: multi-round simulations, each a brief, a generated board pack, the simulation (a casebook without JavaScript) and a debrief |
| `/boardroom/executive/`, `/boardroom/executive/simulation/` | The Boardroom's executive simulation: the company brief, the seven roles and how it works; then the nine stages and the debrief (a casebook with a worked example without JavaScript) |
| `/finance-desk/`, `/finance-desk/costs-and-revenue/`, `/finance-desk/break-even/`, `/finance-desk/contribution/`, `/finance-desk/ratios/`, `/finance-desk/cash-flow/`, `/finance-desk/investment-appraisal/` | Finance Desk |
| `/finance-desk/lab/`, `/finance-desk/lab/[id]/` | The Financial Laboratory and its twenty calculators (`src/lib/finance-lab/catalogue.ts`) |
| `/finance-desk/advanced/`, `/finance-desk/advanced/integrated-forecast/`, `/finance-desk/advanced/capital-budgeting/`, `/finance-desk/advanced/break-even-scenarios/`, `/finance-desk/advanced/performance-dashboard/` | Advanced financial analysis, beyond the IB course: the index and its four tools (`src/lib/adv-finance/catalogue.ts`) |
| `/rooms/`, `/case-room/`, `/case-room/halden-diagnosis/`, `/strategy-studio/`, `/market-studio/`, `/people-and-culture/`, `/operations-floor/` | All rooms; the rooms with pages of their own; the case lab |
| `/strategy-studio/[tool]/` | The Strategy Studio's tools: `swot`, `steeple`, `five-forces`, `ansoff`, `bcg-matrix`, `generic-strategies`, `scenarios`, `stakeholder-map`, `stakeholder-salience`, `decision-tree`, `force-field`, `option-appraisal`, `strategic-fit` |
| `/market-studio/[instrument]/` | The nine Market Studio instruments, from one template (`src/pages/market-studio/[tool].astro`) |
| `/people-and-culture/[tool]/`, `/operations-floor/[tool]/` | The five People and Culture and five Operations Floor tools, from one frame (`src/components/tools/ToolPage.astro`, `src/lib/room-tools.ts`) |
| `/dashboard/`, `/progress/` | My dashboard: what to revise today, progress by unit, weak areas, practice and where the reader left off, then My Business Workspace (the learning list, notes, saved analyses and the export of selected work) and the reader's data; Your progress, at the old address: the full record behind it |
| `/toolkit/`, `/toolkit/[id]/` | Toolkit (guides for complete tools only) |
| `/exam-desk/practice/` | All practice questions, filterable (the other Exam Desk addresses redirect to the Assessment Centre) |
| `/examiner-lens/`, `/ia-studio/` | Command terms; the IA planner |
| `/revision/`, `/revision/[id]/` | Printable revision briefs |
| `/revision/planner/` | The revision planner: a week-by-week plan from the examination date, level, subtopics, hours and study days, kept on this device, printed or added to a calendar |
| `/revision/`, `/revision/[slug]/` | Quick revision: the index of all 37 subtopics by unit, and a printable revision sheet for each at its topic page's slug (key points, definitions, formulae, frameworks, common mistakes, exercises, recall questions), built by `src/lib/revision/` |
| `/revision/flashcards/`, `/revision/flashcards/deck.json` | The flashcards, with spaced repetition kept as `bb:cards`; `?topic=3.5` opens on a subtopic; the deck is a static JSON file the build writes from the content |
| `/ib/`, `/ib/map/`, `/ib/coverage/`, `/ib/concepts/` | The IB course, the course map, the coverage matrix, concepts |
| `/search/`, `/sources/` | Search across everything, built from the content and every navigation link by `src/lib/search-index.ts` (assembled once in `src/lib/search-entries.ts`), with filters by kind, unit and level kept in the address; the sources and claims register |
| `/search.json` | The same entries in a compact form (`src/lib/suggest.ts`), loaded by the header's search panel the first time it opens: suggestions as the reader types, every kind ranked together, a slip forgiven, and the pages this browser opened most recently (`src/scripts/header-search.ts`) |
| `/ib/`, `/ib/map/`, `/ib/coverage/`, `/ib/concepts/`, `/ib/connections/` | The IB course, the course map, the coverage matrix, concepts, and the connections map (the subtopics on a ring with their worked connections, drawn at build time, with the same content as readable lists) |
| `/search/`, `/sources/` | Search across everything, built from the content and every navigation link by `src/lib/search-index.ts`, with filters by kind, unit and level kept in the address; the sources and claims register |
| `/pathways/`, `/pathways/[id]/` | Audience pathways |
| `/entrepreneurship-lab/`, `/entrepreneurship-lab/[slug]/` | The Entrepreneurship and Innovation Lab: its home, six briefings and six tools, from the `briefings` and `labTools` collections |
| `/tutorials/` | One-to-one tutoring with Arjun Agrawal: what it covers, how a session works, the five pathways and their fees, and the enquiry by email |
| `/advanced/`, `/advanced/[domain]/`, `/advanced/[domain]/[id]/` | Advanced Management and Strategy, beyond the IB course: the hub, a page for each domain with modules, and each module in eight parts (`src/lib/advanced.ts` holds the domains and the plan) |
| `/boardroom-briefings/`, `/boardroom-briefings/[id]/` | The Boardroom Briefings: the series' index, and each briefing in a Student edition and an Analysis edition (a closed disclosure without JavaScript; `#analysis` opens it), from the `boardroomBriefings` collection |
| `/about/`, `/platform/`, `/accessibility/`, `/privacy/` | About the creator and the platform |
| `/sitemap.xml` | Written after the build by `scripts/build/sitemap.mjs` from the pages the build wrote, leaving out redirect stubs and noindex pages, so no page can be left out (`npm run build` runs it) |
| `/robots.txt`, `/404.html` | Generated |

All internal links end with a slash (`trailingSlash: 'always'` in `astro.config.mjs` and `vercel.json`), and the link checker enforces it.

Moved addresses (the Exam Desk paper pages) are listed under `redirects` in `astro.config.mjs`; the build writes a small redirect page for each.

## Brand opening

`BaseLayout.astro` adds the class `js` to `<html>` in an inline script before the first paint (controls marked `js-only` stay hidden without scripts). A second inline script, `INTRO_GATE` from `src/lib/intro.ts`, then decides before the first paint whether the opening plays, from the navigation alone and with nothing stored. It plays on every fresh entry (a new tab, a typed address, a link from another site, a reload). It does not play when the reader moves between the site's own pages, on Back or Forward, or in a browser under automation, unless `?intro` is in the address. Under reduced motion it is a still card. When it plays, `CinematicIntro.astro` clones its markup from a `<template>`, runs its own small script, and removes itself; a timed backstop and a CSS failsafe end it if anything goes wrong. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#the-opening).

## The SL and HL switch

HL-only content carries `data-level="HL"`. The switch sets `data-level` on `<html>` and stores the choice as `bb:level`; a small inline script in `BaseLayout.astro` applies it before the first paint, so there is no flash. CSS hides HL-only content for SL readers, and every section with HL-only material shows a visible notice when it is hidden.

## Performance

- Fonts are self-hosted WOFF2 files split by Unicode range; the two used above the fold are preloaded.
- Shared styles (about 130 KB of CSS uncompressed, in a few files) are cached for a year under `/_astro/`; component styles are scoped.
- Scripts are loaded per component, as ES modules, and only on pages that use them.
- Charts are inline SVG, not images or a charting library.
