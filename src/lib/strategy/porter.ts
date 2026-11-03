/**
 * Porter's generic strategies (HL). Each business is placed by its source of
 * advantage, judged on two scales (its costs against rivals', and the premium
 * customers pay for what makes it different), and by its competitive scope
 * (the whole market or a niche). A business strong on neither scale is at
 * risk of being stuck in the middle, which Porter warned against; one strong
 * on both is a combination he thought unstable and some writers think can
 * last. The guide lists Porter's generic strategies as an HL-only toolkit
 * tool (p. 14).
 */
import { esc } from '../markup';
import { type Check, andList, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, arrowHead, placeLabel, r1, svgDoc, txt } from './svg';
import { button, chartRegion, checksHtml, field, radios, ratingOptions, select, tableRegion } from './ui';

export type Role = 'now' | 'proposed' | 'rival';
export type Scope = 'broad' | 'narrow';
export type Generic = 'cost-leadership' | 'cost-focus' | 'differentiation' | 'differentiation-focus' | 'middle' | 'hybrid';

export interface Position {
  id: string;
  name: string;
  role: Role;
  scope: Scope;
  /** Cost advantage, 1 (much higher costs than rivals) to 5 (much lower). */
  cost: number;
  /** Differentiation, 1 (nothing customers would pay more for) to 5 (a strong premium). */
  diff: number;
  evidence: string;
}

export interface PorterState {
  business: string;
  market: string;
  positions: Position[];
}

export const COST_WORDS = ['Much higher costs than rivals', 'Higher costs', 'About the same', 'Lower costs', 'Much lower costs'] as const;
export const DIFF_WORDS = ['No premium', 'A slight premium', 'Some premium', 'A clear premium', 'A strong premium'] as const;
const COST_PHRASE = ['much higher than', 'higher than', 'about the same as', 'lower than', 'much lower than'] as const;
export const ROLES: Record<Role, string> = { now: 'The business now', proposed: 'A proposed position', rival: 'A rival' };
const ROLE_IDS = Object.keys(ROLES) as Role[];

export const GENERIC: Record<Generic, { name: string; note: string }> = {
  'cost-leadership': { name: 'Cost leadership', note: 'The lowest costs in a broad market: it can win on price, or match rivals’ prices and earn a higher margin.' },
  'cost-focus': { name: 'Cost focus', note: 'The lowest costs in a niche.' },
  differentiation: { name: 'Differentiation', note: 'Something customers across the market value enough to pay more for; it pays only if the premium exceeds the extra cost.' },
  'differentiation-focus': { name: 'Differentiation focus', note: 'Something distinctive for one segment, which pays a premium for it.' },
  middle: { name: 'Stuck in the middle (risk)', note: 'Neither the lowest costs nor a difference that earns a clear premium: Porter warned that such a business loses price-sensitive buyers to the cost leaders and quality-seeking buyers to the differentiators.' },
  hybrid: { name: 'Low cost and differentiation together', note: 'Porter thought this combination unstable; some writers point to businesses that sustain it. It needs evidence that both advantages can last.' },
};

export const LIMITS = { positions: 8 };

export function genericOf(p: Pick<Position, 'cost' | 'diff' | 'scope'>): Generic {
  const lowCost = p.cost >= 4;
  const different = p.diff >= 4;
  if (lowCost && different) return 'hybrid';
  if (lowCost) return p.scope === 'broad' ? 'cost-leadership' : 'cost-focus';
  if (different) return p.scope === 'broad' ? 'differentiation' : 'differentiation-focus';
  return 'middle';
}

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): PorterState {
  const r = obj(raw);
  const used = new Set<string>();
  return {
    business: str(r.business, 120),
    market: str(r.market, 300),
    positions: list(r.positions, LIMITS.positions).map((p) => {
      const x = obj(p);
      return {
        id: ident(x.id, used, 'p'),
        name: str(x.name, 80),
        role: oneOf(x.role, ROLE_IDS, 'rival'),
        scope: oneOf(x.scope, ['broad', 'narrow'] as const, 'broad'),
        cost: int(x.cost, 1, 5, 3),
        diff: int(x.diff, 1, 5, 3),
        evidence: str(x.evidence, 500),
      };
    }),
  };
}

