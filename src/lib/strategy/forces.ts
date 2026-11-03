/**
 * Five Forces assessor (enrichment: Porter's five forces are not in the IB
 * guide's toolkit or syllabus). Each force is rated from 1 (very weak) to 5
 * (very strong) with evidence and a note on what would change it. A strong
 * force takes profit away from the businesses in the market, so the market's
 * attractiveness falls as the average force rises. The bands are the
 * platform's teaching convention.
 */
import { esc } from '../markup';
import { fmtNumber, round } from '../format';
import { type Check, andList, fileSlug, int, obj, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, arrowHead, svgDoc, txt } from './svg';
import { chartRegion, checksHtml, dots, field, ratingOptions, select, tableRegion } from './ui';

export type ForceId = 'rivalry' | 'entry' | 'suppliers' | 'buyers' | 'substitutes';

export interface ForceRating {
  rating: number;
  evidence: string;
  change: string;
}

export interface ForcesState {
  business: string;
  market: string;
  forces: Record<ForceId, ForceRating>;
}

export const FORCES: Record<ForceId, { name: string; short: string; questions: string }> = {
  rivalry: { name: 'Rivalry among existing competitors', short: 'Rivalry', questions: 'How many rivals, how equal in size? Is the market growing? Do they compete on price? Is it costly to leave?' },
  entry: { name: 'Threat of new entrants', short: 'New entrants', questions: 'How much money, skill, scale or reputation does it take to enter? Do laws, patents or brands keep newcomers out?' },
  suppliers: { name: 'Bargaining power of suppliers', short: 'Suppliers', questions: 'How many suppliers are there for the key inputs? How costly is it to switch? Could they sell direct?' },
  buyers: { name: 'Bargaining power of buyers', short: 'Buyers', questions: 'How many buyers, and how large? How easily can they switch or compare prices? How much of their costs is this product?' },
  substitutes: { name: 'Threat of substitutes', short: 'Substitutes', questions: 'What else meets the same need in a different way? Is it cheaper or better? How easily do buyers switch?' },
};

export const FORCE_IDS = Object.keys(FORCES) as ForceId[];
export const STRENGTH_WORDS = ['Very weak', 'Weak', 'Moderate', 'Strong', 'Very strong'] as const;

export type Attractiveness = 'high' | 'moderate' | 'low';
export const ATTRACT: Record<Attractiveness, { name: string; rule: string; css: string; meaning: string }> = {
  high: { name: 'Attractive', rule: 'average force below 2.5', css: 'sx-band--good', meaning: 'the forces leave room for good profits' },
  moderate: { name: 'Moderately attractive', rule: 'average force 2.5 to 3.5', css: 'sx-band--medium', meaning: 'profits are possible, but some forces will squeeze them' },
  low: { name: 'Unattractive', rule: 'average force above 3.5', css: 'sx-band--high', meaning: 'the forces are likely to compete most of the profit away' },
};

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): ForcesState {
  const r = obj(raw);
  const f = obj(r.forces);
  const forces = Object.fromEntries(
    FORCE_IDS.map((id) => {
      const x = obj(f[id]);
      return [id, { rating: int(x.rating, 1, 5, 3), evidence: str(x.evidence, 600), change: str(x.change, 400) }];
    }),
  ) as Record<ForceId, ForceRating>;
  return { business: str(r.business, 120), market: str(r.market, 300), forces };
}

export function blank(): ForcesState {
  return normalize({});
}

/* ---------- The assessment ---------- */

export function average(s: Pick<ForcesState, 'forces'>): number {
  return FORCE_IDS.reduce((n, id) => n + s.forces[id].rating, 0) / FORCE_IDS.length;
}

export function attractiveness(avg: number): Attractiveness {
  const a = round(avg, 2);
  return a < 2.5 ? 'high' : a <= 3.5 ? 'moderate' : 'low';
}

export interface WhatIf {
  id: ForceId;
  to: number;
  average: number;
  band: Attractiveness;
  changesBand: boolean;
}

