import Phaser from 'phaser';
import {
  DAMSELFLY_BURST_INITIAL_DELAY_JITTER_MS,
  DAMSELFLY_BURST_INITIAL_DELAY_MS,
  DAMSELFLY_BURST_INTERVAL_MS,
  DAMSELFLY_BURST_SPREAD_RAD,
  DAMSELFLY_DASH_DURATION_MS,
  DAMSELFLY_DASH_SPEED,
  DAMSELFLY_IDEAL_DISTANCE,
  DAMSELFLY_PROJECTILE_SPEED,
  DAMSELFLY_RADIAL_GAIN,
  DAMSELFLY_RECOVERY_MS,
  DAMSELFLY_TANGENT_RATIO,
  DAMSELFLY_TELEGRAPH_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

type DamselflyState = 'strafe' | 'telegraph' | 'dash' | 'recovery';

/**
 * Damselfly: orbital strafer that periodically wind-ups, dashes briefly
 * toward the player firing two spread projectiles, then recovers and
 * resumes strafing. Glass cannon — low HP, but the dash-burst combo makes
 * it the most aggressive Floor 2 mob.
 */
export class Damselfly extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly projectilePool: EnemyProjectilePool;
  private readonly rotationDir: 1 | -1;

  private aiState: DamselflyState = 'strafe';
  private nextBurstAt: number;
  private dashEndsAt = 0;
  private recoveryEndsAt = 0;
  /** Aim direction captured at telegraph start; locks the dash + projectile aim. */
  private aimX = 0;
  private aimY = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['damselfly']);
    this.target = target;
    this.projectilePool = projectilePool;
    this.rotationDir = Math.random() < 0.5 ? -1 : 1;
    // Stagger the first burst per-instance so multiple Damselflies don't
    // fire in lockstep; their cycles drift apart over time.
    this.nextBurstAt =
      scene.time.now +
      DAMSELFLY_BURST_INITIAL_DELAY_MS +
      Math.random() * DAMSELFLY_BURST_INITIAL_DELAY_JITTER_MS;
  }

  protected tickAI(time: number): void {
    if (!this.target.active) {
      this.setVelocity(0, 0);
      return;
    }

    switch (this.aiState) {
      case 'strafe':
        this.tickStrafe(time);
        break;
      case 'telegraph':
        if (time >= this.nextBurstAt) this.beginDash(time);
        else this.setVelocity(0, 0);
        break;
      case 'dash':
        if (time >= this.dashEndsAt) this.endDash(time);
        break;
      case 'recovery':
        this.setVelocity(0, 0);
        if (time >= this.recoveryEndsAt) {
          this.aiState = 'strafe';
          this.nextBurstAt = time + DAMSELFLY_BURST_INTERVAL_MS - DAMSELFLY_TELEGRAPH_MS;
        }
        break;
    }
  }

  private tickStrafe(time: number): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1) {
      this.setVelocity(0, 0);
    } else {
      const dist = Math.sqrt(distSq);
      const speed = this.definition.moveSpeed;
      const radialUnitX = dx / dist;
      const radialUnitY = dy / dist;
      const offset = (dist - DAMSELFLY_IDEAL_DISTANCE) / DAMSELFLY_IDEAL_DISTANCE;
      const radial = Math.max(-1, Math.min(1, offset)) * DAMSELFLY_RADIAL_GAIN;
      const tangentX = -radialUnitY * this.rotationDir;
      const tangentY = radialUnitX * this.rotationDir;
      this.setVelocity(
        (radialUnitX * radial + tangentX * DAMSELFLY_TANGENT_RATIO) * speed,
        (radialUnitY * radial + tangentY * DAMSELFLY_TANGENT_RATIO) * speed,
      );
    }

    // When the burst window opens, freeze + telegraph.
    if (time >= this.nextBurstAt - DAMSELFLY_TELEGRAPH_MS) {
      this.aiState = 'telegraph';
      this.setVelocity(0, 0);
      this.captureAim();
      // Wing-flash telegraph: pulse the tint so the player reads "incoming".
      this.scene.tweens.add({
        targets: this,
        alpha: 0.55,
        duration: DAMSELFLY_TELEGRAPH_MS / 2,
        yoyo: true,
      });
    }
  }

  private captureAim(): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) {
      this.aimX = 1;
      this.aimY = 0;
    } else {
      this.aimX = dx / len;
      this.aimY = dy / len;
    }
  }

  private beginDash(time: number): void {
    this.aiState = 'dash';
    this.setAlpha(1);
    this.dashEndsAt = time + DAMSELFLY_DASH_DURATION_MS;
    this.setVelocity(this.aimX * DAMSELFLY_DASH_SPEED, this.aimY * DAMSELFLY_DASH_SPEED);

    // Twin projectiles spread around the captured aim.
    const baseAngle = Math.atan2(this.aimY, this.aimX);
    for (const off of [-DAMSELFLY_BURST_SPREAD_RAD, DAMSELFLY_BURST_SPREAD_RAD]) {
      const a = baseAngle + off;
      this.projectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * DAMSELFLY_PROJECTILE_SPEED,
        Math.sin(a) * DAMSELFLY_PROJECTILE_SPEED,
      );
    }
  }

  private endDash(time: number): void {
    this.aiState = 'recovery';
    this.setVelocity(0, 0);
    this.recoveryEndsAt = time + DAMSELFLY_RECOVERY_MS;
  }
}
