/**
 * The organization chart creator (2.2): a chart as a tree of posts, each
 * reporting to one manager, and the measures the guide's terms describe:
 * levels of the hierarchy, span of control, chain of command and the effect
 * of delayering. Pure functions, shared by the page, its script and the tests.
 *
 * Span of control is counted in people: a post held by eight assemblers adds
 * eight to its manager's span. The labels "tall", "flat" and "between" use the
 * platform's rule of thumb (shapeOf), not an IB definition.
 */

export type Grouping = 'function' | 'product' | 'region';

export interface OrgPost {
  id: string;
  title: string;
  /** The post this one reports to; null or undefined for the top post. */
  reportsTo?: string | null;
  /** How many people hold the post. */
  count: number;
  grouping?: Grouping | null;
}

export interface OrgProblem {
  /** The post the problem belongs to, or null for the chart as a whole. */
  id: string | null;
  field: 'title' | 'reportsTo' | 'count' | 'chart';
  message: string;
}

export const MAX_POSTS = 60;
export const MAX_HOLDERS = 999;
export const MAX_TITLE = 60;

const parentOf = (p: OrgPost) => (p.reportsTo ? p.reportsTo : null);

/** Everything that stops a chart from being drawn, by post and field. */
export function validateOrg(posts: OrgPost[]): OrgProblem[] {
  const out: OrgProblem[] = [];
  if (posts.length === 0) return [{ id: null, field: 'chart', message: 'Add at least one post.' }];
  if (posts.length > MAX_POSTS) out.push({ id: null, field: 'chart', message: `The tool draws up to ${MAX_POSTS} posts. Group identical posts into one post held by several people.` });
  const seen = new Set<string>();
  for (const p of posts) {
    if (seen.has(p.id)) out.push({ id: p.id, field: 'chart', message: 'Two posts share the same identifier.' });
    seen.add(p.id);
  }
  const byId = new Map(posts.map((p) => [p.id, p]));
  for (const p of posts) {
    const t = p.title.trim();
    if (!t) out.push({ id: p.id, field: 'title', message: 'Give the post a title.' });
    else if (t.length > MAX_TITLE) out.push({ id: p.id, field: 'title', message: `Keep the title to ${MAX_TITLE} characters.` });
    if (!Number.isInteger(p.count) || p.count < 1) out.push({ id: p.id, field: 'count', message: 'Enter a whole number of people, 1 or more.' });
    else if (p.count > MAX_HOLDERS) out.push({ id: p.id, field: 'count', message: `Enter ${MAX_HOLDERS} people or fewer.` });
    const parent = parentOf(p);
    if (parent !== null) {
      if (parent === p.id) out.push({ id: p.id, field: 'reportsTo', message: 'A post cannot report to itself.' });
      else if (!byId.has(parent)) out.push({ id: p.id, field: 'reportsTo', message: 'Choose a post that is on the chart.' });
    }
  }
  const tops = posts.filter((p) => parentOf(p) === null);
  if (tops.length === 0) out.push({ id: null, field: 'chart', message: 'One post must be at the top, reporting to no one.' });
  tops.slice(1).forEach((p) => out.push({ id: p.id, field: 'reportsTo', message: `Only one post can be at the top. Choose who this post reports to (the top post is ${tops[0]?.title.trim() || 'the first post'}).` }));
  // A chain of command that loops back on itself never reaches the top.
  for (const p of posts) {
    const visited = new Set<string>([p.id]);
    let cur = parentOf(p);
    while (cur !== null) {
      if (visited.has(cur)) {
        out.push({ id: p.id, field: 'reportsTo', message: 'This line of reporting loops back on itself and never reaches the top.' });
        break;
      }
      visited.add(cur);
      const next = byId.get(cur);
      cur = next ? parentOf(next) : null;
    }
  }
  for (const p of posts) {
    if (p.count > 1 && posts.some((q) => parentOf(q) === p.id)) {
      out.push({ id: p.id, field: 'count', message: 'A post held by several people cannot have staff reporting to it. Split it into separate posts first.' });
    }
  }
  return out;
}

export interface OrgLevel {
  level: number;
  /** Posts at this level. */
  posts: number;
  people: number;
  /** Posts at this level that have someone reporting to them. */
  managers: number;
  /** The span of control of each manager at this level, in people. */
  spans: number[];
  minSpan: number | null;
  maxSpan: number | null;
  meanSpan: number | null;
}

export type Shape = 'tall' | 'flat' | 'between';
export type GroupingVerdict = Grouping | 'mixed' | 'unstated';

