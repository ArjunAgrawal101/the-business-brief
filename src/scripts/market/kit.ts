/**
 * What every Market Studio instrument shares in the browser: keeping the
 * reader's work on this device under bb:market:<instrument>, exporting it
 * (JSON, CSV, text), copying a summary, printing, importing a saved file and
 * going back to the worked example. Storage may be blocked or full; every
 * access is wrapped, and the instrument keeps working for the visit.
 */
import { stateFromFile, toCsv, toolFile } from '../../lib/market-kit';
import { toolKey } from '../../lib/market-tools';
import { announce } from '../ix';

const storageKey = (slug: string) => `bb:${toolKey(slug)}`;

/** The saved state for an instrument, or null (nothing saved, storage blocked, or unreadable). */
export function loadSaved(slug: string): unknown {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: unknown };
    return parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : null;
  } catch {
    return null;
  }
}

/** Saves the state; false when the browser will not store it. */
export function saveState(slug: string, state: unknown): boolean {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify({ v: 1, savedAt: new Date().toISOString(), state }));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved(slug: string): void {
  try {
    localStorage.removeItem(storageKey(slug));
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Offers a file to the reader without any request leaving the browser. */
export function download(name: string, mime: string, text: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No clipboard permission (or an older browser): the summary is also shown as text on the page.
    return false;
  }
}

export interface KitOptions<S> {
  root: HTMLElement;
  slug: string;
  /** The instrument's name, for file names and messages. */
  name: string;
  defaults: S;
  normalize: (raw: unknown, fallback: S) => S | null;
  /** Reads the current state from the form. */
  read: () => S;
  /** Rebuilds the form from a state and redraws the results. */
  apply: (s: S) => void;
  csv?: (s: S) => Array<Array<string | number | null | undefined>>;
  text: (s: S) => string;
  /** An extra text download, such as a persona as Markdown. */
  textFile?: { ext: string; mime: string; make: (s: S) => string };
}

export interface Kit<S> {
  /** Call after every change: saves (debounced) and refreshes the summary. */
  changed: () => void;
  /** True when saved work was found and shown on load. */
  restored: boolean;
  state: () => S;
}

export function mountKit<S>(o: KitOptions<S>): Kit<S> {
  const { root, slug } = o;
  const status = root.querySelector<HTMLElement>('[data-status]');
  const line = root.querySelector<HTMLElement>('[data-kit-status]');
  const summary = root.querySelector<HTMLElement>('[data-kit-summary]');
  const fileBase = `${slug}`;
  let timer = 0;
  let current: S = o.defaults;

  const setLine = (text: string, kind: 'saved' | 'unsaved' | 'neutral' = 'neutral') => {
    if (!line) return;
    line.textContent = text;
    line.dataset.kind = kind;
  };
  const refreshSummary = () => {
    if (summary) summary.textContent = o.text(current);
  };
  const persist = () => {
    current = o.read();
    refreshSummary();
    const ok = saveState(slug, current);
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLine(ok ? `Saved on this device at ${time}.` : 'This browser is not saving, so your changes last for this visit only. Download the JSON file to keep them.', ok ? 'saved' : 'unsaved');
  };

  // Saved work replaces the worked example on load.
  let restored = false;
  const saved = loadSaved(slug);
  if (saved !== null) {
    const s = o.normalize(saved, o.defaults);
    if (s) {
      current = s;
      o.apply(s);
      restored = true;
      setLine('Your saved work from this device is shown. Reset to see the worked example again.', 'saved');
    }
  }
  if (!restored) {
    current = o.read();
    setLine('Showing the worked example. Your changes are saved on this device as you work.');
  }
  refreshSummary();

  const changed = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(persist, 300);
  };

  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  q<HTMLButtonElement>('[data-kit-json]')?.addEventListener('click', () => {
    current = o.read();
    const ok = download(`${fileBase}.json`, 'application/json', JSON.stringify(toolFile(slug, current, new Date()), null, 2));
    announce(status, ok ? `${o.name} downloaded as a JSON file.` : 'The download could not be made in this browser. Copy the summary instead.');
  });
  q<HTMLButtonElement>('[data-kit-csv]')?.addEventListener('click', () => {
    if (!o.csv) return;
    current = o.read();
    const ok = download(`${fileBase}.csv`, 'text/csv;charset=utf-8', `${String.fromCharCode(0xfeff)}${toCsv(o.csv(current))}`);
    announce(status, ok ? `${o.name} downloaded as a CSV file for a spreadsheet.` : 'The download could not be made in this browser.');
  });
  q<HTMLButtonElement>('[data-kit-text]')?.addEventListener('click', () => {
    if (!o.textFile) return;
    current = o.read();
    const ok = download(`${fileBase}.${o.textFile.ext}`, o.textFile.mime, o.textFile.make(current));
    announce(status, ok ? `${o.name} downloaded as a text file.` : 'The download could not be made in this browser.');
  });
  q<HTMLButtonElement>('[data-kit-copy]')?.addEventListener('click', async () => {
    current = o.read();
    const ok = await copyText(o.text(current));
    announce(status, ok ? 'Summary copied. Paste it into your notes or a document.' : 'Copying did not work in this browser. Open “The summary as text” below and copy it from there.');
  });
  q<HTMLButtonElement>('[data-kit-print]')?.addEventListener('click', () => window.print());
  q<HTMLButtonElement>('[data-kit-reset]')?.addEventListener('click', () => {
    if (!window.confirm(`Replace your work with the worked example? Your saved ${o.name.toLowerCase()} on this device will be removed.`)) return;
    window.clearTimeout(timer);
    clearSaved(slug);
    current = o.defaults;
    o.apply(o.defaults);
    refreshSummary();
    setLine('Showing the worked example. Your changes are saved on this device as you work.');
    announce(status, 'Back to the worked example. Your saved work has been removed from this device.');
  });
  const file = q<HTMLInputElement>('[data-kit-import]');
  file?.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    try {
      const raw: unknown = JSON.parse(await f.text());
      const inner = stateFromFile(raw, slug);
      const s = inner === null ? null : o.normalize(inner, o.defaults);
      if (!s) {
        announce(status, `That file is not a saved ${o.name.toLowerCase()} from this instrument, so nothing was changed.`);
        return;
      }
      current = s;
      o.apply(s);
      persist();
      announce(status, `${o.name} imported from ${f.name}.`);
    } catch {
      announce(status, 'That file could not be read as JSON, so nothing was changed.');
    }
  });

  return { changed, restored, state: () => current };
}

