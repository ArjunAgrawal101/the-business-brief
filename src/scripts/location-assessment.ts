/**
 * The weighted location assessment in the browser: the reader edits the
 * factors, weights, sites and scores, and the ranking, its sensitivity, the
 * low scores and the working follow, from src/lib/location-tool.ts.
 */
import { MAX_FACTORS, MAX_SITES, assessLocation, contributionRowsHtml, locationCsvRows, locationSvg, lowListHtml, matrixHtml, validateMatrix, type LocationMatrix } from '../lib/location-tool';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface Config {
  uid: string;
  key: string;
  matrix: LocationMatrix;
}

interface State {
  matrix: LocationMatrix;
  note: string;
}

function parseState(d: unknown, f: LocationMatrix): State | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as { matrix?: Partial<LocationMatrix>; note?: unknown };
  const m = r.matrix;
  if (!m || !Array.isArray(m.factors) || !Array.isArray(m.sites)) return null;
  const factors = m.factors.slice(0, MAX_FACTORS).map((x, k) => ({ id: typeof x?.id === 'string' ? x.id.slice(0, 40) : `f${k}`, label: typeof x?.label === 'string' ? x.label.slice(0, 60) : '', weight: typeof x?.weight === 'number' ? x.weight : 0 }));
  const sites = m.sites.slice(0, MAX_SITES).map((x, k) => ({
    id: typeof x?.id === 'string' ? x.id.slice(0, 40) : `s${k}`,
    name: typeof x?.name === 'string' ? x.name.slice(0, 40) : '',
    scores: Object.fromEntries(factors.map((fa) => [fa.id, typeof x?.scores?.[fa.id] === 'number' ? (x.scores[fa.id] as number) : 0])),
  }));
  if (factors.length < 2 || sites.length < 2) return null;
  return { matrix: { factors, sites, maxScore: f.maxScore, maxWeight: f.maxWeight, lowThreshold: f.lowThreshold }, note: typeof r.note === 'string' ? r.note.slice(0, 4000) : '' };
}

