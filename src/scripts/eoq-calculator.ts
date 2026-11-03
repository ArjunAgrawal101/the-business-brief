/**
 * The economic order quantity calculator in the browser: every figure from
 * src/lib/eoq.ts and every fragment from src/lib/eoq-view.ts.
 */
import { costAt, eoqModel, eoqWorking, readEoq, tableQuantities, validateEoq, type EoqField, type EoqInputs } from '../lib/eoq';
import { eoqFiguresHtml, eoqRowsHtml, eoqSvg } from '../lib/eoq-view';
import { workingHtml } from '../lib/render';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

type Base = Omit<EoqInputs, 'discount'>;

interface State {
  inputs: Base;
  discountOn: boolean;
  discount: { minQty: number; price: number };
}

interface Config {
  uid: string;
  key: string;
  units: { one: string; many: string };
  currency: string;
  inputs: Base;
  discount: { minQty: number; price: number } | null;
}

const KEYS = ['demand', 'orderCost', 'holdingCost', 'current', 'weeks', 'buffer', 'price'] as const;

function parseState(d: unknown, f: State): State | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as Partial<State>;
  if (!r.inputs || typeof r.inputs !== 'object') return null;
  const num = (v: unknown, x: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : x);
  return {
    inputs: Object.fromEntries(KEYS.map((k) => [k, num((r.inputs as Partial<Base>)[k], f.inputs[k])])) as unknown as Base,
    discountOn: typeof r.discountOn === 'boolean' ? r.discountOn : f.discountOn,
    discount: { minQty: num(r.discount?.minQty, f.discount.minQty), price: num(r.discount?.price, f.discount.price) },
  };
}

each('[data-ix="eoq-calculator"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form) return;
  const el = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };
  const defaults = (): State => ({ inputs: { ...cfg.inputs }, discountOn: Boolean(cfg.discount), discount: cfg.discount ? { ...cfg.discount } : { minQty: 2000, price: cfg.inputs.price } });
  let state: State = parseState(loadSaved<unknown>(cfg.key), defaults()) ?? defaults();
  let timer = 0;

  const fill = () => {
    KEYS.forEach((k) => {
      const e = el(k);
      if (e) e.value = String(state.inputs[k]);
    });
    const on = el('discountOn');
    if (on) on.checked = state.discountOn;
    const mq = el('minQty');
    if (mq) mq.value = String(state.discount.minQty);
    const dp = el('discountPrice');
    if (dp) dp.value = String(state.discount.price);
  };

  const model = () => eoqModel({ ...state.inputs, discount: state.discountOn ? state.discount : null });

  const render = (say: boolean) => {
    const raw = {
      ...(Object.fromEntries(KEYS.map((k) => [k, parseNumber(el(k)?.value ?? '')])) as Record<(typeof KEYS)[number], number | null>),
      minQty: parseNumber(el('minQty')?.value ?? ''),
      discountPrice: parseNumber(el('discountPrice')?.value ?? ''),
    } as Record<EoqField, number | null>;
    const on = Boolean(el('discountOn')?.checked);
    const problems = validateEoq(raw, on);
    const bad = new Set(problems.map((p) => p.field));
    KEYS.forEach((k) => {
      const v = raw[k];
      if (!bad.has(k) && v !== null) state.inputs[k] = v;
    });
    state.discountOn = on;
    if (!bad.has('minQty') && raw.minQty !== null) state.discount.minQty = raw.minQty;
    if (!bad.has('discountPrice') && raw.discountPrice !== null) state.discount.price = raw.discountPrice;
    (Object.keys(raw) as EoqField[]).forEach((f) => {
      const msg = problems.filter((p) => p.field === f).map((p) => p.message).join(' ');
      const err = root.querySelector<HTMLElement>(`[data-err="${f}"]`);
      if (err) err.textContent = msg;
      const e = el(f);
      if (e) {
        if (msg) e.setAttribute('aria-invalid', 'true');
        else e.removeAttribute('aria-invalid');
      }
    });
    const box = root.querySelector<HTMLElement>('[data-problems]');
    if (box) {
      box.hidden = problems.length === 0;
      box.innerHTML = problems.length ? `<strong>Check the figures.</strong> ${problems.length === 1 ? 'One figure needs' : `${problems.length} figures need`} fixing, marked beside ${problems.length === 1 ? 'it' : 'them'}.` : '';
    }
    if (problems.length) {
      root.classList.add('is-invalid');
      if (say) announce(status, `Check the figures: ${problems[0]?.message ?? ''}`);
      return;
    }
    root.classList.remove('is-invalid');
    const m = model();
    const reading = readEoq(m, cfg.units, cfg.currency);
    set('[data-figures]', eoqFiguresHtml(m, cfg.units, cfg.currency));
    set('[data-chart]', eoqSvg(m, { id: `${cfg.uid}-chart`, units: cfg.units, currency: cfg.currency }));
    set('[data-rows]', eoqRowsHtml(m, cfg.currency));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    set('[data-working]', workingHtml(eoqWorking(m, cfg.units, cfg.currency), escapeHtml(reading.reading), escapeHtml(reading.implication)));
    if (say) announce(status, reading.reading);
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => `economic order quantity ${cfg.units.many}`,
    state: () => ({ tool: 'economic-order-quantity', ...state }),
    csv: () => {
      const m = model();
      return [
        ['Order quantity', 'Orders a year', 'Weeks between orders', 'Ordering cost', 'Holding cost, with the buffer', 'Total cost'],
        ...[...new Set([...tableQuantities(m), m.eoq])]
          .sort((a, b) => a - b)
          .map((q) => costAt(q, m.inputs))
          .map((r) => [r.quantity.toFixed(1), r.ordersPerYear.toFixed(2), r.weeksBetween.toFixed(2), r.ordering.toFixed(2), r.holding.toFixed(2), r.total.toFixed(2)]),
      ];
    },
    reset: () => {
      state = defaults();
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
    if ((e.target as HTMLInputElement).name === 'discountOn') {
      render(true);
      bar.changed();
    }
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  fill();
  render(false);
});
