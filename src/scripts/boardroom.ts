/**
 * The Boardroom in the browser. The page already holds the casebook, the seat
 * picker and the first dashboard; this script runs the same engine and the
 * same renderers as the server to play the scenario: take a seat, decide each
 * round, watch the dashboard and the consequences, meet the events, write the
 * memo, open the debrief. Progress is kept on this device only, under
 * bb:boardroom:<id>, and the page works for the visit if storage is blocked.
 */
import type { KpiId } from '../lib/boardroom/engine';
import { fmtKpi, KPI_DEFS } from '../lib/boardroom/kpis';
import { fillTokens, type NarrateContext } from '../lib/boardroom/narrate';
import {
  consequenceHtml,
  eventHtml,
  figuresTable,
  givenHtml,
  involvesHtml,
  kpiTiles,
  memoHtml,
  memoText,
  pathsTableHtml,
  perspectivesHtml,
  rangeTableHtml,
  ROLE_LEAD_LABEL,
  scorecardHtml,
  type MemoInput,
  type NamedPath,
} from '../lib/boardroom/render';
import { runPath, scorecard, type PathSummary, type Run, type ScenarioCore } from '../lib/boardroom/scenario';
import { ROLE_IDS, ROLE_IN_TEXT, ROLE_TITLES, type RoleId } from '../lib/boardroom/roles';
import { esc, inline, rich } from '../lib/markup';
import { announce, each, readConfig, store } from './ix';

interface Summary {
  picks: string[];
  cumProfit: number;
  goals: Record<RoleId, number>;
  final: Record<string, number>;
}

interface Config {
  id: string;
  company: string;
  question: string;
  units: { singular: string; plural: string };
  core: ScenarioCore;
  dashboard: KpiId[];
  memo: { intro: string; fields: Array<{ id: string; label: string; hint: string; rows: number }> };
  ctx: NarrateContext;
  env: { count: number; allGoals: Record<RoleId, number>; everyone: number; summaries: Summary[] };
  named: Array<{ label: string; picks: string[] }>;
  finalKpis: KpiId[];
}

interface Saved {
  role?: RoleId;
  picks: string[];
  notes: Record<string, string>;
  memo: Record<string, string>;
  /** How many round results the learner has moved on from. */
  ack: number;
}

const isRole = (r: unknown): r is RoleId => typeof r === 'string' && (ROLE_IDS as readonly string[]).includes(r);

