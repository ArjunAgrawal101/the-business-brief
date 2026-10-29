import { marketShareSvg } from '../lib/charts-studio';
import { fmtNumber } from '../lib/format';
import { growthReading, growthWorking, marketModel, readMarket, shareWorking, validateMarket, type MarketFirm } from '../lib/market';
import { workingHtml } from '../lib/render';
import { marketFiguresHtml, marketTableHtml } from '../lib/render-studio';
import { announce, each, escapeHtml, parseNumber, readConfig, store } from './ix';

interface Config {
  uid: string;
  firms: MarketFirm[];
  focus: string;
  periods: { last: string; now: string };
  unit: string;
  scenarios: Array<{ id: string; label: string; note: string; set: Record<string, { last?: number; now?: number }> }>;
}

each('[data-ix="market-share"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLElement>('[data-scenario-note]');
  const hl = root.querySelector<HTMLTextAreaElement>('[data-note]');
  if (!form) return;
  const input = (id: string, k: 'last' | 'now') => form.elements.namedItem(`${id}-${k}`) as HTMLInputElement | null;
  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };
  let timer = 0;

  const render = (say: boolean) => {
    const raw = cfg.firms.map((f) => ({ id: f.id, last: parseNumber(input(f.id, 'last')?.value ?? ''), now: parseNumber(input(f.id, 'now')?.value ?? '') }));
    const problems = validateMarket(raw);
    cfg.firms.forEach((f) =>
      (['last', 'now'] as const).forEach((k) => {
        const p = problems.find((x) => x.id === f.id && x.field === k);
        input(f.id, k)?.setAttribute('aria-invalid', p ? 'true' : 'false');
        const err = root.querySelector<HTMLElement>(`[data-err="${f.id}-${k}"]`);
        if (err) err.textContent = p ? p.message : '';
      }),
    );
    if (problems.length) {
      root.classList.add('is-invalid');
      announce(status, `Check the sales: ${problems.map((p) => p.message).join(' ')}`);
      return;
    }
    root.classList.remove('is-invalid');
    const firms = cfg.firms.map((f, i) => ({ ...f, last: raw[i]?.last ?? 0, now: raw[i]?.now ?? 0 }));
    const m = marketModel(firms);
    const reading = readMarket(m, cfg.focus, cfg.periods, cfg.unit);
    const growth = growthReading(m);
    set('[data-figures]', marketFiguresHtml(m, cfg.focus, cfg.periods, cfg.unit));
    set('[data-chart]', marketShareSvg(m, { id: `${cfg.uid}-chart`, focus: cfg.focus, periods: cfg.periods }));
    set('[data-table]', marketTableHtml(m, cfg.focus));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    set('[data-working-share]', workingHtml(shareWorking(m, cfg.focus, cfg.periods.now, cfg.unit), escapeHtml(reading.reading), escapeHtml(reading.implication)));
    set('[data-working-growth]', workingHtml(growthWorking(m, cfg.periods, cfg.unit), escapeHtml(growth.interpretation), escapeHtml(growth.implication)));
    if (say) {
      const f = m.firms.find((x) => x.id === cfg.focus);
      announce(status, `Market growth ${m.growth === null ? 'not available' : `${fmtNumber(m.growth, 1)}%`}. ${f?.name ?? ''} share ${f?.shareNow === null || !f ? 'not available' : `${fmtNumber(f.shareNow, 1)}%`}.`);
    }
  };

  const fill = (scenario?: Config['scenarios'][number]) =>
    cfg.firms.forEach((f) =>
      (['last', 'now'] as const).forEach((k) => {
        const el = input(f.id, k);
        if (el) el.value = String(scenario?.set[f.id]?.[k] ?? f[k]);
      }),
    );

  form.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const s = cfg.scenarios.find((x) => x.id === btn.dataset.scenario);
      if (!s) return;
      fill(s);
      if (note) note.textContent = `${s.label}: ${s.note}`;
      root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render(true);
    }),
  );
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    fill();
    if (note) note.textContent = 'Back to the case figures.';
    root.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    render(true);
  });

  // The HL answer is kept on this device.
  const key = `studio:${cfg.uid}:note`;
  if (hl) {
    hl.value = store.get<string>(key, '');
    hl.addEventListener('input', () => store.set(key, hl.value));
  }
});
