import { describe, expect, it } from 'vitest';
import { gapNote, growthRate, judgeGap, mapModel, marketModel, marketShare, quadrantLabel, readMarket, validateMarket, type MapAttribute, type MapBrand } from '../../src/lib/market';

// The Porto hand-made mug market in the Market Studio (simulated), in mugs a year.
const FIRMS = [
  { id: 'barro', name: 'Atelier Barro', last: 7200, now: 7680 },
  { id: 'seixo', name: 'Oficina Seixo', last: 9800, now: 9400 },
  { id: 'gres', name: 'Grés e Sal', last: 6100, now: 7900 },
  { id: 'lento', name: 'Estúdio Lento', last: 3900, now: 4400 },
  { id: 'others', name: 'Other studios and makers', last: 13000, now: 14620, group: true },
];

describe('market share and market growth', () => {
  it('uses the standard definitions', () => {
    // 7,200 ÷ 40,000 × 100 = 18
    expect(marketShare(7200, 40000)).toBe(18);
    // (44,000 − 40,000) ÷ 40,000 × 100 = 10
    expect(growthRate(40000, 44000)).toBe(10);
    expect(marketShare(10, 0)).toBeNull();
    expect(growthRate(0, 10)).toBeNull();
  });

  it('computes every share, change and rank in the case market', () => {
    const m = marketModel(FIRMS);
    // 7,200 + 9,800 + 6,100 + 3,900 + 13,000 = 40,000; 7,680 + 9,400 + 7,900 + 4,400 + 14,620 = 44,000
    expect(m.totalLast).toBe(40000);
    expect(m.totalNow).toBe(44000);
    expect(m.growth).toBe(10);
    const barro = m.firms.find((f) => f.id === 'barro');
    // 7,680 ÷ 44,000 × 100 = 17.4545...; 17.4545 − 18 = −0.5455 percentage points; (7,680 − 7,200) ÷ 7,200 × 100 = 6.667%
    expect(barro?.shareNow).toBeCloseTo(17.4545, 4);
    expect(barro?.shareChange).toBeCloseTo(-0.5455, 4);
    expect(barro?.salesGrowth).toBeCloseTo(6.6667, 4);
    // Grés e Sal: 7,900 ÷ 44,000 × 100 = 17.95%, so it overtakes Atelier Barro
    const gres = m.firms.find((f) => f.id === 'gres');
    expect(gres?.shareNow).toBeCloseTo(17.9545, 4);
    // Among the named firms, Atelier Barro was second (9,800 > 7,200 > 6,100 > 3,900) and is now third (9,400 > 7,900 > 7,680)
    expect(barro?.rankLast).toBe(2);
    expect(barro?.rankNow).toBe(3);
    // Shares add up to 100 in each year
    expect(m.firms.reduce((n, f) => n + (f.shareNow ?? 0), 0)).toBeCloseTo(100, 9);
    // "Other studios and makers" is a group of many sellers, so it is not ranked or named as leader:
    // Oficina Seixo leads with 9,400 ÷ 44,000 × 100 = 21.36%
    expect(m.leaderNow).toBe('seixo');
    expect(m.firms.find((f) => f.id === 'others')?.rankNow).toBe(0);
  });

  it('catches sales rising while share falls', () => {
    const r = readMarket(marketModel(FIRMS), 'barro', { last: '2025', now: '2026' }, 'mugs');
    expect(r.reading).toContain('The market grew by 10.0%');
    expect(r.reading).toContain("Atelier Barro's sales rose by 6.7%");
    expect(r.reading).toContain('its share fell from 18.0% to 17.5%, 0.5 percentage points');
    expect(r.reading).toContain('the market grew faster than the firm did');
    expect(r.reading).toContain('Grés e Sal overtook Atelier Barro');
    expect(r.reading).toContain('Oficina Seixo is the market leader with 21.4%');
  });

  it('catches sales falling while share rises', () => {
    // The market shrinks from 40,000 to 36,000 (−10%); the firm falls from 8,000 to 7,600 (−5%): share rises from 20% to 21.1%
    const m = marketModel([
      { id: 'a', name: 'A', last: 8000, now: 7600 },
      { id: 'b', name: 'B', last: 32000, now: 28400 },
    ]);
    expect(m.growth).toBe(-10);
    const r = readMarket(m, 'a', { last: '2025', now: '2026' }, 'units');
    expect(r.reading).toContain('shrank by 10.0%');
    expect(r.reading).toContain('Falling sales can still mean a rising share');
  });

  it('validates the inputs', () => {
    expect(validateMarket([{ id: 'a', last: -1, now: 5 }])[0]?.message).toBe('Sales cannot be negative.');
    expect(validateMarket([{ id: 'a', last: null, now: 5 }])[0]?.message).toBe('Enter a number.');
    expect(validateMarket([{ id: 'a', last: 0, now: 5 }])[0]?.message).toBe('The market needs some sales in each year.');
    expect(validateMarket(FIRMS)).toEqual([]);
  });
});

describe('position map', () => {
  const ATTRS: MapAttribute[] = [
    { id: 'price', label: 'Price', low: 'low price', high: 'high price' },
    { id: 'craft', label: 'Craftsmanship', low: 'mass-produced', high: 'hand-crafted' },
  ];
  const BRANDS: MapBrand[] = [
    { id: 'barro', name: 'Atelier Barro', scores: { price: 7.8, craft: 8.6 } },
    { id: 'loja', name: 'Casa Loja', scores: { price: 2.4, craft: 2.1 } },
    { id: 'feira', name: 'Feira makers', scores: { price: 3.6, craft: 7.2 } },
  ];
  const [price, craft] = ATTRS as [MapAttribute, MapAttribute];

  it('places brands in quadrants around the middle of the scale', () => {
    // Middle of a 1 to 10 scale = (1 + 10) ÷ 2 = 5.5
    const m = mapModel(BRANDS, 'price', 'craft', { min: 1, max: 10 });
    expect(m.mid).toBe(5.5);
    expect(m.points.find((p) => p.id === 'barro')?.quadrant).toBe('high-high');
    expect(m.points.find((p) => p.id === 'feira')?.quadrant).toBe('low-high');
    expect(m.empty).toEqual(['high-low']);
    expect(quadrantLabel('high-low', price, craft)).toBe('High price, mass-produced');
  });

  it('judges the gap the learner chooses, with the note for that gap', () => {
    const m = mapModel(BRANDS, 'price', 'craft', { min: 1, max: 10 });
    const notes = [{ poles: { price: 'high', craft: 'low' } as Record<string, 'high' | 'low'>, note: 'Empty for a reason.' }];
    const right = judgeGap(m, 'high-low', price, craft, notes);
    expect(right.verdict).toBe('right');
    expect(right.text).toContain('Empty for a reason.');
    const wrong = judgeGap(m, 'low-low', price, craft);
    expect(wrong.verdict).toBe('wrong');
    expect(wrong.text).toContain('Casa Loja');
    expect(wrong.text).toContain('high price, mass-produced');
    expect(judgeGap(m, 'none', price, craft).verdict).toBe('wrong');
    // The same note is found with the axes the other way round: craft on x and price on y, so the quadrant is low-high
    expect(gapNote('low-high', 'craft', 'price', notes)).toBe('Empty for a reason.');
  });

  it('accepts "no part is empty" when every quadrant has a seller', () => {
    const full = mapModel([...BRANDS, { id: 'x', name: 'X', scores: { price: 8, craft: 2 } }], 'price', 'craft', { min: 1, max: 10 });
    expect(full.empty).toEqual([]);
    expect(judgeGap(full, 'none', price, craft).verdict).toBe('right');
  });
});
