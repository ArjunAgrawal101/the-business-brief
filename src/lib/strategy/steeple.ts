/**
 * STEEPLE builder. External factors under the seven headings, each rated for
 * impact and likelihood; the product of the two ranks them, and the ranking
 * is cut into three bands: act now, plan for it, watch. The bands are the
 * platform's teaching convention, not a rule from the guide, which names
 * STEEPLE analysis as a toolkit tool for SL and HL (p. 14).
 */
import { esc } from '../markup';
import { type Check, article, count, andList, fileSlug, ident, int, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { externalCue, internalCue, readsLikeAction } from './swot';
import { button, checksHtml, field, ratingOptions, select, tableRegion } from './ui';

export type SteepleCat = 'social' | 'technological' | 'economic' | 'environmental' | 'political' | 'legal' | 'ethical';
export type Effect = 'opportunity' | 'threat' | 'both';

export interface SteepleFactor {
  id: string;
  category: SteepleCat;
  text: string;
  evidence: string;
  effect: Effect;
  impact: number;
  likelihood: number;
}

export interface SteepleState {
  business: string;
  scope: string;
  factors: SteepleFactor[];
}

export const CATEGORIES: Record<SteepleCat, { letter: string; name: string; prompt: string }> = {
  social: { letter: 'S', name: 'Social', prompt: 'Population, lifestyles, attitudes and habits.' },
  technological: { letter: 'T', name: 'Technological', prompt: 'New products, processes and ways of buying and selling.' },
  economic: { letter: 'E', name: 'Economic', prompt: 'Incomes, interest and exchange rates, costs and the business cycle.' },
  environmental: { letter: 'E', name: 'Environmental', prompt: 'Climate, pollution, resources and the pressure to protect them.' },
  political: { letter: 'P', name: 'Political', prompt: 'Government policy, spending, grants and trade.' },
  legal: { letter: 'L', name: 'Legal', prompt: 'Laws and regulations, in force and coming.' },
  ethical: { letter: 'E', name: 'Ethical', prompt: 'What customers, staff and society expect beyond the law.' },
};

const CAT_ORDER = Object.keys(CATEGORIES) as SteepleCat[];
const EFFECTS: Effect[] = ['opportunity', 'threat', 'both'];
export const EFFECT_WORDS: Record<Effect, string> = { opportunity: 'Opportunity', threat: 'Threat', both: 'Both' };
export const IMPACT_WORDS = ['Very small', 'Small', 'Moderate', 'Large', 'Very large'] as const;
export const LIKELIHOOD_WORDS = ['Unlikely', 'Possible', 'Even chance', 'Likely', 'Almost certain'] as const;
export const LIMITS = { factors: 42, perCategory: 6 };

export type Band = 'act' | 'plan' | 'watch';
export const BANDS: Record<Band, { name: string; rule: string; css: string }> = {
  act: { name: 'Act now', rule: 'score 15 to 25', css: 'sx-band--high' },
  plan: { name: 'Plan for it', rule: 'score 8 to 14', css: 'sx-band--medium' },
  watch: { name: 'Watch', rule: 'score 1 to 7', css: 'sx-band--low' },
};

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): SteepleState {
  const r = obj(raw);
  const used = new Set<string>();
  return {
    business: str(r.business, 120),
    scope: str(r.scope, 300),
    factors: list(r.factors, LIMITS.factors).map((f) => {
      const x = obj(f);
      return {
        id: ident(x.id, used, 'f'),
        category: oneOf(x.category, CAT_ORDER, 'social'),
        text: str(x.text, 160),
        evidence: str(x.evidence, 600),
        effect: oneOf(x.effect, EFFECTS, 'threat'),
        impact: int(x.impact, 1, 5, 3),
        likelihood: int(x.likelihood, 1, 5, 3),
      };
    }),
  };
}

export function blank(): SteepleState {
  return { business: '', scope: '', factors: CAT_ORDER.map((c, i) => ({ id: `f${i + 1}`, category: c, text: '', evidence: '', effect: 'threat', impact: 3, likelihood: 3 })) };
}

export function newFactor(s: SteepleState, category: SteepleCat): SteepleFactor {
  return { id: nextId('f', s.factors.map((f) => f.id)), category, text: '', evidence: '', effect: 'threat', impact: 3, likelihood: 3 };
}

/* ---------- Scoring ---------- */

export const score = (f: Pick<SteepleFactor, 'impact' | 'likelihood'>) => f.impact * f.likelihood;