export function blank(): PorterState {
  return {
    business: '',
    market: '',
    positions: [
      { id: 'p1', name: '', role: 'now', scope: 'broad', cost: 3, diff: 3, evidence: '' },
      { id: 'p2', name: '', role: 'rival', scope: 'broad', cost: 3, diff: 3, evidence: '' },
    ],
  };
}

export function newPosition(s: Pick<PorterState, 'positions'>, role: Role): Position {
  return { id: nextId('p', s.positions.map((p) => p.id)), name: '', role, scope: 'broad', cost: 3, diff: 3, evidence: '' };
}

/* ---------- Reading the positions ---------- */

const label = (p: Position) => p.name.trim() || ROLES[p.role];

export function describe(p: Position): string {
  const g = genericOf(p);
  const scope = p.scope === 'broad' ? 'a broad scope' : 'a narrow scope';
  if (g === 'middle')
    return `${label(p)}: stuck in the middle risk. With ${scope}, its costs are ${COST_PHRASE[p.cost - 1]} rivals' (${p.cost} of 5) and its difference earns ${DIFF_WORDS[p.diff - 1]!.toLowerCase()} (${p.diff} of 5), so it is neither the cheapest nor clearly different.`;
  if (g === 'hybrid') return `${label(p)}: low cost and differentiation together (cost ${p.cost}, differentiation ${p.diff}), with ${scope}. Check that both advantages can last.`;
  return `${label(p)}: ${GENERIC[g].name.toLowerCase()} (${scope}; cost advantage ${p.cost} of 5, differentiation ${p.diff} of 5).`;
}

export function checks(s: PorterState): Check[] {
  const out: Check[] = [];
  const now = s.positions.filter((p) => p.role === 'now');
  const proposed = s.positions.filter((p) => p.role === 'proposed');
  if (now.length !== 1) out.push({ level: 'error', text: now.length ? 'Mark only one position as "the business now".' : 'Mark one position as "the business now", so the reading has something to compare.' });
  if (proposed.length > 1) out.push({ level: 'error', text: 'Mark at most one position as proposed.' });
  if (!s.positions.some((p) => p.role === 'rival')) out.push({ level: 'info', text: 'Add at least one rival. A position only means something against the alternatives customers have.' });
  const bare = s.positions.filter((p) => !p.evidence.trim());
  if (bare.length) out.push({ level: 'warning', text: `No evidence yet for ${andList(bare.map((p) => `"${label(p)}"`))}. A rating of cost or premium needs a figure or a fact behind it.` });
  const n = now[0];
  const pr = proposed[0];
  if (n && pr) {
    if (genericOf(n) === genericOf(pr)) out.push({ level: 'info', text: `The proposed position has the same generic strategy as now (${GENERIC[genericOf(n)].name.toLowerCase()}). Is it a change of strategy, or a better version of the same one?` });
    const same = s.positions.filter((p) => p.role === 'rival' && genericOf(p) === genericOf(pr) && genericOf(pr) !== 'middle');
    if (same.length) out.push({ level: 'warning', text: `${andList(same.map((p) => `"${label(p)}"`))} already ${same.length === 1 ? 'holds' : 'hold'} ${GENERIC[genericOf(pr)].name.toLowerCase()}. Say why customers would choose this business there instead.` });
    if (genericOf(pr) === 'hybrid') out.push({ level: 'warning', text: 'The proposed position combines low cost and differentiation. Show how the business would achieve both, and why rivals could not copy it.' });
  }
  return out;
}

