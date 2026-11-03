/**
 * The marketing mix builder: the four Ps for a good, the seven Ps for a
 * service (4.5), and checks that the elements fit the target segment, the
 * chosen position and each other.
 *
 * Each P carries a few structured choices (the pricing method, the price
 * against rivals, the promotion line, the distribution channel and coverage,
 * the level of service) and a description in the reader's words. The checks
 * are rules applied to the structured choices. They follow the four tests in
 * the 4.5 notes (the target and position, consistency between the Ps, the
 * product's type, the business's resources); the rules themselves are the
 * platform's teaching method, not a list from the guide, and a flag is a
 * prompt to justify a choice, not a verdict.
 */
import { asObj, asOneOf, asStr, type Check } from './market-kit';

export const PRICE_METHODS = ['cost-plus', 'penetration', 'loss-leader', 'predatory', 'premium', 'dynamic', 'competitive', 'contribution'] as const;
export type PriceMethod = (typeof PRICE_METHODS)[number];
export const PRICE_METHOD_LABELS: Record<PriceMethod, { label: string; hl: boolean }> = {
  'cost-plus': { label: 'Cost-plus (mark-up) pricing', hl: false },
  penetration: { label: 'Penetration pricing', hl: false },
  'loss-leader': { label: 'Loss leader', hl: false },
  predatory: { label: 'Predatory pricing', hl: false },
  premium: { label: 'Premium pricing', hl: false },
  dynamic: { label: 'Dynamic pricing (HL)', hl: true },
  competitive: { label: 'Competitive pricing (HL)', hl: true },
  contribution: { label: 'Contribution pricing (HL)', hl: true },
};

export type Kind = 'good' | 'service';
export type Position = 'premium' | 'mid' | 'value';
export type Sensitivity = 'high' | 'medium' | 'low';
export type TargetSize = 'niche' | 'mass';
export type Quality = 'basic' | 'standard' | 'distinctive';
export type Range = 'single' | 'wide';
export type PriceLevel = 'below' | 'in-line' | 'above';
export type Line = 'above' | 'below' | 'through';
export type Channel = 'direct' | 'one' | 'two' | 'agent' | 'several';
export type Coverage = 'intensive' | 'selective' | 'exclusive';
export type ServiceLevel = 'self' | 'standard' | 'personal';
export type ProcessStyle = 'self' | 'assisted' | 'personal';
export type Evidence = 'basic' | 'functional' | 'designed';

