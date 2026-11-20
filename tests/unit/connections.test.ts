/**
 * The course connections: the worked connections in
 * src/content/data/topic-connections.yaml and the curated tool links in
 * subtopic-tools.yaml pass every check, the checks catch what they exist
 * for, the calculation answers rework with the platform's own functions,
 * and the map's geometry keeps every node and label inside the drawing.
 */
import { describe, expect, it } from 'vitest';
import { loadCorpus } from './helpers/corpus';
import { loadConnections, loadSubtopicTools, loadToolPages, subtopicsOf } from './helpers/connections';
import {
  checkConnections,
  codeOrder,
  connectionLevel,
  connectionsHref,
  connectionsInOrder,
  connectionsOf,
  layoutMap,
  noteLinksOf,
  notePairs,
  pairKey,
  type NoteLink,
} from '../../src/lib/connections';
import type { TopicConnection } from '../../src/lib/connections-schema';
import { breakEvenUnits } from '../../src/lib/finance';
import { gearingRatio } from '../../src/lib/ratios';

const c = loadCorpus();
const subs = subtopicsOf(c);
const conns = loadConnections();
const extra = loadSubtopicTools();
const pages = loadToolPages(c);
const terms = Object.fromEntries(Object.entries(c.commandTerms).map(([id, t]) => [id, { term: t.term, ao: t.ao }]));
const byCode = new Map(subs.map((s) => [s.code, s]));

const sample = (over: Partial<TopicConnection> = {}): TopicConnection => ({
  id: 'sample',
  between: ['3.5', '4.5'],
  featured: false,
  title: 'A sample connection',
  explanation: 'x'.repeat(220),
  question: { command: 'explain', marks: 4, prompt: 'Explain the link between these two subtopics.' },
  level: 'SL/HL',
  ...over,
});

