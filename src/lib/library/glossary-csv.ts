/**
 * The glossary as a CSV file: one row per term, written at build time from
 * the glossary itself. The endpoint /downloads/glossary.csv serves it, and the
 * Resources Library measures the same text to give its size.
 */
import type { Corpus } from '../integrity';
import { GLOSSARY_CATEGORY_LABELS, QUALIFICATION_TAG_LABELS } from '../schemas';
import { isEnrichment, qualificationsOf } from '../glossary';
import { plain } from '../markup';

/** A quoted CSV cell, with Markdown emphasis removed and quotes doubled. */
export const csvCell = (s: string): string => `"${s.replace(/\*\*|__/g, '').replace(/"/g, '""')}"`;

export const GLOSSARY_CSV_HEAD = ['Term', 'Definition', 'In plain words', 'In more depth', 'Scope', 'Subtopics', 'Level', 'Category', 'Qualifications', 'Formula', 'Common misconceptions', 'Related terms', 'Id'];

export function glossaryCsv(c: Corpus): string {
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
        qualificationsOf(g)
          .map((q) => QUALIFICATION_TAG_LABELS[q])
          .join('; '),
        g.formula ?? '',
        g.misconceptions.map((m) => `${m.claim} In fact: ${plain(m.correction)}`).join(' | '),
        g.related.map((r) => c.glossary[r]?.term ?? r).join('; '),
        id,
      ]
        .map(csvCell)
        .join(','),
    );
  const head = GLOSSARY_CSV_HEAD.map(csvCell).join(',');
  const note = csvCell("The Business Brief glossary, by Arjun Agrawal. Definitions in the platform's own words; not an IB publication.");
  return `\uFEFF${head}\r\n${rows.join('\r\n')}\r\n${note}\r\n`;
}
