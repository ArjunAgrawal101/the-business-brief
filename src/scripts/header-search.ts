/**
 * The header's search panel. On first opening it loads the compact index
 * (/search.json) and from then on suggests the best matches as the reader
 * types, every kind ranked together (src/lib/suggest.ts). With the box empty
 * it lists the pages this browser opened most recently, read from the
 * learner record that stays on this device. Arrow keys move between the box
 * and the suggestions; Enter on the box opens the full search page.
 */
import { prepare, suggest, type Prepared, type Suggestion } from '../lib/suggest';
import { highlight, queryWords } from '../lib/search';
import { LEARNER_KEY, parseLog, type VisitKind } from '../lib/learner';

const VISIT_LABEL: Record<VisitKind, string> = {
  topic: 'Subtopic',
  mindmap: 'Mindmap',
  case: 'Case',
  framework: 'Framework',
  tool: 'Tool',
};

const root = document.querySelector<HTMLDetailsElement>('[data-hsearch]');
const input = root?.querySelector<HTMLInputElement>('[data-hs-input]');
const status = root?.querySelector<HTMLElement>('[data-hs-status]');
const results = root?.querySelector<HTMLElement>('[data-hs-results]');
const list = root?.querySelector<HTMLUListElement>('[data-hs-list]');
const all = root?.querySelector<HTMLAnchorElement>('[data-hs-all]');
const recent = root?.querySelector<HTMLElement>('[data-hs-recent]');
const recentList = root?.querySelector<HTMLUListElement>('[data-hs-recent-list]');

if (root && input && status && results && list && all && recent && recentList) {
  const HINT = status.textContent ?? '';
  let index: Prepared[] | null = null;
  let loading: Promise<void> | null = null;

  const load = () =>
    (loading ??= fetch('/search.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        index = prepare(j);
      })
      .catch(() => {
        index = [];
      }));

  const row = (title: string, url: string, meta: string, words: readonly string[] = []) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    const t = document.createElement('span');
    t.className = 'hsearch__t';
    t.innerHTML = highlight(title, words);
    const m = document.createElement('span');
    m.className = 'hsearch__meta';
    m.textContent = meta;
    a.append(t, m);
    li.append(a);
    return li;
  };

  const metaOf = (s: Suggestion) => [s.type, s.codes.slice(0, 2).join(', '), s.hl ? 'HL' : ''].filter(Boolean).join(' · ');

  const showRecent = () => {
    let visits: Array<{ title: string; url: string; kind: VisitKind }>;
    try {
      visits = parseLog(JSON.parse(localStorage.getItem(LEARNER_KEY) ?? 'null')).visits;
    } catch {
      visits = [];
    }
    const here = location.pathname;
    const shown = visits.filter((v) => v.url !== here).slice(0, 6);
    recentList.replaceChildren(...shown.map((v) => row(v.title, v.url, VISIT_LABEL[v.kind])));
    recent.hidden = !shown.length;
  };

  const render = () => {
    const q = input.value.trim();
    all.href = q ? `/search/?q=${encodeURIComponent(q)}` : '/search/';
    if (!q) {
      results.hidden = true;
      list.replaceChildren();
      status.textContent = HINT;
      showRecent();
      return;
    }
    recent.hidden = true;
    if (!index) {
      status.textContent = 'Loading suggestions.';
      void load().then(render);
      return;
    }
    const words = queryWords(q);
    const top = suggest(index, q, 8);
    list.replaceChildren(...top.map((s) => row(s.title, s.url, metaOf(s), words)));
    results.hidden = false;
    status.textContent = top.length
      ? `${top.length} ${top.length === 1 ? 'suggestion' : 'suggestions'}${top.some((s) => s.fuzzy) ? ', some for a close spelling' : ''}. Press Enter for every result.`
      : 'No suggestions. Press Enter to search the whole platform.';
  };

  const links = () => [...root.querySelectorAll<HTMLAnchorElement>('[data-hs-results]:not([hidden]) a, [data-hs-recent]:not([hidden]) a')];

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      const first = links()[0];
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  root.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t === input || !(t instanceof HTMLAnchorElement) || !t.closest('.hsearch__list, .hsearch__all')) return;
    const ls = links();
    const i = ls.indexOf(t);
    if (e.key === 'ArrowDown' && i < ls.length - 1) {
      e.preventDefault();
      ls[i + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i > 0) ls[i - 1]?.focus();
      else input.focus();
    }
  });
  root.addEventListener('toggle', () => {
    if (!root.open) return;
    void load();
    render();
    input.focus();
  });
}
