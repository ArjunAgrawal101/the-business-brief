/**
 * Decision tree builder: a free-form tree of decision nodes, chance nodes and
 * outcomes. Expected values roll back from the outcomes: a chance node's value
 * is the sum of probability times value over its outcomes (worked, and its
 * probabilities checked, by evaluateOption in src/lib/decision-tree.ts), and
 * a decision node takes the branch with the highest value net of its cost.
 * The guide names decision trees as a toolkit tool for SL and HL (p. 14).
 */
import { esc } from '../markup';
import { fmtNumber, round } from '../format';
import { evaluateOption, treeMoney } from '../decision-tree';
import { type Check, count, andList, fileSlug, list, nextId, numOrNull, obj, oneOf, orDash, str, textDoc, textSection, toCsv } from './common';
import { C, r1, svgDoc, textWidth, txt } from './svg';
import { button, chartRegion, checksHtml, field, select, tableRegion } from './ui';

export type NodeKind = 'decision' | 'chance' | 'end';

export interface TreeNode {
  id: string;
  /** The node above, or "" for the first node. */
  parent: string;
  kind: NodeKind;
  label: string;
  /** On a branch out of a decision node: what choosing it costs. */
  cost?: number | null;
  /** On a branch out of a chance node: its probability. */
  prob?: number | null;
  /** On an outcome: its payoff, before the costs on the way to it. */
  payoff?: number | null;
}

export interface TreeState {
  business: string;
  question: string;
  currency: string;
  unit: string;
  nodes: TreeNode[];
}

export const KIND_NAMES: Record<NodeKind, string> = { decision: 'Decision', chance: 'Chance', end: 'Outcome' };
const KINDS: NodeKind[] = ['decision', 'chance', 'end'];
export const LIMITS = { nodes: 40, depth: 5 };
const ID = /^[a-z][a-z0-9-]{0,23}$/;

/* ---------- Structure ---------- */

export function childrenOf(s: TreeState, id: string): TreeNode[] {
  return s.nodes.filter((n) => n.parent === id);
}

export function rootOf(s: TreeState): TreeNode | undefined {
  return s.nodes.find((n) => n.parent === '');
}

export function depthOf(s: TreeState, id: string): number {
  let d = 0;
  let cur = s.nodes.find((n) => n.id === id);
  while (cur && cur.parent !== '' && d < 50) {
    const parentId: string = cur.parent;
    cur = s.nodes.find((n) => n.id === parentId);
    d += 1;
  }
  return d;
}

/** Ids of a node and everything below it. */
export function subtree(s: TreeState, id: string): string[] {
  const out = [id];
  for (const c of childrenOf(s, id)) out.push(...subtree(s, c.id));
  return out;
}

/* ---------- Reading saved work ---------- */

/**
 * Reads a tree defensively: one root, no loops, no orphans, at most the node
 * and depth limits, nodes in depth-first order, and on each node only the
 * figures that mean something there.
 */
export function normalize(raw: unknown): TreeState {
  const r = obj(raw);
  const rows = list(r.nodes, 200).map(obj);
  const seen = new Set<string>();
  const items = rows
    .map((x) => ({ x, id: typeof x.id === 'string' && ID.test(x.id) ? x.id : '' }))
    .filter(({ id }) => id && !seen.has(id) && (seen.add(id), true));
  const byParent = new Map<string, Array<Record<string, unknown>>>();
  for (const { x, id } of items) {
    const parent = typeof x.parent === 'string' && seen.has(x.parent) && x.parent !== id ? x.parent : '';
    const list_ = byParent.get(parent) ?? [];
    list_.push({ ...x, id, parent });
    byParent.set(parent, list_);
  }
  const rootRaw = byParent.get('')?.[0];
  const nodes: TreeNode[] = [];
  const walk = (x: Record<string, unknown>, parentKind: NodeKind | null, depth: number) => {
    if (nodes.length >= LIMITS.nodes) return;
    const id = x.id as string;
    let kind = oneOf(x.kind, KINDS, 'end');
    if (parentKind === null && kind === 'end') kind = 'decision';
    if (depth >= LIMITS.depth) kind = 'end';
    const n: TreeNode = { id, parent: parentKind === null ? '' : (x.parent as string), kind, label: str(x.label, 90) };
    if (parentKind === 'decision') n.cost = numOrNull(x.cost);
    if (parentKind === 'chance') n.prob = numOrNull(x.prob, -10, 10);
    if (kind === 'end') n.payoff = numOrNull(x.payoff);
    nodes.push(n);
    if (kind !== 'end') for (const c of byParent.get(id) ?? []) walk(c, kind, depth + 1);
  };
  if (rootRaw) walk(rootRaw, null, 0);
  else nodes.push({ id: 'n1', parent: '', kind: 'decision', label: '' });
  return { business: str(r.business, 120), question: str(r.question, 300), currency: str(r.currency, 4, '€'), unit: str(r.unit, 3, 'm'), nodes };
}

