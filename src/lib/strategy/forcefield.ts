/**
 * Force field builder (HL): the reader's own change, driving and restraining
 * forces, each scored from 1 to 5 with its evidence and an action. Totals,
 * the balance and the effect of weakening a restraining force come from
 * summarize() and weaken() in src/lib/force-field.ts, the functions behind
 * the force field interactions elsewhere on the platform. The guide lists
 * force field analysis as an HL-only toolkit tool (p. 14).
 */
import { esc } from '../markup';
import { summarize, weaken, type Force } from '../force-field';
import { type Check, count, andList, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, arrowHead, r1, svgDoc, textWidth, txt } from './svg';
import { button, chartRegion, checksHtml, field, ratingOptions, select, tableRegion } from './ui';

export type Side = 'driving' | 'restraining';

export interface FfForce {
  id: string;
  side: Side;
  label: string;
  strength: number;
  evidence: string;
  action: string;
}

export interface FfState {
  business: string;
  change: string;
  forces: FfForce[];
  /** The restraining force to test weakening, by id, or "". */
  test: string;
  /** How many points to weaken it by. */
  by: number;
}

export const SIDES: Record<Side, { name: string; hint: string; action: string; add: string }> = {
  driving: { name: 'Driving forces', hint: 'Pushing for the change', action: 'How could it be strengthened or used?', add: 'Add a driving force' },
  restraining: { name: 'Restraining forces', hint: 'Holding it back', action: 'How could it be weakened, and at what cost?', add: 'Add a restraining force' },
};
const SIDE_IDS: Side[] = ['driving', 'restraining'];
export const STRENGTH_WORDS = ['Weak', 'Some force', 'Moderate', 'Strong', 'Very strong'] as const;
export const LIMITS = { perSide: 8 };

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): FfState {
  const r = obj(raw);
  const used = new Set<string>();
  const forces = list(r.forces, LIMITS.perSide * 2).map((f) => {
    const x = obj(f);
    return { id: ident(x.id, used, 'f'), side: oneOf(x.side, SIDE_IDS, 'driving'), label: str(x.label, 120), strength: int(x.strength, 1, 5, 3), evidence: str(x.evidence, 500), action: str(x.action, 500) };
  });
  const test = typeof r.test === 'string' && forces.some((f) => f.id === r.test && f.side === 'restraining') ? r.test : '';
  return { business: str(r.business, 120), change: str(r.change, 300), forces, test, by: int(r.by, 1, 4, 2) };
}

export function blank(): FfState {
  return {
    business: '',
    change: '',
    forces: [
      { id: 'f1', side: 'driving', label: '', strength: 3, evidence: '', action: '' },
      { id: 'f2', side: 'restraining', label: '', strength: 3, evidence: '', action: '' },
    ],
    test: '',
    by: 2,
  };
}

export function newForce(s: Pick<FfState, 'forces'>, side: Side): FfForce {
  return { id: nextId('f', s.forces.map((f) => f.id)), side, label: '', strength: 3, evidence: '', action: '' };
}

/* ---------- Analysis ---------- */

const named = (s: FfState, side: Side) => s.forces.filter((f) => f.side === side && f.label.trim());
const asForces = (xs: FfForce[]): Force[] => xs.map((f) => ({ label: f.label.trim(), strength: f.strength }));

export function totals(s: FfState) {
  return summarize(asForces(named(s, 'driving')), asForces(named(s, 'restraining')));
}

/** The effect of weakening the chosen restraining force, or null when none is chosen. */
export function test(s: FfState): { force: FfForce; from: number; to: number; before: ReturnType<typeof summarize>; after: ReturnType<typeof summarize> } | null {
  const rs = named(s, 'restraining');
  const i = rs.findIndex((f) => f.id === s.test);
  const force = rs[i];
  if (!force) return null;
  const w = weaken(asForces(named(s, 'driving')), asForces(rs), i, s.by);
  return { force, ...w };
}

