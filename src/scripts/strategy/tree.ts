/** Decision tree builder in the browser: branches to add and remove, and node types that grow or end a branch. */
import { mount } from './controller';
import { KIND_NAMES, addBranch, blank, childrenOf, editorHtml, fileName, headline, messages, normalize, outputsHtml, removeNode, retype, toCsvText, toText, type TreeState } from '../../lib/strategy/tree';

mount<TreeState>({
  tool: 'decision-tree',
  normalize,
  blank,
  editorHtml,
  outputsHtml,
  headline,
  toText,
  toCsvText,
  fileName,
  messages,
  afterInput(s, path) {
    if (path[0] === 'currency' || path[0] === 'unit') return { redraw: true };
    if (path[0] === 'nodes' && path[2] === 'kind') {
      const id = path[1] ?? '';
      const r = retype(s, id);
      const n = s.nodes.find((x) => x.id === id);
      const kind = n ? KIND_NAMES[n.kind].toLowerCase() : 'node';
      return {
        redraw: true,
        say: r.removed ? `Now an ${kind}. Its ${r.removed} ${r.removed === 1 ? 'branch was' : 'branches were'} removed.` : r.added ? `Now a ${kind} node with ${r.added} new branches: name them and fill in their figures.` : `Now a ${kind} node.`,
      };
    }
    return undefined;
  },
  action(s, act, data, uid) {
    if (act === 'add' && data.id) {
      const n = addBranch(s, data.id);
      if (!n) return null;
      return { focus: `${uid}-${n.id}-label`, say: `Branch added under "${s.nodes.find((x) => x.id === data.id)?.label.trim() || 'the node'}".` };
    }
    if (act === 'remove' && data.id) {
      const node = s.nodes.find((x) => x.id === data.id);
      if (!node?.parent) return null;
      const parent = node.parent;
      const removed = removeNode(s, data.id);
      const left = childrenOf(s, parent);
      return { focus: left.length ? `${uid}-${left[left.length - 1]?.id}-label` : `${uid}-${parent}-label`, say: `Removed ${removed === 1 ? 'the branch' : `${removed} nodes`}.` };
    }
    return null;
  },
});
