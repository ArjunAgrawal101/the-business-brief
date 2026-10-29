# Release report: 0.1.0

29 October 2026

## Summary

The first release of Arjun Agrawal | The Business Brief is built, documented and tested: 54 pages, three complete topic briefs with their cases, Decision Rooms and interactions, a Finance Desk, a Toolkit, an Exam Desk, IB mapping with verification status, and seven pathways. All checks pass. It is **not yet on GitHub and not deployed**, for the reasons below.

## Completed

| Phase | Outcome |
| --- | --- |
| A. Discovery | [Discovery report](discovery/DISCOVERY_REPORT.md): the Economics repository inspected as a quality benchmark (not a template); integrations and gaps recorded |
| B and C. Architecture and design | Astro static site, content schemas and integrity gate; a new visual identity and design system, distinct from the Economics site |
| D and E. Pilot experiences | Growth and evolution (strategic), Costs and revenues with break-even (quantitative), Leadership and management (people): each with a case, interactions, a Decision Room, practice questions and a revision brief |
| F. QA | Type check, lint, content lint, 47 unit tests, link check, contrast check, 147 browser tests including axe-core on every page at two sizes, screenshots at four widths. See [TESTING.md](TESTING.md) |
| G. Documentation | README, architecture, design system, content model, curriculum mapping, source governance, interactions, accessibility, testing, deployment, roadmap, contributing, changelog, security, licence |

### Content in this release

| | Count |
| --- | --- |
| Pages | 54 |
| Topic briefs | 3 complete |
| Cases | 3 (fictional, simulated data, recomputed by tests) |
| Decision Rooms | 3, with 30 outcomes |
| Interactions | 11, plus question self-checks and retrieval cards |
| Calculations | 13, each with a worked example |
| Tools | 15 listed, 6 complete guides |
| Practice questions | 22 (11 in the style of Paper 1, 10 of Paper 2, 1 of Paper 3; 3 HL only) |
| Command terms | 31 |
| Glossary terms | 44 |
| Sources and claims | 27 sources, 26 claims |
| Syllabus subtopics mapped | 37 (31 corroborated, 3 conflicting, 3 unverified) |

## Not completed, and why

| Item | Status | What is needed |
| --- | --- | --- |
| **GitHub repository** | Not created. Creating `the-business-brief` through this session's GitHub integration returned `403 Resource not accessible by integration` (tried at the start and again at the end). The repository does not exist yet, and this session cannot create it | Create a private repository named `the-business-brief` under `ArjunAgrawal101` on github.com and give the Claude GitHub App access to it; then the local history can be pushed as it is. Or push from the bundle yourself (below) |
| **Deployment** | Not deployed. No Vercel access from this environment | Follow [DEPLOYMENT.md](DEPLOYMENT.md), as a new Vercel project separate from the Economics site |
| **Verification against the Guide** | The Guide was not supplied; nothing is marked Verified | Supply the Business management guide (first assessment 2024) and run the procedure in [CURRICULUM_MAPPING.md](CURRICULUM_MAPPING.md) |
| **Inspection of the live Economics site** | The environment's network policy blocked the live site, so the Economics source was inspected instead | Allow the domain under the environment's network settings if a live comparison is wanted |
| **Astro 7.4 upgrade** | Astro 6.4.8 has published advisories (low exposure for this static site, see [SECURITY.md](../SECURITY.md)). Astro 7.4 needs Node 22.23.4 or later; this environment has Node 22.22.0, and fetching a newer Node was not permitted | Run the upgrade in SECURITY.md on a machine with Node 24, then `npm run qa` |
| **Remaining subtopics** | 34 of 37 subtopics are mapped and planned, not written. Released as a deliberate choice: three complete briefs rather than many thin ones | See [ROADMAP.md](ROADMAP.md) |
| **Planned modules** | Market Studio, Operations Floor and Boardroom are planned; the Business Brief itself, Strategy Studio, Finance Desk, People and Culture, Examiner Lens, IA Studio and Revision Brief are partly built; Case Room, Decision Room, Case Vault and Exam Desk are live. The site marks each module's status | See [ROADMAP.md](ROADMAP.md) |
| **Other curricula** | No IGCSE or other mapping yet; the pathways say so | Each needs its own specification as the source |
| **Testing gaps** | Not tested: Firefox, Safari, real devices, assistive technology users, the deployed site, slow networks | See [TESTING.md](TESTING.md#what-is-not-tested) |

## Decisions for the creator

1. **Repository and deployment.** Create the repository (private until you decide otherwise) and the Vercel project.
2. **Command term definitions.** Twenty-six definitions are quoted, with attribution, from the IB Economics guide's glossary. Confirm you are content with that use, or ask for paraphrases.
3. **Contact address.** No email address is published on the site. Accessibility and permission requests currently point to Arjun Agrawal Economics. Supply an address if you want one shown.
4. **Public or private.** The repository should stay private until you approve public visibility.

## Delivery

Because the GitHub repository could not be created, the release is delivered as:

- a **git bundle** with the full history, which can be cloned with `git clone the-business-brief.bundle` and pushed to any remote;
- a **source ZIP** of the working tree, without `node_modules`, `dist` or test output.

Their locations are given with the final report in the session.