export function testSentence(s: FfState): string {
  const t = test(s);
  if (!t) return 'Choose a restraining force to see what weakening it would do.';
  if (t.from === t.to) return `"${t.force.label.trim()}" is already at the lowest strength, 1.`;
  const tipped = t.before.balance !== 'driving' && t.after.balance === 'driving';
  return `If "${t.force.label.trim()}" fell from ${t.from} to ${t.to}, the restraining total would fall from ${t.before.restraining} to ${t.after.restraining}, against ${t.after.driving} driving.${tipped ? ' That would tip the balance towards the change.' : t.after.balance === 'driving' ? ' The driving forces would lead by more.' : ' The restraining forces would still hold the change back.'} ${t.force.action.trim() ? `Your plan: ${t.force.action.trim()}` : 'Say how it could be weakened, and at what cost.'}`;
}

export function checks(s: FfState): Check[] {
  const out: Check[] = [];
  if (!s.change.trim()) out.push({ level: 'warning', text: 'State the change. A force only drives or restrains something specific.' });
  for (const side of SIDE_IDS) if (!named(s, side).length) out.push({ level: 'warning', text: `No ${side} forces yet. Every change has some.` });
  const bare = s.forces.filter((f) => f.label.trim() && !f.evidence.trim());
  if (bare.length) out.push({ level: 'warning', text: `${bare.length === 1 ? 'One force has' : `${count(bare.length, true)} forces have`} no evidence: ${andList(bare.map((f) => `"${f.label.trim()}"`))}. A score is a judgement; evidence makes it defensible.` });
  const strongR = named(s, 'restraining').filter((f) => f.strength >= 4 && !f.action.trim());
  if (strongR.length) out.push({ level: 'info', text: `Plan how to weaken ${andList(strongR.map((f) => `"${f.label.trim()}"`))}. Weakening a strong restraining force is often more effective than pushing harder.` });
  return out;
}

export function headline(s: FfState): string {
  const t = totals(s);
  return `Driving ${t.driving}, restraining ${t.restraining}: ${t.balance === 'driving' ? 'the driving forces lead' : t.balance === 'restraining' ? 'the restraining forces lead' : 'the forces are level'}.`;
}

/* ---------- The diagram ---------- */

export function fieldSvg(s: FfState, id: string): string {
  const ds = named(s, 'driving');
  const rs = named(s, 'restraining');
  const rows = Math.max(ds.length, rs.length, 1);
  const W = 680;
  const rowH = 46;
  const T = 54;
  const H = T + rows * rowH + 46;
  const cx = W / 2;
  const unit = 30;
  const short = (t: string) => (t.length > 52 ? `${t.slice(0, 51)}…` : t);
  const p: string[] = [`<defs>${arrowHead(`${id}-ad`, C.green, 20)}${arrowHead(`${id}-ar`, C.signal, 20)}</defs>`];
  p.push(`<line x1="${cx}" y1="${T - 18}" x2="${cx}" y2="${T + rows * rowH}" stroke="${C.ink}" stroke-width="3"/>`);
  const title = s.change.trim() || 'The change';
  p.push(txt(cx, 18, title.length > 76 ? `${title.slice(0, 75)}…` : title, { anchor: 'middle', size: 13, weight: 700, serif: true, fill: C.ink }));
  p.push(txt(cx - 12, T - 22, 'DRIVING', { anchor: 'end', size: 10.5, weight: 700, fill: C.greenText }));
  p.push(txt(cx + 12, T - 22, 'RESTRAINING', { size: 10.5, weight: 700, fill: C.signalText }));
  ds.forEach((f, i) => {
    const y = T + i * rowH + rowH / 2;
    const len = f.strength * unit;
    p.push(`<line x1="${r1(cx - 6 - len)}" y1="${y}" x2="${cx - 8}" y2="${y}" stroke="${C.green}" stroke-width="${4 + f.strength}" marker-end="url(#${id}-ad)"/>`);
    p.push(txt(cx - 14 - len, y + 4, short(f.label.trim()), { anchor: 'end', size: 11.5, fill: C.ink }));
    p.push(txt(cx - 14 - len / 2 - 6, y - 9, String(f.strength), { anchor: 'middle', size: 10.5, weight: 700, fill: C.greenText }));
  });
  rs.forEach((f, i) => {
    const y = T + i * rowH + rowH / 2;
    const len = f.strength * unit;
    const tested = s.test === f.id;
    p.push(`<line x1="${r1(cx + 6 + len)}" y1="${y}" x2="${cx + 8}" y2="${y}" stroke="${C.signal}" stroke-width="${4 + f.strength}" marker-end="url(#${id}-ar)"${tested ? ' stroke-dasharray="7 3"' : ''}/>`);
    p.push(txt(cx + 14 + len, y + 4, short(f.label.trim()), { size: 11.5, fill: C.ink }));
    p.push(txt(cx + 14 + len / 2 + 6, y - 9, String(f.strength), { anchor: 'middle', size: 10.5, weight: 700, fill: C.signalText }));
  });
  const t = totals(s);
  p.push(txt(cx - 14, H - 16, `Total ${t.driving}`, { anchor: 'end', size: 12.5, weight: 700, fill: C.greenText }));
  p.push(txt(cx + 14, H - 16, `Total ${t.restraining}`, { size: 12.5, weight: 700, fill: C.signalText }));
  // Long labels beyond the frame would be cut; the width grows to fit them.
  const need = Math.max(...[...ds, ...rs].map((f) => f.strength * unit + textWidth(short(f.label.trim()), 11.5) + 24), 0);
  const w = Math.max(W, Math.ceil(2 * need + 20));
  const shift = (w - W) / 2;
  const body = shift ? `<g transform="translate(${r1(shift)} 0)">${p.join('')}</g>` : p.join('');
  const desc = `Force field for ${s.change.trim() || 'the change'}. Driving forces: ${ds.map((f) => `${f.label.trim()} ${f.strength}`).join(', ') || 'none'}; total ${t.driving}. Restraining forces: ${rs.map((f) => `${f.label.trim()} ${f.strength}`).join(', ') || 'none'}; total ${t.restraining}. ${t.sentence}`;
  return svgDoc(w, H, id, `Force field: ${s.change.trim() || 'the change'}`, desc, body);
}

