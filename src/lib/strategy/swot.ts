/**
 * SWOT builder with a TOWS matrix. The reader lists and weights factors in the
 * four boxes; simple word checks ask whether a strength or weakness is really
 * internal and an opportunity or threat really external; factors are then
 * paired into strategic options in a TOWS matrix (enrichment: the guide names
 * SWOT analysis, p. 14, but not TOWS). The prompts are questions, not
 * verdicts: a word check cannot know the case.
 */
import { esc } from '../markup';
import { type Check, count, andList, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { button, checksHtml, dots, field, ratingOptions, select } from './ui';

export type Quadrant = 'S' | 'W' | 'O' | 'T';
export type TowsCell = 'SO' | 'WO' | 'ST' | 'WT';

export interface SwotFactor {
  id: string;
  quadrant: Quadrant;
  text: string;
  evidence: string;
  weight: number;
}

export interface TowsOption {
  id: string;
  cell: TowsCell;
  text: string;
  links: string[];
}

export interface SwotState {
  business: string;
  decision: string;
  factors: SwotFactor[];
  tows: TowsOption[];
}

export const QUADRANTS: Record<Quadrant, { name: string; plural: string; where: 'internal' | 'external'; prompt: string; add: string }> = {
  S: { name: 'Strength', plural: 'Strengths', where: 'internal', prompt: 'What does the business do well, or have, that matters for this decision?', add: 'Add a strength' },
  W: { name: 'Weakness', plural: 'Weaknesses', where: 'internal', prompt: 'Where is the business exposed, or worse than its rivals?', add: 'Add a weakness' },
  O: { name: 'Opportunity', plural: 'Opportunities', where: 'external', prompt: 'What is changing outside the business that it could use?', add: 'Add an opportunity' },
  T: { name: 'Threat', plural: 'Threats', where: 'external', prompt: 'What is changing outside the business that could harm it?', add: 'Add a threat' },
};

export const TOWS: Record<TowsCell, { title: string; aim: string; uses: [Quadrant, Quadrant] }> = {
  SO: { title: 'SO options', aim: 'Use strengths to take opportunities', uses: ['S', 'O'] },
  WO: { title: 'WO options', aim: 'Take opportunities that overcome weaknesses', uses: ['W', 'O'] },
  ST: { title: 'ST options', aim: 'Use strengths to reduce threats', uses: ['S', 'T'] },
  WT: { title: 'WT options', aim: 'Reduce weaknesses and avoid threats', uses: ['W', 'T'] },
};

export const WEIGHT_WORDS = ['slight', 'some', 'moderate', 'high', 'decisive'] as const;
const Q_ORDER: Quadrant[] = ['S', 'W', 'O', 'T'];
const CELLS: TowsCell[] = ['SO', 'WO', 'ST', 'WT'];
export const LIMITS = { factors: 40, perQuadrant: 12, tows: 16 };

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): SwotState {
  const r = obj(raw);
  const used = new Set<string>();
  const factors = list(r.factors, LIMITS.factors).map((f) => {
    const x = obj(f);
    return {
      id: ident(x.id, used, 'f'),
      quadrant: oneOf(x.quadrant, Q_ORDER, 'S'),
      text: str(x.text, 160),
      evidence: str(x.evidence, 600),
      weight: int(x.weight, 1, 5, 3),
    };
  });
  const ids = new Set(factors.map((f) => f.id));
  const tows = list(r.tows, LIMITS.tows).map((t) => {
    const x = obj(t);
    const cell = oneOf(x.cell, CELLS, 'SO');
    const allowed = TOWS[cell].uses;
    const links = list(x.links, 12)
      .filter((l): l is string => typeof l === 'string' && ids.has(l))
      .filter((l) => allowed.includes(factors.find((f) => f.id === l)?.quadrant ?? 'S'));
    return { id: ident(x.id, used, 'x'), cell, text: str(x.text, 240), links: [...new Set(links)] };
  });
  return { business: str(r.business, 120), decision: str(r.decision, 300), factors, tows };
}

export function blank(): SwotState {
  return {
    business: '',
    decision: '',
    factors: Q_ORDER.map((q, i) => ({ id: `f${i + 1}`, quadrant: q, text: '', evidence: '', weight: 3 })),
    tows: [],
  };
}

