import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  SAPPHIRE_MARQUIS_BERSERKER_ARM_COUNT,
  SAPPHIRE_MARQUIS_BERSERKER_FIRE_INTERVAL_MS,
  SAPPHIRE_MARQUIS_BERSERKER_SKIPPED_ARMS,
  SAPPHIRE_MARQUIS_BERSERKER_SPIN_RATE_DEG_PER_SEC,
  SAPPHIRE_MARQUIS_CURTAIN_INTERVAL_MS,
  SAPPHIRE_MARQUIS_CURTAIN_TELEGRAPH_MS,
  SAPPHIRE_MARQUIS_CURTAIN_THORN_COUNT,
  SAPPHIRE_MARQUIS_KITE_DISTANCE,
  SAPPHIRE_MARQUIS_KITE_SPEED,
  SAPPHIRE_MARQUIS_PHASE1_FAN_COUNT,
  SAPPHIRE_MARQUIS_PHASE1_FAN_INTERVAL_MS,
  SAPPHIRE_MARQUIS_PHASE1_FAN_SPREAD_RAD,
  SAPPHIRE_MARQUIS_PHASE1_FIRE_INITIAL_DELAY_MS,
  SAPPHIRE_MARQUIS_PHASE2_FAN_COUNT,
  SAPPHIRE_MARQUIS_PHASE2_FAN_SPREAD_RAD,
  SAPPHIRE_MARQUIS_TELEPORT_FADE_MS,
  SAPPHIRE_MARQUIS_TELEPORT_INTERVAL_MS,
  SAPPHIRE_MARQUIS_TELEPORT_MIN_PLAYER_DISTANCE,
  SAPPHIRE_MARQUIS_VISUAL_SCALE,
  TextureKeys,
  VAMPIRE_PHASE_FLASH_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { VampireBody } from './VampireBody';

/**
 * Host adapter for the Sapphire Marquis — needs the player (kite target) +
 * an enemy-projectile pool for blood-magic shots, and room bounds for
 * teleport target picking.
 */
export interface SapphireMarquisHost {
  getPlayer(): Player;
  enemyProjectilePool: EnemyProjectilePool;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Sapphire Marquis — range vampire mage. Kites the player at a fixed
 * distance and fires blood-magic fans + teleports periodically.
 *
 * Phase 1 (paired with Crimson Lord): 5-thorn fan + teleport.
 * Phase 2 (Lord dead, soloMode=true): wider 7-thorn fan + 12-thorn radial
 *   bullet curtain on a separate cooldown (telegraphed pulse before fire).
 * Phase 3 (berserker, ≤30% HP): cancels fan/curtain/teleport entirely;
 *   spinning radial stream from N opposed arms continuously.
 */
export class SapphireMarquis extends VampireBody {
  override readonly displayName = 'Sapphire Marquis';

  private readonly host: SapphireMarquisHost;

  private nextFanAt: number;
  private nextTeleportAt: number;
  /** Phase 2 curtain — telegraph + fire two-step. */
  private curtainState: 'idle' | 'telegraph' = 'idle';
  private curtainEndsAt = 0;
  private nextCurtainAt = 0;
  /** Berserker spin angle (radians). */
  private spinAngle = 0;
  private nextBerserkerFireAt = 0;
  /** Locked while teleport-fade tween is mid-flight. */
  private teleporting = false;

  constructor(scene: Phaser.Scene, x: number, y: number, host: SapphireMarquisHost) {
    super(scene, x, y, ENEMIES['boss-sapphire-marquis']);
    this.host = host;
    this.setScale(SAPPHIRE_MARQUIS_VISUAL_SCALE);

    const now = scene.time.now;
    this.nextFanAt = now + SAPPHIRE_MARQUIS_PHASE1_FIRE_INITIAL_DELAY_MS;
    this.nextTeleportAt = now + SAPPHIRE_MARQUIS_TELEPORT_INTERVAL_MS;
    this.nextCurtainAt = now + SAPPHIRE_MARQUIS_CURTAIN_INTERVAL_MS;
  }

  protected tickAI(time: number, delta: number): void {
    const player = this.host.getPlayer();
    if (!player.active) return;
    if (this.teleporting) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.berserkerEntered) {
      this.tickBerserker(time, delta);
      return;
    }

    this.kiteToward(player);

    // Phase 1 cross-body gating: defer fan + teleport while Crimson Lord is
    // mid-telegraph / mid-dash so the player isn't reading two simultaneous
    // threats. Solo mode (partner dead) bypasses the check, since
    // `isPartnerInDangerZone` returns false there anyway. Timers don't get
    // reset on a deferral — when the Lord exits the danger window, the
    // overdue fan / teleport fires immediately the next frame.
    const partnerDanger =
      !this.soloMode &&
      this.coordinator?.isPartnerInDangerZone(this) === true;

    // Fan (Phase 1 + 2 share this path; count + spread differ).
    if (time >= this.nextFanAt && !partnerDanger) {
      this.fireFan(player);
      this.nextFanAt = time + SAPPHIRE_MARQUIS_PHASE1_FAN_INTERVAL_MS;
    }

    // Teleport (Phase 1 + 2).
    if (time >= this.nextTeleportAt && !partnerDanger) {
      this.beginTeleport(time);
      this.nextTeleportAt = time + SAPPHIRE_MARQUIS_TELEPORT_INTERVAL_MS;
    }

    // Phase 2: bullet curtain on its own cadence.
    if (this.soloMode) {
      this.tickCurtain(time);
    }
  }

  // --- Coordinator danger-zone hook ----------------------------------------

