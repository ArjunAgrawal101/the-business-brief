/**
 * The integrated forecast in the browser: reads the drivers, the opening
 * position, the scenarios, the alternatives and the case in view, checks them
 * with the same functions the server uses, and redraws every statement, table
 * and chart from the same report builder.
 */
import { OPTION_IDS, SCENARIO_IDS, type OptionId, type ScenarioId } from '../../lib/adv-finance/forecast';
import { buildForecastReport } from '../../lib/adv-finance/forecast-view';
import { FORECAST_EXAMPLE_FORM, FORECAST_FIELD_NAMES, forecastFromForm, readForecastSaved, type ForecastForm } from '../../lib/adv-finance/state';
import { each } from '../ix';
import { applyCurrency, currencyValue, fieldValues, mountTool, radioValue, setFieldValues, setRadio } from './kit';

each('[data-ix="adv-finance"][data-tool="forecast"]', (root) => {
  const text = (name: string) => root.querySelector<HTMLInputElement>(`[data-af-form] [name="${name}"]`);
  const currency = root.querySelector<HTMLSelectElement>('[data-setting="currency"]');
  if (!text('a.name') || !text('b.name') || !currency) throw new Error('The forecast form is incomplete.');

  const read = (): ForecastForm => ({
    fields: fieldValues(root, FORECAST_FIELD_NAMES),
    names: { a: text('a.name')?.value ?? '', b: text('b.name')?.value ?? '' },
    view: {
      scenario: radioValue(root, 'view.scenario', 'base') as ScenarioId,
      option: radioValue(root, 'view.option', 'none') as OptionId,
    },
    currency: currencyValue(root, FORECAST_EXAMPLE_FORM.currency),
  });

  const write = (f: ForecastForm) => {
    setFieldValues(root, f.fields);
    const a = text('a.name');
    const b = text('b.name');
    if (a) a.value = f.names.a;
    if (b) b.value = f.names.b;
    setRadio(root, 'view.scenario', SCENARIO_IDS.includes(f.view.scenario) ? f.view.scenario : 'base');
    setRadio(root, 'view.option', OPTION_IDS.includes(f.view.option) ? f.view.option : 'none');
    currency.value = f.currency;
  };

  mountTool<ForecastForm>({
    root,
    key: root.dataset.key ?? 'finance:advanced:forecast',
    title: root.dataset.name ?? 'Integrated forecast',
    example: FORECAST_EXAMPLE_FORM,
    read,
    write,
    parse: readForecastSaved,
    csvName: 'integrated-forecast.csv',
    render: (f) => {
      applyCurrency(root, f.currency);
      // The option buttons carry the alternatives' names as the reader types them.
      (['a', 'b'] as const).forEach((k) => {
        const label = root.querySelector<HTMLElement>(`[data-alt-name="${k}"]`);
        if (label) label.textContent = f.names[k].trim() || `Alternative ${k.toUpperCase()}`;
      });
      const { problems, input } = forecastFromForm(f);
      if (!input) return { problems };
      const r = buildForecastReport(input, f.view, f.currency);
      return { problems: [], regions: r.regions, announce: r.announce, summary: r.summary, csv: r.csv };
    },
  });
});
