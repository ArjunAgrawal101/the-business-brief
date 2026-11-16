/**
 * The Framework Application Lab: the hub at /frameworks/lab/ that helps a
 * reader choose a framework by the decision in front of them, and the
 * "Apply it" mode on every framework page.
 *
 * - `applyTools()` is the directory of the platform's interactive tools a
 *   framework can be applied in, built from the rooms' working pages in
 *   modules.yaml, the Finance Desk's workspaces and the Financial
 *   Laboratory's calculators. Every address in a framework's `apply` list
 *   must be in it (checked by src/lib/integrity-frameworks.ts).
 * - `byDecision()` files the frameworks under the questions of the hub.
 * - `ADVANCED` lists the advanced applications the hub features: four
 *   existing Strategy Studio tools and the three added with the Lab.
 *
 * Pure functions with no `astro:content` import, so the unit tests use them.
 */
import type { z } from 'astro/zod';
import { DECISION_IDS, DECISION_INFO, type DecisionId, type Framework } from './framework-schema';
import type { moduleSchema } from './schemas';
import { LAB, labHref } from './finance-lab/catalogue';
import { inLibraryOrder } from './frameworks';

type ModuleData = z.infer<typeof moduleSchema>;
type Dict<T> = Record<string, T>;

/** A page where a framework can be applied. */
export interface ApplyTool {
  href: string;
  title: string;
  /** The room it belongs to, and the room's page. */
  room: string;
  roomHref: string;
}

/** The rooms whose working pages (in modules.yaml) can apply a framework. */
const TOOL_ROOMS = ['strategy-studio', 'market-studio', 'people-and-culture', 'operations-floor', 'entrepreneurship-lab', 'case-room'] as const;
/** The kinds of room item that are tools rather than reading. */
const TOOL_KINDS = new Set(['Workspace', 'Planner', 'Calculation', 'Interaction', 'Case lab']);

/** The Finance Desk's workspaces, which modules.yaml does not list item by item. */
export const FINANCE_DESK_PAGES: Array<{ href: string; title: string }> = [
  { href: '/finance-desk/costs-and-revenue/', title: 'Costs and revenue workspace' },
  { href: '/finance-desk/break-even/', title: 'Break-even workspace' },
  { href: '/finance-desk/contribution/', title: 'Contribution decisions' },
  { href: '/finance-desk/ratios/', title: 'Ratio desk' },
  { href: '/finance-desk/cash-flow/', title: 'Cash flow lab' },
  { href: '/finance-desk/investment-appraisal/', title: 'Investment appraisal desk' },
];

/** Every page a framework can be applied in, by address. */
export function applyTools(modules: Dict<ModuleData>): Map<string, ApplyTool> {
  const out = new Map<string, ApplyTool>();
  for (const id of TOOL_ROOMS) {
    const m = modules[id];
    if (!m) continue;
    for (const it of m.items) {
      if (!TOOL_KINDS.has(it.kind) || it.href.includes('#')) continue;
      out.set(it.href, { href: it.href, title: it.title, room: m.name, roomHref: m.href ?? '/rooms/' });
    }
  }
  for (const p of FINANCE_DESK_PAGES) out.set(p.href, { ...p, room: 'Finance Desk', roomHref: '/finance-desk/' });
  for (const e of LAB) out.set(labHref(e.id), { href: labHref(e.id), title: e.name, room: 'Financial Laboratory', roomHref: '/finance-desk/lab/' });
  return out;
}

/** The key under which the worksheet keeps the reader's entry for one part of a framework. */
export function partKey(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `part:${s}`;
}

/** The Apply it section of a framework's page: the anchor the hub opens. */
export const APPLY_ANCHOR = 'apply';
export const applyHref = (id: string) => `/frameworks/${id}/#${APPLY_ANCHOR}`;

/** The application mode of a framework: its tools, and whether one of them applies it in full. */
export function applicationOf(f: Framework, tools: Map<string, ApplyTool>): { full: Array<ApplyTool & { use: string }>; part: Array<ApplyTool & { use: string }> } {
  const listed = f.apply.flatMap((a) => {
    const t = tools.get(a.href);
    return t ? [{ ...t, use: a.use, scope: a.scope }] : [];
  });
  return { full: listed.filter((x) => x.scope === 'full'), part: listed.filter((x) => x.scope === 'part') };
}

export interface DecisionGroup {
  id: DecisionId;
  question: string;
  situation: string;
  /** Strategy Studio tools, by slug, that answer the question directly. */
  tools: string[];
  items: Array<[string, Framework]>;
}

/** The frameworks filed under each of the hub's questions, in library order. */
export function byDecision(frameworks: Dict<Framework>): DecisionGroup[] {
  const all = inLibraryOrder(frameworks);
  return DECISION_IDS.map((id) => ({ id, question: DECISION_INFO[id].question, situation: DECISION_INFO[id].situation, tools: DECISION_INFO[id].tools ?? [], items: all.filter(([, f]) => f.decisions.includes(id)) }));
}

/**
 * The advanced applications the hub features: each a Strategy Studio tool,
 * what it computes beyond drawing the framework, and the framework page it
 * applies, where the library has one.
 */
export const ADVANCED: Array<{ slug: string; framework?: string; name: string; computes: string; added?: boolean }> = [
  {
    slug: 'five-forces',
    framework: 'five-forces',
    name: 'Five forces with industry attractiveness',
    computes: 'Each force rated from 1 to 5 with evidence, averaged into an attractiveness band, with the one-point changes that would move the market into another band.',
  },
  {
    slug: 'ansoff',
    framework: 'ansoff-matrix',
    name: 'Ansoff with a risk comparison',
    computes: 'Your options placed in the four directions and ranked from the lowest usual risk to the highest, each with its method of growth and your note on the risk particular to it.',
  },
  {
    slug: 'bcg-matrix',
    framework: 'bcg-matrix',
    name: 'BCG with portfolio implications',
    computes: 'Products plotted by relative market share and market growth and sized by revenue, with what the balance of cows, stars, question marks and dogs implies for cash.',
  },
  {
    slug: 'decision-tree',
    framework: 'decision-trees',
    name: 'Decision trees with expected monetary values',
    computes: 'Expected values rolled back from the outcomes and netted of costs, the best branch marked, and the worst result and chance of a loss behind each option.',
  },
  {
    slug: 'scenarios',
    name: 'Scenario planning',
    computes: 'Driving forces sorted by impact and uncertainty, a two by two of four futures on the two critical uncertainties, each with a narrative, implications and early-warning signposts, and your options tested in every future.',
    added: true,
  },
  {
    slug: 'stakeholder-salience',
    framework: 'mendelow-matrix',
    name: 'Stakeholder salience',
    computes: 'Each stakeholder judged on power, legitimacy and urgency, placed in one of the seven classes, with what the class asks of managers and the class it would move to if it gained or lost an attribute.',
    added: true,
  },
  {
    slug: 'strategic-fit',
    framework: 'mckinsey-7s',
    name: 'Strategic fit',
    computes: 'External fit with the key factors in the environment, readiness of the capabilities the strategy needs, and a McKinsey 7S consistency check, judged by the weakest of the three.',
    added: true,
  },
];

/** The plain statement the hub and every Apply it section make. */
export const JUDGEMENT = 'Frameworks structure judgement; they do not produce answers. Each one organizes evidence so that you can see it, test it and argue from it, and the decision, and the reasons for it, remain yours.';