export function newFactor(s: SwotState, quadrant: Quadrant): SwotFactor {
  return { id: nextId('f', [...s.factors.map((f) => f.id), ...s.tows.map((t) => t.id)]), quadrant, text: '', evidence: '', weight: 3 };
}

export function newOption(s: SwotState, cell: TowsCell): TowsOption {
  return { id: nextId('x', [...s.factors.map((f) => f.id), ...s.tows.map((t) => t.id)]), cell, text: '', links: [] };
}

/** Move a factor to another box, dropping TOWS links that no longer fit. Returns how many links were dropped. */
export function moveFactor(s: SwotState, id: string, to: Quadrant): number {
  const f = s.factors.find((x) => x.id === id);
  if (!f || f.quadrant === to) return 0;
  f.quadrant = to;
  let dropped = 0;
  for (const t of s.tows) {
    if (t.links.includes(id) && !TOWS[t.cell].uses.includes(to)) {
      t.links = t.links.filter((l) => l !== id);
      dropped += 1;
    }
  }
  return dropped;
}

/** Drop TOWS links to factors that are no longer in one of the option's two boxes. Returns how many were dropped. */
export function tidyLinks(s: SwotState): number {
  let dropped = 0;
  for (const t of s.tows) {
    const keep = t.links.filter((l) => TOWS[t.cell].uses.includes(s.factors.find((f) => f.id === l)?.quadrant ?? ('' as Quadrant)));
    dropped += t.links.length - keep.length;
    t.links = keep;
  }
  return dropped;
}

/** The prompt under each factor, keyed by the id of its text field. */
export function messages(s: SwotState, uid: string): Record<string, { check?: string }> {
  return Object.fromEntries(s.factors.map((f) => [`${uid}-${f.id}-text`, { check: placementCheck(f) }]));
}

export function removeFactor(s: SwotState, id: string): void {
  s.factors = s.factors.filter((f) => f.id !== id);
  for (const t of s.tows) t.links = t.links.filter((l) => l !== id);
}

/* ---------- The word checks ---------- */

// Words that usually describe the world outside the business. "Market share", "market leader" and
// "marketing" describe the business itself, so they do not count; nor does a rival named only in a
// comparison ("costs above rivals"), which describes the business against its rivals.
type Cue = [(text: string) => boolean, string];
const re = (r: RegExp) => (t: string) => r.test(t);
const COMPARISON = /\b(than|above|below|against|versus|vs|ahead of|behind|beats?|outsells?|best of|worst of)\b/i;
const EXTERNAL: Cue[] = [
  [re(/\bmarkets?\b(?!\s+(share|leader|leadership|position))/i), 'the market'],
  [re(/\bdemand\b/i), 'demand'],
  [(t) => /\b(competitors?|competition|rivals?)\b/i.test(t) && !COMPARISON.test(t), 'competitors'],
  [re(/\b(government|council|ministry)\b/i), 'government'],
  [re(/\b(laws?|legislation|regulations?|regulators?)\b/i), 'the law'],
  [re(/\b(tax|taxes|tariffs?|subsid(y|ies)|grants?)\b/i), 'taxes or grants'],
  [re(/\b(economy|economic|recession|inflation|interest rates?|exchange rates?)\b/i), 'the economy'],
  [re(/\b(trends?|fashion|population|ageing|aging|society)\b/i), 'a social trend'],
  [re(/\b(climate|weather|pandemic|emission zones?|low-emission)\b/i), 'the environment'],
  [re(/\b(new entrants?|substitutes?)\b/i), 'the industry'],
];

// Words that usually describe the business itself.
const INTERNAL: Cue[] = [
  [re(/\b(our|we|us)\b/i), '"our" or "we"'],
  [re(/\b(staff|employees?|workforce|team|skills?|morale|managers?|management)\b/i), 'its people'],
  [re(/\b(brand|reputation|patents?)\b/i), 'its brand'],
  [re(/\b(factory|workshop|assembly|machinery|equipment|website|systems?)\b/i), 'its own assets'],
  [re(/\b(cash|debts?|margins?|profits?)\b/i), 'its finances'],
  [re(/\b(product range|range of products|capacity|quality)\b/i), 'its products or capacity'],
];

