/**
 * HTML and SVG for the workforce planning tool, rendered on the server for
 * the worked example and in the browser after every change.
 */
import { niceCeil, niceStep } from './charts';
import { esc } from './markup';
import { fmtNumber } from './format';
import type { Fit, PlanYear, WorkforceOption, WorkforcePlan } from './workforce';
import { P, r1, svgChart } from './tool-palette';

/** Staff year by year: who stays and who is recruited above the line, who leaves below it, and the staff needed. */
export function workforceSvg(p: WorkforcePlan, o: { id: string; org: string }): string {
  const W = 660;
  const L = 58;
  const R = 24;
  const T = 30;
  const up = 220;
  const cols = [{ label: 'Now', start: p.inputs.staffNow, available: p.inputs.staffNow, recruit: 0, out: 0, demand: null as number | null }, ...p.rows.map((r) => ({ label: r.label, start: r.start, available: r.available, recruit: r.recruit, out: r.leavers + r.retirements, demand: r.demand }))];
  const top = niceCeil(Math.max(1, ...cols.map((c) => Math.max(c.available + c.recruit, c.demand ?? 0))), 4);
  const bottomMax = niceCeil(Math.max(1, ...cols.map((c) => c.out)), 2);
  const down = Math.max(60, (bottomMax / top) * up);
  const base = T + up;
  const H = base + down + 64;
  const y = (v: number) => base - (v / top) * up;
  const yDown = (v: number) => base + (v / bottomMax) * down;
  const n = cols.length;
  const slot = (W - L - R) / n;
  const bw = Math.min(64, slot * 0.5);
  const parts: string[] = [];
  const step = niceStep(top, 4);
  for (let v = 0; v <= top + 1e-9; v += step) {
    parts.push(`<line x1="${L}" y1="${r1(y(v))}" x2="${W - R}" y2="${r1(y(v))}" stroke="${P.hair}"/>`);
    parts.push(`<text x="${L - 8}" y="${r1(y(v)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(v))}</text>`);
  }
  parts.push(`<text x="${L - 8}" y="${r1(yDown(bottomMax)) + 4}" text-anchor="end" class="ch-tick">${esc(fmtNumber(bottomMax))}</text>`);
  parts.push(`<defs><pattern id="${o.id}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="${P.signal}" stroke-width="2.5"/></pattern></defs>`);
  cols.forEach((c, k) => {
    const cx = L + slot * (k + 0.5);
    const x0 = cx - bw / 2;
    parts.push(`<rect x="${r1(x0)}" y="${r1(y(c.available))}" width="${r1(bw)}" height="${r1(base - y(c.available))}" fill="${P.navy}"/>`);
    if (c.recruit > 0) {
      parts.push(`<rect x="${r1(x0)}" y="${r1(y(c.available + c.recruit))}" width="${r1(bw)}" height="${r1(y(c.available) - y(c.available + c.recruit))}" fill="${P.cobalt}"/>`);
      if (y(c.available) - y(c.available + c.recruit) > 15) parts.push(`<text x="${r1(cx)}" y="${r1((y(c.available) + y(c.available + c.recruit)) / 2 + 4)}" text-anchor="middle" class="ch-note wf-ch__in" fill="#fff">+${esc(fmtNumber(c.recruit))}</text>`);
    }
    // The total sits above both the bar and the mark for the staff needed.
    const labelY = Math.min(y(c.available + c.recruit), c.demand === null ? Infinity : y(c.demand)) - 8;
    parts.push(`<text x="${r1(cx)}" y="${r1(labelY)}" text-anchor="middle" class="ch-label" fill="${P.navy}">${esc(fmtNumber(c.available + c.recruit))}</text>`);
    if (c.demand !== null) {
      const dy = y(c.demand);
      parts.push(`<line x1="${r1(x0 - 8)}" y1="${r1(dy)}" x2="${r1(x0 + bw + 8)}" y2="${r1(dy)}" stroke="${P.gold600}" stroke-width="3"/>`);
    }
    if (c.out > 0) {
      parts.push(`<rect x="${r1(x0)}" y="${base}" width="${r1(bw)}" height="${r1(yDown(c.out) - base)}" fill="url(#${o.id}-hatch)" stroke="${P.signal}"/>`);
      parts.push(`<text x="${r1(cx)}" y="${r1(yDown(c.out) + 14)}" text-anchor="middle" class="ch-note" fill="${P.signalText}">−${esc(fmtNumber(c.out))}</text>`);
    }
    parts.push(`<text x="${r1(cx)}" y="${r1(H - 34)}" text-anchor="middle" class="ch-tick">${esc(c.label)}</text>`);
  });
  parts.push(`<line x1="${L}" y1="${base}" x2="${W - R}" y2="${base}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<line x1="${L}" y1="${T - 6}" x2="${L}" y2="${r1(base + down)}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<text x="14" y="${(T + base) / 2}" text-anchor="middle" class="ch-axis" transform="rotate(-90 14 ${(T + base) / 2})">Staff</text>`);
  // Key, in words.
  const ky = H - 12;
  parts.push(`<rect x="${L}" y="${ky - 9}" width="11" height="11" fill="${P.navy}"/><text x="${L + 16}" y="${ky}" class="ch-note" fill="${P.navy}">Stayed</text>`);
  parts.push(`<rect x="${L + 74}" y="${ky - 9}" width="11" height="11" fill="${P.cobalt}"/><text x="${L + 90}" y="${ky}" class="ch-note" fill="${P.cobaltText}">Recruited</text>`);
  parts.push(`<rect x="${L + 166}" y="${ky - 9}" width="11" height="11" fill="url(#${o.id}-hatch)" stroke="${P.signal}"/><text x="${L + 182}" y="${ky}" class="ch-note" fill="${P.signalText}">Left or retired</text>`);
  parts.push(`<line x1="${L + 290}" y1="${ky - 4}" x2="${L + 306}" y2="${ky - 4}" stroke="${P.gold600}" stroke-width="3"/><text x="${L + 312}" y="${ky}" class="ch-note" fill="${P.brassText}">Staff needed</text>`);
  const desc = `Staff at ${o.org} now and in each year of the plan. ${p.rows
    .map((r) => `${r.label}: ${fmtNumber(r.start)} at the start, ${fmtNumber(r.leavers + r.retirements)} leave or retire, ${fmtNumber(r.recruit)} recruited, ${fmtNumber(r.end)} at the end against ${fmtNumber(r.demand)} needed`)
    .join('; ')}. In all, ${fmtNumber(p.totalRecruit)} people are recruited.`;
  return svgChart({ w: W, h: H, id: o.id, title: `Workforce plan: ${o.org}`, desc, body: parts.join(''), minWidth: 480, maxWidth: W * 1.2 });
}

