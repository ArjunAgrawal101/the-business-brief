/**
 * Stakeholder salience (enrichment: not in the IB guide). Each stakeholder is
 * judged on three attributes from Mitchell, Agle and Wood (1997): power (the
 * means to impose its will, coercive, utilitarian or normative), legitimacy
 * (a claim that is proper by the norms of the society it sits in) and urgency
 * (a claim that is time-sensitive and critical to the stakeholder). The
 * combination places it in one of seven classes; salience, the priority
 * managers give its claims, rises with the number of attributes it holds.
 * Attributes can be gained or lost, so the tool also shows the class each
 * stakeholder would move to. The wording of the classes and of what each asks
 * of managers is the platform's own.
 */
import { esc } from '../markup';
import { type Check, andList, count, fileSlug, ident, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, r1, svgDoc, txt } from './svg';
import { button, chartRegion, checksHtml, field, select, tableRegion } from './ui';

export type PowerBase = 'none' | 'coercive' | 'utilitarian' | 'normative';
export type YesNo = 'yes' | 'no';
export type Attribute = 'power' | 'legitimacy' | 'urgency';
export type ClassId = 'definitive' | 'dominant' | 'dangerous' | 'dependent' | 'dormant' | 'discretionary' | 'demanding' | 'none';

export interface SalienceStakeholder {
  id: string;
  name: string;
  power: PowerBase;
  legitimacy: YesNo;
  urgency: YesNo;
  /** What it wants from the decision. */
  claim: string;
  /** Why you judged the attributes as you did. */
  evidence: string;
  /** What could give it, or take from it, an attribute. */
  change: string;
  plan: string;
}

export interface SalienceState {
  business: string;
  decision: string;
  stakeholders: SalienceStakeholder[];
}

export const POWER_BASES: Record<PowerBase, string> = {
  none: 'No power over the business',
  coercive: 'Coercive: force, or legal restraint',
  utilitarian: 'Utilitarian: money, resources or custom',
  normative: 'Normative: reputation, esteem or the media',
};
const POWER_IDS = Object.keys(POWER_BASES) as PowerBase[];

export const ATTRIBUTES: Record<Attribute, { name: string; question: string }> = {
  power: { name: 'Power', question: 'Can it impose its will on the business?' },
  legitimacy: { name: 'Legitimacy', question: 'Is its claim proper and appropriate by the norms of its society?' },
  urgency: { name: 'Urgency', question: 'Is the claim time-sensitive and critical to it, so that it calls for attention now?' },
};
const ATTR_IDS = Object.keys(ATTRIBUTES) as Attribute[];

