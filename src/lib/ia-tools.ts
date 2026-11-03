/**
 * The internal assessment tools: pure functions behind the key concept guide,
 * the supporting document checklist and source evaluation, the business tool
 * selection assistant, the research timeline and the progress tracker. They
 * check a student's own plans against the guide (first assessment 2024) and
 * the creator's IA guide, and give feedback. None of them writes any part of
 * a project, awards a mark, predicts a grade or approves a question: the
 * teacher approves the question and marks the work (guide, pp. 51 to 53).
 *
 * Every rule says where it comes from: "Guide, p. N" for a requirement in the
 * IB guide, "TSM, p. N" for the IB teacher support material, and none for the
 * platform's own recommendation.
 */
import { IA_LIMITS, ageInMonths, checkDocuments as guideDocumentChecks, earliestAllowed, monthIndex, monthLabel, type DocKind, type Finding } from './ia';

export type Standing = 'ib' | 'examiner' | 'strategy';
export type Status = 'ok' | 'advice' | 'problem';

export interface Check {
  status: Status;
  text: string;
  standing: Standing;
  source?: string;
}

/* ------------------------------------------------------------------ */
/* 1. The key concept                                                  */
/* ------------------------------------------------------------------ */

export const CONCEPTS = ['change', 'creativity', 'ethics', 'sustainability'] as const;
export type ConceptId = (typeof CONCEPTS)[number];

export const CONCEPT_NAMES: Record<ConceptId, string> = { change: 'Change', creativity: 'Creativity', ethics: 'Ethics', sustainability: 'Sustainability' };

/** Signs in the issue itself that point to a concept. The mapping is the platform's reading of the guide's descriptions (p. 13). */
export const ISSUE_SIGNS: Array<{ id: string; text: string; concepts: ConceptId[] }> = [
  { id: 'move', text: 'The organization is deciding whether to move from one way of working to another: to expand, restructure, relocate, merge or automate', concepts: ['change'] },
  { id: 'respond', text: 'It is responding to a shift outside it: a new competitor, a new law, changing customer tastes, new technology', concepts: ['change'] },
  { id: 'new', text: 'It has launched, or is weighing, a new product, service, process or idea, or an old one used in a new way', concepts: ['creativity'] },
  { id: 'value', text: 'The question is whether an idea or innovation has created value, or would', concepts: ['creativity'] },
  { id: 'right', text: 'The question is whether a decision is right, fair or honest, and who bears its cost', concepts: ['ethics'] },
  { id: 'people', text: 'It concerns how workers, suppliers, customers or communities are treated', concepts: ['ethics', 'sustainability'] },
  { id: 'planet', text: 'It concerns waste, energy, materials or other effects on the environment', concepts: ['sustainability'] },
  { id: 'long', text: 'It weighs long-term survival against short-term profit: people, planet and profit together', concepts: ['sustainability'] },
];

/** How strongly the reader's description of the issue points to each concept, strongest first. Ties keep the guide's order. */
export function conceptFit(signs: readonly string[]): Array<{ concept: ConceptId; score: number }> {
  const score: Record<ConceptId, number> = { change: 0, creativity: 0, ethics: 0, sustainability: 0 };
  for (const s of ISSUE_SIGNS) if (signs.includes(s.id)) s.concepts.forEach((k) => (score[k] += 1));
  return CONCEPTS.map((concept) => ({ concept, score: score[concept] })).sort((a, b) => b.score - a.score || CONCEPTS.indexOf(a.concept) - CONCEPTS.indexOf(b.concept));
}

/** What each concept asks of one organization, and how to carry it through the project: the platform's prompts. */
export const LENS: Record<ConceptId, { asks: string; prompts: string[] }> = {
  change: {
    asks: 'What does the issue change for this organization, its people and its stakeholders, and is the change worth making now?',
    prompts: [
      'Introduction: say what is changing, or would change, and why the change matters to this organization.',
      'Analysis: use each tool to show what the change does to costs, revenue, people or risk, with figures from the documents.',
      'Evaluation: weigh what the change gains against what it disrupts, and when.',
      'Conclusion: answer the question in terms of the change: make it, delay it, or make a different one.',
    ],
  },
  creativity: {
    asks: 'Has a new idea, or an old idea used in a new way, created value for this organization, or would it?',
    prompts: [
      'Introduction: name the idea and what was new about it for this organization.',
      'Analysis: measure the value it created or would create, in sales, costs, customers or reputation, from the documents.',
      'Evaluation: ask whether the value came from the idea itself or from something else, and whether it will last.',
      'Conclusion: answer in terms of the idea’s value: worth keeping, extending, changing or dropping.',
    ],
  },
  ethics: {
    asks: 'Is the decision right as well as profitable, and who bears its cost?',
    prompts: [
      'Introduction: state the moral question inside the business decision.',
      'Analysis: show who gains and who bears the cost, with evidence from more than one voice in the documents.',
      'Evaluation: weigh the financial case against the moral one, and the views of different stakeholders.',
      'Conclusion: answer the question with a judgement that covers both what pays and what is right.',
    ],
  },
  sustainability: {
    asks: 'Does the decision meet present needs without compromising the future: people, planet and profit together?',
    prompts: [
      'Introduction: say which part of the triple bottom line is at stake for this organization.',
      'Analysis: measure the effect on people, planet and profit, with figures from the documents where they exist.',
      'Evaluation: weigh short-term cost against long-term effect, and say where the evidence is thin.',
      'Conclusion: answer in terms of all three: what the decision does for people, planet and profit.',
    ],
  },
};

