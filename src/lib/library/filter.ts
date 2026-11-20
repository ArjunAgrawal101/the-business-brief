/**
 * Finding things in the Resources Library: the search, the filters, the
 * counts each choice would leave, the address that keeps a selection, and
 * how many items each category shows before "Show more". Pure functions on
 * plain facets (built on the server by facetsOf in catalogue.ts), shared by
 * the page, the browser script and the unit tests. It imports only types and
 * the list of categories, so the browser loads nothing else.
 */
import { LIBRARY_CATEGORIES, type CategoryId } from './categories';
import type { Audience, Format, Level } from './catalogue';

export interface Facets {
  id: string;
  category: CategoryId;
  units: number[];
  subtopics: string[];
  level: Level;
  formats: Format[];
  audiences: Audience[];
  scope: 'ib' | 'enrichment';
  /** Lower-case text without accents, for the search. */
  text: string;
  /** Course order within the category, and the title for A to Z. */
  order: number;
  title: string;
}

export interface LibraryFilters {
  q: string;
  category: CategoryId | '';
  unit: string;
  subtopic: string;
  /** "sl" hides HL-only resources; "hl" keeps only them. */
  level: '' | 'sl' | 'hl';
  format: Format | '';
  audience: '' | 'students' | 'teachers';
  scope: '' | 'ib' | 'enrichment';
}

export type View = 'cards' | 'list';
export type Sort = 'course' | 'title';

export const NO_FILTERS: LibraryFilters = { q: '', category: '', unit: '', subtopic: '', level: '', format: '', audience: '', scope: '' };
export const FACET_KEYS = ['category', 'unit', 'subtopic', 'level', 'format', 'audience', 'scope'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

/** How many items a category shows at first: a few of each when every category is in view, more when one is chosen. */
export const FIRST_SHOWN: Record<View, number> = { cards: 6, list: 8 };
export const PAGE_SIZE = 24;

/** Lower case without accents, so "ines" finds "Inês". */
export const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Does an item pass every filter in use? Every word of the search must appear in its text. */
export function matches(f: Facets, x: LibraryFilters): boolean {
  const words = fold(x.q).split(/\s+/).filter(Boolean);
  if (!words.every((w) => f.text.includes(w))) return false;
  if (x.category && f.category !== x.category) return false;
  if (x.unit && !f.units.includes(Number(x.unit))) return false;
  if (x.subtopic && !f.subtopics.includes(x.subtopic)) return false;
  if (x.level === 'sl' && f.level === 'HL') return false;
  if (x.level === 'hl' && f.level !== 'HL') return false;
  if (x.format && !f.formats.includes(x.format)) return false;
  if (x.audience && !f.audiences.includes(x.audience)) return false;
  if (x.scope && f.scope !== x.scope) return false;
  return true;
}

export const filterItems = (list: Facets[], x: LibraryFilters): Facets[] => list.filter((f) => matches(f, x));

/** For one filter, how many items each of its values would leave, given every other filter in use. */
export function facetCounts(list: Facets[], x: LibraryFilters, key: FacetKey, values: string[]): Record<string, number> {
  const rest = filterItems(list, { ...x, [key]: '' });
  return Object.fromEntries(values.map((v) => [v, filterItems(rest, { ...NO_FILTERS, [key]: v } as LibraryFilters).length]));
}

/** The items in the order chosen: course order within each category, or titles A to Z. */
export function sortFacets(list: Facets[], sort: Sort): Facets[] {
  const cat = (f: Facets) => LIBRARY_CATEGORIES.indexOf(f.category);
  return [...list].sort((a, b) => cat(a) - cat(b) || (sort === 'title' ? a.title.localeCompare(b.title, 'en', { numeric: true }) : a.order - b.order || a.title.localeCompare(b.title)));
}

const ONE_OF = <T extends string>(v: string | null, allowed: readonly T[]): T | '' => (v && (allowed as readonly string[]).includes(v) ? (v as T) : '');

/** A selection from the address. Values the library does not offer are ignored. */
export function filtersFromQuery(search: string, offered: { subtopics: string[] }): { filters: LibraryFilters; view: View; sort: Sort } {
  const p = new URLSearchParams(search);
  const filters: LibraryFilters = {
    q: (p.get('q') ?? '').slice(0, 120),
    category: ONE_OF(p.get('category'), LIBRARY_CATEGORIES),
    unit: ONE_OF(p.get('unit'), ['1', '2', '3', '4', '5']),
    subtopic: ONE_OF(p.get('subtopic'), offered.subtopics),
    level: ONE_OF(p.get('level'), ['sl', 'hl']),
    format: ONE_OF(p.get('format'), ['pdf', 'csv', 'svg', 'print', 'page', 'interactive']),
    audience: ONE_OF(p.get('audience'), ['students', 'teachers']),
    scope: ONE_OF(p.get('scope'), ['ib', 'enrichment']),
  };
  return { filters, view: p.get('view') === 'list' ? 'list' : 'cards', sort: p.get('sort') === 'title' ? 'title' : 'course' };
}

/** The address's query for a selection: only what differs from the default, in a fixed order. */
export function queryFromFilters(x: LibraryFilters, view: View = 'cards', sort: Sort = 'course'): string {
  const p = new URLSearchParams();
  if (x.q.trim()) p.set('q', x.q.trim());
  for (const k of FACET_KEYS) if (x[k]) p.set(k, x[k]);
  if (sort !== 'course') p.set('sort', sort);
  if (view !== 'cards') p.set('view', view);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** How many filters are in use, for the Filter button. The search box is not a filter. */
export const activeCount = (x: LibraryFilters): number => FACET_KEYS.filter((k) => x[k]).length;

export function countText(shown: number, total: number): string {
  if (shown === total) return `All ${total} resources`;
  return `${shown} of ${total} ${total === 1 ? 'resource' : 'resources'}`;
}

/**
 * How many of a category's matching items to show: every category starts
 * with a few, a chosen category starts with a page, and "Show more" adds a
 * page at a time.
 */
export function shownCount(matching: number, view: View, chosen: boolean, pages: number): number {
  const first = chosen ? PAGE_SIZE : FIRST_SHOWN[view];
  return Math.min(matching, first + Math.max(0, pages) * PAGE_SIZE);
}
