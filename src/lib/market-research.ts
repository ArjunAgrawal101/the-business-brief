/**
 * The market research questionnaire builder (4.4: surveys, qualitative and
 * quantitative research, and the guide's three sampling methods: quota,
 * random and convenience).
 *
 * The question checks are rules: patterns in the wording that often signal a
 * leading or double-barrelled question, overlapping answer ranges, a scale
 * with no negative end, and so on. Rules cannot read meaning, so a flag is a
 * prompt to look again, not a verdict, and a question can be poor without
 * tripping any rule. The margin of error for a random sample is standard
 * statistics beyond the guide (enrichment).
 */
import { asBool, asInt, asList, asLines, asNum, asObj, asOneOf, asStr, listWords, safeId, uniqueIds, type Check } from './market-kit';
import { fmtNumber } from './format';

export const QUESTION_TYPES = ['single', 'multi', 'scale', 'yesno', 'number', 'ranking', 'open'] as const;
export type QType = (typeof QUESTION_TYPES)[number];
export const QTYPE_LABELS: Record<QType, { label: string; data: 'quantitative' | 'qualitative' }> = {
  single: { label: 'Multiple choice, one answer', data: 'quantitative' },
  multi: { label: 'Multiple choice, any number of answers', data: 'quantitative' },
  scale: { label: 'Rating scale, 1 to 5', data: 'quantitative' },
  yesno: { label: 'Yes or no', data: 'quantitative' },
  number: { label: 'A number', data: 'quantitative' },
  ranking: { label: 'Put the options in order', data: 'quantitative' },
  open: { label: 'Open question, in their own words', data: 'qualitative' },
};
export const hasOptions = (t: QType) => t === 'single' || t === 'multi' || t === 'ranking';

export type Method = 'random' | 'quota' | 'convenience';
export const METHOD_LABELS: Record<Method, string> = { random: 'Random sampling', quota: 'Quota sampling', convenience: 'Convenience sampling' };

export interface Question {
  id: string;
  type: QType;
  text: string;
  options: string[];
  /** End labels for a rating scale. */
  low: string;
  high: string;
  required: boolean;
}

export interface Quota {
  id: string;
  group: string;
  /** Share of the population, in per cent. */
  share: number;
}

export interface QuestionnaireState {
  business: string;
  title: string;
  objective: string;
  population: string;
  /** Size of the population, when known; 0 when it is not. */
  populationSize: number;
  method: Method;
  sampleSize: number;
  quotas: Quota[];
  intro: string;
  questions: Question[];
}

/* ---------- Answer ranges in options ---------- */

export interface Range {
  lo: number;
  hi: number;
  loOpen: boolean;
  hiOpen: boolean;
  /** Decimal places written, for deciding whether two ranges meet. */
  dp: number;
}

const NUM = '(\\d[\\d,]*(?:\\.\\d+)?)';
const dash = `(?:-|${String.fromCharCode(0x2013)}|${String.fromCharCode(0x2014)}|to)`;
const num = (s: string) => Number(s.replace(/,/g, ''));
const dps = (...s: string[]) => Math.max(0, ...s.map((x) => (x.split('.')[1] ?? '').length));

/** A numeric range written in an answer option, such as "$2 to $2.99", "under 5", "10 or more"; null if none. */
export function parseRange(option: string): Range | null {
  const t = option.toLowerCase().replace(/[$€£¥%]/g, '').replace(/\s+/g, ' ').trim();
  let m = new RegExp(`^${NUM} ?${dash} ?${NUM}\\b`).exec(t);
  if (m?.[1] && m[2]) return { lo: num(m[1]), hi: num(m[2]), loOpen: false, hiOpen: false, dp: dps(m[1], m[2]) };
  m = new RegExp(`^(?:under|less than|below|fewer than) ${NUM}\\b`).exec(t);
  if (m?.[1]) return { lo: -Infinity, hi: num(m[1]), loOpen: true, hiOpen: true, dp: dps(m[1]) };
  m = new RegExp(`^(?:over|more than|above) ${NUM}\\b`).exec(t);
  if (m?.[1]) return { lo: num(m[1]), hi: Infinity, loOpen: true, hiOpen: true, dp: dps(m[1]) };
  m = new RegExp(`^${NUM} (?:or more|and over|and above|or over|plus)\\b`).exec(t);
  if (m?.[1]) return { lo: num(m[1]), hi: Infinity, loOpen: false, hiOpen: true, dp: dps(m[1]) };
  m = new RegExp(`^${NUM} (?:or less|or fewer|or under)\\b`).exec(t);
  if (m?.[1]) return { lo: -Infinity, hi: num(m[1]), loOpen: true, hiOpen: false, dp: dps(m[1]) };
  return null;
}

