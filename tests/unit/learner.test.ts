import { describe, expect, it } from 'vitest';
import {
  LIMITS,
  buildExport,
  capLog,
  checkTally,
  cleanTitle,
  emptyLog,
  emptySaved,
  kindOfPath,
  mergeLogs,
  mergeSaved,
  pagePath,
  parseLog,
  parseSaved,
  pickSignature,
  planImport,
  recordVisit,
  removeSaved,
  safePath,
  toggleSaved,
  toolPrefixes,
  updateChecks,
  validateImport,
  type LearnerLog,
} from '../../src/lib/learner';
import { NAV } from '../../src/lib/navigation';

const T0 = new Date('2026-11-03T09:00:00.000Z');
const later = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const visit = (url: string, last: string, extra: Partial<LearnerLog['visits'][number]> = {}) => ({ kind: 'topic', url, title: url, first: last, last, count: 1, ...extra });

describe('the visit record: parsing', () => {
  it('turns anything unusable into an empty record, without throwing', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', '42', JSON.stringify({ visits: 'many' }), { visits: [null, 3, 'x'] }]) {
      expect(parseLog(raw)).toEqual(emptyLog());
    }
  });

  it('keeps only well-formed visits to pages on this site', () => {
    const log = parseLog({
      visits: [
        visit('/topics/stakeholders/', '2026-11-02T10:00:00.000Z'),
        visit('javascript:alert(1)', '2026-11-02T10:00:00.000Z'),
        visit('//evil.example/x/', '2026-11-02T10:00:00.000Z'),
        visit('https://evil.example/', '2026-11-02T10:00:00.000Z'),
        visit('/topics/x"onmouseover="y/', '2026-11-02T10:00:00.000Z'),
        { ...visit('/mindmaps/m/', '2026-11-02T10:00:00.000Z'), kind: 'diary' },
        { ...visit('/cases/c/', 'yesterday'), first: 'yesterday' },
      ],
    });
    expect(log.visits.map((v) => v.url)).toEqual(['/topics/stakeholders/']);
  });

  it('keeps one entry per page, the latest, newest first, and drops a query or fragment', () => {
    const log = parseLog({
      visits: [
        visit('/topics/a/', '2026-11-01T10:00:00.000Z', { count: 2 }),
        visit('/topics/b/?x=1#s', '2026-11-02T10:00:00.000Z'),
        visit('/topics/a/', '2026-11-03T08:00:00.000Z', { count: 5 }),
      ],
    });
    expect(log.visits.map((v) => [v.url, v.count])).toEqual([
      ['/topics/a/', 5],
      ['/topics/b/', 1],
    ]);
  });

  it('cleans titles and counts', () => {
    const log = parseLog({ visits: [visit('/topics/a/', '2026-11-01T10:00:00.000Z', { title: `  Costs\u0007 and\n revenues ${'x'.repeat(300)}`, count: -4 })] });
    const v = log.visits[0]!;
    expect(v.title.startsWith('Costs and revenues x')).toBe(true);
    expect(v.title.length).toBe(LIMITS.title);
    expect(v.count).toBe(1);
  });

  it('reads its own output back unchanged', () => {
    let log = emptyLog();
    log = recordVisit(log, { kind: 'case', url: '/cases/atelier-barro/', title: 'Atelier Barro' }, T0);
    log = updateChecks(log, { uid: 'ix-q', total: 3, results: { a: 'right' }, picks: { 'a:x': '1' }, url: '/t/#ix-q', title: 'Quiz' }, T0);
    expect(parseLog(JSON.stringify(log))).toEqual(log);
  });
});

