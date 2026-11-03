/**
 * The Boardroom: the engine against figures worked by hand, the accounting
 * identities on every period of every path through every scenario, the
 * scenarios' integrity, and the words written from the numbers.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { applyChange, identityErrors, originState, runPeriod } from '../../src/lib/boardroom/engine';
import { fmtKpi, fmtMoneyCompact, kpiChange } from '../../src/lib/boardroom/kpis';
import { describeEffects, fillTokens, narrateContext, unknownTokens } from '../../src/lib/boardroom/narrate';
import { allPaths, envelope, metricValue, runHistory, runPath, scorecard, sumPl } from '../../src/lib/boardroom/scenario';
import { modelSchema, scenarioSchema, startSchema, type Scenario } from '../../src/lib/boardroom/schema';
import { checkBoardroom } from '../../src/lib/integrity-boardroom';
import { loadCorpus } from './helpers/corpus';

const ROOT = new URL('../../src/content/boardroom/', import.meta.url).pathname;
const scenarios: Record<string, Scenario> = Object.fromEntries(
  readdirSync(ROOT)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => {
      const r = scenarioSchema.safeParse(parse(readFileSync(join(ROOT, f), 'utf8')));
      if (!r.success) throw new Error(`${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return [f.replace(/\.yaml$/, ''), r.data];
    }),
);

/* ------------------------------------------------------------------ */
/* A small business worked by hand                                     */
/* ------------------------------------------------------------------ */

// One channel, no defects, no brand or market movement, steady morale, so every
// figure can be checked with a calculator. A year is one period of 365 days.
const model = modelSchema.parse({
  period: { unit: 'year', days: 365, perYear: 1 },
  taxRate: 0.2,
  elasticity: 1,
  brandWeight: 0,
  marketingNorm: 10000,
  marketingEffect: 0,
  hoursPerWorker: 1000,
  overtimePremium: 0.5,
  newStarterOutput: 0.5,
  moraleProductivity: 0,
  moraleNorm: 60,
  moraleRecovery: 0,
  overtimeStrain: 0,
  layoffShock: 0,
  wageMorale: 0,
  turnoverBase: 0,
  turnoverPerPoint: 0,
  turnoverMin: 0,
  recruitCost: 0,
});
const start = startSchema.parse({
  label: 'Start',
  marketSize: 100000,
  channels: [{ id: 'shops', label: 'Shops', price: 50, demand: 10000, debtorDays: 73 }],
  marketing: 10000,
  brand: 50,
  materialCost: 20,
  overheads: 50000,
  plantCapacity: 20000,
  hoursPerUnit: 1,
  overtimeMax: 0.2,
  headcount: 10,
  wage: 20000,
  morale: 60,
  cash: 10000,
  loans: [{ label: 'Loan', principal: 100000, rate: 0.05 }],
  assets: [{ id: 'kit', label: 'Kit', cost: 200000, nbv: 150000, life: 10 }],
  shareCapital: 50000,
  creditorDays: 36.5,
  stockDays: 18.25,
  overdraftLimit: 50000,
  overdraftRate: 0.1,
  loanRate: 0.06,
});

