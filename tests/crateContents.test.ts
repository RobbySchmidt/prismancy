import { describe, it, expect } from 'vitest';

import {
  BROWN_CRATE_TABLE,
  GOLD_CRATE_TABLE,
  rollCrateContents,
} from '../src/data/crateContents';
import { PickupKind } from '../src/types';
import { RNG } from '../src/utils/RNG';

describe('crate content tables', () => {
  it('rollCrateContents is deterministic for the same seed', () => {
    const a = rollCrateContents(BROWN_CRATE_TABLE, new RNG('crate-seed-A'));
    const b = rollCrateContents(BROWN_CRATE_TABLE, new RNG('crate-seed-A'));
    expect(a).toEqual(b);

    const c = rollCrateContents(GOLD_CRATE_TABLE, new RNG('gold-seed-X'));
    const d = rollCrateContents(GOLD_CRATE_TABLE, new RNG('gold-seed-X'));
    expect(c).toEqual(d);
  });

  it('total weights are positive and entries are non-empty', () => {
    const sumBrown = BROWN_CRATE_TABLE.reduce((acc, o) => acc + o.weight, 0);
    const sumGold = GOLD_CRATE_TABLE.reduce((acc, o) => acc + o.weight, 0);
    // Numeric sanity — keep them above zero so RNG.pickWeighted never throws,
    // and pin the exact totals so a future weight tweak shows up in the
    // diff instead of silently skewing the loot economy.
    expect(sumBrown).toBe(13);
    expect(sumGold).toBe(14);

    for (const outcome of [...BROWN_CRATE_TABLE, ...GOLD_CRATE_TABLE]) {
      expect(outcome.entries.length).toBeGreaterThan(0);
      for (const entry of outcome.entries) {
        expect(entry.count).toBeGreaterThan(0);
      }
    }
  });

  it('at least one BROWN outcome contains only Coin entries', () => {
    const coinOnly = BROWN_CRATE_TABLE.some(
      (o) => o.entries.every((e) => e.kind === PickupKind.Coin),
    );
    expect(coinOnly).toBe(true);
  });

  it('at least one GOLD outcome contains an Item entry with itemPool=treasure', () => {
    const treasureItem = GOLD_CRATE_TABLE.find(
      (o) =>
        o.itemPool === 'treasure' &&
        o.entries.some((e) => e.kind === PickupKind.Item),
    );
    expect(treasureItem).toBeDefined();
  });

  it('BROWN table never contains Item entries', () => {
    // Items live on pedestals; brown crates intentionally only hand out
    // walk-over drops (heart/coin/key). Pin this so a future table edit
    // can't sneak an item drop into the cheap free-loot path.
    for (const outcome of BROWN_CRATE_TABLE) {
      for (const entry of outcome.entries) {
        expect(entry.kind).not.toBe(PickupKind.Item);
      }
    }
  });
});
