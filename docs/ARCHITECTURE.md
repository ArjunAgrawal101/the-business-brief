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
| calculations, assessment, commandTerms, concepts, pathways, modules, claims, resources | one YAML file of entries in `src/content/data/` | Astro `file` |
| sources | the register, one YAML file per area in `src/content/sources/`, each a list of entries with ids | `yamlList` (checks for duplicate ids across the files) |
| advanced | one YAML file per Advanced Management module in `src/content/advanced/`, with its schema in `src/lib/advanced-schema.ts` and its checks in `src/lib/integrity-advanced.ts` | `yamlFiles` |
| studio | one YAML file per Strategy Studio tool, and one for its engagement, in `src/content/studio/` (schema in `src/lib/schemas-strategy.ts`) | Astro `glob` |
| briefings, labTools | one YAML file per entry in `src/content/briefings/` and `src/content/lab/`, with their schemas in `src/lib/lab/schemas.ts` | Astro `glob` |
| boardroomBriefings | one YAML file per briefing in `src/content/boardroom-briefings/`, with its schema in `src/lib/boardroom-briefings/schema.ts` | Astro `glob` |

Two kinds of material are code rather than content, because they are drawn or computed: the diagram library (`src/lib/diagrams.ts`, with the drawings in `src/lib/figures/`) and the Resources Library catalogue (`src/lib/resources.ts`), which joins the curated `resources.yaml` with entries generated from the content (mindmaps, notes, briefs, revision briefs, cases, Decision Rooms, tools, practice and the diagram groups).

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
- a resource is offered as a download only when its file exists in `public/` or is one the build writes (`/downloads/glossary.csv`, `/downloads/mindmaps/*.svg`, `/downloads/diagrams/*.svg`);
- for the Boardroom Briefings (`src/lib/boardroom-briefings/integrity.ts`, run by `src/lib/boardroom-briefings/content.ts` before any briefing page is built): the series is numbered without gaps and asks no question twice; the fictional flag matches the sourcing (a fictional company's exhibits are all simulated data and it cites no source about a real organization; a real company's are external evidence with dated, addressed sources); every source exists and is used, and research and ideas beyond the course cite one; the strategic context, market and research evidence carry no figures; every subtopic, term, framework, tool and command term resolves, with HL-only material marked HL; every option is judged and scored once, the weights add up to 100, the weighted scores are right and the recommendation is the best-scored option unless it says why not; and every figure recomputes: each exhibit's checks rework its cells, every declared figure works out, and every figure written in the text is a cell, a figure or a score (`src/lib/boardroom-briefings/figures.ts`);
- for the Entrepreneurship and Innovation Lab (`src/lib/integrity-lab.ts`, run by `src/lib/lab/content.ts` before any Lab page is built): every briefing section is mapped to an IB subtopic, marked as enrichment, or both; every idea in a briefing's register says whether it is IB content, a toolkit tool or enrichment, with the guide's page for the first two; every code, glossary term, tool and source resolves; each tool's example is a valid input to its own model; briefings and tools pair one to one by order; and the room's entry in `modules.yaml` lists exactly the Lab's pages and only the subtopics its material maps to.
- for Advanced Management (`src/lib/integrity-advanced.ts`, run by `src/lib/advanced-content.ts` before any of its pages is built): every module is on the plan in `src/lib/advanced.ts` and covers each topic planned for it; orders and titles are unique within a domain; every source, framework and IB bridge code exists; a real application carries sources and the date its facts were read, and a real case carries sources; exhibit rows fit their columns; IB documents are never offered as further reading; and every module reaches 1,500 words, so no thin page is published.

The same checks run in the unit tests (`tests/unit/integrity.test.ts`), which load the YAML directly without Astro.

## The shell: opening, navigation, rooms and home

| Module | Responsibility |
| --- | --- |
| `src/lib/intro.ts` | When the opening plays: the rule as source text, run in the head before the first paint and unit-tested as the same text (every fresh entry; never between pages, on Back or Forward, or under automation) |
| `src/components/brand/CinematicIntro.astro` | The five-second sequence, in a `<template>` cloned only when it plays, with its own small script and a CSS failsafe |
| `src/lib/navigation.ts` | The six groups (Learn, Practise, Tools, Assess, Advance, Connect) and their links, read by the header's mega menu and drawer, the footer, the home page's floor plan, search and the dashboard; `navPosition()` marks the current group |
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
| `src/lib/ia.ts` | The IA planner's checks on supporting documents, dates, word count and self-marks, each citing its page |
| `src/lib/format.ts` | en-GB number and money formatting with the typographic minus |
| `src/lib/charts.ts`, `cashflow-chart.ts`, `plan-chart.ts`, `charts-studio.ts` | SVG charts (break-even, decision tree, scale, cash flow, plans, the studio tools), each with a title and a text description |
| `src/lib/render.ts`, `tree-view.ts`, `cashflow-render.ts`, `render-studio.ts` | HTML fragments used by both the server render and the browser scripts |

