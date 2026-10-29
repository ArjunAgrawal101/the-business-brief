/**
 * Markup for the cash flow lab, shared by the server render and the browser
 * script: the forecast table in the guide's layout, the key figures, the
 * profit and its reconciliation to cash, and the eight-part working for one
 * month's closing balance.
 */
import { bracket, STATUS_WORDS, type Forecast, type Line } from './cashflow';
import type { Working } from './finance';
import { fmtMoney } from './format';
import { esc } from './markup';

const cells = (values: number[], prev?: number[]) =>
  values.map((v, i) => `<td class="n"${prev && prev[i] !== v ? ' data-changed' : ''}>${esc(bracket(v))}</td>`).join('');

const lineRows = (lines: Line[], prev?: Forecast, group?: 'in' | 'out') =>
  lines
    .map((l) => {
      const before = prev ? (group === 'in' ? prev.inflows : prev.outflows).find((p) => p.id === l.id) : undefined;
      return `<tr data-line="${esc(l.id)}"${prev && !before ? ' data-new' : ''}><th scope="row">${esc(l.label)}</th>${cells(l.values, before?.values ?? (prev ? l.values.map(() => Number.NaN) : undefined))}</tr>`;
    })
    .join('');

/** The body of the forecast table. `prev` marks the cells that changed since the last render. */
export function forecastBodyHtml(f: Forecast, prev?: Forecast): string {
  const span = f.months.length + 1;
  const gap = `<tr class="cff__gap" aria-hidden="true"><td colspan="${span}"></td></tr>`;
  const status = f.status.map((s) => `<td class="cff__st cff__st--${s}">${esc(STATUS_WORDS[s])}</td>`).join('');
  const closing = f.closing
    .map((v, i) => `<td class="n cff__close cff__close--${f.status[i]}"${prev && prev.closing[i] !== v ? ' data-changed' : ''}>${esc(bracket(v))}</td>`)
    .join('');
  return [
    `<tr class="cff__key"><th scope="row">Opening balance</th>${cells(f.opening, prev?.opening)}</tr>`,
    `<tr class="cff__head"><th scope="row" colspan="${span}">Cash inflows</th></tr>`,
    lineRows(f.inflows, prev, 'in'),
    `<tr class="cff__total"><th scope="row">Total cash inflows</th>${cells(f.totalIn, prev?.totalIn)}</tr>`,
    gap,
    `<tr class="cff__head"><th scope="row" colspan="${span}">Cash outflows</th></tr>`,
    lineRows(f.outflows, prev, 'out'),
    `<tr class="cff__total"><th scope="row">Total cash outflows</th>${cells(f.totalOut, prev?.totalOut)}</tr>`,
    gap,
    `<tr class="cff__key"><th scope="row">Net cash flow</th>${cells(f.net, prev?.net)}</tr>`,
    `<tr class="cff__key cff__closing"><th scope="row">Closing balance</th>${closing}</tr>`,
    `<tr class="cff__status"><th scope="row">Against the overdraft limit of ${esc(bracket(f.limit, 0))}</th>${status}</tr>`,
  ].join('');
}

