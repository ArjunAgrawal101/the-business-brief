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
| SL and HL | Hidden HL material always leaves a visible notice; the choice is announced |

## Test results for this release (29 October 2026)

| Check | Tool | Result |
| --- | --- | --- |
| Automated scan of all 54 pages at desktop (1280 px) and phone (Pixel 7) sizes, WCAG 2.0, 2.1 and 2.2 A and AA rules | axe-core 4.11 with Playwright | 0 violations on 108 page scans |
| Horizontal scrolling at phone width, every page | Playwright | None |
| Horizontal scrolling at 1440, 1024, 768 and 390 px, eight key pages | `npm run qa:screens` | None |
| Colour contrast of 23 token pairs | `npm run qa:contrast` | All pass |
| Skip link, menu keyboard behaviour, focus after decisions, SL and HL switch | Playwright | Pass |
| Interactions without JavaScript | Playwright with JavaScript disabled, including a check of every page for buttons that cannot work | Pass |
| Motion rules | Playwright, with and without reduced motion | Pass |

Problems found and fixed during QA:

- Muted text on the sunk band was 4.43 to 1. The token was darkened to #5A6670 (4.77 to 1).
- Six pages scrolled sideways on phones, because grid items and fieldsets kept the width of a wide table or chart. Blocks inside `main` may now shrink, and wide content scrolls inside its own region.
- Links in the coverage table were closer than the WCAG 2.2 target size allows. Their targets are now at least 24 px tall.

## Known gaps

- **No testing with assistive technology users.** Automated tools find only part of the problems. Testing with people who use screen readers (NVDA, JAWS, VoiceOver, TalkBack), screen magnification and switch access is needed before a public launch.
- **Only Chromium was tested.** Firefox and Safari (WebKit) were not available in the build environment.
- **No real devices.** Phone sizes were emulated.
- **Charts on phones scroll sideways inside their region** rather than reflowing. The data table under each chart is the accessible alternative.
- The break-even chart's labels can sit close together at unusual inputs; the table and text description always carry the figures.

## Reporting a problem

See the Accessibility page on the site (`/accessibility/`).
