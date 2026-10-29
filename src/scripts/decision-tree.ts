import { decisionTreeSvg } from '../lib/charts';
import { evaluateTree, leaderRanges, type TreeOption } from '../lib/decision-tree';
import { predictionFeedback, rangesText, treeReading, treeTableHtml, treeWorkingsHtml } from '../lib/tree-view';
import { announce, each, escapeHtml, parseNumber, readConfig } from './ix';

interface Config {
  uid: string;
  currency: string;
  unit: string;
  options: TreeOption[];
  shared: boolean;
}

each('[data-ix="tree"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const lab = root.querySelector<HTMLElement>('[data-lab]');
  const feedback = root.querySelector<HTMLElement>('[data-prediction-feedback]');
  const slider = root.querySelector<HTMLInputElement>('[data-shared]');
  const pOut = root.querySelector<HTMLOutputElement>('[data-p-out]');
  const state = cfg.options[0]?.outcomes[0]?.label ?? 'the first outcome';
  if (!form || !lab) return;
  let current: TreeOption[] = structuredClone(cfg.options);
  let timer = 0;

  // Gate the results until the learner predicts or chooses to skip.
  lab.hidden = true;
  const ungate = () => {
    lab.hidden = false;
  };

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;

  const readForm = (): TreeOption[] =>
    cfg.options.map((op) => ({
      ...op,
      cost: parseNumber(field(`${op.id}-cost`)?.value ?? '') ?? NaN,
      outcomes: op.outcomes.map((o, k) => ({
        ...o,
        probability: parseNumber(field(`${op.id}-p${k}`)?.value ?? '') ?? NaN,
        payoff: parseNumber(field(`${op.id}-x${k}`)?.value ?? '') ?? NaN,
      })),
    }));

  const fillForm = (opts: TreeOption[]) =>
    opts.forEach((op) => {
      const c = field(`${op.id}-cost`);
      if (c) c.value = String(op.cost);
      op.outcomes.forEach((o, k) => {
        const p = field(`${op.id}-p${k}`);
        const x = field(`${op.id}-x${k}`);
        if (p) p.value = String(o.probability);
        if (x) x.value = String(o.payoff);
      });
    });

  const set = (sel: string, html: string) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.innerHTML = html;
  };

  const render = (say: boolean) => {
    const opts = readForm();
    const missing = opts.some((op) => !Number.isFinite(op.cost) || op.outcomes.some((o) => !Number.isFinite(o.probability) || !Number.isFinite(o.payoff)));
    opts.forEach((op) => {
      const el = root.querySelector<HTMLElement>(`[data-problems="${op.id}"]`);
      const bad = !Number.isFinite(op.cost) || op.outcomes.some((o) => !Number.isFinite(o.probability) || !Number.isFinite(o.payoff));
      if (el) el.textContent = bad ? 'Enter a number in every box.' : '';
    });
    if (missing) {
      if (say) announce(status, 'Enter a number in every box.');
      return;
    }
    current = opts;
    const tree = evaluateTree(opts);
    opts.forEach((op, k) => {
      const r = tree.options[k];
      const el = root.querySelector<HTMLElement>(`[data-problems="${op.id}"]`);
      if (el && r) el.textContent = r.problems.join(' ');
      op.outcomes.forEach((_, j) => field(`${op.id}-p${j}`)?.setAttribute('aria-invalid', r && !r.valid ? 'true' : 'false'));
    });
    set('[data-chart]', decisionTreeSvg(opts, tree.options, { currency: cfg.currency, unit: cfg.unit, id: `${cfg.uid}-chart` }));
    set('[data-table]', treeTableHtml(tree, opts, cfg.currency, cfg.unit));
    set('[data-reading]', escapeHtml(treeReading(opts, tree, cfg.currency, cfg.unit)));
    set('[data-workings]', treeWorkingsHtml(opts, tree, cfg.currency, cfg.unit));
    if (cfg.shared) set('[data-ranges]', escapeHtml(rangesText(leaderRanges(opts), state)));
    if (say) announce(status, treeReading(opts, tree, cfg.currency, cfg.unit));
  };

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t === slider) {
      const p = Number(slider.value);
      if (pOut) pOut.value = String(p);
      cfg.options.forEach((op) => {
        const a = field(`${op.id}-p0`);
        const b = field(`${op.id}-p1`);
        if (a) a.value = String(p);
        if (b) b.value = String(Math.round((1 - p) * 100) / 100);
      });
      render(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => render(true), 600);
      return;
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(true), 350);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    fillForm(cfg.options);
    const p0 = cfg.options[0]?.outcomes[0]?.probability ?? 0.5;
    if (slider) slider.value = String(p0);
    if (pOut) pOut.value = String(p0);
    render(true);
  });

  root.querySelector('[data-check-prediction]')?.addEventListener('click', () => {
    const picked = root.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-predict"]:checked`);
    if (!feedback) return;
    if (!picked) {
      feedback.hidden = false;
      feedback.className = 'feedback feedback--partial';
      feedback.innerHTML = '<p>Choose a route first.</p>';
      announce(status, 'Choose a route first.');
      return;
    }
    const tree = evaluateTree(current);
    const fb = predictionFeedback(picked.value, current, tree, cfg.currency, cfg.unit);
    feedback.hidden = false;
    feedback.className = `feedback feedback--${fb.verdict}`;
    feedback.innerHTML = fb.html;
    announce(status, feedback.textContent ?? '');
    ungate();
  });
  root.querySelector('[data-skip]')?.addEventListener('click', () => {
    ungate();
    root.querySelector<HTMLElement>('[data-lab-head]')?.focus();
    announce(status, 'Results shown.');
  });
});
