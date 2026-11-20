/**
 * The top of My dashboard: the revision queue for today, progress by unit
 * (studied and completed, out of the subtopics at the reader's level), the
 * weak areas, practice by source, and where the reader left off. Read from
 * what this browser keeps with the rules in src/lib/progress.ts and
 * src/lib/planner.ts; nothing here writes.
 */
import { escapeHtml as h } from '../ix';
import { shortDate } from '../../lib/dashboard';
import { SAVED_KIND_LABELS, parseStudied, recentVisits, type VisitKind } from '../../lib/learner';
import {
  SOURCE_LABELS,
  atLevel,
  flashcardsHref,
  localDay,
  parseCards,
  pct,
  practiceSummary,
  progressChartSvg,
  resultsByCode,
  revisionQueue,
  sheetHref,
  sourcesWords,
  subtopicStates,
  unitProgress,
  weakAreas,
  type EvidenceConfig,
  type Level,
  type QueueItem,
  type SubtopicState,
} from '../../lib/progress';
import { dueSessions, parsePlanner, plannerProgress, sessionHref, sessionTitle, shortDay } from '../../lib/planner';
import type { WorkspaceConfig, WorkspaceView } from '../../lib/workspace';
import { $in, n, plural, type Ctx } from './context';

const VISIT_KIND: Record<VisitKind, string> = { topic: 'Subtopic', mindmap: 'Mindmap', case: 'Case', framework: 'Toolkit or framework', tool: 'Tool' };
const QUEUE_KIND: Record<QueueItem['kind'], string> = { plan: 'Planned', cards: 'Flashcards', weak: 'Weak area', new: 'Not started' };

/** The reader's level: the SL and HL switch's choice, HL when none was made. */
export const readerLevel = (): Level => (document.documentElement.getAttribute('data-level') === 'SL' ? 'SL' : 'HL');

export interface Overview {
  /** Anything kept that the overview counts. */
  any: boolean;
}

export function evidenceOf(cfg: WorkspaceConfig): EvidenceConfig {
  return { bank: cfg.bank, questions: cfg.questions, exercises: cfg.exercises, retrieval: cfg.retrieval, p2: cfg.p2 };
}

/** What the progress page adds to each row of the course: completed, and the results kept on it. */
export function rowExtras(items: Readonly<Record<string, string>>, cfg: WorkspaceConfig, view: WorkspaceView): Map<string, SubtopicState> {
  const results = resultsByCode(items, evidenceOf(cfg), view.log);
  return new Map(subtopicStates(cfg.subtopics, view.log, parseStudied(items['bb:studied']), results).map((s) => [s.code, s]));
}

