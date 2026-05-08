import Phaser from 'phaser';
import { DepthLayers } from '../../config/DepthLayers';
import {
  ENEMY_PROJECTILE_SPEED,
  LORD_ONYX_FOREST_WRATH_HOMING_TURN_DEG,
  LORD_ONYX_FOREST_WRATH_INITIAL_SPEED,
  LORD_ONYX_FOREST_WRATH_LIFETIME_MS,
  LORD_ONYX_FOREST_WRATH_PATTERN_MS,
  LORD_ONYX_FOREST_WRATH_THORN_COUNT,
  LORD_ONYX_HOMING_TURN_RATE_DEG,
  LORD_ONYX_P1_CROSS_DRIFT_DEG_PER_S,
  LORD_ONYX_P1_CROSS_INITIAL_DELAY_MS,
  LORD_ONYX_P1_CROSS_INTERVAL_MS,
  LORD_ONYX_P1_FAN_INITIAL_DELAY_MS,
  LORD_ONYX_P1_FAN_INTERVAL_MS,
  LORD_ONYX_P1_FAN_SPREAD_DEG,
  LORD_ONYX_P1_FAN_THORN_COUNT,
  LORD_ONYX_P2_ADD_COUNT,
  LORD_ONYX_P2_RING_ARM_COUNT,
  LORD_ONYX_P2_RING_FIRE_INTERVAL_MS,
  LORD_ONYX_P2_RING_GAP_ARMS,
  LORD_ONYX_P2_RING_SPIN_DEG_PER_S,
  LORD_ONYX_P2_SNIPE_INTERVAL_MS,
  LORD_ONYX_P2_SNIPE_TELEGRAPH_MS,
  LORD_ONYX_P3_HOMING_INTERVAL_MS,
  LORD_ONYX_P3_WAVE_INTERVAL_MS,
  LORD_ONYX_P3_WAVE_LIFETIME_MS,
  LORD_ONYX_P3_WAVE_SPAWN_RADIUS,
  LORD_ONYX_P3_WAVE_SPEED,
  LORD_ONYX_P3_WAVE_TELEGRAPH_MS,
  LORD_ONYX_P3_WAVE_THORN_COUNT,
  LORD_ONYX_PHASE_FLASH_MS,
  LORD_ONYX_PROJECTILE_LIFETIME_MS,
  LORD_ONYX_SPECIAL_CENTER_TELEPORT_MS,
  LORD_ONYX_SPECIAL_CHARGE_MS,
  LORD_ONYX_SPECIAL_COLOR_P1,
  LORD_ONYX_SPECIAL_COLOR_P2,
  LORD_ONYX_SPECIAL_COLOR_P3,
  LORD_ONYX_SPECIAL_DELAY_P1_MS,
  LORD_ONYX_SPECIAL_DELAY_P2_MS,
  LORD_ONYX_SPECIAL_DELAY_P3_MS,
  LORD_ONYX_SPECIAL_RECOVER_MS,
  LORD_ONYX_TELEPORT_INITIAL_DELAY_MS,
  LORD_ONYX_TELEPORT_INTERVAL_MS,
  LORD_ONYX_TELEPORT_MIN_PLAYER_DIST,
  LORD_ONYX_TELEPORT_TELEGRAPH_MS,
  LORD_ONYX_TELEPORT_WALL_MARGIN,
  LORD_ONYX_TIDE_AIMED_INTERVAL_MS,
  LORD_ONYX_TIDE_INNER_RADIUS,
  LORD_ONYX_TIDE_INNER_SPEED_DEG_PER_S,
  LORD_ONYX_TIDE_INNER_THORNS,
  LORD_ONYX_TIDE_ORBIT_DURATION_MS,
  LORD_ONYX_TIDE_OUTER_RADIUS,
  LORD_ONYX_TIDE_OUTER_SPEED_DEG_PER_S,
  LORD_ONYX_TIDE_OUTER_THORNS,
  LORD_ONYX_TIDE_PATTERN_MS,
  LORD_ONYX_TIDE_RELEASE_SPEED,
  LORD_ONYX_VISUAL_SCALE,
  LORD_ONYX_WEB_COLOR,
  LORD_ONYX_WEB_GAP_DRIFT_SLOTS,
  LORD_ONYX_WEB_PATTERN_MS,
  LORD_ONYX_WEB_THORNS_PER_WAVE,
  LORD_ONYX_WEB_WAVE_COUNT,
  LORD_ONYX_WEB_WAVE_INTERVAL_MS,
  LORD_ONYX_WEB_WAVE_LIFETIME_MS,
  LORD_ONYX_WEB_WAVE_SPEED,
  TextureKeys,
} from '../../config/GameConfig';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { type Vector2 } from '../../types';
import { getSfxSynth } from '../../systems/SfxSynth';
import { EventBus } from '../../utils/EventBus';
import {
  type EnemyProjectile,
} from '../projectiles/EnemyProjectile';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * One thorn currently orbiting Lord Onyx during the Tide Mandala special.
 * `tickOrbitingThorns` repositions each one along its rotating circle
 * every frame, then `releaseOrbitingThorns` flings them outward.
 */
interface OrbitingThorn {
  projectile: EnemyProjectile;
  angle: number;
  radius: number;
  /** Radians per second. Negative = counter-clockwise. */
  angularSpeed: number;
}

type SpecialState =
  | 'idle'
  | 'centering' // brief teleport to room center before the charge
  | 'charging'
  | 'firing'
  | 'recovering';

/**
 * Host adapter for The Prismarch — needs the player (homing target),
 * projectile pool, and `spawnEnemyAt` for Phase 2 Wraith adds.
 */
