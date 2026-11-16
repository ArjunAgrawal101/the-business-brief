/**
 * Saved analyses in My Business Workspace: the work every tool keeps under its
 * own items (the Strategy Studio, the Market Studio, People and Culture, the
 * Operations Floor, the Entrepreneurship Lab, the Boardroom, the Assessment
 * Centre and the Finance Desk), read without changing it, room by room, each
 * with a link back to its tool; and the results saved from the Financial
 * Laboratory (bb:workspace:snapshots), with their figures, which the reader
 * can remove here. Rules in src/lib/workspace.ts.
 */
import { escapeHtml as h } from '../ix';
import { shortDate } from '../../lib/dashboard';
import { SNAPSHOTS_KEY, parseSnapshots, removeSnapshot, type Analysis, type Snapshot, type WorkspaceView } from '../../lib/workspace';
import { readItem, writeItem } from '../storage';
import { $in, n, plural, type Ctx } from './context';

function snapshotHtml(s: Snapshot, now: Date): string {
  const t = h(s.name);
  return `<li class="ws-snap" data-snap="${h(s.id)}">
    <a class="db-work__title" href="${h(s.url)}">${t}</a>
    <span class="db-work__detail">${h(s.headline.label)}: <strong class="ws-snap__value">${h(s.headline.value)}</strong>${s.headline.note ? ` (${h(s.headline.note)})` : ''}. ${s.mine ? 'Your own figures' : 'The example figures'}, saved ${h(shortDate(s.saved, now))}.</span>
    ${
      s.inputs.length
        ? `<details class="ws-snap__figs"><summary>The figures<span class="sr-only"> for ${t}</span></summary><dl class="ws-snap__dl">${s.inputs.map((r) => `<div><dt>${h(r.label)}</dt><dd>${h(r.value)}</dd></div>`).join('')}</dl></details>`
        : ''
    }
    <button type="button" class="db-remove ws-act" data-snap-del="${h(s.id)}" data-focus="snap:${h(s.id)}" aria-label="Remove the saved result ${t}, ${h(s.headline.value)}">Remove</button>
  </li>`;
}

const itemHtml = (a: Analysis, now: Date) =>
  `<li><a class="db-work__title" href="${h(a.href)}">${h(a.title)}</a><span class="db-work__detail">${h(a.line)}${a.when ? `, saved ${h(shortDate(a.when, now))}` : ''}</span></li>`;

export function renderAnalyses(ctx: Ctx, view: WorkspaceView, now: Date): void {
  const box = $in(ctx.root, '[data-work]');
  const count = $in(ctx.root, '[data-work-n]');
  const groups = view.analysisGroups;
  if (count) count.textContent = view.analyses.length ? `${plural(view.analyses.length, 'piece of work', 'pieces of work')} in ${plural(groups.length, 'room', 'rooms')}.` : '';
  if (!box) return;
  box.innerHTML = groups.length
    ? groups
        .map(
          (g) =>
            `<div class="pr-group db-workgroup ws-room"><h3 class="db-workgroup__h">${h(g.room)} <span class="db-count">${n(g.items.length)}</span></h3><ul class="db-work" role="list">${g.items
              .map((a) => {
                const s = a.snapshot ? view.snapshots.items.find((x) => x.id === a.snapshot) : undefined;
                return s ? snapshotHtml(s, now) : itemHtml(a, now);
              })
              .join('')}</ul></div>`,
        )
        .join('')
    : '<p class="db-none">No saved work yet. The tools in the rooms keep your figures, choices and notes, and list them here: try the <a href="/strategy-studio/">Strategy Studio</a> or the <a href="/entrepreneurship-lab/">Entrepreneurship Lab</a>, or use <strong>Save this result to my workspace</strong> in a <a href="/finance-desk/lab/">Financial Laboratory</a> calculator.</p>';
}

export function bindAnalyses(ctx: Ctx): void {
  ctx.root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-snap-del]');
    if (!btn) return;
    const id = btn.dataset.snapDel ?? '';
    const list = parseSnapshots(readItem(SNAPSHOTS_KEY));
    const gone = list.items.find((x) => x.id === id);
    const all = [...ctx.root.querySelectorAll<HTMLElement>('[data-snap-del]')];
    const at = all.indexOf(btn);
    if (!writeItem(SNAPSHOTS_KEY, JSON.stringify(removeSnapshot(list, id)))) {
      ctx.say('This browser would not change its storage, so nothing was removed.');
      return;
    }
    ctx.refresh();
    const left = [...ctx.root.querySelectorAll<HTMLElement>('[data-snap-del]')];
    (left[at] ?? left[at - 1] ?? ctx.root.querySelector<HTMLElement>('[data-work-n]'))?.focus();
    ctx.say(`Removed the saved result: ${gone?.name ?? 'the result'}.`);
  });
}
