/**
 * What the dashboard and the revision planner need to know about the
 * course, built from the content at build time and embedded in their pages:
 * the subtopics with their pages, the practice whose results count towards
 * a subtopic (the question bank, the practice questions, the exercises, the
 * recall cards and Paper 2 calculation practice) and the paper times. Pure
 * functions of the corpus, run by the pages and the unit tests, never in the
 * browser.
 */
import type { Corpus } from './integrity';
import { buildBank, subtopicPage, subtopicsOf } from './bank-build';
import { pacesFrom } from './bank';
import { GROUPS, KINDS, KIND_IDS, type GroupId } from './p2-practice';
import type { DashExercise, DashQuestion, DashRetrieval } from './dashboard';
import type { EvidenceConfig, ProgressSubtopic } from './progress';
import type { CalcFamily, PlannerContext } from './planner';

/** The classification exercises whose answers the quiz engine keeps (bb:quiz:<id>). */
const QUIZ_COMPONENTS = ['cost-classifier', 'error-diagnosis', 'ansoff-placer', 'style-matcher', 'functions-sorter'];

const byCode = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

/** Every subtopic in syllabus order, with its page and its mindmap's page. */
export function progressSubtopics(c: Corpus): ProgressSubtopic[] {
  const subs = subtopicsOf(c);
  const maps = Object.entries(c.mindmaps).filter(([, m]) => m.scope === 'subtopic');
  return subs.map((s) => {
    const map = maps.find(([, m]) => m.code === s.code);
    return { code: s.code, title: s.title, unit: s.unit, level: s.level, url: subtopicPage(subs, s.code), ...(map ? { mindmap: `/mindmaps/${map[0]}/` } : {}) };
  });
}

/** The practice questions with mark schemes, in the order the practice page lists them. */
export function practiceQuestions(c: Corpus): DashQuestion[] {
  return Object.entries(c.questions)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id, q]) => ({
      id,
      title: q.title,
      url: `/exam-desk/practice/#q-${id}`,
      marks: q.marks,
      kind: q.markscheme.kind,
      points: q.markscheme.points.map((p) => p.marks),
      criteria: q.markscheme.criteria.map((k) => ({ id: k.id, marks: k.marks })),
      codes: q.syllabus,
    }));
}

/**
 * The exercises the recorder can follow: the classification exercises, the
 * cash flow lab's questions on its forecast, and the case labs' sorting and
 * choosing tasks, each by its id on its page.
 */
export function exercisesOf(c: Corpus): DashExercise[] {
  const out: DashExercise[] = [];
  for (const [id, it] of Object.entries(c.interactives)) {
    if (!it.page) continue;
    const uid = `ix-${id}`;
    const url = `${it.page}#${uid}`;
    const codes = it.syllabus;
    if (QUIZ_COMPONENTS.includes(it.component) && 'items' in it) out.push({ uid, title: it.title, url, total: it.items.length, codes });
    if (it.component === 'cash-flow-lab') out.push({ uid: `${uid}-q`, title: `${it.title}: reading the forecast`, url, total: it.questions.length, codes });
    if (it.component === 'case-lab')
      for (const st of it.stages)
        for (const t of st.tasks)
          if (t.kind === 'sort' || t.kind === 'choose') out.push({ uid: `${uid}-${t.id}`, title: `${it.title}: ${st.step}, ${st.title}`, url: `${it.page}#${uid}-${st.id}`, total: t.kind === 'sort' ? t.items.length : 1, codes });
  }
  return out;
}

/** Every set of recall cards: at the end of each set of notes, in each brief and in each revision brief. */
export function retrievalSets(c: Corpus): DashRetrieval[] {
  const subs = subtopicsOf(c);
  return [
    ...Object.values(c.notes)
      .sort((a, b) => byCode(a.code, b.code))
      .map((n) => ({ key: `bb:rc:notes-${n.code.replace('.', '-')}`, title: `${n.code} ${n.title}: notes`, url: `${subtopicPage(subs, n.code)}#sh-rev-h`, count: n.retrieval.length, codes: [n.code] })),
    ...Object.entries(c.topics)
      .sort((a, b) => byCode(a[1].code, b[1].code))
      .flatMap(([id, t]) => [
        { key: `bb:rc:${id}`, title: `${t.code} ${t.title}: brief`, url: `/topics/${id}/#revision`, count: t.revision.retrieval.length, codes: [t.code] },
        { key: `bb:rc:rev-${id}`, title: `${t.code} ${t.title}: revision brief`, url: `/revision/${id}/`, count: t.revision.retrieval.length, codes: [t.code] },
      ]),
  ];
}

/** Paper 2 calculation practice: each kind of calculation and the subtopic its family practises. */
export function p2Codes(): Record<string, string> {
  return Object.fromEntries(KIND_IDS.map((id) => [id, GROUPS[KINDS[id]!.group].syllabus]));
}

/** Everything the browser needs to place a result under its subtopics. */
export function evidenceOf(c: Corpus): EvidenceConfig {
  return {
    bank: buildBank(c).items.map((q): [string, string[], string] => [q.id, q.codes, q.paper]),
    questions: practiceQuestions(c),
    exercises: exercisesOf(c),
    retrieval: retrievalSets(c),
    p2: p2Codes(),
  };
}

/** The families of Paper 2 calculations, as calculation practice groups them. */
export function calcFamilies(): CalcFamily[] {
  return (Object.keys(GROUPS) as GroupId[]).map((id) => ({ id, label: GROUPS[id].label, code: GROUPS[id].syllabus, hl: GROUPS[id].level === 'HL' }));
}

/** What the revision planner needs: the subtopics, each paper's time from the guide's outlines, and the calculation families. */
export function plannerContext(c: Corpus): PlannerContext {
  const paces = Object.fromEntries(pacesFrom(c.assessment).map((p) => [p.id, p.minutes]));
  const minutes = (id: string) => {
    const m = paces[id];
    if (typeof m !== 'number') throw new Error(`The assessment register gives no time for ${id}`);
    return m;
  };
  return {
    topics: progressSubtopics(c).map(({ code, title, unit, level, url }) => ({ code, title, unit, level, url })),
    papers: { 'paper-1': minutes('paper-1'), 'paper-2-sl': minutes('paper-2-sl'), 'paper-2-hl': minutes('paper-2-hl'), 'paper-3': minutes('paper-3') },
    calc: calcFamilies(),
  };
}
