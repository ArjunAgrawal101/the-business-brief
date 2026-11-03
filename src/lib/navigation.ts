/**
 * The site's information architecture: five groups, each a door into one
 * kind of work. The header's mega menu, the mobile menu and the footer all
 * read this list, so a destination is added in one place.
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
    intro: 'The course and the ideas behind it: every subtopic, every term, every structure, drawn and explained.',
    links: [
      { label: 'The Business Brief', href: '/topics/', text: 'The topic library: all 37 subtopics, with notes, briefs and practice' },
      { label: 'Course map', href: '/ib/map/', text: 'The IB syllabus unit by unit, with SL and HL marked' },
      { label: 'Key concepts', href: '/ib/concepts/', text: 'Change, creativity, ethics and sustainability across the course' },
      { label: 'Glossary', href: '/glossary/', text: 'Every term in plain language, with its syllabus meaning' },
      { label: 'Mindmaps', href: '/mindmaps/', text: 'Every subtopic and unit as a map to fold, zoom and print' },
      { label: 'Diagrams', href: '/diagrams/', text: 'Original diagrams for every unit, each with a text description' },
      { label: 'Toolkit', href: '/toolkit/', text: 'The business management toolkit, tool by tool' },
      { label: 'Revision briefs', href: '/revision/', text: 'Each complete topic on a page, for the last week' },
    ],
  },
  {
    id: 'practise',
    label: 'Practise',
    intro: 'Work real problems: diagnose a business, make the call, and see what your decision does to everyone it touches.',
    links: [
      { label: 'Case Room', href: '/case-room/', text: 'Diagnose a business stage by stage, against the evidence' },
      { label: 'Case studies', href: '/cases/', text: 'Fictional businesses with complete, consistent exhibits' },
      { label: 'Decision Room', href: '/decision-room/', text: 'Commit to a decision, then live with its consequences' },
      { label: 'Boardroom', href: '/boardroom/', text: 'Multi-round simulations: take a seat on the board and follow each decision through' },
      { label: 'Practice questions', href: '/exam-desk/practice/', text: 'Original questions in the style of the papers, with guidance' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    intro: 'Business laboratories: enter your own figures and ideas, change the assumptions, and see the outcome with the working shown.',
    links: [
      { label: 'Finance Desk', href: '/finance-desk/', text: 'Costs, break-even, cash flow, ratios and investment appraisal' },
      { label: 'Strategy Studio', href: '/strategy-studio/', text: 'SWOT, STEEPLE, five forces, Ansoff, BCG, decision trees and a recommendation memo' },
      { label: 'Market Studio', href: '/market-studio/', text: 'Market share, positioning and the marketing mix' },
      { label: 'People and Culture', href: '/people-and-culture/', text: 'Leadership, motivation, structure and culture' },
      { label: 'Operations Floor', href: '/operations-floor/', text: 'Location, capacity, productivity and stock control' },
    ],
  },
  {
    id: 'assess',
    label: 'Assess',
    intro: 'Prepare for every component of the IB assessment, with the requirements kept apart from strategy and examples.',
    links: [
      { label: 'Assessment Centre', href: '/assessment/', text: 'Every component, explained from the guide' },
      { label: 'IA Studio', href: '/assessment/internal-assessment/', text: 'The business research project, from question to submission' },
      { label: 'Paper 1', href: '/assessment/paper-1/', text: 'The pre-released case: analysis and answer building' },
      { label: 'Paper 2', href: '/assessment/paper-2/', text: 'Quantitative questions: calculations and constructions' },
      { label: 'Paper 3', href: '/assessment/paper-3/', text: 'The social enterprise strategic plan', hl: true },
      { label: 'Examiner Lens', href: '/examiner-lens/', text: 'The command terms and what each one asks of you' },
    ],
  },
  {
    id: 'discover',
    label: 'Discover',
    intro: 'Resources to learn and teach with, routes through the platform for every learner, and the educator behind it.',
    links: [
      { label: 'Resources Library', href: '/resources/', text: 'Guides, notes, maps, cases and sheets, with real downloads' },
      { label: 'Learning pathways', href: '/pathways/', text: 'Routes for IB students, teachers, universities and founders' },
      { label: 'About Arjun Agrawal', href: '/about/', text: 'The educator, his teaching and the story of the platform' },
      { label: 'Your progress', href: '/progress/', text: 'What you have done here, kept on this device' },
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
