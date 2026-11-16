/**
 * Scenario planner in the browser: driving forces and options to add and
 * remove; a driver's class shown as its ratings change; the futures' labels
 * and the axis lists kept in step with the drivers' names and ends.
 */
import { mount } from './controller';
import { LIMITS, axisOptionLabel, blank, classHtml, editorHtml, fileName, headline, newDriver, newOption, normalize, outputsHtml, quadLabel, scenarioName, toCsvText, toText, type Quad, type ScenarioState } from '../../lib/strategy/scenarios';

mount<ScenarioState>({
  tool: 'scenarios',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  afterInput(s, path, el) {
    if (path[0] === 'axisA' || path[0] === 'axisB') return { redraw: true };
    const root = el.closest('[data-ix]');
    if (!root) return undefined;
    if (path[0] === 'drivers') {
      const d = s.drivers.find((x) => x.id === path[1]);
      if (!d) return undefined;
      if (path[2] === 'impact' || path[2] === 'uncertainty') {
        const line = root.querySelector<HTMLElement>(`[data-class="${d.id}"]`);
        if (line) line.innerHTML = classHtml(d);
      }
      // The axis lists name each driver and its class; the futures are labelled by the axes' ends.
      root.querySelectorAll<HTMLOptionElement>('select[data-k="axisA"] option, select[data-k="axisB"] option').forEach((o) => {
        const i = s.drivers.findIndex((x) => x.id === o.value);
        const x = s.drivers[i];
        if (x) o.textContent = axisOptionLabel(x, i + 1);
      });
      root.querySelectorAll<HTMLElement>('[data-quad]').forEach((q) => (q.textContent = quadLabel(s, q.dataset.quad as Quad)));
    }
    if (path[0] === 'scenarios' && path[2] === 'name') {
      root.querySelectorAll<HTMLElement>(`[data-quad-name="${path[1]}"]`).forEach((q) => (q.textContent = scenarioName(s, path[1] as Quad)));
    }
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add-driver') {
      if (s.drivers.length >= LIMITS.drivers) return null;
      const d = newDriver(s);
      s.drivers.push(d);
      return { focus: `${uid}-${d.id}-name`, say: `Driving force ${s.drivers.length} added.` };
    }
    if (act === 'remove-driver' && data.id) {
      const i = s.drivers.findIndex((x) => x.id === data.id);
      if (i < 0) return null;
      const wasAxis = s.axisA === data.id || s.axisB === data.id;
      s.drivers.splice(i, 1);
      if (s.axisA === data.id) s.axisA = '';
      if (s.axisB === data.id) s.axisB = '';
      const next = s.drivers[i] ?? s.drivers[i - 1];
      return { focus: next ? `${uid}-${next.id}-name` : '[data-act="add-driver"]', say: `Removed driving force ${i + 1}.${wasAxis ? ' It was an axis: choose another.' : ''}` };
    }
    if (act === 'add-option') {
      if (s.options.length >= LIMITS.options) return null;
      const o = newOption(s);
      s.options.push(o);
      return { focus: `${uid}-${o.id}-name`, say: `Option ${s.options.length} added.` };
    }
    if (act === 'remove-option' && data.id) {
      const i = s.options.findIndex((x) => x.id === data.id);
      if (i < 0) return null;
      s.options.splice(i, 1);
      const next = s.options[i] ?? s.options[i - 1];
      return { focus: next ? `${uid}-${next.id}-name` : '[data-act="add-option"]', say: `Removed option ${i + 1}.` };
    }
    return null;
  },
});
