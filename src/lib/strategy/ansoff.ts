/**
 * Ansoff planner. The reader places their own growth options by whether each
 * sells existing or new products to existing or new markets, and adds the
 * method of growth (1.5) and the risk they see. The matrix gives each
 * direction its usual risk; the reader's notes say what is particular to the
 * option. The guide names the Ansoff matrix as a toolkit tool for SL and HL
 * (p. 14); the direction is not the method, and any direction can be pursued
 * by internal growth or by an external method.
 */
import { esc } from '../markup';
import { type Check, count, andList, fileSlug, ident, list, nextId, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { button, checksHtml, field, radios, select, tableRegion } from './ui';

export type Novelty = 'existing' | 'new';
export type Direction = 'penetration' | 'product' | 'market' | 'diversification';
export type Method = 'internal' | 'merger' | 'acquisition' | 'takeover' | 'joint-venture' | 'alliance' | 'franchising' | 'undecided';

export interface AnsoffOption {
  id: string;
  name: string;
  detail: string;
  product: Novelty;
  market: Novelty;
  method: Method;
  risk: string;
}

export interface AnsoffState {
  business: string;
  products: string;
  markets: string;
  options: AnsoffOption[];
}

export const DIRECTIONS: Record<Direction, { name: string; cell: string; risk: number; riskWord: string; note: string; watch: string }> = {
  penetration: {
    name: 'Market penetration',
    cell: 'Existing products, existing markets',
    risk: 1,
    riskWord: 'Lowest',
    note: 'Selling more of what the business already makes to the customers it already serves, by winning share or selling more often.',
    watch: 'A market with little room to grow, price cuts that rivals match, and margins squeezed by the effort to win share.',
  },
  product: {
    name: 'Product development',
    cell: 'New products, existing markets',
    risk: 2,
    riskWord: 'Moderate',
    note: 'New or changed products for customers the business already knows.',
    watch: 'Development costs, products that customers do not want after all, and new products taking sales from existing ones.',
  },
  market: {
    name: 'Market development',
    cell: 'Existing products, new markets',
    risk: 2,
    riskWord: 'Moderate',
    note: 'Existing products sold in new places, to new segments or through new channels.',
    watch: 'Customers the business does not know, rivals already established there, different laws and tastes, and the cost of distribution.',
  },
  diversification: {
    name: 'Diversification',
    cell: 'New products, new markets',
    risk: 3,
    riskWord: 'Highest',
    note: 'New products for new markets, where both are unfamiliar. Related diversification, which builds on skills the business has, is less risky than unrelated diversification.',
    watch: 'Missing skills and knowledge, managers stretched across too much, and the cost of learning a market from nothing.',
  },
};

export const METHODS: Record<Method, string> = {
  internal: 'Internal (organic) growth',
  merger: 'Merger',
  acquisition: 'Acquisition',
  takeover: 'Takeover',
  'joint-venture': 'Joint venture',
  alliance: 'Strategic alliance',
  franchising: 'Franchising',
  undecided: 'Not decided yet',
};

const NOVELTY: Novelty[] = ['existing', 'new'];
const METHOD_IDS = Object.keys(METHODS) as Method[];
export const LIMITS = { options: 10 };
const ORDER: Direction[] = ['penetration', 'product', 'market', 'diversification'];

export function directionOf(o: Pick<AnsoffOption, 'product' | 'market'>): Direction {
  if (o.product === 'existing') return o.market === 'existing' ? 'penetration' : 'market';
  return o.market === 'existing' ? 'product' : 'diversification';
}

/* ---------- Reading saved work ---------- */

export function normalize(raw: unknown): AnsoffState {
  const r = obj(raw);
  const used = new Set<string>();
  return {
    business: str(r.business, 120),
    products: str(r.products, 300),
    markets: str(r.markets, 300),
    options: list(r.options, LIMITS.options).map((o) => {
      const x = obj(o);
      return {
        id: ident(x.id, used, 'o'),
        name: str(x.name, 120),
        detail: str(x.detail, 400),
        product: oneOf(x.product, NOVELTY, 'existing'),
        market: oneOf(x.market, NOVELTY, 'existing'),
        method: oneOf(x.method, METHOD_IDS, 'undecided'),
        risk: str(x.risk, 500),
      };
    }),
  };
}

export function blank(): AnsoffState {
  return { business: '', products: '', markets: '', options: [newOption({ options: [] })] };
}

export function newOption(s: Pick<AnsoffState, 'options'>): AnsoffOption {
  return { id: nextId('o', s.options.map((o) => o.id)), name: '', detail: '', product: 'existing', market: 'existing', method: 'undecided', risk: '' };
}

/* ---------- Analysis ---------- */

/** Options with a name, lowest usual risk first, then in the order entered. */
export function byRisk(s: AnsoffState): AnsoffOption[] {
  return s.options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.name.trim())
    .sort((a, b) => DIRECTIONS[directionOf(a.o)].risk - DIRECTIONS[directionOf(b.o)].risk || ORDER.indexOf(directionOf(a.o)) - ORDER.indexOf(directionOf(b.o)) || a.i - b.i)
    .map(({ o }) => o);
}

