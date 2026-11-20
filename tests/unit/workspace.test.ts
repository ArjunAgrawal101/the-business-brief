import { describe, expect, it } from 'vitest';
import { familyOf, labSummaryLine, toolDataLine, workLine } from '../../src/lib/dashboard';
import { LIMITS, addSaved, emptySaved, parseSaved, toggleSaved } from '../../src/lib/learner';
import {
  LIST_KEY,
  NOTES_KEY,
  SNAPSHOTS_KEY,
  WS_LIMITS,
  addSnapshot,
  boardroomAnalysis,
  capList,
  checkImport,
  cleanBlock,
  datedLine,
  deleteNote,
  emptyList,
  emptyNotebook,
  emptySnapshots,
  forgetInList,
  groupAnalyses,
  listCounts,
  listView,
  mdBlock,
  mdInline,
  mergeLists,
  mergeNotebooks,
  mergeSnapshots,
  moveInList,
  newId,
  notesForPage,
  parseList,
  parseNotebook,
  parseSnapshots,
  planWorkspaceImport,
  removeSnapshot,
  saveNote,
  searchNotes,
  selectionExport,
  selectionMarkdown,
  selectionWords,
  setListNote,
  setListStatus,
  snapshotAnalysis,
  workspaceView,
  type Analysis,
  type Notebook,
  type SnapshotInput,
  type WorkspaceConfig,
} from '../../src/lib/workspace';
import { checkDashboardImport, dashboardWorkspaceView } from '../../src/lib/workspace-progress';

const T0 = new Date('2026-11-03T12:00:00.000Z');
const later = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const saved = (...urls: string[]) =>
  urls.reduce((list, url, i) => toggleSaved(list, { url, title: `Title of ${url}`, kind: 'topic' }, later(i)).list, emptySaved());

