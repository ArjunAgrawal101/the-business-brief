/** HTML for the competitor positioning map, shared by the server render and the browser script. */
import { esc } from './markup';
import { fmtNumber } from './format';
import { positionMapSvg } from './charts-studio';
import { mapTableHtml } from './render-studio';
import { numberField, removeButton, textField } from './market-view';
import { attributes, describeSpot, gapVerdict, model, openSpaces, scaleOf, type MapBrandRow, type MapState } from './market-map';

export function brandRowHtml(b: MapBrandRow, i: number, uid: string, s: MapState): string {
  const sc = scaleOf(s.scale);
  const id = (k: string) => `${uid}-brand-${b.id}-${k}`;
  const who = b.name.trim() || `seller ${i + 1}`;
  return `<tr data-row="${esc(b.id)}"${b.id === s.focus ? ' class="is-focus"' : ''}>
<td>${textField({ id: id('name'), f: 'name', label: `Seller ${i + 1}: name`, value: b.name, srLabel: true, max: 40 })}</td>
<td class="n">${numberField({ id: id('x'), f: 'x', label: `${who}: ${s.x.label || 'across'}`, value: b.x, min: sc.min, max: sc.max, step: '0.1', srLabel: true })}</td>
<td class="n">${numberField({ id: id('y'), f: 'y', label: `${who}: ${s.y.label || 'up'}`, value: b.y, min: sc.min, max: sc.max, step: '0.1', srLabel: true })}</td>
<td class="mk-cell-act">${removeButton('Remove', who)}</td>
</tr>`;
}

export function focusOptions(s: MapState): string {
  return s.brands.map((b) => `<option value="${esc(b.id)}"${b.id === s.focus ? ' selected' : ''}>${esc(b.name || 'Unnamed seller')}</option>`).join('');
}

export function mapChart(s: MapState, id: string): string {
  const sc = scaleOf(s.scale);
  const { xa, ya } = attributes(s);
  const spaces = openSpaces(s.brands, { min: sc.min, max: sc.max }).map((sp, i) => ({ ...sp, label: `Open space ${i + 1}` }));
  return positionMapSvg(model(s), xa, ya, { id, focus: s.focus, scale: { min: sc.min, max: sc.max }, spaces, title: `Position map: ${s.market || 'your market'}` });
}

export function mapTable(s: MapState): string {
  const { xa, ya } = attributes(s);
  return mapTableHtml(model(s), xa, ya, s.focus);
}

export function spacesHtml(s: MapState): string {
  const sc = scaleOf(s.scale);
  const { xa, ya } = attributes(s);
  const spaces = openSpaces(s.brands, { min: sc.min, max: sc.max });
  if (!spaces.length) return '<p class="small muted">No open space is large enough to stand out: the map is crowded on these two attributes.</p>';
  return `<ol class="mk-spaces" role="list">${spaces
    .map((sp, i) => `<li><span class="mk-spaces__no">Open space ${i + 1}</span> <span>Around ${esc(describeSpot(sp.x, sp.y, xa, ya, { min: sc.min, max: sc.max }))}</span> <span class="small muted num">Centre ${esc(fmtNumber(sp.x, 1))} across, ${esc(fmtNumber(sp.y, 1))} up; radius ${esc(fmtNumber(sp.r, 1))}</span></li>`)
    .join('')}</ol>`;
}

export function verdictHtml(s: MapState): string {
  const v = gapVerdict(s.test);
  const word = v.verdict === 'promising' ? 'Worth testing' : v.verdict === 'evidence' ? 'Find evidence' : 'Probably empty for a reason';
  return `<p class="mk-verdict mk-verdict--${v.verdict}"><span class="mk-verdict__word">${esc(word)}</span> ${esc(v.text)}</p>`;
}

/** A compact map for the studio's front page: the sellers as points, the open spaces outlined, every name labelled. */
export function miniMapSvg(s: MapState, id: string): string {
  const sc = scaleOf(s.scale);
  const W = 360;
  const H = 290;
  const L = 26;
  const R = 10;
  const T = 10;
  const B = 34;
  const x = (v: number) => L + ((v - sc.min) / (sc.max - sc.min)) * (W - L - R);
  const y = (v: number) => H - B - ((v - sc.min) / (sc.max - sc.min)) * (H - T - B);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const { xa, ya } = attributes(s);
  const spaces = openSpaces(s.brands, { min: sc.min, max: sc.max }, 2);
  const p: string[] = [];
  p.push(`<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="#fff" stroke="#0B1A33" stroke-width="1"/>`);
  const mid = (sc.min + sc.max) / 2;
  p.push(`<line x1="${r1(x(mid))}" y1="${T}" x2="${r1(x(mid))}" y2="${H - B}" stroke="#AEB8C8" stroke-dasharray="3 3"/><line x1="${L}" y1="${r1(y(mid))}" x2="${W - R}" y2="${r1(y(mid))}" stroke="#AEB8C8" stroke-dasharray="3 3"/>`);
  spaces.forEach((sp, i) => {
    const rx = (sp.r / (sc.max - sc.min)) * (W - L - R);
    const ry = (sp.r / (sc.max - sc.min)) * (H - T - B);
    p.push(`<ellipse cx="${r1(x(sp.x))}" cy="${r1(y(sp.y))}" rx="${r1(rx)}" ry="${r1(ry)}" fill="#2F6F5E" fill-opacity="0.08" stroke="#2F6F5E" stroke-width="1.25" stroke-dasharray="5 3"/>`);
    p.push(`<text x="${r1(x(sp.x))}" y="${r1(y(sp.y) + 4)}" text-anchor="middle" class="ch-note" fill="#2B6A59">Open space ${i + 1}</text>`);
  });
  for (const b of s.brands) {
    const focus = b.id === s.focus;
    const px = x(b.x);
    const py = y(b.y);
    p.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="${focus ? 6 : 4.5}" fill="${focus ? '#2F55E4' : '#fff'}" stroke="${focus ? '#fff' : '#0B1A33'}" stroke-width="1.75"/>`);
    const right = px < W - 110;
    p.push(`<text x="${r1(right ? px + 9 : px - 9)}" y="${r1(py + 4)}" text-anchor="${right ? 'start' : 'end'}" class="ch-note" fill="${focus ? '#2448D0' : '#0B1A33'}"${focus ? ' font-weight="700"' : ''}>${esc(b.name)}</text>`);
  }
  p.push(`<text x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle" class="ch-note" fill="#566173">${esc(`${xa.label}: low to high`)}</text>`);
  p.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-note" fill="#566173" transform="rotate(-90 14 ${(T + H - B) / 2})">${esc(`${ya.label}: low to high`)}</text>`);
  const desc = `A position map of ${s.brands.length} sellers, ${xa.label.toLowerCase()} across and ${ya.label.toLowerCase()} up: ${s.brands.map((b) => `${b.name} ${fmtNumber(b.x, 1)} across, ${fmtNumber(b.y, 1)} up`).join('; ')}.${spaces.length ? ` Open spaces: ${spaces.map((sp, i) => `${i + 1}, around ${describeSpot(sp.x, sp.y, xa, ya, { min: sc.min, max: sc.max })}`).join('; ')}.` : ''}`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${esc(id)}-t ${esc(id)}-d" class="chart chart--mini" focusable="false"><title id="${esc(id)}-t">${esc(`Position map: ${s.market}`)}</title><desc id="${esc(id)}-d">${esc(desc)}</desc>${p.join('')}</svg>`;
}
