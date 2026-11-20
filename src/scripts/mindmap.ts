/**
 * Mindmaps in the browser: the same layout and drawing functions as the build
 * (src/lib/mindmap.ts), redrawn when the reader folds a branch or switches to
 * the revision view; zoom and pan by changing the SVG's viewBox; downloads as
 * a branded SVG or PNG, with the fonts embedded so the file looks as it does
 * on the page.
 *
 * The map opens at a zoom where its smallest labels are at least 12 pixels
 * (READABLE), centred, and Whole map fits all of it. A phone opens on the
 * outline, which is real text; Map switches to the drawing, folded to its
 * branches.
 */
import { announce, each, readConfig } from './ix';
import { brandedSvg } from '../lib/mindmap-export';
import { layout, renderSvg, type AnyMap, type Layout } from '../lib/mindmap';

interface Config {
  id: string;
  map: AnyMap;
  code: string;
}

type Box = { x: number; y: number; w: number; h: number };

const glossaryHref = (id: string) => `/glossary/${id}/`;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
/** The smallest text in a map is 13 units (src/lib/mindmap.ts), so at this scale nothing is under 12 pixels. */
export const READABLE = 12 / 13;
const PHONE = '(max-width: 40rem)';

let fontCss: Promise<string> | null = null;
/** The two faces the map uses, as data URIs, for downloads. */
function embeddedFonts(): Promise<string> {
  fontCss ??= (async () => {
    const faces: Array<[string, string, string]> = [
      ['Inter', '/fonts/inter-latin-wght-normal.woff2', '100 900'],
      ['Source Serif 4', '/fonts/source-serif-4-latin-opsz-normal.woff2', '200 900'],
    ];
    const css: string[] = [];
    for (const [family, url, weight] of faces) {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        css.push(`@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2")}`);
      } catch {
        /* the download falls back to system faces */
      }
    }
    return css.join('');
  })();
  return fontCss;
}

