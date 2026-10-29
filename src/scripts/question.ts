import { announce, each, readConfig, store } from './ix';

interface Config {
  id: string;
  marks: number;
  kind: 'points' | 'levels' | 'calculation';
  points: number[];
}

each('[data-ix="question"]', (root) => {
  const cfg = readConfig<Config>(root);
  const answer = root.querySelector<HTMLTextAreaElement>('[data-answer]');
  const score = root.querySelector<HTMLElement>('[data-score]');
  const levelScore = root.querySelector<HTMLElement>('[data-level-score]');
  const key = `q:${cfg.id}`;
  const saved = store.get<{ answer?: string; points?: number[]; level?: string }>(key, {});
  let timer = 0;

  const persist = () => {
    const points = [...root.querySelectorAll<HTMLInputElement>('[data-point]')].filter((c) => c.checked).map((c) => Number(c.dataset.point));
    const level = root.querySelector<HTMLInputElement>('[data-level-pick]:checked')?.value;
    store.set(key, { answer: answer?.value ?? '', points, level });
  };

  const tally = (say: boolean) => {
    if (!score) return;
    const boxes = [...root.querySelectorAll<HTMLInputElement>('[data-point]')];
    const ticked = boxes.filter((c) => c.checked);
    if (!ticked.length) {
      score.textContent = 'Tick each point your answer makes to check it against the mark scheme.';
      return;
    }
    const total = ticked.reduce((s, c) => s + (cfg.points[Number(c.dataset.point)] ?? 0), 0);
    const capped = Math.min(total, cfg.marks);
    score.textContent = `Your self-check: ${capped} of ${cfg.marks} ${cfg.marks === 1 ? 'mark' : 'marks'}.${total > cfg.marks ? ' Marks are capped at the question total.' : ''}`;
    if (say) announce(score, score.textContent);
  };

  if (answer && saved.answer) answer.value = saved.answer;
  saved.points?.forEach((k) => {
    const box = root.querySelector<HTMLInputElement>(`[data-point="${k}"]`);
    if (box) box.checked = true;
  });
  if (saved.level) {
    const r = root.querySelector<HTMLInputElement>(`[data-level-pick][value="${CSS.escape(saved.level)}"]`);
    if (r) r.checked = true;
  }
  tally(false);
  if (levelScore && saved.level) levelScore.textContent = `Your self-check: level ${saved.level} marks.`;

  answer?.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(persist, 400);
  });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.point !== undefined) tally(false);
    if (t.dataset.levelPick !== undefined && levelScore) levelScore.textContent = `Your self-check: the ${t.value} marks level.`;
    persist();
  });
});
