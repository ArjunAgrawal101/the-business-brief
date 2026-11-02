/**
 * Unit 5 diagrams: operations management. Figures are fictional and every
 * value on a chart is computed here from the stated assumptions.
 */
import type { DiagramDef } from '../diagrams';
import { C, TONES, arrowPath, axes, box, circle, fictionNote, frame, legend, line, num, para, path, plot, poly, rect, smooth, span, sx, sy, text, type Axes } from './kit';

/* ---------- Break-even: one set of assumptions for both charts ---------- */
const BE = { price: 25, vc: 15, fc: 20000, sales: 3000, cap: 4000 };
const beq = (price: number, vc: number, fc: number) => fc / (price - vc);

function breakEvenChart(id: string, opts: { price2?: number }): string {
  const W = 720;
  const H = 440;
  const yMax = opts.price2 ? 120000 : 100000;
  const a: Axes = { x: 88, y: 46, w: 500, h: 320, x0: 0, x1: BE.cap, y0: 0, y1: yMax };
  const tc = (q: number) => BE.fc + BE.vc * q;
  const q1 = beq(BE.price, BE.vc, BE.fc);
  const p: string[] = [];
  const yTicks = [];
  for (let v = 0; v <= yMax; v += 20000) yTicks.push({ v, label: v === 0 ? '0' : `$${num(v / 1000)}k` });
  const xTicks = [0, 1000, 2000, 3000, 4000].map((v) => ({ v, label: num(v) }));
  p.push(axes(id, a, { xLabel: 'Output and sales (units)', yLabel: 'Costs and revenue ($)', xTicks, yTicks, grid: true }));

  if (!opts.price2) {
    // Loss and profit areas between total revenue and total cost.
    p.push(poly([[sx(a, 0), sy(a, 0)], [sx(a, 0), sy(a, BE.fc)], [sx(a, q1), sy(a, tc(q1))]], { fill: C.signalWash }));
    p.push(poly([[sx(a, q1), sy(a, tc(q1))], [sx(a, BE.cap), sy(a, BE.price * BE.cap)], [sx(a, BE.cap), sy(a, tc(BE.cap))]], { fill: C.greenWash }));
    p.push(text(sx(a, 720), sy(a, 24000) + 4, 'Loss', { size: 12.5, weight: 700, fill: C.signalText, anchor: 'middle' }));
    p.push(text(sx(a, 3620), sy(a, 84000), 'Profit', { size: 12.5, weight: 700, fill: C.greenText, anchor: 'middle' }));
  }

  // Lines: fixed costs, total costs, total revenue.
  p.push(plot(a, [[0, BE.fc], [BE.cap, BE.fc]], { stroke: C.slate, sw: 2, dash: '7 5' }));
  p.push(plot(a, [[0, BE.fc], [BE.cap, tc(BE.cap)]], { stroke: C.ink, sw: 2.4 }));
  p.push(plot(a, [[0, 0], [BE.cap, BE.price * BE.cap]], { stroke: C.cobalt, sw: 2.4 }));
  p.push(text(sx(a, BE.cap) + 8, sy(a, BE.fc) + 4, 'Fixed costs', { size: 12, weight: 600, fill: C.slate }));
  p.push(text(sx(a, BE.cap) + 8, sy(a, tc(BE.cap)) + 4, 'Total costs', { size: 12, weight: 600, fill: C.ink }));
  p.push(text(sx(a, BE.cap) + 8, sy(a, BE.price * BE.cap) + 4, opts.price2 ? `TR at $${BE.price}` : 'Total revenue', { size: 12, weight: 600, fill: C.cobaltText }));

  // Break-even point.
  const bx = sx(a, q1);
  const by = sy(a, BE.price * q1);
  p.push(line(id, bx, by, bx, sy(a, 0), { stroke: C.gold, sw: 1.3, dash: '4 4' }));
  p.push(circle(bx, by, 5.5, { fill: C.gold, stroke: C.white, sw: 2 }));

  if (opts.price2) {
    const q2 = beq(opts.price2, BE.vc, BE.fc);
    p.push(plot(a, [[0, 0], [BE.cap, opts.price2 * BE.cap]], { stroke: C.green, sw: 2.4 }));
    p.push(text(sx(a, BE.cap) + 8, sy(a, opts.price2 * BE.cap) + 4, `TR at $${opts.price2}`, { size: 12, weight: 600, fill: C.greenText }));
    const bx2 = sx(a, q2);
    const by2 = sy(a, opts.price2 * q2);
    p.push(line(id, bx2, by2, bx2, sy(a, 0), { stroke: C.green, sw: 1.3, dash: '4 4' }));
    p.push(circle(bx2, by2, 5.5, { fill: C.green, stroke: C.white, sw: 2 }));
    p.push(text(bx2 - 6, sy(a, 0) - 8, `${num(Math.ceil(q2))} units`, { size: 11.5, weight: 700, fill: C.greenText, anchor: 'end' }));
    p.push(text(bx + 6, sy(a, 0) - 8, `${num(q1)} units`, { size: 11.5, weight: 700, fill: C.goldText }));
    p.push(arrowPath(id, `M${bx - 4},${sy(a, 0) - 30} L${bx2 + 6},${sy(a, 0) - 30}`, { tone: 'green', sw: 1.5 }));
    p.push(text((bx + bx2) / 2, sy(a, 0) - 37, 'Break-even falls', { size: 11.5, weight: 600, fill: C.greenText, anchor: 'middle' }));
    p.push(
      legend(a.x, H - 14, [
        { label: `Price $${BE.price}: break-even ${num(q1)} units`, stroke: C.cobalt },
        { label: `Price $${opts.price2}: break-even ${num(Math.ceil(q2))} units (${num(q2, 1)} rounded up)`, stroke: C.green },
      ]),
    );
    p.push(fictionNote(W - 16, 22, `Fictional: fixed costs $${num(BE.fc)}, variable cost $${BE.vc} a unit.`));
    return frame(
      {
        id,
        w: W,
        h: H,
        title: 'The effect of a price rise on the break-even quantity',
        desc: `Break-even chart with fixed costs of $${num(BE.fc)} and a variable cost of $${BE.vc} a unit. At a price of $${BE.price} total revenue meets total costs at ${num(q1)} units. When the price rises to $${opts.price2}, the total revenue line becomes steeper and meets total costs at ${num(q2, 1)} units, rounded up to ${num(Math.ceil(q2))}. A higher price lowers the break-even quantity, although sales may fall at the higher price.`,
      },
      p.join(''),
    );
  }

  // Break-even label, margin of safety at current sales.
  p.push(text(bx - 12, by - 30, `Break-even point`, { size: 12, weight: 700, fill: C.goldText, anchor: 'end' }));
  p.push(text(bx - 12, by - 15, `${num(q1)} units, $${num(BE.price * q1)}`, { size: 11.5, fill: C.goldText, anchor: 'end' }));
  const sxs = sx(a, BE.sales);
  p.push(line(id, sxs, sy(a, BE.price * BE.sales), sxs, sy(a, 0), { stroke: C.ink, sw: 1.2, dash: '2 4' }));
  p.push(text(sxs - 12, sy(a, 30000), `Current sales ${num(BE.sales)} units`, { size: 11, fill: C.slate, anchor: 'middle', rotate: -90 }));
  p.push(span(id, bx, sy(a, 0) - 14, sxs, sy(a, 0) - 14, `Margin of safety ${num(BE.sales - q1)} units`, { tone: 'gold', side: 'above', size: 11 }));
  // Profit at current sales.
  const profit = BE.sales * (BE.price - BE.vc) - BE.fc;
  p.push(line(id, sxs + 14, sy(a, BE.price * BE.sales) + 2, sxs + 14, sy(a, tc(BE.sales)) - 2, { tone: 'green', sw: 1.3, arrow: 'both' }));
  p.push(text(sxs + 20, sy(a, tc(BE.sales)) + 18, `Profit at current sales $${num(profit)}`, { size: 11, weight: 600, fill: C.greenText }));
  p.push(fictionNote(W - 16, 22, `Fictional: price $${BE.price}, variable cost $${BE.vc} a unit, fixed costs $${num(BE.fc)}.`));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The break-even chart',
      desc: `Break-even chart for a fictional product selling at $${BE.price} with a variable cost of $${BE.vc} a unit and fixed costs of $${num(BE.fc)}. Fixed costs are a horizontal line at $${num(BE.fc)}. Total costs start at $${num(BE.fc)} and rise by $${BE.vc} a unit. Total revenue starts at zero and rises by $${BE.price} a unit. The lines cross at the break-even point, ${num(q1)} units and $${num(BE.price * q1)} of revenue. Below that output the gap between the lines is a loss; above it, a profit. At current sales of ${num(BE.sales)} units the margin of safety is ${num(BE.sales - q1)} units and the profit is $${num(profit)}.`,
    },
    p.join(''),
  );
}

