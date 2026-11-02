# Creator assets: Arjun Agrawal

These files are the creator's authentic brand assets. They were copied **unchanged** from the Economics repository, `ArjunAgrawal101/ib-economics`, folder `assets/brand/`, at commit `5d423ff` (22 October 2026). They are not generated, redrawn or recoloured here.

| File | Source file | Use on The Business Brief |
|---|---|---|
| `arjun-agrawal-monogram.svg` | `monogram.svg` | The brand mark on light surfaces: header lockup, footer, About page, resource covers, mindmap and diagram downloads |
| `arjun-agrawal-monogram-reversed.svg` | `monogram-reversed.svg` | The brand mark on navy surfaces, the opening, the favicon and app icons |
| `arjun-agrawal-logo.svg` | `logo.svg` | Full logo with "Knowledge. Insight. Impact.", in the footer and on documents |
| `arjun-agrawal-logo-reversed.svg` | `logo-reversed.svg` | The same, for dark surfaces |
| `arjun-agrawal-monogram.png`, `arjun-agrawal-monogram-reversed.png` | same names | Raster fallbacks for documents |
| `arjun-agrawal-portrait-4x5.webp` | same name | The creator profile photograph (432 by 540) |

The source SVGs record their own origin in a comment: the monogram was traced from the supplied artwork; the wordmark is set in Cinzel (SIL Open Font Licence) and converted to outlines.

**How the identity works in 2.0.** The Business Brief is one of the two platforms of the Arjun Agrawal Knowledge Series, so it carries the creator's identity: the AA monogram beside "Arjun Agrawal | The Business Brief" set in Cinzel. The monogram's paths are used unchanged (`src/lib/brand.ts` holds them, read from these files); only its two fills change between light and navy surfaces, using the brand's own colours. The favicon, app icons and social card are rendered from the monogram by `scripts/brand/render-assets.mjs`. The platform's earlier mark (a folded brief with a decision node) was retired in 2.0.

**Rights.** The name, monogram, logo and photograph belong to Arjun Agrawal and are not covered by the code licence. See `LICENSE`.
