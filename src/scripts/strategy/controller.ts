/**
 * The Strategy Studio tools in the browser. One controller serves all ten:
 * it reads each change into the tool's state, redraws the analysis with the
 * tool's own functions (the same ones that drew the worked example on the
 * server), keeps the work in local storage under bb:strategy:<tool>, and
 * offers export as text, CSV, JSON or a printed page, and import of a JSON
 * file saved earlier. Storage may be unavailable; the tool then still works
 * for the visit and says that nothing is being kept.
 */
import { announce, each, escapeHtml, parseNumber, readConfig, store } from '../ix';

export interface ToolSpec<S> {
  tool: string;
  normalize(raw: unknown): S;
  blank(): S;
  editorHtml(s: S, uid: string): string;
  outputsHtml(s: S, uid: string): string;
  headline(s: S): string;
  toText(s: S): string;
  toCsvText(s: S): string;
  fileName(s: S): string;
  /** Messages for fields, keyed by element id: an error marks the field invalid; a check is a prompt. */
  messages?(s: S, uid: string): Record<string, { error?: string; check?: string; invalid?: boolean }>;
  /** After a value changes. Return redraw: true when the change alters the editor's structure. */
  afterInput?(s: S, path: string[], el: HTMLElement): { redraw?: boolean; say?: string } | void;
  /** A button inside the editor. Return what to focus after the editor is redrawn, and what to announce. */
  action(s: S, act: string, data: DOMStringMap, uid: string): { focus?: string; say?: string } | null;
  /** Called once when the tool starts, for behaviour of its own (such as buttons inside the analysis). */
  init?(root: HTMLElement, api: ToolApi<S>): void;
}

export interface ToolApi<S> {
  state(): S;
  uid: string;
  config: Record<string, unknown>;
  say(text: string): void;
  redraw(focus?: string): void;
}

interface Config {
  tool: string;
  uid: string;
  example: unknown;
}

interface SavedFile {
  v: number;
  tool: string;
  savedAt: string;
  state: unknown;
  /** The analysis in a sentence, for the recommendation memo and the studio's home page. */
  headline?: string;
}

const VERSION = 1;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function storageWorks(): boolean {
  try {
    const k = 'bb:strategy:probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function getPath(target: unknown, path: string[]): unknown {
  let cur: unknown = target;
  for (const seg of path) {
    if (Array.isArray(cur)) cur = cur.find((x) => (x as { id?: unknown })?.id === seg);
    else if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[seg];
    else return undefined;
  }
  return cur;
}

function setPath(target: unknown, path: string[], value: unknown): void {
  const parent = getPath(target, path.slice(0, -1));
  const last = path[path.length - 1];
  if (!last || !parent || typeof parent !== 'object' || Array.isArray(parent)) return;
  (parent as Record<string, unknown>)[last] = value;
}

function readValue(el: Control, current: unknown): unknown {
  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    const set = new Set(Array.isArray(current) ? (current as string[]) : []);
    if (el.checked) set.add(el.value);
    else set.delete(el.value);
    return [...set];
  }
  if (el.dataset.t === 'n') return parseNumber(el.value);
  if (el.dataset.t === 'i') return Number.parseInt(el.value, 10);
  return el.value;
}

