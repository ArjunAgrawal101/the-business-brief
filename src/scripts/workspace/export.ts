/**
 * Export selected work, in My Business Workspace: the reader ticks items of the
 * learning list, notes and analyses, then downloads them as Markdown, to read
 * and print, or as JSON in the whole-record export's format, which "Import a
 * copy" reads back and combines with what is there. The files are made in
 * the browser and sent nowhere. Rules in src/lib/workspace.ts.
 */
import { escapeHtml as h } from '../ix';
import { NOTE_KIND_LABELS, STATUS_LABELS, selectionExport, selectionMarkdown, selectionWords, type Selection, type WorkspaceView } from '../../lib/workspace';
import { siteItems } from '../storage';
import { $in, n, type Ctx } from './context';

type Group = 'list' | 'notes' | 'analyses';

function download(name: string, type: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface ExportPart {
  render(view: WorkspaceView): void;
}

export function bindExport(ctx: Ctx): ExportPart {
  const { root, say } = ctx;
  const box = $in(root, '[data-export-groups]');
  const countEl = $in(root, '[data-sel-count]');
  const err = $in(root, '[data-export-err]');
  const chosen: Record<Group, Set<string>> = { list: new Set(), notes: new Set(), analyses: new Set() };

  const selection = (): Selection => ({ list: [...chosen.list], notes: [...chosen.notes], analyses: [...chosen.analyses] });
  const error = (text: string | null) => {
    if (!err) return;
    err.textContent = text ?? '';
    err.hidden = !text;
  };
  const sayCount = () => {
    const s = selection();
    if (countEl) countEl.textContent = s.list.length + s.notes.length + s.analyses.length ? `Chosen: ${selectionWords(s)}.` : 'Nothing chosen yet.';
  };

  const fieldset = (group: Group, legend: string, rows: Array<{ id: string; label: string; meta: string }>, empty: string) =>
    `<fieldset class="ws-pick"><legend class="ws-pick__legend">${h(legend)} <span class="db-count">${n(rows.length)}</span></legend>${
      rows.length
        ? `<ul class="ws-pick__list" role="list">${rows
            .map(
              (r) =>
                `<li><label class="ws-pick__opt"><input type="checkbox" data-sel="${group}" value="${h(r.id)}" data-focus="sel:${group}:${h(r.id)}"${chosen[group].has(r.id) ? ' checked' : ''} /> <span><span class="ws-pick__title">${h(r.label)}</span> <span class="ws-pick__meta">${h(r.meta)}</span></span></label></li>`,
            )
            .join('')}</ul>`
        : `<p class="db-none">${empty}</p>`
    }</fieldset>`;

  const rowsOf = (view: WorkspaceView): Record<Group, Array<{ id: string; label: string; meta: string }>> => ({
    list: view.list.map((x) => ({ id: x.url, label: x.title, meta: STATUS_LABELS[x.status] })),
    notes: view.notebook.notes.map((x) => ({ id: x.id, label: x.title, meta: NOTE_KIND_LABELS[x.kind] })),
    analyses: view.analysisGroups.flatMap((g) => g.items.map((a) => ({ id: a.id, label: a.title, meta: g.room }))),
  });

  const render = (view: WorkspaceView) => {
    const rows = rowsOf(view);
    // Forget choices of things that are no longer kept.
    (Object.keys(chosen) as Group[]).forEach((g) => {
      const ids = new Set(rows[g].map((r) => r.id));
      chosen[g].forEach((id) => ids.has(id) || chosen[g].delete(id));
    });
    if (box)
      box.innerHTML = [
        fieldset('list', 'Learning list', rows.list, 'Nothing on your list yet.'),
        fieldset('notes', 'Notes', rows.notes, 'No notes yet.'),
        fieldset('analyses', 'Saved analyses', rows.analyses, 'No saved work yet.'),
      ].join('');
    sayCount();
  };

  root.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    const group = el.dataset?.sel as Group | undefined;
    if (!group || !(group in chosen)) return;
    if (el.checked) chosen[group].add(el.value);
    else chosen[group].delete(el.value);
    error(null);
    sayCount();
  });

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-sel-all]') || t.closest('[data-sel-none]')) {
      const all = Boolean(t.closest('[data-sel-all]'));
      const rows = rowsOf(ctx.view());
      (Object.keys(chosen) as Group[]).forEach((g) => {
        chosen[g].clear();
        if (all) rows[g].forEach((r) => chosen[g].add(r.id));
      });
      render(ctx.view());
      error(null);
      say(all ? `Chosen: ${selectionWords(selection())}.` : 'Nothing is chosen now.');
      return;
    }
    const md = t.closest('[data-export-md]');
    const json = t.closest('[data-export-json]');
    if (!md && !json) return;
    const sel = selection();
    if (!sel.list.length && !sel.notes.length && !sel.analyses.length) {
      error('Choose at least one item, note or analysis to export.');
      say('Choose at least one item, note or analysis to export.');
      return;
    }
    error(null);
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const view = ctx.view();
    if (md) {
      const name = `business-brief-workspace-${day}.md`;
      download(name, 'text/markdown;charset=utf-8', selectionMarkdown(view, sel, now, window.location.origin, ctx.cfg.roomOrder));
      say(`Downloaded ${name}, with ${selectionWords(sel)}.`);
    } else {
      const name = `business-brief-selection-${day}.json`;
      download(name, 'application/json', `${JSON.stringify(selectionExport(siteItems() ?? {}, view, sel, now), null, 2)}\n`);
      say(`Downloaded ${name}, with ${selectionWords(sel)}. Import it with Import a copy.`);
    }
  });

  return { render };
}
