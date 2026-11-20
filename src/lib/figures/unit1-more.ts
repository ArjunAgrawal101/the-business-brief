/**
 * Unit 1 diagrams a reader can explore, switch or compare: how a business
 * changes form as it grows (1.2, 1.5), the types of business organization
 * side by side (1.2), where stakeholders gain and lose from a decision (1.4),
 * and the triple bottom line (1.3). Each has a layout for phones.
 */
import type { DiagramDef, DiagramPanel, DiagramPart, DiagramState } from '../diagrams';
import { C, NW, TONES, badge, charsFor, circle, frame, line, para, part, rect, text, wrap, type RenderOpts, type Tone } from './kit';

/** Lines of wrapped text and the height they take. */
function lines(s: string, width: number, size: number, lh = size * 1.3): { lines: string[]; h: number } {
  const l = wrap(s, charsFor(width, size));
  return { lines: l, h: l.length * lh };
}

/* ------------------------------------------------------------------ */
/* How a business changes as it grows (1.2, 1.5)                        */
/* ------------------------------------------------------------------ */

interface Stage {
  id: string;
  year: string;
  form: string;
  owners: string;
  liability: 'Unlimited' | 'Limited';
  growth: string;
  external: boolean | null;
  text: string;
  code: string;
}

const GROWTH: Stage[] = [
  {
    id: 'sole-trader',
    year: 'Year 1',
    form: 'Sole trader',
    owners: 'One owner',
    liability: 'Unlimited',
    growth: 'her own savings',
    external: null,
    text: 'Ana Silva roasts coffee and sells it from a market stall, using $6,000 of her own savings. She takes every decision and keeps all the profit, but has unlimited liability: if the business cannot pay its debts, her own savings and possessions can be claimed.',
    code: '1.2',
  },
  {
    id: 'partnership',
    year: 'Year 3',
    form: 'Partnership',
    owners: 'Two partners',
    liability: 'Unlimited',
    growth: 'a first café',
    external: false,
    text: 'A partner joins with $20,000 and the lease of a café. The partners share the profit and the decisions under a deed of partnership, and both still have unlimited liability. Opening the café is internal (organic) growth: the business grows from its own resources.',
    code: '1.2',
  },
  {
    id: 'private-company',
    year: 'Year 5',
    form: 'Privately held company',
    owners: 'Family and an investor',
    liability: 'Limited',
    growth: 'two more cafés',
    external: false,
    text: 'The partners form a company. It is a separate legal entity, so the owners have limited liability. They sell shares privately to family and a business angel, and add a bank loan and retained profit to open two more cafés: more internal growth.',
    code: '1.5',
  },
  {
    id: 'franchise',
    year: 'Year 8',
    form: 'Privately held company',
    owners: 'Family and an investor',
    liability: 'Limited',
    growth: 'franchising',
    external: true,
    text: 'Other owners pay a fee and a share of their sales to open cafés under the Stonebridge brand. Franchising is external growth: the business spreads faster, using the franchisees’ capital, but has less control over each café.',
    code: '1.5',
  },
  {
    id: 'public-company',
    year: 'Year 11',
    form: 'Publicly held company',
    owners: 'Many shareholders',
    liability: 'Limited',
    growth: 'a roasting plant',
    external: false,
    text: 'To pay for a large roasting plant, the company sells shares to the public on a stock exchange. It raises far more finance, but must publish its accounts, can be taken over, and is now owned by many shareholders and run by directors: ownership and control are divorced.',
    code: '1.2',
  },
  {
    id: 'acquisition',
    year: 'Year 14',
    form: 'Publicly held company',
    owners: 'Many shareholders',
    liability: 'Limited',
    growth: 'an acquisition and a joint venture',
    external: true,
    text: 'It buys a coffee importer, which secures its supply of beans, and sets up a joint venture with a partner abroad to open cafés in a new country. Both are external growth: faster than building from scratch, but costly and harder to manage.',
    code: '1.5',
  },
];

const growthWords = (s: Stage) => (s.external === null ? `Start-up with ${s.growth}` : `${s.external ? 'External' : 'Internal'} growth: ${s.growth}`);

const GROWTH_PARTS: DiagramPart[] = GROWTH.map((s) => ({ id: s.id, label: `${s.year}: ${s.form}. ${growthWords(s)}`, text: s.text, code: s.code }));

const GROWTH_DESC = `How a fictional business, Stonebridge Coffee, changes as it grows over fourteen years. ${GROWTH.map((s) => `${s.year}: ${s.form.toLowerCase()}, owned by ${s.owners.toLowerCase()}, with ${s.liability.toLowerCase()} liability; ${growthWords(s).charAt(0).toLowerCase()}${growthWords(s).slice(1)}.`).join(' ')} Liability changes from unlimited to limited when the business becomes a company, the owners change from one person to many shareholders, and growth moves from internal steps to external methods such as franchising, an acquisition and a joint venture.`;