// An opportunity or threat written as something the business would do.
const ACTION = /^(launch|open|enter|expand|invest|build|hire|recruit|develop|introduce|buy|acquire|merge|cut|reduce|raise|increase|start|offer|sell|export|partner|create|adopt|switch|use|move|close|drop)\b/i;

function cue(text: string, table: Cue[]): string[] {
  return table.filter(([test]) => test(text)).map(([, label]) => label);
}

/** The first word cue that suggests something inside the business, or "". */
export function internalCue(text: string): string {
  return cue(text, INTERNAL)[0] ?? '';
}

/** The first word cue that suggests something outside the business, or "". */
export function externalCue(text: string): string {
  return cue(text, EXTERNAL)[0] ?? '';
}

/** True when a factor is written as something the business would do. */
export function readsLikeAction(text: string): boolean {
  return ACTION.test(text.trim());
}

/** A question about one factor's box, or "" when the words give no reason to ask. */
export function placementCheck(f: Pick<SwotFactor, 'quadrant' | 'text'>): string {
  const text = f.text.trim();
  if (!text) return '';
  const internal = QUADRANTS[f.quadrant].where === 'internal';
  if (!internal && ACTION.test(text))
    return `This reads like something the business would do. ${QUADRANTS[f.quadrant].plural} are conditions outside the business; an action that uses one belongs in your options, such as the TOWS matrix below.`;
  const ext = cue(text, EXTERNAL);
  const int_ = cue(text, INTERNAL);
  if (internal && ext.length > int_.length)
    return `This mentions ${ext[0]}, which is outside the business's control. ${QUADRANTS[f.quadrant].plural} are internal: is it an opportunity or a threat? If it is about how well the business responds, reword it that way.`;
  if (!internal && int_.length > ext.length)
    return `This mentions ${int_[0]}, which is inside the business. ${QUADRANTS[f.quadrant].plural} are external: is it a strength or a weakness instead?`;
  return '';
}

/* ---------- Analysis ---------- */

export function inQuadrant(s: SwotState, q: Quadrant): SwotFactor[] {
  return s.factors.filter((f) => f.quadrant === q && f.text.trim());
}

export function ranked(s: SwotState, q: Quadrant): SwotFactor[] {
  return inQuadrant(s, q)
    .map((f, i) => ({ f, i }))
    .sort((a, b) => b.f.weight - a.f.weight || a.i - b.i)
    .map((x) => x.f);
}

export function totals(s: SwotState): Record<Quadrant, number> {
  const t = { S: 0, W: 0, O: 0, T: 0 } as Record<Quadrant, number>;
  for (const f of s.factors) if (f.text.trim()) t[f.quadrant] += f.weight;
  return t;
}

/** The label of a factor as the reader sees it: S1, W2 and so on, by its place in its box. */
export function factorCode(s: SwotState, id: string): string {
  const f = s.factors.find((x) => x.id === id);
  if (!f) return '';
  const pos = s.factors.filter((x) => x.quadrant === f.quadrant).findIndex((x) => x.id === id);
  return `${f.quadrant}${pos + 1}`;
}

export interface RankedOption {
  option: TowsOption;
  weight: number;
  factors: SwotFactor[];
}

/** TOWS options with the total weight of the factors each one draws on, heaviest first. */
export function rankOptions(s: SwotState): RankedOption[] {
  return s.tows
    .filter((t) => t.text.trim())
    .map((t, i) => {
      const factors = t.links.map((l) => s.factors.find((f) => f.id === l)).filter((f): f is SwotFactor => Boolean(f && f.text.trim()));
      return { option: t, weight: factors.reduce((n, f) => n + f.weight, 0), factors, i };
    })
    .sort((a, b) => b.weight - a.weight || a.i - b.i)
    .map(({ option, weight, factors }) => ({ option, weight, factors }));
}

/** Heavy weaknesses and threats (weight 4 or 5) that no option deals with. */
export function unaddressed(s: SwotState): SwotFactor[] {
  const linked = new Set(s.tows.filter((t) => t.text.trim()).flatMap((t) => t.links));
  return s.factors.filter((f) => (f.quadrant === 'W' || f.quadrant === 'T') && f.weight >= 4 && f.text.trim() && !linked.has(f.id));
}

