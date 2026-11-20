/**
 * A subtopic's revision sheet, gathered from the content: the key points from
 * its notes (or its brief), its IB glossary terms, its formulae from the
 * formula register, the frameworks and toolkit tools tagged with it, its
 * common examination mistakes and its application exercises. Pure: the pages
 * render what this returns, and the unit tests check it.
 */
import type { Corpus } from '../integrity';
import type { Framework } from '../framework-schema';
import type { Level } from '../schemas';
import type { Formula } from './formulae';
import type { Subtopic } from './integrity';
import type { Exercise, RevisionEntry } from './schema';

export interface SheetTerm {
  id: string;
  term: string;
  /** Light markup. */
  definition: string;
  level: Level;
  href: string;
}

export interface SheetFramework {
  id: string;
  name: string;
  status: Framework['status'];
  level: Level;
  /** What it is for, in a sentence. */
  purpose: string;
  /** A situation it suits. */
  use: string;
  /** One limitation. */
  limitation: string;
  href: string;
}

export interface SheetMistake {
  /** The mistake, in light markup. A belief the glossary corrects is quoted. */
  text: string;
  /** How to avoid it, where the source says. */
  fix?: string;
  level: Level;
  /** Where the content holds it; absent for the platform's own advice written for the sheet. */
  source?: { label: string; href: string };
}

export interface SheetExercise extends Exercise {
  /** The command term as the guide writes it ("Explain"). */
  commandLabel: string;
  ao: string;
}

export interface RecallSet {
  code: string;
  /** The retrieval cards' set id (bb:rc:<set>), shared with the page the questions come from. */
  set: string;
  items: Array<{ q: string; a: string }>;
  /** Card ids, one per item (src/lib/flashcards.ts recallIds). */
  ids: string[];
  href: string;
  /** "3.5 notes" or "3.3 brief". */
  label: string;
}

export interface Sheet {
  code: string;
  title: string;
  slug: string;
  unit: number;
  unitTitle: string;
  level: Subtopic['level'];
  /** The decision a brief is built around, shown as the old revision briefs showed it. */
  question?: string;
  /** True when an SL/HL subtopic's sheet carries HL-only items, so it needs the level switch. */
  hasHL: boolean;
  points: string[];
  terms: SheetTerm[];
  formulae: Formula[];
  frameworks: SheetFramework[];
  mistakes: SheetMistake[];
  exercises: SheetExercise[];
  recall: RecallSet | null;
  notesHref: string;
  /** Whether the full treatment is notes or a brief. */
  notesKind: 'notes' | 'brief';
  flashcardsHref: string;
  /** Cards in the flashcard deck for the subtopic. */
  cards: number;
}

/** At most this many mistakes on a sheet. */
export const MAX_MISTAKES = 6;

const STATUS_ORDER: Record<Framework['status'], number> = { syllabus: 0, toolkit: 1, enrichment: 2 };

const firstSentence = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(flat);
  return (m ? m[1] : flat) ?? flat;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Sentences in a set of notes that name a common error, from the exam-style
 * answers and the sections. Sentences that quote a figure belong to their
 * question and are left there.
 */
