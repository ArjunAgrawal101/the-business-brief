/**
 * The Business Intelligence Briefing's themes and regions, as plain lists.
 *
 * Kept apart from the schemas so that the browser script, which filters the
 * briefing by theme, can use them without loading the schema library.
 */

/**
 * The hub's twelve editorial themes. The briefing must cover every one of
 * them (src/lib/integrity-intelligence.ts); each has a page of its own at
 * /intelligence/themes/<slug>/, and an item can belong to several.
 */
export const INTEL_THEMES = [
  'corporate-strategy',
  'mergers-and-acquisitions',
  'leadership',
  'marketing',
  'financial-results',
  'business-failure',
  'entrepreneurship',
  'innovation',
  'global-business',
  'sustainability',
  'corporate-governance',
  'industry-developments',
] as const;
export type IntelTheme = (typeof INTEL_THEMES)[number];

/**
 * Every theme an item may carry: the twelve editorial themes, then the two
 * kinds of development the first edition also used, kept so that items and
 * filtered addresses that name them still work.
 */
export const INTEL_CATEGORIES = [...INTEL_THEMES, 'restructuring', 'global-trend'] as const;
export type IntelCategory = (typeof INTEL_CATEGORIES)[number];

/** Where a development took place, by region of the world; an item can span several. */
export const INTEL_REGIONS = ['north-america', 'latin-america', 'europe', 'africa', 'middle-east', 'asia', 'oceania', 'global'] as const;
export type IntelRegion = (typeof INTEL_REGIONS)[number];