export function blank(): TreeState {
  return normalize({
    currency: '€',
    unit: 'm',
    nodes: [
      { id: 'n1', parent: '', kind: 'decision', label: '' },
      { id: 'n2', parent: 'n1', kind: 'chance', label: '', cost: null },
      { id: 'n3', parent: 'n2', kind: 'end', label: '', prob: null, payoff: null },
      { id: 'n4', parent: 'n2', kind: 'end', label: '', prob: null, payoff: null },
      { id: 'n5', parent: 'n1', kind: 'end', label: '', cost: null, payoff: null },
    ],
  });
}

/** Adds an outcome under a decision or chance node; returns it, or null at the limits. */
export function addBranch(s: TreeState, parentId: string): TreeNode | null {
  const parent = s.nodes.find((n) => n.id === parentId);
  if (!parent || parent.kind === 'end' || s.nodes.length >= LIMITS.nodes || depthOf(s, parentId) + 1 > LIMITS.depth) return null;
  const node: TreeNode = { id: nextId('n', s.nodes.map((n) => n.id)), parent: parentId, kind: 'end', label: '', payoff: null };
  if (parent.kind === 'decision') node.cost = null;
  else node.prob = null;
  const sub = subtree(s, parentId);
  const lastIndex = Math.max(...sub.map((id) => s.nodes.findIndex((n) => n.id === id)));
  s.nodes.splice(lastIndex + 1, 0, node);
  Object.assign(s, normalize(s));
  return s.nodes.find((n) => n.id === node.id) ?? null;
}

export function removeNode(s: TreeState, id: string): number {
  const node = s.nodes.find((n) => n.id === id);
  if (!node || node.parent === '') return 0;
  const gone = new Set(subtree(s, id));
  s.nodes = s.nodes.filter((n) => !gone.has(n.id));
  return gone.size;
}

/** After a node's type changes: an outcome loses its branches; a new decision or chance node gets two. */
export function retype(s: TreeState, id: string): { removed: number; added: number } {
  const node = s.nodes.find((n) => n.id === id);
  if (!node) return { removed: 0, added: 0 };
  let removed = 0;
  let added = 0;
  if (node.kind === 'end') {
    const kids = subtree(s, id).slice(1);
    removed = kids.length;
    s.nodes = s.nodes.filter((n) => !kids.includes(n.id));
  } else if (!childrenOf(s, id).length) {
    if (addBranch(s, id)) added += 1;
    if (addBranch(s, id)) added += 1;
  }
  Object.assign(s, normalize(s));
  return { removed, added };
}

/* ---------- Rolling back ---------- */

export interface NodeEval {
  value: number | null;
  /** At a decision node: the branch with the highest value net of its cost. */
  best: string | null;
  /** At a decision node, the value of each branch net of its cost. */
  nets: Record<string, number | null>;
  probSum: number | null;
  problems: string[];
}

export function evaluate(s: TreeState): Map<string, NodeEval> {
  const out = new Map<string, NodeEval>();
  const ev = (n: TreeNode): number | null => {
    const e: NodeEval = { value: null, best: null, nets: {}, probSum: null, problems: [] };
    out.set(n.id, e);
    if (n.kind === 'end') {
      if (n.payoff === null || n.payoff === undefined) e.problems.push('Enter the payoff.');
      e.value = n.payoff ?? null;
      return e.value;
    }
    const kids = childrenOf(s, n.id);
    const vals = kids.map(ev);
    if (n.kind === 'chance') {
      const blankP = kids.filter((k) => k.prob === null || k.prob === undefined);
      if (kids.length < 2) e.problems.push('A chance node needs at least two outcomes.');
      if (blankP.length) e.problems.push('Enter a probability for every outcome.');
      else {
        const r = evaluateOption({ id: n.id, label: n.label, cost: 0, outcomes: kids.map((k, i) => ({ label: k.label, probability: k.prob as number, payoff: vals[i] ?? NaN })) });
        e.probSum = r.probabilitySum;
        for (const p of r.problems) if (!e.problems.includes(p)) e.problems.push(p);
        if (r.valid && vals.every((v) => v !== null)) e.value = r.expectedPayoff;
      }
      return e.value;
    }
    if (!kids.length) e.problems.push('A decision needs at least one option.');
    kids.forEach((k, i) => {
      if ((k.cost ?? 0) < 0) e.problems.push(`The cost of "${k.label || 'a branch'}" cannot be negative.`);
      const v = vals[i];
      e.nets[k.id] = v === null || v === undefined ? null : v - (k.cost ?? 0);
    });
    const nets = kids.map((k) => e.nets[k.id]);
    if (kids.length && nets.every((v): v is number => v !== null && v !== undefined) && !e.problems.length) {
      const top = Math.max(...nets);
      const i = nets.findIndex((v) => Math.abs(v - top) < 1e-9);
      e.best = kids[i]?.id ?? null;
      e.value = top;
    }
    return e.value;
  };
  const root = rootOf(s);
  if (root) ev(root);
  return out;
}

