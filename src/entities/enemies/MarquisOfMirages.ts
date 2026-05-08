import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  MARQUIS_OF_MIRAGES_BERSERKER_HP_FRACTION,
  MARQUIS_OF_MIRAGES_ENTER_MS,
  MARQUIS_OF_MIRAGES_ENTRY_LINGER_MS,
  MARQUIS_OF_MIRAGES_EXIT_LINGER_MS,
  MARQUIS_OF_MIRAGES_EXIT_MS,
  MARQUIS_OF_MIRAGES_FAN_COUNT,
  MARQUIS_OF_MIRAGES_FAN_INITIAL_DELAY_MS,
  MARQUIS_OF_MIRAGES_FAN_INTERVAL_MS,
  MARQUIS_OF_MIRAGES_FAN_SPREAD_RAD,
  MARQUIS_OF_MIRAGES_FIRE_COUNT,
  MARQUIS_OF_MIRAGES_FIRE_INTERVAL_MS,
  MARQUIS_OF_MIRAGES_HOMING_LIFETIME_MS,
  MARQUIS_OF_MIRAGES_HOMING_TURN_RATE_DEG,
  MARQUIS_OF_MIRAGES_KITE_DISTANCE,
  MARQUIS_OF_MIRAGES_KITE_SPEED,
  MARQUIS_OF_MIRAGES_SPECIAL_INITIAL_DELAY_MS,
  MARQUIS_OF_MIRAGES_SPECIAL_INTERVAL_MAX_MS,
  MARQUIS_OF_MIRAGES_SPECIAL_INTERVAL_MIN_MS,
  MARQUIS_OF_MIRAGES_SUMMON_MS,
  MARQUIS_OF_MIRAGES_TELEPORT_FADE_MS,
  MARQUIS_OF_MIRAGES_TELEPORT_INTERVAL_MS,
  MARQUIS_OF_MIRAGES_TELEPORT_MIN_PLAYER_DISTANCE,
  MARQUIS_OF_MIRAGES_TRAVEL_MS,
  MARQUIS_OF_MIRAGES_VISUAL_SCALE,
  SAPPHIRE_MARQUIS_BERSERKER_ARM_COUNT,
  SAPPHIRE_MARQUIS_BERSERKER_FIRE_INTERVAL_MS,
  SAPPHIRE_MARQUIS_BERSERKER_SKIPPED_ARMS,
  SAPPHIRE_MARQUIS_BERSERKER_SPIN_RATE_DEG_PER_SEC,
  TextureKeys,
  VAMPIRE_PHASE_FLASH_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { getSfxSynth } from '../../systems/SfxSynth';
import { MirrorPortal } from '../MirrorPortal';
import { type EnemyProjectile } from '../projectiles/EnemyProjectile';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Host adapter for the Marquis of Mirages — needs the player (kite + homing
 * target), projectile pool, room bounds for teleport / portal placement,
 * and a hook to register spawned mirror portals with the scene's
 * missile↔portal overlap group.
 */
export interface MarquisOfMiragesHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
  /**
   * Add the portal to the scene's tracked group so the missile↔portal
   * overlap fires. The portal removes itself from the scene on destroy
   * via Phaser's destroy lifecycle, so the host doesn't need to track
   * un-registration explicitly.
   */
  addMirrorPortal(portal: MirrorPortal): void;
}

type SpecialState =
  | 'idle'
  | 'summoning'   // both portals materialize, boss frozen
  | 'entering'   // boss tweens INTO entry portal (alpha 1→0)
  | 'traveling'  // boss invisible, in transit
  | 'exiting'    // boss emerges at exit portal (alpha 0→1)
  | 'firing'     // 3 homing missiles in sequence
  | 'recovering'; // exit despawns, entry lingers for player counter-window

