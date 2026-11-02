/**
 * Unit 2 diagrams: human resource management.
 */
import type { DiagramDef } from '../diagrams';
import { C, TONES, arrowPath, box, circle, frame, line, para, path, rect, text, type Tone } from './kit';

/* ---------- Human resource planning ---------- */
function hrPlanning(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  p.push(box(270, 120, 180, 76, 'Human resource planning', { tone: 'ink', style: 'solid', size: 14, sub: 'How many people, with which skills, when' }));
  const col = (x: number, title: string, tone: Tone, items: string[], dir: 1 | -1) => {
    p.push(text(x, 30, title, { size: 11, weight: 700, fill: TONES[tone].text, label: true }));
    items.forEach((s, i) => {
      const y = 44 + i * 46;
      p.push(box(x, y, 210, 36, s, { tone, size: 12 }));
      const sx0 = dir === 1 ? x + 212 : x - 2;
      p.push(line(id, sx0, y + 18, dir === 1 ? 266 : 454, 158, { tone: 'slate', sw: 1, arrow: 'end' }));
    });
  };
  col(20, 'Internal factors', 'gold', ['Plans for growth or change', 'Flexi-time and working patterns', 'Labour turnover and absence', 'Budget for pay and training', 'Skills of the current workforce'], 1);
  col(490, 'External factors', 'cobalt', ['Demographic change', 'Labour mobility', 'Immigration', 'The gig economy', 'Laws, technology and the economy'], -1);
  p.push(para(20, H - 30, 'The guide names demographic change, labour mobility, immigration, flexi-time and the gig economy; where flexi-time belongs depends on whether the business or the labour market drives it.', 118, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Factors that influence human resource planning',
      desc: 'Human resource planning, deciding how many people the business needs, with which skills and when, is shaped by internal and external factors. Internal: plans for growth or change, flexi-time and other working patterns, labour turnover and absence, the budget for pay and training, and the skills of the current workforce. External: demographic change, labour mobility, immigration, the gig economy, and laws, technology and the economy. The guide names demographic change, labour mobility, immigration, flexi-time and the gig economy.',
    },
    p.join(''),
  );
}

