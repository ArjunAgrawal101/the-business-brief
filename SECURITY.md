# Security

The Business Brief is a static site: HTML, CSS, a few small scripts and images, with no server code, no database, no accounts and no forms that send data anywhere. Learners' work is kept only in their own browser's local storage.

## Reporting a problem

Please report a security problem privately to the maintainer rather than in a public issue. Until a dedicated address is set up, use the contact options on [Arjun Agrawal Economics](https://ib-economics-pi.vercel.app/).

## Dependency advisories (checked 29 October 2026)

`npm audit` reports advisories against the build tooling:

| Package | Version here | Advisories | Exposure on this site |
| --- | --- | --- | --- |
| astro | 6.4.8 | Several, fixed in 7.4.x: cross-site scripting through spread attribute names, `transition:*` directives, View Transition properties and script or style content in JSX/MDX; a base-path authorization bypass; remote code execution through AVIF image optimization | Low. The site is built from trusted content in the repository, uses no spread attributes from data, no transitions, no islands, no MDX, no server routes and no image optimization. Data embedded in pages is escaped (`jsonForScript` in `src/lib/markup.ts`). |
| esbuild | 0.27.7 | Arbitrary file read by the development server on Windows | Development only. Do not run `npm run dev` on an untrusted network. |
| sharp | 0.34.5 | Vulnerabilities in libvips, libheif and librsvg | Not used: the site does not process images at build time. Installed as an optional dependency of Astro. |

**Action required before a public launch:** upgrade to `astro@7.4.4` or later. Astro 7.4 requires Node.js 22.23.4 or later (or Node 24). The development environment used for this release had Node 22.22.0, so the upgrade could not be built and tested here. On a machine with a newer Node:

```bash
npm install --save-exact astro@7.4.4
npm install --save-exact @astrojs/check@latest
npm run qa
```

Then set `"engines": { "node": ">=22.23.4" }` in `package.json` and choose Node 24 in the Vercel project settings.

## Headers

`vercel.json` sets `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options`. A Content Security Policy is not yet set: the pages use inline JSON data blocks and one small inline script (the SL and HL switch before first paint), so a policy needs hashes for those. Adding one is on the roadmap.
