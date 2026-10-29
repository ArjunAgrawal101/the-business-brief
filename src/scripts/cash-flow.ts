/**
 * The cash flow lab: recalculates the forecast as the learner changes how the
 * second kiln is paid for and which working capital measures are taken. The
 * chart eases from the old balances to the new ones; changed cells in the
 * table are marked; the choice is kept on this device.
 */
import { forecast, readForecast, type CashFlowScenario, type FinanceOption, type Forecast, type Measure } from '../lib/cashflow';
import { cashFlowSvg } from '../lib/cashflow-chart';
import { cashFiguresHtml, closingWorking, forecastBodyHtml, profitToCashHtml } from '../lib/cashflow-render';
import { fmtMoney } from '../lib/format';
import { workingHtml } from '../lib/render';
import { announce, each, escapeHtml, lerp, readConfig, store, tween } from './ix';

interface Config {
  uid: string;
  scenario: CashFlowScenario;
  finance: Array<FinanceOption & { label: string }>;
  measures: Array<Measure & { label: string }>;
  scaleMin: number;
  scaleMax: number;
}

interface Saved {
  finance: string;
  measures: string[];
}

each('[data-ix="cash-flow"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-cf-status]');
  const change = root.querySelector<HTMLElement>('[data-change]');
  if (!form) return;
  const S = cfg.scenario;
  const cur = S.currency;
  const key = `cash-flow:${cfg.uid}`;
  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };

  const choices = (): Saved => ({
    finance: (form.querySelector<HTMLInputElement>('input[name="finance"]:checked')?.value ?? cfg.finance[0]?.id) || 'buy',
    measures: Array.from(form.querySelectorAll<HTMLInputElement>('input[name="measure"]:checked')).map((i) => i.value),
  });

  const build = (c: Saved): Forecast => {
    const fo = cfg.finance.find((f) => f.id === c.finance) ?? cfg.finance[0];
    return forecast(S, fo as FinanceOption, cfg.measures.filter((m) => c.measures.includes(m.id)) as Measure[]);
  };

  let shown = build({ finance: cfg.finance[0]?.id ?? 'buy', measures: [] });
  let stop = () => undefined as void;

  const drawChart = (from: Forecast, to: Forecast) => {
    stop();
    stop = tween(360, (t) => {
      const frame: Forecast = { ...to, closing: to.closing.map((v, i) => lerp(from.closing[i] ?? v, v, t)), limit: lerp(from.limit, to.limit, t) };
      set('[data-chart]', cashFlowSvg(frame, { currency: cur, id: `${cfg.uid}-chart`, scaleMin: cfg.scaleMin, scaleMax: cfg.scaleMax }));
    });
  };

  const render = (say: boolean) => {
    const c = choices();
    const f = build(c);
    const before = shown;
    shown = f;
    drawChart(before, f);
    set('[data-table]', forecastBodyHtml(f, before));
    set('[data-figures]', cashFiguresHtml(f, cur));
    set('[data-p2c]', profitToCashHtml(f, cur));
    const r = readForecast(f, cur);
    set('[data-headline]', escapeHtml(r.headline));
    set('[data-detail]', escapeHtml(r.detail));
    const month = f.firstBeyond ?? f.lowest.month;
    const w = closingWorking(f, month, cur);
    set('[data-working]', workingHtml(w.working, escapeHtml(w.interpretation), escapeHtml(w.implication)));
    set('[data-w-month]', escapeHtml(f.months[month] ?? ''));
    const diff = f.lowest.value - before.lowest.value;
    if (change)
      change.textContent =
        Math.abs(diff) < 0.005 && f.limit === before.limit
          ? ''
          : `Lowest balance ${fmtMoney(f.lowest.value, cur, 2)} in ${f.months[f.lowest.month]}${Math.abs(diff) >= 0.005 ? `, ${diff > 0 ? 'up' : 'down'} ${fmtMoney(Math.abs(diff), cur, 2)}` : ''}.`;
    store.set(key, c);
    if (say) announce(status, `${r.headline} Profit ${fmtMoney(f.profit.total, cur, 2)}; net cash flow ${fmtMoney(f.netCash, cur, 2)}.`);
  };

  const apply = (c: Saved) => {
    form.querySelectorAll<HTMLInputElement>('input[name="finance"]').forEach((i) => (i.checked = i.value === c.finance));
    form.querySelectorAll<HTMLInputElement>('input[name="measure"]').forEach((i) => (i.checked = c.measures.includes(i.value)));
  };

  const saved = store.get<Saved | null>(key, null);
  if (saved && cfg.finance.some((f) => f.id === saved.finance)) {
    apply(saved);
    shown = build(saved);
    render(false);
  }

  form.addEventListener('change', () => render(true));
  root.querySelector('[data-plan-reset]')?.addEventListener('click', () => {
    apply({ finance: cfg.finance[0]?.id ?? 'buy', measures: [] });
    render(true);
  });
});