describe('the engine, worked by hand', () => {
  it('applies a change in the order to, by, pct', () => {
    expect(applyChange(100, { to: 50 })).toBe(50);
    expect(applyChange(100, { by: -20 })).toBe(80);
    expect(applyChange(100, { pct: 10 })).toBeCloseTo(110, 9);
    expect(applyChange(100, { to: 50, by: 10, pct: 10 })).toBeCloseTo(66, 9);
  });

  it('sets working capital from its days and balances the opening position', () => {
    const s = originState(model, start);
    // 10,000 units at £50 = £500,000 of sales; 73 days of it owed = £100,000.
    expect(s.debtorsBy.shops).toBeCloseTo(100000, 6);
    // Purchases 10,000 × £20 = £200,000; 18.25 days = £10,000 of stock; 36.5 days = £20,000 owed to suppliers.
    expect(s.stock).toBeCloseTo(10000, 6);
    expect(s.creditors).toBeCloseTo(20000, 6);
    // Retained earnings balance the position: 150,000 + 10,000 + 100,000 + 10,000 − 20,000 − 100,000 − 50,000 = 100,000.
    expect(s.retainedEarnings).toBeCloseTo(100000, 6);
  });

  it('works one year of trading', () => {
    const { result: r } = runPeriod(model, originState(model, start), [{ effects: {} }], 'Year 1');
    const k = r.kpis;
    expect(k.volume).toBeCloseTo(10000, 6);
    expect(k.revenue).toBeCloseTo(500000, 6);
    expect(k.costOfSales).toBeCloseTo(200000, 6);
    expect(k.grossProfit).toBeCloseTo(300000, 6);
    // Expenses: wages 10 × 20,000 = 200,000; overheads 50,000; marketing 10,000; depreciation 150,000 ÷ 10 = 15,000.
    expect(r.pl.depreciation).toBeCloseTo(15000, 6);
    expect(k.pbit).toBeCloseTo(25000, 6);
    // Interest on the opening loan: 100,000 × 5% = 5,000. Tax 20% of 20,000 = 4,000.
    expect(k.interest).toBeCloseTo(5000, 6);
    expect(r.pl.tax).toBeCloseTo(4000, 6);
    expect(k.profit).toBeCloseTo(16000, 6);
    // Working capital unchanged, so net cash rises by profit plus depreciation: 10,000 + 16,000 + 15,000 = 41,000.
    expect(k.netCash).toBeCloseTo(41000, 6);
    // Capacity: 10 workers × 1,000 hours ÷ 1 hour = 10,000 in normal hours, 12,000 with overtime; plant 20,000.
    expect(k.capacity).toBeCloseTo(12000, 6);
    expect(k.utilization).toBeCloseTo((10000 / 12000) * 100, 6);
    // Break-even: fixed costs 275,000 ÷ contribution (50 − 20) = 9,166.67 units.
    expect(k.breakEven).toBeCloseTo(275000 / 30, 6);
    expect(identityErrors(r)).toEqual([]);
  });

  it('charges overtime at a premium above normal hours, and loses sales beyond capacity', () => {
    const { result: r } = runPeriod(model, originState(model, start), [{ effects: { demand: { shops: { to: 13000 } } } }], 'Year 1');
    // Capacity 12,000: 1,000 sales lost; 2,000 units in overtime, 2,000 hours at £20 an hour × 1.5 = £60,000.
    expect(r.kpis.volume).toBeCloseTo(12000, 6);
    expect(r.kpis.lostSales).toBeCloseTo(1000, 6);
    expect(r.ops.overtimeHours).toBeCloseTo(2000, 6);
    expect(r.ops.overtimePay).toBeCloseTo(60000, 6);
    expect(identityErrors(r)).toEqual([]);
  });

  it('releases cash when customers pay faster, and charges for it when invoices are factored', () => {
    const s0 = originState(model, start);
    const { result: r } = runPeriod(model, s0, [{ effects: { factoring: { channel: 'shops', days: 18.25, feeRate: 0.02 } } }], 'Year 1');
    // Debtors fall from 100,000 to 25,000; the fee is 2% of 500,000 = 10,000.
    expect(r.kpis.debtors).toBeCloseTo(25000, 6);
    expect(r.pl.factoring).toBeCloseTo(10000, 6);
    expect(r.cash.debtors).toBeCloseTo(75000, 6);
    expect(identityErrors(r)).toEqual([]);
  });

  it('records a sale and leaseback: cash in, a one-off gain, rent from then on', () => {
    const { result: r } = runPeriod(model, originState(model, start), [{ effects: { sellAsset: { asset: 'kit', proceeds: 180000, rent: 12000 } } }], 'Year 1');
    expect(r.pl.gain).toBeCloseTo(30000, 6);
    expect(r.pl.depreciation).toBeCloseTo(0, 6);
    expect(r.pl.overheads).toBeCloseTo(62000, 6);
    expect(r.cash.proceeds).toBeCloseTo(180000, 6);
    expect(r.cash.gain).toBeCloseTo(-30000, 6);
    expect(identityErrors(r)).toEqual([]);
  });

  it('turns an overdraft into a term loan only as far as there is an overdraft', () => {
    const s0 = originState(model, { ...start, cash: -40000 });
    const { result: r } = runPeriod(model, s0, [{ effects: { refinance: { max: 100000 } } }], 'Year 1');
    expect(r.cash.borrowed).toBeCloseTo(40000, 6);
    expect(r.kpis.debt).toBeCloseTo(140000, 6);
    const { result: none } = runPeriod(model, originState(model, start), [{ effects: { refinance: { max: 100000 } } }], 'Year 1');
    expect(none.cash.borrowed).toBe(0);
  });

  it('starts depreciating an investment when it comes into use, after its lag', () => {
    const s0 = originState(model, start);
    const y1 = runPeriod(model, s0, [{ effects: { capex: [{ id: 'line', label: 'Line', cost: 100000, life: 10, after: 1, effects: { plantCapacity: { by: 5000 } } }] } }], 'Year 1');
    expect(y1.result.pl.depreciation).toBeCloseTo(15000, 6);
    expect(y1.result.cash.capex).toBeCloseTo(-100000, 6);
    const y2 = runPeriod(model, y1.state, [{ effects: {} }], 'Year 2');
    expect(y2.result.pl.depreciation).toBeCloseTo(25000, 6);
    expect(y2.result.ops.plantCapacity).toBeCloseTo(25000, 6);
    expect(identityErrors(y1.result)).toEqual([]);
    expect(identityErrors(y2.result)).toEqual([]);
  });

  it('pays a profit share out of profit before interest and tax', () => {
    const { result: r } = runPeriod(model, originState(model, start), [{ effects: { profitShare: { to: 0.1 } } }], 'Year 1');
    // Profit before the bonus is 25,000; 10% of it is 2,500.
    expect(r.pl.bonus).toBeCloseTo(2500, 6);
    expect(r.kpis.pbit).toBeCloseTo(22500, 6);
  });

  it('is deterministic: the same inputs always give the same result', () => {
    const a = runPeriod(model, originState(model, start), [{ effects: { price: { pct: -5 } } }], 'Y');
    const b = runPeriod(model, originState(model, start), [{ effects: { price: { pct: -5 } } }], 'Y');
    expect(JSON.stringify(a.result)).toBe(JSON.stringify(b.result));
    // Price down 5% with unit elasticity: demand × 0.95^−1.
    expect(a.result.kpis.demand).toBeCloseTo(10000 / 0.95, 6);
  });
});

