/**
 * The Stakeholder Impact Simulator's rules (src/lib/stakeholder-impact/model.ts):
 * worked by hand on one decision, then checked for consistency on every
 * decision and every one of the 81 combinations of settings: more mitigation
 * never adds to the harm of the groups it helps and always costs the owners,
 * a faster change never softens first-year harm (a fast closure hurts the
 * community more), a larger change never shrinks an effect or flips it, and
 * better communication never hurts those who must plan. The decisions'
 * data, the words, the grid and the stored value are checked too.
 */
import { describe, expect, it } from 'vitest';
import { DECISIONS, DECISION_IDS, decisionById } from '../../src/lib/stakeholder-impact/decisions';
import {
  DEFAULT_SETTINGS,
  GROUPS,
  NEGLIGIBLE,
  ORDER,
  PARAM_IDS,
  PLANNING_GROUPS,
  RULES,
  describe as describeEffect,
  effectOf,
  readSaved,
  readSettings,
  simulate,
  type Settings,
} from '../../src/lib/stakeholder-impact/model';
import { gridListHtml, gridSvg, impactHtml, promptsHtml, tradeoffsHtml } from '../../src/lib/stakeholder-impact/render';
import { loadCorpus } from './helpers/corpus';

/** Every combination of the four settings. */
function allSettings(): Settings[] {
  const out: Settings[] = [];
  for (const scale of ORDER.scale) for (const speed of ORDER.speed) for (const mitigation of ORDER.mitigation) for (const communication of ORDER.communication) out.push({ scale, speed, mitigation, communication });
  return out;
}
const ALL = allSettings();
const decision = (id: string) => decisionById(id)!;
const harm = (v: number) => Math.max(0, -v);

describe('the rules, worked by hand', () => {
  const d = decision('close-branch');

  it('applies scale, speed, mitigation and communication in order', () => {
    // Employees: base -2.5 in the first year, -1 after; mitigable; a planning group.
    expect(effectOf(d, 'employees', DEFAULT_SETTINGS)).toEqual({ short: -2.25, long: -1 }); // -2.5 x 1 x 1 x (1 - 0.1)
    // Large (1.5), fast (1.4), generous (0.4 first year, 0.6 after), early (0.8): -2.5 x 1.5 x 1.4 x 0.4 x 0.8 = -1.68; -1 x 1.5 x 0.6 = -0.9.
    expect(effectOf(d, 'employees', { scale: 'large', speed: 'fast', mitigation: 'generous', communication: 'early' })).toEqual({ short: -1.68, long: -0.9 });
    // The community, phased and small, no mitigation, minimal notice: -2 x 0.5 x 0.6 = -0.6; -1.5 x 0.5 = -0.75.
    expect(effectOf(d, 'community', { scale: 'small', speed: 'phased', mitigation: 'none', communication: 'minimal' })).toEqual({ short: -0.6, long: -0.75 });
    // Government is not a planning group, so communication leaves it alone: -0.5 x 1.4 = -0.7.
    expect(effectOf(d, 'government', { scale: 'moderate', speed: 'fast', mitigation: 'none', communication: 'early' })).toEqual({ short: -0.7, long: -0.25 });
  });

  it('charges the owners for mitigation and early notice', () => {
    // Owners: base -0.5 (a cost, so speed does not change it), 2 after. Standard mitigation 0.5, timely notice 0.2: -0.5 - 0.5 - 0.2 = -1.2.
    expect(effectOf(d, 'owners', { scale: 'moderate', speed: 'standard', mitigation: 'standard', communication: 'timely' })).toEqual({ short: -1.2, long: 2 });
    // Large: (-0.5 - 2 x 0.5 - 2 x 0.2) x 1.5 = -2.85.
    expect(effectOf(d, 'owners', { scale: 'large', speed: 'fast', mitigation: 'generous', communication: 'early' })).toEqual({ short: -2.85, long: 3 });
    // A first-year gain is brought forward by speed: raising prices, owners +2 x 1.25 = 2.5, less timely notice 0.1.
    expect(effectOf(decision('raise-prices'), 'owners', { scale: 'moderate', speed: 'fast', mitigation: 'none', communication: 'timely' })).toEqual({ short: 2.4, long: 1 });
  });

  it('reads direction, size and timescale from the two periods', () => {
    expect(describeEffect(-2.25, -1)).toEqual({ direction: 'loses', size: 'large', timescale: 'Mainly in the first year' });
    expect(describeEffect(-1.2, 2)).toEqual({ direction: 'loses-then-gains', size: 'large', timescale: 'Both: one way in the first year, the other after' });
    expect(describeEffect(0.1, -0.2)).toEqual({ direction: 'little', size: 'negligible', timescale: 'Not felt to any extent' });
    expect(describeEffect(0, 1.5)).toEqual({ direction: 'gains', size: 'moderate', timescale: 'Mainly after the first year' });
    expect(describeEffect(-0.6, -0.75)).toEqual({ direction: 'loses', size: 'small', timescale: 'In the first year and after' });
    expect(describeEffect(1.5, -0.5).direction).toBe('gains-then-loses');
  });

  it('writes the rules the page shows', () => {
    expect(RULES.length).toBeGreaterThanOrEqual(5);
    expect(RULES.map((r) => r.text).join(' ')).toMatch(/40% greater/);
  });
});

