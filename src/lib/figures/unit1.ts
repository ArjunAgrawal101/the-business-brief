/**
 * Unit 1 diagrams: introduction to business management.
 */
import type { DiagramDef } from '../diagrams';
import { C, TONES, arrowPath, axes, box, circle, frame, line, para, rect, smooth, sx, sy, text, type Axes, type Tone } from './kit';

/* ---------- The four sectors ---------- */
function sectors(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const items: Array<[string, string, string, Tone]> = [
    ['Primary', 'Extracting natural resources: farming, fishing, mining, forestry', 'Growing cocoa beans', 'green'],
    ['Secondary', 'Turning materials into products: manufacturing and construction', 'Making chocolate bars', 'gold'],
    ['Tertiary', 'Providing services to customers and other businesses', 'Selling them in shops and cafés', 'cobalt'],
    ['Quaternary', 'Creating and selling knowledge and information', 'Market research and app design', 'ink'],
  ];
  const bw = 160;
  const gap = 24;
  items.forEach(([name, what, ex, tone], i) => {
    const x = 4 + i * (bw + gap);
    const t = TONES[tone];
    p.push(rect(x, 30, bw, 186, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 30, bw, 40, { fill: t.line, rx: 3 }));
    p.push(rect(x, 60, bw, 10, { fill: t.line }));
    p.push(text(x + 14, 56, name, { size: 15, weight: 700, serif: true, fill: C.white }));
    p.push(para(x + 14, 92, what, 24, { size: 12, fill: C.body }));
    p.push(text(x + 14, 170, 'Example chain', { size: 10, weight: 700, fill: t.text, label: true }));
    p.push(para(x + 14, 188, ex, 21, { size: 12, weight: 600, italic: true, fill: C.ink }));
    if (i < items.length - 1) p.push(line(id, x + bw + 3, 123, x + bw + gap - 3, 123, { arrow: 'end', sw: 1.6 }));
  });
  p.push(rect(4, 238, 712, 76, { fill: C.paper, rx: 3 }));
  p.push(text(20, 262, 'Sectoral change', { size: 13, weight: 700, fill: C.ink }));
  p.push(para(20, 282, 'As economies develop, the share of output and jobs usually shifts from the primary and secondary sectors towards the tertiary and quaternary sectors.', 108, { size: 12, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The four sectors of economic activity',
      desc: 'Four linked boxes show the sectors of economic activity in order. Primary: extracting natural resources, as in farming, fishing, mining and forestry; the example is growing cocoa beans. Secondary: turning materials into products through manufacturing and construction; making chocolate bars. Tertiary: providing services; selling the bars in shops and cafés. Quaternary: creating and selling knowledge and information; market research and app design. Below, a note on sectoral change: as economies develop, output and jobs usually shift from the primary and secondary sectors towards the tertiary and quaternary sectors.',
    },
    p.join(''),
  );
}

/* ---------- Inputs, transformation, outputs ---------- */
function transformation(id: string): string {
  const W = 720;
  const H = 360;
  const p: string[] = [];
  p.push(text(18, 28, 'Inputs', { size: 11, weight: 700, fill: C.goldText, label: true }));
  const inputs: Array<[string, string]> = [
    ['Land', 'Natural resources'],
    ['Labour', 'Human effort'],
    ['Capital', 'Machinery, buildings'],
    ['Enterprise', 'Initiative and risk'],
  ];
  inputs.forEach(([n, s], i) => p.push(box(18, 40 + i * 62, 150, 50, n, { tone: 'gold', size: 13, sub: s })));
  inputs.forEach((_, i) => p.push(line(id, 170, 65 + i * 62, 214, 150 + (i - 1.5) * 18, { sw: 1.3, arrow: 'end', tone: 'slate' })));
  // The business.
  p.push(rect(218, 40, 290, 236, { fill: C.paper, stroke: C.ink, sw: 1.6, rx: 4 }));
  p.push(text(363, 66, 'The business', { size: 15, weight: 700, serif: true, fill: C.ink, anchor: 'middle' }));
  p.push(text(363, 84, 'The transformation process', { size: 11.5, fill: C.slate, anchor: 'middle' }));
  const fns = ['Human resources', 'Finance and accounts', 'Marketing', 'Operations'];
  fns.forEach((f, i) => p.push(box(234 + (i % 2) * 133, 100 + Math.floor(i / 2) * 82, 125, 70, f, { tone: 'ink', style: 'outline', size: 12.5 })));
  p.push(line(id, 510, 158, 548, 158, { arrow: 'end', sw: 1.6 }));
  p.push(text(552, 28, 'Outputs', { size: 11, weight: 700, fill: C.cobaltText, label: true }));
  p.push(box(552, 118, 150, 80, 'Goods and services', { tone: 'cobalt', size: 13.5, sub: 'Sold to customers' }));
  p.push(rect(18, 296, 684, 48, { fill: C.goldWash, rx: 3 }));
  p.push(text(34, 318, 'Added value = selling price − cost of bought-in materials and services', { size: 13, weight: 700, fill: C.goldText }));
  p.push(text(34, 335, 'The business functions work together to make the output worth more than the inputs it buys.', { size: 11.5, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Inputs, the transformation process and outputs',
      desc: 'Four inputs, the factors of production, flow into the business: land, meaning natural resources; labour, human effort; capital, such as machinery and buildings; and enterprise, the initiative and risk-taking that combines them. Inside the business, the four functions, human resources, finance and accounts, marketing and operations, carry out the transformation process. The output is goods and services sold to customers. Added value is the selling price minus the cost of bought-in materials and services.',
    },
    p.join(''),
  );
}

/* ---------- Types of business entity ---------- */
function entities(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  // Two sectors.
  p.push(rect(8, 16, 524, 368, { fill: C.paper, rx: 4 }));
  p.push(rect(544, 16, 168, 368, { fill: C.cobaltWash, rx: 4 }));
  p.push(text(22, 40, 'Private sector', { size: 15, weight: 700, serif: true, fill: C.ink }));
  p.push(text(22, 57, 'Owned by individuals or groups of investors', { size: 11.5, fill: C.slate }));
  p.push(text(558, 40, 'Public sector', { size: 15, weight: 700, serif: true, fill: C.cobaltText }));
  p.push(para(558, 57, 'Owned and run by the government', 24, { size: 11.5, fill: C.slate }));
  // For-profit commercial entities, from unlimited to limited liability.
  p.push(text(22, 88, 'For-profit businesses', { size: 11, weight: 700, fill: C.goldText, label: true }));
  const firms: Array<[string, string]> = [
    ['Sole trader', 'One owner'],
    ['Partnership', 'Two or more owners'],
    ['Privately held company', 'Shares sold privately'],
    ['Publicly held company', 'Shares traded on a stock exchange'],
  ];
  firms.forEach(([n, s], i) => p.push(box(22 + i * 126, 98, 116, 70, n, { tone: 'ink', style: 'outline', size: 12, sub: s, subSize: 10.5 })));
  p.push(line(id, 22, 190, 260, 190, { tone: 'signal', sw: 1.4 }));
  p.push(line(id, 274, 190, 514, 190, { tone: 'green', sw: 1.4 }));
  p.push(text(22, 207, 'Unlimited liability', { size: 11, weight: 600, fill: C.signalText }));
  p.push(text(514, 207, 'Limited liability', { size: 11, weight: 600, fill: C.greenText, anchor: 'end' }));
  // Social enterprises.
  p.push(text(22, 240, 'Social enterprises: a social purpose first', { size: 11, weight: 700, fill: C.greenText, label: true }));
  p.push(rect(22, 250, 330, 118, { fill: C.white, stroke: C.green, sw: 1.1, rx: 3 }));
  p.push(text(36, 272, 'For-profit social enterprises', { size: 12.5, weight: 700, fill: C.greenText }));
  ['Private sector companies', 'Cooperatives'].forEach((n, i) => p.push(box(36 + i * 154, 284, 144, 40, n, { tone: 'green', size: 12 })));
  p.push(para(36, 342, 'Surpluses are reinvested in the social purpose or shared with members.', 52, { size: 11, fill: C.slate }));
  p.push(rect(364, 250, 154, 118, { fill: C.white, stroke: C.green, sw: 1.1, rx: 3 }));
  p.push(text(378, 272, 'Non-profit', { size: 12.5, weight: 700, fill: C.greenText }));
  p.push(box(378, 284, 126, 40, 'NGOs', { tone: 'green', size: 12 }));
  p.push(para(378, 342, 'Funded by donations and grants', 22, { size: 11, fill: C.slate }));
  p.push(box(558, 98, 140, 70, 'Public sector companies', { tone: 'cobalt', size: 12, sub: 'State-owned, may have a social purpose', subSize: 10.5 }));
  p.push(arrowPath(id, `M628,170 C628,230 420,214 356,262`, { tone: 'green', sw: 1.2, dash: '4 4' }));
  p.push(para(558, 226, 'The guide lists public sector companies among the for-profit social enterprises.', 24, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Types of business entity',
      desc: 'The private sector, owned by individuals or investors, and the public sector, owned and run by the government. For-profit businesses in the private sector run from sole traders, with one owner, and partnerships, with two or more owners, both with unlimited liability, to privately held companies, whose shares are sold privately, and publicly held companies, whose shares are traded on a stock exchange, both with limited liability. Social enterprises put a social purpose first. For-profit social enterprises are private sector companies, public sector companies and cooperatives; their surpluses are reinvested in the purpose or shared with members. Non-governmental organizations are non-profit social enterprises funded by donations and grants. Public sector companies are owned by the state and the guide lists them among the for-profit social enterprises.',
    },
    p.join(''),
  );
}

/* ---------- Vision, mission and objectives ---------- */
function objectives(id: string): string {
  const W = 680;
  const H = 360;
  const p: string[] = [];
  const levels: Array<[string, string, Tone]> = [
    ['Vision statement', 'Where the organization wants to be in the long term', 'ink'],
    ['Mission statement', 'Its purpose: what it does, for whom and why', 'ink'],
    ['Strategic objectives', 'Long-term goals for the whole organization, set by senior managers', 'gold'],
    ['Tactical objectives', 'Short- to medium-term goals for parts of the business that deliver the strategy', 'cobalt'],
  ];
  const top = 26;
  const lh = 74;
  const cx = 190;
  levels.forEach(([name, what, tone], i) => {
    const half1 = 40 + i * 36;
    const half2 = 40 + (i + 1) * 36;
    const y1 = top + i * lh;
    const y2 = y1 + lh - 6;
    const t = TONES[tone];
    p.push(`<polygon points="${cx - half1},${y1} ${cx + half1},${y1} ${cx + half2},${y2} ${cx - half2},${y2}" fill="${i < 2 ? (i === 0 ? C.ink : C.ink2) : t.wash}" stroke="${t.line}" stroke-width="1.2"/>`);
    p.push(text(cx, (y1 + y2) / 2 + 5, name, { size: 13, weight: 700, fill: i < 2 ? C.white : t.text, anchor: 'middle' }));
    p.push(line(id, cx + half2 + 8, (y1 + y2) / 2, 400, (y1 + y2) / 2, { stroke: C.rule, sw: 1 }));
    p.push(para(410, (y1 + y2) / 2 - 4, what, 36, { size: 12, fill: C.body }));
  });
  p.push(arrowPath(id, `M24,${top + 4 * lh - 10} L24,${top + 6}`, { tone: 'slate', sw: 1.4 }));
  p.push(text(16, top + 2 * lh, 'Broader, longer term', { size: 11, fill: C.slate, rotate: -90, anchor: 'middle' }));
  p.push(para(18, H - 26, 'Each level puts the one above it into practice. Many organizations also set objectives for growth, profit, shareholder value, ethics and corporate social responsibility.', 112, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'From vision to tactical objectives',
      desc: 'A pyramid of four levels, narrow at the top. Vision statement: where the organization wants to be in the long term. Mission statement: its purpose, what it does, for whom and why. Strategic objectives: long-term goals for the whole organization, set by senior managers. Tactical objectives: short- to medium-term goals for parts of the business that deliver the strategy. Each level puts the one above it into practice. Many organizations also set objectives for growth, profit, shareholder value, ethics and corporate social responsibility.',
    },
    p.join(''),
  );
}

/* ---------- Internal and external stakeholders ---------- */
function stakeholders(id: string): string {
  const W = 680;
  const H = 440;
  const p: string[] = [];
  const cx = 340;
  const cy = 204;
  p.push(circle(cx, cy, 186, { fill: C.cobaltWash, stroke: C.cobalt, sw: 1 }));
  p.push(circle(cx, cy, 112, { fill: C.goldWash, stroke: C.gold, sw: 1.2 }));
  p.push(circle(cx, cy, 34, { fill: C.ink }));
  p.push(text(cx, cy - 3, 'The', { size: 11.5, weight: 600, fill: C.white, anchor: 'middle', serif: true }));
  p.push(text(cx, cy + 12, 'business', { size: 11.5, weight: 600, fill: C.white, anchor: 'middle', serif: true }));
  p.push(text(cx, cy - 92, 'Internal', { size: 11, weight: 700, fill: C.goldText, anchor: 'middle', label: true }));
  const inner: Array<[string, number, number]> = [
    ['Managers and directors', 0, -60],
    ['Employees', -66, 46],
    ['Owners and shareholders', 66, 46],
  ];
  for (const [n, dx, dy] of inner) p.push(para(cx + dx, cy + dy, n, 13, { size: 11.5, weight: 600, fill: C.ink, anchor: 'middle', middle: true }));
  p.push(text(cx, cy - 160, 'External', { size: 11, weight: 700, fill: C.cobaltText, anchor: 'middle', label: true }));
  const outer = ['Customers', 'Suppliers', 'Lenders', 'Government', 'Local community', 'Pressure groups', 'Competitors'];
  outer.forEach((n, i) => {
    const a = ((-90 + 360 * ((i + 0.5) / outer.length)) * Math.PI) / 180;
    const x = cx + 150 * Math.cos(a);
    const y = cy + 150 * Math.sin(a);
    p.push(para(x, y, n, 11, { size: 12, weight: 600, fill: C.ink, anchor: 'middle', middle: true }));
  });
  p.push(para(16, H - 30, 'Textbooks differ on shareholders: owners are usually counted as internal stakeholders. Interests overlap and conflict, for example over wages, prices, profit and the environment.', 110, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Internal and external stakeholders',
      desc: 'Concentric circles around the business. The inner ring holds the internal stakeholders: employees, managers and directors, and owners and shareholders. The outer ring holds the external stakeholders: customers, suppliers, lenders, the government, the local community, pressure groups and competitors. Textbooks differ on shareholders, who are usually counted as internal. Stakeholders’ interests overlap and conflict, for example over wages, prices, profit and the environment.',
    },
    p.join(''),
  );
}

/* ---------- Stakeholder mapping ---------- */
function stakeholderGrid(id: string): string {
  const W = 640;
  const H = 420;
  const p: string[] = [];
  const gx = 90;
  const gy = 40;
  const cw = 250;
  const ch = 150;
  const cells: Array<[number, number, string, string, Tone]> = [
    [0, 0, 'Keep satisfied', 'High power, low interest', 'gold'],
    [1, 0, 'Manage closely', 'High power, high interest: key players', 'signal'],
    [0, 1, 'Monitor', 'Low power, low interest', 'slate'],
    [1, 1, 'Keep informed', 'Low power, high interest', 'cobalt'],
  ];
  for (const [i, j, name, sub, tone] of cells) {
    const t = TONES[tone];
    p.push(rect(gx + i * cw, gy + j * ch, cw - 6, ch - 6, { fill: t.wash, stroke: t.line, sw: 1, rx: 3 }));
    p.push(text(gx + i * cw + 16, gy + j * ch + 34, name, { size: 15, weight: 700, serif: true, fill: t.text }));
    p.push(para(gx + i * cw + 16, gy + j * ch + 56, sub, 32, { size: 12, fill: C.body }));
  }
  p.push(line(id, gx - 14, gy + 2 * ch, gx - 14, gy - 4, { arrow: 'end', sw: 1.4 }));
  p.push(text(gx - 24, gy + ch, 'Power', { size: 12.5, weight: 700, fill: C.ink, anchor: 'middle', rotate: -90 }));
  p.push(line(id, gx, gy + 2 * ch + 12, gx + 2 * cw, gy + 2 * ch + 12, { arrow: 'end', sw: 1.4 }));
  p.push(text(gx + cw, gy + 2 * ch + 32, 'Interest in the decision', { size: 12.5, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(para(gx, H - 36, 'A widely used planning tool, not one the guide names. Positions change from one decision to the next.', 84, { size: 11, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Stakeholder mapping by power and interest',
      desc: 'A two by two grid with power on the vertical axis and interest in the decision on the horizontal axis. High power and low interest: keep satisfied. High power and high interest, the key players: manage closely. Low power and low interest: monitor. Low power and high interest: keep informed. It is a widely used planning tool, not one the guide names, and a stakeholder’s position changes from one decision to the next.',
    },
    p.join(''),
  );
}

/* ---------- Economies and diseconomies of scale ---------- */
function scale(id: string): string {
  const W = 700;
  const H = 400;
  const a: Axes = { x: 80, y: 40, w: 540, h: 280, x0: 0, x1: 10, y0: 0, y1: 10 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Scale of output', yLabel: 'Average cost per unit', origin: true }));
  // Long-run average cost: falling, flat bottom, rising.
  const pts: Array<[number, number]> = [
    [0.6, 9],
    [2, 6.1],
    [3.6, 4.2],
    [5, 3.5],
    [6.2, 3.6],
    [7.6, 4.6],
    [9.4, 7.2],
  ];
  const svgPts = pts.map(([x, y]) => [sx(a, x), sy(a, y)] as [number, number]);
  p.push(`<path d="${smooth(svgPts)}" fill="none" stroke="${C.ink}" stroke-width="2.6"/>`);
  // Optimum: the lowest point, about x = 5.5.
  const ox = sx(a, 5.55);
  const oy = sy(a, 3.48);
  p.push(line(id, ox, oy, ox, sy(a, 0), { stroke: C.gold, sw: 1.3, dash: '4 4' }));
  p.push(circle(ox, oy, 5.5, { fill: C.gold, stroke: C.white, sw: 2 }));
  p.push(text(ox, sy(a, 0) - 10, 'Lowest average cost', { size: 11.5, weight: 700, fill: C.goldText, anchor: 'middle' }));
  p.push(text(sx(a, 3.3), sy(a, 8.6), 'Economies of scale', { size: 13, weight: 700, fill: C.greenText, anchor: 'middle' }));
  p.push(text(sx(a, 3.3), sy(a, 8.6) + 16, 'average cost falls as output grows', { size: 11.5, fill: C.greenText, anchor: 'middle' }));
  p.push(text(sx(a, 8.2), sy(a, 8.6), 'Diseconomies of scale', { size: 13, weight: 700, fill: C.signalText, anchor: 'middle' }));
  p.push(text(sx(a, 8.2), sy(a, 8.6) + 16, 'average cost rises', { size: 11.5, fill: C.signalText, anchor: 'middle' }));
  p.push(arrowPath(id, `M${sx(a, 1.9)},${sy(a, 7.6)} L${sx(a, 3.9)},${sy(a, 5.5)}`, { tone: 'green', sw: 1.4 }));
  p.push(arrowPath(id, `M${sx(a, 7.0)},${sy(a, 5.6)} L${sx(a, 8.5)},${sy(a, 7.7)}`, { tone: 'signal', sw: 1.4 }));
  p.push(para(sx(a, 0.4), sy(a, 2.2), 'Internal economies: technical, purchasing, financial, managerial, marketing, risk-bearing', 40, { size: 11, fill: C.slate }));
  p.push(para(sx(a, 6.6), sy(a, 2.2), 'Internal diseconomies: poorer communication, coordination and motivation', 34, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Economies and diseconomies of scale',
      desc: 'A U-shaped curve of average cost per unit against the scale of output. On the left, economies of scale: average cost falls as output grows, through technical, purchasing, financial, managerial, marketing and risk-bearing economies. The curve reaches its lowest average cost, then rises on the right, where diseconomies of scale such as poorer communication, coordination and motivation push average cost up. External economies and diseconomies, which come from the industry or area rather than the firm, shift the whole curve.',
    },
    p.join(''),
  );
}

/* ---------- Growth methods ---------- */
function growthMethods(id: string): string {
  const W = 720;
  const H = 380;
  const p: string[] = [];
  p.push(box(285, 14, 150, 44, 'Business growth', { tone: 'ink', style: 'solid', size: 14 }));
  p.push(line(id, 360, 58, 360, 74, { sw: 1.4 }));
  p.push(line(id, 150, 74, 560, 74, { sw: 1.4 }));
  p.push(line(id, 150, 74, 150, 90, { sw: 1.4, arrow: 'end' }));
  p.push(line(id, 560, 74, 560, 90, { sw: 1.4, arrow: 'end' }));
  p.push(box(40, 92, 220, 56, 'Internal (organic) growth', { tone: 'gold', size: 13.5, sub: 'Using its own resources: slower, lower risk, keeps control' }));
  p.push(box(400, 92, 320, 56, 'External (inorganic) growth', { tone: 'cobalt', size: 13.5, sub: 'Joining with or buying others: faster, costlier, riskier' }));
  const organic = ['New products', 'New markets', 'More capacity', 'More outlets'];
  organic.forEach((n, i) => p.push(box(40 + (i % 2) * 114, 168 + Math.floor(i / 2) * 52, 106, 42, n, { tone: 'gold', style: 'outline', size: 12 })));
  const ext: Array<[string, string]> = [
    ['Mergers and acquisitions', 'Two firms become one, or one buys a controlling stake'],
    ['Takeovers', 'A hostile acquisition'],
    ['Joint ventures', 'A new business owned by two partners'],
    ['Strategic alliances', 'Cooperation while staying independent'],
    ['Franchising', 'Others pay to trade under the brand'],
  ];
  ext.forEach(([n, s], i) => p.push(box(400, 160 + i * 42, 320, 36, n, { tone: 'cobalt', style: 'outline', size: 12, sub: s, subSize: 10.5, align: 'start' })));
  p.push(para(40, 290, 'Growth may be in size (revenue, output, staff, market share) and is not the same as profit. Some businesses choose to stay small.', 40, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Methods of business growth',
      desc: 'Business growth divides into internal, or organic, growth and external, or inorganic, growth. Internal growth uses the business’s own resources, through new products, new markets, more capacity or more outlets; it is slower and lower risk and keeps control. External growth joins with or buys other businesses; it is faster, costlier and riskier. Its methods are mergers and acquisitions, where two firms become one or one buys a controlling stake; takeovers, which are hostile acquisitions; joint ventures, a new business owned by two partners; strategic alliances, cooperation while staying independent; and franchising, where others pay to trade under the brand. Growth is not the same as profit, and some businesses choose to stay small.',
    },
    p.join(''),
  );
}

/* ---------- Directions of integration ---------- */
function integration(id: string): string {
  const W = 700;
  const H = 380;
  const p: string[] = [];
  const stages: Array<[string, string]> = [
    ['Primary', 'A dairy farm'],
    ['Secondary', 'A cheese maker'],
    ['Tertiary', 'A cheese shop'],
  ];
  const x = 150;
  stages.forEach(([s, ex], i) => {
    const y = 40 + i * 110;
    p.push(text(30, y + 32, s, { size: 12, weight: 700, fill: C.slate, label: true }));
    p.push(box(x, y, 170, 60, ex, { tone: i === 1 ? 'ink' : 'ink', style: i === 1 ? 'solid' : 'outline', size: 13 }));
  });
  // The business is the cheese maker.
  p.push(arrowPath(id, `M${x + 85},${150} L${x + 85},${102}`, { tone: 'cobalt', sw: 2 }));
  p.push(text(x + 95, 130, 'Backward vertical', { size: 12, weight: 700, fill: C.cobaltText }));
  p.push(arrowPath(id, `M${x + 85},${210} L${x + 85},${258}`, { tone: 'cobalt', sw: 2 }));
  p.push(text(x + 95, 240, 'Forward vertical', { size: 12, weight: 700, fill: C.cobaltText }));
  p.push(box(440, 150, 170, 60, 'Another cheese maker', { tone: 'gold', size: 13 }));
  p.push(line(id, x + 172, 180, 436, 180, { tone: 'gold', sw: 2, arrow: 'end' }));
  p.push(text(380, 170, 'Horizontal', { size: 12, weight: 700, fill: C.goldText, anchor: 'middle' }));
  p.push(box(440, 280, 170, 60, 'A software firm', { tone: 'green', size: 13, sub: 'An unrelated industry' }));
  p.push(arrowPath(id, `M${x + 172},${195} C${380},${250} ${400},${300} ${436},${306}`, { tone: 'green', sw: 2 }));
  p.push(text(398, 252, 'Conglomerate', { size: 12, weight: 700, fill: C.greenText }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Directions of integration',
      desc: 'A fictional cheese maker in the secondary sector integrates in four directions. Backward vertical integration joins it with its supplier, a dairy farm in the primary sector. Forward vertical integration joins it with its customer, a cheese shop in the tertiary sector. Horizontal integration joins it with another cheese maker at the same stage. Conglomerate integration joins it with a business in an unrelated industry, such as a software firm.',
    },
    p.join(''),
  );
}

/* ---------- MNCs and host countries ---------- */
function mnc(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const col = (x: number, title: string, tone: Tone, items: string[]) => {
    const t = TONES[tone];
    p.push(rect(x, 20, 340, 292, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 20, 340, 40, { fill: t.wash, rx: 3 }));
    p.push(text(x + 16, 46, title, { size: 14, weight: 700, serif: true, fill: t.text }));
    items.forEach((s, i) => {
      p.push(circle(x + 22, 82 + i * 40, 3.5, { fill: t.line }));
      p.push(para(x + 34, 86 + i * 40, s, 46, { size: 12, fill: C.body }));
    });
  };
  col(10, 'Possible benefits for the host country', 'green', ['Jobs and training for local workers', 'Investment, new technology and know-how', 'More choice and competition for consumers', 'Tax revenue and export earnings', 'Business for local suppliers', 'Better infrastructure']);
  col(370, 'Possible costs for the host country', 'signal', ['Local firms forced out by competition', 'Profits sent back to the home country', 'Low-wage or insecure jobs in some cases', 'Pressure on the environment and resources', 'Influence over governments and policy', 'Tax avoidance through transfer pricing']);
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The impact of a multinational company on a host country',
      desc: 'Two columns. Possible benefits for the host country: jobs and training for local workers; investment, new technology and know-how; more choice and competition for consumers; tax revenue and export earnings; business for local suppliers; and better infrastructure. Possible costs: local firms forced out by competition; profits sent back to the home country; low-wage or insecure jobs in some cases; pressure on the environment and resources; influence over governments and policy; and tax avoidance through transfer pricing. The balance depends on the company, the country and the terms agreed.',
    },
    p.join(''),
  );
}

export const UNIT1: Record<string, DiagramDef> = {
  'business-sectors': { title: 'The four sectors of economic activity', caption: 'From extracting resources to selling knowledge, with one chain of production.', syllabus: ['1.1'], level: 'SL/HL', group: 'unit-1', render: sectors },
  'inputs-outputs': { title: 'Inputs, transformation and outputs', caption: 'The factors of production, the four business functions and added value.', syllabus: ['1.1'], level: 'SL/HL', group: 'unit-1', render: transformation },
  'business-entities': { title: 'Types of business entity', caption: 'Private and public sectors, liability, and the social enterprises the guide names.', syllabus: ['1.2'], level: 'SL/HL', group: 'unit-1', render: entities },
  'objectives-hierarchy': { title: 'From vision to tactical objectives', caption: 'How vision, mission, strategic and tactical objectives fit together.', syllabus: ['1.3'], level: 'SL/HL', group: 'unit-1', render: objectives },
  'stakeholder-map': { title: 'Internal and external stakeholders', caption: 'Who has a stake in the business, from the inside out.', syllabus: ['1.4'], level: 'SL/HL', group: 'unit-1', render: stakeholders },
  'stakeholder-mapping': { title: 'Stakeholder mapping by power and interest', caption: 'A planning tool for deciding how to treat each group in a decision.', syllabus: ['1.4'], level: 'SL/HL', group: 'unit-1', render: stakeholderGrid },
  'economies-of-scale': { title: 'Economies and diseconomies of scale', caption: 'Average cost falls, bottoms out and rises as a business grows.', syllabus: ['1.5'], level: 'SL/HL', group: 'unit-1', render: scale },
  'growth-methods': { title: 'Methods of business growth', caption: 'Internal growth and the five external methods the guide names.', syllabus: ['1.5'], level: 'SL/HL', group: 'unit-1', render: growthMethods },
  'integration-types': { title: 'Directions of integration', caption: 'Horizontal, backward and forward vertical, and conglomerate, for one fictional business.', syllabus: ['1.5'], level: 'SL/HL', group: 'unit-1', fictional: true, render: integration },
  'mnc-host-impact': { title: 'MNCs and their host countries', caption: 'The possible benefits and costs to weigh.', syllabus: ['1.6'], level: 'SL/HL', group: 'unit-1', render: mnc },
};

