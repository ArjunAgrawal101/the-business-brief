/**
 * The research question builder. It drafts a question from what the reader
 * types, checks the question's form against the guide as they go
 * (checkQuestion), shows the chosen concept as a lens, flags the platform's
 * own warnings, and keeps the draft and the six tests on this device
 * (bb:ia:rq). It never approves a question: the teacher does.
 */
import { each, store } from '../ix';
import { CONCEPTS, QUESTION_TESTS, checkQuestion, draftQuestion, parseRq, questionWarnings, type ConceptId, type RqState } from '../../lib/ia-tools';
import { checksHtml } from './ia-common';

const KEY = 'ia:rq';

const LENS: Record<ConceptId, string> = {
  change: 'Change as the lens: what does the move from one state to another alter, for whom, and is it worth it?',
  creativity: 'Creativity as the lens: has a new idea, or an existing idea seen from a new perspective, created value for the organization?',
  ethics: 'Ethics as the lens: is the decision right, and who bears its cost?',
  sustainability: 'Sustainability as the lens: does it meet present needs without compromising the future, for people, planet and profit together?',
};

each('[data-ix="rq-builder"]', (root) => {
  const f = (k: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${k}"]`);
  const q = root.querySelector<HTMLTextAreaElement>('[data-q]');
  const lens = root.querySelector<HTMLElement>('[data-lens]');
  const warn = root.querySelector<HTMLElement>('[data-warn]');
  const alt = root.querySelector<HTMLElement>('[data-alt]');
  const guide = root.querySelector<HTMLElement>('[data-guide]');
  const tests = [...root.querySelectorAll<HTMLInputElement>('.rq__tests input')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="rq-form"]')];
  if (!q) return;

  const saved = parseRq(store.get<unknown>(KEY, null));
  (['org', 'issue', 'decision', 'taken', 'aim', 'concept'] as const).forEach((k) => {
    const el = f(k);
    if (el) el.value = saved[k];
  });
  radios.forEach((r) => (r.checked = r.value === saved.form));
  tests.forEach((t) => (t.checked = saved.tests.includes(t.value)));
  let edited = saved.q.length > 0;
  if (edited) q.value = saved.q;

  const read = (): RqState => {
    const concept = f('concept')?.value ?? 'change';
    return {
      org: f('org')?.value ?? '',
      issue: f('issue')?.value ?? '',
      form: radios.find((r) => r.checked)?.value === 'backward' ? 'backward' : 'forward',
      decision: f('decision')?.value ?? '',
      taken: f('taken')?.value ?? '',
      aim: f('aim')?.value ?? '',
      concept: (CONCEPTS as readonly string[]).includes(concept) ? (concept as ConceptId) : 'change',
      q: edited ? q.value : '',
      tests: tests.filter((t) => t.checked).map((t) => t.value),
    };
  };

  const render = () => {
    const s = read();
    root.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => (el.hidden = el.dataset.when !== s.form));
    if (!edited) q.value = draftQuestion(s);
    if (lens) lens.textContent = LENS[s.concept];
    if (alt)
      alt.textContent =
        s.form === 'forward'
          ? `"To what extent should ${s.org.trim() || 'the organization'} ...?" is allowed too, but it needs a precise judgement: the IA research guide reports that subject reports warn a vague "to some extent" cannot reach the top of criterion E.`
          : 'A backward-looking question judges a decision already taken: your documents must show what happened after it.';
    const problems = questionWarnings(q.value);
    if (warn) {
      warn.hidden = problems.length === 0;
      warn.textContent = problems.length ? `Recommended strategy: ${problems.join(' ')}` : '';
    }
    if (guide) guide.innerHTML = checksHtml(checkQuestion(q.value, s.org, s.concept));
    if (count) count.textContent = `${s.tests.length} of ${QUESTION_TESTS.length} tests met${s.tests.length === QUESTION_TESTS.length ? ': ready to discuss with your teacher, who approves the question.' : '.'}`;
    store.set(KEY, { ...s, q: edited ? q.value : '' });
  };

  root.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', render));
  root.querySelectorAll('input[type="radio"], input[type="checkbox"], select').forEach((el) => el.addEventListener('change', render));
  q.addEventListener('input', () => {
    edited = q.value.trim().length > 0;
    render();
  });
  render();
});
