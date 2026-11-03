/** Each enrichment map as a branded SVG file, written at build time with the same engine as the page. */
import type { APIRoute } from 'astro';
import { corpus } from '../../../../lib/content';
import { brandedSvg } from '../../../../lib/mindmap-export';

export async function getStaticPaths() {
  const c = await corpus();
  return Object.keys(c.enrichmentMaps).map((id) => ({ params: { id } }));
}

export const GET: APIRoute = async ({ params, site }) => {
  const c = await corpus();
  const id = String(params.id);
  const map = c.enrichmentMaps[id];
  if (!map) return new Response('Not found', { status: 404 });
  const page = site ? new URL(`/mindmaps/enrichment/${id}/`, site).href : `/mindmaps/enrichment/${id}/`;
  return new Response(brandedSvg(`enrichment-${id}`, map, { page }), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
