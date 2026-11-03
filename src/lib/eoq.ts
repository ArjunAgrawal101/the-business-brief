/**
 * The economic order quantity (EOQ): enrichment beyond the IB syllabus. The
 * guide's subtopic 5.6 names the reorder quantity on a stock control chart but
 * no way of choosing it; the EOQ, from operations management, is the order
 * size that minimizes the yearly cost of ordering plus holding stock when
 * demand is steady and known.
 *
 *   EOQ = √(2 × annual demand × cost per order ÷ holding cost per unit per year)
 *
 * Pure functions, shared by the page, its script and the tests.
 */
import type { Working } from './finance';
import { fmtMoney, fmtNumber } from './format';

export interface EoqInputs {
  /** Units needed a year. */
  demand: number;
  /** Cost of placing and receiving one order, whatever its size. */
  orderCost: number;
  /** Cost of holding one unit for a year. */
  holdingCost: number;
  /** The order quantity used now, or proposed, to compare. */
  current: number;
  /** Working weeks a year, to turn orders into weeks between them. */
  weeks: number;
  /** Buffer stock held all year, which adds holding cost but does not change the EOQ. */
  buffer: number;
  /** Price paid per unit, for the quantity discount check. */
  price: number;
  /** A supplier's offer: a lower price for orders of at least this size. */
  discount: { minQty: number; price: number } | null;
}

export interface QuantityCost {
  quantity: number;
  ordersPerYear: number;
  weeksBetween: number;
  ordering: number;
  /** Holding the stock each order brings: average q ÷ 2. */
  cycleHolding: number;
  /** Holding the buffer, the same at every order size. */
  bufferHolding: number;
  holding: number;
  /** Ordering + holding. */
  total: number;
}

export function eoq(demand: number, orderCost: number, holdingCost: number): number {
  if (!(demand > 0) || !(orderCost > 0) || !(holdingCost > 0)) return Number.NaN;
  return Math.sqrt((2 * demand * orderCost) / holdingCost);
}

/** The yearly cost of ordering in batches of q, with average stock of q ÷ 2 plus the buffer. */
export function costAt(q: number, i: Pick<EoqInputs, 'demand' | 'orderCost' | 'holdingCost' | 'weeks' | 'buffer'>): QuantityCost {
  const ordersPerYear = i.demand / q;
  const ordering = ordersPerYear * i.orderCost;
  const cycleHolding = (q / 2) * i.holdingCost;
  const bufferHolding = i.buffer * i.holdingCost;
  const holding = cycleHolding + bufferHolding;
  return { quantity: q, ordersPerYear, weeksBetween: i.weeks / ordersPerYear, ordering, cycleHolding, bufferHolding, holding, total: ordering + holding };
}

/**
 * The range of order sizes whose ordering and holding cost is within `share`
 * (0.05 for 5%) of the lowest. With x = q ÷ EOQ, the cost ratio is
 * (x + 1 ÷ x) ÷ 2, so the band is the roots of x² − 2(1 + share)x + 1 = 0.
 * It ignores the buffer, which costs the same at every order size.
 */
export function flatBand(e: number, share: number): [number, number] {
  const k = 1 + share;
  const root = Math.sqrt(k * k - 1);
  return [e * (k - root), e * (k + root)];
}

export interface DiscountCheck {
  /** Yearly cost of ordering, holding and buying at the EOQ and the usual price. */
  atEoq: number;
  /** The same at the smallest quantity that earns the discount, at the lower price. */
  atDiscount: number;
  /** Positive when taking the discount is cheaper. */
  saving: number;
  quantity: number;
}

export function discountCheck(i: EoqInputs, e: number): DiscountCheck | null {
  if (!i.discount) return null;
  const q = Math.max(i.discount.minQty, e);
  const base = costAt(e, i).total + i.demand * i.price;
  const offer = costAt(q, i).total + i.demand * i.discount.price;
  return { atEoq: base, atDiscount: offer, saving: base - offer, quantity: q };
}

export interface EoqModel {
  inputs: EoqInputs;
  eoq: number;
  atEoq: QuantityCost;
  atCurrent: QuantityCost;
  /** How much more the current quantity costs a year than the EOQ. */
  extra: number;
  extraShare: number;
  band: [number, number];
  discount: DiscountCheck | null;
}

export function eoqModel(i: EoqInputs): EoqModel {
  const e = eoq(i.demand, i.orderCost, i.holdingCost);
  const atEoq = costAt(e, i);
  const atCurrent = costAt(i.current, i);
  return { inputs: i, eoq: e, atEoq, atCurrent, extra: atCurrent.total - atEoq.total, extraShare: atEoq.total > 0 ? (atCurrent.total - atEoq.total) / atEoq.total : 0, band: flatBand(e, 0.05), discount: discountCheck(i, e) };
}

export type EoqField = 'demand' | 'orderCost' | 'holdingCost' | 'current' | 'weeks' | 'buffer' | 'price' | 'minQty' | 'discountPrice';

