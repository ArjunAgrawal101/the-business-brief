/**
 * The Paper 3 plan builder in the browser: five steps that build one plan,
 * the checks for each step and against the four criteria as you write, the
 * plan in order, and storage on this device (bb:p3:plan, or
 * bb:p3:plan:<stimulus> for a practice stimulus). Every check is a prompt from
 * src/lib/p3-plan.ts, never a mark.
 */
import { announce, each, escapeHtml, readConfig, store } from '../ix';
import { download, twoStepReset } from './ia-common';
import {
  DIRECTION_LABEL,
  FN_LABEL,
  FUNCTIONS,
  FUNDING,
  FUNDING_LABEL,
  MAX_RECS,
  STAGES,
  STAGE_LABEL,
  TOOLS,
  TOOL_DECIDES,
  TOOL_LABEL,
  blankPlan,
  blankRec,
  chosenNeeds,
  nextRecId,
  parsePlan,
  planSummary,
  planText,
  reviewPlan,
  tally,
  writtenRecs,
  type Context,
  type Criterion,
  type Direction,
  type Fn,
  type Funding,
  type NeedKind,
  type Plan,
  type Prompt,
  type Rec,
  type Review,
  type Stage,
  type Status,
  type Tool,
} from '../../lib/p3-plan';
import { CRITERIA, type Need } from '../../lib/p3-stimuli';

interface Config {
  key: string;
  prefix: string;
  organization: string;
  title: string;
  href: string;
  file: string;
  resources: Array<{ id: string; title: string }>;
  needs: Need[];
}

const STATUS_WORD: Record<Status, string> = { met: 'Done', open: 'To do', warn: 'Rethink' };
const ORDER: Record<Status, number> = { warn: 0, open: 1, met: 2 };
const GROUPS: Array<[Criterion, string]> = [['All', 'The plan as a whole'], ...CRITERIA.map((c): [Criterion, string] => [c.id, `${c.id}: ${c.name} (${c.marks} marks)`])];
type RecStep = 3 | 4 | 5;

