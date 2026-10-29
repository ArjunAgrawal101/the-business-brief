# Enhancement audit and plan

29 October 2026. The starting point is release 0.1.0, commit `f59adf8` on `main` of `ArjunAgrawal101/the-business-brief` (public, approved by the creator). The supplied documents are inventoried in [RESOURCE_INVENTORY.md](RESOURCE_INVENTORY.md).

## 1. Codebase

| Area | State at the start |
| --- | --- |
| Stack | Astro 6.4.8 static site, TypeScript strict, Zod content schemas, YAML content, Vitest, Playwright with axe-core, ESLint. No UI framework; about 72 KB of JavaScript in total, loaded per component |
| Repository | Clean working tree on `main`, tracking `origin/main`; CI (`.github/workflows/ci.yml`) green on GitHub |
| Routes | 54 pages: home, 3 topic briefs, 3 case files, 3 Decision Rooms, Finance Desk (3 desks), Toolkit (6 guides), Exam Desk (3 papers, practice), Examiner Lens, IA Studio, revision, IB course, coverage, concepts, glossary, pathways (7), search, sources, about, platform, accessibility, privacy, 404 |
| Content | 50 YAML files: 3 topics, 3 cases, 3 decisions, 11 interactions, 15 tools, 13 calculations, 22 questions, 44 glossary terms, 31 command terms, 27 sources, 26 claims |
| Quality | 47 unit tests (including recomputation of every case figure), 147 browser tests with axe on every page at two sizes, content lint, link check, contrast check: all passing |
| Deployment | `vercel.json` configured; not deployed. No secrets or environment variables beyond the optional `SITE_URL` |

**Retain:** the content model and integrity gate, the shared calculation core, progressive enhancement, the identity and tokens, the test suites. They work, and replacing them would add risk without benefit.

**Problems found**

| Priority | Problem |
| --- | --- |
| P0 accuracy | The IB mapping was assembled from secondary sources before the guide was supplied. Checked against the guide: 3.6 is "Efficiency ratio analysis"; critical path analysis is an HL tool; paper structures, marks and IA criteria can now be stated; "Interpret" is not a command term and "List" is missing; "Identify" is AO1 |
| P0 accuracy | Labour turnover is HL-only content (2.4) but was taught and practised at SL in the leadership brief |
| P0 accuracy | The costs brief taught contribution and break-even (5.5) under 3.3 without saying so; semi-variable costs are not in the guide's list of cost types |
| P0 accuracy | Command term definitions were quoted from the IB Economics guide; the guide's notice on use by resource platforms makes the platform's own wording the safer course |
| P0 security | Astro 6.4.8 has published advisories (low exposure for a static site; see SECURITY.md). The fix, Astro 7.4, needs Node 22.23.4 or later, which this environment does not have. Unchanged; documented |
| P1 experience | No motion system: no page transitions, no considered reveals, charts redraw without transition |
| P1 experience | The home page is text-led; environments have no visual identity of their own; the desktop header has no route to the full list of rooms |
| P1 experience | Five environments (Market Studio, Operations Floor, Boardroom, People and Culture, Strategy Studio) are planned or thin |
| P1 learning | No staged case analysis following DATA, INSIGHT, OPTION, RECOMMENDATION, or a diagnosis following PROBLEM, CAUSE, STRATEGY, IMPLEMENTATION, EVALUATION; Decision Rooms cover SITUATION, DECISION, CONSEQUENCE only |
| P1 learning | Finance Desk lacks cash flow (3.7), ratios (3.5, 3.6), investment appraisal (3.8) |
| P2 | No progress record across the platform; no map connecting topics, tools, cases and concepts |

## 2. Comparative design audit: Arjun Agrawal Economics

The live site could not be reached from this environment (the network policy blocks it). The comparison uses renders of its source repository, `ArjunAgrawal101/ib-economics` at `f15bb26`, made during the first release.

| | Arjun Agrawal Economics | The Business Brief |
| --- | --- | --- |
| Shared, keep | Editorial seriousness, numbered sections, figure captions that label illustrative data, an SL and HL switch, the creator's signature and portrait, rigorous sourcing | Same standards, expressed differently |
| Display type | High-contrast serif headlines with a gold italic accent | Inter Tight, tight tracking, set like a business publication |
| Colour | Ink and cream with burgundy actions and gold | Ink and paper with cobalt for the learner's choice, brass for the document and advanced material, green and red for outcomes |
| Signature object | A live supply and demand diagram | The decision memo; the board pack that changes as you decide |
| Lesson structure | Eight horizontal stages (learn, see, try, explain, apply, evaluate, retrieve, connect) and a three-level depth switch | Briefs organized as situation, ideas, evidence, decision and evaluation, with a progress rail of their own; no depth switch |
| Shape | Rounded chips, soft cards | Square corners, rules, hard offset shadows for objects you can pick up |
| Interaction | Diagram manipulation | Commit-and-consequence decisions, case evidence, workspaces with full working |

The enhancement keeps these differences: no serif display headlines, no burgundy, no eight-stage tabs, no depth switch.

## 3. Prioritized plan

| Priority | Work | Status |
| --- | --- | --- |
| P0 | Verify the whole IB mapping against the guide and correct the content (section 1) | This phase |
| P0 | State assessment facts from the guide with page references; rewrite command terms in the platform's words at the right AO levels | This phase |
| P1 | Motion system: native page transitions, restrained reveals, animated chart updates, all off under reduced motion | This phase |
| P1 | Icon set and section identities for each environment; home page and navigation refinement | This phase |
| P1 | One complete staged case lab | This phase |
| P1 | One polished quantitative experience: a cash flow forecast lab in the IB layout | This phase |
| P2 | Finance Desk: ratios and investment appraisal; Market Studio, Operations Floor, People and Culture with working tools | This phase, as far as quality allows |
| P2 | Progress on this device; a course map | This phase, as far as quality allows |
| P3 | Boardroom simulations, recommendations across topics, accounts, analytics | Later, after testing with learners |