export function validateEoq(raw: Record<EoqField, number | null>, discountOn: boolean): Array<{ field: EoqField; message: string }> {
  const out: Array<{ field: EoqField; message: string }> = [];
  const need = (f: EoqField, positive: boolean, max = 1e9) => {
    const v = raw[f];
    if (v === null || !Number.isFinite(v)) out.push({ field: f, message: 'Enter a number.' });
    else if (v < 0) out.push({ field: f, message: 'Cannot be negative.' });
    else if (positive && v <= 0) out.push({ field: f, message: 'Must be more than zero.' });
    else if (v > max) out.push({ field: f, message: `Use ${fmtNumber(max)} or less.` });
  };
  need('demand', true);
  need('orderCost', true);
  need('holdingCost', true);
  need('current', true);
  need('weeks', true, 53);
  need('buffer', false);
  need('price', false);
  if (discountOn) {
    need('minQty', true);
    need('discountPrice', false);
    if (raw.discountPrice !== null && raw.price !== null && raw.discountPrice >= raw.price) out.push({ field: 'discountPrice', message: 'A discount price should be below the usual price.' });
  }
  return out;
}

/* ---------- Words and workings ---------- */

export interface EoqUnits {
  one: string;
  many: string;
}

const q0 = (v: number) => fmtNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

export function readEoq(m: EoqModel, u: EoqUnits, currency: string): { reading: string; implication: string } {
  const money = (v: number) => fmtMoney(v, currency, Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2);
  const e = m.atEoq;
  const c = m.atCurrent;
  const buffer = e.bufferHolding > 0 ? ` The buffer adds ${money(e.bufferHolding)} a year whatever the order size, for a total of ${money(e.total)}.` : '';
  const reading = `The economic order quantity is ${q0(m.eoq)} ${u.many}: ${fmtNumber(e.ordersPerYear, 1)} orders a year, one about every ${fmtNumber(e.weeksBetween, 1)} weeks. At that size the yearly cost of ordering (${money(e.ordering)}) equals the cost of holding the stock each order brings (${money(e.cycleHolding)}).${buffer} Ordering ${q0(m.inputs.current)} at a time costs ${money(c.total)} a year, ${m.extra > 0.005 ? `${money(m.extra)} (${fmtNumber(m.extraShare * 100, 1)}%) more` : m.extra < -0.005 ? 'less' : 'the same'}.`;
  // Whole units inside the band: the lower edge rounded up, the upper rounded down.
  const band = `Any order between ${fmtNumber(Math.ceil(m.band[0] - 1e-9))} and ${fmtNumber(Math.floor(m.band[1] + 1e-9))} ${u.many} costs no more than 5% above the lowest, so the answer is less exact than the formula suggests.`;
  const d = m.discount;
  const disc = d
    ? d.saving > 0
      ? ` Including the price paid, taking the discount (orders of ${q0(d.quantity)}) saves ${money(d.saving)} a year: the lower price outweighs the extra cost of holding stock, which the EOQ formula alone would miss.`
      : ` Including the price paid, the discount does not pay: holding ${q0(d.quantity)} at a time costs ${money(-d.saving)} a year more than the price cut saves.`
    : '';
  return { reading, implication: `${band}${disc}` };
}

export function eoqWorking(m: EoqModel, u: EoqUnits, currency: string): Working {
  const i = m.inputs;
  const money = (v: number) => fmtMoney(v, currency, Number.isInteger(v) ? 0 : 2);
  const inside = (2 * i.demand * i.orderCost) / i.holdingCost;
  return {
    given: [
      { label: `Annual demand (D)`, value: `${fmtNumber(i.demand)} ${u.many}` },
      { label: 'Cost per order (S)', value: money(i.orderCost) },
      { label: `Holding cost per ${u.one} per year (H)`, value: money(i.holdingCost) },
    ],
    formula: 'EOQ = √(2 × D × S ÷ H)',
    substitution: `= √(2 × ${fmtNumber(i.demand)} × ${fmtNumber(i.orderCost, Number.isInteger(i.orderCost) ? 0 : 2)} ÷ ${fmtNumber(i.holdingCost, Number.isInteger(i.holdingCost) ? 0 : 2)})`,
    steps: [`2 × ${fmtNumber(i.demand)} × ${fmtNumber(i.orderCost, Number.isInteger(i.orderCost) ? 0 : 2)} = ${fmtNumber(2 * i.demand * i.orderCost, 2).replace(/\.00$/, '')}`, `÷ ${fmtNumber(i.holdingCost, Number.isInteger(i.holdingCost) ? 0 : 2)} = ${fmtNumber(inside, 2).replace(/\.00$/, '')}`, `√${fmtNumber(inside, 2).replace(/\.00$/, '')} = ${fmtNumber(m.eoq, 2)}`],
    answer: `${q0(m.eoq)} ${u.many}`,
    value: m.eoq,
    unit: `${u.many} per order`,
    note: 'Enrichment: the guide gives no formula for the reorder quantity. At the EOQ the yearly cost of ordering equals the yearly cost of holding the stock each order brings; holding any buffer costs extra, the same at every order size.',
  };
}

/** Order sizes for the table: a spread around the EOQ, with the current and discount quantities. */
export function tableQuantities(m: EoqModel): number[] {
  const e = m.eoq;
  const base = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5].map((k) => Math.round(e * k));
  const extra = [m.inputs.current, m.discount ? m.discount.quantity : 0].filter((x) => x > 0).map((x) => Math.round(x));
  return [...new Set([...base, ...extra])].filter((x) => x > 0).sort((a, b) => a - b);
}