/* ------------------------------------------------------------------ */
/* The scenarios                                                       */
/* ------------------------------------------------------------------ */

describe('the Boardroom scenarios', () => {
  it('there are at least three, in different industries and on different challenges', () => {
    const list = Object.values(scenarios);
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(new Set(list.map((s) => s.company.industry)).size).toBe(list.length);
    expect(new Set(list.map((s) => s.challenge)).size).toBe(list.length);
    for (const s of list) expect(s.rounds.length).toBeGreaterThanOrEqual(3);
  });

  it('pass the integrity check against the rest of the corpus', () => {
    const c = loadCorpus();
    const problems = checkBoardroom(scenarios, {
      subtopics: new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code))),
      glossary: new Set(Object.keys(c.glossary)),
      commandTerms: new Set(Object.keys(c.commandTerms)),
    });
    expect(problems.map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  for (const [id, sc] of Object.entries(scenarios)) {
    describe(id, () => {
      const paths = allPaths(sc);

      it('has every path, and every period of every path satisfies the accounting identities', () => {
        expect(paths.length).toBe(sc.rounds.reduce((n, r) => n * r.options.length, 1));
        const { history } = runHistory(sc);
        for (const r of history) expect(identityErrors(r), `${id} ${r.label}`).toEqual([]);
        for (const p of paths) {
          const run = runPath(sc, p);
          expect(run.rounds.length).toBe(sc.rounds.length);
          for (const rr of run.rounds) expect(identityErrors(rr.result), `${id} ${p.join('>')} ${rr.round.period}`).toEqual([]);
        }
      });

      it('reconciles cash period to period: each opening balance is the last closing one', () => {
        for (const p of paths.filter((_, i) => i % 7 === 0)) {
          const run = runPath(sc, p);
          const all = [...run.history, ...run.rounds.map((r) => r.result)];
          for (let i = 1; i < all.length; i++) expect(all[i]?.cash.open).toBeCloseTo(all[i - 1]?.cash.close ?? NaN, 6);
        }
      });

      it('builds a year of the statement of profit or loss from its periods', () => {
        const { history } = runHistory(sc);
        const year = history.slice(-sc.model.period.perYear);
        const pl = sumPl(year);
        expect(pl.revenue).toBeCloseTo(year.reduce((a, r) => a + r.pl.revenue, 0), 6);
        expect(pl.pbit).toBeCloseTo(pl.grossProfit - pl.expenses + pl.otherIncome + pl.gain, 4);
      });

      it('keeps no path from meeting every director’s goals at once', () => {
        // The scenarios are written so that the roles' goals conflict; the debrief says so, and this keeps it true.
        expect(envelope(sc).everyone).toBe(0);
      });

      it('fills every token in its narratives and writes every option in words', () => {
        const ctx = narrateContext(sc);
        const run = runPath(sc, sc.walkthrough.picks);
        for (const rr of run.rounds) {
          const text = fillTokens(rr.option.outcome.narrative, rr.result.kpis, undefined, ctx);
          expect(text).not.toMatch(/\{\{|\}\}|NaN|undefined/);
          expect(unknownTokens(rr.option.outcome.narrative)).toEqual([]);
        }
        for (const r of sc.rounds) for (const o of r.options) expect(describeEffects(o.effects, ctx).length + o.when.length, `${r.id}/${o.id}`).toBeGreaterThan(0);
      });

      it('scores each role on its goals', () => {
        const run = runPath(sc, sc.walkthrough.picks);
        for (const role of ['ceo', 'finance', 'marketing', 'operations', 'hr'] as const) {
          const card = scorecard(sc, run, role);
          expect(card.length).toBe(sc.roles[role].goals.length);
          for (const g of card) expect(g.value).not.toBeNull();
        }
        expect(metricValue(run, 'final:revenue')).toBeCloseTo(run.rounds[run.rounds.length - 1]?.result.kpis.revenue ?? NaN, 6);
      });
    });
  }
});

