/**
 * One engine for the classification interactions: the cost classifier, the
 * error diagnosis, the Ansoff placer, the style matcher and the functions
 * sorter. Each item has one or more radio groups; checking an item compares
 * each choice with the right and the defensible answers, then reveals the
 * item's answer and explanation, which are already in the page (inside a
 * <details> that readers without JavaScript can open themselves).
 */
import { announce, each, readConfig, store } from './ix';

type Verdict = 'right' | 'partial' | 'wrong';

interface Group {
  name: string;
  legend: string;
  right: string[];
  partial: string[];
}

interface Item {
  id: string;
  groups: Group[];
}

interface Config {
  uid: string;
  kind: 'cost' | 'errors' | 'ansoff' | 'styles' | 'functions' | 'check';
  items: Item[];
  /** Labels for every option value, used in the board and the summary. */
  labels: Record<string, string>;
}

const VERDICTS: Record<Config['kind'], Record<Verdict, string>> = {
  cost: { right: 'Right', partial: 'One of two right', wrong: 'Not yet' },
  errors: { right: 'Right line', partial: 'Partly right', wrong: 'Not this line' },
  ansoff: { right: 'Right', partial: 'Arguable', wrong: 'Not this one' },
  styles: { right: 'Strong fit', partial: 'Defensible', wrong: 'Weak fit' },
  functions: { right: 'Right', partial: 'Partly right', wrong: 'Not this one' },
  check: { right: 'Right', partial: 'Partly right', wrong: 'Not this one' },
};

