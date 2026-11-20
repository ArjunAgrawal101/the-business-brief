/**
 * Units 4 and 5 diagrams a reader can switch, explore or compare: one market
 * segmented four ways (4.2), extension strategies on the product life cycle
 * (4.5), the operations methods side by side (5.2), the approaches to quality
 * (5.3) and a process before and after lean production (5.3). Each has a
 * layout for phones.
 */
import type { DiagramDef, DiagramPanel, DiagramPart, DiagramState } from '../diagrams';
import { LEAN_PROCESS, flowSummary, type ProcessStep, type StepKind } from '../figure-models';
import { C, NW, TONES, arrowPath, charsFor, circle, frame, line, para, part, poly, rect, smooth, text, wrap, type RenderOpts, type Tone } from './kit';

const lines = (s: string, width: number, size: number, lh = size * 1.3) => {
  const l = wrap(s, charsFor(width, size));
  return { lines: l, h: l.length * lh };
};
const n1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toLocaleString('en-GB', { maximumFractionDigits: 1 }));

/* ------------------------------------------------------------------ */
/* One market, four ways to segment it (4.2)                            */
/* ------------------------------------------------------------------ */

interface Segment {
  label: string;
  count: number;
  need: string;
  target?: string;
  /** Drinks each customer in the segment buys in a month, where the basis is usage. */
  perMonth?: number;
}

/** A segment's share of the drinks sold, from how many customers it has and how much each buys. */
export function volumeShare(segments: Segment[], i: number): number {
  const total = segments.reduce((sum, x) => sum + x.count * (x.perMonth ?? 0), 0);
  const seg = segments[i]!;
  return total > 0 ? ((seg.count * (seg.perMonth ?? 0)) / total) * 100 : 0;
}

interface Basis {
  id: string;
  label: string;
  question: string;
  segments: Segment[];
  note: string;
}

const MARKET_SIZE = 48;

const BASES: Basis[] = [
  {
    id: 'demographic',
    label: 'Demographic: age',
    question: 'How old are they?',
    segments: [
      { label: 'Under 25', count: 18, need: 'Bold flavours, a low price', target: 'A mass of young buyers, reached through social media' },
      { label: '25 to 44', count: 20, need: 'Convenience, recovery after exercise' },
      { label: '45 and over', count: 10, need: 'Less sugar, health claims they trust' },
    ],
    note: 'Age is easy to measure and to reach through media, but people of the same age can want very different things.',
  },
  {
    id: 'geographic',
    label: 'Geographic: where they live',
    question: 'Where do they live?',
    segments: [
      { label: 'City', count: 24, need: 'Bought on the go, from shops and machines', target: 'Half the market, in one set of outlets' },
      { label: 'Suburbs', count: 16, need: 'Bought in bulk at the supermarket' },
      { label: 'Rural', count: 8, need: 'Long shelf life, few outlets nearby' },
    ],
    note: 'Where customers live decides the channels that reach them, but says little about why they buy.',
  },
  {
    id: 'psychographic',
    label: 'Psychographic: lifestyle',
    question: 'How do they live?',
    segments: [
      { label: 'Competitive athletes', count: 8, need: 'Performance: electrolytes and proven results', target: 'A niche that will pay a premium' },
      { label: 'Fitness regulars', count: 22, need: 'Taste and value after the gym' },
      { label: 'Health-conscious, rarely exercise', count: 18, need: 'Low sugar, natural ingredients' },
    ],
    note: 'Lifestyle explains why people buy, but it is harder to measure: it comes from research such as surveys and interviews.',
  },
  {
    id: 'behavioural',
    label: 'Behavioural: how often they buy',
    question: 'How often do they buy?',
    segments: [
      { label: 'Daily', count: 9, perMonth: 30, need: 'Multipacks, subscriptions, loyalty rewards', target: 'Few buyers, but most of the drinks sold' },
      { label: 'Weekly', count: 21, perMonth: 4, need: 'Reminders and offers to buy more often' },
      { label: 'Now and then', count: 18, perMonth: 1, need: 'Reasons to try it, in the right place' },
    ],
    note: 'Usage shows who matters most to sales: daily buyers drink about 30 a month, weekly buyers 4 and occasional buyers 1.',
  },
];

const SEG_STATES: DiagramState[] = BASES.map((b) => ({ id: b.id, label: b.label, note: b.note }));
const SEG_ALT = 'The same 48 fictional customers grouped into segments four ways: by age, by where they live, by lifestyle and by how often they buy, with one possible target segment marked for each.';

/** The dots of a segment, in rows. */
function dots(x: number, y: number, n: number, perRow: number, gap: number, rad: number, fill: string): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(circle(x + (i % perRow) * gap, y + Math.floor(i / perRow) * gap, rad, { fill }));
  return out.join('');
}

