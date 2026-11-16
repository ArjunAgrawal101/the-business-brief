/** Strategic fit check in the browser: factors, capabilities and conflicts to add and remove; the six elements are fixed. */
import { mount } from './controller';
import { LIMITS, blank, editorHtml, fileName, headline, newCapability, newConflict, newFactor, normalize, outputsHtml, toCsvText, toText, type FitState } from '../../lib/strategy/fit';

type Rows = 'environment' | 'capabilities' | 'conflicts';
const ROWS: Record<string, { list: Rows; first: string; what: string }> = {
  factor: { list: 'environment', first: 'factor', what: 'Factor' },
  capability: { list: 'capabilities', first: 'name', what: 'Capability' },
  conflict: { list: 'conflicts', first: 'a', what: 'Conflict' },
};
const MAX: Record<Rows, number> = { environment: LIMITS.factors, capabilities: LIMITS.capabilities, conflicts: LIMITS.conflicts };

mount<FitState>({
  tool: 'strategic-fit',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  action(s, act, data, uid) {
    const [verb, kind] = act.split('-') as [string, string];
    const spec = ROWS[kind];
    if (!spec) return null;
    const rows = s[spec.list] as Array<{ id: string }>;
    if (verb === 'add') {
      if (rows.length >= MAX[spec.list]) return null;
      const x = spec.list === 'environment' ? newFactor(s) : spec.list === 'capabilities' ? newCapability(s) : newConflict(s);
      (rows as unknown[]).push(x);
      return { focus: `${uid}-${x.id}-${spec.first}`, say: `${spec.what} ${rows.length} added.` };
    }
    if (verb === 'remove' && data.id) {
      const i = rows.findIndex((x) => x.id === data.id);
      if (i < 0) return null;
      rows.splice(i, 1);
      const next = rows[i] ?? rows[i - 1];
      return { focus: next ? `${uid}-${next.id}-${spec.first}` : `[data-act="add-${kind}"]`, say: `Removed ${spec.what.toLowerCase()} ${i + 1}.` };
    }
    return null;
  },
});
