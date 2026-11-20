/**
 * Unit 4 families: reading product research (descriptive statistics), a
 * portfolio and where to put the budget (BCG matrix), a forecast from a line
 * of best fit (simple linear regression, HL), a business stuck in the middle
 * (Porter's generic strategies, HL) and a launch against a trade-fair date
 * (Gantt chart, HL). Every business is fictional and every figure simulated.
 */
import { an, best, businessName, fair, money, notThisTool, num, pct, place, roundTo, sized, table, text, tidy, weak } from '../kit';
import type { Family } from '../types';

/* ------------------------------------------------------------------ */

const TESTS = [
  { noun: 'Juice Co', industry: 'Food and drink', product: 'a mango and ginger juice', shop: 'its own juice bars' },
  { noun: 'Crisps', industry: 'Food and drink', product: 'a sea-salt and seaweed crisp', shop: 'its factory shop' },
  { noun: 'Fragrance', industry: 'Consumer goods', product: 'a new scent for its candle range', shop: 'its flagship store' },
  { noun: 'Kitchen', industry: 'Hospitality', product: 'a vegetarian lunch menu', shop: 'its busiest restaurant' },
];

const researchSurvey: Family = {
  id: 'product-research',
  unit: 4,
  subtopics: ['4.4'],
  tool: 'descriptive-statistics',
  level: 'SL/HL',
  title: 'Does the research support a launch?',
  summary: 'A new product has been tested with a survey; the ratings and the way the sample was chosen decide what to do next.',
  industries: ['Food and drink', 'Consumer goods', 'Hospitality'],
  quantitative: true,
  make(r) {
    const k = r.pick(TESTS);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 30, 200);
    const liked = r.chance(0.5);
    const quota = r.chance(0.5);
    const freq = liked ? [r.int(0, 2), r.int(1, 4), r.int(4, 8), r.int(12, 18), r.int(10, 16)] : [r.int(5, 9), r.int(10, 15), r.int(8, 12), r.int(3, 6), r.int(1, 3)];
    const n = freq.reduce((a, b) => a + b, 0);
    const total = freq.reduce((a, f, i) => a + f * (i + 1), 0);
    const mean = tidy(total / n);
    const mode = freq.indexOf(Math.max(...freq)) + 1;
    const fiveFour = Math.round(((freq[3]! + freq[4]!) / n) * 100);
    const strong = mean >= 3.6;
    const verdictKey: 'launch' | 'retest' | 'rethink' = strong ? (quota ? 'launch' : 'retest') : 'rethink';
    const sampling = quota
      ? `A quota sample: ${n} shoppers chosen to match the target market by age group and region, recruited by a research agency.`
      : `A convenience sample: the first ${n} customers who agreed to answer in ${k.shop} on two Saturdays.`;
    return {
      title: `${name}: does the research support a launch?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the marketing manager of ${name}.`,
      brief: [
        `${name} in ${p.city}, ${p.country}, has developed ${k.product}. Before spending on a national launch, it tested the product: people tried it and rated it from 1 (would never buy) to 5 (would definitely buy).`,
        'The marketing manager wants to know what the results really show, and how far they can be trusted, before recommending a launch to the board.',
      ],
      question: `What should ${name} do next with ${k.product}?`,
      problem: {
        prompt: 'What is the problem the marketing manager must solve?',
        choices: [
          best('Judging whether the research gives reliable evidence of demand, and so what to do next', 'The ratings say how people responded; how the sample was chosen says how far that can be trusted. The decision rests on both.'),
          fair('Working out the average rating', 'The average is the first step of the analysis, not the decision it serves.'),
          weak('Choosing a printer for the packaging', 'The printer’s price list is a distractor: packaging comes after the decision to launch.'),
          weak('Cutting the price of the existing range', 'The existing range is not in question here.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Ratings: how many gave each score', true, 'The frequency of each rating gives the mean, the mode and the share who would buy.', ['Rating', '1', '2', '3', '4', '5'], [['Number of people', ...freq.map(String)]], `Simulated survey of ${n} people.`),
          text('How the sample was chosen', true, quota ? 'A quota sample matched to the target market makes the result more representative.' : 'A convenience sample of existing customers may be biased towards people who already like the brand.', sampling),
          text('Comments from the survey', true, 'Open comments add qualitative evidence about why people rated the product as they did.', liked ? '“Fresh and different.” “I would buy it every week if the price is right.” “A bit sweet for me.” (Simulated.)' : '“Too strong a taste.” “Not sure what it is for.” “I prefer the original.” (Simulated.)'),
          text('Price list from the packaging printer', false, 'Packaging costs matter later, but they do not say whether people want the product.', 'Printed cartons, minimum order 5,000, delivered in three weeks.'),
          text('Facilities: office move', false, 'An office move has no bearing on what the research shows.', 'The marketing team moves to the second floor at the end of the month.'),
        ],
      },
      tools: [
        { tool: 'descriptive-statistics', verdict: 'best', why: 'The research is a set of ratings: the mean, the mode and the share who would buy summarize it, and the way the sample was chosen says how far to trust them.' },
        { tool: 'ansoff-matrix', verdict: 'fair', why: notThisTool('ansoff-matrix', 'It would name the launch as product development, but the question is what the research evidence shows.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'The data to read here is a set of survey ratings, which need summarizing, not sorting into four boxes.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The product has no market share yet; there is nothing to plot.') },
      ],
      analysis: {
        steps: [
          'Calculate the mean rating from the frequency table: multiply each rating by the number who gave it, add the products, and divide by the number of people.',
          'Find the mode and the share who rated 4 or 5.',
          'Judge the sample: is it representative of the target market, and is it large enough?',
        ],
        calc: {
          prompt: 'Calculate the mean rating, to two decimal places.',
          answer: roundTo(mean, 2),
          dp: 2,
          tolerance: 0.006,
          prefix: '',
          suffix: '',
          working: [`Sum of rating × number = ${freq.map((f, i) => `${i + 1} × ${f}`).join(' + ')} = ${total}`, `Number of people = ${freq.join(' + ')} = ${n}`, `Mean = ${total} ÷ ${n} = ${num(mean, 2)}`],
          slips: [
            { value: roundTo(total / 5, 2), why: 'Divide by the number of people who answered, not by the number of possible ratings.' },
            { value: roundTo(n / 5, 2), why: 'That is the average number of people per rating. The mean rating weights each rating by how many gave it.' },
            { value: mode, why: 'That is the mode, the most common rating. The mean is the total of all ratings divided by the number of people.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(mean, 2)) > 0.006 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `${fiveFour}% rated it 4 or 5, and the most common rating was ${mode}.`,
        },
        model: [
          `Mean rating ${num(mean, 2)}; mode ${mode}; ${fiveFour}% rated it 4 or 5.`,
          quota ? 'The sample was a quota sample matched to the target market, so the result is a fair guide to the market as a whole.' : 'The sample was a convenience sample of existing customers, who probably like the brand more than the wider market: the result is likely to flatter the product.',
          `${n} people is a modest sample; the comments help explain the ratings.`,
          strong ? 'The ratings are strong; the question is only how far they can be trusted.' : 'The ratings are weak, and the comments suggest why.',
        ],
      },
      recommend: {
        prompt: 'What should the marketing manager recommend?',
        choices: [
          (verdictKey === 'launch' ? best : weak)('Launch nationally', verdictKey === 'launch' ? `A mean of ${num(mean, 2)} with ${fiveFour}% likely to buy, from a quota sample matched to the target market: the evidence supports a launch.` : verdictKey === 'retest' ? `The ratings are strong, but they come from a convenience sample of existing customers, who are likely to rate it higher than the market would.` : `A mean of ${num(mean, 2)} and comments about the taste do not support spending on a national launch.`),
          (verdictKey === 'retest' ? best : fair)('Test again with a quota sample of the target market before deciding', verdictKey === 'retest' ? `The ratings are encouraging (mean ${num(mean, 2)}), but a convenience sample of loyal customers flatters the product; a quota sample would show whether the wider market agrees, at small cost.` : verdictKey === 'launch' ? 'Caution has value, but this sample is already a quota sample of the target market; testing again delays the launch for little new information.' : 'More testing of the same product would probably confirm the weak result; it needs changing first.'),
          (verdictKey === 'rethink' ? best : fair)('Do not launch it as it is: use focus groups to find out what to change', verdictKey === 'rethink' ? `A mean of ${num(mean, 2)} and comments about the taste show the product needs work; focus groups would explain what to change before more money is spent.` : 'Too cautious: the ratings are strong, so the question is the sample, not the product.'),
          weak('Launch in every store at once and watch the sales', 'It spends the whole launch budget to find out what research could show for a fraction of the cost.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the statistics and the sampling method.',
        criteria: ['Uses the mean or the share who would buy, with the figure', 'Judges the sample: how it was chosen and its size', 'Says what further evidence would settle the decision'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder bears the cost if the research misleads the business?',
          choices: [
            best('The owners, who pay for a launch that may not sell', 'A national launch is the large cost; if the research flattered the product, the money is lost.'),
            fair('Retailers who give the product shelf space', 'They lose space and sales on a product that does not sell, though they can delist it.'),
            weak('The packaging printer', 'The printer is paid for the cartons whatever happens to the product.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk in relying on this research?',
          choices: [
            best(quota ? 'Saying you would buy in a survey is not the same as buying, so sales may fall short of the ratings' : 'The convenience sample over-represents loyal customers, so the ratings overstate demand', quota ? 'Even a good sample measures intentions, not purchases; a launch in a few regions first would test the gap.' : 'People who already shop with the brand are not typical of the market; the bias pushes the ratings up.'),
            fair('The sample is too small to show differences between regions', `${n} people give a fair overall picture but little detail by region or age group.`),
            weak('The office move delays the report', 'A short delay would not change what the research shows.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(strong ? (quota ? 'A trial in a few regions selling far below what the ratings suggest' : 'A quota sample of the target market giving a much lower mean') : 'A changed recipe or design scoring well with a representative sample', strong ? 'The recommendation rests on the ratings reflecting real demand; evidence that they do not would stop the launch.' : 'The product’s weakness is the reason not to launch; a better version with better evidence would change that.'),
            fair('A rival launching a similar product first', 'It would raise the stakes and the urgency, but not what the research shows about this product.'),
            weak('A cheaper quote for the cartons', 'Packaging costs do not change whether people want the product.'),
          ],
        },
      },
      model: {
        problem: `${name} must judge whether its research gives reliable evidence of demand for ${k.product}.`,
        evidence: 'They give the ratings, how the sample was chosen and the comments. The printer’s prices and the office move are distractors.',
        tool: 'Descriptive statistics, to summarize the ratings, read alongside the sampling method.',
        analysis: `Mean ${num(mean, 2)}, mode ${mode}, ${fiveFour}% rating it 4 or 5, from ${quota ? 'a quota sample matched to the target market' : 'a convenience sample of existing customers, which flatters the product'}.`,
        recommendation: { launch: 'Launch nationally: strong ratings from a representative sample.', retest: 'Test again with a quota sample before deciding: the ratings are strong but the sample is biased.', rethink: 'Do not launch as it is; find out with focus groups what to change.' }[verdictKey],
        evaluation: 'The owners bear the cost of a misleading result; intentions are not purchases; evidence that the ratings do not reflect demand would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const PORTFOLIO = [
  { noun: 'Drinks', industry: 'Food and drink', what: 'a drinks company', items: ['Sparkling water', 'Cola', 'Energy drink', 'Kombucha'] },
  { noun: 'Apps', industry: 'Technology', what: 'a software company', items: ['Accounting app', 'Payroll app', 'Booking app', 'Invoice scanner'] },
  { noun: 'Toys', industry: 'Consumer goods', what: 'a toy maker', items: ['Wooden trains', 'Board games', 'Craft kits', 'Coding robots'] },
  { noun: 'Cereals', industry: 'Food and drink', what: 'a cereal maker', items: ['Porridge oats', 'Cornflakes', 'Granola', 'Protein clusters'] },
];

const portfolio: Family = {
  id: 'product-portfolio',
  unit: 4,
  subtopics: ['4.5'],
  tool: 'bcg-matrix',
  level: 'SL/HL',
  title: 'Where should the marketing budget go?',
  summary: 'Four products in markets growing at different rates, each with its own share: the portfolio decides where the money goes.',
  industries: ['Food and drink', 'Technology', 'Consumer goods'],
  quantitative: true,
  make(r) {
    const k = r.pick(PORTFOLIO);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 120, 600);
    const promising = r.chance(0.5);
    // Roles: cash cow, dog, star, question mark (the order of the brand list is shuffled by role).
    const roles = ['cow', 'dog', 'star', 'qm'] as const;
    const names = r.chance(0.5) ? [...k.items] : [k.items[1]!, k.items[0]!, k.items[3]!, k.items[2]!];
    const growth = { cow: r.int(1, 3), dog: r.int(-2, 2), star: r.int(9, 15), qm: r.int(10, 18) };
    const own = { cow: r.int(30, 40), dog: r.int(6, 10), star: r.int(26, 34), qm: r.int(8, 13) };
    const rival = { cow: r.int(14, 22), dog: r.int(20, 30), star: r.int(15, 22), qm: r.int(20, 28) };
    const revenue = { cow: r.step(20, 32, 1), dog: r.step(3, 6, 1), star: r.step(10, 16, 1), qm: r.step(3, 7, 1) };
    const rms = (x: (typeof roles)[number]) => tidy(own[x] / rival[x]);
    const items = roles.map((role, i) => ({ role, name: names[i]! }));
    const by = (role: (typeof roles)[number]) => items.find((x) => x.role === role)!.name;
    const qm = by('qm');
    const LABEL = { cow: 'Cash cow', dog: 'Dog', star: 'Star', qm: 'Question mark' } as const;
    return {
      title: `${name}: where should the marketing budget go?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the marketing director of ${name}.`,
      brief: [
        `${name}, ${k.what} in ${p.city}, ${p.country}, sells four products. Next year’s marketing budget is limited, and each brand manager has asked for more.`,
        'The director wants the budget to follow the portfolio: which products earn the cash, which need it, and which have a future.',
      ],
      question: `Where should ${name} put most of next year’s marketing budget?`,
      problem: {
        prompt: 'What is the problem the marketing director must solve?',
        choices: [
          best('Deciding which products deserve investment, given their markets’ growth and their share of them', 'The budget cannot satisfy every brand; the portfolio’s mix of growth and share decides where money will do most.'),
          fair('Every brand manager wants more money', 'That is why a decision is needed, but it is not the basis for making it.'),
          weak('Choosing an advertising agency', 'The agency is chosen after the budget is split, not before.'),
          weak('Raising the price of every product', 'Pricing is not the question in the evidence.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('The portfolio', true, 'Market growth, market share and the largest rival’s share place each product on the BCG matrix.', ['Product', 'Market growth a year', 'Its market share', 'Largest rival’s share', 'Revenue'], items.map((x) => [x.name, pct(growth[x.role]), pct(own[x.role]), pct(rival[x.role]), money(revenue[x.role] * 1_000_000 * p.k, p)]), 'Simulated data. The board treats market growth above 5% a year as high.'),
          text(`Blind taste and product tests: ${qm}`, true, 'It shows whether the question mark could win share if it were backed.', promising ? `In blind tests, buyers preferred ${qm} to the market leader’s product by a clear margin. (Simulated.)` : `In blind tests, buyers preferred the market leader’s product to ${qm} by a clear margin. (Simulated.)`),
          text('Finance note on cash', true, 'It shows where the cash to fund the budget comes from.', `${by('cow')} produces most of the business’s spare cash; ${by('star')} uses nearly all it earns to keep up with its market. (Simulated.)`),
          text('Agency pitch', false, 'Which agency runs the campaigns is decided after the budget is split.', 'Three agencies have pitched; the shortlist will be announced next month.'),
          text('Office note: parking', false, 'Parking arrangements are unrelated to the portfolio.', 'Visitor parking will move to the north entrance from tomorrow.'),
        ],
      },
      tools: [
        { tool: 'bcg-matrix', verdict: 'best', why: 'The question is how to spread money across a portfolio of products by their market growth and relative market share: exactly what the BCG matrix shows.' },
        { tool: 'ansoff-matrix', verdict: 'fair', why: notThisTool('ansoff-matrix', 'It deals with growth into new products or markets; the question here is how to fund the products already sold.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'It would describe the business as a whole, not compare four products’ positions.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no uncertain outcomes with probabilities to weigh; the data is market growth and share.') },
      ],
      analysis: {
        steps: [
          'Work out each product’s relative market share: its share divided by the largest rival’s share.',
          'Place each product: high or low market growth (above or below 5%), and high or low relative share (above or below 1).',
          'Decide where cash comes from and where it should go, then check the result against the other evidence.',
        ],
        calc: {
          prompt: `Calculate the relative market share of ${qm}, to two decimal places.`,
          answer: roundTo(rms('qm'), 2),
          dp: 2,
          tolerance: 0.006,
          prefix: '',
          suffix: '',
          working: ['Relative market share = the product’s market share ÷ the largest rival’s share', `= ${own.qm}% ÷ ${rival.qm}%`, `= ${num(rms('qm'), 2)}`],
          slips: [
            { value: roundTo(rival.qm / own.qm, 2), why: 'The division is upside down: the product’s own share goes on top.' },
            { value: own.qm - rival.qm, why: 'Relative share is a ratio, not a difference: divide the product’s share by the rival’s.' },
          ].filter((s, i, all) => Math.abs(s.value - roundTo(rms('qm'), 2)) > 0.006 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Below 1: ${qm} is well behind its market’s leader, in a market growing ${pct(growth.qm)} a year, which makes it a question mark.`,
        },
        sort: {
          prompt: 'Place each product in its category of the BCG matrix.',
          categories: [
            { id: 'star', label: 'Star' },
            { id: 'cow', label: 'Cash cow' },
            { id: 'qm', label: 'Question mark' },
            { id: 'dog', label: 'Dog' },
          ],
          items: items.map((x, i) => ({
            id: `b${i + 1}`,
            text: x.name,
            answer: x.role,
            why: `Market growth ${pct(growth[x.role])} (${growth[x.role] > 5 ? 'high' : 'low'}) and relative share ${num(rms(x.role), 2)} (${rms(x.role) >= 1 ? 'high' : 'low'}): ${LABEL[x.role].toLowerCase()}.`,
          })),
        },
        model: [
          `${by('cow')} is a cash cow (growth ${pct(growth.cow)}, relative share ${num(rms('cow'), 2)}): it earns more cash than it needs.`,
          `${by('star')} is a star (growth ${pct(growth.star)}, relative share ${num(rms('star'), 2)}): it leads a fast-growing market but needs cash to keep up.`,
          `${qm} is a question mark (relative share ${num(rms('qm'), 2)} in a market growing ${pct(growth.qm)}); ${promising ? 'the blind tests suggest it could win share if backed' : 'the blind tests suggest it would struggle to win share'}.`,
          `${by('dog')} is a dog (growth ${pct(growth.dog)}, relative share ${num(rms('dog'), 2)}): a candidate for review, though it may still earn a little cash.`,
        ],
      },
      recommend: {
        prompt: 'Where should most of the budget go?',
        choices: [
          (promising ? best : fair)(`Use the cash from ${by('cow')} to build the share of ${qm}`, promising ? `${qm} is in a fast-growing market, and the blind tests show buyers prefer it: backing it now could turn a question mark into a future star.` : `${qm}’s market is growing, but buyers prefer the leader’s product in blind tests: money spent winning share may be wasted.`),
          (promising ? fair : best)(`Concentrate on ${by('star')} to keep its lead, and review ${qm}`, promising ? `Sensible protection for the star, but it passes up a question mark that the evidence says could win share now.` : `${by('star')} leads a fast-growing market and needs cash to stay ahead, while ${qm} lags a leader that buyers prefer: support the proven product and decide ${qm}’s future.`),
          weak(`Spend most on ${by('cow')}, the biggest earner`, `A cash cow needs little investment: its market is growing only ${pct(growth.cow)} a year, so extra marketing buys little, and it is the source of cash for the others.`),
          fair(`Drop ${by('dog')} and spend its budget elsewhere`, 'Dogs are candidates for divestment, but this one may still earn a little cash or support the range, and the budget question is mainly about the star and the question mark.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the BCG categories and one other piece of evidence.',
        criteria: ['Places the products with the figures for growth and relative share', 'Explains the flow of cash from the cash cow to the products that need it', 'Uses evidence beyond the matrix, such as the blind tests'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder is most affected by the split of the budget?',
          choices: [
            best('The brand managers and their teams, whose products gain or lose support', 'The budget decides which brands grow and which are run down, and with them the teams’ work.'),
            fair('Customers of the product that loses support', 'They may see fewer promotions or, in time, lose the product, but the immediate effect is inside the business.'),
            weak('The agencies that pitched', 'They compete for the work whatever the split.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best(promising ? `${qm} fails to win share despite the money, and the cash is lost` : `${qm}’s market keeps growing and a rival takes the opportunity`, promising ? 'Question marks are uncertain by nature; setting a share target for the first year limits how much is spent before the result is clear.' : 'Running down a question mark can give up a growing market; the review should be quick and clear.'),
            fair(`${by('cow')}’s market starts to decline sooner than expected`, 'The cash cow funds the rest; if its cash fell, every plan would need revisiting.'),
            weak('The visitor parking moves', 'Where visitors park has no bearing on any product’s growth or share.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(promising ? `New tests showing buyers now prefer the leader’s product to ${qm}` : `New tests showing buyers now prefer ${qm} to the leader’s product`, 'The case for or against backing the question mark rests on whether it can win share; the tests are the evidence for that.'),
            fair(`${by('star')}’s market growth slowing below 5%`, 'The star would become a cash cow, freeing cash, but the question mark’s case would not change.'),
            weak('A different agency winning the pitch', 'The agency does not change where the money should go.'),
          ],
        },
      },
      model: {
        problem: `${name} must decide which products deserve the limited budget, given their markets’ growth and their share.`,
        evidence: 'They give each product’s growth and shares, the blind tests and the cash flows. The agency pitch and the parking are distractors.',
        tool: 'The BCG matrix, which places products by market growth and relative market share.',
        analysis: `${by('cow')} is a cash cow, ${by('star')} a star, ${qm} a question mark (relative share ${num(rms('qm'), 2)}) and ${by('dog')} a dog.`,
        recommendation: promising ? `Use the cash cow’s cash to build ${qm}’s share, with a target for the first year.` : `Concentrate on ${by('star')} to keep its lead, and review ${qm}.`,
        evaluation: 'The brand teams are most affected; the question mark is the uncertain bet; new test results would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const FORECAST = [
  { noun: 'Gelato', industry: 'Food and drink', what: 'a chain of gelato kiosks', x: 'Maximum temperature', xu: '°C', y: 'Cups sold', a: [-180, -60], b: [38, 52], xs: [14, 27], unit: 'cups' },
  { noun: 'Cycle Hire', industry: 'Tourism', what: 'a city cycle-hire scheme', x: 'Maximum temperature', xu: '°C', y: 'Bikes hired', a: [-120, -20], b: [26, 40], xs: [10, 25], unit: 'bikes' },
  { noun: 'Hot Drinks', industry: 'Food and drink', what: 'a hot-drinks kiosk at a station', x: 'Maximum temperature', xu: '°C', y: 'Cups sold', a: [900, 1100], b: [-30, -20], xs: [2, 18], unit: 'cups' },
  { noun: 'Umbrellas', industry: 'Retail', what: 'an umbrella and rainwear kiosk at a busy station', x: 'Rainfall', xu: '\u00a0mm', y: 'Umbrellas sold', a: [20, 40], b: [5, 9], xs: [0, 20], unit: 'umbrellas' },
];

const salesForecast: Family = {
  id: 'sales-forecast',
  unit: 4,
  subtopics: ['4.3'],
  tool: 'simple-linear-regression',
  level: 'HL',
  title: 'How many should we plan for?',
  summary: 'A line of best fit gives a forecast; how far to trust it depends on the correlation and on whether it extrapolates.',
  industries: ['Food and drink', 'Tourism', 'Retail'],
  quantitative: true,
  make(r) {
    const k = r.pick(FORECAST);
    const p = place(r);
    const name = businessName(r, k.noun);
    const a = r.int(k.a[0]!, k.a[1]!);
    const b = r.int(k.b[0]!, k.b[1]!);
    const strong = r.chance(0.5);
    const rCorr = strong ? r.int(86, 95) / 100 : r.int(30, 50) / 100;
    const inside = r.chance(0.5);
    const [lo, hi] = k.xs as [number, number];
    const x0 = inside ? r.int(lo + 2, hi - 2) : b > 0 ? hi + r.int(5, 9) : lo - r.int(4, 7);
    const yhat = a + b * x0;
    const xs = Array.from({ length: 8 }, (_, i) => lo + Math.round(((hi - lo) * i) / 7));
    const noise = strong ? 0.06 : 0.3;
    const ys = xs.map((x) => Math.max(0, Math.round((a + b * x) * (1 + (r.next() * 2 - 1) * noise))));
    const trust = strong && inside;
    const sign = rCorr * (b < 0 ? -1 : 1);
    const xLabel = (v: number) => `${num(v)}${k.xu}`;
    return {
      title: `${name}: how many should we plan for?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: 'a small business with 25 staff',
      role: `You advise the operations manager of ${name}.`,
      brief: [
        `${name} runs ${k.what} in ${p.city}, ${p.country}. Every evening the manager must decide how much to prepare for the next day: too little loses sales, too much is wasted.`,
        `The manager has fitted a line of best fit to recent days, linking ${k.y.toLowerCase()} to ${k.x.toLowerCase()}, and wants to use it for tomorrow, when the ${k.x.toLowerCase()} is expected to be ${xLabel(x0)}.`,
      ],
      question: `How many ${k.unit} should ${name} plan for tomorrow, and how far should it trust the forecast?`,
      problem: {
        prompt: 'What is the problem the manager must solve?',
        choices: [
          best('Making a forecast from the line and judging how reliable it is before planning on it', 'The line gives a number; its correlation and whether tomorrow lies inside the data decide how much weight the number can bear.'),
          fair('Too much is wasted on some days', 'Waste is the cost of a poor forecast, the reason the question matters, not the question itself.'),
          weak('Choosing a new supplier of cups and packaging', 'A distractor in the pack: suppliers do not change how many will be sold.'),
          weak('Changing the opening hours', 'Nothing in the evidence is about opening hours.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Recent days', true, 'The data the line was fitted to: it shows the range the line covers and how closely the points follow it.', ['Measure', ...xs.map((_, i) => `Day ${i + 1}`)], [[k.x, ...xs.map(xLabel)], [k.y, ...ys.map((v) => num(v))]], 'Simulated data: eight recent days.'),
          text('The line of best fit', true, 'The equation gives the forecast; the correlation says how closely sales follow the line.', `${k.y} = ${num(a)} ${b < 0 ? '−' : '+'} ${num(Math.abs(b))} × ${k.x.toLowerCase()}. Correlation coefficient: ${sign < 0 ? '−' : ''}${num(Math.abs(sign), 2)}. (Simulated.)`),
          text('Tomorrow’s forecast', true, 'Tomorrow’s value, inside or outside the data, decides whether the forecast interpolates or extrapolates.', `Tomorrow the ${k.x.toLowerCase()} is expected to be ${xLabel(x0)}. (Simulated weather forecast.)`),
          text('Supplier price list', false, 'Supplier prices affect cost, not how many will be sold.', 'Packaging and cups: prices held until the end of the year.'),
          text('Staff rota note', false, 'Who works which shift does not bear on the forecast.', 'Please swap shifts only through the rota app from next month.'),
        ],
      },
      tools: [
        { tool: 'simple-linear-regression', verdict: 'best', why: 'Sales are linked to one variable, and a line of best fit has been drawn: simple linear regression gives the forecast and, through the correlation and the range of the data, how far to trust it.' },
        { tool: 'descriptive-statistics', verdict: 'fair', why: notThisTool('descriptive-statistics', 'An average of past weeks would ignore the link with the other variable, which is what makes tomorrow different.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'The question is a forecast from a relationship, not a choice between options with probabilities.') },
        { tool: 'gantt-chart', verdict: 'weak', why: notThisTool('gantt-chart', 'There is no project to schedule; the question is how much to prepare.') },
      ],
      analysis: {
        steps: [
          'Put tomorrow’s value into the line’s equation to get the forecast.',
          'Read the correlation coefficient: how closely do the points follow the line?',
          'Check whether tomorrow lies inside the range of the data (interpolation) or outside it (extrapolation).',
        ],
        calc: {
          prompt: `Use the line to forecast ${k.y.toLowerCase()} tomorrow.`,
          answer: yhat,
          dp: 0,
          tolerance: 0.5,
          prefix: '',
          suffix: ` ${k.unit}`,
          working: [`${k.y} = ${num(a)} ${b < 0 ? '−' : '+'} ${num(Math.abs(b))} × ${num(x0)}`, `= ${num(a)} ${b * x0 < 0 ? '−' : '+'} ${num(Math.abs(b * x0))}`, `= ${num(yhat)}`],
          slips: [
            { value: b * x0, why: 'Add the intercept, the number the equation starts from.' },
            { value: a + b, why: 'Multiply the slope by tomorrow’s value before adding the intercept.' },
            { value: a - b * x0, why: 'Check the sign of the slope in the equation.' },
          ].filter((s, i, all) => Math.abs(s.value - yhat) > 0.5 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `${inside ? 'Tomorrow lies inside the data, so this is interpolation' : 'Tomorrow lies outside the data, so this is extrapolation'}, with a ${strong ? 'strong' : 'weak'} correlation.`,
        },
        model: [
          `Forecast: ${num(yhat)} ${k.unit}.`,
          strong ? `A correlation of ${num(sign, 2)} is strong: the points lie close to the line.` : `A correlation of ${num(sign, 2)} is weak: many weeks lie far from the line, so other factors matter too.`,
          inside ? `${xLabel(x0)} is inside the range of the data (${xLabel(lo)} to ${xLabel(hi)}): interpolation, the safer use of a line.` : `${xLabel(x0)} is outside the range of the data (${xLabel(lo)} to ${xLabel(hi)}): extrapolation assumes the relationship holds where it has never been observed.`,
          'Correlation is not causation: the line describes a pattern, and a change in other conditions can break it.',
        ],
      },
      recommend: {
        prompt: 'How should the manager plan tomorrow?',
        choices: [
          (trust ? best : weak)(`Plan for the forecast, ${num(yhat)} ${k.unit}, with a small buffer`, trust ? 'A strong correlation and a value inside the data make the forecast a sound basis; a small buffer covers the scatter around the line.' : `${strong ? 'The correlation is strong, but' : 'The correlation is weak, and'} ${inside ? 'the forecast deserves less weight than that.' : 'tomorrow lies outside the data, so the line may not hold there.'}`),
          (trust ? fair : best)('Treat the forecast as a rough guide: plan for a range, and adjust during the week', trust ? 'Prudent, but with a strong correlation and a value inside the data the forecast deserves more weight than a rough guide.' : `${!strong ? 'With a weak correlation, sales scatter widely around the line' : ''}${!strong && !inside ? ', and ' : ''}${!inside ? `tomorrow (${xLabel(x0)}) lies outside the data, where the relationship is untested` : ''}: plan for a range and keep the ability to adjust.`),
          weak('Ignore the line and prepare the same as today', 'It throws away the relationship the data shows, which is what makes tomorrow different from today.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the forecast, the correlation and the range of the data.',
        criteria: ['Uses the forecast with its figure', 'Judges reliability from the correlation and from interpolation or extrapolation', 'Says how the plan copes if the forecast is wrong'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder feels a wrong forecast first?',
          choices: [
            best('Customers, who find the business sold out if the forecast is too low', 'Too little prepared means queues and empty shelves; the business loses sales and some goodwill.'),
            fair('The owners, who pay for waste if the forecast is too high', 'They bear the cost of waste, though less visibly than customers bear a shortage.'),
            weak('The packaging supplier', 'The supplier is paid for its orders either way.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of relying on the line?',
          choices: [
            best(inside ? 'Other factors the line ignores change tomorrow, such as a local event' : 'The relationship does not hold outside the range of the data', inside ? 'A line with one variable leaves out everything else that moves sales; the manager’s knowledge of the week fills that gap.' : `Beyond ${xLabel(hi)} or below ${xLabel(lo)} there is no evidence for the line; demand may level off or behave differently.`),
            fair('The data covers only eight days', 'A short run of data makes the line less certain, especially at its ends.'),
            weak('The rota app is introduced late', 'How shifts are swapped has no bearing on how many will be sold tomorrow.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(trust ? 'A run of days on which sales fall far from the line' : 'More days of data covering conditions like tomorrow’s, with points close to the line', trust ? 'It would show the relationship weakening, and the forecast should carry less weight.' : 'It would turn an uncertain extrapolation or a weak pattern into a firmer basis for planning.'),
            fair('Tomorrow’s expected value changing by a little', 'A small change moves the forecast a little along the line, not the judgement of its reliability.'),
            weak('A cheaper packaging supplier', 'Costs do not change how many will be sold.'),
          ],
        },
      },
      model: {
        problem: `${name} must forecast tomorrow from its line of best fit and judge how far to rely on it.`,
        evidence: 'They give the data, the line with its correlation and tomorrow’s expected value. The supplier prices and the rota note are distractors.',
        tool: 'Simple linear regression: the line gives the forecast, and the correlation and the data’s range give its reliability.',
        analysis: `Forecast ${num(yhat)} ${k.unit}; correlation ${num(sign, 2)} (${strong ? 'strong' : 'weak'}); ${inside ? 'interpolation' : 'extrapolation'}.`,
        recommendation: trust ? `Plan for about ${num(yhat)} ${k.unit} with a small buffer.` : 'Treat the forecast as a rough guide: plan for a range and adjust during the week.',
        evaluation: 'Customers feel a shortage first; factors the line leaves out are the risk; evidence on the relationship in conditions like tomorrow’s would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const STUCK = [
  { noun: 'Hair Studios', industry: 'Services', what: 'a chain of hair salons', niche: 'curly and textured hair', scale: 'quick, walk-in cuts at a low price' },
  { noun: 'Air', industry: 'Aviation', what: 'a regional airline', niche: 'business travellers on two busy routes', scale: 'short flights at the lowest fares' },
  { noun: 'Coffee', industry: 'Hospitality', what: 'a coffee chain', niche: 'speciality coffee for enthusiasts', scale: 'fast, cheap coffee for commuters' },
  { noun: 'Living', industry: 'Retail', what: 'a furniture retailer', niche: 'furniture for small city flats', scale: 'flat-pack furniture at the lowest prices' },
];

const competitivePosition: Family = {
  id: 'stuck-in-the-middle',
  unit: 4,
  subtopics: ['4.2', '1.3'],
  tool: 'porters-generic-strategies',
  level: 'HL',
  title: 'Stuck in the middle?',
  summary: 'A mid-priced business is losing customers to cheaper and to better rivals, and must choose how to compete.',
  industries: ['Services', 'Aviation', 'Hospitality', 'Retail'],
  quantitative: false,
  make(r) {
    const k = r.pick(STUCK);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 80, 400);
    const nicheStrength = r.chance(0.5);
    const share = [r.int(16, 20), r.int(14, 17), r.int(12, 15)];
    const nicheShare = r.int(40, 60);
    return {
      title: `${name}: stuck in the middle?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the managing director of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}. For years it has offered a decent service at a middling price. Now low-cost rivals undercut it, and premium rivals offer more, and its share has fallen three years running.`,
        'The board accepts that it cannot be everything to everyone, and must decide how it will compete.',
      ],
      question: `How should ${name} compete from now on?`,
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          best('Choosing a clear basis for competing, because a middle position is being squeezed from both sides', 'Neither cheapest nor best, the business gives customers no strong reason to choose it; the decision is which source of advantage and which scope to commit to.'),
          fair('Market share has fallen for three years', 'The falling share is the symptom; the cause is a position that no longer stands out.'),
          weak('Rivals are advertising more', 'Rivals’ advertising is a sign of competition, not the reason the business is losing.'),
          weak('Choosing a new loyalty card design', 'A distractor in the pack: a card design does not decide how the business competes.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Market share', true, 'The steady fall in share is the evidence of the squeeze.', ['Year', 'Share'], share.map((s, i) => [`Year ${i + 1}`, `${s}%`]), 'Simulated data.'),
          text('Customer research', true, 'It shows where customers see the business, and where its loyal customers are.', nicheStrength ? `Most customers see ${name} as “fine but forgettable”. The exception is ${k.niche}: there it has ${nicheShare}% of the customers, and they praise its staff’s skill. (Simulated.)` : `Most customers see ${name} as “fine but forgettable”, with no group that prefers it strongly. (Simulated.)`),
          text('Operations review', true, 'It shows whether the business could run at lower cost than its rivals.', nicheStrength ? 'Costs per customer are higher than the low-cost rivals’ and hard to cut: the sites are small and the work is skilled. (Simulated.)' : `New systems and its larger sites give ${name} the lowest cost per customer in the market, though prices have not reflected it. (Simulated.)`),
          text('Designer’s proposal: loyalty card', false, 'A new card design does not decide how the business competes.', 'A fresh design for the loyalty card, in the brand’s colours.'),
          text('Notice: the annual general meeting', false, 'The date of the meeting is unrelated to the strategy itself.', 'The annual general meeting will be held on the first Thursday of next month.'),
        ],
      },
      tools: [
        { tool: 'porters-generic-strategies', verdict: 'best', why: 'The business is squeezed between low-cost and premium rivals: Porter’s generic strategies set out the choices (lower cost or difference, across the market or in a niche) and the risk of being stuck in the middle.' },
        { tool: 'ansoff-matrix', verdict: 'fair', why: notThisTool('ansoff-matrix', 'It deals with where to grow; the problem here is how to compete in the market the business is already in.') },
        { tool: 'bcg-matrix', verdict: 'weak', why: notThisTool('bcg-matrix', 'The business has one offer; there is no portfolio to plot.') },
        { tool: 'force-field-analysis', verdict: 'weak', why: notThisTool('force-field-analysis', 'The strategy must be chosen before the forces for and against carrying it out can be weighed.') },
      ],
      analysis: {
        steps: [
          'Name the four generic strategies, by source of advantage (lower cost or difference) and scope (the whole market or a niche).',
          'Place each possible move in its strategy.',
          'Match the strategies to the evidence: where are the business’s strengths, in costs or in a loyal niche?',
        ],
        sort: {
          prompt: 'Place each possible move in its generic strategy.',
          categories: [
            { id: 'cost', label: 'Cost leadership' },
            { id: 'diff', label: 'Differentiation' },
            { id: 'costfocus', label: 'Cost focus' },
            { id: 'difffocus', label: 'Differentiation focus' },
          ],
          items: [
            { id: 'g1', text: `Cut costs across every site and offer ${k.scale.split(' at ')[0]} at the lowest price in the market`, answer: 'cost', why: 'Lower cost than rivals, for the whole market: cost leadership.' },
            { id: 'g2', text: 'Raise quality and service across every site, and charge more for it', answer: 'diff', why: 'Something customers value and will pay more for, for the whole market: differentiation.' },
            { id: 'g3', text: `Serve only ${k.niche}, with expert staff, at a premium`, answer: 'difffocus', why: 'A special offer for one narrow segment: differentiation focus.' },
            { id: 'g4', text: 'Serve only students and budget customers in one district, at the lowest price there', answer: 'costfocus', why: 'The lowest price, for one narrow segment: cost focus.' },
          ],
        },
        model: [
          'A middle position gives no clear reason to choose the business: low-cost rivals win on price and premium rivals on quality, the risk Porter calls being stuck in the middle.',
          nicheStrength ? `Its strength is a loyal niche: ${nicheShare}% of ${k.niche} customers, who praise its skilled staff, while its costs are hard to cut.` : 'Its strength is cost: it has the lowest cost per customer, and no group of customers prefers it strongly.',
          nicheStrength ? 'Differentiation focus builds on that strength; cost leadership would fight rivals on their own ground with a higher cost base.' : 'Cost leadership builds on that strength; a niche strategy would need a loyal segment it does not have.',
        ],
      },
      recommend: {
        prompt: 'Which strategy should the board choose?',
        choices: [
          (nicheStrength ? best : fair)(`Differentiation focus: specialize in ${k.niche}`, nicheStrength ? `The business already holds ${nicheShare}% of that segment, and its customers value the staff’s skill: a focus builds on a real strength that low-cost rivals cannot easily copy.` : 'Attractive in principle, but no segment prefers the business strongly; it would have to build the loyalty first.'),
          (nicheStrength ? fair : best)('Cost leadership: pass its lower costs on as the lowest prices in the market', nicheStrength ? 'Its costs are higher than the low-cost rivals’ and hard to cut, so it would fight them on their ground at a disadvantage.' : 'It already has the lowest cost per customer; turning that into the lowest prices gives customers a clear reason to choose it, and rivals with higher costs cannot follow.'),
          weak('Keep the middle position and advertise more', 'More advertising for an offer that is neither cheapest nor best does not give customers a reason to choose it; the squeeze would continue.'),
          weak('Differentiate across the whole market, competing with the premium rivals', 'It would need large investment in quality across every site, against rivals already established at the top of the market.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the evidence on costs and on customers.',
        criteria: ['Names the strategy by its source of advantage and its scope', 'Links it to a real strength in the evidence', 'Explains the risk of staying in the middle'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder group changes most under the strategy you recommend?',
          choices: [
            best('Employees, whose skills, training and ways of working must fit the new strategy', 'A focus on expert service and a drive for lowest cost ask very different things of staff; the strategy succeeds only if their work changes to match.'),
            fair('Customers outside the chosen focus or price point', 'Some will leave, which is the price of a clear position.'),
            weak('The loyalty card designer', 'A distractor with no stake in the strategy.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of the strategy you recommend?',
          choices: [
            best(nicheStrength ? 'The niche is too small to support the business, or a bigger rival targets it' : 'A rival with deeper pockets starts a price war', nicheStrength ? 'A focus strategy lives or dies by the size and loyalty of its segment; both should be measured before the switch.' : 'Cost leadership invites price competition; it works only if the cost advantage is real and lasting.'),
            fair('Customers outside the new position leave faster than expected', 'Some loss is planned; the risk is losing them before the new position wins enough customers.'),
            weak('The annual general meeting runs long', 'A long meeting has no effect on whether the strategy works in the market.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(nicheStrength ? `Research showing the ${k.niche} segment is shrinking` : 'A low-cost rival achieving lower costs per customer', nicheStrength ? 'The focus relies on a segment worth serving; if it shrinks, the strategy loses its base.' : 'Cost leadership needs the lowest costs; without them, the business would be stuck competing on price at a disadvantage.'),
            fair('Market share stabilizing this year', 'It would ease the pressure, but not remove the risk of the middle position.'),
            weak('A new design for the loyalty card', 'A design does not change how the business competes.'),
          ],
        },
      },
      model: {
        problem: `${name} is squeezed in the middle of its market and must choose a clear basis for competing.`,
        evidence: 'They give the falling share, what customers think and the business’s costs. The loyalty card and the meeting notice are distractors.',
        tool: 'Porter’s generic strategies, which set out the choices and the risk of being stuck in the middle.',
        analysis: nicheStrength ? `A loyal niche (${nicheShare}% of ${k.niche}) and costs that are hard to cut point to differentiation focus.` : 'The lowest cost per customer and no loyal niche point to cost leadership.',
        recommendation: nicheStrength ? `Differentiation focus on ${k.niche}.` : 'Cost leadership: pass the lower costs on as the lowest prices.',
        evaluation: 'Employees change most; the size of the niche or a price war is the risk; evidence against the chosen strength would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const LAUNCH = [
  { noun: 'Audio', industry: 'Technology', what: 'a maker of headphones', product: 'its first wireless earbuds', fair: 'the consumer electronics fair' },
  { noun: 'Outdoor', industry: 'Consumer goods', what: 'a maker of camping equipment', product: 'a lightweight tent', fair: 'the outdoor trade show' },
  { noun: 'Toys', industry: 'Consumer goods', what: 'a toy company', product: 'a new construction set', fair: 'the toy fair' },
  { noun: 'Kitchenware', industry: 'Retail', what: 'a kitchenware brand', product: 'a range of non-stick pans', fair: 'the home and kitchen show' },
];

const launchPlan: Family = {
  id: 'launch-schedule',
  unit: 4,
  subtopics: ['4.5', '5.1'],
  tool: 'gantt-chart',
  level: 'HL',
  title: 'Can we launch at the fair?',
  summary: 'A product launch is planned for a trade fair; the schedule shows whether it can be ready in time.',
  industries: ['Technology', 'Consumer goods', 'Retail'],
  quantitative: true,
  make(r) {
    const k = r.pick(LAUNCH);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 40, 220);
    const d = { A: r.int(3, 5), B: r.int(3, 6), C: r.int(2, 4), D: r.int(3, 6), E: r.int(2, 4), F: 1 };
    const chain1 = d.B + d.E;
    const chain2 = d.C + d.D;
    const finish = d.A + Math.max(chain1, chain2) + d.F;
    const feasible = r.chance(0.5);
    const deadline = feasible ? finish + r.int(0, 2) : finish - r.int(1, 3);
    const longest = chain1 >= chain2 ? 'testing and the first production run' : 'packaging design and the advertising campaign';
    const tasks = [
      ['A', 'Final product design', String(d.A), 'None'],
      ['B', 'Safety and quality testing', String(d.B), 'A'],
      ['C', 'Packaging design', String(d.C), 'A'],
      ['D', 'Advertising campaign', String(d.D), 'C'],
      ['E', 'First production run', String(d.E), 'B'],
      ['F', 'Launch preparations at the stand', String(d.F), 'D and E'],
    ];
    return {
      title: `${name}: can we launch at the fair?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You manage the launch of ${k.product} at ${name}.`,
      brief: [
        `${name}, ${k.what} in ${p.city}, ${p.country}, wants to launch ${k.product} at ${k.fair}, which opens at the end of week ${deadline}. A stand must be booked now, and the deposit is not refundable.`,
        'The launch has six tasks, some of which must wait for others. The board wants to know whether the product can be ready in time before it pays the deposit.',
      ],
      question: `Should ${name} book a stand to launch at ${k.fair}?`,
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          best(`Whether the launch tasks can be finished by week ${deadline}, before committing to a deposit that cannot be refunded`, 'The decision turns on the schedule: how long the tasks take in their order of dependence, against a fixed date.'),
          fair('The fair is a good place to launch', 'It may be, but only if the product is ready; the schedule decides that.'),
          weak('Choosing the colours of the stand', 'A detail for later, once the launch date is settled.'),
          weak('Setting the launch price', 'Pricing matters for the launch, but not for whether it can happen on time.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Launch tasks', true, 'The tasks, their durations and their dependencies are what the Gantt chart is drawn from.', ['Task', 'Description', 'Weeks', 'Must follow'], tasks, 'Simulated estimates. Work starts at the beginning of week 1.'),
          text('Fair booking terms', true, 'The deadline and the non-refundable deposit are what the schedule is tested against.', `${k.fair.charAt(0).toUpperCase() + k.fair.slice(1)} opens at the end of week ${deadline}. Stands must be booked now; the deposit cannot be refunded. (Simulated.)`),
          text('Note from the quality manager', true, 'It warns against cutting testing short, a risk if the schedule is tight.', 'Testing cannot be shortened without risking a recall: the safety tests take as long as they take. (Simulated.)'),
          text('Stand designer’s colour options', false, 'The stand’s colours do not affect whether the product is ready.', 'Three colour schemes for the stand, each matching the brand guidelines.'),
          text('Canteen notice', false, 'The canteen is unrelated to the launch schedule.', 'The canteen will close early on Fridays during the summer.'),
        ],
      },
      tools: [
        { tool: 'gantt-chart', verdict: 'best', why: 'A Gantt chart lays the six tasks against the weeks, in the order their dependencies require, and shows at a glance when the launch can happen.' },
        { tool: 'critical-path-analysis', verdict: 'fair', why: notThisTool('critical-path-analysis', 'It would give the same finishing time and the floats; for a short plan like this, the chart shows the answer more directly.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'The durations are estimates, not outcomes with probabilities.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'The question is one of timing, which SWOT does not address.') },
      ],
      analysis: {
        steps: [
          'Draw each task as a bar starting when the tasks it follows have finished.',
          'Find the week in which the last task, the launch preparations, ends.',
          'Compare it with the fair’s date, and see which chain of tasks decides the finish.',
        ],
        calc: {
          prompt: 'Calculate the earliest week by which all the launch tasks can be finished.',
          answer: finish,
          dp: 0,
          tolerance: 0.4,
          prefix: 'week ',
          suffix: '',
          working: [
            `Design (A) ends in week ${d.A}.`,
            `Testing then production (B then E): ${d.B} + ${d.E} = ${chain1} weeks; packaging then advertising (C then D): ${d.C} + ${d.D} = ${chain2} weeks.`,
            `F can start only when both chains are done: week ${d.A} + ${Math.max(chain1, chain2)} = week ${d.A + Math.max(chain1, chain2)}; F takes ${d.F} week, so everything ends in week ${finish}.`,
          ],
          slips: [
            { value: d.A + d.B + d.C + d.D + d.E + d.F, why: 'That adds every task end to end. Tasks that do not depend on each other run at the same time.' },
            { value: d.A + Math.min(chain1, chain2) + d.F, why: 'The launch preparations must wait for both chains, so the longer chain decides the finish.' },
            { value: d.A + Math.max(chain1, chain2), why: 'Add the launch preparations, which take a week after both chains are done.' },
          ].filter((s, i, all) => Math.abs(s.value - finish) > 0.4 && all.findIndex((x) => x.value === s.value) === i),
          meaning: finish <= deadline ? `The fair opens at the end of week ${deadline}, so the launch fits${finish === deadline ? ', with no time to spare' : `, with ${deadline - finish} week${deadline - finish === 1 ? '' : 's'} to spare`}.` : `The fair opens at the end of week ${deadline}: the launch would be ${finish - deadline} week${finish - deadline === 1 ? '' : 's'} late.`,
        },
        model: [
          `The tasks finish in week ${finish}; the fair opens at the end of week ${deadline}.`,
          `The longer chain is ${longest}: it decides the finish, so any delay in it delays the launch.`,
          'Testing cannot be shortened safely, so the schedule cannot be rescued by cutting it.',
          'The durations are estimates; a chart with no slack leaves no room for a delay.',
        ],
      },
      recommend: {
        prompt: 'What should the board decide?',
        choices: [
          (finish <= deadline ? best : weak)(`Book the stand and launch at ${k.fair}`, finish <= deadline ? `The tasks finish in week ${finish}, by the fair at the end of week ${deadline}; book the stand, and watch the longer chain, ${longest}, closely${finish === deadline ? ', since there is no time to spare' : ''}.` : `The tasks cannot finish before week ${finish}, after the fair opens; the deposit would be lost or the product shown unfinished.`),
          (finish <= deadline ? fair : best)('Book the following fair instead, and use the time to finish properly', finish <= deadline ? 'Safe, but it gives up a launch the schedule shows is possible, and lets rivals show first.' : `The schedule finishes in week ${finish}, after the fair; a later fair keeps the testing intact and avoids losing the deposit.`),
          weak('Book the stand and shorten the testing to fit', 'The quality manager warns that cutting testing risks a recall, which would cost far more than a missed fair.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the chart.',
        criteria: ['States the finishing week and the fair’s date', 'Names the chain of tasks that decides the finish', 'Says what happens if a task on that chain overruns'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder is most affected if the launch date slips?',
          choices: [
            best('Retail buyers who plan to order at the fair', 'They expect to see and order the product there; a missed or failed launch costs the business their orders for a season.'),
            fair('The staff working on the launch', 'They would face pressure as the date nears, but the lost orders fall on the business.'),
            weak('The canteen', 'A distractor with no stake in the launch.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best(finish <= deadline ? `A task on the longer chain overruns, and the launch misses the fair` : 'A rival launches a similar product at this year’s fair', finish <= deadline ? `With ${deadline - finish} week${deadline - finish === 1 ? '' : 's'} of slack, a short overrun on ${longest} is enough to miss the date.` : 'Waiting costs a season’s head start; it is the price of launching a finished, tested product.'),
            fair('The estimates of the durations are wrong', 'They are estimates, which is why the chart should be updated as each task ends.'),
            weak('The stand colours clash with the product', 'A detail with no effect on the schedule.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best(finish <= deadline ? `A delay of more than ${deadline - finish} week${deadline - finish === 1 ? '' : 's'} on ${longest}` : `A way to finish ${longest} at least ${finish - deadline} week${finish - deadline === 1 ? '' : 's'} sooner without cutting testing`, finish <= deadline ? 'It would push the finish past the fair’s date.' : 'It would bring the finish within the fair’s date, and the launch would become possible.'),
            fair('The fair offering refundable deposits', 'It would lower the cost of booking and then withdrawing, but not change when the product can be ready.'),
            weak('A cheaper stand design', 'Design costs do not change the schedule.'),
          ],
        },
      },
      model: {
        problem: `${name} must decide whether the launch can be ready by week ${deadline} before paying a deposit it cannot recover.`,
        evidence: 'They give the tasks with their durations and dependencies, the fair’s terms and the warning about testing. The stand colours and the canteen are distractors.',
        tool: 'A Gantt chart, which lays the tasks against time in the order their dependencies require.',
        analysis: `The tasks finish in week ${finish}, against the fair at the end of week ${deadline}; the longer chain is ${longest}.`,
        recommendation: finish <= deadline ? `Book the stand: the launch fits, if the longer chain is watched.` : 'Book the following fair: the launch cannot be ready in time without cutting testing.',
        evaluation: 'Retail buyers are most affected by a slip; an overrun on the longer chain is the risk; a change in its timing would change the answer.',
      },
    };
  },
};

export const UNIT4: Family[] = [researchSurvey, portfolio, salesForecast, competitivePosition, launchPlan];
