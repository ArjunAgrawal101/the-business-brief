/**
 * Paper 3 practice stimuli: invented social enterprises, each in the form the
 * guide describes (p. 42): a short introduction to the organization, a visual
 * of a product, and five or six excerpts from documents such as an email, a
 * social media post, a newspaper article and a table. Each comes with the
 * paper's three questions (guide, p. 47: question 1 for 2 marks, question 2
 * for 6, question 3 for 17, marked on criteria A to D), the platform's own
 * guidance for each, and the human needs and challenges the plan builder
 * offers (src/lib/p3-plan.ts).
 *
 * Haven Lunchbox is the stimulus on the Paper 3 page, from the creator's
 * Paper 3 guide; its resources are written on that page, and only what the
 * plan builder needs is here. Ripplestone Water and Relay Laptops are new.
 * Every organization, person, place and figure is invented, and so are the
 * regions; none is a real organization. Figures in the tables add up, and
 * tests/unit/p3-stimuli.test.ts checks them.
 */
export type ResourceKind = 'Text' | 'Visual' | 'Email' | 'Social media' | 'Newspaper' | 'Table' | 'Document';

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  /** Paragraphs of the excerpt. */
  body?: string[];
  /** For an email or a post: who it is from. */
  from?: string;
  /** For a newspaper excerpt: its headline. */
  headline?: string;
  /** For a table: its caption, columns and rows. */
  table?: { caption: string; columns: string[]; rows: string[][] };
  /** For the visual of a product: a description that stands in for the drawing. */
  visual?: { product: string; labels: string[]; description: string };
}

export interface Need {
  id: string;
  kind: 'need' | 'challenge' | 'opportunity';
  text: string;
  /** The function a challenge sits in. */
  fn?: 'marketing' | 'operations' | 'hr' | 'finance';
  resources: string[];
}

export interface P3Question {
  number: 1 | 2 | 3;
  marks: 2 | 6 | 17;
  command: 'describe' | 'explain' | 'recommend';
  prompt: string;
  /** The platform's guidance, never an IB markscheme. */
  guidance: string[];
}

export interface Stimulus {
  id: string;
  organization: string;
  /** "Ripplestone Water, an invented social enterprise in the Lowmoor Valley". */
  setting: string;
  /** Every stimulus here is invented. */
  fictional: true;
  summary: string;
  /** The page it lives on. */
  href: string;
  resources: Resource[];
  needs: Need[];
  questions: P3Question[];
  /** A model plan, in outline: one of many good plans. */
  model: { direction: string; first: string; then: string; later: string; throughout: string; tradeoffs: string[] };
}

/** Criteria for question 3: names and maximum marks from the guide (pp. 48-50), with the platform's own prompts. */
export const CRITERIA = [
  { id: 'A', name: 'Use of resource materials', marks: 4, prompt: 'Is every resource used as evidence for something the plan does?' },
  { id: 'B', name: 'Business management tools and theories', marks: 4, prompt: 'Does each tool change the plan, rather than decorate it?' },
  { id: 'C', name: 'Evaluation', marks: 6, prompt: 'Is each action weighed: its expected impact on the areas of the business, and the trade-offs between them?' },
  { id: 'D', name: 'Sequencing of ideas and plan of action', marks: 3, prompt: 'Do the ideas and actions follow a clear, coherent order?' },
] as const;

