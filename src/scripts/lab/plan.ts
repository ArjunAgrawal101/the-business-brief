/** The business plan outline builder in the browser: progress as the learner writes, figures from the other Lab tools, storage on this device, and export as Markdown. */
import { announce, each, readConfig, store } from '../ix';
import { cleanSummaries, digest, planMarkdown, planProgress, type PlanSection, type PlanState } from '../../lib/lab/plan';
import { download, fileSlug, today } from './kit';

interface Config {
  uid: string;
  sections: PlanSection[];
}

const KEY = 'lab:plan';
const STATE_WORDS = { empty: 'Empty', started: 'Started', drafted: 'Drafted' } as const;

function restore(raw: unknown): PlanState {
  if (!raw || typeof raw !== 'object') return { title: '', sections: {} };
  const r = raw as Record<string, unknown>;
  const sections: Record<string, string> = {};
  if (r.sections && typeof r.sections === 'object') for (const [k, v] of Object.entries(r.sections as Record<string, unknown>)) if (typeof v === 'string') sections[k] = v.slice(0, 20000);
  return { title: typeof r.title === 'string' ? r.title.slice(0, 120) : '', sections };
}

each('[data-ix="lab-plan"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const titleInput = root.querySelector<HTMLInputElement>('[data-title]');
  const include = root.querySelector<HTMLInputElement>('[data-include]');
  let state = restore(store.get<unknown>(KEY, null));

  /** Figures saved by the other tools on this device, as lines for each section. */
  const figures = () =>
    digest(
      cleanSummaries({
        feasibility: store.get<unknown>('lab:summary:feasibility', null),
        canvas: store.get<unknown>('lab:summary:canvas', null),
        unit: store.get<unknown>('lab:summary:unit', null),
        costs: store.get<unknown>('lab:summary:costs', null),
        revenue: store.get<unknown>('lab:summary:revenue', null),
      }),
    ) as Partial<Record<string, string[]>>;

  const fill = () => {
    if (titleInput) titleInput.value = state.title;
    root.querySelectorAll<HTMLTextAreaElement>('[data-section]').forEach((t) => (t.value = state.sections[t.dataset.section ?? ''] ?? ''));
  };

  const drawFigures = () => {
    const lines = figures();
    cfg.sections.forEach((s) => {
      const box = root.querySelector<HTMLElement>(`[data-figs="${s.id}"]`);
      const list = root.querySelector<HTMLElement>(`[data-figs-list="${s.id}"]`);
      const items = lines[s.id] ?? [];
      if (!box || !list) return;
      list.replaceChildren(
        ...items.map((l) => {
          const li = document.createElement('li');
          li.textContent = l;
          return li;
        }),
      );
      box.hidden = items.length === 0;
    });
  };

  const render = (save = true) => {
    if (save) store.set(KEY, state);
    const p = planProgress(cfg.sections, state);
    cfg.sections.forEach((s) => {
      const info = p.sections[s.id];
      if (!info) return;
      const count = root.querySelector<HTMLElement>(`[data-count="${s.id}"]`);
      if (count) count.textContent = `${info.words} ${info.words === 1 ? 'word' : 'words'}; suggested length about ${s.words}. ${STATE_WORDS[info.status]}.`;
      const toc = root.querySelector<HTMLElement>(`[data-toc="${s.id}"]`);
      toc?.classList.remove('is-empty', 'is-started', 'is-drafted');
      toc?.classList.add(`is-${info.status}`);
      const st = root.querySelector<HTMLElement>(`[data-state="${s.id}"]`);
      if (st) st.textContent = STATE_WORDS[info.status];
    });
    const text = root.querySelector<HTMLElement>('[data-progress]');
    if (text) text.textContent = `${p.drafted} of ${cfg.sections.length} sections drafted, ${p.words.toLocaleString('en-GB')} ${p.words === 1 ? 'word' : 'words'}`;
    const bar = root.querySelector<HTMLElement>('[data-progress-bar]');
    if (bar) bar.style.width = `${((p.drafted / cfg.sections.length) * 100).toFixed(1)}%`;
  };

  const markdown = () => planMarkdown(cfg.sections, state, include?.checked ? figures() : {}, today());

  fill();
  drawFigures();
  render(false);

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t === titleInput) state.title = titleInput.value;
    else if (t instanceof HTMLTextAreaElement && t.dataset.section) state.sections[t.dataset.section] = t.value;
    render();
  });

  // Figures can change in another tab while this one is open.
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('bb:lab:summary:')) drawFigures();
  });

  root.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || !root.contains(b)) return;
    if (b.matches('[data-md]')) {
      download(markdown(), `${fileSlug(state.title, 'business-plan-outline')}.md`, 'text/markdown');
      announce(status, 'The plan was saved as a Markdown file.');
    } else if (b.matches('[data-copy]')) {
      try {
        await navigator.clipboard.writeText(markdown());
        announce(status, 'The plan was copied as Markdown.');
      } catch {
        announce(status, 'Copying is not available in this browser. Use Download as Markdown instead.');
      }
    } else if (b.matches('[data-print]')) {
      window.print();
    } else if (b.matches('[data-clear]')) {
      if (!window.confirm('Clear the whole plan? This cannot be undone; download it first if you want to keep it.')) return;
      state = { title: '', sections: {} };
      fill();
      render();
      announce(status, 'The plan was cleared.');
      titleInput?.focus();
    }
  });
});
