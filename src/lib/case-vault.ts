/**
 * The Case Vault: labels for the archive's classification, the Case of the
 * Week, and the filters. Everything here is pure, so the page renders its
 * default state at build time with the same code the browser runs, and the
 * unit tests (tests/unit/case-vault.test.ts) check it against dates and
 * selections worked by hand.
 *
 * The Case of the Week rotates through the archive one ISO week at a time.
 * ISO 8601 weeks start on Monday, and week 1 of a year is the week that holds
 * the year's first Thursday, so 29 December 2025 is in week 1 of 2026 and
 * 1 January 2027 is in week 53 of 2026. The rotation counts whole weeks from
 * a fixed Monday, so it runs on without a jump across the end of a year.
 */
import { esc } from './markup';
import type { BusinessFunction, CaseEntry, CaseType, ConceptId, Difficulty, Industry, Qualification } from './schemas';

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const INDUSTRY_LABELS: Record<Industry, string> = {
  technology: 'Technology (software and platforms)',
  automobile: 'Automobile',
  retail: 'Retail',
  banking: 'Banking',
  fmcg: 'FMCG (fast-moving consumer goods)',
  healthcare: 'Healthcare',
  'e-commerce': 'E-commerce',
  education: 'Education',
  aviation: 'Aviation',
  sports: 'Sports',
  fashion: 'Fashion',
  'renewable-energy': 'Renewable energy',
  'social-enterprise': 'Social enterprise',
  hospitality: 'Hospitality and restaurants',
  logistics: 'Logistics and distribution',
  manufacturing: 'Manufacturing and craft',
};

export const FUNCTION_LABELS: Record<BusinessFunction, string> = {
  strategy: 'Strategy and management',
  'human-resources': 'Human resource management',
  finance: 'Finance and accounts',
  marketing: 'Marketing',
  operations: 'Operations management',
};

export const DIFFICULTY_LABELS: Record<Difficulty, { label: string; rank: number; description: string }> = {
  foundation: { label: 'Foundation', rank: 1, description: 'One central decision, clear evidence and short calculations.' },
  intermediate: { label: 'Intermediate', rank: 2, description: 'Several exhibits to combine, competing stakeholders and calculations in more than one step.' },
  advanced: { label: 'Advanced', rank: 3, description: 'Conflicting evidence, decisions that interact and a judgement no calculation settles.' },
};

export const QUALIFICATION_LABELS: Record<Qualification, { label: string; short: string }> = {
  'ib-dp-sl': { label: 'IB Diploma, standard level', short: 'IB DP SL' },
  'ib-dp-hl': { label: 'IB Diploma, higher level', short: 'IB DP HL' },
  undergraduate: { label: 'Undergraduate', short: 'Undergraduate' },
  mba: { label: 'MBA and advanced management', short: 'MBA' },
};

export const CASE_TYPE_LABELS: Record<CaseType, { label: string; description: string }> = {
  fictional: { label: 'Fictional', description: 'An invented organization. Every figure is simulated for teaching and checked for consistency.' },
  sourced: { label: 'Sourced', description: 'A real organization, from cited and dated sources.' },
};

export const CONCEPT_LABELS: Record<ConceptId, string> = {
  change: 'Change',
  creativity: 'Creativity',
  ethics: 'Ethics',
  sustainability: 'Sustainability',
};

/** How well the evidence supports each alternative, in the debrief. */
export const FIT_LABELS = {
  strong: 'Best supported by the evidence',
  conditional: 'Defensible if its conditions hold',
  weak: 'Weakly supported by the evidence',
} as const;

/* ------------------------------------------------------------------ */
/* ISO weeks and the Case of the Week                                  */
/* ------------------------------------------------------------------ */

/** A calendar date: year, month (1 to 12) and day. */
export interface CalendarDate {
  y: number;
  m: number;
  d: number;
}

const DAY = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The calendar date of a moment, in the reader's own time zone ("local") or in UTC. */
export function calendarDate(at: Date, zone: 'local' | 'utc' = 'local'): CalendarDate {
  return zone === 'utc'
    ? { y: at.getUTCFullYear(), m: at.getUTCMonth() + 1, d: at.getUTCDate() }
    : { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() };
}

