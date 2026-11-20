/**
 * The Framework Comparison Tool in the browser: choose two frameworks (from
 * the lists or by searching the library), and the page fetches each one's
 * column (/frameworks/compare/data/<id>.json, written by the build) and lays
 * them side by side with the same grid the curated pages use. The pair is
 * kept in the address, so a comparison can be shared. Where the pair has a
 * curated comparison, or is the library's own PESTLE against STEEPLE page,
 * the tool says so and links to it.
 */
import { gridHtml, type Column } from '../lib/compare/grid';
import { announce, each, escapeHtml, readConfig } from './ix';

interface Entry {
  id: string;
  name: string;
  aliases: string[];
  summary: string;
  group: string;
  status: string;
  hl: boolean;
}

interface Config {
  index: Entry[];
  curated: Array<{ slug: string; title: string; href: string; sides: string[]; words: string }>;
  pestle: { a: string; b: string; href: string; name: string };
  dims: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
/** Every word typed starts a word of the text: "motiv hyg" finds Herzberg's motivation-hygiene theory. */
const matches = (text: string, typed: string[]) => {
  const ws = words(text);
  return typed.every((t) => ws.some((w) => w.startsWith(t)));
};

each('[data-ix="fw-compare"]', (root) => {
  const cfg = readConfig<Config>(root);
  const pick = (k: 'a' | 'b') => root.querySelector<HTMLSelectElement>(`[data-pick="${k}"]`)!;
  const a = pick('a');
  const b = pick('b');
  const out = root.querySelector<HTMLElement>('[data-output]')!;
  const results = root.querySelector<HTMLElement>('[data-results]')!;
  const q = root.querySelector<HTMLInputElement>('[data-q]')!;
  const status = root.querySelector<HTMLElement>('[data-status]');
  const empty = out.innerHTML;
  const known = new Set(cfg.index.map((e) => e.id));
  const nameOf = (id: string) => cfg.index.find((e) => e.id === id)?.name ?? id;
  const cache = new Map<string, Promise<Column>>();

  const column = (id: string): Promise<Column> => {
    let p = cache.get(id);
    if (!p) {
      p = fetch(`/frameworks/compare/data/${encodeURIComponent(id)}.json`).then((r) => {
        if (!r.ok) throw new Error(`No data for ${id}`);
        return r.json() as Promise<Column>;
      });
      p.catch(() => cache.delete(id));
      cache.set(id, p);
    }
    return p;
  };

  const writeAddress = () => {
    const params = new URLSearchParams(location.search);
    params.delete('a');
    params.delete('b');
    if (a.value) params.set('a', a.value);
    if (b.value) params.set('b', b.value);
    const s = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`);
  };

  let ticket = 0;
  const show = async () => {
    const ia = a.value;
    const ib = b.value;
    writeAddress();
    if (!ia || !ib) {
      out.innerHTML = empty;
      return;
    }
    if (ia === ib) {
      out.innerHTML = '<p class="cmp-notice">Choose two different frameworks to compare.</p>';
      announce(status, 'Choose two different frameworks to compare.');
      return;
    }
    const mine = ++ticket;
    out.setAttribute('aria-busy', 'true');
    try {
      const [ca, cb] = await Promise.all([column(ia), column(ib)]);
      if (mine !== ticket) return;
      const notices: string[] = [];
      const cur = cfg.curated.find((c) => c.sides.includes(ia) && c.sides.includes(ib));
      if (cur) notices.push(`<p class="cmp-notice">There is a curated comparison of these, written for the course with advice for the exam: <a href="${escapeHtml(cur.href)}">${escapeHtml(cur.title)}</a>.</p>`);
      if ([ia, ib].includes(cfg.pestle.a) && [ia, ib].includes(cfg.pestle.b))
        notices.push(`<p class="cmp-notice">The library already compares these on one page: <a href="${escapeHtml(cfg.pestle.href)}">${escapeHtml(cfg.pestle.name)}</a>. The columns below come from the two entries.</p>`);
      out.innerHTML = `<h2 class="cmp-out__h" id="cmp-out-h">${escapeHtml(ca.name)} <span class="cmp-out__vs">against</span> ${escapeHtml(cb.name)}</h2>${notices.join('')}${gridHtml([ca, cb], 3)}`;
      announce(status, `Comparing ${ca.name} and ${cb.name}.${cur ? ' A curated comparison of the two is linked above the grid.' : ''}`);
    } catch {
      if (mine !== ticket) return;
      out.innerHTML = '<p class="state state--error">The comparison could not be loaded. Try again, or open each framework’s own page from the list below.</p>';
      announce(status, 'The comparison could not be loaded.');
    } finally {
      if (mine === ticket) out.removeAttribute('aria-busy');
    }
  };

  const search = () => {
    const typed = words(q.value);
    if (!typed.length) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }
    const hits = cfg.index.filter((e) => matches([e.name, ...e.aliases, e.summary, e.group].join(' '), typed));
    const cur = cfg.curated.filter((c) => matches(c.words, typed)).slice(0, 4);
    results.innerHTML = `<p class="cmp-results__count">${hits.length === 0 ? 'No framework matches' : `${hits.length} ${hits.length === 1 ? 'framework matches' : 'frameworks match'}`} “${escapeHtml(q.value.trim().slice(0, 60))}”.</p>${
      hits.length
        ? `<ul class="cmp-results__list">${hits
            .slice(0, 10)
            .map(
              (e) =>
                `<li><span class="cmp-results__name">${escapeHtml(e.name)}</span><span class="cmp-results__meta">${escapeHtml(e.status)}${e.hl ? ', HL only' : ''} · ${escapeHtml(e.group)}</span><span class="cmp-results__acts"><button type="button" class="btn btn--small" data-set="a" data-id="${escapeHtml(e.id)}">Compare as first<span class="sr-only">: ${escapeHtml(e.name)}</span></button><button type="button" class="btn btn--small" data-set="b" data-id="${escapeHtml(e.id)}">Compare as second<span class="sr-only">: ${escapeHtml(e.name)}</span></button></span></li>`,
            )
            .join('')}</ul>`
        : ''
    }${cur.length ? `<p class="cmp-results__count">Curated comparisons: ${cur.map((c) => `<a href="${escapeHtml(c.href)}">${escapeHtml(c.title)}</a>`).join('; ')}.</p>` : ''}`;
    results.hidden = false;
    announce(status, results.querySelector('.cmp-results__count')?.textContent ?? '');
  };

  a.addEventListener('change', () => void show());
  b.addEventListener('change', () => void show());
  q.addEventListener('input', search);
  root.querySelector('[data-picker]')?.addEventListener('submit', (e) => e.preventDefault());

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn || !root.contains(btn)) return;
    if (btn.hasAttribute('data-swap')) {
      const x = a.value;
      a.value = b.value;
      b.value = x;
      void show();
      return;
    }
    const k = btn.dataset.set as 'a' | 'b' | undefined;
    const id = btn.dataset.id;
    if (!k || !id || !known.has(id)) return;
    pick(k).value = id;
    announce(status, `${nameOf(id)} set as the ${k === 'a' ? 'first' : 'second'} framework.`);
    void show();
  });

  const params = new URLSearchParams(location.search);
  const ia = params.get('a') ?? '';
  const ib = params.get('b') ?? '';
  if (known.has(ia)) a.value = ia;
  if (known.has(ib)) b.value = ib;
  if (a.value || b.value) void show();
});
