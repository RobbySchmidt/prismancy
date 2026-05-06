import type Phaser from 'phaser';
import {
  DAMSELFLY_EMPRESS_DASH_DURATION_MS,
  DAMSELFLY_EMPRESS_DASH_SPEED,
  DAMSELFLY_EMPRESS_INITIAL_DELAY_MS,
  DAMSELFLY_EMPRESS_PHASE1_CYCLE_MS,
  DAMSELFLY_EMPRESS_PHASE2_CYCLE_MS,
  DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_SPEED,
  DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_THORNS,
  DAMSELFLY_EMPRESS_PHASE2_RECOVERY_MS,
  DAMSELFLY_EMPRESS_PHASE2_TELEGRAPH_MS,
  DAMSELFLY_EMPRESS_PHASE2_TRAIL_INTERVAL_MS,
  DAMSELFLY_EMPRESS_PHASE_FLASH_MS,
  DAMSELFLY_EMPRESS_RECOVERY_MS,
  DAMSELFLY_EMPRESS_TELEGRAPH_MS,
  DAMSELFLY_EMPRESS_TRAIL_INTERVAL_MS,
  DAMSELFLY_EMPRESS_TRAIL_SPEED,
  DAMSELFLY_EMPRESS_VISUAL_SCALE,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface DamselflyEmpressHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
}

type DashState = 'idle' | 'telegraph' | 'dash' | 'recovery';

/**
 * Damselfly Empress — Sapphire Swamp boss based on Damselfly. Dashes
 * straight across the room, dropping projectiles perpendicular to the dash
 * direction at fixed intervals (so the trail forms a "cross-thorn fence"
 * the player has to thread). Phase 2 (≤ 50 % HP): snappier rhythm
 * (shorter telegraph + recovery), tighter trail cadence, and a small
 * radial when the dash lands.
 */
export class DamselflyEmpress extends BossEnemy {
  override readonly displayName = 'Damselfly Empress';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: DamselflyEmpressHost;

  private dashState: DashState = 'idle';
  private nextStateChangeAt: number;
  /** Direction unit vector captured at telegraph end; locked for the dash. */
  private dashDirX = 1;
  private dashDirY = 0;
  /** Scene time for the next perpendicular projectile drop during a dash. */
  private nextTrailDropAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: DamselflyEmpressHost) {
    super(scene, x, y, ENEMIES['boss-damselfly-empress']);
    this.host = host;
    this.nextStateChangeAt = scene.time.now + DAMSELFLY_EMPRESS_INITIAL_DELAY_MS;
    this.setScale(DAMSELFLY_EMPRESS_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    this.tickDashCycle(time);
    if (this.dashState === 'dash' && time >= this.nextTrailDropAt) {
      this.dropTrailProjectile();
      this.nextTrailDropAt = time + this.getTrailIntervalMs();
    }
  }

  private getTelegraphMs(): number {
    return this.currentPhase >= 2
      ? DAMSELFLY_EMPRESS_PHASE2_TELEGRAPH_MS
      : DAMSELFLY_EMPRESS_TELEGRAPH_MS;
  }

  private getRecoveryMs(): number {
    return this.currentPhase >= 2
      ? DAMSELFLY_EMPRESS_PHASE2_RECOVERY_MS
      : DAMSELFLY_EMPRESS_RECOVERY_MS;
  }

  private getTrailIntervalMs(): number {
    return this.currentPhase >= 2
      ? DAMSELFLY_EMPRESS_PHASE2_TRAIL_INTERVAL_MS
      : DAMSELFLY_EMPRESS_TRAIL_INTERVAL_MS;
  }

  private tickDashCycle(time: number): void {
    if (time < this.nextStateChangeAt) return;
    switch (this.dashState) {
      case 'idle':
        this.beginTelegraph(time);
        break;
      case 'telegraph':
        this.beginDash(time);
        break;
      case 'dash':
        this.beginRecovery(time);
        break;
      case 'recovery':
        this.endCycle(time);
        break;
    }
  }

  private beginTelegraph(time: number): void {
    this.dashState = 'telegraph';
    const telegraphMs = this.getTelegraphMs();
    this.nextStateChangeAt = time + telegraphMs;
    this.setVelocity(0, 0);
    // Wing-flutter feel: alpha pulse so the player reads "wind-up incoming".
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.55,
      duration: telegraphMs / 2,
      yoyo: true,
    });
  }

  private beginDash(time: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.dashState = 'dash';
    this.nextStateChangeAt = time + DAMSELFLY_EMPRESS_DASH_DURATION_MS;
    this.nextTrailDropAt = time;

    const player = this.host.getPlayer();
    if (player.active) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy);
      this.dashDirX = len > 0.01 ? dx / len : 1;
      this.dashDirY = len > 0.01 ? dy / len : 0;
    }
    this.setVelocity(
      this.dashDirX * DAMSELFLY_EMPRESS_DASH_SPEED,
      this.dashDirY * DAMSELFLY_EMPRESS_DASH_SPEED,
    );
  }

  private beginRecovery(time: number): void {
    this.dashState = 'recovery';
    this.setVelocity(0, 0);
    this.nextStateChangeAt = time + this.getRecoveryMs();
    if (this.currentPhase >= 2) {
      this.fireLandingRadial();
    }
  }

  /**
   * Phase 2 only: when the dash ends, fire a small radial burst from the
   * boss's stop position. Punishes "follow her to her endpoint" strategies
   * and adds visual flair to mark the recovery moment.
   */
  private fireLandingRadial(): void {
    const count = DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_THORNS;
    const baseOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = baseOffset + (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_SPEED,
        Math.sin(a) * DAMSELFLY_EMPRESS_PHASE2_LANDING_RADIAL_SPEED,
      );
    }
  }

  private endCycle(time: number): void {
    this.dashState = 'idle';
    const cycle =
      this.currentPhase >= 2
        ? DAMSELFLY_EMPRESS_PHASE2_CYCLE_MS
        : DAMSELFLY_EMPRESS_PHASE1_CYCLE_MS;
    // The cycle constants represent "telegraph → dash → recovery → idle"
    // length, so the next state change is the remaining idle window
    // (cycle - telegraph - dash - recovery), clamped at 0.
    const idle =
      cycle - this.getTelegraphMs() - DAMSELFLY_EMPRESS_DASH_DURATION_MS - this.getRecoveryMs();
    this.nextStateChangeAt = time + Math.max(0, idle);
  }

  /**
   * Drop two projectiles perpendicular to the dash direction at the boss's
   * current position — one going each way from the dash line. The result is
   * a "fence" the player has to thread between or arc around. Same pattern
   * in both phases; Phase 2 only differs in cadence (see
   * `getTrailIntervalMs`).
   */
  private dropTrailProjectile(): void {
    const px = -this.dashDirY;
    const py = this.dashDirX;
    this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      px * DAMSELFLY_EMPRESS_TRAIL_SPEED,
      py * DAMSELFLY_EMPRESS_TRAIL_SPEED,
    );
    this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      -px * DAMSELFLY_EMPRESS_TRAIL_SPEED,
      -py * DAMSELFLY_EMPRESS_TRAIL_SPEED,
    );
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.setScale(DAMSELFLY_EMPRESS_VISUAL_SCALE);
    this.setTintFill(0x9ad8ff);
    this.scene.time.delayedCall(DAMSELFLY_EMPRESS_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    const now = this.scene.time.now;
    this.nextStateChangeAt = now + 400;
    this.dashState = 'idle';
  }
}
