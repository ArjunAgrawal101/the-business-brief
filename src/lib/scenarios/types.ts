/**
 * The shape of a generated business scenario. A family (src/lib/scenarios/
 * families/) is a template: from a seed it makes one variant, with its own
 * business, place, size and figures. Every scenario is fictional and every
 * exhibit simulated; the six steps follow the way an IB answer is built:
 * problem, evidence, tool, analysis, recommendation, evaluation.
 */

export type Unit = 1 | 2 | 3 | 4 | 5;
export type Level = 'SL/HL' | 'HL';

/** How well a choice fits: the best answer, a defensible one, or one that does not fit. */
export type Verdict = 'best' | 'fair' | 'weak';

export interface Choice {
  id: string;
  text: string;
  verdict: Verdict;
  /** Why it fits or does not: never only right or wrong. */
  why: string;
}

export interface Question {
  prompt: string;
  choices: Choice[];
}

export interface Exhibit {
  id: string;
  title: string;
  /** A table (columns and rows of cells) or a short text, such as an email or a note. */
  columns?: string[];
  rows?: string[][];
  body?: string;
  note?: string;
  /** Whether it is evidence for the problem, or a distractor. */
  relevant: boolean;
  /** Why it matters, or why it does not. */
  why: string;
}

export interface Slip {
  value: number;
  why: string;
}

export interface Calc {
  /** What to calculate, in one sentence. */
  prompt: string;
  answer: number;
  /** Decimal places the answer is written to. */
  dp: number;
  /** An answer within this distance of the exact one counts as right. */
  tolerance: number;
  prefix: string;
  suffix: string;
  /** Lines of working, in order. */
  working: string[];
  /** Typical wrong answers and the slip behind each. */
  slips: Slip[];
  /** What the answer means for the decision. */
  meaning: string;
}

export interface SortTask {
  prompt: string;
  categories: Array<{ id: string; label: string }>;
  items: Array<{ id: string; text: string; answer: string; why: string }>;
}

export interface Analysis {
  /** The structured prompt: what to work out, in order. */
  steps: string[];
  calc?: Calc;
  sort?: SortTask;
  /** The model analysis, point by point. */
  model: string[];
}

export interface ToolChoice extends Choice {
  /** The toolkit tool's id in src/content/tools. */
  tool: string;
}

export interface Scenario {
  code: string;
  family: string;
  seed: number;
  unit: Unit;
  subtopics: string[];
  /** The toolkit tool that fits best. */
  tool: string;
  level: Level;
  quantitative: boolean;
  title: string;
  business: string;
  industry: string;
  place: string;
  size: string;
  /** The reader's role. */
  role: string;
  brief: string[];
  /** The decision the scenario asks for. */
  question: string;
  problem: Question;
  evidence: { prompt: string; exhibits: Exhibit[] };
  toolStep: { prompt: string; choices: ToolChoice[] };
  analysis: Analysis;
  recommend: Question & { justify: string; criteria: string[] };
  evaluate: { stakeholders: Question; risk: Question; change: Question };
  /** The model answer outline, one line per step. */
  model: { problem: string; evidence: string; tool: string; analysis: string; recommendation: string; evaluation: string };
}

/** What a family's template returns for one seed; the engine adds the identity and the order of the choices. */
export type Made = Omit<Scenario, 'code' | 'family' | 'seed' | 'unit' | 'subtopics' | 'tool' | 'level' | 'quantitative' | 'toolStep'> & {
  /** The toolkit tools offered, the best first, each with why it fits or not. */
  tools: Array<{ tool: string; verdict: Verdict; why: string }>;
  toolPrompt?: string;
};

export interface Family {
  id: string;
  unit: Unit;
  subtopics: string[];
  tool: string;
  level: Level;
  /** The catalogue's title for the family, such as "Which way to grow?". */
  title: string;
  summary: string;
  industries: string[];
  quantitative: boolean;
  make: (r: import('../random').Rng) => Made;
}

export const UNITS: Record<Unit, string> = {
  1: 'Introduction to business management',
  2: 'Human resource management',
  3: 'Finance and accounts',
  4: 'Marketing',
  5: 'Operations management',
};

export const STEP_IDS = ['problem', 'evidence', 'tool', 'analysis', 'recommend', 'evaluate'] as const;
export type StepId = (typeof STEP_IDS)[number];

export const STEP_TITLES: Record<StepId, string> = {
  problem: 'Identify the problem',
  evidence: 'Select the evidence',
  tool: 'Choose a tool',
  analysis: 'Analyse',
  recommend: 'Recommend',
  evaluate: 'Evaluate the consequences',
};
