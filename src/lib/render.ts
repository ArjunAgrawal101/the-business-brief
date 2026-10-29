/**
 * HTML for structures that are rendered both on the server and in the browser,
 * so that a live calculator and a static worked example look identical.
 */
import type { BreakEvenModel } from './breakeven';
import type { Working } from './finance';
import { fmtMoney, fmtNumber } from './format';
import { esc } from './markup';
import type { SpecialOrderModel } from './special-order';

/** The eight-part working. `interpretation` and `implication` are HTML (already escaped or formatted). */
export function workingHtml(w: Working, interpretation: string, implication: string): string {
  const steps = w.steps.map((s) => `<div>${esc(s)}</div>`).join('');
  const given = w.given.map((g) => `<li>${esc(g.label)}: <span class="num">${esc(g.value)}</span></li>`).join('');
  return `<dl class="working">
<dt>Given</dt><dd><ul>${given}</ul></dd>
<dt>Formula</dt><dd class="w-math">${esc(w.formula)}</dd>
<dt>Substitution</dt><dd class="w-math">${esc(w.substitution)}</dd>
<dt>Working</dt><dd class="w-math">${steps}</dd>
<dt>Answer</dt><dd><span class="w-answer">${esc(w.answer)}</span>${w.note ? `<p class="small muted" style="margin-top:0.35rem">${esc(w.note)}</p>` : ''}${w.error ? `<p class="field__error" style="margin-top:0.35rem">${esc(w.error)}</p>` : ''}</dd>
<dt>Unit</dt><dd>${esc(w.unit)}</dd>
<dt>Interpretation</dt><dd>${interpretation}</dd>
<dt>Business implication</dt><dd>${implication}</dd>
</dl>`;
}


/** The key figures panel of the break-even workspace. */
export function breakEvenFiguresHtml(m: BreakEvenModel, currency: string, units: string, unit = 'unit'): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 2));
  const rows: Array<[string, string, string?]> = [
    [`Variable cost per ${unit}`, money(m.unitVariableCost), m.inputs.priceShare > 0 ? `includes ${fmtNumber(m.inputs.priceShare, m.inputs.priceShare % 1 ? 1 : 0)}% of the price` : undefined],
    [`Contribution per ${unit}`, money(m.contribution)],
    [
      'Break-even quantity',
      m.beq === null ? 'None' : `${esc(fmtNumber(m.beq))} ${esc(units)}`,
      m.beqExact === null ? 'contribution is not positive' : Math.abs(m.beqExact - Math.round(m.beqExact)) < 1e-9 ? 'exact' : `exactly ${fmtNumber(m.beqExact, 2)}, rounded up`,
    ],
    ['Break-even revenue', m.beRevenue === null ? 'None' : money(m.beRevenue)],
    [
      'Margin of safety',
      m.mos === null ? 'None' : `${esc(fmtNumber(m.mos))} ${esc(units)}`,
      m.mosShare === null ? undefined : `${fmtNumber(m.mosShare, 1)}% of forecast sales`,
    ],
    [m.profitAtForecast >= 0 ? 'Profit at forecast sales' : 'Loss at forecast sales', money(Math.abs(m.profitAtForecast))],
    [
      'Output for the target profit',
      m.targetOutput === null ? 'Not possible' : `${esc(fmtNumber(m.targetOutput))} ${esc(units)}`,
      m.targetWithinCapacity === false ? 'above capacity' : m.targetWithinCapacity ? 'within capacity' : undefined,
    ],
  ];
  return rows
    .map(
      ([k, v, note]) =>
        `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`,
    )
    .join('');
}