each('[data-ix="quiz"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const summary = root.querySelector<HTMLElement>('[data-summary]');
  const results = new Map<string, Verdict>();
  const saveKey = `quiz:${cfg.uid}`;

  const itemEl = (id: string) => root.querySelector<HTMLElement>(`[data-item="${id}"]`);
  const choice = (item: Item, g: Group): string | null => {
    const el = itemEl(item.id)?.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-${item.id}-${g.name}"]:checked`);
    return el ? el.value : null;
  };

  const save = () => {
    const picks: Record<string, string> = {};
    cfg.items.forEach((it) => it.groups.forEach((g) => {
      const v = choice(it, g);
      if (v) picks[`${it.id}:${g.name}`] = v;
    }));
    store.set(saveKey, picks);
  };

  const restore = () => {
    const picks = store.get<Record<string, string>>(saveKey, {});
    cfg.items.forEach((it) => it.groups.forEach((g) => {
      const v = picks[`${it.id}:${g.name}`];
      if (!v) return;
      const el = itemEl(it.id)?.querySelector<HTMLInputElement>(`input[name="${cfg.uid}-${it.id}-${g.name}"][value="${CSS.escape(v)}"]`);
      if (el) el.checked = true;
    }));
  };

  const clearMarks = (item: Item) => {
    const el = itemEl(item.id);
    if (!el) return;
    el.querySelectorAll('.opt').forEach((o) => o.classList.remove('is-right', 'is-wrong', 'is-partial', 'is-answer'));
    el.classList.remove('is-right', 'is-wrong', 'is-partial');
    const key = el.querySelector<HTMLDetailsElement>('[data-key]');
    if (key) {
      key.hidden = true;
      key.open = false;
      key.classList.remove('feedback--right', 'feedback--wrong', 'feedback--partial');
    }
    const msg = el.querySelector<HTMLElement>('[data-msg]');
    if (msg) msg.textContent = '';
    results.delete(item.id);
  };

  const check = (item: Item, quiet = false): Verdict | null => {
    const el = itemEl(item.id);
    if (!el) return null;
    const msg = el.querySelector<HTMLElement>('[data-msg]');
    const missing = item.groups.filter((g) => !choice(item, g));
    if (missing.length) {
      const text = `Choose ${missing.map((g) => g.legend.toLowerCase()).join(' and ')} first.`;
      if (msg) msg.textContent = text;
      if (!quiet) announce(status, text);
      return null;
    }
    if (msg) msg.textContent = '';
    const verdicts = item.groups.map((g) => {
      const v = choice(item, g) as string;
      const verdict: Verdict = g.right.includes(v) ? 'right' : g.partial.includes(v) ? 'partial' : 'wrong';
      el.querySelectorAll<HTMLElement>(`[data-group="${g.name}"] .opt`).forEach((o) => {
        const val = o.dataset.value ?? '';
        o.classList.remove('is-right', 'is-wrong', 'is-partial', 'is-answer');
        if (val === v) o.classList.add(verdict === 'right' ? 'is-right' : verdict === 'partial' ? 'is-partial' : 'is-wrong');
        if (g.right.includes(val) && val !== v) o.classList.add('is-answer');
      });
      return verdict;
    });
    const rightCount = verdicts.filter((v) => v === 'right').length;
    const overall: Verdict =
      rightCount === verdicts.length ? 'right' : verdicts.every((v) => v === 'wrong') ? 'wrong' : 'partial';
    el.classList.remove('is-right', 'is-wrong', 'is-partial');
    el.classList.add(`is-${overall}`);
    const key = el.querySelector<HTMLDetailsElement>('[data-key]');
    if (key) {
      key.hidden = false;
      key.open = true;
      key.classList.remove('feedback--right', 'feedback--wrong', 'feedback--partial');
      key.classList.add(`feedback--${overall}`);
      const verdictEl = key.querySelector<HTMLElement>('[data-verdict]');
      if (verdictEl) verdictEl.textContent = VERDICTS[cfg.kind][overall];
    }
    results.set(item.id, overall);
    if (!quiet) announce(status, `${VERDICTS[cfg.kind][overall]}. ${key?.querySelector('[data-answer]')?.textContent?.trim() ?? ''}`);
    return overall;
  };

  const board = () => {
    const cells = root.querySelectorAll<HTMLElement>('[data-cell]');
    if (!cells.length) return;
    cells.forEach((c) => c.querySelector('[data-chips]')?.replaceChildren());
    cfg.items.forEach((it, idx) => {
      const g = it.groups[0];
      if (!g) return;
      const v = choice(it, g);
      if (!v) return;
      const list = root.querySelector(`[data-cell="${v}"] [data-chips]`);
      if (!list) return;
      const li = document.createElement('li');
      li.className = 'chip';
      const verdict = results.get(it.id);
      if (verdict) li.classList.add(`chip--${verdict}`);
      const label = itemEl(it.id)?.querySelector('[data-short]')?.textContent ?? it.id;
      li.innerHTML = `<span class="chip__no">${idx + 1}</span><span class="chip__text"></span>`;
      (li.querySelector('.chip__text') as HTMLElement).textContent = label;
      if (verdict) li.title = VERDICTS[cfg.kind][verdict];
      list.append(li);
    });
    root.querySelectorAll<HTMLElement>('[data-cell]').forEach((c) => {
      const count = c.querySelectorAll('.chip').length;
      c.classList.toggle('is-empty', count === 0);
    });
  };

  const renderSummary = () => {
    if (!summary) return;
    const total = cfg.items.length;
    const done = results.size;
    const right = [...results.values()].filter((v) => v === 'right').length;
    const partial = [...results.values()].filter((v) => v === 'partial').length;
    const wrong = done - right - partial;
    if (!done) {
      summary.textContent = `${total} to do. Choose your answers, then check each one or check them all.`;
      return;
    }
    const pl = VERDICTS[cfg.kind];
    let text = `Checked ${done} of ${total}: ${right} ${pl.right.toLowerCase()}`;
    if (cfg.kind !== 'errors' && cfg.kind !== 'functions') text += `, ${partial} ${pl.partial.toLowerCase()}`;
    text += `, ${wrong} ${pl.wrong.toLowerCase()}.`;
    if (done === total && cfg.kind === 'styles') {
      const styles = new Set<string>();
      cfg.items.forEach((it) => {
        const g = it.groups[0];
        const v = g ? choice(it, g) : null;
        if (v) styles.add(v);
      });
      text += ` You chose ${styles.size} different ${styles.size === 1 ? 'style' : 'styles'} for ${total} situations. Choosing the style that fits the situation is what situational leadership means.`;
    }
    if (done === total && cfg.kind === 'cost') {
      const misses = cfg.items.filter((it) => results.get(it.id) !== 'right').length;
      text += misses === 0 ? ' Every cost classified correctly on both questions.' : ' Open the sorted list below to see every cost in its place.';
    }
    summary.textContent = text;
    root.querySelectorAll<HTMLElement>('[data-after-all]').forEach((el) => (el.hidden = done < total));
  };

  // Tell anything around the quiz (a case lab, for example) how far the learner has got.
  const progress = () =>
    root.dispatchEvent(
      new CustomEvent('quiz:progress', {
        bubbles: true,
        detail: { uid: cfg.uid, done: results.size, total: cfg.items.length, results: Object.fromEntries(results) },
      }),
    );

  restore();
  board();
  renderSummary();
  root.querySelectorAll<HTMLElement>('[data-after-all]').forEach((el) => (el.hidden = true));
  root.querySelectorAll<HTMLDetailsElement>('[data-key]').forEach((k) => (k.hidden = true));

  root.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== 'radio') return;
    const itemId = input.closest<HTMLElement>('[data-item]')?.dataset.item;
    const item = cfg.items.find((it) => it.id === itemId);
    if (item && results.has(item.id)) clearMarks(item);
    save();
    board();
    renderSummary();
    progress();
  });

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn || !root.contains(btn)) return;
    if (btn.dataset.check !== undefined) {
      const item = cfg.items.find((it) => it.id === btn.closest<HTMLElement>('[data-item]')?.dataset.item);
      if (item) check(item);
    } else if (btn.dataset.checkAll !== undefined) {
      let unanswered = 0;
      cfg.items.forEach((it) => {
        if (check(it, true) === null) unanswered++;
      });
      const right = [...results.values()].filter((v) => v === 'right').length;
      announce(
        status,
        `${right} of ${cfg.items.length} right.${unanswered ? ` ${unanswered} not answered yet.` : ''}`,
      );
    } else if (btn.dataset.reset !== undefined) {
      cfg.items.forEach((it) => {
        clearMarks(it);
        itemEl(it.id)?.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => (r.checked = false));
      });
      store.remove(saveKey);
      announce(status, 'Cleared. Start again.');
    } else return;
    board();
    renderSummary();
    progress();
  });
});
