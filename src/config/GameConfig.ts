import type { DropTable, PlayerStats } from '../types';

export const TILE_SIZE = 64;

export const ROOM_WIDTH_TILES = 15;
export const ROOM_HEIGHT_TILES = 9;

export const GAME_WIDTH = ROOM_WIDTH_TILES * TILE_SIZE;
export const GAME_HEIGHT = ROOM_HEIGHT_TILES * TILE_SIZE;

export const WALL_THICKNESS = TILE_SIZE;

/**
 * Main-camera zoom factor. 1.0 = whole room visible at once (Isaac-style).
 * Bumped past 1.0 zooms into the player + scrolls — broken for bullet-hell
 * boss rooms because the player can't see incoming projectiles, so this
 * stays at 1.0 by default and we make sprites larger via `WORLD_SPRITE_SCALE`
 * instead.
 */
export const CAMERA_ZOOM = 1.0;

/**
 * Visual scale applied to in-world sprites (player, enemies, pickups,
 * decorations, items) — purely cosmetic. Hitboxes / physics bodies stay at
 * their authored sizes, so increasing this makes the *visual* sprite read
 * larger inside the room without changing collisions or movement distances.
 *
 * Tile / wall textures aren't scaled by this — they're rendered as a
 * tiling grid that has to stay pixel-aligned, so making them bigger needs
 * a TILE_SIZE bump instead. 1.25 = "a step bigger but still readable",
 * 1.5 = noticeable, 2.0 = pixel-perfect doubled (might feel cramped).
 */
export const WORLD_SPRITE_SCALE = 1.25;

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
export const VINE_LORD_VISUAL_SCALE = 2.5 * WORLD_SPRITE_SCALE;
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
export const MOSSY_BEHEMOTH_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;
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
export const PIXIE_QUEEN_VISUAL_SCALE = 1.4 * WORLD_SPRITE_SCALE;
/** Phase-change tint flash duration. */
export const PIXIE_QUEEN_PHASE_FLASH_MS = 200;
/** Min distance (px) the random fallback teleport keeps from the player. */
export const PIXIE_QUEEN_FALLBACK_MIN_DISTANCE = 3 * 64;

// --- Bog Frog (Floor 2) ------------------------------------------------------

/** Idle-then-shoot tongue cycle (ms). Telegraph + shot + post-shot wait + hop. */
export const BOG_FROG_IDLE_MS = 1200;
export const BOG_FROG_TELEGRAPH_MS = 400;
export const BOG_FROG_POST_SHOT_MS = 600;
/** Hop reposition: short distance + duration so the frog moves before re-arming. */
export const BOG_FROG_HOP_DURATION_MS = 280;
export const BOG_FROG_HOP_DISTANCE = 80;
/** Tongue projectile speed (px/s). Faster than the standard enemy thorn so it actually pressures the player. */
export const BOG_FROG_TONGUE_SPEED = 280;

// --- Snapper Bloom (Floor 2, rooted) -----------------------------------------

/** Cooldown between 3-thorn fan bursts. */
export const SNAPPER_BLOOM_FIRE_INTERVAL_MS = 1800;
/** Initial delay before the first burst so the player can read the spawn. */
export const SNAPPER_BLOOM_FIRE_INITIAL_DELAY_MS = 900;
/** Mouth-open telegraph window (ms) before the burst leaves. */
export const SNAPPER_BLOOM_TELEGRAPH_MS = 300;
/** Fan half-spread (radians). 18° ≈ 0.314. */
export const SNAPPER_BLOOM_FAN_SPREAD_RAD = (18 * Math.PI) / 180;

// --- Damselfly (Floor 2) -----------------------------------------------------

/** Kept distance from the player while strafing. */
export const DAMSELFLY_IDEAL_DISTANCE = 160;
/** Strafing radial gain (mirrors PixieDancer's pull-to-distance behaviour). */
export const DAMSELFLY_RADIAL_GAIN = 1.4;
/** Tangent ratio so the strafe is dominant but radial pulls back when out of range. */
export const DAMSELFLY_TANGENT_RATIO = 0.95;
/** Burst cycle: telegraph → dash → recovery. */
/**
 * Burst-cycle period. Long enough that two Damselflies in the same room
 * spend most of their time *not* firing at once; combined with a randomised
 * `BURST_INITIAL_DELAY_JITTER_MS` per-instance offset, multiple damselflies
 * in a room desynchronise so the player gets readable burst windows
 * instead of a constant cone barrage.
 */