/* ---------- Stock control ---------- */
function stockControl(id: string): string {
  const W = 720;
  const H = 400;
  const S = { max: 1000, buffer: 200, usage: 200, lead: 2 };
  const reorderQty = S.max - S.buffer;
  const reorderLevel = S.buffer + S.usage * S.lead;
  const cycle = reorderQty / S.usage; // weeks
  const a: Axes = { x: 84, y: 40, w: 520, h: 280, x0: 0, x1: 12, y0: 0, y1: 1200 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Time (weeks)', yLabel: 'Stock (units)', xTicks: [0, 2, 4, 6, 8, 10, 12].map((v) => ({ v, label: String(v) })), yTicks: [0, 200, 400, 600, 800, 1000, 1200].map((v) => ({ v, label: num(v) })), grid: true }));
  // Reference levels.
  const ref = (v: number, label: string, tone: 'signal' | 'gold' | 'ink') => {
    p.push(plot(a, [[0, v], [12, v]], { stroke: TONES[tone].line, sw: 1.4, dash: '6 5' }));
    p.push(text(sx(a, 12) + 8, sy(a, v) + 4, label, { size: 11.5, weight: 600, fill: TONES[tone].text }));
  };
  ref(S.max, 'Maximum stock', 'ink');
  ref(reorderLevel, 'Reorder level', 'gold');
  ref(S.buffer, 'Buffer stock', 'signal');
  // The saw-tooth.
  const pts: Array<[number, number]> = [];
  for (let t = 0; t < 12; t += cycle) {
    pts.push([t, S.max], [t + cycle, S.buffer]);
  }
  pts.push([12, S.max]);
  p.push(plot(a, pts, { stroke: C.cobalt, sw: 2.4 }));
  // Order placed and lead time in the first cycle.
  const tOrder = (S.max - reorderLevel) / S.usage;
  p.push(circle(sx(a, tOrder), sy(a, reorderLevel), 5, { fill: C.gold, stroke: C.white, sw: 2 }));
  p.push(text(sx(a, tOrder) - 8, sy(a, reorderLevel) + 20, 'Order placed', { size: 11.5, weight: 600, fill: C.goldText, anchor: 'end' }));
  p.push(span(id, sx(a, tOrder), sy(a, 80), sx(a, cycle), sy(a, 80), `Lead time ${S.lead} weeks`, { tone: 'gold', side: 'above', size: 11 }));
  p.push(line(id, sx(a, cycle) + 14, sy(a, S.buffer), sx(a, cycle) + 14, sy(a, S.max), { tone: 'cobalt', sw: 1.3, arrow: 'both' }));
  p.push(text(sx(a, cycle) + 4, sy(a, S.max) - 22, `Delivery: the reorder quantity, ${num(reorderQty)} units`, { size: 11.5, weight: 600, fill: C.cobaltText }));
  p.push(line(id, sx(a, cycle) + 10, sy(a, S.max) - 18, sx(a, cycle) + 14, sy(a, S.max) - 6, { tone: 'cobalt', sw: 1 }));
  p.push(fictionNote(W - 16, H - 12, `Fictional: usage ${S.usage} units a week, lead time ${S.lead} weeks.`));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A stock control chart',
      desc: `Stock control chart over 12 weeks. Stock falls steadily from a maximum of ${num(S.max)} units at ${S.usage} units a week. An order is placed when stock reaches the reorder level of ${reorderLevel} units, the buffer stock of ${S.buffer} plus ${S.lead} weeks of usage. The order of ${reorderQty} units, the reorder quantity, arrives after the ${S.lead}-week lead time, just as stock reaches the buffer stock, taking stock back to the maximum. The cycle repeats every ${cycle} weeks.`,
    },
    p.join(''),
  );
}

