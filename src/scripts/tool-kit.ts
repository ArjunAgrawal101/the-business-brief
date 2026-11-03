/**
 * What every People and Culture and Operations Floor tool shares in the
 * browser: keeping the reader's work on this device, the toolbar (reset to
 * the worked example, download JSON or CSV, open a saved file, print) and a
 * polite status line. Storage never throws: when it is blocked the tool still
 * works for the visit and says that nothing is being kept.
 */
import { announce } from './ix';

const VERSION = 1;

/** Read saved work: the data, or null when nothing (or nothing readable) is stored. */
export function loadSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`bb:${key}`);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as { v?: number; data?: T };
    return parsed && parsed.v === VERSION && parsed.data !== undefined ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Keep work on this device. Returns false when the browser will not store it. */
export function save(key: string, data: unknown): boolean {
  try {
    localStorage.setItem(`bb:${key}`, JSON.stringify({ v: VERSION, data }));
    return true;
  } catch {
    return false;
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(`bb:${key}`);
  } catch {
    /* nothing to remove */
  }
}

/** Offer text as a file to save. */
export function download(name: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** One CSV cell: quoted when needed, and never read as a formula by a spreadsheet. */
function cell(v: string): string {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvText(rows: string[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

/** A file name from a title: lower case, words joined by hyphens. */
export function fileName(title: string, ext: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'tool'}.${ext}`;
}

export interface ToolbarOptions {
  root: HTMLElement;
  /** localStorage key without "bb:". */
  key: string;
  /** Name for downloaded files, without extension. */
  name: () => string;
  /** The state to save and to download as JSON. */
  state: () => unknown;
  /** Rows for the CSV download, when the tool offers one. */
  csv?: () => string[][];
  /** Put the worked example back. */
  reset: () => void;
  /** Load a saved file; return an error message, or null when it worked. */
  load?: (data: unknown) => string | null;
}

/**
 * Wires the toolbar inside `root` and returns `changed()`, which a tool calls
 * after every change to save the work and update the status line.
 */
export function bindToolbar(o: ToolbarOptions): { changed: (say?: string) => void } {
  const bar = o.root.querySelector<HTMLElement>('[data-toolbar]');
  const status = bar?.querySelector<HTMLElement>('[data-save-status]') ?? null;
  const live = o.root.querySelector<HTMLElement>('[data-status]');
  const setStatus = (text: string) => {
    if (status) status.textContent = text;
  };
  const time = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const changed = (say?: string) => {
    const ok = save(o.key, o.state());
    setStatus(ok ? `Saved on this device at ${time()}.` : 'This browser is not keeping your changes, so download a copy to keep them.');
    if (say) announce(live, say);
  };

  const resetBtn = bar?.querySelector<HTMLButtonElement>('[data-tool="reset"]');
  if (resetBtn) {
    const label = resetBtn.textContent ?? 'Reset';
    let armed = 0;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        resetBtn.textContent = label.startsWith('Clear') ? 'Confirm: clear everything' : 'Confirm: replace my work with the worked example';
        armed = window.setTimeout(() => {
          resetBtn.textContent = label;
          armed = 0;
        }, 5000);
        announce(live, label.startsWith('Clear') ? 'Press again to clear your work.' : 'Press again to replace your work with the worked example.');
        return;
      }
      window.clearTimeout(armed);
      armed = 0;
      resetBtn.textContent = label;
      forget(o.key);
      o.reset();
      setStatus(label.startsWith('Clear') ? 'Cleared. Your next change will be saved on this device.' : 'Showing the worked example. Your next change will be saved on this device.');
      announce(live, label.startsWith('Clear') ? 'Cleared.' : 'The worked example is back.');
    });
  }

  bar?.querySelector('[data-tool="json"]')?.addEventListener('click', () => {
    download(fileName(o.name(), 'json'), 'application/json', `${JSON.stringify(o.state(), null, 2)}\n`);
    announce(live, 'JSON file downloaded.');
  });

  bar?.querySelector('[data-tool="csv"]')?.addEventListener('click', () => {
    if (!o.csv) return;
    download(fileName(o.name(), 'csv'), 'text/csv', `${csvText(o.csv())}\r\n`);
    announce(live, 'CSV file downloaded.');
  });

  bar?.querySelector('[data-tool="print"]')?.addEventListener('click', () => window.print());

  const file = bar?.querySelector<HTMLInputElement>('[data-tool="import"]');
  file?.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f || !o.load) return;
    if (f.size > 500_000) {
      announce(live, 'That file is too large to be a saved chart from this tool.');
      setStatus('That file is too large to be one of this tool’s saved files.');
      file.value = '';
      return;
    }
    f.text()
      .then((t) => {
        let data: unknown;
        try {
          data = JSON.parse(t);
        } catch {
          data = undefined;
        }
        const problem = data === undefined ? 'That file is not a JSON file saved by this tool.' : o.load?.(data) ?? null;
        if (problem) {
          setStatus(problem);
          announce(live, problem);
        } else {
          changed(`Opened ${f.name}.`);
        }
      })
      .catch(() => setStatus('The file could not be read.'))
      .finally(() => {
        file.value = '';
      });
  });

  return { changed };
}
