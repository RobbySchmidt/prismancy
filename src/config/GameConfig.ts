import type { DropTable, PlayerStats } from '../types';

export const TILE_SIZE = 64;

export const ROOM_WIDTH_TILES = 15;
export const ROOM_HEIGHT_TILES = 9;

export const GAME_WIDTH = ROOM_WIDTH_TILES * TILE_SIZE;
export const GAME_HEIGHT = ROOM_HEIGHT_TILES * TILE_SIZE;

export const WALL_THICKNESS = TILE_SIZE;

export const PLAYER_SPEED = 220;
export const PLAYER_MAX_HEALTH = 6;
export const PLAYER_HITBOX_RADIUS = 13;
export const PLAYER_INVINCIBILITY_MS = 800;

export const MISSILE_SPEED = 420;
export const MISSILE_LIFETIME_MS = 900;
export const MISSILE_RADIUS = 8;
export const MISSILE_DAMAGE = 1;
export const MISSILE_FIRE_INTERVAL_MS = 250;
export const MISSILE_POOL_SIZE = 64;

export const KNOCKBACK_FORCE_PLAYER = 280;
export const KNOCKBACK_FORCE_ENEMY = 220;
export const KNOCKBACK_DURATION_MS = 120;

export const HIT_FLASH_DURATION_MS = 90;
export const HIT_FLASH_TINT_PLAYER = 0xff5577;
export const HIT_FLASH_TINT_ENEMY = 0xffffff;

export const SCREEN_SHAKE_DURATION_MS = 160;
export const SCREEN_SHAKE_INTENSITY = 0.006;

/** Each heart represents this many HP. 2 = full + half hearts (Isaac-style). */
export const HP_PER_HEART = 2;

/** Hitbox radius (px) of all walk-over pickups (heart / coin / key). */
export const PICKUP_HITBOX_RADIUS = 8;

/**
 * Vertical offset (px) the item icon sits above the pedestal's center so the
 * icon visually rests on top of the altar instead of inside it.
 */
export const ITEM_FLOAT_OFFSET = 8;

// --- Dungeon generation ------------------------------------------------------

/** Side length of the room slot grid the random walk operates on. */
export const DUNGEON_GRID_SIZE = 5;
/** Target number of rooms per floor. */
export const DUNGEON_TARGET_ROOM_COUNT = 8;
/** Hard upper bound on random-walk iterations to avoid pathological loops. */
export const DUNGEON_GENERATOR_MAX_ITERATIONS = 5000;

/** Door tile coordinates within a room (centered on each wall). */
export const DOOR_TILE = {
  N: { tx: 7, ty: 0 },
  S: { tx: 7, ty: 8 },
  W: { tx: 0, ty: 4 },
  E: { tx: 14, ty: 4 },
} as const;

/** Where the player respawns when entering a room from each direction. */
export const ROOM_ENTRY_OFFSET_TILES = 1.5;

/** How many enemies a non-special room spawns. Random pick within this range. */
export const ROOM_ENEMY_COUNT_MIN = 3;
export const ROOM_ENEMY_COUNT_MAX = 5;

/** Min distance (px) between player spawn and enemy spawn positions. */
export const SAFE_SPAWN_DISTANCE = 3 * TILE_SIZE;
/** Number of attempts to find a safe enemy spawn before falling back to the last roll. */
export const SAFE_SPAWN_MAX_ATTEMPTS = 16;
/** Invincibility granted to the player when entering an uncleared room. */
export const ROOM_ENTRY_GRACE_MS = 700;

// --- Enemy projectiles -------------------------------------------------------

export const ENEMY_PROJECTILE_SPEED = 240;
export const ENEMY_PROJECTILE_LIFETIME_MS = 1500;
export const ENEMY_PROJECTILE_DAMAGE = 1;
export const ENEMY_PROJECTILE_RADIUS = 8;
export const ENEMY_PROJECTILE_POOL_SIZE = 32;

// --- Mossy Slime -------------------------------------------------------------

export const MOSSY_SLIME_HOP_DURATION_MS = 280;
export const MOSSY_SLIME_WAIT_MIN_MS = 600;
export const MOSSY_SLIME_WAIT_MAX_MS = 1100;
/** Half-cone width (radians) of the hop direction bias toward the player. */
export const MOSSY_SLIME_HOP_BIAS_RAD = 1.1;

// --- Vine Sprout -------------------------------------------------------------

