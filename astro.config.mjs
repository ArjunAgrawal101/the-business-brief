// @ts-check
import { defineConfig } from 'astro/config';

/**
 * The public address of the site. A custom domain is set with SITE_URL; on
 * Vercel the production domain is read from the build environment. When neither
 * is present (a local build, a ZIP download) the site still builds: canonical
 * links and the sitemap are simply left out rather than pointed at a guess.
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : undefined);

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: { enabled: false },
  prefetch: false,
  server: { port: 4321 },
});