/** Nodes on the best policy: the chosen branch at each decision, every branch at each chance node. */
export function bestPath(s: TreeState, evals: Map<string, NodeEval>): Set<string> {
  const on = new Set<string>();
  const walk = (n: TreeNode) => {
    on.add(n.id);
    if (n.kind === 'decision') {
      const b = evals.get(n.id)?.best;
      const c = s.nodes.find((x) => x.id === b);
      if (c) walk(c);
    } else if (n.kind === 'chance') childrenOf(s, n.id).forEach(walk);
  };
  const root = rootOf(s);
  if (root) walk(root);
  return on;
}

/** Every final result (payoff less the costs on the way) that following the best choices can lead to, with its probability. */
export function outcomesOf(s: TreeState, evals: Map<string, NodeEval>, id: string): Array<{ net: number; p: number }> | null {
  const n = s.nodes.find((x) => x.id === id);
  if (!n) return null;
  if (n.kind === 'end') return n.payoff === null || n.payoff === undefined ? null : [{ net: n.payoff, p: 1 }];
  if (n.kind === 'chance') {
    const parts = childrenOf(s, id).map((c) => ({ c, o: outcomesOf(s, evals, c.id) }));
    if (parts.some((x) => !x.o || x.c.prob === null || x.c.prob === undefined)) return null;
    return parts.flatMap(({ c, o }) => (o ?? []).map((x) => ({ net: x.net, p: x.p * (c.prob as number) })));
  }
  const best = evals.get(id)?.best;
  const c = s.nodes.find((x) => x.id === best);
  if (!c) return null;
  const o = outcomesOf(s, evals, c.id);
  return o ? o.map((x) => ({ net: x.net - (c.cost ?? 0), p: x.p })) : null;
}

export interface OptionSummary {
  node: TreeNode;
  net: number | null;
  worst: number | null;
  best: number | null;
  lossChance: number | null;
}

/** The first decision's options, each with its value net of cost and the spread of results behind it. */
export function optionSummaries(s: TreeState, evals: Map<string, NodeEval>): OptionSummary[] {
  const root = rootOf(s);
  if (!root || root.kind !== 'decision') return [];
  return childrenOf(s, root.id).map((c) => {
    const o = outcomesOf(s, evals, c.id)?.map((x) => ({ net: x.net - (c.cost ?? 0), p: x.p })) ?? null;
    return {
      node: c,
      net: evals.get(root.id)?.nets[c.id] ?? null,
      worst: o?.length ? Math.min(...o.map((x) => x.net)) : null,
      best: o?.length ? Math.max(...o.map((x) => x.net)) : null,
      lossChance: o ? round(o.filter((x) => x.net < -1e-9).reduce((n, x) => n + x.p, 0), 6) : null,
    };
  });
}

export const money = (v: number, s: Pick<TreeState, 'currency' | 'unit'>) => treeMoney(round(v, 4), s.currency, s.unit);
const lbl = (n: TreeNode | undefined, fallback = 'an unnamed branch') => (n?.label.trim() ? n.label.trim() : fallback);
const pr = (p: number) => fmtNumber(p, Number.isInteger(round(p * 10, 6)) ? 1 : 2);

export function allProblems(s: TreeState, evals: Map<string, NodeEval>): Array<{ node: TreeNode; text: string }> {
  return s.nodes.flatMap((n) => (evals.get(n.id)?.problems ?? []).map((text) => ({ node: n, text })));
}

export function checks(s: TreeState, evals = evaluate(s)): Check[] {
  const out: Check[] = allProblems(s, evals).map(({ node, text }) => ({ level: 'error' as const, text: `${node.kind === 'end' ? 'Outcome' : KIND_NAMES[node.kind]} "${lbl(node, 'unnamed')}": ${text}` }));
  const unnamed = s.nodes.filter((n) => !n.label.trim());
  if (unnamed.length) out.push({ level: 'warning', text: `${unnamed.length === 1 ? 'One node has' : `${count(unnamed.length, true)} nodes have`} no name. Name every branch, so the tree can be read without you.` });
  const root = rootOf(s);
  if (root?.kind === 'decision' && childrenOf(s, root.id).length === 1) out.push({ level: 'info', text: 'The first decision has only one option. A decision needs an alternative, even if it is to do nothing.' });
  const ties = s.nodes.filter((n) => n.kind === 'decision').filter((n) => {
    const e = evals.get(n.id);
    const nets = Object.values(e?.nets ?? {}).filter((v): v is number => v !== null);
    return e?.value !== null && nets.filter((v) => Math.abs(v - (e?.value ?? 0)) < 1e-9).length > 1;
  });
  if (ties.length) out.push({ level: 'info', text: `${andList(ties.map((n) => `"${lbl(n, 'unnamed')}"`))} has two branches with the same value; the tree cannot choose between them.` });
  return out;
}

