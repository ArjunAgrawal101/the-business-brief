/**
 * A framework's exercise. The reader's answer is kept on this device as they
 * type (localStorage bb:framework:<id>) and restored when they return; it can
 * be downloaded as a text file or cleared, with a second press to confirm.
 * Without JavaScript the box still works for the visit, and the guidance is
 * an ordinary disclosure.
 */
import { announce, each, readConfig, store } from './ix';

interface Config {
  title: string;
  prompt: string;
}

interface Draft {
  text: string;
  at: string;
}

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

each('[data-ix="fw-exercise"]', (root) => {
  const box = root.querySelector<HTMLTextAreaElement>('[data-answer]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const download = root.querySelector<HTMLButtonElement>('[data-download]');
  const clear = root.querySelector<HTMLButtonElement>('[data-clear]');
  const key = root.dataset.key ?? '';
  if (!box || !key) return;
  const cfg = readConfig<Config>(root);

  const saved = store.get<Draft | null>(key, null);
  if (saved && typeof saved.text === 'string' && saved.text.trim()) {
    box.value = saved.text;
    const when = day(saved.at);
    if (status) status.textContent = when ? `Your draft from ${when} is back.` : 'Your draft is back.';
  }

  let timer = 0;
  let told = false;
  box.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (box.value.trim()) store.set(key, { text: box.value, at: new Date().toISOString() });
      else store.remove(key);
      // Announce the first save only, so a screen reader is not interrupted at every pause.
      if (!told && box.value.trim()) {
        told = true;
        announce(status, 'Saved on this device.');
      }
    }, 500);
  });

  download?.addEventListener('click', () => {
    const text = [cfg.title, '', `Exercise: ${cfg.prompt}`, '', 'My answer:', box.value.trim() || '(not written yet)', '', `From the frameworks library of The Business Brief, ${day(new Date().toISOString())}.`].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key.replace(/[^a-z0-9-]+/gi, '-')}-answer.txt`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(status, 'Your answer was downloaded as a text file.');
  });

  let armed = 0;
  clear?.addEventListener('click', () => {
    if (!armed) {
      clear.textContent = 'Press again to clear';
      announce(status, 'Press Clear again to delete your answer from this device.');
      armed = window.setTimeout(() => {
        armed = 0;
        clear.textContent = 'Clear';
      }, 4000);
      return;
    }
    window.clearTimeout(armed);
    armed = 0;
    clear.textContent = 'Clear';
    box.value = '';
    store.remove(key);
    told = false;
    announce(status, 'Your answer was cleared.');
    box.focus();
  });
});