function growthTimeline(id: string, o?: RenderOpts): string {
  const W = 720;
  const H = 430;
  const p: string[] = [];
  const x0 = 136;
  const col = (W - x0) / GROWTH.length;
  const cx = (i: number) => x0 + col * (i + 0.5);
  const rows: Array<[string, number]> = [
    ['Legal form', 58],
    ['Owners', 118],
    ['Liability', 170],
  ];
  rows.forEach(([name, y]) => p.push(text(0, y + 4, name, { size: 13, weight: 700, fill: C.slate, label: true })));
  // Merge the cells where nothing changes, so a change of form stands out.
  const runs = (key: (s: Stage) => string) => {
    const out: Array<{ from: number; to: number; label: string }> = [];
    GROWTH.forEach((s, i) => {
      const last = out[out.length - 1];
      if (last && last.label === key(s)) last.to = i;
      else out.push({ from: i, to: i, label: key(s) });
    });
    return out;
  };
  for (const run of runs((s) => s.form)) {
    const x = x0 + col * run.from + 4;
    const w = col * (run.to - run.from + 1) - 8;
    p.push(rect(x, 34, w, 46, { fill: C.ink, rx: 3 }));
    const l = wrap(run.label, Math.floor(w / 7.4));
    p.push(text(x + w / 2, 34 + 23 - ((l.length - 1) * 16) / 2 + 5, l.join('\n'), { size: 13, weight: 700, fill: C.white, anchor: 'middle', lh: 16 }));
  }
  for (const run of runs((s) => s.owners)) {
    const x = x0 + col * run.from + 4;
    const w = col * (run.to - run.from + 1) - 8;
    p.push(rect(x, 98, w, 40, { fill: C.paper, stroke: C.rule, sw: 1, rx: 3 }));
    const l = wrap(run.label, Math.floor(w / 7));
    p.push(text(x + w / 2, 98 + 20 - ((l.length - 1) * 15) / 2 + 5, l.join('\n'), { size: 13, weight: 600, fill: C.ink, anchor: 'middle', lh: 15 }));
  }
  for (const run of runs((s) => s.liability)) {
    const x = x0 + col * run.from + 4;
    const w = col * (run.to - run.from + 1) - 8;
    const lim = run.label === 'Limited';
    p.push(rect(x, 156, w, 28, { fill: lim ? C.greenWash : C.signalWash, stroke: lim ? C.green : C.signal, sw: 1.2, rx: 3 }));
    p.push(text(x + w / 2, 175, `${run.label} liability`, { size: 13, weight: 700, fill: lim ? C.greenText : C.signalText, anchor: 'middle' }));
  }
  // The timeline.
  const ty = 226;
  p.push(line(id, x0 - 4, ty, W - 4, ty, { sw: 2, arrow: 'end' }));
  p.push(text(0, ty + 4, 'Time', { size: 13, weight: 700, fill: C.slate, label: true }));
  p.push(text(0, 286, 'Growth', { size: 13, weight: 700, fill: C.slate, label: true }));
  GROWTH.forEach((s, i) => {
    const x = cx(i);
    const inner: string[] = [];
    inner.push(badge(x, ty, i + 1, { rad: 13 }));
    inner.push(text(x, ty + 32, s.year, { size: 13, weight: 700, fill: C.ink, anchor: 'middle' }));
    const tone: Tone = s.external === null ? 'slate' : s.external ? 'gold' : 'cobalt';
    const t = TONES[tone];
    const g = lines(s.growth, col - 14, 12.5, 15.5);
    const gy = 262;
    const gh = Math.max(64, g.h + 30);
    inner.push(rect(x - col / 2 + 5, gy, col - 10, gh, { fill: s.external ? t.wash : C.white, stroke: t.line, sw: 1.2, rx: 3, dash: s.external === null ? '4 3' : undefined }));
    inner.push(text(x, gy + 20, s.external === null ? 'Start' : s.external ? 'External' : 'Internal', { size: 13, weight: 700, fill: t.text, anchor: 'middle', label: true }));
    inner.push(text(x, gy + 38, g.lines.join('\n'), { size: 13, fill: C.body, anchor: 'middle', lh: 15.5 }));
    p.push(part(o, s.id, GROWTH_PARTS[i]!.label, [x - col / 2 + 2, 30, col - 4, gy + gh - 26], inner.join('')));
  });
  p.push(para(0, H - 40, 'Each step brings more finance and protection, at the price of more formality, more disclosure and shared control. Internal growth uses the business’s own resources; external growth joins with or buys other businesses.', 118, { size: 13, italic: true, fill: C.slate, lh: 16 }));
  p.push(text(W, 16, 'Stonebridge Coffee: a fictional business', { size: 13, italic: true, fill: C.slate, anchor: 'end' }));
  return frame({ id, w: W, h: H, title: 'How a business changes as it grows', alt: GROWTH_ALT, desc: GROWTH_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

const GROWTH_ALT = 'A timeline of six stages in the growth of a fictional coffee business, from sole trader to publicly held company, showing its legal form, owners, liability and method of growth at each stage.';

function growthTimelineNarrow(id: string, o?: RenderOpts): string {
  const p: string[] = [];
  let y = 8;
  p.push(text(0, y + 12, 'Stonebridge Coffee (fictional)', { size: 14, italic: true, fill: C.slate }));
  y += 30;
  const lx = 16;
  const tx = 42;
  const tw = NW - tx;
  const startY = y;
  GROWTH.forEach((s, i) => {
    const inner: string[] = [];
    const top = y;
    inner.push(badge(lx, y + 10, i + 1, { rad: 14 }));
    inner.push(text(tx, y + 15, `${s.year} · ${s.form}`, { size: 15, weight: 700, fill: C.ink }));
    y += 24;
    const ownersLine = lines(`${s.owners}; ${s.liability.toLowerCase()} liability`, tw, 14, 18);
    inner.push(text(tx, y + 14, ownersLine.lines.join('\n'), { size: 14, fill: s.liability === 'Limited' ? C.greenText : C.signalText, lh: 18 }));
    y += ownersLine.h + 4;
    const tone: Tone = s.external === null ? 'slate' : s.external ? 'gold' : 'cobalt';
    const growth = lines(growthWords(s), tw - 16, 14, 18);
    inner.push(rect(tx, y, tw, growth.h + 10, { fill: s.external ? TONES.gold.wash : C.white, stroke: TONES[tone].line, sw: 1.2, rx: 3, dash: s.external === null ? '4 3' : undefined }));
    inner.push(text(tx + 8, y + 18, growth.lines.join('\n'), { size: 14, weight: 600, fill: TONES[tone].text, lh: 18 }));
    y += growth.h + 22;
    p.push(part(o, s.id, GROWTH_PARTS[i]!.label, [0, top - 4, NW, y - top - 6], inner.join('')));
  });
  // The line runs behind the badges, so it goes first.
  p.unshift(line(id, lx, startY + 24, lx, y - 30, { stroke: C.rule, sw: 2 }));
  const note = lines('Liability turns limited when the business becomes a company; growth moves from internal steps to external methods.', NW, 14, 18);
  p.push(text(0, y + 6, note.lines.join('\n'), { size: 14, italic: true, fill: C.slate, lh: 18 }));
  const H = y + note.h + 10;
  return frame({ id, w: NW, h: H, title: 'How a business changes as it grows', alt: GROWTH_ALT, desc: GROWTH_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

/* ------------------------------------------------------------------ */
/* Types of business organization, two at a time (1.2)                  */
/* ------------------------------------------------------------------ */

interface Entity {
  id: string;
  label: string;
  /** How the owners are drawn: a number of people, or a named group. */
  owners: { count: number; label: string; kind: 'people' | 'crowd' | 'state' | 'none' };
  limited: boolean | null;
  business: string;
  surplus: string;
  facts: Array<[string, string]>;
}

const ENTITIES: Entity[] = [
  {
    id: 'sole-trader',
    label: 'Sole trader',
    owners: { count: 1, label: 'One owner', kind: 'people' },
    limited: false,
    business: 'The business and the owner are one in law',
    surplus: 'The owner keeps all the profit',
    facts: [
      ['Owned by', 'One person, who may employ staff'],
      ['Liability', 'Unlimited: the owner’s personal assets are at risk'],
      ['Finance', 'Personal funds, loans, overdrafts, trade credit'],
      ['Profit goes to', 'The owner'],
      ['Control', 'The owner decides everything'],
      ['Accounts', 'Private, apart from tax returns'],
    ],
  },
  {
    id: 'partnership',
    label: 'Partnership',
    owners: { count: 3, label: 'Two or more partners', kind: 'people' },
    limited: false,
    business: 'Not a separate legal entity',
    surplus: 'Shared by the partners, as their deed says',
    facts: [
      ['Owned by', 'Two or more partners'],
      ['Liability', 'Usually unlimited, even for a fellow partner’s debts'],
      ['Finance', 'The partners’ capital, loans, overdrafts'],
      ['Profit goes to', 'The partners, as the deed of partnership sets out'],
      ['Control', 'Shared by the partners'],
      ['Accounts', 'Usually private'],
    ],
  },
  {
    id: 'privately-held',
    label: 'Privately held company',
    owners: { count: 4, label: 'Shareholders chosen by the owners', kind: 'people' },
    limited: true,
    business: 'A separate legal entity',
    surplus: 'Dividends to shareholders, or retained',
    facts: [
      ['Owned by', 'Shareholders; shares are not sold to the public'],
      ['Liability', 'Limited: shareholders can lose only what they paid for their shares'],
      ['Finance', 'Share capital from chosen investors, loans, retained profit'],
      ['Profit goes to', 'Dividends to shareholders, or kept in the business'],
      ['Control', 'Directors appointed by the shareholders, often the same people'],
      ['Accounts', 'Usually filed publicly'],
    ],
  },
  {
    id: 'publicly-held',
    label: 'Publicly held company',
    owners: { count: 0, label: 'Many shareholders, via a stock exchange', kind: 'crowd' },
    limited: true,
    business: 'A separate legal entity',
    surplus: 'Dividends to shareholders, or retained',
    facts: [
      ['Owned by', 'Anyone who buys its shares on a stock exchange'],
      ['Liability', 'Limited'],
      ['Finance', 'Large sums from selling shares to the public, loans, retained profit'],
      ['Profit goes to', 'Dividends to shareholders, or kept in the business'],
      ['Control', 'Directors and managers: ownership and control are divorced'],
      ['Accounts', 'Published in full and independently audited'],
    ],
  },
  {
    id: 'social-company',
    label: 'Private sector company (social enterprise)',
    owners: { count: 3, label: 'Private owners', kind: 'people' },
    limited: true,
    business: 'A company with a social purpose first',
    surplus: 'Mostly reinvested in the purpose',
    facts: [
      ['Owned by', 'Private owners'],
      ['Liability', 'Limited, as in any company'],
      ['Finance', 'Trading income, owners’ capital, loans, impact investors'],
      ['Profit goes to', 'Mostly back into its social or environmental purpose'],
      ['Control', 'Directors, guided by the mission'],
      ['Accounts', 'As for any company'],
    ],
  },
  {
    id: 'public-sector-company',
    label: 'Public sector company',
    owners: { count: 0, label: 'The government', kind: 'state' },
    limited: null,
    business: 'Owned and run by the state',
    surplus: 'Back into the service, or to the government',
    facts: [
      ['Owned by', 'The government'],
      ['Liability', 'The state stands behind it'],
      ['Finance', 'Trading income and government funds'],
      ['Profit goes to', 'Back into the service, or to the government'],
      ['Control', 'Managers answerable to the government'],
      ['Accounts', 'Reported to the government and the public'],
    ],
  },
  {
    id: 'cooperative',
    label: 'Cooperative',
    owners: { count: 5, label: 'Members: workers, customers or producers', kind: 'people' },
    limited: true,
    business: 'Owned and run by its members',
    surplus: 'Shared among the members, or reinvested',
    facts: [
      ['Owned by', 'Its members: the people who work in it, buy from it or supply it'],
      ['Liability', 'Usually limited'],
      ['Finance', 'Members’ contributions, loans, retained surplus; no shares sold to outsiders'],
      ['Profit goes to', 'The members, usually by how much each traded or worked, or back into the business'],
      ['Control', 'Democratic: normally one member, one vote'],
      ['Accounts', 'Reported to the members'],
    ],
  },
  {
    id: 'ngo',
    label: 'Non-governmental organization (NGO)',
    owners: { count: 0, label: 'No owners: trustees or a board govern it', kind: 'none' },
    limited: null,
    business: 'A non-profit social enterprise',
    surplus: 'All spent on the cause',
    facts: [
      ['Owned by', 'No one takes a share: trustees or a board govern it'],
      ['Liability', 'Depends on how it is registered'],
      ['Finance', 'Donations, grants, some trading income'],
      ['Profit goes to', 'Its cause: no surplus is paid out'],
      ['Control', 'Trustees or a board, independent of government'],
      ['Accounts', 'Reported to donors and regulators, often published'],
    ],
  },
];

const ENTITY_PANELS: DiagramPanel[] = ENTITIES.map((e) => ({ id: e.id, label: e.label, facts: e.facts }));

/** One entity, drawn for a panel about 300 wide: owners above, the business, and where its profit goes. */
function entityPanel(id: string, eid: string): string {
  const e = ENTITIES.find((x) => x.id === eid) ?? ENTITIES[0]!;
  const p: string[] = [];
  const cx = NW / 2;
  // Owners.
  const oy = 34;
  if (e.owners.kind === 'people') {
    const n = e.owners.count;
    const gap = 30;
    for (let i = 0; i < n; i++) {
      const x = cx + (i - (n - 1) / 2) * gap;
      p.push(circle(x, oy - 8, 7, { fill: C.ink }));
      p.push(`<path d="M${(x - 11).toFixed(1)},${oy + 14} Q${x.toFixed(1)},${oy - 6} ${(x + 11).toFixed(1)},${oy + 14} Z" fill="${C.ink}"/>`);
    }
  } else if (e.owners.kind === 'crowd') {
    for (let i = 0; i < 15; i++) {
      const x = cx - 98 + (i % 15) * 14;
      p.push(circle(x, oy + (i % 2 ? 6 : -4), 5, { fill: C.ink }));
    }
  } else if (e.owners.kind === 'state') {
    p.push(`<path d="M${cx - 26},${oy - 2} L${cx},${oy - 18} L${cx + 26},${oy - 2} Z" fill="${C.ink}"/>`);
    p.push(rect(cx - 22, oy, 44, 16, { fill: C.ink }));
  } else {
    p.push(rect(cx - 18, oy - 16, 36, 30, { fill: C.white, stroke: C.slate, sw: 1.4, dash: '4 3', rx: 3 }));
  }
  const ol = lines(e.owners.label, NW - 20, 14, 18);
  p.push(text(cx, oy + 38, ol.lines.join('\n'), { size: 14, weight: 600, fill: C.ink, anchor: 'middle', lh: 18 }));
  const by = oy + 46 + ol.h;
  // The business, with the liability boundary.
  p.push(line(id, cx, by - 2, cx, by + 16, { sw: 1.4, arrow: 'end' }));
  const bl = lines(e.business, NW - 60, 14, 18);
  const bh = bl.h + 22;
  const bTop = by + 22;
  p.push(rect(30, bTop, NW - 60, bh, { fill: C.paper, stroke: C.ink, sw: 1.6, rx: 3 }));
  p.push(text(cx, bTop + 20, bl.lines.join('\n'), { size: 14, weight: 700, fill: C.ink, anchor: 'middle', lh: 18 }));
  if (e.limited !== null) {
    const pad = 10;
    // Unlimited: the line takes in the owners too, so their own assets are inside the risk.
    const top = e.limited ? bTop - pad : 8;
    p.push(rect(30 - pad, top, NW - 60 + pad * 2, bTop + bh + pad - top, { stroke: e.limited ? C.green : C.signal, sw: 1.8, dash: '7 5', rx: 6 }));
  }
  const ly = bTop + bh + 32;
  const liab = e.limited === null ? (e.id === 'ngo' ? 'Liability depends on how it is registered' : 'The state stands behind it') : e.limited ? 'Limited liability: the dashed line holds only the business' : 'Unlimited liability: the dashed line takes in the owners’ own assets';
  const ll = lines(liab, NW, 14, 18);
  p.push(text(cx, ly, ll.lines.join('\n'), { size: 14, weight: 600, fill: e.limited === null ? C.slate : e.limited ? C.greenText : C.signalText, anchor: 'middle', lh: 18 }));
  // Where the surplus goes.
  const sy = ly + ll.h + 8;
  p.push(line(id, cx, sy, cx, sy + 22, { tone: 'gold', sw: 2, arrow: 'end' }));
  const sl = lines(e.surplus, NW - 20, 14, 18);
  p.push(rect(10, sy + 28, NW - 20, sl.h + 16, { fill: C.goldWash, stroke: C.gold, sw: 1, rx: 3 }));
  p.push(text(cx, sy + 48, sl.lines.join('\n'), { size: 14, weight: 600, fill: C.goldText, anchor: 'middle', lh: 18 }));
  const H = sy + 28 + sl.h + 24;
  return frame(
    {
      id,
      w: NW,
      h: H,
      title: e.label,
      alt: `${e.label}: who owns it, its liability and where its profit goes.`,
      desc: `${e.label}. ${e.facts.map(([k, v]) => `${k}: ${v}`).join('. ')}.`,
    },
    p.join(''),
  );
}

/** All eight side by side, for the download and print. */
function entityGrid(id: string): string {
  const cols = 4;
  const cw = NW;
  const parts = ENTITIES.map((e, i) => {
    const svg = entityPanel(`${id}-${i}`, e.id);
    const h = Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)?.[1] ?? 300);
    return { e, svg, h };
  });
  const rowH = [0, 1].map((r) => Math.max(...parts.slice(r * cols, r * cols + cols).map((x) => x.h)) + 64);
  const W = cols * cw + (cols - 1) * 24;
  const H = rowH[0]! + rowH[1]! + 30;
  const body = parts
    .map(({ e, svg }, i) => {
      const x = (i % cols) * (cw + 24);
      const y = Math.floor(i / cols) * rowH[0]! + 20;
      const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title[^>]*>[\s\S]*?<\/title><desc[^>]*>[\s\S]*?<\/desc>/, '');
      const t = wrap(e.label, charsFor(cw, 16));
      return `<g transform="translate(${x} ${y})">${text(cw / 2, 18 - (t.length - 1) * 20, t.join('\n'), { size: 16, weight: 700, serif: true, fill: C.ink, anchor: 'middle', lh: 20 })}<g transform="translate(0 28)">${inner}</g></g>`;
    })
    .join('');
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Types of business organization compared',
      alt: ENTITY_ALT,
      desc: ENTITY_DESC,
    },
    body + text(0, H - 8, 'Dashed line: the edge of the owners’ risk. Limited liability puts only the business inside it; unlimited liability takes in the owners’ own assets.', { size: 14, italic: true, fill: C.slate }),
  );
}

const ENTITY_ALT = 'Eight small diagrams, one for each type of business organization in the guide, showing its owners, its liability and where its profit or surplus goes.';
const ENTITY_DESC = `The types of business organization the guide names, each drawn the same way: its owners above, the business, a dashed line marking the edge of the owners’ risk, and where its profit or surplus goes. ${ENTITIES.map((e) => `${e.label}: ${e.facts.map(([k, v]) => `${k.toLowerCase()} ${v.charAt(0).toLowerCase()}${v.slice(1)}`).join('; ')}.`).join(' ')}`;

/* ------------------------------------------------------------------ */
/* Stakeholders and one decision (1.4)                                  */
/* ------------------------------------------------------------------ */

type Effect = 'gain' | 'lose' | 'mixed';

interface Decision {
  id: string;
  label: string;
  effects: Record<string, [Effect, string]>;
  conflicts: Array<[string, string]>;
  note: string;
}

const HOLDERS: Array<{ id: string; label: string; internal: boolean }> = [
  { id: 'shareholders', label: 'Shareholders', internal: true },
  { id: 'managers', label: 'Managers', internal: true },
  { id: 'employees', label: 'Employees', internal: true },
  { id: 'customers', label: 'Customers', internal: false },
  { id: 'suppliers', label: 'Suppliers', internal: false },
  { id: 'community', label: 'Local community', internal: false },
  { id: 'government', label: 'Government', internal: false },
  { id: 'pressure', label: 'Pressure groups', internal: false },
];

const DECISIONS: Decision[] = [
  {
    id: 'automate',
    label: 'Automate the packing line',
    effects: {
      shareholders: ['gain', 'Lower costs raise profit'],
      managers: ['mixed', 'A cheaper line, but a hard change to lead'],
      employees: ['lose', '30 packing jobs go'],
      customers: ['gain', 'Faster, more reliable orders'],
      suppliers: ['gain', 'Machine makers win an order'],
      community: ['lose', 'Fewer local jobs'],
      government: ['mixed', 'More tax from profit, more people out of work'],
      pressure: ['mixed', 'Less waste, but job losses'],
    },
    conflicts: [
      ['shareholders', 'employees'],
      ['customers', 'community'],
    ],
    note: 'Owners and customers gain from lower costs; employees and the town lose jobs. The conflict is about who bears the cost of efficiency.',
  },
  {
    id: 'relocate',
    label: 'Move the factory to a cheaper region',
    effects: {
      shareholders: ['gain', 'Lower rent and wages raise profit'],
      managers: ['mixed', 'Lower costs, but staff to recruit'],
      employees: ['lose', 'Most cannot move with the jobs'],
      customers: ['mixed', 'Lower prices, longer deliveries'],
      suppliers: ['lose', 'Local suppliers lose the contract'],
      community: ['lose', 'The old town loses jobs and spending'],
      government: ['mixed', 'Jobs move from one region to another'],
      pressure: ['lose', 'More lorry miles'],
    },
    conflicts: [
      ['shareholders', 'community'],
      ['shareholders', 'suppliers'],
    ],
    note: 'The owners gain and the old town loses: a conflict between profit and the business’s place in its community.',
  },
  {
    id: 'recycled',
    label: 'Switch to recycled packaging',
    effects: {
      shareholders: ['mixed', 'Higher costs now, a better brand later'],
      managers: ['gain', 'A stronger brand to sell'],
      employees: ['gain', 'Pride in the work'],
      customers: ['mixed', 'A greener product at a higher price'],
      suppliers: ['mixed', 'New suppliers win; old ones lose'],
      community: ['gain', 'Less waste to landfill'],
      government: ['gain', 'Helps meet waste targets'],
      pressure: ['gain', 'A goal of their campaign met'],
    },
    conflicts: [['shareholders', 'pressure']],
    note: 'Most groups gain, but shareholders and customers pay more for now: a trade-off between short-term profit and corporate social responsibility.',
  },
];

const DECISION_STATES: DiagramState[] = DECISIONS.map((d) => ({ id: d.id, label: d.label, note: d.note }));

const EFFECT_WORDS: Record<Effect, string> = { gain: 'Gains', lose: 'Loses', mixed: 'Mixed' };
const EFFECT_TONE: Record<Effect, Tone> = { gain: 'green', lose: 'signal', mixed: 'gold' };
const EFFECT_MARK: Record<Effect, string> = { gain: '+', lose: '−', mixed: '±' };

function stakeholderState(id: string, sid: string, narrow: boolean): string {
  const d = DECISIONS.find((x) => x.id === sid) ?? DECISIONS[0]!;
  const p: string[] = [];
  const desc = `Redwick Packaging, a fictional manufacturer, considers a decision: ${d.label.toLowerCase()}. ${HOLDERS.map((h) => `${h.label}: ${EFFECT_WORDS[d.effects[h.id]![0]].toLowerCase()}, ${d.effects[h.id]![1].toLowerCase()}`).join('. ')}. Conflicts: ${d.conflicts.map(([a, b]) => `${HOLDERS.find((h) => h.id === a)!.label.toLowerCase()} against ${HOLDERS.find((h) => h.id === b)!.label.toLowerCase()}`).join('; ')}. ${d.note}`;
  if (!narrow) {
    const W = 720;
    const rowH = 44;
    p.push(rect(0, 0, W, 44, { fill: C.ink, rx: 3 }));
    p.push(text(16, 28, d.label, { size: 16, weight: 700, serif: true, fill: C.white }));
    let y = 70;
    const rowY: Record<string, number> = {};
    for (const group of [true, false]) {
      p.push(text(0, y, group ? 'Internal stakeholders' : 'External stakeholders', { size: 13, weight: 700, fill: C.goldText, label: true }));
      y += 10;
      for (const h of HOLDERS.filter((x) => x.internal === group)) {
        const [eff, why] = d.effects[h.id]!;
        const t = TONES[EFFECT_TONE[eff]];
        p.push(rect(0, y, 560, rowH - 6, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
        p.push(rect(0, y, 34, rowH - 6, { fill: t.wash, stroke: t.line, sw: 1.2, rx: 3 }));
        p.push(text(17, y + 26, EFFECT_MARK[eff], { size: 18, weight: 700, fill: t.text, anchor: 'middle' }));
        p.push(text(46, y + 24, `${h.label}: ${EFFECT_WORDS[eff].toLowerCase()}`, { size: 13.5, weight: 700, fill: C.ink }));
        p.push(text(250, y + 24, why, { size: 13, fill: C.body }));
        rowY[h.id] = y + (rowH - 6) / 2;
        y += rowH;
      }
      y += 18;
    }
    // Each conflict is an arc on the right joining the two groups.
    d.conflicts.forEach(([a, b], k) => {
      const ya = rowY[a]!;
      const yb = rowY[b]!;
      const reach = 600 + k * 40;
      p.push(`<path d="M562,${ya.toFixed(1)} C${reach + 30},${ya.toFixed(1)} ${reach + 30},${yb.toFixed(1)} 562,${yb.toFixed(1)}" fill="none" stroke="${C.signal}" stroke-width="2" stroke-dasharray="6 5"/>`);
      p.push(circle(562, ya, 3.5, { fill: C.signal }));
      p.push(circle(562, yb, 3.5, { fill: C.signal }));
    });
    const H = y + 24;
    p.push(text(0, H - 10, '+ gains, − loses, ± mixed. Dashed red arcs join the groups in conflict. Redwick Packaging is fictional.', { size: 13, italic: true, fill: C.slate }));
    return frame({ id, w: W, h: H, title: `Stakeholders and one decision: ${d.label.toLowerCase()}`, alt: STAKE_ALT, desc }, p.join(''));
  }
  const head = lines(d.label, NW - 24, 15, 19);
  p.push(rect(0, 0, NW, head.h + 20, { fill: C.ink, rx: 3 }));
  p.push(text(NW / 2, 23, head.lines.join('\n'), { size: 15, weight: 700, serif: true, fill: C.white, anchor: 'middle', lh: 19 }));
  let y = head.h + 34;
  for (const group of [true, false]) {
    p.push(text(0, y, group ? 'Internal stakeholders' : 'External stakeholders', { size: 14, weight: 700, fill: C.goldText, label: true }));
    y += 12;
    for (const h of HOLDERS.filter((x) => x.internal === group)) {
      const [eff, why] = d.effects[h.id]!;
      const t = TONES[EFFECT_TONE[eff]];
      const w = lines(why, NW - 46, 14, 18);
      const bh = 24 + w.h + 6;
      const inConflict = d.conflicts.some(([a, b]) => a === h.id || b === h.id);
      p.push(rect(0, y, NW, bh, { fill: C.white, stroke: t.line, sw: inConflict ? 2.2 : 1.2, rx: 3, dash: inConflict ? '6 4' : undefined }));
      p.push(rect(0, y, 30, bh, { fill: t.wash, stroke: t.line, sw: 1.2, rx: 3 }));
      p.push(text(15, y + 22, EFFECT_MARK[eff], { size: 17, weight: 700, fill: t.text, anchor: 'middle' }));
      p.push(text(40, y + 19, `${h.label}: ${EFFECT_WORDS[eff].toLowerCase()}`, { size: 14, weight: 700, fill: C.ink }));
      p.push(text(40, y + 38, w.lines.join('\n'), { size: 14, fill: C.body, lh: 18 }));
      y += bh + 6;
    }
    y += 16;
  }
  const c = lines(`Conflicts: ${d.conflicts.map(([a, b]) => `${HOLDERS.find((h) => h.id === a)!.label} against ${HOLDERS.find((h) => h.id === b)!.label.toLowerCase()}`).join('; ')}. Dashed boxes are in conflict.`, NW, 14, 18);
  p.push(text(0, y + 4, c.lines.join('\n'), { size: 14, weight: 600, fill: C.signalText, lh: 18 }));
  const H = y + c.h + 8;
  return frame({ id, w: NW, h: H, title: `Stakeholders and one decision: ${d.label.toLowerCase()}`, alt: STAKE_ALT, desc }, p.join(''));
}

const STAKE_ALT = 'Eight stakeholder groups and one decision, each marked as gaining, losing or mixed, with the main conflicts between them joined by dashed arcs.';

/* ------------------------------------------------------------------ */
/* The triple bottom line (1.3)                                         */
/* ------------------------------------------------------------------ */

const TBL_PARTS: DiagramPart[] = [
  { id: 'people', label: 'People', text: 'The social bottom line: how the business treats its employees, its customers and the communities it touches, from fair pay and safe work to honest marketing.', code: '1.4' },
  { id: 'planet', label: 'Planet', text: 'The environmental bottom line: the resources it uses and the waste and emissions it leaves, and whether its products can be reused, repaired or recycled.', code: '5.3' },
  { id: 'profit', label: 'Profit', text: 'The economic bottom line: whether the business earns enough to survive, reward its owners and invest. Without it, nothing else lasts.', code: '1.3' },
  { id: 'bearable', label: 'Bearable', text: 'People and planet without profit: good for society and the environment, but it depends on someone paying for it, so it may not last.', code: '1.3' },
  { id: 'equitable', label: 'Equitable', text: 'People and profit without the planet: fair to people and profitable, but storing up environmental costs for later.', code: '1.3' },
  { id: 'viable', label: 'Viable', text: 'Planet and profit without people: efficient and green, but at a cost to workers or communities that can turn stakeholders against it.', code: '1.4' },
  { id: 'sustainable', label: 'Sustainable', text: 'All three at once: the aim of corporate social responsibility. Few decisions reach it fully; the diagram helps to see which bottom line a decision neglects.', code: '1.3' },
];

const TBL_DESC = 'Three overlapping circles for the triple bottom line, the idea that a business should be judged on people, planet and profit, not on profit alone. People is the social bottom line: employees, customers and communities. Planet is the environmental bottom line: resources, waste and emissions. Profit is the economic bottom line: whether the business earns enough to survive and invest. Where two circles overlap without the third: people and planet is bearable, people and profit is equitable, and planet and profit is viable. Where all three overlap the business is sustainable, the aim of corporate social responsibility. Around the circles, the stakeholders each bottom line matters most to: employees, customers and local communities for people; future generations, the government and pressure groups for the planet; shareholders and lenders for profit. The guide does not name the triple bottom line as a syllabus term; it suggests it as an inquiry in unit 3, and it is a way to weigh corporate social responsibility (1.3).';

const TBL_ALT = 'A Venn diagram of three circles, people, planet and profit, with their overlaps labelled bearable, equitable and viable, and sustainable where all three meet.';

function tbl(id: string, o: RenderOpts | undefined, narrow: boolean): string {
  const W = narrow ? NW : 720;
  const R = narrow ? 76 : 116;
  // Three equal circles on an equilateral triangle with sides of R: the centroid is the sustainable centre.
  const cx = narrow ? NW / 2 : 196;
  const cy = (narrow ? 8 : 18) + R * 1.289;
  const centres = {
    people: [cx - R / 2, cy - R * 0.2887],
    planet: [cx + R / 2, cy - R * 0.2887],
    profit: [cx, cy + R * 0.5774],
  } as const;
  const tones: Record<'people' | 'planet' | 'profit', Tone> = { people: 'cobalt', planet: 'green', profit: 'gold' };
  const p: string[] = [];
  const size = narrow ? 14 : 13.5;
  for (const k of ['people', 'planet', 'profit'] as const) {
    const [x, y] = centres[k];
    p.push(circle(x, y, R, { fill: TONES[tones[k]].wash, stroke: TONES[tones[k]].line, sw: 1.6, opacity: 0.8 }));
  }
  /** A point at distance t (in radii) from the centre, towards a direction given as an angle in degrees (0 is right, 90 down). */
  const at = (deg: number, t: number): [number, number] => [cx + Math.cos((deg * Math.PI) / 180) * t * R, cy + Math.sin((deg * Math.PI) / 180) * t * R];
  const label = (pid: string, [x, y]: [number, number], s: string, opts: { size: number; weight: number; fill: string }) => {
    const w = s.length * opts.size * 0.6 + 12;
    p.push(part(o, pid, TBL_PARTS.find((t) => t.id === pid)!.label, [x - w / 2, y - opts.size, w, opts.size + 10], text(x, y + opts.size * 0.35, s, { ...opts, anchor: 'middle' })));
  };
  const big = narrow ? 16 : 17;
  label('people', at(210, 1.0), 'People', { size: big, weight: 700, fill: C.cobaltText });
  label('planet', at(330, 1.0), 'Planet', { size: big, weight: 700, fill: C.greenText });
  label('profit', at(90, 1.05), 'Profit', { size: big, weight: 700, fill: C.goldText });
  label('bearable', at(270, 0.62), 'Bearable', { size, weight: 600, fill: C.ink });
  label('equitable', at(150, 0.64), 'Equitable', { size, weight: 600, fill: C.ink });
  label('viable', at(30, 0.64), 'Viable', { size, weight: 600, fill: C.ink });
  const sw = (narrow ? 14 : 13.5) * 0.6 * 11 + 16;
  p.push(
    part(o, 'sustainable', 'Sustainable', [cx - sw / 2, cy - 13, sw, 26], rect(cx - sw / 2, cy - 13, sw, 26, { fill: C.ink, rx: 3 }) + text(cx, cy + 5, 'Sustainable', { size, weight: 700, fill: C.white, anchor: 'middle' })),
  );
  // Who each bottom line matters to.
  const who: Array<[string, string, Tone]> = [
    ['People', 'Employees, customers, local communities', 'cobalt'],
    ['Planet', 'Future generations, government, pressure groups', 'green'],
    ['Profit', 'Shareholders, lenders, managers', 'gold'],
  ];
  if (!narrow) {
    const bx = 430;
    p.push(text(bx, 30, 'Who each matters to', { size: 13, weight: 700, fill: C.slate, label: true }));
    who.forEach(([n, s, tone], i) => {
      const y = 46 + i * 84;
      p.push(rect(bx, y, W - bx, 70, { fill: C.white, stroke: TONES[tone].line, sw: 1.2, rx: 3 }));
      p.push(text(bx + 12, y + 24, n, { size: 14, weight: 700, fill: TONES[tone].text }));
      p.push(para(bx + 12, y + 44, s, 36, { size: 13, fill: C.body, lh: 16 }));
    });
    const H = Math.max(cy + R * 1.577 + 20, 46 + 3 * 84) + 44;
    p.push(para(0, H - 30, 'The triple bottom line is not a syllabus term: the guide suggests it as an inquiry in unit 3. It is a way to weigh corporate social responsibility.', 112, { size: 13, italic: true, fill: C.slate, lh: 16 }));
    return frame({ id, w: W, h: H, title: 'The triple bottom line', alt: TBL_ALT, desc: TBL_DESC, interactive: Boolean(o?.link) }, p.join(''));
  }
  let y = cy + R * 1.577 + 30;
  p.push(text(0, y, 'Who each matters to', { size: 14, weight: 700, fill: C.slate, label: true }));
  y += 24;
  who.forEach(([n, s, tone]) => {
    const l = lines(`${n}: ${s}`, NW - 14, 14, 18);
    p.push(rect(0, y - 14, 5, l.h + 2, { fill: TONES[tone].line }));
    p.push(text(12, y, l.lines.join('\n'), { size: 14, fill: C.body, lh: 18 }));
    y += l.h + 10;
  });
  return frame({ id, w: W, h: y, title: 'The triple bottom line', alt: TBL_ALT, desc: TBL_DESC, interactive: Boolean(o?.link) }, p.join(''));
}

/* ------------------------------------------------------------------ */
/* The register                                                         */
/* ------------------------------------------------------------------ */

export const UNIT1_MORE: Record<string, DiagramDef> = {
  'growth-timeline': {
    title: 'How a business changes as it grows',
    caption: 'Legal form, owners, liability and method of growth for a fictional business over fourteen years.',
    syllabus: ['1.2', '1.5'],
    level: 'SL/HL',
    group: 'unit-1',
    fictional: true,
    alt: GROWTH_ALT,
    parts: GROWTH_PARTS,
    howTo: 'Point to a stage, or tab to it, to read what changed; select it to open its subtopic.',
    render: growthTimeline,
    narrow: growthTimelineNarrow,
  },
  'entity-comparison': {
    title: 'Types of business organization compared',
    caption: 'Owners, liability and where the profit goes, for each type the guide names: choose two to set side by side.',
    syllabus: ['1.2'],
    level: 'SL/HL',
    group: 'unit-1',
    alt: ENTITY_ALT,
    howTo: 'Choose two types to compare; the facts that differ are marked.',
    ix: { kind: 'compare', legend: 'Compare two types of organization', panels: ENTITY_PANELS, draw: (id, pid) => entityPanel(id, pid), first: ['sole-trader', 'privately-held'] },
    render: entityGrid,
  },
  'stakeholder-conflict': {
    title: 'Stakeholders and one decision',
    caption: 'Who gains and who loses from three decisions at a fictional manufacturer, and where they conflict.',
    syllabus: ['1.4'],
    level: 'SL/HL',
    group: 'unit-1',
    fictional: true,
    alt: STAKE_ALT,
    howTo: 'Choose a decision to see who gains, who loses and where they conflict.',
    ix: { kind: 'switch', legend: 'The decision', states: DECISION_STATES, draw: (id, sid, narrow) => stakeholderState(id, sid, narrow) },
    render: (id) => stakeholderState(id, 'automate', false),
    narrow: (id) => stakeholderState(id, 'automate', true),
  },
  'triple-bottom-line': {
    title: 'The triple bottom line',
    caption: 'People, planet and profit, the overlaps between them, and the stakeholders each matters to most.',
    syllabus: ['1.3', '1.2', '1.4'],
    level: 'SL/HL',
    group: 'unit-1',
    alt: TBL_ALT,
    parts: TBL_PARTS,
    howTo: 'Point to a circle or an overlap, or tab to it, to read what it means; select it to open its subtopic.',
    render: (id, o) => tbl(id, o, false),
    narrow: (id, o) => tbl(id, o, true),
  },
};
