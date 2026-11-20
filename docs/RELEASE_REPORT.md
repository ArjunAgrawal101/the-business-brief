# Release report: 3.0.0

20 November 2026

## Summary

Release 3.0.0 is built to the owner's brief "The Business Brief 2.0", which asked for the platform to be made significantly better, not merely bigger, without discarding what worked. Three read-only audits came first: content and features, design and navigation, and assessment accuracy with technical health. Their findings decided the work, which ten engineers then carried out in parallel, each on a branch of its own, before a single integration. Every page that worked in 2.2 keeps its address. The changes, part by part, are in [CHANGELOG.md](../CHANGELOG.md); the 2.2.0 report is in [releases/2026-11-16-2.2.0.md](releases/2026-11-16-2.2.0.md).

The source is on `main` at https://github.com/ArjunAgrawal101/the-business-brief, and Vercel deploys from that branch to https://the-business-brief-dun.vercel.app/.

## What the audits found, and what was done about it

| Finding | What changed |
| --- | --- |
| The interactive blue was an electric cobalt; gold was everywhere; buttons were pills with shadows; labels fell to 10.5 px; the header was translucent | A muted steel blue that passes AA; gold kept for rules and one emphasis; square buttons; labels and chips at 12 px or more; flat navy bands; an opaque header |
| Seven menus, with the Academic Ecosystem in the bar and the topic library called "The Business Brief" | Five groups (Explore, Practise, Tools, Assess, Discover); the ecosystem in the Discover panel; "Topic library" |
| Search had no type-ahead, ranked only within each kind ("Liquidity" came eighth) and found nothing for a slip | Suggestions as you type in the header, every kind ranked together, slips forgiven, recently viewed pages; best matches first on the search page |
| The opening played for five seconds on every reload and on every page reached from a search result | It plays only when the home page is freshly opened, in about 2.75 seconds |
| The home page was 17 screens long, three times repeated the full menu, and its counters understated questions (24 against 269) and overstated IB terms (701, including 135 beyond the course) | The brief's sections in varied compositions, 11,600 px at 1440 wide; every count computed from the content (now 315 questions, 576 IB terms) |
| Revision briefs existed for 3 of 37 subtopics; no spaced repetition, planner, weak areas or revision queue | Quick revision sheets for all 37, 1,416 flashcards with spaced repetition (1,394 on the course, 22 on frameworks beyond it), the revision planner, and a dashboard with a queue and weak areas |
| Subtopic pages barely linked to the rest of the platform; 16 had no tools section | Connected learning, a tools section and the subtopic's worked connections on every subtopic page; back links on every tool |
| Assessment pages mixed the guide's rules with the site's advice in 13 places; "examiner emphasis" was unattributed | Every fact checked against the guide; labels corrected; every examiner-emphasis point attributed to the creator's guide and page |
| Business Intelligence held 11 items, all from software, cloud and AI firms | 25 items across twelve sectors and five regions |
| The sitemap listed 190 of about 1,080 pages | It is written from the built pages after every build (1,312 pages at this release) |

## Photographs

Four photographs are used, each with a purpose, in AVIF with a WebP fallback and separate crops for wide screens and phones. Nothing is retouched; the one correction is a brightness and contrast lift on the conference-table photograph, whose window washes the room out.

| Photograph | Where |
| --- | --- |
| The awards portrait (light grey blazer, black shirt, trophy cabinet) | The About page hero (the brief's image 1); a small square on the home page's creator section |
| Teaching a class in front of a screen (grey suit and tie) | About, teaching and academic work (image 2); the Tutorials page |
| At a conference table (black blazer), with a colleague alongside | About, the professional journey (image 3) |
| Traditional attire | About, the personal note |

Not used, and why (also in `assets/creator/README.md`):

- **Three supplied photographs carry Google Gemini's AI mark** in the lower right corner: the navy-suit portrait against a stone wall (the brief's optional image 6), the group photograph with students (image 5) and the panel photograph with name cards (offered for image 4). The brief rules out AI-generated portraits, and cropping the mark away would hide it. The navy-suit portrait, which was the home and About hero until this release, is retired. If camera originals exist, they can be added in minutes: the About page has places for academic dialogue and for the group photograph in the journey.
- **The teal-blazer photograph** (image 4 in the brief) was not among the supplied files.
- **An outdoor full-length photograph** under an orange canopy is authentic but competes with the page and adds nothing the four do not.

The home page does not lead with a portrait: the brief asks that it remain about Business Management, so the creator has one small section of it.

## New features

