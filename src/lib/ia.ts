/**
 * Checks for the internal assessment planner. Pure functions, shared by the
 * page script and the unit tests. Each rule cites the document it comes from:
 * the Business management guide (first assessment 2024) or the teacher support
 * material (TSM, 2022). The checks help a student plan; they do not replace
 * the teacher's approval or the guide.
 */

export type DocKind = 'primary' | 'secondary' | 'transcript' | 'textbook';

export interface SupportingDoc {
  title: string;
  publisher: string;
  /** Publication month as "YYYY-MM", or empty if not known yet. */
  published: string;
  kind: DocKind;
  /** Length in A4 pages, or 0 if not known yet. */
  pages: number;
  /** Chosen as one of the three to five supporting documents. */
  selected: boolean;
}

export type Severity = 'problem' | 'advice' | 'ok';

export interface Finding {
  severity: Severity;
  text: string;
  /** Where the rule comes from. */
  source: string;
  /** Index of the document concerned, if the finding is about one document. */
  doc?: number;
}

export const IA_LIMITS = {
  words: 1800,
  minDocs: 3,
  maxDocs: 5,
  maxTranscripts: 1,
  maxYears: 3,
  recommendedPages: 5,
  totalMarks: 25,
} as const;

/** Parses "YYYY-MM" into a month count, or null. */
export function monthIndex(ym: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

/** The earliest publication month that is still within three years of submission. */
export function earliestAllowed(submission: string): string | null {
  const s = monthIndex(submission);
  if (s === null) return null;
  const e = s - IA_LIMITS.maxYears * 12;
  return `${Math.floor(e / 12)}-${String((e % 12) + 1).padStart(2, '0')}`;
}

/** Whole months between publication and submission, or null if either is missing. */
export function ageInMonths(published: string, submission: string): number | null {
  const p = monthIndex(published);
  const s = monthIndex(submission);
  if (p === null || s === null) return null;
  return s - p;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2024-04" as "April 2024". */
export function monthLabel(ym: string): string {
  const i = monthIndex(ym);
  return i === null ? ym : `${MONTHS[i % 12]} ${Math.floor(i / 12)}`;
}

/**
 * Checks the documents marked as selected against the guide's requirements
 * and the TSM's advice. `submission` is the month the project is submitted to
 * the IB ("YYYY-MM"); the guide counts the three years back from it.
 */
export function checkDocuments(docs: SupportingDoc[], submission: string): Finding[] {
  const out: Finding[] = [];
  const chosen = docs.map((d, i) => ({ d, i })).filter(({ d }) => d.selected);
  const n = chosen.length;

  if (n === 0) {
    out.push({ severity: 'advice', text: 'No documents are selected yet. List the candidates, then select three to five.', source: 'Guide, p. 53' });
  } else if (n < IA_LIMITS.minDocs) {
    out.push({ severity: 'problem', text: `${n} selected. The project needs three to five supporting documents.`, source: 'Guide, p. 53' });
  } else if (n > IA_LIMITS.maxDocs) {
    out.push({
      severity: 'problem',
      text: `${n} selected. More than five supporting documents limits criterion B to 1 mark.`,
      source: 'TSM, p. 71',
    });
  } else if (n === 3) {
    out.push({
      severity: 'advice',
      text: 'Three selected, which meets the requirement. For the top mark in criterion B the TSM advises at least four, preferably five.',
      source: 'TSM, p. 70',
    });
  } else {
    out.push({ severity: 'ok', text: `${n} selected, within three to five.`, source: 'Guide, p. 53' });
  }

  const earliest = earliestAllowed(submission);
  for (const { d, i } of chosen) {
    const name = d.title.trim() || `Document ${i + 1}`;
    if (d.kind === 'textbook') {
      out.push({ severity: 'problem', text: `${name}: textbooks and class notes can be cited, but are not accepted as supporting documents.`, source: 'Guide, p. 55', doc: i });
    }
    const age = ageInMonths(d.published, submission);
    if (age !== null && age > IA_LIMITS.maxYears * 12) {
      out.push({
        severity: 'problem',
        text: `${name}: published more than three years before submission${earliest ? ` (the earliest allowed is ${monthLabel(earliest)})` : ''}.`,
        source: 'Guide, p. 54',
        doc: i,
      });
    } else if (age !== null && age < 0) {
      out.push({ severity: 'problem', text: `${name}: the publication date is after the submission date. Check both dates.`, source: 'Guide, p. 54', doc: i });
    } else if (d.published.trim() === '') {
      out.push({ severity: 'advice', text: `${name}: add the publication month so its age can be checked.`, source: 'Guide, p. 54', doc: i });
    } else if (monthIndex(d.published) === null) {
      out.push({ severity: 'advice', text: `${name}: write the publication month as year and month, for example 2026-03.`, source: 'Guide, p. 54', doc: i });
    }
    if (d.pages > IA_LIMITS.recommendedPages) {
      out.push({
        severity: 'advice',
        text: `${name}: ${d.pages} pages. The guide recommends no more than the equivalent of five A4 pages; use an extract.`,
        source: 'Guide, p. 55',
        doc: i,
      });
    }
  }

  const transcripts = chosen.filter(({ d }) => d.kind === 'transcript').length;
  if (transcripts > IA_LIMITS.maxTranscripts) {
    out.push({ severity: 'problem', text: `${transcripts} transcripts selected. At most one supporting document may be a transcript of video or audio.`, source: 'Guide, p. 54' });
  }

  const publishers = new Set(chosen.map(({ d }) => norm(d.publisher)).filter((p) => p !== ''));
  const named = chosen.filter(({ d }) => norm(d.publisher) !== '').length;
  if (n >= 2 && named === n && publishers.size === 1) {
    out.push({
      severity: 'advice',
      text: 'Every selected document comes from the same publisher. Documents from a single source are unlikely to give the range of ideas and views the top levels need.',
      source: 'Guide, p. 54',
    });
  }

  if (submission.trim() === '' && n > 0) {
    out.push({ severity: 'advice', text: 'Add the month you will submit to the IB, so the three-year rule can be checked.', source: 'Guide, p. 54' });
  }
  return out;
}

/** Status of a word count against the limit. */
export function wordStatus(words: number): { severity: Severity; text: string } {
  if (!Number.isFinite(words) || words <= 0) return { severity: 'advice', text: 'Enter the count of the words that count.' };
  if (words > IA_LIMITS.words) {
    return { severity: 'problem', text: `${words - IA_LIMITS.words} words over. Moderators do not read beyond 1,800 words, and the teacher marks only the first 1,800.` };
  }
  return { severity: 'ok', text: `${IA_LIMITS.words - words} words left.` };
}

/** The date `days` before an ISO date ("YYYY-MM-DD"), as an ISO date, or null. */
export function daysBefore(iso: string, days: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(t)) return null;
  const d = new Date(t - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Sum of self-assessed marks, each capped at its criterion's maximum. */
export function selfMarkTotal(marks: Record<string, number>, criteria: Array<{ id: string; marks: number }>): number {
  return criteria.reduce((n, k) => n + Math.max(0, Math.min(k.marks, Math.floor(marks[k.id] ?? 0))), 0);
}
