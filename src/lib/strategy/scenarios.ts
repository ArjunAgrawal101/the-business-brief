/**
 * Scenario planner (enrichment: scenario planning is not in the IB guide).
 * The reader lists the driving forces behind a focal question and rates each
 * for impact and uncertainty. Forces that are both important and uncertain
 * are the critical uncertainties; two of them become the axes of a two by
 * two of four futures, each with a narrative, implications and early-warning
 * signposts. Important forces that are more predictable are predetermined
 * elements, part of every future. Finally the reader's options are rated in
 * each future, to find the ones that hold up in all four.
 *
 * The method follows the scenario planning of Schwartz (1991) and van der
 * Heijden (1996), and Wack's (1985) separation of predetermined elements from
 * uncertainties; the thresholds (4 or more of 5 is high) and the verdicts on
 * options are the platform's teaching convention.
 */
import { esc } from '../markup';
import { fmtNumber, round } from '../format';
import { type Check, andList, count, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, r1, svgDoc, txt } from './svg';
import { button, chartRegion, checksHtml, field, ratingOptions, select, tableRegion } from './ui';

export type Category = 'social' | 'technological' | 'economic' | 'environmental' | 'political' | 'legal' | 'ethical';
export type DriverClass = 'critical' | 'predetermined' | 'watch' | 'background';
/** A quadrant: the first or second end of axis A, with the first or second end of axis B. */
export type Quad = 'a1b1' | 'a1b2' | 'a2b1' | 'a2b2';

export interface Driver {
  id: string;
  name: string;
  category: Category;
  /** How much it would change the answer to the focal question, 1 to 5. */
  impact: number;
  /** How uncertain its outcome is over the horizon, 1 to 5. */
  uncertainty: number;
  /** The two ends of the range of outcomes. */
  pole1: string;
  pole2: string;
  evidence: string;
}

export interface Scenario {
  name: string;
  story: string;
  implications: string;
  /** Early-warning signposts, one per line. */
  signposts: string;
}

export interface ScenarioOption {
  id: string;
  name: string;
  /** How well the option would do in each future, 1 (fails) to 5 (thrives). */
  ratings: Record<Quad, number>;
}

export interface ScenarioState {
  business: string;
  question: string;
  horizon: string;
  drivers: Driver[];
  /** The drivers chosen as the axes, by id ("" when not chosen). */
  axisA: string;
  axisB: string;
  scenarios: Record<Quad, Scenario>;
  options: ScenarioOption[];
}

export const CATEGORIES: Record<Category, string> = {
  social: 'Social',
  technological: 'Technological',
  economic: 'Economic',
  environmental: 'Environmental',
  political: 'Political',
  legal: 'Legal',
  ethical: 'Ethical',
};
const CAT_IDS = Object.keys(CATEGORIES) as Category[];

export const CLASSES: Record<DriverClass, { name: string; rule: string; use: string; css: string }> = {
  critical: { name: 'Critical uncertainty', rule: 'impact 4 or 5, uncertainty 4 or 5', use: 'A candidate for an axis: important, and genuinely open.', css: 'sx-band--high' },
  predetermined: { name: 'Predetermined element', rule: 'impact 4 or 5, uncertainty 3 or less', use: 'Important but more predictable: build it into every scenario.', css: 'sx-band--medium' },
  watch: { name: 'Secondary uncertainty', rule: 'impact 3 or less, uncertainty 4 or 5', use: 'Uncertain but less important: watch it, and use it to colour the stories.', css: 'sx-band--low' },
  background: { name: 'Background', rule: 'impact 3 or less, uncertainty 3 or less', use: 'Less important and more predictable: note it and move on.', css: 'sx-band--low' },
};
const CLASS_ORDER: DriverClass[] = ['critical', 'predetermined', 'watch', 'background'];

export const QUADS: Quad[] = ['a1b1', 'a1b2', 'a2b1', 'a2b2'];
export const IMPACT_WORDS = ['Very small', 'Small', 'Moderate', 'Large', 'Very large'] as const;
export const UNCERTAINTY_WORDS = ['Almost certain', 'Fairly predictable', 'Could go either way', 'Very uncertain', 'Wide open'] as const;
export const RATING_WORDS = ['Fails', 'Struggles', 'Holds up', 'Does well', 'Thrives'] as const;
export const HIGH = 4;
export const LIMITS = { drivers: 12, options: 6 };

export type Verdict = 'robust' | 'contingent' | 'fragile';
export const VERDICTS: Record<Verdict, { name: string; rule: string; css: string; advice: string }> = {
  robust: { name: 'Robust', rule: 'holds up (3 or more) in every future', css: 'sx-band--good', advice: 'a candidate to commit to now' },
  contingent: { name: 'Contingent', rule: 'does well (4 or 5) in some futures and struggles (2 or less) in others', css: 'sx-band--medium', advice: 'a bet on some futures: prepare it, and commit when its signposts appear' },
  fragile: { name: 'Fragile', rule: 'struggles in some futures and does well in none', css: 'sx-band--high', advice: 'drop it or redesign it' },
};

/* ---------- Reading saved work ---------- */

