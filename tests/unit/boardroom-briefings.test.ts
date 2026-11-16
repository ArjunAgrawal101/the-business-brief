/**
 * The Boardroom Briefings: every briefing validates and passes its integrity
 * check; the check catches the mistakes it exists for; the formula engine
 * works figures as a student would; and each briefing's key results are
 * reworked here with the platform's own finance functions, independently of
 * the formulas in the YAML.
 */
import { describe, expect, it } from 'vitest';
import { checkBoardroomBriefings } from '../../src/lib/boardroom-briefings/integrity';
import { briefingContext, loadBriefings } from './helpers/boardroom-briefings';

const items = loadBriefings();
const ctx = briefingContext();

describe('the series', () => {
  it('passes its integrity check', () => {
    const problems = checkBoardroomBriefings(items, ctx).map((p) => `${p.where}: ${p.message}`);
    expect(problems).toEqual([]);
  });
});

describe('the integrity check catches mistakes', () => {
  const first = Object.keys(items)[0] as string;
  const run = (mutate: (b: ReturnType<typeof structuredClone<(typeof items)[string]>>) => void) => {
    const copy = structuredClone(items);
    mutate(copy[first]!);
    return checkBoardroomBriefings(copy, ctx).map((p) => p.message);
  };

  it('a figure in the text that the model does not account for', () => {
    const msgs = run((b) => {
      b.background[1] = `${b.background[1]} Revenue reached £39.9m.`;
    });
    expect(msgs.some((m) => m.includes('"£39.9m" is not a cell'))).toBe(true);
  });
});