/* ---------- HTML ---------- */

const strengthOpts = ratingOptions(STRENGTH_WORDS);

function forceRow(f: FfForce, n: number, uid: string): string {
  const id = `${uid}-${f.id}`;
  const side = SIDES[f.side];
  const nm = f.label.trim() || `${f.side} force ${n}`;
  return `<li class="sx-row sx-row--plain" data-row="${esc(f.id)}"><div class="sx-row__body">${field({ id: `${id}-label`, k: `forces.${f.id}.label`, label: `${f.side === 'driving' ? 'Driving' : 'Restraining'} force ${n}`, value: f.label, maxlength: 120 })}${select({
    id: `${id}-s`,
    k: `forces.${f.id}.strength`,
    label: 'Strength',
    labelHtml: `Strength<span class="sr-only"> of ${esc(nm)}</span>`,
    value: f.strength,
    options: strengthOpts,
    integer: true,
  })}${field({ id: `${id}-ev`, k: `forces.${f.id}.evidence`, label: 'Evidence', value: f.evidence, multiline: true, rows: 2, maxlength: 500 })}${field({
    id: `${id}-act`,
    k: `forces.${f.id}.action`,
    label: side.action,
    value: f.action,
    multiline: true,
    rows: 2,
    maxlength: 500,
  })}<div class="sx-row__meta">${button({ act: 'remove', label: 'Remove', aria: `Remove ${nm}`, data: { id: f.id }, cls: 'sx-row__remove' })}</div></div></li>`;
}

