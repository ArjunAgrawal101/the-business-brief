import { describe, expect, it } from 'vitest';
import {
  chainOf,
  delayer,
  delayerLevels,
  delayerResult,
  describeStructure,
  groupingOf,
  orgCsvRows,
  orgModel,
  parseOrgFile,
  readOrg,
  shapeOf,
  validateOrg,
  type OrgPost,
} from '../../src/lib/org-chart';
import { layoutOrg, orgChartSvg, orgOutlineHtml, treeOrder } from '../../src/lib/org-chart-view';
import { loadTool } from './helpers/room-tool';

// Marrick Cycles (fictional), as in the notes on organizational structure: 27 people.
const MARRICK: OrgPost[] = [
  { id: 'owner', title: 'Owner', reportsTo: null, count: 1 },
  { id: 'production', title: 'Production manager', reportsTo: 'owner', count: 1, grouping: 'function' },
  { id: 'sales', title: 'Sales manager', reportsTo: 'owner', count: 1, grouping: 'function' },
  { id: 'finance', title: 'Finance manager', reportsTo: 'owner', count: 1, grouping: 'function' },
  { id: 'supervisor-a', title: 'Supervisor, team A', reportsTo: 'production', count: 1 },
  { id: 'supervisor-b', title: 'Supervisor, team B', reportsTo: 'production', count: 1 },
  { id: 'assemblers-a', title: 'Assembler, team A', reportsTo: 'supervisor-a', count: 8 },
  { id: 'assemblers-b', title: 'Assembler, team B', reportsTo: 'supervisor-b', count: 8 },
  { id: 'sales-staff', title: 'Sales adviser', reportsTo: 'sales', count: 3 },
  { id: 'finance-clerks', title: 'Finance clerk', reportsTo: 'finance', count: 2 },
];
const title = (id: string) => MARRICK.find((p) => p.id === id)?.title ?? id;

describe('the organization chart model', () => {
  const m = orgModel(MARRICK);

  it('counts levels, people and managers as worked by hand', () => {
    expect(validateOrg(MARRICK)).toEqual([]);
    // Owner; three managers; two supervisors with the sales advisers and clerks; the assemblers.
    expect(m.levels).toBe(4);
    // 1 + 3 + 2 + 8 + 8 + 3 + 2 = 27
    expect(m.headcount).toBe(27);
    // Owner, three managers, two supervisors
    expect(m.managers).toBe(6);
    // 26 people report to someone, across 6 managers: 4.33
    expect(m.averageSpan).toBeCloseTo(26 / 6, 10);
  });

  it('measures each span of control in people', () => {
    expect(m.span.owner).toBe(3);
    expect(m.span.production).toBe(2);
    expect(m.span.sales).toBe(3);
    expect(m.span.finance).toBe(2);
    expect(m.span['supervisor-a']).toBe(8);
    expect(m.span['assemblers-a']).toBe(0);
    expect(m.widest).toEqual({ id: 'supervisor-a', span: 8 });
  });

  it('summarises the spans level by level', () => {
    expect(m.byLevel.map((l) => [l.level, l.posts, l.people, l.managers])).toEqual([
      [1, 1, 1, 1],
      [2, 3, 3, 3],
      [3, 4, 7, 2],
      [4, 2, 16, 0],
    ]);
    expect(m.byLevel[1]?.spans).toEqual([2, 3, 2]);
    expect(m.byLevel[1]?.meanSpan).toBeCloseTo(7 / 3, 10);
    expect(m.byLevel[2]?.spans).toEqual([8, 8]);
    expect(m.byLevel[3]?.meanSpan).toBeNull();
  });

  it('traces chains of command to the top', () => {
    expect(m.longestChain).toEqual(['assemblers-a', 'supervisor-a', 'production', 'owner']);
    expect(chainOf(m, 'sales-staff')).toEqual(['sales-staff', 'sales', 'owner']);
    expect(chainOf(m, 'owner')).toEqual(['owner']);
  });

  it('names the structure: functional, between tall and flat', () => {
    expect(m.shape).toBe('between');
    expect(m.grouping).toBe('function');
    expect(describeStructure(m).name).toBe('A functional structure, between tall and flat');
  });
});

describe('the platform rule of thumb for tall and flat', () => {
  it('reads the diagram in the notes: four levels with spans of two is tall, two levels is flat', () => {
    expect(shapeOf(4, 2)).toBe('tall');
    expect(shapeOf(2, 14)).toBe('flat');
  });
  it('uses the stated thresholds', () => {
    expect(shapeOf(3, 6)).toBe('flat');
    expect(shapeOf(3, 5)).toBe('flat');
    expect(shapeOf(3, 4.9)).toBe('between');
    expect(shapeOf(4, 26 / 6)).toBe('between');
    expect(shapeOf(5, 9)).toBe('tall');
    expect(shapeOf(4, 2.9)).toBe('tall');
    expect(shapeOf(1, null)).toBe('flat');
  });
});