`tests/unit/cases.test.ts` recomputes the case figures, the Decision Room board packs and the practice question answers from the exhibits with these functions.

## Progressive enhancement

Each interaction follows the same pattern:

1. The `.astro` component renders the complete default state on the server: inputs with their default values, results, chart, data table and working, or, for the classification exercises, every item with its answer inside an "Answer and explanation" disclosure.
2. The component embeds its configuration as JSON in `<script type="application/json" data-config>`, escaped with `jsonForScript()` so no string can close the element.
3. A script in `src/scripts/` finds every instance with `each()` from `src/scripts/ix.ts`, adds the class `is-enhanced`, and attaches behaviour. Elements marked `js-only` are hidden until then; elements marked `nojs-only` are hidden after.
4. Changing results are announced through a polite live region; errors are shown beside the field and marked with `aria-invalid`.
5. If a script fails, the component shows its own error message and the server-rendered content remains.

Work that a learner might want back is kept in `localStorage` under keys starting `bb:` (listed on the privacy page). Storage access never throws: if it is blocked, the interaction still works for the visit. My Business Workspace (`/dashboard/`, also rendered at its old address, `/progress/`; the component is `src/components/learner/Dashboard.astro`) reads these keys through `workspaceView()` in `src/lib/workspace.ts`, which builds on `dashboardView()` in `src/lib/dashboard.ts`. Two keys came with the dashboard, with their rules (parsing, size caps, merging, the import check) in `src/lib/learner.ts`: `bb:learner`, written by the recorder `src/scripts/learner.ts` with the pages opened by kind and the exercise items checked (it listens for the quiz engine's `quiz:progress`), and `bb:saved`, written by the save button (`src/components/ui/SaveButton.astro`) and by the workspace's "Add a page to your list". The recorder runs once a page, only when storage works and the reader has not paused it.

Three keys are the workspace's own, with every rule (parsing damaged input, caps, merging, the selection export and the import's cleaning) in `src/lib/workspace.ts`:

- `bb:workspace:list`: the learning list's arrangement, the order the reader gave the saved items and each one's status (to do, in progress, done) and short note. `bb:saved` itself is unchanged; items saved since the reader last arranged the list come first.
- `bb:workspace:notes`: the notebook, case notes under six headings (problem identified, evidence, relevant theory, strategic alternatives, recommendation, evaluation) or free notes, each attached to a page or standalone. Notes are written in the workspace or with "Add a note" beside every Save button (`src/scripts/note-button.ts`, one dialog per page built on first use); both use the form in `src/scripts/note-editor.ts`.
- `bb:workspace:snapshots`: results saved from the Financial Laboratory with "Save this result to my workspace" (in `src/scripts/finance-lab/engine.ts`): the calculator, its figures as `report.given` lists them, the headline and the date, with an address that reopens the calculator on the same figures where it can read them back.

The workspace's saved analyses are read from each tool's own items (`bb:strategy:`, `bb:market:`, `bb:people:`, `bb:ops:`, `bb:lab:` with its summaries, `bb:boardroom:` and the rest), never written. A selection of work exports as Markdown or as JSON in the whole-record export's format, holding only the chosen items, so "Import a copy" reads either file and combines the list, the notebook and the snapshots with what is there. The page's parts are in `src/scripts/workspace/` (the list, notes, analyses and export), joined by `src/scripts/dashboard.ts`.