export interface OrgModel {
  posts: OrgPost[];
  top: string;
  /** Level of each post: 1 for the top post. */
  depth: Record<string, number>;
  children: Record<string, string[]>;
  /** People reporting directly to each post. */
  span: Record<string, number>;
  levels: number;
  headcount: number;
  managers: number;
  /** Direct reports per manager, in people: (headcount − holders of the top post) ÷ managers. */
  averageSpan: number | null;
  widest: { id: string; span: number } | null;
  byLevel: OrgLevel[];
  /** The longest chain of command, from a post at the lowest level up to the top. */
  longestChain: string[];
  shape: Shape;
  grouping: GroupingVerdict;
}

/** The model of a chart that has passed validateOrg. */
export function orgModel(posts: OrgPost[]): OrgModel {
  const top = posts.find((p) => parentOf(p) === null);
  if (!top) throw new Error('orgModel: the chart has no top post');
  const children: Record<string, string[]> = Object.fromEntries(posts.map((p) => [p.id, [] as string[]]));
  for (const p of posts) {
    const parent = parentOf(p);
    if (parent !== null) children[parent]?.push(p.id);
  }
  const byId = new Map(posts.map((p) => [p.id, p]));
  const depth: Record<string, number> = {};
  const walk = (id: string, d: number) => {
    depth[id] = d;
    for (const k of children[id] ?? []) walk(k, d + 1);
  };
  walk(top.id, 1);
  const span: Record<string, number> = Object.fromEntries(posts.map((p) => [p.id, (children[p.id] ?? []).reduce((n, k) => n + (byId.get(k)?.count ?? 0), 0)]));
  const levels = Math.max(...Object.values(depth));
  const headcount = posts.reduce((n, p) => n + p.count, 0);
  const managerIds = posts.filter((p) => (children[p.id] ?? []).length > 0).map((p) => p.id);
  const managers = managerIds.length;
  const averageSpan = managers > 0 ? (headcount - top.count) / managers : null;
  let widest: OrgModel['widest'] = null;
  for (const id of managerIds) {
    const s = span[id] ?? 0;
    if (!widest || s > widest.span) widest = { id, span: s };
  }
  const byLevel: OrgLevel[] = [];
  for (let l = 1; l <= levels; l += 1) {
    const at = posts.filter((p) => depth[p.id] === l);
    const spans = at.filter((p) => (children[p.id] ?? []).length > 0).map((p) => span[p.id] ?? 0);
    byLevel.push({
      level: l,
      posts: at.length,
      people: at.reduce((n, p) => n + p.count, 0),
      managers: spans.length,
      spans,
      minSpan: spans.length ? Math.min(...spans) : null,
      maxSpan: spans.length ? Math.max(...spans) : null,
      meanSpan: spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : null,
    });
  }
  const deepest = posts.find((p) => depth[p.id] === levels) ?? top;
  const model: OrgModel = { posts, top: top.id, depth, children, span, levels, headcount, managers, averageSpan, widest, byLevel, longestChain: [], shape: 'between', grouping: 'unstated' };
  model.longestChain = chainOf(model, deepest.id);
  model.shape = shapeOf(levels, averageSpan);
  model.grouping = groupingOf(model);
  return model;
}

/** The chain of command from a post up to the top, as post ids. */
export function chainOf(model: Pick<OrgModel, 'posts'>, id: string): string[] {
  const byId = new Map(model.posts.map((p) => [p.id, p]));
  const out: string[] = [];
  let cur: string | null = id;
  while (cur !== null && byId.has(cur) && !out.includes(cur)) {
    out.push(cur);
    const p = byId.get(cur);
    cur = p ? parentOf(p) : null;
  }
  return out;
}

/**
 * The platform's rule of thumb, not an IB definition: flat when there are
 * two levels, or three or fewer with five or more direct reports per manager
 * on average; tall when there are five or more levels, or fewer than three
 * direct reports per manager; otherwise between the two.
 */
export function shapeOf(levels: number, averageSpan: number | null): Shape {
  if (levels <= 2) return 'flat';
  const avg = averageSpan ?? 0;
  if (levels >= 5 || avg < 3) return 'tall';
  if (levels <= 3 && avg >= 5) return 'flat';
  return 'between';
}

/** How the departments under the top post are grouped, from the groupings the reader gave them. */
export function groupingOf(model: Pick<OrgModel, 'posts' | 'top' | 'children'>): GroupingVerdict {
  const byId = new Map(model.posts.map((p) => [p.id, p]));
  const set = (model.children[model.top] ?? []).map((id) => byId.get(id)?.grouping).filter((g): g is Grouping => Boolean(g));
  if (!set.length) return 'unstated';
  return set.every((g) => g === set[0]) ? (set[0] as Grouping) : 'mixed';
}

