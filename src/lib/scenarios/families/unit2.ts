/**
 * Unit 2 families: what is demotivating staff (descriptive statistics), a
 * staff shortage and the outside forces behind it (STEEPLE), resistance to a
 * change (force field analysis, HL), a culture clash after a merger
 * (Hofstede, HL) and a pay dispute heading for arbitration (decision trees,
 * HL). Every business is fictional and every figure simulated.
 */
import { an, best, businessName, fair, money, notThisTool, num, pct, place, roundTo, shuffled, sized, table, text, tidy, weak } from '../kit';
import type { Family } from '../types';

/* ------------------------------------------------------------------ */

const REWARD = [
  { noun: 'Hotel', industry: 'Hospitality', what: 'a city-centre hotel', staffWord: 'housekeeping and front-desk staff' },
  { noun: 'Fresh Market', industry: 'Retail', what: 'a supermarket', staffWord: 'shop-floor staff' },
  { noun: 'Contact Centre', industry: 'Services', what: 'a customer contact centre', staffWord: 'call handlers' },
  { noun: 'Distribution', industry: 'Logistics', what: 'a distribution warehouse', staffWord: 'pickers and packers' },
];

const FACTORS = [
  { id: 'pay', label: 'Pay', kind: 'hygiene' },
  { id: 'conditions', label: 'Working conditions', kind: 'hygiene' },
  { id: 'security', label: 'Job security', kind: 'hygiene' },
  { id: 'recognition', label: 'Recognition for good work', kind: 'motivator' },
  { id: 'growth', label: 'Chance to learn and progress', kind: 'motivator' },
] as const;

