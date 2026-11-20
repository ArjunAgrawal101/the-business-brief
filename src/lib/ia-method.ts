/**
 * The research methodology planner for the internal assessment, as pure
 * functions: the kinds of research a student plans, checked against what the
 * guide says of research and of the documents it produces (pp. 53 to 55),
 * the teacher support material's advice (p. 70), the IA research guide's
 * report on methodology sections (p. 5) and the platform's own advice, each
 * check labelled by its standing. It plans; it never writes any part of the
 * project. Saved in bb:ia-method.
 */
import type { Check } from './ia-tools';

/** Primary research the guide names, with what it says to attach (p. 54). */
export const PRIMARY_METHODS = {
  survey: { name: 'A survey or questionnaire', attach: 'a blank copy of the questionnaire, and a tally or summary of the responses' },
  interview: { name: 'Interviews', attach: 'a copy of the interview questions, and a summary of the responses' },
  'focus-group': { name: 'A focus group', attach: 'a copy of the focus group questions, and a summary of the findings' },
} as const;
export type PrimaryId = keyof typeof PRIMARY_METHODS;
export const PRIMARY_IDS = Object.keys(PRIMARY_METHODS) as PrimaryId[];

/** Secondary sources the guide gives as examples (pp. 54 to 55), and textbooks, which it does not accept as supporting documents. */
export const SECONDARY_SOURCES = {
  press: 'Articles from the local, national or international press',
  accounts: 'Business accounts or financial reports',
  plans: 'Business plans',
  website: 'Extracts from the organization’s own website, or its mission statement',
  transcript: 'A transcript of a relevant audio or video file',
  statistics: 'Government and other statistics',
  journals: 'Journal publications',
  market: 'Market research surveys',
  textbook: 'Textbooks or class notes',
} as const;
export type SecondaryId = keyof typeof SECONDARY_SOURCES;
export const SECONDARY_IDS = Object.keys(SECONDARY_SOURCES) as SecondaryId[];

export interface PrimaryPlan {
  use: boolean;
  /** Who will be asked, in the reader's words. */
  who: string;
  /** How many, or null while not known. */
  size: number | null;
}

export interface MethodPlan {
  v: 1;
  form: '' | 'forward' | 'backward';
  /** Where most of the evidence will come from. */
  mainly: '' | 'primary' | 'secondary' | 'both';
  primary: Record<PrimaryId, PrimaryPlan>;
  secondary: SecondaryId[];
  /** Another student in the class is researching the same organization. */
  sameOrg: boolean;
  /** The student is also writing an extended essay in business management. */
  ee: boolean;
  /** About the same organization as the project. */
  eeSameOrg: boolean;
  /** The reader's own note of how the introduction will explain the method. */
  intro: string;
}

export const emptyMethod = (): MethodPlan => ({
  v: 1,
  form: '',
  mainly: '',
  primary: { survey: { use: false, who: '', size: null }, interview: { use: false, who: '', size: null }, 'focus-group': { use: false, who: '', size: null } },
  secondary: [],
  sameOrg: false,
  ee: false,
  eeSameOrg: false,
  intro: '',
});

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** A survey this small gives little to generalize from: the platform's rule of thumb, not the guide's. */
export const SMALL_SURVEY = 30;

/** The plan, checked: the guide first, then the TSM, the IA research guide and the platform. */
export function checkMethod(p: MethodPlan): Check[] {
  const out: Check[] = [];
  const primary = PRIMARY_IDS.filter((id) => p.primary[id].use);
  const secondary = p.secondary.filter((s) => s !== 'textbook');
  if (!primary.length && !secondary.length) {
    out.push({ status: 'advice', text: 'Choose the research you plan. The guide allows primary research, secondary research or both, selected for its suitability, depth and breadth.', standing: 'ib', source: 'Guide, p. 53' });
  } else {
    out.push({ status: 'ok', text: `${primary.length ? 'Primary' : ''}${primary.length && secondary.length ? ' and secondary' : secondary.length ? 'Secondary' : ''} research planned: the guide allows either, or both, chosen for its suitability, depth and breadth.`, standing: 'ib', source: 'Guide, p. 53' });
  }
  for (const id of primary) {
    const m = PRIMARY_METHODS[id];
    const plan = p.primary[id];
    out.push({ status: 'ok', text: `${m.name}: attach ${m.attach}, as the guide asks for primary research.`, standing: 'ib', source: 'Guide, p. 54' });
    if (!plan.who.trim() || plan.size === null)
      out.push({ status: 'advice', text: `${m.name}: say who you will ask and how many. Criterion D rewards weighing the evidence, and who took part is part of that.`, standing: 'strategy' });
    else if (id === 'survey' && plan.size < SMALL_SURVEY)
      out.push({ status: 'advice', text: `A survey of ${plan.size} gives little to generalize from. That does not rule it out: say so when you evaluate it, and do not lean on it alone.`, standing: 'strategy' });
  }
  if (primary.length)
    out.push({ status: 'advice', text: 'Ask before you survey or interview anyone, tell them what the answers are for, and keep them anonymous unless they agree otherwise. Check your school’s rules with your teacher.', standing: 'strategy' });
  if (p.secondary.includes('transcript'))
    out.push({ status: 'advice', text: 'A transcript: at most one supporting document may be one, and it must give the essential points of the original, from a reliable organization, referenced so the original can be traced.', standing: 'ib', source: 'Guide, p. 54' });
  if (p.secondary.includes('textbook'))
    out.push({ status: 'problem', text: 'Textbooks and class notes must be referenced, but are not accepted as supporting documents. Use them for theory, cited, and find documents about the organization.', standing: 'ib', source: 'Guide, p. 55' });
  if (secondary.length === 1 && secondary[0] === 'website' && !primary.length)
    out.push({ status: 'advice', text: 'Only the organization’s own material is planned. The guide gives documents published by a single company as a set without balance: plan sources from outside it too.', standing: 'ib', source: 'Guide, p. 54' });
  if (p.mainly === 'primary' && p.form === 'backward')
    out.push({ status: 'advice', text: 'Mostly primary research tends to suit a forward-looking question; this is advice, not a rule.', standing: 'tsm', source: 'TSM, p. 70' });
  else if (p.mainly === 'secondary' && p.form === 'forward')
    out.push({ status: 'advice', text: 'Mostly secondary research tends to suit a backward-looking question; this is advice, not a rule.', standing: 'tsm', source: 'TSM, p. 70' });
  if (p.sameOrg)
    out.push({ status: 'advice', text: 'A classmate is studying the same organization: your project must show your own individual research, interpretation and analysis.', standing: 'ib', source: 'Guide, p. 54' });
  if (p.ee) {
    out.push({ status: 'advice', text: 'You are also writing an extended essay in business management: the IA and the essay must be distinct pieces of work, using different research approaches, and the same work cannot be submitted for both.', standing: 'ib', source: 'Guide, pp. 52 and 54' });
    if (p.eeSameOrg) out.push({ status: 'problem', text: 'Your extended essay is about the same organization. The guide says to choose different organizations for the two tasks.', standing: 'ib', source: 'Guide, p. 54' });
  }
  const n = wordCount(p.intro);
  if (!n)
    out.push({ status: 'advice', text: 'Note how your introduction will explain your method. The guide asks the introduction to explain the methodology used to investigate the issue.', standing: 'ib', source: 'Guide, p. 55' });
  else if (n > 120)
    out.push({ status: 'advice', text: `Your note runs to ${n} words. Keep the account of your method brief: the IA research guide reports that subject reports advise against a long research proposal or methodology section.`, standing: 'examiner', source: 'IA research guide, p. 5' });
  else out.push({ status: 'ok', text: 'A note of your method for the introduction, kept brief.', standing: 'ib', source: 'Guide, p. 55' });
  return out;
}

