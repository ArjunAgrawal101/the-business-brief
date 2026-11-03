/** The STP planner in the browser: segments to add and remove, live ranking and checks, saving and export. */
import { nextId } from '../../lib/market-kit';
import { BASES, CRITERIA, MAX_WEIGHT, blankSegment, isBase, normalizeStp, readStp, stpChecks, stpCsvRows, stpSummary, type Criterion, type StpState } from '../../lib/market-stp';
import { segmentRowHtml, statementHtml, stpChartSvg, stpTableHtml } from '../../lib/market-stp-view';
import { checksHtml, checksTally } from '../../lib/market-view';
import { announce, each, escapeHtml, readConfig } from '../ix';
import { fieldChecked, fieldValue, fill, mountKit } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: StpState;
}

each('[data-ix="stp"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !rows) return;
  let timer = 0;

  const rating = (el: ParentNode, k: string) => Math.min(5, Math.max(1, Math.round(Number(fieldValue(el, k)) || 3)));
  const read = (): StpState => ({
    business: fieldValue(form, 'business'),
    market: fieldValue(form, 'market'),
    bases: [...form.querySelectorAll<HTMLInputElement>('[data-f="bases"]:checked')].map((c) => c.value).filter(isBase),
    weights: Object.fromEntries(CRITERIA.map((c) => [c, Number(form.querySelector<HTMLInputElement>(`[data-weight="${c}"]`)?.value ?? 0)])) as Record<Criterion, number>,
    segments: [...rows.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({
      id: el.dataset.row ?? '',
      name: fieldValue(el, 'name'),
      profile: fieldValue(el, 'profile'),
      bases: [...el.querySelectorAll<HTMLInputElement>('[data-f="base"]:checked')].map((c) => c.value).filter(isBase),
      size: rating(el, 'size'),
      growth: rating(el, 'growth'),
      fit: rating(el, 'fit'),
      competition: rating(el, 'competition'),
      reachable: fieldChecked(el, 'reachable'),
      target: fieldChecked(el, 'target'),
      evidence: fieldValue(el, 'evidence'),
    })),
    positioning: {
      customers: fieldValue(form, 'p-customers'),
      need: fieldValue(form, 'p-need'),
      brand: fieldValue(form, 'p-brand'),
      frame: fieldValue(form, 'p-frame'),
      difference: fieldValue(form, 'p-difference'),
      proof: fieldValue(form, 'p-proof'),
    },
  });

  const render = (s: StpState) => {
    const r = readStp(s);
    fill(root, '[data-table]', stpTableHtml(s));
    fill(root, '[data-chart]', stpChartSvg(s, `${uid}-chart`));
    fill(root, '[data-interp]', escapeHtml(r.reading));
    fill(root, '[data-impl]', escapeHtml(r.implication));
    fill(root, '[data-statement]', statementHtml(s));
    fill(root, '[data-checks]', checksHtml(stpChecks(s)));
    // Keep each segment's legend and target marker in step with its fields.
    s.segments.forEach((g, i) => {
      const el = rows.querySelector<HTMLElement>(`[data-row="${g.id}"]`);
      if (!el) return;
      el.classList.toggle('is-target', g.target);
      const lg = el.querySelector<HTMLElement>('[data-legend]');
      if (lg) lg.textContent = g.name.trim() || `Segment ${i + 1}`;
      const tag = el.querySelector('.mk-target-tag');
      if (g.target && !tag) el.querySelector('.mk-row__legend')?.insertAdjacentHTML('beforeend', ' <span class="tag tag--plain mk-target-tag">Target</span>');
      if (!g.target && tag) tag.remove();
    });
    CRITERIA.forEach((c) => {
      const out = root.querySelector<HTMLOutputElement>(`[data-out="${c}"]`);
      const input = root.querySelector<HTMLInputElement>(`[data-weight="${c}"]`);
      if (out) out.textContent = String(s.weights[c]);
      input?.setAttribute('aria-valuetext', `Weight ${s.weights[c]} of ${MAX_WEIGHT}`);
    });
  };

  const drawRows = (s: StpState) => {
    rows.innerHTML = s.segments.map((g, i) => segmentRowHtml(g, i, uid)).join('');
  };

  const apply = (s: StpState) => {
    const set = (f: string, v: string) => {
      const el = form.querySelector<HTMLInputElement>(`[data-f="${f}"]`);
      if (el) el.value = v;
    };
    set('business', s.business);
    set('market', s.market);
    BASES.forEach((b) => {
      const el = form.querySelector<HTMLInputElement>(`[data-f="bases"][value="${b}"]`);
      if (el) el.checked = s.bases.includes(b);
    });
    CRITERIA.forEach((c) => {
      const el = form.querySelector<HTMLInputElement>(`[data-weight="${c}"]`);
      if (el) el.value = String(s.weights[c]);
    });
    (['customers', 'need', 'brand', 'frame', 'difference', 'proof'] as const).forEach((k) => set(`p-${k}`, s.positioning[k]));
    drawRows(s);
    render(s);
  };

  const kit = mountKit<StpState>({ root, slug: cfg.slug, name: 'STP plan', defaults: cfg.defaults, normalize: normalizeStp, read, apply, csv: stpCsvRows, text: stpSummary });

  const onEdit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const s = read();
      render(s);
      announce(status, `${readStp(s).reading.split('. ')[0]}. Checks: ${checksTally(stpChecks(s))}.`);
    }, 250);
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const s = read();
    if (s.segments.length >= 8) {
      announce(status, 'Eight segments is the most the planner holds. Combine the smallest.');
      return;
    }
    const id = nextId('s', s.segments.map((g) => g.id));
    s.segments.push(blankSegment(id));
    drawRows(s);
    render(s);
    kit.changed();
    root.querySelector<HTMLInputElement>(`#${uid}-seg-${id}-name`)?.focus();
    announce(status, `Segment ${s.segments.length} added. Name it, describe it and rate it.`);
  });
  rows.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    if (!btn) return;
    const id = btn.closest<HTMLElement>('[data-row]')?.dataset.row;
    const s = read();
    if (s.segments.length <= 2) {
      announce(status, 'Segmentation needs at least two segments, so this one stays.');
      return;
    }
    const gone = s.segments.find((g) => g.id === id);
    s.segments = s.segments.filter((g) => g.id !== id);
    drawRows(s);
    render(s);
    kit.changed();
    root.querySelector<HTMLButtonElement>('[data-add]')?.focus();
    announce(status, `${gone?.name || 'Segment'} removed.`);
  });
});