export type QuestionForm = 'forward' | 'backward' | 'extent' | 'unclear';

/** Whether a research question looks forward (a decision to make) or back (a decision already taken). */
export function questionForm(rq: string): QuestionForm {
  const s = rq.trim().toLowerCase();
  if (/^to what extent\b/.test(s)) return 'extent';
  if (/^(should|would|could|can|how (can|should|could|might)|what (should|would|could)|which|is it (worth|advisable))\b/.test(s)) return 'forward';
  if (/^(how (effectively|successfully|well|far|much)|why (did|has|have|was|were)|what (impact|effect|effects) (has|have|did)|has|have|did|was|were|to what degree (has|have|did))\b/.test(s)) return 'backward';
  return 'unclear';
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Checks of the form of a research question: never of its quality, which the
 * teacher judges. `org` is the organization's name as the reader wrote it.
 */
export function checkQuestion(rq: string, org: string, concept: ConceptId | ''): Check[] {
  const out: Check[] = [];
  const q = rq.trim();
  if (!q) return [{ status: 'advice', text: 'Write your research question to see checks of its form.', standing: 'strategy' }];
  out.push(
    q.endsWith('?')
      ? { status: 'ok', text: 'It is written as a question.', standing: 'ib', source: 'Guide, p. 53' }
      : { status: 'advice', text: 'It does not end with a question mark. The guide asks for a title in the form of a research question.', standing: 'ib', source: 'Guide, p. 53' },
  );
  const form = questionForm(q);
  if (form === 'forward') out.push({ status: 'ok', text: 'It looks forward: a decision still to be made. The guide allows a forward- or backward-looking question.', standing: 'ib', source: 'Guide, p. 53' });
  else if (form === 'backward') out.push({ status: 'ok', text: 'It looks backward: a decision already taken. The guide allows a forward- or backward-looking question.', standing: 'ib', source: 'Guide, p. 53' });
  else if (form === 'extent')
    out.push({
      status: 'advice',
      text: '"To what extent" is allowed, but it needs a precise judgement in the conclusion; the assessment guides report that a vague "to some extent" cannot reach the top of criterion E.',
      standing: 'examiner',
    });
  else out.push({ status: 'advice', text: 'It is not clear whether it looks forward or backward. Questions that start "Should..." or "How effectively has..." make the decision behind them plain.', standing: 'strategy' });
  const name = org.trim();
  if (!name) out.push({ status: 'advice', text: 'Add the organization’s name above to check that the question is about one organization.', standing: 'ib', source: 'Guide, p. 53' });
  else if (q.toLowerCase().includes(name.toLowerCase())) out.push({ status: 'ok', text: `It names ${name}: the project must refer directly to a single organization.`, standing: 'ib', source: 'Guide, p. 53' });
  else out.push({ status: 'advice', text: `It does not name ${name}. The project must refer directly to a single organization; naming it in the question keeps the focus there.`, standing: 'ib', source: 'Guide, p. 53' });
  const n = words(q);
  if (n > 25) out.push({ status: 'advice', text: `${n} words. A long question is hard to answer explicitly in 1,800 words: try to keep it to one decision.`, standing: 'strategy' });
  if (/\band\b/i.test(q.replace(/\b(change|creativity|ethics|sustainability)\b/gi, '')) && n > 12)
    out.push({ status: 'advice', text: 'It may ask about two things. If it does, the conclusion must answer both.', standing: 'examiner' });
  const named = CONCEPTS.filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(q));
  if (concept && named.length && !named.includes(concept))
    out.push({ status: 'problem', text: `It mentions ${named.join(' and ')}, but your lens is ${concept}. The project must use only one of the four key concepts.`, standing: 'ib', source: 'Guide, p. 53' });
  else if (named.length > 1) out.push({ status: 'problem', text: `It mentions ${named.join(' and ')}. The project must use only one of the four key concepts as its lens.`, standing: 'ib', source: 'Guide, p. 53' });
  if (concept)
    out.push({ status: 'ok', text: `The concept may or may not appear in the question, but ${concept} must be stated on the title page.`, standing: 'ib', source: 'Guide, p. 53' });
  return out;
}

/** The six tests in the creator's IA guide, for the reader to tick before the teacher approves the question. */
export const QUESTION_TESTS = [
  { id: 'focused', name: 'Focused', text: 'One decision, one place, one organization' },
  { id: 'real', name: 'Real', text: 'A live issue, not a hypothetical one' },
  { id: 'one', name: 'One organization', text: 'Named, and central to every section' },
  { id: 'researchable', name: 'Researchable', text: 'Three to five recent documents can answer it' },
  { id: 'aligned', name: 'Concept-aligned', text: 'The lens fits the issue, not added to it' },
  { id: 'answerable', name: 'Answerable', text: 'An explicit answer is possible within 1,800 words' },
] as const;

/* ------------------------------------------------------------------ */
/* 2. Supporting documents and source evaluation                       */
/* ------------------------------------------------------------------ */

export const VOICES = {
  organization: 'The organization itself',
  independent: 'Independent: a government, journalist or researcher',
  commercial: 'Commercial: a supplier, agent or rival',
  'own-research': 'My own primary research',
  sceptic: 'A sceptical or opposing view',
} as const;
export type Voice = keyof typeof VOICES;

