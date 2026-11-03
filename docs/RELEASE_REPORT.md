# Release report: 2.1.0

3 November 2026

## Summary

The Business Brief 2.1 turns the 2.0 platform into a learning ecosystem. It adds a cinematic opening on every fresh visit, a navigation in five groups, and a distinct identity for each room. Every subtopic now has full notes or a complete brief. New working rooms cover finance, strategy, marketing, people, operations and entrepreneurship. There are also multi-round Boardroom simulations, a Case Vault, a question bank with calculation practice, internal assessment tools, a learner dashboard and a sourced Business Intelligence briefing. The audit behind it is in [audit/ECOSYSTEM_AUDIT.md](audit/ECOSYSTEM_AUDIT.md), and the release history is in [CHANGELOG.md](../CHANGELOG.md).

The source is on `main` at https://github.com/ArjunAgrawal101/the-business-brief, and Vercel deploys from that branch. **The deployed site could not be checked from this environment**, because its network policy blocks `*.vercel.app` (see below).

## Implemented, by part of the brief

| Part of the brief | Outcome |
| --- | --- |
| Audit | The source, every page and interaction of the build, the Economics source (read only, unchanged) and the supplied materials; what was excellent, incomplete, underdeveloped, missing or contradictory, and what could not be verified ([ECOSYSTEM_AUDIT.md](audit/ECOSYSTEM_AUDIT.md)) |
| Visual identity | Navy, ivory and champagne gold kept from 2.0. Each room now has its own accent, ground and motif: Finance Desk, Strategy Studio, Market Studio, People and Culture, Operations Floor, Entrepreneurship Lab, Boardroom, Case Room and Case Vault, Assessment Centre. Every colour pair passes its contrast check |
| Cinematic opening | About five seconds on every fresh entry (a new tab, a typed address, a link from elsewhere, a reload), in any browser, decided without storing anything. It never plays between the site's own pages. It has a Skip intro button, a progress bar, and any key, click, tap or scroll ends it. Under reduced motion it is a still card. It works on phones, keeps the page readable to screen readers throughout, and ends by itself if scripts fail |
| Home page, A to I | A: a hero with five ways in. B: the ecosystem drawn as a floor plan. C: a featured briefing with the Case of the Week, a decision challenge, a financial challenge, an insight and a framework. D: explore by objective. E: explore by pathway. F: a live break-even preview. G: the latest additions. H: the creator. I: a closing invitation |
| Learning library | All 37 subtopics complete: 34 with full notes and 3 with complete briefs, SL and HL kept apart. Each set of notes holds objectives, sections with points, worked examples, formulas, diagrams, applications across industries, stakeholder perspectives, a decision exercise, evaluation, original exam-style questions with guidance, a summary, retrieval questions and connections. Each finance subtopic links to its own calculators |
| Strategy Studio | 10 tools, each stating its limitations: SWOT, STEEPLE, five forces, Ansoff, the BCG matrix, generic strategies, a stakeholder map, a decision tree, force field analysis and option appraisal |
| Finance Desk | The Financial Laboratory's 20 calculators, each with the formula, the substitution and working, an interpretation, the business implication, a chart, a sensitivity check and downloads, beside the case workspaces. Enrichment is labelled apart from the IB course, and each calculator opens a practice question on the same calculation |
| Market Studio | 9 instruments: market metrics, a research questionnaire, a customer persona, an STP planner, a positioning map, a marketing mix, a product life cycle simulator, a campaign planner and a budget allocator |
| People and Culture | 5 tools: motivation analysis, leadership scenarios, an organization chart with delayering, workforce planning, and a change planner |
| Operations Floor | 5 tools: production methods, a location assessment, capacity and productivity, a stock control simulator, and an economic order quantity calculator |
| Entrepreneurship Lab | 6 briefings and 6 tools (a business model canvas, feasibility, start-up costs, a revenue planner, unit economics, and a business plan that gathers the others) |
| Boardroom | 3 multi-round, cross-functional simulations, with accounts that reconcile, directors whose goals conflict, a memo and a debrief |
| Case Room and Case Vault | 9 fictional cases across nine industries, with filters, a Case of the Week and decision exercises. Real organizations appear only in the briefing, with dated sources |
| Mindmaps | 42 course maps and 9 enrichment maps for undergraduate and MBA study |
| Frameworks and infographics | 35 frameworks, models and tools, each with a diagram, method, example, strengths, limits and an exercise; 90 original diagrams |
| Glossary | 701 terms (566 from the IB course, 135 beyond it), with simple and technical explanations, misconceptions and filters |
| Assessment Centre | IA tools (documents, key concept, tool selection, timeline, progress), the Paper 1 workspace, Paper 2 calculation practice and the HL Strategic Planning Centre. A 269-question bank with filters, self-rating, timed sets and export. Every practice item is labelled as the platform's own |
| Learner | A dashboard and saved items kept in this browser only; search across 1,743 entries; seven distinct pathways, never one combined syllabus |
| Business Intelligence | 8 real developments from 2025 and 2026, every fact dated and traced to its source, the analysis labelled. It is a curated briefing, not live news |
| Resources Library | 158 resources; 47 download as files, the rest open as printable pages |
| Navigation | Explore, Practise, Tools, Assess and Discover, with a panel for each on wide screens and a drawer on phones; the footer and search use the same list |
| Coverage | Home, Topics and Coverage report the same counts, from one function |
| QA | The checks below, a browser test that uses each of the newest tools, a reflow test at 320 pixels, and walkthroughs as six kinds of reader |