export function reading(s: TreeState, evals = evaluate(s)): string {
  const root = rootOf(s);
  if (!root) return 'Start the tree with a decision.';
  const e = evals.get(root.id);
  if (e?.value === null || e?.value === undefined) return 'The tree cannot be rolled back yet: fix the problems listed under Checks.';
  if (root.kind === 'chance') return `The expected value of the whole tree is ${money(e.value, s)}.`;
  const sums = optionSummaries(s, evals).filter((x) => x.net !== null);
  const best = sums.find((x) => x.node.id === e.best);
  const rest = sums.filter((x) => x.node.id !== e.best).sort((a, b) => (b.net as number) - (a.net as number));
  if (!best) return '';
  const second = rest[0];
  const lead = `${lbl(best.node)} has the highest expected value, ${money(best.net as number, s)} net of its cost${second ? `, ahead of ${lbl(second.node)} (${money(second.net as number, s)})` : ''}.`;
  const spread =
    best.worst !== null && best.best !== null
      ? ` Following the best choices, its results run from ${money(best.worst, s)} to ${money(best.best, s)}${best.lossChance ? `, with a ${pr(best.lossChance)} chance of a loss` : ''}.`
      : '';
  return `${lead}${spread} An expected value is an average over many imagined repeats; this decision happens once, so weigh the spread and the factors the numbers leave out.`;
}

export function headline(s: TreeState): string {
  const evals = evaluate(s);
  const root = rootOf(s);
  const e = root ? evals.get(root.id) : undefined;
  if (!root || e?.value === null || e?.value === undefined) return 'The tree has problems to fix before it can be rolled back.';
  const best = s.nodes.find((n) => n.id === e.best);
  return root.kind === 'decision' ? `Best option: ${lbl(best)}, expected value ${money(e.value, s)} net of its cost.` : `Expected value of the tree: ${money(e.value, s)}.`;
}

/** The working, from the outcomes back to the first decision. */
export function workings(s: TreeState, evals = evaluate(s)): string[] {
  const out: string[] = [];
  const post = (n: TreeNode) => {
    const kids = childrenOf(s, n.id);
    kids.forEach(post);
    const e = evals.get(n.id);
    if (!e || n.kind === 'end') return;
    if (n.kind === 'chance') {
      if (e.value === null) return;
      out.push(`${lbl(n, 'Chance node')}: ${kids.map((k) => `${pr(k.prob as number)} × ${money(evals.get(k.id)?.value ?? 0, s)}`).join(' + ')} = ${money(e.value, s)}`);
    } else if (e.value !== null) {
      const parts = kids.map((k) => `${lbl(k)} ${money(evals.get(k.id)?.value ?? 0, s)}${k.cost ? ` − ${money(k.cost, s)} = ${money(e.nets[k.id] ?? 0, s)}` : ''}`);
      out.push(`${lbl(n, 'Decision')}: ${parts.join('; ')}. Choose ${lbl(s.nodes.find((x) => x.id === e.best))} (${money(e.value, s)}).`);
    }
  };
  const root = rootOf(s);
  if (root) post(root);
  return out;
}

/* ---------- The chart ---------- */

