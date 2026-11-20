/**
 * Unit 1 families: growth routes (Ansoff matrix), entering a region by
 * franchising or by its own outlets (decision trees), a second site (SWOT),
 * a start-up's funding (business plan) and a circular model (circular
 * business models). Every business is fictional and every figure simulated.
 */
import { an, best, businessName, fair, money, notThisTool, pct, place, roundTo, sized, table, text, tidy, weak } from '../kit';
import type { Family } from '../types';

/* ------------------------------------------------------------------ */

const GROWTH = [
  {
    noun: 'Dairy',
    industry: 'Food and drink',
    makes: 'yoghurt and soft cheese',
    sellsTo: 'supermarkets in its home region',
    pen: 'Offer the supermarkets it already supplies a bulk discount and in-store tastings',
    prod: 'Launch a plant-based yoghurt range for the same supermarkets',
    mkt: 'Sell its existing yoghurts to supermarkets in a neighbouring region',
    div: 'Open a chain of breakfast cafés',
    divShort: 'Breakfast cafés',
    newProduct: 'the plant-based range',
    region: 'the neighbouring region',
    users: 'Shoppers',
  },
  {
    noun: 'Soap Works',
    industry: 'Consumer goods',
    makes: 'natural soaps and creams',
    sellsTo: 'gift shops across its own country',
    pen: 'Give the gift shops it already supplies larger displays and a reorder discount',
    prod: 'Launch a men’s grooming range for the same gift shops',
    mkt: 'Sell its existing soaps online to customers in other countries',
    div: 'Open a day spa',
    divShort: 'A day spa',
    newProduct: 'the grooming range',
    region: 'customers abroad',
    users: 'Gift buyers',
  },
  {
    noun: 'Cycles',
    industry: 'Retail',
    makes: 'city bicycles of its own design',
    sellsTo: 'commuters in its home city',
    pen: 'Run a trade-in offer for commuters who already ride its bikes',
    prod: 'Launch electric cargo bikes for the same commuters',
    mkt: 'Open a showroom selling its existing bikes in a second city',
    div: 'Start a bicycle courier service',
    divShort: 'A courier service',
    newProduct: 'the cargo bikes',
    region: 'the second city',
    users: 'Commuters',
  },
  {
    noun: 'Tea Company',
    industry: 'Food and drink',
    makes: 'blended loose-leaf teas',
    sellsTo: 'cafés and restaurants',
    pen: 'Offer its café and restaurant customers a price for buying in bulk',
    prod: 'Launch bottled iced teas for the same cafés and restaurants',
    mkt: 'Sell its existing teas to hotel chains',
    div: 'Open a tea-tasting tour business',
    divShort: 'Tea-tasting tours',
    newProduct: 'the iced teas',
    region: 'the hotel market',
    users: 'Café customers',
  },
];