export function reading(s: PorterState): string {
  const n = s.positions.find((p) => p.role === 'now');
  const pr = s.positions.find((p) => p.role === 'proposed');
  if (!n) return 'Mark one position as the business now to read it.';
  const rivals = s.positions.filter((p) => p.role === 'rival');
  const rivalText = rivals.length ? ` Rivals: ${andList(rivals.map((p) => `${label(p)} (${GENERIC[genericOf(p)].name.toLowerCase()})`))}.` : '';
  const move = pr ? ` Proposed: ${describe(pr).replace(`${label(pr)}: `, '')} ${genericOf(pr) !== 'middle' && genericOf(n) === 'middle' ? 'The move would give the business a clear basis for competing, if the evidence supports the new ratings.' : ''}` : '';
  return `${describe(n)}${move}${rivalText}`.replace(/\s+/g, ' ').trim();
}

export function headline(s: PorterState): string {
  const n = s.positions.find((p) => p.role === 'now');
  const pr = s.positions.find((p) => p.role === 'proposed');
  if (!n) return 'No position marked as the business now.';
  return `Now: ${GENERIC[genericOf(n)].name.toLowerCase()} (${n.scope} scope)${pr ? `; proposed: ${GENERIC[genericOf(pr)].name.toLowerCase()} (${pr.scope} scope)` : ''}.`;
}

/* ---------- The chart ---------- */

