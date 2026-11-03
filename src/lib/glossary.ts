/**
 * The glossary as a dictionary: who meets each term, how terms relate beyond
 * their own `related` lists, and the search text for the index. Pure
 * functions, used by the glossary pages at build time and by the unit tests.
 */
import type { GlossaryEntry, QualificationTag } from './schemas';

type Glossary = Record<string, GlossaryEntry>;

/** A term beyond the IB course: labelled enrichment, with no IB subtopic. */
export const isEnrichment = (g: GlossaryEntry): boolean => g.provenance === 'enrichment';

/**
 * Where a learner meets the term. An entry that lists its qualifications is
 * taken at its word; an IB course term that lists none is an IB term.
 */
export function qualificationsOf(g: GlossaryEntry): QualificationTag[] {
  if (g.qualifications.length) return g.qualifications;
  return isEnrichment(g) ? [] : ['ib'];
}

/** Has the entry been written as a full dictionary entry (plain and technical explanations, misconceptions)? */
export const isDeep = (g: GlossaryEntry): boolean => Boolean(g.simple && g.technical && g.misconceptions.length);

/** The lower-case text the index searches: names, the definition and the plain explanation. */
export function searchText(g: GlossaryEntry): string {
  return [g.term, ...g.aliases, g.definition, g.simple ?? '']
    .join(' ')
    .replace(/[*`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const STOP = new Set(['analysis', 'business', 'theory', 'model', 'method', 'management', 'production', 'market', 'marketing', 'the', 'and', 'of', 'for', 'in', 'to', 'a']);

/** The distinctive words of a term's name, for matching related names ("break-even quantity" and "break-even revenue"). */
function nameWords(g: GlossaryEntry): Set<string> {
  return new Set(
    g.term
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .split(/[^a-z0-9-]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/** Terms that list `id` among their related terms, and are not in its own list. */
export function backlinks(id: string, glossary: Glossary): string[] {
  const g = glossary[id];
  if (!g) return [];
  return Object.entries(glossary)
    .filter(([x, e]) => x !== id && e.related.includes(id) && !g.related.includes(x))
    .map(([x]) => x);
}

export interface Suggestion {
  id: string;
  score: number;
  /** Why it is suggested, in words, for the page. */
  reason: string;
}

/**
 * Terms worth reading next, beyond the entry's own related terms and the
 * terms that point back to it: terms one step further along the related
 * links, terms that share a framework or a subtopic, and terms with a
 * matching name. Scores are summed; ties go to the alphabetically first term.
 */
export function suggestTerms(id: string, glossary: Glossary, limit = 6): Suggestion[] {
  const g = glossary[id];
  if (!g) return [];
  const exclude = new Set([id, ...g.related, ...backlinks(id, glossary)]);
  const words = nameWords(g);
  const out: Suggestion[] = [];
  for (const [x, e] of Object.entries(glossary)) {
    if (exclude.has(x)) continue;
    let score = 0;
    const reasons: string[] = [];
    const via = g.related.filter((r) => glossary[r]?.related.includes(x));
    if (via.length) {
      score += 2 * via.length;
      reasons.push(`linked through ${via.map((r) => glossary[r]!.term).join(' and ')}`);
    }
    const fw = g.frameworks.filter((f) => e.frameworks.includes(f));
    if (fw.length) {
      score += 3 * fw.length;
      reasons.push('used alongside it in the same framework or diagram');
    }
    const subs = g.subtopics.filter((s) => s !== 'toolkit' && e.subtopics.includes(s));
    if (subs.length) {
      score += 1.5 * subs.length;
      reasons.push(`also in ${subs.join(' and ')}`);
    }
    const shared = [...nameWords(e)].filter((w) => words.has(w));
    if (shared.length) {
      score += 2 * shared.length;
      reasons.push('a related name');
    }
    if (score > 0 && g.category && e.category === g.category) score += 0.5;
    if (score > 0 && isEnrichment(g) === isEnrichment(e)) score += 0.25;
    if (score >= 2) out.push({ id: x, score, reason: reasons[0] ?? '' });
  }
  return out
    .sort((a, b) => b.score - a.score || glossary[a.id]!.term.localeCompare(glossary[b.id]!.term, 'en', { sensitivity: 'base' }))
    .slice(0, limit);
}