/** What a one-point change in each force would do: weaker for forces above 1, stronger for forces below 5. */
export function whatIfs(s: ForcesState): { weaker: WhatIf[]; stronger: WhatIf[] } {
  const now = attractiveness(average(s));
  const run = (id: ForceId, to: number): WhatIf => {
    const avg = average({ forces: { ...s.forces, [id]: { ...s.forces[id], rating: to } } });
    const b = attractiveness(avg);
    return { id, to, average: avg, band: b, changesBand: b !== now };
  };
  return {
    weaker: FORCE_IDS.filter((id) => s.forces[id].rating > 1).map((id) => run(id, s.forces[id].rating - 1)),
    stronger: FORCE_IDS.filter((id) => s.forces[id].rating < 5).map((id) => run(id, s.forces[id].rating + 1)),
  };
}

export function strongest(s: ForcesState): ForceId[] {
  const max = Math.max(...FORCE_IDS.map((id) => s.forces[id].rating));
  return FORCE_IDS.filter((id) => s.forces[id].rating === max);
}

export function reading(s: ForcesState): string {
  const avg = average(s);
  const b = attractiveness(avg);
  const top = strongest(s);
  const max = s.forces[top[0]!].rating;
  const names = andList(top.map((id) => FORCES[id].short.toLowerCase()));
  const lead = `On your ratings the market is ${ATTRACT[b].name.toLowerCase()} (average force ${fmtNumber(avg, 1)} of 5): ${ATTRACT[b].meaning}.`;
  const strong = max >= 4 ? ` The strongest ${top.length === 1 ? 'force is' : 'forces are'} ${names} (${max} of 5), so a strategy for this market has to deal with ${top.length === 1 ? 'it' : 'them'}.` : ` No force is strong; the weakest point is ${names} at ${max} of 5.`;
  const w = whatIfs(s).weaker.filter((x) => x.changesBand);
  const tip = w.length ? ` Weakening ${andList(w.map((x) => FORCES[x.id].short.toLowerCase()))} by one point would move the market to ${ATTRACT[w[0]!.band].name.toLowerCase()}.` : ' No single one-point change would move the market into another band.';
  return `${lead}${strong}${tip}`;
}

export function checks(s: ForcesState): Check[] {
  const out: Check[] = [];
  if (!s.market.trim()) out.push({ level: 'warning', text: 'Define the market. The forces on "bicycles" and on "cargo bikes sold to delivery firms" are different, and so is the answer.' });
  const bare = FORCE_IDS.filter((id) => !s.forces[id].evidence.trim());
  if (bare.length) out.push({ level: 'warning', text: `No evidence yet for ${andList(bare.map((id) => FORCES[id].short.toLowerCase()))}. A rating without evidence is a guess.` });
  const noChange = FORCE_IDS.filter((id) => s.forces[id].rating >= 4 && !s.forces[id].change.trim());
  if (noChange.length) out.push({ level: 'info', text: `Say what would change ${andList(noChange.map((id) => FORCES[id].short.toLowerCase()))}: the strong forces are where strategy can act.` });
  if (FORCE_IDS.every((id) => s.forces[id].rating === s.forces.rivalry.rating)) out.push({ level: 'info', text: 'All five forces have the same rating. Markets rarely look like that: look again at the evidence for each.' });
  return out;
}

export function headline(s: ForcesState): string {
  const avg = average(s);
  return `${ATTRACT[attractiveness(avg)].name} market (average force ${fmtNumber(avg, 1)} of 5); strongest: ${andList(strongest(s).map((id) => FORCES[id].short.toLowerCase()))}.`;
}

/* ---------- The diagram ---------- */

