/**
 * Connected learning: the tool index finds every tool page's subtopics from
 * the tools' own data, every tool page that serves a subtopic can link back
 * to it, every subtopic has tools (the sixteen notes pages that had none
 * included), and the groups a subtopic page shows are complete, in order and
 * labelled by their standing. Also the question bank's address for one
 * subtopic.
 */
import { describe, expect, it } from 'vitest';
import { loadCorpus, asCorpus } from './helpers/corpus';
import { loadConnections, loadSubtopicTools, loadToolPages, subtopicsOf, toolSources } from './helpers/connections';
import { connectedLearning, countsFor, flashcardsHref, pagePath, readableDate, revisionSheetHref, toolPages, toolTags, toolsByRoom, toolsFor, topicsForPage, type ConnectedInputs, ROOM_ORDER } from '../../src/lib/connected';
import { bankTopicHref, topicFromSearch, withTopic } from '../../src/lib/bank-address';
import { buildBank } from '../../src/lib/bank-build';
import { LAB } from '../../src/lib/finance-lab/catalogue';
import { FINANCE_DESK_PAGES } from '../../src/lib/framework-lab';

const c = loadCorpus();
const subs = subtopicsOf(c);
const pages = loadToolPages(c);
const extra = loadSubtopicTools();
const conns = loadConnections();
const bank = buildBank(asCorpus(c)).items.map((i) => ({ codes: i.codes }));

/** The sixteen notes pages the content audit found with no tools section. */
const WITHOUT_TOOLS = ['1.1', '1.3', '1.4', '1.6', '2.5', '2.6', '2.7', '3.1', '3.2', '4.3', '4.6', '5.1', '5.3', '5.7', '5.8', '5.9'];

const inputs = (over: Partial<ConnectedInputs> = {}): ConnectedInputs => ({
  subtopics: subs.map((s) => ({ code: s.code, title: s.title, slug: s.slug })),
  tools: pages,
  extraTools: extra,
  frameworks: [
    { id: 'swot-analysis', name: 'SWOT analysis', status: 'toolkit', subtopics: ['1.3', '4.2'] },
    { id: 'smart-objectives', name: 'SMART objectives', status: 'enrichment', subtopics: ['1.3'] },
    { id: 'contribution', name: 'Contribution', status: 'toolkit', subtopics: ['5.5'], level: 'HL' },
  ],
  bank,
  cases: [{ id: 'halden-distribution', title: 'Halden Distribution', syllabus: ['2.3', '3.5'], fictional: true }],
  caseLabs: [{ href: '/case-room/halden-diagnosis/', title: 'Halden Distribution: diagnose before you decide', syllabus: ['2.3'] }],
  decisions: [{ id: 'halden-leadership', title: 'Halden Distribution: how to lead', codes: ['2.3'] }],
  simulations: [{ href: '/boardroom/kestle-cycles/', title: 'Kestle Cycles', codes: ['3.7', '3.5'] }],
  briefings: [{ id: 'b', number: 2, title: 'Quarrystone Climbing is offered its closest rival', codes: ['1.5', '3.5'], fictional: true }],
  intelligence: [
    { id: 'old', title: 'An earlier development', date: '2025-02-28', codes: ['3.5'] },
    { id: 'new', title: 'A later development', date: '2026-10', codes: ['3.5'] },
  ],
  advanced: [{ href: '/advanced/finance/valuation/', title: 'Valuation', domain: 'Advanced finance', codes: ['3.5', '3.8'] }],
  mindmaps: { '3.5': 'profitability-and-liquidity-ratio-analysis' },
  connections: conns,
  revision: { sheet: (_code, slug) => slug === 'costs-and-revenues', flashcards: () => false },
  ...over,
});

