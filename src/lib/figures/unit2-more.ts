/**
 * Unit 2 diagrams a reader can change, compare or explore: how the span of
 * control sets the levels of hierarchy (2.2), the leadership styles side by
 * side (2.3), and the directions communication flows in an organization
 * (2.6). Each has a layout for phones.
 */
import type { DiagramDef, DiagramPanel, DiagramPart, LiveInput } from '../diagrams';
import { C, NW, arrowPath, badge, charsFor, circle, frame, line, part, rect, text, wrap, type RenderOpts, type Tone } from './kit';
import { LIVE, defaults } from './live';

const lines = (s: string, width: number, size: number, lh = size * 1.3) => {
  const l = wrap(s, charsFor(width, size));
  return { lines: l, h: l.length * lh };
};

/* ------------------------------------------------------------------ */
/* Span of control (2.2): live                                          */
/* ------------------------------------------------------------------ */

const SPAN_INPUTS: LiveInput[] = [
  { key: 'frontLine', label: 'Front-line staff', min: 2, max: 1000, step: 1, value: 64 },
  { key: 'span', label: 'Span of control (people per manager)', min: 2, max: 20, step: 1, value: 4 },
];

/* ------------------------------------------------------------------ */
/* Leadership styles, two at a time (2.3)                               */
/* ------------------------------------------------------------------ */

interface Style {
  id: string;
  label: string;
  caption: string;
  facts: Array<[string, string]>;
}

const STYLES: Style[] = [
  {
    id: 'autocratic',
    label: 'Autocratic',
    caption: 'The leader decides alone and gives instructions',
    facts: [
      ['Who decides', 'The leader, alone'],
      ['Staff involvement', 'Little: staff carry out instructions'],
      ['Communication', 'One way, downward'],
      ['Speed of decisions', 'Fast'],
      ['Suits', 'A crisis, a simple or dangerous task, people new to the work'],
      ['Risks', 'Low morale and commitment; ideas from staff go unheard'],
    ],
  },
  {
    id: 'paternalistic',
    label: 'Paternalistic',
    caption: 'The leader decides alone, in what they see as the staff’s best interests',
    facts: [
      ['Who decides', 'The leader, alone, after hearing staff'],
      ['Staff involvement', 'Consulted and cared for, but not deciding'],
      ['Communication', 'Mostly downward, with views heard upward'],
      ['Speed of decisions', 'Fairly fast'],
      ['Suits', 'Staff who value security and trust the leader'],
      ['Risks', 'Dependence on the leader; staff may feel talked down to'],
    ],
  },
  {
    id: 'democratic',
    label: 'Democratic',
    caption: 'The leader consults, and decisions are shaped by the people affected',
    facts: [
      ['Who decides', 'The leader with the team, sometimes by a vote'],
      ['Staff involvement', 'High: staff shape the decision'],
      ['Communication', 'Two way, and across the team'],
      ['Speed of decisions', 'Slower'],
      ['Suits', 'People with knowledge to contribute, where commitment matters'],
      ['Risks', 'Slow decisions; a split team; too slow for a crisis'],
    ],
  },
  {
    id: 'laissez-faire',
    label: 'Laissez-faire',
    caption: 'The leader sets the goal and few rules, and the team decides how',
    facts: [
      ['Who decides', 'The team'],
      ['Staff involvement', 'Very high: staff organize themselves'],
      ['Communication', 'Mostly within the team'],
      ['Speed of decisions', 'Depends on the team'],
      ['Suits', 'An expert, motivated team that works best with autonomy'],
      ['Risks', 'Drift, unclear roles and missed deadlines if the team is not ready'],
    ],
  },
  {
    id: 'situational',
    label: 'Situational',
    caption: 'The leader adapts the style to the task and to the team’s readiness',
    facts: [
      ['Who decides', 'It varies: the style follows the situation'],
      ['Staff involvement', 'Grows as the team grows more capable'],
      ['Communication', 'Matched to the style in use'],
      ['Speed of decisions', 'Fast when it must be, slower when it can be'],
      ['Suits', 'Teams and tasks that differ, as two shifts or two projects do'],
      ['Risks', 'Can look inconsistent; needs a leader who reads situations well'],
    ],
  },
];