export function checks(s: SwotState): Check[] {
  const out: Check[] = [];
  if (!s.decision.trim()) out.push({ level: 'warning', text: 'State the decision this SWOT is for. Without a decision there is no way to judge which factors matter.' });
  for (const q of Q_ORDER) {
    const n = inQuadrant(s, q).length;
    if (n === 0) out.push({ level: 'warning', text: `No ${QUADRANTS[q].plural.toLowerCase()} yet. Is that because there are none, or because you have not looked?` });
    if (n > 6) out.push({ level: 'info', text: `${count(n, true)} ${QUADRANTS[q].plural.toLowerCase()}: cut the list to the few that matter for this decision.` });
  }
  const misplaced = s.factors.filter((f) => placementCheck(f));
  if (misplaced.length) out.push({ level: 'warning', text: `${misplaced.length === 1 ? 'One factor may be' : `${count(misplaced.length, true)} factors may be`} in the wrong box: ${andList(misplaced.map((f) => `${factorCode(s, f.id)} "${f.text.trim()}"`))}. See the prompt under each.` });
  const bare = s.factors.filter((f) => f.text.trim() && !f.evidence.trim());
  if (bare.length) out.push({ level: 'warning', text: `${bare.length === 1 ? 'One factor has' : `${count(bare.length, true)} factors have`} no evidence (${andList(bare.map((f) => factorCode(s, f.id)))}). A point without evidence from the case is an assertion.` });
  const filled = s.factors.filter((f) => f.text.trim());
  if (filled.length >= 4 && filled.every((f) => f.weight === filled[0]?.weight)) out.push({ level: 'info', text: 'Every factor has the same weight. Ranking them is the step that turns a list into analysis.' });
  const seen = new Map<string, SwotFactor>();
  for (const f of filled) {
    const key = f.text.trim().toLowerCase();
    const other = seen.get(key);
    if (other && other.quadrant !== f.quadrant) out.push({ level: 'info', text: `"${f.text.trim()}" is both a ${QUADRANTS[other.quadrant].name.toLowerCase()} and a ${QUADRANTS[f.quadrant].name.toLowerCase()}. That can be right, but say how it cuts both ways.` });
    seen.set(key, f);
  }
  for (const t of s.tows) if (t.text.trim() && !t.links.length) out.push({ level: 'warning', text: `The ${t.cell} option "${t.text.trim()}" is not linked to any factor. Tick the factors it uses.` });
  for (const f of unaddressed(s)) out.push({ level: 'warning', text: `${f.quadrant === 'W' ? 'The weakness' : 'The threat'} "${f.text.trim()}" carries weight ${f.weight}, but no option deals with it.` });
  return out;
}

export function balanceReading(s: SwotState): string {
  const t = totals(s);
  if (!s.factors.some((f) => f.text.trim())) return 'Add factors to see how the position balances.';
  const inner = t.S === t.W ? `strengths and weaknesses weigh the same (${t.S})` : t.S > t.W ? `strengths (${t.S}) outweigh weaknesses (${t.W})` : `weaknesses (${t.W}) outweigh strengths (${t.S})`;
  const outer = t.O === t.T ? `opportunities and threats weigh the same (${t.O})` : t.O > t.T ? `opportunities (${t.O}) outweigh threats (${t.T})` : `threats (${t.T}) outweigh opportunities (${t.O})`;
  const pressure = t.W > t.S && t.T > t.O ? ' The position is under pressure on both fronts, so a strong option must deal with at least one heavy weakness or threat, not only chase an opportunity.' : t.S >= t.W && t.O >= t.T ? ' The position is a strong base for growth, but check that the heavy threats still have an answer.' : '';
  return `On your weights, ${inner}, and ${outer}.${pressure} The totals add judgements together, so read them as a prompt, not a measurement.`;
}