/** Pairs of options whose ranges overlap, and gaps between ranges that should meet. */
export function rangeProblems(options: string[]): { overlaps: Array<[string, string]>; gaps: Array<[string, string]> } {
  const rs = options.map((o) => ({ o, r: parseRange(o) })).filter((x): x is { o: string; r: Range } => x.r !== null);
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < rs.length; i += 1)
    for (let j = i + 1; j < rs.length; j += 1) {
      const a = rs[i];
      const b = rs[j];
      if (!a || !b) continue;
      const [p, q] = a.r.lo <= b.r.lo ? [a, b] : [b, a];
      const touch = p.r.hi === q.r.lo;
      const over = p.r.hi > q.r.lo || (touch && !p.r.hiOpen && !q.r.loOpen);
      if (over) overlaps.push([p.o, q.o]);
    }
  const gaps: Array<[string, string]> = [];
  const sorted = [...rs].sort((a, b) => a.r.lo - b.r.lo);
  for (let i = 1; i < sorted.length; i += 1) {
    const p = sorted[i - 1];
    const q = sorted[i];
    if (!p || !q || !Number.isFinite(p.r.hi) || !Number.isFinite(q.r.lo)) continue;
    const step = 10 ** -Math.max(p.r.dp, q.r.dp);
    if (q.r.lo - p.r.hi > step + 1e-9) gaps.push([p.o, q.o]);
  }
  return { overlaps, gaps };
}

/* ---------- Question checks ---------- */

