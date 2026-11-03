/**
 * Seeded randomness for the practice engines: the same seed always gives the
 * same sequence, so a question or a set can be drawn again from its code.
 */

/** mulberry32: small, fast and good enough for drawing practice figures. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** A number in [0, 1). */
  next(): number;
  /** A whole number from min to max, both included. */
  int(min: number, max: number): number;
  /** A multiple of step from min to max, both included, free of floating-point dust. */
  step(min: number, max: number, step: number): number;
  pick<T>(xs: readonly T[]): T;
  chance(p: number): boolean;
}

const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

export function rng(seed: number): Rng {
  const next = seeded(seed);
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    step: (min, max, step) => tidy(min + int(0, Math.floor(tidy((max - min) / step))) * step),
    pick: <T>(xs: readonly T[]): T => {
      if (!xs.length) throw new Error('Cannot pick from an empty list');
      return xs[int(0, xs.length - 1)] as T;
    },
    chance: (p) => next() < p,
  };
}