const STYLE_PANELS: DiagramPanel[] = STYLES.map((s) => ({ id: s.id, label: s.label, facts: s.facts }));

function person(x: number, y: number, fill: string): string {
  return circle(x, y - 9, 7, { fill }) + `<path d="M${(x - 11).toFixed(1)},${y + 12} Q${x.toFixed(1)},${y - 7} ${(x + 11).toFixed(1)},${y + 12} Z" fill="${fill}"/>`;
}

/** One style, drawn for a panel 300 wide: who decides, and which way communication runs. */
function stylePanel(id: string, sid: string): string {
  const s = STYLES.find((x) => x.id === sid) ?? STYLES[0]!;
  const p: string[] = [];
  const lx = NW / 2;
  const ly = 30;
  const team = [44, 113, 187, 256];
  const ty = 156;
  const leaderFill = C.ink;
  p.push(person(lx, ly, leaderFill));
  p.push(text(lx + 22, ly + 6, 'Leader', { size: 14, weight: 700, fill: C.ink }));
  team.forEach((x) => p.push(person(x, ty, C.slate)));
  p.push(text(NW / 2, ty + (s.id === 'laissez-faire' ? 44 : 34), 'Team', { size: 14, weight: 700, fill: C.slate, anchor: 'middle' }));
  const down = (x: number, o: { dash?: string; sw?: number; tone?: Tone } = {}) => line(id, lx, ly + 16, x, ty - 22, { sw: o.sw ?? 2.2, arrow: 'end', dash: o.dash, tone: o.tone ?? 'ink' });
  const up = (x: number, o: { dash?: string; sw?: number; tone?: Tone } = {}) => line(id, x + (x < lx ? 16 : -16), ty - 22, lx + (x < lx ? -14 : 14), ly + 22, { sw: o.sw ?? 1.4, arrow: 'end', dash: o.dash, tone: o.tone ?? 'cobalt' });
  let note: string;
  if (s.id === 'autocratic') {
    team.forEach((x) => p.push(down(x, { sw: 2.6 })));
    note = 'Instructions go down; nothing comes back up.';
  } else if (s.id === 'paternalistic') {
    team.forEach((x) => p.push(down(x, { sw: 2.4 })));
    team.forEach((x) => p.push(up(x, { dash: '4 4', sw: 1.4 })));
    note = 'Instructions go down; views come up, but the leader decides.';
  } else if (s.id === 'democratic') {
    team.forEach((x) => p.push(line(id, lx, ly + 16, x, ty - 22, { sw: 1.8, arrow: 'both', tone: 'cobalt' })));
    for (let i = 0; i < team.length - 1; i++) p.push(line(id, team[i]! + 14, ty - 2, team[i + 1]! - 14, ty - 2, { sw: 1.6, arrow: 'both', tone: 'cobalt' }));
    note = 'Views flow both ways and across the team; the decision is shared.';
  } else if (s.id === 'laissez-faire') {
    p.push(rect(18, ty - 34, NW - 36, 58, { stroke: C.slate, sw: 1.2, dash: '5 4', rx: 8 }));
    p.push(line(id, lx, ly + 16, lx, ty - 38, { sw: 1.8, arrow: 'end', dash: '6 4' }));
    p.push(text(lx + 8, (ly + ty) / 2 - 4, 'the goal', { size: 14, italic: true, fill: C.ink }));
    for (let i = 0; i < team.length - 1; i++) p.push(line(id, team[i]! + 14, ty - 2, team[i + 1]! - 14, ty - 2, { sw: 1.6, arrow: 'both', tone: 'cobalt' }));
    note = 'The leader sets the goal; the team decides how to reach it.';
  } else {
    // A scale from leader-decides to team-decides, with the style moving along it.
    p.push(line(id, 24, 96, NW - 24, 96, { sw: 1.6, arrow: 'both', tone: 'slate' }));
    p.push(text(4, 76, 'Leader decides', { size: 14, weight: 600, fill: C.slate }));
    p.push(text(NW - 4, 76, 'Team decides', { size: 14, weight: 600, fill: C.slate, anchor: 'end' }));
    const marks: Array<[number, string]> = [
      [40, 'Crisis'],
      [150, 'New team'],
      [262, 'Experts'],
    ];
    marks.forEach(([x, l], i) => {
      p.push(circle(x, 96, 7, { fill: i === 0 ? C.ink : i === 1 ? C.slate : C.white, stroke: C.ink, sw: 1.6 }));
      p.push(text(x, 122, l, { size: 14, weight: 600, fill: C.ink, anchor: 'middle' }));
    });
    note = 'Directing in a crisis, coaching a new team, delegating to experts.';
  }
  const capY = ty + 62;
  const cap = lines(s.caption, NW, 14, 18);
  p.push(text(0, capY, cap.lines.join('\n'), { size: 14, weight: 700, fill: C.ink, lh: 18 }));
  const nl = lines(note, NW, 14, 18);
  p.push(text(0, capY + cap.h + 4, nl.lines.join('\n'), { size: 14, fill: C.body, lh: 18 }));
  const H = capY + cap.h + nl.h + 8;
  return frame(
    {
      id,
      w: NW,
      h: H,
      title: `${s.label} leadership`,
      alt: `${s.label} leadership: ${s.caption.charAt(0).toLowerCase()}${s.caption.slice(1)}.`,
      desc: `${s.label} leadership. ${s.caption}. ${note} ${s.facts.map(([k, v]) => `${k}: ${v}`).join('. ')}.`,
    },
    p.join(''),
  );
}