describe('grouping of departments', () => {
  it('is mixed when the departments are grouped in different ways, and ignores posts with none', () => {
    const posts = MARRICK.map((p) => (p.id === 'sales' ? { ...p, grouping: 'region' as const } : p.id === 'finance' ? { ...p, grouping: null } : p));
    const m = orgModel(posts);
    expect(groupingOf(m)).toBe('mixed');
    const unstated = orgModel(MARRICK.map((p) => ({ ...p, grouping: null })));
    expect(unstated.grouping).toBe('unstated');
    expect(describeStructure(unstated).name).toBe('A structure between tall and flat');
  });
});

describe('delayering', () => {
  const m = orgModel(MARRICK);

  it('offers the levels below the top that have managers', () => {
    expect(delayerLevels(m)).toEqual([
      { level: 2, posts: ['production', 'sales', 'finance'] },
      { level: 3, posts: ['supervisor-a', 'supervisor-b'] },
    ]);
  });

  it('removes the supervisors: the assemblers report to the production manager', () => {
    const d = delayerResult(MARRICK, m, 3);
    expect(d).not.toBeNull();
    if (!d) return;
    expect(d.removed.map((p) => p.id)).toEqual(['supervisor-a', 'supervisor-b']);
    expect(d.removedPeople).toBe(2);
    expect(d.after.levels).toBe(3);
    expect(d.after.headcount).toBe(25);
    expect(d.after.managers).toBe(4);
    // 24 people report to someone, across 4 managers: 6
    expect(d.after.averageSpan).toBe(6);
    expect(d.after.widest).toEqual({ id: 'production', span: 16 });
    expect(d.after.shape).toBe('flat');
    expect(d.spanChanges).toEqual([{ id: 'production', before: 2, after: 16 }]);
    expect(d.after.longestChain).toEqual(['assemblers-a', 'production', 'owner']);
    // The sales advisers at level 3 stay: they manage no one.
    expect(d.after.posts.some((p) => p.id === 'sales-staff')).toBe(true);
  });

  it('removes the department managers: their staff report to the owner', () => {
    const d = delayerResult(MARRICK, m, 2);
    if (!d) throw new Error('level 2 should be removable');
    // Owner's span: 1 + 1 + 3 + 2 = 7
    expect(d.after.span.owner).toBe(7);
    expect(d.after.managers).toBe(3);
    // 23 people report to someone, across 3 managers
    expect(d.after.averageSpan).toBeCloseTo(23 / 3, 10);
  });

  it('refuses a level with no managers, and the top level', () => {
    expect(delayerResult(MARRICK, m, 4)).toBeNull();
    expect(delayerResult(MARRICK, m, 1)).toBeNull();
  });

  it('moves staff to the nearest manager who is kept', () => {
    const { posts } = delayer(MARRICK, m, 3);
    expect(posts.find((p) => p.id === 'assemblers-b')?.reportsTo).toBe('production');
  });

  it('says what changes, in words', () => {
    const d = delayerResult(MARRICK, m, 3);
    const r = readOrg(m, title, d);
    expect(r.reading).toContain('from 4 to 3 levels');
    expect(r.reading).toContain('from 4.3 to 6');
    expect(r.reading).toContain("Production manager's span rises from 2 to 16");
    expect(r.implication).toContain('span of 16 is very wide');
    expect(readOrg(m, title, null).reading).toContain('The widest span of control is 8, for Supervisor, team A.');
  });
});

