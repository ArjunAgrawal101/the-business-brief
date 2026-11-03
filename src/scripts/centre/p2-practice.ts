/**
 * Paper 2 calculation practice in the browser: new questions from the seeded
 * generator, checking within the stated tolerance, the working and typical
 * errors, a timed set at Paper 2's pace, and the record in bb:p2-practice.
 * The rules live in src/lib/p2-practice.ts and the markup in
 * src/lib/p2-render.ts; this file wires them to the page.
 */
import { announce, each, escapeHtml, readConfig, store } from '../ix';
import {
  GROUPS,
  KINDS,
  check,
  drawSet,
  emptyP2,
  generate,
  kindsFor,
  nextPick,
  parseCode,
  parseP2,
  recordAttempt,
  recordTimed,
  score,
  type GroupId,
  type P2State,
  type PracticeQuestion,
  type TimedRecord,
  type Verdict,
} from '../../lib/p2-practice';
import { feedbackHtml, fmtValue, questionHtml, workingHtml } from '../../lib/p2-render';
import { fmtClock, fmtDuration, fmtPace, setSeconds, type Pace } from '../../lib/bank';
import { rng } from '../../lib/random';

interface Config {
  paces: Pace[];
  first: string;
  kinds: Record<string, { name: string; group: GroupId; level: string; marks: number }>;
}

const KEY = 'p2-practice';
const PREFS = 'p2-prefs';
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const VERDICT_WORDS: Record<Verdict | 'blank', string> = { right: 'Right', close: 'Nearly', wrong: 'Not yet', invalid: 'Not a number', blank: 'Not answered' };

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

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