/** What the plan says to attach to the project, in the guide's words where it gives them. */
export function attachments(p: MethodPlan): string[] {
  const out = PRIMARY_IDS.filter((id) => p.primary[id].use).map((id) => `${PRIMARY_METHODS[id].name}: ${PRIMARY_METHODS[id].attach}.`);
  if (p.secondary.includes('transcript')) out.push('The transcript, with a reference to the original audio or video.');
  return out;
}

/** Saved state, read defensively: anything malformed falls back to the empty plan. */
export function parseMethod(raw: unknown): MethodPlan {
  const out = emptyMethod();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  out.form = r.form === 'forward' || r.form === 'backward' ? r.form : '';
  out.mainly = r.mainly === 'primary' || r.mainly === 'secondary' || r.mainly === 'both' ? r.mainly : '';
  const prim = r.primary && typeof r.primary === 'object' ? (r.primary as Record<string, unknown>) : {};
  for (const id of PRIMARY_IDS) {
    const x = prim[id] && typeof prim[id] === 'object' ? (prim[id] as Record<string, unknown>) : {};
    const size = typeof x.size === 'number' && Number.isFinite(x.size) && x.size >= 0 ? Math.min(100000, Math.floor(x.size)) : null;
    out.primary[id] = { use: x.use === true, who: typeof x.who === 'string' ? x.who.slice(0, 300) : '', size };
  }
  if (Array.isArray(r.secondary)) out.secondary = [...new Set(r.secondary.filter((s): s is SecondaryId => typeof s === 'string' && (SECONDARY_IDS as string[]).includes(s)))];
  out.sameOrg = r.sameOrg === true;
  out.ee = r.ee === true;
  out.eeSameOrg = out.ee && r.eeSameOrg === true;
  out.intro = typeof r.intro === 'string' ? r.intro.slice(0, 4000) : '';
  return out;
}

/** A plain-text summary to take to the teacher: the plan, not any part of the project. */
export function methodSummary(p: MethodPlan): string {
  const yes = (b: boolean) => (b ? 'yes' : 'no');
  const primary = PRIMARY_IDS.filter((id) => p.primary[id].use).map((id) => {
    const x = p.primary[id];
    return `- ${PRIMARY_METHODS[id].name}: ${x.who.trim() || 'who not yet decided'}, ${x.size === null ? 'number not yet decided' : `${x.size} people`}`;
  });
  const lines = [
    'Research methodology plan (The Business Brief)',
    '',
    `Question looks: ${p.form || 'not yet decided'}`,
    `Most evidence from: ${p.mainly || 'not yet decided'} research`,
    '',
    'Primary research:',
    ...(primary.length ? primary : ['- none planned']),
    '',
    'Secondary sources:',
    ...(p.secondary.length ? p.secondary.map((s) => `- ${SECONDARY_SOURCES[s]}`) : ['- none planned']),
    '',
    `A classmate studies the same organization: ${yes(p.sameOrg)}`,
    `Also writing a business management extended essay: ${yes(p.ee)}${p.ee ? `, about the same organization: ${yes(p.eeSameOrg)}` : ''}`,
    '',
    'My note on the method, for the introduction:',
    p.intro.trim() || '(not yet written)',
    '',
    'To attach:',
    ...(attachments(p).length ? attachments(p).map((a) => `- ${a}`) : ['- nothing beyond the supporting documents yet']),
  ];
  return lines.join('\n') + '\n';
}
