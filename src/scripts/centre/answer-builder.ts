/** The answer builder in the browser: fields for the chosen calculation, and the four stages redrawn as the figures change. */
import { each, escapeHtml, parseNumber } from '../ix';
import { CALCS, calcById } from '../../lib/answer-builder';

each('[data-ix="answer-builder"]', (root) => {
  const select = root.querySelector<HTMLSelectElement>('[data-calc]');
  const fieldsEl = root.querySelector<HTMLElement>('[data-fields]');
  const out = root.querySelector<HTMLElement>('[data-out]');
  if (!select || !fieldsEl || !out) return;
  const q = <T extends HTMLElement>(s: string) => out.querySelector<T>(s);

  const render = () => {
    const calc = calcById(select.value) ?? CALCS[0]!;
    const values: Record<string, number> = {};
    let bad = false;
    fieldsEl.querySelectorAll<HTMLInputElement>('input').forEach((i) => {
      const v = parseNumber(i.value);
      if (v === null) bad = true;
      values[i.dataset.id ?? ''] = v ?? 0;
    });
    const formula = q('[data-formula]');
    if (formula) formula.textContent = calc.formula;
    const errors = q('[data-errors]');
    if (errors) errors.innerHTML = calc.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('');
    const steps = out.querySelector('.ab__steps');
    const check = q('[data-check]');
    const meaning = q('[data-meaning]');
    const r = bad ? 'Enter a number in every box.' : calc.solve(values);
    if (!steps) return;
    if (typeof r === 'string') {
      steps.innerHTML = `<div><dt>Formula</dt><dd data-formula>${escapeHtml(calc.formula)}</dd></div><div><dt>Answer</dt><dd class="ab__error">${escapeHtml(r)}</dd></div>`;
      if (check) check.textContent = '';
      if (meaning) meaning.textContent = '';
      return;
    }
    steps.innerHTML = [
      `<div><dt>Formula</dt><dd data-formula>${escapeHtml(calc.formula)}</dd></div>`,
      `<div><dt>Substitute</dt><dd>${escapeHtml(r.substitution)}</dd></div>`,
      `<div><dt>Working</dt><dd>${r.working.map((w) => `<span>${escapeHtml(w)}</span>`).join('')}</dd></div>`,
      `<div class="ab__answer"><dt>Answer</dt><dd>${escapeHtml(r.answer)}</dd></div>`,
    ].join('');
    if (check) check.textContent = r.check ?? '';
    if (meaning) meaning.textContent = r.meaning ?? '';
  };

  const buildFields = () => {
    const calc = calcById(select.value) ?? CALCS[0]!;
    fieldsEl.innerHTML = calc.fields
      .map((f) => `<label><span>${escapeHtml(f.label)}</span><input type="text" inputmode="decimal" data-id="${escapeHtml(f.id)}" value="${f.value}" /></label>`)
      .join('');
    fieldsEl.querySelectorAll('input').forEach((i) => i.addEventListener('input', render));
    render();
  };

  select.addEventListener('change', buildFields);
  buildFields();
});
