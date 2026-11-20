/**
 * Tagging a case in the browser, shared by the Paper 1 workspace and its
 * practice cases: a sentence is chosen by a click, Enter or Space, or a few
 * words by selecting them with the mouse; the palette of tags then opens,
 * with its first tag focused, and Escape or Cancel closes it and returns focus
 * to the sentence. What a tag does is the caller's (`onTag`). The case's
 * markup is src/lib/p1-workspace.ts (paragraphHtml): every sentence a
 * focusable span with its offsets, tags written in words beside the marks.
 */
import { quoted, type Paragraph, type Tag } from '../../lib/p1-workspace';

export interface Pending {
  para: number;
  start: number;
  end: number;
  text: string;
  from: HTMLElement | null;
}

interface Options {
  caseEl: HTMLElement;
  palette: HTMLElement;
  quote: HTMLElement;
  /** The case as it is rendered now. */
  paras: () => Paragraph[];
  /** A tag was chosen for these words. The palette is already closed. */
  onTag: (p: Pending, tag: Tag) => void;
}

/** Character offset of a point inside a paragraph, counting the case's words only (not the tag labels). */
function offsetIn(paraEl: HTMLElement, node: Node, offset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('.ws-label') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n === node) return total + offset;
    total += n.textContent?.length ?? 0;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    // A point between elements: count the text before the child at `offset`.
    const range = document.createRange();
    range.setStart(paraEl, 0);
    range.setEnd(node as Element, offset);
    const frag = range.cloneContents();
    frag.querySelectorAll('.ws-label').forEach((x) => x.remove());
    return frag.textContent?.length ?? 0;
  }
  return total;
}

export function attachTagger(o: Options): { close: (focusBack?: boolean) => void } {
  const { caseEl, palette, quote } = o;
  let pending: Pending | null = null;

  const open = (p: Pending) => {
    pending = p;
    caseEl.querySelectorAll('.ws-s.is-active').forEach((x) => x.classList.remove('is-active'));
    p.from?.classList.add('is-active');
    quote.textContent = quoted(p.text.length > 220 ? `${p.text.slice(0, 220)}…` : p.text);
    palette.hidden = false;
    palette.querySelector<HTMLButtonElement>('[data-tag]')?.focus({ preventScroll: true });
    palette.scrollIntoView({ block: 'nearest' });
  };

  const close = (focusBack = true) => {
    palette.hidden = true;
    caseEl.querySelectorAll('.ws-s.is-active').forEach((x) => x.classList.remove('is-active'));
    const from = pending?.from;
    pending = null;
    if (focusBack && from && document.contains(from)) from.focus({ preventScroll: true });
  };

  const sentencePending = (s: HTMLElement): Pending | null => {
    const para = Number(s.dataset.p);
    const start = Number(s.dataset.start);
    const end = Number(s.dataset.end);
    const p = o.paras()[para];
    if (!p || !(end > start)) return null;
    return { para, start, end, text: p.text.slice(start, end), from: s };
  };

  caseEl.addEventListener('mouseup', () => {
    window.setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const startPara = (range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as Element) : range.startContainer.parentElement)?.closest<HTMLElement>('[data-para]');
      if (!startPara || !caseEl.contains(startPara)) return;
      const para = Number(startPara.dataset.para);
      const p = o.paras()[para];
      if (!p) return;
      let start = offsetIn(startPara, range.startContainer, range.startOffset);
      let end = startPara.contains(range.endContainer) ? offsetIn(startPara, range.endContainer, range.endOffset) : p.text.length;
      while (start < end && /\s/.test(p.text[start] ?? '')) start++;
      while (end > start && /\s/.test(p.text[end - 1] ?? '')) end--;
      if (end - start < 2) return;
      const s = range.startContainer.parentElement?.closest<HTMLElement>('.ws-s') ?? null;
      open({ para, start, end, text: p.text.slice(start, end), from: s });
    }, 0);
  });

  caseEl.addEventListener('click', (e) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const s = (e.target as HTMLElement).closest<HTMLElement>('.ws-s');
    if (!s) return;
    const p = sentencePending(s);
    if (p) open(p);
  });

  caseEl.addEventListener('keydown', (e) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>('.ws-s');
    if (!s || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const p = sentencePending(s);
    if (p) open(p);
  });

  palette.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.hasAttribute('data-cancel')) {
      close();
      return;
    }
    const tag = b.dataset.tag as Tag | undefined;
    if (!tag || !pending) return;
    const p = pending;
    close(false);
    o.onTag(p, tag);
    window.getSelection()?.removeAllRanges();
  });
  palette.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  return { close };
}
