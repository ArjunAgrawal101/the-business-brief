/**
 * Study mode on a subtopic page (src/components/learn/StudyMode.astro). The
 * reader's text size and low light are kept in bb:study and applied to the
 * article (the component's inline script has already applied them before the
 * page was drawn); "Mark as complete" keeps the subtopic's code in
 * bb:studied. The contents list is read from the article's section headings,
 * those the SL or HL choice leaves visible, and is drawn twice: as a rail
 * beside the article on wide screens and as a jump menu in the strip under
 * the header on narrower ones (CSS shows one). The strip and the rail show
 * how far through the page the reader is, and mark the section in view.
 * Storage that is blocked never stops the page: the choices then last for
 * the visit, and Mark as complete is not offered.
 */
import { announce, each, escapeHtml as h } from './ix';
import { STUDIED_KEY, isStudied, parseStudied, setStudied } from '../lib/learner';
import { SIZE_LABELS, STUDY_KEY, contentsLabel, currentSection, parseStudy, readingProgress, type SizeStep } from '../lib/study';
import { readItem, storageWorks, writeItem } from './storage';

interface Entry {
  heading: HTMLElement;
  target: string;
  label: string;
  no: string;
}

/** A heading's own words, without what only screen readers hear. */
function headingText(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.sr-only, [aria-hidden="true"]').forEach((x) => x.remove());
  return contentsLabel(copy.textContent ?? '');
}

