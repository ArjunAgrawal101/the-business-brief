/**
 * Scroll reveals. An element marked [data-reveal] arrives as it scrolls into
 * view, but only if it starts below the fold: nothing already on screen is
 * hidden, nothing is hidden without this script running, and nothing moves
 * under prefers-reduced-motion. [data-reveal="group"] reveals its children
 * one after another.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

function init(): void {
  if (reduce.matches || !('IntersectionObserver' in window)) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
  );
  const fold = window.innerHeight * 0.92;
  for (const el of els) {
    if (el.dataset.reveal === 'group') Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(Math.min(i, 8))));
    if (el.getBoundingClientRect().top < fold) continue;
    el.classList.add('is-pending');
    io.observe(el);
  }
  const showAll = () => els.forEach((el) => el.classList.add('is-in'));
  window.addEventListener('beforeprint', showAll);
  reduce.addEventListener('change', (m) => {
    if (m.matches) showAll();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
