/**
 * Unit 5 families: moving from job to batch production (decision trees),
 * producing abroad (STEEPLE, with the landed cost), making or buying a part
 * (contribution, HL), a rising defect rate (descriptive statistics, HL), a
 * refit against a reopening date (critical path analysis, HL) and switching
 * to just-in-time (force field analysis, HL). Every business is fictional
 * and every figure simulated.
 */
import { an, best, businessName, fair, money, notThisTool, num, place, roundTo, sized, table, text, tidy, weak } from '../kit';
import type { Family } from '../types';

/* ------------------------------------------------------------------ */

const CRAFT = [
  { noun: 'Joinery', industry: 'Manufacturing', what: 'a furniture workshop that makes tables to order', standard: 'three standard table designs', product: 'tables' },
  { noun: 'Cakes', industry: 'Food and drink', what: 'a bakery that makes celebration cakes to order', standard: 'a range of six standard cakes', product: 'cakes' },
  { noun: 'Boards', industry: 'Sport and leisure', what: 'a workshop that shapes surfboards to order', standard: 'four standard board shapes', product: 'surfboards' },
  { noun: 'Tailors', industry: 'Fashion', what: 'a tailor that makes suits to measure', standard: 'a ready-to-wear range in standard sizes', product: 'suits' },
];

