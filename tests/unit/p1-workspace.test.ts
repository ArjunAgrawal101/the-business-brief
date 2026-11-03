import { describe, expect, it } from 'vitest';
import {
  PLANS,
  addEvidence,
  assign,
  emptyWorkspace,
  locate,
  paragraphHtml,
  parseWorkspace,
  placeAll,
  planChecks,
  planText,
  quoted,
  removeEvidence,
  sentencesOf,
  slotOf,
  splitCase,
  wordCount,
  type Evidence,
} from '../../src/lib/p1-workspace';
import { ILLUSTRATIVE_CASE } from '../../src/lib/p1-cases';

describe('splitting a case', () => {
  it('splits paragraphs and sentences, keeping offsets that reproduce the text', () => {
    const paras = splitCase('First sentence. Second one costs $2.40 a bottle. Third?\n\nA new paragraph, with "a quote." Then more.');
    expect(paras).toHaveLength(2);
    const p0 = paras[0]!;
    expect(p0.sentences.map((s) => p0.text.slice(s.start, s.end))).toEqual(['First sentence.', 'Second one costs $2.40 a bottle.', 'Third?']);
    const p1 = paras[1]!;
    expect(p1.sentences.map((s) => p1.text.slice(s.start, s.end))).toEqual(['A new paragraph, with "a quote."', 'Then more.']);
    // Sentences joined by single spaces give back the paragraph exactly.
    expect(p0.sentences.map((s) => p0.text.slice(s.start, s.end)).join(' ')).toBe(p0.text);
  });

  it('does not end a sentence at an abbreviation', () => {
    expect(sentencesOf('Ask Dr. Patel first. Then decide.').length).toBe(2);
    expect(sentencesOf('Costs, e.g. fruit, rose. Prices did not.').length).toBe(2);
  });

  it('splits the illustrative case cleanly, at about the length of a Paper 1 case', () => {
    const paras = splitCase(ILLUSTRATIVE_CASE.text);
    expect(paras).toHaveLength(9);
    for (const p of paras) expect(p.sentences.map((s) => p.text.slice(s.start, s.end)).join(' ')).toBe(p.text);
    const n = wordCount(ILLUSTRATIVE_CASE.text);
    expect(n).toBeGreaterThan(550);
    expect(n).toBeLessThan(1000);
    // The facts the Paper 1 page gives about Juniper are all here.
    for (const fact of ['three kiosks', '$4', 'five days', '140 stores', '120 shoppers', '6.2', 'pay for itself within a year']) expect(ILLUSTRATIVE_CASE.text).toContain(fact);
  });
});

const ev = (over: Partial<Evidence>): Evidence => ({ id: 'e1', tag: 'data', text: '$2.40 a bottle', para: 0, start: 0, end: 0, note: '', ...over });

describe('tagging evidence', () => {
  const paras = splitCase('Juniper sells at $4. The chains pay $2.40 a bottle on sale-or-return terms.');
  const p = paras[0]!;
  const start = p.text.indexOf('$2.40 a bottle');

  it('locates evidence at its offsets, or by its words when the text has moved', () => {
    const e = ev({ start, end: start + 14 });
    expect(locate(e, paras)).toEqual({ para: 0, start, end: start + 14 });
    expect(locate({ ...e, start: 2, end: 16 }, paras)).toEqual({ para: 0, start, end: start + 14 });
    expect(locate({ ...e, text: 'not in the case' }, paras)).toBeNull();
  });

  it('marks tagged words and labels them in words, escaping the text', () => {
    const html = paragraphHtml(p, 0, placeAll([ev({ start, end: start + 14 })], paras));
    expect(html).toContain('<mark class="ws-m ws-m--data" data-items="e1">$2.40 a bottle</mark><span class="ws-label ws-label--data">Data</span>');
    expect(html.match(/class="ws-s"/g)).toHaveLength(2);
    const risky = splitCase('Use <b>bold</b> & "quotes".')[0]!;
    expect(paragraphHtml(risky, 0, [])).not.toContain('<b>');
  });

  it('adds, assigns and removes evidence, keeping the plan consistent', () => {
    let s = addEvidence(emptyWorkspace(), { tag: 'data', text: '$2.40 a bottle', para: 0, start, end: start + 14 }, 'e1');
    s = addEvidence(s, { tag: 'data', text: '$2.40 a bottle', para: 0, start, end: start + 14 }, 'e2');
    expect(s.items).toHaveLength(1);
    s = assign(s, 'e1', 'for');
    expect(slotOf(s.plan, 'e1')).toBe('for');
    s = assign(s, 'e1', 'against');
    expect(s.plan.slots.for?.items).toEqual([]);
    expect(slotOf(s.plan, 'e1')).toBe('against');
    s = removeEvidence(s, 'e1');
    expect(s.items).toEqual([]);
    expect(s.plan.slots.against?.items).toEqual([]);
  });
});

