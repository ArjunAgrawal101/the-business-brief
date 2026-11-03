/**
 * Scenario choices: the reader picks one option for each situation (a
 * leadership style, a method of production) and sees its likely consequence;
 * at the end, the pattern of choices is read. Used by the leadership
 * scenarios (2.3) and the production methods exercise (5.2). Pure functions,
 * shared by the pages, their script and the tests.
 */

export type Fit = 'strong' | 'workable' | 'weak';

export const FIT_POINTS: Record<Fit, number> = { strong: 2, workable: 1, weak: 0 };
export const FIT_LABEL: Record<Fit, string> = { strong: 'Strong fit', workable: 'Workable', weak: 'Poor fit' };

export interface ScenarioOption {
  id: string;
  label: string;
}

export interface ScenarioOutcome {
  fit: Fit;
  headline: string;
  consequence: string;
}

export interface Scenario {
  id: string;
  title: string;
  outcomes: Record<string, ScenarioOutcome>;
}

export interface ChoiceScore {
  answered: number;
  total: number;
  points: number;
  max: number;
  strong: number;
  workable: number;
  weak: number;
  /** How many different options the reader used. */
  distinct: number;
  counts: Record<string, number>;
  /** The options used most, when one or more were used more than once. */
  mostUsed: string[];
  /** The scenarios answered with a poor fit, and the options that fitted strongly there. */
  misses: Array<{ scenario: string; chosen: string; strong: string[] }>;
}

export function scoreChoices(scenarios: Scenario[], options: ScenarioOption[], choices: Record<string, string | undefined>): ChoiceScore {
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o.id, 0]));
  let points = 0;
  let strong = 0;
  let workable = 0;
  let weak = 0;
  let answered = 0;
  const misses: ChoiceScore['misses'] = [];
  for (const s of scenarios) {
    const c = choices[s.id];
    const o = c ? s.outcomes[c] : undefined;
    if (!c || !o) continue;
    answered += 1;
    counts[c] = (counts[c] ?? 0) + 1;
    points += FIT_POINTS[o.fit];
    if (o.fit === 'strong') strong += 1;
    else if (o.fit === 'workable') workable += 1;
    else {
      weak += 1;
      misses.push({ scenario: s.id, chosen: c, strong: options.filter((x) => s.outcomes[x.id]?.fit === 'strong').map((x) => x.id) });
    }
  }
  const top = Math.max(0, ...Object.values(counts));
  return {
    answered,
    total: scenarios.length,
    points,
    max: scenarios.length * FIT_POINTS.strong,
    strong,
    workable,
    weak,
    distinct: Object.values(counts).filter((n) => n > 0).length,
    counts,
    mostUsed: top > 1 ? options.filter((o) => counts[o.id] === top).map((o) => o.id) : [],
    misses,
  };
}

/** The options that fit each scenario strongly. */
export function bestFor(s: Scenario, options: ScenarioOption[]): string[] {
  return options.filter((o) => s.outcomes[o.id]?.fit === 'strong').map((o) => o.id);
}

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The reading of a pattern of leadership choices. Situational leadership, the
 * guide's fifth style, is choosing the style the situation calls for, so it is
 * read from the pattern across the scenarios rather than chosen in one.
 */
export function readLeadership(sc: ChoiceScore, options: ScenarioOption[], titleOf: (id: string) => string): { reading: string; implication: string } {
  const name = (id: string) => options.find((o) => o.id === id)?.label.toLowerCase() ?? id;
  if (sc.answered === 0) return { reading: 'Choose a style for each situation to see your pattern.', implication: '' };
  const done = sc.answered === sc.total;
  const base = `${done ? 'Across' : 'So far, across'} ${sc.answered} of ${sc.total} situations, you used ${sc.distinct} ${sc.distinct === 1 ? 'style' : 'different styles'}: ${sc.strong} strong ${sc.strong === 1 ? 'fit' : 'fits'}, ${sc.workable} workable and ${sc.weak} poor (${sc.points} of ${sc.answered * 2} points).`;
  if (sc.distinct === 1 && sc.answered >= 3) {
    return {
      reading: `${base} You led every situation the same way, ${name(Object.keys(sc.counts).find((k) => (sc.counts[k] ?? 0) > 0) ?? '')}.`,
      implication: 'One style everywhere is the opposite of situational leadership. The style that saves the day in a crisis wastes the knowledge of experts, and the style that suits experts leaves new starters lost.',
    };
  }
  if (sc.weak === 0 && sc.answered >= 3) {
    return {
      reading: `${base} You matched the style to the situation every time.`,
      implication: 'That is situational leadership in practice: the leader reads the urgency, the team’s skill and commitment, the stakes and the culture, and chooses the style that fits, changing it as the situation changes.',
    };
  }
  const miss = sc.misses.map((m) => `in ${titleOf(m.scenario).toLowerCase()}, ${list(m.strong.map(name))} would have fitted better than ${name(m.chosen)}`);
  return {
    reading: `${base}${sc.mostUsed.length ? ` You chose ${list(sc.mostUsed.map(name))} most often.` : ''}`,
    implication: miss.length ? `Look again at the poor fits: ${miss.join('; ')}. The situation, not the leader's preference, decides which style works.` : 'Keep going: the pattern across all the situations is what shows situational leadership.',
  };
}

/** The reading of a pattern of production method choices. */
export function readProduction(sc: ChoiceScore, options: ScenarioOption[], titleOf: (id: string) => string): { reading: string; implication: string } {
  const name = (id: string) => options.find((o) => o.id === id)?.label.toLowerCase() ?? id;
  if (sc.answered === 0) return { reading: 'Choose a method for each product to see your pattern.', implication: '' };
  const base = `${sc.answered === sc.total ? 'Across' : 'So far, across'} ${sc.answered} of ${sc.total} products: ${sc.strong} strong ${sc.strong === 1 ? 'fit' : 'fits'}, ${sc.workable} workable and ${sc.weak} poor (${sc.points} of ${sc.answered * 2} points).`;
  if (!sc.misses.length) {
    return { reading: `${base} No method was a poor fit.`, implication: 'Each method was matched to the volume, the variety and what customers want: high volume and little variety favour flow, one-off and bespoke work favours job production, and variety at scale favours batch production or mass customization.' };
  }
  const miss = sc.misses.map((m) => `for ${titleOf(m.scenario).toLowerCase()}, ${list(m.strong.map(name))} fits better than ${name(m.chosen)}`);
  return { reading: base, implication: `Look again at the poor fits: ${miss.join('; ')}. Ask how many units are needed, how much they differ from one another, and how much the customer is involved.` };
}

/** Accept saved choices only for scenarios and options that exist. */
export function cleanChoices(raw: unknown, scenarios: Scenario[], options: ScenarioOption[]): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const s of scenarios) {
    const v = (raw as Record<string, unknown>)[s.id];
    if (typeof v === 'string' && options.some((o) => o.id === v)) out[s.id] = v;
  }
  return out;
}

export function choicesCsvRows(scenarios: Scenario[], options: ScenarioOption[], choices: Record<string, string | undefined>, labels: { scenario: string; choice: string }): string[][] {
  const label = (id: string | undefined) => options.find((o) => o.id === id)?.label ?? '';
  return [
    [labels.scenario, labels.choice, 'Fit', 'Strong fits'],
    ...scenarios.map((s) => {
      const c = choices[s.id];
      const o = c ? s.outcomes[c] : undefined;
      return [s.title, label(c), o ? FIT_LABEL[o.fit] : '', bestFor(s, options).map(label).join(' or ')];
    }),
  ];
}
