/**
 * The Case Vault in the browser. The page is complete without this script:
 * the whole archive is listed, and the Case of the Week is the one for the
 * week of the build, which it says. This script chooses the Case of the Week
 * for the ISO week of the reader's own date, and runs the filters, the
 * keyword search and the order, keeping the selection in the address.
 */
import {
  caseOfTheWeek,
  calendarDate,
  countText,
  facetCounts,
  filterCases,
  filtersFromQuery,
  NO_FILTERS,
  queryFromFilters,
  renderFeature,
  sortCases,
  type CalendarDate,
  type SortKey,
  type VaultCase,
  type VaultFilters,
} from '../lib/case-vault';
import { announce, each, readConfig } from './ix';

/* ---------- The Case of the Week ---------- */

each('[data-ix="case-of-the-week"]', (root) => {
  const cfg = readConfig<{ order: string[]; cases: VaultCase[]; built: CalendarDate }>(root);
  const slot = root.querySelector<HTMLElement>('[data-feature]');
  const pick = caseOfTheWeek(cfg.order, calendarDate(new Date(), 'local'));
  const vc = pick ? cfg.cases.find((x) => x.id === pick.id) : undefined;
  if (!slot || !pick || !vc) return;
  slot.innerHTML = renderFeature(vc, pick, { basis: 'reader' });
  root.dataset.week = `${pick.year}-W${String(pick.week).padStart(2, '0')}`;
  root.dataset.featured = vc.id;
});

/* ---------- The archive ---------- */

const FACETS = ['industry', 'function', 'difficulty', 'qualification', 'topic', 'concept', 'type'] as const;

each('[data-ix="case-vault"]', (root) => {
  const { cases } = readConfig<{ cases: VaultCase[] }>(root);
  const form = root.querySelector<HTMLFormElement>('[data-filters]');
  const list = root.querySelector<HTMLOListElement>('[data-list]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  if (!form || !list) throw new Error('The archive markup is incomplete');
  const items = new Map<string, HTMLLIElement>();
  list.querySelectorAll<HTMLLIElement>('li[data-case]').forEach((li) => items.set(li.dataset.case ?? '', li));
  const control = <T extends HTMLElement>(name: string) => form.elements.namedItem(name) as T | null;

  const read = (): { filters: VaultFilters; sort: SortKey } => {
    const filters = { ...NO_FILTERS };
    for (const k of FACETS) filters[k] = control<HTMLSelectElement>(k)?.value ?? '';
    filters.q = control<HTMLInputElement>('q')?.value ?? '';
    const sort = (control<HTMLSelectElement>('sort')?.value ?? 'title') as SortKey;
    return { filters, sort };
  };

  const write = (filters: VaultFilters, sort: SortKey) => {
    for (const k of FACETS) {
      const sel = control<HTMLSelectElement>(k);
      if (!sel) continue;
      // Ignore a value from the address that this archive does not offer.
      sel.value = [...sel.options].some((o) => o.value === filters[k]) ? filters[k] : '';
    }
    const q = control<HTMLInputElement>('q');
    if (q) q.value = filters.q;
    const s = control<HTMLSelectElement>('sort');
    if (s) s.value = sort;
  };

  /** Each option shows how many cases it would leave, given the other filters; an option that would leave none is disabled. */
  const updateCounts = (filters: VaultFilters) => {
    for (const k of FACETS) {
      const sel = control<HTMLSelectElement>(k);
      if (!sel) continue;
      const options = [...sel.options].filter((o) => o.value);
      const counts = facetCounts(
        cases,
        filters,
        k,
        options.map((o) => o.value),
      );
      for (const o of options) {
        const n = counts[o.value] ?? 0;
        o.textContent = `${o.dataset.label ?? o.value} (${n})`;
        o.disabled = n === 0 && sel.value !== o.value;
      }
    }
  };

  const apply = (speak: boolean) => {
    const { filters, sort } = read();
    const shown = new Set(filterCases(cases, filters).map((x) => x.id));
    for (const vc of sortCases(cases, sort)) {
      const li = items.get(vc.id);
      if (!li) continue;
      li.hidden = !shown.has(vc.id);
      list.append(li);
    }
    updateCounts(filters);
    const active = FACETS.filter((k) => filters[k]).length;
    const badge = form.querySelector<HTMLElement>('[data-active]');
    if (badge) badge.textContent = active ? `${active} in use` : '';
    const text = countText(shown.size, cases.length);
    if (count) {
      if (speak) announce(count, text);
      else count.textContent = text;
    }
    if (empty) empty.hidden = shown.size > 0;
    const query = queryFromFilters(filters, sort);
    if (query !== location.search && !(query === '' && location.search === '')) {
      history.replaceState(history.state, '', `${location.pathname}${query}${location.hash}`);
    }
  };

  const start = filtersFromQuery(location.search);
  write(start.filters, start.sort);
  apply(false);
  // On a narrow screen the filters start folded, unless the address already uses one.
  const more = form.querySelector<HTMLDetailsElement>('details[data-more]');
  if (more && window.matchMedia('(max-width: 47.99rem)').matches && !FACETS.some((k) => start.filters[k])) more.open = false;

  form.addEventListener('change', () => apply(true));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    apply(true);
  });
  let timer = 0;
  control<HTMLInputElement>('q')?.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => apply(true), 180);
  });
  form.querySelector<HTMLButtonElement>('[data-clear]')?.addEventListener('click', () => {
    write(NO_FILTERS, 'title');
    apply(true);
    control<HTMLInputElement>('q')?.focus();
  });
});