export function treeSvg(s: TreeState, id: string, evals = evaluate(s)): string {
  const root = rootOf(s);
  if (!root) return svgDoc(320, 80, id, 'Decision tree', 'An empty tree.', '');
  const on = bestPath(s, evals);
  const maxLabel = Math.max(12, ...s.nodes.map((n) => Math.min(34, n.label.trim().length)));
  const colW = Math.max(190, Math.min(240, textWidth('x'.repeat(maxLabel), 11) + 40));
  const rowH = 60;
  // Room on the left for the first decision's value.
  const L = 104;
  const T = 30;
  let leaf = 0;
  const pos = new Map<string, { x: number; y: number; d: number }>();
  let maxD = 0;
  const place = (n: TreeNode, d: number): number => {
    maxD = Math.max(maxD, d);
    const kids = childrenOf(s, n.id);
    let y: number;
    if (!kids.length) {
      y = T + leaf * rowH + rowH / 2;
      leaf += 1;
    } else {
      const ys = kids.map((k) => place(k, d + 1));
      y = ((ys[0] ?? 0) + (ys[ys.length - 1] ?? 0)) / 2;
    }
    pos.set(n.id, { x: L + d * colW, y, d });
    return y;
  };
  place(root, 0);
  const W = L + maxD * colW + 96;
  const H = T + leaf * rowH + 16;
  const p: string[] = [];
  const short = (t: string) => (t.length > 34 ? `${t.slice(0, 33)}…` : t);
  // Each branch: its name above the line; below the line, its probability or cost at the left and the value of the node it leads to at the right.
  for (const n of s.nodes) {
    if (n.parent === '') continue;
    const a = pos.get(n.parent);
    const b = pos.get(n.id);
    const parent = s.nodes.find((x) => x.id === n.parent);
    if (!a || !b || !parent) continue;
    const chosen = parent.kind === 'decision' && evals.get(parent.id)?.best === n.id;
    const rejected = parent.kind === 'decision' && Boolean(evals.get(parent.id)?.best) && !chosen;
    const live = on.has(n.id);
    const stroke = chosen ? C.cobalt : rejected ? C.muted : live ? C.ink : C.slate;
    const sw = chosen ? 3 : 1.4;
    const x0 = a.x + 9;
    const xm = a.x + 26;
    const xe = b.x - 10;
    p.push(`<path d="M${r1(x0)} ${r1(a.y)} L${r1(xm)} ${r1(b.y)} L${r1(xe)} ${r1(b.y)}" fill="none" stroke="${stroke}" stroke-width="${sw}"${rejected ? ' stroke-dasharray="4 3"' : ''}/>`);
    if (rejected) {
      // The usual mark for a rejected option: two short strokes across the branch.
      const cx = xe - 0.3 * (xe - xm);
      p.push(`<path d="M${r1(cx - 4)} ${r1(b.y + 5)} L${r1(cx + 1)} ${r1(b.y - 5)} M${r1(cx + 3)} ${r1(b.y + 5)} L${r1(cx + 8)} ${r1(b.y - 5)}" stroke="${C.signal}" stroke-width="1.6"/>`);
    }
    p.push(txt(xm + 6, b.y - 7, short(lbl(n, '(unnamed)')), { size: 11, weight: chosen ? 700 : 500, fill: chosen ? C.cobaltText : rejected ? C.slate : C.ink }));
    const under = parent.kind === 'chance' ? (n.prob === null || n.prob === undefined ? 'p ?' : `p ${pr(n.prob)}`) : n.cost ? `cost ${money(n.cost, s)}` : '';
    if (under) p.push(txt(xm + 6, b.y + 16, under, { size: 10.5, fill: C.slate }));
    const v = evals.get(n.id)?.value;
    if (n.kind !== 'end' && v !== null && v !== undefined) p.push(txt(xe - 4, b.y + 16, `EV ${money(v, s)}`, { anchor: 'end', size: 11, weight: 700, fill: n.kind === 'decision' ? C.cobaltText : C.ink }));
  }
  for (const n of s.nodes) {
    const q = pos.get(n.id);
    if (!q) continue;
    if (n.kind === 'decision') p.push(`<rect x="${r1(q.x - 9)}" y="${r1(q.y - 9)}" width="18" height="18" fill="${C.ink}"/>`);
    else if (n.kind === 'chance') p.push(`<circle cx="${r1(q.x)}" cy="${r1(q.y)}" r="9" fill="#fff" stroke="${C.ink}" stroke-width="2"/>`);
    else p.push(`<path d="M${r1(q.x - 5)} ${r1(q.y - 7)} L${r1(q.x + 8)} ${r1(q.y)} L${r1(q.x - 5)} ${r1(q.y + 7)} Z" fill="${on.has(n.id) ? C.ink : C.muted}"/>`);
    if (n.kind === 'end') p.push(txt(q.x + 13, q.y + 4, n.payoff === null || n.payoff === undefined ? '?' : money(n.payoff, s), { size: 11.5, weight: 650, fill: C.ink }));
  }
  const rootValue = evals.get(root.id)?.value;
  const rq = pos.get(root.id);
  if (rq && rootValue !== null && rootValue !== undefined) {
    p.push(txt(rq.x - 14, rq.y - 3, 'EV', { anchor: 'end', size: 10.5, weight: 700, fill: C.cobaltText }));
    p.push(txt(rq.x - 14, rq.y + 11, money(rootValue, s), { anchor: 'end', size: 12, weight: 700, fill: C.cobaltText }));
  }
  const best = s.nodes.find((n) => n.id === evals.get(root.id)?.best);
  const desc = `Decision tree for ${s.question.trim() || 'the decision'}, with ${s.nodes.length} nodes. ${headline(s)}${best ? ` The chosen branch, ${lbl(best)}, is drawn heavier; rejected branches are dashed and crossed with two short strokes.` : ''}`;
  // Drawn at its own size everywhere; on a narrow screen its region scrolls, so the labels stay legible.
  return svgDoc(W, H, id, `Decision tree: ${s.question.trim() || 'the decision'}`, desc, p.join('')).replace(`style="max-width:${W}px"`, `style="width:${W}px;max-width:none"`);
}

/* ---------- HTML ---------- */