export function checks(s: AnsoffState): Check[] {
  const out: Check[] = [];
  const named = s.options.filter((o) => o.name.trim());
  if (!s.products.trim() || !s.markets.trim()) out.push({ level: 'warning', text: 'Say what the business sells now and to whom. "New" only means something against that starting point.' });
  if (named.length < 2) out.push({ level: 'info', text: 'Add at least two options. The matrix is for comparing directions, and one option has nothing to be compared with.' });
  const noRisk = named.filter((o) => !o.risk.trim());
  if (noRisk.length) out.push({ level: 'warning', text: `Name the main risk of ${andList(noRisk.map((o) => `"${o.name.trim()}"`))}. The quadrant gives the usual risk; your note says what is particular to this option.` });
  const dirs = new Set(named.map(directionOf));
  if (named.length >= 3 && dirs.size === 1) out.push({ level: 'info', text: `Every option is ${DIRECTIONS[[...dirs][0]!].name.toLowerCase()}. That may be right, but check that you have not missed options in other directions.` });
  for (const o of named) {
    const d = directionOf(o);
    if (d === 'diversification' && (o.method === 'acquisition' || o.method === 'takeover')) out.push({ level: 'info', text: `"${o.name.trim()}" diversifies by ${METHODS[o.method].toLowerCase()}. Buying a business can bring the missing skills, but it adds the risk of paying too much and of the two cultures clashing (2.5, HL).` });
    if (o.method === 'undecided') out.push({ level: 'info', text: `"${o.name.trim()}": choose a method of growth. The direction says where the business goes; the method (1.5) says how.` });
  }
  return out;
}

export function reading(s: AnsoffState): string {
  const named = byRisk(s);
  if (!named.length) return 'Add options to place them on the matrix.';
  const counts = ORDER.map((d) => ({ d, n: named.filter((o) => directionOf(o) === d).length })).filter((x) => x.n);
  const spread = andList(counts.map((x) => `${count(x.n)} in ${DIRECTIONS[x.d].name.toLowerCase()}`));
  const safest = named[0]!;
  const riskiest = named[named.length - 1]!;
  return `${count(named.length, true)} option${named.length === 1 ? '' : 's'}: ${spread}. ${named.length > 1 ? `The lowest usual risk is "${safest.name.trim()}" (${DIRECTIONS[directionOf(safest)].name.toLowerCase()}); the highest is "${riskiest.name.trim()}" (${DIRECTIONS[directionOf(riskiest)].name.toLowerCase()}).` : ''} Usual risk is not the whole story: a low-risk direction can still be a poor option if the market has no room to grow, and the risk notes say what the matrix cannot.`;
}

export function headline(s: AnsoffState): string {
  const named = byRisk(s);
  if (!named.length) return 'No options yet.';
  return `${count(named.length, true)} growth options placed: ${andList(ORDER.map((d) => ({ d, n: named.filter((o) => directionOf(o) === d).length })).filter((x) => x.n).map((x) => `${count(x.n)} in ${DIRECTIONS[x.d].name.toLowerCase()}`))}.`;
}

/* ---------- HTML ---------- */

/** Where an option sits, as the line under its two choices. */
export function placeHtml(o: Pick<AnsoffOption, 'product' | 'market'>): string {
  const d = directionOf(o);
  return `<span class="sx-place__label">Placed in</span> <strong>${esc(DIRECTIONS[d].name)}</strong> <span class="muted">(usual risk: ${esc(DIRECTIONS[d].riskWord.toLowerCase())})</span>`;
}

