/**
 * My dashboard (/dashboard/) and Your progress (/progress/), one script for
 * both: data-view on the root says which. It reads every item this site
 * keeps in this browser, turns them into a view with workspaceView()
 * (src/lib/workspace.ts, which builds on dashboardView() in
 * src/lib/dashboard.ts) and renders each section the page has. The top of
 * the dashboard (the revision queue, progress by unit, weak areas, practice
 * and where the reader left off) is src/scripts/workspace/overview.ts; the
 * learning list, the notebook, the saved analyses and the export of selected
 * work are parts of their own in src/scripts/workspace/. It writes only when
 * the reader asks: changing the list, writing or deleting a note, removing a
 * saved result, pausing the record, importing a copy or clearing what is
 * kept; deleting a note, importing and clearing are confirmed first. It
 * re-renders when another tab changes what is kept, and when the reader
 * switches between SL and HL.
 */
import { each, escapeHtml as h, readConfig } from './ix';
import { courseChartSvg, shortDate, tallyWords, type Row } from '../lib/dashboard';
import { LEARNER_KEY, SAVED_KEY, STUDIED_KEY, VISIT_KINDS, VISIT_KIND_LABELS, buildExport, emptyLog, parseLog, parseStudied, type Visit } from '../lib/learner';
import { LIST_KEY, NOTES_KEY, SNAPSHOTS_KEY, planWorkspaceImport, type WorkspaceConfig, type WorkspaceView } from '../lib/workspace';
import { checkDashboardImport as checkImport, dashboardWorkspaceView as workspaceView } from '../lib/workspace-progress';
import { readItem, removeItem, siteItems, storageWorks, writeItem } from './storage';
import { n, plural, type AskOptions, type Ctx } from './workspace/context';
import { bindList, renderList } from './workspace/list';
import { bindNotes, type NotesPart } from './workspace/notes';
import { bindAnalyses, renderAnalyses } from './workspace/analyses';
import { bindExport, type ExportPart } from './workspace/export';
import { renderOverview, rowExtras } from './workspace/overview';
import { parseCards, pct, readBank, scoreOf } from '../lib/progress';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