/**
 * Marquis of Mirages — single-body vampire-mage replacing the old Vampire
 * Twins boss on Onyx Mansion.
 *
 * Phase 1 (>30 % HP):
 *  - Kite the player at fixed distance (60 px/s, 180 px target).
 *  - 5-thorn fan every 1.8 s (60° spread).
 *  - Teleport every 4 s with min-player-distance safety.
 *  - **Mirror Special** every ~10 s (initial) / 8–12 s (random thereafter):
 *    summon two portals (entry near boss, exit in opposite room corner),
 *    fade into the entry, emerge at the exit, fire 3 homing missiles in
 *    sequence. The entry portal is destructible (3 HP) — destroying it
 *    nullifies all live linked homing projectiles, the player's clear
 *    counter-strategy.
 *
 * Phase 2 (≤30 % HP, "berserker"):
 *  - Stationary, no kite / fan / teleport / mirror-special.
 *  - Continuous spinning radial stream with a rotating dodge-gap (1 of 8
 *    arms skipped per wave) — same machinery the old Sapphire Marquis
 *    had in his solo-berserker phase.
 */
export class MarquisOfMirages extends BossEnemy {
  override readonly displayName = 'Marquis of Mirages';
  protected readonly phases: readonly BossPhaseDefinition[] = [
    { phaseIndex: 2, hpThresholdFraction: MARQUIS_OF_MIRAGES_BERSERKER_HP_FRACTION },
  ];

  private readonly host: MarquisOfMiragesHost;

  // --- Phase-1 base patterns ---------------------------------------------
  private nextFanAt: number;
  private nextTeleportAt: number;
  private nextSpecialAt: number;
  private teleporting = false;

  // --- Mirror special state machine -------------------------------------
  private specialState: SpecialState = 'idle';
  private specialStateEndsAt = 0;
  private specialFireIndex = 0;
  /** Live entry portal (or null if none active or already destroyed). */
  private entryPortal: MirrorPortal | null = null;
  /** Live exit portal (or null). */
  private exitPortal: MirrorPortal | null = null;
  /** Projectiles spawned during the current special's firing window.
   * Cleared on `recovering → idle` and on entry-portal destruction (the
   * latter also deactivates each one). */
  private linkedProjectiles: EnemyProjectile[] = [];
  /** Pending despawn timer for the entry portal — kicks in when the
   * special completes naturally. Stored so we can cancel it if the
   * boss is destroyed mid-linger. */
  private entryDespawnTimer: Phaser.Time.TimerEvent | null = null;

