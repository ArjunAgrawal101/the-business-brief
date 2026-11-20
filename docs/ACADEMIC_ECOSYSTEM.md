# The Arjun Agrawal Academic Ecosystem

The Business Brief is one of three independent platforms from the same educator. The three share one academic
identity, Arjun Agrawal: Knowledge. Insight. Impact., and each keeps its own repository, address and design.
This change links the other two from The Business Brief. It is limited to that integration; nothing else on the site
was restructured.

| Platform | Line (the owner's) | Address |
| --- | --- | --- |
| Economics | IB Economics \| Economic Analysis \| Academic Resources | https://ib-economics-pi.vercel.app/ |
| The Business Brief (this platform) | IB Business Management \| Strategy \| Leadership \| Decisions | https://the-business-brief-dun.vercel.app/ |
| Political Studies & Global Affairs | Indian Polity \| International Relations \| PSIR \| IB Global Politics | https://arjun-agrawal-political-studies.vercel.app/ |

The list lives in one file, `src/lib/ecosystem.ts`, and every place below reads from it.

## Where the links are

- **Main navigation.** `src/components/layout/SiteHeader.astro` has a seventh menu after the six groups,
  **Academic Ecosystem**, with the three platforms in their own colours. This one is marked "You are here"; the other
  two open in a new tab.
  - Between 64rem and 82rem the menu's label reads "Ecosystem". "Academic" is still present for screen readers, so the
    accessible name stays "Academic Ecosystem".
  - The Connect group's feature panel links to both sister platforms.
- **Mobile menu.** The drawer has an Academic Ecosystem section after the groups, listing the three platforms.
- **Home.** `src/components/home/AcademicEcosystem.astro` is section 13, **Explore the Arjun Agrawal Academic
  Ecosystem**. It follows About the creator and has three visually distinct panels:
  - Economics on charcoal and gold;
  - The Business Brief on its own paper and navy, ringed in gold as the current platform;
  - Political Studies & Global Affairs on midnight with a burgundy rule.

  The creator section now names the three platforms.
- **Footer, on every page.** `src/components/layout/SiteFooter.astro`: the series block is now "The Arjun Agrawal
  Academic Ecosystem". It lists the three platforms with their lines and marks this one as current.
- **About.** Section 08 is now "Three platforms, one standard" and has three cards. The facts and the journey say
  "three learning platforms".

Every link to a sister platform opens in a new tab, says so to screen readers, and carries
`rel="noopener noreferrer"`.

## Tests

- `tests/e2e/navigation.spec.ts`: the header-fit test now expects the six groups plus the Academic Ecosystem menu. It
  still requires the header to fit without overflow at 1024 px.
- The ecosystem menu's current-platform link carries no `aria-current`, which marks only the current section in the
  navigation. "You are here" says it in words instead.