function segmentState(id: string, bid: string, narrow: boolean): string {
  const b = BASES.find((x) => x.id === bid) ?? BASES[0]!;
  const desc = `Quenchwell, a fictional maker of sports drinks, surveys ${MARKET_SIZE} customers and groups them by ${b.label.toLowerCase()}. ${b.segments
    .map((s, i) => `${s.label}: ${s.count} customers, ${Math.round((s.count / MARKET_SIZE) * 100)}%${s.perMonth ? `, buying ${Math.round(volumeShare(b.segments, i))}% of the drinks` : ''}, who want ${s.need.charAt(0).toLowerCase()}${s.need.slice(1)}${s.target ? `; a possible target: ${s.target.toLowerCase()}` : ''}`)
    .join('. ')}. ${b.note}`;
  const p: string[] = [];
  if (!narrow) {
    const W = 720;
    const cw = 228;
    const gap = 18;
    let maxH = 0;
    b.segments.forEach((s, i) => {
      const x = i * (cw + gap);
      const per = 8;
      const rowsN = Math.ceil(s.count / per);
      const nl = lines(s.need, cw - 24, 13, 16.5);
      const ll = lines(s.label, cw - 24, 14, 17);
      const share = s.perMonth ? `; ${Math.round(volumeShare(b.segments, i))}% of the drinks sold` : '';
      const cl = lines(`${s.count} of ${MARKET_SIZE} customers, ${Math.round((s.count / MARKET_SIZE) * 100)}%${share}`, cw - 24, 13, 16);
      const top = 54 + ll.h + cl.h;
      const h = top - 30 + rowsN * 20 + 12 + nl.h + (s.target ? 52 : 14);
      maxH = Math.max(maxH, h);
      const t = s.target;
      p.push(rect(x, 30, cw, h, { fill: t ? C.goldWash : C.white, stroke: t ? C.gold : C.rule, sw: t ? 2 : 1.2, rx: 3 }));
      p.push(text(x + 12, 52, ll.lines.join('\n'), { size: 14, weight: 700, fill: C.ink, lh: 17 }));
      p.push(text(x + 12, 52 + ll.h + 2, cl.lines.join('\n'), { size: 13, fill: C.slate, lh: 16 }));
      p.push(dots(x + 20, top + 10, s.count, per, 20, 6.5, t ? C.goldText : C.ink));
      const ny = top + 10 + rowsN * 20 + 8;
      p.push(text(x + 12, ny, nl.lines.join('\n'), { size: 13, fill: C.body, lh: 16.5 }));
      if (t) {
        const tl = lines(`Possible target: ${t}`, cw - 24, 13, 16.5);
        p.push(text(x + 12, ny + nl.h + 12, tl.lines.join('\n'), { size: 13, weight: 700, fill: C.goldText, lh: 16.5 }));
      }
    });
    p.push(text(0, 18, `${b.question} Each dot is one customer.`, { size: 13, weight: 600, fill: C.ink }));
    const H = 30 + maxH + 40;
    p.push(para(0, H - 18, `${b.note} Quenchwell and its customers are fictional.`, 116, { size: 13, italic: true, fill: C.slate, lh: 16 }));
    return frame({ id, w: W, h: H, title: `One market segmented by ${b.label.toLowerCase()}`, alt: SEG_ALT, desc }, p.join(''));
  }
  let y = 0;
  const q = lines(`${b.question} Each dot is one customer.`, NW, 14, 18);
  p.push(text(0, 15, q.lines.join('\n'), { size: 14, weight: 600, fill: C.ink, lh: 18 }));
  y = q.h + 12;
  b.segments.forEach((s, i) => {
    const t = s.target;
    const per = 12;
    const rowsN = Math.ceil(s.count / per);
    const nl = lines(s.need, NW - 20, 14, 18);
    const tl = t ? lines(`Possible target: ${t}`, NW - 20, 14, 18) : { lines: [], h: 0 };
    const share = s.perMonth ? `, ${Math.round(volumeShare(b.segments, i))}% of drinks` : '';
    const hl = lines(`${s.label}: ${s.count} (${Math.round((s.count / MARKET_SIZE) * 100)}%)${share}`, NW - 20, 14, 18);
    const h = 30 + hl.h + rowsN * 22 + nl.h + (t ? tl.h + 10 : 0) + 8;
    p.push(rect(0, y, NW, h, { fill: t ? C.goldWash : C.white, stroke: t ? C.gold : C.rule, sw: t ? 2 : 1.2, rx: 3 }));
    p.push(text(10, y + 20, hl.lines.join('\n'), { size: 14, weight: 700, fill: C.ink, lh: 18 }));
    p.push(dots(20, y + 22 + hl.h, s.count, per, 22, 7, t ? C.goldText : C.ink));
    const ny = y + 22 + hl.h + rowsN * 22 + 4;
    p.push(text(10, ny, nl.lines.join('\n'), { size: 14, fill: C.body, lh: 18 }));
    if (t) p.push(text(10, ny + nl.h + 8, tl.lines.join('\n'), { size: 14, weight: 700, fill: C.goldText, lh: 18 }));
    y += h + 10;
  });
  const H = y + 4;
  return frame({ id, w: NW, h: H, title: `One market segmented by ${b.label.toLowerCase()}`, alt: SEG_ALT, desc }, p.join(''));
}

/** All four bases on one sheet, for the download and print. */
function segmentSheet(id: string): string {
  const pieces = BASES.map((b, i) => {
    const svg = segmentState(`${id}-${i}`, b.id, false);
    return { b, inner: svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title[^>]*>[\s\S]*?<\/title><desc[^>]*>[\s\S]*?<\/desc>/, ''), h: Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)?.[1] ?? 300) };
  });
  let y = 0;
  const body = pieces
    .map(({ b, inner, h }) => {
      const g = `<g transform="translate(0 ${y})">${text(0, 20, b.label, { size: 18, weight: 700, serif: true, fill: C.ink })}<g transform="translate(0 32)">${inner}</g></g>`;
      y += h + 52;
      return g;
    })
    .join('');
  return frame(
    {
      id,
      w: 720,
      h: y,
      title: 'One market, four ways to segment it',
      alt: SEG_ALT,
      desc: `Quenchwell, a fictional maker of sports drinks, surveys ${MARKET_SIZE} customers and segments them four ways. ${BASES.map((b) => `${b.label}: ${b.segments.map((s) => `${s.label.toLowerCase()} ${s.count}`).join(', ')}.`).join(' ')} The same customers fall into different groups depending on the basis, and each basis suggests a different target.`,
    },
    body,
  );
}

