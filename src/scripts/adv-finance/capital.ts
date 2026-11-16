/**
 * The capital budgeting comparator in the browser: two or three projects
 * whose years the reader can add and remove, the cost of capital, and the
 * sensitivity settings, read, checked and redrawn with the same functions the
 * server uses.
 */
import { MAX_PROJECTS, MAX_YEARS, MIN_PROJECTS } from '../../lib/adv-finance/capital';
import { buildCapitalReport } from '../../lib/adv-finance/capital-view';
import { projectsHtml } from '../../lib/adv-finance/forms';
import { CAPITAL_EXAMPLE_FORM, CAPITAL_FIELD_NAMES, capitalFromForm, readCapitalSaved, type CapitalForm } from '../../lib/adv-finance/state';
import { announce, each, escapeHtml } from '../ix';
import { applyCurrency, currencyValue, fieldValues, mountTool, radioValue, setFieldValues, setRadio } from './kit';

each('[data-ix="adv-finance"][data-tool="capital"]', (root) => {
  const uid = root.dataset.uid ?? 'af-cb';
  const list = root.querySelector<HTMLElement>('[data-projects]');
  const focus = root.querySelector<HTMLSelectElement>('[data-focus]');
  const flex = root.querySelector<HTMLSelectElement>('select[name="flex"]');
  const currency = root.querySelector<HTMLSelectElement>('[data-setting="currency"]');
  const own = root.querySelector<HTMLElement>('[data-own]');
  const addProject = root.querySelector<HTMLButtonElement>('[data-act="add-project"]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!list || !focus || !flex || !currency) throw new Error('The comparator form is incomplete.');

  const projects = (): CapitalForm['projects'] =>
    [...list.querySelectorAll<HTMLFieldSetElement>('fieldset.af-project')].map((fs) => ({
      name: fs.querySelector<HTMLInputElement>('input[name$=".name"]')?.value ?? '',
      outlay: fs.querySelector<HTMLInputElement>('input[name$=".outlay"]')?.value ?? '',
      flows: [...fs.querySelectorAll<HTMLInputElement>('.af-years input[data-num]')].map((el) => el.value),
    }));

  /** Redraws the projects and the choice of project for the tornado, keeping the reader's choice where it still exists. */
  const draw = (ps: CapitalForm['projects'], chosen: string, focusName?: string) => {
    list.innerHTML = projectsHtml(ps, uid, currency.value);
    focus.innerHTML = `<option value="best">With the highest NPV</option>${ps.map((p, i) => `<option value="${i}">${escapeHtml(p.name.trim() || `Project ${i + 1}`)}</option>`).join('')}`;
    focus.value = chosen === 'best' || Number(chosen) < ps.length ? chosen : 'best';
    addProject?.setAttribute('aria-disabled', String(ps.length >= MAX_PROJECTS));
    if (focusName) list.querySelector<HTMLInputElement>(`[name="${focusName}"]`)?.focus();
  };

  const read = (): CapitalForm => ({
    projects: projects(),
    fields: fieldValues(root, CAPITAL_FIELD_NAMES),
    rateSource: radioValue(root, 'rateSource', 'wacc') === 'own' ? 'own' : 'wacc',
    flex: (['5', '10', '20'] as const).find((x) => x === flex.value) ?? '10',
    focus: focus.value,
    currency: currencyValue(root, CAPITAL_EXAMPLE_FORM.currency),
  });

  const write = (f: CapitalForm) => {
    currency.value = f.currency;
    draw(f.projects, f.focus);
    setFieldValues(root, f.fields);
    setRadio(root, 'rateSource', f.rateSource);
    flex.value = f.flex;
  };

  const api = mountTool<CapitalForm>({
    root,
    key: root.dataset.key ?? 'finance:advanced:capital',
    title: root.dataset.name ?? 'Capital budgeting comparator',
    example: CAPITAL_EXAMPLE_FORM,
    read,
    write,
    parse: readCapitalSaved,
    csvName: 'capital-budgeting.csv',
    render: (f) => {
      applyCurrency(root, f.currency);
      if (own) own.hidden = f.rateSource !== 'own';
      // The tornado's list of projects follows the names as they are typed.
      f.projects.forEach((p, i) => {
        const opt = focus.querySelector<HTMLOptionElement>(`option[value="${i}"]`);
        if (opt) opt.textContent = p.name.trim() || `Project ${i + 1}`;
      });
      const { problems, state } = capitalFromForm(f);
      if (!state) return { problems };
      const r = buildCapitalReport(state, f.currency);
      return { problems: [], regions: r.regions, announce: r.announce, summary: r.summary, csv: r.csv };
    },
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (!btn || !root.contains(btn)) return;
    const act = btn.dataset.act;
    if (!act || !['add-year', 'remove-year', 'add-project', 'remove-project'].includes(act)) return;
    const ps = projects();
    const i = Number(btn.dataset.project ?? -1);
    const p = ps[i];
    const chosen = focus.value;
    if (btn.getAttribute('aria-disabled') === 'true') {
      if (act === 'add-year') announce(status, `A project can have up to ${MAX_YEARS} years here.`);
      else if (act === 'remove-year') announce(status, 'A project needs at least one year of cash flows.');
      else if (act === 'add-project') announce(status, `The comparator takes up to ${MAX_PROJECTS} projects.`);
      return;
    }
    if (act === 'add-year' && p) {
      p.flows.push('0');
      draw(ps, chosen, `p${i}.r${p.flows.length}`);
      api.refresh(`Year ${p.flows.length} added to project ${i + 1}.`);
    } else if (act === 'remove-year' && p && p.flows.length > 1) {
      p.flows.pop();
      draw(ps, chosen);
      list.querySelector<HTMLButtonElement>(`[data-act="remove-year"][data-project="${i}"]`)?.focus();
      api.refresh(`The last year of project ${i + 1} removed.`);
    } else if (act === 'add-project' && ps.length < MAX_PROJECTS) {
      ps.push({ name: `Project ${ps.length + 1}`, outlay: '10000', flows: ['4000', '4000', '4000'] });
      draw(ps, chosen, `p${ps.length - 1}.name`);
      api.refresh(`Project ${ps.length} added.`);
    } else if (act === 'remove-project' && ps.length > MIN_PROJECTS) {
      ps.splice(i, 1);
      draw(ps, chosen === String(i) ? 'best' : chosen === 'best' || Number(chosen) < i ? chosen : String(Number(chosen) - 1));
      addProject?.focus();
      api.refresh(`Project ${i + 1} removed.`);
    }
  });
});