export const CLASSES: Record<ClassId, { name: string; group: string; holds: string; meaning: string; response: string }> = {
  definitive: {
    name: 'Definitive',
    group: 'Definitive: all three attributes',
    holds: 'power, legitimacy and urgency',
    meaning: 'A powerful, legitimate claim that needs attention now.',
    response: 'Give its claim priority now: consult it before the decision is final and agree how the claim will be met.',
  },
  dominant: {
    name: 'Dominant',
    group: 'Expectant: two attributes',
    holds: 'power and legitimacy',
    meaning: 'Its influence on the business is assured; owners, lenders and large customers are often here.',
    response: 'Keep formal channels open, such as board reports, lender reviews or account meetings, and watch for the urgency that would make it definitive.',
  },
  dangerous: {
    name: 'Dangerous',
    group: 'Expectant: two attributes',
    holds: 'power and urgency',
    meaning: 'Presses its claim urgently and has the power to act, but the claim is not legitimate, so it may turn to coercion.',
    response: 'Identify the risk and plan for it, but do not reward illegitimate pressure; protect the business and the people the pressure could harm.',
  },
  dependent: {
    name: 'Dependent',
    group: 'Expectant: two attributes',
    holds: 'legitimacy and urgency',
    meaning: 'An urgent, legitimate claim with no power to enforce it, so it depends on others, such as regulators, the courts, the media or managers’ own values.',
    response: 'Weigh the claim on its merits now. If a powerful ally takes it up, it becomes definitive, so act before that happens.',
  },
  dormant: {
    name: 'Dormant',
    group: 'Latent: one attribute',
    holds: 'power only',
    meaning: 'Can affect the business but has no legitimate or urgent claim on this decision, so it has little reason to act yet.',
    response: 'Little contact is needed now, but keep it in view: with an urgent or a legitimate claim it would become dangerous or dominant.',
  },
  discretionary: {
    name: 'Discretionary',
    group: 'Latent: one attribute',
    holds: 'legitimacy only',
    meaning: 'A legitimate claim with no power behind it and no urgency.',
    response: 'Nothing forces managers to engage, so engaging is a choice, often made on ethical grounds or for goodwill.',
  },
  demanding: {
    name: 'Demanding',
    group: 'Latent: one attribute',
    holds: 'urgency only',
    meaning: 'Presses its claim insistently, with neither power nor a legitimate claim.',
    response: 'Bothersome rather than dangerous: acknowledge it and watch it, without letting it take attention from legitimate claims.',
  },
  none: {
    name: 'Not a stakeholder here',
    group: 'No attributes',
    holds: 'none of the three',
    meaning: 'Holds none of the attributes, so on this theory it has no stake in this decision.',
    response: 'Leave it out, or say which attribute you have missed.',
  },
};
export const CLASS_ORDER: ClassId[] = ['definitive', 'dominant', 'dangerous', 'dependent', 'dormant', 'discretionary', 'demanding', 'none'];
export const SALIENCE = ['None', 'Low', 'Moderate', 'High'] as const;
export const LIMITS = { stakeholders: 14 };
const YN: YesNo[] = ['yes', 'no'];

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): SalienceState {
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
        power: oneOf(x.power, POWER_IDS, 'none'),
        legitimacy: oneOf(x.legitimacy, YN, 'no'),
        urgency: oneOf(x.urgency, YN, 'no'),
        claim: str(x.claim, 300),
        evidence: str(x.evidence, 500),
        change: str(x.change, 300),
        plan: str(x.plan, 400),
      };
    }),
  };
}

export function newStakeholder(s: Pick<SalienceState, 'stakeholders'>): SalienceStakeholder {
  return { id: nextId('s', s.stakeholders.map((x) => x.id)), name: '', power: 'none', legitimacy: 'no', urgency: 'no', claim: '', evidence: '', change: '', plan: '' };
}

export function blank(): SalienceState {
  const one = newStakeholder({ stakeholders: [] });
  return { business: '', decision: '', stakeholders: [one, newStakeholder({ stakeholders: [one] })] };
}

/* ---------- The model ---------- */

type Attrs = Pick<SalienceStakeholder, 'power' | 'legitimacy' | 'urgency'>;

export function has(x: Attrs, a: Attribute): boolean {
  if (a === 'power') return x.power !== 'none';
  return (a === 'legitimacy' ? x.legitimacy : x.urgency) === 'yes';
}

export function classOf(x: Attrs): ClassId {
  const p = has(x, 'power');
  const l = has(x, 'legitimacy');
  const u = has(x, 'urgency');
  if (p && l && u) return 'definitive';
  if (p && l) return 'dominant';
  if (p && u) return 'dangerous';
  if (l && u) return 'dependent';
  if (p) return 'dormant';
  if (l) return 'discretionary';
  if (u) return 'demanding';
  return 'none';
}

/** Salience: the number of attributes held, 0 to 3. */
export function salience(x: Attrs): number {
  return ATTR_IDS.filter((a) => has(x, a)).length;
}

/** The same stakeholder with one attribute switched on or off. */
export function toggled(x: Attrs, a: Attribute): Attrs {
  if (a === 'power') return { ...x, power: has(x, 'power') ? 'none' : 'utilitarian' };
  if (a === 'legitimacy') return { ...x, legitimacy: has(x, 'legitimacy') ? 'no' : 'yes' };
  return { ...x, urgency: has(x, 'urgency') ? 'no' : 'yes' };
}

export interface Move {
  attribute: Attribute;
  gain: boolean;
  to: ClassId;
}

