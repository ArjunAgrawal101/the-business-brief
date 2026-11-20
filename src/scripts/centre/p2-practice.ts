/**
 * Paper 2 practice in the browser: new questions from the seeded generators,
 * of four kinds (calculate, find the slip, read the data, construct in a
 * grid), checked within their tolerance with the working and typical errors,
 * a timed set at Paper 2's pace, and the record in bb:p2-practice. The rules
 * live in src/lib/p2-practice.ts (with p2-calcs.ts and p2-tasks.ts) and the
 * markup in src/lib/p2-render.ts; this file wires them to the page.
 */
import { announce, each, escapeHtml, readConfig, store } from '../ix';
import {
  GROUPS,
  META,
  allKindsFor,
  checkAny,
  drawSet,
  emptyP2,
  generateAny,
  isChoice,
  isGrid,
  nextPick,
  parseAnswer,
  parseCode,
  parseP2,
  recordAttempt,
  recordTimed,
  score,
  type AnyFeedback,
  type AnyQuestion,
  type GroupId,
  type KindMeta,
  type P2State,
  type Response,
  type TaskType,
  type TimedRecord,
  type Verdict,
} from '../../lib/p2-practice';
import { answerHtml, cellMark, feedbackAnyHtml, fmtValue, gridChartHtml, questionHtml, taskLabel, workingAnyHtml } from '../../lib/p2-render';
import { TASK_LABELS } from '../../lib/p2-tasks';
import { fmtClock, fmtDuration, fmtPace, setSeconds, type Pace } from '../../lib/bank';
import { rng } from '../../lib/random';

interface Config {
  paces: Pace[];
  first: string;
  kinds: Record<string, KindMeta>;
}

const KEY = 'p2-practice';
const PREFS = 'p2-prefs';
const TASKS: TaskType[] = ['calc', 'spot', 'read', 'build'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const VERDICT_WORDS: Record<Verdict | 'blank', string> = { right: 'Right', close: 'Nearly', wrong: 'Not yet', invalid: 'Not answered', blank: 'Not answered' };

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

/** The answer to show once a question is marked or revealed. */
const answerText = (q: AnyQuestion) => (isChoice(q) || isGrid(q) ? q.answerText : q.answer);

/** What the reader has entered in an answer form, by the question's form. */
function readResponse(box: ParentNode, q: AnyQuestion): Response {
  if (isChoice(q)) return box.querySelector<HTMLInputElement>('input[data-choice]:checked')?.value ?? null;
  if (isGrid(q)) {
    const out: Record<string, string> = {};
    box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-cell]').forEach((el) => {
      out[el.dataset.cell ?? ''] = el.value;
    });
    return out;
  }
  return box.querySelector<HTMLInputElement>('input[data-number]')?.value ?? '';
}

/** True when nothing at all has been entered. */
function isBlank(r: Response): boolean {
  if (r === null) return true;
  if (typeof r === 'string') return !r.trim();
  return Object.values(r).every((v) => !v.trim());
}

