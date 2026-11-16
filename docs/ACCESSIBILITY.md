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
| Navigation | Six groups as disclosure panels on wide screens (one open at a time, Escape closes and returns focus) and a drawer below 64rem with the same groups, opening on the current one; the page behind the open drawer holds still. The Tutorials button is a plain link, marked as current on its page, and the first link in the drawer on phones |
| Motion | Restrained and functional: page transitions, arrivals, reveals and chart updates of at most half a second, none of which loop or delay reading. Under reduced motion all of it stops, page transitions included, and nothing is held back. Reveals never hide content that is on screen at load, or anything at all without the script that reveals it |
| Without JavaScript | Every page is complete; answers sit in disclosures; Decision Room choices show what happens; every case lab stage is open; search lists every entry; no page shows a button that needs a script |
| SL and HL | Hidden HL material always leaves a visible notice; the choice is announced. Pages for HL-only subtopics stay whole in the SL view, with one notice that the page is HL only |
| The opening | Plays on every fresh entry, never between the site's own pages. It is decoration: the layer is `aria-hidden`, the page is never `inert`, and screen readers read the page at once. Any key, click, tap or scroll ends it; Tab lands on Skip to content; a visible Skip intro button sits outside the hidden layer. Under reduced motion it is a still title card for about 1.6 seconds; CSS ends it on time if scripts fail |
| Mindmaps | A labelled group with every action on a button (views, fold, zoom, fit, print, downloads); arrow keys pan, + and − zoom, 0 fits; the wheel zooms only with Ctrl or Cmd, so it never traps scrolling; changes are announced; every map is followed by the same content as an outline |
| Diagrams | A title and a full description inside every SVG, the same description visible under "Text description", and a focusable, labelled region that scrolls sideways on narrow screens |
| Editions | The Boardroom Briefings' Student and Analysis editions are a radio group; the change is announced, the choice is kept in the address, a link into the other edition opens it first, and without JavaScript the Analysis edition is a closed disclosure after the Student edition |
| Simulations and tools | The executive simulation, the Framework Lab worksheets, the advanced finance tools and the enquiry builder use native inputs with labels; errors name the field and move focus to it; results and saved states are announced in polite live regions; each works as a complete worked example or casebook without JavaScript |
| My Business Workspace | Items move up and down with buttons, never by dragging; the note dialog is a native dialog that returns focus to the button that opened it, however it closes; deleting asks first; storage that is blocked is explained rather than failing silently |
| Tables in the Assessment Centre | Scroll inside labelled, focusable regions; long selects never widen the page |

## Test results for this release (2.2.0, 16 November 2026)

{{A11Y}}

## Known gaps

- **No testing with assistive technology users.** Automated tools find only part of the problems. Testing with people who use screen readers (NVDA, JAWS, VoiceOver, TalkBack), screen magnification and switch access is needed before a public launch.
- **Only Chromium was tested.** Firefox and Safari (WebKit) were not available in the build environment.
- **No real devices.** Phone sizes were emulated.
- **Charts and diagrams on phones scroll sideways inside their region** rather than reflowing. The data table under each chart, and the text description under each diagram, are the accessible alternatives.
- The break-even chart's labels can sit close together at unusual inputs; the table and text description always carry the figures.

## Reporting a problem

See the Accessibility page on the site (`/accessibility/`).
