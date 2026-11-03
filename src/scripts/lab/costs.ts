/** The start-up cost calculator in the browser: editable ledgers, recalculation, storage on this device and a CSV export. */
import { announce, each, parseNumber, readConfig, store } from '../ix';
import { costModel, fromDraft, HORIZON, MAX_LINES, readCosts, readMix, validateCosts, type CostDraft, type FundingDraft, type FundingKind, type LineDraft } from '../../lib/lab/costs';
import { runwayCaption, runwaySvg } from '../../lib/lab/charts';
import { costFiguresHtml, costTableHtml, mixHtml } from '../../lib/lab/render';
import { costLineHtml, type CostList } from '../../lib/lab/forms';
import { fmtMoney } from '../../lib/format';
import { clearErrors, csvCell, download, newId, saveSummary, setError, stamp } from './kit';

interface Config {
  uid: string;
  currency: string;
  example: CostDraft;
}

const KEY = 'lab:costs';
const LISTS: CostList[] = ['oneOff', 'monthly', 'funding'];

const isLine = (v: unknown): v is LineDraft => !!v && typeof v === 'object' && typeof (v as LineDraft).id === 'string' && typeof (v as LineDraft).label === 'string' && ((v as LineDraft).amount === null || typeof (v as LineDraft).amount === 'number');

/** A saved draft, checked field by field; anything malformed falls back to the example. */
function restore(raw: unknown, fallback: CostDraft): CostDraft {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const list = (k: CostList) => (Array.isArray(r[k]) && (r[k] as unknown[]).every(isLine) ? (r[k] as LineDraft[]).slice(0, MAX_LINES) : null);
  const oneOff = list('oneOff');
  const monthly = list('monthly');
  const funding = list('funding') as FundingDraft[] | null;
  const n = (v: unknown) => (v === null || typeof v === 'number' ? (v as number | null) : null);
  if (!oneOff || !monthly || !funding) return fallback;
  return { oneOff, monthly, funding: funding.map((f) => ({ ...f, kind: (['own', 'loan', 'equity', 'grant', 'presales'] as FundingKind[]).includes(f.kind) ? f.kind : 'own' })), contribution: n(r.contribution), growth: n(r.growth), salesStart: n(r.salesStart) };
}

