/**
 * Integrity checks for the revision collection (src/content/revision/), run
 * whenever a revision page or the flashcard deck is built, and by
 * tests/unit/revision.test.ts. Every subtopic has a file named after its
 * address; every command term exists and sits at or below the AO level of the
 * statements it is asked on; HL-only material is marked HL; every card id is
 * unique; every formula and recall card a file names exists.
 */
import type { Corpus, Problem } from '../integrity';
import type { RevisionEntry } from './schema';
import { slugify } from '../flashcards';

const AO_RANK: Record<string, number> = { AO1: 1, AO2: 2, AO3: 3 };

export interface Subtopic {
  code: string;
  title: string;
  slug: string;
  unit: number;
  unitTitle: string;
  level: 'SL/HL' | 'HL' | 'SL/HL with HL-only content';
  content: Array<{ text: string; ao: string[]; level: 'SL/HL' | 'HL' }>;
  /** The brief that teaches the subtopic, when its address is the subtopic's. */
  topic?: string;
  tools: string[];
}

/** The curriculum's subtopics in course order, with what the revision pages need. */
export function subtopicsOf(c: Corpus): Subtopic[] {
  const cur = c.curricula['ib-dp-bm'];
  return (cur?.units ?? []).flatMap((u) =>
    u.subtopics.map((s) => ({
      code: s.code,
      title: s.title,
      slug: slugify(s.title),
      unit: u.number,
      unitTitle: u.title,
      level: s.level,
      content: s.content.map((x) => ({ text: x.text, ao: [...x.ao], level: x.level })),
      topic: s.topic && c.topics[s.topic] ? s.topic : undefined,
      tools: [...s.tools],
    })),
  );
}

/**
 * Whether a command term may be asked on a subtopic at a level: the guide
 * allows a term at its statements' AO level or below; AO4 terms (calculate,
 * construct and the rest) only where a statement includes AO4.
 */
export function commandAllowed(termAo: string, s: Subtopic, level: 'SL/HL' | 'HL'): boolean {
  const statements = s.content.filter((x) => level === 'HL' || x.level !== 'HL');
  if (termAo === 'AO4') return statements.some((x) => x.ao.includes('AO4'));
  const top = Math.max(0, ...statements.flatMap((x) => x.ao.map((a) => AO_RANK[a] ?? 0)));
  return (AO_RANK[termAo] ?? 9) <= top;
}

export interface RevisionContext {
  c: Corpus;
  /** The revision files, by file name (the subtopic's slug). */
  revision: Record<string, RevisionEntry>;
  /** Ids in the formula register. */
  formulaIds: ReadonlySet<string>;
  /** Ids of the recall cards. */
  recallIds: ReadonlySet<string>;
}

export function checkRevision({ c, revision, formulaIds, recallIds }: RevisionContext): Problem[] {
  const out: Problem[] = [];
  const subs = subtopicsOf(c);
  const byCode = new Map(subs.map((s) => [s.code, s]));
  const validCode = (code: string) => code === 'toolkit' || byCode.has(code);
  const hlOnly = (code: string) => byCode.get(code)?.level === 'HL';

  for (const s of subs) {
    if (s.slug === 'flashcards') out.push({ where: `revision/${s.slug}`, message: 'a subtopic address would hide the flashcards page' });
    if (!revision[s.slug]) out.push({ where: `revision/${s.slug}.yaml`, message: `${s.code} ${s.title} has no revision file` });
  }

  const cardIds = { distinction: new Map<string, string>(), scenario: new Map<string, string>(), evaluation: new Map<string, string>() };
  const described = new Map<string, string>();

  for (const [file, r] of Object.entries(revision)) {
    const w = `revision/${file}`;
    const add = (message: string) => out.push({ where: w, message });
    const s = byCode.get(r.code);
    if (!s) {
      add(`code "${r.code}" is not a subtopic`);
      continue;
    }
    if (s.slug !== file) add(`the file for ${r.code} must be named ${s.slug}.yaml`);

    // Exercises
    const exIds = new Set<string>();
    r.exercises.forEach((x, i) => {
      const at = `exercise ${i + 1} (${x.id})`;
      if (exIds.has(x.id)) add(`${at}: the id is used twice`);
      exIds.add(x.id);
      const term = c.commandTerms[x.command];
      if (!term) add(`${at}: command term "${x.command}" is not in the register`);
      else if (!commandAllowed(term.ao, s, x.level)) add(`${at}: "${term.term}" (${term.ao}) is above the AO level of ${s.code}'s statements at ${x.level === 'HL' ? 'HL' : 'SL'}`);
      if (s.level === 'HL' && x.level !== 'HL') add(`${at}: ${s.code} is HL only, so the exercise must be marked HL`);
      if (!x.stem.toLowerCase().includes(x.business.toLowerCase())) add(`${at}: the stem does not name ${x.business}`);
    });
    r.mistakes.forEach((m, i) => {
      if (s.level === 'HL' && m.level !== 'HL') add(`mistake ${i + 1}: ${s.code} is HL only, so the mistake must be marked HL`);
    });

    // Formulas this file describes
    for (const id of Object.keys(r.formulas)) {
      if (!formulaIds.has(id)) add(`formula "${id}" is not in the formula register`);
      const prev = described.get(id);
      if (prev) add(`formula "${id}" is also described in revision/${prev}`);
      described.set(id, file);
    }

    // Cards written here
    const cards = [
      ...r.distinctions.map((d) => ({ kind: 'distinction' as const, id: d.id, codes: d.codes, level: d.level, stem: undefined as string | undefined, business: undefined as string | undefined })),
      ...r.scenarios.map((d) => ({ kind: 'scenario' as const, id: d.id, codes: d.codes, level: d.level, stem: d.stem, business: d.business })),
      ...r.evaluations.map((d) => ({ kind: 'evaluation' as const, id: d.id, codes: d.codes, level: d.level, stem: undefined, business: undefined })),
    ];
    for (const x of cards) {
      const at = `${x.kind} "${x.id}"`;
      const prev = cardIds[x.kind].get(x.id);
      if (prev) add(`${at}: the id is also used in revision/${prev}`);
      cardIds[x.kind].set(x.id, file);
      const codes = x.codes.length ? x.codes : [r.code];
      codes.forEach((code) => validCode(code) || add(`${at}: "${code}" is not a subtopic`));
      const subjects = codes.filter((code) => code !== 'toolkit');
      if (subjects.length && subjects.every(hlOnly) && x.level !== 'HL') add(`${at}: every subtopic it belongs to is HL only, so it must be marked HL`);
      if (x.stem && x.business && !x.stem.toLowerCase().includes(x.business.toLowerCase())) add(`${at}: the stem does not name ${x.business}`);
    }

    r.hlRecall.forEach((id) => recallIds.has(id) || add(`hlRecall: "${id}" is not a recall card`));
  }
  return out;
}
