# Roadmap

In order of priority. Each step is done completely before the next begins. What 3.0 delivered, and what it left undone, is in [RELEASE_REPORT.md](RELEASE_REPORT.md).

## Before a public launch

1. **Confirm the tutoring terms.** The brief gave a 90-minute session; the live Economics page, which the tutorials page follows, says one hour. One line in `src/lib/tutorials.ts` changes it.
2. **Upgrade Astro to 7.4** on Node 24 (SECURITY.md), and set a Content Security Policy.
3. **Test with people.** Accessibility testing with people who use screen readers, magnification and switch access; Firefox, Safari and real phones; and sessions with each kind of learner the pathways serve: IB students and teachers, undergraduates, MBA students and founders.
4. **Licensing.** The guide's notice says commercial use by curriculum mapping or teacher resource platforms needs a licence from the IB. The platform paraphrases and cites; if it becomes commercial, ask the IB (SOURCE_GOVERNANCE.md).

## Content

1. **Hofstede's cultural dimensions**, the fifteenth toolkit guide, applied to a case.
2. **Full notes for 1.5, 2.3 and 3.3**, the three subtopics taught in complete briefs, so every subtopic reads the same way.
3. **Shorter revision sheets.** Each subtopic's quick revision sheet runs 2.4 to 6.6 screens because it lists every IB term; a two-screen edition, with the full list a click away.
4. **Examiner observations**, each cited, once subject reports are supplied. Until then guidance is labelled as the platform's recommendation.
5. **A wider Business Intelligence briefing.** Items for the six subtopics with none yet (2.4, 2.7, 3.9, 5.1, 5.2 and 5.5), more from India and from small businesses, and a second source for the seven items that rest on one organization's documents, once major news organizations can be read; refreshed each term, every fact dated and cited. It stays a curated briefing, never a feed presented as live news.
6. **Real-organization cases** in the Case Vault and the Boardroom Briefings, built only from cited, dated evidence read in the organizations' own documents.
7. **Advanced Management, wider and checked.** More organizations, so that the same few companies do not recur across domains; the further reading opened and annotated rather than cited as references; and a test that recomputes every module case exhibit, as the Case Vault's tests do.
8. **Framework pages for scenario planning and stakeholder salience**, which have tools but no page in the library, and tools for Hofstede's dimensions and RACI.

## Rooms

| Room | Next step |
| --- | --- |
| Operations Floor | A supply chain mapper, a quality management simulation (5.3, HL) and a crisis management scenario (5.7, HL) |
| Market Studio | Instruments for sales forecasting (4.3, HL) and international marketing (4.6) |
| People and Culture | Tools for organizational culture (2.5, HL) and industrial relations (2.7, HL) |
| Financial Laboratory | Depreciation schedules (3.4) beside the profit and loss calculator |
| Case Room | A second staged case lab, following the analysis chain (data, insight, option, recommendation) |
| Boardroom | Further scenarios, for example a multinational entering a market and a social enterprise |
| Assessment Centre | A clock and answer boxes for Paper 3 practice questions 1 and 2; a worked planning example for each IA key concept |
| Question bank | The Paper 1 case questions and the 50 connection questions added to the bank; and a lighter page: the static list of 315 questions is 1.5 MB (232 KB compressed), so it should load in parts |

## Pathways

- A mapping for Cambridge IGCSE Business Studies from its current syllabus, in its own curriculum file and never mixed with the IB route.
- Undergraduate and MBA readings for the enrichment maps and frameworks, cited from the literature.

## Platform

- Optional, consent-based progress across devices, only after a privacy and security review and the owner's approval. Today everything stays in the reader's browser.
- Visual regression testing with stored baselines.
- Printable PDF packs of each subtopic's notes.
- Phone layouts for the 54 older library diagrams, whose labels fall below 12 px at 320 pixels.
- Lesson presentations for the Resources Library, which says today that none exist yet.
