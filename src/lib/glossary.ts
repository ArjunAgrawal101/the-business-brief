/**
 * The glossary as a dictionary: who meets each term, how terms relate beyond
 * their own `related` lists, and the search text for the index. Pure
 * functions, used by the glossary pages at build time and by the unit tests.
 */
import type { GlossaryEntry, QualificationTag } from './schemas';

type Glossary = Record<string, GlossaryEntry>;

/** A term beyond the IB course: labelled enrichment, with no IB subtopic. */
export const isEnrichment = (g: GlossaryEntry): boolean => g.provenance === 'enrichment';

/**
 * Where a learner meets the term. An entry that lists its qualifications is
 * taken at its word; an IB course term that lists none is an IB term.
 */
export function qualificationsOf(g: GlossaryEntry): QualificationTag[] {
  if (g.qualifications.length) return g.qualifications;
  return isEnrichment(g) ? [] : ['ib'];
}

/** Has the entry been written as a full dictionary entry (plain and technical explanations, misconceptions)? */
export const isDeep = (g: GlossaryEntry): boolean => Boolean(g.simple && g.technical && g.misconceptions.length);

const flat = (parts: string[]) =>
  parts
    .join(' ')
    .replace(/[*`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** The lower-case text the index searches: names, the definition and the plain explanation. */
export function searchText(g: GlossaryEntry): string {
  return flat([g.term, ...g.aliases, g.definition, g.simple ?? '']);
}

/**
 * The part of the search text the index page does not already show: the
 * names and the plain explanation. The page's script adds each entry's
 * visible definition, so the definition is not repeated in the markup.
 */
export function searchKeys(g: GlossaryEntry): string {
  return flat([g.term, ...g.aliases, g.simple ?? '']);
}

const STOP = new Set(['analysis', 'business', 'theory', 'model', 'method', 'management', 'production', 'market', 'marketing', 'the', 'and', 'of', 'for', 'in', 'to', 'a']);

/** The distinctive words of a term's name, for matching related names ("break-even quantity" and "break-even revenue"). */
function nameWords(g: GlossaryEntry): Set<string> {
  return new Set(
    g.term
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .split(/[^a-z0-9-]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/** Terms that list `id` among their related terms, and are not in its own list. */
export function backlinks(id: string, glossary: Glossary): string[] {
  const g = glossary[id];
  if (!g) return [];
  return Object.entries(glossary)
    .filter(([x, e]) => x !== id && e.related.includes(id) && !g.related.includes(x))
    .map(([x]) => x);
}

export interface Suggestion {
  id: string;
  score: number;
  /** Why it is suggested, in words, for the page. */
  reason: string;
}

/**
 * Terms worth reading next, beyond the entry's own related terms and the
 * terms that point back to it: terms one step further along the related
 * links, terms that share a framework or a subtopic, and terms with a
 * matching name. Scores are summed; ties go to the alphabetically first term.
 */
export function suggestTerms(id: string, glossary: Glossary, limit = 6): Suggestion[] {
  const g = glossary[id];
  if (!g) return [];
  const exclude = new Set([id, ...g.related, ...backlinks(id, glossary)]);
  const words = nameWords(g);
  const out: Suggestion[] = [];
  for (const [x, e] of Object.entries(glossary)) {
    if (exclude.has(x)) continue;
    let score = 0;
    const reasons: string[] = [];
    const via = g.related.filter((r) => glossary[r]?.related.includes(x));
    if (via.length) {
      score += 2 * via.length;
      reasons.push(`linked through ${via.map((r) => glossary[r]!.term).join(' and ')}`);
    }
    const fw = g.frameworks.filter((f) => e.frameworks.includes(f));
    if (fw.length) {
      score += 3 * fw.length;
      reasons.push('used alongside it in the same framework or diagram');
    }
    const subs = g.subtopics.filter((s) => s !== 'toolkit' && e.subtopics.includes(s));
    if (subs.length) {
      score += 1.5 * subs.length;
      reasons.push(`also in ${subs.join(' and ')}`);
    }
    const shared = [...nameWords(e)].filter((w) => words.has(w));
    if (shared.length) {
      score += 2 * shared.length;
      reasons.push('a related name');
    }
    if (score > 0 && g.category && e.category === g.category) score += 0.5;
    if (score > 0 && isEnrichment(g) === isEnrichment(e)) score += 0.25;
    if (score >= 2) out.push({ id: x, score, reason: reasons[0] ?? '' });
  }
  return out
    .sort((a, b) => b.score - a.score || glossary[a.id]!.term.localeCompare(glossary[b.id]!.term, 'en', { sensitivity: 'base' }))
    .slice(0, limit);
}

/* ---------- Related terms ---------- */

export interface GlossaryProblem {
  where: string;
  message: string;
}

/**
 * The related terms every entry offers, checked: each names a term that
 * exists, none is the entry itself or listed twice, every entry has at least
 * one, and an IB course term always leads to at least one other IB term, so a
 * reader following the links never leaves the course without choosing to.
 */
export function checkRelated(glossary: Glossary): GlossaryProblem[] {
  const out: GlossaryProblem[] = [];
  for (const [id, g] of Object.entries(glossary)) {
    const where = `glossary/${id}`;
    if (!g.related.length) out.push({ where, message: 'has no related terms' });
    const seen = new Set<string>();
    for (const r of g.related) {
      if (r === id) out.push({ where, message: 'lists itself as related' });
      else if (!glossary[r]) out.push({ where, message: `related term "${r}" does not exist` });
      if (seen.has(r)) out.push({ where, message: `lists "${r}" twice` });
      seen.add(r);
    }
    if (!isEnrichment(g) && g.related.length && g.related.every((r) => glossary[r] && isEnrichment(glossary[r]!))) {
      out.push({ where, message: 'is an IB term whose related terms are all beyond the course' });
    }
  }
  return out;
}

/* ---------- Formula links ---------- */

/** Where a term's formula can be worked: a calculator, a tool, a worked calculation or the formula sheet. */
export interface FormulaLink {
  href: string;
  /** The link's words: "Work it out in the ROCE calculator". */
  label: string;
  /** The target goes beyond the IB course (an enrichment tool). */
  beyond: boolean;
}

type FormulaTarget =
  | { lab: string }
  | { calc: string }
  | { page: string; name: string; beyond?: boolean; guide?: boolean }
  | { sheet: 'given' | 'learn' };

const OPS = { page: '/operations-floor/capacity-and-productivity/', name: 'the capacity utilization and productivity calculator' };
const STOCK = { page: '/operations-floor/stock-control/', name: 'the stock control simulator' };
const MARKET = { page: '/market-studio/market-metrics/', name: 'the market metrics calculators' };
const CAPITAL = { page: '/finance-desk/advanced/capital-budgeting/', name: 'the capital budgeting comparator', beyond: true };
const PERFORMANCE = { page: '/finance-desk/advanced/performance-dashboard/', name: 'the financial performance dashboard', beyond: true };
const UNIT_ECON = { page: '/entrepreneurship-lab/unit-economics/', name: 'the unit economics calculator', beyond: true };
const STARTUP = { page: '/entrepreneurship-lab/start-up-costs/', name: 'the start-up cost calculator', beyond: true };
const STATS = { page: '/toolkit/descriptive-statistics/', name: 'the toolkit guide to descriptive statistics', guide: true };
const CPA = { page: '/toolkit/critical-path-analysis/', name: 'the toolkit guide to critical path analysis', guide: true };

/**
 * The tool each formula term is worked in, checked against what the tools
 * compute: a Financial Laboratory calculator where one exists, otherwise a
 * room's tool, the worked calculation in the register, or the formula sheet's
 * section (the formulae the examination provides, or those to learn).
 */
export const FORMULA_TARGETS: Record<string, FormulaTarget> = {
  'break-even-quantity': { lab: 'break-even-quantity' },
  'break-even-revenue': { lab: 'break-even-revenue' },
  'margin-of-safety': { lab: 'margin-of-safety' },
  contribution: { lab: 'contribution' },
  'contribution-per-unit': { lab: 'contribution' },
  'total-contribution': { lab: 'contribution' },
  'contribution-analysis': { lab: 'contribution' },
  'target-profit-output': { lab: 'target-profit' },
  'target-profit': { lab: 'target-profit' },
  'target-price': { calc: 'target-price' },
  profit: { calc: 'profit' },
  'total-revenue': { calc: 'total-revenue' },
  'total-cost': { calc: 'total-cost' },
  'average-cost': { sheet: 'learn' },
  'gross-profit': { lab: 'profit-and-loss' },
  'cost-of-sales': { lab: 'profit-and-loss' },
  'profit-before-interest-and-tax': { lab: 'profit-and-loss' },
  'profit-for-period': { lab: 'profit-and-loss' },
  'retained-profit': { lab: 'profit-and-loss' },
  'gross-profit-margin': { lab: 'gross-profit-margin' },
  'profit-margin': { lab: 'profit-margin' },
  'return-on-capital-employed': { lab: 'roce' },
  'capital-employed': { lab: 'roce' },
  'current-ratio': { lab: 'current-ratio' },
  'acid-test-ratio': { lab: 'acid-test-ratio' },
  'stock-turnover': { lab: 'stock-turnover' },
  'debtor-days': { lab: 'debtor-days' },
  'creditor-days': { lab: 'creditor-days' },
  'gearing-ratio': { lab: 'gearing-ratio' },
  'net-cash-flow': { lab: 'cash-flow-forecast' },
  'closing-balance': { lab: 'cash-flow-forecast' },
  'working-capital': { sheet: 'learn' },
  'payback-period': { lab: 'payback-period' },
  'average-rate-of-return': { lab: 'average-rate-of-return' },
  'net-present-value': { lab: 'net-present-value' },
  'present-value': { lab: 'net-present-value' },
  'discount-factor': { lab: 'net-present-value' },
  variance: { lab: 'budget-variances' },
  'straight-line-method': { sheet: 'learn' },
  'units-of-production-method': { sheet: 'learn' },
  'market-share': MARKET,
  'market-growth': MARKET,
  'price-elasticity-of-demand': { sheet: 'learn' },
  'capacity-utilization-rate': OPS,
  'productivity-rate': OPS,
  'labour-productivity': OPS,
  'capital-productivity': OPS,
  'defect-rate': OPS,
  'operating-leverage': OPS,
  'reorder-level': STOCK,
  'maximum-stock-level': STOCK,
  'cost-to-buy': { sheet: 'learn' },
  'cost-to-make': { sheet: 'learn' },
  'make-or-buy-analysis': { sheet: 'learn' },
  'labour-turnover': { calc: 'labour-turnover' },
  'expected-value': { calc: 'expected-value' },
  'economic-order-quantity': { page: '/operations-floor/economic-order-quantity/', name: 'the economic order quantity calculator', beyond: true },
  'customer-lifetime-value': UNIT_ECON,
  'customer-acquisition-cost': UNIT_ECON,
  'churn-rate': UNIT_ECON,
  runway: STARTUP,
  'burn-rate': STARTUP,
  'internal-rate-of-return': CAPITAL,
  'discounted-cash-flow': CAPITAL,
  'weighted-average-cost-of-capital': CAPITAL,
  'return-on-equity': PERFORMANCE,
  'interest-cover': PERFORMANCE,
  'asset-turnover': PERFORMANCE,
  mean: STATS,
  median: STATS,
  quartiles: STATS,
  'standard-deviation': STATS,
  'total-float': CPA,
  'free-float': CPA,
  'simple-linear-regression': { page: '/toolkit/simple-linear-regression/', name: 'the toolkit guide to simple linear regression', guide: true },
};

export interface FormulaContext {
  /** The Financial Laboratory's calculators. */
  lab: Array<{ id: string; name: string }>;
  /** The calculation register: each calculation's name and the page that works it. */
  calculations: Record<string, { name: string; page: string }>;
}

const SHEET_SECTION = { given: 'fs-given', learn: 'fs-learn' } as const;

/** Where a term's formula is worked, or nothing for a term with no formula and no calculator. */
export function formulaLink(id: string, ctx: FormulaContext): FormulaLink | undefined {
  const t = FORMULA_TARGETS[id];
  if (!t) return undefined;
  if ('lab' in t) {
    const e = ctx.lab.find((x) => x.id === t.lab);
    return e ? { href: `/finance-desk/lab/${e.id}/`, label: `Work it out in the Financial Laboratory: ${e.name}`, beyond: false } : undefined;
  }
  if ('calc' in t) {
    const k = ctx.calculations[t.calc];
    return k ? { href: `${k.page}#calc-${t.calc}`, label: `See it worked: ${k.name}`, beyond: false } : undefined;
  }
  if ('sheet' in t) return { href: `/resources/formula-sheet/#${SHEET_SECTION[t.sheet]}`, label: t.sheet === 'given' ? 'On the formula sheet, among the formulae the examination provides' : 'On the formula sheet, among the formulae to learn', beyond: false };
  return { href: t.page, label: t.guide ? `See it worked in ${t.name}` : `Work it out in ${t.name}`, beyond: Boolean(t.beyond) };
}

