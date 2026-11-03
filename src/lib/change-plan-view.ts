/**
 * HTML and SVG for the change management planner, rendered on the server for
 * the worked example and in the browser after every change.
 */
import { esc } from './markup';
import { APPROACHES, QUADRANTS, REASONS, RISK_LABEL, planSteps, quadrant, readForces, resistance, type ChangeInputs, type Quadrant, type Stakeholder } from './change-plan';
import type { Force } from './force-field';
import { P, r1, svgChart, wrapWords } from './tool-palette';

/**
 * The force field diagram: driving forces push from the left, restraining
 * forces from the right, against a line that stands for the change. Each
 * arrow is as long as its strength. A weakened force shows the part removed
 * as a dashed outline.
 */
export function forceFieldSvg(driving: Force[], restraining: Force[], lever: number | null, id: string): string {
  const W = 320;
  const C = W / 2;
  const unit = 27;
  const T = 30;
  const rowH = 54;
  const rows = Math.max(driving.length, restraining.length, 1);
  const H = T + rows * rowH + 34;
  const f = readForces(driving, restraining, lever);
  const parts: string[] = [];
  parts.push(`<text x="${C - 8}" y="16" text-anchor="end" class="ch-axis" fill="${P.green}">Driving</text>`);
  parts.push(`<text x="${C + 8}" y="16" class="ch-axis" fill="${P.signalText}">Restraining</text>`);
  parts.push(`<line x1="${C}" y1="${T - 6}" x2="${C}" y2="${H - 30}" stroke="${P.navy}" stroke-width="3"/>`);
  const arrow = (side: 'd' | 'r', k: number, force: Force, to: number | null) => {
    const y0 = T + k * rowH;
    const ay = y0 + 38;
    const len = force.strength * unit;
    const shown = (to ?? force.strength) * unit;
    const sign = side === 'd' ? -1 : 1;
    const tip = C + sign * 3;
    const tail = C + sign * (3 + shown);
    const col = side === 'd' ? P.green : P.signal;
    const lines = wrapWords(force.label, 23, 2);
    lines.forEach((ln, j) => parts.push(`<text x="${C + sign * 8}" y="${y0 + 11 + j * 13}" text-anchor="${side === 'd' ? 'end' : 'start'}" class="ch-note" fill="${P.navy}">${esc(ln)}</text>`));
    if (to !== null && to < force.strength) {
      const gone0 = C + sign * (3 + shown);
      const gone1 = C + sign * (3 + len);
      parts.push(`<rect x="${r1(Math.min(gone0, gone1))}" y="${ay - 5}" width="${r1(Math.abs(gone1 - gone0))}" height="10" fill="none" stroke="${col}" stroke-dasharray="3 3"/>`);
    }
    // Shaft, then a head pointing at the line.
    const shaftEnd = tip + -sign * 9;
    parts.push(`<rect x="${r1(Math.min(tail, shaftEnd))}" y="${ay - 5}" width="${r1(Math.max(1, Math.abs(shaftEnd - tail)))}" height="10" fill="${col}"/>`);
    parts.push(`<path d="M${r1(tip)} ${ay} L${r1(shaftEnd)} ${ay - 9} L${r1(shaftEnd)} ${ay + 9} Z" fill="${col}"/>`);
    const vx = C + sign * (3 + Math.max(len, shown) + 6);
    parts.push(`<text x="${r1(vx)}" y="${ay + 4}" text-anchor="${side === 'd' ? 'end' : 'start'}" class="ch-label" fill="${P.navy}">${to !== null && to < force.strength ? `${force.strength} to ${to}` : force.strength}</text>`);
  };
  driving.forEach((d, k) => arrow('d', k, d, null));
  restraining.forEach((r, k) => arrow('r', k, r, f.lever && f.lever.index === k ? f.lever.to : null));
  const after = f.lever?.after;
  parts.push(`<text x="${C - 8}" y="${H - 10}" text-anchor="end" class="ch-label" fill="${P.green}">Total ${f.summary.driving}</text>`);
  parts.push(`<text x="${C + 8}" y="${H - 10}" class="ch-label" fill="${P.signalText}">Total ${after ? `${f.summary.restraining} to ${after.restraining}` : f.summary.restraining}</text>`);
  const list = (fs: Force[]) => fs.map((x) => `${x.label} ${x.strength}`).join('; ');
  const desc = `Driving forces, total ${f.summary.driving}: ${list(driving)}. Restraining forces, total ${f.summary.restraining}: ${list(restraining)}.${f.lever ? ` Weakening "${f.lever.label}" from ${f.lever.from} to ${f.lever.to} would make the restraining total ${f.lever.after.restraining}.` : ''}`;
  return svgChart({ w: W, h: H, id, title: 'Force field diagram for the change', desc, body: parts.join(''), minWidth: 280, maxWidth: 480, cls: 'cp-ch' });
}

