# Design system

The Business Brief 2.0 reads as a premium business publication: navy and ivory, a gold accent used sparingly, serif headlines, generous space, ruled sections and exact diagrams. It carries the identity of its creator, Arjun Agrawal, as one of the two platforms of the Arjun Agrawal Knowledge Series, and keeps its own character beside Arjun Agrawal Economics rather than copying it.

## Identity

### The AA monogram

The brand mark is the creator's AA monogram: a navy A and a gold A, with the gold A's crossbar sweeping through both. Its vector master is `public/brand/creator/arjun-agrawal-monogram.svg`, matched in shape, proportion and colour to the supplied logo. Its two paths live in `src/lib/brand.ts` and are never redrawn; only their fills change between surfaces, always to the brand's own pairs.

| Surface | First A | Second A |
| --- | --- | --- |
| Ivory or white | Navy `#0B1A33` | Gold `#B39350` |
| Navy (reversed) | Ivory `#F4EFE4` | Light gold `#C9A866` |

| Component | Use |
| --- | --- |
| `Monogram.astro` | The mark alone, at a given height, in either colour pair; decorative unless given a label |
| `BrandLockup.astro` | The monogram, a gold hairline and "Arjun Agrawal / The Business Brief" in Cinzel: the header, the footer, covers |
| `BrandIntro.astro` | The opening (below) |

Rules: keep the monogram's proportions (viewBox 350.8 by 268.4); give it clear space of at least a third of its height; never recolour it outside the two pairs, outline it, rotate it, add effects or set it on a busy image; never place another mark inside it.

### The opening

On a reader's first visit to the home page, the monogram draws itself on navy, the name and the tagline arrive, and the curtain lifts onto the page: about five seconds in all.

- Shown once per browser (`localStorage` key `bb:intro-seen`), never under `prefers-reduced-motion`, and replayed only on request (`/?intro`, linked as "Replay the opening" in the footer).
- Skippable at any moment: a Skip button that has focus, Escape, Enter or Space, or a click anywhere.
- The page underneath is `inert` while it plays, and is released when it ends, is skipped, or after six seconds whatever happens (a backstop if animation events are lost).
- A CSS-only failsafe: if the script never runs, the curtain lifts by itself.
- `tests/e2e/brand.spec.ts` tests all of this.

### Raster assets and templates

Rendered from the monogram's master by `npm run brand` (`scripts/brand/render-assets.mjs`):

| File | Use |
| --- | --- |
| `public/favicon.svg`, `favicon-32.png`, `favicon-48.png` | Browser tabs: the reversed monogram on a navy tile |
| `public/apple-touch-icon.png`, `public/brand/icon-192.png`, `icon-512.png` | Home screens and the web app manifest |
| `public/brand/icon-maskable-512.png` | Maskable icon, the mark inside the safe zone |
| `public/brand/social-card.png` | 1200 by 630 link preview: the lockup, the headline and the tagline |
| `public/brand/templates/resource-cover.svg` (with a preview PNG) | A4 cover for printed resources, with editable text |
| `public/brand/templates/document-header.svg`, `document-footer.svg` | A4-width strips for handouts |

Resource covers in the Resources Library are drawn per resource by `src/components/resources/ResourceCover.astro`, on navy for assessment guides and ivory for the rest, each with a motif for its type.

## Colour

Tokens are in `src/styles/tokens.css`. Brand hues are used as specified; where a hue does not reach WCAG AA as small text, a darker companion carries the text (the `-text` tokens) and the hue itself is kept for fills, rules and large marks.

