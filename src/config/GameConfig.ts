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
/** Spellblade starts with 2 hearts (vs Wizard's 3). Glass-cannon trade —
 *  Spellblade gets +50% damage, baseline pierce-1, bigger hitbox, AND
 *  dash i-frames over the wizard, so the lower starting HP forces the
 *  player to actually use the dash defensively instead of treating it
 *  as a free dodge. HP-up items (Heart Container, Pixie Dust, etc.) still
 *  scale max HP normally on top of this baseline. */
export const SPELLBLADE_MAX_HEALTH = 4;
/** Player hitbox radius. Tuned 13 → 11 (2026-05-07) after user-flagged
 * "tight dodges feel unfair" — the circle reached visually past the boots,
 * so projectiles brushing the legs registered as hits. Combined with the
 * +10 offset (was +12) below in `Player.ts` the bottom of the hitbox
 * shrinks ~4 px while the top stays at roughly the robe shoulder, keeping
 * the hat hitbox-free as before. */
export const PLAYER_HITBOX_RADIUS = 11;
/** Vertical offset of the hitbox circle CENTER below the sprite center.
 * +10 keeps the hat clear (head silhouette ends ~2 px above this) while
 * the radius-11 circle covers belt + thighs + upper calves. */
export const PLAYER_HITBOX_OFFSET_Y = 10;
export const PLAYER_INVINCIBILITY_MS = 800;

export const MISSILE_SPEED = 420;
export const MISSILE_LIFETIME_MS = 900;
export const MISSILE_RADIUS = 8;
export const MISSILE_DAMAGE = 1;
export const MISSILE_FIRE_INTERVAL_MS = 250;
export const MISSILE_POOL_SIZE = 64;
/** Fraction of the player's body velocity that gets *added* to a freshly
 *  fired projectile's cardinal velocity. Lets movement angle the shot —
 *  at base PLAYER_SPEED 220 px/s + factor 0.25, a projectile fired
 *  perpendicular to a full-speed move comes out at atan2(55, 420) ≈ 7.5°
 *  off-axis. Subtle enough to feel like "the bolt carries momentum"
 *  rather than "I'm steering a boat".
 *
 *  **Asymmetric application** (chosen 2026-05-09): only the Spellblade
 *  Bolt inherits — Player.fireSpellbladeBolt passes inheritVx/inheritVy,
 *  Player.fireWizardMissile omits them so the wizard stays pure
 *  cardinal. Reads thematically as "the heavy spell-sword carries
 *  momentum / the wand-orb is sniper-precise". User flagged a
 *  short-lived shared-inheritance iteration with "der wizard schießt
 *  jetzt anders" — wizard reverted, Spellblade keeps the angle.
 *
 *  Tuning history: 0.5 → 0.25 (2026-05-09, user-flagged "zu stark"
 *  during normal movement; dash-cancel-bolt at 0.5 angled ~40° which
 *  felt unintentional). */
export const MISSILE_VELOCITY_INHERIT_FACTOR = 0.25;
/** Brief window after spawn during which the player's missile is allowed
 *  to overlap walls / barriers / blockers without being deactivated.
 *  Fixes the "Spellblade bolt stuck in wall" bug: the bigger 1.5×-scaled
 *  body extends beyond the player body when the player is up against the
 *  top / bottom edge, so the bolt spawns mid-overlap with the wall and
 *  the wall collider deactivates it before it can clear. 60 ms is enough
 *  for any fired bolt to leave the spawn cell at MISSILE_SPEED. After the
 *  window expires the wall collider works as before — bolts shot AT a
 *  wall still die on contact, just not on spawn-overlap. */
export const MISSILE_SPAWN_GRACE_MS = 60;

// --- Spellblade Bolt + Dash ------------------------------------------------
// The Spellblade's projectile replacement for the Magic Missile. A spell-
// sword-shaped magic bolt that flies through enemies once before flying on
// (baseline Pierce 1) — slower cadence + chunkier damage than the wizard,
// pierce gives a clear character-specific identity even before items.
//
// Pivot from the original Phase B melee slash design (2026-05-09): slash
// felt OP in playtest ("complete game was free, basically one-shot
// everything"). Replaced with a projectile to bring the Spellblade back
// in line with the wizard's range trade-off curve.

/** Cadence between bolts. Heavy sword-swing feel — 2× slower than the
 *  wizard's 250 ms — to read as "the spellblade swings a sword, not flicks
 *  a wand". Single-target DPS lands at 3.0/s vs wizard's 4.0/s; pierce +
 *  bigger hitbox keep the Spellblade competitive in mob lines and bullet-
 *  hell rooms. Tuned 400 → 600 → 900 → 500 (2026-05-09) — 900 ms felt
 *  unsurvivable on Sapphire (1.5× mob HP × slow cadence), 500 ms keeps
 *  the heavy-swing identity but closes the floor-2 DPS gap. */
export const SPELLBLADE_BOLT_FIRE_INTERVAL_MS = 500;
/** Damage multiplier applied to the player's `damage` stat when firing
 *  a bolt. Base damage 1 × 1.5 = 1.5/shot — Mossy Slime (HP 5) takes 4
 *  hits (vs wizard's 5), Forest Sprite (HP 3) takes 2, Pixie (HP 2) 2.
 *  +damage items scale linearly. Tuned conservatively after the 3× slash
 *  iteration trivialised floor-1 combat. */
export const SPELLBLADE_BOLT_DAMAGE_MULT = 1.5;
/** Baseline pierce count added to the player's `piercingCount` stat
 *  ONLY when the Spellblade fires. Means a fresh-run Spellblade always
 *  pierces 1 enemy per shot, and Magic Shard (+2) stacks on top to 3
 *  total. Damage taper is the standard PIERCING_DAMAGE_FACTORS sequence
 *  (1.0 → 0.75 → 0.5), so a piercing bolt does 1.5 → 1.125 dmg by the
 *  second hit at base. Wizard's bolt count is unaffected. */
export const SPELLBLADE_BOLT_BASELINE_PIERCE = 1;
/** Extra visual / hitbox scale multiplied onto the player's `missileScale`
 *  stat ONLY when the Spellblade fires. The bolt sprite is the same 24×24
 *  frame as the wizard orb (so the shared pool's setCircle math stays
 *  valid) — at the wizard's 1.0× scale the spell-sword reads small. 1.5×
 *  bumps both the sprite and the hitbox to match the chunky-damage feel.
 *  Hitbox-bump is welcome here: pierce-1 baseline + slow cadence means a
 *  slightly more forgiving projectile-vs-enemy collision is on-theme. */
export const SPELLBLADE_BOLT_VISUAL_SCALE = 1.5;

/** Spellblade dash on [Shift]. Burst-of-speed dodge with i-frames + a
 *  short cooldown — the answer to bullet hell since the spellblade can't
 *  out-range projectiles like the wizard. Direction comes from the
 *  movement input vector (WASD); if no direction is held, dash uses the
 *  last-pressed cardinal as fallback. */