const DEFAULT_RATINGS: Record<Quad, number> = { a1b1: 3, a1b2: 3, a2b1: 3, a2b2: 3 };

export function normalize(raw: unknown): ScenarioState {
  const r = obj(raw);
  const used = new Set<string>();
  const drivers = list(r.drivers, LIMITS.drivers).map((x0) => {
    const x = obj(x0);
    return {
      id: ident(x.id, used, 'd'),
      name: str(x.name, 120),
      category: oneOf(x.category, CAT_IDS, 'economic'),
      impact: int(x.impact, 1, 5, 3),
      uncertainty: int(x.uncertainty, 1, 5, 3),
      pole1: str(x.pole1, 120),
      pole2: str(x.pole2, 120),
      evidence: str(x.evidence, 500),
    };
  });
  const ids = new Set(drivers.map((d) => d.id));
  const axis = (v: unknown) => (typeof v === 'string' && ids.has(v) ? v : '');
  const sc = obj(r.scenarios);
  const scenarios = Object.fromEntries(
    QUADS.map((q) => {
      const x = obj(sc[q]);
      return [q, { name: str(x.name, 80), story: str(x.story, 1200), implications: str(x.implications, 800), signposts: str(x.signposts, 800) }];
    }),
  ) as Record<Quad, Scenario>;
  const usedO = new Set<string>();
  const options = list(r.options, LIMITS.options).map((x0) => {
    const x = obj(x0);
    const rt = obj(x.ratings);
    return { id: ident(x.id, usedO, 'o'), name: str(x.name, 120), ratings: Object.fromEntries(QUADS.map((q) => [q, int(rt[q], 1, 5, 3)])) as Record<Quad, number> };
  });
  return { business: str(r.business, 120), question: str(r.question, 300), horizon: str(r.horizon, 40), drivers, axisA: axis(r.axisA), axisB: axis(r.axisB), scenarios, options };
}

export function blank(): ScenarioState {
  return normalize({
    drivers: [
      { id: 'd1', impact: 3, uncertainty: 3 },
      { id: 'd2', impact: 3, uncertainty: 3 },
      { id: 'd3', impact: 3, uncertainty: 3 },
    ],
    options: [{ id: 'o1' }],
  });
}

export function newDriver(s: Pick<ScenarioState, 'drivers'>): Driver {
  return { id: nextId('d', s.drivers.map((d) => d.id)), name: '', category: 'economic', impact: 3, uncertainty: 3, pole1: '', pole2: '', evidence: '' };
}

export function newOption(s: Pick<ScenarioState, 'options'>): ScenarioOption {
  return { id: nextId('o', s.options.map((o) => o.id)), name: '', ratings: { ...DEFAULT_RATINGS } };
}

/* ---------- The model ---------- */

export function classify(d: Pick<Driver, 'impact' | 'uncertainty'>): DriverClass {
  if (d.impact >= HIGH) return d.uncertainty >= HIGH ? 'critical' : 'predetermined';
  return d.uncertainty >= HIGH ? 'watch' : 'background';
}

/** Impact times uncertainty: how strongly a driver claims a place on an axis. */
export const weight = (d: Pick<Driver, 'impact' | 'uncertainty'>) => d.impact * d.uncertainty;

const named = (s: ScenarioState) => s.drivers.filter((d) => d.name.trim());
const dname = (d: Driver | undefined, fallback = 'an unnamed driver') => (d?.name.trim() ? d.name.trim() : fallback);

/** Named drivers, by class (critical first), then by weight, then as entered. */
export function ranked(s: ScenarioState): Driver[] {
  return named(s)
    .map((d, i) => ({ d, i }))
    .sort((a, b) => CLASS_ORDER.indexOf(classify(a.d)) - CLASS_ORDER.indexOf(classify(b.d)) || weight(b.d) - weight(a.d) || a.i - b.i)
    .map(({ d }) => d);
}

/** The two critical uncertainties with the most weight: the axes the tool suggests. */
export function suggestedAxes(s: ScenarioState): string[] {
  return ranked(s)
    .filter((d) => classify(d) === 'critical')
    .slice(0, 2)
    .map((d) => d.id);
}

export function axes(s: ScenarioState): { a?: Driver; b?: Driver } {
  return { a: s.drivers.find((d) => d.id === s.axisA), b: s.drivers.find((d) => d.id === s.axisB) };
}

/** True when the two axes are chosen and different. */
export function axesReady(s: ScenarioState): boolean {
  return Boolean(s.axisA && s.axisB && s.axisA !== s.axisB);
}

const pole = (d: Driver | undefined, which: 1 | 2) => {
  const p = which === 1 ? d?.pole1 : d?.pole2;
  return p?.trim() ? p.trim() : `${dname(d, 'the axis')}: ${which === 1 ? 'one end' : 'the other end'}`;
};

/** The two ends that define a quadrant, in words. */
export function quadPoles(s: ScenarioState, q: Quad): [string, string] {
  const { a, b } = axes(s);
  return [pole(a, q.startsWith('a1') ? 1 : 2), pole(b, q.endsWith('b1') ? 1 : 2)];
}

