/** Each mindmap as a branded SVG file, written at build time with the same engine as the page. */
import type { APIRoute } from 'astro';
import { corpus } from '../../../lib/content';
import { brandedSvg } from '../../../lib/mindmap-export';

export async function getStaticPaths() {
  const c = await corpus();
  return Object.keys(c.mindmaps).map((id) => ({ params: { id } }));
}

export const GET: APIRoute = async ({ params, site }) => {
  const c = await corpus();
  const id = String(params.id);
  const map = c.mindmaps[id];
  if (!map) return new Response('Not found', { status: 404 });
  const page = site ? new URL(`/mindmaps/${id}/`, site).href : `/mindmaps/${id}/`;
  return new Response(brandedSvg(id, map, { page }), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
