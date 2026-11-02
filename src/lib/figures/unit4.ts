/**
 * Unit 4 diagrams: marketing.
 */
import type { DiagramDef } from '../diagrams';
import { C, TONES, arrowPath, axes, box, circle, fictionNote, frame, line, num, para, rect, smooth, sx, sy, text, type Axes, type Tone } from './kit';

/* ---------- Market and product orientation ---------- */
function orientation(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const row = (y: number, title: string, tone: Tone, steps: string[], note: string, loop: boolean) => {
    p.push(text(16, y - 14, title, { size: 15, weight: 700, serif: true, fill: TONES[tone].text }));
    steps.forEach((s, i) => {
      const x = 16 + i * 236;
      p.push(box(x, y, 200, 56, s, { tone, style: i === 0 ? 'solid' : 'wash', size: 12.5 }));
      if (i < steps.length - 1) p.push(line(id, x + 202, y + 28, x + 234, y + 28, { tone, sw: 1.6, arrow: 'end' }));
    });
    if (loop) p.push(arrowPath(id, `M${16 + 2 * 236 + 100},${y + 58} C${560},${y + 98} ${120},${y + 98} ${116},${y + 58}`, { tone, sw: 1.4, dash: '5 4' }));
    p.push(text(16, y + (loop ? 112 : 80), note, { size: 11.5, italic: true, fill: C.slate }));
  };
  row(46, 'Product orientation', 'slate', ['Make what the business is good at', 'Look for customers for it', 'Sell it, often with heavy promotion'], 'Works for new technology or unique products; risks making things nobody wants.', false);
  row(186, 'Market orientation', 'green', ['Research what customers want', 'Develop products to meet it', 'Sell, then keep listening'], 'Keeps products relevant; research costs money and customers cannot always imagine what is new.', true);
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Product orientation and market orientation',
      desc: 'Two sequences. Product orientation: make what the business is good at, look for customers for it, then sell it, often with heavy promotion; it works for new technology or unique products but risks making things nobody wants. Market orientation: research what customers want, develop products to meet it, sell, and keep listening, in a loop; it keeps products relevant, though research costs money and customers cannot always imagine what is new.',
    },
    p.join(''),
  );
}

/* ---------- Market share and growth ---------- */
export const MARKET = {
  last: 40,
  firms: [
    { name: 'Alder', last: 14, now: 15.4 },
    { name: 'Birch', last: 10, now: 12.1 },
    { name: 'Cedar', last: 9, now: 9.2 },
    { name: 'Others', last: 7, now: 7.3 },
  ],
};

export function marketFigures(m = MARKET) {
  const totalLast = m.firms.reduce((s, f) => s + f.last, 0);
  const totalNow = m.firms.reduce((s, f) => s + f.now, 0);
  return {
    totalLast,
    totalNow,
    growth: ((totalNow - totalLast) / totalLast) * 100,
    shares: m.firms.map((f) => ({ name: f.name, last: (f.last / totalLast) * 100, now: (f.now / totalNow) * 100 })),
  };
}