describe('consistency on every decision and every setting', () => {
  const with_ = (st: Settings, k: keyof Settings, v: string): Settings => ({ ...st, [k]: v });

  it('more compensation never adds to the harm of the groups it helps, and costs the owners more', () => {
    for (const d of DECISIONS)
      for (const st of ALL) {
        if (st.mitigation === 'generous') continue;
        const more = with_(st, 'mitigation', ORDER.mitigation[ORDER.mitigation.indexOf(st.mitigation) + 1]!);
        for (const g of GROUPS) {
          const a = effectOf(d, g, st);
          const b = effectOf(d, g, more);
          if (g === 'owners') {
            expect(b.short, `${d.id} owners ${JSON.stringify(st)}`).toBeLessThan(a.short);
            expect(b.long).toBe(a.long);
          } else {
            expect(harm(b.short)).toBeLessThanOrEqual(harm(a.short) + 1e-9);
            expect(harm(b.long)).toBeLessThanOrEqual(harm(a.long) + 1e-9);
            if (d.effects[g].mitigation && d.effects[g].short < 0) expect(harm(b.short), `${d.id} ${g}`).toBeLessThan(harm(a.short));
            if (!d.effects[g].mitigation) expect(b).toEqual(a);
          }
        }
      }
  });

  it('generous compensation reduces the harm to employees and raises the cost to owners wherever employees lose', () => {
    for (const d of DECISIONS) {
      if (!(d.effects.employees.short < 0 && d.effects.employees.mitigation)) continue;
      const none = simulate(d, { ...DEFAULT_SETTINGS, mitigation: 'none' });
      const generous = simulate(d, { ...DEFAULT_SETTINGS, mitigation: 'generous' });
      const emp = (s: typeof none) => s.results.find((r) => r.group === 'employees')!;
      const own = (s: typeof none) => s.results.find((r) => r.group === 'owners')!;
      expect(emp(generous).overall, d.id).toBeGreaterThan(emp(none).overall);
      expect(own(generous).overall, d.id).toBeLessThan(own(none).overall);
    }
  });

  it('a faster change never softens first-year harm, and a faster closure raises the harm to the community', () => {
    for (const d of DECISIONS)
      for (const st of ALL) {
        if (st.speed === 'fast') continue;
        const faster = with_(st, 'speed', ORDER.speed[ORDER.speed.indexOf(st.speed) + 1]!);
        for (const g of GROUPS) {
          if (g === 'owners') continue;
          const a = effectOf(d, g, st);
          const b = effectOf(d, g, faster);
          expect(harm(b.short), `${d.id} ${g}`).toBeGreaterThanOrEqual(harm(a.short) - 1e-9);
          expect(b.long).toBe(a.long);
        }
      }
    const closure = decision('close-branch');
    const community = (speed: Settings['speed']) => effectOf(closure, 'community', { ...DEFAULT_SETTINGS, speed }).short;
    expect(harm(community('fast'))).toBeGreaterThan(harm(community('standard')));
    expect(harm(community('standard'))).toBeGreaterThan(harm(community('phased')));
  });

  it('a faster change brings the owners’ first-year gains forward and never changes their later effect', () => {
    for (const d of DECISIONS)
      for (const st of ALL) {
        if (st.speed === 'fast') continue;
        const faster = with_(st, 'speed', ORDER.speed[ORDER.speed.indexOf(st.speed) + 1]!);
        const a = effectOf(d, 'owners', st);
        const b = effectOf(d, 'owners', faster);
        expect(b.short).toBeGreaterThanOrEqual(a.short - 1e-9);
        expect(b.long).toBe(a.long);
        if (d.effects.owners.short > 0) expect(b.short).toBeGreaterThan(a.short);
      }
  });

  it('a larger change never shrinks an effect or turns a loss into a gain', () => {
    for (const d of DECISIONS)
      for (const st of ALL) {
        if (st.scale === 'large') continue;
        const bigger = with_(st, 'scale', ORDER.scale[ORDER.scale.indexOf(st.scale) + 1]!);
        for (const g of GROUPS) {
          if (g === 'owners') continue;
          const a = effectOf(d, g, st);
          const b = effectOf(d, g, bigger);
          for (const k of ['short', 'long'] as const) {
            expect(Math.abs(b[k])).toBeGreaterThanOrEqual(Math.abs(a[k]) - 1e-9);
            expect(Math.sign(b[k]) * Math.sign(a[k])).not.toBe(-1);
          }
        }
        // The owners' later effect scales the same way; their first year also carries the costs, which scale too.
        const a = effectOf(d, 'owners', st);
        const b = effectOf(d, 'owners', bigger);
        expect(Math.abs(b.long)).toBeGreaterThanOrEqual(Math.abs(a.long));
      }
  });

  it('better communication never hurts those who must plan, and costs the owners only where the decision names an early-notice cost', () => {
    for (const d of DECISIONS)
      for (const st of ALL) {
        if (st.communication === 'early') continue;
        const better = with_(st, 'communication', ORDER.communication[ORDER.communication.indexOf(st.communication) + 1]!);
        for (const g of GROUPS) {
          const a = effectOf(d, g, st);
          const b = effectOf(d, g, better);
          if (g === 'owners') {
            if (d.earlyNoticeCost > 0) expect(b.short).toBeLessThan(a.short);
            else expect(b).toEqual(a);
          } else if (PLANNING_GROUPS.includes(g)) {
            expect(harm(b.short)).toBeLessThanOrEqual(harm(a.short) + 1e-9);
            if (a.short < 0) expect(harm(b.short)).toBeLessThan(harm(a.short));
          } else expect(b).toEqual(a);
        }
      }
  });

  it('never changes a gain through mitigation or communication, and never produces a number that is not finite', () => {
    for (const d of DECISIONS)
      for (const st of ALL)
        for (const g of GROUPS) {
          const e = effectOf(d, g, st);
          expect(Number.isFinite(e.short) && Number.isFinite(e.long)).toBe(true);
          if (g !== 'owners' && d.effects[g].long > 0) {
            const scale = { small: 0.5, moderate: 1, large: 1.5 }[st.scale];
            expect(e.long).toBeCloseTo(d.effects[g].long * scale, 9);
          }
        }
  });

  it('describes every result in words that agree with its figures', () => {
    for (const d of DECISIONS)
      for (const st of ALL) {
        const sim = simulate(d, st);
        expect(sim.results.map((r) => r.group)).toEqual([...GROUPS]);
        for (const r of sim.results) {
          const big = Math.max(Math.abs(r.short), Math.abs(r.long));
          if (r.direction === 'little') expect(big).toBeLessThan(NEGLIGIBLE);
          if (r.direction === 'gains') expect(Math.min(r.short, r.long)).toBeGreaterThan(-NEGLIGIBLE);
          if (r.direction === 'loses') expect(Math.max(r.short, r.long)).toBeLessThan(NEGLIGIBLE);
          expect(r.power).toBeGreaterThanOrEqual(1);
          expect(r.interest).toBeLessThanOrEqual(10);
          expect(r.reason.length).toBeGreaterThan(20);
        }
        for (const g of sim.gainers) expect(g.overall).toBeGreaterThanOrEqual(NEGLIGIBLE);
        for (const l of sim.losers) expect(l.overall).toBeLessThanOrEqual(-NEGLIGIBLE);
        for (const c of sim.conflicts) {
          expect(sim.gainers.map((x) => x.group)).toContain(c.gains);
          expect(sim.losers.map((x) => x.group)).toContain(c.loses);
        }
        expect(sim.prompts.length).toBeGreaterThanOrEqual(4);
      }
  });
});

