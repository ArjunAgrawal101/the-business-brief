import { boardRowsHtml } from '../lib/decision-room';
import type { Decision } from '../lib/schemas';
import { announce, each, escapeHtml, readConfig, store } from './ix';

interface Config {
  id: string;
  decision: Decision;
}

interface State {
  picks: Record<string, string>;
  notes: Record<string, string>;
}

each('[data-ix="decision-room"]', (root) => {
  const cfg = readConfig<Config>(root);
  const d = cfg.decision;
  const key = `dr:${cfg.id}`;
  const status = root.querySelector<HTMLElement>('[data-status]');
  const saved = store.get<State>(key, { picks: {}, notes: {} });
  const state: State = { picks: { ...saved.picks }, notes: { ...saved.notes } };
  const first = d.rounds[0];

  const save = () => store.set(key, state);
  const section = (roundId: string) => root.querySelector<HTMLElement>(`[data-round="${roundId}"]`);

  // Outcomes live inside each choice's "See what happens" until chosen; this puts them back.
  const sendHome = (outcome: HTMLElement) => {
    const home = root.querySelector<HTMLElement>(`[data-home="${outcome.dataset.outcome}"]`);
    if (home && outcome.parentElement !== home) home.append(outcome);
  };

  const apply = () => {
    let unlocked = true;
    d.rounds.forEach((round, ri) => {
      const sec = section(round.id);
      if (!sec) return;
      const body = sec.querySelector<HTMLElement>('[data-body]');
      const locked = sec.querySelector<HTMLElement>('[data-locked]');
      const result = sec.querySelector<HTMLElement>(`[data-result="${round.id}"]`);
      const commit = sec.querySelector<HTMLButtonElement>(`[data-commit="${round.id}"]`);
      const change = sec.querySelector<HTMLButtonElement>(`[data-change="${round.id}"]`);
      const why = sec.querySelector<HTMLTextAreaElement>(`[data-why="${round.id}"]`);
      const picked = state.picks[round.id];

      // A pick that no longer fits (the first choice changed) is dropped.
      if (picked && ri > 0) {
        const ch = round.choices.find((c) => c.id === picked);
        if (!ch || (ch.followsFrom && ch.followsFrom !== state.picks[first?.id ?? ''])) delete state.picks[round.id];
      }
      const pick = state.picks[round.id];

      if (body) body.hidden = !unlocked;
      if (locked) locked.hidden = unlocked;
      sec.classList.toggle('is-locked', !unlocked);

      sec.querySelectorAll<HTMLElement>('[data-choice]').forEach((el) => {
        const follows = el.dataset.follows;
        const fits = ri === 0 || !follows || follows === state.picks[first?.id ?? ''];
        el.hidden = !fits;
        el.classList.toggle('is-picked', el.dataset.choice === pick);
        const radio = el.querySelector<HTMLInputElement>('input[type="radio"]');
        if (radio) {
          radio.checked = radio.value === pick || (!pick && radio.checked && fits);
          if (!fits) radio.checked = false;
          radio.disabled = Boolean(pick);
        }
      });

      sec.querySelectorAll<HTMLElement>('[data-outcome]').forEach((o) => {
        if (o.dataset.outcome === pick && result) {
          if (o.parentElement !== result) result.append(o);
        } else sendHome(o);
      });
      if (commit) commit.hidden = Boolean(pick);
      if (change) change.hidden = !pick;
      if (why) {
        why.value = state.notes[round.id] ?? why.value;
        why.readOnly = Boolean(pick);
      }
      if (!pick) unlocked = false;
    });

    const tbody = root.querySelector<HTMLElement>('[data-board]');
    if (tbody) tbody.innerHTML = boardRowsHtml(d, state.picks, escapeHtml);

    const done = d.rounds.filter((r) => state.picks[r.id]).length;
    const steps = root.querySelectorAll<HTMLElement>('[data-step]');
    const multi = d.rounds.length > 1;
    const currentStep = done === 0 ? 1 : multi ? (done === 1 ? 3 : 5) : 3;
    steps.forEach((li, k) => {
      li.classList.toggle('is-done', k < currentStep);
      if (k === currentStep) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });

    const all = done === d.rounds.length;
    const dbBody = root.querySelector<HTMLElement>('[data-debrief-body]');
    const dbLocked = root.querySelector<HTMLElement>('[data-debrief-locked]');
    if (dbBody) dbBody.hidden = !all;
    if (dbLocked) dbLocked.hidden = all;
    const yours = root.querySelector<HTMLElement>('[data-yours]');
    if (yours) {
      yours.replaceChildren();
      if (all) {
        const h = document.createElement('h3');
        h.className = 'label label--ink';
        h.textContent = 'Your decisions';
        const ol = document.createElement('ol');
        d.rounds.forEach((round) => {
          const ch = round.choices.find((c) => c.id === state.picks[round.id]);
          const li = document.createElement('li');
          const strong = document.createElement('strong');
          strong.textContent = `${round.title}: ${ch?.label ?? ''}.`;
          li.append(strong);
          const note = state.notes[round.id]?.trim();
          const p = document.createElement('p');
          p.className = note ? 'dr-yours__note' : 'muted small';
          p.textContent = note ? `Your reasoning: ${note}` : 'You did not write down your reasoning. Could you defend this choice to the board in two sentences?';
          li.append(p);
          ol.append(li);
        });
        const prompt = document.createElement('p');
        prompt.className = 'small';
        prompt.textContent = 'Compare your reasoning with the trade-offs below. Which aim did you put first, and what did it cost?';
        yours.append(h, ol, prompt);
      }
    }
    save();
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn || !root.contains(btn)) return;
    const commitId = btn.dataset.commit;
    const changeId = btn.dataset.change;
    if (commitId) {
      const sec = section(commitId);
      const radio = sec?.querySelector<HTMLInputElement>(`input[name="dr-${cfg.id}-${commitId}"]:checked`);
      const msg = sec?.querySelector<HTMLElement>(`[data-round-msg="${commitId}"]`);
      if (!radio) {
        if (msg) msg.textContent = 'Choose one option first.';
        announce(status, 'Choose one option first.');
        return;
      }
      if (msg) msg.textContent = '';
      state.picks[commitId] = radio.value;
      apply();
      const headline = sec?.querySelector<HTMLElement>(`[data-result="${commitId}"] .dr-outcome__headline`);
      headline?.focus();
      announce(status, `Decision committed. ${headline?.textContent?.trim() ?? ''}`);
    } else if (changeId) {
      const idx = d.rounds.findIndex((r) => r.id === changeId);
      d.rounds.slice(idx).forEach((r) => delete state.picks[r.id]);
      apply();
      section(changeId)?.querySelector<HTMLInputElement>('input[type="radio"]:not([disabled])')?.focus();
      announce(status, 'Decision reopened. Later decisions have been cleared.');
    } else if (btn.dataset.restart !== undefined) {
      state.picks = {};
      state.notes = {};
      root.querySelectorAll<HTMLTextAreaElement>('[data-why]').forEach((t) => (t.value = ''));
      root.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => (r.checked = false));
      apply();
      root.querySelector<HTMLElement>('[data-round] input[type="radio"]')?.focus();
      announce(status, 'Started again. Your earlier choices have been cleared.');
    }
  });

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLTextAreaElement;
    const roundId = t.dataset.why;
    if (roundId) {
      state.notes[roundId] = t.value;
      save();
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.type !== 'radio') return;
    t.closest('[data-round]')?.querySelectorAll<HTMLElement>('[data-choice]').forEach((el) => el.classList.toggle('is-selected', el.dataset.choice === t.value));
  });

  apply();
});