describe('the tool index', () => {
  it('finds the subtopics of every Finance Desk workspace from the interactions and calculations on it', () => {
    expect(topicsForPage('/finance-desk/break-even/', pages)).toEqual(['5.5']);
    expect(topicsForPage('/finance-desk/ratios/', pages)).toEqual(['3.5', '3.6']);
    expect(topicsForPage('/finance-desk/cash-flow/', pages)).toEqual(['3.7']);
    expect(topicsForPage('/finance-desk/investment-appraisal/', pages)).toEqual(['3.8']);
    expect(topicsForPage('/finance-desk/contribution/', pages)).toEqual(['5.5']);
    expect(topicsForPage('/finance-desk/costs-and-revenue/', pages)[0]).toBe('3.3');
    for (const p of FINANCE_DESK_PAGES) expect(topicsForPage(p.href, pages).length, p.href).toBeGreaterThan(0);
  });

  it('gives every Financial Laboratory calculator its subtopic', () => {
    for (const e of LAB) expect(topicsForPage(`/finance-desk/lab/${e.id}/`, pages), e.id).toEqual([e.subtopic]);
  });

  it('reads the Studio, the Market Studio, People and Culture, the Operations Floor and the Lab from their own data', () => {
    expect(topicsForPage('/strategy-studio/stakeholder-map/', pages)).toEqual(['1.4']);
    expect(pages.get('/strategy-studio/stakeholder-map/')?.standing).toBe('enrichment');
    expect(pages.get('/strategy-studio/swot/')?.standing).toBe('toolkit');
    expect(topicsForPage('/strategy-studio/five-forces/', pages)).toEqual([]);
    expect(topicsForPage('/market-studio/market-metrics/', pages)).toEqual(['4.1']);
    expect(topicsForPage('/people-and-culture/motivation-analysis/', pages)).toEqual(['2.4']);
    expect(topicsForPage('/operations-floor/stock-control/', pages)).toEqual(['5.6']);
    expect(pages.get('/operations-floor/economic-order-quantity/')?.standing).toBe('enrichment');
    expect(topicsForPage('/entrepreneurship-lab/start-up-costs/', pages)).toEqual(['1.1', '3.2', '3.3', '3.7']);
    expect(topicsForPage('/case-room/halden-diagnosis/', pages)).toEqual(['2.3']);
    expect(pages.get('/finance-desk/advanced/capital-budgeting/')?.codes).toEqual(['3.8']);
    expect(pages.get('/finance-desk/advanced/capital-budgeting/')?.standing).toBe('enrichment');
  });

  it('matches a page whatever its fragment, query or missing slash', () => {
    expect(pagePath('/finance-desk/ratios/#calc-roce')).toBe('/finance-desk/ratios/');
    expect(pagePath('/finance-desk/ratios')).toBe('/finance-desk/ratios/');
    expect(topicsForPage('/finance-desk/ratios/?x=1', pages)).toEqual(['3.5', '3.6']);
    expect(topicsForPage('/topics/', pages)).toEqual([]);
  });

  it('ignores interactions on pages that are not tool pages, such as the briefs', () => {
    const own = toolPages({ ...toolSources(c), interactives: { a: { page: '/topics/growth-and-evolution/', syllabus: ['1.5'] } }, calculations: {}, lab: [], studio: [], labTools: [], advanced: [] });
    expect(own.has('/topics/growth-and-evolution/')).toBe(false);
  });
});

describe('the tools for a subtopic', () => {
  it('include at least one existing tool for every subtopic, the sixteen that had none included', () => {
    for (const s of subs) expect(toolsFor(s.code, pages, extra).length, s.code).toBeGreaterThan(0);
    for (const code of WITHOUT_TOOLS) expect(toolsFor(code, pages, extra).length, code).toBeGreaterThan(0);
  });

  it('come once each, by room in a fixed order, the tools that serve the subtopic before the rest', () => {
    const t = toolsFor('3.5', pages, extra);
    expect(new Set(t.map((x) => x.href)).size).toBe(t.length);
    const rooms = t.map((x) => ROOM_ORDER.indexOf(x.room));
    expect(rooms).toEqual([...rooms].sort((a, b) => a - b));
    expect(t.map((x) => x.href)).toContain('/finance-desk/ratios/');
    expect(t.map((x) => x.href)).toContain('/finance-desk/lab/roce/');
    expect(toolsByRoom(t)[0]?.room).toBe('Finance Desk');
  });

  it('carry the curated use where the tool does not name the subtopic itself', () => {
    const t = toolsFor('2.6', pages, extra);
    const chart = t.find((x) => x.href === '/people-and-culture/organization-chart/');
    expect(chart?.via).toBe('curated');
    expect(chart?.use).toMatch(/chains of command/);
    expect(toolsFor('1.4', pages, extra).find((x) => x.href === '/strategy-studio/stakeholder-map/')?.via).toBe('serves');
  });

  it('label tools by standing and level, never as IB content when they are enrichment', () => {
    expect(toolTags({ standing: 'enrichment', level: 'SL/HL' }).map((x) => x.text)).toEqual(['Enrichment']);
    expect(toolTags({ standing: 'toolkit', level: 'HL' }).map((x) => x.text)).toEqual(['IB toolkit', 'HL']);
    expect(toolTags({ standing: 'ib', level: 'SL/HL' })).toEqual([]);
  });
});