each('[data-ix="study"]', (box) => {
  const root = box.closest<HTMLElement>('[data-study-root]') ?? box.parentElement;
  if (!root) return;
  root.setAttribute('data-study-root', '');
  const code = box.dataset.code ?? '';
  const title = box.dataset.title ?? document.title;
  const live = box.querySelector<HTMLElement>('[data-live]');
  const strip = box.nextElementSibling instanceof HTMLElement && box.nextElementSibling.matches('[data-strip]') ? box.nextElementSibling : null;
  const say = (text: string) => announce(live, text);
  const canStore = storageWorks();

  /* ---------- Text size and low light ---------- */

  let prefs = parseStudy(readItem(STUDY_KEY));
  const sizes = [...box.querySelectorAll<HTMLInputElement>('[data-size]')];
  const low = box.querySelector<HTMLButtonElement>('[data-low]');

  const apply = () => {
    root.setAttribute('data-study-size', String(prefs.size));
    root.toggleAttribute('data-study-low', prefs.low);
    for (const r of sizes) r.checked = Number(r.value) === prefs.size;
    low?.setAttribute('aria-pressed', String(prefs.low));
  };
  const keep = () => {
    if (canStore) writeItem(STUDY_KEY, JSON.stringify(prefs));
  };

  /** Change the article and keep the reader's place: the section in view stays where it was on the screen. */
  const steady = (change: () => void) => {
    const list = entries.filter((e) => e.heading.getClientRects().length);
    const anchor = list[currentSection(list.map((e) => e.heading.getBoundingClientRect().top), readingLine())]?.heading;
    const before = anchor?.getBoundingClientRect().top ?? 0;
    change();
    if (anchor && window.scrollY > 0) window.scrollBy(0, anchor.getBoundingClientRect().top - before);
  };

  for (const r of sizes)
    r.addEventListener('change', () => {
      if (!r.checked) return;
      const size = Number(r.value) as SizeStep;
      steady(() => {
        prefs = { ...prefs, size };
        apply();
      });
      keep();
      say(`Text size: ${SIZE_LABELS[size]}.`);
      update();
    });
  low?.addEventListener('click', () => {
    prefs = { ...prefs, low: !prefs.low };
    apply();
    keep();
    say(prefs.low ? 'Low light on: the article is in ivory on navy.' : 'Low light off.');
  });
  box.querySelector<HTMLButtonElement>('[data-print]')?.addEventListener('click', () => window.print());

  /* ---------- Mark as complete ---------- */

  const doneBox = box.querySelector<HTMLElement>('[data-done-box]');
  const done = box.querySelector<HTMLButtonElement>('[data-complete]');
  const doneLink = box.querySelector<HTMLElement>('[data-complete-link]');
  const paintDone = () => {
    const on = isStudied(parseStudied(readItem(STUDIED_KEY)), code);
    done?.setAttribute('aria-pressed', String(on));
    if (doneLink) doneLink.hidden = !on;
  };
  if (!canStore || !code) {
    if (doneBox) doneBox.hidden = true;
  } else {
    done?.addEventListener('click', () => {
      const was = isStudied(parseStudied(readItem(STUDIED_KEY)), code);
      const next = setStudied(parseStudied(readItem(STUDIED_KEY)), code, !was, new Date());
      if (!writeItem(STUDIED_KEY, JSON.stringify(next))) {
        say('This browser would not keep it: its storage is full or blocked.');
        return;
      }
      paintDone();
      say(was ? `${title} is no longer marked as complete.` : `${title} is marked as complete. Your dashboard counts it.`);
    });
    paintDone();
  }

  /* ---------- Contents, progress and the section in view ---------- */

  const tocLists: HTMLElement[] = [];
  const nowEl = strip?.querySelector<HTMLElement>('[data-now]') ?? null;
  const jump = strip?.querySelector<HTMLDetailsElement>('[data-jump]') ?? null;
  const fills: HTMLElement[] = strip ? [...strip.querySelectorAll<HTMLElement>('[data-fill]')] : [];
  let readEl: HTMLElement | null = null;
  let entries: Entry[] = [];
  let made = 0;

  const header = document.querySelector<HTMLElement>('.site-header');
  /** Where reading starts: under the sticky header, and under the strip when it shows. */
  const readingLine = () => {
    const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const s = strip && strip.getClientRects().length ? strip.getBoundingClientRect().height : 0;
    return top + s;
  };

  const collect = (): Entry[] =>
    [...root.querySelectorAll<HTMLElement>('h2')]
      // Section headings only: not a heading inside an aside, a dialog or the study tools themselves.
      .filter((el) => !el.closest('.sm, .sm-strip, .sm-rail, aside, dialog, [hidden]') && el.getClientRects().length > 0)
      .map((el) => {
        if (!el.id) el.id = `sm-h-${++made}`;
        const section = el.closest<HTMLElement>('section[id]');
        // A section's own address is the better target, when this heading is the one it opens with.
        const target = section && section.querySelector('h2') === el ? section.id : el.id;
        const no = el.closest('.sec-head')?.querySelector('.sec-head__no')?.textContent?.trim() ?? '';
        return { heading: el, target, label: headingText(el), no };
      })
      .filter((e) => e.label);

  const listHtml = () =>
    entries.map((e, i) => `<li><a class="sm-toc__a" href="#${h(e.target)}" data-i="${i}">${e.no ? `<span class="sm-toc__no" aria-hidden="true">${h(e.no)}</span>` : ''}<span class="sm-toc__t">${h(e.label)}</span></a></li>`).join('');

  const build = () => {
    entries = collect();
    for (const ol of tocLists) ol.innerHTML = listHtml();
    if (strip) strip.hidden = entries.length === 0;
    update();
  };

  if (strip) {
    const ol = strip.querySelector<HTMLElement>('[data-toc]');
    if (ol) tocLists.push(ol);
  }
  if (box.dataset.rail === 'true' && strip) {
    const rail = document.createElement('nav');
    rail.className = 'sm-rail';
    const id = `${box.dataset.code ? `sm-${code.replace(/\W/g, '-')}` : 'sm'}-rail-h`;
    rail.setAttribute('aria-labelledby', id);
    rail.innerHTML = `<p class="sm-rail__h" id="${h(id)}">On this page</p><div class="sm-rail__read"><span class="sm-strip__bar" aria-hidden="true"><span class="sm-strip__fill" data-fill></span></span><span class="sm-rail__pct" data-read></span></div><ol class="sm-toc" data-toc></ol>`;
    strip.after(rail);
    root.classList.add('sm-has-rail');
    const ol = rail.querySelector<HTMLElement>('[data-toc]');
    if (ol) tocLists.push(ol);
    fills.push(...rail.querySelectorAll<HTMLElement>('[data-fill]'));
    readEl = rail.querySelector<HTMLElement>('[data-read]');
  }
  document.documentElement.classList.add('has-study-strip');

  let current = -1;
  let frame = 0;
  function update(): void {
    frame = 0;
    const line = readingLine();
    const rect = root!.getBoundingClientRect();
    const p = readingProgress(rect.top, rect.height, line, window.innerHeight);
    for (const f of fills) f.style.transform = `scaleX(${p.toFixed(4)})`;
    if (readEl) readEl.textContent = `${Math.round(p * 100)}% read`;
    if (!entries.length) return;
    const at = currentSection(
      entries.map((e) => e.heading.getBoundingClientRect().top),
      line,
    );
    if (at === current) return;
    current = at;
    for (const ol of tocLists)
      ol.querySelectorAll<HTMLAnchorElement>('a[data-i]').forEach((a) => {
        if (Number(a.dataset.i) === at) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    const e = entries[at];
    if (nowEl && e) nowEl.textContent = `${e.no ? `${e.no} ` : ''}${e.label}`;
    // A contents list the page has of its own (a brief's) marks the same section.
    document.querySelectorAll<HTMLAnchorElement>('.brief-toc a[href^="#"]').forEach((a) => {
      if (e && a.getAttribute('href') === `#${e.target}`) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  // A link in the contents: the browser moves to the section; focus follows it, so the keyboard carries on from there.
  root.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>('.sm-toc a[data-i]');
    if (!a) return;
    const e = entries[Number(a.dataset.i)];
    if (jump) jump.open = false;
    if (!e) return;
    window.setTimeout(() => {
      if (!e.heading.hasAttribute('tabindex')) e.heading.setAttribute('tabindex', '-1');
      e.heading.focus({ preventScroll: true });
      update();
    }, 0);
  });
  // Escape closes the jump menu and returns to its button.
  jump?.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !jump.open) return;
    jump.open = false;
    jump.querySelector<HTMLElement>('summary')?.focus();
  });

  // Choosing SL or HL hides or shows sections: the contents follow.
  new MutationObserver(build).observe(document.documentElement, { attributes: true, attributeFilter: ['data-level'] });

  // Another tab changed the size, the light or what is complete.
  window.addEventListener('storage', (ev) => {
    if (ev.key === STUDY_KEY || ev.key === null) {
      prefs = parseStudy(readItem(STUDY_KEY));
      apply();
    }
    if ((ev.key === STUDIED_KEY || ev.key === null) && canStore) paintDone();
  });

  apply();
  build();
});
