/**
 * The Framework Application Lab's chooser: the question, the purpose and the
 * standing narrow the list of questions and the frameworks under each. A
 * question with no framework left is hidden, the count is announced, and the
 * chosen question is kept in the address (#q-<id>) so that it can be shared
 * or opened from another page. Without JavaScript every question is listed.
 */
import { each } from './ix';

each('[data-ix="fw-lab"]', (root) => {
  const selects = [...root.querySelectorAll<HTMLSelectElement>('[data-filter]')];
  const questions = [...root.querySelectorAll<HTMLElement>('[data-decision]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const none = root.querySelector<HTMLElement>('[data-none]');
  const get = (k: string) => selects.find((s) => s.dataset.filter === k);
  const question = get('question');

  const run = (fromHash = false) => {
    const q = question?.value ?? '';
    const group = get('group')?.value ?? '';
    const status = get('status')?.value ?? '';
    // Frameworks offered, counted once however many questions they appear under.
    const shown = new Set<string>();
    let qs = 0;
    let n = 0;
    for (const el of questions) {
      const fws = [...el.querySelectorAll<HTMLElement>('[data-fw]')];
      for (const fw of fws) fw.hidden = Boolean((group && fw.dataset.group !== group) || (status && fw.dataset.status !== status));
      const visible = fws.filter((fw) => !fw.hidden);
      el.hidden = !visible.length || Boolean(q && el.dataset.decision !== q);
      if (el.hidden) continue;
      qs += 1;
      n += visible.length;
      visible.forEach((fw) => shown.add(fw.querySelector('a')?.getAttribute('href') ?? ''));
    }
    if (count) count.textContent = qs ? `${qs} ${qs === 1 ? 'question' : 'questions'}, ${n} ${n === 1 ? 'suggestion' : 'suggestions'} from ${shown.size} ${shown.size === 1 ? 'framework' : 'frameworks'}` : 'Nothing matches';
    if (none) none.hidden = qs > 0;
    if (!fromHash) {
      const hash = q ? `#q-${q}` : '';
      if (location.hash !== hash) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    }
  };

  const fromAddress = () => {
    const m = /^#q-([a-z-]+)$/.exec(location.hash);
    if (question && m && [...question.options].some((o) => o.value === m[1])) question.value = m[1] ?? '';
  };

  selects.forEach((s) => s.addEventListener('change', () => run()));
  window.addEventListener('hashchange', () => {
    fromAddress();
    run(true);
  });
  fromAddress();
  run(true);
});
