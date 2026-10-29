/**
 * A plan drawn week by week: one bar per activity from its earliest start to
 * its earliest finish, the critical path in ink, other activities in cobalt
 * with their float drawn as a thin line to their latest finish, and the
 * deadline as a dashed line. Built as a string for the server and the browser.
 */
import type { Schedule } from './plan';
import { esc } from './markup';

const INK = '#111417';
const COBALT = '#315CFF';
const SIGNAL = '#B84A4A';
const RULE = '#DCD6CA';
const MUTED = '#5A6670';

export function planSvg(s: Schedule, o: { deadline: number; deadlineLabel: string; id: string }): string {
  const rowH = 30;
  const L = 230;
  const R = 16;
  const T = 30;
  const B = 34;
  const weeks = Math.max(o.deadline, s.finish) + 1;
  const W = Math.max(600, L + weeks * 24 + R);
  const H = T + s.items.length * rowH + B;
  const x = (w: number) => L + (w / weeks) * (W - L - R);
  const parts: string[] = [];

  for (let w = 0; w <= weeks; w++) {
    parts.push(`<line x1="${x(w)}" y1="${T - 6}" x2="${x(w)}" y2="${H - B}" stroke="${RULE}" stroke-width="1"/>`);
    if (w < weeks) parts.push(`<text x="${x(w + 0.5)}" y="${H - B + 16}" text-anchor="middle" class="ch-tick">${w + 1}</text>`);
  }
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="ch-axis" fill="${MUTED}">Week</text>`);

  s.items.forEach((a, i) => {
    const y = T + i * rowH;
    const label = a.label.length > 30 ? `${a.label.slice(0, 29)}…` : a.label;
    parts.push(`<text x="${L - 10}" y="${y + rowH / 2 + 4}" text-anchor="end" class="ch-label" fill="${INK}">${esc(label)}</text>`);
    if (!a.critical && a.totalFloat > 0) {
      parts.push(`<line x1="${x(a.ef)}" y1="${y + rowH / 2}" x2="${x(a.lf)}" y2="${y + rowH / 2}" stroke="${COBALT}" stroke-width="2" stroke-dasharray="2 3"/>`);
      parts.push(`<line x1="${x(a.lf)}" y1="${y + 8}" x2="${x(a.lf)}" y2="${y + rowH - 8}" stroke="${COBALT}" stroke-width="2"/>`);
    }
    const bx = x(a.es);
    const bw = Math.max(2, x(a.ef) - x(a.es));
    parts.push(
      a.critical
        ? `<rect x="${bx}" y="${y + 6}" width="${bw}" height="${rowH - 12}" fill="${INK}"/>`
        : `<rect x="${bx}" y="${y + 6}" width="${bw}" height="${rowH - 12}" fill="#E6EBFF" stroke="${COBALT}" stroke-width="1.5"/>`,
    );
  });

  const dx = x(o.deadline);
  parts.push(`<line x1="${dx}" y1="${T - 14}" x2="${dx}" y2="${H - B}" stroke="${SIGNAL}" stroke-width="2" stroke-dasharray="6 4"/>`);
  parts.push(`<text x="${dx - 6}" y="${T - 16}" text-anchor="end" class="ch-note" fill="${SIGNAL}">${esc(o.deadlineLabel)}</text>`);
  const fx = x(s.finish);
  if (s.finish !== o.deadline) {
    parts.push(`<line x1="${fx}" y1="${T - 6}" x2="${fx}" y2="${H - B}" stroke="${INK}" stroke-width="1.5"/>`);
  }

  const crit = s.path.map((id) => s.items.find((i) => i.id === id)?.label ?? id).join(', then ');
  const desc = `The plan takes ${s.finish} weeks; the deadline is the end of week ${o.deadline}. Critical path: ${crit}. ${s.items
    .filter((i) => i.totalFloat > 0)
    .map((i) => `${i.label} has ${i.totalFloat} ${i.totalFloat === 1 ? 'week' : 'weeks'} of float`)
    .join('. ')}.`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${o.id}-t ${o.id}-d" class="chart" focusable="false"><title id="${o.id}-t">The plan, week by week</title><desc id="${o.id}-d">${esc(desc)}</desc>${parts.join('')}</svg>`;
}

/** Rows for the plan's data table. */
export function planTableHtml(s: Schedule): string {
  return s.items
    .map(
      (a) =>
        `<tr${a.critical ? ' class="is-critical"' : ''}><th scope="row">${esc(a.label)}</th><td class="n">${a.weeks}</td><td class="n">${a.es + 1}</td><td class="n">${a.ef}</td><td class="n">${a.totalFloat}</td><td>${a.critical ? 'Critical' : 'Has float'}</td></tr>`,
    )
    .join('');
}