/* ------------------------------------------------------------------ */
/* The debriefs' claims about their named paths                        */
/* ------------------------------------------------------------------ */

describe('the debriefs say what the engine shows', () => {
  const named = (id: string) => {
    const sc = scenarios[id];
    if (!sc) throw new Error(`no scenario ${id}`);
    return Object.fromEntries(sc.debrief.paths.map((p) => [p.id, runPath(sc, p.picks)]));
  };
  const final = (run: ReturnType<typeof runPath>) => run.rounds[run.rounds.length - 1]?.result.kpis;
  const cum = (run: ReturnType<typeof runPath>) => run.rounds.reduce((a, r) => a + r.result.kpis.profit, 0);
  const maxOver = (run: ReturnType<typeof runPath>) => Math.max(...run.rounds.map((r) => r.result.kpis.overdraftExcess));
  const events = (run: ReturnType<typeof runPath>) => run.rounds.map((r) => r.event?.id);

  it('Kestle: the cautious path never breaches; growth and the squeeze breach and the bank tightens; lean holds least stock', () => {
    const p = named('kestle-cycles');
    expect(maxOver(p.cautious!)).toBe(0);
    for (const k of ['growth', 'squeeze']) {
      expect(maxOver(p[k]!)).toBeGreaterThan(0);
      expect(events(p[k]!)).toContain('bank-penalty');
    }
    expect(events(p.lean!)).toContain('shortage');
    const stock = Object.entries(p).map(([k, r]) => [k, final(r)!.stockDays] as const);
    expect(stock.sort((a, b) => a[1] - b[1])[0]?.[0]).toBe('lean');
    const share = Object.entries(p).map(([k, r]) => [k, final(r)!.marketShare] as const);
    expect(share.sort((a, b) => b[1] - a[1])[0]?.[0]).toBe('growth');
  });

  it('Kilbrack: the people-first automated path earns most; nights keeps most jobs; the factory path has the lowest morale', () => {
    const p = named('kilbrack-bakery');
    const byCum = Object.entries(p).sort((a, b) => cum(b[1]) - cum(a[1]));
    expect(byCum[0]?.[0]).toBe('balanced');
    const byJobs = Object.entries(p).sort((a, b) => final(b[1])!.headcount - final(a[1])!.headcount);
    expect(byJobs[0]?.[0]).toBe('nights');
    const byMorale = Object.entries(p).sort((a, b) => final(a[1])!.morale - final(b[1])!.morale);
    expect(byMorale[0]?.[0]).toBe('factory');
    expect(final(p.nights!)!.pbit).toBeLessThan(final(p.craft!)!.pbit);
  });

  it('Mareluce: the green path earns least at first, ends near the top, with the strongest brand and smallest footprint', () => {
    const p = named('hotel-mareluce');
    const first = Object.entries(p).sort((a, b) => (a[1].rounds[0]?.result.kpis.pbit ?? 0) - (b[1].rounds[0]?.result.kpis.pbit ?? 0));
    expect(first[0]?.[0]).toBe('green');
    const lastPbit = Object.values(p).map((r) => final(r)!.pbit);
    expect(final(p.green!)!.pbit).toBeGreaterThanOrEqual(Math.max(...lastPbit) * 0.95);
    const brand = Object.entries(p).sort((a, b) => final(b[1])!.brand - final(a[1])!.brand);
    expect(brand[0]?.[0]).toBe('green');
    const carbon = Object.entries(p).sort((a, b) => final(a[1])!.emissionsPerUnit - final(b[1])!.emissionsPerUnit);
    expect(carbon[0]?.[0]).toBe('green');
    expect(cum(p['volume-green']!)).toBeLessThan(cum(p.green!));
    expect(events(p.full!)).toEqual(expect.arrayContaining(['drought', 'levy']));
    expect(final(p.middle!)!.gearing).toBeGreaterThan(final(p.green!)!.gearing);
  });
});

