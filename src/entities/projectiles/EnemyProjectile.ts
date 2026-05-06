import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_LIFETIME_MS,
  ENEMY_PROJECTILE_RADIUS,
  TextureKeys,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';

/**
 * Enemy-faction projectile (currently used by Vine Sprout). Recycled via
 * EnemyProjectilePool — never construct directly from gameplay code.
 */
export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  private spawnedAt = 0;
  /**
   * Per-instance lifetime override, defaulting to ENEMY_PROJECTILE_LIFETIME_MS.
   * Reset on each `fire()` call. Bosses with long-running custom shots (e.g.
   * Bog Colossus orbital thorns) bump this so the projectile survives the
   * orbit + outward flight without the pool auto-deactivating it mid-pattern.
   */
  private lifetimeMs = ENEMY_PROJECTILE_LIFETIME_MS;

  /** Optional homing target. When set, preUpdate rotates the velocity toward
   * this target, capped by `homingTurnRate` rad/s, so the missile is still
   * dodgeable with sharp cuts. Reset to null on each `fire()` call. */
  private homingTarget:
    | (Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject)
    | null = null;
  private homingTurnRate = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.Thorn);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DepthLayers.EnemyProjectile);
    this.setCircle(
      ENEMY_PROJECTILE_RADIUS,
      this.width / 2 - ENEMY_PROJECTILE_RADIUS,
      this.height / 2 - ENEMY_PROJECTILE_RADIUS,
    );
    this.deactivate();
  }

  fire(x: number, y: number, vx: number, vy: number, textureKey?: string): void {
    this.enableBody(true, x, y, true, true);
    this.setVelocity(vx, vy);
    // Default back to the Thorn sprite if no override given — pool sprites
    // get recycled across enemies, so without resetting, a previous Mirror
    // shard's purple texture would carry into the next thorn fire.
    this.setTexture(textureKey ?? TextureKeys.Thorn);
    this.setRotation(Math.atan2(vy, vx));
    this.spawnedAt = this.scene.time.now;
    this.lifetimeMs = ENEMY_PROJECTILE_LIFETIME_MS;
    this.homingTarget = null;
    this.homingTurnRate = 0;
  }

  /**
   * Override the lifetime for this projectile in ms. Call after `fire()`.
   * Used by bosses whose attacks need a longer-lived projectile (e.g. orbit
   * patterns). Reset to the default on the next `fire()`.
   */
  setLifetime(ms: number): void {
    this.lifetimeMs = ms;
  }

  /**
   * Make this projectile track `target`, turning at most `turnRateRadPerSec`
   * radians per second. Call after `fire()`. Reset on the next `fire()`.
   * Lower turn rate = easier to dodge with sharp direction changes.
   */
  setHoming(
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    turnRateRadPerSec: number,
  ): void {
    this.homingTarget = target;
    this.homingTurnRate = turnRateRadPerSec;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time - this.spawnedAt >= this.lifetimeMs) {
      this.deactivate();
      return;
    }
    if (this.homingTarget && this.homingTarget.active) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0.5) {
        const currentAngle = Math.atan2(vy, vx);
        const desiredAngle = Math.atan2(
          this.homingTarget.y - this.y,
          this.homingTarget.x - this.x,
        );
        let diff = desiredAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = this.homingTurnRate * (delta / 1000);
        const clamped = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
        const newAngle = currentAngle + clamped;
        body.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
        this.setRotation(newAngle);
      }
    }
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}
