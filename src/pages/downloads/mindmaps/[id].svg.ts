/** Each mindmap as a branded SVG file, written at build time with the same engine as the page (src/lib/library/downloads.ts). */
import type { APIRoute } from 'astro';
import { corpus } from '../../../lib/content';
import { mindmapFile } from '../../../lib/library/downloads';

export async function getStaticPaths() {
  const c = await corpus();
  return Object.keys(c.mindmaps).map((id) => ({ params: { id } }));
}

export const GET: APIRoute = async ({ params, site }) => {
  const svg = mindmapFile(await corpus(), String(params.id), site);
  if (svg === null) return new Response('Not found', { status: 404 });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
