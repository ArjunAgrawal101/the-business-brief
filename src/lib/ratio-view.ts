/**
 * HTML for the ratio desk, rendered on the server for the default state and
 * in the browser after every change, so the two always match.
 */
import { fmtNumber } from './format';
import { esc } from './markup';
import {
  RATIOS,
  RATIO_IDS,
  VERDICT_TEXT,
  derive,
  describeChange,
  fmtChange,
  fmtRatio,
  ratioValue,
  verdict,
  type Derived,
  type RatioId,
  type Statement,
} from './ratios';

type Key = keyof Statement | keyof Derived;

interface Row {
  key: Key;
  label: string;
  total?: boolean;
  strong?: boolean;
  /** A deduction, shown in brackets. */
  deduct?: boolean;
}

/** Line items in the order the guide's statement of profit or loss uses (p. 59). */
export const PROFIT_OR_LOSS: Row[] = [
  { key: 'salesRevenue', label: 'Sales revenue' },
  { key: 'costOfSales', label: 'Cost of sales' },
  { key: 'grossProfit', label: 'Gross profit', total: true },
  { key: 'expenses', label: 'Expenses' },
  { key: 'pbit', label: 'Profit before interest and tax', total: true },
  { key: 'interest', label: 'Interest' },
  { key: 'profitBeforeTax', label: 'Profit before tax', total: true },
  { key: 'tax', label: 'Tax' },
  { key: 'profitForPeriod', label: 'Profit for the period', total: true, strong: true },
  { key: 'dividends', label: 'Dividends' },
  { key: 'retainedProfit', label: 'Retained profit', total: true },
];

/** Line items in the order the guide's statement of financial position uses (p. 61). */
export const FINANCIAL_POSITION: Row[] = [
  { key: 'propertyPlantEquipment', label: 'Property, plant and equipment' },
  { key: 'accumulatedDepreciation', label: 'Accumulated depreciation', deduct: true },
  { key: 'nonCurrentAssets', label: 'Non-current assets', total: true },
  { key: 'cash', label: 'Cash' },
  { key: 'debtors', label: 'Debtors' },
  { key: 'stock', label: 'Stock' },
  { key: 'currentAssets', label: 'Current assets', total: true },
  { key: 'totalAssets', label: 'Total assets', total: true, strong: true },
  { key: 'bankOverdraft', label: 'Bank overdraft' },
  { key: 'tradeCreditors', label: 'Trade creditors' },
  { key: 'otherShortTermLoans', label: 'Other short-term loans' },
  { key: 'currentLiabilities', label: 'Current liabilities', total: true },
  { key: 'longTermBorrowings', label: 'Long-term borrowings' },
  { key: 'nonCurrentLiabilities', label: 'Non-current liabilities', total: true },
  { key: 'totalLiabilities', label: 'Total liabilities', total: true },
  { key: 'netAssets', label: 'Net assets', total: true, strong: true },
  { key: 'shareCapital', label: 'Share capital' },
  { key: 'retainedEarnings', label: 'Retained earnings' },
  { key: 'totalEquity', label: 'Total equity', total: true, strong: true },
];

/** An accounts figure: grouped thousands, negatives and deductions in brackets. */
export function fmtAccounts(v: number, deduct = false): string {
  const n = fmtNumber(Math.abs(v), Number.isInteger(v) ? 0 : 1);
  return deduct || v < 0 ? (Math.abs(v) < 1e-9 ? '0' : `(${n})`) : n;
}

function figure(s: Statement, key: Key): number {
  const d = derive(s);
  return key in s ? s[key as keyof Statement] : d[key as keyof Derived];
}

export interface StatementColumns {
  /** Column headings, for example ["2025", "2026"]. */
  heads: string[];
  statements: Statement[];
  /** Marks a column as a what-if, so that changed figures are flagged. */
  whatIf?: { head: string; statement: Statement; base: Statement };
}