describe('checking a chart', () => {
  const withChange = (id: string, change: Partial<OrgPost>) => MARRICK.map((p) => (p.id === id ? { ...p, ...change } : p));
  const fields = (posts: OrgPost[]) => validateOrg(posts).map((p) => `${p.id ?? '-'}:${p.field}`);

  it('needs exactly one top post', () => {
    expect(fields(withChange('sales', { reportsTo: null }))).toContain('sales:reportsTo');
    expect(validateOrg(MARRICK.map((p) => (p.id === 'owner' ? { ...p, reportsTo: 'finance' } : p))).some((p) => p.field === 'chart')).toBe(true);
  });
  it('rejects a loop in the chain of command', () => {
    const loop = withChange('production', { reportsTo: 'supervisor-a' });
    expect(validateOrg(loop).some((p) => p.message.includes('loops back'))).toBe(true);
  });
  it('rejects reports to a post held by several people', () => {
    const posts = [...MARRICK, { id: 'trainee', title: 'Trainee', reportsTo: 'sales-staff', count: 1 }];
    expect(fields(posts)).toContain('sales-staff:count');
  });
  it('rejects empty titles, missing managers, self-reporting and impossible numbers of people', () => {
    expect(fields(withChange('sales', { title: '  ' }))).toContain('sales:title');
    expect(fields(withChange('sales', { reportsTo: 'nobody' }))).toContain('sales:reportsTo');
    expect(fields(withChange('sales', { reportsTo: 'sales' }))).toContain('sales:reportsTo');
    expect(fields(withChange('sales-staff', { count: 0 }))).toContain('sales-staff:count');
    expect(fields(withChange('sales-staff', { count: 2.5 }))).toContain('sales-staff:count');
    expect(fields(withChange('sales-staff', { count: Number.NaN }))).toContain('sales-staff:count');
  });
  it('limits a chart to sixty posts', () => {
    const many: OrgPost[] = [{ id: 'top', title: 'Top', reportsTo: null, count: 1 }, ...Array.from({ length: 60 }, (_, k) => ({ id: `p${k}`, title: `Post ${k}`, reportsTo: 'top', count: 1 }))];
    expect(validateOrg(many).some((p) => p.field === 'chart')).toBe(true);
  });
});

describe('the chart as a picture, a list and a file', () => {
  const m = orgModel(MARRICK);

  it('places each manager over its reports, one row per level', () => {
    const { place, width, height } = layoutOrg(m);
    const x = (id: string) => place[id]?.cx ?? 0;
    expect(x('supervisor-a')).toBe(x('assemblers-a'));
    expect(x('production')).toBe((x('supervisor-a') + x('supervisor-b')) / 2);
    expect(x('owner')).toBe((x('production') + x('finance')) / 2);
    expect(place['assemblers-a']?.y).toBeGreaterThan(place['supervisor-a']?.y ?? 0);
    expect(width).toBeGreaterThan(4 * 150);
    expect(height).toBeGreaterThan(4 * 50);
  });

  it('draws an accessible SVG whose description states the result', () => {
    const svg = orgChartSvg(m, { id: 't', organization: 'Marrick Cycles', chain: m.longestChain, removed: ['supervisor-a'] });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title id="t-t">Organization chart: Marrick Cycles</title>');
    expect(svg).toContain('4 levels of hierarchy');
    expect(svg).toContain('Owner (span of control 3)');
    expect(svg).toContain('Removed by delayering');
  });

  it('gives the same chart as a nested list', () => {
    const html = orgOutlineHtml(m);
    expect(html.indexOf('Owner')).toBeLessThan(html.indexOf('Production manager'));
    expect(html).toContain('level 4, 8 people');
    expect((html.match(/<ul>/g) ?? []).length).toBe(6);
  });

  it('keeps each manager before its reports', () => {
    const shuffled = [...MARRICK].reverse();
    expect(treeOrder(shuffled).map((p) => p.id).slice(0, 3)).toEqual(['owner', 'finance', 'finance-clerks']);
  });

  it('reads back a saved file and rejects anything else', () => {
    const saved = JSON.parse(JSON.stringify({ tool: 'organization-chart', organization: 'Marrick Cycles', posts: MARRICK, delayer: 3 })) as unknown;
    const back = parseOrgFile(saved);
    expect(back?.posts).toHaveLength(10);
    expect(back?.delayer).toBe(3);
    expect(validateOrg(back?.posts ?? [])).toEqual([]);
    expect(parseOrgFile({ posts: 'none' })).toBeNull();
    expect(parseOrgFile(null)).toBeNull();
    expect(parseOrgFile({ posts: [{ id: 1 }] })).toBeNull();
  });

  it('exports one row per post for a spreadsheet', () => {
    const rows = orgCsvRows(m);
    expect(rows[0]).toEqual(['Post', 'Reports to', 'People in the post', 'Level', 'Span of control']);
    expect(rows.find((r) => r[0] === 'Supervisor, team A')).toEqual(['Supervisor, team A', 'Production manager', '1', '3', '8']);
  });
});

describe('the published worked example', () => {
  it('is the chart in the notes', () => {
    const it = loadTool('people-org-chart', 'org-chart-builder');
    const posts = it.posts.map((p) => ({ ...p, reportsTo: p.reportsTo ?? null }));
    const m = orgModel(posts);
    expect(m.headcount).toBe(27);
    expect(m.levels).toBe(4);
    expect(m.span.owner).toBe(3);
    expect(it.delayer).toBe(3);
  });
});