function styleGrid(id: string): string {
  const gap = 28;
  const pieces = STYLES.map((s, i) => {
    const svg = stylePanel(`${id}-${i}`, s.id);
    return { s, svg, h: Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)?.[1] ?? 300) };
  });
  const rowH = Math.max(...pieces.map((x) => x.h)) + 40;
  const cols = 3;
  const W = cols * NW + (cols - 1) * gap;
  const H = rowH * 2 + 10;
  const body = pieces
    .map(({ s, svg }, i) => {
      const x = (i % cols) * (NW + gap);
      const y = Math.floor(i / cols) * rowH;
      const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title[^>]*>[\s\S]*?<\/title><desc[^>]*>[\s\S]*?<\/desc>/, '');
      return `<g transform="translate(${x} ${y})">${text(0, 18, s.label, { size: 17, weight: 700, serif: true, fill: C.ink })}<g transform="translate(0 30)">${inner}</g></g>`;
    })
    .join('');
  return frame({ id, w: W, h: H, title: 'Leadership styles compared', alt: STYLES_ALT, desc: STYLES_DESC }, body);
}

const STYLES_ALT = 'Five small diagrams, one for each leadership style in the guide, showing who decides and which way communication runs between the leader and the team.';
const STYLES_DESC = `The five leadership styles in the guide, each drawn as a leader and a team with the direction of communication. ${STYLES.map((s) => `${s.label}: ${s.caption.toLowerCase()}. ${s.facts.map(([k, v]) => `${k}: ${v.toLowerCase()}`).join('; ')}.`).join(' ')}`;

/* ------------------------------------------------------------------ */
/* Communication flows (2.6)                                            */
/* ------------------------------------------------------------------ */

