/**
 * The teachers' lesson library: every subtopic with full notes or a complete
 * brief, turned into the plain sources the lesson generator (lessons.ts) and
 * the presentation outline work from. Server side only; the browser receives
 * the sources as JSON and never needs the corpus.
 */
import type { Corpus } from './integrity';
import type { BriefSource, LessonLink, NotesSource, OutlineSource } from './lessons';
import { inline } from './markup';
import { codeKey, firstSentence, plainText, subtopicRefs } from './pathways';

/**
 * Interactions that belong to the guide's HL-only toolkit tools (force field
 * analysis, and contribution with special orders: guide p. 14), whatever
 * subtopic they serve. Any interaction that serves only HL-only subtopics is HL too.
 */
const HL_COMPONENTS = new Set(['force-field-builder', 'special-order']);

export interface LibraryEntry {
  code: string;
  title: string;
  unit: number;
  unitTitle: string;
  level: string;
  source: NotesSource | BriefSource;
  outline: OutlineSource;
}

const isHlOnly = (text: string) => /\(HL only\)/.test(text);

function links(c: Corpus, code: string): { interactions: LessonLink[]; questions: LessonLink[] } {
  const subs = subtopicRefs(c);
  const hlCode = (x: string) => subs.find((s) => s.code === x)?.level === 'HL';
  const interactions = Object.entries(c.interactives)
    .filter(([, it]) => it.syllabus.includes(code) && it.page)
    .map(([id, it]) => ({
      title: it.title,
      href: `${it.page}#ix-${id}`,
      level: (HL_COMPONENTS.has(it.component) || it.syllabus.every(hlCode) ? 'HL' : 'SL/HL') as LessonLink['level'],
    }));
  const questions = Object.entries(c.questions)
    .filter(([, q]) => q.syllabus.includes(code))
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, q]) => ({ title: q.title, href: `/exam-desk/practice/#q-${id}`, level: q.level }));
  return { interactions, questions };
}

function mindmapHref(c: Corpus, code: string): string | undefined {
  const m = Object.entries(c.mindmaps).find(([, x]) => x.scope === 'subtopic' && x.code === code);
  return m ? `/mindmaps/${m[0]}/` : undefined;
}

/** The lesson library, in course order: notes where a subtopic has them, otherwise its brief. */
export function lessonLibrary(c: Corpus, prompts: Record<string, string[]>): LibraryEntry[] {
  const cur = c.curricula['ib-dp-bm'];
  const out: LibraryEntry[] = [];
  for (const sub of subtopicRefs(c)) {
    const unit = cur?.units.find((u) => u.number === sub.unit);
    const href = `/topics/${sub.slug}/`;
    const note = Object.values(c.notes).find((n) => n.code === sub.code);
    const brief = Object.entries(c.topics).find(([, t]) => t.code === sub.code);
    const { interactions, questions } = links(c, sub.code);
    const base = { code: sub.code, title: sub.title, unit: sub.unit, unitTitle: unit?.title ?? '', level: sub.level };
    if (note) {
      const source: NotesSource = {
        kind: 'notes',
        code: sub.code,
        title: sub.title,
        href,
        level: note.level,
        sections: note.sections.map((s) => ({
          id: s.id,
          title: s.title,
          level: s.level,
          points: s.points.map((p) => ({ text: plainText(p.term), hl: p.level === 'HL' })),
          example: s.example?.title,
          formulas: s.formulas.map((f) => f.name),
          diagram: s.diagram,
          weighs: s.advantages.length > 0 && s.limitations.length > 0,
        })),
        objectives: note.objectives.map((o) => ({ text: plainText(o), hl: isHlOnly(o) })),
        retrieval: note.retrieval.map((r) => plainText(r.q)),
        opening: note.situation?.title,
        decision: note.decision?.title,
        exam: note.exam.map((q) => ({ q: plainText(q.q), marks: q.marks, level: q.level })),
        interactions,
        questions,
        prompts: prompts[sub.code] ?? [],
        mindmap: mindmapHref(c, sub.code),
      };
      const outline: OutlineSource = {
        code: sub.code,
        title: sub.title,
        why: firstSentence(note.introduction),
        objectives: note.objectives.map(plainText),
        sections: note.sections.map((s) => ({ title: s.title, level: s.level, points: s.points.map((p) => plainText(p.term)), example: s.example?.title })),
        weigh: note.evaluation.map(firstSentence),
        check: note.retrieval.map((r) => plainText(r.q)),
        decision: note.decision?.title,
      };
      out.push({ ...base, source, outline });
    } else if (brief) {
      const [tid, t] = brief;
      const source: BriefSource = {
        kind: 'brief',
        code: sub.code,
        title: sub.title,
        href: `/topics/${tid}/`,
        level: t.level,
        steps: t.teaching.sequence.map((s) => ({ minutes: s.minutes, html: inline(s.activity) })),
        questions: t.related.questions.flatMap((qid) => {
          const q = c.questions[qid];
          return q ? [{ title: q.title, href: `/exam-desk/practice/#q-${qid}`, level: q.level }] : [];
        }),
        prompts: t.teaching.prompts,
        revision: `/revision/${tid}/`,
        mindmap: mindmapHref(c, sub.code),
      };
      const outline: OutlineSource = {
        code: sub.code,
        title: sub.title,
        why: firstSentence(t.whyItMatters),
        objectives: t.objectives.map((o) => plainText(o.text) + (o.level === 'HL' ? ' (HL)' : '')),
        sections: t.sections.map((s) => ({
          title: s.title,
          level: 'SL/HL',
          points: s.blocks.flatMap((b) => (b.type === 'definition' ? [b.term] : 'title' in b && b.title ? [b.title] : [])),
        })),
        weigh: t.revision.traps.map(firstSentence),
        check: t.revision.retrieval.map((r) => r.q),
        decision: t.decisionQuestion,
      };
      out.push({ ...base, source, outline });
    }
  }
  return out.sort((a, b) => codeKey(a.code) - codeKey(b.code));
}
