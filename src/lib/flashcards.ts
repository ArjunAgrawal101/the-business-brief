/**
 * Flashcards with spaced repetition: the engine behind /revision/flashcards/
 * and the recall cards on the subtopic pages. Pure functions, used in the
 * browser and by the unit tests; nothing here touches the page or storage.
 *
 * Scheduling is a Leitner system of five boxes. A card's box sets how long it
 * waits before it is due again: 1, 2, 4, 8 or 16 days. Again sends a card back
 * to box 1 and makes it due again today; Hard keeps it in its box; Good moves
 * it up one box and Easy two, never past box 5. A card never seen counts as in
 * box 1. Due dates are local calendar dates (YYYY-MM-DD): a card due tomorrow
 * is due from midnight where the reader is, whatever the time zone.
 *
 * Progress is kept in one item, bb:cards, in exactly this shape (the
 * dashboard reads it too):
 *   { "v": 1, "cards": { "<cardId>": { "box": 1-5, "due": "YYYY-MM-DD",
 *     "seen": <int>, "last": "<ISO time>", "rating": "again"|"hard"|"good"|"easy",
 *     "codes": ["3.5"], "title": "<card front, short>" } } }
 * Card ids are "<kind>:<id>", such as term:liquidity or formula:current-ratio,
 * and are stable from one build to the next.
 */