/* ---------- Operations methods ---------- */
function operationsMethods(id: string): string {
  const W = 680;
  const H = 420;
  const a: Axes = { x: 80, y: 40, w: 500, h: 300, x0: 0, x1: 10, y0: 0, y1: 10 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Volume of output', yLabel: 'Variety of products', xTicks: [{ v: 1, label: 'Low' }, { v: 9, label: 'High' }], yTicks: [{ v: 1, label: 'Low' }, { v: 9, label: 'High' }] }));
  // The usual trade-off band: high variety with low volume, or high volume with low variety.
  p.push(path(`M${sx(a, 0.4)},${sy(a, 9.6)} L${sx(a, 9.6)},${sy(a, 0.4)}`, { stroke: C.rule, sw: 34, opacity: 0.35 }));
  const dot = (vx: number, vy: number, label: string, sub: string, tone: 'ink' | 'gold' | 'cobalt' | 'green', side: 'right' | 'left' = 'right', max = 30) => {
    p.push(circle(sx(a, vx), sy(a, vy), 9, { fill: TONES[tone].line, stroke: C.white, sw: 2.5 }));
    const tx = side === 'right' ? sx(a, vx) + 16 : sx(a, vx) - 16;
    p.push(text(tx, sy(a, vy) - 2, label, { size: 13.5, weight: 700, fill: TONES[tone].text, anchor: side === 'right' ? 'start' : 'end', serif: true }));
    p.push(para(tx, sy(a, vy) + 14, sub, max, { size: 11.5, fill: C.slate, anchor: side === 'right' ? 'start' : 'end' }));
  };
  dot(1.6, 8.4, 'Job production', 'One-off, made to the customer’s order', 'ink', 'right', 24);
  dot(5, 5, 'Batch production', 'Groups of identical items, then a change of line', 'gold');
  dot(8.4, 1.6, 'Mass (flow) production', 'Continuous, standardized, high volume', 'cobalt', 'left');
  dot(8.4, 8.4, 'Mass customization', 'High volume with choices built in', 'green', 'left', 20);
  p.push(arrowPath(id, `M${sx(a, 8.2)},${sy(a, 2.6)} C${sx(a, 9.4)},${sy(a, 4.6)} ${sx(a, 9.4)},${sy(a, 6.4)} ${sx(a, 8.5)},${sy(a, 7.5)}`, { tone: 'green', sw: 1.5, dash: '5 4' }));
  p.push(text(sx(a, 9.5), sy(a, 5) + 4, 'Flexible technology', { size: 11, fill: C.greenText, anchor: 'end', rotate: -90 }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Operations methods by volume and variety',
      desc: 'Chart placing the four operations methods by volume of output and variety of products. Job production sits at low volume and high variety. Batch production sits in the middle. Mass or flow production sits at high volume and low variety. These three lie along the usual trade-off between volume and variety. Mass customization sits at high volume and high variety, breaking the trade-off with flexible technology.',
    },
    p.join(''),
  );
}

/* ---------- Quality control and quality assurance ---------- */
function qcQa(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const stages = ['Inputs', 'Process 1', 'Process 2', 'Finished goods'];
  const row = (y: number, title: string, sub: string, tone: 'signal' | 'green', checks: number[]) => {
    p.push(text(20, y - 34, title, { size: 15, weight: 700, serif: true, fill: C.ink }));
    p.push(text(20, y - 16, sub, { size: 11.5, fill: C.slate }));
    stages.forEach((s, i) => {
      const x = 20 + i * 176;
      p.push(box(x, y, 136, 46, s, { tone: 'ink', style: 'outline', size: 12.5 }));
      if (i < stages.length - 1) p.push(line(id, x + 138, y + 23, x + 174, y + 23, { arrow: 'end', sw: 1.4 }));
    });
    for (const i of checks) {
      const x = 20 + i * 176 + 68;
      p.push(circle(x, y + 70, 13, { fill: TONES[tone].wash, stroke: TONES[tone].line, sw: 1.4 }));
      p.push(text(x, y + 74.5, '✓', { size: 13, weight: 700, fill: TONES[tone].text, anchor: 'middle' }));
      p.push(line(id, x, y + 48, x, y + 56, { tone, sw: 1.2 }));
    }
  };
  row(70, 'Quality control', 'Inspection after production finds defects; faulty items are reworked or scrapped.', 'signal', [3]);
  row(220, 'Quality assurance', 'Quality is built into every stage, checked by the people doing the work, to prevent defects.', 'green', [0, 1, 2, 3]);
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Quality control and quality assurance',
      desc: 'Two production lines, each running from inputs through two processes to finished goods. Under quality control, the only check is an inspection of the finished goods, which finds defects after they are made. Under quality assurance, there is a check at every stage, carried out by the people doing the work, so that defects are prevented rather than found.',
    },
    p.join(''),
  );
}