export function band(n: number): Band {
  return n >= 15 ? 'act' : n >= 8 ? 'plan' : 'watch';
}

/** Factors with text, highest score first; ties go to the larger impact, then to the order entered. */
export function prioritized(s: SteepleState): SteepleFactor[] {
  return s.factors
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.text.trim())
    .sort((a, b) => score(b.f) - score(a.f) || b.f.impact - a.f.impact || a.i - b.i)
    .map(({ f }) => f);
}

export function factorCheck(f: Pick<SteepleFactor, 'text'>): string {
  const t = f.text.trim();
  if (!t) return '';
  if (readsLikeAction(t)) return 'This reads like something the business would do. STEEPLE lists conditions in the environment; the response comes later, in your options.';
  const inner = internalCue(t);
  if (inner && !externalCue(t)) return `This mentions ${inner}, which is inside the business. STEEPLE covers the environment outside it: does this belong in a SWOT as a strength or weakness?`;
  return '';
}

export function checks(s: SteepleState): Check[] {
  const out: Check[] = [];
  if (!s.scope.trim()) out.push({ level: 'warning', text: 'Say which market and which period the analysis covers. A factor that matters in one city or over ten years may not matter in another or over one.' });
  const missing = CAT_ORDER.filter((c) => !s.factors.some((f) => f.category === c && f.text.trim()));
  if (missing.length) out.push({ level: 'info', text: `No ${andList(missing.map((c) => CATEGORIES[c].name.toLowerCase()))} factor yet. Is that because there is none that matters, or because you have not looked?` });
  const odd = s.factors.filter((f) => factorCheck(f));
  if (odd.length) out.push({ level: 'warning', text: `${odd.length === 1 ? 'One factor reads' : `${count(odd.length, true)} factors read`} as internal or as an action: ${andList(odd.map((f) => `"${f.text.trim()}"`))}. See the prompt under each.` });
  const bare = s.factors.filter((f) => f.text.trim() && !f.evidence.trim());
  if (bare.length) out.push({ level: 'warning', text: `${bare.length === 1 ? 'One factor has' : `${count(bare.length, true)} factors have`} no evidence. Give a figure, a date or a source for each.` });
  const top = prioritized(s);
  if (top.length >= 4 && top.every((f) => score(f) === score(top[0]!))) out.push({ level: 'info', text: 'Every factor has the same score. Separate them: the point of the ratings is to find the few that matter.' });
  return out;
}

export function reading(s: SteepleState): string {
  const p = prioritized(s);
  if (!p.length) return 'Add factors to see them ranked.';
  const act = p.filter((f) => band(score(f)) === 'act');
  const lead = act.length ? act : p.slice(0, Math.min(3, p.length));
  const threats = lead.filter((f) => f.effect === 'threat').length;
  const opps = lead.filter((f) => f.effect === 'opportunity').length;
  const list_ = andList(lead.map((f) => `${f.text.trim().replace(/^./, (c) => c.toLowerCase())} (${score(f)}, ${EFFECT_WORDS[f.effect].toLowerCase()})`));
  const head = act.length ? `${act.length === 1 ? 'One factor calls' : `${count(act.length, true)} factors call`} for action now: ${list_}.` : `No factor reaches the act-now band. The highest are ${list_}.`;
  const mix = threats && opps ? ` ${threats === 1 ? 'One is a threat' : `${count(threats, true)} are threats`} and ${opps === 1 ? 'one is an opportunity' : `${count(opps)} are opportunities`}.` : threats ? ' All of them are threats.' : opps ? ' All of them are opportunities.' : '';
  return `${head}${mix} Carry these into the SWOT as opportunities and threats, and test each option against them.`;
}

export function headline(s: SteepleState): string {
  const p = prioritized(s);
  if (!p.length) return 'No factors yet.';
  const t = p[0]!;
  return `Highest of ${p.length} external factors: "${t.text.trim()}" (${CATEGORIES[t.category].name.toLowerCase()}, ${EFFECT_WORDS[t.effect].toLowerCase()}, score ${score(t)} of 25); ${p.filter((f) => band(score(f)) === 'act').length} in the act-now band.`;
}

/* ---------- HTML ---------- */

const impactOpts = ratingOptions(IMPACT_WORDS);
const likelyOpts = ratingOptions(LIKELIHOOD_WORDS);

