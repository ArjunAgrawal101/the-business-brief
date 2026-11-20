/**
 * Shared material for the scenario families: the places a business can be in
 * (with its currency and a multiplier that keeps figures plausible in it), the
 * IB toolkit's tools as the generator describes them, invented business
 * names, and number formatting. Everything is fictional; the multipliers only
 * keep figures in a believable range and are not exchange rates.
 */
import { fmtNumber } from '../format';
import type { Rng } from '../random';
import type { Choice, Exhibit, Level, Verdict } from './types';

export interface Place {
  city: string;
  country: string;
  /** The currency symbol written before an amount. */
  cur: string;
  /** Multiplies a family's base amounts, so that a price in rupees or shillings looks like one. */
  k: number;
  region: 'Europe' | 'Americas' | 'Asia' | 'Africa' | 'Oceania';
}

export const PLACES: Place[] = [
  { city: 'Manchester', country: 'the United Kingdom', cur: '£', k: 1, region: 'Europe' },
  { city: 'Lyon', country: 'France', cur: '€', k: 1, region: 'Europe' },
  { city: 'Valencia', country: 'Spain', cur: '€', k: 1, region: 'Europe' },
  { city: 'Rotterdam', country: 'the Netherlands', cur: '€', k: 1, region: 'Europe' },
  { city: 'Toronto', country: 'Canada', cur: 'C$', k: 1, region: 'Americas' },
  { city: 'Denver', country: 'the United States', cur: 'US$', k: 1, region: 'Americas' },
  { city: 'Monterrey', country: 'Mexico', cur: 'MX$', k: 20, region: 'Americas' },
  { city: 'Curitiba', country: 'Brazil', cur: 'R$', k: 5, region: 'Americas' },
  { city: 'Pune', country: 'India', cur: '₹', k: 80, region: 'Asia' },
  { city: 'Kuala Lumpur', country: 'Malaysia', cur: 'RM', k: 4, region: 'Asia' },
  { city: 'Singapore', country: 'Singapore', cur: 'S$', k: 1, region: 'Asia' },
  { city: 'Nairobi', country: 'Kenya', cur: 'KSh', k: 100, region: 'Africa' },
  { city: 'Cape Town', country: 'South Africa', cur: 'R', k: 15, region: 'Africa' },
  { city: 'Brisbane', country: 'Australia', cur: 'A$', k: 1, region: 'Oceania' },
  { city: 'Wellington', country: 'New Zealand', cur: 'NZ$', k: 1, region: 'Oceania' },
];

/** The IB business management toolkit (guide, pp. 13 to 15), as the generator offers it. Ids are those of src/content/tools; `does` is one sentence on what the tool is for. */
export const TOOLKIT: Record<string, { name: string; level: Level; does: string }> = {
  'swot-analysis': { name: 'SWOT analysis', level: 'SL/HL', does: 'SWOT analysis sorts what is strong and weak inside the business from the opportunities and threats outside it.' },
  'ansoff-matrix': { name: 'Ansoff matrix', level: 'SL/HL', does: 'The Ansoff matrix classifies growth options by whether the products and the markets are existing or new, and so by their usual risk.' },
  'steeple-analysis': { name: 'STEEPLE analysis', level: 'SL/HL', does: 'STEEPLE analysis scans the factors outside the business under seven headings: social, technological, economic, environmental, political, legal and ethical.' },
  'bcg-matrix': { name: 'BCG matrix', level: 'SL/HL', does: 'The BCG matrix places products by market growth and relative market share, to decide which deserve cash.' },
  'business-plan': { name: 'Business plan', level: 'SL/HL', does: 'A business plan sets out a new venture\u2019s market, operations and finances, with its forecasts, to test it and to raise finance.' },
  'decision-trees': { name: 'Decision trees', level: 'SL/HL', does: 'A decision tree compares options with uncertain outcomes by weighting each outcome\u2019s payoff by its probability.' },
  'descriptive-statistics': { name: 'Descriptive statistics', level: 'SL/HL', does: 'Descriptive statistics summarize data with averages, spread and charts, so that it can be compared and read.' },
  'circular-business-models': { name: 'Circular business models', level: 'SL/HL', does: 'Circular business models keep products and materials in use through reuse, repair, sharing, renting and recycling.' },
  'force-field-analysis': { name: 'Force field analysis', level: 'HL', does: 'Force field analysis weighs the forces driving a change against those restraining it, to plan how to make the change work.' },
  'gantt-chart': { name: 'Gantt chart', level: 'HL', does: 'A Gantt chart shows a project\u2019s tasks against time, to plan and monitor the schedule.' },
  'hofstedes-cultural-dimensions': { name: 'Hofstede\u2019s cultural dimensions', level: 'HL', does: 'Hofstede\u2019s cultural dimensions compare cultures on dimensions such as power distance, individualism and uncertainty avoidance.' },
  'porters-generic-strategies': { name: 'Porter\u2019s generic strategies', level: 'HL', does: 'Porter\u2019s generic strategies identify how a business competes: on lower cost or on difference, across a market or in a niche.' },
  contribution: { name: 'Contribution', level: 'HL', does: 'Contribution analysis judges a decision by the revenue it brings less the variable costs it causes, as in make-or-buy decisions and contribution costing.' },
  'critical-path-analysis': { name: 'Critical path analysis', level: 'HL', does: 'Critical path analysis finds the shortest time a project can take and the activities that cannot slip without delaying it.' },
  'simple-linear-regression': { name: 'Simple linear regression', level: 'HL', does: 'Simple linear regression fits a straight line to data on two variables, to describe the relationship and forecast from it.' },
};