function nodeHtml(s: TreeState, n: TreeNode, uid: string, evals: Map<string, NodeEval>): string {
  const id = `${uid}-${n.id}`;
  const parent = s.nodes.find((x) => x.id === n.parent);
  const depth = depthOf(s, n.id);
  const kids = childrenOf(s, n.id);
  const ctx = parent ? `<span class="sr-only"> from "${esc(lbl(parent, 'the node above'))}"</span>` : '';
  const kindOpts = (n.parent === '' ? (['decision', 'chance'] as NodeKind[]) : depth >= LIMITS.depth ? (['end'] as NodeKind[]) : KINDS).map((k) => ({ value: k, label: KIND_NAMES[k] }));
  const sumId = parent?.kind === 'chance' ? `${uid}-${parent.id}-sum` : '';
  const nums = [
    parent?.kind === 'decision' ? field({ id: `${id}-cost`, k: `nodes.${n.id}.cost`, label: 'Cost', labelHtml: `Cost<span class="sr-only"> of "${esc(lbl(n, 'this branch'))}"</span>`, value: n.cost ?? null, numeric: true, pre: s.currency, post: s.unit || undefined, hint: 'Blank means no cost.' }) : '',
    parent?.kind === 'chance' ? field({ id: `${id}-p`, k: `nodes.${n.id}.prob`, label: 'Probability', labelHtml: `Probability<span class="sr-only"> of "${esc(lbl(n, 'this outcome'))}"</span>`, value: n.prob ?? null, numeric: true, hint: 'Between 0 and 1.', describedBy: `${sumId}-err` }) : '',
    n.kind === 'end' ? field({ id: `${id}-pay`, k: `nodes.${n.id}.payoff`, label: 'Payoff', labelHtml: `Payoff<span class="sr-only"> of "${esc(lbl(n, 'this outcome'))}"</span>`, value: n.payoff ?? null, numeric: true, pre: s.currency, post: s.unit || undefined }) : '',
  ].join('');
  const sumLine = n.kind === 'chance' ? `<p class="field__error sx-node__sum" id="${id}-sum-err" data-err>${esc(sumProblem(s, n, evals))}</p>` : '';
  return `<li class="sx-node sx-node--${n.kind}" data-node="${esc(n.id)}"><div class="sx-node__card"><div class="sx-node__head">${select({
    id: `${id}-kind`,
    k: `nodes.${n.id}.kind`,
    label: 'Type',
    labelHtml: `Type<span class="sr-only"> of node "${esc(lbl(n, 'unnamed'))}"</span>`,
    value: n.kind,
    options: kindOpts,
    cls: 'sx-node__kind',
  })}${field({
    id: `${id}-label`,
    k: `nodes.${n.id}.label`,
    label: n.parent === '' ? (n.kind === 'decision' ? 'The decision' : 'The first chance event') : parent?.kind === 'chance' ? 'Outcome' : 'Option',
    labelHtml: `${n.parent === '' ? (n.kind === 'decision' ? 'The decision' : 'The first chance event') : parent?.kind === 'chance' ? 'Outcome' : 'Option'}${ctx}`,
    value: n.label,
    maxlength: 90,
    cls: 'sx-node__label',
  })}</div>${nums ? `<div class="sx-nums sx-nums--3">${nums}</div>` : ''}${sumLine}<div class="sx-row__meta">${
    n.kind !== 'end' ? button({ act: 'add', label: n.kind === 'chance' ? 'Add an outcome' : 'Add an option', aria: `Add a branch to "${lbl(n, 'this node')}"`, data: { id: n.id }, disabled: s.nodes.length >= LIMITS.nodes || depth + 1 > LIMITS.depth }) : ''
  }${n.parent !== '' ? button({ act: 'remove', label: kids.length ? 'Remove with its branches' : 'Remove', aria: `Remove "${lbl(n, 'this node')}"${kids.length ? ' and its branches' : ''}`, data: { id: n.id }, cls: 'sx-row__remove' }) : ''}</div></div>${
    kids.length ? `<ol class="sx-node__kids" role="list">${kids.map((k) => nodeHtml(s, k, uid, evals)).join('')}</ol>` : ''
  }</li>`;
}

function sumProblem(s: TreeState, n: TreeNode, evals: Map<string, NodeEval>): string {
  const e = evals.get(n.id);
  const kids = childrenOf(s, n.id);
  if (!e || n.kind !== 'chance' || kids.some((k) => k.prob === null || k.prob === undefined)) return '';
  if (e.probSum !== null && Math.abs(e.probSum - 1) > 1e-6) return `The probabilities here add up to ${pr(round(e.probSum, 4))}, not 1.`;
  if (kids.some((k) => (k.prob as number) < 0 || (k.prob as number) > 1)) return 'Each probability must be between 0 and 1.';
  return '';
}

