/**
 * The weighted location assessment (5.4) with the reader's own factors and
 * sites. The scoring, the sensitivity of the ranking to each weight, the low
 * scores and the reading are the Operations Floor's existing functions in
 * src/lib/operations.ts; this module checks the reader's matrix and turns it
 * into tables, a chart and a file.
 */
import { esc } from './markup';
import { fmtNumber } from './format';
import { leaders, lowScores, readLocation, sensitivity, weightedScores, type LocFactor, type LocSite, type SiteResult } from './operations';
import { P, r1, svgChart, wrapWords } from './tool-palette';

export const MAX_FACTORS = 10;
export const MAX_SITES = 6;

export interface LocationMatrix {
  factors: LocFactor[];
  sites: LocSite[];
  maxScore: number;
  maxWeight: number;
  lowThreshold: number;
}

export interface LocationProblem {
  kind: 'factor' | 'site' | 'score' | 'weight' | 'matrix';
  factor?: string;
  site?: string;
  message: string;
}

export function validateMatrix(m: LocationMatrix): LocationProblem[] {
  const out: LocationProblem[] = [];
  if (m.factors.length < 2) out.push({ kind: 'matrix', message: 'Use at least two factors.' });
  if (m.factors.length > MAX_FACTORS) out.push({ kind: 'matrix', message: `Use up to ${MAX_FACTORS} factors.` });
  if (m.sites.length < 2) out.push({ kind: 'matrix', message: 'Compare at least two sites.' });
  if (m.sites.length > MAX_SITES) out.push({ kind: 'matrix', message: `Compare up to ${MAX_SITES} sites.` });
  for (const f of m.factors) {
    if (!f.label.trim()) out.push({ kind: 'factor', factor: f.id, message: 'Name the factor.' });
    if (!Number.isInteger(f.weight) || f.weight < 0 || f.weight > m.maxWeight) out.push({ kind: 'weight', factor: f.id, message: `Give a whole-number weight from 0 to ${m.maxWeight}.` });
  }
  for (const s of m.sites) {
    if (!s.name.trim()) out.push({ kind: 'site', site: s.id, message: 'Name the site.' });
    for (const f of m.factors) {
      const v = s.scores[f.id];
      if (v === undefined || !Number.isFinite(v) || v < 0 || v > m.maxScore) out.push({ kind: 'score', site: s.id, factor: f.id, message: `Score from 0 to ${m.maxScore}.` });
    }
  }
  if (m.factors.length && m.factors.every((f) => f.weight === 0)) out.push({ kind: 'matrix', message: 'Give at least one factor a weight above zero.' });
  return out;
}

export interface LocationResult {
  results: SiteResult[];
  maxTotal: number;
  leaders: string[];
  reading: { reading: string; implication: string };
  low: Array<{ site: string; factor: string; score: number }>;
}

export function assessLocation(m: LocationMatrix): LocationResult {
  const weights = Object.fromEntries(m.factors.map((f) => [f.id, f.weight]));
  const results = weightedScores(m.sites, m.factors, weights, m.maxScore);
  const sens = sensitivity(m.sites, m.factors, weights, m.maxScore, m.maxWeight);
  return {
    results,
    maxTotal: m.factors.reduce((n, f) => n + f.weight * m.maxScore, 0),
    leaders: leaders(results),
    reading: readLocation(results, sens, m.sites, m.factors, weights),
    low: lowScores(m.sites, m.factors, m.lowThreshold),
  };
}

/* ---------- Views ---------- */