each('[data-ix="p2-practice"]', (root) => {
  const cfg = readConfig<Config>(root);
  const live = root.querySelector<HTMLElement>('[data-live]');
  const q = <T extends HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<T>(sel);
  const page = root.closest('main') ?? document;

  let state: P2State = parseP2(store.get<unknown>(KEY, null));
  const save = () => store.set(KEY, state);
  const seedNow = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const pick = rng(seedNow());

  /* ---------- Settings ---------- */

  const controls = q<HTMLFormElement>('[data-controls]');
  const radios = (name: string) => [...(controls?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`) ?? [])];
  const level = (): 'SL' | 'HL' => (radios('level').find((r) => r.checked)?.value === 'SL' ? 'SL' : 'HL');
  const mode = (): 'practice' | 'timed' => (radios('mode').find((r) => r.checked)?.value === 'timed' ? 'timed' : 'practice');
  const topics = (): GroupId[] => radios('topic').filter((r) => r.checked && !r.disabled).map((r) => r.value as GroupId);
  const kinds = () => kindsFor(topics(), level());

  const prefs = store.get<{ level?: string; topics?: string[] }>(PREFS, {});
  if (prefs.level === 'SL' || (prefs.level === undefined && document.documentElement.getAttribute('data-level') === 'SL')) radios('level').forEach((r) => (r.checked = r.value === 'SL'));
  if (Array.isArray(prefs.topics) && prefs.topics.length) radios('topic').forEach((r) => (r.checked = prefs.topics?.includes(r.value) ?? true));

  const practiceBar = q<HTMLElement>('[data-practice-bar]');
  const timedBar = q<HTMLElement>('[data-timed-bar]');
  const newBtn = q<HTMLButtonElement>('[data-new]');
  const startBtn = q<HTMLButtonElement>('[data-start]');
  const card = q<HTMLElement>('[data-question]');
  const setBox = q<HTMLElement>('[data-set]');

  const syncSettings = () => {
    const sl = level() === 'SL';
    radios('topic').forEach((r) => {
      const hlOnly = GROUPS[r.value as GroupId]?.level === 'HL';
      r.disabled = sl && hlOnly;
    });
    const none = kinds().length === 0;
    if (newBtn) newBtn.disabled = none;
    if (startBtn) startBtn.disabled = none;
    const info = q<HTMLElement>('[data-session]');
    if (none && info) info.textContent = 'Choose at least one topic available at your level.';
    const timed = mode() === 'timed';
    if (practiceBar) practiceBar.hidden = timed;
    if (timedBar) timedBar.hidden = !timed;
    if (card) card.hidden = timed || running !== null;
    store.set(PREFS, { level: level(), topics: radios('topic').filter((r) => r.checked).map((r) => r.value) });
  };

  /* ---------- One question at a time ---------- */

  let current: PracticeQuestion = generate(parseCode(cfg.first)?.kind ?? 'break-even-quantity', parseCode(cfg.first)?.seed ?? 24680);
  let recorded = false;
  let revealed = false;
  const session = { checked: 0, right: 0 };
  const input = q<HTMLInputElement>('#pp-answer');
  const feedback = q<HTMLElement>('[data-feedback]');
  const work = q<HTMLDetailsElement>('[data-work]');

  const show = (qq: PracticeQuestion, focus = false) => {
    current = qq;
    recorded = false;
    revealed = false;
    const set = (sel: string, text: string) => {
      const el = q<HTMLElement>(sel);
      if (el) el.textContent = text;
    };
    set('[data-q-group]', GROUPS[qq.group].label);
    set('[data-q-code]', `Question code ${qq.code}`);
    set('[data-q-name]', qq.name);
    set('[data-q-biz]', qq.business);
    set('[data-prefix]', qq.prefix);
    set('[data-suffix]', qq.suffix);
    set('[data-hint]', `For example ${qq.example}. ${qq.toleranceText}`);
    const hl = q<HTMLElement>('[data-q-hl]');
    if (hl) hl.hidden = qq.level !== 'HL';
    const body = q<HTMLElement>('[data-q-body]');
    if (body) body.innerHTML = questionHtml(qq, 'pp-q');
    const wb = q<HTMLElement>('[data-work-body]');
    if (wb) wb.innerHTML = workingHtml(qq);
    if (work) work.open = false;
    if (feedback) feedback.innerHTML = '';
    if (input) {
      input.value = '';
      input.removeAttribute('aria-invalid');
      if (focus) input.focus();
    }
    try {
      history.replaceState(null, '', `#${qq.code}`);
    } catch {
      /* the address cannot change here; the code is still on screen */
    }
  };

  const newQuestion = () => {
    const ks = kinds();
    if (!ks.length) return;
    const p = nextPick(ks, pick, current.kind);
    show(generate(p.kind, p.seed), true);
    announce(live, `New question: ${current.name}, code ${current.code}.`);
  };
  newBtn?.addEventListener('click', newQuestion);

  const paintSession = () => {
    const el = q<HTMLElement>('[data-session]');
    if (el) el.textContent = session.checked ? `This session: ${session.right} of ${plural(session.checked, 'question', 'questions')} right first time.` : 'This session: none checked yet.';
  };

  q<HTMLFormElement>('[data-answer-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input?.value ?? '';
    const f = check(current, raw);
    if (feedback) feedback.innerHTML = feedbackHtml(f, current);
    if (input) {
      if (f.verdict === 'invalid') input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    if (f.verdict !== 'invalid') {
      if (work) work.open = true;
      if (!recorded && !revealed) {
        recorded = true;
        state = recordAttempt(state, current.kind, f.verdict);
        save();
        session.checked += 1;
        if (f.verdict === 'right') session.right += 1;
        paintSession();
        paintRecord();
      }
    }
    announce(live, `${f.headline} ${f.detail}`);
  });

  q<HTMLButtonElement>('[data-reveal]')?.addEventListener('click', () => {
    if (!recorded) revealed = true;
    if (work) {
      work.open = true;
      work.querySelector('summary')?.focus();
    }
    announce(live, `The answer is ${current.answer}. The working is shown below the question.`);
  });

  const codeForm = q<HTMLFormElement>('[data-code-form]');
  const codeIn = q<HTMLInputElement>('#pp-code');
  const codeHint = q<HTMLElement>('[data-code-hint]');
  const codeHintText = codeHint?.textContent ?? '';
  codeForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseCode(codeIn?.value ?? '');
    if (!p) {
      codeIn?.setAttribute('aria-invalid', 'true');
      if (codeHint) {
        codeHint.textContent = 'That is not a question code. It is three letters, a dash and five digits, such as BEQ-24680.';
        codeHint.classList.add('field__error');
      }
      codeIn?.focus();
      return;
    }
    codeIn?.removeAttribute('aria-invalid');
    if (codeHint) {
      codeHint.textContent = codeHintText;
      codeHint.classList.remove('field__error');
    }
    if (mode() === 'timed') {
      radios('mode').forEach((r) => (r.checked = r.value === 'practice'));
      syncSettings();
    }
    show(generate(p.kind, p.seed), true);
    announce(live, `Loaded ${current.code}: ${current.name}.`);
  });

  /* ---------- Timed sets ---------- */

  interface Running {
    qs: PracticeQuestion[];
    pace: Pace;
    allowed: number;
    banked: number;
    since: number | null;
    timer: number;
    said: Set<string>;
    done: boolean;
  }
  let running: Running | null = null;
  const list = q<HTMLOListElement>('[data-set-list]');
  const run = q<HTMLElement>('[data-run]');
  const clock = q<HTMLElement>('[data-clock]');
  const runState = q<HTMLElement>('[data-run-state]');
  const pauseBtn = q<HTMLButtonElement>('[data-pause]');
  const result = q<HTMLElement>('[data-result]');
  const elapsed = (r: Running) => (r.banked + (r.since === null ? 0 : performance.now() - r.since)) / 1000;

  const tick = () => {
    const r = running;
    if (!r || !clock || r.done) return;
    const left = r.allowed - elapsed(r);
    const over = left < 0;
    clock.textContent = over ? `+${fmtClock(-left)}` : fmtClock(left);
    if (runState) runState.textContent = r.since === null ? 'Paused' : over ? 'Over time' : 'Time left';
    run?.classList.toggle('is-low', !over && left <= Math.min(120, r.allowed / 4));
    const say = (k: string, text: string) => {
      if (!r.said.has(k)) {
        r.said.add(k);
        announce(live, text);
      }
    };
    if (r.allowed >= 300 && left <= r.allowed / 2 && left > 60) say('half', `Half the time is left: ${fmtDuration(left)}.`);
    if (left <= 60 && left > 0) say('one', 'One minute left.');
    if (over) say('over', 'Time is up. Finish when you are ready; the clock now counts the time over.');
  };

  const setItem = (qq: PracticeQuestion, i: number) => {
    const li = document.createElement('li');
    li.className = 'pp-q';
    li.dataset.index = String(i);
    const uid = `pp-s${i}`;
    li.innerHTML = `<header class="pp-q__head"><p class="pp-q__meta"><span>Question ${i + 1} of ${running?.qs.length ?? 0}</span><span>${escapeHtml(GROUPS[qq.group].label)}</span><span class="pp-q__code">Question code ${escapeHtml(qq.code)}</span>${qq.level === 'HL' ? '<span class="tag tag--hl">HL</span>' : ''}</p><h3 class="pp-q__title" id="${uid}-h">${escapeHtml(qq.name)}</h3><p class="pp-q__biz">${escapeHtml(qq.business)}: fictional, figures simulated</p></header>
<div class="pp-q__body">${questionHtml(qq, uid)}</div>
<div class="pp-answer"><label for="${uid}-in" class="pp-answer__label">Your answer to question ${i + 1}</label><div class="pp-answer__row"><span class="pp-answer__fix" aria-hidden="true">${escapeHtml(qq.prefix)}</span><input class="input input--num pp-answer__in" id="${uid}-in" inputmode="decimal" autocomplete="off" aria-describedby="${uid}-hint" data-set-in /><span class="pp-answer__fix" aria-hidden="true">${escapeHtml(qq.suffix)}</span></div><span class="field__hint" id="${uid}-hint">For example ${escapeHtml(qq.example)}. ${escapeHtml(qq.toleranceText)}</span></div>
<div class="pp-feedback" data-set-fb></div>
<details class="pp-work" data-set-work hidden><summary>Answer, working and typical errors</summary><div class="pp-work__body">${workingHtml(qq)}</div></details>`;
    return li;
  };

  startBtn?.addEventListener('click', () => {
    const ks = kinds();
    const pace = cfg.paces.find((p) => p.id === (level() === 'SL' ? 'paper-2-sl' : 'paper-2-hl')) ?? cfg.paces[0];
    if (!ks.length || !pace) return;
    const n = Number(q<HTMLSelectElement>('[data-n]')?.value ?? 5);
    const qs = drawSet(ks, n, seedNow()).map((x) => generate(x.kind, x.seed));
    const marks = qs.reduce((s, x) => s + x.marks, 0);
    const allowed = setSeconds(marks, pace);
    running = { qs, pace, allowed, banked: 0, since: performance.now(), timer: 0, said: new Set(), done: false };
    list?.replaceChildren(...qs.map(setItem));
    if (setBox) setBox.hidden = false;
    if (run) run.hidden = false;
    if (result) result.hidden = true;
    if (card) card.hidden = true;
    if (timedBar) timedBar.hidden = true;
    if (controls) controls.hidden = true;
    const info = q<HTMLElement>('[data-run-info]');
    if (info) info.textContent = `${plural(qs.length, 'calculation', 'calculations')}, ${marks} marks, at the ${pace.label} pace of ${fmtPace(pace)}: ${fmtDuration(allowed)} allowed.`;
    if (pauseBtn) pauseBtn.textContent = 'Pause';
    tick();
    running.timer = window.setInterval(tick, 250);
    run?.scrollIntoView({ block: 'start' });
    list?.querySelector<HTMLInputElement>('[data-set-in]')?.focus();
    announce(live, `Timed set started: ${plural(qs.length, 'calculation', 'calculations')}, ${fmtDuration(allowed)} allowed.`);
  });

  pauseBtn?.addEventListener('click', () => {
    const r = running;
    if (!r || r.done) return;
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

  const endSet = () => {
    if (running) window.clearInterval(running.timer);
    running = null;
    if (setBox) setBox.hidden = true;
    if (controls) controls.hidden = false;
    list?.replaceChildren();
    syncSettings();
    startBtn?.focus();
  };

  q<HTMLButtonElement>('[data-quit]')?.addEventListener('click', () => {
    endSet();
    announce(live, 'Timed set abandoned. Nothing was recorded.');
  });
  q<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => {
    radios('mode').forEach((r) => (r.checked = r.value === 'practice'));
    endSet();
    input?.focus();
    announce(live, 'Back to practice, one question at a time.');
  });

  q<HTMLButtonElement>('[data-finish]')?.addEventListener('click', () => {
    const r = running;
    if (!r || r.done) return;
    const used = Math.round(elapsed(r));
    r.done = true;
    window.clearInterval(r.timer);
    const results: Array<Verdict | 'blank'> = [];
    const rows: HTMLTableRowElement[] = [];
    list?.querySelectorAll<HTMLElement>('li[data-index]').forEach((li) => {
      const i = Number(li.dataset.index);
      const qq = r.qs[i];
      if (!qq) return;
      const inp = li.querySelector<HTMLInputElement>('[data-set-in]');
      const raw = inp?.value.trim() ?? '';
      const f = raw ? check(qq, raw) : null;
      const v: Verdict | 'blank' = f ? f.verdict : 'blank';
      results.push(v);
      if (inp) inp.readOnly = true;
      const fb = li.querySelector<HTMLElement>('[data-set-fb]');
      if (fb) fb.innerHTML = f ? feedbackHtml(f, qq) : `<div class="feedback feedback--wrong"><p class="feedback__verdict">Not answered.</p><p>The answer is ${escapeHtml(qq.answer)}.</p></div>`;
      const wk = li.querySelector<HTMLDetailsElement>('[data-set-work]');
      if (wk) wk.hidden = false;
      const tr = document.createElement('tr');
      const cells = [`${i + 1}. ${qq.name}`, f && f.value !== null ? fmtValue(f.value, qq.unit) : 'None', qq.answer, VERDICT_WORDS[v], v === 'right' ? `${qq.marks} of ${qq.marks}` : `0 of ${qq.marks}`];
      cells.forEach((t, k) => {
        const c = document.createElement(k === 0 ? 'th' : 'td');
        if (k === 0) c.setAttribute('scope', 'row');
        if (k === 4) c.className = 'n';
        c.textContent = t;
        tr.append(c);
      });
      rows.push(tr);
    });
    const codes = r.qs.map((x) => x.code);
    const sc = score(codes, results);
    const rec: TimedRecord = { at: new Date().toISOString(), level: level(), codes, results, marks: sc.marks, total: sc.total, allowed: r.allowed, used };
    state = recordTimed(state, rec);
    save();
    paintRecord();
    if (run) run.hidden = true;
    q<HTMLElement>('[data-result-rows]')?.replaceChildren(...rows);
    const line = q<HTMLElement>('[data-result-line]');
    const over = used - r.allowed;
    if (line) line.textContent = `${sc.right} of ${r.qs.length} right, ${sc.marks} of ${sc.total} marks, in ${fmtDuration(used)} of the ${fmtDuration(r.allowed)} allowed${over > 0 ? ` (${fmtDuration(over)} over)` : ''}.`;
    if (result) {
      result.hidden = false;
      result.focus();
    }
    announce(live, line?.textContent ?? 'Set marked.');
  });

  /* ---------- The record ---------- */

  const paintRecord = () => {
    root.ownerDocument.querySelectorAll<HTMLElement>('[data-kind]').forEach((tr) => {
      const k = state.kinds[tr.dataset.kind ?? ''] ?? { tried: 0, right: 0 };
      const t = tr.querySelector<HTMLElement>('[data-tried]');
      const r = tr.querySelector<HTMLElement>('[data-right]');
      const b = tr.querySelector<HTMLElement>('[data-bar]');
      if (t) t.textContent = String(k.tried);
      if (r) r.textContent = String(k.right);
      if (b) b.style.width = `${k.tried ? (k.right / k.tried) * 100 : 0}%`;
    });
    const rows = page.querySelector<HTMLElement>('[data-timed-rows]');
    const wrap = page.querySelector<HTMLElement>('[data-timed-wrap]');
    const none = page.querySelector<HTMLElement>('[data-timed-empty]');
    if (wrap) wrap.hidden = state.timed.length === 0;
    if (none) none.hidden = state.timed.length > 0;
    rows?.replaceChildren(
      ...[...state.timed].reverse().map((t) => {
        const tr = document.createElement('tr');
        const when = new Date(t.at);
        const right = t.results.filter((x) => x === 'right').length;
        [
          Number.isNaN(when.getTime()) ? t.at : when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          t.level,
          `${right} of ${t.codes.length}`,
          `${t.marks} of ${t.total}`,
          fmtDuration(t.used),
          fmtDuration(t.allowed),
        ].forEach((text, k) => {
          const c = document.createElement(k === 0 ? 'th' : 'td');
          if (k === 0) c.setAttribute('scope', 'row');
          if (k >= 2) c.className = 'n';
          c.textContent = text;
          tr.append(c);
        });
        return tr;
      }),
    );
  };

  page.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((b) =>
    b.addEventListener('click', () => {
      const day = today();
      if (b.dataset.export === 'csv') {
        const lines = [['Calculation', 'Topic', 'Level', 'Checked', 'Right first time'].join(',')];
        for (const [id, k] of Object.entries(state.kinds)) {
          const d = KINDS[id];
          if (d) lines.push([`"${d.name}"`, `"${GROUPS[d.group].label}"`, d.level, k.tried, k.right].join(','));
        }
        lines.push('', ['Timed set finished', 'Level', 'Questions', 'Right', 'Marks', 'Out of', 'Seconds used', 'Seconds allowed', 'Codes'].join(','));
        for (const t of state.timed) lines.push([t.at, t.level, t.codes.length, t.results.filter((x) => x === 'right').length, t.marks, t.total, t.used, t.allowed, `"${t.codes.join(' ')}"`].join(','));
        download(`business-brief-paper-2-practice-${day}.csv`, lines.join('\n') + '\n', 'text/csv;charset=utf-8');
        announce(live, 'Downloaded your record as CSV.');
      } else {
        download(`business-brief-paper-2-practice-${day}.json`, JSON.stringify({ exported: new Date().toISOString(), key: 'bb:p2-practice', state }, null, 2), 'application/json');
        announce(live, 'Downloaded a backup of your record as JSON.');
      }
    }),
  );

  const reset = page.querySelector<HTMLButtonElement>('[data-reset]');
  const confirm = page.querySelector<HTMLElement>('[data-reset-confirm]');
  reset?.addEventListener('click', () => {
    if (confirm) confirm.hidden = false;
    reset.hidden = true;
    page.querySelector<HTMLButtonElement>('[data-reset-no]')?.focus();
  });
  const closeConfirm = () => {
    if (confirm) confirm.hidden = true;
    if (reset) {
      reset.hidden = false;
      reset.focus();
    }
  };
  page.querySelector<HTMLButtonElement>('[data-reset-no]')?.addEventListener('click', closeConfirm);
  page.querySelector<HTMLButtonElement>('[data-reset-yes]')?.addEventListener('click', () => {
    state = emptyP2();
    store.remove(KEY);
    paintRecord();
    closeConfirm();
    announce(live, 'Your Paper 2 practice record was deleted from this device.');
  });

  /* ---------- Start ---------- */

  controls?.addEventListener('change', () => {
    syncSettings();
    const ks = kinds();
    if (mode() === 'practice' && ks.length && !ks.includes(current.kind)) newQuestion();
  });
  controls?.addEventListener('submit', (e) => e.preventDefault());

  const fromHash = parseCode(decodeURIComponent(location.hash.replace(/^#/, '')));
  if (fromHash) show(generate(fromHash.kind, fromHash.seed));
  syncSettings();
  paintSession();
  paintRecord();
});
