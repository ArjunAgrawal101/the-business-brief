# Arjun Agrawal | The Business Brief

**Strategy. Leadership. Decisions.**

The Business Brief is a business management learning platform built around one idea: learn business by making the decision. Every topic starts with a business in a situation, works through the ideas needed to read it, and ends with a decision the learner makes, defends and sees the consequences of.

It is written first for IB Diploma Programme Business Management (SL and HL), with pathways for secondary students, undergraduates, MBA students, teachers, entrepreneurs and independent learners built on the same foundation. It is an independent sibling of [Arjun Agrawal Economics](https://ib-economics-pi.vercel.app/), sharing its standards but not its design.

## What is in this release (0.2.0)

| | |
| --- | --- |
| Rooms | 14 rooms, each with its own icon and page or status: 4 live, 9 partly built, 1 planned. A room is linked only when something in it works |
| Topic briefs | 3 complete: 1.5 Growth and evolution (strategic), 3.3 Costs and revenues with break-even (quantitative), 2.3 Leadership and management (people) |
| Case Room | A staged case lab on Halden Distribution following problem, cause, strategy, implementation and evaluation, with a plan scheduled by critical path analysis and a memo of the learner's own reasoning |
| Case files | 3 fictional cases with simulated, internally consistent data: Marigold Kitchens, Atelier Barro, Halden Distribution |
| Decision Rooms | 3 two-round rooms with a live board pack, consequences for stakeholders and a debrief |
| Finance Desk | Costs and revenue, break-even, contribution (HL), ratio analysis (3.5; 3.6 HL), cash flow in the IB forecast layout (3.7) and investment appraisal (3.8; NPV HL with the guide's discount factors); 28 calculations, each in eight parts |
| Market Studio and Operations Floor | Market share and growth, position maps, location scoring, and at HL capacity utilization and productivity and the stock control chart |
| Interactions | 20, plus the IA planner, practice self-checks and retrieval cards |
| Exam Desk and IA Studio | Every component as the guide sets it out, with page references; 24 original practice questions, including a paper 3 set in the guide's 2, 6 and 17 mark structure; the guide's 31 command terms at their AO levels; a ten-step IA planner that checks supporting documents |
| IB mapping | 5 units, 37 subtopics and 143 content statements checked against the Business management guide; a course map and a coverage table generated from the content |
| Motion and design | An original icon set, a restrained motion system (page transitions, reveals, chart updates), all of it off under reduced motion |
| Progress | A page that summarizes what this browser has kept; no account and nothing sent anywhere |
| Pages | 66, all passing automated WCAG 2.2 AA checks at desktop and phone widths |

What is not built yet, and why, is in [docs/RELEASE_REPORT.md](docs/RELEASE_REPORT.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requires Node.js 22.12 or later.

```bash
npm ci
```

```bash
npm run dev
```

The site runs at http://localhost:4321. To build and preview the static site:

```bash
npm run build
```

```bash
npm run preview
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static build into `dist/`. Fails if any content reference is broken (the integrity gate) |
| `npm run check` | Type check of Astro and TypeScript files |
| `npm run lint` | ESLint, then the content lint (no en or em dashes, no leaked values, no placeholders, YAML shape) |
| `npm test` | Unit tests: finance, cash flow, ratios, investment appraisal, plan scheduling, market and operations models, IA checks, and recomputation of every figure in the cases |
| `npm run test:e2e` | Browser tests with Playwright and axe-core, against the built site. Set `PW_PORT` to run on another port |
| `npm run qa:links` | Every internal link, asset and fragment in `dist/` |
| `npm run qa:contrast` | WCAG contrast of the colour tokens |
| `npm run qa:screens` | Screenshots of key pages at 1440, 1024, 768 and 390 pixels into `qa-output/` |
| `npm run qa` | Check, lint, unit tests, build, links and browser tests in order |
| `npm run brand` | Renders favicons, app icons, the social card and template previews from the master SVGs |

## Project structure

```
src/
  content/           All teaching content, as YAML (topics, cases, decisions, tools,
                     interactives, questions, glossary, curricula, data/)
  content.config.ts  Collections and the custom YAML list loader
  lib/               Schemas, integrity checks, finance and model functions, formatting,
                     chart and HTML renderers shared by server and browser
  components/        Layout, blocks, interactions, Decision Room, assessment, brand
  scripts/           Browser scripts for the interactions (progressive enhancement)
  pages/             Routes
  styles/            Tokens, base, components and page styles
public/              Fonts (with licences), brand assets, icons, manifest
scripts/             QA scripts and brand asset generation
tests/               Unit tests (Vitest) and browser tests (Playwright)
docs/                Architecture, design system, content model and the rest
```

## Documentation

| Document | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, content layer, integrity gate, progressive enhancement, routes |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Identity, colour, type, components, charts, asset library |
| [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md) | Collections, blocks, relationships, how to add a topic |
| [docs/CURRICULUM_MAPPING.md](docs/CURRICULUM_MAPPING.md) | The IB DP mapping and its verification status; rules for other curricula |
| [docs/SOURCE_GOVERNANCE.md](docs/SOURCE_GOVERNANCE.md) | Source hierarchy, provenance labels, the claims register, copyright |
| [docs/INTERACTIONS.md](docs/INTERACTIONS.md) | Each interaction: what the learner does, decides, learns, and the misconception it diagnoses |
| [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | WCAG 2.2 AA target, how it is met, test results, known gaps |
| [docs/TESTING.md](docs/TESTING.md) | Test inventory, results for this release, what is not tested |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel setup, separate from the Economics site |
| [docs/RELEASE_REPORT.md](docs/RELEASE_REPORT.md) | What was completed, what was not, and what is blocked |
| [docs/audit/](docs/audit/) | The enhancement audit and the inventory of the supplied documents |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What comes next |
| [docs/discovery/DISCOVERY_REPORT.md](docs/discovery/DISCOVERY_REPORT.md) | Phase A discovery |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to add and change content and code |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [SECURITY.md](SECURITY.md) | Reporting, dependency advisories and the upgrade path |

## Principles

- **Accuracy before polish.** Every statement about the IB course is checked against the IB Business management guide (first assessment 2024), gives its page and is recorded in the [claims register](src/content/data/claims.yaml). Facts are stated in the platform's words; the guide's text, markbands and descriptors are not reproduced.
- **Fiction is labelled.** The cases are fictional, their figures simulated and recomputed by the tests. Real organizations appear only as cited, dated facts kept apart from interpretation.
- **Practice is practice.** Every question is original; mark schemes and level descriptors are the platform's own.
- **Every page works without JavaScript.** Interactions add behaviour to complete, readable pages, and no page shows a control it cannot run.
- **Motion explains change.** It is quick, never delays reading, and stops under reduced motion.
- **One set of numbers.** All arithmetic is done in `src/lib/finance.ts` and the model modules, used by the pages, the calculators and the tests alike.

## Licence

Code: MIT. Educational content, the Arjun Agrawal identity and The Business Brief identity: all rights reserved. See [LICENSE](LICENSE).

This is an independent educational resource. It is not affiliated with, endorsed by, or produced by the International Baccalaureate Organization.