  // --- Phase-2 berserker state -------------------------------------------
  private spinAngle = 0;
  private nextBerserkerFireAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: MarquisOfMiragesHost) {
    super(scene, x, y, ENEMIES['boss-marquis-of-mirages']);
    this.host = host;
    this.setScale(MARQUIS_OF_MIRAGES_VISUAL_SCALE);

    const now = scene.time.now;
    this.nextFanAt = now + MARQUIS_OF_MIRAGES_FAN_INITIAL_DELAY_MS;
    this.nextTeleportAt = now + MARQUIS_OF_MIRAGES_TELEPORT_INTERVAL_MS;
    this.nextSpecialAt = now + MARQUIS_OF_MIRAGES_SPECIAL_INITIAL_DELAY_MS;
  }

  // ---------------------------------------------------------------------
  // Main tick
  // ---------------------------------------------------------------------

  protected tickAI(time: number, delta: number): void {
    const player = this.host.getPlayer();
    if (!player.active) return;

    if (this.currentPhase >= 2) {
      this.tickBerserker(time, delta);
      return;
    }

    if (this.specialState !== 'idle') {
      this.tickSpecial(time);
      return;
    }

    if (this.teleporting) {
      this.setVelocity(0, 0);
      return;
    }

    this.kiteToward(player);

    if (time >= this.nextFanAt) {
      this.fireFan(player);
      this.nextFanAt = time + MARQUIS_OF_MIRAGES_FAN_INTERVAL_MS;
    }
    if (time >= this.nextTeleportAt) {
      this.beginTeleport();
      this.nextTeleportAt = time + MARQUIS_OF_MIRAGES_TELEPORT_INTERVAL_MS;
    }
    if (time >= this.nextSpecialAt) {
      this.beginSpecial();
    }
  }

  // ---------------------------------------------------------------------
  // Phase 1 base patterns
  // ---------------------------------------------------------------------

  private kiteToward(player: Player): void {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
      this.setVelocity(0, 0);
      return;
    }
    const error = len - MARQUIS_OF_MIRAGES_KITE_DISTANCE;
    if (Math.abs(error) < 12) {
      this.setVelocity(0, 0);
      return;
    }
    const sign = error > 0 ? -1 : 1;
    this.setVelocity(
      sign * (dx / len) * MARQUIS_OF_MIRAGES_KITE_SPEED,
      sign * (dy / len) * MARQUIS_OF_MIRAGES_KITE_SPEED,
    );
  }

  private fireFan(player: Player): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const baseAngle = Math.atan2(dy, dx);
    const count = MARQUIS_OF_MIRAGES_FAN_COUNT;
    const spread = MARQUIS_OF_MIRAGES_FAN_SPREAD_RAD;
    const step = count > 1 ? spread / (count - 1) : 0;
    const start = baseAngle - spread / 2;
    for (let i = 0; i < count; i++) {
      const a = start + i * step;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.BloodProjectile,
      );
    }
  }

  private beginTeleport(): void {
    this.teleporting = true;
    const fadeMs = MARQUIS_OF_MIRAGES_TELEPORT_FADE_MS;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.05,
      duration: fadeMs,
      ease: 'Sine.In',
      onComplete: () => {
        if (!this.active) return;
        const pos = this.pickTeleportTarget();
        this.setPosition(pos.x, pos.y);
        this.setVelocity(0, 0);
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          duration: fadeMs,
          ease: 'Sine.Out',
          onComplete: () => {
            this.teleporting = false;
          },
        });
      },
    });
  }

  private pickTeleportTarget(): { x: number; y: number } {
    const bounds = this.host.getRoomBounds();
    const player = this.host.getPlayer();
    const margin = 40;
    const minDistSq =
      MARQUIS_OF_MIRAGES_TELEPORT_MIN_PLAYER_DISTANCE *
      MARQUIS_OF_MIRAGES_TELEPORT_MIN_PLAYER_DISTANCE;
    let bestX = bounds.minX;
    let bestY = bounds.minY;
    let bestDistSq = -1;
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = Phaser.Math.Clamp(
        bounds.minX + margin + Math.random() * (bounds.maxX - bounds.minX - margin * 2),
        bounds.minX + margin,
        bounds.maxX - margin,
      );
      const y = Phaser.Math.Clamp(
        bounds.minY + margin + Math.random() * (bounds.maxY - bounds.minY - margin * 2),
        bounds.minY + margin,
        bounds.maxY - margin,
      );
      const dx = x - player.x;
      const dy = y - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDistSq) return { x, y };
      if (distSq > bestDistSq) {
        bestDistSq = distSq;
        bestX = x;
        bestY = y;
      }
    }
    return { x: bestX, y: bestY };
  }

  // ---------------------------------------------------------------------
  // Mirror Special
  // ---------------------------------------------------------------------

  /**
   * Kick off the Mirror Special. Picks portal positions (entry NEAR the
   * boss, exit in the opposite room corner from the player), spawns both
   * portals, freezes the boss in place. State machine takes over from
   * here via `tickSpecial`.
   */
  private beginSpecial(): void {
    if (this.specialState !== 'idle') return;
    if (this.teleporting) {
      // Defer briefly — finish the teleport first so the portal positions
      // make sense relative to the boss's settled location.
      this.nextSpecialAt = this.scene.time.now + 200;
      return;
    }

    const positions = this.pickPortalPositions();
    this.entryPortal = new MirrorPortal(this.scene, positions.entry.x, positions.entry.y, true);
    this.exitPortal = new MirrorPortal(this.scene, positions.exit.x, positions.exit.y, false);
    this.host.addMirrorPortal(this.entryPortal);
    this.host.addMirrorPortal(this.exitPortal);

    // Hook entry-destruction → cancel/cleanup linked projectiles.
    this.entryPortal.onDestroyed(() => this.handleEntryDestroyed());

    this.setVelocity(0, 0);
    this.specialState = 'summoning';
    this.specialStateEndsAt = this.scene.time.now + MARQUIS_OF_MIRAGES_SUMMON_MS;
    this.specialFireIndex = 0;
    this.linkedProjectiles = [];

    // Glassy spatial whoosh while the portals materialize. Direct call (not
    // event) — tightly coupled to the special's begin moment.
    getSfxSynth().playMarquisMirrorSpecial();
  }

  /**
   * Pick where the two mirror portals appear. Entry sits ~80 px BESIDE
   * the boss (perpendicular to the player→boss vector so it doesn't block
   * the player's line of sight). Exit goes to the opposite quadrant of
   * the room, anchored to the room corner farthest from the player.
   */
  private pickPortalPositions(): {
    entry: { x: number; y: number };
    exit: { x: number; y: number };
  } {
    const bounds = this.host.getRoomBounds();
    const player = this.host.getPlayer();
    const margin = 56;

    // Entry: perpendicular to player→boss, stepped 80 px to the side.
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const len = Math.hypot(dx, dy);
    const ux = len > 0.5 ? dx / len : 1;
    const uy = len > 0.5 ? dy / len : 0;
    // Perpendicular vector (-uy, ux); pick the side that ends up further
    // from the player (further = safer initial portal placement).
    const offsetMag = 88;
    const candA = { x: this.x + -uy * offsetMag, y: this.y + ux * offsetMag };
    const candB = { x: this.x + uy * offsetMag, y: this.y + -ux * offsetMag };
    const distA = Math.hypot(candA.x - player.x, candA.y - player.y);
    const distB = Math.hypot(candB.x - player.x, candB.y - player.y);
    const entryRaw = distA >= distB ? candA : candB;
    const entry = {
      x: Phaser.Math.Clamp(entryRaw.x, bounds.minX + margin, bounds.maxX - margin),
      y: Phaser.Math.Clamp(entryRaw.y, bounds.minY + margin, bounds.maxY - margin),
    };

    // Exit: opposite room corner from the player.
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const exitX = player.x < cx ? bounds.maxX - margin : bounds.minX + margin;
    const exitY = player.y < cy ? bounds.maxY - margin : bounds.minY + margin;

    return { entry, exit: { x: exitX, y: exitY } };
  }

  /**
   * Run the Mirror-Special state machine one tick. Each branch checks the
   * scene-time clock against `specialStateEndsAt` and either advances or
   * waits. Boss is invulnerable / frozen for the entire duration.
   */
  private tickSpecial(time: number): void {
    this.setVelocity(0, 0);

    switch (this.specialState) {
      case 'summoning':
        if (time >= this.specialStateEndsAt) {
          this.beginEntering(time);
        }
        break;
      case 'entering':
        if (time >= this.specialStateEndsAt) {
          this.beginTraveling(time);
        }
        break;
      case 'traveling':
        if (time >= this.specialStateEndsAt) {
          this.beginExiting(time);
        }
        break;
      case 'exiting':
        if (time >= this.specialStateEndsAt) {
          this.beginFiring(time);
        }
        break;
      case 'firing':
        // Each tick after `specialStateEndsAt` (= last fire time + interval),
        // fire the next homing shot until we've fired all of them.
        if (time >= this.specialStateEndsAt) {
          if (this.specialFireIndex >= MARQUIS_OF_MIRAGES_FIRE_COUNT) {
            this.beginRecovering(time);
          } else {
            this.fireHoming();
            this.specialFireIndex += 1;
            this.specialStateEndsAt = time + MARQUIS_OF_MIRAGES_FIRE_INTERVAL_MS;
          }
        }
        break;
      case 'recovering':
        if (time >= this.specialStateEndsAt) {
          this.endSpecial(time);
        }
        break;
      case 'idle':
        break;
    }
  }

  private beginEntering(time: number): void {
    this.specialState = 'entering';
    this.specialStateEndsAt = time + MARQUIS_OF_MIRAGES_ENTER_MS;
    if (!this.entryPortal) return;
    this.scene.tweens.add({
      targets: this,
      x: this.entryPortal.x,
      y: this.entryPortal.y,
      alpha: 0,
      scaleX: MARQUIS_OF_MIRAGES_VISUAL_SCALE * 0.65,
      scaleY: MARQUIS_OF_MIRAGES_VISUAL_SCALE * 0.65,
      duration: MARQUIS_OF_MIRAGES_ENTER_MS,
      ease: 'Sine.In',
    });
  }

  private beginTraveling(time: number): void {
    this.specialState = 'traveling';
    this.specialStateEndsAt = time + MARQUIS_OF_MIRAGES_TRAVEL_MS;
    // Boss is fully invisible during transit — no tween.
  }

  private beginExiting(time: number): void {
    this.specialState = 'exiting';
    this.specialStateEndsAt = time + MARQUIS_OF_MIRAGES_EXIT_MS;
    if (!this.exitPortal) return;
    // Snap to exit position, then fade-in + scale-up.
    this.setPosition(this.exitPortal.x, this.exitPortal.y);
    this.setScale(MARQUIS_OF_MIRAGES_VISUAL_SCALE * 0.65);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: MARQUIS_OF_MIRAGES_VISUAL_SCALE,
      scaleY: MARQUIS_OF_MIRAGES_VISUAL_SCALE,
      duration: MARQUIS_OF_MIRAGES_EXIT_MS,
      ease: 'Sine.Out',
    });
  }

  private beginFiring(time: number): void {
    this.specialState = 'firing';
    this.specialFireIndex = 0;
    // Set ends-at to NOW so the first fire happens on the next tick.
    this.specialStateEndsAt = time;
  }

  /**
   * Spawn one homing missile aimed at the player from the boss's current
   * position (= exit portal). Tag it so we can deactivate it if the entry
   * portal gets destroyed during this special.
   */
  private fireHoming(): void {
    const player = this.host.getPlayer();
    if (!player.active) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const vx = len > 0.5 ? (dx / len) * ENEMY_PROJECTILE_SPEED : ENEMY_PROJECTILE_SPEED;
    const vy = len > 0.5 ? (dy / len) * ENEMY_PROJECTILE_SPEED : 0;
    const shot = this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      vx,
      vy,
      TextureKeys.MansionMissile,
    );
    if (!shot) return;
    shot.setLifetime(MARQUIS_OF_MIRAGES_HOMING_LIFETIME_MS);
    shot.setHoming(player, Phaser.Math.DegToRad(MARQUIS_OF_MIRAGES_HOMING_TURN_RATE_DEG));
    this.linkedProjectiles.push(shot);
  }

  /**
   * Player destroyed the entry portal mid-special. Deactivate every
   * linked homing projectile (live or queued) and clear the bookkeeping.
   * Boss continues normally — this is a counter, not a cancel.
   */
  private handleEntryDestroyed(): void {
    for (const p of this.linkedProjectiles) {
      if (p.active) p.deactivate();
    }
    this.linkedProjectiles = [];
    // entryPortal is already in shatter-tween → null the field so we don't
    // try to despawn it again at recover-time.
    this.entryPortal = null;
  }

  private beginRecovering(time: number): void {
    this.specialState = 'recovering';
    this.specialStateEndsAt = time + MARQUIS_OF_MIRAGES_EXIT_LINGER_MS;
    // Exit portal: short despawn after recovery window.
    if (this.exitPortal) {
      const exit = this.exitPortal;
      this.scene.time.delayedCall(MARQUIS_OF_MIRAGES_EXIT_LINGER_MS, () => {
        if (exit.active) exit.despawn();
      });
    }
    // Entry portal: lingers longer so the player has time to destroy it
    // and clear linked projectiles. Total entry lifetime past firing-end
    // = ENTRY_LINGER_MS.
    if (this.entryPortal) {
      const entry = this.entryPortal;
      this.entryDespawnTimer = this.scene.time.delayedCall(
        MARQUIS_OF_MIRAGES_ENTRY_LINGER_MS,
        () => {
          if (entry.active) entry.despawn();
          this.entryDespawnTimer = null;
        },
      );
    }
  }

  /**
   * Special complete. Schedule the next special, clear state, hand control
   * back to base patterns. Doesn't immediately wipe `linkedProjectiles` —
   * those are still in flight; they expire naturally via their lifetime.
   */
  private endSpecial(time: number): void {
    this.specialState = 'idle';
    this.exitPortal = null;
    // entryPortal stays referenced until its despawn-timer (or destruction)
    // clears it, but it's no longer load-bearing for state machine logic.
    const interval = Phaser.Math.Between(
      MARQUIS_OF_MIRAGES_SPECIAL_INTERVAL_MIN_MS,
      MARQUIS_OF_MIRAGES_SPECIAL_INTERVAL_MAX_MS,
    );
    this.nextSpecialAt = time + interval;
    // Re-arm fan/teleport timers so they don't all fire simultaneously the
    // moment the special ends.
    this.nextFanAt = time + 600;
    this.nextTeleportAt = time + MARQUIS_OF_MIRAGES_TELEPORT_INTERVAL_MS;
  }

  // ---------------------------------------------------------------------
  // Phase 2 berserker (HP ≤ 30 %)
  // ---------------------------------------------------------------------

  private tickBerserker(time: number, delta: number): void {
    this.setVelocity(0, 0);

    const spinRateRad =
      (SAPPHIRE_MARQUIS_BERSERKER_SPIN_RATE_DEG_PER_SEC * Math.PI) / 180;
    this.spinAngle += spinRateRad * (delta / 1000);

    if (time >= this.nextBerserkerFireAt) {
      const arms = SAPPHIRE_MARQUIS_BERSERKER_ARM_COUNT;
      const skip = SAPPHIRE_MARQUIS_BERSERKER_SKIPPED_ARMS;
      for (let i = skip; i < arms; i++) {
        const a = this.spinAngle + (i / arms) * Math.PI * 2;
        this.host.enemyProjectilePool.fire(
          this.x,
          this.y,
          Math.cos(a) * ENEMY_PROJECTILE_SPEED,
          Math.sin(a) * ENEMY_PROJECTILE_SPEED,
          TextureKeys.BloodProjectile,
        );
      }
      this.nextBerserkerFireAt = time + SAPPHIRE_MARQUIS_BERSERKER_FIRE_INTERVAL_MS;
    }
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase === 2) {
      // If we crossed the threshold mid-special, force-cancel: portals
      // despawn immediately, linked projectiles deactivate, boss snaps
      // back to its position. Berserker is a clean phase shift, not a
      // continuation of the previous attack.
      this.cancelSpecialOnPhaseChange();

      this.flashPhaseTransition(0xffd040);
      this.scene.cameras.main.shake(260, 0.008);
      this.nextBerserkerFireAt = this.scene.time.now + 200;
      // Clear movement.
      this.setVelocity(0, 0);
      this.setAlpha(1);
      this.setScale(MARQUIS_OF_MIRAGES_VISUAL_SCALE);
    }
  }

  private cancelSpecialOnPhaseChange(): void {
    if (this.specialState === 'idle') return;
    // Kill any active position/alpha tweens on the boss — entering/exiting
    // tweens animate alpha 1↔0 over their full duration, and would otherwise
    // keep ramping alpha back toward 0 mid-flight even after the phase-
    // transition handler calls setAlpha(1). Without this kill the boss
    // ends up invisible in berserker (User-flagged bug 2026-05-08: "wenn er
    // im spiegel ist und ich den spiegel zerstöre, er währenddessen in die
    // letzte phase geht, ist marquis unsichtbar").
    this.scene.tweens.killTweensOf(this);
    // Deactivate linked projectiles.
    for (const p of this.linkedProjectiles) {
      if (p.active) p.deactivate();
    }
    this.linkedProjectiles = [];
    // Despawn portals.
    if (this.entryPortal && this.entryPortal.active) this.entryPortal.despawn();
    this.entryPortal = null;
    if (this.exitPortal && this.exitPortal.active) this.exitPortal.despawn();
    this.exitPortal = null;
    // Cancel pending entry-despawn timer.
    if (this.entryDespawnTimer) {
      this.entryDespawnTimer.remove(false);
      this.entryDespawnTimer = null;
    }
    this.specialState = 'idle';
  }

  private flashPhaseTransition(color: number): void {
    this.setTintFill(color);
    this.scene.time.delayedCall(VAMPIRE_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
  }

  // ---------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------

  /**
   * Boss death / forced teardown — make sure no portal or pending timer
   * leaks past the fight. `super.destroy` runs the BaseEnemy death tween
   * (or the immediate destroy in the `__wiz` paths).
   */
  override destroy(fromScene?: boolean): void {
    if (this.entryDespawnTimer) {
      this.entryDespawnTimer.remove(false);
      this.entryDespawnTimer = null;
    }
    if (this.entryPortal && this.entryPortal.active) this.entryPortal.despawn();
    this.entryPortal = null;
    if (this.exitPortal && this.exitPortal.active) this.exitPortal.despawn();
    this.exitPortal = null;
    for (const p of this.linkedProjectiles) {
      if (p.active) p.deactivate();
    }
    this.linkedProjectiles = [];
    super.destroy(fromScene);
  }
}
