# Release report: 2.2.0

16 November 2026

## Summary

The Business Brief 2.2 takes the platform beyond the IB course without redesigning it. It adds one-to-one tutoring with its creator, a library of thirty Advanced Management modules for undergraduates, MBA students and professionals, an executive simulation in the Boardroom, the Boardroom Briefings, a Framework Application Lab, advanced financial analysis, and My Business Workspace. Business Intelligence is rebuilt as an editorial hub. Every existing page keeps its address, its design and its behaviour. The audit behind the release, with the list of what had to stay unchanged, is in [audit/NEXT_LEVEL_AUDIT.md](audit/NEXT_LEVEL_AUDIT.md); the full list of changes is in [CHANGELOG.md](../CHANGELOG.md).

The source is on `main` at https://github.com/ArjunAgrawal101/the-business-brief, and Vercel deploys from that branch to https://the-business-brief-dun.vercel.app/. For the first time, this environment could open the live site, so the deployment was checked from here (see Delivery).

## Preserved

Nothing that worked in 2.1 was removed, renamed or restyled: the identity (navy, ivory and champagne gold; Source Serif 4, Inter and Cinzel; the AA monogram), the cinematic opening and its rule, the page conventions, the topic library and its notes, the glossary, the frameworks library, the mindmaps and diagrams, the Case Vault, the three Boardroom scenarios, the Decision Rooms and the Case Room, the twenty Financial Laboratory calculators, the studios, the Assessment Centre, the Resources Library, the seven pathways, search, privacy (no accounts, analytics or cookies), the integrity gate, provenance labels and the SL and HL distinction. Enhancements sit beside what existed: the advanced finance tools beside the calculators, the executive simulation beside the scenarios, the workspace at the dashboard's own addresses. The full browser suite that guarded 2.1 still passes.

## Implemented, by part of the brief

