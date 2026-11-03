/**
 * The key concept guide in the browser: checks of the question's form, the
 * concepts the issue points to, the chosen lens's questions and the six
 * tests, all saved in bb:ia-concept. The rules are in src/lib/ia-tools.ts.
 */
import { announce, each, escapeHtml, store } from '../ix';
import { CONCEPT_NAMES, LENS, QUESTION_TESTS, checkQuestion, conceptFit, type ConceptId } from '../../lib/ia-tools';
import { WORD, checksHtml, download, twoStepReset } from './ia-common';

const KEY = 'ia-concept';

interface Saved {
  org: string;
  issue: string;
  rq: string;
  signs: string[];
  concept: ConceptId | '';
  tests: string[];
}

each('[data-ix="ia-concept"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  const field = (name: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  const boxes = (name: string) => [...root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)];

  const saved = store.get<Partial<Saved>>(KEY, {});
  (['org', 'issue', 'rq'] as const).forEach((k) => {
    const el = field(k);
    if (el && typeof saved[k] === 'string') el.value = saved[k] as string;
  });
  boxes('sign').forEach((b) => (b.checked = Array.isArray(saved.signs) && saved.signs.includes(b.value)));
  boxes('test').forEach((b) => (b.checked = Array.isArray(saved.tests) && saved.tests.includes(b.value)));
  boxes('concept').forEach((b) => (b.checked = b.value === saved.concept));

  const read = (): Saved => ({
    org: field('org')?.value ?? '',
    issue: field('issue')?.value ?? '',
    rq: field('rq')?.value ?? '',
    signs: boxes('sign').filter((b) => b.checked).map((b) => b.value),
    concept: (boxes('concept').find((b) => b.checked)?.value as ConceptId | undefined) ?? '',
    tests: boxes('test').filter((b) => b.checked).map((b) => b.value),
  });

  const checksEl = root.querySelector<HTMLElement>('[data-checks]');
  const fitText = root.querySelector<HTMLElement>('[data-fit-text]');
  const lensOut = root.querySelector<HTMLElement>('[data-lens-out]');
  const testsEl = root.querySelector<HTMLElement>('[data-tests]');

  const render = () => {
    const s = read();
    if (checksEl) checksEl.innerHTML = checksHtml(checkQuestion(s.rq, s.org, s.concept));
    const fit = conceptFit(s.signs);
    const top = fit[0]?.score ?? 0;
    fit.forEach((f) => {
      const li = root.querySelector<HTMLElement>(`[data-concept="${f.concept}"]`);
      if (!li) return;
      li.classList.toggle('is-chosen', f.concept === s.concept);
      const bar = li.querySelector<HTMLElement>('.it-fit__bar span');
      if (bar) bar.style.width = `${top ? (f.score / Math.max(top, 2)) * 100 : 0}%`;
      const n = li.querySelector<HTMLElement>('[data-n]');
      if (n) n.textContent = `${f.score} ${f.score === 1 ? 'sign' : 'signs'}`;
    });
    if (fitText) {
      const leaders = fit.filter((f) => f.score === top && top > 0).map((f) => CONCEPT_NAMES[f.concept]);
      if (!top) fitText.textContent = 'Tick what the issue is about to see which concepts it points to.';
      else {
        const lead = leaders.length > 1 ? `${leaders.slice(0, -1).join(', ')} and ${leaders[leaders.length - 1]} equally` : leaders[0];
        const chosen = s.concept ? CONCEPT_NAMES[s.concept] : '';
        const match = s.concept && fit.find((f) => f.concept === s.concept)?.score === top;
        fitText.textContent = `Your answers point most to ${lead}.${
          chosen ? (match ? ` Your lens, ${chosen}, is among them.` : ` You chose ${chosen}: it can work, if you can show what it reveals about this issue in every section.`) : ' Choose your lens below.'
        }`;
      }
    }
    if (lensOut) {
      lensOut.hidden = !s.concept;
      if (s.concept) {
        const l = LENS[s.concept];
        const asks = lensOut.querySelector<HTMLElement>('[data-lens-asks]');
        const list = lensOut.querySelector<HTMLElement>('[data-lens-prompts]');
        if (asks) asks.textContent = l.asks;
        if (list) list.innerHTML = l.prompts.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
      }
    }
    if (testsEl) testsEl.textContent = `${s.tests.length} of ${QUESTION_TESTS.length} ticked.${s.tests.length === QUESTION_TESTS.length ? ' Take the question to your teacher, who approves it.' : ''}`;
    store.set(KEY, s);
  };

  let timer = 0;
  root.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 250);
  });
  root.addEventListener('change', (e) => {
    render();
    const t = e.target as HTMLInputElement;
    if (t.name === 'concept') announce(live, `Lens: ${CONCEPT_NAMES[t.value as ConceptId] ?? t.value}. Its questions are shown.`);
  });

  const summary = () => {
    const s = read();
    const lines = [
      'Key concept guide: my project (The Business Brief)',
      '',
      `Organization: ${s.org || 'not yet named'}`,
      `Issue: ${s.issue || 'not yet described'}`,
      `Research question: ${s.rq || 'not yet written'}`,
      `Lens: ${s.concept ? CONCEPT_NAMES[s.concept] : 'not yet chosen'}`,
      '',
      'Checks of the question’s form:',
      ...checkQuestion(s.rq, s.org, s.concept).map((c) => `- ${WORD[c.status]}: ${c.text}${c.source ? ` (${c.source})` : ''}`),
      '',
      ...(s.concept ? [`The questions ${CONCEPT_NAMES[s.concept]} asks:`, LENS[s.concept].asks, ...LENS[s.concept].prompts.map((p) => `- ${p}`), ''] : []),
      `Tests ticked: ${s.tests.length} of ${QUESTION_TESTS.length}${s.tests.length ? ` (${QUESTION_TESTS.filter((t) => s.tests.includes(t.id)).map((t) => t.name).join(', ')})` : ''}.`,
      '',
      'Your teacher approves the question before work starts (IB Business management guide, p. 53).',
    ];
    return lines.join('\n');
  };

  root.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary());
      announce(live, 'Summary copied.');
    } catch {
      announce(live, 'Copying is not available here: use Download instead.');
    }
  });
  root.querySelector<HTMLButtonElement>('[data-download]')?.addEventListener('click', () => {
    download('business-brief-ia-key-concept.txt', summary(), 'text/plain;charset=utf-8');
    announce(live, 'Summary downloaded.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  twoStepReset(root, () => {
    (['org', 'issue', 'rq'] as const).forEach((k) => {
      const el = field(k);
      if (el) el.value = '';
    });
    [...boxes('sign'), ...boxes('test'), ...boxes('concept')].forEach((b) => (b.checked = false));
    store.remove(KEY);
    render();
    announce(live, 'Cleared.');
  });

  render();
});
