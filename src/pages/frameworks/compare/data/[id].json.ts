/**
 * Each framework in the library as one column of the comparison tool, written
 * at build time as /frameworks/compare/data/<id>.json, so the tool's page
 * stays small and the browser fetches only the two frameworks it compares.
 */
import type { APIRoute } from 'astro';
import { comparisons } from '../../../../lib/compare/content';
import { frameworkColumn } from '../../../../lib/compare/render';
import { library } from '../../../../lib/frameworks-content';

export async function getStaticPaths() {
  const lib = await library();
  return Object.keys(lib.frameworks).map((id) => ({ params: { id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const [lib, cmp] = await Promise.all([library(), comparisons()]);
  const id = String(params.id);
  const f = lib.frameworks[id];
  if (!f) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(frameworkColumn(id, f, cmp.render)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
