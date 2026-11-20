import type { APIRoute } from 'astro';
import { siteSearchEntries } from '../lib/search-entries';
import { compactEntry, type CompactIndex } from '../lib/suggest';

/** The compact search index the header's search box loads to suggest results as the reader types (src/lib/suggest.ts). */
export const GET: APIRoute = async () => {
  const body: CompactIndex = { v: 1, e: (await siteSearchEntries()).map(compactEntry) };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
