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
| Reflow | At 320 CSS pixels wide no page scrolls sideways: tags wrap inside their outline, a word too long for the line breaks (and subtopic titles may break after a slash), and wide tables, charts and diagrams scroll inside their own positioned region, so text kept for screen readers inside them cannot widen the page |
| Navigation | Five groups as disclosure panels on wide screens (one open at a time, Escape closes and returns focus) and a drawer below 64rem with the same groups, opening on the current one; the page behind the open drawer holds still |
| Motion | Restrained and functional: page transitions, arrivals, reveals and chart updates of at most half a second, none of which loop or delay reading. Under reduced motion all of it stops, page transitions included, and nothing is held back. Reveals never hide content that is on screen at load, or anything at all without the script that reveals it |
| Without JavaScript | Every page is complete; answers sit in disclosures; Decision Room choices show what happens; every case lab stage is open; search lists every entry; no page shows a button that needs a script |
| SL and HL | Hidden HL material always leaves a visible notice; the choice is announced. Pages for HL-only subtopics stay whole in the SL view, with one notice that the page is HL only |
| The opening | Plays on every fresh entry, never between the site's own pages. It is decoration: the layer is `aria-hidden`, the page is never `inert`, and screen readers read the page at once. Any key, click, tap or scroll ends it; Tab lands on Skip to content; a visible Skip intro button sits outside the hidden layer. Under reduced motion it is a still title card for about 1.6 seconds; CSS ends it on time if scripts fail |
| Mindmaps | A labelled group with every action on a button (views, fold, zoom, fit, print, downloads); arrow keys pan, + and − zoom, 0 fits; the wheel zooms only with Ctrl or Cmd, so it never traps scrolling; changes are announced; every map is followed by the same content as an outline |
| Diagrams | A title and a full description inside every SVG, the same description visible under "Text description", and a focusable, labelled region that scrolls sideways on narrow screens |
| Tables in the Assessment Centre | Scroll inside labelled, focusable regions; long selects never widen the page |

## Test results for this release (2.1.0, 3 November 2026)

| Check | Tool | Result |
| --- | --- | --- |
| Automated scan of 333 pages at desktop (1280 px) and phone (Pixel 7) sizes, against the WCAG 2.0, 2.1 and 2.2 A and AA rules. This covers every page of every kind, plus a fixed sample of 29 of the 701 glossary term pages, which share one template | axe-core 4.11 with Playwright | No violations: 333 pages at both sizes, 666 scans |
| Horizontal scrolling at phone width (412 px), the same pages | Playwright | None |
| Reflow at 320 px | A scan of all 974 pages that are not redirects; `reflow.spec.ts` on the 333 above | None scroll sideways |
| Colour contrast of 52 token pairs, including each room's accent text | `npm run qa:contrast` | All pass |
| The opening, tested on: every fresh entry; no replay between pages; Skip intro; Tab to Skip to content; Escape and click; reload; the settling of the monogram; reduced motion; a page readable to assistive technology while it plays | Playwright | Pass |
| The navigation: the panels and the drawer, one group at a time, Escape returning focus, the current section marked | Playwright | Pass |
| The newest tools used from the keyboard and pointer, with errors tied to their fields and work kept | Playwright | Pass |
| Interactions without JavaScript, and no page showing a button that needs a script | Playwright with JavaScript disabled | Pass |
| Motion rules, page transitions included, with and without reduced motion | Playwright | Pass |

Problems found and fixed during 2.1 QA:

- **Reflow.** At 320 px, dozens of pages scrolled sideways. Tags could not wrap; a long word in the 2.7 heading could not break; and text kept for screen readers inside a wide table, which is absolutely positioned, escaped the table's scroll region. Tags now wrap, long words break (and titles break after a slash), and every scroll region is positioned.
- **The phone drawer was invisible.** The header's frosted ground created a containing block for the fixed drawer, so the frost moved to a pseudo-element.
- **Pathway numbers.** Small gold pathway numbers failed contrast on ivory; they use the darker brass text colour.
- **Page transitions.** They were skipped with an error on most navigations. That was not an accessibility fault, but it is now fixed, and none run under reduced motion.

## Known gaps

- **No testing with assistive technology users.** Automated tools find only part of the problems. Testing with people who use screen readers (NVDA, JAWS, VoiceOver, TalkBack), screen magnification and switch access is needed before a public launch.
- **Only Chromium was tested.** Firefox and Safari (WebKit) were not available in the build environment.
- **No real devices.** Phone sizes were emulated.
- **Charts and diagrams on phones scroll sideways inside their region** rather than reflowing. The data table under each chart, and the text description under each diagram, are the accessible alternatives.
- The break-even chart's labels can sit close together at unusual inputs; the table and text description always carry the figures.

## Reporting a problem

See the Accessibility page on the site (`/accessibility/`).
