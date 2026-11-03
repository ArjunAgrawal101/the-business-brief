# Roadmap

In order of priority. Each step is done completely before the next begins. What 2.1 delivered is in [RELEASE_REPORT.md](RELEASE_REPORT.md).

## Before a public launch

1. **Check the deployed site.** Vercel deploys from `main`, but this environment cannot reach `the-business-brief-dun.vercel.app`. Open it after each deployment, or allow the host in the environment's network settings so it can be checked from here (DEPLOYMENT.md).
2. **Upgrade Astro to 7.4** on Node 24 (SECURITY.md), and set a Content Security Policy.
3. **Test with people.** Accessibility testing with people who use screen readers, magnification and switch access; Firefox, Safari and real phones; and sessions with each kind of learner the pathways serve: IB students and teachers, undergraduates, MBA students and founders.
4. **Licensing.** The guide's notice says commercial use by curriculum mapping or teacher resource platforms needs a licence from the IB. The platform paraphrases and cites; if it becomes commercial, ask the IB (SOURCE_GOVERNANCE.md).

## Content

1. **Hofstede's cultural dimensions**, the fifteenth toolkit guide, applied to a case.
2. **Full notes for 1.5, 2.3 and 3.3**, the three subtopics taught in complete briefs, so every subtopic reads the same way.
3. **Revision briefs** for the 34 subtopics with full notes; the Revision Brief room has them only for the three briefs.
4. **Examiner observations**, each cited, once subject reports are supplied. Until then guidance is labelled as the platform's recommendation.
5. **A wider Business Intelligence briefing.** More developments as more publishers' own sites can be read, refreshed each term, every fact dated and cited. It stays a curated briefing, never a feed presented as live news.
6. **Real-organization cases** in the Case Vault, built only from cited, dated evidence.

## Rooms

| Room | Next step |
| --- | --- |
| Operations Floor | A supply chain mapper, a quality management simulation (5.3, HL) and a crisis management scenario (5.7, HL) |
| Market Studio | Instruments for sales forecasting (4.3, HL) and international marketing (4.6) |
| People and Culture | Tools for organizational culture (2.5, HL) and industrial relations (2.7, HL) |
| Financial Laboratory | Depreciation schedules (3.4) beside the profit and loss calculator |
| Case Room | A second staged case lab, following the analysis chain (data, insight, option, recommendation) |
| Boardroom | Further scenarios, for example a multinational entering a market and a social enterprise |
| Assessment Centre | A timer for the Paper 1 workspace and the Paper 3 plan; a worked planning example for each IA key concept |
| Question bank | A lighter page: the static list of 269 questions is 1.3 MB (197 KB compressed), so it should load in parts |

## Pathways

- A mapping for Cambridge IGCSE Business Studies from its current syllabus, in its own curriculum file and never mixed with the IB route.
- Undergraduate and MBA readings for the enrichment maps and frameworks, cited from the literature.

## Platform

- Optional, consent-based progress across devices, only after a privacy and security review and the owner's approval. Today everything stays in the reader's browser.
- Visual regression testing with stored baselines.
- Printable PDF packs of each subtopic's notes.
