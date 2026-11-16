/**
 * The advanced tools' forms as data: the worked example as the form shows it,
 * readers that turn saved work (or anything else found in storage) back into
 * a form without ever throwing, and builders that turn a form into the
 * model's input after the same checks the page shows. The browser reads its
 * fields into these shapes; the server and the tests use them directly.
 */
import { cleanSettings, CURRENCIES } from '../finance-lab/fields';
import type { Problem, Raw, Settings } from '../finance-lab/types';
import { ALTERNATIVES, COST_STRUCTURES, CURRENCY, DRIVERS, HISTORY, HISTORY_OPENING_STOCK, OPENING, PROJECTS, SCENARIOS, WACC_INPUTS } from './business';
import { MAX_PROJECTS, MAX_YEARS as CAP_MAX_YEARS, MIN_PROJECTS, validateCapital, WACC_FIELDS, waccFromRaw } from './capital';
import type { CapitalState } from './capital-view';
import { costStructureInput, SHARED_FIELDS, STRUCTURE_FIELDS, validateCostStructures, type CostStructureInput } from './cost-structure';
import { cleanName, forecastFieldNames, forecastFields, forecastInput, OPTION_IDS, SCENARIO_IDS, validateForecast, type ForecastInput, type OptionId, type ScenarioId } from './forecast';
import { inputValue } from './forms';
import { ACCOUNT_FIELDS, MAX_YEARS as PERF_MAX_YEARS, MIN_YEARS as PERF_MIN_YEARS, performanceInput, validatePerformance, type PerformanceInput } from './performance';

/** A number typed by a person: accepts "1,200", " 22.5 " and a typographic minus; null for anything else. */
export function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, '').replace(/−/g, '-');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string | null => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' && Number.isFinite(v) ? String(v).slice(0, max) : null);
const currencyOf = (v: unknown): string => (typeof v === 'string' && CURRENCIES.some((c) => c.value === v) ? v : CURRENCY);
const VALUE_MAX = 24;

/** Keeps only the named fields, as strings of a sensible length. */
function pickFields(v: unknown, names: readonly string[], fallback: Record<string, string>): Record<string, string> {
  const src = isObj(v) ? v : {};
  return Object.fromEntries(names.map((n) => [n, str(src[n], VALUE_MAX) ?? fallback[n] ?? '']));
}

/* ------------------------------------------------------------------ */
/* The integrated forecast                                             */
/* ------------------------------------------------------------------ */

export interface ForecastForm {
  fields: Record<string, string>;
  names: { a: string; b: string };
  view: { scenario: ScenarioId; option: OptionId };
  currency: string;
}

export const FORECAST_FIELD_NAMES = forecastFieldNames();

export const EXAMPLE_FORECAST: ForecastInput = {
  drivers: { ...DRIVERS },
  opening: { ...OPENING },
  scenarios: { upside: { ...SCENARIOS.upside }, downside: { ...SCENARIOS.downside } },
  alternatives: { a: { ...ALTERNATIVES.a }, b: { ...ALTERNATIVES.b } },
};

const KIND_OF: Record<string, 'money' | 'other'> = {};
for (const n of ['price', 'variableCost', 'fixedCosts', 'capex', 'repayment', 'o.nonCurrentAssets', 'o.stock', 'o.debtors', 'o.cash', 'o.creditors', 'o.borrowings', 'o.shareCapital', 'a.investment', 'a.borrowing', 'a.variableCostChange', 'a.fixedCostChange', 'b.investment', 'b.borrowing', 'b.variableCostChange', 'b.fixedCostChange']) KIND_OF[n] = 'money';

export function forecastForm(input: ForecastInput, view: ForecastForm['view'] = { scenario: 'base', option: 'none' }, currency = CURRENCY): ForecastForm {
  const { raw, text } = forecastFields(input);
  return {
    fields: Object.fromEntries(FORECAST_FIELD_NAMES.map((n) => [n, inputValue(raw[n] ?? 0, KIND_OF[n] === 'money' ? 'money' : 'number')])),
    names: { a: text['a.name'] ?? '', b: text['b.name'] ?? '' },
    view,
    currency,
  };
}

export const FORECAST_EXAMPLE_FORM = forecastForm(EXAMPLE_FORECAST);

export function readForecastSaved(v: unknown): ForecastForm | null {
  if (!isObj(v) || !isObj(v.fields)) return null;
  const view = isObj(v.view) ? v.view : {};
  const names = isObj(v.names) ? v.names : {};
  return {
    fields: pickFields(v.fields, FORECAST_FIELD_NAMES, FORECAST_EXAMPLE_FORM.fields),
    names: { a: str(names.a, 48) ?? FORECAST_EXAMPLE_FORM.names.a, b: str(names.b, 48) ?? FORECAST_EXAMPLE_FORM.names.b },
    view: {
      scenario: (SCENARIO_IDS as readonly unknown[]).includes(view.scenario) ? (view.scenario as ScenarioId) : 'base',
      option: (OPTION_IDS as readonly unknown[]).includes(view.option) ? (view.option as OptionId) : 'none',
    },
    currency: currencyOf(v.currency),
  };
}