function marketShare(id: string): string {
  const W = 720;
  const H = 330;
  const f = marketFigures();
  const p: string[] = [];
  const tones: Tone[] = ['ink', 'gold', 'cobalt', 'slate'];
  const bar = (y: number, label: string, key: 'last' | 'now', total: number) => {
    p.push(text(16, y + 24, label, { size: 13, weight: 700, fill: C.ink }));
    p.push(text(16, y + 42, `Market size $${num(total, 1)}m`, { size: 11.5, fill: C.slate }));
    let x = 190;
    const w = 500;
    f.shares.forEach((s, i) => {
      const bw = (s[key] / 100) * w;
      const tone = TONES[tones[i]!];
      p.push(rect(x, y + 6, bw - 2, 40, { fill: i === 1 ? tone.line : tone.wash, stroke: tone.line, sw: 1 }));
      p.push(text(x + bw / 2, y + 24, s.name, { size: 11, weight: 700, fill: i === 1 ? C.white : C.ink, anchor: 'middle' }));
      p.push(text(x + bw / 2, y + 39, `${num(s[key], 1)}%`, { size: 11, fill: i === 1 ? C.white : C.body, anchor: 'middle' }));
      x += bw;
    });
  };
  bar(30, 'Last year', 'last', f.totalLast);
  bar(110, 'This year', 'now', f.totalNow);
  const b = MARKET.firms[1]!;
  const sNow = f.shares[1]!.now;
  p.push(rect(16, 186, 688, 126, { fill: C.paper, rx: 3 }));
  p.push(text(32, 210, 'Market share = the firm’s sales ÷ total market sales × 100', { size: 12.5, weight: 700, fill: C.ink }));
  p.push(text(32, 230, `Birch this year: ${num(b.now, 1)} ÷ ${num(f.totalNow, 1)} × 100 = ${num(sNow, 1)}%`, { size: 12, fill: C.body }));
  p.push(text(32, 256, 'Market growth = (sales this period − sales last period) ÷ sales last period × 100', { size: 12.5, weight: 700, fill: C.ink }));
  p.push(text(32, 276, `The market: (${num(f.totalNow, 1)} − ${num(f.totalLast, 1)}) ÷ ${num(f.totalLast, 1)} × 100 = ${num(f.growth, 1)}%`, { size: 12, fill: C.body }));
  p.push(text(32, 298, 'Birch’s sales grew faster than the market, so its share rose.', { size: 11.5, italic: true, fill: C.slate }));
  p.push(fictionNote(W - 12, 22, 'Fictional market, $m.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Market share and market growth',
      desc: `Two bars show a fictional market divided between four sellers, last year and this year. The market grew from $${num(f.totalLast, 1)}m to $${num(f.totalNow, 1)}m, market growth of ${num(f.growth, 1)}%. ${f.shares.map((s) => `${s.name}: ${num(s.last, 1)}% then ${num(s.now, 1)}%`).join('; ')}. Market share is the firm’s sales divided by total market sales times 100; Birch’s sales of $${num(b.now, 1)}m give ${num(sNow, 1)}%. Its sales grew faster than the market, so its share rose.`,
    },
    p.join(''),
  );
}

/* ---------- Segmentation, targeting and positioning ---------- */
function stp(id: string): string {
  const W = 720;
  const H = 340;
  const p: string[] = [];
  const steps: Array<[string, string, string[]]> = [
    ['Segmentation', 'Divide the market into groups with similar needs', ['Demographic: age, income, family', 'Geographic: region, climate, urban or rural', 'Psychographic: lifestyle, values', 'Behavioural: usage, loyalty, occasion']],
    ['Targeting', 'Choose the segments to serve', ['One segment: a niche', 'Several, each with its own mix', 'The whole market: mass marketing']],
    ['Positioning', 'Decide how the brand should be seen', ['Against rivals, on a position map', 'Built on a unique selling point', 'Delivered through the marketing mix']],
  ];
  steps.forEach(([n, s, items], i) => {
    const x = 10 + i * 238;
    p.push(box(x, 20, 210, 64, n, { tone: i === 0 ? 'ink' : i === 1 ? 'gold' : 'green', style: 'solid', size: 15, sub: s }));
    if (i < 2) p.push(line(id, x + 212, 52, x + 236, 52, { arrow: 'end', sw: 1.8 }));
    items.forEach((it, j) => {
      p.push(circle(x + 10, 112 + j * 44, 3.5, { fill: C.gold }));
      p.push(para(x + 22, 116 + j * 44, it, 28, { size: 12, fill: C.body }));
    });
  });
  p.push(para(10, 304, 'A niche market is a small, well-defined segment; a mass market serves most customers with one broad offer.', 116, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Segmentation, targeting and positioning',
      desc: 'Three steps. Segmentation: divide the market into groups with similar needs, by demographic factors such as age, income and family, geographic factors such as region and climate, psychographic factors such as lifestyle and values, or behavioural factors such as usage, loyalty and occasion. Targeting: choose the segments to serve, one niche, several each with its own mix, or the whole market through mass marketing. Positioning: decide how the brand should be seen against rivals, on a position map, built on a unique selling point and delivered through the marketing mix.',
    },
    p.join(''),
  );
}

