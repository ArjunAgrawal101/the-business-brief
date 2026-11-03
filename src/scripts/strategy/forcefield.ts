/** Force field builder in the browser: forces to add and remove, and a restraining force to test weakening. */
import { mount } from './controller';
import { LIMITS, SIDES, blank, editorHtml, fileName, headline, newForce, normalize, outputsHtml, toCsvText, toText, type FfState, type Side } from '../../lib/strategy/forcefield';

mount<FfState>({
  tool: 'force-field',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  afterInput(s, path, el) {
    if (path[0] === 'forces' && path[2] === 'label') {
      // Keep the force's name in the "weaken" list in step without redrawing the field being typed in.
      const f = s.forces.find((x) => x.id === path[1]);
      const opt = el.closest('[data-ix]')?.querySelector<HTMLOptionElement>(`select[data-k="test"] option[value="${path[1]}"]`);
      if (f && opt) opt.textContent = f.label.trim() || '(unnamed force)';
      else if (f && f.side === 'restraining' && f.label.trim()) return { redraw: true };
    }
    if (path[0] === 'test' && typeof s.test !== 'string') s.test = '';
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add') {
      const side = (data.side ?? 'driving') as Side;
      if (s.forces.filter((f) => f.side === side).length >= LIMITS.perSide) return null;
      const f = newForce(s, side);
      s.forces.push(f);
      return { focus: `${uid}-${f.id}-label`, say: `${SIDES[side].name.replace(/s$/, '')} added.` };
    }
    if (act === 'remove' && data.id) {
      const f = s.forces.find((x) => x.id === data.id);
      if (!f) return null;
      const peers = s.forces.filter((x) => x.side === f.side);
      const at = peers.findIndex((x) => x.id === f.id);
      const next = peers[at + 1] ?? peers[at - 1];
      s.forces = s.forces.filter((x) => x.id !== f.id);
      if (s.test === f.id) s.test = '';
      return { focus: next ? `${uid}-${next.id}-label` : `[data-act="add"][data-side="${f.side}"]`, say: 'Force removed.' };
    }
    return null;
  },
});
