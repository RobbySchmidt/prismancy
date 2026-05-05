import { PickupKind } from '../types';
import { type RNG } from '../utils/RNG';

/**
 * Single drop entry inside a crate roll. The roll picks one `CrateOutcome`
 * from a weighted table; the outcome can hold multiple entries (e.g.
 * "1 Coin + 1 Heart") so we can produce combo bursts.
 */
export interface CrateDropEntry {
  kind: PickupKind; // Heart | Coin | Key | Item
  count: number;
}

export interface CrateOutcome {
  entries: readonly CrateDropEntry[];
  weight: number;
  /**
   * If the entry contains an `Item` kind, this hints which pool to roll the
   * concrete item from. Currently only `'treasure'` is used (see
   * `GoldCratePickup`).
   */
  itemPool?: 'treasure' | 'shop';
}

/**
 * Brown crates: free walk-up, modest loot. Combos lean toward coins, with a
 * sprinkle of hearts / keys so they still feel like a reward when the
 * player is hurting.
 */
export const BROWN_CRATE_TABLE: readonly CrateOutcome[] = [
  { entries: [{ kind: PickupKind.Coin, count: 2 }], weight: 4 },
  { entries: [{ kind: PickupKind.Coin, count: 3 }], weight: 3 },
  { entries: [{ kind: PickupKind.Heart, count: 1 }], weight: 2 },
  { entries: [{ kind: PickupKind.Key, count: 1 }], weight: 1 },
  {
    entries: [
      { kind: PickupKind.Coin, count: 1 },
      { kind: PickupKind.Heart, count: 1 },
    ],
    weight: 2,
  },
  {
    entries: [
      { kind: PickupKind.Coin, count: 1 },
      { kind: PickupKind.Key, count: 1 },
    ],
    weight: 1,
  },
];

/**
 * Gold crates: locked, key-gated, richer pool. Includes a rare treasure-pool
 * item slot so spending a key on one is a real strategic call when the
 * player is sitting on multiple keys.
 */
export const GOLD_CRATE_TABLE: readonly CrateOutcome[] = [
  { entries: [{ kind: PickupKind.Coin, count: 5 }], weight: 3 },
  {
    entries: [
      { kind: PickupKind.Coin, count: 3 },
      { kind: PickupKind.Heart, count: 1 },
    ],
    weight: 3,
  },
  {
    entries: [
      { kind: PickupKind.Coin, count: 2 },
      { kind: PickupKind.Heart, count: 1 },
      { kind: PickupKind.Key, count: 1 },
    ],
    weight: 3,
  },
  {
    entries: [
      { kind: PickupKind.Heart, count: 2 },
      { kind: PickupKind.Coin, count: 2 },
    ],
    weight: 2,
  },
  {
    entries: [
      { kind: PickupKind.Key, count: 2 },
      { kind: PickupKind.Coin, count: 3 },
    ],
    weight: 2,
  },
  // Rare: treasure-pool item bonus + a couple of coins for the road.
  {
    entries: [
      { kind: PickupKind.Item, count: 1 },
      { kind: PickupKind.Coin, count: 2 },
    ],
    itemPool: 'treasure',
    weight: 1,
  },
];

/**
 * Roll a single crate outcome from `table`. Deterministic: same RNG state +
 * same table → same outcome. Falls back to the first entry if the picker
 * somehow returns null (table is non-empty by construction so this only
 * guards against a future regression in `RNG.pickWeighted`).
 */
export function rollCrateContents(
  table: readonly CrateOutcome[],
  rng: RNG,
): CrateOutcome {
  const result = rng.pickWeighted(table, (o) => o.weight);
  return result ?? table[0]!;
}