| Part | What was built |
| --- | --- |
| Tutorials | `/tutorials/`: the hero ("IB DP Business Management Tutoring", the owner's subheading and the price), what the tutorials cover (syllabus, Papers 1, 2 and 3 at HL, IA guidance, revision and exam strategy), how a session works (eight steps and what an hour looks like), who they are for, five pathways with their fees, which pathway fits, verified facts about Arjun Agrawal, how to get started with an enquiry builder, and ten questions. Linked from the header (a gold Tutorials button), the drawer, the footer, the home page ("Take your Business Management learning further"), About, the IB DP pathway and the Assessment Centre, and by one quiet note on subtopic pages, briefs, revision briefs, case files and calculation practice |
| Advanced Management and Strategy | `/advanced/`: six domains and thirty modules (strategy 6, finance 6, leadership and organizational behaviour 5, marketing 5, operations and supply chain 4, entrepreneurship and innovation 4), each in eight parts: foundation, advanced explanation, models (121 in all), real applications (75), cases (30, fictional and labelled), critical evaluation, a decision exercise and further reading. Kept apart from the IB course, with its own room identity |
| Boardroom Briefings | `/boardroom-briefings/`: ten board decisions as editorial cases, each answering its question in a Student edition and an Analysis edition, with recomputed exhibits and weighted option appraisals; linked both ways to the Advanced Management modules |
| A more sophisticated Boardroom | `/boardroom/executive/`: seven roles, nine stages, three yearly rounds, interconnected functions on one deterministic engine with simulated data, and a debrief against four strategies and a baseline |
| Business Intelligence | The six questions on every item, twelve themes with pages of their own, an issue layout, and stricter dating rules; eleven items, every fact dated and sourced, none presented as live |
| My Business Workspace | `/dashboard/`: a learning list in the reader's order with status and notes, case notes under six headings, saved analyses from every studio and saved Financial Laboratory results, completed practice, and selective export to Markdown or JSON; all in this browser only, every key declared on the privacy page |
| Framework Application Lab | Every framework's structure, fit, interpretation, implications, mistakes and works; an Apply it mode on each; `/frameworks/lab/` by decision; three new Strategy Studio tools (scenarios, stakeholder salience, strategic fit); the five forces, Ansoff, BCG and decision tree tools already gave attractiveness, risk, portfolio and expected value readings and were left as they were |
| Finance Desk advanced mode | `/finance-desk/advanced/`: a three-statement forecast, a capital budgeting comparator with IRR, WACC and sensitivity, break-even scenarios and a performance dashboard, every figure tagged IB, IB HL or beyond the course, 57 unit tests against hand-worked values; the twenty calculators unchanged |
| Navigation | Learn, Practise, Tools, Assess, Advance and Connect, in the existing mega menu and drawer, with the Tutorials button |

## The Tutorials, and the terms used

The brief named the live Economics Tutorials page as the definitive reference for the commercial offering. Read in a browser on 16 November 2026, it offers, all one-to-one and online:

| Pathway | Fee | Sessions |
| --- | --- | --- |
| Regular sessions | US$20 per session | 1 session of 1 hour, any topic |
| IA support | US$100 for the package | 6 sessions of 1 hour |
| EE supervisor support | US$150 for the support | Agreed at enquiry |
| Marathon Revision | US$300 for the package | 20 sessions of 1 hour |
| Exam Practice | US$200 for the package | 12 sessions of 1 hour |

The Business Management page states exactly these terms, plus the owner's statement that group discounts are available, with no group price. Enquiries go by email to arjun1agr@gmail.com with the subject "IB DP Business Management Tutorials Enquiry", the template asking for the year, SL or HL, school, topics and preferred arrangement; WhatsApp, LinkedIn and Instagram are listed as on the Economics page. There is no booking calendar, payment, deposit, automatic confirmation or extra charge, no testimonial, result or guarantee, and the IA is offered as guidance only. Every term lives in `src/lib/tutorials.ts` and is tested.

**For confirmation:** the brief gave the latest information as US$20 for a 90-minute session. The live Economics page says one hour (its earlier version said 90 minutes; the final release changed it). Following the brief's rule, this page says one hour. If 90 minutes is right, one line in `src/lib/tutorials.ts` changes it here, and the Economics page needs the same correction.

## Tests

On the final 2.2 source and build (details in [TESTING.md](TESTING.md)):

| Check | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints |
| ESLint and the content lint | No problems (1,000 source files, 1,088 built pages) |
| Unit tests | 1,175 passed in 61 files |
| Build | 1,084 pages; every integrity check passes (the content, the Advanced Management modules, the Boardroom Briefings, the executive simulation's accounts and the Business Intelligence dating rules) |
| Link check | 213,346 internal links and assets, none broken; 157 external links listed, not fetched |
| Contrast | 56 colour pairs, all pass, including the two new rooms' text colours |
| Persona walkthroughs | 8 routes passed: first-time visitor, IB student (phone), teacher, undergraduate (tablet), MBA student, entrepreneur (phone), MBA student reading advanced strategy, IB student finding a tutor (phone) |
| Browser tests | 1,092 tests on the release code (`d7b472c`): 1,089 passed and 3 skipped by design (two wide-screen navigation tests on the phone, one drawer test on the desktop), in 14.2 minutes, with no failures and no retries. The run before it, on the release candidate `c233161`, found one failure: the announcement race described below, fixed in `d7b472c` |
| GitHub CI | The QA workflow (check, lint, unit tests, build, links, the full browser suite and contrast) passed on `720e6c7`, the first push of this release, and runs again on every push |

Found and fixed during QA:

- An `aria-label` on the tutorials price block, which axe reports as a prohibited attribute; the full sentence is now visually hidden text.
- The tutorials enquiry builder's no-JavaScript paragraph showed with JavaScript on, because the builder was not inside an enhanced region.
- The same documents and works were registered two or three times by the different writers of the modules, the finance tools, the Framework Lab and the Briefings (36 duplicates merged at integration, after the writers had merged others themselves); each is now one entry. Documents opened and read are labelled as such, not as found by search.
- Spelling in the new modules drifted from the site's Oxford spelling; normalized, with cited titles left as published.
- The Finance Desk's new tools and the Advanced Management finance domain shared a name; the tools are now Advanced financial analysis, and the two link to each other.
- A module's details line ran into the room's drawing on wide screens, and its date was written as digits.
- A stale announcement: two messages to the same live region within 60 ms (a wrong answer, then Show the answer at once) let the older one be read out after the newer. A pending announcement is now cancelled by a newer one, everywhere. The final browser run caught it as one failed Paper 2 practice test; the suite was run again in full after the fix.

## In development

| Item | Status |
| --- | --- |
| Real organizations in the Boardroom Briefings | All ten use fictional companies, because the publishers' sites could not be read while they were written |
| Business Intelligence | Eleven items; the twelve themes need several each, across industries and regions, read from the organizations' own documents |
| Advanced Management | The further reading is cited as bibliographic references, not opened; several organizations (bp, Northvolt, Novo Nordisk, Unilever, Nippon Steel) recur across domains because few publishers' sites could be read; the case exhibits were checked by script but have no recomputation test like the Case Vault's |
| Framework pages | Scenario planning and stakeholder salience are reached through their tools, not yet framework pages of their own; Hofstede and RACI have no tool |

The full order is in [ROADMAP.md](ROADMAP.md).

## Known limitations

- **Browsers and people.** Only Chromium was tested, with emulated phones; no real devices, other browsers or users of assistive technology ([TESTING.md](TESTING.md#what-is-not-tested)).
- **Sources.** External links are listed but not fetched by the link check. Company facts are dated and will age; nothing is presented as live.
- **Page weight.** The question bank lists all 269 questions so it works without JavaScript (1.3 MB, 197 KB compressed); the workspace page lists every page a reader can add (about 200 KB).
- **Astro 6.4.8** has published advisories with low exposure for a static site; the fix needs Node 24 (SECURITY.md).
- **GitHub Pages.** The repository still runs GitHub's Pages build on every push, which fails because the site is built for Vercel. It does not affect the site.
- **The environment.** A network environment, "Arjun Agrawal platforms", was created with the owner's approval so the live sites could be opened; during the release it was widened, with approval each time, to sixteen company and regulator sites used as sources. Its setup script (`npm ci` in the repository) has not yet run in a fresh session.

## Decisions for the creator

1. **The session length:** one hour, as the live Economics page says, or 90 minutes, as the brief said (above).
2. **The formal portrait** (`9.webp`) carries Google Gemini's sparkle mark. It is used only as a portrait, cropped above the mark. Confirm it, or supply an original photograph.
3. **The four assessment guides** are public downloads. Confirm that they may be.
4. **The About page** and its contact address. Confirm, or say what to change.
5. **Licensing.** Commercial use by teacher resource platforms needs a licence from the IB. The platform paraphrases and cites, and reproduces no IB text. The tutorials are a commercial service; the site never claims IB endorsement.
6. **GitHub Pages.** Turn it off in the repository's Settings, under Pages, since Vercel hosts the site.
7. **The network environment's company sites** can be removed from its allowlist when no longer needed.

## Delivery

- **Source:** `main`. This report is in the release commit, and `git log` lists every commit.
- **Pushed in two steps.** The first push (`720e6c7`) carried everything but the executive simulation and the Boardroom Briefings; GitHub's QA workflow passed on it, and Vercel reported the deployment complete. The live site, opened from this environment, then served the Tutorials page with its terms, Advanced Management (six domains, thirty modules), the Framework Application Lab, the advanced financial analysis tools, My Business Workspace and the Business Intelligence hub. The release commit adds the simulation, the Briefings and this report; its deployment is checked the same way after the push.
- **Network:** the environment allows `the-business-brief-dun.vercel.app` and `ib-economics-pi.vercel.app`, so each deployment can be opened from here.
- **Supplied files:** never committed. The photographs used are in `assets/creator/originals/`, with rights reserved, outside the code licence.