export const VINE_SPROUT_FIRE_INTERVAL_MS = 1500;
/** Initial delay before the first shot, so the player has time to react when entering. */
export const VINE_SPROUT_FIRE_INITIAL_DELAY_MS = 700;

// --- Vine Lord (boss) --------------------------------------------------------

/** Phase 1: 3-thorn fan cooldown (centre + ±15°). */
export const VINE_LORD_PHASE1_INTERVAL_MS = 1200;
/** Half-spread (radians) of the side thorns in phase 1's fan. 15° ≈ 0.2618. */
export const VINE_LORD_FAN_SPREAD_RAD = (15 * Math.PI) / 180;
/** Phase 2: radial 8-thorn wave cooldown. */
export const VINE_LORD_PHASE2_WAVE_INTERVAL_MS = 1500;
/** Phase 2: vine-sprout add spawn cooldown. */
export const VINE_LORD_PHASE2_ADD_INTERVAL_MS = 4000;
/** Phase 2: max simultaneously alive vine-sprout adds. */
export const VINE_LORD_PHASE2_MAX_ADDS = 3;
/** Visual scale for the boss sprite (relative to the Vine Sprout texture). */
export const VINE_LORD_VISUAL_SCALE = 2.5;
/** Initial delay before the boss starts shooting after spawning. */
export const VINE_LORD_FIRE_INITIAL_DELAY_MS = 900;
/** Phase-change tint flash duration. */
export const VINE_LORD_PHASE_FLASH_MS = 200;

// --- Pixie Dancer ------------------------------------------------------------

export const PIXIE_IDEAL_DISTANCE = 180;
/** Maximum component the radial (approach/retreat) impulse can take. */
export const PIXIE_RADIAL_GAIN = 1.6;
/** Tangential strafing component (kept slightly below 1 so the radial pull always wins long-term). */
export const PIXIE_TANGENT_RATIO = 0.85;
/** Cooldown between thorn shots — slow because the pixie is also a contact-damage threat. */
export const PIXIE_FIRE_INTERVAL_MS = 2400;
/** Initial delay before the first shot so the player can read the spawn before getting peppered. */
export const PIXIE_FIRE_INITIAL_DELAY_MS = 1200;

// --- Mossy Behemoth (boss) ---------------------------------------------------

/** Phase 1: cooldown (ms) between consecutive hops. */
export const MOSSY_BEHEMOTH_PHASE1_HOP_INTERVAL_MS = 1400;
/** Phase 2: shorter cooldown — boss is angrier. */
export const MOSSY_BEHEMOTH_PHASE2_HOP_INTERVAL_MS = 900;
/** Duration (ms) of one hop arc — sets velocity for this long, then halts. */
export const MOSSY_BEHEMOTH_HOP_DURATION_MS = 320;
/** Visual scale applied to the boss texture. */
export const MOSSY_BEHEMOTH_VISUAL_SCALE = 1.6;
/** Initial delay before the first hop after spawn. */
export const MOSSY_BEHEMOTH_HOP_INITIAL_DELAY_MS = 700;
/** Phase 2: max simultaneously alive mossy-slime adds spawned on landing. */
export const MOSSY_BEHEMOTH_PHASE2_MAX_ADDS = 4;
/** On death: minimum number of adds the boss splits into. */
export const MOSSY_BEHEMOTH_DEATH_SPLIT_MIN = 2;
/** On death: maximum number of adds the boss splits into. */
export const MOSSY_BEHEMOTH_DEATH_SPLIT_MAX = 3;
/** Phase-change tint flash duration. */
export const MOSSY_BEHEMOTH_PHASE_FLASH_MS = 200;

// --- Pixie Queen (boss) ------------------------------------------------------

/** Phase 1: cooldown (ms) between teleports. */
export const PIXIE_QUEEN_PHASE1_TELEPORT_INTERVAL_MS = 2000;
/** Phase 2: shorter teleport cooldown. */
export const PIXIE_QUEEN_PHASE2_TELEPORT_INTERVAL_MS = 1400;
/** Sparkle / fade-out window before teleporting (ms). */
export const PIXIE_QUEEN_TELEPORT_FADE_MS = 200;
/** Phase 2: cooldown (ms) between Pixie Dancer add spawns. */
export const PIXIE_QUEEN_PHASE2_ADD_INTERVAL_MS = 3000;
/** Phase 2: max simultaneously alive Pixie Dancer adds. */
export const PIXIE_QUEEN_PHASE2_MAX_ADDS = 3;
/** Initial delay before the first teleport after spawn. */
export const PIXIE_QUEEN_TELEPORT_INITIAL_DELAY_MS = 800;
/** Visual scale applied to the boss texture. */
export const PIXIE_QUEEN_VISUAL_SCALE = 1.4;
/** Phase-change tint flash duration. */
export const PIXIE_QUEEN_PHASE_FLASH_MS = 200;
/** Min distance (px) the random fallback teleport keeps from the player. */
export const PIXIE_QUEEN_FALLBACK_MIN_DISTANCE = 3 * 64;

