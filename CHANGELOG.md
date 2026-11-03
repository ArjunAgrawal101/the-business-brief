# Changelog

## 2.1.0: 3 November 2026

The Business Brief becomes an ecosystem: a cinematic opening on every fresh visit, a navigation in five parts, rooms with identities of their own, full notes for every subtopic, and working laboratories, simulations, cases and assessment tools across the course.

### Opening and shell

- A five-second cinematic opening on every fresh entry to the site, in any browser: a business world assembles (a perspective floor and columns, an organization chart, a market, a decision tree and a globe), the AA monogram and the name settle, and the monogram flies into the header. Nothing is stored to decide whether it plays, so it plays on every new visit and every reload, and never when moving between the site's own pages. The Skip intro button, a progress bar, and any key, click, tap or scroll end it; under reduced motion it is a still title card of about 1.6 seconds; browsers under automation skip it unless the address asks for it with `?intro`.
- A navigation in five groups, Explore, Practise, Tools, Assess and Discover, with a panel for each on wide screens and a drawer on phones and tablets. The footer, search, the home page's floor plan and the dashboard are built from the same list, so a page linked in one is linked in all.
- Room identities: the Finance Desk, Strategy Studio, Market Studio, People and Culture, Operations Floor, Entrepreneurship Lab, Boardroom, the Case Room and Case Vault, and the Assessment Centre each have an accent, a ground and a motif of their own, all checked for contrast.

### Home page

- Rebuilt in sections: a hero with five ways in; the ecosystem drawn as a floor plan; a featured briefing (case of the week, a decision challenge, a financial challenge, an insight and a framework, rotating weekly); the method; the course with its coverage; a live break-even preview; exploring by objective and by pathway; the Assessment Centre; the latest additions; the creator; and a closing invitation.

### Learning

- Full notes for every subtopic that had none, so all 37 are complete: 34 with full notes and 3 with complete briefs. Where they apply, the notes now open with a business situation (fictional, or real with a source), and add applications across industries, stakeholder perspectives, a decision with options and guidance, original exam-style questions labelled as practice with strong-response guidance, and a summary. The home page, the topic library and the coverage tracker report the same counts from one function.
- The glossary grows from 558 to 701 terms: 566 from the IB course and 135 beyond it for undergraduate and MBA study, with simple and technical explanations, misconceptions, and filters by unit, level, category and qualification. 172 are HL only and marked.
- A frameworks library of 35 frameworks, models and tools, each with a diagram, a method to follow, a fictional example, strengths and limits, and an exercise: 9 named in the syllabus, 15 IB toolkit tools and 11 enrichment.
- Guides for 14 of the 15 toolkit tools; Hofstede's cultural dimensions is still to come.
- 9 enrichment mindmaps beyond the course (strategy formulation, corporate finance, marketing strategy, organizational behaviour, operations strategy, leading change, corporate governance, entrepreneurship and sustainability strategy), beside the 42 course maps.
- 90 original diagrams, 11 of them new for the frameworks.
- Seven distinct learning pathways (IB DP, secondary, undergraduate, MBA, teachers, entrepreneurs and independent learners), each with its own audience, depth, terminology and omissions. Qualifications are never combined: only the IB route is mapped to a syllabus.

### Rooms and laboratories

