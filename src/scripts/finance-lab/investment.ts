/**
 * Payback, ARR and NPV: a project's cost and its years of net cash flow,
 * which the reader can lengthen or shorten, and at HL the discount rate.
 */
import { MAX_YEARS } from '../../lib/investment';
import { INVESTMENT_BUILDERS, INVESTMENT_DEFAULTS, investmentState, validateInvestment, type InvestmentId, type InvestmentInput } from '../../lib/finance-lab/investment';
import { yearsHtml } from '../../lib/finance-lab/forms';
import { announce, each, parseNumber } from '../ix';
import { mount, type Read } from './engine';

each('[data-ix="finance-lab"][data-family="investment"]', (root) => {
  const id = root.dataset.calc as InvestmentId;
  const list = root.querySelector<HTMLElement>('[data-years]');
  const cost = root.querySelector<HTMLInputElement>('input[name="cost"]');
  const label = root.querySelector<HTMLInputElement>('input[name="label"]');
  const rate = root.querySelector<HTMLSelectElement>('select[name="rate"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!list || !cost || !label) throw new Error('The project form is incomplete.');
  const uid = list.dataset.uid ?? 'fl';
  const currency = () => root.querySelector<HTMLSelectElement>('[data-setting="currency"]')?.value ?? '$';

  const values = () => [...list.querySelectorAll<HTMLInputElement>('input[data-num]')].map((el) => el.value);
  const render = (v: string[], focus?: number) => {
    list.innerHTML = yearsHtml(v, uid, currency());
    if (focus) list.querySelector<HTMLInputElement>(`input[name="r${focus}"]`)?.focus();
  };

  let input: InvestmentInput = { label: '', capitalCost: null, returns: [], rate: null };
  const read = (): Read => {
    const returns = values().map((v) => parseNumber(v));
    input = { label: label.value, capitalCost: parseNumber(cost.value), returns, rate: rate ? Number(rate.value) : INVESTMENT_DEFAULTS.rate };
    const raw: Record<string, number | null> = { cost: input.capitalCost, rate: input.rate };
    returns.forEach((r, k) => (raw[`r${k + 1}`] = r));
    return { raw, text: { label: label.value } };
  };

  const api = mount(root, {
    read,
    validate: () => validateInvestment(input),
    build: (_r, s) => INVESTMENT_BUILDERS[id](investmentState(input), s),
    reset: () => {
      label.value = INVESTMENT_DEFAULTS.label;
      cost.value = String(INVESTMENT_DEFAULTS.capitalCost);
      if (rate) rate.value = String(INVESTMENT_DEFAULTS.rate);
      render(INVESTMENT_DEFAULTS.returns.map(String));
    },
    toParams: () => {
      const p = new URLSearchParams();
      p.set('label', label.value);
      p.set('cost', cost.value);
      p.set('r', values().join('~'));
      if (rate) p.set('rate', rate.value);
      return p;
    },
    fromParams: (_root, p) => {
      let set = false;
      const r = p.get('r');
      if (r) {
        const v = r.split('~').slice(0, MAX_YEARS).map((x) => x.slice(0, 20));
        if (v.length) {
          render(v);
          set = true;
        }
      }
      const c = p.get('cost');
      if (c !== null && parseNumber(c) !== null) {
        cost.value = c;
        set = true;
      }
      const l = p.get('label');
      if (l !== null) {
        label.value = l.slice(0, 60);
        set = true;
      }
      const rt = p.get('rate');
      if (rate && rt !== null && [...rate.options].some((o) => o.value === rt)) {
        rate.value = rt;
        set = true;
      }
      return set;
    },
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn) return;
    const v = values();
    if (btn.dataset.act === 'add-year') {
      if (v.length >= MAX_YEARS) {
        announce(status, `The guide’s discount table covers ${MAX_YEARS} years, so the lab does too.`);
        return;
      }
      render([...v, '0'], v.length + 1);
      api.refresh(`Year ${v.length + 1} added.`);
    } else if (btn.dataset.act === 'remove-year') {
      if (v.length <= 1) {
        announce(status, 'A project needs at least one year of returns.');
        return;
      }
      render(v.slice(0, -1));
      btn.focus();
      api.refresh(`Year ${v.length} removed.`);
    }
  });
});