export function forcesSvg(s: ForcesState, id: string): string {
  const W = 760;
  const H = 470;
  const bh = 96;
  const cx = W / 2;
  const cy = H / 2;
  const width: Record<ForceId, number> = { rivalry: 196, entry: 196, substitutes: 196, suppliers: 172, buyers: 172 };
  const pos: Record<ForceId, [number, number]> = {
    rivalry: [cx, cy],
    entry: [cx, 66],
    substitutes: [cx, H - 66],
    suppliers: [102, cy],
    buyers: [W - 102, cy],
  };
  const bw = 196;
  const p: string[] = [`<defs>${arrowHead(`${id}-ah`)}</defs>`];
  const arrow = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.slate}" stroke-width="1.5" marker-end="url(#${id}-ah)"/>`;
  p.push(arrow(cx, 66 + bh / 2 + 4, cx, cy - bh / 2 - 6));
  p.push(arrow(cx, H - 66 - bh / 2 - 4, cx, cy + bh / 2 + 6));
  p.push(arrow(102 + width.suppliers / 2 + 4, cy, cx - bw / 2 - 6, cy));
  p.push(arrow(W - 102 - width.buyers / 2 - 4, cy, cx + bw / 2 + 6, cy));
  for (const f of FORCE_IDS) {
    const [x, y] = pos[f];
    const r = s.forces[f].rating;
    const strong = r >= 4;
    const w = width[f];
    const x0 = x - w / 2;
    const y0 = y - bh / 2;
    p.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${bh}" fill="${f === 'rivalry' ? C.paper : C.white}" stroke="${C.ink}" stroke-width="${strong ? 2.5 : 1.25}"/>`);
    p.push(txt(x, y0 + 27, FORCES[f].short, { anchor: 'middle', serif: true, size: 16.5, weight: 700, fill: C.ink }));
    // Five segments, filled to the rating; strong forces are also drawn with a heavier frame and named in words.
    const segW = 22;
    const gap = 4;
    const sx = x - (5 * segW + 4 * gap) / 2;
    for (let i = 0; i < 5; i++) p.push(`<rect x="${sx + i * (segW + gap)}" y="${y0 + 40}" width="${segW}" height="12" fill="${i < r ? (strong ? C.signal : C.ink) : C.white}" stroke="${C.ink}" stroke-width="1"/>`);
    p.push(txt(x, y0 + 79, `${STRENGTH_WORDS[r - 1] ?? ''}, ${r} of 5`, { anchor: 'middle', size: 14, weight: 600, fill: strong ? C.signalText : C.body }));
  }
  const avg = average(s);
  const b = attractiveness(avg);
  const market = s.market.trim() || 'the market';
  const desc = `Five forces diagram for ${market}. ${FORCE_IDS.map((f) => `${FORCES[f].name}: ${(STRENGTH_WORDS[s.forces[f].rating - 1] ?? '').toLowerCase()}, ${s.forces[f].rating} of 5`).join('; ')}. Average force ${fmtNumber(avg, 1)}: ${ATTRACT[b].name.toLowerCase()}.`;
  return svgDoc(W, H, id, `The five forces on ${market}`, desc, p.join(''));
}

/* ---------- HTML ---------- */

const ratingOpts = ratingOptions(STRENGTH_WORDS);