const rewardSurvey: Family = {
  id: 'staff-survey',
  unit: 2,
  subtopics: ['2.4'],
  tool: 'descriptive-statistics',
  level: 'SL/HL',
  title: 'What is demotivating the staff?',
  summary: 'A staff survey shows what people rate lowest; the manager must decide what to change first.',
  industries: ['Hospitality', 'Retail', 'Services', 'Logistics'],
  quantitative: true,
  make(r) {
    const k = r.pick(REWARD);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 60, 240);
    const hygiene = r.chance(0.5);
    const low = hygiene ? 'conditions' : 'growth';
    // Ten answers from 1 to 5 for the lowest factor, so the mean is exact to one place.
    const answers = Array.from({ length: 10 }, () => r.int(1, 3));
    const mean = tidy(answers.reduce((a, b) => a + b, 0) / 10);
    const means: Record<string, number> = {};
    for (const f of FACTORS) means[f.id] = f.id === low ? mean : roundTo(Math.max(mean + 0.6, r.int(30, 41) / 10), 1);
    const lowLabel = FACTORS.find((f) => f.id === low)!.label;
    const absence = [r.int(3, 4), r.int(4, 5), r.int(5, 7)];
    const hygieneFix = 'Repair the staff areas, fix the broken equipment and review the shift patterns';
    const motivatorFix = 'Introduce training paths, job rotation and a recognition scheme that names good work';
    const fix = hygiene ? hygieneFix : motivatorFix;
    return {
      title: `${name}: what is demotivating the staff?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You support the general manager of ${name}.`,
      brief: [
        `${name} is ${k.what} in ${p.city}, ${p.country}, with ${size.staff} staff. Absence among its ${k.staffWord} has risen for three months, and the general manager ran a short survey: staff rated five parts of their work from 1 (very poor) to 5 (very good).`,
        'The manager has a modest budget and wants to spend it where it will make the most difference.',
      ],
      question: `What should ${name} change first to deal with falling motivation?`,
      problem: {
        prompt: 'What is the problem the manager must solve?',
        choices: [
          best('Finding the cause of the dissatisfaction, so that the budget is spent on what will make a difference', 'Absence is the sign; the survey exists to find the cause, and the right response depends on whether staff are dissatisfied with the basics or unmotivated by the work itself.'),
          fair('Absence has risen for three months', 'True, and it is why the manager is acting, but it is the symptom. Treating it directly, with more cover or stricter rules, leaves the cause in place.'),
          weak('Hiring agency staff to cover absence', 'That treats the symptom at a cost and does nothing about why staff are staying away.'),
          weak('Choosing new uniforms', 'The uniform catalogue is a distractor; it is not what staff rated lowest.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Survey: average rating of each part of the work', true, 'The averages show which factors staff rate lowest, the heart of the analysis.', ['Part of the work', 'Average rating (1 to 5)'], FACTORS.map((f) => [f.label, f.id === low ? 'See the next exhibit' : num(means[f.id]!, 1)]), 'Simulated survey of the same staff.'),
          table(`Survey: every answer on “${lowLabel.toLowerCase()}”`, true, 'The raw answers for the lowest-rated factor, from which its average is calculated.', ['Answer', ...answers.map((_, i) => String(i + 1))], [['Rating', ...answers.map(String)]], 'Simulated: ten staff answered this question.'),
          table('Days lost to absence each month', true, 'It shows the symptom growing, which tells the manager how urgent the problem is.', ['Month', 'Days lost per 10 staff'], absence.map((a, i) => [`Month ${i + 1}`, String(a)]), 'Simulated data.'),
          text('Catalogue: new uniforms', false, 'Uniforms were not among the things staff were asked about or rated low.', 'The supplier offers a new range of uniforms in three colours, delivered within a month.'),
          text('Facilities note: the car park', false, 'Resurfacing the car park is routine maintenance, unrelated to what the survey found.', 'The car park will be resurfaced over two weekends in the autumn.'),
        ],
      },
      tools: [
        { tool: 'descriptive-statistics', verdict: 'best', why: 'The evidence is survey data; the mean of each factor’s ratings shows which part of the work staff rate lowest, and so where to act first.' },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'Staff motivation is one internal issue, and the survey data needs summarizing, not sorting into four boxes.') },
        { tool: 'steeple-analysis', verdict: 'weak', why: notThisTool('steeple-analysis', 'The cause lies inside the business, in how staff experience their work, not in the outside world.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no options with probabilities and payoffs yet; first the survey must show what the problem is.') },
      ],
      analysis: {
        steps: [
          `Work out the average rating for “${lowLabel.toLowerCase()}” from the ten answers.`,
          'Rank the five factors from the lowest average to the highest.',
          'Sort the lowest ones with Herzberg’s theory: hygiene factors (pay, conditions, security), whose absence causes dissatisfaction, or motivators (recognition, growth), whose presence motivates.',
        ],
        calc: {
          prompt: `Calculate the mean rating for “${lowLabel.toLowerCase()}”, to one decimal place.`,
          answer: mean,
          dp: 1,
          tolerance: 0.05,
          prefix: '',
          suffix: '',
          working: [`Total of the ten ratings = ${answers.join(' + ')} = ${answers.reduce((a, b) => a + b, 0)}`, `Mean = ${answers.reduce((a, b) => a + b, 0)} ÷ 10 = ${num(mean, 1)}`],
          slips: [
            { value: answers.reduce((a, b) => a + b, 0), why: 'That is the total of the ratings. The mean divides it by the number of answers, 10.' },
            { value: (() => { const o = [...answers].sort((a, b) => a - b); return (o[4]! + o[5]!) / 2; })(), why: 'That is the middle value (the median). The question asks for the mean: the total divided by the number of answers.' },
          ].filter((s, i, all) => Math.abs(s.value - mean) > 0.05 && all.findIndex((x) => x.value === s.value) === i),
          meaning: `“${lowLabel}” has the lowest average of the five factors, so it is where the survey points first.`,
        },
        model: [
          `The mean for “${lowLabel.toLowerCase()}” is ${num(mean, 1)}, below every other factor (the next lowest is ${num(Math.min(...FACTORS.filter((f) => f.id !== low).map((f) => means[f.id]!)), 1)}).`,
          hygiene ? 'Working conditions is a hygiene factor in Herzberg’s theory: when it is poor, staff are dissatisfied, and no amount of recognition will make up for it.' : 'The chance to learn and progress is a motivator in Herzberg’s theory: the basics are acceptable, but the work offers little to motivate.',
          `Absence has risen from ${absence[0]} to ${absence[2]} days per 10 staff a month, so the problem is growing.`,
          'Ten answers is a small sample: the result is a strong pointer, worth checking by talking to staff.',
        ],
      },
      recommend: {
        prompt: 'What should the manager change first?',
        choices: [
          (hygiene ? best : fair)(hygieneFix, hygiene ? `Conditions score lowest (${num(mean, 1)}), and they are a hygiene factor: fixing them removes the dissatisfaction that is keeping staff away. Recognition would not work while the basics are poor.` : 'The basics score acceptably here, so improving them further would remove little dissatisfaction and add little motivation.'),
          (hygiene ? fair : best)(motivatorFix, hygiene ? 'Motivators matter, but Herzberg’s theory says they work only once the hygiene factors are put right, and conditions score lowest.' : `The chance to progress scores lowest (${num(mean, 1)}) while the basics are acceptable: staff are not dissatisfied so much as unmotivated, and motivators are what Herzberg says will help.`),
          weak('Pay everyone a one-off bonus', `Pay is a hygiene factor, and it is not what scored lowest; a one-off bonus may lift the mood for a month, but the cause of the problem, “${lowLabel.toLowerCase()}”, would remain.`),
          weak('Do nothing: every average is above 1', 'Absence is rising month by month; the survey has found a clear weak point, and leaving it costs more as absence grows.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the survey and one motivation theory.',
        criteria: ['Uses the survey: the lowest average, with its figure', 'Applies a theory accurately, such as Herzberg’s distinction between hygiene factors and motivators', 'Notes a limit of the evidence, such as the small sample'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder gains most if the change works?',
          choices: [
            best(`The ${k.staffWord}, whose working lives improve where they rated them lowest`, 'They gain directly, and their attendance is what the change is meant to restore.'),
            fair('Customers, who are served by fuller, more settled teams', 'They gain indirectly, as absence falls and service steadies.'),
            weak('The uniform supplier', 'A distractor: uniforms are not part of the change.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best('The small survey may not represent all staff, so the money goes to the wrong fix', 'Ten answers on the key question is a small sample; a short follow-up conversation with each team would test the finding before most of the budget is spent.'),
            fair('Staff expect more changes once one is made', 'A fair point about expectations, which honest communication of the budget can manage.'),
            weak('The car park resurfacing overruns', 'Routine maintenance running late has nothing to do with whether the change motivates staff.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best('A larger survey in which a different factor scores lowest', 'The recommendation follows the lowest-rated factor; a better sample pointing elsewhere would move the money with it.'),
            fair('Absence falling back next month without any change', 'It would ease the urgency, but not explain the low scores.'),
            weak('A cheaper uniform supplier', 'Uniforms are not among the things staff rated low, so their price cannot change what to fix first.'),
          ],
        },
      },
      model: {
        problem: `${name} must find what is causing the dissatisfaction behind rising absence, so that the budget goes where it helps.`,
        evidence: 'They give the average for each factor, the answers for the lowest one and the trend in absence. The uniforms and the car park are distractors.',
        tool: 'Descriptive statistics: the mean of each factor’s ratings shows where to act first.',
        analysis: `The mean for “${lowLabel.toLowerCase()}” is ${num(mean, 1)}, the lowest of the five; it is ${hygiene ? 'a hygiene factor, so staff are dissatisfied' : 'a motivator, so staff are unmotivated rather than dissatisfied'}.`,
        recommendation: `${fix}, because it answers the factor staff rate lowest.`,
        evaluation: 'Staff gain most; the small sample is the main risk; a larger survey pointing elsewhere would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const SHORTAGE = [
  { noun: 'Care Homes', industry: 'Healthcare', what: 'a group of five care homes', jobs: 'care workers' },
  { noun: 'Fruit Farms', industry: 'Agriculture', what: 'a fruit farm with packing sheds', jobs: 'pickers and packers' },
  { noun: 'Parcels', industry: 'Logistics', what: 'a parcel delivery firm', jobs: 'drivers and sorters' },
  { noun: 'Hotels', industry: 'Hospitality', what: 'a group of three hotels', jobs: 'housekeeping and kitchen staff' },
];

const workforcePlan: Family = {
  id: 'staff-shortage',
  unit: 2,
  subtopics: ['2.1'],
  tool: 'steeple-analysis',
  level: 'SL/HL',
  title: 'Why can we not find staff?',
  summary: 'A business short of staff sorts the outside forces behind the shortage before deciding how to recruit.',
  industries: ['Healthcare', 'Agriculture', 'Logistics', 'Hospitality'],
  quantitative: false,
  make(r) {
    const k = r.pick(SHORTAGE);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 80, 320);
    const hours = r.chance(0.5);
    const vacancies = r.int(18, 40);
    const reasons = hours
      ? [['The hours do not fit childcare or study', r.int(41, 52)], ['The pay is lower than elsewhere', r.int(18, 26)], ['The work is too physical', r.int(10, 16)]]
      : [['The pay is lower than elsewhere', r.int(41, 52)], ['The hours do not fit childcare or study', r.int(18, 26)], ['The work is too physical', r.int(10, 16)]];
    const flex = 'Offer flexible and part-time shifts, chosen through a scheduling app, to attract parents, students and older workers';
    const pay = 'Raise pay to match the rival employers in the area';
    return {
      title: `${name}: why can we not find staff?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the human resources manager of ${name}.`,
      brief: [
        `${name}, ${k.what} near ${p.city}, ${p.country}, has ${vacancies} posts for ${k.jobs} it cannot fill. Agency staff fill the gaps at a high cost, and the managers want a plan for the next two years.`,
        'The human resources manager wants to understand the forces outside the business that are making recruitment hard before choosing how to respond.',
      ],
      question: `How should ${name} respond to its staff shortage?`,
      problem: {
        prompt: 'What is the problem the human resources manager must solve?',
        choices: [
          best('Recruiting and keeping enough staff when outside forces are shrinking the pool of people willing to do the work', 'The shortage comes from forces outside the business (demographic change, policy, rival employers, law); a plan that ignores them treats the vacancies, not their causes.'),
          fair(`There are ${vacancies} unfilled posts`, 'The vacancies are the symptom; the question is why they cannot be filled and what would change that.'),
          weak('Agency staff are expensive', 'True, but cutting agency use without fixing recruitment would leave shifts uncovered.'),
          weak('Redesigning the company website', 'A distractor: the website is not why people turn the jobs down.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          text('Briefing: the labour market', true, 'It names the outside forces behind the shortage, which a STEEPLE analysis sorts.', 'The local population is ageing, and fewer young people are entering work. The government plans to issue fewer work visas next year. Wages in warehouses and shops nearby have risen faster than in this sector. A new law will require contracts with a guaranteed minimum of hours. (Simulated briefing.)'),
          table('Why applicants turned the jobs down', true, 'It shows which outside force weighs most with the people the business wants to hire.', ['Main reason given', 'Share of applicants'], reasons.map(([a, b]) => [String(a), `${b}%`]), 'Simulated survey of 120 applicants who turned down an offer or did not apply after enquiring.'),
          table('Vacancies and agency use', true, 'It shows the size and cost of the problem.', ['Measure', 'Figure'], [['Unfilled posts', String(vacancies)], ['Shifts covered by agency staff last month', String(r.int(150, 320))]], 'Simulated data.'),
          text('Note from the web designer', false, 'A new website will not change why applicants turn down the jobs.', 'The new website will have a cleaner look and faster pages; it should be ready in six weeks.'),
          text('Minutes: the summer barbecue', false, 'A staff event is unrelated to the outside forces behind the shortage.', 'The barbecue will be held on the last Friday of June; families are welcome.'),
        ],
      },
      tools: [
        { tool: 'steeple-analysis', verdict: 'best', why: 'The causes of the shortage lie outside the business: an ageing population, visa policy, rival wages and a new law. STEEPLE sorts them so that none is missed and the plan answers the ones that matter most.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'Its opportunities and threats would hold some of these forces, but STEEPLE scans the outside world more fully, and the problem lies there.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no options with probabilities and payoffs to compare yet; the causes must be understood first.') },
        { tool: 'ansoff-matrix', verdict: 'weak', why: notThisTool('ansoff-matrix', 'The question is about recruiting staff, not about which products to sell in which markets.') },
      ],
      analysis: {
        steps: [
          'Sort each outside force under its STEEPLE heading.',
          'Judge which forces bear most on recruitment, using what applicants said.',
          'Ask which forces the business can respond to, and how.',
        ],
        sort: {
          prompt: 'Place each force under its STEEPLE heading.',
          categories: [
            { id: 'social', label: 'Social' },
            { id: 'technological', label: 'Technological' },
            { id: 'economic', label: 'Economic' },
            { id: 'environmental', label: 'Environmental' },
            { id: 'political', label: 'Political' },
            { id: 'legal', label: 'Legal' },
            { id: 'ethical', label: 'Ethical' },
          ],
          items: [
            { id: 'w1', text: 'The local population is ageing, so fewer young people are entering work', answer: 'social', why: 'A demographic change: social factors cover the population, its age and its way of life.' },
            { id: 'w2', text: 'The government plans to issue fewer work visas', answer: 'political', why: 'A government policy on immigration: a political factor, even though it will be carried out through rules.' },
            { id: 'w3', text: 'Wages in nearby warehouses and shops have risen faster', answer: 'economic', why: 'The state of the labour market and rival employers’ pay: an economic factor.' },
            { id: 'w4', text: 'A new law will require contracts with guaranteed minimum hours', answer: 'legal', why: 'A change in employment law: a legal factor.' },
            { id: 'w5', text: 'Scheduling apps let staff choose and swap shifts on their phones', answer: 'technological', why: 'A new technology that could make flexible work practical: a technological factor.' },
            { id: 'w6', text: 'Many people now object to contracts with no guaranteed hours', answer: 'ethical', why: 'A question of what is fair to workers, beyond what the law requires: an ethical factor.' },
          ],
        },
        model: [
          'Social: an ageing population shrinks the pool of young workers. Political: fewer visas will cut recruitment from abroad. Economic: rival employers pay more. Legal: guaranteed minimum hours become law.',
          `Applicants say most often that ${String(reasons[0]![0]).toLowerCase()} (${reasons[0]![1]}%), so that is the force the plan must answer first.`,
          hours ? 'Technological: a scheduling app makes flexible shifts practical, which answers the most common reason directly.' : 'The pay gap with rival employers is the force the business can change most directly, though it costs most.',
          'Recruiting from abroad leans on exactly the source that visa policy is closing.',
        ],
      },
      recommend: {
        prompt: 'What should the plan put first?',
        choices: [
          (hours ? best : fair)(flex, hours ? `The commonest reason applicants give (${reasons[0]![1]}%) is that the hours do not fit their lives, and the ageing population means the business must attract parents, students and older workers; a scheduling app makes it practical.` : 'Useful, and it widens the pool, but applicants say most often that the pay is the problem.'),
          (hours ? fair : best)(pay, hours ? 'It would help, and rival wages are rising, but applicants mention pay less often than hours, and it is the most expensive response.' : `The commonest reason applicants give (${reasons[0]![1]}%) is pay, and rival employers have raised theirs; matching them answers the force that weighs most with the people the business wants.`),
          weak('Recruit more staff from abroad', 'The government plans to issue fewer work visas, so this route is narrowing just as the business would rely on it.'),
          weak('Use gig workers through an app, with no guaranteed hours', 'The new law on guaranteed minimum hours and the ethical objections to such contracts make this a poor long-term answer.'),
        ],
        justify: 'Justify your choice in two or three sentences, using at least two STEEPLE factors and the applicants’ reasons.',
        criteria: ['Names the STEEPLE factors that drive the shortage, with their headings', 'Uses the applicants’ survey to decide which factor matters most', 'Rules out a response that runs against a factor, such as visas or the new law'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder is most affected by the shortage itself?',
          choices: [
            best(`The existing ${k.jobs}, who cover the gaps with extra shifts`, 'They carry the extra work now, and if they burn out and leave, the shortage deepens.'),
            fair('The owners, who pay for agency staff', 'They bear the cost, but the existing staff bear the strain.'),
            weak('The web designer', 'A distractor: the web designer is paid the same whether or not the posts are filled.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best('Rivals respond in the same way, so the advantage does not last', 'Other employers face the same outside forces and can copy flexible shifts or higher pay; the plan needs to be part of a wider offer, such as training.'),
            fair('The cost rises faster than the savings on agency staff', 'A fair concern, which a trial on one site would measure before the change is rolled out.'),
            weak('The barbecue is rained off', 'A staff event has no bearing on whether the plan fills the vacancies.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best('A larger applicant survey giving a different main reason', 'The recommendation follows what applicants say matters most; if a fuller survey disagreed, the plan should follow it.'),
            fair('The visa plans being dropped', 'It would reopen recruitment from abroad, but the ageing population and rival wages would still weigh on the business.'),
            weak('The new website launching early', 'A website does not change why people turn the jobs down.'),
          ],
        },
      },
      model: {
        problem: `${name} must recruit and keep enough ${k.jobs} while outside forces shrink the pool of people willing to do the work.`,
        evidence: 'They describe the outside forces, why applicants turned the jobs down and the size of the shortage. The website and the barbecue are distractors.',
        tool: 'STEEPLE analysis, because the causes of the shortage lie outside the business.',
        analysis: `Social, political, economic, legal and ethical forces all bear on recruitment; applicants most often say that ${String(reasons[0]![0]).toLowerCase()}.`,
        recommendation: hours ? `${flex}.` : `${pay}.`,
        evaluation: 'Existing staff carry the shortage now; rivals may copy the response; a fuller survey with a different main reason would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const CHANGE = [
  { noun: 'Hospital Trust', industry: 'Healthcare', change: 'an electronic rota system', who: 'nurses and porters' },
  { noun: 'Wholesale', industry: 'Retail', change: 'an electronic ordering system', who: 'sales and warehouse staff' },
  { noun: 'Grocers', industry: 'Retail', change: 'self-service checkouts', who: 'checkout staff' },
  { noun: 'Insurance', industry: 'Financial services', change: 'shared desks and hybrid working', who: 'office staff' },
];

const changeResistance: Family = {
  id: 'change-resistance',
  unit: 2,
  subtopics: ['2.1'],
  tool: 'force-field-analysis',
  level: 'HL',
  title: 'Why is the change stalling?',
  summary: 'A change is meeting resistance; weighing the forces shows which one to weaken first.',
  industries: ['Healthcare', 'Retail', 'Financial services'],
  quantitative: true,
  make(r) {
    const k = r.pick(CHANGE);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 120, 600);
    const driving = [
      { id: 'cost', name: 'Lower running costs', s: r.int(3, 5) },
      { id: 'customers', name: 'Customers and managers expect faster service', s: r.int(2, 4) },
      { id: 'support', name: 'The board backs the change', s: r.int(2, 4) },
    ];
    // Distinct strengths for the restraining forces, in an order of the seed's choosing, so that one is clearly the strongest.
    const strengths = shuffled(r, r.pick([[5, 3, 2], [5, 4, 2], [4, 3, 2], [5, 4, 3], [4, 3, 1]]));
    const RESTRAIN = [
      { id: 'jobs', name: 'Fear of losing jobs', action: 'Guarantee no compulsory redundancies, and offer redeployment and retraining' },
      { id: 'training', name: 'Not enough time to learn the new system', action: 'Give paid training time in small groups before the change goes live' },
      { id: 'trust', name: 'Distrust after a failed change two years ago', action: 'Run a pilot with staff representatives and publish what it finds' },
    ];
    const restraining = RESTRAIN.map((x, i) => ({ ...x, s: strengths[i]! }));
    const strongest = [...restraining].sort((a, b) => b.s - a.s)[0]!;
    const dTotal = driving.reduce((a, x) => a + x.s, 0);
    const rTotal = restraining.reduce((a, x) => a + x.s, 0);
    const balance = dTotal - rTotal;
    return {
      title: `${name}: why is the change stalling?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the operations director of ${name}.`,
      brief: [
        `${name} in ${p.city}, ${p.country}, wants to introduce ${k.change}. Six months in, the change has stalled: ${k.who} avoid the new way of working, and some say openly that they do not trust it.`,
        'The director asked managers and staff representatives to list the forces for and against the change and to rate each from 1 (weak) to 5 (strong).',
      ],
      question: 'What should the director do to get the change moving?',
      problem: {
        prompt: 'What is the problem the director must solve?',
        choices: [
          best('Overcoming the resistance that is stopping a sound change, by dealing with its strongest cause', 'The change has clear benefits, but forces restrain it; the problem is which of them to weaken, and how.'),
          fair('Staff are avoiding the new system', 'This is what resistance looks like, not the reason for it.'),
          weak('The board is not committed to the change', 'The evidence shows the board backs it: board support is one of the driving forces.'),
          weak('Choosing a supplier for new office chairs', 'A distractor with no bearing on the change.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('Forces for the change', true, 'The driving forces and their strengths are half of the force field.', ['Driving force', 'Strength (1 to 5)'], driving.map((d) => [d.name, String(d.s)]), 'Simulated ratings, agreed at a workshop.'),
          table('Forces against the change', true, 'The restraining forces and their strengths show what is holding the change back.', ['Restraining force', 'Strength (1 to 5)'], restraining.map((x) => [x.name, String(x.s)]), 'Simulated ratings, agreed at a workshop.'),
          text('Comments from the staff survey', true, 'They explain the restraining forces in the staff’s own words.', `“Nobody has said what happens to our jobs.” “We were given one afternoon to learn it.” “The last system was dropped after a year; why is this one different?” (Simulated comments.)`),
          text('Quote for new office chairs', false, 'Office furniture has nothing to do with resistance to the change.', 'Ergonomic chairs can be supplied within four weeks at a discount for orders over twenty.'),
          text('Notice: the lift will be serviced', false, 'Routine maintenance is unrelated to the change.', 'The main lift will be out of use on Saturday morning for its annual service.'),
        ],
      },
      tools: [
        { tool: 'force-field-analysis', verdict: 'best', why: 'The change has forces pushing it and forces holding it back, each with a strength: force field analysis weighs them and points to the restraining force worth weakening.' },
        { tool: 'swot-analysis', verdict: 'fair', why: notThisTool('swot-analysis', 'It would describe the organization’s position, but not weigh the forces for and against this particular change.') },
        { tool: 'gantt-chart', verdict: 'weak', why: notThisTool('gantt-chart', 'The change is not late for want of a schedule; it is resisted, and a chart of tasks does not show why.') },
        { tool: 'decision-trees', verdict: 'weak', why: notThisTool('decision-trees', 'There are no outcomes with probabilities and payoffs here; the question is about the people the change depends on.') },
      ],
      analysis: {
        steps: [
          'Total the strengths of the driving forces and of the restraining forces.',
          'Find the balance: the driving total minus the restraining total.',
          'Identify the strongest restraining force, and an action that would weaken it without creating a new one.',
        ],
        calc: {
          prompt: 'Calculate the balance of the forces: the total of the driving forces minus the total of the restraining forces.',
          answer: balance,
          dp: 0,
          tolerance: 0.4,
          prefix: '',
          suffix: '',
          working: [`Driving forces: ${driving.map((d) => d.s).join(' + ')} = ${dTotal}`, `Restraining forces: ${restraining.map((x) => x.s).join(' + ')} = ${rTotal}`, `Balance = ${dTotal} − ${rTotal} = ${balance < 0 ? '−' : ''}${Math.abs(balance)}`],
          slips: [
            { value: rTotal - dTotal, why: 'The subtraction is the wrong way round: the balance is the driving total minus the restraining total.' },
            { value: dTotal + rTotal, why: 'The totals were added; the balance subtracts the restraining total from the driving total.' },
          ].filter((s, i, all) => Math.abs(s.value - balance) > 0.4 && all.findIndex((x) => x.value === s.value) === i),
          meaning: balance < 0 ? 'The restraining forces outweigh the driving forces, which is why the change has stalled.' : balance === 0 ? 'The forces are balanced, which is why the change has stalled: nothing tips it.' : 'The driving forces are stronger on paper, yet the change has stalled: the strongest restraining force is still enough to block it in practice.',
        },
        model: [
          `Driving forces total ${dTotal}; restraining forces total ${rTotal}; the balance is ${balance < 0 ? '−' : ''}${Math.abs(balance)}.`,
          `The strongest restraining force is “${strongest.name.toLowerCase()}”, at ${strongest.s}.`,
          'Weakening a restraining force usually works better than pushing harder: adding pressure tends to raise resistance with it.',
          'The ratings are the workshop’s judgements, so the totals summarize opinion rather than measure it.',
        ],
      },
      recommend: {
        prompt: 'What should the director do first?',
        choices: [
          ...restraining.map((x) => (x.id === strongest.id ? best : fair)(x.action, x.id === strongest.id ? `It weakens the strongest restraining force, “${x.name.toLowerCase()}” (${x.s}), which the staff comments confirm. Removing the biggest obstacle does most to tip the balance.` : `A sensible step, but “${x.name.toLowerCase()}” (${x.s}) is not the strongest restraining force; dealing with it first leaves the main obstacle in place.`)),
          weak('Push ahead and make the new system compulsory from next month', 'More pressure tends to raise resistance with it, and it does nothing about the reasons staff give; the change could stall again or fail.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the force field.',
        criteria: ['Uses the totals or the balance, with the figures', 'Names the strongest restraining force and explains how the action weakens it', 'Recognizes that the ratings are judgements, and checks them against the staff comments'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Whose support matters most for the change to succeed?',
          choices: [
            best(`The ${k.who}, who must use the new way of working every day`, 'The change happens only when they adopt it; their concerns are the restraining forces.'),
            fair('The board, which has approved the change', 'Its support is already a driving force; it cannot make the change work on its own.'),
            weak('The chair supplier', 'A distractor with no stake in the change.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best('A promise to staff that is not kept, which would deepen the distrust', 'Weakening a restraining force with a commitment works only if the commitment holds; a broken one makes resistance stronger next time.'),
            fair('The action costs more than planned', 'Possible, and worth budgeting for, but cheaper than a change that fails.'),
            weak('The lift service overruns', 'Routine maintenance has no bearing on whether staff adopt the change.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best('Staff interviews showing a different concern is the real obstacle', 'The ratings are a workshop’s judgement; if staff in interviews pointed elsewhere, the action should follow them.'),
            fair('The cost savings proving smaller than expected', 'It would weaken a driving force and raise the question of whether the change is worth it, but not which obstacle to tackle.'),
            weak('A cheaper quote for the chairs', 'Office furniture has nothing to do with the forces holding the change back.'),
          ],
        },
      },
      model: {
        problem: `${name} must overcome the resistance that has stalled ${k.change}, by dealing with its strongest cause.`,
        evidence: 'They give the forces for and against the change with their strengths, and the staff’s own comments. The chairs and the lift are distractors.',
        tool: 'Force field analysis, because the change has driving and restraining forces of different strengths.',
        analysis: `Driving ${dTotal}, restraining ${rTotal}, balance ${balance < 0 ? '−' : ''}${Math.abs(balance)}; the strongest restraining force is “${strongest.name.toLowerCase()}” (${strongest.s}).`,
        recommendation: `${strongest.action}: weaken the strongest restraining force rather than push harder.`,
        evaluation: 'The staff who must use the change matter most; a broken promise would deepen distrust; interviews pointing to another concern would change the answer.',
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const MERGE = [
  { noun: 'Engineering', industry: 'Manufacturing', what: 'an engineering firm that designs pumps', partner: 'a pump maker' },
  { noun: 'Software', industry: 'Technology', what: 'a software company that builds booking systems', partner: 'a software company' },
  { noun: 'Hotel Group', industry: 'Hospitality', what: 'a hotel group', partner: 'a smaller hotel group' },
  { noun: 'Foods', industry: 'Food and drink', what: 'a maker of packaged snacks', partner: 'a snack maker' },
];

const cultureMerger: Family = {
  id: 'culture-clash',
  unit: 2,
  subtopics: ['2.5'],
  tool: 'hofstedes-cultural-dimensions',
  level: 'HL',
  title: 'A merger and a culture clash',
  summary: 'Two firms from different countries have merged, and their staff expect different things from their managers.',
  industries: ['Manufacturing', 'Technology', 'Hospitality', 'Food and drink'],
  quantitative: false,
  make(r) {
    const k = r.pick(MERGE);
    const a = place(r);
    const b = place(r, ['Europe', 'Americas', 'Asia', 'Africa', 'Oceania'].filter((x) => x !== a.region) as Array<typeof a.region>);
    const nameA = businessName(r, k.noun);
    let nameB = businessName(r, k.noun);
    if (nameB === nameA) nameB = `${nameA.split(' ')[0]} Partners`;
    const leavers = [r.int(3, 5), r.int(7, 10), r.int(11, 16)];
    return {
      title: `${nameA} and ${nameB}: a merger and a culture clash`,
      business: nameA,
      industry: k.industry,
      place: `${a.city}, ${a.country}, and ${b.city}, ${b.country}`,
      size: `two medium-sized businesses, together about ${r.int(300, 450)} staff`,
      role: `You advise the board of the merged company.`,
      brief: [
        `${nameA}, ${k.what} based in ${a.city}, ${a.country}, has merged with ${nameB}, ${k.partner} based in ${b.city}, ${b.country}. The merger was meant to combine ${nameA}’s products with ${nameB}’s customers and engineers.`,
        `A year on, joint projects are late, meetings end in confusion, and staff at ${nameB} are leaving. The board asks why, and what to do.`,
      ],
      question: 'How should the board bring the two workforces together?',
      problem: {
        prompt: 'What is the problem the board must solve?',
        choices: [
          best('Managing a culture clash so that the merged company keeps its people and gets the benefits the merger was for', 'The two workforces expect different things from managers and from each other; until that is understood and managed, the merger’s benefits stay out of reach.'),
          fair(`Staff at ${nameB} are leaving`, 'A serious symptom of the clash, but not its cause; replacing leavers would not stop others going.'),
          weak('The joint projects need a better schedule', 'The projects are late because the teams misunderstand each other, not for want of a timetable.'),
          weak('Choosing a new name for the merged company', 'A distractor: a name will not change how people work together.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('How staff at each firm describe their work', true, 'The differences in what staff expect are the evidence of the clash, and each one maps to a cultural dimension.', ['Statement', nameA, nameB], [['Managers decide; staff expect clear instructions', `${r.int(68, 82)}% agree`, `${r.int(18, 30)}% agree`], ['Rewards should go to the team, not the individual', `${r.int(20, 32)}% agree`, `${r.int(65, 80)}% agree`], ['Every process should be written down and followed', `${r.int(70, 85)}% agree`, `${r.int(25, 40)}% agree`]], 'Simulated survey of staff at both firms.'),
          table(`Staff leaving ${nameB}, each quarter`, true, 'It shows the cost of the clash growing quarter by quarter, among the staff the merger was meant to keep.', ['Quarter since the merger', 'Leavers'], leavers.map((n, i) => [`Quarter ${i + 1}`, String(n)]), 'Simulated data.'),
          text('The merger’s aims', true, 'They say what the integration must protect: the products, the customers and the engineers.', `To combine ${nameA}’s products with ${nameB}’s customer base and engineering team, and to cut duplicated costs in finance and IT. (From the simulated board paper.)`),
          text('Brand consultants’ proposals', false, 'A new name will not resolve how the two workforces work together.', 'Three names for the merged company, each tested with customers in both countries.'),
          text('IT note', false, 'Merging the email systems is a practical task that happens whichever approach the board takes.', 'The two email systems will be merged in March over a weekend.'),
        ],
      },
      tools: [
        { tool: 'hofstedes-cultural-dimensions', verdict: 'best', why: 'The differences in the survey (how decisions are made, how rewards are shared, how far rules are followed) correspond to Hofstede’s dimensions, which help explain the clash and plan how to manage it.' },
        { tool: 'force-field-analysis', verdict: 'fair', why: notThisTool('force-field-analysis', 'It could weigh the forces for and against integration, but it would not explain why the two workforces expect different things.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'The merger’s position is known; the question is how two cultures can work together.') },
        { tool: 'porters-generic-strategies', verdict: 'weak', why: notThisTool('porters-generic-strategies', 'The clash is about how people work, not about how the company competes.') },
      ],
      analysis: {
        steps: [
          'Match each difference between the workforces to a cultural dimension.',
          'Explain how each difference could cause the problems the board sees: late projects, confused meetings, staff leaving.',
          'Check the dimensions against the evidence in the firms themselves, and remember they describe tendencies, not individuals.',
        ],
        sort: {
          prompt: 'Match each difference between the two workforces to a cultural dimension.',
          categories: [
            { id: 'pd', label: 'Power distance' },
            { id: 'ic', label: 'Individualism against collectivism' },
            { id: 'ua', label: 'Uncertainty avoidance' },
            { id: 'lt', label: 'Long-term against short-term orientation' },
            { id: 'mf', label: 'Masculinity against femininity' },
            { id: 'ir', label: 'Indulgence against restraint' },
          ],
          items: [
            { id: 'h1', text: `At ${nameA}, managers decide and staff expect instructions; at ${nameB}, staff expect to be consulted`, answer: 'pd', why: 'How far staff accept that power is shared unequally, and expect managers to decide: power distance.' },
            { id: 'h2', text: `At ${nameA}, bonuses reward individuals; at ${nameB}, rewards are shared by the team`, answer: 'ic', why: 'Whether people put themselves or their group first: individualism against collectivism.' },
            { id: 'h3', text: `At ${nameA}, every process is written down and followed; at ${nameB}, staff improvise when plans change`, answer: 'ua', why: 'How uneasy people are with ambiguity, and so how much they want rules: uncertainty avoidance.' },
            { id: 'h4', text: `At ${nameA}, targets look to the next quarter; at ${nameB}, plans look ten years ahead`, answer: 'lt', why: 'Whether people value quick results or persistence towards future rewards: long-term against short-term orientation.' },
            { id: 'h5', text: `At ${nameA}, staff compete for promotion; at ${nameB}, they value caring for colleagues and time outside work`, answer: 'mf', why: 'Whether achievement and competition or care and quality of life come first: masculinity against femininity.' },
          ],
        },
        model: [
          `Power distance: ${nameA}’s staff wait for decisions, while ${nameB}’s expect to be consulted, so joint meetings end without the decision either side expects.`,
          'Individualism against collectivism: individual bonuses look unfair to staff used to team rewards, which helps explain why they leave.',
          `Uncertainty avoidance: written procedures that reassure ${nameA} feel rigid to ${nameB}, and improvising looks careless the other way round.`,
          'These are tendencies, not facts about each person, so the board should test them in conversations with staff before acting.',
        ],
      },
      recommend: {
        prompt: 'What should the board do?',
        choices: [
          best('Build joint ways of working: explain how decisions are made, add team rewards for joint projects, and pair managers from each firm', `It respects what each workforce expects while creating shared practice; it addresses the differences behind the late projects and the leavers at ${nameB}, whose engineers the merger was meant to keep.`),
          fair('Keep the two firms working separately for two years before integrating', 'It avoids the clash for now, but it delays the benefits the merger was for and lets the differences harden.'),
          weak(`Impose ${nameA}’s practices on both firms at once`, `It would deepen the clash: ${nameB}’s staff, who expect consultation and team rewards, would have neither, and more of the engineers the merger needs would leave.`),
          weak(`Replace ${nameB}’s managers with ${nameA}’s`, 'It removes the people who understand the other workforce and its customers, and signals a takeover rather than a merger.'),
        ],
        justify: 'Justify your choice in two or three sentences, using at least two cultural dimensions.',
        criteria: ['Uses two or more dimensions, each linked to a difference in the survey', 'Connects the approach to the merger’s aims, such as keeping the engineers', 'Notes that national averages describe tendencies, not individuals'],
      },
      evaluate: {
        stakeholders: {
          prompt: 'Which stakeholder group is most at risk if the clash continues?',
          choices: [
            best(`${nameB}’s engineers and their customers`, `The merger was meant to keep them; they are leaving, and customers follow the people they know.`),
            fair(`${nameA}’s managers`, 'They are frustrated too, but their way of working is the one being kept.'),
            weak('The brand consultants', 'They are paid for their proposals whatever happens; they have nothing at stake in the clash.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk of your recommendation?',
          choices: [
            best('Building joint practice takes time, and more staff leave while it happens', `Leavers are already rising (${leavers.join(', ')} a quarter); the board needs quick signals, such as team rewards on current projects, alongside the longer change.`),
            fair('Managers from one firm resent sharing decisions', 'Likely at first, which is why pairing and clear decision rules are part of the plan.'),
            weak('The email merger slips a week', 'A short delay to a technical task does not touch the differences between the two workforces.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            best('Exit interviews showing staff leave for pay, not for the way they are managed', 'The recommendation assumes the clash drives the leavers; if pay did, a pay review would come first.'),
            fair('Customers saying they want a single brand quickly', 'It would add urgency to integration, but not change how to bring the workforces together.'),
            weak('A preferred name emerging from the brand tests', 'A name does not change how the two workforces work.'),
          ],
        },
      },
      model: {
        problem: `The merged company must manage a culture clash so that it keeps ${nameB}’s engineers and customers and gets the merger’s benefits.`,
        evidence: 'They show how the two workforces differ, the rising leavers and the merger’s aims. The names and the email merger are distractors.',
        tool: 'Hofstede’s cultural dimensions, which explain why the two workforces expect different things.',
        analysis: 'The differences map to power distance, individualism against collectivism and uncertainty avoidance, and explain the confused meetings and the leavers; they are tendencies to test, not certainties.',
        recommendation: 'Build joint ways of working: clear decision rules, team rewards for joint projects and paired managers.',
        evaluation: `${nameB}’s engineers and customers are most at risk; more may leave while the change takes hold; exit interviews pointing to pay would change the answer.`,
      },
    };
  },
};

/* ------------------------------------------------------------------ */

const DISPUTE = [
  { noun: 'Buses', industry: 'Transport', what: 'a bus company', workers: 'drivers' },
  { noun: 'Facilities', industry: 'Services', what: 'a contract cleaning company that serves hospitals', workers: 'cleaners' },
  { noun: 'Components', industry: 'Manufacturing', what: 'a maker of car parts', workers: 'production staff' },
  { noun: 'Port Services', industry: 'Logistics', what: 'a port operator', workers: 'dock workers' },
];

const payDispute: Family = {
  id: 'pay-dispute',
  unit: 2,
  subtopics: ['2.7'],
  tool: 'decision-trees',
  level: 'HL',
  title: 'Settle now, or go to arbitration?',
  summary: 'A pay dispute can be settled now at a known cost, or sent to arbitration, whose award is uncertain.',
  industries: ['Transport', 'Services', 'Manufacturing', 'Logistics'],
  quantitative: true,
  make(r) {
    const k = r.pick(DISPUTE);
    const p = place(r);
    const name = businessName(r, k.noun);
    const size = sized(r, 250, 900);
    const bill = r.step(6, 18, 1) * 1_000_000 * p.k;
    const settle = r.pick([4, 4.5, 5]);
    const hi = r.pick([6, 6.5, 7]);
    const lo = r.pick([2.5, 3, 3.5]);
    const prob = r.pick([0.3, 0.4, 0.5, 0.6]);
    const fee = r.step(40, 90, 10) * 1000 * p.k;
    const cSettle = tidy((bill * settle) / 100);
    const cHi = tidy((bill * hi) / 100);
    const cLo = tidy((bill * lo) / 100);
    const evArb = tidy(prob * cHi + (1 - prob) * cLo + fee);
    const close = Math.abs(evArb - cSettle) < 0.05 * cSettle;
    const winner: 'settle' | 'arbitrate' = close || cSettle <= evArb ? 'settle' : 'arbitrate';
    const pStar = tidy((cSettle - fee - cLo) / (cHi - cLo));
    const crosses = pStar > 0 && pStar < 1;
    const crossLine = crosses ? `The two have the same expected cost when the chance of a high award is about ${roundTo(pStar, 2).toFixed(2)}.` : pStar >= 1 ? 'On these figures arbitration has the lower expected cost at any chance of a high award.' : 'On these figures settling costs less at any chance of a high award.';
    const m = (v: number) => money(v, p);
    return {
      title: `${name}: settle now, or go to arbitration?`,
      business: name,
      industry: k.industry,
      place: `${p.city}, ${p.country}`,
      size: `${an(size.words)} with ${size.staff} staff`,
      role: `You advise the human resources director of ${name}.`,
      brief: [
        `The ${k.workers} at ${name}, ${k.what} in ${p.city}, ${p.country}, want a pay rise of ${pct(hi + 1, 1)}. After weeks of collective bargaining, the union will accept ${pct(settle, 1)} now. The alternative is to refer the dispute to an independent arbitrator, whose award both sides agree to accept.`,
        `The arbitrator could award a high rise or a low one, and arbitration has a fee. The director wants to know which route costs less, and what else is at stake.`,
      ],
      question: `Should ${name} settle the pay dispute now or go to arbitration?`,
      problem: {
        prompt: 'What is the problem the director must solve?',
        choices: [
          best('Choosing between a known settlement and an uncertain arbitration award, weighing cost against the risk and the relationship with staff', 'Two routes out of the dispute, one certain and one uncertain: that is the decision, and an expected value helps compare them.'),
          fair('The union wants more than the company has offered', 'That is the dispute itself; the decision is how to resolve it.'),
          weak('Threatening redundancies to end the dispute', 'An approach employers can take in a dispute, but it is not the problem, and it would damage trust far beyond this pay round.'),
          weak('Booking a venue for the staff awards', 'A distractor in the pack: the awards evening has nothing to do with the dispute.'),
        ],
      },
      evidence: {
        prompt: 'Which exhibits are evidence for the decision? Choose all that apply.',
        exhibits: [
          table('The pay bill and the offers', true, 'The pay bill and the percentages give the cost of each outcome.', ['Item', 'Figure'], [['Annual pay bill for the staff in dispute', m(bill)], ['Union’s claim', pct(hi + 1, 1)], ['Settlement the union will accept now', pct(settle, 1)]], 'Simulated data.'),
          text('Legal adviser’s note on arbitration', true, 'It gives the possible awards, their probabilities and the fee: the rest of the tree.', `Based on recent awards in the sector, I estimate a ${Math.round(prob * 100)}% chance of an award of ${pct(hi, 1)} and a ${Math.round((1 - prob) * 100)}% chance of ${pct(lo, 1)}. The arbitration fee and costs will be about ${m(fee)}. (Simulated estimate.)`),
          text('Union ballot result', true, 'It shows how strong feeling is, and the risk of industrial action if trust breaks down.', `In a ballot of members, ${r.int(68, 84)}% voted for industrial action if no agreement is reached. Members have agreed to suspend it while the talks continue. (Simulated.)`),
          text('Events team: the staff awards', false, 'The venue for an awards evening has nothing to do with the dispute.', 'The awards evening will be at the riverside hotel again; tickets go out next month.'),
          text('Facilities: new lockers', false, 'Lockers are routine facilities work, not part of the pay dispute.', 'New lockers will be fitted in the staff room during the spring.'),
        ],
      },
      tools: [
        { tool: 'decision-trees', verdict: 'best', why: 'One route has a certain cost and the other an uncertain one with known probabilities: a decision tree gives arbitration’s expected cost to set against the settlement.' },
        { tool: 'force-field-analysis', verdict: 'fair', why: notThisTool('force-field-analysis', 'It could map the pressures in the dispute, but it would not compare the cost of the two routes.') },
        { tool: 'hofstedes-cultural-dimensions', verdict: 'weak', why: notThisTool('hofstedes-cultural-dimensions', 'Nothing here turns on national culture; the dispute is about pay.') },
        { tool: 'swot-analysis', verdict: 'weak', why: notThisTool('swot-analysis', 'It would not put a cost on either route out of the dispute.') },
      ],
      analysis: {
        steps: [
          'Work out the cost of each possible outcome: the settlement, a high award and a low award.',
          'Find the expected cost of arbitration: weight each award by its probability, add them, and add the fee.',
          'Compare it with the settlement, then weigh what the tree leaves out: certainty, time and the relationship with staff.',
        ],
        calc: {
          prompt: 'Calculate the expected cost of going to arbitration, including the fee.',
          answer: evArb,
          dp: 0,
          tolerance: Math.max(1, 0.0005 * evArb),
          prefix: p.cur + (/[A-Za-z]$/.test(p.cur) ? ' ' : ''),
          suffix: '',
          working: [
            `High award: ${pct(hi, 1)} of ${m(bill)} = ${m(cHi)}; low award: ${pct(lo, 1)} of ${m(bill)} = ${m(cLo)}`,
            `Expected cost = (${prob} × ${m(cHi)}) + (${tidy(1 - prob)} × ${m(cLo)}) + ${m(fee)}`,
            `= ${m(tidy(prob * cHi))} + ${m(tidy((1 - prob) * cLo))} + ${m(fee)} = ${m(evArb)}`,
            `Settling now costs ${pct(settle, 1)} of ${m(bill)} = ${m(cSettle)}`,
          ],
          slips: [
            { value: tidy(prob * cHi + (1 - prob) * cLo), why: 'Add the arbitration fee: it is paid whichever award is made.' },
            { value: tidy(prob * cHi + prob * cLo + fee), why: 'Each award takes its own probability: the low award’s chance is 1 minus the high award’s.' },
            { value: tidy((cHi + cLo) / 2 + fee), why: 'A simple average treats the awards as equally likely; weight each by its probability.' },
          ].filter((s, i, all) => Math.abs(s.value - evArb) > Math.max(1, 0.0005 * evArb) && all.findIndex((x) => x.value === s.value) === i),
          meaning: `Settling costs ${m(cSettle)}, so arbitration is ${evArb > cSettle ? `expected to cost ${m(evArb - cSettle)} more` : `expected to save ${m(cSettle - evArb)}`}.`,
        },
        model: [
          `Settlement: ${m(cSettle)} for certain. Arbitration: ${m(cHi)} or ${m(cLo)}, plus ${m(fee)}, an expected cost of ${m(evArb)}.`,
          crossLine,
          `Arbitration’s worst case, ${m(cHi + fee)}, is well above the settlement, and the dispute lasts longer while it is heard.`,
          'Settling also protects the relationship with staff, which the expected values do not measure.',
        ],
      },
      recommend: {
        prompt: 'Which route would you recommend?',
        choices: [
          (winner === 'settle' ? best : fair)(`Settle now at ${pct(settle, 1)}`, winner === 'settle' ? (close ? `The expected costs are close (${m(cSettle)} against ${m(evArb)}), so certainty and the relationship with staff decide it: settle.` : `It costs ${m(cSettle)}, less than arbitration’s expected ${m(evArb)}, with no risk of the high award and no delay.`) : `Certain and quick, but it costs ${m(cSettle)}, clearly more than arbitration’s expected ${m(evArb)}.`),
          (winner === 'arbitrate' ? best : fair)('Refer the dispute to arbitration', winner === 'arbitrate' ? `Its expected cost (${m(evArb)}) is clearly below the settlement (${m(cSettle)}), and both sides have agreed to accept the award, so the dispute will end either way.` : `Its expected cost (${m(evArb)}) is ${close ? 'close to' : 'above'} the settlement (${m(cSettle)}), and it carries the risk of the high award and a longer dispute.`),
          weak('Impose a lower rise and prepare for a strike', 'With most members voting for action, this risks lost output and lasting damage to trust, costs the tree does not even include.'),
          weak('Threaten redundancies unless the union backs down', 'It might end the dispute, but it would destroy trust and could provoke the strike the company wants to avoid.'),
        ],
        justify: 'Justify your choice in two or three sentences, using the expected cost and one thing it leaves out.',
        criteria: ['Compares the settlement with arbitration’s expected cost, with figures', 'Weighs what the tree leaves out: certainty, time or the relationship with staff', 'States the probability or the figure that would change the decision'],
      },
      evaluate: {
        stakeholders: {
          prompt: `Which stakeholder gains most from a quick end to the dispute?`,
          choices: [
            best(`The ${k.workers}, who get a rise now and an end to the uncertainty`, 'They gain the rise and the end of the threat of action; a long dispute costs them too.'),
            fair(`${name}’s customers`, 'They gain a reliable service, since the threat of industrial action lifts.'),
            weak('The events team', 'A distractor with no stake in the dispute.'),
          ],
        },
        risk: {
          prompt: 'What is the main risk the decision tree does not show?',
          choices: [
            best('The damage to trust if the dispute drags on, which can cost more than either pay rise', 'Morale, goodwill and the risk of industrial action are real costs that the tree leaves out.'),
            fair('The legal adviser’s probabilities may be wrong', `True, and the ranking depends on them. ${crossLine}`),
            weak('The lockers are fitted late', 'Facilities work running late has no bearing on the cost or the outcome of the dispute.'),
          ],
        },
        change: {
          prompt: 'Which finding would most change your recommendation?',
          choices: [
            crosses ? best('A new estimate putting the chance of a high award on the other side of the break-even probability', `The comparison of expected costs turns on that probability. ${crossLine}`) : best('A much higher or lower estimate of the possible awards', `${crossLine} Only different awards would change the ranking.`),
            fair('The union lowering its settlement figure', 'It would make settling cheaper and strengthen the case for it.'),
            weak('A cheaper venue for the awards evening', 'The price of a venue cannot change which route out of the dispute costs less.'),
          ],
        },
      },
      model: {
        problem: `${name} must choose between a known settlement and an uncertain arbitration award, weighing cost, risk and the relationship with staff.`,
        evidence: 'They give the pay bill and the offers, the possible awards with their probabilities and the fee, and the ballot. The awards evening and the lockers are distractors.',
        tool: 'A decision tree, comparing a certain cost with an uncertain one.',
        analysis: `Settlement ${m(cSettle)}; arbitration’s expected cost ${m(evArb)}. ${crossLine}`,
        recommendation: winner === 'settle' ? `Settle now at ${pct(settle, 1)}: ${close ? 'the expected costs are close, so certainty and trust decide it' : 'it is the cheaper route as well as the certain one'}.` : 'Refer the dispute to arbitration: its expected cost is clearly lower, and both sides will accept the award.',
        evaluation: 'The staff gain most from a quick end; the damage to trust is the cost the tree leaves out; a different chance of a high award would change the answer.',
      },
    };
  },
};

export const UNIT2: Family[] = [rewardSurvey, workforcePlan, changeResistance, cultureMerger, payDispute];