const LEADING_TAGS = /,\s*(?:don't|doesn't|isn't|aren't|wouldn't|won't|can't|shouldn't|didn't|right)\s*(?:you|it|they|we|he|she)?\s*\??\s*$/i;
const LEADING_FRAMES = /\b(?:don't|doesn't|wouldn't|isn't|aren't|won't) you (?:agree|think|feel|like|prefer|love)\b|\b(?:do|would) you (?:agree|disagree) that\b|\bwouldn't it be\b|\bisn't it true\b/i;
const LOADED = /\b(?:amazing|delicious|excellent|wonderful|fantastic|superb|outstanding|terrible|awful|horrible|disgusting|obviously|clearly|surely|of course|everyone knows|most people|like most)\b/i;
const PRESUMING = /^\s*(?:why do you (?:like|love|enjoy|prefer)|how much do you (?:like|love|enjoy)|how much did you (?:like|love|enjoy)|what do you (?:like|love) most about)\b/i;
const EVALUATIVE = /\b(?:how (?:satisfied|important|likely|happy|good|easy|useful|often|much)|rate|rating|do you (?:like|agree|prefer|use|value|find|think)|would you|are you|is the|are the|was the|were the|is it|are they)\b/i;
const JOIN = /\b([a-z][a-z'-]+)\s+(?:and|or|as well as|along with)\s+([a-z][a-z'-]+)\b/i;
const DOUBLE_NEG = /(?:\b(?:not|never|no)\b|n't)[^?.]*?(?:\b(?:not|never|no)\b|n't)/i;
const ABSOLUTE = /\b(?:always|never|every|all|none)\b/i;
const VAGUE = /\b(?:often|regularly|sometimes|frequently|occasionally|rarely|recently|usually|a lot|a little)\b/i;
const SENSITIVE = /\b(?:income|salary|wages?|earn(?:ings)?|how old|your age|religio\w*|ethnic\w*|gender|sex|health|disabilit\w*|home address|phone number|email address|weight)\b/i;
const HYPOTHETICAL = /\b(?:would you(?! rate| describe| say| rank)|you would|if you were|imagine)\b/i;
const ACRONYM = /\b(?!(?:TV|UK|US|USA|EU|OK|AM|PM|ID|I)\b)[A-Z]{2,5}s?\b/;
const ESCAPE = /\b(?:other|none|don't know|do not know|not sure|prefer not|never|neither|no preference)\b/i;
const POSITIVE_END = /\b(?:good|satisfied|happy|likely|important|pleased|agree)\b/i;
const NEGATED = /\b(?:not|un\w+|dis\w+|very poor|poor|bad)\b/i;

/** Rule-based checks on one question. `n` is its number in the questionnaire. */
export function questionChecks(q: Question, n: number): Check[] {
  const out: Check[] = [];
  const about = `Question ${n}`;
  const add = (level: Check['level'], text: string) => out.push({ level, about, text });
  const t = q.text.trim();
  if (!t) {
    add('conflict', 'Write the question.');
    return out;
  }
  if (LEADING_TAGS.test(t) || LEADING_FRAMES.test(t)) add('conflict', 'Possibly leading: the wording invites agreement. Ask neutrally, for example “How would you rate…?” with a balanced scale.');
  else {
    const loaded = LOADED.exec(t);
    if (loaded) add('tension', `Possibly leading: “${loaded[0]}” is a loaded word that suggests the answer. Use neutral wording.`);
    if (PRESUMING.test(t)) add('tension', 'Possibly leading: it assumes the respondent already likes the product. Ask first whether they use it.');
  }
  const join = JOIN.exec(t);
  const isRangeJoin = join && /\d/.test(t.slice(Math.max(0, join.index - 4), join.index + join[0].length + 4));
  if (join && !isRangeJoin && q.type !== 'open' && !/^\s*which\b/i.test(t) && EVALUATIVE.test(t)) add('conflict', `Possibly double-barrelled: “${join[0]}” asks about two things at once, so one answer cannot cover both. Split it into two questions.`);
  if (DOUBLE_NEG.test(t)) add('tension', 'Possible double negative: respondents may misread it. Ask the question positively.');
  if (ABSOLUTE.test(t)) add('note', `“${ABSOLUTE.exec(t)?.[0]}” is absolute: few honest answers fit always or never. Ask how often instead.`);
  if (SENSITIVE.test(t)) add('note', 'Sensitive: make it optional, offer bands rather than exact figures, explain why you ask, and place it near the end.');
  if (HYPOTHETICAL.test(t)) add('note', 'Hypothetical: what people say they would do often overstates what they do. Ask about past behaviour where you can.');
  const acr = ACRONYM.exec(t);
  if (acr) add('note', `Explain “${acr[0]}”: respondents may not know the abbreviation.`);
  const words = t.split(/\s+/).length;
  if (words > 25) add('tension', `Long (${words} words): shorter questions are answered more accurately.`);

  if (hasOptions(q.type)) {
    if (q.options.length < 2) add('conflict', 'A multiple-choice question needs at least two options.');
    const { overlaps, gaps } = rangeProblems(q.options);
    overlaps.forEach(([a, b]) => add('conflict', `The options “${a}” and “${b}” overlap, so some respondents fit both.`));
    gaps.forEach(([a, b]) => add('tension', `There is a gap between “${a}” and “${b}”, so some respondents fit neither.`));
    const vague = q.options.find((o) => VAGUE.test(o));
    if (vague) add('tension', `“${vague}” means different things to different people. Define it, for example “at least once a week”.`);
    const ranges = q.options.map(parseRange);
    const covered = ranges.some((r) => r && r.lo === -Infinity) && ranges.some((r) => r && r.hi === Infinity);
    if (q.type === 'single' && q.options.length >= 3 && !covered && !q.options.some((o) => ESCAPE.test(o))) add('note', 'Can every respondent answer? Consider an “Other” or “Don’t know” option.');
    const dupes = q.options.filter((o, i) => q.options.findIndex((x) => x.trim().toLowerCase() === o.trim().toLowerCase()) !== i);
    if (dupes.length) add('conflict', `The option “${dupes[0]}” appears twice.`);
  }
  if (q.type === 'scale') {
    if (!q.low.trim() || !q.high.trim()) add('tension', 'Label both ends of the scale, so every respondent reads it the same way.');
    else if (POSITIVE_END.test(q.low) && !NEGATED.test(q.low)) add('conflict', `Unbalanced scale: the low end, “${q.low}”, is still positive, which pushes answers up. Run it from a negative end to a positive one.`);
  }
  return out;
}

/** Checks on the questionnaire as a whole. */
export function surveyChecks(s: QuestionnaireState): Check[] {
  const out: Check[] = [];
  const add = (level: Check['level'], about: string, text: string) => out.push({ level, about, text });
  if (!s.objective.trim()) add('conflict', 'Objective', 'Say what decision the research will inform: every question should serve it.');
  if (s.questions.length < 3) add('tension', 'Length', 'Fewer than three questions is unlikely to answer the objective.');
  if (s.questions.length > 15) add('tension', 'Length', `${s.questions.length} questions: long questionnaires lose respondents and attention. Cut any question the objective does not need.`);
  const early = s.questions.slice(0, 2).findIndex((q) => SENSITIVE.test(q.text));
  if (early >= 0) add('tension', 'Order', `Question ${early + 1} is sensitive: put sensitive and personal questions at the end, after trust is built.`);
  const open = s.questions.filter((q) => q.type === 'open').length;
  const closed = s.questions.length - open;
  if (closed && open) add('fit', 'Data', `${closed} closed ${closed === 1 ? 'question gives' : 'questions give'} quantitative data and ${open} open ${open === 1 ? 'question gives' : 'questions give'} qualitative data: numbers to measure, and reasons to explain them.`);
  else if (!open && s.questions.length) add('note', 'Data', 'Every question is closed, so the data are quantitative only: one open question can explain the numbers.');
  if (open > 3) add('note', 'Data', 'More than three open questions take a long time to analyse with a large sample.');
  if (!s.intro.trim()) add('tension', 'Introduction', 'Tell respondents who is asking, why, how long it takes, and that answers are anonymous.');
  return out;
}

/* ---------- Sampling ---------- */

export interface QuotaRow {
  group: string;
  share: number;
  count: number;
}

/** Interviews per quota group, by the largest-remainder method so the counts add up to the sample size. */
export function quotaCounts(quotas: Quota[], n: number): QuotaRow[] {
  const total = quotas.reduce((a, q) => a + q.share, 0);
  if (!quotas.length || total <= 0) return [];
  const exact = quotas.map((q) => (q.share / total) * n);
  const floor = exact.map(Math.floor);
  let left = n - floor.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, rem: e - Math.floor(e) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    floor[o.i] = (floor[o.i] ?? 0) + 1;
    left -= 1;
  }
  return quotas.map((q, i) => ({ group: q.group, share: q.share, count: floor[i] ?? 0 }));
}

/**
 * The margin of error at 95% confidence for a proportion from a simple random
 * sample, in percentage points, at the most cautious proportion of 50%, with
 * the finite population correction when the population size is known.
 */
export function marginOfError(n: number, population = 0): number | null {
  if (!(n > 0)) return null;
  const base = 1.96 * Math.sqrt(0.25 / n);
  const fpc = population > n && population > 1 ? Math.sqrt((population - n) / (population - 1)) : population > 0 && population <= n ? 0 : 1;
  return base * fpc * 100;
}

export function samplingNotes(s: QuestionnaireState): { method: string; notes: Check[]; quotas: QuotaRow[]; moe: number | null } {
  const notes: Check[] = [];
  const add = (level: Check['level'], text: string) => notes.push({ level, text });
  const quotas = s.method === 'quota' ? quotaCounts(s.quotas, s.sampleSize) : [];
  const moe = s.method === 'random' ? marginOfError(s.sampleSize, s.populationSize) : null;
  if (s.sampleSize <= 0) add('conflict', 'Set a sample size.');
  if (s.populationSize > 0 && s.sampleSize > s.populationSize) add('conflict', 'The sample is larger than the population.');
  if (s.sampleSize > 0 && s.sampleSize < 30) add('tension', 'A sample under 30 varies a lot by chance: treat the results as a first look.');
  let method: string;
  if (s.method === 'random') {
    method = 'Every member of the population has an equal chance of being chosen, which makes it the least biased of the three methods. It needs a complete list of the population (a sampling frame), and reaching the people chosen can be slow and costly.';
    add('note', 'You need a sampling frame: a complete list of the population to draw names from, at random.');
    if (moe !== null) add('note', `With ${fmtNumber(s.sampleSize)} responses${s.populationSize > 0 ? ` from ${fmtNumber(s.populationSize)}` : ''}, a percentage from the survey is likely to be within about ${fmtNumber(moe, 1)} percentage points of the population’s (95% confidence). This margin of error is statistics beyond the guide (enrichment), and holds only for a random sample.`);
  } else if (s.method === 'quota') {
    method = 'The sample is built to match the population on chosen characteristics, with a set number of interviews in each group. It is quicker and cheaper than random sampling, but interviewers choose who to ask within each quota, so selection bias can creep in.';
    const total = s.quotas.reduce((a, q) => a + q.share, 0);
    if (!s.quotas.length) add('conflict', 'Set the quota groups and their share of the population.');
    else if (Math.abs(total - 100) > 0.05) add('conflict', `The quota shares add up to ${fmtNumber(total, 1)}%, not 100%.`);
    else add('fit', `The quota shares add up to 100%, so the ${fmtNumber(s.sampleSize)} interviews mirror the population: ${listWords(quotas.map((q) => `${fmtNumber(q.count)} ${q.group || 'in an unnamed group'}`))}.`);
    s.quotas.forEach((q) => !q.group.trim() && add('conflict', 'Name every quota group.'));
  } else {
    method = 'The sample is whoever is easiest to reach. It is fast and cheap, but unlikely to represent the population, so the results show what some people think, not what the population thinks.';
    add('tension', 'A convenience sample cannot be generalized to the population: report the results as indicative only.');
    if (/customer|in the (?:shop|store|café|cafe)/i.test(s.population)) add('note', 'Asking only people already using the business misses the customers it has not won.');
  }
  return { method, notes, quotas, moe };
}

/* ---------- The questionnaire as text, CSV and saved state ---------- */

export function questionnaireText(s: QuestionnaireState): string {
  const lines = [s.title || 'Questionnaire', '', s.intro, ''];
  s.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.text}${q.required ? '' : ' (optional)'}`);
    if (hasOptions(q.type)) q.options.forEach((o) => lines.push(`   ${q.type === 'multi' ? '[ ]' : q.type === 'ranking' ? '__' : '( )'} ${o}`));
    if (q.type === 'scale') lines.push(`   1 (${q.low})  2  3  4  5 (${q.high})`);
    if (q.type === 'yesno') lines.push('   ( ) Yes   ( ) No');
    if (q.type === 'number') lines.push('   Number: ______');
    if (q.type === 'open') lines.push('   ____________________________________________');
    lines.push('');
  });
  lines.push('Thank you for your time.');
  return lines.join('\n').trim();
}

export function questionnaireCsvRows(s: QuestionnaireState): Array<Array<string | number>> {
  return [
    ['Number', 'Type', 'Data', 'Question', 'Options or scale', 'Required', 'Flags'],
    ...s.questions.map((q, i) => [
      i + 1,
      QTYPE_LABELS[q.type].label,
      QTYPE_LABELS[q.type].data,
      q.text,
      hasOptions(q.type) ? q.options.join(' | ') : q.type === 'scale' ? `1 = ${q.low}; 5 = ${q.high}` : '',
      q.required ? 'Yes' : 'No',
      questionChecks(q, i + 1)
        .filter((c) => c.level !== 'fit')
        .map((c) => c.text)
        .join(' '),
    ]),
  ];
}

export function normalizeQuestionnaire(raw: unknown, f: QuestionnaireState): QuestionnaireState | null {
  const o = asObj(raw);
  if (!o) return null;
  const questions = uniqueIds(
    asList(o.questions, (x, i) => {
      const q = asObj(x);
      if (!q) return null;
      return {
        id: safeId(q.id, `q${i + 1}`),
        type: asOneOf(q.type, QUESTION_TYPES, 'single'),
        text: asStr(q.text, '', 400),
        options: asLines(q.options, 12, 120),
        low: asStr(q.low, '', 40),
        high: asStr(q.high, '', 40),
        required: asBool(q.required, true),
      };
    }, 25),
    'q',
  );
  const quotas = uniqueIds(
    asList(o.quotas, (x, i) => {
      const q = asObj(x);
      if (!q) return null;
      return { id: safeId(q.id, `g${i + 1}`), group: asStr(q.group, '', 60), share: asNum(q.share, 0, 0, 100) };
    }, 8),
    'g',
  );
  return {
    business: asStr(o.business, f.business, 80),
    title: asStr(o.title, f.title, 120),
    objective: asStr(o.objective, '', 400),
    population: asStr(o.population, '', 200),
    populationSize: asInt(o.populationSize, 0, 0, 1e9),
    method: asOneOf(o.method, ['random', 'quota', 'convenience'] as const, f.method),
    sampleSize: asInt(o.sampleSize, f.sampleSize, 0, 1e7),
    quotas,
    intro: asStr(o.intro, '', 600),
    questions,
  };
}

export function blankQuestion(id: string): Question {
  return { id, type: 'single', text: '', options: [], low: '', high: '', required: true };
}
