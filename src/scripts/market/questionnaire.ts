/** The questionnaire builder in the browser: questions to add, reorder and remove, live checks, saving and export. */
import { nextId } from '../../lib/market-kit';
import { blankQuestion, hasOptions, normalizeQuestionnaire, questionChecks, questionnaireCsvRows, questionnaireText, surveyChecks, type QType, type QuestionnaireState } from '../../lib/market-research';
import { dataMixHtml, previewHtml, questionRowHtml, quotaRowHtml, samplingHtml } from '../../lib/market-research-view';
import { checksHtml } from '../../lib/market-view';
import { splitLines } from '../../lib/market-persona';
import { announce, each, readConfig } from '../ix';
import { fieldChecked, fieldNumber, fieldValue, fill, mountKit } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: QuestionnaireState;
}

each('[data-ix="questionnaire"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const plan = root.querySelector<HTMLFormElement>('[data-plan]');
  const qform = root.querySelector<HTMLFormElement>('[data-questions]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const quotas = root.querySelector<HTMLElement>('[data-quotas]');
  const quotaWrap = root.querySelector<HTMLElement>('[data-quotas-wrap]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!plan || !qform || !rows || !quotas || !quotaWrap) return;
  let timer = 0;

  const read = (): QuestionnaireState => ({
    business: cfg.defaults.business,
    title: fieldValue(plan, 'title'),
    objective: fieldValue(plan, 'objective'),
    population: fieldValue(plan, 'population'),
    populationSize: Math.max(0, Math.round(fieldNumber(plan, 'populationSize') || 0)),
    method: (['random', 'quota', 'convenience'] as const).find((m) => m === fieldValue(plan, 'method')) ?? 'quota',
    sampleSize: Math.max(0, Math.round(fieldNumber(plan, 'sampleSize') || 0)),
    quotas: [...quotas.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({ id: el.dataset.row ?? '', group: fieldValue(el, 'group'), share: fieldNumber(el, 'share') || 0 })),
    intro: fieldValue(plan, 'intro'),
    questions: [...rows.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({
      id: el.dataset.row ?? '',
      type: fieldValue(el, 'type') as QType,
      text: fieldValue(el, 'text'),
      options: splitLines(fieldValue(el, 'options'), 12),
      low: fieldValue(el, 'low'),
      high: fieldValue(el, 'high'),
      required: fieldChecked(el, 'required'),
    })),
  });

  /** Refreshes everything except the question editors themselves, so typing never loses focus. */
  const render = (s: QuestionnaireState) => {
    quotaWrap.hidden = s.method !== 'quota';
    fill(root, '[data-sampling]', samplingHtml(s));
    fill(root, '[data-mix]', dataMixHtml(s));
    fill(root, '[data-survey-checks]', checksHtml(surveyChecks(s)));
    fill(root, '[data-preview]', previewHtml(s));
    s.questions.forEach((q, i) => {
      const el = rows.querySelector<HTMLElement>(`[data-row="${q.id}"]`);
      if (!el) return;
      const flags = questionChecks(q, i + 1);
      const flagsEl = el.querySelector<HTMLElement>('[data-flags]');
      if (flagsEl) flagsEl.innerHTML = flags.length ? checksHtml(flags) : '<p class="mk-q__clear small">No flags from the checks.</p>';
      el.dataset.level = flags.some((f) => f.level === 'conflict') ? 'conflict' : flags.some((f) => f.level === 'tension') ? 'tension' : 'clear';
      el.classList.toggle('has-options', hasOptions(q.type));
      el.className = el.className.replace(/\bmk-q--[a-z]+\b/, `mk-q--${q.type}`);
      const data = el.querySelector<HTMLElement>('.mk-q__data');
      if (data) data.textContent = q.type === 'open' ? 'Qualitative' : 'Quantitative';
    });
  };

  const drawRows = (s: QuestionnaireState) => {
    rows.innerHTML = s.questions.map((q, i) => questionRowHtml(q, i, s.questions.length, uid)).join('');
  };
  const drawQuotas = (s: QuestionnaireState) => {
    quotas.innerHTML = s.quotas.map((q, i) => quotaRowHtml(q, i, uid)).join('');
  };

  const apply = (s: QuestionnaireState) => {
    const set = (f: string, v: string) => {
      const el = plan.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-f="${f}"]`);
      if (el) el.value = v;
    };
    set('title', s.title);
    set('objective', s.objective);
    set('population', s.population);
    set('populationSize', String(s.populationSize));
    set('sampleSize', String(s.sampleSize));
    set('method', s.method);
    set('intro', s.intro);
    drawQuotas(s);
    drawRows(s);
    render(s);
  };

  const kit = mountKit<QuestionnaireState>({ root, slug: cfg.slug, name: 'Questionnaire', defaults: cfg.defaults, normalize: normalizeQuestionnaire, read, apply, csv: questionnaireCsvRows, text: questionnaireText });

  const onEdit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const s = read();
      render(s);
      const flagged = s.questions.filter((q, i) => questionChecks(q, i + 1).some((c) => c.level === 'conflict' || c.level === 'tension')).length;
      announce(status, `${flagged} ${flagged === 1 ? 'question has' : 'questions have'} flags.`);
    }, 300);
    kit.changed();
  };
  plan.addEventListener('input', onEdit);
  plan.addEventListener('change', onEdit);
  qform.addEventListener('input', onEdit);
  qform.addEventListener('change', onEdit);
  plan.addEventListener('submit', (e) => e.preventDefault());
  qform.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const s = read();
    if (s.questions.length >= 25) {
      announce(status, 'Twenty-five questions is the most the builder holds, and far more than most surveys need.');
      return;
    }
    const id = nextId('q', s.questions.map((q) => q.id));
    s.questions.push(blankQuestion(id));
    drawRows(s);
    render(s);
    kit.changed();
    root.querySelector<HTMLTextAreaElement>(`#${uid}-q-${id}-text`)?.focus();
    announce(status, `Question ${s.questions.length} added.`);
  });
  rows.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const el = t.closest<HTMLElement>('[data-row]');
    if (!el) return;
    const s = read();
    const i = s.questions.findIndex((q) => q.id === el.dataset.row);
    if (i < 0) return;
    if (t.closest('[data-remove]')) {
      if (s.questions.length <= 1) {
        announce(status, 'A questionnaire needs at least one question, so this one stays.');
        return;
      }
      s.questions.splice(i, 1);
      drawRows(s);
      render(s);
      kit.changed();
      root.querySelector<HTMLButtonElement>('[data-add]')?.focus();
      announce(status, `Question ${i + 1} removed. The questions after it have been renumbered.`);
      return;
    }
    const move = t.closest<HTMLButtonElement>('[data-move]')?.dataset.move;
    if (move) {
      const j = move === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= s.questions.length) return;
      const [q] = s.questions.splice(i, 1);
      if (q) s.questions.splice(j, 0, q);
      drawRows(s);
      render(s);
      kit.changed();
      root.querySelector<HTMLButtonElement>(`[data-row="${q?.id}"] [data-move="${move}"]:not([disabled])`)?.focus();
      announce(status, `Question moved ${move} to number ${j + 1}.`);
    }
  });
  root.querySelector('[data-add-quota]')?.addEventListener('click', () => {
    const s = read();
    if (s.quotas.length >= 8) return;
    const id = nextId('g', s.quotas.map((q) => q.id));
    s.quotas.push({ id, group: '', share: 0 });
    drawQuotas(s);
    render(s);
    kit.changed();
    root.querySelector<HTMLInputElement>(`#${uid}-quota-${id}-group`)?.focus();
  });
  quotas.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    if (!btn) return;
    const id = btn.closest<HTMLElement>('[data-row]')?.dataset.row;
    const s = read();
    s.quotas = s.quotas.filter((q) => q.id !== id);
    drawQuotas(s);
    render(s);
    kit.changed();
    root.querySelector<HTMLButtonElement>('[data-add-quota]')?.focus();
    announce(status, 'Quota group removed.');
  });
});