export function headline(s: SwotState): string {
  const top = [...s.factors].filter((f) => f.text.trim()).sort((a, b) => b.weight - a.weight)[0];
  const opts = rankOptions(s);
  const n = s.factors.filter((f) => f.text.trim()).length;
  if (!n) return 'No factors yet.';
  return `Heaviest factor: the ${QUADRANTS[top?.quadrant ?? 'S'].name.toLowerCase()} "${top?.text.trim()}" (weight ${top?.weight}), of ${n} in all.${opts[0] ? ` Leading TOWS option: "${opts[0].option.text.trim()}" (${opts[0].option.cell}, weight of evidence ${opts[0].weight}).` : ''}`;
}

/* ---------- HTML ---------- */

const weightOpts = ratingOptions(WEIGHT_WORDS.map((w) => w[0]!.toUpperCase() + w.slice(1)));

function factorRow(s: SwotState, f: SwotFactor, uid: string): string {
  const id = `${uid}-${f.id}`;
  const code = factorCode(s, f.id);
  const name = f.text.trim() || `${QUADRANTS[f.quadrant].name} ${code.slice(1)}`;
  return `<li class="sx-row sx-row--plain" data-row="${esc(f.id)}"><div class="sx-row__body">${field({
    id: `${id}-text`,
    k: `factors.${f.id}.text`,
    label: `${code} ${QUADRANTS[f.quadrant].name.toLowerCase()}`,
    value: f.text,
    check: placementCheck(f),
    maxlength: 160,
  })}${field({ id: `${id}-ev`, k: `factors.${f.id}.evidence`, label: 'Evidence', value: f.evidence, multiline: true, rows: 2, hint: '' })}<div class="sx-row__meta">${select({
    id: `${id}-w`,
    k: `factors.${f.id}.weight`,
    label: 'Weight',
    value: f.weight,
    options: weightOpts,
    integer: true,
  })}${select({
    id: `${id}-q`,
    k: `factors.${f.id}.quadrant`,
    label: 'Box',
    value: f.quadrant,
    options: Q_ORDER.map((q) => ({ value: q, label: QUADRANTS[q].name })),
  })}${button({ act: 'remove-factor', label: 'Remove', aria: `Remove ${code}: ${name}`, data: { id: f.id }, cls: 'sx-row__remove' })}</div></div></li>`;
}

function towsRow(s: SwotState, t: TowsOption, uid: string): string {
  const id = `${uid}-${t.id}`;
  const [a, b] = TOWS[t.cell].uses;
  const choices = s.factors.filter((f) => f.quadrant === a || f.quadrant === b);
  const boxes = choices.length
    ? choices
        .map(
          (f) =>
            `<label class="sx-tick"><input type="checkbox" value="${esc(f.id)}" data-k="tows.${esc(t.id)}.links"${t.links.includes(f.id) ? ' checked' : ''} /><span><b>${esc(factorCode(s, f.id))}</b> <span data-label-for="${esc(f.id)}">${esc(f.text.trim() || '(no text yet)')}</span></span></label>`,
        )
        .join('')
    : `<p class="small muted">Add ${QUADRANTS[a].plural.toLowerCase()} and ${QUADRANTS[b].plural.toLowerCase()} first.</p>`;
  return `<li class="sx-row sx-row--tows" data-row="${esc(t.id)}"><div class="sx-row__body">${field({
    id: `${id}-text`,
    k: `tows.${t.id}.text`,
    label: `${t.cell} option`,
    value: t.text,
    multiline: true,
    rows: 2,
    maxlength: 240,
  })}<fieldset class="sx-ticks"><legend>Factors it pairs</legend>${boxes}</fieldset>${button({ act: 'remove-option', label: 'Remove option', aria: `Remove ${t.cell} option: ${t.text.trim() || 'untitled'}`, data: { id: t.id }, cls: 'sx-row__remove' })}</div></li>`;
}

