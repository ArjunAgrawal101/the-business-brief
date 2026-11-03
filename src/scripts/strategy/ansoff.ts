/** Ansoff planner in the browser: options to add, remove and reorder; each placement shown as it changes. */
import { mount } from './controller';
import { LIMITS, blank, editorHtml, fileName, headline, newOption, normalize, outputsHtml, placeHtml, toCsvText, toText, type AnsoffState } from '../../lib/strategy/ansoff';

mount<AnsoffState>({
  tool: 'ansoff',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  afterInput(s, path, el) {
    if (path[0] === 'options' && (path[2] === 'product' || path[2] === 'market')) {
      const o = s.options.find((x) => x.id === path[1]);
      const line = el.closest('[data-ix]')?.querySelector<HTMLElement>(`[data-place="${path[1]}"]`);
      if (o && line) line.innerHTML = placeHtml(o);
    }
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add') {
      if (s.options.length >= LIMITS.options) return null;
      const o = newOption(s);
      s.options.push(o);
      return { focus: `${uid}-${o.id}-name`, say: `Option ${s.options.length} added.` };
    }
    const i = s.options.findIndex((x) => x.id === data.id);
    if (i < 0) return null;
    if (act === 'remove') {
      s.options.splice(i, 1);
      const next = s.options[i] ?? s.options[i - 1];
      return { focus: next ? `${uid}-${next.id}-name` : '[data-act="add"]', say: `Removed option ${i + 1}. The options after it are renumbered.` };
    }
    if (act === 'up' && i > 0) {
      const [o] = s.options.splice(i, 1);
      if (o) s.options.splice(i - 1, 0, o);
      return { focus: `${uid}-${data.id}-name`, say: `Moved to option ${i}.` };
    }
    return null;
  },
});
