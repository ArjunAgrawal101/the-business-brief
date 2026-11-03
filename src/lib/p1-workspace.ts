/**
 * The Paper 1 case analysis workspace: the case split into paragraphs and
 * sentences, evidence tagged by stakeholder, problem, data and tool, the
 * answer-plan structures for Section A and Section B, checks on a plan, and
 * export. Pure functions shared by the page, the browser script and the unit
 * tests; everything the reader adds stays in their browser (bb:p1-workspace).
 *
 * The plan structures follow the Paper 1 page's recommended construction
 * (the creator's Paper 1 guide), not an IB template.
 */
import { esc } from './markup';

export const TAGS = {
  stakeholder: { label: 'Stakeholder', hint: 'Who is affected, and what they want' },
  problem: { label: 'Problem', hint: 'An issue, risk or decision the organization faces' },
  data: { label: 'Data', hint: 'A figure or finding you can use' },
  tool: { label: 'Tool', hint: 'Where a business tool or theory could be applied' },
} as const;
export type Tag = keyof typeof TAGS;
export const TAG_IDS = Object.keys(TAGS) as Tag[];

export interface Sentence {
  /** Offsets within the paragraph's text. */
  start: number;
  end: number;
}

export interface Paragraph {
  text: string;
  sentences: Sentence[];
}

const ABBREV = /(?:\b(?:Mr|Mrs|Ms|Dr|St|No|Co|Ltd|Inc|vs|etc|approx|e\.g|i\.e))\.$/i;

/** Splits one paragraph into sentences, keeping offsets. Abbreviations such as "Dr." and "e.g." do not end a sentence. */
export function sentencesOf(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[.!?]["”’)]*\s+(?=["“‘(]?[A-Z0-9$£€])/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const endOfMark = m.index + m[0].trimEnd().length;
    const candidate = text.slice(start, endOfMark);
    if (ABBREV.test(candidate)) continue;
    out.push({ start, end: endOfMark });
    start = m.index + m[0].length;
  }
  if (start < text.trimEnd().length) out.push({ start, end: text.trimEnd().length });
  return out.filter((s) => text.slice(s.start, s.end).trim() !== '');
}

/** The case as paragraphs (separated by a blank line or a line break) of sentences. */
export function splitCase(raw: string): Paragraph[] {
  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n|\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((text) => ({ text, sentences: sentencesOf(text) }));
}

export const wordCount = (raw: string) => raw.trim().split(/\s+/).filter(Boolean).length;

