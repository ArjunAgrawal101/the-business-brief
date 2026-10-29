/**
 * A special order judged on contribution, including the case the classroom
 * rule of thumb leaves out: when the order needs more capacity than is spare,
 * it displaces regular sales, and the contribution those sales would have
 * earned is a cost of accepting it.
 */
import { round, roundUp } from './format';

export interface SpecialOrderInputs {
  orderPrice: number;
  variableCost: number;
  quantity: number;
  extraFixedCosts: number;
  regularSales: number;
  capacity: number;
  fullCostPerUnit: number;
  regularContribution: number;
}

export interface SpecialOrderModel {
  inputs: SpecialOrderInputs;
  contributionPerUnit: number;
  orderContribution: number;
  spare: number;
  displaced: number;
  lostContribution: number;
  change: number;
  belowFullCost: boolean;
  belowVariableCost: boolean;
  /** The lowest price at which the order does not reduce profit, rounded up to the cent. */
  minimumPrice: number | null;
  /** Share of capacity used with the order, capped at 100. */
  utilisation: number;
}

export function specialOrderModel(i: SpecialOrderInputs): SpecialOrderModel {
  const contributionPerUnit = i.orderPrice - i.variableCost;
  const orderContribution = contributionPerUnit * i.quantity;
  const spare = Math.max(0, i.capacity - i.regularSales);
  // Regular sales the order pushes out; never more than the order itself.
  const displaced = Math.min(i.quantity, Math.max(0, i.regularSales + i.quantity - i.capacity));
  const lostContribution = displaced * i.regularContribution;
  const change = orderContribution - i.extraFixedCosts - lostContribution;
  return {
    inputs: i,
    contributionPerUnit,
    orderContribution,
    spare,
    displaced,
    lostContribution,
    change: round(change, 2),
    belowFullCost: i.orderPrice < i.fullCostPerUnit,
    belowVariableCost: i.orderPrice < i.variableCost,
    minimumPrice: i.quantity > 0 ? roundUp(i.variableCost + (i.extraFixedCosts + lostContribution) / i.quantity, 2) : null,
    utilisation: i.capacity > 0 ? Math.min(100, ((i.regularSales + i.quantity - displaced) / i.capacity) * 100) : 0,
  };
}

export type SpecialOrderProblem = { field: keyof SpecialOrderInputs; message: string };

export function validateSpecialOrder(i: Partial<Record<keyof SpecialOrderInputs, number | null>>): SpecialOrderProblem[] {
  const p: SpecialOrderProblem[] = [];
  const check = (f: keyof SpecialOrderInputs, label: string, min = 0, whole = false) => {
    const v = i[f];
    if (v === null || v === undefined || !Number.isFinite(v)) p.push({ field: f, message: `Enter a number for ${label}.` });
    else if (v < min) p.push({ field: f, message: min > 0 ? `${cap(label)} must be more than zero.` : `${cap(label)} cannot be negative.` });
    else if (whole && !Number.isInteger(v)) p.push({ field: f, message: `${cap(label)} must be a whole number.` });
  };
  check('orderPrice', 'the price offered', 0.01);
  check('variableCost', 'the variable cost');
  check('quantity', 'the order size', 1, true);
  check('extraFixedCosts', 'the extra costs');
  check('regularSales', 'regular sales', 0, true);
  check('capacity', 'capacity', 1, true);
  check('fullCostPerUnit', 'the average cost', 0.01);
  check('regularContribution', 'the contribution of a regular sale');
  return p;
}

function cap(s: string): string {
  return `${s[0]?.toUpperCase() ?? ''}${s.slice(1)}`;
}

/** Plain-language reading of the order. Money is passed in already formatted by the caller's formatter. */
export function readSpecialOrder(
  m: SpecialOrderModel,
  money: (v: number) => string,
  l: { unit: string; units: string; period: string },
): { interpretation: string; implication: string } {
  const i = m.inputs;
  const n = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  const verb = m.change >= 0 ? 'adds' : 'reduces profit by';
  const amount = money(Math.abs(m.change));
  let interpretation: string;
  if (m.belowVariableCost) {
    interpretation = `At ${money(i.orderPrice)} each ${l.unit} does not even cover its own variable cost of ${money(i.variableCost)}, so the order ${verb} ${amount}.`;
  } else if (m.displaced > 0) {
    interpretation = `The order needs ${n(i.quantity)} ${l.units} but only ${n(m.spare)} are spare, so ${n(m.displaced)} regular ${l.units} would be lost at ${money(i.regularContribution)} of contribution each. After that, the order ${verb} ${amount}.`;
  } else if (m.belowFullCost) {
    interpretation = `The price is ${money(i.fullCostPerUnit - i.orderPrice)} below the average cost of a ${l.unit}, yet the order ${verb} ${amount}. Regular sales already cover the fixed costs, so each ${l.unit} on the order only has to cover its own variable cost of ${money(i.variableCost)}.`;
  } else {
    interpretation = `The price is above the average cost of a ${l.unit}, and there is spare capacity, so the order ${verb} ${amount}.`;
  }
  const notes: string[] = [];
  if (m.minimumPrice !== null) notes.push(`On these figures the lowest price that does not reduce profit is ${money(m.minimumPrice)} a ${l.unit}.`);
  if (m.change >= 0 && m.displaced === 0) notes.push(`Before accepting, weigh what the figures leave out: whether regular customers would expect the same price, and what the order does to the brand.`);
  else if (m.change >= 0) notes.push(`It still adds profit, but less than it seems: the lost regular sales cost ${money(m.lostContribution)}.`);
  else notes.push(`Turn it down, ask for a higher price, or offer a ${l.period} with spare capacity.`);
  return { interpretation, implication: notes.join(' ') };
}