## Tests

On the final 2.1 source and build (details in [TESTING.md](TESTING.md)):

| Check | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints (606 files) |
| ESLint and the content lint | No problems (835 source files, 1,011 built pages) |
| Unit tests | 899 passed in 51 files |
| Build | 1,011 pages; the integrity checks pass |
| Link check | 171,077 internal links and assets, none broken; 31 external links listed, not fetched |
| Contrast | 52 colour pairs, all pass |
| Reflow | No page scrolls sideways at 320 pixels |
| Persona walkthroughs | 6 routes passed: first-time visitor, IB student (phone), teacher, undergraduate (tablet), MBA student, entrepreneur (phone) |
| Browser tests | 872 passed and 3 skipped by design (two wide-screen navigation tests on the phone, one drawer test on the desktop), in 19.4 minutes, with no failures and no retries, on the build of `562bde5`. After two small content changes (a storage item added to the privacy page, a pathway marked live) the affected specs were run again on the final build: tools, reflow, navigation, the privacy and pathway pages and the privacy test, 55 passed and 3 skipped |
| GitHub CI | The QA workflow (check, lint, unit tests, build, links, the full browser suite and contrast) passed on `562bde5`, with the same browser result. The two runs before it failed on the glossary page whose overflow `562bde5` fixed |

Found and fixed during QA:

- Page transitions failed on most navigations and reported an error.
- Pages scrolled sideways at narrow widths, from long tags, long words and text kept for screen readers inside wide tables. The last of these failed CI on a glossary page.
- The newest tools had no browser test that used them.
- The finance subtopics and their calculators were not linked to each other or to practice.
- A type clash between two rooms' tools.
- An HL question labelled as Paper 1 style.
- Stale wording once every subtopic was complete.

## In development

| Item | Status |
| --- | --- |
| Hofstede's cultural dimensions | The fifteenth toolkit guide; the other 14 are written |
| Operations Floor | A supply chain mapper, a quality simulation (5.3, HL) and a crisis scenario (5.7, HL); the room stays marked partly built |
| Market Studio and People and Culture | Instruments for 4.3 and 4.6; tools for 2.5 and 2.7 |
| Revision briefs | Written for the three subtopics taught in briefs; the other 34 are to come |
| Examiner Lens | Examiner observations need subject reports, which were not supplied |
| Case Vault | Real-organization cases, only from cited, dated evidence |
| Pathways | Undergraduate reading lists and longer cases; MBA corporate strategy cases |
| Paper 2 practice | A budget variance question kind |

The full order is in [ROADMAP.md](ROADMAP.md).

## Known limitations

- **Deployment not verified.** The push to `main` triggers Vercel, but `the-business-brief-dun.vercel.app` cannot be reached from this environment.
- **Browsers and people.** Only Chromium was tested, with emulated phones; no real devices, other browsers or users of assistive technology ([TESTING.md](TESTING.md#what-is-not-tested)).
- **Sources.** External links are listed but not fetched. The briefing could only draw on the four publishers whose sites this environment could read, and, being dated, it will age.
- **Page weight.** The question bank lists all 269 questions so that it works without JavaScript: 1.3 MB, or 197 KB compressed.
- **Astro 6.4.8** has published advisories with low exposure for a static site; the fix needs Node 24 (SECURITY.md).
- **GitHub Pages.** The repository also runs GitHub's Pages build on every push, which fails because the site is built for Vercel. It does not affect the site, but it marks every commit with a failed check.

## Decisions for the creator

1. **The formal portrait** (`9.webp`) carries Google Gemini's sparkle mark. It is used only as a portrait, cropped above the mark. Confirm it, or supply an original photograph.
2. **The classroom photograph** (`7.webp`) is labelled as AI-generated, and is not used.
3. **The four assessment guides** are public downloads. Confirm that they may be.
4. **The About page** and its contact address (from your Economics profile). Confirm, or say what to change.
5. **Licensing.** Commercial use by teacher resource platforms needs a licence from the IB. The platform paraphrases and cites, and reproduces no IB text.
6. **Network access.** To let deployments be checked from here, allow `the-business-brief-dun.vercel.app` in the environment's network settings. To widen the briefing, allow the publishers to be cited (for example `sec.gov` and companies' investor relations sites).
7. **GitHub Pages.** Turn it off in the repository's Settings, under Pages, since Vercel hosts the site.

## Delivery

- **Source:** `main`. This report is in the release commit, and `git log` lists every commit.
- **Supplied files:** the PDFs are inventoried and never committed. The photographs used are in `assets/creator/originals/`, with rights reserved, outside the code licence.
