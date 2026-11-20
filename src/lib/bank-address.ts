/**
 * The question bank's address for one subtopic: /assessment/question-bank/?topic=3.5
 * opens the bank filtered to 3.5. Every subtopic page links to its questions
 * this way. Pure functions, shared by the subtopic pages, the bank's script
 * and the unit tests.
 */

export const BANK_HREF = '/assessment/question-bank/';

const CODE = /^[1-5]\.[1-9]$/;

/** The bank filtered to a subtopic. */
export const bankTopicHref = (code: string): string => `${BANK_HREF}?topic=${encodeURIComponent(code)}`;

/** The subtopic an address asks for (?topic=3.5, or ?code=3.5 as the bank's own field is named), or null when it names none or names it badly. */
export function topicFromSearch(search: string): string | null {
  const p = new URLSearchParams(search);
  const raw = (p.get('topic') ?? p.get('code') ?? '').trim();
  return CODE.test(raw) ? raw : null;
}

/** The same address with the subtopic set, or removed when it is empty; other parameters and the fragment are kept. */
export function withTopic(href: string, code: string): string {
  const url = new URL(href);
  url.searchParams.delete('code');
  if (code && CODE.test(code)) url.searchParams.set('topic', code);
  else url.searchParams.delete('topic');
  return url.toString();
}
