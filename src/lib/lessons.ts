/**
 * Lesson sequences for teachers, built from the platform's own notes and
 * briefs. Pure functions, no DOM: the build renders every sequence at the
 * default lesson length, and the browser re-renders it with the same
 * functions when a teacher chooses another length or an SL or HL class.
 *
 * A brief carries its own authored sequence; its minutes are scaled to the
 * lesson length. Notes are turned into lessons by a stated rule (a teaching
 * choice of the platform, not an IB requirement): each lesson has a starter,
 * direct teaching of a few sections, an activity, a check and an exit ticket,
 * and about eight minutes of direct teaching per section of the notes.
 */

export type Phase = 'starter' | 'teach' | 'apply' | 'check' | 'exit';
export const PHASES: Phase[] = ['starter', 'teach', 'apply', 'check', 'exit'];
export const PHASE_LABELS: Record<Phase, string> = { starter: 'Starter', teach: 'Teach', apply: 'Apply', check: 'Check', exit: 'Exit ticket' };
/** How a lesson's time divides between the phases, in twelfths: 5, 25, 15, 10 and 5 minutes of an hour. */
export const PHASE_WEIGHTS: Record<Phase, number> = { starter: 1, teach: 5, apply: 3, check: 2, exit: 1 };
export const LESSON_LENGTHS = [40, 50, 60, 75, 90] as const;
export const DEFAULT_LENGTH = 60;
/** Minutes of direct teaching one section of the notes needs: the platform's rule of thumb. */
export const MINUTES_PER_SECTION = 8;

export type ClassLevel = 'SL' | 'HL';

/**
 * Split whole minutes in proportion to weights so that the parts are whole
 * numbers and add up to the total exactly: each part gets its floor, and the
 * minutes left over go to the largest remainders (ties to the earlier part).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0) || !(sum > 0)) return weights.map(() => 0);
  const whole = Math.round(total);
  const exact = weights.map((w) => (whole * w) / sum);
  const parts = exact.map((x) => Math.floor(x + 1e-9));
  let left = whole - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x + 1e-9) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    parts[i] = (parts[i] ?? 0) + 1;
    left -= 1;
  }
  return parts;
}

/** Minutes for each phase of a lesson of the given length. */
export function phaseMinutes(length: number): Record<Phase, number> {
  const parts = allocate(length, PHASES.map((p) => PHASE_WEIGHTS[p]));
  return Object.fromEntries(PHASES.map((p, i) => [p, parts[i] ?? 0])) as Record<Phase, number>;
}

/** How many sections of notes one lesson can teach: about eight minutes each, between one and four. */
export function sectionsPerLesson(length: number): number {
  return Math.min(4, Math.max(1, Math.floor(phaseMinutes(length).teach / MINUTES_PER_SECTION)));
}