export const DAMSELFLY_BURST_INTERVAL_MS = 2200;
export const DAMSELFLY_TELEGRAPH_MS = 400;
export const DAMSELFLY_DASH_DURATION_MS = 250;
export const DAMSELFLY_DASH_SPEED = 320;
export const DAMSELFLY_RECOVERY_MS = 500;
/** Two projectiles fired during the dash, with a small angular spread. */
export const DAMSELFLY_PROJECTILE_SPEED = 280;
/**
 * Twin-shot half-angle. ±14° gives a readable V (at 200 px range the
 * projectiles are ~97 px apart, so there's a real gap to sidestep through)
 * without making the spread loud enough to stand out from other floor-2
 * mobs visually. ±10° looked too parallel; ±18° looked too cone-y.
 */
export const DAMSELFLY_BURST_SPREAD_RAD = (14 * Math.PI) / 180;
export const DAMSELFLY_BURST_INITIAL_DELAY_MS = 800;
/** Per-instance random offset added on top of the initial delay so multiple
 *  Damselflies in a room don't fire in lockstep. */
export const DAMSELFLY_BURST_INITIAL_DELAY_JITTER_MS = 1000;

// --- Bog Tortoise (Floor 2) --------------------------------------------------

/** Walk speed before / after the shell-pop burst. */
export const BOG_TORTOISE_WALK_SPEED = 60;
/** Cooldown between shell-pop bursts (ms). */
export const BOG_TORTOISE_BURST_INTERVAL_MS = 3500;
/** Shell-retract duration (invulnerable + stationary). */
export const BOG_TORTOISE_SHELL_DURATION_MS = 800;
/** Number of thorns in the radial burst. */
export const BOG_TORTOISE_BURST_THORN_COUNT = 6;
/** Initial delay before the first burst. */
export const BOG_TORTOISE_BURST_INITIAL_DELAY_MS = 1500;

// --- Toad Sovereign (boss, Floor 2) ------------------------------------------

export const TOAD_SOVEREIGN_VISUAL_SCALE = 2.4 * WORLD_SPRITE_SCALE;
export const TOAD_SOVEREIGN_PHASE_FLASH_MS = 200;
/** Phase 1: idle-then-shoot cadence + tongue-burst spread. */
export const TOAD_SOVEREIGN_PHASE1_IDLE_MS = 1100;
export const TOAD_SOVEREIGN_PHASE1_TELEGRAPH_MS = 380;
export const TOAD_SOVEREIGN_PHASE1_HOP_DURATION_MS = 320;
export const TOAD_SOVEREIGN_PHASE1_HOP_DISTANCE = 110;
/** Phase 1 shoots a 3-tongue burst aimed cardinal + ±25°. */
export const TOAD_SOVEREIGN_TONGUE_SPREAD_RAD = (25 * Math.PI) / 180;
export const TOAD_SOVEREIGN_TONGUE_SPEED = 280;
export const TOAD_SOVEREIGN_INITIAL_DELAY_MS = 900;
/** Phase 2: triple-hop combo with radial burst on each landing. */
export const TOAD_SOVEREIGN_PHASE2_HOPS_PER_COMBO = 3;
export const TOAD_SOVEREIGN_PHASE2_HOP_DURATION_MS = 280;
export const TOAD_SOVEREIGN_PHASE2_HOP_GAP_MS = 220;
export const TOAD_SOVEREIGN_PHASE2_COMBO_GAP_MS = 1300;
export const TOAD_SOVEREIGN_PHASE2_LANDING_THORNS = 5;
export const TOAD_SOVEREIGN_PHASE2_ADD_INTERVAL_MS = 4500;
export const TOAD_SOVEREIGN_PHASE2_MAX_ADDS = 2;

// --- Bloomheart (boss, Floor 2) ----------------------------------------------

