/**
 * The quick supporting-document checker on the internal assessment page, as
 * pure functions. The guide's rules (the number of documents, the three
 * years, who chose them, transcripts and textbooks) come from src/lib/ia.ts,
 * the same rules the IA Studio planner and the documents tool apply, to the
 * same precision: the month. The range of voices, data to analyse and length
 * are checked beside them, each labelled by its standing.
 */
import { IA_LIMITS, earliestAllowed, monthLabel, publishedRange, submissionMonth, threeYearRule } from './ia';
import type { Standing } from './guide-labels';

export interface Doc {
  title: string;
  /** Publication date: "YYYY-MM", or "YYYY" while the month is not known. */
  published: string;
  voice: string;
  data: boolean;
  long: boolean;
  teacher: boolean;
  textbook: boolean;
  transcript: boolean;
}

export interface Check {
  ok: boolean | 'tip';
  text: string;
  why: string;
  standing: Exclude<Standing, 'example'>;
  /** Where the rule comes from, when it is not the platform's own. */
  source?: string;
}

export const VOICE_IDS = ['org', 'independent', 'commercial', 'primary', 'sceptical', 'other'] as const;

export const blankDoc = (): Doc => ({ title: '', published: '', voice: 'org', data: false, long: false, teacher: false, textbook: false, transcript: false });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The checks, as a pure function so the unit tests can reach it. `submission`
 * is the month the project goes to the IB, "YYYY-04" or "YYYY-10".
 */
export function checkDocuments(docs: Doc[], submission: string): Check[] {
  const used = docs.filter((d) => d.title.trim() || d.published.trim());
  const n = used.length;
  const out: Check[] = [];
  out.push({
    ok: n >= IA_LIMITS.minDocs && n <= IA_LIMITS.maxDocs,
    text: `${plural(n, 'document', 'documents')}: the guide asks for three to five.`,
    why: 'With one or two, or more than five, criterion B can reach only its lowest level, 1 mark.',
    standing: 'ib',
    source: 'Guide, pp. 53 and 57',
  });

  const verdicts = used.map((d) => ({ d, v: threeYearRule(d.published, submission) }));
  const count = (v: string) => verdicts.filter((x) => x.v === v).length;
  const tooOld = count('too-old');
  const after = count('after');
  const unclear = verdicts.filter((x) => x.v === 'unclear');
  const undated = count('missing') + count('unreadable');
  const earliest = earliestAllowed(submission);
  const from = earliest ? `the earliest allowed is ${monthLabel(earliest)}` : '';
  if (undated) {
    out.push({ ok: 'tip', text: `${plural(undated, 'document', 'documents')} without a publication date: add the month and year so the three-year rule can be checked.`, why: 'It is the publication date that counts, not the date of the event.', standing: 'ib', source: 'Guide, p. 54' });
  }
  if (n > undated) {
    out.push({
      ok: tooOld === 0 && after === 0 && unclear.length === 0,
      text:
        tooOld > 0
          ? `${tooOld} published more than three years before your submission${from ? `: ${from}` : ''}.`
          : after > 0
            ? `${after} dated after your submission: check the date.`
            : unclear.length > 0
              ? `${plural(unclear.length, 'document', 'documents')} from ${[...new Set(unclear.map((x) => x.d.published.trim()))].join(' and ')} without a month: add it, because in that year the rule depends on the month${from ? ` (${from})` : ''}.`
              : 'Published within the three years before submission.',
      why: 'Each document must be published within the three years before submission; the event it describes can be older.',
      standing: 'ib',
      source: 'Guide, p. 54',
    });
  }
  const teacher = used.filter((d) => d.teacher).length;
  out.push({ ok: teacher === 0, text: teacher ? `${teacher} supplied by your teacher: you must choose your own.` : 'Chosen by you, not supplied by your teacher.', why: 'The documents are part of the work being assessed.', standing: 'ib', source: 'Guide, p. 55' });
  const transcripts = used.filter((d) => d.transcript).length;
  out.push({
    ok: transcripts <= IA_LIMITS.maxTranscripts,
    text: transcripts > 1 ? `${transcripts} transcripts: at most one is allowed.` : 'At most one transcript of audio or video.',
    why: 'A transcript must give the essential points of the original; the guide asks for material from a reliable organization, referenced so the original can be traced.',
    standing: 'ib',
    source: 'Guide, p. 54',
  });
  const textbooks = used.filter((d) => d.textbook).length;
  out.push({ ok: textbooks === 0, text: textbooks ? `${textbooks} textbook or class-note documents: reference them instead.` : 'No textbook or class notes as documents.', why: 'Textbooks and class notes are referenced, but not accepted as supporting documents.', standing: 'ib', source: 'Guide, p. 55' });

  const allOrg = n > 0 && used.every((d) => d.voice === 'org');
  out.push({
    ok: n > 0 && !allOrg,
    text: allOrg ? 'Every document is from the organization itself: the set lacks balance.' : n > 0 ? 'Not every document speaks for the organization itself.' : 'No documents listed yet.',
    why: 'The guide strongly recommends a range of ideas and views, and gives documents published by a single company as an example of a set without balance; the top level of criterion B asks for that range.',
    standing: 'ib',
    source: 'Guide, pp. 54 and 57',
  });
  const voices = new Set(used.map((d) => d.voice));
  out.push({
    ok: voices.size >= 3 ? true : 'tip',
    text: `${plural(voices.size, 'different voice', 'different voices')} in the set.`,
    why: 'The platform suggests at least three, inside and outside the organization: the firm, independent data, your own research, a sceptic.',
    standing: 'strategy',
  });
  const dataRich = used.filter((d) => d.data).length;
  out.push({ ok: n > 0 && dataRich >= Math.min(3, n), text: `${dataRich} with data you can analyse with a tool.`, why: 'Criterion D rewards document data used to analyse; a set without figures leaves little to work with.', standing: 'strategy' });
  const long = used.filter((d) => d.long).length;
  out.push({
    ok: long ? 'tip' : true,
    text: long ? `${long} longer than five A4 pages: use the part you need, or choose a shorter source.` : 'None longer than five A4 pages.',
    why: 'The guide recommends that no document exceeds the equivalent of five A4 pages. It is a recommendation, not a rule.',
    standing: 'ib',
    source: 'Guide, p. 55',
  });
  if (used.some((d) => d.voice === 'primary'))
    out.push({ ok: 'tip', text: 'For primary research, attach the blank questionnaire and a tally, or the interview questions and a summary.', why: 'That is the form the guide gives for primary research as a supporting document.', standing: 'ib', source: 'Guide, p. 54' });
  if (n > 0)
    out.push({
      ok: 'tip',
      text: 'Before you submit, highlight the parts you use in each document, and translate any highlighted part not in the language you are registered in.',
      why: 'Both are musts. Label each one "Supporting document 1" and so on, as the guide asks.',
      standing: 'ib',
      source: 'Guide, p. 55',
    });
  return out;
}

