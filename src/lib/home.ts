/**
 * Content for the home page that is not a collection of its own: the weekly
 * features, the learning objectives and the record of additions.
 *
 * Every figure in a challenge is computed here by the platform's tested
 * finance functions, so the answer printed on the page is the answer the
 * functions give. The weekly features rotate in the reader's browser by ISO
 * week (src/scripts/home.ts); without the script, the build week's feature
 * shows and says so.
 */
import { breakEvenRevenue, breakEvenUnits, marginOfSafety, profit, targetProfitOutput } from './finance';
import { fmtPayback, payback } from './investment';
import { fmtNumber } from './format';

/** ISO 8601 week number (weeks start on Monday; week 1 holds the year's first Thursday). */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/* ---------------- Management insights: the platform's own teaching ---------------- */

export interface Insight {
  title: string;
  text: string;
  code: string;
  href: string;
}

export const INSIGHTS: Insight[] = [
  {
    title: 'A ratio is a question, not an answer',
    text: 'A falling profit margin tells you that something changed, never why. The why is in the business: its prices, its costs, its competitors. Every ratio needs a comparison and a cause before it means anything.',
    code: '3.5',
    href: '/topics/profitability-and-liquidity-ratio-analysis/',
  },
  {
    title: 'Cash, not profit, decides who survives the winter',
    text: 'A profitable business can still run out of money when its customers pay late and its suppliers want paying now. The cash flow forecast is where that danger shows first, months before the accounts do.',
    code: '3.7',
    href: '/topics/cash-flow/',
  },
  {
    title: 'Structure follows strategy, and lags behind it',
    text: 'When a business changes what it is trying to do, its organization chart is usually the last thing to catch up. Many problems that look like people problems are structure problems underneath.',
    code: '2.2',
    href: '/topics/organizational-structure/',
  },
  {
    title: 'Motivation theories are lenses, not prescriptions',
    text: 'Each theory describes part of what moves people at work. The skill is choosing the lens that fits this workforce, this job and this moment, and saying what it leaves out.',
    code: '2.4',
    href: '/topics/motivation-and-demotivation/',
  },
  {
    title: 'Break-even is a planning tool, not a forecast',
    text: 'It assumes one price, constant costs per unit and that everything made is sold. Its value lies in the questions it lets you ask: what if the price falls, what if costs rise, how far can sales drop before we lose money?',
    code: '5.5',
    href: '/topics/break-even-analysis/',
  },
  {
    title: 'The marketing mix only works as a mix',
    text: 'A premium price with bargain-bin distribution confuses the customer. Product, price, promotion and place, and for services people, process and physical evidence, have to tell one story to one segment.',
    code: '4.5',
    href: '/topics/the-seven-ps-of-the-marketing-mix/',
  },
  {
    title: 'Stakeholders rarely agree, and that is the point',
    text: 'Almost every significant decision trades one group’s interests against another’s. A strong answer names the trade-off and says whose interests should weigh most, and why.',
    code: '1.4',
    href: '/topics/stakeholders/',
  },
];

/* ---------------- Financial analysis challenges: fictional figures, computed answers ---------------- */

export interface Challenge {
  title: string;
  question: string;
  answer: string;
  working: string[];
  href: string;
  linkLabel: string;
}

const money = (n: number) => `$${fmtNumber(n, 0)}`;
const units = (n: number) => `${fmtNumber(n, 0)} units`;

function breakEvenChallenge(): Challenge {
  const [price, vc, fc] = [40, 25, 90000];
  const beq = breakEvenUnits(fc, price, vc)!;
  return {
    title: 'Where does the loss stop?',
    question: `A workshop sells stools at ${money(price)} each. Each costs ${money(vc)} in materials and labour, and its fixed costs are ${money(fc)} a year. How many stools must it sell to break even?`,
    answer: units(beq),
    working: [`Contribution per unit = ${money(price)} − ${money(vc)} = ${money(price - vc)}`, `Break-even quantity = ${money(fc)} ÷ ${money(price - vc)} = ${units(beq)}`],
    href: '/topics/break-even-analysis/',
    linkLabel: 'Break-even analysis (5.5)',
  };
}

function safetyChallenge(): Challenge {
  const [price, vc, fc, output] = [40, 25, 90000, 8000];
  const mos = marginOfSafety(output, fc, price, vc)!;
  const p = profit(price, vc, fc, output);
  return {
    title: 'How far can sales fall?',
    question: `The same workshop (price ${money(price)}, variable cost ${money(vc)}, fixed costs ${money(fc)}) expects to sell ${fmtNumber(output, 0)} stools. What is its margin of safety, and what profit does it expect?`,
    answer: `${units(mos)}; profit of ${money(p)}`,
    working: [
      `Break-even quantity = ${money(fc)} ÷ ${money(price - vc)} = ${units(breakEvenUnits(fc, price, vc)!)}`,
      `Margin of safety = ${fmtNumber(output, 0)} − ${fmtNumber(breakEvenUnits(fc, price, vc)!, 0)} = ${units(mos)}`,
      `Profit = ${money(price - vc)} × ${fmtNumber(output, 0)} − ${money(fc)} = ${money(p)}`,
    ],
    href: '/topics/break-even-analysis/',
    linkLabel: 'Break-even analysis (5.5)',
  };
}