export const BLOOMHEART_VISUAL_SCALE = 2.4 * WORLD_SPRITE_SCALE;
export const BLOOMHEART_PHASE_FLASH_MS = 200;
export const BLOOMHEART_INITIAL_DELAY_MS = 900;
/** Phase 1: 5-thorn wide fan (±30°) on a slow cadence. */
export const BLOOMHEART_PHASE1_FAN_INTERVAL_MS = 1600;
export const BLOOMHEART_FAN_SPREAD_RAD = (30 * Math.PI) / 180;
export const BLOOMHEART_PHASE1_TELEGRAPH_MS = 320;
/** Phase 2: faster fan, plus a delayed-burst spore + adds. */
export const BLOOMHEART_PHASE2_FAN_INTERVAL_MS = 1200;
export const BLOOMHEART_PHASE2_SPORE_INTERVAL_MS = 2700;
/** Spore travel + how long it floats before bursting into thorns. */
export const BLOOMHEART_SPORE_SPEED = 140;
export const BLOOMHEART_SPORE_LIFETIME_MS = 700;
/** Number of mini-thorns the spore bursts into when it pops. */
export const BLOOMHEART_SPORE_BURST_COUNT = 6;
export const BLOOMHEART_PHASE2_ADD_INTERVAL_MS = 4000;
export const BLOOMHEART_PHASE2_MAX_ADDS = 2;

// --- Damselfly Empress (boss, Floor 2) ---------------------------------------

export const DAMSELFLY_EMPRESS_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;
export const DAMSELFLY_EMPRESS_PHASE_FLASH_MS = 200;
export const DAMSELFLY_EMPRESS_INITIAL_DELAY_MS = 900;
/** Phase 1: dash cycle = pause-and-aim → dash → recovery. */
export const DAMSELFLY_EMPRESS_PHASE1_CYCLE_MS = 1800;
export const DAMSELFLY_EMPRESS_PHASE2_CYCLE_MS = 1200;
export const DAMSELFLY_EMPRESS_TELEGRAPH_MS = 380;
export const DAMSELFLY_EMPRESS_DASH_DURATION_MS = 480;
export const DAMSELFLY_EMPRESS_DASH_SPEED = 360;
export const DAMSELFLY_EMPRESS_RECOVERY_MS = 700;
/** During a dash, drop projectiles perpendicular to the dash direction at intervals. */
export const DAMSELFLY_EMPRESS_TRAIL_INTERVAL_MS = 110;
export const DAMSELFLY_EMPRESS_TRAIL_SPEED = 200;
/**
 * Phase 2: snappier rhythm + landing radial. Telegraph and recovery shorten
 * so the player has less downtime between dashes; on dash-end the boss
 * fires a small radial so "follow her to her endpoint" gets punished.
 * Trail stays as the perpendicular pair so the dodge corridor stays open.
 */
export const DAMSELFLY_EMPRESS_PHASE2_TELEGRAPH_MS = 260;
export const DAMSELFLY_EMPRESS_PHASE2_RECOVERY_MS = 480;
export const DAMSELFLY_EMPRESS_PHASE2_TRAIL_INTERVAL_MS = 190;
export const DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_THORNS = 5;
export const DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_SPEED = 170;

// --- Bog Colossus (boss, Floor 2) --------------------------------------------

export const BOG_COLOSSUS_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;
export const BOG_COLOSSUS_PHASE_FLASH_MS = 200;
export const BOG_COLOSSUS_INITIAL_DELAY_MS = 1500;
export const BOG_COLOSSUS_PHASE1_WALK_SPEED = 50;
export const BOG_COLOSSUS_PHASE2_WALK_SPEED = 70;
/** Shell-pop + radial-burst cadence. Phase 1 tightened from 4000 → 2800 ms. */
export const BOG_COLOSSUS_PHASE1_CYCLE_MS = 2800;
/** Phase 2 cycle tightened from 3200 → 2700 ms — orbit events come faster. */
export const BOG_COLOSSUS_PHASE2_CYCLE_MS = 2700;
export const BOG_COLOSSUS_SHELL_DURATION_MS = 900;
export const BOG_COLOSSUS_PHASE1_BURST_THORNS = 10;
/**
 * Phase 1 Gungeon-style overlay: each pop fires two radial waves. Wave 2 is
 * offset by half a step (so it threads the gaps in wave 1) and travels
 * slower, so dodging the first wave doesn't clear the second.
 */
