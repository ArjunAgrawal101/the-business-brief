/**
 * Break-even scenarios in the browser: the price, forecast and capacity, two
 * cost structures and the reader's words for units and the period, read,
 * checked and redrawn with the same functions the server uses.
 */
import { buildCostReport } from '../../lib/adv-finance/cost-structure-view';
import { COST_EXAMPLE_FORM, COST_FIELD_NAMES, COST_SETTINGS, costFromForm, readCostSaved, type CostForm } from '../../lib/adv-finance/state';
import { cleanSettings, fillLabel } from '../../lib/finance-lab/fields';
import type { Settings } from '../../lib/finance-lab/types';
import { each } from '../ix';
import { applyCurrency, fieldValues, mountTool, setFieldValues } from './kit';

each('[data-ix="adv-finance"][data-tool="break-even"]', (root) => {
  const text = (name: string) => root.querySelector<HTMLInputElement>(`[data-af-form] [name="${name}"]`);
  const setting = (k: keyof Settings) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-setting="${k}"]`);
  if (!text('a.name') || !text('b.name') || !setting('currency')) throw new Error('The comparison form is incomplete.');

  const read = (): CostForm => ({
    fields: fieldValues(root, COST_FIELD_NAMES),
    names: { a: text('a.name')?.value ?? '', b: text('b.name')?.value ?? '' },
    settings: {
      currency: setting('currency')?.value ?? COST_SETTINGS.currency,
      unit: setting('unit')?.value ?? COST_SETTINGS.unit,
      units: setting('units')?.value ?? COST_SETTINGS.units,
      period: setting('period')?.value ?? COST_SETTINGS.period,
    },
  });

  const write = (f: CostForm) => {
    setFieldValues(root, f.fields);
    const a = text('a.name');
    const b = text('b.name');
    if (a) a.value = f.names.a;
    if (b) b.value = f.names.b;
    (Object.keys(f.settings) as Array<keyof Settings>).forEach((k) => {
      const el = setting(k);
      if (el) el.value = f.settings[k];
    });
  };

  mountTool<CostForm>({
    root,
    key: root.dataset.key ?? 'finance:advanced:break-even',
    title: root.dataset.name ?? 'Break-even scenarios',
    example: COST_EXAMPLE_FORM,
    read,
    write,
    parse: readCostSaved,
    csvName: 'break-even-scenarios.csv',
    render: (f) => {
      const s = cleanSettings(f.settings, COST_SETTINGS);
      applyCurrency(root, s.currency);
      root.querySelectorAll<HTMLElement>('[data-tpl]').forEach((el) => (el.textContent = fillLabel(el.dataset.tpl ?? '', s)));
      root.querySelectorAll<HTMLElement>('[data-affix="units"]').forEach((el) => (el.textContent = s.units));
      const { problems, input } = costFromForm(f);
      if (!input) return { problems };
      const r = buildCostReport(input, s, s.currency);
      return { problems: [], regions: r.regions, announce: r.announce, summary: r.summary, csv: r.csv };
    },
  });
});
