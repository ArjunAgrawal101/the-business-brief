/** The revenue model planner in the browser: streams to add, change and remove, the forecast redrawn, storage on this device and a CSV export. */
import { announce, each, parseNumber, readConfig, store } from '../ix';
import { MAX_STREAMS, readRevenue, revenuePlan, revenueSensitivity, streamsFromDrafts, validateStreams, type StreamDraft } from '../../lib/lab/revenue';
import { revenueSvg } from '../../lib/lab/charts';
import { legendHtml, revenueFiguresHtml, revenueTableHtml, sensitivityHtml } from '../../lib/lab/render';
import { streamHtml } from '../../lib/lab/forms';
import { clearErrors, csvCell, download, newId, saveSummary, setError, stamp } from './kit';

interface Config {
  uid: string;
  currency: string;
  example: StreamDraft[];
}

const KEY = 'lab:revenue';
const UNIT_KEYS = ['price', 'units', 'growth', 'fee'] as const;
const SUB_KEYS = ['price', 'start', 'joining', 'growth', 'churn', 'fee'] as const;

const blank = (kind: StreamDraft['kind']): StreamDraft =>
  kind === 'units'
    ? { id: newId('s'), kind: 'units', label: '', price: 0, units: 0, growth: 0, fee: 0 }
    : { id: newId('s'), kind: 'subscription', label: '', price: 0, start: 0, joining: 0, growth: 0, churn: 0, fee: 0 };

/** A saved list of streams, checked field by field; anything malformed falls back to the example. */
function restore(raw: unknown, fallback: StreamDraft[]): StreamDraft[] {
  if (!Array.isArray(raw) || !raw.length) return fallback;
  const out: StreamDraft[] = [];
  for (const r of raw.slice(0, MAX_STREAMS)) {
    if (!r || typeof r !== 'object') return fallback;
    const s = r as Record<string, unknown>;
    const n = (k: string) => (s[k] === null || typeof s[k] === 'number' ? (s[k] as number | null) : 0);
    if (typeof s.id !== 'string' || typeof s.label !== 'string') return fallback;
    if (s.kind === 'units') out.push({ id: s.id, kind: 'units', label: s.label, price: n('price'), units: n('units'), growth: n('growth'), fee: n('fee') });
    else if (s.kind === 'subscription') out.push({ id: s.id, kind: 'subscription', label: s.label, price: n('price'), start: n('start'), joining: n('joining'), growth: n('growth'), churn: n('churn'), fee: n('fee') });
    else return fallback;
  }
  return out;
}

