/**
 * Number formatting for the platform. One locale (en-GB grouping) everywhere,
 * so 1,250,000 reads the same in every exhibit, calculator and question. The
 * minus sign is U+2212, the typographic minus.
 */

const MINUS = '−';

export function fmtNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return 'n/a';
  const abs = Math.abs(value);
  const s = abs.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  // Avoid "-0" after rounding
  const rounded = Number(abs.toFixed(decimals));
  return value < 0 && rounded !== 0 ? `${MINUS}${s}` : s;
}

/** Money with a currency symbol placed before the number: €9,400 or −€1.80. */
export function fmtMoney(value: number, symbol: string, decimals = 2): string {
  if (!Number.isFinite(value)) return 'n/a';
  const abs = Math.abs(value);
  const s = abs.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const rounded = Number(abs.toFixed(decimals));
  const sign = value < 0 && rounded !== 0 ? MINUS : '';
  return `${sign}${symbol}${s}`;
}

/** Money shown with no decimals when it is a whole number, two otherwise. */
export function fmtMoneyAuto(value: number, symbol: string): string {
  return fmtMoney(value, symbol, Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2);
}

export function fmtPercent(value: number, decimals = 1): string {
  return `${fmtNumber(value, decimals)}%`;
}

/** Pluralise a unit label: 1 mug, 2 mugs. */
export function units(count: number, singular: string, plural: string): string {
  return Math.abs(count) === 1 ? singular : plural;
}

/** Round to a number of decimal places without floating-point surprises such as 1.005. */
export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Round up to a number of decimal places (used for prices that must reach a target). */
export function roundUp(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.ceil(round(value * f, 6)) / f;
}
