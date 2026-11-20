/**
 * A Paper 1 practice case in the browser: research notes on the context
 * topics, the case with tagged evidence (the opening, then the full case on
 * the day), a stakeholder analysis compared with the model, the choice of
 * tools with feedback, every question's answer built in parts with its
 * evidence and structure checks, the self-mark against the guidance, a timed
 * paper at the guide's durations, and export. The rules are in
 * src/lib/p1-practice.ts and the cases in src/lib/p1-cases.ts; the work is
 * kept in bb:p1-case:<id> and nowhere else.
 */
import { announce, each, escapeHtml, readConfig, store } from '../ix';
import { caseById, fullCase, type P1Case, type P1Question } from '../../lib/p1-cases';
import { TAGS, paragraphHtml, placeAll, quoted, splitCase, wordCount, type Paragraph, type Tag } from '../../lib/p1-workspace';
import {
  MAX_ATTEMPTS,
  MAX_ROWS,
  addItem,
  answerChecks,
  answersText,
  compareStakeholders,
  emptyWork,
  fmtRange,
  paperTotal,
  parseWork,
  questionMark,
  toolNotes,
  type CaseWork,
  type StakeRow,
} from '../../lib/p1-practice';
import { fmtClock, fmtDuration } from '../../lib/bank';
import { download, twoStepReset } from './ia-common';
import { attachTagger, type Pending } from './p1-tagger';

interface Config {
  id: string;
  organization: string;
  openingParas: number;
  reading: number;
  writing: number;
  sectionA: number;
}

const WORD = { ok: 'Fine', advice: 'Advice' } as const;

