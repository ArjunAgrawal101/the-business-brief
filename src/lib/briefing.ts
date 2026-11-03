/**
 * The Business Intelligence Briefing: the pure functions behind its pages.
 *
 * The briefing is curated by hand, not fed. These helpers format its dates,
 * order its items, work out which units, key concepts and kinds of
 * development each item belongs to, and decide whether an item passes the
 * reader's filters. The server render and the browser script use the same
 * functions, so the list a reader filters is the list the page was built from.
 */
import type { IntelCategory } from './schemas';

export const CATEGORY_LABELS: Record<IntelCategory, string> = {
  'corporate-strategy': 'Corporate strategy',
  'mergers-and-acquisitions': 'Mergers and acquisitions',
  leadership: 'Leadership change',
  marketing: 'Marketing',
  restructuring: 'Restructuring',
  'financial-results': 'Financial results',
  innovation: 'Innovation',
  entrepreneurship: 'Entrepreneurship and start-ups',
  sustainability: 'Sustainability',
  'global-trend': 'Global trend',
};

export const SOURCE_KIND_LABELS: Record<string, string> = {
  'press-release': 'Press release',
  'annual-report': 'Annual report',
  'company-report': 'Company report',
  'company-blog': 'Company blog',
  'company-page': 'Company web page',
  'regulatory-filing': 'Regulatory filing',
  press: 'Business press',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DateParts {
  year: number;
  month: number;
  day?: number;
}

/** Read a date written as YYYY-MM-DD, or YYYY-MM when the source gives no day. */
export function parseDate(iso: string): DateParts {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
  if (!m) throw new Error(`"${iso}" is not a date written as YYYY-MM-DD or YYYY-MM`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = m[3] === undefined ? undefined : Number(m[3]);
  if (month < 1 || month > 12) throw new Error(`"${iso}" has no month ${month}`);
  if (day !== undefined) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > last) throw new Error(`"${iso}" has no day ${day}`);
  }
  return { year, month, day };
}

/** 22 September 2025; October 2025 when only the month is known. */
export function formatDate(iso: string): string {
  const { year, month, day } = parseDate(iso);
  const name = MONTHS[month - 1] ?? '';
  return day === undefined ? `${name} ${year}` : `${day} ${name} ${year}`;
}

/** The parts of a date for the dated list: 22, Sep, 2025 (no day when only the month is known). */
export function dateParts(iso: string): { day?: string; month: string; year: string } {
  const { year, month, day } = parseDate(iso);
  return { day: day === undefined ? undefined : String(day), month: SHORT_MONTHS[month - 1] ?? '', year: String(year) };
}

/**
 * A key that sorts dates in time order. A month without a day sorts before
 * every day of that month, so "October 2025" never claims to be later than a
 * dated event in the same month.
 */
export function dateKey(iso: string): string {
  const { year, month, day } = parseDate(iso);
  return `${year}-${String(month).padStart(2, '0')}-${String(day ?? 0).padStart(2, '0')}`;
}

/** Whether date a is on or before date b, comparing only what both state. */
export function onOrBefore(a: string, b: string): boolean {
  const pa = parseDate(a);
  const pb = parseDate(b);
  if (pa.year !== pb.year) return pa.year < pb.year;
  if (pa.month !== pb.month) return pa.month < pb.month;
  if (pa.day === undefined || pb.day === undefined) return true;
  return pa.day <= pb.day;
}

/** The latest of a list of days (YYYY-MM-DD), or undefined for an empty list. */
export function latest(days: string[]): string | undefined {
  return [...days].sort((a, b) => dateKey(b).localeCompare(dateKey(a)))[0];
}

/** Newest first; items on the same date keep a stable order by id. */
export function byDateDesc<T extends { date: string }>(entries: Array<[string, T]>): Array<[string, T]> {
  return [...entries].sort((a, b) => dateKey(b[1].date).localeCompare(dateKey(a[1].date)) || a[0].localeCompare(b[0]));
}

/** The unit a subtopic code belongs to: "3.7" is unit 3. */
export function unitOf(code: string): string {
  return code.split('.')[0] ?? code;
}

export interface Facets {
  units: string[];
  concepts: string[];
  categories: string[];
}

/** What a reader can filter an item by: its units (and the toolkit when it uses a tool), key concepts and kinds of development. */
export function facetsOf(item: { concepts: { subtopics: Array<{ code: string }>; tools: Array<{ id: string }> }; keyConcepts: string[]; categories: string[] }): Facets {
  const units = [...new Set(item.concepts.subtopics.map((s) => unitOf(s.code)))].sort((a, b) => Number(a) - Number(b));
  if (item.concepts.tools.length) units.push('toolkit');
  return { units, concepts: [...item.keyConcepts], categories: [...item.categories] };
}

export interface Filters {
  unit?: string;
  concept?: string;
  kind?: string;
}

/** True when an item passes every filter the reader has set. An empty filter lets everything through. */
export function matches(f: Facets, filters: Filters): boolean {
  return (!filters.unit || f.units.includes(filters.unit)) && (!filters.concept || f.concepts.includes(filters.concept)) && (!filters.kind || f.categories.includes(filters.kind));
}

/** "1 item" or "8 items". */
export function itemCount(n: number): string {
  return `${n} ${n === 1 ? 'item' : 'items'}`;
}

/** The words for the live region after filtering. */
export function filterSummary(shown: number, total: number): string {
  if (shown === total) return `Showing all ${itemCount(total)}`;
  if (shown === 0) return `No items match these filters, out of ${itemCount(total)}`;
  return `Showing ${shown} of ${itemCount(total)}`;
}

/** Filters read from an address such as ?unit=3&concept=ethics&kind=innovation, keeping only values the page offers. */
export function filtersFromQuery(search: string, allowed: { units: string[]; concepts: string[]; kinds: string[] }): Filters {
  const q = new URLSearchParams(search);
  const pick = (key: string, list: string[]) => {
    const v = q.get(key) ?? '';
    return list.includes(v) ? v : undefined;
  };
  return { unit: pick('unit', allowed.units), concept: pick('concept', allowed.concepts), kind: pick('kind', allowed.kinds) };
}

/** The query string for a set of filters, without empty values, ready for the address bar. */
export function queryFromFilters(filters: Filters): string {
  const q = new URLSearchParams();
  if (filters.unit) q.set('unit', filters.unit);
  if (filters.concept) q.set('concept', filters.concept);
  if (filters.kind) q.set('kind', filters.kind);
  const s = q.toString();
  return s ? `?${s}` : '';
}
