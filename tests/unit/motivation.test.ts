import { describe, expect, it } from 'vitest';
import { FACTORS, MASLOW, equity, expectancy, herzberg, maslow, mcclelland, motivationCsvRows, readMotivation, rewards, selfDetermination, taylor, validateRatings, type MotivationInputs, type Ratings } from '../../src/lib/motivation';
import { lensCards, maslowSvg, herzbergSvg, rewardsHtml } from '../../src/lib/motivation-view';
import { loadTool } from './helpers/room-tool';

// The worked example: the night shift at Halden Distribution (fictional), rated from the case's exhibits.
const HALDEN: Ratings = {
  pay: 3,
  security: 3,
  conditions: 3,
  relationships: 3,
  supervision: 2,
  recognition: 2,
  responsibility: 1,
  work: 2,
  growth: 1,
  purpose: 2,
  fairness: 2,
  expectancy: 2,
  instrumentality: 3,
  valence: 3,
};
const JOB = { countable: true, sales: false, teams: true, shares: true };
const INPUT: MotivationInputs = { ratings: HALDEN, job: JOB, need: 'unknown' };
const all = (v: number): Ratings => Object.fromEntries(FACTORS.map((f) => [f.id, v])) as Ratings;

describe('the worked example', () => {
  it('is the night shift at Halden, as the YAML gives it', () => {
    const t = loadTool('people-motivation', 'motivation-analysis');
    expect(t.ratings).toEqual(HALDEN);
    expect(t.job).toEqual(JOB);
    expect(t.need).toBe('unknown');
    expect(t.guide.storageKey).toBe('people:motivation');
  });
});

describe('Maslow, worked by hand', () => {
  const m = maslow(HALDEN);
  it('scores each level as the average of its factors', () => {
    const score = Object.fromEntries(m.levels.map((l) => [l.id, l.score]));
    expect(score.physiological).toBe(3); // pay 3
    expect(score.safety).toBe(3); // (security 3 + conditions 3) ÷ 2
    expect(score.social).toBe(3); // relationships 3
    expect(score.esteem).toBeCloseTo(4 / 3, 10); // (recognition 2 + responsibility 1 + growth 1) ÷ 3
    expect(score['self-actualization']).toBe(2); // (work 2 + purpose 2) ÷ 2
  });
  it('finds esteem the lowest need not met, at 1.3', () => {
    expect(m.lowestUnmet).toBe('esteem');
    expect(m.reading).toContain('esteem (1.3 out of 5)');
  });
  it('says every level is met when every rating is 3 or more', () => {
    const r = maslow(all(3));
    expect(r.lowestUnmet).toBeNull();
    expect(r.levels.every((l) => l.met)).toBe(true);
  });
  it('puts a low pay rating first, at the base of the hierarchy', () => {
    expect(maslow({ ...all(5), pay: 2 }).lowestUnmet).toBe('physiological');
  });
  it('reads every factor of the hierarchy from the platform list', () => {
    const ids = new Set(FACTORS.map((f) => f.id));
    MASLOW.forEach((l) => l.factors.forEach((f) => expect(ids.has(f)).toBe(true)));
  });
});

describe('Herzberg, worked by hand', () => {
  const h = herzberg(HALDEN);
  it('averages the hygiene factors to 2.8 and the motivators to 1.5', () => {
    // (pay 3 + security 3 + conditions 3 + relationships 3 + supervision 2) ÷ 5 = 14 ÷ 5
    expect(h.hygiene).toBeCloseTo(2.8, 10);
    // (recognition 2 + responsibility 1 + work 2 + growth 1) ÷ 4 = 6 ÷ 4
    expect(h.motivators).toBe(1.5);
  });
  it('places the job in the low, low quarter and names what to fix first', () => {
    expect(h.quadrant).toBe('demotivated');
    expect(h.worstHygiene).toBe('supervision');
    expect(h.worstMotivator).toBe('responsibility');
    expect(h.reading).toContain('fair and supportive supervision');
  });
  it('separates the four quarters at 3', () => {
    expect(herzberg(all(3)).quadrant).toBe('motivated-content');
    expect(herzberg({ ...all(4), recognition: 2, responsibility: 2, work: 2, growth: 2 }).quadrant).toBe('content-unmotivated');
    expect(herzberg({ ...all(4), pay: 1, security: 1, conditions: 2 }).quadrant).toBe('motivated-complaining');
  });
});

describe('Taylor', () => {
  it('fits when output can be counted, with the caution about monitoring a job with little say', () => {
    const t = taylor(JOB, HALDEN);
    expect(t.fits).toBe(true);
    expect(t.reading).toContain('digital Taylorism');
  });
  it('has little to offer when output cannot be counted', () => {
    expect(taylor({ ...JOB, countable: false }, HALDEN).fits).toBe(false);
  });
  it('drops the caution when the job already offers say and variety', () => {
    expect(taylor(JOB, all(4)).reading).not.toContain('digital Taylorism');
  });
});