export function porterSvg(s: PorterState, id: string): string {
  const W = 600;
  const H = 460;
  const L = 70;
  const R = 22;
  const T = 24;
  const B = 66;
  const pw = W - L - R;
  const ph = H - T - B;
  const xOf = (v: number) => L + ((v - 0.5) / 5) * pw;
  const yOf = (v: number) => T + ph - ((v - 0.5) / 5) * ph;
  const cut = 3.5;
  const p: string[] = [`<defs>${arrowHead(`${id}-ah`, C.cobalt)}</defs>`];
  const zones: Array<[number, number, number, number, string, string, 'start' | 'end', number, number]> = [
    [xOf(0.5), yOf(5.5), xOf(cut) - xOf(0.5), yOf(cut) - yOf(5.5), C.goldWash, 'DIFFERENTIATION', 'start', xOf(0.5) + 8, yOf(5.5) + 18],
    [xOf(cut), yOf(5.5), xOf(5.5) - xOf(cut), yOf(cut) - yOf(5.5), '#eef1ec', 'BOTH: UNSTABLE?', 'end', xOf(5.5) - 8, yOf(5.5) + 18],
    [xOf(0.5), yOf(cut), xOf(cut) - xOf(0.5), yOf(0.5) - yOf(cut), C.signalWash, 'STUCK IN THE MIDDLE', 'start', xOf(0.5) + 8, yOf(0.5) - 10],
    [xOf(cut), yOf(cut), xOf(5.5) - xOf(cut), yOf(0.5) - yOf(cut), C.greenWash, 'COST LEADERSHIP', 'end', xOf(5.5) - 8, yOf(0.5) - 10],
  ];
  for (const [x, y, w, h, fill, name, anchor, tx, ty] of zones) {
    p.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fill}" fill-opacity="0.7"/>`);
    p.push(txt(tx, ty, name, { anchor, size: 10.5, weight: 700, fill: name.startsWith('STUCK') ? C.signalText : name.startsWith('COST') ? C.greenText : name.startsWith('DIFF') ? C.goldText : C.slate }));
  }
  p.push(`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`);
  for (let v = 1; v <= 5; v++) {
    p.push(txt(xOf(v), T + ph + 18, String(v), { anchor: 'middle', size: 11, fill: C.slate }));
    p.push(txt(L - 10, yOf(v) + 4, String(v), { anchor: 'end', size: 11, fill: C.slate }));
  }
  p.push(txt(L, T + ph + 36, 'Higher costs', { size: 10.5, fill: C.slate, italic: true }));
  p.push(txt(L + pw, T + ph + 36, 'Lower costs', { anchor: 'end', size: 10.5, fill: C.slate, italic: true }));
  p.push(txt(L + pw / 2, H - 8, 'Cost advantage over rivals', { anchor: 'middle', size: 12, weight: 600, fill: C.ink }));
  p.push(txt(18, T + ph / 2, 'Premium for being different', { anchor: 'middle', size: 12, weight: 600, fill: C.ink, rotate: -90 }));
  // Spread positions that share a point, so each stays visible.
  const seen = new Map<string, number>();
  const at = s.positions.map((q) => {
    const key = `${q.cost},${q.diff}`;
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    const angle = (k * Math.PI) / 2.5;
    return { q, x: xOf(q.cost) + (k ? 14 * Math.cos(angle) : 0), y: yOf(q.diff) + (k ? 14 * Math.sin(angle) : 0) };
  });
  const now = at.find((a) => a.q.role === 'now');
  const prop = at.find((a) => a.q.role === 'proposed');
  if (now && prop) {
    const dx = prop.x - now.x;
    const dy = prop.y - now.y;
    const d = Math.hypot(dx, dy);
    if (d > 20) p.push(`<line x1="${r1(now.x + (dx / d) * 11)}" y1="${r1(now.y + (dy / d) * 11)}" x2="${r1(prop.x - (dx / d) * 12)}" y2="${r1(prop.y - (dy / d) * 12)}" stroke="${C.cobalt}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#${id}-ah)"/>`);
  }
  const taken = at.map((a) => ({ x: a.x - 9, y: a.y - 9, w: 18, h: 18 }));
  for (const a of at) {
    if (a.q.role === 'now') p.push(`<rect x="${r1(a.x - 8)}" y="${r1(a.y - 8)}" width="16" height="16" fill="${C.ink}"/>`);
    else if (a.q.role === 'proposed') p.push(`<rect x="${r1(a.x - 8)}" y="${r1(a.y - 8)}" width="16" height="16" fill="#fff" stroke="${C.cobalt}" stroke-width="2.5"/>`);
    else p.push(`<circle cx="${r1(a.x)}" cy="${r1(a.y)}" r="7" fill="#fff" stroke="${C.slate}" stroke-width="2"/>`);
  }
  for (const a of at) {
    const text = `${label(a.q)} (${a.q.scope})`;
    const pos = placeLabel(a.x, a.y, text, 9, { x: L + 2, y: T + 2, w: pw - 4, h: ph - 4 }, taken, 11.5);
    p.push(txt(pos.x, pos.y, text, { anchor: pos.anchor, size: 11.5, weight: a.q.role === 'rival' ? 500 : 700, fill: a.q.role === 'proposed' ? C.cobaltText : C.ink }));
  }
  const desc = `Generic strategy positions${s.market.trim() ? ` in ${s.market.trim()}` : ''}, by cost advantage (horizontal, 1 to 5) and premium for being different (vertical, 1 to 5). ${s.positions.map((q) => `${label(q)}, ${ROLES[q.role].toLowerCase()}, ${q.scope} scope: cost ${q.cost}, differentiation ${q.diff}, ${GENERIC[genericOf(q)].name.toLowerCase()}`).join('; ')}.`;
  return svgDoc(W, H, id, 'Where each business competes', desc, p.join(''));
}

/* ---------- HTML ---------- */

const costOpts = ratingOptions(COST_WORDS);
const diffOpts = ratingOptions(DIFF_WORDS);

