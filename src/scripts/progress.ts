/**
 * Your progress: reads the platform's own keys in local storage (all prefixed
 * "bb:") and summarizes them. It writes nothing.
 */
import { each, escapeHtml, readConfig, store } from './ix';

interface Config {
  questions: Array<{ id: string; title: string; href: string; paper: string }>;
  decisions: Array<{ id: string; title: string; href: string; rounds: string[] }>;
  topics: Array<{ id: string; title: string; href: string; cards: number }>;
  interactions: Array<{ id: string; uid: string; title: string; href: string; keys: string[]; stages: number }>;
  ia: { href: string; steps: number };
}

const has = (key: string): boolean => {
  const v = store.get<unknown>(key, null);
  if (v === null || v === '') return false;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
};

each('[data-ix="progress"]', (root) => {
  const cfg = readConfig<Config>(root);
  const rows: Record<string, Array<{ title: string; href: string; state: string; done: boolean }>> = {};
  const add = (group: string, title: string, url: string, state: string, done: boolean) => (rows[group] ??= []).push({ title, href: url, state, done });

  // Practice questions
  let answered = 0;
  let marked = 0;
  for (const q of cfg.questions) {
    const v = store.get<{ answer?: string; points?: number[]; level?: string } | null>(`q:${q.id}`, null);
    if (!v) continue;
    const a = Boolean(v.answer && v.answer.trim());
    const m = Boolean((v.points && v.points.length) || v.level);
    if (!a && !m) continue;
    answered += a ? 1 : 0;
    marked += m ? 1 : 0;
    add('Practice questions', q.title, q.href, m ? 'Self-marked' : 'Answered', m);
  }

  // Decision Rooms
  let roomsDone = 0;
  for (const d of cfg.decisions) {
    const v = store.get<{ picks?: Record<string, string> } | null>(`dr:${d.id}`, null);
    const picked = d.rounds.filter((r) => v?.picks?.[r]).length;
    if (!picked) continue;
    const done = picked === d.rounds.length;
    roomsDone += done ? 1 : 0;
    add('Decision Rooms', d.title, d.href, done ? 'Every decision made' : `${picked} of ${d.rounds.length} decisions`, done);
  }

  // Interactions and case labs
  let tried = 0;
  let stagesDone = 0;
  let stagesAll = 0;
  for (const it of cfg.interactions) {
    if (it.stages) {
      const v = store.get<{ done?: string[] } | null>(`case-lab:${it.uid}`, null);
      const n = v?.done?.length ?? 0;
      stagesAll += it.stages;
      stagesDone += n;
      if (n) add('Case labs', it.title, it.href, n >= it.stages ? 'Every stage done' : `${n} of ${it.stages} stages`, n >= it.stages);
      continue;
    }
    if (it.keys.some(has)) {
      tried += 1;
      add('Interactions', it.title, it.href, 'Started', false);
    }
  }

  // Retrieval cards, on topic pages and revision pages
  let cards = 0;
  for (const t of cfg.topics) {
    const a = store.get<Record<string, number>>(`rc:${t.id}`, {});
    const b = store.get<Record<string, number>>(`rc:rev-${t.id}`, {});
    const n = Math.max(Object.keys(a).length, Object.keys(b).length);
    if (!n) continue;
    cards += n;
    add('Retrieval cards', t.title, t.href, `${n} of ${t.cards} rated`, n >= t.cards);
  }

  // IA planner
  const plan = store.get<{ fields?: Record<string, string> } | null>('ia-plan', null);
  const steps = plan?.fields ? Object.keys(plan.fields).filter((k) => /^done-\d+$/.test(k) && plan.fields?.[k] === 'on').length : 0;
  if (plan?.fields && Object.keys(plan.fields).length) add('IA Studio', 'Your research project plan', cfg.ia.href, `${steps} of ${cfg.ia.steps} steps done`, steps === cfg.ia.steps);

  const figures: Array<[string, string, string]> = [
    ['Practice questions answered', String(answered), `${marked} self-marked, of ${cfg.questions.length}`],
    ['Decision Rooms finished', `${roomsDone} of ${cfg.decisions.length}`, ''],
    ['Case lab stages done', `${stagesDone} of ${stagesAll}`, ''],
    ['Interactions started', String(tried), `of ${cfg.interactions.filter((i) => !i.stages).length} that keep your work`],
    ['Retrieval cards rated', String(cards), ''],
    ['IA plan steps done', `${steps} of ${cfg.ia.steps}`, ''],
  ];
  const sum = root.querySelector<HTMLElement>('[data-summary]');
  if (sum)
    sum.innerHTML = figures
      .map(([k, v, n]) => `<div class="fig"><dt>${escapeHtml(k)}</dt><dd><span class="fig__v">${escapeHtml(v)}</span>${n ? `<span class="fig__n">${escapeHtml(n)}</span>` : ''}</dd></div>`)
      .join('');

  const groups = root.querySelector<HTMLElement>('[data-groups]');
  const names = Object.keys(rows);
  if (groups)
    groups.innerHTML = names
      .map(
        (g) =>
          `<div class="pr-group"><h3>${escapeHtml(g)}</h3><ul class="pr-list">${(rows[g] ?? [])
            .map((r) => `<li><a href="${escapeHtml(r.href)}">${escapeHtml(r.title)}</a><span class="pr-state${r.done ? ' pr-state--done' : ''}">${escapeHtml(r.state)}</span></li>`)
            .join('')}</ul></div>`,
      )
      .join('');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  if (empty) empty.hidden = names.length > 0;
});
