/**
 * Small helpers shared by the lab's calculators: money, counts and percentages
 * written the platform's way, the CSV export and the steps of a sensitivity
 * table. Nothing here does a calculation of its own.
 */
import { fmtMoney, fmtNumber, fmtPercent, round, units as plural } from '../format';
import type { Settings } from './types';

/** Money with two decimals, or none when the figure is whole: $29,000 or $14.40. */
export const money = (v: number, cur: string): string => fmtMoney(v, cur, Number.isInteger(round(v, 2)) ? 0 : 2);

/** Money always with two decimals, as a price or a result: $24.00. */
export const money2 = (v: number, cur: string): string => fmtMoney(v, cur, 2);

/** A whole number of units with the reader's unit name: 3,021 bags, 1 bag. */
export const count = (v: number, s: Settings): string => `${fmtNumber(v)} ${plural(v, s.unit, s.units)}`;

export const pct = (v: number, decimals = 1): string => fmtPercent(v, decimals);

/** A signed percentage change: +12.5% or −33.3%. */
export function signedPct(from: number, to: number, decimals = 1): string {
  if (from === 0) return 'n/a';
  const d = ((to - from) / Math.abs(from)) * 100;
  if (Math.abs(d) < 0.05) return 'no change';
  return `${d > 0 ? '+' : '−'}${fmtNumber(Math.abs(d), decimals)}%`;
}

/** The fractional change between two values, or null when the first is zero. */
export const changeShare = (from: number, to: number): number | null => (from === 0 ? null : (to - from) / Math.abs(from));

/** Sensitivity steps: the change to apply, a label and whether it is the figure as entered. */
export const STEPS_10 = [
  { k: -0.1, label: '−10%' },
  { k: 0, label: 'as entered' },
  { k: 0.1, label: '+10%' },
] as const;

/** Applies a percentage change, keeping money to the cent. */
export const nudge = (v: number, k: number): number => round(v * (1 + k), 6);

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/**
 * One CSV cell. Text is quoted when it holds a comma, a quote or a line break,
 * and text that a spreadsheet would read as a formula is prefixed with an
 * apostrophe, so a typed label can never run as one.
 */
export function csvCell(v: string | number): string {
  if (typeof v === 'number') return Number.isFinite(v) ? String(round(v, 6)) : '';
  let t = v;
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return `${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

/** The figures as a short line for the live region and the CSV header. */
export const settingsLine = (s: Settings): string => `Money in ${s.currency.trim()}; output in ${s.units} per ${s.period}.`;