function positionRow(p: Position, n: number, uid: string): string {
  const id = `${uid}-${p.id}`;
  return `<li class="sx-row sx-row--plain" data-row="${esc(p.id)}"><div class="sx-row__body"><div class="sx-grid-2">${field({ id: `${id}-name`, k: `positions.${p.id}.name`, label: `Position ${n}: name`, value: p.name, maxlength: 80 })}${select({
    id: `${id}-role`,
    k: `positions.${p.id}.role`,
    label: 'Whose position',
    value: p.role,
    options: ROLE_IDS.map((r) => ({ value: r, label: ROLES[r] })),
  })}</div>${radios({
    name: `${id}-scope`,
    k: `positions.${p.id}.scope`,
    legend: 'Competitive scope',
    value: p.scope,
    options: [
      { value: 'broad', label: 'Broad: the whole market' },
      { value: 'narrow', label: 'Narrow: a niche' },
    ],
  })}<div class="sx-grid-2">${select({ id: `${id}-cost`, k: `positions.${p.id}.cost`, label: 'Cost advantage', value: p.cost, options: costOpts, integer: true })}${select({
    id: `${id}-diff`,
    k: `positions.${p.id}.diff`,
    label: 'Premium for being different',
    value: p.diff,
    options: diffOpts,
    integer: true,
  })}</div>${field({ id: `${id}-ev`, k: `positions.${p.id}.evidence`, label: 'Evidence', value: p.evidence, multiline: true, rows: 2, maxlength: 500 })}<p class="sx-place" data-place="${esc(p.id)}">${placeHtml(p)}</p><div class="sx-row__meta">${button({
    act: 'remove',
    label: 'Remove',
    aria: `Remove position ${n}: ${label(p)}`,
    data: { id: p.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

export function placeHtml(p: Position): string {
  return `<span class="sx-place__label">Reads as</span> <strong>${esc(GENERIC[genericOf(p)].name)}</strong>`;
}

export function editorHtml(s: PorterState, uid: string): string {
  return `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-market`,
    k: 'market',
    label: 'The market',
    value: s.market,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div><fieldset class="sx-q"><legend>Positions</legend><p class="sx-q__prompt">Rate each business against its rivals on cost and on the premium customers pay for what makes it different, and say whether it targets the whole market or a niche. Add the business now, a proposed position if you have one, and its main rivals.</p><ol class="sx-rows" role="list">${s.positions
    .map((p, i) => positionRow(p, i + 1, uid))
    .join('')}</ol>${button({ act: 'add-rival', label: 'Add a rival', cls: 'sx-add', disabled: s.positions.length >= LIMITS.positions })}${
    s.positions.some((p) => p.role === 'proposed') ? '' : button({ act: 'add-proposed', label: 'Add a proposed position', cls: 'sx-add', disabled: s.positions.length >= LIMITS.positions })
  }</fieldset>`;
}