/** Evidence in quotation marks, unless the words already open with one. */
export function quoted(text: string): string {
  return /^["“‘']/.test(text) ? text : `“${text}”`;
}

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export interface Evidence {
  id: string;
  tag: Tag;
  /** The words tagged, as they appear in the case. */
  text: string;
  para: number;
  start: number;
  end: number;
  note: string;
}

/**
 * Finds where a piece of evidence now sits in the case: at its saved offsets
 * if the words still match, otherwise the first place the words appear in its
 * paragraph, otherwise anywhere in the case. Null when the words are gone.
 */
export function locate(e: Evidence, paras: Paragraph[]): { para: number; start: number; end: number } | null {
  const p = paras[e.para];
  if (p && p.text.slice(e.start, e.end) === e.text) return { para: e.para, start: e.start, end: e.end };
  if (p) {
    const i = p.text.indexOf(e.text);
    if (i >= 0) return { para: e.para, start: i, end: i + e.text.length };
  }
  for (let k = 0; k < paras.length; k++) {
    const i = paras[k]?.text.indexOf(e.text) ?? -1;
    if (i >= 0) return { para: k, start: i, end: i + e.text.length };
  }
  return null;
}

export interface Placed {
  e: Evidence;
  at: { para: number; start: number; end: number };
}

/** Where every piece of evidence sits in the case now; evidence whose words are gone is left out. */
export function placeAll(items: Evidence[], paras: Paragraph[]): Placed[] {
  return items.flatMap((e) => {
    const at = locate(e, paras);
    return at ? [{ e, at }] : [];
  });
}

/**
 * A paragraph as HTML: each sentence a focusable span the reader can tag,
 * with tagged evidence marked and labelled in words, not colour alone.
 */
export function paragraphHtml(p: Paragraph, index: number, placed: Placed[]): string {
  const here = placed.filter((x) => x.at.para === index);
  return p.sentences
    .map((s, si) => {
      const cuts = new Set<number>([s.start, s.end]);
      for (const { at } of here) {
        if (at.end <= s.start || at.start >= s.end) continue;
        cuts.add(Math.max(s.start, at.start));
        cuts.add(Math.min(s.end, at.end));
      }
      const pts = [...cuts].sort((a, b) => a - b);
      let html = '';
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k] as number;
        const b = pts[k + 1] as number;
        const covering = here.filter(({ at }) => at.start <= a && at.end >= b);
        const chunk = esc(p.text.slice(a, b));
        if (!covering.length) html += chunk;
        else html += `<mark class="ws-m ws-m--${covering[0]?.e.tag ?? 'data'}" data-items="${covering.map((c) => esc(c.e.id)).join(' ')}">${chunk}</mark>`;
        for (const { e, at } of here) if (at.end === b) html += `<span class="ws-label ws-label--${e.tag}">${esc(TAGS[e.tag].label)}</span>`;
      }
      return `<span class="ws-s" data-p="${index}" data-s="${si}" data-start="${s.start}" data-end="${s.end}" tabindex="0" role="button" aria-label="Tag this sentence: ${esc(p.text.slice(s.start, s.end))}">${html}</span>`;
    })
    .join(' ');
}

/* ------------------------------------------------------------------ */
/* The answer plan                                                     */
/* ------------------------------------------------------------------ */

export interface Slot {
  id: string;
  title: string;
  prompt: string;
}

export const PLANS = {
  'section-a': {
    label: 'Section A: explain two',
    marks: '6 marks, often 3 + 3',
    slots: [
      { id: 'a1', title: 'First point', prompt: 'Identify it, explain it with business knowledge, then apply it: a case fact and its consequence for this organization.' },
      { id: 'a2', title: 'Second point', prompt: 'A distinct point, with its own evidence from the case, identified, explained and applied in the same way.' },
    ],
  },
  'section-b': {
    label: 'Section B: the extended response',
    marks: '10 marks: discuss, evaluate, to what extent, recommend',
    slots: [
      { id: 'frame', title: 'Frame the decision', prompt: 'The organization, the decision it faces, and what it is trying to achieve.' },
      { id: 'for', title: 'Argument', prompt: 'Developed: knowledge, a case fact, and the consequence for this organization.' },
      { id: 'against', title: 'Counter-argument', prompt: 'Developed the same way, with its own evidence.' },
      { id: 'weigh', title: 'Weighing', prompt: 'Which matters more here, and why: size, likelihood, timing, stakeholders.' },
      { id: 'limit', title: 'A limitation of the case', prompt: 'What the case does not tell you, and how that weakens the judgement.' },
      { id: 'judge', title: 'Judgement', prompt: 'A decision, and the condition it depends on.' },
    ],
  },
} as const;
export type PlanKind = keyof typeof PLANS;

export interface PlanState {
  kind: PlanKind;
  question: string;
  slots: Record<string, { note: string; items: string[] }>;
}

export const emptyPlan = (kind: PlanKind = 'section-b'): PlanState => ({ kind, question: '', slots: {} });

export interface PlanCheck {
  status: 'ok' | 'advice';
  text: string;
  standing: 'examiner' | 'strategy' | 'ib';
}