| Token | Value | Role |
| --- | --- | --- |
| `--navy-900` (`--bb-ink`) | #0B1A33 | Headings, the navy bands, the footer, the monogram |
| `--navy-800`, `--navy-950` | #13264A, #071226 | Raised and deep navy surfaces |
| `--ivory-100` (`--surface-page`) | #F6F1E7 | The page |
| `--ivory-200` (`--surface-sunk`) | #ECE5D4 | Sunk bands |
| `--surface-sheet` | #FFFFFF | Sheets, figures, interaction frames |
| `--gold-500` (`--bb-brass`) | #B39350 | Rules, accents, the gold of the monogram |
| `--gold-400` | #C9A866 | Gold on navy; gold buttons |
| `--gold-600` | #8A6B2A | Large gold numerals and state outlines on ivory |
| `--brass-text` | #76591F | Gold-brown text and labels on light surfaces |
| `--charcoal` (`--text-body`) | #252D3A | Body text |
| `--slate-600` (`--text-muted`) | #566173 | Secondary text |
| `--bb-cobalt`, `--cobalt-text` | #2F55E4, #2448D0 | Links, focus, the learner's choice, total revenue |
| `--bb-signal`, `--signal-text` | #A8463F, #9E3F38 | Errors, losses, adverse variances |
| `--bb-green`, `--green-text` | #2F6F5E, #2B6A59 | Right answers, profit, favourable variances |

`npm run qa:contrast` (`scripts/qa/contrast.mjs`) checks every pair the interface uses, including the 2.0 additions. All pass for this release; for example navy on ivory 15.42, body text 12.31, muted text 5.56, gold-brown labels 5.80, navy on a gold button 8.26, gold on navy 7.67, and the large gold numerals 4.42 against the 3 they need. During QA, plain gold `#B39350` on ivory measured 2.59, so it is never used for text or for an outline that carries meaning, and a gold button on a navy band was found taking the band's ivory link colour (1.97); both were fixed.

Colour never carries meaning alone: every verdict, level, state and variance is also written in words.

## Type

| Family | Role | Token |
| --- | --- | --- |
| Source Serif 4 (optical sizes) | Headlines, section titles, case narrative, figure titles | `--font-display`, `--font-serif` |
| Inter | Body text, interface, labels, numbers | `--font-body`, `--font-ui` |
| Cinzel | The brand lockup only | `--font-brand` |

All three are under the SIL Open Font Licence and self-hosted from `public/fonts/` with their licences. Headlines use a gold italic accent once per heading at most ("Think *strategically.*"). Labels are Inter, uppercase and letter-spaced. Figures in tables and workings use tabular numbers.

## Space, layout and shape

- Tokens `--sp-1` to `--sp-10`; page width 80 rem; reading column 42 rem; a fluid gutter from 16 px.
- Corners 0 to 4 px; pills only for chips and filters.
- Rules do the structural work: a navy rule with a short gold lead opens each numbered section; hairlines separate rows.
- Navy bands carry the moments that matter (the three chains of reasoning, the Assessment Centre, the footer); ivory and white carry reading.
- Soft sheet shadows for figures and covers; no glows, no glass, no parallax.

## Components added in 2.0

| Component | Where | Notes |
| --- | --- | --- |
| Section head | Every long page | Italic gold number, serif title, a dek; the number is decorative and hidden from screen readers |
| Hero blueprint | Home | The creator's portrait framed by faint business diagrams drawn exactly (a break-even crossing, a tree, a matrix) |
| Subtopic page | `/topics/<subtopic>/` | What the course asks (statements with AO levels and HL tags), notes, the mindmap, diagrams, key terms, tools, recall and connections |
| Notes (`NoteView.astro`) | Subtopic pages | Why it matters with objectives; numbered sections with points, worked fictional examples, formulas, advantages and limitations, diagrams; HL sections marked and hidden in the SL view |
| Mindmap (`MindmapView.astro`) | `/mindmaps/`, subtopic pages | See below |
| Diagram (`Diagram.astro`) | Notes, briefs, `/diagrams/` | See below |
| Glossary entry | `/glossary/<term>/` | The syllabus meaning, the everyday meaning where it differs, formula, example, related terms, subtopics |
| Guidance labels | Assessment Centre | Four kinds of statement, each labelled: IB requirement, examiner emphasis, recommended strategy, illustrative example |
| Resource card and cover | `/resources/` | Cover, type, level, format, size and pages for downloads |
| Coverage state | `/ib/coverage/`, home | Complete (navy), partly built (gold outline), planned (dashed), with verification beside it |

