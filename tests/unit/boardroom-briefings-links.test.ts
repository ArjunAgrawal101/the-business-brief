/**
 * The map between the Boardroom Briefings and the Advanced Management modules
 * that take each decision further: every briefing and every module it names
 * exists, each module is in its domain's plan, no briefing names a module
 * twice, and the reverse lookup finds exactly the briefings that name it.
 */
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRIEFING_MODULES, briefingsForModule } from '../../src/lib/boardroom-briefings/advanced-links';
import { MODULE_PLAN } from '../../src/lib/advanced';

const ids = (dir: string) =>
  readdirSync(new URL(`../../src/content/${dir}/`, import.meta.url))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''));

describe('the briefings and the advanced modules', () => {
  const briefings = new Set(ids('boardroom-briefings'));
  const modules = new Set(ids('advanced'));

  it('covers every briefing, and names only briefings that exist', () => {
    expect(Object.keys(BRIEFING_MODULES).sort()).toEqual([...briefings].sort());
  });

  it('names only modules that exist, in the domain the plan gives them, once each', () => {
    for (const [b, refs] of Object.entries(BRIEFING_MODULES)) {
      expect(refs.length, b).toBeGreaterThanOrEqual(2);
      expect(new Set(refs.map(([d, m]) => `${d}/${m}`)).size, b).toBe(refs.length);
      for (const [domain, id] of refs) {
        expect(modules.has(id), `${b} -> ${id}`).toBe(true);
        expect(MODULE_PLAN[domain].some((p) => p.id === id), `${b} -> ${domain}/${id}`).toBe(true);
      }
    }
  });

  it('finds, for a module, exactly the briefings that name it', () => {
    expect(briefingsForModule('strategy', 'strategy-execution-change-and-crisis')).toEqual(['declining-profitability', 'leading-through-a-crisis', 'reputational-damage']);
    expect(briefingsForModule('finance', 'valuation-fundamentals')).toEqual(['acquiring-a-competitor']);
    expect(briefingsForModule('marketing', 'pricing-strategy')).toEqual([]);
  });
});