function targetChallenge(): Challenge {
  const [price, vc, fc, target] = [40, 25, 90000, 30000];
  const q = targetProfitOutput(fc, target, price, vc)!;
  const ber = breakEvenRevenue(fc, price, vc)!;
  return {
    title: 'What does the target take?',
    question: `The workshop's owners want a profit of ${money(target)} next year. At ${money(price)} a stool, a variable cost of ${money(vc)} and fixed costs of ${money(fc)}, how many must they sell? And what is break-even revenue?`,
    answer: `${units(q)}; break-even revenue ${money(ber)}`,
    working: [
      `Target output = (${money(fc)} + ${money(target)}) ÷ ${money(price - vc)} = ${units(q)}`,
      `Break-even revenue = ${units(breakEvenUnits(fc, price, vc)!)} × ${money(price)} = ${money(ber)}`,
    ],
    href: '/topics/break-even-analysis/',
    linkLabel: 'Break-even analysis (5.5)',
  };
}

function paybackChallenge(): Challenge {
  const project = { id: 'oven', label: 'A new oven', capitalCost: 100000, returns: [30000, 40000, 50000, 50000] };
  const pb = payback(project);
  return {
    title: 'When is the oven paid for?',
    question: `A bakery buys an oven for ${money(project.capitalCost)}. It expects net cash flows of ${project.returns.map(money).join(', ')} in its first four years. What is the payback period?`,
    answer: fmtPayback(pb),
    working: [
      `After year 2: −${money(project.capitalCost)} + ${money(30000)} + ${money(40000)} = −${money(30000)}`,
      `Year 3 brings ${money(50000)}: ${money(30000)} ÷ ${money(50000)} × 12 = ${fmtNumber(pb!.months, 1)} months into year 3`,
    ],
    href: '/topics/investment-appraisal/',
    linkLabel: 'Investment appraisal (3.8)',
  };
}

export const CHALLENGES: Challenge[] = [breakEvenChallenge(), paybackChallenge(), safetyChallenge(), targetChallenge()];

/* ---------------- Featured frameworks: toolkit guides with their diagram ---------------- */

export const FRAMEWORKS: Array<{ tool: string; diagram: string; note: string }> = [
  { tool: 'ansoff-matrix', diagram: 'ansoff-matrix', note: 'Four routes to growth and the risk that rises with each step away from what a business knows.' },
  { tool: 'bcg-matrix', diagram: 'bcg-matrix', note: 'A portfolio read by market growth and relative share: which products to feed, which to milk, which to drop.' },
  { tool: 'decision-trees', diagram: 'decision-tree', note: 'Expected values for options under uncertainty, and how much the choice depends on one estimate.' },
  { tool: 'force-field-analysis', diagram: 'force-field', note: 'The forces for and against a change, weighed, so that you know which one to weaken first.' },
  { tool: 'porters-generic-strategies', diagram: 'porters-generic-strategies', note: 'Compete on cost or on difference, broadly or in a niche, and avoid being stuck in the middle.' },
];

/* ---------------- Learning objectives: what the reader wants to do ---------------- */

export interface Objective {
  verb: string;
  text: string;
  links: Array<{ label: string; href: string }>;
}

export const OBJECTIVES: Objective[] = [
  {
    verb: 'Understand concepts',
    text: 'Learn the ideas of the course from full notes, mindmaps and a glossary that separates everyday and syllabus meanings.',
    links: [
      { label: 'Topic library', href: '/topics/' },
      { label: 'Glossary', href: '/glossary/' },
      { label: 'Mindmaps', href: '/mindmaps/' },
    ],
  },
  {
    verb: 'Analyse businesses',
    text: 'Read exhibits, find the evidence that matters and test a diagnosis against it.',
    links: [
      { label: 'Case Vault', href: '/case-vault/' },
      { label: 'Case Room', href: '/case-room/' },
      { label: 'SWOT analysis', href: '/toolkit/swot-analysis/' },
    ],
  },
  {
    verb: 'Develop strategies',
    text: 'Generate options, weigh them against each other and defend the one you choose.',
    links: [
      { label: 'Strategy Studio', href: '/strategy-studio/' },
      { label: 'Decision Room', href: '/decision-room/' },
      { label: 'Ansoff matrix', href: '/toolkit/ansoff-matrix/' },
    ],
  },
  {
    verb: 'Interpret financial information',
    text: 'Work the numbers with the formula shown, then say what they mean for the business.',
    links: [
      { label: 'Finance Desk', href: '/finance-desk/' },
      { label: 'Formula sheet', href: '/resources/formula-sheet/' },
      { label: 'Ratio analysis (3.5)', href: '/topics/profitability-and-liquidity-ratio-analysis/' },
    ],
  },
  {
    verb: 'Solve business problems',
    text: 'Move from the symptom to the cause, then to a plan you could carry out.',
    links: [
      { label: 'Case lab', href: '/case-room/halden-diagnosis/' },
      { label: 'Operations Floor', href: '/operations-floor/' },
      { label: 'Decision trees', href: '/toolkit/decision-trees/' },
    ],
  },
  {
    verb: 'Prepare for examinations',
    text: 'Know what each component asks, practise in its style, and check your answers against guidance.',
    links: [
      { label: 'Assessment Centre', href: '/assessment/' },
      { label: 'Practice questions', href: '/exam-desk/practice/' },
      { label: 'Command terms', href: '/examiner-lens/' },
    ],
  },
  {
    verb: 'Apply management tools',
    text: 'Use the business management toolkit on a real decision, with each tool’s limits stated.',
    links: [
      { label: 'The toolkit', href: '/toolkit/' },
      { label: 'Market Studio', href: '/market-studio/' },
      { label: 'Force field analysis', href: '/toolkit/force-field-analysis/' },
    ],
  },
];