function optionRow(o: AnsoffOption, n: number, uid: string): string {
  const id = `${uid}-${o.id}`;
  return `<li class="sx-row" data-row="${esc(o.id)}"><p class="sx-row__code" aria-hidden="true">${n}</p><div class="sx-row__body">${field({
    id: `${id}-name`,
    k: `options.${o.id}.name`,
    label: `Option ${n}`,
    value: o.name,
    maxlength: 120,
  })}${field({ id: `${id}-detail`, k: `options.${o.id}.detail`, label: 'What it involves', value: o.detail, multiline: true, rows: 2, maxlength: 400 })}<div class="sx-grid-2 sx-novelty">${radios({
    name: `${id}-product`,
    k: `options.${o.id}.product`,
    legend: 'Products',
    value: o.product,
    options: [
      { value: 'existing', label: 'Existing' },
      { value: 'new', label: 'New' },
    ],
  })}${radios({
    name: `${id}-market`,
    k: `options.${o.id}.market`,
    legend: 'Markets',
    value: o.market,
    options: [
      { value: 'existing', label: 'Existing' },
      { value: 'new', label: 'New' },
    ],
  })}</div><p class="sx-place" data-place="${esc(o.id)}">${placeHtml(o)}</p>${select({
    id: `${id}-method`,
    k: `options.${o.id}.method`,
    label: 'Method of growth',
    value: o.method,
    options: METHOD_IDS.map((m) => ({ value: m, label: METHODS[m] })),
  })}${field({ id: `${id}-risk`, k: `options.${o.id}.risk`, label: 'The main risk, in your words', value: o.risk, multiline: true, rows: 2, maxlength: 500 })}<div class="sx-row__meta">${button({
    act: 'up',
    label: 'Move up',
    aria: `Move option ${n} up`,
    data: { id: o.id },
    disabled: n === 1,
  })}${button({ act: 'remove', label: 'Remove', aria: `Remove option ${n}: ${o.name.trim() || 'untitled'}`, data: { id: o.id }, cls: 'sx-row__remove' })}</div></div></li>`;
}