| Feature | Address |
| --- | --- |
| Quick revision: a printable sheet for every subtopic | `/revision/` and `/revision/<slug>/` |
| Flashcards with spaced repetition: 1,394 cards on the course, and 22 on frameworks beyond it shown only on request | `/revision/flashcards/` |
| Revision planner | `/revision/planner/` |
| My dashboard: today's queue, progress, weak areas, practice by source | `/dashboard/`, with the full record at `/progress/` |
| Study mode on every subtopic page: text size, low light, reading progress, contents, Mark as complete, print | every `/topics/<slug>/` |
| Business Scenario Generator: 25 families of fictional cases in six steps | `/decision-room/scenarios/` |
| Stakeholder Impact Simulator: eight decisions, seven groups | `/decision-room/stakeholder-impact/` |
| Framework comparison: any two side by side, 16 curated | `/frameworks/compare/` |
| Topic connections: 50 worked connections on a map | `/ib/connections/` |
| Teacher resource area: sequences, prompts, six activities, checklists | `/teachers/` |
| A page for every diagram, and 17 new teaching diagrams (107 in all) | `/diagrams/<id>/` |
| IA Studio: four new tools (research question, methodology, evidence, word count) | `/assessment/internal-assessment/` |
| Paper 1 practice cases (two), Paper 3 practice stimuli (two) and a coherence-checking plan builder | `/assessment/paper-1/workspace/`, `/assessment/paper-3/practice/` |

The multi-round business strategy simulation the brief asks for already existed (the executive simulation, run over three years with prices, marketing, people, capacity, exports and finance) and is now named as such in the menu.

## Testing

| Check | Result |
| --- | --- |
| Type check (`astro check`) | 0 errors, 0 warnings, 0 hints |
| ESLint | No problems |
| Unit tests (Vitest) | 1,784 tests in 87 files, all pass |
| Build | 1,329 pages |
| Content lint (no dashes, leaks or placeholders, source and built pages) | No problems |
| Link check | No broken links |
| Colour contrast (`qa:contrast`) | Every pair meets its minimum |
| Browser tests (Playwright, Chromium), every page at desktop and phone size with an axe-core WCAG 2.2 AA scan, plus every interaction spec | 1,694 tests in 21.6 minutes: 1,688 passed and 3 were skipped by design (desktop-only or phone-only). Three failed because the test counted the header's hidden Search button as a visible one; the test was corrected and they pass. The specs covering the later fixes (61 tests) were run again on the final build, and all pass |
| Tablets: every page (1,314, redirects aside) at 768 by 1,024 and 1,024 by 768 pixels | 2,628 page loads: none scrolls sideways, logs a console error, fails a request or shows a broken image |

Each engineer also ran their own specs and page checks on a private build. A shared content cache was found to let one branch's build read another's content during the parallel work; the cache now lives in each checkout's own `.astro` folder, and every result above comes from the integrated branch.

## Remaining limitations

Stated plainly, as the brief asks:

- **Topic depth.** The ten thinnest subtopics were deepened to the brief's eleven elements. The other 27 are unchanged; they were already between about 7,700 and 14,400 words. No real-company examples were added to the notes, because the build environment could not open the sources; each subtopic page links its real, sourced Business Intelligence items instead.
- **Business Intelligence sources.** Every fact was read in a company's or regulator's own documents. Major news organizations could not be reached from the build environment, so seven items rest on one organization's documents, and each says so. Six subtopics have no item yet (2.4, 2.7, 3.9, 5.1, 5.2 and 5.5), India is represented by one item centred there, and no small-business story had sources that could be read.
- **Diagrams on phones.** All 17 new diagrams and every framework diagram have phone layouts; 54 older library diagrams do not, so at 320 px some of their labels fall below 12 px ("Show larger" opens them at full size). None scrolls sideways.
- **Revision sheets** run from 2.4 to 6.6 screens rather than about two, because each includes every IB term of its subtopic.
- **Lesson presentations** do not exist; the library says "Not yet available" and counts none.
- **Paper 3 practice** has no clock and no answer boxes for questions 1 and 2, and the plan builder's checks are prompts, not marks.
- **Practice not yet in the question bank:** the Paper 1 case questions and the 50 connection questions.
- **Browsers.** Tests run in Chromium only, and no testing with assistive-technology users has been done.
- **Astro 6.4.8** carries advisories that concern server rendering, view transitions and untrusted content, none of which this static site uses. Moving to Astro 7 needs a newer Node than the build environment had; it is the first item for the next release.

## For the owner to confirm

1. **Photographs.** Whether camera originals exist for the three AI-marked photographs; and that you are content to publish the conference-table photograph, where a colleague appears (not named).
2. **Your four assessment guides** cite the IB guide as "updated July 2024"; the edition supplied and checked against says "updated May 2022". The Paper 1 guide's front panel says "Case study: Pre-released"; the guide releases a statement and about the first 200 words, not the case. The PDFs are published unchanged, so this is yours to correct.
3. **Examiner emphasis** is shown as your guides report it, attributed; it was not checked against subject reports, which were not supplied. One point (the Paper 3 question 1 mark split) comes from "examiner instructions (2026)", which may be markscheme content; you may want to check you are free to publish it.
4. **GitHub Pages** is still switched on for the repository, so every push starts a Pages build that fails, as it has since October; Vercel hosts the site, and the build can be switched off in Settings, Pages (docs/DEPLOYMENT.md).

## Delivery

The work was integrated on `claude/business-brief-2`. Most of it reached `main` through pull request #1, merged on 20 November at `ccc2f83`; the rest, from the diagram pages to this report, followed as a fast-forward of the same branch. Vercel builds and serves `main`.
