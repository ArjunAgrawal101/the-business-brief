/**
 * The research question builder. It drafts a question from what the reader
 * types, shows the chosen concept as a lens, flags common problems, and keeps
 * the draft and the six tests on this device. It never approves a question.
 */
import { each, store } from '../ix';

const LENS: Record<string, string> = {
  change: 'Change as the lens: what does the move from one state to another alter, for whom, and is it worth it?',
  creativity: 'Creativity as the lens: has a new idea, or an existing idea seen from a new perspective, created value for the organization?',
  ethics: 'Ethics as the lens: is the decision right, and who bears its cost?',
  sustainability: 'Sustainability as the lens: does it meet present needs without compromising the future, for people, planet and profit together?',
};

const clean = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '');

each('[data-ix="rq-builder"]', (root) => {
  const f = (k: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${k}"]`);
  const q = root.querySelector<HTMLTextAreaElement>('[data-q]');
  const lens = root.querySelector<HTMLElement>('[data-lens]');
  const warn = root.querySelector<HTMLElement>('[data-warn]');
  const alt = root.querySelector<HTMLElement>('[data-alt]');
  const tests = [...root.querySelectorAll<HTMLInputElement>('.rq__tests input')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="rq-form"]')];
  if (!q) return;

  const saved = store.get<Record<string, string | string[]>>('ia:rq', {});
  ['org', 'issue', 'decision', 'taken', 'aim', 'concept'].forEach((k) => {
    const el = f(k);
    if (el && typeof saved[k] === 'string') el.value = saved[k] as string;
  });
  if (saved.form === 'backward') radios.forEach((r) => (r.checked = r.value === 'backward'));
  const savedTests = new Set(Array.isArray(saved.tests) ? saved.tests : []);
  tests.forEach((t) => (t.checked = savedTests.has(t.value)));
  let edited = typeof saved.q === 'string' && saved.q.length > 0;
  if (edited) q.value = saved.q as string;

  const form = () => radios.find((r) => r.checked)?.value ?? 'forward';

  const draft = () => {
    const org = clean(f('org')?.value ?? '') || 'the organization';
    if (form() === 'forward') {
      const d = clean(f('decision')?.value ?? '') || 'make the decision';
      return { main: `Should ${org} ${d}?`, alt: `"To what extent should ${org} ${d}?" is allowed too, but it needs a precise judgement: reports warn that a vague "to some extent" cannot reach the top of criterion E.` };
    }
    const t = clean(f('taken')?.value ?? '') || 'its decision';
    const a = clean(f('aim')?.value ?? '') || 'met its aim';
    return { main: `How effectively has ${org}'s ${t} ${a}?`, alt: 'A backward-looking question judges a decision already taken: your documents must show what happened after it.' };
  };

  const render = () => {
    root.querySelectorAll<HTMLElement>('[data-when]').forEach((el) => (el.hidden = el.dataset.when !== form()));
    const d = draft();
    if (!edited) q.value = d.main;
    if (lens) lens.textContent = LENS[f('concept')?.value ?? 'change'] ?? '';
    if (alt) alt.textContent = d.alt;
    const text = q.value.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const problems: string[] = [];
    if (!clean(f('org')?.value ?? '')) problems.push('Name the organization: the question must be about one real organization.');
    if (words > 25) problems.push(`${words} words: a shorter question is usually a more focused one.`);
    if ((text.match(/\band\b/gi) ?? []).length >= 2 || (text.match(/\?/g) ?? []).length > 1) problems.push('It may be two questions in one: keep one decision.');
    if (/\b(industry|sector|companies|businesses|firms)\b/i.test(text)) problems.push('It mentions a whole industry: the project is about one organization.');
    if (warn) {
      warn.hidden = problems.length === 0;
      warn.textContent = problems.join(' ');
    }
    const on = tests.filter((t) => t.checked).map((t) => t.value);
    if (count) count.textContent = `${on.length} of ${tests.length} tests met${on.length === tests.length ? ': ready to discuss with your teacher.' : '.'}`;
    store.set('ia:rq', {
      org: f('org')?.value ?? '',
      issue: f('issue')?.value ?? '',
      decision: f('decision')?.value ?? '',
      taken: f('taken')?.value ?? '',
      aim: f('aim')?.value ?? '',
      concept: f('concept')?.value ?? 'change',
      form: form(),
      q: edited ? q.value : '',
      tests: on,
    });
  };

  root.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', render));
  root.querySelectorAll('input[type="radio"], input[type="checkbox"], select').forEach((el) => el.addEventListener('change', render));
  q.addEventListener('input', () => {
    edited = q.value.trim().length > 0;
    render();
  });
  render();
});
