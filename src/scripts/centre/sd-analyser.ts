/**
 * Checks a list of supporting documents against the guide's rules (number,
 * date to the month, who chose them, transcripts, textbooks) and the
 * recommended checks (a range of voices, data to analyse, length), through
 * src/lib/ia-docs.ts. Pure counting and dating: relevance and depth are for
 * the student and the teacher. Kept in bb:ia:sd.
 */
import { each, escapeHtml, store } from '../ix';
import { blankDoc as blank, checkDocuments, parseAnalyserState, submissionOf, type AnalyserState, type Doc } from '../../lib/ia-docs';
import { LABEL_TEXT } from '../../lib/guide-labels';

each('[data-ix="sd-analyser"]', (root) => {
  const rowsEl = root.querySelector<HTMLElement>('[data-rows]');
  const tpl = root.querySelector<HTMLTemplateElement>('[data-row-template]');
  const add = root.querySelector<HTMLButtonElement>('[data-add]');
  const checksEl = root.querySelector<HTMLElement>('[data-checks]');
  const yearEl = root.querySelector<HTMLInputElement>('[data-sub-year]');
  const monthEl = root.querySelector<HTMLSelectElement>('[data-sub-month]');
  if (!rowsEl || !tpl || !checksEl || !yearEl || !monthEl) return;

  const saved = parseAnalyserState(store.get<unknown>('ia:sd', null));
  let docs: Doc[] = saved.docs.length ? saved.docs : [blank(), blank(), blank()];
  const now = new Date();
  yearEl.value = String(saved.year ?? now.getFullYear() + (now.getMonth() > 3 ? 1 : 0));
  monthEl.value = saved.month;

  const read = (row: HTMLElement): Doc => {
    const v = (k: string) => row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${k}"]`)?.value.trim() ?? '';
    const b = (k: string) => row.querySelector<HTMLInputElement>(`[data-k="${k}"]`)?.checked ?? false;
    const year = /^\d{4}$/.test(v('year')) ? v('year') : '';
    const month = v('month');
    return { title: v('title'), published: year ? (month ? `${year}-${month}` : year) : '', voice: v('voice') || 'org', data: b('data'), long: b('long'), teacher: b('teacher'), textbook: b('textbook'), transcript: b('transcript') };
  };

  const state = (): AnalyserState => {
    const y = Number(yearEl.value);
    return { docs, year: Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : null, month: monthEl.value === 'october' ? 'october' : 'april' };
  };

  const evaluate = () => {
    docs = [...rowsEl.querySelectorAll<HTMLElement>('[data-row]')].map(read);
    const s = state();
    const checks = checkDocuments(docs, submissionOf(s));
    checksEl.innerHTML = checks
      .map((c) => `<li class="${c.ok === 'tip' ? 'is-tip' : c.ok ? 'is-ok' : 'is-no'}"><span>${escapeHtml(c.text)}<small>${escapeHtml(LABEL_TEXT[c.standing])}${c.source ? `, ${escapeHtml(c.source)}` : ''}. ${escapeHtml(c.why)}</small></span></li>`)
      .join('');
    store.set('ia:sd', s);
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
      const [year = '', month = ''] = d.published.split('-');
      (row.querySelector('[data-k="title"]') as HTMLInputElement).value = d.title;
      (row.querySelector('[data-k="year"]') as HTMLInputElement).value = year;
      (row.querySelector('[data-k="month"]') as HTMLSelectElement).value = month;
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