const growthRoute: Family = {
  id: 'growth-route',
  unit: 1,
  subtopics: ['1.5', '4.2'],
  tool: 'ansoff-matrix',
  level: 'SL/HL',
  title: 'Which way to grow?',
  summary: 'A business with four growth ideas must choose one; the state of its home market decides which.',
  industries: ['Food and drink', 'Consumer goods', 'Retail'],
  quantitative: false,
  make(r) {
    const k = r.pick(GROWTH);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 25, 140);
    const saturated = r.chance(0.5);
    const g = saturated ? r.pick([0, 0.5, 1, 1.5]) : r.pick([5, 6, 7, 8]);
    const share = saturated ? r.int(28, 40) : r.int(6, 12);
    const m0 = r.step(8, 20, 1) * 1_000_000 * p.k;
    const mkt = [m0, m0 * (1 + g / 100), m0 * (1 + g / 100) ** 2].map((x) => Math.round(x / 10_000) * 10_000);
    const ours = mkt.map((x) => Math.round((x * share) / 100 / 10_000) * 10_000);
    const cost = { pen: r.step(20, 40, 5), prod: r.step(120, 200, 10), mkt: r.step(90, 160, 10), div: r.step(400, 700, 50) };
    const c = (v: number) => money(v * 1000 * p.k, p);
    const survey = r.int(18, 34);
    const best_ = saturated ? 'mkt' : 'pen';
    const shareLine = saturated ? `the home market grew by only ${pct(g, 1)} a year and ${name} already holds ${share}% of it` : `the home market is growing by ${pct(g)} a year and ${name} holds only ${share}% of it`;
    return {
      title: `${name}: which way to grow?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the owners of ${name}.`,
      brief: [
        `${name} is ${an(size.words)} in ${p.city}, ${p.country}, with ${size.staff} staff. It makes ${k.makes} and sells them to ${k.sellsTo}. Sales have grown slowly for three years, and the owners want them a fifth higher within three years.`,
        `Four ideas are on the table: ${k.pen.charAt(0).toLowerCase() + k.pen.slice(1)}; ${k.prod.charAt(0).toLowerCase() + k.prod.slice(1)}; ${k.mkt.charAt(0).toLowerCase() + k.mkt.slice(1)}; or ${k.div.charAt(0).toLowerCase() + k.div.slice(1)}. The business can fund one of them.`,
      ],
      question: `Which route to growth should ${name} take?`,
      problem: {
        prompt: 'What is the problem the owners must solve?',
        choices: [
          best('Choosing the direction of growth that meets the owners’ target at a risk the business can carry', 'This is the decision in front of the owners: four routes are open, they differ in risk and cost, and the evidence on the home market can settle which fits.'),
          fair('Sales at home are growing too slowly', 'True, and it is why the owners want to act, but it is the symptom. The problem to solve is which route to take, and slow sales alone do not say which.'),
          weak('Deciding whether to grow by a merger or an acquisition', 'That is a question about the method of growth. None of the four ideas is a merger or an acquisition: the choice here is the direction, which products for which markets.'),
          weak('Updating the livery on the delivery vans', 'The livery is a distractor in the evidence pack. It costs little and says nothing about where growth should come from.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table(
            'The home market',
            true,
            `It shows how fast the home market is growing and how much of it ${name} already holds, which decides whether there is room to grow at home.`,
            ['Year', 'Market sales', 'Its sales', 'Its share'],
            [0, 1, 2].map((i) => [`Year ${i + 1}`, money(mkt[i]!, p), money(ours[i]!, p), `${share}%`]),
            'Simulated data. Year 3 is the latest.',
          ),
          table(
            'What each idea would take',
            true,
            'It gives the cost and the wait for each route, which a business of this size must weigh against the risk.',
            ['Idea', 'Set-up cost', 'Time to first sales'],
            [
              ['Discount and tastings', c(cost.pen), '1 month'],
              [`${k.newProduct.charAt(0).toUpperCase()}${k.newProduct.slice(1)}`, c(cost.prod), '9 months'],
              [`Existing range, ${k.region}`, c(cost.mkt), '4 months'],
              [k.divShort, c(cost.div), '12 months'],
            ],
            'Simulated data: the operations manager’s estimates.',
          ),
          text('Survey of current customers', true, `It shows how much interest there is in ${k.newProduct}, the evidence on the risk of product development.`, `Asked about ${k.newProduct}, ${survey}% of the business’s current buyers said they would probably order it; the rest said they would wait to see how it sold elsewhere. (Simulated survey of 40 buyers.)`),
          text('Email from the office manager', false, 'New livery for the vans is a small, separate decision; it is no evidence about which direction of growth fits.', 'The delivery vans are due for new livery this year. The designers have sent three options; I think the green one suits the brand best.'),
          text('From the founder’s speech at the trade dinner', false, 'Ambition is not evidence: the speech says what the founder hopes for, not what the market or the costs show.', '“We are ready to take on anyone, anywhere. Our product is the best in the country, and the next three years will prove it.”'),
        ],
      },
      tools: [
        { tool: 'ansoff-matrix', verdict: 'best', why: 'The four ideas differ in whether the product is existing or new and whether the market is existing or new, which is exactly how the Ansoff matrix sorts them, from the lowest usual risk to the highest.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'It would give useful background on the business’s position, but it does not set the four routes against one another by product, market and risk.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The business has one main product line, and the question is where to grow, not which existing products deserve cash.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no probabilities or payoffs for the routes yet, so a tree would produce figures with no basis.') },
      ],
      analysis: {
        steps: [
          'For each idea, say whether the product is existing or new, and whether the market is existing or new.',
          'Place each idea in its quadrant of the matrix.',
          'Rank the ideas by their usual risk, then adjust the ranking for the evidence: the home market’s growth, the business’s share of it and the cost of each route.',
        ],
        sort: {
          prompt: 'Place each idea in its quadrant of the Ansoff matrix.',
          categories: [
            { id: 'penetration', label: 'Market penetration' },
            { id: 'product', label: 'Product development' },
            { id: 'market', label: 'Market development' },
            { id: 'diversification', label: 'Diversification' },
          ],
          items: [
            { id: 'i1', text: k.pen, answer: 'penetration', why: 'The existing product, sold more to existing customers: market penetration.' },
            { id: 'i2', text: k.prod, answer: 'product', why: 'A new product for customers the business already serves: product development.' },
            { id: 'i3', text: k.mkt, answer: 'market', why: 'The existing product in a market the business does not yet serve: market development.' },
            { id: 'i4', text: k.div, answer: 'diversification', why: 'A new product in a new market, where both are unfamiliar: diversification.' },
          ],
        },
        model: [
          `Market penetration keeps the product and the customers the business knows, so its usual risk is the lowest; but here ${shareLine}, ${saturated ? 'so extra sales would mostly be won from rivals, usually by cutting price' : 'so there is room to win customers without a price war'}.`,
          `Market development takes a proven product to ${k.region}: the customers, rivals and distributors are new, so the risk is moderate, for ${c(cost.mkt)} and four months.`,
          `Product development keeps the customers but needs ${k.newProduct}: only ${survey}% of buyers said they would probably order it, and it takes nine months.`,
          `Diversification is new on both counts and costs the most, ${c(cost.div)}: the riskiest route for ${an(size.words)}.`,
        ],
      },
      recommend: {
        prompt: 'Which route would you recommend?',
        choices: [
          (best_ === 'pen' ? best : fair)(
            `Market penetration: ${k.pen.charAt(0).toLowerCase()}${k.pen.slice(1)}`,
            saturated
              ? `The lowest-risk cell on paper, but ${shareLine}: more sales at home would mostly come from rivals, through discounts that cut the margin. The evidence says the room is not there.`
              : `${shareLine.charAt(0).toUpperCase()}${shareLine.slice(1)}: there is room to win customers the business already knows how to serve, at the lowest cost (${c(cost.pen)}) and the lowest usual risk.`,
          ),
          (best_ === 'mkt' ? best : fair)(
            `Market development: ${k.mkt.charAt(0).toLowerCase()}${k.mkt.slice(1)}`,
            saturated
              ? `It takes a proven product to ${k.region}, so growth does not depend on price cuts at home. The cost (${c(cost.mkt)}) and four months to first sales fit a business of this size; the risk is the unfamiliar buyers and rivals, which a small trial would test.`
              : `Reasonable later, but it means new buyers, rivals and distribution while there is still room to grow at home at lower cost and risk.`,
          ),
          fair(`Product development: ${k.prod.charAt(0).toLowerCase()}${k.prod.slice(1)}`, `Defensible, because the customers are known, but only ${survey}% of buyers said they would probably order ${k.newProduct}, and development takes nine months. It is a step further from what the business knows.`),
          weak(`Diversification: ${k.div.charAt(0).toLowerCase()}${k.div.slice(1)}`, `New products in a new market, at the highest cost (${c(cost.div)}) and the longest wait. With no experience of that business, it is the riskiest route for ${an(size.words)}.`),
        ],
        justify: 'Justify your choice in two or three sentences, with evidence from the exhibits.',
        criteria: ['Names the evidence: how fast the home market is growing and the share the business already holds', 'Compares the risk of the chosen route with at least one other route', 'Says what the business should check before committing, such as a small trial'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder carries the most risk if the chosen route disappoints?',
          choices: [
            best('The owners, who pay the set-up cost and wait for the return', 'They fund the route and their return depends on it: if it disappoints, the cost falls on them first.'),
            fair('The employees, whose jobs depend on the business growing', 'Their security matters, and some would gain new work, but they do not fund the route; the owners carry the financial risk first.'),
            weak(`${k.users}, who would have more choice`, 'Customers can switch to another brand at little cost, so they carry almost no risk from this decision.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of the route you would recommend?',
          choices: saturated
            ? [
                best(`Buyers and rivals in ${k.region} behave differently from those at home, so sales arrive more slowly than forecast`, 'The product is proven; the market is not. Demand in a new market is the biggest unknown of market development.'),
                fair('Delivering further away costs more and trims the margin', 'A real cost, but one that can be estimated before starting; the bigger unknown is demand.'),
                weak('The product might not work', 'The product already sells at home. In market development the unknown is the market, not the product.'),
              ]
            : [
                best('Rivals answer the offers with their own, and the extra sales come at a lower margin', 'Penetration wins customers partly from rivals, who can respond; the gain can shrink into a price war.'),
                fair('Customers buy more only while the offer lasts', 'A common pattern with promotions, which is why the offer should be judged on repeat orders, not the first month.'),
                weak('The business has never made the product before', 'Penetration uses the existing product: there is nothing new to make.'),
              ],
        },
        change: {
          prompt: 'Which finding would most change the recommendation?',
          choices: saturated
            ? [
                best(`A trial in ${k.region} selling far below the forecast`, 'Market development rests on demand in the new market. A failed trial removes the case for it, and product development becomes the stronger option.'),
                fair(`Interest in ${k.newProduct} rising to well over half of buyers`, 'It would make product development a closer rival, but the new market would still use the proven product.'),
                weak('A rise in the cost of ingredients and materials', 'It squeezes every route’s margin alike, so it does not change which route fits best.'),
              ]
            : [
                best('New figures showing the home market’s growth falling to almost nothing', 'Penetration needs room to grow at home. Without it, extra sales must come from rivals, and a new market becomes the better route.'),
                fair(`Interest in ${k.newProduct} rising to well over half of buyers`, 'It would make product development a closer rival, though at higher cost and a longer wait.'),
                weak('A rise in the cost of ingredients and materials', 'It squeezes every route’s margin alike, so it does not change which route fits best.'),
              ],
        },
      },
      model: {
        problem: `${name} must choose a direction of growth that meets the owners’ target at a risk ${an(size.words)} can carry. Slow sales are the symptom, not the problem.`,
        evidence: `They show how fast the home market is growing and how much of it ${name} holds, what each route costs and how much interest ${k.newProduct} attracts. The livery and the speech are distractors.`,
        tool: 'The Ansoff matrix, because the ideas differ in whether the product and the market are new, and the matrix ranks them by usual risk.',
        analysis: `Penetration carries the lowest usual risk and diversification the highest. The decisive evidence is that ${shareLine}.`,
        recommendation: saturated ? `Market development: a proven product in ${k.region}, without the price war that growth at home would need, tested first with a small trial.` : `Market penetration: there is room to grow at home, at the lowest cost and risk.`,
        evaluation: saturated ? `The owners carry the risk; the main unknown is demand in ${k.region}, and a poor trial would change the recommendation.` : 'The owners carry the risk; rivals may answer with offers of their own, and a home market that stops growing would change the recommendation.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const ENTRY = [
  { noun: 'Pizza Kitchen', industry: 'Hospitality', what: 'a pizza restaurant brand', outlet: 'restaurant', outlets: 'restaurants' },
  { noun: 'Fitness', industry: 'Sport and leisure', what: 'a chain of small gyms', outlet: 'gym', outlets: 'gyms' },
  { noun: 'Bakehouse', industry: 'Food and drink', what: 'a bakery and café chain', outlet: 'bakery', outlets: 'bakeries' },
  { noun: 'Learning Centres', industry: 'Education', what: 'a chain of after-school tutoring centres', outlet: 'centre', outlets: 'centres' },
];

const entryRoute: Family = {
  id: 'entry-route',
  unit: 1,
  subtopics: ['1.5'],
  tool: 'decision-trees',
  level: 'SL/HL',
  title: 'Franchise, or open our own?',
  summary: 'Entering a new region by franchising or by opening its own outlets, with demand uncertain.',
  industries: ['Hospitality', 'Sport and leisure', 'Food and drink', 'Education'],
  quantitative: true,
  make(r) {
    const k = r.pick(ENTRY);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 60, 220);
    const prob = r.pick([0.4, 0.5, 0.6, 0.7]);
    const K = 1000 * p.k;
    // Own outlets: costly, with a wide spread of outcomes. Franchising: cheap, with a narrow one.
    const own = { cost: r.step(300, 500, 20), hi: r.step(1000, 1500, 50), lo: r.step(100, 300, 20) };
    const fra = { cost: r.step(40, 100, 10), hi: r.step(450, 750, 50), lo: r.step(200, 350, 25) };
    const ev = (o: typeof own) => tidy(prob * o.hi + (1 - prob) * o.lo - o.cost);
    const evOwn = ev(own);
    const evFra = ev(fra);
    const close = Math.abs(evOwn - evFra) < 0.1 * Math.max(Math.abs(evOwn), Math.abs(evFra));
    const winner: 'own' | 'fra' = close ? 'fra' : evOwn > evFra ? 'own' : 'fra';
    const m = (v: number) => money(v * K, p);
    // The probability of strong demand at which the two routes have the same expected value.
    const denom = own.hi - own.lo - (fra.hi - fra.lo);
    const pStar = denom !== 0 ? tidy((fra.lo - fra.cost - (own.lo - own.cost)) / denom) : NaN;
    const crosses = Number.isFinite(pStar) && pStar > 0 && pStar < 1;
    const pStarText = crosses ? `about ${roundTo(pStar, 2).toFixed(2)}` : '';
    const crossLine = crosses ? `The expected values are equal when the chance of strong demand is ${pStarText}.` : 'On these payoffs franchising has the higher expected value at any chance of strong demand.';
    const region = r.pick(['the north of the country', 'the coastal region', 'the capital region', 'the southern provinces']);
    return {
      title: `${name}: franchise, or open our own?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the board of ${name}.`,
      brief: [
        `${name}, ${k.what} based in ${p.city}, ${p.country}, has ${size.staff} staff and wants to enter ${region}, where it has no ${k.outlets} yet.`,
        `It can open ${k.outlets} of its own (internal growth) or sell franchises to local owners, who would pay it a fee and a share of their sales (external growth by franchising). The market research team puts the chance of strong demand in the region at ${prob}.`,
      ],
      question: `Should ${name} enter ${region} with its own ${k.outlets} or by franchising?`,
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          best(`Choosing the route into ${region} with the better balance of expected return and risk when demand is uncertain`, 'The board has two routes with different costs and different outcomes in strong and weak demand. That is the decision, and the uncertainty is what makes it hard.'),
          fair('Demand in the new region is uncertain', 'True, and central to the case, but it is a condition of the decision rather than the decision itself.'),
          weak('Finding a new head chef or manager for the flagship site', 'A separate staffing matter that appears in the evidence pack as a distractor.'),
          weak('Deciding whether to enter by a merger with a rival', 'No merger is on the table: the choice is between internal growth and franchising.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table(
            'The two routes: cost and five-year profit',
            true,
            'It gives each route’s cost and its payoffs in strong and weak demand, the figures a decision tree needs.',
            ['Route', 'Cost now', 'Profit if demand is strong', 'Profit if demand is weak'],
            [
              [`Own ${k.outlets}`, m(own.cost), m(own.hi), m(own.lo)],
              ['Franchising', m(fra.cost), m(fra.hi), m(fra.lo)],
            ],
            'Simulated data. Profits are the total over five years, before the cost now.',
          ),
          text('Market research note', true, 'It gives the probability of strong demand, the other input the expected values need.', `Our survey of the region and the sales of similar businesses there suggest a ${Math.round(prob * 100)}% chance that demand is strong over the next five years, and a ${Math.round((1 - prob) * 100)}% chance that it is weak. (Simulated estimate.)`),
          text('Enquiries from would-be franchisees', true, 'It shows that franchising is practical: there are local owners willing to buy in.', `Since the region was mentioned in the trade press, ${r.int(9, 18)} local business owners have asked about a franchise; ${r.int(3, 6)} have the capital the contract requires. (Simulated.)`),
          text('Staffing note: the flagship site', false, 'Recruiting at the flagship site is a separate matter; it does not bear on which route into the new region is better.', 'The flagship site needs a new manager by the spring; three internal candidates have applied.'),
          text('Minutes: the summer staff event', false, 'The cost of a staff event has nothing to do with the choice of route.', 'The summer event will be held at the riverside venue again; the budget is unchanged.'),
        ],
      },
      tools: [
        { tool: 'decision-trees', verdict: 'best', why: 'Each route has a cost and different payoffs in strong and weak demand, with a probability for each: exactly what a decision tree weighs to give each route’s expected value.' },
        { tool: 'ansoff-matrix', verdict: 'fair', why: notThisTool('ansoff-matrix', 'Both routes take the existing product to a new market, so they sit in the same cell; the matrix cannot tell them apart.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'It would describe the business’s position, but it cannot compare two routes whose outcomes depend on uncertain demand.') },
        { tool: 'steeple-analysis', verdict: 'weak', why: notThisTool('steeple-analysis', 'The region’s external factors matter, but the decision turns on the two routes’ figures and the chance of strong demand.') },
      ],
      analysis: {
        steps: [
          'Draw the tree: a decision node with the two routes, each followed by a chance node with strong and weak demand.',
          'Weight each payoff by its probability and add them, then subtract the route’s cost: the expected value.',
          'Compare the expected values, then the spread of outcomes: what each route earns if demand is weak.',
        ],
        calc: {
          prompt: `Calculate the expected value of opening its own ${k.outlets}, after the cost now.`,
          answer: evOwn * K,
          dp: 0,
          tolerance: 0.5 * K,
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? ' ' : ''),
          suffix: '',
          working: [
            `Expected value = (${prob} × ${m(own.hi)}) + (${tidy(1 - prob)} × ${m(own.lo)}) − ${m(own.cost)}`,
            `= ${m(tidy(prob * own.hi))} + ${m(tidy((1 - prob) * own.lo))} − ${m(own.cost)}`,
            `= ${m(evOwn)}`,
            `For franchising: (${prob} × ${m(fra.hi)}) + (${tidy(1 - prob)} × ${m(fra.lo)}) − ${m(fra.cost)} = ${m(evFra)}`,
          ],
          slips: [
            { value: tidy(prob * own.hi + (1 - prob) * own.lo) * K, why: 'You have the weighted payoffs but did not subtract the cost of opening the outlets.' },
            { value: tidy(prob * own.hi + prob * own.lo - own.cost) * K, why: 'Both payoffs were weighted by the chance of strong demand; the weak outcome takes the other probability, 1 minus it.' },
            { value: tidy((own.hi + own.lo) / 2 - own.cost) * K, why: 'You took a simple average of the two payoffs; each must be weighted by its own probability.' },
          ].filter((s, i, all) => Math.abs(s.value - evOwn * K) > 0.5 * K && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Franchising’s expected value is ${m(evFra)}, so ${close ? 'the two are close' : evOwn > evFra ? 'its own outlets come out ahead on expected value' : 'franchising comes out ahead on expected value'}.`,
        },
        model: [
          `Own ${k.outlets}: ${prob} × ${m(own.hi)} + ${tidy(1 - prob)} × ${m(own.lo)} − ${m(own.cost)} = ${m(evOwn)}.`,
          `Franchising: ${prob} × ${m(fra.hi)} + ${tidy(1 - prob)} × ${m(fra.lo)} − ${m(fra.cost)} = ${m(evFra)}.`,
          `If demand is weak, its own ${k.outlets} return ${m(own.lo - own.cost)} after their cost and franchising ${m(fra.lo - fra.cost)}: franchising has the narrower spread, so it is the lower-risk route.`,
          crossLine,
        ],
      },
      recommend: {
        prompt: 'Which route would you recommend?',
        choices: [
          (winner === 'own' ? best : fair)(
            `Open its own ${k.outlets}`,
            winner === 'own'
              ? `Its expected value (${m(evOwn)}) is clearly above franchising’s (${m(evFra)}), and the business keeps control of quality and all the profit. The price is more capital at risk if demand is weak.`
              : close
                ? `Its expected value (${m(evOwn)}) is close to franchising’s (${m(evFra)}), but it puts ${m(own.cost)} at risk for almost no extra expected return.`
                : `Its expected value (${m(evOwn)}) is below franchising’s (${m(evFra)}), and it puts far more capital at risk.`,
          ),
          (winner === 'fra' ? best : fair)(
            'Franchise to local owners',
            winner === 'fra'
              ? close
                ? `The expected values are close (${m(evFra)} against ${m(evOwn)}), so the lower-risk route is the better choice: franchising needs only ${m(fra.cost)} now and loses far less if demand is weak.`
                : `Its expected value (${m(evFra)}) is higher than that of its own ${k.outlets} (${m(evOwn)}), and it needs only ${m(fra.cost)} now. The price is less control over quality.`
              : `Lower risk and lower cost, but its expected value (${m(evFra)}) is well below that of its own ${k.outlets} (${m(evOwn)}).`,
          ),
          weak('Stay out of the region altogether', `${evOwn >= 0 ? 'Both routes have' : 'Franchising has'} a positive expected value on these figures, so staying out gives up a likely gain without a reason in the evidence.`),
        ],
        justify: 'Justify your choice in two or three sentences, using the expected values and one point the tree does not show.',
        criteria: ['Uses both expected values, with the figures', 'Mentions risk or control, which the expected values alone do not capture', 'States a condition that would change the choice, such as the chance of strong demand'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'If the business franchises, which stakeholder gains most influence over its brand in the region?',
          choices: [
            best('The franchisees, who run the outlets day to day', 'They decide service and quality on the spot, so the brand’s reputation in the region rests on them; the franchise contract and training are the business’s controls.'),
            fair('Customers in the region', 'They gain a new choice and their reviews shape the brand, but they do not run the outlets.'),
            weak('The business’s own head-office staff', 'They support the franchisees, but franchising moves day-to-day control away from head office, not towards it.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk a decision tree does not show?',
          choices: [
            best('The probabilities and payoffs are estimates, and a change in them can reverse the ranking', `The tree is only as good as its inputs. ${crossLine}`),
            fair('Franchisees may run the outlets less well than the business would', 'A real risk for one route, which the tree’s payoffs only partly capture.'),
            weak('The tree takes too long to draw', 'A two-route tree is quick to draw; time is not the problem.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change the recommendation?',
          choices: [
            crosses
              ? best('New research putting the chance of strong demand on the other side of the point where the expected values are equal', `The choice hinges on that probability, ${pStarText}.`)
              : best(`Much higher estimates of what its own ${k.outlets} would earn if demand is strong`, 'Franchising leads at every probability on these payoffs, so only different payoffs, not a different probability, could change the ranking.'),
            fair('A rise in the franchise fee the business could charge', 'It would raise franchising’s payoffs, but only by as much as the fee changes.'),
            weak('A new logo for the brand', 'Branding does not change the routes’ costs, payoffs or probabilities.'),
          ],
        },
      },
      model: {
        problem: `${name} must choose a route into ${region} that balances expected return against risk while demand is uncertain.`,
        evidence: 'They give each route’s cost and payoffs, the chance of strong demand and the interest from franchisees. The staffing note and the event minutes are distractors.',
        tool: 'A decision tree, because the routes have costs and uncertain payoffs with known probabilities.',
        analysis: `Expected values: own ${k.outlets} ${m(evOwn)}, franchising ${m(evFra)}. Franchising has the narrower spread of outcomes. ${crossLine}`,
        recommendation: winner === 'own' ? `Open its own ${k.outlets}: the higher expected value by a clear margin, with control of quality.` : close ? 'Franchise: the expected values are close, so the route with less capital at risk is better.' : 'Franchise: the higher expected value, with far less capital at risk.',
        evaluation: `The franchisees would shape the brand in the region; the estimates are the main risk. ${crosses ? `A chance of strong demand on the other side of ${pStarText} would change the answer.` : 'Only much higher payoffs for its own outlets would change the answer.'}`,
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const SITE = [
  { noun: 'Guesthouse', industry: 'Hospitality', what: 'a twelve-room guesthouse', second: 'a second guesthouse in a nearby market town', people: 'guests', reviews: 'guest reviews' },
  { noun: 'Books', industry: 'Retail', what: 'an independent bookshop with a small café', second: 'a second shop in the university district', people: 'customers', reviews: 'online reviews' },
  { noun: 'Bakehouse', industry: 'Food and drink', what: 'a craft bakery', second: 'a second bakery on the other side of the city', people: 'customers', reviews: 'online reviews' },
  { noun: 'Physio', industry: 'Healthcare', what: 'a physiotherapy clinic', second: 'a second clinic in a growing suburb', people: 'patients', reviews: 'patient reviews' },
];

const secondSite: Family = {
  id: 'second-site',
  unit: 1,
  subtopics: ['1.5'],
  tool: 'swot-analysis',
  level: 'SL/HL',
  title: 'Is it time for a second site?',
  summary: 'A popular small business weighs a second site against its own readiness and what is changing around it.',
  industries: ['Hospitality', 'Retail', 'Food and drink', 'Healthcare'],
  quantitative: false,
  make(r) {
    const k = r.pick(SITE);
    const p = place(r);
    const owner = r.pick(['Amara', 'Tomasz', 'Leila', 'Dev', 'Ines', 'Callum', 'Mei', 'Rafael']);
    const name = businessName(r, k.noun);
    const staff = r.int(6, 14);
    const ready = r.chance(0.5);
    const monthly = r.step(9, 16, 1) * 1000 * p.k;
    const months = ready ? r.int(9, 12) : r.int(2, 3);
    const cash = monthly * months;
    const rating = (r.int(45, 49) / 10).toFixed(1);
    const repeat = r.int(52, 68);
    const s0 = r.step(300, 500, 10) * 1000 * p.k;
    const sales = [s0, s0 * 1.08, s0 * 1.17].map((x) => Math.round(x / 1000) * 1000);
    const cashLine = `${months} months of the second site’s costs`;
    return {
      title: `${name}: is it time for a second site?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `a micro business with ${staff} staff`,
      role: `You advise ${owner}, the owner of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}, with ${staff} staff. It is busy, well reviewed and profitable, and ${owner} has found premises for ${k.second}.`,
        `${owner} wants to grow, but asks a fair question first: is the business ready to run two sites well, and is now the right time?`,
      ],
      question: `Should ${name} open ${k.second} now?`,
      problem: {
        prompt: `What is the problem ${owner} must solve?`,
        choices: [
          best('Whether the business is ready to run a second site well, and whether the outside conditions favour opening one now', 'That is the decision: it depends on what the business does well and badly inside, set against the opportunities and threats outside, which is why both kinds of evidence are in the pack.'),
          fair('A national chain may open a branch nearby', 'A real threat and part of the picture, but it is one factor in the decision, not the decision itself.'),
          weak('Choosing new napkins and packaging', 'The supplier’s catalogue is a distractor: packaging has nothing to do with whether to open a second site.'),
          weak('Cutting prices to win more customers', 'Nothing in the evidence suggests price is the problem: the business is already busy and well reviewed.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Sales and repeat custom', true, 'Growing sales and a high share of repeat custom are strengths the second site would build on.', ['Year', 'Sales', 'Repeat custom'], sales.map((v, i) => [`Year ${i + 1}`, money(v, p), `${repeat - 2 + i}%`]), `Simulated data. ${k.reviews.charAt(0).toUpperCase()}${k.reviews.slice(1)} average ${rating} out of 5.`),
          text(
            `How ${owner}’s week is spent`,
            true,
            ready ? 'It shows that a trained deputy can already run the first site, which a second site would need.' : 'It shows that the business depends on the owner for almost everything, a weakness a second site would stretch further.',
            ready
              ? `A deputy manager, trained over two years, runs the first site three days a week, does the ordering and the rota, and has covered ${owner}’s holidays without problems.`
              : `${owner} does the ordering, the accounts, the rota and most of the customer service, and has not taken a week off in two years. No one else has run the business for a day.`,
          ),
          table('Cash and the cost of a second site', true, ready ? 'Cash covering months of the new site’s costs is a cushion while it builds its trade: a strength.' : 'Cash covering only a few months of the new site’s costs leaves no cushion if it starts slowly: a weakness.', ['Item', 'Figure'], [['Cash in the bank', money(cash, p)], ['Running costs of the second site, each month', money(monthly, p)], ['Months of costs the cash would cover', String(months)]], 'Simulated data.'),
          text('From the local paper', true, 'It names an opportunity (the new transport link) and a threat (the chain) outside the business’s control.', `A new rail link to ${k.second.replace(/^a second [a-z]+ (in|on) /, '')} opens next year, and the council expects many more visitors. A national chain is reported to be looking for premises in the area.`),
          text('Catalogue from the packaging supplier', false, 'Packaging is a small operational choice, unrelated to opening a second site.', 'New season: napkins and bags in six new colours, with free delivery on orders over the usual minimum.'),
          text(`${owner}’s summer plans`, false, 'A holiday is personal and says nothing about the business’s readiness.', `${owner} hopes to visit family abroad in August, if work allows.`),
        ],
      },
      tools: [
        { tool: 'swot-analysis', verdict: 'best', why: 'The question needs the business’s strengths and weaknesses (reviews, repeat custom, management, cash) weighed against the opportunities and threats outside it (the rail link, the chain, rents): exactly the four boxes of SWOT.' },
        { tool: 'ansoff-matrix', verdict: 'fair', why: notThisTool('ansoff-matrix', 'It would name the direction, market development, but not whether the business is ready to take it.') },
        { tool: 'steeple-analysis', verdict: 'weak', why: notThisTool('steeple-analysis', 'It covers only the outside of the business, while the doubt here is mostly about the inside: management and cash.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The business has one offer in one market, so there is no portfolio to plot.') },
      ],
      analysis: {
        steps: [
          'Sort each factor into strengths and weaknesses (inside the business) or opportunities and threats (outside it).',
          'Decide which factors matter most for a second site, not just which are true.',
          'Read across the boxes: can the strengths seize the opportunity, and do the weaknesses leave the business exposed to the threats?',
        ],
        sort: {
          prompt: 'Place each factor in its box of the SWOT analysis.',
          categories: [
            { id: 's', label: 'Strength' },
            { id: 'w', label: 'Weakness' },
            { id: 'o', label: 'Opportunity' },
            { id: 't', label: 'Threat' },
          ],
          items: [
            { id: 'f1', text: `${k.reviews.charAt(0).toUpperCase()}${k.reviews.slice(1)} average ${rating} out of 5`, answer: 's', why: 'Inside the business and in its favour: its reputation would help a second site win customers.' },
            { id: 'f2', text: ready ? 'A trained deputy manager can run the first site' : 'Only the owner can run the business', answer: ready ? 's' : 'w', why: ready ? 'Inside and favourable: someone can hold the first site while the owner opens the second.' : 'Inside and unfavourable: a second site would leave the first without anyone who can run it.' },
            { id: 'f3', text: `Cash covers ${cashLine}`, answer: ready ? 's' : 'w', why: ready ? 'Inside and favourable: a cushion of most of a year while the new site builds trade.' : 'Inside and unfavourable: if the new site starts slowly, the cash runs out within a season.' },
            { id: 'f4', text: 'A new rail link will bring more visitors next year', answer: 'o', why: 'Outside the business and in its favour: more potential customers near the second site.' },
            { id: 'f5', text: 'A national chain is looking for premises nearby', answer: 't', why: 'Outside the business and against it: a rival with lower costs and a known brand.' },
          ],
        },
        model: [
          `Strengths: a reputation of ${rating} out of 5 and ${repeat}% repeat custom, both of which a second site could draw on.`,
          ready ? `A trained deputy and cash for ${cashLine} are strengths too: the business can open without stretching its management or its money.` : `Weaknesses: the business depends on ${owner} for everything, and its cash covers only ${cashLine}, so a slow start would strain both.`,
          'Opportunity: the rail link will bring visitors; threat: a national chain is looking nearby, and the sooner a strong local name is established, the better its defence.',
          ready ? 'Read across: the strengths can seize the opportunity now, before the chain arrives.' : 'Read across: the weaknesses leave the business exposed; a second site opened now could hurt the first, which is its strength.',
        ],
      },
      recommend: {
        prompt: `What should ${owner} do?`,
        choices: [
          (ready ? best : weak)(
            `Open ${k.second} now`,
            ready
              ? `The business is ready: a trained deputy can run the first site, and cash covers ${cashLine}. Opening before the chain arrives uses the reputation while the rail link brings visitors.`
              : `With only ${owner} able to run the business and cash for ${cashLine}, opening now risks overtrading: the first site’s service slips and the cash runs out before the second site pays.`,
          ),
          (ready ? fair : best)(
            'Appoint and train a manager and build a cash reserve first, then open within a year',
            ready ? 'Sensible caution, but the business already has both a trained deputy and a cash reserve; waiting a year gives the chain time to take the best premises.' : `It fixes the two weaknesses that make a second site risky now, while the strengths and the rail link remain. The risk is that the chain opens first, so the plan needs a firm date.`,
          ),
          (ready ? weak : fair)(
            'Stay with one site and let the business grow no further',
            ready ? 'A choice some owners make, and the course recognizes reasons to stay small, but here the business is ready and the opportunity is real.' : 'Defensible: staying small keeps control and quality, and the course recognizes reasons to stay small. But the owner wants to grow, and the weaknesses can be fixed.',
          ),
        ],
        justify: 'Justify your choice in two or three sentences, using at least one factor from inside the business and one from outside it.',
        criteria: ['Uses evidence from inside the business (management, cash or reputation) and from outside it (the rail link or the chain)', 'Explains how the two interact, not just lists them', 'Says what would make it the right time if it is not now'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Whose experience is most at risk while the second site starts up?',
          choices: [
            best(`${k.people.charAt(0).toUpperCase()}${k.people.slice(1)} of the first site, if service slips while attention moves`, `The reputation (${rating} out of 5) is the business’s main strength; if the first site’s service slips, it is that strength that suffers.`),
            fair('The staff, who take on more responsibility', 'True, and some will welcome it, but they gain experience as well as work.'),
            weak('Suppliers, who would deliver to two sites', 'Suppliers gain larger orders; they are the least at risk.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: ready
            ? [
                best('The second site takes longer than expected to build trade, while costs run from the first day', `The cash covers ${cashLine}, so the risk is real but cushioned; a target for the first six months would show early whether it is working.`),
                fair('The chain opens nearby and takes some customers', 'Likely, but a strong local reputation is the best defence, and waiting would not stop the chain.'),
                weak('The packaging supplier raises prices', 'Trivial beside the risks of the decision itself.'),
              ]
            : [
                best('The chain takes the best premises while the business prepares', 'Waiting has a cost: the opportunity may not wait for the business to be ready, so the preparation needs a firm date.'),
                fair('The new manager does not work out', 'A real risk of any appointment, which training and a trial period reduce.'),
                weak('The packaging supplier raises prices', 'Trivial beside the risks of the decision itself.'),
              ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: ready
            ? [
                best('The deputy manager leaving the business', 'The deputy is what makes the business ready; without them, the owner would again be stretched across two sites.'),
                fair('The rail link opening a year later', 'It would delay part of the opportunity, but the business would still be ready and the chain still coming.'),
                weak('Reviews rising from 4.7 to 4.8', 'A small change in a strength the business already has.'),
              ]
            : [
                best(`A trained manager in post and cash covering six months of the second site’s costs`, 'Those are the two weaknesses holding the business back; once fixed, opening becomes the stronger choice.'),
                fair('The chain deciding not to come', 'It removes a threat and makes waiting safer, but it does not make the business ready.'),
                weak('Reviews rising from 4.7 to 4.8', 'A small change in a strength the business already has.'),
              ],
        },
      },
      model: {
        problem: `Whether ${name} is ready to run a second site well, and whether the outside conditions favour opening now.`,
        evidence: 'They show the strengths (reputation, repeat custom), the state of management and cash, and the rail link and the chain outside. The catalogue and the holiday are distractors.',
        tool: 'SWOT analysis, because the question weighs internal readiness against external opportunities and threats.',
        analysis: ready ? 'Strong reputation, a trained deputy and a cash cushion meet a clear opportunity and an approaching threat: the strengths can seize the opportunity.' : `A strong reputation, but the business depends on ${owner} and its cash covers only ${cashLine}: the weaknesses would leave it exposed.`,
        recommendation: ready ? `Open ${k.second} now, run by the deputy, before the chain arrives.` : 'Appoint and train a manager and build a cash reserve, then open within a year, with a firm date.',
        evaluation: ready ? 'The first site’s customers carry the risk if service slips; the second site may build trade slowly; losing the deputy would change the answer.' : 'The first site’s customers carry the risk if service slips; the chain may move first; a manager in post and a cash reserve would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const START = [
  { noun: 'Street Kitchen', industry: 'Hospitality', what: 'a food truck selling grilled flatbreads', costs: [['The truck, fitted out', 38], ['Cooking equipment', 9], ['Licences and insurance', 3], ['First stock of ingredients', 2], ['Launch marketing', 3]] as Array<[string, number]> },
  { noun: 'Phone Clinic', industry: 'Technology', what: 'a phone and tablet repair kiosk in a shopping centre', costs: [['Kiosk fit-out', 14], ['Tools and test equipment', 6], ['First stock of parts', 7], ['Deposit on the kiosk', 5], ['Launch marketing', 2]] as Array<[string, number]> },
  { noun: 'Yoga Studio', industry: 'Sport and leisure', what: 'a yoga and pilates studio', costs: [['Studio fit-out', 26], ['Mats, props and sound system', 5], ['Deposit and first rent', 8], ['Website and booking system', 3], ['Launch marketing', 3]] as Array<[string, number]> },
  { noun: 'Pet Grooming', industry: 'Services', what: 'a mobile dog-grooming van', costs: [['Van, converted', 32], ['Grooming equipment', 6], ['Licences and insurance', 2], ['Launch marketing', 2], ['First stock of products', 1]] as Array<[string, number]> },
];

const startUpPlan: Family = {
  id: 'start-up-funding',
  unit: 1,
  subtopics: ['1.1', '3.2'],
  tool: 'business-plan',
  level: 'SL/HL',
  title: 'Funding a start-up',
  summary: 'A founder has costed a new business and must close the gap between the cost and the money in hand.',
  industries: ['Hospitality', 'Technology', 'Sport and leisure', 'Services'],
  quantitative: true,
  make(r) {
    const k = r.pick(START);
    const p = place(r);
    const founder = r.pick(['Priya', 'Jonas', 'Zainab', 'Mateo', 'Aiko', 'Kwame', 'Elena', 'Farid']);
    const name = businessName(r, k.noun);
    const K = 1000 * p.k;
    const costs = k.costs.map(([item, v]) => [item, Math.round(v * (0.85 + r.int(0, 30) / 100))] as [string, number]);
    const total = costs.reduce((a, [, v]) => a + v, 0);
    const savings = Math.round(total * (0.25 + r.int(0, 15) / 100));
    const grant = r.chance(0.5) ? r.step(3, 6, 1) : 0;
    const gap = total - savings - grant;
    const secured = r.chance(0.5);
    const m = (v: number) => money(v * K, p);
    return {
      title: `${name}: funding a start-up`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: 'a start-up: the founder and one part-time employee',
      role: `You help ${founder} prepare the business plan for ${name}.`,
      brief: [
        `${founder} plans to start ${name}, ${k.what}, in ${p.city}, ${p.country}. The market research is done and the costs are known. ${founder} will put in personal savings${grant ? ' and has been offered a small start-up grant from the city' : ''}, but that does not cover everything.`,
        `The business plan must show how the rest will be raised and why that source suits the business.`,
      ],
      question: `How should ${founder} raise the rest of the money to start ${name}?`,
      problem: {
        prompt: `What is the problem ${founder} must solve?`,
        choices: [
          best('Closing the gap between the start-up costs and the money in hand, from a source that suits the business and its founder', `The plan has costs and funds; the gap between them is the problem, and the right source depends on its size, on what ${founder} can offer as security and on how much control ${founder} wants to keep.`),
          fair('Writing a business plan', `The plan is the tool ${founder} will use, and lenders will ask for one, but writing it is a means to the decision, not the decision itself.`),
          weak('Setting the prices', 'Pricing matters for the sales forecast, but the question in front of the founder is how to fund the start.'),
          weak('Choosing a name and a logo', 'A distractor: branding does not raise money.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Start-up costs', true, 'The total of the start-up costs is the first figure the plan needs.', ['Item', 'Cost'], costs.map(([item, v]) => [item, m(v)]), 'Simulated data: quotes the founder has collected.'),
          table('Money in hand', true, 'What the founder already has, which is subtracted from the costs to give the gap.', ['Source', 'Amount'], [['Personal savings', m(savings)], ['Start-up grant from the city', grant ? m(grant) : 'None offered']], 'Simulated data.'),
          text(
            `${founder}’s circumstances`,
            true,
            secured ? 'Security and a wish to keep control point towards a loan.' : 'No security and a wish for experienced help point towards an investor.',
            secured
              ? `${founder} owns a car and a share of a flat that a bank could take as security, has run a market stall for three years, and wants to keep full control of the business.`
              : `${founder} has no property to offer as security and has never run a business, and would welcome an experienced partner to advise on the first two years.`,
          ),
          text('A rival’s price list', false, 'Rivals’ prices matter for the plan’s sales forecast, but not for how the start-up gap is funded.', 'A similar business across town charges a little more than the founder plans to, and opens fewer hours.'),
          text('Logo ideas', false, 'Branding is a separate decision with no bearing on the funding.', 'The designer has offered three logos; friends prefer the round one.'),
        ],
      },
      tools: [
        { tool: 'business-plan', verdict: 'best', why: 'A business plan sets out the start-up costs, the sources of finance and the forecasts a lender or investor will want to see: the funding gap and how to close it are part of its financial plan.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'It belongs in a plan as a summary of the position, but it does not cost the start or match a source of finance to it.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no uncertain payoffs with probabilities to compare here; the question is the size of a gap and how to fund it.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'A start-up has no portfolio of products with market shares to plot.') },
      ],
      analysis: {
        steps: [
          'Add up the start-up costs.',
          'Subtract the money already in hand: the savings and any grant. What is left is the funding gap.',
          'Match the gap to a source: how large is it, what security can the founder offer, and how much control does the founder want to keep?',
        ],
        calc: {
          prompt: 'Calculate the funding gap: the start-up costs not covered by the money in hand.',
          answer: gap * K,
          dp: 0,
          tolerance: 0.5 * K,
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? ' ' : ''),
          suffix: '',
          working: [`Start-up costs = ${costs.map(([, v]) => m(v)).join(' + ')} = ${m(total)}`, `Money in hand = ${m(savings)} savings${grant ? ` + ${m(grant)} grant` : ''} = ${m(savings + grant)}`, `Funding gap = ${m(total)} − ${m(savings + grant)} = ${m(gap)}`],
          slips: [
            ...(grant ? [{ value: (total - savings) * K, why: 'The grant is money in hand too: subtract it as well as the savings.' }] : []),
            { value: total * K, why: 'That is the total cost. The gap is what is left after the money already in hand.' },
            { value: (total - grant) * K, why: 'Subtract the founder’s savings as well.' },
          ].filter((s, i, all) => Math.abs(s.value - gap * K) > 0.5 * K && all.findIndex((x) => x.value === s.value) === i),
          meaning: `The plan must raise ${m(gap)}: ${Math.round((gap / total) * 100)}% of the cost of starting.`,
        },
        model: [
          `Start-up costs total ${m(total)}; money in hand is ${m(savings + grant)}; the gap is ${m(gap)}, ${Math.round((gap / total) * 100)}% of the cost.`,
          'The costs are mostly long-lasting assets (the vehicle, the fit-out, the equipment), so they need long-term finance, not an overdraft meant for short gaps.',
          secured ? `${founder} can offer security and wants full control: a bank loan fits, repaid from the profits over several years.` : `${founder} has no security and no experience: a bank is unlikely to lend, while a business angel would bring money and advice in return for a share.`,
        ],
      },
      recommend: {
        prompt: 'Which source should the plan propose for the gap?',
        choices: [
          (secured ? best : fair)('A bank loan, repaid over five years', secured ? `${founder} can offer security and wants to keep control: a loan leaves the business wholly ${founder}’s, and its interest is a known cost for the cash flow forecast.` : `A bank would usually want security and a trading record, and ${founder} has neither, so a loan is unlikely to be offered on good terms.`),
          (secured ? fair : best)('A business angel, in exchange for a share of the business', secured ? `It would work, but ${founder} wants full control, and an angel takes a share of the profits for as long as they own part of the business.` : `With no security and no experience, an angel’s money and advice suit ${founder} best; the price is a share of the business and of its future profits.`),
          fair('Crowdfunding from future customers', 'Possible for a business with a following, and it doubles as marketing, but it is uncertain: if the target is not met, the money may not come.'),
          weak('A bank overdraft', 'An overdraft is short-term finance for temporary gaps. Using it for long-lasting assets is risky: the bank can call it in at short notice.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the size of the gap and the founder’s circumstances.',
        criteria: ['Uses the funding gap, with the figure', 'Matches the term of the finance to what it pays for (long-lasting assets need long-term finance)', 'Weighs cost against control: interest and security against a share of the business'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder will study the plan hardest before the money is released?',
          choices: [
            best('The lender or the investor, who must judge how they will be repaid or rewarded', 'They put money at risk on the strength of the plan, so they check its forecasts and assumptions most closely.'),
            fair(`${founder}’s family, whose savings or home may be involved`, 'They have a lot at stake, especially if property is offered as security, but they are not the ones deciding whether to fund it.'),
            weak('Future customers', 'Customers judge the business by what it offers, not by its business plan.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: secured
            ? [
                best('Sales start slowly while the loan repayments fall due anyway, putting the security at risk', 'A loan must be repaid whatever the sales; the cash flow forecast should show the repayments can be met in a slow first year.'),
                fair('Interest rates rise', 'It matters if the rate is variable; a fixed rate removes the risk at a price.'),
                weak('The logo is unpopular', 'A minor point: a logo does not change whether the business can meet the cost of its finance.'),
              ]
            : [
                best(`${founder} gives up a share of the business, and must agree big decisions with the investor`, 'The angel’s money is not free: it costs a share of every future profit and some freedom to decide.'),
                fair('No suitable investor is found in time', 'A real risk to the timetable, which a plan with crowdfunding as a second route would reduce.'),
                weak('The logo is unpopular', 'A minor point: a logo does not change whether the business can meet the cost of its finance.'),
              ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: secured
            ? [
                best('The bank refusing to lend without two years of trading figures', 'Then the loan is not available, and an investor or crowdfunding becomes the route.'),
                fair('The grant being doubled', 'It would shrink the gap, but probably not close it.'),
                weak('A rival raising its prices', 'It affects the sales forecast a little, not the choice of finance.'),
              ]
            : [
                best('The investor demanding a far larger share of the business than the money justifies', 'Then the price of the angel’s money is too high, and a smaller loan with a guarantor, or crowdfunding, becomes worth the effort.'),
                fair('The grant being doubled', 'It would shrink the gap, but probably not close it.'),
                weak('A rival raising its prices', 'It affects the sales forecast a little, not the choice of finance.'),
              ],
        },
      },
      model: {
        problem: `${founder} must close a funding gap of ${m(gap)} from a source that suits the business and the founder.`,
        evidence: 'They give the start-up costs, the money in hand and the founder’s circumstances. The rival’s prices and the logos are distractors.',
        tool: 'A business plan, whose financial plan sets out the costs, the sources of finance and the forecasts.',
        analysis: `Costs of ${m(total)} less ${m(savings + grant)} in hand leaves ${m(gap)}, mostly for long-lasting assets that need long-term finance.`,
        recommendation: secured ? 'A bank loan over five years: the founder can offer security and keeps control.' : 'A business angel: money and advice for a founder with no security and no experience, at the price of a share.',
        evaluation: secured ? 'The lender will test the forecasts; slow sales would still have to meet the repayments; a refusal without a trading record would change the answer.' : 'The investor will test the forecasts; the founder gives up a share and some control; too high a price for the money would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const CIRC = [
  { noun: 'Outdoor', industry: 'Fashion', product: 'waterproof jackets and hiking gear', material: 'nylon fabric', best: 'extension' as const, lasts: 9, why: 'Its jackets last many years if their zips and seams are mended, and its customers are attached to their gear.' },
  { noun: 'Workspace', industry: 'Manufacturing', product: 'office desks and chairs', material: 'steel and timber', best: 'pss' as const, lasts: 12, why: 'Its furniture lasts for years and can be refurbished, and its business customers prefer a monthly fee to a large purchase.' },
  { noun: 'Little Ones', industry: 'Fashion', product: 'children’s clothing', material: 'cotton', best: 'sharing' as const, lasts: 1, why: 'Children outgrow its clothes within a year, long before they wear out, and its parents are keen to pass them on.' },
  { noun: 'Tools', industry: 'Manufacturing', product: 'power tools for home improvers', material: 'plastic casings and steel', best: 'pss' as const, lasts: 8, why: 'Most of its customers use a tool a few times a year, so renting by the day gives them the use without the purchase.' },
];

const CIRC_LABELS = { supply: 'Circular supply model', recovery: 'Resource recovery model', extension: 'Product life extension model', sharing: 'Sharing model', pss: 'Product service system model' } as const;

const circularModel: Family = {
  id: 'circular-model',
  unit: 1,
  subtopics: ['1.3', '1.1'],
  tool: 'circular-business-models',
  level: 'SL/HL',
  title: 'Which circular model fits?',
  summary: 'A manufacturer under pressure to cut waste chooses a circular business model that suits its product and customers.',
  industries: ['Fashion', 'Manufacturing'],
  quantitative: false,
  make(r) {
    const k = r.pick(CIRC);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 40, 300);
    const survey = { extension: r.int(30, 45), sharing: r.int(20, 35), pss: r.int(20, 35) };
    survey[k.best] = r.int(55, 72);
    const cost = { supply: r.step(80, 150, 10), recovery: r.step(150, 260, 10), extension: r.step(40, 90, 10), sharing: r.step(60, 120, 10), pss: r.step(120, 220, 10) };
    const c = (v: number) => money(v * 1000 * p.k, p);
    const initiatives = {
      supply: `Use recycled ${k.material} in place of new`,
      recovery: 'Collect used products and recover their materials for resale',
      extension: 'Offer a repair service and sell spare parts',
      sharing: 'Run a platform where customers lend, swap or pass on products',
      pss: 'Rent the products for a monthly or daily fee, keeping ownership and taking them back',
    } as const;
    const ids = ['supply', 'recovery', 'extension', 'sharing', 'pss'] as const;
    const pick = initiatives[k.best];
    return {
      title: `${name}: which circular model fits?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the board of ${name}.`,
      brief: [
        `${name} makes ${k.product} in ${p.city}, ${p.country}, and has ${size.staff} staff. Its largest retail customers now ask suppliers to show how they cut waste, and its own staff want it to adopt an ethical objective on sustainability.`,
        `The board has five ideas and money for one this year. It wants the one that suits its product and its customers, and that can pay its way.`,
      ],
      question: `Which circular business model should ${name} adopt first?`,
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          best('Choosing the circular model that cuts waste and suits the product and its customers well enough to pay its way', 'The board has five circular ideas and money for one; the evidence on the product’s life, customer interest and cost decides which fits.'),
          fair('Retail customers are asking suppliers to cut waste', 'This is the pressure behind the decision, not the decision itself.'),
          weak('Agreeing a sponsorship with the local football club', 'A distractor in the pack: sponsorship is marketing, not a circular model.'),
          weak('Moving all production to a cheaper country', 'Nothing in the case is about location; the question is how to keep products and materials in use.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          text('How long the products last', true, 'Whether a product wears out or is outgrown decides which model can keep it in use.', `${k.why} The typical product is used for about ${k.lasts} ${k.lasts === 1 ? 'year' : 'years'} by its first owner. (Simulated estimate from returns and warranty data.)`),
          table('Customer survey: what would you use?', true, 'Customer interest shows which model would attract enough use to pay its way.', ['Idea', 'Customers who would use it'], [['A repair service', `${survey.extension}%`], ['Renting instead of buying', `${survey.pss}%`], ['Swapping or passing on products', `${survey.sharing}%`]], 'Simulated survey of 300 customers.'),
          table('Cost of each idea in the first year', true, 'The board can afford one idea, so the cost of each matters.', ['Idea', 'Cost'], ids.map((id) => [CIRC_LABELS[id].replace(' model', ''), c(cost[id])]), 'Simulated estimates.'),
          text('Letter from the local football club', false, 'Sponsorship may help the brand, but it is not a circular model and does not cut waste.', 'Would you sponsor our under-12 team’s new shirts? Your logo would appear on the front.'),
          text('Facilities note', false, 'The canteen has nothing to do with which circular model fits the product.', 'The staff canteen will be redecorated in the spring; menus will not change.'),
        ],
      },
      tools: [
        { tool: 'circular-business-models', verdict: 'best', why: 'The five ideas are the five circular business models the toolkit names; the tool helps choose the one that fits the product’s life, the customers and the money.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'It would set out the business’s position, but it does not compare the five ways of keeping products in use.') },
        { tool: 'ansoff-matrix', verdict: 'weak', why: notThisTool('ansoff-matrix', 'Some ideas are new services, but the question is how to keep products and materials in use, not where to grow.') },
        { tool: 'steeple-analysis', verdict: 'weak', why: notThisTool('steeple-analysis', 'The environmental and ethical pressures are already known; the decision is which model answers them.') },
      ],
      analysis: {
        steps: [
          'Name the circular model each idea represents.',
          'For each, ask how it keeps products or materials in use and how it would earn money.',
          'Match the models to the evidence: how long the product lasts, what customers would use, and what it costs.',
        ],
        sort: {
          prompt: 'Match each idea to its circular business model.',
          categories: ids.map((id) => ({ id, label: CIRC_LABELS[id] })),
          items: ids.map((id, i) => ({
            id: `c${i + 1}`,
            text: initiatives[id],
            answer: id,
            why: {
              supply: 'Recycled inputs replace new materials at the start of the chain: a circular supply model.',
              recovery: 'Materials are recovered from used products at the end of their life: resource recovery.',
              extension: 'Repair keeps the product itself in use for longer: product life extension.',
              sharing: 'Customers share products among themselves, so each is used more: a sharing model.',
              pss: 'The business sells the use, not the product, and keeps ownership: a product service system.',
            }[id],
          })),
        },
        model: [
          `${k.why}`,
          `The survey points the same way: ${survey[k.best]}% of customers would use the ${CIRC_LABELS[k.best].replace(' model', '').toLowerCase()}, far more than any other idea.`,
          `It costs ${c(cost[k.best])} in the first year, within what the board can fund, and it earns money from the products already sold.`,
          'Circular supply and resource recovery cut waste too, but they change materials rather than how customers use the product, and recovery is the costliest.',
        ],
      },
      recommend: {
        prompt: 'Which idea should the board adopt first?',
        choices: [
          best(pick, `${k.why} ${survey[k.best]}% of customers say they would use it, and it costs ${c(cost[k.best])}.`),
          fair(initiatives.supply, 'It cuts the use of new materials and needs no change in customers’ habits, but it does not keep the product itself in use for longer.'),
          weak(initiatives.recovery, `It deals with waste at the very end of a product’s life and is the most expensive idea at ${c(cost.recovery)}: the product’s value is lost before it is recovered.`),
        ],
        justify: 'Justify your choice in two or three sentences, using the product’s life and the survey.',
        criteria: ['Names the model precisely and explains how it keeps products in use', 'Uses the evidence: how long the product lasts and what share of customers would use it', 'Explains how the model earns money, so that it can pay its way'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder gains most directly from the model you recommend?',
          choices: [
            best('Customers, who keep using products for less than the cost of buying new', 'The model works only if customers find it worth using; they gain lower costs of use, and the business gains repeat contact with them.'),
            fair('The retail customers who asked for less waste', 'They gain a supplier that can show it cuts waste, though they did not choose the model.'),
            weak('The football club', 'A distractor: it gains nothing from a circular model.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of the model you recommend?',
          choices: [
            best('Fewer customers use it than the survey suggests, so it does not pay its way', 'Saying you would use a service in a survey is not the same as paying for it; a pilot in one region would test the survey.'),
            fair('Selling fewer new products as customers keep old ones longer', 'A real trade-off of every circular model, which the service’s income must make up for.'),
            weak('The canteen redecoration running late', 'A distractor with no bearing on the model.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best('A pilot showing far less use than the survey promised', 'The recommendation rests on customers using the model; without them it would not pay, and the cheaper circular supply model would be the safer start.'),
            fair('The cost of recycled materials falling sharply', 'It would make circular supply cheaper, but not more useful to customers.'),
            weak('The football club offering a lower sponsorship fee', 'Sponsorship fees have nothing to do with which circular model fits the product.'),
          ],
        },
      },
      model: {
        problem: `${name} must choose the circular model that cuts waste and suits its product and customers well enough to pay its way.`,
        evidence: 'They show how long the product lasts, which services customers would use and what each idea costs. The football club and the canteen are distractors.',
        tool: 'Circular business models, the toolkit’s five ways of keeping products and materials in use.',
        analysis: `${k.why} ${survey[k.best]}% of customers would use the ${CIRC_LABELS[k.best].replace(' model', '').toLowerCase()}.`,
        recommendation: `${pick}, piloted first, because it fits how the product is used and earns money from products already sold.`,
        evaluation: 'Customers gain most; the risk is that fewer use it than said they would; a weak pilot would change the answer.',
      },
    };
  },
};

export const UNIT1: Family[] = [growthRoute, entryRoute, secondSite, startUpPlan, circularModel];
