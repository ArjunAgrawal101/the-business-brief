/**
 * The Boardroom Briefings' edition switch. Without this script the page reads
 * as the Student edition followed by the Analysis edition in a closed
 * disclosure. With it, a switch shows one edition at a time: the choice is
 * kept in the address (#analysis), announced to screen readers, and followed
 * when a link points into the other edition, so a reader of the analysis can
 * check an exhibit and come back with the browser's Back button.
 */
import { EDITION_ANNOUNCEMENTS, EDITION_NOTES, editionAddress, isEdition, type Edition } from '../lib/boardroom-briefings/editions';
import { announce, each } from './ix';

each('[data-ix="briefing-editions"]', (root) => {
  const student = root.querySelector<HTMLElement>('[data-panel="student"]');
  const analysis = root.querySelector<HTMLDetailsElement>('details[data-panel="analysis"]');
  if (!student || !analysis) throw new Error('The briefing has no editions to switch between.');
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="edition"]')];
  const note = root.querySelector<HTMLElement>('[data-edition-note]');
  const live = root.querySelector<HTMLElement>('[data-edition-live]');

  /** The edition that holds the element a fragment names, or null when it names neither. */
  const editionOf = (hash: string): Edition | null => {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const el = id ? document.getElementById(id) : null;
    if (!el) return null;
    if (analysis.contains(el)) return 'analysis';
    if (student.contains(el)) return 'student';
    return null;
  };

  const show = (edition: Edition, how: { announce?: boolean; address?: boolean } = {}) => {
    root.dataset.edition = edition;
    student.hidden = edition !== 'student';
    analysis.hidden = edition !== 'analysis';
    analysis.open = edition === 'analysis';
    for (const r of radios) r.checked = r.value === edition;
    if (note) note.textContent = EDITION_NOTES[edition];
    if (how.announce) announce(live, EDITION_ANNOUNCEMENTS[edition]);
    if (how.address) history.replaceState(history.state, '', editionAddress(location.pathname, location.search, edition));
  };

  show(editionOf(location.hash) ?? 'student');

  for (const r of radios) {
    r.addEventListener('change', () => {
      if (r.checked && isEdition(r.value)) show(r.value, { announce: true, address: true });
    });
  }

  // The button at the end of each edition opens the other at its start, and takes focus there, since the button itself disappears.
  root.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const to = btn.dataset.go;
      if (!isEdition(to)) return;
      show(to, { announce: true, address: true });
      (to === 'analysis' ? analysis : student).querySelector<HTMLElement>('[data-edition-start]')?.focus();
    });
  });

  // A link to something in the other edition (an exhibit, a question) opens that edition before the browser follows it.
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
    const to = link ? editionOf(link.getAttribute('href') ?? '') : null;
    if (to && to !== root.dataset.edition) show(to, { announce: true });
  });

  // Back and Forward, and links from other pages, can land in either edition.
  window.addEventListener('hashchange', () => {
    const to = editionOf(location.hash);
    if (!to || to === root.dataset.edition) return;
    show(to);
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  });
});
