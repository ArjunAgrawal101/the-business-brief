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
  // The content cache lives in the project's own .astro folder (git-ignored), not in node_modules, so checkouts that share an install never read each other's content.
  cacheDir: './.astro/cache',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: { enabled: false },
  prefetch: false,
  // The Exam Desk became the Assessment Centre in 2.0; old addresses still work.
  redirects: {
    // Resources Library details pages retired in 2.0 for entries that are pages in their own right.
    '/resources/command-terms': '/examiner-lens/',
    '/resources/ia-studio': '/assessment/internal-assessment/',
    '/resources/ia-planner': '/ia-studio/',
    '/resources/answer-builder': '/assessment/paper-2/',
    '/resources/paper-2-constructions': '/assessment/paper-2/',
    '/resources/paper-3-strategic-planning': '/assessment/paper-3/',
    '/resources/toolkit': '/toolkit/',
    '/resources/course-map': '/ib/map/',
    '/resources/teachers': '/pathways/teachers/',
    '/exam-desk': '/assessment/',
    '/exam-desk/paper-1': '/assessment/paper-1/',
    '/exam-desk/paper-2': '/assessment/paper-2/',
    '/exam-desk/paper-3': '/assessment/paper-3/',
  },
  server: { port: 4321 },
});
