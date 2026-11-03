/** The competitor positioning map in the browser: sellers to add and remove, the map redrawn, the gap test, saving and export. */
import { nextId } from '../../lib/market-kit';
import { mapChecks, mapCsvRows, mapSummary, normalizeMap, readMap, scaleOf, validateMap, type Answer, type MapState, type ScaleId } from '../../lib/market-map';
import { brandRowHtml, focusOptions, mapChart, mapTable, spacesHtml, verdictHtml } from '../../lib/market-map-view';
import { checksHtml } from '../../lib/market-view';
import { announce, each, escapeHtml, readConfig } from '../ix';
import { fieldNumber, fieldValue, fill, mountKit, showProblems } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: MapState;
}

each('[data-ix="competitor-map"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const focusSel = root.querySelector<HTMLSelectElement>('[data-f="focus"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !rows || !focusSel) return;
  let timer = 0;

  const answer = (id: string): Answer => (form.querySelector<HTMLInputElement>(`[data-test="${id}"]:checked`)?.value as Answer) ?? 'unsure';
  const read = (): MapState => ({
    market: fieldValue(form, 'market'),
    scale: (fieldValue(form, 'scale') || '0-10') as ScaleId,
    x: { label: fieldValue(form, 'x-label'), low: fieldValue(form, 'x-low'), high: fieldValue(form, 'x-high') },
    y: { label: fieldValue(form, 'y-label'), low: fieldValue(form, 'y-low'), high: fieldValue(form, 'y-high') },
    focus: focusSel.value,
    brands: [...rows.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({ id: el.dataset.row ?? '', name: fieldValue(el, 'name'), x: fieldNumber(el, 'x'), y: fieldNumber(el, 'y'), note: cfg.defaults.brands.find((b) => b.id === el.dataset.row)?.note ?? '' })),
    test: { demand: answer('demand'), deliver: answer('deliver'), fit: answer('fit'), rivals: answer('rivals'), note: fieldValue(form, 't-note') },
  });

  const where = (w: string): string | null => {
    if (w === 'focus') return `${uid}-focus`;
    if (w === 'x-label' || w === 'y-label') return `${uid}-${w}`;
    const m = /^(.+)-(name|x|y)$/.exec(w);
    return m ? `${uid}-brand-${m[1]}-${m[2]}` : null;
  };

  const render = (say: boolean) => {
    const s = read();
    const problems = validateMap(s);
    showProblems(root, problems, where);
    const brandsErr = root.querySelector<HTMLElement>('[data-err-for="brands"]');
    if (brandsErr) brandsErr.textContent = problems.find((p) => p.where === 'brands')?.message ?? '';
    root.querySelectorAll<HTMLElement>('[data-head="x"]').forEach((el) => (el.textContent = s.x.label || 'Across'));
    root.querySelectorAll<HTMLElement>('[data-head="y"]').forEach((el) => (el.textContent = s.y.label || 'Up'));
    fill(root, '[data-verdict]', verdictHtml(s));
    rows.querySelectorAll<HTMLElement>('[data-row]').forEach((tr) => tr.classList.toggle('is-focus', tr.dataset.row === s.focus));
    const grid = root.querySelector<HTMLElement>('.mk-grid--map');
    grid?.classList.toggle('is-invalid', problems.length > 0);
    if (problems.length) {
      if (say) announce(status, `Check the map: ${problems[0]?.message ?? ''}`);
      return;
    }
    const r = readMap(s);
    fill(root, '[data-chart]', mapChart(s, `${uid}-chart`));
    fill(root, '[data-table]', mapTable(s));
    fill(root, '[data-spaces]', spacesHtml(s));
    fill(root, '[data-interp]', escapeHtml(r.reading));
    fill(root, '[data-impl]', escapeHtml(r.implication));
    fill(root, '[data-checks]', checksHtml(mapChecks(s)));
    if (say) announce(status, `Map redrawn. ${r.reading.split('. ')[0]}.`);
  };

  const drawRows = (s: MapState) => {
    rows.innerHTML = s.brands.map((b, i) => brandRowHtml(b, i, uid, s)).join('');
    const keep = s.brands.some((b) => b.id === s.focus) ? s.focus : (s.brands[0]?.id ?? '');
    focusSel.innerHTML = focusOptions({ ...s, focus: keep });
    focusSel.value = keep;
  };

  const apply = (s: MapState) => {
    const set = (f: string, v: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-f="${f}"]`);
      if (el) el.value = v;
    };
    set('market', s.market);
    set('scale', s.scale);
    set('x-label', s.x.label);
    set('x-low', s.x.low);
    set('x-high', s.x.high);
    set('y-label', s.y.label);
    set('y-low', s.y.low);
    set('y-high', s.y.high);
    set('t-note', s.test.note);
    (['demand', 'deliver', 'fit', 'rivals'] as const).forEach((q) => {
      const el = form.querySelector<HTMLInputElement>(`[data-test="${q}"][value="${s.test[q]}"]`);
      if (el) el.checked = true;
    });
    drawRows(s);
    render(false);
  };

  const kit = mountKit<MapState>({ root, slug: cfg.slug, name: 'Positioning map', defaults: cfg.defaults, normalize: normalizeMap, read, apply, csv: mapCsvRows, text: mapSummary });

  const onEdit = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.matches('[data-f="name"]')) {
      const s = read();
      const keep = focusSel.value;
      focusSel.innerHTML = focusOptions({ ...s, focus: keep });
      focusSel.value = keep;
    }
    if (t.matches('[data-f="scale"]')) {
      // A new scale changes the limits each rating may take; redraw the rows so their min and max match.
      const s = read();
      const sc = scaleOf(s.scale);
      s.brands = s.brands.map((b) => ({ ...b, x: Math.min(sc.max, Math.max(sc.min, Number.isFinite(b.x) ? b.x : sc.min)), y: Math.min(sc.max, Math.max(sc.min, Number.isFinite(b.y) ? b.y : sc.min)) }));
      drawRows(s);
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 250);
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const s = read();
    if (s.brands.length >= 12) {
      announce(status, 'Twelve sellers is the most the map holds.');
      return;
    }
    const sc = scaleOf(s.scale);
    const id = nextId('b', s.brands.map((b) => b.id));
    s.brands.push({ id, name: '', x: (sc.min + sc.max) / 2 + 0.5, y: (sc.min + sc.max) / 2 + 0.5, note: '' });
    drawRows(s);
    render(false);
    kit.changed();
    root.querySelector<HTMLInputElement>(`#${uid}-brand-${id}-name`)?.focus();
    announce(status, `Seller ${s.brands.length} added. Name it and enter its ratings.`);
  });
  rows.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    if (!btn) return;
    const id = btn.closest<HTMLElement>('[data-row]')?.dataset.row;
    const s = read();
    if (s.brands.length <= 3) {
      announce(status, 'A map needs at least three sellers, so this one stays.');
      return;
    }
    const gone = s.brands.find((b) => b.id === id);
    s.brands = s.brands.filter((b) => b.id !== id);
    drawRows(s);
    render(false);
    kit.changed();
    root.querySelector<HTMLButtonElement>('[data-add]')?.focus();
    announce(status, `${gone?.name || 'Seller'} removed. ${readMap(read()).reading.split('. ')[0]}.`);
  });
});