/* ---------- Kaizen and innovation ---------- */
function kaizen(id: string): string {
  const W = 680;
  const H = 360;
  const a: Axes = { x: 70, y: 40, w: 520, h: 250, x0: 0, x1: 12, y0: 0, y1: 10 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Time', yLabel: 'Performance (quality, cost, speed)' }));
  const steps: Array<[number, number]> = [];
  let v = 2;
  for (let t = 0; t < 12; t++) {
    steps.push([t, v], [t + 1, v]);
    v += 0.5;
  }
  p.push(plot(a, steps, { stroke: C.green, sw: 2.4 }));
  p.push(plot(a, [[0, 2], [6, 2], [6, 6.6], [12, 6.6]], { stroke: C.slate, sw: 2, dash: '7 5' }));
  p.push(text(sx(a, 9.4), sy(a, 7.9) - 12, 'Kaizen: many small improvements,', { size: 12, weight: 600, fill: C.greenText, anchor: 'middle' }));
  p.push(text(sx(a, 9.4), sy(a, 7.9) + 3, 'every week, by everyone', { size: 12, weight: 600, fill: C.greenText, anchor: 'middle' }));
  p.push(text(sx(a, 6) + 8, sy(a, 4.4), 'One large change', { size: 12, weight: 600, fill: C.slate }));
  p.push(text(sx(a, 6) + 8, sy(a, 4.4) + 15, '(new machine, new method)', { size: 11.5, fill: C.slate }));
  p.push(legend(a.x, H - 12, [{ label: 'Continuous improvement (kaizen)', stroke: C.green }, { label: 'Occasional step change', stroke: C.slate, dash: '7 5' }]));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Kaizen: continuous improvement',
      desc: 'Performance over time under two approaches. Kaizen is a staircase of many small, regular improvements suggested by all workers, which together raise performance steadily. The alternative is a flat line followed by one large step, such as a new machine or method, with little change in between. Over the period shown, the small steps add up to more than the single jump.',
    },
    p.join(''),
  );
}

/* ---------- Just-in-time and just-in-case ---------- */
function jitJic(id: string): string {
  const W = 720;
  const H = 430;
  const p: string[] = [];
  const panel = (top: number, title: string, tone: 'gold' | 'cobalt', pts: Array<[number, number]>, note: string) => {
    const a: Axes = { x: 70, y: top + 26, w: 380, h: 120, x0: 0, x1: 12, y0: 0, y1: 1000 };
    p.push(text(a.x - 2, top + 4, title, { size: 14, weight: 700, serif: true, fill: TONES[tone].text }));
    p.push(axes(id, a, { xLabel: 'Weeks', yLabel: '', xTicks: [0, 4, 8, 12].map((v) => ({ v, label: String(v) })), yTicks: [0, 500, 1000].map((v) => ({ v, label: num(v) })), grid: true }));
    p.push(plot(a, pts, { stroke: TONES[tone].line, sw: 2.2 }));
    p.push(para(486, top + 40, note, 36, { size: 12, fill: C.body }));
  };
  const jic: Array<[number, number]> = [];
  for (let t = 0; t < 12; t += 4) jic.push([t, 900], [t + 4, 300]);
  jic.push([12, 900]);
  const jit: Array<[number, number]> = [];
  for (let t = 0; t < 12; t += 1) jit.push([t, 150], [t + 1, 0]);
  jit.push([12, 150]);
  p.push(text(20, 22, 'Stock held (units)', { size: 11.5, weight: 600, fill: C.slate }));
  panel(44, 'Just in case', 'gold', jic, 'A large delivery every four weeks and a buffer of 300 units: protection against late deliveries and surges in demand, but cash and space tied up in stock.');
  panel(234, 'Just in time', 'cobalt', jit, 'A small delivery every week, used up by the next: little cash in stock and less waste, but no cushion if a supplier is late.');
  p.push(fictionNote(W - 16, 22, 'Illustrative stock levels, same scale in both charts.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Just-in-time and just-in-case stock',
      desc: 'Two charts of stock held over twelve weeks, on the same scale. Just in case: a large delivery every four weeks takes stock to 900 units, and it never falls below a buffer of 300, giving protection against late deliveries and surges in demand but tying up cash and space. Just in time: a small delivery every week brings 150 units that are used up by the end of the week, so little stock is held and less is wasted, but there is no cushion if a supplier is late.',
    },
    p.join(''),
  );
}