function download(name: string, type: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const clock = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function mount<S>(spec: ToolSpec<S>): void {
  each(`[data-ix="studio"][data-tool="${spec.tool}"]`, (root) => {
    const cfg = readConfig<Config>(root);
    const uid = cfg.uid;
    const example = spec.normalize(cfg.example);
    const key = `strategy:${spec.tool}`;
    const editor = root.querySelector<HTMLElement>('[data-editor]');
    const outputs = root.querySelector<HTMLElement>('[data-outputs]');
    const status = root.querySelector<HTMLElement>('[data-status]');
    const saveLine = root.querySelector<HTMLElement>('[data-save-status]');
    const fallback = root.querySelector<HTMLElement>('[data-copy-fallback]');
    const fallbackText = fallback?.querySelector<HTMLTextAreaElement>('textarea') ?? null;
    if (!editor || !outputs) throw new Error('Strategy Studio: the tool is missing its editor or its analysis');

    const keeps = storageWorks();
    const clone = (s: S): S => structuredClone(s);
    const same = (a: S, b: S) => JSON.stringify(a) === JSON.stringify(b);
    const saved = keeps ? store.get<SavedFile | null>(key, null) : null;
    let state: S = saved && saved.tool === spec.tool ? spec.normalize(saved.state) : clone(example);

    const setSaveLine = (text: string) => {
      if (saveLine) saveLine.textContent = text;
    };

    const drawMessages = () => {
      const msgs = spec.messages?.(state, uid) ?? {};
      editor.querySelectorAll<HTMLElement>('[data-err]').forEach((p) => {
        const id = p.id.replace(/-err$/, '');
        const m = msgs[id]?.error ?? '';
        p.textContent = m;
        const ctl = document.getElementById(id);
        if (!ctl || !('value' in ctl)) return;
        if (m || msgs[id]?.invalid) ctl.setAttribute('aria-invalid', 'true');
        else ctl.removeAttribute('aria-invalid');
      });
      // A field can be invalid because of a shared problem described elsewhere, such as probabilities that do not add up.
      Object.entries(msgs).forEach(([id, m]) => {
        if (!m.invalid || m.error) return;
        document.getElementById(id)?.setAttribute('aria-invalid', 'true');
      });
      editor.querySelectorAll<HTMLElement>('[data-chk]').forEach((p) => {
        const text = msgs[p.id.replace(/-chk$/, '')]?.check ?? '';
        p.innerHTML = text ? `<span class="sx-check__label">Check</span> ${escapeHtml(text)}` : '';
      });
    };

    const focusTarget = (target?: string) => {
      if (!target) return;
      const el = target.startsWith('[') || target.startsWith('.') ? editor.querySelector<HTMLElement>(target) : document.getElementById(target);
      if (el && !(el as HTMLButtonElement).disabled) el.focus();
      else editor.querySelector<HTMLElement>('input, select, textarea')?.focus();
    };

    const drawEditor = (focus?: string) => {
      const active = document.activeElement as HTMLElement | null;
      const keepId = focus ?? (active && editor.contains(active) ? active.id : '');
      const caret: [number | null, number | null] | null = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? [active.selectionStart, active.selectionEnd] : null;
      editor.innerHTML = spec.editorHtml(state, uid);
      drawMessages();
      if (!keepId) return;
      focusTarget(keepId);
      const el = document.getElementById(keepId);
      if (caret && el && el.id === active?.id && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        try {
          el.setSelectionRange(caret[0] ?? null, caret[1] ?? null);
        } catch {
          /* not a text field */
        }
      }
    };

    const drawOutputs = () => {
      outputs.innerHTML = spec.outputsHtml(state, uid);
      root.classList.toggle('is-own', !same(state, example));
    };

    const save = () => {
      if (!keeps) return;
      store.set(key, { v: VERSION, tool: spec.tool, savedAt: new Date().toISOString(), state, headline: spec.headline(state) } satisfies SavedFile);
      setSaveLine(`Saved on this device at ${clock(new Date())}.`);
    };

    let tOut = 0;
    let tSave = 0;
    let tSay = 0;
    const changed = (say = true) => {
      window.clearTimeout(tOut);
      tOut = window.setTimeout(drawOutputs, 120);
      window.clearTimeout(tSave);
      tSave = window.setTimeout(save, 300);
      if (say) {
        window.clearTimeout(tSay);
        tSay = window.setTimeout(() => announce(status, spec.headline(state)), 1400);
      }
    };
    const redrawAll = (focus?: string) => {
      drawEditor(focus);
      drawOutputs();
      save();
    };

    const onValue = (el: Control) => {
      const k = el.dataset.k;
      if (!k) return;
      const path = k.split('.');
      setPath(state, path, readValue(el, getPath(state, path)));
      const after = spec.afterInput?.(state, path, el);
      if (after?.redraw) drawEditor(el.id);
      else drawMessages();
      changed(!after?.say);
      if (after?.say) announce(status, after.say);
    };

    editor.addEventListener('input', (e) => {
      const t = e.target;
      if ((t instanceof HTMLInputElement && (t.type === 'text' || t.type === 'number')) || t instanceof HTMLTextAreaElement) onValue(t);
    });
    editor.addEventListener('change', (e) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && (t.type === 'checkbox' || t.type === 'radio'))) onValue(t);
    });
    editor.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
      if (!btn || !editor.contains(btn) || btn.disabled) return;
      const r = spec.action(state, btn.dataset.act ?? '', btn.dataset, uid);
      if (!r) return;
      redrawAll(r.focus);
      if (r.say) announce(status, r.say);
    });
    // Enter in a one-line field must not submit anything.
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type === 'text') e.preventDefault();
    });

    const replace = (next: S, message: string, focusFirst = false) => {
      state = next;
      redrawAll();
      if (focusFirst) editor.querySelector<HTMLElement>('input, select, textarea')?.focus();
      announce(status, message);
    };
    const confirmReplace = (what: string) => same(state, example) || window.confirm(`Replace your analysis with ${what}? Export it first if you want to keep it.`);

    const copy = async () => {
      const text = spec.toText(state);
      try {
        if (!navigator.clipboard) throw new Error('no clipboard');
        await navigator.clipboard.writeText(text);
        if (fallback) fallback.hidden = true;
        announce(status, 'The analysis is copied as plain text.');
        setSaveLine('Copied as plain text. Paste it into a document or an email.');
      } catch {
        if (fallback && fallbackText) {
          fallback.hidden = false;
          fallbackText.value = text;
          fallbackText.focus();
          fallbackText.select();
        }
        announce(status, 'This browser blocked copying. The text is selected in the box below the export buttons: copy it from there.');
      }
    };

    root.querySelectorAll<HTMLButtonElement>('[data-tool-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const act = b.dataset.toolAct;
        if (act === 'example') {
          if (confirmReplace('the worked example')) replace(clone(example), 'The worked example is restored.');
        } else if (act === 'blank') {
          if (confirmReplace('a blank analysis')) replace(spec.blank(), 'A blank analysis is ready. The first field has focus.', true);
        } else if (act === 'copy') {
          void copy();
        } else if (act === 'csv') {
          download(`${spec.fileName(state)}.csv`, 'text/csv;charset=utf-8', `\uFEFF${spec.toCsvText(state)}`);
          announce(status, 'The CSV file is downloading.');
        } else if (act === 'json') {
          download(`${spec.fileName(state)}.json`, 'application/json', JSON.stringify({ v: VERSION, tool: spec.tool, savedAt: new Date().toISOString(), state } satisfies SavedFile, null, 2));
          announce(status, 'The JSON file is downloading. Load it here later to carry on.');
        } else if (act === 'print') {
          window.print();
        }
      }),
    );

    const fileInput = root.querySelector<HTMLInputElement>('[data-import]');
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      try {
        if (file.size > 500_000) throw new Error('That file is too large to be a saved analysis.');
        const data = JSON.parse(await file.text()) as Partial<SavedFile>;
        if (!data || typeof data !== 'object' || !('state' in data)) throw new Error('That file is not a saved Strategy Studio analysis.');
        if (data.tool !== spec.tool) throw new Error(`That file was saved from ${data.tool ? `the ${String(data.tool)} tool` : 'another tool'}, not this one.`);
        if (!confirmReplace('the analysis in the file')) return;
        replace(spec.normalize(data.state), `Loaded the analysis from ${file.name}.`);
      } catch (err) {
        const msg = err instanceof SyntaxError ? 'That file is not valid JSON.' : err instanceof Error ? err.message : 'That file could not be read.';
        setSaveLine(msg);
        announce(status, msg);
      }
    });

    window.addEventListener('pagehide', save);
    spec.init?.(root, { state: () => state, uid, config: cfg as unknown as Record<string, unknown>, say: (t) => announce(status, t), redraw: (focus) => redrawAll(focus) });

    if (!keeps) setSaveLine('This browser is not keeping your work, because storage is blocked or full. Export it before you leave the page.');
    else if (saved && !same(state, example)) {
      const d = new Date(saved.savedAt);
      setSaveLine(`Your saved analysis${Number.isNaN(d.getTime()) ? '' : ` from ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`} is loaded.`);
    }
    else setSaveLine('Your work is kept on this device as you type.');
    if (!same(state, example)) {
      drawEditor();
      drawOutputs();
    } else drawMessages();
  });
}
