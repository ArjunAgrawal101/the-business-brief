/** The market metrics calculators in the browser: add and remove sellers, recalculate, save and export. */
import { marketShareSvg } from '../../lib/charts-studio';
import { growthReading, growthWorking, shareWorking } from '../../lib/market';
import { nextId } from '../../lib/market-kit';
import { clvWorking, metricsCsvRows, metricsSummary, metricsView, normalizeMetrics, validateClv, validateMetrics, type MetricsState } from '../../lib/market-metrics';
import { clvFiguresHtml, clvReadingHtml, clvRowsHtml, firmRowHtml, focusOptionsHtml, metricsAnnouncement, metricsFiguresHtml, metricsReading, relativeWorkingHtml } from '../../lib/market-metrics-view';
import { workingHtml } from '../../lib/render';
import { marketTableHtml } from '../../lib/render-studio';
import { announce, each, escapeHtml, readConfig } from '../ix';
import { fieldChecked, fieldNumber, fieldValue, fill, mountKit, setText, showProblems } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: MetricsState;
}

each('[data-ix="market-metrics"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const clvForm = root.querySelector<HTMLFormElement>('[data-clv]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const focusSel = root.querySelector<HTMLSelectElement>('[data-f="focus"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !clvForm || !rows || !focusSel) return;
  let timer = 0;

  const read = (): MetricsState => ({
    market: fieldValue(form, 'market'),
    basis: fieldValue(form, 'basis') === 'volume' ? 'volume' : 'value',
    unit: fieldValue(form, 'unit').trim() || cfg.defaults.unit,
    symbol: fieldValue(form, 'symbol').trim(),
    periods: { last: fieldValue(form, 'last').trim() || 'Earlier', now: fieldValue(form, 'now').trim() || 'Later' },
    focus: focusSel.value,
    firms: [...rows.querySelectorAll<HTMLElement>('[data-row]')].map((tr) => ({
      id: tr.dataset.row ?? '',
      name: fieldValue(tr, 'name'),
      last: fieldNumber(tr, 'last'),
      now: fieldNumber(tr, 'now'),
      group: fieldChecked(tr, 'group'),
    })),
    clv: {
      spend: fieldNumber(clvForm, 'spend'),
      visits: fieldNumber(clvForm, 'visits'),
      margin: fieldNumber(clvForm, 'margin'),
      retention: fieldNumber(clvForm, 'retention'),
      discount: fieldNumber(clvForm, 'discount'),
      cac: fieldNumber(clvForm, 'cac'),
    },
  });

  const where = (w: string): string | null => {
    if (w === 'focus') return `${uid}-focus`;
    if (w === 'firms') return null;
    if (w.startsWith('clv-')) return `${uid}-${w}`;
    const m = /^(.+)-(name|last|now)$/.exec(w);
    return m ? `${uid}-firm-${m[1]}-${m[2]}` : null;
  };

  const rebuildFocus = (s: MetricsState) => {
    const keep = s.firms.some((f) => f.id === s.focus && !f.group) ? s.focus : (s.firms.find((f) => !f.group)?.id ?? '');
    focusSel.innerHTML = focusOptionsHtml({ ...s, focus: keep });
    focusSel.value = keep;
  };

  const render = (say: boolean) => {
    const s = read();
    const problems = [...validateMetrics(s), ...validateClv(s.clv)];
    showProblems(root, problems, where);
    setText(root, '[data-err-for="firms"]', problems.find((p) => p.where === 'firms')?.message ?? '');
    root.querySelectorAll<HTMLElement>('[data-head="last"]').forEach((el) => (el.textContent = s.periods.last));
    root.querySelectorAll<HTMLElement>('[data-head="now"]').forEach((el) => (el.textContent = s.periods.now));
    const marketOk = !problems.some((p) => !p.where.startsWith('clv-'));
    const clvOk = !problems.some((p) => p.where.startsWith('clv-'));
    root.querySelector('[data-figures]')?.closest('.mk-grid')?.classList.toggle('is-invalid', !marketOk);
    clvForm.closest('.mk-grid')?.classList.toggle('is-invalid', !clvOk);
    const v = metricsView(s);
    if (marketOk) {
      const r = metricsReading(v, s);
      const g = growthReading(v.model);
      fill(root, '[data-figures]', metricsFiguresHtml(v, s));
      fill(root, '[data-interp]', escapeHtml(r.reading));
      fill(root, '[data-impl]', escapeHtml(r.implication));
      fill(root, '[data-chart]', marketShareSvg(v.model, { id: `${uid}-chart`, focus: s.focus, periods: s.periods }));
      fill(root, '[data-table]', marketTableHtml(v.model, s.focus));
      fill(root, '[data-working-share]', workingHtml(shareWorking(v.model, s.focus, s.periods.now, s.unit), escapeHtml(r.reading), escapeHtml(r.implication)));
      fill(root, '[data-working-growth]', workingHtml(growthWorking(v.model, s.periods, s.unit), escapeHtml(g.interpretation), escapeHtml(g.implication)));
      fill(root, '[data-working-relative]', relativeWorkingHtml(v, s));
    }
    if (clvOk) {
      const c = clvReadingHtml(v.clv, s.symbol);
      fill(root, '[data-clv-figures]', clvFiguresHtml(v.clv, s.symbol));
      fill(root, '[data-clv-interp]', escapeHtml(c.reading));
      fill(root, '[data-clv-impl]', escapeHtml(c.implication));
      fill(root, '[data-clv-sens]', escapeHtml(c.sensitivity));
      fill(root, '[data-clv-rows]', clvRowsHtml(v.clv, s.symbol));
      fill(root, '[data-clv-working]', workingHtml(clvWorking(v.clv, s.symbol), escapeHtml(c.reading), escapeHtml(c.implication)));
    }
    if (say) announce(status, problems.length ? `Check the figures: ${problems[0]?.message ?? ''}` : metricsAnnouncement(v, s));
  };

  const drawRows = (s: MetricsState) => {
    rows.innerHTML = s.firms.map((f, i) => firmRowHtml(f, uid, s, i + 1)).join('');
    rebuildFocus(s);
  };

  const apply = (s: MetricsState) => {
    const set = (f: string, v: string) => {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${f}"]`);
      if (el) el.value = v;
    };
    set('market', s.market);
    set('basis', s.basis);
    set('unit', s.unit);
    set('symbol', s.symbol);
    set('last', s.periods.last);
    set('now', s.periods.now);
    (['spend', 'visits', 'margin', 'retention', 'discount', 'cac'] as const).forEach((k) => {
      const el = clvForm.querySelector<HTMLInputElement>(`[data-f="${k}"]`);
      if (el) el.value = String(s.clv[k]);
    });
    drawRows(s);
    focusSel.value = s.focus;
    render(false);
  };

  const kit = mountKit<MetricsState>({ root, slug: cfg.slug, name: 'Market metrics', defaults: cfg.defaults, normalize: normalizeMetrics, read, apply, csv: metricsCsvRows, text: metricsSummary });

  const onEdit = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.matches('[data-f="group"]')) rebuildFocus(read());
    if (t.matches('[data-f="name"]')) {
      const s = read();
      const keep = focusSel.value;
      focusSel.innerHTML = focusOptionsHtml({ ...s, focus: keep });
      focusSel.value = keep;
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 250);
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  clvForm.addEventListener('input', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());
  clvForm.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const s = read();
    if (s.firms.length >= 12) {
      announce(status, 'Twelve sellers is the most the table holds. Group the smallest into one line.');
      return;
    }
    const id = nextId('f', s.firms.map((f) => f.id));
    s.firms.push({ id, name: '', last: 0, now: 0, group: false });
    drawRows(s);
    render(false);
    kit.changed();
    root.querySelector<HTMLInputElement>(`#${uid}-firm-${id}-name`)?.focus();
    announce(status, `Seller ${s.firms.length} added. Name it and enter its sales.`);
  });
  rows.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-remove]');
    if (!btn) return;
    const tr = btn.closest<HTMLElement>('[data-row]');
    const s = read();
    if (s.firms.length <= 2) {
      announce(status, 'A market needs at least two sellers, so this one stays.');
      return;
    }
    const gone = s.firms.find((f) => f.id === tr?.dataset.row);
    s.firms = s.firms.filter((f) => f.id !== tr?.dataset.row);
    drawRows(s);
    render(false);
    kit.changed();
    root.querySelector<HTMLButtonElement>('[data-add]')?.focus();
    announce(status, `${gone?.name || 'Seller'} removed. ${metricsAnnouncement(metricsView(read()), read())}`);
  });

  if (!kit.restored) render(false);
});
