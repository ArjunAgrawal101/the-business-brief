/**
 * Business Management tutorials: the commercial offering, in one place.
 *
 * The terms mirror the tutoring offer on Arjun Agrawal's Economics platform,
 * whose live Tutorials page is the reference for the offering (read in a
 * browser at https://ib-economics-pi.vercel.app/#/tutorials on 16 November
 * 2026): a regular session of one hour for US$20, and four packages with
 * their session counts. The owner also confirmed that group discounts are
 * available; no group price is stated because none has been given. Nothing
 * else about price, length or conditions may appear on the site: the tests
 * in tests/unit/tutorials.test.ts read every page that mentions tutoring.
 *
 * Enquiries go by email (and WhatsApp, as on the Economics page). There is no
 * booking system, payment or deposit, and nothing is collected by this site.
 */

export const TUTOR = {
  name: 'Arjun Agrawal',
  email: 'arjun1agr@gmail.com',
  whatsapp: { display: '+91 7092844945', href: 'https://wa.me/917092844945' },
  linkedin: { display: 'Arjun Agrawal on LinkedIn', href: 'https://www.linkedin.com/in/arjun-agrawal-560405310/' },
  instagram: { display: '@imarjun101', href: 'https://instagram.com/imarjun101' },
} as const;

/** The subject line of every enquiry email, as the owner asked. */
export const ENQUIRY_SUBJECT = 'IB DP Business Management Tutorials Enquiry';

/** The single session that everything starts from. */
export const SESSION = { price: 20, currency: 'US$', length: '1 hour', minutes: 60, format: 'one-to-one, online' } as const;

export const GROUP_DISCOUNT =
  'Group discounts are available: email with the number of students and their level, and Arjun will confirm the arrangement.';

export interface Pathway {
  key: 'regular' | 'ia' | 'ee' | 'marathon' | 'exam';
  name: string;
  price: number;
  unit: string;
  sessions: string;
  /** Empty when the length is agreed at enquiry. */
  length: string;
  tag: string;
  what: string;
  who: string;
  does: string[];
  expect: string;
  cta: string;
}

export const PATHWAYS: Pathway[] = [
  {
    key: 'regular',
    name: 'Regular sessions',
    price: 20,
    unit: 'per session',
    sessions: '1 session',
    length: '1 hour',
    tag: 'Start here',
    what: 'Personalised Business Management sessions focused on the topic, concept, tool or paper where you need support.',
    who: 'Any student who wants help with a specific topic, a calculation, a business management tool, a paper or a piece of work.',
    does: ['Any topic of your choice, SL or HL', 'Concepts and theories rebuilt until you can explain them unaided', 'Tools and calculations worked through on a real business situation', 'Questions answered together, then improved'],
    expect: 'We start from your own work or question, and you leave with one clear next step.',
    cta: 'Book your first session',
  },
  {
    key: 'ia',
    name: 'IA support',
    price: 100,
    unit: 'for the package',
    sessions: '6 sessions',
    length: '1 hour each',
    tag: 'Internal assessment',
    what: 'Structured guidance through your business research project, from the research question to the final self-review.',
    who: 'Students working on the IB Business Management internal assessment.',
    does: ['The research question and the choice of organization', 'The key concept and the supporting documents', 'Business management tools, analysis and evaluation', 'Criterion-based self-review and feedback on drafts'],
    expect: 'Guidance on your work at each stage. The project remains entirely your own: I do not write any part of it.',
    cta: 'Ask about IA support',
  },
  {
    key: 'ee',
    name: 'Business Management EE supervisor support',
    price: 150,
    unit: 'for the support',
    sessions: 'Agreed at enquiry',
    length: '',
    tag: 'Extended essay',
    what: 'Structured academic supervision and guidance for a Business Management extended essay.',
    who: 'Students writing, or about to start, a Business Management extended essay.',
    does: ['Topic and research question development', 'The business theory and tools that will carry the essay', 'Research direction, sources and structure', 'Feedback on analysis, evaluation and drafts'],
    expect: 'Academic supervision and guidance, not ghostwriting. The schedule of meetings is agreed when you enquire.',
    cta: 'Ask about EE supervisor support',
  },
  {
    key: 'marathon',
    name: 'Marathon Revision',
    price: 300,
    unit: 'for the package',
    sessions: '20 sessions',
    length: '1 hour each',
    tag: 'Before external assessment',
    what: 'A structured, intensive revision pathway: the entire syllabus covered before external assessment.',
    who: 'Students who want the whole course revisited in order before their exams.',
    does: ['The entire syllabus, unit by unit, SL and HL', 'Concepts, theories and tools reinforced', 'Calculations and what they mean for the business', 'Application, evaluation and exam preparation'],
    expect: 'A planned sequence across twenty hours, adjusted to where your gaps are.',
    cta: 'Ask about Marathon Revision',
  },
  {
    key: 'exam',
    name: 'Exam Practice',
    price: 200,
    unit: 'for the package',
    sessions: '12 sessions',
    length: '1 hour each',
    tag: 'Questions only',
    what: 'Solving and discussing exam-style questions: Paper 1, Paper 2 and Paper 3.',
    who: 'Students who know the content and want to turn it into marks.',
    does: ['Paper 1: the pre-released case study', 'Paper 2: the quantitative paper', 'Paper 3: the social enterprise (HL)', 'Every answer discussed against the published assessment criteria'],
    expect: 'Questions only: we write, read and improve answers rather than re-teach topics.',
    cta: 'Ask about Exam Practice',
  },
];

/** A ready-to-send enquiry: the owner's subject line, and a short template to fill in. */
export function enquiryMailto(about?: string, fields?: Partial<Record<'level' | 'option' | 'topics' | 'arrangement' | 'school', string>>): string {
  const subject = about ? `${ENQUIRY_SUBJECT}: ${about}` : ENQUIRY_SUBJECT;
  const f = fields ?? {};
  const body = [
    'Hello Arjun,',
    '',
    `I would like to enquire about IB DP Business Management tutorials${about ? `: ${about}` : ''}.`,
    '',
    `Year or level (for example DP1 or DP2): ${f.level ?? ''}`,
    `SL or HL: ${f.option ?? ''}`,
    `School: ${f.school ?? ''}`,
    `Topics or papers I would like help with: ${f.topics ?? ''}`,
    `Preferred session arrangement (days, times and time zone): ${f.arrangement ?? ''}`,
    '',
    'Thank you.',
  ].join('\n');
  return `mailto:${TUTOR.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The price line used wherever the tutorials are mentioned outside their page. */
export const PRICE_LINE = `${SESSION.currency}${SESSION.price} for a one-hour one-to-one online session, any topic. IA support, EE supervision, Marathon Revision and Exam Practice packages are on the Tutorials page.`;
