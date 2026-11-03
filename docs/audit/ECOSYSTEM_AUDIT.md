# The learning ecosystem: audit, 3 November 2026

The record of the audit made before the ecosystem work (release 2.1): what was inspected, what the platform held, what was weak or missing, and what could not be verified. The outcome is in [RELEASE_REPORT.md](../RELEASE_REPORT.md); the 2.0 audit, with the full feature comparison with Arjun Agrawal Economics, is in [V2_AUDIT.md](V2_AUDIT.md).

## 1. What was inspected

| Item | How | Limits |
| --- | --- | --- |
| The live site, `the-business-brief-dun.vercel.app` | Not reachable: this environment's network policy refuses `*.vercel.app` (HTTP 403 from the proxy, checked again on 3 November). | Audited from the source on `main` (`812dcb5`), which Vercel deploys, built locally and checked in a browser at 390, 1024 and 1440 pixels. |
| Every page of the build | All 723 pages built; the browser suite loads every kind of page at desktop and phone sizes with axe-core; key pages read and screenshotted. | Chromium only. |
| Every interaction | The interaction, motion, navigation and no-JavaScript suites exercise each tool; tools were also used by hand in the browser. | |
| Arjun Agrawal Economics | The live site is blocked by the same policy. Its source (`ArjunAgrawal101/ib-economics`) is unchanged since the 2.0 audit: `f15bb26` is still the latest commit on `main` (fetched 3 November). | Read only. Nothing in that repository was changed. |
| Supplied materials | The IB guide, the TSM, the coursebook extracts, the creator's four assessment guides and the photographs, inventoried in [RESOURCE_INVENTORY.md](RESOURCE_INVENTORY.md). | No new materials were supplied with this brief. |

## 2. What is excellent and is kept

- **The method.** The three chains of reasoning (decide, analyse, diagnose) run through every topic, case and Decision Room. They are the platform's most distinctive idea.
- **The Decision Rooms and the Case Room lab.** Real consequences from a committed choice, and a staged diagnosis checked against evidence.
- **The fictional cases.** Complete, internally consistent exhibits whose figures the unit tests recompute.
- **Honesty built into the code.** The integrity gate fails the build on a broken reference; the claims register cites the guide's pages; provenance labels separate IB requirements from strategy, examples and enrichment; coverage is computed, not claimed.
- **The 2.0 libraries.** Mindmaps for every subtopic, 79 tested diagrams, a 558-term glossary, the Assessment Centre with its four labels, the Resources Library with real downloads only.
- **Accessibility and progressive enhancement.** Every page works without JavaScript and passes axe-core at two sizes.

## 3. What is incomplete

- **Notes.** 20 of 37 subtopics have a page, a mindmap, terms and diagrams, but no full notes. The notes that exist lack several parts of a complete brief: an opening situation, applications across industries, stakeholder implications, a decision exercise, exam-style questions with guidance and a revision summary.
- **Toolkit guides.** Nine of the fifteen toolkit entries are planned rather than written: BCG matrix, Porter's generic strategies, Gantt charts, critical path analysis, descriptive statistics, simple linear regression, Hofstede's dimensions, circular business models and the business plan.
- **Rooms.** The Strategy Studio and People and Culture are a list of links on a generic room page. The Market Studio has two tools and the Operations Floor three. The Finance Desk's tools are bound to fictional cases: nobody can enter their own figures.
- **Pathways.** The routes for secondary, undergraduate and MBA learners point mostly at IB material.
- **Revision briefs.** These exist only for the three subtopics taught in briefs.

## 4. What is visually underdeveloped

- Every room used one template, so moving between rooms felt like moving between copies of one page.
- The opening played once per browser, so most visits never saw it.
- The navigation was six flat links and a long list of rooms with statuses.
- The home page leaned on grids of cards (tools, cases, rooms, pathways) rather than composed sections.

## 5. What is missing entirely

- An Entrepreneurship and Innovation Lab.
- Multi-round Boardroom simulations across functions.
- A Case Vault with filters and a case of the week.
- A question bank with filters, timed practice and progress.
- Calculation practice with immediate feedback.
- IA tools for source evaluation, key concept selection, tool selection, timeline and progress.
- A learner dashboard and bookmarks.
- A frameworks library beyond the IB toolkit.
- Undergraduate and MBA mindmaps.
- Distinct curriculum maps for other qualifications.
- A business intelligence briefing.

## 6. Contradictions found

- The topic library led with **"Complete briefs: 3"** while the home page and the coverage tracker reported **17 subtopics complete**.
- Two room entries still said **"three complete topic briefs"**.
- The rooms page and the platform page said **"fourteen rooms"** as fixed text.

All of these now come from one calculation (`coverageSummary` in `src/lib/coverage.ts`) or are computed where they appear.

## 7. What cannot be verified from here, and how it is handled

| Need | Why it cannot be verified | Handling |
| --- | --- | --- |
| The deployed site | `*.vercel.app` is blocked | Checked from the source and local builds; the owner checks the live site, or allows the host in the environment's network settings |
| Real-world cases with dated sources | The open web is blocked, so no source can be read and cited | Cases are fictional and labelled; real organizations appear only where supplied material supports every fact |
| Live business news | As above, and a static site has no feed | No live briefing is built or simulated. A curated section needs sources the owner can supply or that can be read; until then it is not shown rather than invented. **Update, 3 November:** web search worked, and four publishers' own sites (Oracle, Microsoft, Google Cloud and Docker) could be read, so the Business Intelligence briefing was built from 8 developments whose every fact was read on the publisher's page that states it, dated and cited, with the date of reading. It is a curated briefing, not a feed, and says so |
| IGCSE, A level or university syllabuses | No official specification was supplied | Those pathways use general business content clearly labelled as not mapped to any qualification; nothing is presented as a qualification's requirement |
| Examiner observations | No subject reports were supplied | The "examiner observation" label stays reserved; guidance is labelled as the platform's recommendation |

## 8. Plan

The work follows the brief's six phases. Within each, a feature is built completely before the next, and content is written one subtopic at a time.

1. **Foundation.** The opening, the navigation, the room identities, the home page and the reconciled counts.
2. **Content.** Notes for the 20 remaining subtopics, the new note parts for all 34 sets of notes, glossary depth, frameworks and mindmaps.
3. **Laboratories.** The Finance Desk's own-figures lab, the Strategy Studio, the Market Studio, People and Culture with the Operations Floor, the Entrepreneurship Lab, the Case Vault and the Boardroom.
4. **Assessment and the learner.** The question bank, calculation practice, IA tools, dashboard, bookmarks and search filters.
5. **Advanced.** Pathways and any curated briefing that can be sourced.
6. **Quality assurance.** Every page and interaction, as each kind of learner.

Independent parts are built in parallel, each in its own branch. Each is reviewed, tested and merged only when it works.