export function editorHtml(s: AnsoffState, uid: string): string {
  return `<div class="sx-context sx-context--three">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-products`,
    k: 'products',
    label: 'What it sells now',
    value: s.products,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}${field({ id: `${uid}-markets`, k: 'markets', label: 'To whom, and where', value: s.markets, multiline: true, rows: 2, maxlength: 300 })}</div><fieldset class="sx-q"><legend>Growth options</legend><p class="sx-q__prompt">For each option, decide whether the product and the market are existing or new for this business, and say why in "What it involves".</p><ol class="sx-rows" role="list">${s.options
    .map((o, i) => optionRow(o, i + 1, uid))
    .join('')}</ol>${button({ act: 'add', label: 'Add an option', cls: 'sx-add', disabled: s.options.length >= LIMITS.options })}</fieldset>`;
}

export function outputsHtml(s: AnsoffState): string {
  const named = s.options.filter((o) => o.name.trim());
  const num = new Map(s.options.map((o, i) => [o.id, i + 1]));
  const cell = (d: Direction) => {
    const here = named.filter((o) => directionOf(o) === d);
    return `<div class="sx-ansoff__cell sx-ansoff__cell--${d}"><p class="sx-ansoff__name">${esc(DIRECTIONS[d].name)}</p><p class="sx-ansoff__risk"><span class="sx-band ${d === 'diversification' ? 'sx-band--high' : d === 'penetration' ? 'sx-band--good' : 'sx-band--medium'}">${esc(DIRECTIONS[d].riskWord)} risk</span></p>${
      here.length ? `<ol class="sx-ansoff__chips" role="list">${here.map((o) => `<li><span class="sx-ansoff__no num">${num.get(o.id)}</span> ${esc(o.name.trim())}</li>`).join('')}</ol>` : '<p class="small muted">No option here.</p>'
    }</div>`;
  };
  const matrix = `<div class="sx-ansoff" role="group" aria-label="Your options on the Ansoff matrix"><span class="sx-ansoff__axis sx-ansoff__axis--x" aria-hidden="true"><span>Existing products</span><span>New products</span></span><span class="sx-ansoff__axis sx-ansoff__axis--y" aria-hidden="true"><span>Existing markets</span><span>New markets</span></span>${cell('penetration')}${cell('product')}${cell('market')}${cell('diversification')}</div>`;
  const ladder = byRisk(s);
  const table = ladder.length
    ? tableRegion(
        'Options by usual risk',
        `<caption class="sr-only">Your options from the lowest usual risk to the highest, with the method and your risk notes</caption><thead><tr><th scope="col" class="n">No.</th><th scope="col">Option</th><th scope="col">Direction</th><th scope="col">Usual risk</th><th scope="col">Method</th><th scope="col">Your risk note</th></tr></thead><tbody>${ladder
          .map(
            (o) =>
              `<tr><td class="n num">${num.get(o.id)}</td><th scope="row">${esc(o.name.trim())}${o.detail.trim() ? `<span class="sx-swot__ev">${esc(o.detail.trim())}</span>` : ''}</th><td>${esc(DIRECTIONS[directionOf(o)].name)}</td><td>${esc(DIRECTIONS[directionOf(o)].riskWord)}</td><td>${esc(METHODS[o.method])}</td><td class="small">${esc(orDash(o.risk, 'No note yet.'))}</td></tr>`,
          )
          .join('')}</tbody>`,
      )
    : '';
  const notes = `<dl class="sx-qnotes">${ORDER.map((d) => `<div><dt>${esc(DIRECTIONS[d].name)} <span class="muted">(${esc(DIRECTIONS[d].cell.toLowerCase())}; usual risk ${esc(DIRECTIONS[d].riskWord.toLowerCase())})</span></dt><dd>${esc(DIRECTIONS[d].note)} <strong>Watch for:</strong> ${esc(DIRECTIONS[d].watch)}</dd></div>`).join('')}</dl>`;
  return `<div class="sx-out__block"><h4 class="sx-out__h">Your options on the matrix</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. Sells now: ${esc(orDash(s.products, 'not given').replace(/\.$/, ''))}. To whom: ${esc(orDash(s.markets, 'not given').replace(/\.$/, ''))}.</p>${matrix}<p class="sx-reading" data-reading>${esc(reading(s))}</p></div><div class="sx-out__block"><h4 class="sx-out__h">From the lowest usual risk to the highest</h4>${table}</div><div class="sx-out__block"><h4 class="sx-out__h">Risk notes for each quadrant</h4>${notes}<p class="small muted">Direction is not method: any direction can be pursued by internal growth or by one of the external methods in 1.5, which are mergers and acquisitions, takeovers, joint ventures, strategic alliances and franchising.</p></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s), 'No problems found: every option has a method and a risk note.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: AnsoffState): string {
  return textDoc(`Ansoff planner: ${orDash(s.business, 'organization not named')}`, [
    textSection('Starting point', [`Sells now: ${orDash(s.products)}`, `To: ${orDash(s.markets)}`]),
    textSection(
      'Options, lowest usual risk first',
      byRisk(s).map((o) => `- ${o.name.trim()}: ${DIRECTIONS[directionOf(o)].name} (${o.product} products, ${o.market} markets; usual risk ${DIRECTIONS[directionOf(o)].riskWord.toLowerCase()}). Method: ${METHODS[o.method]}.${o.detail.trim() ? `\n  ${o.detail.trim()}` : ''}${o.risk.trim() ? `\n  Main risk: ${o.risk.trim()}` : ''}`),
    ),
    textSection('Reading', [reading(s)]),
    textSection('Checks', checks(s).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: AnsoffState): string {
  return toCsv([
    ['Option', 'What it involves', 'Products', 'Markets', 'Direction', 'Usual risk', 'Method', 'Main risk'],
    ...byRisk(s).map((o) => [o.name.trim(), o.detail.trim(), o.product, o.market, DIRECTIONS[directionOf(o)].name, DIRECTIONS[directionOf(o)].riskWord, METHODS[o.method], o.risk.trim()]),
  ]);
}

export function fileName(s: AnsoffState): string {
  return `${fileSlug(s.business)}-ansoff`;
}

export function problems(s: AnsoffState): string[] {
  const out: string[] = [];
  if (s.options.length < 4) out.push('the worked example should have options in at least four rows');
  if (new Set(s.options.map(directionOf)).size < 4) out.push('the worked example should use all four directions');
  s.options.forEach((o) => (o.name.trim() && o.risk.trim() && o.method !== 'undecided') || out.push(`option ${o.id} needs a name, a method and a risk note`));
  return out;
}