export function workforceRowsHtml(p: WorkforcePlan): string {
  return p.rows
    .map((r) => {
      const flag = r.shortfall > 0 ? ` <span class="wf-flag wf-flag--short">${fmtNumber(r.shortfall)} unfilled</span>` : r.surplus > 0 ? ` <span class="wf-flag wf-flag--over">${fmtNumber(r.surplus)} surplus</span>` : '';
      return `<tr><th scope="row">${esc(r.label)}</th><td class="n">${fmtNumber(r.start)}</td><td class="n">${fmtNumber(r.leavers)}</td><td class="n">${fmtNumber(r.retirements)}</td><td class="n">${fmtNumber(r.available)}</td><td class="n">${fmtNumber(r.demand)}</td><td class="n"><strong>${fmtNumber(r.recruit)}</strong>${flag}</td><td class="n">${fmtNumber(r.end)}</td></tr>`;
    })
    .join('');
}

const FIT_LABEL: Record<Fit, string> = { strong: 'Strong fit', consider: 'Worth considering', unlikely: 'Less likely here' };

export function workforceOptionsHtml(options: WorkforceOption[]): string {
  const order: Fit[] = ['strong', 'consider', 'unlikely'];
  return order
    .flatMap((f) => options.filter((o) => o.fit === f))
    .map(
      (o) =>
        `<li class="wf-opt wf-opt--${o.fit}"${o.hl ? ' data-level="HL"' : ''}><p class="wf-opt__head"><span class="wf-opt__name">${esc(o.name)}</span> <span class="wf-opt__fit">${FIT_LABEL[o.fit]}</span>${o.hl ? ' <span class="tag tag--hl">HL</span>' : ''}</p><p class="wf-opt__why">${esc(o.why)}</p><p class="wf-opt__but"><span class="sr-only">Against: </span>${esc(o.but)}</p></li>`,
    )
    .join('');
}

const fig = (k: string, v: string, note?: string) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;

export function workforceFiguresHtml(p: WorkforcePlan): string {
  const last = p.rows[p.rows.length - 1];
  return [
    fig('Staff now', esc(fmtNumber(p.inputs.staffNow))),
    fig(`Staff needed in ${last?.label ?? 'the last year'}`, esc(fmtNumber(last?.demand ?? 0)), `${p.growth >= 0 ? '+' : '−'}${fmtNumber(Math.abs(p.growth))} on today`),
    fig('Recruitment over the plan', esc(fmtNumber(p.totalRecruit)), p.totalShortfall ? `${fmtNumber(p.totalShortfall)} posts unfilled at the limit` : 'every gap filled'),
    fig('Hires that replace leavers', esc(fmtNumber(p.replacement)), p.replacementShare === null ? 'no hires' : `${fmtNumber(p.replacementShare, 0)}% of the recruitment`),
    fig('People leaving', esc(fmtNumber(p.totalLeavers + p.totalRetirements)), `${fmtNumber(p.totalLeavers)} leavers at ${fmtNumber(p.inputs.rate, 1)}% a year and ${fmtNumber(p.totalRetirements)} retirements`),
  ].join('');
}

/** The editable years of the plan. */
export function yearRowsHtml(years: PlanYear[], uid: string): string {
  return years
    .map(
      (y, k) =>
        `<tr data-year="${k}"><th scope="row"><label class="sr-only" for="${uid}-y${k}-label">Name of year ${k + 1}</label><input class="input wf-year__label" id="${uid}-y${k}-label" name="label" type="text" maxlength="16" value="${esc(y.label)}" aria-describedby="${uid}-y${k}-err"></th><td><label class="sr-only" for="${uid}-y${k}-demand">Staff needed, ${esc(y.label)}</label><input class="input input--num" id="${uid}-y${k}-demand" name="demand" type="number" inputmode="numeric" min="0" step="1" value="${y.demand}" aria-describedby="${uid}-y${k}-err"></td><td><label class="sr-only" for="${uid}-y${k}-retirements">Retirements, ${esc(y.label)}</label><input class="input input--num" id="${uid}-y${k}-retirements" name="retirements" type="number" inputmode="numeric" min="0" step="1" value="${y.retirements}" aria-describedby="${uid}-y${k}-err"></td><td class="wf-year__err"><span class="field__error" id="${uid}-y${k}-err" data-err-year="${k}"></span></td></tr>`,
    )
    .join('');
}
