import { describe, it, expect } from 'vitest';

import { StatsSystem } from '../src/systems/StatsSystem';
import { BASE_PLAYER_STATS, DEFAULT_MISSILE_TINT } from '../src/config/GameConfig';
import type { ItemModifier } from '../src/types';

describe('StatsSystem', () => {
  it('returns base stat values when no modifiers are applied', () => {
    const s = new StatsSystem();
    expect(s.getEffective('damage')).toBe(BASE_PLAYER_STATS.damage);
    expect(s.getEffective('moveSpeed')).toBe(BASE_PLAYER_STATS.moveSpeed);
    expect(s.getEffective('fireRate')).toBe(BASE_PLAYER_STATS.fireRate);
    expect(s.getModifierCount()).toBe(0);
  });

  it('applies an additive modifier on top of base', () => {
    const s = new StatsSystem();
    const mod: ItemModifier = {
      itemId: 'sharper-wand',
      effects: [{ stat: 'damage', add: 1 }],
    };
    s.applyModifier(mod);
    expect(s.getEffective('damage')).toBe(BASE_PLAYER_STATS.damage + 1);
  });

  it('applies a multiplicative modifier on top of base', () => {
    const s = new StatsSystem();
    const mod: ItemModifier = {
      itemId: 'rapid-fire',
      effects: [{ stat: 'fireRate', mult: 1.3 }],
    };
    s.applyModifier(mod);
    expect(s.getEffective('fireRate')).toBeCloseTo(BASE_PLAYER_STATS.fireRate * 1.3, 10);
  });

  it('runs additive before multiplicative — (base + add) * mult', () => {
    const s = new StatsSystem();
    // Use a stat with base 1.0 so the math is easy: missileScale.
    s.applyModifier({ itemId: 'a', effects: [{ stat: 'missileScale', add: 0.5 }] });
    s.applyModifier({ itemId: 'b', effects: [{ stat: 'missileScale', mult: 2 }] });
    // base 1.0 + 0.5 = 1.5; *2 = 3.0
    expect(s.getEffective('missileScale')).toBeCloseTo(3.0, 10);
  });

  it('stacks multiple additive modifiers on the same stat', () => {
    const s = new StatsSystem();
    s.applyModifier({ itemId: 'a', effects: [{ stat: 'damage', add: 1 }] });
    s.applyModifier({ itemId: 'b', effects: [{ stat: 'damage', add: 1 }] });
    expect(s.getEffective('damage')).toBe(BASE_PLAYER_STATS.damage + 2);
    expect(s.getModifierCount()).toBe(2);
  });

  it('returns DEFAULT_MISSILE_TINT when no modifier sets a tint', () => {
    const s = new StatsSystem();
    expect(s.getMissileTint()).toBe(DEFAULT_MISSILE_TINT);

    // Even non-tint modifiers shouldn't change the default.
    s.applyModifier({ itemId: 'plain', effects: [{ stat: 'damage', add: 1 }] });
    expect(s.getMissileTint()).toBe(DEFAULT_MISSILE_TINT);
  });

  it('returns the most recently applied missileTint (latest-wins)', () => {
    const s = new StatsSystem();
    s.applyModifier({ itemId: 'a', effects: [], missileTint: 0xff0000 });
    expect(s.getMissileTint()).toBe(0xff0000);

    s.applyModifier({ itemId: 'b', effects: [], missileTint: 0x00ff00 });
    expect(s.getMissileTint()).toBe(0x00ff00);

    // A later modifier without a tint shouldn't clobber the active one.
    s.applyModifier({ itemId: 'c', effects: [{ stat: 'damage', add: 1 }] });
    expect(s.getMissileTint()).toBe(0x00ff00);
  });
});
