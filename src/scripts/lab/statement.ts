/**
 * The profit and loss builder: plain fields, a choice of how cost of sales is
 * found, and the statement's heading in the reader's own words.
 */
import { buildStatement, statementState, validateStatement } from '../../lib/lab/statement';
import { each } from '../ix';
import { mount, readSimple, resetSimple, simpleFromParams, simpleToParams } from './engine';

each('[data-ix="lab"][data-family="statement"]', (root) => {
  // Show the fields for the chosen way of finding cost of sales.
  const showMode = () => {
    const mode = root.querySelector<HTMLInputElement>('input[name="stockMode"]:checked')?.value ?? '1';
    root.querySelectorAll<HTMLElement>('[data-mode]').forEach((el) => (el.hidden = el.dataset.mode !== mode));
  };
  root.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).name === 'stockMode') showMode();
  });
  mount(root, {
    read: readSimple,
    validate: (r) => validateStatement(r.raw),
    build: (r, s) => buildStatement(statementState(r.raw, r.text), s),
    reset: (el) => {
      resetSimple(el);
      showMode();
    },
    toParams: simpleToParams,
    fromParams: (el, p) => {
      const set = simpleFromParams(el, p);
      showMode();
      return set;
    },
  });
  showMode();
});
