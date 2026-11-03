/** The glossary as a CSV file, written at build time from the glossary itself. */
import type { APIRoute } from 'astro';
import { corpus } from '../../lib/content';
import { GLOSSARY_CATEGORY_LABELS, QUALIFICATION_TAG_LABELS } from '../../lib/schemas';
import { isEnrichment, qualificationsOf } from '../../lib/glossary';
import { plain } from '../../lib/markup';

const cell = (s: string) => `"${s.replace(/\*\*|__/g, '').replace(/"/g, '""')}"`;

export const GET: APIRoute = async () => {
  const c = await corpus();
  const rows = Object.entries(c.glossary)
    .sort((a, b) => a[1].term.localeCompare(b[1].term, 'en', { sensitivity: 'base' }))
    .map(([id, g]) =>
      [
        g.term,
        g.definition,
        plain(g.simple ?? ''),
        plain(g.technical ?? ''),
        isEnrichment(g) ? 'Beyond the IB course (enrichment)' : 'IB course',
        g.subtopics.join('; '),
        isEnrichment(g) ? '' : g.level,
        g.category ? GLOSSARY_CATEGORY_LABELS[g.category] : '',
        qualificationsOf(g).map((q) => QUALIFICATION_TAG_LABELS[q]).join('; '),
        g.formula ?? '',
        g.misconceptions.map((m) => `${m.claim} In fact: ${plain(m.correction)}`).join(' | '),
        g.related.map((r) => c.glossary[r]?.term ?? r).join('; '),
        id,
      ]
        .map(cell)
        .join(','),
    );
  const head = ['Term', 'Definition', 'In plain words', 'In more depth', 'Scope', 'Subtopics', 'Level', 'Category', 'Qualifications', 'Formula', 'Common misconceptions', 'Related terms', 'Id'].map(cell).join(',');
  const note = cell('The Business Brief glossary, by Arjun Agrawal. Definitions in the platform\'s own words; not an IB publication.');
  const body = `\uFEFF${head}\r\n${rows.join('\r\n')}\r\n${note}\r\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
