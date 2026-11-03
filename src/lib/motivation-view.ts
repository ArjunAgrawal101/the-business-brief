/**
 * HTML and SVG for the motivation analysis, rendered on the server for the
 * worked example and in the browser after every change.
 */
import { esc } from './markup';
import { FACTORS, MET, QUADRANT_LABEL, equity, expectancy, herzberg, maslow, mcclelland, selfDetermination, taylor, type HerzbergReading, type MaslowReading, type MotivationInputs, type Reward, type RewardKind } from './motivation';
import { P, r1, svgChart } from './tool-palette';

/**
 * Maslow's five levels, top of the hierarchy at the top, each bar as long as
 * its score out of 5. Labels sit above the bars, so the chart stays readable
 * at the width of a phone.
 */
export function maslowSvg(m: MaslowReading, id: string): string {
  const W = 300;
  const L = 2;
  const R = 4;
  const T = 26;
  const rowH = 44;
  const H = T + m.levels.length * rowH + 22;
  const x = (v: number) => L + (v / 5) * (W - L - R);
  const parts: string[] = [];
  for (let v = 0; v <= 5; v += 1) {
    parts.push(`<line x1="${r1(x(v))}" y1="${T - 4}" x2="${r1(x(v))}" y2="${H - 20}" stroke="${v === MET ? P.gold600 : P.hair}"${v === MET ? ' stroke-dasharray="4 3"' : ''}/>`);
    parts.push(`<text x="${r1(x(v))}" y="${H - 6}" text-anchor="${v === 0 ? 'start' : v === 5 ? 'end' : 'middle'}" class="ch-tick">${v}</text>`);
  }
  parts.push(`<text x="${r1(x(MET)) - 4}" y="${T - 10}" text-anchor="end" class="ch-note" fill="${P.brassText}">met from ${MET}</text>`);
  [...m.levels].reverse().forEach((l, k) => {
    const y0 = T + k * rowH;
    const lowest = m.lowestUnmet === l.id;
    const end = x(l.score);
    parts.push(`<text x="${L}" y="${y0 + 13}" class="ch-label" fill="${P.navy}">${esc(l.label)}</text>`);
    parts.push(`<rect x="${L}" y="${y0 + 19}" width="${r1(Math.max(1, end - L))}" height="18" fill="${l.met ? P.navy700 : P.white}" stroke="${l.met ? P.navy700 : lowest ? P.signal : P.slate}" stroke-width="${lowest ? 2.2 : 1.2}"${l.met ? '' : ' stroke-dasharray="4 3"'}/>`);
    parts.push(
      l.met
        ? `<text x="${r1(end - 6)}" y="${y0 + 32.5}" text-anchor="end" class="ch-label mo-ch__in" fill="${P.white}">${l.score.toFixed(1)}</text>`
        : `<text x="${r1(end + 6)}" y="${y0 + 32.5}" class="ch-label" fill="${lowest ? P.signalText : P.navy}">${l.score.toFixed(1)} ${lowest ? 'lowest unmet' : 'not met'}</text>`,
    );
  });
  const desc = `Maslow's levels, scored from the ratings out of 5: ${m.levels.map((l) => `${l.label} ${l.score.toFixed(1)}${l.met ? ', met' : ', not met'}`).join('; ')}. ${m.lowestUnmet ? `The lowest level not met is ${m.levels.find((l) => l.id === m.lowestUnmet)?.label.toLowerCase()}.` : 'Every level is at least partly met.'}`;
  return svgChart({ w: W, h: H, id, title: "Maslow's hierarchy for this job", desc, body: parts.join(''), minWidth: 270, maxWidth: 420, cls: 'mo-ch' });
}

/** The four parts of Herzberg's chart, each named on two lines. */
const QUADRANT_LINES: Record<keyof typeof QUADRANT_LABEL, [string, string]> = {
  'motivated-content': ['Few complaints', 'and real motivation'],
  'content-unmotivated': ['Few complaints,', 'but little drive'],
  'motivated-complaining': ['Motivated, but', 'with grievances'],
  demotivated: ['Grievances and', 'little drive'],
};

