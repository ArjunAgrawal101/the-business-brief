/**
 * Builds the question bank from the corpus: every original practice question
 * in the questions collection, the exam-style practice in every set of notes,
 * and any analysis questions a case file carries. It runs at build time (the
 * page and the integrity gate) and in the unit tests, never in the browser.
 *
 * Case files may carry analysis questions (`analysisQuestions`) once the Case
 * Vault's fuller case structure is in place. They are read here without
 * depending on that field's schema, and any entry that cannot be read is
 * reported as a problem, so the build fails rather than silently dropping a
 * question.
 */
import type { Corpus } from './integrity';
import { plain } from './markup';
import { marksBand, normalize, questionType, unitOf, type Ao, type BankLevel, type BankSource, type Facets, type PaperStyle } from './bank';

export interface CaseQuestion {
  id: string;
  commandTerm: string;
  ao: Ao;
  marks: number;
  level: BankLevel;
  paper?: 'paper-1' | 'paper-2' | 'paper-3';
  syllabus: string[];
  exhibits: string[];
  prompt: string;
  guidance: string;
  answer?: string;
}

export interface BankItem extends Facets {
  /** The command term as written, for display ("Explain"). */
  commandName: string;
  prompt: string;
  stimulus?: string;
  /** Where the question lives in context. */
  href: string;
  /** "Practice question on the case Atelier Barro", "Notes on 4.4 Market research". */
  origin: string;
  /** The questions collection id, whose mark scheme the card renders. */
  questionId?: string;
  caseId?: string;
  exhibits: string[];
  /** For notes and case questions: what a strong response does (guidance, not a markscheme), and any worked answer. */
  guidance?: string;
  answer?: string;
  /** Order in the bank: by subtopic, then source order. */
  order: number;
}

export interface Subtopic {
  code: string;
  title: string;
  unit: number;
  unitTitle: string;
  level: string;
}

const AOS: readonly string[] = ['AO1', 'AO2', 'AO3', 'AO4'];

export function subtopicsOf(c: Corpus): Subtopic[] {
  const cur = c.curricula['ib-dp-bm'];
  return (cur?.units ?? []).flatMap((u) => u.subtopics.map((s) => ({ code: s.code, title: s.title, unit: u.number, unitTitle: u.title, level: s.level })));
}