  /**
   * Marquis has no discrete "incoming" window the Lord needs to defer for —
   * his fan + curtain are continuous-pressure attacks the partner can
   * dodge alongside their own moves. Always false.
   */
  override isInDangerZone(): boolean {
    return false;
  }

  // --- Movement / kiting ---------------------------------------------------

  private kiteToward(player: Player): void {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
      this.setVelocity(0, 0);
      return;
    }
    const error = len - SAPPHIRE_MARQUIS_KITE_DISTANCE;
    if (Math.abs(error) < 12) {
      this.setVelocity(0, 0);
      return;
    }
    // error > 0 → too far → move toward player; error < 0 → too close →
    // back away. Direction unit vector = (-dx, -dy)/len when approaching,
    // (dx, dy)/len when retreating.
    const sign = error > 0 ? -1 : 1;
    this.setVelocity(
      sign * (dx / len) * SAPPHIRE_MARQUIS_KITE_SPEED,
      sign * (dy / len) * SAPPHIRE_MARQUIS_KITE_SPEED,
    );
  }

  // --- Attacks -------------------------------------------------------------

  private fireFan(player: Player): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const baseAngle = Math.atan2(dy, dx);

    const count = this.soloMode
      ? SAPPHIRE_MARQUIS_PHASE2_FAN_COUNT
      : SAPPHIRE_MARQUIS_PHASE1_FAN_COUNT;
    const spread = this.soloMode
      ? SAPPHIRE_MARQUIS_PHASE2_FAN_SPREAD_RAD
      : SAPPHIRE_MARQUIS_PHASE1_FAN_SPREAD_RAD;
    // Even spacing across the spread, centered on baseAngle.
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

  private tickCurtain(time: number): void {
    if (this.curtainState === 'idle' && time >= this.nextCurtainAt) {
      this.curtainState = 'telegraph';
      this.curtainEndsAt = time + SAPPHIRE_MARQUIS_CURTAIN_TELEGRAPH_MS;
      // Telegraph pulse — same body flash idiom as the dash telegraph.
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.55 },
        duration: SAPPHIRE_MARQUIS_CURTAIN_TELEGRAPH_MS / 2,
        yoyo: true,
        onComplete: () => {
          if (this.active) this.setAlpha(1);
        },
      });
      return;
    }
    if (this.curtainState === 'telegraph' && time >= this.curtainEndsAt) {
      this.fireCurtain();
      this.curtainState = 'idle';
      this.nextCurtainAt = time + SAPPHIRE_MARQUIS_CURTAIN_INTERVAL_MS;
    }
  }

  private fireCurtain(): void {
    const count = SAPPHIRE_MARQUIS_CURTAIN_THORN_COUNT;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.BloodProjectile,
      );
    }
  }

  // --- Teleport ------------------------------------------------------------

  private beginTeleport(time: number): void {
    this.teleporting = true;
    const fadeMs = SAPPHIRE_MARQUIS_TELEPORT_FADE_MS;
    // Fade out → reposition → fade in. Position pick happens in the
    // mid-fade onComplete so the player can't follow into the destination.
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
    void time;
  }

  private pickTeleportTarget(): { x: number; y: number } {
    const bounds = this.host.getRoomBounds();
    const player = this.host.getPlayer();
    const minDistSq =
      SAPPHIRE_MARQUIS_TELEPORT_MIN_PLAYER_DISTANCE *
      SAPPHIRE_MARQUIS_TELEPORT_MIN_PLAYER_DISTANCE;
    // Track the candidate that's farthest from the player as the fallback,
    // so even if 10 random rolls all happen to land near the player we
    // still pick the safest one.
    let bestX = bounds.minX;
    let bestY = bounds.minY;
    let bestDistSq = -1;
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
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

  // --- Berserker (Phase 3) -------------------------------------------------

  private tickBerserker(time: number, delta: number): void {
    // Stand still — pure pattern boss in this phase. The spinning ring of
    // projectiles is the threat; movement would just add noise.
    this.setVelocity(0, 0);

    // Advance spin angle.
    const spinRateRad =
      (SAPPHIRE_MARQUIS_BERSERKER_SPIN_RATE_DEG_PER_SEC * Math.PI) / 180;
    this.spinAngle += spinRateRad * (delta / 1000);

    if (time >= this.nextBerserkerFireAt) {
      const arms = SAPPHIRE_MARQUIS_BERSERKER_ARM_COUNT;
      const skip = SAPPHIRE_MARQUIS_BERSERKER_SKIPPED_ARMS;
      // Skip the FIRST `skip` slot indices each wave — those slots stay
      // empty regardless of rotation, so the dodge-gap travels around the
      // body at the spin rate. Player can ride the gap.
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

  // --- Phase hooks ---------------------------------------------------------

  protected override onEnterSoloMode(): void {
    this.flashPhaseTransition(0xff80a0);
    this.scene.cameras.main.shake(180, 0.005);
    // Reset cadences so Phase 2 patterns kick in promptly without waiting
    // out a full cooldown.
    const now = this.scene.time.now;
    this.nextFanAt = now + 400;
    this.nextCurtainAt = now + 1100;
  }

  protected override enterBerserker(): void {
    this.flashPhaseTransition(0xffd040);
    this.scene.cameras.main.shake(260, 0.008);
    this.curtainState = 'idle';
    this.nextBerserkerFireAt = this.scene.time.now + 200;
  }

  private flashPhaseTransition(color: number): void {
    this.setTintFill(color);
    this.scene.time.delayedCall(VAMPIRE_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
  }
}
