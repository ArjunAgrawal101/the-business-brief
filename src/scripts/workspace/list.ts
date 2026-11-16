/**
 * My learning list: the saved items (bb:saved, written by the Save button
 * and here) in the reader's order, each with a status and a short note
 * (bb:workspace:list). The reader moves items up and down, sets a status,
 * writes a note (kept as they type), removes an item, and adds any page of
 * the catalogue the page carries. Rules in src/lib/workspace.ts.
 */
import { escapeHtml as h } from '../ix';
import { shortDate } from '../../lib/dashboard';
import { SAVED_KEY, SAVED_KIND_LABELS, addSaved, parseSaved, removeSaved, LIMITS } from '../../lib/learner';
import { LIST_KEY, STATUSES, STATUS_LABELS, WS_LIMITS, forgetInList, moveInList, parseList, setListNote, setListStatus, type ListItem, type WorkspaceView } from '../../lib/workspace';
import { readItem, writeItem } from '../storage';
import { $in, plural, type Ctx } from './context';

const NOTE_DELAY = 500;

function itemHtml(x: ListItem, i: number, count: number, now: Date): string {
  const t = h(x.title);
  const options = STATUSES.map((s) => `<option value="${s}"${s === x.status ? ' selected' : ''}>${h(STATUS_LABELS[s])}</option>`).join('');
  return `<li class="ws-li is-${x.status}" data-li="${h(x.url)}">
    <div class="ws-li__head">
      <span class="db-saved__kind">${h(SAVED_KIND_LABELS[x.kind])}</span>
      <a class="db-saved__title" href="${h(x.url)}">${t}</a>
      <span class="db-saved__when">Saved ${h(shortDate(x.saved, now))}</span>
    </div>
    <div class="ws-li__fields">
      <div class="ws-li__field ws-li__field--status">
        <label for="ws-st-${i}">Status<span class="sr-only"> of ${t}</span></label>
        <select class="select ws-li__select" id="ws-st-${i}" data-list-status="${h(x.url)}" data-focus="st:${h(x.url)}">${options}</select>
      </div>
      <div class="ws-li__field ws-li__field--note">
        <label for="ws-nt-${i}">Note<span class="sr-only"> on ${t}</span></label>
        <input class="input ws-li__note" type="text" id="ws-nt-${i}" maxlength="${WS_LIMITS.listNote}" value="${h(x.note)}" autocomplete="off" data-list-note="${h(x.url)}" data-focus="nt:${h(x.url)}" />
      </div>
    </div>
    <div class="ws-li__acts">
      <button type="button" class="ws-act" data-list-move="-1" data-url="${h(x.url)}" data-focus="up:${h(x.url)}"${i === 0 ? ' disabled' : ''}>Move up<span class="sr-only">: ${t}</span></button>
      <button type="button" class="ws-act" data-list-move="1" data-url="${h(x.url)}" data-focus="down:${h(x.url)}"${i === count - 1 ? ' disabled' : ''}>Move down<span class="sr-only">: ${t}</span></button>
      <button type="button" class="db-remove ws-act" data-remove="${h(x.url)}" data-i="${i}" data-focus="rm:${h(x.url)}" aria-label="Remove ${t} from your saved items">Remove</button>
    </div>
  </li>`;
}

export function renderList(ctx: Ctx, view: WorkspaceView, now: Date): void {
  const { root } = ctx;
  const box = $in(root, '[data-saved]');
  const count = $in(root, '[data-saved-n]');
  const counts = $in(root, '[data-list-counts]');
  if (count) count.textContent = String(view.list.length);
  if (counts)
    counts.textContent = view.list.length
      ? `${view.listCounts.todo} to do, ${view.listCounts.doing} in progress, ${view.listCounts.done} done. Notes are kept as you type.`
      : '';
  if (box)
    box.innerHTML = view.list.length
      ? `<ol class="ws-list__items" role="list">${view.list.map((x, i) => itemHtml(x, i, view.list.length, now)).join('')}</ol>`
      : '<p class="db-none">Nothing saved yet. Use <strong>Save</strong> on a subtopic, a glossary term, a case, a mindmap, a toolkit guide, a diagram or a practice question to keep it here, or add a page below.</p>';

  // The catalogue: pages on the list cannot be added twice.
  const urls = new Set(view.list.map((x) => x.url));
  root.querySelectorAll<HTMLOptionElement>('[data-list-pick] option[value]:not([value=""])').forEach((o) => {
    const title = optionTitle(o);
    const on = urls.has(o.value);
    o.disabled = on;
    o.textContent = on ? `${title} (on your list)` : title;
  });
}

/** An option's own title, as the page first gave it, before any "(on your list)". */
const titles = new WeakMap<HTMLOptionElement, string>();
function optionTitle(o: HTMLOptionElement): string {
  let t = titles.get(o);
  if (t === undefined) {
    t = (o.textContent ?? o.value).trim();
    titles.set(o, t);
  }
  return t;
}