export function quadLabel(s: ScenarioState, q: Quad): string {
  const [x, y] = quadPoles(s, q);
  return `${x}; ${y}`;
}

export function scenarioName(s: ScenarioState, q: Quad): string {
  return s.scenarios[q].name.trim() || `Future ${QUADS.indexOf(q) + 1}`;
}

export function signposts(sc: Scenario): string[] {
  return sc.signposts
    .split('\n')
    .map((l) => l.replace(/^[-*\s]+/, '').trim())
    .filter(Boolean);
}

export interface OptionTest {
  o: ScenarioOption;
  worst: number;
  best: number;
  average: number;
  verdict: Verdict;
  /** The futures where it does well (4 or more), and where it struggles (2 or less). */
  strong: Quad[];
  weak: Quad[];
}

export function verdictOf(worst: number, best: number): Verdict {
  if (worst >= 3) return 'robust';
  return best >= 4 ? 'contingent' : 'fragile';
}

/** Each named option tested in the four futures, robust first, then by average. */
export function tests(s: ScenarioState): OptionTest[] {
  const order: Verdict[] = ['robust', 'contingent', 'fragile'];
  return s.options
    .filter((o) => o.name.trim())
    .map((o, i) => {
      const v = QUADS.map((q) => o.ratings[q]);
      const worst = Math.min(...v);
      const best = Math.max(...v);
      return {
        i,
        t: {
          o,
          worst,
          best,
          average: round(v.reduce((n, x) => n + x, 0) / v.length, 2),
          verdict: verdictOf(worst, best),
          strong: QUADS.filter((q) => o.ratings[q] >= 4),
          weak: QUADS.filter((q) => o.ratings[q] <= 2),
        },
      };
    })
    .sort((a, b) => order.indexOf(a.t.verdict) - order.indexOf(b.t.verdict) || b.t.average - a.t.average || b.t.worst - a.t.worst || a.i - b.i)
    .map(({ t }) => t);
}

export function checks(s: ScenarioState): Check[] {
  const out: Check[] = [];
  const { a, b } = axes(s);
  if (!s.question.trim()) out.push({ level: 'warning', text: 'State the focal question. Scenarios are built for a decision; without one, there is no way to tell which forces matter.' });
  if (!s.horizon.trim()) out.push({ level: 'warning', text: 'Give a horizon, such as a year. How uncertain a force is depends on how far ahead you look.' });
  if (named(s).length < 4) out.push({ level: 'info', text: 'List at least four driving forces before choosing the axes, so that the two you choose have been compared with others.' });
  if (!s.axisA || !s.axisB) out.push({ level: 'error', text: 'Choose a driver for each axis. The four futures are the combinations of their ends.' });
  else if (s.axisA === s.axisB) out.push({ level: 'error', text: 'The two axes are the same driver. Choose two different critical uncertainties.' });
  for (const d of [a, b]) {
    if (!d || !axesReady(s)) continue;
    if (classify(d) !== 'critical') out.push({ level: 'warning', text: `${dname(d)} is not rated a critical uncertainty (impact and uncertainty both 4 or more). An axis should be both important and genuinely open.` });
    if (!d.pole1.trim() || !d.pole2.trim()) out.push({ level: 'warning', text: `Name both ends of ${dname(d)}: the four futures are built on them.` });
  }
  if (a && b && axesReady(s) && a.category === b.category) out.push({ level: 'info', text: `Both axes are ${CATEGORIES[a.category].toLowerCase()} forces. Check that they can vary independently, and are not two faces of one uncertainty.` });
  const sug = suggestedAxes(s);
  if (axesReady(s) && sug.length === 2 && !sug.every((x) => x === s.axisA || x === s.axisB)) out.push({ level: 'info', text: `On your ratings the two weightiest critical uncertainties are ${andList(sug.map((x) => dname(s.drivers.find((d) => d.id === x))))}. Keep your axes if you have a reason, and say what it is.` });
  if (named(s).length && !named(s).some((d) => classify(d) === 'predetermined')) out.push({ level: 'info', text: 'No driver is rated important and fairly predictable. Most futures share some trends; name them, so that every scenario includes them.' });
  const blankStory = QUADS.filter((q) => !s.scenarios[q].name.trim() || !s.scenarios[q].story.trim());
  if (blankStory.length) out.push({ level: 'warning', text: `${count(blankStory.length, true)} of the four futures ${blankStory.length === 1 ? 'needs' : 'need'} a name and a narrative. A future no one can picture will not change anyone's thinking.` });
  const noImp = QUADS.filter((q) => s.scenarios[q].story.trim() && !s.scenarios[q].implications.trim());
  if (noImp.length) out.push({ level: 'warning', text: `Say what ${andList(noImp.map((q) => `"${scenarioName(s, q)}"`))} would mean for the business. The implications are the point of the exercise.` });
  const fewSigns = QUADS.filter((q) => s.scenarios[q].story.trim() && signposts(s.scenarios[q]).length < 2);
  if (fewSigns.length) out.push({ level: 'info', text: `Give at least two early-warning signposts for ${andList(fewSigns.map((q) => `"${scenarioName(s, q)}"`))}, one per line: things you could observe that would show this future arriving.` });
  const names = QUADS.map((q) => s.scenarios[q].name.trim().toLowerCase()).filter(Boolean);
  if (names.some((n, i) => names.indexOf(n) !== i)) out.push({ level: 'info', text: 'Two futures share a name. Give each a name that captures what makes it different.' });
  if (!s.options.some((o) => o.name.trim())) out.push({ level: 'info', text: 'Add the options you are weighing, and rate each in every future, to see which hold up in all four.' });
  return out;
}

