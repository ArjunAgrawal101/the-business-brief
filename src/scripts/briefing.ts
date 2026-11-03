/**
 * The briefing's filters: unit, key concept and kind of development. They
 * hide the items that do not match, say how many are showing in a polite live
 * region, and keep the choice in the address (?unit=3&concept=ethics) so a
 * filtered list can be shared. Without JavaScript every item is listed and
 * the filters are not shown.
 */
import { each } from './ix';
import { filterSummary, filtersFromQuery, matches, queryFromFilters, type Filters } from '../lib/briefing';

each('[data-ix="briefing"]', (root) => {
  const selects = [...root.querySelectorAll<HTMLSelectElement>('select[data-filter]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-item]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const none = root.querySelector<HTMLElement>('[data-none]');
  const resets = [...root.querySelectorAll<HTMLButtonElement>('[data-reset]')];
  const select = (key: string) => selects.find((s) => s.dataset.filter === key);
  const offered = (key: string) => [...(select(key)?.options ?? [])].map((o) => o.value).filter(Boolean);
  const words = (v: string | undefined) => (v ?? '').split(' ').filter(Boolean);

  const current = (): Filters => ({
    unit: select('unit')?.value || undefined,
    concept: select('concept')?.value || undefined,
    kind: select('kind')?.value || undefined,
  });

  const run = () => {
    const f = current();
    let shown = 0;
    for (const row of rows) {
      const ok = matches({ units: words(row.dataset.units), concepts: words(row.dataset.concepts), categories: words(row.dataset.kinds) }, f);
      row.hidden = !ok;
      if (ok) shown += 1;
    }
    if (count) count.textContent = filterSummary(shown, rows.length);
    if (none) none.hidden = shown > 0;
    const active = Boolean(f.unit || f.concept || f.kind);
    // The Clear button in the filter bar is shown only when there is something to clear.
    resets.forEach((b) => {
      if (!b.closest('[data-none]')) b.hidden = !active;
    });
    history.replaceState(null, '', `${location.pathname}${queryFromFilters(f)}${location.hash}`);
  };

  // Start from the address, keeping only values the page offers.
  const start = filtersFromQuery(location.search, { units: offered('unit'), concepts: offered('concept'), kinds: offered('kind') });
  const unit = select('unit');
  const concept = select('concept');
  const kind = select('kind');
  if (unit) unit.value = start.unit ?? '';
  if (concept) concept.value = start.concept ?? '';
  if (kind) kind.value = start.kind ?? '';

  selects.forEach((s) => s.addEventListener('change', run));
  resets.forEach((b) =>
    b.addEventListener('click', () => {
      selects.forEach((s) => (s.value = ''));
      run();
      selects[0]?.focus();
    }),
  );
  run();
});
