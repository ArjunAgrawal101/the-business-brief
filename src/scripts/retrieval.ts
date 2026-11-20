import { announce, each, readConfig, store } from './ix';
import { readItem, writeItem } from './storage';
import { CARDS_KEY, parseCards, rateCard, resetCards, type CardRecord, type CardsState, type Rating } from '../lib/flashcards';

interface Config {
  id: string;
  count: number;
  /** The subtopic, when the questions are also cards in the flashcard deck. */
  code?: string;
  /** The deck's card for each question, in order. */
  cards?: Array<{ id: string; title: string }>;
}

/** How a rating here schedules the card in the flashcards: Not yet, Partly and Got it. */
const AS_FLASHCARD: Rating[] = ['again', 'hard', 'good'];

each('[data-ix="retrieval"]', (root) => {
  const cfg = readConfig<Config>(root);
  const key = `rc:${cfg.id}`;
  const ratings = store.get<Record<string, number>>(key, {});
  const list = root.querySelector<HTMLElement>('[data-list]');
  const summary = root.querySelector<HTMLElement>('[data-summary]');
  const WORDS = ['Not yet', 'Partly', 'Got it'];
  // Each card's flashcard record before its first rating on this page, so changing your mind replaces the rating rather than adding one.
  const before = new Map<string, CardRecord | undefined>();

  const schedule = (k: number, r: number) => {
    const card = cfg.cards?.[k];
    const rating = AS_FLASHCARD[r];
    if (!card || !cfg.code || !rating) return;
    const now = parseCards(readItem(CARDS_KEY));
    if (!before.has(card.id)) before.set(card.id, now.cards[card.id]);
    const prior = before.get(card.id);
    const base: CardsState = { v: 1, cards: { ...now.cards } };
    if (prior) base.cards[card.id] = prior;
    else delete base.cards[card.id];
    writeItem(CARDS_KEY, JSON.stringify(rateCard(base, { id: card.id, codes: [cfg.code], title: card.title }, rating, new Date())));
  };

  const paint = () => {
    root.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      const r = ratings[card.dataset.card ?? ''];
      card.dataset.rating = r === undefined ? '' : String(r);
      card.querySelectorAll<HTMLButtonElement>('[data-rate]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === r)));
    });
    const vals = Object.values(ratings);
    if (summary) {
      summary.textContent = vals.length
        ? `Rated ${vals.length} of ${cfg.count}: ${vals.filter((v) => v === 2).length} got it, ${vals.filter((v) => v === 1).length} partly, ${vals.filter((v) => v === 0).length} not yet.`
        : 'Reveal and rate each card.';
    }
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.dataset.rate !== undefined) {
      const card = btn.closest<HTMLElement>('[data-card]');
      if (!card?.dataset.card) return;
      ratings[card.dataset.card] = Number(btn.dataset.rate);
      store.set(key, ratings);
      schedule(Number(card.dataset.card), Number(btn.dataset.rate));
      paint();
      announce(summary, `${WORDS[Number(btn.dataset.rate)]}. ${summary?.textContent ?? ''}`);
    } else if (btn.dataset.hardFirst !== undefined && list) {
      const cards = [...list.querySelectorAll<HTMLElement>('[data-card]')];
      cards
        .sort((a, b) => (ratings[a.dataset.card ?? ''] ?? -1) - (ratings[b.dataset.card ?? ''] ?? -1) || Number(a.dataset.card) - Number(b.dataset.card))
        .forEach((c) => list.append(c));
      cards.forEach((c) => c.querySelector('details')?.removeAttribute('open'));
      announce(summary, 'Cards reordered: unrated and hardest first.');
    } else if (btn.dataset.clear !== undefined) {
      Object.keys(ratings).forEach((k) => delete ratings[k]);
      store.remove(key);
      // The same questions are forgotten in the flashcards too.
      const held = parseCards(readItem(CARDS_KEY));
      const ids = (cfg.cards ?? []).map((c) => c.id).filter((id) => held.cards[id]);
      if (ids.length) writeItem(CARDS_KEY, JSON.stringify(resetCards(held, ids)));
      before.clear();
      paint();
      announce(summary, cfg.cards?.length ? 'Ratings cleared, here and in your flashcards.' : 'Ratings cleared.');
    }
  });
  paint();
});
