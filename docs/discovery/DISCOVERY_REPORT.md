# Discovery report

**Phase A of The Business Brief.** Written on 29 October 2026, before any platform code was written. It records what was actually inspected, what could not be verified, and the decisions that followed.

## 1. What was inspected, and how

| Item | How it was inspected | Result |
|---|---|---|
| Economics platform source | Full repository `ArjunAgrawal101/ib-economics`, cloned into the session (236 files). README, architecture decision, design system, content architecture, release reports, brand assets, modules and data read directly. | Inspected in full. |
| Economics platform, rendered | Served locally from the repository and screenshotted with Playwright at 1440 px and 390 px: onboarding, home, a lesson (2.5), the Learning Studio. | Inspected as rendered from source. |
| Economics platform, live URL | `https://ib-economics-pi.vercel.app/` | **Not reachable from this session.** The environment's network policy blocks the host. The live deployment was not inspected; the rendered source stands in for it. |
| Other repositories on the account | `ArjunAgrawal101/dp-assessments` and `ArjunAgrawal101/ib-dp-assessments`, cloned read-only. | Inspected. Both are an IB DP and CP assessment procedures platform (React, TypeScript, Vite). Useful for two Business Management facts with section and page references (section 4). |
| Business Management source files | The workspace, the home directory and every accessible repository were searched for a Business Management guide, teacher support material, subject reports, coursebooks, toolkit workbooks, previous Business Brief pilots, design specifications and handover documents. | **None found.** No IB Business Management guide, specimen paper, markscheme, subject report, coursebook, earlier Business Brief pilot or handover document is accessible in this session. |
| Brand assets | `assets/brand/` in the Economics repository. | Found: the authentic AA monogram and logo (vector masters and PNGs, light and reversed), the wordmark, app icons, a social card and two portraits. |
| GitHub | GitHub MCP tools (`get_me`, `create_repository`, `push_files`), the session's repository list. | Account `ArjunAgrawal101` confirmed. **Repository creation returned `403 Resource not accessible by integration`.** The Claude GitHub App cannot create repositories on this account; it can push only to repositories it is installed on. |
| Deployment | Economics `pages.yml`, `api/youtube.js`, the README. | Economics publishes through GitHub Pages (`pages.yml`, no build step) and is also served at a Vercel domain, with one Vercel serverless function. No Vercel CLI credentials exist in this session, so no deployment can be made from here. |
| Network | Direct requests from the container. | Only package registries and GitHub are reachable. The IB website, Wikipedia and font CDNs are not. A server-side web search tool works and was used to corroborate the syllabus structure (section 4). |

## 2. What the Economics platform does well

1. **Rigour as a product feature.** Every IB claim carries provenance (IB OFFICIAL, TEACHER-CREATED, ARJUN AGRAWAL ANALYSIS); simulated numbers are labelled; a self-test suite of about 2,100 checks guards content and calculations; differences between a brief and the guide are recorded rather than smoothed over.
2. **Mechanism before definition.** Lessons open with the mechanism, then attach terminology. Interactions exist to make a chain of reasoning visible, not to decorate.
3. **Honest coverage.** The coverage matrix shows zeros. Missing sources are named as missing.
4. **Editorial craft.** A small palette, self-hosted typefaces under the SIL Open Font Licence, numbered and captioned figures, restrained motion that is removed under reduced motion, visible focus.
5. **No account wall.** Everything works in the browser with nothing transmitted; progress is local.
6. **A credible creator profile** that states only supplied facts and describes no institution as a current workplace.

## 3. What its implementation reveals, and the lessons taken

| Observation in the Economics source | Lesson for The Business Brief |
|---|---|
| One `index.html` of about 5.4 MB, with 4.7 MB of inline JavaScript and content compiled into the page. Its own architecture decision names this as the main maintainability risk. | Content lives in structured files validated by a schema, separate from presentation. Pages are generated, not hand-assembled. |
| Hash routes (`#/section/tab`) that search engines cannot index; a pre-render stage was planned but not built. | Every page is a real, crawlable URL with its own title, description and canonical address. |
| A start-up self-test that takes about 2.4 s of a 3.7 s load. | Tests run at build and in CI, never in the reader's browser. |
| An onboarding gate that asks for a name before the home page. | No gate. Ordinary resources open directly. |
| Strong provenance discipline. | Kept, extended to seven labels, and enforced by a test: a block without a provenance label fails the build. |

## 4. Business Management sources actually available

