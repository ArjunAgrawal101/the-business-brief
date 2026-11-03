/**
 * Stakeholder map: each group placed by its power over the business and its
 * interest in the decision, from 1 to 10, with its stance. The quadrant
 * suggests how to manage it (manage closely, keep satisfied, keep informed,
 * monitor) and the stance adjusts the advice. Stakeholder mapping is not named
 * in the guide; it supports 1.4 (internal and external stakeholders, conflict
 * between stakeholders, p. 24) and is offered as enrichment.
 */
import { esc } from '../markup';
import { type Check, count, andList, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, placeLabel, r1, svgDoc, txt } from './svg';
import { button, chartRegion, checksHtml, field, ratingOptions, select, tableRegion } from './ui';

export type Kind = 'internal' | 'external';
export type Stance = 'supportive' | 'neutral' | 'opposed';
export type Quadrant = 'manage' | 'satisfy' | 'inform' | 'monitor';

export interface Stakeholder {
  id: string;
  name: string;
  kind: Kind;
  power: number;
  interest: number;
  stance: Stance;
  concern: string;
  action: string;
}

export interface StakeholderState {
  business: string;
  decision: string;
  stakeholders: Stakeholder[];
}

export const QUADRANTS: Record<Quadrant, { name: string; where: string; approach: string }> = {
  manage: { name: 'Manage closely', where: 'high power, high interest', approach: 'Involve them early and consult them often; agree how their concerns will be met before the decision is final.' },
  satisfy: { name: 'Keep satisfied', where: 'high power, low interest', approach: 'Meet their needs and avoid surprising them; brief them on anything that touches their interests, because their interest can rise quickly.' },
  inform: { name: 'Keep informed', where: 'low power, high interest', approach: 'Explain the decision and listen to them; they can add useful ideas, and together or through the media they can gain power.' },
  monitor: { name: 'Monitor', where: 'low power, low interest', approach: 'Little effort is needed now; watch for changes in their power or interest.' },
};

export const STANCES: Record<Stance, string> = { supportive: 'Supportive', neutral: 'Neutral', opposed: 'Opposed' };
const STANCE_ADVICE: Record<Quadrant, Record<Stance, string>> = {
  manage: {
    supportive: 'They support the decision: give them a role in carrying it out and use their backing with others.',
    neutral: 'They have not taken a side: find out what would win their support.',
    opposed: 'They oppose it and could block it: find out why, and negotiate before committing; a compromise may cost less than a fight.',
  },
  satisfy: {
    supportive: 'Their support is valuable; keep it by keeping them informed.',
    neutral: 'Keep it that way: an unexpected effect on them could turn indifference into opposition.',
    opposed: 'Powerful opponents who are not yet paying attention: address their concern before it grows.',
  },
  inform: {
    supportive: 'Supporters can help persuade others; keep them involved.',
    neutral: 'Explain what the decision means for them.',
    opposed: 'Listen to their concern and show how it will be handled; opposition can grow if they find powerful allies.',
  },
  monitor: {
    supportive: '',
    neutral: '',
    opposed: 'Watch them: an opposed group can gain power or interest quickly.',
  },
};

const KINDS: Kind[] = ['internal', 'external'];
const STANCE_IDS = Object.keys(STANCES) as Stance[];
const Q_ORDER: Quadrant[] = ['manage', 'satisfy', 'inform', 'monitor'];
export const LIMITS = { stakeholders: 14 };
export const HIGH = 6;

export function quadrantOf(s: Pick<Stakeholder, 'power' | 'interest'>): Quadrant {
  const p = s.power >= HIGH;
  const i = s.interest >= HIGH;
  return p ? (i ? 'manage' : 'satisfy') : i ? 'inform' : 'monitor';
}

export function approach(s: Stakeholder): string {
  const q = quadrantOf(s);
  return [QUADRANTS[q].approach, STANCE_ADVICE[q][s.stance]].filter(Boolean).join(' ');
}

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): StakeholderState {
  const r = obj(raw);
  const used = new Set<string>();
  return {
    business: str(r.business, 120),
    decision: str(r.decision, 300),
    stakeholders: list(r.stakeholders, LIMITS.stakeholders).map((x0) => {
      const x = obj(x0);
      return {
        id: ident(x.id, used, 's'),
        name: str(x.name, 80),
        kind: oneOf(x.kind, KINDS, 'external'),
        power: int(x.power, 1, 10, 5),
        interest: int(x.interest, 1, 10, 5),
        stance: oneOf(x.stance, STANCE_IDS, 'neutral'),
        concern: str(x.concern, 300),
        action: str(x.action, 400),
      };
    }),
  };
}

