/**
 * A map of the business management toolkit: where each of the guide's
 * fifteen tools helps in a strategic decision, from analysing the situation
 * to planning the work. Each tool is a part that explains the question it
 * answers and opens its page in the frameworks library. The order is the
 * platform's way of seeing the tools together, not one the guide sets.
 */
import type { DiagramDef, DiagramPart } from '../diagrams';
import { C, NW, charsFor, frame, line, part, rect, text, wrap, type RenderOpts } from './kit';

interface Tool {
  id: string;
  name: string;
  hl: boolean;
  question: string;
}

interface Stage {
  title: string;
  ask: string;
  tools: Tool[];
}

const tool = (id: string, name: string, hl: boolean, question: string): Tool => ({ id, name, hl, question });

const STAGES: Stage[] = [
  {
    title: 'Analyse the situation',
    ask: 'Where do we stand?',
    tools: [
      tool('swot-analysis', 'SWOT analysis', false, 'Where does the business stand before it decides, inside and out?'),
      tool('steeple-analysis', 'STEEPLE analysis', false, 'What is changing outside the business that could affect this decision?'),
      tool('descriptive-statistics', 'Descriptive statistics', false, 'What does this data actually show, and how much does it vary?'),
      tool('simple-linear-regression', 'Simple linear regression', true, 'How closely are these two things linked, and what might happen next?'),
      tool('hofstedes-cultural-dimensions', 'Hofstede’s cultural dimensions', true, 'How might this country’s culture change the way we manage, sell or negotiate here?'),
    ],
  },
  {
    title: 'Choose a direction',
    ask: 'Where could we go?',
    tools: [
      tool('ansoff-matrix', 'Ansoff matrix', false, 'Which route to growth suits this business, and how much risk does it carry?'),
      tool('porters-generic-strategies', 'Porter’s generic strategies', true, 'On what basis will we beat our competitors, and across how much of the market?'),
      tool('bcg-matrix', 'BCG matrix', false, 'Which of our products should we invest in, keep, rethink or let go?'),
      tool('circular-business-models', 'Circular business models', false, 'How can the business earn more while using fewer new resources?'),
    ],
  },
  {
    title: 'Weigh the options',
    ask: 'Which option is best?',
    tools: [
      tool('decision-trees', 'Decision trees', false, 'Taking the risks into account, which option is likely to pay off best?'),
      tool('force-field-analysis', 'Force field analysis', true, 'What is pushing for this change, what is holding it back, and which force should we work on?'),
      tool('contribution', 'Contribution', true, 'Does this decision add to profit once only the costs it changes are counted?'),
    ],
  },
  {
    title: 'Plan the work',
    ask: 'How will we do it?',
    tools: [
      tool('business-plan', 'Business plan', false, 'Is this business idea viable, and can we convince others to back it?'),
      tool('gantt-chart', 'Gantt chart', true, 'When does each task happen, and is the project on schedule?'),
      tool('critical-path-analysis', 'Critical path analysis', true, 'How long will the project take, and which activities can we not afford to delay?'),
    ],
  },
];

const ALL = STAGES.flatMap((s) => s.tools);

const MAP_PARTS: DiagramPart[] = ALL.map((t) => ({
  id: t.id,
  label: `${t.name}${t.hl ? ' (HL)' : ''}`,
  text: `The question it answers: ${t.question}`,
  href: `/frameworks/${t.id}/`,
  hrefLabel: `${t.name}: the framework explained`,
}));

const MAP_DESC = `The fifteen tools of the business management toolkit, placed at the stage of a strategic decision where each helps most. ${STAGES.map((s) => `${s.title} (${s.ask.toLowerCase().replace(/\?$/, '')}): ${s.tools.map((t) => `${t.name}${t.hl ? ', HL only' : ''}`).join('; ')}.`).join(' ')} Many tools serve more than one stage; the order is a way to see them together, not one the guide prescribes.`;
const MAP_ALT = 'Four stages of a strategic decision, from analysing the situation to planning the work, with the toolkit tools that help at each stage listed under it.';

