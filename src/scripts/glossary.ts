/**
 * Glossary search and filters: a query that narrows the list as it is typed
 * (kept in the address as ?q=), unit (or beyond the IB course), level,
 * category and qualification. Letters with nothing left to show are dimmed
 * and their sections hidden. Without JavaScript, every term is listed.
 */
import { each } from './ix';

each('[data-ix="glossary"]', (root) => {
  const input = root.querySelector<HTMLInputElement>('#gq');
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const selects = [...root.querySelectorAll<HTMLSelectElement>('[data-filter]')];
  const entries = [...root.querySelectorAll<HTMLElement>('[data-entry]')];
  const sections = [...root.querySelectorAll<HTMLElement>('[data-letter-section]')];
  const letters = [...root.querySelectorAll<HTMLAnchorElement>('[data-letter]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const none = root.querySelector<HTMLElement>('[data-none]');
  if (!input) return;

  // Each entry is searched by its names and plain explanation (data-text) and by its visible definition.
  const texts = new Map(entries.map((e) => [e, `${e.dataset.text ?? ''} ${e.querySelector('.gl-entry__def')?.textContent ?? ''}`.toLowerCase()]));

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') ?? '';
  const get = (k: string) => selects.find((s) => s.dataset.filter === k)?.value ?? '';

  const run = () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const unit = get('unit');
    const level = get('level');
    const cat = get('category');
    const qual = get('qualification');
    let shown = 0;
    for (const e of entries) {
      const ok =
        words.every((w) => (texts.get(e) ?? '').includes(w)) &&
        (!unit || (e.dataset.units ?? '').split(' ').includes(unit)) &&
        (!level || (level === 'hl' ? e.dataset.level === 'hl' : e.dataset.level !== 'hl')) &&
        (!cat || e.dataset.category === cat) &&
        (!qual || (e.dataset.qualification ?? '').split(' ').includes(qual));
      e.hidden = !ok;
      if (ok) shown += 1;
    }
    for (const s of sections) {
      const any = [...s.querySelectorAll<HTMLElement>('[data-entry]')].some((e) => !e.hidden);
      s.hidden = !any;
      letters.find((a) => a.dataset.letter === s.dataset.letterSection)?.classList.toggle('is-empty', !any);
    }
    if (count) count.textContent = `${shown} ${shown === 1 ? 'term' : 'terms'}`;
    if (none) none.hidden = shown > 0;
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  };

  input.addEventListener('input', run);
  selects.forEach((s) => s.addEventListener('change', run));
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
  });
  run();
});
