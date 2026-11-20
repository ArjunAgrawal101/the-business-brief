/** Every topic checklist as one CSV file, written at build time from the syllabus statements (src/lib/teachers/checklists.ts). */
import type { APIRoute } from 'astro';
import { corpus } from '../../lib/content';
import { checklistsCsv } from '../../lib/teachers/checklists';

export const GET: APIRoute = async () => {
  const cur = (await corpus()).curricula['ib-dp-bm'];
  if (!cur) return new Response('Not found', { status: 404 });
  return new Response(checklistsCsv(cur), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