/* ---------- Tall and flat structures ---------- */
function tallFlat(id: string): string {
  const W = 720;
  const H = 380;
  const p: string[] = [];
  const person = (x: number, y: number, top = false) => p.push(circle(x, y, top ? 10 : 8, { fill: top ? C.ink : C.white, stroke: C.ink, sw: 1.6 }));
  const link = (x1: number, y1: number, x2: number, y2: number) => p.push(`<path d="M${x1},${y1 + 9} V${(y1 + y2) / 2} H${x2} V${y2 - 9}" fill="none" stroke="${C.slate}" stroke-width="1.2"/>`);
  // Tall: 1, 2, 4, 8.
  const tx = 180;
  const levels = [1, 2, 4, 8];
  const ys = [70, 130, 190, 250];
  const tallX = levels.map((n) => {
    const spacing = 288 / n;
    return Array.from({ length: n }, (_, i) => tx - 144 + spacing * (i + 0.5));
  });
  for (let l = 1; l < levels.length; l++) tallX[l]!.forEach((x, i) => link(tallX[l - 1]![Math.floor(i / 2)]!, ys[l - 1]!, x, ys[l]!));
  tallX.forEach((xs, l) => xs.forEach((x) => person(x, ys[l]!, l === 0)));
  p.push(text(tx, 32, 'Tall (vertical) structure', { size: 14, weight: 700, serif: true, fill: C.ink, anchor: 'middle' }));
  p.push(arrowPath(id, `M34,${ys[0]} L34,${ys[3]}`, { tone: 'gold', sw: 1.6 }));
  p.push(text(24, (ys[0]! + ys[3]!) / 2, 'Long chain of command', { size: 11, weight: 600, fill: C.goldText, anchor: 'middle', rotate: -90 }));
  p.push(text(tx, 290, '4 levels of hierarchy, span of control 2', { size: 12, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(para(tx, 310, 'Close supervision and clear promotion steps; slower communication and decisions.', 46, { size: 11.5, fill: C.slate, anchor: 'middle' }));
  // Flat: 1 and 14.
  const fx = 540;
  const n = 14;
  const fxs = Array.from({ length: n }, (_, i) => fx - 147 + 21 * (i + 0.5));
  fxs.forEach((x) => link(fx, 70, x, 160));
  person(fx, 70, true);
  fxs.forEach((x) => person(x, 160));
  p.push(text(fx, 32, 'Flat (horizontal) structure', { size: 14, weight: 700, serif: true, fill: C.ink, anchor: 'middle' }));
  p.push(line(id, fxs[0]! - 8, 186, fxs[n - 1]! + 8, 186, { tone: 'cobalt', sw: 1.3, arrow: 'both' }));
  p.push(text(fx, 206, 'Wide span of control', { size: 11.5, weight: 600, fill: C.cobaltText, anchor: 'middle' }));
  p.push(text(fx, 290, '2 levels of hierarchy, span of control 14', { size: 12, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(para(fx, 310, 'Fast communication and more delegation; managers stretched, fewer promotion steps.', 46, { size: 11.5, fill: C.slate, anchor: 'middle' }));
  p.push(line(id, 360, 24, 360, 350, { stroke: C.hair, sw: 1 }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Tall and flat organizational structures',
      desc: 'Two organization charts of fifteen people each. The tall, or vertical, structure has four levels of hierarchy with a span of control of two: one manager, two below, four below them and eight at the bottom, a long chain of command that gives close supervision and clear promotion steps but slows communication and decisions. The flat, or horizontal, structure has two levels: one manager with fourteen people reporting directly, a span of control of fourteen, which speeds communication and encourages delegation but stretches the manager and offers fewer promotion steps.',
    },
    p.join(''),
  );
}

/* ---------- Organization by function, product and region ---------- */
function chartsByType(id: string): string {
  const W = 720;
  const H = 450;
  const p: string[] = [];
  const row = (y: number, title: string, sub: string, kids: string[], tone: Tone, note?: string) => {
    p.push(text(16, y + 20, title, { size: 14, weight: 700, serif: true, fill: C.ink }));
    p.push(para(16, y + 38, sub, 20, { size: 11, fill: C.slate }));
    const cx = 450;
    p.push(box(cx - 60, y, 120, 34, 'Chief executive', { tone: 'ink', style: 'solid', size: 12 }));
    const bw = 116;
    const gap = 12;
    const total = kids.length * bw + (kids.length - 1) * gap;
    const x0 = cx - total / 2;
    p.push(line(id, cx, y + 34, cx, y + 50, { stroke: C.slate, sw: 1.2 }));
    p.push(line(id, x0 + bw / 2, y + 50, x0 + total - bw / 2, y + 50, { stroke: C.slate, sw: 1.2 }));
    kids.forEach((k, i) => {
      const x = x0 + i * (bw + gap);
      p.push(line(id, x + bw / 2, y + 50, x + bw / 2, y + 62, { stroke: C.slate, sw: 1.2 }));
      p.push(box(x, y + 62, bw, 40, k, { tone, size: 12 }));
    });
    if (note) p.push(text(cx, y + 122, note, { size: 11, italic: true, fill: C.slate, anchor: 'middle' }));
  };
  row(16, 'By function', 'Grouped by what people do', ['Marketing', 'Operations', 'Finance', 'Human resources'], 'gold');
  row(164, 'By product', 'Grouped by what is sold', ['Ceramics', 'Glassware', 'Textiles'], 'cobalt', 'Each division runs its own marketing, operations and finance');
  row(312, 'By region', 'Grouped by where it sells', ['Europe', 'Asia-Pacific', 'Americas', 'Middle East and Africa'], 'green');
  p.push(line(id, 16, 150, 704, 150, { stroke: C.hair, sw: 1 }));
  p.push(line(id, 16, 298, 704, 298, { stroke: C.hair, sw: 1 }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Organization charts by function, product and region',
      desc: 'Three organization charts for a fictional business, each headed by a chief executive. By function: departments for marketing, operations, finance and human resources, grouped by what people do. By product: divisions for ceramics, glassware and textiles, grouped by what is sold, each running its own marketing, operations and finance. By region: divisions for Europe, Asia-Pacific, the Americas, and the Middle East and Africa, grouped by where the business sells.',
    },
    p.join(''),
  );
}

/* ---------- Matrix structure ---------- */
function matrix(id: string): string {
  const W = 680;
  const H = 400;
  const p: string[] = [];
  const fns = ['Marketing', 'Operations', 'Finance'];
  const projects = ['Project A', 'Project B', 'Project C'];
  const gx = 220;
  const gy = 110;
  const cw = 140;
  const ch = 76;
  p.push(text(gx + (cw * 3) / 2, 26, 'Functional managers', { size: 11, weight: 700, fill: C.goldText, anchor: 'middle', label: true }));
  fns.forEach((f, i) => {
    const x = gx + i * cw + cw / 2;
    p.push(box(x - 60, 40, 120, 40, f, { tone: 'gold', size: 12.5 }));
    p.push(line(id, x, 80, x, gy + 3 * ch - 20, { tone: 'gold', sw: 1.6 }));
  });
  p.push(text(30, 98, 'Project managers', { size: 11, weight: 700, fill: C.cobaltText, label: true }));
  projects.forEach((pr, j) => {
    const y = gy + j * ch + ch / 2 - 10;
    p.push(box(30, y - 20, 140, 40, pr, { tone: 'cobalt', size: 12.5 }));
    p.push(line(id, 170, y, gx + 3 * cw - 20, y, { tone: 'cobalt', sw: 1.6 }));
    fns.forEach((_, i) => p.push(circle(gx + i * cw + cw / 2, y, 9, { fill: C.white, stroke: C.ink, sw: 1.8 })));
  });
  p.push(para(30, H - 46, 'Each team member (circle) reports to two managers: the head of their function and the leader of their project. Teams form around projects and draw on every function; the cost is divided loyalties and possible conflict over time and priorities.', 104, { size: 11.5, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A matrix structure',
      desc: 'A grid with functional managers for marketing, operations and finance across the top and project managers for projects A, B and C down the side. Lines from each run across the grid, and a team member sits at each crossing, reporting to two managers: the head of their function and the leader of their project. Teams form around projects and draw on every function, at the cost of divided loyalties and possible conflict over time and priorities.',
    },
    p.join(''),
  );
}

/* ---------- Handy's Shamrock Organization ---------- */
function shamrock(id: string): string {
  const W = 700;
  const H = 400;
  const p: string[] = [];
  const cx = 230;
  const cy = 190;
  const leaves: Array<[number, number, string, Tone]> = [
    [cx, cy - 78, 'Professional core', 'ink'],
    [cx - 74, cy + 34, 'Contractual fringe', 'gold'],
    [cx + 74, cy + 34, 'Flexible labour force', 'green'],
  ];
  p.push(path(`M${cx},${cy + 40} C${cx + 6},${cy + 110} ${cx + 40},${cy + 150} ${cx + 66},${cy + 176}`, { stroke: C.green, sw: 6 }));
  for (const [x, y, n, tone] of leaves) {
    p.push(circle(x, y, 74, { fill: TONES[tone].wash, stroke: TONES[tone].line, sw: 1.6 }));
    p.push(para(x, y, n, 12, { size: 14, weight: 700, serif: true, fill: TONES[tone].text, anchor: 'middle', middle: true }));
  }
  const notes: Array<[string, string, Tone]> = [
    ['Professional core', 'Permanent, full-time, highly skilled staff and managers; hard to replace, well paid, loyal.', 'ink'],
    ['Contractual fringe', 'Specialist work outsourced to contractors and freelancers, paid for results.', 'gold'],
    ['Flexible labour force', 'Part-time, temporary and seasonal workers, added or dropped as demand changes.', 'green'],
  ];
  notes.forEach(([n, s, tone], i) => {
    const y = 56 + i * 104;
    p.push(rect(420, y - 26, 4, 78, { fill: TONES[tone].line }));
    p.push(text(436, y - 6, n, { size: 13.5, weight: 700, fill: TONES[tone].text }));
    p.push(para(436, y + 14, s, 38, { size: 12, fill: C.body }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Charles Handy’s Shamrock Organization',
      desc: 'A shamrock with three leaves, each a group of workers. The professional core: permanent, full-time, highly skilled staff and managers who are hard to replace, well paid and loyal. The contractual fringe: specialist work outsourced to contractors and freelancers, paid for results. The flexible labour force: part-time, temporary and seasonal workers, added or dropped as demand changes.',
    },
    p.join(''),
  );
}

/* ---------- Leadership styles ---------- */
function leadership(id: string): string {
  const W = 720;
  const H = 380;
  const p: string[] = [];
  const x0 = 40;
  const x1 = 680;
  const y = 120;
  p.push(`<defs><linearGradient id="${id}-g" x1="0" x2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.gold}"/></linearGradient></defs>`);
  p.push(rect(x0, y - 7, x1 - x0, 14, { fill: `url(#${id}-g)`, rx: 7 }));
  p.push(text(x0, y - 22, 'The leader decides', { size: 12, weight: 700, fill: C.ink }));
  p.push(text(x1, y - 22, 'The team decides', { size: 12, weight: 700, fill: C.goldText, anchor: 'end' }));
  const styles: Array<[number, string, string]> = [
    [0.06, 'Autocratic', 'Decides alone and gives instructions. Fast and clear in a crisis; little say for staff.'],
    [0.36, 'Paternalistic', 'Decides, but in what they see as staff’s best interests, explaining and caring for them.'],
    [0.64, 'Democratic', 'Consults and lets staff share decisions. Builds commitment; slower.'],
    [0.92, 'Laissez-faire', 'Sets the goal and leaves staff to decide how. Suits experts; risks drift.'],
  ];
  styles.forEach(([t, n, s], i) => {
    const x = x0 + t * (x1 - x0);
    p.push(circle(x, y, 9, { fill: C.white, stroke: C.ink, sw: 2 }));
    const bx = Math.min(Math.max(x - 80, 16), W - 176);
    p.push(line(id, x, y + 10, x, 160, { stroke: C.rule, sw: 1 }));
    p.push(rect(bx, 160, 160, 120, { fill: C.white, stroke: i < 2 ? C.ink : C.gold, sw: 1.1, rx: 3 }));
    p.push(text(bx + 12, 184, n, { size: 13.5, weight: 700, serif: true, fill: i < 2 ? C.ink : C.goldText }));
    p.push(para(bx + 12, 204, s, 25, { size: 11.5, fill: C.body }));
  });
  p.push(`<path d="M${x0},70 V58 H${x1} V70" fill="none" stroke="${C.cobalt}" stroke-width="1.4"/>`);
  p.push(text((x0 + x1) / 2, 50, 'Situational leadership: moving along the line to suit the task, the team and the situation', { size: 12, weight: 700, fill: C.cobaltText, anchor: 'middle' }));
  p.push(para(16, H - 46, 'The five styles named in the guide. Placing them on one line is a teaching aid: paternalistic leaders decide much as autocratic ones do, but with care for the people affected.', 116, { size: 11, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Leadership styles',
      desc: 'A line from the leader decides to the team decides, with four styles placed along it. Autocratic: decides alone and gives instructions, fast and clear in a crisis but with little say for staff. Paternalistic: decides, but in what the leader sees as staff’s best interests, explaining and caring for them. Democratic: consults and lets staff share decisions, which builds commitment but is slower. Laissez-faire: sets the goal and leaves staff to decide how, which suits experts but risks drift. Situational leadership moves along the line to suit the task, the team and the situation.',
    },
    p.join(''),
  );
}

/* ---------- Maslow ---------- */
function maslow(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  const lv: Array<[string, string]> = [
    ['Self-actualization', 'Challenging work, growth, reaching potential'],
    ['Esteem', 'Recognition, status, responsibility'],
    ['Social', 'Belonging, teamwork, friendly colleagues'],
    ['Safety', 'Job security, safe conditions, a pension'],
    ['Physiological', 'Pay enough for food, shelter and warmth'],
  ];
  const cx = 240;
  const top = 26;
  const h = 64;
  lv.forEach(([n, ex], i) => {
    const w1 = 64 + i * 70;
    const w2 = 64 + (i + 1) * 70;
    const y1 = top + i * h;
    const y2 = y1 + h - 4;
    const tone = i === 0 ? C.gold : i === 1 ? '#c9a866' : i === 2 ? '#dcc28d' : i === 3 ? '#ece5d4' : '#f3ead6';
    p.push(`<polygon points="${cx - w1 / 2},${y1} ${cx + w1 / 2},${y1} ${cx + w2 / 2},${y2} ${cx - w2 / 2},${y2}" fill="${tone}" stroke="${C.gold}" stroke-width="1"/>`);
    p.push(text(cx, i === 0 ? y2 - 14 : (y1 + y2) / 2 + 5, n, { size: i === 0 ? 11.5 : 13, weight: 700, fill: C.ink, anchor: 'middle' }));
    p.push(line(id, cx + (w1 + w2) / 4 + 8, (y1 + y2) / 2, 466, (y1 + y2) / 2, { stroke: C.rule, sw: 1 }));
    p.push(para(476, (y1 + y2) / 2 + 4, ex, 34, { size: 12, fill: C.body }));
  });
  p.push(arrowPath(id, `M26,${top + 5 * h - 8} L26,${top + 6}`, { tone: 'gold', sw: 1.5 }));
  p.push(text(16, top + 2.5 * h, 'Each need motivates once the one below is broadly met', { size: 11, fill: C.goldText, anchor: 'middle', rotate: -90 }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Maslow’s hierarchy of needs',
      desc: 'A pyramid of five levels of need, from the base up, with workplace examples. Physiological: pay enough for food, shelter and warmth. Safety: job security, safe conditions and a pension. Social: belonging, teamwork and friendly colleagues. Esteem: recognition, status and responsibility. Self-actualization: challenging work, growth and reaching potential. Each need motivates once the one below it is broadly met.',
    },
    p.join(''),
  );
}

/* ---------- Herzberg ---------- */
function herzberg(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  const col = (x: number, title: string, role: string, tone: Tone, items: string[], from: string, to: string) => {
    const t = TONES[tone];
    p.push(rect(x, 20, 330, 300, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 20, 330, 58, { fill: t.wash, rx: 3 }));
    p.push(text(x + 16, 46, title, { size: 15, weight: 700, serif: true, fill: t.text }));
    p.push(text(x + 16, 66, role, { size: 11.5, fill: C.body }));
    items.forEach((s, i) => {
      p.push(circle(x + 22, 101 + i * 30, 3.5, { fill: t.line }));
      p.push(text(x + 34, 105 + i * 30, s, { size: 12.5, fill: C.body }));
    });
    p.push(line(id, x + 20, 300, x + 310, 300, { tone, sw: 1.4, arrow: 'end' }));
    p.push(text(x + 20, 292, from, { size: 11, fill: C.slate }));
    p.push(text(x + 310, 292, to, { size: 11, weight: 600, fill: t.text, anchor: 'end' }));
  };
  col(20, 'Hygiene factors', 'Prevent dissatisfaction when they are right', 'slate', ['Pay', 'Working conditions', 'Company policy and administration', 'Supervision', 'Relationships at work', 'Job security'], 'Dissatisfied', 'Not dissatisfied');
  col(370, 'Motivators', 'Create satisfaction and effort', 'green', ['Achievement', 'Recognition', 'The work itself', 'Responsibility', 'Advancement', 'Personal growth'], 'Not satisfied', 'Satisfied');
  p.push(para(20, 348, 'Improving hygiene factors removes dissatisfaction but does not motivate; motivation comes from the job itself, as in job enrichment.', 112, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Herzberg’s motivation-hygiene theory',
      desc: 'Two separate scales. Hygiene factors, such as pay, working conditions, company policy and administration, supervision, relationships at work and job security, prevent dissatisfaction when they are right, moving a worker from dissatisfied to not dissatisfied. Motivators, such as achievement, recognition, the work itself, responsibility, advancement and personal growth, create satisfaction and effort, moving a worker from not satisfied to satisfied. Improving hygiene factors removes dissatisfaction but does not motivate; motivation comes from the job itself.',
    },
    p.join(''),
  );
}

/* ---------- Taylor ---------- */
function taylor(id: string): string {
  const W = 720;
  const H = 280;
  const p: string[] = [];
  const steps = ['Study the task: time and motion', 'Find the one best way', 'Select and train workers for it', 'Pay by output: piece rates', 'Higher productivity'];
  const bw = 124;
  const gap = 18;
  steps.forEach((s, i) => {
    const x = 8 + i * (bw + gap);
    p.push(box(x, 50, bw, 78, s, { tone: i === steps.length - 1 ? 'green' : 'ink', style: i === steps.length - 1 ? 'wash' : 'outline', size: 12.5 }));
    if (i < steps.length - 1) p.push(line(id, x + bw + 2, 89, x + bw + gap - 2, 89, { arrow: 'end', sw: 1.5 }));
  });
  p.push(text(8, 30, 'Scientific management (Frederick Taylor)', { size: 14, weight: 700, serif: true, fill: C.ink }));
  p.push(rect(8, 156, 704, 104, { fill: C.signalWash, rx: 3 }));
  p.push(text(24, 180, 'Limits', { size: 12, weight: 700, fill: C.signalText, label: true }));
  p.push(para(24, 200, 'It treats money as the main motivator and work as a set of simple, repeated tasks. Work can become dull and controlled, quality may suffer under piece rates, and staff ideas are not used. Its methods live on in digital Taylorism, the close monitoring of work by data.', 110, { size: 12, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Taylor’s scientific management',
      desc: 'Five steps in a line: study the task through time and motion study, find the one best way to do it, select and train workers for it, pay them by output through piece rates, and so raise productivity. The limits: it treats money as the main motivator and work as simple repeated tasks, so work can become dull and controlled, quality may suffer under piece rates, and staff ideas are not used. Its methods live on in digital Taylorism.',
    },
    p.join(''),
  );
}

/* ---------- McClelland ---------- */
function mcclelland(id: string): string {
  const W = 700;
  const H = 400;
  const p: string[] = [];
  const cs: Array<[number, number, Tone]> = [
    [250, 140, 'gold'],
    [390, 140, 'green'],
    [320, 250, 'cobalt'],
  ];
  for (const [x, y, tone] of cs) p.push(circle(x, y, 92, { fill: TONES[tone].wash, stroke: TONES[tone].line, sw: 1.4, opacity: 0.85 }));
  p.push(text(196, 120, 'Achievement', { size: 14, weight: 700, serif: true, fill: C.goldText, anchor: 'middle' }));
  p.push(text(444, 120, 'Affiliation', { size: 14, weight: 700, serif: true, fill: C.greenText, anchor: 'middle' }));
  p.push(text(320, 312, 'Power', { size: 14, weight: 700, serif: true, fill: C.cobaltText, anchor: 'middle' }));
  p.push(para(320, 186, 'Everyone has all three; one usually dominates', 18, { size: 11, weight: 600, fill: C.ink, anchor: 'middle', middle: true }));
  const notes: Array<[number, string, Tone]> = [
    [40, 'Achievement: seeks challenging goals and feedback. Motivate with stretching targets.', 'gold'],
    [160, 'Affiliation: seeks belonging and good relationships. Motivate with teamwork.', 'green'],
    [280, 'Power: seeks influence over others. Motivate with responsibility and status.', 'cobalt'],
  ];
  notes.forEach(([y, s, tone]) => {
    p.push(rect(520, y, 4, 70, { fill: TONES[tone].line }));
    p.push(para(532, y + 16, s, 24, { size: 11.5, fill: C.body }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'McClelland’s acquired needs theory',
      desc: 'Three overlapping circles for three needs that people acquire through experience. Achievement: seeking challenging goals and feedback, motivated by stretching targets. Affiliation: seeking belonging and good relationships, motivated by teamwork. Power: seeking influence over others, motivated by responsibility and status. Everyone has all three, and one usually dominates.',
    },
    p.join(''),
  );
}

/* ---------- Self-determination theory ---------- */
function sdt(id: string): string {
  const W = 720;
  const H = 320;
  const p: string[] = [];
  const needs: Array<[string, string]> = [
    ['Autonomy', 'Some control over how and when the work is done'],
    ['Competence', 'Feeling able, and getting better, at the work'],
    ['Relatedness', 'Feeling connected to and valued by others'],
  ];
  needs.forEach(([n, s], i) => {
    const y = 26 + i * 92;
    p.push(box(20, y, 260, 76, n, { tone: 'cobalt', size: 14, sub: s }));
    p.push(line(id, 282, y + 38, 440, 150, { tone: 'cobalt', sw: 1.4, arrow: 'end' }));
  });
  p.push(box(444, 96, 256, 110, 'Self-determined (intrinsic) motivation', { tone: 'green', style: 'solid', size: 14.5, sub: 'Doing the work because it is interesting or meaningful' }));
  p.push(para(444, 240, 'Rewards and pressure can crowd out intrinsic motivation if they take away the sense of choice.', 40, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Deci and Ryan’s self-determination theory',
      desc: 'Three basic psychological needs feed self-determined, or intrinsic, motivation: doing the work because it is interesting or meaningful. Autonomy: some control over how and when the work is done. Competence: feeling able, and getting better, at the work. Relatedness: feeling connected to and valued by others. Rewards and pressure can crowd out intrinsic motivation if they take away the sense of choice.',
    },
    p.join(''),
  );
}

/* ---------- Equity theory ---------- */
function equity(id: string): string {
  const W = 700;
  const H = 360;
  const p: string[] = [];
  const cx = 350;
  p.push(poly3(cx, 250));
  p.push(line(id, cx - 220, 110, cx + 220, 110, { sw: 3 }));
  p.push(line(id, cx, 110, cx, 250, { sw: 3 }));
  const pan = (x: number, title: string, tone: Tone) => {
    p.push(line(id, x, 110, x - 70, 170, { stroke: C.slate, sw: 1 }));
    p.push(line(id, x, 110, x + 70, 170, { stroke: C.slate, sw: 1 }));
    p.push(rect(x - 90, 170, 180, 76, { fill: TONES[tone].wash, stroke: TONES[tone].line, sw: 1.2, rx: 3 }));
    p.push(text(x, 196, title, { size: 13, weight: 700, fill: TONES[tone].text, anchor: 'middle' }));
    p.push(text(x, 220, 'Outputs ÷ inputs', { size: 13, weight: 600, fill: C.ink, anchor: 'middle', serif: true, italic: true }));
  };
  pan(cx - 220, 'Me', 'gold');
  pan(cx + 220, 'A colleague I compare with', 'cobalt');
  p.push(para(20, 32, 'Inputs: effort, skill, time, experience, loyalty.', 60, { size: 12, fill: C.body }));
  p.push(para(20, 52, 'Outputs: pay, benefits, recognition, promotion.', 60, { size: 12, fill: C.body }));
  p.push(para(20, 290, 'When the ratios feel equal, people are content. When they feel unequal, people act to restore the balance: they cut their effort, ask for more, change who they compare themselves with, or leave.', 110, { size: 12, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Equity theory',
      desc: 'A balance scale. On one side, a worker’s own ratio of outputs to inputs; on the other, the same ratio for a colleague they compare themselves with. Inputs are effort, skill, time, experience and loyalty; outputs are pay, benefits, recognition and promotion. When the ratios feel equal, people are content; when they feel unequal, people act to restore the balance by cutting their effort, asking for more, changing who they compare themselves with, or leaving.',
    },
    p.join(''),
  );
}

const poly3 = (cx: number, y: number) => `<polygon points="${cx - 40},${y + 30} ${cx + 40},${y + 30} ${cx},${y - 6}" fill="${C.ink}"/>`;

/* ---------- Expectancy theory ---------- */
function expectancy(id: string): string {
  const W = 720;
  const H = 300;
  const p: string[] = [];
  const nodes = ['Effort', 'Performance', 'Reward', 'Valued goal'];
  const xs = [20, 200, 380, 560];
  nodes.forEach((n, i) => p.push(box(xs[i]!, 60, 140, 56, n, { tone: i === 3 ? 'gold' : 'ink', style: i === 0 ? 'solid' : 'wash', size: 14 })));
  const links: Array<[string, string, Tone]> = [
    ['Expectancy (E)', 'Will my effort lead to the performance?', 'cobalt'],
    ['Instrumentality (I)', 'Will the performance bring the reward?', 'green'],
    ['Valence (V)', 'Do I value the reward?', 'gold'],
  ];
  links.forEach(([n, q, tone], i) => {
    const x1 = xs[i]! + 142;
    const x2 = xs[i + 1]! - 2;
    p.push(line(id, x1, 88, x2, 88, { tone, sw: 2, arrow: 'end' }));
    p.push(text((x1 + x2) / 2, 150, n, { size: 12.5, weight: 700, fill: TONES[tone].text, anchor: 'middle' }));
    p.push(para((x1 + x2) / 2 + (i === 0 ? 30 : i === 2 ? -10 : 10), 170, q, 22, { size: 11.5, fill: C.body, anchor: 'middle' }));
  });
  p.push(rect(20, 222, 680, 56, { fill: C.paper, rx: 3 }));
  p.push(text(36, 246, 'Motivation = E × I × V', { size: 15, weight: 700, serif: true, fill: C.ink }));
  p.push(text(36, 266, 'Each is judged by the worker. If any one is close to zero, so is motivation.', { size: 12, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Expectancy theory',
      desc: 'A chain from effort to performance to reward to a valued goal. Expectancy: will my effort lead to the performance? Instrumentality: will the performance bring the reward? Valence: do I value the reward? Motivation equals expectancy times instrumentality times valence, each judged by the worker, so if any one is close to zero, so is motivation.',
    },
    p.join(''),
  );
}

/* ---------- 360-degree appraisal ---------- */
function appraisal(id: string): string {
  const W = 720;
  const H = 380;
  const p: string[] = [];
  const cx = 220;
  const cy = 190;
  p.push(circle(cx, cy, 46, { fill: C.ink }));
  p.push(text(cx, cy + 5, 'Employee', { size: 13, weight: 700, fill: C.white, anchor: 'middle', serif: true }));
  const src = ['Manager', 'Peers', 'Direct reports', 'Customers', 'Self'];
  src.forEach((s, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const x = cx + 140 * Math.cos(a);
    const y = cy + 132 * Math.sin(a);
    p.push(box(x - 56, y - 18, 112, 36, s, { tone: 'gold', size: 12.5 }));
    p.push(line(id, x - 20 * Math.cos(a) * 2.2, y - 20 * Math.sin(a) * 1.4, cx + 52 * Math.cos(a), cy + 52 * Math.sin(a), { tone: 'gold', sw: 1.4, arrow: 'end' }));
  });
  const types: Array<[string, string]> = [
    ['Formative', 'Ongoing feedback during the period, to help the employee improve'],
    ['Summative', 'A judgement at the end of the period, often linked to pay or promotion'],
    ['360-degree feedback', 'Views gathered from everyone the employee works with'],
    ['Self-appraisal', 'The employee assesses their own performance'],
  ];
  p.push(text(420, 34, 'Types of appraisal', { size: 11, weight: 700, fill: C.slate, label: true }));
  types.forEach(([n, s], i) => {
    const y = 60 + i * 76;
    p.push(text(420, y, n, { size: 13, weight: 700, fill: C.ink }));
    p.push(para(420, y + 18, s, 40, { size: 11.5, fill: C.body }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Appraisal, including 360-degree feedback',
      desc: 'An employee at the centre receives feedback from five sources: their manager, peers, direct reports, customers and themselves, which together make 360-degree feedback. Alongside, the four types of appraisal in the guide. Formative: ongoing feedback during the period to help the employee improve. Summative: a judgement at the end of the period, often linked to pay or promotion. 360-degree feedback: views gathered from everyone the employee works with. Self-appraisal: the employee assesses their own performance.',
    },
    p.join(''),
  );
}

/* ---------- Rewards ---------- */
function rewards(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  const col = (x: number, title: string, tone: Tone, items: Array<[string, string]>) => {
    p.push(text(x, 30, title, { size: 15, weight: 700, serif: true, fill: TONES[tone].text }));
    items.forEach(([n, s], i) => p.push(box(x, 44 + i * 48, 330, 40, n, { tone, style: 'outline', size: 12.5, sub: s, subSize: 10.5, align: 'start' })));
  };
  col(16, 'Financial rewards', 'gold', [
    ['Salary', 'A fixed annual amount, paid monthly'],
    ['Wages: time rates and piece rates', 'Paid by the hour, or by the unit produced'],
    ['Commission', 'A share of the value of sales made'],
    ['Performance-related pay', 'Extra pay for meeting individual targets'],
    ['Profit-related pay', 'A share of the business’s profit'],
    ['Employee share ownership schemes', 'Shares in the company, given or sold to staff'],
    ['Fringe payments', 'Benefits in kind: a car, insurance, discounts'],
  ]);
  col(374, 'Non-financial rewards', 'green', [
    ['Job enrichment', 'More challenging, responsible work'],
    ['Job rotation', 'Moving between tasks or roles'],
    ['Job enlargement', 'More tasks at the same level'],
    ['Empowerment', 'Authority to make decisions'],
    ['Purpose', 'Work that feels meaningful'],
    ['Teamwork', 'Working in teams, with shared goals'],
  ]);
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Financial and non-financial rewards',
      desc: 'Two columns of the rewards in the guide. Financial: salary, a fixed annual amount; wages, paid by time rates or piece rates; commission, a share of the value of sales; performance-related pay for meeting targets; profit-related pay, a share of profit; employee share ownership schemes; and fringe payments, benefits in kind. Non-financial: job enrichment, more challenging and responsible work; job rotation between tasks; job enlargement, more tasks at the same level; empowerment, authority to decide; purpose, meaningful work; and teamwork.',
    },
    p.join(''),
  );
}

/* ---------- Handy's Gods of management ---------- */
function handy(id: string): string {
  const W = 720;
  const H = 420;
  const p: string[] = [];
  const panel = (x: number, y: number, n: string, god: string, s: string, tone: Tone, icon: string) => {
    p.push(rect(x, y, 344, 190, { fill: C.white, stroke: TONES[tone].line, sw: 1.1, rx: 3 }));
    p.push(icon);
    p.push(text(x + 140, y + 34, n, { size: 15, weight: 700, serif: true, fill: TONES[tone].text }));
    p.push(text(x + 140, y + 52, god, { size: 11.5, italic: true, fill: C.slate }));
    p.push(para(x + 140, y + 76, s, 30, { size: 11.5, fill: C.body }));
  };
  // Icons drawn at each panel's left.
  const web = (x: number, y: number) => {
    const c = [x + 66, y + 95];
    let d = '';
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      d += `M${c[0]},${c[1]} L${(c[0]! + 52 * Math.cos(a)).toFixed(1)},${(c[1]! + 52 * Math.sin(a)).toFixed(1)} `;
    }
    return `<g fill="none" stroke="${C.ink}" stroke-width="1.3"><path d="${d}"/><circle cx="${c[0]}" cy="${c[1]}" r="16"/><circle cx="${c[0]}" cy="${c[1]}" r="32"/><circle cx="${c[0]}" cy="${c[1]}" r="50"/></g><circle cx="${c[0]}" cy="${c[1]}" r="7" fill="${C.ink}"/>`;
  };
  const temple = (x: number, y: number) =>
    `<g fill="${C.goldWash}" stroke="${C.gold}" stroke-width="1.4"><polygon points="${x + 16},${y + 64} ${x + 66},${y + 38} ${x + 116},${y + 64}"/><rect x="${x + 16}" y="${y + 64}" width="100" height="8"/>${[0, 1, 2, 3]
      .map((k) => `<rect x="${x + 22 + k * 26}" y="${y + 74}" width="10" height="62"/>`)
      .join('')}<rect x="${x + 10}" y="${y + 138}" width="112" height="10"/></g>`;
  const net = (x: number, y: number) => {
    let d = '';
    for (let k = 0; k <= 4; k++) {
      d += `M${x + 18},${y + 48 + k * 24} L${x + 114},${y + 48 + k * 24} M${x + 18 + k * 24},${y + 48} L${x + 18 + k * 24},${y + 144} `;
    }
    const knots = [[1, 1], [2, 3], [3, 1], [1, 3], [3, 3], [2, 2]].map(([i, j]) => `<circle cx="${x + 18 + i! * 24}" cy="${y + 48 + j! * 24}" r="6" fill="${C.cobalt}"/>`).join('');
    return `<path d="${d}" fill="none" stroke="${C.cobalt}" stroke-width="1.2"/>${knots}`;
  };
  const cluster = (x: number, y: number) =>
    [
      [66, 96, 14],
      [36, 72, 10],
      [96, 70, 11],
      [30, 118, 9],
      [100, 122, 12],
      [66, 140, 8],
      [66, 54, 8],
    ]
      .map(([dx, dy, r]) => `<circle cx="${x + dx!}" cy="${y + dy!}" r="${r}" fill="${C.greenWash}" stroke="${C.green}" stroke-width="1.4"/>`)
      .join('');
  panel(10, 16, 'Power culture', 'Zeus: the web', 'Power sits with one person or a few at the centre. Decisions are fast but depend on the leader.', 'ink', web(10, 16));
  panel(366, 16, 'Role culture', 'Apollo: the Greek temple', 'Rules, procedures and job descriptions. Stable and predictable, slow to change.', 'gold', temple(366, 16));
  panel(10, 216, 'Task culture', 'Athena: the net', 'Teams form around projects; expertise matters more than rank. Flexible and creative.', 'cobalt', net(10, 216));
  panel(366, 216, 'Person culture', 'Dionysus: the cluster', 'The individuals come first and the organization serves them, as in some professional partnerships.', 'green', cluster(366, 216));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Charles Handy’s Gods of management',
      desc: 'Four types of organizational culture, each with Handy’s god and image. Power culture, Zeus, the web: power sits with one person or a few at the centre, so decisions are fast but depend on the leader. Role culture, Apollo, the Greek temple: rules, procedures and job descriptions, stable and predictable but slow to change. Task culture, Athena, the net: teams form around projects and expertise matters more than rank, flexible and creative. Person culture, Dionysus, the cluster: the individuals come first and the organization serves them, as in some professional partnerships.',
    },
    p.join(''),
  );
}

/* ---------- Communication ---------- */
function communication(id: string): string {
  const W = 720;
  const H = 360;
  const p: string[] = [];
  const steps: Array<[string, string, Tone]> = [
    ['Sender', 'Has the idea and encodes it', 'ink'],
    ['Message', 'Words, figures, images', 'gold'],
    ['Channel', 'Meeting, email, notice, app', 'gold'],
    ['Receiver', 'Decodes and acts on it', 'ink'],
  ];
  const bw = 150;
  const gap = 28;
  steps.forEach(([n, s, tone], i) => {
    const x = 10 + i * (bw + gap);
    p.push(box(x, 60, bw, 66, n, { tone, style: i === 0 || i === 3 ? 'solid' : 'wash', size: 14, sub: s }));
    if (i < steps.length - 1) p.push(line(id, x + bw + 2, 93, x + bw + gap - 2, 93, { arrow: 'end', sw: 1.6 }));
  });
  p.push(arrowPath(id, `M${10 + 3 * (bw + gap) + bw / 2},128 C${600},190 ${120},190 ${10 + bw / 2},128`, { tone: 'green', sw: 1.6 }));
  p.push(text(W / 2, 192, 'Feedback: the receiver confirms, questions or replies', { size: 12, weight: 600, fill: C.greenText, anchor: 'middle' }));
  p.push(text(10, 36, 'Formal channels follow the structure; informal ones, such as conversation and messaging, run across it.', { size: 11.5, fill: C.slate }));
  p.push(rect(10, 220, 700, 124, { fill: C.signalWash, stroke: C.signal, sw: 1, rx: 3, dash: '5 4' }));
  p.push(text(26, 244, 'Barriers that distort or block the message', { size: 12.5, weight: 700, fill: C.signalText }));
  const barriers = ['Jargon and technical language', 'Information overload', 'The wrong channel for the message', 'Too many levels in the hierarchy', 'Language and cultural differences', 'Noise, distraction and distance', 'Attitudes: distrust or lack of interest', 'Poor listening'];
  barriers.forEach((b, i) => {
    const x = 26 + (i % 2) * 340;
    const y = 268 + Math.floor(i / 2) * 19;
    p.push(circle(x + 4, y - 4, 3, { fill: C.signal }));
    p.push(text(x + 14, y, b, { size: 12, fill: C.body }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The communication process and its barriers',
      desc: 'A sender has an idea and encodes it as a message of words, figures or images, sent through a channel such as a meeting, email, notice or app, to a receiver who decodes and acts on it. Feedback flows back as the receiver confirms, questions or replies. Formal channels follow the structure; informal ones run across it. Barriers that distort or block the message include jargon, information overload, the wrong channel, too many levels in the hierarchy, language and cultural differences, noise and distance, distrust or lack of interest, and poor listening.',
    },
    p.join(''),
  );
}

/* ---------- Industrial relations ---------- */
function conflict(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  const side = (x: number, title: string, tone: Tone, items: string[]) => {
    p.push(text(x, 30, title, { size: 11, weight: 700, fill: TONES[tone].text, label: true }));
    items.forEach((s, i) => p.push(box(x, 42 + i * 44, 230, 36, s, { tone, size: 12 })));
  };
  side(16, 'Approaches by employees', 'cobalt', ['Collective bargaining', 'Work-to-rule', 'Strike action']);
  side(474, 'Approaches by employers', 'gold', ['Collective bargaining', 'Threats of redundancies', 'Changes of contract', 'Closure and lockouts']);
  p.push(arrowPath(id, `M131,180 L131,214 L330,214 L330,246`, { tone: 'cobalt', sw: 1.4 }));
  p.push(arrowPath(id, `M589,224 L589,236 L390,236 L390,246`, { tone: 'gold', sw: 1.4 }));
  p.push(text(360, 110, 'Sources of conflict:', { size: 11.5, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(para(360, 128, 'pay, conditions, job security, change, redundancies, management style', 26, { size: 11.5, fill: C.slate, anchor: 'middle' }));
  p.push(rect(16, 250, 688, 132, { fill: C.greenWash, stroke: C.green, sw: 1.2, rx: 3 }));
  p.push(text(360, 274, 'Approaches to resolving conflict', { size: 13.5, weight: 700, fill: C.greenText, anchor: 'middle' }));
  const res: Array<[string, string]> = [
    ['Conciliation and arbitration', 'A third party helps the sides agree, or decides'],
    ['Employee participation and industrial democracy', 'Staff share in decisions'],
    ['No-strike agreements', 'Disputes go to arbitration instead of strikes'],
    ['Single-union agreements', 'One union negotiates for all staff'],
  ];
  res.forEach(([n, s], i) => {
    p.push(text(32, 300 + i * 20, n, { size: 12, weight: 700, fill: C.ink }));
    p.push(text(420, 300 + i * 20, s, { size: 11, fill: C.slate }));
  });
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Conflict and its resolution in the workplace',
      desc: 'Sources of conflict include pay, conditions, job security, change, redundancies and management style. Employees may respond with collective bargaining, work-to-rule or strike action. Employers may respond with collective bargaining, threats of redundancies, changes of contract, or closure and lockouts. Both lead towards approaches to resolving conflict: conciliation and arbitration, where a third party helps the sides agree or decides; employee participation and industrial democracy, where staff share in decisions; no-strike agreements; and single-union agreements.',
    },
    p.join(''),
  );
}

export const UNIT2: Record<string, DiagramDef> = {
  'hr-planning-factors': { title: 'Factors in human resource planning', caption: 'The internal and external factors that shape how many people a business needs.', syllabus: ['2.1'], level: 'SL/HL', group: 'unit-2', render: hrPlanning },
  'tall-flat-structures': { title: 'Tall and flat structures', caption: 'Levels of hierarchy, span of control and chain of command compared.', syllabus: ['2.2'], level: 'SL/HL', group: 'unit-2', render: tallFlat },
  'org-charts-by-type': { title: 'Organization by function, product and region', caption: 'Three ways to group the same business.', syllabus: ['2.2'], level: 'SL/HL', group: 'unit-2', render: chartsByType },
  'matrix-structure': { title: 'A matrix structure', caption: 'Project teams that draw on every function, each member with two managers.', syllabus: ['2.2'], level: 'SL/HL', group: 'unit-2', render: matrix },
  'shamrock-organization': { title: 'Handy’s Shamrock Organization', caption: 'A professional core, a contractual fringe and a flexible labour force.', syllabus: ['2.2'], level: 'HL', group: 'unit-2', render: shamrock },
  'leadership-styles': { title: 'Leadership styles', caption: 'The five styles in the guide, from the leader deciding to the team deciding.', syllabus: ['2.3'], level: 'SL/HL', group: 'unit-2', render: leadership },
  'taylor-scientific-management': { title: 'Taylor’s scientific management', caption: 'The one best way, piece rates, and the limits of both.', syllabus: ['2.4'], level: 'SL/HL', group: 'unit-2', render: taylor },
  'maslow-hierarchy': { title: 'Maslow’s hierarchy of needs', caption: 'Five levels of need, with workplace examples.', syllabus: ['2.4'], level: 'SL/HL', group: 'unit-2', render: maslow },
  'herzberg-two-factor': { title: 'Herzberg’s motivation-hygiene theory', caption: 'What prevents dissatisfaction is not what motivates.', syllabus: ['2.4'], level: 'SL/HL', group: 'unit-2', render: herzberg },
  'mcclelland-needs': { title: 'McClelland’s acquired needs', caption: 'Achievement, affiliation and power.', syllabus: ['2.4'], level: 'HL', group: 'unit-2', render: mcclelland },
  'self-determination-theory': { title: 'Self-determination theory', caption: 'Autonomy, competence and relatedness feed intrinsic motivation.', syllabus: ['2.4'], level: 'HL', group: 'unit-2', render: sdt },
  'equity-theory': { title: 'Equity theory', caption: 'Comparing what we put in and get out with someone else.', syllabus: ['2.4'], level: 'HL', group: 'unit-2', render: equity },
  'expectancy-theory': { title: 'Expectancy theory', caption: 'Expectancy, instrumentality and valence, multiplied.', syllabus: ['2.4'], level: 'HL', group: 'unit-2', render: expectancy },
  'appraisal-types': { title: 'Appraisal and 360-degree feedback', caption: 'The four types of appraisal in the guide.', syllabus: ['2.4'], level: 'HL', group: 'unit-2', render: appraisal },
  'rewards-financial-non-financial': { title: 'Financial and non-financial rewards', caption: 'Every reward the guide names, with a line on each.', syllabus: ['2.4'], level: 'SL/HL', group: 'unit-2', render: rewards },
  'handy-gods-of-management': { title: 'Handy’s Gods of management', caption: 'Power, role, task and person cultures, with their images.', syllabus: ['2.5'], level: 'HL', group: 'unit-2', render: handy },
  'communication-process': { title: 'The communication process', caption: 'Sender, message, channel, receiver, feedback, and the barriers in between.', syllabus: ['2.6'], level: 'SL/HL', group: 'unit-2', render: communication },
  'industrial-relations': { title: 'Conflict and resolution at work', caption: 'Approaches by employees and employers, and the routes to agreement.', syllabus: ['2.7'], level: 'HL', group: 'unit-2', render: conflict },
};
