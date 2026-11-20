/**
 * The Arjun Agrawal Academic Ecosystem: three independent platforms from the
 * same educator, under one academic identity (Arjun Agrawal: Knowledge.
 * Insight. Impact.). Each keeps its own repository, address and design; the
 * names and lines are the owner's. This platform is The Business Brief.
 *
 * The header's Academic Ecosystem menu, the drawer, the home page, the footer
 * and About all read this list, so an address changes in one place. The two
 * sister platforms open in a new tab.
 */
export interface Platform {
  /** A stable key, used for each platform's colours. */
  key: 'economics' | 'business' | 'politics';
  name: string;
  /** The owner's line for the platform. */
  line: string;
  url: string;
  /** True for the platform you are on. */
  current: boolean;
  /** One sentence on what the platform is. */
  text: string;
}

export const ECOSYSTEM_NAME = 'The Arjun Agrawal Academic Ecosystem';
export const ECOSYSTEM_MOTTO = 'Knowledge. Insight. Impact.';

export const ECOSYSTEM: readonly Platform[] = [
  {
    key: 'economics',
    name: 'Economics',
    line: 'IB Economics | Economic Analysis | Academic Resources',
    url: 'https://ib-economics-pi.vercel.app/',
    current: false,
    text: 'Economics for IB Diploma Programme students and UPSC CSE aspirants: models that move, causal chains, real-world cases and examination practice.',
  },
  {
    key: 'business',
    name: 'The Business Brief',
    line: 'IB Business Management | Strategy | Leadership | Decisions',
    url: 'https://the-business-brief-dun.vercel.app/',
    current: true,
    text: 'IB Diploma Programme Business Management learned through decisions: topic notes, mindmaps, case studies, live financial tools and an Assessment Centre.',
  },
  {
    key: 'politics',
    name: 'Political Studies & Global Affairs',
    line: 'Indian Polity | International Relations | PSIR | IB Global Politics',
    url: 'https://arjun-agrawal-political-studies.vercel.app/',
    current: false,
    text: 'UPSC CSE Indian Polity and International Relations, Political Science and International Relations (PSIR) and IB Diploma Programme Global Politics, read as one connected body of knowledge.',
  },
];

/** The address without its scheme or trailing slash, for display. */
export const hostOf = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
