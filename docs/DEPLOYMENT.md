# Deployment

The Business Brief deploys as a **separate Vercel project** from Arjun Agrawal Economics. It must never be deployed into the Economics project, and the Economics repository must not be changed.

## Status

**Not deployed.** This release was built and tested in a development environment with no Vercel access. The steps below are what to do next; nothing here has been run against Vercel yet.

## GitHub Pages is switched on, and cannot serve this site as it is

On 29 October 2026 the repository's settings had GitHub Pages enabled in "deploy from a branch" mode (branch `main`), which starts a "pages build and deployment" run on every push. That run builds the repository with Jekyll, which stops on the Astro components' front matter, so every run fails and nothing is published. Even if it succeeded, it would publish the source files, not the built site.

This was found, not changed: Pages is a repository setting, and the deployment choice is the creator's. The options:

- **Use Vercel, as planned below,** and switch Pages off (Settings, Pages: under Build and deployment, set the branch to None and save). The failing runs then stop.
- **Use GitHub Pages instead.** Set the Pages source to "GitHub Actions" and add a workflow that runs `npm ci` and `npm run build` and publishes `dist/` with `actions/deploy-pages`. On a project page (`https://arjunagrawal101.github.io/the-business-brief/`) every page would sit under `/the-business-brief/`, and the site's links are written from the root, so it would need either a custom domain (served from the root, which works as it is) or a base-path change throughout the site.

## What is configured

`vercel.json`:

- framework `astro`, install `npm ci`, build `npm run build`, output `dist`;
- `trailingSlash: true`, matching `astro.config.mjs`;
- security headers on every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`;
- long-lived immutable caching for `/fonts/` and `/_astro/` (hashed file names).

`astro.config.mjs` sets the site address from `SITE_URL`, or from Vercel's own production URL if that is set. The address is used for canonical links, the social card, `sitemap.xml` and `robots.txt`.

## First deployment

1. The source is at https://github.com/ArjunAgrawal101/the-business-brief (branch `main`).
2. In Vercel, choose **Add New, Project**, and import the `the-business-brief` repository. Do not use or change the Economics project.
3. Framework preset: Astro (detected from `vercel.json`). Leave the build settings as configured.
4. Node.js version: 22.x for Astro 6.4.8. After the Astro 7.4 upgrade in SECURITY.md, choose 24.x.
5. Environment variable: `SITE_URL` set to the production address, for example `https://the-business-brief.vercel.app` (no trailing slash). Without it, Vercel's production URL is used.
6. Deploy. Vercel builds on every push; pushes to branches other than `main` get preview deployments.

## After deploying, check

```bash
npm run build
```

locally first, then on the deployed address:

- the home page, a topic page, a Decision Room and the break-even workspace load and work;
- `/sitemap.xml` lists absolute addresses on the production domain;
- `/robots.txt` names the sitemap;
- an unknown address returns the 404 page with status 404;
- the social card appears when the address is shared (`/brand/social-card.png`);
- response headers include the security headers above.

Only after these checks should the deployment be described as live.

## Custom domain

Add the domain in the Vercel project's Domains settings, set `SITE_URL` to it, and redeploy so canonical links and the sitemap use it.

## Rolling back

Vercel keeps every deployment. Promote the previous production deployment from the project's Deployments list.