/* ------------------------------------------------------------------ */
/* Extension strategies on the product life cycle (4.5)                  */
/* ------------------------------------------------------------------ */

const PLC_PARTS: DiagramPart[] = [
  { id: 'introduction', label: 'Introduction', text: 'Sales start slowly while customers learn about the product. Promotion is heavy and cash flow is negative: the product has not yet paid for its development.', code: '4.5' },
  { id: 'growth', label: 'Growth', text: 'Sales rise fast as the product catches on and rivals arrive. Cash flow turns positive.', code: '4.5' },
  { id: 'maturity', label: 'Maturity', text: 'Sales level off as the market saturates. Profit and cash flow are usually at their highest: the time to plan an extension, before decline sets in.', code: '4.5' },
  { id: 'decline', label: 'Decline', text: 'Without action, sales fall as tastes change or better products appear. The business must choose to extend, replace or withdraw the product.', code: '4.5' },
  { id: 'new-markets', label: 'New markets', text: 'Sell the product to new segments or in new countries: market development in the Ansoff matrix.', code: '4.5' },
  { id: 'new-uses', label: 'New uses', text: 'Find and promote new ways to use the product, so existing customers buy more and new ones start.', code: '4.5' },
  { id: 'new-versions', label: 'New versions or features', text: 'Update the product or add features, sizes or flavours so it feels new: costly, but it can renew interest strongly.', code: '4.5' },
  { id: 'new-packaging', label: 'New packaging or design', text: 'A fresh look or more convenient packs: cheap, but a purely cosmetic change may not convince customers for long.', code: '4.5' },
  { id: 'price', label: 'Price changes', text: 'Cut the price or offer better value to win buyers who are sensitive to price: quick, but it cuts margins and can cheapen the brand.', code: '4.5' },
  { id: 'promotion', label: 'New promotion or channels', text: 'A new campaign for a different segment, or selling through new channels such as online marketplaces.', code: '4.5' },
];

const PLC_DESC = 'Sales over time through introduction, growth, maturity and decline. Late in maturity the curve splits: a dashed line shows sales falling into decline without action, and a solid line shows sales renewed by an extension strategy. Six extension strategies are listed beside the turning point: new markets, new uses, new versions or features, new packaging or design, price changes, and new promotion or channels. Extensions work best while the product is still in maturity, cost less than a new product and keep a profitable product earning the cash that funds new ones, but no extension lasts for ever.';
const PLC_ALT = 'A product life cycle curve that splits in late maturity into a decline without action and a renewed rise with an extension strategy, with six extension strategies listed beside it.';

