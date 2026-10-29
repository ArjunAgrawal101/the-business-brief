# Source governance

The platform's credibility rests on one rule: **every statement says where it comes from and how sure it is.** This document says how that is done.

## The source hierarchy

When sources disagree, the higher one wins. When only a lower one is available, the statement carries a weaker status.

1. **The IB's own documents for this subject**: the Business management guide (first assessment 2024), which controls; specimen papers, markschemes and subject reports when they are supplied. Status: Verified (`primary`), with a page reference. The *teacher support material* (2022) is official IB guidance for teachers: it is paraphrased, attributed with its page and shown as "From IB guidance". It is not a subject report, so nothing from it is presented as an examiner observation.
2. **Other IB documents**: *Assessment procedures*, as recorded in the creator's files; the guides of other IB subjects for shared elements such as command terms. Status: Recorded.
3. **Primary documents of real organizations**: annual reports and filings (for example a 10-K on the SEC's EDGAR system), official announcements, with dates.
4. **Academic sources**: the original statement of a model or theory (Ansoff 1957, Lewin 1951, Fayol 1916).
5. **Reputable press**, for dated events, cited by title, date and address.
6. **Secondary education providers**: course books, school department pages, revision sites. A course book, such as the Hodder extracts supplied with the guide, may be used to check a convention the guide does not settle (how float is calculated, how a decision tree is drawn); it is never the authority on the course. Revision sites were used for 0.1.0, before the guide was supplied, and are kept in the register for the record only.

Not used as sources: memory, unattributed web pages, or the platform's own earlier statements.

## Provenance labels

Every block, exhibit and interaction carries one label, shown on the page. See [CONTENT_MODEL.md](CONTENT_MODEL.md) for the full list. The ones that most need care:

- **IB requirement** only for something the guide states, with its page.
- **Examiner observation** only for something an examiner wrote in a subject report, cited to the report. None in this release, and the Examiner Lens says so.
- **External evidence** for a fact about a real organization: dated, cited, and separated from interpretation.
- **Simulated data** for everything in a fictional case.
- **Original practice question** and **Assessment explanation** for the platform's own questions and mark schemes, which are never presented as IB material.

## The registers

**The source register** (`src/content/data/sources.yaml`, shown at `/sources/`) lists each source with its author, publisher, year, kind, availability (supplied, not available, referenced, found by web search, in the creator's repository), address and date accessed, and a note on how it is used.

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

Facts about real organizations appear in this release only in the growth brief's evidence section: McDonald's franchised share (from its 10-K for 2025), the Tata Starbucks joint venture (from Tata Consumer Products' announcement), Disney's acquisition of 21st Century Fox's assets (from press coverage of its completion) and the founding of Star Alliance (from press coverage). Each:

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
- The guide's markbands, its criteria level descriptors and its command term definitions are not reproduced. The platform names a criterion, gives its maximum mark and points to the page.
- Command terms are explained in the platform's own words; the Examiner Lens gives the page of each official definition. (In 0.1.0 they were quoted from the IB Economics guide's glossary; that has been withdrawn.)
- The IB's copyright notice on the guide and the teacher support material says commercial use by operators of curriculum mapping or teacher resource platforms needs a written licence from the IB. The platform states facts with page references rather than reproducing the documents; if it becomes commercial, the creator should ask the IB about a licence (copyright@ibo.org).
- The supplied PDFs are never committed to the repository.
- Original practice questions are written for the platform's own cases. They imitate the style of each paper, not its content.
- Theories and models are explained in the platform's own words, with the original source cited.
- Images: the only photograph is the creator's own portrait. Fonts are under the SIL Open Font Licence.

## Checking against the guide

The guide was supplied on 29 October 2026 and the mapping was checked against it. The procedure for keeping it right, and for a future edition of the guide, is in [CURRICULUM_MAPPING.md](CURRICULUM_MAPPING.md#keeping-the-mapping-right). The inventory of the supplied documents, with what was read and how far, is [audit/RESOURCE_INVENTORY.md](audit/RESOURCE_INVENTORY.md).
