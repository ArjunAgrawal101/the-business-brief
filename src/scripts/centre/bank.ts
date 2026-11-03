/**
 * The question bank in the browser: filters and search over the
 * server-rendered list, self-ratings and timed sets kept in bb:bank, progress
 * by unit and command term, and export. Every rule lives in src/lib/bank.ts;
 * this file only reads the page and writes the results back to it.
 */
import { announce, each, readConfig, store } from '../ix';
import {
  activeFilters,
  bankCsv,
  drawSet,
  emptyState,
  fmtClock,
  fmtDuration,
  fmtPace,
  inPace,
  matches,
  parseState,
  progressBy,
  rate,
  recordSet,
  setSeconds,
  statusOf,
  totals,
  RATING_LABELS,
  type BankFilters,
  type BankState,
  type Facets,
  type Pace,
  type Rating,
  type SetRecord,
} from '../../lib/bank';

interface Config {
  items: Facets[];
  paces: Pace[];
  terms: Record<string, string>;
  units: Record<string, string>;
}

const KEY = 'bank';

/** Today in the reader's own time zone, as YYYY-MM-DD. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const longDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : day;
};
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

each('[data-ix="bank"]', (root) => {
  const cfg = readConfig<Config>(root);
  const live = root.querySelector<HTMLElement>('[data-live]');
  const byId = new Map(cfg.items.map((f) => [f.id, f]));
  const cards = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-bq]').forEach((el) => cards.set(el.dataset.bq ?? '', el));
  const groups = [...root.querySelectorAll<HTMLElement>('[data-unit-group]')];
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);

  let state: BankState = parseState(store.get<unknown>(KEY, null));
  const save = () => store.set(KEY, state);

  /* ---------- Filters ---------- */

  const form = q<HTMLFormElement>('[data-filters]');
  const count = q<HTMLElement>('[data-count]');
  const empty = q<HTMLElement>('[data-empty]');
  const clear = q<HTMLButtonElement>('[data-clear]');
  const field = (name: string) => form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;

  const readFilters = (): BankFilters => {
    const v = (name: string) => field(name)?.value ?? '';
    const unit = v('unit');
    return {
      unit: unit ? Number(unit) : null,
      code: v('code'),
      paper: v('paper') as BankFilters['paper'],
      level: v('level') as BankFilters['level'],
      command: v('command'),
      ao: v('ao') as BankFilters['ao'],
      band: v('band') as BankFilters['band'],
      type: v('type') as BankFilters['type'],
      status: v('status') as BankFilters['status'],
      query: v('query'),
    };
  };

  let visible: Facets[] = cfg.items;

  const applyFilters = (say = false) => {
    const filters = readFilters();
    visible = cfg.items.filter((f) => matches(f, filters, state));
    const shown = new Set(visible.map((f) => f.id));
    cards.forEach((el, id) => (el.hidden = !shown.has(id)));
    groups.forEach((g) => {
      const n = [...g.querySelectorAll<HTMLElement>('[data-bq]')].filter((el) => !el.hidden).length;
      g.hidden = n === 0;
      const c = g.querySelector<HTMLElement>('[data-group-count]');
      if (c) c.textContent = plural(n, 'question', 'questions');
    });
    const marks = visible.reduce((s, f) => s + f.marks, 0);
    const text =
      visible.length === cfg.items.length
        ? `${plural(cfg.items.length, 'question', 'questions')}, ${marks} marks`
        : `Showing ${visible.length} of ${cfg.items.length} questions, ${marks} marks`;
    if (count) count.textContent = text;
    if (empty) empty.hidden = visible.length > 0;
    if (clear) clear.hidden = activeFilters(filters) === 0;
    root.querySelectorAll<HTMLElement>('[data-unit-count]').forEach((el) => {
      const u = Number(el.dataset.unitCount);
      el.textContent = String(visible.filter((f) => f.units[0] === u).length);
    });
    if (say) announce(live, text);
    updateSetInfo();
  };

  let typing = 0;
  form?.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    window.clearTimeout(typing);
    if (t instanceof HTMLInputElement && t.type === 'search') typing = window.setTimeout(() => applyFilters(true), 200);
  });
  form?.addEventListener('change', (e) => {
    if ((e.target as HTMLElement) instanceof HTMLInputElement && (e.target as HTMLInputElement).type === 'search') return;
    applyFilters(true);
  });
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilters(true);
  });
  clear?.addEventListener('click', () => {
    form?.reset();
    applyFilters(true);
    field('query')?.focus();
  });

  // Readers who chose the SL view see SL questions first; they can still change the filter.
  if (document.documentElement.getAttribute('data-level') === 'SL') {
    const lv = field('level');
    if (lv) lv.value = 'SL';
  }

  const side = q<HTMLElement>('[data-side]');
  const toggle = q<HTMLButtonElement>('[data-side-toggle]');
  toggle?.addEventListener('click', () => {
    const open = !side?.classList.contains('is-open');
    side?.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Hide filters and search' : 'Show filters and search';
  });

  /* ---------- Ratings and progress ---------- */

  const statusText = (id: string) => {
    const rec = state.items[id];
    if (!rec) return 'Not attempted yet.';
    const when = rec.last ? `, last on ${longDay(rec.last)}` : '';
    return `Attempted ${times(rec.attempts)}${when}. ${rec.rating ? `Rated ${RATING_LABELS[rec.rating].toLowerCase()}.` : 'Not rated.'}`;
  };

  const paintCard = (id: string) => {
    const el = cards.get(id);
    if (!el) return;
    const rec = state.items[id];
    el.querySelectorAll<HTMLInputElement>('[data-rate] input').forEach((r) => (r.checked = rec?.rating !== null && rec?.rating !== undefined && r.value === String(rec.rating)));
    const st = el.querySelector<HTMLElement>('[data-status]');
    if (st) st.textContent = statusText(id);
    el.classList.toggle('is-secure', statusOf(rec) === 'secure');
  };

  const paintRows = (table: HTMLElement | null, rows: ReturnType<typeof progressBy>) => {
    if (!table) return;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    table.querySelectorAll<HTMLElement>('tr[data-key]').forEach((tr) => {
      const r = byKey.get(tr.dataset.key ?? '');
      const a = r?.attempted ?? 0;
      const s = r?.secure ?? 0;
      const t = r?.total ?? 0;
      const cell = (sel: string, v: number) => {
        const c = tr.querySelector<HTMLElement>(sel);
        if (c) c.textContent = String(v);
      };
      cell('[data-attempted]', a);
      cell('[data-secure]', s);
      const ba = tr.querySelector<HTMLElement>('[data-bar-attempted]');
      const bs = tr.querySelector<HTMLElement>('[data-bar-secure]');
      if (ba) ba.style.width = `${t ? (a / t) * 100 : 0}%`;
      if (bs) bs.style.width = `${t ? (s / t) * 100 : 0}%`;
    });
  };

  const setsBody = q<HTMLElement>('[data-sets]');
  const paintSets = () => {
    const wrap = q<HTMLElement>('[data-sets-wrap]');
    const none = q<HTMLElement>('[data-sets-empty]');
    if (wrap) wrap.hidden = state.sets.length === 0;
    if (none) none.hidden = state.sets.length > 0;
    if (!setsBody) return;
    setsBody.replaceChildren(
      ...[...state.sets].reverse().map((s) => {
        const tr = document.createElement('tr');
        const pace = cfg.paces.find((p) => p.id === s.pace);
        const when = new Date(s.at);
        const cells = [
          Number.isNaN(when.getTime()) ? s.at : when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          pace?.label ?? s.pace,
          String(s.ids.length),
          String(s.marks),
          fmtDuration(s.used),
          fmtDuration(s.allowed),
          `${s.ratings.filter((r) => r === 3).length} of ${s.ids.length}`,
        ];
        cells.forEach((text, i) => {
          const c = document.createElement(i === 0 ? 'th' : 'td');
          if (i === 0) c.setAttribute('scope', 'row');
          if (i >= 2) c.className = 'n';
          c.textContent = text;
          tr.append(c);
        });
        return tr;
      }),
    );
  };

  const paintProgress = () => {
    const t = totals(cfg.items, state);
    const a = q<HTMLElement>('[data-mine-attempted]');
    const s = q<HTMLElement>('[data-mine-secure]');
    if (a) a.textContent = String(t.attempted);
    if (s) s.textContent = String(t.secure);
    paintRows(q('[data-progress="unit"]'), progressBy(cfg.items, state, 'unit'));
    paintRows(q('[data-progress="command"]'), progressBy(cfg.items, state, 'command'));
    paintSets();
  };

  cards.forEach((el, id) => {
    el.querySelector('[data-rate]')?.addEventListener('change', (e) => {
      const r = Number((e.target as HTMLInputElement).value) as Rating;
      if (r !== 1 && r !== 2 && r !== 3) return;
      state = rate(state, id, r, today());
      save();
      paintCard(id);
      paintProgress();
      announce(live, `${byId.get(id)?.title ?? 'Question'}: rated ${RATING_LABELS[r].toLowerCase()}. ${statusText(id).split('.')[0]}.`);
    });
    paintCard(id);
  });

  /* ---------- Timed sets ---------- */

  const paceSel = q<HTMLSelectElement>('[data-set-pace]');
  const nSel = q<HTMLSelectElement>('[data-set-n]');
  const general = q<HTMLInputElement>('[data-set-general]');
  const startBtn = q<HTMLButtonElement>('[data-set-start]');
  const info = q<HTMLElement>('[data-set-info]');
  const run = q<HTMLElement>('[data-run]');
  const clock = q<HTMLElement>('[data-clock]');
  const runState = q<HTMLElement>('[data-run-state]');
  const runInfo = q<HTMLElement>('[data-run-info]');
  const pauseBtn = q<HTMLButtonElement>('[data-run-pause]');
  const review = q<HTMLElement>('[data-review]');
  const reviewLine = q<HTMLElement>('[data-review-line]');

  const pace = (): Pace | undefined => cfg.paces.find((p) => p.id === paceSel?.value) ?? cfg.paces[0];
  const pool = (): Facets[] => {
    const p = pace();
    return p ? visible.filter((f) => inPace(f, p, Boolean(general?.checked))) : [];
  };

  function updateSetInfo() {
    const p = pace();
    if (!p || !info || !startBtn) return;
    const list = pool();
    const n = Math.min(Number(nSel?.value ?? 3), list.length);
    startBtn.disabled = list.length === 0;
    if (!list.length) {
      info.textContent = `None of the questions your filters show is in the style of ${p.label}${p.slOnly ? ' at SL' : ''}. Change the filters or the pace.`;
      return;
    }
    const avg = list.reduce((s, f) => s + f.marks, 0) / list.length;
    info.textContent = `${plural(list.length, 'question', 'questions')} can be drawn at this pace. A set of ${n} takes about ${fmtDuration(setSeconds(Math.round(avg * n), p))}, at ${fmtPace(p)}.`;
  }
  paceSel?.addEventListener('change', updateSetInfo);
  nSel?.addEventListener('change', updateSetInfo);
  general?.addEventListener('change', updateSetInfo);

  interface Running {
    set: Facets[];
    pace: Pace;
    allowed: number;
    /** Milliseconds counted before the latest resume. */
    banked: number;
    /** When the clock last resumed, or null while paused. */
    since: number | null;
    said: Set<string>;
    timer: number;
    used: number;
  }
  let running: Running | null = null;

  const elapsed = (r: Running) => (r.banked + (r.since === null ? 0 : performance.now() - r.since)) / 1000;

  const tick = () => {
    const r = running;
    if (!r || !clock) return;
    const left = r.allowed - elapsed(r);
    const over = left < 0;
    clock.textContent = over ? `+${fmtClock(-left)}` : fmtClock(left);
    if (runState) runState.textContent = r.since === null ? 'Paused' : over ? 'Over time' : 'Time left';
    run?.classList.toggle('is-low', !over && left <= Math.min(300, r.allowed / 4));
    const say = (key: string, text: string) => {
      if (r.said.has(key)) return;
      r.said.add(key);
      announce(live, text);
    };
    if (r.allowed >= 600 && left <= r.allowed / 2 && left > 300) say('half', `Half the time is left: ${fmtDuration(left)}.`);
    if (r.allowed > 600 && left <= 300 && left > 60) say('five', 'Five minutes left.');
    if (left <= 60 && left > 0) say('one', 'One minute left.');
    if (over) say('over', 'Time is up. Finish when you are ready; the clock now counts the time over.');
  };

  const enterSet = (set: Facets[], p: Pace) => {
    const ids = new Set(set.map((f) => f.id));
    root.classList.add('is-set', 'is-running');
    cards.forEach((el, id) => {
      const inSet = ids.has(id);
      el.classList.toggle('is-in-set', inSet);
      el.hidden = !inSet;
      el.querySelectorAll('details').forEach((d) => (d.open = false));
    });
    groups.forEach((g) => {
      const n = [...g.querySelectorAll<HTMLElement>('[data-bq]')].filter((el) => ids.has(el.dataset.bq ?? '')).length;
      g.classList.toggle('has-set', n > 0);
      g.hidden = n === 0;
      const c = g.querySelector<HTMLElement>('[data-group-count]');
      if (c) c.textContent = `${n} in this set`;
    });
    const marks = set.reduce((s, f) => s + f.marks, 0);
    const allowed = setSeconds(marks, p);
    running = { set, pace: p, allowed, banked: 0, since: performance.now(), said: new Set(), timer: 0, used: 0 };
    if (run) run.hidden = false;
    if (review) review.hidden = true;
    if (runInfo) runInfo.textContent = `${plural(set.length, 'question', 'questions')}, ${marks} marks, at the ${p.label} pace of ${fmtPace(p)}: ${fmtDuration(allowed)} allowed.`;
    if (pauseBtn) pauseBtn.textContent = 'Pause';
    tick();
    running.timer = window.setInterval(tick, 250);
    run?.scrollIntoView({ block: 'start' });
    pauseBtn?.focus();
    announce(live, `Timed set started: ${plural(set.length, 'question', 'questions')}, ${fmtDuration(allowed)} allowed.`);
  };

  const leaveSet = () => {
    if (running) window.clearInterval(running.timer);
    running = null;
    root.classList.remove('is-set', 'is-running');
    cards.forEach((el) => {
      el.classList.remove('is-in-set');
      const draft = el.querySelector<HTMLTextAreaElement>('[data-draft]');
      if (draft) draft.value = '';
    });
    groups.forEach((g) => g.classList.remove('has-set'));
    if (run) run.hidden = true;
    if (review) review.hidden = true;
    run?.classList.remove('is-low');
    applyFilters();
    q<HTMLElement>('#bank-h')?.scrollIntoView({ block: 'start' });
    startBtn?.focus();
  };

  startBtn?.addEventListener('click', () => {
    const p = pace();
    if (!p) return;
    const n = Number(nSel?.value ?? 3);
    const set = drawSet(pool(), n, Math.floor(Math.random() * 2 ** 32), state);
    if (!set.length) return;
    enterSet(set, p);
  });

  pauseBtn?.addEventListener('click', () => {
    const r = running;
    if (!r) return;
    if (r.since === null) {
      r.since = performance.now();
      pauseBtn.textContent = 'Pause';
      announce(live, 'Clock running.');
    } else {
      r.banked += performance.now() - r.since;
      r.since = null;
      pauseBtn.textContent = 'Resume';
      announce(live, 'Clock paused.');
    }
    tick();
  });

  q<HTMLButtonElement>('[data-run-finish]')?.addEventListener('click', () => {
    const r = running;
    if (!r) return;
    r.used = Math.round(elapsed(r));
    window.clearInterval(r.timer);
    r.since = null;
    root.classList.remove('is-running');
    if (run) run.hidden = true;
    if (review) review.hidden = false;
    const marks = r.set.reduce((s, f) => s + f.marks, 0);
    const over = r.used - r.allowed;
    if (reviewLine)
      reviewLine.textContent = `${plural(r.set.length, 'question', 'questions')}, ${marks} marks: you used ${fmtDuration(r.used)} of the ${fmtDuration(r.allowed)} allowed${over > 0 ? `, ${fmtDuration(over)} over` : ''}.`;
    review?.focus();
  });

  q<HTMLButtonElement>('[data-run-quit]')?.addEventListener('click', () => {
    leaveSet();
    announce(live, 'Set abandoned. Nothing was saved.');
  });

  q<HTMLButtonElement>('[data-review-save]')?.addEventListener('click', () => {
    const r = running;
    if (!r) return;
    const day = today();
    const ratings = r.set.map((f) => {
      const rec = state.items[f.id];
      return rec && rec.last === day ? rec.rating : null;
    });
    const record: SetRecord = { at: new Date().toISOString(), pace: r.pace.id, ids: r.set.map((f) => f.id), marks: r.set.reduce((s, f) => s + f.marks, 0), allowed: r.allowed, used: r.used, ratings };
    state = recordSet(state, record, day);
    save();
    paintProgress();
    leaveSet();
    announce(live, `Set saved: ${ratings.filter((x) => x === 3).length} of ${r.set.length} rated secure.`);
  });

  q<HTMLButtonElement>('[data-review-back]')?.addEventListener('click', () => {
    leaveSet();
    announce(live, 'Back to the bank. Your ratings are saved; the set itself was not recorded.');
  });

  /* ---------- Export and reset ---------- */

  root.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((b) =>
    b.addEventListener('click', () => {
      const day = today();
      if (b.dataset.export === 'csv') {
        download(`business-brief-question-bank-${day}.csv`, bankCsv(cfg.items, state, (id) => cfg.terms[id] ?? id), 'text/csv;charset=utf-8');
        announce(live, `Downloaded your progress on ${plural(Object.keys(state.items).length, 'question', 'questions')} as CSV.`);
      } else {
        const titles = Object.fromEntries(Object.keys(state.items).map((id) => [id, byId.get(id)?.title ?? id]));
        download(`business-brief-question-bank-${day}.json`, JSON.stringify({ exported: new Date().toISOString(), key: 'bb:bank', state, titles }, null, 2), 'application/json');
        announce(live, 'Downloaded a backup of your progress as JSON.');
      }
    }),
  );

  const reset = q<HTMLButtonElement>('[data-reset]');
  const confirm = q<HTMLElement>('[data-reset-confirm]');
  reset?.addEventListener('click', () => {
    if (confirm) confirm.hidden = false;
    reset.hidden = true;
    q<HTMLButtonElement>('[data-reset-no]')?.focus();
  });
  const closeConfirm = () => {
    if (confirm) confirm.hidden = true;
    if (reset) {
      reset.hidden = false;
      reset.focus();
    }
  };
  q<HTMLButtonElement>('[data-reset-no]')?.addEventListener('click', closeConfirm);
  q<HTMLButtonElement>('[data-reset-yes]')?.addEventListener('click', () => {
    state = emptyState();
    store.remove(KEY);
    cards.forEach((_, id) => paintCard(id));
    paintProgress();
    applyFilters();
    closeConfirm();
    announce(live, 'Your progress in the question bank was deleted from this device.');
  });

  if (form) {
    // Start from a clean form: browsers can restore old values on back navigation.
    const level = field('level')?.value ?? '';
    form.reset();
    const lv = field('level');
    if (lv) lv.value = level;
  }
  applyFilters();
  paintProgress();
});
