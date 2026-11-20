/**
 * The Teacher resource area's lesson sequences: when the teacher chooses a
 * lesson length, every subtopic's lessons and each unit's totals change to the
 * figures the build worked for that length with the lesson library's own
 * functions. The choice is kept as bb:lesson-plan, the same item and shape the
 * lesson library uses ({ length, level }), so both pages open on the same
 * length; the class level stored there is left as it was.
 */
import { announce, each, escapeHtml, readConfig } from './ix';
import { DEFAULT_LENGTH, LESSON_LENGTHS } from '../lib/lessons';
import { lessonHours } from '../lib/teachers/sequences';

interface Config {
  rows: Array<{ code: string; byLength: Record<string, { sl: number; hl: number; focus: string[] }> }>;
  units: Record<string, Array<{ unit: number; sl: number; hl: number }>>;
}

const KEY = 'bb:lesson-plan';

function stored(): { length: number; level: 'SL' | 'HL' } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { length?: unknown; level?: unknown } | null;
    return {
      length: v && (LESSON_LENGTHS as readonly number[]).includes(Number(v.length)) ? Number(v.length) : DEFAULT_LENGTH,
      level: v?.level === 'SL' ? 'SL' : 'HL',
    };
  } catch {
    return { length: DEFAULT_LENGTH, level: 'HL' };
  }
}

function save(length: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ length, level: stored().level }));
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}

each('[data-ix="sequences"]', (root) => {
  const cfg = readConfig<Config>(root);
  const select = root.querySelector<HTMLSelectElement>('[data-length]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!select) return;

  const render = (length: number) => {
    for (const r of cfg.rows) {
      const row = root.querySelector<HTMLElement>(`[data-row="${r.code}"]`);
      const d = r.byLength[String(length)];
      if (!row || !d) continue;
      const sl = row.querySelector<HTMLElement>('[data-sl]');
      const hl = row.querySelector<HTMLElement>('[data-hl]');
      const focus = row.querySelector<HTMLElement>('[data-focus]');
      if (sl) sl.textContent = d.sl === 0 ? 'Not taken' : String(d.sl);
      if (hl) hl.textContent = String(d.hl);
      if (focus) focus.innerHTML = d.focus.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
    }
    for (const u of cfg.units[String(length)] ?? []) {
      const sum = root.querySelector<HTMLElement>(`[data-unit-sum="${u.unit}"]`);
      if (!sum) continue;
      const set = (sel: string, v: string) => {
        const el = sum.querySelector<HTMLElement>(sel);
        if (el) el.textContent = v;
      };
      set('[data-unit-sl]', String(u.sl));
      set('[data-unit-hl]', String(u.hl));
      set('[data-unit-hours]', String(lessonHours(u.hl, length)));
    }
  };

  const start = stored().length;
  if (start !== DEFAULT_LENGTH) {
    select.value = String(start);
    render(start);
  }
  select.addEventListener('change', () => {
    const length = Number(select.value) || DEFAULT_LENGTH;
    render(length);
    save(length);
    announce(status, `Sequences updated for ${length}-minute lessons.`);
  });
});
