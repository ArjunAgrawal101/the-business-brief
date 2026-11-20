/**
 * The Stakeholder Impact Simulator's results as HTML, drawn by the same code
 * on the server (the worked example a reader sees first, and without
 * JavaScript) and in the browser (src/scripts/stakeholder-impact.ts).
 */
import { esc } from '../markup';
import { C, placeLabel, r1, svgDoc, txt } from '../strategy/svg';
import { HIGH } from '../strategy/stakeholders';
import { DIRECTION_WORDS, GROUP_INFO, PARAMS, PARAM_IDS, SIZE_WORDS, quadrantInfo, type GroupResult, type Settings, type Simulation } from './model';

/** The model's scores run from about -4.5 to +4.5; the bars are drawn on -5 to +5. */
const MAX = 5;

const sign = (n: number) => (n > 0 ? `+${n.toFixed(1)}` : n < 0 ? `−${Math.abs(n).toFixed(1)}` : '0.0');

const tone = (r: GroupResult) => (r.direction === 'gains' ? 'gain' : r.direction === 'loses' ? 'loss' : r.direction === 'little' ? 'none' : 'mixed');

function bar(label: string, v: number): string {
  const w = Math.min(50, (Math.abs(v) / MAX) * 50);
  const left = v < 0 ? 50 - w : 50;
  return `<span class="si-bar"><span class="si-bar__label">${label}</span><span class="si-bar__track" aria-hidden="true"><span class="si-bar__fill si-bar__fill--${v < 0 ? 'loss' : 'gain'}" style="left:${r1(left)}%;width:${r1(w)}%"></span></span><span class="si-bar__value">${sign(v)}</span></span>`;
}

export function settingsLine(st: Settings): string {
  return PARAM_IDS.map((k) => `${PARAMS[k].label}: ${(PARAMS[k].options as ReadonlyArray<{ id: string; label: string }>).find((o) => o.id === st[k])?.label ?? ''}`).join('; ');
}

export function impactHtml(sim: Simulation): string {
  const items = sim.results
    .map((r) => {
      const info = GROUP_INFO[r.group];
      return `<li class="si-group si-group--${tone(r)}" data-group="${r.group}" data-direction="${r.direction}" data-size="${r.size}">
<h3 class="si-group__name">${esc(info.name)} <span class="si-group__kind">${info.kind === 'internal' ? 'Internal' : 'External'}</span></h3>
<p class="si-group__verdict"><span class="si-dir">${esc(DIRECTION_WORDS[r.direction])}</span><span class="si-group__size">${esc(SIZE_WORDS[r.size])}</span><span class="si-group__when">${esc(r.timescale)}</span></p>
<p class="si-group__why">${esc(r.reason)}</p>
<p class="si-group__bars">${bar('First year', r.short)}${bar('After', r.long)}</p>
</li>`;
    })
    .join('');
  return `<ol class="si-groups" role="list">${items}</ol>`;
}

function namesOf(rs: GroupResult[]): string {
  return rs.map((r) => `<li><span class="si-who__name">${esc(GROUP_INFO[r.group].name)}</span> <span class="si-who__how">${esc(DIRECTION_WORDS[r.direction].toLowerCase())}, ${esc(SIZE_WORDS[r.size].toLowerCase())}</span></li>`).join('');
}

