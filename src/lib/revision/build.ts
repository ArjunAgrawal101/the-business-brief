/**
 * Quick revision, built once: the formula register, the recall sets, the
 * integrity check, a revision sheet for every subtopic and the flashcard
 * deck. Pure, so the unit tests build exactly what the pages publish.
 */
import type { Corpus, Problem } from '../integrity';
import type { Framework } from '../framework-schema';
import type { Deck } from '../flashcards';
import { recallIds } from '../flashcards';
import { buildDeck } from './deck';
import { buildFormulae, type Formula } from './formulae';
import { checkRevision, subtopicsOf, type Subtopic } from './integrity';
import type { RevisionEntry } from './schema';
import { buildSheet, type RecallSet, type Sheet } from './sheet';

export interface RevisionInput {
  c: Corpus;
  frameworks: Record<string, Framework>;
  /** The revision files, by file name (each subtopic's slug). */
  revision: Record<string, RevisionEntry>;
}

export interface RevisionData {
  subtopics: Subtopic[];
  formulae: Formula[];
  recall: RecallSet[];
  sheets: Sheet[];
  deck: Deck;
  problems: Problem[];
}

/** The retrieval questions of the notes and the briefs, with their card ids, in course order. */
export function recallSets(c: Corpus, subs: readonly Subtopic[]): RecallSet[] {
  const out: RecallSet[] = [];
  for (const s of subs) {
    const note = Object.values(c.notes).find((n) => n.code === s.code);
    if (note) {
      const items = note.retrieval.map((r) => ({ q: r.q, a: r.a }));
      out.push({ code: s.code, set: `notes-${s.code.replace('.', '-')}`, items, ids: recallIds(s.code, items.map((x) => x.q)), href: `/topics/${s.slug}/#sh-rev-h`, label: `${s.code} notes` });
    }
    for (const [id, t] of Object.entries(c.topics)) {
      if (t.code !== s.code) continue;
      const items = t.revision.retrieval.map((r) => ({ q: r.q, a: r.a }));
      out.push({ code: s.code, set: `rev-${id}`, items, ids: recallIds(s.code, items.map((x) => x.q)), href: `/topics/${id}/#revision`, label: `${s.code} brief` });
    }
  }
  return out;
}

/**
 * The set id a retrieval card component was given, resolved to its subtopic:
 * "notes-3-5" is 3.5's notes; a brief's id, or "rev-" and its id, is the
 * brief's subtopic. Undefined for anything else.
 */
export function recallSetCode(c: Corpus, set: string): string | undefined {
  const m = /^notes-([1-5])-(\d)$/.exec(set);
  if (m) return `${m[1]}.${m[2]}`;
  return c.topics[set.replace(/^rev-/, '')]?.code;
}

export function buildRevision({ c, frameworks, revision }: RevisionInput): RevisionData {
  const subtopics = subtopicsOf(c);
  const hrefOf = new Map(subtopics.map((s) => [s.code, `/topics/${s.slug}/`]));
  const subtopicHref = (code: string) => hrefOf.get(code) ?? '/topics/';
  const order = [...subtopics.map((s) => s.code), 'toolkit'];
  const measures: Record<string, string | undefined> = {};
  for (const r of Object.values(revision)) for (const [id, f] of Object.entries(r.formulas)) if (f.measures) measures[id] = f.measures;
  const formulae = buildFormulae({ c, subtopicHref, order, measures });
  const recall = recallSets(c, subtopics);
  const problems = checkRevision({
    c,
    revision,
    formulaIds: new Set(formulae.map((f) => f.id)),
    recallIds: new Set(recall.flatMap((r) => r.ids)),
  });
  const byCode: Record<string, RevisionEntry> = {};
  for (const r of Object.values(revision)) byCode[r.code] = r;
  const deck = buildDeck({ c, subs: subtopics, frameworks, formulae, revision: byCode, recall });
  // Cards a reader sees for the subtopic before choosing to include enrichment beyond the course.
  const cardsFor = (code: string) => deck.cards.filter((x) => x.codes.includes(code) && !x.enrichment).length;
  const sheets = subtopics.map((s) => buildSheet({ c, s, frameworks, formulae, revision: byCode[s.code], recall, subtopicHref, cards: cardsFor(s.code) }));
  return { subtopics, formulae, recall, sheets, deck, problems };
}
