"""
Writes src/content/curricula/ib-dp-bm.yaml from the definition below.

Every line was checked against the IB Business management guide (first
assessment 2024, published February 2022, updated May 2022). Content
statements are given in the platform's own words; the depth of teaching (AO),
HL-only status and page numbers follow the guide. Run:

    python3 scripts/content/build_curriculum.py
"""
from pathlib import Path
import yaml

S = 'SL/HL'
H = 'HL'
MIX = 'SL/HL with HL-only content'

def c(text, *ao, hl=False):
    item = {'text': text, 'ao': list(ao)}
    if hl:
        item['level'] = 'HL'
    return item

def sub(code, title, level, page, content, topic=None, tools=(), calculations=(), note=None):
    d = {'code': code, 'title': title, 'level': level, 'verification': 'primary', 'page': page}
    if note:
        d['note'] = note
    if topic:
        d['topic'] = topic
    if tools:
        d['tools'] = list(tools)
    if calculations:
        d['calculations'] = list(calculations)
    d['content'] = content
    return d

units = [
  {'id': 'unit-1', 'number': 1, 'title': 'Introduction to business management', 'verification': 'primary', 'hours': {'sl': 20, 'hl': 20}, 'page': 23,
   'tools': ['swot-analysis', 'ansoff-matrix', 'steeple-analysis', 'business-plan', 'decision-trees', 'circular-business-models', 'porters-generic-strategies', 'simple-linear-regression'],
   'subtopics': [
    sub('1.1', 'What is a business?', S, 23, [
      c('The nature of business', 'AO1'),
      c('Primary, secondary, tertiary and quaternary sectors', 'AO2'),
      c('Entrepreneurship', 'AO2'),
      c('Challenges and opportunities for starting up a business', 'AO2')]),
    sub('1.2', 'Types of business entities', S, 23, [
      c('The difference between the private and the public sectors', 'AO2'),
      c('The main features of sole traders, partnerships, privately held companies and publicly held companies', 'AO3'),
      c('The main features of for-profit social enterprises: private sector companies, public sector companies and cooperatives', 'AO3'),
      c('The main features of non-governmental organizations (NGOs), a non-profit social enterprise', 'AO3')]),
    sub('1.3', 'Business objectives', S, 23, [
      c('Vision statements and mission statements', 'AO2'),
      c('Common business objectives, including growth, profit, protecting shareholder value and ethical objectives', 'AO2'),
      c('Strategic and tactical objectives', 'AO3'),
      c('Corporate social responsibility (CSR)', 'AO3')]),
    sub('1.4', 'Stakeholders', S, 24, [
      c('Internal and external stakeholders', 'AO2'),
      c('Conflict between stakeholders', 'AO2')]),
    sub('1.5', 'Growth and evolution', S, 24, [
      c('Internal and external economies and diseconomies of scale', 'AO2'),
      c('The difference between internal and external growth', 'AO2'),
      c('Reasons for businesses to grow', 'AO3'),
      c('Reasons for businesses to stay small', 'AO3'),
      c('External growth methods: mergers and acquisitions, takeovers, joint ventures, strategic alliances and franchising', 'AO3')],
      topic='growth-and-evolution', tools=['ansoff-matrix', 'decision-trees', 'force-field-analysis', 'swot-analysis'], calculations=['expected-value']),
    sub('1.6', 'Multinational companies (MNCs)', S, 24, [
      c('The impact of MNCs on host countries', 'AO3')]),
  ]},
  {'id': 'unit-2', 'number': 2, 'title': 'Human resource management', 'verification': 'primary', 'hours': {'sl': 20, 'hl': 35}, 'page': 25,
   'tools': ['force-field-analysis', 'descriptive-statistics', 'swot-analysis', 'steeple-analysis', 'hofstedes-cultural-dimensions'],
   'subtopics': [
    sub('2.1', 'Introduction to human resource management', S, 25, [
      c('The role of human resource management', 'AO2'),
      c('Internal and external factors that influence human resource planning, such as demographic change, labour mobility, immigration, flexi-time and the gig economy', 'AO2'),
      c('Reasons for resistance to change in the workplace', 'AO2'),
      c('Human resource strategies for reducing the impact of change and resistance to change', 'AO3')]),
    sub('2.2', 'Organizational structure', MIX, 25, [
      c('Terms for organizational structures: delegation, span of control, levels of the hierarchy, chain of command, bureaucracy, centralization, decentralization, delayering and matrix structure', 'AO2'),
      c('Organization charts: flat or horizontal, tall or vertical, and by product, function or region', 'AO2', 'AO4'),
      c('Which organizational structure suits a change in external factors', 'AO3'),
      c("Changes in organizational structures, such as project-based organization and Charles Handy's Shamrock Organization", 'AO3', hl=True)]),
    sub('2.3', 'Leadership and management', MIX, 26, [
      c('Scientific and intuitive thinking and management', 'AO2', hl=True),
      c('Management and leadership', 'AO2'),
      c('Leadership styles: autocratic, paternalistic, democratic, laissez-faire and situational', 'AO3')],
      topic='leadership-and-management', tools=['force-field-analysis']),
    sub('2.4', 'Motivation and demotivation', MIX, 26, [
      c('Motivation theories of Taylor, Maslow and Herzberg (motivation-hygiene theory)', 'AO3'),
      c("McClelland's acquired needs theory, Deci and Ryan's self-determination theory, and equity and expectancy theory", 'AO3', hl=True),
      c('Labour turnover', 'AO2', 'AO4', hl=True),
      c('Types of appraisal: formative, summative, 360-degree feedback and self-appraisal', 'AO2', hl=True),
      c('Methods of recruitment', 'AO2', hl=True),
      c('Internal and external recruitment', 'AO3', hl=True),
      c('Financial rewards: salary, wages (time and piece rates), commission, performance-related pay, profit-related pay, employee share ownership schemes and fringe payments', 'AO2'),
      c('Non-financial rewards: job enrichment, job rotation, job enlargement, empowerment, purpose and teamwork', 'AO2'),
      c('Types of training: induction, on the job and off the job', 'AO2')],
      calculations=['labour-turnover']),
    sub('2.5', 'Organizational (corporate) culture', H, 27, [
      c('Organizational culture', 'AO1', hl=True),
      c('Types of organizational culture, such as Charles Handy\'s "Gods of management"', 'AO2', hl=True),
      c('Cultural clashes when organizations change, for example when they grow, merge or change leadership style', 'AO3', hl=True)]),
    sub('2.6', 'Communication', S, 27, [
      c('Formal and informal methods of communication for an organization in a given situation', 'AO3'),
      c('Barriers to communication', 'AO2')]),
    sub('2.7', 'Industrial/employee relations', H, 27, [
      c('Sources of conflict in the workplace', 'AO2', hl=True),
      c('Approaches to conflict by employees (collective bargaining, work-to-rule, strike action) and by employers (collective bargaining, threats of redundancies, changes of contract, closure and lockouts)', 'AO3', hl=True),
      c('Approaches to conflict resolution: conciliation and arbitration, employee participation and industrial democracy, no-strike agreements and single-union agreements', 'AO3', hl=True)]),
  ]},
  {'id': 'unit-3', 'number': 3, 'title': 'Finance and accounts', 'verification': 'primary', 'hours': {'sl': 30, 'hl': 45}, 'page': 28,
   'tools': ['bcg-matrix', 'descriptive-statistics', 'swot-analysis', 'contribution'],
   'subtopics': [
    sub('3.1', 'Introduction to finance', S, 28, [
      c('The role of finance for businesses: capital expenditure and revenue expenditure', 'AO2')]),
    sub('3.2', 'Sources of finance', S, 28, [
      c('Internal sources of finance: personal funds (for sole traders), retained profit and the sale of assets', 'AO2'),
      c('External sources of finance: share capital, loan capital, overdrafts, trade credit, crowdfunding, leasing, microfinance providers and business angels', 'AO2'),
      c('Which short- or long-term source of finance suits a given situation', 'AO3')]),
    sub('3.3', 'Costs and revenues', S, 28, [
      c('Types of cost, with examples: fixed, variable, direct and indirect (overhead)', 'AO2'),
      c('Total revenue and revenue streams, with examples', 'AO2')],
      topic='costs-and-revenues', tools=['contribution'], calculations=['total-cost', 'total-revenue', 'profit']),
    sub('3.4', 'Final accounts', MIX, 29, [
      c('The purpose of accounts to different stakeholders', 'AO2'),
      c('Final accounts: the profit and loss account and the balance sheet', 'AO2', 'AO4'),
      c('Different types of intangible assets', 'AO2'),
      c('Depreciation by the straight line and units of production methods', 'AO2', 'AO4', hl=True),
      c('Which depreciation method is appropriate', 'AO3', hl=True)]),
    sub('3.5', 'Profitability and liquidity ratio analysis', S, 29, [
      c('Profitability ratios: gross profit margin, profit margin and return on capital employed (ROCE)', 'AO2', 'AO4'),
      c('Strategies to improve the profitability ratios', 'AO3'),
      c('Liquidity ratios: current ratio and acid test (quick) ratio', 'AO2', 'AO4'),
      c('Strategies to improve the liquidity ratios', 'AO3')]),
    sub('3.6', 'Efficiency ratio analysis', H, 29, [
      c('Efficiency ratios: stock turnover, debtor days, creditor days and gearing ratio', 'AO2', 'AO4', hl=True),
      c('Strategies to improve the efficiency ratios', 'AO3', hl=True),
      c('Insolvency versus bankruptcy', 'AO2', hl=True)],
      note='Some sources call this subtopic "Debt/equity ratio analysis"; the guide calls it "Efficiency ratio analysis".'),
    sub('3.7', 'Cash flow', S, 29, [
      c('The difference between profit and cash flow', 'AO2'),
      c('Working capital', 'AO2', 'AO4'),
      c('Liquidity position', 'AO2'),
      c('Cash flow forecasts', 'AO2', 'AO4'),
      c('The relationship between investment, profit and cash flow', 'AO2'),
      c('Strategies for dealing with cash flow problems', 'AO3')]),
    sub('3.8', 'Investment appraisal', MIX, 30, [
      c('Investment opportunities appraised by payback period and average rate of return (ARR)', 'AO3', 'AO4'),
      c('Net present value (NPV)', 'AO3', 'AO4', hl=True)]),
    sub('3.9', 'Budgets', H, 30, [
      c('The difference between cost and profit centres', 'AO2', hl=True),
      c('The roles of cost and profit centres', 'AO2', hl=True),
      c('Constructing a budget', 'AO2', 'AO4', hl=True),
      c('Variances', 'AO2', 'AO4', hl=True),
      c('The importance of budgets and variances in decision-making', 'AO2', hl=True)]),
  ]},
  {'id': 'unit-4', 'number': 4, 'title': 'Marketing', 'verification': 'primary', 'hours': {'sl': 30, 'hl': 35}, 'page': 30,
   'tools': ['ansoff-matrix', 'swot-analysis', 'steeple-analysis', 'bcg-matrix', 'descriptive-statistics', 'gantt-chart', 'simple-linear-regression', 'critical-path-analysis', 'contribution', 'hofstedes-cultural-dimensions'],
   'subtopics': [
    sub('4.1', 'Introduction to marketing', MIX, 31, [
      c('Market orientation versus product orientation', 'AO2'),
      c('Market share', 'AO2', 'AO4'),
      c('Market growth', 'AO2', 'AO4'),
      c('The importance of market share and market leadership', 'AO3', hl=True)]),
    sub('4.2', 'Marketing planning', S, 31, [
      c('The role of marketing planning', 'AO2'),
      c('Segmentation, targeting and positioning, including position maps', 'AO2', 'AO4'),
      c('Niche markets versus mass markets', 'AO2'),
      c('The importance of a unique selling point or proposition (USP)', 'AO2'),
      c('How organizations differentiate themselves and their products from competitors', 'AO3')]),
    sub('4.3', 'Sales forecasting', H, 31, [
      c('The benefits and limitations of sales forecasting', 'AO3', hl=True)]),
    sub('4.4', 'Market research', S, 31, [
      c('Why and how organizations carry out market research', 'AO3'),
      c('Primary research: surveys, interviews, focus groups and observations', 'AO2'),
      c('Secondary research: market analyses, academic journals, government publications, media articles and online content', 'AO2'),
      c('Qualitative versus quantitative research', 'AO2'),
      c('Sampling methods: quota, random and convenience', 'AO2')]),
    sub('4.5', 'The seven Ps of the marketing mix', MIX, 31, [
      c('Product: the product life cycle, the product portfolio and the marketing mix', 'AO2'),
      c('Product: extension strategies', 'AO3'),
      c('Product: the product life cycle, investment, profit and cash flow', 'AO2'),
      c('Product: brand awareness, development, loyalty and value, and the importance of branding', 'AO2'),
      c('Price: cost-plus (mark-up), penetration, loss leader, predatory and premium pricing', 'AO3'),
      c('Price: dynamic, competitive and contribution pricing, and price elasticity of demand', 'AO3', hl=True),
      c('Promotion: above, below and through the line', 'AO2'),
      c('Promotion: social media marketing as a promotional strategy', 'AO3'),
      c('Place: the importance of different types of distribution channel', 'AO3'),
      c('People: employee and customer relationships in marketing a service, and how they vary between cultures', 'AO3'),
      c('Processes: delivery processes in marketing a service, and changes in them', 'AO3'),
      c('Physical evidence: tangible evidence in marketing a service', 'AO3'),
      c('Appropriate marketing mixes for particular products or businesses', 'AO3')]),
    sub('4.6', 'International marketing', H, 32, [
      c('The opportunities and threats of entering and operating in international markets', 'AO3', hl=True)]),
  ]},
  {'id': 'unit-5', 'number': 5, 'title': 'Operations management', 'verification': 'primary', 'hours': {'sl': 15, 'hl': 45}, 'page': 33,
   'tools': ['decision-trees', 'descriptive-statistics', 'circular-business-models', 'gantt-chart', 'critical-path-analysis', 'contribution', 'simple-linear-regression', 'hofstedes-cultural-dimensions'],
   'subtopics': [
    sub('5.1', 'Introduction to operations management', S, 33, [
      c('The role of operations management', 'AO2')]),
    sub('5.2', 'Operations methods', S, 33, [
      c('Job, batch and mass (flow) production, and mass customization', 'AO3')]),
    sub('5.3', 'Lean production and quality management', H, 34, [
      c('Features of lean production: less waste and greater efficiency', 'AO1', hl=True),
      c('Methods of lean production: continuous improvement (kaizen) and just-in-time (JIT)', 'AO2', hl=True),
      c('Features of cradle to cradle design and manufacturing', 'AO2', hl=True),
      c('Features of quality control and quality assurance', 'AO2', hl=True),
      c('Methods of managing quality: quality circles, benchmarking and total quality management (TQM)', 'AO2', hl=True),
      c('The impact of lean production and TQM on an organization', 'AO3', hl=True),
      c('The importance of national and international quality standards', 'AO2', hl=True)]),
    sub('5.4', 'Location', S, 34, [
      c('Reasons for a specific location of production', 'AO2'),
      c('Reorganizing production nationally and internationally: outsourcing or subcontracting, offshoring, insourcing and reshoring', 'AO3')]),
    sub('5.5', 'Break-even analysis', S, 34, [
      c('Total contribution versus contribution per unit', 'AO2'),
      c('The break-even chart: break-even quantity, profit or loss, margin of safety, target profit output, target profit and target price', 'AO2', 'AO4'),
      c('The effects of changes in price or cost on the break-even quantity, profit and margin of safety, shown graphically and by calculation', 'AO2', 'AO4'),
      c('The limitations of break-even as a decision-making tool', 'AO3')],
      topic='costs-and-revenues',
      calculations=['contribution-per-unit', 'total-contribution', 'break-even-quantity', 'break-even-revenue', 'margin-of-safety', 'target-profit-output', 'target-price'],
      note='Taught in the costs and revenues brief and worked in the Finance Desk break-even workspace.'),
    sub('5.6', 'Production planning', H, 34, [
      c('The local and global supply chain process', 'AO2', hl=True),
      c('Just-in-time (JIT) versus just-in-case (JIC)', 'AO3', hl=True),
      c('Stock control charts: lead time, buffer stock, reorder level and reorder quantity', 'AO2', 'AO4', hl=True),
      c('Capacity utilization rate', 'AO2', 'AO4', hl=True),
      c('Defect rate', 'AO2', 'AO4', hl=True),
      c('Labour productivity, capital productivity, productivity rate and operating leverage', 'AO2', 'AO4', hl=True),
      c('Cost to buy (CTB) and cost to make (CTM)', 'AO3', 'AO4', hl=True)]),
    sub('5.7', 'Crisis management and contingency planning', H, 35, [
      c('The difference between crisis management and contingency planning', 'AO2', hl=True),
      c('Factors in effective crisis management: transparency, communication, speed and control', 'AO2', hl=True),
      c('The impact of contingency planning on cost, time, risks and safety for a given organization or situation', 'AO3', hl=True)]),
    sub('5.8', 'Research and development', H, 35, [
      c('The importance of research and development for a business', 'AO3', hl=True),
      c("Developing goods and services that meet customers' unmet needs, whether or not customers are aware of them", 'AO2', hl=True),
      c('Intellectual property protection: copyrights, patents and trademarks', 'AO2', hl=True),
      c('Innovation: incremental and disruptive', 'AO2', hl=True)]),
    sub('5.9', 'Management information systems', H, 35, [
      c('Data analytics, databases, cybersecurity and cybercrime', 'AO1', hl=True),
      c('Critical infrastructures (artificial neural networks, data centres, cloud computing), virtual reality, the internet of things, artificial intelligence and big data', 'AO2', hl=True),
      c('Customer loyalty programmes', 'AO3', hl=True),
      c('Using data to manage and monitor employees, and digital Taylorism', 'AO3', hl=True),
      c('Data mining to inform decision-making', 'AO3', hl=True),
      c('The benefits, risks and ethical implications of management information systems and technological innovation for decision-making and stakeholders', 'AO3', hl=True)]),
  ]},
]

