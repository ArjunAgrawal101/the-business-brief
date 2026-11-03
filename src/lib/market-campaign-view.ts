/** HTML and charts for the campaign planner, shared by the server render and the browser script. */
import { esc } from './markup';
import { fmtMoney, fmtNumber } from './format';
import { funnelSvg, ganttSvg } from './market-charts';
import { fig, numberField, removeButton, selectField, textField } from './market-view';
import { FREQ_LABELS, LINE_LABELS, ROLES, ROLE_SHORT, campaignLine, funnel, objectiveChange, plannedSpend, reviewWeeks, type CampaignChannel, type CampaignState, type CampaignTask, type Kpi } from './market-campaign';

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_SHORT[r] }));

export function channelRowHtml(c: CampaignChannel, i: number, uid: string, s: CampaignState): string {
  const id = (k: string) => `${uid}-ch-${c.id}-${k}`;
  const who = c.name.trim() || `channel ${i + 1}`;
  return `<tr data-row="${esc(c.id)}">
<td>${textField({ id: id('name'), f: 'name', label: `Channel ${i + 1}: name`, value: c.name, srLabel: true, max: 80 })}</td>
<td>${selectField({ id: id('line'), f: 'line', label: `${who}: line`, value: c.line, options: (['above', 'below'] as const).map((l) => ({ value: l, label: LINE_LABELS[l] })), srLabel: true })}</td>
<td>${selectField({ id: id('role'), f: 'role', label: `${who}: role`, value: c.role, options: roleOptions, srLabel: true })}</td>
<td class="n">${numberField({ id: id('cost'), f: 'cost', label: `${who}: cost`, value: c.cost, min: 0, step: '10', srLabel: true, prefix: s.currency })}</td>
<td class="n">${numberField({ id: id('start'), f: 'start', label: `${who}: first week`, value: c.start, min: 1, max: 104, step: '1', srLabel: true })}</td>
<td class="n">${numberField({ id: id('end'), f: 'end', label: `${who}: last week`, value: c.end, min: 1, max: 104, step: '1', srLabel: true })}</td>
<td class="mk-cell-act">${removeButton('Remove', who)}</td>
</tr>`;
}

export function taskRowHtml(t: CampaignTask, i: number, uid: string, s: CampaignState): string {
  const id = (k: string) => `${uid}-task-${t.id}-${k}`;
  const who = t.name.trim() || `task ${i + 1}`;
  return `<tr data-row="${esc(t.id)}">
<td>${textField({ id: id('name'), f: 'name', label: `Task ${i + 1}: name`, value: t.name, srLabel: true, max: 80 })}</td>
<td class="n">${numberField({ id: id('cost'), f: 'cost', label: `${who}: cost`, value: t.cost, min: 0, step: '10', srLabel: true, prefix: s.currency })}</td>
<td class="n">${numberField({ id: id('start'), f: 'start', label: `${who}: first week`, value: t.start, min: 1, max: 104, step: '1', srLabel: true })}</td>
<td class="n">${numberField({ id: id('end'), f: 'end', label: `${who}: last week`, value: t.end, min: 1, max: 104, step: '1', srLabel: true })}</td>
<td class="mk-cell-act">${removeButton('Remove', who)}</td>
</tr>`;
}

export function kpiRowHtml(k: Kpi, i: number, uid: string): string {
  const id = (x: string) => `${uid}-kpi-${k.id}-${x}`;
  const who = k.name.trim() || `KPI ${i + 1}`;
  return `<tr data-row="${esc(k.id)}">
<td>${textField({ id: id('name'), f: 'name', label: `KPI ${i + 1}: what is measured`, value: k.name, srLabel: true, max: 100 })}</td>
<td>${selectField({ id: id('role'), f: 'role', label: `${who}: stage it measures`, value: k.role, options: roleOptions, srLabel: true })}</td>
<td><label class="mk-check mk-check--compact" for="${esc(id('primary'))}"><input type="checkbox" id="${esc(id('primary'))}" data-f="primary"${k.primary ? ' checked' : ''} /><span>Yes<span class="sr-only">: ${esc(who)} measures the objective</span></span></label></td>
<td class="n">${numberField({ id: id('baseline'), f: 'baseline', label: `${who}: starting figure`, value: k.baseline, min: 0, step: 'any', srLabel: true })}</td>
<td class="n">${numberField({ id: id('target'), f: 'target', label: `${who}: target`, value: k.target, min: 0, step: 'any', srLabel: true })}</td>
<td>${textField({ id: id('unit'), f: 'unit', label: `${who}: unit`, value: k.unit, srLabel: true, max: 30 })}</td>
<td>${selectField({ id: id('freq'), f: 'frequency', label: `${who}: reviewed`, value: k.frequency, options: (['weekly', 'monthly', 'end'] as const).map((f) => ({ value: f, label: FREQ_LABELS[f] })), srLabel: true })}</td>
<td class="mk-cell-act">${removeButton('Remove', who)}</td>
</tr>`;
}

