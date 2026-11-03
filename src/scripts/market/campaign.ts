/** The campaign planner in the browser: channels, tasks and KPIs to add and remove, the timeline and funnel redrawn, saving and export. */
import { nextId } from '../../lib/market-kit';
import { ROLES, campaignChecks, campaignCsvRows, campaignSummary, normalizeCampaign, type CampaignState, type Frequency, type Role } from '../../lib/market-campaign';
import { campaignFiguresHtml, channelRowHtml, funnelFiguresHtml, funnelFor, funnelRowsHtml, ganttFor, kpiRowHtml, taskRowHtml } from '../../lib/market-campaign-view';
import { checksHtml, checksTally } from '../../lib/market-view';
import { announce, each, readConfig } from '../ix';
import { fieldChecked, fieldNumber, fieldValue, fill, mountKit } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: CampaignState;
}

each('[data-ix="campaign"]', (root) => {
  const cfg = readConfig<Config>(root);
  const { uid } = cfg;
  const d = cfg.defaults;
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const chBody = root.querySelector<HTMLElement>('[data-channels]');
  const taskBody = root.querySelector<HTMLElement>('[data-tasks]');
  const kpiBody = root.querySelector<HTMLElement>('[data-kpis]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !chBody || !taskBody || !kpiBody) return;
  let timer = 0;
  const num = (scope: ParentNode, f: string, fallback = 0) => {
    const v = fieldNumber(scope, f);
    return Number.isFinite(v) ? v : fallback;
  };
  const wk = (scope: ParentNode, f: string) => Math.max(1, Math.round(num(scope, f, 1)));
  const role = (v: string): Role => (ROLES as readonly string[]).includes(v) ? (v as Role) : 'awareness';

  const read = (): CampaignState => ({
    name: fieldValue(form, 'name'),
    business: d.business,
    currency: d.currency,
    objective: { metric: fieldValue(form, 'metric'), baseline: num(form, 'baseline'), target: num(form, 'target'), unit: fieldValue(form, 'unit'), weeks: Math.min(104, wk(form, 'weeks')) },
    audience: fieldValue(form, 'audience'),
    insight: fieldValue(form, 'insight'),
    message: { proposition: fieldValue(form, 'proposition'), proof: fieldValue(form, 'proof'), action: fieldValue(form, 'action') },
    budget: num(form, 'budget'),
    channels: [...chBody.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({ id: el.dataset.row ?? '', name: fieldValue(el, 'name'), line: fieldValue(el, 'line') === 'above' ? 'above' : 'below', role: role(fieldValue(el, 'role')), cost: num(el, 'cost'), start: wk(el, 'start'), end: wk(el, 'end') })),
    tasks: [...taskBody.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({ id: el.dataset.row ?? '', name: fieldValue(el, 'name'), cost: num(el, 'cost'), start: wk(el, 'start'), end: wk(el, 'end') })),
    kpis: [...kpiBody.querySelectorAll<HTMLElement>('[data-row]')].map((el) => ({
      id: el.dataset.row ?? '',
      name: fieldValue(el, 'name'),
      role: role(fieldValue(el, 'role')),
      primary: fieldChecked(el, 'primary'),
      baseline: num(el, 'baseline'),
      target: num(el, 'target'),
      unit: fieldValue(el, 'unit'),
      frequency: (['weekly', 'monthly', 'end'] as const).find((f) => f === fieldValue(el, 'frequency')) ?? ('monthly' as Frequency),
    })),
    funnel: { reach: num(form, 'f-reach'), aware: num(form, 'f-aware'), trial: num(form, 'f-trial'), repeat: num(form, 'f-repeat'), visits: num(form, 'f-visits'), spend: num(form, 'f-spend') },
  });

  const render = (s: CampaignState) => {
    fill(root, '[data-figures]', campaignFiguresHtml(s));
    fill(root, '[data-gantt]', ganttFor(s, `${uid}-gantt`));
    fill(root, '[data-funnel]', funnelFor(s, `${uid}-funnel`));
    fill(root, '[data-funnel-figures]', funnelFiguresHtml(s));
    fill(root, '[data-funnel-rows]', funnelRowsHtml(s));
    fill(root, '[data-checks]', checksHtml(campaignChecks(s)));
  };

  const drawRows = (s: CampaignState) => {
    chBody.innerHTML = s.channels.map((c, i) => channelRowHtml(c, i, uid, s)).join('');
    taskBody.innerHTML = s.tasks.map((t, i) => taskRowHtml(t, i, uid, s)).join('');
    kpiBody.innerHTML = s.kpis.map((k, i) => kpiRowHtml(k, i, uid)).join('');
  };

  const apply = (s: CampaignState) => {
    const set = (f: string, v: string | number) => {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-f="${f}"]`);
      if (el) el.value = String(v);
    };
    set('name', s.name);
    set('metric', s.objective.metric);
    set('baseline', s.objective.baseline);
    set('target', s.objective.target);
    set('unit', s.objective.unit);
    set('weeks', s.objective.weeks);
    set('audience', s.audience);
    set('insight', s.insight);
    set('proposition', s.message.proposition);
    set('proof', s.message.proof);
    set('action', s.message.action);
    set('budget', s.budget);
    set('f-reach', s.funnel.reach);
    set('f-aware', s.funnel.aware);
    set('f-trial', s.funnel.trial);
    set('f-repeat', s.funnel.repeat);
    set('f-visits', s.funnel.visits);
    set('f-spend', s.funnel.spend);
    drawRows(s);
    render(s);
  };

  const kit = mountKit<CampaignState>({ root, slug: cfg.slug, name: 'Campaign plan', defaults: d, normalize: normalizeCampaign, read, apply, csv: campaignCsvRows, text: campaignSummary });

  const onEdit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const s = read();
      render(s);
      announce(status, `Plan updated. Checks: ${checksTally(campaignChecks(s))}.`);
    }, 300);
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());

  const add = (kind: 'channel' | 'task' | 'kpi') => {
    const s = read();
    const weeks = s.objective.weeks;
    if (kind === 'channel') {
      if (s.channels.length >= 12) return;
      const id = nextId('c', [...s.channels.map((c) => c.id), ...s.tasks.map((t) => t.id)]);
      s.channels.push({ id, name: '', line: 'below', role: 'awareness', cost: 0, start: 1, end: Math.min(4, weeks) });
      drawRows(s);
      root.querySelector<HTMLInputElement>(`#${uid}-ch-${id}-name`)?.focus();
    } else if (kind === 'task') {
      if (s.tasks.length >= 12) return;
      const id = nextId('t', [...s.channels.map((c) => c.id), ...s.tasks.map((t) => t.id)]);
      s.tasks.push({ id, name: '', cost: 0, start: 1, end: 1 });
      drawRows(s);
      root.querySelector<HTMLInputElement>(`#${uid}-task-${id}-name`)?.focus();
    } else {
      if (s.kpis.length >= 10) return;
      const id = nextId('k', s.kpis.map((k) => k.id));
      s.kpis.push({ id, name: '', role: 'conversion', primary: false, baseline: 0, target: 0, unit: '', frequency: 'monthly' });
      drawRows(s);
      root.querySelector<HTMLInputElement>(`#${uid}-kpi-${id}-name`)?.focus();
    }
    render(read());
    kit.changed();
    announce(status, `A ${kind === 'kpi' ? 'KPI' : kind} has been added.`);
  };
  root.querySelector('[data-add-channel]')?.addEventListener('click', () => add('channel'));
  root.querySelector('[data-add-task]')?.addEventListener('click', () => add('task'));
  root.querySelector('[data-add-kpi]')?.addEventListener('click', () => add('kpi'));

  const removeIn = (body: HTMLElement, list: 'channels' | 'tasks' | 'kpis', addSel: string) =>
    body.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-remove]');
      if (!btn) return;
      const id = btn.closest<HTMLElement>('[data-row]')?.dataset.row;
      const s = read();
      if (list === 'channels') s.channels = s.channels.filter((x) => x.id !== id);
      if (list === 'tasks') s.tasks = s.tasks.filter((x) => x.id !== id);
      if (list === 'kpis') s.kpis = s.kpis.filter((x) => x.id !== id);
      drawRows(s);
      render(s);
      kit.changed();
      root.querySelector<HTMLButtonElement>(addSel)?.focus();
      announce(status, 'Removed. The timeline and checks have been updated.');
    });
  removeIn(chBody, 'channels', '[data-add-channel]');
  removeIn(taskBody, 'tasks', '[data-add-task]');
  removeIn(kpiBody, 'kpis', '[data-add-kpi]');
});