/** Rows for the chart's data table. */
export function breakEvenTableHtml(m: BreakEvenModel, currency: string, units: string): string {
  const i = m.inputs;
  const pts = [0, m.beq, i.quantity, i.capacity].filter((v): v is number => v !== null && v >= 0);
  const uniq = [...new Set(pts)].sort((a, b) => a - b);
  const label = (q: number) => (q === 0 ? 'Zero output' : q === m.beq ? 'Break-even' : q === i.quantity ? 'Forecast' : 'Capacity');
  return uniq
    .map((q) => {
      const tr = i.price * q;
      const tc = i.fixedCosts + m.unitVariableCost * q;
      return `<tr><th scope="row">${esc(label(q))}</th><td class="n">${esc(fmtNumber(q))} ${esc(units)}</td><td class="n">${esc(fmtMoney(tr, currency, 2))}</td><td class="n">${esc(fmtMoney(tc, currency, 2))}</td><td class="n">${esc(fmtMoney(tr - tc, currency, 2))}</td></tr>`;
    })
    .join('');
}

/** Rows of the scale explorer's breakdown table. */
export function scaleTableHtml(rows: Array<{ key: string; label: string; now: number; ref: number }>, currency: string): string {
  return rows
    .map((r) => {
      const total = r.key === 'total';
      const cell = (v: number) => `${esc(currency)}${esc(fmtNumber(v, 1))}`;
      return `<tr${total ? ' class="is-total"' : ''}><th scope="row">${esc(r.label)}</th><td class="n">${total ? `<strong>${cell(r.now)}</strong>` : cell(r.now)}</td><td class="n">${cell(r.ref)}</td></tr>`;
    })
    .join('');
}

/** Key figures of the special-order panel. */
export function specialOrderFiguresHtml(m: SpecialOrderModel, currency: string, l: { unit: string; units: string }): string {
  const money = (v: number) => esc(fmtMoney(v, currency, 2));
  const i = m.inputs;
  const rows: Array<[string, string, string?]> = [
    [`Contribution per ${l.unit} on the order`, money(m.contributionPerUnit), m.belowVariableCost ? 'below variable cost' : undefined],
    ['Contribution from the order', money(m.orderContribution)],
    ['Spare capacity before the order', `${esc(fmtNumber(m.spare))} ${esc(l.units)}`],
    ['Regular sales displaced', `${esc(fmtNumber(m.displaced))} ${esc(l.units)}`, m.displaced > 0 ? `${fmtMoney(m.lostContribution, currency, 2)} of contribution lost` : 'none'],
    [m.change >= 0 ? 'Change in profit' : 'Fall in profit', `${m.change >= 0 ? '+' : '−'}${money(Math.abs(m.change))}`],
    ['Lowest price that does not reduce profit', m.minimumPrice === null ? 'n/a' : money(m.minimumPrice), `average cost is ${fmtMoney(i.fullCostPerUnit, currency, 2)}`],
  ];
  return rows
    .map(([k, v, note]) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`)
    .join('');
}

/** A bar showing regular sales, the order and capacity. */
export function capacityBarHtml(m: SpecialOrderModel, l: { units: string }): string {
  const i = m.inputs;
  const regularKept = Math.max(0, Math.min(i.regularSales, i.capacity) - m.displaced);
  const scale = Math.max(i.capacity, regularKept + i.quantity + m.displaced);
  const pct = (v: number) => `${((v / scale) * 100).toFixed(2)}%`;
  const regular = regularKept;
  const fits = i.quantity;
  return `<div class="capbar__track">
<span class="capbar__seg capbar__seg--regular" style="width:${pct(Math.max(0, regular))}"></span><span class="capbar__seg capbar__seg--order" style="width:${pct(fits)}"></span><span class="capbar__seg capbar__seg--displaced" style="width:${pct(m.displaced)}"></span>
<span class="capbar__cap" style="left:${pct(i.capacity)}"><span>Capacity ${esc(fmtNumber(i.capacity))}</span></span>
</div>
<ul class="capbar__key">
<li><span class="capbar__sw capbar__sw--regular"></span>Regular sales kept: ${esc(fmtNumber(Math.max(0, regular)))} ${esc(l.units)}</li>
${m.displaced > 0 ? `<li><span class="capbar__sw capbar__sw--displaced"></span>Regular sales displaced: ${esc(fmtNumber(m.displaced))} ${esc(l.units)}</li>` : ''}
<li><span class="capbar__sw capbar__sw--order"></span>The order: ${esc(fmtNumber(i.quantity))} ${esc(l.units)}</li>
</ul>`;
}