/** The totals and the sentence for the force field, with the effect of weakening the chosen force. */
export function forceReadingHtml(driving: Force[], restraining: Force[], lever: number | null): string {
  const f = readForces(driving, restraining, lever);
  const after = f.lever
    ? `<p><strong>Weakening one force.</strong> ${esc(`If "${f.lever.label}" were weakened from ${f.lever.from} to ${f.lever.to}, the totals would be ${f.lever.after.driving} driving against ${f.lever.after.restraining} restraining: ${f.lever.after.balance === 'driving' ? 'the driving forces would lead' : f.lever.after.balance === 'level' ? 'the forces would be level' : 'the restraining forces would still lead'}.`)}</p>`
    : '';
  return `<p>${esc(f.summary.sentence)}</p>${after}`;
}

/** The stakeholder map as four labelled boxes, so it reflows on a phone and reads in order. */
export function stakeholderMapHtml(stakeholders: Stakeholder[]): string {
  const order: Quadrant[] = ['manage-closely', 'keep-satisfied', 'keep-informed', 'monitor'];
  const stance = { supports: 'supports', neutral: 'neutral', opposes: 'opposes' } as const;
  return order
    .map((q) => {
      const here = stakeholders.filter((s) => quadrant(s) === q);
      const info = QUADRANTS[q];
      return `<section class="cp-map__q cp-map__q--${q}" aria-label="${esc(`${info.label}: ${info.power} power, ${info.interest} interest`)}"><h4 class="cp-map__h">${esc(info.label)}</h4><p class="cp-map__axes">${esc(`${info.power === 'high' ? 'High' : 'Low'} power, ${info.interest} interest`)}</p>${
        here.length
          ? `<ul class="cp-map__list">${here.map((s) => `<li class="cp-st cp-st--${s.stance}"><span class="cp-st__name">${esc(s.name)}</span> <span class="cp-st__stance">${stance[s.stance]}</span></li>`).join('')}</ul>`
          : '<p class="cp-map__none">Nobody here.</p>'
      }<p class="cp-map__what">${esc(info.what)}</p></section>`;
    })
    .join('');
}

/** The resistance to expect, the riskiest first, with the approaches that fit. */
export function resistanceHtml(stakeholders: Stakeholder[]): string {
  const rows = resistance(stakeholders).filter((r) => r.risk !== 'ally');
  if (!rows.length) return '<p class="tool-note">Nobody is expected to resist, on these judgements.</p>';
  return `<ol class="cp-res">${rows
    .map((r) => {
      const reason = REASONS.find((x) => x.id === r.reason)?.label ?? '';
      return `<li class="cp-res__item cp-res__item--${r.risk}"><p class="cp-res__head"><span class="cp-res__name">${esc(r.name)}</span> <span class="cp-res__risk">${esc(RISK_LABEL[r.risk])}</span></p><p>${esc(r.reason === 'none' ? 'No particular reason given.' : `Main reason: ${reason.toLowerCase()}.`)} ${esc(`On the map: ${QUADRANTS[r.quadrant].label.toLowerCase()}.`)}</p><p class="cp-res__app">${esc(`Approaches that fit: ${r.approaches.map((a) => APPROACHES[a].name.toLowerCase()).join(', ')}.`)}</p></li>`;
    })
    .join('')}</ol>`;
}

/** The steps to take, in order, each with who it is for and its drawback where it has one. */
export function stepsHtml(i: ChangeInputs): string {
  return `<ol class="cp-steps">${planSteps(i)
    .map((s) => {
      const a = s.approach ? APPROACHES[s.approach] : null;
      return `<li class="cp-step"><h4 class="cp-step__title">${esc(s.title)}</h4><p class="cp-step__who">${esc(s.who.length ? `For: ${s.who.join(', ')}` : 'For: everyone affected')}</p><p>${esc(s.what)}</p>${a ? `<p class="cp-step__model"><span class="cp-step__name">${esc(a.name)}.</span> ${esc(`Its drawback: ${a.drawback.charAt(0).toLowerCase()}${a.drawback.slice(1)}`)}</p>` : ''}</li>`;
    })
    .join('')}</ol>`;
}

