import { describe, expect, it } from 'vitest';
import { INTRO_GATE, introMode, type IntroInput } from '../../src/lib/intro';

const base: IntroInput = { forced: false, automated: false, navType: 'navigate', sameOrigin: false, reduced: false, home: true };
const mode = (over: Partial<IntroInput>) => introMode({ ...base, ...over });

describe('when the opening plays', () => {
  it('plays when the home page is freshly opened: typed address, bookmark, new tab or a link from another site', () => {
    expect(mode({})).toBe('full');
  });

  it('plays again on every fresh entry to the home page, whatever happened before (nothing is stored)', () => {
    expect(mode({})).toBe('full');
    expect(mode({})).toBe('full');
  });

  it('never plays on any other page, so a reader arriving at a topic from a search result goes straight to it', () => {
    expect(mode({ home: false })).toBe('none');
    expect(mode({ home: false, reduced: true })).toBe('none');
  });

  it('does not play on a reload', () => {
    expect(mode({ navType: 'reload' })).toBe('none');
    expect(mode({ navType: 'reload', sameOrigin: true })).toBe('none');
  });

  it("does not play when moving between the site's own pages", () => {
    expect(mode({ sameOrigin: true })).toBe('none');
  });

  it('does not play on Back or Forward, or for a prerendered page', () => {
    expect(mode({ navType: 'back_forward' })).toBe('none');
    expect(mode({ navType: 'prerender' })).toBe('none');
  });

  it('becomes a still title card under reduced motion', () => {
    expect(mode({ reduced: true })).toBe('still');
    expect(mode({ reduced: true, sameOrigin: true })).toBe('none');
  });

  it('stays out of the way of automation unless forced', () => {
    expect(mode({ automated: true })).toBe('none');
    expect(mode({ automated: true, forced: true })).toBe('full');
  });

  it('?intro forces it on any page, as a still card under reduced motion', () => {
    expect(mode({ forced: true, sameOrigin: true })).toBe('full');
    expect(mode({ forced: true, home: false })).toBe('full');
    expect(mode({ forced: true, reduced: true })).toBe('still');
  });

  it('the head script never reads cookies or storage', () => {
    expect(INTRO_GATE).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});
