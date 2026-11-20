/** The glossary as a CSV file, written at build time from the glossary itself (src/lib/library/glossary-csv.ts). */
import type { APIRoute } from 'astro';
import { corpus } from '../../lib/content';
import { glossaryCsv } from '../../lib/library/glossary-csv';

export const GET: APIRoute = async () => new Response(glossaryCsv(await corpus()), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
