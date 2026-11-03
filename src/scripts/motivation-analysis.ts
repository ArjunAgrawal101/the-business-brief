/**
 * The motivation analysis in the browser: the ratings, the facts about the
 * job and the staff's dominant need are read from the form, analysed by
 * src/lib/motivation.ts and drawn by src/lib/motivation-view.ts after every
 * change. The sliders cannot hold an invalid rating, so files opened from
 * disk are the only input that needs checking.
 */
import { FACTORS, motivationCsvRows, readMotivation, rewards, validateRatings, type FactorId, type JobFacts, type MotivationInputs, type Need, type Ratings } from '../lib/motivation';
import { LENSES, lensCards, ratingsRowsHtml, rewardsHtml } from '../lib/motivation-view';
import { announce, each, escapeHtml, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface Config extends MotivationInputs {
  uid: string;
  key: string;
}

const NEEDS: readonly Need[] = ['achievement', 'affiliation', 'power', 'unknown'];
const JOB_KEYS = ['countable', 'sales', 'teams', 'shares'] as const;

/** A saved or opened analysis, or null when it is not one this tool wrote. */
function parseState(d: unknown): MotivationInputs | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as { ratings?: unknown; job?: unknown; need?: unknown };
  if (!r.ratings || typeof r.ratings !== 'object' || !r.job || typeof r.job !== 'object') return null;
  const raw = r.ratings as Partial<Record<FactorId, number | null>>;
  if (validateRatings(raw).length) return null;
  const job = r.job as Partial<Record<(typeof JOB_KEYS)[number], unknown>>;
  if (!JOB_KEYS.every((k) => typeof job[k] === 'boolean')) return null;
  const need = NEEDS.includes(r.need as Need) ? (r.need as Need) : 'unknown';
  return {
    ratings: Object.fromEntries(FACTORS.map((f) => [f.id, raw[f.id] as number])) as Ratings,
    job: Object.fromEntries(JOB_KEYS.map((k) => [k, job[k] as boolean])) as unknown as JobFacts,
    need,
  };
}

each('[data-ix="motivation-analysis"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form) return;
  const defaults = (): MotivationInputs => ({ ratings: { ...cfg.ratings }, job: { ...cfg.job }, need: cfg.need });
  let state: MotivationInputs = parseState(loadSaved<unknown>(cfg.key)) ?? defaults();
  let timer = 0;

  const slider = (id: FactorId) => document.getElementById(`${uid}-r-${id}`) as HTMLInputElement | null;
  const needSelect = document.getElementById(`${uid}-need`) as HTMLSelectElement | null;
  const box = (k: (typeof JOB_KEYS)[number]) => form.querySelector<HTMLInputElement>(`input[type="checkbox"][name="${k}"]`);
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };

  /** Show a rating beside its slider, and give it a spoken value. */
  const showRating = (id: FactorId, v: number) => {
    const s = slider(id);
    if (s) s.setAttribute('aria-valuetext', `${v} of 5`);
    const out = root.querySelector<HTMLElement>(`[data-out="${id}"]`);
    if (out) out.textContent = String(v);
  };

  const fill = () => {
    FACTORS.forEach((f) => {
      const s = slider(f.id);
      if (s) s.value = String(state.ratings[f.id]);
      showRating(f.id, state.ratings[f.id]);
    });
    if (needSelect) needSelect.value = state.need;
    JOB_KEYS.forEach((k) => {
      const b = box(k);
      if (b) b.checked = state.job[k];
    });
  };

  /** The form as inputs. A slider always holds a whole number from 1 to 5. */
  const readForm = (): MotivationInputs => ({
    ratings: Object.fromEntries(FACTORS.map((f) => [f.id, Number(slider(f.id)?.value ?? state.ratings[f.id])])) as Ratings,
    job: Object.fromEntries(JOB_KEYS.map((k) => [k, box(k)?.checked ?? state.job[k]])) as unknown as JobFacts,
    need: NEEDS.includes(needSelect?.value as Need) ? (needSelect?.value as Need) : 'unknown',
  });

  const render = (say: boolean) => {
    const read = readMotivation(state);
    const cards = lensCards(state, uid);
    LENSES.forEach((l) => set(`[data-lens="${l}"]`, cards[l]));
    set('[data-interp]', escapeHtml(read.reading));
    set('[data-impl]', escapeHtml(read.implication));
    set('[data-ratings]', ratingsRowsHtml(state.ratings));
    set('[data-rewards]', rewardsHtml(rewards(state)));
    if (say) announce(status, read.reading);
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => 'Motivation analysis',
    state: () => ({ tool: 'motivation-analysis', ...state }),
    csv: () => motivationCsvRows(state),
    reset: () => {
      state = defaults();
      fill();
      render(true);
    },
    load: (data) => {
      const next = parseState(data);
      if (!next) return 'That file is not an analysis saved by this tool.';
      state = next;
      fill();
      render(true);
      return null;
    },
  });

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement | null;
    if (t?.type === 'range') showRating(t.name as FactorId, Number(t.value));
    state = readForm();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      render(true);
      bar.changed();
    }, 250);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  fill();
  render(false);
});
