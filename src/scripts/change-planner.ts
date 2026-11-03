/**
 * The change management planner in the browser: the change, its forces and
 * its stakeholders are read from the form, checked and planned by
 * src/lib/change-plan.ts, and drawn by src/lib/change-plan-view.ts after
 * every change. Rows are added and removed by rebuilding their list, with
 * focus moved to the new row or to the button that removed one.
 */
import { REASONS, isReason, readChange, validateChange, changeCsvRows, type ChangeInputs, type Level, type Stakeholder, type Stance } from '../lib/change-plan';
import { forceFieldSvg, forceReadingHtml, forceRowsHtml, leverOptionsHtml, resistanceHtml, stakeholderMapHtml, stakeholderRowsHtml, stepsHtml } from '../lib/change-plan-view';
import type { Force } from '../lib/force-field';
import { announce, each, escapeHtml, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface State extends ChangeInputs {
  note: string;
}

interface Config extends ChangeInputs {
  uid: string;
  key: string;
  limits: { forces: number; stakeholders: number; change: number; label: number };
}

type Side = 'driving' | 'restraining';
const SIDES: Side[] = ['driving', 'restraining'];

/** A saved or opened plan, or null when it is not one this tool wrote. */
function parseState(d: unknown, limits: Config['limits']): State | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as Partial<Record<keyof State, unknown>>;
  if (typeof r.change !== 'string' || !Array.isArray(r.driving) || !Array.isArray(r.restraining) || !Array.isArray(r.stakeholders)) return null;
  const forces = (list: unknown[]): Force[] | null => {
    const out = list.slice(0, limits.forces).map((f) => {
      const x = f as { label?: unknown; strength?: unknown };
      return typeof x?.label === 'string' && typeof x.strength === 'number' && Number.isInteger(x.strength) && x.strength >= 1 && x.strength <= 5 ? { label: x.label.slice(0, limits.label), strength: x.strength } : null;
    });
    return out.every((f) => f !== null) && out.length ? (out as Force[]) : null;
  };
  const driving = forces(r.driving);
  const restraining = forces(r.restraining);
  const level = (v: unknown): v is Level => v === 'high' || v === 'low';
  const stance = (v: unknown): v is Stance => v === 'supports' || v === 'neutral' || v === 'opposes';
  const stakeholders = r.stakeholders.slice(0, limits.stakeholders).map((s) => {
    const x = s as Partial<Record<keyof Stakeholder, unknown>>;
    return typeof x?.name === 'string' && level(x.power) && level(x.interest) && stance(x.stance) && isReason(x.reason) ? { name: x.name.slice(0, limits.label), power: x.power, interest: x.interest, stance: x.stance, reason: x.reason } : null;
  });
  if (!driving || !restraining || !stakeholders.length || stakeholders.some((s) => s === null)) return null;
  const lever = typeof r.lever === 'number' && Number.isInteger(r.lever) && r.lever >= 0 && r.lever < restraining.length ? r.lever : null;
  return { change: r.change.slice(0, limits.change), driving, restraining, stakeholders: stakeholders as Stakeholder[], lever, note: typeof r.note === 'string' ? r.note.slice(0, 4000) : '' };
}