/** The levels from which a layer of management can be removed: below the top, with at least one manager. */
export function delayerLevels(model: OrgModel): Array<{ level: number; posts: string[] }> {
  const out: Array<{ level: number; posts: string[] }> = [];
  for (let l = 2; l < model.levels; l += 1) {
    const managers = model.posts.filter((p) => model.depth[p.id] === l && (model.children[p.id] ?? []).length > 0).map((p) => p.id);
    if (managers.length) out.push({ level: l, posts: managers });
  }
  return out;
}

/**
 * Delayering: remove every management post at one level. The people who
 * reported to a removed post now report to that post's own manager. Posts at
 * the level with no reports (front-line staff) stay where they are.
 */
export function delayer(posts: OrgPost[], model: OrgModel, level: number): { posts: OrgPost[]; removed: OrgPost[] } {
  const removedIds = new Set(posts.filter((p) => model.depth[p.id] === level && (model.children[p.id] ?? []).length > 0).map((p) => p.id));
  const byId = new Map(posts.map((p) => [p.id, p]));
  const ancestorKept = (id: string | null): string | null => {
    let cur = id;
    while (cur !== null && removedIds.has(cur)) {
      const p = byId.get(cur);
      cur = p ? parentOf(p) : null;
    }
    return cur;
  };
  const kept = posts.filter((p) => !removedIds.has(p.id)).map((p) => ({ ...p, reportsTo: ancestorKept(parentOf(p)) }));
  return { posts: kept, removed: posts.filter((p) => removedIds.has(p.id)) };
}

export interface DelayerResult {
  level: number;
  removed: OrgPost[];
  removedPeople: number;
  after: OrgModel;
  /** Each manager whose span changed: before and after. */
  spanChanges: Array<{ id: string; before: number; after: number }>;
}

export function delayerResult(posts: OrgPost[], model: OrgModel, level: number): DelayerResult | null {
  if (!delayerLevels(model).some((x) => x.level === level)) return null;
  const { posts: kept, removed } = delayer(posts, model, level);
  const after = orgModel(kept);
  const spanChanges = kept
    .filter((p) => (after.span[p.id] ?? 0) !== (model.span[p.id] ?? 0))
    .map((p) => ({ id: p.id, before: model.span[p.id] ?? 0, after: after.span[p.id] ?? 0 }));
  return { level, removed, removedPeople: removed.reduce((n, p) => n + p.count, 0), after, spanChanges };
}

/* ---------- Words ---------- */

const n1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

export const SHAPE_LABEL: Record<Shape, string> = { tall: 'tall (vertical)', flat: 'flat (horizontal)', between: 'between tall and flat' };
export const GROUPING_LABEL: Record<GroupingVerdict, string> = {
  function: 'grouped by function',
  product: 'grouped by product',
  region: 'grouped by region',
  mixed: 'grouped in more than one way (a hybrid)',
  unstated: 'grouping not stated',
};

/** The structure the chart resembles, and the evidence for it. */
export function describeStructure(model: OrgModel): { name: string; reasons: string[] } {
  const g = model.grouping;
  const kind = g === 'function' ? 'functional' : g === 'product' ? 'product-based' : g === 'region' ? 'regional' : g === 'mixed' ? 'hybrid' : '';
  const s = model.shape;
  const name = kind
    ? s === 'between'
      ? `A ${kind} structure, between tall and flat`
      : `A ${s}, ${kind} structure`
    : s === 'between'
      ? 'A structure between tall and flat'
      : `A ${s} structure`;
  const avg = model.averageSpan;
  const reasons: string[] = [];
  reasons.push(
    avg === null
      ? `It has ${model.levels} level${model.levels === 1 ? '' : 's'} and no one reports to anyone yet.`
      : `It has ${model.levels} levels of hierarchy for ${people(model.headcount)}, and each manager has ${n1(avg)} direct reports on average.`,
  );
  if (model.shape === 'tall') reasons.push('Many levels or narrow spans of control mean close supervision and a ladder of promotion, but long chains of command that slow decisions and messages.');
  if (model.shape === 'flat') reasons.push('Few levels and wide spans of control mean short chains of command and quick communication, but stretched managers and fewer steps for promotion.');
  if (model.shape === 'between') reasons.push('Neither clearly tall nor flat: compare it with the chart after delayering, or with another business of its size.');
  if (g === 'function') reasons.push('The departments under the top post are functions, such as production, sales and finance, so specialists work together.');
  if (g === 'product') reasons.push('The departments under the top post are products or product ranges, each with its own customers and rivals.');
  if (g === 'region') reasons.push('The departments under the top post are regions, each adapting to its own market.');
  if (g === 'mixed') reasons.push('The departments under the top post are grouped in different ways, which large organizations often combine.');
  if (g === 'unstated') reasons.push('Say what each department under the top post is grouped by, and the tool will name the type of chart.');
  return { name, reasons };
}