export function editorHtml(s: SwotState, uid: string): string {
  const context = `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-decision`,
    k: 'decision',
    label: 'The decision this SWOT is for',
    value: s.decision,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div>`;
  const boxes = Q_ORDER.map((q) => {
    const rows = s.factors.filter((f) => f.quadrant === q);
    return `<fieldset class="sx-q sx-q--${q}"><legend><span class="sx-q__letter" aria-hidden="true">${q}</span> ${QUADRANTS[q].plural} <span class="sx-q__where">${QUADRANTS[q].where}</span></legend><p class="sx-q__prompt">${esc(QUADRANTS[q].prompt)}</p><ol class="sx-rows" role="list">${rows
      .map((f) => factorRow(s, f, uid))
      .join('')}</ol>${button({ act: 'add-factor', label: QUADRANTS[q].add, data: { quadrant: q }, cls: 'sx-add', disabled: rows.length >= LIMITS.perQuadrant || s.factors.length >= LIMITS.factors })}</fieldset>`;
  }).join('');
  const tows = `<div class="sx-tows-ed"><h4 class="sx-ed__h">Pair factors into options: the TOWS matrix <span class="tag tag--enrichment">Enrichment</span></h4><p class="small">Each option should use at least one factor from each of its two boxes. Tick the factors it pairs; the tool ranks options by the weight of evidence behind them.</p><div class="sx-tows-grid">${CELLS.map(
    (c) =>
      `<fieldset class="sx-q sx-q--tows"><legend><span class="sx-q__letter" aria-hidden="true">${c}</span> ${esc(TOWS[c].aim)}</legend><ol class="sx-rows" role="list">${s.tows
        .filter((t) => t.cell === c)
        .map((t) => towsRow(s, t, uid))
        .join('')}</ol>${button({ act: 'add-option', label: `Add ${c.startsWith('S') ? 'an' : 'a'} ${c} option`, data: { cell: c }, cls: 'sx-add', disabled: s.tows.length >= LIMITS.tows })}</fieldset>`,
  ).join('')}</div></div>`;
  return `${context}<div class="sx-swot-ed">${boxes}</div>${tows}`;
}

export function outputsHtml(s: SwotState): string {
  const t = totals(s);
  const grid = Q_ORDER.map((q) => {
    const fs = ranked(s, q);
    return `<div class="sx-swot__cell sx-swot__cell--${q}"><h5 class="sx-swot__name"><span aria-hidden="true">${q}</span> ${QUADRANTS[q].plural} <span class="sx-swot__total">weight ${t[q]}</span></h5>${
      fs.length
        ? `<ol class="sx-swot__list" role="list">${fs
            .map((f) => `<li><span class="sx-swot__text">${esc(f.text.trim())}</span> ${dots(f.weight)}${f.evidence.trim() ? `<span class="sx-swot__ev">${esc(f.evidence.trim())}</span>` : ''}</li>`)
            .join('')}</ol>`
        : '<p class="small muted">None listed.</p>'
    }</div>`;
  }).join('');
  const opts = rankOptions(s);
  const towsTable = `<div class="table-scroll" role="region" aria-label="TOWS matrix" tabindex="0"><table class="table sx-tows"><caption class="sr-only">TOWS matrix: strategic options pairing internal and external factors</caption><thead><tr><th scope="col"><span class="sr-only">External factors</span></th><th scope="col">Strengths</th><th scope="col">Weaknesses</th></tr></thead><tbody>${(['O', 'T'] as const)
    .map(
      (ext) =>
        `<tr><th scope="row">${QUADRANTS[ext].plural}</th>${(['S', 'W'] as const)
          .map((inn) => {
            const cell = `${inn}${ext}` as TowsCell;
            const here = opts.filter((o) => o.option.cell === cell);
            return `<td><p class="sx-tows__aim">${cell}: ${esc(TOWS[cell].aim)}</p>${
              here.length
                ? `<ul class="sx-tows__list" role="list">${here.map((o) => `<li><b>${esc(o.option.text.trim())}</b><span class="small muted"> Pairs ${esc(o.factors.map((f) => factorCode(s, f.id)).join(', ') || 'no factors')}; weight of evidence ${o.weight}</span></li>`).join('')}</ul>`
                : '<p class="small muted">No option yet.</p>'
            }</td>`;
          })
          .join('')}</tr>`,
    )
    .join('')}</tbody></table></div>`;
  const ranking = opts.length
    ? `<ol class="sx-rank" role="list">${opts.map((o, i) => `<li><span class="sx-rank__no num">${i + 1}</span><span class="sx-rank__text">${esc(o.option.text.trim())} <span class="muted small">(${o.option.cell})</span></span><span class="sx-rank__v num">${o.weight}</span></li>`).join('')}</ol>`
    : '<p class="small muted">Add TOWS options to rank them.</p>';
  return `<div class="sx-out__block"><h4 class="sx-out__h">Your SWOT, ranked by weight</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.decision.trim() ? `Decision: ${s.decision.trim()}` : 'Decision not stated.')}</p><div class="sx-swot" role="group" aria-label="SWOT matrix"><p class="sx-swot__axis sx-swot__axis--in" aria-hidden="true">Internal</p><p class="sx-swot__axis sx-swot__axis--out" aria-hidden="true">External</p>${grid}</div></div><div class="sx-out__block"><h4 class="sx-out__h">The balance</h4><dl class="figs sx-figs">${Q_ORDER.map((q) => `<div class="fig"><dt>${QUADRANTS[q].plural}</dt><dd><span class="fig__v num">${t[q]}</span><span class="fig__n">${inQuadrant(s, q).length} factors</span></dd></div>`).join('')}</dl><p data-reading>${esc(balanceReading(s))}</p></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: every box has factors, each with evidence, and every heavy weakness and threat has an option.')}</div><div class="sx-out__block"><h4 class="sx-out__h">TOWS matrix <span class="tag tag--enrichment">Enrichment</span></h4>${towsTable}<h5 class="sx-out__h5">Options by the weight of evidence they draw on</h5>${ranking}<p class="small muted">The weight of evidence is the sum of the weights of the factors an option pairs. It shows which options rest on the factors you judged most important; it does not show whether an option is affordable or wise.</p></div>`;
}

