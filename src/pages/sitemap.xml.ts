import type { APIRoute } from 'astro';

/** Lists every built page, so search engines can find them. Needs SITE_URL (or a Vercel URL) to write absolute addresses. */
export const GET: APIRoute = async ({ site }) => {
  const pages = import.meta.glob('./**/*.astro');
  const { corpus, pathwaysInOrder } = await import('../lib/content');
  const c = await corpus();
  const paths = new Set<string>();
  for (const key of Object.keys(pages)) {
    if (key.includes('[') || key.endsWith('404.astro')) continue;
    const p = key.replace(/^\.\//, '/').replace(/index\.astro$/, '').replace(/\.astro$/, '/');
    paths.add(p);
  }
  Object.keys(c.topics).forEach((id) => {
    paths.add(`/topics/${id}/`);
    paths.add(`/revision/${id}/`);
  });
  Object.keys(c.cases).forEach((id) => paths.add(`/cases/${id}/`));
  Object.keys(c.decisions).forEach((id) => paths.add(`/decision-room/${id}/`));
  Object.entries(c.tools).forEach(([id, t]) => t.status === 'complete' && paths.add(`/toolkit/${id}/`));
  Object.keys(c.assessment).forEach((id) => id !== 'internal-assessment' && paths.add(`/exam-desk/${id}/`));
  (await pathwaysInOrder()).forEach((p) => paths.add(`/pathways/${p.id}/`));
  // A sitemap must use absolute addresses. Without a site address (a local build), list nothing.
  if (!site) {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Set SITE_URL to list the pages. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n',
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }
  const base = site.href.replace(/\/$/, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...paths]
    .sort()
    .map((p) => `  <url><loc>${base}${p}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
