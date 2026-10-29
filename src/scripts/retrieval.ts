import { announce, each, readConfig, store } from './ix';

interface Config {
  id: string;
  count: number;
}

each('[data-ix="retrieval"]', (root) => {
  const cfg = readConfig<Config>(root);
  const key = `rc:${cfg.id}`;
  const ratings = store.get<Record<string, number>>(key, {});
  const list = root.querySelector<HTMLElement>('[data-list]');
  const summary = root.querySelector<HTMLElement>('[data-summary]');
  const WORDS = ['Not yet', 'Partly', 'Got it'];

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
      paint();
      announce(summary, 'Ratings cleared.');
    }
  });
  paint();
});