export function bindList(ctx: Ctx): { flush: () => void } {
  const { root, say } = ctx;
  const pending = new Map<string, { value: string; timer: number }>();

  const saveNote = (url: string, value: string) => {
    const next = setListNote(parseList(readItem(LIST_KEY)), url, value, new Date());
    if (!writeItem(LIST_KEY, JSON.stringify(next))) say('This browser would not keep the note: its storage is full or blocked.');
  };
  const flush = () => {
    pending.forEach((p, url) => {
      window.clearTimeout(p.timer);
      saveNote(url, p.value);
    });
    pending.clear();
  };
  const titleOf = (url: string) => ctx.view().list.find((x) => x.url === url)?.title ?? 'the item';

  root.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    const url = el.dataset?.listNote;
    if (!url) return;
    const had = pending.get(url);
    if (had) window.clearTimeout(had.timer);
    const p = { value: el.value, timer: 0 };
    p.timer = window.setTimeout(() => {
      pending.delete(url);
      saveNote(url, p.value);
    }, NOTE_DELAY);
    pending.set(url, p);
  });

  root.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const noteUrl = el.dataset?.listNote;
    if (noteUrl) {
      flush();
      return;
    }
    const url = el.dataset?.listStatus;
    if (!url) return;
    flush();
    const next = setListStatus(parseList(readItem(LIST_KEY)), url, el.value, new Date());
    if (!writeItem(LIST_KEY, JSON.stringify(next))) {
      say('This browser would not change its storage, so the status was not kept.');
      return;
    }
    ctx.refresh();
    root.querySelector<HTMLElement>(`[data-focus="st:${CSS.escape(url)}"]`)?.focus();
    say(`${titleOf(url)}: ${STATUS_LABELS[el.value as keyof typeof STATUS_LABELS] ?? el.value}.`);
  });

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const move = t.closest<HTMLButtonElement>('[data-list-move]');
    if (move) {
      flush();
      const url = move.dataset.url ?? '';
      const delta = Number(move.dataset.listMove);
      const shown = ctx.view().list.map((x) => x.url);
      const next = moveInList(parseList(readItem(LIST_KEY)), shown, url, delta);
      if (!writeItem(LIST_KEY, JSON.stringify(next))) {
        say('This browser would not change its storage, so the list was not reordered.');
        return;
      }
      ctx.refresh();
      const list = ctx.view().list;
      const at = list.findIndex((x) => x.url === url);
      // Keep focus on the same button, or on the other one when the item reached the end.
      const same = root.querySelector<HTMLButtonElement>(`[data-focus="${delta < 0 ? 'up' : 'down'}:${CSS.escape(url)}"]`);
      (same && !same.disabled ? same : root.querySelector<HTMLButtonElement>(`[data-focus="${delta < 0 ? 'down' : 'up'}:${CSS.escape(url)}"]`))?.focus();
      say(`Moved ${titleOf(url)} ${delta < 0 ? 'up' : 'down'}: now ${at + 1} of ${list.length}.`);
      return;
    }

    const remove = t.closest<HTMLButtonElement>('[data-remove]');
    if (remove) {
      flush();
      const url = remove.dataset.remove ?? '';
      const list = parseSaved(readItem(SAVED_KEY));
      const item = list.items.find((x) => x.url === url);
      const i = Number(remove.dataset.i ?? 0);
      if (!writeItem(SAVED_KEY, JSON.stringify(removeSaved(list, url)))) {
        say('This browser would not change its storage, so nothing was removed.');
        return;
      }
      writeItem(LIST_KEY, JSON.stringify(forgetInList(parseList(readItem(LIST_KEY)), url)));
      ctx.refresh();
      const left = [...root.querySelectorAll<HTMLButtonElement>('[data-remove]')];
      (left[i] ?? left[i - 1] ?? root.querySelector<HTMLElement>('#db-saved-list-h'))?.focus();
      say(`Removed ${item?.title ?? 'the item'} from your saved items.`);
    }
  });

  // Add a page from the catalogue.
  const form = $in<HTMLFormElement>(root, '[data-list-add-form]');
  const pick = $in<HTMLSelectElement>(root, '[data-list-pick]');
  const err = $in(root, '[data-list-add-err]');
  const error = (text: string | null) => {
    if (!err || !pick) return;
    err.textContent = text ?? '';
    err.hidden = !text;
    if (text) pick.setAttribute('aria-invalid', 'true');
    else pick.removeAttribute('aria-invalid');
  };
  pick?.addEventListener('change', () => error(null));
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pick) return;
    const opt = pick.selectedOptions[0];
    if (!opt || !opt.value) {
      error('Choose a page to add.');
      pick.focus();
      return;
    }
    const title = optionTitle(opt);
    const list = parseSaved(readItem(SAVED_KEY));
    const { list: next, added } = addSaved(list, { url: opt.value, title, kind: opt.dataset.kind ?? 'page' }, new Date());
    if (!added) {
      error(list.items.length >= LIMITS.saved ? `Your list holds ${LIMITS.saved} items, the most it keeps. Remove one you have finished with to make room.` : `${title} is already on your list.`);
      return;
    }
    if (!writeItem(SAVED_KEY, JSON.stringify(next))) {
      error('This browser would not keep it: its storage is full or blocked.');
      return;
    }
    error(null);
    pick.value = '';
    ctx.refresh();
    say(`Added ${title} to the top of your list: ${plural(next.items.length, 'item', 'items')} in all.`);
  });

  return { flush };
}