export const PURPOSES = {
  inform: 'To inform or explain',
  report: 'To report results or record facts',
  persuade: 'To persuade or promote',
  sell: 'To sell something',
  research: 'To answer my research question (my own research)',
} as const;
export type Purpose = keyof typeof PURPOSES;

export interface DocEntry {
  title: string;
  /** Who produced it: the author or the publisher. */
  origin: string;
  kind: DocKind;
  voice: Voice | '';
  /** Publication month, YYYY-MM. */
  published: string;
  purpose: Purpose | '';
  /** Reliability signs the reader can see in the document. */
  named: boolean;
  method: boolean;
  sourced: boolean;
  /** Which part of the research question it helps answer, in the reader's words. */
  relevance: string;
  /** What data in it a tool could use. */
  data: string;
  pages: number;
  selected: boolean;
}

export const blankEntry = (): DocEntry => ({ title: '', origin: '', kind: 'secondary', voice: '', published: '', purpose: '', named: false, method: false, sourced: false, relevance: '', data: '', pages: 0, selected: true });

export interface Note {
  status: 'ok' | 'check' | 'missing';
  /** One or two words for the table: "Stated", "Check", "Missing". */
  word: string;
  text: string;
}

export interface Evaluation {
  origin: Note;
  purpose: Note;
  date: Note;
  reliability: Note;
  relevance: Note;
}

/**
 * Origin, purpose, date, reliability and relevance for one document. The
 * three-year rule is the guide's (p. 54); the rest is the platform's way of
 * questioning a source, and says so.
 */
export function evaluateSource(d: DocEntry, submission: string): Evaluation {
  const origin: Note = !d.origin.trim()
    ? { status: 'missing', word: 'Missing', text: 'Name who produced it. A source without a known author or publisher is hard to weigh, and the bibliography needs it.' }
    : d.voice === 'organization'
      ? { status: 'check', word: 'Inside view', text: `From ${d.origin.trim()}, the organization itself: good for its plans and figures, but it presents itself well. Set it beside an independent document.` }
      : d.voice === 'own-research'
        ? { status: 'ok', word: 'Your research', text: 'Your own primary research: attach the blank questionnaire and a tally, or the interview questions and a summary of the answers (guide, p. 54).' }
        : d.voice
          ? { status: 'ok', word: 'Stated', text: `From ${d.origin.trim()}: ${VOICES[d.voice].toLowerCase()}.` }
          : { status: 'check', word: 'Voice?', text: `From ${d.origin.trim()}. Say whose voice it is, so you can see whether the set is balanced.` };

  const purpose: Note = !d.purpose
    ? { status: 'missing', word: 'Missing', text: 'Say why it was produced. Purpose shapes what a document includes and leaves out.' }
    : d.purpose === 'persuade' || d.purpose === 'sell'
      ? { status: 'check', word: 'One-sided', text: 'Written to persuade or to sell: treat its claims as one side’s case, check its figures against another document, and say so in your evaluation.' }
      : d.purpose === 'research'
        ? { status: 'ok', word: 'Your purpose', text: 'Designed for your question, so it fits it closely; say how many took part and how they were chosen, because criterion D rewards weighing that.' }
        : { status: 'ok', word: 'Stated', text: `${PURPOSES[d.purpose]}: usually more even-handed, though it may still leave things out.` };

  const age = ageInMonths(d.published, submission);
  const earliest = earliestAllowed(submission);
  const date: Note = !d.published.trim()
    ? { status: 'missing', word: 'Missing', text: 'Add the month it was published: the guide requires documents published within three years before submission (p. 54).' }
    : monthIndex(d.published) === null
      ? { status: 'check', word: 'Check', text: 'Write the month as year and month, for example 2026-03.' }
      : !submission.trim() || monthIndex(submission) === null
        ? { status: 'check', word: 'Check', text: `Published ${monthLabel(d.published)}. Add your submission month above to check the three-year rule.` }
        : age !== null && age < 0
          ? { status: 'check', word: 'Check', text: 'Published after your submission month: check both dates.' }
          : age !== null && age > IA_LIMITS.maxYears * 12
            ? { status: 'missing', word: 'Too old', text: `Published ${monthLabel(d.published)}, more than three years before submission${earliest ? `: the earliest allowed is ${monthLabel(earliest)}` : ''}. It cannot be a supporting document (guide, p. 54).` }
            : { status: 'ok', word: 'Within 3 years', text: `Published ${monthLabel(d.published)}, within the three years before submission (guide, p. 54).` };

  const signs = [d.named, d.method, d.sourced].filter(Boolean).length;
  const missingSigns = [
    !d.named ? 'who wrote it' : '',
    !d.method ? 'how its figures or findings were gathered' : '',
    !d.sourced ? 'where its data come from' : '',
  ].filter(Boolean);
  const reliability: Note =
    d.kind === 'textbook'
      ? { status: 'missing', word: 'Not allowed', text: 'Textbooks and class notes must be referenced, but are not accepted as supporting documents (guide, p. 55).' }
      : signs === 3
        ? { status: 'ok', word: 'Strong signs', text: 'Its author, its method and its data sources are all stated: you can weigh it with confidence, and say why in your evaluation.' }
        : { status: 'check', word: signs ? 'Some signs' : 'Few signs', text: `It does not show ${missingSigns.join(', ')}. That does not rule it out, but weigh it with care and say so.` };

  const relevance: Note = !d.relevance.trim()
    ? { status: 'missing', word: 'Missing', text: 'Say which part of your research question it helps answer. A document about the topic but not the question earns little in criterion B.' }
    : !d.data.trim()
      ? { status: 'check', word: 'No data', text: 'Relevant, but with no data a tool could use. Criterion D rewards data from the documents used in analysis: pair it with a data-rich document.' }
      : { status: 'ok', word: 'Relevant, with data', text: `It speaks to your question (${d.relevance.trim()}) and has data a tool can use: ${d.data.trim()}.` };

  return { origin, purpose, date, reliability, relevance };
}

