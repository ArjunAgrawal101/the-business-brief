/**
 * The cases for the Paper 1 workspace.
 *
 * ILLUSTRATIVE_CASE: Juniper Juice is the invented business of the creator's
 * Paper 1 guide and the Paper 1 page; this fuller case keeps every fact those
 * pages give (three kiosks, $4 a bottle, a five-day shelf life, two chains with
 * 140 stores, taste tests with 120 shoppers, beetroot's 6.2) and adds the
 * rest. At about 550 words it is shorter than a full Paper 1 case, so it can be
 * tagged in one sitting.
 *
 * P1_CASES: practice cases in the format the guide describes for Paper 1
 * (p. 41): a pre-released statement, three months before the examination,
 * with a few context topics to research and about the first 200 words of the
 * case; then, on the day, the full case of about 800 to 1,000 words, unseen,
 * and the questions. Each has a full paper in the guide's structure (Section A,
 * structured questions for 20 marks on AO1, AO2 and AO4; Section B, one of two
 * extended responses for 10 marks), on SL/HL content only, since Paper 1
 * excludes the HL extension material (p. 43). The guidance with each question
 * is the platform's own, written for that question: it paraphrases what a
 * strong answer does and is never an IB markscheme or the IB's markbands.
 * Every organization, person, place and figure in these cases is invented
 * (the countries are real); none is a real company. tests/unit/p1-cases.test.ts
 * checks the lengths, the marks, the command terms and the syllabus.
 */
export const ILLUSTRATIVE_CASE = {
  title: 'Juniper Juice: the supermarket offer',
  note: 'An illustrative case written for this workspace. Juniper Juice is invented, and every name and figure in it is simulated.',
  text: `Juniper Juice was founded in 2021 by two friends, Ana Ferreira and Tom Okafor, who had worked together in a hotel kitchen. The business presses fruit and vegetables into cold-pressed juice in a small rented unit and sells it from three kiosks in the city's busiest train stations. Each bottle sells for $4. Because the juice is not heat-treated, it lasts five days from pressing, so the kiosks take fresh stock every morning.

Juniper is a private limited company. Ana and Tom own 80% of the shares between them; the other 20% belongs to Ana's aunt, who lent the business the money for its first press and expects a dividend each year. Last year the kiosks sold about 2,500 bottles a week, and revenue was $520,000.

In March, two supermarket chains, Fresca Markets and Dalton's, offered to stock Juniper's juices in their 140 stores. Between them they would take 8,000 bottles a week and pay $2.40 a bottle. Both chains insist on sale-or-return terms: any bottle not sold by its use-by date comes back, and Juniper is not paid for it. A buyer from Fresca wrote: "Your brand is exactly what our customers are asking for, but we would need you to deliver to every store three times a week."

Juniper's two small presses can make about 2,700 bottles a week at most. To supply the chains, Ana wants to buy a pressing machine costing $96,000 that could press 12,000 bottles a week. She has told the bank that the machine "would pay for itself within a year". The bank has offered a loan of $60,000 at 8% a year; the rest would come from the business's cash, which stood at $38,000 at the end of last month.

Variable costs, mainly fruit, bottles and labels, are about $1.30 a bottle. Supplying the chains would also add delivery costs, which Tom estimates at $2,500 a week, and the wages of two more production staff.

Tom is less sure about the offer. He believes customers pay $4 because the juice is local, fresh and sold by people who know it. "In a supermarket fridge we are one bottle among fifty," he told a staff meeting. He also worries about the 14 kiosk staff, most of them students working part-time: the kiosk supervisor resigned last month, saying she had been asked to work too many early shifts.

To prepare for a launch, Juniper ran taste tests of three new flavours with 120 shoppers in two of Fresca's city stores. Ginger and apple scored 7.8 out of 10 on average. Beetroot scored 6.2: shoppers over 50 rated it highly, but the 18 to 30 year olds who buy most of Juniper's juice did not. The chains want to launch with four flavours, including one of the new ones.

Competition is growing. A national drinks company has launched a cheaper juice, heat-treated so that it lasts four weeks, at $2.75 a bottle in both chains. The landlord of Juniper's busiest kiosk has also told Ana that the rent will rise by 15% next year.

Ana and Tom must reply to the chains by the end of the month. Ana sees the offer as the only way to grow quickly. Tom would rather open a fourth kiosk, which would cost about $40,000 and could sell around 800 bottles a week.`,
} as const;

/* ------------------------------------------------------------------ */
/* Practice cases                                                      */
/* ------------------------------------------------------------------ */

export interface P1Context {
  topic: string;
  /** What to research, and why it matters to this case. */
  prompt: string;
}

export type P1Scheme =
  | {
      kind: 'points';
      /** How the marks divide, in the platform's words. */
      note: string;
      points: Array<{ marks: number; text: string }>;
      /** For a calculation, the worked answer. */
      answer?: string;
    }
  | {
      kind: 'levels';
      note: string;
      /** What an answer could draw on: arguments, evidence and the limits of the case. Not a list to reproduce. */
      indicative: string[];
      /** Levels written for this question by the platform. They are not the IB's markbands. */
      levels: Array<{ marks: string; text: string }>;
    };

export interface P1Question {
  id: string;
  /** As printed on the paper: "1 (a)". */
  number: string;
  section: 'A' | 'B';
  /** A command term id from the register. */
  command: string;
  marks: number;
  prompt: string;
  /** The syllabus subtopics the question draws on: SL/HL content only. */
  codes: string[];
  /** The paragraphs of the full case where the evidence is, counting from 1. */
  look: number[];
  /** How to set the answer out: the parts of a strong answer, in order. */
  plan: Array<{ id: string; title: string; prompt: string }>;
  scheme: P1Scheme;
  /** Where marks are lost on this question. */
  errors: string[];
}