/** Sizes of the groups when n items are shared, in order, between as few groups of at most `size` as possible, as evenly as possible. */
export function groupSizes(n: number, size: number): number[] {
  if (n <= 0 || size <= 0) return [];
  const k = Math.ceil(n / size);
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

/* ---------- Sources ---------- */

export interface LessonSection {
  id: string;
  title: string;
  level: 'SL/HL' | 'HL';
  /** The section's key ideas (the terms of its points), with the HL-only ones marked. */
  points: Array<{ text: string; hl: boolean }>;
  example?: string;
  formulas: string[];
  diagram?: string;
  /** The section lists advantages and limitations to weigh. */
  weighs: boolean;
}

export interface LessonLink {
  title: string;
  href: string;
  level: 'SL/HL' | 'HL';
}

/** A subtopic with full notes, reduced to what a lesson is built from (plain text throughout). */
export interface NotesSource {
  kind: 'notes';
  code: string;
  title: string;
  href: string;
  level: 'SL/HL' | 'HL' | 'SL/HL with HL-only content';
  sections: LessonSection[];
  /** The notes' objectives as plain text; hl marks those the notes give as HL only. */
  objectives: Array<{ text: string; hl: boolean }>;
  retrieval: string[];
  opening?: string;
  decision?: string;
  exam: Array<{ q: string; marks: number; level: 'SL/HL' | 'HL' }>;
  interactions: LessonLink[];
  questions: LessonLink[];
  prompts: string[];
  mindmap?: string;
}

/** A complete brief, with its own authored sequence (the activities as trusted HTML, rendered at build time). */
export interface BriefSource {
  kind: 'brief';
  code: string;
  title: string;
  href: string;
  level: 'SL/HL' | 'HL' | 'SL/HL with HL-only content';
  steps: Array<{ minutes: number; html: string }>;
  questions: LessonLink[];
  prompts: string[];
  revision?: string;
  mindmap?: string;
}

export type LessonSource = NotesSource | BriefSource;

export interface Step {
  phase?: Phase;
  minutes: number;
  /** Plain text, escaped when rendered. */
  title: string;
  detail?: string;
  href?: string;
  hl?: boolean;
  /** Trusted HTML from a brief's authored sequence, used instead of title and detail. */
  html?: string;
}

export interface Lesson {
  n: number;
  of: number;
  minutes: number;
  /** What the lesson teaches, in a few words. */
  focus: string;
  steps: Step[];
}

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** A title quoted in running text, in British single quotes. */
const q = (s: string) => `\u2018${s}\u2019`;

/** The sections an SL or HL class is taught. */
export function sectionsFor(src: NotesSource, level: ClassLevel): LessonSection[] {
  if (level === 'SL' && src.level === 'HL') return [];
  return level === 'SL' ? src.sections.filter((s) => s.level !== 'HL') : src.sections;
}

/** The activity for one lesson: the notes' decision in the last lesson, then interactions, then what the lesson's sections offer. */
function activity(src: NotesSource, group: LessonSection[], i: number, last: boolean, interactions: LessonLink[]): Omit<Step, 'minutes' | 'phase'> {
  if (last && src.decision) return { title: `Make the decision: ${src.decision}`, detail: 'Groups weigh the options and commit before they read the guidance.', href: `${src.href}#nv-decision-h` };
  const ix = interactions[i];
  if (ix) return { title: ix.title, detail: 'Pairs work through it, then explain their reasoning to another pair.', href: ix.href, hl: ix.level === 'HL' };
  const ex = group.find((s) => s.example);
  if (ex) return { title: `Work through the example: ${ex.example}`, detail: `In pairs, before reading the answer in ${q(ex.title)}. The business is fictional.`, href: `${src.href}#${ex.id}`, hl: ex.level === 'HL' };
  const dg = group.find((s) => s.diagram);
  if (dg) return { title: `Annotate the diagram in ${q(dg.title)}`, detail: 'Each pair explains it to another pair without the notes.', href: `${src.href}#${dg.id}`, hl: dg.level === 'HL' };
  const wg = group.find((s) => s.weighs);
  if (wg) return { title: `Debate ${q(wg.title)}`, detail: 'Half the class argues from the advantages, half from the limitations; then decide together.', href: `${src.href}#${wg.id}`, hl: wg.level === 'HL' };
  const first = group[0];
  return { title: `Apply ${q(first?.title ?? src.title)} to a business the class knows`, detail: 'Pairs write two sentences, then compare.', href: first ? `${src.href}#${first.id}` : src.href };
}

/** The lessons for a subtopic's notes at a given length and class level. An HL-only subtopic has none for an SL class. */
export function notesLessons(src: NotesSource, length: number, level: ClassLevel): Lesson[] {
  const sections = sectionsFor(src, level);
  if (!sections.length) return [];
  const sizes = groupSizes(sections.length, sectionsPerLesson(length));
  const groups: LessonSection[][] = [];
  let at = 0;
  for (const s of sizes) {
    groups.push(sections.slice(at, at + s));
    at += s;
  }
  const m = phaseMinutes(length);
  const interactions = src.interactions.filter((x) => level === 'HL' || x.level !== 'HL');
  const objectives = src.objectives.filter((o) => level === 'HL' || !o.hl).map((o) => o.text);
  const k = groups.length;
  const shortExam = src.exam.filter((q) => (level === 'HL' || q.level !== 'HL') && q.marks <= 4).sort((a, b) => a.marks - b.marks)[0];
  return groups.map((group, i) => {
    const last = i === k - 1;
    const steps: Step[] = [];
    if (i === 0) {
      steps.push(
        src.opening
          ? { phase: 'starter', minutes: m.starter, title: `Open with the situation: ${src.opening}`, detail: 'Take first answers to its question, and keep them for the end.', href: src.href }
          : { phase: 'starter', minutes: m.starter, title: `What do students already know? Ask: ${src.retrieval[0] ?? `What is ${src.title.toLowerCase()} about?`}`, detail: 'Take answers without correcting them, and return to them in the check.' },
      );
    } else {
      const prev = groups[i - 1] ?? [];
      steps.push({ phase: 'starter', minutes: m.starter, title: 'Recall the last lesson', detail: `Without notes, students write the key ideas of ${list(prev.map((s) => q(s.title)))}, then check them.` });
    }
    const teach = allocate(m.teach, group.map(() => 1));
    group.forEach((s, j) => {
      const points = s.points.filter((p) => level === 'HL' || !p.hl).map((p) => p.text);
      const bits = [points.length ? `In the notes: ${points.slice(0, 5).join('; ')}.` : '', s.formulas.length ? `${s.formulas.length === 1 ? 'Formula' : 'Formulas'}: ${s.formulas.join('; ')}.` : ''].filter(Boolean);
      steps.push({ phase: 'teach', minutes: teach[j] ?? 0, title: s.title, detail: bits.join(' ') || undefined, href: `${src.href}#${s.id}`, hl: s.level === 'HL' });
    });
    steps.push({ phase: 'apply', minutes: m.apply, ...activity(src, group, i, last, interactions) });
    steps.push(
      last
        ? { phase: 'check', minutes: m.check, title: 'Recall cards', detail: 'Students answer from memory, reveal each answer and rate themselves.', href: `${src.href}#sh-rev-h` }
        : { phase: 'check', minutes: m.check, title: 'Explain it back', detail: `In pairs, students explain ${list(group.map((s) => q(s.title)))} without notes; partners check against the notes.` },
    );
    const obj = objectives[Math.min(objectives.length - 1, Math.floor((i * objectives.length) / k))];
    steps.push(
      last && shortExam
        ? { phase: 'exit', minutes: m.exit, title: `${shortExam.q} (${shortExam.marks} marks)`, detail: 'An exam-style question from the notes, with guidance on what a strong answer does.', href: `${src.href}#nv-exam-h` }
        : { phase: 'exit', minutes: m.exit, title: obj ?? (src.retrieval[i] ?? src.title), detail: 'Two or three sentences, handed in at the door.' },
    );
    return { n: i + 1, of: k, minutes: length, focus: group.map((s) => s.title).join('; '), steps };
  });
}

/** A brief's authored sequence, with its minutes scaled to the lesson length. */
export function briefLesson(src: BriefSource, length: number): Lesson {
  const minutes = allocate(length, src.steps.map((s) => s.minutes));
  return { n: 1, of: 1, minutes: length, focus: 'The brief, from situation to decision', steps: src.steps.map((s, i) => ({ minutes: minutes[i] ?? 0, title: '', html: s.html })) };
}

export function lessonsFor(src: LessonSource, length: number, level: ClassLevel): Lesson[] {
  return src.kind === 'brief' ? [briefLesson(src, length)] : notesLessons(src, length, level);
}

/* ---------- The presentation outline: text only ---------- */

export interface Frame {
  title: string;
  points: string[];
}

export interface OutlineSource {
  code: string;
  title: string;
  /** Why the subtopic matters, in one sentence. */
  why: string;
  objectives: string[];
  sections: Array<{ title: string; level: 'SL/HL' | 'HL'; points: string[]; example?: string }>;
  weigh: string[];
  check: string[];
  decision?: string;
}

/** A frame-by-frame outline for the teacher's own slides: titles and points, nothing designed. */
export function outlineFrames(o: OutlineSource): Frame[] {
  const frames: Frame[] = [{ title: `${o.code} ${o.title}`, points: [o.why] }];
  if (o.decision) frames.push({ title: 'The decision', points: [o.decision] });
  frames.push({ title: 'What we will learn', points: o.objectives });
  for (const s of o.sections) {
    const pts = [...s.points.slice(0, 4)];
    if (s.example) pts.push(`Example: ${s.example} (a fictional business)`);
    frames.push({ title: s.level === 'HL' ? `${s.title} (HL)` : s.title, points: pts });
  }
  if (o.weigh.length) frames.push({ title: 'Weigh it up', points: o.weigh.slice(0, 3) });
  if (o.check.length) frames.push({ title: 'Check your understanding', points: o.check.slice(0, 3) });
  return frames;
}

/** The outline as plain text, to paste into a presentation tool. */
export function outlineText(frames: Frame[], source: string): string {
  const body = frames.map((f, i) => [`${i + 1}. ${f.title}`, ...f.points.map((p) => `   - ${p}`)].join('\n')).join('\n\n');
  return `${body}\n\nFrom ${source}`;
}

/* ---------- Rendering: the same markup on the server and in the browser ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function lessonTotal(l: Lesson): number {
  return l.steps.reduce((t, s) => t + s.minutes, 0);
}

/** One lesson as a table: minutes, phase and what to do, each step linked to its place on the platform. */
export function lessonHtml(l: Lesson, caption: string): string {
  const rows = l.steps
    .map((s) => {
      const phase = s.phase ? PHASE_LABELS[s.phase] : '';
      const hl = s.hl ? ' <span class="tag tag--hl">HL</span>' : '';
      const what = s.html
        ? s.html
        : `${s.href ? `<a href="${esc(s.href)}">${esc(s.title)}</a>` : esc(s.title)}${hl}${s.detail ? `<span class="lp-detail">${esc(s.detail)}</span>` : ''}`;
      return `<tr${s.hl ? ' class="lp-hl"' : ''}><td class="n">${s.minutes}</td>${l.steps.some((x) => x.phase) ? `<td class="lp-phase">${esc(phase)}</td>` : ''}<td>${what}</td></tr>`;
    })
    .join('');
  const phased = l.steps.some((x) => x.phase);
  return `<table class="table lp-table"><caption>${esc(caption)}</caption><thead><tr><th scope="col" class="n">Minutes</th>${phased ? '<th scope="col">Phase</th>' : ''}<th scope="col">What to do</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row" class="n">${lessonTotal(l)}</th><td colspan="${phased ? 2 : 1}">minutes in all</td></tr></tfoot></table>`;
}

/** Every lesson for a subtopic, or the reason there is none, as HTML. */
export function lessonsHtml(src: LessonSource, length: number, level: ClassLevel): string {
  const lessons = lessonsFor(src, length, level);
  if (!lessons.length) return `<p class="lp-none">${esc(`${src.code} ${src.title} is HL only, so an SL class does not take it.`)}</p>`;
  return lessons
    .map((l) => {
      const head = l.of > 1 ? `Lesson ${l.n} of ${l.of}: ${l.focus}` : `One lesson: ${l.focus}`;
      return `<div class="lp-lesson"><h4 class="lp-lesson__h">${esc(head)}</h4><div class="table-scroll" role="region" aria-label="${esc(`${src.code} ${head}`)}" tabindex="0">${lessonHtml(l, `${src.code} ${src.title}, ${l.of > 1 ? `lesson ${l.n} of ${l.of}` : 'one lesson'}, ${length} minutes, ${level} class`)}</div></div>`;
    })
    .join('');
}

/** The one-line summary of a subtopic's plan, for its disclosure and the live region. */
export function planSummary(src: LessonSource, length: number, level: ClassLevel): string {
  const lessons = lessonsFor(src, length, level);
  if (!lessons.length) return 'HL only: not taken at SL';
  return `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'} of ${length} minutes`;
}
