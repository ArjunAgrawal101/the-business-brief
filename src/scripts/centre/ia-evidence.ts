/**
 * The evidence log in the browser: rows drawn from a template, each read as
 * quoted, used or integrated through src/lib/ia-evidence.ts, the whole log
 * summarized, and everything kept in bb:ia-evidence.
 */
import { announce, each, store } from '../ix';
import { LEVEL_WORD, MAX_ITEMS, blankItem, emptyEvidence, evidenceCsv, itemAdvice, levelOf, parseEvidence, summarizeEvidence, type EvidenceItem, type EvidenceState } from '../../lib/ia-evidence';
import { checksHtml, download, twoStepReset } from './ia-common';

const KEY = 'ia-evidence';
const FIELDS = ['sd', 'finding', 'tool', 'result', 'against', 'assumption', 'implication'] as const;

each('[data-ix="ia-evidence"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  const list = root.querySelector<HTMLElement>('[data-items]');
  const tpl = root.querySelector<HTMLTemplateElement>('[data-item-template]');
  const docsEl = root.querySelector<HTMLSelectElement>('select[name="docs"]');
  const summaryEl = root.querySelector<HTMLElement>('[data-summary]');
  const add = root.querySelector<HTMLButtonElement>('[data-add]');
  if (!list || !tpl || !docsEl) return;

  let state: EvidenceState = parseEvidence(store.get<unknown>(KEY, null));

  const readRow = (row: HTMLElement): EvidenceItem => {
    const item = blankItem();
    for (const f of FIELDS) item[f] = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${f}"]`)?.value ?? '';
    return item;
  };

  const read = (): EvidenceState => ({ v: 1, docs: Number(docsEl.value) || 5, items: [...list.querySelectorAll<HTMLElement>('[data-item]')].map(readRow) });

  const verdict = (row: HTMLElement, item: EvidenceItem) => {
    const level = levelOf(item);
    const levelEl = row.querySelector<HTMLElement>('[data-level]');
    const adviceEl = row.querySelector<HTMLElement>('[data-advice]');
    if (levelEl) levelEl.textContent = level === 'empty' ? '' : `Reading: ${LEVEL_WORD[level]}`;
    if (adviceEl) adviceEl.innerHTML = checksHtml(itemAdvice(item));
  };

  const render = () => {
    state = read();
    const rows = [...list.querySelectorAll<HTMLElement>('[data-item]')];
    rows.forEach((row, i) => verdict(row, state.items[i] ?? blankItem()));
    const sum = summarizeEvidence(state.items, state.docs);
    if (summaryEl) summaryEl.innerHTML = checksHtml(sum.checks);
    if (add) add.disabled = state.items.length >= MAX_ITEMS;
    store.set(KEY, state);
    return sum;
  };

  const draw = () => {
    list.innerHTML = '';
    docsEl.value = String(state.docs);
    state.items.forEach((item, i) => {
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      const row = frag.querySelector<HTMLElement>('[data-item]');
      if (!row) return;
      row.dataset.item = String(i);
      const legend = row.querySelector('legend');
      if (legend) legend.textContent = `Evidence ${i + 1}`;
      for (const f of FIELDS) {
        const input = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${f}"]`);
        const label = row.querySelector<HTMLLabelElement>(`[data-for="${f}"]`);
        if (input) {
          input.id = `ev-${i}-${f}`;
          input.value = item[f];
        }
        if (label) label.htmlFor = `ev-${i}-${f}`;
      }
      const remove = row.querySelector<HTMLButtonElement>('[data-remove]');
      if (remove) {
        remove.setAttribute('aria-label', `Remove evidence ${i + 1}`);
        remove.addEventListener('click', () => {
          state = read();
          state.items.splice(i, 1);
          if (!state.items.length) state.items.push(blankItem());
          draw();
          announce(live, `Evidence ${i + 1} removed.`);
          list.querySelector<HTMLElement>(`[data-item="${Math.min(i, state.items.length - 1)}"] [data-f="finding"]`)?.focus();
        });
      }
      list.append(frag);
    });
    render();
  };

  let timer = 0;
  root.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 200);
  });
  root.addEventListener('change', () => {
    const sum = render();
    announce(live, `${sum.quoted} quoted, ${sum.used} used, ${sum.integrated} integrated.`);
  });
  add?.addEventListener('click', () => {
    state = read();
    if (state.items.length >= MAX_ITEMS) return;
    state.items.push(blankItem());
    draw();
    const n = state.items.length - 1;
    list.querySelector<HTMLElement>(`[data-item="${n}"] [data-f="sd"]`)?.focus();
    announce(live, `Evidence ${n + 1} added.`);
  });
  root.querySelector<HTMLButtonElement>('[data-csv]')?.addEventListener('click', () => {
    download('business-brief-ia-evidence.csv', evidenceCsv(read().items), 'text/csv;charset=utf-8');
    announce(live, 'Log downloaded.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());
  twoStepReset(root, () => {
    store.remove(KEY);
    state = emptyEvidence();
    draw();
    announce(live, 'Cleared.');
  });

  draw();
});
