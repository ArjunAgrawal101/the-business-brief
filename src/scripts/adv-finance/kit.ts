/**
 * What the four advanced tools share in the browser. Each page renders its
 * worked example on the server; this kit makes it live in the way the
 * Financial Laboratory is live: results follow the typing within a quarter
 * of a second, the live region speaks once the reader pauses and never
 * repeats itself, and every problem sits beside its field. It also keeps the
 * reader's figures in this browser (under a "bb:" key declared on the privacy
 * page), only once the reader has changed something, and offers a reset to
 * the example, a CSV of the figures and results, and printing. Storage never
 * throws: when it is blocked the tool still works for the visit and says so.
 */
import { BUSINESS } from '../../lib/adv-finance/business';
import { readKept, type Kept } from '../../lib/adv-finance/state';
import { toCsv } from '../../lib/finance-lab/util';
import type { Problem } from '../../lib/finance-lab/types';
import { announce } from '../ix';

export interface Rendered {
  problems: Problem[];
  regions?: Record<string, string>;
  announce?: string;
  /** One line for the dashboard: what the work shows. */
  summary?: string;
  csv?: Array<Array<string | number>>;
}

export interface ToolOptions<F> {
  root: HTMLElement;
  /** The storage key without "bb:". */
  key: string;
  title: string;
  example: F;
  read: () => F;
  write: (form: F) => void;
  parse: (v: unknown) => F | null;
  render: (form: F) => Rendered;
  csvName: string;
}

const TYPE_DELAY = 250;
const CALM_DELAY = 1400;
const CHANGE_DELAY = 350;

function load(key: string): string | null {
  try {
    return localStorage.getItem(`bb:${key}`);
  } catch {
    return null;
  }
}

function keep(key: string, value: unknown): boolean {
  try {
    const text = JSON.stringify(value);
    localStorage.setItem(`bb:${key}`, text);
    return localStorage.getItem(`bb:${key}`) === text;
  } catch {
    return false;
  }
}

function forget(key: string): void {
  try {
    localStorage.removeItem(`bb:${key}`);
  } catch {
    /* nothing to remove */
  }
}