export const BOG_COLOSSUS_PHASE1_SECOND_WAVE_DELAY_MS = 350;
export const BOG_COLOSSUS_PHASE1_SECOND_WAVE_SPEED_FACTOR = 0.7;
/** Phase 1 walk: snipe an aimed thorn at the player on a slow cadence. */
export const BOG_COLOSSUS_PHASE1_WALK_FIRE_INTERVAL_MS = 1400;
export const BOG_COLOSSUS_PHASE1_WALK_FIRE_SPEED = 200;
/** Phase 2: spawns orbiting thorns that circle the boss, then fly outward. */
export const BOG_COLOSSUS_PHASE2_ORBIT_THORNS = 6;
export const BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS = 1800;
export const BOG_COLOSSUS_PHASE2_ORBIT_RADIUS = 96;
export const BOG_COLOSSUS_PHASE2_ORBIT_SPEED_RAD = (160 * Math.PI) / 180; // rad/s
export const BOG_COLOSSUS_PHASE2_ORBIT_RELEASE_SPEED = 240;
/**
 * Counter-rotating inner ring — adds a second layer to the orbit pattern
 * (mandala feel). 4 thorns at a smaller radius spinning the opposite
 * direction at higher angular speed, so the player has to read both
 * rotations. Released outward with the outer ring at orbit-end.
 */
export const BOG_COLOSSUS_PHASE2_INNER_THORNS = 4;
export const BOG_COLOSSUS_PHASE2_INNER_RADIUS = 56;
export const BOG_COLOSSUS_PHASE2_INNER_SPEED_RAD = -(220 * Math.PI) / 180; // rad/s, opposite
/** Phase 2 only: aimed thorns at the player while the orbit ring is up. */
export const BOG_COLOSSUS_PHASE2_AIMED_INTERVAL_MS = 600;
export const BOG_COLOSSUS_PHASE2_AIMED_SPEED = 220;
/** Phase 2 walk snipe: faster cadence than Phase 1 between orbit windows. */
export const BOG_COLOSSUS_PHASE2_WALK_FIRE_INTERVAL_MS = 950;

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
export const FOREST_HEART_VISUAL_SCALE = 1.0 * WORLD_SPRITE_SCALE;
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

// --- Onyx Mansion mob tuning -------------------------------------------------

/** Wraith — solid (visible + targetable) phase duration. */
export const WRAITH_PHASE_SOLID_MS = 2500;
/** Wraith — intangible (translucent + untargetable) phase duration. */
export const WRAITH_PHASE_INTANGIBLE_MS = 1500;
/** Solid-phase alpha. */
export const WRAITH_ALPHA_SOLID = 0.95;
/** Intangible-phase alpha — clearly faded so player can read the state. */
export const WRAITH_ALPHA_INTANGIBLE = 0.28;

/** Possessed Candelabra — interval (ms) between wax puddle drops. */
export const CANDELABRA_PUDDLE_DROP_INTERVAL_MS = 2000;
/** Interval between cone-fire bursts (3 flame projectiles toward player). */
export const CANDELABRA_FIRE_INTERVAL_MS = 2500;
/** Initial delay before the candelabra starts firing after spawning. */
export const CANDELABRA_FIRE_INITIAL_DELAY_MS = 1400;
/** Number of flame projectiles per burst (cone-spread toward player). */
export const CANDELABRA_PROJECTILE_COUNT = 3;
/** Total cone spread in degrees across the burst (e.g. 30 = ±15° from
 * center-line). Tuned tight enough that the player can dodge sideways. */
export const CANDELABRA_PROJECTILE_SPREAD_DEG = 30;
/** How long a wax puddle stays on the floor before fading out. */
export const WAX_PUDDLE_LIFETIME_MS = 3000;
/** Damage dealt to the player on wax-puddle overlap (HP, with 1 HP = half heart). */
export const WAX_PUDDLE_DAMAGE = 1;
/** Wax-puddle hitbox radius. */
export const WAX_PUDDLE_HITBOX_RADIUS = 12;

