/**
 * The capacity utilization and productivity calculator in the browser. Every
 * figure comes from src/lib/productivity.ts and every fragment from
 * src/lib/productivity-view.ts, the code that drew the worked example.
 */
import { workingHtml } from '../lib/render';
import { MEASURES, PERIOD_KEYS, measureText, productionModel, productionNotes, productionWorkings, readComparison, readUtilization, validatePeriod, type PeriodInputs, type ProductionSettings, type Units } from '../lib/productivity';
import { fixedCostRowsHtml, fixedCostSvg, measureRowsHtml, utilizationBarsHtml } from '../lib/productivity-view';
import { announce, each, escapeHtml, inputValue, parseNumber, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface Period {
  name: string;
  values: PeriodInputs;
}

interface State {
  currency: string;
  units: Units;
  capitalLabel: string;
  settings: ProductionSettings;
  compare: boolean;
  periods: [Period, Period];
}

interface Config extends Omit<State, 'compare'> {
  uid: string;
  key: string;
}

const P = ['a', 'b'] as const;
const STEP: Record<keyof PeriodInputs, string> = { capacity: '1', made: '1', defects: '1', labour: '0.5', capital: '0.5', price: '0.01', inputCost: '0.01', fixedCosts: '0.01' };
const LABEL: Record<keyof PeriodInputs, string> = {
  capacity: 'Productive capacity',
  made: 'Units produced',
  defects: 'Units failing inspection',
  labour: 'Labour input',
  capital: 'Capital input',
  price: 'Selling price of one unit',
  inputCost: 'Total costs',
  fixedCosts: 'Fixed costs',
};

/** Accept saved or opened data only when it has the shape this tool writes. */
function parseState(d: unknown, fallback: State): State | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as Partial<State>;
  if (!Array.isArray(r.periods) || r.periods.length !== 2) return null;
  const periods = r.periods.map((p, k) => {
    const values = { ...fallback.periods[k]?.values } as PeriodInputs;
    for (const key of PERIOD_KEYS) {
      const v = (p as Period | undefined)?.values?.[key];
      if (typeof v === 'number' && Number.isFinite(v)) values[key] = v;
    }
    const name = typeof (p as Period | undefined)?.name === 'string' ? (p as Period).name.slice(0, 24) : (fallback.periods[k]?.name ?? '');
    return { name, values };
  }) as [Period, Period];
  const str = (v: unknown, f: string, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : f);
  const u = (r.units ?? {}) as Partial<Units>;
  return {
    currency: str(r.currency, fallback.currency, 4),
    units: { one: str(u.one, fallback.units.one, 30), many: str(u.many, fallback.units.many, 30), period: str(u.period, fallback.units.period, 20) },
    capitalLabel: str(r.capitalLabel, fallback.capitalLabel, 30),
    settings: {
      defects: r.settings?.defects === 'scrapped' ? 'scrapped' : r.settings?.defects === 'reworked' ? 'reworked' : fallback.settings.defects,
      labour: r.settings?.labour === 'hours' ? 'hours' : r.settings?.labour === 'workers' ? 'workers' : fallback.settings.labour,
    },
    compare: typeof r.compare === 'boolean' ? r.compare : true,
    periods,
  };
}