export function tradeoffsHtml(sim: Simulation): string {
  const gains = sim.gainers.length ? `<ol class="si-who">${namesOf(sim.gainers)}</ol>` : '<p class="small muted">No group gains to any extent on these settings.</p>';
  const loses = sim.losers.length ? `<ol class="si-who">${namesOf(sim.losers)}</ol>` : '<p class="small muted">No group loses to any extent on these settings. Is that realistic, or has the mitigation been made too easy?</p>';
  const conflicts = sim.conflicts.length
    ? `<ul class="si-conflicts">${sim.conflicts.map((c) => `<li><span class="si-conflicts__pair">${esc(GROUP_INFO[c.gains].name)} against ${esc(GROUP_INFO[c.loses].name.toLowerCase())}</span> ${esc(c.text)}</li>`).join('')}</ul>`
    : '<p class="small">None of the conflicts this decision usually brings is live on these settings: the groups that normally lose are no longer worse off overall. Check what that cost the owners.</p>';
  const trade = sim.tradeoffs.length ? `<ul class="si-trade">${sim.tradeoffs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  return `<div class="si-columns"><div><h3 class="si-sub">Who gains</h3>${gains}</div><div><h3 class="si-sub">Who loses</h3>${loses}</div></div>
<h3 class="si-sub">Conflicting interests</h3>${conflicts}
${trade ? `<h3 class="si-sub">What your settings trade off</h3>${trade}` : ''}`;
}

/** The power-interest grid, with each group placed by the Strategy Studio's rule (6 or more counts as high). */
export function gridSvg(sim: Simulation, id: string): string {
  const W = 560;
  const H = 440;
  const L = 58;
  const R = 16;
  const T = 18;
  const B = 54;
  const pw = W - L - R;
  const ph = H - T - B;
  const xOf = (v: number) => L + ((v - 0.5) / 10) * pw;
  const yOf = (v: number) => T + ph - ((v - 0.5) / 10) * ph;
  const mx = xOf(HIGH - 0.5);
  const my = yOf(HIGH - 0.5);
  const p: string[] = [];
  const quads: Array<['manage' | 'satisfy' | 'inform' | 'monitor', number, number, number, number, 'start' | 'end', number, number]> = [
    ['satisfy', L, T, mx - L, my - T, 'start', L + 8, T + 15],
    ['manage', mx, T, L + pw - mx, my - T, 'end', L + pw - 8, T + 15],
    ['monitor', L, my, mx - L, T + ph - my, 'start', L + 8, T + ph - 8],
    ['inform', mx, my, L + pw - mx, T + ph - my, 'end', L + pw - 8, T + ph - 8],
  ];
  for (const [q, x, y, w, h, anchor, tx, ty] of quads) {
    p.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${q === 'manage' ? C.goldWash : q === 'monitor' ? C.white : C.paper}"/>`);
    p.push(txt(tx, ty, quadrantInfo(q).name.toUpperCase(), { anchor, size: 12, weight: 700, fill: q === 'manage' ? C.goldText : C.slate }));
  }
  p.push(`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`);
  p.push(`<line x1="${r1(mx)}" y1="${T}" x2="${r1(mx)}" y2="${T + ph}" stroke="${C.ink}" stroke-dasharray="5 4"/>`);
  p.push(`<line x1="${L}" y1="${r1(my)}" x2="${L + pw}" y2="${r1(my)}" stroke="${C.ink}" stroke-dasharray="5 4"/>`);
  for (const v of [1, 5, 10]) {
    p.push(txt(xOf(v), T + ph + 17, String(v), { anchor: 'middle', size: 12, fill: C.slate }));
    p.push(txt(L - 8, yOf(v) + 4, String(v), { anchor: 'end', size: 12, fill: C.slate }));
  }
  p.push(txt(L + pw / 2, H - 12, 'Interest in the decision', { anchor: 'middle', size: 13, weight: 600, fill: C.ink }));
  p.push(txt(18, T + ph / 2, 'Power over the business', { anchor: 'middle', size: 13, weight: 600, fill: C.ink, rotate: -90 }));
  const seen = new Map<string, number>();
  const at = sim.results.map((r) => {
    const key = `${r.power},${r.interest}`;
    const k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    const a = (k * Math.PI) / 2.5;
    return { r, px: xOf(r.interest) + (k ? 22 * Math.cos(a) : 0), py: yOf(r.power) + (k ? 22 * Math.sin(a) : 0) };
  });
  const taken = at.map((a) => ({ x: a.px - 12, y: a.py - 12, w: 24, h: 24 }));
  for (const a of at) {
    const t = tone(a.r);
    const stroke = t === 'gain' ? C.green : t === 'loss' ? C.signal : t === 'mixed' ? C.gold : C.slate;
    if (GROUP_INFO[a.r.group].kind === 'internal') p.push(`<rect x="${r1(a.px - 10)}" y="${r1(a.py - 10)}" width="20" height="20" fill="#fff" stroke="${stroke}" stroke-width="2.5"/>`);
    else p.push(`<circle cx="${r1(a.px)}" cy="${r1(a.py)}" r="10.5" fill="#fff" stroke="${stroke}" stroke-width="2.5"/>`);
    p.push(`<text x="${r1(a.px)}" y="${r1(a.py + 4.5)}" font-size="13" font-weight="700" text-anchor="middle" fill="${C.ink}">${t === 'gain' ? '+' : t === 'loss' ? '−' : t === 'mixed' ? '±' : '0'}</text>`);
  }
  for (const a of at) {
    const label = GROUP_INFO[a.r.group].name.replace(' and shareholders', '');
    const pos = placeLabel(a.px, a.py, label, 12, { x: L + 2, y: T + 2, w: pw - 4, h: ph - 4 }, taken, 12);
    p.push(txt(pos.x, pos.y, label, { anchor: pos.anchor, size: 12, weight: 600, fill: C.ink }));
  }
  const desc = `Power-interest grid for ${sim.decision.title.toLowerCase()} at ${sim.decision.business}: ${sim.results
    .map((r) => `${GROUP_INFO[r.group].name}, power ${r.power}, interest ${r.interest}, ${DIRECTION_WORDS[r.direction].toLowerCase()}: ${quadrantInfo(r.quadrant).name.toLowerCase()}`)
    .join('; ')}.`;
  return svgDoc(W, H, id, 'Stakeholders by power and interest', desc, p.join(''));
}

export function gridListHtml(sim: Simulation): string {
  const order = ['manage', 'satisfy', 'inform', 'monitor'] as const;
  return `<dl class="si-quads">${order
    .map((q) => {
      const rs = sim.results.filter((r) => r.quadrant === q);
      const info = quadrantInfo(q);
      return `<div class="si-quads__q" data-quadrant="${q}"><dt>${esc(info.name)} <span class="si-quads__where">${esc(info.where)}</span></dt><dd>${rs.length ? esc(rs.map((r) => GROUP_INFO[r.group].name).join(', ')) : '<span class="muted">No group</span>'}<span class="si-quads__how">${esc(info.approach)}</span></dd></div>`;
    })
    .join('')}</dl>`;
}

export function promptsHtml(sim: Simulation): string {
  return `<ol class="si-prompts">${sim.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`;
}
