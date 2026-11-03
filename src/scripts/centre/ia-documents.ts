/**
 * The supporting document checklist in the browser: reads the document
 * slots, questions each document and checks the set (src/lib/ia-tools.ts),
 * and keeps the list in bb:ia-documents.
 */
import { announce, each, escapeHtml, store } from '../ix';
import { blankEntry, checkSet, documentsCsv, evaluateSource, type DocEntry, type Evaluation } from '../../lib/ia-tools';
import { checksHtml, download, twoStepReset } from './ia-common';

const KEY = 'ia-documents';
const BOOLS = ['named', 'method', 'sourced', 'selected'] as const;
const TEXTS = ['title', 'origin', 'voice', 'kind', 'published', 'purpose', 'relevance', 'data'] as const;

interface Saved {
  submission: string;
  docs: Array<Partial<DocEntry>>;
}

const hasContent = (d: DocEntry) => Boolean(d.title.trim() || d.origin.trim() || d.published.trim() || d.relevance.trim() || d.data.trim());

each('[data-ix="ia-documents"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  const slots = [...root.querySelectorAll<HTMLElement>('[data-doc]')];
  const submission = root.querySelector<HTMLInputElement>('[name="submission"]');
  const f = (slot: HTMLElement, name: string) => slot.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${name}"]`);

  const readSlot = (slot: HTMLElement): DocEntry => {
    const d = blankEntry();
    for (const k of TEXTS) {
      const el = f(slot, k);
      if (el) (d as unknown as Record<string, string>)[k] = el.value;
    }
    for (const k of BOOLS) d[k] = (f(slot, k) as HTMLInputElement | null)?.checked ?? false;
    const pages = Number(f(slot, 'pages')?.value ?? 0);
    d.pages = Number.isFinite(pages) && pages > 0 ? Math.floor(pages) : 0;
    return d;
  };

  const writeSlot = (slot: HTMLElement, d: Partial<DocEntry>) => {
    for (const k of TEXTS) {
      const el = f(slot, k);
      const v = d[k];
      if (el && typeof v === 'string') el.value = v;
    }
    for (const k of BOOLS) {
      const el = f(slot, k) as HTMLInputElement | null;
      if (el && typeof d[k] === 'boolean') el.checked = d[k] as boolean;
    }
    const p = f(slot, 'pages');
    if (p && typeof d.pages === 'number' && d.pages > 0) p.value = String(d.pages);
  };

  const saved = store.get<Partial<Saved>>(KEY, {});
  if (submission && typeof saved.submission === 'string') submission.value = saved.submission;
  if (Array.isArray(saved.docs)) saved.docs.forEach((d, i) => slots[i] && d && typeof d === 'object' && writeSlot(slots[i] as HTMLElement, d));

  // Show the documents in use, plus one empty slot; the rest wait behind "Add another document".
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add]');
  const showSlots = (n: number) => {
    slots.forEach((s, i) => (s.hidden = i >= n));
    if (addBtn) addBtn.hidden = n >= slots.length;
  };
  const used = slots.map((s) => hasContent(readSlot(s)));
  let visible = Math.min(slots.length, Math.max(3, used.lastIndexOf(true) + 2));
  showSlots(visible);
  addBtn?.addEventListener('click', () => {
    visible = Math.min(slots.length, visible + 1);
    showSlots(visible);
    const next = slots[visible - 1];
    next?.querySelector<HTMLInputElement>('[data-f="title"]')?.focus();
    announce(live, `Document ${visible} added.`);
  });

  const setEl = root.querySelector<HTMLElement>('[data-set]');
  const evalEl = root.querySelector<HTMLElement>('[data-eval]');
  const notesEl = root.querySelector<HTMLElement>('[data-notes]');
  const ORDER: Array<keyof Evaluation> = ['origin', 'purpose', 'date', 'reliability', 'relevance'];
  const NAMES: Record<keyof Evaluation, string> = { origin: 'Origin', purpose: 'Purpose', date: 'Date', reliability: 'Reliability', relevance: 'Relevance' };
  const WORD_CLASS = { ok: 'ok', check: 'advice', missing: 'problem' } as const;

  const listed = () =>
    slots
      .map((s, i) => ({ i, d: readSlot(s) }))
      .filter((x) => hasContent(x.d));

  const render = () => {
    const sub = submission?.value ?? '';
    const docs = listed();
    if (setEl) setEl.innerHTML = checksHtml(checkSet(docs.map((x) => x.d), sub));
    if (evalEl)
      evalEl.innerHTML = docs.length
        ? docs
            .map(({ i, d }) => {
              const e = evaluateSource(d, sub);
              const cells = ORDER.map((k) => `<td><span class="it-word it-word--${WORD_CLASS[e[k].status]}">${escapeHtml(e[k].word)}</span></td>`).join('');
              return `<tr><th scope="row">SD${i + 1}${d.selected ? '' : ' (candidate)'}<br /><span class="small muted">${escapeHtml(d.title.trim() || 'Untitled')}</span></th>${cells}</tr>`;
            })
            .join('')
        : '<tr><td colspan="6" class="muted">List a document above to see it questioned.</td></tr>';
    if (notesEl)
      notesEl.innerHTML = docs
        .map(({ i, d }) => {
          const e = evaluateSource(d, sub);
          return `<details><summary>SD${i + 1}: ${escapeHtml(d.title.trim() || 'Untitled')}, in full</summary><dl>${ORDER.map((k) => `<div><dt>${NAMES[k]}</dt><dd>${escapeHtml(e[k].text)}</dd></div>`).join('')}</dl></details>`;
        })
        .join('');
    store.set(KEY, { submission: sub, docs: slots.map(readSlot) } satisfies Saved);
  };

  let timer = 0;
  root.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 300);
  });
  root.addEventListener('change', render);

  root.querySelector<HTMLButtonElement>('[data-csv]')?.addEventListener('click', () => {
    const docs = listed().map((x) => x.d);
    download('business-brief-ia-supporting-documents.csv', documentsCsv(docs, submission?.value ?? ''), 'text/csv;charset=utf-8');
    announce(live, `Downloaded the evaluation of ${docs.length} ${docs.length === 1 ? 'document' : 'documents'}.`);
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  twoStepReset(root, () => {
    slots.forEach((s, i) => {
      s.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]').forEach((el) => {
        if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = el.dataset.f === 'selected' && i < 5;
        else if (el instanceof HTMLSelectElement) el.selectedIndex = 0;
        else el.value = '';
      });
    });
    if (submission) submission.value = '';
    store.remove(KEY);
    visible = 3;
    showSlots(visible);
    render();
    announce(live, 'Cleared.');
  });

  render();
});
