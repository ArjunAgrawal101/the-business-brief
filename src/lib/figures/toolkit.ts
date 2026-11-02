/**
 * Toolkit diagrams: the business management toolkit in the guide (pp. 13 to
 * 15). Worked numbers are computed here from fictional data.
 */
import type { DiagramDef } from '../diagrams';
import { C, TONES, arrowPath, axes, badge, box, circle, fictionNote, frame, legend, line, num, para, plot, poly, rect, sx, sy, text, type Axes, type Tone } from './kit';

/* ---------- SWOT ---------- */
function swot(id: string): string {
  const W = 680;
  const H = 420;
  const p: string[] = [];
  const gx = 110;
  const gy = 50;
  const cw = 280;
  const ch = 160;
  p.push(text(gx + cw / 2, 34, 'Helpful', { size: 12, weight: 700, fill: C.greenText, anchor: 'middle', label: true }));
  p.push(text(gx + cw * 1.5, 34, 'Harmful', { size: 12, weight: 700, fill: C.signalText, anchor: 'middle', label: true }));
  p.push(text(gx - 16, gy + ch / 2, 'Internal', { size: 12, weight: 700, fill: C.ink, anchor: 'end', label: true }));
  p.push(text(gx - 16, gy + ch / 2 + 16, 'the business', { size: 11, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 16, gy + ch * 1.5, 'External', { size: 12, weight: 700, fill: C.ink, anchor: 'end', label: true }));
  p.push(text(gx - 16, gy + ch * 1.5 + 16, 'its environment', { size: 11, fill: C.slate, anchor: 'end' }));
  const cells: Array<[number, number, string, string, string, Tone]> = [
    [0, 0, 'S', 'Strengths', 'What the business does well: skills, brand, finance, assets', 'green'],
    [1, 0, 'W', 'Weaknesses', 'Where it falls short: costs, gaps in skills, cash, reputation', 'signal'],
    [0, 1, 'O', 'Opportunities', 'Openings outside it: new markets, trends, technology, policy', 'cobalt'],
    [1, 1, 'T', 'Threats', 'Dangers outside it: rivals, recession, regulation, changing tastes', 'gold'],
  ];
  for (const [i, j, letter, name, sub, tone] of cells) {
    const t = TONES[tone];
    const x = gx + i * cw;
    const y = gy + j * ch;
    p.push(rect(x, y, cw - 8, ch - 8, { fill: t.wash, stroke: t.line, sw: 1, rx: 3 }));
    p.push(text(x + 18, y + 58, letter, { size: 46, weight: 700, serif: true, italic: true, fill: t.line, }));
    p.push(text(x + 70, y + 36, name, { size: 16, weight: 700, serif: true, fill: t.text }));
    p.push(para(x + 70, y + 58, sub, 28, { size: 12, fill: C.body }));
  }
  p.push(para(gx, H - 36, 'A SWOT is a starting point: it lists factors, and analysis then weighs which matter most for the decision.', 80, { size: 11.5, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'SWOT analysis',
      desc: 'A two by two grid. Internal factors, about the business itself, are strengths, what it does well such as skills, brand, finance and assets, and weaknesses, where it falls short such as costs, gaps in skills, cash or reputation. External factors, about its environment, are opportunities, such as new markets, trends, technology and policy, and threats, such as rivals, recession, regulation and changing tastes. Strengths and opportunities are helpful; weaknesses and threats are harmful. A SWOT lists factors; analysis then weighs which matter most for the decision.',
    },
    p.join(''),
  );
}

/* ---------- STEEPLE ---------- */
function steeple(id: string): string {
  const W = 700;
  const H = 430;
  const p: string[] = [];
  const cx = 350;
  const cy = 222;
  const items: Array<[string, string, string]> = [
    ['S', 'Social', 'Demographics, lifestyles, attitudes'],
    ['T', 'Technological', 'New products, processes, digital change'],
    ['E', 'Economic', 'Growth, inflation, interest and exchange rates'],
    ['E', 'Environmental', 'Climate, resources, pollution, waste'],
    ['P', 'Political', 'Government policy, stability, trade'],
    ['L', 'Legal', 'Employment, consumer and competition law'],
    ['E', 'Ethical', 'What is right: fair pay, honest marketing'],
  ];
  p.push(circle(cx, cy, 64, { fill: C.ink }));
  p.push(text(cx, cy - 6, 'The business', { size: 13, weight: 600, serif: true, fill: C.white, anchor: 'middle' }));
  p.push(text(cx, cy + 12, 'and its decision', { size: 11.5, fill: '#d9d3c4', anchor: 'middle' }));
  items.forEach(([l, n, ex], i) => {
    const a = ((-90 + (360 / items.length) * i) * Math.PI) / 180;
    const x = cx + 250 * Math.cos(a);
    const y = cy + 165 * Math.sin(a);
    p.push(line(id, cx + 66 * Math.cos(a), cy + 66 * Math.sin(a), x - 56 * Math.cos(a), y - 26 * Math.sin(a), { stroke: C.rule, sw: 1 }));
    p.push(rect(x - 92, y - 30, 184, 60, { fill: C.white, stroke: C.gold, sw: 1.1, rx: 3 }));
    p.push(text(x - 80, y + 9, l, { size: 26, weight: 700, serif: true, italic: true, fill: C.gold }));
    p.push(text(x - 54, y - 6, n, { size: 13, weight: 700, fill: C.ink }));
    p.push(para(x - 54, y + 10, ex, 24, { size: 10.5, fill: C.slate }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'STEEPLE analysis',
      desc: 'Seven external factors around a business and its decision. Social: demographics, lifestyles and attitudes. Technological: new products, processes and digital change. Economic: growth, inflation, interest and exchange rates. Environmental: climate, resources, pollution and waste. Political: government policy, stability and trade. Legal: employment, consumer and competition law. Ethical: what is right, such as fair pay and honest marketing.',
    },
    p.join(''),
  );
}

/* ---------- Ansoff matrix ---------- */
function ansoff(id: string): string {
  const W = 660;
  const H = 420;
  const p: string[] = [];
  const gx = 140;
  const gy = 70;
  const cw = 240;
  const ch = 140;
  p.push(text(gx + cw, 24, 'Products', { size: 12, weight: 700, fill: C.ink, anchor: 'middle', label: true }));
  p.push(text(gx + cw / 2, 54, 'Existing', { size: 12.5, weight: 600, fill: C.slate, anchor: 'middle' }));
  p.push(text(gx + cw * 1.5, 54, 'New', { size: 12.5, weight: 600, fill: C.slate, anchor: 'middle' }));
  p.push(text(34, gy + ch, 'Markets', { size: 12, weight: 700, fill: C.ink, anchor: 'middle', label: true, rotate: -90 }));
  p.push(text(gx - 14, gy + ch / 2 + 4, 'Existing', { size: 12.5, weight: 600, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch * 1.5 + 4, 'New', { size: 12.5, weight: 600, fill: C.slate, anchor: 'end' }));
  const cells: Array<[number, number, string, string, Tone]> = [
    [0, 0, 'Market penetration', 'Sell more of what it has to the customers it has: promotion, pricing, loyalty', 'green'],
    [1, 0, 'Product development', 'New products for its existing customers', 'gold'],
    [0, 1, 'Market development', 'Existing products in new markets: new regions, countries or segments', 'gold'],
    [1, 1, 'Diversification', 'New products in new markets: the least familiar ground', 'signal'],
  ];
  for (const [i, j, n, sub, tone] of cells) {
    const t = TONES[tone];
    p.push(rect(gx + i * cw, gy + j * ch, cw - 8, ch - 8, { fill: t.wash, stroke: t.line, sw: 1, rx: 3 }));
    p.push(text(gx + i * cw + 16, gy + j * ch + 32, n, { size: 15, weight: 700, serif: true, fill: t.text }));
    p.push(para(gx + i * cw + 16, gy + j * ch + 54, sub, 30, { size: 12, fill: C.body }));
  }
  p.push(arrowPath(id, `M${gx + 40},${gy + 2 * ch + 22} L${gx + 2 * cw - 20},${gy + 2 * ch + 22}`, { tone: 'signal', sw: 1.6 }));
  p.push(text(gx + cw, gy + 2 * ch + 40, 'Risk rises with each step away from what the business knows', { size: 11.5, weight: 600, fill: C.signalText, anchor: 'middle' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The Ansoff matrix',
      desc: 'A two by two grid of products, existing or new, against markets, existing or new. Market penetration: selling more existing products to existing customers through promotion, pricing and loyalty. Product development: new products for existing customers. Market development: existing products in new markets such as new regions, countries or segments. Diversification: new products in new markets, the least familiar ground. Risk rises with each step away from what the business knows, so diversification is usually the riskiest.',
    },
    p.join(''),
  );
}

/* ---------- BCG matrix ---------- */
function bcg(id: string): string {
  const W = 680;
  const H = 440;
  const p: string[] = [];
  const gx = 130;
  const gy = 60;
  const cw = 240;
  const ch = 150;
  const cells: Array<[number, number, string, string, string, Tone]> = [
    [0, 0, 'Stars', 'High share of a fast-growing market', 'Build: invest to keep the lead', 'gold'],
    [1, 0, 'Question marks', 'Low share of a fast-growing market', 'Invest heavily, or withdraw', 'cobalt'],
    [0, 1, 'Cash cows', 'High share of a slow-growing market', 'Hold or harvest: the cash funds the rest', 'green'],
    [1, 1, 'Dogs', 'Low share of a slow-growing market', 'Divest, unless they serve a purpose', 'slate'],
  ];
  for (const [i, j, n, sub, act, tone] of cells) {
    const t = TONES[tone];
    p.push(rect(gx + i * cw, gy + j * ch, cw - 8, ch - 8, { fill: t.wash, stroke: t.line, sw: 1, rx: 3 }));
    p.push(text(gx + i * cw + 16, gy + j * ch + 32, n, { size: 16, weight: 700, serif: true, fill: t.text }));
    p.push(para(gx + i * cw + 16, gy + j * ch + 54, sub, 32, { size: 12, fill: C.body }));
    p.push(para(gx + i * cw + 16, gy + j * ch + 96, act, 32, { size: 11.5, italic: true, fill: C.slate }));
  }
  p.push(line(id, gx - 16, gy + 2 * ch - 8, gx - 16, gy - 4, { arrow: 'end', sw: 1.4 }));
  p.push(text(gx - 28, gy + ch, 'Market growth rate', { size: 12, weight: 700, fill: C.ink, anchor: 'middle', rotate: -90 }));
  p.push(text(gx - 22, gy + 10, 'High', { size: 11, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 22, gy + 2 * ch - 12, 'Low', { size: 11, fill: C.slate, anchor: 'end' }));
  p.push(line(id, gx + 2 * cw - 8, gy + 2 * ch + 10, gx, gy + 2 * ch + 10, { arrow: 'end', sw: 1.4 }));
  p.push(text(gx + cw, gy + 2 * ch + 30, 'Relative market share (high on the left)', { size: 12, weight: 700, fill: C.ink, anchor: 'middle' }));
  // Cash from the cows to the question marks.
  p.push(arrowPath(id, `M${gx + cw - 30},${gy + ch + 40} C${gx + cw + 30},${gy + ch + 10} ${gx + cw + 40},${gy + ch - 10} ${gx + cw + 60},${gy + ch - 40}`, { tone: 'green', sw: 2 }));
  p.push(text(gx + cw - 34, gy + ch + 30, 'Cash', { size: 11.5, weight: 700, fill: C.greenText, anchor: 'end' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The Boston Consulting Group matrix',
      desc: 'A two by two grid of a product portfolio, with market growth rate on the vertical axis and relative market share on the horizontal axis, high share on the left. Stars have a high share of a fast-growing market; build them by investing to keep the lead. Question marks have a low share of a fast-growing market; invest heavily or withdraw. Cash cows have a high share of a slow-growing market; hold or harvest them, as their cash funds the rest. Dogs have a low share of a slow-growing market; divest unless they serve a purpose. An arrow shows cash flowing from the cash cows to the question marks.',
    },
    p.join(''),
  );
}

/* ---------- Decision tree ---------- */
const TREE = {
  a: { name: 'Open a second store', cost: 200, outcomes: [{ name: 'Success', p: 0.6, v: 500 }, { name: 'Failure', p: 0.4, v: 150 }] },
  b: { name: 'Refurbish the store', cost: 80, outcomes: [{ name: 'High demand', p: 0.7, v: 250 }, { name: 'Low demand', p: 0.3, v: 100 }] },
};
const ev = (o: Array<{ p: number; v: number }>) => o.reduce((s, x) => s + x.p * x.v, 0);

function decisionTree(id: string): string {
  const W = 720;
  const H = 430;
  const p: string[] = [];
  const evA = ev(TREE.a.outcomes);
  const evB = ev(TREE.b.outcomes);
  const netA = evA - TREE.a.cost;
  const netB = evB - TREE.b.cost;
  const best = netA >= netB && netA >= 0 ? 'a' : netB >= 0 ? 'b' : 'none';
  const dx = 56;
  const dy = 214;
  const nx = 304;
  const ox = 540;
  // Decision node.
  p.push(rect(dx - 14, dy - 14, 28, 28, { fill: C.ink }));
  p.push(text(dx - 22, dy + 34, `Choose: $${best === 'a' ? netA : netB}k`, { size: 11.5, weight: 700, fill: C.ink }));
  const branch = (key: 'a' | 'b', ny: number) => {
    const t = TREE[key];
    const e = ev(t.outcomes);
    const pruned = best !== key;
    const col = pruned ? C.muted : C.ink;
    // Out of the decision node, then along to the chance node.
    p.push(`<path d="M${dx + 14},${dy} L${dx + 44},${ny} L${nx - 14},${ny}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`);
    const mx = (dx + 44 + nx - 14) / 2;
    p.push(text(mx, ny - 10, t.name, { size: 12.5, weight: 700, fill: pruned ? C.slate : C.ink, anchor: 'middle' }));
    p.push(text(mx, ny + 20, `Cost −$${t.cost}k`, { size: 11.5, fill: C.signalText, anchor: 'middle' }));
    if (pruned) {
      p.push(line(id, dx + 54, ny + 7, dx + 62, ny - 7, { sw: 2, stroke: C.slate }));
      p.push(line(id, dx + 61, ny + 7, dx + 69, ny - 7, { sw: 2, stroke: C.slate }));
    }
    p.push(circle(nx, ny, 14, { fill: C.gold }));
    p.push(text(nx, ny - 24, `EV $${num(e)}k`, { size: 11.5, weight: 700, fill: C.goldText, anchor: 'middle' }));
    p.push(text(nx + 4, ny + 36, `Net $${num(e)}k − $${t.cost}k = $${num(e - t.cost)}k`, { size: 11.5, weight: 700, fill: C.ink, anchor: 'middle' }));
    t.outcomes.forEach((o, i) => {
      const oy = ny + (i === 0 ? -62 : 62);
      p.push(line(id, nx + 14, ny, ox, oy, { sw: 1.5, stroke: col }));
      const lx = (nx + ox) / 2 + 30;
      const ly = ny + (oy - ny) * ((lx - nx) / (ox - nx));
      p.push(text(lx, ly + (i === 0 ? -10 : 20), `${o.name}  ${o.p}`, { size: 12, fill: C.body, anchor: 'middle' }));
      p.push(poly([[ox, oy], [ox + 12, oy - 8], [ox + 12, oy + 8]], { fill: col }));
      p.push(text(ox + 20, oy + 4, `$${o.v}k`, { size: 12.5, weight: 700, fill: C.ink }));
      p.push(text(ox + 66, oy + 4, `${o.p} × ${o.v} = ${num(o.p * o.v)}`, { size: 11, fill: C.slate }));
    });
  };
  branch('a', 110);
  branch('b', 318);
  p.push(legend(26, H - 12, [{ label: 'Decision', fill: C.ink }, { label: 'Chance', fill: C.gold }]));
  p.push(text(250, H - 12, '//  rejected option', { size: 11.5, fill: C.slate }));
  p.push(fictionNote(W - 12, H - 12, 'Fictional figures, $000. Probabilities are estimates.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A decision tree',
      desc: `A fictional retailer chooses between two options. Opening a second store costs $${TREE.a.cost}k: success, with probability 0.6, returns $500k; failure, with probability 0.4, returns $150k. Its expected value is 0.6 × 500 + 0.4 × 150 = $${num(evA)}k, a net $${num(netA)}k after the cost. Refurbishing the existing store costs $${TREE.b.cost}k: high demand, probability 0.7, returns $250k; low demand, probability 0.3, returns $100k. Its expected value is $${num(evB)}k, a net $${num(netB)}k. On expected value alone the retailer opens the second store, and the refurbishment branch is marked as rejected. Square nodes are decisions, circles are chance events, and the probabilities are estimates.`,
    },
    p.join(''),
  );
}

/* ---------- Force field analysis ---------- */
const FORCES = {
  change: 'Move to a four-day working week',
  driving: [
    ['Better staff retention', 4],
    ['Easier recruitment', 3],
    ['Fewer sick days', 2],
  ] as Array<[string, number]>,
  restraining: [
    ['Clients expect five-day cover', 4],
    ['Rota and scheduling costs', 2],
    ['Managers’ doubts', 2],
  ] as Array<[string, number]>,
};

function forceField(id: string): string {
  const W = 720;
  const H = 380;
  const p: string[] = [];
  const cx = 360;
  const unit = 34;
  const sum = (xs: Array<[string, number]>) => xs.reduce((s, [, v]) => s + v, 0);
  p.push(rect(cx - 58, 30, 116, 260, { fill: C.ink, rx: 3 }));
  p.push(para(cx, 150, FORCES.change, 12, { size: 13, weight: 700, serif: true, fill: C.white, anchor: 'middle', middle: true }));
  p.push(text(cx - 70, 22, 'Driving forces', { size: 12, weight: 700, fill: C.greenText, anchor: 'end', label: true }));
  p.push(text(cx + 70, 22, 'Restraining forces', { size: 12, weight: 700, fill: C.signalText, anchor: 'start', label: true }));
  FORCES.driving.forEach(([n, v], i) => {
    const y = 70 + i * 80;
    const x1 = cx - 60 - v * unit;
    p.push(line(id, x1, y, cx - 62, y, { tone: 'green', sw: 7, arrow: 'end' }));
    p.push(badge(x1 - 16, y, v, { tone: 'green', rad: 11 }));
    p.push(text(cx - 64, y + 24, n, { size: 12, weight: 600, fill: C.ink, anchor: 'end' }));
  });
  FORCES.restraining.forEach(([n, v], i) => {
    const y = 70 + i * 80;
    const x1 = cx + 60 + v * unit;
    p.push(line(id, x1, y, cx + 62, y, { tone: 'signal', sw: 7, arrow: 'end' }));
    p.push(badge(x1 + 16, y, v, { tone: 'signal', rad: 11 }));
    p.push(text(cx + 64, y + 24, n, { size: 12, weight: 600, fill: C.ink }));
  });
  p.push(text(cx - 70, 320, `Total ${sum(FORCES.driving)}`, { size: 14, weight: 700, fill: C.greenText, anchor: 'end' }));
  p.push(text(cx + 70, 320, `Total ${sum(FORCES.restraining)}`, { size: 14, weight: 700, fill: C.signalText }));
  p.push(para(20, 346, 'Each force is scored from 1 (weak) to 5 (strong); the scores are judgements. Here the driving forces narrowly outweigh the restraining ones, so the plan would weaken the strongest restraint, client cover, before going ahead.', 118, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Force field analysis',
      desc: `A fictional design agency considers a proposed change: ${FORCES.change.toLowerCase()}. Driving forces push for it: ${FORCES.driving.map(([n, v]) => `${n.toLowerCase()}, scored ${v}`).join('; ')}, a total of ${sum(FORCES.driving)}. Restraining forces push against it: ${FORCES.restraining.map(([n, v]) => `${n.toLowerCase()}, scored ${v}`).join('; ')}, a total of ${sum(FORCES.restraining)}. Arrow lengths match the scores. The scores are judgements; the driving forces narrowly win, so the plan would weaken the strongest restraint before going ahead.`,
    },
    p.join(''),
  );
}

/* ---------- Gantt chart ---------- */
const GANTT: Array<{ task: string; start: number; weeks: number; tone: Tone }> = [
  { task: 'Find and sign a site', start: 1, weeks: 3, tone: 'ink' },
  { task: 'Arrange finance', start: 2, weeks: 3, tone: 'ink' },
  { task: 'Fit out the café', start: 5, weeks: 5, tone: 'gold' },
  { task: 'Recruit staff', start: 6, weeks: 3, tone: 'cobalt' },
  { task: 'Train staff', start: 9, weeks: 2, tone: 'cobalt' },
  { task: 'Launch marketing', start: 8, weeks: 4, tone: 'green' },
];

function gantt(id: string): string {
  const W = 720;
  const H = 360;
  const p: string[] = [];
  const lx = 170;
  const cw = 44;
  const rh = 38;
  const top = 50;
  for (let w = 1; w <= 12; w++) {
    p.push(rect(lx + (w - 1) * cw, top, cw, rh * (GANTT.length + 1), { fill: w % 2 ? C.white : C.paper, stroke: C.hair, sw: 1 }));
    p.push(text(lx + (w - 0.5) * cw, top - 10, String(w), { size: 11.5, fill: C.slate, anchor: 'middle' }));
  }
  p.push(text(lx, 22, 'Week', { size: 11, weight: 700, fill: C.slate, label: true }));
  GANTT.forEach((g, i) => {
    const y = top + i * rh;
    p.push(text(lx - 12, y + rh / 2 + 4, g.task, { size: 12, weight: 600, fill: C.ink, anchor: 'end' }));
    p.push(rect(lx + (g.start - 1) * cw + 3, y + 9, g.weeks * cw - 6, rh - 18, { fill: TONES[g.tone].line, rx: 3 }));
  });
  const my = top + GANTT.length * rh + rh / 2;
  p.push(text(lx - 12, my + 4, 'Opening day', { size: 12, weight: 700, fill: C.signalText, anchor: 'end' }));
  const mx = lx + 11.5 * cw;
  p.push(poly([[mx, my - 11], [mx + 11, my], [mx, my + 11], [mx - 11, my]], { fill: C.signal }));
  // Dependencies: fitting out waits for the site and the finance.
  p.push(arrowPath(id, `M${lx + 4 * cw - 3},${top + rh * 1.5} L${lx + 4 * cw + 10},${top + rh * 1.5} L${lx + 4 * cw + 10},${top + rh * 2.5} L${lx + 4 * cw + 18},${top + rh * 2.5}`, { tone: 'slate', sw: 1.2 }));
  p.push(para(20, H - 32, 'Bars show when each task runs; overlapping bars run at the same time. The arrow marks a dependency: fitting out cannot start until the finance is in place.', 118, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A Gantt chart',
      desc: `A Gantt chart for opening a fictional café over 12 weeks. ${GANTT.map((g) => `${g.task}: weeks ${g.start} to ${g.start + g.weeks - 1}`).join('. ')}. Opening day is a milestone in week 12. Overlapping bars run at the same time, and an arrow shows that fitting out cannot start until the finance is in place.`,
    },
    p.join(''),
  );
}

/* ---------- Critical path analysis ---------- */
interface Act {
  id: string;
  from: number;
  to: number;
  d: number;
}
const CPA_ACTS: Act[] = [
  { id: 'A', from: 1, to: 2, d: 3 },
  { id: 'B', from: 2, to: 3, d: 4 },
  { id: 'C', from: 2, to: 4, d: 2 },
  { id: 'D', from: 3, to: 5, d: 5 },
  { id: 'E', from: 4, to: 5, d: 3 },
  { id: 'F', from: 5, to: 6, d: 2 },
];

/** Earliest start and latest finish times for each node, by forward and backward passes. */
export function cpa(acts: Act[]) {
  const nodes = [...new Set(acts.flatMap((a) => [a.from, a.to]))].sort((a, b) => a - b);
  const est: Record<number, number> = {};
  const lft: Record<number, number> = {};
  for (const n of nodes) est[n] = Math.max(0, ...acts.filter((a) => a.to === n).map((a) => (est[a.from] ?? 0) + a.d));
  const last = nodes[nodes.length - 1]!;
  for (const n of [...nodes].reverse()) lft[n] = n === last ? est[n]! : Math.min(...acts.filter((a) => a.from === n).map((a) => lft[a.to]! - a.d));
  const floats = acts.map((a) => ({ ...a, total: lft[a.to]! - a.d - est[a.from]!, free: est[a.to]! - a.d - est[a.from]! }));
  return { est, lft, floats, duration: est[last]! };
}

function criticalPath(id: string): string {
  const W = 720;
  const H = 420;
  const p: string[] = [];
  const { est, lft, floats, duration } = cpa(CPA_ACTS);
  const pos: Record<number, [number, number]> = { 1: [50, 150], 2: [190, 150], 3: [350, 70], 4: [350, 230], 5: [510, 150], 6: [660, 150] };
  const R = 28;
  for (const a of floats) {
    const [x1, y1] = pos[a.from]!;
    const [x2, y2] = pos[a.to]!;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const crit = a.total === 0;
    p.push(line(id, x1 + R * Math.cos(ang), y1 + R * Math.sin(ang), x2 - (R + 2) * Math.cos(ang), y2 - (R + 2) * Math.sin(ang), { tone: crit ? 'signal' : 'slate', sw: crit ? 2.6 : 1.5, arrow: 'end' }));
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const off = y2 < y1 ? -12 : y2 > y1 ? 22 : -10;
    p.push(text(mx, my + off, `${a.id} (${a.d})`, { size: 12.5, weight: 700, fill: crit ? C.signalText : C.slate, anchor: 'middle' }));
  }
  for (const n of Object.keys(pos).map(Number)) {
    const [x, y] = pos[n]!;
    p.push(circle(x, y, R, { fill: C.white, stroke: C.ink, sw: 1.6 }));
    p.push(line(id, x, y - R, x, y + R, { sw: 1.2 }));
    p.push(line(id, x, y, x + R, y, { sw: 1.2 }));
    p.push(text(x - R / 2, y + 5, String(n), { size: 14, weight: 700, fill: C.ink, anchor: 'middle' }));
    p.push(text(x + R / 2, y - 7, String(est[n]), { size: 12, weight: 700, fill: C.cobaltText, anchor: 'middle' }));
    p.push(text(x + R / 2, y + 18, String(lft[n]), { size: 12, weight: 700, fill: C.goldText, anchor: 'middle' }));
  }
  // Key.
  const kx = 40;
  const ky = 306;
  p.push(circle(kx + 28, ky + 30, 26, { fill: C.white, stroke: C.ink, sw: 1.4 }));
  p.push(line(id, kx + 28, ky + 4, kx + 28, ky + 56, { sw: 1 }));
  p.push(line(id, kx + 28, ky + 30, kx + 54, ky + 30, { sw: 1 }));
  p.push(text(kx + 15, ky + 34, 'N', { size: 11, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(text(kx + 41, ky + 24, 'EST', { size: 8.5, weight: 700, fill: C.cobaltText, anchor: 'middle' }));
  p.push(text(kx + 41, ky + 46, 'LFT', { size: 8.5, weight: 700, fill: C.goldText, anchor: 'middle' }));
  p.push(para(kx + 66, ky + 18, 'Node number, earliest start time (EST) and latest finish time (LFT). Durations in weeks, in brackets.', 30, { size: 11, fill: C.slate }));
  const crit = floats.filter((a) => a.total === 0).map((a) => a.id);
  const c = floats.find((a) => a.id === 'C')!;
  const e = floats.find((a) => a.id === 'E')!;
  p.push(text(330, ky + 16, `Critical path: ${crit.join(' → ')}, ${duration} weeks`, { size: 13, weight: 700, fill: C.signalText }));
  p.push(text(330, ky + 40, `Activity C: total float ${lft[c.to]} − ${c.d} − ${est[c.from]} = ${c.total}; free float ${est[c.to]} − ${c.d} − ${est[c.from]} = ${c.free}`, { size: 11.5, fill: C.body }));
  p.push(text(330, ky + 60, `Activity E: total float ${lft[e.to]} − ${e.d} − ${est[e.from]} = ${e.total}; free float ${est[e.to]} − ${e.d} − ${est[e.from]} = ${e.free}`, { size: 11.5, fill: C.body }));
  p.push(text(330, ky + 84, 'Critical activities have no float: any delay delays the project.', { size: 11, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A critical path network',
      desc: `A network of six activities between six nodes, each node showing its number, earliest start time and latest finish time. ${floats.map((a) => `Activity ${a.id}, ${a.d} weeks, runs from node ${a.from} to node ${a.to}`).join('; ')}. The critical path is ${crit.join(', ')}, taking ${duration} weeks; its activities have no float. Activity C has a total float of ${c.total} weeks and a free float of ${c.free}. Activity E has a total float of ${e.total} weeks and a free float of ${e.free}.`,
    },
    p.join(''),
  );
}

/* ---------- Porter's generic strategies ---------- */
function porter(id: string): string {
  const W = 660;
  const H = 410;
  const p: string[] = [];
  const gx = 150;
  const gy = 64;
  const cw = 240;
  const ch = 130;
  p.push(text(gx + cw, 22, 'Source of competitive advantage', { size: 12, weight: 700, fill: C.ink, anchor: 'middle', label: true }));
  p.push(text(gx + cw / 2, 50, 'Lower cost', { size: 12.5, weight: 600, fill: C.slate, anchor: 'middle' }));
  p.push(text(gx + cw * 1.5, 50, 'Differentiation', { size: 12.5, weight: 600, fill: C.slate, anchor: 'middle' }));
  p.push(text(34, gy + ch, 'Competitive scope', { size: 12, weight: 700, fill: C.ink, anchor: 'middle', label: true, rotate: -90 }));
  p.push(text(gx - 14, gy + ch / 2, 'Broad', { size: 12.5, weight: 600, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch / 2 + 15, 'whole market', { size: 11, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch * 1.5, 'Narrow', { size: 12.5, weight: 600, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 14, gy + ch * 1.5 + 15, 'one segment', { size: 11, fill: C.slate, anchor: 'end' }));
  const cells: Array<[number, number, string, string, Tone]> = [
    [0, 0, 'Cost leadership', 'The lowest costs in the industry, so it can win on price or earn more at the same price', 'ink'],
    [1, 0, 'Differentiation', 'Something customers value and will pay more for: design, quality, brand, service', 'gold'],
    [0, 1, 'Cost focus', 'The lowest costs in a niche', 'cobalt'],
    [1, 1, 'Differentiation focus', 'A distinctive offer for a niche', 'green'],
  ];
  for (const [i, j, n, sub, tone] of cells) {
    const t = TONES[tone];
    p.push(rect(gx + i * cw, gy + j * ch, cw - 8, ch - 8, { fill: t.wash, stroke: t.line, sw: 1, rx: 3 }));
    p.push(text(gx + i * cw + 16, gy + j * ch + 32, n, { size: 15, weight: 700, serif: true, fill: t.text }));
    p.push(para(gx + i * cw + 16, gy + j * ch + 54, sub, 30, { size: 12, fill: C.body }));
  }
  p.push(rect(gx, gy + 2 * ch + 6, 2 * cw - 8, 50, { fill: C.white, stroke: C.signal, sw: 1, rx: 3, dash: '4 4' }));
  p.push(para(gx + 14, gy + 2 * ch + 27, 'Focus applies one of the two strategies to a niche. A business that commits to none risks being “stuck in the middle”.', 76, { size: 11.5, fill: C.signalText }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Porter’s generic strategies',
      desc: 'A grid of the source of competitive advantage, lower cost or differentiation, against competitive scope, broad or narrow. Cost leadership: the lowest costs in the industry, to win on price or earn more at the same price. Differentiation: something customers value and will pay more for, such as design, quality, brand or service. In a narrow scope, focus applies one of these to a niche, as cost focus or differentiation focus. A business that commits to none risks being stuck in the middle.',
    },
    p.join(''),
  );
}

/* ---------- Hofstede's cultural dimensions ---------- */
function hofstede(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  const dims: Array<[string, string, string, string]> = [
    ['Power distance', 'Low', 'High', 'Acceptance of unequal power'],
    ['Individualism', 'Collectivism', 'Individualism', 'The group first, or the self first'],
    ['Masculinity', 'Femininity', 'Masculinity', 'Care and quality of life, or achievement'],
    ['Uncertainty avoidance', 'Low', 'High', 'Unease with ambiguity and risk'],
    ['Long-term orientation', 'Short term', 'Long term', 'Quick results, or persistence and saving'],
    ['Indulgence', 'Restraint', 'Indulgence', 'Holding back, or acting freely on wishes'],
  ];
  const lx = 232;
  const rx = 500;
  dims.forEach(([n, lo, hi, what], i) => {
    const y = 44 + i * 58;
    p.push(text(20, y + 4, n, { size: 13, weight: 700, fill: C.ink }));
    p.push(para(20, y + 20, what, 30, { size: 10.5, fill: C.slate }));
    p.push(line(id, lx, y, rx, y, { stroke: C.rule, sw: 6 }));
    p.push(circle(lx, y, 5, { fill: C.cobalt }));
    p.push(circle(rx, y, 5, { fill: C.gold }));
    p.push(text(lx, y + 20, lo, { size: 11.5, weight: 600, fill: C.cobaltText, anchor: 'middle' }));
    p.push(text(rx, y + 20, hi, { size: 11.5, weight: 600, fill: C.goldText, anchor: 'middle' }));
  });
  p.push(para(574, 46, 'Each country is scored on each dimension. The scores are national averages: they describe tendencies, not individuals, and they change slowly.', 22, { size: 11.5, fill: C.slate }));
  p.push(para(574, 186, 'Businesses use them to adapt management, marketing and negotiation across cultures.', 22, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Hofstede’s cultural dimensions',
      desc: 'Six scales, each running between two poles. Power distance, low to high: how far people accept that power is shared unequally. Individualism versus collectivism: whether people look after themselves or their group first. Masculinity versus femininity: competition and achievement, or care and quality of life. Uncertainty avoidance, low to high: how uneasy people are with ambiguity and risk. Long-term orientation, short term to long term: tradition and quick results, or saving and persistence. Indulgence versus restraint: how freely people act on their wishes. Countries are scored on each dimension; the scores are national averages that describe tendencies, not individuals.',
    },
    p.join(''),
  );
}

/* ---------- Circular business models ---------- */
function circular(id: string): string {
  const W = 720;
  const H = 440;
  const p: string[] = [];
  const cx = 360;
  const cy = 224;
  const R = 74;
  p.push(circle(cx, cy, R, { fill: C.greenWash, stroke: C.green, sw: 1.2 }));
  // A loop of three arrows: make, use, recover.
  const arc = (a0: number, a1: number) => {
    const r1 = R - 18;
    const x0 = cx + r1 * Math.cos(a0);
    const y0 = cy + r1 * Math.sin(a0);
    const x1 = cx + r1 * Math.cos(a1);
    const y1 = cy + r1 * Math.sin(a1);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  };
  [0, 1, 2].forEach((i) => p.push(arrowPath(id, arc(((-90 + i * 120 + 12) * Math.PI) / 180, ((-90 + (i + 1) * 120 - 12) * Math.PI) / 180), { tone: 'green', sw: 2.2 })));
  p.push(text(cx, cy - 4, 'Keep resources', { size: 12, weight: 700, fill: C.greenText, anchor: 'middle' }));
  p.push(text(cx, cy + 12, 'in use', { size: 12, weight: 700, fill: C.greenText, anchor: 'middle' }));
  const models: Array<[string, string]> = [
    ['Circular supply', 'Inputs that can be regrown, composted or recycled'],
    ['Resource recovery', 'Value captured from waste, scraps and by-products'],
    ['Product life extension', 'Durable design, repair, upgrade and resale'],
    ['Sharing', 'Many users share one item, often through an app'],
    ['Product service system', 'Customers pay for use; the business keeps ownership'],
  ];
  models.forEach(([n, s], i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const x = cx + 220 * Math.cos(a);
    const y = cy + 160 * Math.sin(a);
    p.push(line(id, cx + (R + 4) * Math.cos(a), cy + (R + 4) * Math.sin(a), x - 70 * Math.cos(a), y - 30 * Math.sin(a), { stroke: C.rule, sw: 1 }));
    p.push(box(x - 112, y - 30, 224, 60, n, { tone: 'green', style: 'outline', size: 13, sub: s, subSize: 10.5 }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Circular business models',
      desc: 'The five circular business models the guide names, around a loop that keeps resources in use. Circular supply: inputs that can be regrown, composted or recycled. Resource recovery: value captured from waste, scraps and by-products. Product life extension: durable design, repair, upgrade and resale. Sharing: many users share one item, often through an app. Product service system: customers pay for use while the business keeps ownership.',
    },
    p.join(''),
  );
}

/* ---------- Simple linear regression ---------- */
export const REG = { x: [2, 3, 4, 5, 6, 7, 8, 9], y: [21, 25, 24, 30, 33, 32, 38, 40] };

/** Least-squares line and correlation coefficient. */
export function regression(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  const b = sxy / sxx;
  return { a: my - b * mx, b, r: sxy / Math.sqrt(sxx * syy), mx, my };
}

function linearRegression(id: string): string {
  const W = 700;
  const H = 420;
  const a: Axes = { x: 80, y: 40, w: 500, h: 290, x0: 0, x1: 12, y0: 0, y1: 50 };
  const p: string[] = [];
  const { a: c0, b, r: rr } = regression(REG.x, REG.y);
  p.push(axes(id, a, { xLabel: 'Advertising spend ($000 a month)', yLabel: 'Sales revenue ($000 a month)', xTicks: [0, 2, 4, 6, 8, 10, 12].map((v) => ({ v, label: String(v) })), yTicks: [0, 10, 20, 30, 40, 50].map((v) => ({ v, label: String(v) })), grid: true }));
  const xmin = Math.min(...REG.x);
  const xmax = Math.max(...REG.x);
  p.push(plot(a, [[xmin, c0 + b * xmin], [xmax, c0 + b * xmax]], { stroke: C.cobalt, sw: 2.2 }));
  p.push(plot(a, [[xmax, c0 + b * xmax], [11, c0 + b * 11]], { stroke: C.cobalt, sw: 2, dash: '6 5' }));
  REG.x.forEach((x, i) => p.push(circle(sx(a, x), sy(a, REG.y[i]!), 5, { fill: C.ink, stroke: C.white, sw: 1.5 })));
  const ey = c0 + b * 11;
  p.push(circle(sx(a, 11), sy(a, ey), 5, { fill: C.white, stroke: C.cobalt, sw: 2 }));
  p.push(text(sx(a, 11), sy(a, ey) - 14, `Extrapolated: ${num(ey, 1)}`, { size: 11.5, weight: 600, fill: C.cobaltText, anchor: 'middle' }));
  p.push(text(sx(a, 0.4), sy(a, 47), `Line of best fit: y = ${num(c0, 2)} + ${num(b, 2)}x`, { size: 12.5, weight: 700, fill: C.cobaltText }));
  p.push(text(sx(a, 0.4), sy(a, 47) + 17, `Correlation coefficient r = ${num(rr, 2)}: strong and positive`, { size: 12, fill: C.body }));
  p.push(para(20, H - 34, 'Correlation is not causation. Extrapolating beyond the data assumes the relationship still holds there, which may not be true.', 118, { size: 11, fill: C.slate }));
  p.push(fictionNote(W - 12, 18, 'Fictional data, eight months.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Simple linear regression',
      desc: `A scatter diagram of eight months of fictional data: advertising spend from $2,000 to $9,000 a month against sales revenue from $21,000 to $40,000. The least-squares line of best fit is y = ${num(c0, 2)} + ${num(b, 2)}x, in thousands of dollars, and the correlation coefficient is ${num(rr, 2)}, a strong positive correlation. A dashed extension extrapolates to a spend of $11,000, predicting sales of about $${num(ey, 1)}k. Correlation is not causation, and extrapolation assumes the relationship holds beyond the data.`,
    },
    p.join(''),
  );
}

/* ---------- Descriptive statistics ---------- */
export const STATS_DATA = [12, 15, 15, 18, 20, 21, 23, 26, 28, 31, 42];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** Mean, median, mode, quartiles (medians of the lower and upper halves) and standard deviation. */
export function describeData(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const mean = s.reduce((t, v) => t + v, 0) / n;
  const half = Math.floor(n / 2);
  const lower = s.slice(0, half);
  const upper = s.slice(n % 2 ? half + 1 : half);
  const counts = new Map<number, number>();
  s.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const top = Math.max(...counts.values());
  const modes = [...counts].filter(([, c]) => c === top && top > 1).map(([v]) => v);
  const sd = Math.sqrt(s.reduce((t, v) => t + (v - mean) ** 2, 0) / n);
  return { n, mean, median: median(s), q1: median(lower), q3: median(upper), modes, sd, min: s[0]!, max: s[n - 1]! };
}

function descriptive(id: string): string {
  const W = 720;
  const H = 340;
  const p: string[] = [];
  const d = describeData(STATS_DATA);
  const a: Axes = { x: 50, y: 60, w: 620, h: 150, x0: 10, x1: 45, y0: 0, y1: 4 };
  const base = sy(a, 0);
  p.push(line(id, a.x, base, a.x + a.w + 6, base, { sw: 1.4, arrow: 'end' }));
  for (let v = 10; v <= 45; v += 5) {
    p.push(line(id, sx(a, v), base, sx(a, v), base + 5, { sw: 1 }));
    p.push(text(sx(a, v), base + 19, String(v), { size: 11, fill: C.slate, anchor: 'middle' }));
  }
  p.push(text(a.x + a.w + 6, base + 38, 'Units sold a week', { size: 12, weight: 600, fill: C.ink, anchor: 'end' }));
  // Box from Q1 to Q3 with the median, above the dots.
  const by = 72;
  p.push(rect(sx(a, d.q1), by, sx(a, d.q3) - sx(a, d.q1), 34, { fill: C.goldWash, stroke: C.gold, sw: 1.4 }));
  p.push(line(id, sx(a, d.median), by, sx(a, d.median), by + 34, { stroke: C.ink, sw: 2.4 }));
  p.push(line(id, sx(a, d.min), by + 17, sx(a, d.q1), by + 17, { stroke: C.slate, sw: 1.2 }));
  p.push(line(id, sx(a, d.q3), by + 17, sx(a, d.max), by + 17, { stroke: C.slate, sw: 1.2 }));
  p.push(text(sx(a, d.q1), by - 8, `Q1 ${d.q1}`, { size: 11.5, weight: 700, fill: C.goldText, anchor: 'middle' }));
  p.push(text(sx(a, d.median), by - 8, `Median ${d.median}`, { size: 11.5, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(text(sx(a, d.q3), by - 8, `Q3 ${d.q3}`, { size: 11.5, weight: 700, fill: C.goldText, anchor: 'middle' }));
  // Dots, stacked where values repeat.
  const seen = new Map<number, number>();
  for (const v of STATS_DATA) {
    const k = seen.get(v) ?? 0;
    seen.set(v, k + 1);
    p.push(circle(sx(a, v), base - 12 - k * 18, 7, { fill: d.modes.includes(v) ? C.cobalt : C.ink, stroke: C.white, sw: 1.5 }));
  }
  // Mean marker.
  p.push(poly([[sx(a, d.mean), base - 2], [sx(a, d.mean) - 7, base + 10], [sx(a, d.mean) + 7, base + 10]], { fill: C.signal }));
  p.push(text(sx(a, d.mean) + 10, base + 32, `Mean ${num(d.mean, 1)}`, { size: 11.5, weight: 700, fill: C.signalText }));
  const facts = [
    `Mean ${num(d.mean, 2)}: the total of the values divided by how many there are (${d.n})`,
    `Median ${d.median}: the middle value in order`,
    `Mode ${d.modes.join(', ')}: the most frequent value (blue)`,
    `Interquartile range ${d.q3} − ${d.q1} = ${d.q3 - d.q1}; range ${d.max} − ${d.min} = ${d.max - d.min}`,
    `Standard deviation ${num(d.sd, 2)}: the typical distance of a value from the mean`,
  ];
  facts.forEach((f, i) => p.push(text(50, 262 + i * 15, f, { size: 11.5, fill: C.body })));
  p.push(text(W - 12, H - 6, 'Fictional data. Quartiles as medians of each half; standard deviation of the whole set.', { size: 10, italic: true, fill: C.slate, anchor: 'end' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Descriptive statistics on one data set',
      desc: `A dot plot of ${d.n} weeks of fictional sales: ${STATS_DATA.join(', ')} units. Above it, a box runs from the lower quartile, ${d.q1}, to the upper quartile, ${d.q3}, with the median, ${d.median}, marked inside. The mean is ${num(d.mean, 2)}, pulled above the median by the one high week of ${d.max}. The mode is ${d.modes.join(', ')}. The interquartile range is ${d.q3 - d.q1}, the range is ${d.max - d.min}, and the standard deviation is ${num(d.sd, 2)}. Quartiles here are the medians of the lower and upper halves; other methods give slightly different values.`,
    },
    p.join(''),
  );
}

export const TOOLKIT: Record<string, DiagramDef> = {
  swot: { title: 'SWOT analysis', caption: 'Internal strengths and weaknesses, external opportunities and threats.', syllabus: ['1.3', '1.5', '4.2'], level: 'SL/HL', group: 'toolkit', render: swot },
  steeple: { title: 'STEEPLE analysis', caption: 'Seven kinds of external factor that bear on a decision.', syllabus: ['1.5', '2.1', '4.6'], level: 'SL/HL', group: 'toolkit', render: steeple },
  'ansoff-matrix': { title: 'The Ansoff matrix', caption: 'Four growth strategies, and the risk each carries.', syllabus: ['1.5', '4.2'], level: 'SL/HL', group: 'toolkit', render: ansoff },
  'bcg-matrix': { title: 'The BCG matrix', caption: 'A product portfolio by market growth and relative market share.', syllabus: ['4.5', '3.7'], level: 'SL/HL', group: 'toolkit', render: bcg },
  'decision-tree': { title: 'A decision tree', caption: 'Expected values for two options, with the rejected branch marked.', syllabus: ['1.5', '5.4'], level: 'SL/HL', group: 'toolkit', fictional: true, render: decisionTree },
  'descriptive-statistics': { title: 'Descriptive statistics', caption: 'Mean, median, mode, quartiles and standard deviation on one data set.', syllabus: ['4.4', '2.4'], level: 'SL/HL', group: 'toolkit', fictional: true, render: descriptive },
  'circular-business-models': { title: 'Circular business models', caption: 'The five models the guide names.', syllabus: ['1.1', '5.3'], level: 'SL/HL', group: 'toolkit', render: circular },
  'force-field': { title: 'Force field analysis', caption: 'Driving and restraining forces, scored and weighed.', syllabus: ['2.1', '2.3', '1.5'], level: 'HL', group: 'toolkit', fictional: true, render: forceField },
  'gantt-chart': { title: 'A Gantt chart', caption: 'Tasks against time, with overlaps, a dependency and a milestone.', syllabus: ['5.1', '4.2'], level: 'HL', group: 'toolkit', fictional: true, render: gantt },
  'critical-path': { title: 'A critical path network', caption: 'Earliest start and latest finish times, the critical path, total and free float.', syllabus: ['5.1', '5.6'], level: 'HL', group: 'toolkit', fictional: true, render: criticalPath },
  'porters-generic-strategies': { title: 'Porter’s generic strategies', caption: 'Cost leadership, differentiation and focus.', syllabus: ['1.3', '4.2'], level: 'HL', group: 'toolkit', render: porter },
  'hofstede-dimensions': { title: 'Hofstede’s cultural dimensions', caption: 'Six scales for comparing national cultures.', syllabus: ['2.5', '4.6'], level: 'HL', group: 'toolkit', render: hofstede },
  'linear-regression': { title: 'Simple linear regression', caption: 'A scatter diagram, the line of best fit, correlation and extrapolation.', syllabus: ['4.3'], level: 'HL', group: 'toolkit', fictional: true, render: linearRegression },
};