export interface P1Stakeholder {
  name: string;
  interest: string;
  power: 'High' | 'Low';
  stance: 'For' | 'Against' | 'Mixed';
  /** The paragraph that shows it, counting from 1. */
  para: number;
}

export interface P1Tool {
  id: string;
  name: string;
  level: 'SL/HL' | 'HL';
  /** strong: it answers a question the case asks; possible: with care; weak: it would restate the case or invent figures. */
  fit: 'strong' | 'possible' | 'weak';
  why: string;
  /** The toolkit guide or the page that teaches it. */
  href: string;
}

export interface P1Case {
  id: string;
  title: string;
  organization: string;
  industry: string;
  country: string;
  /** Every case here is invented. */
  fictional: true;
  summary: string;
  context: P1Context[];
  /** The released opening: the first paragraphs of the full case, about 200 words. */
  opening: string;
  /** The rest of the case, seen for the first time in the examination. */
  rest: string;
  questions: P1Question[];
  stakeholders: P1Stakeholder[];
  tools: P1Tool[];
}

/** The plan parts for each kind of question: how a strong answer is built. The platform's recommended construction, not an IB template. */
const DEFINE = [
  { id: 'd1', title: 'First element', prompt: 'The first precise element of the meaning, in your own words.' },
  { id: 'd2', title: 'Second element', prompt: 'The second element that completes it. An example is not a definition.' },
];
const two = (each: string) => [
  { id: 'p1', title: 'First point', prompt: each },
  { id: 'p2', title: 'Second point', prompt: `A distinct second point, with its own evidence. ${each}` },
];
const CALC = [
  { id: 'f', title: 'Formula', prompt: 'Write the formula before any figures.' },
  { id: 's', title: 'Substitution', prompt: 'The figures from the case, with their units.' },
  { id: 'a', title: 'Answer', prompt: 'The answer with its unit, rounded once, at the end.' },
];
const EXTENDED = [
  { id: 'frame', title: 'Frame the decision', prompt: 'The organization, the decision it faces, and what it is trying to achieve.' },
  { id: 'for', title: 'Argument', prompt: 'Developed: business knowledge, a case fact, and the consequence for this organization.' },
  { id: 'against', title: 'Counter-argument', prompt: 'Developed the same way, with its own evidence.' },
  { id: 'weigh', title: 'Weighing', prompt: 'Which matters more here, and why: size, likelihood, timing, stakeholders.' },
  { id: 'limit', title: 'A limitation of the case', prompt: 'What the case does not tell you, and how that weakens the judgement.' },
  { id: 'judge', title: 'Judgement', prompt: 'A decision, and the condition it depends on.' },
];