const toggle = (list: string[], value: string, on: boolean) => {
  const at = list.indexOf(value);
  if (on && at < 0) list.push(value);
  if (!on && at >= 0) list.splice(at, 1);
};
const opt = (value: string, label: string, selected: boolean) => `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;

each('[data-ix="plan-builder"]', (root) => {
  const cfg = readConfig<Config>(root);
  const ctx: Context = { resources: cfg.resources.map((r) => r.id), needs: cfg.needs };
  const boxes = {
    3: root.querySelector<HTMLElement>('[data-recs="3"]'),
    4: root.querySelector<HTMLElement>('[data-recs="4"]'),
    5: root.querySelector<HTMLElement>('[data-recs="5"]'),
  };
  const view = root.querySelector<HTMLElement>('[data-view]');
  const review = root.querySelector<HTMLElement>('[data-review]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add]');
  if (!boxes[3] || !boxes[4] || !boxes[5] || !view || !review) return;

  let plan: Plan = parsePlan(store.get<unknown>(cfg.key, null), ctx);
  let removed: { rec: Rec; at: number; before: string[] } | null = null;

  const save = () => store.set(cfg.key, { ...plan, title: cfg.title, href: cfg.href, savedAt: new Date().toISOString(), summary: planSummary(plan) });
  const fid = (r: Rec, k: string) => `${cfg.prefix}-${r.id}-${k}`;
  const num = (r: Rec) => plan.recs.indexOf(r) + 1;
  const titleOf = (r: Rec) => r.text.trim() || 'not written yet';
  const recById = (id: string | undefined) => plan.recs.find((r) => r.id === id);

  /* ---------- Drawing the recommendations in steps 3, 4 and 5 ---------- */

  const field = (r: Rec, k: 'text' | 'uses' | 'step' | 'gain', label: string, hint = '') =>
    `<div class="field pb__wide"><label for="${fid(r, k)}">${label}</label><input class="input" type="text" id="${fid(r, k)}" data-k="${k}" maxlength="600" value="${escapeHtml(r[k])}"${hint ? ` aria-describedby="${fid(r, `${k}-hint`)}"` : ''}>${hint ? `<p class="field__hint" id="${fid(r, `${k}-hint`)}">${hint}</p>` : ''}</div>`;
  const legend = (r: Rec, titled: boolean) =>
    `<legend class="pb__rec-legend">Recommendation ${num(r)}${titled ? `: <span class="pb__rec-title" data-title="${r.id}">${escapeHtml(titleOf(r))}</span>` : ''}</legend>`;

  const step3 = (r: Rec) => {
    const chosen = chosenNeeds(plan, ctx);
    return `<fieldset class="pb__rec" data-rec="${r.id}">${legend(r, false)}
      ${field(r, 'text', 'What the organization will do')}
      <div class="field"><label for="${fid(r, 'fn')}">Led by</label><select class="select" id="${fid(r, 'fn')}" data-k="fn">${FUNCTIONS.map((f) => opt(f, FN_LABEL[f], r.fn === f)).join('')}</select></div>
      <div class="field"><label for="${fid(r, 'tool')}">Tool or theory that decided it</label><select class="select" id="${fid(r, 'tool')}" data-k="tool" aria-describedby="${fid(r, 'tool-hint')}">${TOOLS.map((t) => opt(t, TOOL_LABEL[t], r.tool === t)).join('')}</select><p class="field__hint" id="${fid(r, 'tool-hint')}" data-tool-hint>${escapeHtml(TOOL_DECIDES[r.tool])}</p></div>
      <fieldset class="pb__ticks pb__wide"><legend>What it answers</legend>${
        chosen.length
          ? chosen.map((n) => `<label class="pb__tick"><input type="checkbox" data-k="serves" value="${escapeHtml(n.id)}"${r.serves.includes(n.id) ? ' checked' : ''}> <span>${escapeHtml(n.text)}</span></label>`).join('')
          : '<p class="small muted">Choose the need and the challenges in step 1 first.</p>'
      }</fieldset>
      <fieldset class="pb__ticks pb__ticks--r pb__wide"><legend>Its evidence</legend>${cfg.resources
        .map((x) => `<label class="pb__tick"><input type="checkbox" data-k="evidence" value="${escapeHtml(x.id)}"${r.evidence.includes(x.id) ? ' checked' : ''}> <span><b>${escapeHtml(x.id)}</b> ${escapeHtml(x.title)}</span></label>`)
        .join('')}</fieldset>
      <p class="pb__wide pb__remove-row"><button type="button" class="btn btn--small" data-remove>Remove recommendation ${num(r)}</button></p>
    </fieldset>`;
  };

  const step4 = (r: Rec) => {
    const others = plan.recs.filter((x) => x !== r);
    return `<fieldset class="pb__rec" data-rec="${r.id}">${legend(r, true)}
      ${field(r, 'uses', 'What it uses of what the organization has', 'People, capacity, equipment or money, from the resources.')}
      <div class="field"><label for="${fid(r, 'funding')}">How it is paid for</label><select class="select" id="${fid(r, 'funding')}" data-k="funding">${FUNDING.map((f) => opt(f, FUNDING_LABEL[f], r.funding === f)).join('')}</select></div>
      <div class="field"><label for="${fid(r, 'stage')}">When</label><select class="select" id="${fid(r, 'stage')}" data-k="stage">${STAGES.map((s) => opt(s, STAGE_LABEL[s], r.stage === s)).join('')}</select></div>
      <fieldset class="pb__ticks pb__wide"><legend>Must come after</legend>${
        others.length
          ? others
              .map((o) => `<label class="pb__tick"><input type="checkbox" data-k="after" value="${o.id}"${r.after.includes(o.id) ? ' checked' : ''}> <span>Recommendation ${num(o)}: <span data-title="${o.id}">${escapeHtml(titleOf(o))}</span></span></label>`)
              .join('')
          : '<p class="small muted">There is nothing else in the plan yet.</p>'
      }</fieldset>
      ${field(r, 'step', 'Its first step: who does what first')}
    </fieldset>`;
  };

  const step5 = (r: Rec) => `<fieldset class="pb__rec" data-rec="${r.id}">${legend(r, true)}
      ${field(r, 'gain', 'Expected impact: what it gains, and for whom')}
      <fieldset class="pb__ticks pb__wide"><legend>The other areas it affects</legend>${FUNCTIONS.filter((f) => f !== r.fn)
        .map((f) => `<label class="pb__tick"><input type="checkbox" data-k="areas" value="${f}"${r.areas.includes(f) ? ' checked' : ''}> <span>${FN_LABEL[f]}</span></label>`)
        .join('')}</fieldset>
      <div class="field pb__wide"><label for="${fid(r, 'tradeoff')}">The trade-off between areas</label><textarea class="textarea pb__short" id="${fid(r, 'tradeoff')}" data-k="tradeoff" rows="2" maxlength="600">${escapeHtml(r.tradeoff)}</textarea></div>
    </fieldset>`;

  const DRAW: Record<RecStep, (r: Rec) => string> = { 3: step3, 4: step4, 5: step5 };
  const drawRecs = (steps: RecStep[]) => {
    for (const n of steps) {
      const box = boxes[n];
      if (box) box.innerHTML = plan.recs.map(DRAW[n]).join('');
    }
  };

  /* ---------- The plan in order, and the checks ---------- */

  const badge = (c: Criterion) =>
    c === 'All' ? '<span aria-hidden="true">All</span><span class="sr-only">All criteria.</span>' : `<span class="sr-only">Criterion </span>${c}<span class="sr-only">.</span>`;
  const item = (p: Prompt) =>
    `<li class="is-${p.status}"><span class="pb__st">${STATUS_WORD[p.status]}</span><span class="pb__crit">${badge(p.criterion)}</span><span class="pb__txt">${escapeHtml(p.text)}</span></li>`;
  const sorted = (ps: Prompt[]) => [...ps].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const viewHtml = () => {
    const recs = writtenRecs(plan);
    const chosen = chosenNeeds(plan, ctx);
    const needs = chosen.filter((n) => n.kind === 'need');
    const head = [
      needs.length ? `<p><b>Meets:</b> ${escapeHtml(needs.map((n) => n.text).join('; '))}</p>` : '',
      plan.direction ? `<p><b>Direction:</b> ${escapeHtml(DIRECTION_LABEL[plan.direction])}${plan.why.trim() ? `. ${escapeHtml(plan.why.trim())}` : ''}</p>` : '',
    ].join('');
    if (!recs.length) return `${head}<p class="small muted">Your recommendations appear here, in order, as you write them.</p>`;
    const meta = (r: Rec) =>
      [
        FN_LABEL[r.fn],
        r.evidence.length ? r.evidence.join(', ') : '',
        r.after.length
          ? `after ${r.after
              .map((id) => recById(id))
              .filter((x): x is Rec => x !== undefined)
              .map(num)
              .join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('; ');
    const cols = STAGES.map((s) => {
      const at = recs.filter((r) => r.stage === s);
      return `<div class="pb__col"><p class="label">${STAGE_LABEL[s]}</p>${
        at.length
          ? `<ol class="pb__col-list">${at.map((r) => `<li value="${num(r)}"><span class="pb__vt">${escapeHtml(r.text.trim())}</span><span class="pb__vm">${escapeHtml(meta(r))}</span>${r.step.trim() ? `<span class="pb__vm">First step: ${escapeHtml(r.step.trim())}</span>` : ''}</li>`).join('')}</ol>`
          : '<p class="small muted">Nothing yet.</p>'
      }</div>`;
    }).join('');
    return `${head}<div class="pb__cols">${cols}</div>`;
  };

  const refresh = () => {
    const prompts = reviewPlan(plan, ctx);
    for (const n of [1, 2, 3, 4, 5]) {
      const ul = root.querySelector<HTMLElement>(`[data-checks="${n}"]`);
      if (ul) ul.innerHTML = sorted(prompts.filter((p) => p.step === n)).map(item).join('');
    }
    review.innerHTML = GROUPS.map(([c, title]) => {
      const ps = prompts.filter((p) => p.criterion === c);
      return ps.length ? `<div class="pb__group"><p class="pb__group-title">${escapeHtml(title)}</p><ul class="pb__checks">${sorted(ps).map(item).join('')}</ul></div>` : '';
    }).join('');
    view.innerHTML = viewHtml();
    const t = tally(prompts);
    const line = `${t.met} of ${prompts.length} checks met${t.warn ? `; ${t.warn} to rethink` : ''}.`;
    if (status && status.textContent !== line) status.textContent = line;
    if (addBtn) addBtn.disabled = plan.recs.length >= MAX_RECS;
  };

  /* ---------- The fields that are always on the page ---------- */

  const fillStatic = () => {
    root.querySelectorAll<HTMLInputElement>('[data-need]').forEach((c) => (c.checked = plan.needs.includes(c.dataset.need ?? '')));
    for (const c of plan.custom) {
      const kind = root.querySelector<HTMLSelectElement>(`[data-custom-kind="${c.id}"]`);
      const text = root.querySelector<HTMLInputElement>(`[data-custom-text="${c.id}"]`);
      if (kind) kind.value = c.kind;
      if (text) text.value = c.text;
    }
    const dir = root.querySelector<HTMLSelectElement>('[data-direction]');
    const why = root.querySelector<HTMLInputElement>('[data-why]');
    const judgement = root.querySelector<HTMLTextAreaElement>('[data-judgement]');
    if (dir) dir.value = plan.direction;
    if (why) why.value = plan.why;
    if (judgement) judgement.value = plan.judgement;
    root.querySelectorAll<HTMLInputElement>('[data-review-k]').forEach((el) => {
      const row = plan.reviews[Number(el.dataset.reviewI)];
      el.value = row ? row[el.dataset.reviewK as keyof Review] : '';
    });
  };

  const onField = (e: Event) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement)) return;
    const checked = t instanceof HTMLInputElement && t.checked;
    const d = t.dataset;
    if (d.need !== undefined) {
      toggle(plan.needs, d.need, checked);
      drawRecs([3]);
    } else if (d.customKind || d.customText) {
      const c = plan.custom.find((x) => x.id === (d.customKind ?? d.customText));
      if (!c) return;
      if (d.customKind) c.kind = t.value as NeedKind;
      else c.text = t.value.slice(0, 200);
      drawRecs([3]);
    } else if (d.direction !== undefined) plan.direction = t.value as Direction;
    else if (d.why !== undefined) plan.why = t.value;
    else if (d.judgement !== undefined) plan.judgement = t.value;
    else if (d.reviewK) {
      const row = plan.reviews[Number(d.reviewI)];
      if (row) row[d.reviewK as keyof Review] = t.value;
    } else {
      const holder = t.closest<HTMLElement>('[data-rec]');
      const rec = recById(holder?.dataset.rec);
      const k = d.k;
      if (!rec || !holder || !k) return;
      if (k === 'text') {
        rec.text = t.value;
        root.querySelectorAll(`[data-title="${rec.id}"]`).forEach((el) => (el.textContent = titleOf(rec)));
      } else if (k === 'fn') {
        rec.fn = t.value as Fn;
        rec.areas = rec.areas.filter((a) => a !== rec.fn);
        drawRecs([5]);
      } else if (k === 'tool') {
        rec.tool = t.value as Tool;
        const hint = holder.querySelector('[data-tool-hint]');
        if (hint) hint.textContent = TOOL_DECIDES[rec.tool];
      } else if (k === 'serves' || k === 'evidence' || k === 'after') toggle(rec[k], t.value, checked);
      else if (k === 'areas') toggle(rec.areas, t.value, checked);
      else if (k === 'uses' || k === 'step' || k === 'gain' || k === 'tradeoff') rec[k] = t.value;
      else if (k === 'funding') rec.funding = t.value as Funding;
      else if (k === 'stage') rec.stage = t.value as Stage;
      else return;
    }
    save();
    refresh();
  };
  root.addEventListener('input', onField);
  root.addEventListener('change', onField);

  /* ---------- Adding and removing recommendations ---------- */

  const undoBar = document.createElement('p');
  undoBar.className = 'pb__undo';
  undoBar.hidden = true;
  addBtn?.closest('p')?.after(undoBar);

  addBtn?.addEventListener('click', () => {
    if (plan.recs.length >= MAX_RECS) return;
    const r = blankRec(nextRecId(plan));
    plan.recs.push(r);
    drawRecs([3, 4, 5]);
    save();
    refresh();
    document.getElementById(fid(r, 'text'))?.focus();
    announce(live ?? status, `Recommendation ${plan.recs.length} added. It also appears in steps 4 and 5.`);
  });

  boxes[3].addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-remove]');
    const rec = recById(btn?.closest<HTMLElement>('[data-rec]')?.dataset.rec);
    if (!btn || !rec) return;
    const at = plan.recs.indexOf(rec);
    removed = { rec, at, before: plan.recs.filter((r) => r.after.includes(rec.id)).map((r) => r.id) };
    plan.recs.splice(at, 1);
    for (const r of plan.recs) r.after = r.after.filter((id) => id !== rec.id);
    if (!plan.recs.length) plan.recs.push(blankRec(nextRecId(plan)));
    drawRecs([3, 4, 5]);
    save();
    refresh();
    undoBar.innerHTML = `<span>Recommendation ${at + 1} removed.</span> <button type="button" class="btn btn--small" data-undo>Undo</button>`;
    undoBar.hidden = false;
    undoBar.querySelector<HTMLButtonElement>('[data-undo]')?.focus();
    announce(live ?? status, `Recommendation ${at + 1} removed. Undo is available.`);
  });

  undoBar.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-undo]') || !removed) return;
    const { rec, at, before } = removed;
    if (plan.recs.length >= MAX_RECS) return;
    plan.recs.splice(Math.min(at, plan.recs.length), 0, rec);
    for (const r of plan.recs) if (before.includes(r.id) && !r.after.includes(rec.id)) r.after.push(rec.id);
    removed = null;
    undoBar.hidden = true;
    drawRecs([3, 4, 5]);
    save();
    refresh();
    document.getElementById(fid(rec, 'text'))?.focus();
    announce(live ?? status, `Recommendation ${num(rec)} restored.`);
  });

  /* ---------- Keeping the plan ---------- */

  root.querySelector('[data-txt]')?.addEventListener('click', () => download(cfg.file, planText(plan, ctx, cfg.organization), 'text/plain'));
  root.querySelector('[data-copy]')?.addEventListener('click', () => {
    const text = planText(plan, ctx, cfg.organization);
    if (!navigator.clipboard) {
      announce(live, 'Copying is not available in this browser: download the plan instead.');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => announce(live, 'The plan is copied.'),
      () => announce(live, 'Copying was blocked: download the plan instead.'),
    );
  });
  root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  twoStepReset(root, () => {
    store.remove(cfg.key);
    plan = blankPlan();
    removed = null;
    undoBar.hidden = true;
    fillStatic();
    drawRecs([3, 4, 5]);
    refresh();
    announce(live, 'The plan is cleared.');
  });

  fillStatic();
  drawRecs([3, 4, 5]);
  refresh();
});
