# Content model

All teaching content is YAML in `src/content/`, validated by the Zod schemas in `src/lib/schemas.ts` and checked for broken references by `src/lib/integrity.ts` on every build and test run.

## The relationship model

```
curriculum (ib-dp-bm)
  unit
    subtopic ──────────────► topic brief
                               │  sections of blocks (prose, definitions, mechanisms,
                               │  comparisons, misconceptions, worked calculations,
                               │  exhibits, interactions)
                               ├─► cases ──► exhibits
                               │            └─► Decision Room (rounds, outcomes, debrief)
                               ├─► tools ──► interaction, case application
                               ├─► calculations ──► function in src/lib/finance.ts, worked example
                               ├─► practice questions ──► command term, case, exhibits, mark scheme
                               ├─► glossary terms
                               ├─► concepts (the concept lens)
                               ├─► pathway lenses
                               └─► revision (key points, retrieval, traps)
claims ──► sources                (every statement about the course)
```

Every arrow is an id that the integrity check resolves. A reference that does not resolve fails the build.

## Labels every piece of content carries

### Provenance: what kind of content it is

The label column is what readers see on the page.

| Label | Value in YAML | Meaning |
| --- | --- | --- |
| IB requirement | `ib-requirement` | Stated by the Business management guide, with its page |
| Subject knowledge | `subject-knowledge` | Established business knowledge, explained in the platform's own words |
| Curriculum requirement | `curriculum-requirement` | Required by a non-IB curriculum that has been mapped. None mapped yet |
| Source-derived | `source-derived` | Follows a named source closely (for example Fayol's functions of management) |
| Examiner observation | `examiner-observation` | Reported by an examiner in a subject report. None available yet |
| External evidence | `external-evidence` | A dated, cited fact about a real organization |
| Simulated data | `simulated-data` | Invented for teaching; fictional cases and their exhibits |
| Arjun Agrawal framework | `aa-framework` | The Arjun Agrawal pedagogical framework: the platform's teaching method, sequences and advice |
| Original practice question | `original-practice` | Written for the platform; never an IB question |
| Assessment explanation | `assessment-explanation` | The platform's mark scheme, guidance or level descriptors for its own questions |
| Enrichment | `enrichment` | Beyond the course, for interest or for other pathways |

### Verification: how far a claim about the course has been checked

| Status | Value | Meaning |
| --- | --- | --- |
| Verified | `primary` | Checked against the IB document itself, with page number |
| Recorded | `recorded` | Taken from an IB document as recorded in the creator's own files (for example Assessment procedures 2027) or from another IB subject's guide |
| Corroborated, verify | `corroborated` | Two or more independent secondary sources agree; check against the Guide |
| Sources conflict | `conflicting` | Sources disagree; the page says how |
| Unverified | `unverified` | One source, or none; check before relying on it |
| Teaching choice | `pedagogical` | A decision by the platform, not a claim about requirements |

## Collections

| Collection | Files | One entry is |
| --- | --- | --- |
| `topics` | `topics/<id>.yaml` | A complete topic brief |
| `cases` | `cases/<id>.yaml` | A case file: narrative, exhibits, constraints, stakeholders, options, analysis, method |
| `decisions` | `decisions/<id>.yaml` | A Decision Room |
| `boardroom` | `boardroom/<id>.yaml` | A Boardroom scenario (below) |
| `tools` | `tools/<id>.yaml` | A toolkit tool: `status: planned` (summary only) or `complete` (full guide); `classes` (situational, planning, decision-making) with `classSource` (`tsm` or `platform`), suggested `units`, and what the guide says it `includes` |
| `interactives` | `interactives/<id>.yaml` | The data for one interaction, by `component`, with the `syllabus` subtopics it serves and the `page` it lives on (its anchor is `#ix-<id>`), for the course map, coverage, search and progress. Components include the classification exercises, the Finance Desk workspaces (`break-even-workspace`, `special-order`, `ratio-desk`, `cash-flow-lab`, `investment-appraisal`), the studio tools, and `case-lab`, whose `stages` each hold `tasks` of kind `sort`, `choose`, `plan` (activities with dependencies, scheduled by critical path analysis) or `exhibit` |
| `curricula` | `curricula/<id>.yaml` | A syllabus spine: units with hours, guide page and suggested tools; subtopics with level, page and `content` statements (text, depth of teaching as AOs, level); concepts. The IB file is generated by `scripts/content/build_curriculum.py` |
| `questions` | `questions/*.yaml` (lists) | An original practice question with its mark scheme |
| `glossary` | `glossary/*.yaml` (lists, one file per unit plus `toolkit.yaml`) | A term: its syllabus `definition`, the everyday meaning where it differs (`general`), `context`, `example`, `formula`, `usage` notes, `aliases`, `level`, `category`, the `subtopics` it belongs to and `related` terms |
| `mindmaps` | `mindmaps/<id>.yaml` | A mindmap of a subtopic (`scope: subtopic`, with its `code`) or of a unit (`scope: unit`): 3 to 8 `branches`, each of a kind (concept, types, theory, tool, calculation, application, evaluation, connection) with nested nodes; a node may be `core` (kept in the revision view), name a glossary `term`, carry a `formula` or a `note`, and be marked `level: HL`; `connections` to other subtopics; the `basis` it was checked against |
| `enrichmentMaps` | `enrichment-maps/<id>.yaml` | A map of management ideas beyond the IB course, for the undergraduate and MBA pathways: a mindmap's `centre`, `branches` and nodes with `scope: enrichment` in place of an IB code, unit and level, its `audience`, `field`, the IB subtopics it `builds` on, `related` maps and its `basis`. A collection of its own, so it never counts as IB coverage, an IB map or an IB resource. `src/lib/integrity-pathways.ts` holds it to the IB map bar and rejects any HL mark |
| `notes` | `notes/<slug>.yaml` | Full notes for one subtopic (below) |
| `calculations` | `data/calculations.yaml` | A calculation: formula, variables, unit, interpretation, errors, worked example |
| `assessment` | `data/assessment.yaml` | An assessment component: facts with sources and pages; `outline` (duration, marks and weight at SL and HL), `sections` (marks, task, AOs), `criteria` (name and maximum mark only), `requirements`, `ibGuidance` (paraphrased teacher support material, with page); what is not stated; preparation |
| `commandTerms` | `data/command-terms.yaml` | A command term at the guide's AO level (`aoStatus`), the platform's explanation (`definitionSource: platform`) and the page of the official definition (`officialPage`) |
| `concepts`, `pathways`, `modules` | `data/*.yaml` | The four concepts, the audience pathways, the platform's rooms. A room may carry a `lead`, `items` (each a working page or anchor, checked by the link check), the `syllabus` codes it serves and what is `planned`, which its page renders |
| `sources`, `claims` | `data/sources.yaml`, `data/claims.yaml` | The source register and the claims register |
| `briefings` | `briefings/<id>.yaml` | A learning briefing of the Entrepreneurship and Innovation Lab: its `step` on the founder's route, question, introduction and `ibSummary`; `sections`, each with the IB codes it covers (`ib`), `enrichment` when it goes beyond the syllabus, the codes it only `connects` to, and optional points, a table, formulas, a fictional example and a callout; the register of `ideas` with their IB status (`ib`, `toolkit` or `enrichment`) and the guide's page; misconceptions, enrichment `terms`, course `glossary` terms, `questions`, `tools` and `basis` |
| `labTools` | `lab/<id>.yaml` | The data behind one of the Lab's six tools, by `kind` (`canvas`, `costs`, `revenue`, `unit-economics`, `feasibility`, `plan`): the page's question, lead, IB status and links, steps, cautions, definitions, the briefing it pairs with, and the fictional example it opens with (Refill Round), whose figures are worked by hand in `tests/unit/lab-models.test.ts` |
| `resources` | `data/resources.yaml` | A curated resource for the library: type, audiences, level, units and subtopics, the assessment component, `access` (a `download` with its file, format, size and pages; a `page`; or a `print` page), `contents` and `updated`. A download must exist, or the build fails |
| `studio` | `studio/<slug>.yaml` | A Strategy Studio tool (`type: tool`): its `kind`, `slug`, `stage` of the engagement, `purpose`, `howTo`, `limitations`, its IB `status` (an `ib-toolkit` tool names its `toolkit` entry and `level`; anything else is `enrichment`, with any `extensions` such as the TOWS matrix), the notes and guides to `read`, the worked `example` (the tool's state exactly as the tool saves it) and its recommended use (`inUse`). One entry is the `engagement` that frames the room: the fictional client, its question, facts, the four stages, principles, reading and Decision Rooms |

## Subtopic notes

`noteSchema` in `src/lib/schemas.ts`; rendered by `src/components/learn/NoteView.astro` on the subtopic's page. The model is `notes/stakeholders.yaml`.

| Field | What it holds |
| --- | --- |
| `code`, `title`, `level` | The subtopic, its title exactly as in the guide, and its level |
| `introduction` | Why the subtopic matters, in two or three paragraphs |
| `objectives` | What the reader can do afterwards, each starting with a command term at or below the statements' AO level |
| `sections` | Each with an `id`, `title`, `kind` (concept, types, theory, framework, method, application, evaluation), `level`, a `body`, and optionally `points` (term and explanation), a `diagram` from the library, a fictional `example`, `formulas`, `advantages` and `limitations`. HL-only material sits in HL sections or points, which the SL view hides |
| `evaluation` | How to weigh the ideas |
| `connections` | Other subtopics, each with the reason |
| `terms`, `questions` | Glossary ids and practice question ids |
| `retrieval` | Questions with short answers for the recall cards |
| `basis`, `verification`, `updated` | What the notes were written from (sources and pages), how far they were checked, and when |

Notes are written one subtopic at a time and only when complete. Formulas on the guide's formula list are given in its form; any other formula says it is a standard form the guide does not list. Every example is fictional and says so, and its arithmetic is checked before it is committed.

## Diagrams

The diagram library is code, not content: `src/lib/figures/unit1.ts` to `unit5.ts` and `toolkit.ts`, each diagram a function that draws SVG from data with the primitives in `src/lib/figures/kit.ts`, registered with its title, caption, subtopics, level and group in `src/lib/diagrams.ts`. A note's section names a diagram by id. To add one: write the drawing function, register it, put any numbers it computes into an exported function with a test in `tests/unit/figures.test.ts`, build, and run `npm run qa:diagrams` against a preview.

## Topic briefs

A topic has: `title`, `code` (such as `3.3`), `unit`, `level`, `summary`, `decisionQuestion`, `situation`, `whyItMatters`, a `syllabus` block (items with level and verification), `objectives`, at least four `sections`, a four-part `conceptLens`, optional pathway `lenses`, `teaching` notes, `revision` (key points, at least five retrieval questions, traps), `related` ids and `sources`.

Section kinds follow PROBLEM, CAUSE, STRATEGY, IMPLEMENTATION, EVALUATION in practice: `situation`, `learn`, `evidence`, `tools`, `decide`, `evaluate`, `assess`, `teach`.

### Blocks

| Type | Fields |
| --- | --- |
| `prose` | `body` |
| `definition` | `term`, `body`, `note` |
| `list` | `style` (bullets, numbered, pairs), `items` |
| `comparison` | `columns`, `rows` of `label` and `cells` |
| `mechanism` | `steps` (a chain of cause and effect), `conclusion` |
| `misconception` | `claim`, `correction`, `why` |
| `callout` | `tone` (note, exam, caution, enrichment, framework), `title`, `body` |
| `formula` | `name`, `expression`, `variables` |
| `worked` | `calculation` (an id), `inputs`, `currency`, `labels`, `interpretation`, `implication` |
| `interactive` | `component`, `ref` (an interaction id), `title`, `intro` |
| `exhibit` | `case`, `exhibit`, `commentary` |
| `example` | `body` |

Every block has `provenance`, `level` (default `SL/HL`; `HL` hides it for SL readers) and `sources`.

Markdown in YAML is deliberately small: paragraphs, `- ` lists, `1. ` lists, `**bold**`, `*italic*`, `` `code` `` and `[links](/path/)`. External links must be `https://` and are marked as external for screen readers.

## Cases

Fictional cases (`kind: fictional`, `dataStatus: simulated`) must label every exhibit `simulated-data`, and the `method` note must say how the figures were made. Exhibit tables declare `columns` (with `numeric` and `format`: plain, money, d1, d2) and `rows`; a `footer` marked `footerIsSum: true` is checked by the tests. `options` can be grouped (`group`) when a case has two decisions.

The `analysis` block follows DATA, INSIGHT, OPTIONS, RECOMMENDATION, then a CAVEAT: when the recommendation would change.

An exhibit may name its subtotal rows in `totals` (by their first cell); they are set in bold with a rule above, as in a set of accounts.

### The Case Vault fields

Every case in `/case-vault/` carries a classification, checked by `src/lib/integrity-cases.ts`. The fields are optional in the schema, so a case written without them still builds, but a case that carries any of them must carry all of them:

| Field | Values |
| --- | --- |
| `industry` | One of `INDUSTRIES` in `src/lib/schemas.ts` (labels in `src/lib/case-vault.ts`; add both for a new industry) |
| `functions` | `strategy`, `human-resources`, `finance`, `marketing`, `operations` |
| `difficulty` | `foundation`, `intermediate`, `advanced` |
| `qualifications` | `ib-dp-sl`, `ib-dp-hl`, `undergraduate`, `mba`. A case for SL is also for HL; a case for undergraduate or MBA readers needs at least three `discussion` prompts |
| `keyConcepts` | One or two of the four concepts, from the case's `concepts` |
| `caseType` | `fictional` (an invented organization with simulated data) or `sourced` (a real organization, from cited sources) |
| `syllabus` | The subtopic codes the case serves; every brief in `topics` must have its code here |

A case can also have the fuller structure, each part shown only when present: `industryContext` (paragraphs about the industry in general terms, with no figures at all, so that nothing reads as a statistic about a real market), `challenge`, `financials` (a summary and the exhibits shown under Financial information), `analysisQuestions` (original questions with a command term at the guide's AO level, marks, subtopics, HL marking, guidance and, for a calculation, the worked `answer`), `exercise` (role, brief, task, deliverable, minutes and criteria; it needs a `debrief`), `debrief` (a summary, every option judged as `strong`, `conditional` or `weak`, trade-offs, the evidence that matters, what would change the recommendation and common errors), `frameworks` (each linked to glossary terms, a toolkit tool and subtopics, and labelled `subject-knowledge`, `source-derived`, `aa-framework` or `enrichment`), `discussion` and `furtherReading` (platform pages by `href`, or supplied sources from the register by `source` with a `location`).

The model case files are `cases/bellbird-home-and-garden.yaml` (quantitative) and `cases/silvertree-clinics.yaml` (people). Every figure in a vault case is rebuilt by its model in `scripts/qa/case-figures.py`, which also fails on any figure in the case's text that the model cannot account for; add a model there for every new case, and recompute its key calculations with the platform's functions in `tests/unit/vault-cases.test.ts`.

## Decision Rooms

A decision has `metrics` (each `better: higher | lower | context`), a `baseline`, and one to three `rounds`. Each choice has an `outcome`: `headline`, `narrative`, `metrics`, `stakeholders` (with `mood`), `risks` and `theory`.

- The board pack shows the baseline with each committed outcome's metrics applied in order: a later round overrides only the metrics it reports.
- A later-round choice with `followsFrom` is offered only after that first-round choice; without it, it follows any first-round choice.
- `debrief`: trade-offs, the evidence that matters, what would change your mind, misconceptions, and the exam link.

## Boardroom scenarios

`scenarioSchema` in `src/lib/boardroom/schema.ts`; one file per scenario in `src/content/boardroom/`; checked by `src/lib/integrity-boardroom.ts` whenever a Boardroom page is built, and by `tests/unit/boardroom.test.ts`.

| Field | What it holds |
| --- | --- |
| `title`, `dek`, `question`, `challenge`, `order` | The scenario and the strategic question for the board; `challenge` is one of the five problem types |
| `company`, `currency`, `units`, `sustainability` | A fictional company, the money and the unit it sells (a bike, a loaf, a room night), and its sustainability measure where it has one |
| `syllabus`, `concepts`, `level`, `hlNote` | IB subtopic codes (each must exist in the curriculum) and the concepts it exercises |
| `background`, `context`, `challenges`, `stakeholders`, `market` | The brief: narrative, strategic context, management challenges, stakeholders with their views, the market and its fictional competitors |
| `model`, `start`, `history` | The engine's coefficients, the business at the start of the history, and the periods before the first decision, each a set of effects with a note. The board pack's statements, ratios and trends are generated from the history, so no exhibit figure is typed |
| `rounds` | Three or four rounds, each with a `period`, a `lead` role, a `situation`, optional `given` effects that apply whatever the board decides, the `question`, five `perspectives` and three `options`. An option has a `summary`, `effects` (the levers, described in words by the engine), optional `when` effects that depend on earlier choices, and an `outcome`: headline, `narrative`, stakeholder reactions and theory. Every round but the last has an `event` whose `variants` are tried in order; the first whose condition holds happens, and the last has no condition |
| `dashboard`, `roles` | The core measures, and for each of the five seats a brief, pinned measures (added to the dashboard) and goals (`final:`, `change:`, `min:`, `max:`, `sum:` or `avg:` a KPI) |
| `memo`, `walkthrough`, `debrief`, `method` | The memo's structured fields; the narrated path the casebook shows without JavaScript; the summary, theory, named paths with their lessons, misconceptions, exam link, original practice questions and glossary terms; how the figures were made |

Narratives, event texts, the brief and the first round may use tokens such as `{{netCash}}`, `{{morale.change}}` or `{{pbit.prev}}`, filled from the engine. Later rounds' situations and views cannot, because their figures depend on the path. Effects are applied in a fixed order (see `applyEffects` in `engine.ts`); flags set by options can be tested by later conditions, and each tested flag needs wording in `FLAG_WORDS` for the casebook. The integrity check runs every path: the identities must hold in every period, every event variant must be reachable and every option must make a difference. Claims a debrief makes about its named paths belong in the unit tests.

## Interactions

| `component` | Data |
| --- | --- |
| `cost-classifier` | `costObject`, `items` with `behaviour` and `directness` |
| `break-even-workspace` | `case`, `currency`, `labels`, `defaults`, `scenarios` (each changes some inputs) |
| `error-diagnosis` | `items` with `lines` and the `errorLine` |
| `special-order` | `defaults` (including the contribution of a displaced regular sale), `scenarios`, `hints`, `questions` |
| `ansoff-placer` | `items` with `answer` and `arguable` placements |
| `decision-tree-lab` | `options` with `cost` and `outcomes` (probability, payoff), `caution` |
| `force-field-builder` | `change`, `driving` and `restraining` forces with strengths 1 to 5, `caution` |
| `style-matcher` | `scenarios` with `strong` and `defensible` styles |
| `functions-sorter` | `items` with the function each belongs to |
| `scale-explorer` | The parameters of the scale model and `marks` on the curve |

Each interaction also has a `title`, a `purpose` (documented in [INTERACTIONS.md](INTERACTIONS.md)) and a `provenance`.

## Practice questions

A question's mark scheme may also be of kind `criteria`: assessment criteria by name and maximum mark, each with the platform's own self-check prompt. A paper 3 question marked this way must use the guide's criteria A to D with their names and maximum marks.

A question has `paperStyle`, `commandTerm` (which must exist in the command term list, and whose AO must match the question's `ao`), `ao`, `marks`, an optional `case` and `exhibits`, `prompt`, and a `markscheme` of kind `points` (marks must add up to the question's), `levels` (the top level must equal the marks) or `calculation` (must give an `answer`). `provenance` is always `original-practice`. The integrity check also rejects an HL question in the style of paper 1 (the guide excludes HL-only content from paper 1, p. 43) and a paper 3 question that is not HL.

## Calculations

Each calculation's `id` matches a builder in `workings` (`src/lib/finance.ts`). Its `example` gives inputs from a case (or, for expected value, an option from a decision tree interaction); the integrity check works every example and fails on an error. `page` is where the calculation lives; the Finance Desk, tool and topic pages anchor it as `#calc-<id>`.

## Pathways

`pathwaySchema` in `src/lib/schemas.ts`; rendered by `src/pages/pathways/[id].astro` with the components in `src/components/pathways/`. Each pathway keeps its own audience, `depth`, `terminology`, route and assessment; qualifications are never combined.

| Field | What it holds |
| --- | --- |
| `stageName`, `routeIntro`, `stages` | The route: each stage has a `title`, a `goal`, `items` (working pages, each with a `kind` and a `level`), key glossary `terms`, a `check` and, where tools are involved, a `caveat` (what they cannot tell you). Only the IB DP route names `syllabus` units; its stage `id` names the course time it takes (`toolkit`, `paper-1-research`, `internal-assessment`), and the page sums the guide's hours from the curriculum |
| `assessment` | How learning is checked, with its provenance: the IB's own assessment for the IB DP route, the platform's practice formats elsewhere |
| `leavesOut` | What the pathway leaves out on purpose, and why |
| `practice` | Short-answer and data-response tasks. A part with a `calculation` names finance functions and figures, so its answer is worked, never typed |
| `lessons` | Teachers: discussion prompts by subtopic for the lesson sequences that `src/lib/lessons.ts` builds from the notes |
| `reading` | Reading pointers, limited to the sources register |

`checkPathways` in `src/lib/integrity-pathways.ts` runs when the pathway pages build and in the unit tests: the secondary route uses SL material only and names no syllabus, a link is marked HL exactly when it leads to HL-only material, enrichment maps stay off the IB DP, secondary and teachers' routes, and every practice answer can be worked.

## Adding a topic brief

1. Read the subtopic's content statements in `curricula/ib-dp-bm.yaml` (and the guide page it gives), and write the brief's `syllabus` block from them, marking HL-only statements `level: HL`.
2. Write or extend a case in `cases/`, with simulated data that adds up. Add its figures to `tests/unit/cases.test.ts`.
3. Add any calculations to `data/calculations.yaml` with a function in `src/lib/finance.ts` and a worked example; add hand-checked tests to `tests/unit/finance.test.ts`.
4. Write the topic in `topics/<id>.yaml`, with a misconception, a concept lens, revision and teaching notes. Label every block's provenance.
5. Write practice questions in `questions/`, and glossary terms in `glossary/`.
6. Link the subtopic to the topic in the curriculum file (`topic: <id>`), and record any new claims about the course in `data/claims.yaml` with their sources.
7. Run `npm run qa`. The build fails on any broken reference; the content lint fails on dashes and placeholders.