export const DASH_DURATION_MS = 160;
/** Dash velocity (px/s). Tuned so total displacement = ~115 px (just over
 *  1 tile + buffer). Big enough to clear a thorn line, small enough that
 *  you can't dash across the room in one go. */
export const DASH_SPEED = 720;
/** Cooldown from dash-end to next available dash. Stops the player from
 *  permanently dash-canceling — there's downtime to commit to slashing. */
export const DASH_COOLDOWN_MS = 1500;
/** Invincibility window granted at dash start. Slightly longer than the
 *  dash duration so the back-edge of the dash also has a small grace,
 *  matching how Isaac-style dodge-rolls feel. */
export const DASH_INVINCIBILITY_MS = 220;

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
/** Fallback room count when a floor theme doesn't set its own
 * `roomCount`. Real floors override progressively (Emerald 10 / Sapphire
 * 12 / Onyx 14 — run-length pass 2026-06-12, was a flat 8 before). */
export const DUNGEON_TARGET_ROOM_COUNT = 8;
/** Hard upper bound on random-walk iterations to avoid pathological loops. */
export const DUNGEON_GENERATOR_MAX_ITERATIONS = 5000;

/**
 * Dampened DPS-scaling for REGULAR floor mobs (2026-06-12, user-flagged
 * "ich bin nun eigentlich jeden run absolut OP"): mobs get the boss
 * DPS-ratio applied at HALF strength on top of their static floor
 * multiplier — `hp × floorMult × (1 + (dpsRatio − 1) × this)`. At 3×
 * base-DPS a mob has ×2 HP instead of ×3 (full) or ×1 (none): stacked
 * builds still clear rooms visibly faster than at base stats (power
 * fantasy intact), but trash stops evaporating. Bosses + minibosses use
 * the FULL ratio (factor 1.0, hardwired in their constructors) — their
 * time-to-kill is meant to be build-invariant.
 */
export const MOB_HP_DPS_SCALING_FACTOR = 0.5;

// --- Elite rooms & minibosses (run-length pass, 2026-06-12) -----------------

/** HP multiplier a champion (elite-promoted floor mob) gets ON TOP of the
 * per-floor mob HP multiplier. */
export const ELITE_HP_MULT = 6;
/** Extra visual scale for champions (multiplies the enemy's current scale,
 * so per-class visual scales are preserved). Hitbox grows with it — a
 * champion is deliberately a bigger target. */
export const ELITE_SCALE_MULT = 1.5;
/** Interval of the champion's universal radial thorn burst. The burst is
 * what makes ANY promoted mob roster pick threatening — a tanky chaser
 * alone would just be a kite-and-shoot snoozefest. Was 3000 — tightened in
 * the 2026-06-12 aggression pass: a champion always spawns ALONE (elite
 * branch early-returns before the pack fill), so it carries the whole
 * room's threat budget by itself. */
export const ELITE_BURST_INTERVAL_MS = 2200;
/** First burst fires this long after the room is entered, so the player
 * has a beat to read the big glowing enemy before bullets fly. */
export const ELITE_BURST_INITIAL_DELAY_MS = 1600;
/** Thorns per champion radial burst. */
export const ELITE_BURST_THORN_COUNT = 6;
/** Delay before the burst's SECOND wave (Gungeon-style dual radial, same
 * pattern family as Bog Colossus phase 1). The second wave is rotated a
 * half-step so standing in a lane of wave 1 doesn't survive wave 2. */
export const ELITE_BURST_SECOND_WAVE_DELAY_MS = 350;
/** Champion move-speed multiplier (aggression pass 2026-06-12) — applied
 * via a per-instance definition copy in promoteToElite, so the shared
 * ENEMIES entry stays untouched. Makes melee-chaser picks threatening:
 * a solo champion you can simply outwalk is no encounter. */
export const ELITE_MOVE_SPEED_MULT = 1.3;
/** Champion aura color — RED (was gold 0xffd84a): reads as danger and
 * keeps gold reserved for the boss/miniboss HUD framing + coin payouts. */
export const ELITE_AURA_COLOR = 0xe02838;
/** Guaranteed coins a champion bursts on death (on top of the normal
 * coinDropChance roll). Elite rooms must visibly pay out. */
export const ELITE_DEATH_COIN_BURST = 3;
/** Chance that a floor with a non-empty miniboss roster rolls ONE miniboss
 * room into its layout. Deliberately well under 1.0 — minibosses are a
 * "sometimes" encounter (user decision 2026-06-12), not a fixture. */
export const MINIBOSS_SPAWN_CHANCE = 0.35;
/** Chance that a miniboss clear pays a treasure-pool item pedestal instead
 * of the pickup bundle (heart + key + coin spray). A guaranteed item read
 * as too rich next to the boss reward (user decision 2026-06-12) — the
 * rare pedestal keeps a jackpot moment without flattening the risk
 * ladder mob < elite < miniboss < boss. */
export const MINIBOSS_ITEM_DROP_CHANCE = 0.25;
/** Coins in the miniboss pickup-bundle spray (the 75% non-item payout). */
export const MINIBOSS_REWARD_COIN_COUNT = 3;

// Thornwood Shambler (Emerald miniboss) — slow walker, aimed 3-fan volleys
// with every Nth volley swapped for a telegraphed radial.
export const SHAMBLER_VOLLEY_INTERVAL_MS = 1850;
export const SHAMBLER_INITIAL_DELAY_MS = 1400;
export const SHAMBLER_RADIAL_EVERY_N = 3;
export const SHAMBLER_RADIAL_TELEGRAPH_MS = 420;
export const SHAMBLER_FAN_SPREAD_DEG = 14;
export const SHAMBLER_RADIAL_THORNS = 8;

// Mire Lurker (Sapphire miniboss) — submerges (intangible, repositions fast),
// emerges with a telegraphed radial, then trades aimed shots while surfaced.
export const LURKER_SUBMERGE_MS = 1600;
export const LURKER_SURFACE_IDLE_MS = 2400;
export const LURKER_EMERGE_TELEGRAPH_MS = 450;
export const LURKER_SURFACE_SHOT_INTERVAL_MS = 800;
export const LURKER_EMERGE_RADIAL_THORNS = 6;
export const LURKER_SUBMERGED_ALPHA = 0.35;
export const LURKER_FIRST_SUBMERGE_DELAY_MS = 1500;

// Doppelgänger (Onyx miniboss — replaced the Headless Knight 2026-06-12,
// user request) — a dark mirror of the player wizard. Kites at player-like
// distance, then telegraphs and casts a Marquis-style volley of three
// sequential homing missiles. The attack interval is deliberately generous
// ("genügend Pausenzeit") because homing pressure stacks fast.
export const DOPPELGANGER_ATTACK_INTERVAL_MS = 3800;
export const DOPPELGANGER_TELEGRAPH_MS = 500;
export const DOPPELGANGER_VOLLEY_COUNT = 3;
export const DOPPELGANGER_VOLLEY_SPACING_MS = 320;
/** Same turn-rate family as Cursed Mirror / Marquis mirror-special (110°/s)
 * — sharp 90° cuts dodge it, running straight gets caught. */