export function blank(): StakeholderState {
  return {
    business: '',
    decision: '',
    stakeholders: [
      { id: 's1', name: '', kind: 'internal', power: 5, interest: 5, stance: 'neutral', concern: '', action: '' },
      { id: 's2', name: '', kind: 'external', power: 5, interest: 5, stance: 'neutral', concern: '', action: '' },
    ],
  };
}

export function newStakeholder(s: Pick<StakeholderState, 'stakeholders'>): Stakeholder {
  return { id: nextId('s', s.stakeholders.map((x) => x.id)), name: '', kind: 'external', power: 5, interest: 5, stance: 'neutral', concern: '', action: '' };
}

/* ---------- Analysis ---------- */

const nameOf = (x: Stakeholder, n?: number) => x.name.trim() || `Stakeholder ${n ?? ''}`.trim();

/** Named stakeholders by quadrant priority, then by power and interest. */
export function prioritized(s: StakeholderState): Stakeholder[] {
  return s.stakeholders
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.name.trim())
    .sort((a, b) => Q_ORDER.indexOf(quadrantOf(a.x)) - Q_ORDER.indexOf(quadrantOf(b.x)) || b.x.power - a.x.power || b.x.interest - a.x.interest || a.i - b.i)
    .map(({ x }) => x);
}

/** Powerful groups on opposite sides of the decision: the conflict to manage first (1.4). */
export function conflicts(s: StakeholderState): { supporters: Stakeholder[]; opponents: Stakeholder[] } {
  const key = prioritized(s).filter((x) => x.power >= HIGH);
  return { supporters: key.filter((x) => x.stance === 'supportive'), opponents: key.filter((x) => x.stance === 'opposed') };
}

export function checks(s: StakeholderState): Check[] {
  const out: Check[] = [];
  const named = s.stakeholders.filter((x) => x.name.trim());
  if (!s.decision.trim()) out.push({ level: 'warning', text: 'State the decision. Interest is interest in this decision, so the map changes with it.' });
  if (!named.some((x) => x.kind === 'internal')) out.push({ level: 'info', text: 'No internal stakeholders yet. Employees, managers and owners are affected by almost every decision (1.4).' });
  if (!named.some((x) => x.kind === 'external')) out.push({ level: 'info', text: 'No external stakeholders yet: customers, suppliers, lenders, the community and government are usually affected too.' });
  const unplanned = named.filter((x) => quadrantOf(x) === 'manage' && x.stance === 'opposed' && !x.action.trim());
  if (unplanned.length) out.push({ level: 'warning', text: `${andList(unplanned.map((x) => x.name.trim()))} ${unplanned.length === 1 ? 'is a key player who opposes' : 'are key players who oppose'} the decision, with no plan yet. Say how you will engage ${unplanned.length === 1 ? 'them' : 'each'}.` });
  const noConcern = named.filter((x) => !x.concern.trim());
  if (noConcern.length) out.push({ level: 'info', text: `Say what ${andList(noConcern.map((x) => x.name.trim()))} ${noConcern.length === 1 ? 'wants' : 'want'} from the decision: the approach depends on it.` });
  const dup = named.filter((x, i) => named.findIndex((y) => y.name.trim().toLowerCase() === x.name.trim().toLowerCase()) !== i);
  if (dup.length) out.push({ level: 'info', text: `${andList(dup.map((x) => `"${x.name.trim()}"`))} appears more than once.` });
  return out;
}

export function reading(s: StakeholderState): string {
  const p = prioritized(s);
  if (!p.length) return 'Add stakeholders to map them.';
  const key = p.filter((x) => quadrantOf(x) === 'manage');
  const { supporters, opponents } = conflicts(s);
  const lead = key.length ? `${key.length === 1 ? 'One key player' : `${count(key.length, true)} key players`} to manage closely: ${andList(key.map((x) => x.name.trim()))}.` : 'No stakeholder has both high power and high interest.';
  const conflict = supporters.length && opponents.length ? ` The conflict to manage first: ${andList(supporters.map((x) => x.name.trim()))} ${supporters.length === 1 ? 'supports' : 'support'} the decision, while ${andList(opponents.map((x) => x.name.trim()))}, also powerful, ${opponents.length === 1 ? 'opposes' : 'oppose'} it.` : opponents.length ? ` Powerful opposition from ${andList(opponents.map((x) => x.name.trim()))} needs a plan before the decision is made.` : ' No powerful stakeholder opposes the decision on this map.';
  return `${lead}${conflict} Power is not legitimacy: the map shows who can push back, not whose claim is fair, which is a question of ethics.`;
}