function strategyMap(id: string, o: RenderOpts | undefined, narrow: boolean): string {
  const p: string[] = [];
  if (!narrow) {
    const W = 720;
    const cw = 168;
    const gap = 16;
    let maxY = 0;
    const titleLines = STAGES.map((s) => wrap(s.title, charsFor(cw - 20, 14)));
    const headH = 34 + Math.max(...titleLines.map((t) => t.length)) * 17 + 4;
    STAGES.forEach((s, i) => {
      const x = i * (cw + gap);
      p.push(rect(x, 0, cw, headH, { fill: C.ink, rx: 3 }));
      const tl = titleLines[i]!;
      p.push(text(x + 10, 24, tl.join('\n'), { size: 14, weight: 700, serif: true, fill: C.white, lh: 17 }));
      p.push(text(x + 10, 24 + tl.length * 17 + 4, s.ask, { size: 13, italic: true, fill: '#d9d3c4' }));
      if (i < STAGES.length - 1) p.push(line(id, x + cw + 2, headH / 2, x + cw + gap - 2, headH / 2, { sw: 1.8, arrow: 'end' }));
      let y = headH + 14;
      for (const t of s.tools) {
        const nl = wrap(t.name, charsFor(cw - 46, 13));
        const h = nl.length * 16 + 18;
        const inner =
          rect(x, y, cw, h, { fill: C.white, stroke: C.rule, sw: 1.2, rx: 3 }) +
          text(x + 10, y + 21, nl.join('\n'), { size: 13, weight: 600, fill: C.ink, lh: 16 }) +
          (t.hl ? rect(x + cw - 34, y + 8, 26, 17, { fill: C.ink, rx: 2 }) + text(x + cw - 21, y + 21, 'HL', { size: 13, weight: 700, fill: C.white, anchor: 'middle' }) : '');
        p.push(part(o, t.id, MAP_PARTS.find((m) => m.id === t.id)!.label, [x, y, cw, h], inner));
        y += h + 8;
      }
      maxY = Math.max(maxY, y);
    });
    const H = maxY + 34;
    p.push(text(2, H - 10, 'Many tools serve more than one stage; this order is a way to see them together, not one the guide prescribes.', { size: 13, italic: true, fill: C.slate }));
    return frame({ id, w: W, h: H, title: 'Where each toolkit tool helps', alt: MAP_ALT, desc: MAP_DESC, interactive: Boolean(o?.link) }, p.join(''));
  }
  let y = 0;
  STAGES.forEach((s, i) => {
    p.push(rect(0, y, NW, 34, { fill: C.ink, rx: 3 }));
    p.push(text(10, y + 22, `${i + 1}. ${s.title}`, { size: 15, weight: 700, serif: true, fill: C.white }));
    y += 42;
    for (const t of s.tools) {
      const inner =
        rect(14, y, NW - 14, 32, { fill: C.white, stroke: C.rule, sw: 1.2, rx: 3 }) +
        text(24, y + 21, t.name, { size: 14, weight: 600, fill: C.ink }) +
        (t.hl ? rect(NW - 36, y + 7, 28, 18, { fill: C.ink, rx: 2 }) + text(NW - 22, y + 21, 'HL', { size: 14, weight: 700, fill: C.white, anchor: 'middle' }) : '');
      p.push(part(o, t.id, MAP_PARTS.find((m) => m.id === t.id)!.label, [14, y, NW - 14, 32], inner));
      y += 38;
    }
    if (i < STAGES.length - 1) {
      p.push(line(id, NW / 2, y - 2, NW / 2, y + 12, { sw: 1.8, arrow: 'end' }));
      y += 18;
    }
  });
  const note = wrap('Many tools serve more than one stage; this order is the platform’s, not the guide’s.', charsFor(NW, 14));
  p.push(text(2, y + 18, note.join('\n'), { size: 14, italic: true, fill: C.slate, lh: 18 }));
  return frame({ id, w: NW, h: y + 20 + note.length * 18, title: 'Where each toolkit tool helps', alt: MAP_ALT, desc: MAP_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

export const TOOLKIT_MORE: Record<string, DiagramDef> = {
  'toolkit-map': {
    title: 'Where each toolkit tool helps',
    caption: 'The fifteen toolkit tools placed at the stage of a strategic decision where each helps most; each opens its framework page.',
    syllabus: ['1.3', '1.5'],
    level: 'SL/HL',
    group: 'toolkit',
    alt: MAP_ALT,
    parts: MAP_PARTS,
    howTo: 'Point to a tool, or tab to it, to read the question it answers; select it to open the framework.',
    render: (id, o) => strategyMap(id, o, false),
    narrow: (id, o) => strategyMap(id, o, true),
  },
};
