/**
 * The Market Studio's content: every instrument is listed, lives at its
 * address, quotes the guide's statements exactly, and its worked example
 * passes its own checks; the worked examples agree with each other.
 */
import { describe, expect, it } from 'vitest';
import { checkMarketTools } from '../../src/lib/integrity-market';
import { MARKET_TOOLS } from '../../src/lib/market-tools';
import { loadCorpus } from './helpers/corpus';
import type { Interactive } from '../../src/lib/schemas';

const corpus = loadCorpus();
const withChange = (id: string, change: (it: Interactive) => void) => {
  const c = structuredClone(corpus);
  const it = c.interactives[id];
  if (!it) throw new Error(`${id} is missing`);
  change(it);
  return checkMarketTools(c).map((p) => p.message);
};

describe('Market Studio content', () => {
  it('passes its own checks as published', () => {
    expect(checkMarketTools(corpus)).toEqual([]);
  });

  it('has an entry for every instrument, and the two case exercises on their pages', () => {
    for (const t of MARKET_TOOLS) {
      const it = corpus.interactives[t.ix];
      expect(it?.component).toBe(t.component);
      expect(it?.page).toBe(`/market-studio/${t.slug}/`);
    }
    expect(corpus.interactives['market-share-porto']?.page).toBe('/market-studio/market-metrics/');
    expect(corpus.interactives['market-position-map-porto']?.page).toBe('/market-studio/positioning-map/');
  });

  it('rejects a guide statement that is not quoted exactly from the curriculum', () => {
    const messages = withChange('market-stp-corner-brew', (it) => {
      if ('guide' in it) it.guide.serves[0] = { code: '4.2', statement: 'Segmentation and targeting' };
    });
    expect(messages).toContain('quotes "Segmentation and targeting" for 4.2, which is not a statement of that subtopic in the curriculum');
  });

  it('rejects a worked questionnaire whose flawed questions are not the ones the rules flag', () => {
    const messages = withChange('market-questionnaire-corner-brew', (it) => {
      if (it.component === 'questionnaire-builder') it.flawed = ['q3'];
    });
    expect(messages).toContain('question 4 (q4) trips a check but is not listed as flawed');
  });

  it('rejects a lifetime value whose acquisition cost no longer matches the campaign', () => {
    const messages = withChange('market-campaign-corner-brew', (it) => {
      if (it.component === 'campaign-planner') it.state.funnel.repeat = 20;
    });
    // 1,800 ÷ (2,400 × 0.55 × 0.20 × 0.20 = 52.8) = 34.09
    expect(messages).toContain("the acquisition cost should be the campaign's spending on winning customers per regular customer, 34.09, not 37.88");
  });

  it('rejects a worked example that fails its own validation', () => {
    const messages = withChange('market-plc-corner-brew', (it) => {
      if (it.component === 'plc-simulator') it.state.extensionYear = 40;
    });
    expect(messages.some((m) => m.startsWith('worked example: extensionYear'))).toBe(true);
  });
});