each('[data-ix="lab-revenue"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const curInput = root.querySelector<HTMLInputElement>('[data-currency]');
  const list = root.querySelector<HTMLElement>('[data-streams]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add]');
  const saved = store.get<{ currency?: string; streams?: unknown } | null>(KEY, null);
  let streams: StreamDraft[] = restore(saved?.streams, structuredClone(cfg.example));
  if (curInput && typeof saved?.currency === 'string' && saved.currency) curInput.value = saved.currency.slice(0, 4);
  // Nothing is kept, and nothing is offered to the business plan, until the learner changes something.
  let touched = Boolean(saved?.streams);
  let timer = 0;

  const currency = () => (curInput?.value.trim() || cfg.currency).slice(0, 4);

  const draw = () => {
    if (list) list.innerHTML = streams.map((s, i) => streamHtml(s, i + 1, cfg.uid, currency())).join('');
    root.querySelectorAll<HTMLButtonElement>('[data-streams] [data-remove]').forEach((b) => (b.hidden = streams.length <= 1));
    if (addBtn) addBtn.disabled = streams.length >= MAX_STREAMS;
  };

  const read = () => {
    root.querySelectorAll<HTMLElement>('[data-stream]').forEach((li) => {
      const s = streams.find((x) => x.id === li.dataset.stream);
      if (!s) return;
      s.label = li.querySelector<HTMLInputElement>('[data-k="label"]')?.value ?? '';
      const keys = s.kind === 'units' ? UNIT_KEYS : SUB_KEYS;
      const box = li.querySelector<HTMLElement>(`[data-kind-fields="${s.kind}"]`);
      keys.forEach((k) => {
        const v = parseNumber(box?.querySelector<HTMLInputElement>(`[data-k="${k}"]`)?.value ?? '');
        (s as unknown as Record<string, number | null>)[k] = v;
      });
    });
  };

  const render = (say: boolean) => {
    const cur = currency();
    root.querySelectorAll<HTMLElement>('[data-cur-label]').forEach((e) => (e.textContent = cur));
    if (touched) store.set(KEY, { currency: cur, streams });
    const problems = validateStreams(streams);
    clearErrors(root);
    problems.forEach((p) => setError(root, p.field, p.message));
    root.classList.toggle('is-invalid', problems.length > 0);
    if (problems.length) {
      if (say) announce(status, `Check the streams: ${problems[0]?.message}`);
      return;
    }
    const ss = streamsFromDrafts(streams);
    const m = revenuePlan(ss);
    const sens = revenueSensitivity(ss);
    const set = (sel: string, html: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.innerHTML = html;
    };
    set('[data-figures]', revenueFiguresHtml(m, cur));
    set('[data-chart]', revenueSvg(m, { currency: cur, id: `${cfg.uid}-chart` }));
    set('[data-legend]', legendHtml(m, `${cfg.uid}-key`));
    set('[data-table]', revenueTableHtml(m, cur));
    set('[data-sens]', sensitivityHtml(sens, m.revenue, cur));
    const r = readRevenue(m, sens, cur);
    const interp = root.querySelector<HTMLElement>('[data-interp]');
    const impl = root.querySelector<HTMLElement>('[data-impl]');
    if (interp) interp.textContent = r.reading;
    if (impl) impl.textContent = r.implication;
    if (touched) saveSummary('revenue', { currency: cur, total: m.revenue, first: m.first, last: m.last, months: m.months.length, streams: m.totals.map((t) => ({ label: t.label, share: t.share })), endSubscribers: m.endSubscribers });
    if (say) announce(status, r.reading);
  };

  draw();
  render(false);

  root.addEventListener('input', (e) => {
    touched = true;
    read();
    const t = e.target as HTMLElement;
    if (t.matches('[data-k="label"]')) {
      const li = t.closest<HTMLElement>('[data-stream]');
      const legend = li?.querySelector('legend');
      const n = Array.from(root.querySelectorAll('[data-stream]')).indexOf(li as Element) + 1;
      const v = (t as HTMLInputElement).value.trim();
      if (legend) legend.innerHTML = `<span class="lab-stream__no" aria-hidden="true">${String(n).padStart(2, '0')}</span> Stream ${n}${v ? ': ' : ''}`;
      if (legend && v) {
        const span = document.createElement('span');
        span.textContent = v;
        legend.append(span);
      }
    }
    render(false);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 700);
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches('select[data-k="kind"]')) {
      touched = true;
      read();
      const li = t.closest<HTMLElement>('[data-stream]');
      const i = streams.findIndex((x) => x.id === li?.dataset.stream);
      const old = streams[i];
      if (!old) return;
      const kind = (t as HTMLSelectElement).value as StreamDraft['kind'];
      const fresh = blank(kind);
      // Keep what both kinds share: the name, the price, the growth and the fee.
      streams[i] = { ...fresh, id: old.id, label: old.label, price: old.price, growth: old.growth, fee: old.fee } as StreamDraft;
      draw();
      render(true);
      root.querySelector<HTMLSelectElement>(`[data-stream="${old.id}"] select[data-k="kind"]`)?.focus();
    }
  });

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || !root.contains(b)) return;
    if (!b.matches('[data-csv], [data-print]')) touched = true;
    if (b.matches('[data-remove]')) {
      read();
      const li = b.closest<HTMLElement>('[data-stream]');
      const i = streams.findIndex((x) => x.id === li?.dataset.stream);
      if (i < 0 || streams.length <= 1) return;
      const gone = streams[i];
      streams.splice(i, 1);
      draw();
      render(false);
      root.querySelectorAll<HTMLInputElement>('[data-stream] [data-k="label"]')[Math.min(i, streams.length - 1)]?.focus();
      announce(status, `Removed ${gone?.label.trim() || 'the stream'}.`);
    } else if (b.matches('[data-add]')) {
      read();
      if (streams.length >= MAX_STREAMS) return;
      const s = blank('units');
      streams.push(s);
      draw();
      render(false);
      root.querySelector<HTMLInputElement>(`[data-stream="${s.id}"] [data-k="label"]`)?.focus();
    } else if (b.matches('[data-clear]')) {
      if (!window.confirm('Clear every stream and start from blank? Your current streams will be replaced.')) return;
      streams = [blank('units')];
      draw();
      render(true);
    } else if (b.matches('[data-example]')) {
      if (!window.confirm("Load Refill Round's example? Your current streams will be replaced.")) return;
      streams = structuredClone(cfg.example);
      if (curInput) curInput.value = cfg.currency;
      draw();
      render(true);
    } else if (b.matches('[data-csv]')) {
      read();
      if (validateStreams(streams).length) {
        announce(status, 'Correct the highlighted streams before downloading.');
        return;
      }
      const m = revenuePlan(streamsFromDrafts(streams));
      const head = ['Month', ...m.streams.flatMap((s) => [`${s.label}: ${s.kind === 'subscription' ? 'subscribers' : 'units'}`, `${s.label}: revenue`]), 'Revenue', 'Channel fees', 'Revenue after fees'];
      const rows = m.months.map((r) => [r.month, ...r.streams.flatMap((c) => [c.units, c.revenue.toFixed(2)]), r.revenue.toFixed(2), r.fees.toFixed(2), r.net.toFixed(2)]);
      download([head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n', `revenue-forecast-${stamp()}.csv`, 'text/csv');
      announce(status, 'The forecast was saved as a CSV file.');
    } else if (b.matches('[data-print]')) {
      window.print();
    }
  });
});