/** Checks of a plan's completeness. They say what is missing; they never mark the plan. */
export function planChecks(plan: PlanState, items: Evidence[]): PlanCheck[] {
  const out: PlanCheck[] = [];
  const byId = new Map(items.map((e) => [e.id, e]));
  const slot = (id: string) => plan.slots[id] ?? { note: '', items: [] };
  const evidence = (id: string) => slot(id).items.filter((x) => byId.has(x));
  if (!plan.question.trim()) out.push({ status: 'advice', text: 'Write the question you are planning for: its command term and its focus decide what the plan needs.', standing: 'strategy' });
  if (plan.kind === 'section-a') {
    for (const s of PLANS['section-a'].slots) {
      if (!evidence(s.id).length) out.push({ status: 'advice', text: `${s.title}: no case evidence yet. Answers to AO2 questions that are not applied to the case are typically limited to half the marks (TSM, p. 56).`, standing: 'ib' });
    }
    const shared = evidence('a1').filter((x) => evidence('a2').includes(x));
    if (shared.length) out.push({ status: 'advice', text: 'The two points share evidence. Points that overlap or share evidence earn less: give each its own.', standing: 'examiner' });
    if (evidence('a1').length && evidence('a2').length && !shared.length) out.push({ status: 'ok', text: 'Each point has its own evidence from the case.', standing: 'strategy' });
  } else {
    if (!evidence('for').length || !evidence('against').length)
      out.push({ status: 'advice', text: 'Both the argument and the counter-argument need case evidence: a one-sided answer cannot reach the top markbands.', standing: 'examiner' });
    else out.push({ status: 'ok', text: 'The argument and the counter-argument each have case evidence.', standing: 'strategy' });
    if (!slot('weigh').note.trim()) out.push({ status: 'advice', text: 'Note how you will weigh the two sides: evaluation grows from weighing, not from listing.', standing: 'strategy' });
    if (!slot('limit').note.trim() && !evidence('limit').length)
      out.push({ status: 'advice', text: 'No limitation of the case yet. The assessment guides report that without one, marks are limited to 8 of 10; say how the gap weakens the judgement.', standing: 'examiner' });
    if (!slot('judge').note.trim()) out.push({ status: 'advice', text: 'Note your judgement and the condition it depends on.', standing: 'strategy' });
  }
  const used = new Set(Object.values(plan.slots).flatMap((s) => s.items));
  const usedTags = new Set(items.filter((e) => used.has(e.id)).map((e) => e.tag));
  if (used.size && !usedTags.has('stakeholder')) out.push({ status: 'advice', text: 'No stakeholder evidence in the plan: who gains and who loses often decides the weighing.', standing: 'strategy' });
  if (used.size && !usedTags.has('data')) out.push({ status: 'advice', text: 'No data in the plan: a figure from the case makes a point specific.', standing: 'strategy' });
  return out;
}

