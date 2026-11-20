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
| `CinematicIntro.astro` | The opening (below) |

Rules: keep the monogram's proportions (viewBox 350.8 by 268.4); give it clear space of at least a third of its height; never recolour it outside the two pairs, outline it, rotate it, add effects or set it on a busy image; never place another mark inside it.

### The opening

A cinematic sequence of about 2.75 seconds (`src/components/brand/CinematicIntro.astro`), in four movements. It was drawn as a five-second sequence; since 20 November 2026 every time in it is multiplied by one factor, `--cx-k` (0.55), in the styles and the script alike, so the movements keep their proportions:

| Drawn time | Played at | Movement |
| --- | --- | --- |
| 0.0 to 1.0 s | 0 to 0.55 s | The room: deep navy, ambient light, gold dust, and an architecture (a floor in one-point perspective, columns, a horizon) drawing itself |
| 1.0 to 2.1 s | 0.55 to 1.15 s | The business world: an organization chart, a market line with candles, a globe of trade routes and a decision tree choosing its path |
| 2.0 to 3.5 s | 1.1 to 1.9 s | The identity: the AA monogram rises from the creator's vector master with a sheen, the name and rule open, then The Business Brief and Strategy. Leadership. Decisions. |
| 3.5 to 5.0 s | 1.9 to 2.75 s | The convergence: the world is drawn in, the monogram flies to its place in the header and takes the header's colours, the curtain dissolves |

**When it plays** (`src/lib/intro.ts`, decided in the head before the first paint, and unit-tested as the same source text):
- when the home page is freshly opened: a new tab or window, a link from another site, a bookmark or a typed address;
- never on any other page (a reader arriving at a topic from a search result goes straight to it), on a reload, between the site's own pages, on Back or Forward, or under automation (`navigator.webdriver`), unless `?intro` asks for it ("Replay the opening" in the footer);
- nothing about earlier visits is stored or read.

**How it behaves:**
- Under reduced motion it is a still title card that fades after about 1.2 seconds, with no movement (its timing is not scaled).
- It is decoration: the layer is `aria-hidden`, the page beneath is never `inert`, and screen readers read the page at once.
- Any key, click, tap or scroll ends it; Tab lands on Skip to content. A visible Skip intro button and a progress line sit outside the hidden layer.
- In a background tab it waits until the tab is shown.
- If its script fails, CSS ends it on time, and the head script releases the page if the layer never mounts.
- Inline SVG and CSS only, about 25 KB before compression, cloned from a `<template>` only when it plays.
- `tests/e2e/brand.spec.ts` tests every rule, with axe-core while it plays.

### Navigation

Six groups, Learn, Practise, Tools, Assess, Advance and Connect, from one list (`src/lib/navigation.ts`) that drives the header, the phone drawer, the footer, search and the home page's floor plan. A link is listed only when its page exists. Learn holds the course (topics, concepts, glossary, mindmaps, diagrams, frameworks, toolkit, revision); Advance holds everything beyond the IB course; Connect holds the tutorials, the creator and the reader's own dashboard.
- **Wide screens:** each group is a mega panel with its links, a line on each, and a feature on navy: course coverage, a case lab to start with, the formula sheet, the creator's guides, the Advanced Management hub, or one-to-one tutoring with its terms.
- **The Tutorials button:** a gold button beside Search, on every screen wider than 36rem, marked as current on the tutorials page; on phones it is the first link in the drawer instead. Between 64rem and 82rem the triggers tighten and the search label hides, so six groups and both buttons fit on one line from 1024 pixels.
- **Below 64rem:** the groups move into a full-height drawer, with the current group open.
- Every menu is a native disclosure (`details` and `summary`), so it works without JavaScript. The script adds one open at a time, Escape with focus returned, and closing when focus or a click leaves.

### Room identities