/** Each site's weighted total as a bar, the leader drawn darkest and named in words. */
export function locationSvg(r: LocationResult, id: string): string {
  const W = 640;
  const rowH = 46;
  const L = 170;
  const R = 70;
  const T = 30;
  const H = T + r.results.length * rowH + 34;
  const max = Math.max(1, r.maxTotal);
  const x = (v: number) => L + (v / max) * (W - L - R);
  const parts: string[] = [];
  for (let k = 0; k <= 4; k += 1) {
    const v = (max * k) / 4;
    parts.push(`<line x1="${r1(x(v))}" y1="${T - 8}" x2="${r1(x(v))}" y2="${H - 30}" stroke="${P.hair}"/>`);
    parts.push(`<text x="${r1(x(v))}" y="${H - 12}" text-anchor="middle" class="ch-tick">${esc(fmtNumber(v, Number.isInteger(v) ? 0 : 1))}</text>`);
  }
  r.results.forEach((s, k) => {
    const y0 = T + k * rowH;
    const lead = s.rank === 1;
    const lines = wrapWords(s.name, 22, 2);
    lines.forEach((l, j) => parts.push(`<text x="${L - 10}" y="${r1(y0 + 20 + j * 14 - (lines.length - 1) * 7)}" text-anchor="end" class="ch-label" fill="${P.navy}">${esc(l)}</text>`));
    parts.push(`<rect x="${L}" y="${y0 + 8}" width="${r1(Math.max(1, x(s.total) - L))}" height="22" fill="${lead ? P.navy : P.slate300}"/>`);
    parts.push(`<text x="${r1(x(s.total) + 6)}" y="${y0 + 24}" class="ch-label" fill="${P.navy}">${esc(fmtNumber(s.total))}${lead ? ' (first)' : ''}</text>`);
  });
  parts.push(`<line x1="${L}" y1="${T - 8}" x2="${L}" y2="${H - 30}" stroke="${P.navy}" stroke-width="1.25"/>`);
  parts.push(`<text x="${L}" y="16" class="ch-note" fill="${P.slate}">Weighted total, out of ${esc(fmtNumber(r.maxTotal))}</text>`);
  const desc = `Weighted totals out of a possible ${fmtNumber(r.maxTotal)}: ${r.results.map((s) => `${s.name} ${fmtNumber(s.total)} (rank ${s.rank})`).join('; ')}.`;
  return svgChart({ w: W, h: H, id, title: 'Weighted total for each site', desc, body: parts.join(''), minWidth: 460, maxWidth: W * 1.2 });
}

/** Weight × score for every factor and site, with the totals: the working behind the ranking. */
export function contributionRowsHtml(m: LocationMatrix, r: LocationResult): string {
  const rows = m.factors
    .map((f) => `<tr><th scope="row">${esc(f.label)} <span class="loc-w">× ${f.weight}</span></th>${m.sites.map((s) => {
      const v = s.scores[f.id] ?? 0;
      const low = v <= m.lowThreshold;
      return `<td class="n${low ? ' is-low' : ''}">${esc(fmtNumber(f.weight * v))}<span class="loc-of"> (${esc(fmtNumber(v))})</span>${low ? '<span class="sr-only">, a low score</span>' : ''}</td>`;
    }).join('')}</tr>`)
    .join('');
  const total = `<tr class="is-total"><th scope="row">Weighted total</th>${m.sites.map((s) => `<td class="n"><strong>${esc(fmtNumber(r.results.find((x) => x.id === s.id)?.total ?? 0))}</strong></td>`).join('')}</tr>`;
  const rank = `<tr><th scope="row">Rank</th>${m.sites.map((s) => `<td class="n">${r.results.find((x) => x.id === s.id)?.rank ?? ''}</td>`).join('')}</tr>`;
  return rows + total + rank;
}

export function lowListHtml(m: LocationMatrix, r: LocationResult): string {
  if (!r.low.length) return `<p class="tool-note">No score is ${m.lowThreshold} or below.</p>`;
  const site = (id: string) => m.sites.find((s) => s.id === id)?.name ?? id;
  const factor = (id: string) => m.factors.find((f) => f.id === id)?.label.toLowerCase() ?? id;
  return `<ul class="loc-low">${r.low.map((x) => `<li><strong>${esc(site(x.site))}</strong>: ${esc(factor(x.factor))}, ${x.score} out of ${m.maxScore}</li>`).join('')}</ul>`;
}