each('[data-ix="progress"]', (root) => {
  const cfg = readConfig<WorkspaceConfig>(root);
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

  /* ---------- Confirmations ---------- */

  const dialog = $<HTMLDialogElement>('[data-dialog]');
  const ask = (opts: AskOptions): Promise<{ ok: boolean; scope: string }> => {
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

  /* ---------- The parts ---------- */

  let view: WorkspaceView = workspaceView(siteItems() ?? {}, cfg);
  const ctx: Ctx = { root, cfg, view: () => view, say, ask, refresh: () => render() };
  // The dashboard holds the workspace; the progress page holds the record behind it.
  const isDashboard = root.dataset.view !== 'progress';
  const idle = { flush: () => undefined, render: () => undefined };
  const list: { flush: () => void } = isDashboard ? bindList(ctx) : idle;
  const notes: NotesPart = isDashboard ? bindNotes(ctx) : idle;
  if (isDashboard) bindAnalyses(ctx);
  const exporter: ExportPart = isDashboard ? bindExport(ctx) : idle;

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

  function render(): void {
    // A note typed on the learning list is kept before anything is redrawn.
    list.flush();
    const items = siteItems() ?? {};
    view = workspaceView(items, cfg);
    const f = view.figures;
    const now = new Date();
    // Focus stays on the same control when a part is drawn again (another tab changed what is kept).
    const active = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement.dataset.focus : undefined;

    // The top of the dashboard, which also says whether its practice records hold anything.
    const overview = isDashboard ? renderOverview(ctx, items, view, now) : { any: false };
    const any = view.any || overview.any || Object.keys(parseStudied(items[STUDIED_KEY]).done).length > 0 || Object.keys(readBank(items['bb:bank']).items).length > 0 || parseCards(items['bb:cards']).cards.length > 0;
    const empty = $('[data-empty]');
    if (empty) empty.hidden = any;
    // A first visit sees what the page will show and how to start, not empty sections.
    root.querySelectorAll<HTMLElement>('[data-needs-data]').forEach((el) => (el.hidden = !any));

    // Status line
    const status = $('[data-statusline]');
    if (status) {
      const kept = Object.keys(items).length;
      const times = [
        ...view.log.visits.map((v) => v.last),
        ...view.saved.items.map((s) => s.saved),
        ...view.notebook.notes.map((x) => x.updated),
        ...view.snapshots.items.map((s) => s.saved),
      ].sort();
      const last = times[times.length - 1];
      status.innerHTML = [
        `<span class="db-dot${view.log.paused ? ' db-dot--off' : ''}" aria-hidden="true"></span>${view.log.paused ? 'Not noting the pages you open: paused' : 'Noting the pages you open'}`,
        `${plural(kept, 'item', 'items')} kept in this browser`,
        last ? `last activity ${h(shortDate(last, now))}` : '',
        `<a href="#data">What is kept, and how to clear it</a>`,
      ]
        .filter(Boolean)
        .map((part) => `<span class="db-statusline__part">${part}</span>`)
        .join('<span class="db-sep" aria-hidden="true"> · </span>');
    }

    // At a glance
    const lead = $('[data-lead]');
    if (lead)
      lead.innerHTML = `<p class="db-lead__fig"><span class="db-lead__n">${n(f.explored)}</span><span class="db-lead__of"> of ${n(f.subtopics)}</span></p>
        <p class="db-lead__label">subtopics explored</p>
        <p class="db-lead__note">${
          f.explored
            ? `${n(f.practised)} of them practised. ${
                f.explored >= f.subtopics
                  ? 'You have explored every subtopic of the course.'
                  : f.complete === f.subtopics
                    ? `Every subtopic is complete on the platform, so ${n(f.subtopics - f.explored)} more ${f.subtopics - f.explored === 1 ? 'is' : 'are'} ready for you.`
                    : `Of the ${n(f.complete)} subtopics complete on the platform, you have explored ${n(f.completeExplored)}.`
              }`
            : `None yet. Open a subtopic's page or its mindmap and it counts as explored; rate its cards or answer a question on it and it counts as practised.`
        }</p>`;
    const sum = $('[data-summary]');
    if (sum) {
      const c = view.listCounts;
      const caseNotes = view.notebook.notes.filter((x) => x.kind === 'case').length;
      const figs: Array<[string, string, string]> = [
        ['Mindmaps viewed', n(f.mindmaps), `of ${n(cfg.totals.mindmaps)}`],
        ['Cases opened', n(f.cases), `of ${n(cfg.totals.cases)} case files`],
        ['Practice questions answered', n(f.answered), `${n(f.marked)} self-marked, of ${n(f.questions)}`],
        ['Exercise items checked', n(f.checked.checked), f.checked.checked ? tallyWords(f.checked) : 'None checked yet'],
        ['Retrieval cards rated', n(f.cards.rated), f.cards.rated ? `${n(f.cards.got)} got it, ${n(f.cards.partly)} partly, ${n(f.cards.notYet)} not yet` : ''],
        ['Case lab stages done', `${n(f.labStages)} of ${n(f.labStagesAll)}`, ''],
        ['Decision Rooms finished', `${n(f.roomsDone)} of ${n(f.rooms)}`, ''],
        ['Case decisions made', `${n(f.caseDecisions)} of ${n(f.caseDecisionsAll)}`, 'in the case files'],
        ['Boardroom simulations finished', `${n(f.simulationsDone)} of ${n(f.simulations)}`, ''],
        ['Strategy Studio analyses', `${n(f.analyses)} of ${n(f.analysesAll)}`, ''],
        ['Saved analyses', n(view.analyses.length), view.snapshots.items.length ? `${plural(view.snapshots.items.length, 'result', 'results')} from the Financial Laboratory` : 'kept by the tools in the rooms'],
        ['Saved items', n(f.saved), f.saved ? `${n(c.todo)} to do, ${n(c.doing)} in progress, ${n(c.done)} done` : ''],
        ['Notes', n(view.notebook.notes.length), view.notebook.notes.length ? `${n(caseNotes)} of them case notes` : ''],
      ];
      sum.innerHTML = figs.map(([k, v, note]) => `<div class="fig"><dt>${h(k)}</dt><dd><span class="fig__v">${h(v)}</span>${note ? `<span class="fig__n">${h(note)}</span>` : ''}</dd></div>`).join('');
    }

    // My learning list, the notebook, saved analyses and the export
    renderList(ctx, view, now);
    notes.render(view, now);
    renderAnalyses(ctx, view, now);
    exporter.render(view);

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
    // On the progress page, each row also says whether the subtopic is marked complete, and how its results average.
    const extras = isDashboard ? null : rowExtras(items, cfg, view);
    for (const r of view.course.rows) {
      const li = root.querySelector<HTMLElement>(`.db-row[data-code="${CSS.escape(r.code)}"]`);
      if (!li) continue;
      li.classList.toggle('is-practised', r.status === 'practised');
      li.classList.toggle('is-explored', r.status === 'explored');
      const mark = li.querySelector<HTMLElement>('[data-mark]');
      if (mark) mark.className = `db-mark js-only${r.status === 'none' ? '' : ` db-mark--${r.status}`}`;
      const you = li.querySelector<HTMLElement>('[data-you]');
      const x = extras?.get(r.code);
      const words = [x?.completedAt ? `Completed ${shortDate(x.completedAt, now)}` : '', r.words === 'Not started' && x?.completed ? '' : r.words, x?.results?.n ? `results average ${pct(scoreOf(x.results))} of ${x.results.n}` : '']
        .filter(Boolean)
        .join(' · ');
      li.classList.toggle('is-completed', Boolean(x?.completed));
      if (you) you.textContent = words;
    }

    // Where you have been
    const visits = $('[data-visits]');
    if (visits)
      visits.innerHTML = VISIT_KINDS.map((k) => {
        const rows = view.visits[k];
        const start = cfg.starts[k];
        const head = `<h3 class="db-col__h">${h(VISIT_KIND_LABELS[k])} <span class="db-count">${n(rows.length)}</span></h3>`;
        if (!rows.length) return `<div class="db-col">${head}<p class="db-none">None yet. Start with <a href="${h(start.href)}">${h(start.title)}</a>.</p></div>`;
        const first = rows.slice(0, 6).map((v) => visitItem(v, now)).join('');
        const rest = rows.slice(6);
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

    // Your data
    const record = $<HTMLInputElement>('[data-record]');
    if (record) record.checked = !view.log.paused;

    if (active && !(document.activeElement instanceof HTMLElement && root.contains(document.activeElement))) root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(active)}"]`)?.focus();
  }

  /* ---------- Your data: export, clear, pause, import ---------- */

  root.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;

    const exportBtn = t.closest<HTMLButtonElement>('[data-export]');
    if (exportBtn) {
      list.flush();
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
      list.flush();
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
        removeItem(LIST_KEY);
        say('Your learning list is cleared.');
      } else if (res.scope === 'notes') {
        removeItem(NOTES_KEY);
        say('Your notes are cleared.');
      } else if (res.scope === 'snapshots') {
        removeItem(SNAPSHOTS_KEY);
        say('The results saved from the Financial Laboratory are cleared.');
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
    list.flush();
    fileError(null);
    let text: string;
    try {
      text = await chosen.text();
    } catch {
      fileError('The file could not be read.');
      file.value = '';
      return;
    }
    const check = checkImport(text);
    if (!check.ok) {
      fileError(check.error);
      say(check.error);
      file.value = '';
      return;
    }
    const plan = planWorkspaceImport(siteItems() ?? {}, check.items);
    const fresh = plan.filter((w) => w.effect === 'new').length;
    const replace = plan.filter((w) => w.effect === 'replace').length;
    const same = plan.filter((w) => w.effect === 'same').length;
    const res = await ask({
      title: 'Import this copy?',
      body: `<p>The file ${check.exported ? `was exported on ${h(longDate(check.exported))} and ` : ''}holds ${plural(plan.length, 'item', 'items')}: ${n(fresh)} new to this browser, ${n(replace)} replacing or adding to an item kept here, and ${n(same)} the same already.</p><p>Your learning list, notes, saved results and visit history are combined with what is here, not replaced. Nothing the file does not name is changed.</p>${
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
  // The SL and HL switch changes which subtopics count.
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-level'] });

  render();
});
