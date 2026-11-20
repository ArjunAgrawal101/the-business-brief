/**
 * The Business Scenario Generator in the browser. The scenario named in the
 * address (?s=<family>-<seed>) is generated with the same code as the server's
 * worked example; the reader checks each step in turn, sees the feedback, and
 * opens the next; the model answer and the summary open at the end. Answers
 * and verdicts are kept in bb:scenarios as the reader goes, so a scenario
 * reopens where it was left. The filters narrow the families by unit,
 * subtopic and tool, and are kept in the address too.
 */
import { FAMILIES, DEFAULT_CODE, MAX_SEED, filtered, matches, parseCode, readFilters, scenarioFor, type Filters } from '../lib/scenario-generator';
import { MIN_JUSTIFY_WORDS, VERDICT_WORDS, readNumber, stepVerdicts, wordCount, type Answers } from '../lib/scenario-generator/check';
import { feedbackHtml, headHtml, scenarioHtml, summaryHtml, type RenderContext } from '../lib/scenario-generator/render';
import { STORAGE_KEY, find, readRecord, upsert, type Record_ } from '../lib/scenario-generator/store';
import { EVALUATE_KEYS, STEP_IDS, STEP_TITLES, type Scenario, type StepId } from '../lib/scenario-generator/types';
import { count } from '../lib/strategy/common';
import { announce, each, escapeHtml, readConfig } from './ix';
import { readItem, writeItem } from './storage';

interface Config {
  ctx: RenderContext;
  defaultCode: string;
}

const randomSeed = () => 1 + Math.floor(Math.random() * MAX_SEED);

