/** BCG matrix in the browser: products to add and remove, figures checked as they are typed. */
import { mount } from './controller';
import { LIMITS, blank, editorHtml, fileName, headline, messages, newProduct, normalize, outputsHtml, toCsvText, toText, type BcgState } from '../../lib/strategy/bcg';

mount<BcgState>({
  tool: 'bcg-matrix',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  messages,
  afterInput(s, path) {
    // The currency and unit appear beside every revenue field.
    if (path[0] === 'currency' || path[0] === 'unit') return { redraw: true };
    if (path[0] === 'growthLine' && typeof s.growthLine !== 'number') s.growthLine = 5;
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add') {
      if (s.products.length >= LIMITS.products) return null;
      const p = newProduct(s);
      s.products.push(p);
      return { focus: `${uid}-${p.id}-name`, say: `Product ${s.products.length} added. It joins the chart when its figures are complete.` };
    }
    if (act === 'remove' && data.id) {
      const i = s.products.findIndex((x) => x.id === data.id);
      if (i < 0) return null;
      s.products.splice(i, 1);
      const next = s.products[i] ?? s.products[i - 1];
      return { focus: next ? `${uid}-${next.id}-name` : '[data-act="add"]', say: `Removed product ${i + 1}.` };
    }
    return null;
  },
});
