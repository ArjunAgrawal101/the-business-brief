/**
 * The dashboard (/dashboard/). Reads every item this site keeps in this
 * browser, turns them into a view with dashboardView() (src/lib/dashboard.ts)
 * and renders each section. It writes only when the reader asks: removing a
 * saved item, pausing the record, importing a copy or clearing what is kept,
 * and the last three are confirmed first. It re-renders when another tab
 * changes what is kept.
 */
import { each, escapeHtml as h, readConfig } from './ix';
import { courseChartSvg, dashboardView, shortDate, tallyWords, type DashConfig, type DashboardView, type Row } from '../lib/dashboard';
import {
  LEARNER_KEY,
  SAVED_KEY,
  SAVED_KIND_LABELS,
  VISIT_KINDS,
  VISIT_KIND_LABELS,
  buildExport,
  emptyLog,
  parseLog,
  parseSaved,
  planImport,
  removeSaved,
  validateImport,
  type Visit,
} from '../lib/learner';
import { readItem, removeItem, siteItems, storageWorks, writeItem } from './storage';

const n = (x: number) => x.toLocaleString('en-GB');
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

each('[data-ix="progress"]', (root) => {
  const cfg = readConfig<DashConfig>(root);
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const msgEl = $('[data-msg]');
  const say = (text: string) => {
    if (msgEl) msgEl.textContent = text;
  };

  if (!storageWorks()) {
    const box = $('[data-unavailable]');
    if (box) box.hidden = false;
    root.querySelectorAll<HTMLElement>('[data-needs-storage]').forEach((el) => (el.hidden = true));
    return;
  }

  /* ---------- Rendering ---------- */

  const tallyHtml = (r: Row) =>
    r.tally
      ? `Checked ${n(r.tally.checked)} of ${n(r.tally.total)}: <span class="db-v db-v--right">${n(r.tally.right)} right</span>, <span class="db-v db-v--partial">${n(r.tally.partial)} partly right</span>, <span class="db-v db-v--wrong">${n(r.tally.wrong)} not yet right</span>`
      : h(r.state);

  const rowList = (rows: Row[]) =>
    `<ul class="pr-list db-rowlist">${rows
      .map((r) => `<li><a href="${h(r.href)}">${h(r.title)}</a><span class="pr-state${r.done ? ' pr-state--done' : ''}">${tallyHtml(r)}</span></li>`)
      .join('')}</ul>`;

  const group = (title: string, rows: Row[], empty: string) =>
    `<div class="pr-group db-group"><h3 class="db-group__h">${h(title)} <span class="db-count">${n(rows.length)}</span></h3>${rows.length ? rowList(rows) : `<p class="db-none">${empty}</p>`}</div>`;

  const visitItem = (v: Visit, now: Date) =>
    `<li><a href="${h(v.url)}">${h(v.title)}</a><span class="db-list__meta">${plural(v.count, 'visit', 'visits')}, last ${h(shortDate(v.last, now))}</span></li>`;

  const render = () => {
    const items = siteItems() ?? {};
    const view: DashboardView = dashboardView(items, cfg);
    const f = view.figures;
    const now = new Date();

    const empty = $('[data-empty]');
    if (empty) empty.hidden = view.any;

    // Status line
    const status = $('[data-statusline]');
    if (status) {
      const kept = Object.keys(items).length;
      const times = [...view.log.visits.map((v) => v.last), ...view.saved.items.map((s) => s.saved)].sort();
      const last = times[times.length - 1];
      status.innerHTML = [
        `<span class="db-dot${view.log.paused ? ' db-dot--off' : ''}" aria-hidden="true"></span>${view.log.paused ? 'Not noting the pages you open: paused' : 'Noting the pages you open'}`,
        `${plural(kept, 'item', 'items')} kept in this browser`,
        last ? `last activity ${h(shortDate(last, now))}` : '',
        `<a href="#data">What is kept, and how to clear it</a>`,
      ]
        .filter(Boolean)
        .join('<span class="db-sep" aria-hidden="true"> · </span>');
    }

    // At a glance
    const lead = $('[data-lead]');
    if (lead)
      lead.innerHTML = `<p class="db-lead__fig"><span class="db-lead__n">${n(f.explored)}</span><span class="db-lead__of"> of ${n(f.subtopics)}</span></p>
        <p class="db-lead__label">subtopics explored</p>
        <p class="db-lead__note">${f.explored ? `${plural(f.practised, 'of them practised', 'of them practised')}. Of the ${n(f.complete)} subtopics complete on the platform, you have explored ${n(f.completeExplored)}.` : `None yet. Open a subtopic's page or its mindmap and it counts as explored; rate its cards or answer a question on it and it counts as practised.`}</p>`;
    const sum = $('[data-summary]');
    if (sum) {
      const figs: Array<[string, string, string]> = [
        ['Mindmaps viewed', n(f.mindmaps), `of ${n(cfg.totals.mindmaps)}`],
        ['Cases opened', n(f.cases), `of ${n(cfg.totals.cases)} case files`],
        ['Practice questions answered', n(f.answered), `${n(f.marked)} self-marked, of ${n(f.questions)}`],
        ['Exercise items checked', n(f.checked.checked), f.checked.checked ? tallyWords(f.checked) : 'Checked items appear here'],
        ['Retrieval cards rated', n(f.cards.rated), f.cards.rated ? `${n(f.cards.got)} got it, ${n(f.cards.partly)} partly, ${n(f.cards.notYet)} not yet` : ''],
        ['Case lab stages done', `${n(f.labStages)} of ${n(f.labStagesAll)}`, ''],
        ['Decision Rooms finished', `${n(f.roomsDone)} of ${n(f.rooms)}`, ''],
        ['Case decisions made', `${n(f.caseDecisions)} of ${n(f.caseDecisionsAll)}`, 'in the case files'],
        ['Boardroom simulations finished', `${n(f.simulationsDone)} of ${n(f.simulations)}`, ''],
        ['Strategy Studio analyses', `${n(f.analyses)} of ${n(f.analysesAll)}`, ''],
        ['Pieces of work kept', n(f.work), 'by the tools in the rooms'],
        ['Saved items', n(f.saved), ''],
      ];
      sum.innerHTML = figs.map(([k, v, note]) => `<div class="fig"><dt>${h(k)}</dt><dd><span class="fig__v">${h(v)}</span>${note ? `<span class="fig__n">${h(note)}</span>` : ''}</dd></div>`).join('');
    }

    // Your course
    const chart = $('[data-course-chart]');
    if (chart) chart.innerHTML = `${courseChartSvg(view.course.units, view.course.rows, cfg.subtopics)}<figcaption class="db-chart__cap">Each square is a subtopic. Filled: practised. Half filled: explored. Outline: not started.</figcaption>`;
    const table = $('[data-course-table]');
    if (table) {
      const u = view.course.units;
      const tot = u.reduce((a, x) => ({ total: a.total + x.total, explored: a.explored + x.explored, practised: a.practised + x.practised, complete: a.complete + x.complete }), { total: 0, explored: 0, practised: 0, complete: 0 });
      table.innerHTML = `<caption class="sr-only">Your progress by unit, against the platform's coverage</caption>
        <thead><tr><th scope="col">Unit</th><th scope="col" class="n">Subtopics</th><th scope="col" class="n">Explored</th><th scope="col" class="n">Practised</th><th scope="col" class="n">Complete on the platform</th></tr></thead>
        <tbody>${u.map((x) => `<tr><th scope="row">Unit ${x.number} <span class="db-units__t">${h(x.title)}</span></th><td class="n">${x.total}</td><td class="n">${x.explored}</td><td class="n">${x.practised}</td><td class="n">${x.complete}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row">The course</th><td class="n">${tot.total}</td><td class="n">${tot.explored}</td><td class="n">${tot.practised}</td><td class="n">${tot.complete}</td></tr></tfoot>`;
    }
    for (const u of view.course.units) {
      const el = root.querySelector<HTMLElement>(`[data-unit-sum="${u.number}"]`);
      if (el) el.textContent = `${u.explored} of ${u.total} explored, ${u.practised} practised`;
    }
    for (const r of view.course.rows) {
      const li = root.querySelector<HTMLElement>(`.db-row[data-code="${CSS.escape(r.code)}"]`);
      if (!li) continue;
      li.classList.toggle('is-practised', r.status === 'practised');
      li.classList.toggle('is-explored', r.status === 'explored');
      const mark = li.querySelector<HTMLElement>('[data-mark]');
      if (mark) mark.className = `db-mark js-only${r.status === 'none' ? '' : ` db-mark--${r.status}`}`;
      const you = li.querySelector<HTMLElement>('[data-you]');
      if (you) you.textContent = r.words;
    }

    // Where you have been
    const visits = $('[data-visits]');
    if (visits)
      visits.innerHTML = VISIT_KINDS.map((k) => {
        const list = view.visits[k];
        const start = cfg.starts[k];
        const head = `<h3 class="db-col__h">${h(VISIT_KIND_LABELS[k])} <span class="db-count">${n(list.length)}</span></h3>`;
        if (!list.length) return `<div class="db-col">${head}<p class="db-none">None yet. Start with <a href="${h(start.href)}">${h(start.title)}</a>.</p></div>`;
        const first = list.slice(0, 6).map((v) => visitItem(v, now)).join('');
        const rest = list.slice(6);
        return `<div class="db-col">${head}<ol class="db-list" role="list">${first}</ol>${
          rest.length ? `<details class="db-more"><summary>${plural(rest.length, 'more', 'more')}</summary><ol class="db-list" role="list">${rest.map((v) => visitItem(v, now)).join('')}</ol></details>` : ''
        }</div>`;
      }).join('');

    // Practice and activities
    const groups = $('[data-groups]');
    if (groups) {
      const p = view.practice;
      groups.innerHTML = [
        group('Practice questions', p.questions, 'None answered yet. Every <a href="/exam-desk/practice/">practice question</a> has a box for your answer and a self-check against its mark scheme.'),
        group('Exercises', p.exercises, 'None checked yet. The classification exercises on the topic pages tell you what is right as you check each item: try the one in <a href="/topics/costs-and-revenues/">3.3 Costs and revenues</a>.'),
        group('Case labs', p.labs, 'No stage done yet. <a href="/case-room/">The Case Room</a> works a case from the problem to a judgement on the results.'),
        group('Decision Rooms', p.decisions, 'No decision made yet. In a <a href="/decision-room/">Decision Room</a> you commit to a choice and see what it does.'),
        group('Boardroom', p.simulations, 'No simulation started yet. In the <a href="/boardroom/">Boardroom</a> you take a seat and decide round by round.'),
        group('Case decisions', p.cases, 'None made yet. The case files in the <a href="/case-vault/">Case Vault</a> end with a decision to commit to and defend.'),
        group('Retrieval cards', p.retrieval, 'None rated yet. Subtopics with full notes end with cards to answer from memory and rate.'),
      ].join('');
    }

    // Saved, and your work
    const saved = $('[data-saved]');
    const savedN = $('[data-saved-n]');
    if (savedN) savedN.textContent = n(view.saved.items.length);
    if (saved)
      saved.innerHTML = view.saved.items.length
        ? `<ul class="db-saved" role="list">${view.saved.items
            .map(
              (s, i) =>
                `<li><span class="db-saved__kind">${h(SAVED_KIND_LABELS[s.kind])}</span><a class="db-saved__title" href="${h(s.url)}">${h(s.title)}</a><span class="db-saved__when">Saved ${h(shortDate(s.saved, now))}</span><button type="button" class="db-remove" data-remove="${h(s.url)}" data-i="${i}" aria-label="Remove ${h(s.title)} from your saved items">Remove</button></li>`,
            )
            .join('')}</ul>`
        : '<p class="db-none">Nothing saved yet. Use <strong>Save</strong> on a subtopic, a glossary term, a case, a mindmap, a toolkit guide, a diagram or a practice question to keep it here.</p>';
    const work = $('[data-work]');
    const workN = $('[data-work-n]');
    if (workN) workN.textContent = n(view.work.length);
    if (work)
      work.innerHTML = view.workGroups.length
        ? view.workGroups
            .map(
              (g) =>
                `<div class="pr-group db-workgroup"><h4 class="db-workgroup__h">${h(g.room)}</h4><ul class="db-work" role="list">${g.items
                  .map((w) => `<li><a class="db-work__title" href="${h(w.href)}">${h(w.title)}</a><span class="db-work__detail">${h(w.detail)}${w.when ? `, saved ${h(shortDate(w.when, now))}` : ''}</span></li>`)
                  .join('')}</ul></div>`,
            )
            .join('')
        : '<p class="db-none">No tool work kept yet. The tools in the rooms keep your figures, choices and notes, and list them here: try the <a href="/strategy-studio/">Strategy Studio</a> or the <a href="/entrepreneurship-lab/">Entrepreneurship Lab</a>.</p>';

    // Your data
    const record = $<HTMLInputElement>('[data-record]');
    if (record) record.checked = !view.log.paused;
  };

  /* ---------- Confirmations ---------- */

  const dialog = $<HTMLDialogElement>('[data-dialog]');
  const ask = (opts: { title: string; body: string; confirm: string; choice?: boolean }): Promise<{ ok: boolean; scope: string }> => {
    if (!dialog || typeof dialog.showModal !== 'function') {
      const text = opts.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return Promise.resolve({ ok: window.confirm(`${opts.title}\n\n${text}`), scope: 'visits' });
    }
    const title = dialog.querySelector<HTMLElement>('[data-dialog-title]');
    const body = dialog.querySelector<HTMLElement>('[data-dialog-body]');
    const choice = dialog.querySelector<HTMLFieldSetElement>('[data-dialog-choice]');
    const confirm = dialog.querySelector<HTMLButtonElement>('[data-dialog-confirm]');
    if (title) title.textContent = opts.title;
    if (body) body.innerHTML = opts.body;
    if (confirm) confirm.textContent = opts.confirm;
    if (choice) {
      choice.hidden = !opts.choice;
      const first = choice.querySelector<HTMLInputElement>('input[value="visits"]');
      if (first) first.checked = true;
    }
    return new Promise((resolve) => {
      dialog.addEventListener(
        'close',
        () => resolve({ ok: dialog.returnValue === 'confirm', scope: choice?.querySelector<HTMLInputElement>('input:checked')?.value ?? 'visits' }),
        { once: true },
      );
      dialog.returnValue = '';
      dialog.showModal();
    });
  };

  /* ---------- Actions ---------- */

  root.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const remove = t.closest<HTMLButtonElement>('[data-remove]');
    if (remove) {
      const url = remove.dataset.remove ?? '';
      const list = parseSaved(readItem(SAVED_KEY));
      const item = list.items.find((x) => x.url === url);
      const i = Number(remove.dataset.i ?? 0);
      if (!writeItem(SAVED_KEY, JSON.stringify(removeSaved(list, url)))) {
        say('This browser would not change its storage, so nothing was removed.');
        return;
      }
      render();
      const left = [...root.querySelectorAll<HTMLButtonElement>('[data-remove]')];
      (left[i] ?? left[i - 1] ?? root.querySelector<HTMLElement>('#db-saved-list-h'))?.focus();
      say(`Removed ${item?.title ?? 'the item'} from your saved items.`);
      return;
    }

    const exportBtn = t.closest<HTMLButtonElement>('[data-export]');
    if (exportBtn) {
      const items = siteItems() ?? {};
      const file = buildExport(Object.entries(items), new Date());
      const count = Object.keys(file.items).length;
      if (!count) {
        say('There is nothing to download yet: this browser keeps nothing for the site.');
        return;
      }
      const res = await ask({
        title: 'Download a copy of your data?',
        body: `<p>The file will hold the ${plural(count, 'item', 'items')} this site keeps in this browser: your answers and self-checks, ratings, choices, plans, notes, saved items and visit history.</p><p>It is made here, in your browser, and sent nowhere. Anyone who has it can read it, so keep it private.</p>`,
        confirm: 'Download the file',
      });
      exportBtn.focus();
      if (!res.ok) {
        say('Nothing was downloaded.');
        return;
      }
      const name = `business-brief-data-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.hidden = true;
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 2000);
      say(`Downloaded ${name}, with ${plural(count, 'item', 'items')}.`);
      return;
    }

    const resetBtn = t.closest<HTMLButtonElement>('[data-reset]');
    if (resetBtn) {
      const res = await ask({
        title: 'Clear what is kept?',
        body: '<p>Choose what to clear from this browser. It cannot be undone, so download a copy first if you may want it back.</p>',
        confirm: 'Clear',
        choice: true,
      });
      resetBtn.focus();
      if (!res.ok) {
        say('Nothing was cleared.');
        return;
      }
      const paused = parseLog(readItem(LEARNER_KEY)).paused;
      const keepPause = () => (paused ? writeItem(LEARNER_KEY, JSON.stringify({ ...emptyLog(), paused: true })) : true);
      if (res.scope === 'saved') {
        removeItem(SAVED_KEY);
        say('Your saved items are cleared.');
      } else if (res.scope === 'all') {
        Object.keys(siteItems() ?? {}).forEach((k) => removeItem(k));
        keepPause();
        document.documentElement.removeAttribute('data-level');
        say(`Everything this site kept in this browser is cleared.${paused ? ' Your choice not to note pages is kept.' : ''}`);
      } else {
        removeItem(LEARNER_KEY);
        keepPause();
        say('The visit history is cleared.');
      }
      render();
    }
  });

  const record = $<HTMLInputElement>('[data-record]');
  record?.addEventListener('change', () => {
    const log = parseLog(readItem(LEARNER_KEY));
    if (!writeItem(LEARNER_KEY, JSON.stringify({ ...log, paused: !record.checked }))) {
      say('This browser would not change its storage.');
      record.checked = !record.checked;
      return;
    }
    say(record.checked ? 'The pages you open are noted again.' : 'Paused: nothing new will be noted until you turn this back on.');
    render();
  });

  const file = $<HTMLInputElement>('[data-import]');
  const fileErr = $('[data-import-err]');
  const fileError = (text: string | null) => {
    if (!file || !fileErr) return;
    fileErr.textContent = text ?? '';
    fileErr.hidden = !text;
    if (text) file.setAttribute('aria-invalid', 'true');
    else file.removeAttribute('aria-invalid');
  };
  file?.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    fileError(null);
    let text: string;
    try {
      text = await chosen.text();
    } catch {
      fileError('The file could not be read.');
      file.value = '';
      return;
    }
    const check = validateImport(text);
    if (!check.ok) {
      fileError(check.error);
      say(check.error);
      file.value = '';
      return;
    }
    const plan = planImport(siteItems() ?? {}, check.items);
    const fresh = plan.filter((w) => w.effect === 'new').length;
    const replace = plan.filter((w) => w.effect === 'replace').length;
    const same = plan.filter((w) => w.effect === 'same').length;
    const res = await ask({
      title: 'Import this copy?',
      body: `<p>The file ${check.exported ? `was exported on ${h(longDate(check.exported))} and ` : ''}holds ${plural(plan.length, 'item', 'items')}: ${n(fresh)} new to this browser, ${n(replace)} replacing an item kept here, and ${n(same)} the same already.</p><p>Saved items and visit history are combined with what is here, not replaced. Nothing the file does not name is changed.</p>${
        check.skipped.length ? `<p>${plural(check.skipped.length, 'item', 'items')} in the file will be left out, because this site does not use ${check.skipped.length === 1 ? 'it' : 'them'}.</p>` : ''
      }`,
      confirm: 'Import',
    });
    file.value = '';
    file.focus();
    if (!res.ok) {
      say('Nothing was imported.');
      return;
    }
    let done = 0;
    for (const w of plan) if (w.effect === 'same' || writeItem(w.key, w.value)) done += 1;
    const level = plan.find((w) => w.key === 'bb:level')?.value;
    if (level === 'SL' || level === 'HL') document.documentElement.setAttribute('data-level', level);
    render();
    say(done === plan.length ? `Imported ${plural(done, 'item', 'items')}.` : `Imported ${n(done)} of ${n(plan.length)} items: this browser's storage is full.`);
  });

  // Another tab saved, answered or cleared something.
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith('bb:')) render();
  });

  render();
});