export function reading(s: ScenarioState): string {
  const { a, b } = axes(s);
  if (!axesReady(s) || !a || !b) return 'Choose two different critical uncertainties as the axes to build the four futures.';
  const pre = ranked(s).filter((d) => classify(d) === 'predetermined');
  const lead = `Four futures built on ${dname(a).toLowerCase()} and ${dname(b).toLowerCase()}${s.horizon.trim() ? `, to ${s.horizon.trim()}` : ''}.`;
  const common = pre.length ? ` Every one of them includes ${andList(pre.map((d) => dname(d).toLowerCase()))}.` : '';
  const t = tests(s);
  const by = (v: Verdict) => t.filter((x) => x.verdict === v).map((x) => `"${x.o.name.trim()}"`);
  const robust = by('robust');
  const contingent = t.filter((x) => x.verdict === 'contingent');
  const fragile = by('fragile');
  const opts = t.length
    ? ` ${robust.length ? `${andList(robust)} ${robust.length === 1 ? 'holds' : 'hold'} up in all four.` : 'No option holds up in all four futures, so the plan needs a hedge or a way to wait for the signposts.'}${
        contingent.length ? ` ${andList(contingent.map((x) => `"${x.o.name.trim()}"`))} ${contingent.length === 1 ? 'is a bet' : 'are bets'} on ${andList([...new Set(contingent.flatMap((x) => x.strong))].map((q) => `"${scenarioName(s, q)}"`))}: prepare ${contingent.length === 1 ? 'it' : 'them'}, and watch the signposts.` : ''
      }${fragile.length ? ` ${andList(fragile)} ${fragile.length === 1 ? 'struggles' : 'struggle'} somewhere and ${fragile.length === 1 ? 'does' : 'do'} well nowhere.` : ''}`
    : '';
  return `${lead}${common}${opts} Scenarios are not forecasts: none of the four is the likeliest, and the real future may mix them. Their value is in plans that hold up across them, and in the signposts that show which way the world is moving.`;
}

export function headline(s: ScenarioState): string {
  const { a, b } = axes(s);
  if (!axesReady(s) || !a || !b) return 'Scenario axes not chosen yet.';
  const robust = tests(s).filter((x) => x.verdict === 'robust');
  return `Four futures on ${dname(a).toLowerCase()} and ${dname(b).toLowerCase()}; robust in all four: ${robust.length ? andList(robust.map((x) => x.o.name.trim())) : 'no option yet'}.`;
}

/* ---------- The chart ---------- */

/** Splits text into lines of at most `max` characters, breaking at spaces. */
export function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = w;
    else if (`${line} ${w}`.length <= max) line = `${line} ${w}`;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