/** Where a stakeholder would move if it gained each attribute it lacks, or lost each one it holds. */
export function moves(x: Attrs): Move[] {
  return ATTR_IDS.map((a) => ({ attribute: a, gain: !has(x, a), to: classOf(toggled(x, a)) }));
}

const nm = (x: SalienceStakeholder, n?: number) => x.name.trim() || `Stakeholder ${n ?? ''}`.trim();

/** Named stakeholders, most salient first, then by class, then as entered. */
export function prioritized(s: SalienceState): SalienceStakeholder[] {
  return s.stakeholders
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.name.trim())
    .sort((a, b) => salience(b.x) - salience(a.x) || CLASS_ORDER.indexOf(classOf(a.x)) - CLASS_ORDER.indexOf(classOf(b.x)) || a.i - b.i)
    .map(({ x }) => x);
}

export function inClass(s: SalienceState, c: ClassId): SalienceStakeholder[] {
  return prioritized(s).filter((x) => classOf(x) === c);
}

/** Stakeholders one attribute away from becoming definitive or dangerous: the ones to watch. */
export function watchList(s: SalienceState): Array<{ x: SalienceStakeholder; via: Attribute; to: ClassId }> {
  return prioritized(s).flatMap((x) =>
    moves(x)
      .filter((m) => m.gain && (m.to === 'definitive' || m.to === 'dangerous'))
      .map((m) => ({ x, via: m.attribute, to: m.to })),
  );
}

export function checks(s: SalienceState): Check[] {
  const out: Check[] = [];
  const named = s.stakeholders.filter((x) => x.name.trim());
  if (!s.decision.trim()) out.push({ level: 'warning', text: 'State the decision. Legitimacy and urgency belong to a claim, and a claim is about a particular decision.' });
  const noEvidence = named.filter((x) => salience(x) > 0 && !x.evidence.trim());
  if (noEvidence.length) out.push({ level: 'warning', text: `Give the evidence for your judgement of ${andList(noEvidence.map((x) => x.name.trim()))}. Salience rests on perceptions, and others may judge differently.` });
  const def = named.filter((x) => classOf(x) === 'definitive' && !x.plan.trim());
  if (def.length) out.push({ level: 'warning', text: `${andList(def.map((x) => x.name.trim()))} ${def.length === 1 ? 'is' : 'are'} definitive: say how ${def.length === 1 ? 'its' : 'each'} claim will be met before the decision is final.` });
  const dangerous = named.filter((x) => classOf(x) === 'dangerous' && !x.plan.trim());
  if (dangerous.length) out.push({ level: 'warning', text: `${andList(dangerous.map((x) => x.name.trim()))} ${dangerous.length === 1 ? 'is' : 'are'} dangerous: plan how to protect the business without rewarding the pressure.` });
  const dependent = named.filter((x) => classOf(x) === 'dependent' && !x.change.trim());
  if (dependent.length) out.push({ level: 'info', text: `${andList(dependent.map((x) => x.name.trim()))} ${dependent.length === 1 ? 'depends' : 'depend'} on others to press ${dependent.length === 1 ? 'its' : 'their'} claim. Say who could lend ${dependent.length === 1 ? 'it' : 'them'} power: if anyone does, the claim becomes definitive.` });
  const none = named.filter((x) => classOf(x) === 'none');
  if (none.length) out.push({ level: 'info', text: `${andList(none.map((x) => x.name.trim()))} ${none.length === 1 ? 'holds' : 'hold'} none of the three attributes, so on this theory ${none.length === 1 ? 'it is' : 'they are'} not a stakeholder in this decision. Remove ${none.length === 1 ? 'it' : 'them'}, or say what you missed.` });
  if (named.length >= 3 && !named.some((x) => classOf(x) === 'definitive')) out.push({ level: 'info', text: 'No stakeholder holds all three attributes. Check urgency: claims that need attention now are often missed until they are pressed.' });
  if (named.length >= 4 && new Set(named.map(classOf)).size === 1) out.push({ level: 'info', text: 'Every stakeholder is in the same class. Look again at each attribute: real decisions rarely look like that.' });
  const dup = named.filter((x, i) => named.findIndex((y) => y.name.trim().toLowerCase() === x.name.trim().toLowerCase()) !== i);
  if (dup.length) out.push({ level: 'info', text: `${andList(dup.map((x) => `"${x.name.trim()}"`))} appears more than once.` });
  return out;
}

