/**
 * The IA progress tracker in the browser: stage statuses and notes, the word
 * count against the limit, the final checks, and a summary that reads the
 * other tools' saved work (bb:ia-timeline, bb:ia-documents, bb:ia-concept).
 * Kept in bb:ia-progress. It reports what is in place; it never predicts a mark.
 */
import { announce, each, escapeHtml, store } from '../ix';
import { CONCEPT_NAMES, STAGES, longDay, parseProgress, planTimeline, progressSummary, setStage, type ConceptId, type ProgressState, type StageStatus, type Timeline } from '../../lib/ia-tools';
import { wordStatus } from '../../lib/ia';
import { download, today, twoStepReset } from './ia-common';

const KEY = 'ia-progress';

each('[data-ix="ia-progress"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  let state: ProgressState = parseProgress(store.get<unknown>(KEY, null));
  const save = () => store.set(KEY, state);
  const rows = [...root.querySelectorAll<HTMLElement>('[data-stage]')];
  const words = root.querySelector<HTMLInputElement>('[data-words]');
  const wordsOut = root.querySelector<HTMLElement>('[data-words-out]');
  const finals = [...root.querySelectorAll<HTMLInputElement>('[data-final]')];
  const finalCount = root.querySelector<HTMLElement>('[data-final-count]');

  // What the other tools hold, if the reader has used them.
  const tl = store.get<{ start?: string; deadline?: string } | null>('ia-timeline', null);
  const plan: Timeline | null = tl?.deadline ? ((r) => ('error' in r ? null : r))(planTimeline(tl.start || today(), tl.deadline)) : null;
  const docs = store.get<{ docs?: Array<{ title?: string; origin?: string; selected?: boolean }> } | null>('ia-documents', null);
  const concept = store.get<{ concept?: string } | null>('ia-concept', null);

  const paintRow = (row: HTMLElement) => {
    const id = row.dataset.stage ?? '';
    const st = state.stages[id];
    const sel = row.querySelector<HTMLSelectElement>('[data-status]');
    const note = row.querySelector<HTMLInputElement>('[data-note]');
    const done = row.querySelector<HTMLElement>('[data-done-on]');
    if (sel) sel.value = st?.status ?? 'not-started';
    if (note && document.activeElement !== note) note.value = st?.note ?? '';
    const due = plan?.milestones.find((m) => m.id === id);
    if (done) done.textContent = st?.status === 'done' && st.done ? `Done on ${longDay(st.done)}.` : due ? `Planned for ${longDay(due.date)}.` : '';
    row.classList.toggle('is-done', st?.status === 'done');
  };

  const paintSummary = () => {
    const s = progressSummary(state, today(), plan);
    const set = (sel: string, html: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.innerHTML = html;
    };
    set('[data-done]', `${s.done} of ${s.total}`);
    set('[data-next]', s.next ? escapeHtml(s.next.title) : 'Every stage is done. Read it once more against the criteria.');
    if (plan && s.daysLeft !== null)
      set('[data-left]', s.daysLeft >= 0 ? `${s.daysLeft} ${s.daysLeft === 1 ? 'day' : 'days'} left, to ${escapeHtml(longDay(plan.milestones.find((m) => m.id === 'final')?.date ?? ''))}` : 'The deadline in your timeline has passed. Check it with your teacher.');
    const listed = (docs?.docs ?? []).filter((d) => d && (d.title?.trim() || d.origin?.trim()));
    if (listed.length) {
      const n = listed.filter((d) => d.selected).length;
      set('[data-docs]', `${n} selected of ${listed.length} listed${n < 3 || n > 5 ? ': the guide asks for three to five' : ''}`);
    }
    const k = concept?.concept as ConceptId | undefined;
    if (k && CONCEPT_NAMES[k]) set('[data-lens]', `${CONCEPT_NAMES[k]}: state it on the title page`);
    const overdue = root.querySelector<HTMLElement>('[data-overdue]');
    if (overdue) {
      overdue.hidden = s.overdue.length === 0;
      overdue.innerHTML = s.overdue.map((t) => `<li><span class="it-word it-word--advice">Overdue</span><span>${escapeHtml(t)}: its planned date has passed.</span></li>`).join('');
    }
  };

  const paintWords = () => {
    if (!wordsOut) return;
    const n = state.words;
    if (words && document.activeElement !== words) words.value = n === null ? '' : String(n);
    const st = wordStatus(n ?? 0);
    wordsOut.textContent = n === null ? 'Enter the count of the words that count.' : st.text;
    wordsOut.classList.toggle('is-over', st.severity === 'problem');
  };

  const paintFinals = () => {
    finals.forEach((f) => (f.checked = state.checks.includes(f.value)));
    if (finalCount) finalCount.textContent = `${state.checks.filter((c) => finals.some((f) => f.value === c)).length} of ${finals.length} in place.`;
  };

  const paintAll = () => {
    rows.forEach(paintRow);
    paintSummary();
    paintWords();
    paintFinals();
  };

  rows.forEach((row) => {
    const id = row.dataset.stage ?? '';
    row.querySelector<HTMLSelectElement>('[data-status]')?.addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value as StageStatus;
      state = setStage(state, id, v, today());
      save();
      paintRow(row);
      paintSummary();
      const title = STAGES.find((s) => s.id === id)?.title ?? 'Stage';
      announce(live, `${title}: ${v === 'done' ? 'done' : v === 'in-progress' ? 'in progress' : 'not started'}. ${progressSummary(state, today(), plan).done} of ${STAGES.length} stages done.`);
    });
    let t = 0;
    row.querySelector<HTMLInputElement>('[data-note]')?.addEventListener('input', (e) => {
      window.clearTimeout(t);
      const value = (e.target as HTMLInputElement).value.slice(0, 2000);
      t = window.setTimeout(() => {
        const prev = state.stages[id] ?? { status: 'not-started' as StageStatus, note: '', done: '' };
        state = { ...state, stages: { ...state.stages, [id]: { ...prev, note: value } } };
        save();
      }, 300);
    });
  });

  words?.addEventListener('input', () => {
    const v = Number(words.value);
    state = { ...state, words: words.value.trim() === '' || !Number.isFinite(v) || v < 0 ? null : Math.floor(v) };
    save();
    paintWords();
  });

  finals.forEach((f) =>
    f.addEventListener('change', () => {
      state = { ...state, checks: finals.filter((x) => x.checked).map((x) => x.value) };
      save();
      paintFinals();
    }),
  );

  root.querySelector<HTMLButtonElement>('[data-json]')?.addEventListener('click', () => {
    download('business-brief-ia-progress.json', JSON.stringify({ exported: new Date().toISOString(), key: 'bb:ia-progress', state }, null, 2), 'application/json');
    announce(live, 'Backup downloaded.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  twoStepReset(root, () => {
    state = parseProgress(null);
    store.remove(KEY);
    paintAll();
    announce(live, 'Your progress was cleared from this device.');
  });

  paintAll();
});