// --- Forest Heart (boss) -----------------------------------------------------

/** Phase 1: cooldown (ms) between radial waves. */
export const FOREST_HEART_PHASE1_WAVE_INTERVAL_MS = 1800;
/** Phase 2: faster radial waves. */
export const FOREST_HEART_PHASE2_WAVE_INTERVAL_MS = 1400;
/** Phase 2: cooldown (ms) between Forest Sprite add spawns. */
export const FOREST_HEART_PHASE2_ADD_INTERVAL_MS = 2500;
/** Number of thorns per radial wave (evenly spaced full circle). */
export const FOREST_HEART_WAVE_THORN_COUNT = 6;
/** Initial delay before the first wave after spawn. */
export const FOREST_HEART_FIRE_INITIAL_DELAY_MS = 900;
/** Visual scale applied to the boss texture. */
export const FOREST_HEART_VISUAL_SCALE = 1.0;
/** Phase-change tint flash duration. */
export const FOREST_HEART_PHASE_FLASH_MS = 220;
/** Phase 1 pulse tween scale low / high bounds. */
export const FOREST_HEART_PHASE1_PULSE_LOW = 0.95;
export const FOREST_HEART_PHASE1_PULSE_HIGH = 1.05;
/** Phase 2 pulse tween scale low / high bounds (more intense). */
export const FOREST_HEART_PHASE2_PULSE_LOW = 0.9;
export const FOREST_HEART_PHASE2_PULSE_HIGH = 1.15;
/** Phase 1 pulse duration (one direction). */
export const FOREST_HEART_PHASE1_PULSE_DURATION_MS = 1100;
/** Phase 2 pulse duration (faster). */
export const FOREST_HEART_PHASE2_PULSE_DURATION_MS = 700;

export const BACKGROUND_COLOR = '#08060c';

export const FLOOR_TILE_VARIANTS = 3;

/** Tiles within this many tiles of the room center are kept clear of
 * decorations so the player has a safe spawn area. 1 = 3×3 zone. */
export const SPAWN_SAFE_RADIUS_TILES = 1;

export const TextureKeys = {
  Player: 'tex-player',
  MagicMissile: 'tex-missile',
  Thorn: 'tex-enemy-thorn',
  ForestSprite: 'tex-enemy-forest-sprite',
  MossySlime: 'tex-enemy-mossy-slime',
  VineSprout: 'tex-enemy-vine-sprout',
  PixieDancer: 'tex-enemy-pixie-dancer',
  HeartFull: 'tex-heart-full',
  HeartHalf: 'tex-heart-half',
  HeartEmpty: 'tex-heart-empty',
  Coin: 'tex-coin',
  Key: 'tex-key',
  BrownCrate: 'tex-brown-crate',
  GoldCrate: 'tex-gold-crate',
  ItemPedestal: 'tex-item-pedestal',
  ItemMagicTome: 'tex-item-magic-tome',
  ItemHotTea: 'tex-item-hot-tea',
  ItemWizardSneakers: 'tex-item-wizard-sneakers',
  ItemTelescopicWand: 'tex-item-telescopic-wand',
  ItemLeadCap: 'tex-item-lead-cap',
  ItemCaffeinePill: 'tex-item-caffeine-pill',
  ItemPixieDust: 'tex-item-pixie-dust',
  ItemHeartContainer: 'tex-item-heart-container',
  ItemCrownOfTheVine: 'tex-item-crown-of-the-vine',
  ItemAncientHeart: 'tex-item-ancient-heart',
  ItemWitheredFang: 'tex-item-withered-fang',
  BossMossyBehemoth: 'tex-boss-mossy-behemoth',
  BossPixieQueen: 'tex-boss-pixie-queen',
  BossForestHeart: 'tex-boss-forest-heart',
} as const;

export type TextureKey = (typeof TextureKeys)[keyof typeof TextureKeys];