/** The reading and the business implication of a chart, with the delayering result when there is one. */
export function readOrg(model: OrgModel, title: (id: string) => string, d: DelayerResult | null): { reading: string; implication: string } {
  const w = model.widest;
  const chain = model.longestChain;
  const base = `${describeStructure(model).name}: ${model.levels} levels, ${people(model.headcount)} in ${model.posts.length} posts, ${model.managers} manager${model.managers === 1 ? '' : 's'}.`;
  const widest = w ? ` The widest span of control is ${w.span}, for ${title(w.id)}.` : '';
  const longest = chain.length > 1 ? ` The longest chain of command runs through ${chain.length} posts, from ${title(chain[0] ?? '')} to ${title(chain[chain.length - 1] ?? '')}.` : '';
  if (!d) {
    return {
      reading: `${base}${widest}${longest}`,
      implication:
        model.shape === 'tall'
          ? 'A message from the bottom of the chart passes many managers before it reaches someone who can decide. Delayering would shorten that chain, at the cost of wider spans.'
          : model.shape === 'flat'
            ? 'Decisions travel quickly, but each manager supervises many people. Check that the widest spans are manageable and that staff have the skills to work with little supervision.'
            : 'Try removing a layer of management to see what delayering would do to the spans of control and the chain of command.',
    };
  }
  const a = d.after;
  const changed = d.spanChanges.filter((c) => c.after > c.before).sort((x, y) => y.after - x.after)[0];
  const reading = `Removing level ${d.level} takes out ${d.removed.length} post${d.removed.length === 1 ? '' : 's'} (${people(d.removedPeople)}): the chart goes from ${model.levels} to ${a.levels} levels, and the average span of control from ${model.averageSpan === null ? 'none' : n1(model.averageSpan)} to ${a.averageSpan === null ? 'none' : n1(a.averageSpan)}.${changed ? ` ${title(changed.id)}'s span rises from ${changed.before} to ${changed.after}.` : ''} The longest chain of command falls from ${model.longestChain.length} to ${a.longestChain.length} posts.`;
  const implication =
    a.widest && a.widest.span > 12
      ? `Decisions reach the front line faster and ${d.removed.length === 1 ? 'a salary is' : 'salaries are'} saved, but a span of ${a.widest.span} is very wide: the managers left behind need staff who can work with little supervision, or the change brings overload rather than freedom.`
      : 'Decisions reach the front line faster and management salaries are saved, but the managers who remain carry wider spans, a step on the promotion ladder disappears, and the experience of the people removed goes with them.';
  return { reading, implication };
}

/* ---------- Saved and imported charts ---------- */

/** Reads a chart saved by the tool, or returns null if the data is not a chart. */
export function parseOrgFile(data: unknown): { organization: string; posts: OrgPost[]; delayer: number | null } | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.posts)) return null;
  const posts: OrgPost[] = [];
  for (const raw of d.posts) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.title !== 'string') return null;
    const count = typeof r.count === 'number' ? r.count : 1;
    const reportsTo = typeof r.reportsTo === 'string' && r.reportsTo ? r.reportsTo : null;
    const grouping = r.grouping === 'function' || r.grouping === 'product' || r.grouping === 'region' ? r.grouping : null;
    posts.push({ id: r.id.slice(0, 40), title: r.title.slice(0, 200), reportsTo, count, grouping });
  }
  if (!posts.length || posts.length > MAX_POSTS) return null;
  const organization = typeof d.organization === 'string' ? d.organization.slice(0, 80) : '';
  const delayerLevel = typeof d.delayer === 'number' && Number.isInteger(d.delayer) ? d.delayer : null;
  return { organization, posts, delayer: delayerLevel };
}

/** The chart as rows for a spreadsheet: post, reports to, people, level, span of control. */
export function orgCsvRows(model: OrgModel): string[][] {
  const title = (id: string | null | undefined) => model.posts.find((p) => p.id === id)?.title ?? '';
  return [
    ['Post', 'Reports to', 'People in the post', 'Level', 'Span of control'],
    ...model.posts.map((p) => [p.title, title(p.reportsTo), String(p.count), String(model.depth[p.id] ?? ''), String(model.span[p.id] ?? 0)]),
  ];
}
