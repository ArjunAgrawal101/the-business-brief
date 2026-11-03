/** The start-up feasibility assessment in the browser: ideas, weights and scores, the ranking and its tests redrawn, storage on this device. */
import { announce, each, readConfig, store } from '../ix';
import { assess, readAssessment, validateFeasibility, VERDICT_WORDS, DEFAULT_SETTINGS, type Criterion } from '../../lib/lab/feasibility';
import { rankingHtml } from '../../lib/lab/render';
import { criteriaRowsHtml, ideaHtml, type IdeaDraft } from '../../lib/lab/forms';
import { clearErrors, newId, saveSummary, setError } from './kit';

type Idea = IdeaDraft & { summary: string };
interface State {
  ideas: Idea[];
  weights: Record<string, number>;
  threshold: number;
}
interface Config {
  uid: string;
  criteria: Criterion[];
  example: State;
  floor: number;
}

const KEY = 'lab:feasibility';
const MAX_IDEAS = 3;

function restore(raw: unknown, cfg: Config): State {
  const fallback = structuredClone(cfg.example);
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.ideas) || !r.ideas.length || typeof r.weights !== 'object' || r.weights === null) return fallback;
  const ideas: Idea[] = [];
  for (const x of r.ideas.slice(0, MAX_IDEAS)) {
    if (!x || typeof x !== 'object') return fallback;
    const i = x as Record<string, unknown>;
    if (typeof i.id !== 'string' || typeof i.name !== 'string' || !i.scores || typeof i.scores !== 'object') return fallback;
    const scores = Object.fromEntries(cfg.criteria.map((c) => {
      const v = (i.scores as Record<string, unknown>)[c.id];
      return [c.id, typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5 ? v : 3];
    }));
    ideas.push({ id: i.id, name: i.name, summary: typeof i.summary === 'string' ? i.summary : '', scores });
  }
  const weights = Object.fromEntries(cfg.criteria.map((c) => {
    const v = (r.weights as Record<string, unknown>)[c.id];
    return [c.id, typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 5 ? v : c.weight];
  }));
  const threshold = typeof r.threshold === 'number' && r.threshold >= 1 && r.threshold <= 100 ? r.threshold : cfg.example.threshold;
  return { ideas, weights, threshold };
}