describe('the visit record: capping', () => {
  const small = { ...LIMITS, visits: 3, checks: 2, checkItems: 2 };

  it('keeps the most recent pages when there are too many', () => {
    let log = emptyLog();
    for (let i = 0; i < 5; i++) log = recordVisit(log, { kind: 'topic', url: `/topics/t${i}/`, title: `T${i}` }, later(i * 60), small);
    expect(log.visits.map((v) => v.url)).toEqual(['/topics/t4/', '/topics/t3/', '/topics/t2/']);
  });

  it('keeps the most recent exercises, and a limited number of items each', () => {
    let log = emptyLog();
    for (let i = 0; i < 3; i++) {
      const results = { a: 'right', b: 'wrong', c: 'partial' };
      log = updateChecks(log, { uid: `ix-${i}`, total: 3, results, picks: { 'a:g': '1', 'b:g': '2', 'c:g': '3' }, url: '/p/', title: 'Q' }, later(i), small);
    }
    expect(Object.keys(log.checks).sort()).toEqual(['ix-1', 'ix-2']);
    expect(Object.keys(log.checks['ix-2']!.items)).toHaveLength(2);
  });

  it('stays under its size limit by dropping the oldest visits first', () => {
    const tiny = { ...LIMITS, bytes: 2_000 };
    let log = emptyLog();
    for (let i = 0; i < 60; i++) log = recordVisit(log, { kind: 'topic', url: `/topics/page-number-${i}/`, title: `A fairly long page title number ${i}` }, later(i), tiny);
    expect(JSON.stringify(log).length).toBeLessThanOrEqual(2_000);
    expect(log.visits[0]!.url).toBe('/topics/page-number-59/');
    expect(log.visits.some((v) => v.url === '/topics/page-number-0/')).toBe(false);
  });

  it('never exceeds the default limits', () => {
    let log = emptyLog();
    for (let i = 0; i < LIMITS.visits + 50; i++) log = recordVisit(log, { kind: 'mindmap', url: `/mindmaps/m${i}/`, title: `Map ${i}` }, later(i));
    expect(log.visits.length).toBeLessThanOrEqual(LIMITS.visits);
    expect(JSON.stringify(log).length).toBeLessThanOrEqual(LIMITS.bytes);
    expect(capLog(log)).toEqual(log);
  });
});

describe('recording a visit', () => {
  it('adds a page, and counts a return only after half an hour', () => {
    let log = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/stakeholders/', title: '1.4 Stakeholders | The Business Brief' }, T0);
    expect(log.visits[0]).toMatchObject({ url: '/topics/stakeholders/', count: 1, first: T0.toISOString(), last: T0.toISOString() });
    log = recordVisit(log, { kind: 'topic', url: '/topics/stakeholders/', title: '1.4 Stakeholders' }, later(10));
    expect(log.visits[0]).toMatchObject({ count: 1, last: later(10).toISOString(), first: T0.toISOString() });
    log = recordVisit(log, { kind: 'topic', url: '/topics/stakeholders/', title: '1.4 Stakeholders' }, later(45));
    expect(log.visits[0]!.count).toBe(2);
  });

  it('moves a page opened again to the front', () => {
    let log = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/a/', title: 'A' }, T0);
    log = recordVisit(log, { kind: 'case', url: '/cases/b/', title: 'B' }, later(1));
    log = recordVisit(log, { kind: 'topic', url: '/topics/a/', title: 'A' }, later(2));
    expect(log.visits.map((v) => v.url)).toEqual(['/topics/a/', '/cases/b/']);
  });

  it('notes nothing while paused, or for an address that is not a page here', () => {
    const paused = { ...emptyLog(), paused: true };
    expect(recordVisit(paused, { kind: 'topic', url: '/topics/a/', title: 'A' }, T0)).toBe(paused);
    const log = emptyLog();
    expect(recordVisit(log, { kind: 'topic', url: 'https://example.com/', title: 'X' }, T0)).toBe(log);
  });
});