export function forecastFromForm(f: ForecastForm): { problems: Problem[]; input: ForecastInput | null } {
  const raw: Raw = Object.fromEntries(FORECAST_FIELD_NAMES.map((n) => [n, toNumber(f.fields[n] ?? '')]));
  const problems = validateForecast(raw);
  if (problems.length) return { problems, input: null };
  return { problems, input: forecastInput(raw, { 'a.name': cleanName(f.names.a, 'Alternative A'), 'b.name': cleanName(f.names.b, 'Alternative B') }) };
}

/* ------------------------------------------------------------------ */
/* The capital budgeting comparator                                    */
/* ------------------------------------------------------------------ */

export interface CapitalForm {
  projects: Array<{ name: string; outlay: string; flows: string[] }>;
  /** The WACC inputs ("w.riskFree" and so on) and "ownRate". */
  fields: Record<string, string>;
  rateSource: 'wacc' | 'own';
  flex: '5' | '10' | '20';
  /** "best", or a project's index. */
  focus: string;
  currency: string;
}

export const CAPITAL_FIELD_NAMES = [...WACC_FIELDS.map((f) => `w.${f.key}`), 'ownRate'];
export const FLEX_CHOICES = ['5', '10', '20'] as const;

export const CAPITAL_EXAMPLE_FORM: CapitalForm = {
  projects: PROJECTS.map((p) => ({ name: p.name, outlay: String(p.outlay), flows: p.flows.map(String) })),
  fields: { ...Object.fromEntries(WACC_FIELDS.map((f) => [`w.${f.key}`, String(WACC_INPUTS[f.key as keyof typeof WACC_INPUTS])])), ownRate: '10' },
  rateSource: 'wacc',
  flex: '10',
  focus: 'best',
  currency: CURRENCY,
};

export function readCapitalSaved(v: unknown): CapitalForm | null {
  if (!isObj(v) || !Array.isArray(v.projects)) return null;
  const projects = v.projects
    .filter(isObj)
    .slice(0, MAX_PROJECTS)
    .map((p, i) => ({
      name: str(p.name, 48) ?? `Project ${i + 1}`,
      outlay: str(p.outlay, VALUE_MAX) ?? '',
      flows: (Array.isArray(p.flows) ? p.flows : []).slice(0, CAP_MAX_YEARS).map((x) => str(x, VALUE_MAX) ?? ''),
    }))
    .map((p) => (p.flows.length ? p : { ...p, flows: ['0'] }));
  if (projects.length < MIN_PROJECTS) return null;
  const flex = (FLEX_CHOICES as readonly unknown[]).includes(v.flex) ? (v.flex as CapitalForm['flex']) : '10';
  const focus = v.focus === 'best' || (typeof v.focus === 'string' && /^[0-2]$/.test(v.focus) && Number(v.focus) < projects.length) ? (v.focus as string) : 'best';
  return {
    projects,
    fields: pickFields(v.fields, CAPITAL_FIELD_NAMES, CAPITAL_EXAMPLE_FORM.fields),
    rateSource: v.rateSource === 'own' ? 'own' : 'wacc',
    flex,
    focus,
    currency: currencyOf(v.currency),
  };
}

