import type Phaser from 'phaser';
import {
  FOREST_HEART_DRIFT_ARRIVE_DIST,
  FOREST_HEART_DRIFT_REPICK_MS,
  FOREST_HEART_DRIFT_SPEED_P1,
  FOREST_HEART_DRIFT_SPEED_P2,
  FOREST_HEART_FIRE_INITIAL_DELAY_MS,
  FOREST_HEART_PHASE_FLASH_MS,
  FOREST_HEART_SPIN_REVERSE_MS,
  FOREST_HEART_SPIRAL_ARMS_P1,
  FOREST_HEART_SPIRAL_ARMS_P2,
  FOREST_HEART_SPIRAL_INTERVAL_P1,
  FOREST_HEART_SPIRAL_INTERVAL_P2,
  FOREST_HEART_SPIRAL_SPEED,
  FOREST_HEART_SPIRAL_STEP_DEG_P1,
  FOREST_HEART_SPIRAL_STEP_DEG_P2,
  FOREST_HEART_VISUAL_SCALE,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Adapter so ForestHeart can read player + room bounds + projectile pool
 * without grabbing GameScene directly. Implemented by GameScene.
 */
export interface ForestHeartHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Forest Heart — Emerald Forest boss, "Drifting Spiral" rework. No longer a
 * rooted turret spitting evenly-spaced radials: it now slowly DRIFTS around
 * the room while firing a rotating spiral arm the player weaves through.
 * Phase 2 (≤ 50% HP) adds a second opposed arm, periodically reverses the
 * spin direction, and drifts faster. The Forest-Sprite add-spam was dropped —
 * the threat is the moving spiral dance.
 */
export class ForestHeart extends BossEnemy {
  override readonly displayName = 'Forest Heart';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: ForestHeartHost;

  // Spiral state.
  private spiralAngle = 0;
  private spinDir: 1 | -1 = 1;
  private nextSpiralAt: number;
  private nextSpinReverseAt = Number.POSITIVE_INFINITY;

  // Drift state.
  private driftTarget: { x: number; y: number } | null = null;
  private nextDriftRepickAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: ForestHeartHost) {
    super(scene, x, y, ENEMIES['boss-forest-heart']);
    this.host = host;
    this.spiralAngle = Math.random() * Math.PI * 2;
    this.nextSpiralAt = scene.time.now + FOREST_HEART_FIRE_INITIAL_DELAY_MS;
    this.setScale(FOREST_HEART_VISUAL_SCALE);

    // Mobile now — drift via arcade velocity, collide with the room.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);
    body.moves = true;
  }

  protected tickAI(time: number): void {
    this.tickDrift(time);

    if (this.currentPhase >= 2 && time >= this.nextSpinReverseAt) {
      this.spinDir = (this.spinDir * -1) as 1 | -1;
      this.nextSpinReverseAt = time + FOREST_HEART_SPIN_REVERSE_MS;
      // Brief flash so the reversal is readable.
      this.setTintFill(0x9effb0);
      this.scene.time.delayedCall(120, () => {
        if (this.active) this.clearTint();
      });
    }

    if (time >= this.nextSpiralAt) {
      this.fireSpiralShot();
      this.nextSpiralAt =
        time +
        (this.currentPhase >= 2
          ? FOREST_HEART_SPIRAL_INTERVAL_P2
          : FOREST_HEART_SPIRAL_INTERVAL_P1);
    }
  }

  /** Drift toward a wander target; repick on arrival or on the repick timer. */
  private tickDrift(time: number): void {
    const bounds = this.host.getRoomBounds();
    const margin = 90;
    if (
      this.driftTarget === null ||
      time >= this.nextDriftRepickAt ||
      Math.hypot(this.driftTarget.x - this.x, this.driftTarget.y - this.y) <
        FOREST_HEART_DRIFT_ARRIVE_DIST
    ) {
      this.driftTarget = {
        x: bounds.minX + margin + Math.random() * (bounds.maxX - bounds.minX - margin * 2),
        y: bounds.minY + margin + Math.random() * (bounds.maxY - bounds.minY - margin * 2),
      };
      this.nextDriftRepickAt = time + FOREST_HEART_DRIFT_REPICK_MS;
    }
    const dx = this.driftTarget.x - this.x;
    const dy = this.driftTarget.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed =
      this.currentPhase >= 2 ? FOREST_HEART_DRIFT_SPEED_P2 : FOREST_HEART_DRIFT_SPEED_P1;
    this.setVelocity((dx / len) * speed, (dy / len) * speed);
  }

  /**
   * Fire one spiral step: one thorn per arm at the current spiral angle
   * (arms evenly offset around the circle), then advance the angle so the
   * next shot trails behind — tracing a rotating spiral the player threads.
   */
  private fireSpiralShot(): void {
    const arms =
      this.currentPhase >= 2 ? FOREST_HEART_SPIRAL_ARMS_P2 : FOREST_HEART_SPIRAL_ARMS_P1;
    for (let arm = 0; arm < arms; arm++) {
      const a = this.spiralAngle + (arm / arms) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * FOREST_HEART_SPIRAL_SPEED,
        Math.sin(a) * FOREST_HEART_SPIRAL_SPEED,
      );
    }
    const stepDeg =
      this.currentPhase >= 2 ? FOREST_HEART_SPIRAL_STEP_DEG_P2 : FOREST_HEART_SPIRAL_STEP_DEG_P1;
    this.spiralAngle += this.spinDir * ((stepDeg * Math.PI) / 180);
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.setTintFill(0x6effa0);
    this.scene.time.delayedCall(FOREST_HEART_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(220, 0.006);
    this.nextSpinReverseAt = this.scene.time.now + FOREST_HEART_SPIN_REVERSE_MS;
  }
}