export function headline(s: StakeholderState): string {
  const p = prioritized(s);
  if (!p.length) return 'No stakeholders yet.';
  const key = p.filter((x) => quadrantOf(x) === 'manage');
  const opp = conflicts(s).opponents;
  return `${count(p.length, true)} stakeholders mapped; manage closely: ${key.length ? andList(key.map((x) => x.name.trim())) : 'none'}${opp.length ? `; powerful opposition from ${andList(opp.map((x) => x.name.trim()))}` : ''}.`;
}

/* ---------- The chart ---------- */

export function mapSvg(s: StakeholderState, id: string): string {
  const W = 600;
  const H = 470;
  const L = 64;
  const R = 20;
  const T = 22;
  const B = 58;
  const pw = W - L - R;
  const ph = H - T - B;
  const xOf = (v: number) => L + ((v - 0.5) / 10) * pw;
  const yOf = (v: number) => T + ph - ((v - 0.5) / 10) * ph;
  const mx = xOf(HIGH - 0.5);
  const my = yOf(HIGH - 0.5);
  const p: string[] = [];
  const quads: Array<[Quadrant, number, number, number, number, 'start' | 'end', number, number]> = [
    ['satisfy', L, T, mx - L, my - T, 'start', L + 8, T + 16],
    ['manage', mx, T, L + pw - mx, my - T, 'end', L + pw - 8, T + 16],
    ['monitor', L, my, mx - L, T + ph - my, 'start', L + 8, T + ph - 8],
    ['inform', mx, my, L + pw - mx, T + ph - my, 'end', L + pw - 8, T + ph - 8],
  ];
  for (const [q, x, y, w, h, anchor, tx, ty] of quads) {
    p.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${q === 'manage' ? C.goldWash : q === 'monitor' ? C.white : C.paper}"/>`);
    p.push(txt(tx, ty, QUADRANTS[q].name.toUpperCase(), { anchor, size: 10.5, weight: 700, fill: q === 'manage' ? C.goldText : C.slate }));
  }
  p.push(`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`);
  p.push(`<line x1="${r1(mx)}" y1="${T}" x2="${r1(mx)}" y2="${T + ph}" stroke="${C.ink}" stroke-dasharray="5 4"/>`);
  p.push(`<line x1="${L}" y1="${r1(my)}" x2="${L + pw}" y2="${r1(my)}" stroke="${C.ink}" stroke-dasharray="5 4"/>`);
  for (const v of [1, 5, 10]) {
    p.push(txt(xOf(v), T + ph + 16, String(v), { anchor: 'middle', size: 11, fill: C.slate }));
    p.push(txt(L - 8, yOf(v) + 4, String(v), { anchor: 'end', size: 11, fill: C.slate }));
  }
  p.push(txt(L + pw / 2, H - 14, 'Interest in the decision', { anchor: 'middle', size: 12, weight: 600, fill: C.ink }));
  p.push(txt(18, T + ph / 2, 'Power over the business', { anchor: 'middle', size: 12, weight: 600, fill: C.ink, rotate: -90 }));
  const named = s.stakeholders.filter((x) => x.name.trim());
  const seen = new Map<string, number>();
  const at = named.map((x, i) => {
    const key = `${x.power},${x.interest}`;
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    const a = (k * Math.PI) / 2.5;
    return { x, n: s.stakeholders.indexOf(x) + 1, i, px: xOf(x.interest) + (k ? 13 * Math.cos(a) : 0), py: yOf(x.power) + (k ? 13 * Math.sin(a) : 0) };
  });
  const taken = at.map((a) => ({ x: a.px - 10, y: a.py - 10, w: 20, h: 20 }));
  for (const a of at) {
    const stroke = a.x.stance === 'opposed' ? C.signal : a.x.stance === 'supportive' ? C.green : C.slate;
    if (a.x.kind === 'internal') p.push(`<rect x="${r1(a.px - 9)}" y="${r1(a.py - 9)}" width="18" height="18" fill="#fff" stroke="${stroke}" stroke-width="2.25"/>`);
    else p.push(`<circle cx="${r1(a.px)}" cy="${r1(a.py)}" r="9.5" fill="#fff" stroke="${stroke}" stroke-width="2.25"/>`);
    p.push(txt(a.px, a.py + 4, String(a.n), { anchor: 'middle', size: 10.5, weight: 700, fill: C.ink }));
  }
  for (const a of at) {
    const pos = placeLabel(a.px, a.py, a.x.name.trim(), 11, { x: L + 2, y: T + 2, w: pw - 4, h: ph - 4 }, taken, 11.5);
    p.push(txt(pos.x, pos.y, a.x.name.trim(), { anchor: pos.anchor, size: 11.5, weight: 600, fill: C.ink }));
  }
  const desc = named.length
    ? `Stakeholder map for ${s.decision.trim() || 'the decision'}: ${named.map((x) => `${x.name.trim()}, ${x.kind}, power ${x.power}, interest ${x.interest}, ${STANCES[x.stance].toLowerCase()}: ${QUADRANTS[quadrantOf(x)].name.toLowerCase()}`).join('; ')}.`
    : 'Stakeholder map with no stakeholders yet.';
  return svgDoc(W, H, id, 'Stakeholder map by power and interest', desc, p.join(''));
}

