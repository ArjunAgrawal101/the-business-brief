/** Each diagram as a standalone SVG file, written at build time from the same code as the page (src/lib/library/downloads.ts). */
import type { APIRoute } from 'astro';
import { DIAGRAMS } from '../../../lib/diagrams';
import { diagramFile } from '../../../lib/library/downloads';

export function getStaticPaths() {
  return Object.keys(DIAGRAMS).map((id) => ({ params: { id } }));
}

export const GET: APIRoute = ({ params }) => {
  const svg = diagramFile(String(params.id));
  if (svg === null) return new Response('Not found', { status: 404 });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
