/**
 * The ratio desk in the browser: shows one ratio at a time, checks the
 * learner's answer, and applies a strategy to the second year's accounts,
 * re-rendering the statements, the summary and the panels from the same
 * functions the server used.
 */
import { buildWorking } from '../lib/finance';
import { applyAdjustments, diagnose, ratioInputs, RATIO_IDS, RATIOS, statementSlips, type RatioId, type Statement, type StatementField } from '../lib/ratios';
import { ratioChangeText, ratioFiguresHtml, statementsHtml, summaryRowsHtml, type DeskYears } from '../lib/ratio-view';
import { inline } from '../lib/markup';
import { workingHtml } from '../lib/render';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';

interface Config {
  uid: string;
  unit: string;
  entity: string;
  period: string;
  years: Array<{ label: string; short: string }>;
  openingStock: number;
  statements: Statement[];
  readings: Record<RatioId, { why: string; matters: string }>;
  strategies: Array<{ id: string; label: string; level: 'SL/HL' | 'HL'; note: string; adjust: Partial<Record<StatementField, number>> }>;
}

const isRatio = (v: string | undefined): v is RatioId => (RATIO_IDS as readonly string[]).includes(v ?? '');

each('[data-ix="ratio-desk"]', (root) => {
  const cfg = readConfig<Config>(root);
  const [s1, s2] = cfg.statements as [Statement, Statement];
  const labels: [string, string] = [cfg.years[0]?.short ?? '', cfg.years[1]?.short ?? ''];
  const status = root.querySelector<HTMLElement>('[data-status]');
  const note = root.querySelector<HTMLElement>('[data-strategy-note]');
  const defaultNote = note?.textContent ?? '';
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'));
  const radios = Array.from(root.querySelectorAll<HTMLInputElement>('.rd__pick input[type="radio"]'));
  let strategy: Config['strategies'][number] | null = null;
  let selected: RatioId = 'gross-profit-margin';

  const years = (): DeskYears => ({
    labels,
    statements: [s1, s2],
    openingStock: [cfg.openingStock, s1.stock],
    whatIf: strategy ? { label: strategy.label, statement: applyAdjustments(s2, strategy.adjust) } : undefined,
  });

  const level = () => (document.documentElement.getAttribute('data-level') === 'SL' ? 'SL' : 'HL');

  /* ---------- One ratio at a time ---------- */

  const show = (id: RatioId, focus = false) => {
    selected = id;
    panels.forEach((p) => (p.hidden = p.dataset.panel !== id));
    radios.forEach((r) => (r.checked = r.value === id));
    if (focus) root.querySelector<HTMLElement>(`[data-panel="${id}"] h4`)?.focus();
  };

  radios.forEach((r) =>
    r.addEventListener('change', () => {
      if (isRatio(r.value)) show(r.value);
    }),
  );

  /* ---------- Strategies ---------- */

  const renderAll = () => {
    const y = years();
    const set = (el: Element | null, html: string) => {
      if (el) el.innerHTML = html;
    };
    set(
      root.querySelector('[data-statements]'),
      statementsHtml(cfg.entity, cfg.unit, cfg.period, {
        heads: labels,
        statements: [s1, s2],
        whatIf: y.whatIf ? { head: `${labels[1]} with the strategy`, statement: y.whatIf.statement, base: s2 } : undefined,
      }),
    );
    set(root.querySelector('[data-summary]'), summaryRowsHtml(y));
    const head = root.querySelector<HTMLElement>('[data-whatif-head]');
    if (head) head.hidden = !y.whatIf;
    RATIO_IDS.forEach((id) => {
      set(root.querySelector(`[data-figs="${id}"]`), ratioFiguresHtml(id, y));
      const change = ratioChangeText(id, y);
      const ch = root.querySelector(`[data-change="${id}"]`);
      if (ch) ch.textContent = change;
      const r = cfg.readings[id];
      const w = buildWorking(id, ratioInputs(id, s2, s1.stock), cfg.unit);
      set(root.querySelector(`[data-working="${id}"]`), workingHtml(w, `${escapeHtml(change)} ${inline(r.why)}`, inline(r.matters)));
    });
  };

  const setStrategy = (s: Config['strategies'][number] | null) => {
    strategy = s;
    root.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach((b) => b.setAttribute('aria-pressed', String(!!s && b.dataset.strategy === s.id)));
    if (note) note.innerHTML = s ? `<strong>${escapeHtml(s.label)}.</strong> ${inline(s.note)}` : escapeHtml(defaultNote);
    renderAll();
    const def = RATIOS[selected];
    const y = years();
    announce(status, s ? `${s.label} applied. ${ratioChangeText(selected, y)}` : `Back to the accounts as published. ${def.name} shown.`);
  };

  root.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach((b) =>
    b.addEventListener('click', () => {
      const s = cfg.strategies.find((x) => x.id === b.dataset.strategy) ?? null;
      setStrategy(strategy && s && strategy.id === s.id ? null : s);
    }),
  );
  root.querySelector('[data-reset]')?.addEventListener('click', () => setStrategy(null));

  /* ---------- Checking an answer ---------- */

  const check = (id: RatioId) => {
    const input = root.querySelector<HTMLInputElement>(`[data-try="${id}"]`);
    const fb = root.querySelector<HTMLElement>(`[data-feedback="${id}"]`);
    if (!input || !fb) return;
    const raw = input.value.replace(/%|days?|times?/gi, '');
    const value = parseNumber(raw);
    if (value === null) {
      input.setAttribute('aria-invalid', 'true');
      fb.dataset.state = 'wrong';
      fb.textContent = 'Enter a number, for example 12.5.';
      return;
    }
    input.setAttribute('aria-invalid', 'false');
    const d = diagnose(id, value, ratioInputs(id, s2, s1.stock), statementSlips(id, s2));
    fb.dataset.state = d.correct ? 'right' : 'wrong';
    fb.textContent = d.message;
    const details = root.querySelector<HTMLDetailsElement>(`[data-working="${id}"]`)?.closest('details');
    if (details && d.correct) details.open = true;
  };

  root.querySelectorAll<HTMLButtonElement>('[data-check]').forEach((b) =>
    b.addEventListener('click', () => {
      if (isRatio(b.dataset.check)) check(b.dataset.check);
    }),
  );
  root.querySelectorAll<HTMLInputElement>('[data-try]').forEach((input) =>
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && isRatio(input.dataset.try)) {
        e.preventDefault();
        check(input.dataset.try);
      }
    }),
  );

  // Switching to SL hides the efficiency ratios: move off an HL ratio, and off an HL strategy.
  new MutationObserver(() => {
    if (level() === 'SL' && RATIOS[selected].level === 'HL') show('gross-profit-margin');
    if (level() === 'SL' && strategy?.level === 'HL') setStrategy(null);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-level'] });

  panels.forEach((p) => p.querySelector('h4')?.setAttribute('tabindex', '-1'));
  show(selected);
});