export function matrixSvg(s: ScenarioState, id: string): string {
  const W = 720;
  const H = 560;
  const L = 132;
  const R = 132;
  const T = 76;
  const B = 76;
  const pw = W - L - R;
  const ph = H - T - B;
  const mx = L + pw / 2;
  const my = T + ph / 2;
  const { a, b } = axes(s);
  const ready = Boolean(axesReady(s) && a && b);
  const p: string[] = [];
  // Axis A runs from its first end (left) to its second (right); axis B from its first end (bottom) to its second (top).
  const cells: Array<[Quad, number, number]> = [
    ['a1b2', L, T],
    ['a2b2', mx, T],
    ['a1b1', L, my],
    ['a2b1', mx, my],
  ];
  // Each option, numbered as in the inputs, with five dots for its rating in this future.
  const opts = s.options.map((o, i) => ({ o, n: i + 1 })).filter(({ o }) => o.name.trim());
  for (const [q, x, y] of cells) {
    p.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(pw / 2)}" height="${r1(ph / 2)}" fill="${q === 'a2b2' || q === 'a1b1' ? C.paper : C.white}"/>`);
    const lines = wrap(ready ? scenarioName(s, q) : `Future ${QUADS.indexOf(q) + 1}`, 20).slice(0, 3);
    lines.forEach((l, i) => p.push(txt(x + pw / 4, y + 40 + i * 21, l, { anchor: 'middle', serif: true, size: 17, weight: 700, fill: C.ink })));
    const top = y + 40 + lines.length * 21 + 6;
    const rowH = Math.min(18, (y + ph / 2 - 14 - top) / Math.max(1, opts.length));
    opts.forEach(({ o, n }, k) => {
      const v = o.ratings[q];
      const tone = v >= 4 ? C.green : v <= 2 ? C.signal : C.slate;
      const ry = top + k * rowH + rowH / 2;
      p.push(txt(x + pw / 4 - 16, ry + 4, `Option ${n}`, { anchor: 'end', size: 11, fill: C.body }));
      for (let d = 0; d < 5; d++) p.push(`<circle cx="${r1(x + pw / 4 - 6 + d * 11)}" cy="${r1(ry)}" r="4" fill="${d < v ? tone : C.white}" stroke="${tone}" stroke-width="1.25"/>`);
      p.push(txt(x + pw / 4 + 52, ry + 4, RATING_WORDS[v - 1] ?? '', { size: 10.5, fill: tone === C.slate ? C.slate : v >= 4 ? C.greenText : C.signalText }));
    });
  }
  p.push(`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`);
  p.push(`<line x1="${r1(mx)}" y1="${T}" x2="${r1(mx)}" y2="${T + ph}" stroke="${C.ink}" stroke-width="1.5"/>`);
  p.push(`<line x1="${L}" y1="${r1(my)}" x2="${L + pw}" y2="${r1(my)}" stroke="${C.ink}" stroke-width="1.5"/>`);
  if (ready && a && b) {
    // Each end of each axis: the driver's name in bold, then the end, wrapped to the space beside the frame.
    const side = (d: Driver, which: 1 | 2, x: number, anchor: 'start' | 'end') => {
      const head = wrap(dname(d), 18).slice(0, 2);
      const body = wrap(pole(d, which), 18).slice(0, 4);
      const n = head.length + body.length;
      const y0 = my - ((n - 1) * 14) / 2 + 4;
      head.forEach((l, i) => p.push(txt(x, y0 + i * 14, l, { anchor, size: 11.5, weight: 700, fill: C.ink })));
      body.forEach((l, i) => p.push(txt(x, y0 + (head.length + i) * 14, l, { anchor, size: 11.5, fill: C.slate })));
    };
    side(a, 1, L - 12, 'end');
    side(a, 2, L + pw + 12, 'start');
    const edge = (d: Driver, which: 1 | 2, top: boolean) => {
      const lines = [`${dname(d)}:`, ...wrap(pole(d, which), 64)].slice(0, 3);
      lines.forEach((l, i) => {
        const y = top ? T - 12 - (lines.length - 1 - i) * 15 : T + ph + 20 + i * 15;
        p.push(txt(mx, y, l, { anchor: 'middle', size: 11.5, weight: i === 0 ? 700 : 400, fill: i === 0 ? C.ink : C.slate }));
      });
    };
    edge(b, 2, true);
    edge(b, 1, false);
  }
  const desc = ready
    ? `Scenario matrix on two critical uncertainties: ${dname(a)} (from ${pole(a, 1)} to ${pole(a, 2)}) and ${dname(b)} (from ${pole(b, 1)} to ${pole(b, 2)}). ${QUADS.map((q) => `${scenarioName(s, q)}: ${quadLabel(s, q)}${opts.length ? `; ${opts.map(({ o, n }) => `option ${n} ${o.ratings[q]} of 5`).join(', ')}` : ''}`).join('. ')}.`
    : 'Scenario matrix: the two axes have not been chosen yet.';
  return svgDoc(W, H, id, 'Four futures on two critical uncertainties', desc, p.join(''));
}

/* ---------- HTML ---------- */

const impactOpts = ratingOptions(IMPACT_WORDS);
const uncertaintyOpts = ratingOptions(UNCERTAINTY_WORDS);
const ratingOpts = ratingOptions(RATING_WORDS);

export function classHtml(d: Pick<Driver, 'impact' | 'uncertainty'>): string {
  const c = classify(d);
  return `<span class="sx-place__label">Class</span> <strong>${esc(CLASSES[c].name)}</strong> <span class="muted">(${esc(CLASSES[c].use)})</span>`;
}

export function axisOptionLabel(d: Driver, n: number): string {
  return `${dname(d, `Driver ${n}`)} (${CLASSES[classify(d)].name.toLowerCase()})`;
}