export const CARDS_KEY = 'bb:cards';

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/** The kinds of card in the deck, in the order the filters list them. */
export const CARD_KINDS = ['term', 'formula', 'framework', 'distinction', 'scenario', 'evaluation', 'recall'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const KIND_LABELS: Record<CardKind, string> = {
  term: 'Terms and definitions',
  formula: 'Formulae',
  framework: 'Frameworks',
  distinction: 'Key distinctions',
  scenario: 'Application scenarios',
  evaluation: 'Evaluation prompts',
  recall: 'Recall questions',
};

/** A short name for the kind, shown on the card itself. */
export const KIND_SHORT: Record<CardKind, string> = {
  term: 'Term',
  formula: 'Formula',
  framework: 'Framework',
  distinction: 'Distinction',
  scenario: 'Scenario',
  evaluation: 'Evaluation',
  recall: 'Recall',
};

export type CardLevel = 'SL/HL' | 'HL';

/** One card of the deck, as the build writes it to /revision/flashcards/deck.json. */
export interface DeckCard {
  /** "<kind>:<id>", stable across builds. */
  id: string;
  kind: CardKind;
  /** Subtopic codes ("3.5"), or "toolkit" for the business management toolkit. Never empty. */
  codes: string[];
  level: CardLevel;
  /** Beyond the IB course: shown only when the reader includes enrichment. */
  enrichment?: true;
  /** Invented for learning (an application scenario about a fictional business). */
  fictional?: true;
  /** The front in a few words, for lists and for bb:cards. */
  title: string;
  /** The front, as HTML. */
  front: string;
  /** What to do with the front, in plain words ("Define the term"). */
  prompt: string;
  /** The back, as HTML. */
  back: string;
  /** Where the card's content comes from, to read more. */
  href?: string;
  /** The name of that source ("Glossary", "3.5 notes"). */
  source?: string;
}

export interface DeckSubtopic {
  code: string;
  title: string;
  /** "1" to "5", or "toolkit". */
  unit: string;
  level: 'SL/HL' | 'HL' | 'SL/HL with HL-only content';
}

export interface Deck {
  v: 1;
  units: Array<{ id: string; title: string }>;
  subtopics: DeckSubtopic[];
  cards: DeckCard[];
}

export const cardId = (kind: CardKind, id: string): string => `${kind}:${id}`;
export const kindOf = (id: string): string => id.slice(0, Math.max(0, id.indexOf(':')));

/** The same slugs as the content's own (src/lib/content.ts), without importing it. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** A slug cut at a word boundary, so long questions keep short, readable ids. */
function shortSlug(s: string, max: number): string {
  const full = slugify(s);
  if (full.length <= max) return full;
  const cut = full.slice(0, max);
  const at = cut.lastIndexOf('-');
  return at > max / 2 ? cut.slice(0, at) : cut;
}

/**
 * The ids of a set of recall questions: the subtopic's code and the start of
 * the question, so an id survives a new question added elsewhere in the set
 * and names the card it belongs to. Two questions that begin alike get -2, -3.
 */
export function recallIds(code: string, questions: readonly string[]): string[] {
  const used = new Set<string>();
  const prefix = `recall:${slugify(code)}-`;
  return questions.map((q) => {
    const base = `${prefix}${shortSlug(q, 48) || 'question'}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  });
}

/** Questions on the recall cards mark HL-only material in their text: "(HL)", "(HL only)", "HL only." or "HL only:". */
const HL_MARK = /^\s*(\(\s*HL(\s+only)?\s*\)|HL\s+only\s*[.:])\s*/i;
export const recallIsHL = (q: string): boolean => HL_MARK.test(q);
export const withoutHLMark = (q: string): string => q.replace(HL_MARK, '');

/* ------------------------------------------------------------------ */
/* Dates: local calendar days                                          */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The reader's own calendar day for a moment, as YYYY-MM-DD (local time, never UTC). */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A real calendar day written as YYYY-MM-DD. */
export function isDay(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DAY.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

const utcOf = (day: string): number => {
  const m = DAY.exec(day);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
};

/** The calendar day n days after (or, with a negative n, before) a day. Calendar arithmetic, so no clock change can shift it. */
export function addDays(day: string, n: number): string {
  const t = new Date(utcOf(day) + Math.round(n) * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole calendar days from one day to another: 1 from today to tomorrow, -1 to yesterday. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcOf(to) - utcOf(from)) / 86_400_000);
}

/** When a due day falls, in words, from today: "today", "tomorrow", "in 4 days"; a day already passed is due today. */
export function dueWords(due: string, today: string): string {
  const n = daysBetween(today, due);
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

/* ------------------------------------------------------------------ */
/* Scheduling: five Leitner boxes                                      */
/* ------------------------------------------------------------------ */

export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];

export const RATING_LABELS: Record<Rating, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

export const RATING_HINTS: Record<Rating, string> = {
  again: 'I did not know it',
  hard: 'I recalled it, with difficulty',
  good: 'I recalled it',
  easy: 'I knew it at once',
};

export type Box = 1 | 2 | 3 | 4 | 5;
export const BOXES: readonly Box[] = [1, 2, 3, 4, 5];

/** How many days a card in each box waits before it is due again. */
export const BOX_DAYS: Record<Box, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

const toBox = (n: number): Box => Math.min(5, Math.max(1, Math.round(n))) as Box;

/**
 * Where a card goes after a rating, from its box before (a card never seen is
 * in box 1), and the day it is next due.
 */
export function schedule(box: Box | undefined, rating: Rating, today: string): { box: Box; due: string } {
  const from = box ?? 1;
  if (rating === 'again') return { box: 1, due: today };
  const to = toBox(rating === 'hard' ? from : rating === 'good' ? from + 1 : from + 2);
  return { box: to, due: addDays(today, BOX_DAYS[to]) };
}

/* ------------------------------------------------------------------ */
/* Stored progress: bb:cards                                           */
/* ------------------------------------------------------------------ */

export interface CardRecord {
  box: Box;
  /** The local day it is next due, YYYY-MM-DD. */
  due: string;
  /** How many times it has been rated. */
  seen: number;
  /** When it was last rated, as an ISO timestamp. */
  last: string;
  rating: Rating;
  codes: string[];
  title: string;
}

export interface CardsState {
  v: 1;
  cards: Record<string, CardRecord>;
}

export const LIMITS = { cards: 6000, title: 120, codes: 8 };

const ID_RE = /^[a-z]+:[a-z0-9][a-z0-9:._-]{0,180}$/;
const CODE_RE = /^([1-5]\.\d{1,2}|toolkit)$/;

export const emptyCards = (): CardsState => ({ v: 1, cards: {} });

export const isCardId = (id: unknown): id is string => typeof id === 'string' && ID_RE.test(id);
const isRating = (x: unknown): x is Rating => typeof x === 'string' && (RATINGS as readonly string[]).includes(x);
const isTime = (x: unknown): x is string => typeof x === 'string' && x.length <= 40 && !Number.isNaN(Date.parse(x));
const cleanTitle = (x: unknown): string => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, LIMITS.title) : '');
const cleanCodes = (x: unknown): string[] =>
  Array.isArray(x) ? [...new Set(x.filter((c): c is string => typeof c === 'string' && CODE_RE.test(c)))].slice(0, LIMITS.codes) : [];

/** One stored record, cleaned; null when it cannot be used. */
function parseRecord(v: unknown): CardRecord | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  const box = typeof r.box === 'number' && Number.isInteger(r.box) && r.box >= 1 && r.box <= 5 ? (r.box as Box) : null;
  if (!box || !isDay(r.due) || !isRating(r.rating)) return null;
  const seen = typeof r.seen === 'number' && Number.isFinite(r.seen) ? Math.min(1_000_000, Math.max(1, Math.floor(r.seen))) : 1;
  return { box, due: r.due, seen, last: isTime(r.last) ? new Date(r.last).toISOString() : '', rating: r.rating, codes: cleanCodes(r.codes), title: cleanTitle(r.title) };
}

/**
 * Read stored progress defensively: the JSON text or the value parsed from it.
 * Anything malformed is dropped, never thrown; the result is capped in size.
 */
export function parseCards(raw: unknown): CardsState {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return emptyCards();
    }
  }
  const out = emptyCards();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const cards = (v as { cards?: unknown }).cards;
  if (!cards || typeof cards !== 'object' || Array.isArray(cards)) return out;
  const entries = Object.entries(cards as Record<string, unknown>)
    .filter(([id]) => isCardId(id))
    .map(([id, r]) => [id, parseRecord(r)] as const)
    .filter((e): e is readonly [string, CardRecord] => e[1] !== null)
    // Keep the most recently rated when there are too many.
    .sort((a, b) => (a[1].last < b[1].last ? 1 : a[1].last > b[1].last ? -1 : 0))
    .slice(0, LIMITS.cards);
  for (const [id, r] of entries) out.cards[id] = r;
  return out;
}

/** What a rating needs to know about the card: its id, its codes and its front. */
export interface CardMeta {
  id: string;
  codes: readonly string[];
  title: string;
}

/** The state after one rating of one card, at a moment; the state given is not changed. */
export function rateCard(state: CardsState, card: CardMeta, rating: Rating, now: Date): CardsState {
  const prev = state.cards[card.id];
  const next = schedule(prev?.box, rating, localDay(now));
  const rec: CardRecord = {
    box: next.box,
    due: next.due,
    seen: (prev?.seen ?? 0) + 1,
    last: now.toISOString(),
    rating,
    codes: cleanCodes(card.codes.length ? card.codes : prev?.codes),
    title: cleanTitle(card.title) || prev?.title || '',
  };
  return { v: 1, cards: { ...state.cards, [card.id]: rec } };
}

/** Forget some cards (or, with no list, every card). */
export function resetCards(state: CardsState, ids?: Iterable<string>): CardsState {
  if (!ids) return emptyCards();
  const drop = new Set(ids);
  return { v: 1, cards: Object.fromEntries(Object.entries(state.cards).filter(([id]) => !drop.has(id))) };
}

/** Two records of progress combined, card by card: the one rated more recently wins. Importing twice changes nothing. */
export function mergeCards(base: CardsState, extra: CardsState): CardsState {
  const cards: Record<string, CardRecord> = { ...base.cards };
  for (const [id, r] of Object.entries(extra.cards)) {
    const had = cards[id];
    if (!had || had.last < r.last) cards[id] = r;
  }
  return parseCards({ v: 1, cards });
}

export type CardStatus = 'new' | 'due' | 'later';

export function statusOf(rec: CardRecord | undefined, today: string): CardStatus {
  if (!rec) return 'new';
  return rec.due <= today ? 'due' : 'later';
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export type LevelFilter = 'all' | 'sl' | 'hl';

export interface Filters {
  /** "" for every unit, "1" to "5", or "toolkit". */
  unit: string;
  /** "" for every subtopic, a code such as "3.5", or "toolkit". */
  code: string;
  /** "" for every kind, or one kind. */
  kind: '' | CardKind;
  /** all: every card; sl: leave out HL-only cards; hl: only HL-only cards. */
  level: LevelFilter;
  /** Show cards beyond the IB course. */
  enrichment: boolean;
}

export const NO_FILTERS: Filters = { unit: '', code: '', kind: '', level: 'all', enrichment: false };

/** The unit a code belongs to: "3.5" is in unit "3"; the toolkit is its own. */
export const unitOfCode = (code: string): string => (code === 'toolkit' ? 'toolkit' : (code.split('.')[0] ?? ''));

export function matchesFilters(card: Pick<DeckCard, 'kind' | 'codes' | 'level' | 'enrichment'>, f: Filters): boolean {
  if (f.kind && card.kind !== f.kind) return false;
  if (f.code && !card.codes.includes(f.code)) return false;
  if (f.unit && !card.codes.some((c) => unitOfCode(c) === f.unit)) return false;
  if (f.level === 'sl' && card.level === 'HL') return false;
  if (f.level === 'hl' && card.level !== 'HL') return false;
  if (!f.enrichment && card.enrichment) return false;
  return true;
}

export function activeFilters(f: Filters): number {
  return (Object.keys(NO_FILTERS) as Array<keyof Filters>).filter((k) => f[k] !== NO_FILTERS[k]).length;
}

/**
 * Filters from the address: ?topic=3.5 (a subtopic, which also sets its
 * unit), ?unit=3, ?type=formula, ?level=sl or hl, ?enrichment=1. Anything the
 * deck does not know is ignored.
 */
export function filtersFromQuery(search: string, known: { codes: ReadonlySet<string> }): Filters & { levelSet: boolean } {
  const q = new URLSearchParams(search);
  const f: Filters = { ...NO_FILTERS };
  const topic = (q.get('topic') ?? '').trim();
  if (topic && known.codes.has(topic)) {
    f.code = topic;
    f.unit = unitOfCode(topic);
  } else {
    const unit = (q.get('unit') ?? '').trim();
    if (/^([1-5]|toolkit)$/.test(unit)) f.unit = unit;
  }
  const type = (q.get('type') ?? '').trim();
  if ((CARD_KINDS as readonly string[]).includes(type)) f.kind = type as CardKind;
  const level = (q.get('level') ?? '').trim().toLowerCase();
  if (level === 'sl' || level === 'hl' || level === 'all') f.level = level;
  f.enrichment = q.get('enrichment') === '1';
  return { ...f, levelSet: level === 'sl' || level === 'hl' || level === 'all' };
}

/** The address's query for a set of filters: "" when nothing is set. A subtopic is written as ?topic=, which implies its unit. */
export function queryFromFilters(f: Filters): string {
  const q = new URLSearchParams();
  if (f.code) q.set('topic', f.code);
  else if (f.unit) q.set('unit', f.unit);
  if (f.kind) q.set('type', f.kind);
  if (f.level !== 'all') q.set('level', f.level);
  if (f.enrichment) q.set('enrichment', '1');
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * The level a reader sees first: their SL or HL choice on the site (bb:level)
 * leaves out HL-only cards for SL, except when they asked for an HL-only
 * subtopic, which would otherwise show nothing.
 */
export function defaultLevel(siteLevel: string | null, codeIsHLOnly: boolean): LevelFilter {
  return siteLevel === 'SL' && !codeIsHLOnly ? 'sl' : 'all';
}

/* ------------------------------------------------------------------ */
/* Counts, queues and sessions                                         */
/* ------------------------------------------------------------------ */

export interface Tally {
  total: number;
  fresh: number;
  due: number;
  later: number;
  /** Cards seen, by box: index 0 is box 1. */
  boxes: [number, number, number, number, number];
}

export function tallyOf(cards: ReadonlyArray<Pick<DeckCard, 'id'>>, state: CardsState, today: string): Tally {
  const t: Tally = { total: cards.length, fresh: 0, due: 0, later: 0, boxes: [0, 0, 0, 0, 0] };
  for (const c of cards) {
    const rec = state.cards[c.id];
    const s = statusOf(rec, today);
    if (s === 'new') t.fresh++;
    else {
      if (s === 'due') t.due++;
      else t.later++;
      const b = (rec?.box ?? 1) - 1;
      t.boxes[b] = (t.boxes[b] ?? 0) + 1;
    }
  }
  return t;
}

/** How many of everything stored is due today, whatever the filters. */
export function dueCount(state: CardsState, today: string, ids?: ReadonlySet<string>): number {
  return Object.entries(state.cards).filter(([id, r]) => r.due <= today && (!ids || ids.has(id))).length;
}

export type Mode = 'due' | 'new' | 'all';

export const MODE_LABELS: Record<Mode, string> = { due: 'Review the cards due today', new: 'Learn new cards', all: 'Study every card in this selection' };

/** At most this many new cards in one session, so a first session stays short. */
export const NEW_PER_SESSION = 20;

/** A stable shuffle: Fisher and Yates, with the random source passed in so tests can fix it. */
export function shuffled<T>(list: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * The cards for a session, in order. Due cards come longest overdue first,
 * then the lower boxes; new cards and "every card" keep the deck's course
 * order. Shuffle mixes whichever list it is.
 */
export function queueFor(
  mode: Mode,
  cards: ReadonlyArray<Pick<DeckCard, 'id'>>,
  state: CardsState,
  today: string,
  opts: { shuffle?: boolean; rng?: () => number; newLimit?: number } = {},
): string[] {
  let ids: string[];
  if (mode === 'due') {
    const order = new Map(cards.map((c, i) => [c.id, i]));
    ids = cards
      .filter((c) => statusOf(state.cards[c.id], today) === 'due')
      .map((c) => c.id)
      .sort((a, b) => {
        const ra = state.cards[a]!;
        const rb = state.cards[b]!;
        return (ra.due < rb.due ? -1 : ra.due > rb.due ? 1 : 0) || ra.box - rb.box || (order.get(a) ?? 0) - (order.get(b) ?? 0);
      });
  } else if (mode === 'new') {
    ids = cards.filter((c) => !state.cards[c.id]).map((c) => c.id);
  } else ids = cards.map((c) => c.id);
  if (opts.shuffle) ids = shuffled(ids, opts.rng);
  if (mode === 'new') ids = ids.slice(0, opts.newLimit ?? NEW_PER_SESSION);
  return ids;
}

export interface Session {
  /** Cards still to go; the first is on the table. */
  queue: string[];
  /** Ratings given so far, in order. */
  log: Array<{ id: string; rating: Rating }>;
}

export const startSession = (queue: readonly string[]): Session => ({ queue: [...queue], log: [] });
export const currentCard = (s: Session): string | undefined => s.queue[0];

/**
 * The session after the card on the table is rated. A card answered Again
 * goes to the back of the queue to be tried once more this session, unless
 * it is already waiting there.
 */
export function answer(s: Session, rating: Rating): Session {
  const [id, ...rest] = s.queue;
  if (id === undefined) return s;
  const queue = rating === 'again' && !rest.includes(id) ? [...rest, id] : rest;
  return { queue, log: [...s.log, { id, rating }] };
}

export interface Summary {
  /** Ratings given, each card counted every time it was rated. */
  answers: number;
  /** Different cards rated. */
  cards: number;
  tally: Record<Rating, number>;
  /** Cards rated this session that are still due today (their last rating was Again). */
  stillDue: number;
  /** The next day after today when one of this session's cards is due, and how many fall due then. */
  next: { day: string; count: number } | null;
  /** This session's cards by box after the session: index 0 is box 1. */
  boxes: [number, number, number, number, number];
}

export function summarize(s: Session, state: CardsState, today: string): Summary {
  const tally: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const e of s.log) tally[e.rating]++;
  const ids = [...new Set(s.log.map((e) => e.id))];
  const boxes: Summary['boxes'] = [0, 0, 0, 0, 0];
  let stillDue = 0;
  const later = new Map<string, number>();
  for (const id of ids) {
    const r = state.cards[id];
    if (!r) continue;
    boxes[r.box - 1] = (boxes[r.box - 1] ?? 0) + 1;
    if (r.due <= today) stillDue++;
    else later.set(r.due, (later.get(r.due) ?? 0) + 1);
  }
  const first = [...later.keys()].sort()[0];
  return { answers: s.log.length, cards: ids.length, tally, stillDue, next: first ? { day: first, count: later.get(first) ?? 0 } : null, boxes };
}

/** "1 card", "3 cards". */
export const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** The summary in a sentence or two, for the screen and for the live region. */
export function summaryWords(sum: Summary, today: string): string {
  if (!sum.answers) return 'No cards were rated in this session.';
  const parts = RATINGS.filter((r) => sum.tally[r]).map((r) => `${sum.tally[r]} ${RATING_LABELS[r]}`);
  const head = `You rated ${plural(sum.cards, 'card', 'cards')}${sum.answers > sum.cards ? ` (${plural(sum.answers, 'answer', 'answers')} in all)` : ''}: ${parts.join(', ')}.`;
  const due = sum.stillDue ? ` ${plural(sum.stillDue, 'card is', 'cards are')} still due today.` : '';
  const next = sum.next ? ` Next: ${plural(sum.next.count, 'card', 'cards')} due ${dueWords(sum.next.day, today)}.` : '';
  return `${head}${due}${next}`;
}
