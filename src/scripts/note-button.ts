/**
 * "Add a note", beside every Save button (src/components/ui/SaveButton.astro).
 * It opens a compact note editor, prefilled with the title and address of the
 * page or item the Save button saves, and keeps the note in the notebook of
 * My Business Workspace (bb:workspace:notes), in this browser only. A link
 * beside it says how many notes the reader has on that page or item.
 *
 * One dialog serves every button on a page; it is built the first time it is
 * needed, so a page without scripts carries none of it. Where the browser
 * keeps nothing, the control never appears.
 */
import { announce, each } from './ix';
import { NOTES_KEY, notesForPage, parseNotebook, saveNote } from '../lib/workspace';
import { bindKind, draftOf, editorFieldsHtml, fillEditor, firstField, readEditor, showError } from './note-editor';
import { readItem, storageWorks, writeItem } from './storage';

interface Target {
  url: string;
  title: string;
  kind: string;
  button: HTMLButtonElement;
  done: (saved: boolean) => void;
}

const UID = 'ne-dialog';
let dialog: HTMLDialogElement | null = null;
let target: Target | null = null;
let initial = '';

const values = (root: HTMLElement) => JSON.stringify(readEditor(root));

function build(): HTMLDialogElement {
  const d = document.createElement('dialog');
  d.className = 'ne-dialog';
  d.setAttribute('aria-labelledby', `${UID}-h`);
  d.innerHTML = `<form class="ne-form" method="dialog" data-ne-form>
      <h2 class="ne-h" id="${UID}-h">Add a note</h2>
      ${editorFieldsHtml(UID, `<p class="ne-on"><span class="label">Attached to</span> <span class="ne-on__title" data-ne-on-title></span> <span class="ne-on__url" data-ne-on-url></span></p>`)}
      <div class="ne-actions">
        <button type="button" class="btn" data-ne-cancel>Cancel</button>
        <button type="submit" class="btn btn--primary">Save note</button>
      </div>
      <p class="ne-foot">Kept in this browser only, in the notebook of <a href="/dashboard/#notes">My Business Workspace</a>, where you can edit, search and export it.</p>
    </form>`;
  document.body.append(d);
  bindKind(d);
  const form = d.querySelector<HTMLFormElement>('[data-ne-form]')!;

  const close = (saved: boolean) => {
    const t = target;
    d.close();
    target = null;
    t?.button.focus();
    t?.done(saved);
  };
  const discard = () => values(d) === initial || window.confirm('Leave without saving this note?');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!target) return;
    const res = saveNote(parseNotebook(readItem(NOTES_KEY)), draftOf(readEditor(d), { url: target.url, title: target.title }), new Date());
    if (!res.ok) {
      showError(d, res.field, res.error);
      return;
    }
    if (!writeItem(NOTES_KEY, JSON.stringify(res.notebook))) {
      showError(d, 'form', 'This browser would not keep the note: its storage is full or blocked. Copy your text before you close this.');
      return;
    }
    close(true);
  });
  d.querySelector('[data-ne-cancel]')?.addEventListener('click', () => {
    if (discard()) close(false);
  });
  // Escape: ask first when something was written.
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    if (discard()) close(false);
  });
  return d;
}

function open(t: Target): void {
  dialog ??= build();
  target = t;
  const onTitle = dialog.querySelector<HTMLElement>('[data-ne-on-title]');
  const onUrl = dialog.querySelector<HTMLElement>('[data-ne-on-url]');
  if (onTitle) onTitle.textContent = t.title;
  if (onUrl) onUrl.textContent = t.url;
  // A case file opens on the case notebook's headings; anything else on a free note.
  fillEditor(dialog, { title: t.title, kind: t.kind === 'case' ? 'case' : 'free' });
  initial = values(dialog);
  dialog.showModal();
  firstField(dialog)?.focus();
}

const painters: Array<() => void> = [];

each('[data-ix="note-add"]', (el) => {
  const save = el.closest<HTMLElement>('[data-ix="save"]');
  const button = el.querySelector<HTMLButtonElement>('[data-note-add]');
  const link = el.querySelector<HTMLAnchorElement>('[data-note-link]');
  const status = el.querySelector<HTMLElement>('[data-note-status]');
  if (!button || !storageWorks() || typeof HTMLDialogElement !== 'function') {
    el.hidden = true;
    return;
  }
  const url = save?.dataset.url ?? location.pathname;
  const title = save?.dataset.title ?? document.title;
  const kind = save?.dataset.kind ?? 'page';
  const compact = el.dataset.compact === 'true';
  const paint = () => {
    const n = notesForPage(parseNotebook(readItem(NOTES_KEY)).notes, url).length;
    if (!link) return;
    link.hidden = n === 0;
    link.textContent = compact ? `${n} ${n === 1 ? 'note' : 'notes'}` : `${n} ${n === 1 ? 'note' : 'notes'} in your workspace`;
    link.setAttribute('aria-label', `${n} ${n === 1 ? 'note' : 'notes'} on ${title}, in your workspace`);
  };
  button.addEventListener('click', () =>
    open({
      url,
      title,
      kind,
      button,
      done: (saved) => {
        painters.forEach((p) => p());
        if (saved) announce(status, 'Note saved in your workspace.');
      },
    }),
  );
  painters.push(paint);
  paint();
});

// A note saved or deleted in another tab, or in the workspace.
window.addEventListener('storage', (e) => {
  if (e.key === NOTES_KEY || e.key === null) painters.forEach((p) => p());
});