export const DOPPELGANGER_HOMING_TURN_RATE_DEG = 110;
export const DOPPELGANGER_HOMING_LIFETIME_MS = 2200;
/** Preferred distance to the player — mirrors how a human kites. */
export const DOPPELGANGER_KITE_DISTANCE = 200;
/** Deadband around the kite distance inside which it only strafes. */
export const DOPPELGANGER_KITE_BAND = 35;
/** Initial aim spread between the three volley missiles (±deg) so they
 * converge from different vectors instead of a single line — one sharp
 * cut no longer dodges all three at once. */
export const DOPPELGANGER_VOLLEY_SPREAD_DEG = 14;
/** Straight (non-homing) filler cast between volleys — the mimic shoots
 * back at the player's own cadence instead of idling. Difficulty pass
 * 2026-06-12: user-flagged "zu einfach", the passive windows were free
 * damage. */
export const DOPPELGANGER_FILLER_INTERVAL_MS = 1100;
/** Short flanking blink right before each volley (fade-out → reposition →
 * fade-in → telegraph). Marquis-lite: forces re-acquisition, the homing
 * volley arrives from a fresh angle. */
export const DOPPELGANGER_BLINK_FADE_MS = 170;
/** Soft enrage below half HP: shorter volley interval + faster strafing.
 * Deliberately NOT a phase system — same patterns, one gear up. */
export const DOPPELGANGER_ENRAGE_HP_FRACTION = 0.5;
export const DOPPELGANGER_ENRAGED_ATTACK_INTERVAL_MS = 2800;
export const DOPPELGANGER_ENRAGED_SPEED_MULT = 1.3;

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
/**
 * Default lifetime for enemy projectiles. Bumped 2026-05-09 from 1500
 * → 2200 to fix the boss-cheese where the player could stand at the
 * far wall and out-range the rooted mid-room bosses (Forest Heart,
 * Bloomheart) — at 240 px/s, 1500 ms = 360 px, but the farthest
 * reachable player position from room center is ~472 px (corner of
 * the playable area). 2200 ms × 240 px/s = 528 px covers that with
 * a small buffer. Bosses with their own lifetime overrides via
 * `EnemyProjectile.setLifetime()` (Onyx all-phases, BogColossus
 * orbit, CursedMirror, MarquisOfMirages homing) are unaffected.
 * Side effect: stationary mobs like Vine Sprout / Snapper Bloom
 * also reach a bit further now — intended, gives them positional
 * weight without becoming bullet-hell.
 */
export const ENEMY_PROJECTILE_LIFETIME_MS = 2200;
export const ENEMY_PROJECTILE_DAMAGE = 1;
export const ENEMY_PROJECTILE_RADIUS = 8;
export const ENEMY_PROJECTILE_POOL_SIZE = 96;

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

// --- Vine Lord (boss — "Burrower" rework) ------------------------------------
// No longer rooted: creeps toward the player, fires aimed fans + telegraphed
// ground eruptions under the player, and (phase 2) burrows to reposition so
// it can't simply be kited into a corner.

/** Half-spread (radians) of the side thorns in the aimed fan. 15° ≈ 0.2618. */
export const VINE_LORD_FAN_SPREAD_RAD = (15 * Math.PI) / 180;
/** Number of thorns in the aimed fan (centre + 1 per side). Thinned 5→3 for
 *  dodge-room (2026-06-13 fairness pass). */
export const VINE_LORD_FAN_THORNS = 3;
/** Creep speed (px/s) toward the player — phase-aware. */
export const VINE_LORD_CREEP_SPEED_P1 = 42;
export const VINE_LORD_CREEP_SPEED_P2 = 72;
/** Aimed-fan cooldown (ms) — phase-aware. */
export const VINE_LORD_FAN_INTERVAL_P1 = 1700;
export const VINE_LORD_FAN_INTERVAL_P2 = 1250;
/** Ground-eruption cooldown (ms) — phase-aware. Lengthened for more downtime. */
export const VINE_LORD_ERUPT_INTERVAL_P1 = 3600;
export const VINE_LORD_ERUPT_INTERVAL_P2 = 2800;
/** Telegraph window (ms) the warn-ring pulses before the eruption fires. */
export const VINE_LORD_ERUPT_TELEGRAPH_MS = 650;
/** Thorns in the radial burst an eruption releases from the marked spot.
 *  Thinned 8→6 (2026-06-13) so the ~60° gaps give a clear escape lane. */
export const VINE_LORD_ERUPT_THORNS = 6;
/** Visual radius (px) of the eruption warn-ring. */
export const VINE_LORD_ERUPT_RADIUS = 46;
/** How far (px) the eruption marker is nudged off the player's exact position
 *  so the tell never spawns dead-on-top of them (2026-06-13 safe-zone fix). */
export const VINE_LORD_ERUPT_OFFSET = 44;
/** Phase 2: cooldown (ms) between burrow-relocate dives. */
export const VINE_LORD_BURROW_INTERVAL_MS = 5200;
/** Burrow fade-out / fade-in duration (ms) each way. */
export const VINE_LORD_BURROW_FADE_MS = 240;
/** Target distance (px) the boss re-emerges from the player after a burrow. */
export const VINE_LORD_BURROW_REEMERGE_DIST = 200;
/** Hard minimum distance (px, 3 tiles) the re-emerge spot must keep from the
 *  player — burrow used to surface on top of them (2026-06-13 safe-zone fix). */
export const VINE_LORD_BURROW_MIN_PLAYER_DIST = 3 * 64;
/** Burrow re-emerge must avoid the cone the player is MOVING toward, so the
 *  boss never surfaces in the player's path and then sandwiches them with its
 *  resurface burst. Half-angle (rad) of the excluded forward cone (~60° → 120°
 *  total). Only applied when the player is actually moving (see EPS below). */
export const VINE_LORD_BURROW_HEADING_CONE_RAD = Math.PI / 3;
/** Min player speed (px/s) before the heading-cone exclusion kicks in; below
 *  this the player counts as standing still and any ≥-min-dist spot is fine. */
export const VINE_LORD_BURROW_PLAYER_MOVING_EPS = 30;
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

// --- Mossy Behemoth (boss — "Slam" rework) -----------------------------------
// The hop IS the threat now: every landing erupts a radial shockwave of
// thorns. Phase 2 chains a 3-hop combo (Toad-Sovereign style) with a denser
// dual-wave shockwave per landing. No more landing slime-adds — it stands on
// its movement + shockwave density. Death-split kept as its signature.

/** Initial delay before the first hop after spawn. */
export const MOSSY_BEHEMOTH_INITIAL_DELAY_MS = 700;
/** Phase 1: idle pause (ms) between hops. */
export const MOSSY_BEHEMOTH_P1_IDLE_MS = 720;
/** Phase 1: cheek-squash telegraph (ms) before the hop launches. */
export const MOSSY_BEHEMOTH_P1_TELEGRAPH_MS = 340;
/** Duration (ms) of one hop arc — sets velocity for this long, then halts. */
export const MOSSY_BEHEMOTH_HOP_DURATION_MS = 320;
/** Hop velocity (px/s) — phase-aware (was a trickle at moveSpeed 60). */
export const MOSSY_BEHEMOTH_HOP_SPEED_P1 = 250;
export const MOSSY_BEHEMOTH_HOP_SPEED_P2 = 300;
/** Thorns in the radial shockwave fired on each landing — phase-aware.
 *  Thinned (2026-06-13): P1 8→6, P2 10→8, and the P2 second offset wave was
 *  dropped entirely (was 10+10 ≈ 20 effective per landing → undodgeable). */