describe('the worked connections', () => {
  it('pass every check, with the curated tool links', () => {
    expect(checkConnections(conns, subs, terms, { pages, extra }).map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });

  it('number at least forty, each with a paragraph and an exam-style question', () => {
    expect(Object.keys(conns).length).toBeGreaterThanOrEqual(40);
    for (const [id, x] of Object.entries(conns)) {
      expect(x.explanation.split(/\s+/).length, id).toBeGreaterThanOrEqual(50);
      expect(x.question.prompt.length, id).toBeGreaterThan(20);
      expect(terms[x.question.command], id).toBeDefined();
    }
  });

  it('name only subtopics that exist, two different ones each time', () => {
    for (const [id, x] of Object.entries(conns)) {
      expect(byCode.has(x.between[0]), `${id}: ${x.between[0]}`).toBe(true);
      expect(byCode.has(x.between[1]), `${id}: ${x.between[1]}`).toBe(true);
      expect(x.between[0], id).not.toBe(x.between[1]);
    }
  });

  it('join no pair twice, whichever way round', () => {
    const keys = Object.values(conns).map((x) => pairKey(x.between[0], x.between[1]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reach every one of the 37 subtopics, across all five units', () => {
    expect(subs).toHaveLength(37);
    const joined = new Set(Object.values(conns).flatMap((x) => x.between));
    expect(subs.filter((s) => !joined.has(s.code)).map((s) => s.code)).toEqual([]);
    const across = Object.values(conns).filter((x) => x.between[0].split('.')[0] !== x.between[1].split('.')[0]);
    expect(across.length).toBeGreaterThan(Object.keys(conns).length / 2);
  });

  it('include the five connections the platform leads with', () => {
    const featured = Object.values(conns).filter((x) => x.featured);
    const pairs = new Set(featured.map((x) => pairKey(x.between[0], x.between[1])));
    expect(pairs).toEqual(new Set([pairKey('4.5', '3.5'), pairKey('2.4', '5.6'), pairKey('5.1', '5.3'), pairKey('1.5', '3.2'), pairKey('1.3', '1.4')]));
    expect(featured.map((x) => x.title).sort()).toEqual(
      ['Business growth and sources of finance', 'HR decisions and productivity', 'Marketing decisions and financial performance', 'Operations and quality management', 'Sustainability and stakeholder interests'].sort(),
    );
  });

  it('are HL whenever an end is HL only', () => {
    for (const x of Object.values(conns)) {
      const hl = x.between.some((code) => byCode.get(code)?.level === 'HL');
      if (hl) expect(connectionLevel(x, byCode), x.id).toBe('HL');
    }
    expect(connectionLevel(sample({ between: ['5.6', '2.4'] }), byCode)).toBe('HL');
    expect(connectionLevel(sample({ between: ['3.5', '4.5'] }), byCode)).toBe('SL/HL');
    expect(connectionLevel(sample({ between: ['3.5', '4.5'], level: 'HL' }), byCode)).toBe('HL');
  });

  it('give calculation answers that the platform’s own functions rework', () => {
    const calc = Object.values(conns).filter((x) => terms[x.question.command]?.ao === 'AO4');
    expect(calc.length).toBeGreaterThanOrEqual(3);
    expect(breakEvenUnits(6000, 4, 1.5)).toBe(2400);
    expect(conns['costs-and-break-even']?.question.answer).toContain('2,400 cups');
    expect(breakEvenUnits(6300, 3, 1.2)).toBe(3500);
    expect(breakEvenUnits(6300, 3.3, 1.2)).toBe(3000);
    expect(conns['price-changes-and-break-even']?.question.answer).toContain('500 loaves');
    expect(gearingRatio(2.4, 5.6)).toBeCloseTo(30, 10);
    expect(conns['finance-choice-and-gearing']?.question.answer).toContain('30%');
  });

  it('use no dashes, and British spelling with the IB’s -ize', () => {
    for (const x of Object.values(conns)) {
      const text = `${x.title} ${x.explanation} ${x.question.prompt} ${x.question.answer ?? ''}`;
      expect(text, x.id).not.toMatch(/[–—]/);
      expect(text, x.id).not.toMatch(/\borganis(e|ation)/i);
    }
  });
});

describe('the checks', () => {
  const run = (extraConns: Record<string, TopicConnection>) => checkConnections({ ...conns, ...extraConns }, subs, terms).map((p) => p.message);

  it('catch a code that does not exist, and a subtopic joined to itself', () => {
    expect(run({ a: sample({ id: 'a', between: ['3.5', '6.1'] }) })).toContain('subtopic 6.1 is not in the curriculum');
    expect(run({ a: sample({ id: 'a', between: ['3.5', '3.5'] }) })).toContain('joins 3.5 to itself');
  });

  it('catch a pair joined twice, even the other way round', () => {
    expect(run({ a: sample({ id: 'a', between: ['3.5', '4.5'] }) }).some((m) => m.startsWith('joins the same pair as'))).toBe(true);
  });

  it('catch a command term not in the register, and one that asks for too much', () => {
    expect(run({ a: sample({ id: 'a', between: ['3.1', '5.9'], question: { command: 'opine', marks: 4, prompt: 'Opine about the two subtopics here.' } }) })).toContain('command term "opine" is not in the register');
    // 3.1 and 1.1 go no deeper than AO2, so "Evaluate" (AO3) asks for more than they allow.
    expect(run({ a: sample({ id: 'a', between: ['3.1', '1.1'], question: { command: 'evaluate', marks: 10, prompt: 'Evaluate the role of finance in a new business.' } }) }).some((m) => m.includes('asks for more than'))).toBe(true);
    // Neither 1.4 nor 2.6 has an AO4 statement, so neither can be calculated.
    expect(run({ a: sample({ id: 'a', between: ['1.4', '2.6'], question: { command: 'calculate', marks: 2, prompt: 'Calculate something about stakeholders.', answer: '1' } }) }).some((m) => m.includes('AO4 command term'))).toBe(true);
    expect(run({ a: sample({ id: 'a', between: ['3.3', '1.1'], question: { command: 'calculate', marks: 2, prompt: 'Calculate the total cost of the business.' } }) })).toContain('a calculation needs its worked answer');
  });

  it('catch a subtopic left out of every connection', () => {
    const without = Object.fromEntries(Object.entries(conns).filter(([, x]) => !x.between.includes('2.6')));
    expect(checkConnections(without, subs, terms).map((p) => p.message)).toContain('2.6 Communication takes part in no worked connection');
  });

  it('catch a curated tool that is not a tool page, or that already names the subtopic', () => {
    const bad = { '2.6': { id: '2.6', tools: [{ href: '/no-such-tool/', use: 'A tool that is not on the platform at all.' }] }, '1.4': { id: '1.4', tools: [{ href: '/strategy-studio/stakeholder-map/', use: 'The stakeholder map already names 1.4 itself.' }] } };
    const messages = checkConnections(conns, subs, terms, { pages, extra: bad }).map((p) => p.message);
    expect(messages).toContain('/no-such-tool/ is not a tool page on the platform');
    expect(messages).toContain('/strategy-studio/stakeholder-map/ already names 1.4 itself, so it needs no entry here');
  });
});

describe('a subtopic’s connections', () => {
  it('lists the worked connections from either end, in course order of the other end', () => {
    const of35 = connectionsOf('3.5', conns);
    expect(of35.map((x) => x.other)).toEqual([...of35.map((x) => x.other)].sort((a, b) => codeOrder(a) - codeOrder(b)));
    expect(of35.map((x) => x.id)).toContain('marketing-and-financial-performance');
    expect(of35.find((x) => x.id === 'marketing-and-financial-performance')?.other).toBe('4.5');
    for (const s of subs) expect(connectionsOf(s.code, conns).length, s.code).toBeGreaterThan(0);
  });

  it('puts the five featured connections first in the full list', () => {
    expect(connectionsInOrder(conns).slice(0, 5).every(([, x]) => x.featured)).toBe(true);
  });

  it('joins the notes’ links into pairs, keeping each side’s reason and dropping links to nowhere', () => {
    const links: NoteLink[] = [
      { from: '3.5', to: '3.7', text: 'Liquidity ratios measure the cash position.' },
      { from: '3.7', to: '3.5', text: 'The current ratio summarizes working capital.' },
      { from: '3.5', to: '9.9', text: 'Nowhere.' },
      { from: '3.5', to: '3.5', text: 'Itself.' },
      { from: '2.6', to: '2.2', text: 'Structure sets the channels.' },
    ];
    const pairs = notePairs(links, new Set(subs.map((s) => s.code)));
    expect([...pairs.keys()].sort()).toEqual(['2.2|2.6', '3.5|3.7']);
    expect(pairs.get('3.5|3.7')?.reasons).toHaveLength(2);
    // A pair a worked connection covers is not repeated among the notes' links; its own side's reason is preferred.
    expect(noteLinksOf('3.7', pairs, {})).toEqual([{ other: '3.5', text: 'The current ratio summarizes working capital.' }]);
    expect(noteLinksOf('3.7', pairs, { x: sample({ between: ['3.7', '3.5'] }) })).toEqual([]);
    expect(noteLinksOf('2.2', pairs, {})).toEqual([{ other: '2.6', text: 'Structure sets the channels.' }]);
  });

  it('addresses each subtopic on the map by its code', () => {
    expect(connectionsHref('3.5')).toBe('/ib/connections/#t-3-5');
  });
});

describe('the map', () => {
  const units = (c.curricula['ib-dp-bm']?.units ?? []).map((u) => ({ number: u.number, title: u.title, subtopics: u.subtopics.map((s) => ({ code: s.code, title: s.title, hl: s.level === 'HL' })) }));
  const edges = Object.entries(conns).map(([id, x]) => ({ id, a: x.between[0], b: x.between[1], kind: 'worked' as const }));
  const lay = layoutMap(units, edges);

  it('places all 37 subtopics on the ring, unit by unit, clockwise from the top', () => {
    expect(lay.nodes).toHaveLength(37);
    expect(lay.nodes.map((n) => n.code)).toEqual(subs.map((s) => s.code));
    for (let i = 1; i < lay.nodes.length; i += 1) expect(lay.nodes[i]!.angle).toBeGreaterThan(lay.nodes[i - 1]!.angle);
    for (const n of lay.nodes) expect(Math.hypot(n.x - lay.cx, n.y - lay.cy)).toBeCloseTo(lay.radius, 0);
    expect(lay.units.map((u) => u.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('leaves room for every label beside its neighbours, inside the drawing', () => {
    const slots = [...lay.nodes].sort((a, b) => a.angle - b.angle);
    const labelRadius = lay.radius + lay.nodeRadius + 12;
    for (let i = 1; i < slots.length; i += 1) {
      const gap = (slots[i]!.angle - slots[i - 1]!.angle) * labelRadius;
      const tallest = Math.max(slots[i]!.lines.length, slots[i - 1]!.lines.length) * lay.lineHeight;
      expect(gap, `${slots[i - 1]!.code} and ${slots[i]!.code}`).toBeGreaterThanOrEqual(tallest);
    }
    const charW = lay.fontSize * 0.56;
    for (const n of lay.nodes) {
      const reach = lay.radius + lay.nodeRadius + 12 + Math.max(...n.lines.map((l) => l.length)) * charW;
      expect(reach, n.code).toBeLessThanOrEqual(lay.size / 2);
      expect(n.lines.length, n.code).toBeLessThanOrEqual(3);
    }
    // HL-only subtopics say so in their label, not by colour alone.
    expect(lay.nodes.find((n) => n.code === '5.9')?.lines.join(' ')).toContain('(HL)');
    expect(lay.nodes.find((n) => n.code === '3.5')?.lines.join(' ')).not.toContain('(HL)');
  });

  it('turns labels on the left half so they read left to right', () => {
    for (const n of lay.nodes) {
      expect(n.anchor).toBe(n.angle > Math.PI ? 'end' : 'start');
      expect(Math.abs(n.rotate)).toBeLessThanOrEqual(90);
    }
  });

  it('draws one curve per connection, skipping any with an unknown end', () => {
    expect(lay.edges).toHaveLength(edges.length);
    expect(layoutMap(units, [...edges, { id: 'ghost', a: '3.5', b: '6.1', kind: 'notes' }]).edges).toHaveLength(edges.length);
    for (const e of lay.edges) expect(e.d).toMatch(/^M [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
  });

  it('keeps type at a size that reads at 12 pixels when the drawing is shown at its narrowest, 54rem (864 pixels)', () => {
    expect(lay.fontSize * (864 / lay.size)).toBeGreaterThanOrEqual(12);
  });
});
