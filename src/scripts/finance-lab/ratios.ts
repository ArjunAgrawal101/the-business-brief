/** The ratio calculators: the same fields for two years. */
import { buildRatio, ratioState, validateRatio, type RatioLabId } from '../../lib/finance-lab/ratios';
import { each } from '../ix';
import { mount, readSimple, simpleFromParams, simpleToParams } from './engine';

each('[data-ix="finance-lab"][data-family="ratios"]', (root) => {
  const id = root.dataset.calc as RatioLabId;
  mount(root, {
    read: readSimple,
    validate: (r) => validateRatio(id, r.raw),
    build: (r, s) => buildRatio(id, ratioState(id, r.raw), s),
    toParams: simpleToParams,
    fromParams: simpleFromParams,
  });
});
