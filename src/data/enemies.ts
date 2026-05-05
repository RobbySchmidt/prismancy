import { TextureKeys } from '../config/GameConfig';

export interface EnemyDefinition {
  id: string;
  textureKey: string;
  displayName: string;
  hp: number;
  /** Damage dealt to player on contact (in HP, where 1 HP = half heart). */
  contactDamage: number;
  /** Movement speed in px/s. Interpretation depends on the AI. */
  moveSpeed: number;
  /** Circular hitbox radius for combat collisions. */
  hitboxRadius: number;
  /**
   * Floor this enemy belongs to. Plain string to avoid a circular import
   * with `data/floors.ts` (which depends on `EnemyRosterEntry` here);
   * concrete IDs come from `FloorId` in `data/floors.ts`.
   */
  floor: string;
  /**
   * Per-kill probability (0..1) that this enemy drops a single coin on death.
   * 0 = never drops (used for bosses, which have their own reward flow). The
   * roll fires from BaseEnemy.die() before the death tween.
   */
  coinDropChance: number;
}

/**
 * Enemy roster keyed by id. New enemies must be tagged with the floor they
 * belong to (project memory: gemstone-themed floors get themed rosters).
 */
export const ENEMIES = {
  'forest-sprite': {
    id: 'forest-sprite',
    textureKey: TextureKeys.ForestSprite,
    displayName: 'Forest Sprite',
    hp: 3,
    contactDamage: 1,
    moveSpeed: 110,
    hitboxRadius: 12,
    floor: 'emerald-forest',
    coinDropChance: 0.15,
  },
  'mossy-slime': {
    id: 'mossy-slime',
    textureKey: TextureKeys.MossySlime,
    displayName: 'Mossy Slime',
    hp: 5,
    contactDamage: 1,
    /** Speed during a hop (zero between hops). */
    moveSpeed: 280,
    hitboxRadius: 14,
    floor: 'emerald-forest',
    coinDropChance: 0.25,
  },
  'vine-sprout': {
    id: 'vine-sprout',
    textureKey: TextureKeys.VineSprout,
    displayName: 'Vine Sprout',
    /** Tankier than the contact mobs since it can't dodge. */
    hp: 4,
    contactDamage: 1,
    /** Rooted — physics body has moves=false so this number doesn't apply. */
    moveSpeed: 0,
    hitboxRadius: 14,
    floor: 'emerald-forest',
    coinDropChance: 0.3,
  },
  'pixie-dancer': {
    id: 'pixie-dancer',
    textureKey: TextureKeys.PixieDancer,
    displayName: 'Pixie Dancer',
    /** Glass cannon: orbits the player at distance, hard to hit but dies fast. */
    hp: 2,
    contactDamage: 1,
    moveSpeed: 140,
    hitboxRadius: 10,
    floor: 'emerald-forest',
    coinDropChance: 0.2,
  },
  'boss-vine-lord': {
    id: 'boss-vine-lord',
    /**
     * Reuses the Vine Sprout texture; `VineLord` scales the sprite up at
     * spawn-time (setScale 2.5) so the player reads it as a beefier sibling.
     */
    textureKey: TextureKeys.VineSprout,
    displayName: 'Vine Lord',
    /** 60 HP — ~15 s fight at base damage so each phase has presence. */
    hp: 60,
    contactDamage: 1,
    /** Rooted at room center; physics body has moves=false in VineLord. */
    moveSpeed: 0,
    /** Visual is 2.5× scaled, so the hitbox is bumped to match (set in the class). */
    hitboxRadius: 14,
    floor: 'emerald-forest',
    coinDropChance: 0,
  },
  'boss-mossy-behemoth': {
    id: 'boss-mossy-behemoth',
    textureKey: TextureKeys.BossMossyBehemoth,
    displayName: 'Mossy Behemoth',
    hp: 60,
    contactDamage: 1,
    /** Hop-velocity (px/s) during a hop arc, zero between hops. */
    moveSpeed: 60,
    hitboxRadius: 30,
    floor: 'emerald-forest',
    coinDropChance: 0,
  },
  'boss-pixie-queen': {
    id: 'boss-pixie-queen',
    textureKey: TextureKeys.BossPixieQueen,
    displayName: 'Pixie Queen',
    /** Glass-cannon-ish boss: lower HP, but teleport-shielded. */
    hp: 50,
    contactDamage: 1,
    /** No arcade-velocity movement — teleports instead. */
    moveSpeed: 0,
    hitboxRadius: 22,
    floor: 'emerald-forest',
    coinDropChance: 0,
  },
  'boss-forest-heart': {
    id: 'boss-forest-heart',
    textureKey: TextureKeys.BossForestHeart,
    displayName: 'Forest Heart',
    /** Tankiest of the four (stationary, predictable patterns). */
    hp: 70,
    contactDamage: 1,
    /** Stationary — physics body has moves=false in ForestHeart. */
    moveSpeed: 0,
    hitboxRadius: 28,
    floor: 'emerald-forest',
    coinDropChance: 0,
  },
} as const satisfies Record<string, EnemyDefinition>;

export type EnemyId = keyof typeof ENEMIES;

export interface EnemyRosterEntry {
  id: EnemyId;
  weight: number;
}
