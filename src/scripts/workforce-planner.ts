/**
 * The workforce planning tool in the browser: last year's labour turnover and
 * the plan, recalculated by src/lib/workforce.ts and drawn by
 * src/lib/workforce-view.ts as the reader changes them.
 */
import { buildWorking } from '../lib/finance';
import { fmtNumber } from '../lib/format';
import { workingHtml } from '../lib/render';
import { planWorkforce, readWorkforce, retentionSaving, turnoverFrom, validateTurnover, validateWorkforce, workforceCsvRows, workforceOptions, type PlanYear, type TurnoverInputs, type WorkforceInputs } from '../lib/workforce';
import { workforceFiguresHtml, workforceOptionsHtml, workforceRowsHtml, workforceSvg, yearRowsHtml } from '../lib/workforce-view';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface State {
  lastYear: TurnoverInputs;
  plan: WorkforceInputs;
}

interface Config extends State {
  uid: string;
  key: string;
  org: string;
  benchmark: { rate: number; label: string } | null;
  maxYears: number;
}

const LT = ['start', 'end', 'leavers', 'retired'] as const;

function parseState(d: unknown, f: State, maxYears: number): State | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as Partial<State>;
  if (!r.plan || !Array.isArray(r.plan.years) || !r.plan.years.length) return null;
  const whole = (v: unknown, x: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : x);
  const years: PlanYear[] = r.plan.years.slice(0, maxYears).map((y, k) => ({
    label: typeof y?.label === 'string' && y.label.trim() ? y.label.slice(0, 16) : `Year ${k + 1}`,
    demand: whole(y?.demand, f.plan.years[k]?.demand ?? 0),
    retirements: whole(y?.retirements, 0),
  }));
  const rate = typeof r.plan.rate === 'number' && r.plan.rate >= 0 && r.plan.rate <= 100 ? r.plan.rate : f.plan.rate;
  const limit = r.plan.recruitLimit;
  return {
    lastYear: Object.fromEntries(LT.map((k) => [k, whole(r.lastYear?.[k], f.lastYear[k])])) as unknown as TurnoverInputs,
    plan: { staffNow: whole(r.plan.staffNow, f.plan.staffNow), rate, recruitLimit: typeof limit === 'number' && Number.isInteger(limit) && limit >= 0 ? limit : null, years },
  };
}

