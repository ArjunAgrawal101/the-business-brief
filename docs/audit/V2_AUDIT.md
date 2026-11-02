# The Business Brief 2.0: audit and plan

This is the Phase 1 record for 2.0: what was inspected, what the platform held before the redesign, how Arjun Agrawal Economics compares, what the new materials are, and the plan the work followed. The final state is in [RELEASE_REPORT.md](../RELEASE_REPORT.md).

## 1. What was inspected, and how

| Item | How it was inspected | Limits |
| --- | --- | --- |
| The live site, `the-business-brief-dun.vercel.app` | Not reachable from this environment: the network policy returns 403 for `*.vercel.app`. | Audited from the source and from local builds instead. Deployment of 2.0 could not be verified from here. |
| The Business Brief source, `ArjunAgrawal101/the-business-brief` at `b92753c` (release 0.2.0) | Every page built locally and screenshotted at desktop, tablet and phone widths; code and content read. | None. |
| Arjun Agrawal Economics, `ib-economics-pi.vercel.app` | The live site is blocked by the same policy. Its source, `ArjunAgrawal101/ib-economics`, was read at `f15bb26`, which is the latest commit on its `main` branch (fetched on 2 November 2026; nothing newer). | Read only. Nothing in that repository was changed, built for deployment or redeployed. |
| The supplied logo (`5.webp`) and photographs (`6.jpg`, `7.webp`, `8.jpg`, `9.webp`) | Viewed at full size; metadata read. | See section 4 for what is used and what is not. |
| `Part_6_520_to_594.pdf` | Every page text-extracted and viewed as an image. | The file actually holds book pages 511 to 582, not 520 to 594. |
| `ilovepdf_merged_2.pdf` (the creator's four assessment guides) | Every page read; split into four files. | Published as the creator's own work, pending the creator's confirmation. |
| The IB guide, the TSM and the earlier coursebook extracts | Inspected for 0.2.0 (see [RESOURCE_INVENTORY.md](RESOURCE_INVENTORY.md)). | Unchanged. |

## 2. The platform before 2.0

Release 0.2.0 had a verified course spine (all 37 subtopics checked against the guide), three complete topic briefs (one of which also teaches 5.5), three fictional case files, three Decision Rooms, twenty working tools, 24 original practice questions, an IA Studio, an Exam Desk, the Examiner Lens and a claims register. Against the 2.0 brief it lacked:

- **Brand.** No consistent creator identity: the AA monogram was not used, the typography did not match the brand, and there was no opening.
- **Course coverage.** 34 of 37 subtopics had no page of their own; they existed only as rows on the syllabus map.
- **Glossary.** 44 terms, on one page, without per-term pages, filters or the difference between everyday and syllabus meaning.
- **Mindmaps and diagrams.** None.
- **Assessment.** The Exam Desk explained the papers but offered no workspace for Paper 1 answers or the Paper 3 plan, and the IA Studio had no research question builder or supporting document checks.
- **Resources.** No library, and no downloads beyond printable pages.
- **About.** A short creator note without the creator's photographs.

## 3. Arjun Agrawal Economics, compared

The Economics platform is a sister site by the same creator. 2.0 adapts what serves a Business Management learner and leaves the rest, and does not copy its design or reproduce its pages: The Business Brief keeps its own identity (navy, ivory and gold, the AA monogram, Source Serif and Inter, square corners and rules).

| Feature on Arjun Agrawal Economics | Relevance to Business Management | How The Business Brief adapts it | Where it lives | Status |
| --- | --- | --- | --- | --- |
| Course reference layer: curriculum explorer, SL and HL differences | High | A page for every subtopic built from the guide's content statements, with their AO levels and HL marking, plus the course map and a coverage tracker computed from the content | `/topics/`, `/ib/map/`, `/ib/coverage/` | Built |
| Glossary 2.0 (250 terms) | High | 558 terms, each with its own page: syllabus meaning, everyday meaning where it differs, related terms, the subtopics that use it; search and filters by letter, unit, subtopic, level and category; a CSV download | `/glossary/` | Built |
| Command term lab | High | The Examiner Lens: every command term at its AO level, in the platform's words | `/examiner-lens/` | Built in 0.2.0 |
| Nine-stage lessons | Medium | Not copied. Business Management uses topic briefs (situation, decision, consequence) and full subtopic notes (why it matters, sections with points, examples and diagrams, evaluation, retrieval) | `/topics/<subtopic>/` | Partly built: 3 briefs and full notes for 14 subtopics (the site's coverage tracker lists them) |
| Mindmaps (42 maps, 13 modes) | High | 42 maps: every subtopic and each unit. Branches coloured by kind (concept, types, theory, tool, calculation, evaluation); full and revision views; fold, zoom, pan, print, SVG and PNG download; an outline for screen readers | `/mindmaps/` | Built, with two views rather than thirteen modes |
| Diagram atlas (35 plates with reading guides) | High | 79 original diagrams drawn from data, each with a text description and an SVG download, for all five units and the toolkit | `/diagrams/` | Built; per-diagram reading guides planned |
| Computed models you can move | High | Business tools that answer back: break-even, cash flow, ratios, investment appraisal, stock control, capacity, location, decision trees, force field | Finance Desk, Operations Floor, toolkit | Built in 0.2.0 |
| Calculation centre with generated practice | High | Worked calculations with full working inside the tools; Paper 2 construction practice; a formula sheet from the guide's list | `/assessment/paper-2/`, `/resources/formula-sheet/` | Partly built: no generated practice yet |
| Real-world case library (203 cases) | Medium | Business cases are fictional by policy, with simulated data that adds up; real organizations appear only as cited, dated facts | `/cases/` | Partly built: 3 case files |
| Case room: fact, interpretation, inference | High | The Case Room lab: problem, cause, strategy, implementation, evaluation | `/case-room/` | Built in 0.2.0 |
| Policy Decision Room | High | Decision Rooms: commit to a choice, then follow its consequences | `/decision-room/` | Built in 0.2.0 |
| Exam cockpit and answer diagnostic | High | A Paper 1 annotated answer builder; a Paper 3 Boardroom plan builder across marketing, operations, human resources and finance, reviewed against criteria A to D. Neither marks the answer | `/assessment/paper-1/`, `/assessment/paper-3/` | Built; no timer |
| Assessment centre for every component | High | The Assessment Centre, which separates four kinds of guidance on the page: IB requirement, examiner emphasis, recommended strategy, illustrative example | `/assessment/` | Built |
| IA command centre | High | IA tools: research question builder, supporting document analyser (dates, balance, key concept), criterion self-review, submission checklist, planner. Approves nothing and predicts no grade | `/assessment/internal-assessment/`, `/ia-studio/` | Built |
| Exam DNA (analysis of released questions) | Medium | Not adopted: it needs a record of released papers, and none was supplied | | Not adopted |
| Original exam practice | High | Original practice questions with mark schemes, each labelled as not an IB question | `/exam-desk/practice/` | Partly built: 24 questions |
| Timed sessions and spaced retrieval | Medium | Retrieval questions on every brief and set of notes, with self-ratings kept on the device | Subtopic pages | Partly built: no timed sessions |
| Dashboards and workspace | Medium | A progress page on the device; no account, no tracking | `/progress/` | Partly built |
| Teacher tools | Medium | A teachers' pathway, printable revision briefs and case files | `/pathways/teachers/` | Partly built |
| Resources hub (links to Google Drive) | High | A Resources Library hosted on the site: filters, search, sort, covers and details pages, and a download only where the file exists | `/resources/` | Built |
| Curated video library | Low | Not adopted: no videos were supplied, and every link would need checking | | Not adopted |
| TOK × Economics | Medium | The concept lens on each brief applies the four key concepts; no TOK section | Topic briefs | Partly built |
| Educator profile with photographs | High | A full About page with the creator's own photographs (no AI-generated photograph presented as a real activity) and verified facts only | `/about/` | Built |
| Public "Everywhere" layer | Medium | Pathways for entrepreneurs, professionals and independent learners | `/pathways/` | Partly built |
| Extended essay studio | Low | Not requested for Business Management | | Not adopted |
| Brand cover and opening | High | A five-second AA monogram opening: once per device, skippable, off under reduced motion, never in the way | Home page | Built |
| Integrity dashboards | High | Build-time integrity checks that fail the build on a broken reference between content items or a download whose file is missing; a public claims register with a source for every statement about the IB course | `/sources/` | Built, as build checks |
| Offline single file and service worker | Low | Not adopted: a static site that works without JavaScript is the fallback | | Not adopted |

## 4. New materials

| File | What it is | Use |
| --- | --- | --- |
| `5.webp` | The Arjun Agrawal logo (AA monogram, wordmark, tagline) | Matched by the vector master in `public/brand/creator/`, compared side by side; the monogram's paths are used unchanged in `src/lib/brand.ts`. Proportions and colours preserved. |
| `6.jpg` | Traditional attire, full length | About page |
| `7.webp` | A classroom scene labelled "AI-generated content" | **Not used**, as the creator asked: no AI-generated photograph is presented as a real professional activity |
| `8.jpg` | Addressing an audience | About page, home page creator section |
| `9.webp` | Formal portrait | Home and About heroes. It carries Google Gemini's sparkle mark, so it was made or edited with AI; it is used only as a portrait, never as a record of an activity, and is flagged for the creator to confirm |
| `Part_6_520_to_594.pdf` | Coursebook pages 511 to 582: the end of 5.5, chapters 5.6 to 5.9, the IA chapter, the glossary and the index | Read for coverage and accuracy of the unit 5 glossary, maps and notes; nothing reproduced. Errors found in it (for example a mislabelled axis, "8,0000") are listed in the scratchpad inventory and are not repeated on the site |
| `ilovepdf_merged_2.pdf` | The creator's four assessment guides (IA, Paper 1, Paper 2, Paper 3) | Split into four downloads in `public/downloads/guides/` and used as the basis for the Assessment Centre's examiner emphasis and recommended strategies, each labelled as such |

Copyright: no supplied PDF is committed to the repository, and no textbook passage, table, figure or case is reproduced.

## 5. The plan

| Phase | Work |
| --- | --- |
| 1 | This audit; the resource inventory; the comparison above |
| 2 | Brand system (tokens, type, the monogram), header and footer, the opening, the homepage, the About page |
| 3 | Subtopic pages for all 37 subtopics; glossary 2.0; mindmaps for every subtopic and unit; full notes, one subtopic at a time, each complete |
| 4 | The Assessment Centre: IA, Paper 1, Paper 2, Paper 3 |
| 5 | The Resources Library, with real downloads only |
| 6 | The diagram library; motion refinement |
| 7 | Testing, documentation, commits, push and the release report |

Notes are written a subtopic at a time and only when complete, rather than all 37 at once and thin. The coverage tracker shows which subtopics have full notes, which are taught in a brief, and which are planned.