/* ---------- Supply chain ---------- */
function supplyChain(id: string): string {
  const W = 720;
  const H = 300;
  const p: string[] = [];
  const stages: Array<[string, string]> = [
    ['Raw materials', 'Farms, mines, forests'],
    ['Suppliers', 'Components and parts'],
    ['Manufacturer', 'Makes the product'],
    ['Distribution', 'Wholesalers, warehouses'],
    ['Retailers', 'Shops and online'],
    ['Customers', 'Buy and use'],
  ];
  const bw = 102;
  const gap = 16;
  stages.forEach(([s, sub], i) => {
    const x = 12 + i * (bw + gap);
    p.push(box(x, 96, bw, 66, s, { tone: i === 2 ? 'gold' : 'ink', style: i === 2 ? 'solid' : 'wash', size: 12.5, sub, subSize: 10.5 }));
    if (i < stages.length - 1) p.push(line(id, x + bw + 2, 129, x + bw + gap - 2, 129, { arrow: 'end', sw: 1.4 }));
  });
  p.push(arrowPath(id, `M${12 + 5.5 * (bw + gap) - gap / 2},${190} C${560},${250} ${150},${250} ${12 + 0.5 * bw},${192}`, { tone: 'cobalt', sw: 1.4, dash: '5 4' }));
  p.push(text(W / 2, 246, 'Information flows back: orders, demand data, feedback', { size: 11.5, fill: C.cobaltText, anchor: 'middle' }));
  p.push(text(12, 40, 'Goods flow forward', { size: 12, weight: 700, fill: C.ink }));
  p.push(para(12, 60, 'A local supply chain keeps these stages in one country or region; a global one spreads them across countries for cost, skills or materials, with longer lead times and more risk of disruption.', 110, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The supply chain',
      desc: 'A supply chain in six stages: raw materials, suppliers of components, the manufacturer, distribution through wholesalers and warehouses, retailers, and customers. Goods flow forward along the chain while information such as orders, demand data and feedback flows back. A local chain keeps the stages in one country or region; a global chain spreads them across countries, which can lower costs but lengthens lead times and adds risk.',
    },
    p.join(''),
  );
}

/* ---------- Reorganizing production ---------- */
function reorganizing(id: string): string {
  const W = 680;
  const H = 470;
  const p: string[] = [];
  const gx = 140;
  const gy = 86;
  const cw = 196;
  const ch = 104;
  const gap = 92;
  const cx = (i: number) => gx + i * (cw + gap);
  const cy = (j: number) => gy + j * (ch + gap);
  p.push(text(cx(1) - gap / 2, 24, 'Who does the work?', { size: 11.5, weight: 700, fill: C.ink, anchor: 'middle', label: true }));
  p.push(text(cx(0) + cw / 2, 62, 'The business itself', { size: 12.5, weight: 600, fill: C.slate, anchor: 'middle' }));
  p.push(text(cx(1) + cw / 2, 62, 'Another firm', { size: 12.5, weight: 600, fill: C.slate, anchor: 'middle' }));
  p.push(text(26, cy(1) - gap / 2, 'Where?', { size: 11.5, weight: 700, fill: C.ink, label: true, rotate: -90, anchor: 'middle' }));
  p.push(text(gx - 14, cy(0) + ch / 2 + 4, 'Home country', { size: 12.5, weight: 600, fill: C.slate, anchor: 'end' }));
  p.push(text(gx - 14, cy(1) + ch / 2 + 4, 'Abroad', { size: 12.5, weight: 600, fill: C.slate, anchor: 'end' }));
  p.push(box(cx(0), cy(0), cw, ch, 'In-house at home', { tone: 'ink', size: 13 }));
  p.push(box(cx(1), cy(0), cw, ch, 'Outsourced to a firm at home', { tone: 'gold', size: 13 }));
  p.push(box(cx(0), cy(1), cw, ch, 'Own operation abroad', { tone: 'gold', size: 13 }));
  p.push(box(cx(1), cy(1), cw, ch, 'Outsourced to a firm abroad', { tone: 'gold', size: 13 }));
  // Across the columns: outsourcing out, insourcing back.
  const hx1 = cx(0) + cw + 8;
  const hx2 = cx(1) - 8;
  const my = cy(0) + ch / 2;
  p.push(line(id, hx1, my - 12, hx2, my - 12, { tone: 'cobalt', sw: 1.8, arrow: 'end' }));
  p.push(text((hx1 + hx2) / 2, my - 20, 'Outsourcing', { size: 11.5, weight: 700, fill: C.cobaltText, anchor: 'middle' }));
  p.push(line(id, hx2, my + 12, hx1, my + 12, { tone: 'green', sw: 1.8, arrow: 'end' }));
  p.push(text((hx1 + hx2) / 2, my + 30, 'Insourcing', { size: 11.5, weight: 700, fill: C.greenText, anchor: 'middle' }));
  // Down the rows: offshoring out, reshoring back.
  const vy1 = cy(0) + ch + 8;
  const vy2 = cy(1) - 8;
  const mx = cx(0) + cw / 2;
  p.push(line(id, mx - 14, vy1, mx - 14, vy2, { tone: 'cobalt', sw: 1.8, arrow: 'end' }));
  p.push(text(mx - 24, (vy1 + vy2) / 2 + 4, 'Offshoring', { size: 11.5, weight: 700, fill: C.cobaltText, anchor: 'end' }));
  p.push(line(id, mx + 14, vy2, mx + 14, vy1, { tone: 'green', sw: 1.8, arrow: 'end' }));
  p.push(text(mx + 24, (vy1 + vy2) / 2 + 4, 'Reshoring', { size: 11.5, weight: 700, fill: C.greenText, anchor: 'start' }));
  p.push(para(gx, cy(1) + ch + 34, 'Outsourcing (subcontracting) and offshoring move work out; insourcing and reshoring bring it back. Outsourcing to a firm abroad is both outsourcing and offshoring.', 80, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Reorganizing production',
      desc: 'A two by two grid. Columns: whether the business does the work itself or another firm does it. Rows: whether the work is done in the home country or abroad. Outsourcing, or subcontracting, moves work from the business to another firm; insourcing brings it back in-house. Offshoring moves work from the home country abroad; reshoring brings it back home. Outsourcing to a firm abroad is both outsourcing and offshoring.',
    },
    p.join(''),
  );
}