export function noteErrors(note: Corpus['notes'][string]): Array<{ text: string; level: Level }> {
  const out: Array<{ text: string; level: Level }> = [];
  // "A common error is to …", "… is a common error.": the sentence states the mistake itself.
  const RE = /^(a|the) common (error|mistake|confusion)\b|\bis a common (error|mistake|confusion)\.$/i;
  const scan = (text: string, level: Level) => {
    for (const line of text.split('\n')) {
      for (const raw of line.replace(/^\s*-\s+/, '').split(/(?<=[.!?])\s+(?=[A-Z*"])/)) {
        const sent = raw.trim();
        if (RE.test(sent) && !/\d/.test(sent) && sent.length >= 30) out.push({ text: sent, level });
      }
    }
  };
  for (const s of note.sections) {
    scan(s.body, s.level);
    for (const p of s.points) scan(p.text, s.level === 'HL' || p.level === 'HL' ? 'HL' : 'SL/HL');
  }
  for (const q of note.exam) scan(q.answer, q.level);
  return out;
}

export interface SheetInput {
  c: Corpus;
  s: Subtopic;
  frameworks: Record<string, Framework>;
  formulae: readonly Formula[];
  revision: RevisionEntry | undefined;
  recall: readonly RecallSet[];
  subtopicHref: (code: string) => string;
  cards: number;
}

export function buildSheet({ c, s, frameworks, formulae, revision, recall, subtopicHref, cards }: SheetInput): Sheet {
  const code = s.code;
  const note = Object.values(c.notes).find((n) => n.code === code);
  const briefId = Object.entries(c.topics).find(([, t]) => t.code === code)?.[0];
  const brief = briefId ? c.topics[briefId] : undefined;
  const pageHref = subtopicHref(code);

  // Key points: the notes' revision summary, or the brief's.
  const points = note?.summary.length ? note.summary : (brief?.revision.keyPoints ?? []);

  // Key definitions: the IB glossary terms of the subtopic, and those its brief names, A to Z. Terms beyond the course are left out.
  const named = new Set(brief?.related.glossary ?? []);
  const terms: SheetTerm[] = Object.entries(c.glossary)
    .filter(([id, g]) => g.provenance !== 'enrichment' && (g.subtopics.includes(code) || named.has(id)))
    .sort((a, b) => a[1].term.localeCompare(b[1].term, 'en', { sensitivity: 'base' }))
    .map(([id, g]) => ({ id, term: g.term, definition: g.definition, level: g.level, href: `/glossary/${id}/` }));

  // Formulae: the register's for the subtopic, and those a brief names.
  const own = formulae.filter((f) => f.codes.includes(code));
  const briefFormulae = (brief?.related.calculations ?? []).map((id) => formulae.find((f) => f.id === id)).filter((f): f is Formula => Boolean(f) && !own.includes(f as Formula));
  const sheetFormulae = [...own, ...briefFormulae];

  // Frameworks: tagged with the subtopic, and the toolkit tools the curriculum or the brief names for it.
  const toolIds = new Set([...s.tools, ...(brief?.related.tools ?? [])]);
  const sheetFrameworks: SheetFramework[] = Object.entries(frameworks)
    .filter(([id, f]) => f.subtopics.includes(code) || (f.tool && toolIds.has(f.tool)) || toolIds.has(id))
    .sort((a, b) => STATUS_ORDER[a[1].status] - STATUS_ORDER[b[1].status] || a[1].name.localeCompare(b[1].name, 'en', { sensitivity: 'base' }))
    .map(([id, f]) => ({
      id,
      name: f.name,
      status: f.status,
      level: f.level,
      purpose: firstSentence(f.purpose),
      use: f.situations.suits[0] ?? f.question,
      limitation: f.limitations[0] ?? '',
      href: `/frameworks/${id}/`,
    }));

  // Common mistakes: what the content already holds, then the platform's own advice written for the sheet.
  const written = (revision?.mistakes ?? []).map((m): SheetMistake => ({ text: m.mistake, fix: m.fix, level: m.level }));
  const room = Math.max(0, MAX_MISTAKES - written.length);
  const sourced: SheetMistake[] = [];
  const seen = new Set<string>();
  const add = (m: SheetMistake, cap: { left: number }) => {
    const k = norm(m.text);
    if (cap.left <= 0 || sourced.length >= room || seen.has(k)) return;
    seen.add(k);
    sourced.push(m);
    cap.left--;
  };
  if (brief && briefId) {
    const at = { label: `${code} brief`, href: `/topics/${briefId}/#revision` };
    const cap = { left: 4 };
    brief.revision.traps.forEach((t) => add({ text: t, level: 'SL/HL', source: at }, cap));
    const mis = { left: 2 };
    brief.sections
      .flatMap((x) => x.blocks)
      .forEach((b) => b.type === 'misconception' && add({ text: `“${b.claim.trim()}”`, fix: b.correction.trim(), level: b.level, source: { label: `${code} brief`, href: `/topics/${briefId}/` } }, mis));
  }
  if (note) {
    const cap = { left: 2 };
    noteErrors(note).forEach((e) => add({ text: e.text, level: e.level, source: { label: `${code} notes`, href: pageHref } }, cap));
  }
  {
    // The glossary's misconceptions, key terms first: the notes' or brief's own list, then A to Z.
    const keyOrder = [...(note?.terms ?? []), ...(brief?.related.glossary ?? [])];
    const rank = (id: string) => {
      const i = keyOrder.indexOf(id);
      return i < 0 ? 1000 : i;
    };
    const cap = { left: 3 };
    terms
      .slice()
      .sort((a, b) => rank(a.id) - rank(b.id) || a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))
      .forEach((t) => {
        const m = c.glossary[t.id]?.misconceptions[0];
        if (m) add({ text: `“${m.claim}”`, fix: m.correction, level: t.level, source: { label: `Glossary: ${t.term}`, href: t.href } }, cap);
      });
  }
  {
    const cap = { left: 2 };
    Object.entries(c.calculations)
      .filter(([, k]) => k.status === 'complete' && k.syllabus.some((x) => x.code === code))
      .sort((a, b) => a[1].order - b[1].order)
      .forEach(([id, k]) => {
        const e = k.errors[0];
        if (e) add({ text: e, level: k.level, source: { label: `Calculation: ${k.name}`, href: `${k.page}#calc-${id}` } }, cap);
      });
  }
  {
    // A framework's mistakes belong on the sheet of the subtopic it serves first, or of one whose toolkit tool it is.
    const cap = { left: 2 };
    sheetFrameworks
      .filter((f) => f.status !== 'enrichment' && (frameworks[f.id]?.subtopics[0] === code || toolIds.has(frameworks[f.id]?.tool ?? f.id)))
      .forEach((f) => {
        const m = frameworks[f.id]?.mistakes[0];
        if (m) add({ text: m.mistake, fix: m.fix, level: f.level, source: { label: f.name, href: f.href } }, cap);
      });
  }
  const mistakes = [...sourced, ...written];

  const exercises: SheetExercise[] = (revision?.exercises ?? []).map((x) => ({
    ...x,
    commandLabel: c.commandTerms[x.command]?.term ?? x.command,
    ao: c.commandTerms[x.command]?.ao ?? '',
  }));

  const sheetRecall = recall.find((r) => r.code === code && r.set.startsWith('notes-')) ?? recall.find((r) => r.code === code) ?? null;

  const hl = (l: string) => l === 'HL';
  const hasHL =
    s.level !== 'HL' &&
    (s.level === 'SL/HL with HL-only content' ||
      terms.some((t) => hl(t.level)) ||
      sheetFormulae.some((f) => hl(f.level)) ||
      sheetFrameworks.some((f) => hl(f.level)) ||
      mistakes.some((m) => hl(m.level)) ||
      exercises.some((x) => hl(x.level)));

  return {
    code,
    title: s.title,
    slug: s.slug,
    unit: s.unit,
    unitTitle: s.unitTitle,
    level: s.level,
    question: brief?.decisionQuestion,
    hasHL,
    points,
    terms,
    formulae: sheetFormulae,
    frameworks: sheetFrameworks,
    mistakes,
    exercises,
    recall: sheetRecall,
    notesHref: pageHref,
    notesKind: note ? 'notes' : 'brief',
    flashcardsHref: `/revision/flashcards/?topic=${code}`,
    cards,
  };
}