each('[data-ix="change-planner"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const stBox = root.querySelector<HTMLElement>('[data-stakeholders]');
  const leverSel = document.getElementById(`${uid}-lever`) as HTMLSelectElement | null;
  const note = root.querySelector<HTMLTextAreaElement>('[data-note]');
  if (!form || !stBox) return;
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const defaults = (): State => ({ change: cfg.change, driving: clone(cfg.driving), restraining: clone(cfg.restraining), stakeholders: clone(cfg.stakeholders), lever: cfg.lever, note: '' });
  let state: State = parseState(loadSaved<unknown>(cfg.key), cfg.limits) ?? defaults();
  let timer = 0;
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };
  const body = (side: Side) => root.querySelector<HTMLElement>(`[data-forces="${side}"]`);

  const drawRows = () => {
    SIDES.forEach((side) => {
      const b = body(side);
      if (b) b.innerHTML = forceRowsHtml(side, state[side], uid);
    });
    stBox.innerHTML = stakeholderRowsHtml(state.stakeholders, uid);
    if (leverSel) leverSel.innerHTML = leverOptionsHtml(state.restraining, state.lever);
  };

  const fill = () => {
    const c = document.getElementById(`${uid}-change`) as HTMLInputElement | null;
    if (c) c.value = state.change;
    if (note) note.value = state.note;
    drawRows();
  };

  /** The form as it stands, before checking. */
  const readForm = () => {
    const forces = (side: Side) =>
      Array.from(body(side)?.querySelectorAll<HTMLElement>('tr[data-force]') ?? []).map((tr) => ({
        label: tr.querySelector<HTMLInputElement>('input[name="label"]')?.value ?? '',
        strength: Number(tr.querySelector<HTMLSelectElement>('select[name="strength"]')?.value ?? '0') || null,
      }));
    const stakeholders = Array.from(stBox.querySelectorAll<HTMLElement>('li[data-stakeholder]')).map((li) => {
      const v = (n: string) => li.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)?.value ?? '';
      return { name: v('name'), power: v('power'), interest: v('interest'), stance: v('stance'), reason: v('reason') };
    });
    const lv = leverSel?.value ?? '';
    return { change: (document.getElementById(`${uid}-change`) as HTMLInputElement | null)?.value ?? '', driving: forces('driving'), restraining: forces('restraining'), stakeholders, lever: lv === '' ? null : Number(lv) };
  };

  const mark = (el: Element | null, bad: boolean) => {
    if (!el) return;
    if (bad) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  };

  const render = (say: boolean) => {
    const raw = readForm();
    const problems = validateChange(raw);
    const err = (sel: string, msg: string) => {
      const e = root.querySelector<HTMLElement>(sel);
      if (e) e.textContent = msg;
    };
    const changeMsg = problems.filter((p) => p.field === 'change').map((p) => p.message).join(' ');
    err('[data-err="change"]', changeMsg);
    mark(document.getElementById(`${uid}-change`), Boolean(changeMsg));
    SIDES.forEach((side) =>
      raw[side].forEach((_, k) => {
        const msgs = problems.filter((p) => p.field === side && p.index === k);
        err(`[data-err-force="${side}-${k}"]`, msgs.map((p) => p.message).join(' '));
        mark(document.getElementById(`${uid}-${side}-${k}-label`), msgs.some((p) => p.part === 'label'));
      }),
    );
    raw.stakeholders.forEach((_, k) => {
      const msgs = problems.filter((p) => p.field === 'stakeholders' && p.index === k);
      err(`[data-err-st="${k}"]`, msgs.map((p) => p.message).join(' '));
      mark(document.getElementById(`${uid}-s${k}-name`), msgs.some((p) => p.part === 'name'));
    });
    const box = root.querySelector<HTMLElement>('[data-problems]');
    if (box) {
      box.hidden = problems.length === 0;
      box.innerHTML = problems.length ? `<strong>Check the plan.</strong> ${problems.length === 1 ? 'One entry needs' : `${problems.length} entries need`} fixing, marked beside ${problems.length === 1 ? 'it' : 'them'}.` : '';
    }
    if (problems.length) {
      root.classList.add('is-invalid');
      if (say) announce(status, `Check the plan: ${problems[0]?.message ?? ''}`);
      return false;
    }
    root.classList.remove('is-invalid');
    state = { ...state, change: raw.change, driving: raw.driving as Force[], restraining: raw.restraining as Force[], stakeholders: raw.stakeholders as Stakeholder[], lever: raw.lever !== null && raw.lever < raw.restraining.length ? raw.lever : null };
    const read = readChange(state);
    set('[data-interp]', escapeHtml(read.reading));
    set('[data-impl]', escapeHtml(read.implication));
    set('[data-ff-chart]', forceFieldSvg(state.driving, state.restraining, state.lever, `${uid}-ff`));
    set('[data-ff-read]', forceReadingHtml(state.driving, state.restraining, state.lever));
    set('[data-map]', stakeholderMapHtml(state.stakeholders));
    set('[data-res]', resistanceHtml(state.stakeholders));
    set('[data-steps]', stepsHtml(state));
    if (say) announce(status, read.reading);
    return true;
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => `Change plan: ${state.change}`,
    state: () => ({ tool: 'change-planner', ...state }),
    csv: () => [...changeCsvRows(state), ...(state.note ? [[], ['Your plan', state.note]] : [])],
    reset: () => {
      state = defaults();
      fill();
      render(true);
    },
    load: (data) => {
      const next = parseState(data, cfg.limits);
      if (!next) return 'That file is not a plan saved by this tool.';
      state = next;
      fill();
      render(true);
      return null;
    },
  });

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLElement | null;
    // Renaming a restraining force renames its option in the choice of force to weaken.
    if (t instanceof HTMLInputElement && t.name === 'label' && t.closest('[data-forces="restraining"]') && leverSel) {
      const k = Number(t.closest('tr')?.getAttribute('data-force'));
      const o = leverSel.options[k + 1];
      if (o) o.textContent = `${k + 1}. ${t.value || 'Unnamed force'}`;
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (render(true)) bar.changed();
    }, 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  // The note has its own timer, so typing in it never cancels a pending replan.
  let noteTimer = 0;
  note?.addEventListener('input', () => {
    state.note = note.value;
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => bar.changed(), 500);
  });

  /** Take the form's current values into the state before rebuilding rows, so nothing typed is lost. */
  const keep = () => {
    const raw = readForm();
    state.change = raw.change;
    state.driving = raw.driving.map((f) => ({ label: f.label, strength: f.strength ?? 3 }));
    state.restraining = raw.restraining.map((f) => ({ label: f.label, strength: f.strength ?? 3 }));
    state.stakeholders = raw.stakeholders.map((s) => ({ name: s.name, power: s.power === 'high' ? 'high' : 'low', interest: s.interest === 'high' ? 'high' : 'low', stance: s.stance === 'supports' || s.stance === 'opposes' ? s.stance : 'neutral', reason: isReason(s.reason) ? s.reason : 'none' }));
    state.lever = raw.lever !== null && raw.lever < raw.restraining.length ? raw.lever : null;
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
    if (!btn || !root.contains(btn)) return;
    const addSide = btn.dataset.addForce as Side | undefined;
    const removeSide = btn.dataset.removeForce as Side | undefined;
    if (addSide) {
      keep();
      if (state[addSide].length >= cfg.limits.forces) {
        announce(status, `The plan already has ${cfg.limits.forces} ${addSide} forces, the most it takes.`);
        return;
      }
      state[addSide].push({ label: '', strength: 3 });
      drawRows();
      document.getElementById(`${uid}-${addSide}-${state[addSide].length - 1}-label`)?.focus();
      render(false);
      announce(status, `A new ${addSide} force added. Name it and give it a strength.`);
    } else if (removeSide) {
      keep();
      const k = Number(btn.dataset.index);
      if (state[removeSide].length <= 1) {
        announce(status, `The analysis needs at least one ${removeSide} force.`);
        return;
      }
      const [gone] = state[removeSide].splice(k, 1);
      if (removeSide === 'restraining' && state.lever !== null) state.lever = state.lever === k ? null : state.lever > k ? state.lever - 1 : state.lever;
      drawRows();
      root.querySelector<HTMLButtonElement>(`[data-add-force="${removeSide}"]`)?.focus();
      if (render(false)) bar.changed(`${gone?.label || 'The force'} removed.`);
    } else if (btn.hasAttribute('data-add-st')) {
      keep();
      if (state.stakeholders.length >= cfg.limits.stakeholders) {
        announce(status, `The plan already has ${cfg.limits.stakeholders} stakeholders, the most it takes.`);
        return;
      }
      state.stakeholders.push({ name: '', power: 'low', interest: 'high', stance: 'neutral', reason: REASONS[0].id });
      drawRows();
      document.getElementById(`${uid}-s${state.stakeholders.length - 1}-name`)?.focus();
      render(false);
      announce(status, 'A new stakeholder added. Name them and choose their power, interest and stance.');
    } else if (btn.dataset.removeSt !== undefined) {
      keep();
      if (state.stakeholders.length <= 1) {
        announce(status, 'The plan needs at least one stakeholder.');
        return;
      }
      const [gone] = state.stakeholders.splice(Number(btn.dataset.removeSt), 1);
      drawRows();
      root.querySelector<HTMLButtonElement>('[data-add-st]')?.focus();
      if (render(false)) bar.changed(`${gone?.name || 'The stakeholder'} removed.`);
    }
  });

  fill();
  render(false);
});