describe('the kind of a page', () => {
  const tools = toolPrefixes(NAV);

  it('reads topic, mindmap, case and framework pages from their address', () => {
    expect(kindOfPath('/topics/stakeholders/', tools)).toBe('topic');
    expect(kindOfPath('/topics/costs-and-revenues/#ix-x', tools)).toBe('topic');
    expect(kindOfPath('/mindmaps/unit-1/', tools)).toBe('mindmap');
    expect(kindOfPath('/cases/atelier-barro/', tools)).toBe('case');
    expect(kindOfPath('/toolkit/swot-analysis/', tools)).toBe('framework');
    expect(kindOfPath('/frameworks/value-chain/', tools)).toBe('framework');
  });

  it('treats the rooms in the navigation, the Case Room, the Decision Rooms and the IA planner as tools', () => {
    expect(tools).toContain('/finance-desk/');
    expect(kindOfPath('/finance-desk/break-even/', tools)).toBe('tool');
    expect(kindOfPath('/market-studio/', tools)).toBe('tool');
    expect(kindOfPath('/case-room/halden-diagnosis/', tools)).toBe('tool');
    expect(kindOfPath('/decision-room/marigold-growth/', tools)).toBe('tool');
    expect(kindOfPath('/boardroom/kestle-cycles/', tools)).toBe('tool');
    expect(kindOfPath('/strategy-studio/swot/', tools)).toBe('tool');
    expect(kindOfPath('/entrepreneurship-lab/unit-economics/', tools)).toBe('tool');
    expect(kindOfPath('/ia-studio/', tools)).toBe('tool');
  });

  it('does not record the libraries, the dashboard or other pages', () => {
    for (const p of ['/', '/topics/', '/mindmaps/', '/cases/', '/toolkit/', '/glossary/gearing/', '/dashboard/', '/search/', '/topics/a/b/']) expect(kindOfPath(p, tools)).toBeNull();
  });

  it('cleans a document title for the list', () => {
    expect(cleanTitle('Costs and revenues | The Business Brief')).toBe('Costs and revenues');
    expect(cleanTitle('Break-even analysis: mindmap | The Business Brief')).toBe('Break-even analysis');
    expect(cleanTitle('Atelier Barro: case file | The Business Brief')).toBe('Atelier Barro');
  });

  it('accepts only paths on this site', () => {
    expect(safePath('/exam-desk/practice/#q-q-costs-p2-beq')).toBe('/exam-desk/practice/#q-q-costs-p2-beq');
    for (const bad of ['javascript:alert(1)', '//x.y/', 'https://x.y/', '/a b/', '/a"b/', '/a<b/', '/a\\b/', '', 42, null]) expect(safePath(bad)).toBeNull();
    expect(pagePath('/diagrams/?q=1#diagram-x')).toBe('/diagrams/');
  });
});

describe('exercise checks', () => {
  const page = { url: '/topics/costs-and-revenues/#ix-costs', title: 'Classify the costs' };

  it('records each checked item with the answer it was checked for', () => {
    const picks = { 'rent:behaviour': 'fixed', 'rent:directness': 'indirect', 'clay:behaviour': 'variable' };
    expect(pickSignature(picks, 'rent')).toBe('rent:behaviour=fixed|rent:directness=indirect');
    expect(pickSignature(picks, 'glaze')).toBe('');
    const log = updateChecks(emptyLog(), { uid: 'ix-costs', total: 8, results: { rent: 'right', clay: 'partial' }, picks, ...page }, T0);
    expect(checkTally(log.checks['ix-costs'], picks)).toEqual({ checked: 2, right: 1, partial: 1, wrong: 0, total: 8 });
  });

  it('keeps an earlier verdict while the answer stands, and drops it once the answer changes', () => {
    const picks1 = { 'rent:b': 'fixed', 'clay:b': 'fixed' };
    let log = updateChecks(emptyLog(), { uid: 'ix-costs', total: 8, results: { rent: 'right', clay: 'wrong' }, picks: picks1, ...page }, T0);
    // A later visit: only clay is checked again after its answer changed.
    const picks2 = { 'rent:b': 'fixed', 'clay:b': 'variable' };
    log = updateChecks(log, { uid: 'ix-costs', total: 8, results: { clay: 'right' }, picks: picks2, ...page }, later(60));
    expect(checkTally(log.checks['ix-costs'], picks2)).toMatchObject({ checked: 2, right: 2, wrong: 0 });
    // The rent answer is changed but not checked: its verdict no longer stands.
    const picks3 = { 'rent:b': 'variable', 'clay:b': 'variable' };
    expect(checkTally(log.checks['ix-costs'], picks3)).toMatchObject({ checked: 1, right: 1 });
    log = updateChecks(log, { uid: 'ix-costs', total: 8, results: { clay: 'right' }, picks: picks3, ...page }, later(61));
    expect(Object.keys(log.checks['ix-costs']!.items)).toEqual(['clay']);
  });

  it('forgets the exercise when its answers are cleared, and records nothing while paused', () => {
    let log = updateChecks(emptyLog(), { uid: 'ix-costs', total: 8, results: { rent: 'right' }, picks: { 'rent:b': 'fixed' }, ...page }, T0);
    log = updateChecks(log, { uid: 'ix-costs', total: 8, results: {}, picks: {}, ...page }, later(1));
    expect(log.checks).toEqual({});
    const paused = { ...emptyLog(), paused: true };
    expect(updateChecks(paused, { uid: 'ix-costs', total: 8, results: { rent: 'right' }, picks: { 'rent:b': 'fixed' }, ...page }, T0)).toBe(paused);
  });

  it('ignores verdicts it does not know and items without an answer', () => {
    const log = updateChecks(emptyLog(), { uid: 'ix-costs', total: 2, results: { rent: 'brilliant', clay: 'right' }, picks: { 'rent:b': 'x' }, ...page }, T0);
    expect(log.checks).toEqual({});
  });
});

