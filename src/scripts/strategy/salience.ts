/** Stakeholder salience in the browser: stakeholders to add and remove; each class shown as the attributes change. */
import { mount } from './controller';
import { LIMITS, blank, classHtml, editorHtml, fileName, headline, newStakeholder, normalize, outputsHtml, toCsvText, toText, type SalienceState } from '../../lib/strategy/salience';

mount<SalienceState>({
  tool: 'stakeholder-salience',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  afterInput(s, path, el) {
    if (path[0] === 'stakeholders' && (path[2] === 'power' || path[2] === 'legitimacy' || path[2] === 'urgency')) {
      const x = s.stakeholders.find((y) => y.id === path[1]);
      const line = el.closest('[data-ix]')?.querySelector<HTMLElement>(`[data-place="${path[1]}"]`);
      if (x && line) line.innerHTML = classHtml(x);
    }
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add') {
      if (s.stakeholders.length >= LIMITS.stakeholders) return null;
      const x = newStakeholder(s);
      s.stakeholders.push(x);
      return { focus: `${uid}-${x.id}-name`, say: `Stakeholder ${s.stakeholders.length} added.` };
    }
    if (act === 'remove' && data.id) {
      const i = s.stakeholders.findIndex((x) => x.id === data.id);
      if (i < 0) return null;
      s.stakeholders.splice(i, 1);
      const next = s.stakeholders[i] ?? s.stakeholders[i - 1];
      return { focus: next ? `${uid}-${next.id}-name` : '[data-act="add"]', say: `Removed stakeholder ${i + 1}. The numbers after it change.` };
    }
    return null;
  },
});