/** The checks on the whole set: the guide's rules (src/lib/ia.ts) and the balance of voices. */
export function checkSet(docs: DocEntry[], submission: string): Check[] {
  const findings: Finding[] = guideDocumentChecks(
    docs.map((d) => ({ title: d.title, publisher: d.origin, published: d.published, kind: d.kind, pages: d.pages, selected: d.selected })),
    submission,
  );
  const out: Check[] = findings.map((f) => ({ status: f.severity, text: f.text, standing: f.source.startsWith('TSM') ? 'examiner' : 'ib', source: f.source }));
  const chosen = docs.filter((d) => d.selected);
  const voices = new Set(chosen.map((d) => d.voice).filter(Boolean));
  if (chosen.length >= 2) {
    if (voices.size <= 1 && chosen.every((d) => d.voice))
      out.push({ status: 'advice', text: 'Every selected document has the same voice. The guide strongly recommends a range of ideas and views; the top level of criterion B asks for it (pp. 54 and 57).', standing: 'ib', source: 'Guide, pp. 54 and 57' });
    else if (voices.size >= 3) out.push({ status: 'ok', text: `${voices.size} different voices among the selected documents: a range of ideas and views.`, standing: 'strategy' });
    if (!chosen.some((d) => d.voice === 'sceptic' || d.voice === 'independent'))
      out.push({ status: 'advice', text: 'No independent or sceptical voice yet. A document that could prove you wrong makes the evaluation in criterion D stronger.', standing: 'strategy' });
    const dataRich = chosen.filter((d) => d.data.trim()).length;
    if (dataRich < Math.min(2, chosen.length)) out.push({ status: 'advice', text: 'Fewer than two selected documents have data a tool can use. Criterion C and D need figures to work on.', standing: 'strategy' });
  }
  return out;
}

