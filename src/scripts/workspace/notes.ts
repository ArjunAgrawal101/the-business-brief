/**
 * The notebook in My Business Workspace (bb:workspace:notes): every note,
 * most recently changed first, each folded to its title until opened, with
 * the page it is attached to; a search that keeps the notes holding every
 * word; and the editor, to write a new note or change one, attached to a
 * page on the learning list or standalone. Notes started with "Add a note"
 * on a page (src/scripts/note-button.ts) arrive here too. Rules in
 * src/lib/workspace.ts; the form in src/scripts/note-editor.ts.
 */
import { escapeHtml as h } from '../ix';
import { shortDate } from '../../lib/dashboard';
import { NOTES_KEY, NOTE_FIELDS, NOTE_FIELD_LABELS, NOTE_KIND_LABELS, deleteNote, parseNotebook, saveNote, searchNotes, type Note, type WorkspaceView } from '../../lib/workspace';
import { bindKind, draftOf, editorFieldsHtml, fillEditor, firstField, readEditor, showError } from '../note-editor';
import { readItem, writeItem } from '../storage';
import { $in, plural, type Ctx } from './context';

const UID = 'ws-ed';

/** The reader's text as paragraphs, line breaks kept. */
const textHtml = (s: string) =>
  s
    .split(/\n{2,}/)
    .map((p) => `<p>${h(p).replace(/\n/g, '<br />')}</p>`)
    .join('');

function noteHtml(n: Note, open: boolean, now: Date): string {
  const t = h(n.title);
  const content =
    n.kind === 'case'
      ? `<dl class="ws-note__fields">${NOTE_FIELDS.filter((f) => n.fields[f])
          .map((f) => `<dt>${h(NOTE_FIELD_LABELS[f])}</dt><dd>${textHtml(n.fields[f])}</dd>`)
          .join('')}</dl>`
      : `<div class="ws-note__body">${textHtml(n.body)}</div>`;
  return `<li class="ws-note" data-note="${h(n.id)}">
    <details class="ws-note__d"${open ? ' open' : ''} data-note-d="${h(n.id)}">
      <summary class="ws-note__sum" data-focus="sum:${h(n.id)}"><span class="ws-note__title">${t}</span> <span class="ws-note__meta">${h(NOTE_KIND_LABELS[n.kind])}, changed ${h(shortDate(n.updated, now))}</span></summary>
      <div class="ws-note__content">${content}</div>
    </details>
    ${n.page ? `<p class="ws-note__on">On <a href="${h(n.page.url)}">${h(n.page.title)}</a></p>` : '<p class="ws-note__on">Standalone</p>'}
    <p class="ws-note__acts"><button type="button" class="ws-act" data-note-edit="${h(n.id)}" data-focus="ed:${h(n.id)}">Edit<span class="sr-only">: ${t}</span></button><button type="button" class="db-remove ws-act" data-note-del="${h(n.id)}" data-focus="del:${h(n.id)}">Delete<span class="sr-only">: ${t}</span></button></p>
  </li>`;
}

export interface NotesPart {
  render(view: WorkspaceView, now: Date): void;
}