describe('the answer plan', () => {
  const items = [ev({ id: 'a', tag: 'data' }), ev({ id: 'b', tag: 'stakeholder', text: 'the kiosk supervisor resigned' }), ev({ id: 'c', tag: 'problem', text: 'sale-or-return terms' })];

  it('says what a Section B plan still needs, never a mark', () => {
    const empty = planChecks({ kind: 'section-b', question: '', slots: {} }, items);
    expect(empty.map((c) => c.text).join(' ')).toContain('limitation of the case');
    expect(empty.some((c) => c.text.includes('argument and the counter-argument'))).toBe(true);
    const full = planChecks(
      {
        kind: 'section-b',
        question: 'Discuss whether Juniper should accept the offer.',
        slots: { for: { note: 'Volume', items: ['a'] }, against: { note: 'Returns', items: ['b', 'c'] }, weigh: { note: 'Risk is certain', items: [] }, limit: { note: 'No sell-through data', items: [] }, judge: { note: 'Trial first', items: [] } },
      },
      items,
    );
    expect(full.filter((c) => c.status === 'advice')).toEqual([]);
  });

  it('flags two Section A points that share evidence', () => {
    const checks = planChecks({ kind: 'section-a', question: 'Explain two disadvantages.', slots: { a1: { note: '', items: ['c'] }, a2: { note: '', items: ['c'] } } }, items);
    expect(checks.some((c) => c.text.includes('share evidence'))).toBe(true);
  });

  it('exports the plan as text, slot by slot, with the evidence not yet used', () => {
    const t = planText({ kind: 'section-b', question: 'Discuss.', slots: { for: { note: 'Higher volume', items: ['a'] } } }, items, 'Juniper Juice');
    const lines = t.split('\n');
    expect(lines[0]).toBe(`Answer plan: ${PLANS['section-b'].label} (${PLANS['section-b'].marks})`);
    expect(t).toContain('ARGUMENT\n  [Data] “$2.40 a bottle”\n  My point: Higher volume');
    expect(t).toContain('EVIDENCE NOT YET IN THE PLAN\n  [Stakeholder] “the kiosk supervisor resigned”');
  });

  it('quotes evidence once, even when the words open with a quotation mark', () => {
    expect(quoted('the chains pay $2.40')).toBe('“the chains pay $2.40”');
    expect(quoted('"In a supermarket fridge we are one bottle among fifty," he said.')).toBe('"In a supermarket fridge we are one bottle among fifty," he said.');
  });

  it('reads saved work defensively', () => {
    expect(parseWorkspace('x')).toEqual(emptyWorkspace());
    const s = parseWorkspace({ source: 'own', own: 'Case', items: [{ id: 'a', tag: 'data', text: 'x', para: 0, start: 0, end: 1 }, { id: 'b', tag: 'colour', text: 'y', para: 0, start: 0, end: 1 }], plan: { kind: 'section-a', slots: { a1: { note: 'n', items: ['a', 'gone'] } } } });
    expect(s.source).toBe('own');
    expect(s.items.map((e) => e.id)).toEqual(['a']);
    expect(s.plan.kind).toBe('section-a');
    expect(s.plan.slots.a1?.items).toEqual(['a']);
  });
});
