/**
 * Unit 3 diagrams: finance and accounts. Line names follow the guide's
 * statement layouts (pp. 59 to 63); every figure is fictional and computed
 * here, so the totals always agree.
 */
import type { DiagramDef } from '../diagrams';
import { C, TONES, arrowPath, axes, box, circle, fictionNote, frame, legend, line, num, para, plot, rect, sx, sy, text, type Axes, type Tone } from './kit';

/** Accounts style: negatives in brackets. */
const acc = (v: number) => (v < 0 ? `(${num(-v)})` : num(v));

/* ---------- Capital and revenue expenditure ---------- */
function capexRevex(id: string): string {
  const W = 720;
  const H = 300;
  const p: string[] = [];
  const card = (x: number, title: string, tone: Tone, what: string, ex: string, where: string) => {
    const t = TONES[tone];
    p.push(rect(x, 20, 340, 262, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 20, 340, 46, { fill: t.wash, rx: 3 }));
    p.push(text(x + 16, 50, title, { size: 16, weight: 700, serif: true, fill: t.text }));
    p.push(para(x + 16, 92, what, 48, { size: 12.5, fill: C.body }));
    p.push(text(x + 16, 150, 'Examples', { size: 10.5, weight: 700, fill: C.slate, label: true }));
    p.push(para(x + 16, 168, ex, 48, { size: 12, fill: C.body }));
    p.push(text(x + 16, 218, 'In the accounts', { size: 10.5, weight: 700, fill: C.slate, label: true }));
    p.push(para(x + 16, 236, where, 48, { size: 12, fill: C.body }));
  };
  card(10, 'Capital expenditure', 'cobalt', 'Spending on assets that will be used for more than a year.', 'Machinery, vehicles, buildings, computer systems.', 'A non-current asset on the statement of financial position, spread over its life by depreciation.');
  card(370, 'Revenue expenditure', 'gold', 'Spending on the day-to-day running of the business, used up within the year.', 'Wages, rent, materials, electricity, advertising.', 'Cost of sales or expenses on the statement of profit or loss.');
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Capital and revenue expenditure',
      desc: 'Two cards. Capital expenditure is spending on assets used for more than a year, such as machinery, vehicles, buildings and computer systems; it appears as a non-current asset on the statement of financial position and is spread over its life by depreciation. Revenue expenditure is spending on day-to-day running, used up within the year, such as wages, rent, materials, electricity and advertising; it appears as cost of sales or expenses on the statement of profit or loss.',
    },
    p.join(''),
  );
}

/* ---------- Sources of finance ---------- */
function sources(id: string): string {
  const W = 720;
  const H = 400;
  const p: string[] = [];
  p.push(rect(10, 20, 220, 300, { fill: C.goldWash, rx: 4 }));
  p.push(text(26, 48, 'Internal sources', { size: 15, weight: 700, serif: true, fill: C.goldText }));
  p.push(text(26, 66, 'From within the business', { size: 11.5, fill: C.slate }));
  [['Personal funds', 'For sole traders: the owner’s savings'], ['Retained profit', 'Profit kept in the business'], ['Sale of assets', 'Selling what it no longer needs']].forEach(([n, s], i) =>
    p.push(box(26, 84 + i * 76, 188, 62, n!, { tone: 'gold', style: 'outline', size: 13, sub: s })),
  );
  p.push(rect(242, 20, 468, 300, { fill: C.cobaltWash, rx: 4 }));
  p.push(text(258, 48, 'External sources', { size: 15, weight: 700, serif: true, fill: C.cobaltText }));
  p.push(text(258, 66, 'From outside the business', { size: 11.5, fill: C.slate }));
  p.push(text(258, 92, 'Usually short term', { size: 10.5, weight: 700, fill: C.slate, label: true }));
  [['Overdrafts', 'Spending beyond the bank balance'], ['Trade credit', 'Paying suppliers later']].forEach(([n, s], i) => p.push(box(258 + i * 222, 102, 210, 50, n!, { tone: 'cobalt', style: 'outline', size: 12.5, sub: s, subSize: 10.5 })));
  p.push(text(258, 180, 'Usually medium to long term', { size: 10.5, weight: 700, fill: C.slate, label: true }));
  const longs: Array<[string, string]> = [
    ['Share capital', 'Selling shares in the company'],
    ['Loan capital', 'Borrowing, repaid with interest'],
    ['Leasing', 'Renting assets instead of buying'],
    ['Crowdfunding', 'Small sums from many people online'],
    ['Microfinance providers', 'Small loans, small firms'],
    ['Business angels', 'Wealthy investors who take a stake'],
  ];
  longs.forEach(([n, s], i) => p.push(box(258 + (i % 3) * 148, 190 + Math.floor(i / 3) * 62, 140, 54, n, { tone: 'cobalt', style: 'outline', size: 12, sub: s, subSize: 10 })));
  p.push(para(10, 346, 'Which source suits depends on the purpose and the amount, its cost, how quickly it is needed, the risk, and how much ownership and control the owners will give up. A source’s term depends on the deal agreed.', 118, { size: 11.5, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Sources of finance',
      desc: 'Internal sources come from within the business: personal funds, the owner’s savings, for sole traders; retained profit; and the sale of assets. External sources come from outside. Usually short term: overdrafts, spending beyond the bank balance, and trade credit, paying suppliers later. Usually medium to long term: share capital, loan capital, leasing, crowdfunding, microfinance providers and business angels. Which source suits depends on the purpose and amount, the cost, how quickly it is needed, the risk and how much control the owners will give up.',
    },
    p.join(''),
  );
}

/* ---------- Cost and revenue lines ---------- */
const CR = { fc: 20000, vc: 15, price: 25, max: 4000 };

function costTypes(id: string): string {
  const W = 720;
  const H = 330;
  const p: string[] = [];
  const panel = (i: number, title: string, f: (q: number) => number, tone: Tone, note: string) => {
    const a: Axes = { x: 30 + i * 176, y: 44, w: 130, h: 150, x0: 0, x1: CR.max, y0: 0, y1: 100000 };
    p.push(text(a.x - 4, 24, title, { size: 13, weight: 700, serif: true, fill: TONES[tone].text }));
    p.push(axes(id, a, { xLabel: 'Output', yLabel: '' }));
    p.push(plot(a, [[0, f(0)], [CR.max, f(CR.max)]], { stroke: TONES[tone].line, sw: 2.4 }));
    p.push(para(a.x - 4, 240, note, 26, { size: 11, fill: C.body }));
  };
  panel(0, 'Fixed costs', () => CR.fc, 'slate', `Do not change with output in the short run: rent, salaries. Here $${num(CR.fc)}.`);
  panel(1, 'Variable costs', (q) => CR.vc * q, 'gold', `Rise with each unit made: materials, packaging. Here $${CR.vc} a unit.`);
  panel(2, 'Total costs', (q) => CR.fc + CR.vc * q, 'ink', 'Fixed plus variable costs. They start at the fixed costs.');
  panel(3, 'Total revenue', (q) => CR.price * q, 'cobalt', `Price × quantity sold. Here $${CR.price} a unit.`);
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Costs and revenue as output changes',
      desc: `Four small charts against output, using fictional figures. Fixed costs, such as rent and salaries, stay at $${num(CR.fc)} whatever the output in the short run. Variable costs, such as materials and packaging, rise by $${CR.vc} with each unit. Total costs are fixed plus variable costs, so they start at $${num(CR.fc)} and rise by $${CR.vc} a unit. Total revenue is price times quantity sold, rising by $${CR.price} a unit from zero. Costs can also be direct, traced to one product, or indirect overheads shared across products.`,
    },
    p.join(''),
  );
}

