/**
 * The tutorials enquiry builder: the reader's choices (pathway, year, SL or
 * HL, topics, preferred arrangement) are written into the enquiry email's
 * template, using the same function as every enquiry link on the page, so the
 * "Open the email" link always carries them. Nothing is stored and nothing is
 * sent by this site: the email opens in the reader's own mail app.
 */
import { announce, each } from './ix';
import { TUTOR, enquiryMailto } from '../lib/tutorials';

each('[data-ix="tutorials"]', (root) => {
  const form = root.querySelector<HTMLFormElement>('form');
  if (!form) return;
  const compose = form.querySelector<HTMLAnchorElement>('[data-compose]');
  const status = form.querySelector<HTMLElement>('[data-status]');
  if (!compose) return;

  const update = () => {
    const data = new FormData(form);
    const pathway = String(data.get('pathway') ?? '');
    const topics = data.getAll('topics').map(String).join(', ');
    compose.href = enquiryMailto(pathway === 'Not sure yet' ? undefined : pathway, {
      level: String(data.get('level') ?? ''),
      option: String(data.get('option') ?? ''),
      topics,
      arrangement: String(data.get('arrangement') ?? '').trim(),
    });
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();

  form.querySelector<HTMLButtonElement>('[data-copy-email]')?.addEventListener('click', async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(TUTOR.email);
        ok = true;
      }
    } catch {
      ok = false;
    }
    announce(status, ok ? `Copied: ${TUTOR.email}` : `The address is ${TUTOR.email}`);
  });
});
