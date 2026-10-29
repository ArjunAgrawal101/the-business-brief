/**
 * IA Studio planner: saves the plan on this device, keeps the candidate
 * documents table, runs the checks in src/lib/ia.ts, compiles the proposal,
 * tracks the word count and totals the self-assessed marks.
 */
import { checkDocuments, daysBefore, earliestAllowed, selfMarkTotal, wordStatus, IA_LIMITS, type DocKind, type SupportingDoc } from '../lib/ia';
import { each, escapeHtml, readConfig, store } from './ix';

interface Config {
  criteria: Array<{ id: string; name: string; marks: number }>;
  steps: number;
  rows: number;
}

interface Saved {
  v: 2;
  fields: Record<string, string>;
  docs: SupportingDoc[];
}

const KEY = 'ia-plan';
const MAX_ROWS = 12;
const CONCEPTS: Record<string, string> = { change: 'Change', creativity: 'Creativity', ethics: 'Ethics', sustainability: 'Sustainability' };
const KINDS: DocKind[] = ['secondary', 'primary', 'transcript', 'textbook'];

function monthName(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function dayName(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

each('[data-ix="ia-plan"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const body = root.querySelector<HTMLTableSectionElement>('[data-docs]');
  const tpl = root.querySelector<HTMLTemplateElement>('[data-doc-template]');
  if (!form || !body || !tpl) throw new Error('IA planner markup is incomplete');
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const savedMsg = q<HTMLElement>('[data-saved]');

  /* ---------- Documents table ---------- */

  const rows = () => Array.from(body.querySelectorAll<HTMLTableRowElement>('tr[data-doc]'));

  const label = (row: HTMLTableRowElement, n: number) => {
    const names: Record<string, string> = {
      selected: `Use document ${n} as a supporting document`,
      title: `Document ${n}: title`,
      publisher: `Document ${n}: publisher or author`,
      published: `Document ${n}: month published`,
      kind: `Document ${n}: kind`,
      pages: `Document ${n}: length in A4 pages`,
    };
    row.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => el.setAttribute('aria-label', names[el.dataset.f ?? ''] ?? ''));
    row.querySelector('[data-remove]')?.setAttribute('aria-label', `Remove document ${n}`);
  };

  const addRow = (): HTMLTableRowElement | null => {
    if (rows().length >= MAX_ROWS) return null;
    const frag = tpl.content.cloneNode(true) as DocumentFragment;
    const row = frag.querySelector<HTMLTableRowElement>('tr');
    if (!row) return null;
    body.append(row);
    label(row, rows().length);
    return row;
  };

  const readDocs = (): SupportingDoc[] =>
    rows().map((row) => {
      const v = (f: string) => row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${f}"]`);
      const kind = (v('kind')?.value ?? 'secondary') as DocKind;
      return {
        title: v('title')?.value ?? '',
        publisher: v('publisher')?.value ?? '',
        published: v('published')?.value ?? '',
        kind: KINDS.includes(kind) ? kind : 'secondary',
        pages: Math.max(0, Math.floor(Number(v('pages')?.value) || 0)),
        selected: (v('selected') as HTMLInputElement | null)?.checked ?? false,
      };
    });

  const writeDocs = (docs: SupportingDoc[]) => {
    while (rows().length < Math.min(docs.length, MAX_ROWS)) addRow();
    rows().forEach((row, i) => {
      const d = docs[i];
      const set = (f: string, val: string) => {
        const el = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${f}"]`);
        if (el) el.value = val;
      };
      set('title', d?.title ?? '');
      set('publisher', d?.publisher ?? '');
      set('published', d?.published ?? '');
      set('kind', d?.kind ?? 'secondary');
      set('pages', d && d.pages > 0 ? String(d.pages) : '');
      const sel = row.querySelector<HTMLInputElement>('[data-f="selected"]');
      if (sel) sel.checked = d?.selected ?? false;
    });
  };

  /* ---------- Fields ---------- */

  const readFields = (): Record<string, string> => {
    const out: Record<string, string> = {};
    Array.from(form.elements).forEach((el) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
      if (!el.name || el.closest('[data-docs]')) return;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        if (el.checked) out[el.name] = el.type === 'checkbox' ? 'on' : el.value;
      } else if (el.value !== '') out[el.name] = el.value;
    });
    return out;
  };

  const writeFields = (f: Record<string, string>) => {
    Array.from(form.elements).forEach((el) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
      if (!el.name || el.closest('[data-docs]')) return;
      const v = f[el.name];
      if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = v === 'on';
      else if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = v === el.value;
      else el.value = v ?? '';
    });
  };

  /* ---------- Outputs ---------- */

  const render = () => {
    const f = readFields();
    const docs = readDocs();
    const submission = f.submission ?? '';

    // Step 1: timeline.
    const earliest = earliestAllowed(submission);
    const tlE = q<HTMLElement>('[data-tl-earliest]');
    if (tlE)
      tlE.textContent = earliest
        ? `Supporting documents must be published in ${monthName(earliest)} or later: no more than three years before you submit (guide, p. 54).`
        : 'Add the submission month to see the oldest publication date a supporting document can have.';
    const by = daysBefore(f.deadline ?? '', 14);
    const tlS = q<HTMLElement>('[data-tl-selfmark]');
    if (tlS)
      tlS.textContent = by
        ? `Mark your penultimate draft against the criteria by ${dayName(by)}, two weeks before your internal deadline (TSM, p. 72).`
        : 'Add the internal deadline to see when to mark your penultimate draft.';

    // Step 5: the proposal.
    const prop = q<HTMLElement>('[data-proposal]');
    if (prop) {
      const items: Array<[string, string | undefined]> = [
        ['Organization', f.org],
        ['Issue', f.issue],
        ['Research question', f.question],
        ['Direction', f.direction === 'forward' ? 'Forward-looking' : f.direction === 'backward' ? 'Backward-looking' : undefined],
        ['Key concept', f.lens ? CONCEPTS[f.lens] : undefined],
        ['How the concept frames it', f.lensuse],
        ['Tools and theories', f.tools],
      ];
      const filled = items.filter(([, v]) => v && v.trim() !== '');
      prop.innerHTML = filled.length
        ? `<h4 class="label label--ink">Initial proposal</h4><dl class="iap__dl">${items
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${v && v.trim() ? escapeHtml(v.trim()).replace(/\n/g, '<br>') : '<span class="muted">Not yet written</span>'}</dd></div>`)
            .join('')}</dl>`
        : '<p class="muted small">Your proposal appears here as you fill in steps 3 and 4.</p>';
    }

    // Step 6: document checks.
    const findings = checkDocuments(docs, submission);
    const list = q<HTMLElement>('[data-findings]');
    if (list) {
      list.innerHTML = findings
        .map((x) => `<li class="iap__finding iap__finding--${x.severity}"><span class="iap__sev">${x.severity === 'problem' ? 'Fix' : x.severity === 'advice' ? 'Note' : 'OK'}</span> <span>${escapeHtml(x.text)}</span> <span class="iap__src">${escapeHtml(x.source)}</span></li>`)
        .join('');
    }
    rows().forEach((row, i) => {
      const bad = findings.some((x) => x.doc === i && x.severity === 'problem');
      row.classList.toggle('is-problem', bad);
      row.classList.toggle('is-selected', docs[i]?.selected ?? false);
    });

    // Step 7: words.
    const words = Number(f.words ?? '');
    const ws = wordStatus(words);
    const wsEl = q<HTMLElement>('[data-words-status]');
    if (wsEl) {
      wsEl.textContent = ws.text;
      wsEl.dataset.severity = ws.severity;
    }
    const bar = q<HTMLElement>('[data-words-bar]');
    if (bar) {
      const share = Number.isFinite(words) && words > 0 ? Math.min(1, words / IA_LIMITS.words) : 0;
      bar.style.transform = `scaleX(${share})`;
      bar.dataset.over = String(words > IA_LIMITS.words);
    }

    // Step 9: self-marking.
    const marks: Record<string, number> = {};
    let marked = 0;
    cfg.criteria.forEach((k) => {
      const v = f[`mark-${k.id}`];
      if (v !== undefined && v !== '') {
        marks[k.id] = Number(v);
        marked += 1;
      }
    });
    const tot = q<HTMLElement>('[data-mark-total]');
    if (tot) tot.textContent = String(selfMarkTotal(marks, cfg.criteria));
    const cnt = q<HTMLElement>('[data-mark-count]');
    if (cnt) cnt.textContent = marked < cfg.criteria.length ? `(${marked} of ${cfg.criteria.length} criteria marked)` : '';

    // Progress.
    let done = 0;
    root.querySelectorAll<HTMLElement>('[data-step]').forEach((li) => {
      const on = f[`done-${li.dataset.step}`] === 'on';
      li.classList.toggle('is-done', on);
      if (on) done += 1;
    });
    const pt = q<HTMLElement>('[data-progress-text]');
    if (pt) pt.textContent = `${done} of ${cfg.steps} steps done`;
    const pb = q<HTMLElement>('[data-progress-bar]');
    if (pb) pb.style.transform = `scaleX(${done / cfg.steps})`;
  };

  /* ---------- Saving ---------- */

  const saved = store.get<unknown>(KEY, null);
  const isSaved = (x: unknown): x is Saved => typeof x === 'object' && x !== null && (x as Saved).v === 2 && Array.isArray((x as Saved).docs);
  if (isSaved(saved)) {
    writeFields(saved.fields ?? {});
    writeDocs(saved.docs);
  } else if (saved && typeof saved === 'object') {
    // The 0.1.0 planner saved a flat record of its fields.
    const old = saved as Record<string, string>;
    writeFields({ org: old.org ?? '', issue: old.issue ?? '', question: old.question ?? '', tools: old.tools ?? '', lens: old.lens ?? '' });
  }

  let timer = 0;
  const save = () => {
    const data: Saved = { v: 2, fields: readFields(), docs: readDocs() };
    store.set(KEY, data);
    const ok = JSON.stringify(store.get<Saved | null>(KEY, null)) === JSON.stringify(data);
    if (savedMsg) savedMsg.textContent = ok ? 'Saved on this device.' : 'This browser is not saving, so print or copy your plan before you leave.';
  };

  form.addEventListener('input', () => {
    render();
    window.clearTimeout(timer);
    timer = window.setTimeout(save, 400);
  });
  form.addEventListener('change', () => {
    render();
    save();
  });

  root.querySelector('[data-add-doc]')?.addEventListener('click', () => {
    const row = addRow();
    if (row) row.querySelector<HTMLInputElement>('[data-f="title"]')?.focus();
    else if (savedMsg) savedMsg.textContent = `The table holds up to ${MAX_ROWS} candidates.`;
    render();
    save();
  });

  body.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    if (!btn) return;
    const row = btn.closest('tr');
    if (!row) return;
    if (rows().length > 1) row.remove();
    else row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]').forEach((el) => (el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.checked = false) : (el.value = el instanceof HTMLSelectElement ? 'secondary' : '')));
    rows().forEach((r, i) => label(r, i + 1));
    root.querySelector<HTMLButtonElement>('[data-add-doc]')?.focus();
    render();
    save();
  });

  root.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

  root.querySelector('[data-clear]')?.addEventListener('click', () => {
    if (!window.confirm('Clear everything in the planner? This cannot be undone.')) return;
    form.reset();
    rows().slice(cfg.rows).forEach((r) => r.remove());
    store.remove(KEY);
    render();
    if (savedMsg) savedMsg.textContent = 'Cleared.';
  });

  render();
});