describe('the HL theories', () => {
  it('finds autonomy the weakest basic need: 1, against competence 1.5 and relatedness 3', () => {
    const s = selfDetermination(HALDEN);
    expect(s.autonomy).toBe(1);
    expect(s.competence).toBe(1.5); // (growth 1 + recognition 2) ÷ 2
    expect(s.relatedness).toBe(3);
    expect(s.weakest).toBe('autonomy');
  });
  it('reads fairness rated 2 as feeling under-rewarded, and 3 as not', () => {
    expect(equity(HALDEN).underRewarded).toBe(true);
    expect(equity({ ...HALDEN, fairness: 3 }).underRewarded).toBe(false);
  });
  it('multiplies the three beliefs: 0.25 × 0.5 × 0.5 = 0.0625', () => {
    // Each rating rescaled from 1 to 5 onto 0 to 1: (2 − 1) ÷ 4 = 0.25, (3 − 1) ÷ 4 = 0.5.
    const e = expectancy(HALDEN);
    expect(e.e).toBe(0.25);
    expect(e.i).toBe(0.5);
    expect(e.v).toBe(0.5);
    expect(e.force).toBe(0.0625);
    expect(e.weakest).toBe('expectancy');
  });
  it('shows one belief at the bottom of the scale stopping motivation however strong the others are', () => {
    expect(expectancy({ ...all(5), valence: 1 }).force).toBe(0);
    expect(expectancy(all(5)).force).toBe(1);
  });
  it('asks for the dominant need until one is chosen, then scores the fit', () => {
    expect(mcclelland('unknown', HALDEN, JOB).fit).toBeNull();
    // Achievement is fed by responsibility, recognition and growth: (1 + 2 + 1) ÷ 3
    expect(mcclelland('achievement', HALDEN, JOB).fit).toBeCloseTo(4 / 3, 10);
    expect(mcclelland('affiliation', HALDEN, JOB).fit).toBe(3);
    expect(mcclelland('affiliation', HALDEN, JOB).reading).toContain('Working in teams helps.');
    expect(mcclelland('power', HALDEN, JOB).fit).toBe(1); // (responsibility 1 + growth 1) ÷ 2
  });
});

describe('the rewards that fit', () => {
  const rs = rewards(INPUT);
  const byId = Object.fromEntries(rs.map((r) => [r.id, r]));
  it('rates job enrichment, empowerment and training the strong fits', () => {
    expect(rs.filter((r) => r.fit === 'strong').map((r) => r.id)).toEqual(['enrichment', 'empowerment', 'training']);
  });
  it('does not suggest a pay rise, since pay is rated 3, but flags fairness at HL', () => {
    expect(byId.pay?.name).toBe('Open, consistent decisions on pay and treatment');
    expect(byId.pay?.hl).toBe(true);
  });
  it('offers piece rates only as worth considering, as the job already lacks say and variety', () => {
    expect(byId.piece?.fit).toBe('consider');
    expect(byId.commission).toBeUndefined();
  });
  it('follows the facts about the job', () => {
    expect(byId.profit).toBeDefined(); // teams
    expect(byId.shares).toBeDefined(); // a company, and growth rated 1
    const noTeams = rewards({ ...INPUT, job: { ...JOB, teams: false, shares: false } }).map((r) => r.id);
    expect(noTeams).not.toContain('profit');
    expect(noTeams).not.toContain('shares');
    expect(noTeams).not.toContain('teamwork');
  });
  it('suggests nothing to fix when every factor is rated 5 and no payment method applies', () => {
    expect(rewards({ ratings: all(5), job: { countable: false, sales: false, teams: false, shares: false }, need: 'unknown' })).toEqual([]);
  });
  it('suggests a market wage first when pay is rated low', () => {
    const r = rewards({ ...INPUT, ratings: { ...HALDEN, pay: 1 } });
    expect(r.find((x) => x.id === 'pay')?.fit).toBe('strong');
  });
});

describe('the reading and the files', () => {
  it('leads with the quarter and the lowest unmet need, then the strong fits', () => {
    const r = readMotivation(INPUT);
    expect(r.reading).toBe("Grievances and little drive: hygiene factors average 2.8 and motivators 1.5 out of 5. The lowest unmet need on Maslow's hierarchy is esteem.");
    expect(r.implication).toBe('The rewards that fit best: job enrichment, empowerment and training. Fix what causes dissatisfaction first, then build what motivates.');
  });
  it('writes every rating and every reward to the CSV', () => {
    const rows = motivationCsvRows(INPUT);
    expect(rows[0]).toEqual(['Factor', 'Rating (1 to 5)', 'HL only']);
    expect(rows.slice(1, 1 + FACTORS.length).map((r) => r[1])).toEqual(FACTORS.map((f) => String(HALDEN[f.id])));
    expect(rows.filter((r) => r.length === 5).length).toBe(1 + rewards(INPUT).length);
  });
  it('rejects ratings that are missing, fractional or outside 1 to 5', () => {
    expect(validateRatings(HALDEN)).toEqual([]);
    expect(validateRatings({ ...HALDEN, pay: 0, work: 2.5, valence: null })).toEqual(['pay', 'work', 'valence']);
    const rest: Partial<Ratings> = { ...HALDEN };
    delete rest.purpose;
    expect(validateRatings(rest)).toEqual(['purpose']);
  });
});

describe('the charts and cards', () => {
  it('describe the result in words and figures', () => {
    const m = maslowSvg(maslow(HALDEN), 'm');
    expect(m).toContain('role="img"');
    expect(m).toContain('Esteem 1.3, not met');
    expect(m).toContain('The lowest level not met is esteem.');
    const h = herzbergSvg(herzberg(HALDEN), 'h');
    expect(h).toContain('Hygiene factors average 2.8 and motivators 1.5');
    expect(h).toContain('Grievances and little drive');
  });
  it('mark the HL theories and the HL-only rewards', () => {
    const cards = lensCards(INPUT, 'x');
    expect(cards.taylor).not.toContain('data-level="HL"');
    expect(cards.expectancy).toContain('data-level="HL"');
    expect(cards.expectancy).toContain('0.25 × instrumentality 0.50 × valence 0.50 = 0.06');
    const html = rewardsHtml(rewards(INPUT));
    expect(html).toContain('data-level="HL"');
    expect(html.indexOf('Job enrichment')).toBeLessThan(html.indexOf('Job rotation'));
  });
});
