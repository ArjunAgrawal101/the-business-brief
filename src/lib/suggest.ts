/**
 * Suggestions for the header's search box. The build writes a compact copy of
 * the search index to /search.json; the box loads it the first time it is
 * opened and ranks every kind of entry together, so a subtopic, a framework
 * or a glossary term comes before one section of notes or one question.
 * A word with a slip in it ("liqudity") still finds its entry. Pure
 * functions, shared by the endpoint, the header script and the unit tests.
 */
import { SEARCH_KINDS, extraWords, matches, normalize, queryWords, rank, type SearchEntry, type SearchKind } from './search';

/** One entry of the compact index: title, address, type, kind (index into SEARCH_KINDS), subtopic codes, HL only (1 or 0), and the extra words it can be found by. */
export type CompactEntry = [string, string, string, number, string, 0 | 1, string];

export interface CompactIndex {
  v: 1;
  e: CompactEntry[];
}

/** At most this many further words an entry: enough for its description, aliases and formula names, small enough to load at once. */
const EXTRA_WORDS = 18;

/** Words too common to help find anything. */
const STOP = new Set('a an and are as at be by each for from in into is it its of on or the this that to with your you what how when which their there them than then can not more most one two'.split(' '));

export function compactEntry(e: SearchEntry): CompactEntry {
  const extra = extraWords(`${e.text} ${e.keys}`, `${e.title} ${e.type}`)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .slice(0, EXTRA_WORDS)
    .join(' ');
  const kind = SEARCH_KINDS.findIndex((k) => k.id === e.kind);
  return [e.title, e.url, e.type, kind, e.codes.join(' '), e.hl ? 1 : 0, extra];
}

export interface Prepared {
  title: string;
  url: string;
  type: string;
  kind: SearchKind;
  codes: string[];
  hl: boolean;
  /** The normalized title, and the normalized words it can also be found by. */
  t: string;
  k: string;
}

/** Turn the compact index into entries ready to search; anything malformed is dropped. */
export function prepare(raw: unknown): Prepared[] {
  const e = raw && typeof raw === 'object' && Array.isArray((raw as CompactIndex).e) ? (raw as CompactIndex).e : [];
  const out: Prepared[] = [];
  for (const x of e) {
    if (!Array.isArray(x) || typeof x[0] !== 'string' || typeof x[1] !== 'string' || !x[1].startsWith('/')) continue;
    const kind = SEARCH_KINDS[typeof x[3] === 'number' ? x[3] : -1]?.id;
    if (!kind) continue;
    const codes = typeof x[4] === 'string' && x[4] ? x[4].split(' ') : [];
    const extra = typeof x[6] === 'string' ? x[6] : '';
    out.push({
      title: x[0],
      url: x[1],
      type: typeof x[2] === 'string' ? x[2] : '',
      kind,
      codes,
      hl: x[5] === 1,
      // A subtopic's code ("5.5 Break-even analysis") is matched through its codes, not its title, so the name alone ranks as a whole title.
      t: normalize(x[0].replace(/^\d+\.\d+\s+/, '')),
      k: normalize(`${x[2]} ${codes.join(' ')} ${extra}`),
    });
  }
  return out;
}

/** How much more often a reader wants each kind, added to the match's own rank. */
export const KIND_WEIGHT: Record<SearchKind, number> = {
  subtopics: 70,
  frameworks: 45,
  definitions: 40,
  formulas: 40,
  tools: 35,
  pages: 35,
  cases: 20,
  resources: 10,
  advanced: 10,
  notes: 0,
  questions: -20,
};

/**
 * Whether two words are within `k` edits of each other (insert, delete,
 * substitute, or swap two neighbours), without building the whole table.
 */
export function withinEdits(a: string, b: string, k: number): boolean {
  if (Math.abs(a.length - b.length) > k) return false;
  if (a === b) return true;
  const n = a.length;
  const m = b.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i += 1) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > k) return false;
    prev2 = prev;
    prev = cur;
  }
  return prev[m]! <= k;
}

/** Edits allowed for a word of this length: none below five letters, one up to seven, two from eight. */
export const editsFor = (w: string) => (w.length < 5 ? 0 : w.length < 8 ? 1 : 2);

/** Every query word is a word of the text, or close to one (within editsFor), or starts one. */
function fuzzyMatches(text: string, words: readonly string[]): boolean {
  const tw = text.split(' ');
  return words.every((w) => {
    const k = editsFor(w);
    return tw.some((x) => x.startsWith(w) || (k > 0 && (withinEdits(w, x, k) || (x.length > w.length && withinEdits(w, x.slice(0, w.length), k)))));
  });
}

export interface Suggestion {
  title: string;
  url: string;
  type: string;
  kind: SearchKind;
  codes: string[];
  hl: boolean;
  /** True when the match needed a corrected spelling. */
  fuzzy: boolean;
}

/** The best `n` entries for a query, every kind ranked together, each address and each title once (the better-ranked of two pages with the same name is kept). */
export function suggest(index: readonly Prepared[], q: string, n = 8): Suggestion[] {
  const words = queryWords(q);
  if (!words.length) return [];
  const scored: Array<{ e: Prepared; s: number; fuzzy: boolean }> = [];
  for (const e of index) {
    if (matches(` ${e.t} ${e.k}`, words)) scored.push({ e, s: rank(e.t, e.k, words) + KIND_WEIGHT[e.kind], fuzzy: false });
  }
  if (scored.length < n && words.some((w) => editsFor(w) > 0)) {
    const have = new Set(scored.map((x) => x.e.url));
    for (const e of index) {
      if (have.has(e.url)) continue;
      if (fuzzyMatches(e.t, words)) scored.push({ e, s: 120 + KIND_WEIGHT[e.kind] - Math.min(e.t.length, 200) / 1000, fuzzy: true });
    }
  }
  scored.sort((a, b) => b.s - a.s || a.e.title.length - b.e.title.length);
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const { e, fuzzy } of scored) {
    const name = `title:${e.t}`;
    if (seen.has(e.url) || seen.has(name)) continue;
    seen.add(e.url);
    seen.add(name);
    out.push({ title: e.title, url: e.url, type: e.type, kind: e.kind, codes: e.codes, hl: e.hl, fuzzy });
    if (out.length >= n) break;
  }
  return out;
}