/* ---------- Export ---------- */

export function toText(s: SwotState): string {
  const quads = Q_ORDER.map((q) =>
    textSection(
      `${QUADRANTS[q].plural} (${QUADRANTS[q].where})`,
      ranked(s, q).map((f) => `- ${factorCode(s, f.id)} ${f.text.trim()} [weight ${f.weight}]${f.evidence.trim() ? `\n  Evidence: ${f.evidence.trim()}` : ''}`),
    ),
  );
  const t = totals(s);
  const tows = textSection(
    'TOWS options (enrichment), by weight of evidence',
    rankOptions(s).map((o, i) => `${i + 1}. [${o.option.cell}] ${o.option.text.trim()} (pairs ${o.factors.map((f) => factorCode(s, f.id)).join(', ') || 'no factors'}; weight ${o.weight})`),
  );
  const ch = textSection('Checks', checks(s).map((c) => `- ${c.text}`));
  return textDoc(`SWOT analysis: ${orDash(s.business, 'organization not named')}`, [
    textSection('Decision', [orDash(s.decision)]),
    ...quads,
    textSection('Balance', [`Strengths ${t.S}, weaknesses ${t.W}, opportunities ${t.O}, threats ${t.T}.`, balanceReading(s)]),
    tows,
    ch,
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: SwotState): string {
  const rows: Array<Array<string | number>> = [['Type', 'Box', 'Code', 'Text', 'Evidence', 'Weight', 'Pairs']];
  for (const q of Q_ORDER) for (const f of ranked(s, q)) rows.push(['Factor', QUADRANTS[q].name, factorCode(s, f.id), f.text.trim(), f.evidence.trim(), f.weight, '']);
  for (const o of rankOptions(s)) rows.push(['TOWS option', o.option.cell, '', o.option.text.trim(), '', o.weight, o.factors.map((f) => factorCode(s, f.id)).join(' ')]);
  return toCsv(rows);
}

export function fileName(s: SwotState): string {
  return `${fileSlug(s.business)}-swot`;
}

/** Validation for the integrity check: problems that would make the worked example wrong. */
export function problems(s: SwotState): string[] {
  const out: string[] = [];
  for (const q of Q_ORDER) if (!inQuadrant(s, q).length) out.push(`no ${QUADRANTS[q].plural.toLowerCase()}`);
  for (const f of s.factors) {
    if (!f.text.trim()) out.push(`factor ${f.id} has no text`);
    if (placementCheck(f)) out.push(`factor ${f.id} trips its own placement check: ${placementCheck(f)}`);
  }
  for (const t of s.tows) if (!t.links.length) out.push(`TOWS option ${t.id} pairs no factors`);
  return out;
}