Controls that need a script outside an interaction carry `needs-js`; an inline script in the head adds the class `js` to `<html>` before the first paint, and the controls stay hidden without it. A browser test checks that no page shows a button it cannot run.

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
| `/assessment/`, `/assessment/internal-assessment/`, `/assessment/paper-1/`, `/assessment/paper-2/`, `/assessment/paper-3/` | The Assessment Centre (Paper 3 is the HL Strategic Planning Centre) |
| `/assessment/internal-assessment/[tool]/` | The IA tools: `documents`, `key-concept`, `tool-selection`, `timeline`, `progress` |
| `/assessment/question-bank/`, `/assessment/paper-2/practice/`, `/assessment/paper-1/workspace/` | The question bank, Paper 2 calculation practice (a question opens from its code after `#`) and the Paper 1 workspace |
| `/mindmaps/enrichment/[id]/` | The nine enrichment maps beyond the course |
| `/intelligence/`, `/intelligence/[id]/`, `/intelligence/themes/[theme]/` | The Business Intelligence Briefing laid out as an issue, its items (each answering six questions, every fact tied to a dated source) and a page for each theme, so the themes work without JavaScript |
| `/resources/`, `/resources/[id]/`, `/resources/formula-sheet/` | The Resources Library, details pages, the formula sheet |
| `/downloads/glossary.csv`, `/downloads/mindmaps/[id].svg`, `/downloads/diagrams/[id].svg`, `/downloads/guides/*.pdf` | Downloads (the PDFs are files in `public/`; the rest are written by the build) |
| `/case-vault/`, `/cases/[id]/` | The Case Vault (the archive, its filters and the Case of the Week) and the case files; `/cases/` sends readers on to the vault |
| `/decision-room/`, `/decision-room/[id]/` | Decision Rooms |
| `/boardroom/`, `/boardroom/[id]/` | The Boardroom: multi-round simulations, each a brief, a generated board pack, the simulation (a casebook without JavaScript) and a debrief |
| `/boardroom/executive/`, `/boardroom/executive/simulation/` | The Boardroom's executive simulation: the company brief, the seven roles and how it works; then the nine stages and the debrief (a casebook with a worked example without JavaScript) |
| `/finance-desk/`, `/finance-desk/costs-and-revenue/`, `/finance-desk/break-even/`, `/finance-desk/contribution/`, `/finance-desk/ratios/`, `/finance-desk/cash-flow/`, `/finance-desk/investment-appraisal/` | Finance Desk |
| `/finance-desk/lab/`, `/finance-desk/lab/[id]/` | The Financial Laboratory and its twenty calculators (`src/lib/finance-lab/catalogue.ts`) |
| `/finance-desk/advanced/`, `/finance-desk/advanced/integrated-forecast/`, `/finance-desk/advanced/capital-budgeting/`, `/finance-desk/advanced/break-even-scenarios/`, `/finance-desk/advanced/performance-dashboard/` | Advanced financial analysis, beyond the IB course: the index and its four tools (`src/lib/adv-finance/catalogue.ts`) |
| `/rooms/`, `/case-room/`, `/case-room/halden-diagnosis/`, `/strategy-studio/`, `/market-studio/`, `/people-and-culture/`, `/operations-floor/` | All rooms; the rooms with pages of their own; the case lab |
| `/strategy-studio/[tool]/` | The Strategy Studio's tools: `swot`, `steeple`, `five-forces`, `ansoff`, `bcg-matrix`, `generic-strategies`, `scenarios`, `stakeholder-map`, `stakeholder-salience`, `decision-tree`, `force-field`, `option-appraisal`, `strategic-fit` |
| `/market-studio/[instrument]/` | The nine Market Studio instruments, from one template (`src/pages/market-studio/[tool].astro`) |
| `/people-and-culture/[tool]/`, `/operations-floor/[tool]/` | The five People and Culture and five Operations Floor tools, from one frame (`src/components/tools/ToolPage.astro`, `src/lib/room-tools.ts`) |
| `/dashboard/`, `/progress/` | My Business Workspace, the learner dashboard: the learning list, notes, saved analyses and the export of selected work, with what this browser has kept (the old address renders the same page) |
| `/toolkit/`, `/toolkit/[id]/` | Toolkit (guides for complete tools only) |
| `/exam-desk/practice/` | All practice questions, filterable (the other Exam Desk addresses redirect to the Assessment Centre) |
| `/examiner-lens/`, `/ia-studio/` | Command terms; the IA planner |
| `/revision/`, `/revision/[id]/` | Printable revision briefs |
| `/ib/`, `/ib/map/`, `/ib/coverage/`, `/ib/concepts/` | The IB course, the course map, the coverage matrix, concepts |
| `/search/`, `/sources/` | Search across everything, built from the content and every navigation link by `src/lib/search-index.ts`, with filters by kind, unit and level kept in the address; the sources and claims register |
| `/pathways/`, `/pathways/[id]/` | Audience pathways |
| `/entrepreneurship-lab/`, `/entrepreneurship-lab/[slug]/` | The Entrepreneurship and Innovation Lab: its home, six briefings and six tools, from the `briefings` and `labTools` collections |
| `/tutorials/` | One-to-one tutoring with Arjun Agrawal: what it covers, how a session works, the five pathways and their fees, and the enquiry by email |
| `/advanced/`, `/advanced/[domain]/`, `/advanced/[domain]/[id]/` | Advanced Management and Strategy, beyond the IB course: the hub, a page for each domain with modules, and each module in eight parts (`src/lib/advanced.ts` holds the domains and the plan) |
| `/boardroom-briefings/`, `/boardroom-briefings/[id]/` | The Boardroom Briefings: the series' index, and each briefing in a Student edition and an Analysis edition (a closed disclosure without JavaScript; `#analysis` opens it), from the `boardroomBriefings` collection |
| `/about/`, `/platform/`, `/accessibility/`, `/privacy/` | About the creator and the platform |
| `/sitemap.xml`, `/robots.txt`, `/404.html` | Generated |

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
