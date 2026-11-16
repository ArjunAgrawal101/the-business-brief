/**
 * The two editions of a briefing, as the switch in the browser uses them.
 * Pure, so the words the switch says and the address it keeps are tested
 * without a browser (tests/unit/boardroom-briefings.test.ts).
 */
export const EDITIONS = ['student', 'analysis'] as const;
export type Edition = (typeof EDITIONS)[number];

export const isEdition = (v: unknown): v is Edition => v === 'student' || v === 'analysis';

/** The line under the switch, saying which edition is showing. */
export const EDITION_NOTES: Record<Edition, string> = {
  student: 'You are reading the Student edition. The recommendation is withheld.',
  analysis: 'You are reading the Analysis edition: the worked discussion and the recommendation.',
};

/** What the switch announces to screen readers when the edition changes. */
export const EDITION_ANNOUNCEMENTS: Record<Edition, string> = {
  student: 'Showing the Student edition: the case and the questions.',
  analysis: 'Showing the Analysis edition: the worked discussion and the recommendation.',
};

/**
 * The address of a page in an edition. The Analysis edition is the page with
 * #analysis (the id of its disclosure, so the address works without
 * JavaScript too); the Student edition is the page with no fragment.
 */
export function editionAddress(pathname: string, search: string, edition: Edition): string {
  return `${pathname}${search}${edition === 'analysis' ? '#analysis' : ''}`;
}
