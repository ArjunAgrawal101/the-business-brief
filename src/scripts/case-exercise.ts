/**
 * The decision exercise on a case file. The learner chooses an alternative,
 * writes the reasons and commits; the page then shows how the debrief judges
 * that alternative, opens the debrief and marks the choice in it. The decision
 * and the draft are kept on this device (key "bb:case:<id>"), and can be copied.
 */
import { decisionText, wordCount, wordsText } from '../lib/case-vault';
import { announce, each, readConfig, store } from './ix';

interface Saved {
  choice?: string;
  reasons?: string;
  committed?: string;
}

each('[data-ix="case-exercise"]', (root) => {
  const cfg = readConfig<{ id: string; title: string; options: Array<{ id: string; label: string }> }>(root);
  const key = `case:${cfg.id}`;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const reasons = form?.querySelector<HTMLTextAreaElement>('textarea');
  if (!form || !reasons) throw new Error('The exercise markup is incomplete');
  const radios = [...form.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const words = form.querySelector<HTMLElement>('[data-words]');
  const err = form.querySelector<HTMLElement>('[data-err]');
  const status = form.querySelector<HTMLElement>('[data-status]');
  const copy = form.querySelector<HTMLButtonElement>('[data-copy]');
  const result = root.querySelector<HTMLElement>('[data-result]');
  const debrief = document.querySelector<HTMLDetailsElement>('[data-debrief]');
  const label = (id: string) => cfg.options.find((o) => o.id === id)?.label ?? id;
  const chosen = () => radios.find((r) => r.checked)?.value ?? '';

  const countWords = () => {
    if (words) words.textContent = wordsText(wordCount(reasons.value));
  };

  const mark = (choice: string) => {
    document.querySelectorAll<HTMLElement>('[data-debrief-option]').forEach((el) => {
      const mine = el.dataset.debriefOption === choice;
      el.classList.toggle('is-chosen', mine);
      const tag = el.querySelector<HTMLElement>('[data-yours]');
      if (tag) tag.hidden = !mine;
    });
  };

  const showResult = (choice: string, focus: boolean) => {
    if (!result) return;
    const judged = document.querySelector<HTMLElement>(`[data-debrief-option="${CSS.escape(choice)}"]`);
    const choiceEl = result.querySelector<HTMLElement>('[data-result-choice]');
    const fitEl = result.querySelector<HTMLElement>('[data-result-fit]');
    const bodyEl = result.querySelector<HTMLElement>('[data-result-body]');
    if (choiceEl) choiceEl.textContent = label(choice);
    if (fitEl) fitEl.innerHTML = judged?.querySelector('[data-fit]')?.outerHTML ?? '';
    if (bodyEl) bodyEl.innerHTML = judged?.querySelector('[data-body]')?.innerHTML ?? '';
    result.hidden = false;
    mark(choice);
    if (debrief) debrief.open = true;
    if (focus) result.focus();
  };

  const setError = (on: boolean) => {
    if (err) err.hidden = !on;
    radios.forEach((r) => (on ? r.setAttribute('aria-invalid', 'true') : r.removeAttribute('aria-invalid')));
  };

  // Restore what this browser kept.
  const saved = store.get<Saved>(key, {});
  if (saved.choice) radios.forEach((r) => (r.checked = r.value === saved.choice));
  if (saved.reasons) reasons.value = saved.reasons;
  countWords();
  if (saved.committed && saved.choice) {
    showResult(saved.choice, false);
    if (status) status.textContent = `You committed to this decision on ${saved.committed}. Change it and commit again at any time.`;
  }

  let timer = 0;
  reasons.addEventListener('input', () => {
    countWords();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => store.set(key, { ...store.get<Saved>(key, {}), reasons: reasons.value }), 400);
  });
  form.addEventListener('change', (e) => {
    if ((e.target as HTMLElement).matches('input[type="radio"]')) {
      setError(false);
      store.set(key, { ...store.get<Saved>(key, {}), choice: chosen() });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const choice = chosen();
    if (!choice) {
      setError(true);
      radios[0]?.focus();
      announce(status, 'Choose one alternative before you commit.');
      return;
    }
    setError(false);
    const committed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    store.set(key, { choice, reasons: reasons.value, committed });
    showResult(choice, true);
    announce(status, `Decision kept on this device: ${label(choice)}. The debrief is open below.`);
  });

  form.querySelector<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => {
    store.remove(key);
    radios.forEach((r) => (r.checked = false));
    reasons.value = '';
    countWords();
    setError(false);
    if (result) result.hidden = true;
    mark('');
    announce(status, 'Cleared. Your decision has been removed from this device.');
    radios[0]?.focus();
  });

  // Copying needs the clipboard; without it the button stays hidden rather than doing nothing.
  if (copy && navigator.clipboard?.writeText) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      const choice = chosen();
      const text = decisionText(cfg.title, choice ? label(choice) : '(No alternative chosen yet.)', reasons.value, store.get<Saved>(key, {}).committed);
      try {
        await navigator.clipboard.writeText(text);
        announce(status, 'Copied your decision and reasons to the clipboard.');
      } catch {
        announce(status, 'The browser did not allow copying. Select the text in the box and copy it instead.');
      }
    });
  }
});