describe('connected learning', () => {
  const groups = connectedLearning('3.5', inputs(), { toolsAnchor: 'tools' });
  const group = (id: string) => groups.find((g) => g.id === id);

  it('shows the groups in a fixed order, and only those with something in them', () => {
    expect(groups.map((g) => g.id)).toEqual(['revise', 'bank', 'cases', 'decisions', 'tools', 'briefings', 'intelligence', 'advanced', 'connections']);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it('links the question bank filtered to the subtopic, counting the whole bank', () => {
    const n = bank.filter((q) => q.codes.includes('3.5')).length;
    expect(n).toBeGreaterThan(5);
    expect(group('bank')?.items[0]).toMatchObject({ href: '/assessment/question-bank/?topic=3.5', title: `${n} questions on 3.5 in the question bank` });
  });

  it('labels cases fictional, intelligence real-world with its date, and Advanced Management enrichment', () => {
    expect(group('cases')?.items.map((i) => i.tags.map((t) => t.text))).toEqual([['Fictional']]);
    expect(group('intelligence')?.items.map((i) => i.title)).toEqual(['A later development', 'An earlier development']);
    expect(group('intelligence')?.items.every((i) => i.tags.some((t) => t.text === 'Real-world' && t.css === 'tag--external'))).toBe(true);
    expect(group('intelligence')?.items[1]?.note).toContain('28 February 2025');
    expect(group('advanced')?.items[0]?.tags).toEqual([{ text: 'Enrichment', css: 'tag--enrichment' }]);
    expect(group('advanced')?.items[0]?.note).toContain('beyond the IB course');
  });

  it('points to the page’s own tools section, or lists the tools where the page has none', () => {
    expect(group('tools')?.items).toHaveLength(1);
    expect(group('tools')?.items[0]?.href).toBe('#tools');
    expect(group('tools')?.items[0]?.title).toBe(`${toolsFor('3.5', pages, extra).length} tools for 3.5`);
    const listed = connectedLearning('3.5', inputs(), { withTools: true }).find((g) => g.id === 'tools');
    expect(listed?.items.map((i) => i.href)).toEqual(toolsFor('3.5', pages, extra).map((t) => t.href));
  });

  it('links the mindmap, and the revision sheet and flashcards only where they exist', () => {
    expect(group('revise')?.items.map((i) => i.href)).toEqual(['/mindmaps/profitability-and-liquidity-ratio-analysis/']);
    const brief = connectedLearning('3.3', inputs()).find((g) => g.id === 'revise');
    expect(brief?.items.map((i) => i.href)).toEqual(['/revision/costs-and-revenues/']);
    const all = connectedLearning('3.5', inputs({ revision: { sheet: () => true, flashcards: () => true } })).find((g) => g.id === 'revise');
    expect(all?.items.map((i) => i.href)).toEqual(['/mindmaps/profitability-and-liquidity-ratio-analysis/', '/revision/profitability-and-liquidity-ratio-analysis/', '/revision/flashcards/?topic=3.5']);
    expect(revisionSheetHref('budgets')).toBe('/revision/budgets/');
    expect(flashcardsHref('3.9')).toBe('/revision/flashcards/?topic=3.9');
  });

  it('links the subtopic’s place on the connections map with its number of worked connections', () => {
    const n = Object.values(conns).filter((x) => x.between.includes('3.5')).length;
    expect(group('connections')?.items[0]).toMatchObject({ href: '/ib/connections/#t-3-5', title: `${n} worked connections on the connections map` });
  });

  it('files frameworks by standing: the syllabus first, then the toolkit, then enrichment', () => {
    const fw = connectedLearning('1.3', inputs()).find((g) => g.id === 'frameworks');
    expect(fw?.items.map((i) => [i.title, i.tags.map((t) => t.text).join(' ')])).toEqual([
      ['SWOT analysis', 'IB toolkit'],
      ['SMART objectives', 'Enrichment'],
    ]);
    expect(connectedLearning('5.5', inputs()).find((g) => g.id === 'frameworks')?.items[0]?.tags.map((t) => t.text)).toEqual(['IB toolkit', 'HL']);
  });

  it('is empty for a code that is not in the course', () => {
    expect(connectedLearning('6.1', inputs())).toEqual([]);
  });

  it('counts tools, cases, briefings and questions for the topic library', () => {
    const n = countsFor('2.3', inputs());
    expect(n.cases).toBe(2);
    expect(n.tools).toBe(toolsFor('2.3', pages, extra).length);
    expect(n.questions).toBe(bank.filter((q) => q.codes.includes('2.3')).length);
    expect(countsFor('1.5', inputs()).briefings).toBe(1);
  });

  it('writes dates as a reader expects', () => {
    expect(readableDate('2026-10-14')).toBe('14 October 2026');
    expect(readableDate('2026-10')).toBe('October 2026');
  });
});

describe('the question bank’s address', () => {
  it('reads a subtopic from ?topic= or ?code=, and nothing else', () => {
    expect(bankTopicHref('3.5')).toBe('/assessment/question-bank/?topic=3.5');
    expect(topicFromSearch('?topic=3.5')).toBe('3.5');
    expect(topicFromSearch('?code=4.2')).toBe('4.2');
    expect(topicFromSearch('?topic=9.9')).toBeNull();
    expect(topicFromSearch('?topic=3.5x')).toBeNull();
    expect(topicFromSearch('?topic=<script>')).toBeNull();
    expect(topicFromSearch('')).toBeNull();
  });

  it('sets or removes the subtopic and keeps the rest of the address', () => {
    expect(withTopic('https://x.test/assessment/question-bank/?a=1#top', '2.4')).toBe('https://x.test/assessment/question-bank/?a=1&topic=2.4#top');
    expect(withTopic('https://x.test/assessment/question-bank/?topic=2.4', '')).toBe('https://x.test/assessment/question-bank/');
    expect(withTopic('https://x.test/assessment/question-bank/?code=2.4', '3.1')).toBe('https://x.test/assessment/question-bank/?topic=3.1');
  });
});
