/**
 * The research timeline in the browser: plans from planTimeline() in
 * src/lib/ia-tools.ts as the reader enters dates, exports to .ics and CSV,
 * and keeps the dates in bb:ia-timeline (the progress tracker reads them).
 */
import { announce, each, escapeHtml, store } from '../ix';
import { longDay, planTimeline, submissionNote, timelineCsv, timelineIcs, type Milestone, type Timeline } from '../../lib/ia-tools';
import { download, today, twoStepReset } from './ia-common';

const KEY = 'ia-timeline';
const STAND: Record<string, string> = { ib: 'IB requirement', strategy: 'Recommended', examiner: 'Examiner emphasis' };

interface Saved {
  start: string;
  deadline: string;
  session: '' | 'may' | 'november';
  year: string;
}

each('[data-ix="ia-timeline"]', (root) => {
  const live = root.querySelector<HTMLElement>('[data-live]');
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const field = (name: string) => form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  const err = root.querySelector<HTMLElement>('[data-err]');
  const listEl = root.querySelector<HTMLElement>('[data-list]');
  const titleEl = root.querySelector<HTMLElement>('[data-title]');
  const spanEl = root.querySelector<HTMLElement>('[data-span]');
  const warnEl = root.querySelector<HTMLElement>('[data-warnings]');
  const subEl = root.querySelector<HTMLElement>('[data-submission]');
  const exampleHtml = listEl?.innerHTML ?? '';
  const exampleTitle = titleEl?.textContent ?? '';
  const exampleSpan = spanEl?.textContent ?? '';

  const saved = store.get<Partial<Saved>>(KEY, {});
  const set = (name: string, v: string | undefined) => {
    const el = field(name);
    if (el && typeof v === 'string') el.value = v;
  };
  set('start', saved.start || today());
  set('deadline', saved.deadline);
  set('session', saved.session);
  set('year', saved.year);

  let plan: Timeline | null = null;

  const read = (): Saved => ({
    start: field('start')?.value ?? '',
    deadline: field('deadline')?.value ?? '',
    session: (field('session')?.value as Saved['session']) ?? '',
    year: field('year')?.value ?? '',
  });

  const item = (m: Milestone, now: string) =>
    `<li class="tl-item tl-item--${m.standing}${m.date < now ? ' is-past' : ''}"><p class="tl-date">${escapeHtml(longDay(m.date))}</p><div><p class="tl-title">${escapeHtml(m.title)}</p><p class="tl-detail">${escapeHtml(m.detail)}</p></div><p class="tl-stand">${STAND[m.standing]}${m.source ? `<span>${escapeHtml(m.source)}</span>` : ''}</p></li>`;

  const render = (say = false) => {
    const s = read();
    store.set(KEY, s);
    const year = Number(s.year);
    if (subEl) subEl.textContent = submissionNote(s.session, Number.isInteger(year) && year > 2000 ? year : null);
    const deadlineEl = field('deadline');
    if (!s.deadline) {
      plan = null;
      if (err) err.textContent = '';
      deadlineEl?.removeAttribute('aria-invalid');
      if (listEl) listEl.innerHTML = exampleHtml;
      if (titleEl) titleEl.textContent = exampleTitle;
      if (spanEl) spanEl.textContent = `${exampleSpan} Enter your deadline to make your own plan.`;
      if (warnEl) warnEl.hidden = true;
      return;
    }
    const r = planTimeline(s.start, s.deadline);
    if ('error' in r) {
      plan = null;
      if (err) err.textContent = r.error;
      deadlineEl?.setAttribute('aria-invalid', 'true');
      if (say) announce(live, r.error);
      return;
    }
    plan = r;
    if (err) err.textContent = '';
    deadlineEl?.removeAttribute('aria-invalid');
    const now = today();
    if (listEl) listEl.innerHTML = r.milestones.map((m) => item(m, now)).join('');
    if (titleEl) titleEl.textContent = `Your plan: ${longDay(s.start)} to ${longDay(s.deadline)}`;
    if (spanEl) spanEl.textContent = `${r.days} days, with the last ${r.days >= 42 ? 'two weeks' : 'part'} kept for the final check.`;
    if (warnEl) {
      warnEl.hidden = r.warnings.length === 0;
      warnEl.innerHTML = r.warnings.map((w) => `<li><span class="it-word it-word--advice">Advice</span><span>${escapeHtml(w)}</span></li>`).join('');
    }
    if (say) announce(live, `Plan made: ${r.milestones.length} milestones over ${r.days} days. The first is ${r.milestones[0]?.title ?? ''}, by ${longDay(r.milestones[0]?.date ?? '')}.`);
  };

  form?.addEventListener('change', () => render(true));
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    render(true);
  });

  const need = () => {
    if (plan) return true;
    if (err) err.textContent = 'Enter your deadline first: the export is of your own plan.';
    field('deadline')?.focus();
    return false;
  };
  root.querySelector<HTMLButtonElement>('[data-ics]')?.addEventListener('click', () => {
    if (!need() || !plan) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    download('business-brief-ia-timeline.ics', timelineIcs(plan.milestones, stamp), 'text/calendar;charset=utf-8');
    announce(live, 'Calendar file downloaded. Open it to add the milestones to your calendar.');
  });
  root.querySelector<HTMLButtonElement>('[data-csv]')?.addEventListener('click', () => {
    if (!need() || !plan) return;
    download('business-brief-ia-timeline.csv', timelineCsv(plan.milestones), 'text/csv;charset=utf-8');
    announce(live, 'Timeline downloaded as CSV.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  twoStepReset(root, () => {
    store.remove(KEY);
    set('start', today());
    set('deadline', '');
    set('session', '');
    set('year', '');
    render();
    announce(live, 'Dates cleared. The illustrative plan is shown again.');
  });

  render();
});
