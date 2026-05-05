import { describe, it, expect } from 'vitest';

import { BOSSES, pickBossForFloor } from '../src/data/bosses';
import { RNG } from '../src/utils/RNG';

const EMERALD_BOSS_IDS = [
  'boss-vine-lord',
  'boss-mossy-behemoth',
  'boss-pixie-queen',
  'boss-forest-heart',
] as const;

describe('bosses data', () => {
  it('every boss entry id matches its key', () => {
    for (const [key, boss] of Object.entries(BOSSES)) {
      expect(boss.id).toBe(key);
    }
  });

  it('all four emerald-forest bosses are registered with weight 1', () => {
    for (const id of EMERALD_BOSS_IDS) {
      expect(BOSSES[id]).toBeDefined();
      expect(BOSSES[id]!.floor).toBe('emerald-forest');
      expect(BOSSES[id]!.weight).toBe(1);
    }
  });

  it('pickBossForFloor returns null for floors with no eligible boss', () => {
    const rng = new RNG('no-boss');
    expect(pickBossForFloor('made-up-floor', rng)).toBeNull();
  });

  it('pickBossForFloor only picks bosses tagged for the requested floor', () => {
    for (let seed = 0; seed < 32; seed++) {
      const id = pickBossForFloor('emerald-forest', new RNG(`seed-${seed}`));
      expect(id).not.toBeNull();
      expect(EMERALD_BOSS_IDS).toContain(id);
    }
  });

  it('every emerald-forest boss is reachable across enough seeds', () => {
    // With four equal-weight bosses, all four must be hit at least once over
    // 200 distinct seeds. This catches accidental weight-zero entries / typos
    // without being flaky (probability of missing any one across 200 picks is
    // (3/4)^200 ≈ 1e-25).
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const id = pickBossForFloor('emerald-forest', new RNG(`coverage-${seed}`));
      if (id) seen.add(id);
    }
    for (const id of EMERALD_BOSS_IDS) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it('pickBossForFloor is deterministic given the same RNG seed', () => {
    const a = pickBossForFloor('emerald-forest', new RNG('chunk2-boss'));
    const b = pickBossForFloor('emerald-forest', new RNG('chunk2-boss'));
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });
});
