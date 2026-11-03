/**
 * The Boardroom's fixed vocabularies: the five seats, the parts of the
 * business consequences are reported under, and the kinds of strategic
 * problem. Kept apart from the schema so the browser can use them without
 * loading the validation library.
 */

/** The five seats at the board table. */
export const ROLE_IDS = ['ceo', 'finance', 'marketing', 'operations', 'hr'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const ROLE_TITLES: Record<RoleId, string> = {
  ceo: 'Chief executive',
  finance: 'Finance director',
  marketing: 'Marketing director',
  operations: 'Operations director',
  hr: 'HR director',
};

/** A role's title inside a sentence: "the finance director", "the HR director". */
export const ROLE_IN_TEXT: Record<RoleId, string> = {
  ceo: 'chief executive',
  finance: 'finance director',
  marketing: 'marketing director',
  operations: 'operations director',
  hr: 'HR director',
};

/** The parts of the business a consequence is reported under. */
export const FUNCTION_IDS = ['marketing', 'operations', 'people', 'finance', 'sustainability'] as const;
export type FunctionId = (typeof FUNCTION_IDS)[number];

/** The kinds of strategic problem a scenario can be built around. */
export const CHALLENGES = ['declining-profitability', 'liquidity-crisis', 'international-expansion', 'automation', 'profit-versus-sustainability'] as const;
export type Challenge = (typeof CHALLENGES)[number];

export const CHALLENGE_LABELS: Record<Challenge, string> = {
  'declining-profitability': 'Declining profitability',
  'liquidity-crisis': 'A liquidity crisis',
  'international-expansion': 'International expansion',
  automation: 'Whether to automate production',
  'profit-versus-sustainability': 'Profitability versus sustainability',
};