/* ---------- Crisis management and contingency planning ---------- */
function crisisTimeline(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const y = 120;
  p.push(line(id, 20, y, 700, y, { sw: 2, arrow: 'end' }));
  p.push(text(700, y + 22, 'Time', { size: 11.5, fill: C.slate, anchor: 'end' }));
  const phase = (x: number, w: number, title: string, when: string, tone: 'cobalt' | 'signal' | 'green', items: string) => {
    p.push(rect(x, y - 52, w, 40, { fill: TONES[tone].wash, stroke: TONES[tone].line, sw: 1.2, rx: 3 }));
    p.push(text(x + w / 2, y - 28, title, { size: 13, weight: 700, fill: TONES[tone].text, anchor: 'middle' }));
    p.push(text(x + w / 2, y - 66, when, { size: 11, fill: C.slate, anchor: 'middle', label: true }));
    p.push(para(x + 4, y + 40, items, Math.floor(w / 6.4), { size: 11.5, fill: C.body }));
  };
  phase(20, 250, 'Contingency planning', 'Before', 'cobalt', 'Identify what could go wrong, plan the response, assign roles, set aside resources, rehearse. It costs time and money, and lowers risk.');
  p.push(poly([[300, y - 14], [312, y - 30], [324, y - 14], [312, y + 2]], { fill: C.signal }));
  p.push(text(312, y + 22, 'The crisis', { size: 11.5, weight: 700, fill: C.signalText, anchor: 'middle' }));
  phase(340, 200, 'Crisis management', 'During', 'signal', 'Respond with transparency, communication, speed and control.');
  phase(560, 140, 'Recovery', 'After', 'green', 'Restore operations, review and improve the plan.');
  p.push(arrowPath(id, `M630,${y + 110} C560,${y + 170} 200,${y + 170} 140,${y + 110}`, { tone: 'green', sw: 1.4, dash: '5 4' }));
  p.push(text(385, y + 178, 'Lessons feed the next plan', { size: 11.5, fill: C.greenText, anchor: 'middle' }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Contingency planning and crisis management',
      desc: 'A timeline in three phases. Before a crisis, contingency planning identifies what could go wrong, plans the response, assigns roles, sets aside resources and rehearses; it costs time and money and lowers risk. During the crisis, crisis management responds with transparency, communication, speed and control. After it, recovery restores operations and reviews the plan, and the lessons feed back into the next contingency plan.',
    },
    p.join(''),
  );
}