export function capitalFromForm(f: CapitalForm): { problems: Problem[]; state: CapitalState | null } {
  const raw: Raw = Object.fromEntries(CAPITAL_FIELD_NAMES.map((n) => [n, toNumber(f.fields[n] ?? '')]));
  const projects = f.projects.map((p) => ({ name: p.name, outlay: toNumber(p.outlay), flows: p.flows.map((x) => toNumber(x)) }));
  const problems = validateCapital({ projects, rateSource: f.rateSource, raw });
  if (problems.length) return { problems, state: null };
  return {
    problems,
    state: {
      projects: projects.map((p, i) => ({ name: cleanName(f.projects[i]?.name ?? '', `Project ${i + 1}`), outlay: p.outlay ?? 0, flows: p.flows.map((x) => x ?? 0) })),
      rateSource: f.rateSource,
      ownRate: raw.ownRate ?? 0,
      wacc: waccFromRaw(raw),
      flex: Number(f.flex) / 100,
      focus: f.focus === 'best' ? 'best' : Number(f.focus),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Break-even scenarios                                                */
/* ------------------------------------------------------------------ */

export interface CostForm {
  fields: Record<string, string>;
  names: { a: string; b: string };
  settings: Settings;
}

export const COST_FIELD_NAMES = [...SHARED_FIELDS.map((f) => f.key), ...STRUCTURE_FIELDS.map((f) => `a.${f.key}`), ...STRUCTURE_FIELDS.map((f) => `b.${f.key}`)];
export const COST_SETTINGS: Settings = { currency: CURRENCY, unit: 'bag', units: 'bags', period: 'month' };

export const COST_EXAMPLE_FORM: CostForm = {
  fields: {
    price: inputValue(COST_STRUCTURES.price, 'money'),
    forecast: String(COST_STRUCTURES.forecast),
    capacity: String(COST_STRUCTURES.capacity),
    'a.fixedCosts': inputValue(COST_STRUCTURES.a.fixedCosts, 'money'),
    'a.variableCost': inputValue(COST_STRUCTURES.a.variableCost, 'money'),
    'b.fixedCosts': inputValue(COST_STRUCTURES.b.fixedCosts, 'money'),
    'b.variableCost': inputValue(COST_STRUCTURES.b.variableCost, 'money'),
  },
  names: { a: COST_STRUCTURES.a.name, b: COST_STRUCTURES.b.name },
  settings: COST_SETTINGS,
};

export function readCostSaved(v: unknown): CostForm | null {
  if (!isObj(v) || !isObj(v.fields)) return null;
  const names = isObj(v.names) ? v.names : {};
  const s = isObj(v.settings) ? v.settings : {};
  return {
    fields: pickFields(v.fields, COST_FIELD_NAMES, COST_EXAMPLE_FORM.fields),
    names: { a: str(names.a, 48) ?? COST_EXAMPLE_FORM.names.a, b: str(names.b, 48) ?? COST_EXAMPLE_FORM.names.b },
    settings: cleanSettings({ currency: typeof s.currency === 'string' ? s.currency : undefined, unit: typeof s.unit === 'string' ? s.unit : undefined, units: typeof s.units === 'string' ? s.units : undefined, period: typeof s.period === 'string' ? s.period : undefined }, COST_SETTINGS),
  };
}

export function costFromForm(f: CostForm): { problems: Problem[]; input: CostStructureInput | null } {
  const raw: Raw = Object.fromEntries(COST_FIELD_NAMES.map((n) => [n, toNumber(f.fields[n] ?? '')]));
  const problems = validateCostStructures(raw);
  if (problems.length) return { problems, input: null };
  return { problems, input: costStructureInput(raw, { a: cleanName(f.names.a, 'Structure A'), b: cleanName(f.names.b, 'Structure B') }) };
}

/* ------------------------------------------------------------------ */
/* The performance dashboard                                           */
/* ------------------------------------------------------------------ */

export interface PerformanceForm {
  openingStock: string;
  labels: string[];
  /** By "y<index>.<field>". */
  fields: Record<string, string>;
  currency: string;
}

export const ACCOUNT_KEYS = ACCOUNT_FIELDS.flatMap((g) => g.fields.map((f) => f.key));

export const PERFORMANCE_EXAMPLE_FORM: PerformanceForm = {
  openingStock: String(HISTORY_OPENING_STOCK),
  labels: HISTORY.map((y) => y.label),
  fields: Object.fromEntries(HISTORY.flatMap((y, i) => ACCOUNT_KEYS.map((k) => [`y${i}.${k}`, String(y.statement[k as keyof typeof y.statement])]))),
  currency: CURRENCY,
};

export function readPerformanceSaved(v: unknown): PerformanceForm | null {
  if (!isObj(v) || !Array.isArray(v.labels)) return null;
  const labels = v.labels.slice(0, PERF_MAX_YEARS).map((l, i) => str(l, 12) ?? `Year ${i + 1}`);
  if (labels.length < PERF_MIN_YEARS) return null;
  const names = labels.flatMap((_, i) => ACCOUNT_KEYS.map((k) => `y${i}.${k}`));
  return { openingStock: str(v.openingStock, VALUE_MAX) ?? PERFORMANCE_EXAMPLE_FORM.openingStock, labels, fields: pickFields(v.fields, names, {}), currency: currencyOf(v.currency) };
}

export function performanceFromForm(f: PerformanceForm): { problems: Problem[]; input: PerformanceInput | null } {
  const raw: Raw = { openingStock: toNumber(f.openingStock) };
  f.labels.forEach((_, i) => ACCOUNT_KEYS.forEach((k) => (raw[`y${i}.${k}`] = toNumber(f.fields[`y${i}.${k}`] ?? ''))));
  const problems = validatePerformance(raw, f.labels.length);
  if (problems.length) return { problems, input: null };
  return { problems, input: performanceInput(raw, f.labels.map((l, i) => cleanName(l, `Year ${i + 1}`, 12))) };
}

/* ------------------------------------------------------------------ */
/* What a tool keeps in this browser                                   */
/* ------------------------------------------------------------------ */

export interface Kept<T> {
  v: 1;
  /** For the dashboard: the tool's name, its address and what the work shows. */
  title: string;
  href: string;
  headline: string;
  savedAt: string;
  form: T;
}

/** Reads a kept item with a tool's own reader; null for anything that is not one. */
export function readKept<T>(raw: unknown, read: (v: unknown) => T | null): T | null {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isObj(v) || v.v !== 1) return null;
  return read(v.form);
}