/* ---------- HTML ---------- */

// Words that agree with the rule that 6 or more counts as high.
const tenOpts = ratingOptions(['Very low', 'Very low', 'Low', 'Low', 'Fairly low', 'Fairly high', 'High', 'High', 'Very high', 'Very high']);

function row(x: Stakeholder, n: number, uid: string): string {
  const id = `${uid}-${x.id}`;
  const nm = nameOf(x, n);
  return `<li class="sx-row" data-row="${esc(x.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body"><div class="sx-grid-2">${field({ id: `${id}-name`, k: `stakeholders.${x.id}.name`, label: `Stakeholder ${n}`, value: x.name, maxlength: 80 })}${select({
    id: `${id}-kind`,
    k: `stakeholders.${x.id}.kind`,
    label: 'Internal or external',
    value: x.kind,
    options: KINDS.map((k) => ({ value: k, label: k === 'internal' ? 'Internal' : 'External' })),
  })}</div><div class="sx-nums sx-nums--3">${select({ id: `${id}-power`, k: `stakeholders.${x.id}.power`, label: 'Power', labelHtml: `Power<span class="sr-only"> of ${esc(nm)}</span>`, value: x.power, options: tenOpts, integer: true })}${select({
    id: `${id}-interest`,
    k: `stakeholders.${x.id}.interest`,
    label: 'Interest',
    labelHtml: `Interest<span class="sr-only"> of ${esc(nm)}</span>`,
    value: x.interest,
    options: tenOpts,
    integer: true,
  })}${select({ id: `${id}-stance`, k: `stakeholders.${x.id}.stance`, label: 'Stance', labelHtml: `Stance<span class="sr-only"> of ${esc(nm)}</span>`, value: x.stance, options: STANCE_IDS.map((t) => ({ value: t, label: STANCES[t] })) })}</div><p class="sx-place" data-place="${esc(x.id)}">${placeHtml(x)}</p>${field({
    id: `${id}-concern`,
    k: `stakeholders.${x.id}.concern`,
    label: 'What they want from the decision',
    value: x.concern,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}${field({ id: `${id}-action`, k: `stakeholders.${x.id}.action`, label: 'Your plan for them', value: x.action, multiline: true, rows: 2, maxlength: 400 })}<div class="sx-row__meta">${button({
    act: 'remove',
    label: 'Remove',
    aria: `Remove stakeholder ${n}: ${nm}`,
    data: { id: x.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

export function placeHtml(x: Pick<Stakeholder, 'power' | 'interest'>): string {
  const q = quadrantOf(x);
  return `<span class="sx-place__label">Quadrant</span> <strong>${esc(QUADRANTS[q].name)}</strong> <span class="muted">(${esc(QUADRANTS[q].where)}; 6 or more counts as high)</span>`;
}

export function editorHtml(s: StakeholderState, uid: string): string {
  return `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-decision`,
    k: 'decision',
    label: 'The decision',
    value: s.decision,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div><fieldset class="sx-q"><legend>Stakeholders</legend><p class="sx-q__prompt">Rate each group's power over the business and its interest in this decision from 1 to 10, and say where it stands.</p><ol class="sx-rows" role="list">${s.stakeholders
    .map((x, i) => row(x, i + 1, uid))
    .join('')}</ol>${button({ act: 'add', label: 'Add a stakeholder', cls: 'sx-add', disabled: s.stakeholders.length >= LIMITS.stakeholders })}</fieldset>`;
}

