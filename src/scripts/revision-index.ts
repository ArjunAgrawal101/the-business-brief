/**
 * Quick revision's index: how many flashcards are due today in this browser,
 * for the whole deck and for each subtopic, read from bb:cards (each stored
 * card carries its subtopic codes, so the deck itself is not needed here).
 */
import { CARDS_KEY, localDay, parseCards, plural } from '../lib/flashcards';
import { readItem } from './storage';

const state = parseCards(readItem(CARDS_KEY));
const today = localDay(new Date());
const due = Object.values(state.cards).filter((r) => r.due <= today);
const seen = Object.keys(state.cards).length;

const total = document.querySelector<HTMLElement>('[data-due-total]');
if (total) {
  total.textContent = seen
    ? `${due.length ? `${plural(due.length, 'card is', 'cards are')} due today` : 'No cards are due today'}, of ${plural(seen, 'card', 'cards')} you have rated in this browser.`
    : 'Your progress is kept in this browser once you rate a card.';
}
document.querySelectorAll<HTMLElement>('[data-due]').forEach((el) => {
  const code = el.dataset.due ?? '';
  const n = due.filter((r) => r.codes.includes(code)).length;
  el.textContent = n ? `${n} due today` : '';
  el.hidden = n === 0;
});
