/**
 * The customer persona creator. A persona is a portrait of one typical
 * customer in a target segment: who they are, what they need, what gets in
 * their way and where they can be reached. Personas are a practitioners' tool
 * and are not named in the IB guide (enrichment); they help apply targeting
 * (4.2) and market research (4.4). The checks warn when a persona rests on
 * assumption rather than evidence, because a persona nobody has tested is a
 * stereotype with a name.
 */
import { asList, asLines, asObj, asOneOf, asStr, type Check } from './market-kit';

export type Use = 'high' | 'medium' | 'low';
export const USE_LABELS: Record<Use, string> = { high: 'Uses it a lot', medium: 'Uses it sometimes', low: 'Rarely uses it' };
export type Basis = 'research' | 'mixed' | 'assumption';
export const BASIS_LABELS: Record<Basis, string> = {
  research: 'Built from research with real customers',
  mixed: 'Partly research, partly assumption',
  assumption: 'Assumptions not yet tested',
};

export interface PersonaChannel {
  name: string;
  use: Use;
  note: string;
}

export interface PersonaState {
  business: string;
  name: string;
  age: string;
  occupation: string;
  location: string;
  segment: string;
  quote: string;
  background: string;
  needs: string[];
  pains: string[];
  behaviour: string[];
  channels: PersonaChannel[];
  objections: string[];
  winners: string[];
  basis: Basis;
  evidence: string;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function personaChecks(p: PersonaState): Check[] {
  const out: Check[] = [];
  const add = (level: Check['level'], about: string, text: string) => out.push({ level, about, text });
  if (!p.name.trim()) add('conflict', 'Name', 'Give the persona a name, so the team can talk about them as a person.');
  if (!p.segment.trim()) add('tension', 'Segment', 'Tie the persona to a target segment, for example one chosen in the STP planner.');
  if (p.needs.length < 2) add('tension', 'Needs', 'List at least two needs or goals: they are what the product must deliver.');
  if (p.pains.length < 2) add('tension', 'Pains', 'List at least two pains: frustrations with what they use now are where a business can win them.');
  if (!p.channels.length) add('conflict', 'Channels', 'Add the channels where this customer can be reached.');
  else if (!p.channels.some((c) => c.use === 'high')) add('tension', 'Channels', 'No channel is used a lot: a campaign needs at least one place this customer reliably sees.');
  if (p.quote.trim() && words(p.quote) > 35) add('note', 'Quote', 'Keep the quote short: one sentence the team will remember.');
  if (p.basis === 'assumption') add('tension', 'Evidence', 'Built on assumptions: test it with interviews or a survey before it guides decisions.');
  if (p.basis !== 'assumption' && !p.evidence.trim()) add('conflict', 'Evidence', 'Say what research the persona is built from.');
  if (p.basis === 'research' && p.evidence.trim()) add('fit', 'Evidence', 'Built from research, so the persona describes customers the business has actually met.');
  if (p.winners.length && p.pains.length) add('fit', 'Offer', 'What would win them is set against their pains, which is how a persona feeds the message.');
  add('note', 'Limits', 'A persona describes a typical customer, not every customer: check decisions against the segment’s data too.');
  return out;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}` : (parts[0]?.slice(0, 2) ?? '')).toUpperCase() || '?';
}

export function normalizePersona(raw: unknown, f: PersonaState): PersonaState | null {
  const o = asObj(raw);
  if (!o) return null;
  return {
    business: asStr(o.business, f.business, 80),
    name: asStr(o.name, '', 60),
    age: asStr(o.age, '', 30),
    occupation: asStr(o.occupation, '', 120),
    location: asStr(o.location, '', 120),
    segment: asStr(o.segment, '', 120),
    quote: asStr(o.quote, '', 300),
    background: asStr(o.background, '', 800),
    needs: asLines(o.needs, 8),
    pains: asLines(o.pains, 8),
    behaviour: asLines(o.behaviour, 8),
    channels: asList(o.channels, (x) => {
      const c = asObj(x);
      if (!c) return null;
      const name = asStr(c.name, '', 60).trim();
      return name ? { name, use: asOneOf(c.use, ['high', 'medium', 'low'] as const, 'medium'), note: asStr(c.note, '', 160) } : null;
    }, 10),
    objections: asLines(o.objections, 6),
    winners: asLines(o.winners, 6),
    basis: asOneOf(o.basis, ['research', 'mixed', 'assumption'] as const, f.basis),
    evidence: asStr(o.evidence, '', 400),
  };
}

/** The persona as Markdown, for the text download and the copy button. */
export function personaMarkdown(p: PersonaState): string {
  const list = (title: string, items: string[]) => (items.length ? [`## ${title}`, ...items.map((i) => `- ${i}`), ''] : []);
  return [
    `# ${p.name || 'Unnamed persona'}`,
    [p.age, p.occupation, p.location].filter((x) => x.trim()).join(' · '),
    '',
    p.segment ? `Segment: ${p.segment}` : '',
    p.quote ? `> ${p.quote}` : '',
    '',
    p.background,
    '',
    ...list('Needs and goals', p.needs),
    ...list('Pains and frustrations', p.pains),
    ...list('How they buy', p.behaviour),
    ...(p.channels.length ? ['## Where to reach them', ...p.channels.map((c) => `- ${c.name}: ${USE_LABELS[c.use].toLowerCase()}${c.note ? ` (${c.note})` : ''}`), ''] : []),
    ...list('What might stop them', p.objections),
    ...list('What would win them', p.winners),
    `Basis: ${BASIS_LABELS[p.basis]}. ${p.evidence}`,
    `Persona for ${p.business}. Made with the Market Studio, The Business Brief.`,
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim();
}

export function personaCsvRows(p: PersonaState): Array<Array<string>> {
  return [
    ['Field', 'Value'],
    ['Name', p.name],
    ['Age', p.age],
    ['Occupation', p.occupation],
    ['Location', p.location],
    ['Segment', p.segment],
    ['Quote', p.quote],
    ['Background', p.background],
    ...p.needs.map((x) => ['Need', x]),
    ...p.pains.map((x) => ['Pain', x]),
    ...p.behaviour.map((x) => ['How they buy', x]),
    ...p.channels.map((c) => ['Channel', `${c.name}: ${USE_LABELS[c.use]}${c.note ? ` (${c.note})` : ''}`]),
    ...p.objections.map((x) => ['What might stop them', x]),
    ...p.winners.map((x) => ['What would win them', x]),
    ['Basis', BASIS_LABELS[p.basis]],
    ['Evidence', p.evidence],
  ];
}

/** Lines typed into a textarea, one item per line. */
export function splitLines(text: string, max = 8): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);
}