const utc = (c: CalendarDate) => Date.UTC(c.y, c.m - 1, c.d);
/** ISO day of the week: Monday 1 to Sunday 7. */
const isoDay = (t: number) => ((new Date(t).getUTCDay() + 6) % 7) + 1;

/** The ISO 8601 week of a date: the week-numbering year and the week (1 to 53). */
export function isoWeek(c: CalendarDate): { year: number; week: number } {
  const t = utc(c);
  const thursday = t + (4 - isoDay(t)) * DAY;
  const year = new Date(thursday).getUTCFullYear();
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY / 7);
  return { year, week };
}

/** The Monday that starts the ISO week holding a date. */
export function weekMonday(c: CalendarDate): CalendarDate {
  const t = utc(c);
  return calendarDate(new Date(t - (isoDay(t) - 1) * DAY), 'utc');
}

/** The rotation counts weeks from Monday 1 January 2024, the first day of ISO week 1 of 2024. */
export const ROTATION_EPOCH: CalendarDate = { y: 2024, m: 1, d: 1 };

/** Whole weeks between the rotation's first Monday and the Monday of a date's ISO week (negative before it). */
export function weekIndex(c: CalendarDate): number {
  return Math.round((utc(weekMonday(c)) - utc(ROTATION_EPOCH)) / (7 * DAY));
}

