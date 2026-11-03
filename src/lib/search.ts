/**
 * Search: the kinds of entry, how a query matches and ranks an entry, and how
 * the query and filters are kept in the address. Pure functions, shared by
 * the search page's build (src/pages/search.astro), its script
 * (src/scripts/search.ts) and the unit tests.
 */

export const SEARCH_KINDS = [
  { id: 'subtopics', label: 'Subtopics', one: 'subtopic', many: 'subtopics' },
  { id: 'notes', label: 'Notes', one: 'section of notes', many: 'sections of notes' },
  { id: 'definitions', label: 'Definitions', one: 'definition', many: 'definitions' },
  { id: 'formulas', label: 'Formulas', one: 'formula', many: 'formulas' },
  { id: 'cases', label: 'Cases', one: 'case', many: 'cases' },
  { id: 'frameworks', label: 'Frameworks', one: 'framework', many: 'frameworks' },
  { id: 'questions', label: 'Questions', one: 'question', many: 'questions' },
  { id: 'tools', label: 'Calculators and tools', one: 'tool', many: 'tools' },
  { id: 'resources', label: 'Resources', one: 'resource', many: 'resources' },
  { id: 'pages', label: 'Pages', one: 'page', many: 'pages' },
] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number]['id'];

export const KIND_IDS: readonly SearchKind[] = SEARCH_KINDS.map((k) => k.id);

export interface SearchEntry {
  kind: SearchKind;
  /** What the entry is, in a word or two: "Glossary term", "Mindmap", "Brief". */
  type: string;
  title: string;
  url: string;
  /** The line shown under the title. */
  text: string;
  /** More words to match that are not shown: aliases, a formula, the statements of a subtopic. */
  keys: string;
  /** Unit numbers as text ("1" to "5") and "toolkit". */
  units: string[];
  /** Subtopic codes shown with the entry. */
  codes: string[];
  /** HL only. */
  hl: boolean;
}

export const UNIT_VALUES = ['1', '2', '3', '4', '5', 'toolkit'] as const;
export const LEVEL_VALUES = ['sl', 'hl'] as const;

export interface SearchState {
  q: string;
  kind: SearchKind | '';
  unit: string;
  level: '' | 'sl' | 'hl';
}

export const EMPTY_STATE: SearchState = { q: '', kind: '', unit: '', level: '' };

/** Lower case, accents removed, every run of other characters a single space: "Break-even (BEQ)" is "break even beq". */
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The words of an entry's hidden keys that its visible text does not already
 * hold, each once: matching is by words, so nothing findable is lost, and the
 * page carries far less.
 */
export function extraWords(keys: string, visible: string): string {
  const seen = new Set(normalize(visible).split(' '));
  const out: string[] = [];
  for (const w of normalize(keys).split(' ')) {
    if (!w || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out.join(' ');
}

/** The words of a query, at most eight, each once. */
export function queryWords(q: string): string[] {
  return [...new Set(normalize(q).split(' ').filter(Boolean))].slice(0, 8);
}

/** A word and, when it looks plural, its singular forms: "ratios" also tries "ratio"; "policies", "policy". */
export function wordForms(w: string): string[] {
  const out = [w];
  if (w.length > 3 && w.endsWith('s')) {
    out.push(w.slice(0, -1));
    if (w.endsWith('ies')) out.push(`${w.slice(0, -3)}y`);
    else if (w.endsWith('es')) out.push(w.slice(0, -2));
  }
  return out;
}

/**
 * Every word of the query starts a word of the text: "ratio" finds "ratios"
 * but not "operations", and "break even" finds "break-even". A plural also
 * finds its singular. The text comes normalized, with a space in front.
 */
export function matches(hay: string, words: readonly string[]): boolean {
  return words.every((w) => wordForms(w).some((f) => hay.includes(` ${f}`)));
}

/**
 * How well an entry answers the query: its whole title first, then a title
 * starting with the query, the phrase starting a word of the title, every
 * word in the title, every word in its hidden keys, and last a match in its
 * text alone. Among equals, the shorter title comes first. The title and keys
 * come normalized, so a page can prepare them once rather than on every
 * keystroke.
 */
export function rank(t: string, keys: string, words: readonly string[]): number {
  if (!words.length) return 0;
  const phrase = words.join(' ');
  const len = Math.min(t.length, 200) / 1000;
  const title = ` ${t}`;
  if (t === phrase) return 1000 - len;
  if (t.startsWith(phrase)) return 800 - len;
  if (title.includes(` ${phrase}`)) return 600 - len;
  if (matches(title, words)) return 300 + words.filter((w) => title.includes(` ${w}`)).length * 10 - len;
  if (matches(` ${keys}`, words)) return 150 - len;
  return 100 - len;
}

/** The entry passes the unit and level filters, and the kind filter unless asked to ignore it (for the counts on each kind). */
export function passes(e: Pick<SearchEntry, 'kind' | 'units' | 'hl'>, s: SearchState, ignoreKind = false): boolean {
  if (!ignoreKind && s.kind && e.kind !== s.kind) return false;
  if (s.unit && !e.units.includes(s.unit)) return false;
  if (s.level === 'sl' && e.hl) return false;
  if (s.level === 'hl' && !e.hl) return false;
  return true;
}

/** The search state from an address's query string; anything not allowed is ignored. */
export function parseState(search: string): SearchState {
  const p = new URLSearchParams(search);
  const kind = p.get('kind') ?? '';
  const unit = p.get('unit') ?? '';
  const level = p.get('level') ?? '';
  return {
    q: (p.get('q') ?? '').slice(0, 200),
    kind: (KIND_IDS as readonly string[]).includes(kind) ? (kind as SearchKind) : '',
    unit: (UNIT_VALUES as readonly string[]).includes(unit) ? unit : '',
    level: level === 'sl' || level === 'hl' ? level : '',
  };
}

/** The query string for a state, in a fixed order, without empty values: "?q=gearing&kind=formulas". */
export function stateQuery(s: SearchState): string {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set('q', s.q.trim());
  if (s.kind) p.set('kind', s.kind);
  if (s.unit) p.set('unit', s.unit);
  if (s.level) p.set('level', s.level);
  const q = p.toString();
  return q ? `?${q}` : '';
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

/** The title as HTML, escaped, with each matched word marked where it starts a word. */
export function highlight(title: string, words: readonly string[]): string {
  const lower = title.toLowerCase();
  const startsWord = (i: number) => i === 0 || !/[\p{L}\p{N}]/u.test(lower[i - 1] ?? '');
  const spans: Array<[number, number]> = [];
  for (const w of words) {
    for (const f of wordForms(w)) {
      let found = false;
      let i = lower.indexOf(f);
      while (i !== -1) {
        if (startsWord(i)) {
          spans.push([i, i + f.length]);
          found = true;
        }
        i = lower.indexOf(f, i + 1);
      }
      if (found) break;
    }
  }
  if (!spans.length) return esc(title);
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: Array<[number, number]> = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
    else merged.push([sp[0], sp[1]]);
  }
  let out = '';
  let at = 0;
  for (const [a, b] of merged) {
    out += `${esc(title.slice(at, a))}<mark>${esc(title.slice(a, b))}</mark>`;
    at = b;
  }
  return out + esc(title.slice(at));
}

/** "1 definition", "24 definitions". */
export function countWords(n: number, kind: SearchKind | ''): string {
  const k = SEARCH_KINDS.find((x) => x.id === kind);
  if (!k) return `${n.toLocaleString('en-GB')} ${n === 1 ? 'result' : 'results'}`;
  return `${n.toLocaleString('en-GB')} ${n === 1 ? k.one : k.many}`;
}
