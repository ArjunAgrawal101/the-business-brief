/** Formatting for exhibit table cells, according to the column's declared format. */
import { fmtNumber } from './format';

export type CellFormat = 'plain' | 'money' | 'd1' | 'd2';

export function formatCell(value: string | number, format: CellFormat = 'plain'): string {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '';
  switch (format) {
    case 'money':
      return Number.isInteger(value) ? fmtNumber(value, 0) : fmtNumber(value, 2);
    case 'd1':
      return fmtNumber(value, 1);
    case 'd2':
      return fmtNumber(value, 2);
    default: {
      const decimals = (String(value).split('.')[1] ?? '').length;
      return fmtNumber(value, Math.min(decimals, 4));
    }
  }
}