each('[data-ix="location-assessment"]', (root) => {
  const cfg = readConfig<Config>(root);
  const uid = cfg.uid;
  const table = root.querySelector<HTMLTableElement>('[data-matrix]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLTextAreaElement>('[data-note]');
  if (!table) return;
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const defaults = (): State => ({ matrix: clone(cfg.matrix), note: '' });
  let state: State = parseState(loadSaved<unknown>(cfg.key), cfg.matrix) ?? defaults();
  let timer = 0;
  let counter = 0;
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };

  const renderMatrix = () => {
    const focused = document.activeElement instanceof HTMLElement && table.contains(document.activeElement) ? document.activeElement.id : '';
    table.innerHTML = matrixHtml(state.matrix, uid, validateMatrix(state.matrix));
    if (focused) document.getElementById(focused)?.focus();
  };

  const renderResults = (say: boolean) => {
    const m = state.matrix;
    const problems = validateMatrix(m);
    // Mark the cells and names in place, so typing never loses focus.
    table.querySelectorAll<HTMLInputElement>('input').forEach((i) => {
      const f = i.dataset.factor;
      const s = i.dataset.site;
      const bad =
        (i.name === 'score' && problems.some((p) => p.kind === 'score' && p.site === s && p.factor === f)) ||
        (i.name === 'weight' && problems.some((p) => p.kind === 'weight' && p.factor === f)) ||
        (i.name === 'factor' && problems.some((p) => p.kind === 'factor' && p.factor === f)) ||
        (i.name === 'site' && problems.some((p) => p.kind === 'site' && p.site === s));
      if (bad) i.setAttribute('aria-invalid', 'true');
      else i.removeAttribute('aria-invalid');
    });
    const box = root.querySelector<HTMLElement>('[data-problems]');
    if (box) {
      const general = problems.filter((p) => p.kind === 'matrix');
      box.hidden = problems.length === 0;
      box.innerHTML = problems.length
        ? `<strong>Check the assessment.</strong> ${general.length ? general.map((p) => escapeHtml(p.message)).join(' ') : ''} ${problems.length - general.length ? `${problems.length - general.length === 1 ? 'One entry needs' : `${problems.length - general.length} entries need`} fixing, marked in the table: ${escapeHtml(problems.find((p) => p.kind !== 'matrix')?.message ?? '')}` : ''}`
        : '';
    }
    if (problems.length) {
      root.classList.add('is-invalid');
      if (say) announce(status, `Check the assessment: ${problems[0]?.message ?? ''}`);
      return;
    }
    root.classList.remove('is-invalid');
    const r = assessLocation(m);
    set('[data-chart]', locationSvg(r, `${uid}-chart`));
    set('[data-interp]', escapeHtml(r.reading.reading));
    set('[data-impl]', escapeHtml(r.reading.implication));
    set('[data-contrib]', contributionRowsHtml(m, r));
    const head = root.querySelector('.la__contrib thead tr');
    if (head) head.innerHTML = `<th scope="col">Factor and weight</th>${m.sites.map((s) => `<th scope="col" class="n">${escapeHtml(s.name)}</th>`).join('')}`;
    set('[data-low]', lowListHtml(m, r));
    if (say) announce(status, r.reading.reading);
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => 'location assessment',
    state: () => ({ tool: 'location-assessment', matrix: state.matrix, note: state.note }),
    csv: () => locationCsvRows(state.matrix, assessLocation(state.matrix)),
    reset: () => {
      state = defaults();
      if (note) note.value = '';
      renderMatrix();
      renderResults(true);
    },
    load: (data) => {
      const next = parseState(data, cfg.matrix);
      if (!next) return 'That file is not an assessment saved by this tool.';
      state = next;
      if (note) note.value = state.note;
      renderMatrix();
      renderResults(true);
      return null;
    },
  });

  const later = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      renderResults(true);
      bar.changed();
    }, 350);
  };

  table.addEventListener('input', (e) => {
    const i = e.target as HTMLInputElement;
    const m = state.matrix;
    const f = i.dataset.factor;
    const s = i.dataset.site;
    if (i.name === 'score' && f && s) {
      const site = m.sites.find((x) => x.id === s);
      const v = parseNumber(i.value);
      if (site) site.scores[f] = v === null ? Number.NaN : v;
    } else if (i.name === 'weight' && f) {
      const factor = m.factors.find((x) => x.id === f);
      const v = parseNumber(i.value);
      if (factor) factor.weight = v === null ? Number.NaN : v;
    } else if (i.name === 'factor' && f) {
      const factor = m.factors.find((x) => x.id === f);
      if (factor) factor.label = i.value;
    } else if (i.name === 'site' && s) {
      const site = m.sites.find((x) => x.id === s);
      if (site) site.name = i.value;
    }
    later();
  });
  // Names feed the labels of other cells, so the table is redrawn once a name is finished.
  table.addEventListener('change', (e) => {
    const i = e.target as HTMLInputElement;
    if (i.name === 'factor' || i.name === 'site') renderMatrix();
  });

  table.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    const m = state.matrix;
    if (b.dataset.removeFactor) {
      if (m.factors.length <= 2) {
        announce(status, 'An assessment needs at least two factors.');
        return;
      }
      const gone = m.factors.find((x) => x.id === b.dataset.removeFactor);
      m.factors = m.factors.filter((x) => x.id !== b.dataset.removeFactor);
      m.sites.forEach((s) => delete s.scores[b.dataset.removeFactor ?? '']);
      renderMatrix();
      renderResults(false);
      bar.changed(`${gone?.label ?? 'The factor'} removed.`);
    } else if (b.dataset.removeSite) {
      if (m.sites.length <= 2) {
        announce(status, 'An assessment needs at least two sites.');
        return;
      }
      const gone = m.sites.find((x) => x.id === b.dataset.removeSite);
      m.sites = m.sites.filter((x) => x.id !== b.dataset.removeSite);
      renderMatrix();
      renderResults(false);
      bar.changed(`${gone?.name ?? 'The site'} removed.`);
    }
  });

  root.querySelector('[data-add-factor]')?.addEventListener('click', () => {
    const m = state.matrix;
    if (m.factors.length >= MAX_FACTORS) {
      announce(status, `The assessment already has ${MAX_FACTORS} factors, the most this tool takes.`);
      return;
    }
    counter += 1;
    const id = `f-${Date.now().toString(36)}-${counter}`;
    m.factors.push({ id, label: 'New factor', weight: 1 });
    m.sites.forEach((s) => (s.scores[id] = Math.round(m.maxScore / 2)));
    renderMatrix();
    renderResults(false);
    const input = document.getElementById(`${uid}-f-${id}`) as HTMLInputElement | null;
    input?.focus();
    input?.select();
    bar.changed('New factor added, weighted 1, with every site scored at the middle of the scale.');
  });
  root.querySelector('[data-add-site]')?.addEventListener('click', () => {
    const m = state.matrix;
    if (m.sites.length >= MAX_SITES) {
      announce(status, `The assessment already compares ${MAX_SITES} sites, the most this tool takes.`);
      return;
    }
    counter += 1;
    const id = `s-${Date.now().toString(36)}-${counter}`;
    m.sites.push({ id, name: `Site ${String.fromCharCode(65 + m.sites.length)}`, scores: Object.fromEntries(m.factors.map((f) => [f.id, Math.round(m.maxScore / 2)])) });
    renderMatrix();
    renderResults(false);
    const input = document.getElementById(`${uid}-s-${id}`) as HTMLInputElement | null;
    input?.focus();
    input?.select();
    bar.changed('New site added, scored at the middle of the scale on every factor.');
  });

  // The note has its own timer, so typing in it never cancels a pending recalculation.
  let noteTimer = 0;
  note?.addEventListener('input', () => {
    state.note = note.value;
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => bar.changed(), 600);
  });
  root.querySelector('[data-form]')?.addEventListener('submit', (e) => e.preventDefault());

  if (note) note.value = state.note;
  renderMatrix();
  renderResults(false);
});
