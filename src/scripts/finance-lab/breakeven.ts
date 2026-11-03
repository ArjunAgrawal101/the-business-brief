/** The costs and break-even calculators: plain fields, the reader's own words for units and the period. */
import { BREAK_EVEN_BUILDERS, breakEvenState, validateBreakEven, type BreakEvenId } from '../../lib/finance-lab/breakeven';
import { each } from '../ix';
import { mount, readSimple, simpleFromParams, simpleToParams } from './engine';

each('[data-ix="finance-lab"][data-family="breakeven"]', (root) => {
  const id = root.dataset.calc as BreakEvenId;
  mount(root, {
    read: readSimple,
    validate: (r) => validateBreakEven(id, r.raw),
    build: (r, s) => BREAK_EVEN_BUILDERS[id](breakEvenState(r.raw), s),
    toParams: simpleToParams,
    fromParams: simpleFromParams,
  });
});
