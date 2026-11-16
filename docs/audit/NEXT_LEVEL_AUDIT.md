# Next-level development: audit and preservation, 16 November 2026

The record of the audit made before release 2.2: what was inspected, what must remain unchanged, what is enhanced, and what is new. The outcome is in [RELEASE_REPORT.md](../RELEASE_REPORT.md). The owner's instruction governs every line below: preserve what is already excellent, improve what can be improved, add what is genuinely missing.

## 1. What was inspected

| Item | How | Finding |
| --- | --- | --- |
| The repository | Read on `main` at `1354e14` (release 2.1.0), built and tested locally | 1,011 pages; 899 unit tests and 872 browser tests passing; CI green |
| The live site, `the-business-brief-dun.vercel.app` | Opened in a browser for the first time from this environment, after a network environment allowing the two live hosts was created with the owner's approval | It serves the 2.1 release (for example, the Rooms page reads "12 are live and 3 are partly built", text from the 2.1 commits). The deployment of 2.1 is therefore confirmed |
| The Economics site, `ib-economics-pi.vercel.app` | Rendered in a JavaScript-enabled browser, the Tutorials view opened as its own buttons open it (`#/tutorials`), at desktop and phone widths; its source read in the `ArjunAgrawal101/ib-economics` repository (read only, unchanged) | See section 5 |
| Existing interactive features | The full browser suite and the persona walkthroughs | All working: calculators, mindmaps, cases, assessment pages, progress and saved items |

## 2. What must remain unchanged

- **The identity.** Navy, ivory and champagne gold; Source Serif 4, Inter and Cinzel; the AA monogram and lockup in their proportions; the cinematic opening and its rule (every fresh entry, nothing stored).
- **The page conventions.** Page intros, numbered section heads, the subtopic and notes template, mindmaps, the glossary, the frameworks library, the Case Vault, the Boardroom scenarios, the Financial Laboratory calculators and their behaviour, the Assessment Centre pages, the Resources Library.
- **The guarantees.** The integrity gate, the provenance labels, the claims register, labelled fiction, original practice, IB requirements separated from strategy and examples, the SL and HL distinction.
- **Privacy.** No accounts, analytics or cookies; learner work only in this browser, every key declared on the privacy page.
- **Every working address.** No route is removed or renamed; redirects remain.
- **Progressive enhancement and accessibility.** Every page complete without JavaScript, WCAG 2.2 AA, reflow at 320 pixels, reduced motion respected.

## 3. What is enhanced

| Area | Enhancement |
| --- | --- |
| Navigation | Six groups, Learn, Practise, Tools, Assess, Advance and Connect, adapted from the owner's suggestion to the existing mega menu and drawer; a gold Tutorials button in the header; the home page's floor plan gains an executive wing |
| Boardroom | An executive simulation mode beside the three existing scenarios, which are not changed |
| Frameworks | Application detail for every framework and an application lab with new advanced tools |
| Finance Desk | An advanced financial analysis mode beside the existing calculators, which are not changed |
| Business Intelligence | The six-question editorial shape on every item, more themes and an editorial presentation |
| Dashboard | My Business Workspace: learning list, notes, saved analyses and selective export, still in this browser only |
| Sources | The register becomes a folder, one file per area, so new material adds its own file |

## 4. What is new

- **Tutorials** (`/tutorials/`), integrated in the header, the drawer, the footer, the home page, the About page, the IB DP pathway, the Assessment Centre and, as one quiet line, on subtopic pages, briefs, revision briefs, case files and calculation practice.
- **Advanced Management and Strategy** (`/advanced/`): six domains and thirty planned modules, each in eight parts, kept apart from the IB course, with its own room identity.
- **The Boardroom Briefings**: an editorial case series with student and analysis editions.

## 5. The Economics Tutorials page, and the terms used

The live page, read in a browser on 16 November 2026, offers five pathways, all one-to-one and online:

| Pathway | Price | Sessions |
| --- | --- | --- |
| Regular sessions | US$20 per session | 1 session of 1 hour, any topic |
| IA support | US$100 for the package | 6 sessions of 1 hour |
| EE supervisor support | US$150 for the support | Agreed at enquiry |
| Marathon Revision | US$300 for the package | 20 sessions of 1 hour |
| Exam Practice | US$200 for the package | 12 sessions of 1 hour |

Enquiries go by email (a prepared subject and template) or WhatsApp, with LinkedIn and Instagram listed; there is no booking system, deposit or payment. The page carries no testimonials, ratings or grade claims, and its own test asserts that no session is described as longer than an hour.

**A discrepancy, resolved by the owner's own rule.** The brief gives the owner's latest information as "US$20 per 90-minute one-to-one session" with group discounts available. The live page says one hour, and does not mention group discounts. The Economics repository shows why: an earlier version of its Tutorials view said 90 minutes and group discounts, and the final release replaced it with the one-hour terms. Because the brief names the live page "the definitive reference for its existing commercial offering", the Business Management page states one hour and the four packages exactly as the live page does. The owner's statement that group discounts are available is stated as well, without any group price. Every term lives in `src/lib/tutorials.ts`, so a change is one edit, checked by `tests/unit/tutorials.test.ts`. **The owner should confirm the session length**; if 90 minutes is right, the Economics page needs the same correction.

## 6. Constraints that shape the work

- Real organizations only with facts read in a dated source; fiction labelled; no invented citation, statistic, testimonial or result.
- No reproduction of copyrighted textbooks or business school cases.
- MBA and undergraduate material never mixed into the IB syllabus or its coverage.
- No new dependencies, accounts, tracking or data collection.
