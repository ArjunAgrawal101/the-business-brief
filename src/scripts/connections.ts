/**
 * The course connections map in the browser: a unit filter over the map and
 * both lists, the links the notes name drawn on request, and a subtopic
 * chosen by click, tap or keyboard (the arrow keys move round the ring, Home
 * and End go to its ends, Enter or Space chooses, Escape clears), with its
 * connections highlighted on the map and listed in the panel beside it.
 * Without JavaScript the map's nodes are plain links to the list below.
 */
import { announce, each, readConfig } from './ix';

interface Config {
  nodes: Array<{ code: string; title: string; unit: number; worked: number; notes: number }>;
  units: Array<{ number: number; title: string }>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const anchorOf = (code: string) => `t-${code.replace('.', '-')}`;

each('[data-ix="connections"]', (root) => {
  const cfg = readConfig<Config>(root);
  const status = root.querySelector<HTMLElement>('[data-status]');
  const nodes = [...root.querySelectorAll<SVGAElement>('.tcm-node')];
  const edges = [...root.querySelectorAll<SVGPathElement>('.tcm-edge')];
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="tcm-unit"]')];
  const notesToggle = root.querySelector<HTMLInputElement>('[data-notes-toggle]');
  const panel = root.querySelector<HTMLElement>('[data-panel]');
  const body = root.querySelector<HTMLElement>('[data-panel-body]');
  const actions = root.querySelector<HTMLElement>('[data-panel-actions]');
  const empty = body?.innerHTML ?? '';
  const links = [...root.querySelectorAll<HTMLElement>('.tcm-link')];
  const blocks = [...root.querySelectorAll<HTMLElement>('[data-unit-block]')];
  const topics = [...root.querySelectorAll<HTMLElement>('.tcm-topic')];
  const linksCount = root.querySelector<HTMLElement>('[data-links-count]');
  const byCode = new Map(cfg.nodes.map((n) => [n.code, n]));

  let unit = '';
  let selected: string | null = null;

  const inUnit = (code: string) => !unit || code.split('.')[0] === unit;
  const codeOf = (el: Element) => (el as SVGElement).dataset.code ?? '';
  const visibleNodes = () => nodes.filter((n) => inUnit(codeOf(n)));

  /* ---------- Painting ---------- */

  const paint = () => {
    const near = new Set<string>();
    for (const e of edges) {
      const a = e.dataset.a ?? '';
      const b = e.dataset.b ?? '';
      const touchesSelected = selected !== null && (a === selected || b === selected);
      const touchesUnit = inUnit(a) || inUnit(b);
      e.classList.toggle('is-on', touchesSelected);
      e.classList.toggle('is-dim', selected !== null ? !touchesSelected : !touchesUnit);
      if (touchesSelected) near.add(a === selected ? b : a);
    }
    for (const n of nodes) {
      const code = codeOf(n);
      n.classList.toggle('is-selected', code === selected);
      n.classList.toggle('is-near', near.has(code));
      n.classList.toggle('is-dim', selected !== null ? code !== selected && !near.has(code) : !inUnit(code));
      if (code === selected) n.setAttribute('aria-current', 'true');
      else n.removeAttribute('aria-current');
    }
  };

  const filterLists = () => {
    let shown = 0;
    for (const li of links) {
      const ok = !unit || (li.dataset.units ?? '').split(' ').includes(unit);
      li.hidden = !ok;
      if (ok) shown += 1;
    }
    for (const t of topics) t.hidden = Boolean(unit) && t.dataset.unit !== unit;
    for (const b of blocks) b.hidden = Boolean(unit) && b.dataset.unitBlock !== unit;
    if (linksCount) linksCount.textContent = unit ? `Showing the ${plural(shown, 'worked connection', 'worked connections')} that reach Unit ${unit}.` : '';
    return shown;
  };

  /* ---------- The panel ---------- */

  const fill = (code: string | null) => {
    if (!body) return;
    if (!code) {
      body.innerHTML = empty;
      if (actions) actions.hidden = true;
      return;
    }
    const entry = root.querySelector<HTMLElement>(`#${anchorOf(code)}`);
    if (!entry) return;
    const copy = entry.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id');
    copy.removeAttribute('hidden');
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    // The entry's h4 sits under the panel's h2 here, so it becomes an h3.
    copy.querySelectorAll('h4').forEach((h) => {
      const h3 = document.createElement('h3');
      h3.className = h.className;
      h3.innerHTML = h.innerHTML;
      h.replaceWith(h3);
    });
    body.replaceChildren(copy);
    if (actions) actions.hidden = false;
  };

  /* ---------- Choosing ---------- */

  const describe = (code: string) => {
    const n = byCode.get(code);
    if (!n) return '';
    return `${code} ${n.title}: ${plural(n.worked, 'worked connection', 'worked connections')}${n.notes ? `, and ${plural(n.notes, 'more link', 'more links')} in the notes` : ''}.`;
  };

  const select = (code: string | null, say = true) => {
    selected = code && byCode.has(code) ? code : null;
    paint();
    fill(selected);
    if (say) announce(status, selected ? describe(selected) : 'No subtopic chosen.');
    // On a narrow layout the panel sits under the map: bring it into view.
    if (selected && panel && say && window.matchMedia('(max-width: 79.99rem)').matches) panel.scrollIntoView({ block: 'nearest' });
  };

  const setFocusable = (code: string) => {
    for (const n of nodes) n.setAttribute('tabindex', codeOf(n) === code ? '0' : '-1');
  };

  const focusNode = (code: string) => {
    const n = nodes.find((x) => codeOf(x) === code);
    if (!n) return;
    setFocusable(code);
    n.focus();
  };

  for (const n of nodes) {
    n.addEventListener('click', (e) => {
      e.preventDefault();
      const code = codeOf(n);
      setFocusable(code);
      select(selected === code ? null : code);
    });
    n.addEventListener('keydown', (e) => {
      const list = visibleNodes();
      const at = list.indexOf(n);
      const go = (i: number) => {
        const target = list[(i + list.length) % list.length];
        if (target) focusNode(codeOf(target));
      };
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          go(at < 0 ? 0 : at + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          go(at < 0 ? 0 : at - 1);
          break;
        case 'Home':
          e.preventDefault();
          go(0);
          break;
        case 'End':
          e.preventDefault();
          go(list.length - 1);
          break;
        case ' ':
          e.preventDefault();
          select(codeOf(n));
          break;
        case 'Escape':
          if (selected) {
            e.preventDefault();
            select(null);
          }
          break;
      }
    });
  }

  root.querySelector<HTMLButtonElement>('[data-clear]')?.addEventListener('click', () => {
    const was = selected;
    select(null);
    if (was) focusNode(was);
  });

  root.querySelectorAll<HTMLButtonElement>('[data-show-on-map]').forEach((b) =>
    b.addEventListener('click', () => {
      const code = b.dataset.showOnMap ?? '';
      select(code, false);
      root.querySelector('[data-map]')?.scrollIntoView({ block: 'start' });
      focusNode(code);
      announce(status, describe(code));
    }),
  );

  /* ---------- Filters ---------- */

  radios.forEach((r) =>
    r.addEventListener('change', () => {
      if (!r.checked) return;
      unit = r.value;
      if (selected && !inUnit(selected)) select(null, false);
      paint();
      const shown = filterLists();
      const first = visibleNodes()[0];
      if (first) setFocusable(codeOf(first));
      const info = cfg.units.find((u) => String(u.number) === unit);
      announce(status, info ? `Unit ${info.number}, ${info.title}: ${plural(visibleNodes().length, 'subtopic', 'subtopics')} and the ${plural(shown, 'worked connection', 'worked connections')} that reach them.` : `All ${plural(nodes.length, 'subtopic', 'subtopics')} and ${plural(links.length, 'worked connection', 'worked connections')}.`);
    }),
  );

  notesToggle?.addEventListener('change', () => {
    root.classList.toggle('show-notes', notesToggle.checked);
    announce(status, notesToggle.checked ? 'The links the notes name are drawn as dashed lines.' : 'Only the worked connections are drawn.');
  });

  /* ---------- Start ---------- */

  setFocusable(codeOf(nodes[0] ?? document.createElementNS('http://www.w3.org/2000/svg', 'a')));
  // A subtopic page links to its entry (#t-3-5): choose it on the map too.
  const fromHash = /^#t-(\d)-(\d)$/.exec(location.hash);
  if (fromHash) {
    const code = `${fromHash[1]}.${fromHash[2]}`;
    if (byCode.has(code)) {
      setFocusable(code);
      select(code, false);
    }
  }
  paint();
});