function plcExtension(id: string, o: RenderOpts | undefined, narrow: boolean): string {
  const p: string[] = [];
  const W = narrow ? NW : 720;
  const px = narrow ? 8 : 20;
  const pw = narrow ? NW - 16 : 420;
  const py = narrow ? 28 : 40;
  const ph = narrow ? 170 : 250;
  const X = (t: number) => px + (t / 10) * pw;
  const Y = (s: number) => py + ph - (s / 100) * ph;
  // The curve: slow start, fast growth, a plateau, then the split.
  const base: Array<[number, number]> = [
    [0, 2],
    [1.2, 8],
    [2.4, 30],
    [3.6, 62],
    [4.8, 80],
    [6, 84],
    [6.8, 82],
  ];
  const decline: Array<[number, number]> = [
    [6.8, 82],
    [7.8, 66],
    [8.8, 42],
    [9.8, 24],
  ];
  const renewed: Array<[number, number]> = [
    [6.8, 82],
    [7.6, 88],
    [8.5, 93],
    [9.8, 90],
  ];
  const toXY = (pts: Array<[number, number]>) => pts.map(([t, s]) => [X(t), Y(s)] as [number, number]);
  p.push(line(id, px, py + ph, px + pw + 8, py + ph, { sw: 1.4, arrow: 'end' }));
  p.push(line(id, px, py + ph, px, py - 10, { sw: 1.4, arrow: 'end' }));
  p.push(text(px + 6, py - 14, 'Sales', { size: narrow ? 14 : 13, weight: 600, fill: C.ink }));
  p.push(text(px + pw, py + ph - 8, 'Time', { size: narrow ? 14 : 13, weight: 600, fill: C.ink, anchor: 'end' }));
  p.push(`<path d="${smooth(toXY(base))}" fill="none" stroke="${C.ink}" stroke-width="2.6"/>`);
  p.push(`<path d="${smooth(toXY(decline))}" fill="none" stroke="${C.slate}" stroke-width="2.2" stroke-dasharray="6 5"/>`);
  p.push(`<path d="${smooth(toXY(renewed))}" fill="none" stroke="${C.cobalt}" stroke-width="2.6"/>`);
  p.push(text(X(8.6), Y(24) + 4, narrow ? 'no action' : 'Without action', { size: narrow ? 14 : 13, weight: 600, fill: C.slate, anchor: 'end' }));
  p.push(text(X(9.8), Y(90) - 10, narrow ? 'extended' : 'With an extension', { size: narrow ? 14 : 13, weight: 700, fill: C.cobaltText, anchor: 'end' }));
  // Stages, as parts.
  const stages: Array<[string, number, number]> = [
    ['introduction', 0, 1.8],
    ['growth', 1.8, 4.6],
    ['maturity', 4.6, 6.8],
    ['decline', 6.8, 10],
  ];
  stages.forEach(([sid, a, b], i) => {
    if (i) p.push(line(id, X(a), py, X(a), py + ph, { stroke: C.hair, sw: 1, dash: '3 3' }));
    const label = PLC_PARTS.find((x) => x.id === sid)!.label;
    const short = narrow ? label.slice(0, sid === 'introduction' ? 5 : sid === 'maturity' ? 6 : 7).replace(/\.$/, '') + (sid === 'introduction' || sid === 'maturity' ? '.' : '') : label;
    const lab = narrow ? { introduction: 'Intro', growth: 'Growth', maturity: 'Maturity', decline: 'Decline' }[sid]! : short;
    p.push(part(o, sid, label, [X(a) + 1, py + ph + 2, X(b) - X(a) - 2, narrow ? 30 : 28], text((X(a) + X(b)) / 2, py + ph + (narrow ? 22 : 20), lab, { size: narrow ? 14 : 13, weight: 600, fill: C.ink, anchor: 'middle' })));
  });
  // The turning point, where an extension is applied.
  p.push(circle(X(6.8), Y(82), 6, { fill: C.gold, stroke: C.white, sw: 1.5 }));
  p.push(text(X(6.8) - 8, Y(82) - 14, 'Extend here', { size: narrow ? 14 : 13, weight: 700, fill: C.goldText, anchor: 'end' }));
  const strategies = PLC_PARTS.slice(4);
  if (!narrow) {
    const sx = 476;
    p.push(text(sx, 30, 'Extension strategies', { size: 13, weight: 700, fill: C.goldText, label: true }));
    strategies.forEach((s, i) => {
      const y = 44 + i * 44;
      const inner = rect(sx, y, W - sx, 36, { fill: C.white, stroke: C.gold, sw: 1.2, rx: 3 }) + text(sx + 12, y + 23, s.label, { size: 13.5, weight: 700, fill: C.ink });
      p.push(part(o, s.id, s.label, [sx - 2, y - 2, W - sx + 2, 40], inner));
    });
    p.push(para(0, 360, 'Extend while the product is still in maturity: it costs less than a new product and keeps a cash cow earning, but no extension lasts for ever.', 112, { size: 13, italic: true, fill: C.slate, lh: 16 }));
    return frame({ id, w: W, h: 392, title: 'Extension strategies on the product life cycle', alt: PLC_ALT, desc: PLC_DESC, interactive: Boolean(o?.link) }, p.join(''));
  }
  let y = py + ph + 50;
  p.push(text(0, y, 'Extension strategies', { size: 14, weight: 700, fill: C.goldText, label: true }));
  y += 12;
  strategies.forEach((s) => {
    const inner = rect(0, y, NW, 34, { fill: C.white, stroke: C.gold, sw: 1.2, rx: 3 }) + text(12, y + 22, s.label, { size: 14, weight: 700, fill: C.ink });
    p.push(part(o, s.id, s.label, [0, y, NW, 34], inner));
    y += 40;
  });
  const n = lines('Extend while the product is still in maturity; no extension lasts for ever.', NW, 14, 18);
  p.push(text(0, y + 12, n.lines.join('\n'), { size: 14, italic: true, fill: C.slate, lh: 18 }));
  return frame({ id, w: NW, h: y + n.h + 18, title: 'Extension strategies on the product life cycle', alt: PLC_ALT, desc: PLC_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

/* ------------------------------------------------------------------ */
/* Operations methods, two at a time (5.2)                              */
/* ------------------------------------------------------------------ */

interface Method {
  id: string;
  label: string;
  caption: string;
  facts: Array<[string, string]>;
}

const METHODS: Method[] = [
  {
    id: 'job',
    label: 'Job production',
    caption: 'One unique item at a time, made to the customer’s order',
    facts: [
      ['Volume', 'One, or a very few'],
      ['Variety', 'Every item different'],
      ['Cost per unit', 'High'],
      ['Labour', 'Highly skilled, doing many tasks'],
      ['Flexibility', 'Very high'],
      ['Example', 'A wedding dress, a bridge, a website'],
    ],
  },
  {
    id: 'batch',
    label: 'Batch production',
    caption: 'Groups of identical items move together from stage to stage',
    facts: [
      ['Volume', 'Medium'],
      ['Variety', 'Some: each batch can differ'],
      ['Cost per unit', 'Medium'],
      ['Labour', 'Semi-skilled'],
      ['Flexibility', 'Medium: machines are reset between batches'],
      ['Example', 'Bread baked in batches of one type, then another'],
    ],
  },
  {
    id: 'flow',
    label: 'Mass or flow production',
    caption: 'Identical items move continuously along a production line',
    facts: [
      ['Volume', 'Very high'],
      ['Variety', 'Little or none'],
      ['Cost per unit', 'Low: economies of scale'],
      ['Labour', 'Repetitive tasks, or automated'],
      ['Flexibility', 'Low: a costly line built for one product'],
      ['Example', 'Soft drinks, light bulbs, screws'],
    ],
  },
  {
    id: 'customization',
    label: 'Mass customization',
    caption: 'A flowing line with flexible stages, so each item can be made to order',
    facts: [
      ['Volume', 'High'],
      ['Variety', 'High: each customer’s choice'],
      ['Cost per unit', 'Low to medium'],
      ['Labour', 'Skilled, working with flexible technology'],
      ['Flexibility', 'High, within a set range of options'],
      ['Example', 'Trainers or laptops built to a customer’s choices'],
    ],
  },
];

const METHOD_PANELS: DiagramPanel[] = METHODS.map((m) => ({ id: m.id, label: m.label, facts: m.facts }));

function item(shape: number, x: number, y: number, fill: string): string {
  if (shape === 1) return rect(x - 7, y - 7, 14, 14, { fill });
  if (shape === 2) return poly([[x, y - 8], [x + 8, y + 7], [x - 8, y + 7]], { fill });
  return circle(x, y, 7, { fill });
}

function methodPanel(id: string, mid: string): string {
  const m = METHODS.find((x) => x.id === mid) ?? METHODS[0]!;
  const p: string[] = [];
  const st = [10, 110, 210];
  const sy = 40;
  const sw = 80;
  const sh = 54;
  const stations = ['Cut', 'Assemble', 'Finish'];
  stations.forEach((s, i) => {
    p.push(rect(st[i]!, sy, sw, sh, { fill: C.paper, stroke: C.ink, sw: 1.2, rx: 3 }));
    p.push(text(st[i]! + sw / 2, sy + sh + 20, s, { size: 14, weight: 600, fill: C.ink, anchor: 'middle' }));
  });
  if (m.id === 'job') {
    p.push(item(2, st[1]! + sw / 2, sy + sh / 2, C.gold));
    p.push(arrowPath(id, `M${st[0]! + 40},${sy - 6} C${st[0]! + 40},${sy - 20} ${st[2]! + 40},${sy - 20} ${st[2]! + 40},${sy - 6}`, { tone: 'gold', sw: 1.8 }));
    p.push(text(NW / 2, 12, 'one skilled worker, every stage', { size: 14, italic: true, fill: C.goldText, anchor: 'middle' }));
  } else if (m.id === 'batch') {
    for (let k = 0; k < 4; k++) p.push(item(1, st[0]! + 22 + (k % 2) * 36, sy + 16 + Math.floor(k / 2) * 22, C.ink));
    for (let k = 0; k < 4; k++) p.push(item(0, st[1]! + 22 + (k % 2) * 36, sy + 16 + Math.floor(k / 2) * 22, C.slate));
    p.push(line(id, st[0]! + sw + 2, sy + sh / 2, st[1]! - 2, sy + sh / 2, { sw: 1.6, arrow: 'end' }));
    p.push(line(id, st[1]! + sw + 2, sy + sh / 2, st[2]! - 2, sy + sh / 2, { sw: 1.6, arrow: 'end' }));
    p.push(text(NW / 2, 14, 'a batch moves together, then waits', { size: 14, italic: true, fill: C.slate, anchor: 'middle' }));
  } else {
    p.push(rect(0, sy + sh / 2 - 3, NW, 6, { fill: C.hair }));
    const custom = m.id === 'customization';
    for (let k = 0; k < 9; k++) {
      const x = 14 + k * 34;
      const shape = custom ? k % 3 : 0;
      p.push(item(shape, x, sy + sh / 2, custom ? [C.ink, C.cobalt, C.gold][k % 3]! : C.ink));
    }
    p.push(text(NW / 2, 14, custom ? 'a flowing line, each item to order' : 'a continuous flow of identical items', { size: 14, italic: true, fill: custom ? C.cobaltText : C.slate, anchor: 'middle' }));
    if (custom) p.push(rect(st[1]! - 4, sy - 6, sw + 8, sh + 12, { stroke: C.cobalt, sw: 2, rx: 5, dash: '5 4' }));
  }
  const cy = sy + sh + 52;
  const c = lines(m.caption, NW, 14, 18);
  p.push(text(0, cy, c.lines.join('\n'), { size: 14, weight: 700, fill: C.ink, lh: 18 }));
  const H = cy + c.h + 4;
  return frame(
    { id, w: NW, h: H, title: m.label, alt: `${m.label}: ${m.caption.charAt(0).toLowerCase()}${m.caption.slice(1)}.`, desc: `${m.label}. ${m.caption}. ${m.facts.map(([k, v]) => `${k}: ${v}`).join('. ')}.` },
    p.join(''),
  );
}

function methodGrid(id: string): string {
  const gap = 28;
  const pieces = METHODS.map((m, i) => {
    const svg = methodPanel(`${id}-${i}`, m.id);
    return { m, inner: svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title[^>]*>[\s\S]*?<\/title><desc[^>]*>[\s\S]*?<\/desc>/, ''), h: Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)?.[1] ?? 200) };
  });
  const rowH = Math.max(...pieces.map((x) => x.h)) + 40;
  const W = 2 * NW + gap;
  const body = pieces.map(({ m, inner }, i) => `<g transform="translate(${(i % 2) * (NW + gap)} ${Math.floor(i / 2) * rowH})">${text(0, 18, m.label, { size: 17, weight: 700, serif: true, fill: C.ink })}<g transform="translate(0 30)">${inner}</g></g>`).join('');
  return frame({ id, w: W, h: rowH * 2, title: 'Operations methods compared', alt: METHODS_ALT, desc: METHODS_DESC }, body);
}