describe('the decisions', () => {
  it('offers at least eight, each complete and distinct', () => {
    expect(DECISIONS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(DECISION_IDS).size).toBe(DECISIONS.length);
    expect(new Set(DECISIONS.map((d) => d.business)).size).toBe(DECISIONS.length);
    for (const d of DECISIONS) {
      for (const g of GROUPS) {
        const e = d.effects[g];
        expect(Math.abs(e.short), `${d.id} ${g}`).toBeLessThanOrEqual(3);
        expect(Math.abs(e.long)).toBeLessThanOrEqual(3);
        expect(e.power).toBeGreaterThanOrEqual(1);
        expect(e.power).toBeLessThanOrEqual(10);
        expect(e.why).toMatch(/[.!?]$/);
      }
      expect(d.effects.owners.mitigation, `${d.id}: the owners pay for mitigation, they are not mitigated`).toBeUndefined();
      expect(GROUPS.some((g) => d.effects[g].mitigation), `${d.id} offers no mitigation`).toBe(true);
      expect(d.earlyNoticeCost > 0).toBe(Boolean(d.earlyNotice));
      expect(d.prompts.length).toBeGreaterThanOrEqual(3);
      expect(d.conflicts.length).toBeGreaterThanOrEqual(1);
      for (const c of d.conflicts) expect(c.gains).not.toBe(c.loses);
      for (const s of Object.values(d.scales)) expect(s).toMatch(/\.$/);
    }
  });

  it('covers the decisions the brief names', () => {
    for (const id of ['automate-line', 'relocate-abroad', 'raise-prices', 'expand-abroad', 'sustainable-suppliers', 'close-branch', 'accept-takeover', 'cut-marketing']) expect(DECISION_IDS).toContain(id);
  });

  it('shows every conflict it declares on its default settings or on some other setting', () => {
    for (const d of DECISIONS)
      for (const c of d.conflicts) expect(ALL.some((st) => simulate(d, st).conflicts.includes(c)), `${d.id}: ${c.gains} against ${c.loses}`).toBe(true);
  });

  it('names subtopics that exist', () => {
    const c = loadCorpus();
    const codes = new Set((c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics.map((s) => s.code)));
    for (const d of DECISIONS) for (const code of d.subtopics) expect(codes.has(code), `${d.id}: ${code}`).toBe(true);
  });
});

