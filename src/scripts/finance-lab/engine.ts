/**
 * The Financial Laboratory in the browser. Each calculator page renders its
 * default figures and results on the server; this engine makes the inputs
 * live. It reads the form, checks it with the same functions the server
 * uses, rebuilds the report and replaces each region's HTML, so the page the
 * reader sees after typing is the page the server would have built.
 *
 * Results follow the typing within a quarter of a second, but the live region
 * speaks only once the reader pauses (or leaves a field), and never repeats
 * itself, so a screen reader is not interrupted at every keystroke.
 */
import { BUSINESS, SETTINGS } from '../../lib/finance-lab/business';
import { cleanSettings, fillLabel } from '../../lib/finance-lab/fields';
import { regionsHtml, type Region } from '../../lib/finance-lab/render';
import type { LabReport, Problem, Raw, Settings } from '../../lib/finance-lab/types';
import { toCsv } from '../../lib/finance-lab/util';
import { announce, parseNumber } from '../ix';

export interface Read {
  raw: Raw;
  text: Record<string, string>;
}

export interface LabCalc {
  read: (root: HTMLElement) => Read;
  validate: (r: Read) => Problem[];
  build: (r: Read, s: Settings) => LabReport;
  /** Puts the example figures back. Defaults to each field's data-default. */
  reset?: (root: HTMLElement) => void;
  /** The figures as URL parameters, so that a link can carry them; omit to offer no link. */
  toParams?: (r: Read) => URLSearchParams;
  /** Fills the form from URL parameters; returns true when it set anything. */
  fromParams?: (root: HTMLElement, p: URLSearchParams) => boolean;
}

const TYPE_DELAY = 250;
const CALM_DELAY = 1400;
const CHANGE_DELAY = 350;

/** Every numeric field (data-num) and text field (data-text) in the form. Radio buttons count only when checked. */
export function readSimple(root: HTMLElement): Read {
  const raw: Raw = {};
  const text: Record<string, string> = {};
  root.querySelectorAll<HTMLInputElement>('[data-fl-form] [data-num]').forEach((el) => {
    if (el.type === 'radio') {
      if (el.checked) raw[el.name] = Number(el.value);
      return;
    }
    raw[el.name] = parseNumber(el.value);
  });
  root.querySelectorAll<HTMLInputElement>('[data-fl-form] [data-text]').forEach((el) => (text[el.name] = el.value));
  return { raw, text };
}

/** Each field back to its example value. */
export function resetSimple(root: HTMLElement): void {
  root.querySelectorAll<HTMLInputElement>('[data-fl-form] [data-default]').forEach((el) => {
    if (el.type === 'radio') el.checked = el.value === el.dataset.default;
    else el.value = el.dataset.default ?? '';
  });
}

/** The figures of a form of plain fields as URL parameters. */
export function simpleToParams(r: Read): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(r.raw)) if (v !== null) p.set(k, String(v));
  for (const [k, v] of Object.entries(r.text)) p.set(k, v);
  return p;
}

export function simpleFromParams(root: HTMLElement, p: URLSearchParams): boolean {
  let set = false;
  root.querySelectorAll<HTMLInputElement>('[data-fl-form] [data-num], [data-fl-form] [data-text]').forEach((el) => {
    const v = p.get(el.name);
    if (v === null) return;
    if (el.type === 'radio') el.checked = el.value === v;
    else if (el.dataset.num !== undefined && parseNumber(v) === null) return;
    else el.value = v.slice(0, 80);
    set = true;
  });
  return set;
}

const SETTING_PARAMS: Record<keyof Settings, string> = { currency: 'cur', unit: 'unit', units: 'units', period: 'per' };

