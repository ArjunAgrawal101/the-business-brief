/**
 * The simulated scale model behind the growth brief's scale explorer: the
 * average cost of a meal in a company-owned restaurant chain of n restaurants,
 * broken into its parts. Purchasing economies lower the food cost per meal as
 * the chain doubles; central costs are spread over more meals; coordination
 * costs appear beyond a threshold and grow with the square of the excess.
 * The parameters live in src/content/interactives/growth-scale-explorer.yaml.
 */

export interface ScaleParams {
  mealsPerOutlet: number;
  foodPerMealAt4: number;
  purchasingSavingPerDoubling: number;
  /** Restaurant costs other than food, in millions a year per restaurant. */
  outletFixedPerOutlet: number;
  /** Central costs in millions a year: a base plus an amount per restaurant. */
  centralBase: number;
  centralPerOutlet: number;
  coordinationThreshold: number;
  /** Coordination cost in millions a year = factor × (n − threshold)², above the threshold. */
  coordinationFactor: number;
  maxOutlets: number;
}

export interface ScalePoint {
  outlets: number;
  food: number;
  outletFixed: number;
  central: number;
  coordination: number;
  total: number;
}

const M = 1_000_000;

export function scalePoint(n: number, p: ScaleParams): ScalePoint {
  if (!(n >= 1)) throw new Error('A chain needs at least one restaurant');
  const meals = p.mealsPerOutlet * n;
  const food = p.foodPerMealAt4 * (1 - p.purchasingSavingPerDoubling * Math.log2(n / 4));
  const outletFixed = (p.outletFixedPerOutlet * M) / p.mealsPerOutlet;
  const central = ((p.centralBase + p.centralPerOutlet * n) * M) / meals;
  const coordination = (p.coordinationFactor * Math.max(0, n - p.coordinationThreshold) ** 2 * M) / meals;
  return { outlets: n, food, outletFixed, central, coordination, total: food + outletFixed + central + coordination };
}

export function scaleCurve(p: ScaleParams): ScalePoint[] {
  return Array.from({ length: p.maxOutlets }, (_, i) => scalePoint(i + 1, p));
}

/** The number of restaurants with the lowest average cost (the first, if tied). */
export function lowestCost(p: ScaleParams): ScalePoint {
  return scaleCurve(p).reduce((best, pt) => (pt.total < best.total - 1e-9 ? pt : best));
}

/** Which effect is changing average cost most as the chain grows past n. */
export function dominantEffect(n: number, p: ScaleParams): 'economies' | 'diseconomies' | 'flat' {
  if (n >= p.maxOutlets) return scalePoint(n, p).total > scalePoint(n - 1, p).total ? 'diseconomies' : 'flat';
  const change = scalePoint(n + 1, p).total - scalePoint(n, p).total;
  if (Math.abs(change) < 0.05) return 'flat';
  return change < 0 ? 'economies' : 'diseconomies';
}

/** The breakdown table rows for one chain size, compared with a reference size. */
export function scaleBreakdown(n: number, ref: number, p: ScaleParams): Array<{ key: keyof Omit<ScalePoint, 'outlets'>; label: string; now: number; ref: number }> {
  const a = scalePoint(n, p);
  const b = scalePoint(ref, p);
  return [
    { key: 'food', label: 'Food and ingredients', now: a.food, ref: b.food },
    { key: 'outletFixed', label: 'Running each restaurant', now: a.outletFixed, ref: b.outletFixed },
    { key: 'central', label: 'Central costs (head office, brand)', now: a.central, ref: b.central },
    { key: 'coordination', label: 'Coordination costs', now: a.coordination, ref: b.coordination },
    { key: 'total', label: 'Average cost a meal', now: a.total, ref: b.total },
  ];
}

/** A sentence on what is happening to average cost at this size. */
export function scaleReading(n: number, p: ScaleParams, currency: string): string {
  const pt = scalePoint(n, p);
  const low = lowestCost(p);
  const effect = dominantEffect(n, p);
  const money = (v: number) => `${currency}${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const base = `With ${n} ${n === 1 ? 'restaurant' : 'restaurants'} the average cost of a meal is ${money(pt.total)}.`;
  if (n === low.outlets) return `${base} This is the lowest average cost in the model: the economies of a larger chain are exactly offset by the cost of coordinating it.`;
  if (effect === 'economies')
    return `${base} Average cost is still falling as the chain grows: bulk buying lowers the food cost and central costs are spread over more meals. These are economies of scale.`;
  if (effect === 'diseconomies')
    return `${base} Average cost is now rising as the chain grows: the cost of coordinating more restaurants is growing faster than the savings from bulk buying. These are diseconomies of scale.`;
  return `${base} Average cost barely changes with one more restaurant here: the economies and diseconomies of scale roughly cancel out.`;
}
