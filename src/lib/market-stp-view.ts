/** HTML for the STP planner, shared by the server render and the browser script. */
import { esc } from './markup';
import { hbarSvg } from './market-charts';
import { areaField, checkField, pips, removeButton, selectField, textField } from './market-view';
import { BASES, BASE_LABELS, CRITERIA, CRITERION_LABELS, maxTotal, positioningStatement, scoreSegments, type Segment, type StpState } from './market-stp';

const ratingOptions = (c: (typeof CRITERIA)[number]) =>
  [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 1 ? `1: ${CRITERION_LABELS[c].low}` : n === 5 ? `5: ${CRITERION_LABELS[c].high}` : String(n) }));

/** One segment's editor: name, profile, bases, ratings, reach, target and evidence. */
export function segmentRowHtml(g: Segment, i: number, uid: string): string {
  const id = (k: string) => `${uid}-seg-${g.id}-${k}`;
  const who = g.name.trim() || `segment ${i + 1}`;
  const bases = BASES.map(
    (b) => `<label class="mk-check mk-check--compact" for="${esc(id(`b-${b}`))}"><input type="checkbox" id="${esc(id(`b-${b}`))}" data-f="base" value="${b}"${g.bases.includes(b) ? ' checked' : ''} /><span>${esc(BASE_LABELS[b].label)}</span></label>`,
  ).join('');
  const ratings = CRITERIA.map((c) => selectField({ id: id(c), f: c, label: CRITERION_LABELS[c].label, value: String(g[c]), options: ratingOptions(c), cls: 'mk-field--rating' })).join('');
  return `<fieldset class="mk-row mk-seg${g.target ? ' is-target' : ''}" data-row="${esc(g.id)}">
<legend class="mk-row__legend"><span class="mk-row__no">${i + 1}</span> <span data-legend>${esc(g.name.trim() || `Segment ${i + 1}`)}</span>${g.target ? ' <span class="tag tag--plain mk-target-tag">Target</span>' : ''}</legend>
<div class="mk-row__grid">
${textField({ id: id('name'), f: 'name', label: 'Name of the segment', value: g.name, max: 60, cls: 'mk-span-2' })}
${areaField({ id: id('profile'), f: 'profile', label: 'Who they are and what they need', value: g.profile, rows: 2, max: 400, cls: 'mk-span-2' })}
<fieldset class="mk-subset mk-span-2"><legend class="field__label">Bases that define it</legend><div class="mk-checks-row">${bases}</div></fieldset>
<div class="mk-ratings mk-span-2">${ratings}</div>
<div class="mk-span-2 mk-row__flags">${checkField({ id: id('reachable'), f: 'reachable', label: 'Can be reached through promotion and distribution', checked: g.reachable })}${checkField({ id: id('target'), f: 'target', label: 'Target this segment', checked: g.target })}</div>
${textField({ id: id('evidence'), f: 'evidence', label: 'Evidence for the ratings', value: g.evidence, max: 300, cls: 'mk-span-2', hint: 'Research, sales data or observation behind the ratings.' })}
</div>
<p class="mk-row__actions">${removeButton('Remove segment', who)}</p>
</fieldset>`;
}

/** The ranking table's body. */
export function stpTableHtml(s: StpState): string {
  const results = scoreSegments(s);
  const max = maxTotal(s);
  return results
    .map((r) => {
      const g = s.segments.find((x) => x.id === r.id);
      if (!g) return '';
      return `<tr${g.target ? ' class="is-focus"' : ''}><th scope="row">${esc(r.name)}${g.target ? ' <span class="tag tag--plain">Target</span>' : ''}</th>${CRITERIA.map((c) => `<td class="mk-pipcell">${pips(g[c])}</td>`).join('')}<td class="n">${r.total} / ${max}</td><td class="n">${Math.round(r.share)}%</td><td class="n">${r.rank}</td></tr>`;
    })
    .join('');
}

export function stpChartSvg(s: StpState, id: string): string {
  const results = scoreSegments(s);
  const max = maxTotal(s);
  const rows = results.map((r) => ({ label: r.name, value: r.share, valueText: `${Math.round(r.share)}%`, emphasis: r.target, tag: r.target ? 'Target' : `Rank ${r.rank}` }));
  const desc = results.length
    ? `Weighted attractiveness of each segment as a share of the maximum ${max} points. ${results.map((r) => `${r.name}: ${r.total} points, ${Math.round(r.share)}%${r.target ? ', a target' : ''}`).join('; ')}.`
    : 'No segments yet.';
  return hbarSvg({ id, title: 'Segment attractiveness, weighted', desc, rows, max: 100, tickSuffix: '%', axisLabel: 'Weighted score as a share of the maximum' });
}

export function statementHtml(s: StpState): string {
  return esc(positioningStatement(s.positioning));
}