each('[data-ix="workforce-planner"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const yearsBody = root.querySelector<HTMLElement>('[data-years]');
  if (!form || !yearsBody) return;
  const byId = (id: string) => document.getElementById(id) as HTMLInputElement | null;
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const defaults = (): State => ({ lastYear: clone(cfg.lastYear), plan: clone(cfg.plan) });
  let state: State = parseState(loadSaved<unknown>(cfg.key), defaults(), cfg.maxYears) ?? defaults();
  let timer = 0;
  const pct = (v: number | null) => (v === null ? 'n/a' : `${fmtNumber(v, 1)}%`);

  const fill = () => {
    LT.forEach((k) => {
      const e = byId(`${uid}-lt-${k}`);
      if (e) e.value = String(state.lastYear[k]);
    });
    const s = byId(`${uid}-staffNow`);
    if (s) s.value = String(state.plan.staffNow);
    const r = byId(`${uid}-rate`);
    if (r) r.value = String(state.plan.rate);
    const l = byId(`${uid}-limit`);
    if (l) l.value = state.plan.recruitLimit === null ? '' : String(state.plan.recruitLimit);
    yearsBody.innerHTML = yearRowsHtml(state.plan.years, uid);
  };

  const mark = (id: string, msg: string, errSel: string) => {
    const err = root.querySelector<HTMLElement>(errSel);
    if (err) err.textContent = msg;
    const e = byId(id);
    if (e) {
      if (msg) e.setAttribute('aria-invalid', 'true');
      else e.removeAttribute('aria-invalid');
    }
  };

  const renderTurnover = () => {
    const raw = Object.fromEntries(LT.map((k) => [k, parseNumber(byId(`${uid}-lt-${k}`)?.value ?? '')])) as Record<(typeof LT)[number], number | null>;
    const problems = validateTurnover(raw);
    LT.forEach((k) => mark(`${uid}-lt-${k}`, problems.filter((p) => p.field === k).map((p) => p.message).join(' '), `[data-err="lt-${k}"]`));
    const box = root.querySelector<HTMLElement>('[data-lt-results]');
    if (problems.length) {
      box?.classList.add('is-invalid');
      return problems;
    }
    box?.classList.remove('is-invalid');
    state.lastYear = raw as TurnoverInputs;
    const t = turnoverFrom(state.lastYear);
    set('[data-lt-avg]', escapeHtml(fmtNumber(t.average, Number.isInteger(t.average) ? 0 : 1)));
    set('[data-lt-rate]', escapeHtml(pct(t.turnover)));
    set('[data-lt-leave]', escapeHtml(pct(t.leavingRate)));
    const read = `${fmtNumber(state.lastYear.leavers)} of an average ${fmtNumber(t.average, Number.isInteger(t.average) ? 0 : 1)} employees left: labour turnover of ${pct(t.turnover)}. Without the ${fmtNumber(state.lastYear.retired)} who retired, the leaving rate is ${pct(t.leavingRate)}.`;
    const b = cfg.benchmark;
    const impl = b ? `${b.label} is ${fmtNumber(b.rate, 1)}%. ${t.turnover !== null && t.turnover > b.rate ? 'The gap is worth finding the cause of before planning to recruit around it.' : 'The rate is in line with the comparison.'}` : 'Compare the rate with the business’s own past and with similar organizations before judging it.';
    set('[data-lt-working]', workingHtml(buildWorking('labour-turnover', { leavers: state.lastYear.leavers, averageEmployees: t.average }, ''), escapeHtml(read), escapeHtml(impl)));
    return problems;
  };

  const readYears = (): Array<{ label: string; demand: number | null; retirements: number | null }> =>
    Array.from(yearsBody.querySelectorAll<HTMLElement>('tr[data-year]')).map((tr) => ({
      label: (tr.querySelector<HTMLInputElement>('input[name="label"]')?.value ?? '').trim(),
      demand: parseNumber(tr.querySelector<HTMLInputElement>('input[name="demand"]')?.value ?? ''),
      retirements: parseNumber(tr.querySelector<HTMLInputElement>('input[name="retirements"]')?.value ?? ''),
    }));

  const render = (say: boolean) => {
    const ltProblems = renderTurnover();
    const limitText = (byId(`${uid}-limit`)?.value ?? '').trim();
    const raw = {
      staffNow: parseNumber(byId(`${uid}-staffNow`)?.value ?? ''),
      rate: parseNumber(byId(`${uid}-rate`)?.value ?? ''),
      recruitLimit: limitText === '' ? ('none' as const) : parseNumber(limitText),
      years: readYears(),
    };
    const problems = validateWorkforce(raw);
    mark(`${uid}-staffNow`, problems.filter((p) => p.field === 'staffNow').map((p) => p.message).join(' '), '[data-err="staffNow"]');
    mark(`${uid}-rate`, problems.filter((p) => p.field === 'rate').map((p) => p.message).join(' '), '[data-err="rate"]');
    mark(`${uid}-limit`, problems.filter((p) => p.field === 'recruitLimit').map((p) => p.message).join(' '), '[data-err="recruitLimit"]');
    raw.years.forEach((_, k) => {
      const msgs = problems.filter((p) => p.year === k);
      const err = root.querySelector<HTMLElement>(`[data-err-year="${k}"]`);
      if (err) err.textContent = msgs.map((p) => p.message).join(' ');
      (['label', 'demand', 'retirements'] as const).forEach((f) => {
        const e = byId(`${uid}-y${k}-${f}`);
        if (!e) return;
        if (msgs.some((p) => p.field === f)) e.setAttribute('aria-invalid', 'true');
        else e.removeAttribute('aria-invalid');
      });
    });
    const all = problems.length + ltProblems.length;
    const box = root.querySelector<HTMLElement>('[data-problems]');
    if (box) {
      box.hidden = problems.length === 0;
      box.innerHTML = problems.length ? `<strong>Check the plan.</strong> ${problems.length === 1 ? 'One figure needs' : `${problems.length} figures need`} fixing, marked beside ${problems.length === 1 ? 'it' : 'them'}.` : '';
    }
    if (problems.length) {
      root.classList.add('is-invalid');
      if (say) announce(status, `Check the plan: ${problems[0]?.message ?? ''}`);
      return;
    }
    root.classList.remove('is-invalid');
    state.plan = { staffNow: raw.staffNow as number, rate: raw.rate as number, recruitLimit: raw.recruitLimit === 'none' ? null : (raw.recruitLimit as number), years: raw.years.map((y) => ({ label: y.label, demand: y.demand as number, retirements: y.retirements as number })) };
    const p = planWorkforce(state.plan);
    const reading = readWorkforce(p, cfg.org);
    const b = cfg.benchmark;
    set('[data-figures]', workforceFiguresHtml(p));
    set('[data-chart]', workforceSvg(p, { id: `${uid}-chart`, org: cfg.org }));
    set('[data-rows]', workforceRowsHtml(p));
    set('[data-options]', workforceOptionsHtml(workforceOptions(p, b?.rate ?? null)));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    if (b) {
      const s = retentionSaving(state.plan, b.rate);
      set('[data-saving]', escapeHtml(state.plan.rate > b.rate ? `At a leaving rate of ${fmtNumber(b.rate, 1)}%, recruitment over the plan would be ${fmtNumber(s.recruit)}, ${fmtNumber(s.saved)} fewer hires.` : `The leaving rate is already at or below ${fmtNumber(b.rate, 1)}%.`));
    }
    if (say && !all) announce(status, reading.reading);
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => `${cfg.org} workforce plan`,
    state: () => ({ tool: 'workforce-planning', ...state }),
    csv: () => workforceCsvRows(planWorkforce(state.plan)),
    reset: () => {
      state = defaults();
      fill();
      render(true);
    },
    load: (data) => {
      const next = parseState(data, defaults(), cfg.maxYears);
      if (!next) return 'That file is not a plan saved by this tool.';
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
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-use-rate]')?.addEventListener('click', () => {
    const t = turnoverFrom(state.lastYear);
    if (t.leavingRate === null) return;
    const r = byId(`${uid}-rate`);
    if (r) r.value = String(Math.round(t.leavingRate * 10) / 10);
    render(false);
    bar.changed(`The plan now uses a leaving rate of ${fmtNumber(t.leavingRate, 1)}%.`);
  });

  root.querySelector('[data-add-year]')?.addEventListener('click', () => {
    if (state.plan.years.length >= cfg.maxYears) {
      announce(status, `The plan already covers ${cfg.maxYears} years, the most this tool projects.`);
      return;
    }
    const last = state.plan.years[state.plan.years.length - 1];
    const n = Number(last?.label);
    const label = Number.isInteger(n) ? String(n + 1) : `Year ${state.plan.years.length + 1}`;
    state.plan.years.push({ label, demand: last?.demand ?? state.plan.staffNow, retirements: last?.retirements ?? 0 });
    yearsBody.innerHTML = yearRowsHtml(state.plan.years, uid);
    byId(`${uid}-y${state.plan.years.length - 1}-demand`)?.focus();
    render(false);
    bar.changed(`${label} added to the plan.`);
  });
  root.querySelector('[data-remove-year]')?.addEventListener('click', () => {
    if (state.plan.years.length <= 1) {
      announce(status, 'The plan needs at least one year.');
      return;
    }
    const gone = state.plan.years.pop();
    yearsBody.innerHTML = yearRowsHtml(state.plan.years, uid);
    render(false);
    bar.changed(`${gone?.label ?? 'The last year'} removed from the plan.`);
  });

  fill();
  render(false);
});