export const MOSSY_BEHEMOTH_LANDING_THORNS_P1 = 6;
export const MOSSY_BEHEMOTH_LANDING_THORNS_P2 = 8;
/** Phase 2: hops per combo. */
export const MOSSY_BEHEMOTH_P2_HOPS_PER_COMBO = 3;
/** Phase 2: pause (ms) on each landing before the next combo hop. Lengthened
 *  240→320 (2026-06-13) for dodge-room between combo landings. */
export const MOSSY_BEHEMOTH_P2_HOP_GAP_MS = 320;
/** Phase 2: rest (ms) after a full combo before the next one. */
export const MOSSY_BEHEMOTH_P2_COMBO_GAP_MS = 880;
/** Visual scale applied to the boss texture. */
export const MOSSY_BEHEMOTH_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;
/** On death: minimum number of adds the boss splits into. */
export const MOSSY_BEHEMOTH_DEATH_SPLIT_MIN = 2;
/** On death: maximum number of adds the boss splits into. */
export const MOSSY_BEHEMOTH_DEATH_SPLIT_MAX = 3;
/** Phase-change tint flash duration. */
export const MOSSY_BEHEMOTH_PHASE_FLASH_MS = 200;

// --- Pixie Queen (boss — "Strafe" rework) ------------------------------------
// De-annoyed: she now orbits the player at a readable distance (always
// visible + hittable) firing aimed spreads, and only teleports occasionally
// with a clear destination telegraph. No more constant blink-spam or adds.

/** Initial delay before she starts acting after spawn. */
export const PIXIE_QUEEN_INITIAL_DELAY_MS = 800;
/** Ideal orbit distance (px) she tries to hold from the player. */
export const PIXIE_QUEEN_ORBIT_RADIUS = 190;
/** Strafe (tangential) speed (px/s) around the player — phase-aware. */
export const PIXIE_QUEEN_STRAFE_SPEED_P1 = 95;
export const PIXIE_QUEEN_STRAFE_SPEED_P2 = 132;
/** Gain on the radial correction that pulls her back toward the orbit radius. */
export const PIXIE_QUEEN_RADIAL_GAIN = 1.5;
/** Cooldown (ms) between strafe-direction flips (so she isn't perfectly circular). */
export const PIXIE_QUEEN_STRAFE_FLIP_MS = 2300;
/** Aimed-spread cooldown (ms) — phase-aware. P2 950→1100 (2026-06-13). */
export const PIXIE_QUEEN_SHOT_INTERVAL_P1 = 1300;
export const PIXIE_QUEEN_SHOT_INTERVAL_P2 = 1100;
/** Thorns per aimed spread — phase-aware. P2 thinned 5→4 (2026-06-13). */
export const PIXIE_QUEEN_SHOT_THORNS_P1 = 3;
export const PIXIE_QUEEN_SHOT_THORNS_P2 = 4;
/** Half-spread (radians) of the aimed spread. 15° ≈ 0.2618. */
export const PIXIE_QUEEN_SHOT_SPREAD_RAD = (15 * Math.PI) / 180;
/** Teleport-reposition cooldown (ms) — phase-aware, deliberately rare. */
export const PIXIE_QUEEN_TELEPORT_INTERVAL_P1 = 6000;
export const PIXIE_QUEEN_TELEPORT_INTERVAL_P2 = 7000;
/** Destination-marker telegraph window (ms) before she vanishes. */
export const PIXIE_QUEEN_TELEPORT_TELEGRAPH_MS = 500;
/** Sparkle / fade window each way during a teleport (ms). */
export const PIXIE_QUEEN_TELEPORT_FADE_MS = 200;
/** Thorns in the radial burst she fires on teleport-landing. Thinned 8→6
 *  (2026-06-13) so the ring has clear escape gaps on arrival. */
export const PIXIE_QUEEN_TELEPORT_LAND_THORNS = 6;
/** Visual scale applied to the boss texture. */
export const PIXIE_QUEEN_VISUAL_SCALE = 1.4 * WORLD_SPRITE_SCALE;
/** Phase-change tint flash duration. */
export const PIXIE_QUEEN_PHASE_FLASH_MS = 200;
/** Min distance (px) the teleport keeps from the player. */
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
// Phase-2 Bog-Frog adds were removed (2026-05-07) — combo-thorn density
// alone is enough threat; mobs on top read as "unfair piling on".

// --- Bloomheart (boss, Floor 2 — "Stalking Bloom" rework 2026-06-13) ---------
// No longer rooted: a mobile ranged-zoner carnivore plant. Stalks the player
// at mid-range (always moving, holds a standoff), and in Phase 2 periodically
// SINKS into the mire + re-blooms elsewhere (anti-corner relocate). Threat
// layers: aimed petal-fan + drifting delayed-detonation spores (now in P1 too)
// + a Phase-2 "Bloom Burst" radial with a rotating safe gap (fair-by-design).

export const BLOOMHEART_VISUAL_SCALE = 1.8 * WORLD_SPRITE_SCALE;
export const BLOOMHEART_PHASE_FLASH_MS = 200;
export const BLOOMHEART_INITIAL_DELAY_MS = 900;

// Movement: slow stalk toward the player that holds a standoff distance, plus
// a gentle tangential circle so it's never fully static even at range.
export const BLOOMHEART_STALK_SPEED_P1 = 40;
export const BLOOMHEART_STALK_SPEED_P2 = 62;
/** Mid-range the stalk tries to hold; closes in only when farther than this. */
export const BLOOMHEART_STALK_STANDOFF = 200;
/** Fraction of stalk speed spent on the tangential circle (anti-static). */
export const BLOOMHEART_STALK_CIRCLE_RATIO = 0.5;
/** Cooldown (ms) between circle-direction flips. */
export const BLOOMHEART_STALK_FLIP_MS = 2600;

// Petal fan (both phases): aimed 5-thorn wide fan (±30°) with mouth-open tell.
export const BLOOMHEART_FAN_SPREAD_RAD = (30 * Math.PI) / 180;
export const BLOOMHEART_FAN_TELEGRAPH_MS = 320;
export const BLOOMHEART_PHASE1_FAN_INTERVAL_MS = 1700;
export const BLOOMHEART_PHASE2_FAN_INTERVAL_MS = 1400;