Each learning environment sets `room` on BaseLayout (`data-room` on the body). It keeps the palette and adds an accent, an AA-safe text shade of it and a drawing for its subject (`src/styles/rooms.css`, generated by `scripts/brand/rooms-css.py`; the contrast check reads every room's text colour).

| Room | Accent | Drawing |
| --- | --- | --- |
| Finance | deep green | a spreadsheet grid and a market line |
| Strategy | muted blue | a matrix of options and the path between them |
| Market | plum | a positioning map with a target segment |
| People | umber | an organization of connected people |
| Operations | steel blue | a process line and a conveyor |
| Enterprise | amber | a blueprint and a canvas |
| Boardroom | gold | the table and the trend on it |
| Cases | oxblood | an editorial page of columns |
| Assessment | deep blue | a ruled answer page |
| Advanced | deep claret | a lecture theatre's tiers |
| Tutorials | antique gold | a desk with an open book |

The accent marks the header's hairline, the page intro's kicker and the section heads; the drawing sits beside the intro on wide screens and gives way to the colour on narrow ones.

### The home page

The front door of the ecosystem (`src/pages/index.astro`, with `src/components/home/*`):
- **The hero**, with five ways in.
- **The ecosystem as the floor plan of an institution:** five wings around the atrium of The Business Brief, read from the navigation list.
- **The weekly briefing**, rotating by the reader's ISO week: the Case Vault's Case of the Week, a decision, a financial challenge worked by the finance functions, a management insight and a framework.
- **The three chains of reasoning** and **the course unit by unit**.
- **A working break-even preview.**
- **The libraries, learning objectives and pathways.**
- **The Assessment Centre**, **the latest additions**, **the creator** and **a closing invitation.**

### The Business Intelligence Briefing

The briefing (`src/pages/intelligence/`, styled by `src/styles/intelligence.css`) reads as an edition of a serious business publication:
- **The masthead:** the title with its gold italic accent, an issue line (the edition's date, the number of items, themes and regions), the standfirst, a stamp of the curation and check dates and the document count, and a notice that the briefing is curated, not live.
- **The front page:** the lead story on navy with its headline figures, then the rest of the edition in ruled columns, each story with its themes, development date, standfirst, organizations, region and industry, and the dates it was published and checked.
- **The themes:** twelve sections in a ruled grid, each with its count, a line on what it covers and its newest headlines, each linking to a page of its own.
- **An item:** the six questions as numbered section heads; the sourced facts first, labelled External evidence, then a gold-ruled mark where the analysis begins; the course and what lies beyond it in separate groups, the second on white with a green rule and the Enrichment tag; a side rail with the item's dates, region, industry, themes and contents.

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
| `--bb-cobalt`, `--cobalt-text` | #3A6797, #2D5B8C | The muted blue of interaction: links, focus, the learner's choice, total revenue. Until 20 November 2026 an electric cobalt (#2F55E4, #2448D0); the 2.0 brief asked for a muted blue. `--cobalt-text` measures 6.25 on ivory and 7.03 on white; `--cobalt-on-ink` (#A9BFDC) 9.24 on navy |
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

All three are under the SIL Open Font Licence and self-hosted from `public/fonts/` with their licences. Gold stays out of headings: emphasis in a heading is italic in the heading's own colour, and gold is kept for rules, the monogram and one emphasis at most on a screen. Labels are Inter, uppercase and letter-spaced, at least 12 px (`--fs-label`, 0.75rem), as are chips (`.tag`). No text that carries information is set below 12 px. Figures in tables and workings use tabular numbers.

## Space, layout and shape

- Tokens `--sp-1` to `--sp-10`; page width 80 rem; reading column 42 rem; a fluid gutter from 16 px.
- Corners 0 to 4 px, buttons included (`.btn` has 2 px corners and no shadow); pills only for filters.
- Section numerals (`SectionHead`) are slate italic, not gold, and on phones sit above the heading so headings and deks use the full width.
- A plain list spaces its items; a list with a class or `role="list"` is laid out by its component (often as a row), so the global spacing does not misalign it.
- Rules do the structural work: a navy rule with a short gold lead opens each numbered section; hairlines separate rows.
- Navy bands carry the moments that matter (the three chains of reasoning, the Assessment Centre, the footer); ivory and white carry reading. Navy bands and menu panels are flat colour: no gradients.
- The header is opaque, so nothing ghosts through it on scroll.
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

- One visual language: navy for structure, gold for the accent and for "the business", muted blue for revenue and the reader's focus, green for gains, red for losses, washes for areas; Inter labels, Source Serif titles.
- Every chart's numbers are computed in code from stated, fictional assumptions, and the unit tests pin them to values worked by hand; the figure says it is fictional.
- Every diagram has a `<title>` and a full `<desc>`; the page shows the same text under "Text description".
- On narrow screens a diagram keeps a readable size (34 rem minimum) and scrolls sideways in its own focusable region.
- Each downloads as a standalone SVG with a white ground and a credit line (`/downloads/diagrams/<id>.svg`).
- A checking script (used in QA) screenshots every diagram and fails on any label that leaves its frame or overlaps another label.

## Charts in the tools

Interactive charts (break-even, cash flow, plans) are drawn by `src/lib/charts.ts` and the modules beside it: total revenue muted blue, total cost navy, fixed costs dashed; profit and loss areas tinted and labelled in words; every chart has a title and a description stating its result, and its figures in a table beside it.

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