function statementTable(title: string, caption: string, rows: Row[], cols: StatementColumns, unit: string): string {
  const heads = [...cols.heads, ...(cols.whatIf ? [cols.whatIf.head] : [])];
  const head = `<tr><th scope="col">${esc(unit)}</th>${heads.map((h, i) => `<th scope="col" class="n${cols.whatIf && i === heads.length - 1 ? ' rd-whatif' : ''}">${esc(h)}</th>`).join('')}</tr>`;
  const body = rows
    .map((r) => {
      const cells = cols.statements.map((s) => `<td class="n">${fmtAccounts(figure(s, r.key), r.deduct)}</td>`);
      if (cols.whatIf) {
        const v = figure(cols.whatIf.statement, r.key);
        const changed = Math.abs(v - figure(cols.whatIf.base, r.key)) > 1e-9;
        cells.push(`<td class="n rd-whatif${changed ? ' is-changed' : ''}">${fmtAccounts(v, r.deduct)}${changed ? '<span class="sr-only"> (changed)</span>' : ''}</td>`);
      }
      const cls = [r.total ? 'is-sub' : '', r.strong ? 'is-strong' : ''].filter(Boolean).join(' ');
      return `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${esc(r.label)}</th>${cells.join('')}</tr>`;
    })
    .join('');
  return `<div class="table-scroll rd-statement" role="region" aria-label="${esc(title)}" tabindex="0"><table class="table rd-table"><caption><span class="rd-table__title">${esc(title)}</span> <span class="rd-table__cap">${esc(caption)}</span></caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

/** Both statements, side by side on wide screens. */
export function statementsHtml(entity: string, unit: string, yearEnd: string, cols: StatementColumns): string {
  return `<div class="rd-statements">${statementTable(
    'Statement of profit or loss',
    `${entity}, for the years ended ${yearEnd}`,
    PROFIT_OR_LOSS,
    cols,
    unit,
  )}${statementTable('Statement of financial position', `${entity}, at ${yearEnd}`, FINANCIAL_POSITION, cols, unit)}</div>`;
}

export interface DeskYears {
  labels: [string, string];
  statements: [Statement, Statement];
  /** Stock at the start of each year. */
  openingStock: [number, number];
  whatIf?: { label: string; statement: Statement };
}

/** Every ratio for both years, with the change and whether it is better or worse. */
export function summaryRowsHtml(y: DeskYears): string {
  return RATIO_IDS.map((id) => {
    const def = RATIOS[id];
    const a = ratioValue(id, y.statements[0], y.openingStock[0]);
    const b = ratioValue(id, y.statements[1], y.openingStock[1]);
    const w = y.whatIf ? ratioValue(id, y.whatIf.statement, y.openingStock[1]) : null;
    const v = verdict(def, a, b);
    return `<tr${def.level === 'HL' ? ' data-level="HL"' : ''}><th scope="row">${esc(def.name)}${def.level === 'HL' ? ' <span class="tag tag--hl">HL</span>' : ''}</th><td class="n">${esc(fmtRatio(a, def.kind))}</td><td class="n">${esc(fmtRatio(b, def.kind))}</td><td class="n">${esc(fmtChange(a, b, def.kind))}</td><td><span class="rd-verdict rd-verdict--${v}">${esc(VERDICT_TEXT[v])}</span></td>${y.whatIf ? `<td class="n rd-whatif"><strong>${esc(fmtRatio(w, def.kind))}</strong></td>` : ''}</tr>`;
  }).join('');
}

/** The figures panel for one ratio. */
export function ratioFiguresHtml(id: RatioId, y: DeskYears): string {
  const def = RATIOS[id];
  const a = ratioValue(id, y.statements[0], y.openingStock[0]);
  const b = ratioValue(id, y.statements[1], y.openingStock[1]);
  const v = verdict(def, a, b);
  const rows: Array<[string, string, string?]> = [
    [y.labels[0], fmtRatio(a, def.kind)],
    [y.labels[1], fmtRatio(b, def.kind), `${fmtChange(a, b, def.kind)}. ${VERDICT_TEXT[v]}`],
  ];
  if (y.whatIf) {
    const w = ratioValue(id, y.whatIf.statement, y.openingStock[1]);
    rows.push([`${y.labels[1]} with the strategy`, fmtRatio(w, def.kind), fmtChange(b, w, def.kind)]);
  }
  return rows.map(([k, val, note]) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${esc(val)}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`).join('');
}

/** The computed sentence about the change, plus the strategy's effect when one is applied. */
export function ratioChangeText(id: RatioId, y: DeskYears): string {
  const def = RATIOS[id];
  const a = ratioValue(id, y.statements[0], y.openingStock[0]);
  const b = ratioValue(id, y.statements[1], y.openingStock[1]);
  let text = describeChange(def, a, b, y.labels[0], y.labels[1]);
  if (y.whatIf) {
    const w = ratioValue(id, y.whatIf.statement, y.openingStock[1]);
    const ch = fmtChange(b, w, def.kind);
    text += ch === 'No change' ? ` With the strategy it would not change.` : ` With the strategy it would be ${fmtRatio(w, def.kind)} (${ch}).`;
  }
  return text;
}
