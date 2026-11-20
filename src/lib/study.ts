/**
 * Study mode on the subtopic pages (src/components/learn/StudyMode.astro and
 * src/scripts/study-mode.ts): the reader's text size and low-light choice,
 * kept in bb:study on this device, and the pure rules the script uses for
 * the reading progress and the "On this page" contents. "Mark as complete"
 * keeps its record in bb:studied (src/lib/learner.ts).
 */
import { asObject } from './learner';

export const STUDY_KEY = 'bb:study';

/** Three text sizes, applied to the article as a zoom: standard, large and larger. */
export const TEXT_SIZES = [1, 1.125, 1.25] as const;
export const SIZE_LABELS = ['Standard', 'Large', 'Larger'] as const;
export type SizeStep = 0 | 1 | 2;

export interface StudyPrefs {
  v: 1;
  size: SizeStep;
  /** Low light: the article in ivory on navy. */
  low: boolean;
}

export function defaultStudy(): StudyPrefs {
  return { v: 1, size: 0, low: false };
}

/** Read a stored bb:study value; anything it cannot use falls back to the default. It never throws. */
export function parseStudy(raw: unknown): StudyPrefs {
  const v = asObject(raw);
  if (!v) return defaultStudy();
  return { v: 1, size: v.size === 1 || v.size === 2 ? v.size : 0, low: v.low === true };
}

/**
 * The inline script that applies the reader's choice to the article before
 * it is drawn, so the page never flashes in the wrong size or light. It runs
 * where the component is placed, finds the article from the selector in its
 * own data-root attribute, and is unit-tested as this same text.
 */
export const STUDY_EARLY = `(function(){try{var s=document.currentScript,r=s&&s.closest(s.getAttribute('data-root')||'main');if(!r)return;r.setAttribute('data-study-root','');var p=JSON.parse(localStorage.getItem('bb:study')||'{}')||{};var z=p.size===1||p.size===2?p.size:0;r.setAttribute('data-study-size',String(z));if(p.low===true)r.setAttribute('data-study-low','');}catch(e){}})();`;

/**
 * How far through the article the reader is, from 0 to 1: 0 while its top
 * is below the reading line, 1 once its end has come into view.
 * `top` and `height` are the article's box in the viewport; `line` is where
 * reading starts (below the sticky header), `viewport` the window's height.
 */
export function readingProgress(top: number, height: number, line: number, viewport: number): number {
  const travel = height - (viewport - line);
  if (!(travel > 0)) return top <= line ? 1 : 0;
  return Math.min(1, Math.max(0, (line - top) / travel));
}

/**
 * The section being read: the last heading whose top has passed the reading
 * line (with a little room), or the first when none has. `tops` are the
 * headings' tops in the viewport, in page order.
 */
export function currentSection(tops: readonly number[], line: number, room = 24): number {
  let at = 0;
  tops.forEach((t, i) => {
    if (t <= line + room) at = i;
  });
  return at;
}

/** A heading's text for the contents: the hidden "Section 05: " that screen readers hear is dropped, spaces collapsed. */
export function contentsLabel(text: string): string {
  return text
    .replace(/^\s*Section\s+\d+:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
