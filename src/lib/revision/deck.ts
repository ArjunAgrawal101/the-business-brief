/**
 * The flashcard deck, built from the content at build time and written to
 * /revision/flashcards/deck.json. Every card has a stable id ("<kind>:<id>"),
 * at least one subtopic code and a level:
 *   term         every IB glossary term, front the term, back its definition
 *                (terms beyond the course belong to no subtopic and are left out);
 *   framework    every framework in the library, twice: what it is for and when
 *                to use it, and its parts (enrichment frameworks are marked);
 *   formula      every formula in the register, both ways: from the formula to
 *                what it measures, and from a situation to the formula;
 *   distinction, scenario, evaluation
 *                written in the revision files (src/content/revision/);
 *   recall       the retrieval questions of the notes and the briefs, the same
 *                cards the subtopic pages show.
 * Cards are in course order: by subtopic, then kind, then as the source orders them.
 */
import type { Corpus } from '../integrity';
import type { Framework } from '../framework-schema';
import { esc, inline, plain, rich } from '../markup';
import { CARD_KINDS, cardId, recallIsHL, withoutHLMark, type CardKind, type CardLevel, type Deck, type DeckCard } from '../flashcards';
import { rhs, type Formula } from './formulae';
import type { Subtopic } from './integrity';
import type { RecallSet } from './sheet';
import type { RevisionEntry } from './schema';

export interface DeckInput {
  c: Corpus;
  subs: readonly Subtopic[];
  frameworks: Record<string, Framework>;
  formulae: readonly Formula[];
  /** Revision files by subtopic code. */
  revision: Readonly<Record<string, RevisionEntry>>;
  recall: readonly RecallSet[];
}

export const TOOLKIT_TITLE = 'The business management toolkit';