/** The order the Case of the Week moves through: by case id, so that editing a title does not change the rotation. */
export function rotationOrder(ids: string[]): string[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export interface WeekPick {
  id: string;
  /** Position of the case in the rotation. */
  position: number;
  year: number;
  week: number;
  monday: CalendarDate;
}

/** The Case of the Week for a date. `order` is the rotation (see rotationOrder). */
export function caseOfTheWeek(order: string[], c: CalendarDate): WeekPick | null {
  if (!order.length) return null;
  const n = order.length;
  const position = ((weekIndex(c) % n) + n) % n;
  const { year, week } = isoWeek(c);
  return { id: order[position] as string, position, year, week, monday: weekMonday(c) };
}

const dayText = (c: CalendarDate, withYear: boolean) => `${c.d} ${MONTHS[c.m - 1]}${withYear ? ` ${c.y}` : ''}`;

/** "Week 45 of 2026". */
export function weekLabel(p: Pick<WeekPick, 'year' | 'week'>): string {
  return `Week ${p.week} of ${p.year}`;
}

/** The days of the week: "2 to 8 November 2026", "30 March to 5 April 2026", "28 December 2026 to 3 January 2027". */
export function weekRange(monday: CalendarDate): string {
  const sunday = calendarDate(new Date(utc(monday) + 6 * DAY), 'utc');
  if (monday.y !== sunday.y) return `${dayText(monday, true)} to ${dayText(sunday, true)}`;
  if (monday.m !== sunday.m) return `${dayText(monday, false)} to ${dayText(sunday, true)}`;
  return `${monday.d} to ${dayText(sunday, true)}`;
}

/** "3 November 2026". */
export function longDay(c: CalendarDate): string {
  return dayText(c, true);
}

/* ------------------------------------------------------------------ */
/* The archive                                                         */
/* ------------------------------------------------------------------ */

/** What the archive and the browser script need to know about a case. */
export interface VaultCase {
  id: string;
  title: string;
  dek: string;
  decision: string;
  href: string;
  location: string;
  industry: Industry | '';
  functions: BusinessFunction[];
  difficulty: Difficulty | '';
  qualifications: Qualification[];
  keyConcepts: ConceptId[];
  caseType: CaseType | '';
  syllabus: string[];
  exhibits: number;
  questions: number;
  /** True when the case has a decision exercise (its page then has #exercise). */
  hasExercise: boolean;
  /** ISO date, for "most recently updated". */
  updated: string;
  /** Lower-case text the keyword search looks in. */
  text: string;
}

/** Lower case, accents removed, so "Ines" finds "Inês". */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function toVaultCase(id: string, cs: CaseEntry, href: string): VaultCase {
  const words = [
    cs.title,
    cs.dek,
    cs.decision,
    cs.organization.name,
    cs.organization.sector,
    cs.organization.location,
    cs.industry ? INDUSTRY_LABELS[cs.industry] : '',
    ...cs.functions.map((f) => FUNCTION_LABELS[f]),
    ...cs.syllabus,
  ];
  return {
    id,
    title: cs.title,
    dek: cs.dek,
    decision: cs.decision,
    href,
    location: cs.organization.location,
    industry: cs.industry ?? '',
    functions: cs.functions,
    difficulty: cs.difficulty ?? '',
    qualifications: cs.qualifications,
    keyConcepts: cs.keyConcepts,
    caseType: cs.caseType ?? '',
    syllabus: cs.syllabus,
    exhibits: cs.exhibits.length,
    questions: cs.analysisQuestions.length + cs.questions.length,
    hasExercise: Boolean(cs.exercise),
    updated: cs.updated.toISOString().slice(0, 10),
    text: fold(words.join(' ')),
  };
}

/** The archive's filters. An empty value means "any". `topic` is a subtopic code ("3.5") or a whole unit ("unit-3"). */
export interface VaultFilters {
  industry: string;
  function: string;
  difficulty: string;
  qualification: string;
  topic: string;
  concept: string;
  type: string;
  q: string;
}

export const FILTER_KEYS = ['industry', 'function', 'difficulty', 'qualification', 'topic', 'concept', 'type', 'q'] as const satisfies ReadonlyArray<keyof VaultFilters>;

export const NO_FILTERS: VaultFilters = { industry: '', function: '', difficulty: '', qualification: '', topic: '', concept: '', type: '', q: '' };

/** True when a case serves a topic: a subtopic code, or any subtopic of a unit ("unit-3"). */
export function servesTopic(syllabus: string[], topic: string): boolean {
  if (!topic) return true;
  const unit = /^unit-(\d)$/.exec(topic);
  if (unit) return syllabus.some((code) => code.split('.')[0] === unit[1]);
  return syllabus.includes(topic);
}

export function matches(vc: VaultCase, f: VaultFilters): boolean {
  if (f.industry && vc.industry !== f.industry) return false;
  if (f.function && !vc.functions.includes(f.function as BusinessFunction)) return false;
  if (f.difficulty && vc.difficulty !== f.difficulty) return false;
  if (f.qualification && !vc.qualifications.includes(f.qualification as Qualification)) return false;
  if (!servesTopic(vc.syllabus, f.topic)) return false;
  if (f.concept && !vc.keyConcepts.includes(f.concept as ConceptId)) return false;
  if (f.type && vc.caseType !== f.type) return false;
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  return words.every((w) => vc.text.includes(w));
}

export function filterCases(list: VaultCase[], f: VaultFilters): VaultCase[] {
  return list.filter((vc) => matches(vc, f));
}

/** How many cases each value of a filter would show, given the other filters as they stand. */
export function facetCounts(list: VaultCase[], f: VaultFilters, key: Exclude<keyof VaultFilters, 'q'>, values: string[]): Record<string, number> {
  const others = { ...f, [key]: '' };
  const pool = filterCases(list, others);
  return Object.fromEntries(values.map((v) => [v, pool.filter((vc) => matches(vc, { ...others, [key]: v })).length]));
}

export const SORTS = {
  title: 'Title, A to Z',
  'difficulty-up': 'Difficulty, foundation first',
  'difficulty-down': 'Difficulty, advanced first',
  updated: 'Most recently updated',
} as const;
export type SortKey = keyof typeof SORTS;

const byTitle = (a: VaultCase, b: VaultCase) => a.title.localeCompare(b.title, 'en');
/** Difficulty as a number; a case without one sorts last either way. */
const rank = (vc: VaultCase, dir: 1 | -1) => (vc.difficulty ? DIFFICULTY_LABELS[vc.difficulty].rank * dir : Infinity);

export function sortCases(list: VaultCase[], sort: SortKey): VaultCase[] {
  const out = [...list];
  switch (sort) {
    case 'difficulty-up':
      return out.sort((a, b) => rank(a, 1) - rank(b, 1) || byTitle(a, b));
    case 'difficulty-down':
      return out.sort((a, b) => rank(a, -1) - rank(b, -1) || byTitle(a, b));
    case 'updated':
      return out.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : byTitle(a, b)));
    default:
      return out.sort(byTitle);
  }
}

