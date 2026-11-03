# Arjun Agrawal | The Business Brief

**Strategy. Leadership. Decisions.**

The Business Brief is a business management learning platform built around one idea: learn business by making the decision. Every topic starts with a business in a situation, works through the ideas needed to read it, and ends with a decision the learner makes, defends and sees the consequences of.

It is written first for IB Diploma Programme Business Management (SL and HL), with pathways for secondary students, undergraduates, MBA students, teachers, entrepreneurs and independent learners built on the same foundation. It is an independent sibling of [Arjun Agrawal Economics](https://ib-economics-pi.vercel.app/), sharing its standards but not its design.

## What is in this release (2.1.0)

| | |
| --- | --- |
| Opening | Five seconds on every fresh entry, in any browser, never between the site's own pages and decided without storing anything; Skip intro, a progress bar, any key, click or scroll to end it; a still card under reduced motion |
| Navigation | Explore, Practise, Tools, Assess and Discover: panels on wide screens, a drawer on phones and tablets; footer, search and the home page built from the same list |
| Rooms | Each with its own accent, ground and motif: Finance Desk, Strategy Studio, Market Studio, People and Culture, Operations Floor, Entrepreneurship Lab, Boardroom, Case Room and Case Vault, Assessment Centre |
| Topic library | All 37 subtopics complete: 34 with full notes (situation, sections, applications, stakeholders, decision, exam-style practice, summary) and 3 with complete briefs; home, Topics and Coverage agree |
| Knowledge | 701 glossary terms (566 IB, 135 beyond the course); 35 frameworks with diagrams and exercises; 14 of the 15 toolkit guides; 42 course mindmaps and 9 enrichment maps; 90 original diagrams |
| Financial Laboratory | 20 calculators with formula, working, interpretation, implication, chart, sensitivity and downloads |
| Studios and tools | Strategy Studio (10 tools), Market Studio (9), People and Culture (5), Operations Floor (5), Entrepreneurship Lab (6 briefings, 6 tools) |
| Simulations and cases | 3 multi-round Boardroom simulations; 9 fictional Case Vault cases across nine industries with a Case of the Week; 3 Decision Rooms and the Case Room lab |
| Assessment Centre | A 269-question bank, Paper 2 calculation practice (23 kinds), the Paper 1 workspace, five IA tools and the HL Strategic Planning Centre; practice is labelled as the platform's own |
| Business Intelligence | 8 real developments from 2025 and 2026, every fact dated and sourced, the analysis labelled; never presented as live news |
| Learner | Seven distinct pathways; a dashboard and saved items kept in this browser only; search across 1,743 entries |
| Pages | 1,011, built statically; the browser tests check every page kind with axe-core at desktop and phone sizes |

What is not built yet, and why, is in [docs/RELEASE_REPORT.md](docs/RELEASE_REPORT.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requires Node.js 22, version 22.12 or later (`.nvmrc`).

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
| `npm test` | Unit tests: every calculator and model against hand-worked values (finance, the Financial Laboratory, cash flow, ratios, investment appraisal, plan scheduling, the studios, the room tools, the Boardroom's accounts, the Lab), the IA and Assessment Centre rules, the question bank and Paper 2 practice, the learner record, search, every diagram's figures, recomputation of every figure in the cases, and the content's integrity |
| `npm run test:e2e` | Browser tests with Playwright and axe-core, against the built site: every page at desktop and phone sizes, reflow at 320 pixels, and each interaction used as a learner would. Set `PW_PORT` to run on another port |
| `npm run qa:links` | Every internal link, asset and fragment in `dist/` |
| `npm run qa:contrast` | WCAG contrast of the colour tokens |
| `npm run qa:screens` | Screenshots of key pages at 1440, 1024, 768 and 390 pixels into `qa-output/` |
| `npm run qa` | Check, lint, unit tests, build, links and browser tests in order |
| `npm run qa:diagrams` | Every diagram in a browser: no label outside its frame or overlapping another (run against a preview) |
| `npm run qa:personas` | Six kinds of reader click through the site on their own devices, from the first-time visitor to the entrepreneur (run against a preview) |
| `npm run brand` | Renders the favicon, app icons, social card and print templates from the AA monogram's master |

## Project structure

```
src/
  content/           All teaching content, as YAML (topics, notes, mindmaps, glossary, cases,
                     decisions, tools, interactives, questions, curricula, data/)
  content.config.ts  Collections and the custom YAML list loader
  lib/               Schemas, integrity checks, finance and model functions, the mindmap
                     engine, the diagram library (figures/), coverage, the resources
                     catalogue, and renderers shared by server and browser
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
| [docs/audit/](docs/audit/) | The ecosystem audit behind 2.1, the 2.0 audit with the comparison with Arjun Agrawal Economics, the earlier enhancement audit, and the inventory of the supplied materials |
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

Code: MIT. Educational content, the Arjun Agrawal identity (name, monogram, logo and photographs) and The Business Brief: all rights reserved. See [LICENSE](LICENSE).

This is an independent educational resource. It is not affiliated with, endorsed by, or produced by the International Baccalaureate Organization.