const productionMethod: Family = {
  id: 'job-to-batch',
  unit: 5,
  subtopics: ['5.2'],
  tool: 'decision-trees',
  level: 'SL/HL',
  title: 'From job to batch production?',
  summary: 'A craft business considers making standard designs in batches; whether it pays depends on demand.',
  industries: ['Manufacturing', 'Food and drink', 'Sport and leisure', 'Fashion'],
  quantitative: true,
  make(r) {
    const k = r.pick(CRAFT);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 8, 30);
    const prob = r.pick([0.4, 0.5, 0.6, 0.7]);
    const K = 1000 * p.k;
    const cost = r.step(40, 80, 5);
    const hi = r.step(70, 140, 5);
    const lo = r.step(-10, 30, 5);
    const ev = tidy(prob * hi + (1 - prob) * lo - cost);
    const pStar = tidy((cost - lo) / (hi - lo));
    const crosses = pStar > 0 && pStar < 1;
    const crossLine = crosses ? `Switching breaks even, in expected value, when the chance of strong demand is about ${roundTo(pStar, 2).toFixed(2)}.` : pStar >= 1 ? 'Even with strong demand certain, switching would not cover its cost on these figures.' : 'Switching has a positive expected value at any chance of strong demand on these figures.';
    const sw = ev > 0;
    const m = (v: number) => money(v * K, p);
    return {
      title: `${name}: from job to batch production?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the owner of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. Each order is made individually (job production), which customers value but which is slow and costly per item.`,
        `The owner could add ${k.standard}, made in batches with new jigs and equipment, while keeping some made-to-order work. Whether it pays depends on demand for the standard ${k.product}, which nobody can be sure of.`,
      ],
      question: `Should ${name} move part of its production from job to batch?`,
      problem: {
        prompt: 'What is the problem the owner must solve?',
        choices: [
          best('Whether an investment in batch production pays, when demand for standard products is uncertain', 'The switch has a known cost now and a payoff that depends on demand: the decision is whether its expected value justifies it.'),
          fair('Job production is slow and costly per item', 'That is the reason to consider batch production, not the decision itself.'),
          weak('Choosing between batch and flow production for the whole output', 'Flow production suits very large, steady volumes; at this scale the real choice is whether to add batches at all.'),
          weak('Choosing new aprons for the workshop', 'A distractor in the pack: workwear does not decide how production is organized.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('The switch: cost and extra profit', true, 'The cost of switching and the extra profit in strong and weak demand are the payoffs of the tree.', ['Item', 'Figure'], [['Jigs, equipment and set-up', m(cost)], ['Extra profit over three years, strong demand', m(hi)], ['Extra profit over three years, weak demand', lo < 0 ? `(${m(-lo)})` : m(lo)]], 'Simulated estimates. Figures in brackets are losses.'),
          text('Market research', true, 'It gives the chance of strong demand for the standard products.', `A survey of retailers and past customers suggests a ${Math.round(prob * 100)}% chance that demand for standard ${k.product} will be strong. (Simulated.)`),
          text('What customers value', true, 'It shows the risk to the made-to-order business that batch production must not damage.', `Customers say the made-to-order service is why they choose ${name}; they would welcome cheaper standard ${k.product}, but not at the cost of the bespoke service. (Simulated interviews.)`),
          text('Workwear catalogue', false, 'Workwear is unrelated to how production is organized.', 'Aprons and overalls in three colours, embroidered with your name.'),
          text('Note: the van’s insurance', false, 'Renewing insurance has no bearing on the production decision.', 'The van’s insurance renews next month at the same premium.'),
        ],
      },
      tools: [
        { tool: 'decision-trees', verdict: 'best', why: 'The switch has a cost and an uncertain payoff with a known probability: a decision tree gives its expected value to compare with staying as it is.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'It would set out the workshop’s position, but not weigh an uncertain payoff against a known cost.') },
        { tool: 'descriptive-statistics', verdict: 'weak', why: notThisTool('descriptive-statistics', 'There is no data set to summarize; the question is the value of an uncertain investment.') },
        { tool: 'ansoff-matrix', verdict: 'weak', why: notThisTool('ansoff-matrix', 'The products and markets stay much the same; the question is how to make the products.') },
      ],
      analysis: {
        steps: [
          'Draw the tree: switch or stay, then strong or weak demand after switching.',
          'Work out the expected value of switching: weight each payoff by its probability, add them and subtract the cost.',
          'Compare it with staying (no extra profit), then weigh what the tree leaves out: the effect on the made-to-order service.',
        ],
        calc: {
          prompt: 'Calculate the expected value of switching part of production to batch, after its cost.',
          answer: ev * K,
          dp: 0,
          tolerance: 0.5 * K,
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? '\u00a0' : ''),
          suffix: '',
          working: [`Expected value = (${prob} × ${m(hi)}) + (${tidy(1 - prob)} × ${lo < 0 ? `−${m(-lo)}` : m(lo)}) − ${m(cost)}`, `= ${m(tidy(prob * hi))} ${lo < 0 ? '−' : '+'} ${m(Math.abs(tidy((1 - prob) * lo)))} − ${m(cost)}`, `= ${ev < 0 ? '−' : ''}${m(Math.abs(ev))}`],
          slips: [
            { value: tidy(prob * hi + (1 - prob) * lo) * K, why: 'Subtract the cost of the jigs and equipment from the weighted payoffs.' },
            { value: tidy(prob * hi - cost) * K, why: 'The weak-demand payoff counts too, weighted by its own probability.' },
            { value: tidy((hi + lo) / 2 - cost) * K, why: 'A simple average treats strong and weak demand as equally likely; weight each by its probability.' },
          ].filter((s, i, all) => Math.abs(s.value - ev * K) > 0.5 * K && all.findIndex((x) => x.value === s.value) === i),
          meaning: sw ? 'Positive: on average, switching adds to profit compared with staying as it is.' : 'Negative: on average, switching would lose money compared with staying as it is.',
        },
        model: [
          `Expected value of switching: ${prob} × ${m(hi)} + ${tidy(1 - prob)} × ${lo < 0 ? `−${m(-lo)}` : m(lo)} − ${m(cost)} = ${ev < 0 ? '−' : ''}${m(Math.abs(ev))}.`,
          crossLine,
          'Batch production lowers the cost per item through repetition, but needs enough steady demand to keep the batches full.',
          'The tree leaves out the risk to the made-to-order service, which customers say is why they choose the business.',
        ],
      },
      recommend: {
        prompt: 'What should the owner do?',
        choices: [
          (sw ? best : weak)(`Add batch production of ${k.standard}, keeping the made-to-order service`, sw ? `The expected value is positive (${m(ev)}), and keeping the bespoke service protects what customers value.` : `The expected value is negative (−${m(Math.abs(ev))}): on these figures the switch is likely to lose money.`),
          (sw ? fair : best)('Stay with job production for now', sw ? 'Safe, and it protects the bespoke service, but it gives up a positive expected value.' : `With a negative expected value (−${m(Math.abs(ev))}), staying as it is keeps the business’s strength without a likely loss.`),
          weak('Move all production to flow lines to cut costs as far as possible', 'Flow production needs large, steady volumes the business does not have, and it would end the bespoke service customers value.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the expected value and one thing the tree leaves out.',
        criteria: ['Uses the expected value, with the figure and its sign', 'Weighs the effect on the made-to-order service', 'States the chance of strong demand at which the answer would change'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder group’s work changes most if the business switches?',
          choices: [
            best('The craft staff, who would spend part of their time on repeated batch work', 'Batch production changes skilled one-off work into repeated tasks; their motivation and skills are part of the decision.'),
            fair('Made-to-order customers, who may wait longer if staff are busy with batches', 'A real risk, which keeping staff time for bespoke work would manage.'),
            weak('The insurance company', 'The van’s insurance is unaffected by how production is organized.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best(sw ? 'Demand for the standard products is weak, and the equipment sits idle' : 'A rival offers standard products first and takes that market', sw ? `In weak demand the switch earns ${lo < 0 ? 'a loss' : 'little'}; the expected value hides that single outcome.` : 'Staying cautious gives up a market that may grow; the decision should be reviewed as evidence on demand builds.'),
            fair('The jigs and equipment cost more than quoted', 'It would lower the expected value, which a firm quote would settle.'),
            weak('The workwear arrives late', 'Workwear has no bearing on the production decision.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            crosses ? best('New research putting the chance of strong demand on the other side of the break-even probability', crossLine) : best('Very different estimates of the extra profit', `${crossLine} Only different payoffs would change the answer.`),
            fair('A cheaper quote for the equipment', 'It would raise the expected value of switching by the amount saved.'),
            weak('A cheaper insurance quote for the van', 'Insurance has no bearing on whether batch production pays.'),
          ],
        },
      },
      model: {
        problem: `${name} must decide whether batch production of standard ${k.product} pays, when demand for them is uncertain.`,
        evidence: 'They give the cost and payoffs, the chance of strong demand and what customers value. The workwear and the insurance are distractors.',
        tool: 'A decision tree, weighing a known cost against an uncertain payoff.',
        analysis: `Expected value of switching ${ev < 0 ? '−' : ''}${m(Math.abs(ev))}. ${crossLine}`,
        recommendation: sw ? `Add batch production of ${k.standard}, keeping the made-to-order service.` : 'Stay with job production for now: the switch is likely to lose money.',
        evaluation: 'The craft staff’s work changes most; weak demand is the risk; a different chance of strong demand would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const OFFSHORE = [
  { noun: 'Apparel', industry: 'Fashion', what: 'a maker of outdoor clothing', item: 'jacket' },
  { noun: 'Electronics', industry: 'Technology', what: 'a maker of smart thermostats', item: 'thermostat' },
  { noun: 'Toys', industry: 'Consumer goods', what: 'a maker of wooden toys', item: 'toy' },
  { noun: 'Lighting', industry: 'Manufacturing', what: 'a maker of lamps', item: 'lamp' },
];

const relocation: Family = {
  id: 'produce-abroad',
  unit: 5,
  subtopics: ['5.4'],
  tool: 'steeple-analysis',
  level: 'SL/HL',
  title: 'Should we make it abroad?',
  summary: 'A cheaper factory abroad looks attractive until shipping, tariffs and the factors behind them are counted.',
  industries: ['Fashion', 'Technology', 'Consumer goods', 'Manufacturing'],
  quantitative: true,
  make(r) {
    const k = r.pick(OFFSHORE);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 60, 260);
    const K = p.k;
    const home = r.step(30, 48, 1);
    const prod = r.step(14, 22, 1);
    const ship = r.step(2, 6, 0.5);
    const tariffPct = r.pick([5, 8, 10, 12, 15]);
    const landed = tidy(prod + ship + (prod * tariffPct) / 100);
    const audit = r.chance(0.6);
    const saving = tidy(((home - landed) / home) * 100);
    const offshore = audit && saving >= 15;
    const tStar = tidy(((home - prod - ship) / prod) * 100);
    const m = (v: number) => money(v * K, p, 2);
    return {
      title: `${name}: should we make it abroad?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the operations director of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. A contract manufacturer abroad has offered to make its best-selling ${k.item} for much less than it costs at home.`,
        'The director wants the full cost per item, including shipping and the import tariff, and a scan of the outside factors that could change the picture, before recommending offshoring to the board.',
      ],
      question: `Should ${name} move production of its best-selling ${k.item} abroad?`,
      problem: {
        prompt: 'What is the problem the director must solve?',
        choices: [
          best('Whether producing abroad lowers the full cost per item enough to outweigh the risks outside the business’s control', 'The quoted price is only part of the cost, and offshoring brings external factors (tariffs, standards, shipping) that the decision must weigh.'),
          fair('The cost per item at home is high', 'That is why the offer is attractive, but it does not settle whether moving production would be better.'),
          weak('Redesigning the packaging', 'A distractor: packaging can be redesigned wherever the product is made.'),
          weak('Raising the price of the product', 'The question is the cost of making it, not its price.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table(`Cost per ${k.item}`, true, 'The costs at home and abroad give the landed cost, the figure to compare.', ['Item', 'Figure'], [['Cost of making it at home', m(home)], ['Contract manufacturer’s price abroad', m(prod)], ['Shipping and handling per item', m(ship)], ['Import tariff, on the manufacturer’s price', `${tariffPct}%`]], 'Simulated data.'),
          text('Ethical audit of the contract manufacturer', true, 'Working conditions in the supplier’s factory are an ethical factor the business would answer for.', audit ? 'An independent audit found that the factory meets recognized standards on pay, hours and safety. (Simulated.)' : 'An independent audit found excessive overtime and blocked fire exits; the factory has promised to fix them but has not yet been re-audited. (Simulated.)'),
          text('Briefing: trade and the environment', true, 'Political and environmental factors could change the tariff and the shipping cost.', 'Ministers are discussing higher tariffs on imported manufactured goods. Customers increasingly ask about the carbon cost of shipping. (Simulated briefing.)'),
          text('Packaging proposal', false, 'Packaging is unaffected by where the product is made.', 'New recyclable packaging, printed with the brand’s new colours.'),
          text('Staff news: the five-a-side team', false, 'Staff sport is unrelated to the location decision.', 'The five-a-side team won the local league; the trophy is in reception.'),
        ],
      },
      tools: [
        { tool: 'steeple-analysis', verdict: 'best', why: 'Offshoring exposes the business to factors outside its control: tariffs (political), working conditions (ethical), shipping emissions (environmental) and import rules (legal). STEEPLE makes sure none is missed alongside the cost.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'Its threats box would hold some of these factors, but the decision turns on the external environment, which STEEPLE scans more fully.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The product’s market position is not in question; where to make it is.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no outcomes with probabilities to weigh; the costs are known and the risks are external factors.') },
      ],
      analysis: {
        steps: [
          'Work out the landed cost per item abroad: the manufacturer’s price plus shipping plus the tariff.',
          'Compare it with the cost at home, as a saving per item and as a percentage.',
          'Scan the STEEPLE factors that could change the saving or the decision: the tariff talks, the audit, the shipping’s carbon cost.',
        ],
        calc: {
          prompt: `Calculate the landed cost of one ${k.item} made abroad.`,
          answer: roundTo(landed * K, 2),
          dp: 2,
          tolerance: 0.006 * Math.max(1, K),
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? '\u00a0' : ''),
          suffix: '',
          working: [`Tariff = ${tariffPct}% × ${m(prod)} = ${m(tidy((prod * tariffPct) / 100))}`, `Landed cost = ${m(prod)} + ${m(ship)} + ${m(tidy((prod * tariffPct) / 100))}`, `= ${m(landed)}`],
          slips: [
            { value: roundTo((prod + ship) * K, 2), why: 'Add the import tariff: it is paid on every item brought in.' },
            { value: roundTo((prod + (prod * tariffPct) / 100) * K, 2), why: 'Add the shipping and handling cost per item.' },
            { value: roundTo((prod + ship + tariffPct) * K, 2), why: 'The tariff is a percentage of the manufacturer’s price, not an amount in money.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(landed * K, 2)) > 0.006 * Math.max(1, K) && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Against ${m(home)} at home, a saving of ${num(saving, 0)}% per item.`,
        },
        model: [
          `Landed cost ${m(landed)} against ${m(home)} at home: a saving of ${m(tidy(home - landed))} per item, or ${num(saving, 0)}%.`,
          `The saving disappears if the tariff rises to about ${num(tStar, 0)}%, and ministers are discussing higher tariffs (political).`,
          audit ? 'The factory passed an independent ethical audit, so working conditions are not a barrier.' : 'The factory failed its ethical audit; the business would answer for those conditions to its customers (ethical).',
          'Longer shipping adds emissions that customers increasingly ask about (environmental), and stock in transit lengthens the supply chain.',
        ],
      },
      recommend: {
        prompt: 'What should the director recommend?',
        choices: [
          (offshore ? best : weak)('Move production abroad', offshore ? `The landed cost saves ${num(saving, 0)}% per item, the factory passed its ethical audit, and the saving survives a moderate rise in the tariff.` : audit ? `The saving, ${num(saving, 0)}% per item, is too small to justify the risks: a modest tariff rise (to about ${num(tStar, 0)}%) would remove it.` : 'The factory failed its ethical audit; moving production there would put the business’s name to unsafe conditions, whatever the saving.'),
          (offshore ? fair : best)('Keep production at home for now', offshore ? `Safe, but it gives up a ${num(saving, 0)}% saving per item from an audited factory.` : audit ? `With a saving of only ${num(saving, 0)}% and tariffs under discussion, staying at home avoids a move whose benefit could vanish.` : 'Until the factory passes a new audit, staying at home avoids an ethical risk the business cannot control.'),
          fair('Move half the production abroad and keep half at home', 'It spreads the risk and keeps skills at home, but it also halves the saving and doubles the supply chains to manage.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the landed cost and at least one STEEPLE factor.',
        criteria: ['Uses the landed cost and the saving, with figures', 'Names a STEEPLE factor and explains how it could change the decision', 'States the tariff or the finding at which the answer would change'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder group loses most if production moves abroad?',
          choices: [
            best('The employees who make the product at home', 'Their jobs depend on production staying; offshoring is a conflict between the owners’ lower costs and their security.'),
            fair('The local suppliers of parts and packaging', 'They may lose orders, though some supply may continue.'),
            weak('The five-a-side team', 'A distractor: the team plays on whatever happens to the factory’s production.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best(offshore ? 'A tariff rise or a supply disruption wipes out the saving after production has moved' : 'Costs at home keep rising and rivals who moved abroad undercut the business', offshore ? `The saving vanishes at a tariff of about ${num(tStar, 0)}%, and moving production back is slow and costly.` : 'Staying put has risks too; the decision should be reviewed if the gap widens.'),
            fair('Quality is harder to control at a distance', 'A real risk of offshoring, which inspections and a strong contract reduce.'),
            weak('The new packaging is delayed', 'Packaging has no bearing on where production should be.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(offshore ? `The tariff being raised towards ${num(tStar, 0)}%` : audit ? 'The tariff being cut, widening the saving' : 'A new audit showing the factory now meets the standards', offshore ? 'At that tariff the saving disappears, and with it the case for moving.' : audit ? 'A larger saving would make the move worth its risks.' : 'With conditions fixed and verified, the saving could justify the move.'),
            fair('Shipping costs rising', 'They would narrow the saving, by less than a tariff change would.'),
            weak('A new design for the packaging', 'Packaging has no bearing on the decision.'),
          ],
        },
      },
      model: {
        problem: `${name} must decide whether making the ${k.item} abroad lowers its full cost enough to outweigh the external risks.`,
        evidence: 'They give the costs, the ethical audit and the political and environmental briefing. The packaging and the team news are distractors.',
        tool: 'STEEPLE analysis, to weigh the external factors alongside the landed cost.',
        analysis: `Landed cost ${m(landed)} against ${m(home)}: a ${num(saving, 0)}% saving that a tariff of about ${num(tStar, 0)}% would remove; the factory ${audit ? 'passed' : 'failed'} its ethical audit.`,
        recommendation: offshore ? `Move production abroad for a saving of ${num(saving, 0)}% per item, watching the tariff talks.` : audit ? `Keep production at home for now: a ${num(saving, 0)}% saving is too thin to survive a tariff rise.` : 'Keep production at home until the factory passes a new ethical audit.',
        evaluation: `Employees at home lose most; ${offshore ? 'a tariff rise is the risk' : 'rising costs at home are the risk'}; ${offshore ? 'a tariff near the break-even rate' : audit ? 'a lower tariff' : 'a passed re-audit'} would change the answer.`,
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const PARTS = [
  { noun: 'Cycles', industry: 'Manufacturing', what: 'a bicycle maker', part: 'wheel', parts: 'wheels' },
  { noun: 'Seating', industry: 'Manufacturing', what: 'a furniture maker', part: 'seat cushion', parts: 'seat cushions' },
  { noun: 'Controls', industry: 'Technology', what: 'a maker of heating controls', part: 'circuit board', parts: 'circuit boards' },
  { noun: 'Pies', industry: 'Food and drink', what: 'a pie maker', part: 'pastry case', parts: 'pastry cases' },
];

const makeOrBuy: Family = {
  id: 'make-or-buy',
  unit: 5,
  subtopics: ['5.6'],
  tool: 'contribution',
  level: 'HL',
  title: 'Make it, or buy it in?',
  summary: 'A business compares the cost to make a part with the cost to buy it, then weighs what the figures leave out.',
  industries: ['Manufacturing', 'Technology', 'Food and drink'],
  quantitative: true,
  make(r) {
    const k = r.pick(PARTS);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 40, 220);
    const K = p.k;
    const q = r.step(8000, 20000, 1000);
    const fixedM = r.step(20, 60, 5) * 1000;
    const vcM = r.step(3, 8, 0.5);
    const price = r.step(4, 12, 0.5);
    const ctm = tidy(fixedM + vcM * q);
    const ctb = tidy(price * q);
    const make = ctm < ctb;
    const reliable = r.chance(0.5);
    const m = (v: number) => money(v * K, p);
    const qStar = price > vcM ? tidy(fixedM / (price - vcM)) : NaN;
    return {
      title: `${name}: make the ${k.parts}, or buy them in?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the production manager of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. It needs ${num(q)} ${k.parts} a year. It can make them itself, leasing a machine and employing two operators, or buy them from a specialist supplier.`,
        'The production manager wants the cost of each route and the factors the costs leave out.',
      ],
      question: `Should ${name} make its ${k.parts} or buy them in?`,
      problem: {
        prompt: 'What is the problem the production manager must solve?',
        choices: [
          best(`Whether making the ${k.parts} costs less than buying them, and whether the factors beyond cost change the answer`, 'The decision compares the cost to make with the cost to buy, then weighs quality, reliability and control.'),
          fair(`The supplier’s price for ${k.parts} is high`, 'It may be, but only the comparison with the cost to make shows whether it is too high.'),
          weak('Choosing a new delivery van', 'A distractor: the van is not part of the make-or-buy decision.'),
          weak('Hiring more sales staff', 'Sales are not in question; the part is needed whatever the sales team does.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Making the part', true, 'The fixed and variable costs of making give the cost to make.', ['Item', 'Figure'], [['Machine lease and operators, a year (fixed)', m(fixedM)], [`Materials and energy per ${k.part} (variable)`, money(vcM * K, p, 2)]], 'Simulated estimates.'),
          table('Buying the part', true, 'The supplier’s price gives the cost to buy.', ['Item', 'Figure'], [[`Supplier’s price per ${k.part}`, money(price * K, p, 2)], ['Quantity needed a year', num(q)]], 'Simulated quote.'),
          text('The supplier’s record', true, 'Reliability and quality are the factors beyond cost.', reliable ? 'The supplier has delivered on time 99% of the time for other customers and has a good quality record. (Simulated.)' : 'Other customers report late deliveries about one week in five, and some faulty batches. (Simulated.)'),
          text('Quote for a new delivery van', false, 'The van is a separate purchase, not part of making or buying the part.', 'A new van can be supplied in six weeks, with a trade-in for the old one.'),
          text('Note: the staff canteen', false, 'The canteen is unrelated to the decision.', 'The canteen will serve breakfast from next month.'),
        ],
      },
      tools: [
        { tool: 'contribution', verdict: 'best', why: 'Make-or-buy analysis, part of the toolkit’s contribution tool, compares the cost to make (fixed costs plus variable costs) with the cost to buy at the quantity needed.' },
        { tool: 'critical-path-analysis', verdict: 'weak', why: notThisTool('critical-path-analysis', 'There is no project schedule to plan; the question is a comparison of costs.') },
        { tool: 'decision-trees', verdict: 'fair', why: notThisTool('decision-trees', 'It could weigh the risk of late deliveries if their chances were known, but the first step is the comparison of the two costs.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The part is an input, not a product with a market share.') },
      ],
      analysis: {
        steps: [
          'Work out the cost to buy: the supplier’s price times the quantity.',
          'Work out the cost to make: the fixed costs plus the variable cost per part times the quantity.',
          'Compare them, then weigh the factors beyond cost: quality, reliability, control and the use of the business’s own capacity.',
        ],
        calc: {
          prompt: `Calculate the cost to make (CTM) ${num(q)} ${k.parts} a year.`,
          answer: ctm * K,
          dp: 0,
          tolerance: 0.5 * Math.max(1, K),
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? '\u00a0' : ''),
          suffix: '',
          working: ['Cost to make = fixed costs + (variable cost per unit × quantity)', `= ${m(fixedM)} + (${money(vcM * K, p, 2)} × ${num(q)})`, `= ${m(fixedM)} + ${m(tidy(vcM * q))} = ${m(ctm)}`, `Cost to buy = ${money(price * K, p, 2)} × ${num(q)} = ${m(ctb)}`],
          slips: [
            { value: tidy(vcM * q) * K, why: 'Add the fixed costs of the machine and operators: they are paid only if the business makes the part.' },
            { value: ctb * K, why: 'That is the cost to buy. The cost to make uses the business’s own fixed and variable costs.' },
            { value: tidy(fixedM + vcM) * K, why: 'Multiply the variable cost per part by the quantity before adding the fixed costs.' },
          ].filter((s, i, all) => Math.abs(s.value - ctm * K) > 0.5 * Math.max(1, K) && all.findIndex((x) => x.value === s.value) === i),
          meaning: `The cost to buy is ${m(ctb)}, so making ${make ? `saves ${m(tidy(ctb - ctm))}` : `costs ${m(tidy(ctm - ctb))} more`} a year.`,
        },
        model: [
          `Cost to make ${m(ctm)}; cost to buy ${m(ctb)}: ${make ? 'making is cheaper' : 'buying is cheaper'} by ${m(Math.abs(tidy(ctb - ctm)))}.`,
          Number.isFinite(qStar) ? `The two costs are equal at about ${num(Math.round(qStar))} ${k.parts} a year: above that, making is cheaper, because its fixed costs are spread over more parts.` : 'The supplier’s price is below the variable cost of making, so buying is cheaper at any quantity.',
          reliable ? 'The supplier is reliable, so buying carries little risk to production.' : 'The supplier is unreliable: late or faulty batches could stop production, a cost the figures leave out.',
        ],
      },
      recommend: {
        prompt: 'What should the business do?',
        choices: [
          (make ? best : !reliable ? fair : weak)(`Make the ${k.parts}`, make ? `It costs ${m(tidy(ctb - ctm))} a year less than buying${reliable ? '' : ', and it removes the risk of an unreliable supplier'}, and the business controls quality.` : reliable ? `It costs ${m(tidy(ctm - ctb))} a year more than buying from a reliable supplier.` : `It costs ${m(tidy(ctm - ctb))} a year more, but it avoids an unreliable supplier; defensible if a stoppage would cost more than the difference.`),
          (!make ? (reliable ? best : fair) : weak)(`Buy the ${k.parts} from the supplier`, !make ? (reliable ? `It costs ${m(tidy(ctm - ctb))} a year less than making, and the supplier is reliable.` : `It is ${m(tidy(ctm - ctb))} a year cheaper, but the supplier is late about one week in five; the saving may not survive a stoppage.`) : `Buying would cost ${m(tidy(ctb - ctm))} a year more than making them${reliable ? '' : ', from a supplier that is often late'}, with nothing in the evidence to justify paying more.`),
          (!make && !reliable ? best : fair)('Buy from the supplier, but keep a safety stock and find a second supplier', !make && !reliable ? `Buying is ${m(tidy(ctm - ctb))} a year cheaper; a safety stock and a second supplier protect production from the late deliveries.` : 'A sensible safeguard, though on these figures it is not the main choice.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the CTM and the CTB and one factor beyond cost.',
        criteria: ['Compares the cost to make with the cost to buy, with figures', 'Weighs a factor beyond cost, such as the supplier’s reliability or quality', 'Notes how the answer depends on the quantity needed'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder is most affected by the choice?',
          choices: [
            best(make ? 'The two operators the business would employ to make the part' : 'The supplier, who gains a large, regular order', make ? 'Making creates their jobs; buying would not.' : 'The order matters to the supplier’s business, and its reliability matters to yours.'),
            fair('Customers, if a problem with the part delays their orders', 'They feel the decision only if supply fails, which is why reliability matters.'),
            weak('The van dealer', 'The van is a separate purchase, unaffected by whether the part is made or bought.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best(make ? 'Demand falls, and the fixed costs of making are spread over fewer parts' : 'Late or faulty deliveries stop production', make ? `Below about ${Number.isFinite(qStar) ? num(Math.round(qStar)) : 'a certain number of'} parts a year, making becomes the dearer route.` : reliable ? 'Unlikely with this supplier’s record, but a safety stock would cover it.' : 'The supplier’s record makes this likely, which is why a safety stock and a second supplier matter.'),
            fair('The supplier raises its price next year', 'It would narrow or reverse the saving from buying; a fixed-price contract would limit it.'),
            weak('The canteen’s new breakfasts are unpopular', 'What the canteen serves has no bearing on the cost or supply of the part.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            Number.isFinite(qStar)
              ? best(`The quantity needed moving to the other side of about ${num(Math.round(qStar))} ${k.parts} a year`, 'The comparison depends on the quantity: fixed costs make the cost to make fall per part as the quantity rises.')
              : best('The supplier raising its price above the variable cost of making', 'While the supplier\u2019s price is below the variable cost of making, buying is cheaper at any quantity; only a higher price could change that.'),
            fair('The supplier offering a discount for a longer contract', 'It would lower the cost to buy, possibly enough to change the answer.'),
            weak('A cheaper van', 'The van has nothing to do with the part.'),
          ],
        },
      },
      model: {
        problem: `${name} must decide whether making its ${k.parts} costs less than buying them, and whether reliability and control change the answer.`,
        evidence: 'They give the costs of making, the supplier’s price and its record. The van and the canteen are distractors.',
        tool: 'Contribution, through make-or-buy analysis: the cost to make against the cost to buy.',
        analysis: `CTM ${m(ctm)} against CTB ${m(ctb)}; ${make ? 'making' : 'buying'} is cheaper by ${m(Math.abs(tidy(ctb - ctm)))}; the supplier is ${reliable ? 'reliable' : 'unreliable'}.`,
        recommendation: make ? `Make the ${k.parts}: it saves ${m(tidy(ctb - ctm))} a year and keeps control of quality.` : reliable ? `Buy the ${k.parts} from the supplier: it saves ${m(tidy(ctm - ctb))} a year, from a reliable source.` : `Buy the ${k.parts}, with a safety stock and a second supplier to cover late deliveries.`,
        evaluation: `${make ? 'The operators gain jobs' : 'The supplier gains an order'}; ${make ? 'falling demand' : 'unreliable deliveries'} is the risk; a different quantity would change the answer.`,
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const QUALITY = [
  { noun: 'Bakery', industry: 'Food and drink', what: 'a wholesale bakery', units: 'loaves', causes: ['Underbaked', 'Misshapen', 'Wrong labels', 'Damaged in packing'] },
  { noun: 'Print Works', industry: 'Manufacturing', what: 'a commercial printer', units: 'print jobs', causes: ['Colour out of register', 'Smudged ink', 'Wrong paper', 'Cut out of line'] },
  { noun: 'Furniture', industry: 'Manufacturing', what: 'a chair factory', units: 'chairs', causes: ['Loose joints', 'Scratched finish', 'Wrong fabric', 'Damaged in packing'] },
  { noun: 'Electronics', industry: 'Technology', what: 'a maker of headphones', units: 'headsets', causes: ['Faulty soldering', 'Scratched casing', 'Missing parts', 'Damaged in packing'] },
];

const qualityDefects: Family = {
  id: 'defect-rate',
  unit: 5,
  subtopics: ['5.3', '5.6'],
  tool: 'descriptive-statistics',
  level: 'HL',
  title: 'Why are defects rising?',
  summary: 'The defect rate is climbing; the pattern of causes decides whether to fix one process or change the whole approach to quality.',
  industries: ['Food and drink', 'Manufacturing', 'Technology'],
  quantitative: true,
  make(r) {
    const k = r.pick(QUALITY);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 80, 300);
    const concentrated = r.chance(0.5);
    const output = Array.from({ length: 4 }, () => r.step(4000, 6000, 100));
    const rates = [r.int(15, 22) / 10, r.int(22, 28) / 10, r.int(28, 34) / 10, r.int(34, 42) / 10];
    const defects = output.map((o, i) => Math.round((o * rates[i]!) / 100));
    const last = 3;
    const rate = tidy((defects[last]! / output[last]!) * 100);
    const shares = concentrated ? [r.int(58, 70), 0, 0, 0] : [r.int(24, 30), r.int(22, 27), r.int(20, 25), 0];
    if (concentrated) {
      shares[1] = r.int(12, 18);
      shares[2] = r.int(8, 12);
    }
    shares[3] = 100 - shares[0]! - shares[1]! - shares[2]!;
    const top = k.causes[0]!;
    return {
      title: `${name}: why are defects rising?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the operations manager of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. Over the last four weeks the share of ${k.units} rejected has risen, and a large customer has complained.`,
        'Today, inspectors check finished products and reject the faulty ones (quality control). The manager wants to know where the defects come from, and whether to fix one process or change how the whole business manages quality.',
      ],
      question: `How should ${name} deal with its rising defects?`,
      problem: {
        prompt: 'What is the problem the manager must solve?',
        choices: [
          best('Finding where the defects come from, so that the response prevents them rather than catching them at the end', 'The defect rate is rising; whether the cause is one process or spread across the business decides the right approach to quality.'),
          fair('A large customer has complained', 'The complaint makes the problem urgent, but it is a consequence of the defects, not their cause.'),
          weak('Employing more inspectors', 'More inspection catches more faults at the end; it does not stop them being made.'),
          weak('Ordering new uniforms for the inspectors', 'A distractor in the pack: uniforms do not change why products are faulty.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Output and rejects', true, 'Output and rejects give the defect rate and its trend.', ['Week', 'Units made', 'Units rejected'], output.map((o, i) => [`Week ${i + 1}`, num(o), num(defects[i]!)]), 'Simulated data.'),
          table('Rejects by cause, last four weeks', true, 'The share of each cause shows whether one process or many are at fault.', ['Cause', 'Share of rejects'], k.causes.map((c, i) => [c, `${shares[i]}%`]), 'Simulated data.'),
          text('Note from the line supervisors', true, 'It suggests why the defects arise, which the response must address.', concentrated ? `Most rejects come from one stage, where the equipment is old and the procedure has never been written down. (Simulated.)` : 'Faults turn up at every stage; staff say quality is the inspectors’ job, and problems are rarely raised until the end. (Simulated.)'),
          text('Uniform catalogue', false, 'Uniforms do not affect why products are faulty.', 'New uniforms for inspectors in high-visibility colours.'),
          text('Notice: the car park lighting', false, 'Lighting in the car park is unrelated to the defects.', 'New lights will be fitted in the car park this weekend.'),
        ],
      },
      tools: [
        { tool: 'descriptive-statistics', verdict: 'best', why: 'The evidence is data on output and rejects: the defect rate, its trend and the share of each cause (the mode, a bar chart) show where the problem lies.' },
        { tool: 'force-field-analysis', verdict: 'fair', why: notThisTool('force-field-analysis', 'Useful later, to plan a change in how quality is managed, but first the data must show what is wrong.') },
        { tool: 'critical-path-analysis', verdict: 'weak', why: notThisTool('critical-path-analysis', 'The problem is faults in production, not a project’s schedule.') },
        { tool: 'ansoff-matrix', verdict: 'weak', why: notThisTool('ansoff-matrix', 'Growth options have nothing to do with faulty products.') },
      ],
      analysis: {
        steps: [
          'Calculate the defect rate for the latest week, and compare it with the earlier weeks.',
          'Find the most common cause, and how much of the total it accounts for.',
          'Match the pattern to an approach: quality control at the end, quality assurance in a process, or total quality management across the business.',
        ],
        calc: {
          prompt: 'Calculate the defect rate in week 4, as a percentage to one decimal place.',
          answer: roundTo(rate, 1),
          dp: 1,
          tolerance: 0.06,
          prefix: '',
          suffix: '%',
          working: ['Defect rate = units rejected ÷ units made × 100', `= ${num(defects[last]!)} ÷ ${num(output[last]!)} × 100`, `= ${num(rate, 1)}%`],
          slips: [
            { value: roundTo((defects[last]! / (output[last]! - defects[last]!)) * 100, 1), why: 'Divide by all the units made, including the rejects, not by the good ones.' },
            { value: roundTo(output[last]! / defects[last]!, 1), why: 'The division is upside down: rejects go on top.' },
            { value: defects[last]!, why: 'That is the number of rejects; the rate divides it by the units made and multiplies by 100.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(rate, 1)) > 0.06 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Up from ${num(tidy((defects[0]! / output[0]!) * 100), 1)}% in week 1.`,
        },
        model: [
          `Defect rate ${num(rate, 1)}% in week 4, up from ${num(tidy((defects[0]! / output[0]!) * 100), 1)}% in week 1.`,
          concentrated ? `One cause, “${top.toLowerCase()}”, accounts for ${shares[0]}% of rejects: the problem sits in one process.` : `No cause accounts for more than ${Math.max(...shares)}% of rejects: faults arise across the business.`,
          'Inspection at the end (quality control) finds faults after the cost of making them has been paid; quality assurance builds quality into each process; total quality management makes it everyone’s job.',
        ],
      },
      recommend: {
        prompt: 'Which approach should the manager take?',
        choices: [
          (concentrated ? best : fair)(`Fix the process behind “${top.toLowerCase()}”: write a standard procedure, train the operators and repair the equipment (quality assurance)`, concentrated ? `It targets the cause of ${shares[0]}% of the rejects at its source, so fewer faults are made in the first place.` : `It would help, but this cause accounts for only ${shares[0]}% of the rejects; the faults arise everywhere.`),
          (concentrated ? fair : best)('Introduce total quality management: train every team to check its own work, and set up quality circles', concentrated ? 'A worthy long-term aim, but the data shows one process is the main problem, which can be fixed sooner and more cheaply.' : `Faults arise at every stage and staff see quality as the inspectors’ job: only a change in how everyone works will bring the rate down.`),
          weak('Add more inspectors at the end of the line (quality control)', 'More inspection catches more faults, but they are still made, and still cost money, before they are rejected.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the defect rate and the pattern of causes.',
        criteria: ['Uses the defect rate and its trend, with figures', 'Uses the pattern of causes to choose between fixing one process and changing the whole approach', 'Distinguishes catching faults (quality control) from preventing them (quality assurance, TQM)'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder is hurt most if the defects continue?',
          choices: [
            best('Customers, who receive faulty products or late orders', 'Faults that pass inspection reach customers, and rejects delay orders; the complaint shows it is already happening.'),
            fair('The owners, who pay for wasted materials and time', 'Rejects cost money, but the damage to customers’ trust can cost more.'),
            weak('The lighting contractor', 'A distractor: the contractor is paid for the lights whatever the defect rate.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best(concentrated ? 'Fixing one process hides the next problem, because nothing else changes' : 'TQM takes time, and the defect rate stays high while the culture changes', concentrated ? 'Once the main cause is fixed, another may become the biggest; the rate should be watched by cause.' : 'A change in culture is slow; some quick fixes on the worst stage can run alongside it.'),
            fair('Staff resist new procedures', 'Likely at first, which involving them in writing the procedures reduces.'),
            weak('The new uniforms do not fit', 'Uniforms have no bearing on the defects.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(concentrated ? 'New data showing the faults spread across every stage' : 'New data showing one stage causes most of the faults', 'The choice between fixing a process and changing the whole approach rests on the pattern of causes.'),
            fair('The complaining customer cancelling its contract', 'It would raise the urgency, not change the cause.'),
            weak('Cheaper car park lighting', 'Car park lighting has nothing to do with where the defects come from.'),
          ],
        },
      },
      model: {
        problem: `${name} must find where its rising defects come from and prevent them, rather than catch them at the end.`,
        evidence: 'They give output and rejects, the causes of the rejects and the supervisors’ note. The uniforms and the lighting are distractors.',
        tool: 'Descriptive statistics: the defect rate, its trend and the share of each cause.',
        analysis: `Defect rate ${num(rate, 1)}% and rising; ${concentrated ? `one cause accounts for ${shares[0]}% of rejects` : 'the causes are spread across the business'}.`,
        recommendation: concentrated ? `Quality assurance on the process behind “${top.toLowerCase()}”.` : 'Total quality management, with quality circles, across the business.',
        evaluation: `Customers are hurt most; ${concentrated ? 'the next cause may surface' : 'the culture takes time to change'}; a different pattern of causes would change the answer.`,
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const REFIT = [
  { noun: 'Bistro', industry: 'Hospitality', what: 'a restaurant', reopen: 'reopen for the festival weekend' },
  { noun: 'Books', industry: 'Retail', what: 'a bookshop', reopen: 'reopen before the new school term' },
  { noun: 'Hotel', industry: 'Hospitality', what: 'a hotel lobby and bar', reopen: 'reopen before the conference season' },
  { noun: 'Gym', industry: 'Sport and leisure', what: 'a gym', reopen: 'reopen for the new year rush' },
];

const refitProject: Family = {
  id: 'refit-project',
  unit: 5,
  subtopics: ['5.1', '5.6'],
  tool: 'critical-path-analysis',
  level: 'HL',
  title: 'Will the refit finish in time?',
  summary: 'A refit has activities that depend on one another and a fixed reopening date; the critical path shows what must not slip.',
  industries: ['Hospitality', 'Retail', 'Sport and leisure'],
  quantitative: true,
  make(r) {
    const k = r.pick(REFIT);
    const p = place(r);
    const name = businessName(r, k.noun);
    const dA = r.int(2, 4);
    const dB = r.int(4, 7);
    let dC = r.int(3, 6);
    if (dB === dC) dC = dB - 1;
    const dD = r.int(3, 5);
    const dE = r.int(4, 6);
    const efE = dA + Math.max(dB, dC) + dD + dE;
    const dF = r.int(Math.max(6, efE - 8), efE - 2);
    const dG = r.int(2, 3);
    const duration = Math.max(efE, dF) + dG;
    const longBC = dB > dC ? 'B' : 'C';
    const shortBC = longBC === 'B' ? 'C' : 'B';
    const floatBC = Math.abs(dB - dC);
    const floatF = efE - dF;
    // With second teams on the longer of B and C and on E, each two days shorter.
    const efE2 = dA + Math.max(Math.max(dB, dC) - 2, Math.min(dB, dC)) + dD + (dE - 2);
    const faster = Math.max(efE2, dF) + dG;
    const feasible = r.chance(0.5);
    const deadline = feasible ? duration + r.int(0, 2) : duration - r.int(1, Math.min(3, duration - faster));
    const NAMES: Record<string, string> = { A: 'Strip out the old fittings', B: 'New electrics', C: 'New plumbing', D: 'Lay the floor', E: 'Decorate', F: 'Order and deliver the furniture', G: 'Fit the furniture' };
    const crit = `A, ${longBC}, D, E and G`;
    return {
      title: `${name}: will the refit finish in time?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: 'a small business with 20 staff',
      role: `You manage the refit of ${name}.`,
      brief: [
        `${name}, ${k.what} in ${p.city}, ${p.country}, is closing for a refit and wants to ${k.reopen}, ${deadline} working days from the start.`,
        'The contractor has listed the activities, how long each takes and which must wait for others. The owner asks whether the date can be met and, if not, what to speed up.',
      ],
      question: `Can ${name} ${k.reopen}, and what should it speed up if not?`,
      problem: {
        prompt: 'What is the problem you must solve?',
        choices: [
          best('Finding the shortest time the refit can take, and which activities would delay it if they slipped', 'The reopening date is fixed; the network of activities decides whether it can be met and where extra effort would help.'),
          fair('The contractor’s list is long', 'The length of the list matters less than the order of the activities: many can run at the same time.'),
          weak('Choosing the colour scheme', 'Colours are chosen within the decorating activity; they do not decide the schedule.'),
          weak('Cutting the cost of the furniture', 'Cost is not the question here; the reopening date is, and it depends on time.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Activities', true, 'Durations and dependencies are what the network is built from.', ['Activity', 'Description', 'Days', 'Must follow'], [['A', NAMES.A!, String(dA), 'None'], ['B', NAMES.B!, String(dB), 'A'], ['C', NAMES.C!, String(dC), 'A'], ['D', NAMES.D!, String(dD), 'B and C'], ['E', NAMES.E!, String(dE), 'D'], ['F', NAMES.F!, String(dF), 'None'], ['G', NAMES.G!, String(dG), 'E and F']], 'Simulated estimates in working days.'),
          text('The reopening date', true, 'The deadline the project duration is tested against.', `The ${k.reopen.replace(/^reopen /, '')} begins ${deadline} working days after work starts. (Simulated.)`),
          text('Contractor’s note on extra teams', true, 'It says which activities could be speeded up, and at what cost.', `A second team could shorten the electrics, the plumbing or the decorating by two days each, at extra cost; the furniture supplier can deliver three days sooner for a fee. (Simulated.)`),
          text('Colour samples', false, 'Choosing colours does not change how long the activities take.', 'Six paint samples have arrived; the owner prefers the dark green.'),
          text('Staff rota during the closure', false, 'Who works where during the closure is unrelated to the refit’s schedule.', 'Staff will work at the other site or take paid leave while the refit runs.'),
        ],
      },
      tools: [
        { tool: 'critical-path-analysis', verdict: 'best', why: 'The refit has activities that depend on one another and a fixed date: critical path analysis gives the shortest duration, the activities that cannot slip and the float in the others.' },
        { tool: 'gantt-chart', verdict: 'fair', why: notThisTool('gantt-chart', 'It would show the schedule, but critical path analysis also gives each activity’s float, which decides what is worth speeding up.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'The durations are estimates, not outcomes with probabilities.') },
        { tool: 'force-field-analysis', verdict: 'weak', why: notThisTool('force-field-analysis', 'Nothing here is about resistance to change; the question is the schedule.') },
      ],
      analysis: {
        steps: [
          'Work forwards through the network: each activity’s earliest finish is its earliest start plus its duration, and an activity starts when all the activities it follows have finished.',
          'The latest earliest finish is the project’s minimum duration; the activities with no float form the critical path.',
          'Compare the duration with the reopening date, and speed up only activities on the critical path.',
        ],
        calc: {
          prompt: 'Calculate the minimum duration of the refit, in working days.',
          answer: duration,
          dp: 0,
          tolerance: 0.4,
          prefix: '',
          suffix: ' days',
          working: [
            `A finishes on day ${dA}; B on day ${dA + dB}; C on day ${dA + dC}.`,
            `D starts when both B and C are done, on day ${dA + Math.max(dB, dC)}, and finishes on day ${dA + Math.max(dB, dC) + dD}; E finishes on day ${efE}.`,
            `F (from the start) finishes on day ${dF}; G starts when E and F are done, on day ${Math.max(efE, dF)}, and finishes on day ${duration}.`,
          ],
          slips: [
            { value: dA + dB + dC + dD + dE + dF + dG, why: 'That adds every activity end to end; activities that do not depend on each other run at the same time.' },
            { value: dA + Math.min(dB, dC) + dD + dE + dG, why: 'D must wait for both B and C, so the longer of the two decides when it starts.' },
            { value: efE, why: 'That is when decorating ends; the furniture must still be fitted, activity G.' },
          ].filter((s, i, all) => Math.abs(s.value - duration) > 0.4 && all.findIndex((x) => x.value === s.value) === i),
          meaning: duration <= deadline ? `The reopening is ${deadline} days from the start, so the refit fits${deadline === duration ? ' with no days to spare' : ` with ${deadline - duration} to spare`}.` : `The reopening is ${deadline} days from the start: the refit would be ${duration - deadline} ${duration - deadline === 1 ? 'day' : 'days'} late.`,
        },
        model: [
          `Minimum duration ${duration} days; the critical path is ${crit}.`,
          `${shortBC} (${NAMES[shortBC]!.toLowerCase()}) has ${floatBC} ${floatBC === 1 ? 'day' : 'days'} of float, and F (the furniture) has ${floatF}: speeding them up would not shorten the project.`,
          duration <= deadline ? 'The project meets the date; the critical activities must be watched, because any delay in them delays the reopening.' : `To meet the date, ${duration - deadline} ${duration - deadline === 1 ? 'day' : 'days'} must come off the critical path, for example with a second team on ${longBC} or E.`,
        ],
      },
      recommend: {
        prompt: 'What should you recommend to the owner?',
        choices: [
          (duration <= deadline ? best : weak)('Keep the plan and watch the critical activities closely', duration <= deadline ? `The refit takes ${duration} days, within the ${deadline} available; any slip on ${crit} would delay the reopening, so those need the closest watch.` : `The refit takes ${duration} days, longer than the ${deadline} available: without speeding something up, the date will be missed.`),
          (duration <= deadline ? fair : best)(`Pay for a second team on the ${longBC === 'B' ? 'electrics' : 'plumbing'} and on the decorating`, duration <= deadline ? 'It would build in slack, at extra cost, for a project that already meets its date.' : `Both are on the critical path, so shortening them brings the refit down to ${faster} days, enough to meet the date of day ${deadline}.`),
          weak('Pay the supplier to deliver the furniture three days sooner', `The furniture is not on the critical path: it has ${floatF} days of float, so delivering sooner would not shorten the refit at all.`),
          weak(`Add a second team to the ${shortBC === 'B' ? 'electrics' : 'plumbing'}`, `${shortBC} has ${floatBC} ${floatBC === 1 ? 'day' : 'days'} of float: speeding it up would not change the finish, because the floor must still wait for ${longBC}.`),
        ],
        justify: 'Justify your choice in two or three sentences, using the duration and the critical path.',
        criteria: ['States the minimum duration and the deadline', 'Names the critical path and explains why only critical activities are worth speeding up', 'Uses float to rule out a tempting but useless option'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder loses most if the reopening is late?',
          choices: [
            best('Customers who planned around the reopening, and the revenue they bring', `The date was chosen to ${k.reopen.replace(/^reopen /, '')}; a late reopening loses the busiest days of trade.`),
            fair('The contractor, who may face a penalty', 'Possible if the contract has one, but the business loses the trading days.'),
            weak('The paint supplier', 'The paint is bought and paid for whatever date the business reopens.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk the network does not show?',
          choices: [
            best('The durations are estimates; a delay on any critical activity moves the reopening', `The critical path has no float: a single day lost on ${crit} is a day lost on the whole project.`),
            fair('A non-critical activity overruns by more than its float', 'Then it would join the critical path; float is a cushion, not a guarantee.'),
            weak('The owner changes the colour scheme', 'A change of colour does not change the activities’ durations.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(`A critical activity taking ${Math.max(1, deadline - duration + 1)} ${Math.max(1, deadline - duration + 1) === 1 ? 'day' : 'days'} more than planned`, duration <= deadline ? 'It would use up the spare days and push the reopening back.' : 'It would widen the gap the second teams must close.'),
            fair(`The furniture delivery taking ${floatF + 1} days longer`, 'Only then would the furniture join the critical path; within its float it does not matter.'),
            weak('Cheaper paint', 'The price of paint does not change the schedule.'),
          ],
        },
      },
      model: {
        problem: `${name} must know the shortest time its refit can take and which activities must not slip, to ${k.reopen}.`,
        evidence: 'They give the activities with their durations and dependencies, the reopening date and the options to speed up. The colours and the rota are distractors.',
        tool: 'Critical path analysis, which gives the minimum duration, the critical path and the float.',
        analysis: `Minimum duration ${duration} days against ${deadline} available; the critical path is ${crit}; ${shortBC} and F have float.`,
        recommendation: duration <= deadline ? 'Keep the plan and watch the critical activities.' : `Put second teams on ${longBC} and E, which are on the critical path.`,
        evaluation: 'Customers lose most from a late reopening; any slip on the critical path delays it; a longer critical activity would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const JIT = [
  { noun: 'Components', industry: 'Manufacturing', what: 'a maker of car seats', stock: 'fabric, foam and frames' },
  { noun: 'Electronics', industry: 'Technology', what: 'an assembler of laptops for schools', stock: 'screens, boards and batteries' },
  { noun: 'Garments', industry: 'Fashion', what: 'a clothing manufacturer', stock: 'cloth, thread and buttons' },
  { noun: 'Kitchens', industry: 'Manufacturing', what: 'a maker of fitted kitchens', stock: 'board, worktops and handles' },
];

const jitSwitch: Family = {
  id: 'just-in-time',
  unit: 5,
  subtopics: ['5.3', '5.6'],
  tool: 'force-field-analysis',
  level: 'HL',
  title: 'Just in time, or just in case?',
  summary: 'Switching to just-in-time stock would save holding costs, but depends on suppliers that deliver on time.',
  industries: ['Manufacturing', 'Technology', 'Fashion'],
  quantitative: true,
  make(r) {
    const k = r.pick(JIT);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 120, 500);
    const K = 1000 * p.k;
    const stockNow = r.step(400, 900, 50);
    const stockJit = Math.round(stockNow * (r.int(20, 35) / 100) / 10) * 10;
    const hold = r.pick([15, 18, 20, 25]);
    const saving = tidy(((stockNow - stockJit) * hold) / 100);
    const reliable = r.chance(0.5);
    const onTime = reliable ? r.int(97, 99) : r.int(78, 86);
    const m = (v: number) => money(v * K, p);
    return {
      title: `${name}: just in time, or just in case?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the operations director of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. It keeps large stocks of ${k.stock} just in case (JIC), so that production never stops.`,
        'The director proposes switching to just-in-time (JIT): small, frequent deliveries timed to production. The board wants to know what it would save and what could stop it working.',
      ],
      question: `Should ${name} switch from just-in-case to just-in-time stock?`,
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          best('Whether the savings of just-in-time outweigh the risk that late deliveries stop production', 'JIT saves the cost of holding stock but removes the buffer against late deliveries; the decision weighs one against the other.'),
          fair('Stock-holding costs are high', 'They are the reason to consider JIT, not the whole decision.'),
          weak('The warehouse needs repainting', 'A distractor in the pack: decorating does not change how stock is managed.'),
          weak('Choosing a new logo for the delivery boxes', 'A distractor: logos do not affect how stock is managed.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Stock and its cost', true, 'The average stock under each system and the cost of holding it give the saving.', ['Item', 'Figure'], [['Average stock held now (JIC)', m(stockNow)], ['Average stock expected under JIT', m(stockJit)], ['Cost of holding stock a year (storage, insurance, waste, capital)', `${hold}% of its value`]], 'Simulated estimates.'),
          text('Supplier delivery record', true, 'JIT depends on deliveries arriving on time; this is the main restraining force.', `Over the last year, ${onTime}% of deliveries from the main suppliers arrived on the day promised. (Simulated.)`),
          table('Forces for and against JIT', true, 'The driving and restraining forces, as rated by the managers.', ['Force', 'For or against', 'Strength (1 to 5)'], [['Lower holding costs', 'For', '4'], ['Space freed for production', 'For', '3'], ['Less waste from out-of-date stock', 'For', '3'], ['Risk of late deliveries stopping production', 'Against', reliable ? '2' : '5'], ['Staff unfamiliar with JIT', 'Against', '3'], ['Cost of more frequent deliveries', 'Against', '2']], 'Simulated ratings from a management workshop.'),
          text('Quote: repainting the warehouse', false, 'Decorating the warehouse does not bear on the stock system.', 'The warehouse can be repainted over two weekends.'),
          text('Designer’s note: box logo', false, 'Packaging design is unrelated to the decision.', 'A fresh logo for the delivery boxes, in the brand’s colours.'),
        ],
      },
      tools: [
        { tool: 'force-field-analysis', verdict: 'best', why: 'Switching to JIT is a change with forces for it (savings, space, less waste) and against it (supplier reliability, staff skills): force field analysis weighs them and shows which restraining force to weaken.' },
        { tool: 'decision-trees', verdict: 'fair', why: notThisTool('decision-trees', 'It could weigh the cost of a stoppage if its probability were known, but it would miss the other forces, such as staff skills.') },
        { tool: 'critical-path-analysis', verdict: 'weak', why: notThisTool('critical-path-analysis', 'There is no project to schedule; the question is whether to change the stock system.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'Product portfolios are not in question.') },
      ],
      analysis: {
        steps: [
          'Calculate the annual saving in holding costs: the fall in average stock times the holding cost rate.',
          'Total the driving and restraining forces, and find the strongest restraining force.',
          'Decide whether that force can be weakened before the switch, for example by changing suppliers or keeping a small buffer.',
        ],
        calc: {
          prompt: 'Calculate the annual saving in stock-holding costs from switching to JIT.',
          answer: saving * K,
          dp: 0,
          tolerance: 0.5 * K,
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? '\u00a0' : ''),
          suffix: '',
          working: [`Fall in average stock = ${m(stockNow)} − ${m(stockJit)} = ${m(stockNow - stockJit)}`, `Saving = ${m(stockNow - stockJit)} × ${hold}% = ${m(saving)}`],
          slips: [
            { value: tidy((stockNow * hold) / 100) * K, why: 'That is the cost of holding the current stock. The saving is the cost of the stock that would no longer be held: the difference.' },
            { value: (stockNow - stockJit) * K, why: 'That is the fall in stock. Multiply it by the holding cost rate to find the saving.' },
            { value: tidy((stockJit * hold) / 100) * K, why: 'That is the cost of holding the JIT stock, which is still paid; the saving is on the stock no longer held.' },
          ].filter((s, i, all) => Math.abs(s.value - saving * K) > 0.5 * K && all.findIndex((x) => x.value === s.value) === i),
          meaning: `A saving of ${m(saving)} a year, if production never stops for want of a delivery.`,
        },
        model: [
          `Saving: (${m(stockNow)} − ${m(stockJit)}) × ${hold}% = ${m(saving)} a year.`,
          `Forces for JIT total 10; forces against total ${reliable ? 7 : 10}. The strongest restraining force is ${reliable ? 'staff unfamiliar with JIT (3)' : 'the risk of late deliveries (5)'}.`,
          reliable ? `Suppliers deliver on time ${onTime}% of the time, so the main JIT risk is small; training staff weakens the strongest remaining force.` : `Suppliers deliver on time only ${onTime}% of the time: under JIT, a late delivery would stop production, which could cost more than the saving.`,
          'The force ratings are the managers’ judgements, not measurements.',
        ],
      },
      recommend: {
        prompt: 'What should the board decide?',
        choices: [
          (reliable ? best : weak)('Switch to JIT across the factory, with training for staff', reliable ? `It saves ${m(saving)} a year, suppliers deliver on time ${onTime}% of the time, and training weakens the strongest remaining restraining force.` : `Suppliers are late too often (${onTime}% on time): a full switch would expose production to stoppages that could cost more than the ${m(saving)} saving.`),
          (reliable ? fair : best)('Pilot JIT with the most reliable suppliers, keeping buffer stock for the rest', reliable ? 'Cautious, but the suppliers are reliable and the full saving is within reach.' : `It captures part of the ${m(saving)} saving while weakening the strongest restraining force, unreliable deliveries, and keeps a buffer where the risk is greatest.`),
          weak('Keep just-in-case stock unchanged', `It gives up a saving of ${m(saving)} a year without trying to weaken the forces against the change.`),
        ],
        justify: 'Justify your choice in two or three sentences, using the saving and the strongest restraining force.',
        criteria: ['Uses the saving, with the figure', 'Names the strongest restraining force and how the choice deals with it', 'Weighs the cost of a stoppage against the saving'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder becomes most important to the business under JIT?',
          choices: [
            best('Suppliers, whose punctuality now decides whether production runs', 'With no buffer stock, a late delivery stops the line: JIT ties the business closely to its suppliers.'),
            fair('Production staff, who must work to tighter schedules', 'Their routines change, and training matters, but the dependence is on the suppliers.'),
            weak('The decorators', 'A distractor with no stake in the stock system.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best('A disruption to supply, such as a strike or a storm, stops production with no stock to fall back on', 'JIT removes the buffer; contingency stock for the most critical items limits the damage.'),
            fair('More frequent deliveries cost more than expected', 'It would eat into the saving, which a delivery contract would settle.'),
            weak('The box logo is unpopular', 'Packaging has no bearing on the stock system.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(reliable ? 'Suppliers’ punctuality falling sharply' : 'Suppliers’ punctuality rising to near 99%', 'Supplier reliability is the force that decides whether JIT is safe; a change in it changes the answer.'),
            fair('The holding cost rate rising', 'It would make the saving larger and strengthen the case for JIT.'),
            weak('A cheaper quote for the repainting', 'Decorating costs have nothing to do with the stock system.'),
          ],
        },
      },
      model: {
        problem: `${name} must decide whether the savings of JIT outweigh the risk that late deliveries stop production.`,
        evidence: 'They give the stock and its holding cost, the suppliers’ record and the forces. The repainting and the logo are distractors.',
        tool: 'Force field analysis, weighing the forces for and against the switch.',
        analysis: `Saving ${m(saving)} a year; forces 10 for and ${reliable ? 7 : 10} against; suppliers ${onTime}% on time.`,
        recommendation: reliable ? 'Switch to JIT across the factory, with training.' : 'Pilot JIT with the most reliable suppliers, keeping buffer stock for the rest.',
        evaluation: 'Suppliers become critical; a supply disruption is the risk; a change in suppliers’ punctuality would change the answer.',
      },
    };
  },
};

export const UNIT5: Family[] = [productionMethod, relocation, makeOrBuy, qualityDefects, refitProject, jitSwitch];
