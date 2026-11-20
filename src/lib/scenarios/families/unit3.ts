/**
 * Unit 3 families: reading ratios into a strategic position (SWOT), two
 * machines with uncertain demand (decision trees, with payback), a new
 * branch's cash flow forecast (business plan) and a product that looks
 * loss-making (contribution, HL). Every business is fictional and every
 * figure simulated; the ratios use the guide's formulas.
 */
import { an, best, businessName, fair, money, notThisTool, num, place, roundTo, sized, table, text, tidy, weak } from '../kit';
import type { Family } from '../types';

/* ------------------------------------------------------------------ */

const RATIO = [
  { noun: 'Furniture', industry: 'Retail', what: 'a furniture retailer with four stores', stockWord: 'sofas and beds' },
  { noun: 'Electrical', industry: 'Retail', what: 'a wholesaler of electrical goods', stockWord: 'televisions and kitchen appliances' },
  { noun: 'Garden Centre', industry: 'Retail', what: 'a garden centre', stockWord: 'plants, furniture and tools' },
  { noun: 'Sports', industry: 'Retail', what: 'a sportswear retailer', stockWord: 'footwear and team kit' },
];

const ratioHealth: Family = {
  id: 'ratio-health',
  unit: 3,
  subtopics: ['3.5'],
  tool: 'swot-analysis',
  level: 'SL/HL',
  title: 'What do the ratios say?',
  summary: 'Two years of accounts show either a liquidity problem or a profitability problem; the strategy depends on which.',
  industries: ['Retail'],
  quantitative: true,
  make(r) {
    const k = r.pick(RATIO);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 40, 180);
    const liquidity = r.chance(0.5);
    const K = 1000 * p.k;
    const rev = [r.step(2000, 4000, 100), 0];
    rev[1] = Math.round(rev[0]! * (1 + r.int(2, 8) / 100));
    const gpm = liquidity ? [r.int(40, 44), r.int(40, 44)] : [r.int(36, 40), r.int(27, 31)];
    const gp = rev.map((v, i) => Math.round((v * gpm[i]!) / 100));
    const cos = rev.map((v, i) => v - gp[i]!);
    const expenses = rev.map((v) => Math.round(v * (liquidity ? 0.32 : 0.25)));
    const pbit = gp.map((g, i) => g - expenses[i]!);
    // This year's current assets and liabilities, built from the ratio the variant needs.
    const cl = r.step(500, 900, 10);
    const cr = liquidity ? r.int(80, 94) / 100 : r.int(160, 195) / 100;
    const ca = Math.round(cl * cr);
    const stock = Math.round(ca * (liquidity ? r.int(60, 68) / 100 : r.int(32, 40) / 100));
    const cash = Math.round(ca * (liquidity ? 0.05 : 0.25));
    const debtors = ca - stock - cash;
    const crExact = tidy(ca / cl);
    const acid = tidy((ca - stock) / cl);
    const gpmNow = tidy((gp[1]! / rev[1]!) * 100);
    const m = (v: number) => money(v * K, p);
    const calc = liquidity
      ? {
          prompt: 'Calculate this year’s current ratio, to two decimal places.',
          answer: roundTo(crExact, 2),
          dp: 2,
          tolerance: 0.006,
          prefix: '',
          suffix: '',
          working: [`Current ratio = current assets ÷ current liabilities`, `= ${m(ca)} ÷ ${m(cl)}`, `= ${num(crExact, 2)}`],
          slips: [
            { value: roundTo(acid, 2), why: 'That is the acid test ratio: it leaves out stock. The current ratio uses all current assets.' },
            { value: roundTo(cl / ca, 2), why: 'The division is upside down: current assets go on top, current liabilities underneath.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(crExact, 2)) > 0.006 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Below 1, so current assets do not cover the debts due within a year, and the acid test (${num(acid, 2)}) is weaker still.`,
        }
      : {
          prompt: 'Calculate this year’s gross profit margin, as a percentage to one decimal place.',
          answer: roundTo(gpmNow, 1),
          dp: 1,
          tolerance: 0.06,
          prefix: '',
          suffix: '%',
          working: ['Gross profit margin = gross profit ÷ sales revenue × 100', `= ${m(gp[1]!)} ÷ ${m(rev[1]!)} × 100`, `= ${num(gpmNow, 1)}%`],
          slips: [
            { value: roundTo((pbit[1]! / rev[1]!) * 100, 1), why: 'That is the profit margin, which uses profit before interest and tax. The gross profit margin uses gross profit.' },
            { value: roundTo((cos[1]! / rev[1]!) * 100, 1), why: 'That is cost of sales as a share of revenue; the margin is what is left: gross profit over revenue.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(gpmNow, 1)) > 0.06 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Down from ${gpm[0]}% last year: each sale now keeps far less after the cost of the goods.`,
        };
    const cause = liquidity ? `Stock has built up: slow-selling ${k.stockWord} fill the warehouse, and suppliers want paying within 30 days.` : `Suppliers raised their prices this year by about a tenth; ${name} kept its own prices the same to hold on to customers.`;
    return {
      title: `${name}: what do the ratios say?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the finance director of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. Sales grew this year, and the managers were pleased, until the finance director brought the accounts to the board.`,
        'The director wants the ratios read properly, so that the board’s strategy answers the business’s real weakness.',
      ],
      question: `What should ${name} do about its financial position?`,
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          liquidity
            ? best('A profitable business that may not be able to pay its debts as they fall due', 'The margins are healthy, but current assets do not cover current liabilities and much of them is stock: the weakness is liquidity, not profit.')
            : best('Margins that are shrinking as costs rise, though the business can pay its debts', 'The business is liquid, but its gross profit margin has fallen sharply: the weakness is profitability, not liquidity.'),
          fair('Sales are not growing fast enough', 'Sales grew this year; the problem lies in what the sales leave behind or in how the money is tied up, not in the sales total.'),
          liquidity ? weak('Margins are too low', 'The gross profit margin is steady and healthy; profit is not where the weakness is.') : weak('The business cannot pay its bills', 'The current ratio is comfortable; liquidity is not where the weakness is.'),
          weak('Redesigning the shop windows', 'A distractor: window displays have nothing to do with the accounts.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Statement of profit or loss (extract)', true, 'Revenue, cost of sales and profit give the profitability ratios.', ['', 'Last year', 'This year'], [['Sales revenue', m(rev[0]!), m(rev[1]!)], ['Cost of sales', m(cos[0]!), m(cos[1]!)], ['Gross profit', m(gp[0]!), m(gp[1]!)], ['Expenses', m(expenses[0]!), m(expenses[1]!)], ['Profit before interest and tax', m(pbit[0]!), m(pbit[1]!)]], 'Simulated data.'),
          table('Statement of financial position (extract), this year', true, 'Current assets and liabilities give the liquidity ratios.', ['Item', 'Value'], [['Stock', m(stock)], ['Debtors', m(debtors)], ['Cash', m(cash)], ['Current assets', m(ca)], ['Current liabilities', m(cl)]], 'Simulated data.'),
          text('Note from the finance director', true, 'It explains the cause behind the ratios, which the strategy must address.', cause),
          text('Proposal: new window displays', false, 'Window displays are a marketing matter unrelated to the accounts.', 'The display team proposes a new seasonal design for the windows of every store.'),
          text('Staff newsletter', false, 'News about staff events does not bear on the financial position.', 'Congratulations to the warehouse team on a year without accidents, and welcome to five new starters.'),
        ],
      },
      tools: [
        { tool: 'swot-analysis', verdict: 'best', why: 'Ratios reveal internal strengths and weaknesses; SWOT puts them beside the opportunities and threats outside, so the board’s strategy answers the real weakness.' },
        { tool: 'descriptive-statistics', verdict: 'fair', why: notThisTool('descriptive-statistics', 'A chart would show the trend in the figures, but the ratios still need reading as strengths and weaknesses before a strategy can be chosen.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The problem is in the business’s accounts as a whole, not in the balance of its product portfolio.') },
        { tool: 'ansoff-matrix', verdict: 'weak', why: notThisTool('ansoff-matrix', 'Growth options do not address a weakness in the current accounts.') },
      ],
      analysis: {
        steps: [
          liquidity ? 'Calculate the current ratio and the acid test ratio for this year.' : 'Calculate the gross profit margin for both years, and the profit margin.',
          'Compare with the other year, or with a typical figure, and say which ratios are strengths and which are weaknesses.',
          'Use the director’s note to find the cause, because the strategy must address the cause.',
        ],
        calc,
        model: liquidity
          ? [
              `Current ratio ${num(crExact, 2)} and acid test ${num(acid, 2)}: current assets do not cover the debts due within a year, and without stock the cover is much thinner.`,
              `Gross profit margin about ${gpm[1]}% in both years: profitability is a strength.`,
              `Stock is ${m(stock)}, ${Math.round((stock / ca) * 100)}% of current assets, much of it slow-selling: the weakness is cash tied up in stock.`,
            ]
          : [
              `Gross profit margin fell from ${gpm[0]}% to ${num(gpmNow, 1)}%, and the profit margin with it: profitability is the weakness.`,
              `Current ratio ${num(crExact, 2)} and acid test ${num(acid, 2)}: liquidity is a strength.`,
              'The cause is clear: suppliers’ prices rose while the business held its own, so each sale keeps less.',
            ],
      },
      recommend: {
        prompt: 'Which strategy should the board choose?',
        choices: liquidity
          ? [
              best('Clear slow-selling stock with a sale, and negotiate longer credit with suppliers', `It turns stock (${m(stock)}) into cash and spreads payments out, which raises both liquidity ratios; the healthy margin can absorb a sale on the slowest lines.`),
              fair('Take out a long-term loan to rebuild the cash balance', 'It would lift the current ratio, but it adds interest and leaves the cause, the stock, untouched.'),
              weak('Raise prices to improve margins', 'Margins are already healthy; higher prices would slow sales and could leave even more stock unsold.'),
              weak('Buy more stock to win bulk discounts', 'It would tie up even more cash in stock and weaken liquidity further.'),
            ]
          : [
              best('Review prices on the lines whose costs rose, and look for cheaper suppliers', 'It tackles the cause of the falling margin directly: the cost of the goods has risen while prices have not.'),
              fair('Cut expenses such as marketing', 'It would lift the profit margin a little, but not the gross margin, where the fall began.'),
              weak('Sell assets to raise cash', 'Cash is not the problem: the current ratio is comfortable.'),
              weak('Hold more stock in case prices rise again', 'It would tie up cash without improving the margin.'),
            ],
        justify: 'Justify your choice in two or three sentences, using at least two ratios.',
        criteria: ['Uses two or more ratios with their figures, and says which is the strength and which the weakness', 'Links the strategy to the cause in the director’s note', 'Notes a cost or risk of the strategy'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder is most exposed to the weakness the ratios reveal?',
          choices: liquidity
            ? [
                best('Suppliers and short-term lenders, who are owed money due within a year', 'With current assets below current liabilities, they are the ones who may not be paid on time.'),
                fair('Shareholders, whose dividends could be cut to save cash', 'Possible, but the immediate exposure is to those owed money now.'),
                weak('Customers, who can buy elsewhere', 'Customers are least exposed: they owe the business, not the other way round.'),
              ]
            : [
                best('Shareholders, whose returns depend on the margin', 'A falling margin means less profit from each sale, and so less to reinvest or pay out.'),
                fair('Employees, whose bonuses or pay rises may be held back', 'They may feel it, but the owners’ return is hit first.'),
                weak('Suppliers, who are being paid on time', 'The business is liquid, so suppliers are not exposed.'),
              ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: liquidity
            ? [
                best('Selling stock cheaply lowers this year’s margin', 'A sale converts stock to cash at a lower price; the margin is strong enough to absorb it, but profit will dip.'),
                fair('Suppliers refuse longer credit', 'Possible, which is why clearing stock comes first and does not depend on them.'),
                weak('The newsletter goes out late', 'A late newsletter has no bearing on the business\u2019s cash or its debts.'),
              ]
            : [
                best('Customers buy less after the price review', 'Prices that rise to restore the margin may cost sales; the review should target the lines where customers are least sensitive to price.'),
                fair('A cheaper supplier is less reliable', 'A real trade-off between cost and quality or delivery, to be checked before switching.'),
                weak('The window displays are delayed', 'A late window display has no effect on the cost of the goods or the margin.'),
              ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: liquidity
            ? [
                best('Most of the stock being seasonal and certain to sell within two months', 'Then the liquidity problem would ease by itself, and a short-term overdraft to bridge the gap might be enough.'),
                fair('A large customer paying an overdue debt', 'It would help the cash balance, but not the stock that causes the problem.'),
                weak('A newer design for the windows', 'Window displays do not change any ratio, so they cannot change the strategy.'),
              ]
            : [
                best('Suppliers’ prices falling back next season', 'If the cause reverses, holding prices may be the better course: customers stay, and the margin recovers by itself.'),
                fair('Rivals raising their prices first', 'It would make a price review safer, though not change its direction.'),
                weak('A newer design for the windows', 'Window displays do not change any ratio, so they cannot change the strategy.'),
              ],
        },
      },
      model: {
        problem: liquidity ? `${name} is profitable but may not pay its debts as they fall due: a liquidity problem caused by stock.` : `${name} can pay its debts, but its margins are shrinking as costs rise: a profitability problem.`,
        evidence: 'They give the two statements and the director’s explanation of the cause. The window displays and the newsletter are distractors.',
        tool: 'SWOT analysis, to turn the ratios into strengths and weaknesses and match the strategy to the real weakness.',
        analysis: liquidity ? `Current ratio ${num(crExact, 2)}, acid test ${num(acid, 2)}, gross margin about ${gpm[1]}%: liquidity is the weakness, profitability the strength.` : `Gross margin down from ${gpm[0]}% to ${num(gpmNow, 1)}%, current ratio ${num(crExact, 2)}: profitability is the weakness, liquidity the strength.`,
        recommendation: liquidity ? 'Clear slow-selling stock and negotiate longer supplier credit.' : 'Review prices on the lines whose costs rose, and look for cheaper suppliers.',
        evaluation: liquidity ? 'Suppliers and lenders are most exposed; the sale will dip the margin; seasonal stock that will soon sell would change the answer.' : 'Shareholders are most exposed; customers may buy less; suppliers’ prices falling back would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const MACHINES = [
  { noun: 'Print', industry: 'Manufacturing', what: 'a commercial printer', a: 'a large digital press', b: 'a smaller digital press' },
  { noun: 'Bakehouse', industry: 'Food and drink', what: 'a wholesale bakery', a: 'a large automated oven line', b: 'a second standard oven' },
  { noun: 'Brewing', industry: 'Food and drink', what: 'a craft brewery', a: 'a high-speed canning line', b: 'a small manual canning machine' },
  { noun: 'Dental', industry: 'Healthcare', what: 'a group of dental practices', a: 'a 3D scanner and milling unit', b: 'a 3D scanner alone' },
];

const twoMachines: Family = {
  id: 'two-machines',
  unit: 3,
  subtopics: ['3.8', '1.5'],
  tool: 'decision-trees',
  level: 'SL/HL',
  title: 'Two machines, uncertain demand',
  summary: 'A business must choose between a large and a small machine when demand could be high or low.',
  industries: ['Manufacturing', 'Food and drink', 'Healthcare'],
  quantitative: true,
  make(r) {
    const k = r.pick(MACHINES);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 30, 160);
    const prob = r.pick([0.4, 0.5, 0.6, 0.7]);
    const K = 1000 * p.k;
    const A = { cost: r.step(180, 260, 10), hi: r.step(110, 150, 5), lo: r.step(30, 50, 5) };
    const B = { cost: r.step(70, 110, 5), hi: r.step(40, 55, 5), lo: r.step(22, 32, 2) };
    const e = (x: typeof A) => tidy(prob * x.hi + (1 - prob) * x.lo);
    const eA = e(A);
    const eB = e(B);
    const pbA = tidy(A.cost / eA);
    const pbB = tidy(B.cost / eB);
    const target = 3;
    const winner: 'A' | 'B' = pbA < pbB ? 'A' : 'B';
    const m = (v: number) => money(v * K, p);
    const yrs = (v: number) => `${num(roundTo(v, 1), 1)} years`;
    const denom = A.cost * (B.hi - B.lo) - B.cost * (A.hi - A.lo);
    const pStar = denom !== 0 ? tidy((B.cost * A.lo - A.cost * B.lo) / denom) : NaN;
    const crosses = Number.isFinite(pStar) && pStar > 0 && pStar < 1;
    const crossLine = crosses ? `The two machines pay back equally fast when the chance of high demand is about ${roundTo(pStar, 2).toFixed(2)}.` : `On these figures ${winner === 'A' ? k.a : k.b} pays back faster at any chance of high demand.`;
    const meetsTarget = Math.min(pbA, pbB) <= target;
    return {
      title: `${name}: two machines, uncertain demand`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the managing director of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. Its oldest equipment must be replaced this year, and two options are on the table: ${k.a} or ${k.b}.`,
        'The larger option earns much more if demand is high, but costs more. The managers cannot be sure how strong demand will be, and the board has a rule for new equipment: it should pay back within three years.',
      ],
      question: `Which machine should ${name} buy?`,
      problem: {
        prompt: 'What is the problem the managing director must solve?',
        choices: [
          best('Choosing the machine that pays back soonest when demand is uncertain', 'Two machines with different costs and different returns in high and low demand: the decision is which to buy, and the uncertainty is what makes it hard.'),
          fair('The old equipment must be replaced', 'That is why the decision is needed now, but not the decision itself.'),
          weak('Whether to hire more sales staff', 'A separate question; nothing in the evidence turns on sales staff.'),
          weak('Repainting the workshop', 'A distractor in the pack: decorating has nothing to do with the choice of machine.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('The two options', true, 'Each machine’s cost and its net cash flow in high and low demand: the tree’s figures.', ['Option', 'Cost', 'Net cash flow a year, high demand', 'Net cash flow a year, low demand'], [[k.a.charAt(0).toUpperCase() + k.a.slice(1), m(A.cost), m(A.hi), m(A.lo)], [k.b.charAt(0).toUpperCase() + k.b.slice(1), m(B.cost), m(B.hi), m(B.lo)]], 'Simulated estimates from the suppliers and the sales team.'),
          text('Sales forecast', true, 'It gives the probability of high demand, which weights the cash flows.', `The sales team puts the chance of high demand over the next five years at ${Math.round(prob * 100)}%, and of low demand at ${Math.round((1 - prob) * 100)}%. (Simulated estimate.)`),
          text('Board policy on equipment', true, 'The three-year payback rule is the test each option must pass.', 'New equipment should pay back its cost within three years.'),
          text('Quote: repainting the workshop', false, 'Repainting is unrelated to which machine to buy.', 'The decorators can repaint the workshop over a long weekend.'),
          text('Email: the sales conference', false, 'Arrangements for a conference do not bear on the investment.', 'This year’s sales conference will be held in the spring; please book travel early.'),
        ],
      },
      tools: [
        { tool: 'decision-trees', verdict: 'best', why: 'The machines’ cash flows depend on uncertain demand with known probabilities: a decision tree gives each machine’s expected annual cash flow, from which its payback follows.' },
        { tool: 'business-plan', verdict: 'fair', why: notThisTool('business-plan', 'A plan would set out the investment’s finances, but comparing two machines with uncertain returns calls for expected values.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'It cannot compare two machines whose returns depend on uncertain demand.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The decision is about equipment, not about which products deserve investment.') },
      ],
      analysis: {
        steps: [
          'Find each machine’s expected annual net cash flow: weight the high and low figures by their probabilities and add them.',
          'Work out each machine’s payback period: its cost divided by its expected annual cash flow.',
          'Compare the paybacks with each other and with the three-year rule, then ask what the expected values hide.',
        ],
        calc: {
          prompt: `Calculate the payback period of ${k.a}, using its expected annual net cash flow, in years to one decimal place.`,
          answer: roundTo(pbA, 1),
          dp: 1,
          tolerance: 0.06,
          prefix: '',
          suffix: ' years',
          working: [
            `Expected annual cash flow = (${prob} × ${m(A.hi)}) + (${tidy(1 - prob)} × ${m(A.lo)}) = ${m(eA)}`,
            `Payback = cost ÷ expected annual cash flow = ${m(A.cost)} ÷ ${m(eA)}`,
            `= ${num(pbA, 2)}, about ${yrs(pbA)}`,
            `For ${k.b}: expected cash flow ${m(eB)}; payback ${m(B.cost)} ÷ ${m(eB)} = about ${yrs(pbB)}`,
          ],
          slips: [
            { value: roundTo(A.cost / A.hi, 1), why: 'That uses the high-demand cash flow only. Weight both outcomes by their probabilities first.' },
            { value: roundTo(A.cost / A.lo, 1), why: 'That uses the low-demand cash flow only. Weight both outcomes by their probabilities first.' },
            { value: roundTo(A.cost / ((A.hi + A.lo) / 2), 1), why: 'A simple average treats the two outcomes as equally likely; weight each by its probability.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(pbA, 1)) > 0.06 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `${k.b.charAt(0).toUpperCase() + k.b.slice(1)} pays back in about ${yrs(pbB)}, so ${winner === 'A' ? k.a : k.b} pays back sooner.`,
        },
        model: [
          `Expected annual cash flows: ${k.a} ${m(eA)}, ${k.b} ${m(eB)}.`,
          `Paybacks: ${k.a} about ${yrs(pbA)}, ${k.b} about ${yrs(pbB)}; the board’s rule is three years.`,
          crossLine,
          'Payback ignores the cash after the payback year: the larger machine may earn more over its life even when it pays back later.',
        ],
      },
      recommend: {
        prompt: 'Which machine would you recommend?',
        choices: [
          (winner === 'A' ? best : fair)(`Buy ${k.a}`, winner === 'A' ? `It pays back sooner (about ${yrs(pbA)} against ${yrs(pbB)})${pbA <= target ? ', inside the three-year rule' : ''}, and it earns far more if demand is high.` : `It earns more if demand is high, but at about ${yrs(pbA)} it pays back later than ${k.b} (${yrs(pbB)})${pbA > target ? ' and outside the three-year rule' : ''}.`),
          (winner === 'B' ? best : fair)(`Buy ${k.b}`, winner === 'B' ? `It pays back sooner (about ${yrs(pbB)} against ${yrs(pbA)})${pbB <= target ? ', inside the three-year rule' : ''}, with far less money at risk if demand is low.` : `Less money at risk, but at about ${yrs(pbB)} it pays back later than ${k.a} (${yrs(pbA)}).`),
          weak('Keep repairing the old equipment', `It must be replaced this year, so this only postpones the decision${meetsTarget ? ', and at least one option meets the board’s rule' : ''}.`),
        ],
        justify: 'Justify your choice in two or three sentences, using the expected cash flows and the paybacks.',
        criteria: ['Uses both paybacks with their figures, and the three-year rule', 'Explains how the probabilities were used', 'Notes a limit of payback, such as ignoring the cash after the payback year'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder bears most of the risk if demand turns out low?',
          choices: [
            best('The owners, whose money pays for the machine', 'If demand is low, the cash flows shrink and payback takes longer; the cost of that falls on the owners.'),
            fair('The staff who will run the machine', 'Their work changes, and low demand could mean fewer hours, but the financial risk is the owners’.'),
            weak('The decorators', 'A distractor with no stake in the investment.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk the expected values hide?',
          choices: [
            best('The probabilities are estimates, and in a bad year the cash flow is the low figure, not the expected one', `An expected value is an average over many repetitions; this decision happens once. ${crossLine}`),
            fair('The machine breaks down more often than its supplier says', 'A real operational risk that would cut the cash flows of either machine.'),
            weak('The conference clashes with a holiday', 'Conference dates have no bearing on how quickly either machine pays back.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            crosses ? best('A new forecast putting the chance of high demand on the other side of the break-even probability', crossLine) : best('Very different cash flow estimates for one of the machines', `${crossLine} Only different cash flows could change the ranking.`),
            fair('The board relaxing its payback rule to four years', 'It would let more options pass, but the ranking by payback would not change.'),
            weak('A cheaper quote for the decorating', 'Decorating costs are not part of either machine\u2019s cash flows.'),
          ],
        },
      },
      model: {
        problem: `${name} must choose the machine that pays back soonest while demand is uncertain.`,
        evidence: 'They give the two machines’ costs and cash flows, the chance of high demand and the board’s rule. The decorating and the conference are distractors.',
        tool: 'A decision tree, to turn uncertain cash flows into expected values, from which payback follows.',
        analysis: `Expected cash flows ${m(eA)} and ${m(eB)}; paybacks about ${yrs(pbA)} and ${yrs(pbB)}. ${crossLine}`,
        recommendation: `Buy ${winner === 'A' ? k.a : k.b}: it pays back sooner${Math.min(pbA, pbB) <= target ? ', inside the board’s rule' : ', though outside the board’s rule, which the board must accept or revisit'}.`,
        evaluation: 'The owners bear the risk of low demand; the expected values hide a single bad year; a different forecast of demand would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const BRANCH = [
  { noun: 'Coffee House', industry: 'Hospitality', what: 'a café', branch: 'a second café' },
  { noun: 'Fitness', industry: 'Sport and leisure', what: 'a gym', branch: 'a second gym' },
  { noun: 'Flowers', industry: 'Retail', what: 'a florist', branch: 'a second shop' },
  { noun: 'Bike Works', industry: 'Retail', what: 'a bicycle shop with a repair workshop', branch: 'a second shop and workshop' },
];

const branchCash: Family = {
  id: 'branch-cash-flow',
  unit: 3,
  subtopics: ['3.7', '3.2'],
  tool: 'business-plan',
  level: 'SL/HL',
  title: 'Can we afford the new branch?',
  summary: 'A cash flow forecast for a new branch shows a shortfall; the plan must say how long it lasts and how to fund it.',
  industries: ['Hospitality', 'Sport and leisure', 'Retail'],
  quantitative: true,
  make(r) {
    const k = r.pick(BRANCH);
    const p = place(r);
    const name = businessName(r, k.noun);
    const K = 1000 * p.k;
    const strong = r.chance(0.5);
    const scale = r.step(1, 1.6, 0.1);
    const sales = (strong ? [10, 18, 27, 35, 41, 45] : [6, 10, 14, 18, 22, 24]).map((v) => Math.round(v * scale));
    const fitout = r.step(30, 50, 5);
    const running = Math.round(r.step(14, 18, 1) * scale);
    const opening = r.step(15, 25, 5);
    const out = sales.map((_, i) => running + (i === 0 ? fitout : 0));
    const closing: number[] = [];
    sales.forEach((s, i) => closing.push((i === 0 ? opening : closing[i - 1]!) + s - out[i]!));
    const lowest = Math.min(...closing);
    const recovers = closing[5]! >= 0;
    const limit = Math.round((Math.abs(lowest) * (recovers ? 1.2 : 0.8)) / 5) * 5;
    const overdraftWorks = recovers && Math.abs(lowest) <= limit;
    const m = (v: number) => money(v * K, p);
    const br = (v: number) => (v < 0 ? `(${money(-v * K, p)})` : money(v * K, p));
    return {
      title: `${name}: can we afford the new branch?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: 'a small business with 14 staff',
      role: `You help the owners of ${name} prepare their business plan for the bank.`,
      brief: [
        `${name} runs ${an(k.what)} in ${p.city}, ${p.country}, and plans to open ${k.branch}. The new branch’s plan includes a six-month cash flow forecast.`,
        `The owners want to know how deep and how long any shortfall would be, and how to fund it, before they meet the bank, which has offered an overdraft of up to ${m(limit)}.`,
      ],
      question: `How should ${name} fund the cash shortfall of its new branch?`,
      problem: {
        prompt: 'What is the problem the owners must solve?',
        choices: [
          best('Funding the branch through the months its cash outflows run ahead of its inflows, with finance that matches how long the shortfall lasts', 'The forecast shows a shortfall; the problem is its depth and its length, and finance that fits both.'),
          fair('The branch will make a loss in its first months', 'Profit and cash are different: the issue in the forecast is cash, which runs short because the fit-out is paid at the start.'),
          weak('Choosing the branch’s opening hours', 'Opening hours matter, but they are not what the forecast raises.'),
          weak('Ordering new uniforms for the branch', 'A distractor in the pack: uniforms are a small cost, not the funding question.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Cash flow forecast for the new branch', true, 'It shows when the balance goes negative, how deep it goes and whether it recovers.', ['', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'], [
            ['Opening balance', m(opening), ...closing.slice(0, 5).map(br)],
            ['Cash inflows (sales)', ...sales.map(m)],
            ['Fit-out', m(fitout), '0', '0', '0', '0', '0'],
            ['Running costs', ...sales.map(() => m(running))],
            ['Net cash flow', ...sales.map((s, i) => br(s - out[i]!))],
            ['Closing balance', ...closing.map((c, i) => (i < 2 ? br(c) : i === 2 ? 'Work it out' : br(c)))],
          ], 'Simulated data. Figures in brackets are negative.'),
          text('Letter from the bank', true, 'The overdraft limit tells the owners whether short-term finance can cover the shortfall.', `We can offer an overdraft of up to ${m(limit)} for twelve months, reviewed at the end of that time, or a five-year loan for the fit-out at a fixed rate. (Simulated.)`),
          text('Sales assumptions', true, 'The forecast is only as good as its sales assumptions, which the plan must state.', `Sales are forecast to grow each month as the branch becomes known, based on the first branch’s first six months. (Simulated.)`),
          text('Supplier brochure: uniforms', false, 'Uniforms are a small operating cost, not part of the funding question.', 'Aprons and polo shirts with your logo, delivered in ten days.'),
          text('Notice: the first branch’s anniversary', false, 'A celebration at the first branch does not bear on how to fund the second.', 'Free coffee and cake on Saturday to mark ten years in the high street.'),
        ],
      },
      tools: [
        { tool: 'business-plan', verdict: 'best', why: 'The branch is a new venture seeking finance: its business plan holds the cash flow forecast and the case for the bank, and must show how the shortfall will be funded.' },
        { tool: 'descriptive-statistics', verdict: 'fair', why: notThisTool('descriptive-statistics', 'A bar chart of the closing balances would show the shape of the shortfall clearly, but the decision about funding belongs to the plan.') },
        { tool: 'ansoff-matrix', verdict: 'weak', why: notThisTool('ansoff-matrix', 'The direction of growth is already chosen; the question is how to pay for it.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'There is no product portfolio question here, only a cash shortfall to fund.') },
      ],
      analysis: {
        steps: [
          'Work through the forecast month by month: closing balance = opening balance + inflows − outflows.',
          'Find the lowest balance and the months in which the balance is negative.',
          'Decide whether the shortfall is temporary or lasting, and whether it fits within the overdraft the bank offers.',
        ],
        calc: {
          prompt: 'Calculate the closing balance at the end of month 3.',
          answer: closing[2]! * K,
          dp: 0,
          tolerance: 0.5 * K,
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? ' ' : ''),
          suffix: '',
          working: [
            `Month 3 opening balance = month 2 closing balance = ${br(closing[1]!)}`,
            `Net cash flow in month 3 = ${m(sales[2]!)} − ${m(out[2]!)} = ${br(sales[2]! - out[2]!)}`,
            `Closing balance = ${br(closing[1]!)} + ${br(sales[2]! - out[2]!)} = ${br(closing[2]!)}`,
          ],
          slips: [
            { value: (sales[2]! - out[2]!) * K, why: 'That is month 3’s net cash flow. Add it to the opening balance, which is month 2’s closing balance.' },
            { value: (closing[2]! + fitout) * K, why: 'The fit-out is paid in month 1, and its effect carries forward in every balance after it.' },
            { value: (opening + sales[2]! - out[2]!) * K, why: 'Month 3 starts from month 2’s closing balance, not from the opening balance of month 1.' },
          ].filter((s, i, all) => Math.abs(s.value - closing[2]! * K) > 0.5 * K && all.findIndex((x) => x.value === s.value) === i),
          meaning: `The lowest balance is ${br(lowest)}, and by month 6 the balance is ${br(closing[5]!)}.`,
        },
        model: [
          `Closing balances: ${closing.map(br).join(', ')}.`,
          `The lowest is ${br(lowest)}; the overdraft offered is ${m(limit)}.`,
          recovers ? 'The balance recovers by month 6: the shortfall is temporary, caused by paying for the fit-out before sales build up.' : 'The balance is still negative in month 6: the shortfall lasts, because sales grow too slowly to repay the fit-out.',
          'The fit-out is a long-lasting asset; finance that lasts as long as the asset is the safer match.',
        ],
      },
      recommend: {
        prompt: 'How should the plan fund the shortfall?',
        choices: [
          (overdraftWorks ? best : recovers ? fair : weak)(`Use the bank’s overdraft of up to ${m(limit)}`, overdraftWorks ? `The shortfall is temporary and its deepest point (${br(lowest)}) is within the limit; the overdraft is cheap for a few months and is cleared as sales build.` : recovers ? `The shortfall is temporary, but its deepest point (${br(lowest)}) is beyond the ${m(limit)} limit.` : `The balance is still negative in month 6, and an overdraft is reviewed after a year: short-term finance for a lasting shortfall is risky.`),
          (overdraftWorks ? fair : best)('Take the five-year loan for the fit-out', overdraftWorks ? 'Safe, and well matched to a long-lasting asset, but it means paying interest for five years on a shortfall that the forecast clears within months.' : `${recovers ? `The deepest point (${br(lowest)}) is beyond the overdraft limit` : 'The shortfall lasts beyond the six months'}, and the fit-out is a long-lasting asset: a loan matched to its life is the safer funding.`),
          fair('Delay the opening by six months to build up cash first', 'Defensible if the bank says no, but it gives up six months of sales and leaves the site empty while rent may be due.'),
          weak('Cut the marketing for the opening to save cash', 'It saves a little but slows the growth in sales that the forecast depends on.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the lowest balance and how long the shortfall lasts.',
        criteria: ['Uses the forecast: the lowest balance and the months it is negative', 'Matches the finance to the length of the shortfall and to what it pays for', 'Notes how the plan would cope if sales grow more slowly'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder will look hardest at the forecast before agreeing?',
          choices: [
            best('The bank, which must judge whether the shortfall will be repaid', 'It will test the sales assumptions behind the forecast before lending.'),
            fair('The staff at the first branch, whose jobs depend on the business staying solvent', 'They have a stake, but they do not decide on the finance.'),
            weak('The uniform supplier', 'A distractor with no stake in the forecast.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of the forecast itself?',
          choices: [
            best('Sales grow more slowly than forecast, so the shortfall is deeper and lasts longer', 'The forecast rests on sales assumptions; if they are optimistic, the funding chosen may not be enough.'),
            fair('The fit-out costs more than quoted', 'A real risk, which a contingency in the plan would cover.'),
            weak('The anniversary cake runs out', 'An event at the first branch has no bearing on the new branch’s forecast.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            overdraftWorks ? best('Sales in the first months coming in well below the forecast', 'Then the shortfall would deepen and last longer, and the loan would become the safer funding.') : best('Sales growing much faster than forecast, clearing the shortfall within a few months', 'Then a temporary overdraft could be enough, and the loan’s interest unnecessary.'),
            fair('The bank raising the overdraft limit', 'It widens the options, but the length of the shortfall still matters as much as its depth.'),
            weak('A cheaper uniform supplier', 'A small saving on uniforms cannot change how the shortfall should be funded.'),
          ],
        },
      },
      model: {
        problem: `${name} must fund the months its new branch spends more cash than it takes, with finance that fits the shortfall’s depth and length.`,
        evidence: 'They give the forecast, the bank’s offer and the sales assumptions. The uniforms and the anniversary are distractors.',
        tool: 'A business plan, whose cash flow forecast is the evidence the bank will judge.',
        analysis: `The balance falls to ${br(lowest)} and is ${br(closing[5]!)} in month 6: the shortfall is ${recovers ? 'temporary' : 'lasting'}${recovers ? (overdraftWorks ? ' and within the overdraft' : ' but beyond the overdraft') : ''}.`,
        recommendation: overdraftWorks ? 'Use the overdraft for the few months the balance is negative.' : 'Take the five-year loan for the fit-out, matching the finance to the asset.',
        evaluation: 'The bank will test the sales assumptions; slower sales would deepen the shortfall; sales well away from the forecast would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const LINES = [
  { noun: 'Bakery', industry: 'Food and drink', what: 'a bakery', unit: 'item', products: ['Bread', 'Cakes', 'Pastries'] },
  { noun: 'Woodcraft', industry: 'Manufacturing', what: 'a furniture maker', unit: 'piece', products: ['Tables', 'Chairs', 'Shelving'] },
  { noun: 'Brewery', industry: 'Food and drink', what: 'a brewery', unit: 'case', products: ['Lager', 'Pale ale', 'Stout'] },
  { noun: 'Botanicals', industry: 'Consumer goods', what: 'a maker of natural cosmetics', unit: 'jar', products: ['Face cream', 'Body lotion', 'Lip balm'] },
];

const dropProduct: Family = {
  id: 'drop-product',
  unit: 3,
  subtopics: ['3.3', '5.5'],
  tool: 'contribution',
  level: 'HL',
  title: 'Should we drop the loss-making line?',
  summary: 'Once overheads are shared out, one product shows a loss. Its contribution says whether dropping it would help.',
  industries: ['Food and drink', 'Manufacturing', 'Consumer goods'],
  quantitative: true,
  make(r) {
    const k = r.pick(LINES);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 20, 90);
    const keep = r.chance(0.6);
    const K = p.k;
    const lines = k.products.map((prod, i) => {
      const units = r.step(6000, 20000, 500);
      const price = r.step(i === 2 ? 4 : 8, i === 2 ? 9 : 20, 0.5);
      const vc = i === 2 ? (keep ? tidy(price * (r.int(70, 85) / 100)) : tidy(price * (r.int(103, 112) / 100))) : tidy(price * (r.int(40, 55) / 100));
      return { prod, units, price: tidy(price * K), vc: roundTo(vc * K, 2) };
    });
    const revenue = lines.map((l) => tidy(l.units * l.price));
    const totalRev = revenue.reduce((a, b) => a + b, 0);
    const contrib = lines.map((l) => tidy(l.units * (l.price - l.vc)));
    // Overheads large enough that the third line shows a loss once they are shared by sales, as the case says, but smaller than the total contribution, so the business makes a profit.
    const totalContrib = contrib.reduce((a, b) => a + b, 0);
    const fixed = Math.ceil(Math.max((totalContrib * r.int(70, 80)) / 100, (1.1 * Math.max(0, contrib[2]!) * totalRev) / revenue[2]!) / 1000) * 1000;
    const allocated = revenue.map((v) => Math.round((fixed * v) / totalRev));
    allocated[2] = fixed - allocated[0]! - allocated[1]!;
    const profitAfter = contrib.map((c, i) => tidy(c - allocated[i]!));
    const C = lines[2]!;
    const cC = contrib[2]!;
    const m = (v: number) => money(v, p);
    const bracket = (v: number) => (v < 0 ? `(${money(-v, p)})` : money(v, p));
    return {
      title: `${name}: should we drop the ${C.prod.toLowerCase()}?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the owners of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}, with three product lines. The accountant shares the business’s overheads (rent, managers’ salaries, insurance) among the lines in proportion to their sales, and on that basis the ${C.prod.toLowerCase()} make a loss.`,
        `One owner wants to drop the ${C.prod.toLowerCase()} at once. The other is not sure the loss is real.`,
      ],
      question: `Should ${name} stop making ${C.prod.toLowerCase()}?`,
      problem: {
        prompt: 'What is the problem the owners must solve?',
        choices: [
          best(`Whether dropping the ${C.prod.toLowerCase()} would raise the business’s total profit, once the overheads that would not disappear are taken into account`, 'The loss appears only after overheads are shared out; the decision turns on what the line adds to revenue compared with the costs it actually causes.'),
          fair(`The ${C.prod.toLowerCase()} show a loss in the accounts`, 'That is the figure that started the debate, but it depends on how overheads are shared out, so it cannot settle the decision on its own.'),
          weak('Choosing a new accountant', 'The accountant’s method is common; the question is how to read it, not who prepares it.'),
          weak('Redesigning the labels', 'A distractor in the pack: labels do not change what a line adds to profit.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Profit by product line, last year', true, 'It gives each line’s units, price and variable cost, from which contribution is worked, and the shared overheads that create the loss.', ['', ...k.products], [
            ['Units sold', ...lines.map((l) => num(l.units))],
            [`Price per ${k.unit}`, ...lines.map((l) => money(l.price, p, 2))],
            [`Variable cost per ${k.unit}`, ...lines.map((l) => money(l.vc, p, 2))],
            ['Share of overheads', ...allocated.map(m)],
            ['Profit after overheads', ...profitAfter.map(bracket)],
          ], 'Simulated data. Overheads are shared in proportion to sales revenue; figures in brackets are losses.'),
          text('Accountant’s note on the overheads', true, 'It says the overheads would not fall if the line were dropped, the key fact for the decision.', `The overheads are rent, the managers’ salaries and insurance. None of them would fall if one product line stopped; they would simply be shared among the other two. (Simulated.)`),
          text('Sales manager’s note', true, 'It shows that the line brings in customers for the others, a non-financial factor in the decision.', `Many of our shop customers buy ${C.prod.toLowerCase()} alongside ${k.products[0]!.toLowerCase()}; some trade buyers order all three lines together. (Simulated.)`),
          text('Designer’s proposal: new labels', false, 'Labels do not change whether the line covers its own costs.', 'Fresh labels for all three lines, printed on recycled paper.'),
          text('Notice: the delivery van', false, 'A van’s service is routine and unrelated to the product decision.', 'The delivery van goes in for its annual service next Tuesday.'),
        ],
      },
      tools: [
        { tool: 'contribution', verdict: 'best', why: 'Contribution analysis judges a line by its revenue less the variable costs it causes, ignoring overheads that would be paid anyway: exactly the test of whether dropping the line would raise profit.' },
        { tool: 'bcg-matrix', verdict: 'fair', why: notThisTool('bcg-matrix', 'It would place the lines by market growth and share, but not show whether this line covers the costs it causes.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'It would not separate the costs a line causes from the overheads it is given.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'The figures here are known, not uncertain outcomes with probabilities.') },
      ],
      analysis: {
        steps: [
          `Work out the contribution of the ${C.prod.toLowerCase()}: (price − variable cost) × units sold.`,
          'Compare it with the share of overheads it is given, and ask which of those costs would disappear if it were dropped.',
          'Weigh the non-financial factors: customers who buy the lines together.',
        ],
        calc: {
          prompt: `Calculate the total contribution of the ${C.prod.toLowerCase()} last year.`,
          answer: cC,
          dp: 0,
          tolerance: 1,
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? ' ' : ''),
          suffix: '',
          working: [
            `Contribution per ${k.unit} = ${money(C.price, p, 2)} − ${money(C.vc, p, 2)} = ${money(tidy(C.price - C.vc), p, 2)}`,
            `Total contribution = ${money(tidy(C.price - C.vc), p, 2)} × ${num(C.units)} = ${bracket(cC)}`,
          ],
          slips: [
            { value: profitAfter[2]!, why: 'That is the profit after the share of overheads. Contribution stops before the overheads: revenue less variable costs.' },
            { value: tidy(C.units * C.price), why: 'That is the revenue. Subtract the variable costs to find the contribution.' },
            { value: tidy(C.price - C.vc), why: 'That is the contribution per unit; multiply it by the units sold for the total.' },
          ].filter((s, i, all) => Math.abs(s.value - cC) > 1 && all.findIndex((x) => x.value === s.value) === i),
          meaning: keep ? `Positive: the line covers its own variable costs and adds ${m(cC)} towards overheads that would be paid anyway.` : `Negative: the line does not even cover its own variable costs, so every ${k.unit} sold lowers profit.`,
        },
        model: [
          `Contribution of the ${C.prod.toLowerCase()}: ${bracket(cC)}.`,
          keep ? `The overheads would not fall if the line were dropped, so profit would fall by ${m(cC)}: the shared overheads, not the line, create the loss.` : 'The line’s price is below its variable cost, so it loses money on each sale before any overhead is counted.',
          'Customers who buy the lines together are a non-financial factor: dropping one line could cost sales of the others.',
          'Sharing overheads in proportion to sales is a method, not a fact: another basis would give a different profit for each line.',
        ],
      },
      recommend: {
        prompt: `What should ${name} do?`,
        choices: [
          (keep ? best : weak)(`Keep the ${C.prod.toLowerCase()}`, keep ? `The line’s contribution is ${m(cC)}; the overheads would stay if it were dropped, so dropping it would cut profit by that much and could lose customers who buy the lines together.` : `The line’s contribution is negative (${bracket(cC)}): each sale costs more in variable costs than it brings in.`),
          (keep ? weak : best)(`Drop the ${C.prod.toLowerCase()}`, keep ? `The loss comes from the shared overheads, which would not disappear. Dropping the line would remove its ${m(cC)} of contribution and lower total profit.` : `With a negative contribution of ${bracket(cC)}, every sale lowers profit; dropping the line raises total profit, though the sales manager’s point about joint buyers should be managed.`),
          fair(`Raise the price of the ${C.prod.toLowerCase()}`, keep ? 'It could raise the contribution further, but the line already adds to profit; a price rise risks the joint sales.' : 'It could turn the contribution positive if customers accept a higher price; worth testing before dropping the line.'),
          weak('Share the overheads on a different basis to remove the loss', 'It would move the loss to another line without changing the business’s total profit at all.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the contribution and the accountant’s note.',
        criteria: ['Uses the line’s contribution, with the figure', 'Explains why shared overheads that would not disappear do not decide the question', 'Weighs a non-financial factor, such as customers who buy the lines together'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder would notice the decision first?',
          choices: [
            best(`Customers who buy the ${C.prod.toLowerCase()} with other lines`, 'They would lose part of what they come for, and some may take their other purchases elsewhere.'),
            fair(`The staff who make the ${C.prod.toLowerCase()}`, 'Their work would change or end if the line were dropped, though they could move to the other lines.'),
            weak('The label designer', 'A distractor: unaffected by the decision.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: keep
            ? [
                best('The line’s contribution keeps shrinking until it no longer covers its variable costs', 'Keeping it is right only while its contribution stays positive; it should be watched each year.'),
                fair('The owners keep arguing about the shared loss', 'A real risk to how decisions are made, which reporting by contribution would ease.'),
                weak('The van service runs late', 'A routine service running late has no bearing on whether the line adds to profit.'),
              ]
            : [
                best('Customers who bought the lines together take their other purchases elsewhere', 'Dropping the line could cost sales of the others; offering a substitute or a supplier’s product could keep them.'),
                fair('Staff on the dropped line have to be redeployed or made redundant', 'A real cost to people and to morale, which the plan should address.'),
                weak('The van service runs late', 'A routine service running late has no bearing on whether the line adds to profit.'),
              ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: keep
            ? [
                best('Overheads that would fall, such as a separate building, if the line were dropped', 'Then the saving could exceed the contribution lost, and dropping the line might raise profit.'),
                fair('A rival launching a cheaper version of the line', 'It would put the contribution under pressure and call for a review.'),
                weak('New labels being cheaper than expected', 'Labels do not change the line’s contribution.'),
              ]
            : [
                best('Customers accepting a price high enough to give the line a positive contribution', 'Then the line would add to profit and could be kept.'),
                fair('A cheaper supplier for the line’s ingredients or materials', 'Lower variable costs could turn the contribution positive.'),
                weak('New labels being cheaper than expected', 'Labels do not change the line’s contribution.'),
              ],
        },
      },
      model: {
        problem: `${name} must decide whether dropping the ${C.prod.toLowerCase()} would raise total profit, given that the overheads would not disappear.`,
        evidence: 'They give each line’s figures and the shared overheads, the accountant’s note that the overheads would stay, and the joint buyers. The labels and the van are distractors.',
        tool: 'Contribution analysis, which ignores overheads that would be paid anyway.',
        analysis: `The ${C.prod.toLowerCase()} have a contribution of ${bracket(cC)}; the loss in the accounts ${keep ? 'comes from the shared overheads' : 'is real: price is below variable cost'}.`,
        recommendation: keep ? `Keep the ${C.prod.toLowerCase()}: dropping them would cut profit by their contribution.` : `Drop the ${C.prod.toLowerCase()} unless a price rise can turn the contribution positive.`,
        evaluation: keep ? 'Joint buyers would notice first; a shrinking contribution is the risk; overheads that would fall would change the answer.' : 'Joint buyers would notice first; losing their other purchases is the risk; a viable price rise would change the answer.',
      },
    };
  },
};

export const UNIT3: Family[] = [ratioHealth, twoMachines, branchCash, dropProduct];