each('[data-ix="lab-costs"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const curInput = root.querySelector<HTMLInputElement>('[data-currency]');
  const scalar = (k: 'contribution' | 'growth' | 'salesStart') => root.querySelector<HTMLInputElement>(`[data-field="${k}"]`);
  const saved = store.get<{ currency?: string; draft?: unknown } | null>(KEY, null);
  let draft: CostDraft = restore(saved?.draft, structuredClone(cfg.example));
  if (curInput && typeof saved?.currency === 'string' && saved.currency) curInput.value = saved.currency.slice(0, 4);
  // Nothing is kept, and nothing is offered to the business plan, until the learner changes something.
  let touched = Boolean(saved?.draft);
  let timer = 0;

  const currency = () => (curInput?.value.trim() || cfg.currency).slice(0, 4);

  const drawList = (k: CostList) => {
    const ol = root.querySelector<HTMLElement>(`[data-lines="${k}"]`);
    if (ol) ol.innerHTML = draft[k].map((line, i) => costLineHtml(k, line, i + 1, cfg.uid, currency())).join('');
    const add = root.querySelector<HTMLButtonElement>(`[data-add="${k}"]`);
    if (add) add.disabled = draft[k].length >= MAX_LINES;
  };

  const drawAll = () => {
    LISTS.forEach(drawList);
    (['contribution', 'growth', 'salesStart'] as const).forEach((k) => {
      const el = scalar(k);
      if (el) el.value = draft[k] === null ? '' : String(draft[k]);
    });
  };

  /** Read the inputs back into the draft. */
  const read = () => {
    LISTS.forEach((k) => {
      root.querySelectorAll<HTMLElement>(`[data-lines="${k}"] [data-line]`).forEach((li) => {
        const line = draft[k].find((l) => l.id === li.dataset.line);
        if (!line) return;
        line.label = li.querySelector<HTMLInputElement>('[data-k="label"]')?.value ?? '';
        line.amount = parseNumber(li.querySelector<HTMLInputElement>('[data-k="amount"]')?.value ?? '');
        const kind = li.querySelector<HTMLSelectElement>('[data-k="kind"]');
        if (kind && k === 'funding') (line as FundingDraft).kind = kind.value as FundingKind;
      });
    });
    draft.contribution = parseNumber(scalar('contribution')?.value ?? '');
    draft.growth = parseNumber(scalar('growth')?.value ?? '');
    draft.salesStart = parseNumber(scalar('salesStart')?.value ?? '');
  };

  const render = (say: boolean) => {
    const cur = currency();
    root.querySelectorAll<HTMLElement>('[data-cur-label]').forEach((e) => (e.textContent = cur));
    if (touched) store.set(KEY, { currency: cur, draft });
    const problems = validateCosts(draft);
    clearErrors(root);
    problems.forEach((p) => setError(root, p.field, p.message));
    root.classList.toggle('is-invalid', problems.length > 0);
    if (problems.length) {
      if (say) announce(status, `Check the figures: ${problems[0]?.message}`);
      return;
    }
    const m = costModel(fromDraft(draft));
    LISTS.forEach((k) => {
      const t = root.querySelector<HTMLElement>(`[data-total="${k}"]`);
      if (t) t.textContent = fmtMoney(k === 'oneOff' ? m.oneOffTotal : k === 'monthly' ? m.monthlyTotal : m.fundingTotal, cur, 0);
    });
    const set = (sel: string, html: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.innerHTML = html;
    };
    set('[data-figures]', costFiguresHtml(m, cur));
    set('[data-chart]', runwaySvg(m, { currency: cur, id: `${cfg.uid}-chart` }));
    set('[data-table]', costTableHtml(m, cur));
    set('[data-mix]', mixHtml(m, cur));
    const r = readCosts(m, cur);
    const text = (sel: string, t: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.textContent = t;
    };
    text('[data-interp]', r.reading);
    text('[data-impl]', r.implication);
    text('[data-mix-reading]', readMix(m));
    text('[data-caption]', runwayCaption(m));
    if (touched) saveSummary('costs', { currency: cur, oneOff: m.oneOffTotal, monthly: m.monthlyTotal, funding: m.fundingTotal, cashAtLaunch: m.cashAtLaunch, runway: m.runway, runOut: m.runOut, breakEven: m.breakEvenMonth, gap: m.gap, horizon: HORIZON, mix: readMix(m) });
    if (say) announce(status, r.reading);
  };

  drawAll();
  render(false);

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    touched = true;
    read();
    if (t.matches('[data-k="label"]')) {
      const li = t.closest<HTMLElement>('[data-line]');
      const btn = li?.querySelector<HTMLButtonElement>('[data-remove]');
      const value = (t as HTMLInputElement).value.trim();
      if (btn) btn.setAttribute('aria-label', `Remove ${value || 'this line'}`);
    }
    render(false);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 700);
  });
  root.addEventListener('change', () => {
    touched = true;
    read();
    render(false);
  });

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!t || !root.contains(t)) return;
    if (!t.matches('[data-csv], [data-print]')) touched = true;
    if (t.matches('[data-remove]')) {
      read();
      const li = t.closest<HTMLElement>('[data-line]');
      const k = t.closest<HTMLElement>('[data-lines]')?.dataset.lines as CostList | undefined;
      if (!li || !k) return;
      const i = draft[k].findIndex((l) => l.id === li.dataset.line);
      const removed = draft[k][i];
      draft[k].splice(i, 1);
      drawList(k);
      render(false);
      const items = root.querySelectorAll<HTMLElement>(`[data-lines="${k}"] [data-line]`);
      const focus = items[Math.min(i, items.length - 1)]?.querySelector<HTMLInputElement>('[data-k="label"]') ?? root.querySelector<HTMLButtonElement>(`[data-add="${k}"]`);
      focus?.focus();
      announce(status, `Removed ${removed?.label.trim() || 'the line'}.`);
    } else if (t.dataset.add) {
      read();
      const k = t.dataset.add as CostList;
      if (draft[k].length >= MAX_LINES) return;
      const line: LineDraft | FundingDraft = k === 'funding' ? { id: newId('f'), label: '', amount: 0, kind: 'own' } : { id: newId(k === 'oneOff' ? 'o' : 'm'), label: '', amount: 0 };
      draft[k].push(line as LineDraft & FundingDraft);
      drawList(k);
      render(false);
      root.querySelector<HTMLInputElement>(`[data-lines="${k}"] [data-line="${line.id}"] [data-k="label"]`)?.focus();
    } else if (t.matches('[data-clear]')) {
      if (!window.confirm('Clear every figure and start from blank? Your current figures will be replaced.')) return;
      draft = { oneOff: [{ id: newId('o'), label: '', amount: 0 }], monthly: [{ id: newId('m'), label: '', amount: 0 }], funding: [{ id: newId('f'), label: '', amount: 0, kind: 'own' }], contribution: 0, growth: 0, salesStart: 1 };
      drawAll();
      render(true);
    } else if (t.matches('[data-example]')) {
      if (!window.confirm("Load Refill Round's example? Your current figures will be replaced.")) return;
      draft = structuredClone(cfg.example);
      if (curInput) curInput.value = cfg.currency;
      drawAll();
      render(true);
    } else if (t.matches('[data-csv]')) {
      read();
      if (validateCosts(draft).length) {
        announce(status, 'Correct the highlighted figures before downloading.');
        return;
      }
      const m = costModel(fromDraft(draft));
      const rows = [['Month', 'Opening balance', 'Outgoings', 'Contribution', 'Closing balance', 'Closing balance with no sales'], ...m.months.map((r) => [r.month, r.opening.toFixed(2), (-r.outgoings).toFixed(2), r.contribution.toFixed(2), r.closing.toFixed(2), r.noSales.toFixed(2)])];
      download(rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n', `start-up-cash-projection-${stamp()}.csv`, 'text/csv');
      announce(status, 'The projection was saved as a CSV file.');
    } else if (t.matches('[data-print]')) {
      window.print();
    }
  });
});