/** The same rule as the site's slug(): the address of a subtopic page. */
function slugOf(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** A subtopic's page: its brief when one carries its name, otherwise its hub (both at /topics/<slug>/). */
export function subtopicPage(subs: Subtopic[], code: string): string {
  const s = subs.find((x) => x.code === code);
  return s ? `/topics/${slugOf(s.title)}/` : '/topics/';
}

const codeKey = (code: string) => {
  const [a, b] = code.split('.').map(Number);
  return (a ?? 0) * 100 + (b ?? 0);
};

/** Reads one case question without trusting its shape; returns the question or why it cannot be read. */
export function readCaseQuestion(raw: unknown): CaseQuestion | string {
  if (!raw || typeof raw !== 'object') return 'not an object';
  const q = raw as Record<string, unknown>;
  const str = (k: string) => (typeof q[k] === 'string' && (q[k] as string).trim() !== '' ? (q[k] as string) : null);
  const id = str('id');
  const commandTerm = str('commandTerm');
  const prompt = str('prompt');
  const guidance = str('guidance');
  if (!id) return 'no id';
  if (!commandTerm) return `${id}: no command term`;
  if (!prompt) return `${id}: no prompt`;
  if (!guidance) return `${id}: no guidance`;
  if (typeof q.ao !== 'string' || !AOS.includes(q.ao)) return `${id}: no assessment objective`;
  if (typeof q.marks !== 'number' || !Number.isInteger(q.marks) || q.marks < 1) return `${id}: marks must be a whole number above zero`;
  const syllabus = Array.isArray(q.syllabus) ? q.syllabus.filter((x): x is string => typeof x === 'string') : [];
  if (!syllabus.length) return `${id}: no syllabus codes`;
  const paper = q.paper === 'paper-1' || q.paper === 'paper-2' || q.paper === 'paper-3' ? q.paper : undefined;
  return {
    id,
    commandTerm,
    ao: q.ao as Ao,
    marks: q.marks,
    level: q.level === 'HL' ? 'HL' : 'SL/HL',
    paper,
    syllabus,
    exhibits: Array.isArray(q.exhibits) ? q.exhibits.filter((x): x is string => typeof x === 'string') : [],
    prompt,
    guidance,
    answer: str('answer') ?? undefined,
  };
}

export interface Bank {
  items: BankItem[];
  subtopics: Subtopic[];
  problems: Array<{ where: string; message: string }>;
}

/** The whole bank, in syllabus order, with any problem found while reading it. */
export function buildBank(c: Corpus): Bank {
  const subs = subtopicsOf(c);
  const subByCode = new Map(subs.map((s) => [s.code, s]));
  const problems: Bank['problems'] = [];
  const items: BankItem[] = [];
  const termIds = Object.keys(c.commandTerms);
  /** A command term by id ("explain") or by name ("Explain"). */
  const resolve = (t: string): string | null => {
    if (c.commandTerms[t]) return t;
    const k = termIds.find((id) => c.commandTerms[id]?.term.toLowerCase() === t.trim().toLowerCase());
    return k ?? null;
  };

  const add = (
    where: string,
    base: {
      id: string;
      source: BankSource;
      title: string;
      prompt: string;
      stimulus?: string;
      command: string;
      ao?: string;
      marks: number;
      level: BankLevel;
      paper: PaperStyle;
      codes: string[];
      href: string;
      origin: string;
      questionId?: string;
      caseId?: string;
      caseTitle?: string;
      exhibits?: string[];
      guidance?: string;
      answer?: string;
      calculation?: boolean;
      evaluation?: boolean;
      order: number;
    },
  ) => {
    const termId = resolve(base.command);
    if (!termId) {
      problems.push({ where, message: `command term "${base.command}" is not in the register` });
      return;
    }
    const term = c.commandTerms[termId];
    if (!term) return;
    const ao = (base.ao && AOS.includes(base.ao) ? base.ao : term.ao) as Ao;
    const known = base.codes.filter((code) => subByCode.has(code));
    base.codes.filter((code) => !subByCode.has(code)).forEach((code) => problems.push({ where, message: `subtopic ${code} is not in the curriculum` }));
    if (!known.length) return;
    const units = [...new Set(known.map(unitOf).filter((u): u is number => u !== null))];
    const text = normalize(
      [base.title, plain(base.stimulus ?? ''), plain(base.prompt), term.term, base.caseTitle ?? '', ...known.map((k) => `${k} ${subByCode.get(k)?.title ?? ''}`)].join(' '),
    );
    items.push({
      id: base.id,
      source: base.source,
      title: base.title,
      prompt: base.prompt,
      stimulus: base.stimulus,
      command: termId,
      commandName: term.term,
      ao,
      marks: base.marks,
      level: base.level,
      paper: base.paper,
      codes: known,
      units,
      band: marksBand(base.marks),
      type: questionType(termId, ao, { calculation: base.calculation, evaluation: base.evaluation }),
      text,
      href: base.href,
      origin: base.origin,
      questionId: base.questionId,
      caseId: base.caseId,
      exhibits: base.exhibits ?? [],
      guidance: base.guidance,
      answer: base.answer,
      order: codeKey(known[0] ?? '9.99') * 1000 + base.order,
    });
  };

  /* The questions collection */
  for (const [id, q] of Object.entries(c.questions)) {
    const theCase = q.case ? c.cases[q.case] : undefined;
    add(`questions/${id}`, {
      id: `q-${id}`,
      source: 'question',
      title: q.title,
      prompt: q.prompt,
      stimulus: q.stimulus,
      command: q.commandTerm,
      ao: q.ao,
      marks: q.marks,
      level: q.level === 'HL' ? 'HL' : 'SL/HL',
      paper: q.paperStyle,
      codes: q.syllabus,
      href: `/exam-desk/practice/#q-${id}`,
      origin: theCase ? `Practice question on the case ${theCase.title}` : 'Practice question',
      questionId: id,
      caseId: theCase ? q.case : undefined,
      caseTitle: theCase?.title,
      exhibits: theCase ? q.exhibits : [],
      calculation: q.requiresCalculation,
      evaluation: q.requiresEvaluation,
      order: q.order % 1000,
    });
  }

  /* Exam-style practice in the notes */
  for (const [nid, n] of Object.entries(c.notes)) {
    const sub = subByCode.get(n.code);
    n.exam.forEach((q, i) => {
      add(`notes/${nid}#exam-${i + 1}`, {
        id: `n-${nid}-${i + 1}`,
        source: 'note',
        title: `${n.title}: question ${i + 1}`,
        prompt: q.q,
        command: q.command,
        marks: q.marks,
        level: n.level === 'HL' || q.level === 'HL' ? 'HL' : 'SL/HL',
        paper: q.paper ? (`paper-${q.paper}` as PaperStyle) : 'general',
        codes: [n.code],
        href: `${subtopicPage(subs, n.code)}#nv-exam-h`,
        origin: `Notes on ${n.code} ${sub?.title ?? n.title}`,
        guidance: q.answer,
        order: 500 + i,
      });
    });
  }

  /* Analysis questions in case files, where a case carries them */
  for (const [cid, cs] of Object.entries(c.cases)) {
    const raw = (cs as unknown as Record<string, unknown>).analysisQuestions;
    if (raw === undefined) continue;
    if (!Array.isArray(raw)) {
      problems.push({ where: `cases/${cid}`, message: 'analysisQuestions is not a list' });
      continue;
    }
    raw.forEach((entry, k) => {
      const q = readCaseQuestion(entry);
      if (typeof q === 'string') {
        problems.push({ where: `cases/${cid}#analysisQuestions[${k}]`, message: `the question bank cannot read this question (${q})` });
        return;
      }
      q.exhibits.forEach((e) => {
        if (!cs.exhibits.some((x) => x.id === e)) problems.push({ where: `cases/${cid}#${q.id}`, message: `exhibit "${e}" is not in the case` });
      });
      add(`cases/${cid}#${q.id}`, {
        id: `c-${cid}-${q.id}`,
        source: 'case',
        title: `${cs.title}: question ${k + 1}`,
        prompt: q.prompt,
        command: q.commandTerm,
        ao: q.ao,
        marks: q.marks,
        level: q.level,
        paper: q.paper ?? 'general',
        codes: q.syllabus,
        href: `/cases/${cid}/`,
        origin: `Analysis question in the case ${cs.title}`,
        caseId: cid,
        caseTitle: cs.title,
        exhibits: q.exhibits.filter((e) => cs.exhibits.some((x) => x.id === e)),
        guidance: q.guidance,
        answer: q.answer,
        order: 800 + k,
      });
    });
  }

  const ids = new Set<string>();
  for (const it of items) {
    if (ids.has(it.id)) problems.push({ where: 'question bank', message: `two questions share the id "${it.id}"` });
    ids.add(it.id);
  }
  items.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { items, subtopics: subs, problems };
}

/** The browser's copy of each question: the facets, and nothing it does not need. */
export function facetsOf(it: BankItem): Facets {
  return { id: it.id, units: it.units, codes: it.codes, paper: it.paper, level: it.level, command: it.command, ao: it.ao, marks: it.marks, band: it.band, type: it.type, source: it.source, title: it.title, text: it.text };
}