export interface LordOnyxHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * The Prismarch — secret endboss, rooted at the seal. Three phases of
 * snappy ETG-style bullet-hell, each with a per-phase Prism Special timer
 * (Chunk 2 hooks `lordOnyx:specialFired` to play the gem-themed pattern
 * and consume the matching gem from the altar).
 *
 * Phase 1 (HP > 66 %) — aimed 5-thorn fan every 1.6 s + slowly-drifting
 * 4-thorn cross every 2.4 s. Two overlapping rhythms; player learns to
 * predict the fan and weave through the cross.
 *
 * Phase 2 (33 % < HP ≤ 66 %) — on entry: 2 Wraith adds at the room
 * corners + camera shake. Spinning 8-arm ring with a rotating 90° gap
 * (fire every 220 ms) PLUS a telegraphed walk-snipe every 2 s — the snipe
 * locks aim during a 380 ms beam telegraph and fires a fast aimed thorn
 * along that locked line. Move out of the line during the telegraph to
 * dodge.
 *
 * Phase 3 (HP ≤ 33 %) — on entry: room flash + heavy shake. Enrolling
 * inward radial wave every 2.8 s — 12 thorns spawn at the room perimeter
 * (radius 320 from boss) and converge inward, forcing the player into a
 * mid-range orbit donut. Aimed homing every 1.4 s on top so you can't
 * camp the donut indefinitely.
 */