describe('saved items', () => {
  const item = { url: '/glossary/gearing-ratio/', title: 'Gearing ratio', kind: 'term' };

  it('saves, finds and removes an item', () => {
    const { list, saved } = toggleSaved(emptySaved(), item, T0);
    expect(saved).toBe(true);
    expect(list.items[0]).toEqual({ ...item, saved: T0.toISOString() });
    const again = toggleSaved(list, item, later(1));
    expect(again.saved).toBe(false);
    expect(again.list.items).toEqual([]);
    expect(removeSaved(list, item.url).items).toEqual([]);
  });

  it('refuses an unknown kind or an address that is not a page here', () => {
    expect(toggleSaved(emptySaved(), { ...item, kind: 'secret' }, T0).list.items).toEqual([]);
    expect(toggleSaved(emptySaved(), { ...item, url: 'javascript:void(0)' }, T0).list.items).toEqual([]);
  });

  it('parses newest first, one per address, within the limit', () => {
    const raw = {
      v: 1,
      items: [
        { url: '/a/', title: 'A', kind: 'page', saved: '2026-11-01T00:00:00.000Z' },
        { url: '/b/', title: 'B', kind: 'case', saved: '2026-11-02T00:00:00.000Z' },
        { url: '/a/', title: 'A again', kind: 'page', saved: '2026-10-01T00:00:00.000Z' },
        { url: 'http://x/', title: 'X', kind: 'page', saved: '2026-11-02T00:00:00.000Z' },
      ],
    };
    expect(parseSaved(JSON.stringify(raw)).items.map((x) => x.url)).toEqual(['/b/', '/a/']);
    const many = { v: 1, items: Array.from({ length: LIMITS.saved + 20 }, (_, i) => ({ url: `/p${i}/`, title: `P${i}`, kind: 'page', saved: later(i).toISOString() })) };
    expect(parseSaved(many).items).toHaveLength(LIMITS.saved);
    expect(parseSaved('nonsense')).toEqual(emptySaved());
  });
});

describe('combining records', () => {
  it('merges visits without double counting, so importing twice changes nothing', () => {
    let a = recordVisit(emptyLog(), { kind: 'topic', url: '/topics/a/', title: 'A' }, T0);
    a = recordVisit(a, { kind: 'topic', url: '/topics/a/', title: 'A' }, later(90));
    const b = recordVisit(emptyLog(), { kind: 'case', url: '/cases/b/', title: 'B' }, later(30));
    const once = mergeLogs(a, b);
    expect(once.visits.map((v) => [v.url, v.count])).toEqual([
      ['/topics/a/', 2],
      ['/cases/b/', 1],
    ]);
    expect(mergeLogs(once, b)).toEqual(once);
    expect(mergeLogs(once, once)).toEqual(once);
  });

  it('keeps this browser\'s pause setting and the later saves', () => {
    const paused = { ...emptyLog(), paused: true };
    expect(mergeLogs(paused, emptyLog()).paused).toBe(true);
    const s1 = toggleSaved(emptySaved(), { url: '/a/', title: 'A', kind: 'page' }, T0).list;
    const s2 = toggleSaved(emptySaved(), { url: '/b/', title: 'B', kind: 'page' }, later(5)).list;
    expect(mergeSaved(s1, s2).items.map((x) => x.url)).toEqual(['/b/', '/a/']);
    expect(mergeSaved(mergeSaved(s1, s2), s2)).toEqual(mergeSaved(s1, s2));
  });
});

