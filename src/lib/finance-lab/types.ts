/**
 * The Financial Laboratory: shared types. A calculator turns a reader's
 * figures into a report: the headline result, the key figures, the eight-part
 * workings, a chart with its data table, a sensitivity table, the
 * interpretation and the rows of a CSV export. The same pure functions build
 * the report on the server (the default state, shown without JavaScript) and
 * in the browser (after every change), so the two always agree.
 */
import type { Working } from '../finance';

/** Where a figure sits against the IB course. */
export type Scope = 'syllabus' | 'hl' | 'enrichment';

/** The words a calculator uses for money, units and the period. */
export interface Settings {
  currency: string;
  unit: string;
  units: string;
  period: string;
}

export interface Problem {
  field: string;
  message: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  hint?: string;
  /** money: a currency prefix; count: whole units with a units suffix; number: plain; percent: a % suffix. */
  kind: 'money' | 'count' | 'number' | 'percent';
  min?: number;
  /** The value must be above min, not equal to it. */
  minExclusive?: boolean;
  max?: number;
  integer?: boolean;
  /** Short name for messages, for example "the selling price". */
  name: string;
}

export interface Figure {
  label: string;
  value: string;
  note?: string;
  scope?: Scope;
}

export interface WorkingBlock {
  title: string;
  working: Working;
  /** Plain text with the light marks of src/lib/markup.ts. */
  interpretation: string;
  implication: string;
  scope?: Scope;
  /** Shown folded, for a second year's working that repeats the first. */
  collapsed?: boolean;
}

export interface TableSpec {
  caption: string;
  head: string[];
  rows: Array<{ th: string; cells: string[]; base?: boolean; strong?: boolean; baseCell?: number }>;
  /** Which columns hold numbers (aligned right, tabular figures). Defaults to all but the first. */
  numeric?: boolean[];
}

export interface ChartBlock {
  svg: string;
  caption: string;
  table: TableSpec;
}

export interface SensitivityBlock {
  title: string;
  intro: string;
  table: TableSpec;
  reading: string;
  /** An optional second view, such as a small chart. */
  svg?: string;
}

export interface Interpretation {
  /** What the number means, for these figures. */
  meaning: string;
  /** What to compare it with. */
  compare: string;
  /** Why benchmarks vary by industry and over time. */
  benchmarks: string;
  /** What a manager might do: the platform's suggestions, not IB requirements. */
  actions: string[];
}

export interface LabReport {
  headline: { label: string; value: string; note?: string };
  figures: Figure[];
  workings: WorkingBlock[];
  chart?: ChartBlock;
  sensitivity?: SensitivityBlock;
  interpretation: Interpretation;
  /** The reader's figures, for print and for readers without JavaScript. */
  given: Array<{ label: string; value: string }>;
  /** One calm sentence for the live region. */
  announce: string;
  /** Rows for the CSV export: section, item, value, unit. */
  csv: Array<Array<string | number>>;
  /** Calculator-specific HTML placed above the figures, such as a statement or a forecast table. */
  extra?: string;
}

/** Numbers read from a form: null where the reader left a field blank or typed something that is not a number. */
export type Raw = Record<string, number | null>;