export function renderOverview(ctx: Ctx, items: Readonly<Record<string, string>>, view: WorkspaceView, now: Date): Overview {
  const { root, cfg } = ctx;
  const level = readerLevel();
  const today = localDay(now);
  const evidence = evidenceOf(cfg);
  const results = resultsByCode(items, evidence, view.log);
  const studied = parseStudied(items['bb:studied']);
  const states = subtopicStates(cfg.subtopics, view.log, studied, results);
  const units = unitProgress(cfg.units, cfg.subtopics, states, level);
  const weak = weakAreas(results, cfg.subtopics, level);
  const cards = parseCards(items['bb:cards']);
  const planner = parsePlanner(items['bb:planner']);
  const pctx = { topics: cfg.subtopics, calc: cfg.calc };
  const due = dueSessions(planner, today).map((s) => ({ date: s.date, title: sessionTitle(s, pctx), href: sessionHref(s, pctx), minutes: s.minutes, code: s.code }));
  const queue = revisionQueue({ today, level, subtopics: cfg.subtopics, states, weak, cards, plan: due });
  const practice = practiceSummary(items, evidence, today, view.log);
  const subs = new Map(cfg.subtopics.map((s) => [s.code, s]));
  const name = (code: string) => {
    const s = subs.get(code);
    return s ? `${s.code} ${s.title}` : code;
  };

  /* ---------- Revision priorities ---------- */

  const qBox = $in(root, '[data-queue]');
  if (qBox)
    qBox.innerHTML = queue.length
      ? queue
          .map(
            (q, i) => `<li class="db-q db-q--${q.kind}">
              <span class="db-q__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
              <div class="db-q__main">
                <p class="db-q__k">${h(QUEUE_KIND[q.kind])}</p>
                <p class="db-q__t">${h(q.title)}</p>
                <p class="db-q__why">${h(q.why)}</p>
              </div>
              <p class="db-q__links">${q.links.map((l) => `<a href="${h(l.href)}">${h(l.label)}<span class="sr-only">: ${h(q.title)}</span></a>`).join('')}</p>
            </li>`,
          )
          .join('')
      : `<li class="db-q db-q--none"><p class="db-none">Nothing is due today: no planned session, no flashcard due, no weak area, and every subtopic at ${level} started. Test yourself on any subtopic in <a href="${h(flashcardsHref())}">the flashcards</a>, or practise in <a href="/assessment/question-bank/">the question bank</a>.</p></li>`;
  const planLine = $in(root, '[data-plan-line]');
  if (planLine) {
    if (planner.plan) {
      const p = plannerProgress(planner, today);
      planLine.innerHTML = `Your revision plan: ${n(p.done)} of ${n(p.total)} sessions done${p.next ? `; next, ${h(sessionTitle(p.next, pctx))} on ${h(shortDay(p.next.date))}` : ''}. <a href="/revision/planner/">Open your plan</a>`;
    } else planLine.innerHTML = `<a href="/revision/planner/">Make a revision plan</a> from your examination date, and each day's sessions will be listed here first.`;
  }

  /* ---------- Your progress ---------- */

  const total = units.reduce((a, u) => a + u.total, 0);
  const hlOnly = cfg.subtopics.filter((s) => !atLevel(s, 'SL')).length;
  const levelText = $in(root, '[data-level-text]');
  if (levelText) levelText.textContent = level === 'HL' ? `Counting the ${total} subtopics of the HL course.` : `Counting the ${total} subtopics of the SL course; the ${hlOnly} HL-only subtopics are left out.`;
  const chart = $in(root, '[data-units-chart]');
  if (chart)
    chart.innerHTML = `${progressChartSvg(units, cfg.subtopics, states, level)}<figcaption class="db-chart__cap">Each square is a subtopic at ${level}. Filled: completed. Half filled: studied. Outline: not started. Beside each unit, how many are studied.</figcaption>`;
  const table = $in(root, '[data-units-table]');
  if (table) {
    const tot = units.reduce((a, u) => ({ total: a.total + u.total, studied: a.studied + u.studied, completed: a.completed + u.completed }), { total: 0, studied: 0, completed: 0 });
    table.innerHTML = `<caption class="sr-only">Subtopics studied and completed, unit by unit, at ${level}</caption>
      <thead><tr><th scope="col">Unit</th><th scope="col" class="n">Subtopics at ${level}</th><th scope="col" class="n">Studied</th><th scope="col" class="n">Completed</th></tr></thead>
      <tbody>${units.map((u) => `<tr><th scope="row">Unit ${u.number} <span class="db-units__t">${h(u.title)}</span></th><td class="n">${u.total}</td><td class="n">${u.studied}</td><td class="n">${u.completed}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">The course</th><td class="n">${tot.total}</td><td class="n">${tot.studied}</td><td class="n">${tot.completed}</td></tr></tfoot>`;
  }
  const studiedBox = $in(root, '[data-studied]');
  if (studiedBox) {
    const done = states.filter((s) => s.completed && subs.has(s.code) && atLevel(subs.get(s.code)!, level)).sort((a, b) => ((a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1));
    const open = states
      .filter((s) => s.studied && !s.completed && subs.has(s.code) && atLevel(subs.get(s.code)!, level))
      .sort((a, b) => ((a.lastVisit ?? '') < (b.lastVisit ?? '') ? 1 : (a.lastVisit ?? '') > (b.lastVisit ?? '') ? -1 : 0));
    const item = (s: SubtopicState, meta: string) => `<li><a href="${h(subs.get(s.code)?.url ?? '/topics/')}">${h(name(s.code))}</a><span class="db-list__meta">${h(meta)}</span></li>`;
    const MAX = 8;
    const list = (rows: SubtopicState[], meta: (s: SubtopicState) => string, empty: string) =>
      rows.length
        ? `<ol class="db-list" role="list">${rows.slice(0, MAX).map((s) => item(s, meta(s))).join('')}</ol>${rows.length > MAX ? `<p class="db-none">And ${n(rows.length - MAX)} more on <a href="/progress/#course">your progress page</a>.</p>` : ''}`
        : `<p class="db-none">${empty}</p>`;
    studiedBox.innerHTML = `<div class="db-col"><h3 class="db-col__h">Completed <span class="db-count">${n(done.length)}</span></h3>${list(
      done,
      (s) => `Marked complete ${shortDate(s.completedAt ?? '', now)}`,
      'None yet. Press <strong>Mark as complete</strong> at the top of a subtopic page when you have learnt it.',
    )}</div><div class="db-col"><h3 class="db-col__h">Studied, not yet complete <span class="db-count">${n(open.length)}</span></h3>${list(
      open,
      (s) => (s.lastVisit ? `Last opened ${shortDate(s.lastVisit, now)}` : 'Practised'),
      done.length ? 'None: every subtopic you have studied is marked complete.' : 'None yet. Open a subtopic or its mindmap, or practise it, and it is listed here.',
    )}</div>`;
  }

  /* ---------- Weak areas ---------- */

  const weakBox = $in(root, '[data-weak]');
  if (weakBox)
    weakBox.innerHTML = weak.length
      ? `<ol class="db-weak" role="list">${weak
          .map(
            (w) => `<li class="db-weak__i">
              <p class="db-weak__t"><a href="${h(w.url)}">${h(name(w.code))}</a></p>
              <p class="db-weak__fig">${n(w.n)} ${w.n === 1 ? 'result' : 'results'}, averaging <strong>${pct(w.score)}</strong></p>
              <p class="db-weak__src">${h(sourcesWords(w.by))}</p>
              <p class="db-weak__links"><a href="${h(sheetHref(w.url))}">Revision sheet<span class="sr-only">: ${h(name(w.code))}</span></a><a href="${h(flashcardsHref(w.code))}">Flashcards<span class="sr-only">: ${h(name(w.code))}</span></a></p>
            </li>`,
          )
          .join('')}</ol>`
      : `<p class="db-none">No subtopic meets the rule${results.size ? '' : ' yet'}. ${results.size ? `You have results on ${plural(results.size, 'subtopic', 'subtopics')}, and none averages under the line with enough results to say.` : 'Weak areas appear once your question bank ratings, practice questions, calculations, flashcards, recall cards and exercises give a subtopic enough results.'}</p>`;

  /* ---------- Practice ---------- */

  const prBox = $in(root, '[data-practice]');
  if (prBox) {
    const P = practice;
    const papers = P.bank.byPaper.filter((x) => x.attempted).map((x) => `${x.paper === 'general' ? 'not tied to a paper' : x.paper === 'ia-skill' ? 'IA skill' : `${x.paper.replace('paper-', 'Paper ')} style`} ${n(x.attempted)} of ${n(x.total)} (${n(x.secure)} secure)`);
    const row = (label: string, href: string, done: string, how: string) => `<tr><th scope="row"><a href="${h(href)}">${h(label)}</a></th><td>${done}</td><td>${how}</td></tr>`;
    const none = '<span class="db-none">None yet</span>';
    prBox.innerHTML = `<p class="db-pr__lead"><span class="db-pr__n">${n(P.attempted)}</span> ${P.attempted === 1 ? 'question' : 'questions'} attempted: in the question bank, the practice questions and Paper 2 calculation practice.</p>
      <div class="table-scroll" role="region" aria-label="Practice by source" tabindex="0"><table class="table db-pr">
      <caption class="sr-only">Practice by source: what you attempted and how it went</caption>
      <thead><tr><th scope="col">Source</th><th scope="col">Attempted</th><th scope="col">How it went</th></tr></thead><tbody>
      ${row(SOURCE_LABELS.bank, '/assessment/question-bank/', P.bank.attempted ? `${n(P.bank.attempted)} of ${n(P.bank.total)} questions` : none, P.bank.attempted ? `${n(P.bank.secure)} secure, ${n(P.bank.partly)} partly, ${n(P.bank.notYet)} not yet${P.bank.sets ? `; ${plural(P.bank.sets, 'timed set', 'timed sets')} finished` : ''}${papers.length ? `. By paper: ${h(papers.join('; '))}` : ''}` : `${n(P.bank.total)} questions, filtered by topic, paper and command term`)}
      ${row('Practice questions with mark schemes', '/exam-desk/practice/', P.questions.answered ? `${n(P.questions.answered)} of ${n(P.questions.total)} answered` : none, P.questions.marked ? `${n(P.questions.marked)} self-marked${P.questions.of ? `: ${n(P.questions.marks)} of ${n(P.questions.of)} marks (${pct(P.questions.marks / P.questions.of)})` : ''}` : P.questions.answered ? 'Not yet self-marked against the mark schemes' : `${n(P.questions.total)} questions, each with a self-check`)}
      ${row('Paper 2 calculation practice', '/assessment/paper-2/practice/', P.p2.tried ? `${plural(P.p2.tried, 'calculation', 'calculations')} checked` : none, P.p2.tried ? `${n(P.p2.right)} right first time (${pct(P.p2.right / P.p2.tried)})${P.p2.timed ? `; ${plural(P.p2.timed, 'timed set', 'timed sets')}, ${n(P.p2.marks)} of ${n(P.p2.total)} marks` : ''}` : 'Fresh figures every time, checked as you go')}
      ${row(SOURCE_LABELS.cards, flashcardsHref(), P.cards.reviewed ? `${plural(P.cards.reviewed, 'card', 'cards')} reviewed` : none, P.cards.reviewed ? `${n(P.cards.due)} due today; last rated ${n(P.cards.good + P.cards.easy)} good or easy, ${n(P.cards.hard)} hard, ${n(P.cards.again)} again` : 'Cards that come back just before you forget them')}
      ${row('Recall cards on the subtopic pages', '/topics/', P.recall.rated ? `${plural(P.recall.rated, 'card', 'cards')} rated` : none, P.recall.rated ? `${n(P.recall.got)} got it, ${n(P.recall.partly)} partly, ${n(P.recall.notYet)} not yet` : 'At the end of each subtopic with notes')}
      ${row(SOURCE_LABELS.exercises, '/progress/#db-practice-h', P.exercises.checked ? `${plural(P.exercises.checked, 'item', 'items')} checked` : none, P.exercises.checked ? `${n(P.exercises.right)} right, ${n(P.exercises.partial)} partly right, ${n(P.exercises.wrong)} not yet right` : 'The classification exercises and case labs')}
      </tbody></table></div>
      <p class="db-more-link"><a href="/progress/#db-practice-h">Every answer, exercise, case lab and Decision Room, one by one, on your progress page</a></p>`;
  }

  /* ---------- Where you left off ---------- */

  const recentBox = $in(root, '[data-recent]');
  if (recentBox) {
    const recent = recentVisits(view.log, 8);
    const saved = [...view.saved.items].sort((a, b) => Number(b.kind === 'mindmap') - Number(a.kind === 'mindmap'));
    const MAXS = 8;
    recentBox.innerHTML = `<div class="db-col"><h3 class="db-col__h">Recently visited <span class="db-count">${n(recent.length)}</span></h3>${
      recent.length
        ? `<ol class="db-list" role="list">${recent.map((v) => `<li><a href="${h(v.url)}">${h(v.title)}</a><span class="db-list__meta">${h(VISIT_KIND[v.kind])}, ${h(shortDate(v.at, now))}</span></li>`).join('')}</ol>`
        : `<p class="db-none">${view.log.paused ? 'Not noting the pages you open: it is paused under Your data.' : 'None yet. Subtopics, mindmaps, cases, frameworks and tools you open are listed here.'}</p>`
    }</div><div class="db-col" id="bookmarks"><h3 class="db-col__h">Bookmarks and saved mindmaps <span class="db-count">${n(saved.length)}</span></h3>${
      saved.length
        ? `<ul class="db-list" role="list">${saved
            .slice(0, MAXS)
            .map((x) => `<li><a href="${h(x.url)}">${h(x.title)}</a><span class="db-list__meta">${h(SAVED_KIND_LABELS[x.kind])}, saved ${h(shortDate(x.saved, now))}</span></li>`)
            .join('')}</ul><p class="db-none">${saved.length > MAXS ? `And ${n(saved.length - MAXS)} more. ` : ''}Order, mark and note them in <a href="#saved">your learning list</a>.</p>`
        : '<p class="db-none">None yet. <strong>Save</strong> on a subtopic, a mindmap, a term or a question keeps it here and on your learning list.</p>'
    }</div>`;
  }

  return { any: Object.keys(studied.done).length > 0 || cards.cards.length > 0 || planner.sessions.length > 0 || practice.attempted > 0 || practice.recall.rated > 0 || practice.exercises.checked > 0 };
}
