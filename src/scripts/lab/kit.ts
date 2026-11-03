/**
 * Helpers shared by the Entrepreneurship and Innovation Lab's scripts: field
 * errors, file downloads, short ids and the summaries each tool leaves for
 * the business plan. Storage goes through store() in ../ix, so every key is
 * prefixed "bb:" and a blocked storage never stops a tool working.
 */
import { store } from '../ix';

/** Show or clear the error for a field: the message beside it, aria-invalid on the control. */
export function setError(root: HTMLElement, field: string, message: string | null): void {
  const box = root.querySelector<HTMLElement>(`[data-err="${CSS.escape(field)}"]`);
  const control = root.querySelector<HTMLElement>(`[data-field="${CSS.escape(field)}"]`);
  if (box) box.textContent = message ?? '';
  if (control) {
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }
}

/** Clear every error in a tool. */
export function clearErrors(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-err]').forEach((e) => (e.textContent = ''));
  root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((e) => e.removeAttribute('aria-invalid'));
}

/** Offer text to the reader as a file to save. */
export function download(text: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** A short id for a new line or entry. */
let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

/** A CSV cell: quoted when it holds a comma, a quote or a line break. */
export function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Today's date as 3 November 2026. */
export function today(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Today's date as 2026-11-03, for file names. */
export function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** What a tool leaves for the business plan to quote. */
export function saveSummary(tool: 'feasibility' | 'canvas' | 'unit' | 'costs' | 'revenue', summary: unknown): void {
  store.set(`lab:summary:${tool}`, summary);
}

/** A slug for a file name from a title the learner typed. */
export function fileSlug(s: string, fallback: string): string {
  const out = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return out || fallback;
}