export const toolName = (id: string) => TOOLKIT[id]?.name ?? id;

/** The feedback for a tool that does not fit: what it does, then what this decision needs instead. */
export function notThisTool(id: string, need: string): string {
  const t = TOOLKIT[id];
  if (!t) throw new Error(`Unknown toolkit tool ${id}`);
  return `${t.does} ${need}`;
}

/** A first syllable and a second word, for invented business names that read like real ones but are not. */
const NAME_START = ['Ardwell', 'Branksea', 'Corlin', 'Dunhallow', 'Elsby', 'Fernlea', 'Glenmarra', 'Harlowe', 'Inchmore', 'Kelbrook', 'Linnet', 'Moravel', 'Norcastle', 'Orrin', 'Pellworth', 'Quenby', 'Rosmere', 'Sallow', 'Tavelle', 'Ulvan', 'Verrin', 'Wendle', 'Yelland', 'Ashgrove', 'Bramwith', 'Calverley', 'Dovecote', 'Eastling'];

export function businessName(r: Rng, noun: string): string {
  return `${r.pick(NAME_START)} ${noun}`;
}

export function place(r: Rng, regions?: Array<Place['region']>): Place {
  return r.pick(regions ? PLACES.filter((p) => regions.includes(p.region)) : PLACES);
}

/** Money in the place's currency, whole or to two places: £12,400; KSh 1,240,000; ₹96.50. */
export function money(v: number, p: Place, dp?: number): string {
  const d = dp ?? (Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2);
  const s = fmtNumber(Math.abs(v), d);
  const gap = /[A-Za-z]$/.test(p.cur) ? ' ' : '';
  return `${v < 0 ? '−' : ''}${p.cur}${gap}${s}`;
}

export const num = (v: number, dp = 0) => fmtNumber(v, dp);
export const pct = (v: number, dp = 0) => `${fmtNumber(v, dp)}%`;

/** Free of floating-point dust: 0.1 + 0.2 is 0.3. */
export const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

/** Rounded to a given number of decimal places. */
export const roundTo = (v: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/** A business size the reader can picture: its staff and a word for it. */
export function sized(r: Rng, min: number, max: number): { staff: number; words: string } {
  const staff = r.int(min, max);
  const words = staff < 10 ? 'micro business' : staff < 50 ? 'small business' : staff < 250 ? 'medium-sized business' : 'large business';
  return { staff, words };
}

/** Choices in a fixed shape: a, b, c, d. */
export function lettered<T extends { text: string }>(xs: T[]): Array<T & { id: string }> {
  return xs.map((x, i) => ({ ...x, id: String.fromCharCode(97 + i) }));
}

/** Fisher-Yates with the scenario's own generator, so the order is the same for the same seed. */
export function shuffled<T>(r: Rng, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ---------- Building blocks for the families ---------- */


const choice = (verdict: Verdict) => (text: string, why: string): Choice => ({ id: '', text, verdict, why });
export const best = choice('best');
export const fair = choice('fair');
export const weak = choice('weak');

/** A table exhibit; the engine numbers it. */
export function table(title: string, relevant: boolean, why: string, columns: string[], rows: string[][], note?: string): Exhibit {
  return { id: '', title, columns, rows, note, relevant, why };
}

/** A text exhibit: an email, a note, a report. */
export function text(title: string, relevant: boolean, why: string, body: string): Exhibit {
  return { id: '', title, body, relevant, why };
}

/** "a" or "an" before a word. */
export const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