| Source | Status | How it may be used |
|---|---|---|
| IB Business management guide (first assessment 2024) | **Not available in this session** | Nothing is quoted from it. Every syllabus statement on the platform carries the status *verify against the Guide*. |
| IB teacher support material, subject reports, specimen and past papers, markschemes | **Not available** | No examiner observation, past-paper frequency or official question is used or implied. |
| IB *DP and CP Assessment procedures 2027*, as recorded with section and page in the creator's own platform (`dp-assessments`, `subjects.ts`, `knowledge-core-subjects.ts`) | Secondary record of a primary document | Two facts: the internal assessment is a research project of at most 1,800 words on an issue facing an organization through a conceptual lens (D3.2, p. 192); Paper 1 is based on a pre-released statement issued about three months before the examination, giving context and roughly the first 200 words of the case study (D3.3, p. 194). Labelled with that provenance. |
| IB Economics guide (first assessment 2022), command-term glossary, as extracted in the Economics repository | Primary IB document, for a different subject | The wording of command terms shared with Business Management, labelled as Economics-guide wording to be confirmed against the Business management guide. |
| Secondary web sources (Save My Exams, RevisionDojo, Clastify, ThinkIB, school course outlines) found with a web search | Corroboration only | Used to corroborate the unit and subtopic numbering, the four concepts, the fifteen toolkit tools and the assessment weightings. They disagree in places (the position of break-even, the title of 3.6), so none of them is treated as authoritative. |
| Coursebooks and toolkit workbooks | **Not available** | Not used and not reproduced. |

**Consequence.** The syllabus spine (five units, their subtopics, HL-only status) is built from corroborated secondary evidence and is marked *verify against the Guide* throughout. The platform says so on every curriculum page. Supplying the Guide is the single most valuable next input (see the roadmap).

## 5. Standards that connect the two platforms

- The creator identity: the authentic AA monogram and the name Arjun Agrawal, used as a signature, not as the subject brand.
- Provenance discipline and honest coverage.
- Accuracy over appearance; no manufactured data outside clearly labelled teaching cases.
- Self-hosted open-licence typefaces, visible focus, reduced-motion support, no account wall, no tracking.
- The same licence model: MIT for code; educational content and brand reserved.
- The same independence statement about the IB.

## 6. What must stay unique to Business Management

| Economics uses | The Business Brief uses instead |
|---|---|
| Bodoni Moda display, burgundy, brass on ink, chalk paper | Inter Tight display, cobalt, ink on warm paper, sharp document corners |
| Figures captioned *Fig. 1*, diagram plates | *Exhibits*, as in a board paper or consulting report, with a source line |
| A dark cover with a live supply and demand model | A light briefing-document cover with a live decision |
| Eight lesson stages: learn, see, try, explain, apply, evaluate, retrieve, connect | Situation, decision, consequence; data, insight, option, recommendation |
| The economic chain | The case file, the decision log and the options matrix |
| Diagrams of markets | Unit economics, stakeholders, options and trade-offs |

## 7. Integrations

| Integration | Available | Used for |
|---|---|---|
| GitHub MCP (authenticated as `ArjunAgrawal101`) | Yes, but cannot create repositories (403) | Reading; pushing once the repository exists and the app is installed on it |
| Git over the session proxy | Yes | Local repository, commits, push when authorised |
| GitHub CLI | Not usable in this session | None |
| Vercel | No credentials | Configuration prepared; deployment left to the owner |
| npm registry | Yes | Dependencies and the open-licence typefaces |
| Web search | Yes | Corroborating secondary sources |
| Live Economics URL, IB website | No | None |

## 8. Decisions

1. **A static site, generated by Astro 6.4.8**, with content in YAML validated by Zod schemas at build time and interactivity in small TypeScript modules without a UI framework. Reasons are in `ARCHITECTURE.md`. Astro 7 was considered and deferred: it requires Node 22.23.4 or later, and this build environment runs 22.22, so it could not be verified here.
2. **Real URLs for every resource**; a build-time search index with filters; no server.
3. **Three pilot experiences built completely** (1.5 growth and evolution, 3.3 costs and revenues with 5.5 break-even, 2.3 leadership and management) rather than many thin ones.
4. **Fictional teaching cases with simulated data** for the pilots, computed by the same tested functions the calculators use, so every figure in a case is internally consistent. Real-world references are limited to well-documented events and labelled as external evidence.
5. **Every module that is not built is shown as planned**, never linked as if it worked.

## 9. The first complete release

- Brand: a new Business Brief wordmark and decision mark, the authentic AA monogram as the creator signature, favicons, app icons and a social card.
- The design system as tokens and components.
- Home, the IB pathway with a syllabus map and coverage matrix, three topic experiences, three case files, three Decision Rooms, the Finance Desk (costs, contribution, break-even), five toolkit pages, the Exam Desk with original practice questions and markscheme reveal, the Examiner Lens (command terms), the IA Studio (verified facts and a planning framework), Revision Briefs, seven audience pathways, search, the source register, the creator page and an accessibility statement.
- Unit tests, content-integrity tests, browser tests, accessibility scans, a link check and screenshots at four widths.

## 10. Blockers that need the owner

1. **Create the repository.** Create an empty private repository `ArjunAgrawal101/the-business-brief` and give the Claude GitHub App access to it. Then the work can be pushed from a session.
2. **Supply the Business management guide** (and, ideally, specimen papers and a subject report) so that the syllabus statements can move from *verify* to *verified*.
3. **Allow the live Economics domain** in the environment's network settings if a later session should compare against the live site.
