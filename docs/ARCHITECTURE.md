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

There is no UI framework. Components are `.astro` files; browser behaviour is plain TypeScript modules bundled by Vite. The whole site ships about 72 KB of JavaScript, split by component, and loads only the scripts a page uses.

## Why static

The platform has no accounts and stores nothing on a server. A static site is the simplest thing that meets the requirements: it is fast, cheap to host, has no runtime attack surface, and can be read offline once loaded. If accounts, progress tracking or analytics are ever added, they need a privacy and consent review first (see `src/pages/privacy.astro`).

## The content layer

`src/content.config.ts` defines the collections:

| Collection | Source | Loader |
| --- | --- | --- |
| topics, cases, decisions, tools, interactives, curricula | one YAML file per entry | Astro `glob` |
| questions, glossary | several YAML files, each a list of entries with ids | custom `yamlList` loader (checks for duplicate ids) |
| calculations, assessment, commandTerms, concepts, pathways, modules, sources, claims | one YAML file of entries in `src/content/data/` | Astro `file` |

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
- practice question mark schemes add up to the question's marks, and their command terms exist.

The same checks run in the unit tests (`tests/unit/integrity.test.ts`), which load the YAML directly without Astro.

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
| `src/lib/format.ts` | en-GB number and money formatting with the typographic minus |
| `src/lib/charts.ts` | SVG charts (break-even, decision tree, scale), each with a title and a text description |
| `src/lib/render.ts`, `src/lib/tree-view.ts` | HTML fragments used by both the server render and the browser scripts |

`tests/unit/cases.test.ts` recomputes the case figures, the Decision Room board packs and the practice question answers from the exhibits with these functions.

## Progressive enhancement

Each interaction follows the same pattern:

1. The `.astro` component renders the complete default state on the server: inputs with their default values, results, chart, data table and working, or, for the classification exercises, every item with its answer inside an "Answer and explanation" disclosure.
2. The component embeds its configuration as JSON in `<script type="application/json" data-config>`, escaped with `jsonForScript()` so no string can close the element.
3. A script in `src/scripts/` finds every instance with `each()` from `src/scripts/ix.ts`, adds the class `is-enhanced`, and attaches behaviour. Elements marked `js-only` are hidden until then; elements marked `nojs-only` are hidden after.
4. Changing results are announced through a polite live region; errors are shown beside the field and marked with `aria-invalid`.
5. If a script fails, the component shows its own error message and the server-rendered content remains.

Work that a learner might want back is kept in `localStorage` under keys starting `bb:` (listed on the privacy page). Storage access never throws: if it is blocked, the interaction still works for the visit.

## Routes

| Route | Page |
| --- | --- |
| `/` | Home |
| `/topics/`, `/topics/[id]/` | Topic briefs |
| `/cases/`, `/cases/[id]/` | Case files |
| `/decision-room/`, `/decision-room/[id]/` | Decision Rooms |
| `/finance-desk/`, `/finance-desk/costs-and-revenue/`, `/finance-desk/break-even/`, `/finance-desk/contribution/` | Finance Desk |
| `/toolkit/`, `/toolkit/[id]/` | Toolkit (guides for complete tools only) |
| `/exam-desk/`, `/exam-desk/paper-1/`, `/exam-desk/paper-2/`, `/exam-desk/paper-3/`, `/exam-desk/practice/` | Exam Desk |
| `/examiner-lens/`, `/ia-studio/` | Command terms; the research project |
| `/revision/`, `/revision/[id]/` | Printable revision briefs |
| `/ib/`, `/ib/coverage/`, `/ib/concepts/` | The IB course, coverage matrix, concepts |
| `/glossary/`, `/search/`, `/sources/` | Reference |
| `/pathways/`, `/pathways/[id]/` | Audience pathways |
| `/about/`, `/platform/`, `/accessibility/`, `/privacy/` | About the creator and the platform |
| `/sitemap.xml`, `/robots.txt`, `/404.html` | Generated |

All internal links end with a slash (`trailingSlash: 'always'` in `astro.config.mjs` and `vercel.json`), and the link checker enforces it.

## The SL and HL switch

HL-only content carries `data-level="HL"`. The switch sets `data-level` on `<html>` and stores the choice as `bb:level`; a small inline script in `BaseLayout.astro` applies it before the first paint, so there is no flash. CSS hides HL-only content for SL readers, and every section with HL-only material shows a visible notice when it is hidden.

## Performance

- Fonts are self-hosted WOFF2 files split by Unicode range; the two used above the fold are preloaded.
- One stylesheet (about 80 KB uncompressed) is shared by every page and cached for a year under `/_astro/`.
- Scripts are loaded per component, as ES modules, and only on pages that use them.
- Charts are inline SVG, not images or a charting library.