/* ---------- Small helpers the instruments share ---------- */

/** The value of a field inside a container, by its data-f name. */
export function fieldValue(scope: ParentNode, f: string): string {
  const el = scope.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-f="${f}"]`);
  return el ? el.value : '';
}

export function fieldNumber(scope: ParentNode, f: string): number {
  const v = fieldValue(scope, f).replace(/[\s,]/g, '').replace(/−/g, '-');
  return v === '' ? NaN : Number(v);
}

export function fieldChecked(scope: ParentNode, f: string): boolean {
  return scope.querySelector<HTMLInputElement>(`[data-f="${f}"]`)?.checked ?? false;
}

/** Marks fields invalid and fills their error slots; clears the rest. `byWhere` maps a problem's key to an element id. */
export function showProblems(root: HTMLElement, problems: Array<{ where: string; message: string }>, byWhere: (where: string) => string | null): void {
  root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
  root.querySelectorAll<HTMLElement>('.field__error').forEach((el) => (el.textContent = ''));
  for (const p of problems) {
    const id = byWhere(p.where);
    if (!id) continue;
    const el = document.getElementById(id);
    if (!el) continue;
    el.setAttribute('aria-invalid', 'true');
    const err = document.getElementById(`${id}-err`);
    if (err && !err.textContent) err.textContent = p.message;
  }
}

/** Sets innerHTML of the element matching sel inside root. */
export function fill(root: ParentNode, sel: string, html: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  if (el) el.innerHTML = html;
}

export function setText(root: ParentNode, sel: string, text: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  if (el) el.textContent = text;
}
