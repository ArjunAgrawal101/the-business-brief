/** The product life cycle simulator in the browser: every assumption re-runs the model, saving and export. */
import { EXTENSIONS, normalizePlc, plcCsvRows, validatePlc, type ExtensionId, type PlcState } from '../../lib/market-plc';
import { cashChart, extensionRowHtml, plcAnnouncement, plcFiguresHtml, plcRowsHtml, plcSummary, plcView, readPlc, salesChart } from '../../lib/market-plc-view';
import { announce, each, escapeHtml, readConfig } from '../ix';
import { fieldChecked, fieldNumber, fieldValue, fill, mountKit, showProblems } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: PlcState;
}

each('[data-ix="plc"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const d = cfg.defaults;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const ext = root.querySelector<HTMLFormElement>('[data-ext]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !ext || !rows) return;
  let timer = 0;
  const n = (f: string) => fieldNumber(form, f);

  const read = (): PlcState => {
    const row = (id: ExtensionId) => rows.querySelector<HTMLElement>(`[data-row="${id}"]`);
    const pc = row('price-cut');
    return {
      ...d,
      product: fieldValue(form, 'product'),
      price: n('price'),
      variableCost: n('variableCost'),
      development: n('development'),
      launchPromotion: n('launchPromotion'),
      fixedCosts: n('fixedCosts'),
      workingCapital: n('workingCapital'),
      capex: { amount: n('capexAmount'), year: Math.round(n('capexYear')), life: Math.round(n('capexLife')) },
      launch: n('launch'),
      peak: n('peak'),
      growthYears: Math.round(n('growthYears')),
      maturityYears: Math.round(n('maturityYears')),
      decline: n('decline'),
      promotion: { growth: n('promo-growth'), maturity: n('promo-maturity'), decline: n('promo-decline') },
      extensionYear: Math.round(fieldNumber(ext, 'extensionYear')),
      priceCut: { price: pc ? fieldNumber(pc, 'pc-price') : d.priceCut.price, units: pc ? fieldNumber(pc, 'pc-units') : d.priceCut.units },
      extensions: EXTENSIONS.map((id) => {
        const el = row(id);
        const base = d.extensions.find((e) => e.id === id) ?? { id, on: false, detail: '', uplift: 0, fade: 0, cost: 0 };
        if (!el) return base;
        const num = (f: string, fallback: number) => {
          const v = fieldNumber(el, f);
          return Number.isFinite(v) ? v : fallback;
        };
        return { id, on: fieldChecked(el, 'on'), detail: fieldValue(el, 'detail'), uplift: num('uplift', 0), fade: num('fade', 0), cost: num('cost', 0) };
      }),
    };
  };

  const where = (w: string): string | null => {
    const map: Record<string, string> = {
      price: 'price',
      variableCost: 'vc',
      development: 'dev',
      launchPromotion: 'launch-promo',
      fixedCosts: 'fixed',
      workingCapital: 'wc',
      capexAmount: 'capex',
      capexYear: 'capex-year',
      capexLife: 'capex-life',
      launch: 'launch',
      peak: 'peak',
      growthYears: 'growth',
      maturityYears: 'maturity',
      decline: 'decline',
      extensionYear: 'ext-year',
    };
    return map[w] ? `${uid}-${map[w]}` : null;
  };

  const render = (say: boolean) => {
    const s = read();
    const numbers = [s.price, s.variableCost, s.development, s.launchPromotion, s.fixedCosts, s.workingCapital, s.capex.amount, s.capex.year, s.capex.life, s.launch, s.peak, s.growthYears, s.maturityYears, s.decline, s.extensionYear];
    const problems = numbers.some((x) => !Number.isFinite(x)) ? [{ where: 'price', message: 'Fill in every figure with a number.' }] : validatePlc(s);
    showProblems(root, problems, where);
    root.classList.toggle('is-invalid', problems.length > 0);
    rows.querySelectorAll<HTMLElement>('[data-row]').forEach((el) => el.classList.toggle('is-on', fieldChecked(el, 'on')));
    if (problems.length) {
      if (say) announce(status, `Check the assumptions: ${problems[0]?.message ?? ''}`);
      return;
    }
    const v = plcView(s);
    const r = readPlc(v, s);
    fill(root, '[data-figures]', plcFiguresHtml(v, s));
    fill(root, '[data-interp]', escapeHtml(r.reading));
    fill(root, '[data-impl]', escapeHtml(r.implication));
    fill(root, '[data-chart-sales]', salesChart(v, s, `${uid}-sales`));
    fill(root, '[data-chart-cash]', cashChart(v, s, `${uid}-cash`));
    fill(root, '[data-table]', plcRowsHtml(v, s));
    if (say) announce(status, plcAnnouncement(v, s));
  };

  const apply = (s: PlcState) => {
    const set = (scope: ParentNode, f: string, value: string | number) => {
      const el = scope.querySelector<HTMLInputElement>(`[data-f="${f}"]`);
      if (el) el.value = String(value);
    };
    set(form, 'product', s.product);
    set(form, 'price', s.price);
    set(form, 'variableCost', s.variableCost);
    set(form, 'development', s.development);
    set(form, 'launchPromotion', s.launchPromotion);
    set(form, 'fixedCosts', s.fixedCosts);
    set(form, 'workingCapital', s.workingCapital);
    set(form, 'capexAmount', s.capex.amount);
    set(form, 'capexYear', s.capex.year);
    set(form, 'capexLife', s.capex.life);
    set(form, 'launch', s.launch);
    set(form, 'peak', s.peak);
    set(form, 'growthYears', s.growthYears);
    set(form, 'maturityYears', s.maturityYears);
    set(form, 'decline', s.decline);
    set(form, 'promo-growth', s.promotion.growth);
    set(form, 'promo-maturity', s.promotion.maturity);
    set(form, 'promo-decline', s.promotion.decline);
    set(ext, 'extensionYear', s.extensionYear);
    rows.innerHTML = s.extensions.map((e) => extensionRowHtml(e, uid, s)).join('');
    render(false);
  };

  const kit = mountKit<PlcState>({ root, slug: cfg.slug, name: 'Product life cycle', defaults: d, normalize: normalizePlc, read, apply, csv: plcCsvRows, text: plcSummary });

  const onEdit = (e: Event) => {
    const instant = (e.target as HTMLElement).matches('input[type="checkbox"]');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), instant ? 0 : 300);
    kit.changed();
  };
  for (const f of [form, ext]) {
    f.addEventListener('input', onEdit);
    f.addEventListener('change', onEdit);
    f.addEventListener('submit', (e) => e.preventDefault());
  }
});