/* ---------- Tolerant search ---------- */

/** Lower case, accents and punctuation removed, words separated by single spaces. */
export function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** The edit distance between two short words, counting a swap of neighbouring letters as one edit; stops early beyond `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

/** How many slips a query word may hold: none below four letters, one up to seven, two from eight. */
export const slipsAllowed = (word: string): number => (word.length < 4 ? 0 : word.length < 8 ? 1 : 2);

/** A query word and its singular: "ratios" also tries "ratio", "policies" "policy". */
function forms(w: string): string[] {
  const out = [w];
  if (w.length > 3 && w.endsWith('s')) {
    out.push(w.slice(0, -1));
    if (w.endsWith('ies')) out.push(`${w.slice(0, -3)}y`);
  }
  return out;
}

export interface SearchFields {
  /** The term's name and other names, folded. */
  names: string;
  /** Everything else the index searches: the definition and the plain explanation, folded. */
  text: string;
}

/**
 * Does an entry answer the query? Every word of the query must start a word
 * of the entry, so "liquid" finds "liquidity" and "ratio" does not find
 * "operations". With `slips`, a word may instead come within a slip or two of
 * the start of a word in the term's own names ("liqudity" finds "liquidity",
 * "gearring" finds "gearing"). Slips are forgiven only in names, so a
 * misspelling finds the term rather than every definition that happens to be
 * close; the page tries them only when nothing matches exactly.
 */
export function matchesQuery(query: string, f: SearchFields, slips = false): boolean {
  const words = queryWords(query);
  if (!words.length) return true;
  const hay = ` ${f.names} ${f.text}`;
  const nameWords = f.names.split(' ').filter(Boolean);
  return words.every((w) => {
    if (forms(w).some((x) => hay.includes(` ${x}`))) return true;
    const allowed = slips ? slipsAllowed(w) : 0;
    if (!allowed) return false;
    return nameWords.some((n) => editDistance(w, n.slice(0, w.length), allowed) <= allowed || editDistance(w, n, allowed) <= allowed);
  });
}

/** The words of a query, folded, each once, at most eight. */
export function queryWords(query: string): string[] {
  return [...new Set(fold(query).split(' ').filter(Boolean))].slice(0, 8);
}

/**
 * The entries a query finds: those that match exactly, or, when none does,
 * those within a slip of the query (and `slipped` says so, for the page to
 * tell the reader).
 */
export function findTerms<T>(query: string, items: T[], fieldsOf: (t: T) => SearchFields): { found: T[]; slipped: boolean } {
  const exact = items.filter((t) => matchesQuery(query, fieldsOf(t)));
  if (exact.length || !queryWords(query).length) return { found: exact, slipped: false };
  const close = items.filter((t) => matchesQuery(query, fieldsOf(t), true));
  return { found: close, slipped: close.length > 0 };
}