export const STIMULI: Stimulus[] = [
  {
    id: 'haven',
    organization: 'Haven Lunchbox',
    setting: 'Haven Lunchbox, an invented social enterprise in Northvale, an invented town',
    fictional: true,
    summary: 'Two cafés whose surplus pays for free school lunches, as demand for the lunches outgrows the cafés.',
    href: '/assessment/paper-3/#p3-stim-h',
    resources: [
      { id: 'R1', title: 'Introduction', kind: 'Text' },
      { id: 'R2', title: 'Kitchen use through the day', kind: 'Visual' },
      { id: 'R3', title: 'Café sales and lunch requests', kind: 'Table' },
      { id: 'R4', title: 'An email from an office manager', kind: 'Email' },
      { id: 'R5', title: 'Northvale Business Park grows', kind: 'Newspaper' },
      { id: 'R6', title: "A volunteer's post", kind: 'Social media' },
    ],
    needs: [
      { id: 'n-meal', kind: 'need', text: 'Children from low-income families need a regular, nutritious midday meal', resources: ['R1', 'R3'] },
      { id: 'c-cash', kind: 'challenge', fn: 'finance', text: 'Café cash sales are falling while lunch requests rise', resources: ['R3'] },
      { id: 'c-overtime', kind: 'challenge', fn: 'hr', text: 'Kitchen staff have worked unpaid overtime for two months', resources: ['R6'] },
      { id: 'c-capacity', kind: 'challenge', fn: 'operations', text: 'The kitchens are full in the morning and idle after 2 pm', resources: ['R2'] },
      { id: 'o-offices', kind: 'opportunity', text: 'Offices on the growing business park ask for catering', resources: ['R4', 'R5'] },
    ],
    questions: [],
    model: {
      direction: 'Market development: existing food for a new market of offices.',
      first: 'Pilot afternoon catering for two offices in the kitchens\' quiet hours (R2), with school-lunch slots fixed first.',
      then: 'Use pilot income to recruit and train two kitchen staff from Northvale families, ending the overtime (R6).',
      later: 'Extend catering across the growing park (R5) and review whether a second kitchen is justified.',
      throughout: 'The mission (R1) sets the limit: no catering order may displace a school lunch.',
      tradeoffs: ['Afternoon-only catering protects the lunches but gives up the most valuable lunchtime orders.'],
    },
  },
  {
    id: 'ripplestone',
    organization: 'Ripplestone Water',
    setting: 'Ripplestone Water, an invented social enterprise in the Lowmoor Valley, an invented rural region',
    fictional: true,
    summary: 'Solar-powered kiosks that sell safe drinking water cheaply, held back by late parts, leaving operators and a thin rainy-season surplus.',
    href: '/assessment/paper-3/practice/ripplestone/',
    resources: [
      {
        id: 'R1',
        title: 'Introduction',
        kind: 'Text',
        body: [
          'Ripplestone Water is a social enterprise founded in 2021 by Grace Atieno, a water engineer, in the Lowmoor Valley, a rural region where most villages draw water from a river and from shallow wells that are often contaminated.',
          'Ripplestone runs eight solar-powered kiosks that filter water and sell it at $0.25 for a 20-litre can, about a fifth of the price of water from tanker trucks. Each kiosk is run by an operator from its village. Its mission is "safe water within a short walk of every home in the valley", and any surplus pays for new kiosks.',
        ],
      },
      {
        id: 'R2',
        title: 'A Ripplestone kiosk',
        kind: 'Visual',
        visual: {
          product: 'A Ripplestone water kiosk',
          labels: ['Solar panel on the roof', 'Filter tanks inside', 'Tap and counter', '20-litre can', 'Price board: $0.25 a can'],
          description: 'A small kiosk with a solar panel on its roof powers the pumps and filters inside. Villagers bring 20-litre cans to a tap at the counter, where a board shows the price of $0.25 a can.',
        },
      },
      {
        id: 'R3',
        title: 'An email from the district health officer',
        kind: 'Email',
        from: 'The district health officer, Lowmoor Valley',
        body: [
          'In the villages with a kiosk, our clinics treated about a third fewer children under five for stomach illness last year. I would like Ripplestone in the twelve villages that still have none. The district cannot pay to build kiosks, but our nurses could tell every family that visits a clinic where safe water is sold.',
        ],
      },
      {
        id: 'R4',
        title: 'A post by a kiosk operator',
        kind: 'Social media',
        from: 'A Ripplestone kiosk operator',
        body: ['Third breakdown this month. The new filter cartridges are six weeks late again, and people walked back to the river. I am paid a share of what the kiosk sells, so no water means no pay. Two operators in other villages have already quit.'],
      },
      {
        id: 'R5',
        title: 'Lowmoor Valley Courier',
        kind: 'Newspaper',
        headline: 'Longer dry seasons strain the valley\'s wells',
        body: [
          'Hotter and longer dry seasons have left many shallow wells in the valley empty by midsummer. Families told the Courier that in the months before the harvest, when cash is scarce, even cheap water is hard to afford, and some return to the river. A company that sells water filters for homes plans to open a shop in the valley\'s market town next year.',
        ],
      },
      {
        id: 'R6',
        title: 'An average month at one kiosk, 2025',
        kind: 'Table',
        table: {
          caption: 'An average month at one kiosk, 2025 ($)',
          columns: ['', 'Dry season', 'Rainy season'],
          rows: [
            ['Cans sold', '3,000', '1,400'],
            ['Sales revenue', '750', '350'],
            ["Operator's share (20% of sales)", '150', '70'],
            ['Filters and parts', '130', '130'],
            ['Repairs', '60', '60'],
            ['Surplus', '410', '90'],
          ],
        },
      },
      {
        id: 'R7',
        title: "Extract from the board's minutes",
        kind: 'Document',
        body: [
          'Grace proposed a family card: households would pay $5 a month for up to 30 cans. A microfinance provider has offered a loan of $40,000 at 18% a year. A new kiosk costs $6,000 to build. The board noted that operators receive no training after their first week.',
        ],
      },
    ],
    needs: [
      { id: 'n-water', kind: 'need', text: 'Families need safe drinking water close to home', resources: ['R1', 'R3', 'R5'] },
      { id: 'c-filters', kind: 'challenge', fn: 'operations', text: 'Filter cartridges arrive late, so kiosks break down', resources: ['R4', 'R6'] },
      { id: 'c-operators', kind: 'challenge', fn: 'hr', text: 'Operators are paid only a share of sales, untrained, and leaving', resources: ['R4', 'R7'] },
      { id: 'c-surplus', kind: 'challenge', fn: 'finance', text: 'The rainy-season surplus is thin, and each new kiosk costs $6,000', resources: ['R6', 'R7'] },
      { id: 'c-afford', kind: 'challenge', fn: 'marketing', text: 'Some families cannot afford even cheap water before the harvest', resources: ['R5'] },
      { id: 'c-rival', kind: 'challenge', fn: 'marketing', text: 'A seller of home water filters plans to open in the market town', resources: ['R5'] },
      { id: 'o-clinics', kind: 'opportunity', text: 'Clinics would promote the kiosks, and twelve villages have none', resources: ['R3'] },
    ],
    questions: [
      {
        number: 1,
        marks: 2,
        command: 'describe',
        prompt: 'Describe the human need of the families in the Lowmoor Valley that Ripplestone meets.',
        guidance: [
          'One mark for the particular need of the families named, from the stimulus: safe water to drink, close to home, when river and well water is contaminated (R1, R5).',
          'One mark for an appropriate theory that identifies it, for example a physiological need in Maslow\'s hierarchy. "Physical need" on its own names no theory.',
          'Copying the stimulus without describing the need earns little.',
        ],
      },
      {
        number: 2,
        marks: 6,
        command: 'explain',
        prompt: 'Explain two challenges Ripplestone faces: one in operations and one in human resources.',
        guidance: [
          'For each challenge: identify it in the area named (1), explain why it is a challenge with business management knowledge (1), and apply it with evidence from the stimulus, figures where there are any (1).',
          'Operations, for example: an unreliable supply chain for filter cartridges, six weeks late again, so kiosks stop selling and families return to the river (R4).',
          'Human resources, for example: operators paid only a 20% share of sales (R6) and untrained after their first week (R7) have little security, and two have quit (R4).',
          'Two challenges that are really one, or a challenge in the wrong area, earn little for the second.',
        ],
      },
      {
        number: 3,
        marks: 17,
        command: 'recommend',
        prompt: 'Recommend a plan of action for Ripplestone to meet the need for safe drinking water across the Lowmoor Valley over the next three years.',
        guidance: [
          'Marked on criteria A to D: use every resource as evidence for an action, apply tools that shape the plan, evaluate each action\'s impact and the trade-offs between areas, and set the actions in a clear, coherent order.',
          'A plan for the whole organization, not only the question 2 challenges; paid for by trading, not by hoping for gifts.',
        ],
      },
    ],
    model: {
      direction: 'Market penetration first (more families in villages already served), then market development into the twelve villages with no kiosk.',
      first: 'Hold a buffer stock of filter cartridges and find a second supplier, so kiosks stop breaking down (R4, R6); pay operators a small base wage plus their share, with monthly training (R7).',
      then: 'Launch the family card at $5 a month, which smooths the rainy-season dip in cash (R6) and keeps water affordable before the harvest (R5); clinics promote it (R3).',
      later: 'Borrow $36,000 of the $40,000 the microfinance provider offers (R7) to build six kiosks at $6,000 each, repaid from dry-season surpluses of about $410 a kiosk a month (R6); their surpluses then pay for the other six villages.',
      throughout: 'The mission (R1) sets the test: every action must bring safe water closer to more homes.',
      tradeoffs: [
        'A base wage raises costs in the rainy season, when the surplus is only $90 a kiosk, but steadier operators keep kiosks open and selling.',
        'The family card locks in income and loyalty, but heavy users may pay less per can than today.',
      ],
    },
  },
  {
    id: 'relay',
    organization: 'Relay Laptops',
    setting: 'Relay Laptops, an invented social enterprise in Brindlecombe, an invented city',
    fictional: true,
    summary: 'Refurbished laptops for students without a computer at home, made by trainees who had been out of work, as donations fall and schools turn to leasing.',
    href: '/assessment/paper-3/practice/relay/',
    resources: [
      {
        id: 'R1',
        title: 'Introduction',
        kind: 'Text',
        body: [
          'Relay Laptops is a social enterprise in Brindlecombe, a city where one secondary student in four has no computer at home. It was founded in 2020 by Dev Malhotra, a former IT manager.',
          'Relay collects unwanted laptops from local businesses, wipes their data securely and repairs them. It sells them with a one-year warranty for $120 to families who receive school meal support, and for $260 to everyone else. The repairs are done by young adults who had been out of work for a year or more, trained and paid by Relay; it takes 14 trainees a year. Any surplus pays for more training places.',
        ],
      },
      {
        id: 'R2',
        title: 'A Relay laptop',
        kind: 'Visual',
        visual: {
          product: 'A Relay refurbished laptop',
          labels: ['Refurbished laptop', 'Data wiped and certified', 'Sticker: "Repaired in Brindlecombe"', 'One-year warranty card', 'Charger included'],
          description: 'An open laptop with a sticker reading "Repaired in Brindlecombe", sold with a certificate that its old data was wiped, a charger and a one-year warranty card.',
        },
      },
      {
        id: 'R3',
        title: 'An email from a school business manager',
        kind: 'Email',
        from: 'The business manager, Harlow Lane Academy',
        body: [
          'We would like laptops for all 300 of next year\'s Year 9 students. Our budget is set up for leasing new tablets at $9 a month each over three years. Could Relay offer something similar? Our students like your laptops, but we must be sure repairs are done within a week.',
        ],
      },
      {
        id: 'R4',
        title: 'A post by a trainee',
        kind: 'Social media',
        from: 'A Relay trainee',
        body: ['Six months ago I had not worked for two years. Today I fixed my fiftieth laptop. Proud of what we do, but half my group still do not know if there will be a job for us when the course ends.'],
      },
      {
        id: 'R5',
        title: 'Brindlecombe Evening Post',
        kind: 'Newspaper',
        headline: 'Firms switch to leased laptops',
        body: [
          'More of the city\'s businesses now lease their laptops and hand them back to the leasing company when they are replaced, instead of giving them away. "We used to donate a hundred machines a year," said one office manager. "Now they go back to the lessor." Prices of spare parts have also risen.',
        ],
      },
      {
        id: 'R6',
        title: 'Laptops donated and sold, 2025',
        kind: 'Table',
        table: {
          caption: 'Relay Laptops: laptops donated and sold, by quarter, 2025',
          columns: ['', 'Q1', 'Q2', 'Q3', 'Q4'],
          rows: [
            ['Laptops donated', '640', '590', '520', '430'],
            ['Laptops sold at $120', '300', '340', '370', '390'],
            ['Laptops sold at $260', '210', '220', '230', '220'],
            ['Laptops sold in all', '510', '560', '600', '610'],
          ],
        },
      },
      {
        id: 'R7',
        title: "A supervisor's report",
        kind: 'Document',
        body: [
          'Each of our two supervisors oversees seven trainees. A trainee repairs about four laptops a week at first and nine by the end of the course. Spare parts cost 15% more than last year. Of last year\'s 14 trainees, 5 found jobs with other employers and 3 were taken on by Relay.',
        ],
      },
    ],
    needs: [
      { id: 'n-computer', kind: 'need', text: 'Students from low-income families need a computer at home to study', resources: ['R1', 'R3'] },
      { id: 'n-work', kind: 'need', text: 'Young adults out of work need skills and a secure job', resources: ['R1', 'R4', 'R7'] },
      { id: 'c-supply', kind: 'challenge', fn: 'operations', text: 'Donations are falling as firms lease their laptops', resources: ['R5', 'R6'] },
      { id: 'c-margin', kind: 'challenge', fn: 'finance', text: 'Spare parts cost more, and most sales are at the lower price', resources: ['R6', 'R7'] },
      { id: 'c-jobs', kind: 'challenge', fn: 'hr', text: 'Trainees do not know if there will be a job when the course ends', resources: ['R4', 'R7'] },
      { id: 'o-schools', kind: 'opportunity', text: 'A school wants 300 laptops on a monthly payment', resources: ['R3'] },
    ],
    questions: [
      {
        number: 1,
        marks: 2,
        command: 'describe',
        prompt: 'Describe the human need of the students from low-income families that Relay meets.',
        guidance: [
          'One mark for the particular need of the students named: a computer at home to do schoolwork, which one student in four in Brindlecombe lacks (R1).',
          'One mark for an appropriate theory, for example esteem needs in Maslow\'s hierarchy (to achieve and be recognized at school), or competence in Deci and Ryan\'s self-determination theory (HL).',
          'The need of the trainees is a different stakeholder\'s: write about the stakeholder the question names.',
        ],
      },
      {
        number: 2,
        marks: 6,
        command: 'explain',
        prompt: 'Explain two challenges Relay faces: one in operations and one in finance.',
        guidance: [
          'For each challenge: identify it in the area named (1), explain why it is a challenge with business management knowledge (1), and apply it with evidence from the stimulus, using the figures (1).',
          'Operations, for example: the supply of its raw material is falling, from 640 laptops donated in Q1 to 430 in Q4, while sales rose from 510 to 610, so Relay will soon have too few to repair (R5, R6).',
          'Finance, for example: rising costs and a falling price mix, with spare parts up 15% (R7) and most laptops sold at $120 rather than $260 (R6), squeeze the surplus that pays for training.',
        ],
      },
      {
        number: 3,
        marks: 17,
        command: 'recommend',
        prompt: 'Recommend a plan of action for Relay to meet the need of students from low-income families for a computer at home over the next two years.',
        guidance: [
          'Marked on criteria A to D: use every resource as evidence for an action, apply tools that shape the plan, evaluate each action\'s impact and the trade-offs between areas, and set the actions in a clear, coherent order.',
          'Keep the trainees in view: a plan that meets the students\' need by cutting the training places would trade one part of the mission for the other.',
        ],
      },
    ],
    model: {
      direction: 'Product development: a school leasing service for the existing market of students, with new sources of laptops.',
      first: 'Agree with leasing companies to take their returned laptops (R5), to restore the supply that fell from 640 to 430 a quarter (R6).',
      then: 'Offer Harlow Lane Academy a lease at $9 a month with repairs in a week (R3), which needs the trainees at nine repairs a week (R7) and one more supervisor.',
      later: 'Take on more trainees as permanent technicians for school contracts, answering the worry in R4, and repeat the offer to other schools.',
      throughout: 'Every family on school meal support can still buy a laptop for $120 (R1).',
      tradeoffs: [
        'School leases bring steady income, but repairs within a week tie up the trainees who are still learning.',
        'Hiring trainees as technicians gives them secure jobs, but adds fixed costs before the lease income is certain.',
      ],
    },
  },
];

export const stimulusById = (id: string): Stimulus | undefined => STIMULI.find((s) => s.id === id);

/** The words of the stimulus: the introduction, the excerpts, the table and the visual's labels. */
export function stimulusWords(s: Stimulus): number {
  const text = s.resources
    .flatMap((r) => [r.title, r.headline ?? '', r.from ?? '', ...(r.body ?? []), ...(r.table ? [r.table.caption, ...r.table.columns, ...r.table.rows.flat()] : []), ...(r.visual?.labels ?? [])])
    .join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}