export function reading(s: SalienceState): string {
  const p = prioritized(s);
  if (!p.length) return 'Add stakeholders and judge their power, legitimacy and urgency to see their salience.';
  const names = (c: ClassId) => andList(inClass(s, c).map((x) => x.name.trim()));
  const parts: string[] = [];
  const def = inClass(s, 'definitive');
  parts.push(def.length ? `${def.length === 1 ? 'One stakeholder is' : `${count(def.length, true)} stakeholders are`} definitive, with a powerful, legitimate and urgent claim: ${names('definitive')}. ${def.length === 1 ? 'Its claim comes' : 'Their claims come'} first.` : 'No stakeholder is definitive on these judgements.');
  if (inClass(s, 'dominant').length) parts.push(`Dominant: ${names('dominant')}, whose influence is assured; keep the formal channels open.`);
  if (inClass(s, 'dangerous').length) parts.push(`Dangerous: ${names('dangerous')}, with power and urgency but no legitimate claim; plan for the risk without rewarding the pressure.`);
  if (inClass(s, 'dependent').length) parts.push(`Dependent: ${names('dependent')}, whose urgent, legitimate claim relies on others to enforce it.`);
  const w = watchList(s).filter((m) => classOf(m.x) !== 'definitive');
  if (w.length) parts.push(`Watch ${andList([...new Set(w.map((m) => `${m.x.name.trim()} (${CLASSES[m.to].name.toLowerCase()} if it gained ${m.via})`))])}.`);
  parts.push('Salience is about whose claims managers notice, not whose claims are right: a dependent stakeholder can hold the most just claim of all.');
  return parts.join(' ');
}

export function headline(s: SalienceState): string {
  const p = prioritized(s);
  if (!p.length) return 'No stakeholders yet.';
  const def = inClass(s, 'definitive');
  const dan = inClass(s, 'dangerous');
  return `${count(p.length, true)} stakeholders judged; definitive: ${def.length ? andList(def.map((x) => x.name.trim())) : 'none'}${dan.length ? `; dangerous: ${andList(dan.map((x) => x.name.trim()))}` : ''}.`;
}

/* ---------- The chart ---------- */

const R = 132;
const CENTRES: Record<Attribute, [number, number]> = { power: [250, 188], legitimacy: [400, 188], urgency: [325, 318] };
/** Where each class's label and markers sit: the middle of its region of the three circles. */
export const REGION: Record<Exclude<ClassId, 'none'>, [number, number]> = {
  dormant: [176, 140],
  discretionary: [474, 140],
  demanding: [325, 404],
  dominant: [325, 120],
  dangerous: [232, 300],
  dependent: [418, 300],
  definitive: [325, 232],
};

/** True when a point lies inside exactly the circles of the attributes the class holds. */
export function inRegion(pt: [number, number], c: Exclude<ClassId, 'none'>): boolean {
  const inside = (a: Attribute) => Math.hypot(pt[0] - CENTRES[a][0], pt[1] - CENTRES[a][1]) < R;
  const want: Record<Attribute, boolean> = { power: CLASSES[c].holds.includes('power'), legitimacy: CLASSES[c].holds.includes('legitimacy'), urgency: CLASSES[c].holds.includes('urgency') };
  return ATTR_IDS.every((a) => inside(a) === want[a]);
}