const escapeText = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export function mountTool<F>(o: ToolOptions<F>): { refresh: (prefix?: string) => void; changed: () => void } {
  const { root } = o;
  const status = root.querySelector<HTMLElement>('[data-status]');
  const saved = root.querySelector<HTMLElement>('[data-save-status]');
  const source = root.querySelector<HTMLElement>('[data-source]');
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-act="reset"]');
  const resetLabel = resetBtn?.textContent ?? 'Reset to the example';
  const exampleText = JSON.stringify(o.example);
  let touched = false;
  let typeTimer = 0;
  let calmTimer = 0;
  let armed = 0;
  let lastSaid = '';
  let last: Rendered | null = null;
  let summary = '';

  const say = (msg: string, delay: number) => {
    window.clearTimeout(calmTimer);
    calmTimer = window.setTimeout(() => {
      if (msg && msg !== lastSaid) {
        announce(status, msg);
        lastSaid = msg;
      }
    }, delay);
  };
  const setSaved = (text: string) => {
    if (saved) saved.textContent = text;
  };
  const time = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const showProblems = (problems: Problem[]) => {
    root.querySelectorAll<HTMLElement>('[data-err]').forEach((el) => (el.textContent = ''));
    root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
    const loose: string[] = [];
    let firstField: HTMLElement | null = null;
    for (const p of problems) {
      const field = root.querySelector<HTMLElement>(`[name="${CSS.escape(p.field)}"]`);
      field?.setAttribute('aria-invalid', 'true');
      firstField ??= field;
      const err = root.querySelector<HTMLElement>(`[data-err="${CSS.escape(p.field)}"]`);
      if (err && !err.textContent) err.textContent = p.message;
      else loose.push(p.message);
    }
    const list = root.querySelector<HTMLElement>('[data-err-list]');
    if (list) {
      list.innerHTML = loose.map((m) => `<li>${escapeText(m)}</li>`).join('');
      list.hidden = loose.length === 0;
    }
    // A problem inside a closed group of fields opens the group, so the message can be seen.
    const group = firstField?.closest('details');
    if (group && !group.open) group.open = true;
  };

  /** Replaces a region's HTML, keeping open any disclosure the reader had opened in it. */
  const fill = (el: HTMLElement, html: string) => {
    const open = [...el.querySelectorAll('details')].map((d) => d.open);
    el.innerHTML = html;
    el.querySelectorAll('details').forEach((d, k) => {
      if (open[k] !== undefined) d.open = open[k] as boolean;
    });
  };

  const save = () => {
    if (!touched) return;
    const form = o.read();
    const kept: Kept<F> = { v: 1, title: o.title, href: window.location.pathname, headline: summary, savedAt: new Date().toISOString(), form };
    setSaved(keep(o.key, kept) ? `Your figures are kept in this browser (saved at ${time()}). Nothing is sent anywhere.` : 'This browser is not keeping your figures, so download the CSV to keep them.');
  };

  /** Rebuilds the page from the form; `persist` is false when nothing has changed, as when saved work is first restored. */
  const update = (calmDelay: number | null = CALM_DELAY, prefix = '', persist = true) => {
    const form = o.read();
    const r = o.render(form);
    showProblems(r.problems);
    if (r.problems.length) {
      root.classList.add('is-invalid');
      const first = r.problems[0]?.message ?? '';
      if (calmDelay !== null) say(`${prefix ? `${prefix} ` : ''}${r.problems.length === 1 ? `Check the figures. ${first}` : `Check the figures: ${r.problems.length} need attention. ${first}`}`, calmDelay);
      if (persist) save();
      return;
    }
    root.classList.remove('is-invalid');
    last = r;
    summary = r.summary ?? summary;
    const regions = r.regions ?? {};
    root.querySelectorAll<HTMLElement>('[data-region]').forEach((el) => {
      const html = regions[el.dataset.region ?? ''];
      if (html !== undefined) fill(el, html);
    });
    const mine = JSON.stringify(form) !== exampleText;
    if (source) source.textContent = mine ? 'Your own figures.' : `Example figures: ${BUSINESS.name}, a fictional business. Simulated data.`;
    root.classList.toggle('is-yours', mine);
    if (calmDelay !== null) say(`${prefix ? `${prefix} ` : ''}${r.announce ?? ''}`, calmDelay);
    if (persist) save();
  };

  const schedule = (delay: number, calm: number) => {
    window.clearTimeout(typeTimer);
    typeTimer = window.setTimeout(() => update(calm), delay);
  };

  root.addEventListener('input', (e) => {
    if (!(e.target as HTMLElement).closest('[data-af-form], [data-af-view]')) return;
    touched = true;
    schedule(TYPE_DELAY, CALM_DELAY);
  });
  root.addEventListener('change', (e) => {
    if (!(e.target as HTMLElement).closest('[data-af-form], [data-af-view]')) return;
    touched = true;
    schedule(0, CHANGE_DELAY);
  });
  root.querySelectorAll('form[data-af-form]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      schedule(0, 0);
    }),
  );

  const download = () => {
    if (!last?.csv) return;
    const mine = JSON.stringify(o.read()) !== exampleText;
    const rows: Array<Array<string | number>> = [
      ['Section', 'Item', 'Value', 'Unit or note'],
      ['Tool', o.title, '', 'Advanced financial analysis, beyond the IB course'],
      ['Figures', mine ? 'Entered by the reader' : `Example: ${BUSINESS.name} (fictional; simulated data)`, '', ''],
      ['Source', 'The Business Brief, Finance Desk', '', ''],
      ...last.csv,
    ];
    // A byte order mark first, so spreadsheet programs read the currency symbols correctly.
    const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = o.csvName;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('The figures and results have been downloaded as a CSV file.', 0);
  };

  const reset = () => {
    if (touched && resetBtn && !armed) {
      resetBtn.textContent = 'Confirm: replace my figures with the example';
      armed = window.setTimeout(() => {
        resetBtn.textContent = resetLabel;
        armed = 0;
      }, 5000);
      say('Press again to replace your figures with the example.', 0);
      return;
    }
    window.clearTimeout(armed);
    armed = 0;
    if (resetBtn) resetBtn.textContent = resetLabel;
    forget(o.key);
    touched = false;
    o.write(o.example);
    lastSaid = '';
    update(null);
    setSaved('Showing the example. Your next change will be kept in this browser.');
    say(`Back to the example figures for ${BUSINESS.name}. ${last?.announce ?? ''}`, 0);
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn || !root.contains(btn)) return;
    if (btn.dataset.act === 'reset') reset();
    else if (btn.dataset.act === 'csv') download();
    else if (btn.dataset.act === 'print') window.print();
  });

  // Work kept from an earlier visit comes back first.
  const kept = readKept(load(o.key), o.parse);
  if (kept) {
    o.write(kept);
    touched = true;
    setSaved('Your figures from an earlier visit are back. Reset to return to the example.');
  }
  update(kept ? CHANGE_DELAY : null, '', false);
  return {
    refresh: (prefix = '') => {
      touched = true;
      update(CHANGE_DELAY, prefix);
    },
    changed: () => {
      touched = true;
    },
  };
}

/** Reads every field named in a form: numbers and text alike, as typed. */
export function fieldValues(root: HTMLElement, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) {
    const el = root.querySelector<HTMLInputElement>(`[data-af-form] [name="${CSS.escape(n)}"]`);
    out[n] = el?.value ?? '';
  }
  return out;
}

export function setFieldValues(root: HTMLElement, values: Record<string, string>): void {
  for (const [n, v] of Object.entries(values)) {
    const el = root.querySelector<HTMLInputElement>(`[data-af-form] [name="${CSS.escape(n)}"]`);
    if (el) el.value = v;
  }
}

/** The value of a checked radio button in a group, or a fallback. */
export function radioValue(root: HTMLElement, name: string, fallback: string): string {
  return root.querySelector<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]:checked`)?.value ?? fallback;
}

export function setRadio(root: HTMLElement, name: string, value: string): void {
  root.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`).forEach((r) => (r.checked = r.value === value));
}

/** The currency the reader chose. */
export function currencyValue(root: HTMLElement, fallback: string): string {
  return root.querySelector<HTMLSelectElement>('[data-setting="currency"]')?.value ?? fallback;
}

/** Puts the chosen currency beside every money field. */
export function applyCurrency(root: HTMLElement, currency: string): void {
  root.querySelectorAll<HTMLElement>('[data-affix="currency"]').forEach((el) => (el.textContent = currency.trim()));
}
