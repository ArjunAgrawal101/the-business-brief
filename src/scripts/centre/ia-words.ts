/**
 * The word count planner in the browser: sections drawn from a template, the
 * plan and the words written added up and checked through
 * src/lib/ia-words.ts, and everything kept in bb:ia-words.
 */
import { announce, each, store } from '../ix';
import { IA_LIMITS } from '../../lib/ia';
import { MAX_SECTIONS, NOT_COUNTED, emptyWords, parseWords, suggestedSections, summarizeWords, type Section, type WordsState } from '../../lib/ia-words';
import { checksHtml, twoStepReset } from './ia-common';

const KEY = 'ia-words';
const fmt = (n: number) => n.toLocaleString('en-GB');

each('[data-ix="ia-words"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  const rowsEl = root.querySelector<HTMLElement>('[data-rows]');
  const tpl = root.querySelector<HTMLTemplateElement>('[data-row-template]');
  const checksEl = root.querySelector<HTMLElement>('[data-checks]');
  const add = root.querySelector<HTMLButtonElement>('[data-add]');
  const excludedEl = root.querySelector<HTMLElement>('[data-excluded]');
  const boxes = [...root.querySelectorAll<HTMLInputElement>('input[name="excluded"]')];
  if (!rowsEl || !tpl) return;

  let state: WordsState = parseWords(store.get<unknown>(KEY, null));

  const num = (row: HTMLElement, f: string): number | null => {
    const v = row.querySelector<HTMLInputElement>(`[data-f="${f}"]`)?.value.trim() ?? '';
    const n = Number(v);
    return v !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };
  const readRow = (row: HTMLElement): Section => {
    const part = row.querySelector<HTMLSelectElement>('[data-f="part"]')?.value;
    return {
      name: row.querySelector<HTMLInputElement>('[data-f="name"]')?.value ?? '',
      part: part === 'introduction' || part === 'conclusion' ? part : 'body',
      planned: num(row, 'planned'),
      written: num(row, 'written'),
    };
  };
  const read = (): WordsState => ({ v: 1, sections: [...rowsEl.querySelectorAll<HTMLElement>('[data-row]')].map(readRow), excluded: boxes.filter((b) => b.checked).map((b) => b.value) });

  const total = (sel: string, bar: string, n: number) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.textContent = `${fmt(n)} of ${fmt(IA_LIMITS.words)}${n > IA_LIMITS.words ? `: ${fmt(n - IA_LIMITS.words)} over` : ''}`;
    const b = root.querySelector<HTMLElement>(bar);
    if (b) {
      b.style.transform = `scaleX(${Math.min(1, n / IA_LIMITS.words)})`;
      b.parentElement?.classList.toggle('is-over', n > IA_LIMITS.words);
    }
  };

  const render = () => {
    state = read();
    const sum = summarizeWords(state.sections);
    total('[data-planned]', '[data-planned-bar]', sum.planned);
    total('[data-written]', '[data-written-bar]', sum.written);
    if (checksEl) checksEl.innerHTML = checksHtml(sum.checks);
    if (excludedEl) excludedEl.textContent = `${state.excluded.length} of ${NOT_COUNTED.length} checked.${state.excluded.length === NOT_COUNTED.length ? ' Your count leaves out everything the guide excludes.' : ''}`;
    if (add) add.disabled = state.sections.length >= MAX_SECTIONS;
    store.set(KEY, state);
    return sum;
  };

  const draw = () => {
    rowsEl.innerHTML = '';
    state.sections.forEach((s, i) => {
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      const row = frag.querySelector<HTMLElement>('[data-row]');
      if (!row) return;
      const set = (f: string, v: string, label: string) => {
        const el = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${f}"]`);
        if (!el) return;
        el.value = v;
        el.setAttribute('aria-label', `Section ${i + 1}: ${label}`);
      };
      set('name', s.name, 'name');
      set('part', s.part, 'part of the project');
      set('planned', s.planned === null ? '' : String(s.planned), 'words planned');
      set('written', s.written === null ? '' : String(s.written), 'words written that count');
      const remove = row.querySelector<HTMLButtonElement>('[data-remove]');
      if (remove) {
        remove.setAttribute('aria-label', `Remove section ${i + 1}`);
        remove.addEventListener('click', () => {
          state = read();
          state.sections.splice(i, 1);
          draw();
          announce(live, `Section ${i + 1} removed.`);
          (rowsEl.querySelector<HTMLElement>(`[data-row]:nth-child(${Math.min(i + 1, state.sections.length)}) [data-f="name"]`) ?? add)?.focus();
        });
      }
      rowsEl.append(frag);
    });
    boxes.forEach((b) => (b.checked = state.excluded.includes(b.value)));
    render();
  };

  let timer = 0;
  root.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 200);
  });
  root.addEventListener('change', () => {
    const sum = render();
    announce(live, `Planned ${fmt(sum.planned)}, written ${fmt(sum.written)}, of ${fmt(IA_LIMITS.words)}.`);
  });
  add?.addEventListener('click', () => {
    state = read();
    if (state.sections.length >= MAX_SECTIONS) return;
    state.sections.push({ name: '', part: 'body', planned: null, written: null });
    draw();
    rowsEl.querySelector<HTMLElement>('[data-row]:last-child [data-f="name"]')?.focus();
    announce(live, 'Section added.');
  });
  root.querySelector<HTMLButtonElement>('[data-suggest]')?.addEventListener('click', () => {
    state = { ...read(), sections: suggestedSections() };
    draw();
    announce(live, 'The suggested split is in place: change it to fit your project.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());
  twoStepReset(root, () => {
    store.remove(KEY);
    state = emptyWords();
    draw();
    announce(live, 'Cleared.');
  });

  draw();
});
