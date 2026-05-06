export type Vector2 = { x: number; y: number };

export const Direction = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export const DIRECTION_VECTORS: Readonly<Record<Direction, Readonly<Vector2>>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const Faction = {
  Player: 'player',
  Enemy: 'enemy',
  Neutral: 'neutral',
} as const;

export type Faction = (typeof Faction)[keyof typeof Faction];

export interface DamageEvent {
  amount: number;
  source: Faction;
  knockback?: Vector2;
}

export interface FloorPalette {
  /** Base color of floor tiles. */
  floorBase: number;
  /** Subtle accent / detail color used in floor tile generation. */
  floorAccent: number;
  /** Base color of walls. */
  wallBase: number;
  /** Lighter highlight on walls (top edge / cracks). */
  wallHighlight: number;
  /** Ambient / background tint visible in negative space. */
  ambient: number;
  /** Bright glow color used for magical accents (mushrooms, runes). */
  glow: number;
}

export interface FloorDecorationDensities {
  /** Per-tile chance that a glowing mushroom is placed. */
  mushroom: number;
  /** Per-tile chance that a solid rock obstacle is placed. */
  rock: number;
  /** Per-tile chance that a decorative tree is placed. */
  tree: number;
}

/**
 * Picks the silhouette set used for ground decorations on a floor. Forest
 * floors get tree + rock + glowing-mushroom; swamp floors swap the tree
 * for a lily pad and the rock for a tangled mangrove-root cluster (the
 * mushroom stays since the palette swap already reads as swamp-y fungi).
 * Mansion floors swap the tree for a candelabrum and the rock for a
 * cracked vase; the mushroom is replaced visually by a floating amethyst
 * mote so the palette reads as gothic-mansion rather than dungeon stone.
 */
export type DecorationStyle = 'forest' | 'swamp' | 'mansion';

export interface FloorTheme {
  id: string;
  displayName: string;
  palette: FloorPalette;
  decorationDensities: FloorDecorationDensities;
  decorationStyle: DecorationStyle;
  /**
   * Weighted enemy roster — the spawner picks `enemySpawnCount` enemies per
   * room from this list. Generic `id: string` so this type can sit in
   * `types/` without depending on `data/enemies.ts` (which would cycle).
   * Concrete data files use the stricter `EnemyRosterEntry` from `data/enemies.ts`.
   */
  enemyRoster: ReadonlyArray<{
    id: string;
    weight: number;
    minPerRoom?: number;
    maxPerRoom?: number;
  }>;
  /**
   * Per-floor HP multiplier applied to all NON-boss enemies on this floor.
   * 1.0 = baseline, 1.5 = +50 %, etc. Bosses ignore this — they get their
   * own DPS-ratio scaling at spawn time so they always feel like a base-stats
   * fight regardless of player damage build. Defaults to 1.0 if unset.
   */
  enemyHpMultiplier?: number;
}

export const RoomKind = {
  Start: 'start',
  Normal: 'normal',
  Boss: 'boss',
  Treasure: 'treasure',
  Shop: 'shop',
} as const;
export type RoomKind = (typeof RoomKind)[keyof typeof RoomKind];

export const DoorKind = {
  Normal: 'normal',
  Boss: 'boss',
  Treasure: 'treasure',
  Shop: 'shop',
} as const;
export type DoorKind = (typeof DoorKind)[keyof typeof DoorKind];

export interface DoorInfo {
  exists: boolean;
  kind: DoorKind;
  /**
   * If true, the door cannot be opened by clearing its room. The player has
   * to spend an inventory key to unlock it. Treasure / shop doors get this
   * flag from `LOCK_FLOOR_THRESHOLD` onward.
   */
  locked?: boolean;
}

export type DoorMap = Readonly<Record<Direction, DoorInfo>>;

/**
 * Generated description of a single room slot. Pure data — no Phaser refs.
 * Produced by `DungeonGenerator`, consumed by `Room` at build time.
 */