/** Cursed Mirror — telegraph window before firing. Player sees the flash as
 * a "homing missile incoming" warning. */
export const MIRROR_TELEGRAPH_MS = 450;
/** Cooldown between telegraph cycles. */
export const MIRROR_FIRE_INTERVAL_MS = 1100;
/** Initial delay before the mirror starts its first telegraph after spawning. */
export const MIRROR_FIRE_INITIAL_DELAY_MS = 800;
/** Homing turn rate (deg/sec) for the Cursed Mirror's missile. Low enough
 * that sharp 90° direction changes outmaneuver it; high enough that drifting
 * in a straight line gets you hit. Tune from here. */
export const MIRROR_HOMING_TURN_RATE_DEG = 110;
/** How long the mirror's homing missile lives before auto-despawning (ms).
 * Bumped above the default since a tracking missile may circle a bit before
 * either hitting or hitting a wall. */
export const MIRROR_PROJECTILE_LIFETIME_MS = 2200;

// --- Vampire Twins (boss, Onyx Mansion) -------------------------------------
// Asymmetric duo — Crimson Lord (melee chaser w/ dash) + Sapphire Marquis
// (range kiter w/ blood-magic projectiles). Phase 1 = both alive. Phase 2 =
// triggered when one body dies; survivor gets stronger pattern. Phase 3 =
// surviving body crosses HP threshold → berserker.

/** Visual scale multipliers — keep both bodies readable as boss-tier without
 * crowding each other in the room. */
export const CRIMSON_LORD_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;
export const SAPPHIRE_MARQUIS_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;

/** Spawn offset from room center: Lord left, Marquis right (in tiles). */
export const VAMPIRE_SPAWN_OFFSET_TILES = 1.8;

/** HP-fraction at which the surviving body enters Berserker (Phase 3). */
export const VAMPIRE_BERSERKER_HP_FRACTION = 0.3;

// Crimson Lord (melee, dash chaser). Tuned so the dash is consistently
// dodgeable: telegraph long enough to read at point-blank range, chase
// speed slow enough that the player can keep distance instead of being
// shoved into a wall.
export const CRIMSON_LORD_HP = 35;
export const CRIMSON_LORD_CHASE_SPEED = 70;
/** Phase 1 dash settings (telegraph → dash → recovery → idle gap). */
export const CRIMSON_LORD_DASH_SPEED = 500;
export const CRIMSON_LORD_DASH_TELEGRAPH_MS = 700;
export const CRIMSON_LORD_DASH_DURATION_MS = 250;
export const CRIMSON_LORD_DASH_RECOVERY_MS = 600;
/** Time between the END of one dash and the START of the next telegraph. */
export const CRIMSON_LORD_DASH_GAP_PHASE1_MS = 1400;
/** Phase 2 (solo): tighter cycle so a lone Lord still pressures. */
export const CRIMSON_LORD_DASH_GAP_PHASE2_MS = 600;
/** Phase 3 (berserker): no telegraph, pure dash spam. Used as the gap between
 * dashes when in berserker (telegraph is skipped). */
export const CRIMSON_LORD_DASH_GAP_PHASE3_MS = 250;
/** Wax-puddle-style trail dropped along the Lord's dash path in Phase 2+. */
export const CRIMSON_LORD_BLOOD_TRAIL_DROPS = 4;
export const CRIMSON_LORD_BLOOD_TRAIL_LIFETIME_MS = 1200;

// Sapphire Marquis (range, kite + blood projectiles).
export const SAPPHIRE_MARQUIS_HP = 35;
export const SAPPHIRE_MARQUIS_KITE_SPEED = 60;
/** Distance the Marquis tries to maintain from the player. */
export const SAPPHIRE_MARQUIS_KITE_DISTANCE = 180;
/** Phase 1 fan: 5 projectiles, ±30° (= 60° total spread = 15° per spacing). */
export const SAPPHIRE_MARQUIS_PHASE1_FAN_COUNT = 5;
export const SAPPHIRE_MARQUIS_PHASE1_FAN_SPREAD_RAD = (60 * Math.PI) / 180;
export const SAPPHIRE_MARQUIS_PHASE1_FAN_INTERVAL_MS = 1800;
export const SAPPHIRE_MARQUIS_PHASE1_FIRE_INITIAL_DELAY_MS = 900;
/** Teleport cadence + the minimum distance the destination must be from the
 * PLAYER (not from the Marquis). Prevents the materialise-on-top-of-player
 * bug when the player walks into the destination during the fade. */
