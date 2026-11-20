/**
 * The Stakeholder Impact Simulator in the browser: the reader's choice of
 * decision and settings redraws the impact, the trade-offs, the grid and the
 * prompts with the same code the server used for the worked example. The
 * choice is kept in the address (so it can be shared) and, once the reader
 * changes something, in bb:stakeholder-impact with the reader's evaluation.
 */
import { DECISIONS, DECISION_IDS, decisionById } from '../lib/stakeholder-impact/decisions';
import { DEFAULT_SETTINGS, NOTE_MAX, PARAM_IDS, STORAGE_KEY, readSaved, readSettings, simulate, type Saved, type Settings } from '../lib/stakeholder-impact/model';
import { gridListHtml, gridSvg, impactHtml, promptsHtml, tradeoffsHtml } from '../lib/stakeholder-impact/render';
import { announce, each, escapeHtml, readConfig } from './ix';
import { readItem, writeItem } from './storage';

interface Config {
  subtopics: Record<string, { title: string; href: string; hl: boolean }>;
}

each('[data-ix="stakeholder-impact"]', (root) => {
  const cfg = readConfig<Config>(root);
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const status = $('[data-status]');
  const select = $<HTMLSelectElement>('[data-decision]');
  const note = $<HTMLTextAreaElement>('[data-note]');
  if (!select) throw new Error('Stakeholder impact: no decision control');

  const saved: Saved = readSaved(readItem(STORAGE_KEY), DECISION_IDS);
  const params = new URLSearchParams(location.search);
  const fromAddress = params.has('d') || PARAM_IDS.some((k) => params.has(k));
  let decisionId = fromAddress ? (decisionById(params.get('d') ?? '')?.id ?? DECISIONS[0]!.id) : saved.decision;
  let settings: Settings = fromAddress ? readSettings(Object.fromEntries(PARAM_IDS.map((k) => [k, params.get(k)])), DEFAULT_SETTINGS) : saved.settings;
  const notes: Record<string, string> = { ...saved.notes };
  // Nothing is written until the reader changes something.
  let touched = false;

  const serves = (codes: string[]) =>
    ['1.4', ...codes]
      .map((code) => cfg.subtopics[code])
      .map((s, i) => (s ? `<a href="${escapeHtml(s.href)}">${escapeHtml(`${['1.4', ...codes][i]} ${s.title}`)}</a>${s.hl ? ' (HL)' : ''}` : ''))
      .filter(Boolean)
      .join(', ');

  const save = () => {
    if (!touched) return;
    const d = decisionById(decisionId)!;
    const value: Saved = { ...saved, decision: decisionId, settings, notes, headline: simulate(d, settings).headline, savedAt: new Date().toISOString() };
    writeItem(STORAGE_KEY, JSON.stringify(value));
  };

  const writeAddress = () => {
    const q = new URLSearchParams();
    q.set('d', decisionId);
    for (const k of PARAM_IDS) q.set(k, settings[k]);
    history.replaceState(history.state, '', `${location.pathname}?${q.toString()}${location.hash}`);
  };

  const draw = (say: boolean) => {
    const d = decisionById(decisionId)!;
    const sim = simulate(d, settings);
    select.value = d.id;
    for (const k of PARAM_IDS) {
      root.querySelectorAll<HTMLInputElement>(`input[name="si-${k}"]`).forEach((r) => (r.checked = r.value === settings[k]));
    }
    const set = (sel: string, text: string) => {
      const el = $(sel);
      if (el) el.textContent = text;
    };
    set('[data-business]', d.business);
    set('[data-place]', d.place);
    set('[data-brief-text]', d.brief);
    set('[data-scale-text]', d.scales[settings.scale]);
    set('[data-headline]', sim.headline);
    const html = (sel: string, h: string) => {
      const el = $(sel);
      if (el) el.innerHTML = h;
    };
    html('[data-serves]', serves(d.subtopics));
    html('[data-impact]', impactHtml(sim));
    html('[data-tradeoffs]', tradeoffsHtml(sim));
    html('[data-grid]', gridSvg(sim, 'si-grid'));
    html('[data-quads]', gridListHtml(sim));
    html('[data-prompts]', promptsHtml(sim));
    if (note) {
      note.value = notes[d.id] ?? '';
      const label = root.querySelector<HTMLLabelElement>('label[for="si-note"]');
      if (label) label.textContent = `Your evaluation of: ${d.title.toLowerCase()} at ${d.business}`;
    }
    if (say) announce(status, sim.headline);
  };

  select.addEventListener('change', () => {
    decisionId = decisionById(select.value)?.id ?? decisionId;
    touched = true;
    draw(true);
    writeAddress();
    save();
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type !== 'radio' || !t.name.startsWith('si-')) return;
    const k = t.name.slice(3) as keyof Settings;
    if (!PARAM_IDS.includes(k)) return;
    settings = readSettings({ ...settings, [k]: t.value }, settings);
    touched = true;
    draw(true);
    writeAddress();
    save();
  });

  note?.addEventListener('input', () => {
    notes[decisionId] = note.value.slice(0, NOTE_MAX);
    touched = true;
    save();
  });

  // The form only redraws; it never submits.
  $('[data-controls]')?.addEventListener('submit', (e) => e.preventDefault());

  draw(false);
  if (fromAddress) writeAddress();
});