/* ---------- Position map ---------- */
const BRANDS: Array<[string, number, number]> = [
  ['Kettle Lane', 8, 8.4],
  ['Daybreak', 3, 3.2],
  ['Harbour Roast', 6.4, 6.8],
  ['Quickcup', 1.6, 1.8],
  ['Saltmarsh', 7.6, 3.4],
  ['Corner Brew', 4.0, 5.9],
];

function positionMap(id: string): string {
  const W = 640;
  const H = 490;
  const p: string[] = [];
  const cx = 320;
  const cy = 220;
  const R = 180;
  const to = (v: number) => (v - 5) / 5;
  p.push(line(id, cx - R - 10, cy, cx + R + 10, cy, { sw: 1.4, arrow: 'both' }));
  p.push(line(id, cx, cy + R + 10, cx, cy - R - 10, { sw: 1.4, arrow: 'both' }));
  p.push(text(cx + R + 14, cy + 4, 'High price', { size: 12, weight: 700, fill: C.ink }));
  p.push(text(cx - R - 14, cy + 4, 'Low price', { size: 12, weight: 700, fill: C.ink, anchor: 'end' }));
  p.push(text(cx, cy - R - 18, 'High perceived quality', { size: 12, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(text(cx, cy + R + 28, 'Low perceived quality', { size: 12, weight: 700, fill: C.ink, anchor: 'middle' }));
  // A gap: good quality at a modest price.
  p.push(circle(cx - 0.55 * R, cy - 0.6 * R, 46, { fill: C.greenWash, stroke: C.green, sw: 1.2, dash: '5 4' }));
  p.push(text(cx - 0.55 * R, cy - 0.6 * R - 4, 'A gap?', { size: 12.5, weight: 700, fill: C.greenText, anchor: 'middle' }));
  p.push(text(cx - 0.55 * R, cy - 0.6 * R + 12, 'good value', { size: 11, fill: C.greenText, anchor: 'middle' }));
  for (const [n, price, q] of BRANDS) {
    const x = cx + to(price) * R;
    const y = cy - to(q) * R;
    p.push(circle(x, y, 8, { fill: C.ink, stroke: C.white, sw: 2 }));
    p.push(text(x + 12, y + 4, n, { size: 12, weight: 600, fill: C.ink }));
  }
  p.push(para(16, H - 34, 'Brands are placed by how customers see them, usually from research. A gap may be an opportunity, or there may be no demand there.', 100, { size: 11, fill: C.slate }));
  p.push(fictionNote(W - 12, 20, 'Fictional coffee brands.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A position map',
      desc: `A position map of six fictional coffee brands, with price from low to high across and perceived quality from low to high up. ${BRANDS.map(([n, pr, q]) => `${n}: price ${pr} out of 10, quality ${q}`).join('; ')}. A circle marks a possible gap: good perceived quality at a modest price. Brands are placed by how customers see them; a gap may be an opportunity, or there may be no demand there.`,
    },
    p.join(''),
  );
}

/* ---------- Market research methods ---------- */
function research(id: string): string {
  const W = 700;
  const H = 400;
  const p: string[] = [];
  const gx = 140;
  const gy = 60;
  const cw = 270;
  const ch = 140;
  p.push(text(gx + cw / 2, 40, 'Primary research', { size: 13, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(text(gx + cw / 2, 54, 'New data, collected first-hand', { size: 11, fill: C.slate, anchor: 'middle' }));
  p.push(text(gx + cw * 1.5, 40, 'Secondary research', { size: 13, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(text(gx + cw * 1.5, 54, 'Existing data, collected by others', { size: 11, fill: C.slate, anchor: 'middle' }));
  p.push(text(gx - 14, gy + ch / 2, 'Quantitative', { size: 13, weight: 700, fill: C.ink, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch / 2 + 16, 'numbers', { size: 11, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch * 1.5, 'Qualitative', { size: 13, weight: 700, fill: C.ink, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch * 1.5 + 16, 'opinions, reasons', { size: 11, fill: C.slate, anchor: 'end' }));
  const cells: Array<[number, number, string, Tone]> = [
    [0, 0, 'Surveys with closed questions; counting in observations', 'cobalt'],
    [1, 0, 'Market analyses, government publications, sales data', 'gold'],
    [0, 1, 'Interviews, focus groups, open questions, watching behaviour', 'cobalt'],
    [1, 1, 'Academic journals, media articles, online reviews and content', 'gold'],
  ];
  for (const [i, j, s, tone] of cells) {
    p.push(rect(gx + i * cw, gy + j * ch, cw - 8, ch - 8, { fill: TONES[tone].wash, stroke: TONES[tone].line, sw: 1, rx: 3 }));
    p.push(para(gx + i * cw + 16, gy + j * ch + 34, s, 34, { size: 12.5, fill: C.body }));
  }
  p.push(para(gx, gy + 2 * ch + 20, 'Primary research fits the question exactly but costs time and money; secondary research is quicker and cheaper but may be dated or not quite relevant.', 76, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Market research: primary and secondary, quantitative and qualitative',
      desc: 'A grid of research types. Primary quantitative: surveys with closed questions and counting in observations. Secondary quantitative: market analyses, government publications and sales data. Primary qualitative: interviews, focus groups, open questions and watching behaviour. Secondary qualitative: academic journals, media articles, and online reviews and content. Primary research fits the question exactly but costs time and money; secondary research is quicker and cheaper but may be dated or not quite relevant.',
    },
    p.join(''),
  );
}

/* ---------- Sampling methods ---------- */
function sampling(id: string): string {
  const W = 720;
  const H = 360;
  const p: string[] = [];
  const cols = 10;
  const rows = 6;
  // Two groups in the population: 36 of group A, 24 of group B, scattered by a fixed pattern.
  const groupB = new Set([2, 5, 7, 11, 14, 18, 21, 23, 26, 29, 33, 35, 38, 40, 42, 45, 47, 50, 52, 54, 56, 57, 58, 59]);
  // Random: a fixed pseudo-random draw of 10.
  const randomPick = new Set([3, 9, 14, 22, 27, 31, 38, 44, 49, 55]);
  // Quota: 6 from group A and 4 from group B, in proportion to the population (36:24).
  const aIdx = [...Array(60).keys()].filter((i) => !groupB.has(i));
  const bIdx = [...groupB];
  const quotaPick = new Set([...aIdx.filter((_, k) => k % 6 === 1).slice(0, 6), ...bIdx.filter((_, k) => k % 6 === 2).slice(0, 4)]);
  // Convenience: the 10 nearest the researcher, at the bottom-left corner.
  const dist = (i: number) => Math.hypot(i % cols, rows - 1 - Math.floor(i / cols));
  const convPick = new Set([...Array(60).keys()].sort((a, b) => dist(a) - dist(b)).slice(0, 10));
  const panel = (x0: number, title: string, sub: string, pick: Set<number>) => {
    p.push(text(x0, 34, title, { size: 14, weight: 700, serif: true, fill: C.ink }));
    p.push(para(x0, 52, sub, 32, { size: 11, fill: C.slate }));
    for (let i = 0; i < 60; i++) {
      const x = x0 + 8 + (i % cols) * 20;
      const y = 118 + Math.floor(i / cols) * 24;
      const b = groupB.has(i);
      const chosen = pick.has(i);
      p.push(circle(x, y, 6.5, { fill: chosen ? (b ? C.gold : C.ink) : C.white, stroke: b ? C.gold : C.slate, sw: chosen ? 2 : 1.2 }));
    }
  };
  panel(16, 'Random', 'Everyone has an equal chance: needs a full list', randomPick);
  panel(256, 'Quota', 'A set number from each group, here in proportion: 6 and 4', quotaPick);
  panel(496, 'Convenience', 'Whoever is easiest to reach: quick, likely to be biased', convPick);
  p.push(text(496 + 8, 270, 'Researcher here', { size: 10.5, italic: true, fill: C.slate }));
  p.push(circle(30, 304, 6.5, { fill: C.ink }));
  p.push(text(42, 308, 'Chosen, group A', { size: 11, fill: C.body }));
  p.push(circle(160, 304, 6.5, { fill: C.gold }));
  p.push(text(172, 308, 'Chosen, group B', { size: 11, fill: C.body }));
  p.push(circle(290, 304, 6.5, { fill: C.white, stroke: C.slate, sw: 1.2 }));
  p.push(text(302, 308, 'Not chosen', { size: 11, fill: C.body }));
  p.push(text(16, 340, `Each sample is 10 of a population of 60: 36 in group A and 24 in group B.`, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Three sampling methods',
      desc: 'Three panels show the same population of 60 people, 36 in group A and 24 in group B, and a sample of 10 chosen in three ways. Random sampling: everyone has an equal chance, which needs a full list of the population; the chosen are scattered. Quota sampling: a set number from each group, here 6 from group A and 4 from group B, in proportion to the population. Convenience sampling: the ten easiest to reach, all clustered near the researcher, which is quick but likely to be biased.',
    },
    p.join(''),
  );
}

/* ---------- The seven Ps ---------- */
function sevenPs(id: string): string {
  const W = 720;
  const H = 420;
  const p: string[] = [];
  const cx = 360;
  const cy = 210;
  p.push(circle(cx, cy, 58, { fill: C.ink }));
  p.push(text(cx, cy - 4, 'The target', { size: 13, weight: 600, serif: true, fill: C.white, anchor: 'middle' }));
  p.push(text(cx, cy + 13, 'customer', { size: 13, weight: 600, serif: true, fill: C.white, anchor: 'middle' }));
  const ps: Array<[string, string, Tone]> = [
    ['Product', 'Features, quality, branding, the portfolio, the life cycle', 'gold'],
    ['Price', 'Cost-plus, penetration, premium, loss leader, predatory', 'gold'],
    ['Promotion', 'Above, below and through the line; social media', 'gold'],
    ['Place', 'Distribution channels and outlets', 'gold'],
    ['People', 'Staff and customer relationships, across cultures', 'cobalt'],
    ['Processes', 'How the service is delivered', 'cobalt'],
    ['Physical evidence', 'What customers see and touch: premises, packaging, receipts', 'cobalt'],
  ];
  ps.forEach(([n, s, tone], i) => {
    const a = ((-90 + (360 / ps.length) * i) * Math.PI) / 180;
    const x = cx + 260 * Math.cos(a);
    const y = cy + 160 * Math.sin(a);
    p.push(line(id, cx + 60 * Math.cos(a), cy + 60 * Math.sin(a), x - 70 * Math.cos(a), y - 30 * Math.sin(a), { stroke: C.rule, sw: 1 }));
    p.push(box(x - 96, y - 30, 192, 60, n, { tone, style: 'outline', size: 13.5, sub: s, subSize: 10.5 }));
  });
  p.push(rect(16, 388, 14, 10, { fill: C.white, stroke: C.gold, sw: 1.2 }));
  p.push(text(36, 397, 'The four Ps of any product', { size: 11.5, fill: C.body }));
  p.push(rect(230, 388, 14, 10, { fill: C.white, stroke: C.cobalt, sw: 1.2 }));
  p.push(text(250, 397, 'Three more for services', { size: 11.5, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The seven Ps of the marketing mix',
      desc: 'Seven elements around the target customer. The four Ps of any product: product, its features, quality, branding, the portfolio and the life cycle; price, including cost-plus, penetration, premium, loss leader and predatory pricing; promotion, above, below and through the line and on social media; and place, the distribution channels and outlets. Three more for services: people, the staff and customer relationships, which vary across cultures; processes, how the service is delivered; and physical evidence, what customers see and touch, such as premises, packaging and receipts.',
    },
    p.join(''),
  );
}

/* ---------- Product life cycle ---------- */
function plc(id: string): string {
  const W = 720;
  const H = 440;
  const a: Axes = { x: 70, y: 40, w: 560, h: 300, x0: 0, x1: 10, y0: -3, y1: 10 };
  const p: string[] = [];
  const stages: Array<[number, number, string]> = [
    [0, 1.4, 'Development'],
    [1.4, 3, 'Introduction'],
    [3, 5, 'Growth'],
    [5, 7.4, 'Maturity'],
    [7.4, 10, 'Decline'],
  ];
  stages.forEach(([x0, x1, n], i) => {
    if (i % 2) p.push(rect(sx(a, x0), a.y, sx(a, x1) - sx(a, x0), a.h, { fill: C.paper }));
    p.push(text((sx(a, x0) + sx(a, x1)) / 2, a.y + a.h - 8, n, { size: 11, weight: 700, fill: C.slate, anchor: 'middle' }));
  });
  p.push(axes(id, a, { xLabel: 'Time', yLabel: 'Sales and cash flow', xAxisAt: 0 }));
  const sales: Array<[number, number]> = [[1.4, 0], [2.2, 0.6], [3, 1.9], [3.9, 4.6], [5, 7.2], [6.2, 8], [7.4, 7.4], [8.6, 5], [9.8, 2.8]];
  p.push(`<path d="${smooth(sales.map(([x, y]) => [sx(a, x), sy(a, y)]))}" fill="none" stroke="${C.ink}" stroke-width="2.8"/>`);
  const cash: Array<[number, number]> = [[0, 0], [0.8, -1.6], [1.6, -2.4], [2.4, -1.6], [3.2, 0.2], [4.4, 2.6], [5.6, 4], [6.8, 4.2], [7.8, 3], [9, 1.2], [9.8, 0.4]];
  p.push(`<path d="${smooth(cash.map(([x, y]) => [sx(a, x), sy(a, y)]))}" fill="none" stroke="${C.cobalt}" stroke-width="2.2" stroke-dasharray="7 5"/>`);
  // An extension strategy in maturity.
  const ext: Array<[number, number]> = [[6.6, 7.9], [7.4, 8.5], [8.2, 8.8], [9.2, 8.2], [9.9, 7.2]];
  p.push(`<path d="${smooth(ext.map(([x, y]) => [sx(a, x), sy(a, y)]))}" fill="none" stroke="${C.gold}" stroke-width="2.4"/>`);
  p.push(circle(sx(a, 6.6), sy(a, 7.9), 5, { fill: C.gold, stroke: C.white, sw: 2 }));
  p.push(para(sx(a, 7.6), sy(a, 9.7), 'Extension strategy: new uses, markets, versions or promotion', 26, { size: 11, weight: 600, fill: C.goldText }));
  p.push(text(sx(a, 9.9), sy(a, 2.8) + 18, 'Sales', { size: 12, weight: 700, fill: C.ink, anchor: 'end' }));
  p.push(text(sx(a, 3.0), sy(a, -1.8), 'Cash flow negative: investment', { size: 11.5, weight: 600, fill: C.cobaltText }));
  p.push(text(sx(a, 6.2), sy(a, 4.2) - 10, 'Cash flow', { size: 12, weight: 700, fill: C.cobaltText, anchor: 'middle' }));
  p.push(para(16, H - 46, 'Investment comes first, so cash flow is negative through development and introduction; profit and cash flow peak around maturity. Not every product follows the curve, and its length cannot be known in advance.', 118, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The product life cycle, with cash flow',
      desc: 'Sales over time through five stages: development, with no sales; introduction, with slow sales; growth, with sales rising fast; maturity, where sales level off and peak; and decline. A dashed line shows cash flow: negative through development and introduction, when the business invests, turning positive in growth and peaking around maturity. A second curve in maturity shows an extension strategy, such as new uses, markets, versions or promotion, lifting sales again. Not every product follows the curve, and its length cannot be known in advance.',
    },
    p.join(''),
  );
}

/* ---------- Promotion ---------- */
function promotion(id: string): string {
  const W = 720;
  const H = 320;
  const p: string[] = [];
  const y = 150;
  p.push(line(id, 16, y, 704, y, { sw: 2.4 }));
  p.push(text(704, y - 8, 'The line', { size: 11, weight: 700, fill: C.slate, anchor: 'end', label: true }));
  p.push(text(16, 34, 'Above the line', { size: 15, weight: 700, serif: true, fill: C.cobaltText }));
  p.push(text(16, 52, 'Paid mass media, reaching a broad audience', { size: 11.5, fill: C.slate }));
  ['Television', 'Radio', 'Cinema', 'Newspapers and magazines', 'Billboards'].forEach((s, i) => p.push(box(16 + i * 138, 70, 128, 44, s, { tone: 'cobalt', size: 12 })));
  p.push(text(16, y + 34, 'Below the line', { size: 15, weight: 700, serif: true, fill: C.goldText }));
  p.push(text(16, y + 52, 'Aimed directly at chosen customers, without mass media', { size: 11.5, fill: C.slate }));
  ['Sales promotions', 'Direct mail and email', 'Public relations', 'Sponsorship', 'Personal selling'].forEach((s, i) => p.push(box(16 + i * 138, y + 70, 128, 44, s, { tone: 'gold', size: 12 })));
  p.push(rect(16, y + 130, 688, 34, { fill: C.greenWash, rx: 3 }));
  p.push(text(30, y + 152, 'Through the line: one integrated campaign using both, with social media often bridging them.', { size: 12, weight: 600, fill: C.greenText }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Above, below and through the line promotion',
      desc: 'A horizontal line divides promotion. Above the line: paid mass media reaching a broad audience, such as television, radio, cinema, newspapers and magazines, and billboards. Below the line: promotion aimed directly at chosen customers without mass media, such as sales promotions, direct mail and email, public relations, sponsorship and personal selling. Through the line: one integrated campaign using both, with social media often bridging them.',
    },
    p.join(''),
  );
}

/* ---------- Distribution channels ---------- */
function channels(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const rows: Array<[string, string[]]> = [
    ['Direct', ['Producer', 'Consumer']],
    ['One intermediary', ['Producer', 'Retailer', 'Consumer']],
    ['Two intermediaries', ['Producer', 'Wholesaler', 'Retailer', 'Consumer']],
    ['Through an agent', ['Producer', 'Agent', 'Wholesaler', 'Retailer', 'Consumer']],
  ];
  rows.forEach(([n, stages], j) => {
    const y = 34 + j * 66;
    p.push(text(16, y + 24, n, { size: 12.5, weight: 700, fill: C.ink }));
    const x0 = 170;
    const step = 540 / 5;
    stages.forEach((s, i) => {
      const last = i === stages.length - 1;
      const x = last ? x0 + 4 * step : x0 + i * step;
      p.push(box(x, y, 92, 38, s, { tone: i === 0 ? 'ink' : last ? 'green' : 'gold', style: i === 0 ? 'solid' : 'wash', size: 12 }));
      if (!last) {
        const nx = i + 1 === stages.length - 1 ? x0 + 4 * step : x0 + (i + 1) * step;
        p.push(line(id, x + 94, y + 19, nx - 2, y + 19, { sw: 1.4, arrow: 'end' }));
      }
    });
  });
  p.push(para(16, 302, 'Each intermediary adds cost but brings reach, storage, selling or local knowledge. Online sales can make even large producers direct sellers.', 118, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Distribution channels',
      desc: 'Four distribution channels from producer to consumer. Direct: producer to consumer. One intermediary: producer to retailer to consumer. Two intermediaries: producer to wholesaler to retailer to consumer. Through an agent: producer to agent to wholesaler to retailer to consumer. Each intermediary adds cost but brings reach, storage, selling or local knowledge, and online sales can make even large producers direct sellers.',
    },
    p.join(''),
  );
}

/* ---------- Branding ---------- */
function branding(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const steps: Array<[string, string]> = [
    ['Brand awareness', 'Customers recognize and recall the brand'],
    ['Brand development', 'Its identity, values and reputation are built up'],
    ['Brand loyalty', 'Customers keep choosing it over rivals'],
    ['Brand value', 'It is worth more than an unbranded product'],
  ];
  steps.forEach(([n, s], i) => {
    const x = 16 + i * 172;
    const y = 200 - i * 48;
    p.push(rect(x, y, 164, 270 - y, { fill: i === 3 ? C.gold : i === 2 ? '#c9a866' : i === 1 ? '#dcc28d' : C.goldWash, stroke: C.gold, sw: 1 }));
    p.push(text(x + 12, y + 24, n, { size: 13, weight: 700, fill: C.ink }));
    p.push(para(x + 12, y + 44, s, 24, { size: 11.5, fill: C.body }));
  });
  p.push(para(16, 294, 'Each step builds on the one before. A strong brand lets a business charge more, launch new products more easily and keep customers when rivals cut prices.', 116, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'From brand awareness to brand value',
      desc: 'A staircase of four steps. Brand awareness: customers recognize and recall the brand. Brand development: its identity, values and reputation are built up. Brand loyalty: customers keep choosing it over rivals. Brand value: it is worth more than an unbranded product. A strong brand lets a business charge more, launch new products more easily and keep customers when rivals cut prices.',
    },
    p.join(''),
  );
}

/* ---------- International marketing ---------- */
function international(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const col = (x: number, title: string, tone: Tone, items: string[]) => {
    const t = TONES[tone];
    p.push(rect(x, 20, 340, 292, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 20, 340, 40, { fill: t.wash, rx: 3 }));
    p.push(text(x + 16, 46, title, { size: 14, weight: 700, serif: true, fill: t.text }));
    items.forEach((s, i) => {
      p.push(circle(x + 22, 82 + i * 38, 3.5, { fill: t.line }));
      p.push(para(x + 34, 86 + i * 38, s, 46, { size: 12, fill: C.body }));
    });
  };
  col(10, 'Opportunities', 'green', ['A larger market and more sales', 'Economies of scale from higher output', 'Spreading risk across several markets', 'Extending a product’s life cycle', 'Access to cheaper resources or new skills', 'A stronger, global brand']);
  col(370, 'Threats', 'signal', ['Cultural and language differences', 'Different laws, politics and regulation', 'Exchange rate changes', 'Trade barriers such as tariffs and quotas', 'Higher costs of transport and communication', 'Local competitors who know the market']);
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Opportunities and threats in international markets',
      desc: 'Two columns. Opportunities of entering and operating in international markets: a larger market and more sales, economies of scale, spreading risk across markets, extending a product’s life cycle, access to cheaper resources or new skills, and a stronger global brand. Threats: cultural and language differences, different laws, politics and regulation, exchange rate changes, trade barriers such as tariffs and quotas, higher costs of transport and communication, and local competitors who know the market.',
    },
    p.join(''),
  );
}

export const UNIT4: Record<string, DiagramDef> = {
  'market-product-orientation': { title: 'Product and market orientation', caption: 'Starting from what the business makes, or from what customers want.', syllabus: ['4.1'], level: 'SL/HL', group: 'unit-4', render: orientation },
  'market-share-growth': { title: 'Market share and market growth', caption: 'Two formulas worked on one fictional market.', syllabus: ['4.1'], level: 'SL/HL', group: 'unit-4', fictional: true, render: marketShare },
  'segmentation-targeting-positioning': { title: 'Segmentation, targeting and positioning', caption: 'The bases of segmentation and the choices that follow.', syllabus: ['4.2'], level: 'SL/HL', group: 'unit-4', render: stp },
  'position-map': { title: 'A position map', caption: 'Brands placed by how customers see them, with a possible gap.', syllabus: ['4.2'], level: 'SL/HL', group: 'unit-4', fictional: true, render: positionMap },
  'market-research-methods': { title: 'Market research methods', caption: 'Primary and secondary, quantitative and qualitative.', syllabus: ['4.4'], level: 'SL/HL', group: 'unit-4', render: research },
  'sampling-methods': { title: 'Three sampling methods', caption: 'Random, quota and convenience samples from one population.', syllabus: ['4.4'], level: 'SL/HL', group: 'unit-4', render: sampling },
  'seven-ps': { title: 'The seven Ps of the marketing mix', caption: 'The four Ps of any product and three more for services.', syllabus: ['4.5'], level: 'SL/HL', group: 'unit-4', render: sevenPs },
  'product-life-cycle': { title: 'The product life cycle, with cash flow', caption: 'Five stages, an extension strategy, and why cash flow lags sales.', syllabus: ['4.5'], level: 'SL/HL', group: 'unit-4', render: plc },
  'promotion-lines': { title: 'Above, below and through the line', caption: 'Mass media, targeted promotion, and campaigns that combine them.', syllabus: ['4.5'], level: 'SL/HL', group: 'unit-4', render: promotion },
  'distribution-channels': { title: 'Distribution channels', caption: 'From direct selling to chains of intermediaries.', syllabus: ['4.5'], level: 'SL/HL', group: 'unit-4', render: channels },
  'brand-development': { title: 'From brand awareness to brand value', caption: 'The four aspects of branding the guide names.', syllabus: ['4.5'], level: 'SL/HL', group: 'unit-4', render: branding },
  'international-marketing': { title: 'International markets: opportunities and threats', caption: 'What a business weighs before entering a new country.', syllabus: ['4.6'], level: 'HL', group: 'unit-4', render: international },
};
