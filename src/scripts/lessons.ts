/**
 * The teachers' lesson planner in the browser: when the teacher chooses a
 * lesson length or an SL or HL class, every plan is re-rendered with the same
 * functions the build used (src/lib/lessons.ts), the summaries are updated,
 * and the change is announced. The choice is kept as bb:lesson-plan, and the
 * page works the same when storage is blocked.
 */
import { announce, each, readConfig } from './ix';
import { DEFAULT_LENGTH, LESSON_LENGTHS, lessonsHtml, planSummary, type ClassLevel, type LessonSource } from '../lib/lessons';

interface Config {
  entries: Array<{ code: string; source: LessonSource }>;
}

const KEY = 'bb:lesson-plan';

function load(): { length: number; level: ClassLevel } {
  const fallback = { length: DEFAULT_LENGTH, level: 'HL' as ClassLevel };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as { length?: unknown; level?: unknown };
    return {
      length: (LESSON_LENGTHS as readonly number[]).includes(Number(v.length)) ? Number(v.length) : fallback.length,
      level: v.level === 'SL' || v.level === 'HL' ? v.level : fallback.level,
    };
  } catch {
    return fallback;
  }
}

function save(v: { length: number; level: ClassLevel }): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}

each('[data-ix="lessons"]', (root) => {
  const cfg = readConfig<Config>(root);
  const select = root.querySelector<HTMLSelectElement>('[data-length]');
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="ll-level"]')];
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!select || !radios.length) return;

  const current = (): { length: number; level: ClassLevel } => ({
    length: Number(select.value) || DEFAULT_LENGTH,
    level: radios.find((r) => r.checked)?.value === 'SL' ? 'SL' : 'HL',
  });

  const render = (say: boolean) => {
    const { length, level } = current();
    for (const e of cfg.entries) {
      const box = root.querySelector<HTMLElement>(`[data-code="${e.code}"]`);
      if (!box) continue;
      const plan = box.querySelector<HTMLElement>('[data-plan]');
      const summary = box.querySelector<HTMLElement>('[data-summary]');
      if (plan) plan.innerHTML = lessonsHtml(e.source, length, level);
      if (summary) summary.textContent = planSummary(e.source, length, level);
    }
    save({ length, level });
    if (say) announce(status, `Plans updated for ${length}-minute lessons with an ${level} class.`);
  };

  const saved = load();
  if (saved.length !== DEFAULT_LENGTH || saved.level !== 'HL') {
    select.value = String(saved.length);
    radios.forEach((r) => (r.checked = r.value === saved.level));
    render(false);
  }
  select.addEventListener('change', () => render(true));
  radios.forEach((r) => r.addEventListener('change', () => render(true)));
});
