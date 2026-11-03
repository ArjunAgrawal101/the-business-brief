# Accessibility

**Target:** WCAG 2.2 at level AA, on every page, at every width down to 320 pixels, with or without JavaScript.

## How the target is met

| Area | What the platform does |
| --- | --- |
| Structure | One `h1` per page, headings in order, landmarks (`header`, `nav`, `main`, `footer`), a skip link to the main content, `lang="en-GB"` |
| Keyboard | Every control is a native link, button, input or radio; nothing needs a mouse; focus is always visible (a 3 px cobalt ring, brass on ink); the menu closes with Escape and returns focus; after committing a Decision Room choice, focus moves to its consequence |
| Forms | Every input has a label; hints and errors are tied to the input with `aria-describedby`; invalid inputs are marked `aria-invalid` and the error says what to do |
| Feedback | Results that change are announced through polite live regions; verdicts are words (Right, Arguable, Not this one), never colour alone |
| Colour | Text meets 4.5 to 1 and outlines 3 to 1, checked from the tokens by `npm run qa:contrast` |
| Charts | Inline SVG with `role="img"`, a title and a description that states the result; the figures in a table beside every chart; chart regions scroll on narrow screens and can be focused |
| Tables | Header cells with `scope`; wide tables scroll inside a labelled, focusable region |
| Targets | Main buttons, inputs and options are at least 44 px tall and small buttons 36 px; every target meets the WCAG 2.2 minimum of 24 px, including dense link lists |
| Motion | Restrained and functional: page transitions, arrivals, reveals and chart updates of at most half a second, none of which loop or delay reading. Under reduced motion all of it stops, page transitions included, and nothing is held back. Reveals never hide content that is on screen at load, or anything at all without the script that reveals it |
| Without JavaScript | Every page is complete; answers sit in disclosures; Decision Room choices show what happens; every case lab stage is open; search lists every entry; no page shows a button that needs a script |
| SL and HL | Hidden HL material always leaves a visible notice; the choice is announced. Pages for HL-only subtopics stay whole in the SL view, with one notice that the page is HL only |
| The opening | Plays on every fresh entry, never between the site's own pages. It is decoration: the layer is `aria-hidden`, the page is never `inert`, and screen readers read the page at once. Any key, click, tap or scroll ends it; Tab lands on Skip to content; a visible Skip intro button sits outside the hidden layer. Under reduced motion it is a still card that fades in about 1.2 seconds; CSS ends it on time if scripts fail |
| Mindmaps | A labelled group with every action on a button (views, fold, zoom, fit, print, downloads); arrow keys pan, + and − zoom, 0 fits; the wheel zooms only with Ctrl or Cmd, so it never traps scrolling; changes are announced; every map is followed by the same content as an outline |
| Diagrams | A title and a full description inside every SVG, the same description visible under "Text description", and a focusable, labelled region that scrolls sideways on narrow screens |
| Tables in the Assessment Centre | Scroll inside labelled, focusable regions; long selects never widen the page |

## Test results for this release (2.0.0, 2 November 2026)

| Check | Tool | Result |
| --- | --- | --- |
| Automated scan of 183 pages (every page of every kind; a fixed sample of the 558 glossary term pages, which share one template) at desktop (1280 px) and phone (Pixel 7) sizes, WCAG 2.0, 2.1 and 2.2 A and AA rules | axe-core 4.11 with Playwright | No violations: 183 pages at both sizes, 366 scans |
| Horizontal scrolling at phone width, the same pages | Playwright | None |
| Colour contrast of 34 token pairs, including the navy, ivory and gold identity | `npm run qa:contrast` | All pass |
| The opening: every fresh entry, no replay between pages, Tab to Skip to content, Escape, click, reload, reduced motion, axe while it plays | Playwright | Pass |
| Skip link, menu keyboard behaviour, focus after decisions, SL and HL switch | Playwright | Pass |
| Interactions without JavaScript, and no page showing a button that needs a script | Playwright with JavaScript disabled | Pass |
| Motion rules | Playwright, with and without reduced motion | Pass |

Problems found and fixed during 2.0 QA:

- Interactive mindmaps had `role="img"` while holding links and toggles; they are now labelled groups.
- A gold button on a navy band measured 1.97 to 1, because the band's ivory link colour overrode its navy text; the button keeps navy text (8.26 to 1).
- Large gold numerals and the "partly built" outlines used plain gold, 2.59 to 1 on ivory; a darker gold (4.42 to 1) replaces it there.
- Muted text on the navy brief panel measured 2.77 to 1; it now uses the ivory-muted token.
- Two controls that need scripts (the mindmap level filter and the formula sheet's print button) showed without JavaScript; they are hidden until scripts run.
- Three Assessment Centre pages scrolled sideways on phones (by 52 to 157 px); their tables now scroll inside labelled regions and long selects shrink.
- HL points and statements stayed visible in the SL view; the SL rule now wins, and hidden material leaves a notice.

## Known gaps

- **No testing with assistive technology users.** Automated tools find only part of the problems. Testing with people who use screen readers (NVDA, JAWS, VoiceOver, TalkBack), screen magnification and switch access is needed before a public launch.
- **Only Chromium was tested.** Firefox and Safari (WebKit) were not available in the build environment.
- **No real devices.** Phone sizes were emulated.
- **Charts and diagrams on phones scroll sideways inside their region** rather than reflowing. The data table under each chart, and the text description under each diagram, are the accessible alternatives.
- The break-even chart's labels can sit close together at unusual inputs; the table and text description always carry the figures.

## Reporting a problem

See the Accessibility page on the site (`/accessibility/`).
