import { describe, it, expect } from 'vitest';

import { ITEMS, getItemsForPool, pickItemFromPool, type ItemId } from '../src/data/items';
import { ItemPool } from '../src/types';
import { RNG } from '../src/utils/RNG';

describe('items data', () => {
  it('getItemsForPool(Treasure) includes treasure-only and dual-pool items', () => {
    const ids = getItemsForPool(ItemPool.Treasure).map((i) => i.id);
    // Treasure-only:
    expect(ids).toContain('telescopicWand');
    expect(ids).toContain('leadCap');
    expect(ids).toContain('pixieDust');
    // Dual-pool (both Treasure and Shop):
    expect(ids).toContain('magicTome');
    expect(ids).toContain('hotTea');
    expect(ids).toContain('wizardSneakers');
    // Shop-only:
    expect(ids).not.toContain('magicPotion');
  });

  it('getItemsForPool(Shop) includes shop-only and dual-pool items', () => {
    const ids = getItemsForPool(ItemPool.Shop).map((i) => i.id);
    expect(ids).toContain('magicPotion');
    expect(ids).toContain('magicTome');
    expect(ids).toContain('hotTea');
    expect(ids).toContain('wizardSneakers');
    // Treasure-only items must not leak into Shop pool.
    expect(ids).not.toContain('telescopicWand');
    expect(ids).not.toContain('leadCap');
    expect(ids).not.toContain('pixieDust');
  });

  it('pickItemFromPool is deterministic for the same RNG seed', () => {
    const a = pickItemFromPool(ItemPool.Treasure, new RNG('chunk3-seed'));
    const b = pickItemFromPool(ItemPool.Treasure, new RNG('chunk3-seed'));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a?.id).toBe(b?.id);
  });

  it('pickItemFromPool respects the exclude set', () => {
    // Build an exclude set covering every Treasure item except `pixieDust` —
    // the picker has to land on `pixieDust` regardless of seed.
    const treasureIds = getItemsForPool(ItemPool.Treasure)
      .map((i) => i.id as ItemId)
      .filter((id) => id !== 'pixieDust');
    const exclude = new Set<ItemId>(treasureIds);

    for (let seed = 0; seed < 8; seed++) {
      const rng = new RNG(`exclude-test-${seed}`);
      const picked = pickItemFromPool(ItemPool.Treasure, rng, exclude);
      expect(picked?.id).toBe('pixieDust');
    }
  });

  it('pickItemFromPool returns null when every eligible item is excluded', () => {
    const allTreasure = new Set<ItemId>(
      getItemsForPool(ItemPool.Treasure).map((i) => i.id as ItemId),
    );
    const picked = pickItemFromPool(ItemPool.Treasure, new RNG('drained'), allTreasure);
    expect(picked).toBeNull();
  });

  it('every item id in ITEMS matches its key', () => {
    for (const [key, item] of Object.entries(ITEMS)) {
      expect(item.id).toBe(key);
    }
  });
});