/** The plan as plain text, ready to print or paste into notes. */
export function planText(plan: PlanState, items: Evidence[], caseTitle: string): string {
  const byId = new Map(items.map((e) => [e.id, e]));
  const def = PLANS[plan.kind];
  const lines = [`Answer plan: ${def.label} (${def.marks})`, `Case: ${caseTitle}`, `Question: ${plan.question.trim() || 'not yet written'}`, ''];
  for (const s of def.slots) {
    const st = plan.slots[s.id] ?? { note: '', items: [] };
    lines.push(`${s.title.toUpperCase()}`);
    for (const id of st.items) {
      const e = byId.get(id);
      if (e) lines.push(`  [${TAGS[e.tag].label}] ${quoted(e.text)}${e.note.trim() ? ` (${e.note.trim()})` : ''}`);
    }
    if (st.note.trim()) lines.push(`  My point: ${st.note.trim()}`);
    if (!st.items.length && !st.note.trim()) lines.push('  (empty)');
    lines.push('');
  }
  const loose = items.filter((e) => !Object.values(plan.slots).some((s) => s.items.includes(e.id)));
  if (loose.length) {
    lines.push('EVIDENCE NOT YET IN THE PLAN');
    for (const e of loose) lines.push(`  [${TAGS[e.tag].label}] ${quoted(e.text)}${e.note.trim() ? ` (${e.note.trim()})` : ''}`);
    lines.push('');
  }
  lines.push('A recommended construction from The Business Brief, not an IB template.');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Saved work: bb:p1-workspace                                         */
/* ------------------------------------------------------------------ */

export const MAX_CASE = 20000;
export const MAX_ITEMS = 200;

export interface WorkspaceState {
  v: 1;
  /** "example" for the illustrative case, "own" for the reader's text. */
  source: 'example' | 'own';
  own: string;
  items: Evidence[];
  plan: PlanState;
}

export const emptyWorkspace = (): WorkspaceState => ({ v: 1, source: 'example', own: '', items: [], plan: emptyPlan() });

export function parseWorkspace(raw: unknown): WorkspaceState {
  const out = emptyWorkspace();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<WorkspaceState>;
  if (r.source === 'own') out.source = 'own';
  if (typeof r.own === 'string') out.own = r.own.slice(0, MAX_CASE);
  if (Array.isArray(r.items)) {
    for (const e of r.items.slice(0, MAX_ITEMS)) {
      if (!e || typeof e !== 'object') continue;
      const x = e as Partial<Evidence>;
      const num = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : -1);
      if (typeof x.id !== 'string' || typeof x.text !== 'string' || !x.text.trim() || !TAG_IDS.includes(x.tag as Tag)) continue;
      const para = num(x.para);
      const start = num(x.start);
      const end = num(x.end);
      if (para < 0 || start < 0 || end <= start) continue;
      out.items.push({ id: x.id, tag: x.tag as Tag, text: x.text.slice(0, 2000), para, start, end, note: typeof x.note === 'string' ? x.note.slice(0, 1000) : '' });
    }
  }
  const p = r.plan as Partial<PlanState> | undefined;
  if (p && typeof p === 'object') {
    out.plan.kind = p.kind === 'section-a' ? 'section-a' : 'section-b';
    out.plan.question = typeof p.question === 'string' ? p.question.slice(0, 1000) : '';
    const ids = new Set(out.items.map((e) => e.id));
    if (p.slots && typeof p.slots === 'object') {
      for (const [k, v] of Object.entries(p.slots as Record<string, unknown>)) {
        if (!v || typeof v !== 'object') continue;
        const s = v as { note?: unknown; items?: unknown };
        out.plan.slots[k] = {
          note: typeof s.note === 'string' ? s.note.slice(0, 3000) : '',
          items: Array.isArray(s.items) ? s.items.filter((x): x is string => typeof x === 'string' && ids.has(x)) : [],
        };
      }
    }
  }
  return out;
}

/** Adds evidence, ignoring an exact duplicate (same words, same place, same tag). */
export function addEvidence(state: WorkspaceState, e: Omit<Evidence, 'id' | 'note'>, id: string): WorkspaceState {
  if (state.items.some((x) => x.tag === e.tag && x.para === e.para && x.start === e.start && x.end === e.end)) return state;
  if (state.items.length >= MAX_ITEMS) return state;
  return { ...state, items: [...state.items, { ...e, id, note: '' }] };
}

/** Removes evidence and takes it out of every slot of the plan. */
export function removeEvidence(state: WorkspaceState, id: string): WorkspaceState {
  const slots = Object.fromEntries(Object.entries(state.plan.slots).map(([k, s]) => [k, { ...s, items: s.items.filter((x) => x !== id) }]));
  return { ...state, items: state.items.filter((e) => e.id !== id), plan: { ...state.plan, slots } };
}

/** Puts evidence into one slot of the plan (or none), taking it out of any other. */
export function assign(state: WorkspaceState, id: string, slotId: string | null): WorkspaceState {
  const slots: PlanState['slots'] = {};
  for (const [k, s] of Object.entries(state.plan.slots)) slots[k] = { ...s, items: s.items.filter((x) => x !== id) };
  if (slotId) {
    const s = slots[slotId] ?? { note: '', items: [] };
    slots[slotId] = { ...s, items: [...s.items, id] };
  }
  return { ...state, plan: { ...state.plan, slots } };
}

export function slotOf(plan: PlanState, id: string): string | null {
  for (const [k, s] of Object.entries(plan.slots)) if (s.items.includes(id)) return k;
  return null;
}