/** The editable matrix: factors as rows with their weights, sites as columns. */
export function matrixHtml(m: LocationMatrix, uid: string, problems: LocationProblem[]): string {
  const bad = (p: (x: LocationProblem) => boolean) => problems.some(p);
  const head = `<thead><tr><th scope="col">Factor</th><th scope="col" class="n">Weight, 0 to ${m.maxWeight}</th>${m.sites
    .map(
      (s, k) =>
        `<th scope="col" class="loc-site"><label class="sr-only" for="${uid}-s-${esc(s.id)}">Name of site ${k + 1}</label><input class="input loc-site__name" id="${uid}-s-${esc(s.id)}" data-site="${esc(s.id)}" name="site" type="text" maxlength="40" value="${esc(s.name)}"${bad((x) => x.kind === 'site' && x.site === s.id) ? ' aria-invalid="true"' : ''}><button type="button" class="btn btn--small loc-x js-only" data-remove-site="${esc(s.id)}">Remove<span class="sr-only"> ${esc(s.name)}</span></button></th>`,
    )
    .join('')}<th scope="col"><span class="sr-only">Remove a factor</span></th></tr></thead>`;
  const body = m.factors
    .map((f, k) => {
      const cells = m.sites
        .map((s) => {
          const v = s.scores[f.id];
          return `<td><label class="sr-only" for="${uid}-c-${esc(s.id)}-${esc(f.id)}">${esc(f.label)}, ${esc(s.name)}: score out of ${m.maxScore}</label><input class="input input--num loc-cell" id="${uid}-c-${esc(s.id)}-${esc(f.id)}" data-site="${esc(s.id)}" data-factor="${esc(f.id)}" name="score" type="number" inputmode="numeric" min="0" max="${m.maxScore}" step="1" value="${v === undefined || !Number.isFinite(v) ? '' : v}"${bad((x) => x.kind === 'score' && x.site === s.id && x.factor === f.id) ? ' aria-invalid="true"' : ''}></td>`;
        })
        .join('');
      return `<tr><th scope="row"><label class="sr-only" for="${uid}-f-${esc(f.id)}">Factor ${k + 1}</label><input class="input loc-factor" id="${uid}-f-${esc(f.id)}" data-factor="${esc(f.id)}" name="factor" type="text" maxlength="60" value="${esc(f.label)}"${bad((x) => x.kind === 'factor' && x.factor === f.id) ? ' aria-invalid="true"' : ''}></th><td><label class="sr-only" for="${uid}-w-${esc(f.id)}">Weight of ${esc(f.label)}</label><input class="input input--num loc-weight" id="${uid}-w-${esc(f.id)}" data-factor="${esc(f.id)}" name="weight" type="number" inputmode="numeric" min="0" max="${m.maxWeight}" step="1" value="${f.weight}"${bad((x) => x.kind === 'weight' && x.factor === f.id) ? ' aria-invalid="true"' : ''}></td>${cells}<td><button type="button" class="btn btn--small loc-x js-only" data-remove-factor="${esc(f.id)}">Remove<span class="sr-only"> ${esc(f.label)}</span></button></td></tr>`;
    })
    .join('');
  return head + `<tbody>${body}</tbody>`;
}

export function locationCsvRows(m: LocationMatrix, r: LocationResult): string[][] {
  return [
    ['Factor', 'Weight', ...m.sites.map((s) => `${s.name} score`), ...m.sites.map((s) => `${s.name} weighted`)],
    ...m.factors.map((f) => [f.label, String(f.weight), ...m.sites.map((s) => String(s.scores[f.id] ?? '')), ...m.sites.map((s) => String(f.weight * (s.scores[f.id] ?? 0)))]),
    ['Weighted total', '', ...m.sites.map(() => ''), ...m.sites.map((s) => String(r.results.find((x) => x.id === s.id)?.total ?? ''))],
  ];
}
