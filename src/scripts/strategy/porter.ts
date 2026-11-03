/** Generic strategies in the browser: positions to add and remove; each reading shown as the ratings change. */
import { mount } from './controller';
import { LIMITS, blank, editorHtml, fileName, headline, newPosition, normalize, outputsHtml, placeHtml, toCsvText, toText, type PorterState } from '../../lib/strategy/porter';

mount<PorterState>({
  tool: 'generic-strategies',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  afterInput(s, path, el) {
    if (path[0] !== 'positions') return undefined;
    if (path[2] === 'role') return { redraw: true };
    if (path[2] === 'cost' || path[2] === 'diff' || path[2] === 'scope') {
      const p = s.positions.find((x) => x.id === path[1]);
      const line = el.closest('[data-ix]')?.querySelector<HTMLElement>(`[data-place="${path[1]}"]`);
      if (p && line) line.innerHTML = placeHtml(p);
    }
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add-rival' || act === 'add-proposed') {
      if (s.positions.length >= LIMITS.positions) return null;
      const p = newPosition(s, act === 'add-rival' ? 'rival' : 'proposed');
      s.positions.push(p);
      return { focus: `${uid}-${p.id}-name`, say: act === 'add-rival' ? 'Rival added.' : 'Proposed position added.' };
    }
    if (act === 'remove' && data.id) {
      const i = s.positions.findIndex((x) => x.id === data.id);
      if (i < 0) return null;
      s.positions.splice(i, 1);
      const next = s.positions[i] ?? s.positions[i - 1];
      return { focus: next ? `${uid}-${next.id}-name` : '[data-act="add-rival"]', say: `Removed position ${i + 1}.` };
    }
    return null;
  },
});