/** Herzberg's two scales: hygiene factors across, motivators up, with the job plotted. */
export function herzbergSvg(h: HerzbergReading, id: string): string {
  const W = 320;
  const H = 320;
  const L = 44;
  const R = 8;
  const T = 10;
  const B = 46;
  const x = (v: number) => L + ((v - 1) / 4) * (W - L - R);
  const y = (v: number) => H - B - ((v - 1) / 4) * (H - T - B);
  const parts: string[] = [];
  const mx = x(MET);
  const my = y(MET);
  const quads: Array<{ q: keyof typeof QUADRANT_LABEL; x0: number; y0: number; x1: number; y1: number }> = [
    { q: 'motivated-complaining', x0: L, y0: T, x1: mx, y1: my },
    { q: 'motivated-content', x0: mx, y0: T, x1: W - R, y1: my },
    { q: 'demotivated', x0: L, y0: my, x1: mx, y1: H - B },
    { q: 'content-unmotivated', x0: mx, y0: my, x1: W - R, y1: H - B },
  ];
  for (const qd of quads) {
    const here = qd.q === h.quadrant;
    parts.push(`<rect x="${r1(qd.x0)}" y="${r1(qd.y0)}" width="${r1(qd.x1 - qd.x0)}" height="${r1(qd.y1 - qd.y0)}" fill="${here ? P.sunk : P.white}" stroke="${P.rule}"/>`);
    QUADRANT_LINES[qd.q].forEach((w, k) => parts.push(`<text x="${r1((qd.x0 + qd.x1) / 2)}" y="${r1(qd.y0 + 18 + k * 14)}" text-anchor="middle" class="ch-note" fill="${here ? P.navy : P.slate}"${here ? ' font-weight="700"' : ''}>${esc(w)}</text>`));
  }
  parts.push(`<line x1="${r1(mx)}" y1="${T}" x2="${r1(mx)}" y2="${H - B}" stroke="${P.gold600}" stroke-dasharray="4 3"/>`);
  parts.push(`<line x1="${L}" y1="${r1(my)}" x2="${W - R}" y2="${r1(my)}" stroke="${P.gold600}" stroke-dasharray="4 3"/>`);
  for (let v = 1; v <= 5; v += 1) {
    parts.push(`<text x="${r1(x(v))}" y="${H - B + 16}" text-anchor="${v === 5 ? 'end' : 'middle'}" class="ch-tick">${v}</text>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${v}</text>`);
  }
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle" class="ch-axis">Hygiene factors (average)</text>`);
  parts.push(`<text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + H - B) / 2})">Motivators (average)</text>`);
  const px = x(h.hygiene);
  const py = y(h.motivators);
  const left = px > W - R - 132;
  parts.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="8" fill="${P.people}" stroke="#fff" stroke-width="2"/>`);
  parts.push(`<text x="${r1(px + (left ? -13 : 13))}" y="${r1(py + (py < T + 24 ? 16 : 4))}" text-anchor="${left ? 'end' : 'start'}" class="ch-label" fill="${P.peopleText}">This job (${h.hygiene.toFixed(1)}, ${h.motivators.toFixed(1)})</text>`);
  const desc = `Hygiene factors average ${h.hygiene.toFixed(1)} and motivators ${h.motivators.toFixed(1)} out of 5, which places the job in the part of the chart labelled "${QUADRANT_LABEL[h.quadrant]}". The dashed lines mark a rating of ${MET}.`;
  return svgChart({ w: W, h: H, id, title: "Herzberg's two scales for this job", desc, body: parts.join(''), minWidth: 270, maxWidth: 440, cls: 'mo-ch' });
}

/** One card per theory, with its reading. */
export function lensHtml(name: string, reading: string, hl: boolean, extra = ''): string {
  return `<article class="mo-lens"${hl ? ' data-level="HL"' : ''}><h4 class="mo-lens__name">${esc(name)}${hl ? ' <span class="tag tag--hl">HL</span>' : ''}</h4><p>${esc(reading)}</p>${extra}</article>`;
}

export const LENSES = ['taylor', 'maslow', 'herzberg', 'mcclelland', 'sdt', 'equity', 'expectancy'] as const;
export type LensId = (typeof LENSES)[number];

const scroll = (label: string, svg: string) => `<div class="chart-scroll" role="region" aria-label="${esc(label)}" tabindex="0">${svg}</div>`;
const figs = (text: string) => `<p class="mo-lens__figs">${esc(text)}</p>`;
const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

/** Every theory's card for one set of inputs: the three for SL and HL, then the four for HL only. */
export function lensCards(i: MotivationInputs, uid: string): Record<LensId, string> {
  const m = maslow(i.ratings);
  const h = herzberg(i.ratings);
  const sdt = selfDetermination(i.ratings);
  const ex = expectancy(i.ratings);
  return {
    taylor: lensHtml('Taylor: scientific management', taylor(i.job, i.ratings).reading, false),
    maslow: lensHtml('Maslow: the hierarchy of needs', m.reading, false, scroll("Maslow's hierarchy for this job", maslowSvg(m, `${uid}-maslow`))),
    herzberg: lensHtml('Herzberg: motivation and hygiene', h.reading, false, scroll("Herzberg's two scales for this job", herzbergSvg(h, `${uid}-herzberg`))),
    mcclelland: lensHtml('McClelland: acquired needs', mcclelland(i.need, i.ratings, i.job).reading, true),
    sdt: lensHtml('Deci and Ryan: self-determination', sdt.reading, true, figs(`Autonomy ${f1(sdt.autonomy)}, competence ${f1(sdt.competence)}, relatedness ${f1(sdt.relatedness)}, each out of 5.`)),
    equity: lensHtml('Adams: equity theory', equity(i.ratings).reading, true),
    expectancy: lensHtml('Vroom: expectancy theory', ex.reading, true, figs(`Expectancy ${f2(ex.e)} \u00d7 instrumentality ${f2(ex.i)} \u00d7 valence ${f2(ex.v)} = ${f2(ex.force)}, an illustrative index, not a measurement.`)),
  };
}

const KIND: Record<RewardKind, string> = { financial: 'Financial rewards', 'non-financial': 'Non-financial rewards', training: 'Training' };

export function rewardsHtml(rs: Reward[]): string {
  return (['financial', 'non-financial', 'training'] as RewardKind[])
    .map((k) => {
      const items = rs.filter((r) => r.kind === k).sort((a, b) => (a.fit === b.fit ? 0 : a.fit === 'strong' ? -1 : 1));
      return `<section class="mo-rewards__group" aria-label="${esc(KIND[k])}"><h4 class="label label--ink">${esc(KIND[k])}</h4>${
        items.length
          ? `<ul class="mo-rewards__list">${items
              .map((r) => `<li class="mo-reward mo-reward--${r.fit}"${r.hl ? ' data-level="HL"' : ''}><p class="mo-reward__head"><span class="mo-reward__name">${esc(r.name)}</span> <span class="mo-reward__fit">${r.fit === 'strong' ? 'Strong fit' : 'Worth considering'}</span>${r.hl ? ' <span class="tag tag--hl">HL</span>' : ''}</p><p>${esc(r.why)}</p><p class="mo-reward__but"><span class="sr-only">Against: </span>${esc(r.but)}</p><p class="mo-reward__theory">${esc(r.theory)}</p></li>`)
              .join('')}</ul>`
          : '<p class="tool-note">None stands out on these ratings.</p>'
      }</section>`;
    })
    .join('');
}

/** The ratings, for the text alternative of both charts and for print. */
export function ratingsRowsHtml(ratings: Record<string, number>): string {
  return FACTORS.map((f) => `<tr${f.hl ? ' data-level="HL"' : ''}><th scope="row">${esc(f.label)}${f.hl ? ' <span class="tag tag--hl">HL</span>' : ''}</th><td class="n">${ratings[f.id] ?? ''}</td></tr>`).join('');
}