function driverRow(d: Driver, n: number, uid: string): string {
  const id = `${uid}-${d.id}`;
  const nm = dname(d, `driver ${n}`);
  return `<li class="sx-row" data-row="${esc(d.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body"><div class="sx-grid-2">${field({ id: `${id}-name`, k: `drivers.${d.id}.name`, label: `Driving force ${n}`, value: d.name, maxlength: 120 })}${select({
    id: `${id}-cat`,
    k: `drivers.${d.id}.category`,
    label: 'Kind',
    labelHtml: `Kind<span class="sr-only"> of ${esc(nm)}</span>`,
    value: d.category,
    options: CAT_IDS.map((c) => ({ value: c, label: CATEGORIES[c] })),
  })}</div><div class="sx-grid-2">${select({ id: `${id}-imp`, k: `drivers.${d.id}.impact`, label: 'Impact', labelHtml: `Impact on the question<span class="sr-only">: ${esc(nm)}</span>`, value: d.impact, options: impactOpts, integer: true })}${select({
    id: `${id}-unc`,
    k: `drivers.${d.id}.uncertainty`,
    label: 'Uncertainty',
    labelHtml: `Uncertainty over the horizon<span class="sr-only">: ${esc(nm)}</span>`,
    value: d.uncertainty,
    options: uncertaintyOpts,
    integer: true,
  })}</div><p class="sx-place" data-class="${esc(d.id)}">${classHtml(d)}</p><div class="sx-grid-2">${field({ id: `${id}-p1`, k: `drivers.${d.id}.pole1`, label: 'One end of its range', value: d.pole1, maxlength: 120 })}${field({
    id: `${id}-p2`,
    k: `drivers.${d.id}.pole2`,
    label: 'The other end',
    value: d.pole2,
    maxlength: 120,
  })}</div>${field({ id: `${id}-ev`, k: `drivers.${d.id}.evidence`, label: 'Evidence, with a date', value: d.evidence, multiline: true, rows: 2, maxlength: 500 })}<div class="sx-row__meta">${button({
    act: 'remove-driver',
    label: 'Remove',
    aria: `Remove driving force ${n}: ${nm}`,
    data: { id: d.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

function scenarioFields(s: ScenarioState, q: Quad, uid: string): string {
  const sc = s.scenarios[q];
  const id = `${uid}-${q}`;
  return `<fieldset class="sx-q sx-q--future"><legend>Future ${QUADS.indexOf(q) + 1}</legend><p class="sx-q__prompt" data-quad="${q}">${esc(quadLabel(s, q))}</p><div class="sx-row__body">${field({ id: `${id}-name`, k: `scenarios.${q}.name`, label: 'Its name', value: sc.name, maxlength: 80, hint: 'A short, memorable name for this world.' })}${field({
    id: `${id}-story`,
    k: `scenarios.${q}.story`,
    label: 'The narrative',
    value: sc.story,
    multiline: true,
    rows: 4,
    maxlength: 1200,
    hint: 'How the world gets there from today, and what it is like to do business in it.',
  })}${field({ id: `${id}-imp`, k: `scenarios.${q}.implications`, label: 'What it would mean for the business', value: sc.implications, multiline: true, rows: 3, maxlength: 800 })}${field({
    id: `${id}-sign`,
    k: `scenarios.${q}.signposts`,
    label: 'Early-warning signposts, one per line',
    value: sc.signposts,
    multiline: true,
    rows: 3,
    maxlength: 800,
    hint: 'Things you could observe early that would show this future arriving.',
  })}</div></fieldset>`;
}

function optionRow(s: ScenarioState, o: ScenarioOption, n: number, uid: string): string {
  const id = `${uid}-${o.id}`;
  const nm = o.name.trim() || `option ${n}`;
  return `<li class="sx-row" data-row="${esc(o.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body">${field({ id: `${id}-name`, k: `options.${o.id}.name`, label: `Option ${n}`, value: o.name, maxlength: 120 })}<div class="sx-grid-2">${QUADS.map((q) =>
    select({
      id: `${id}-${q}`,
      k: `options.${o.id}.ratings.${q}`,
      label: `In ${scenarioName(s, q)}`,
      labelHtml: `In <span data-quad-name="${q}">${esc(scenarioName(s, q))}</span><span class="sr-only">: ${esc(nm)}</span>`,
      value: o.ratings[q],
      options: ratingOpts,
      integer: true,
    }),
  ).join('')}</div><div class="sx-row__meta">${button({ act: 'remove-option', label: 'Remove', aria: `Remove option ${n}: ${nm}`, data: { id: o.id }, cls: 'sx-row__remove' })}</div></div></li>`;
}

export function editorHtml(s: ScenarioState, uid: string): string {
  const axisOpts = [{ value: '', label: 'Choose a driving force' }, ...s.drivers.map((d, i) => ({ value: d.id, label: axisOptionLabel(d, i + 1) }))];
  return `<div class="sx-context sx-context--three">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-question`,
    k: 'question',
    label: 'The focal question',
    value: s.question,
    multiline: true,
    rows: 2,
    maxlength: 300,
    hint: 'The decision the scenarios are for.',
  })}${field({ id: `${uid}-horizon`, k: 'horizon', label: 'Horizon', value: s.horizon, maxlength: 40, hint: 'How far ahead, such as a year.' })}</div><fieldset class="sx-q"><legend>Driving forces</legend><p class="sx-q__prompt">The forces outside the business that will shape the answer, from a STEEPLE scan or your own. Rate each for its impact on the question and how uncertain its outcome is; give both ends of its range.</p><ol class="sx-rows" role="list">${s.drivers
    .map((d, i) => driverRow(d, i + 1, uid))
    .join('')}</ol>${button({ act: 'add-driver', label: 'Add a driving force', cls: 'sx-add', disabled: s.drivers.length >= LIMITS.drivers })}</fieldset><fieldset class="sx-q"><legend>The two axes</legend><p class="sx-q__prompt">Choose two critical uncertainties that can vary independently. Their ends make the four futures.</p><div class="sx-grid-2">${select({
    id: `${uid}-axisA`,
    k: 'axisA',
    label: 'Axis A (across)',
    value: s.axisA,
    options: axisOpts,
  })}${select({ id: `${uid}-axisB`, k: 'axisB', label: 'Axis B (up)', value: s.axisB, options: axisOpts })}</div></fieldset>${QUADS.map((q) => scenarioFields(s, q, uid)).join('')}<fieldset class="sx-q"><legend>Your options, tested in each future</legend><p class="sx-q__prompt">For each option, judge how well it would do in each future, from 1 (fails) to 5 (thrives).</p><ol class="sx-rows" role="list">${s.options
    .map((o, i) => optionRow(s, o, i + 1, uid))
    .join('')}</ol>${button({ act: 'add-option', label: 'Add an option', cls: 'sx-add', disabled: s.options.length >= LIMITS.options })}</fieldset>`;
}

