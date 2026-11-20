/**
 * The flashcards page (/revision/flashcards/). Loads the deck the build wrote
 * (deck.json), filters it by unit, subtopic, kind and level, and runs a
 * session: the card's front, Space or Enter (or the button) to turn it, then
 * a rating from 1 Again to 4 Easy, which schedules the card in its Leitner box
 * and saves bb:cards at once. Every rule (filters, queues, scheduling, the
 * summary) is in src/lib/flashcards.ts; this module only draws and listens.
 * The keyboard shortcuts work while focus is inside the session, so a single
 * key never acts anywhere else on the page.
 */
import { announce, each, escapeHtml as h, readConfig } from './ix';
import { readItem, removeItem, storageWorks, writeItem } from './storage';
import {
  CARDS_KEY,
  KIND_SHORT,
  MODE_LABELS,
  NO_FILTERS,
  RATINGS,
  RATING_LABELS,
  answer,
  currentCard,
  defaultLevel,
  dueCount,
  dueWords,
  emptyCards,
  filtersFromQuery,
  localDay,
  matchesFilters,
  parseCards,
  plural,
  queryFromFilters,
  queueFor,
  rateCard,
  resetCards,
  schedule,
  startSession,
  summarize,
  summaryWords,
  tallyOf,
  unitOfCode,
  type CardKind,
  type CardsState,
  type Deck,
  type DeckCard,
  type Filters,
  type LevelFilter,
  type Mode,
  type Rating,
  type Session,
} from '../lib/flashcards';

interface Config {
  deck: string;
  /** Codes of the HL-only subtopics. */
  hlOnly: string[];
  newPerSession: number;
}