export function editorHtml(s: TreeState, uid: string): string {
  const evals = evaluate(s);
  const root = rootOf(s);
  return `<div class="sx-context sx-context--three">${field({ id: `${uid}-business`, k: 'business', label: 'Organization', value: s.business, maxlength: 120 })}${field({
    id: `${uid}-question`,
    k: 'question',
    label: 'The question the tree answers',
    value: s.question,
    multiline: true,
    rows: 2,
    maxlength: 300,
  })}<div class="sx-nums sx-nums--2">${field({ id: `${uid}-currency`, k: 'currency', label: 'Currency', value: s.currency, maxlength: 4 })}${field({ id: `${uid}-unit`, k: 'unit', label: 'Unit', value: s.unit, maxlength: 3, hint: 'm, k or blank.' })}</div></div><fieldset class="sx-q"><legend>The tree</legend><p class="sx-q__prompt">A decision node branches into options, each with its cost; a chance node branches into outcomes, each with its probability; an outcome ends a branch with its payoff. Change a node's type to grow or end the tree.</p>${
    root ? `<ol class="sx-tree-ed" role="list">${nodeHtml(s, root, uid, evals)}</ol>` : ''
  }<p class="small muted">${s.nodes.length} of ${LIMITS.nodes} nodes; up to ${LIMITS.depth} levels below the first decision.</p></fieldset>`;
}

