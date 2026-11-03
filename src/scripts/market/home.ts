/**
 * The Market Studio's front page: shows which instruments have saved work in
 * this browser, and removes it all on request. It reads and removes only the
 * studio's own keys (bb:market:…), and works without them.
 */
import { announce, escapeHtml, readConfig } from '../ix';

interface Config {
  tools: Array<{ slug: string; name: string; key: string; href: string }>;
}

const root = document.querySelector<HTMLElement>('[data-notebook]');
if (root) {
  const cfg = readConfig<Config>(root);
  const list = root.querySelector<HTMLElement>('[data-notebook-list]');
  const empty = root.querySelector<HTMLElement>('[data-notebook-empty]');
  const clear = root.querySelector<HTMLButtonElement>('[data-notebook-clear]');
  const status = root.querySelector<HTMLElement>('[data-status]');

  const savedAt = (key: string): string | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const v = JSON.parse(raw) as { savedAt?: string };
      return typeof v.savedAt === 'string' ? v.savedAt : 'unknown';
    } catch {
      return null;
    }
  };

  const draw = () => {
    const found = cfg.tools.map((t) => ({ t, at: savedAt(t.key) })).filter((x) => x.at !== null);
    if (list)
      list.innerHTML = found
        .map(({ t, at }) => {
          const d = at && at !== 'unknown' ? new Date(at) : null;
          const when = d && !Number.isNaN(d.getTime()) ? d.toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'date not recorded';
          return `<li><a href="${escapeHtml(t.href)}">${escapeHtml(t.name)}</a><span class="small muted">Last saved ${escapeHtml(when)}</span></li>`;
        })
        .join('');
    if (empty) empty.hidden = found.length > 0;
    if (clear) clear.hidden = found.length === 0;
    document.querySelectorAll<HTMLElement>('[data-tool]').forEach((row) => {
      const tool = cfg.tools.find((t) => t.slug === row.dataset.tool);
      const mark = row.querySelector<HTMLElement>('[data-saved]');
      if (mark && tool) mark.hidden = savedAt(tool.key) === null;
    });
    return found.length;
  };

  draw();
  clear?.addEventListener('click', () => {
    if (!window.confirm('Remove all your Market Studio work from this browser? This cannot be undone.')) return;
    for (const t of cfg.tools) {
      try {
        localStorage.removeItem(t.key);
      } catch {
        /* storage unavailable */
      }
    }
    draw();
    announce(status, 'All Market Studio work has been removed from this browser.');
    empty?.focus();
  });
}