export function editorHtml(s: FfState, uid: string): string {
  const sides = SIDE_IDS.map((side) => {
    const rows = s.forces.filter((f) => f.side === side);
    return `<fieldset class="sx-q sx-q--${side}"><legend>${SIDES[side].name} <span class="sx-q__where">${SIDES[side].hint}</span></legend><ol class="sx-rows" role="list">${rows
      .map((f, i) => forceRow(f, i + 1, uid))
      .join('')}</ol>${button({ act: 'add', label: SIDES[side].add, data: { side }, cls: 'sx-add', disabled: rows.length >= LIMITS.perSide })}</fieldset>`;
  }).join('');
  const rs = named(s, 'restraining');
  const testOpts = [{ value: '', label: 'Choose a restraining force' }, ...rs.map((f) => ({ value: f.id, label: f.label.trim() }))];
  return `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-change`,
    k: 'change',
    label: 'The change',
    value: s.change,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div><div class="sx-grid-2">${sides}</div><fieldset class="sx-q"><legend>Test a weaker restraining force</legend><div class="sx-grid-2">${select({ id: `${uid}-test`, k: 'test', label: 'Restraining force to weaken', value: s.test, options: testOpts })}${select({
    id: `${uid}-by`,
    k: 'by',
    label: 'Weaken it by',
    value: s.by,
    options: [1, 2, 3, 4].map((v) => ({ value: v, label: `${v} point${v === 1 ? '' : 's'}` })),
    integer: true,
  })}</div></fieldset>`;
}

export function outputsHtml(s: FfState, uid: string): string {
  const t = totals(s);
  const all = SIDE_IDS.flatMap((side) => named(s, side));
  const table = all.length
    ? tableRegion(
        'Forces and actions',
        `<caption class="sr-only">Each force, its strength, the evidence and the action planned</caption><thead><tr><th scope="col">Force</th><th scope="col">Side</th><th scope="col" class="n">Strength</th><th scope="col">Evidence</th><th scope="col">Action</th></tr></thead><tbody>${all
          .map((f) => `<tr><th scope="row">${esc(f.label.trim())}</th><td>${f.side === 'driving' ? 'Driving' : 'Restraining'}</td><td class="n num">${f.strength}</td><td class="small">${esc(orDash(f.evidence))}</td><td class="small">${esc(orDash(f.action))}</td></tr>`)
          .join('')}</tbody><tfoot><tr><th scope="row">Totals</th><td colspan="4">Driving ${t.driving}; restraining ${t.restraining}</td></tr></tfoot>`,
      )
    : '';
  return `<div class="sx-out__block"><h4 class="sx-out__h">The force field</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.change.trim() ? `Change: ${s.change.trim()}` : 'Change not stated.')}</p>${chartRegion('Force field diagram', fieldSvg(s, `${uid}-chart`))}<dl class="figs sx-figs"><div class="fig"><dt>Driving</dt><dd><span class="fig__v num">${t.driving}</span><span class="fig__n">${named(s, 'driving').length} forces</span></dd></div><div class="fig"><dt>Restraining</dt><dd><span class="fig__v num">${t.restraining}</span><span class="fig__n">${named(s, 'restraining').length} forces</span></dd></div><div class="fig"><dt>Balance</dt><dd><span class="fig__v sx-fig-word">${t.balance === 'driving' ? 'Driving leads' : t.balance === 'restraining' ? 'Restraining leads' : 'Level'}</span></dd></div></dl><p class="sx-reading" data-reading>${esc(t.sentence)}</p></div><div class="sx-out__block"><h4 class="sx-out__h">Weakening a restraining force</h4><p class="sx-reading">${esc(testSentence(s))}</p></div><div class="sx-out__block"><h4 class="sx-out__h">The action plan</h4>${table}<p class="small muted">The scores are judgements, so the totals are not a measurement. Two forces with the same score may need very different effort to change.</p></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the change is stated, both sides have forces with evidence, and the strong restraining forces have a plan.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: FfState): string {
  const t = totals(s);
  return textDoc(`Force field analysis (HL): ${orDash(s.business, 'organization not named')}`, [
    textSection('The change', [orDash(s.change)]),
    ...SIDE_IDS.map((side) => textSection(`${SIDES[side].name} (total ${side === 'driving' ? t.driving : t.restraining})`, named(s, side).map((f) => `- ${f.label.trim()} [${f.strength} of 5]${f.evidence.trim() ? `\n  Evidence: ${f.evidence.trim()}` : ''}${f.action.trim() ? `\n  Action: ${f.action.trim()}` : ''}`))),
    textSection('Balance', [t.sentence]),
    textSection('Weakening a restraining force', [testSentence(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: FfState): string {
  return toCsv([['Side', 'Force', 'Strength (1 to 5)', 'Evidence', 'Action'], ...SIDE_IDS.flatMap((side) => named(s, side).map((f) => [side, f.label.trim(), f.strength, f.evidence.trim(), f.action.trim()]))]);
}

export function fileName(s: FfState): string {
  return `${fileSlug(s.business)}-force-field`;
}

export function problems(s: FfState): string[] {
  const out: string[] = [];
  SIDE_IDS.forEach((side) => named(s, side).length >= 2 || out.push(`the worked example needs at least two ${side} forces`));
  s.forces.forEach((f) => (f.label.trim() && f.evidence.trim() && f.action.trim()) || out.push(`force ${f.id} needs a label, evidence and an action`));
  if (!s.test) out.push('the worked example should test weakening a restraining force');
  return out;
}