- The Financial Laboratory: 20 calculators for the course's finance and break-even content, each with the formula, the substitution and working, an interpretation, the business implication, a chart, a sensitivity check and downloads. Enrichment is labelled and kept apart.
- Strategy Studio: 10 tools (SWOT, STEEPLE, five forces, Ansoff, the BCG matrix, generic strategies, a stakeholder map, a decision tree, force field analysis and option appraisal), each stating its limitations, keeping work in the browser, exporting JSON and CSV, and feeding a strategy memo.
- Market Studio: 9 instruments (market metrics, a research questionnaire builder, a customer persona, an STP planner, a positioning map, a marketing mix builder, a product life cycle simulator, a campaign planner and a budget allocator).
- People and Culture: 5 tools (motivation analysis, leadership scenarios, an organization chart builder with delayering, workforce planning with labour turnover at HL, and a change planner).
- Operations Floor: 5 tools (production methods, a weighted location assessment, capacity and productivity, a stock control simulator and an economic order quantity calculator as enrichment).
- The Entrepreneurship Lab: 6 briefings (opportunity and validation, business models, pricing and unit economics, start-up finance, financial projections, and scaling, failure and exit) and 6 tools (a business model canvas, a feasibility assessment, start-up costs, a revenue planner, unit economics, and a business plan that gathers the others' results).
- The Boardroom: three multi-round, cross-functional simulations (Kestle Cycles, Kilbrack Bakery and Hotel Mareluce), with a board pack each round, accounts that reconcile period to period, directors whose goals conflict, a memo and a debrief.
- The Case Vault: 9 fictional cases across manufacturing, retail, logistics, technology, hospitality, social enterprise, automobiles, healthcare and consumer goods, with filters, a Case of the Week, decision exercises and exhibits recomputed by the tests. Real organizations appear only in the Business Intelligence briefing, with dated sources.

### Assessment Centre

- A question bank of 269 original practice questions, searchable and filtered by unit, subtopic, paper style, level, assessment objective, marks, command term, question type and the learner's own progress, each with the platform's own strong-response guidance (never presented as an IB markscheme), self-rating, timed sets, progress by unit and command term, and export.
- Paper 2 calculation practice: questions generated for 23 kinds of calculation, checked within a stated tolerance, with the working, the typical slips and timed sets at Paper 2's pace.
- The Paper 1 workspace: tag the case's evidence and build an answer plan from it.
- Five internal assessment tools: a supporting documents checker against the guide's rules, a key concept lens, a tool selector, a research timeline with calendar export, and a progress tracker.
- The HL Paper 3 page becomes the Strategic Planning Centre. No question labelled as Paper 1 style assesses HL extension material, and the integrity check now enforces it.

### Discover

- Business Intelligence: 8 real developments from 2025 and 2026, every fact dated and traced to the document that states it, with the analysis labelled as analysis. Nothing is presented as live news.
- A learner dashboard: pages visited by kind, exercises checked, saved items and course progress by unit, kept in this browser only, with pause, export, import and clear. Nothing is sent anywhere.
- Search across 1,743 entries, now including the frameworks, the new rooms and tools, and the question bank.

### Connections

- Each finance subtopic's page lists its own Financial Laboratory calculators, and each calculator opens a Paper 2 practice question on the same calculation (19 of the 20; budget variances has no practice kind yet).

### Quality

- Persona walkthroughs (`npm run qa:personas`): a first-time visitor, an IB student, a teacher, an undergraduate, an MBA student and an entrepreneur each follow a route through the site by clicking visible links, on the device they would use.
- Page transitions now run reliably. Chromium skipped the cross-document transition on most navigations and reported an error, because it decided whether the new page took part before the stylesheet holding the opt-in had arrived; the opt-in is now inline at the top of every page.
- Every page fits a 320 pixel screen without scrolling sideways (WCAG reflow): long tags wrap, long words break, and text kept for screen readers inside a wide table scrolls with the table instead of widening the page. A new browser test checks every page at that width.
- A browser test that uses each of the newest tools as a learner would: the People and Culture and Operations Floor tools, the internal assessment tools, the Paper 1 workspace, Paper 2 practice and the question bank must each answer a change and keep the work after a reload.
- Fixes found in QA: a type clash between the Market Studio's instruments and the room tools, an HL question labelled as Paper 1 style, a broken anchor, a YAML quote that stopped 19 test files loading, two room lists split by unquoted commas, and wording that read oddly once every subtopic was complete.
- Unit tests grow from 245 to 899, in 51 files. The full figures are in docs/TESTING.md.

## 2.0.0: 2 November 2026

The Business Brief 2.0: a premium redesign under the Arjun Agrawal identity, a page for every subtopic of the course, and new libraries for learning and assessment.

### Brand and home

- The AA monogram, from the creator's vector master and unchanged in shape and colour, is now the platform's mark: in the header lockup with "Arjun Agrawal | The Business Brief" in Cinzel, the footer, the favicon, app icons, social card, resource covers, mindmap and diagram downloads, and the print templates. The earlier mark is retired.
- Navy, ivory and gold, Source Serif 4 headlines with a gold italic accent, and Inter for reading and the interface.
- A five-second opening on the first visit to the home page: the monogram draws itself and the curtain lifts. Once per browser, skippable at any moment, never under reduced motion, and replayable from the footer.
- A new home page: "Understand business. Think strategically. Make better decisions." with the creator's portrait framed by exact business diagrams, the course unit by unit with its coverage, mindmaps, diagrams and the glossary, the tools, the cases, the Assessment Centre, the Resources Library and the rooms.
- A full About page with the creator's own photographs and verified facts. The photograph labelled as AI-generated is not used.

### Learning

- A page for every one of the 37 subtopics: what the course asks (the guide's statements with their AO levels and HL marking), notes where they exist, the mindmap, diagrams, key terms, tools, practice, recall and connections.
- Full notes, written one subtopic at a time and only when complete, for 14 subtopics: 1.1, 1.2, 1.3, 1.4, 2.2, 2.4, 3.4, 3.5, 3.7, 3.8, 4.2, 4.5, 5.5 and 5.6. Each has objectives, sections with points, fictional worked examples with checked figures, formulas in the guide's form where it gives one, diagrams, evaluation, connections and retrieval questions.
- 42 interactive mindmaps, one for every subtopic and each unit: fold, zoom, pan, a revision view of the essentials, print, and SVG or PNG downloads, with an outline of every map for screen readers.
- The glossary grows from 44 to 558 terms, each with its own page: the syllabus meaning, the everyday meaning where it differs, formulas, examples, related terms and subtopics; search and filters by letter, unit, subtopic, level and category; a CSV download.
- 79 original diagrams for the five units and the toolkit, drawn from data with computed, tested figures, each with a text description and an SVG download.
- A coverage tracker that reports every subtopic as complete, partly built or planned, and verified against the guide, computed from the content.

### Assessment and resources

- The Assessment Centre replaces the Exam Desk: the internal assessment (research question builder, supporting document analyser, criterion self-review, submission checklist), Paper 1 (an annotated answer builder), Paper 2 (calculations and constructions) and the HL Paper 3 Boardroom (a plan across marketing, operations, human resources and finance, reviewed against criteria A to D). Each page separates what the IB requires, what examiners emphasise, recommended strategy and illustrative examples. Nothing approves an IA or predicts a grade. The old addresses redirect.
- The creator's four assessment guides as PDF downloads.
- The Resources Library: 112 resources with covers, filters, search and sort, details pages, and a download only where the file exists.
- Search now covers mindmaps, diagrams, resources and the Assessment Centre, and sends every subtopic to its own page.

### Quality

- Accessibility fixes found by the browser tests: interactive mindmaps are labelled groups, a gold button on navy keeps navy text, large gold numerals and state outlines meet 3:1, controls that need scripts are hidden without them, wide tables and selects no longer widen the page on phones.
- New tests: every diagram calculation against hand-worked values and every diagram's rendering; the opening; the 2.0 navigation. The page checks sample the glossary's term pages, which share one template.
- Documentation for 2.0: the audit with the Economics comparison, the resource inventory, the design system, architecture, content model, testing and this release.

### Deployment

- Node.js pinned to the 22 line in `package.json`, so that Vercel builds on the version CI tests.
- The deployment guide gives the Vercel steps in full, with the checks to run after deploying.

## 0.2.0: 29 October 2026

The enhancement release: the IB mapping checked against the Business management guide, a motion system and room identities, and working rooms across the platform.

### Checked against the guide

- The guide (first assessment 2024), the teacher support material and two coursebook extracts were supplied and inventoried (docs/audit/RESOURCE_INVENTORY.md).
- All 37 subtopics and 143 content statements, with depth of teaching, HL status, pages and teaching hours, now Verified. Corrected: the titles of 1.1 and 3.6, labour turnover as HL, the command terms (List added, Interpret removed, Identify at AO1), and HL questions restyled away from paper 1.
- Command terms explained in the platform's own words with the page of each official definition; the definitions quoted from the IB Economics guide are withdrawn.
- Exam Desk and IA Studio: every component's duration, marks, weighting, sections and criteria by name and maximum mark, with page references; advice from the teacher support material, paraphrased and attributed. The guide's text, markbands and descriptors are not reproduced.
- The integrity check now enforces the guide's rules: no HL question in the style of paper 1, paper 3 is HL only, command terms at their AO levels, paper 3 criteria A to D.

### Design and motion

- An original icon set for the fourteen rooms and the interface.
- A motion system: native page transitions with the header held still, arrivals for feedback and outcomes, scroll reveals only below the fold, a lift for objects you can pick up, charts that ease between states; all off under reduced motion.
- An All rooms panel in the header at every width, an All rooms page, and a shared room page with each room's number, icon, contents, syllabus and plans.
- A new home page: a staged hero, the three chains of reasoning (decide, analyse, diagnose), a workbench of the labs and desks, and the rooms as an icon grid.

### New rooms and experiences

- Case Room: a staged case lab on Halden Distribution following problem, cause, strategy, implementation and evaluation, with a plan scheduled by critical path analysis against the client's deadline and a memo of the learner's reasoning.
- Finance Desk: ratio analysis (3.5; 3.6 at HL) on two years of accounts in the guide's layout; a cash flow lab (3.7) in the guide's forecast layout with five ways to pay for a kiln, four working capital measures and a reconciliation of profit to cash; investment appraisal (3.8) with payback, ARR and, at HL, NPV using the guide's printed discount factors.
- Market Studio: market share and growth (4.1), position maps (4.2).
- Operations Floor: weighted location scoring (5.4), and at HL capacity utilization and productivity and the stock control chart (5.6).
- Strategy Studio and People and Culture pages gathering their material.
- IA Studio: a ten-step planner that follows the teacher support material and checks supporting documents (number, age at submission, transcripts, length, publishers), the word count and self-marks.
- Paper 3 practice as three questions in the guide's structure (2, 6 and 17 marks), the last self-marked on criteria A to D.
- A course map of all 37 subtopics, the coverage table with interactions, and a progress page that reads only what this browser has kept.

### Fixes

- The Halden case timeline made consistent (the system went live in December 2025, the staff survey dated July 2026); Halden's financial year ends on 30 June.
- No page shows a button that cannot work without JavaScript.
- Tool and room links, search entries for rooms and interactions, and storage keys listed on the privacy page.

### Quality

- 146 unit tests, including every figure in the cash flow forecast, the ratios, the investment appraisal, the plan and the studio tools.
- 206 browser tests, including axe-core scans of all 66 pages at desktop and phone sizes, motion rules, and a check that no page shows a dead button without JavaScript.

## 0.1.0: 29 October 2026

The first release of Arjun Agrawal | The Business Brief.

### Platform

- Astro static site with structured YAML content, Zod schemas and an integrity gate that fails the build on any broken reference.
- Visual identity: The Business Brief mark (a brief with a decision node), lockups and wordmark as outlined SVG; favicons, app icons, a social card and resource templates; the creator's authentic monogram used as a signature.
- Design system: tokens for colour, type, space and shape; four self-hosted typefaces under the SIL Open Font Licence.
- An SL and HL switch, remembered on the device, that never hides material without a notice.
- Search, glossary, source and claims registers, a coverage matrix, a sitemap and a privacy page with a button to clear stored work.

### Learning

- Three complete topic briefs: 1.5 Growth and evolution, 2.3 Leadership and management, 3.3 Costs and revenues.
- Three fictional case files with simulated data: Marigold Kitchens, Halden Distribution, Atelier Barro.
- Three Decision Rooms with board packs, consequences for stakeholders and debriefs.
- Eleven interactions: cost classifier, break-even workspace, error diagnosis, special order panel (HL), Ansoff placer, decision tree lab, scale explorer, two force field builders (HL), style matcher, functions sorter.
- Finance Desk: thirteen calculations in eight parts, each with a worked example from a case.
- Toolkit: fifteen tools listed, six complete guides.
- Exam Desk: Papers 1, 2 and 3 and the internal assessment with sourced facts; twenty-two original practice questions with mark schemes and self-checks; thirty-one command terms; an IA planner.
- Revision briefs for each complete topic, with retrieval cards.
- Seven audience pathways, including lesson sequences for teachers.

### Quality

- 47 unit tests, including recomputation of every case figure from its exhibits.
- 147 browser tests, including axe-core scans of every page at desktop and phone sizes.
- Content lint, link check and contrast check.

### Known issues

- The IB Business management guide was not available; the mapping is corroborated from secondary sources and marked to verify.
- Astro 6.4.8 has published advisories; the upgrade to 7.4 is documented in SECURITY.md.
- Not yet deployed.
