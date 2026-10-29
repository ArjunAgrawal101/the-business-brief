import { describe, expect, it } from 'vitest';
import { checkIntegrity } from '../../src/lib/integrity';
import { asCorpus, loadCorpus } from './helpers/corpus';

describe('content corpus', () => {
  const c = loadCorpus();

  it('validates against the schemas', () => {
    expect(Object.keys(c.topics).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(c.cases).length).toBeGreaterThanOrEqual(3);
  });

  it('has no broken references between content', () => {
    const problems = checkIntegrity(asCorpus(c));
    expect(problems.map((p) => `${p.where}: ${p.message}`)).toEqual([]);
  });
});
