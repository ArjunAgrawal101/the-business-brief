import type { Verification } from './schemas';

/**
 * The creator's assessment guides, published unchanged as downloads
 * (public/downloads/guides/). Each is the source of one Assessment Centre page.
 */
export const GUIDES = {
  'internal-assessment': {
    title: 'The Business Research Project: IA guide',
    file: '/downloads/guides/business-brief-ia-research-project-guide.pdf',
    pages: 5,
    size: '1.0 MB',
  },
  'paper-1': { title: 'Paper 1 Assessment Guide', file: '/downloads/guides/business-brief-paper-1-assessment-guide.pdf', pages: 5, size: '1.0 MB' },
  'paper-2': { title: 'Paper 2 Assessment Guide', file: '/downloads/guides/business-brief-paper-2-assessment-guide.pdf', pages: 5, size: '1.0 MB' },
  'paper-3': { title: 'Paper 3 Assessment Guide (HL)', file: '/downloads/guides/business-brief-paper-3-assessment-guide-hl.pdf', pages: 5, size: '1.0 MB' },
} as const;

export type GuideId = keyof typeof GUIDES;

export const CENTRE_HREF: Record<GuideId, string> = {
  'internal-assessment': '/assessment/internal-assessment/',
  'paper-1': '/assessment/paper-1/',
  'paper-2': '/assessment/paper-2/',
  'paper-3': '/assessment/paper-3/',
};

/**
 * The rules that hold in every examination paper, from the claims register:
 * reading time, the calculator rule and the formulae copy. Shown on the
 * Assessment Centre and on each paper's page from the same claims, so the
 * pages cannot drift apart.
 */
export const EVERY_PAPER = ['reading-time', 'calculators', 'formulae'] as const;

interface ClaimLike {
  statement: string;
  status: Verification;
  sources: string[];
  location?: string | undefined;
}

/**
 * Claims as statements for a fact list, in the order asked for; a missing
 * claim is left out. A page in the guide alone is written as the fact lists
 * write it ("Guide, p. 43").
 */
export function claimFacts(claims: Record<string, ClaimLike | undefined>, ids: readonly string[]) {
  return ids.flatMap((id) => {
    const k = claims[id];
    if (!k) return [];
    const guideOnly = k.sources.length === 1 && k.sources[0] === 'ib-bm-guide-2024';
    const location = k.location && guideOnly && /^pp?\. /.test(k.location) ? `Guide, ${k.location}` : k.location;
    return [{ text: k.statement, status: k.status, sources: k.sources, location }];
  });
}