describe('export and import', () => {
  const stored: Array<[string, string]> = [
    ['bb:level', 'SL'],
    ['bb:q:q-costs-p2-beq', JSON.stringify({ answer: '550 mugs', points: [0, 1] })],
    ['bb:saved', JSON.stringify(toggleSaved(emptySaved(), { url: '/cases/atelier-barro/', title: 'Atelier Barro', kind: 'case' }, T0).list)],
    ['bb:learner', JSON.stringify(recordVisit(emptyLog(), { kind: 'topic', url: '/topics/a/', title: 'A' }, T0))],
    ['not-ours', 'x'],
  ];

  it('exports every item of this site exactly as stored, and reads its own export back', () => {
    const file = buildExport(stored, T0);
    expect(Object.keys(file.items)).toEqual(['bb:learner', 'bb:level', 'bb:q:q-costs-p2-beq', 'bb:saved']);
    expect(file.items['bb:level']).toBe('SL');
    const check = validateImport(JSON.stringify(file));
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.exported).toBe(T0.toISOString());
    expect(Object.fromEntries(check.items.map((i) => [i.key, i.value]))).toEqual(file.items);
    expect(check.skipped).toEqual([]);
  });

  it('refuses a file that is not an export from this dashboard', () => {
    const cases: Array<[string, RegExp]> = [
      ['', /empty/],
      ['{not json', /not a JSON file/],
      ['[1,2]', /not exported from this dashboard/],
      [JSON.stringify({ format: 'something-else', version: 1, items: {} }), /not exported from this dashboard/],
      [JSON.stringify({ format: 'the-business-brief/learner-data', version: 9, items: {} }), /version/],
      [JSON.stringify({ format: 'the-business-brief/learner-data', version: 1, items: [] }), /no items/],
      [JSON.stringify({ format: 'the-business-brief/learner-data', version: 1, items: { 'bb:q:x': '{oops' } }), /nothing this site can use/],
    ];
    for (const [text, error] of cases) {
      const r = validateImport(text);
      expect(r.ok, text).toBe(false);
      if (!r.ok) expect(r.error).toMatch(error);
    }
    expect(validateImport('x'.repeat(10), { fileChars: 5, items: 10, valueChars: 10 })).toMatchObject({ ok: false });
  });

  it('skips names this site does not use and values of the wrong shape, and cleans its own items', () => {
    const file = {
      format: 'the-business-brief/learner-data',
      version: 1,
      items: {
        'bb:level': 'XL',
        'other:key': '{}',
        'bb:<script>': '{}',
        'bb:q:x': 42,
        'bb:dr:y': '{bad',
        'bb:rc:z': '{"0":2}',
        'bb:learner': JSON.stringify({ visits: [{ kind: 'topic', url: 'javascript:alert(1)', title: 'x', first: T0.toISOString(), last: T0.toISOString(), count: 1 }, { kind: 'topic', url: '/topics/a/', title: 'A', first: T0.toISOString(), last: T0.toISOString(), count: 1 }] }),
      },
    };
    const r = validateImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.map((i) => i.key)).toEqual(['bb:rc:z', 'bb:learner']);
    expect(parseLog(r.items[1]!.value).visits.map((v) => v.url)).toEqual(['/topics/a/']);
    expect(r.skipped.map((s) => s.key)).toEqual(['bb:level', 'other:key', 'bb:<script>', 'bb:q:x', 'bb:dr:y']);
  });

  it('plans the writes: new, replaced or unchanged, combining saved items and visits', () => {
    const current = {
      'bb:rc:z': '{"0":1}',
      'bb:level': 'SL',
      'bb:saved': JSON.stringify(toggleSaved(emptySaved(), { url: '/a/', title: 'A', kind: 'page' }, T0).list),
    };
    const incoming = [
      { key: 'bb:rc:z', value: '{"0":2}' },
      { key: 'bb:level', value: 'SL' },
      { key: 'bb:q:new', value: '{"answer":"x"}' },
      { key: 'bb:saved', value: JSON.stringify(toggleSaved(emptySaved(), { url: '/b/', title: 'B', kind: 'page' }, later(1)).list) },
    ];
    const plan = planImport(current, incoming);
    expect(plan.map((w) => [w.key, w.effect])).toEqual([
      ['bb:rc:z', 'replace'],
      ['bb:level', 'same'],
      ['bb:q:new', 'new'],
      ['bb:saved', 'replace'],
    ]);
    expect(parseSaved(plan[3]!.value).items.map((x) => x.url)).toEqual(['/b/', '/a/']);
  });
});