const FLOW_PARTS: DiagramPart[] = [
  { id: 'downward', label: 'Downward communication', text: 'Down the chain of command: instructions, targets and policies, through briefings, emails, memos and notices. It is formal, and every extra level it passes through is a chance for the message to be delayed or distorted.', code: '2.6' },
  { id: 'upward', label: 'Upward communication', text: 'From staff to managers: feedback, reports, suggestions and complaints, through meetings, appraisals, surveys and suggestion schemes. Without it managers decide without the knowledge of the people who do the work.', code: '2.6' },
  { id: 'horizontal', label: 'Horizontal communication', text: 'Between people at the same level in different departments, to coordinate: meetings, shared documents and project teams. Marketing and operations must agree what can be made and when.', code: '2.6' },
  { id: 'diagonal', label: 'Diagonal communication', text: 'Across departments and levels at once, such as a marketing assistant asking the operations manager directly. It is fast, but it bypasses the chain of command, so line managers can be left out.', code: '2.2' },
  { id: 'informal', label: 'Informal communication: the grapevine', text: 'Conversation outside the formal structure: chats, social media groups and gossip. It is quick and builds relationships, but rumours spread on it and it cannot be controlled. Managers can listen to it, and keep formal channels open so it does not fill a silence.', code: '2.6' },
];

const FLOW_DESC = 'An organization chart of a fictional business: a chief executive at the top, three department heads below (marketing, operations and finance) and two staff in each department. Five kinds of communication are marked. Downward: from the chief executive to a department head, carrying instructions, targets and policies. Upward: from a member of staff to their head, carrying feedback, reports and suggestions. Horizontal: between the heads of marketing and operations, to coordinate. Diagonal: from a marketing assistant directly to the head of operations, across departments and levels, which is fast but bypasses the chain of command. Informal: a dashed line between staff in operations and finance, the grapevine, quick but prone to rumour. The first four are formal methods, following or crossing the structure; the last is informal.';
const FLOW_ALT = 'An organization chart with five kinds of communication marked on it: downward, upward, horizontal, diagonal and informal.';