/* ------------------------------------------------------------------ */
/* Words from numbers                                                  */
/* ------------------------------------------------------------------ */

describe('formatting and narration', () => {
  const ctx = { symbol: '£', unit: 'bike', units: 'bikes' };

  it('writes money compactly with a typographic minus', () => {
    expect(fmtMoneyCompact(2384500, '£')).toBe('£2.38m');
    expect(fmtMoneyCompact(412300, '£')).toBe('£412k');
    expect(fmtMoneyCompact(-41250, '£')).toBe('−\u2060£41k');
    expect(fmtMoneyCompact(1000000, '£')).toBe('£1m');
    expect(fmtMoneyCompact(950, '€')).toBe('€950');
  });

  it('writes KPIs in their own terms', () => {
    expect(fmtKpi('utilization', 78.44, ctx)).toBe('78.4%');
    expect(fmtKpi('currentRatio', 1.4249, ctx)).toBe('1.42');
    expect(fmtKpi('stockDays', 112.4, ctx)).toBe('112 days');
    expect(fmtKpi('breakEven', -1, ctx)).toBe('None at this price');
  });

  it('says whether a change is better or worse, in words', () => {
    expect(kpiChange('netCash', -800000, -500000, ctx)).toMatchObject({ verdict: 'better', words: 'Up, better', text: '+\u2060£300k' });
    expect(kpiChange('morale', 60, 55, ctx)).toMatchObject({ verdict: 'worse', text: '−\u20605' });
    // A change smaller than the last digit shown is no change.
    expect(kpiChange('morale', 60, 59.8, ctx)).toMatchObject({ verdict: 'same', text: 'No change' });
    expect(kpiChange('utilization', 80, 85, ctx)).toMatchObject({ verdict: 'changed', text: '+\u20605.0 pts' });
  });

  it('fills tokens and reports unknown ones', () => {
    const k = runPeriod(model, originState(model, start), [{ effects: {} }], 'Y').result.kpis;
    expect(fillTokens('Revenue {{revenue}}, margin {{profitMargin}}.', k, undefined, ctx)).toBe('Revenue £500k, margin 5.0%.');
    expect(unknownTokens('{{cash}} and {{nonsense}} and {{cash.prev}}')).toEqual(['{{nonsense}}']);
  });
});