export function outputsHtml(s: StakeholderState, uid: string): string {
  const p = prioritized(s);
  const num = new Map(s.stakeholders.map((x, i) => [x.id, i + 1]));
  const table = p.length
    ? tableRegion(
        'Stakeholders and suggested approaches',
        `<caption class="sr-only">Each stakeholder's power, interest, quadrant, stance and suggested management approach</caption><thead><tr><th scope="col" class="n">No.</th><th scope="col">Stakeholder</th><th scope="col" class="n">Power</th><th scope="col" class="n">Interest</th><th scope="col">Quadrant</th><th scope="col">Stance</th><th scope="col">Suggested approach</th></tr></thead><tbody>${p
          .map(
            (x) =>
              `<tr><td class="n num">${num.get(x.id)}</td><th scope="row">${esc(x.name.trim())}<span class="sx-swot__ev">${x.kind === 'internal' ? 'Internal' : 'External'}${x.concern.trim() ? `: ${esc(x.concern.trim())}` : ''}</span></th><td class="n num">${x.power}</td><td class="n num">${x.interest}</td><td>${esc(QUADRANTS[quadrantOf(x)].name)}</td><td>${esc(STANCES[x.stance])}</td><td class="small">${esc(approach(x))}${x.action.trim() ? `<span class="sx-plan"><b>Your plan:</b> ${esc(x.action.trim())}</span>` : ''}</td></tr>`,
          )
          .join('')}</tbody>`,
      )
    : '<p class="small muted">No stakeholders yet.</p>';
  return `<div class="sx-out__block"><h4 class="sx-out__h">The map</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.decision.trim() ? `Decision: ${s.decision.trim()}` : 'Decision not stated.')}</p>${chartRegion('Stakeholder map chart', mapSvg(s, `${uid}-chart`))}<ul class="sx-legend" role="list"><li><span class="sx-key sx-key--square" aria-hidden="true"></span> Internal</li><li><span class="sx-key sx-key--circle" aria-hidden="true"></span> External</li><li>Outline: green supportive, grey neutral, red opposed (also in the table)</li><li>Numbers match the inputs</li></ul><p class="sx-reading" data-reading>${esc(reading(s))}</p></div><div class="sx-out__block"><h4 class="sx-out__h">Suggested approaches</h4>${table}</div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the decision is stated, both internal and external groups are mapped, and every opposed key player has a plan.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: StakeholderState): string {
  return textDoc(`Stakeholder map: ${orDash(s.business, 'organization not named')}`, [
    textSection('Decision', [orDash(s.decision)]),
    ...Q_ORDER.map((q) =>
      textSection(
        `${QUADRANTS[q].name} (${QUADRANTS[q].where})`,
        prioritized(s)
          .filter((x) => quadrantOf(x) === q)
          .map((x) => `- ${x.name.trim()} [${x.kind}; power ${x.power}, interest ${x.interest}; ${STANCES[x.stance].toLowerCase()}]${x.concern.trim() ? `\n  Wants: ${x.concern.trim()}` : ''}\n  Suggested approach: ${approach(x)}${x.action.trim() ? `\n  Plan: ${x.action.trim()}` : ''}`),
      ),
    ),
    textSection('Reading', [reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. Stakeholder mapping is not named in the IB guide. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: StakeholderState): string {
  return toCsv([
    ['Stakeholder', 'Internal or external', 'Power (1 to 10)', 'Interest (1 to 10)', 'Quadrant', 'Stance', 'What they want', 'Suggested approach', 'Plan'],
    ...prioritized(s).map((x) => [x.name.trim(), x.kind, x.power, x.interest, QUADRANTS[quadrantOf(x)].name, STANCES[x.stance], x.concern.trim(), approach(x), x.action.trim()]),
  ]);
}

export function fileName(s: StakeholderState): string {
  return `${fileSlug(s.business)}-stakeholder-map`;
}

export function problems(s: StakeholderState): string[] {
  const out: string[] = [];
  const qs = new Set(s.stakeholders.map(quadrantOf));
  Q_ORDER.forEach((q) => qs.has(q) || out.push(`the worked example has no stakeholder to ${QUADRANTS[q].name.toLowerCase()}`));
  s.stakeholders.forEach((x) => (x.name.trim() && x.concern.trim() && x.action.trim()) || out.push(`stakeholder ${x.id} needs a name, a concern and a plan`));
  return out;
}
