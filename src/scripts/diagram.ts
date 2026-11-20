/**
 * Diagrams in the browser (src/components/diagrams/Diagram.astro). Every
 * diagram is complete without this script; it adds:
 * - explore: a part's explanation beside the drawing on hover, keyboard
 *   focus or a first tap (a second tap, a click or Enter opens its page);
 * - switch: one state at a time, chosen with radio buttons;
 * - compare: two panels side by side, chosen with two lists, with the facts
 *   that differ marked in words;
 * - tree: open or close every question at once;
 * - live: the figures recalculated as they change (src/scripts/diagram-live.ts,
 *   loaded only on pages that have one);
 * - a larger view for a wide drawing with no phone layout, and printing one
 *   diagram on its own.
 */
import { announce, each, readConfig } from './ix';

each('[data-ix="diagram"]', (root) => {
  const status = root.querySelector<HTMLElement>('[data-status]');
  const kind = root.dataset.kind;
  setupPrint(root);
  setupZoom(root, status);
  if (kind === 'explore') setupExplore(root);
  if (kind === 'switch') setupSwitch(root, status);
  if (kind === 'compare') setupCompare(root, status);
  if (kind === 'tree') setupTree(root, status);
  if (kind === 'live')
    import('./diagram-live')
      .then((m) => m.setupLive(root))
      .catch((err: unknown) => {
        root.classList.add('is-broken');
        console.error(err);
      });
});

/* ---------- Explore: hover, focus and tap ---------- */
function setupExplore(root: HTMLElement): void {
  const readout = root.querySelector<HTMLElement>('[data-readout]');
  const list = root.querySelector<HTMLDetailsElement>('[data-parts]');
  // The readout now carries the explanations; the full list stays one click away.
  if (list) list.open = false;
  let active = '';
  /** The part a touch has explained, which the next touch on it opens. */
  let armed = '';
  let pointer = 'mouse';
  const show = (pid: string) => {
    if (!readout || pid === active) return;
    active = pid;
    root.querySelectorAll('.dgp.is-active').forEach((x) => x.classList.remove('is-active'));
    root.querySelectorAll(`.dgp[data-part="${CSS.escape(pid)}"]`).forEach((x) => x.classList.add('is-active'));
    const entry = root.querySelector<HTMLElement>(`[data-dg-entry="${CSS.escape(pid)}"]`);
    if (entry) readout.replaceChildren(...[...entry.childNodes].map((n) => n.cloneNode(true)));
  };
  root.querySelectorAll<SVGElement>('.dgp').forEach((el) => {
    const pid = el.dataset.part ?? '';
    el.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') show(pid);
    });
    el.addEventListener('pointerdown', (e) => {
      pointer = (e as PointerEvent).pointerType;
    });
    el.addEventListener('focus', () => show(pid));
    el.addEventListener('click', (e) => {
      // On a touch screen the first tap explains; the second, on the same part, opens it.
      if (pointer !== 'mouse' && armed !== pid) {
        e.preventDefault();
        armed = pid;
        show(pid);
      }
      pointer = 'mouse';
    });
  });
}

/* ---------- Switch: one state at a time ---------- */
function setupSwitch(root: HTMLElement, status: HTMLElement | null): void {
  const radios = [...root.querySelectorAll<HTMLInputElement>('.dg-switch input[type="radio"]')];
  const states = [...root.querySelectorAll<HTMLElement>('[data-state]')];
  const apply = (id: string, say: boolean) => {
    for (const s of states) s.hidden = s.dataset.state !== id;
    const shown = states.find((s) => s.dataset.state === id);
    if (say && shown) announce(status, `${shown.querySelector('.dg__state-h')?.textContent ?? ''}. ${shown.querySelector('.dg__state-note')?.textContent ?? ''}`);
  };
  radios.forEach((r) => r.addEventListener('change', () => r.checked && apply(r.value, true)));
  apply(radios.find((r) => r.checked)?.value ?? states[0]?.dataset.state ?? '', false);
}