export function vennSvg(s: SalienceState, id: string): string {
  const W = 650;
  const H = 520;
  const p: string[] = [];
  const fill: Record<Attribute, string> = { power: C.cobaltWash, legitimacy: C.greenWash, urgency: C.goldWash };
  for (const a of ATTR_IDS) {
    const [cx, cy] = CENTRES[a];
    p.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill[a]}" fill-opacity="0.55" stroke="${C.ink}" stroke-width="1.25"/>`);
  }
  p.push(txt(116, 64, 'POWER', { anchor: 'middle', size: 12, weight: 700, fill: C.cobaltText }));
  p.push(txt(534, 64, 'LEGITIMACY', { anchor: 'middle', size: 12, weight: 700, fill: C.greenText }));
  p.push(txt(325, 482, 'URGENCY', { anchor: 'middle', size: 12, weight: 700, fill: C.goldText }));
  const num = new Map(s.stakeholders.map((x, i) => [x.id, i + 1]));
  const named = s.stakeholders.filter((x) => x.name.trim());
  for (const c of Object.keys(REGION) as Array<Exclude<ClassId, 'none'>>) {
    const [x, y] = REGION[c];
    p.push(txt(x, y - 14, CLASSES[c].name.toUpperCase(), { anchor: 'middle', size: 10, weight: 700, fill: C.ink }));
    const here = named.filter((m) => classOf(m) === c);
    const perRow = 3;
    here.forEach((m, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, here.length - row * perRow);
      const px = x + (i % perRow - (inRow - 1) / 2) * 24;
      const py = y + 4 + row * 24;
      p.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="10" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/>`);
      p.push(txt(px, py + 4, String(num.get(m.id) ?? ''), { anchor: 'middle', size: 10.5, weight: 700, fill: C.ink }));
    });
  }
  const outside = named.filter((m) => classOf(m) === 'none');
  p.push(txt(24, H - 22, outside.length ? `Holding none of the three: ${outside.map((m) => num.get(m.id)).join(', ')}` : '', { size: 11, fill: C.slate }));
  const desc = named.length
    ? `Three overlapping circles for power, legitimacy and urgency. ${named.map((m) => `${num.get(m.id)} ${m.name.trim()}: ${CLASSES[classOf(m)].name.toLowerCase()} (${CLASSES[classOf(m)].holds})`).join('; ')}.`
    : 'Three overlapping circles for power, legitimacy and urgency, with no stakeholders yet.';
  return svgDoc(W, H, id, 'Stakeholder salience: power, legitimacy and urgency', desc, p.join(''));
}

/* ---------- HTML ---------- */

export function classHtml(x: Attrs): string {
  const c = classOf(x);
  return `<span class="sx-place__label">Class</span> <strong>${esc(CLASSES[c].name)}</strong> <span class="muted">(${esc(CLASSES[c].holds)}; salience ${esc(SALIENCE[salience(x)]!.toLowerCase())})</span>`;
}

function row(x: SalienceStakeholder, n: number, uid: string): string {
  const id = `${uid}-${x.id}`;
  const who = nm(x, n);
  const sr = (label: string) => `${label}<span class="sr-only">: ${esc(who)}</span>`;
  return `<li class="sx-row" data-row="${esc(x.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body">${field({ id: `${id}-name`, k: `stakeholders.${x.id}.name`, label: `Stakeholder ${n}`, value: x.name, maxlength: 80 })}${field({
    id: `${id}-claim`,
    k: `stakeholders.${x.id}.claim`,
    label: 'Its claim: what it wants from the decision',
    value: x.claim,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}<div class="sx-nums sx-nums--3">${select({ id: `${id}-power`, k: `stakeholders.${x.id}.power`, label: 'Power', labelHtml: sr('Power'), value: x.power, options: POWER_IDS.map((v) => ({ value: v, label: POWER_BASES[v] })) })}${select({
    id: `${id}-legit`,
    k: `stakeholders.${x.id}.legitimacy`,
    label: 'Legitimate claim?',
    labelHtml: sr('Legitimate claim?'),
    value: x.legitimacy,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  })}${select({
    id: `${id}-urgent`,
    k: `stakeholders.${x.id}.urgency`,
    label: 'Urgent claim?',
    labelHtml: sr('Urgent claim?'),
    value: x.urgency,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  })}</div><p class="sx-place" data-place="${esc(x.id)}">${classHtml(x)}</p>${field({ id: `${id}-ev`, k: `stakeholders.${x.id}.evidence`, label: 'Why you judged it so', value: x.evidence, multiline: true, rows: 2, maxlength: 500 })}${field({
    id: `${id}-change`,
    k: `stakeholders.${x.id}.change`,
    label: 'What could give it, or take from it, an attribute',
    value: x.change,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}${field({ id: `${id}-plan`, k: `stakeholders.${x.id}.plan`, label: 'Your plan for it', value: x.plan, multiline: true, rows: 2, maxlength: 400 })}<div class="sx-row__meta">${button({
    act: 'remove',
    label: 'Remove',
    aria: `Remove stakeholder ${n}: ${who}`,
    data: { id: x.id },
    cls: 'sx-row__remove',
  })}</div></div></li>`;
}

export function editorHtml(s: SalienceState, uid: string): string {
  return `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-decision`,
    k: 'decision',
    label: 'The decision',
    value: s.decision,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div><fieldset class="sx-q"><legend>Stakeholders</legend><p class="sx-q__prompt">${ATTR_IDS.map((a) => `<b>${esc(ATTRIBUTES[a].name)}:</b> ${esc(ATTRIBUTES[a].question)}`).join(' ')}</p><ol class="sx-rows" role="list">${s.stakeholders
    .map((x, i) => row(x, i + 1, uid))
    .join('')}</ol>${button({ act: 'add', label: 'Add a stakeholder', cls: 'sx-add', disabled: s.stakeholders.length >= LIMITS.stakeholders })}</fieldset>`;
}

const yes = (b: boolean) => (b ? 'Yes' : 'No');

export function outputsHtml(s: SalienceState, uid: string): string {
  const p = prioritized(s);
  const num = new Map(s.stakeholders.map((x, i) => [x.id, i + 1]));
  const table = p.length
    ? tableRegion(
        'Stakeholders by salience',
        `<caption class="sr-only">Each stakeholder's power, legitimacy and urgency, its class, its salience and what the class asks of managers</caption><thead><tr><th scope="col" class="n">No.</th><th scope="col">Stakeholder</th><th scope="col">Power</th><th scope="col">Legitimate</th><th scope="col">Urgent</th><th scope="col">Class</th><th scope="col">What it asks of managers</th></tr></thead><tbody>${p
          .map((x) => {
            const c = classOf(x);
            return `<tr><td class="n num">${num.get(x.id)}</td><th scope="row">${esc(x.name.trim())}${x.claim.trim() ? `<span class="sx-swot__ev">${esc(x.claim.trim())}</span>` : ''}</th><td class="small">${esc(x.power === 'none' ? 'No' : POWER_BASES[x.power].split(':')[0]!)}</td><td>${yes(has(x, 'legitimacy'))}</td><td>${yes(has(x, 'urgency'))}</td><td><strong>${esc(CLASSES[c].name)}</strong><span class="sx-swot__ev">Salience ${esc(SALIENCE[salience(x)]!.toLowerCase())}</span></td><td class="small">${esc(CLASSES[c].response)}${x.plan.trim() ? `<span class="sx-plan"><b>Your plan:</b> ${esc(x.plan.trim())}</span>` : ''}</td></tr>`;
          })
          .join('')}</tbody>`,
      )
    : '<p class="small muted">No stakeholders yet.</p>';
  const moveRows = p
    .map((x) => {
      const m = moves(x);
      const gains = m.filter((y) => y.gain).map((y) => `gaining ${y.attribute}: ${CLASSES[y.to].name.toLowerCase()}`);
      const losses = m.filter((y) => !y.gain).map((y) => `losing ${y.attribute}: ${CLASSES[y.to].name.toLowerCase()}`);
      return `<li><span class="sx-change__force">${esc(x.name.trim())} <span class="muted">(${esc(CLASSES[classOf(x)].name.toLowerCase())})</span></span><span class="sx-change__note">${esc(orDash(x.change, 'No note on what could change it yet.'))}</span><span class="sx-change__fx small muted">${esc([...gains, ...losses].join('; '))}</span></li>`;
    })
    .join('');
  const classes = `<dl class="sx-qnotes">${CLASS_ORDER.filter((c) => c !== 'none').map((c) => `<div><dt>${esc(CLASSES[c].name)} <span class="muted">(${esc(CLASSES[c].holds)}; ${esc(CLASSES[c].group.split(':')[0]!.toLowerCase())})</span></dt><dd>${esc(CLASSES[c].meaning)} <strong>For managers:</strong> ${esc(CLASSES[c].response)}</dd></div>`).join('')}</dl>`;
  return `<div class="sx-out__block"><h4 class="sx-out__h">The three attributes</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.decision.trim() ? `Decision: ${s.decision.trim()}` : 'Decision not stated.')}</p>${chartRegion('Stakeholder salience chart', vennSvg(s, `${uid}-chart`))}<ul class="sx-legend" role="list"><li>Each numbered circle is a stakeholder, numbered as in the inputs</li><li>Its region shows the attributes it holds, and its class</li><li>Salience: high with three attributes, moderate with two, low with one</li></ul><p class="sx-reading" data-reading>${esc(reading(s))}</p></div><div class="sx-out__block"><h4 class="sx-out__h">Classes and what they ask of managers</h4>${table}</div><div class="sx-out__block"><h4 class="sx-out__h">How each could move</h4><p class="small muted">Attributes are not fixed: a stakeholder gains power through allies, urgency when a deadline nears, legitimacy when a claim is recognized. Each line shows the class it would move to.</p><ul class="sx-change" role="list">${moveRows}</ul></div><div class="sx-out__block"><h4 class="sx-out__h">The seven classes</h4>${classes}</div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the decision is stated, every judgement has evidence, and every definitive and dangerous stakeholder has a plan.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: SalienceState): string {
  return textDoc(`Stakeholder salience (enrichment): ${orDash(s.business, 'organization not named')}`, [
    textSection('Decision', [orDash(s.decision)]),
    ...CLASS_ORDER.map((c) =>
      textSection(
        `${CLASSES[c].name} (${CLASSES[c].holds})`,
        inClass(s, c).map((x) => `- ${x.name.trim()} [power: ${x.power === 'none' ? 'no' : x.power}; legitimate: ${x.legitimacy}; urgent: ${x.urgency}]${x.claim.trim() ? `\n  Claim: ${x.claim.trim()}` : ''}${x.evidence.trim() ? `\n  Why: ${x.evidence.trim()}` : ''}\n  For managers: ${CLASSES[c].response}${x.change.trim() ? `\n  Could change: ${x.change.trim()}` : ''}${x.plan.trim() ? `\n  Plan: ${x.plan.trim()}` : ''}`),
      ),
    ),
    textSection('Reading', [reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. Stakeholder salience (Mitchell, Agle and Wood, 1997) is not part of the IB course. A framework structures judgement; it does not produce the answer.',
  ]);
}

export function toCsvText(s: SalienceState): string {
  return toCsv([
    ['Stakeholder', 'Power', 'Legitimate', 'Urgent', 'Class', 'Salience', 'Claim', 'Evidence', 'What could change it', 'Plan'],
    ...prioritized(s).map((x) => [x.name.trim(), x.power, x.legitimacy, x.urgency, CLASSES[classOf(x)].name, SALIENCE[salience(x)] ?? '', x.claim.trim(), x.evidence.trim(), x.change.trim(), x.plan.trim()]),
  ]);
}

export function fileName(s: SalienceState): string {
  return `${fileSlug(s.business)}-stakeholder-salience`;
}

export function problems(s: SalienceState): string[] {
  const out: string[] = [];
  if (!s.decision.trim()) out.push('the worked example needs a decision');
  const classes = new Set(s.stakeholders.map(classOf));
  CLASS_ORDER.filter((c) => c !== 'none').forEach((c) => classes.has(c) || out.push(`the worked example has no ${CLASSES[c].name.toLowerCase()} stakeholder`));
  s.stakeholders.forEach((x) => (x.name.trim() && x.claim.trim() && x.evidence.trim() && x.plan.trim()) || out.push(`stakeholder ${x.id} needs a name, a claim, evidence and a plan`));
  return out;
}
