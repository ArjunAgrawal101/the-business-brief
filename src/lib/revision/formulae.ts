/**
 * The formula register for revision: every formula the content teaches, once,
 * with the subtopics it belongs to, its level and what it measures. It is
 * built from the content, in this order of authority, so no formula is typed
 * twice:
 *   1. the calculation register (data/calculations.yaml), whose functions in
 *      src/lib/finance.ts the calculators and the formula sheet's figures use;
 *   2. the formulas in each set of notes, in course order;
 *   3. the glossary's formula entries for IB terms.
 * Two entries are the same formula when they have the same name or the same
 * right-hand side once wording is normalized; the first keeps its id and
 * wording, and the others add their subtopics.
 *
 * What a formula measures comes from its glossary entry where one matches,
 * otherwise from the calculation register's interpretation, otherwise from the
 * revision file that describes it (src/content/revision/), which also gives
 * the situation in which each formula is the one to use.
 */
import type { Corpus } from '../integrity';
import type { GlossaryEntry } from '../schemas';
import { slugify } from '../flashcards';

export interface Formula {
  /** Stable id: the calculation's id, else a slug of the name (a glossary entry keeps its own id). */
  id: string;
  name: string;
  /** As the content writes it, "Name = right-hand side". */
  expression: string;
  /** What it measures, in the content's words (light markup); null when nothing in the content says. */
  measures: string | null;
  codes: string[];
  level: 'SL/HL' | 'HL';
  /** Where it is worked or explained. */
  href: string;
  origin: 'calculation' | 'notes' | 'glossary';
  /** The glossary entry that defines it, when one matches. */
  term?: string;
}

/** The right-hand side of "Name = expression", or the whole text when there is no "=". */
export function rhs(expression: string): string {
  const at = expression.indexOf(' = ');
  return at < 0 ? expression : expression.slice(at + 3);
}

/** The name on the left of "Name = expression", or "" when there is none. */
export function lhs(expression: string): string {
  const at = expression.indexOf(' = ');
  return at < 0 ? '' : expression.slice(0, at).trim();
}

/**
 * A right-hand side reduced to its words, so "sum of the present values of
 * the returns" and "∑ present values of return" compare equal: a "where"
 * clause and any second formula after ";" are cut off, symbols and the words
 * "the" and "of" dropped, and plurals made singular.
 */
