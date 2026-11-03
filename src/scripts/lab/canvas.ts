/** The Business Model Canvas builder in the browser: entries to add, edit and remove, the riskiest assumptions re-ranked as the learner types, storage on this device, and JSON files saved and opened. */
import { announce, each, readConfig, store } from '../ix';
import { canvasToJson, FILL_ORDER, MAX_ENTRIES_PER_BLOCK, parseCanvas, readCanvas, riskiest, summarize, type BlockId, type Canvas, type Entry } from '../../lib/lab/canvas';
import { boardHtml, riskiestHtml } from '../../lib/lab/render';
import { blockOrderMap, entryHtml } from '../../lib/lab/forms';
import { download, fileSlug, newId, saveSummary, stamp } from './kit';

interface Config {
  uid: string;
  labels: Record<BlockId, string>;
  example: Canvas;
}

const KEY = 'lab:canvas';
const order = blockOrderMap(FILL_ORDER);

each('[data-ix="lab-canvas"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const nameInput = root.querySelector<HTMLInputElement>('[data-name]');
  const fileInput = root.querySelector<HTMLInputElement>('[data-file]');
  const saved = store.get<{ canvas?: string } | null>(KEY, null);
  let canvas: Canvas = structuredClone(cfg.example);
  if (saved?.canvas) {
    const r = parseCanvas(saved.canvas);
    if (r.ok) canvas = r.canvas;
  }
  // Nothing is kept, and nothing is offered to the business plan, until the learner changes something.
  let touched = Boolean(saved?.canvas);
  let timer = 0;

  const drawBlock = (b: BlockId) => {
    const ol = root.querySelector<HTMLElement>(`[data-entries="${b}"]`);
    if (ol) ol.innerHTML = canvas.entries.filter((e) => e.block === b).map((e, i) => entryHtml(e, i + 1, cfg.uid, cfg.labels[b])).join('');
    const add = root.querySelector<HTMLButtonElement>(`[data-add="${b}"]`);
    if (add) add.disabled = canvas.entries.filter((e) => e.block === b).length >= MAX_ENTRIES_PER_BLOCK;
  };

  const drawAll = () => {
    FILL_ORDER.forEach(drawBlock);
    if (nameInput) nameInput.value = canvas.name;
  };

  const render = (say: boolean) => {
    if (touched) store.set(KEY, { canvas: canvasToJson(canvas, stamp()) });
    const top = riskiest(canvas);
    const r = readCanvas(canvas, cfg.labels);
    const set = (sel: string, html: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.innerHTML = html;
    };
    set('[data-riskiest]', riskiestHtml(top, cfg.labels));
    set('[data-board]', boardHtml(canvas, cfg.labels, order));
    const text = (sel: string, t: string) => {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.textContent = t;
    };
    text('[data-interp]', r.reading);
    text('[data-impl]', r.implication);
    text('[data-sheet-name]', canvas.name.trim() || 'Untitled canvas');
    const s = summarize(canvas);
    const texts = (b: BlockId) => canvas.entries.filter((e) => e.block === b && e.text.trim()).map((e) => e.text.trim());
    if (touched) saveSummary('canvas', {
      name: canvas.name.trim(),
      entries: s.entries,
      assumptions: s.assumptions,
      evidence: s.evidence,
      segments: texts('customer-segments'),
      propositions: texts('value-propositions'),
      riskiest: riskiest(canvas, 3).map((e) => ({ text: e.text.trim(), block: cfg.labels[e.block], risk: e.risk, note: e.note.trim() })),
    });
    if (say) announce(status, top[0] ? `Test first: ${top[0].text.trim()}, risk ${top[0].risk} of 5.` : r.reading);
  };

  drawAll();
  render(false);

  const entryOf = (el: HTMLElement): Entry | undefined => {
    const li = el.closest<HTMLElement>('[data-entry]');
    return canvas.entries.find((e) => e.id === li?.dataset.entry);
  };

  const later = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 800);
  };

  root.addEventListener('input', (e) => {
    touched = true;
    const t = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (t === nameInput) canvas.name = nameInput.value;
    else {
      const entry = entryOf(t);
      if (!entry) return;
      if (t.dataset.k === 'text') entry.text = t.value;
      if (t.dataset.k === 'note') entry.note = t.value;
    }
    render(false);
    later();
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    const entry = entryOf(t);
    if (!entry) return;
    touched = true;
    if (t.dataset.k === 'kind') {
      entry.kind = t.value === 'evidence' ? 'evidence' : 'assumption';
      const li = t.closest<HTMLElement>('[data-entry]');
      li?.classList.toggle('lab-entry--evidence', entry.kind === 'evidence');
      li?.classList.toggle('lab-entry--assumption', entry.kind === 'assumption');
      const noteLabel = li?.querySelector<HTMLLabelElement>('.lab-entry__note label');
      if (noteLabel) noteLabel.textContent = entry.kind === 'evidence' ? 'The evidence' : 'How you will test it';
    }
    if (t.dataset.k === 'risk') entry.risk = Math.min(5, Math.max(1, Number(t.value) || 3));
    render(true);
  });

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || !root.contains(b)) return;
    if (!b.matches('[data-json], [data-import], [data-print]')) touched = true;
    if (b.matches('[data-remove]')) {
      const entry = entryOf(b);
      if (!entry) return;
      const block = entry.block;
      const siblings = canvas.entries.filter((x) => x.block === block);
      const pos = siblings.indexOf(entry);
      canvas.entries = canvas.entries.filter((x) => x !== entry);
      drawBlock(block);
      render(false);
      const items = root.querySelectorAll<HTMLTextAreaElement>(`[data-entries="${block}"] textarea`);
      (items[Math.min(pos, items.length - 1)] ?? root.querySelector<HTMLButtonElement>(`[data-add="${block}"]`))?.focus();
      announce(status, `Removed the entry from ${cfg.labels[block]}.`);
    } else if (b.dataset.add) {
      const block = b.dataset.add as BlockId;
      if (canvas.entries.filter((x) => x.block === block).length >= MAX_ENTRIES_PER_BLOCK) return;
      const entry: Entry = { id: newId('e'), block, text: '', kind: 'assumption', risk: 3, note: '' };
      // Keep the canvas in fill order, so entries of a block stay together.
      const lastOfBlock = canvas.entries.map((x) => x.block).lastIndexOf(block);
      canvas.entries.splice(lastOfBlock + 1 || canvas.entries.length, 0, entry);
      drawBlock(block);
      render(false);
      root.querySelector<HTMLTextAreaElement>(`[data-entry="${entry.id}"] textarea`)?.focus();
    } else if (b.matches('[data-blank]')) {
      if (!window.confirm('Start a blank canvas? Your current canvas will be replaced; download it first if you want to keep it.')) return;
      canvas = { name: '', entries: [] };
      drawAll();
      render(true);
      nameInput?.focus();
    } else if (b.matches('[data-example]')) {
      if (!window.confirm("Load Refill Round's example canvas? Your current canvas will be replaced.")) return;
      canvas = structuredClone(cfg.example);
      drawAll();
      render(true);
    } else if (b.matches('[data-json]')) {
      download(canvasToJson(canvas, stamp()), `${fileSlug(canvas.name, 'business-model-canvas')}-canvas.json`, 'application/json');
      announce(status, 'The canvas was saved as a JSON file.');
    } else if (b.matches('[data-import]')) {
      fileInput?.click();
    } else if (b.matches('[data-print]')) {
      window.print();
    }
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      announce(status, 'That file is too large to be a canvas.');
      fileInput.value = '';
      return;
    }
    const r = parseCanvas(await file.text());
    fileInput.value = '';
    if (!r.ok) {
      announce(status, r.error);
      window.alert(r.error);
      return;
    }
    canvas = r.canvas;
    touched = true;
    drawAll();
    render(false);
    announce(status, `Opened ${canvas.name.trim() || 'the canvas'}: ${summarize(canvas).entries} entries.`);
  });
});