/** Filters (and the sort) from an address's query string, ignoring anything unknown. */
export function filtersFromQuery(search: string): { filters: VaultFilters; sort: SortKey } {
  const p = new URLSearchParams(search);
  const filters = { ...NO_FILTERS };
  for (const k of FILTER_KEYS) filters[k] = (p.get(k) ?? '').slice(0, 80);
  const s = p.get('sort') ?? 'title';
  return { filters, sort: (s in SORTS ? s : 'title') as SortKey };
}

/** The query string for a selection: only the filters in use, in a fixed order; "" when nothing is chosen. */
export function queryFromFilters(f: VaultFilters, sort: SortKey = 'title'): string {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k].trim()) p.set(k, f[k].trim());
  if (sort !== 'title') p.set('sort', sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** "Showing 4 of 9 cases", or "All 9 cases". */
export function countText(shown: number, total: number): string {
  if (shown === total) return `All ${total} ${total === 1 ? 'case' : 'cases'}`;
  return `Showing ${shown} of ${total} ${total === 1 ? 'case' : 'cases'}`;
}

/* ------------------------------------------------------------------ */
/* The Case of the Week, as HTML                                       */
/* ------------------------------------------------------------------ */

export interface FeatureNote {
  /** "for the week of the build" or "for your date". */
  basis: 'build' | 'reader';
  /** The build date, for the build's version of the note. */
  built?: CalendarDate;
}

/** The line that says which week the feature is for and why. It never presents the case as news. */
export function featureNote(pick: WeekPick, note: FeatureNote): string {
  const week = `${weekLabel(pick)}, ${weekRange(pick.monday)}`;
  return note.basis === 'build'
    ? `${week}: the week this page was built${note.built ? ` (${longDay(note.built)})` : ''}. With JavaScript on, the page chooses the case for the week of your own date.`
    : `${week}: chosen for the week of your device's date.`;
}

/** The Case of the Week block's inner HTML, shared by the build and the browser so the two always match. */
export function renderFeature(vc: VaultCase, pick: WeekPick, note: FeatureNote): string {
  const meta = [
    vc.industry ? INDUSTRY_LABELS[vc.industry] : '',
    vc.location,
    vc.difficulty ? DIFFICULTY_LABELS[vc.difficulty].label : '',
    vc.qualifications.map((q) => QUALIFICATION_LABELS[q].short).join(', '),
  ].filter(Boolean);
  return [
    `<p class="cotw__kicker"><span class="cotw__flag">Case of the Week</span><span class="cotw__week">${esc(weekLabel(pick))}</span></p>`,
    `<p class="cotw__no" aria-hidden="true">${String(pick.week).padStart(2, '0')}</p>`,
    `<h2 class="cotw__title" id="cotw-title"><a href="${esc(vc.href)}">${esc(vc.title)}</a></h2>`,
    `<p class="cotw__dek">${esc(vc.dek)}</p>`,
    `<p class="cotw__decision"><span class="cotw__label">The decision</span> ${esc(vc.decision)}</p>`,
    `<ul class="cotw__meta" role="list">${meta.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
    `<p class="cotw__actions"><a class="btn btn--gold" href="${esc(vc.href)}">Read the case<span class="sr-only">: ${esc(vc.title)}</span></a>${
      vc.hasExercise ? ` <a class="cotw__link" href="${esc(vc.href)}#exercise">Go to the decision exercise<span class="sr-only"> for ${esc(vc.title)}</span></a>` : ''
    }</p>`,
    `<p class="cotw__note">${esc(featureNote(pick, note))} The cases are fictional teaching cases, not news.</p>`,
  ].join('');
}

/* ------------------------------------------------------------------ */
/* The decision exercise                                               */
/* ------------------------------------------------------------------ */

/** Words in a piece of writing: runs of letters or digits, so "don't" and "£1.2m" count once. */
export function wordCount(text: string): number {
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%£€$₹-]*/gu) ?? []).length;
}

/** "0 words", "1 word", "212 words". */
export function wordsText(n: number): string {
  return `${n} ${n === 1 ? 'word' : 'words'}`;
}

/** The decision as plain text, to copy into notes or an essay. */
export function decisionText(caseTitle: string, choice: string, reasons: string, when?: string): string {
  return [`Case: ${caseTitle} (The Business Brief, fictional case)`, `My decision: ${choice}`, when ? `Committed: ${when}` : '', '', reasons.trim() || '(No reasons written.)']
    .filter((line, i) => line !== '' || i === 3)
    .join('\n');
}