export const P1_CASES: P1Case[] = [
  {
    id: 'volta-ridge',
    title: 'Volta Ridge Chocolate: the private-label contract',
    organization: 'Volta Ridge Chocolate Ltd',
    industry: 'Food manufacturing',
    country: 'Ghana',
    fictional: true,
    summary: 'A bean-to-bar chocolate maker is offered a five-year contract to make chocolate under a multinational’s brand.',
    context: [
      { topic: 'Traceability in agricultural supply chains', prompt: 'How do food businesses prove where a raw material came from and how it was grown? What does it cost a small supplier to keep the records, and who pays?' },
      { topic: 'Private-label and contract manufacturing', prompt: 'Why do brand owners pay other firms to make their products, and what does the maker gain and give up when its own name is not on the pack?' },
      { topic: 'Climate change and the supply of crops', prompt: 'How can changing weather affect the price, quality and reliability of a crop such as cocoa, and how might a manufacturer reduce the risk?' },
    ],
    opening: `Volta Ridge Chocolate Ltd (VRC) makes bean-to-bar chocolate in the Volta Region of Ghana. It was founded in 2017 by Efua Mensah, a food scientist, and her brother Kojo Mensah, an accountant, who wanted more of Ghana's cocoa to be turned into finished products at home instead of being exported as raw beans.

VRC buys its beans directly from 140 farming families who belong to the Tsala Hills Growers' Cooperative. It ferments, dries, roasts and grinds the beans in its own factory, on the edge of a market town, then moulds and wraps the bars. Its 52 employees work two shifts a day and make about 410,000 bars a year in four flavours: dark, milk, ginger and a seasonal bar made with local fruit. Efua leads product development and quality; Kojo runs finance and sales.

VRC is a private limited company. Efua and Kojo own 70% of the shares, and the rest belong to friends and relatives who invested in 2017. Most bars are sold under the Volta Ridge brand in hotels, airport shops and supermarkets in Accra, and a growing number are sold online to customers in Europe. The company's slogan, "Chocolate made where the cocoa grows", is printed on every wrapper.`,
    rest: `In 2025, VRC's sales revenue was GH₵15.6 million and its cost of sales was GH₵9.4 million. Online sales to Europe earned GH₵2.1 million, up from GH₵1.4 million in 2024, but sending chocolate through hot weather is expensive: every parcel needs insulated packaging and cooling packs, and about one parcel in twenty arrives damaged.

Over the past year, changes in the exchange rate have raised the value in cedis of VRC's sales in euros, but the packaging it imports has become more expensive. VRC pays the cooperative within a week of each delivery of beans, while hotels and supermarkets take up to 45 days to pay VRC.

In March 2026, Norrvik Confectionery Group, a European multinational that sells chocolate in more than 30 countries, offered VRC a five-year contract. VRC would make 600,000 bars a year of single-origin Ghanaian chocolate to Norrvik's recipe, wrapped under Norrvik's brand, at a fixed price of GH₵18 a bar. Norrvik would pay 60 days after each delivery, send two engineers to advise on quality, and insist that every bean can be traced back to the farm.

VRC's factory is close to its limit. To accept the contract, it would need a second production line costing GH₵4.5 million, which would take five months to install and test. Norrvik has offered to lend half of this at a low rate of interest, on condition that VRC sells only to Norrvik in Europe for the length of the contract. The rest could come from a bank loan at 21% a year, or from selling a 25% stake in VRC to Riverbend Impact Partners, an investment fund that backs businesses with social aims.

Kojo is keen. "Six hundred thousand bars a year is more than we sell today," he told the board. "The contract would spread our costs over far more bars and give us income we can count on." Efua is less sure. She points out that Norrvik's customers will never see the Volta Ridge name, and that a single buyer taking more than half of the factory's output could later demand lower prices.

The farmers have concerns of their own. VRC pays the cooperative 15% more than local buyers do, but the cooperative's chair, Abla Kudjoe, says that two unusually dry seasons have cut yields and that families need a higher price to keep their children in school rather than working on the farms. Norrvik's contract would require proof that no child labour is used. VRC believes it can provide this, but the farmers would need help to keep the records.

Inside the factory, the mood is mixed. Production workers are paid a daily wage, and wrapping staff are paid for each bar they wrap. Efua makes most decisions about production herself and checks every new batch, which managers say keeps quality high but slows everything down. Since January, three of the eight supervisors have left for a fruit-juice factory nearby that offers permanent contracts and health insurance. A staff survey found that workers value their training and the company's purpose, but feel they are rarely asked for their views.

VRC's marketing team surveyed 300 online customers in 2025. Of these, 62% said the "made in Ghana" story was the main reason they bought, and 44% said they would pay more for bars that named the farming family who grew the beans. In Accra, however, imported mass-market chocolate sells for about half VRC's price, and supermarket buyers have asked for bigger discounts.

VRC's competitors at home are few: two other small chocolate makers in Ghana sell mainly to tourists, and neither exports. Efua believes that VRC's lead in quality would last only a few years if it stopped developing its own brand.

The board must reply to Norrvik by the end of June. Kojo believes the contract is the safest route to growth. Efua would rather build the Volta Ridge brand in Europe, with Riverbend's investment and a new range of bars that name the farming families, even if growth is slower.`,
    questions: [
      {
        id: 'q1a',
        number: '1 (a)',
        section: 'A',
        command: 'define',
        marks: 2,
        prompt: 'Define the term *private limited company*.',
        codes: ['1.2'],
        look: [3],
        plan: DEFINE,
        scheme: {
          kind: 'points',
          note: 'One mark for each of the two elements. A definition that only describes VRC earns at most one.',
          points: [
            { marks: 1, text: 'A business owned by shareholders, with the owners having limited liability for its debts.' },
            { marks: 1, text: 'Its shares cannot be offered for sale to the general public: they are held privately, often by family and friends.' },
          ],
        },
        errors: ['Defining a public limited company, or limited liability alone.', 'Writing about VRC instead of defining the term.'],
      },
      {
        id: 'q1b',
        number: '1 (b)',
        section: 'A',
        command: 'calculate',
        marks: 2,
        prompt: "Calculate VRC's gross profit margin for 2025 (show all your working).",
        codes: ['3.5'],
        look: [4],
        plan: CALC,
        scheme: {
          kind: 'points',
          note: 'One mark for a correct method with the case figures, one for the answer with its unit.',
          points: [
            { marks: 1, text: 'Gross profit = 15.6 − 9.4 = GH₵6.2 million, divided by sales revenue of GH₵15.6 million, multiplied by 100.' },
            { marks: 1, text: 'Gross profit margin = 39.74% (accept 39.7%).' },
          ],
          answer: '(15.6 − 9.4) ÷ 15.6 × 100 = 6.2 ÷ 15.6 × 100 = 39.74%',
        },
        errors: ['Dividing by the cost of sales.', 'Giving the answer without the % sign.', 'Writing only the final figure, with no working.'],
      },
      {
        id: 'q2a',
        number: '2 (a)',
        section: 'A',
        command: 'state',
        marks: 2,
        prompt: 'State **two** external stakeholders of VRC.',
        codes: ['1.4'],
        look: [2, 6, 7, 11],
        plan: [
          { id: 'p1', title: 'First stakeholder', prompt: 'One external stakeholder named in the case.' },
          { id: 'p2', title: 'Second stakeholder', prompt: 'A second, different external stakeholder.' },
        ],
        scheme: {
          kind: 'points',
          note: 'One mark for each external stakeholder of VRC, up to two. A line each is enough.',
          points: [
            { marks: 1, text: 'One of: the Tsala Hills Growers’ Cooperative (or its farming families), Norrvik Confectionery Group, Riverbend Impact Partners, the bank, supermarket buyers, online customers.' },
            { marks: 1, text: 'A second, different one from the same list. Employees, Efua, Kojo and the other shareholders are internal and earn nothing here.' },
          ],
        },
        errors: ['Naming employees or shareholders, who are internal stakeholders.', 'Explaining at length: state asks for a name, not a paragraph.'],
      },
      {
        id: 'q2b',
        number: '2 (b)',
        section: 'A',
        command: 'explain',
        marks: 6,
        prompt: 'Explain **two** advantages to VRC of accepting Norrvik’s contract.',
        codes: ['1.5'],
        look: [6, 7, 8],
        plan: two('Identify the advantage, explain it with business knowledge, then apply it: a case fact and its effect on VRC.'),
        scheme: {
          kind: 'points',
          note: 'For each advantage: identify it (1), explain it with business knowledge (1), and apply it to VRC with evidence from the case (1). Two advantages that overlap earn the second set of marks only for the new point.',
          points: [
            { marks: 3, text: 'A first advantage, identified, explained and applied. For example, economies of scale: 600,000 more bars a year spread the factory’s fixed costs, so VRC’s average cost per bar could fall; Kojo says the contract would spread costs over far more bars.' },
            { marks: 3, text: 'A second, distinct advantage. For example, secure revenue: a fixed price of GH₵18 a bar for five years gives VRC income it can plan around, which could support the loan repayments; or learning: Norrvik’s engineers could raise VRC’s quality for its own brand too.' },
          ],
        },
        errors: ['Two points that are really one, such as "more sales" and "more revenue".', 'Advantages to Norrvik or the farmers instead of to VRC.', 'No figure or fact from the case in either point.'],
      },
      {
        id: 'q3a',
        number: '3 (a)',
        section: 'A',
        command: 'describe',
        marks: 4,
        prompt: 'Describe **two** external sources of finance VRC could use to pay for the second production line.',
        codes: ['3.2'],
        look: [7],
        plan: two('Name the source, then describe what it is and how it would work for VRC.'),
        scheme: {
          kind: 'points',
          note: 'For each source: one mark for a relevant external source, one for a description of it in the context of VRC.',
          points: [
            { marks: 2, text: 'A first source, described. For example, loan capital: a fixed sum borrowed from a bank and repaid with interest, here at 21% a year; or Norrvik’s loan at a low rate, with the condition that VRC sells only to Norrvik in Europe.' },
            { marks: 2, text: 'A second, different source. For example, share capital: selling a 25% stake to Riverbend Impact Partners, which brings money that need not be repaid but reduces the founders’ ownership and control.' },
          ],
        },
        errors: ['Retained profit, which is an internal source.', 'Two kinds of loan described the same way, with no difference between them.'],
      },
      {
        id: 'q3b',
        number: '3 (b)',
        section: 'A',
        command: 'suggest',
        marks: 4,
        prompt: 'Suggest **two** ways VRC could improve the motivation of its production workers.',
        codes: ['2.4'],
        look: [10],
        plan: two('Propose a way, then say how it would work at VRC, using what the staff survey says workers value.'),
        scheme: {
          kind: 'points',
          note: 'For each way: one mark for a relevant financial or non-financial reward, one for linking it to VRC’s workers.',
          points: [
            { marks: 2, text: 'A first way, linked to the case. For example, permanent contracts and health insurance, the very things the supervisors left for, which would meet workers’ need for security.' },
            { marks: 2, text: 'A second way. For example, empowerment or teamwork: workers feel they are rarely asked for their views, so regular team meetings on production could make them feel valued; or more training, which the survey says they value.' },
          ],
        },
        errors: ['A list of rewards with no link to VRC’s workers.', 'Pay rises with no reason why they would work here.'],
      },
      {
        id: 'q4',
        number: '4',
        section: 'B',
        command: 'discuss',
        marks: 10,
        prompt: 'Discuss whether VRC should accept Norrvik’s contract.',
        codes: ['1.5', '1.6'],
        look: [4, 6, 7, 8, 9, 11, 12, 13],
        plan: EXTENDED,
        scheme: {
          kind: 'levels',
          note: 'Level descriptors written by the platform for this question. They are not the IB’s markbands, which are in the guide and are not reproduced here. Place the answer in the level that best describes it.',
          indicative: [
            'For: scale and lower average cost; five years of secure revenue at GH₵18 a bar; a low-interest loan for half of the GH₵4.5 million line; skills from Norrvik’s engineers; a route to traceability that could also strengthen VRC’s own brand.',
            'Against: VRC’s name is invisible on Norrvik’s bars, so the contract does not build its brand; a buyer of more than half the output gains bargaining power; selling only to Norrvik in Europe blocks the online growth (GH₵1.4 million to GH₵2.1 million); 60 days’ credit strains cash flow; the farmers would need help to keep records.',
            'Weighing: how far 600,000 bars depend on yields that dry seasons have cut; whether the fixed price covers rising bean costs over five years; what the 62% who buy for the Ghana story would make of private-label growth.',
            'Limitations of the case: no cost per bar, so the contract’s profit cannot be worked out; no detail of what happens if VRC cannot supply 600,000 bars; the survey is of online customers only.',
          ],
          levels: [
            { marks: '0', text: 'Nothing relevant to the contract.' },
            { marks: '1-2', text: 'Some knowledge of growth or contracts, with little use of VRC’s situation.' },
            { marks: '3-4', text: 'Points for or against, applied in places, mostly one-sided or listed rather than argued.' },
            { marks: '5-6', text: 'Arguments on both sides using case evidence, such as the fixed price and the exclusivity condition, but not weighed against each other.' },
            { marks: '7-8', text: 'Balanced, developed arguments that use the evidence, with some weighing and a conclusion that follows from them.' },
            { marks: '9-10', text: 'As 7 to 8, with a judgement that weighs the arguments against VRC’s aims and states the condition it depends on, and explains how a limitation of the case, such as the missing cost per bar, affects that judgement.' },
          ],
        },
        errors: ['A verdict in the first line, then only the arguments that support it.', 'Ignoring the exclusivity condition, which is the price of the cheap loan.', 'A conclusion that repeats the arguments instead of weighing them.'],
      },
      {
        id: 'q5',
        number: '5',
        section: 'B',
        command: 'examine',
        marks: 10,
        prompt: 'Examine whether VRC should raise the price it pays the Tsala Hills Growers’ Cooperative for its beans.',
        codes: ['1.3'],
        look: [2, 9, 11, 12],
        plan: EXTENDED,
        scheme: {
          kind: 'levels',
          note: 'Level descriptors written by the platform for this question. They are not the IB’s markbands. Place the answer in the level that best describes it.',
          indicative: [
            'For: corporate social responsibility and VRC’s purpose; children kept in school rather than working, which Norrvik’s contract will check; a secure supply of beans after two dry seasons; a stronger story for the 44% who would pay more for bars that name the farming family.',
            'Against: higher costs at a time when supermarket buyers want discounts and imported chocolate sells at half VRC’s price; a fixed contract price of GH₵18 a bar would not rise with bean costs; VRC already pays 15% above local buyers.',
            'Stakeholder conflict: farmers and VRC’s mission against shareholders’ profit and Kojo’s case for growth; how Riverbend, an investor with social aims, would see it.',
            'Limitations of the case: no figure for the cost of beans in a bar, so the effect on profit cannot be measured; the 44% is from online customers, not Accra shoppers.',
          ],
          levels: [
            { marks: '0', text: 'Nothing relevant to the price paid to the farmers.' },
            { marks: '1-2', text: 'Some knowledge of CSR or stakeholders, with little reference to VRC.' },
            { marks: '3-4', text: 'Points about the farmers or VRC’s costs, applied in places, mostly one-sided.' },
            { marks: '5-6', text: 'Arguments for and against, using case evidence, but listed rather than weighed.' },
            { marks: '7-8', text: 'Balanced arguments that weigh the ethical case against the cost, with a conclusion that follows.' },
            { marks: '9-10', text: 'As 7 to 8, with a judgement that considers the conflict between stakeholders, states what it depends on, and explains how a gap in the case, such as the missing bean cost, limits it.' },
          ],
        },
        errors: ['Treating ethics and profit as if one simply wins.', 'Forgetting that VRC already pays 15% more than local buyers.'],
      },
    ],
    stakeholders: [
      { name: 'Efua Mensah (founder, shareholder)', interest: 'Building the Volta Ridge brand and keeping its purpose', power: 'High', stance: 'Against', para: 8 },
      { name: 'Kojo Mensah (founder, shareholder)', interest: 'Secure growth and income the business can count on', power: 'High', stance: 'For', para: 8 },
      { name: 'Tsala Hills Growers’ Cooperative', interest: 'A higher price for beans, and help with the records the contract needs', power: 'Low', stance: 'Mixed', para: 9 },
      { name: 'Norrvik Confectionery Group', interest: 'A reliable, traceable supply at a fixed price', power: 'High', stance: 'For', para: 6 },
      { name: 'Production workers and supervisors', interest: 'Secure contracts, training and a voice', power: 'Low', stance: 'Mixed', para: 10 },
      { name: 'Riverbend Impact Partners', interest: 'A return from a business with social aims', power: 'Low', stance: 'Mixed', para: 7 },
      { name: 'Online customers in Europe', interest: 'Chocolate with a true Ghana story, delivered undamaged', power: 'Low', stance: 'Against', para: 11 },
    ],
    tools: [
      { id: 'swot-analysis', name: 'SWOT analysis', level: 'SL/HL', fit: 'possible', why: 'Useful to organize your own notes before the paper; on its own in an answer it restates the case, so use it to find the argument, not as the argument.', href: '/toolkit/swot-analysis/' },
      { id: 'steeple-analysis', name: 'STEEPLE analysis', level: 'SL/HL', fit: 'strong', why: 'The case is full of external factors: dry seasons (environmental), child labour and traceability (ethical, legal), the exchange rate on euro sales (economic).', href: '/toolkit/steeple-analysis/' },
      { id: 'ansoff-matrix', name: 'Ansoff matrix', level: 'SL/HL', fit: 'strong', why: 'Efua’s plan is market development (the brand in Europe) with product development (bars that name the families); the contract is a different kind of growth. It frames the choice of direction.', href: '/toolkit/ansoff-matrix/' },
      { id: 'decision-trees', name: 'Decision tree', level: 'SL/HL', fit: 'weak', why: 'The case gives no probabilities or payoffs: drawing a tree would mean inventing figures.', href: '/toolkit/decision-trees/' },
      { id: 'break-even', name: 'Break-even analysis', level: 'SL/HL', fit: 'possible', why: 'Relevant to the second line, but the case gives no fixed costs or cost per bar, so a calculation would need assumptions you must state.', href: '/topics/break-even-analysis/' },
      { id: 'ratios', name: 'Ratio analysis', level: 'SL/HL', fit: 'possible', why: 'The gross profit margin can be worked from the case; there is no statement of financial position for liquidity ratios.', href: '/topics/profitability-and-liquidity-ratio-analysis/' },
      { id: 'force-field-analysis', name: 'Force field analysis', level: 'HL', fit: 'weak', why: 'An HL-only tool: Paper 1 questions are not set on HL extension content (guide, p. 43).', href: '/toolkit/force-field-analysis/' },
      { id: 'porters-generic-strategies', name: "Porter's generic strategies", level: 'HL', fit: 'weak', why: 'An HL-only tool: Paper 1 questions are not set on HL extension content (guide, p. 43).', href: '/toolkit/porters-generic-strategies/' },
    ],
  },
  {
    id: 'cairnside',
    title: 'Cairnside Climbing: a second centre',
    organization: 'Cairnside Climbing',
    industry: 'Leisure services',
    country: 'Canada',
    fictional: true,
    summary: 'A partnership running a busy indoor climbing centre is invited into a joint venture to open a second one.',
    context: [
      { topic: 'Subscription business models', prompt: 'Why do services from gyms to software charge a monthly fee, and what happens to a subscription business when customers start to leave or prices rise?' },
      { topic: 'Inclusion and access in leisure services', prompt: 'How can sports and leisure businesses serve people on low incomes, older adults or people with disabilities, and what does it cost them?' },
      { topic: 'The changing reach of social media marketing', prompt: 'How has the reach of unpaid posts on social media changed for small businesses, and what are the alternatives to paying for promoted posts?' },
    ],
    opening: `Cairnside Climbing is an indoor climbing centre in Tarrant Harbour, a port city in the Canadian province of Nova Scotia. It was opened in 2019 by three friends who met on the city's climbing walls: Priya Sandhu, a physiotherapist; Luc Arsenault, a builder; and Hana Brooks, who had managed a sports shop. They converted a disused fish warehouse into a bouldering hall with 200 climbing routes, a training area, a children's wall and a small café. The partners describe it as "a friendly place to climb, not a gym": staff learn members' names, and the routes are reset every week so that regulars always have something new to try.

Cairnside is a partnership. The three partners share the profits equally, and each has unlimited liability for the business's debts. Members pay CA$75 a month for unlimited climbing, and visitors can buy a day pass for CA$22. The centre is open from 7 am to 10 pm every day, and its after-school youth club is full most weeks. Cairnside employs 9 full-time staff and 18 part-time instructors and route setters, most of them students. Beginners' courses run on weekend mornings, and climbing shoes can be rented at the desk.`,
    rest: `Membership has grown from 600 in 2020 to 2,100 today, largely through short climbing videos that the partners post on social media. The centre is now crowded between 5 pm and 9 pm, when most members visit. In October, Hana asked members at the reception desk to fill in a survey, and 412 did: 71% said the centre was too busy in the evenings, and 58% said they would use a second centre if one opened nearer their home. One member in three is a student.

Last year Cairnside's revenue was CA$2.3 million, of which memberships brought in CA$1.8 million and day passes, courses, shoe rental and the café the rest. After paying themselves, the partners kept CA$140,000 of profit in the business.

Rising demand has brought problems. Neighbours have complained to the city council about parking and noise after 9 pm. Part-time instructors are paid by the hour and are often given shifts at short notice; two of them told Priya they would leave if the rotas did not improve. Last month the most experienced route setter left to join a national gym chain that is adding climbing walls to its gyms, at prices about 20% below Cairnside's. Luc, who manages the staff, prefers to make decisions quickly himself. Priya would like the instructors to help plan the shifts and the routes. Hana spends most of her time on marketing and leaves the staff to organize themselves.

In September, Maritime Mill Developments, a property company, invited Cairnside to open a second centre in a new building it is constructing in Fenwick, a growing town 25 kilometres away. Many of Fenwick's new residents are young families who moved out of Tarrant Harbour, and some of them already drive to Cairnside at weekends. Maritime Mill proposes a joint venture: it would provide the space and pay for most of the fit-out, and the two businesses would jointly own a new company to run the centre. Cairnside would receive 60% of the profits, but it would have to contribute CA$350,000 and manage the centre.

The partners do not have CA$350,000. The bank has offered a loan, but only if the partners give personal guarantees backed by their homes. Luc thinks they should first turn the partnership into a private limited company. Hana would rather wait a year and use retained profit. Priya is worried that managing two sites would leave nobody with enough time for the staff in Tarrant Harbour.

The partners have estimated the costs of the second centre. Its fixed costs would be CA$46,800 a month, and each member would contribute CA$60 a month after variable costs such as cleaning, chalk and wear on the climbing holds. Maritime Mill says that the building's other tenants, a medical centre and 140 flats, will bring plenty of customers. It took the Tarrant Harbour centre almost two years to reach 780 members.

The partners have also noticed changes in their market. More new members are older adults and families, who prefer quieter daytime sessions; on weekday mornings the centre rarely has more than 30 climbers. Social media has been Cairnside's main source of new members, but the cost of promoted posts has risen, and the partners' videos now reach fewer people than they did two years ago. A local school has asked whether Cairnside could offer free sessions for students from low-income families, an idea Priya strongly supports.

The city council has said that it will renew Cairnside's late-night licence only if the centre reduces noise and helps members find parking. Luc estimates that new doors and a shuttle bus from a nearby car park would cost CA$60,000.

The partners must answer Maritime Mill by January.`,
    questions: [
      {
        id: 'q1a',
        number: '1 (a)',
        section: 'A',
        command: 'define',
        marks: 2,
        prompt: 'Define the term *partnership*.',
        codes: ['1.2'],
        look: [2],
        plan: DEFINE,
        scheme: {
          kind: 'points',
          note: 'One mark for each of the two elements.',
          points: [
            { marks: 1, text: 'A business owned by two or more people (usually up to twenty), who share its profits.' },
            { marks: 1, text: 'In an ordinary partnership the owners have unlimited liability for its debts, and the business has no separate legal identity from them.' },
          ],
        },
        errors: ['Describing Cairnside instead of defining the term.', 'Leaving out liability, which is what distinguishes a partnership from a company.'],
      },
      {
        id: 'q1b',
        number: '1 (b)',
        section: 'A',
        command: 'outline',
        marks: 2,
        prompt: 'Outline **one** disadvantage to Cairnside’s partners of unlimited liability.',
        codes: ['1.2'],
        look: [2, 7],
        plan: [
          { id: 'p1', title: 'The disadvantage', prompt: 'Name it, then give a brief account of what it means for the partners, with a case fact.' },
        ],
        scheme: {
          kind: 'points',
          note: 'One mark for the disadvantage, one for a brief account of it for the partners.',
          points: [
            { marks: 1, text: 'The partners’ personal possessions are at risk if the business cannot pay its debts.' },
            { marks: 1, text: 'Applied: the bank wants personal guarantees backed by their homes for the CA$350,000, so a failed second centre could cost the partners their homes.' },
          ],
        },
        errors: ['A general disadvantage of partnerships, such as disagreements, that has nothing to do with liability.'],
      },
      {
        id: 'q2a',
        number: '2 (a)',
        section: 'A',
        command: 'calculate',
        marks: 2,
        prompt: 'Calculate the number of members the second centre would need each month to break even (show all your working).',
        codes: ['5.5'],
        look: [8],
        plan: CALC,
        scheme: {
          kind: 'points',
          note: 'One mark for the method with the case figures, one for the answer in members.',
          points: [
            { marks: 1, text: 'Break-even = fixed costs ÷ contribution per member = CA$46,800 ÷ CA$60.' },
            { marks: 1, text: '780 members a month.' },
          ],
          answer: '46,800 ÷ 60 = 780 members a month',
        },
        errors: ['Dividing by the CA$75 membership fee instead of the CA$60 contribution.', 'Giving the answer in dollars.'],
      },
      {
        id: 'q2b',
        number: '2 (b)',
        section: 'A',
        command: 'explain',
        marks: 6,
        prompt: 'Explain **two** limitations of the survey Hana carried out in October.',
        codes: ['4.4'],
        look: [3],
        plan: two('Identify the limitation, explain why it matters for market research, then apply it to Hana’s survey.'),
        scheme: {
          kind: 'points',
          note: 'For each limitation: identify (1), explain with knowledge of market research (1), apply to the survey (1).',
          points: [
            { marks: 3, text: 'A first limitation. For example, a convenience sample: only members who happened to be at reception answered, so non-members in Fenwick, the people a second centre needs, were never asked.' },
            { marks: 3, text: 'A second, distinct limitation. For example, stated intentions: 58% saying they would use a second centre does not mean they would pay for a second membership; or timing and bias: asked in the busy evening hours, members are more likely to say the centre is too busy.' },
          ],
        },
        errors: ['Two limitations that are really one, such as "small sample" and "not representative" with the same reason.', 'Limitations of surveys in general, with nothing from Hana’s.'],
      },
      {
        id: 'q3a',
        number: '3 (a)',
        section: 'A',
        command: 'list',
        marks: 2,
        prompt: 'List **two** non-financial rewards Cairnside could offer its part-time instructors.',
        codes: ['2.4'],
        look: [5],
        plan: [
          { id: 'p1', title: 'First reward', prompt: 'A non-financial reward, named.' },
          { id: 'p2', title: 'Second reward', prompt: 'A second, different one.' },
        ],
        scheme: {
          kind: 'points',
          note: 'One mark for each relevant non-financial reward, up to two. A word or phrase each is enough.',
          points: [
            { marks: 1, text: 'One of: empowerment (planning the routes and shifts), teamwork, job enrichment, job rotation, job enlargement, purpose.' },
            { marks: 1, text: 'A second, different one. Pay, bonuses or free membership with a stated cash value are financial and earn nothing here.' },
          ],
        },
        errors: ['Financial rewards, such as a higher hourly rate.', 'Explaining at length: list asks for the names only.'],
      },
      {
        id: 'q3b',
        number: '3 (b)',
        section: 'A',
        command: 'analyse',
        marks: 6,
        prompt: 'Analyse **two** effects on Cairnside’s staff of the partners’ different leadership styles.',
        codes: ['2.3'],
        look: [5],
        plan: two('Name the style, show how it works in Cairnside, then follow its effect on the staff.'),
        scheme: {
          kind: 'points',
          note: 'For each effect: identify the style (1), analyse how it works (1), and carry it to its effect on Cairnside’s staff (1).',
          points: [
            { marks: 3, text: 'A first effect. For example, Luc’s autocratic style gives quick decisions but leaves instructors without a say, which may help explain short-notice shifts and the experienced route setter’s departure.' },
            { marks: 3, text: 'A second effect. For example, Hana’s laissez-faire style leaves staff to organize themselves, which suits experienced setters but leaves part-time students without direction; or Priya’s democratic style could raise commitment if instructors help plan routes.' },
          ],
        },
        errors: ['Describing each style with no effect on the staff.', 'Three styles described briefly instead of two effects analysed.'],
      },
      {
        id: 'q4',
        number: '4',
        section: 'B',
        command: 'recommend',
        marks: 10,
        prompt: 'Recommend whether Cairnside should open the second centre through the joint venture with Maritime Mill Developments.',
        codes: ['1.5', '3.2'],
        look: [3, 4, 6, 7, 8, 9, 10],
        plan: EXTENDED,
        scheme: {
          kind: 'levels',
          note: 'Level descriptors written by the platform for this question. They are not the IB’s markbands. Place the answer in the level that best describes it.',
          indicative: [
            'For: demand the centre cannot meet in the evenings (71% too busy); a partner that provides the space and most of the fit-out; 60% of the profits; the medical centre and 140 flats as nearby customers; a step ahead of the national gym chain.',
            'Against: CA$350,000 the partners do not have, and personal guarantees on their homes under unlimited liability; 780 members a month needed to break even, more than a third of today’s total; management time that Priya fears the first centre would lose; shared control with a property company.',
            'Weighing: whether turning into a private limited company first changes the risk; whether waiting a year for retained profit loses Fenwick to a rival; whether 58% saying they would use a second centre would turn into 780 paying members.',
            'Limitations of the case: no figures for Fenwick’s population or demand, no length for the joint venture agreement, and a survey of existing members only.',
          ],
          levels: [
            { marks: '0', text: 'Nothing relevant to the joint venture.' },
            { marks: '1-2', text: 'Some knowledge of joint ventures or growth, with little reference to Cairnside.' },
            { marks: '3-4', text: 'Points for or against, applied in places, mostly one-sided.' },
            { marks: '5-6', text: 'Arguments on both sides with case evidence, such as the CA$350,000 and the survey, but not weighed.' },
            { marks: '7-8', text: 'Balanced arguments, some weighing, and a recommendation that follows from them.' },
            { marks: '9-10', text: 'As 7 to 8, with a clear recommendation that weighs risk against opportunity for the partners, states its conditions, such as forming a company first, and explains how a limitation of the case affects it.' },
          ],
        },
        errors: ['No recommendation, or one that sits on the fence.', 'Using the break-even figure without comparing it with the membership the centre could expect.'],
      },
      {
        id: 'q5',
        number: '5',
        section: 'B',
        command: 'to-what-extent',
        marks: 10,
        prompt: 'To what extent is social media marketing likely to remain an effective way for Cairnside to win new members?',
        codes: ['4.5'],
        look: [3, 9],
        plan: EXTENDED,
        scheme: {
          kind: 'levels',
          note: 'Level descriptors written by the platform for this question. They are not the IB’s markbands. Place the answer in the level that best describes it.',
          indicative: [
            'Effective: it built membership from 600 to 2,100; climbing videos suit a visual activity; low cost compared with traditional media; it reaches students, a third of members.',
            'Less effective: videos reach fewer people than two years ago and promoted posts cost more; new members are increasingly older adults and families who may not be reached the same way; a national chain can outspend a partnership.',
            'Other ways: partnerships with schools and the medical centre in Fenwick; word of mouth; a quieter daytime offer promoted to families.',
            'Limitations of the case: no figures for the cost of promoted posts or for how members first heard of the centre.',
          ],
          levels: [
            { marks: '0', text: 'Nothing relevant to social media marketing.' },
            { marks: '1-2', text: 'Some knowledge of promotion, with little reference to Cairnside.' },
            { marks: '3-4', text: 'Points on social media applied in places, mostly one-sided.' },
            { marks: '5-6', text: 'Arguments both ways, using case evidence, but not weighed into a view on the extent.' },
            { marks: '7-8', text: 'Balanced, weighed arguments and a conclusion on the extent that follows from them.' },
            { marks: '9-10', text: 'As 7 to 8, with a judgement on how far social media will stay effective as the membership changes, its conditions, and how a gap in the case limits it.' },
          ],
        },
        errors: ['Answering whether social media is good in general, not for Cairnside’s changing membership.', 'No answer to "to what extent".'],
      },
    ],
    stakeholders: [
      { name: 'Luc Arsenault (partner)', interest: 'Growth, and limiting personal risk by forming a company', power: 'High', stance: 'For', para: 7 },
      { name: 'Hana Brooks (partner)', interest: 'Growth paid for from retained profit, without new debt', power: 'High', stance: 'Mixed', para: 7 },
      { name: 'Priya Sandhu (partner)', interest: 'Time for the staff and for inclusive sessions', power: 'High', stance: 'Against', para: 7 },
      { name: 'Maritime Mill Developments', interest: 'A tenant that draws visitors to its new building', power: 'High', stance: 'For', para: 6 },
      { name: 'Part-time instructors and route setters', interest: 'Fair shifts and a say in their work', power: 'Low', stance: 'Mixed', para: 5 },
      { name: 'Members', interest: 'A less crowded centre and fair prices', power: 'Low', stance: 'For', para: 3 },
      { name: 'Neighbours and the city council', interest: 'Less parking pressure and noise late at night', power: 'High', stance: 'Mixed', para: 10 },
      { name: 'The bank', interest: 'A loan that is repaid, secured by guarantees', power: 'High', stance: 'Mixed', para: 7 },
    ],
    tools: [
      { id: 'swot-analysis', name: 'SWOT analysis', level: 'SL/HL', fit: 'possible', why: 'Helps you sort the case before the paper; in an answer, use it to find the argument rather than to restate the case.', href: '/toolkit/swot-analysis/' },
      { id: 'ansoff-matrix', name: 'Ansoff matrix', level: 'SL/HL', fit: 'strong', why: 'The second centre is market development: the existing service in a new town. Daytime sessions for families could be market penetration or product development. It frames the direction of growth.', href: '/toolkit/ansoff-matrix/' },
      { id: 'break-even', name: 'Break-even analysis', level: 'SL/HL', fit: 'strong', why: 'The case gives fixed costs and contribution per member: 780 members a month is the test any recommendation must face.', href: '/topics/break-even-analysis/' },
      { id: 'steeple-analysis', name: 'STEEPLE analysis', level: 'SL/HL', fit: 'possible', why: 'Some external factors (the council, a national chain, social media reach), but the decision turns more on Cairnside’s own finance and people.', href: '/toolkit/steeple-analysis/' },
      { id: 'descriptive-statistics', name: 'Descriptive statistics', level: 'SL/HL', fit: 'possible', why: 'The survey’s percentages can be read and questioned; there is no raw data to work further.', href: '/toolkit/descriptive-statistics/' },
      { id: 'decision-trees', name: 'Decision tree', level: 'SL/HL', fit: 'weak', why: 'No probabilities or payoffs are given: a tree would mean inventing them.', href: '/toolkit/decision-trees/' },
      { id: 'force-field-analysis', name: 'Force field analysis', level: 'HL', fit: 'weak', why: 'An HL-only tool: Paper 1 questions are not set on HL extension content (guide, p. 43).', href: '/toolkit/force-field-analysis/' },
      { id: 'gantt-chart', name: 'Gantt chart', level: 'HL', fit: 'weak', why: 'An HL-only tool: Paper 1 questions are not set on HL extension content (guide, p. 43).', href: '/toolkit/gantt-chart/' },
    ],
  },
];

export const caseById = (id: string): P1Case | undefined => P1_CASES.find((c) => c.id === id);

/** The full case: the released opening, then the rest. */
export const fullCase = (c: P1Case): string => `${c.opening}\n\n${c.rest}`;

/** The marks on the paper: Section A in full, and one Section B question. */
export const paperMarks = (c: P1Case): { a: number; b: number } => ({
  a: c.questions.filter((q) => q.section === 'A').reduce((s, q) => s + q.marks, 0),
  b: Math.max(0, ...c.questions.filter((q) => q.section === 'B').map((q) => q.marks)),
});