export function editorHtml(s: ForcesState, uid: string): string {
  const context = `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-market`,
    k: 'market',
    label: 'The market being assessed',
    value: s.market,
    multiline: true,
    rows: 2,
    maxlength: 300,
    hint: 'Define it narrowly: who buys what, where.',
  })}</div>`;
  const forces = FORCE_IDS.map((f) => {
    const x = s.forces[f];
    const id = `${uid}-${f}`;
    return `<fieldset class="sx-q sx-q--force"><legend>${esc(FORCES[f].name)}</legend><p class="sx-q__prompt">${esc(FORCES[f].questions)}</p><div class="sx-row__body">${select({
      id: `${id}-r`,
      k: `forces.${f}.rating`,
      label: 'Strength of the force',
      value: x.rating,
      options: ratingOpts,
      integer: true,
    })}${field({ id: `${id}-ev`, k: `forces.${f}.evidence`, label: 'Evidence', value: x.evidence, multiline: true, rows: 2 })}${field({
      id: `${id}-ch`,
      k: `forces.${f}.change`,
      label: 'What would change it',
      value: x.change,
      multiline: true,
      rows: 2,
      maxlength: 400,
    })}</div></fieldset>`;
  }).join('');
  return `${context}${forces}`;
}

export function outputsHtml(s: ForcesState, uid: string): string {
  const avg = average(s);
  const b = attractiveness(avg);
  const w = whatIfs(s);
  const table = tableRegion(
    'The five forces rated',
    `<caption class="sr-only">Each force's rating from 1 (very weak) to 5 (very strong), with the evidence</caption><thead><tr><th scope="col">Force</th><th scope="col" class="n">Rating</th><th scope="col">Evidence</th></tr></thead><tbody>${FORCE_IDS.map(
      (f) =>
        `<tr><th scope="row">${esc(FORCES[f].name)}</th><td class="n nowrap">${dots(s.forces[f].rating)} <span class="num">${s.forces[f].rating}</span><span class="sx-swot__ev">${esc(STRENGTH_WORDS[s.forces[f].rating - 1] ?? '')}</span></td><td class="small">${esc(orDash(s.forces[f].evidence))}</td></tr>`,
    ).join('')}</tbody><tfoot><tr><th scope="row">Average force</th><td class="n num"><strong>${fmtNumber(avg, 1)}</strong></td><td><span class="sx-band ${ATTRACT[b].css}">${ATTRACT[b].name}</span></td></tr></tfoot>`,
  );
  const changes = FORCE_IDS.map((f) => {
    const down = w.weaker.find((x) => x.id === f);
    const up = w.stronger.find((x) => x.id === f);
    const effect = [
      down ? `one point weaker: average ${fmtNumber(down.average, 1)}${down.changesBand ? `, ${ATTRACT[down.band].name.toLowerCase()}` : ''}` : '',
      up ? `one point stronger: average ${fmtNumber(up.average, 1)}${up.changesBand ? `, ${ATTRACT[up.band].name.toLowerCase()}` : ''}` : '',
    ]
      .filter(Boolean)
      .join('; ');
    return `<li><span class="sx-change__force">${esc(FORCES[f].short)} <span class="num">${s.forces[f].rating}</span></span><span class="sx-change__note">${esc(orDash(s.forces[f].change, 'No note yet.'))}</span><span class="sx-change__fx small muted">${esc(effect)}</span></li>`;
  }).join('');
  return `<div class="sx-out__block"><h4 class="sx-out__h">The forces on the market</h4><p class="small muted">${esc(orDash(s.market, 'Market not defined'))}</p>${chartRegion('Five forces diagram', forcesSvg(s, `${uid}-chart`))}${table}</div><div class="sx-out__block"><h4 class="sx-out__h">Overall attractiveness</h4><dl class="figs sx-figs"><div class="fig"><dt>Average force</dt><dd><span class="fig__v num">${fmtNumber(avg, 1)}</span><span class="fig__n">of 5</span></dd></div><div class="fig"><dt>Reading</dt><dd><span class="fig__v sx-fig-word">${ATTRACT[b].name}</span><span class="fig__n">${ATTRACT[b].rule}</span></dd></div></dl><p class="sx-reading" data-reading>${esc(reading(s))}</p><ul class="sx-legend" role="list">${(Object.keys(ATTRACT) as Attractiveness[]).map((k) => `<li><span class="sx-band ${ATTRACT[k].css}">${ATTRACT[k].name}</span> ${ATTRACT[k].rule}</li>`).join('')}<li>The bands are the platform's teaching convention; every force is weighted equally.</li></ul></div><div class="sx-out__block"><h4 class="sx-out__h">What would change it</h4><ul class="sx-change" role="list">${changes}</ul></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the market is defined and every force has evidence.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: ForcesState): string {
  const avg = average(s);
  return textDoc(`Five Forces assessment (enrichment): ${orDash(s.business, 'organization not named')}`, [
    textSection('Market', [orDash(s.market)]),
    ...FORCE_IDS.map((f) => textSection(`${FORCES[f].name}: ${STRENGTH_WORDS[s.forces[f].rating - 1]} (${s.forces[f].rating} of 5)`, [`Evidence: ${orDash(s.forces[f].evidence)}`, `What would change it: ${orDash(s.forces[f].change)}`])),
    textSection('Overall', [`Average force ${fmtNumber(avg, 1)} of 5: ${ATTRACT[attractiveness(avg)].name}.`, reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. Porter\'s five forces are not part of the IB course. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: ForcesState): string {
  return toCsv([
    ['Force', 'Rating (1 to 5)', 'Strength', 'Evidence', 'What would change it'],
    ...FORCE_IDS.map((f) => [FORCES[f].name, s.forces[f].rating, STRENGTH_WORDS[s.forces[f].rating - 1] ?? '', s.forces[f].evidence.trim(), s.forces[f].change.trim()]),
    ['Average force', round(average(s), 2), ATTRACT[attractiveness(average(s))].name, '', ''],
  ]);
}

export function fileName(s: ForcesState): string {
  return `${fileSlug(s.business)}-five-forces`;
}

export function problems(s: ForcesState): string[] {
  const out: string[] = [];
  if (!s.market.trim()) out.push('the market is not defined');
  FORCE_IDS.forEach((f) => (s.forces[f].evidence.trim() && s.forces[f].change.trim()) || out.push(`${f} needs evidence and a note on what would change it`));
  return out;
}
