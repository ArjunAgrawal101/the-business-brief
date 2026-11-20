/**
 * Figures for the frameworks library: the enrichment frameworks beyond the
 * IB syllabus (five forces, the value chain, the 7S model, the business model
 * canvas, the balanced scorecard, PESTLE against STEEPLE, Kotter's eight
 * steps, Lewin's change model, RACI and SMART), and an anatomy of a business
 * plan for the toolkit. Enrichment figures name no IB subtopic, so they never
 * appear on a subtopic page or count towards the course's coverage. Any
 * figure in them is computed here from fictional data and tested in
 * tests/unit/frameworks.test.ts.
 */
import type { DiagramDef } from '../diagrams';
import { C, NW, TONES, arrowPath, badge, box, circle, frame, line, narrowFrame, num, para, poly, rect, text, wrap, type Tone } from './kit';
import { block, stack } from './narrow';

/* ---------- Porter's five forces ---------- */
const FIVE: Record<'entrants' | 'suppliers' | 'buyers' | 'substitutes' | 'rivalry', [string, string]> = {
  entrants: ['Threat of new entrants', 'Barriers to entry: scale, capital needed, brand loyalty, regulation, access to channels'],
  suppliers: ['Bargaining power of suppliers', 'Few suppliers, inputs with no substitute, high costs of switching supplier'],
  buyers: ['Bargaining power of buyers', 'Few or large buyers, standard products, buyers who are sensitive to price'],
  substitutes: ['Threat of substitutes', 'Other ways to meet the same need, and how their price and performance compare'],
  rivalry: ['Rivalry among existing competitors', 'Number and size of rivals, market growth, fixed costs, exit barriers'],
};

