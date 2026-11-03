/**
 * Copy buttons for text the page already shows (the board memo template, the
 * lesson outlines). The text is in the page without JavaScript, so it can
 * always be selected by hand; the button only saves the selecting. When the
 * browser refuses clipboard access, the button says so.
 */
import { announce, each } from './ix';

export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

each('[data-ix="copy"]', (root) => {
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const source = root.querySelector<HTMLElement>('[data-copy-text]');
    const status = root.querySelector<HTMLElement>('[data-copy-status]');
    if (!source) return;
    btn.addEventListener('click', async () => {
      const ok = await copyText(source.textContent ?? '');
      announce(status, ok ? 'Copied. Paste it wherever you build your own material.' : 'The browser blocked copying. Select the text on the page and copy it yourself.');
    });
  });
});