/* ---------- Compare: two panels side by side ---------- */
function setupCompare(root: HTMLElement, status: HTMLElement | null): void {
  const cfg = readConfig<{ first?: [string, string] }>(root);
  const a = root.querySelector<HTMLSelectElement>('[data-pick="a"]');
  const b = root.querySelector<HTMLSelectElement>('[data-pick="b"]');
  const same = root.querySelector<HTMLElement>('[data-same]');
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  if (!a || !b) return;
  if (cfg.first) {
    a.value = cfg.first[0];
    b.value = cfg.first[1];
  }
  const apply = (say: boolean) => {
    const pa = panels.find((p) => p.dataset.panel === a.value);
    const pb = panels.find((p) => p.dataset.panel === b.value);
    for (const p of panels) {
      p.hidden = p !== pa && p !== pb;
      p.style.order = p === pa ? '0' : '1';
    }
    if (same) same.hidden = a.value !== b.value;
    // Mark each fact that differs between the two, in words as well as by a rule.
    const differences: string[] = [];
    for (const p of panels) p.querySelectorAll<HTMLElement>('[data-fact]').forEach((f) => f.classList.remove('is-different'));
    for (const p of panels) p.querySelectorAll<HTMLElement>('.dg__differs').forEach((m) => (m.hidden = true));
    if (pa && pb && pa !== pb) {
      pa.querySelectorAll<HTMLElement>('[data-fact]').forEach((fa) => {
        const key = fa.dataset.fact ?? '';
        const fb = pb.querySelector<HTMLElement>(`[data-fact="${CSS.escape(key)}"]`);
        if (!fb) return;
        if ((fa.querySelector('dd')?.textContent ?? '') !== (fb.querySelector('dd')?.textContent ?? '')) {
          differences.push(key.toLowerCase());
          for (const f of [fa, fb]) {
            f.classList.add('is-different');
            const m = f.querySelector<HTMLElement>('.dg__differs');
            if (m) m.hidden = false;
          }
        }
      });
    }
    if (say) {
      const na = a.selectedOptions[0]?.textContent ?? '';
      const nb = b.selectedOptions[0]?.textContent ?? '';
      announce(status, a.value === b.value ? 'Choose two different ones to compare.' : `${na} beside ${nb}. They differ in ${differences.length} of their facts${differences.length ? `: ${differences.join(', ')}` : ''}.`);
    }
  };
  a.addEventListener('change', () => apply(true));
  b.addEventListener('change', () => apply(true));
  apply(false);
}

/* ---------- Tree: open or close every question ---------- */
function setupTree(root: HTMLElement, status: HTMLElement | null): void {
  root.querySelectorAll<HTMLButtonElement>('[data-tree-all]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const open = btn.dataset.treeAll === 'open';
      root.querySelectorAll<HTMLDetailsElement>('[data-tree-q]').forEach((d, i) => {
        // Closing them all leaves the first question open, so the walk starts there.
        d.open = open || i === 0;
      });
      announce(status, open ? 'Every question is open.' : 'Every question is closed except the first: open one answer at a time to follow a path.');
    }),
  );
}

/* ---------- A larger view of a wide drawing on a phone ---------- */
function setupZoom(root: HTMLElement, status: HTMLElement | null): void {
  const btn = root.querySelector<HTMLButtonElement>('[data-zoom]');
  const art = root.querySelector<HTMLElement>('[data-art]');
  if (!btn || !art) return;
  btn.addEventListener('click', () => {
    const large = !root.classList.contains('is-large');
    root.classList.toggle('is-large', large);
    btn.setAttribute('aria-pressed', String(large));
    btn.textContent = large ? 'Fit to the screen' : 'Show larger';
    if (large) {
      art.tabIndex = 0;
      art.setAttribute('role', 'region');
      art.setAttribute('aria-label', 'The diagram, larger: scroll sideways to see all of it');
    } else {
      art.removeAttribute('tabindex');
      art.removeAttribute('role');
      art.removeAttribute('aria-label');
    }
    announce(status, large ? 'The diagram is larger: scroll sideways to see all of it.' : 'The diagram fits the screen again.');
  });
}

/* ---------- Print one diagram on its own ---------- */
function setupPrint(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => printFigure(root));
}

/**
 * Prints the diagram as it stands (the state, panels or figures on screen),
 * by copying it into a hidden frame with the page's own styles, so nothing
 * else on the page is printed.
 */
export function printFigure(root: HTMLElement): void {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('form, button, select, .dg-switch, .dg-pick, [data-readout], [data-status], script').forEach((n) => n.remove());
  clone.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => (d.open = true));
  clone.querySelectorAll<HTMLElement>('[hidden]').forEach((n) => {
    // Hidden states and panels stay hidden; hidden error messages too.
    if (n.matches('[data-state], [data-panel], .dg-field__err, .dg__differs, [data-same]')) n.remove();
  });
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join('');
  const title = root.querySelector('.dg__title')?.textContent?.trim() ?? 'Diagram';
  const credit = `Arjun Agrawal | The Business Brief. ${location.origin}${location.pathname}`;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = `<!doctype html><html lang="en-GB" class="js"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}<style>body{background:#fff;padding:12mm}.dg{box-shadow:none}</style></head><body><main>${clone.outerHTML}<p class="small muted">${escapeHtml(credit)}</p></main></body></html>`;
  frame.addEventListener('load', () => {
    const w = frame.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
    setTimeout(() => frame.remove(), 60_000);
  });
  document.body.append(frame);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}