export function outputsHtml(s: ScenarioState, uid: string): string {
  const r = ranked(s);
  const num = new Map(s.drivers.map((d, i) => [d.id, i + 1]));
  const axisIds = new Set([s.axisA, s.axisB]);
  const drivers = r.length
    ? tableRegion(
        'Driving forces by impact and uncertainty',
        `<caption class="sr-only">Each driving force with its impact, its uncertainty and the class they give it</caption><thead><tr><th scope="col" class="n">No.</th><th scope="col">Driving force</th><th scope="col" class="n">Impact</th><th scope="col" class="n">Uncertainty</th><th scope="col">Class</th></tr></thead><tbody>${r
          .map(
            (d) =>
              `<tr${axisIds.has(d.id) && axesReady(s) ? ' class="is-best"' : ''}><td class="n num">${num.get(d.id)}</td><th scope="row">${esc(d.name.trim())}<span class="sx-swot__ev">${esc(CATEGORIES[d.category])}${axisIds.has(d.id) && axesReady(s) ? `; axis ${d.id === s.axisA ? 'A' : 'B'}` : ''}${d.evidence.trim() ? `: ${esc(d.evidence.trim())}` : ''}</span></th><td class="n num">${d.impact}</td><td class="n num">${d.uncertainty}</td><td><span class="sx-band ${CLASSES[classify(d)].css}">${esc(CLASSES[classify(d)].name)}</span></td></tr>`,
          )
          .join('')}</tbody>`,
      )
    : '<p class="small muted">No driving forces yet.</p>';
  const legend = `<ul class="sx-legend" role="list">${CLASS_ORDER.map((c) => `<li><span class="sx-band ${CLASSES[c].css}">${esc(CLASSES[c].name)}</span> ${esc(CLASSES[c].rule)}</li>`).join('')}<li>High means 4 or 5: the platform's teaching convention.</li></ul>`;
  const futures = QUADS.map((q) => {
    const sc = s.scenarios[q];
    const signs = signposts(sc);
    return `<div class="sx-future"><p class="sx-future__poles">${esc(quadLabel(s, q))}</p><h5 class="sx-out__h5">${esc(scenarioName(s, q))}</h5><p class="small">${esc(orDash(sc.story, 'No narrative yet.'))}</p><p class="small"><b>For the business:</b> ${esc(orDash(sc.implications, 'not written yet.'))}</p>${
      signs.length ? `<p class="small"><b>Signposts:</b></p><ul class="small sx-future__signs">${signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="small muted">No signposts yet.</p>'
    }</div>`;
  }).join('');
  const t = tests(s);
  const optTable = t.length
    ? tableRegion(
        'Options tested in the four futures',
        `<caption class="sr-only">Each option rated from 1 (fails) to 5 (thrives) in each future, with its worst rating, its average and the verdict</caption><thead><tr><th scope="col">Option</th>${QUADS.map((q) => `<th scope="col" class="n">${esc(scenarioName(s, q))}</th>`).join('')}<th scope="col" class="n">Worst</th><th scope="col" class="n">Average</th><th scope="col">Verdict</th></tr></thead><tbody>${t
          .map(
            (x) =>
              `<tr><th scope="row">${esc(x.o.name.trim())}</th>${QUADS.map((q) => `<td class="n num">${x.o.ratings[q]}<span class="sx-swot__ev">${esc(RATING_WORDS[x.o.ratings[q] - 1] ?? '')}</span></td>`).join('')}<td class="n num">${x.worst}</td><td class="n num">${fmtNumber(x.average, 2)}</td><td><span class="sx-band ${VERDICTS[x.verdict].css}">${VERDICTS[x.verdict].name}</span><span class="sx-swot__ev">${esc(VERDICTS[x.verdict].advice)}</span></td></tr>`,
          )
          .join('')}</tbody>`,
      )
    : '<p class="small muted">No options to test yet.</p>';
  const verdictLegend = `<ul class="sx-legend" role="list">${(Object.keys(VERDICTS) as Verdict[]).map((v) => `<li><span class="sx-band ${VERDICTS[v].css}">${VERDICTS[v].name}</span> ${esc(VERDICTS[v].rule)}</li>`).join('')}</ul>`;
  return `<div class="sx-out__block"><h4 class="sx-out__h">The driving forces</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.question.trim() ? `Focal question: ${s.question.trim()}` : 'Focal question not stated.')}${s.horizon.trim() ? ` Horizon: ${esc(s.horizon.trim())}.` : ''}</p>${drivers}${legend}</div><div class="sx-out__block"><h4 class="sx-out__h">Four futures</h4>${chartRegion('Scenario matrix chart', matrixSvg(s, `${uid}-chart`))}<ul class="sx-legend" role="list"><li>Each future is one combination of the ends of the two axes</li><li>Dots: how each option does there, from 1 (fails) to 5 (thrives), numbered as in the inputs</li><li>Green: does well (4 or 5); red: struggles (2 or less); also in the table below</li></ul><p class="sx-reading" data-reading>${esc(reading(s))}</p><div class="sx-futures">${futures}</div></div><div class="sx-out__block"><h4 class="sx-out__h">Your options in each future</h4>${optTable}${verdictLegend}<p class="small muted">A robust option is not the best in any one future; it is the one you would not regret in any of them. A contingent option can still be right, if you commit when its signposts appear.</p></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the question and horizon are set, the axes are two different critical uncertainties with both ends named, and every future has a name, a narrative, implications and signposts.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: ScenarioState): string {
  const { a, b } = axes(s);
  return textDoc(`Scenario planning (enrichment): ${orDash(s.business, 'organization not named')}`, [
    textSection('Focal question', [orDash(s.question), `Horizon: ${orDash(s.horizon)}`]),
    textSection(
      'Driving forces',
      ranked(s).map((d) => `- ${d.name.trim()} [${CATEGORIES[d.category].toLowerCase()}; impact ${d.impact}, uncertainty ${d.uncertainty}; ${CLASSES[classify(d)].name.toLowerCase()}]${d.pole1.trim() || d.pole2.trim() ? `\n  Range: from ${orDash(d.pole1)} to ${orDash(d.pole2)}` : ''}${d.evidence.trim() ? `\n  Evidence: ${d.evidence.trim()}` : ''}`),
    ),
    textSection('Axes', axesReady(s) && a && b ? [`A: ${dname(a)}`, `B: ${dname(b)}`] : ['Not chosen yet.']),
    ...QUADS.map((q) =>
      textSection(`${scenarioName(s, q)} (${quadLabel(s, q)})`, [
        orDash(s.scenarios[q].story, '(no narrative yet)'),
        `For the business: ${orDash(s.scenarios[q].implications)}`,
        ...signposts(s.scenarios[q]).map((x) => `- Signpost: ${x}`),
      ]),
    ),
    textSection(
      'Options tested',
      tests(s).map((x) => `- ${x.o.name.trim()}: ${QUADS.map((q) => `${scenarioName(s, q)} ${x.o.ratings[q]}`).join(', ')}; worst ${x.worst}, average ${fmtNumber(x.average, 2)}; ${VERDICTS[x.verdict].name.toLowerCase()}.`),
    ),
    textSection('Reading', [reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. Scenario planning is not part of the IB course. A framework structures judgement; it does not produce the answer.',
  ]);
}

export function toCsvText(s: ScenarioState): string {
  return toCsv([
    ['Section', 'Name', 'Kind or future', 'Impact (1 to 5)', 'Uncertainty (1 to 5)', 'Class or verdict', 'Detail'],
    ...ranked(s).map((d) => ['Driving force', d.name.trim(), CATEGORIES[d.category], d.impact, d.uncertainty, CLASSES[classify(d)].name, `${d.pole1.trim()} | ${d.pole2.trim()}`]),
    ...QUADS.map((q) => ['Future', scenarioName(s, q), quadLabel(s, q), '', '', '', `${s.scenarios[q].story.trim()} | ${s.scenarios[q].implications.trim()} | ${signposts(s.scenarios[q]).join('; ')}`]),
    ...tests(s).map((x) => ['Option', x.o.name.trim(), QUADS.map((q) => `${scenarioName(s, q)} ${x.o.ratings[q]}`).join('; '), '', '', VERDICTS[x.verdict].name, `worst ${x.worst}, average ${round(x.average, 2)}`]),
  ]);
}

export function fileName(s: ScenarioState): string {
  return `${fileSlug(s.business)}-scenarios`;
}

export function problems(s: ScenarioState): string[] {
  const out: string[] = [];
  const { a, b } = axes(s);
  if (!s.question.trim() || !s.horizon.trim()) out.push('the worked example needs a focal question and a horizon');
  if (s.drivers.length < 5) out.push('the worked example should list at least five driving forces');
  if (!axesReady(s) || !a || !b) out.push('the worked example must choose two different axes');
  else {
    if (classify(a) !== 'critical' || classify(b) !== 'critical') out.push('both axes must be critical uncertainties');
    if (![a, b].every((d) => d.pole1.trim() && d.pole2.trim())) out.push('both axes need both ends named');
  }
  if (!s.drivers.some((d) => classify(d) === 'predetermined')) out.push('the worked example should show a predetermined element');
  QUADS.forEach((q) => {
    const sc = s.scenarios[q];
    if (!sc.name.trim() || !sc.story.trim() || !sc.implications.trim() || signposts(sc).length < 2) out.push(`future ${q} needs a name, a narrative, implications and at least two signposts`);
  });
  if (s.options.filter((o) => o.name.trim()).length < 3) out.push('the worked example should test at least three options');
  if (new Set(tests(s).map((x) => x.verdict)).size < 3) out.push('the worked example should show all three verdicts');
  return out;
}