// Spore mine (now BOTH phases — P1 gets a second threat beyond the fan): a
// drifting glow that detonates into a small radial after its lifetime.
export const BLOOMHEART_PHASE1_SPORE_INTERVAL_MS = 3800;
export const BLOOMHEART_PHASE2_SPORE_INTERVAL_MS = 2800;
export const BLOOMHEART_SPORE_SPEED = 140;
export const BLOOMHEART_SPORE_LIFETIME_MS = 750;
/** Mini-thorns the spore bursts into — phase-aware. */
export const BLOOMHEART_SPORE_BURST_COUNT_P1 = 5;
export const BLOOMHEART_SPORE_BURST_COUNT_P2 = 6;

// Bloom Burst (Phase 2 signature): radial of petals with a contiguous gap so
// there's always a reachable escape lane (Forest-Heart fairness principle).
export const BLOOMHEART_BLOOM_INTERVAL_MS = 5000;
export const BLOOMHEART_BLOOM_TELEGRAPH_MS = 380;
export const BLOOMHEART_BLOOM_THORNS = 12;
/** Contiguous skipped slots = the safe gap (3 of 12 ≈ 90°). */
export const BLOOMHEART_BLOOM_GAP_SLOTS = 3;

// Sink & Re-Bloom relocate (Phase 2 anti-corner): sink into the mire, surface
// elsewhere ≥ MIN_PLAYER_DIST away, re-bloom with a gapped burst.
export const BLOOMHEART_SINK_INTERVAL_MS = 6500;
export const BLOOMHEART_SINK_FADE_MS = 260;
/** Target re-emerge distance from the player. */
export const BLOOMHEART_REBLOOM_DIST = 220;
/** Hard minimum (px, 3 tiles) the re-emerge spot must keep from the player. */
export const BLOOMHEART_SINK_MIN_PLAYER_DIST = 3 * 64;
/**
 * Movement leash: Bloomheart may never cross past the floor's first vignette
 * ring (user request 2026-06-13 — she's a central zoner, the player should own
 * the outer area). The ring is an ellipse with half-axes w*0.28 / h*0.28 (see
 * RoomAtmosphere.paintFloorVignette layer index 4), so the leash uses the same
 * fraction of the full room size. Stalk + sink-relocate both respect it.
 */
export const BLOOMHEART_LEASH_RING_FRACTION = 0.28;

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

// --- Forest Heart (boss — "Drifting Spiral" rework) --------------------------
// No longer rooted: a floating core that drifts slowly around the room while
// firing rotating spiral arms the player weaves through. Phase 2 adds a second
// opposed arm + periodic spin-reversal + faster drift. No more add-spam.

/** Initial delay before the first spiral shot after spawn. */
export const FOREST_HEART_FIRE_INITIAL_DELAY_MS = 900;
/** Drift speed (px/s) toward the current wander target — phase-aware. */
export const FOREST_HEART_DRIFT_SPEED_P1 = 38;
export const FOREST_HEART_DRIFT_SPEED_P2 = 62;
/** How often (ms) a new wander target is picked. */
export const FOREST_HEART_DRIFT_REPICK_MS = 2600;
/** Distance (px) to a wander target below which we repick early (arrived). */
export const FOREST_HEART_DRIFT_ARRIVE_DIST = 40;
/** Spiral shot cadence (ms between thorns) — phase-aware. */
export const FOREST_HEART_SPIRAL_INTERVAL_P1 = 150;
export const FOREST_HEART_SPIRAL_INTERVAL_P2 = 130;
/** Angle the spiral advances per shot (degrees) — phase-aware. */
export const FOREST_HEART_SPIRAL_STEP_DEG_P1 = 23;
export const FOREST_HEART_SPIRAL_STEP_DEG_P2 = 27;
/** Number of evenly-offset spiral arms — phase-aware. */
export const FOREST_HEART_SPIRAL_ARMS_P1 = 1;
export const FOREST_HEART_SPIRAL_ARMS_P2 = 2;
/** Projectile speed (px/s) for spiral thorns — slower than default so the
 *  spiral reads as a curve the player can weave through. */
export const FOREST_HEART_SPIRAL_SPEED = 200;
/** Phase 2: cooldown (ms) before the spiral reverses spin direction. */
export const FOREST_HEART_SPIN_REVERSE_MS = 4200;
/** Visual scale applied to the boss texture. */
export const FOREST_HEART_VISUAL_SCALE = 1.0 * WORLD_SPRITE_SCALE;
/** Phase-change tint flash duration. */
export const FOREST_HEART_PHASE_FLASH_MS = 220;

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
/**
 * HP fraction below which a Vampire body enters berserker. Bumped 0.3 → 0.25
 * with the shared-pool refactor (Marquis-invulnerable-while-Lord-alive). The
 * Lord now soaks all damage in Phase 1; berserker triggers later in his bar
 * (last quarter instead of last third) so the Lord-berserker window is
 * shorter and less punishing. Same threshold gates Marquis's berserker once
 * the Lord is dead and Marquis becomes targetable.
 */
export const VAMPIRE_BERSERKER_HP_FRACTION = 0.25;

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

// --- Marquis of Mirages (Onyx Mansion boss, single body) -------------------
// Single vampire-mage boss replacing the old Vampire Twins (Crimson Lord +
// Sapphire Marquis). Reuses the marquis attack patterns (fan + teleport +
// berserker spin) and adds a Mirror-Portal special:
//   - Two mirrors materialize: entry near the boss, exit in the opposite
//     room corner.
//   - Boss fades into the entry portal, emerges at the exit, fires 3
//     homing projectiles in sequence (Cursed-Mirror style).
//   - Player can destroy the entry portal (3 hits) to nullify all live
//     homing projectiles linked to this special — clear counter-strategy.

export const MARQUIS_OF_MIRAGES_HP = 75;
export const MARQUIS_OF_MIRAGES_VISUAL_SCALE = 1.6 * WORLD_SPRITE_SCALE;
/** Phase-2 (berserker) HP threshold. Mirrors the old VAMPIRE setup. */
export const MARQUIS_OF_MIRAGES_BERSERKER_HP_FRACTION = 0.30;

/** Movement during Phase 1: kite the player at fixed distance, like the
 * old Sapphire Marquis. Numbers carry over so the early-phase feel is
 * stable for anyone used to the twins fight. */
export const MARQUIS_OF_MIRAGES_KITE_SPEED = 60;
export const MARQUIS_OF_MIRAGES_KITE_DISTANCE = 180;

/** Phase 1 fan: 5 projectiles, ±30° spread, every 1800 ms. Initial delay
 * at spawn so the player isn't hit before they read the boss. */
export const MARQUIS_OF_MIRAGES_FAN_COUNT = 5;
export const MARQUIS_OF_MIRAGES_FAN_SPREAD_RAD = (60 * Math.PI) / 180;
export const MARQUIS_OF_MIRAGES_FAN_INTERVAL_MS = 1800;
export const MARQUIS_OF_MIRAGES_FAN_INITIAL_DELAY_MS = 900;

/** Teleport cadence + min distance from PLAYER (not the boss) to avoid the
 * "materializes on the player" race when the player chases the fade-out. */
export const MARQUIS_OF_MIRAGES_TELEPORT_INTERVAL_MS = 4000;
export const MARQUIS_OF_MIRAGES_TELEPORT_MIN_PLAYER_DISTANCE = 180;
export const MARQUIS_OF_MIRAGES_TELEPORT_FADE_MS = 220;

