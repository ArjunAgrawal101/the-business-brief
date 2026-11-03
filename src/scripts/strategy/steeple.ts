/** STEEPLE builder in the browser: factors to add and remove under each heading. */
import { mount } from './controller';
import { article } from '../../lib/strategy/common';
import { CATEGORIES, LIMITS, blank, editorHtml, fileName, headline, messages, newFactor, normalize, outputsHtml, toCsvText, toText, type SteepleCat, type SteepleState } from '../../lib/strategy/steeple';

mount<SteepleState>({
  tool: 'steeple',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  messages,
  action(s, act, data, uid) {
    if (act === 'add') {
      const c = (data.category ?? 'social') as SteepleCat;
      if (s.factors.length >= LIMITS.factors || s.factors.filter((f) => f.category === c).length >= LIMITS.perCategory) return null;
      const f = newFactor(s, c);
      s.factors.push(f);
      return { focus: `${uid}-${f.id}-text`, say: `${CATEGORIES[c].name} factor added.` };
    }
    if (act === 'remove' && data.id) {
      const f = s.factors.find((x) => x.id === data.id);
      if (!f) return null;
      const peers = s.factors.filter((x) => x.category === f.category);
      const at = peers.findIndex((x) => x.id === f.id);
      const next = peers[at + 1] ?? peers[at - 1];
      s.factors = s.factors.filter((x) => x.id !== f.id);
      return { focus: next ? `${uid}-${next.id}-text` : `[data-act="add"][data-category="${f.category}"]`, say: `Removed ${article(CATEGORIES[f.category].name)} ${CATEGORIES[f.category].name.toLowerCase()} factor.` };
    }
    return null;
  },
});
