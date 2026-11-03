/**
 * The organization chart creator in the browser: edit the posts, follow a
 * chain of command, remove a layer of management. Every figure comes from
 * src/lib/org-chart.ts and every fragment from src/lib/org-chart-view.ts,
 * the same code that drew the worked example on the server.
 */
import { MAX_POSTS, chainOf, delayerLevels, delayerResult, describeStructure, orgCsvRows, orgModel, parseOrgFile, readOrg, validateOrg, type OrgModel, type OrgPost, type OrgProblem } from '../lib/org-chart';
import { delayerRowsHtml, orgChartSvg, orgEditorHtml, orgFiguresHtml, orgLevelRowsHtml, orgOutlineHtml, treeOrder } from '../lib/org-chart-view';
import { announce, each, escapeHtml, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface Config {
  uid: string;
  key: string;
  organization: string;
  posts: OrgPost[];
  delayer: number | null;
  maxPosts: number;
}

interface State {
  organization: string;
  posts: OrgPost[];
  delayer: number | null;
  chainFrom: string | null;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

each('[data-ix="org-chart"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const rows = $('[data-rows]');
  const orgInput = $<HTMLInputElement>(`#${uid}-org`);
  const chainSel = $<HTMLSelectElement>('[data-chain]');
  const delayerSel = $<HTMLSelectElement>('[data-delayer]');
  const status = $('[data-status]');
  if (!rows || !orgInput) return;

  const defaults = (): State => ({ organization: cfg.organization, posts: clone(cfg.posts), delayer: cfg.delayer, chainFrom: null });
  const fromSaved = (): State | null => {
    const saved = loadSaved<unknown>(cfg.key);
    const parsed = saved ? parseOrgFile(saved) : null;
    if (!parsed) return null;
    const s = saved as { chainFrom?: unknown };
    return { organization: parsed.organization, posts: treeOrder(parsed.posts), delayer: parsed.delayer, chainFrom: typeof s.chainFrom === 'string' ? s.chainFrom : null };
  };
  let state: State = fromSaved() ?? defaults();
  let model: OrgModel | null = null;
  let problems: OrgProblem[] = [];
  let timer = 0;
  let counter = 0;

  const titleOf = (id: string) => state.posts.find((p) => p.id === id)?.title.trim() || 'Untitled post';
  const set = (sel: string, html: string) => {
    const el = $(sel);
    if (el) el.innerHTML = html;
  };

  /** Problems shown beside the fields they belong to, and the chart-wide ones in a box. */
  const showProblems = () => {
    rows.querySelectorAll<HTMLElement>('[data-post]').forEach((li) => {
      const pid = li.dataset.post ?? '';
      (['title', 'count', 'reportsTo'] as const).forEach((f) => {
        const msg = problems.filter((p) => p.id === pid && p.field === f).map((p) => p.message).join(' ');
        const err = li.querySelector<HTMLElement>(`[data-err="${f}"]`);
        if (err) err.textContent = msg;
        const ctl = li.querySelector<HTMLElement>(`[name="${f}"]`);
        if (ctl) {
          if (msg) ctl.setAttribute('aria-invalid', 'true');
          else ctl.removeAttribute('aria-invalid');
        }
      });
    });
    const box = $('[data-problems]');
    const general = problems.filter((p) => p.field === 'chart' || p.id === null);
    const count = problems.length;
    if (box) {
      box.hidden = count === 0;
      box.innerHTML = count
        ? `<strong>The chart cannot be drawn yet.</strong> ${count === 1 ? 'One thing needs fixing' : `${count} things need fixing`}${general.length ? ':' : ', marked beside the posts.'}${general.length ? `<ul>${general.map((p) => `<li>${escapeHtml(p.message)}</li>`).join('')}</ul>` : ''}`
        : '';
    }
  };

  const renderEditor = () => {
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement.id : '';
    const depth = model ? model.depth : {};
    rows.innerHTML = orgEditorHtml(state.posts, uid, problems, depth, cfg.maxPosts);
    if (focused) document.getElementById(focused)?.focus();
  };

  const renderResults = (say: boolean) => {
    problems = validateOrg(state.posts);
    showProblems();
    if (problems.length) {
      root.classList.add('is-invalid');
      model = null;
      if (say) announce(status, `The chart cannot be drawn yet: ${problems[0]?.message ?? ''}`);
      return;
    }
    root.classList.remove('is-invalid');
    const m = orgModel(state.posts);
    model = m;
    const options = delayerLevels(m);
    if (state.delayer !== null && !options.some((o) => o.level === state.delayer)) state.delayer = null;
    const d = state.delayer !== null ? delayerResult(state.posts, m, state.delayer) : null;
    const from = state.chainFrom && state.posts.some((p) => p.id === state.chainFrom) ? state.chainFrom : (m.longestChain[0] ?? m.top);
    const chain = chainOf(m, from);
    const org = state.organization.trim() || 'the organization';
    const s = describeStructure(m);
    const reading = readOrg(m, titleOf, d);

    set('[data-figures]', orgFiguresHtml(m));
    set('[data-structure-name]', escapeHtml(s.name));
    set('[data-structure-reasons]', s.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join(''));
    set('[data-interp]', escapeHtml(reading.reading));
    set('[data-impl]', escapeHtml(reading.implication));
    set('[data-chart]', orgChartSvg(m, { id: `${uid}-chart`, organization: org, chain, removed: d?.removed.map((p) => p.id) ?? [] }));
    $('[data-chart]')?.setAttribute('aria-label', `Organization chart of ${org}`);
    set('[data-outline]', orgOutlineHtml(m));
    set('[data-levels]', orgLevelRowsHtml(m));
    set(
      '[data-chain-text]',
      `<span class="label">Chain of command</span> ${escapeHtml(chain.map(titleOf).join(' → '))}: ${chain.length} ${chain.length === 1 ? 'post' : 'posts'}, ${chain.length - 1} ${chain.length - 1 === 1 ? 'step' : 'steps'} from the bottom to the top.`,
    );

    if (chainSel) {
      chainSel.innerHTML = treeOrder(state.posts)
        .map((p) => `<option value="${escapeHtml(p.id)}"${p.id === from ? ' selected' : ''}>${escapeHtml(p.title.trim() || 'Untitled post')}</option>`)
        .join('');
    }
    if (delayerSel) {
      delayerSel.innerHTML = [`<option value="">Keep every level</option>`, ...options.map((o) => `<option value="${o.level}"${o.level === state.delayer ? ' selected' : ''}>Level ${o.level}: ${escapeHtml(o.posts.map(titleOf).join(', '))}</option>`)].join('');
    }
    const panel = $('[data-delayering]');
    if (panel) panel.hidden = !d;
    if (d) {
      set('[data-delayer-title]', `Delayering: removing level ${d.level}`);
      set('[data-compare]', delayerRowsHtml(m, d));
      set('[data-after-chart]', orgChartSvg(d.after, { id: `${uid}-after`, organization: `${org} after delayering` }));
    }
    if (say) {
      const avg = m.averageSpan === null ? 'no spans of control yet' : `average span of control ${m.averageSpan.toFixed(1).replace(/\.0$/, '')}`;
      announce(status, `${m.levels} levels, ${m.headcount} people, ${avg}. ${s.name}.${d ? ` After removing level ${d.level}: ${d.after.levels} levels, average span ${d.after.averageSpan === null ? 'none' : d.after.averageSpan.toFixed(1).replace(/\.0$/, '')}.` : ''}`);
    }
  };

  const snapshot = () => ({ tool: 'organization-chart', organization: state.organization, posts: state.posts, delayer: state.delayer, chainFrom: state.chainFrom });
  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => `${state.organization.trim() || 'organization'} chart`,
    state: snapshot,
    csv: () => (model ? orgCsvRows(model) : [['The chart is not valid yet.']]),
    reset: () => {
      state = defaults();
      orgInput.value = state.organization;
      renderAll(true);
    },
    load: (data) => {
      const parsed = parseOrgFile(data);
      if (!parsed) return 'That file is not a chart saved by this tool.';
      state = { organization: parsed.organization, posts: treeOrder(parsed.posts), delayer: parsed.delayer, chainFrom: null };
      orgInput.value = state.organization;
      renderAll(true);
      return null;
    },
  });

  const renderAll = (say: boolean) => {
    renderResults(false);
    renderEditor();
    renderResults(say);
  };

  const later = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      renderResults(true);
      bar.changed();
    }, 300);
  };

  const structural = (say: string) => {
    state.posts = treeOrder(state.posts);
    renderResults(false);
    renderEditor();
    renderResults(false);
    bar.changed(say);
  };

  rows.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const li = t.closest<HTMLElement>('[data-post]');
    const post = state.posts.find((p) => p.id === li?.dataset.post);
    if (!post || !li) return;
    if (t.name === 'title') {
      post.title = t.value;
      const legend = li.querySelector('[data-legend]');
      if (legend) legend.textContent = t.value.trim() || 'Untitled post';
      rows.querySelectorAll<HTMLOptionElement>('option').forEach((o) => {
        if (o.value === post.id) o.textContent = t.value.trim() || 'Untitled post';
      });
      later();
    } else if (t.name === 'count') {
      const v = Number(t.value);
      post.count = t.value.trim() === '' || !Number.isFinite(v) ? Number.NaN : v;
      later();
    }
  });

  rows.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    const li = t.closest<HTMLElement>('[data-post]');
    const post = state.posts.find((p) => p.id === li?.dataset.post);
    if (!post) return;
    if (t.name === 'reportsTo') {
      post.reportsTo = t.value || null;
      structural(`${post.title.trim() || 'The post'} now reports to ${t.value ? titleOf(t.value) : 'no one'}.`);
    } else if (t.name === 'grouping') {
      post.grouping = t.value === 'function' || t.value === 'product' || t.value === 'region' ? t.value : null;
      renderResults(true);
      bar.changed();
    }
  });

  rows.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (!btn) return;
    const pid = btn.dataset.post ?? '';
    const post = state.posts.find((p) => p.id === pid);
    if (!post) return;
    if (btn.dataset.act === 'add') {
      if (state.posts.length >= MAX_POSTS) {
        announce(status, `The chart already has ${MAX_POSTS} posts, the most this tool draws.`);
        return;
      }
      if (post.count > 1) {
        announce(status, `${post.title.trim()} is held by ${post.count} people, so no one can report to it. Set its number of people to 1 first.`);
        return;
      }
      counter += 1;
      const id = `p-${Date.now().toString(36)}-${counter}`;
      state.posts.push({ id, title: 'New post', reportsTo: post.id, count: 1, grouping: null });
      structural(`New post added under ${post.title.trim() || 'the post'}.`);
      const input = document.getElementById(`${uid}-p-${id}-title`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    } else if (btn.dataset.act === 'remove') {
      if (!post.reportsTo) return;
      const moved = state.posts.filter((p) => p.reportsTo === post.id);
      moved.forEach((p) => (p.reportsTo = post.reportsTo));
      const index = treeOrder(state.posts).findIndex((p) => p.id === post.id);
      state.posts = state.posts.filter((p) => p.id !== post.id);
      if (state.chainFrom === post.id) state.chainFrom = null;
      structural(`${post.title.trim() || 'The post'} removed.${moved.length ? ` ${moved.length === 1 ? 'Its report now reports' : `Its ${moved.length} reports now report`} to ${titleOf(post.reportsTo)}.` : ''}`);
      // Keep the keyboard where the reader was: on the next post's title, or the previous one.
      const next = treeOrder(state.posts)[Math.min(index, state.posts.length - 1)];
      if (next) document.getElementById(`${uid}-p-${next.id}-title`)?.focus();
    }
  });

  orgInput.addEventListener('input', () => {
    state.organization = orgInput.value;
    later();
  });
  root.querySelector('[data-form]')?.addEventListener('submit', (e) => e.preventDefault());

  chainSel?.addEventListener('change', () => {
    state.chainFrom = chainSel.value || null;
    renderResults(true);
    bar.changed();
  });
  delayerSel?.addEventListener('change', () => {
    state.delayer = delayerSel.value ? Number(delayerSel.value) : null;
    renderResults(true);
    bar.changed();
  });

  orgInput.value = state.organization;
  renderAll(false);
});
