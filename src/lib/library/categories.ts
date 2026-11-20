/**
 * The Resources Library's twelve categories, in the order the library shows
 * them. A module with no imports, so the browser script can use it without
 * pulling in the content schemas.
 */
export const LIBRARY_CATEGORIES = [
  'notes',
  'revision',
  'mindmaps',
  'diagrams',
  'formulas',
  'assessment',
  'practice',
  'cases',
  'frameworks',
  'teaching',
  'presentations',
  'enrichment',
] as const;

export type CategoryId = (typeof LIBRARY_CATEGORIES)[number];
