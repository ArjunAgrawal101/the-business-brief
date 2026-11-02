/**
 * Checks a list of supporting documents against the guide's rules (number,
 * date, who chose them, transcripts, textbooks) and the recommended checks
 * (a range of voices, data to analyse, length). Pure counting and dating:
 * relevance and depth are for the student and the teacher.
 */
import { each, escapeHtml, store } from '../ix';
import { blankDoc as blank, checkDocuments, type Doc } from '../../lib/ia-docs';

each('[data-ix="sd-analyser"]', (root) => {
  const rowsEl = root.querySelector<HTMLElement>('[data-rows]');
  const tpl = root.querySelector<HTMLTemplateElement>('[data-row-template]');
  const add = root.querySelector<HTMLButtonElement>('[data-add]');
  const checksEl = root.querySelector<HTMLElement>('[data-checks]');
  const yearEl = root.querySelector<HTMLInputElement>('[data-sub-year]');
  const monthEl = root.querySelector<HTMLSelectElement>('[data-sub-month]');
  if (!rowsEl || !tpl || !checksEl || !yearEl || !monthEl) return;

  const saved = store.get<{ docs?: Doc[]; year?: number; month?: number }>('ia:sd', {});
  let docs: Doc[] = saved.docs?.length ? saved.docs : [blank(), blank(), blank()];
  const now = new Date();
  yearEl.value = String(saved.year ?? now.getFullYear() + (now.getMonth() > 3 ? 1 : 0));
  monthEl.value = String(saved.month ?? 3);

  const read = (row: HTMLElement): Doc => {
    const v = (k: string) => row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${k}"]`);
    const b = (k: string) => (row.querySelector<HTMLInputElement>(`[data-k="${k}"]`)?.checked ?? false);
    return { title: v('title')?.value ?? '', year: v('year')?.value ?? '', voice: v('voice')?.value ?? 'org', data: b('data'), long: b('long'), teacher: b('teacher'), textbook: b('textbook'), transcript: b('transcript') };
  };

  const evaluate = () => {
    docs = [...rowsEl.querySelectorAll<HTMLElement>('[data-row]')].map(read);
    const checks = checkDocuments(docs, Number(yearEl.value) || now.getFullYear(), Number(monthEl.value));
    checksEl.innerHTML = checks
      .map((c) => `<li class="${c.ok === 'tip' ? 'is-tip' : c.ok ? 'is-ok' : 'is-no'}"><span>${escapeHtml(c.text)}<small>${escapeHtml(c.label)}. ${escapeHtml(c.why)}</small></span></li>`)
      .join('');
    store.set('ia:sd', { docs, year: Number(yearEl.value), month: Number(monthEl.value) });
    if (add) add.disabled = docs.length >= 7;
  };

  const draw = () => {
    rowsEl.innerHTML = '';
    docs.forEach((d, i) => {
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      const row = frag.querySelector<HTMLElement>('[data-row]');
      if (!row) return;
      const legend = row.querySelector('legend');
      if (legend) legend.textContent = `SD${i + 1}`;
      (row.querySelector('[data-k="title"]') as HTMLInputElement).value = d.title;
      (row.querySelector('[data-k="year"]') as HTMLInputElement).value = d.year;
      (row.querySelector('[data-k="voice"]') as HTMLSelectElement).value = d.voice;
      (['data', 'long', 'teacher', 'textbook', 'transcript'] as const).forEach((k) => ((row.querySelector(`[data-k="${k}"]`) as HTMLInputElement).checked = d[k]));
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        docs = [...rowsEl.querySelectorAll<HTMLElement>('[data-row]')].map(read);
        docs.splice(i, 1);
        draw();
      });
      rowsEl.append(frag);
    });
    evaluate();
  };

  root.addEventListener('input', evaluate);
  root.addEventListener('change', evaluate);
  add?.addEventListener('click', () => {
    docs = [...rowsEl.querySelectorAll<HTMLElement>('[data-row]')].map(read);
    docs.push(blank());
    draw();
  });
  draw();
});
