/**
 * The Apply it worksheet on a framework's page. The reader's entries are kept
 * on this device as they type (localStorage bb:framework-apply:<id>) and
 * restored when they return; the worksheet can be downloaded as a text file
 * and cleared, with a second press to confirm. Without JavaScript it is a
 * plain form that works for the visit and prints.
 */
import { announce, each, readConfig, store } from './ix';

interface Config {
  title: string;
  parts: Array<{ key: string; label: string }>;
}

interface Sheet {
  v: number;
  at: string;
  fields: Record<string, string>;
}

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** The worksheet as plain text, in the order of the form. */
function asText(cfg: Config, v: (k: string) => string): string {
  const block = (label: string, text: string) => [label.toUpperCase(), text.trim() || '(not written yet)', ''];
  return [
    `${cfg.title}: applied`,
    '',
    ...block('Decision or question', v('decision')),
    ...block('The business and its situation', v('context')),
    ...cfg.parts.flatMap((p) => block(p.label, v(p.key))),
    ...block('Reading of the result', v('reading')),
    ...block('What it justifies deciding, and what it does not', v('decide')),
    'A framework structures judgement; it does not produce the answer.',
    `From the frameworks library of The Business Brief, ${day(new Date().toISOString())}.`,
  ].join('\n');
}

each('[data-ix="fw-apply"]', (root) => {
  const key = root.dataset.key ?? '';
  const status = root.querySelector<HTMLElement>('[data-status]');
  const fields = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]')];
  const download = root.querySelector<HTMLButtonElement>('[data-download]');
  const clear = root.querySelector<HTMLButtonElement>('[data-clear]');
  if (!key || !fields.length) return;
  const cfg = readConfig<Config>(root);
  const value = (k: string) => fields.find((f) => f.dataset.field === k)?.value ?? '';

  const saved = store.get<Sheet | null>(key, null);
  if (saved && saved.fields && typeof saved.fields === 'object') {
    let restored = 0;
    for (const f of fields) {
      const v = saved.fields[f.dataset.field ?? ''];
      if (typeof v === 'string' && v) {
        f.value = v.slice(0, f.maxLength > 0 ? f.maxLength : 2000);
        restored += 1;
      }
    }
    if (restored && status) {
      const when = day(saved.at);
      status.textContent = when ? `Your worksheet from ${when} is back.` : 'Your worksheet is back.';
    }
  }

  const save = () => {
    const entries = fields.map((f) => [f.dataset.field ?? '', f.value] as const).filter(([k, v]) => k && v.trim());
    if (entries.length) store.set(key, { v: 1, at: new Date().toISOString(), fields: Object.fromEntries(entries) } satisfies Sheet);
    else store.remove(key);
    return entries.length > 0;
  };

  let timer = 0;
  let told = false;
  let dirty = false;
  root.addEventListener('input', (e) => {
    if (!(e.target instanceof HTMLElement) || !e.target.dataset.field) return;
    dirty = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      dirty = false;
      const kept = save();
      // Announce the first save only, so that a screen reader is not interrupted at every pause.
      if (kept && !told) {
        told = true;
        announce(status, 'Saved on this device.');
      }
    }, 500);
  });
  // Leaving within half a second of typing: keep the last words too.
  window.addEventListener('pagehide', () => {
    if (!dirty) return;
    window.clearTimeout(timer);
    dirty = false;
    save();
  });

  download?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([asText(cfg, value)], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key.replace(/[^a-z0-9-]+/gi, '-')}-worksheet.txt`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(status, 'Your worksheet was downloaded as a text file.');
  });

  let armed = 0;
  clear?.addEventListener('click', () => {
    if (!armed) {
      clear.textContent = 'Press again to clear';
      announce(status, 'Press Clear again to delete your worksheet from this device.');
      armed = window.setTimeout(() => {
        armed = 0;
        clear.textContent = 'Clear the worksheet';
      }, 4000);
      return;
    }
    window.clearTimeout(armed);
    armed = 0;
    clear.textContent = 'Clear the worksheet';
    fields.forEach((f) => (f.value = ''));
    window.clearTimeout(timer);
    dirty = false;
    store.remove(key);
    told = false;
    announce(status, 'Your worksheet was cleared.');
    fields[0]?.focus();
  });
});