describe('the HTML and the stored value', () => {
  it('draws every decision without leaking a value', () => {
    for (const d of DECISIONS) {
      const sim = simulate(d, DEFAULT_SETTINGS);
      const html = [impactHtml(sim), tradeoffsHtml(sim), gridSvg(sim, 'g'), gridListHtml(sim), promptsHtml(sim)].join('');
      expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(html).not.toMatch(/[\u2013\u2014]/);
      expect((html.match(/<li class="si-group /g) ?? []).length).toBe(7);
      expect(gridSvg(sim, 'g')).toContain('<desc id="g-d">');
    }
  });

  it('reads settings and saved work defensively', () => {
    expect(readSettings({ scale: 'huge', speed: 'fast' })).toEqual({ ...DEFAULT_SETTINGS, speed: 'fast' });
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    const fresh = readSaved(null, DECISION_IDS);
    expect(fresh.decision).toBe(DECISION_IDS[0]);
    expect(fresh.settings).toEqual(DEFAULT_SETTINGS);
    expect(readSaved('{not json', DECISION_IDS).notes).toEqual({});
    const back = readSaved(JSON.stringify({ decision: 'close-branch', settings: { scale: 'large' }, notes: { 'close-branch': 'x'.repeat(5000), nope: 'y', 'raise-prices': 3 }, savedAt: 'yesterday' }), DECISION_IDS);
    expect(back.decision).toBe('close-branch');
    expect(back.settings.scale).toBe('large');
    expect(back.notes['close-branch']).toHaveLength(4000);
    expect(Object.keys(back.notes)).toEqual(['close-branch']);
    expect(back.savedAt).toBe('');
    expect(readSaved({ decision: 'not-a-decision' }, DECISION_IDS).decision).toBe(DECISION_IDS[0]);
  });

  it('lists every setting in the order from least to most', () => {
    expect(PARAM_IDS).toEqual(['scale', 'speed', 'mitigation', 'communication']);
    expect(ALL).toHaveLength(81);
  });
});
