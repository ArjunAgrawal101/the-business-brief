# Source governance

The platform's credibility rests on one rule: **every statement says where it comes from and how sure it is.** This document says how that is done.

## The source hierarchy

When sources disagree, the higher one wins. When only a lower one is available, the statement carries a weaker status.

1. **The IB's own documents for this subject**: the Business management guide (first assessment 2024), which controls and decides every requirement; specimen papers, markschemes and subject reports when they are supplied. Status: Verified (`primary`), with a page reference. The edition supplied, and checked against, is the one published in February 2022 and updated in May 2022. The *teacher support material* (2022) is official IB guidance for teachers: it is paraphrased, attributed with its page and shown under a label of its own, "IB teacher support material". It is neither a requirement of the guide nor a subject report, so nothing from it is presented as either.
2. **Other IB documents**: *Assessment procedures*, as recorded in the creator's files; the guides of other IB subjects for shared elements such as command terms. Status: Recorded.
3. **The creator's four assessment guides** (IA, Paper 1, Paper 2, Paper 3), five pages each, supplied on 2 November 2026 and published unchanged as downloads. They are the primary basis for the Assessment Centre's explanations. They cite the guide (as "updated July 2024"), the teacher support material and IB subject reports from May 2024 to May 2026, which were not supplied. What they say the IB requires is checked against the guide itself; what they report from subject reports is shown as examiner emphasis, attributed to them (see below).
4. **Primary documents of real organizations**: annual reports and filings (for example a 10-K on the SEC's EDGAR system), official announcements, with dates.
5. **Academic sources**: the original statement of a model or theory (Ansoff 1957, Lewin 1951, Fayol 1916).
6. **Reputable press**, for dated events, cited by title, date and address.
7. **Secondary education providers**: course books, school department pages, revision sites. A course book, such as the Hodder extracts supplied with the guide, may be used to check a convention the guide does not settle (how float is calculated, how a decision tree is drawn); it is never the authority on the course. Revision sites were used for 0.1.0, before the guide was supplied, and are kept in the register for the record only.

Not used as sources: memory, unattributed web pages, or the platform's own earlier statements.

## Provenance labels

Every block, exhibit and interaction carries one label, shown on the page. See [CONTENT_MODEL.md](CONTENT_MODEL.md) for the full list. The ones that most need care:

- **IB requirement** only for something the guide states, with its page.
- **Examiner observation** (`examiner-observation`, the content model's label) only for something an examiner wrote in a subject report the platform has read, cited to the report. There is none: no subject report has been supplied, and the Examiner Lens says so.
- **External evidence** for a fact about a real organization: dated, cited, and separated from interpretation.
- **Simulated data** for everything in a fictional case.
- **Original practice question** and **Assessment explanation** for the platform's own questions and mark schemes, which are never presented as IB material.

## The Assessment Centre's labels

The Assessment Centre and the IA tools label every block, check and checklist with one of five standings, from one list (`src/lib/guide-labels.ts`):

| Label | Use |
| --- | --- |
| IB requirement | Stated in the guide, with its page. The guide decides every requirement: a point from examiner instructions or a markscheme is never given this label. Where the guide says "should" or "recommended" rather than "must", the text says so, and the internal assessment's list of what the project must do holds only the guide's musts |
| Examiner emphasis | Only what one of the creator's four assessment guides reports from IB subject reports or past papers (May 2024 to May 2026), given as that guide states it and attributed to it, with its page, beside the label. The platform has not seen the reports and does not present these points as verified. A point no assessment guide states is a recommended strategy, if it is sound advice, or it is not made; a prediction about a future session (such as a change from May 2027) appears only where an assessment guide states it, attributed to it. `tests/unit/assessment-content.test.ts` fails if an examiner emphasis label on the Centre's pages has no attribution |
| Recommended strategy | The platform's own technique or advice, including the assessment guides' own recommendations, such as their checklists |
| Illustrative example | Invented for teaching: the businesses, figures and answers are fictional |
| IB teacher support material | The IB's advice to teachers, paraphrased with its page: official guidance, not a requirement |

Citations are given once per block or section: a verification badge and the source beneath a list of facts, a short citation beside a block's labels, and the page after each line of a rule list.

## The registers

**The source register** (`src/content/sources/*.yaml`, one file per area, shown at `/sources/`) lists each source with its author, publisher, year, kind, availability (supplied, not available, referenced, found by web search, opened and read online, in the creator's repository), address and date accessed, and a note on how it is used. "Found by web search" means the page itself was not opened; "opened and read online" means the document was read in full on the date given. A work or document is registered once, in whichever file first needed it, and every other page that relies on it cites that entry; ids are unique across the files, and the build fails on a repeated id.

**The claims register** (`src/content/data/claims.yaml`, also shown at `/sources/`) lists each claim the platform makes about a requirement, an institution or a real organization:

| Field | Meaning |
| --- | --- |
| `statement` | The claim, in one sentence |
| `sources` | Ids in the source register |
| `location` | Section and page, where known |
| `status` | Verification status |
| `checked` | When it was last checked |
| `usedIn` | The pages that rely on it |
| `note` | Disagreements, caveats, what remains to check |

The integrity check fails the build if a claim names a source that is not in the register.

### Adding a claim

1. Find the highest available source. Record it in the source register if it is new, with the date you accessed it.
2. Write the claim in your own words, as narrowly as the source supports.
3. Set the status honestly. One secondary source is Unverified, not Corroborated.
4. Note any disagreement between sources, and use Sources conflict when they do not agree.
5. Show the status on the page, beside the statement.

## Real organizations

Facts about real organizations appear in two places. The growth brief's evidence section gives McDonald's franchised share (from its 10-K for 2025), the Tata Starbucks joint venture (from Tata Consumer Products' announcement), Disney's acquisition of 21st Century Fox's assets (from press coverage of its completion) and the founding of Star Alliance (from press coverage). The Business Intelligence Briefing (`/intelligence/`) is built from real developments; each item keeps its own sources, with the date each was published and read and the facts it supports, and the build enforces the rules in [CONTENT_MODEL.md](CONTENT_MODEL.md#the-business-intelligence-briefing). Each fact, in either place:

- is dated and cited, with the source in the register;
- is kept apart from interpretation: the page states the fact, then, separately labelled, what it suggests;
- says nothing the source does not say.

## Fictional cases

The three cases are fictional. Their names, people and figures are invented, and each case says so in its header and in a method note. The rules:

- Every exhibit is labelled Simulated data, and the integrity check enforces it.
- The figures must be internally consistent: totals add up, ratios follow from the numbers, and every figure in a Decision Room, a worked example or a practice answer can be recomputed from the exhibits. `tests/unit/cases.test.ts` does exactly that.
- Survey results and forecasts are presented as estimates, with their basis stated.
- A fictional organization must not resemble a real one closely enough to be mistaken for it.

## Copyright

- No text is reproduced from the Business management guide, the teacher support material, examination papers, markschemes, subject reports or course books. Course structure, requirements and advice are described in the platform's own words, with page references.
- The guide's markbands, its criteria level descriptors and its command term definitions are never reproduced in its wording. The platform names each criterion and gives its maximum mark, and the assessment pages add brief paraphrases with the page: a few words for each strand of the Papers 1 and 2 markbands (Paper 1 page), the top level of each Paper 3 and IA criterion, and what each IA criterion asks (IA page and its self-review). These are paraphrases, not copies, and the licence note below applies to them as to the rest. The assessment data's `notStated` entries say the same.
- Command terms are explained in the platform's own words; the Examiner Lens gives the page of each official definition. (In 0.1.0 they were quoted from the IB Economics guide's glossary; that has been withdrawn.)
- The IB's copyright notice on the guide and the teacher support material says commercial use by operators of curriculum mapping or teacher resource platforms needs a written licence from the IB. The platform states facts with page references rather than reproducing the documents; if it becomes commercial, the creator should ask the IB about a licence (copyright@ibo.org).
- The supplied PDFs are never committed to the repository.
- Original practice questions are written for the platform's own cases. They imitate the style of each paper, not its content.
- Theories and models are explained in the platform's own words, with the original source cited.
- Images: the only photograph is the creator's own portrait. Fonts are under the SIL Open Font Licence.

## Checking against the guide

The guide was supplied on 29 October 2026 and the mapping was checked against it. The procedure for keeping it right, and for a future edition of the guide, is in [CURRICULUM_MAPPING.md](CURRICULUM_MAPPING.md#keeping-the-mapping-right). The inventory of the supplied documents, with what was read and how far, is [audit/RESOURCE_INVENTORY.md](audit/RESOURCE_INVENTORY.md).
