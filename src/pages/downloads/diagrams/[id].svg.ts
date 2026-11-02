/** Each diagram as a standalone SVG file, written at build time from the same code as the page. */
import type { APIRoute } from 'astro';
import { DIAGRAMS, standalone } from '../../../lib/diagrams';

export function getStaticPaths() {
  return Object.keys(DIAGRAMS).map((id) => ({ params: { id } }));
}

export const GET: APIRoute = ({ params }) => {
  const id = String(params.id);
  if (!DIAGRAMS[id]) return new Response('Not found', { status: 404 });
  return new Response(standalone(id), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