/** Marks the answer form after a check: the cells of a grid, the chosen and the right option, an invalid figure. All in words. */
function paintMarks(box: ParentNode, q: AnyQuestion, f: AnyFeedback) {
  if (f.form === 'grid') {
    for (const c of f.cells) {
      const el = box.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-cell="${c.id}"]`);
      if (!el) continue;
      const mark = el.parentElement?.querySelector<HTMLElement>('[data-cell-mark]');
      if (mark) mark.textContent = cellMark(c);
      el.closest('.pp-cell, .pp-grid__field')?.setAttribute('data-verdict', c.verdict);
      if (c.verdict === 'wrong' || c.verdict === 'invalid') el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
    return;
  }
  if (f.form === 'choice' && isChoice(q)) {
    box.querySelectorAll<HTMLInputElement>('input[data-choice]').forEach((inp) => {
      const label = inp.closest('label');
      const mark = label?.querySelector<HTMLElement>('[data-choice-mark]');
      const right = inp.value === q.answer;
      const chosen = inp.value === f.chosen;
      label?.setAttribute('data-verdict', right ? 'right' : chosen ? 'wrong' : '');
      if (mark) mark.textContent = right ? 'The answer' : chosen ? 'Your choice: not this one' : '';
    });
    return;
  }
  const inp = box.querySelector<HTMLInputElement>('input[data-number]');
  if (!inp) return;
  if (f.verdict === 'invalid') inp.setAttribute('aria-invalid', 'true');
  else inp.removeAttribute('aria-invalid');
}

/** Draws the reader's own break-even chart from a grid, where the question has one. */
function drawGridChart(box: ParentNode, slot: HTMLElement | null, q: AnyQuestion, uid: string) {
  if (!slot) return;
  if (!isGrid(q) || !q.chart) {
    slot.innerHTML = '';
    return;
  }
  const read = (id: string) => parseAnswer(box.querySelector<HTMLInputElement>(`[data-cell="${id}"]`)?.value ?? '', 'money');
  slot.innerHTML = gridChartHtml(q, read, uid);
}

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
  const tasks = (): TaskType[] => radios('task').filter((r) => r.checked).map((r) => r.value as TaskType);
  const kinds = () => allKindsFor(topics(), level(), tasks());

  const prefs = store.get<{ level?: string; topics?: string[]; tasks?: string[] }>(PREFS, {});
  if (prefs.level === 'SL' || (prefs.level === undefined && document.documentElement.getAttribute('data-level') === 'SL')) radios('level').forEach((r) => (r.checked = r.value === 'SL'));
  if (Array.isArray(prefs.topics) && prefs.topics.length) radios('topic').forEach((r) => (r.checked = prefs.topics?.includes(r.value) ?? true));
  if (Array.isArray(prefs.tasks) && prefs.tasks.some((t) => (TASKS as string[]).includes(t))) radios('task').forEach((r) => (r.checked = prefs.tasks?.includes(r.value) ?? true));

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
    if (none && info) info.textContent = 'Choose at least one topic and one kind of task available at your level.';
    const timed = mode() === 'timed';
    if (practiceBar) practiceBar.hidden = timed;
    if (timedBar) timedBar.hidden = !timed;
    if (card) card.hidden = timed || running !== null;
    store.set(PREFS, { level: level(), topics: radios('topic').filter((r) => r.checked).map((r) => r.value), tasks: tasks() });
  };

  /* ---------- One question at a time ---------- */

  const firstCode = parseCode(cfg.first);
  let current: AnyQuestion = generateAny(firstCode?.kind ?? 'break-even-quantity', firstCode?.seed ?? 24680);
  let recorded = false;
  let revealed = false;
  const session = { checked: 0, right: 0 };
  const form = q<HTMLFormElement>('[data-answer-form]');
  const answerBody = q<HTMLElement>('[data-answer-body]');
  const feedback = q<HTMLElement>('[data-feedback]');
  const work = q<HTMLDetailsElement>('[data-work]');
  const chartSlot = q<HTMLElement>('[data-chart-slot]');

  const focusAnswer = () => answerBody?.querySelector<HTMLElement>('input, select')?.focus();

  const show = (qq: AnyQuestion, focus = false) => {
    current = qq;
    recorded = false;
    revealed = false;
    const set = (sel: string, text: string) => {
      const el = q<HTMLElement>(sel);
      if (el) el.textContent = text;
    };
    set('[data-q-task]', taskLabel(qq));
    set('[data-q-group]', GROUPS[qq.group].label);
    set('[data-q-code]', `Question code ${qq.code}`);
    set('[data-q-name]', qq.name);
    set('[data-q-biz]', qq.business);
    const hl = q<HTMLElement>('[data-q-hl]');
    if (hl) hl.hidden = qq.level !== 'HL';
    const body = q<HTMLElement>('[data-q-body]');
    if (body) body.innerHTML = questionHtml(qq, 'pp-q');
    if (answerBody) answerBody.innerHTML = answerHtml(qq, 'pp-q', true);
    const wb = q<HTMLElement>('[data-work-body]');
    if (wb) wb.innerHTML = workingAnyHtml(qq, 'pp-q');
    if (work) work.open = false;
    if (feedback) feedback.innerHTML = '';
    if (chartSlot) chartSlot.innerHTML = '';
    if (focus) focusAnswer();
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
    show(generateAny(p.kind, p.seed), true);
    announce(live, `New question: ${current.name}, code ${current.code}.`);
  };
  newBtn?.addEventListener('click', newQuestion);

  const paintSession = () => {
    const el = q<HTMLElement>('[data-session]');
    if (el) el.textContent = session.checked ? `This session: ${session.right} of ${plural(session.checked, 'question', 'questions')} right first time.` : 'This session: none checked yet.';
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = checkAny(current, readResponse(form, current));
    if (feedback) feedback.innerHTML = feedbackAnyHtml(f, current);
    paintMarks(form, current, f);
    if (f.verdict !== 'invalid') {
      drawGridChart(form, chartSlot, current, 'pp-q');
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
    announce(live, `The answer is ${answerText(current)}. The working is shown below the question.`);
  });

  const codeForm = q<HTMLFormElement>('[data-code-form]');
  const codeIn = q<HTMLInputElement>('#pp-code');
  const codeHint = q<HTMLElement>('[data-code-hint]');
  const codeHintText = codeHint?.textContent ?? '';
  const toPractice = () => {
    if (mode() === 'timed' && !running) {
      radios('mode').forEach((r) => (r.checked = r.value === 'practice'));
      syncSettings();
    }
  };
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
    toPractice();
    show(generateAny(p.kind, p.seed), true);
    announce(live, `Loaded ${current.code}: ${current.name}.`);
  });

  /* ---------- Timed sets ---------- */

  interface Running {
    qs: AnyQuestion[];
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

  const setItem = (qq: AnyQuestion, i: number) => {
    const li = document.createElement('li');
    li.className = 'pp-q';
    li.dataset.index = String(i);
    const uid = `pp-s${i}`;
    const num = !isChoice(qq) && !isGrid(qq);
    li.innerHTML = `<header class="pp-q__head"><p class="pp-q__meta"><span>Question ${i + 1} of ${running?.qs.length ?? 0}</span><span class="pp-q__task">${escapeHtml(taskLabel(qq))}</span><span>${escapeHtml(GROUPS[qq.group].label)}</span><span class="pp-q__code">Question code ${escapeHtml(qq.code)}</span>${qq.level === 'HL' ? '<span class="tag tag--hl">HL</span>' : ''}</p><h3 class="pp-q__title" id="${uid}-h">${escapeHtml(qq.name)}</h3><p class="pp-q__biz">${escapeHtml(qq.business)}: fictional, figures simulated</p></header>
<div class="pp-q__body">${questionHtml(qq, uid)}</div>
<div class="pp-answer" data-set-form>${num ? answerHtml(qq, uid).replace('>Your answer<', `>Your answer to question ${i + 1}<`) : answerHtml(qq, uid)}</div>
<div class="pp-feedback" data-set-fb></div>
<div data-set-chart></div>
<details class="pp-work" data-set-work hidden><summary>Answer, working and typical errors</summary><div class="pp-work__body">${workingAnyHtml(qq, uid)}</div></details>`;
    return li;
  };

  startBtn?.addEventListener('click', () => {
    const ks = kinds();
    const pace = cfg.paces.find((p) => p.id === (level() === 'SL' ? 'paper-2-sl' : 'paper-2-hl')) ?? cfg.paces[0];
    if (!ks.length || !pace) return;
    const n = Number(q<HTMLSelectElement>('[data-n]')?.value ?? 5);
    const qs = drawSet(ks, n, seedNow()).map((x) => generateAny(x.kind, x.seed));
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
    if (info) info.textContent = `${plural(qs.length, 'question', 'questions')}, ${marks} marks, at the ${pace.label} pace of ${fmtPace(pace)}: ${fmtDuration(allowed)} allowed.`;
    if (pauseBtn) pauseBtn.textContent = 'Pause';
    tick();
    running.timer = window.setInterval(tick, 250);
    run?.scrollIntoView({ block: 'start' });
    list?.querySelector<HTMLElement>('input, select')?.focus();
    announce(live, `Timed set started: ${plural(qs.length, 'question', 'questions')}, ${fmtDuration(allowed)} allowed.`);
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
    focusAnswer();
    announce(live, 'Back to practice, one question at a time.');
  });

  /** "Your answer" in the results table, in a few words. */
  const yourAnswer = (qq: AnyQuestion, f: AnyFeedback | null): string => {
    if (!f) return 'None';
    if (f.form === 'grid') return `${f.credited} of ${f.total} cells credited`;
    if (f.form === 'choice' && isChoice(qq)) {
      const o = qq.options.find((x) => x.id === f.chosen);
      return o ? o.text.slice(0, 60) + (o.text.length > 60 ? '…' : '') : 'None';
    }
    return f.form === 'number' && f.value !== null && !isChoice(qq) && !isGrid(qq) ? fmtValue(f.value, qq.unit) : 'Not a number';
  };

  q<HTMLButtonElement>('[data-finish]')?.addEventListener('click', () => {
    const r = running;
    if (!r || r.done) return;
    const used = Math.round(elapsed(r));
    r.done = true;
    window.clearInterval(r.timer);
    const results: Array<Verdict | 'blank'> = [];
    const earned: Array<number | null> = [];
    const rows: HTMLTableRowElement[] = [];
    list?.querySelectorAll<HTMLElement>('li[data-index]').forEach((li) => {
      const i = Number(li.dataset.index);
      const qq = r.qs[i];
      if (!qq) return;
      const box = li.querySelector<HTMLElement>('[data-set-form]');
      if (!box) return;
      const response = readResponse(box, qq);
      const f = isBlank(response) ? null : checkAny(qq, response);
      const v: Verdict | 'blank' = f ? f.verdict : 'blank';
      results.push(v);
      earned.push(f && f.form === 'grid' ? f.earned : null);
      box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select').forEach((el) => {
        if (el instanceof HTMLInputElement && el.type !== 'radio') el.readOnly = true;
        else el.disabled = true;
      });
      if (f) paintMarks(box, qq, f);
      const fb = li.querySelector<HTMLElement>('[data-set-fb]');
      if (fb) fb.innerHTML = f ? feedbackAnyHtml(f, qq) : `<div class="feedback feedback--wrong"><p class="feedback__verdict">Not answered.</p><p>The answer is ${escapeHtml(answerText(qq))}.</p></div>`;
      if (f) drawGridChart(box, li.querySelector<HTMLElement>('[data-set-chart]'), qq, `pp-s${i}`);
      const wk = li.querySelector<HTMLDetailsElement>('[data-set-work]');
      if (wk) wk.hidden = false;
      const m = f && f.form === 'grid' && v !== 'right' ? f.earned : v === 'right' ? qq.marks : 0;
      const tr = document.createElement('tr');
      const cells = [`${i + 1}. ${qq.name}`, yourAnswer(qq, f), answerText(qq), VERDICT_WORDS[v], `${m} of ${qq.marks}`];
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
    const sc = score(codes, results, earned);
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
        const lines = [['Kind of question', 'Task', 'Topic', 'Level', 'Checked', 'Right first time'].join(',')];
        for (const [id, k] of Object.entries(state.kinds)) {
          const d = META[id];
          if (d) lines.push([`"${d.name}"`, `"${TASK_LABELS[d.task]}"`, `"${GROUPS[d.group].label}"`, d.level, k.tried, k.right].join(','));
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
  controls?.querySelectorAll<HTMLButtonElement>('[data-topics]').forEach((b) =>
    b.addEventListener('click', () => {
      const all = b.dataset.topics === 'all';
      radios('topic').forEach((r) => (r.checked = all));
      syncSettings();
      announce(live, all ? 'Every topic chosen.' : 'No topics chosen. Choose at least one.');
      const ks = kinds();
      if (mode() === 'practice' && ks.length && !ks.includes(current.kind)) newQuestion();
    }),
  );

  /** A question code in the address, on arrival or from a link on the page. */
  const fromAddress = (scroll: boolean) => {
    const p = parseCode(decodeURIComponent(location.hash.replace(/^#/, '')));
    if (!p) return false;
    if (running) return false;
    toPractice();
    show(generateAny(p.kind, p.seed));
    if (scroll) {
      card?.scrollIntoView({ block: 'start' });
      q<HTMLElement>('[data-q-name]')?.setAttribute('tabindex', '-1');
      q<HTMLElement>('[data-q-name]')?.focus({ preventScroll: true });
      announce(live, `Loaded ${current.code}: ${current.name}.`);
    }
    return true;
  };
  window.addEventListener('hashchange', () => fromAddress(true));
  fromAddress(false);
  syncSettings();
  paintSession();
  paintRecord();
});