export class LordOnyx extends BossEnemy {
  override readonly displayName = 'The Prismarch';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 2 / 3, phaseIndex: 2 },
    { hpThresholdFraction: 1 / 3, phaseIndex: 3 },
  ];

  private readonly host: LordOnyxHost;

  /** Per-phase Prism Special trigger — counts from phase entry. */
  private phaseEnteredAt = 0;
  private specialFiredThisPhase = false;

  // Phase 1 timers
  private nextFanAt = 0;
  private nextCrossAt = 0;

  // Phase 2 timers + state
  private ringSpinDeg = 0;
  private nextRingFireAt = 0;
  private nextSnipeAt = 0;
  private snipeBeam: Phaser.GameObjects.Graphics | null = null;
  private snipeFireAt: number | null = null;
  private snipeAimX = 0;
  private snipeAimY = 0;

  // Phase 3 timers
  private nextWaveAt = 0;
  private nextHomingAt = 0;

  // Teleport state machine — keeps the rooted boss visually moving.
  private nextTeleportAt = 0;
  private teleportTelegraphStartedAt: number | null = null;
  private teleportTargetX = 0;
  private teleportTargetY = 0;
  private teleportShadow: Phaser.GameObjects.Image | null = null;

  // Special-attack state machine (model B — invulnerable during all
  // non-idle states). Charge → fire → recover → back to idle.
  private specialState: SpecialState = 'idle';
  private specialStateStartedAt = 0;
  private specialPhase: 1 | 2 | 3 | null = null;
  private chargeHalo: Phaser.GameObjects.Arc | null = null;
  private chargeTween: Phaser.Tweens.Tween | null = null;
  /** Active orbiting thorns during the Tide Mandala (Phase 2 special). */
  private orbitingThorns: OrbitingThorn[] = [];
  private nextOrbitAimedAt = 0;
  private orbitAimedUntil = 0;
  private orbitReleaseAt = 0;
  /** Active Crimson Web bolts (Phase 3 special). Each bolt connects two
   * outward-moving wave projectiles, redrawn every frame from their
   * current positions until either projectile despawns. */
  private crimsonWebBolts: {
    left: EnemyProjectile;
    right: EnemyProjectile;
    graphics: Phaser.GameObjects.Graphics;
  }[] = [];
  /** Stored pre-special position. Currently unused (no special moves the
   * boss), but reserved so future patterns can dash + return. */
  private prePatternX = 0;
  private prePatternY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: LordOnyxHost) {
    super(scene, x, y, ENEMIES['boss-lord-onyx']);
    this.host = host;
    this.setScale(LORD_ONYX_VISUAL_SCALE);

    // Body doesn't apply velocity but is still movable via setPosition for
    // teleports. Immovable so contact with the player doesn't shove him.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    const now = scene.time.now;
    this.phaseEnteredAt = now;
    this.nextFanAt = now + LORD_ONYX_P1_FAN_INITIAL_DELAY_MS;
    this.nextCrossAt = now + LORD_ONYX_P1_CROSS_INITIAL_DELAY_MS;
    this.nextTeleportAt = now + LORD_ONYX_TELEPORT_INITIAL_DELAY_MS;
  }

  protected tickAI(time: number, delta: number): void {
    const player = this.host.getPlayer();
    if (!player.active) return;

    // Special-attack state machine takes precedence — while charging /
    // firing / recovering, the boss is rooted, invulnerable, and skips
    // teleport. Forest Wrath (Phase 1 special) is the exception: base
    // patterns continue firing alongside the homing barrage, so the
    // homing has been tuned looser to compensate.
    if (this.specialState !== 'idle') {
      this.tickSpecial(time, delta, player);
      if (this.specialState === 'firing' && this.specialPhase === 1) {
        this.tickPhase1(time, player);
      }
      return;
    }

    // Teleport runs in parallel with the phase patterns so attacks keep
    // pressuring the player during the telegraph window.
    this.tickTeleport(time, player);

    // Per-phase Prism Special trigger — fires once per phase after the
    // configured delay from phase entry.
    if (!this.specialFiredThisPhase) {
      const delay =
        this.currentPhase === 1
          ? LORD_ONYX_SPECIAL_DELAY_P1_MS
          : this.currentPhase === 2
            ? LORD_ONYX_SPECIAL_DELAY_P2_MS
            : LORD_ONYX_SPECIAL_DELAY_P3_MS;
      if (time - this.phaseEnteredAt >= delay) {
        this.beginSpecial();
        this.specialFiredThisPhase = true;
        return;
      }
    }

    if (this.currentPhase === 1) this.tickPhase1(time, player);
    else if (this.currentPhase === 2) this.tickPhase2(time, delta, player);
    else this.tickPhase3(time, player);
  }

  // --- Teleport movement -------------------------------------------------

  private tickTeleport(time: number, player: Player): void {
    if (this.teleportTelegraphStartedAt !== null) {
      // Mid-telegraph — finish when the window expires.
      if (
        time >=
        this.teleportTelegraphStartedAt + LORD_ONYX_TELEPORT_TELEGRAPH_MS
      ) {
        this.executeTeleport();
      }
      return;
    }
    // Don't begin a teleport during a snipe telegraph — the beam would be
    // anchored to the boss's pre-teleport position while the actual snipe
    // would fire from the post-teleport position, breaking the read.
    if (this.snipeFireAt !== null) {
      this.nextTeleportAt = Math.max(this.nextTeleportAt, time + 200);
      return;
    }
    if (time >= this.nextTeleportAt) {
      this.beginTeleportTelegraph(player, time);
    }
  }

  private beginTeleportTelegraph(player: Player, time: number): void {
    const target = this.pickTeleportTarget(player);
    this.teleportTargetX = target.x;
    this.teleportTargetY = target.y;
    this.teleportTelegraphStartedAt = time;
    EventBus.emit('enemy:charge');

    // Boss fades — still visible enough to read the patterns he's firing.
    this.setAlpha(0.35);

    // Black shadow silhouette of the boss at the target position.
    const shadow = this.scene.add.image(target.x, target.y, this.texture.key);
    shadow.setScale(this.scaleX, this.scaleY);
    shadow.setTintFill(0x000000);
    shadow.setAlpha(0.30);
    shadow.setDepth(this.depth - 1);
    this.teleportShadow = shadow;

    this.scene.tweens.add({
      targets: shadow,
      alpha: { from: 0.30, to: 0.62 },
      duration: 280,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private executeTeleport(): void {
    if (this.teleportShadow) {
      this.scene.tweens.killTweensOf(this.teleportShadow);
      this.teleportShadow.destroy();
      this.teleportShadow = null;
    }
    this.setPosition(this.teleportTargetX, this.teleportTargetY);
    this.setAlpha(1);
    this.teleportTelegraphStartedAt = null;
    this.nextTeleportAt = this.scene.time.now + LORD_ONYX_TELEPORT_INTERVAL_MS;

    // Brief settle flash on arrival so the snap reads visually.
    this.scene.cameras.main.shake(80, 0.003);
  }

  private pickTeleportTarget(player: Player): { x: number; y: number } {
    const bounds = this.host.getRoomBounds();
    const margin = LORD_ONYX_TELEPORT_WALL_MARGIN;
    const minX = bounds.minX + margin;
    const maxX = bounds.maxX - margin;
    const minY = bounds.minY + margin;
    const maxY = bounds.maxY - margin;
    const minPlayerDist = LORD_ONYX_TELEPORT_MIN_PLAYER_DIST;

    let bestX = (minX + maxX) / 2;
    let bestY = (minY + maxY) / 2;
    let bestDistSq = -Infinity;
    for (let attempt = 0; attempt < 8; attempt++) {
      const cx = Phaser.Math.Between(minX, maxX);
      const cy = Phaser.Math.Between(minY, maxY);
      const dx = cx - player.x;
      const dy = cy - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minPlayerDist * minPlayerDist) {
        return { x: cx, y: cy };
      }
      // Keep the best candidate so far in case all attempts fail.
      if (distSq > bestDistSq) {
        bestDistSq = distSq;
        bestX = cx;
        bestY = cy;
      }
    }
    return { x: bestX, y: bestY };
  }

  // --- Phase 1: aimed fan + drifting cross --------------------------------

  private tickPhase1(time: number, player: Player): void {
    if (time >= this.nextFanAt) {
      this.fireAimedFan(player);
      this.nextFanAt = time + LORD_ONYX_P1_FAN_INTERVAL_MS;
    }
    if (time >= this.nextCrossAt) {
      this.fireDriftingCross(time);
      this.nextCrossAt = time + LORD_ONYX_P1_CROSS_INTERVAL_MS;
    }
  }

  private fireAimedFan(player: Player): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const baseAngle = Math.atan2(dy, dx);
    const spread = Phaser.Math.DegToRad(LORD_ONYX_P1_FAN_SPREAD_DEG);
    const count = LORD_ONYX_P1_FAN_THORN_COUNT;
    const half = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + ((i - half) / half) * spread;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.MansionMissile,
      );
    }
  }

  private fireDriftingCross(time: number): void {
    // Drift the cross orientation by ~22°/s so successive crosses don't
    // overlap on the cardinal axes — keeps the pattern from being trivially
    // dodgeable by camping the diagonals.
    const driftRad =
      ((time / 1000) * LORD_ONYX_P1_CROSS_DRIFT_DEG_PER_S * Math.PI) / 180;
    const arms = 4;
    for (let i = 0; i < arms; i++) {
      const a = driftRad + (i / arms) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.BloodProjectile,
      );
    }
  }

  // --- Phase 2: spinning ring with rotating gap + telegraphed snipe ------

  private tickPhase2(time: number, delta: number, player: Player): void {
    // Advance the ring rotation each frame.
    this.ringSpinDeg += LORD_ONYX_P2_RING_SPIN_DEG_PER_S * (delta / 1000);

    // Fire a ring volley every interval (skip the gap arms — they form a
    // 90° rotating safe band that the player must orbit with).
    if (time >= this.nextRingFireAt) {
      this.fireRingVolley();
      this.nextRingFireAt = time + LORD_ONYX_P2_RING_FIRE_INTERVAL_MS;
    }

    // Walk-snipe state machine: idle → telegraph → fire → cooldown.
    // Don't begin a new snipe telegraph during a teleport — same beam/snap
    // mismatch issue. Mid-flight snipes (already telegraphing) finish.
    if (this.snipeFireAt !== null && time >= this.snipeFireAt) {
      this.executeSnipe();
    } else if (
      this.snipeFireAt === null &&
      this.teleportTelegraphStartedAt === null &&
      time >= this.nextSnipeAt
    ) {
      this.beginSnipeTelegraph(player, time);
    }
  }

  private fireRingVolley(): void {
    const arms = LORD_ONYX_P2_RING_ARM_COUNT;
    const skip = LORD_ONYX_P2_RING_GAP_ARMS;
    const spinRad = Phaser.Math.DegToRad(this.ringSpinDeg);
    // Skip the first `skip` consecutive arms of the rotated ring → makes a
    // moving 90°-wide gap (with skip=2 of 8 arms).
    for (let i = skip; i < arms; i++) {
      const a = spinRad + (i / arms) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.MansionMissile,
      );
    }
  }

  private beginSnipeTelegraph(player: Player, time: number): void {
    // Lock the aim onto the player's current position — moving out of this
    // line during the telegraph window is the dodge.
    this.snipeAimX = player.x;
    this.snipeAimY = player.y;
    this.snipeFireAt = time + LORD_ONYX_P2_SNIPE_TELEGRAPH_MS;
    // Audio cue for the snipe wind-up so the player knows to step off the
    // line — same charge sound as every other telegraph in the game.
    EventBus.emit('enemy:charge');

    // Telegraph beam: thin red line from boss to the locked aim point.
    const beam = this.scene.add.graphics();
    beam.setDepth(DepthLayers.EnemyProjectile);
    beam.lineStyle(3, 0xff3344, 0.55);
    beam.beginPath();
    beam.moveTo(this.x, this.y);
    beam.lineTo(this.snipeAimX, this.snipeAimY);
    beam.strokePath();
    // Inner bright core
    beam.lineStyle(1, 0xffaad8, 0.85);
    beam.beginPath();
    beam.moveTo(this.x, this.y);
    beam.lineTo(this.snipeAimX, this.snipeAimY);
    beam.strokePath();
    this.snipeBeam = beam;

    // Pulse alpha as the telegraph progresses so the danger window reads.
    this.scene.tweens.add({
      targets: beam,
      alpha: { from: 1, to: 0.3 },
      duration: LORD_ONYX_P2_SNIPE_TELEGRAPH_MS,
      ease: 'Sine.InOut',
    });
  }

  private executeSnipe(): void {
    if (this.snipeBeam) {
      this.snipeBeam.destroy();
      this.snipeBeam = null;
    }

    // Fire one fast thorn along the locked aim line (1.6× normal speed —
    // forces an actual pre-emptive dodge during the telegraph).
    const dx = this.snipeAimX - this.x;
    const dy = this.snipeAimY - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) {
      const speed = ENEMY_PROJECTILE_SPEED * 1.6;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        (dx / len) * speed,
        (dy / len) * speed,
        TextureKeys.BloodProjectile,
      );
    }

    this.snipeFireAt = null;
    this.nextSnipeAt = this.scene.time.now + LORD_ONYX_P2_SNIPE_INTERVAL_MS;
  }

  // --- Phase 3: enrolling inward waves + aimed homing --------------------

  private tickPhase3(time: number, player: Player): void {
    if (time >= this.nextWaveAt) {
      this.fireInwardWave();
      this.nextWaveAt = time + LORD_ONYX_P3_WAVE_INTERVAL_MS;
    }
    if (time >= this.nextHomingAt) {
      this.fireHomingMissile(player);
      this.nextHomingAt = time + LORD_ONYX_P3_HOMING_INTERVAL_MS;
    }
  }

  private fireInwardWave(): void {
    const count = LORD_ONYX_P3_WAVE_THORN_COUNT;
    const r = LORD_ONYX_P3_WAVE_SPAWN_RADIUS;
    const speed = LORD_ONYX_P3_WAVE_SPEED;
    // Big-attack cue at the wave start. The 12 simultaneous projectile spawns
    // get collapsed to one thwip by the enemy-cast 60ms throttle, which is
    // way too small for the visual impact (12 red markers + circular thorn
    // wave). Reuse the prism-explosion sound — it's the "boss is doing
    // something big" cue, matches the "explosion with red aura" visual,
    // and is loud enough to register over the boss-track music. Was
    // previously `enemy:charge` (gain 0.13) — user-flagged as inaudible.
    getSfxSynth().playPrismExplosion();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const sx = this.x + Math.cos(a) * r;
      const sy = this.y + Math.sin(a) * r;

      // Telegraph: a red-tinted copy of the actual projectile sprite at
      // the spawn position — no hitbox (plain Image, not pooled). Reads
      // as "this thorn is about to wake up" instead of a generic warning
      // shape. Pulses alpha for the telegraph window.
      const marker = this.scene.add.image(sx, sy, TextureKeys.MansionMissile);
      marker.setDepth(DepthLayers.EnemyProjectile - 1);
      marker.setTint(0xff3344);
      marker.setAlpha(0.55);
      this.scene.tweens.add({
        targets: marker,
        alpha: { from: 1, to: 0.45 },
        duration: 200,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.InOut',
      });

      // Spawn the actual inward-converging thorn after the telegraph.
      this.scene.time.delayedCall(LORD_ONYX_P3_WAVE_TELEGRAPH_MS, () => {
        marker.destroy();
        if (!this.active) return;
        // Velocity points back toward the boss (inward) — bullets converge.
        const vx = -Math.cos(a) * speed;
        const vy = -Math.sin(a) * speed;
        const shot = this.host.enemyProjectilePool.fire(
          sx,
          sy,
          vx,
          vy,
          TextureKeys.MansionMissile,
        );
        if (shot) shot.setLifetime(LORD_ONYX_P3_WAVE_LIFETIME_MS);
      });
    }
  }

  // --- Shared: aimed homing missile (also used by Chunk 2 specials) -----

  private fireHomingMissile(player: Player): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const vx = (dx / len) * ENEMY_PROJECTILE_SPEED;
    const vy = (dy / len) * ENEMY_PROJECTILE_SPEED;
    const shot = this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      vx,
      vy,
      TextureKeys.MansionMissile,
    );
    if (shot) {
      shot.setLifetime(LORD_ONYX_PROJECTILE_LIFETIME_MS);
      shot.setHoming(player, Phaser.Math.DegToRad(LORD_ONYX_HOMING_TURN_RATE_DEG));
    }
  }

  // --- Prism Special state machine (model B — invulnerable while active) -

  /**
   * Phase-special entry point — kicks off the charge → fire → recover
   * pipeline. Boss becomes invulnerable for the entire window. The matching
   * gem flies from the altar into the prism during the charge window
   * (the seal listens for `lordOnyx:specialFired` and animates the gem).
   */
  private beginSpecial(): void {
    const phase = this.currentPhase as 1 | 2 | 3;

    // Kill any in-flight regular-teleport telegraph cleanly — special
    // takes over. We may immediately replace this with a forced-center
    // teleport below, but the alpha + shadow reset has to happen first.
    if (this.teleportShadow) {
      this.scene.tweens.killTweensOf(this.teleportShadow);
      this.teleportShadow.destroy();
      this.teleportShadow = null;
    }
    this.teleportTelegraphStartedAt = null;
    this.setAlpha(1);

    this.specialPhase = phase;

    // Every Prism Special wants the boss centered for symmetrical
    // radial pattern reads. If he's already at center, skip the
    // teleport and go straight to charging.
    const bounds = this.host.getRoomBounds();
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const dist = Math.hypot(cx - this.x, cy - this.y);
    if (dist > 32) {
      this.beginCenteringTeleport(cx, cy);
    } else {
      this.startSpecialCharge();
    }
  }

  /** First sub-state of the special pipeline — brief teleport to room
   * center. Reuses the existing teleport visuals (alpha fade + black
   * shadow at target, pulsing) but with a forced target + a shorter
   * window. Drives forward in `tickSpecial`. */
  private beginCenteringTeleport(cx: number, cy: number): void {
    this.specialState = 'centering';
    this.specialStateStartedAt = this.scene.time.now;
    this.teleportTargetX = cx;
    this.teleportTargetY = cy;

    this.setAlpha(0.35);
    const shadow = this.scene.add.image(cx, cy, this.texture.key);
    shadow.setScale(this.scaleX, this.scaleY);
    shadow.setTintFill(0x000000);
    shadow.setAlpha(0.30);
    shadow.setDepth(this.depth - 1);
    this.teleportShadow = shadow;

    this.scene.tweens.add({
      targets: shadow,
      alpha: { from: 0.30, to: 0.62 },
      duration: 240,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Snap to room center + tear down the centering shadow. Called from
   * `tickSpecial` once the centering window has elapsed. */
  private finishCenteringTeleport(): void {
    if (this.teleportShadow) {
      this.scene.tweens.killTweensOf(this.teleportShadow);
      this.teleportShadow.destroy();
      this.teleportShadow = null;
    }
    this.setPosition(this.teleportTargetX, this.teleportTargetY);
    this.setAlpha(1);
  }

  /** Second sub-state — the actual charge: prism halo grows, gem flies
   * in from the altar (via the seal listener that picked up the event
   * we emit here), pattern fires at charge-end. */
  private startSpecialCharge(): void {
    const phase = this.specialPhase!;
    const color = this.colorForPhase(phase);

    // Snapshot pre-pattern position so any future pattern that moves
    // the boss can snap back without drift.
    this.prePatternX = this.x;
    this.prePatternY = this.y;

    this.specialState = 'charging';
    this.specialStateStartedAt = this.scene.time.now;

    // Charge halo — circle behind the boss that grows + pulses in the
    // gem's color. Reads "the prism is drawing in power".
    const halo = this.scene.add.circle(this.x, this.y, 4, color, 0.45);
    halo.setDepth(this.depth - 1);
    this.chargeHalo = halo;
    this.chargeTween = this.scene.tweens.add({
      targets: halo,
      radius: 56,
      alpha: { from: 0.45, to: 0.85 },
      duration: LORD_ONYX_SPECIAL_CHARGE_MS,
      ease: 'Sine.In',
    });

    // Tint flash on the boss + small shake so the charge moment reads.
    this.flashPhaseTransition(color);
    this.scene.cameras.main.shake(180, 0.005);

    EventBus.emit('lordOnyx:specialFired', {
      phase,
      x: this.x,
      y: this.y,
    });

    if (import.meta.env.DEV) {
      console.log(`[Prismarch] Phase ${phase} Special charging…`);
    }
  }

  private colorForPhase(phase: 1 | 2 | 3): number {
    if (phase === 1) return LORD_ONYX_SPECIAL_COLOR_P1;
    if (phase === 2) return LORD_ONYX_SPECIAL_COLOR_P2;
    return LORD_ONYX_SPECIAL_COLOR_P3;
  }

  private tickSpecial(time: number, delta: number, _player: Player): void {
    if (this.specialState === 'centering') {
      if (
        time - this.specialStateStartedAt >=
        LORD_ONYX_SPECIAL_CENTER_TELEPORT_MS
      ) {
        this.finishCenteringTeleport();
        this.startSpecialCharge();
      }
      return;
    }
    if (this.specialState === 'charging') {
      // Keep charge halo glued to the boss (he's rooted right now, but
      // future-proof — and cleaner than relying on a static position).
      if (this.chargeHalo) this.chargeHalo.setPosition(this.x, this.y);
      if (
        time - this.specialStateStartedAt >=
        LORD_ONYX_SPECIAL_CHARGE_MS
      ) {
        this.beginPatternFire();
      }
      return;
    }
    if (this.specialState === 'firing') {
      // Per-special tick logic.
      if (this.specialPhase === 2) {
        // Tide Mandala — orbital thorns + aimed-fire window.
        this.tickOrbitingThorns(delta);
        this.tickTideAimed(time);
        if (
          this.orbitReleaseAt > 0 &&
          time >= this.orbitReleaseAt
        ) {
          this.releaseOrbitingThorns();
          this.orbitReleaseAt = 0;
        }
      } else if (this.specialPhase === 3) {
        // Crimson Web — redraw lightning bolts each frame to track the
        // outward-moving wave projectiles.
        this.tickCrimsonWebBolts();
      }
      return;
    }
    if (this.specialState === 'recovering') {
      if (
        time - this.specialStateStartedAt >=
        LORD_ONYX_SPECIAL_RECOVER_MS
      ) {
        this.endSpecial();
      }
      return;
    }
  }

  /** Charge complete — destroy halo, fire the gem-themed pattern. */
  private beginPatternFire(): void {
    if (this.chargeHalo) {
      if (this.chargeTween) {
        this.chargeTween.stop();
        this.chargeTween = null;
      }
      // Burst-out tween on the halo before destroying — visualizes the
      // gem's energy releasing into the pattern.
      const halo = this.chargeHalo;
      this.scene.tweens.add({
        targets: halo,
        radius: 96,
        alpha: 0,
        duration: 240,
        ease: 'Sine.Out',
        onComplete: () => halo.destroy(),
      });
      this.chargeHalo = null;
    }

    // Sub-thump explosion at the moment the charge releases — pairs with the
    // visual burst-out halo. Direct call (not event) because this is tightly
    // coupled to the boss's charge → fire transition.
    getSfxSynth().playPrismExplosion();

    this.specialState = 'firing';
    this.specialStateStartedAt = this.scene.time.now;
    const phase = this.specialPhase!;
    if (phase === 1) {
      this.fireForestWrath();
      this.scene.time.delayedCall(LORD_ONYX_FOREST_WRATH_PATTERN_MS, () =>
        this.beginRecovery(),
      );
    } else if (phase === 2) {
      this.fireTideMandala();
      this.scene.time.delayedCall(LORD_ONYX_TIDE_PATTERN_MS, () =>
        this.beginRecovery(),
      );
    } else {
      this.fireCrimsonWeb();
      this.scene.time.delayedCall(LORD_ONYX_WEB_PATTERN_MS, () =>
        this.beginRecovery(),
      );
    }
  }

  private beginRecovery(): void {
    if (!this.active) return;
    // Defensive: if a phase change killed the special between schedule and
    // fire, don't drive state.
    if (this.specialState !== 'firing') return;
    this.specialState = 'recovering';
    this.specialStateStartedAt = this.scene.time.now;
    this.setPosition(this.prePatternX, this.prePatternY);
    this.setAlpha(1);

    // Tear down any remaining Crimson Web bolts — without this they'd
    // freeze in place once `tickCrimsonWebBolts` stops running and look
    // like static decorations until the boss dies. Wave projectiles
    // themselves keep flying outward to their lifetime expiry.
    if (this.crimsonWebBolts.length > 0) {
      this.clearCrimsonWebBolts();
    }
  }

  private endSpecial(): void {
    this.specialState = 'idle';
    this.specialPhase = null;
    // Reset any teleport timer so he doesn't immediately telegraph after
    // emerging from the special — gives the player a beat to breathe.
    this.nextTeleportAt = this.scene.time.now + 1500;
  }

  /** Override — boss is invulnerable while charging / firing / recovering
   * a special. Visual feedback: tinking gold flash on each blocked hit so
   * the player can read the "blocked" state. */
  override takeDamage(amount: number, knockback?: Vector2): boolean {
    if (this.specialState !== 'idle') {
      // Cosmetic spark — quick gold tint to telegraph the no-damage state.
      this.setTintFill(0xffd84a);
      this.scene.time.delayedCall(60, () => {
        if (this.active && this.specialState !== 'idle') this.clearTint();
      });
      return false;
    }
    return super.takeDamage(amount, knockback);
  }

  // --- Phase 1 special — Forest Wrath ------------------------------------
  // Boss ignites N emerald-tinted thorns at his prism — they fan out
  // radially, then home onto the player for ~3.5 s before despawning.
  // Boss stays passive (rooted, no other attacks) the whole window —
  // this is the only threat.

  private fireForestWrath(): void {
    const count = LORD_ONYX_FOREST_WRATH_THORN_COUNT;
    const speed = LORD_ONYX_FOREST_WRATH_INITIAL_SPEED;
    const tint = LORD_ONYX_SPECIAL_COLOR_P1;
    const turnRate = Phaser.Math.DegToRad(
      LORD_ONYX_FOREST_WRATH_HOMING_TURN_DEG,
    );
    const player = this.host.getPlayer();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const vx = Math.cos(a) * speed;
      const vy = Math.sin(a) * speed;
      const shot = this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        vx,
        vy,
        TextureKeys.MansionMissile,
      );
      if (!shot) continue;
      shot.setTint(tint);
      shot.setLifetime(LORD_ONYX_FOREST_WRATH_LIFETIME_MS);
      // Homing kicks in immediately — initial radial velocity bends
      // toward the player frame-by-frame at the configured turn rate.
      shot.setHoming(player, turnRate);
    }
    // Ignite-burst visual at the prism — an emerald flash that punches
    // out and fades, telegraphs "the swarm has been released".
    const burst = this.scene.add.circle(this.x, this.y, 16, tint, 0.7);
    burst.setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: burst,
      scale: 4,
      alpha: 0,
      duration: 360,
      ease: 'Sine.Out',
      onComplete: () => burst.destroy(),
    });
  }

  // --- Phase 2 special — Tide Mandala ------------------------------------
  // 2 sapphire-tinted thorn rings orbit the boss in opposite directions
  // for ~2.6 s while aimed thorns fire at the player every 650 ms. At
  // orbit-end, all orbiting thorns release outward.

  private fireTideMandala(): void {
    const tint = LORD_ONYX_SPECIAL_COLOR_P2;

    const spawnRing = (
      count: number,
      radius: number,
      angularSpeedDegPerS: number,
      angleOffset: number,
    ): void => {
      const angularSpeed = (angularSpeedDegPerS * Math.PI) / 180;
      for (let i = 0; i < count; i++) {
        const angle = angleOffset + (i / count) * Math.PI * 2;
        const px = this.x + Math.cos(angle) * radius;
        const py = this.y + Math.sin(angle) * radius;
        const projectile = this.host.enemyProjectilePool.fire(
          px,
          py,
          0,
          0,
          TextureKeys.MansionMissile,
        );
        if (!projectile) continue;
        // Stretch lifetime so the orbit + release survive past the pool's
        // default lifetime.
        projectile.setLifetime(LORD_ONYX_TIDE_ORBIT_DURATION_MS + 4000);
        projectile.setTint(tint);
        this.orbitingThorns.push({ projectile, angle, radius, angularSpeed });
      }
    };

    const now = this.scene.time.now;
    const baseOffset = Math.random() * Math.PI * 2;
    spawnRing(
      LORD_ONYX_TIDE_OUTER_THORNS,
      LORD_ONYX_TIDE_OUTER_RADIUS,
      LORD_ONYX_TIDE_OUTER_SPEED_DEG_PER_S,
      baseOffset,
    );
    spawnRing(
      LORD_ONYX_TIDE_INNER_THORNS,
      LORD_ONYX_TIDE_INNER_RADIUS,
      LORD_ONYX_TIDE_INNER_SPEED_DEG_PER_S,
      baseOffset + Math.PI / LORD_ONYX_TIDE_INNER_THORNS,
    );
    // Schedule the outward release at the end of the orbit window — the
    // tickSpecial loop checks this each frame.
    this.orbitReleaseAt = now + LORD_ONYX_TIDE_ORBIT_DURATION_MS;
    this.orbitAimedUntil = now + LORD_ONYX_TIDE_ORBIT_DURATION_MS;
    this.nextOrbitAimedAt = now + LORD_ONYX_TIDE_AIMED_INTERVAL_MS;
  }

  private tickOrbitingThorns(delta: number): void {
    if (this.orbitingThorns.length === 0) return;
    const dt = delta / 1000;
    const live: OrbitingThorn[] = [];
    for (const ot of this.orbitingThorns) {
      if (!ot.projectile.active) continue;
      ot.angle += ot.angularSpeed * dt;
      const px = this.x + Math.cos(ot.angle) * ot.radius;
      const py = this.y + Math.sin(ot.angle) * ot.radius;
      ot.projectile.setPosition(px, py);
      live.push(ot);
    }
    this.orbitingThorns = live;
  }

  private tickTideAimed(time: number): void {
    if (time > this.orbitAimedUntil) return;
    if (time < this.nextOrbitAimedAt) return;
    const player = this.host.getPlayer();
    if (!player.active) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = ENEMY_PROJECTILE_SPEED * 1.1;
    const shot = this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      (dx / len) * speed,
      (dy / len) * speed,
      TextureKeys.BloodProjectile,
    );
    if (shot) shot.setTint(LORD_ONYX_SPECIAL_COLOR_P2);
    this.nextOrbitAimedAt = time + LORD_ONYX_TIDE_AIMED_INTERVAL_MS;
  }

  private releaseOrbitingThorns(): void {
    for (const ot of this.orbitingThorns) {
      if (!ot.projectile.active) continue;
      const vx = Math.cos(ot.angle) * LORD_ONYX_TIDE_RELEASE_SPEED;
      const vy = Math.sin(ot.angle) * LORD_ONYX_TIDE_RELEASE_SPEED;
      ot.projectile.setVelocity(vx, vy);
    }
    this.orbitingThorns = [];
  }

  // --- Phase 3 special — Crimson Web -------------------------------------
  // Pulsing radial waves expanding outward from the boss. Each wave is
  // N thorn slots evenly spaced around a ring; one slot is the wave's
  // gap (= dodge opening). Adjacent thorns in the same wave are
  // connected by jagged crimson lightning bolts that track their
  // outward-moving projectiles each frame. Successive waves drift their
  // gap by 1 slot in the same direction — player snakes through the
  // expanding wave-front.

  private fireCrimsonWeb(): void {
    // Camera kick on the special start.
    this.scene.cameras.main.shake(220, 0.008);

    // Pick the starting gap slot to point at the player. Without this the
    // first wave's gap can be on the opposite side of the room from the
    // player, making the wave undodgeable. Subsequent waves drift from
    // there for the snake-through threading.
    const startSlot = this.computeGapSlotTowardPlayer();
    for (let waveIndex = 0; waveIndex < LORD_ONYX_WEB_WAVE_COUNT; waveIndex++) {
      const delay = waveIndex * LORD_ONYX_WEB_WAVE_INTERVAL_MS;
      const gapSlot =
        (startSlot + waveIndex * LORD_ONYX_WEB_GAP_DRIFT_SLOTS) %
        LORD_ONYX_WEB_THORNS_PER_WAVE;
      this.scene.time.delayedCall(delay, () => {
        // Defensive: phase change or boss death between schedule + fire.
        if (!this.active || this.specialState !== 'firing') return;
        if (this.specialPhase !== 3) return;
        this.spawnCrimsonWebWave(gapSlot);
      });
    }
  }

  /** Slot index whose angular center is closest to the boss → player
   * direction at fire time. Slot 0 is at angle 0 (positive x); slot k is
   * at (k / N) × 360°. */
  private computeGapSlotTowardPlayer(): number {
    const N = LORD_ONYX_WEB_THORNS_PER_WAVE;
    const player = this.host.getPlayer();
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (dx * dx + dy * dy < 1) return 0; // degenerate — fall back to slot 0
    const playerAngle = Math.atan2(dy, dx);
    let normalized = playerAngle / (Math.PI * 2);
    if (normalized < 0) normalized += 1;
    return Math.round(normalized * N) % N;
  }

  /** Spawn one outward-moving wave. Skips the `gapSlot` thorn position
   * (= dodge opening) and connects every adjacent active pair with a
   * tracking lightning bolt. */
  private spawnCrimsonWebWave(gapSlot: number): void {
    const N = LORD_ONYX_WEB_THORNS_PER_WAVE;
    const speed = LORD_ONYX_WEB_WAVE_SPEED;
    const lifetime = LORD_ONYX_WEB_WAVE_LIFETIME_MS;
    const tint = LORD_ONYX_WEB_COLOR;

    // Spawn N - 1 wave thorns (skip the gap slot). Each gets outward
    // velocity at its slot angle.
    const slots: { slot: number; projectile: EnemyProjectile }[] = [];
    for (let slot = 0; slot < N; slot++) {
      if (slot === gapSlot) continue;
      const angle = (slot / N) * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const shot = this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        vx,
        vy,
        TextureKeys.MansionMissile,
      );
      if (!shot) continue;
      shot.setLifetime(lifetime);
      shot.setTint(tint);
      // Wave thorns must survive crossing the room walls — without this
      // the wall collider deactivates them mid-flight and their bolts
      // disappear early. Lifetime governs despawn instead.
      shot.passThroughWalls = true;
      slots.push({ slot, projectile: shot });
    }

    // Connect adjacent pairs in slot order — only if their slot indices
    // are exactly 1 apart in the original ring (i.e. nothing skipped
    // between them, namely the gap).
    for (let i = 0; i < slots.length; i++) {
      const a = slots[i]!;
      const b = slots[(i + 1) % slots.length]!;
      const slotDiff = (b.slot - a.slot + N) % N;
      if (slotDiff !== 1) continue; // gap between them — don't bridge it
      const bolt = this.scene.add.graphics();
      bolt.setDepth(this.depth - 1);
      this.drawLightningBolt(
        bolt,
        a.projectile.x,
        a.projectile.y,
        b.projectile.x,
        b.projectile.y,
        tint,
      );
      this.crimsonWebBolts.push({
        left: a.projectile,
        right: b.projectile,
        graphics: bolt,
      });
    }
  }

  /** Per-frame redraw — every active bolt's endpoints are read from the
   * underlying projectile positions, so as the wave expands outward the
   * lightning expands with it. Bolts whose endpoints despawn (lifetime
   * expired) are destroyed. */
  private tickCrimsonWebBolts(): void {
    if (this.crimsonWebBolts.length === 0) return;
    const tint = LORD_ONYX_WEB_COLOR;
    const live: typeof this.crimsonWebBolts = [];
    for (const bolt of this.crimsonWebBolts) {
      if (!bolt.left.active || !bolt.right.active) {
        bolt.graphics.destroy();
        continue;
      }
      bolt.graphics.clear();
      this.drawLightningBolt(
        bolt.graphics,
        bolt.left.x,
        bolt.left.y,
        bolt.right.x,
        bolt.right.y,
        tint,
      );
      live.push(bolt);
    }
    this.crimsonWebBolts = live;
  }

  /** Tear down every active web bolt. Called on pattern end + boss
   * death. Wave projectiles are left alone — they'll fly outward to
   * their natural lifetime expiry. */
  private clearCrimsonWebBolts(): void {
    for (const bolt of this.crimsonWebBolts) {
      bolt.graphics.destroy();
    }
    this.crimsonWebBolts = [];
  }

  /**
   * Draw a single jagged lightning bolt between two world points onto an
   * already-existing Graphics. Two passes: a wide soft halo (color, 0.4
   * alpha) then a thin bright white core. Subdivided + perpendicular-
   * jittered for an electric look. Caller is responsible for `.clear()`
   * before re-drawing on flicker tick.
   */
  private drawLightningBolt(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
  ): void {
    const SEGMENTS = 7;
    const JITTER = 10;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const baseX = x1 + dx * t;
      const baseY = y1 + dy * t;
      const j = i === 0 || i === SEGMENTS ? 0 : (Math.random() - 0.5) * 2 * JITTER;
      pts.push({ x: baseX + px * j, y: baseY + py * j });
    }
    // Outer halo
    g.lineStyle(5, color, 0.45);
    g.beginPath();
    g.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
    g.strokePath();
    // Bright white core
    g.lineStyle(2, 0xffffff, 0.92);
    g.beginPath();
    g.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
    g.strokePath();
  }

  // --- Phase transitions --------------------------------------------------

  protected onPhaseChanged(newPhase: number): void {
    const now = this.scene.time.now;
    this.phaseEnteredAt = now;
    this.specialFiredThisPhase = false;

    if (newPhase === 2) {
      this.flashPhaseTransition(0xff80a0);
      this.scene.cameras.main.shake(220, 0.006);
      this.spawnPhase2Adds();
      // Prime the ring + first snipe with small initial delays so the
      // phase reads before patterns kick in.
      this.nextRingFireAt = now + 400;
      this.nextSnipeAt = now + 1400;
      this.snipeFireAt = null;
      this.ringSpinDeg = 0;
      return;
    }
    if (newPhase === 3) {
      // Tear down any in-flight phase-2 snipe telegraph cleanly.
      if (this.snipeBeam) {
        this.snipeBeam.destroy();
        this.snipeBeam = null;
      }
      this.snipeFireAt = null;

      this.flashPhaseTransition(0xffd040);
      this.scene.cameras.main.flash(220, 200, 60, 80, false);
      this.scene.cameras.main.shake(360, 0.012);
      this.nextWaveAt = now + 600;
      this.nextHomingAt = now + 1200;
    }
  }

  private spawnPhase2Adds(): void {
    const bounds = this.host.getRoomBounds();
    const margin = 64;
    const corners = [
      { x: bounds.minX + margin, y: bounds.minY + margin },
      { x: bounds.maxX - margin, y: bounds.minY + margin },
      { x: bounds.minX + margin, y: bounds.maxY - margin },
      { x: bounds.maxX - margin, y: bounds.maxY - margin },
    ];
    // Sort corners by distance to the player descending, then take the
    // first N — guarantees adds spawn on the FAR side of the room and
    // never on top of the player (the bug the user hit on phase entry).
    const player = this.host.getPlayer();
    const ranked = corners
      .map((c) => {
        const dx = c.x - player.x;
        const dy = c.y - player.y;
        return { corner: c, distSq: dx * dx + dy * dy };
      })
      .sort((a, b) => b.distSq - a.distSq);
    for (let i = 0; i < LORD_ONYX_P2_ADD_COUNT && i < ranked.length; i++) {
      const c = ranked[i]!.corner;
      this.host.spawnEnemyAt('wraith', c.x, c.y);
    }
    // One charge cue for the whole Phase-2 wraith batch (not per-wraith) so
    // the back-to-back spawn doesn't double-fire the sound.
    if (LORD_ONYX_P2_ADD_COUNT > 0) EventBus.emit('enemy:charge');
  }

  private flashPhaseTransition(color: number): void {
    this.setTintFill(color);
    this.scene.time.delayedCall(LORD_ONYX_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
  }

  // --- Cleanup ------------------------------------------------------------

  override destroy(fromScene?: boolean): void {
    if (this.snipeBeam) {
      this.snipeBeam.destroy();
      this.snipeBeam = null;
    }
    if (this.teleportShadow) {
      this.scene.tweens.killTweensOf(this.teleportShadow);
      this.teleportShadow.destroy();
      this.teleportShadow = null;
    }
    if (this.chargeTween) {
      this.chargeTween.stop();
      this.chargeTween = null;
    }
    if (this.chargeHalo) {
      this.chargeHalo.destroy();
      this.chargeHalo = null;
    }
    // Release any in-flight orbiting thorns outward so they're not stuck
    // around the destroyed boss position forever (their lifetime would
    // catch up eventually but visual is cleaner if they fly off).
    if (this.orbitingThorns.length > 0) {
      this.releaseOrbitingThorns();
    }
    // Tear down any active Crimson Web bolts — wave thorns themselves
    // are pool projectiles + will expire naturally via their lifetime.
    if (this.crimsonWebBolts.length > 0) {
      this.clearCrimsonWebBolts();
    }
    super.destroy(fromScene);
  }
}