doc = {
  'name': 'IB Diploma Programme Business Management',
  'shortName': 'IB DP Business Management',
  'awardingBody': 'International Baccalaureate Organization',
  'guide': 'Business management guide, first assessment 2024 (published February 2022, updated May 2022)',
  'verification': 'primary',
  'note': ('Every unit, subtopic, content statement, depth of teaching and HL-only marking below was checked against the '
           'Business management guide on 29 October 2026. Content statements are in the platform\'s words; the guide '
           'is the authority. Page numbers are the guide\'s printed page numbers.'),
  'hours': {'toolkit': {'sl': 10, 'hl': 35}, 'paper1Research': {'sl': 5, 'hl': 5}, 'internalAssessment': {'sl': 20, 'hl': 20}, 'total': {'sl': 150, 'hl': 240}},
  'sources': ['ib-bm-guide-2024'],
  'concepts': {'list': ['change', 'creativity', 'ethics', 'sustainability'], 'verification': 'primary',
               'note': 'The guide names four key concepts (pp. 6 and 12 to 13). The internal assessment must use one of them as its lens (p. 53).'},
  'units': units,
}

header = """# IB Diploma Programme Business Management: the syllabus spine.
#
# Generated by scripts/content/build_curriculum.py. Edit that script, not this
# file. Verified against the Business management guide (first assessment 2024,
# updated May 2022) on 29 October 2026; content statements are paraphrased.

"""
out = Path(__file__).resolve().parents[2] / 'src/content/curricula/ib-dp-bm.yaml'
out.write_text(header + yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=200), encoding='utf-8')
n = sum(len(u['subtopics']) for u in units)
hl = sum(1 for u in units for s in u['subtopics'] if s['level'] == 'HL')
mix = sum(1 for u in units for s in u['subtopics'] if s['level'] == MIX)
items = sum(len(s['content']) for u in units for s in u['subtopics'])
print(f'{n} subtopics ({hl} HL only, {mix} with HL-only content), {items} content statements -> {out}')
