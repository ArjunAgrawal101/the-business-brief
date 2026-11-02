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