/** Mirror Special — first trigger after spawn + random window between
 * subsequent triggers. User wanted "nicht zu oft / leicht random". */
export const MARQUIS_OF_MIRAGES_SPECIAL_INITIAL_DELAY_MS = 10000;
export const MARQUIS_OF_MIRAGES_SPECIAL_INTERVAL_MIN_MS = 8000;
export const MARQUIS_OF_MIRAGES_SPECIAL_INTERVAL_MAX_MS = 12000;

/** Mirror Special timing — sub-stages of the state machine. */
export const MARQUIS_OF_MIRAGES_SUMMON_MS = 380;        // portals materialize
export const MARQUIS_OF_MIRAGES_ENTER_MS = 460;          // fade-into-entry
export const MARQUIS_OF_MIRAGES_TRAVEL_MS = 200;         // invisible in-transit
export const MARQUIS_OF_MIRAGES_EXIT_MS = 360;           // emerge-at-exit fade-in
export const MARQUIS_OF_MIRAGES_FIRE_INTERVAL_MS = 320;  // gap between homing shots
export const MARQUIS_OF_MIRAGES_FIRE_COUNT = 3;
/** Lifetime added to the entry portal AFTER the firing finishes — gives
 * the player enough time to destroy the entry to clear linked projectiles. */
export const MARQUIS_OF_MIRAGES_ENTRY_LINGER_MS = 2500;
/** Exit portal cleanup — short despawn window after the firing ends. */
export const MARQUIS_OF_MIRAGES_EXIT_LINGER_MS = 700;

/** Homing-missile parameters for the special. Same turn rate as the
 * Cursed Mirror mob so the threat reads identically. */
export const MARQUIS_OF_MIRAGES_HOMING_TURN_RATE_DEG = 110;
export const MARQUIS_OF_MIRAGES_HOMING_LIFETIME_MS = 2200;

/** Mirror portal HP (entry portal — exit portal is non-destructible visual). */
export const MIRROR_PORTAL_HP = 3;
/** Mirror portal hitbox radius — generous so missiles connect easily under
 * pressure. */
export const MIRROR_PORTAL_HITBOX_RADIUS = 18;

// --- Lord Onyx (secret endboss, Onyx Mansion) -------------------------------
// Rooted endgame boss. Three phases of snappy bullet-hell base patterns,
// each with a per-phase timer that triggers a Prism Special — the special
// consumes one of the 3 floor gems from the altar (Chunk 2 hooks). Earned
// by activating the gem seal with all 3 floor trophies.

export const LORD_ONYX_HP = 90;
/** Visual scale — boss-tier silhouette but slightly smaller than the
 * original 1.7× pass. User-flagged the V2 sprite as a touch too dominant
 * compared to other rooted bosses (Forest Heart, Bloomheart) — 1.5×
 * brings him in line while the V3 "Tattered Cultist" texture (taller
 * 64×96 canvas with hem streamers) keeps the silhouette presence. */
export const LORD_ONYX_VISUAL_SCALE = 1.5 * WORLD_SPRITE_SCALE;

/** Slower turn rate than Cursed Mirror (110°/s) so even an end-game player
 * with stat-pumped move speed can sharp-cut around it. */
export const LORD_ONYX_HOMING_TURN_RATE_DEG = 60;
export const LORD_ONYX_PROJECTILE_LIFETIME_MS = 2400;

// Phase 1: aimed 5-thorn fan + slowly-rotating 4-thorn cross.
// Two overlapping rhythms — fan tracks the player, cross is boss-relative.
export const LORD_ONYX_P1_FAN_INTERVAL_MS = 1600;
export const LORD_ONYX_P1_FAN_INITIAL_DELAY_MS = 800;
export const LORD_ONYX_P1_FAN_THORN_COUNT = 5;
export const LORD_ONYX_P1_FAN_SPREAD_DEG = 32;
export const LORD_ONYX_P1_CROSS_INTERVAL_MS = 2400;
export const LORD_ONYX_P1_CROSS_INITIAL_DELAY_MS = 1800;
export const LORD_ONYX_P1_CROSS_DRIFT_DEG_PER_S = 22;

// Phase 2: 8-arm spinning ring with 90° gap (2 of 8 arms skipped) +
// telegraphed walk-snipe through the gap (every 2 s). Wraith adds spawn
// once on phase entry.
export const LORD_ONYX_P2_RING_ARM_COUNT = 8;
/** 2 arms skipped of 8 = 90° rotating gap. */
export const LORD_ONYX_P2_RING_GAP_ARMS = 2;
export const LORD_ONYX_P2_RING_SPIN_DEG_PER_S = 56;
export const LORD_ONYX_P2_RING_FIRE_INTERVAL_MS = 220;
export const LORD_ONYX_P2_SNIPE_INTERVAL_MS = 2000;
export const LORD_ONYX_P2_SNIPE_TELEGRAPH_MS = 380;
export const LORD_ONYX_P2_ADD_COUNT = 2;

// Phase 3: enrolling radial waves — 12 thorns spawn at the room perimeter
// and converge inward toward Lord Onyx. Forces the player into a mid-range
// orbit donut (too close = bullet gaps converge too tight; too far = you're
// where they spawn). Aimed homing on top so you can't just camp the donut.
export const LORD_ONYX_P3_WAVE_INTERVAL_MS = 2800;
export const LORD_ONYX_P3_WAVE_THORN_COUNT = 12;
/** Spawn radius for inward-converging thorns (relative to Lord Onyx). */
export const LORD_ONYX_P3_WAVE_SPAWN_RADIUS = 320;
export const LORD_ONYX_P3_WAVE_SPEED = 110;
export const LORD_ONYX_P3_WAVE_LIFETIME_MS = 4000;
/** Passive warning-marker window before each inward thorn becomes a real
 * (hitbox-having) projectile. Without this the perimeter spawns can land
 * directly on the player, which the user flagged as unfair. Bumped 500 →
 * 650 (2026-05-07) — players asked for a slightly longer no-damage tell. */
export const LORD_ONYX_P3_WAVE_TELEGRAPH_MS = 650;
export const LORD_ONYX_P3_HOMING_INTERVAL_MS = 1400;

// Per-phase Prism Special trigger — counts from phase entry. The matching
// gem flies from the altar into the boss's prism during the charge, then
// the gem-themed pattern fires and the altar socket clears.
export const LORD_ONYX_SPECIAL_DELAY_P1_MS = 6000;
export const LORD_ONYX_SPECIAL_DELAY_P2_MS = 5000;
export const LORD_ONYX_SPECIAL_DELAY_P3_MS = 4000;

// Special state machine (model B — boss invulnerable during centering →
// charge → fire → recovering, vulnerable again on idle).
/** Pre-charge centering teleport — every Prism Special starts with a
 * brief blink to the room center so the radial patterns stay
 * symmetrical and the player has a fixed reference point. Skipped if
 * the boss is already within ~half a tile of center. */