export interface AnalyserState {
  docs: Doc[];
  /** The year of submission to the IB, or null while not given. */
  year: number | null;
  month: 'april' | 'october';
}

/** The submission month the checks count back from, or "" while the year is missing. */
export const submissionOf = (s: AnalyserState): string => (s.year ? submissionMonth(s.year, s.month) : '');

/**
 * Saved state, read defensively: anything malformed is dropped. Older saves
 * kept a publication year only ("2025") and the month of submission as 3 or
 * 9; both are read, the year as a date whose month is still to be added.
 */
export function parseAnalyserState(raw: unknown): AnalyserState {
  const out: AnalyserState = { docs: [], year: null, month: 'april' };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { docs?: unknown; year?: unknown; month?: unknown };
  if (typeof r.year === 'number' && Number.isInteger(r.year) && r.year >= 2000 && r.year <= 2100) out.year = r.year;
  out.month = r.month === 'october' || r.month === 9 || r.month === '9' ? 'october' : 'april';
  if (Array.isArray(r.docs)) {
    for (const d of r.docs.slice(0, 7)) {
      if (!d || typeof d !== 'object') continue;
      const x = d as Record<string, unknown>;
      const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
      const bool = (v: unknown) => v === true;
      let published = str(x.published, 7).trim();
      if (!published && typeof x.year === 'string' && /^\d{4}$/.test(x.year.trim())) published = x.year.trim();
      if (published && !publishedRange(published)) published = '';
      const voice = typeof x.voice === 'string' && (VOICE_IDS as readonly string[]).includes(x.voice) ? x.voice : 'org';
      out.docs.push({ title: str(x.title, 200), published, voice, data: bool(x.data), long: bool(x.long), teacher: bool(x.teacher), textbook: bool(x.textbook), transcript: bool(x.transcript) });
    }
  }
  return out;
}
