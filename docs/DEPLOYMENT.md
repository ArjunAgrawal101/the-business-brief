# Deployment

The Business Brief deploys as a **separate Vercel project** from Arjun Agrawal Economics. It must never be deployed into the Economics project, and the Economics repository must not be changed.

## Status

**Not deployed.** This release was built and tested in a development environment with no Vercel access. The steps below are what to do next; nothing here has been run against Vercel yet.

## GitHub Pages is switched on, and cannot serve this site as it is

On 29 October 2026 the repository's settings had GitHub Pages enabled in "deploy from a branch" mode (branch `main`), which starts a "pages build and deployment" run on every push. That run builds the repository with Jekyll, which stops on the Astro components' front matter, so every run fails and nothing is published. Even if it succeeded, it would publish the source files, not the built site.

This was found, not changed: Pages is a repository setting, and the deployment choice is the creator's. The options:

- **Use Vercel, as planned below,** and switch Pages off (step 1 of the first deployment). The failing runs then stop.
- **Use GitHub Pages instead.** Set the Pages source to "GitHub Actions" and add a workflow that runs `npm ci` and `npm run build` and publishes `dist/` with `actions/deploy-pages`. On a project page (`https://arjunagrawal101.github.io/the-business-brief/`) every page would sit under `/the-business-brief/`, and the site's links are written from the root, so it would need either a custom domain (served from the root, which works as it is) or a base-path change throughout the site.

## What is configured

`vercel.json`:

- framework `astro`, install `npm ci`, build `npm run build`, output `dist`;
- `trailingSlash: true`, matching `astro.config.mjs`;
- security headers on every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`;
- long-lived immutable caching for `/fonts/` and `/_astro/` (hashed file names).

`package.json` pins Node.js to `22.x`, the line CI tests on (`.nvmrc`). On Vercel the `engines` field overrides the Node.js version chosen in the project settings, so that setting does not need changing. Change `engines` and `.nvmrc` together, for example to 24 after the Astro upgrade in [SECURITY.md](../SECURITY.md).

`astro.config.mjs` sets the site address from `SITE_URL`, or from `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel gives every build, previews included, as the project's production domain. The address is used for canonical links, the social card, `sitemap.xml` and `robots.txt`; a build with neither leaves them out.

## Before the first deployment

- **The Astro upgrade.** [SECURITY.md](../SECURITY.md) asks for the Astro 7.4 upgrade before a public launch. Its assessment of the exposure for this static site is low, so deploying first and upgrading next is a defensible order. The choice is the creator's.
- **The plan.** Vercel's Hobby plan is for personal, non-commercial use. Commercial use, such as taking payments or carrying advertising, needs a Pro plan.
- **Analytics.** Leave Vercel Web Analytics and Speed Insights off. The privacy page says the site has no analytics; switching either on would make that untrue until the page is changed.

## First deployment

1. **Switch GitHub Pages off**, if Vercel will host the site: in the repository, Settings, Pages. Under Build and deployment, keep the source as "Deploy from a branch", set the branch to **None** and save.
2. **Sign in to Vercel** at vercel.com with GitHub, in the account or team the site should belong to. It can be the one that holds the Economics project, as a separate project.
3. Choose **Add New**, then **Project**. Under Import Git Repository, find `the-business-brief` and choose **Import**. If it is not listed, follow the link to adjust the Vercel GitHub App's permissions and add this repository; the repositories it can already reach stay as they are.
4. On the configuration screen:
   - **Project name:** `the-business-brief`. The production address becomes `the-business-brief.vercel.app`, or a variant if that name is taken.
   - **Framework preset:** Astro. **Root directory:** the repository root.
   - **Build and output settings:** leave them. `vercel.json` sets them and overrides the dashboard.
   - **Environment variables:** none. Leave `SITE_URL` unset; the build reads the production address from Vercel.
5. Choose **Deploy**. When the build finishes, open the project; the production address is listed under Domains.

From then on every push to `main` deploys to production, and other branches get preview deployments. By default Vercel asks for a Vercel login on preview addresses and on the long per-deployment addresses, while the production domain is public: test and share the production domain.

If a build fails, the deployment's build log names the step and the error.

## After deploying, check

Locally first:

```bash
npm run build
```

Then on the production address:

- the home page, a topic page (`/topics/costs-and-revenues/`), a Decision Room (`/decision-room/atelier-pricing/`), the case lab (`/case-room/halden-diagnosis/`) and the break-even workspace (`/finance-desk/break-even/`) load and work;
- `/sitemap.xml` lists absolute addresses on the production domain, and `/robots.txt` names it;
- an unknown address returns the 404 page with status 404;
- the social card appears when the address is shared (`/brand/social-card.png`);
- responses carry the security headers above.

From a terminal, with the production address in `SITE`:

```bash
SITE=https://the-business-brief.vercel.app
curl -sI "$SITE/" | grep -iE 'x-content-type-options|referrer-policy|permissions-policy|x-frame-options'
curl -s -o /dev/null -w '%{http_code}\n' "$SITE/no-such-page/"
curl -s "$SITE/robots.txt"
```

The first command prints the four headers, the second `404`, the third a `Sitemap:` line on the production domain.

Only after these checks should the deployment be described as live.

## Custom domain

1. In the project, Settings, Domains: add the domain. Vercel shows the DNS records it needs (an A record for a bare domain, a CNAME for a subdomain). Create exactly those at the domain's registrar, and wait until Vercel shows the domain as valid.
2. Choose the primary address, for example `www.example.com` with the bare domain redirecting to it.
3. Set `SITE_URL` to the primary address (with `https://`, no trailing slash) in Settings, Environment Variables, for Production, and redeploy, so that canonical links and the sitemap use it. Without it the build uses the shortest production domain, which may be the one that redirects.

To serve the site from a subdomain of the Economics site's domain, add only the new subdomain's record and leave the Economics records alone.

## Rolling back

Vercel keeps every deployment. Promote the previous production deployment from the project's Deployments list.
