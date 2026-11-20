/**
 * Glossary search and filters: a query that narrows the list as it is typed
 * and forgives a slip in a term's name (src/lib/glossary.ts, matchesQuery),
 * kept in the address as ?q=; unit (or beyond the IB course), subtopic (kept
 * as ?topic=), level, category and qualification. Each part, the IB course
 * and beyond it, shows how many of its terms match; letters with nothing left
 * to show are struck through in the A to Z and their sections hidden. Without
 * JavaScript, every term is listed.
 */
import { each } from './ix';
import { findTerms, fold, type SearchFields } from '../lib/glossary';

each('[data-ix="glossary"]', (root) => {
  const input = root.querySelector<HTMLInputElement>('#gq');
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const selects = [...root.querySelectorAll<HTMLSelectElement>('[data-filter]')];
  const entries = [...root.querySelectorAll<HTMLElement>('[data-entry]')];
  const parts = [...root.querySelectorAll<HTMLElement>('[data-part]')];
  const letters = [...root.querySelectorAll<HTMLAnchorElement>('[data-letter]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const none = root.querySelector<HTMLElement>('[data-none]');
  if (!input) return;

  // Each entry is searched by its names, its plain explanation and its visible definition.
  const EMPTY: SearchFields = { names: '', text: '' };
  const fields = new Map<HTMLElement, SearchFields>(entries.map((e) => [e, { names: e.dataset.names ?? '', text: `${e.dataset.text ?? ''} ${fold(e.querySelector('.gl-entry__def')?.textContent ?? '')}` }]));

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') ?? '';
  const get = (k: string) => selects.find((s) => s.dataset.filter === k);
  const topic = get('topic');
  const asked = params.get('topic') ?? '';
  if (topic && [...topic.options].some((o) => o.value === asked)) topic.value = asked;
  const val = (k: string) => get(k)?.value ?? '';

  const run = () => {
    const unit = val('unit');
    const code = val('topic');
    const level = val('level');
    const cat = val('category');
    const qual = val('qualification');
    const query = input.value;
    const shownIn: Record<string, number> = {};
    const filtered = entries.filter(
      (e) =>
        (!unit || (e.dataset.units ?? '').split(' ').includes(unit)) &&
        (!code || (e.dataset.codes ?? '').split(' ').includes(code)) &&
        (!level || (level === 'hl' ? e.dataset.level === 'hl' : e.dataset.level !== 'hl')) &&
        (!cat || e.dataset.category === cat) &&
        (!qual || (e.dataset.qualification ?? '').split(' ').includes(qual)),
    );
    const { found, slipped } = findTerms(query, filtered, (e) => fields.get(e) ?? EMPTY);
    const keep = new Set(found);
    for (const e of entries) e.hidden = !keep.has(e);
    const shown = keep.size;
    for (const p of parts) {
      const name = p.dataset.part ?? '';
      let inPart = 0;
      for (const s of p.querySelectorAll<HTMLElement>('.gl-letter')) {
        const any = [...s.querySelectorAll<HTMLElement>('[data-entry]')].filter((e) => !e.hidden).length;
        s.hidden = any === 0;
        inPart += any;
        if (s.dataset.letterSection) letters.find((a) => a.dataset.letter === s.dataset.letterSection)?.classList.toggle('is-empty', any === 0);
      }
      shownIn[name] = inPart;
      p.hidden = inPart === 0;
      const total = p.querySelectorAll('[data-entry]').length;
      const n = p.querySelector<HTMLElement>(`[data-part-count="${name}"]`);
      const of = p.querySelector<HTMLElement>(`[data-part-of="${name}"]`);
      if (n) n.textContent = String(inPart);
      if (of) of.hidden = inPart === total;
      if (name === 'beyond') letters.find((a) => a.dataset.letter === 'beyond')?.classList.toggle('is-empty', inPart === 0);
    }
    const ibN = shownIn.ib ?? 0;
    const beyondN = shownIn.beyond ?? 0;
    const terms = (n: number) => `${n} ${n === 1 ? 'term' : 'terms'}`;
    if (count)
      count.textContent =
        shown === entries.length
          ? `${ibN} IB terms and ${beyondN} beyond the course`
          : `${terms(ibN)} from the IB course and ${beyondN} beyond it ${slipped ? `come close to "${query.trim()}", allowing for a slip in the spelling` : 'match'}`;
    if (none) none.hidden = shown > 0;
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    if (code) url.searchParams.set('topic', code);
    else url.searchParams.delete('topic');
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