/**
 * Per-floor texture keys. PreloadScene generates one texture per (floor,
 * variant) combination so each floor can have its own visual palette.
 */
export function floorTileKey(floorId: string, variant: number): string {
  return `tex-floor-${floorId}-${variant}`;
}

export function wallTileKey(floorId: string): string {
  return `tex-wall-${floorId}`;
}

export function mushroomDecoKey(floorId: string): string {
  return `tex-mushroom-${floorId}`;
}

export function rockDecoKey(floorId: string): string {
  return `tex-rock-${floorId}`;
}

export function treeDecoKey(floorId: string): string {
  return `tex-tree-${floorId}`;
}

export function bossDoorKey(floorId: string): string {
  return `tex-bossdoor-${floorId}`;
}

export function treasureDoorKey(floorId: string): string {
  return `tex-treasuredoor-${floorId}`;
}

export function shopDoorKey(floorId: string): string {
  return `tex-shopdoor-${floorId}`;
}

/**
 * Gem pickup texture key per floor — drawn in the floor's glow palette so the
 * trophy reads as themed to the floor it was earned on. Used for no-hit
 * boss-room rewards.
 */
export function gemTextureKey(floorId: string): string {
  return `tex-gem-${floorId}`;
}

// --- Items / stats baseline --------------------------------------------------

/**
 * Default missile tint when no item modifier overrides it. Equal to Phaser's
 * "no tint" sentinel so `setTint(DEFAULT_MISSILE_TINT)` is functionally a
 * `clearTint()` for all white-channel sprites.
 */
export const DEFAULT_MISSILE_TINT = 0xffffff;

/**
 * Floor index from which item rooms / pedestals start locking on entry.
 * Pure constant for now — wired up in a later chunk.
 */
export const LOCK_FLOOR_THRESHOLD = 2;

/**
 * Coin balance the player starts a fresh run with. TEMPORARY test value so
 * the user can poke the shop without farming drops first; will move to 0
 * (or be derived from meta-progression) once the run-economy is balanced.
 */
export const STARTING_COINS = 50;

/**
 * Shop pricing + slot layout. Heart / Key prices are flat; item prices come
 * from `ItemDefinition.shopPrice` and fall back to `SHOP_DEFAULT_ITEM_PRICE`.
 * `SHOP_SLOT_COUNT` slots get evenly spaced around the room center along the
 * X axis, `SHOP_SLOT_SPACING` px apart.
 */
export const SHOP_PRICES = {
  heart: 3,
  key: 5,
} as const;
export const SHOP_DEFAULT_ITEM_PRICE = 15;
export const SHOP_SLOT_COUNT = 4;
export const SHOP_SLOT_SPACING = 96;
/**
 * Minimum interval (ms) between consecutive reject-feedback flashes on a
 * single shop pickup. The player↔pickup overlap fires every frame the player
 * is touching the slot, so without this throttle we'd respawn the wackel-tween
 * dozens of times per second.
 */
export const SHOP_REJECT_COOLDOWN_MS = 600;

/**
 * Baseline player stats. Read from the existing tuning constants so the
 * source of truth for damage/speed values stays at the top of this file.
 * Items modify a per-run copy of this via StatsSystem; this object itself
 * is treated as immutable.
 */
export const BASE_PLAYER_STATS: PlayerStats = {
  damage: MISSILE_DAMAGE,
  fireRate: 1.0,
  missileSpeed: MISSILE_SPEED,
  range: 1.0,
  moveSpeed: PLAYER_SPEED,
  missileScale: 1.0,
};

/**
 * Default loot table for a cleared normal room. 55% chance to drop
 * something; weighted pick between heart, coin, key, brown / gold crate.
 * Items live on pedestals so they're not drops.
 *
 * Total weight 10.3 → brown crate ≈14.6 % per drop event, gold ≈2.9 %.
 * With chance=0.55 that lands at roughly 8 % brown / 1.6 % gold per
 * cleared room.
 */
export const DEFAULT_DROP_TABLE_NORMAL: DropTable = {
  chance: 0.55,
  entries: [
    { pickup: 'heart', weight: 2 },
    { pickup: 'coin', weight: 5 },
    { pickup: 'key', weight: 1.5 },
    { pickup: 'brownCrate', weight: 1.5 },
    { pickup: 'goldCrate', weight: 0.3 },
  ],
};

export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  MainMenu: 'MainMenuScene',
  Game: 'GameScene',
  UI: 'UIScene',
  GameOver: 'GameOverScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