each('[data-ix="scenario-generator"]', (root) => {
  const cfg = readConfig<Config>(root);
  const $ = <T extends HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<T>(sel);
  const $$ = <T extends HTMLElement>(sel: string, from: ParentNode = root) => [...from.querySelectorAll<T>(sel)];
  const status = $('[data-status]');
  const head = $('[data-head]');
  const body = $('[data-scenario]');
  const barMsg = $('[data-bar-msg]');
  if (!head || !body) throw new Error('Scenario generator: missing containers');

  let record: Record_ = readRecord(readItem(STORAGE_KEY));
  let scenario: Scenario;
  let answers: Answers = {};
  let checked: StepId[] = [];
  let filters: Filters = readFilters(new URLSearchParams(location.search));

  const save = () => {
    const entry = { code: scenario.code, title: scenario.title, answers, checked, verdicts: stepVerdicts(scenario, answers, checked), at: new Date().toISOString() };
    record = upsert(record, entry);
    writeItem(STORAGE_KEY, JSON.stringify(record));
    drawRecord();
  };

  /* ---------- The address ---------- */

  const writeAddress = (push: boolean) => {
    const q = new URLSearchParams();
    q.set('s', scenario.code);
    if (filters.unit) q.set('unit', filters.unit);
    if (filters.subtopic) q.set('subtopic', filters.subtopic);
    if (filters.tool) q.set('tool', filters.tool);
    const url = `${location.pathname}?${q.toString()}${location.hash}`;
    if (push) history.pushState({ s: scenario.code }, '', url);
    else history.replaceState({ s: scenario.code }, '', url);
  };

  /* ---------- Steps ---------- */

  const stepEl = (k: StepId) => $(`[data-step="${k}"]`);

  /** Put the reader's saved answers back into the controls. */
  const fillControls = () => {
    const setRadio = (name: string, v: string | undefined) => $$<HTMLInputElement>(`input[name="sg-${name}"]`).forEach((r) => (r.checked = r.value === v));
    setRadio('problem', answers.problem);
    setRadio('tool', answers.tool);
    setRadio('recommend', answers.recommend);
    setRadio('stakeholders', answers.stakeholders);
    setRadio('risk', answers.risk);
    setRadio('change', answers.change);
    $$<HTMLInputElement>('input[name="sg-evidence"]').forEach((c) => (c.checked = (answers.evidence ?? []).includes(c.value)));
    const calc = $<HTMLInputElement>('[data-calc]');
    if (calc) calc.value = answers.calc ?? '';
    $$<HTMLSelectElement>('[data-sort]').forEach((s) => (s.value = answers.sort?.[s.dataset.sort ?? ''] ?? ''));
    const notes = $<HTMLTextAreaElement>('[data-notes]');
    if (notes) notes.value = answers.notes ?? '';
    const justify = $<HTMLTextAreaElement>('[data-justify]');
    if (justify) justify.value = answers.justify ?? '';
  };

  /** Lock checked steps, open the next one, and open the end once every step is checked. */
  const apply = () => {
    let open = true;
    STEP_IDS.forEach((k, i) => {
      const el = stepEl(k);
      if (!el) return;
      const done = checked.includes(k);
      const bodyEl = $('[data-body]', el);
      const locked = $('[data-locked]', el);
      if (bodyEl) bodyEl.hidden = !open;
      if (locked) locked.hidden = open || i === 0;
      el.classList.toggle('is-done', done);
      el.classList.toggle('is-locked', !open);
      $$<HTMLInputElement | HTMLSelectElement>('input, select', el).forEach((c) => (c.disabled = done));
      $$<HTMLTextAreaElement>('textarea', el).forEach((t) => (t.readOnly = done && t.hasAttribute('data-justify')));
      const btn = $<HTMLButtonElement>(`[data-check="${k}"]`, el);
      if (btn) btn.hidden = done;
      const fb = $(`[data-feedback="${k}"]`, el);
      if (fb) fb.innerHTML = done ? feedbackHtml(scenario, k, answers, cfg.ctx) : '';
      if (!done) open = false;
    });
    const all = checked.length === STEP_IDS.length;
    const endBody = $('[data-end-body]');
    const endLocked = $('[data-end-locked]');
    if (endBody) endBody.hidden = !all;
    if (endLocked) endLocked.hidden = all;
    const summary = $('[data-summary]');
    if (summary) summary.innerHTML = all ? summaryHtml(scenario, answers, checked) : '';
  };

  const msg = (k: StepId, text: string) => {
    const el = $(`[data-msg="${k}"]`);
    if (el) el.textContent = text;
    if (text) announce(status, text);
  };

  const radioValue = (name: string) => $<HTMLInputElement>(`input[name="sg-${name}"]:checked`)?.value;

  /** Read the step's controls into the answers; a message when something is missing. */
  const read = (k: StepId): string => {
    switch (k) {
      case 'problem':
      case 'tool':
      case 'recommend': {
        const v = radioValue(k);
        if (!v) return 'Choose an answer first.';
        answers[k] = v;
        if (k === 'recommend') {
          const j = $<HTMLTextAreaElement>('[data-justify]');
          answers.justify = j?.value ?? '';
          if (wordCount(answers.justify) < MIN_JUSTIFY_WORDS) {
            j?.setAttribute('aria-invalid', 'true');
            j?.focus();
            return `Justify your choice in at least ${MIN_JUSTIFY_WORDS} words: name the evidence and the trade-off.`;
          }
          j?.removeAttribute('aria-invalid');
        }
        return '';
      }
      case 'evidence': {
        const v = $$<HTMLInputElement>('input[name="sg-evidence"]:checked').map((c) => c.value);
        if (!v.length) return 'Choose at least one exhibit.';
        answers.evidence = v;
        return '';
      }
      case 'analysis': {
        const calc = $<HTMLInputElement>('[data-calc]');
        if (calc) {
          if (readNumber(calc.value) === null) {
            calc.setAttribute('aria-invalid', 'true');
            calc.focus();
            return 'Enter a number, such as 1250 or 12.5, without words.';
          }
          calc.removeAttribute('aria-invalid');
          answers.calc = calc.value.trim();
        }
        const sorts = $$<HTMLSelectElement>('[data-sort]');
        if (sorts.length) {
          const empty = sorts.find((s) => !s.value);
          if (empty) {
            empty.focus();
            return 'Place every item first.';
          }
          answers.sort = Object.fromEntries(sorts.map((s) => [s.dataset.sort ?? '', s.value]));
        }
        answers.notes = $<HTMLTextAreaElement>('[data-notes]')?.value ?? '';
        return '';
      }
      case 'evaluate': {
        const vs = EVALUATE_KEYS.map((n) => [n, radioValue(n)] as const);
        if (vs.some(([, v]) => !v)) return `Answer all ${count(EVALUATE_KEYS.length)} questions first.`;
        for (const [n, v] of vs) answers[n] = v;
        return '';
      }
    }
  };

  const check = (k: StepId) => {
    const problem = read(k);
    msg(k, problem);
    if (problem) return;
    if (!checked.includes(k)) checked = STEP_IDS.filter((s) => s === k || checked.includes(s));
    save();
    apply();
    const v = stepVerdicts(scenario, answers, checked)[k];
    const fb = $<HTMLElement>(`[data-feedback="${k}"]`);
    fb?.focus();
    const i = STEP_IDS.indexOf(k);
    const next = STEP_IDS[i + 1];
    announce(status, `${STEP_TITLES[k]}: ${v ? VERDICT_WORDS[v] : ''}. ${next ? `Step ${i + 2}, ${STEP_TITLES[next].toLowerCase()}, is open.` : 'The model answer and your summary are open.'}`);
  };

  /* ---------- Generating and switching scenarios ---------- */

  const show = (s: Scenario, focus: boolean) => {
    scenario = s;
    const entry = find(record, s.code);
    answers = entry ? { ...entry.answers } : {};
    checked = entry ? [...entry.checked] : [];
    head.innerHTML = headHtml(s, cfg.ctx);
    body.innerHTML = scenarioHtml(s, cfg.ctx);
    fillControls();
    apply();
    if (focus) $<HTMLElement>('#sg-title')?.focus();
  };

  const load = (code: string, push: boolean, focus: boolean) => {
    const s = scenarioFor(code);
    if (!s) return false;
    show(s, focus);
    writeAddress(push);
    return true;
  };

  const drawFilters = () => {
    for (const k of ['unit', 'subtopic', 'tool'] as const) {
      const sel = $<HTMLSelectElement>(`[data-filter="${k}"]`);
      if (sel) sel.value = filters[k] ?? '';
    }
    const list = filtered(filters);
    const count = $('[data-count]');
    if (count) count.textContent = `${list.length} of ${FAMILIES.length} ${FAMILIES.length === 1 ? 'family' : 'families'} match`;
    document.querySelectorAll<HTMLElement>('[data-family]').forEach((li) => {
      const f = FAMILIES.find((x) => x.id === li.dataset.family);
      li.hidden = !f || !matches(f, filters);
    });
    const none = $('[data-none]', document);
    if (none) none.hidden = list.length > 0;
    const go = $<HTMLButtonElement>('[data-new]');
    if (go) go.disabled = list.length === 0;
  };

  const drawRecord = () => {
    const box = document.querySelector<HTMLElement>('[data-record]');
    if (!box) return;
    if (!record.items.length) {
      box.innerHTML = '<p class="small muted">You have not worked a scenario on this device yet.</p>';
      return;
    }
    box.innerHTML = `<ol class="sg-record">${record.items
      .slice(0, 12)
      .map((e) => {
        const best = Object.values(e.verdicts).filter((v) => v === 'best').length;
        const when = new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
        return `<li><a href="?s=${escapeHtml(e.code)}" data-open="${escapeHtml(e.code)}">${escapeHtml(e.title)}</a> <span class="sg-record__meta">${e.checked.length} of ${STEP_IDS.length} steps checked, ${best} on the best answer · ${escapeHtml(when)}</span></li>`;
      })
      .join('')}</ol>${record.items.length > 12 ? `<p class="small muted">And ${record.items.length - 12} more kept on this device.</p>` : ''}`;
  };

  /* ---------- Events ---------- */

  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!el || !root.contains(el)) return;
    if (el.dataset.check) {
      check(el.dataset.check as StepId);
    } else if (el.hasAttribute('data-new')) {
      const pool = filtered(filters);
      if (!pool.length) return;
      const f = pool[Math.floor(Math.random() * pool.length)]!;
      load(`${f.id}-${randomSeed()}`, true, true);
      announce(status, `New scenario: ${scenario.title}.`);
    } else if (el.hasAttribute('data-variant')) {
      load(`${scenario.family}-${randomSeed()}`, true, true);
      announce(status, `Another version: ${scenario.title}.`);
    } else if (el.hasAttribute('data-share')) {
      const url = location.href;
      const done = () => {
        if (barMsg) barMsg.textContent = `Link copied: ${url}`;
        announce(status, 'Link copied.');
      };
      const fallback = () => {
        if (barMsg) barMsg.textContent = `Copy this link: ${url}`;
        announce(status, 'Copy the link shown under the buttons.');
      };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, fallback);
      else fallback();
    } else if (el.hasAttribute('data-restart')) {
      answers = {};
      checked = [];
      save();
      fillControls();
      apply();
      $<HTMLInputElement>('input[name="sg-problem"]')?.focus();
      announce(status, 'Started again: your answers to this scenario have been cleared.');
    }
  });

  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-start], a[data-open]');
    if (!a) return;
    e.preventDefault();
    const code = a.dataset.open ?? `${a.dataset.start}-${randomSeed()}`;
    if (load(code, true, false)) {
      document.getElementById('sg')?.scrollIntoView({ block: 'start' });
      $<HTMLElement>('#sg-title')?.focus();
      announce(status, `Scenario: ${scenario.title}.`);
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    const k = t.dataset.filter as keyof Filters | undefined;
    if (!k) return;
    filters = { ...filters, [k]: t.value || undefined };
    drawFilters();
    writeAddress(false);
    announce(status, $('[data-count]')?.textContent ?? '');
  });

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLTextAreaElement;
    if (t.hasAttribute('data-notes')) answers.notes = t.value.slice(0, 4000);
    else if (t.hasAttribute('data-justify') && !checked.includes('recommend')) answers.justify = t.value.slice(0, 4000);
    else return;
    save();
  });

  root.addEventListener('submit', (e) => e.preventDefault());

  window.addEventListener('popstate', () => {
    const code = new URLSearchParams(location.search).get('s') ?? cfg.defaultCode;
    const s = scenarioFor(code);
    if (s && s.code !== scenario.code) show(s, true);
  });

  /* ---------- Start ---------- */

  const asked = new URLSearchParams(location.search).get('s');
  const known = asked ? parseCode(asked, FAMILIES) : null;
  const first = known ? `${known.family.id}-${known.seed}` : DEFAULT_CODE;
  const s0 = scenarioFor(first)!;
  if (s0.code === DEFAULT_CODE && !find(record, s0.code)) {
    // The page already shows the default scenario: keep its markup, and only attach the reader's state.
    scenario = s0;
    fillControls();
    apply();
  } else show(s0, false);
  if (asked && !known && barMsg) barMsg.textContent = `There is no scenario with the code “${asked.slice(0, 60)}”, so the generator has opened its first scenario instead.`;
  if (asked) writeAddress(false);
  drawFilters();
  drawRecord();
});