const METHODS_ALT = 'Four small diagrams, one for each operations method in the guide, showing how items move through three stages: job, batch, mass or flow, and mass customization.';
const METHODS_DESC = `The four operations methods in the guide, each drawn as items moving through three stages, cut, assemble and finish. ${METHODS.map((m) => `${m.label}: ${m.caption.toLowerCase()}. ${m.facts.map(([k, v]) => `${k}: ${v.toLowerCase()}`).join('; ')}.`).join(' ')}`;

/* ------------------------------------------------------------------ */
/* From inspection to total quality management (5.3, HL)                */
/* ------------------------------------------------------------------ */

const QUALITY_PARTS: DiagramPart[] = [
  { id: 'qc', label: 'Quality control', text: 'Inspectors check finished output and reject or rework what fails: it finds faults after they are made, so the waste has already happened.', code: '5.3' },
  { id: 'qa', label: 'Quality assurance', text: 'Standards and procedures for every stage, with checks by the people doing the work and suppliers held to agreed specifications: it prevents faults, and supports certification to quality standards.', code: '5.3' },
  { id: 'tqm', label: 'Total quality management', text: 'Every employee in every department is responsible for quality, aiming to meet customers’ needs and get things right first time, with improvement that never stops. It needs commitment from the top and years to become the culture.', code: '5.3' },
  { id: 'circles', label: 'Quality circles', text: 'Small groups of employees who do similar work meet regularly to find and solve quality problems in their area: they use the knowledge closest to the work.', code: '5.3' },
  { id: 'benchmarking', label: 'Benchmarking', text: 'Measuring a process or result against the best performer, inside or outside the industry, and adopting the better practice: a vague wish to improve becomes a target.', code: '5.3' },
  { id: 'standards', label: 'National and international standards', text: 'Certification that a business’s quality systems meet an agreed standard: some customers buy only from certified suppliers, and it reassures new ones.', code: '5.3' },
];