each('[data-ix="capacity-calculator"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form) return;
  const el = <T extends HTMLElement = HTMLInputElement>(name: string) => form.elements.namedItem(name) as T | null;
  const $ = (sel: string) => root.querySelector<HTMLElement>(sel);
  const set = (sel: string, html: string) => {
    const e = $(sel);
    if (e) e.innerHTML = html;
  };
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const defaults = (): State => ({ currency: cfg.currency, units: clone(cfg.units), capitalLabel: cfg.capitalLabel, settings: clone(cfg.settings), compare: true, periods: clone(cfg.periods) });
  let state: State = parseState(loadSaved<unknown>(cfg.key), defaults()) ?? defaults();
  let which: 'a' | 'b' = 'a';
  let timer = 0;

  /** Put the state into the form. */
  const fill = () => {
    const put = (name: string, v: string) => {
      const e = el(name);
      if (e) e.value = v;
    };
    put('one', state.units.one);
    put('many', state.units.many);
    put('period', state.units.period);
    put('currency', state.currency);
    put('capitalLabel', state.capitalLabel);
    const lab = el<HTMLSelectElement>('labourMeasure');
    if (lab) lab.value = state.settings.labour;
    const def = el<HTMLSelectElement>('defectsMode');
    if (def) def.value = state.settings.defects;
    const cmp = el('compare');
    if (cmp) cmp.checked = state.compare;
    P.forEach((p, k) => {
      put(`name-${p}`, state.periods[k as 0 | 1].name);
      PERIOD_KEYS.forEach((key) => put(`${p}-${key}`, inputValue(state.periods[k as 0 | 1].values[key], STEP[key])));
    });
  };

  /** Read the form into the state; returns the problems for each period. */
  const read = () => {
    const txt = (name: string, f: string) => el(name)?.value.trim() || f;
    state.units = { one: txt('one', 'unit'), many: txt('many', 'units'), period: txt('period', 'period') };
    state.currency = el('currency')?.value.trim() || '';
    state.capitalLabel = txt('capitalLabel', 'machine hours');
    state.settings = { labour: el<HTMLSelectElement>('labourMeasure')?.value === 'hours' ? 'hours' : 'workers', defects: el<HTMLSelectElement>('defectsMode')?.value === 'scrapped' ? 'scrapped' : 'reworked' };
    state.compare = el('compare')?.checked ?? true;
    return P.map((p, k) => {
      state.periods[k as 0 | 1].name = el(`name-${p}`)?.value.trim() || `Period ${k + 1}`;
      const raw = Object.fromEntries(PERIOD_KEYS.map((key) => [key, parseNumber(el(`${p}-${key}`)?.value ?? '')])) as Record<keyof PeriodInputs, number | null>;
      const problems = validatePeriod(raw);
      PERIOD_KEYS.forEach((key) => {
        const v = raw[key];
        if (v !== null && Number.isFinite(v)) state.periods[k as 0 | 1].values[key] = v;
      });
      return problems;
    });
  };

  const render = (say: boolean) => {
    const problems = read();
    const active = state.compare ? problems : [problems[0] ?? [], []];
    root.classList.toggle('is-single', !state.compare);
    // Labels that carry the unit names, the period names and the currency.
    const u = state.units;
    root.querySelectorAll<HTMLElement>('[data-funit]').forEach((e) => {
      const k = e.dataset.funit as keyof PeriodInputs;
      e.textContent = k === 'labour' ? (state.settings.labour === 'workers' ? 'workers' : 'hours') : k === 'capital' ? state.capitalLabel : u.many;
    });
    root.querySelectorAll<HTMLElement>('[data-cur]').forEach((e) => (e.textContent = state.currency));
    P.forEach((p, k) => {
      root.querySelectorAll<HTMLElement>(`[data-pname="${p}"], [data-rname="${p}"], [data-pname-opt="${p}"]`).forEach((e) => (e.textContent = state.periods[k as 0 | 1].name));
    });
    // Errors beside the fields.
    P.forEach((p, k) => {
      PERIOD_KEYS.forEach((key) => {
        const msg = (active[k] ?? []).filter((x) => x.field === key).map((x) => x.message).join(' ');
        const err = root.querySelector<HTMLElement>(`[data-err="${p}-${key}"]`);
        if (err) err.textContent = msg;
        const input = el(`${p}-${key}`);
        if (input) {
          if (msg) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        }
      });
    });
    const count = active.reduce((n, x) => n + x.length, 0);
    const box = $('[data-problems]');
    if (box) {
      box.hidden = count === 0;
      box.innerHTML = count ? `<strong>Check the figures.</strong> ${count === 1 ? 'One figure needs' : `${count} figures need`} fixing, marked beside ${count === 1 ? 'it' : 'them'}. The results below are for the last figures that worked.` : '';
    }
    if (count) {
      root.classList.add('is-invalid');
      if (say) announce(status, `Check the figures: ${active.flat()[0]?.message ?? ''}`);
      return;
    }
    root.classList.remove('is-invalid');
    const s = state.settings;
    const cur = state.currency;
    const [pa, pb] = state.periods;
    const a = productionModel(pa.values, s);
    const b = productionModel(pb.values, s);
    const rows = state.compare ? [{ name: pa.name, m: a }, { name: pb.name, m: b }] : [{ name: pa.name, m: a }];
    set('[data-measures]', measureRowsHtml(a, state.compare ? b : null, u, cur, s, state.capitalLabel));
    set('[data-bars]', utilizationBarsHtml(rows, u));
    const ua = readUtilization(a, u);
    const ub = readUtilization(b, u);
    set('[data-read-a]', escapeHtml(`${pa.name}: ${ua.reading}`));
    set('[data-read-b]', escapeHtml(`${pb.name}: ${ub.reading}`));
    set('[data-compare]', escapeHtml(readComparison(a, b, { a: pa.name, b: pb.name }, u, cur)));
    set('[data-impl]', escapeHtml(ua.implication));
    set('[data-chart]', fixedCostSvg(rows, u, cur, `${uid}-chart`));
    set('[data-curve]', fixedCostRowsHtml(pa.values.fixedCosts, pa.values.capacity, cur));
    const w = !state.compare ? 'a' : which;
    const m = w === 'a' ? a : b;
    const works = productionWorkings(m, u, cur, s, state.capitalLabel);
    const notes = productionNotes(m, u, cur);
    MEASURES.forEach((x) => set(`[data-working="${x.key}"]`, workingHtml(works[x.key], escapeHtml(notes[x.key].interpretation), escapeHtml(notes[x.key].implication))));
    if (say) {
      const parts = [`${pa.name}: capacity utilization ${measureText(a, 'utilization', u, cur, s, state.capitalLabel)}, productivity rate ${measureText(a, 'productivity', u, cur, s, state.capitalLabel)}`];
      if (state.compare) parts.push(`${pb.name}: ${measureText(b, 'utilization', u, cur, s, state.capitalLabel)} and ${measureText(b, 'productivity', u, cur, s, state.capitalLabel)}`);
      announce(status, `${parts.join('. ')}.`);
    }
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => `capacity and productivity ${state.periods[0].name} ${state.compare ? state.periods[1].name : ''}`,
    state: () => ({ tool: 'capacity-and-productivity', ...state }),
    csv: () => {
      const [pa, pb] = state.periods;
      const a = productionModel(pa.values, state.settings);
      const b = productionModel(pb.values, state.settings);
      const head = ['Measure', pa.name, ...(state.compare ? [pb.name] : [])];
      const inputs = PERIOD_KEYS.map((k) => [LABEL[k], String(pa.values[k]), ...(state.compare ? [String(pb.values[k])] : [])]);
      const results = MEASURES.map((x) => [x.name, measureText(a, x.key, state.units, state.currency, state.settings, state.capitalLabel), ...(state.compare ? [measureText(b, x.key, state.units, state.currency, state.settings, state.capitalLabel)] : [])]);
      return [head, ...inputs, ...results];
    },
    reset: () => {
      state = defaults();
      which = 'a';
      fill();
      render(true);
    },
    load: (data) => {
      const next = parseState(data, defaults());
      if (!next) return 'That file is not one saved by this calculator.';
      state = next;
      fill();
      render(true);
      return null;
    },
  });

  form.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      render(true);
      bar.changed();
    }, 350);
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type === 'checkbox')) {
      window.clearTimeout(timer);
      render(true);
      bar.changed();
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector<HTMLSelectElement>('[data-which]')?.addEventListener('change', (e) => {
    which = (e.target as HTMLSelectElement).value === 'b' ? 'b' : 'a';
    render(false);
  });

  fill();
  render(false);
});
