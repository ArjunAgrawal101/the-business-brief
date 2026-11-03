/**
 * The Paper 1 workspace in the browser: renders the case with its tagged
 * evidence, tags a sentence (click, Enter or Space) or a selection of words,
 * keeps the evidence board and the answer plan, and exports the plan. The
 * rules and markup are in src/lib/p1-workspace.ts; everything is saved in
 * bb:p1-workspace and nowhere else.
 */
import { announce, each, escapeHtml, readConfig, store } from '../ix';
import {
  MAX_CASE,
  PLANS,
  TAGS,
  TAG_IDS,
  addEvidence,
  assign,
  paragraphHtml,
  parseWorkspace,
  placeAll,
  planChecks,
  planText,
  quoted,
  removeEvidence,
  slotOf,
  splitCase,
  wordCount,
  type Paragraph,
  type PlanKind,
  type Tag,
  type WorkspaceState,
} from '../../lib/p1-workspace';
import { download, twoStepReset } from './ia-common';

const KEY = 'p1-workspace';
const WORD = { ok: 'Fine', advice: 'Advice' } as const;

interface Pending {
  para: number;
  start: number;
  end: number;
  text: string;
  from: HTMLElement | null;
}

each('[data-ix="p1-workspace"]', (root) => {
  const { example } = readConfig<{ example: { title: string; note: string; text: string } }>(root);
  const live = root.querySelector<HTMLElement>('[data-live]');
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  let state: WorkspaceState = parseWorkspace(store.get<unknown>(KEY, null));
  const save = () => store.set(KEY, state);
  let seq = 0;
  const newId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;

  const caseEl = q<HTMLElement>('[data-case]');
  const palette = q<HTMLElement>('[data-palette]');
  const quote = q<HTMLElement>('[data-quote]');
  const ownBox = q<HTMLElement>('[data-own]');
  const ownText = q<HTMLTextAreaElement>('[data-own-text]');
  let paras: Paragraph[] = [];
  let pending: Pending | null = null;

  const caseText = () => (state.source === 'own' && state.own.trim() ? state.own : example.text);

  /* ---------- The case ---------- */

  const renderCase = () => {
    const own = state.source === 'own' && state.own.trim();
    paras = splitCase(caseText());
    const placed = placeAll(state.items, paras);
    if (caseEl) caseEl.innerHTML = paras.map((p, i) => `<p class="ws-p" data-para="${i}">${paragraphHtml(p, i, placed)}</p>`).join('');
    const title = q<HTMLElement>('[data-title]');
    const note = q<HTMLElement>('[data-case-note]');
    if (title) title.textContent = own ? 'Your case' : example.title;
    if (note) note.textContent = own ? `Your own text, kept on this device: ${wordCount(state.own)} words.` : `${example.note} ${wordCount(example.text)} words.`;
    root.querySelectorAll<HTMLInputElement>('input[name="source"]').forEach((r) => (r.checked = r.value === state.source));
    if (ownBox) ownBox.hidden = state.source !== 'own';
    if (ownText && document.activeElement !== ownText) ownText.value = state.own;
  };

  /** Character offset of a point inside a paragraph, counting the case's words only (not the tag labels). */
  const offsetIn = (paraEl: HTMLElement, node: Node, offset: number): number => {
    let total = 0;
    const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => ((n.parentElement?.closest('.ws-label') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n === node) return total + offset;
      total += n.textContent?.length ?? 0;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      // A point between elements: count the text before the child at `offset`.
      const el = node as Element;
      const range = document.createRange();
      range.setStart(paraEl, 0);
      range.setEnd(el, offset);
      const frag = range.cloneContents();
      frag.querySelectorAll('.ws-label').forEach((x) => x.remove());
      return frag.textContent?.length ?? 0;
    }
    return total;
  };

  const openPalette = (p: Pending) => {
    pending = p;
    if (!palette || !quote) return;
    root.querySelectorAll('.ws-s.is-active').forEach((x) => x.classList.remove('is-active'));
    p.from?.classList.add('is-active');
    quote.textContent = quoted(p.text.length > 220 ? `${p.text.slice(0, 220)}…` : p.text);
    palette.hidden = false;
    palette.querySelector<HTMLButtonElement>('[data-tag]')?.focus({ preventScroll: true });
    palette.scrollIntoView({ block: 'nearest' });
  };

  const closePalette = (focusBack = true) => {
    if (palette) palette.hidden = true;
    root.querySelectorAll('.ws-s.is-active').forEach((x) => x.classList.remove('is-active'));
    const from = pending?.from;
    pending = null;
    if (focusBack && from && document.contains(from)) from.focus({ preventScroll: true });
  };

  const sentencePending = (s: HTMLElement): Pending | null => {
    const para = Number(s.dataset.p);
    const start = Number(s.dataset.start);
    const end = Number(s.dataset.end);
    const p = paras[para];
    if (!p || !(end > start)) return null;
    return { para, start, end, text: p.text.slice(start, end), from: s };
  };

  caseEl?.addEventListener('mouseup', () => {
    window.setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const startPara = (range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as Element) : range.startContainer.parentElement)?.closest<HTMLElement>('[data-para]');
      if (!startPara || !caseEl.contains(startPara)) return;
      const para = Number(startPara.dataset.para);
      const p = paras[para];
      if (!p) return;
      let start = offsetIn(startPara, range.startContainer, range.startOffset);
      let end = startPara.contains(range.endContainer) ? offsetIn(startPara, range.endContainer, range.endOffset) : p.text.length;
      while (start < end && /\s/.test(p.text[start] ?? '')) start++;
      while (end > start && /\s/.test(p.text[end - 1] ?? '')) end--;
      if (end - start < 2) return;
      const s = (range.startContainer.parentElement?.closest<HTMLElement>('.ws-s')) ?? null;
      openPalette({ para, start, end, text: p.text.slice(start, end), from: s });
    }, 0);
  });

  caseEl?.addEventListener('click', (e) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const s = (e.target as HTMLElement).closest<HTMLElement>('.ws-s');
    if (!s) return;
    const p = sentencePending(s);
    if (p) openPalette(p);
  });

  caseEl?.addEventListener('keydown', (e) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>('.ws-s');
    if (!s || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const p = sentencePending(s);
    if (p) openPalette(p);
  });

  palette?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.hasAttribute('data-cancel')) {
      closePalette();
      return;
    }
    const tag = b.dataset.tag as Tag | undefined;
    if (!tag || !pending) return;
    const p = pending;
    const before = state.items.length;
    state = addEvidence(state, { tag, text: p.text, para: p.para, start: p.start, end: p.end }, newId());
    save();
    const added = state.items.length > before;
    const sentenceIndex = p.from?.dataset.s;
    closePalette(false);
    renderAll();
    const back = sentenceIndex !== undefined ? caseEl?.querySelector<HTMLElement>(`[data-para="${p.para}"] [data-s="${sentenceIndex}"]`) : null;
    back?.focus({ preventScroll: true });
    window.getSelection()?.removeAllRanges();
    announce(live, added ? `Tagged as ${TAGS[tag].label}: ${p.text.slice(0, 80)}${p.text.length > 80 ? '…' : ''}. It is in the ${TAGS[tag].label} column of your evidence.` : `Already tagged as ${TAGS[tag].label}.`);
  });
  palette?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  });

  /* ---------- The evidence board ---------- */

  const slotOptions = (selected: string | null) => {
    const def = PLANS[state.plan.kind];
    return [`<option value="">Not in the plan</option>`, ...def.slots.map((s) => `<option value="${s.id}"${s.id === selected ? ' selected' : ''}>${escapeHtml(s.title)}</option>`)].join('');
  };

  const renderBoard = () => {
    const placed = new Set(placeAll(state.items, paras).map((x) => x.e.id));
    const ordered = [...state.items].sort((a, b) => a.para - b.para || a.start - b.start);
    for (const t of TAG_IDS) {
      const list = q<HTMLElement>(`[data-col="${t}"]`);
      const items = ordered.filter((e) => e.tag === t);
      const n = q<HTMLElement>(`[data-n="${t}"]`);
      if (n) n.textContent = String(items.length);
      if (!list) continue;
      list.innerHTML = items
        .map((e) => {
          const lost = !placed.has(e.id);
          return `<li class="ws-item" data-item="${escapeHtml(e.id)}"><p class="ws-item__q${lost ? ' is-lost' : ''}">${escapeHtml(quoted(e.text))}${lost ? ' <span class="small">(no longer in the case)</span>' : ''}</p>
<div class="field"><label for="ws-note-${escapeHtml(e.id)}">Note</label><input class="input" id="ws-note-${escapeHtml(e.id)}" data-note value="${escapeHtml(e.note)}" autocomplete="off" /></div>
<div class="ws-item__foot"><div class="field"><label for="ws-slot-${escapeHtml(e.id)}">In the plan</label><select class="select" id="ws-slot-${escapeHtml(e.id)}" data-assign>${slotOptions(slotOf(state.plan, e.id))}</select></div>
<button type="button" class="btn btn--small" data-remove>Remove<span class="sr-only"> this evidence</span></button></div></li>`;
        })
        .join('');
    }
    const count = q<HTMLElement>('[data-count]');
    if (count) {
      const n = state.items.length;
      const inPlan = state.items.filter((e) => slotOf(state.plan, e.id)).length;
      count.textContent = n ? `${n} ${n === 1 ? 'piece' : 'pieces'} of evidence, ${inPlan} in your plan.` : 'Nothing tagged yet. Tag sentences in the case above.';
    }
  };

  /* ---------- The plan ---------- */

  const renderPlan = () => {
    const def = PLANS[state.plan.kind];
    root.querySelectorAll<HTMLInputElement>('input[name="plan"]').forEach((r) => (r.checked = r.value === state.plan.kind));
    const qIn = q<HTMLInputElement>('[data-question]');
    if (qIn && document.activeElement !== qIn) qIn.value = state.plan.question;
    const slotsEl = q<HTMLElement>('[data-slots]');
    const byId = new Map(state.items.map((e) => [e.id, e]));
    if (slotsEl)
      slotsEl.innerHTML = def.slots
        .map((s, i) => {
          const st = state.plan.slots[s.id] ?? { note: '', items: [] };
          const ev = st.items.map((id) => byId.get(id)).filter((e) => e !== undefined);
          return `<li class="ws-slot" data-slot="${s.id}"><span class="ws-slot__n" aria-hidden="true">${i + 1}</span>
<div><h3 class="ws-slot__title" id="ws-slot-h-${s.id}">${escapeHtml(s.title)}</h3><p class="ws-slot__prompt">${escapeHtml(s.prompt)}</p>
${ev.length ? `<ul class="ws-slot__ev">${ev.map((e) => `<li><span class="ws-label ws-label--${e.tag}">${escapeHtml(TAGS[e.tag].label)}</span><span>${escapeHtml(quoted(e.text))}</span></li>`).join('')}</ul>` : '<p class="ws-slot__none">No evidence yet: choose this part under "In the plan" beside a piece of evidence.</p>'}</div>
<div class="field ws-slot__note"><label for="ws-slot-note-${s.id}">Your point, in your own words</label><textarea class="textarea" id="ws-slot-note-${s.id}" rows="3" data-slot-note="${s.id}">${escapeHtml(st.note)}</textarea></div></li>`;
        })
        .join('');
    renderChecks();
  };

  const renderChecks = () => {
    const el = q<HTMLElement>('[data-checks]');
    if (!el) return;
    const checks = planChecks(state.plan, state.items);
    el.innerHTML = (checks.length ? checks : [{ status: 'ok' as const, text: 'Nothing obvious is missing. Read the plan against the question once more.', standing: 'strategy' as const }])
      .map((c) => `<li><span class="ws-w ws-w--${c.status}">${WORD[c.status]}</span><span>${escapeHtml(c.text)}</span></li>`)
      .join('');
  };

  const renderAll = () => {
    renderCase();
    renderBoard();
    renderPlan();
  };

  /* ---------- Events ---------- */

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.name === 'source') {
      state = { ...state, source: t.value === 'own' ? 'own' : 'example' };
      save();
      closePalette(false);
      renderAll();
      announce(live, state.source === 'own' ? 'Your own case. Paste or type it, then choose Use this text.' : 'The illustrative case.');
      return;
    }
    if (t.name === 'plan') {
      state = { ...state, plan: { ...state.plan, kind: t.value as PlanKind } };
      save();
      renderBoard();
      renderPlan();
      announce(live, `Planning for ${PLANS[state.plan.kind].label}.`);
      return;
    }
    if (t.matches('[data-assign]')) {
      const id = t.closest<HTMLElement>('[data-item]')?.dataset.item;
      if (!id) return;
      state = assign(state, id, t.value || null);
      save();
      renderPlan();
      const n = state.items.filter((x) => slotOf(state.plan, x.id)).length;
      const count = q<HTMLElement>('[data-count]');
      if (count) count.textContent = `${state.items.length} ${state.items.length === 1 ? 'piece' : 'pieces'} of evidence, ${n} in your plan.`;
      announce(live, t.value ? `Added to ${PLANS[state.plan.kind].slots.find((s) => s.id === t.value)?.title ?? 'the plan'}.` : 'Taken out of the plan.');
    }
  });

  let typing = 0;
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (t.matches('[data-note]')) {
      const id = t.closest<HTMLElement>('[data-item]')?.dataset.item;
      state = { ...state, items: state.items.map((x) => (x.id === id ? { ...x, note: t.value.slice(0, 1000) } : x)) };
    } else if (t.matches('[data-slot-note]')) {
      const sid = (t as HTMLTextAreaElement).dataset.slotNote ?? '';
      const prev = state.plan.slots[sid] ?? { note: '', items: [] };
      state = { ...state, plan: { ...state.plan, slots: { ...state.plan.slots, [sid]: { ...prev, note: t.value.slice(0, 3000) } } } };
    } else if (t.matches('[data-question]')) {
      state = { ...state, plan: { ...state.plan, question: t.value.slice(0, 1000) } };
    } else return;
    window.clearTimeout(typing);
    typing = window.setTimeout(() => {
      save();
      renderChecks();
    }, 250);
  });

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-remove]');
    if (!b) return;
    const id = b.closest<HTMLElement>('[data-item]')?.dataset.item;
    if (!id) return;
    state = removeEvidence(state, id);
    save();
    renderAll();
    q<HTMLElement>('[data-count]')?.focus();
    announce(live, 'Evidence removed, and taken out of the plan.');
  });

  q<HTMLButtonElement>('[data-own-use]')?.addEventListener('click', () => {
    const text = (ownText?.value ?? '').slice(0, MAX_CASE);
    const hint = q<HTMLElement>('[data-own-hint]');
    if (!text.trim()) {
      ownText?.setAttribute('aria-invalid', 'true');
      if (hint) {
        hint.textContent = 'Paste or type the case first.';
        hint.classList.add('field__error');
      }
      ownText?.focus();
      return;
    }
    ownText?.removeAttribute('aria-invalid');
    if (hint) {
      hint.textContent = 'Up to 20,000 characters. A blank line starts a new paragraph. It stays on this device.';
      hint.classList.remove('field__error');
    }
    state = { ...state, source: 'own', own: text };
    save();
    renderAll();
    caseEl?.querySelector<HTMLElement>('.ws-s')?.focus();
    announce(live, `Your case is ready: ${wordCount(text)} words in ${paras.length} paragraphs. Tag a sentence by pressing Enter on it.`);
  });

  const title = () => (state.source === 'own' && state.own.trim() ? 'Your own case' : example.title);
  q<HTMLButtonElement>('[data-txt]')?.addEventListener('click', () => {
    download('business-brief-paper-1-plan.txt', planText(state.plan, state.items, title()), 'text/plain;charset=utf-8');
    announce(live, 'Plan downloaded.');
  });
  q<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(planText(state.plan, state.items, title()));
      announce(live, 'Plan copied.');
    } catch {
      announce(live, 'Copying is not available here: use Download instead.');
    }
  });
  q<HTMLButtonElement>('[data-json]')?.addEventListener('click', () => {
    download('business-brief-paper-1-workspace.json', JSON.stringify({ exported: new Date().toISOString(), key: 'bb:p1-workspace', state }, null, 2), 'application/json');
    announce(live, 'Backup downloaded.');
  });
  q<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  twoStepReset(root, () => {
    state = parseWorkspace(null);
    store.remove(KEY);
    closePalette(false);
    renderAll();
    announce(live, 'The workspace was cleared from this device.');
  });

  renderAll();
});
