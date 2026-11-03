/** Helpers shared by the IA tools' scripts: feedback lists, downloads and the two-step clear. */
import { escapeHtml } from '../ix';
import type { Check } from '../../lib/ia-tools';

export const WORD: Record<Check['status'], string> = { ok: 'Fine', advice: 'Advice', problem: 'Problem' };

/** A feedback list: the word first, then the text and where the rule comes from. */
export function checksHtml(list: Check[]): string {
  return list
    .map((c) => `<li><span class="it-word it-word--${c.status}">${WORD[c.status]}</span><span>${escapeHtml(c.text)}${c.source ? ` <span class="it-src">${escapeHtml(c.source)}</span>` : ''}</span></li>`)
    .join('');
}

export function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Wires a reset button to its confirmation: nothing is cleared until the reader confirms. */
export function twoStepReset(root: HTMLElement, onConfirm: () => void): void {
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');
  const confirm = root.querySelector<HTMLElement>('[data-reset-confirm]');
  const close = () => {
    if (confirm) confirm.hidden = true;
    if (reset) {
      reset.hidden = false;
      reset.focus();
    }
  };
  reset?.addEventListener('click', () => {
    if (confirm) confirm.hidden = false;
    reset.hidden = true;
    root.querySelector<HTMLButtonElement>('[data-reset-no]')?.focus();
  });
  root.querySelector<HTMLButtonElement>('[data-reset-no]')?.addEventListener('click', close);
  root.querySelector<HTMLButtonElement>('[data-reset-yes]')?.addEventListener('click', () => {
    onConfirm();
    close();
  });
}

/** Today in the reader's time zone, as YYYY-MM-DD. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
