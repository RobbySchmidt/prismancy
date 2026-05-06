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
    coinDropChance: 0.4,
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
    coinDropChance: 0.55,
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
    coinDropChance: 0.65,
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
    coinDropChance: 0.45,
  },
  'bog-frog': {
    id: 'bog-frog',
    textureKey: TextureKeys.BogFrog,
    displayName: 'Bog Frog',
    /** Mid-tier HP. Hops between shots, fires a fast tongue projectile. */
    hp: 5,
    contactDamage: 1,
    /** Hop velocity (px/s) during the reposition hop, zero otherwise. */
    moveSpeed: 220,
    hitboxRadius: 12,
    floor: 'sapphire-swamp',
    coinDropChance: 0.5,
  },
  'snapper-bloom': {
    id: 'snapper-bloom',
    textureKey: TextureKeys.SnapperBloom,
    displayName: 'Snapper Bloom',
    /** Rooted, tankier than vine-sprout because the 3-thorn fan is harder to dodge. */
    hp: 6,
    contactDamage: 1,
    moveSpeed: 0,
    hitboxRadius: 14,
    floor: 'sapphire-swamp',
    coinDropChance: 0.7,
  },
  'damselfly': {
    id: 'damselfly',
    textureKey: TextureKeys.Damselfly,
    displayName: 'Damselfly',
    /** Glass cannon: low HP, fast strafing, dash-bursts twin projectiles.
     * HP bumped from 3 → 4 in the visibility pass — at 3 HP the player
     * was killing them too fast to register them as a distinct enemy
     * type, on top of the cyan body blending into the Sapphire floor. */
    hp: 4,
    contactDamage: 1,
    moveSpeed: 180,
    hitboxRadius: 11,
    floor: 'sapphire-swamp',
    coinDropChance: 0.45,
  },
  'bog-tortoise': {
    id: 'bog-tortoise',
    textureKey: TextureKeys.BogTortoise,
    displayName: 'Bog Tortoise',
    /** Tankiest non-boss mob. Slow walker; periodically retracts into shell
     * (invulnerable, brief) then pops out with a 6-thorn radial burst. */
    hp: 8,
    contactDamage: 1,
    /** Walk speed handled by class with BOG_TORTOISE_WALK_SPEED — definition value
     * matches so any future generic spawner reads it consistently. */
    moveSpeed: 60,
    hitboxRadius: 15,
    floor: 'sapphire-swamp',
    coinDropChance: 0.7,
  },
  wraith: {
    id: 'wraith',
    textureKey: TextureKeys.Wraith,
    displayName: 'Wraith',
    /** Onyx-tier chaser. HP scaled to floor 3: at endgame damage levels
     * the original 2 HP got one-shot before the phasing mechanic could
     * even read. At 5, the player has to time hits across multiple
     * intangible cycles instead of burst-killing on appearance. */
    hp: 5,
    contactDamage: 1,
    moveSpeed: 100,
    hitboxRadius: 12,
    floor: 'onyx-mansion',
    coinDropChance: 0.5,
  },
  'possessed-candelabra': {
    id: 'possessed-candelabra',
    textureKey: TextureKeys.PossessedCandelabra,
    displayName: 'Possessed Candelabra',
    /** Slow tank — onyx-tier HP so its dual-threat layer (wax-puddle
     * trail + flame cone) actually pressures the player long enough to
     * matter. Was 5 — bumped to 9 for floor-3 damage scaling. */
    hp: 9,
    contactDamage: 1,
    moveSpeed: 55,
    hitboxRadius: 13,
    floor: 'onyx-mansion',
    coinDropChance: 0.65,
  },
  'cursed-mirror': {
    id: 'cursed-mirror',
    textureKey: TextureKeys.CursedMirror,
    displayName: 'Cursed Mirror',
    /** Rooted homing-shot mirror — telegraphs then fires a tracking
     * missile. HP bumped from 3 → 7 for floor-3 scaling so the player
     * has to dodge multiple homing shots per mirror, not just one. */
    hp: 7,
    contactDamage: 1,
    /** Rooted — physics body has moves=false so this number doesn't apply. */
    moveSpeed: 0,
    hitboxRadius: 14,
    floor: 'onyx-mansion',
    coinDropChance: 0.6,
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
  'boss-toad-sovereign': {
    id: 'boss-toad-sovereign',
    textureKey: TextureKeys.BossToadSovereign,
    displayName: 'Toad Sovereign',
    hp: 70,
    contactDamage: 1,
    /** Hop velocity — applied during each hop arc, zero between. */
    moveSpeed: 280,
    hitboxRadius: 22,
    floor: 'sapphire-swamp',
    coinDropChance: 0,
  },
  'boss-bloomheart': {
    id: 'boss-bloomheart',
    textureKey: TextureKeys.BossBloomheart,
    displayName: 'Bloomheart',
    hp: 60,
    contactDamage: 1,
    /** Rooted — physics body has moves=false in Bloomheart. */
    moveSpeed: 0,
    hitboxRadius: 22,
    floor: 'sapphire-swamp',
    coinDropChance: 0,
  },
  'boss-damselfly-empress': {
    id: 'boss-damselfly-empress',
    textureKey: TextureKeys.BossDamselflyEmpress,
    displayName: 'Damselfly Empress',
    hp: 50,
    contactDamage: 1,
    /** Dash velocity — applied during each dash, zero between. */
    moveSpeed: 360,
    hitboxRadius: 18,
    floor: 'sapphire-swamp',
    coinDropChance: 0,
  },
  'boss-bog-colossus': {
    id: 'boss-bog-colossus',
    textureKey: TextureKeys.BossBogColossus,
    displayName: 'Bog Colossus',
    hp: 75,
    contactDamage: 1,
    /** Slow walk speed — see Bog Colossus class for the shell-pop pause. */
    moveSpeed: 50,
    hitboxRadius: 26,
    floor: 'sapphire-swamp',
    coinDropChance: 0,
  },
  'boss-crimson-lord': {
    id: 'boss-crimson-lord',
    textureKey: TextureKeys.BossCrimsonLord,
    displayName: 'Crimson Lord',
    hp: 35,
    contactDamage: 1,
    moveSpeed: 100,
    hitboxRadius: 18,
    floor: 'onyx-mansion',
    coinDropChance: 0,
  },
  'boss-sapphire-marquis': {
    id: 'boss-sapphire-marquis',
    textureKey: TextureKeys.BossSapphireMarquis,
    displayName: 'Sapphire Marquis',
    hp: 35,
    contactDamage: 1,
    moveSpeed: 60,
    hitboxRadius: 16,
    floor: 'onyx-mansion',
    coinDropChance: 0,
  },
  'boss-lord-onyx': {
    id: 'boss-lord-onyx',
    textureKey: TextureKeys.BossLordOnyx,
    displayName: 'Lord Onyx',
    hp: 90,
    contactDamage: 1,
    /** Rooted at the seal — moves=false in the LordOnyx class. */
    moveSpeed: 0,
    hitboxRadius: 22,
    floor: 'onyx-mansion',
    coinDropChance: 0,
  },
} as const satisfies Record<string, EnemyDefinition>;

export type EnemyId = keyof typeof ENEMIES;

export interface EnemyRosterEntry {
  id: EnemyId;
  weight: number;
  /** Force-spawn at least this many of this enemy in every combat room on
   * the floor, before the weighted-pick fills remaining slots. Use to
   * guarantee a niche threat type appears (e.g. one Cursed Mirror per
   * mansion room so it can interact with the Wraiths). */
  minPerRoom?: number;
}