each('[data-ix="flashcards"]', (root) => {
  const cfg = readConfig<Config>(root);
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const live = $('[data-live]');
  const loading = $('[data-loading]');
  const errorBox = $('[data-error]');
  const setup = $('[data-setup]');
  const study = $('[data-study]');
  const summaryBox = $('[data-summary]');
  const resetBox = $<HTMLDetailsElement>('[data-reset-box]');
  const form = $<HTMLFormElement>('[data-filters]');
  const statusLine = $('[data-status]');
  const storeNote = $('[data-store-note]');
  const shuffleBox = $<HTMLInputElement>('[data-shuffle]');
  const cardEl = $('[data-card]');
  const front = $('[data-front]');
  const back = $('[data-back]');
  const progress = $('[data-progress]');
  const flipBtn = $<HTMLButtonElement>('[data-flip]');
  const rateGroup = $('[data-rate]');
  const field = <T extends HTMLElement>(name: string) => form?.elements.namedItem(name) as T | null;
  const unitSel = field<HTMLSelectElement>('unit');
  const codeSel = field<HTMLSelectElement>('code');
  const kindSel = field<HTMLSelectElement>('kind');
  const levelSel = field<HTMLSelectElement>('level');
  const enrichBox = field<HTMLInputElement>('enrichment');
  if (!form || !setup || !study || !cardEl || !front || !back || !flipBtn || !rateGroup || !summaryBox) throw new Error('flashcards: markup missing');

  const keeps = storageWorks();
  let deck: Deck | null = null;
  let byId = new Map<string, DeckCard>();
  let state: CardsState = parseCards(readItem(CARDS_KEY));
  let session: Session | null = null;
  let mode: Mode = 'due';
  let flipped = false;
  let missed: string[] = [];

  const today = () => localDay(new Date());
  /** Read before every write, so a rating made in another tab (or on a notes page) is kept. */
  const fresh = () => (keeps ? parseCards(readItem(CARDS_KEY)) : state);
  const save = () => {
    if (keeps) writeItem(CARDS_KEY, JSON.stringify(state));
  };

  /* ---------- Filters ---------- */

  const codes = new Set([...(codeSel?.options ?? [])].map((o) => o.value).filter(Boolean));
  const fromQuery = filtersFromQuery(location.search, { codes });
  let filters: Filters = {
    unit: fromQuery.unit,
    code: fromQuery.code,
    kind: fromQuery.kind,
    level: fromQuery.levelSet ? fromQuery.level : defaultLevel(readItem('bb:level'), cfg.hlOnly.includes(fromQuery.code)),
    enrichment: fromQuery.enrichment,
  };

  const syncForm = () => {
    if (unitSel) unitSel.value = filters.unit;
    if (codeSel) codeSel.value = filters.code;
    if (kindSel) kindSel.value = filters.kind;
    if (levelSel) levelSel.value = filters.level;
    if (enrichBox) enrichBox.checked = filters.enrichment;
  };

  const readForm = (changed?: string) => {
    let unit = unitSel?.value ?? '';
    let code = codeSel?.value ?? '';
    // A subtopic belongs to one unit; choosing another unit clears a subtopic outside it.
    if (changed === 'code' && code) unit = unitOfCode(code);
    if (changed === 'unit' && code && unitOfCode(code) !== unit) code = '';
    filters = { unit, code, kind: (kindSel?.value ?? '') as '' | CardKind, level: (levelSel?.value ?? 'all') as LevelFilter, enrichment: Boolean(enrichBox?.checked) };
    syncForm();
    history.replaceState(history.state, '', `${location.pathname}${queryFromFilters(filters)}${location.hash}`);
  };

  const selection = (): DeckCard[] => (deck ? deck.cards.filter((c) => matchesFilters(c, filters)) : []);

  /* ---------- The status of the selection ---------- */

  const startBtn = (m: Mode) => root.querySelector<HTMLButtonElement>(`[data-mode="${m}"]`);

  function statusWords(): string {
    if (!deck) return 'Loading the cards…';
    const t = tallyOf(selection(), state, today());
    if (!t.total) return 'No cards match these choices. Clear one of them to see more.';
    const all = dueCount(state, today(), new Set(byId.keys()));
    const head = `${plural(t.total, 'card', 'cards')} in this selection: ${t.due} due today, ${t.fresh} new and ${t.later} not due yet.`;
    return all > t.due ? `${head} Across all your cards, ${all} are due today.` : head;
  }

  function renderStatus(): void {
    if (statusLine) statusLine.textContent = statusWords();
    const t = tallyOf(selection(), state, today());
    root.querySelectorAll<HTMLElement>('[data-box]').forEach((el) => (el.textContent = String(t.boxes[Number(el.dataset.box) - 1] ?? 0)));
    const counts: Record<Mode, number> = { due: t.due, new: Math.min(t.fresh, cfg.newPerSession), all: t.total };
    const words: Record<Mode, string> = {
      due: `Review the cards due today (${t.due})`,
      new: `Learn new cards (${counts.new})`,
      all: `Study every card here (${t.total})`,
    };
    // The first thing there is to do leads: the cards due, else new cards, else every card.
    const lead = (['due', 'new', 'all'] as Mode[]).find((m) => counts[m] > 0) ?? 'due';
    (['due', 'new', 'all'] as Mode[]).forEach((m) => {
      const b = startBtn(m);
      if (!b) return;
      b.textContent = words[m];
      b.disabled = !deck || counts[m] === 0;
      b.classList.toggle('btn--primary', m === lead);
    });
    if (resetBox) resetBox.hidden = !deck || !Object.keys(state.cards).length;
  }

  /* ---------- A session ---------- */

  const tags = (card: DeckCard): string =>
    [
      `<span class="fc-kind">${h(KIND_SHORT[card.kind])}</span>`,
      `<span class="fc-codes">${card.codes.map((c) => h(c === 'toolkit' ? 'Toolkit' : c)).join(' · ')}</span>`,
      card.level === 'HL' ? '<span class="tag tag--hl">HL</span>' : '',
      card.fictional ? '<span class="tag tag--simulated">Fictional</span>' : '',
      card.enrichment ? '<span class="tag tag--enrichment">Enrichment</span>' : '',
    ].join(' ');

  function setFaces(): void {
    cardEl!.classList.toggle('is-flipped', flipped);
    front!.setAttribute('aria-hidden', String(flipped));
    back!.setAttribute('aria-hidden', String(!flipped));
    front!.inert = flipped;
    back!.inert = !flipped;
    if (flipped) back!.hidden = false;
    rateGroup!.hidden = !flipped;
    flipBtn!.textContent = flipped ? 'Turn it back' : 'Turn the card';
  }

  function showCard(): string {
    const id = session ? currentCard(session) : undefined;
    const card = id ? byId.get(id) : undefined;
    if (!session || !card) return '';
    flipped = false;
    // Put the new card face up without playing the turn backwards.
    cardEl!.classList.add('is-instant');
    back!.hidden = true;
    front!.innerHTML = `<p class="fc-tags">${tags(card)}</p><div class="fc-front">${card.front}</div><p class="fc-prompt">${h(card.prompt)}</p>`;
    back!.innerHTML = `<p class="fc-tags">${tags(card)} <span class="fc-side">Answer</span></p><div class="fc-recap">${card.front}</div><div class="fc-answer">${card.back}</div>${
      card.href ? `<p class="fc-more"><a href="${h(card.href)}">${h(card.source ? `Read more: ${card.source}` : 'Read more')}</a></p>` : ''
    }`;
    setFaces();
    void cardEl!.offsetWidth;
    cardEl!.classList.remove('is-instant');
    const n = session.log.length + 1;
    const total = session.log.length + session.queue.length;
    if (progress) progress.textContent = `Card ${n} of ${total} · ${MODE_LABELS[mode]}`;
    cardEl!.setAttribute('aria-label', `${KIND_SHORT[card.kind]} card, ${n} of ${total}`);
    const when = today();
    RATINGS.forEach((r) => {
      const el = rateGroup!.querySelector<HTMLElement>(`[data-when="${r}"]`);
      if (el) el.textContent = r === 'again' ? 'this session' : dueWords(schedule(state.cards[card.id]?.box, r, when).due, when);
    });
    return `Card ${n} of ${total}. ${card.prompt}`;
  }

  function begin(m: Mode, ids?: string[]): void {
    if (!deck) return;
    const queue = ids ?? queueFor(m, selection(), state, today(), { shuffle: Boolean(shuffleBox?.checked), newLimit: cfg.newPerSession });
    if (!queue.length) {
      announce(live, 'There are no cards for that in this selection.');
      return;
    }
    mode = m;
    session = startSession(queue);
    setup!.hidden = true;
    summaryBox!.hidden = true;
    if (resetBox) resetBox.hidden = true;
    study!.hidden = false;
    const said = showCard();
    cardEl!.focus();
    announce(live, `${MODE_LABELS[m]}: ${plural(queue.length, 'card', 'cards')}. ${said}`);
  }

  function flip(): void {
    if (!session || !currentCard(session)) return;
    flipped = !flipped;
    setFaces();
    const text = (flipped ? back!.querySelector('.fc-answer')?.textContent : front!.querySelector('.fc-front')?.textContent) ?? '';
    announce(live, flipped ? `Answer: ${text.replace(/\s+/g, ' ').trim()} Rate it from 1, Again, to 4, Easy.` : 'The question side.');
  }

  function rate(r: Rating): void {
    if (!session || !flipped) return;
    const id = currentCard(session);
    const card = id ? byId.get(id) : undefined;
    if (!id || !card) return;
    state = rateCard(fresh(), { id, codes: card.codes, title: card.title }, r, new Date());
    save();
    session = answer(session, r);
    const rec = state.cards[id];
    const said = r === 'again' ? `${RATING_LABELS[r]}. It comes round again in this session.` : `${RATING_LABELS[r]}. Due again ${dueWords(rec?.due ?? today(), today())}.`;
    if (!currentCard(session)) {
      finish(said);
      return;
    }
    const next = showCard();
    cardEl!.focus();
    announce(live, `${said} ${next}`);
  }

  function finish(lead = ''): void {
    if (!session) return;
    const s = session;
    session = null;
    study!.hidden = true;
    if (!s.log.length) {
      showSetup();
      announce(live, 'Session ended. No cards were rated.');
      return;
    }
    const sum = summarize(s, state, today());
    const text = summaryWords(sum, today());
    const sumText = summaryBox!.querySelector<HTMLElement>('[data-summary-text]');
    if (sumText) sumText.textContent = text;
    const tally = summaryBox!.querySelector<HTMLElement>('[data-summary-tally]');
    if (tally) tally.innerHTML = RATINGS.map((r) => `<div><dt>${h(RATING_LABELS[r])}</dt><dd>${sum.tally[r]}</dd></div>`).join('');
    const boxes = summaryBox!.querySelector<HTMLElement>('[data-summary-boxes]');
    if (boxes) boxes.innerHTML = sum.boxes.map((n, i) => `<div><dt>Box ${i + 1}</dt><dd>${n}</dd></div>`).join('');
    missed = [...new Set(s.log.map((e) => e.id))].filter((id) => (state.cards[id]?.due ?? '') <= today());
    const again = summaryBox!.querySelector<HTMLButtonElement>('[data-again-missed]');
    if (again) {
      again.hidden = missed.length === 0;
      again.textContent = `Review the ${plural(missed.length, 'card', 'cards')} you missed`;
    }
    summaryBox!.hidden = false;
    summaryBox!.querySelector<HTMLElement>('h2')?.focus();
    announce(live, `${lead ? `${lead} ` : ''}Session finished. ${text}`);
  }

  function showSetup(): void {
    summaryBox!.hidden = true;
    study!.hidden = true;
    setup!.hidden = false;
    renderStatus();
  }

  /* ---------- Listening ---------- */

  form.addEventListener('change', (e) => {
    const name = (e.target as HTMLInputElement | null)?.name ?? '';
    readForm(name);
    renderStatus();
    announce(live, statusWords());
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    filters = { ...NO_FILTERS };
    syncForm();
    history.replaceState(history.state, '', `${location.pathname}${location.hash}`);
    renderStatus();
    announce(live, `Choices cleared. ${statusWords()}`);
  });
  (['due', 'new', 'all'] as Mode[]).forEach((m) => startBtn(m)?.addEventListener('click', () => begin(m)));
  flipBtn.addEventListener('click', () => flip());
  rateGroup.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-rating]');
    if (b?.dataset.rating) rate(b.dataset.rating as Rating);
  });
  root.querySelector('[data-end]')?.addEventListener('click', () => finish('Session ended early.'));
  summaryBox.querySelector('[data-back]')?.addEventListener('click', () => {
    showSetup();
    startBtn('due')?.focus();
  });
  summaryBox.querySelector('[data-again-missed]')?.addEventListener('click', () => begin('due', missed));

  // Keys act only while focus is inside the session: Space or Enter turns the card, 1 to 4 rate it.
  study.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      // A focused button or link does its own job with these keys.
      if (target.closest('button, a')) return;
      e.preventDefault();
      flip();
      return;
    }
    const n = ['1', '2', '3', '4'].indexOf(e.key);
    if (n < 0) return;
    e.preventDefault();
    if (flipped) rate(RATINGS[n] as Rating);
    else announce(live, 'Turn the card first, with Space or Enter.');
  });

  root.querySelectorAll<HTMLButtonElement>('[data-reset]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const all = btn.dataset.reset === 'all';
      const current = fresh();
      const ids = all ? Object.keys(current.cards) : selection().map((c) => c.id).filter((id) => current.cards[id]);
      if (!ids.length) {
        announce(live, 'None of these cards has been rated, so there is nothing to reset.');
        return;
      }
      const ask = all ? `Reset all your flashcard progress (${plural(ids.length, 'card', 'cards')})? This cannot be undone.` : `Reset your progress on ${plural(ids.length, 'card', 'cards')} in this selection? This cannot be undone.`;
      if (!window.confirm(ask)) return;
      state = all ? emptyCards() : resetCards(current, ids);
      if (all) removeItem(CARDS_KEY);
      else save();
      renderStatus();
      if (resetBox) resetBox.open = false;
      startBtn('due')?.focus();
      announce(live, `${plural(ids.length, 'card', 'cards')} reset. ${statusWords()}`);
    }),
  );

  // Ratings made in another tab, or on a notes page, show here when nothing is running.
  window.addEventListener('storage', (e) => {
    if (e.key !== CARDS_KEY && e.key !== null) return;
    state = parseCards(readItem(CARDS_KEY));
    if (!session) renderStatus();
  });

  /* ---------- Start ---------- */

  syncForm();
  if (storeNote && !keeps) {
    storeNote.hidden = false;
    storeNote.textContent = 'This browser is not letting the site keep anything, so your ratings last only until you leave this page.';
  }
  setup.hidden = false;
  renderStatus();

  fetch(cfg.deck)
    .then((r) => {
      if (!r.ok) throw new Error(`The deck could not be loaded (${r.status}).`);
      return r.json() as Promise<Deck>;
    })
    .then((d) => {
      if (!d || !Array.isArray(d.cards)) throw new Error('The deck is not in the expected form.');
      deck = d;
      byId = new Map(d.cards.map((c) => [c.id, c]));
      if (loading) loading.hidden = true;
      renderStatus();
      announce(live, statusWords());
    })
    .catch(() => {
      root.classList.add('is-broken');
      setup.hidden = true;
      if (loading) loading.hidden = true;
      if (errorBox) errorBox.hidden = false;
    });
});
