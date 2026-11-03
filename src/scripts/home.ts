/**
 * The home page in the browser: the weekly briefing rotates to the reader's
 * own ISO week, and the break-even preview answers as the figures change.
 */
import { isoWeek } from '../lib/home';
import { calendarDate, caseOfTheWeek } from '../lib/case-vault';
import { previewChart, previewLines, previewModel, type PreviewInputs } from '../lib/home-preview';
import { fmtNumber } from '../lib/format';

/* ---------- The weekly briefing ---------- */
document.querySelectorAll<HTMLElement>('[data-rotate-root]').forEach((root) => {
  const week = isoWeek(new Date());
  root.querySelectorAll<HTMLElement>('[data-rotate]').forEach((box) => {
    const variants = [...box.querySelectorAll<HTMLElement>(':scope > [data-variant]')];
    if (!variants.length) return;
    // The case follows the Case Vault's rotation; the other features follow the week number.
    const show =
      box.dataset.rotateBy === 'vault'
        ? (caseOfTheWeek(variants.map((v) => v.dataset.id ?? ''), calendarDate(new Date()))?.position ?? 0)
        : week % variants.length;
    variants.forEach((v, i) => (v.hidden = i !== show));
  });
  const label = root.querySelector('[data-week-label]');
  if (label) label.textContent = `Week ${week} of ${new Date().getFullYear()}`;
});

/* ---------- The live break-even preview ---------- */
document.querySelectorAll<HTMLElement>('[data-preview]').forEach((root) => {
  const form = root.querySelector('form');
  const chart = root.querySelector<HTMLElement>('[data-preview-chart]');
  const lines = root.querySelector<HTMLElement>('[data-preview-lines]');
  const live = root.querySelector<HTMLElement>('[data-preview-live]');
  if (!form || !chart || !lines || !live) return;
  const read = (name: keyof PreviewInputs) => {
    const el = form.elements.namedItem(name) as HTMLInputElement | null;
    return el && el.value.trim() !== '' ? Number(el.value) : Number.NaN;
  };
  let timer = 0;
  const update = () => {
    const i: PreviewInputs = { price: read('price'), variableCost: read('variableCost'), fixedCosts: read('fixedCosts'), output: read('output') };
    const m = previewModel(i);
    form.querySelectorAll<HTMLInputElement>('input').forEach((el) => {
      const bad = !(Number.isFinite(Number(el.value)) && el.value.trim() !== '' && Number(el.value) >= 0);
      el.toggleAttribute('aria-invalid', bad);
    });
    lines.innerHTML = previewLines(i)
      .map((l) => `<div><dt>${l.label}</dt><dd>${l.value}</dd></div>`)
      .join('');
    if (m.ok) chart.innerHTML = previewChart(i, 'hp');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      live.textContent = m.ok ? `Break-even at ${fmtNumber(m.breakEven ?? 0, 0)} units; margin of safety ${fmtNumber(m.margin ?? 0, 0)} units.` : (m.problem ?? '');
    }, 700);
  };
  form.addEventListener('input', update);
  root.classList.add('is-enhanced');
});