/** The two approaches the plan never suggests, set out so the reader can judge them. */
export function lastResortsHtml(): string {
  return (['manipulation', 'coercion'] as const)
    .map((id) => `<li><strong>${esc(APPROACHES[id].name)}.</strong> ${esc(`Used when: ${APPROACHES[id].when.charAt(0).toLowerCase()}${APPROACHES[id].when.slice(1)}`)} ${esc(APPROACHES[id].drawback)}</li>`)
    .join('');
}

/* ---------- The editors, shared by the server and the browser ---------- */

const SIDE = { driving: 'Driving', restraining: 'Restraining' } as const;
const opt = (v: string, label: string, sel: boolean) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;

/** One row per force: its name, its strength and a button to remove it. */
export function forceRowsHtml(side: 'driving' | 'restraining', forces: Force[], uid: string): string {
  return forces
    .map((f, k) => {
      const id = `${uid}-${side}-${k}`;
      const strengths = [1, 2, 3, 4, 5].map((n) => opt(String(n), String(n), n === f.strength)).join('');
      return `<tr data-force="${k}"><td><label class="sr-only" for="${id}-label">${SIDE[side]} force ${k + 1}</label><input class="input cp-force__label" id="${id}-label" name="label" type="text" maxlength="90" value="${esc(f.label)}" aria-describedby="${id}-err"><span class="field__error" id="${id}-err" data-err-force="${side}-${k}"></span></td><td class="cp-force__s"><label class="cp-force__lab" for="${id}-strength">Strength<span class="sr-only"> of ${side} force ${k + 1}, from 1 to 5</span></label><select class="select cp-force__strength" id="${id}-strength" name="strength">${strengths}</select></td><td class="js-only"><button type="button" class="btn btn--small cp-remove" data-remove-force="${side}" data-index="${k}">Remove<span class="sr-only"> ${side} force ${k + 1}</span></button></td></tr>`;
    })
    .join('');
}

/** The choice of a restraining force to weaken. */
export function leverOptionsHtml(restraining: Force[], lever: number | null): string {
  return opt('', 'None chosen', lever === null) + restraining.map((f, k) => opt(String(k), `${k + 1}. ${f.label || 'Unnamed force'}`, lever === k)).join('');
}

/** One card per stakeholder: name, power, interest, stance and main reason. */
export function stakeholderRowsHtml(stakeholders: Stakeholder[], uid: string): string {
  return stakeholders
    .map((s, k) => {
      const id = `${uid}-s${k}`;
      const sel = (name: string, label: string, options: Array<[string, string]>, value: string) =>
        `<div class="field cp-sh__${name}"><label for="${id}-${name}">${esc(label)}</label><select class="select" id="${id}-${name}" name="${name}">${options.map(([v, l]) => opt(v, l, v === value)).join('')}</select></div>`;
      return `<li class="cp-sh" data-stakeholder="${k}"><fieldset class="cp-sh__set"><legend class="cp-sh__legend">Stakeholder ${k + 1}</legend><div class="cp-sh__grid"><div class="field cp-sh__name"><label for="${id}-name">Name</label><input class="input" id="${id}-name" name="name" type="text" maxlength="90" value="${esc(s.name)}" aria-describedby="${id}-err"></div>${sel('power', 'Power', [['high', 'High'], ['low', 'Low']], s.power)}${sel('interest', 'Interest', [['high', 'High'], ['low', 'Low']], s.interest)}${sel('stance', 'Stance', [['supports', 'Supports'], ['neutral', 'Neutral'], ['opposes', 'Opposes']], s.stance)}${sel('reason', 'Main reason, if not supporting', REASONS.map((r) => [r.id, r.label] as [string, string]), s.reason)}<p class="js-only cp-sh__actions"><button type="button" class="btn btn--small cp-remove" data-remove-st="${k}">Remove<span class="sr-only"> stakeholder ${k + 1}</span></button></p></div><span class="field__error" id="${id}-err" data-err-st="${k}"></span></fieldset></li>`;
    })
    .join('');
}