/** The key figures beside the chart. */
export function cashFiguresHtml(f: Forecast, currency: string): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 2));
  const beyond = f.months.filter((_, i) => f.status[i] === 'beyond');
  const rows: Array<[string, string, string?]> = [
    ['Lowest closing balance', money(f.lowest.value), f.months[f.lowest.month]],
    ['Months beyond the limit', String(beyond.length), beyond.length ? beyond.map((m) => m.slice(0, 3)).join(', ') : 'none'],
    ['Profit, November to April', money(f.profit.total), 'accruals basis'],
    ['Net cash flow, November to April', money(f.netCash), 'cash basis'],
  ];
  return rows.map(([k, v, note]) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`).join('');
}

/** Profit for the period, then the steps from profit to net cash flow. */
export function profitToCashHtml(f: Forecast, currency: string): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 2));
  const exp = f.profit.expenses.map((x) => `<tr><th scope="row">${esc(x.label)}</th><td class="n">${esc(bracket(-x.value))}</td></tr>`).join('');
  const rec = f.reconciliation.length
    ? f.reconciliation.map((x) => `<tr><th scope="row">${esc(x.label)}</th><td class="n">${esc(bracket(x.value))}</td></tr>`).join('')
    : '<tr><th scope="row">Nothing: every cost is paid and every sale received in the period, and nothing is bought or borrowed</th><td class="n">0.00</td></tr>';
  return `<div class="p2c">
<div class="p2c__col">
<h4 class="label label--ink">Profit for the period</h4>
<table class="table p2c__table"><caption class="sr-only">Profit for the period, accruals basis, in ${esc(currency)}</caption><tbody>
<tr><th scope="row">Revenue earned</th><td class="n">${esc(bracket(f.profit.revenue))}</td></tr>
${exp}
<tr class="p2c__total"><th scope="row">Profit</th><td class="n">${esc(bracket(f.profit.total))}</td></tr>
</tbody></table>
</div>
<div class="p2c__col">
<h4 class="label label--ink">From profit to cash</h4>
<table class="table p2c__table"><caption class="sr-only">Reconciliation of profit to net cash flow, in ${esc(currency)}</caption><tbody>
<tr><th scope="row">Profit</th><td class="n">${esc(bracket(f.profit.total))}</td></tr>
${rec}
<tr class="p2c__total"><th scope="row">Net cash flow</th><td class="n">${esc(bracket(f.netCash))}</td></tr>
</tbody></table>
<p class="small muted">Profit ${money(f.profit.total)}, net cash flow ${money(f.netCash)}.</p>
</div>
</div>`;
}

/** The eight-part working for one month's closing balance. */
export function closingWorking(f: Forecast, month: number, currency: string): { working: Working; interpretation: string; implication: string } {
  const m = f.months[month] ?? '';
  const o = f.opening[month] ?? 0;
  const i = f.totalIn[month] ?? 0;
  const out = f.totalOut[month] ?? 0;
  const net = f.net[month] ?? 0;
  const close = f.closing[month] ?? 0;
  const money = (v: number) => fmtMoney(v, currency, 2);
  const st = f.status[month] ?? 'credit';
  return {
    working: {
      given: [
        { label: `Opening balance, ${m}`, value: money(o) },
        { label: 'Total cash inflows', value: money(i) },
        { label: 'Total cash outflows', value: money(out) },
      ],
      formula: 'Net cash flow = total cash inflows − total cash outflows; closing balance = opening balance + net cash flow',
      substitution: `Net cash flow = ${money(i)} − ${money(out)}; closing balance = ${money(o)} + (${money(net)})`,
      steps: [`${money(i)} − ${money(out)} = ${money(net)}`, `${money(o)} + (${money(net)}) = ${money(close)}`],
      answer: `${currency}${bracket(close)}`,
      value: close,
      unit: `${currency} in the bank at the end of ${m}`,
      note: 'Negative figures are shown in brackets, as in the guide’s cash flow forecast.',
    },
    interpretation:
      st === 'credit'
        ? `At the end of ${m} the studio has ${money(close)} in the bank.`
        : st === 'overdraft'
          ? `At the end of ${m} the account is overdrawn by ${money(-close)}, within the ${money(f.limit)} limit.`
          : `At the end of ${m} the account is overdrawn by ${money(-close)}, which is ${money(-close - f.limit)} beyond the ${money(f.limit)} limit.`,
    implication:
      st === 'beyond'
        ? 'The bank need not honour payments beyond the limit: wages, rent or the supplier could go unpaid even though the business is profitable.'
        : st === 'overdraft'
          ? 'The studio pays overdraft interest and has little room if sales fall short of the forecast.'
          : 'The balance carries into the next month as its opening balance.',
  };
}
