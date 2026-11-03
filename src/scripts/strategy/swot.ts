/** SWOT builder in the browser: rows to add, remove and move between boxes, with TOWS options. */
import { mount } from './controller';
import { LIMITS, QUADRANTS, TOWS, factorCode, messages, newFactor, newOption, removeFactor, tidyLinks, type Quadrant, type SwotState, type TowsCell } from '../../lib/strategy/swot';
import { blank, editorHtml, fileName, headline, normalize, outputsHtml, toCsvText, toText } from '../../lib/strategy/swot';

mount<SwotState>({
  tool: 'swot',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  messages,
  afterInput(s, path, el) {
    if (path[0] === 'factors' && path[2] === 'quadrant') {
      const dropped = tidyLinks(s);
      const f = s.factors.find((x) => x.id === path[1]);
      const to = QUADRANTS[(f?.quadrant ?? 'S') as Quadrant].plural.toLowerCase();
      return { redraw: true, say: `Moved to ${to} as ${f ? factorCode(s, f.id) : ''}.${dropped ? ` ${dropped} TOWS ${dropped === 1 ? 'link was' : 'links were'} removed because the factor no longer fits ${dropped === 1 ? 'that option' : 'those options'}.` : ''}` };
    }
    if (path[0] === 'factors' && path[2] === 'text') {
      // Keep the factor's name in the TOWS tick boxes in step without redrawing the field being typed in.
      const f = s.factors.find((x) => x.id === path[1]);
      el.closest('[data-ix]')
        ?.querySelectorAll<HTMLElement>(`[data-label-for="${path[1]}"]`)
        .forEach((span) => (span.textContent = f?.text.trim() || '(no text yet)'));
    }
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add-factor') {
      const q = (data.quadrant ?? 'S') as Quadrant;
      if (s.factors.length >= LIMITS.factors || s.factors.filter((f) => f.quadrant === q).length >= LIMITS.perQuadrant) return null;
      const f = newFactor(s, q);
      s.factors.push(f);
      return { focus: `${uid}-${f.id}-text`, say: `${QUADRANTS[q].name} added as ${factorCode(s, f.id)}.` };
    }
    if (act === 'remove-factor' && data.id) {
      const f = s.factors.find((x) => x.id === data.id);
      if (!f) return null;
      const code = factorCode(s, f.id);
      const peers = s.factors.filter((x) => x.quadrant === f.quadrant);
      const at = peers.findIndex((x) => x.id === f.id);
      const neighbour = peers[at + 1] ?? peers[at - 1];
      removeFactor(s, f.id);
      return { focus: neighbour ? `${uid}-${neighbour.id}-text` : `[data-act="add-factor"][data-quadrant="${f.quadrant}"]`, say: `Removed ${code}. The factors after it are renumbered.` };
    }
    if (act === 'add-option') {
      const cell = (data.cell ?? 'SO') as TowsCell;
      if (s.tows.length >= LIMITS.tows) return null;
      const t = newOption(s, cell);
      s.tows.push(t);
      return { focus: `${uid}-${t.id}-text`, say: `${cell} option added: ${TOWS[cell].aim.toLowerCase()}.` };
    }
    if (act === 'remove-option' && data.id) {
      const t = s.tows.find((x) => x.id === data.id);
      if (!t) return null;
      s.tows = s.tows.filter((x) => x.id !== t.id);
      return { focus: `[data-act="add-option"][data-cell="${t.cell}"]`, say: `Removed the ${t.cell} option.` };
    }
    return null;
  },
});