const QUALITY_DESC = 'Three nested approaches to quality, each wider than the last. At the centre, quality control: inspectors check finished output and find faults after they are made. Around it, quality assurance: standards and procedures at every stage, checked by the people doing the work, which prevent faults and support certification. Around both, total quality management: every employee in every department responsible for quality, focused on the customer, getting things right first time and improving without end. Three methods support them: quality circles, small groups of workers solving quality problems in their area; benchmarking against the best performers; and national and international quality standards, which certify a business’s quality systems.';
const QUALITY_ALT = 'Three nested boxes, quality control inside quality assurance inside total quality management, with quality circles, benchmarking and quality standards beside them.';

function quality(id: string, o: RenderOpts | undefined, narrow: boolean): string {
  const p: string[] = [];
  const W = narrow ? NW : 720;
  const size = narrow ? 14 : 13;
  const lh = size * 1.3;
  const inset = narrow ? 12 : 22;
  const ringW = narrow ? NW : 460;
  const rings: Array<{ pid: string; tone: Tone; title: string; sub: string; solid: boolean }> = [
    { pid: 'tqm', tone: 'gold', title: 'Total quality management', sub: narrow ? 'Everyone, every process, aimed at the customer.' : 'Everyone, every process, aimed at the customer: right first time, always improving.', solid: true },
    { pid: 'qa', tone: 'cobalt', title: 'Quality assurance', sub: narrow ? 'Standards at every stage; faults prevented.' : 'Standards at every stage; people check their own work; faults prevented.', solid: true },
    { pid: 'qc', tone: 'ink', title: 'Quality control', sub: narrow ? 'Inspectors find faults after they are made.' : 'Inspectors check finished output; faults found after they are made.', solid: false },
  ];
  // Each ring's heading, then the rings inside it: heights from the inside out.
  const heads = rings.map((r, i) => 34 + lines(r.sub, ringW - 2 * inset * i - 24, size, lh).h + 8);
  const heights: number[] = [];
  for (let i = rings.length - 1; i >= 0; i--) heights[i] = heads[i]! + (i < rings.length - 1 ? heights[i + 1]! + inset : 2);
  let y = 0;
  rings.forEach((r, i) => {
    const x = inset * i;
    const w = ringW - 2 * inset * i;
    const t = TONES[r.tone];
    const subL = lines(r.sub, w - 24, size, lh);
    const inner =
      rect(x, y, w, heights[i]!, { fill: r.solid ? t.wash : C.white, stroke: t.line, sw: 1.6, rx: 4 }) +
      text(x + 12, y + 24, r.title, { size: size + 2, weight: 700, serif: true, fill: t.text }) +
      text(x + 12, y + 44, subL.lines.join('\n'), { size, fill: C.body, lh });
    p.push(part(o, r.pid, QUALITY_PARTS.find((q) => q.id === r.pid)!.label, [x, y, w, heads[i]!], inner));
    y += heads[i]!;
  });
  const ringsH = heights[0]!;
  const methods: Array<[string, string, string]> = [
    ['circles', 'Quality circles', 'Small groups solve problems in their own area'],
    ['benchmarking', 'Benchmarking', 'Compare with the best, adopt what works'],
    ['standards', 'Quality standards', 'Certified systems, national and international'],
  ];
  if (!narrow) {
    const bh = (ringsH - 2 * 12) / 3;
    methods.forEach(([pid, title, sub], i) => {
      const by = i * (bh + 12);
      const subL = lines(sub, 196, 13, 16.5);
      const inner = rect(500, by, 220, bh, { fill: C.white, stroke: C.rule, sw: 1.2, rx: 3 }) + text(512, by + 26, title, { size: 14, weight: 700, fill: C.ink }) + text(512, by + 48, subL.lines.join('\n'), { size: 13, fill: C.body, lh: 16.5 });
      p.push(part(o, pid, QUALITY_PARTS.find((q) => q.id === pid)!.label, [500, by, 220, bh], inner));
      p.push(line(id, 496, by + bh / 2, 466, by + bh / 2, { stroke: C.rule, sw: 1.4, arrow: 'end' }));
    });
    const H = ringsH + 40;
    p.push(text(0, H - 10, 'From finding faults to preventing them: each ring widens who is responsible for quality.', { size: 13, italic: true, fill: C.slate }));
    return frame({ id, w: W, h: H, title: 'From inspection to total quality management', alt: QUALITY_ALT, desc: QUALITY_DESC, interactive: Boolean(o?.link) }, p.join(''));
  }
  y = ringsH + 30;
  p.push(text(0, y, 'Methods that support them', { size: 14, weight: 700, fill: C.goldText, label: true }));
  y += 12;
  for (const [pid] of methods) {
    const q = QUALITY_PARTS.find((x) => x.id === pid)!;
    const ql = lines(q.label, NW - 24, 14, 18);
    const bh = ql.h + 16;
    const inner = rect(0, y, NW, bh, { fill: C.white, stroke: C.rule, sw: 1.2, rx: 3 }) + text(12, y + 22, ql.lines.join('\n'), { size: 14, weight: 700, fill: C.ink, lh: 18 });
    p.push(part(o, pid, q.label, [0, y, NW, bh], inner));
    y += bh + 6;
  }
  return frame({ id, w: NW, h: y + 4, title: 'From inspection to total quality management', alt: QUALITY_ALT, desc: QUALITY_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

/* ------------------------------------------------------------------ */
/* A process before and after lean production (5.3, HL)                 */
/* ------------------------------------------------------------------ */

const KIND_WORDS: Record<StepKind, string> = { value: 'adds value', waiting: 'waiting', moving: 'moving', checking: 'checking and rework', storing: 'storing' };

const LEAN_STATES: DiagramState[] = [
  { id: 'before', label: 'Before lean production', note: `${flowSummary(LEAN_PROCESS.before).valueAdded} of ${flowSummary(LEAN_PROCESS.before).lead} hours add value: the rest is waste.` },
  { id: 'after', label: 'After lean production', note: `The same ${flowSummary(LEAN_PROCESS.after).valueAdded} hours of work, but the order now takes ${n1(flowSummary(LEAN_PROCESS.after).lead)} hours instead of ${flowSummary(LEAN_PROCESS.before).lead}.` },
];

const LEAN_ALT = 'Bars for each step in making a table to order, before or after lean production, showing which steps add value and which are waiting, moving, checking or storing.';

function leanState(id: string, sid: string, narrow: boolean): string {
  const steps: ProcessStep[] = sid === 'after' ? LEAN_PROCESS.after : LEAN_PROCESS.before;
  const s = flowSummary(steps);
  const max = Math.max(...LEAN_PROCESS.before.map((x) => x.hours));
  const W = narrow ? NW : 720;
  const p: string[] = [];
  const size = narrow ? 14 : 13;
  const lx = narrow ? 0 : 250;
  const bw = narrow ? NW - 115 : 380;
  let y = 6;
  for (const st of steps) {
    const va = st.kind === 'value';
    const w = st.hours === 0 ? 0 : Math.max(3, (st.hours / max) * bw);
    if (narrow) {
      p.push(text(0, y + 14, st.name, { size, weight: 600, fill: C.ink }));
      y += 20;
    } else p.push(text(lx - 12, y + 15, st.name, { size, weight: 600, fill: C.ink, anchor: 'end' }));
    if (w > 0) p.push(rect(lx, y, w, 18, { fill: va ? C.green : C.signalWash, stroke: va ? undefined : C.signal, sw: 1.2, dash: va ? undefined : '4 3' }));
    p.push(text(lx + w + 6, y + 14, `${n1(st.hours)} h, ${KIND_WORDS[st.kind]}`, { size, fill: va ? C.greenText : C.signalText, weight: va ? 700 : 400 }));
    y += 24;
    if (sid === 'after' && st.change) {
      const c = lines(st.change, narrow ? NW : W - lx, size, size * 1.3);
      p.push(text(narrow ? 0 : lx, y + 8, c.lines.join('\n'), { size, italic: true, fill: C.slate, lh: size * 1.3 }));
      y += c.h + 6;
    }
    y += narrow ? 8 : 4;
  }
  y += 8;
  p.push(rect(0, y, W, 1, { fill: C.hair }));
  const sum = `Lead time ${n1(s.lead)} hours; value added ${n1(s.valueAdded)} hours (${Math.round(s.share)}%); waste ${n1(s.waste)} hours.`;
  const sl = lines(sum, W, size + 0.5, (size + 0.5) * 1.3);
  p.push(text(0, y + 24, sl.lines.join('\n'), { size: size + 0.5, weight: 700, fill: C.ink, lh: (size + 0.5) * 1.3 }));
  y += 24 + sl.h + 6;
  p.push(text(0, y + 6, `${LEAN_PROCESS.business} is fictional.`, { size: narrow ? 14 : 13, italic: true, fill: C.slate }));
  const H = y + 14;
  const desc = `${LEAN_PROCESS.business}, a fictional workshop, makes a table to order, ${sid === 'after' ? 'after' : 'before'} lean production. ${steps.map((x) => `${x.name}: ${n1(x.hours)} hours, ${KIND_WORDS[x.kind]}${sid === 'after' && x.change ? `. ${x.change}` : ''}`).join('. ')}. ${sum}`;
  return frame({ id, w: W, h: H, title: `Making a table to order, ${sid === 'after' ? 'after' : 'before'} lean production`, alt: LEAN_ALT, desc }, p.join(''));
}

function leanBoth(id: string): string {
  const a = leanState(`${id}-a`, 'before', false);
  const b = leanState(`${id}-b`, 'after', false);
  const ha = Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(a)?.[1] ?? 300);
  const hb = Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(b)?.[1] ?? 300);
  const strip = (s: string) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title[^>]*>[\s\S]*?<\/title><desc[^>]*>[\s\S]*?<\/desc>/, '');
  const body =
    text(0, 20, 'Before lean production', { size: 18, weight: 700, serif: true, fill: C.ink }) +
    `<g transform="translate(0 32)">${strip(a)}</g>` +
    text(0, ha + 72, 'After lean production', { size: 18, weight: 700, serif: true, fill: C.ink }) +
    `<g transform="translate(0 ${ha + 84})">${strip(b)}</g>`;
  const before = flowSummary(LEAN_PROCESS.before);
  const after = flowSummary(LEAN_PROCESS.after);
  return frame(
    {
      id,
      w: 720,
      h: ha + hb + 96,
      title: 'A process before and after lean production',
      alt: LEAN_ALT,
      desc: `${LEAN_PROCESS.business}, a fictional workshop, makes a table to order. Before lean production the order takes ${before.lead} hours, of which ${before.valueAdded} add value (${Math.round(before.share)}%). After just-in-time deliveries, kaizen changes to the layout, quality assurance at each stage and making to a delivery date, it takes ${n1(after.lead)} hours, of which the same ${after.valueAdded} add value (${Math.round(after.share)}%). Lean production cuts waste, the time that adds nothing a customer would pay for, not the work itself.`,
    },
    body,
  );
}

