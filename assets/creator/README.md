# Creator photographs and logo: originals

The creator supplied these files for The Business Brief: the first set on 2 November 2026, and a second set with the 2.0 brief on 20 November 2026. They are kept here, unchanged, as the sources for the web versions in `public/images/creator/`, which `node scripts/brand/creator-photos.mjs` makes by cropping and resizing, as AVIF with a WebP fallback. Nothing is retouched: no background changes, no generated pixels, no change to faces or proportions. The one correction is noted in the table.

The 2.0 brief asked for five or six photographs, each with a clear purpose, and ruled out AI-generated portraits. Four are used.

| File | What it shows | Crops | Where it is used | Notes |
| --- | --- | --- | --- | --- |
| `arjun-agrawal-awards-portrait.webp` | Light grey blazer, black shirt, glasses, in front of an awards cabinet | `portrait-awards` (4:5), `portrait-awards-square` (1:1) | About page hero (brief: image 1); the creator section of the home page, small | Supplied 20 November 2026. No AI mark |
| `arjun-agrawal-addressing-an-audience.jpg` | Teaching a class in front of a screen, grey suit and tie | `audience-wide` (3:2), `audience-portrait` (4:5) | About page, teaching and academic work (image 2); Tutorials page | Camera original (its metadata holds the phone camera's HDR gain map) |
| `arjun-agrawal-conference-table.jpg` | Reading papers at a conference table, black blazer, a second person at a laptop alongside | `conference-wide` (3:2), `conference-close` (4:3, phones) | About page, professional journey (image 3) | Supplied 20 November 2026. No AI mark. Brightness +3% and contrast +5%, because the window behind washes the room out. The second person is not named anywhere on the site |
| `arjun-agrawal-traditional-attire.jpg` | Full-length, traditional attire, painted wall | `traditional` | About page, personal note | |
| `arjun-agrawal-logo-supplied.webp` | The Arjun Agrawal logo, raster | | Reference only | The site uses the vector master in `public/brand/creator/`, which matches this file in shape, proportion and colour |

**Not used, and why.**

- **Four supplied files carry an AI mark.** The navy-suit portrait against a stone wall (the brief's optional image 6), the group photograph with students (image 5) and the panel photograph at a table with name cards (offered for image 4) each carry Google Gemini's sparkle mark in the lower right corner. That means they were made or edited with AI. A fifth file, a portrait at a whiteboard, carries a visible "AI-generated content" label. The brief rules out AI-generated portraits as substitutes for real photographs, and cropping a mark away would hide it, so none of these is used or stored here. The navy-suit portrait was the home and About hero until 20 November 2026 and has been retired. If the camera originals exist, add them here and to the script, and the About page has places for them (academic dialogue; the group photograph in the journey).
- **The teal-blazer photograph** described in the brief (image 4, speaking across a desk) was not among the supplied files.
- **An outdoor full-length photograph** (grey suit, briefcase, under an orange canopy) is authentic, but the canopy and lanyard compete with the page and it adds nothing the four above do not, so it is not used.

**Rights.** The photographs and logo belong to Arjun Agrawal and are not covered by the code licence (see `LICENSE`). Anyone else who appears in a photograph is not named.
