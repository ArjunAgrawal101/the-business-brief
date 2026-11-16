/**
 * Markup helpers for the Boardroom Briefings' pages: the platform's small
 * markdown (src/lib/markup.ts), with every mention of an exhibit turned into a
 * link to it, so a reader of the Analysis edition can check a figure in the
 * Student edition's exhibits in one step.
 */
import { inline, rich } from '../markup';

const MENTION = /\bExhibits?\s+(?:A?\d+)(?:(?:,\s*|\s+and\s+)A?\d+)*/g;

/**
 * Links each exhibit named in a piece of HTML to its figure on the page. "Exhibit 3" becomes one link; in "Exhibits 1
 * and A2" each number links, and is named in full for screen readers. A number with no exhibit is left as text.
 */
export function linkExhibits(html: string, ids: ReadonlySet<string>): string {
  return html.replace(MENTION, (mention) => {
    if (!mention.startsWith('Exhibits')) {
      const n = mention.replace(/^Exhibit\s+/, '');
      return ids.has(`ex-${n}`) ? `<a href="#ex-${n}">${mention}</a>` : mention;
    }
    return mention.replace(/A?\d+/g, (n) => (ids.has(`ex-${n}`) ? `<a href="#ex-${n}" aria-label="Exhibit ${n}">${n}</a>` : n));
  });
}

/** Rich text (paragraphs and lists) with exhibits linked. */
export const richLinked = (text: string, ids: ReadonlySet<string>): string => linkExhibits(rich(text), ids);

/** Inline text with exhibits linked. */
export const inlineLinked = (text: string, ids: ReadonlySet<string>): string => linkExhibits(inline(text), ids);