/* ------------------------------------------------------------------ */
/* The register                                                         */
/* ------------------------------------------------------------------ */

export const UNIT45_MORE: Record<string, DiagramDef> = {
  'segmentation-map': {
    title: 'One market, four ways to segment it',
    caption: 'The same 48 customers grouped by age, place, lifestyle and how often they buy: each basis suggests a different target.',
    syllabus: ['4.2'],
    level: 'SL/HL',
    group: 'unit-4',
    fictional: true,
    alt: SEG_ALT,
    howTo: 'Choose a basis to regroup the same customers.',
    ix: { kind: 'switch', legend: 'Segment the market by', states: SEG_STATES, draw: (id, sid, narrow) => segmentState(id, sid, narrow) },
    render: segmentSheet,
    narrow: (id) => segmentState(id, 'demographic', true),
  },
  'plc-extension-strategies': {
    title: 'Extension strategies on the product life cycle',
    caption: 'Where an extension strategy changes the curve, and the six kinds to choose from.',
    syllabus: ['4.5'],
    level: 'SL/HL',
    group: 'unit-4',
    alt: PLC_ALT,
    parts: PLC_PARTS,
    howTo: 'Point to a stage or a strategy, or tab to it, to read what it means; select it to open its subtopic.',
    render: (id, o) => plcExtension(id, o, false),
    narrow: (id, o) => plcExtension(id, o, true),
  },
  'operations-compare': {
    title: 'Operations methods compared',
    caption: 'How items move through production under each method: choose two to set side by side.',
    syllabus: ['5.2'],
    level: 'SL/HL',
    group: 'unit-5',
    alt: METHODS_ALT,
    howTo: 'Choose two methods to compare; the facts that differ are marked.',
    ix: { kind: 'compare', legend: 'Compare two operations methods', panels: METHOD_PANELS, draw: (id, pid) => methodPanel(id, pid), first: ['batch', 'flow'] },
    render: methodGrid,
  },
  'quality-management': {
    title: 'From inspection to total quality management',
    caption: 'Quality control, quality assurance and TQM as ever wider rings of responsibility, with the methods that support them.',
    syllabus: ['5.3'],
    level: 'HL',
    group: 'unit-5',
    alt: QUALITY_ALT,
    parts: QUALITY_PARTS,
    howTo: 'Point to an approach or a method, or tab to it, to read what it means; select it to open its subtopic.',
    render: (id, o) => quality(id, o, false),
    narrow: (id, o) => quality(id, o, true),
  },
  'lean-process': {
    title: 'A process before and after lean production',
    caption: 'Making one table to order: lean production cuts the waiting, moving, checking and storing, not the work.',
    syllabus: ['5.3'],
    level: 'HL',
    group: 'unit-5',
    fictional: true,
    alt: LEAN_ALT,
    howTo: 'Switch between before and after to see which steps lean production shortens.',
    ix: { kind: 'switch', legend: 'Show the process', states: LEAN_STATES, draw: (id, sid, narrow) => leanState(id, sid, narrow) },
    render: leanBoth,
    narrow: (id) => leanState(id, 'before', true),
  },
};