export function campaignFiguresHtml(s: CampaignState): string {
  const ch = objectiveChange(s);
  const spend = plannedSpend(s);
  const line = campaignLine(s);
  const lineWord = line === 'through' ? 'Through the line' : line === 'above' ? 'Above the line only' : line === 'below' ? 'Below the line only' : 'No channels yet';
  const reviews = reviewWeeks(s);
  return [
    fig('Objective', esc(ch === null ? 'n/a' : `${ch >= 0 ? '+' : ''}${fmtNumber(ch, 0)}%`), `${fmtNumber(s.objective.baseline)} to ${fmtNumber(s.objective.target)} ${s.objective.unit}, in ${s.objective.weeks} weeks`),
    fig('Planned spending', esc(fmtMoney(spend, s.currency, 0)), `of a ${fmtMoney(s.budget, s.currency, 0)} budget`),
    fig('Left to allocate', esc(fmtMoney(s.budget - spend, s.currency, 0)), s.budget - spend < 0 ? 'over budget' : undefined),
    fig('Promotion', esc(lineWord), `${s.channels.length} channels`),
    fig('Reviews', esc(String(reviews.length)), reviews.length ? `weeks ${reviews.join(', ')}` : 'set how often each KPI is checked'),
  ].join('');
}

export function ganttFor(s: CampaignState, id: string): string {
  const rows = [...s.tasks.map((t) => ({ label: t.name || 'Unnamed task', start: t.start, end: t.end, kind: 'task' as const })), ...s.channels.map((c) => ({ label: c.name || 'Unnamed channel', start: c.start, end: c.end, kind: 'channel' as const }))].sort((a, b) => a.start - b.start || a.end - b.end);
  const reviews = reviewWeeks(s);
  const desc = `Gantt chart of the campaign over ${s.objective.weeks} weeks. ${rows.map((r) => `${r.label}, ${r.kind === 'channel' ? 'a channel' : 'a task'}: weeks ${r.start} to ${r.end}`).join('; ')}.${reviews.length ? ` KPI reviews at the end of weeks ${reviews.join(', ')}, shown as dashed gold lines.` : ''}`;
  return ganttSvg({ id, title: `Campaign timeline: ${s.name || 'the campaign'}`, desc, weeks: s.objective.weeks, rows, reviews, deadlineLabel: `Deadline: end of week ${s.objective.weeks}` });
}

export function funnelFor(s: CampaignState, id: string, compact = false): string {
  const f = funnel(s);
  const stages = [
    { label: 'Reached', value: Math.round(f.reach), note: 'people the campaign can reach' },
    { label: 'Aware', value: Math.round(f.aware), note: `${fmtNumber(s.funnel.aware, 0)}% notice it` },
    { label: 'Try it', value: Math.round(f.tried), note: `${fmtNumber(s.funnel.trial, 0)}% of those aware` },
    { label: 'Come back', value: Math.round(f.regulars * 10) / 10, note: `${fmtNumber(s.funnel.repeat, 0)}% become regulars` },
  ];
  const desc = `Funnel estimate: ${stages.map((x) => `${x.label} ${fmtNumber(x.value, Number.isInteger(x.value) ? 0 : 1)}`).join('; ')}. On these assumptions the regulars add about ${fmtMoney(f.weekly, s.currency, 0)} a week.`;
  return funnelSvg({ id, title: 'Campaign funnel estimate', desc, stages, compact });
}

export function funnelFiguresHtml(s: CampaignState): string {
  const f = funnel(s);
  return [
    fig('Regulars won', esc(fmtNumber(f.regulars, 1)), `from ${fmtNumber(f.tried, 0)} who try it`),
    fig('Added a week', esc(fmtMoney(f.weekly, s.currency, 2)), `${fmtNumber(s.funnel.visits, 1)} visits a week × ${fmtMoney(s.funnel.spend, s.currency, 2)}`),
    fig('Share of the target gap', esc(f.coverage === null ? 'n/a' : `${fmtNumber(f.coverage, 0)}%`), `the gap is ${fmtNumber(s.objective.target - s.objective.baseline)} ${s.objective.unit} a week`),
  ].join('');
}
