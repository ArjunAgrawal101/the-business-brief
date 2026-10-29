/**
 * Light text formatting for content fields.
 *
 * Content is written in YAML. Text fields may use a deliberately small set of
 * marks, so that authors cannot break the page layout:
 *   **strong**  *emphasis*  `code`  [label](/internal/path)  [label](https://example.org)
 * A blank line starts a new paragraph. Lines that all start with "- " become a
 * list; lines that all start with "1. " become a numbered list.
 * Everything else is escaped, so no raw HTML can enter a page from content.
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

const SAFE_HREF = /^(\/[^\s]*|#[\w-]+|https:\/\/[^\s]+|mailto:[^\s]+)$/;

/** Inline marks only; returns HTML without a wrapping paragraph. */
export function inline(text: string): string {
  const codes: string[] = [];
  // Protect code spans first so their contents are not formatted.
  let out = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${esc(code)}</code>`);
    return `\uE000${codes.length - 1}\uE000`;
  });
  out = esc(out);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, rawHref: string) => {
    const href = rawHref.replace(/&amp;/g, '&');
    if (!SAFE_HREF.test(href)) return label;
    const external = href.startsWith('https://');
    const safe = esc(href);
    return external
      ? `<a href="${safe}" class="ext" rel="noopener">${label}<span class="sr-only"> (external site)</span></a>`
      : `<a href="${safe}">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\s](?:[^*]*?[^*\s])?)\*(?![*\w])/g, '$1<em>$2</em>');
  out = out.replace(/\uE000(\d+)\uE000/g, (_m, i: string) => codes[Number(i)] ?? '');
  return out;
}

/** Paragraphs and simple lists. */
export function rich(text: string): string {
  const paras = text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paras
    .map((p) => {
      const lines = p.split('\n').map((l) => l.trim());
      if (lines.length && lines.every((l) => /^-\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
      }
      if (lines.length && lines.every((l) => /^\d+\.\s+/.test(l))) {
        return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
      }
      return `<p>${inline(lines.join(' '))}</p>`;
    })
    .join('');
}

/** Plain text, for meta descriptions, search and accessible labels. */
export function plain(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trim plain text to a length at a word boundary. */
export function excerpt(text: string, max = 160): string {
  const p = plain(text);
  if (p.length <= max) return p;
  const cut = p.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > 60 ? at : max).replace(/[,;:.]$/, '')}…`;
}

/**
 * JSON for a <script type="application/json"> element. "<" is escaped so that
 * no string in the data can close the script element early.
 */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