export function mount(root: HTMLElement, calc: LabCalc): { refresh: (prefix?: string) => void } {
  const name = root.dataset.name ?? 'Calculator';
  const id = root.dataset.calc ?? 'calculator';
  const status = root.querySelector<HTMLElement>('[data-status]');
  const source = root.querySelector<HTMLElement>('[data-source]');
  const regions = new Map<Region, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-region]').forEach((el) => regions.set(el.dataset.region as Region, el));
  let report: LabReport | null = null;
  let typeTimer = 0;
  let calmTimer = 0;
  let lastSaid = '';

  const settingEl = (k: keyof Settings) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-setting="${k}"]`);
  const readSettings = (): Settings =>
    cleanSettings({ currency: settingEl('currency')?.value, unit: settingEl('unit')?.value, units: settingEl('units')?.value, period: settingEl('period')?.value }, SETTINGS);

  const snapshot = () => JSON.stringify([calc.read(root), readSettings()]);
  const example = snapshot();

  const say = (msg: string, delay: number) => {
    window.clearTimeout(calmTimer);
    calmTimer = window.setTimeout(() => {
      if (msg && msg !== lastSaid) {
        announce(status, msg);
        lastSaid = msg;
      }
    }, delay);
  };

  const applyWords = (s: Settings) => {
    root.querySelectorAll<HTMLElement>('[data-tpl]').forEach((el) => (el.textContent = fillLabel(el.dataset.tpl ?? '', s)));
    root.querySelectorAll<HTMLElement>('[data-affix="currency"]').forEach((el) => (el.textContent = s.currency.trim()));
    root.querySelectorAll<HTMLElement>('[data-affix="units"]').forEach((el) => (el.textContent = s.units));
  };

  const showProblems = (problems: Problem[]) => {
    root.querySelectorAll<HTMLElement>('[data-err]').forEach((el) => (el.textContent = ''));
    root.querySelectorAll<HTMLElement>('[data-fl-form] [aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
    const loose: string[] = [];
    for (const p of problems) {
      const field = root.querySelector<HTMLElement>(`[data-fl-form] [name="${CSS.escape(p.field)}"]`);
      field?.setAttribute('aria-invalid', 'true');
      const err = root.querySelector<HTMLElement>(`[data-err="${CSS.escape(p.field)}"]`);
      if (err) err.textContent = p.message;
      else loose.push(p.message);
    }
    const general = root.querySelector<HTMLElement>('[data-err-list]');
    if (general) {
      general.innerHTML = loose.map((m) => `<li>${m.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)}</li>`).join('');
      general.hidden = loose.length === 0;
    }
  };

  /** Replaces a region's HTML, keeping any disclosure the reader has opened inside it. */
  const fill = (el: HTMLElement, html: string) => {
    const open = [...el.querySelectorAll('details')].map((d) => d.open);
    el.innerHTML = html;
    el.querySelectorAll('details').forEach((d, k) => {
      if (open[k]) d.open = true;
    });
  };

  /** Rebuilds the page; calmDelay is when the live region speaks, or null for not at all (the first render). */
  const update = (calmDelay: number | null = CALM_DELAY, prefix = '') => {
    const r = calc.read(root);
    const s = readSettings();
    applyWords(s);
    const problems = calc.validate(r);
    showProblems(problems);
    if (problems.length) {
      root.classList.add('is-invalid');
      const first = problems[0]?.message ?? '';
      if (calmDelay !== null) say(`${prefix ? `${prefix} ` : ''}${problems.length === 1 ? `Check the figures. ${first}` : `Check the figures: ${problems.length} need attention. ${first}`}`, calmDelay);
      return;
    }
    root.classList.remove('is-invalid');
    report = calc.build(r, s);
    const html = regionsHtml(report, name);
    regions.forEach((el, key) => fill(el, html[key] ?? ''));
    const mine = snapshot() !== example;
    if (source) source.textContent = mine ? 'Your own figures.' : `Example figures: ${BUSINESS.name}, a fictional business. Simulated data.`;
    root.classList.toggle('is-yours', mine);
    // Links to the other calculators in the group carry the figures with them.
    if (calc.toParams) {
      const q = withSettings(calc.toParams(r), s).toString();
      // The links sit in the page's "Learn more" section, outside the calculator; a page holds one calculator.
      document.querySelectorAll<HTMLAnchorElement>('a[data-carry]').forEach((a) => (a.href = `${a.dataset.carry}${mine && q ? `?${q}` : ''}`));
    }
    if (calmDelay !== null) say(`${prefix ? `${prefix} ` : ''}${report.announce}`, calmDelay);
  };

  const withSettings = (p: URLSearchParams, s: Settings) => {
    (Object.keys(SETTING_PARAMS) as Array<keyof Settings>).forEach((k) => {
      if (settingEl(k) && s[k] !== SETTINGS[k]) p.set(SETTING_PARAMS[k], s[k]);
    });
    return p;
  };

  const schedule = (delay: number, calm: number) => {
    window.clearTimeout(typeTimer);
    typeTimer = window.setTimeout(() => update(calm), delay);
  };

  root.addEventListener('input', (e) => {
    if ((e.target as HTMLElement).closest('[data-fl-form]')) schedule(TYPE_DELAY, CALM_DELAY);
  });
  root.addEventListener('change', (e) => {
    if ((e.target as HTMLElement).closest('[data-fl-form]')) schedule(0, CHANGE_DELAY);
  });
  root.querySelector('[data-fl-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    schedule(0, 0);
  });

  const download = () => {
    if (!report) return;
    const mine = snapshot() !== example;
    const rows: Array<Array<string | number>> = [
      ['Section', 'Item', 'Value', 'Unit or note'],
      ['Calculator', name, '', ''],
      ['Figures', mine ? 'Entered by the reader' : `Example: ${BUSINESS.name} (fictional; simulated data)`, '', ''],
      ['Source', 'The Business Brief, Financial Laboratory', '', ''],
      ...report.csv,
    ];
    // A byte order mark first, so spreadsheet programs read the currency symbols correctly.
    const blob = new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('The figures and results have been downloaded as a CSV file.', 0);
  };

  const copyLink = async () => {
    if (!calc.toParams) return;
    const q = withSettings(calc.toParams(calc.read(root)), readSettings()).toString();
    const url = `${window.location.origin}${window.location.pathname}${q ? `?${q}` : ''}`;
    const out = root.querySelector<HTMLInputElement>('[data-link-out]');
    try {
      await navigator.clipboard.writeText(url);
      if (out) out.hidden = true;
      say('A link to these figures has been copied.', 0);
    } catch {
      if (out) {
        out.hidden = false;
        out.value = url;
        out.select();
      }
      say('Copying is blocked in this browser. The link is in the box below the buttons; select it and copy it.', 0);
    }
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn || !root.contains(btn)) return;
    const act = btn.dataset.act;
    if (act === 'reset') {
      (calc.reset ?? resetSimple)(root);
      (Object.keys(SETTINGS) as Array<keyof Settings>).forEach((k) => {
        const el = settingEl(k);
        if (el) el.value = SETTINGS[k];
      });
      lastSaid = '';
      update(0);
      say(`Back to the example figures for ${BUSINESS.name}. ${report?.announce ?? ''}`, 0);
    } else if (act === 'csv') download();
    else if (act === 'print') window.print();
    else if (act === 'link') void copyLink();
  });

  // Figures carried in the address, from a copied link or from another calculator.
  const params = new URLSearchParams(window.location.search);
  let fromLink = false;
  if (calc.fromParams && [...params.keys()].length) fromLink = calc.fromParams(root, params);
  (Object.keys(SETTING_PARAMS) as Array<keyof Settings>).forEach((k) => {
    const v = params.get(SETTING_PARAMS[k]);
    const el = settingEl(k);
    if (v !== null && el) {
      el.value = v.slice(0, 24);
      fromLink = true;
    }
  });
  update(fromLink ? CHANGE_DELAY : null);
  return { refresh: (prefix = '') => update(CHANGE_DELAY, prefix) };
}