each('[data-ix="lab-feasibility"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const ideasList = root.querySelector<HTMLElement>('[data-ideas]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add]');
  const mark = root.querySelector<HTMLSelectElement>('[data-mark]');
  const raw = store.get<unknown>(KEY, null);
  let state = restore(raw, cfg);
  // Nothing is kept, and nothing is offered to the business plan, until the learner changes something.
  let touched = raw !== null;
  let timer = 0;

  const draw = () => {
    if (ideasList) ideasList.innerHTML = state.ideas.map((i, n) => ideaHtml(i, n + 1, cfg.uid)).join('');
    if (rows) rows.innerHTML = criteriaRowsHtml(cfg.criteria, state.weights, state.ideas, cfg.uid, DEFAULT_SETTINGS.maxWeight);
    root.querySelectorAll<HTMLButtonElement>('[data-ideas] [data-remove]').forEach((b) => (b.hidden = state.ideas.length <= 1));
    if (addBtn) addBtn.disabled = state.ideas.length >= MAX_IDEAS;
    if (mark) mark.value = String(state.threshold);
  };

  const read = () => {
    root.querySelectorAll<HTMLElement>('[data-idea]').forEach((li) => {
      const idea = state.ideas.find((x) => x.id === li.dataset.idea);
      if (!idea) return;
      idea.name = li.querySelector<HTMLInputElement>('[data-k="name"]')?.value ?? '';
      idea.summary = li.querySelector<HTMLInputElement>('[data-k="summary"]')?.value ?? '';
    });
    root.querySelectorAll<HTMLInputElement>('[data-weight]').forEach((el) => (state.weights[el.dataset.weight ?? ''] = Number(el.value)));
    root.querySelectorAll<HTMLSelectElement>('[data-score]').forEach((el) => {
      const idea = state.ideas.find((x) => x.id === el.dataset.score);
      if (idea) idea.scores[el.dataset.crit ?? ''] = Number(el.value);
    });
    if (mark) state.threshold = Number(mark.value);
  };

  const render = (say: boolean) => {
    root.querySelectorAll<HTMLInputElement>('[data-weight]').forEach((el) => {
      const out = root.querySelector<HTMLOutputElement>(`[data-wout="${el.dataset.weight}"]`);
      if (out) out.value = el.value;
      el.setAttribute('aria-valuetext', `Weight ${el.value} of ${DEFAULT_SETTINGS.maxWeight}`);
    });
    state.ideas.forEach((i, n) => root.querySelectorAll<HTMLElement>(`[data-idea-name="${i.id}"]`).forEach((s) => (s.textContent = i.name.trim() || `Idea ${n + 1}`)));
    if (touched) store.set(KEY, state);
    const settings = { ...DEFAULT_SETTINGS, threshold: state.threshold, floor: cfg.floor };
    // An unnamed idea is called "Idea 1" and so on rather than flagged as an error.
    const named = state.ideas.map((i, n) => ({ ...i, name: i.name.trim() || `Idea ${n + 1}` }));
    const problems = validateFeasibility(named, cfg.criteria, state.weights, settings);
    clearErrors(root);
    problems.forEach((p) => setError(root, p.field, p.message));
    if (problems.length) {
      if (say) announce(status, `Check the assessment: ${problems[0]?.message}`);
      return;
    }
    const a = assess(named, cfg.criteria, state.weights, settings);
    const r = readAssessment(a, named, cfg.criteria, state.weights, settings);
    const body = root.querySelector<HTMLElement>('[data-ranking]');
    if (body) body.innerHTML = rankingHtml(a, cfg.criteria);
    const interp = root.querySelector<HTMLElement>('[data-interp]');
    const impl = root.querySelector<HTMLElement>('[data-impl]');
    if (interp) interp.textContent = r.reading;
    if (impl) impl.textContent = r.implication;
    const lead = a.results[0];
    if (lead && touched) saveSummary('feasibility', { idea: lead.name, share: lead.share, rank: lead.rank, of: a.results.length, passes: lead.passes, verdict: VERDICT_WORDS[lead.verdict], threshold: state.threshold });
    if (say) announce(status, r.reading);
  };

  draw();
  render(false);

  root.addEventListener('input', (e) => {
    touched = true;
    read();
    render(false);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), (e.target as HTMLElement).matches('[type="range"]') ? 500 : 700);
  });
  root.addEventListener('change', () => {
    touched = true;
    read();
    render(true);
  });

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || !root.contains(b)) return;
    if (!b.matches('[data-print]')) touched = true;
    if (b.matches('[data-remove]')) {
      read();
      const li = b.closest<HTMLElement>('[data-idea]');
      const i = state.ideas.findIndex((x) => x.id === li?.dataset.idea);
      if (i < 0 || state.ideas.length <= 1) return;
      const gone = state.ideas[i];
      state.ideas.splice(i, 1);
      draw();
      render(false);
      root.querySelectorAll<HTMLInputElement>('[data-idea] [data-k="name"]')[Math.min(i, state.ideas.length - 1)]?.focus();
      announce(status, `Removed ${gone?.name.trim() || 'the idea'}.`);
    } else if (b.matches('[data-add]')) {
      read();
      if (state.ideas.length >= MAX_IDEAS) return;
      const idea: Idea = { id: newId('i'), name: '', summary: '', scores: Object.fromEntries(cfg.criteria.map((c) => [c.id, 3])) };
      state.ideas.push(idea);
      draw();
      render(false);
      root.querySelector<HTMLInputElement>(`[data-idea="${idea.id}"] [data-k="name"]`)?.focus();
    } else if (b.matches('[data-clear]')) {
      if (!window.confirm('Clear the ideas and scores and start from blank? Your current assessment will be replaced.')) return;
      state = { ideas: [{ id: newId('i'), name: '', summary: '', scores: Object.fromEntries(cfg.criteria.map((c) => [c.id, 3])) }], weights: Object.fromEntries(cfg.criteria.map((c) => [c.id, 3])), threshold: cfg.example.threshold };
      draw();
      render(true);
      root.querySelector<HTMLInputElement>('[data-idea] [data-k="name"]')?.focus();
    } else if (b.matches('[data-example]')) {
      if (!window.confirm("Load the example's ideas and scores? Your current assessment will be replaced.")) return;
      state = structuredClone(cfg.example);
      draw();
      render(true);
    } else if (b.matches('[data-print]')) {
      window.print();
    }
  });
});