/* ---------- Statement of profit or loss as a waterfall ---------- */
export const PL = { salesRevenue: 500, costOfSales: 300, expenses: 120, interest: 10, taxRate: 0.2, dividends: 20 };

export function profitOrLoss(d = PL) {
  const grossProfit = d.salesRevenue - d.costOfSales;
  const pbit = grossProfit - d.expenses;
  const pbt = pbit - d.interest;
  const tax = Math.round(pbt * d.taxRate * 100) / 100;
  const profitForPeriod = pbt - tax;
  const retained = profitForPeriod - d.dividends;
  return { grossProfit, pbit, pbt, tax, profitForPeriod, retained };
}

function plWaterfall(id: string): string {
  const W = 720;
  const H = 420;
  const r = profitOrLoss();
  const rows: Array<{ label: string; v: number; kind: 'total' | 'minus'; from: number }> = [
    { label: 'Sales revenue', v: PL.salesRevenue, kind: 'total', from: 0 },
    { label: 'Cost of sales', v: PL.costOfSales, kind: 'minus', from: PL.salesRevenue },
    { label: 'Gross profit', v: r.grossProfit, kind: 'total', from: 0 },
    { label: 'Expenses', v: PL.expenses, kind: 'minus', from: r.grossProfit },
    { label: 'Profit before interest and tax', v: r.pbit, kind: 'total', from: 0 },
    { label: 'Interest', v: PL.interest, kind: 'minus', from: r.pbit },
    { label: 'Profit before tax', v: r.pbt, kind: 'total', from: 0 },
    { label: 'Tax', v: r.tax, kind: 'minus', from: r.pbt },
    { label: 'Profit for the period', v: r.profitForPeriod, kind: 'total', from: 0 },
    { label: 'Dividends', v: PL.dividends, kind: 'minus', from: r.profitForPeriod },
    { label: 'Retained profit', v: r.retained, kind: 'total', from: 0 },
  ];
  const a: Axes = { x: 60, y: 40, w: 640, h: 250, x0: 0, x1: rows.length, y0: 0, y1: 560 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: '', yLabel: '$000', yTicks: [0, 100, 200, 300, 400, 500].map((v) => ({ v, label: String(v) })), grid: true }));
  const bw = (a.w / rows.length) * 0.66;
  rows.forEach((row, i) => {
    const x = sx(a, i + 0.5) - bw / 2;
    const top = row.kind === 'total' ? row.v : row.from;
    const bottom = row.kind === 'total' ? 0 : row.from - row.v;
    const fill = row.kind === 'total' ? (i === rows.length - 1 ? C.green : i === 0 ? C.ink : C.ink2) : C.signal;
    p.push(rect(x, sy(a, top), bw, sy(a, bottom) - sy(a, top), { fill, opacity: row.kind === 'minus' ? 0.85 : 1 }));
    p.push(text(x + bw / 2, sy(a, top) - 6, row.kind === 'minus' ? `(${num(row.v)})` : num(row.v), { size: 11.5, weight: 700, fill: row.kind === 'minus' ? C.signalText : C.ink, anchor: 'middle' }));
    if (i < rows.length - 1) {
      const next = rows[i + 1]!;
      const level = row.kind === 'total' ? row.v : row.from - row.v;
      if (next.kind === 'minus' || next.kind === 'total') p.push(line(id, x + bw, sy(a, level), sx(a, i + 1.5) - bw / 2, sy(a, level), { stroke: C.slate, sw: 1, dash: '3 3' }));
    }
    p.push(para(sx(a, i + 0.5), 310, row.label, 11, { size: 10.5, weight: row.kind === 'total' ? 700 : 400, fill: row.kind === 'total' ? C.ink : C.signalText, anchor: 'middle' }));
  });
  p.push(text(20, H - 30, `Tax at ${PL.taxRate * 100}% of profit before tax. Retained profit is kept in the business and adds to retained earnings.`, { size: 11.5, fill: C.slate }));
  p.push(fictionNote(W - 12, H - 10, 'Fictional company, $000, one year.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The statement of profit or loss, line by line',
      desc: `A waterfall chart of a fictional company’s statement of profit or loss, in thousands of dollars. Sales revenue ${PL.salesRevenue}, less cost of sales ${PL.costOfSales}, gives gross profit ${r.grossProfit}. Less expenses ${PL.expenses} gives profit before interest and tax ${r.pbit}. Less interest ${PL.interest} gives profit before tax ${r.pbt}. Less tax ${r.tax}, at ${PL.taxRate * 100}%, gives profit for the period ${r.profitForPeriod}. Less dividends ${PL.dividends} leaves retained profit ${r.retained}, which is kept in the business.`,
    },
    p.join(''),
  );
}

