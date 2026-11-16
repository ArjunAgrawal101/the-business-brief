/**
 * The note editor, shared by the "Add a note" dialog beside every Save button
 * (src/scripts/note-button.ts) and by the notebook in My Business Workspace
 * (src/scripts/workspace/notes.ts). It builds the form's markup, fills it,
 * reads it and shows errors beside their fields; the rules of a note, and
 * the saving, are in src/lib/workspace.ts.
 *
 * A note is either case notes, under the six headings of a case analysis, or
 * a free note. Both parts of the form stay in the page while it is open, so
 * switching type and back loses nothing; only the chosen type is saved.
 */
import { escapeHtml as h } from './ix';
import { NOTE_FIELDS, NOTE_FIELD_HINTS, NOTE_FIELD_LABELS, WS_LIMITS, type NoteDraft, type NoteKind } from '../lib/workspace';

export interface EditorValues {
  title: string;
  kind: NoteKind;
  fields: Record<string, string>;
  body: string;
}

/** The form's fields. `pageControl` is the markup that says or chooses the page the note is attached to. */
export function editorFieldsHtml(uid: string, pageControl: string): string {
  const err = (f: string) => `<p class="field__error" id="${uid}-${f}-err" data-ne-err="${f}" hidden></p>`;
  const caseFields = NOTE_FIELDS.map(
    (f) =>
      `<div class="field ne-field"><label for="${uid}-${f}">${h(NOTE_FIELD_LABELS[f])}</label><p class="field__hint" id="${uid}-${f}-hint">${h(NOTE_FIELD_HINTS[f])}</p><textarea class="textarea ne-text" id="${uid}-${f}" name="${f}" rows="2" maxlength="${WS_LIMITS.noteField}" aria-describedby="${uid}-${f}-hint ${uid}-${f}-err"></textarea>${err(f)}</div>`,
  ).join('');
  return `<div class="field ne-field"><label for="${uid}-title">Title</label><input class="input" id="${uid}-title" name="title" type="text" maxlength="${WS_LIMITS.noteTitle}" autocomplete="off" aria-describedby="${uid}-title-hint" /><p class="field__hint" id="${uid}-title-hint">Optional: without one, the note takes the page's title or its first words.</p></div>
    ${pageControl}
    <fieldset class="ne-kind"><legend class="field__label">Type of note</legend>
      <label class="ne-kind__opt"><input type="radio" name="${uid}-kind" value="case" data-ne-kind /> <span><strong>Case notes</strong>, under six headings</span></label>
      <label class="ne-kind__opt"><input type="radio" name="${uid}-kind" value="free" data-ne-kind /> <span><strong>A free note</strong></span></label>
      <p class="field__hint ne-kind__hint">Only the type you choose is saved.</p>
    </fieldset>
    <fieldset class="ne-part" data-ne-part="case"><legend class="sr-only">Case notes</legend>${caseFields}</fieldset>
    <div class="field ne-field ne-part" data-ne-part="free"><label for="${uid}-body">Note</label><textarea class="textarea ne-text ne-text--body" id="${uid}-body" name="body" rows="5" maxlength="${WS_LIMITS.noteField}" aria-describedby="${uid}-body-err"></textarea>${err('body')}</div>
    <p class="field__error ne-form-err" data-ne-err="form" hidden></p>`;
}

const control = <T extends HTMLElement>(root: HTMLElement, name: string) => root.querySelector<T>(`[name="${CSS.escape(name)}"]`);

/** Show the part of the form for the chosen type, and tick its radio button. */
export function setKind(root: HTMLElement, kind: NoteKind): void {
  root.querySelectorAll<HTMLInputElement>('[data-ne-kind]').forEach((r) => (r.checked = r.value === kind));
  root.querySelectorAll<HTMLElement>('[data-ne-part]').forEach((p) => (p.hidden = p.dataset.nePart !== kind));
}

export function kindOf(root: HTMLElement): NoteKind {
  return root.querySelector<HTMLInputElement>('[data-ne-kind]:checked')?.value === 'case' ? 'case' : 'free';
}

export function clearErrors(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-ne-err]').forEach((e) => {
    e.textContent = '';
    e.hidden = true;
  });
  root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((e) => e.removeAttribute('aria-invalid'));
}

export function fillEditor(root: HTMLElement, v: Partial<EditorValues> & { kind: NoteKind }): void {
  clearErrors(root);
  const t = control<HTMLInputElement>(root, 'title');
  if (t) t.value = v.title ?? '';
  for (const f of NOTE_FIELDS) {
    const el = control<HTMLTextAreaElement>(root, f);
    if (el) el.value = v.fields?.[f] ?? '';
  }
  const body = control<HTMLTextAreaElement>(root, 'body');
  if (body) body.value = v.body ?? '';
  setKind(root, v.kind);
}

export function readEditor(root: HTMLElement): EditorValues {
  const fields: Record<string, string> = {};
  for (const f of NOTE_FIELDS) fields[f] = control<HTMLTextAreaElement>(root, f)?.value ?? '';
  return { title: control<HTMLInputElement>(root, 'title')?.value ?? '', kind: kindOf(root), fields, body: control<HTMLTextAreaElement>(root, 'body')?.value ?? '' };
}

/** The editor's values as a draft for saveNote(). */
export function draftOf(v: EditorValues, page: NoteDraft['page'], id?: string): NoteDraft {
  return { id, kind: v.kind, title: v.title, page, fields: v.fields, body: v.body };
}

/** Show an error beside its field (or for the whole form), mark the field invalid and move focus to it. */
export function showError(root: HTMLElement, field: string, message: string): void {
  clearErrors(root);
  const box = root.querySelector<HTMLElement>(`[data-ne-err="${CSS.escape(field)}"]`) ?? root.querySelector<HTMLElement>('[data-ne-err="form"]');
  if (box) {
    box.textContent = message;
    box.hidden = false;
  }
  const el = control<HTMLElement>(root, field);
  if (el) {
    el.setAttribute('aria-invalid', 'true');
    el.focus();
  }
}

/** The first field to type in: the first heading of case notes, or the free note's text. */
export function firstField(root: HTMLElement): HTMLElement | null {
  return control<HTMLElement>(root, kindOf(root) === 'case' ? NOTE_FIELDS[0] : 'body');
}

/** Switch the visible part of the form when the reader changes the type of note. */
export function bindKind(root: HTMLElement): void {
  root.addEventListener('change', (e) => {
    const r = e.target as HTMLInputElement;
    if (r.matches?.('[data-ne-kind]')) setKind(root, r.value === 'case' ? 'case' : 'free');
  });
}