export function outputsHtml(s: PorterState, uid: string): string {
  const grid = (['broad', 'narrow'] as const)
    .map(
      (sc) =>
        `<tr><th scope="row">${sc === 'broad' ? 'Broad scope' : 'Narrow scope'}</th>${(['cost', 'diff'] as const)
          .map((src) => {
            const g: Generic = src === 'cost' ? (sc === 'broad' ? 'cost-leadership' : 'cost-focus') : sc === 'broad' ? 'differentiation' : 'differentiation-focus';
            const here = s.positions.filter((p) => genericOf(p) === g);
            return `<td><p class="sx-tows__aim">${esc(GENERIC[g].name)}</p>${here.length ? `<ul class="sx-tows__list" role="list">${here.map((p) => `<li><b>${esc(label(p))}</b><span class="small muted"> ${esc(ROLES[p.role])}</span></li>`).join('')}</ul>` : '<p class="small muted">None.</p>'}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
  const outside = s.positions.filter((p) => genericOf(p) === 'middle' || genericOf(p) === 'hybrid');
  const table = tableRegion(
    'Positions and their generic strategies',
    `<caption class="sr-only">Each position's scope, ratings and generic strategy</caption><thead><tr><th scope="col">Position</th><th scope="col">Role</th><th scope="col">Scope</th><th scope="col" class="n">Cost advantage</th><th scope="col" class="n">Differentiation</th><th scope="col">Reads as</th></tr></thead><tbody>${s.positions
      .map(
        (p) =>
          `<tr><th scope="row">${esc(label(p))}${p.evidence.trim() ? `<span class="sx-swot__ev">${esc(p.evidence.trim())}</span>` : ''}</th><td>${esc(ROLES[p.role])}</td><td>${p.scope === 'broad' ? 'Broad' : 'Narrow'}</td><td class="n num">${p.cost}</td><td class="n num">${p.diff}</td><td>${esc(GENERIC[genericOf(p)].name)}</td></tr>`,
      )
      .join('')}</tbody>`,
  );
  return `<div class="sx-out__block"><h4 class="sx-out__h">Where each business competes</h4><p class="small muted">${esc(orDash(s.market, 'Market not given'))}</p>${chartRegion('Generic strategy positions chart', porterSvg(s, `${uid}-chart`))}<ul class="sx-legend" role="list"><li><span class="sx-key sx-key--now" aria-hidden="true"></span> The business now</li><li><span class="sx-key sx-key--proposed" aria-hidden="true"></span> Proposed position (the dashed arrow shows the move)</li><li><span class="sx-key sx-key--rival" aria-hidden="true"></span> Rival</li><li>Ratings of 4 or 5 count as an advantage.</li></ul><p class="sx-reading" data-reading>${esc(reading(s))}</p></div><div class="sx-out__block"><h4 class="sx-out__h">Porter's generic strategies</h4>${tableRegion(
    "Porter's generic strategies grid",
    `<caption class="sr-only">Positions by competitive scope and source of advantage</caption><thead><tr><th scope="col"><span class="sr-only">Scope</span></th><th scope="col">Lower cost</th><th scope="col">Differentiation</th></tr></thead><tbody>${grid}</tbody>`,
    'table sx-tows',
  )}${
    outside.length ? `<p class="small"><strong>Outside the four strategies:</strong> ${esc(andList(outside.map((p) => `${label(p)} (${GENERIC[genericOf(p)].name.toLowerCase()})`)))}.</p>` : ''
  }<dl class="sx-qnotes">${(['middle', 'hybrid'] as const).map((g) => `<div><dt>${esc(GENERIC[g].name)}</dt><dd>${esc(GENERIC[g].note)}</dd></div>`).join('')}</dl>${table}</div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: one current position, rivals to compare and evidence for each.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: PorterState): string {
  return textDoc(`Porter's generic strategies (HL): ${orDash(s.business, 'organization not named')}`, [
    textSection('Market', [orDash(s.market)]),
    textSection('Positions', s.positions.map((p) => `- ${label(p)} [${ROLES[p.role]}; ${p.scope} scope; cost advantage ${p.cost} of 5; differentiation ${p.diff} of 5]: ${GENERIC[genericOf(p)].name}.${p.evidence.trim() ? `\n  Evidence: ${p.evidence.trim()}` : ''}`)),
    textSection('Reading', [reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: PorterState): string {
  return toCsv([['Position', 'Role', 'Scope', 'Cost advantage (1 to 5)', 'Differentiation (1 to 5)', 'Generic strategy', 'Evidence'], ...s.positions.map((p) => [label(p), ROLES[p.role], p.scope, p.cost, p.diff, GENERIC[genericOf(p)].name, p.evidence.trim()])]);
}

export function fileName(s: PorterState): string {
  return `${fileSlug(s.business)}-generic-strategies`;
}

export function problems(s: PorterState): string[] {
  const out = checks(s)
    .filter((c) => c.level === 'error')
    .map((c) => c.text);
  if (!s.positions.some((p) => p.role === 'proposed')) out.push('the worked example should include a proposed position');
  s.positions.forEach((p) => (p.name.trim() && p.evidence.trim()) || out.push(`position ${p.id} needs a name and evidence`));
  return out;
}
