/**
 * Unit 3 diagrams a reader can expand or change: choosing a source of
 * finance (3.2), profitability and liquidity at a glance (3.5), profit and
 * cash month by month (3.7) and two investment projects under three methods
 * (3.8). The live ones draw from src/lib/figures/live.ts, with the
 * arithmetic in src/lib/figure-models.ts.
 */
import type { DiagramDef, LiveInput, TreeNode } from '../diagrams';
import { CASH_DEFAULTS, PROJECTS, TIDEWATER } from '../figure-models';
import { C, NW, charsFor, esc, frame, line, rect, text, wrap } from './kit';
import { LIVE, defaults } from './live';

/* ------------------------------------------------------------------ */
/* Choosing a source of finance (3.2): a tree to expand and collapse    */
/* ------------------------------------------------------------------ */

const opt = (id: string, label: string, note: string, term: string): TreeNode => ({ id, label, note, kind: 'option', href: `/glossary/${term}/` });

export const FINANCE_TREE: TreeNode = {
  id: 'purpose',
  kind: 'question',
  label: 'What is the money for?',
  children: [
    {
      id: 'short',
      kind: 'answer',
      label: 'Day-to-day spending, or a short gap in cash',
      note: 'Revenue expenditure: match it with short-term finance.',
      children: [
        opt('overdraft', 'Overdraft', 'Spend beyond the bank balance up to a limit: flexible, but the interest is high and the bank can withdraw it.', 'overdraft'),
        opt('trade-credit', 'Trade credit', 'Pay suppliers later, often 30 to 90 days: no interest, but a discount for paying early may be lost.', 'trade-credit'),
      ],
    },
    {
      id: 'long',
      kind: 'answer',
      label: 'A long-term asset, such as machinery, or expansion',
      note: 'Capital expenditure: match it with long-term finance.',
      children: [
        {
          id: 'within',
          kind: 'question',
          label: 'Can the business pay for it from within?',
          children: [
            {
              id: 'within-yes',
              kind: 'answer',
              label: 'Yes',
              note: 'Internal sources: no interest, and no one else gains a say.',
              children: [
                opt('retained-profit', 'Retained profit', 'Profit kept in the business rather than paid to the owners: cheap, but it may not be enough, and owners give up dividends.', 'retained-profit'),
                opt('sale-of-assets', 'Sale of assets', 'Selling what the business no longer needs: quick cash, but only once.', 'sale-of-assets'),
                opt('personal-funds', 'Personal funds', 'A sole trader’s own savings: no cost and no one to answer to, but limited and at the owner’s risk.', 'personal-funds'),
              ],
            },
            {
              id: 'within-no',
              kind: 'answer',
              label: 'No: it must come from outside',
              children: [
                {
                  id: 'control',
                  kind: 'question',
                  label: 'Will the owners share ownership and control?',
                  children: [
                    {
                      id: 'control-yes',
                      kind: 'answer',
                      label: 'Yes',
                      note: 'Equity: no interest or repayment, but new owners share the profit and the say.',
                      children: [
                        opt('share-capital', 'Share capital', 'Selling shares, for a company only: large sums that never need repaying, at the cost of control and dividends.', 'share-capital'),
                        opt('business-angel', 'Business angels', 'Wealthy individuals who invest in small, promising firms for a share, often with advice and contacts.', 'business-angel'),
                      ],
                    },
                    {
                      id: 'control-no',
                      kind: 'answer',
                      label: 'No: the owners keep control',
                      children: [
                        {
                          id: 'own',
                          kind: 'question',
                          label: 'Does the business need to own the asset?',
                          children: [
                            {
                              id: 'own-no',
                              kind: 'answer',
                              label: 'No: using it is enough',
                              children: [opt('leasing', 'Leasing', 'Paying to use an asset owned by someone else: no large sum up front and repairs are often included, but it costs more over time.', 'leasing')],
                            },
                            {
                              id: 'own-yes',
                              kind: 'answer',
                              label: 'Yes',
                              children: [
                                {
                                  id: 'bank',
                                  kind: 'question',
                                  label: 'Can it borrow from a bank?',
                                  children: [
                                    {
                                      id: 'bank-yes',
                                      kind: 'answer',
                                      label: 'Yes',
                                      children: [opt('loan-capital', 'Loan capital', 'A loan repaid with interest over an agreed term, usually against security: the owners keep control, but the repayments are due whatever happens.', 'loan-capital')],
                                    },
                                    {
                                      id: 'bank-no',
                                      kind: 'answer',
                                      label: 'No: too small, too new or no security',
                                      children: [
                                        opt('microfinance', 'Microfinance providers', 'Small loans for people and small firms that banks will not serve: they open finance to the excluded, though rates can be high.', 'microfinance-provider'),
                                        opt('crowdfunding', 'Crowdfunding', 'Many people each give a little online, for rewards, a share or interest: it also tests demand, but the plan becomes public and may not reach its target.', 'crowdfunding'),
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** Every node of a tree, depth first, with its depth. */
export function treeRows(t: TreeNode, depth = 0): Array<{ n: TreeNode; depth: number }> {
  return [{ n: t, depth }, ...(t.children ?? []).flatMap((c) => treeRows(c, depth + 1))];
}

const TREE_DESC = `A decision tree for choosing a source of finance. ${treeRows(FINANCE_TREE)
  .map(({ n }) => (n.kind === 'question' ? `Question: ${n.label}` : n.kind === 'answer' ? `Answer: ${n.label}${n.note ? `. ${n.note}` : ''}` : `${n.label}: ${n.note}`))
  .join(' ')} The tree is a way to think a decision through, not a rule: real decisions also weigh the cost, the risk, the amount and how quickly the money is needed.`;
const TREE_ALT = 'A decision tree that leads from the purpose of the money, through whether it can be found inside the business and whether the owners will share control, to the sources of finance that suit.';

/** The whole tree as one drawing, indented by depth: the download and the printed page. */
function financeTree(id: string, narrow: boolean): string {
  const W = narrow ? NW : 720;
  const step = narrow ? 14 : 30;
  const size = narrow ? 14 : 13;
  const lh = size * 1.3;
  const p: string[] = [];
  let y = 0;
  const rows = treeRows(FINANCE_TREE);
  const centres: Array<{ depth: number; y: number; x: number }> = [];
  for (const { n, depth } of rows) {
    const x = depth * step;
    const w = W - x;
    if (n.kind === 'question') {
      const l = wrap(n.label, charsFor(w - 24, size + 1));
      const h = l.length * lh + 16;
      p.push(rect(x, y, w, h, { fill: C.ink, rx: 3 }));
      p.push(text(x + 12, y + 8 + size + 1, l.join('\n'), { size: size + 1, weight: 700, fill: C.white, lh, serif: true }));
      centres.push({ depth, y: y + h / 2, x });
      y += h + 8;
    } else if (n.kind === 'answer') {
      const l = wrap(n.label, charsFor(w - 20, size));
      const nl = n.note ? wrap(n.note, charsFor(w - 20, size)) : [];
      const h = (l.length + nl.length) * lh + 14;
      p.push(rect(x, y, w, h, { fill: C.goldWash, stroke: C.gold, sw: 1, rx: 3 }));
      p.push(text(x + 10, y + 6 + size, l.join('\n'), { size, weight: 700, fill: C.goldText, lh }));
      if (nl.length) p.push(text(x + 10, y + 6 + size + l.length * lh, nl.join('\n'), { size, italic: true, fill: C.body, lh }));
      centres.push({ depth, y: y + h / 2, x });
      y += h + 6;
    } else {
      const head = `${n.label}:`;
      const l = wrap(`${head} ${n.note ?? ''}`, charsFor(w - 20, size));
      const h = l.length * lh + 12;
      p.push(rect(x, y, w, h, { fill: C.white, stroke: C.ink, sw: 1.1, rx: 3 }));
      // The source's name in bold, then its trade-off, as one block of text.
      const first = l[0]!.startsWith(head) ? l[0]!.slice(head.length) : l[0]!;
      const tx = (x + 10).toFixed(1);
      p.push(
        `<text x="${tx}" y="${(y + 5 + size).toFixed(1)}" font-size="${size}" fill="${C.body}"><tspan font-weight="700" fill="${C.ink}">${esc(head)}</tspan>${esc(first)}` +
          l
            .slice(1)
            .map((t) => `<tspan x="${tx}" dy="${lh.toFixed(1)}">${esc(t)}</tspan>`)
            .join('') +
          '</text>',
      );
      centres.push({ depth, y: y + h / 2, x });
      y += h + 6;
    }
  }
  // Connectors from each node to its parent's left edge.
  const lines: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const me = centres[i]!;
    let j = i - 1;
    while (j >= 0 && centres[j]!.depth >= me.depth) j--;
    if (j < 0) continue;
    const par = centres[j]!;
    const lx = par.x + step / 2;
    lines.push(line(id, lx, par.y + 10, lx, me.y, { stroke: C.rule, sw: 1.4 }));
    lines.push(line(id, lx, me.y, me.x, me.y, { stroke: C.rule, sw: 1.4 }));
  }
  const H = y + 30;
  const foot = text(2, H - 8, 'A way to think the choice through, not a rule.', { size: narrow ? 14 : 13, italic: true, fill: C.slate });
  return frame({ id, w: W, h: H, title: 'Choosing a source of finance', alt: TREE_ALT, desc: TREE_DESC }, lines.join('') + p.join('') + foot);
}

/* ------------------------------------------------------------------ */
/* Live diagrams: inputs                                                */
/* ------------------------------------------------------------------ */

const CASH_INPUTS: LiveInput[] = [
  {
    key: 'customerCredit',
    label: 'Customers pay after',
    min: 0,
    max: 3,
    step: 1,
    value: CASH_DEFAULTS.customerCredit,
    options: [
      { value: 0, label: 'Cash on delivery' },
      { value: 1, label: '1 month' },
      { value: 2, label: '2 months' },
      { value: 3, label: '3 months' },
    ],
  },
  {
    key: 'supplierCredit',
    label: 'Suppliers are paid after',
    min: 0,
    max: 2,
    step: 1,
    value: CASH_DEFAULTS.supplierCredit,
    options: [
      { value: 0, label: 'At once' },
      { value: 1, label: '1 month' },
      { value: 2, label: '2 months' },
    ],
  },
  { key: 'opening', label: 'Cash at the start', min: 0, max: 50000, step: 500, value: CASH_DEFAULTS.opening, prefix: '$' },
  { key: 'overdraft', label: 'Overdraft limit', min: 0, max: 50000, step: 500, value: CASH_DEFAULTS.overdraft, prefix: '$' },
];

const B = TIDEWATER.b;
const RATIO_INPUTS: LiveInput[] = [
  { key: 'salesRevenue', label: 'Sales revenue', min: 0, max: 100000, step: 1, value: B.salesRevenue, prefix: '$', suffix: '000', group: 'Profit or loss, 2026' },
  { key: 'costOfSales', label: 'Cost of sales', min: 0, max: 100000, step: 1, value: B.costOfSales, prefix: '$', suffix: '000', group: 'Profit or loss, 2026' },
  { key: 'expenses', label: 'Expenses', min: 0, max: 100000, step: 1, value: B.expenses, prefix: '$', suffix: '000', group: 'Profit or loss, 2026' },
  { key: 'nonCurrentLiabilities', label: 'Non-current liabilities', min: 0, max: 100000, step: 1, value: B.nonCurrentLiabilities, prefix: '$', suffix: '000', group: 'Capital employed, 2026' },
  { key: 'equity', label: 'Equity', min: 0, max: 100000, step: 1, value: B.equity, prefix: '$', suffix: '000', group: 'Capital employed, 2026' },
  { key: 'currentAssets', label: 'Current assets', min: 0, max: 100000, step: 1, value: B.currentAssets, prefix: '$', suffix: '000', group: 'Current assets and liabilities, 2026' },
  { key: 'stock', label: 'of which stock', min: 0, max: 100000, step: 1, value: B.stock, prefix: '$', suffix: '000', group: 'Current assets and liabilities, 2026' },
  { key: 'currentLiabilities', label: 'Current liabilities', min: 0, max: 100000, step: 1, value: B.currentLiabilities, prefix: '$', suffix: '000', group: 'Current assets and liabilities, 2026' },
];

const projectInputs = (k: 'a' | 'b', i: number): LiveInput[] => {
  const pr = PROJECTS[i]!;
  const group = pr.label;
  return [
    { key: `${k}Cost`, label: 'Cost', min: 1, max: 100000, step: 1, value: pr.capitalCost, prefix: '$', suffix: '000', group },
    ...pr.returns.map((r, y) => ({ key: `${k}${y + 1}`, label: `Year ${y + 1}`, min: 0, max: 100000, step: 1, value: r, prefix: '$', suffix: '000', group })),
  ];
};

const INVEST_INPUTS: LiveInput[] = [
  ...projectInputs('a', 0),
  ...projectInputs('b', 1),
  {
    key: 'rate',
    label: 'Discount rate for NPV',
    min: 4,
    max: 20,
    step: 1,
    value: 10,
    group: 'Net present value (HL)',
    options: [4, 6, 8, 10, 20].map((r) => ({ value: r, label: `${r}%` })),
  },
];

/* ------------------------------------------------------------------ */
/* The register                                                         */
/* ------------------------------------------------------------------ */

export const UNIT3_MORE: Record<string, DiagramDef> = {
  'finance-decision-tree': {
    title: 'Choosing a source of finance',
    caption: 'A decision tree from the purpose of the money to the sources that suit it, with the trade-off of each.',
    syllabus: ['3.2'],
    level: 'SL/HL',
    group: 'unit-3',
    alt: TREE_ALT,
    howTo: 'Open or close each question to follow one path; each source opens its glossary entry.',
    ix: { kind: 'tree', tree: FINANCE_TREE },
    render: (id) => financeTree(id, false),
  },
  'ratio-dashboard': {
    title: 'Profitability and liquidity at a glance',
    caption: 'Five ratios for a fictional retailer in two years: change the second year’s figures and watch the ratios move.',
    syllabus: ['3.5'],
    level: 'SL/HL',
    group: 'unit-3',
    fictional: true,
    alt: LIVE.ratios.alt,
    howTo: 'Change the 2026 figures; the ratios, the chart and the reading follow.',
    ix: { kind: 'live', model: 'ratios', inputs: RATIO_INPUTS },
    render: (id) => LIVE.ratios.draw(id, defaults(RATIO_INPUTS), false),
    narrow: (id) => LIVE.ratios.draw(id, defaults(RATIO_INPUTS), true),
  },
  'cash-flow-timeline': {
    title: 'Profit and cash, month by month',
    caption: 'A profitable new business can still run out of cash: change the credit terms and see when the money arrives.',
    syllabus: ['3.7'],
    level: 'SL/HL',
    group: 'unit-3',
    fictional: true,
    alt: LIVE.cash.alt,
    howTo: 'Change when customers pay and when suppliers are paid; the balances, the chart and the reading follow.',
    ix: { kind: 'live', model: 'cash', inputs: CASH_INPUTS },
    render: (id) => LIVE.cash.draw(id, defaults(CASH_INPUTS), false),
    narrow: (id) => LIVE.cash.draw(id, defaults(CASH_INPUTS), true),
  },
  'investment-compare': {
    title: 'Two projects, three methods',
    caption: 'Payback, the average rate of return and NPV (HL) can rank the same two projects differently: change the figures and see when they agree.',
    syllabus: ['3.8'],
    level: 'SL/HL',
    group: 'unit-3',
    fictional: true,
    alt: LIVE.invest.alt,
    howTo: 'Change either project’s cost or yearly returns, or the discount rate; the chart and the table follow.',
    ix: { kind: 'live', model: 'invest', inputs: INVEST_INPUTS },
    render: (id) => LIVE.invest.draw(id, defaults(INVEST_INPUTS), false),
    narrow: (id) => LIVE.invest.draw(id, defaults(INVEST_INPUTS), true),
  },
};