/* ---------------- What is new: a dated record of additions ---------------- */

export interface Addition {
  date: string;
  kind: string;
  title: string;
  text: string;
  href: string;
}

/**
 * Additions to the platform, newest first. Only what has shipped is listed;
 * new notes are added to this list automatically from their `updated` dates.
 */
export const ADDITIONS: Addition[] = [
  { date: '2026-11-03', kind: 'Platform', title: 'Your dashboard, saved items and a smarter search', text: 'What you have read, practised and saved, kept on this device only; search across every kind of content with filters.', href: '/dashboard/' },
  { date: '2026-11-03', kind: 'Pathways', title: 'Seven distinct learning pathways', text: 'Separate routes, depths and assessment styles for IB, secondary, university, MBA, teachers, founders and independent learners, with nine enrichment maps.', href: '/pathways/' },
  { date: '2026-11-03', kind: 'Laboratory', title: 'The Financial Laboratory', text: 'Twenty calculators for your own figures, from break-even to NPV, each with the formula, the working and what it means.', href: '/finance-desk/lab/' },
  { date: '2026-11-03', kind: 'Room', title: 'The Market Studio', text: 'Nine marketing tools on one fictional café, from market metrics and research to the mix, the life cycle and the budget.', href: '/market-studio/' },
  { date: '2026-11-03', kind: 'Briefing', title: 'The Business Intelligence Briefing', text: 'Real developments read through the course, every fact tied to a dated source, the analysis labelled as the platform’s own.', href: '/intelligence/' },
  { date: '2026-11-03', kind: 'Cases', title: 'The Case Vault and six new cases', text: 'Retail, automobile, FMCG, healthcare, technology and a social enterprise, filtered by industry, function and topic, with a Case of the Week.', href: '/case-vault/' },
  { date: '2026-11-03', kind: 'Room', title: 'The Entrepreneurship and Innovation Lab', text: 'Six briefings and six tools for founders, from validating an idea to a business plan, worked on one fictional start-up.', href: '/entrepreneurship-lab/' },
  { date: '2026-11-03', kind: 'Simulation', title: 'The Boardroom', text: 'Three multi-round simulations: take a seat on the board of a fictional company and follow each decision through every function.', href: '/boardroom/' },
  { date: '2026-11-03', kind: 'Room', title: 'The Strategy Studio', text: 'Ten analysis tools on one consulting engagement, from SWOT to a recommendation memo.', href: '/strategy-studio/' },
  { date: '2026-11-03', kind: 'Platform', title: 'A new way round the platform', text: 'Five doors, Explore, Practise, Tools, Assess and Discover, each with a panel of its own.', href: '/rooms/' },
  { date: '2026-11-03', kind: 'Platform', title: 'Rooms with their own identity', text: 'Each learning environment now has its own accent and drawing.', href: '/people-and-culture/' },
  { date: '2026-11-02', kind: 'Library', title: 'The diagram library', text: 'Original diagrams for every unit and the toolkit, each with a text description and an SVG download.', href: '/diagrams/' },
  { date: '2026-11-02', kind: 'Library', title: 'Mindmaps for the whole course', text: 'Every subtopic and unit as a map to fold, zoom, print and download.', href: '/mindmaps/' },
  { date: '2026-11-02', kind: 'Assessment', title: 'The Assessment Centre', text: 'The internal assessment and the three papers, with workspaces and the creator’s guides.', href: '/assessment/' },
  { date: '2026-11-02', kind: 'Library', title: 'The Resources Library', text: 'Guides, notes, maps, cases and sheets, with downloads only where a real file exists.', href: '/resources/' },
];
