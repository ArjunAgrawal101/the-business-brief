/**
 * Search as you type. The page already lists every entry, grouped by kind;
 * this script filters and ranks them, shows a few of each kind until a kind
 * is chosen, keeps the query and filters in the address (?q=&kind=&unit=&level=),
 * and lets the arrow keys move from the box through the results.
 */
import { announce, each } from './ix';
import { SEARCH_KINDS, countWords, highlight, matches, normalize, parseState, passes, queryWords, rank, stateQuery, type SearchKind, type SearchState } from '../lib/search';
import { KIND_WEIGHT, editsFor, withinEdits } from '../lib/suggest';

/** Entries in the best matches across every kind. */
const BEST = 5;

/** Entries shown for each kind while every kind is shown. */
const PREVIEW = 5;

interface Entry {
  li: HTMLLIElement;
  a: HTMLAnchorElement;
  order: number;
  title: string;
  kind: SearchKind;
  units: string[];
  hl: boolean;
  /** The title and the keys, normalized, for ranking. */
  t: string;
  k: string;
  /** Everything matchable, normalized. */
  hay: string;
}

each('[data-ix="search"]', (root) => {
  const input = root.querySelector<HTMLInputElement>('#q');
  const form = root.querySelector<HTMLFormElement>('[data-search-form]');
  const unitSel = root.querySelector<HTMLSelectElement>('[data-f="unit"]');
  const levelSel = root.querySelector<HTMLSelectElement>('[data-f="level"]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const live = root.querySelector<HTMLElement>('[data-announce]');
  const none = root.querySelector<HTMLElement>('[data-none]');
  const results = root.querySelector<HTMLElement>('[data-results]');
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="kind"]')];
  const best = root.querySelector<HTMLElement>('[data-best]');
  const bestList = root.querySelector<HTMLOListElement>('[data-best-list]');
  const close = root.querySelector<HTMLElement>('[data-close]');
  const closeList = root.querySelector<HTMLOListElement>('[data-close-list]');
  if (!input || !results) return;

  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')].map((el) => {
    const kind = el.dataset.group as SearchKind;
    const entries: Entry[] = [...el.querySelectorAll<HTMLLIElement>('[data-entry]')].map((li, order) => {
      const a = li.querySelector<HTMLAnchorElement>('a') as HTMLAnchorElement;
      const title = a.textContent ?? '';
      const k = li.dataset.k ?? '';
      // Each piece of text on its own, so the end of one never runs into the start of the next.
      const text = [...li.querySelectorAll<HTMLElement>('a, span, p')].filter((el) => !el.children.length || el.tagName === 'A').map((el) => el.textContent ?? '').join(' ');
      return { li, a, order, title, kind, units: (li.dataset.units ?? '').split(' ').filter(Boolean), hl: li.dataset.hl === '1', t: normalize(title), k, hay: ` ${normalize(text)} ${k}` };
    });
    return {
      el,
      kind,
      label: SEARCH_KINDS.find((x) => x.id === kind),
      list: el.querySelector<HTMLOListElement>('ol'),
      n: el.querySelector<HTMLElement>('[data-group-n]'),
      more: el.querySelector<HTMLButtonElement>('[data-more]'),
      heading: el.querySelector<HTMLElement>('h2'),
      entries,
      /** The entries in their current order on the page. */
      current: entries,
    };
  });
  const facets = root.querySelector<HTMLDetailsElement>('[data-facets]');
  const facetsSum = root.querySelector<HTMLElement>('[data-facets-sum]');
  // Beside the results on a wide screen the filters are always open; on a narrow one they fold into a summary line.
  const wide = window.matchMedia('(min-width: 64rem)');
  const fold = () => {
    if (facets) facets.open = wide.matches;
  };
  wide.addEventListener('change', fold);
  fold();
  const kindCount = new Map([...root.querySelectorAll<HTMLElement>('[data-kind-n]')].map((el) => [el.dataset.kindN ?? '', el]));

  const read = (): SearchState => ({
    q: input.value,
    kind: (radios.find((r) => r.checked)?.value ?? '') as SearchKind | '',
    unit: unitSel?.value ?? '',
    level: (levelSel?.value ?? '') as SearchState['level'],
  });
  const write = (s: SearchState) => {
    input.value = s.q;
    radios.forEach((r) => (r.checked = r.value === s.kind));
    if (unitSel) unitSel.value = s.unit;
    if (levelSel) levelSel.value = s.level;
  };

  /** A copy of an entry's link, for the best matches and the close spellings. */
  const linkItem = (e: Entry, words: readonly string[]) => {
    const li = document.createElement('li');
    li.dataset.entry = '';
    const a = document.createElement('a');
    a.href = e.a.getAttribute('href') ?? '#';
    a.innerHTML = highlight(e.title, words);
    const p = document.createElement('p');
    const span = document.createElement('span');
    span.textContent = SEARCH_KINDS.find((k) => k.id === e.kind)?.label ?? '';
    p.append(span);
    li.append(a, p);
    return li;
  };

  let timer = 0;

  const run = (opts: { say?: boolean } = {}) => {
    const s = read();
    const words = queryWords(s.q);
    let shown = 0;
    let all = 0;
    for (const g of groups) {
      const hits = g.entries.filter((e) => passes(e, s, true) && matches(e.hay, words));
      const n = kindCount.get(g.kind);
      if (n) {
        n.textContent = hits.length.toLocaleString('en-GB');
        n.closest('.sx-kind')?.classList.toggle('is-zero', hits.length === 0);
      }
      all += hits.length;
      g.el.hidden = Boolean(s.kind && s.kind !== g.kind) || hits.length === 0;
      if (g.el.hidden) continue;
      shown += hits.length;
      // Best matches first; without a query, the page's own order.
      const ordered = words.length ? hits.map((e) => ({ e, r: rank(e.t, e.k, words) })).sort((a, b) => b.r - a.r || a.e.order - b.e.order).map((x) => x.e) : hits;
      const isHit = new Set(ordered);
      const desired = [...ordered, ...g.entries.filter((e) => !isHit.has(e))];
      if (desired.some((e, i) => g.current[i] !== e)) {
        g.list?.append(...desired.map((e) => e.li));
        g.current = desired;
      }
      const visible = new Set(s.kind ? ordered : ordered.slice(0, PREVIEW));
      for (const e of g.entries) {
        const on = visible.has(e);
        e.li.hidden = !on;
        if (!on) continue;
        if (words.length) e.a.innerHTML = highlight(e.title, words);
        else if (e.a.firstElementChild) e.a.textContent = e.title;
      }
      if (g.n) g.n.textContent = hits.length.toLocaleString('en-GB');
      if (g.more) {
        g.more.hidden = Boolean(s.kind) || hits.length <= PREVIEW;
        g.more.textContent = `Show all ${hits.length.toLocaleString('en-GB')} ${g.label?.many ?? ''}`.trim();
      }
    }
    const everything = kindCount.get('');
    if (everything) everything.textContent = all.toLocaleString('en-GB');
    if (none) none.hidden = shown > 0;

    // Best matches: every kind ranked together, as the header's suggestions are, while no kind is chosen.
    const pool = groups.filter((g) => !g.el.hidden).flatMap((g) => g.current.filter((e) => passes(e, s, true) && matches(e.hay, words)));
    const top: Entry[] = [];
    if (words.length && !s.kind) {
      const seen = new Set<string>();
      for (const { e } of pool.map((e) => ({ e, r: rank(e.t, e.k, words) + KIND_WEIGHT[e.kind] })).sort((a, b) => b.r - a.r || a.e.order - b.e.order)) {
        if (seen.has(e.t)) continue;
        seen.add(e.t);
        top.push(e);
        if (top.length >= BEST) break;
      }
    }
    if (best && bestList) {
      best.hidden = top.length < 2;
      bestList.replaceChildren(...(best.hidden ? [] : top.map((e) => linkItem(e, words))));
    }

    // Nothing found: offer entries whose title is a close spelling of every word.
    const near: Entry[] = [];
    if (!shown && words.some((w) => editsFor(w) > 0)) {
      const candidates = groups.flatMap((g) => g.entries).filter((e) => passes(e, s, true));
      const titles = new Set<string>();
      for (const e of candidates) {
        const key = e.t.replace(/^\d+ \d+ /, '');
        if (titles.has(key)) continue;
        const tw = e.t.split(' ');
        const ok = words.every((w) => tw.some((x) => x.startsWith(w) || (editsFor(w) > 0 && withinEdits(w, x.length > w.length ? x.slice(0, w.length) : x, editsFor(w)))));
        if (ok) {
          near.push(e);
          titles.add(key);
        }
      }
      near.sort((a, b) => KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind] || a.t.length - b.t.length);
    }
    if (close && closeList) {
      const shownNear = near.slice(0, 6);
      close.hidden = !shownNear.length;
      closeList.replaceChildren(...shownNear.map((e) => linkItem(e, [])));
    }

    const filtered = Boolean(words.length || s.kind || s.unit || s.level);
    const where = [
      s.kind ? `in ${SEARCH_KINDS.find((k) => k.id === s.kind)?.label.toLowerCase()}` : '',
      s.unit ? (s.unit === 'toolkit' ? 'for the toolkit' : `for unit ${s.unit}`) : '',
      s.level === 'sl' ? 'without HL-only entries' : s.level === 'hl' ? 'HL only' : '',
    ].filter(Boolean);
    const text = filtered ? `${countWords(shown, '')}${s.q.trim() ? ` for “${s.q.trim()}”` : ''}${where.length ? ` ${where.join(', ')}` : ''}` : `${shown.toLocaleString('en-GB')} entries`;
    if (count) count.textContent = text;
    if (facetsSum) {
      const unitLabel = s.unit ? (s.unit === 'toolkit' ? 'the toolkit' : `unit ${s.unit}`) : 'all units';
      const levelLabel = s.level === 'sl' ? 'no HL-only entries' : s.level === 'hl' ? 'HL only' : 'SL and HL';
      facetsSum.textContent = `${s.kind ? SEARCH_KINDS.find((k) => k.id === s.kind)?.label : 'Everything'}, ${unitLabel}, ${levelLabel}`;
    }
    window.clearTimeout(timer);
    if (opts.say !== false) timer = window.setTimeout(() => announce(live, text), 450);
    history.replaceState(history.state, '', `${location.pathname}${stateQuery({ ...s, q: s.q.trim() })}`);
  };

  const visibleLinks = () => [
    ...(best && !best.hidden ? [...best.querySelectorAll<HTMLAnchorElement>('a')] : []),
    ...groups.filter((g) => !g.el.hidden).flatMap((g) => g.current.filter((e) => !e.li.hidden).map((e) => e.a)),
    ...(close && !close.hidden ? [...close.querySelectorAll<HTMLAnchorElement>('a')] : []),
  ];

  // Start from the address.
  write(parseState(location.search));
  run({ say: false });

  input.addEventListener('input', () => run());
  radios.forEach((r) => r.addEventListener('change', () => run()));
  unitSel?.addEventListener('change', () => run());
  levelSel?.addEventListener('change', () => run());

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Enter in the box opens the best match.
    if (input.value.trim()) visibleLinks()[0]?.click();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown') return;
    const first = visibleLinks()[0];
    if (!first) return;
    e.preventDefault();
    first.focus();
  });

  results.addEventListener('keydown', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-entry] > a');
    if (!a) return;
    const list = visibleLinks();
    const i = list.indexOf(a);
    if (i === -1) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? list[i + 1] : list[i - 1];
      if (next) next.focus();
      else if (e.key === 'ArrowUp') input.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.focus();
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === 'End' && e.ctrlKey) {
      e.preventDefault();
      list[list.length - 1]?.focus();
    }
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn || !root.contains(btn)) return;
    if (btn.dataset.more) {
      const kind = btn.dataset.more;
      radios.forEach((r) => (r.checked = r.value === kind));
      run();
      const g = groups.find((x) => x.kind === kind);
      (g?.entries.find((x) => !x.li.hidden)?.a ?? g?.heading)?.focus();
    } else if (btn.dataset.clear !== undefined) {
      write({ q: '', kind: '', unit: '', level: '' });
      run();
      input.focus();
    }
  });

  // Return to the box, unless the address points into the page.
  if (!location.hash) input.focus({ preventScroll: true });
});