each('[data-ix="mindmap"]', (root) => {
  const cfg = readConfig<Config>(root);
  const viewport = root.querySelector<HTMLElement>('[data-viewport]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!viewport) return;

  const collapsed = new Set<string>();
  let revision = false;
  let lay: Layout = layout(cfg.map);
  let view: Box = { ...lay.bounds };
  let svg: SVGSVGElement | null = null;

  const title = `Mindmap: ${cfg.map.title}`;
  const draw = () => {
    lay = layout(cfg.map, { collapsed, revision });
    viewport.innerHTML = renderSvg(lay, {
      code: cfg.code,
      glossaryHref,
      interactive: true,
      title,
      description: `${cfg.map.summary} The same content follows as an outline.`,
      idPrefix: `mm-${cfg.id}`,
    });
    svg = viewport.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
    }
  };

  const apply = () => svg?.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  const scale = () => viewport.clientWidth / view.w;
  /** Set once the reader moves or zooms the map, so a resize no longer resets the view. */
  let touched = false;

  /** Fit the whole map, keeping the viewport's proportions. */
  const fit = () => {
    // Not laid out yet (hidden, or before the first paint): fitting now would divide by zero.
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    const b = lay.bounds;
    const aspect = viewport.clientWidth / Math.max(1, viewport.clientHeight);
    let w = b.w;
    let h = b.h;
    if (w / h > aspect) h = w / aspect;
    else w = h * aspect;
    view = { x: b.x - (w - b.w) / 2, y: b.y - (h - b.h) / 2, w, h };
    apply();
  };

  const zoom = (factor: number, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => {
    touched = true;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale() * factor));
    const f = next / scale();
    if (!Number.isFinite(f) || f === 1) return;
    const w = view.w / f;
    const h = view.h / f;
    view = { x: cx - ((cx - view.x) * w) / view.w, y: cy - ((cy - view.y) * h) / view.h, w, h };
    apply();
  };

  /** Redraw, keeping one node where it was on screen. */
  const redrawAround = (id: string) => {
    const before = lay.nodes.find((n) => n.id === id);
    draw();
    const after = lay.nodes.find((n) => n.id === id);
    if (before && after) {
      view.x += after.x + after.w / 2 - (before.x + before.w / 2);
      view.y += after.y + after.h / 2 - (before.y + before.h / 2);
    }
    apply();
  };

  /** The first view: the whole map if it is readable that way, otherwise its centre at a readable zoom. */
  const start = () => {
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    fit();
    if (scale() >= READABLE) return;
    // Centred on the subject in the middle of the map, at (0, 0).
    const w = viewport.clientWidth / READABLE;
    const h = viewport.clientHeight / READABLE;
    view = { x: -w / 2, y: -h / 2, w, h };
    apply();
  };

  // On a narrow screen the whole map is too small to read: open on the branches, and let the reader unfold them.
  const phone = window.matchMedia(PHONE).matches;
  if (phone) cfg.map.branches.forEach((_, i) => collapsed.add(`b${i}`));
  draw();
  start();
  new ResizeObserver(() => {
    if (!touched) start();
    else if (viewport.clientWidth && viewport.clientHeight) {
      // Keep the zoom and the centre; only the shape of the window changes.
      const k = scale();
      const cx = view.x + view.w / 2;
      const cy = view.y + view.h / 2;
      const w = viewport.clientWidth / k;
      const h = viewport.clientHeight / k;
      view = { x: cx - w / 2, y: cy - h / 2, w, h };
      apply();
    }
  }).observe(viewport);

  /* ---------- Map or outline ---------- */
  const outline = root.querySelector<HTMLDetailsElement>('[data-outline]');
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode-btn]')];
  const setMode = (mode: 'map' | 'outline', say: boolean) => {
    root.dataset.mode = mode;
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeBtn === mode)));
    if (mode === 'outline' && outline) outline.open = true;
    if (mode === 'map' && !touched) requestAnimationFrame(start);
    if (say) announce(status, mode === 'outline' ? 'Showing the map as an outline.' : 'Showing the drawn map.');
  };
  modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeBtn === 'outline' ? 'outline' : 'map', true)));
  setMode(phone ? 'outline' : 'map', false);

  const more = root.querySelector<HTMLButtonElement>('[data-more]');
  const extra = root.querySelector<HTMLElement>('.mm-bar__extra');
  more?.addEventListener('click', () => {
    const open = !extra?.classList.contains('is-open');
    extra?.classList.toggle('is-open', open);
    more.setAttribute('aria-expanded', String(open));
  });

  /* ---------- Pointer: pan, pinch, and clicks on toggles ---------- */
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch = 0;
  const toSvg = (clientX: number, clientY: number) => {
    const r = viewport.getBoundingClientRect();
    return { x: view.x + ((clientX - r.left) / r.width) * view.w, y: view.y + ((clientY - r.top) / r.height) * view.h };
  };

  viewport.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a')) return;
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  });
  viewport.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (pointers.size === 2) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch) {
        const mid = toSvg((a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
        zoom(d / pinch, mid.x, mid.y);
      }
      pinch = d;
      moved += 10;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    moved += Math.abs(dx) + Math.abs(dy);
    const k = view.w / viewport.clientWidth;
    view.x -= dx * k;
    view.y -= dy * k;
    if (moved > 6) touched = true;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    apply();
  });
  const end = (e: PointerEvent) => {
    const wasTap = pointers.size === 1 && moved < 6;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!wasTap || e.type !== 'pointerup') return;
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<SVGElement>('[data-toggle]');
    const id = hit?.dataset.toggle;
    if (!id) return;
    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);
    redrawAround(id);
    const node = lay.nodes.find((n) => n.id === id);
    announce(status, `${node?.label ?? 'Branch'} ${collapsed.has(id) ? 'folded' : 'opened'}.`);
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  /* Zoom with Ctrl or Cmd and the wheel; a plain wheel scrolls the page as usual. */
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    },
    { passive: false },
  );

  viewport.addEventListener('keydown', (e) => {
    const step = view.w * 0.1;
    const keys: Record<string, () => void> = {
      '+': () => zoom(1.25),
      '=': () => zoom(1.25),
      '-': () => zoom(0.8),
      '0': fit,
      ArrowLeft: () => ((touched = true), (view.x -= step), apply()),
      ArrowRight: () => ((touched = true), (view.x += step), apply()),
      ArrowUp: () => ((touched = true), (view.y -= step), apply()),
      ArrowDown: () => ((touched = true), (view.y += step), apply()),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  });

  /* ---------- Toolbar ---------- */
  const branchesInOutline = [...root.querySelectorAll<HTMLDetailsElement>('[data-branch]')];
  const revisionButton = root.querySelector<HTMLButtonElement>('[data-revision]');
  revisionButton?.addEventListener('click', () => {
    revision = !revision;
    revisionButton.setAttribute('aria-pressed', String(revision));
    // The outline follows: only the core nodes of each branch stay.
    root.toggleAttribute('data-revision', revision);
    collapsed.clear();
    draw();
    touched = false;
    start();
    announce(status, revision ? 'Revision view: the essentials of each branch.' : 'Full map: every node.');
  });
  root.querySelector('[data-expand]')?.addEventListener('click', () => {
    collapsed.clear();
    branchesInOutline.forEach((d) => (d.open = true));
    draw();
    touched = false;
    start();
    announce(status, 'Every branch opened.');
  });
  root.querySelector('[data-collapse]')?.addEventListener('click', () => {
    cfg.map.branches.forEach((_, i) => collapsed.add(`b${i}`));
    branchesInOutline.forEach((d) => (d.open = false));
    draw();
    touched = false;
    start();
    announce(status, 'Branches only.');
  });
  root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.zoom === 'in') zoom(1.25);
      else if (b.dataset.zoom === 'out') zoom(0.8);
      else {
        touched = true;
        fit();
        announce(status, 'The whole map is in view.');
      }
    }),
  );

  /* ---------- Print the whole map, whatever the zoom ---------- */
  let saved: Box | null = null;
  window.addEventListener('beforeprint', () => {
    saved = { ...view };
    view = { ...lay.bounds };
    apply();
  });
  window.addEventListener('afterprint', () => {
    if (saved) view = saved;
    apply();
  });
  root.querySelector('[data-print]')?.addEventListener('click', () => window.print());

  /* ---------- Downloads ---------- */
  const exportSvg = async (): Promise<{ text: string; w: number; h: number }> => {
    const text = brandedSvg(cfg.id, cfg.map, { collapsed, revision, page: location.origin + location.pathname, fontCss: await embeddedFonts() });
    const m = /width="(\d+)" height="(\d+)"/.exec(text);
    return { text, w: Number(m?.[1] ?? 1200), h: Number(m?.[2] ?? 800) };
  };

  const save = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  root.querySelectorAll<HTMLButtonElement>('[data-download]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        const { text, w, h } = await exportSvg();
        const name = `the-business-brief-mindmap-${cfg.id}${revision ? '-revision' : ''}`;
        if (b.dataset.download === 'svg') {
          save(new Blob([text], { type: 'image/svg+xml' }), `${name}.svg`);
          announce(status, 'The map was saved as an SVG file.');
          return;
        }
        const img = new Image();
        const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('image'));
          img.src = url;
        });
        const k = Math.min(2, 8000 / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * k);
        canvas.height = Math.round(h * k);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (!blob) throw new Error('png');
        save(blob, `${name}.png`);
        announce(status, 'The map was saved as a PNG image.');
      } catch {
        announce(status, 'The download could not be made in this browser. Printing the page still works.');
      } finally {
        b.disabled = false;
      }
    }),
  );
});