function row(f: SteepleFactor, n: number, uid: string): string {
  const id = `${uid}-${f.id}`;
  const cat = CATEGORIES[f.category];
  return `<li class="sx-row sx-row--plain" data-row="${esc(f.id)}"><div class="sx-row__body">${field({
    id: `${id}-text`,
    k: `factors.${f.id}.text`,
    label: `${cat.name} factor ${n}`,
    value: f.text,
    check: factorCheck(f),
    maxlength: 160,
  })}${field({ id: `${id}-ev`, k: `factors.${f.id}.evidence`, label: 'Evidence', value: f.evidence, multiline: true, rows: 2 })}<div class="sx-row__meta">${select({
    id: `${id}-fx`,
    k: `factors.${f.id}.effect`,
    label: 'For the business',
    value: f.effect,
    options: EFFECTS.map((e) => ({ value: e, label: EFFECT_WORDS[e] })),
  })}${select({ id: `${id}-imp`, k: `factors.${f.id}.impact`, label: 'Impact', value: f.impact, options: impactOpts, integer: true })}${select({
    id: `${id}-lik`,
    k: `factors.${f.id}.likelihood`,
    label: 'Likelihood',
    value: f.likelihood,
    options: likelyOpts,
    integer: true,
  })}${button({ act: 'remove', label: 'Remove', aria: `Remove ${cat.name.toLowerCase()} factor ${n}: ${f.text.trim() || 'untitled'}`, data: { id: f.id }, cls: 'sx-row__remove' })}</div></div></li>`;
}

