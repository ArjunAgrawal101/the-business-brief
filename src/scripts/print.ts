/**
 * Printing: open every disclosure in the main content before printing, so that
 * answers, mark schemes and workings appear on paper, and restore them after.
 */
const opened: HTMLDetailsElement[] = [];
window.addEventListener('beforeprint', () => {
  document.querySelectorAll<HTMLDetailsElement>('main details:not([open])').forEach((d) => {
    d.open = true;
    opened.push(d);
  });
});
window.addEventListener('afterprint', () => {
  opened.splice(0).forEach((d) => (d.open = false));
});