export const LORD_ONYX_SPECIAL_CENTER_TELEPORT_MS = 400;
/** Charge window: prism glow builds, boss is rooted + invulnerable, gem
 * flies in from the altar. Patterns fire at charge-end. */
export const LORD_ONYX_SPECIAL_CHARGE_MS = 1200;
/** Brief invulnerable cooldown after the pattern finishes. Prevents the
 * player from punishing the recovery frame. */
export const LORD_ONYX_SPECIAL_RECOVER_MS = 400;
/** Glow colors keyed to the 3 floor gems (matching floor palette glow). */
export const LORD_ONYX_SPECIAL_COLOR_P1 = 0x4afa80; // emerald
export const LORD_ONYX_SPECIAL_COLOR_P2 = 0x4a80fa; // sapphire
export const LORD_ONYX_SPECIAL_COLOR_P3 = 0xc864ff; // amethyst / onyx

// Phase 1 special — Forest Wrath: boss "ignites" 10 emerald-tinted thorns
// from his prism that fan out radially, then home onto the player for a
// few seconds before despawning. Boss stays passive throughout — no other
// attacks fire during this window.
export const LORD_ONYX_FOREST_WRATH_THORN_COUNT = 10;
/** Initial radial spread speed before homing kicks in. */
export const LORD_ONYX_FOREST_WRATH_INITIAL_SPEED = 160;
/** Homing turn rate. Slightly looser than Cursed Mirror so the player
 * has room to handle the boss's normal Phase 1 base patterns (fan +
 * cross) firing on top of the homing swarm. */
export const LORD_ONYX_FOREST_WRATH_HOMING_TURN_DEG = 100;
/** How long each homing thorn lives before despawning. */
export const LORD_ONYX_FOREST_WRATH_LIFETIME_MS = 10000;
/** Total special window — slightly longer than thorn lifetime so the
 * recovery doesn't bleed into the despawn frame. */
export const LORD_ONYX_FOREST_WRATH_PATTERN_MS = 10300;

// Phase 2 special — Tide Mandala: 2 sapphire orbiting rings around the
// boss + aimed thorns through the gaps. Bog-Colossus-style.
export const LORD_ONYX_TIDE_OUTER_THORNS = 6;
export const LORD_ONYX_TIDE_OUTER_RADIUS = 150;
export const LORD_ONYX_TIDE_OUTER_SPEED_DEG_PER_S = 90;
export const LORD_ONYX_TIDE_INNER_THORNS = 5;
export const LORD_ONYX_TIDE_INNER_RADIUS = 80;
export const LORD_ONYX_TIDE_INNER_SPEED_DEG_PER_S = -130;
export const LORD_ONYX_TIDE_ORBIT_DURATION_MS = 2600;
export const LORD_ONYX_TIDE_AIMED_INTERVAL_MS = 650;
export const LORD_ONYX_TIDE_RELEASE_SPEED = 220;
export const LORD_ONYX_TIDE_PATTERN_MS = 3300;

// Phase 3 special — Crimson Web: pulsing radial waves expanding outward
// from the boss. Each wave is N thorns at evenly-spaced slots (= rotation
// positions); one slot is the wave's gap. Adjacent thorns in the same
// wave are connected by jagged crimson lightning bolts that track their
// projectiles each frame. Successive waves drift their gap by 1 slot so
// the player has to "snake" through the wave-front.
export const LORD_ONYX_WEB_WAVE_COUNT = 14;
export const LORD_ONYX_WEB_WAVE_INTERVAL_MS = 700;
/** Slots in a wave's ring. 12 slots = 30° apart; with 1 skipped that's
 * a 30°-wide gap. With drift = 1 slot per wave, the gap moves only 30°
 * per 700 ms — base-speed player can keep tangential pace at the
 * radius the wave-front is at (~150 px/s required at R=200). */
export const LORD_ONYX_WEB_THORNS_PER_WAVE = 12;
/** Each successive wave drifts its gap slot by this many positions in
 * the same direction — gives the "drift to thread" feel. */
export const LORD_ONYX_WEB_GAP_DRIFT_SLOTS = 1;
/** Outward radial speed for every wave thorn. Slow enough that the
 * player has time to read each wave + thread its gap. */
export const LORD_ONYX_WEB_WAVE_SPEED = 110;
/** Lifetime per wave thorn (covers the room edge + a bit). */
export const LORD_ONYX_WEB_WAVE_LIFETIME_MS = 3500;
/** Total special window — sustained pulsing pressure across the full
 * window, gap rotates around the boss as the player snakes through. */
export const LORD_ONYX_WEB_PATTERN_MS = 10000;
/** Crimson tint for every web projectile + lightning bolt. */
export const LORD_ONYX_WEB_COLOR = 0xc8284a;

// Teleport movement — keeps the rooted boss visually interesting.
// Telegraph: boss fades to 0.35 alpha + a tinted-black shadow of his sprite
// appears at the target location, pulsing. After the telegraph he snaps to
// the target and the shadow fades. Attacks continue from his current
// position during the telegraph so the player has to read both the
// patterns and the imminent reposition.
export const LORD_ONYX_TELEPORT_INTERVAL_MS = 4500;
export const LORD_ONYX_TELEPORT_TELEGRAPH_MS = 700;
export const LORD_ONYX_TELEPORT_INITIAL_DELAY_MS = 3500;
/** Min distance from the player at the chosen teleport target. */
export const LORD_ONYX_TELEPORT_MIN_PLAYER_DIST = 220;
/** Wall margin so he never teleports into a corner where Phase 3 waves
 * would spawn far outside the room. */