export const OPTIONS = {
  kind: [
    { value: 'good', label: 'A good: four Ps' },
    { value: 'service', label: 'A service: seven Ps' },
  ],
  position: [
    { value: 'premium', label: 'Premium: high quality, high price' },
    { value: 'mid', label: 'Mid-market: good quality, fair price' },
    { value: 'value', label: 'Value: basic offer, low price' },
  ],
  sensitivity: [
    { value: 'high', label: 'High: they compare prices' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low: they pay for quality' },
  ],
  size: [
    { value: 'niche', label: 'Niche: a small, defined group' },
    { value: 'mass', label: 'Mass: most of the market' },
  ],
  quality: [
    { value: 'basic', label: 'Basic' },
    { value: 'standard', label: 'Standard, like rivals' },
    { value: 'distinctive', label: 'Distinctive' },
  ],
  range: [
    { value: 'single', label: 'A single product' },
    { value: 'wide', label: 'A wide range' },
  ],
  level: [
    { value: 'below', label: 'Below rivals’ prices' },
    { value: 'in-line', label: 'In line with rivals' },
    { value: 'above', label: 'Above rivals’ prices' },
  ],
  line: [
    { value: 'above', label: 'Above the line: mass media' },
    { value: 'below', label: 'Below the line: targeted' },
    { value: 'through', label: 'Through the line: both' },
  ],
  channel: [
    { value: 'direct', label: 'Direct to the customer' },
    { value: 'one', label: 'One intermediary: retailers' },
    { value: 'two', label: 'Two: wholesaler and retailer' },
    { value: 'agent', label: 'Through an agent' },
    { value: 'several', label: 'Several channels' },
  ],
  coverage: [
    { value: 'intensive', label: 'Intensive: almost everywhere' },
    { value: 'selective', label: 'Selective: chosen outlets' },
    { value: 'exclusive', label: 'Exclusive: one or a few' },
  ],
  service: [
    { value: 'self', label: 'Self-service' },
    { value: 'standard', label: 'Standard, friendly service' },
    { value: 'personal', label: 'Personal, expert service' },
  ],
  process: [
    { value: 'self', label: 'Digital self-service' },
    { value: 'assisted', label: 'Staff, helped by simple systems' },
    { value: 'personal', label: 'Fully personal' },
  ],
  evidence: [
    { value: 'basic', label: 'Basic and functional' },
    { value: 'functional', label: 'Considered for the task' },
    { value: 'designed', label: 'Designed to signal the brand' },
  ],
} as const;

export interface MixState {
  business: string;
  offer: string;
  kind: Kind;
  target: { name: string; sensitivity: Sensitivity; size: TargetSize };
  position: Position;
  product: { quality: Quality; range: Range; text: string };
  price: { method: PriceMethod; level: PriceLevel; text: string };
  promotion: { line: Line; text: string };
  place: { channel: Channel; coverage: Coverage; text: string };
  people: { service: ServiceLevel; text: string };
  processes: { style: ProcessStyle; text: string };
  physical: { standard: Evidence; text: string };
}

export const ELEMENTS = ['product', 'price', 'promotion', 'place', 'people', 'processes', 'physical'] as const;
export type Element = (typeof ELEMENTS)[number];
export const ELEMENT_LABELS: Record<Element | 'target' | 'position', string> = {
  product: 'Product',
  price: 'Price',
  promotion: 'Promotion',
  place: 'Place',
  people: 'People',
  processes: 'Processes',
  physical: 'Physical evidence',
  target: 'Target segment',
  position: 'Position',
};

/** The Ps in use: four for a good, seven for a service. */
export function elementsFor(kind: Kind): Element[] {
  return kind === 'service' ? [...ELEMENTS] : ['product', 'price', 'promotion', 'place'];
}

export interface MixCheck extends Check {
  /** The elements the check is between; one of them may be the target or the position. */
  between: Array<Element | 'target' | 'position'>;
}

export function mixChecks(s: MixState): MixCheck[] {
  const out: MixCheck[] = [];
  const add = (level: Check['level'], between: MixCheck['between'], text: string) => out.push({ level, between, text, about: between.map((b) => ELEMENT_LABELS[b]).join(' and ') });
  const { position: pos, price, product, promotion, place, people, processes, physical, target } = s;
  const service = s.kind === 'service';

  // Price against the position.
  if (pos === 'premium' && price.level === 'below') add('conflict', ['price', 'position'], 'A premium position needs a price at or above rivals’; a lower price tells customers the product is ordinary.');
  else if (pos === 'premium' && price.level === 'above') add('fit', ['price', 'position'], 'A price above rivals’ signals the premium position.');
  if (pos === 'value' && price.level === 'above') add('conflict', ['price', 'position'], 'A value position promises low prices; charging more than rivals breaks the promise.');
  else if (pos === 'value' && price.level === 'below') add('fit', ['price', 'position'], 'A price below rivals’ delivers the value position.');
  if (pos === 'mid' && price.level === 'above') add('tension', ['price', 'position'], 'A price above rivals’ strains a position built on good quality at a fair price.');
  else if (pos === 'mid') add('fit', ['price', 'position'], 'A price at or below rivals’ supports good quality at a fair price.');

  // Product against the position and the price.
  if (pos === 'premium' && product.quality !== 'distinctive') add(product.quality === 'basic' ? 'conflict' : 'tension', ['product', 'position'], 'A premium position needs a distinctive, high-quality product that justifies the price.');
  else if (pos === 'premium') add('fit', ['product', 'position'], 'A distinctive product supports the premium position.');
  if (pos === 'value' && product.quality === 'distinctive') add('tension', ['product', 'position'], 'A distinctive product sold at value prices squeezes the margin: check the costs.');
  if (pos !== 'premium' && product.quality === 'distinctive' && price.level === 'below') add('tension', ['product', 'price'], 'A distinctive product priced below rivals may give away margin customers would pay; check costs and watch whether sales bring in enough revenue.');

  // The pricing method against the price level and the product range.
  if (price.method === 'premium' && price.level !== 'above') add('conflict', ['price'], 'Premium pricing means setting the price above rivals’, but the price is not above them.');
  if (price.method === 'penetration' && price.level === 'above') add('conflict', ['price'], 'Penetration pricing means a low price to win customers, but the price is above rivals’.');
  if (price.method === 'predatory') add('conflict', ['price'], 'Predatory pricing aims to drive rivals out of the market. It is illegal in many countries and widely seen as unethical.');
  if (price.method === 'loss-leader' && product.range === 'single') add('conflict', ['price', 'product'], 'A loss leader works only when customers buy other, profitable products, and this is a single product.');
  else if (price.method === 'loss-leader') add('note', ['price', 'product'], 'A loss leader loses money on each sale unless customers buy enough else: check what they add to the basket.');
  if (price.method === 'cost-plus' && pos === 'premium') add('note', ['price', 'position'], 'Cost-plus pricing ignores what customers would pay; check the result against rivals and the premium position.');
  if (PRICE_METHOD_LABELS[price.method].hl) add('note', ['price'], `${PRICE_METHOD_LABELS[price.method].label.replace(' (HL)', '')} is an HL pricing method in the guide.`);

  // Price against the target's sensitivity to price.
  if (target.sensitivity === 'high' && price.level === 'above') add('conflict', ['price', 'target'], 'Customers who are sensitive to price are unlikely to pay more than rivals charge.');
  else if (target.sensitivity === 'high') add('fit', ['price', 'target'], 'A price at or below rivals’ suits customers who compare prices.');
  if (target.sensitivity === 'low' && (price.level === 'below' || price.method === 'penetration')) add('tension', ['price', 'target'], 'Customers who are not sensitive to price may pay more: a low price may give margin away.');

  // Promotion against the target.
  if (target.size === 'niche' && promotion.line === 'above') add('tension', ['promotion', 'target'], 'Mass media reach many people outside a niche, so each target customer costs more to reach.');
  else if (target.size === 'niche' && promotion.line === 'below') add('fit', ['promotion', 'target'], 'Targeted, below the line methods reach a niche without paying for people outside it.');
  if (target.size === 'mass' && promotion.line === 'below') add('tension', ['promotion', 'target'], 'Below the line methods alone may not build awareness across a mass market.');
  else if (target.size === 'mass') add('fit', ['promotion', 'target'], 'Mass media help build awareness across a mass market.');

  // Place against the position, the target and the product.
  if (pos === 'premium' && place.coverage === 'intensive') add('tension', ['place', 'position'], 'Selling almost everywhere, discount outlets included, can cheapen a premium image.');
  else if (pos === 'premium') add('fit', ['place', 'position'], 'Selective or exclusive distribution protects a premium image.');
  if (pos === 'premium' && place.channel === 'two') add('tension', ['place', 'position'], 'A long chain of intermediaries gives the business little control over how a premium product is presented.');
  if (target.size === 'mass' && place.coverage === 'exclusive') add('tension', ['place', 'target'], 'One or a few outlets cannot reach a mass market.');
  else if (target.size === 'mass' && place.coverage === 'intensive') add('fit', ['place', 'target'], 'Wide distribution puts the product where a mass market shops.');
  if (target.size === 'niche' && place.coverage !== 'intensive') add('fit', ['place', 'target'], 'Distribution through chosen outlets suits a defined niche.');

  // The service Ps.
  if (service) {
    const missing = (['people', 'processes', 'physical'] as const).filter((k) => !s[k].text.trim());
    if (missing.length) add('conflict', missing, `A service needs all seven Ps: describe ${missing.map((k) => ELEMENT_LABELS[k].toLowerCase()).join(', ')}.`);
    if (pos === 'premium' && people.service === 'self') add('tension', ['people', 'position'], 'Customers paying a premium usually expect personal attention from staff.');
    if (pos === 'value' && people.service === 'personal') add('tension', ['people', 'position'], 'Personal, expert service is costly to provide at value prices.');
    if (pos !== 'value' && people.service === 'personal') add('fit', ['people', 'position'], 'Personal service from knowledgeable staff supports the position.');
    if (pos === 'premium' && processes.style === 'self') add('tension', ['processes', 'position'], 'Fully self-service processes can feel impersonal for a premium service.');
    if (pos === 'value' && processes.style === 'personal') add('tension', ['processes', 'position'], 'Fully personal processes raise costs that value prices may not cover.');
    if (pos === 'premium' && physical.standard === 'basic') add('tension', ['physical', 'position'], 'Basic premises and materials undermine a premium price: physical evidence is how customers judge a service before they buy.');
    else if (pos === 'premium' && physical.standard === 'designed') add('fit', ['physical', 'position'], 'Designed premises and materials signal the premium position.');
    if (pos === 'value' && physical.standard === 'designed') add('tension', ['physical', 'position'], 'A designed look and feel costs money that value prices may not cover.');
    if (pos === 'mid' && physical.standard !== 'basic') add('fit', ['physical', 'position'], 'Premises designed around the customer’s needs support good quality at a fair price.');
  }
  return out;
}

export type Status = 'conflict' | 'tension' | 'fit' | 'none';

/** For one element, the most serious result of the checks between it and the target, the position, and the other Ps. */
export function elementStatus(checks: MixCheck[], el: Element): Record<'target' | 'position' | 'ps', Status> {
  const worst = (cs: MixCheck[]): Status => (cs.some((c) => c.level === 'conflict') ? 'conflict' : cs.some((c) => c.level === 'tension') ? 'tension' : cs.some((c) => c.level === 'fit') ? 'fit' : 'none');
  const mine = checks.filter((c) => c.between.includes(el) && c.level !== 'note');
  return {
    target: worst(mine.filter((c) => c.between.includes('target'))),
    position: worst(mine.filter((c) => c.between.includes('position'))),
    ps: worst(mine.filter((c) => !c.between.includes('target') && !c.between.includes('position'))),
  };
}

export const STATUS_WORDS: Record<Status, string> = { conflict: 'Problem', tension: 'Check', fit: 'Consistent', none: 'No check' };

/** A short description of an element's structured choices, for the table and the summary. */
export function choiceText(s: MixState, el: Element): string {
  const label = <K extends keyof typeof OPTIONS>(k: K, v: string) => (OPTIONS[k] as ReadonlyArray<{ value: string; label: string }>).find((o) => o.value === v)?.label ?? v;
  switch (el) {
    case 'product':
      return `${label('quality', s.product.quality)}; ${label('range', s.product.range).toLowerCase()}`;
    case 'price':
      return `${PRICE_METHOD_LABELS[s.price.method].label}; ${label('level', s.price.level).toLowerCase()}`;
    case 'promotion':
      return label('line', s.promotion.line);
    case 'place':
      return `${label('channel', s.place.channel)}; ${label('coverage', s.place.coverage).toLowerCase()}`;
    case 'people':
      return label('service', s.people.service);
    case 'processes':
      return label('process', s.processes.style);
    case 'physical':
      return label('evidence', s.physical.standard);
  }
}

export function normalizeMix(raw: unknown, f: MixState): MixState | null {
  const o = asObj(raw);
  if (!o) return null;
  const sub = (k: string) => asObj(o[k]) ?? {};
  const t = sub('target');
  const pr = sub('product');
  const pc = sub('price');
  const pm = sub('promotion');
  const pl = sub('place');
  const pe = sub('people');
  const ps = sub('processes');
  const ph = sub('physical');
  return {
    business: asStr(o.business, f.business, 80),
    offer: asStr(o.offer, f.offer, 160),
    kind: asOneOf(o.kind, ['good', 'service'] as const, f.kind),
    target: { name: asStr(t.name, f.target.name, 120), sensitivity: asOneOf(t.sensitivity, ['high', 'medium', 'low'] as const, f.target.sensitivity), size: asOneOf(t.size, ['niche', 'mass'] as const, f.target.size) },
    position: asOneOf(o.position, ['premium', 'mid', 'value'] as const, f.position),
    product: { quality: asOneOf(pr.quality, ['basic', 'standard', 'distinctive'] as const, f.product.quality), range: asOneOf(pr.range, ['single', 'wide'] as const, f.product.range), text: asStr(pr.text, '', 600) },
    price: { method: asOneOf(pc.method, PRICE_METHODS, f.price.method), level: asOneOf(pc.level, ['below', 'in-line', 'above'] as const, f.price.level), text: asStr(pc.text, '', 600) },
    promotion: { line: asOneOf(pm.line, ['above', 'below', 'through'] as const, f.promotion.line), text: asStr(pm.text, '', 600) },
    place: { channel: asOneOf(pl.channel, ['direct', 'one', 'two', 'agent', 'several'] as const, f.place.channel), coverage: asOneOf(pl.coverage, ['intensive', 'selective', 'exclusive'] as const, f.place.coverage), text: asStr(pl.text, '', 600) },
    people: { service: asOneOf(pe.service, ['self', 'standard', 'personal'] as const, f.people.service), text: asStr(pe.text, '', 600) },
    processes: { style: asOneOf(ps.style, ['self', 'assisted', 'personal'] as const, f.processes.style), text: asStr(ps.text, '', 600) },
    physical: { standard: asOneOf(ph.standard, ['basic', 'functional', 'designed'] as const, f.physical.standard), text: asStr(ph.text, '', 600) },
  };
}

export function mixCsvRows(s: MixState): Array<Array<string>> {
  const checks = mixChecks(s);
  return [
    ['Element', 'Choices', 'Description', 'With the target', 'With the position', 'With the other Ps'],
    ...elementsFor(s.kind).map((el) => {
      const st = elementStatus(checks, el);
      return [ELEMENT_LABELS[el], choiceText(s, el), s[el].text, STATUS_WORDS[st.target], STATUS_WORDS[st.position], STATUS_WORDS[st.ps]];
    }),
    [],
    ['Check', 'Between', 'Detail'],
    ...checks.map((c) => [c.level, c.about ?? '', c.text]),
  ];
}

export function mixSummary(s: MixState): string {
  const checks = mixChecks(s);
  const n = (l: Check['level']) => checks.filter((c) => c.level === l).length;
  return [
    `Marketing mix: ${s.business}, ${s.offer}`,
    `${s.kind === 'service' ? 'A service: seven Ps' : 'A good: four Ps'}. Target: ${s.target.name}. Position: ${OPTIONS.position.find((p) => p.value === s.position)?.label ?? s.position}.`,
    ...elementsFor(s.kind).map((el) => `${ELEMENT_LABELS[el]}: ${choiceText(s, el)}. ${s[el].text}`.trim()),
    `Checks: ${n('conflict')} problems, ${n('tension')} to check, ${n('fit')} consistent links.`,
    ...checks.filter((c) => c.level === 'conflict' || c.level === 'tension').map((c) => `${c.level === 'conflict' ? 'Problem' : 'Check'} (${c.about}): ${c.text}`),
  ].join('\n');
}
