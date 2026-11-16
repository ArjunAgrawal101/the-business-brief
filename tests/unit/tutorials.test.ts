/**
 * The tutoring terms are exactly those of the live Economics Tutorials page
 * (read on 16 November 2026), and every enquiry email goes to the real
 * address with the owner's subject line and a template asking for the year,
 * SL or HL, the school, the topics and the preferred arrangement.
 */
import { describe, expect, it } from 'vitest';
import { ENQUIRY_SUBJECT, GROUP_DISCOUNT, PATHWAYS, PRICE_LINE, SESSION, TUTOR, enquiryMailto } from '../../src/lib/tutorials';

const decode = (href: string) => {
  const [addr, query] = href.replace(/^mailto:/, '').split('?');
  const params = new URLSearchParams(query);
  return { addr, subject: params.get('subject') ?? '', body: params.get('body') ?? '' };
};

describe('the tutoring terms', () => {
  it('are the five pathways at the Economics prices, in order', () => {
    expect(PATHWAYS.map((p) => [p.key, p.price, p.unit])).toEqual([
      ['regular', 20, 'per session'],
      ['ia', 100, 'for the package'],
      ['ee', 150, 'for the support'],
      ['marathon', 300, 'for the package'],
      ['exam', 200, 'for the package'],
    ]);
  });

  it('give the session counts and lengths exactly', () => {
    const by = Object.fromEntries(PATHWAYS.map((p) => [p.key, p]));
    expect([by.regular!.sessions, by.regular!.length]).toEqual(['1 session', '1 hour']);
    expect([by.ia!.sessions, by.ia!.length]).toEqual(['6 sessions', '1 hour each']);
    expect([by.ee!.sessions, by.ee!.length]).toEqual(['Agreed at enquiry', '']);
    expect([by.marathon!.sessions, by.marathon!.length]).toEqual(['20 sessions', '1 hour each']);
    expect([by.exam!.sessions, by.exam!.length]).toEqual(['12 sessions', '1 hour each']);
    expect(SESSION).toMatchObject({ price: 20, currency: 'US$', length: '1 hour', minutes: 60 });
  });

  it('never describe a session as longer than an hour, promise a result or price a group', () => {
    const text = JSON.stringify(PATHWAYS) + GROUP_DISCOUNT + PRICE_LINE;
    expect(text).not.toMatch(/90[- ]?min|ninety|two-hour|2-hour|90 minutes/i);
    expect(text).not.toMatch(/guarantee|guaranteed|100%|best tutor|limited (seats|places|slots)|hurry/i);
    expect(GROUP_DISCOUNT).not.toMatch(/\d/);
  });

  it('keep the IA and the EE as guidance, never ghostwriting', () => {
    const ia = PATHWAYS.find((p) => p.key === 'ia')!;
    const ee = PATHWAYS.find((p) => p.key === 'ee')!;
    expect(ia.expect).toMatch(/entirely your own/);
    expect(ia.expect).toMatch(/I do not write any part of it/);
    expect(ee.expect).toMatch(/not ghostwriting/);
  });
});

describe('the enquiry email', () => {
  it('goes to the real address with the owner’s subject line', () => {
    const m = decode(enquiryMailto());
    expect(m.addr).toBe('arjun1agr@gmail.com');
    expect(TUTOR.email).toBe('arjun1agr@gmail.com');
    expect(m.subject).toBe('IB DP Business Management Tutorials Enquiry');
    expect(ENQUIRY_SUBJECT).toBe('IB DP Business Management Tutorials Enquiry');
  });

  it('names the pathway after the subject line when one is chosen', () => {
    expect(decode(enquiryMailto('IA support')).subject).toBe('IB DP Business Management Tutorials Enquiry: IA support');
  });

  it('asks for the year, SL or HL, the school, the topics and the arrangement, and carries what the reader chose', () => {
    const blank = decode(enquiryMailto()).body;
    for (const ask of ['Year or level', 'SL or HL', 'School', 'Topics or papers', 'Preferred session arrangement']) expect(blank).toContain(ask);
    const filled = decode(enquiryMailto('Exam Practice', { level: 'DP2', option: 'HL', topics: 'Paper 1, Paper 3', arrangement: 'Weekends & evenings' })).body;
    expect(filled).toContain('SL or HL: HL');
    expect(filled).toContain('Topics or papers I would like help with: Paper 1, Paper 3');
    expect(filled).toContain('Weekends & evenings');
  });

  it('is encoded so that an ampersand or line break cannot break the link', () => {
    const href = enquiryMailto('A & B');
    expect(href).not.toMatch(/\s/);
    // One separator between subject and body: the "&" in "A & B" is encoded.
    expect(href.split('&')).toHaveLength(2);
    expect(decode(href).subject).toBe('IB DP Business Management Tutorials Enquiry: A & B');
  });
});
