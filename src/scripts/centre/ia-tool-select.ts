/**
 * The tool selection assistant in the browser: suggestions from
 * recommendTools() in src/lib/ia-tools.ts as the reader describes the
 * question and the data, a shortlist, and a download, kept in bb:ia-tools.
 */
import { announce, each, escapeHtml, readConfig, store } from '../ix';
import { DATA_KINDS, QUESTION_KINDS, recommendTools, type DataKind, type QuestionKind, type Suggestion } from '../../lib/ia-tools';
import { download, twoStepReset } from './ia-common';

const KEY = 'ia-tools';
const SHORT = 3;
/** The best suggestions shown first; the rest wait behind "Show all". */
const TOP = 6;

interface Saved {
  kind: QuestionKind | '';
  data: DataKind[];
  level: 'SL' | 'HL';
  picked: string[];
}

each('[data-ix="ia-tools"]', (root) => {
  const { links } = readConfig<{ links: Record<string, { href: string; label: string }> }>(root);
  const live = root.querySelector<HTMLElement>('[data-live]');
  const inputs = (name: string) => [...root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)];
  const saved = store.get<Partial<Saved>>(KEY, {});
  let picked = new Set(Array.isArray(saved.picked) ? saved.picked : []);
  inputs('kind').forEach((r) => (r.checked = r.value === saved.kind));
  inputs('data').forEach((b) => (b.checked = Array.isArray(saved.data) && saved.data.includes(b.value as DataKind)));
  const lv = saved.level === 'SL' ? 'SL' : document.documentElement.getAttribute('data-level') === 'SL' && !saved.level ? 'SL' : 'HL';
  inputs('level').forEach((r) => (r.checked = r.value === lv));

  const read = (): Saved => ({
    kind: (inputs('kind').find((r) => r.checked)?.value as QuestionKind | undefined) ?? '',
    data: inputs('data').filter((b) => b.checked).map((b) => b.value as DataKind),
    level: inputs('level').find((r) => r.checked)?.value === 'SL' ? 'SL' : 'HL',
    picked: [...picked],
  });

  const list = root.querySelector<HTMLElement>('[data-list]');
  const summary = root.querySelector<HTMLElement>('[data-summary]');
  const hlBox = root.querySelector<HTMLElement>('[data-hl]');
  const hlList = root.querySelector<HTMLElement>('[data-hl-list]');
  const shortEl = root.querySelector<HTMLElement>('[data-shortlist]');
  let current: Suggestion[] = [];
  let showAll = false;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'btn btn--small';
  more.hidden = true;
  list?.after(more);
  more.addEventListener('click', () => {
    showAll = !showAll;
    paintMore();
    if (showAll) list?.querySelectorAll<HTMLElement>('li')[TOP]?.querySelector('a')?.focus();
  });
  const paintMore = () => {
    const items = [...(list?.querySelectorAll<HTMLElement>(':scope > li') ?? [])];
    items.forEach((li, i) => (li.hidden = !showAll && i >= TOP));
    more.hidden = items.length <= TOP;
    more.textContent = showAll ? `Show the best ${TOP} only` : `Show all ${items.length} tools that fit`;
  };

  const item = (s: Suggestion) => {
    const link = links[s.rule.id];
    const id = `ts-pick-${s.rule.id}`;
    return `<li><div><p class="ts-name">${link ? `<a href="${escapeHtml(link.href)}">${escapeHtml(s.rule.name)}</a>` : escapeHtml(s.rule.name)}</p>
<p class="ts-meta"><span>${s.rule.kind === 'toolkit' ? 'Toolkit' : `Syllabus ${escapeHtml(s.rule.code ?? '')}`}</span><span>${s.rule.level === 'HL' ? 'HL only' : 'SL and HL'}</span>${s.fits ? '<span>Fits your question</span>' : ''}</p>
<p class="ts-why">${escapeHtml(s.reason)}</p>
<p class="ts-decides"><b>It decides:</b> ${escapeHtml(s.rule.decides)}.</p>${s.rule.caution ? `<p class="ts-caution">${escapeHtml(s.rule.caution)}</p>` : ''}</div>
<label class="it-check ts-pick" for="${id}"><input type="checkbox" id="${id}" data-pick="${escapeHtml(s.rule.id)}"${picked.has(s.rule.id) ? ' checked' : ''} /> <span>Shortlist</span></label></li>`;
  };

  const paintShort = () => {
    if (!shortEl) return;
    const n = current.filter((x) => picked.has(x.rule.id)).length;
    shortEl.textContent = !n
      ? 'Tick up to three tools to shortlist them.'
      : n > SHORT
        ? `${n} tools shortlisted. The teacher support material advises a few tools, applied in depth, over many applied thinly (p. 70): which ones decide your question?`
        : `${n} shortlisted. For each, check that your documents hold the data it needs, and that it answers part of your question.`;
  };

  const render = () => {
    const s = read();
    const { suggested, hlOnly } = recommendTools(s.kind, s.data, s.level);
    current = suggested;
    if (list) list.innerHTML = suggested.map(item).join('');
    paintMore();
    if (summary)
      summary.textContent = !s.kind && !s.data.length
        ? 'Choose what your question asks and tick the data your documents hold.'
        : !s.data.length
          ? 'Tick the data your documents hold: a tool needs figures or findings to work on.'
          : suggested.length
            ? `${suggested.length} ${suggested.length === 1 ? 'tool fits' : 'tools fit'}, best first${suggested.length > TOP && !showAll ? `; the best ${TOP} are shown` : ''}.${s.kind ? '' : ' Choose what your question asks to sharpen the list.'}`
            : 'No tool fits both the question and the data yet. Look for documents with figures your question needs.';
    if (hlBox && hlList) {
      hlBox.hidden = hlOnly.length === 0;
      hlList.innerHTML = hlOnly.map((h) => `<li>${escapeHtml(h.rule.name)}: ${escapeHtml(h.rule.decides.charAt(0).toLowerCase() + h.rule.decides.slice(1))}</li>`).join('');
    }
    paintShort();
    store.set(KEY, s);
  };

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.pick) {
      if (t.checked) picked.add(t.dataset.pick);
      else picked.delete(t.dataset.pick);
      paintShort();
      store.set(KEY, read());
      announce(live, shortEl?.textContent ?? '');
      return;
    }
    render();
    announce(live, summary?.textContent ?? '');
  });

  root.querySelector<HTMLButtonElement>('[data-download]')?.addEventListener('click', () => {
    const s = read();
    const chosen = current.filter((x) => picked.has(x.rule.id));
    const lines = [
      'Tool selection: my shortlist (The Business Brief)',
      '',
      `My question asks: ${s.kind ? QUESTION_KINDS[s.kind] : 'not yet chosen'}`,
      `Data in my documents: ${s.data.length ? s.data.map((d) => DATA_KINDS[d]).join('; ') : 'none ticked'}`,
      `Level: ${s.level}`,
      '',
      ...(chosen.length ? chosen.flatMap((x) => [`${x.rule.name} (${x.rule.level === 'HL' ? 'HL only' : 'SL and HL'})`, `  Why: ${x.reason}`, `  It decides: ${x.rule.decides}.`, ...(x.rule.caution ? [`  Note: ${x.rule.caution}`] : []), '']) : ['No tools shortlisted yet.', '']),
      'Criterion C rewards tools selected and applied with clear relevance to the research question (IB Business management guide, p. 57).',
    ];
    download('business-brief-ia-tool-shortlist.txt', lines.join('\n'), 'text/plain;charset=utf-8');
    announce(live, 'Shortlist downloaded.');
  });
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  twoStepReset(root, () => {
    inputs('kind').forEach((r) => (r.checked = false));
    inputs('data').forEach((b) => (b.checked = false));
    picked = new Set();
    store.remove(KEY);
    render();
    announce(live, 'Cleared.');
  });

  render();
});
