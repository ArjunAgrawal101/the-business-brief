/**
 * The site's information architecture: five groups, each a door into one kind
 * of work. Explore holds the course and the ideas behind it; Practise, the
 * cases, decisions and simulations; Tools, the laboratories for your own
 * figures; Assess, every component of the IB assessment; Discover, what lies
 * beyond the course and the people and resources behind the platform. The
 * header's mega menu, the mobile menu, the footer and search all read this
 * list, so a destination is added in one place.
 *
 * A link is listed only when the page exists and works: there are no
 * placeholders here. When a new room or library is built, it is added to its
 * group in the same change.
 */
export interface NavLink {
  label: string;
  href: string;
  /** One line on what the reader will find. */
  text: string;
  /** Marked in the menu when the destination is HL only. */
  hl?: boolean;
}

export interface NavGroup {
  id: 'explore' | 'practise' | 'tools' | 'assess' | 'discover';
  label: string;
  /** A sentence that frames the group in its panel. */
  intro: string;
  links: NavLink[];
}

export const NAV: NavGroup[] = [
  {
    id: 'explore',
    label: 'Explore',
    intro: 'The IB course and the ideas behind it: every subtopic, term, framework and structure, explained and drawn.',
    links: [
      { label: 'Topic library', href: '/topics/', text: 'All 37 subtopics of the IB course, unit by unit, with full notes, examples and practice' },
      { label: 'Course map', href: '/ib/map/', text: 'The IB syllabus unit by unit, with SL and HL marked' },
      { label: 'Key concepts', href: '/ib/concepts/', text: 'Change, creativity, ethics and sustainability across the course' },
      { label: 'Glossary', href: '/glossary/', text: 'Every term in plain language, with its syllabus meaning' },
      { label: 'Mindmaps', href: '/mindmaps/', text: 'Every subtopic and unit as a map to fold, zoom and print' },
      { label: 'Diagrams', href: '/diagrams/', text: 'Original diagrams for every unit, each with a text description' },
      { label: 'Frameworks', href: '/frameworks/', text: 'Business frameworks by purpose, including every tool in the IB toolkit, each with a diagram, method and exercise' },
      { label: 'Revision briefs', href: '/revision/', text: 'A topic on a page: the essentials for the last weeks before the exam' },
      { label: 'Resources Library', href: '/resources/', text: 'Guides, maps, diagrams, sheets and cases, with real downloads' },
    ],
  },
  {
    id: 'practise',
    label: 'Practise',
    intro: 'Work real problems: diagnose a business, make the call, and see what your decision does to everyone it touches.',
    links: [
      { label: 'Case Vault', href: '/case-vault/', text: 'Cases by industry and topic, with a Case of the Week' },
      { label: 'Case Room', href: '/case-room/', text: 'Diagnose a business stage by stage, against the evidence' },
      { label: 'Decision Room', href: '/decision-room/', text: 'Commit to a decision, then live with its consequences' },
      { label: 'Boardroom', href: '/boardroom/', text: 'Multi-round board simulations: take a seat and follow each decision through' },
      { label: 'Business strategy simulation', href: '/boardroom/executive/', text: 'Run a company in decline for three years: prices, marketing, people, capacity, exports and finance' },
      { label: 'Boardroom Briefings', href: '/boardroom-briefings/', text: 'Ten editorial cases on the decisions boards face, each in a Student and an Analysis edition' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    intro: 'Business laboratories: enter your own figures and ideas, change the assumptions, and see the outcome with the working shown.',
    links: [
      { label: 'Finance Desk', href: '/finance-desk/', text: 'Costs, break-even, cash flow, ratios and investment appraisal' },
      { label: 'Financial Laboratory', href: '/finance-desk/lab/', text: 'Twenty calculators for your own figures, each with the working and what it means' },
      { label: 'Strategy Studio', href: '/strategy-studio/', text: 'SWOT, STEEPLE, five forces, Ansoff, BCG, decision trees, scenarios and a recommendation memo' },
      { label: 'Framework Application Lab', href: '/frameworks/lab/', text: 'Choose a framework by the decision you face, and apply it' },
      { label: 'Market Studio', href: '/market-studio/', text: 'STP, personas, positioning, the marketing mix, life cycles, campaigns and budgets' },
      { label: 'People and Culture', href: '/people-and-culture/', text: 'Motivation, leadership scenarios, organization charts, workforce and change planning' },
      { label: 'Operations Floor', href: '/operations-floor/', text: 'Production methods, location, capacity, stock control and order quantities' },
      { label: 'Entrepreneurship Lab', href: '/entrepreneurship-lab/', text: 'From an idea to a tested business model: canvas, unit economics, runway and a plan' },
      { label: 'Advanced financial analysis', href: '/finance-desk/advanced/', text: 'Beyond the IB course: a linked three-statement forecast, capital budgeting, break-even scenarios and a performance dashboard' },
    ],
  },
  {
    id: 'assess',
    label: 'Assess',
    intro: 'Prepare for every component of the IB assessment, with the requirements kept apart from advice and examples.',
    links: [
      { label: 'Assessment Centre', href: '/assessment/', text: 'Every component, explained from the IB guide' },
      { label: 'IA Studio', href: '/assessment/internal-assessment/', text: 'The business research project, from question to submission' },
      { label: 'Paper 1', href: '/assessment/paper-1/', text: 'The case study paper: from the pre-released statement to answers built on the case' },
      { label: 'Paper 2', href: '/assessment/paper-2/', text: 'Quantitative questions: calculations, constructions and their interpretation' },
      { label: 'Calculation practice', href: '/assessment/paper-2/practice/', text: 'Paper 2 practice with fresh fictional figures each time, checked, with the working and the slip behind each wrong answer' },
      { label: 'Paper 3', href: '/assessment/paper-3/', text: 'The social enterprise paper: needs, challenges and a strategic plan', hl: true },
      { label: 'Question bank', href: '/assessment/question-bank/', text: 'Every original practice question, filtered by topic, paper, level and command term, with timed sets' },
      { label: 'Examiner Lens', href: '/examiner-lens/', text: 'The command terms and what each one asks of you' },
    ],
  },
  {
    id: 'discover',
    label: 'Discover',
    intro: 'Beyond the course, and the people and resources behind the platform: real business news read through the course, management at greater depth, and the educator.',
    links: [
      { label: 'Business Intelligence', href: '/intelligence/', text: 'Real business developments read through the course, every fact dated and sourced' },
      { label: 'MBA and Advanced Management', href: '/advanced/', text: 'Strategy, finance, leadership, marketing, operations and entrepreneurship at business school depth' },
      { label: 'Enrichment maps', href: '/mindmaps/#enrichment', text: 'Nine maps of management beyond the IB course, labelled enrichment' },
      { label: 'Learning pathways', href: '/pathways/', text: 'Routes for IB students, teachers, university and MBA students, and founders' },
      { label: 'Lesson library', href: '/pathways/teachers/#lessons', text: 'Timed lesson sequences for teachers, subtopic by subtopic' },
      { label: 'Tutorials', href: '/tutorials/', text: 'One-to-one online IB Business Management tutoring with Arjun Agrawal' },
      { label: 'About Arjun Agrawal', href: '/about/', text: 'The educator, his teaching and the story of the platform' },
      { label: 'My Business Workspace', href: '/dashboard/', text: 'Your progress, saved work and notes, kept on this device' },
      { label: 'Sources and evidence', href: '/sources/', text: 'Where every claim comes from, and how sure we are' },
    ],
  },
];

const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);

/**
 * The group and link a page belongs to: the link whose address is the
 * longest prefix of the page's path. `exact` is true when the page is the
 * link's own page.
 */
export function navPosition(path: string): { group?: NavGroup['id']; href?: string; exact: boolean } {
  const p = norm(path);
  let best: { group: NavGroup['id']; href: string } | undefined;
  for (const g of NAV) {
    for (const l of g.links) {
      const h = norm(l.href);
      if (p.startsWith(h) && (!best || h.length > best.href.length)) best = { group: g.id, href: l.href };
    }
  }
  return best ? { ...best, exact: norm(best.href) === p } : { exact: false };
}

/** The group a page belongs to, by the longest matching link; undefined outside every group. */
export function navGroupOf(path: string): NavGroup | undefined {
  const id = navPosition(path).group;
  return id ? NAV.find((g) => g.id === id) : undefined;
}