const csv = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The evaluation table as CSV, one row per document. */
export function documentsCsv(docs: DocEntry[], submission: string): string {
  const head = ['Label', 'Title', 'Origin', 'Voice', 'Published', 'Purpose', 'Date', 'Reliability', 'Relevance', 'Selected'];
  const rows = docs.map((d, i) => {
    const e = evaluateSource(d, submission);
    return [`SD${i + 1}`, d.title, d.origin, d.voice ? VOICES[d.voice] : '', d.published, d.purpose ? PURPOSES[d.purpose] : '', `${e.date.word}: ${e.date.text}`, `${e.reliability.word}: ${e.reliability.text}`, `${e.relevance.word}: ${e.relevance.text}`, d.selected ? 'Yes' : 'No'];
  });
  return [head, ...rows].map((r) => r.map(csv).join(',')).join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/* 3. Choosing business management tools                               */
/* ------------------------------------------------------------------ */

export const QUESTION_KINDS = {
  invest: 'Whether to invest, expand or launch something',
  finance: 'How healthy its finances are, or how to improve them',
  growth: 'Which direction to grow in, or how to grow',
  people: 'Whether a change will work with its people',
  compete: 'How it competes, positions or markets itself',
  operations: 'How it produces, where, and how efficiently',
  impact: 'The ethical or environmental impact of what it does',
} as const;
export type QuestionKind = keyof typeof QUESTION_KINDS;

export const DATA_KINDS = {
  costs: 'Costs and prices of a product or service',
  accounts: 'Published accounts: profit or loss, financial position',
  cash: 'Cash flow figures, forecasts or budgets',
  project: 'The cost of a project and the returns expected from it',
  market: 'Market sizes, shares or growth rates',
  survey: 'Survey or interview results',
  staff: 'Staff figures: turnover, absence, a staff survey',
  views: 'Views and opinions: articles, statements, comments',
  options: 'Options with chances and outcomes',
  capacity: 'Output, capacity or stock figures',
  trend: 'Figures over several periods',
} as const;
export type DataKind = keyof typeof DATA_KINDS;

export interface ToolRule {
  /** A toolkit tool's id in src/content/tools, or a syllabus technique with its subtopic. */
  id: string;
  name: string;
  kind: 'toolkit' | 'syllabus';
  /** The subtopic a syllabus technique belongs to. */
  code?: string;
  level: 'SL/HL' | 'HL';
  fits: QuestionKind[];
  /** The questions it is built to answer, ranked above questions it only supports. */
  primary?: QuestionKind[];
  /** The data it works on: any one of these is enough to apply it. */
  needs: DataKind[];
  /** What it can decide in a project, in a line. */
  decides: string;
  caution?: string;
}

/**
 * The tools a business research project most often draws on: the guide's
 * toolkit (p. 14, with its HL-only tools) and the syllabus techniques with
 * their own levels. Which tool fits which question is the platform's
 * recommendation, not a list from the guide: any relevant tool may be used.
 */
export const TOOL_RULES: ToolRule[] = [
  { id: 'swot-analysis', name: 'SWOT analysis', kind: 'toolkit', level: 'SL/HL', fits: ['growth', 'compete', 'invest'], needs: ['views', 'market', 'accounts'], decides: 'Where the organization stands before a decision', caution: 'On its own it rarely answers a question: use it to organize evidence, then apply a tool that decides.' },
  { id: 'steeple-analysis', name: 'STEEPLE analysis', kind: 'toolkit', level: 'SL/HL', fits: ['growth', 'impact', 'compete'], needs: ['views', 'market', 'trend'], decides: 'Which outside forces matter most to the decision', caution: 'List only the factors your documents show, and say which one matters most.' },
  { id: 'ansoff-matrix', name: 'Ansoff matrix', kind: 'toolkit', level: 'SL/HL', fits: ['growth', 'invest'], primary: ['growth'], needs: ['market', 'views'], decides: 'How far an option takes it from what it knows, and the risk that brings' },
  { id: 'bcg-matrix', name: 'BCG matrix', kind: 'toolkit', level: 'SL/HL', fits: ['growth', 'compete', 'invest'], needs: ['market', 'trend'], decides: 'Where to invest across a range of products', caution: 'It needs market share and market growth for each product.' },
  { id: 'decision-trees', name: 'Decision trees', kind: 'toolkit', level: 'SL/HL', fits: ['invest', 'growth', 'operations'], primary: ['invest'], needs: ['options', 'project'], decides: 'Which option has the higher expected value, and how much risk it carries', caution: 'The probabilities must come from the documents, not be invented.' },
  { id: 'descriptive-statistics', name: 'Descriptive statistics', kind: 'toolkit', level: 'SL/HL', fits: ['compete', 'people', 'operations', 'impact', 'finance'], needs: ['survey', 'staff', 'trend', 'market'], decides: 'What the survey or the figures actually show: averages, spread, the pattern' },
  { id: 'circular-business-models', name: 'Circular business models', kind: 'toolkit', level: 'SL/HL', fits: ['impact', 'operations', 'growth'], primary: ['impact'], needs: ['views', 'capacity', 'costs'], decides: 'How the organization could reuse, recover or share resources, and whether it pays' },
  { id: 'business-plan', name: 'Business plan', kind: 'toolkit', level: 'SL/HL', fits: ['invest', 'growth'], needs: ['costs', 'market', 'cash'], decides: 'Whether a new venture holds together: market, operations and finance' },
  { id: 'force-field-analysis', name: 'Force field analysis', kind: 'toolkit', level: 'HL', fits: ['people', 'operations', 'growth'], primary: ['people'], needs: ['views', 'staff', 'survey'], decides: 'The forces for and against a change, and which to strengthen or weaken' },
  { id: 'hofstedes-cultural-dimensions', name: "Hofstede's cultural dimensions", kind: 'toolkit', level: 'HL', fits: ['people', 'growth', 'compete'], needs: ['views', 'staff'], decides: 'Whether a way of working or marketing will fit another culture' },
  { id: 'porters-generic-strategies', name: "Porter's generic strategies", kind: 'toolkit', level: 'HL', fits: ['compete', 'growth'], primary: ['compete'], needs: ['market', 'costs', 'views'], decides: 'Whether it competes on cost or on difference, and whether its choices support that' },
  { id: 'contribution', name: 'Contribution (make or buy, contribution costing)', kind: 'toolkit', level: 'HL', fits: ['operations', 'invest', 'finance'], primary: ['operations'], needs: ['costs'], decides: 'Whether to make or buy, or to keep a product, on what it contributes' },
  { id: 'gantt-chart', name: 'Gantt chart', kind: 'toolkit', level: 'HL', fits: ['operations', 'invest'], needs: ['capacity', 'project'], decides: 'Whether a project can be done on time with the resources it has' },
  { id: 'critical-path-analysis', name: 'Critical path analysis', kind: 'toolkit', level: 'HL', fits: ['operations', 'invest'], needs: ['capacity', 'project'], decides: 'Which activities set the finish date, and where there is float' },
  { id: 'simple-linear-regression', name: 'Simple linear regression', kind: 'toolkit', level: 'HL', fits: ['compete', 'finance', 'operations'], needs: ['trend', 'market'], decides: 'Whether two things move together, and what the trend suggests next', caution: 'A line through a few points is weak evidence: say how many periods it rests on.' },
  { id: 'break-even', name: 'Break-even analysis', kind: 'syllabus', code: '5.5', level: 'SL/HL', fits: ['invest', 'operations', 'finance', 'compete'], primary: ['invest'], needs: ['costs'], decides: 'How many sales a plan needs to cover its costs, and the margin of safety' },
  { id: 'ratios', name: 'Profitability and liquidity ratios', kind: 'syllabus', code: '3.5', level: 'SL/HL', fits: ['finance', 'invest', 'growth'], primary: ['finance'], needs: ['accounts'], decides: 'How profitable and how liquid it is, and how that has changed' },
  { id: 'efficiency-ratios', name: 'Efficiency ratios and gearing', kind: 'syllabus', code: '3.6', level: 'HL', fits: ['finance', 'operations'], primary: ['finance'], needs: ['accounts'], decides: 'How well it manages stock, debtors and creditors, and how much it borrows' },
  { id: 'cash-flow-forecast', name: 'Cash flow forecast', kind: 'syllabus', code: '3.7', level: 'SL/HL', fits: ['finance', 'invest'], primary: ['finance'], needs: ['cash'], decides: 'Whether it can pay its bills month by month, and when it would need an overdraft' },
  { id: 'investment-appraisal', name: 'Investment appraisal: payback and ARR (NPV at HL)', kind: 'syllabus', code: '3.8', level: 'SL/HL', fits: ['invest', 'growth', 'operations'], primary: ['invest'], needs: ['project'], decides: 'Whether an investment pays back, how quickly, and what it returns' },
  { id: 'budgets', name: 'Budgets and variances', kind: 'syllabus', code: '3.9', level: 'HL', fits: ['finance', 'operations'], primary: ['finance'], needs: ['cash', 'accounts', 'costs'], decides: 'Where spending or income differs from plan, and why' },
  { id: 'market-share', name: 'Market share and market growth', kind: 'syllabus', code: '4.1', level: 'SL/HL', fits: ['compete', 'growth'], primary: ['compete'], needs: ['market', 'trend'], decides: 'How big a part of its market it holds, and whether that market is growing' },
  { id: 'position-map', name: 'Position map', kind: 'syllabus', code: '4.2', level: 'SL/HL', fits: ['compete'], primary: ['compete'], needs: ['survey', 'market', 'views'], decides: 'Where it stands against rivals in customers’ eyes, and where there is a gap' },
  { id: 'marketing-mix', name: 'The seven Ps of the marketing mix', kind: 'syllabus', code: '4.5', level: 'SL/HL', fits: ['compete', 'growth'], primary: ['compete'], needs: ['survey', 'costs', 'market', 'views'], decides: 'Whether its mix supports its position, and which P to change' },
  { id: 'motivation', name: 'Motivation theories (Taylor, Maslow, Herzberg)', kind: 'syllabus', code: '2.4', level: 'SL/HL', fits: ['people'], primary: ['people'], needs: ['staff', 'survey', 'views'], decides: 'Why staff behave as they do, and what would change it' },
  { id: 'leadership', name: 'Leadership styles', kind: 'syllabus', code: '2.3', level: 'SL/HL', fits: ['people'], primary: ['people'], needs: ['staff', 'views', 'survey'], decides: 'Whether the way it is led suits the change it faces' },
  { id: 'labour-turnover', name: 'Labour turnover', kind: 'syllabus', code: '2.4', level: 'HL', fits: ['people', 'operations'], needs: ['staff'], decides: 'How many staff leave, and what that costs' },
  { id: 'capacity', name: 'Capacity utilization and productivity', kind: 'syllabus', code: '5.6', level: 'HL', fits: ['operations', 'invest'], primary: ['operations'], needs: ['capacity'], decides: 'How fully and how efficiently it uses what it has' },
  { id: 'location', name: 'Location factors', kind: 'syllabus', code: '5.4', level: 'SL/HL', fits: ['operations', 'growth'], primary: ['operations'], needs: ['costs', 'views', 'market'], decides: 'Which site best serves its costs, customers and staff' },
];

export interface Suggestion {
  rule: ToolRule;
  score: number;
  fits: boolean;
  /** The tool is built for this kind of question. */
  primary: boolean;
  /** The data the reader has that this tool can use. */
  has: DataKind[];
  reason: string;
}

/**
 * Tools that fit the question and the data, best first. A tool scores 3 when
 * it is built for the kind of question, 2 when it supports it, and 1 for each
 * kind of data it can use that the reader has; ties go to the tool built for
 * the question. A tool with no data to work on is never suggested, because
 * criterion C rewards tools applied to the organization's own figures.
 * HL-only tools are left out at SL.
 */
export function recommendTools(kind: QuestionKind | '', data: readonly DataKind[], level: 'SL' | 'HL'): { suggested: Suggestion[]; hlOnly: Suggestion[] } {
  const all = TOOL_RULES.map((rule) => {
    const fits = kind !== '' && rule.fits.includes(kind);
    const primary = kind !== '' && (rule.primary ?? []).includes(kind);
    const has = rule.needs.filter((n) => data.includes(n));
    const score = (primary ? 3 : fits ? 2 : 0) + has.length;
    const reason = [
      fits && kind ? `It suits a question about ${QUESTION_KINDS[kind].charAt(0).toLowerCase()}${QUESTION_KINDS[kind].slice(1)}.` : '',
      has.length ? `Your documents have ${has.map((h) => DATA_KINDS[h].charAt(0).toLowerCase() + DATA_KINDS[h].slice(1)).join('; ')}, which it can work on.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return { rule, score, fits, primary, has, reason };
  }).filter((s) => s.has.length > 0 && (s.fits || s.has.length >= 2));
  all.sort((a, b) => b.score - a.score || Number(b.primary) - Number(a.primary) || TOOL_RULES.indexOf(a.rule) - TOOL_RULES.indexOf(b.rule));
  return { suggested: all.filter((s) => level === 'HL' || s.rule.level !== 'HL'), hlOnly: level === 'SL' ? all.filter((s) => s.rule.level === 'HL') : [] };
}

/* ------------------------------------------------------------------ */
/* 4. The research timeline                                            */
/* ------------------------------------------------------------------ */

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  /** The date, YYYY-MM-DD. */
  date: string;
  standing: Standing;
  source?: string;
}

/** Milestones in the order of the TSM's ten steps (pp. 69 to 72), with the guide's requirements where they apply. */
export const STAGES: Array<{ id: string; title: string; detail: string; share: number; standing: Standing; source?: string }> = [
  { id: 'requirements', title: 'Read the requirements and the criteria', detail: 'With your teacher, from the guide. Note where projects most often lose marks.', share: 0.04, standing: 'strategy', source: 'TSM, p. 69' },
  { id: 'question', title: 'Choose the organization, the issue and a draft question', detail: 'One real organization and a live issue. Refine the question and the documents together.', share: 0.14, standing: 'strategy', source: 'TSM, pp. 69 to 70' },
  { id: 'approved', title: 'Question approved by your teacher', detail: 'The teacher approves the question before work starts.', share: 0.18, standing: 'ib', source: 'Guide, p. 53' },
  { id: 'concept', title: 'Key concept chosen and an initial proposal written', detail: 'One of the four concepts as your lens; a short proposal for your teacher to comment on.', share: 0.24, standing: 'strategy', source: 'TSM, pp. 70 to 71' },
  { id: 'candidates', title: 'More than five candidate documents found', detail: 'Primary and secondary, within three years of submission, from more than one voice.', share: 0.36, standing: 'strategy', source: 'TSM, p. 71' },
  { id: 'selected', title: 'Three to five supporting documents selected', detail: 'Relevant, in depth, a range of views; highlighted and labelled SD1 to SD5.', share: 0.42, standing: 'ib', source: 'Guide, pp. 53 to 55' },
  { id: 'analysis', title: 'Tools applied and findings analysed', detail: 'Each tool applied to the documents’ own figures, through your concept.', share: 0.64, standing: 'strategy' },
  { id: 'draft', title: 'First draft to your teacher', detail: 'Your best draft: the teacher reads and advises on one draft, but does not edit it.', share: 0.78, standing: 'ib', source: 'Guide, p. 51' },
  { id: 'revised', title: 'Draft revised after the teacher’s comments', detail: 'Act on the advice; check every figure is traced to its document.', share: 0.92, standing: 'strategy', source: 'TSM, p. 71' },
  { id: 'review', title: 'Penultimate draft checked against the criteria', detail: 'At least two weeks before the deadline: mark it strictly against each criterion and note what one more mark would need.', share: -14, standing: 'strategy', source: 'TSM, p. 72' },
  { id: 'final', title: 'Final version to your teacher', detail: 'By your school’s internal deadline. Once submitted, the final version cannot be retracted.', share: 0, standing: 'ib', source: 'Guide, p. 51' },
];

const DAY = 86_400_000;
export function parseDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return d.getUTCMonth() === Number(m[2]) - 1 ? t : null;
}
export const dayString = (t: number) => new Date(t).toISOString().slice(0, 10);
export const longDay = (s: string) => {
  const t = parseDay(s);
  return t === null ? s : new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

export interface Timeline {
  milestones: Milestone[];
  days: number;
  warnings: string[];
}

/**
 * Milestones back from the internal deadline. The last fortnight is kept for
 * the penultimate-draft review and final revisions (TSM, p. 72); the time
 * before it is shared out in the TSM's order, in proportions the platform
 * recommends. Returns a reason instead when the dates cannot make a plan.
 */
export function planTimeline(start: string, deadline: string): Timeline | { error: string } {
  const s = parseDay(start);
  const d = parseDay(deadline);
  if (s === null) return { error: 'Enter the date you start, as a full date.' };
  if (d === null) return { error: 'Enter your school’s internal deadline, as a full date.' };
  const days = Math.round((d - s) / DAY);
  if (days < 7) return { error: days < 0 ? 'The deadline is before the start date.' : 'There is less than a week until the deadline: there is no room for a plan. Talk to your teacher.' };
  const warnings: string[] = [];
  const review = days >= 42 ? 14 : Math.max(2, Math.round(days / 3));
  if (review < 14) warnings.push('There is less than six weeks until the deadline, so the plan cannot keep the two weeks the TSM suggests between the penultimate-draft review and the deadline. Talk to your teacher about what to do first.');
  if (days > 365 * 2) warnings.push('The deadline is more than two years away. Check the date: the project is done during the course, alongside the teaching.');
  const span = days - review;
  const milestones: Milestone[] = STAGES.map((st) => {
    const t = st.id === 'final' ? d : st.id === 'review' ? d - review * DAY : s + Math.max(1, Math.round(st.share * span)) * DAY;
    return { id: st.id, title: st.title, detail: st.detail, date: dayString(t), standing: st.standing, source: st.source };
  });
  return { milestones, days, warnings };
}

/** The IB submission month the guide names: April or October of the final year (p. 54). */
export function submissionNote(session: 'may' | 'november' | '', year: number | null): string {
  if (!session || !year) return 'Submission to the IB is in April or October of the final year, depending on your examination session (guide, p. 54). Your school’s deadline comes first.';
  return `For the ${session === 'may' ? 'May' : 'November'} ${year} session, your school submits to the IB in ${session === 'may' ? `April ${year}` : `October ${year}`} (guide, p. 54), after your school’s own deadline.`;
}

/** An iCalendar file with each milestone as an all-day event. `stamp` is the time of export, as YYYYMMDDTHHMMSSZ. */
export function timelineIcs(ms: Milestone[], stamp: string): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const compact = (day: string) => day.replace(/-/g, '');
  const next = (day: string) => compact(dayString((parseDay(day) ?? 0) + DAY));
  const fold = (line: string) => {
    const out: string[] = [];
    let rest = line;
    while (rest.length > 74) {
      out.push(rest.slice(0, 74));
      rest = ` ${rest.slice(74)}`;
    }
    out.push(rest);
    return out.join('\r\n');
  };
  const events = ms.flatMap((m) => [
    'BEGIN:VEVENT',
    `UID:ia-${m.id}-${compact(m.date)}@the-business-brief`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(m.date)}`,
    `DTEND;VALUE=DATE:${next(m.date)}`,
    fold(`SUMMARY:${esc(`IA: ${m.title}`)}`),
    fold(`DESCRIPTION:${esc(`${m.detail}${m.source ? ` (${m.source})` : ''}`)}`),
    'END:VEVENT',
  ]);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Business Brief//IA timeline//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

export function timelineCsv(ms: Milestone[]): string {
  return [['Date', 'Milestone', 'What it involves', 'Standing', 'Source'], ...ms.map((m) => [m.date, m.title, m.detail, m.standing === 'ib' ? 'IB requirement' : 'Recommended', m.source ?? ''])]
    .map((r) => r.map(csv).join(','))
    .join('\n')
    .concat('\n');
}

/* ------------------------------------------------------------------ */
/* 5. Progress                                                         */
/* ------------------------------------------------------------------ */

export const STAGE_STATUS = { 'not-started': 'Not started', 'in-progress': 'In progress', done: 'Done' } as const;
export type StageStatus = keyof typeof STAGE_STATUS;

export interface ProgressState {
  v: 1;
  stages: Record<string, { status: StageStatus; note: string; done: string }>;
  /** The count of the words that count, as the reader last entered it. */
  words: number | null;
  checks: string[];
}

export const emptyProgress = (): ProgressState => ({ v: 1, stages: {}, words: null, checks: [] });

export function parseProgress(raw: unknown): ProgressState {
  const out = emptyProgress();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { stages?: unknown; words?: unknown; checks?: unknown };
  if (r.stages && typeof r.stages === 'object') {
    for (const [id, v] of Object.entries(r.stages as Record<string, unknown>)) {
      if (!STAGES.some((s) => s.id === id) || !v || typeof v !== 'object') continue;
      const x = v as { status?: unknown; note?: unknown; done?: unknown };
      const status = x.status === 'in-progress' || x.status === 'done' ? x.status : 'not-started';
      out.stages[id] = { status, note: typeof x.note === 'string' ? x.note.slice(0, 2000) : '', done: typeof x.done === 'string' && parseDay(x.done) !== null ? x.done : '' };
    }
  }
  if (typeof r.words === 'number' && Number.isFinite(r.words) && r.words >= 0) out.words = Math.floor(r.words);
  if (Array.isArray(r.checks)) out.checks = r.checks.filter((c): c is string => typeof c === 'string').slice(0, 100);
  return out;
}

export function setStage(state: ProgressState, id: string, status: StageStatus, today: string): ProgressState {
  const prev = state.stages[id] ?? { status: 'not-started' as StageStatus, note: '', done: '' };
  return { ...state, stages: { ...state.stages, [id]: { ...prev, status, done: status === 'done' ? prev.done || today : '' } } };
}

export interface ProgressSummary {
  done: number;
  total: number;
  /** The first stage, in order, that is not done. */
  next: (typeof STAGES)[number] | null;
  /** Days from today to the deadline, when a plan has one. */
  daysLeft: number | null;
  /** Milestones in the plan whose dates have passed but which are not done. */
  overdue: string[];
}

export function progressSummary(state: ProgressState, today: string, plan?: Timeline | null): ProgressSummary {
  const done = STAGES.filter((s) => state.stages[s.id]?.status === 'done').length;
  const next = STAGES.find((s) => state.stages[s.id]?.status !== 'done') ?? null;
  const t = parseDay(today);
  const final = plan?.milestones.find((m) => m.id === 'final');
  const daysLeft = final && t !== null ? Math.round(((parseDay(final.date) ?? t) - t) / DAY) : null;
  const overdue = plan && t !== null ? plan.milestones.filter((m) => (parseDay(m.date) ?? Infinity) < t && state.stages[m.id]?.status !== 'done').map((m) => m.title) : [];
  return { done, total: STAGES.length, next, daysLeft, overdue };
}

/* ------------------------------------------------------------------ */
/* The tools themselves                                                */
/* ------------------------------------------------------------------ */

export const IA_TOOL_PAGES = [
  { id: 'key-concept', href: '/assessment/internal-assessment/key-concept/', name: 'Key concept guide', line: 'Which of the four concepts fits your issue as a lens, and checks of your question’s form' },
  { id: 'documents', href: '/assessment/internal-assessment/documents/', name: 'Supporting documents', line: 'The guide’s rules for the set, and each document’s origin, purpose, date, reliability and relevance' },
  { id: 'tool-selection', href: '/assessment/internal-assessment/tool-selection/', name: 'Tool selection', line: 'The toolkit and syllabus tools that fit your question and the data in your documents' },
  { id: 'timeline', href: '/assessment/internal-assessment/timeline/', name: 'Research timeline', line: 'Milestones counted back from your deadline, to print or add to your calendar' },
  { id: 'progress', href: '/assessment/internal-assessment/progress/', name: 'Progress tracker', line: 'Each stage, the words that count and the checks before you submit' },
] as const;
export type IaToolId = (typeof IA_TOOL_PAGES)[number]['id'];
