/**
 * The Resources Library in the browser. The page is complete without this
 * script: every resource is listed, category by category. This script adds
 * the search, the filters (behind one Filter button on a phone), the counts
 * each choice would leave, cards or a list, the order, "Show more", and keeps
 * the selection in the address so it can be shared. It stores nothing.
 */
import { announce, each, readConfig } from './ix';
import { LIBRARY_CATEGORIES } from '../lib/library/categories';
import {
  activeCount,
  countText,
  facetCounts,
  filterItems,
  filtersFromQuery,
  fold,
  NO_FILTERS,
  queryFromFilters,
  shownCount,
  sortFacets,
  type FacetKey,
  type Facets,
  type LibraryFilters,
  type Sort,
  type View,
} from '../lib/library/filter';

interface Config {
  items: Facets[];
  subtopics: string[];
}

const NARROW = '(max-width: 63.99rem)';
const SELECTS: FacetKey[] = ['unit', 'subtopic', 'format', 'audience', 'scope'];

each('[data-ix="library"]', (root) => {
  const cfg = readConfig<Config>(root);
  const total = cfg.items.length;
  const q = root.querySelector<HTMLInputElement>('[data-q]');
  const form = root.querySelector<HTMLFormElement>('[data-filters]');
  const panel = root.querySelector<HTMLElement>('#lib-panel');
  const toggle = root.querySelector<HTMLButtonElement>('[data-filter-toggle]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const results = root.querySelector<HTMLElement>('#lib-results');
  const sortSel = root.querySelector<HTMLSelectElement>('[data-sort]');
  if (!q || !form || !panel || !results) throw new Error('The library markup is incomplete');

  const rows = new Map<string, HTMLLIElement>();
  root.querySelectorAll<HTMLLIElement>('li[data-id]').forEach((li) => rows.set(li.dataset.id ?? '', li));
  // Each item's search text: what its card says, and the words it carries for the search alone.
  for (const f of cfg.items) {
    const li = rows.get(f.id);
    if (li) f.text = fold(`${li.textContent ?? ''} ${li.dataset.k ?? ''}`).replace(/\s+/g, ' ');
  }
  const sections = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-cat-section]').forEach((s) => sections.set(s.dataset.catSection ?? '', s));

  let filters: LibraryFilters = { ...NO_FILTERS };
  let view: View = 'cards';
  let sort: Sort = 'course';
  /** "Show more" pages opened in each category, reset whenever the selection changes. */
  let pages = new Map<string, number>();

  const control = <T extends HTMLElement>(name: string) => form.elements.namedItem(name) as T | null;

  const write = () => {
    q.value = filters.q;
    for (const k of SELECTS) {
      const sel = control<HTMLSelectElement>(k);
      if (sel) sel.value = filters[k];
    }
    form.querySelectorAll<HTMLInputElement>('input[name="level"]').forEach((r) => (r.checked = r.value === filters.level));
    if (sortSel) sortSel.value = sort;
  };

  const read = () => {
    const next: LibraryFilters = { ...filters, q: q.value };
    for (const k of SELECTS) {
      const sel = control<HTMLSelectElement>(k);
      (next as unknown as Record<string, string>)[k] = sel?.value ?? '';
    }
    next.level = (form.querySelector<HTMLInputElement>('input[name="level"]:checked')?.value ?? '') as LibraryFilters['level'];
    filters = next;
  };

  /** Each option shows how many resources it would leave, given the other filters; one that would leave none is disabled. */
  const updateCounts = () => {
    for (const k of SELECTS) {
      const sel = control<HTMLSelectElement>(k);
      if (!sel) continue;
      const options = [...sel.options].filter((o) => o.value);
      const counts = facetCounts(
        cfg.items,
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
    const byCat = facetCounts(cfg.items, filters, 'category', [...LIBRARY_CATEGORIES]);
    root.querySelectorAll<HTMLElement>('[data-cat-n]').forEach((el) => {
      const id = el.dataset.catN ?? '';
      el.textContent = String(id ? (byCat[id] ?? 0) : filterItems(cfg.items, { ...filters, category: '' }).length);
    });
    root.querySelectorAll<HTMLAnchorElement>('a[data-cat]').forEach((a) => {
      const id = a.dataset.cat ?? '';
      if (id === filters.category) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const apply = (speak: boolean) => {
    const matched = new Set(filterItems(cfg.items, filters).map((f) => f.id));
    const ordered = sortFacets(cfg.items, sort);
    const narrowed = activeCount(filters) > 0 || filters.q.trim() !== '';
    let shownTotal = 0;
    for (const [id, section] of sections) {
      const list = section.querySelector<HTMLUListElement>('ul.lib-items');
      const mine = ordered.filter((f) => f.category === id);
      const matching = mine.filter((f) => matched.has(f.id));
      const chosen = filters.category === id;
      const shown = shownCount(matching.length, view, chosen, pages.get(id) ?? 0);
      matching.forEach((f, i) => {
        const li = rows.get(f.id);
        if (!li) return;
        li.hidden = i >= shown;
        list?.append(li);
      });
      for (const f of mine) {
        const li = rows.get(f.id);
        if (li && !matched.has(f.id)) {
          li.hidden = true;
          list?.append(li);
        }
      }
      shownTotal += matching.length;
      const isMissing = section.classList.contains('lib-cat--missing');
      section.hidden = isMissing ? !(chosen || (!narrowed && !filters.category)) : matching.length === 0 || (filters.category !== '' && !chosen);
      const n = section.querySelector<HTMLElement>('[data-cat-count]');
      if (n) n.textContent = matching.length === mine.length ? String(mine.length) : `${matching.length} of ${mine.length}`;
      const more = section.querySelector<HTMLElement>('[data-more-row]');
      const btn = section.querySelector<HTMLButtonElement>('[data-more]');
      const label = section.querySelector<HTMLElement>('[data-shown]');
      if (more && btn && label) {
        more.hidden = shown >= matching.length;
        btn.textContent = chosen ? `Show ${Math.min(24, matching.length - shown)} more` : `Show all ${matching.length}`;
        label.textContent = `Showing ${shown} of ${matching.length}`;
      }
    }
    updateCounts();
    const active = activeCount(filters);
    const badge = root.querySelector<HTMLElement>('[data-active]');
    if (badge) badge.textContent = active ? ` (${active} in use)` : '';
    const text = countText(shownTotal, total);
    if (count) {
      if (speak) announce(count, text);
      else count.textContent = text;
    }
    if (empty) empty.hidden = shownTotal > 0 || filters.category === 'presentations';
    root.dataset.view = view;
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    const query = queryFromFilters(filters, view, sort);
    if (query !== location.search) history.replaceState(history.state, '', `${location.pathname}${query}${location.hash}`);
  };

  const update = (speak = true) => {
    pages = new Map();
    apply(speak);
  };

  /* ---------- The Filter button and the panel ---------- */
  const narrow = window.matchMedia(NARROW);
  const setOpen = (open: boolean) => {
    panel.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
  toggle?.addEventListener('click', () => {
    const open = !panel.classList.contains('is-open');
    setOpen(open);
    if (open) panel.querySelector<HTMLElement>('a[data-cat], select, input')?.focus();
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && narrow.matches && panel.classList.contains('is-open')) {
      setOpen(false);
      toggle?.focus();
    }
  });
  root.querySelector<HTMLButtonElement>('[data-done]')?.addEventListener('click', () => {
    setOpen(false);
    results.focus();
  });

  /* ---------- Choosing ---------- */
  const choose = (patch: Partial<LibraryFilters>, focusSection?: string) => {
    filters = { ...filters, ...patch };
    write();
    update(true);
    if (narrow.matches) setOpen(false);
    const target = focusSection ? sections.get(focusSection)?.querySelector<HTMLElement>('h2') : results;
    target?.focus();
  };

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const cat = t.closest<HTMLAnchorElement>('a[data-cat]');
    if (cat) {
      e.preventDefault();
      const id = cat.dataset.cat ?? '';
      choose({ category: id as LibraryFilters['category'] }, id || undefined);
      return;
    }
    const tag = t.closest<HTMLAnchorElement>('a[data-subtopic]');
    if (tag) {
      e.preventDefault();
      choose({ subtopic: tag.dataset.subtopic ?? '' });
      return;
    }
    const more = t.closest<HTMLButtonElement>('button[data-more]');
    if (more) {
      const id = more.dataset.more ?? '';
      if (filters.category !== id) {
        choose({ category: id as LibraryFilters['category'] }, id);
        return;
      }
      const section = sections.get(id);
      const before = section ? [...section.querySelectorAll<HTMLLIElement>('li[data-id]:not([hidden])')].length : 0;
      pages.set(id, (pages.get(id) ?? 0) + 1);
      apply(true);
      // Keep the keyboard where the reader was: on the first of the items just shown.
      section?.querySelectorAll<HTMLLIElement>('li[data-id]:not([hidden])')[before]?.querySelector<HTMLAnchorElement>('h3 a')?.focus();
      return;
    }
    const v = t.closest<HTMLButtonElement>('button[data-view]');
    if (v) {
      view = v.dataset.view === 'list' ? 'list' : 'cards';
      apply(false);
      return;
    }
    if (t.closest('[data-clear]')) {
      const all = Boolean(t.closest('[data-empty]'));
      filters = { ...NO_FILTERS, q: all ? '' : filters.q };
      write();
      update(true);
      q.focus();
      return;
    }
    if (t.closest('[data-print]')) window.print();
  });

  form.addEventListener('change', () => {
    read();
    update(true);
  });
  root.querySelector<HTMLFormElement>('[data-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    read();
    update(true);
  });
  let timer = 0;
  q.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      read();
      update(true);
    }, 180);
  });
  sortSel?.addEventListener('change', () => {
    sort = sortSel.value === 'title' ? 'title' : 'course';
    apply(true);
  });

  /* ---------- Start from the address ---------- */
  const start = filtersFromQuery(location.search, { subtopics: cfg.subtopics });
  filters = start.filters;
  view = start.view;
  sort = start.sort;
  write();
  apply(false);
});