function fiveForces(id: string): string {
  const W = 740;
  const H = 476;
  const p: string[] = [];
  const outer = { tone: 'ink' as Tone, style: 'wash' as const, size: 13.5, subSize: 10.5, serif: true };
  p.push(box(270, 20, 200, 100, FIVE.entrants[0], { ...outer, sub: FIVE.entrants[1] }));
  p.push(box(20, 180, 200, 112, FIVE.suppliers[0], { ...outer, sub: FIVE.suppliers[1] }));
  p.push(box(520, 180, 200, 112, FIVE.buyers[0], { ...outer, sub: FIVE.buyers[1] }));
  p.push(box(270, 352, 200, 100, FIVE.substitutes[0], { ...outer, sub: FIVE.substitutes[1] }));
  p.push(box(270, 180, 200, 112, FIVE.rivalry[0], { tone: 'ink', style: 'solid', size: 14, serif: true, sub: FIVE.rivalry[1], subSize: 10.5 }));
  const ar = { tone: 'gold' as Tone, sw: 2, arrow: 'end' as const };
  p.push(line(id, 370, 124, 370, 176, ar));
  p.push(line(id, 370, 348, 370, 296, ar));
  p.push(line(id, 224, 236, 266, 236, ar));
  p.push(line(id, 516, 236, 474, 236, ar));
  p.push(text(370, H - 6, 'The stronger the forces, the less profit an average firm in the industry can expect to earn.', { size: 11.5, italic: true, fill: C.slate, anchor: 'middle' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Porter’s five forces',
      desc: 'Five forces press on the profitability of an industry, with rivalry among existing competitors at the centre, shaped by the number and size of rivals, market growth, fixed costs and exit barriers. Around it: the threat of new entrants, which depends on barriers to entry such as scale, the capital needed, brand loyalty, regulation and access to channels; the bargaining power of suppliers, high when there are few suppliers, inputs with no substitute or high costs of switching; the bargaining power of buyers, high when buyers are few or large, products are standard and buyers are sensitive to price; and the threat of substitutes, other ways to meet the same need, judged by their price and performance. The stronger the forces, the less profit an average firm in the industry can expect to earn.',
    },
    p.join(''),
  );
}

/* ---------- The value chain ---------- */
const VC_SUPPORT: Array<[string, string]> = [
  ['Firm infrastructure', 'Management, planning, finance, legal and quality systems'],
  ['Human resource management', 'Recruiting, training, rewarding and keeping people'],
  ['Technology development', 'Research, design, process improvement and IT'],
  ['Procurement', 'Buying the inputs that every activity uses'],
];
const VC_PRIMARY: Array<[string, string]> = [
  ['Inbound logistics', 'Receiving, storing and handling inputs'],
  ['Operations', 'Turning inputs into the product or service'],
  ['Outbound logistics', 'Storing and delivering to customers'],
  ['Marketing and sales', 'Making customers aware, and able to buy'],
  ['Service', 'Support after the sale: installing, repairing, advising'],
];

function valueChain(id: string): string {
  const W = 760;
  const H = 432;
  const p: string[] = [];
  const x0 = 24;
  const wide = 576;
  p.push(text(x0, 26, 'Support activities', { size: 11, weight: 700, fill: C.goldText, label: true }));
  const support = VC_SUPPORT;
  support.forEach(([n, d], i) => {
    const y = 36 + i * 46;
    p.push(rect(x0, y, wide, 40, { fill: i % 2 ? C.white : C.paper, stroke: C.rule, sw: 1, rx: 2 }));
    p.push(text(x0 + 12, y + 25, n, { size: 12.5, weight: 700, fill: C.ink }));
    p.push(text(x0 + 222, y + 25, d, { size: 11.5, fill: C.body }));
  });
  p.push(text(x0, 236, 'Primary activities', { size: 11, weight: 700, fill: C.goldText, label: true }));
  const primary = VC_PRIMARY;
  const cw = wide / primary.length;
  primary.forEach(([n, d], i) => {
    p.push(box(x0 + i * cw, 246, cw - 6, 136, n, { tone: 'ink', style: 'outline', size: 12.5, sub: d, subSize: 10.5 }));
  });
  // The margin: what the chain earns, as the arrowhead of the whole chain.
  const mx = x0 + wide + 6;
  p.push(poly([[mx, 36], [mx + 62, 36], [mx + 136, 209], [mx + 62, 382], [mx, 382]], { fill: C.goldWash, stroke: C.gold, sw: 1.2 }));
  p.push(text(mx + 56, 196, 'Margin', { size: 16, weight: 700, serif: true, fill: C.goldText, anchor: 'middle' }));
  p.push(para(mx + 56, 216, 'what customers pay, less the cost of all the activities', 15, { size: 10.5, fill: C.body, anchor: 'middle' }));
  p.push(para(x0, H - 30, 'Every activity can add value or cost. An advantage comes from doing some of them more cheaply than rivals, or better in ways customers will pay for, and from how well they link.', 120, { size: 11.5, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The value chain',
      desc: 'A business drawn as a chain of activities that together create value. Five primary activities run in order along the bottom: inbound logistics, receiving, storing and handling inputs; operations, turning inputs into the product or service; outbound logistics, storing and delivering to customers; marketing and sales, making customers aware and able to buy; and service, support after the sale such as installing, repairing and advising. Four support activities run across all of them above: firm infrastructure (management, planning, finance, legal and quality systems), human resource management, technology development (research, design, process improvement and IT) and procurement, buying the inputs every activity uses. At the end of the chain is the margin: what customers pay, less the cost of all the activities. An advantage comes from doing some activities more cheaply than rivals, or better in ways customers will pay for, and from how well they link.',
    },
    p.join(''),
  );
}

/* ---------- McKinsey 7S ---------- */
const SEVEN_S: Array<[string, string, 'hard' | 'soft']> = [
  ['Strategy', 'the plan to win', 'hard'],
  ['Structure', 'who reports to whom', 'hard'],
  ['Systems', 'processes and routines', 'hard'],
  ['Skills', 'what it does well', 'soft'],
  ['Staff', 'its people and their growth', 'soft'],
  ['Style', 'how leaders behave', 'soft'],
];

function sevenS(id: string): string {
  const W = 720;
  const H = 500;
  const p: string[] = [];
  const cx = 360;
  const cy = 226;
  const rad = 54;
  const nodes = SEVEN_S;
  const pts = nodes.map((_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [cx + 248 * Math.cos(a), cy + 164 * Math.sin(a)] as [number, number];
  });
  // Every element connects to every other: the model's point.
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) p.push(line(id, pts[i]![0], pts[i]![1], pts[j]![0], pts[j]![1], { stroke: C.hair, sw: 1.2 }));
    p.push(line(id, cx, cy, pts[i]![0], pts[i]![1], { stroke: C.rule, sw: 1.2 }));
  }
  nodes.forEach(([n, s, kind], i) => {
    const [x, y] = pts[i]!;
    const hard = kind === 'hard';
    p.push(circle(x, y, rad, { fill: hard ? C.ink : C.white, stroke: hard ? C.ink : C.gold, sw: 1.6 }));
    p.push(text(x, y - 6, n, { size: 14, weight: 700, serif: true, fill: hard ? C.white : C.ink, anchor: 'middle' }));
    p.push(para(x, y + 12, s, 16, { size: 10.5, fill: hard ? '#d9d3c4' : C.slate, anchor: 'middle' }));
  });
  p.push(circle(cx, cy, 64, { fill: C.goldWash, stroke: C.gold, sw: 1.6 }));
  p.push(text(cx, cy - 4, 'Shared values', { size: 15, weight: 700, serif: true, fill: C.goldText, anchor: 'middle' }));
  p.push(para(cx, cy + 15, 'the beliefs at the centre', 16, { size: 10.5, fill: C.body, anchor: 'middle' }));
  p.push(circle(30, H - 40, 8, { fill: C.ink }));
  p.push(text(46, H - 36, 'Hard elements: easier to define, measure and change', { size: 11.5, fill: C.body }));
  p.push(circle(30, H - 16, 8, { fill: C.white, stroke: C.gold, sw: 1.6 }));
  p.push(text(46, H - 12, 'Soft elements: harder to see, and slower to change', { size: 11.5, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The McKinsey 7S model',
      desc: 'Seven elements of an organization, each linked to all the others, with shared values, the beliefs at the centre, in the middle. Three hard elements, easier to define, measure and change: strategy, the plan to win; structure, who reports to whom; and systems, its processes and routines. Three soft elements, harder to see and slower to change: skills, what the organization does well; staff, its people and their development; and style, how leaders behave. The model says the elements must fit together, so changing one, such as the structure, means checking all the others.',
    },
    p.join(''),
  );
}

/* ---------- The business model canvas ---------- */
/** Each block: its title, the question it answers and the usual order of filling it in. */
const CANVAS: Record<string, [string, string, number]> = {
  partners: ['Key partners', 'Who helps us deliver: suppliers, allies, outsourcers? What do they do for us?', 8],
  activities: ['Key activities', 'What must we do well to deliver the offer?', 7],
  resources: ['Key resources', 'What do we need: people, premises, brands, data, cash?', 6],
  value: ['Value propositions', 'What problem do we solve, or what need do we meet, for each segment? Why would they choose us?', 2],
  relationships: ['Customer relationships', 'How do we win, keep and grow customers?', 4],
  channels: ['Channels', 'How do customers hear of us, buy from us and receive the offer?', 3],
  segments: ['Customer segments', 'For whom do we create value? Who matters most?', 1],
  costs: ['Cost structure', 'The main costs of running the model. Which activities and resources cost the most?', 9],
  revenue: ['Revenue streams', 'What will customers pay for, how and how much: sales, subscriptions, fees, licences?', 5],
};

function canvas(id: string): string {
  const W = 760;
  const H = 470;
  const p: string[] = [];
  const x0 = 20;
  const top = 20;
  const cw = 144;
  const g = 6;
  const tall = 300;
  const half = (tall - g) / 2;
  const block = (x: number, y: number, w: number, h: number, title: string, q: string, order: number, tone: Tone = 'ink', wash = false) => {
    const t = TONES[tone];
    p.push(rect(x, y, w, h, { fill: wash ? t.wash : C.white, stroke: t.line, sw: wash ? 1.4 : 1, rx: 2 }));
    const lines = wrap(title, Math.floor((w - 34) / 6.8));
    p.push(text(x + 10, y + 22, lines.join('\n'), { size: 12.5, weight: 700, fill: tone === 'ink' ? C.ink : t.text, lh: 15 }));
    p.push(text(x + w - 10, y + 21, String(order), { size: 12, weight: 700, serif: true, italic: true, fill: C.goldText, anchor: 'end' }));
    p.push(para(x + 10, y + 26 + lines.length * 15, q, Math.floor((w - 18) / 5.9), { size: 10.5, fill: C.body }));
  };
  const b = (k: string) => CANVAS[k]!;
  block(x0, top, cw - g, tall, ...b('partners'));
  block(x0 + cw, top, cw - g, half, ...b('activities'));
  block(x0 + cw, top + half + g, cw - g, half, ...b('resources'));
  block(x0 + 2 * cw, top, cw - g, tall, ...b('value'), 'gold', true);
  block(x0 + 3 * cw, top, cw - g, half, ...b('relationships'));
  block(x0 + 3 * cw, top + half + g, cw - g, half, ...b('channels'));
  block(x0 + 4 * cw, top, cw - g, tall, ...b('segments'), 'cobalt', true);
  const bw = (5 * cw - g) / 2;
  block(x0, top + tall + g, bw - g / 2, 110, ...b('costs'));
  block(x0 + bw + g / 2, top + tall + g, bw - g / 2, 110, ...b('revenue'), 'green', true);
  p.push(text(x0, H - 18, 'Left: how the business delivers. Right: whom it serves and how it earns. Numbers: a common order for filling it in.', { size: 11.5, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The business model canvas',
      desc: 'Nine blocks on one page that describe how a business creates, delivers and captures value. In the middle, the value propositions: the problem it solves or the need it meets for each segment, and why customers would choose it. To the right, who it serves: customer relationships (how it wins, keeps and grows customers), channels (how customers hear of it, buy from it and receive the offer) and customer segments (for whom it creates value). To the left, how it delivers: key partners such as suppliers, allies and outsourcers, key activities it must do well, and key resources such as people, premises, brands, data and cash. Along the bottom, the cost structure, the main costs of running the model, and the revenue streams, what customers pay for, how and how much. Small numbers give a common order for filling it in: customer segments, value propositions, channels, customer relationships, revenue streams, key resources, key activities, key partners and the cost structure.',
    },
    p.join(''),
  );
}

/* ---------- The balanced scorecard ---------- */
/** Each perspective: its title, its question, example measures and its tone. */
const SCORECARD: Record<string, [string, string, string, Tone]> = {
  financial: ['Financial', 'To succeed financially, how should we appear to our owners?', 'Return on capital employed; revenue growth', 'green'],
  customer: ['Customer', 'To achieve our vision, how should customers see us?', 'Repeat purchase rate; customer satisfaction score', 'cobalt'],
  internal: ['Internal processes', 'To satisfy customers, which processes must we excel at?', 'Order lead time; defect rate', 'gold'],
  learning: ['Learning and growth', 'To keep improving, how must our people and systems develop?', 'Training hours per employee; staff retention', 'ink'],
};

function scorecard(id: string): string {
  const W = 740;
  const H = 496;
  const p: string[] = [];
  const panel = (x: number, y: number, w: number, h: number, title: string, q: string, measures: string, tone: Tone) => {
    const t = TONES[tone];
    p.push(rect(x, y, w, h, { fill: C.white, stroke: t.line, sw: 1.2, rx: 2 }));
    p.push(rect(x, y, w, 6, { fill: t.line }));
    p.push(text(x + 14, y + 30, title, { size: 14, weight: 700, serif: true, fill: tone === 'ink' ? C.ink : t.text }));
    p.push(para(x + 14, y + 50, q, Math.floor((w - 28) / 6), { size: 11.5, italic: true, fill: C.body }));
    p.push(text(x + 14, y + h - 40, 'Example measures', { size: 10, weight: 700, fill: C.slate, label: true }));
    p.push(para(x + 14, y + h - 23, measures, Math.floor((w - 28) / 5.8), { size: 11, fill: C.body }));
  };
  panel(230, 16, 280, 132, ...SCORECARD.financial!);
  panel(16, 172, 240, 140, ...SCORECARD.customer!);
  panel(484, 172, 240, 140, ...SCORECARD.internal!);
  panel(230, 336, 280, 132, ...SCORECARD.learning!);
  p.push(box(290, 202, 160, 80, 'Vision and strategy', { tone: 'ink', style: 'solid', size: 14, serif: true }));
  const ar = { tone: 'slate' as Tone, sw: 1.4, arrow: 'both' as const };
  p.push(line(id, 370, 152, 370, 198, ar));
  p.push(line(id, 370, 286, 370, 332, ar));
  p.push(line(id, 260, 242, 286, 242, ar));
  p.push(line(id, 480, 242, 454, 242, ar));
  p.push(text(370, H - 8, 'Read upwards for cause and effect: people and systems improve processes, which win customers, which deliver the financial results.', { size: 11, italic: true, fill: C.slate, anchor: 'middle' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The balanced scorecard',
      desc: 'Four perspectives around the vision and strategy, each with its own objectives and measures. Financial: how the business should appear to its owners, measured for example by return on capital employed and revenue growth. Customer: how customers should see it, measured by the repeat purchase rate and a satisfaction score. Internal processes: which processes it must excel at, measured by order lead time and the defect rate. Learning and growth: how its people and systems must develop, measured by training hours per employee and staff retention. Read upwards for cause and effect: people and systems improve processes, which win customers, which deliver the financial results.',
    },
    p.join(''),
  );
}

/* ---------- PESTLE against STEEPLE ---------- */
export const PESTLE_ROWS: Array<{ factor: string; about: string; pest: boolean; pestle: boolean; steeple: boolean }> = [
  { factor: 'Political', about: 'Government policy, stability, taxation, trade', pest: true, pestle: true, steeple: true },
  { factor: 'Economic', about: 'Growth, inflation, interest and exchange rates', pest: true, pestle: true, steeple: true },
  { factor: 'Social', about: 'Demographics, lifestyles, attitudes', pest: true, pestle: true, steeple: true },
  { factor: 'Technological', about: 'New products, processes, automation', pest: true, pestle: true, steeple: true },
  { factor: 'Legal', about: 'Employment, consumer and competition law', pest: false, pestle: true, steeple: true },
  { factor: 'Environmental', about: 'Climate, resources, pollution, waste', pest: false, pestle: true, steeple: true },
  { factor: 'Ethical', about: 'What is right: fair pay, honest marketing, sourcing', pest: false, pestle: false, steeple: true },
];

/** How many factors each framework covers, for the figure's headings. */
export function factorCounts(): { pest: number; pestle: number; steeple: number } {
  return {
    pest: PESTLE_ROWS.filter((r) => r.pest).length,
    pestle: PESTLE_ROWS.filter((r) => r.pestle).length,
    steeple: PESTLE_ROWS.filter((r) => r.steeple).length,
  };
}

function pestleSteeple(id: string): string {
  const W = 700;
  const H = 418;
  const p: string[] = [];
  const n = factorCounts();
  const cols: Array<[string, number, 'pest' | 'pestle' | 'steeple']> = [
    ['PEST', n.pest, 'pest'],
    ['PESTLE', n.pestle, 'pestle'],
    ['STEEPLE', n.steeple, 'steeple'],
  ];
  const cx = [400, 500, 610];
  cols.forEach(([name, count], i) => {
    p.push(text(cx[i]!, 30, name, { size: 13.5, weight: 700, fill: i === 2 ? C.goldText : C.ink, anchor: 'middle' }));
    p.push(text(cx[i]!, 47, `${count} factors`, { size: 10.5, fill: C.slate, anchor: 'middle' }));
  });
  p.push(text(24, 47, 'Factor', { size: 10.5, weight: 700, fill: C.slate, label: true }));
  const rowH = 44;
  PESTLE_ROWS.forEach((r, i) => {
    const y = 58 + i * rowH;
    const ethical = r.factor === 'Ethical';
    p.push(rect(16, y, W - 32, rowH - 4, { fill: ethical ? C.goldWash : i % 2 ? C.white : C.paper, stroke: ethical ? C.gold : undefined, sw: 1, rx: 2 }));
    p.push(text(28, y + 18, r.factor, { size: 13, weight: 700, fill: C.ink }));
    p.push(text(28, y + 33, r.about, { size: 10.5, fill: C.slate }));
    (['pest', 'pestle', 'steeple'] as const).forEach((k, j) => {
      const on = r[k];
      const x = cx[j]!;
      if (on) {
        p.push(circle(x, y + 20, 9, { fill: j === 2 ? C.goldText : C.ink }));
        p.push(`<path d="M${x - 4},${y + 20} L${x - 1},${y + 23.5} L${x + 4.5},${y + 16.5}" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
      } else {
        p.push(line(id, x - 8, y + 20, x + 8, y + 20, { stroke: C.muted, sw: 2 }));
      }
    });
  });
  p.push(para(24, H - 34, 'STEEPLE is PESTLE with ethics added as a factor of its own, so that questions of right and wrong are not lost inside the social or legal headings. The IB toolkit uses STEEPLE.', 110, { size: 11.5, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'PEST, PESTLE and STEEPLE compared',
      desc: `A table of seven external factors and which framework includes each. PEST has ${n.pest} factors: political (government policy, stability, taxation, trade), economic (growth, inflation, interest and exchange rates), social (demographics, lifestyles, attitudes) and technological (new products, processes, automation). PESTLE has ${n.pestle}: those four plus legal (employment, consumer and competition law) and environmental (climate, resources, pollution, waste). STEEPLE has ${n.steeple}: all six plus ethical, what is right, such as fair pay, honest marketing and responsible sourcing. STEEPLE is PESTLE with ethics added as a factor of its own. The IB toolkit uses STEEPLE.`,
    },
    p.join(''),
  );
}

/* ---------- Kotter's eight steps ---------- */
const KOTTER_STEPS = [
  'Create a sense of urgency',
  'Build a guiding coalition',
  'Form a vision and a strategy',
  'Communicate the vision widely',
  'Remove obstacles and enable action',
  'Plan and win short-term gains',
  'Build on the gains and keep going',
  'Anchor the change in the culture',
];
const KOTTER_TONES: Tone[] = ['ink', 'ink', 'ink', 'gold', 'gold', 'gold', 'green', 'green'];
const KOTTER_PHASES: Array<[number, number, string, Tone]> = [
  [0, 2, 'Create a climate for change', 'ink'],
  [3, 5, 'Engage and enable the organization', 'gold'],
  [6, 7, 'Implement and sustain', 'green'],
];

function kotter(id: string): string {
  const W = 760;
  const H = 440;
  const p: string[] = [];
  const steps = KOTTER_STEPS;
  const tones = KOTTER_TONES;
  const base = 372;
  const sw = 88;
  const x0 = 26;
  steps.forEach((s, i) => {
    const x = x0 + i * sw;
    const top = base - 96 - i * 32;
    const t = TONES[tones[i]!];
    p.push(rect(x, top, sw - 4, base - top, { fill: t.wash, stroke: t.line, sw: 1.2, rx: 2 }));
    p.push(badge(x + 18, top + 19, i + 1, { tone: tones[i]!, rad: 11 }));
    p.push(para(x + 8, top + 47, s, 12, { size: 10.5, weight: 600, fill: C.ink, lh: 13 }));
  });
  p.push(para(x0, 40, 'Each step builds on the one before. Skipping a step, or declaring victory too soon, is a common way for change to fail.', 64, { size: 11.5, italic: true, fill: C.slate }));
  for (const [a, b, label, tone] of KOTTER_PHASES) {
    const xa = x0 + a * sw;
    const xb = x0 + (b + 1) * sw - 4;
    p.push(line(id, xa, base + 14, xb, base + 14, { tone, sw: 2 }));
    p.push(line(id, xa, base + 8, xa, base + 20, { tone, sw: 2 }));
    p.push(line(id, xb, base + 8, xb, base + 20, { tone, sw: 2 }));
    p.push(para((xa + xb) / 2, base + 36, label, 30, { size: 11.5, weight: 700, fill: TONES[tone].text, anchor: 'middle' }));
  }
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Kotter’s eight steps for leading change',
      desc: 'Eight steps rising like a staircase, each built on the one before, in three phases. Creating a climate for change: 1, create a sense of urgency; 2, build a guiding coalition of people with the power and credibility to lead the change; 3, form a vision and a strategy. Engaging and enabling the organization: 4, communicate the vision widely and often; 5, remove obstacles and enable people to act; 6, plan and win visible short-term gains. Implementing and sustaining: 7, build on the gains and keep going rather than declaring victory too soon; 8, anchor the change in the culture so that it lasts.',
    },
    p.join(''),
  );
}

/* ---------- Lewin's three-stage change model ---------- */
const LEWIN_STAGES: Array<[string, string, string, string[]]> = [
  ['Unfreeze', 'The current state', 'ink', ['Make the case: show why the present way no longer works', 'Weaken the forces that hold it in place', 'Involve people early, and listen']],
  ['Change', 'The transition', 'gold', ['Move to the new way: train, support, communicate', 'Expect uncertainty, and a dip in results', 'Adjust the plan as people learn']],
  ['Refreeze', 'The new state', 'green', ['Make it stick: align systems, rewards and structure', 'Recognize and celebrate what works', 'Stop the old way from creeping back']],
];

function lewin(id: string): string {
  const W = 720;
  const H = 392;
  const p: string[] = [];
  const stages = LEWIN_STAGES;
  const cw = 216;
  const gap = 24;
  stages.forEach(([name, state, tone, acts], i) => {
    const t = TONES[tone as Tone];
    const x = 20 + i * (cw + gap);
    p.push(circle(x + cw / 2, 46, 22, { fill: i === 1 ? C.white : t.line, stroke: t.line, sw: 2, dash: i === 1 ? '5 4' : undefined }));
    p.push(text(x + cw / 2, 51, String(i + 1), { size: 15, weight: 700, fill: i === 1 ? t.text : C.white, anchor: 'middle' }));
    if (i < 2) p.push(arrowPath(id, `M${x + cw / 2 + 28},46 L${x + cw + gap + cw / 2 - 28},46`, { tone: tone as Tone, sw: 1.8 }));
    p.push(text(x + cw / 2, 92, state, { size: 10.5, weight: 700, fill: C.slate, anchor: 'middle', label: true }));
    p.push(rect(x, 104, cw, 210, { fill: t.wash, stroke: t.line, sw: 1.2, rx: 2 }));
    p.push(text(x + 16, 134, name, { size: 18, weight: 700, serif: true, fill: tone === 'ink' ? C.ink : t.text }));
    acts.forEach((a, k) => {
      p.push(circle(x + 20, 162 + k * 50, 3, { fill: t.line }));
      p.push(para(x + 30, 166 + k * 50, a, 27, { size: 11.5, fill: C.body }));
    });
  });
  p.push(para(20, H - 52, 'Lewin also gave force field analysis, which weighs the forces driving a change against those resisting it: unfreezing works by strengthening the first or weakening the second.', 118, { size: 11.5, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Lewin’s three-stage model of change',
      desc: 'Three stages from the current state, through a transition, to a new state. Unfreeze: make the case by showing why the present way no longer works, weaken the forces that hold it in place, and involve people early. Change: move to the new way with training, support and communication, expecting uncertainty and a dip in results, and adjusting the plan as people learn. Refreeze: make the change stick by aligning systems, rewards and structure, recognizing what works and stopping the old way from creeping back. Lewin also gave force field analysis, which weighs the forces driving a change against those resisting it.',
    },
    p.join(''),
  );
}

/* ---------- RACI ---------- */
export type RaciLetter = 'R' | 'A' | 'C' | 'I';
export interface Raci {
  roles: string[];
  tasks: Array<{ task: string; cells: RaciLetter[] }>;
}

/** A fictional project: opening a second branch of Kettle and Crumb, a café. */
export const RACI_EXAMPLE: Raci = {
  roles: ['Owner', 'Operations manager', 'Finance officer', 'Marketing lead', 'Head barista'],
  tasks: [
    { task: 'Choose the site', cells: ['A', 'R', 'C', 'C', 'I'] },
    { task: 'Agree the budget', cells: ['A', 'C', 'R', 'C', 'I'] },
    { task: 'Fit out the premises', cells: ['C', 'A', 'C', 'I', 'R'] },
    { task: 'Recruit and train staff', cells: ['I', 'A', 'C', 'I', 'R'] },
    { task: 'Plan the opening week', cells: ['A', 'C', 'I', 'R', 'C'] },
  ],
};

/**
 * The checks a RACI matrix must pass: every task has exactly one person
 * accountable and at least one responsible, and every row has a letter for
 * every role. Returns the problems in words; none means the matrix is sound.
 */
export function raciProblems(m: Raci): string[] {
  const out: string[] = [];
  for (const t of m.tasks) {
    if (t.cells.length !== m.roles.length) out.push(`${t.task}: ${t.cells.length} letter${t.cells.length === 1 ? '' : 's'} for ${m.roles.length} roles`);
    const a = t.cells.filter((x) => x === 'A').length;
    if (a !== 1) out.push(`${t.task}: ${a === 0 ? 'no one is' : `${a} people are`} accountable`);
    if (!t.cells.includes('R')) out.push(`${t.task}: no one is responsible for doing the work`);
  }
  return out;
}

function raci(id: string): string {
  const m = RACI_EXAMPLE;
  const W = 740;
  const H = 388;
  const p: string[] = [];
  const lx = 20;
  const colX = 200;
  const cw = 104;
  const rowH = 44;
  const top = 74;
  const styles: Record<RaciLetter, { fill: string; stroke: string; ink: string }> = {
    R: { fill: C.ink, stroke: C.ink, ink: C.white },
    A: { fill: C.gold, stroke: C.gold, ink: C.ink },
    C: { fill: C.cobaltWash, stroke: C.cobalt, ink: C.cobaltText },
    I: { fill: C.white, stroke: C.slate, ink: C.slate },
  };
  p.push(text(lx, 24, 'Opening a second branch of Kettle and Crumb, a fictional café', { size: 12, weight: 700, fill: C.ink }));
  p.push(text(lx, top - 12, 'Task', { size: 10.5, weight: 700, fill: C.slate, label: true }));
  m.roles.forEach((r, j) => p.push(para(colX + j * cw + cw / 2, top - 30, r, 13, { size: 11, weight: 700, fill: C.ink, anchor: 'middle' })));
  m.tasks.forEach((t, i) => {
    const y = top + i * rowH;
    p.push(rect(lx - 4, y, W - 2 * lx + 8, rowH - 4, { fill: i % 2 ? C.white : C.paper, rx: 2 }));
    p.push(text(lx + 6, y + 25, t.task, { size: 12.5, weight: 600, fill: C.ink }));
    t.cells.forEach((l, j) => {
      const s = styles[l];
      const x = colX + j * cw + cw / 2;
      p.push(rect(x - 15, y + 5, 30, 30, { fill: s.fill, stroke: s.stroke, sw: 1.2, rx: 2 }));
      p.push(text(x, y + 25, l, { size: 14, weight: 700, fill: s.ink, anchor: 'middle' }));
    });
  });
  const ly = top + m.tasks.length * rowH + 22;
  const key: Array<[RaciLetter, string]> = [
    ['R', 'Responsible: does the work'],
    ['A', 'Accountable: owns the result and signs it off, one per task'],
    ['C', 'Consulted: asked before the decision'],
    ['I', 'Informed: told once it is made'],
  ];
  key.forEach(([l, s], k) => {
    const x = lx + (k % 2) * 360;
    const y = ly + Math.floor(k / 2) * 26;
    const st = styles[l];
    p.push(rect(x, y - 14, 20, 20, { fill: st.fill, stroke: st.stroke, sw: 1.2, rx: 2 }));
    p.push(text(x + 10, y + 1, l, { size: 11.5, weight: 700, fill: st.ink, anchor: 'middle' }));
    p.push(text(x + 30, y + 1, s, { size: 11.5, fill: C.body }));
  });
  const rows = m.tasks.map((t) => `${t.task}: ${t.cells.map((l, j) => `${m.roles[j]} ${l}`).join(', ')}`).join('. ');
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A RACI matrix',
      desc: `A grid of tasks against roles for a fictional project, opening a second branch of a café called Kettle and Crumb. Each cell holds one letter: R, responsible, does the work; A, accountable, owns the result and signs it off, one per task; C, consulted, asked before the decision; I, informed, told once it is made. ${rows}. Every task has exactly one person accountable and at least one responsible.`,
    },
    p.join(''),
  );
}

/* ---------- SMART objectives ---------- */
/** The worked figure in the SMART diagram: online sales from $40,000 to a 15% higher monthly target. */
export function smartExample(): { from: number; pct: number; to: number } {
  const from = 40000;
  const pct = 15;
  return { from, pct, to: Math.round(from * (1 + pct / 100)) };
}

function smartTests(): Array<[string, string, string, string]> {
  const e = smartExample();
  return [
    ['S', 'Specific', 'Does it say exactly what will change?', 'Online sales revenue, not “sales”'],
    ['M', 'Measurable', 'Will we know, in figures, whether it was met?', `From $${num(e.from)} to $${num(e.to)} a month`],
    ['A', 'Achievable', 'Can it be done with the people and money available?', 'A similar push last year added 12%'],
    ['R', 'Relevant', 'Does it serve the strategy? (Some versions say realistic.)', 'Supports the plan to grow online'],
    ['T', 'Time-bound', 'Is there a deadline?', 'By the end of June next year'],
  ];
}

function smart(id: string): string {
  const W = 740;
  const H = 424;
  const p: string[] = [];
  const e = smartExample();
  p.push(rect(20, 18, W - 40, 44, { fill: C.signalWash, stroke: C.signal, sw: 1, rx: 2 }));
  p.push(text(36, 45, 'Vague', { size: 11, weight: 700, fill: C.signalText, label: true }));
  p.push(text(110, 45, '“Grow our online sales.”', { size: 14, serif: true, italic: true, fill: C.ink }));
  const cols = smartTests();
  const cw = (W - 40) / cols.length;
  cols.forEach(([l, word, test, ex], i) => {
    const x = 20 + i * cw;
    p.push(rect(x, 78, cw - 8, 236, { fill: C.white, stroke: C.rule, sw: 1, rx: 2 }));
    p.push(text(x + 14, 122, l, { size: 40, weight: 700, serif: true, italic: true, fill: C.gold }));
    p.push(text(x + 14, 148, word, { size: 13.5, weight: 700, fill: C.ink }));
    p.push(para(x + 14, 170, test, 21, { size: 11, fill: C.body }));
    p.push(line(id, x + 14, 240, x + cw - 22, 240, { stroke: C.hair, sw: 1 }));
    p.push(para(x + 14, 260, ex, 21, { size: 11, weight: 600, fill: C.greenText }));
  });
  p.push(rect(20, 330, W - 40, 62, { fill: C.greenWash, stroke: C.green, sw: 1, rx: 2 }));
  p.push(text(36, 352, 'SMART', { size: 11, weight: 700, fill: C.greenText, label: true }));
  p.push(para(110, 352, `“Raise online sales revenue from $${num(e.from)} to $${num(e.to)} a month, a rise of ${e.pct}%, by the end of June next year, led by the e-commerce manager.”`, 92, { size: 12.5, serif: true, italic: true, fill: C.ink }));
  p.push(text(W - 20, H - 8, 'A fictional business. SMART tests how a target is written, not whether it is the right target.', { size: 10.5, italic: true, fill: C.slate, anchor: 'end' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'SMART objectives',
      desc: `A vague aim, grow our online sales, rewritten to pass five tests. Specific: it names online sales revenue, not just sales. Measurable: from $${num(e.from)} to $${num(e.to)} a month, a rise of ${e.pct}%. Achievable: a similar push last year added 12%, so the target is a stretch but within reach. Relevant: it supports the plan to grow online (some versions use realistic for R). Time-bound: by the end of June next year. The SMART version reads: raise online sales revenue from $${num(e.from)} to $${num(e.to)} a month, a rise of ${e.pct}%, by the end of June next year, led by the e-commerce manager. The business is fictional, and SMART tests how a target is written, not whether it is the right target.`,
    },
    p.join(''),
  );
}

/* ---------- The anatomy of a business plan (toolkit) ---------- */
const PLAN_SECTIONS: Array<[string, string]> = [
  ['Executive summary', 'The business, the opportunity and what is asked for, on one page'],
  ['The business', 'Its aims, objectives, legal form and owners'],
  ['The market', 'Customers, size, competitors and the research behind them'],
  ['Marketing plan', 'Product, price, promotion and place for the target market'],
  ['Operations', 'Premises, suppliers, production and location'],
  ['People', 'Managers, staff, skills and structure'],
  ['Finance', 'Costs, funding, sales and cash flow forecasts, break-even'],
  ['Risks', 'What could go wrong, and the contingency plans'],
];
const PLAN_READERS: Array<[string, string, Tone]> = [
  ['The owners', 'A route to follow and targets to check progress against', 'gold'],
  ['Lenders', 'Evidence the loan can be repaid: cash flow, profit, security', 'ink'],
  ['Investors', 'Growth, the return on their money, and the people behind it', 'cobalt'],
  ['Staff and partners', 'Where the business is going, and their part in it', 'green'],
];

function businessPlan(id: string): string {
  const W = 740;
  const H = 452;
  const p: string[] = [];
  const sections = PLAN_SECTIONS;
  // The plan as a document: a sheet with a ruled contents list.
  p.push(rect(26, 22, 432, 404, { fill: C.white, stroke: C.rule, sw: 1, rx: 2 }));
  p.push(rect(26, 22, 432, 6, { fill: C.ink }));
  p.push(text(46, 56, 'Business plan', { size: 17, weight: 700, serif: true, fill: C.ink }));
  sections.forEach(([n, d], i) => {
    const y = 76 + i * 43;
    p.push(line(id, 46, y, 438, y, { stroke: C.hair, sw: 1 }));
    p.push(text(46, y + 18, String(i + 1).padStart(2, '0'), { size: 11, weight: 700, fill: C.goldText }));
    p.push(text(74, y + 18, n, { size: 12.5, weight: 700, fill: C.ink }));
    p.push(text(74, y + 34, d, { size: 10.5, fill: C.slate }));
  });
  const readers = PLAN_READERS;
  p.push(text(490, 50, 'Who reads it, and why', { size: 11, weight: 700, fill: C.goldText, label: true }));
  readers.forEach(([n, d, tone], i) => {
    const y = 64 + i * 90;
    p.push(box(490, y, 228, 78, n, { tone, style: 'wash', size: 13, sub: d, subSize: 10.5, align: 'start' }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The anatomy of a business plan',
      desc: 'A business plan drawn as a document with eight sections: 1, an executive summary of the business, the opportunity and what is asked for, on one page; 2, the business, its aims, objectives, legal form and owners; 3, the market, its customers, size and competitors and the research behind them; 4, the marketing plan, product, price, promotion and place for the target market; 5, operations, premises, suppliers, production and location; 6, people, managers, staff, skills and structure; 7, finance, the costs, how they will be funded, forecasts of sales and cash flow, and break-even; 8, risks and the contingency plans. Beside it, its readers: the owners, who want a route and targets; lenders, who want evidence the loan can be repaid; investors, who want growth and a return; and staff and partners, who want to know where the business is going.',
    },
    p.join(''),
  );
}

/* ------------------------------------------------------------------ */
/* Layouts for phones: the same content, 300 wide, text 14 or more     */
/* ------------------------------------------------------------------ */

/** A heading over a group of boxes, wrapped to the width; returns its markup and the room it takes with the gap below. */
const heading = (y: number, s: string, tone: Tone = 'gold') => {
  const b = block(0, y, s, NW, { size: 14, weight: 700, fill: TONES[tone].text });
  return { body: b.body, h: b.h + 8 };
};

/** Text under the drawing, and the height it takes. */
const footnote = (y: number, s: string) => block(0, y, s, NW, { italic: true, fill: C.slate });

function fiveForcesNarrow(id: string): string {
  const centre = stack(id, [{ title: FIVE.rivalry[0], text: FIVE.rivalry[1], tone: 'ink', solid: true }]);
  const others = stack(
    id,
    (['entrants', 'suppliers', 'buyers', 'substitutes'] as const).map((k) => ({ title: FIVE[k][0], text: FIVE[k][1] })),
    { top: centre.h + 26, x: 22 },
  );
  // Every other force presses on the rivalry at the centre: one arrow up the side to it.
  const arrow = line(id, 10, centre.h + 26 + others.h - 18, 10, centre.h + 6, { tone: 'gold', sw: 2, arrow: 'end' });
  const n = footnote(centre.h + 26 + others.h + 10, 'The stronger the forces, the less profit an average firm in the industry can expect to earn.');
  return narrowFrame(id, fiveForces(id), centre.h + 36 + others.h + n.h + 4, centre.body + text(26, centre.h + 18, 'pressed on by', { size: 14, italic: true, fill: C.goldText }) + arrow + others.body + n.body);
}

function valueChainNarrow(id: string): string {
  const h1 = heading(0, 'Support activities, across all the others');
  const p: string[] = [h1.body];
  const sup = stack(id, VC_SUPPORT.map(([title, text]) => ({ title, text })), { top: h1.h });
  p.push(sup.body);
  let y = h1.h + sup.h + 20;
  const h2 = heading(y, 'Primary activities, in order');
  p.push(h2.body);
  const pri = stack(id, VC_PRIMARY.map(([title, text], i) => ({ title, text, mark: String(i + 1) })), { top: y + h2.h, arrows: true, gap: 18 });
  p.push(pri.body);
  y += h2.h + pri.h + 12;
  const m = stack(id, [{ title: 'Margin', text: 'What customers pay, less the cost of all the activities', tone: 'gold' }], { top: y });
  p.push(m.body);
  y += m.h;
  const n = footnote(y + 10, 'An advantage comes from doing some activities more cheaply than rivals, or better in ways customers will pay for, and from how well they link.');
  p.push(n.body);
  return narrowFrame(id, valueChain(id), y + 14 + n.h, p.join(''));
}

function sevenSNarrow(id: string): string {
  const p: string[] = [];
  const centre = stack(id, [{ title: 'Shared values', text: 'The beliefs at the centre, linked to every other element', tone: 'gold' }]);
  p.push(centre.body);
  let y = centre.h + 18;
  for (const kind of ['hard', 'soft'] as const) {
    const hd = heading(y, kind === 'hard' ? 'Hard elements: easier to define and change' : 'Soft elements: harder to see, slower to change', kind === 'hard' ? 'ink' : 'gold');
    p.push(hd.body);
    const g = stack(
      id,
      SEVEN_S.filter(([, , k]) => k === kind).map(([title, text]) => ({ title, text, tone: kind === 'hard' ? ('ink' as Tone) : undefined, solid: kind === 'hard' })),
      { top: y + hd.h },
    );
    p.push(g.body);
    y += hd.h + g.h + 16;
  }
  const n = footnote(y, 'Each element is linked to all the others, so changing one, such as the structure, means checking the rest.');
  p.push(n.body);
  return narrowFrame(id, sevenS(id), y + n.h + 4, p.join(''));
}

function canvasNarrow(id: string): string {
  const p: string[] = [];
  let y = 0;
  const groups: Array<[string, string[]]> = [
    ['Whom it serves, and how it earns', ['segments', 'value', 'channels', 'relationships', 'revenue']],
    ['How it delivers, and what it costs', ['resources', 'activities', 'partners', 'costs']],
  ];
  for (const [label, keys] of groups) {
    const hd = heading(y, label);
    p.push(hd.body);
    const g = stack(
      id,
      keys.map((k) => {
        const [title, q, order] = CANVAS[k]!;
        return { title, text: q, mark: String(order), tone: (k === 'value' ? 'gold' : k === 'segments' ? 'cobalt' : k === 'revenue' ? 'green' : 'ink') as Tone };
      }),
      { top: y + hd.h },
    );
    p.push(g.body);
    y += hd.h + g.h + 16;
  }
  const n = footnote(y, 'Numbers: a common order for filling it in.');
  p.push(n.body);
  return narrowFrame(id, canvas(id), y + n.h + 4, p.join(''));
}

function scorecardNarrow(id: string): string {
  const p: string[] = [];
  const head = stack(id, [{ title: 'Vision and strategy', text: 'Each perspective sets objectives and measures for it', tone: 'ink', solid: true }]);
  p.push(head.body);
  // Financial at the top, learning at the bottom: read upwards for cause and effect.
  const order = ['financial', 'customer', 'internal', 'learning'];
  const g = stack(
    id,
    order.map((k) => {
      const [title, q, measures, tone] = SCORECARD[k]!;
      return { title, text: `${q} Measures: ${measures}.`, tone };
    }),
    { top: head.h + 16, arrows: false, gap: 22 },
  );
  p.push(g.body);
  let y = head.h + 16 + g.h;
  const n = footnote(y + 10, 'Read upwards for cause and effect: people and systems improve processes, which win customers, which deliver the financial results.');
  p.push(n.body);
  y += 14 + n.h;
  return narrowFrame(id, scorecard(id), y, p.join(''));
}

function pestleNarrow(id: string): string {
  const n = factorCounts();
  const p: string[] = [];
  const head = block(0, 0, `PEST: ${n.pest} factors. PESTLE: ${n.pestle}. STEEPLE: ${n.steeple}.`, NW, { weight: 700, fill: C.ink });
  p.push(head.body);
  let y = head.h + 12;
  for (const r of PESTLE_ROWS) {
    const where = r.pest ? 'In PEST, PESTLE and STEEPLE' : r.pestle ? 'In PESTLE and STEEPLE' : 'In STEEPLE only';
    const about = block(12, 0, r.about, NW - 24);
    const h = 12 + 18 + about.h + 4 + 18 + 10;
    const ethical = r.factor === 'Ethical';
    p.push(rect(0, y, NW, h, { fill: ethical ? C.goldWash : C.white, stroke: ethical ? C.gold : C.rule, sw: 1.1, rx: 2 }));
    p.push(text(12, y + 26, r.factor, { size: 15, weight: 700, fill: C.ink }));
    p.push(block(12, y + 34, r.about, NW - 24).body);
    p.push(text(12, y + 34 + about.h + 18, where, { size: 14, weight: 600, fill: ethical ? C.goldText : C.slate }));
    y += h + 6;
  }
  const f = footnote(y + 6, 'STEEPLE is PESTLE with ethics added as a factor of its own. The IB toolkit uses STEEPLE.');
  p.push(f.body);
  return narrowFrame(id, pestleSteeple(id), y + 10 + f.h, p.join(''));
}

function kotterNarrow(id: string): string {
  const p: string[] = [];
  let y = 0;
  for (const [a, b, label, tone] of KOTTER_PHASES) {
    const hd = heading(y, label, tone);
    p.push(hd.body);
    const g = stack(
      id,
      KOTTER_STEPS.slice(a, b + 1).map((title, k) => ({ title, mark: String(a + k + 1), tone })),
      { top: y + hd.h, arrows: true, gap: 16 },
    );
    p.push(g.body);
    y += hd.h + g.h + 18;
  }
  const n = footnote(y, 'Each step builds on the one before. Skipping a step, or declaring victory too soon, is a common way for change to fail.');
  p.push(n.body);
  return narrowFrame(id, kotter(id), y + n.h + 4, p.join(''));
}

function lewinNarrow(id: string): string {
  const g = stack(
    id,
    LEWIN_STAGES.map(([name, state, tone, acts], i) => ({ title: `${name}: ${state.toLowerCase()}`, text: acts.join('. ') + '.', tone: tone as Tone, mark: String(i + 1) })),
    { arrows: true, gap: 20 },
  );
  const n = footnote(g.h + 12, 'Lewin also gave force field analysis: unfreezing works by strengthening the forces for a change or weakening those against it.');
  return narrowFrame(id, lewin(id), g.h + 16 + n.h, g.body + n.body);
}

function raciNarrow(id: string): string {
  const m = RACI_EXAMPLE;
  const p: string[] = [];
  const head = block(0, 0, 'Opening a second branch of Kettle and Crumb, a fictional café', NW, { weight: 700, fill: C.ink });
  p.push(head.body);
  let y = head.h + 12;
  const WORDS: Record<RaciLetter, string> = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
  for (const t of m.tasks) {
    const lines = (['R', 'A', 'C', 'I'] as RaciLetter[])
      .map((l) => [l, m.roles.filter((_, j) => t.cells[j] === l)] as const)
      .filter(([, who]) => who.length)
      .map(([l, who]) => block(40, 0, `${WORDS[l]}: ${who.join(', ')}`, NW - 52));
    const h = 14 + 18 + 6 + lines.reduce((sum, b) => sum + b.h + 4, 0) + 6;
    p.push(rect(0, y, NW, h, { fill: C.white, stroke: C.rule, sw: 1.1, rx: 2 }));
    p.push(text(12, y + 28, t.task, { size: 15, weight: 700, fill: C.ink }));
    let yy = y + 38;
    (['R', 'A', 'C', 'I'] as RaciLetter[]).forEach((l) => {
      const who = m.roles.filter((_, j) => t.cells[j] === l);
      if (!who.length) return;
      const b = block(40, yy, `${WORDS[l]}: ${who.join(', ')}`, NW - 52);
      p.push(rect(12, yy, 20, 20, { fill: l === 'R' ? C.ink : l === 'A' ? C.goldWash : l === 'C' ? C.cobaltWash : C.white, stroke: l === 'A' ? C.gold : l === 'C' ? C.cobalt : C.slate, sw: 1.2, rx: 2 }));
      p.push(text(22, yy + 15, l, { size: 14, weight: 700, fill: l === 'R' ? C.white : l === 'A' ? C.goldText : l === 'C' ? C.cobaltText : C.slate, anchor: 'middle' }));
      p.push(b.body);
      yy += b.h + 4;
    });
    y += h + 8;
  }
  const n = footnote(y + 4, 'One person is accountable for each task, and at least one is responsible for doing it.');
  p.push(n.body);
  return narrowFrame(id, raci(id), y + 8 + n.h, p.join(''));
}

function smartNarrow(id: string): string {
  const e = smartExample();
  const p: string[] = [];
  const vague = stack(id, [{ title: 'Vague: “Grow our online sales.”', tone: 'signal' }]);
  p.push(vague.body);
  const tests = stack(
    id,
    smartTests().map(([l, word, test, ex]) => ({ mark: l, title: word, text: `${test} Here: ${ex}.` })),
    { top: vague.h + 12 },
  );
  p.push(tests.body);
  let y = vague.h + 12 + tests.h + 12;
  const good = stack(id, [{ title: 'SMART', text: `“Raise online sales revenue from $${num(e.from)} to $${num(e.to)} a month, a rise of ${e.pct}%, by the end of June next year, led by the e-commerce manager.”`, tone: 'green' }], { top: y });
  p.push(good.body);
  y += good.h;
  const n = footnote(y + 10, 'A fictional business. SMART tests how a target is written, not whether it is the right target.');
  p.push(n.body);
  return narrowFrame(id, smart(id), y + 14 + n.h, p.join(''));
}

function businessPlanNarrow(id: string): string {
  const h1 = heading(0, 'Its sections', 'ink');
  const p: string[] = [h1.body];
  const g = stack(id, PLAN_SECTIONS.map(([title, text], i) => ({ title, text, mark: String(i + 1) })), { top: h1.h, gap: 6 });
  p.push(g.body);
  let y = h1.h + g.h + 20;
  const h2 = heading(y, 'Who reads it, and why');
  p.push(h2.body);
  const r = stack(id, PLAN_READERS.map(([title, text, tone]) => ({ title, text, tone })), { top: y + h2.h });
  p.push(r.body);
  y += h2.h + r.h;
  return narrowFrame(id, businessPlan(id), y + 4, p.join(''));
}

export const FRAMEWORK_FIGURES: Record<string, DiagramDef> = {
  'five-forces': { title: 'Porter’s five forces', caption: 'The five forces that shape how profitable an industry can be.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: fiveForces, narrow: fiveForcesNarrow },
  'value-chain': { title: 'The value chain', caption: 'Primary and support activities, and the margin they create.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: valueChain, narrow: valueChainNarrow },
  'mckinsey-7s': { title: 'The McKinsey 7S model', caption: 'Seven elements that must fit together, with shared values at the centre.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: sevenS, narrow: sevenSNarrow },
  'business-model-canvas': { title: 'The business model canvas', caption: 'Nine blocks that describe how a business creates, delivers and captures value.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: canvas, narrow: canvasNarrow },
  'balanced-scorecard': { title: 'The balanced scorecard', caption: 'Four perspectives on performance, linked to the strategy.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: scorecard, narrow: scorecardNarrow },
  'pestle-steeple': { title: 'PEST, PESTLE and STEEPLE', caption: 'Which external factors each framework covers.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: pestleSteeple, narrow: pestleNarrow },
  'kotter-eight-steps': { title: 'Kotter’s eight steps', caption: 'A staircase of steps for leading change, in three phases.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: kotter, narrow: kotterNarrow },
  'lewin-change-model': { title: 'Lewin’s change model', caption: 'Unfreeze, change, refreeze.', syllabus: [], level: 'SL/HL', group: 'enrichment', render: lewin, narrow: lewinNarrow },
  'raci-matrix': { title: 'A RACI matrix', caption: 'Who is responsible, accountable, consulted and informed, task by task.', syllabus: [], level: 'SL/HL', group: 'enrichment', fictional: true, render: raci, narrow: raciNarrow },
  'smart-objectives': { title: 'SMART objectives', caption: 'A vague aim rewritten to pass five tests.', syllabus: [], level: 'SL/HL', group: 'enrichment', fictional: true, render: smart, narrow: smartNarrow },
  'business-plan': { title: 'The anatomy of a business plan', caption: 'Its usual sections, and what each reader looks for.', syllabus: ['1.1'], level: 'SL/HL', group: 'toolkit', render: businessPlan, narrow: businessPlanNarrow },
};