export const SAPPHIRE_MARQUIS_TELEPORT_INTERVAL_MS = 4000;
export const SAPPHIRE_MARQUIS_TELEPORT_MIN_PLAYER_DISTANCE = 180;
export const SAPPHIRE_MARQUIS_TELEPORT_FADE_MS = 220;
/** Phase 2 fan: 7 projectiles, wider 90° spread. */
export const SAPPHIRE_MARQUIS_PHASE2_FAN_COUNT = 7;
export const SAPPHIRE_MARQUIS_PHASE2_FAN_SPREAD_RAD = (90 * Math.PI) / 180;
/** Phase 2 bullet curtain — 12-thorn radial every interval, with telegraph. */
export const SAPPHIRE_MARQUIS_CURTAIN_INTERVAL_MS = 3000;
export const SAPPHIRE_MARQUIS_CURTAIN_THORN_COUNT = 12;
export const SAPPHIRE_MARQUIS_CURTAIN_TELEGRAPH_MS = 300;
/** Phase 3 spinning stream — N evenly-spaced spawn slots around the body,
 * with `BERSERKER_SKIPPED_ARMS` of them deliberately left empty so a
 * permanent dodge-gap rotates with the spin. (Without skipping, every gap
 * eventually closes as the rotation fills it in over time — first wave
 * looks dodgeable, later waves catch the player.) Skipping 1 of 8 slots
 * gives a 90° wide rotating gap. */
export const SAPPHIRE_MARQUIS_BERSERKER_SPIN_RATE_DEG_PER_SEC = 80;
export const SAPPHIRE_MARQUIS_BERSERKER_FIRE_INTERVAL_MS = 170;
export const SAPPHIRE_MARQUIS_BERSERKER_ARM_COUNT = 8;
export const SAPPHIRE_MARQUIS_BERSERKER_SKIPPED_ARMS = 1;

/** Phase-flash duration for both bodies (visual feedback on phase change). */
export const VAMPIRE_PHASE_FLASH_MS = 220;

// --- Lord Onyx (secret endboss, Onyx Mansion) -------------------------------
// Rooted endgame boss. Three phases: aimed homing missile + radial wave →
// adds + faster cadence → continuous gap-spinning stream. Earned by
// activating the gem seal with all 3 floor trophies.

export const LORD_ONYX_HP = 90;
/** Visual scale — chunky boss-tier silhouette so the silhouette dominates
 * the room. */
export const LORD_ONYX_VISUAL_SCALE = 1.7 * WORLD_SPRITE_SCALE;

// Phase 1: aimed homing + radial wave.
export const LORD_ONYX_P1_MISSILE_INTERVAL_MS = 1800;
export const LORD_ONYX_P1_MISSILE_INITIAL_DELAY_MS = 1000;
export const LORD_ONYX_P1_RADIAL_INTERVAL_MS = 4000;
export const LORD_ONYX_P1_RADIAL_THORN_COUNT = 8;
/** Slower turn rate than Cursed Mirror (110°/s) so even an end-game player
 * with stat-pumped move speed can sharp-cut around it. */
export const LORD_ONYX_HOMING_TURN_RATE_DEG = 60;
export const LORD_ONYX_PROJECTILE_LIFETIME_MS = 2400;

// Phase 2: faster cadence + Wraith adds + spinning cross.
export const LORD_ONYX_P2_MISSILE_INTERVAL_MS = 1300;
export const LORD_ONYX_P2_RADIAL_INTERVAL_MS = 3000;
export const LORD_ONYX_P2_CROSS_INTERVAL_MS = 2000;
export const LORD_ONYX_P2_ADD_COUNT = 2;