function flows(id: string, o: RenderOpts | undefined, narrow: boolean): string {
  const p: string[] = [];
  const W = narrow ? NW : 720;
  const ceo = narrow ? { x: 100, y: 10, w: 100, h: 36 } : { x: 300, y: 18, w: 120, h: 44 };
  const headY = narrow ? 120 : 150;
  const headW = narrow ? 86 : 132;
  const headH = narrow ? 34 : 44;
  const headX = narrow ? [0, 107, 214] : [70, 294, 518];
  const staffY = narrow ? 236 : 290;
  const heads = ['Marketing', 'Operations', 'Finance'];
  const size = narrow ? 14 : 13.5;
  // Structure lines.
  const cx = ceo.x + ceo.w / 2;
  const busY = (ceo.y + ceo.h + headY) / 2;
  p.push(line(id, cx, ceo.y + ceo.h, cx, busY, { stroke: C.rule, sw: 1.4 }));
  p.push(line(id, headX[0]! + headW / 2, busY, headX[2]! + headW / 2, busY, { stroke: C.rule, sw: 1.4 }));
  const staffX: number[] = [];
  heads.forEach((_, i) => {
    const hx = headX[i]! + headW / 2;
    p.push(line(id, hx, busY, hx, headY, { stroke: C.rule, sw: 1.4 }));
    const sBus = (headY + headH + staffY) / 2;
    p.push(line(id, hx, headY + headH, hx, sBus, { stroke: C.rule, sw: 1.4 }));
    const off = narrow ? 24 : 38;
    p.push(line(id, hx - off, sBus, hx + off, sBus, { stroke: C.rule, sw: 1.4 }));
    for (const dx of [-off, off]) {
      p.push(line(id, hx + dx, sBus, hx + dx, staffY - (narrow ? 14 : 18), { stroke: C.rule, sw: 1.4 }));
      staffX.push(hx + dx);
    }
  });
  p.push(rect(ceo.x, ceo.y, ceo.w, ceo.h, { fill: C.ink, rx: 3 }));
  p.push(text(cx, ceo.y + ceo.h / 2 + 5, narrow ? 'Chief exec' : 'Chief executive', { size, weight: 700, fill: C.white, anchor: 'middle' }));
  heads.forEach((h, i) => {
    p.push(rect(headX[i]!, headY, headW, headH, { fill: C.paper, stroke: C.ink, sw: 1.2, rx: 3 }));
    p.push(text(headX[i]! + headW / 2, headY + headH / 2 + 5, h, { size, weight: 700, fill: C.ink, anchor: 'middle' }));
  });
  staffX.forEach((x) => p.push(person(x, staffY + (narrow ? 4 : 6), C.slate)));
  // The five flows.
  const label = (x: number, y: number, n: number, s: string, anchor: 'start' | 'middle' | 'end' = 'start') =>
    narrow ? badge(x, y, n, { rad: 14 }) : text(x, y, s, { size: 13, weight: 700, fill: C.ink, anchor });
  const ar = { sw: 2.6, arrow: 'end' as const };
  // 1. Downward: chief executive to the head of marketing.
  {
    const x1 = cx - (narrow ? 30 : 40);
    const y1 = ceo.y + ceo.h + 2;
    const x2 = headX[0]! + headW / 2 + (narrow ? 10 : 20);
    const y2 = headY - 4;
    const inner = line(id, x1, y1, x2, y2, { ...ar, tone: 'ink' }) + label(narrow ? (x1 + x2) / 2 + 14 : ceo.x - 6, narrow ? (y1 + y2) / 2 - 6 : ceo.y + ceo.h - 6, 1, '1 Downward', 'end');
    p.push(part(o, 'downward', FLOW_PARTS[0]!.label, [Math.min(x1, x2) - 6, y1 - (narrow ? 4 : 22), Math.abs(x2 - x1) + (narrow ? 40 : 20), y2 - y1 + (narrow ? 8 : 26)], inner));
  }
  // 2. Upward: a member of operations staff to the head of operations.
  {
    const sx = staffX[3]!;
    const x2 = headX[1]! + headW - (narrow ? 14 : 20);
    const inner = line(id, sx, staffY - (narrow ? 24 : 30), x2, headY + headH + 3, { ...ar, tone: 'cobalt' }) + label(sx + (narrow ? 14 : 12), (staffY + headY + headH) / 2 + 6, 2, '2 Upward');
    p.push(part(o, 'upward', FLOW_PARTS[1]!.label, [x2 - 12, headY + headH, sx - x2 + (narrow ? 40 : 100), staffY - headY - headH - 6], inner));
  }
  // 3. Horizontal: marketing and operations.
  {
    const y = headY + headH / 2;
    const x1 = headX[0]! + headW + 3;
    const x2 = headX[1]! - 3;
    const inner = line(id, x1, y, x2, y, { sw: 2.6, arrow: 'both', tone: 'gold' }) + label((x1 + x2) / 2, narrow ? y - 16 : y - 12, 3, '3 Horizontal', 'middle');
    p.push(part(o, 'horizontal', FLOW_PARTS[2]!.label, [x1 - 2, y - (narrow ? 30 : 28), x2 - x1 + 4, narrow ? 40 : 40], inner));
  }
  // 4. Diagonal: a marketing assistant straight to the head of operations.
  {
    const sx = staffX[1]!;
    const x2 = headX[1]! + (narrow ? 16 : 24);
    const y2 = headY + headH + 4;
    const inner = line(id, sx + 6, staffY - (narrow ? 24 : 30), x2, y2, { ...ar, tone: 'green' }) + label(narrow ? sx + 30 : (sx + x2) / 2 - 10, narrow ? staffY - 48 : y2 + 26, 4, '4 Diagonal', 'end');
    p.push(part(o, 'diagonal', FLOW_PARTS[3]!.label, [Math.min(sx, x2) - (narrow ? 4 : 80), y2 - 4, Math.abs(x2 - sx) + (narrow ? 26 : 90), staffY - y2 - 12], inner));
  }
  // 5. Informal: staff in operations and finance, across the structure.
  {
    const a = staffX[3]!;
    const b = staffX[4]!;
    const yb = staffY + (narrow ? 24 : 30);
    const inner =
      arrowPath(id, `M${a},${yb} C${a + 10},${yb + (narrow ? 40 : 46)} ${b - 10},${yb + (narrow ? 40 : 46)} ${b},${yb}`, { sw: 2.2, arrow: 'both', dash: '6 5', tone: 'signal' }) +
      label((a + b) / 2, yb + (narrow ? 50 : 58), 5, '5 Informal: the grapevine', 'middle');
    p.push(part(o, 'informal', FLOW_PARTS[4]!.label, [a - 10, yb - 6, b - a + 20, narrow ? 66 : 70], inner));
  }
  let H = staffY + (narrow ? 96 : 110);
  if (narrow) {
    let y = H;
    FLOW_PARTS.forEach((fp, i) => {
      const short = ['instructions, targets', 'feedback, reports', 'coordination', 'across levels and departments', 'chat and rumour'][i]!;
      const l = lines(`${fp.label.replace(' communication', '').replace(': the grapevine', '')}: ${short}`, NW - 36, 14, 18);
      p.push(badge(14, y - 5, i + 1, { rad: 14 }));
      p.push(text(36, y, l.lines.join('\n'), { size: 14, fill: C.body, lh: 18 }));
      y += Math.max(l.h, 24) + 8;
    });
    H = y + 4;
  } else {
    p.push(text(W, H - 10, 'Formal: 1 to 4. Informal: 5.', { size: 13, italic: true, fill: C.slate, anchor: 'end' }));
  }
  return frame({ id, w: W, h: H, title: 'Communication flows in an organization', alt: FLOW_ALT, desc: FLOW_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

/* ------------------------------------------------------------------ */
/* The register                                                         */
/* ------------------------------------------------------------------ */

export const UNIT2_MORE: Record<string, DiagramDef> = {
  'span-of-control': {
    title: 'Span of control and levels of hierarchy',
    caption: 'Change the span of control and see the levels, the managers and the chain of command change with it.',
    syllabus: ['2.2'],
    level: 'SL/HL',
    group: 'unit-2',
    alt: LIVE.span.alt,
    howTo: 'Change the number of staff or the span of control; the structure redraws.',
    ix: { kind: 'live', model: 'span', inputs: SPAN_INPUTS },
    render: (id) => LIVE.span.draw(id, defaults(SPAN_INPUTS), false),
    narrow: (id) => LIVE.span.draw(id, defaults(SPAN_INPUTS), true),
  },
  'leadership-compare': {
    title: 'Leadership styles compared',
    caption: 'Who decides, and which way communication runs, in each of the five styles: choose two to set side by side.',
    syllabus: ['2.3'],
    level: 'SL/HL',
    group: 'unit-2',
    alt: STYLES_ALT,
    howTo: 'Choose two styles to compare; the facts that differ are marked.',
    ix: { kind: 'compare', legend: 'Compare two leadership styles', panels: STYLE_PANELS, draw: (id, pid) => stylePanel(id, pid), first: ['autocratic', 'democratic'] },
    render: styleGrid,
  },
  'communication-flows': {
    title: 'Communication flows in an organization',
    caption: 'Downward, upward, horizontal, diagonal and informal communication on one organization chart.',
    syllabus: ['2.6', '2.2'],
    level: 'SL/HL',
    group: 'unit-2',
    alt: FLOW_ALT,
    parts: FLOW_PARTS,
    howTo: 'Point to a flow, or tab to it, to read what it carries; select it to open its subtopic.',
    render: (id, o) => flows(id, o, false),
    narrow: (id, o) => flows(id, o, true),
  },
};