const short = (text: string, max = 100): string => {
  const p = plain(text);
  if (p.length <= max) return p;
  const cut = p.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > max / 2 ? at : max).replace(/[,;:.]$/, '')}…`;
};

const firstSentence = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(flat);
  return (m ? m[1] : flat) ?? flat;
};

const list = (items: readonly string[]) => `<ul>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`;

const ORIGIN: Record<Formula['origin'], string> = { calculation: 'Calculation register', notes: 'Notes', glossary: 'Glossary' };

export function buildDeck({ c, subs, frameworks, formulae, revision, recall }: DeckInput): Deck {
  const order = new Map([...subs.map((s, i) => [s.code, i] as const), ['toolkit', subs.length] as const]);
  const byCourse = (codes: readonly string[]) => [...new Set(codes)].filter((x) => order.has(x)).sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  const sheetHref = (code: string) => {
    const s = subs.find((x) => x.code === code);
    return s ? `/revision/${s.slug}/` : '/revision/';
  };
  const cards: DeckCard[] = [];
  const push = (card: Omit<DeckCard, 'codes'> & { codes: readonly string[] }) => {
    const codes = byCourse(card.codes);
    if (!codes.length) return;
    cards.push({ ...card, codes });
  };

  // Terms: the IB glossary.
  for (const [id, g] of Object.entries(c.glossary)) {
    if (g.provenance === 'enrichment' || !g.subtopics.length) continue;
    push({
      id: cardId('term', id),
      kind: 'term',
      codes: g.subtopics,
      level: g.level,
      title: g.term,
      front: `<p class="fc-big">${esc(g.term)}</p>`,
      prompt: 'Define the term.',
      back: `<p>${inline(g.definition)}</p>${g.formula ? `<p class="fc-formula">${esc(g.formula)}</p>` : ''}`,
      href: `/glossary/${id}/`,
      source: 'Glossary',
    });
  }

  // Formulae, both ways.
  const situations = new Map<string, string>();
  for (const r of Object.values(revision)) for (const [id, f] of Object.entries(r.formulas)) situations.set(id, f.situation);
  for (const f of formulae) {
    const measures = f.measures ? `<p>${inline(f.measures)}</p>` : '';
    const answer = `<p class="fc-name">${esc(f.name)}</p><p class="fc-formula">${esc(f.expression)}</p>${measures}`;
    push({
      id: cardId('formula', f.id),
      kind: 'formula',
      codes: f.codes,
      level: f.level,
      title: `${f.name}: what it measures`,
      front: `<p class="fc-formula fc-formula--front">${esc(rhs(f.expression))}</p>`,
      prompt: 'What does this formula calculate, and what does it tell you?',
      back: answer,
      href: f.href,
      source: ORIGIN[f.origin],
    });
    const situation = situations.get(f.id);
    if (situation)
      push({
        id: cardId('formula', `${f.id}:use`),
        kind: 'formula',
        codes: f.codes,
        level: f.level,
        title: `${f.name}: when to use it`,
        front: rich(situation),
        prompt: 'Which formula do you need? Write it out.',
        back: answer,
        href: f.href,
        source: ORIGIN[f.origin],
      });
  }

  // Frameworks: purpose and use, then structure.
  for (const [id, f] of Object.entries(frameworks).sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))) {
    const codes = f.status === 'toolkit' ? [...f.subtopics, 'toolkit'] : f.subtopics;
    const standing = f.status === 'syllabus' ? 'Named in the IB syllabus.' : f.status === 'toolkit' ? 'An IB toolkit tool.' : 'Enrichment: beyond the IB course.';
    const base = { codes, level: f.level, href: `/frameworks/${id}/`, source: 'Frameworks library', ...(f.status === 'enrichment' ? { enrichment: true as const } : {}) };
    push({
      ...base,
      id: cardId('framework', id),
      kind: 'framework',
      title: `${f.name}: purpose and use`,
      front: `<p class="fc-big">${esc(f.name)}</p>`,
      prompt: 'What is it for, and when would you use it?',
      back: `${rich(f.purpose)}<p class="fc-sub">Use it when</p>${list(f.situations.suits.slice(0, 2))}<p class="fc-sub">Look elsewhere when</p>${list(f.situations.poorFit.slice(0, 1))}<p class="fc-standing">${standing}</p>`,
    });
    push({
      ...base,
      id: cardId('framework', `${id}:structure`),
      kind: 'framework',
      title: `${f.name}: its parts`,
      front: `<p class="fc-big">${esc(f.name)}</p>`,
      prompt: 'Name its parts, and what each one holds.',
      back: `<dl class="fc-parts">${f.structure.map((p) => `<div><dt>${esc(p.name)}</dt><dd>${inline(firstSentence(p.text))}</dd></div>`).join('')}</dl>`,
    });
  }

  // Written for revision: distinctions, application scenarios and evaluation prompts.
  for (const s of subs) {
    const r = revision[s.code];
    if (!r) continue;
    const href = sheetHref(s.code);
    for (const d of r.distinctions)
      push({
        id: cardId('distinction', d.id),
        kind: 'distinction',
        codes: d.codes.length ? d.codes : [s.code],
        level: d.level,
        title: `${d.pair[0]} and ${d.pair[1]}`,
        front: `<p class="fc-big">${esc(d.pair[0])} <span class="fc-and">and</span> ${esc(d.pair[1])}</p>`,
        prompt: 'What is the difference, and why does it matter?',
        back: `${rich(d.difference)}${d.example ? `<p class="fc-sub">Tell them apart</p>${rich(d.example)}` : ''}`,
        href,
        source: `${s.code} revision sheet`,
      });
    for (const x of r.scenarios)
      push({
        id: cardId('scenario', x.id),
        kind: 'scenario',
        codes: x.codes.length ? x.codes : [s.code],
        level: x.level,
        fictional: true,
        title: `${x.business}: which concept applies?`,
        front: rich(x.stem),
        prompt: 'Which concept or tool applies, and why?',
        back: `<p class="fc-name">${esc(x.answer)}</p>${rich(x.why)}`,
        href,
        source: `${s.code} revision sheet`,
      });
    for (const x of r.evaluations)
      push({
        id: cardId('evaluation', x.id),
        kind: 'evaluation',
        codes: x.codes.length ? x.codes : [s.code],
        level: x.level,
        title: short(x.claim, 90),
        front: `<blockquote class="fc-claim">${rich(x.claim)}</blockquote>`,
        prompt: 'Give the counter-argument, or the condition under which the claim fails.',
        back: rich(x.counter),
        href,
        source: `${s.code} revision sheet`,
      });
  }

  // Recall: the retrieval questions of the notes and briefs.
  const hlRecall = new Set(Object.values(revision).flatMap((r) => r.hlRecall));
  const seen = new Set<string>();
  for (const set of recall) {
    const s = subs.find((x) => x.code === set.code);
    set.items.forEach((it, i) => {
      const id = set.ids[i];
      if (!id || seen.has(id)) return;
      seen.add(id);
      const level: CardLevel = s?.level === 'HL' || recallIsHL(it.q) || hlRecall.has(id) ? 'HL' : 'SL/HL';
      push({
        id,
        kind: 'recall',
        codes: [set.code],
        level,
        title: short(withoutHLMark(it.q)),
        front: `<p>${inline(withoutHLMark(it.q))}</p>`,
        prompt: 'Answer from memory, then check.',
        back: rich(it.a),
        href: set.href,
        source: set.label,
      });
    });
  }

  // Course order: subtopic, then kind, then as written.
  const kindRank = (k: CardKind) => CARD_KINDS.indexOf(k);
  const indexed = cards.map((card, i) => ({ card, i }));
  indexed.sort((a, b) => (order.get(a.card.codes[0] ?? '') ?? 99) - (order.get(b.card.codes[0] ?? '') ?? 99) || kindRank(a.card.kind) - kindRank(b.card.kind) || a.i - b.i);

  const unitTitles = (c.curricula['ib-dp-bm']?.units ?? []).map((u) => ({ id: String(u.number), title: u.title }));
  return {
    v: 1,
    units: [...unitTitles, { id: 'toolkit', title: TOOLKIT_TITLE }],
    subtopics: [
      ...subs.map((s) => ({ code: s.code, title: s.title, unit: String(s.unit), level: s.level })),
      { code: 'toolkit', title: TOOLKIT_TITLE, unit: 'toolkit', level: 'SL/HL with HL-only content' as const },
    ],
    cards: indexed.map((x) => x.card),
  };
}