// Phase 3: continuous spinning stream with permanent gap (Marquis-style).
export const LORD_ONYX_P3_SPIN_RATE_DEG_PER_SEC = 60;
export const LORD_ONYX_P3_FIRE_INTERVAL_MS = 180;
export const LORD_ONYX_P3_ARM_COUNT = 8;
export const LORD_ONYX_P3_SKIPPED_ARMS = 1;
/** Aimed homing on top of the spin, so standing in the gap forever isn't
 * enough — player has to keep moving with the gap AND dodge a heat-seeker. */
export const LORD_ONYX_P3_MISSILE_INTERVAL_MS = 2400;

/** Phase transition flash + camera shake durations. */
export const LORD_ONYX_PHASE_FLASH_MS = 260;

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
  BogFrog: 'tex-enemy-bog-frog',
  SnapperBloom: 'tex-enemy-snapper-bloom',
  Damselfly: 'tex-enemy-damselfly',
  BogTortoise: 'tex-enemy-bog-tortoise',
  BossToadSovereign: 'tex-boss-toad-sovereign',
  BossBloomheart: 'tex-boss-bloomheart',
  BossDamselflyEmpress: 'tex-boss-damselfly-empress',
  BossBogColossus: 'tex-boss-bog-colossus',
  Stairs: 'tex-stairs',
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
  ItemSpyglass: 'tex-item-spyglass',
  ItemLilyDiadem: 'tex-item-lily-diadem',
  ItemMirePearl: 'tex-item-mire-pearl',
  ItemFrogTongue: 'tex-item-frog-tongue',
  ItemBloodboundChalice: 'tex-item-bloodbound-chalice',
  ItemVampireSignet: 'tex-item-vampire-signet',
  ItemObsidianHeart: 'tex-item-obsidian-heart',
  BossMossyBehemoth: 'tex-boss-mossy-behemoth',
  BossPixieQueen: 'tex-boss-pixie-queen',
  BossForestHeart: 'tex-boss-forest-heart',
  Wraith: 'tex-enemy-wraith',
  PossessedCandelabra: 'tex-enemy-possessed-candelabra',
  CursedMirror: 'tex-enemy-cursed-mirror',
  MansionMissile: 'tex-projectile-mansion-missile',
  FlameMissile: 'tex-projectile-flame-missile',
  WaxPuddle: 'tex-hazard-wax-puddle',
  BossCrimsonLord: 'tex-boss-crimson-lord',
  BossSapphireMarquis: 'tex-boss-sapphire-marquis',
  BloodProjectile: 'tex-projectile-blood',
  BloodTrail: 'tex-hazard-blood-trail',
  BossLordOnyx: 'tex-boss-lord-onyx',
  /** Prismancy unlock — red/gold wizard skin awarded by defeating Lord
   * Onyx. Auto-applied at Player construction if unlocked. */
  PlayerPrismancy: 'tex-player-prismancy',
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

export function treasureDoorLockedKey(floorId: string): string {
  return `tex-treasuredoor-locked-${floorId}`;
}

export function shopDoorKey(floorId: string): string {
  return `tex-shopdoor-${floorId}`;
}

export function shopDoorLockedKey(floorId: string): string {
  return `tex-shopdoor-locked-${floorId}`;
}

/**
 * Wooden door for normal rooms. Replaces the wall-tile fallback so the
 * player can read which adjacent rooms are reachable while still fighting in
 * the current one (rooms with closed doors visually announce "exit here").
 */
export function normalDoorKey(floorId: string): string {
  return `tex-normaldoor-${floorId}`;
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
 * Hold-R-to-restart-run threshold (ms). Long enough that an accidental
 * tap doesn't kill the run, short enough that intentional holds feel
 * snappy. UI shows a fill bar while held.
 */
export const RESTART_HOLD_DURATION_MS = 1200;

/**
 * Coin balance the player starts a fresh run with. TEMPORARY test value so
 * the user can poke the shop without farming drops first; will move to 0
 * (or be derived from meta-progression) once the run-economy is balanced.
 */
export const STARTING_COINS = 0;

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
  StyleMockup: 'StyleMockupScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