export function editorHtml(s: SteepleState, uid: string): string {
  const context = `<div class="sx-context">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-scope`,
    k: 'scope',
    label: 'Market and period the analysis covers',
    value: s.scope,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}</div>`;
  const groups = CAT_ORDER.map((c) => {
    const rows = s.factors.filter((f) => f.category === c);
    const cat = CATEGORIES[c];
    return `<fieldset class="sx-q sx-q--steeple"><legend><span class="sx-q__letter" aria-hidden="true">${cat.letter}</span> ${cat.name}</legend><p class="sx-q__prompt">${esc(cat.prompt)}</p><ol class="sx-rows" role="list">${rows
      .map((f, i) => row(f, i + 1, uid))
      .join('')}</ol>${button({ act: 'add', label: `Add ${article(cat.name)} ${cat.name.toLowerCase()} factor`, data: { category: c }, cls: 'sx-add', disabled: rows.length >= LIMITS.perCategory || s.factors.length >= LIMITS.factors })}</fieldset>`;
  }).join('');
  return `${context}<div class="sx-grid-2">${groups}</div>`;
}

function grid(p: SteepleFactor[]): string {
  const rank = new Map(p.map((f, i) => [f.id, i + 1]));
  const rows = [5, 4, 3, 2, 1]
    .map(
      (imp) =>
        `<tr><th scope="row">${imp} <span class="sr-only">impact, </span><span class="sx-heat__word">${esc(IMPACT_WORDS[imp - 1] ?? '')}</span></th>${[1, 2, 3, 4, 5]
          .map((lik) => {
            const here = p.filter((f) => f.impact === imp && f.likelihood === lik);
            const b = band(imp * lik);
            return `<td class="sx-heat__cell sx-heat__cell--${b}">${here.length ? here.map((f) => `<span class="sx-heat__dot">${rank.get(f.id)}</span>`).join('') : '<span class="sr-only">none</span>'}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
  return tableRegion(
    'Impact and likelihood grid',
    `<caption class="sr-only">Each factor's rank, placed by its impact (rows) and likelihood (columns). Shading marks the bands: act now, plan for it, watch.</caption><thead><tr><th scope="col">Impact <span aria-hidden="true">↓</span> / likelihood <span aria-hidden="true">→</span></th>${[1, 2, 3, 4, 5]
      .map((l) => `<th scope="col">${l} <span class="sx-heat__word">${esc(LIKELIHOOD_WORDS[l - 1] ?? '')}</span></th>`)
      .join('')}</tr></thead><tbody>${rows}</tbody>`,
    'table sx-heat',
  );
}

export function outputsHtml(s: SteepleState): string {
  const p = prioritized(s);
  const table = p.length
    ? tableRegion(
        'Prioritized factors',
        `<caption class="sr-only">External factors ranked by impact times likelihood</caption><thead><tr><th scope="col" class="n">Rank</th><th scope="col">Factor</th><th scope="col">Heading</th><th scope="col">For the business</th><th scope="col" class="n">Impact</th><th scope="col" class="n">Likelihood</th><th scope="col" class="n">Score</th><th scope="col">Priority</th></tr></thead><tbody>${p
          .map((f, i) => {
            const b = band(score(f));
            return `<tr><td class="n num">${i + 1}</td><th scope="row">${esc(f.text.trim())}${f.evidence.trim() ? `<span class="sx-swot__ev">${esc(f.evidence.trim())}</span>` : ''}</th><td>${esc(CATEGORIES[f.category].name)}</td><td>${esc(EFFECT_WORDS[f.effect])}</td><td class="n num">${f.impact}</td><td class="n num">${f.likelihood}</td><td class="n num"><strong>${score(f)}</strong></td><td><span class="sx-band ${BANDS[b].css}">${BANDS[b].name}</span></td></tr>`;
          })
          .join('')}</tbody>`,
        'table sx-prio',
      )
    : '<p class="small muted">No factors yet.</p>';
  const counts = CAT_ORDER.map((c) => ({ c, n: s.factors.filter((f) => f.category === c && f.text.trim()).length }));
  return `<div class="sx-out__block"><h4 class="sx-out__h">The prioritized list</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.scope.trim() ? `Scope: ${s.scope.trim()}` : 'Scope not stated.')}</p>${table}<p class="sx-reading" data-reading>${esc(reading(s))}</p><ul class="sx-legend" role="list">${(Object.keys(BANDS) as Band[]).map((b) => `<li><span class="sx-band ${BANDS[b].css}">${BANDS[b].name}</span> ${BANDS[b].rule}</li>`).join('')}<li>Score = impact × likelihood, each from 1 to 5. The bands are the platform's convention for teaching.</li></ul></div><div class="sx-out__block"><h4 class="sx-out__h">Impact and likelihood</h4><p class="small muted">Each number is a factor's rank in the list above.</p>${grid(p)}</div><div class="sx-out__block"><h4 class="sx-out__h">Coverage of the seven headings</h4><ul class="sx-cover" role="list">${counts
    .map(({ c, n }) => `<li class="${n ? '' : 'is-empty'}"><span class="sx-cover__l" aria-hidden="true">${CATEGORIES[c].letter}</span><span class="sx-cover__name">${CATEGORIES[c].name}</span><span class="sx-cover__n num">${n ? `${n} factor${n === 1 ? '' : 's'}` : 'none yet'}</span></li>`)
    .join('')}</ul></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: the scope is stated, every heading has been considered, and every factor has evidence.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: SteepleState): string {
  const p = prioritized(s);
  return textDoc(`STEEPLE analysis: ${orDash(s.business, 'organization not named')}`, [
    textSection('Scope', [orDash(s.scope)]),
    textSection(
      'Prioritized factors (score = impact x likelihood)',
      p.map((f, i) => `${i + 1}. ${f.text.trim()} [${CATEGORIES[f.category].name}; ${EFFECT_WORDS[f.effect]}; impact ${f.impact}, likelihood ${f.likelihood}, score ${score(f)}: ${BANDS[band(score(f))].name}]${f.evidence.trim() ? `\n   Evidence: ${f.evidence.trim()}` : ''}`),
    ),
    textSection('Reading', [reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: SteepleState): string {
  return toCsv([
    ['Rank', 'Heading', 'Factor', 'Evidence', 'For the business', 'Impact', 'Likelihood', 'Score', 'Priority'],
    ...prioritized(s).map((f, i) => [i + 1, CATEGORIES[f.category].name, f.text.trim(), f.evidence.trim(), EFFECT_WORDS[f.effect], f.impact, f.likelihood, score(f), BANDS[band(score(f))].name]),
  ]);
}

export function fileName(s: SteepleState): string {
  return `${fileSlug(s.business)}-steeple`;
}

export function messages(s: SteepleState, uid: string): Record<string, { check?: string }> {
  return Object.fromEntries(s.factors.map((f) => [`${uid}-${f.id}-text`, { check: factorCheck(f) }]));
}

export function problems(s: SteepleState): string[] {
  const out: string[] = [];
  CAT_ORDER.forEach((c) => s.factors.some((f) => f.category === c && f.text.trim()) || out.push(`no ${CATEGORIES[c].name.toLowerCase()} factor`));
  s.factors.forEach((f) => {
    if (!f.text.trim() || !f.evidence.trim()) out.push(`factor ${f.id} needs text and evidence`);
    if (factorCheck(f)) out.push(`factor ${f.id} trips its own check: ${factorCheck(f)}`);
  });
  return out;
}
