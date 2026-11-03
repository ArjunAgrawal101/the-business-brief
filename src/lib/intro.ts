/**
 * When the opening plays.
 *
 * It plays every time the site is freshly opened: a new tab or window, a new
 * browser, a link or search result from another site, a bookmark, a typed
 * address or a reload. It never plays when the reader moves between the
 * site's own pages, when they come back with the Back or Forward button, or
 * under automation (so test runs and crawlers see the page). Nothing about
 * earlier visits is stored or read: no cookies, no localStorage.
 *
 * Under reduced motion it becomes a still title card that fades, with no
 * movement. `?intro` in the address forces it (the footer's replay link).
 *
 * The rule is kept as source text so the page head can run it before the
 * first paint, and the unit tests run exactly the same text.
 */
export type IntroMode = 'full' | 'still' | 'none';

export interface IntroInput {
  /** ?intro in the address. */
  forced: boolean;
  /** navigator.webdriver: a browser under automation. */
  automated: boolean;
  /** PerformanceNavigationTiming.type: navigate, reload, back_forward or prerender. */
  navType: string;
  /** The referrer is a page of this site. */
  sameOrigin: boolean;
  /** prefers-reduced-motion: reduce. */
  reduced: boolean;
}

export const INTRO_RULE = `function (e) {
  if (e.forced) return e.reduced ? 'still' : 'full';
  if (e.automated) return 'none';
  if (e.navType === 'back_forward' || e.navType === 'prerender') return 'none';
  if (e.navType !== 'reload' && e.sameOrigin) return 'none';
  return e.reduced ? 'still' : 'full';
}`;

/** The head script: decides before the first paint and marks the document. */
export const INTRO_GATE = `(function () {
  try {
    var rule = ${INTRO_RULE};
    var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var navType = nav && nav.type ? nav.type : 'navigate';
    var same = false;
    try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (x) {}
    var mode = rule({
      forced: /[?&]intro\\b/.test(location.search),
      automated: navigator.webdriver === true,
      navType: navType,
      sameOrigin: same,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });
    if (mode === 'none') return;
    var root = document.documentElement;
    root.classList.add('cx-on', 'cx-' + mode, 'intro-hold');
    // If the opening never mounts (its script blocked or broken), the page is released at once.
    setTimeout(function () {
      if (!document.querySelector('.cx')) root.classList.remove('cx-on', 'cx-full', 'cx-still', 'intro-hold');
    }, 1500);
  } catch (x) {}
})();`;

/** For tests and type-checked callers: the same rule as a function. */
export function introMode(input: IntroInput): IntroMode {
  const rule = new Function(`return ${INTRO_RULE}`)() as (e: IntroInput) => IntroMode;
  return rule(input);
}