/* ---------- Statement of financial position ---------- */
export const SFP = { nonCurrentAssets: 300, cash: 30, debtors: 50, stock: 70, currentLiabilities: 70, nonCurrentLiabilities: 130, shareCapital: 150 };

export function financialPosition(d = SFP) {
  const currentAssets = d.cash + d.debtors + d.stock;
  const totalAssets = d.nonCurrentAssets + currentAssets;
  const totalLiabilities = d.currentLiabilities + d.nonCurrentLiabilities;
  const netAssets = totalAssets - totalLiabilities;
  const retainedEarnings = netAssets - d.shareCapital;
  return { currentAssets, totalAssets, totalLiabilities, netAssets, retainedEarnings, equity: d.shareCapital + retainedEarnings };
}

function sfp(id: string): string {
  const W = 720;
  const H = 420;
  const f = financialPosition();
  const p: string[] = [];
  const scale = 300 / f.totalAssets;
  const top = 50;
  const block = (x: number, y: number, w: number, v: number, label: string, tone: Tone, solid = false) => {
    const h = v * scale;
    p.push(rect(x, y, w, h - 3, { fill: solid ? TONES[tone].line : TONES[tone].wash, stroke: TONES[tone].line, sw: 1.1, rx: 2 }));
    p.push(text(x + 12, y + 20, label, { size: 12.5, weight: 700, fill: solid ? C.white : TONES[tone].text }));
    p.push(text(x + w - 12, y + 20, num(v), { size: 12.5, weight: 700, fill: solid ? C.white : C.ink, anchor: 'end' }));
    return y + h;
  };
  p.push(text(40, 30, 'What it owns: assets', { size: 13.5, weight: 700, serif: true, fill: C.ink }));
  let y = top;
  y = block(40, y, 280, SFP.nonCurrentAssets, 'Non-current assets', 'ink');
  p.push(para(52, top + 40, 'Property, plant and equipment, less accumulated depreciation', 44, { size: 10.5, fill: C.slate }));
  const caTop = y;
  block(40, y, 280, f.currentAssets, 'Current assets', 'gold');
  p.push(text(52, caTop + 40, `Cash ${SFP.cash}, debtors ${SFP.debtors}, stock ${SFP.stock}`, { size: 10.5, fill: C.slate }));
  p.push(text(180, top + f.totalAssets * scale + 22, `Total assets ${num(f.totalAssets)}`, { size: 12.5, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(text(400, 30, 'How it is financed', { size: 13.5, weight: 700, serif: true, fill: C.ink }));
  y = top;
  y = block(400, y, 280, SFP.currentLiabilities, 'Current liabilities', 'signal');
  const nclTop = y;
  y = block(400, y, 280, SFP.nonCurrentLiabilities, 'Non-current liabilities', 'signal');
  p.push(text(412, nclTop + 40, 'Long-term borrowings', { size: 10.5, fill: C.slate }));
  const eqTop = y;
  block(400, y, 280, f.equity, 'Equity', 'green');
  p.push(text(412, eqTop + 40, `Share capital ${SFP.shareCapital}, retained earnings ${f.retainedEarnings}`, { size: 10.5, fill: C.slate }));
  p.push(text(540, top + f.totalAssets * scale + 22, `Total liabilities ${num(f.totalLiabilities)} + equity ${num(f.equity)}`, { size: 12.5, weight: 700, fill: C.ink, anchor: 'middle' }));
  p.push(rect(40, 380, 640, 32, { fill: C.paper, rx: 3 }));
  p.push(text(56, 401, `Net assets = total assets − total liabilities = ${num(f.totalAssets)} − ${num(f.totalLiabilities)} = ${num(f.netAssets)} = total equity`, { size: 12, weight: 700, fill: C.ink }));
  p.push(fictionNote(W - 12, 30, 'Fictional company, $000.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The statement of financial position, as two balancing columns',
      desc: `Two columns of equal height for a fictional company, in thousands of dollars. What it owns: non-current assets ${SFP.nonCurrentAssets}, property, plant and equipment less accumulated depreciation, and current assets ${f.currentAssets}, made of cash ${SFP.cash}, debtors ${SFP.debtors} and stock ${SFP.stock}; total assets ${f.totalAssets}. How it is financed: current liabilities ${SFP.currentLiabilities}, non-current liabilities ${SFP.nonCurrentLiabilities} in long-term borrowings, and equity ${f.equity}, made of share capital ${SFP.shareCapital} and retained earnings ${f.retainedEarnings}. Net assets, total assets minus total liabilities, are ${f.netAssets}, equal to total equity.`,
    },
    p.join(''),
  );
}

/* ---------- Depreciation ---------- */
export const DEP = { cost: 50000, residual: 5000, years: 5, units: [30000, 25000, 15000, 12000, 8000] };

export function depreciation(d = DEP) {
  const sl = (d.cost - d.residual) / d.years;
  const totalUnits = d.units.reduce((s, v) => s + v, 0);
  const perUnit = (d.cost - d.residual) / totalUnits;
  const nbvSL = [d.cost];
  const nbvUP = [d.cost];
  for (let y = 0; y < d.years; y++) {
    nbvSL.push(nbvSL[y]! - sl);
    nbvUP.push(nbvUP[y]! - perUnit * d.units[y]!);
  }
  return { sl, perUnit, nbvSL, nbvUP, totalUnits };
}

function depreciationChart(id: string): string {
  const W = 700;
  const H = 400;
  const d = depreciation();
  const a: Axes = { x: 80, y: 40, w: 480, h: 260, x0: 0, x1: DEP.years, y0: 0, y1: 50000 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Years', yLabel: 'Net book value ($)', xTicks: [0, 1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) })), yTicks: [0, 10000, 20000, 30000, 40000, 50000].map((v) => ({ v, label: num(v) })), grid: true }));
  p.push(plot(a, d.nbvSL.map((v, i) => [i, v] as [number, number]), { stroke: C.ink, sw: 2.4 }));
  p.push(plot(a, d.nbvUP.map((v, i) => [i, v] as [number, number]), { stroke: C.gold, sw: 2.4 }));
  d.nbvSL.forEach((v, i) => p.push(circle(sx(a, i), sy(a, v), 4, { fill: C.ink })));
  d.nbvUP.forEach((v, i) => p.push(circle(sx(a, i), sy(a, v), 4, { fill: C.gold })));
  p.push(plot(a, [[0, DEP.residual], [DEP.years, DEP.residual]], { stroke: C.slate, sw: 1.2, dash: '5 4' }));
  p.push(text(sx(a, DEP.years) + 8, sy(a, DEP.residual) + 4, `Residual value $${num(DEP.residual)}`, { size: 11.5, fill: C.slate }));
  p.push(legend(sx(a, 1.25), sy(a, 47500), [{ label: `Straight line: $${num(d.sl)} a year`, stroke: C.ink }, { label: `Units of production: $${num(d.perUnit, 2)} a unit`, stroke: C.gold }]));
  p.push(para(574, 150, `Use in units: ${DEP.units.map((u) => num(u / 1000) + 'k').join(', ')}. Heavy early use means more depreciation early.`, 18, { size: 11, fill: C.slate }));
  p.push(text(20, H - 30, `Straight line: (cost − residual value) ÷ years of use = (${num(DEP.cost)} − ${num(DEP.residual)}) ÷ ${DEP.years} = ${num(d.sl)} a year.`, { size: 11, fill: C.body }));
  p.push(text(20, H - 12, `Units of production: (cost − residual value) ÷ total units = ${num(DEP.cost - DEP.residual)} ÷ ${num(d.totalUnits)} = $${num(d.perUnit, 2)} a unit.`, { size: 11, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Straight line and units of production depreciation',
      desc: `Net book value over five years for a fictional machine costing $${num(DEP.cost)} with a residual value of $${num(DEP.residual)}. By the straight line method it loses $${num(d.sl)} a year: ${d.nbvSL.map((v) => num(v)).join(', ')}. By the units of production method it loses $${num(d.perUnit, 2)} for each of the ${num(d.totalUnits)} units it makes, with use of ${DEP.units.map((u) => num(u)).join(', ')} units a year, so its value falls faster early on: ${d.nbvUP.map((v) => num(v)).join(', ')}. Both end at the residual value.`,
    },
    p.join(''),
  );
}

/* ---------- Ratio families ---------- */
function ratios(id: string): string {
  const W = 720;
  const H = 470;
  const p: string[] = [];
  const fam = (x: number, w: number, title: string, sub: string, tone: Tone, rows: Array<[string, string]>, hl = false) => {
    const t = TONES[tone];
    p.push(rect(x, 20, w, 440, { fill: C.white, stroke: t.line, sw: 1.2, rx: 3 }));
    p.push(rect(x, 20, w, 54, { fill: t.wash, rx: 3 }));
    p.push(text(x + 14, 44, title, { size: 15, weight: 700, serif: true, fill: t.text }));
    p.push(text(x + 14, 63, sub, { size: 11, fill: C.slate }));
    if (hl) {
      p.push(rect(x + w - 40, 32, 28, 18, { fill: C.ink, rx: 2 }));
      p.push(text(x + w - 26, 45, 'HL', { size: 10, weight: 700, fill: C.white, anchor: 'middle' }));
    }
    let y = 98;
    for (const [n, f] of rows) {
      p.push(text(x + 14, y, n, { size: 12.5, weight: 700, fill: C.ink }));
      const lines = f.split('\n');
      lines.forEach((l, i) => p.push(text(x + 14, y + 18 + i * 16, l, { size: 11.5, fill: C.body })));
      y += 34 + lines.length * 16;
    }
  };
  fam(10, 230, 'Profitability', 'How well sales turn into profit', 'green', [
    ['Gross profit margin', 'gross profit ÷ sales revenue × 100'],
    ['Profit margin', 'profit before interest and tax\n÷ sales revenue × 100'],
    ['Return on capital employed', 'profit before interest and tax\n÷ capital employed × 100'],
  ]);
  fam(250, 220, 'Liquidity', 'Can it pay its short-term debts?', 'cobalt', [
    ['Current ratio', 'current assets\n÷ current liabilities'],
    ['Acid test (quick) ratio', '(current assets − stock)\n÷ current liabilities'],
  ]);
  fam(480, 230, 'Efficiency', 'How well it uses its resources', 'gold', [
    ['Stock turnover (times)', 'cost of sales ÷ average stock'],
    ['Stock turnover (days)', 'average stock ÷ cost of sales × 365'],
    ['Debtor days', 'debtors ÷ total sales revenue × 365'],
    ['Creditor days', 'creditors ÷ cost of sales × 365'],
    ['Gearing ratio', 'non-current liabilities\n÷ capital employed × 100'],
  ], true);
  p.push(para(264, 300, 'Capital employed = non-current liabilities + equity.', 30, { size: 11.5, weight: 600, fill: C.ink }));
  p.push(para(264, 350, 'Average stock = (opening stock + closing stock) ÷ 2.', 30, { size: 11.5, weight: 600, fill: C.ink }));
  p.push(para(264, 400, 'Formulas as in the guide’s formula list, which students receive in the examination.', 30, { size: 11, italic: true, fill: C.slate }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The ratio families and their formulas',
      desc: 'Three families of ratios with the guide’s formulas. Profitability: gross profit margin is gross profit divided by sales revenue times 100; profit margin is profit before interest and tax divided by sales revenue times 100; return on capital employed is profit before interest and tax divided by capital employed times 100. Liquidity: the current ratio is current assets divided by current liabilities; the acid test ratio is current assets minus stock, divided by current liabilities. Efficiency, for HL: stock turnover in times is cost of sales divided by average stock, or in days average stock divided by cost of sales times 365; debtor days are debtors divided by total sales revenue times 365; creditor days are creditors divided by cost of sales times 365; the gearing ratio is non-current liabilities divided by capital employed times 100. Capital employed is non-current liabilities plus equity, and average stock is opening plus closing stock divided by two.',
    },
    p.join(''),
  );
}

/* ---------- The working capital cycle ---------- */
function workingCapital(id: string): string {
  const W = 700;
  const H = 420;
  const p: string[] = [];
  const cx = 250;
  const cy = 210;
  const R = 150;
  const steps: Array<[string, string]> = [
    ['Cash', 'At the bank'],
    ['Materials bought', 'Often on credit: creditors'],
    ['Production', 'Work in progress'],
    ['Finished goods', 'Stock waiting to sell'],
    ['Sales on credit', 'Customers owe: debtors'],
  ];
  p.push(circle(cx, cy, R, { stroke: C.rule, sw: 1.2, dash: '5 5' }));
  steps.forEach(([n, s], i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    p.push(box(x - 70, y - 26, 140, 52, n, { tone: i === 0 ? 'green' : 'ink', style: i === 0 ? 'solid' : 'outline', size: 13, sub: s, subSize: 10.5 }));
    const a1 = ((-90 + i * 72 + 26) * Math.PI) / 180;
    const a2 = ((-90 + i * 72 + 46) * Math.PI) / 180;
    p.push(arrowPath(id, `M${(cx + R * Math.cos(a1)).toFixed(1)},${(cy + R * Math.sin(a1)).toFixed(1)} A${R},${R} 0 0 1 ${(cx + R * Math.cos(a2)).toFixed(1)},${(cy + R * Math.sin(a2)).toFixed(1)}`, { tone: 'gold', sw: 2.2 }));
  });
  p.push(text(cx, cy - 6, 'The working', { size: 13.5, weight: 700, serif: true, fill: C.ink, anchor: 'middle' }));
  p.push(text(cx, cy + 12, 'capital cycle', { size: 13.5, weight: 700, serif: true, fill: C.ink, anchor: 'middle' }));
  p.push(rect(478, 30, 214, 118, { fill: C.paper, rx: 3 }));
  p.push(text(492, 54, 'Working capital', { size: 13, weight: 700, fill: C.ink }));
  p.push(para(492, 74, '= current assets − current liabilities', 28, { size: 12, fill: C.body }));
  p.push(para(492, 112, 'The cash a business has to keep its operations running.', 30, { size: 11.5, fill: C.slate }));
  p.push(para(478, 206, 'The longer the cycle, the more working capital is tied up. Paying suppliers later, holding less stock and collecting from customers sooner all shorten it.', 34, { size: 11.5, fill: C.body }));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'The working capital cycle',
      desc: 'A loop of five stages: cash is used to buy materials, often on credit from suppliers, the creditors; materials go into production as work in progress; they become finished goods held as stock; the goods are sold, often on credit, so customers owe money as debtors; and when debtors pay, the cash returns. Working capital is current assets minus current liabilities, the cash a business needs to keep running. The longer the cycle, the more working capital is tied up; paying suppliers later, holding less stock and collecting from customers sooner all shorten it.',
    },
    p.join(''),
  );
}

/* ---------- Cash flow forecast ---------- */
export const CFF = { opening: 5000, inflows: [12000, 10000, 16000], outflows: [14000, 15000, 11000], months: ['January', 'February', 'March'] };

export function forecast(d = CFF) {
  const rows: Array<{ opening: number; inflow: number; outflow: number; net: number; closing: number }> = [];
  let open = d.opening;
  d.inflows.forEach((inflow, i) => {
    const outflow = d.outflows[i]!;
    const net = inflow - outflow;
    const closing = open + net;
    rows.push({ opening: open, inflow, outflow, net, closing });
    open = closing;
  });
  return rows;
}

function cashFlow(id: string): string {
  const W = 720;
  const H = 360;
  const rows = forecast();
  const p: string[] = [];
  const lx = 30;
  const colX = [270, 420, 570];
  const labels = ['Opening balance', 'Total cash inflows', 'Total cash outflows', 'Net cash flow', 'Closing balance'];
  const ys = [80, 118, 156, 200, 246];
  CFF.months.forEach((m, i) => p.push(text(colX[i]! + 60, 44, m, { size: 12.5, weight: 700, fill: C.ink, anchor: 'end' })));
  labels.forEach((l, j) => {
    const strong = j === 0 || j >= 3;
    p.push(text(lx, ys[j]!, l, { size: 12.5, weight: strong ? 700 : 400, fill: C.ink }));
    if (j === 3 || j === 4) p.push(line(id, lx, ys[j]! - 22, 640, ys[j]! - 22, { stroke: C.rule, sw: 1 }));
  });
  rows.forEach((r, i) => {
    const x = colX[i]! + 60;
    const vals = [r.opening, r.inflow, -r.outflow, r.net, r.closing];
    vals.forEach((v, j) => {
      const neg = v < 0;
      if (j === 4) p.push(rect(x - 84, ys[j]! - 18, 92, 26, { fill: neg ? C.signalWash : C.greenWash, rx: 2 }));
      p.push(text(x, ys[j]!, j === 2 ? `(${num(r.outflow)})` : acc(v), { size: 12.5, weight: j === 4 || j === 3 ? 700 : 400, fill: neg && j !== 2 ? C.signalText : j === 2 ? C.body : C.ink, anchor: 'end' }));
    });
    if (i < rows.length - 1) p.push(arrowPath(id, `M${x + 6},${ys[4]! - 4} C${x + 52},${ys[4]! - 40} ${x + 60},${ys[0]! + 30} ${colX[i + 1]! + 8},${ys[0]! - 4}`, { tone: 'cobalt', sw: 1.3, dash: '4 4' }));
  });
  p.push(para(lx, 296, 'Each month: opening balance + net cash flow = closing balance, and the closing balance becomes next month’s opening balance. February’s closing balance is negative, so the business would need an overdraft or another way to cover the gap.', 112, { size: 11.5, fill: C.slate }));
  p.push(fictionNote(W - 12, H - 8, 'Fictional figures, $. Negative numbers in brackets.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'A cash flow forecast, month to month',
      desc: `A three-month cash flow forecast in the guide’s layout. ${rows.map((r, i) => `${CFF.months[i]}: opening balance ${acc(r.opening)}, total cash inflows ${num(r.inflow)}, total cash outflows ${num(r.outflow)}, net cash flow ${acc(r.net)}, closing balance ${acc(r.closing)}`).join('. ')}. Each closing balance becomes the next month’s opening balance. February’s closing balance is negative, so the business would need an overdraft or another way to cover the gap.`,
    },
    p.join(''),
  );
}

/* ---------- Investment appraisal: payback and ARR ---------- */
export const PROJECT = { cost: 100, flows: [30, 35, 40, 40, 30] };

export function appraise(d = PROJECT) {
  const cum = [-d.cost];
  d.flows.forEach((f, i) => cum.push(cum[i]! + f));
  const yr = cum.findIndex((v) => v >= 0);
  const payback = yr - 1 + -cum[yr - 1]! / d.flows[yr - 1]!;
  const total = d.flows.reduce((s, v) => s + v, 0);
  const arr = ((total - d.cost) / d.flows.length / d.cost) * 100;
  return { cum, payback, total, arr };
}

/** The discount factors at 10% from the guide's discount table. */
const FACTORS_10 = [0.9091, 0.8264, 0.7513, 0.683, 0.6209];

function payback(id: string): string {
  const W = 720;
  const H = 400;
  const r = appraise();
  const a: Axes = { x: 80, y: 40, w: 490, h: 270, x0: -0.5, x1: 5.5, y0: -110, y1: 90 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Year', yLabel: 'Cumulative net cash flow ($000)', xAxisAt: 0, yTicks: [-100, -50, 0, 50].map((v) => ({ v, label: acc(v) })), grid: true }));
  r.cum.forEach((v, i) => {
    const x = sx(a, i) - 22;
    const y0 = sy(a, 0);
    const y1 = sy(a, v);
    p.push(rect(x, Math.min(y0, y1), 44, Math.abs(y1 - y0), { fill: v < 0 ? C.signal : C.green, opacity: 0.9 }));
    p.push(text(sx(a, i), v < 0 ? y1 + 16 : y1 - 6, acc(v), { size: 11.5, weight: 700, fill: v < 0 ? C.signalText : C.greenText, anchor: 'middle' }));
    p.push(text(sx(a, i), v < 0 ? y0 - 8 : y0 + 16, String(i), { size: 11, fill: C.slate, anchor: 'middle' }));
  });
  const months = (r.payback % 1) * 12;
  p.push(line(id, sx(a, r.payback), sy(a, 80), sx(a, r.payback), sy(a, -110), { stroke: C.gold, sw: 1.4, dash: '4 4' }));
  p.push(circle(sx(a, r.payback), sy(a, 0), 6, { fill: C.gold, stroke: C.white, sw: 2 }));
  p.push(text(sx(a, r.payback) + 8, sy(a, -60), `Payback ${Math.floor(r.payback)} years ${num(months, 1)} months`, { size: 12, weight: 700, fill: C.goldText }));
  p.push(text(604, 66, 'Cash flows', { size: 11, weight: 700, fill: C.slate, label: true }));
  p.push(text(604, 86, `Cost: (${PROJECT.cost})`, { size: 11.5, fill: C.body }));
  PROJECT.flows.forEach((f, i) => p.push(text(604, 104 + i * 18, `Year ${i + 1}: ${f}`, { size: 11.5, fill: C.body })));
  p.push(text(20, H - 44, `Payback = ${Math.floor(r.payback)} years + ${-r.cum[Math.floor(r.payback)]!} ÷ ${PROJECT.flows[Math.floor(r.payback)]} of year ${Math.floor(r.payback) + 1} = ${num(r.payback, 3)} years.`, { size: 12, fill: C.body }));
  p.push(text(20, H - 24, `ARR = (total returns − capital cost) ÷ years of use ÷ capital cost × 100 = (${r.total} − ${PROJECT.cost}) ÷ ${PROJECT.flows.length} ÷ ${PROJECT.cost} × 100 = ${num(r.arr, 0)}%.`, { size: 12, fill: C.body }));
  p.push(fictionNote(W - 12, H - 6, 'Fictional project, $000.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Payback and the average rate of return',
      desc: `A fictional project costs $${PROJECT.cost}k and returns net cash flows of ${PROJECT.flows.join(', ')} thousand dollars over five years. Bars show the cumulative net cash flow each year: ${r.cum.map((v) => acc(v)).join(', ')}. It turns positive during year ${Math.floor(r.payback) + 1}, giving a payback period of ${num(r.payback, 3)} years, or ${Math.floor(r.payback)} years and ${num(months, 1)} months. The average rate of return is (${r.total} − ${PROJECT.cost}) ÷ ${PROJECT.flows.length} ÷ ${PROJECT.cost} × 100 = ${num(r.arr, 0)}%.`,
    },
    p.join(''),
  );
}

function npv(id: string): string {
  const W = 720;
  const H = 400;
  const pv = PROJECT.flows.map((f, i) => f * FACTORS_10[i]!);
  const total = pv.reduce((s, v) => s + v, 0);
  const value = total - PROJECT.cost;
  const a: Axes = { x: 70, y: 40, w: 460, h: 250, x0: 0.4, x1: 5.6, y0: 0, y1: 45 };
  const p: string[] = [];
  p.push(axes(id, a, { xLabel: 'Year', yLabel: '$000', xTicks: [1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) })), yTicks: [0, 10, 20, 30, 40].map((v) => ({ v, label: String(v) })), grid: true }));
  PROJECT.flows.forEach((f, i) => {
    const x = sx(a, i + 1);
    p.push(rect(x - 30, sy(a, f), 28, sy(a, 0) - sy(a, f), { fill: C.white, stroke: C.ink, sw: 1.4 }));
    p.push(rect(x + 2, sy(a, pv[i]!), 28, sy(a, 0) - sy(a, pv[i]!), { fill: C.cobalt }));
    p.push(text(x - 16, sy(a, f) - 6, String(f), { size: 11, weight: 700, fill: C.ink, anchor: 'middle' }));
    p.push(text(x + 16, sy(a, pv[i]!) - 6, num(pv[i]!, 1), { size: 11, weight: 700, fill: C.cobaltText, anchor: 'middle' }));
  });
  p.push(legend(a.x, H - 66, [{ label: 'Net cash flow', fill: C.white, stroke: C.ink }, { label: 'Present value at 10%', fill: C.cobalt }]));
  p.push(text(548, 60, 'Discount factors, 10%', { size: 11, weight: 700, fill: C.slate, label: true }));
  FACTORS_10.forEach((f, i) => p.push(text(548, 80 + i * 18, `Year ${i + 1}: ${f.toFixed(4)}`, { size: 11.5, fill: C.body })));
  p.push(text(548, 186, `Total PV: ${num(total, 1)}`, { size: 12, weight: 700, fill: C.cobaltText }));
  p.push(text(548, 206, `Cost: (${PROJECT.cost})`, { size: 12, fill: C.body }));
  p.push(text(548, 230, `NPV: ${num(value, 1)}`, { size: 14, weight: 700, fill: value >= 0 ? C.greenText : C.signalText }));
  p.push(para(20, H - 40, 'A dollar received later is worth less today. NPV = sum of the present values of the returns − original cost; a positive NPV means the project beats the 10% return used to discount.', 112, { size: 11.5, fill: C.body }));
  p.push(fictionNote(W - 12, H - 8, 'Same fictional project as the payback chart, $000. Factors from the guide’s table.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Net present value',
      desc: `The same fictional project, with each year’s net cash flow beside its present value at a 10% discount rate, using the guide’s discount factors (${FACTORS_10.map((f) => f.toFixed(4)).join(', ')}). The present values are ${pv.map((v) => num(v, 1)).join(', ')}, a total of ${num(total, 1)} thousand dollars. Less the original cost of ${PROJECT.cost}, the net present value is ${num(value, 1)} thousand dollars, positive, so the project earns more than the 10% rate used.`,
    },
    p.join(''),
  );
}

/* ---------- Budget variances ---------- */
export const BUDGET: Array<{ line: string; kind: 'revenue' | 'cost'; budget: number; actual: number }> = [
  { line: 'Sales revenue', kind: 'revenue', budget: 120, actual: 132 },
  { line: 'Raw materials', kind: 'cost', budget: 40, actual: 46 },
  { line: 'Wages', kind: 'cost', budget: 30, actual: 29 },
  { line: 'Rent', kind: 'cost', budget: 10, actual: 10 },
];

export function variances(rows = BUDGET) {
  const out = rows.map((r) => {
    const diff = r.actual - r.budget;
    const fav = r.kind === 'revenue' ? diff > 0 : diff < 0;
    return { ...r, amount: Math.abs(diff), flag: diff === 0 ? '' : fav ? 'F' : 'A' };
  });
  const profit = (k: 'budget' | 'actual') => rows.reduce((s, r) => s + (r.kind === 'revenue' ? r[k] : -r[k]), 0);
  const pb = profit('budget');
  const pa = profit('actual');
  return { rows: out, profit: { budget: pb, actual: pa, amount: Math.abs(pa - pb), flag: pa === pb ? '' : pa > pb ? 'F' : 'A' } };
}

function budget(id: string): string {
  const W = 720;
  const H = 380;
  const v = variances();
  const p: string[] = [];
  const cols = [260, 360, 460];
  p.push(text(cols[0]!, 40, 'Budget', { size: 12, weight: 700, fill: C.slate, anchor: 'end' }));
  p.push(text(cols[1]!, 40, 'Actual', { size: 12, weight: 700, fill: C.slate, anchor: 'end' }));
  p.push(text(cols[2]!, 40, 'Variance', { size: 12, weight: 700, fill: C.slate, anchor: 'end' }));
  const all = [...v.rows, { line: 'Profit', kind: 'revenue' as const, budget: v.profit.budget, actual: v.profit.actual, amount: v.profit.amount, flag: v.profit.flag }];
  all.forEach((r, i) => {
    const y = 74 + i * 52 + (i === all.length - 1 ? 12 : 0);
    if (i === all.length - 1) p.push(line(id, 30, y - 26, 690, y - 26, { stroke: C.ink, sw: 1.2 }));
    p.push(text(30, y, r.line, { size: 13, weight: i === all.length - 1 ? 700 : 600, fill: C.ink }));
    p.push(text(cols[0]!, y, num(r.budget), { size: 13, fill: C.body, anchor: 'end' }));
    p.push(text(cols[1]!, y, num(r.actual), { size: 13, fill: C.body, anchor: 'end' }));
    const tone = r.flag === 'F' ? C.greenText : r.flag === 'A' ? C.signalText : C.slate;
    p.push(text(cols[2]!, y, r.flag ? `${num(r.amount)} [${r.flag}]` : '0', { size: 13, weight: 700, fill: tone, anchor: 'end' }));
    // A bar for the size of the variance.
    if (r.amount) p.push(rect(490, y - 12, r.amount * 14, 14, { fill: r.flag === 'F' ? C.green : C.signal, opacity: 0.85, rx: 2 }));
  });
  p.push(para(490, 330, '[F] favourable: better for profit. [A] adverse: worse for profit.', 30, { size: 11, fill: C.slate }));
  p.push(para(30, 330, 'Revenue above budget is favourable; a cost above budget is adverse. Managers ask why each variance arose before acting on it.', 62, { size: 11.5, fill: C.body }));
  p.push(fictionNote(W - 12, 24, 'Fictional month, $000.'));
  return frame(
    {
      id,
      w: W,
      h: H,
      title: 'Budget variances',
      desc: `A fictional month’s budget against actual results, in thousands of dollars. ${v.rows.map((r) => `${r.line}: budget ${r.budget}, actual ${r.actual}, variance ${r.amount ? `${r.amount} ${r.flag === 'F' ? 'favourable' : 'adverse'}` : 'none'}`).join('. ')}. Profit: budget ${v.profit.budget}, actual ${v.profit.actual}, a variance of ${v.profit.amount} ${v.profit.flag === 'F' ? 'favourable' : 'adverse'}. Revenue above budget is favourable and a cost above budget is adverse.`,
    },
    p.join(''),
  );
}

export const UNIT3: Record<string, DiagramDef> = {
  'capital-revenue-expenditure': { title: 'Capital and revenue expenditure', caption: 'Long-lived assets against day-to-day spending, and where each appears in the accounts.', syllabus: ['3.1'], level: 'SL/HL', group: 'unit-3', render: capexRevex },
  'sources-of-finance': { title: 'Sources of finance', caption: 'Internal and external sources, by their usual term.', syllabus: ['3.2'], level: 'SL/HL', group: 'unit-3', render: sources },
  'costs-and-revenue-lines': { title: 'Costs and revenue as output changes', caption: 'Fixed, variable and total costs, and total revenue.', syllabus: ['3.3', '5.5'], level: 'SL/HL', group: 'unit-3', fictional: true, render: costTypes },
  'profit-or-loss-waterfall': { title: 'The statement of profit or loss, line by line', caption: 'From sales revenue to retained profit, in the guide’s order.', syllabus: ['3.4', '3.5'], level: 'SL/HL', group: 'unit-3', fictional: true, render: plWaterfall },
  'financial-position-balance': { title: 'The statement of financial position', caption: 'What the business owns, and how it is financed, in balance.', syllabus: ['3.4', '3.5'], level: 'SL/HL', group: 'unit-3', fictional: true, render: sfp },
  'depreciation-methods': { title: 'Depreciation: two methods', caption: 'Straight line and units of production for the same machine.', syllabus: ['3.4'], level: 'HL', group: 'unit-3', fictional: true, render: depreciationChart },
  'ratio-families': { title: 'The ratio families', caption: 'Profitability, liquidity and efficiency ratios with the guide’s formulas.', syllabus: ['3.5', '3.6'], level: 'SL/HL', group: 'unit-3', render: ratios },
  'working-capital-cycle': { title: 'The working capital cycle', caption: 'From cash to stock to debtors and back to cash.', syllabus: ['3.7'], level: 'SL/HL', group: 'unit-3', render: workingCapital },
  'cash-flow-forecast': { title: 'A cash flow forecast, month to month', caption: 'How each closing balance becomes the next opening balance.', syllabus: ['3.7'], level: 'SL/HL', group: 'unit-3', fictional: true, render: cashFlow },
  'payback-arr': { title: 'Payback and the average rate of return', caption: 'Cumulative net cash flow, the payback point and the ARR.', syllabus: ['3.8'], level: 'SL/HL', group: 'unit-3', fictional: true, render: payback },
  'npv-discounting': { title: 'Net present value', caption: 'Each year’s return discounted to today with the guide’s factors.', syllabus: ['3.8'], level: 'HL', group: 'unit-3', fictional: true, render: npv },
  'budget-variances': { title: 'Budget variances', caption: 'Favourable and adverse variances, judged by their effect on profit.', syllabus: ['3.9'], level: 'HL', group: 'unit-3', fictional: true, render: budget },
};