/* ---------- Incremental and disruptive innovation ---------- */
function innovation(id: string): string {
  const W = 700;
  const H = 400;
  const a: Axes = { x: 70, y: 40, w: 520, h: 280, x0: 0, x1: 10, y0: 0, y1: 10 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Time', yLabel: 'Product performance' }));
  // What the mainstream market needs: a gently rising band.
  p.push(poly([[sx(a, 0), sy(a, 4.2)], [sx(a, 10), sy(a, 6)], [sx(a, 10), sy(a, 4.6)], [sx(a, 0), sy(a, 2.8)]], { fill: C.sunk }));
  p.push(text(sx(a, 0.3), sy(a, 3.5) + 4, 'What most customers need', { size: 11.5, weight: 600, fill: C.slate }));
  // Incumbent: incremental improvement, overshooting the market.
  p.push(`<path d="${smooth([[sx(a, 0), sy(a, 5.6)], [sx(a, 3), sy(a, 6.8)], [sx(a, 6), sy(a, 8)], [sx(a, 10), sy(a, 9.4)]])}" fill="none" stroke="${C.ink}" stroke-width="2.4"/>`);
  p.push(text(sx(a, 10) + 8, sy(a, 9.4) + 4, 'Incremental', { size: 12, weight: 700, fill: C.ink }));
  p.push(text(sx(a, 10) + 8, sy(a, 9.4) + 19, 'innovation', { size: 12, weight: 700, fill: C.ink }));
  // Disruptor: starts cheaper and worse, improves faster.
  p.push(`<path d="${smooth([[sx(a, 2), sy(a, 1.6)], [sx(a, 4.5), sy(a, 2.9)], [sx(a, 7), sy(a, 4.9)], [sx(a, 10), sy(a, 8.4)]])}" fill="none" stroke="${C.cobalt}" stroke-width="2.4"/>`);
  p.push(text(sx(a, 10) + 8, sy(a, 8.2) + 18, 'Disruptive', { size: 12, weight: 700, fill: C.cobaltText }));
  p.push(text(sx(a, 10) + 8, sy(a, 8.2) + 33, 'innovation', { size: 12, weight: 700, fill: C.cobaltText }));
  p.push(para(sx(a, 3.9), sy(a, 1.45), 'Enters cheaper and simpler, for customers others ignore', 30, { size: 11, fill: C.cobaltText }));
  p.push(circle(sx(a, 7), sy(a, 4.9), 6, { fill: C.gold, stroke: C.white, sw: 2 }));
  p.push(para(sx(a, 7.2) + 6, sy(a, 3.7), 'Good enough for the mainstream: the market shifts', 24, { size: 11, weight: 600, fill: C.goldText }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Incremental and disruptive innovation',
      desc: 'Product performance over time. A shaded band shows what most customers need, rising slowly. The established product improves through incremental innovation and eventually offers more than most customers need. A disruptive innovation enters later, cheaper and simpler and below what most customers need, serving customers others ignore, then improves faster until it is good enough for the mainstream market, at which point the market shifts towards it.',
    },
    p.join(''),
  );
}

/* ---------- Intellectual property ---------- */
function ipProtection(id: string): string {
  const W = 720;
  const H = 250;
  const p: string[] = [];
  const cards: Array<[string, string, string, 'ink' | 'gold' | 'cobalt']> = [
    ['Patent', 'An invention: a new product or process that can be made or used', 'Must be applied for; lasts a fixed term (often 20 years), then anyone may use it', 'ink'],
    ['Copyright', 'Original creative work: writing, music, film, software, designs', 'Arises automatically when the work is created; lasts for many years', 'gold'],
    ['Trademark', 'A brand identity: a name, logo, slogan or sign', 'Registered; can be renewed indefinitely while in use', 'cobalt'],
  ];
  cards.forEach(([t, what, how, tone], i) => {
    const x = 16 + i * 236;
    p.push(rect(x, 24, 220, 200, { fill: C.white, stroke: TONES[tone].line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 24, 220, 6, { fill: TONES[tone].line }));
    p.push(text(x + 16, 62, t, { size: 18, weight: 700, serif: true, fill: TONES[tone].text }));
    p.push(text(x + 16, 86, 'Protects', { size: 10.5, weight: 700, fill: C.slate, label: true }));
    p.push(para(x + 16, 104, what, 32, { size: 12, fill: C.body }));
    p.push(text(x + 16, 158, 'How it works', { size: 10.5, weight: 700, fill: C.slate, label: true }));
    p.push(para(x + 16, 176, how, 32, { size: 12, fill: C.body }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Three forms of intellectual property protection',
      desc: 'Three cards. A patent protects an invention, a new product or process; it must be applied for and lasts a fixed term, often 20 years, after which anyone may use it. Copyright protects original creative work such as writing, music, film, software and designs; it arises automatically and lasts many years. A trademark protects a brand identity such as a name, logo or slogan; it is registered and can be renewed indefinitely while in use. Terms vary between countries.',
    },
    p.join(''),
  );
}

/* ---------- Management information systems ---------- */
function misFlow(id: string): string {
  const W = 720;
  const H = 340;
  const p: string[] = [];
  const col = (x: number, title: string, items: string[], tone: 'ink' | 'gold' | 'cobalt' | 'green') => {
    p.push(text(x, 44, title, { size: 11, weight: 700, fill: TONES[tone].text, label: true }));
    items.forEach((s, i) => p.push(box(x, 56 + i * 50, 150, 40, s, { tone, size: 12 })));
  };
  col(16, 'Data from', ['Sales and loyalty cards', 'Sensors (internet of things)', 'Websites and apps', 'Employee monitoring'], 'ink');
  col(200, 'Stored in', ['Databases', 'Data centres', 'Cloud computing'], 'gold');
  col(384, 'Analysed by', ['Data analytics', 'Data mining', 'Artificial intelligence'], 'cobalt');
  col(568, 'Used for', ['Decisions', 'Monitoring', 'Personalized offers'], 'green');
  [170, 354, 538].forEach((x) => p.push(line(id, x + 2, 150, x + 26, 150, { arrow: 'end', sw: 1.6 })));
  p.push(rect(8, 268, 704, 56, { fill: C.signalWash, stroke: C.signal, sw: 1, rx: 3, dash: '5 4' }));
  p.push(text(24, 290, 'Around it all: cybersecurity and ethics', { size: 12.5, weight: 700, fill: C.signalText }));
  p.push(text(24, 309, 'Cybercrime, data privacy, consent, bias in algorithms and the surveillance of staff (digital Taylorism).', { size: 11.5, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'How a management information system turns data into decisions',
      desc: 'Data flows from left to right through four stages. Data comes from sales and loyalty cards, sensors on the internet of things, websites and apps, and employee monitoring. It is stored in databases, data centres and cloud computing. It is analysed by data analytics, data mining and artificial intelligence. It is used for decisions, monitoring and personalized offers. Around the whole system sit cybersecurity and ethics: cybercrime, data privacy, consent, bias in algorithms and the surveillance of staff, known as digital Taylorism.',
    },
    p.join(''),
  );
}

/* ---------- Cradle to cradle ---------- */
function cradleToCradle(id: string): string {
  const W = 720;
  const H = 360;
  const p: string[] = [];
  const loop = (cx: number, title: string, tone: 'green' | 'cobalt', nodes: string[], note: string) => {
    const cy = 190;
    const R = 92;
    p.push(circle(cx, cy, R, { stroke: TONES[tone].line, sw: 1.6, dash: '6 5' }));
    p.push(text(cx, 52, title, { size: 15, weight: 700, serif: true, fill: TONES[tone].text, anchor: 'middle' }));
    p.push(text(cx, 70, note, { size: 11, fill: C.slate, anchor: 'middle' }));
    nodes.forEach((s, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / nodes.length;
      const x = cx + R * Math.cos(ang);
      const y = cy + R * Math.sin(ang);
      p.push(box(x - 62, y - 17, 124, 34, s, { tone, style: 'outline', size: 11.5 }));
    });
    // Direction arrows between nodes (clockwise).
    for (let i = 0; i < nodes.length; i++) {
      const a1 = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / nodes.length;
      const x = cx + R * Math.cos(a1);
      const y = cy + R * Math.sin(a1);
      const dx = -Math.sin(a1);
      const dy = Math.cos(a1);
      p.push(line(id, x - dx * 6, y - dy * 6, x + dx * 6, y + dy * 6, { tone, sw: 2, arrow: 'end' }));
    }
  };
  loop(186, 'Biological cycle', 'green', ['Natural materials', 'Product used', 'Composted', 'Nutrients for growth'], 'Materials that can safely return to nature');
  loop(534, 'Technical cycle', 'cobalt', ['Durable materials', 'Product used', 'Taken back', 'Remade at equal quality'], 'Materials kept in use, not downcycled');
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Cradle to cradle design',
      desc: 'Two closed loops. In the biological cycle, products made from natural materials are used, then composted, becoming nutrients for new growth and new materials. In the technical cycle, products made from durable materials are used, taken back and remade at equal quality, so materials stay in use instead of becoming waste. In cradle to cradle design, every material is designed for one of the two cycles.',
    },
    p.join(''),
  );
}

export const UNIT5: Record<string, DiagramDef> = {
  'break-even-chart': {
    title: 'The break-even chart',
    caption: 'Where total revenue meets total costs; profit, loss and the margin of safety on either side.',
    syllabus: ['5.5', '3.3'],
    level: 'SL/HL',
    group: 'unit-5',
    fictional: true,
    render: (id) => breakEvenChart(id, {}),
  },
  'break-even-price-change': {
    title: 'A price rise on the break-even chart',
    caption: 'A higher price steepens total revenue and lowers the break-even quantity.',
    syllabus: ['5.5'],
    level: 'SL/HL',
    group: 'unit-5',
    fictional: true,
    render: (id) => breakEvenChart(id, { price2: 30 }),
  },
  'operations-methods': {
    title: 'Operations methods by volume and variety',
    caption: 'Job, batch and mass production trade variety against volume; mass customization offers both.',
    syllabus: ['5.2'],
    level: 'SL/HL',
    group: 'unit-5',
    render: operationsMethods,
  },
  'quality-control-assurance': {
    title: 'Quality control and quality assurance',
    caption: 'Finding defects at the end of the line, or preventing them at every stage.',
    syllabus: ['5.3'],
    level: 'HL',
    group: 'unit-5',
    render: qcQa,
  },
  kaizen: {
    title: 'Kaizen: continuous improvement',
    caption: 'Many small improvements by everyone, set against one occasional large change.',
    syllabus: ['5.3'],
    level: 'HL',
    group: 'unit-5',
    render: kaizen,
  },
  'cradle-to-cradle': {
    title: 'Cradle to cradle design',
    caption: 'Every material is designed to return to nature or to be remade at equal quality.',
    syllabus: ['5.3'],
    level: 'HL',
    group: 'unit-5',
    render: cradleToCradle,
  },
  'reorganizing-production': {
    title: 'Reorganizing production',
    caption: 'Outsourcing, offshoring, insourcing and reshoring as moves between who does the work and where.',
    syllabus: ['5.4'],
    level: 'SL/HL',
    group: 'unit-5',
    render: reorganizing,
  },
  'supply-chain': {
    title: 'The supply chain',
    caption: 'Goods flow forward, information flows back; local or global.',
    syllabus: ['5.6'],
    level: 'HL',
    group: 'unit-5',
    render: supplyChain,
  },
  'jit-jic': {
    title: 'Just-in-time and just-in-case stock',
    caption: 'Small frequent deliveries against large deliveries with a buffer.',
    syllabus: ['5.6', '5.3'],
    level: 'HL',
    group: 'unit-5',
    fictional: true,
    render: jitJic,
  },
  'stock-control-chart': {
    title: 'A stock control chart',
    caption: 'Buffer stock, reorder level, reorder quantity and lead time on one chart.',
    syllabus: ['5.6'],
    level: 'HL',
    group: 'unit-5',
    fictional: true,
    render: stockControl,
  },
  'crisis-contingency': {
    title: 'Contingency planning and crisis management',
    caption: 'Planning before, managing during, recovering after.',
    syllabus: ['5.7'],
    level: 'HL',
    group: 'unit-5',
    render: crisisTimeline,
  },
  'innovation-types': {
    title: 'Incremental and disruptive innovation',
    caption: 'Improving what exists, or entering from below and overtaking it.',
    syllabus: ['5.8'],
    level: 'HL',
    group: 'unit-5',
    render: innovation,
  },
  'intellectual-property': {
    title: 'Three forms of intellectual property protection',
    caption: 'What patents, copyright and trademarks protect, and how.',
    syllabus: ['5.8'],
    level: 'HL',
    group: 'unit-5',
    render: ipProtection,
  },
  'mis-data-flow': {
    title: 'From data to decisions',
    caption: 'How a management information system collects, stores, analyses and uses data.',
    syllabus: ['5.9'],
    level: 'HL',
    group: 'unit-5',
    render: misFlow,
  },
};