export function shape(expression: string): string {
  return rhs(expression)
    .split(/;|,\s*where\b/)[0]!
    .toLowerCase()
    .replace(/[∑Σ]/g, ' sum ')
    // Operators are words here, so "a − b" and "a ÷ b" never compare equal.
    .replace(/÷|\//g, ' div ')
    .replace(/×/g, ' times ')
    .replace(/[−-]\s/g, ' minus ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && w !== 'the' && w !== 'of')
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

/**
 * What a formula measures, without the formula said again in words first:
 * "Current assets divided by current liabilities, which shows how many times…"
 * becomes "How many times…".
 */
export function measureText(text: string): string {
  const m = /^[^.;]{3,160}?,\s*which (shows|measures|tells you)\s+(.+)$/s.exec(text.trim());
  if (!m || !m[2]) return text.trim();
  return m[2].charAt(0).toUpperCase() + m[2].slice(1);
}

const firstSentence = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(flat);
  return (m ? m[1] : flat) ?? flat;
};

/** A formula that is really two or more ("x = …; y = …"). */
const compound = (expression: string): boolean => /;\s*(or\s+)?[a-z][^=;]*=/i.test(expression);

export interface FormulaInput {
  c: Corpus;
  /** The address of a subtopic's page, by code. */
  subtopicHref: (code: string) => string;
  /** Subtopic codes in course order. */
  order: readonly string[];
  /** Overrides from the revision files: what a formula measures, by id. */
  measures?: Readonly<Record<string, string | undefined>>;
}

export function buildFormulae({ c, subtopicHref, order, measures = {} }: FormulaInput): Formula[] {
  const ib = Object.entries(c.glossary).filter(([, g]) => g.provenance !== 'enrichment');
  // Glossary entries by every name a formula might use for them.
  const termByName = new Map<string, string>();
  const addName = (name: string, id: string) => {
    const k = slugify(name);
    if (k && !termByName.has(k)) termByName.set(k, id);
  };
  for (const [id, g] of ib) {
    addName(id, id);
    addName(g.term, id);
    g.aliases.forEach((a) => addName(a, id));
  }
  const withoutBrackets = (s: string) => s.replace(/\s*\([^)]*\)/g, '');
  const termFor = (...names: string[]): string | undefined => {
    for (const n of names) {
      // "Units of production method, the rate" is defined under "Units of production method".
      for (const v of [n, withoutBrackets(n), n.split(',')[0] ?? n]) {
        const id = termByName.get(slugify(v));
        if (id) return id;
      }
    }
    return undefined;
  };

  const out: Formula[] = [];
  const ids = new Set<string>();
  const unique = (base: string) => {
    let id = base || 'formula';
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };
  const find = (name: string, expression: string) => {
    const n = slugify(name);
    const s = shape(expression);
    return out.find((f) => slugify(f.name) === n || (s.length > 0 && shape(f.expression) === s));
  };
  const addCodes = (f: Formula, codes: readonly string[]) => {
    for (const code of codes) if (!f.codes.includes(code)) f.codes.push(code);
  };
  const widen = (f: Formula, level: 'SL/HL' | 'HL') => {
    if (level === 'SL/HL') f.level = 'SL/HL';
  };

  // 1. The calculation register.
  for (const [id, k] of Object.entries(c.calculations).sort((a, b) => a[1].order - b[1].order)) {
    if (k.status !== 'complete') continue;
    const term = c.glossary[id] && c.glossary[id]?.provenance !== 'enrichment' ? id : termFor(k.name, lhs(k.formula));
    ids.add(id);
    out.push({
      id,
      name: k.name,
      expression: k.formula,
      measures: null,
      codes: k.syllabus.map((s) => s.code),
      level: k.level,
      href: `${k.page}#calc-${id}`,
      origin: 'calculation',
      term,
    });
    const f = out[out.length - 1]!;
    f.measures = (term ? c.glossary[term]?.definition : undefined) ?? firstSentence(k.interpretation);
  }

  // 2. The notes, in course order.
  const rank = new Map(order.map((code, i) => [code, i]));
  const notes = Object.values(c.notes).sort((a, b) => (rank.get(a.code) ?? 99) - (rank.get(b.code) ?? 99));
  for (const n of notes) {
    for (const s of n.sections) {
      const level = n.level === 'HL' || s.level === 'HL' ? 'HL' : 'SL/HL';
      for (const fm of s.formulas) {
        const had = find(fm.name, fm.expression);
        if (had) {
          addCodes(had, [n.code]);
          widen(had, level);
          continue;
        }
        const term = termFor(fm.name, lhs(fm.expression));
        out.push({
          id: unique(slugify(fm.name)),
          name: fm.name,
          expression: fm.expression,
          measures: term ? (c.glossary[term]?.definition ?? null) : null,
          codes: [n.code],
          level,
          href: `${subtopicHref(n.code)}#${s.id}`,
          origin: 'notes',
          term,
        });
      }
    }
  }

  // 3. The glossary's own formulas, for IB terms.
  const glossaryOrder = (g: GlossaryEntry) => Math.min(...g.subtopics.map((code) => rank.get(code) ?? 98), 99);
  for (const [id, g] of ib.filter(([, g]) => g.formula).sort((a, b) => glossaryOrder(a[1]) - glossaryOrder(b[1]) || a[0].localeCompare(b[0]))) {
    const expression = g.formula ?? '';
    // The same formula, or a term whose formula the notes already teach in their own form.
    const had = find(g.term, expression) ?? find(lhs(expression), expression) ?? out.find((f) => f.term === id);
    if (had) {
      addCodes(had, g.subtopics);
      widen(had, g.level);
      had.term ??= id;
      if (!had.measures) had.measures = g.definition;
      continue;
    }
    // A glossary line that holds several formulas is left to the entries above; it is not a card of its own.
    if (compound(expression) || !g.subtopics.length) continue;
    out.push({
      id: unique(ids.has(id) ? `${id}-formula` : id),
      // The formula's own name when it has one ("Interquartile range"), otherwise the term's ("Contribution pricing", not "Price").
      name: lhs(expression).split(/\s+/).length >= 2 ? lhs(expression) : g.term,
      expression,
      measures: g.definition,
      codes: [...g.subtopics],
      level: g.level,
      href: `/glossary/${id}/`,
      origin: 'glossary',
      term: id,
    });
  }

  // What the revision files say a formula measures takes precedence over everything else.
  for (const f of out) {
    const m = measures[f.id];
    if (m) f.measures = m;
    else if (f.measures) f.measures = measureText(f.measures);
  }
  // Codes in course order, the toolkit last.
  for (const f of out) f.codes.sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  return out;
}

/** The formulas of one subtopic, in the register's order. */
export const formulaeFor = (all: readonly Formula[], code: string): Formula[] => all.filter((f) => f.codes.includes(code));