export const LORD_ONYX_TELEPORT_WALL_MARGIN = 96;

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
  /** Sapphire-themed thorn variant — same silhouette as the default green
   *  Thorn but blue/cyan-coded so Sapphire-Swamp mobs + bosses don't look
   *  like they're throwing emerald shards on a swamp floor. The Pool
   *  picks this one automatically when the active floor is sapphire-swamp.
   */
  SapphireThorn: 'tex-enemy-thorn-sapphire',
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
  ItemMagicPotion: 'tex-item-magic-potion',
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
  ItemMagicShard: 'tex-item-magic-shard',
  ItemWizardGlasses: 'tex-item-wizard-glasses',
  ItemFireOrb: 'tex-item-fire-orb',
  ItemBloodOfMarquis: 'tex-item-blood-of-marquis',
  /** Empty-vial variant of Blood of Marquis — shown in the [Q] active-item
   *  slot when HP < 2 (player just spent the active or can't afford it).
   *  Same silhouette / glass / cork as the full vial, just no liquid +
   *  dimmer halo so the spent state reads visually. */
  ItemBloodOfMarquisEmpty: 'tex-item-blood-of-marquis-empty',
  ItemBloodlettersPact: 'tex-item-bloodletters-pact',
  ItemTransmutationStone: 'tex-item-transmutation-stone',
  ItemHummingbirdFeather: 'tex-item-hummingbird-feather',
  MinibossThornwoodShambler: 'tex-miniboss-thornwood-shambler',
  MinibossMireLurker: 'tex-miniboss-mire-lurker',
  MinibossDoppelganger: 'tex-miniboss-doppelganger',
  BossMossyBehemoth: 'tex-boss-mossy-behemoth',
  BossPixieQueen: 'tex-boss-pixie-queen',
  BossForestHeart: 'tex-boss-forest-heart',
  Wraith: 'tex-enemy-wraith',
  PossessedCandelabra: 'tex-enemy-possessed-candelabra',
  CursedMirror: 'tex-enemy-cursed-mirror',
  MansionMissile: 'tex-projectile-mansion-missile',
  /** Floor-coloured caster orbs (round magic-bolt look, like the Doppelgänger
   *  / MansionMissile) for the Emerald + Sapphire minibosses — they read as
   *  casters now, so the arrow-thorn no longer fits. */
  CasterOrbEmerald: 'tex-projectile-caster-orb-emerald',
  CasterOrbSapphire: 'tex-projectile-caster-orb-sapphire',
  FlameMissile: 'tex-projectile-flame-missile',
  WaxPuddle: 'tex-hazard-wax-puddle',
  BossCrimsonLord: 'tex-boss-crimson-lord',
  BossSapphireMarquis: 'tex-boss-sapphire-marquis',
  /** Marquis of Mirages — single vampire-mage replacement for the old
   * twins. Caped conjurer silhouette, oval hand-mirror raised. */
  BossMarquisOfMirages: 'tex-boss-marquis-of-mirages',
  /** Mirror portal (entry) — active state with cyan rune-glow halo + lit glass. */
  MirrorPortalEntry: 'tex-mirror-portal-entry',
  /** Mirror portal (exit) — passive state, dimmer trim + dark glass. */
  MirrorPortalExit: 'tex-mirror-portal-exit',
  BloodProjectile: 'tex-projectile-blood',
  BossLordOnyx: 'tex-boss-lord-onyx',
  /** Prismancy unlock — red/gold wizard skin awarded by defeating Lord
   * Onyx. Auto-applied at Player construction if unlocked. */
  PlayerPrismancy: 'tex-player-prismancy',
  /** Spellblade — fallen knight of the Prismarch (silver helm + onyx
   *  blade + tattered cloak). Unlocked via a Prismarch defeat, selectable
   *  in the main-menu character cycle. */
  PlayerSpellblade: 'tex-player-spellblade',
  /** Spellblade Prismarch-tier skin — black helm + crimson cape + gold
   *  trim + crimson visor/blade glow. Earned by defeating the Prismarch
   *  WHILE playing the Spellblade (separate gate from the character
   *  unlock; the Spellblade itself unlocks on any Prismarch kill). */
  PlayerSpellbladePrismarch: 'tex-player-spellblade-prismarch',
  /** Spellblade Bolt — small spell-sword projectile, 24×24 like the
   *  Magic Missile so it shares the missile pool's hitbox math. Drawn
   *  white so `missileTint` colours the blade glow. Rotated per-cast
   *  to match the bolt's flight direction. */
  SpellbladeBolt: 'tex-spellblade-bolt',
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
/**
 * Price pass 2026-06-12 (user-flagged "ich kann die ganze Zeit alles
 * kaufen"): the run-length pass made the economy much richer (10/12/14
 * rooms, champion coin bursts, miniboss coin spray, bumped
 * coinDropChances) — everything got ~+50%. Heart 3→5, Key 5→8, items
 * see their per-item `shopPrice` bumps in data/items.ts.
 */
export const SHOP_PRICES = {
  heart: 5,
  key: 8,
} as const;
export const SHOP_DEFAULT_ITEM_PRICE = 22;
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
  moveSpeed: PLAYER_SPEED,
  missileScale: 1.0,
  piercingCount: 0,
  homingTurnRate: 0,
  burnDamageFactor: 0,
  multishotCount: 1,
  burstCount: 1,
};

/**
 * Triple-burst cadence ("Hummingbird Feather", replaced the fire-rate ramp
 * 2026-06-12). Gap between the shots WITHIN one burst — fast enough to
 * read as a flutter, slow enough that the three projectiles stay visually
 * distinct in flight.
 */
export const BURST_SHOT_GAP_MS = 80;
/**
 * Cooldown stretch BETWEEN bursts, as a factor on the character's normal
 * fire interval. At 2.4 the wizard fires 3-shot bursts every 600 ms
 * (vs 1 shot / 250 ms base) = +25% sustained DPS plus front-loaded burst
 * damage — an upgrade, but a rhythm-changing one, not a flat ×3.
 */
export const BURST_COOLDOWN_FACTOR = 2.4;

/**
 * Bloodletter's Pact [Q] (active rework 2026-06-12): max-HP cost per use in
 * HP units (2 = one full heart container). The activation gate requires
 * max HP ≥ cost + 2 so the player always keeps at least one container.
 */
export const BLOOD_PACT_HEART_COST = 2;

/** Damage-Multiplier pro Multishot-Shot wenn `multishotCount > 1`. Single
 * shot bleibt 1.0× damage, alles ab 2 Shots fired bei 0.80×/Shot. So
 * gibt Wizard Glasses (count = 2) auf großen Targets 1.6× DPS und auf
 * Single-Hit-Trash 0.80× (Sniper-Trade-off, vermeidet generic +damage).
 * War zwischenzeitlich 0.75 (1.5× / 0.75×) — gebumped 2026-05-09 nach
 * User-Feedback "fühlt sich kaum wie ein upgrade an" weil der
 * Trash-Case zu schmerzhaft war. 0.80 hält den Trade-off (Item ist
 * Boss-Killer, nicht Group-Cleaner) liest sich aber spürbarer als Up. */
export const MULTISHOT_DAMAGE_MULT = 0.8;
/** Perpendikulärer Abstand zwischen den Multishot-Projektilen (in Pixel,
 * im World-Space). 14 px ergibt bei 2 Shots einen 14-px-Gap, sodass beide
 * Bolts auf großen Boss-Hitboxen problemlos landen aber bei kleinem Trash
 * (Forest Sprite ~16 px Hitbox) oft nur einer trifft. */
export const MULTISHOT_OFFSET_PX = 14;

/** Damage-Multiplier-Sequenz für die Magic-Shard-Pierces. Index 0 = erster
 * Hit (volle Schadensapplikation), Index 1 = nach erstem Pierce (75 %),
 * Index 2 = nach zweitem Pierce (50 %). Längere Arrays würden mehr Pierces
 * erlauben — momentan ist das 1+piercingCount-Hits gegated. */
export const PIERCING_DAMAGE_FACTORS = [1.0, 0.75, 0.5] as const;
/** Anzahl der Burn-Ticks pro Fire-Orb-Treffer. */
export const BURN_TICK_COUNT = 2;
/** Abstand zwischen Burn-Ticks in ms. */
export const BURN_TICK_INTERVAL_MS = 600;
/** Fixes Brightness-Tinting für brennende Gegner während des DoT. */
export const BURN_TINT = 0xff8030;

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
  End: 'EndScene',
  Pause: 'PauseScene',
  Stats: 'StatsScene',
  SoundSettings: 'SoundSettingsScene',
  Controls: 'ControlsScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
