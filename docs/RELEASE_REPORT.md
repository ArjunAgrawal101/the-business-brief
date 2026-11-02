# Release report: 2.0.0

2 November 2026

## Summary

The Business Brief 2.0 is a premium redesign under the Arjun Agrawal identity, with a page for every subtopic of the course and new libraries for learning and assessment: full notes for the first 14 subtopics, 42 mindmaps, a 558-term glossary, 79 original diagrams, the Assessment Centre and the Resources Library. The audit behind it, with the comparison with Arjun Agrawal Economics, is in [audit/V2_AUDIT.md](audit/V2_AUDIT.md); the materials supplied for it are in [audit/RESOURCE_INVENTORY.md](audit/RESOURCE_INVENTORY.md).

The source is on `main` at https://github.com/ArjunAgrawal101/the-business-brief. Vercel deploys from that branch; **the deployed site could not be checked from this environment**, whose network policy blocks `*.vercel.app` (see below).

## Completed

| Part of the brief | Outcome |
| --- | --- |
| Audit | The source, the Economics source (live sites blocked), the new materials; a feature-by-feature comparison with relevance, adaptation, location and status ([V2_AUDIT.md](audit/V2_AUDIT.md)) |
| Brand | The AA monogram from the creator's vector master, unchanged, as the mark everywhere: header lockup, footer, favicon, app icons, social card, covers, downloads, print templates. Navy, ivory and gold; Source Serif 4, Inter, Cinzel ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)) |
| Opening | About five seconds on the first visit to the home page; once per browser, skippable at any moment, never under reduced motion, page inert only while it plays, a timed backstop and a CSS failsafe; replayable from the footer; tested |
| Home page | The headline "Understand business. Think strategically. Make better decisions.", the creator's portrait framed by exact diagrams, the course unit by unit with its coverage, mindmaps, diagrams and the glossary, the tools, the cases, the Assessment Centre, the Resources Library, the rooms, the creator, the pathways and how far to trust the platform |
| About | A full profile with the creator's own photographs and verified facts |
| Topic library | All 37 subtopics with a page of their own; full notes for 14 (1.1, 1.2, 1.3, 1.4, 2.2, 2.4, 3.4, 3.5, 3.7, 3.8, 4.2, 4.5, 5.5 and 5.6) and complete briefs for 3 (1.5, 2.3, 3.3), so 17 are complete; the other 20 are partly built (page, mindmap, terms, diagrams), with notes to come |
| Mindmaps | 42 (every subtopic and unit), interactive, with a revision view, print and downloads, in the navigation |
| Glossary | 558 terms with their own pages, the syllabus and everyday meanings, filters and a CSV download |
| Diagrams | 79 diagrams for the five units and the toolkit, with computed and tested figures, text descriptions and SVG downloads |
| Assessment Centre | IA, Paper 1, Paper 2 and the HL Paper 3 Boardroom, each separating IB requirement, examiner emphasis, recommended strategy and illustrative example; the creator's four guides as downloads |
| Resources Library | 112 resources with covers, filters, search, sort and details pages; downloads only where the file exists |
| Coverage | Complete, partly built, planned and verified, computed from the content |

## Tests

On the final 2.0 source and build (details in [TESTING.md](TESTING.md)):

| Check | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints (252 files) |
| ESLint and the content lint | No problems (378 source files, 723 built pages) |
| Unit tests | 245 passed in 15 files, 89 of them for the diagram library |
| Build | 723 pages; the integrity checks pass |
| Link check | 85,057 internal links and assets, none broken |
| Contrast | 34 colour pairs, all pass |
| Diagram labels | 79 diagrams, no label outside its frame or overlapping another |
| Browser tests | 444 passed and 1 skipped by design (the current-section test on mobile, where the navigation is in the menu), in 8.4 minutes; no failures and no retries; axe-core found no violations in 366 page scans |
| GitHub CI | The QA workflow (check, lint, unit tests, build, links, the browser suite and contrast) passed on GitHub on `8e04b33`, the commit before the 1.1 to 1.3 notes, with the same browser result: 444 passed, 1 skipped |

## Not completed, and why

| Item | Status | What is needed |
| --- | --- | --- |
| **Deployment check** | The push to `main` triggers Vercel, but `the-business-brief-dun.vercel.app` cannot be reached from this environment | Open the site after Vercel's build finishes, or add the host to the environment's allowed domains so it can be checked from here |
| **Notes for the remaining subtopics** | 20 subtopics have their pages, mindmaps, terms and diagrams but no full notes yet (listed in the roadmap) | One subtopic at a time, each complete ([ROADMAP.md](ROADMAP.md)) |
| **Diagram reading guides, generated calculation practice, timed sessions, an exam timer** | Planned | ROADMAP.md |
| **Exam DNA** (the Economics site's analysis of released papers) | Not adopted | Released papers and markschemes, which were not supplied |
| **Video library and TOK section** | Not adopted | Videos to curate and a decision on scope |
| **Astro 7.4 upgrade** | Unchanged from 0.2.0: Astro 6.4.8 has published advisories with low exposure for a static site; the fix needs Node 24, which this environment cannot download | The upgrade in SECURITY.md on a machine with Node 24 |
| **Testing gaps** | Firefox, Safari, real devices, assistive technology users and the deployed site were not tested | [TESTING.md](TESTING.md#what-is-not-tested) |

## Decisions for the creator

1. **The formal portrait** (`9.webp`) carries Google Gemini's sparkle mark, so it was made or edited with AI. It is used only as a portrait, never as a record of an activity, and the crop stops above the mark. Confirm, or supply an original photograph (replace `assets/creator/originals/arjun-agrawal-formal-portrait.webp` and run `node scripts/brand/creator-photos.mjs`).
2. **The classroom photograph** (`7.webp`) is labelled "AI-generated content" and is not used, as you asked.
3. **The four assessment guides** from `ilovepdf_merged_2.pdf` are published as downloads, unchanged. Confirm that they may be public.
4. **The About page** is written in the first person from your verified records, and shows the contact address from your Economics profile (arjun1agr@gmail.com). Read it and confirm, or say what to change.
5. **Licensing.** As in 0.2.0: the guide's notice says commercial use by teacher resource platforms needs a licence from the IB; the platform paraphrases and cites and reproduces no IB text.

## Delivery

- **Source:** `main`; the commit that carries this report and those after it (`git log`).
- **Supplied files:** the PDFs are inventoried and never committed; the photographs used are in `assets/creator/originals/` (rights reserved, outside the code licence).