each('[data-ix="boardroom"]', (root) => {
  const cfg = readConfig<Config>(root);
  const sc = cfg.core;
  const ctx = cfg.ctx;
  const R = sc.rounds.length;
  const key = `boardroom:${cfg.id}`;

  /* Restore what this browser kept, dropping anything that no longer fits the scenario. */
  const raw = store.get<Partial<Saved>>(key, {});
  const picks: string[] = [];
  for (const [i, p] of (Array.isArray(raw.picks) ? raw.picks : []).entries()) {
    if (sc.rounds[i]?.options.some((o) => o.id === p)) picks.push(p);
    else break;
  }
  const state: Saved = {
    role: isRole(raw.role) ? raw.role : undefined,
    picks,
    notes: typeof raw.notes === 'object' && raw.notes ? { ...raw.notes } : {},
    memo: typeof raw.memo === 'object' && raw.memo ? { ...raw.memo } : {},
    ack: Math.min(typeof raw.ack === 'number' ? raw.ack : 0, picks.length),
  };

  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const status = q('[data-status]');
  const seats = q('[data-seats]');
  const play = q('[data-play]');
  const tiles = q('[data-board-tiles]');
  const table = q('[data-board-table]');
  const when = q('[data-board-when]');
  const seat = q('[data-board-seat]');
  const rail = q('[data-rail]');
  const minutesWrap = q('[data-minutes-wrap]');
  const minutes = q('[data-minutes]');
  const stage = q('[data-stage]');
  const locked = q('[data-debrief-locked]');
  const body = q('[data-debrief-body]');
  const yours = q('[data-yours]');

  let run: Run = runPath(sc, state.picks);
  const save = () => store.set(key, state);
  const periods = () => [...run.history, ...run.rounds.map((r) => r.result)];
  const start = () => run.history[run.history.length - 1];
  const prevOf = (k: number) => (k === 0 ? start() : run.rounds[k - 1]?.result);
  const summaryOf = (p: string[]): Summary | undefined => cfg.env.summaries.find((s) => s.picks.join('>') === p.join('>'));
  const fmt = (id: KpiId, v: number | undefined) => (typeof v === 'number' ? fmtKpi(id, v, ctx) : '');

  /* ---------------- Rendering ---------------- */

  /** The scenario's core measures, then the seat's own measures that are not already among them. */
  const boardIds = (role: RoleId): KpiId[] => [...cfg.dashboard, ...(sc.roles[role].pinned as KpiId[]).filter((k) => !cfg.dashboard.includes(k))];

  const renderBoard = (role: RoleId) => {
    const ps = periods();
    const ids = boardIds(role);
    if (tiles) tiles.innerHTML = kpiTiles(ps, ids, sc.roles[role].pinned as KpiId[], ctx, `bbd-${cfg.id}`, run.history.length);
    if (table) table.innerHTML = figuresTable(ps, ids, ctx, 'Dashboard figures by period', run.history.length);
    const last = ps[ps.length - 1];
    if (when) when.textContent = run.rounds.length ? `after ${last?.label ?? ''}` : `end of ${last?.label ?? ''}, before the first decision`;
    if (seat) seat.textContent = `Your seat: ${ROLE_TITLES[role]}. Your measures are marked.`;
  };

  const renderRail = () => {
    if (!rail) return;
    const decided = state.picks.length;
    const viewingResult = decided > state.ack;
    const items: string[] = [];
    sc.rounds.forEach((r, i) => {
      const done = i < decided && !(viewingResult && i === decided - 1);
      const current = viewingResult ? i === decided - 1 : i === decided;
      items.push(
        `<li class="bb-rail__step${done ? ' is-done' : ''}"${current ? ' aria-current="step"' : ''}><span class="bb-rail__no">${i + 1}</span><span class="bb-rail__name">${esc(r.title)}</span><span class="bb-rail__state">${
          done ? 'Decided' : current ? (viewingResult ? 'Decided: the consequences' : 'Now') : 'To come'
        }</span></li>`,
      );
    });
    const memoCurrent = decided === R && state.ack >= R;
    items.push(`<li class="bb-rail__step${memoCurrent ? '' : ''}"${memoCurrent ? ' aria-current="step"' : ''}><span class="bb-rail__no">${R + 1}</span><span class="bb-rail__name">Memo and debrief</span><span class="bb-rail__state">${memoCurrent ? 'Now' : 'To come'}</span></li>`);
    rail.innerHTML = items.join('');
  };

  const renderMinutes = () => {
    if (!minutes || !minutesWrap) return;
    const shown = run.rounds.slice(0, Math.min(state.ack, run.rounds.length));
    minutesWrap.hidden = shown.length === 0;
    minutes.innerHTML = shown
      .map((rr, k) => {
        const prev = prevOf(k);
        if (!prev) return '';
        return `<details class="bb-minute"><summary><span class="bb-minute__no">Round ${k + 1} · ${esc(rr.round.period)}</span> <span class="bb-minute__choice">${esc(rr.option.label)}</span> <span class="bb-minute__head">${esc(rr.option.outcome.headline)}</span></summary><div class="bb-minute__body">${consequenceHtml(rr, prev, k, R, ctx, { level: 4, id: `bb-min-${k}` })}${
          rr.event ? eventHtml(rr.event, rr.result, prev, ctx, { level: 4, id: `bb-min-${k}-e` }) : ''
        }</div></details>`;
      })
      .join('');
  };

  const roundHtml = (k: number, role: RoleId): string => {
    const round = sc.rounds[k];
    if (!round) return '';
    const note = state.notes[round.id] ?? '';
    // The first round's words may quote the figures before it; later rounds' do not, because those depend on the path.
    const before = start();
    const fill = (t: string) => (k === 0 && before ? fillTokens(t, before.kpis, run.history[run.history.length - 2]?.kpis, ctx) : t);
    return `<section class="bb-round" aria-labelledby="bb-round-h">
<p class="bb-round__kicker">Round ${k + 1} of ${R} · ${esc(round.period)} · A decision for ${esc(ROLE_LEAD_LABEL[round.lead])}${round.lead === role ? ', your desk' : ''}</p>
<h3 class="bb-round__title" id="bb-round-h" tabindex="-1">${esc(round.title)}</h3>
<div class="prose bb-round__situation">${rich(fill(round.situation))}</div>
${round.given ? `<div class="bb-given"><p class="bb-given__label">Already agreed: ${inline(round.given.note)}</p>${givenHtml(round.given.effects, ctx)}</div>` : ''}
<h4 class="label label--ink">Around the table</h4>
${perspectivesHtml(round, 5, role, fill)}
<fieldset class="bb-options" aria-describedby="bb-commit-msg">
<legend class="bb-question">${esc(round.question)}</legend>
${round.options
  .map(
    (o) => `<div class="bb-option">
<input type="radio" name="bb-${esc(cfg.id)}-opt" id="bb-opt-${esc(o.id)}" value="${esc(o.id)}" aria-describedby="bb-inv-${esc(o.id)}">
<label for="bb-opt-${esc(o.id)}"><span class="bb-option__name">${esc(o.label)}</span><span class="bb-option__summary">${inline(o.summary)}</span></label>
<div class="bb-option__involves"><p class="bb-involves__label">What it involves</p>${involvesHtml(o, ctx, `bb-inv-${o.id}`) || `<p class="small" id="bb-inv-${esc(o.id)}">No change to the figures.</p>`}</div>
</div>`,
  )
  .join('')}
</fieldset>
<div class="field bb-why"><label for="bb-why">Your reasoning, in a sentence or two</label><span class="field__hint" id="bb-why-hint">Optional. It goes into your board memo, and stays on this device.</span><textarea class="textarea" id="bb-why" rows="3" data-note="${esc(round.id)}" aria-describedby="bb-why-hint">${esc(note)}</textarea></div>
<div class="bb-actions"><button type="button" class="btn btn--primary" data-act="commit">Commit the board's decision</button><span class="field__error" id="bb-commit-msg" data-commit-msg></span></div>
</section>`;
  };

  const resultHtml = (k: number): string => {
    const rr = run.rounds[k];
    const prev = prevOf(k);
    if (!rr || !prev) return '';
    const note = state.notes[rr.round.id]?.trim();
    const last = k === R - 1;
    return `<div class="bb-resultwrap">
${consequenceHtml(rr, prev, k, R, ctx, { level: 3, id: 'bb-res', focusable: true })}
${note ? `<p class="bb-yournote"><span class="bb-yournote__label">Your reasoning</span> ${esc(note)}</p>` : ''}
${rr.event ? eventHtml(rr.event, rr.result, prev, ctx, { level: 3, id: 'bb-evt' }) : ''}
<div class="bb-actions"><button type="button" class="btn btn--primary" data-act="continue">${last ? 'Write the board memo' : `Go to round ${k + 2}`}</button><button type="button" class="btn btn--small" data-act="undo">Undo this decision</button></div>
</div>`;
  };

  const memoInput = (role: RoleId): MemoInput => {
    const ps = periods();
    const first = start();
    const last = ps[ps.length - 1];
    return {
      company: `${cfg.company} (fictional)`,
      role,
      question: cfg.question,
      date: `End of ${last?.label ?? ''}`,
      fields: cfg.memo.fields.map((f) => ({ label: f.label, text: state.memo[f.id] ?? '' })),
      decisions: run.rounds.map((rr) => {
        const note = state.notes[rr.round.id]?.trim();
        return { period: rr.round.period, label: `${rr.option.label}${note ? `. Reasoning at the time: ${note}` : ''}` };
      }),
      results: boardIds(role).map((id) => ({ label: KPI_DEFS[id].label, before: fmt(id, first?.kpis[id]), after: fmt(id, last?.kpis[id]) })),
    };
  };

  const memoFormHtml = (role: RoleId): string => `<section class="bb-memoform" aria-labelledby="bb-memoform-h">
<h3 class="bb-memoform__title" id="bb-memoform-h" tabindex="-1">The board memo</h3>
<div class="prose">${rich(cfg.memo.intro)}</div>
<div class="bb-memoform__grid">
<div class="bb-memoform__fields">${cfg.memo.fields
    .map(
      (f) =>
        `<div class="field"><label for="bb-m-${esc(f.id)}">${esc(f.label)}</label><span class="field__hint" id="bb-m-${esc(f.id)}-hint">${esc(f.hint)}</span><textarea class="textarea" id="bb-m-${esc(f.id)}" rows="${f.rows}" data-memo="${esc(f.id)}" aria-describedby="bb-m-${esc(f.id)}-hint">${esc(state.memo[f.id] ?? '')}</textarea></div>`,
    )
    .join('')}</div>
<div class="bb-memoform__preview" data-memo-preview>${memoHtml(memoInput(role), 4)}</div>
</div>
<div class="bb-actions bb-actions--wrap">
<button type="button" class="btn btn--primary" data-act="to-debrief">Open the debrief</button>
<button type="button" class="btn btn--small" data-act="print-memo">Print the memo</button>
<button type="button" class="btn btn--small" data-act="copy-memo">Copy the memo as text</button>
<button type="button" class="btn btn--small" data-act="download-memo">Download the memo (.txt)</button>
<button type="button" class="btn btn--small" data-act="download-csv">Download the figures (.csv)</button>
<button type="button" class="btn btn--small" data-act="undo">Undo the last decision</button>
</div>
</section>`;

  const renderStage = (role: RoleId) => {
    if (!stage) return;
    const decided = state.picks.length;
    if (decided > state.ack) stage.innerHTML = resultHtml(decided - 1);
    else if (decided < R) stage.innerHTML = roundHtml(decided, role);
    else stage.innerHTML = memoFormHtml(role);
  };

  const yoursHtml = (role: RoleId): string => {
    const mine = summaryOf(state.picks);
    const first = start();
    if (!mine || !first) return '';
    const asPath = (s: Summary) => s as unknown as PathSummary;
    const named: NamedPath[] = [{ label: 'Your path', picks: state.picks, summary: asPath(mine), yours: true }];
    for (const n of cfg.named) {
      const s = summaryOf(n.picks);
      if (s) named.push({ label: n.label, picks: n.picks, summary: asPath(s) });
    }
    const cards = [role, ...ROLE_IDS.filter((r) => r !== role)].map((r) => scorecardHtml(r, scorecard(sc, run, r), ctx, 5, r === role)).join('');
    return `<section class="bb-yours__inner" aria-labelledby="bb-yours-h">
<h3 class="bb-debrief__h" id="bb-yours-h">Your board's ${sc.model.period.unit === 'quarter' ? 'year' : 'four years'}</h3>
<ol class="bb-yours__path">${run.rounds
      .map((rr) => `<li><span class="bb-yours__when">${esc(rr.round.period)}</span> ${esc(rr.option.label)}${rr.event ? ` <span class="bb-yours__event">Then: ${esc(rr.event.title)}</span>` : ''}</li>`)
      .join('')}</ol>
<h4 class="label label--ink">How each director's goals came out</h4>
<div class="bb-scores">${cards}</div>
<h4 class="label label--ink">Where your board finished among all ${cfg.env.count} possible boards</h4>
${rangeTableHtml(cfg.dashboard, first, cfg.env.summaries as unknown as PathSummary[], ctx, 'Your final figures against every path', asPath(mine))}
<h4 class="label label--ink">Your path beside the named paths</h4>
${pathsTableHtml(named, sc.rounds, sc.roles, ctx, 'Your path and the named paths')}
</section>`;
  };

  const renderDebrief = () => {
    const complete = state.picks.length === R && Boolean(state.role);
    if (locked) locked.hidden = complete;
    if (body) body.hidden = !complete;
    if (yours) yours.innerHTML = complete && state.role ? yoursHtml(state.role) : '';
  };

  const focusLater = (sel?: string) => {
    if (!sel) return;
    window.requestAnimationFrame(() => root.querySelector<HTMLElement>(sel)?.focus());
  };

  const render = (focus?: string) => {
    if (seats) seats.hidden = Boolean(state.role);
    if (play) play.hidden = !state.role;
    const role = state.role;
    if (role) {
      renderBoard(role);
      renderRail();
      renderMinutes();
      renderStage(role);
    } else if (state.picks.length) {
      // A seat is being changed: keep the earlier choice selected.
      root.querySelectorAll<HTMLInputElement>('[data-seats] input[type="radio"]').forEach((r) => (r.checked = false));
    }
    renderDebrief();
    save();
    focusLater(focus);
  };

  /* ---------------- Exports ---------------- */

  const download = (name: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const csv = (): string => {
    const ps = periods();
    const ids = Array.from(new Set([...cfg.finalKpis, ...(state.role ? boardIds(state.role) : [])]));
    const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = [
      [`${cfg.company} (fictional company; simulated figures)`].map(cell).join(','),
      ['Period', ...ids.map((id) => KPI_DEFS[id].label)].map(cell).join(','),
      ...ps.map((p) => [p.label, ...ids.map((id) => String(Math.round(p.kpis[id] * 100) / 100))].map(cell).join(',')),
    ];
    return lines.join('\n');
  };

  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  /* ---------------- Behaviour ---------------- */

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (!btn || !root.contains(btn)) return;
    const act = btn.dataset.act;
    const role = state.role;

    if (act === 'seat') {
      const picked = root.querySelector<HTMLInputElement>('[data-seats] input[type="radio"]:checked');
      const msg = q('[data-seat-msg]');
      if (!picked || !isRole(picked.value)) {
        if (msg) msg.textContent = 'Choose a seat first.';
        announce(status, 'Choose a seat first.');
        return;
      }
      if (msg) msg.textContent = '';
      state.role = picked.value;
      render(state.picks.length > state.ack ? '#bb-res-h' : state.picks.length < R ? '#bb-round-h' : '#bb-memoform-h');
      announce(status, `You are the ${ROLE_IN_TEXT[picked.value]}. ${state.picks.length < R ? `Round ${state.picks.length + 1} is open.` : 'The memo is open.'}`);
      return;
    }
    if (!role) return;

    if (act === 'commit') {
      const k = state.picks.length;
      const round = sc.rounds[k];
      const picked = root.querySelector<HTMLInputElement>('[data-stage] input[type="radio"]:checked');
      const msg = q('[data-commit-msg]');
      if (!round || !picked) {
        if (msg) msg.textContent = 'Choose one of the three options first.';
        announce(status, 'Choose one of the three options first.');
        return;
      }
      state.picks.push(picked.value);
      run = runPath(sc, state.picks);
      render('#bb-res-h');
      const rr = run.rounds[k];
      const r = rr?.result.kpis;
      announce(status, `Decision taken: ${rr?.option.label ?? ''}. ${rr?.option.outcome.headline ?? ''}. Operating profit ${fmt('pbit', r?.pbit)}, net cash ${fmt('netCash', r?.netCash)}, morale ${fmt('morale', r?.morale)}.`);
    } else if (act === 'continue') {
      state.ack = state.picks.length;
      render(state.picks.length < R ? '#bb-round-h' : '#bb-memoform-h');
      announce(status, state.picks.length < R ? `Round ${state.picks.length + 1} is open.` : 'The board memo is open, and the debrief below is unlocked.');
    } else if (act === 'undo') {
      state.picks.pop();
      state.ack = Math.min(state.ack, state.picks.length);
      run = runPath(sc, state.picks);
      render('#bb-round-h');
      announce(status, 'Decision undone. Choose again.');
    } else if (act === 'restart') {
      state.picks = [];
      state.notes = {};
      state.memo = {};
      state.ack = 0;
      run = runPath(sc, state.picks);
      render('#bb-round-h');
      announce(status, 'Started again from the first round. Your seat is unchanged.');
    } else if (act === 'change-role') {
      state.role = undefined;
      render('[data-seats] h3');
      announce(status, 'Choose a seat. Your decisions so far are kept.');
    } else if (act === 'to-debrief') {
      const deb = document.getElementById('debrief');
      deb?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      deb?.focus({ preventScroll: true });
    } else if (act === 'print-memo') {
      document.body.dataset.print = 'memo';
      const clear = () => {
        delete document.body.dataset.print;
        window.removeEventListener('afterprint', clear);
      };
      window.addEventListener('afterprint', clear);
      window.print();
      window.setTimeout(clear, 1500);
    } else if (act === 'copy-memo') {
      void copyText(memoText(memoInput(role))).then((ok) => announce(status, ok ? 'The memo has been copied as text.' : 'Copying is not available in this browser. Use the download instead.'));
    } else if (act === 'download-memo') {
      download(`${cfg.id}-board-memo.txt`, memoText(memoInput(role)), 'text/plain;charset=utf-8');
      announce(status, 'The memo has been downloaded as a text file.');
    } else if (act === 'download-csv') {
      download(`${cfg.id}-figures.csv`, csv(), 'text/csv;charset=utf-8');
      announce(status, 'The figures have been downloaded as a CSV file.');
    }
  });

  let previewTimer = 0;
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLTextAreaElement;
    if (t.dataset.note) {
      state.notes[t.dataset.note] = t.value;
      save();
    } else if (t.dataset.memo) {
      state.memo[t.dataset.memo] = t.value;
      save();
      window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(() => {
        const preview = q('[data-memo-preview]');
        if (preview && state.role) preview.innerHTML = memoHtml(memoInput(state.role), 4);
      }, 150);
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type === 'radio' && t.name.endsWith('-role')) {
      const msg = q('[data-seat-msg]');
      if (msg) msg.textContent = '';
    }
    if (t.type === 'radio' && t.name.endsWith('-opt')) {
      const msg = q('[data-commit-msg]');
      if (msg) msg.textContent = '';
    }
  });

  if (state.role) root.querySelector<HTMLInputElement>(`[data-seats] input[value="${state.role}"]`)?.setAttribute('checked', '');
  render();
});