describe('text kept over several lines', () => {
  it('keeps line breaks, drops control characters and runs of blank lines, and caps the length', () => {
    expect(cleanBlock('  First line\u0007 here  \r\n\r\n\r\n\r\nSecond\tline \n', 100)).toBe('First line here\n\nSecond line');
    expect(cleanBlock(42, 100)).toBe('');
    expect(cleanBlock('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`);
  });

  it('makes ids that sort by time and fit the pattern every parser checks', () => {
    const a = newId('n', T0, 0.5);
    const b = newId('n', later(1), 0.1);
    expect(a).toMatch(/^n-[a-z0-9]+-[a-z0-9]{5}$/);
    expect(a < b).toBe(true);
    expect(newId('n', T0, 0.5)).toBe(a);
  });
});

describe('the learning list', () => {
  it('turns anything unusable into an empty arrangement, without throwing', () => {
    for (const raw of [null, undefined, '', 'nonsense', '[]', '7', { order: 'x', entries: [] }]) expect(parseList(raw)).toEqual(emptyList());
  });

  it('keeps only addresses on this site, known statuses and short notes', () => {
    const list = parseList({
      order: ['/topics/a/', '/topics/a/', 'javascript:alert(1)', '//evil.example/', '/cases/b/'],
      entries: {
        '/topics/a/': { status: 'doing', note: `  Revise\u0000 the\n map ${'x'.repeat(400)}`, updated: T0.toISOString() },
        '/cases/b/': { status: 'finished', note: 42, updated: 'yesterday' },
        'https://evil.example/': { status: 'done', note: 'x', updated: T0.toISOString() },
        __proto__: { status: 'done' },
      },
    });
    expect(list.order).toEqual(['/topics/a/', '/cases/b/']);
    expect(Object.keys(list.entries).sort()).toEqual(['/cases/b/', '/topics/a/']);
    expect(list.entries['/topics/a/']!.status).toBe('doing');
    expect(list.entries['/topics/a/']!.note.startsWith('Revise the map x')).toBe(true);
    expect(list.entries['/topics/a/']!.note).toHaveLength(WS_LIMITS.listNote);
    expect(list.entries['/cases/b/']).toEqual({ status: 'todo', note: '', updated: new Date(0).toISOString() });
    expect(parseList(JSON.stringify(list))).toEqual(list);
  });

  it('lists items saved since the last arrangement first, newest first, then the reader\'s order', () => {
    const s = saved('/a/', '/b/', '/c/', '/d/');
    expect(listView(s, emptyList()).map((x) => x.url)).toEqual(['/d/', '/c/', '/b/', '/a/']);
    const list = { v: 1 as const, order: ['/a/', '/gone/', '/c/'], entries: { '/c/': { status: 'done' as const, note: 'Read twice', updated: T0.toISOString() } } };
    const view = listView(s, list);
    expect(view.map((x) => x.url)).toEqual(['/d/', '/b/', '/a/', '/c/']);
    expect(view[3]).toMatchObject({ status: 'done', note: 'Read twice', updated: T0.toISOString(), title: 'Title of /c/' });
    expect(view[0]).toMatchObject({ status: 'todo', note: '', updated: null });
    expect(listCounts(view)).toEqual({ todo: 3, doing: 0, done: 1 });
  });

  it('moves an item up or down the list as shown, and keeps what is shown', () => {
    const shown = ['/d/', '/c/', '/b/', '/a/'];
    const up = moveInList(emptyList(), shown, '/b/', -1);
    expect(up.order).toEqual(['/d/', '/b/', '/c/', '/a/']);
    const down = moveInList(up, up.order, '/d/', 1);
    expect(down.order).toEqual(['/b/', '/d/', '/c/', '/a/']);
    // At the ends, or for an item not shown, nothing changes.
    expect(moveInList(down, down.order, '/b/', -1)).toBe(down);
    expect(moveInList(down, down.order, '/a/', 1)).toBe(down);
    expect(moveInList(down, down.order, '/zz/', 1)).toBe(down);
    expect(listView(saved('/a/', '/b/', '/c/', '/d/'), down).map((x) => x.url)).toEqual(down.order);
  });

  it('sets a status and a note, and refuses a status it does not know', () => {
    let list = setListStatus(emptyList(), '/a/', 'doing', T0);
    list = setListNote(list, '/a/', '  Chapter 3\n first ', later(1));
    expect(list.entries['/a/']).toEqual({ status: 'doing', note: 'Chapter 3 first', updated: later(1).toISOString() });
    expect(setListStatus(list, '/a/', 'urgent', T0)).toBe(list);
    expect(setListStatus(list, 'javascript:x', 'done', T0)).toBe(list);
    expect(setListNote(list, '/a/', 'y'.repeat(1000), T0).entries['/a/']!.note).toHaveLength(WS_LIMITS.listNote);
    const gone = forgetInList({ ...list, order: ['/a/', '/b/'] }, '/a/');
    expect(gone).toEqual({ v: 1, order: ['/b/'], entries: {} });
  });

  it('caps the arrangement, keeping the arranged items, then the most recently changed', () => {
    const small = { ...WS_LIMITS, listEntries: 2 };
    let list = emptyList();
    for (let i = 0; i < 4; i++) list = setListStatus(list, `/p${i}/`, 'done', later(i), small);
    expect(Object.keys(list.entries).sort()).toEqual(['/p2/', '/p3/']);
    const arranged = capList({ ...list, order: ['/p2/'], entries: { ...list.entries, '/p0/': { status: 'todo', note: '', updated: later(9).toISOString() } } }, small);
    expect(Object.keys(arranged.entries).sort()).toEqual(['/p0/', '/p2/']);
  });

  it('merges two arrangements: the later change wins, this browser\'s order first, and twice is the same as once', () => {
    const here = setListStatus({ ...emptyList(), order: ['/a/', '/b/'] }, '/a/', 'doing', later(5));
    const there = setListNote(setListStatus({ ...emptyList(), order: ['/c/', '/a/'] }, '/a/', 'done', T0), '/c/', 'From the other laptop', T0);
    const once = mergeLists(here, there);
    expect(once.order).toEqual(['/a/', '/b/', '/c/']);
    expect(once.entries['/a/']!.status).toBe('doing');
    expect(once.entries['/c/']!.note).toBe('From the other laptop');
    expect(mergeLists(once, there)).toEqual(once);
    expect(mergeLists(once, once)).toEqual(once);
  });

  it('adds a page to the saved items without ever removing one, within the limit', () => {
    const one = addSaved(emptySaved(), { url: '/entrepreneurship-lab/finding-an-opportunity/', title: 'Finding an opportunity', kind: 'briefing' }, T0);
    expect(one.added).toBe(true);
    expect(one.list.items[0]).toMatchObject({ kind: 'briefing', title: 'Finding an opportunity' });
    expect(addSaved(one.list, { url: '/entrepreneurship-lab/finding-an-opportunity/', title: 'Again', kind: 'briefing' }, later(1))).toEqual({ list: one.list, added: false });
    expect(addSaved(emptySaved(), { url: 'javascript:x', title: 'X', kind: 'tool' }, T0).added).toBe(false);
    expect(addSaved(emptySaved(), { url: '/x/', title: 'X', kind: 'secret' }, T0).added).toBe(false);
    const full = { v: 1 as const, items: Array.from({ length: LIMITS.saved }, (_, i) => ({ url: `/p${i}/`, title: `P${i}`, kind: 'page' as const, saved: T0.toISOString() })) };
    expect(addSaved(full, { url: '/new/', title: 'New', kind: 'tool' }, T0).added).toBe(false);
    expect(parseSaved(JSON.stringify(one.list)).items[0]?.kind).toBe('briefing');
  });
});

describe('the notebook', () => {
  const caseDraft = { kind: 'case', title: '', page: { url: '/cases/atelier-barro/', title: 'Atelier Barro' }, fields: { problem: 'Margins are falling.', evidence: 'Clay costs rose 18%.' } };

  it('turns anything unusable into an empty notebook, without throwing', () => {
    for (const raw of [null, '', '{oops', '[]', { notes: 'x' }, { notes: [null, 1, 'a'] }]) expect(parseNotebook(raw)).toEqual(emptyNotebook());
  });

  it('keeps only well-formed notes with something in them, one per id, newest first', () => {
    const note = (over: Record<string, unknown>) => ({ id: 'n-abc-00001', kind: 'free', title: 'T', body: 'Text', created: T0.toISOString(), updated: T0.toISOString(), ...over });
    const nb = parseNotebook({
      notes: [
        note({}),
        note({ updated: later(5).toISOString(), body: 'Newer text' }),
        note({ id: 'bad id!' }),
        note({ id: 'n-abc-00002', created: 'never', updated: 'never' }),
        note({ id: 'n-abc-00003', body: '   ' }),
        note({ id: 'n-abc-00004', kind: undefined, title: undefined, body: undefined, fields: { problem: 'Inferred as case notes' }, page: { url: 'javascript:alert(1)', title: 'x' } }),
        note({ id: 'n-abc-00005', title: '', body: 'First line\nsecond line', updated: later(1).toISOString() }),
      ],
    });
    expect(nb.notes.map((n) => n.id)).toEqual(['n-abc-00001', 'n-abc-00005', 'n-abc-00004']);
    expect(nb.notes[0]!.body).toBe('Newer text');
    expect(nb.notes[1]!.title).toBe('First line');
    expect(nb.notes[2]).toMatchObject({ kind: 'case', page: null, body: '', title: 'Inferred as case notes' });
    expect(parseNotebook(JSON.stringify(nb))).toEqual(nb);
  });

  it('saves a new case note attached to a page, titled after the page when the reader gave no title', () => {
    const r = saveNote(emptyNotebook(), caseDraft, T0, 0.25);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.note).toMatchObject({ kind: 'case', title: 'Atelier Barro', page: { url: '/cases/atelier-barro/', title: 'Atelier Barro' }, body: '', created: T0.toISOString(), updated: T0.toISOString() });
    expect(r.note.fields).toEqual({ problem: 'Margins are falling.', evidence: 'Clay costs rose 18%.', theory: '', alternatives: '', recommendation: '', evaluation: '' });
    expect(r.note.id).toBe(newId('n', T0, 0.25));
  });

  it('edits a note in place, keeping its id and when it was made', () => {
    const first = saveNote(emptyNotebook(), caseDraft, T0, 0.25);
    if (!first.ok) throw new Error('not saved');
    const edit = saveNote(first.notebook, { ...caseDraft, id: first.note.id, title: 'Pricing at Atelier Barro', fields: { ...caseDraft.fields, recommendation: 'Raise prices by 6%.' } }, later(30));
    if (!edit.ok) throw new Error('not saved');
    expect(edit.notebook.notes).toHaveLength(1);
    expect(edit.note).toMatchObject({ id: first.note.id, title: 'Pricing at Atelier Barro', created: T0.toISOString(), updated: later(30).toISOString() });
    expect(edit.note.fields.recommendation).toBe('Raise prices by 6%.');
  });

  it('keeps only the type of note the reader chose', () => {
    const r = saveNote(emptyNotebook(), { kind: 'free', title: 'Questions', body: 'Ask about the kiln.', fields: { problem: 'Left over from the other type' } }, T0);
    expect(r.ok && r.note.fields.problem).toBe('');
    expect(r.ok && r.note.body).toBe('Ask about the kiln.');
  });

  it('refuses a note with nothing in it, saying where to write', () => {
    expect(saveNote(emptyNotebook(), { kind: 'case', title: 'Only a title', fields: { problem: '   ' } }, T0)).toEqual({ ok: false, field: 'problem', error: 'Write under at least one of the headings before saving the note.' });
    expect(saveNote(emptyNotebook(), { kind: 'free', body: '' }, T0)).toEqual({ ok: false, field: 'body', error: 'Write the note before saving it.' });
  });

  it('refuses a new note when the notebook is full, in notes or in size, but still lets a note be edited', () => {
    const small = { ...WS_LIMITS, notes: 2 };
    let nb: Notebook = emptyNotebook();
    for (let i = 0; i < 2; i++) {
      const r = saveNote(nb, { kind: 'free', body: `Note ${i}` }, later(i), i / 10, small);
      if (r.ok) nb = r.notebook;
    }
    const third = saveNote(nb, { kind: 'free', body: 'One too many' }, later(5), 0.9, small);
    expect(third).toMatchObject({ ok: false, field: 'form' });
    expect(saveNote(nb, { id: nb.notes[0]!.id, kind: 'free', body: 'Edited' }, later(6), 0, small).ok).toBe(true);
    const tiny = { ...WS_LIMITS, notesBytes: 600 };
    const big = saveNote(emptyNotebook(), { kind: 'free', body: 'z'.repeat(700) }, T0, 0, tiny);
    expect(big).toMatchObject({ ok: false, field: 'form' });
  });

  it('caps a stored notebook by count and by size, dropping the oldest changed first', () => {
    const notes = Array.from({ length: 5 }, (_, i) => ({ id: `n-x-0000${i}`, kind: 'free', title: `N${i}`, body: 'w'.repeat(100), created: later(i).toISOString(), updated: later(i).toISOString() }));
    expect(parseNotebook({ notes }, { ...WS_LIMITS, notes: 3 }).notes.map((n) => n.title)).toEqual(['N4', 'N3', 'N2']);
    const sized = parseNotebook({ notes }, { ...WS_LIMITS, notesBytes: 500 });
    expect(JSON.stringify(sized).length).toBeLessThanOrEqual(500);
    expect(sized.notes[0]!.title).toBe('N4');
  });

  it('deletes a note, and searches every word in the title, the page and the text, ignoring case and accents', () => {
    let nb: Notebook = emptyNotebook();
    const drafts = [
      { kind: 'case', title: 'Evaluación de precios', page: { url: '/cases/atelier-barro/', title: 'Atelier Barro' }, fields: { evidence: 'Clay costs rose' } },
      { kind: 'free', title: 'Kiln questions', body: 'Lease or buy the KILN?' },
      { kind: 'free', title: 'Halden', page: { url: '/exam-desk/practice/#q-q-halden-1', title: 'A question on Halden' }, body: 'Night shift training' },
    ];
    drafts.forEach((d, i) => {
      const r = saveNote(nb, d, later(i), i / 7);
      if (r.ok) nb = r.notebook;
    });
    expect(searchNotes(nb.notes, 'evaluacion').map((n) => n.title)).toEqual(['Evaluación de precios']);
    expect(searchNotes(nb.notes, 'kiln lease').map((n) => n.title)).toEqual(['Kiln questions']);
    expect(searchNotes(nb.notes, 'atelier clay').map((n) => n.title)).toEqual(['Evaluación de precios']);
    expect(searchNotes(nb.notes, 'kiln night')).toEqual([]);
    expect(searchNotes(nb.notes, '   ')).toHaveLength(3);
    expect(notesForPage(nb.notes, '/cases/atelier-barro/').map((n) => n.title)).toEqual(['Evaluación de precios']);
    expect(notesForPage(nb.notes, '/exam-desk/practice/#q-q-halden-1')).toHaveLength(1);
    expect(notesForPage(nb.notes, '/exam-desk/practice/#q-other')).toHaveLength(0);
    expect(notesForPage(nb.notes, '/exam-desk/practice/')).toHaveLength(1);
    const kiln = nb.notes.find((n) => n.title === 'Kiln questions')!;
    expect(deleteNote(nb, kiln.id).notes.map((n) => n.title)).not.toContain('Kiln questions');
  });

  it('merges two notebooks by note, the later change winning, and twice is the same as once', () => {
    const a = saveNote(emptyNotebook(), { kind: 'free', title: 'Mine', body: 'Here' }, T0, 0.1);
    const b = saveNote(emptyNotebook(), { kind: 'free', title: 'Theirs', body: 'There' }, later(1), 0.2);
    if (!a.ok || !b.ok) throw new Error('not saved');
    const edited = saveNote(a.notebook, { id: a.note.id, kind: 'free', title: 'Mine, edited', body: 'Here, later' }, later(10));
    if (!edited.ok) throw new Error('not saved');
    const once = mergeNotebooks(b.notebook, mergeNotebooks(a.notebook, edited.notebook));
    expect(once.notes.map((n) => n.title)).toEqual(['Mine, edited', 'Theirs']);
    expect(mergeNotebooks(once, a.notebook)).toEqual(once);
    expect(mergeNotebooks(once, once)).toEqual(once);
  });
});

const BE: SnapshotInput = {
  calc: 'break-even-quantity',
  name: 'Break-even quantity',
  url: '/finance-desk/lab/break-even-quantity/?price=30&variable=12',
  page: '/finance-desk/lab/break-even-quantity/',
  headline: { label: 'Break-even quantity', value: '1,859 bags a month' },
  inputs: [
    { label: 'Selling price', value: '$30.00' },
    { label: 'Variable cost per bag', value: '$12.00' },
  ],
  mine: true,
};

describe('results saved from the Financial Laboratory', () => {
  it('turns anything unusable into an empty list, and drops results it cannot show or link to', () => {
    for (const raw of [null, 'x', '{}', { items: 'x' }]) expect(parseSnapshots(raw)).toEqual(emptySnapshots());
    const good = addSnapshot(emptySnapshots(), BE, T0, 0.3)!.snapshot;
    const list = parseSnapshots({
      items: [good, { ...good, id: 'BAD' }, { ...good, id: 's-a-00001', url: 'https://evil.example/' }, { ...good, id: 's-a-00002', calc: '../x' }, { ...good, id: 's-a-00003', headline: { label: 'x' } }],
    });
    expect(list.items).toEqual([good]);
  });

  it('keeps the calculator, the figures, the headline and the date, newest first', () => {
    const one = addSnapshot(emptySnapshots(), BE, T0, 0.3)!;
    expect(one.snapshot).toEqual({ id: newId('s', T0, 0.3), calc: 'break-even-quantity', name: 'Break-even quantity', url: BE.url, headline: { label: 'Break-even quantity', value: '1,859 bags a month', note: '' }, inputs: BE.inputs, mine: true, saved: T0.toISOString() });
    const two = addSnapshot(one.list, { ...BE, headline: { label: 'Break-even quantity', value: '2,000 bags a month' }, url: `${BE.page}?price=28` }, later(1), 0.4)!;
    expect(two.list.items.map((x) => x.headline.value)).toEqual(['2,000 bags a month', '1,859 bags a month']);
  });

  it('does not keep the same result twice: it moves to the top with the new date', () => {
    const one = addSnapshot(emptySnapshots(), BE, T0, 0.3)!;
    const two = addSnapshot(one.list, { ...BE, url: `${BE.page}?price=28`, headline: { label: 'x', value: 'Other' } }, later(1), 0.4)!;
    const again = addSnapshot(two.list, BE, later(2), 0.5)!;
    expect(again.list.items).toHaveLength(2);
    expect(again.list.items[0]).toMatchObject({ id: one.snapshot.id, saved: later(2).toISOString() });
  });

  it('falls back to the calculator\'s page when the address with the figures cannot be kept, and caps the list', () => {
    const long = addSnapshot(emptySnapshots(), { ...BE, url: `${BE.page}?label=${'x'.repeat(400)}` }, T0, 0.1)!;
    expect(long.snapshot.url).toBe(BE.page);
    expect(addSnapshot(emptySnapshots(), { ...BE, url: 'x', page: 'y' }, T0)).toBeNull();
    let list = emptySnapshots();
    for (let i = 0; i < WS_LIMITS.snapshots + 5; i++) list = addSnapshot(list, { ...BE, headline: { label: 'Q', value: String(i) } }, later(i), i / 100)!.list;
    expect(list.items).toHaveLength(WS_LIMITS.snapshots);
    expect(list.items[0]!.headline.value).toBe(String(WS_LIMITS.snapshots + 4));
  });

  it('removes a result, and merges two lists without doubling', () => {
    const a = addSnapshot(emptySnapshots(), BE, T0, 0.3)!;
    const b = addSnapshot(emptySnapshots(), { ...BE, headline: { label: 'Q', value: 'B' } }, later(1), 0.6)!;
    const once = mergeSnapshots(a.list, b.list);
    expect(once.items.map((x) => x.headline.value)).toEqual(['B', '1,859 bags a month']);
    expect(mergeSnapshots(once, b.list)).toEqual(once);
    expect(removeSnapshot(once, a.snapshot.id).items).toHaveLength(1);
  });
});

const CFG: WorkspaceConfig = {
  units: [{ number: 1, title: 'Introduction to business management' }],
  subtopics: [{ code: '1.1', title: 'What is a business?', unit: 1, url: '/topics/what-is-a-business/', level: 'SL/HL', state: 'complete', cards: [], cardCount: 0 }],
  questions: [],
  exercises: [],
  labs: [],
  decisions: [],
  retrieval: [],
  tools: [{ keys: ['bb:ia-plan'], title: 'Your research project plan', url: '/ia-studio/', detail: 'Your plan', room: 'Assessment Centre' }],
  roomTools: [
    { key: 'bb:strategy:swot', title: 'SWOT builder', url: '/strategy-studio/swot/', room: 'Strategy Studio' },
    { key: 'bb:lab:unit-economics', title: 'Unit economics calculator', url: '/entrepreneurship-lab/unit-economics/', room: 'Entrepreneurship and Innovation Lab', summary: 'bb:lab:summary:unit' },
    { key: 'bb:people:org-chart', title: 'Organization chart creator', url: '/people-and-culture/organization-chart/', room: 'People and Culture' },
  ],
  simulations: [{ id: 'kestle', title: 'Kestle Cycles', url: '/boardroom/kestle/', rounds: 4, codes: [] }],
  caseDecisions: [],
  checklists: [],
  rooms: [{ href: '/strategy-studio/', title: 'Strategy Studio' }],
  pages: [],
  starts: {
    topic: { href: '/topics/', title: 'Topics' },
    mindmap: { href: '/mindmaps/', title: 'Mindmaps' },
    case: { href: '/cases/', title: 'Cases' },
    framework: { href: '/toolkit/', title: 'Toolkit' },
    tool: { href: '/rooms/', title: 'Rooms' },
  },
  totals: { mindmaps: 1, cases: 1, frameworks: 1 },
  ia: { href: '/ia-studio/', steps: 10 },
  seats: { finance: 'finance director', hr: 'HR director' },
  roomOrder: ['Strategy Studio', 'Financial Laboratory', 'Market Studio', 'People and Culture', 'Operations Floor', 'Entrepreneurship and Innovation Lab', 'Boardroom'],
  labName: 'Financial Laboratory',
  boardroomName: 'Boardroom',
  bank: [],
  p2: {},
  calc: [],
};

const UNIT = { currency: '$', cac: 20, contribution: 9, lifetime: 12.5, ltv: 112.5, ratio: 5.625, payback: 2.2 };

describe('practice records count a subtopic as practised', () => {
  it('a rating in the question bank makes its subtopic practised, in the rows, the units and the counts', () => {
    const cfg = { ...CFG, bank: [['n-what-1', ['1.1'], 'paper-1']] as WorkspaceConfig['bank'] };
    const before = dashboardWorkspaceView({ 'bb:saved': JSON.stringify(saved('/topics/a/')) }, cfg);
    expect(before.course.rows[0]?.status).toBe('none');
    const v = dashboardWorkspaceView({ 'bb:saved': JSON.stringify(saved('/topics/a/')), 'bb:bank': JSON.stringify({ v: 1, items: { 'n-what-1': { attempts: 1, rating: 2, last: '2026-11-03' } } }) }, cfg);
    expect(v.course.rows[0]?.status).toBe('practised');
    expect(v.course.units[0]).toMatchObject({ explored: 1, practised: 1 });
    expect(v.figures).toMatchObject({ explored: 1, practised: 1, completeExplored: 1 });
  });
});

describe('saved analyses', () => {
  it('reads each room\'s own items without changing them, with a line that says what each holds', () => {
    expect(familyOf(LIST_KEY)).toBe('workspace');
    expect(familyOf(NOTES_KEY)).toBe('workspace');
    expect(familyOf(SNAPSHOTS_KEY)).toBe('workspace');
    expect(labSummaryLine('unit', UNIT)).toBe('Unit economics: each customer costs $20.00 to win and contributes $9.00 a month for about 12.5 months, a lifetime value of $112.50 (LTV to CAC 5.6 to 1); the acquisition cost is earned back in 2.2 months.');
    expect(labSummaryLine('unit', { cac: 'lots' })).toBeNull();
    expect(labSummaryLine('secrets', UNIT)).toBeNull();
    expect(toolDataLine(JSON.stringify({ v: 1, data: { organization: 'Kestrel Bikes', posts: [{}, {}, {}] } }))).toBe('Kestrel Bikes: 3 posts on the chart');
    expect(toolDataLine({ v: 1, data: { choices: { a: 'x', b: 'y', c: '' } } })).toBe('2 situations decided');
    expect(toolDataLine({ v: 1, data: { note: '  Site B wins on labour. ' } })).toBe('Site B wins on labour.');
    expect(toolDataLine('{oops')).toBeNull();
  });

  it('describes a Boardroom simulation by the rounds decided, the seat and the memo', () => {
    const sim = CFG.simulations[0]!;
    expect(boardroomAnalysis(sim, JSON.stringify({ role: 'finance', picks: ['a', 'b'], memo: { situation: 'Sales fell.', ask: ' ' } }), CFG.seats, 'Boardroom')).toEqual({
      id: 'bb:boardroom:kestle',
      keys: ['bb:boardroom:kestle'],
      room: 'Boardroom',
      title: 'Kestle Cycles',
      href: '/boardroom/kestle/',
      line: '2 of 4 rounds decided, as the finance director; 1 part of the board memo written',
      when: null,
    });
    expect(boardroomAnalysis(sim, { role: 'hr', picks: ['a', 'b', 'c', 'd', 'e'] }, CFG.seats, 'Boardroom')?.line).toBe('Every round decided, as the HR director');
    expect(boardroomAnalysis(sim, '{}', CFG.seats, 'Boardroom')).toBeNull();
    expect(boardroomAnalysis(sim, 'nonsense', CFG.seats, 'Boardroom')).toBeNull();
  });

  it('lists the snapshots, the rooms\' work and the Boardroom, grouped in the rooms\' order', () => {
    const snap = addSnapshot(emptySnapshots(), BE, T0, 0.3)!;
    const items: Record<string, string> = {
      'bb:ia-plan': JSON.stringify({ fields: { 'done-1': 'on' } }),
      'bb:strategy:swot': JSON.stringify({ v: 1, tool: 'swot', savedAt: T0.toISOString(), headline: 'Two strengths outweigh one threat' }),
      'bb:lab:unit-economics': JSON.stringify({ currency: '$', values: { spend: '100' } }),
      'bb:lab:summary:unit': JSON.stringify(UNIT),
      'bb:people:org-chart': JSON.stringify({ v: 1, data: { organization: 'Kestrel Bikes', posts: [{}, {}] } }),
      'bb:boardroom:kestle': JSON.stringify({ role: 'finance', picks: ['a'] }),
      [SNAPSHOTS_KEY]: JSON.stringify(snap.list),
    };
    const v = workspaceView(items, CFG);
    expect(v.any).toBe(true);
    expect(v.analysisGroups.map((g) => [g.room, g.items.map((a) => a.title)])).toEqual([
      ['Strategy Studio', ['SWOT builder']],
      ['Financial Laboratory', ['Break-even quantity']],
      ['People and Culture', ['Organization chart creator']],
      ['Entrepreneurship and Innovation Lab', ['Unit economics calculator']],
      ['Boardroom', ['Kestle Cycles']],
      ['Assessment Centre', ['Your research project plan']],
    ]);
    const byTitle = (t: string) => v.analyses.find((a) => a.title === t)!;
    expect(byTitle('Unit economics calculator')).toMatchObject({ keys: ['bb:lab:unit-economics', 'bb:lab:summary:unit'], href: '/entrepreneurship-lab/unit-economics/' });
    expect(byTitle('Unit economics calculator').line).toMatch(/^Unit economics: each customer costs \$20\.00/);
    expect(byTitle('Organization chart creator').line).toBe('Kestrel Bikes: 2 posts on the chart');
    expect(byTitle('SWOT builder')).toMatchObject({ line: 'Two strengths outweigh one threat', when: T0.toISOString(), keys: ['bb:strategy:swot'] });
    expect(byTitle('Break-even quantity')).toEqual(snapshotAnalysis(snap.snapshot, 'Financial Laboratory'));
    expect(byTitle('Break-even quantity').line).toBe('Break-even quantity: 1,859 bags a month');
    expect(snapshotAnalysis({ ...snap.snapshot, mine: false }, 'Financial Laboratory').line).toBe('Break-even quantity: 1,859 bags a month (the example figures)');
    // The workspace's own items are never listed as a tool's work.
    expect(v.work.map((w) => w.key)).not.toContain(SNAPSHOTS_KEY);
  });

  it('groups any room it does not know after the known ones, in the order they appear', () => {
    const a = (room: string, id: string): Analysis => ({ id, keys: [], room, title: id, href: '/', line: '', when: null });
    expect(groupAnalyses([a('Zeta', '1'), a('Boardroom', '2'), a('Alpha', '3'), a('Strategy Studio', '4'), a('Zeta', '5')], CFG.roomOrder).map((g) => [g.room, g.items.length])).toEqual([
      ['Strategy Studio', 1],
      ['Boardroom', 1],
      ['Zeta', 2],
      ['Alpha', 1],
    ]);
  });
});

/** A browser with a learning list, two notes and three analyses. */
function stocked() {
  const s = saved('/topics/stakeholders/', '/cases/atelier-barro/');
  let list = setListStatus(emptyList(), '/topics/stakeholders/', 'doing', T0);
  list = setListNote(list, '/topics/stakeholders/', 'Learn the *mapping* grid', T0);
  const n1 = saveNote(emptyNotebook(), { kind: 'case', title: 'Atelier Barro: pricing', page: { url: '/cases/atelier-barro/', title: 'Atelier Barro' }, fields: { problem: 'Margins are falling.', evidence: '# Clay costs rose 18%\n<script>x</script>' } }, T0, 0.1);
  if (!n1.ok) throw new Error('not saved');
  const n2 = saveNote(n1.notebook, { kind: 'free', title: 'Questions for class', body: 'Lease or buy?' }, later(1), 0.2);
  if (!n2.ok) throw new Error('not saved');
  const snap = addSnapshot(emptySnapshots(), { ...BE, inputs: [...BE.inputs, { label: 'Fixed | costs', value: '$33,420' }] }, T0, 0.3)!;
  const items: Record<string, string> = {
    'bb:saved': JSON.stringify(s),
    [LIST_KEY]: JSON.stringify(list),
    [NOTES_KEY]: JSON.stringify(n2.notebook),
    [SNAPSHOTS_KEY]: JSON.stringify(snap.list),
    'bb:strategy:swot': JSON.stringify({ v: 1, tool: 'swot', savedAt: T0.toISOString(), headline: 'Two strengths outweigh one threat', state: { s: ['Brand'] } }),
    'bb:lab:unit-economics': JSON.stringify({ currency: '$', values: { spend: '100' } }),
    'bb:lab:summary:unit': JSON.stringify(UNIT),
    'bb:q:q-costs-p2-beq': JSON.stringify({ answer: 'not chosen' }),
  };
  const view = workspaceView(items, CFG);
  return { items, view, n1: n1.note, n2: n2.note, snap: snap.snapshot };
}

describe('exporting a selection', () => {
  it('writes a file in the whole-record format holding only the chosen work, analyses exactly as stored', () => {
    const { items, view, n1, snap } = stocked();
    const sel = { list: ['/topics/stakeholders/'], notes: [n1.id], analyses: ['bb:lab:unit-economics', `snapshot:${snap.id}`] };
    const file = selectionExport(items, view, sel, later(60));
    expect(file.format).toBe('the-business-brief/learner-data');
    expect(file.version).toBe(1);
    expect(file.exported).toBe(later(60).toISOString());
    expect(file.selection).toEqual({ list: 1, notes: 1, analyses: 2 });
    expect(file.note).toMatch(/Import it with "Import a copy"/);
    expect(Object.keys(file.items)).toEqual(['bb:lab:summary:unit', 'bb:lab:unit-economics', 'bb:saved', LIST_KEY, NOTES_KEY, SNAPSHOTS_KEY]);
    expect(file.items['bb:lab:unit-economics']).toBe(items['bb:lab:unit-economics']);
    expect(file.items['bb:lab:summary:unit']).toBe(items['bb:lab:summary:unit']);
    expect(JSON.parse(file.items['bb:saved']!).items.map((x: { url: string }) => x.url)).toEqual(['/topics/stakeholders/']);
    expect(parseList(file.items[LIST_KEY]).entries['/topics/stakeholders/']).toMatchObject({ status: 'doing', note: 'Learn the *mapping* grid' });
    expect(parseNotebook(file.items[NOTES_KEY]).notes.map((n) => n.id)).toEqual([n1.id]);
    expect(parseSnapshots(file.items[SNAPSHOTS_KEY]).items.map((s) => s.id)).toEqual([snap.id]);
    expect(file.items['bb:q:q-costs-p2-beq']).toBeUndefined();
    expect(selectionWords(sel)).toBe('1 item, 1 note and 2 analyses');
    expect(selectionWords({ list: [], notes: [], analyses: ['a'] })).toBe('1 analysis');
    expect(selectionWords({ list: [], notes: [], analyses: [] })).toBe('nothing');
  });

  it('imports back into another browser, combined with what is there, and importing twice changes nothing', () => {
    const { items, view, n1, n2, snap } = stocked();
    const file = selectionExport(items, view, { list: ['/topics/stakeholders/', '/cases/atelier-barro/'], notes: [n1.id, n2.id], analyses: ['bb:strategy:swot', `snapshot:${snap.id}`] }, later(60));
    const check = checkImport(JSON.stringify(file));
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    // The other browser has a note and a saved page of its own.
    const theirs = saveNote(emptyNotebook(), { kind: 'free', title: 'Already there', body: 'Kept' }, T0, 0.9);
    if (!theirs.ok) throw new Error('not saved');
    const other: Record<string, string> = {
      [NOTES_KEY]: JSON.stringify(theirs.notebook),
      'bb:saved': JSON.stringify(saved('/mindmaps/unit-1/')),
      [LIST_KEY]: JSON.stringify(setListStatus(emptyList(), '/mindmaps/unit-1/', 'done', T0)),
    };
    const plan = planWorkspaceImport(other, check.items);
    expect(Object.fromEntries(plan.map((w) => [w.key, w.effect]))).toEqual({ 'bb:saved': 'replace', 'bb:strategy:swot': 'new', [LIST_KEY]: 'replace', [NOTES_KEY]: 'replace', [SNAPSHOTS_KEY]: 'new' });
    const after = { ...other, ...Object.fromEntries(plan.map((w) => [w.key, w.value])) };
    expect(parseNotebook(after[NOTES_KEY]).notes.map((n) => n.title).sort()).toEqual(['Already there', 'Atelier Barro: pricing', 'Questions for class']);
    expect(parseSaved(after['bb:saved']).items.map((x) => x.url).sort()).toEqual(['/cases/atelier-barro/', '/mindmaps/unit-1/', '/topics/stakeholders/']);
    expect(parseList(after[LIST_KEY]).entries['/mindmaps/unit-1/']?.status).toBe('done');
    expect(parseList(after[LIST_KEY]).entries['/topics/stakeholders/']?.status).toBe('doing');
    expect(after['bb:strategy:swot']).toBe(items['bb:strategy:swot']);
    expect(planWorkspaceImport(after, check.items).every((w) => w.effect === 'same')).toBe(true);
  });

  it('cleans the workspace\'s own items in a file before anything is written', () => {
    const file = {
      format: 'the-business-brief/learner-data',
      version: 1,
      items: {
        [LIST_KEY]: JSON.stringify({ order: ['javascript:alert(1)', '/topics/a/'], entries: { '/topics/a/': { status: 'hacked', note: '<b>hi</b>' } } }),
        [NOTES_KEY]: JSON.stringify({ notes: [{ id: '<img>', kind: 'free', body: 'x', created: T0.toISOString() }, { id: 'n-ok-00001', kind: 'free', body: 'Fine', created: T0.toISOString(), page: { url: '//evil.example/', title: 'Evil' } }] }),
        [SNAPSHOTS_KEY]: JSON.stringify({ items: [{ id: 's-ok-00001', calc: 'npv', name: 'NPV', url: 'javascript:alert(1)', headline: { label: 'NPV', value: '$1' }, saved: T0.toISOString() }] }),
      },
    };
    const r = checkImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const got = Object.fromEntries(r.items.map((i) => [i.key, i.value]));
    expect(JSON.parse(got[LIST_KEY]!)).toEqual({ v: 1, order: ['/topics/a/'], entries: { '/topics/a/': { status: 'todo', note: '<b>hi</b>', updated: new Date(0).toISOString() } } });
    expect(parseNotebook(got[NOTES_KEY]).notes).toEqual([expect.objectContaining({ id: 'n-ok-00001', page: null, body: 'Fine' })]);
    expect(JSON.parse(got[SNAPSHOTS_KEY]!)).toEqual({ v: 1, items: [] });
    expect(checkImport('{"format":"other"}')).toMatchObject({ ok: false });
  });

  it('on the dashboard, also cleans the revision plan, study mode and the subtopics marked complete in a file', () => {
    const file = {
      format: 'the-business-brief/learner-data',
      version: 1,
      items: {
        'bb:planner': JSON.stringify({ v: 1, gen: 1, sessions: [{ id: '1-1', date: '2026-11-23', kind: 'learn', minutes: 40, code: '1.1' }, { id: '<x>', date: 'soon', kind: 'learn', minutes: 40 }], done: { '1-1': '2026-11-23T10:00:00Z', ghost: '2026-11-23T10:00:00Z' } }),
        'bb:study': JSON.stringify({ size: 9, low: 'yes', script: '<b>' }),
        'bb:studied': JSON.stringify({ done: { '1.1': '2026-11-23T10:00:00Z', '<b>': 'x' } }),
      },
    };
    const r = checkDashboardImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const got = Object.fromEntries(r.items.map((i) => [i.key, JSON.parse(i.value)]));
    // Without its plan, only the session done is kept.
    expect(got['bb:planner']).toMatchObject({ v: 1, gen: 1, plan: null, sessions: [{ id: '1-1', code: '1.1' }], done: { '1-1': '2026-11-23T10:00:00.000Z' } });
    expect(got['bb:study']).toEqual({ v: 1, size: 0, low: false });
    expect(got['bb:studied']).toEqual({ v: 1, done: { '1.1': '2026-11-23T10:00:00.000Z' } });
  });

  it('writes Markdown to read and print, with the reader\'s text escaped so it reads as written', () => {
    const { view, n1, snap } = stocked();
    const md = selectionMarkdown(view, { list: ['/topics/stakeholders/'], notes: [n1.id], analyses: ['bb:strategy:swot', `snapshot:${snap.id}`] }, later(60), 'https://example.org', CFG.roomOrder);
    expect(md).toBe(
      [
        '# My Business Workspace',
        '',
        'A selection of your work from The Business Brief, exported on 3 November 2026. It was made in your browser and sent nowhere.',
        '',
        '## Learning list',
        '',
        '1. **Title of /topics/stakeholders/** (Subtopic): In progress  ',
        '   <https://example.org/topics/stakeholders/>  ',
        '   Note: Learn the \\*mapping\\* grid',
        '',
        '## Notes',
        '',
        '### Atelier Barro: pricing',
        '',
        '*Case notes, on [Atelier Barro](https://example.org/cases/atelier-barro/). Last changed 3 November 2026.*',
        '',
        '#### Problem identified',
        '',
        'Margins are falling.',
        '',
        '#### Evidence',
        '',
        '\\# Clay costs rose 18%  ',
        '\\<script\\>x\\</script\\>',
        '',
        '## Saved analyses',
        '',
        '### Strategy Studio',
        '',
        '- **SWOT builder**: Two strengths outweigh one threat, saved 3 November 2026  ',
        '  <https://example.org/strategy-studio/swot/>',
        '',
        '### Financial Laboratory',
        '',
        '#### Break-even quantity',
        '',
        '**Break-even quantity: 1,859 bags a month**  ',
        'Your own figures, saved 3 November 2026.',
        '',
        '| Figure | Value |',
        '| --- | --- |',
        '| Selling price | $30.00 |',
        '| Variable cost per bag | $12.00 |',
        '| Fixed \\| costs | $33,420 |',
        '',
        `Open the calculator: <https://example.org${BE.url}>`,
        '',
      ].join('\n'),
    );
    expect(selectionMarkdown(view, { list: [], notes: [], analyses: [] }, T0, '')).toContain('Nothing was chosen.');
    expect(selectionMarkdown(view, { list: ['/topics/stakeholders/'], notes: [], analyses: [] }, T0, '')).toContain('   </topics/stakeholders/>');
  });

  it('joins a line and its date without doubling or losing a stop', () => {
    expect(datedLine('Two strengths outweigh one threat', 'today')).toBe('Two strengths outweigh one threat, saved today');
    expect(datedLine('3 growth options placed: 2 in market development.', 'today')).toBe('3 growth options placed: 2 in market development, saved today');
    expect(datedLine('Is the market large enough?', '3 November')).toBe('Is the market large enough? Saved 3 November.');
    expect(datedLine('Heaviest factor: the brand…', 'today')).toBe('Heaviest factor: the brand… Saved today.');
  });

  it('cuts a long headline with an ellipsis, not in silence', () => {
    const long = `Heaviest factor: ${'a very long factor '.repeat(20)}`;
    const line = workLine(JSON.stringify({ headline: long }));
    expect(line?.length).toBeLessThanOrEqual(220);
    expect(line?.length).toBeGreaterThan(200);
    expect(line?.endsWith('…')).toBe(true);
    expect(workLine(JSON.stringify({ headline: 'Short.' }))).toBe('Short.');
  });

  it('escapes Markdown in a line and in a block', () => {
    expect(mdInline('a *b* [c](d) <e> | #f\nnext')).toBe('a \\*b\\* \\[c\\](d) \\<e\\> \\| \\#f next');
    expect(mdBlock('## Heading\n---\nplain\n\nafter a gap')).toBe('\\## Heading  \n\\---  \nplain\n\nafter a gap');
  });
});
