/**
 * The learner recorder. In this browser only, it notes the pages a reader
 * opens, by kind (topic, mindmap, case, framework, tool), and the exercise
 * items they check, so their dashboard (/dashboard/) can show what they have
 * done. It never sends anything anywhere, does nothing when storage is
 * blocked or the reader has paused it, and keeps its record capped in size
 * (the rules are in src/lib/learner.ts).
 *
 * To record every page, BaseLayout imports this module beside print and
 * motion. The save button imports it too, so the pages that carry one are
 * recorded either way; the module runs once a page.
 */
import { NAV } from '../lib/navigation';
import { LEARNER_KEY, cleanTitle, kindOfPath, parseLog, recordVisit, toolPrefixes, updateChecks } from '../lib/learner';
import { readItem, storageWorks, writeItem } from './storage';

const TOOL_PREFIXES = toolPrefixes(NAV);

interface QuizProgress {
  uid?: string;
  total?: number;
  results?: Record<string, string>;
}

function start(): void {
  const html = document.documentElement;
  if (html.dataset.learner) return;
  html.dataset.learner = 'on';
  if (!storageWorks()) return;

  const kind = kindOfPath(location.pathname, TOOL_PREFIXES);
  if (kind) {
    const log = parseLog(readItem(LEARNER_KEY));
    if (!log.paused) {
      // A save button for the page carries its name as the platform writes it ("1.4 Stakeholders"); otherwise the document's title.
      const named = [...document.querySelectorAll<HTMLElement>('[data-ix="save"]')].find((el) => el.dataset.url === location.pathname)?.dataset.title;
      const title = named || cleanTitle(document.title) || document.querySelector('h1')?.textContent?.trim() || location.pathname;
      writeItem(LEARNER_KEY, JSON.stringify(recordVisit(log, { kind, url: location.pathname, title }, new Date())));
    }
  }

  // The quiz engine reports each check (src/scripts/quiz.ts); the answers themselves stay in its own item.
  document.addEventListener('quiz:progress', (e) => {
    const detail = (e as CustomEvent<QuizProgress>).detail;
    const el = e.target instanceof HTMLElement ? e.target : null;
    if (!detail?.uid || !el) return;
    const log = parseLog(readItem(LEARNER_KEY));
    if (log.paused) return;
    let picks: unknown;
    try {
      picks = JSON.parse(readItem(`bb:quiz:${detail.uid}`) ?? '{}');
    } catch {
      picks = {};
    }
    const heading = el.closest('[data-stage], section, article')?.querySelector('h2, h3, h4')?.textContent?.replace(/\s+/g, ' ').trim();
    const title = heading ? `${heading}, on ${cleanTitle(document.title)}` : cleanTitle(document.title);
    const next = updateChecks(log, { uid: detail.uid, total: Number(detail.total) || 0, results: detail.results ?? {}, picks, url: `${location.pathname}#${el.id || detail.uid}`, title }, new Date());
    if (next !== log) writeItem(LEARNER_KEY, JSON.stringify(next));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
