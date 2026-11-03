/**
 * Scenario choices in the browser: choosing an option shows its likely
 * consequence at once, and the pattern across the scenarios is read as the
 * reader goes (src/lib/scenarios.ts, src/lib/scenarios-view.ts).
 */
import { FIT_LABEL, choicesCsvRows, cleanChoices, readLeadership, readProduction, scoreChoices, type Scenario, type ScenarioOption } from '../lib/scenarios';
import { resultHtml, scoreFiguresHtml, summaryRowsHtml } from '../lib/scenarios-view';
import { announce, each, escapeHtml, readConfig } from './ix';
import { bindToolbar, loadSaved } from './tool-kit';

interface Config {
  uid: string;
  key: string;
  variant: 'leadership' | 'production';
  options: Array<ScenarioOption & { gist: string }>;
  scenarios: Array<Scenario & { debrief: string }>;
  noun: { one: string; many: string };
}

each('[data-ix="scenario-chooser"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const saved = loadSaved<{ choices?: unknown }>(cfg.key);
  let choices: Record<string, string> = cleanChoices(saved?.choices, cfg.scenarios, cfg.options);
  const titleOf = (id: string) => cfg.scenarios.find((s) => s.id === id)?.title ?? id;
  const set = (sel: string, html: string) => {
    const e = root.querySelector<HTMLElement>(sel);
    if (e) e.innerHTML = html;
  };

  const renderItem = (s: Scenario & { debrief: string }) => {
    const li = root.querySelector<HTMLElement>(`[data-scenario="${s.id}"]`);
    if (!li) return;
    const c = choices[s.id];
    li.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => (r.checked = r.value === c));
    const box = li.querySelector<HTMLElement>('[data-result]');
    if (box) {
      box.hidden = !c;
      box.innerHTML = c ? resultHtml(s, cfg.options, c) : '';
    }
  };

  const renderSummary = () => {
    const sc = scoreChoices(cfg.scenarios, cfg.options, choices);
    const read = cfg.variant === 'leadership' ? readLeadership(sc, cfg.options, titleOf) : readProduction(sc, cfg.options, titleOf);
    set('[data-figures]', scoreFiguresHtml(sc, cfg.noun));
    set('[data-interp]', escapeHtml(read.reading));
    set('[data-impl]', escapeHtml(read.implication || 'The pattern appears as you choose.'));
    set('[data-rows]', summaryRowsHtml(cfg.scenarios, cfg.options, choices));
    return { sc, read };
  };

  const bar = bindToolbar({
    root,
    key: cfg.key,
    name: () => (cfg.variant === 'leadership' ? 'leadership scenarios' : 'production methods'),
    state: () => ({ tool: cfg.variant === 'leadership' ? 'leadership-scenarios' : 'production-methods', choices }),
    csv: () => choicesCsvRows(cfg.scenarios, cfg.options, choices, { scenario: 'Situation', choice: cfg.variant === 'leadership' ? 'Style chosen' : 'Method chosen' }),
    reset: () => {
      choices = {};
      cfg.scenarios.forEach(renderItem);
      renderSummary();
    },
    load: (data) => {
      const raw = (data as { choices?: unknown } | null)?.choices;
      if (!raw || typeof raw !== 'object') return 'That file is not a set of choices saved by this tool.';
      choices = cleanChoices(raw, cfg.scenarios, cfg.options);
      cfg.scenarios.forEach(renderItem);
      renderSummary();
      return null;
    },
  });

  root.addEventListener('change', (e) => {
    const r = e.target as HTMLInputElement;
    if (r.type !== 'radio') return;
    const li = r.closest<HTMLElement>('[data-scenario]');
    const s = cfg.scenarios.find((x) => x.id === li?.dataset.scenario);
    if (!s) return;
    choices[s.id] = r.value;
    renderItem(s);
    const { sc } = renderSummary();
    const o = s.outcomes[r.value];
    const label = cfg.options.find((x) => x.id === r.value)?.label ?? r.value;
    bar.changed(o ? `${FIT_LABEL[o.fit]}: ${label}. ${o.headline}. ${sc.answered} of ${sc.total} answered.` : undefined);
  });

  cfg.scenarios.forEach(renderItem);
  renderSummary();
  if (Object.keys(choices).length) announce(status, `Your earlier choices are back: ${Object.keys(choices).length} of ${cfg.scenarios.length}.`);
});
