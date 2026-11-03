/** The customer persona creator in the browser: channels to add and remove, the card redrawn, saving and export. */
import { normalizePersona, personaChecks, personaCsvRows, personaMarkdown, splitLines, type PersonaState, type Use } from '../../lib/market-persona';
import { channelRowHtml, personaCardHtml } from '../../lib/market-persona-view';
import { checksHtml } from '../../lib/market-view';
import { announce, each, readConfig } from '../ix';
import { fieldValue, fill, mountKit } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: PersonaState;
}

each('[data-ix="persona"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const rows = root.querySelector<HTMLElement>('[data-rows]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !rows) return;
  let timer = 0;

  const read = (): PersonaState => ({
    business: cfg.defaults.business,
    name: fieldValue(form, 'name'),
    age: fieldValue(form, 'age'),
    occupation: fieldValue(form, 'occupation'),
    location: fieldValue(form, 'location'),
    segment: fieldValue(form, 'segment'),
    quote: fieldValue(form, 'quote'),
    background: fieldValue(form, 'background'),
    needs: splitLines(fieldValue(form, 'needs')),
    pains: splitLines(fieldValue(form, 'pains')),
    behaviour: splitLines(fieldValue(form, 'behaviour')),
    channels: [...rows.querySelectorAll<HTMLElement>('[data-row]')]
      .map((el) => ({ name: fieldValue(el, 'name').trim(), use: (fieldValue(el, 'use') || 'medium') as Use, note: fieldValue(el, 'note') }))
      .filter((c) => c.name),
    objections: splitLines(fieldValue(form, 'objections'), 6),
    winners: splitLines(fieldValue(form, 'winners'), 6),
    basis: (['research', 'mixed', 'assumption'] as const).find((b) => b === fieldValue(form, 'basis')) ?? 'mixed',
    evidence: fieldValue(form, 'evidence'),
  });

  const render = (p: PersonaState) => {
    fill(root, '[data-card]', personaCardHtml(p));
    fill(root, '[data-checks]', checksHtml(personaChecks(p)));
  };

  /** Rows as typed, keeping a channel row the reader has added but not named yet. */
  const rowsAsTyped = () => [...rows.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({ name: fieldValue(el, 'name'), use: (fieldValue(el, 'use') || 'medium') as Use, note: fieldValue(el, 'note') }));
  const drawRows = (chs: PersonaState['channels']) => {
    rows.innerHTML = chs.map((c, i) => channelRowHtml(c, i, uid)).join('');
  };

  const apply = (p: PersonaState) => {
    const set = (f: string, v: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-f="${f}"]`);
      if (el) el.value = v;
    };
    (['name', 'age', 'occupation', 'location', 'segment', 'quote', 'background', 'basis', 'evidence'] as const).forEach((k) => set(k, p[k]));
    (['needs', 'pains', 'behaviour', 'objections', 'winners'] as const).forEach((k) => set(k, p[k].join('\n')));
    drawRows(p.channels);
    render(p);
  };

  const kit = mountKit<PersonaState>({
    root,
    slug: cfg.slug,
    name: 'Persona',
    defaults: cfg.defaults,
    normalize: normalizePersona,
    read,
    apply,
    csv: personaCsvRows,
    text: personaMarkdown,
    textFile: { ext: 'md', mime: 'text/markdown;charset=utf-8', make: personaMarkdown },
  });

  const onEdit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const p = read();
      render(p);
      const n = personaChecks(p).filter((c) => c.level === 'conflict' || c.level === 'tension').length;
      announce(status, `Persona card updated. ${n ? `${n} ${n === 1 ? 'check needs' : 'checks need'} attention.` : 'No checks need attention.'}`);
    }, 300);
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const chs = rowsAsTyped();
    if (chs.length >= 10) return;
    chs.push({ name: '', use: 'medium', note: '' });
    drawRows(chs);
    root.querySelector<HTMLInputElement>(`#${uid}-ch-${chs.length - 1}-name`)?.focus();
    announce(status, `Channel ${chs.length} added. Name it and say how much they use it.`);
  });
  rows.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    if (!btn) return;
    const i = Number(btn.closest<HTMLElement>('[data-row]')?.dataset.row ?? -1);
    const chs = rowsAsTyped().filter((_, k) => k !== i);
    drawRows(chs);
    render(read());
    kit.changed();
    root.querySelector<HTMLButtonElement>('[data-add]')?.focus();
    announce(status, 'Channel removed.');
  });
});
