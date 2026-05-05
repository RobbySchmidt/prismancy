import { describe, it, expect } from 'vitest';
import { RNG } from '../src/utils/RNG';

describe('RNG', () => {
  it('produces identical sequences for the same numeric seed', () => {
    const a = new RNG(42);
    const b = new RNG(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces identical sequences for the same string seed', () => {
    const a = new RNG('wizard');
    const b = new RNG('wizard');
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });

  it('produces different sequences for different seeds', () => {
    const a = new RNG(1);
    const b = new RNG(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() always returns a value in [0, 1)', () => {
    const rng = new RNG(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('intBetween returns values in [min, max] inclusive', () => {
    const rng = new RNG('range-test');
    for (let i = 0; i < 1000; i++) {
      const v = rng.intBetween(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('intBetween throws when max < min', () => {
    const rng = new RNG(0);
    expect(() => rng.intBetween(5, 3)).toThrow();
  });

  it('chance(0) is always false and chance(1) is always true', () => {
    const rng = new RNG(7);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('shuffle returns a permutation without mutating input', () => {
    const rng = new RNG('shuffle');
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = rng.shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('pick throws on empty array', () => {
    const rng = new RNG(0);
    expect(() => rng.pick([])).toThrow();
  });

  it('getState/setState round-trips the sequence', () => {
    const rng = new RNG(99);
    rng.next();
    rng.next();
    const snapshot = rng.getState();
    const a = rng.next();
    rng.setState(snapshot);
    const b = rng.next();
    expect(a).toBe(b);
  });
});