export function bindNotes(ctx: Ctx): NotesPart {
  const { root, say } = ctx;
  const list = $in(root, '[data-notes]');
  const count = $in(root, '[data-note-count]');
  const q = $in<HTMLInputElement>(root, '[data-note-q]');
  const newBtn = $in<HTMLButtonElement>(root, '[data-note-new]');
  const editor = $in(root, '[data-note-editor]');
  const form = $in<HTMLFormElement>(root, '[data-note-form]');
  const fields = $in(root, '[data-note-fields]');
  const heading = $in(root, '[data-note-editor-h]');
  if (!list || !editor || !form || !fields) throw new Error('The notebook is missing its parts.');

  fields.innerHTML = editorFieldsHtml(
    UID,
    `<div class="field ne-field"><label for="${UID}-page">Attached to</label><select class="select" id="${UID}-page" name="page" data-ne-page aria-describedby="${UID}-page-hint"></select><p class="field__hint" id="${UID}-page-hint">A page on your learning list, or none for a note that stands alone.</p></div>`,
  );
  bindKind(form);
  const pageSel = $in<HTMLSelectElement>(form, '[data-ne-page]');

  const open = new Set<string>();
  let editing: string | null = null;
  let opener: HTMLElement | null = null;
  let initial = '';
  let searchTimer = 0;
  let sayTimer = 0;

  const render = (view: WorkspaceView, now: Date) => {
    const all = view.notebook.notes;
    const query = q?.value.trim() ?? '';
    const shown = searchNotes(all, query);
    list.innerHTML = shown.length ? `<ol class="ws-notes__list" role="list">${shown.map((n) => noteHtml(n, open.has(n.id), now)).join('')}</ol>` : '';
    if (count)
      count.textContent = !all.length
        ? ''
        : query
          ? shown.length
            ? `${plural(shown.length, 'note', 'notes')} of ${all.length} ${shown.length === 1 ? 'matches' : 'match'} “${query}”.`
            : `No note matches “${query}”. Try fewer words.`
          : `${plural(all.length, 'note', 'notes')}, the most recently changed first. Open one to read it.`;
    if (!all.length) list.innerHTML = '<p class="db-none">No notes yet. Use <strong>New note</strong>, or <strong>Add a note</strong> beside <strong>Save</strong> on a subtopic, a case, a mindmap or a framework, to start one.</p>';
  };

  // Keep notes open or folded as the reader left them, across redraws.
  root.addEventListener(
    'toggle',
    (e) => {
      const d = e.target as HTMLDetailsElement;
      const id = d.dataset?.noteD;
      if (!id) return;
      if (d.open) open.add(id);
      else open.delete(id);
    },
    true,
  );

  q?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    window.clearTimeout(sayTimer);
    searchTimer = window.setTimeout(() => {
      render(ctx.view(), new Date());
      sayTimer = window.setTimeout(() => say(count?.textContent ?? ''), 700);
    }, 150);
  });

  /* ---------- The editor ---------- */

  const pageOptions = (current: Note['page']) => {
    if (!pageSel) return;
    const items = ctx.view().list.map((x) => ({ url: x.url, title: x.title }));
    if (current && !items.some((x) => x.url === current.url)) items.unshift(current);
    pageSel.innerHTML = `<option value="">No page: a standalone note</option>${items
      .map((p) => `<option value="${h(p.url)}" data-title="${h(p.title)}"${current?.url === p.url ? ' selected' : ''}>${h(p.title)}</option>`)
      .join('')}`;
  };
  const snapshot = () => JSON.stringify([readEditor(form), pageSel?.value ?? '']);

  const openEditor = (note: Note | null, from: HTMLElement | null) => {
    editing = note?.id ?? null;
    opener = from;
    if (heading) heading.textContent = note ? 'Edit the note' : 'New note';
    pageOptions(note?.page ?? null);
    fillEditor(form, note ? { title: note.title, kind: note.kind, fields: note.fields, body: note.body } : { kind: 'case' });
    initial = snapshot();
    editor.hidden = false;
    newBtn?.setAttribute('aria-expanded', 'true');
    (note ? firstField(form) : form.querySelector<HTMLElement>(`#${UID}-title`))?.focus();
  };
  const closeEditor = (focus: HTMLElement | null) => {
    editor.hidden = true;
    editing = null;
    newBtn?.setAttribute('aria-expanded', 'false');
    focus?.focus();
  };

  newBtn?.addEventListener('click', () => {
    if (!editor.hidden && snapshot() !== initial && !window.confirm('Leave the note you are writing without saving it?')) return;
    openEditor(null, newBtn);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const chosen = pageSel?.selectedOptions[0];
    const page = chosen && chosen.value ? { url: chosen.value, title: chosen.dataset.title ?? chosen.textContent ?? chosen.value } : null;
    const res = saveNote(parseNotebook(readItem(NOTES_KEY)), draftOf(readEditor(form), page, editing ?? undefined), new Date());
    if (!res.ok) {
      showError(form, res.field, res.error);
      say(res.error);
      return;
    }
    if (!writeItem(NOTES_KEY, JSON.stringify(res.notebook))) {
      showError(form, 'form', 'This browser would not keep the note: its storage is full or blocked. Copy your text before you leave the page.');
      return;
    }
    const was = editing;
    open.add(res.note.id);
    if (q && q.value && !searchNotes([res.note], q.value).length) q.value = '';
    closeEditor(null);
    ctx.refresh();
    root.querySelector<HTMLElement>(`[data-focus="sum:${CSS.escape(res.note.id)}"]`)?.focus();
    say(was ? `Note saved: ${res.note.title}.` : `Note added: ${res.note.title}.`);
  });

  form.querySelector('[data-note-cancel]')?.addEventListener('click', () => {
    if (snapshot() !== initial && !window.confirm('Leave without saving your changes to this note?')) return;
    const back = opener && root.contains(opener) ? opener : editing ? root.querySelector<HTMLElement>(`[data-focus="ed:${CSS.escape(editing)}"]`) : newBtn;
    closeEditor(back);
    say('Nothing was saved.');
  });

  root.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const edit = t.closest<HTMLButtonElement>('[data-note-edit]');
    if (edit) {
      const note = ctx.view().notebook.notes.find((n) => n.id === edit.dataset.noteEdit);
      if (!note) return;
      if (!editor.hidden && snapshot() !== initial && !window.confirm('Leave the note you are writing without saving it?')) return;
      openEditor(note, edit);
      editor.scrollIntoView?.({ block: 'nearest' });
      return;
    }
    const del = t.closest<HTMLButtonElement>('[data-note-del]');
    if (del) {
      const id = del.dataset.noteDel ?? '';
      const note = ctx.view().notebook.notes.find((n) => n.id === id);
      if (!note) return;
      const res = await ctx.ask({ title: 'Delete this note?', body: `<p>“${h(note.title)}” will be deleted from this browser. It cannot be undone, so export it first if you may want it back.</p>`, confirm: 'Delete the note' });
      if (!res.ok) {
        del.focus();
        say('Nothing was deleted.');
        return;
      }
      const before = [...root.querySelectorAll<HTMLElement>('[data-note-del]')].findIndex((b) => b.dataset.noteDel === id);
      if (!writeItem(NOTES_KEY, JSON.stringify(deleteNote(parseNotebook(readItem(NOTES_KEY)), id)))) {
        say('This browser would not change its storage, so the note was not deleted.');
        return;
      }
      open.delete(id);
      if (editing === id) closeEditor(null);
      ctx.refresh();
      const left = [...root.querySelectorAll<HTMLElement>('[data-note-edit]')];
      (left[before] ?? left[before - 1] ?? newBtn)?.focus();
      say(`Note deleted: ${note.title}.`);
    }
  });

  return { render };
}
