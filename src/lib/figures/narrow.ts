/**
 * Layouts for phones, shared by the diagrams that are redrawn for a narrow
 * screen: a two by two grid and a stack of boxes. Everything is 300 units
 * wide with no text under 14 units, so on a 320 pixel screen the labels stay
 * at 12 pixels or more. Each returns its markup and the height it took.
 */
import { C, NW, TONES, badge, charsFor, line, rect, text, wrap, type Tone } from './kit';

export interface Drawn {
  body: string;
  h: number;
}

/** Wrapped text at (x, top): the markup and the height it takes. */
export function block(x: number, top: number, s: string, width: number, o: { size?: number; weight?: number; fill?: string; italic?: boolean; serif?: boolean; lh?: number; anchor?: 'start' | 'middle' | 'end' } = {}): Drawn {
  const size = o.size ?? 14;
  const lh = o.lh ?? Math.round(size * 1.3);
  // Slanted glyphs lean left of where they start: italic text starts 2 units in, so it stays inside the frame.
  const nudge = o.italic && (o.anchor ?? 'start') === 'start' ? 2 : 0;
  const lines = wrap(s, charsFor(width - nudge, size));
  const body = text(x + nudge, top + size * 0.92, lines.join('\n'), { size, weight: o.weight, fill: o.fill ?? C.body, italic: o.italic, serif: o.serif, lh, anchor: o.anchor });
  return { body, h: lines.length * lh };
}

export interface GridCell {
  title: string;
  text?: string;
  sub?: string;
  tone: Tone;
  letter?: string;
}

export interface Grid2Spec {
  colAxis?: string;
  colLabels: [string, string];
  rowAxis?: string;
  rowLabels: [string, string];
  /** Row by row: top left, top right, bottom left, bottom right. */
  cells: [GridCell, GridCell, GridCell, GridCell];
  note?: string;
  noteTone?: Tone;
}

/** A two by two grid for a phone: column labels above, each row labelled across its two cells. */
export function grid2(s: Grid2Spec): Drawn {
  const p: string[] = [];
  const gap = 8;
  const cw = (NW - gap) / 2;
  let y = 0;
  if (s.colAxis) {
    p.push(text(NW / 2, y + 14, s.colAxis, { size: 14, weight: 700, fill: C.ink, anchor: 'middle', label: true }));
    y += 24;
  }
  s.colLabels.forEach((l, i) => p.push(text(i * (cw + gap) + cw / 2, y + 14, l, { size: 14, weight: 600, fill: C.slate, anchor: 'middle' })));
  y += 26;
  for (let r = 0; r < 2; r++) {
    const rl = block(0, y, `${s.rowAxis ? `${s.rowAxis}: ` : ''}${s.rowLabels[r]}`, NW, { size: 14, weight: 700, fill: C.ink });
    p.push(rl.body);
    y += rl.h + 6;
    const cells = [s.cells[r * 2]!, s.cells[r * 2 + 1]!];
    const parts = cells.map((c) => {
      const tw = cw - 20;
      const title = block(10, 0, c.title, tw - (c.letter ? 28 : 0), { size: 15, weight: 700, serif: true, lh: 18 });
      const body = c.text ? block(10, 0, c.text, tw) : { body: '', h: 0 };
      const sub = c.sub ? block(10, 0, c.sub, tw, { italic: true, fill: C.slate }) : { body: '', h: 0 };
      return { c, title, body, sub, h: 12 + Math.max(title.h, c.letter ? 30 : 0) + (body.h ? 6 + body.h : 0) + (sub.h ? 6 + sub.h : 0) + 12 };
    });
    const h = Math.max(...parts.map((x) => x.h));
    parts.forEach(({ c }, i) => {
      const x = i * (cw + gap);
      const t = TONES[c.tone];
      p.push(rect(x, y, cw, h, { fill: t.wash, stroke: t.line, sw: 1.2, rx: 3 }));
      let yy = y + 12;
      if (c.letter) p.push(text(x + cw - 12, y + 34, c.letter, { size: 30, weight: 700, serif: true, italic: true, fill: t.line, anchor: 'end' }));
      const title = block(x + 10, yy, c.title, cw - 20 - (c.letter ? 28 : 0), { size: 15, weight: 700, serif: true, fill: t.text, lh: 18 });
      p.push(title.body);
      yy += Math.max(title.h, c.letter ? 30 : 0) + 6;
      if (c.text) {
        const b = block(x + 10, yy, c.text, cw - 20);
        p.push(b.body);
        yy += b.h + 6;
      }
      if (c.sub) p.push(block(x + 10, yy, c.sub, cw - 20, { italic: true, fill: C.slate }).body);
    });
    y += h + gap;
  }
  if (s.note) {
    const n = block(0, y + 6, s.note, NW, { italic: true, fill: s.noteTone ? TONES[s.noteTone].text : C.slate });
    p.push(n.body);
    y += n.h + 10;
  }
  return { body: p.join(''), h: y };
}

export interface StackItem {
  title: string;
  text?: string;
  tone?: Tone;
  /** A letter or number in a circle on the left. */
  mark?: string;
  /** Filled in the tone's colour, for the one item that the others serve. */
  solid?: boolean;
}

/** Boxes one under another, with arrows between them when they are steps. */
export function stack(id: string, items: StackItem[], o: { top?: number; x?: number; width?: number; arrows?: boolean; gap?: number } = {}): Drawn {
  const p: string[] = [];
  const x = o.x ?? 0;
  const w = o.width ?? NW - x;
  const gap = o.gap ?? (o.arrows ? 22 : 8);
  let y = o.top ?? 0;
  items.forEach((it, i) => {
    const t = TONES[it.tone ?? 'ink'];
    const tx = x + (it.mark ? 40 : 12);
    const tw = w - (tx - x) - 10;
    const title = block(tx, 0, it.title, tw, { size: 15, weight: 700, lh: 18 });
    const body = it.text ? block(tx, 0, it.text, tw) : { body: '', h: 0 };
    const h = Math.max(12 + title.h + (body.h ? 4 + body.h : 0) + 12, it.mark ? 44 : 0);
    p.push(rect(x, y, w, h, { fill: it.solid ? t.line : it.tone ? t.wash : C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    // White figures on gold would be too faint to read, so a gold item's number sits on navy.
    if (it.mark) p.push(badge(x + 20, y + 22, it.mark, { tone: it.tone && it.tone !== 'gold' ? it.tone : 'ink', rad: 14 }));
    const ink = it.solid ? C.white : it.tone && it.tone !== 'ink' ? t.text : C.ink;
    p.push(block(tx, y + 12, it.title, tw, { size: 15, weight: 700, fill: ink, lh: 18 }).body);
    if (it.text) p.push(block(tx, y + 12 + title.h + 4, it.text, tw, { fill: it.solid ? C.white : C.body }).body);
    y += h;
    if (i < items.length - 1) {
      if (o.arrows) p.push(line(id, x + w / 2, y + 3, x + w / 2, y + gap - 3, { sw: 1.6, arrow: 'end' }));
      y += gap;
    }
  });
  return { body: p.join(''), h: y - (o.top ?? 0) };
}