each('[data-ix="p1-case"]', (root) => {
  const cfg = readConfig<Config>(root);
  const c = caseById(cfg.id) as P1Case;
  if (!c) throw new Error(`Unknown case ${cfg.id}`);
  const KEY = `p1-case:${c.id}`;
  const live = root.querySelector<HTMLElement>('[data-live]');
  const q = <T extends HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<T>(sel);
  const qa = <T extends HTMLElement>(sel: string, from: ParentNode = root) => [...from.querySelectorAll<T>(sel)];
  let w: CaseWork = parseWork(store.get<unknown>(KEY, null), c);
  /** Nothing is written to storage until the reader does something. The title, address and time let the dashboard list the work. */
  const save = () => store.set(KEY, { ...w, title: `Paper 1 practice case: ${c.organization}`, href: `/assessment/paper-1/workspace/${c.id}/`, savedAt: new Date().toISOString() });
  let seq = 0;
  const newId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;

  const allParas: Paragraph[] = splitCase(fullCase(c));
  let paras: Paragraph[] = [];
  const caseEl = q<HTMLElement>('[data-case]');
  const palette = q<HTMLElement>('[data-palette]');
  const quote = q<HTMLElement>('[data-quote]');

  /* ---------- The case ---------- */

  const renderCase = () => {
    paras = w.revealed ? allParas : allParas.slice(0, cfg.openingParas);
    const placed = placeAll(w.items, paras);
    if (caseEl) caseEl.innerHTML = paras.map((p, i) => `<p class="ws-p p1c-p" data-para="${i}"><span class="p1c-p__n" aria-hidden="true">${i + 1}</span>${paragraphHtml(p, i, placed)}</p>`).join('');
    const note = q<HTMLElement>('[data-case-note]');
    if (note) note.textContent = w.revealed ? `The full case: ${wordCount(fullCase(c))} words. The first ${cfg.openingParas} paragraphs are the opening you had in advance.` : `The opening, released in advance: ${wordCount(c.opening)} words.`;
    const box = q<HTMLElement>('[data-reveal-box]');
    if (box) box.hidden = running !== null;
    const reveal = q<HTMLButtonElement>('[data-reveal]');
    if (reveal) reveal.hidden = w.revealed;
  };

  const tagger =
    caseEl && palette && quote
      ? attachTagger({
          caseEl,
          palette,
          quote,
          paras: () => paras,
          onTag: (p: Pending, tag: Tag) => {
            const before = w.items.length;
            w = addItem(w, { tag, text: p.text, para: p.para, start: p.start, end: p.end }, newId());
            save();
            const sentenceIndex = p.from?.dataset.s;
            renderCase();
            renderEvidence();
            renderQuestions();
            const back = sentenceIndex !== undefined ? caseEl.querySelector<HTMLElement>(`[data-para="${p.para}"] [data-s="${sentenceIndex}"]`) : null;
            back?.focus({ preventScroll: true });
            announce(live, w.items.length > before ? `Tagged as ${TAGS[tag].label}: ${p.text.slice(0, 80)}${p.text.length > 80 ? '…' : ''}. Tie it to an answer under the question.` : `Already tagged as ${TAGS[tag].label}.`);
          },
        })
      : null;

  const renderEvidence = () => {
    const list = q<HTMLElement>('[data-evidence]');
    const count = q<HTMLElement>('[data-count]');
    const ordered = [...w.items].sort((a, b) => a.para - b.para || a.start - b.start);
    if (count) count.textContent = ordered.length ? `${ordered.length} ${ordered.length === 1 ? 'piece' : 'pieces'} of evidence.` : 'Nothing tagged yet. Tag sentences in the case above.';
    if (list)
      list.innerHTML = ordered
        .map(
          (e) =>
            `<li class="p1c-ev" data-item="${escapeHtml(e.id)}"><span class="ws-label ws-label--${e.tag}">${escapeHtml(TAGS[e.tag].label)}</span><span class="p1c-ev__q">${escapeHtml(quoted(e.text))} <span class="small muted">paragraph ${e.para + 1}</span></span><button type="button" class="btn btn--small" data-remove>Remove<span class="sr-only"> this evidence</span></button></li>`,
        )
        .join('');
  };

  /* ---------- Research notes ---------- */

  qa<HTMLTextAreaElement>('[data-note-topic]').forEach((t) => {
    t.value = w.notes[Number(t.dataset.noteTopic)] ?? '';
  });

  /* ---------- Stakeholders ---------- */

  const stakeBody = q<HTMLElement>('[data-stake-rows]');
  const renderStakes = () => {
    if (!stakeBody) return;
    if (!w.stakeholders.length) w = { ...w, stakeholders: [{ name: '', interest: '', power: '', stance: '' }] };
    stakeBody.innerHTML = w.stakeholders
      .map((r, i) => {
        const opt = (v: string, cur: string) => `<option value="${v}"${v === cur ? ' selected' : ''}>${v || 'Choose'}</option>`;
        return `<tr data-row="${i}"><td><label class="sr-only" for="p1c-sn-${i}">Stakeholder ${i + 1}</label><input class="input" id="p1c-sn-${i}" data-k="name" value="${escapeHtml(r.name)}" autocomplete="off" /></td>
<td><label class="sr-only" for="p1c-si-${i}">What stakeholder ${i + 1} wants</label><input class="input" id="p1c-si-${i}" data-k="interest" value="${escapeHtml(r.interest)}" autocomplete="off" /></td>
<td><label class="sr-only" for="p1c-sp-${i}">Power of stakeholder ${i + 1}</label><select class="select" id="p1c-sp-${i}" data-k="power">${['', 'High', 'Low'].map((v) => opt(v, r.power)).join('')}</select></td>
<td><label class="sr-only" for="p1c-ss-${i}">Stance of stakeholder ${i + 1}</label><select class="select" id="p1c-ss-${i}" data-k="stance">${['', 'For', 'Against', 'Mixed'].map((v) => opt(v, r.stance)).join('')}</select></td>
<td><button type="button" class="btn btn--small" data-stake-remove>Remove<span class="sr-only"> stakeholder ${i + 1}</span></button></td></tr>`;
      })
      .join('');
    compareStakes();
  };
  const compareStakes = () => {
    const out = q<HTMLElement>('[data-stake-compare]');
    if (!out) return;
    const named = w.stakeholders.filter((r) => r.name.trim());
    if (!named.length) {
      out.textContent = '';
      return;
    }
    const { found, missing } = compareStakeholders(c.stakeholders, named);
    out.textContent = `You have named ${found.length} of the ${c.stakeholders.length} stakeholders in the model.${missing.length ? ` Not yet: ${missing.map((m) => m.name.replace(/ \(.*\)$/, '')).join('; ')}.` : ' Compare your power and stance with the model.'}`;
  };
  const readStakes = (): StakeRow[] =>
    qa<HTMLElement>('tr[data-row]', stakeBody ?? root).map((tr) => {
      const v = (k: string) => tr.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${k}"]`)?.value ?? '';
      const power = v('power');
      const stance = v('stance');
      return { name: v('name').slice(0, 200), interest: v('interest').slice(0, 500), power: power === 'High' || power === 'Low' ? power : '', stance: stance === 'For' || stance === 'Against' || stance === 'Mixed' ? stance : '' };
    });

  /* ---------- Tools ---------- */

  const renderTools = () => {
    qa<HTMLInputElement>('[data-tool]').forEach((b) => (b.checked = w.tools.includes(b.value)));
    const notes = q<HTMLElement>('[data-tool-notes]');
    if (!notes) return;
    notes.innerHTML = w.tools.length
      ? toolNotes(c, w.tools)
          .map((n) => `<li class="${n.chosen ? 'is-chosen' : 'is-also'}"><b>${escapeHtml(n.tool.name)}.</b> ${escapeHtml(n.text)}</li>`)
          .join('')
      : '';
  };

  /* ---------- The questions ---------- */

  const qEl = (id: string) => q<HTMLElement>(`[data-q="${id}"]`);
  const question = (id: string) => c.questions.find((x) => x.id === id) as P1Question;

  const renderChecks = (qq: P1Question) => {
    const el = qEl(qq.id);
    const list = el ? q<HTMLElement>('[data-checks]', el) : null;
    if (!list) return;
    list.innerHTML = answerChecks(qq, w.answers[qq.id], w.items, c.organization)
      .map((k) => `<li><span class="ws-w ws-w--${k.status}">${WORD[k.status]}</span><span>${escapeHtml(k.text)}</span></li>`)
      .join('');
  };

  const renderPick = (qq: P1Question) => {
    const el = qEl(qq.id);
    const box = el ? q<HTMLElement>('[data-ev-pick]', el) : null;
    if (!box || !el) return;
    const chosen = new Set(w.answers[qq.id]?.items ?? []);
    const ordered = [...w.items].sort((a, b) => a.para - b.para || a.start - b.start);
    box.innerHTML = ordered.length
      ? `<fieldset><legend class="sr-only">Evidence for question ${escapeHtml(qq.number)}</legend>${ordered
          .map((e) => `<label class="p1c-evpick__opt"><input type="checkbox" value="${escapeHtml(e.id)}" data-ev${chosen.has(e.id) ? ' checked' : ''} /><span class="ws-label ws-label--${e.tag}">${escapeHtml(TAGS[e.tag].label)}</span><span>${escapeHtml(quoted(e.text))} <span class="small muted">paragraph ${e.para + 1}</span></span></label>`)
          .join('')}</fieldset>`
      : '<p class="small muted">No evidence tagged yet: tag sentences in the case first.</p>';
    const n = q<HTMLElement>('[data-ev-n]', el);
    if (n) n.textContent = chosen.size ? `(${chosen.size})` : '';
  };

  const renderMark = (qq: P1Question) => {
    const el = qEl(qq.id);
    if (!el) return;
    const m = w.marks[qq.id];
    qa<HTMLInputElement>('[data-mark-point]', el).forEach((b) => (b.checked = (m?.points ?? []).includes(Number(b.dataset.markPoint))));
    qa<HTMLInputElement>('[data-mark-level]', el).forEach((b) => (b.checked = m?.level === b.value));
    const out = q<HTMLElement>('[data-mark]', el);
    const r = questionMark(qq, m);
    if (out) out.textContent = r ? `Your self-mark: ${fmtRange(r)} of ${qq.marks}.` : qq.scheme.kind === 'points' ? 'Tick each point your answer makes.' : 'Choose the level that best fits your answer.';
  };

  const renderQuestions = () => {
    for (const qq of c.questions) {
      const el = qEl(qq.id);
      if (!el) continue;
      const a = w.answers[qq.id];
      qa<HTMLTextAreaElement>('[data-slot]', el).forEach((t) => {
        if (document.activeElement !== t) t.value = a?.slots[t.dataset.slot ?? ''] ?? '';
      });
      renderPick(qq);
      renderChecks(qq);
      renderMark(qq);
      el.classList.toggle('is-unchosen', qq.section === 'B' && w.choice !== null && w.choice !== qq.id);
    }
    qa<HTMLInputElement>('[data-choice]').forEach((r) => (r.checked = r.value === w.choice));
    renderTotal();
  };

  const renderTotal = () => {
    const out = q<HTMLElement>('[data-total]');
    if (!out) return;
    const t = paperTotal(c, w);
    const marked = t.aToMark < c.questions.filter((x) => x.section === 'A').length || t.b !== null;
    out.textContent = !marked
      ? 'Nothing self-marked yet. Open the guidance under each question once you have answered it.'
      : `Your self-marked total: ${fmtRange(t.total)} of ${t.max}. Section A ${fmtRange(t.a)} of ${t.aMax}${t.aToMark ? ` (${t.aToMark} still to mark)` : ''}; Section B ${t.b ? `${fmtRange(t.b)} of ${t.bMax}` : w.choice ? 'not yet marked' : 'no question chosen yet'}.`;
    const rows = q<HTMLElement>('[data-attempts]');
    const wrap = q<HTMLElement>('[data-attempts-wrap]');
    if (wrap) wrap.hidden = !w.attempts.length;
    if (rows)
      rows.innerHTML = [...w.attempts]
        .reverse()
        .map((a) => {
          const d = new Date(a.at);
          const when = Number.isNaN(d.getTime()) ? a.at : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          return `<tr><th scope="row">${escapeHtml(when)}</th><td class="n">${escapeHtml(fmtDuration(a.reading))}</td><td class="n">${escapeHtml(fmtDuration(a.used))}</td><td class="n">${escapeHtml(fmtDuration(a.allowed))}</td></tr>`;
        })
        .join('');
  };

  /* ---------- Events ---------- */

  let typing = 0;
  const later = (fn: () => void) => {
    window.clearTimeout(typing);
    typing = window.setTimeout(fn, 250);
  };

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (t.matches('[data-note-topic]')) {
      const notes = c.context.map((_, i) => w.notes[i] ?? '');
      notes[Number((t as HTMLTextAreaElement).dataset.noteTopic)] = t.value.slice(0, 3000);
      w = { ...w, notes };
      later(save);
      return;
    }
    if (t.closest('tr[data-row]') && t.matches('input')) {
      w = { ...w, stakeholders: readStakes() };
      later(() => {
        save();
        compareStakes();
      });
      return;
    }
    if (t.matches('[data-slot]')) {
      const qid = t.closest<HTMLElement>('[data-q]')?.dataset.q ?? '';
      const qq = question(qid);
      if (!qq) return;
      const prev = w.answers[qid] ?? { slots: {}, items: [] };
      w = { ...w, answers: { ...w.answers, [qid]: { ...prev, slots: { ...prev.slots, [(t as HTMLTextAreaElement).dataset.slot ?? '']: t.value.slice(0, 3000) } } } };
      later(() => {
        save();
        renderChecks(qq);
      });
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.closest('tr[data-row]') && t.matches('select')) {
      w = { ...w, stakeholders: readStakes() };
      save();
      compareStakes();
      return;
    }
    if (t.matches('[data-tool]')) {
      const on = (t as HTMLInputElement).checked;
      w = { ...w, tools: on ? [...new Set([...w.tools, t.value])] : w.tools.filter((x) => x !== t.value) };
      save();
      renderTools();
      const note = toolNotes(c, w.tools).find((n) => n.tool.id === t.value);
      announce(live, on && note ? `${note.tool.name}: ${note.text}` : 'Tool removed.');
      return;
    }
    if (t.matches('[data-choice]')) {
      w = { ...w, choice: t.value };
      save();
      renderQuestions();
      announce(live, `You are answering question ${question(t.value)?.number ?? ''} in Section B.`);
      return;
    }
    const qid = t.closest<HTMLElement>('[data-q]')?.dataset.q ?? '';
    const qq = question(qid);
    if (!qq) return;
    if (t.matches('[data-ev]')) {
      const prev = w.answers[qid] ?? { slots: {}, items: [] };
      const items = (t as HTMLInputElement).checked ? [...new Set([...prev.items, t.value])] : prev.items.filter((x) => x !== t.value);
      w = { ...w, answers: { ...w.answers, [qid]: { ...prev, items } } };
      save();
      renderChecks(qq);
      const n = q<HTMLElement>('[data-ev-n]', qEl(qid) ?? root);
      if (n) n.textContent = items.length ? `(${items.length})` : '';
      return;
    }
    if (t.matches('[data-mark-point]') || t.matches('[data-mark-level]')) {
      const el = qEl(qid);
      const points = el ? qa<HTMLInputElement>('[data-mark-point]', el).filter((b) => b.checked).map((b) => Number(b.dataset.markPoint)) : [];
      const level = el ? (qa<HTMLInputElement>('[data-mark-level]', el).find((b) => b.checked)?.value ?? null) : null;
      w = { ...w, marks: { ...w.marks, [qid]: { points, level } } };
      if (qq.section === 'B' && !w.choice) w = { ...w, choice: qid };
      save();
      renderMark(qq);
      renderTotal();
      qa<HTMLInputElement>('[data-choice]').forEach((r) => (r.checked = r.value === w.choice));
      const r = questionMark(qq, w.marks[qid]);
      announce(live, r ? `Question ${qq.number}: ${fmtRange(r)} of ${qq.marks}.` : `Question ${qq.number}: not marked.`);
    }
  });

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.matches('[data-remove]')) {
      const id = b.closest<HTMLElement>('[data-item]')?.dataset.item;
      if (!id) return;
      const answers = Object.fromEntries(Object.entries(w.answers).map(([k, a]) => [k, { ...a, items: a.items.filter((x) => x !== id) }]));
      w = { ...w, items: w.items.filter((x) => x.id !== id), answers };
      save();
      renderCase();
      renderEvidence();
      renderQuestions();
      q<HTMLElement>('[data-count]')?.focus();
      announce(live, 'Evidence removed, and taken out of every answer.');
    } else if (b.matches('[data-stake-add]')) {
      if (w.stakeholders.length >= MAX_ROWS) return;
      w = { ...w, stakeholders: [...readStakes(), { name: '', interest: '', power: '', stance: '' }] };
      save();
      renderStakes();
      q<HTMLInputElement>(`#p1c-sn-${w.stakeholders.length - 1}`)?.focus();
    } else if (b.matches('[data-stake-remove]')) {
      const i = Number(b.closest<HTMLElement>('tr[data-row]')?.dataset.row);
      const rows = readStakes().filter((_, k) => k !== i);
      w = { ...w, stakeholders: rows.length ? rows : [{ name: '', interest: '', power: '', stance: '' }] };
      save();
      renderStakes();
      q<HTMLButtonElement>('[data-stake-add]')?.focus();
      announce(live, 'Stakeholder removed.');
    }
  });

  /* ---------- Examination day: the full case and the clock ---------- */

  interface Running {
    since: number | null;
    banked: number;
    timer: number;
    said: Set<string>;
  }
  let running: Running | null = null;
  const bar = q<HTMLElement>('[data-clock-bar]');
  const clock = q<HTMLElement>('[data-clock]');
  const state = q<HTMLElement>('[data-clock-state]');
  const info = q<HTMLElement>('[data-clock-info]');
  const pause = q<HTMLButtonElement>('[data-clock-pause]');
  const elapsed = (r: Running) => (r.banked + (r.since === null ? 0 : performance.now() - r.since)) / 1000;

  const reveal = (focus: boolean) => {
    if (!w.revealed) {
      w = { ...w, revealed: true };
      save();
    }
    renderCase();
    renderEvidence();
    if (focus) caseEl?.querySelector<HTMLElement>(`[data-para="${cfg.openingParas}"] .ws-s`)?.focus();
  };

  q<HTMLButtonElement>('[data-reveal]')?.addEventListener('click', () => {
    reveal(true);
    announce(live, `The full case is open: ${allParas.length} paragraphs. The new information starts at paragraph ${cfg.openingParas + 1}.`);
  });

  const tick = () => {
    const r = running;
    if (!r || !clock) return;
    const t = elapsed(r);
    const reading = t < cfg.reading;
    const left = reading ? cfg.reading - t : cfg.reading + cfg.writing - t;
    const over = !reading && left < 0;
    clock.textContent = over ? `+${fmtClock(-left)}` : fmtClock(left);
    if (state) state.textContent = r.since === null ? 'Paused' : reading ? 'Reading time' : over ? 'Over time' : 'Writing time';
    const say = (k: string, text: string) => {
      if (!r.said.has(k)) {
        r.said.add(k);
        announce(live, text);
      }
    };
    if (!reading) say('write', 'Reading time is over. You may start writing: 1 hour 30 minutes.');
    if (t >= cfg.reading + cfg.sectionA) say('a', 'The suggested time for Section A has passed: move on to Section B.');
    if (!over && !reading && left <= 300) say('five', 'Five minutes left.');
    if (over) say('over', 'Time is up. Finish when you are ready; the clock now counts the time over.');
    bar?.classList.toggle('is-low', !over && !reading && left <= 300);
  };

  const stop = () => {
    if (running) window.clearInterval(running.timer);
    running = null;
    if (bar) bar.hidden = true;
    renderCase();
  };

  q<HTMLButtonElement>('[data-start-paper]')?.addEventListener('click', () => {
    if (running) return;
    reveal(false);
    running = { since: performance.now(), banked: 0, timer: 0, said: new Set() };
    if (bar) bar.hidden = false;
    if (info) info.textContent = `Five minutes' reading time, then 1 hour 30 minutes. Read the questions first, then the case. About ${fmtDuration(cfg.sectionA)} for Section A is a suggestion, not a rule.`;
    if (pause) pause.textContent = 'Pause';
    tick();
    running.timer = window.setInterval(tick, 250);
    renderCase();
    bar?.scrollIntoView({ block: 'start' });
    pause?.focus();
    announce(live, 'The timed paper has started with five minutes of reading time.');
  });

  pause?.addEventListener('click', () => {
    const r = running;
    if (!r) return;
    if (r.since === null) {
      r.since = performance.now();
      pause.textContent = 'Pause';
      announce(live, 'Clock running.');
    } else {
      r.banked += performance.now() - r.since;
      r.since = null;
      pause.textContent = 'Resume';
      announce(live, 'Clock paused.');
    }
    tick();
  });

  q<HTMLButtonElement>('[data-clock-finish]')?.addEventListener('click', () => {
    const r = running;
    if (!r) return;
    const t = Math.round(elapsed(r));
    const reading = Math.min(t, cfg.reading);
    const used = Math.max(0, t - cfg.reading);
    w = { ...w, attempts: [...w.attempts, { at: new Date().toISOString(), reading, used, allowed: cfg.writing }].slice(-MAX_ATTEMPTS) };
    save();
    stop();
    renderTotal();
    const over = used - cfg.writing;
    const msg = `Paper finished: ${fmtDuration(used)} of writing time used of 1 hour 30 minutes${over > 0 ? `, ${fmtDuration(over)} over` : ''}. Now open the guidance under each question and mark your answers.`;
    q<HTMLElement>('[data-total]')?.focus();
    announce(live, msg);
  });

  q<HTMLButtonElement>('[data-clock-quit]')?.addEventListener('click', () => {
    stop();
    q<HTMLButtonElement>('[data-start-paper]')?.focus();
    announce(live, 'The timed paper was stopped. Nothing was recorded.');
  });

  /* ---------- Export ---------- */

  q<HTMLButtonElement>('[data-txt]')?.addEventListener('click', () => {
    download(`business-brief-paper-1-${c.id}.txt`, answersText(c, w), 'text/plain;charset=utf-8');
    announce(live, 'Your answers were downloaded.');
  });
  q<HTMLButtonElement>('[data-json]')?.addEventListener('click', () => {
    download(`business-brief-paper-1-${c.id}.json`, JSON.stringify({ exported: new Date().toISOString(), key: `bb:${KEY}`, work: w }, null, 2), 'application/json');
    announce(live, 'A backup was downloaded.');
  });
  q<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());
  twoStepReset(root, () => {
    w = emptyWork();
    store.remove(KEY);
    tagger?.close(false);
    stop();
    qa<HTMLTextAreaElement>('[data-note-topic]').forEach((t) => (t.value = ''));
    renderAll();
    announce(live, 'Your work on this case was cleared from this device.');
  });

  const renderAll = () => {
    renderCase();
    renderEvidence();
    renderStakes();
    renderTools();
    renderQuestions();
  };
  renderAll();
});
