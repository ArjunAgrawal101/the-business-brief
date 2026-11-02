# Changelog

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
- Full notes, written one subtopic at a time and only when complete, for 11 subtopics: 1.4, 2.2, 2.4, 3.4, 3.5, 3.7, 3.8, 4.2, 4.5, 5.5 and 5.6. Each has objectives, sections with points, fictional worked examples with checked figures, formulas in the guide's form where it gives one, diagrams, evaluation, connections and retrieval questions.
- 42 interactive mindmaps, one for every subtopic and each unit: fold, zoom, pan, a revision view of the essentials, print, and SVG or PNG downloads, with an outline of every map for screen readers.
- The glossary grows from 44 to 558 terms, each with its own page: the syllabus meaning, the everyday meaning where it differs, formulas, examples, related terms and subtopics; search and filters by letter, unit, subtopic, level and category; a CSV download.
- 79 original diagrams for the five units and the toolkit, drawn from data with computed, tested figures, each with a text description and an SVG download.
- A coverage tracker that reports every subtopic as complete, partly built or planned, and verified against the guide, computed from the content.

### Assessment and resources

- The Assessment Centre replaces the Exam Desk: the internal assessment (research question builder, supporting document analyser, criterion self-review, submission checklist), Paper 1 (an annotated answer builder), Paper 2 (calculations and constructions) and the HL Paper 3 Boardroom (a plan across marketing, operations, human resources and finance, reviewed against criteria A to D). Each page separates what the IB requires, what examiners emphasise, recommended strategy and illustrative examples. Nothing approves an IA or predicts a grade. The old addresses redirect.
- The creator's four assessment guides as PDF downloads.
- The Resources Library: more than 100 resources with covers, filters, search and sort, details pages, and a download only where the file exists.
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