export interface RoomDescriptor {
  id: string;
  gx: number;
  gy: number;
  kind: RoomKind;
  doors: DoorMap;
  /** Seed for this room's decoration RNG so layouts vary per slot but replay deterministically. */
  decorationSeed: string;
  /** How many enemies to spawn the first time the player enters. 0 for start/boss. */
  enemySpawnCount: number;
  visited: boolean;
  cleared: boolean;
  /** Pickups left behind on the floor when the player last left this room. */
  pendingPickups?: PickupSnapshot[];
  /**
   * True if this room's special reward has been consumed:
   * - Treasure: pedestal item taken
   * - Shop: all slots bought (Phase 4 Polish)
   * Used so we don't respawn the pedestal on re-entry.
   */
  looted?: boolean;
  /**
   * Slot indices that have already been purchased in this Shop room. JSON-
   * serialisable array (not a Set) so it survives a future save round-trip.
   * Slots not in the list re-spawn on re-entry. Set together with `looted`
   * when the last slot is bought.
   */
  purchasedShopSlots?: number[];
  /**
   * Snapshot of the two item-slot ids rolled on the first visit to this
   * Shop room. Cached so re-entry shows the same items even after the
   * player picks up things elsewhere (which would otherwise change the
   * `pickedIds` exclude set and re-roll different items). Empty string
   * means "no eligible item could be rolled for this slot".
   */
  shopItemIds?: readonly [string, string];
}

export interface PickupSnapshot {
  kind: PickupKind;
  x: number;
  y: number;
}

// --- Items, stats, pickups, drops -------------------------------------------

export const PickupKind = {
  Heart: 'heart',
  HalfHeart: 'halfHeart',
  Coin: 'coin',
  Key: 'key',
  Item: 'item',
  BrownCrate: 'brownCrate',
  GoldCrate: 'goldCrate',
  Gem: 'gem',
} as const;
export type PickupKind = (typeof PickupKind)[keyof typeof PickupKind];

export interface PlayerStats {
  damage: number;        // base 1
  fireRate: number;      // base 1.0 (multiplier — höher = schneller)
  missileSpeed: number;  // base = MISSILE_SPEED
  moveSpeed: number;     // base = PLAYER_SPEED
  missileScale: number;  // base 1.0 — visual scale (additiv via Items)
}
export type StatKey = keyof PlayerStats;

export interface ItemEffect {
  stat: StatKey;
  add?: number;
  mult?: number;
}

export interface ItemModifier {
  itemId: string;
  effects: readonly ItemEffect[];
  /** Optional: überschreibt die Missile-Tint-Farbe (latest-wins). */
  missileTint?: number;
}

export const ItemPool = {
  Treasure: 'treasure',
  Shop: 'shop',
  Boss: 'boss',
} as const;
export type ItemPool = (typeof ItemPool)[keyof typeof ItemPool];

/**
 * Static definition of an item, lives in `data/items.ts`. Effects are
 * applied to the player's `StatsSystem` via `ItemSystem.pickUp`. Optional
 * `missileTint` overrides the missile colour (latest-wins via StatsSystem).
 */
export interface ItemDefinition {
  id: string;
  displayName: string;
  description: string;
  textureKey: string;
  pools: readonly ItemPool[];
  effects: readonly ItemEffect[];
  /** Optional: pinkifies the missile etc. — latest pickup wins. */
  missileTint?: number;
  /** Shop price in coins. Treasure-pool ignores this. */
  shopPrice?: number;
  /** Pool-pick weight. Default 1. */
  weight?: number;
  /**
   * Optional: when set, picking the item raises the player's max HP by this
   * amount AND heals the player by the same amount, so the new heart spawns
   * already filled. Used by HP-up items (Heart Container, Ancient Heart).
   */
  maxHealthBonus?: number;
  /**
   * Optional floor affinity. Currently only enforced for boss-pool picks —
   * a Sapphire boss won't drop a Crown of the Vine and vice versa. Treasure
   * + shop pools ignore this field (those items are floor-agnostic). Plain
   * `string` to avoid a circular import with `data/floors.ts`.
   */
  floor?: string;
}

export interface DropTableEntry {
  pickup: PickupKind; // Heart | Coin | Key (HalfHeart/Item nicht für Drops)
  weight: number;
}
export interface DropTable {
  /** Gesamt-Chance dass etwas droppt. */
  chance: number;
  entries: readonly DropTableEntry[];
}