export function outputsHtml(s: TreeState, uid: string): string {
  const evals = evaluate(s);
  const root = rootOf(s);
  const sums = optionSummaries(s, evals);
  const rootE = root ? evals.get(root.id) : undefined;
  const optTable = sums.length
    ? tableRegion(
        'Options compared',
        `<caption class="sr-only">Each option of the first decision: expected value net of cost and the spread of results under the best later choices</caption><thead><tr><th scope="col">Option</th><th scope="col" class="n">Cost</th><th scope="col" class="n">Expected value, net</th><th scope="col" class="n">Worst result</th><th scope="col" class="n">Best result</th><th scope="col" class="n">Chance of a loss</th><th scope="col">Verdict</th></tr></thead><tbody>${sums
          .map(
            (x) =>
              `<tr${rootE?.best === x.node.id ? ' class="is-best"' : ''}><th scope="row">${esc(lbl(x.node))}</th><td class="n num">${esc(money(x.node.cost ?? 0, s))}</td><td class="n num"><strong>${x.net === null ? 'n/a' : esc(money(x.net, s))}</strong></td><td class="n num">${x.worst === null ? 'n/a' : esc(money(x.worst, s))}</td><td class="n num">${x.best === null ? 'n/a' : esc(money(x.best, s))}</td><td class="n num">${x.lossChance === null ? 'n/a' : pr(x.lossChance)}</td><td>${rootE?.best === x.node.id ? '<strong>Highest expected value</strong>' : rootE?.best ? 'Rejected' : ''}</td></tr>`,
          )
          .join('')}</tbody>`,
      )
    : '';
  const nodesTable = tableRegion(
    'Every node',
    `<caption class="sr-only">Every node in the tree with its figures and expected value</caption><thead><tr><th scope="col">Node</th><th scope="col">Type</th><th scope="col" class="n">Probability</th><th scope="col" class="n">Cost</th><th scope="col" class="n">Payoff</th><th scope="col" class="n">Value</th></tr></thead><tbody>${s.nodes
      .map((n) => {
        const e = evals.get(n.id);
        const d = depthOf(s, n.id);
        return `<tr><th scope="row"><span class="sx-indent" style="--d:${d}">${esc(lbl(n, '(unnamed)'))}</span></th><td>${KIND_NAMES[n.kind]}</td><td class="n num">${n.prob === null || n.prob === undefined ? '' : pr(n.prob)}</td><td class="n num">${n.cost ? esc(money(n.cost, s)) : ''}</td><td class="n num">${n.payoff === null || n.payoff === undefined ? '' : esc(money(n.payoff, s))}</td><td class="n num">${e?.value === null || e?.value === undefined ? '' : esc(money(e.value, s))}</td></tr>`;
      })
      .join('')}</tbody>`,
  );
  const steps = workings(s, evals);
  return `<div class="sx-out__block"><h4 class="sx-out__h">The tree, rolled back</h4><p class="small muted">${esc(orDash(s.business, 'Organization not named'))}. ${esc(s.question.trim() || 'Question not stated.')} Payoffs are before the costs on the way to them.</p>${chartRegion('Decision tree chart', treeSvg(s, `${uid}-chart`, evals)).replace('sx-chart"', 'sx-chart sx-chart--wide"')}<ul class="sx-legend" role="list"><li>Square: decision</li><li>Circle: chance</li><li>Triangle: outcome</li><li>Heavy blue branch: the choice with the highest expected value</li><li>Dashed, crossed branch: rejected</li></ul><p class="sx-reading" data-reading>${esc(reading(s, evals))}</p></div>${
    optTable ? `<div class="sx-out__block"><h4 class="sx-out__h">The options compared</h4>${optTable}<p class="small muted">Worst and best results follow the best choices at every later decision, and include all costs on the way.</p></div>` : ''
  }<div class="sx-out__block"><h4 class="sx-out__h">The working</h4>${steps.length ? `<ol class="sx-working" role="list">${steps.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>` : '<p class="small muted">The working appears when the tree can be rolled back.</p>'}<details class="disclosure"><summary>Every node, with its value</summary><div class="disclosure__body">${nodesTable}</div></details></div><div class="sx-out__block"><h4 class="sx-out__h">Checks</h4>${checksHtml(checks(s, evals), 'No problems found: every chance node has probabilities that add up to 1 and every outcome has a payoff.')}</div>`;
}

/* ---------- Export ---------- */

export function toText(s: TreeState): string {
  const evals = evaluate(s);
  const lines: string[] = [];
  const walk = (n: TreeNode, d: number) => {
    const parent = s.nodes.find((x) => x.id === n.parent);
    const e = evals.get(n.id);
    const bits = [parent?.kind === 'chance' && n.prob !== null && n.prob !== undefined ? `p ${pr(n.prob)}` : '', parent?.kind === 'decision' && n.cost ? `cost ${money(n.cost, s)}` : '', n.kind === 'end' && n.payoff !== null && n.payoff !== undefined ? `payoff ${money(n.payoff, s)}` : '', n.kind !== 'end' && e?.value !== null && e?.value !== undefined ? `EV ${money(e.value, s)}` : ''].filter(Boolean);
    lines.push(`${'  '.repeat(d)}- [${KIND_NAMES[n.kind]}] ${lbl(n, '(unnamed)')}${bits.length ? ` (${bits.join(', ')})` : ''}${parent?.kind === 'decision' && evals.get(parent.id)?.best === n.id ? ' <- chosen' : ''}`);
    childrenOf(s, n.id).forEach((c) => walk(c, d + 1));
  };
  const root = rootOf(s);
  if (root) walk(root, 0);
  return textDoc(`Decision tree: ${orDash(s.business, 'organization not named')}`, [
    textSection('Question', [orDash(s.question)]),
    textSection('The tree (payoffs before costs)', lines),
    textSection('Working', workings(s, evals)),
    textSection('Reading', [reading(s, evals)]),
    textSection('Checks', checks(s, evals).map((c) => `- ${c.text}`)),
    'Made with the Strategy Studio, The Business Brief. A model is an aid to judgement, not an answer.',
  ]);
}

export function toCsvText(s: TreeState): string {
  const evals = evaluate(s);
  return toCsv([
    ['Node', 'Parent', 'Type', 'Label', 'Probability', `Cost (${s.currency}${s.unit})`, `Payoff (${s.currency}${s.unit})`, `Expected value (${s.currency}${s.unit})`, 'Chosen'],
    ...s.nodes.map((n) => {
      const parent = s.nodes.find((x) => x.id === n.parent);
      const v = evals.get(n.id)?.value;
      return [n.id, n.parent, KIND_NAMES[n.kind], n.label.trim(), n.prob ?? '', n.cost ?? '', n.payoff ?? '', v === null || v === undefined ? '' : round(v, 4), parent?.kind === 'decision' ? (evals.get(parent.id)?.best === n.id ? 'yes' : 'no') : ''];
    }),
  ]);
}

export function fileName(s: TreeState): string {
  return `${fileSlug(s.business)}-decision-tree`;
}

export function messages(s: TreeState, uid: string): Record<string, { error?: string; invalid?: boolean }> {
  const evals = evaluate(s);
  const out: Record<string, { error?: string; invalid?: boolean }> = {};
  for (const n of s.nodes) {
    const parent = s.nodes.find((x) => x.id === n.parent);
    if (n.kind === 'end') out[`${uid}-${n.id}-pay`] = { error: n.payoff === null || n.payoff === undefined ? 'Enter the payoff.' : '' };
    if (parent?.kind === 'decision') out[`${uid}-${n.id}-cost`] = { error: (n.cost ?? 0) < 0 ? 'A cost cannot be negative.' : '' };
    if (parent?.kind === 'chance') {
      const p = n.prob;
      const own = p === null || p === undefined ? 'Enter a probability.' : p < 0 || p > 1 ? 'Between 0 and 1.' : '';
      const sum = sumProblem(s, parent, evals);
      out[`${uid}-${n.id}-p`] = { error: own, invalid: Boolean(own || sum) };
    }
    if (n.kind === 'chance') out[`${uid}-${n.id}-sum`] = { error: sumProblem(s, n, evals) };
  }
  return out;
}

export function problems(s: TreeState): string[] {
  const evals = evaluate(s);
  const out = allProblems(s, evals).map((p) => `${p.node.id}: ${p.text}`);
  if (s.nodes.some((n) => !n.label.trim())) out.push('every node in the worked example needs a name');
  const root = rootOf(s);
  if (!root || evals.get(root.id)?.value === null) out.push('the worked example must roll back to a value');
  return out;
}