## Mindmaps

Drawn by `src/lib/mindmap.ts`, the same code on the server and in the browser. A bilateral tidy tree around the subtopic: branches alternate left and right, each node sits on a line in its branch's colour, and the branch kind sets the colour everywhere.

| Branch kind | Colour |
| --- | --- |
| Concept | #1E355F |
| Types | #2E6B8F |
| Theory | #6A4C93 |
| Tool | #8A6B2A |
| Calculation | #2F6F5E |
| Application | #A4552A |
| Evaluation | #A8463F |
| Connection | #5B6678 |

Readers can fold a branch, switch between the full map and a revision view of the core nodes, zoom with the buttons, the keyboard or Ctrl and the wheel (a plain wheel scrolls the page: there is no scroll hijacking), pan by dragging, print the whole map, and download a branded SVG or PNG with the fonts embedded. On a phone the map opens folded to its branches. An outline of the same content follows every map for screen readers and for reading. On maps of HL-only subtopics the nodes carry no HL tag; the map's own level says it.

## Diagrams

79 original diagrams in `src/lib/figures/`, drawn from data with the primitives in `src/lib/figures/kit.ts`: models, processes, structures and charts for all five units and the toolkit.

- One visual language: navy for structure, gold for the accent and for "the business", cobalt for revenue and the reader's focus, green for gains, red for losses, washes for areas; Inter labels, Source Serif titles.
- Every chart's numbers are computed in code from stated, fictional assumptions, and the unit tests pin them to values worked by hand; the figure says it is fictional.
- Every diagram has a `<title>` and a full `<desc>`; the page shows the same text under "Text description".
- On narrow screens a diagram keeps a readable size (34 rem minimum) and scrolls sideways in its own focusable region.
- Each downloads as a standalone SVG with a white ground and a credit line (`/downloads/diagrams/<id>.svg`).
- A checking script (used in QA) screenshots every diagram and fails on any label that leaves its frame or overlaps another label.

## Charts in the tools

Interactive charts (break-even, cash flow, plans) are drawn by `src/lib/charts.ts` and the modules beside it: total revenue cobalt, total cost navy, fixed costs dashed; profit and loss areas tinted and labelled in words; every chart has a title and a description stating its result, and its figures in a table beside it.

## Motion

One restrained language in `src/styles/motion.css` and `src/scripts/motion.ts`, tokens in `tokens.css` (`--dur-fast` 120 ms to `--dur-reveal` 460 ms, a 55 ms stagger, a 10 px rise). Motion explains a change; it never decorates, loops or holds up reading.

| Pattern | Where |
| --- | --- |
| The opening | First visit to the home page (above) |
| Page to page | Native cross-document view transitions; the header holds still |
| Scroll reveal | Sections that start below the fold; nothing on screen at load is ever hidden |
| Arrival | Feedback, answers, outcomes, new rows |
| Lift | Cards and covers you can pick up |
| Chart easing | The tools' charts move from the old figures to the new |

Everything is off under `prefers-reduced-motion`, including the opening and the page transitions. `tests/e2e/motion.spec.ts` and `brand.spec.ts` test the rules.

## Icons

An original set in `src/lib/icons.ts` on a 24 by 24 grid with a 1.75 stroke, one per room and a few for the interface, rendered by `src/components/ui/Icon.astro`; decorative unless labelled, and always beside words that say the same.

## Print

`src/styles/print.css` removes the header, footer and screen-only controls, keeps exhibits, tables, workings and figures unbroken, and adds an attribution line with the page address. `src/scripts/print.ts` opens every disclosure before printing and closes them after. The formula sheet and the revision briefs are designed for A4.
