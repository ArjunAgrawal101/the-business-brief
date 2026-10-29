# Release report: 0.2.0

29 October 2026

## Summary

The enhancement release. The creator supplied the IB Business management guide, the teacher support material and two extracts of a coursebook; the IB mapping is now checked against the guide, line by line, with page references. The platform gains a motion system and an identity for each of its fourteen rooms, a staged case lab, a cash flow lab in the IB layout, ratio analysis and investment appraisal desks, working tools in Market Studio and Operations Floor, an IA planner that checks supporting documents, paper 3 practice in the guide's structure, a course map and a progress page. All checks pass. The source is at https://github.com/ArjunAgrawal101/the-business-brief (public, as approved). It is **not yet deployed**.

The audit behind this release, and the inventory of the supplied documents with how far each was read, are in [audit/ENHANCEMENT_AUDIT.md](audit/ENHANCEMENT_AUDIT.md) and [audit/RESOURCE_INVENTORY.md](audit/RESOURCE_INVENTORY.md).

## Completed

| Priority | Work | Outcome |
| --- | --- | --- |
| P0 | Verify the IB mapping | 37 subtopics, 143 content statements, depth of teaching, HL status, hours, assessment outlines, IA requirements and criteria, formulae and command term levels, all Verified with pages. Corrections listed in [CURRICULUM_MAPPING.md](CURRICULUM_MAPPING.md#what-changed-when-the-guide-arrived) |
| P0 | Assessment and command terms | Exam Desk and IA Studio state the guide's structure with pages; the teacher support material's advice is paraphrased and attributed; command terms are explained in the platform's own words at the guide's AO levels |
| P1 | Motion system | Page transitions, arrivals, reveals below the fold, lift, chart tweening; all off under reduced motion; tested |
| P1 | Icons, rooms and navigation | An original icon set; an All rooms panel and page; room pages with a shared identity; a new home page |
| P1 | A complete staged case lab | Halden Distribution: problem, cause, strategy, implementation (a plan scheduled by critical path analysis against the deadline) and evaluation, with a memo |
| P1 | A polished quantitative experience | The cash flow lab: the guide's forecast layout, five ways to pay for a kiln, four measures, and profit reconciled to cash |
| P2 | Finance Desk and studios | Ratio analysis (3.5, 3.6 HL), investment appraisal (3.8, NPV HL), market share and growth, position maps, location scoring, capacity utilization and productivity (HL), stock control (HL) |
| P2 | Progress and a course map | A progress page that reads only this browser's storage; a course map generated from the content |
| Also | Paper 3 and IA | Paper 3 practice as 2, 6 and 17 mark questions, the last self-marked on criteria A to D; a ten-step IA planner with document checks |

The Finance Desk desks and the studio tools were built in parallel in separate worktrees and merged; every merged figure was rechecked.

### Content in this release

| | 0.1.0 | 0.2.0 |
| --- | --- | --- |
| Pages | 54 | 66 |
| Rooms with working material | 11 of 14 | 13 of 14 (4 live, 9 partly built; the Boardroom is planned) |
| Topic briefs | 3 | 3 |
| Case labs | 0 | 1 |
| Interactions | 11 | 20, plus the IA planner, practice self-checks and retrieval cards |
| Calculations | 13 | 28 |
| Practice questions | 22 | 24 (10 in the style of paper 1, 11 of paper 2, 3 of paper 3; 7 HL only) |
| Subtopics with a brief, interaction or worked calculation | 5 | 13 |
| Sources and claims | 27 and 26 | 29 and 40 |
| Syllabus subtopics Verified against the guide | 0 | 37 |

## Not completed, and why

| Item | Status | What is needed |
| --- | --- | --- |
| **Deployment** | Not deployed; no Vercel access from this environment | Follow [DEPLOYMENT.md](DEPLOYMENT.md), as a new Vercel project separate from the Economics site |
| **Astro 7.4 upgrade** | Astro 6.4.8 has published advisories (low exposure for a static site, see [SECURITY.md](../SECURITY.md)); the fix needs Node 22.23.4 or later, which this environment does not have | Run the upgrade in SECURITY.md on a machine with Node 24, then `npm run qa` |
| **Live comparison with the Economics site** | The network policy blocked the live site; the comparison used renders of its source | Allow the domain in the environment's network settings if a live comparison is wanted |
| **Remaining subtopics** | 3 complete briefs; 9 more subtopics have tools or calculations; 24 are planned | See [ROADMAP.md](ROADMAP.md) |
| **Boardroom** | Planned, not linked | Multi-function, multi-round decisions, after testing the existing rooms with learners |
| **People and Culture tool** | The organization chart explorer is planned | ROADMAP.md |
| **A second case lab** | The analysis chain (data, insight, option, recommendation) runs through the case files' worked analyses, but has no staged lab yet | ROADMAP.md |
| **Examiner observations** | None: no subject reports were supplied, and the teacher support material is not a subject report | Supply subject reports |
| **Testing gaps** | Not tested: Firefox, Safari, real devices, assistive technology users, the deployed site, slow networks, view transitions outside Chromium | See [TESTING.md](TESTING.md#what-is-not-tested) |

## Decisions for the creator

1. **Licensing.** The guide and the teacher support material carry a notice that commercial use by curriculum mapping or teacher resource platforms needs a written licence from the IB. The platform states facts with page references in its own words and reproduces no text, markbands, descriptors or command term definitions. If the platform will be commercial, ask the IB (copyright@ibo.org).
2. **The guide's discount table.** It prints the 6% factor for year 8 as 0.6271, where the formula gives 0.6274. The investment appraisal desk uses the printed figure, as an examination would, and says so.
3. **Deployment.** Create the Vercel project, separate from the Economics project (DEPLOYMENT.md).
4. **Contact address.** None is published; accessibility and permission requests point to Arjun Agrawal Economics. Supply an address if you want one shown.
5. **Visibility.** The repository is public, as approved on 29 October 2026. Code is MIT; content, brand and portrait remain all rights reserved (LICENSE).

## Delivery

- **Source:** https://github.com/ArjunAgrawal101/the-business-brief, branch `main`.
- **Supplied documents:** inventoried, never committed (they are copyright works).
