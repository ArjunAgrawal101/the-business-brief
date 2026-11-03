/** The marketing mix builder in the browser: the four or seven Ps, the rules re-run on every change, saving and export. */
import { mixChecks, mixCsvRows, mixSummary, normalizeMix, type MixState } from '../../lib/market-mix';
import { consistencyRowsHtml, mixTallyHtml } from '../../lib/market-mix-view';
import { checksHtml, checksTally } from '../../lib/market-view';
import { announce, each, readConfig } from '../ix';
import { fieldValue, fill, mountKit } from './kit';

interface Config {
  uid: string;
  slug: string;
  defaults: MixState;
}

each('[data-ix="mix"]', (root) => {
  const cfg = readConfig<Config>(root);
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form) return;
  let timer = 0;
  const v = (f: string) => fieldValue(form, f);
  const d = cfg.defaults;

  // The structured choices come from selects whose options are fixed, so normalizing the read state keeps types honest.
  const read = (): MixState =>
    normalizeMix(
      {
        business: v('business'),
        offer: v('offer'),
        kind: v('kind'),
        target: { name: v('target-name'), sensitivity: v('target-sensitivity'), size: v('target-size') },
        position: v('position'),
        product: { quality: v('product-quality'), range: v('product-range'), text: v('product-text') },
        price: { method: v('price-method'), level: v('price-level'), text: v('price-text') },
        promotion: { line: v('promotion-line'), text: v('promotion-text') },
        place: { channel: v('place-channel'), coverage: v('place-coverage'), text: v('place-text') },
        people: { service: v('people-service'), text: v('people-text') },
        processes: { style: v('processes-style'), text: v('processes-text') },
        physical: { standard: v('physical-standard'), text: v('physical-text') },
      },
      d,
    ) ?? d;

  const render = (s: MixState) => {
    const service = s.kind === 'service';
    root.querySelectorAll<HTMLElement>('[data-service-only]').forEach((el) => (el.hidden = !service));
    const count = root.querySelector<HTMLElement>('[data-ps-count]');
    if (count) count.textContent = service ? 'Seven, for a service' : 'Four, for a good';
    fill(root, '[data-tally]', mixTallyHtml(s));
    fill(root, '[data-table]', consistencyRowsHtml(s));
    fill(root, '[data-checks]', checksHtml(mixChecks(s)));
  };

  const apply = (s: MixState) => {
    const set = (f: string, value: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-f="${f}"]`);
      if (el) el.value = value;
    };
    set('business', s.business);
    set('offer', s.offer);
    set('kind', s.kind);
    set('position', s.position);
    set('target-name', s.target.name);
    set('target-sensitivity', s.target.sensitivity);
    set('target-size', s.target.size);
    set('product-quality', s.product.quality);
    set('product-range', s.product.range);
    set('product-text', s.product.text);
    set('price-method', s.price.method);
    set('price-level', s.price.level);
    set('price-text', s.price.text);
    set('promotion-line', s.promotion.line);
    set('promotion-text', s.promotion.text);
    set('place-channel', s.place.channel);
    set('place-coverage', s.place.coverage);
    set('place-text', s.place.text);
    set('people-service', s.people.service);
    set('people-text', s.people.text);
    set('processes-style', s.processes.style);
    set('processes-text', s.processes.text);
    set('physical-standard', s.physical.standard);
    set('physical-text', s.physical.text);
    render(s);
  };

  const kit = mountKit<MixState>({ root, slug: cfg.slug, name: 'Marketing mix', defaults: d, normalize: normalizeMix, read, apply, csv: mixCsvRows, text: mixSummary });

  const onEdit = (e: Event) => {
    const isSelect = (e.target as HTMLElement).matches('select');
    window.clearTimeout(timer);
    timer = window.setTimeout(
      () => {
        const s = read();
        render(s);
        announce(status, `Checks: ${checksTally(mixChecks(s))}.`);
      },
      isSelect ? 0 : 300,
    );
    kit.changed();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', (e) => e.preventDefault());
});
