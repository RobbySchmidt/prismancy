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

  fire(x: number, y: number, vx: number, vy: number): void {
    this.enableBody(true, x, y, true, true);
    this.setVelocity(vx, vy);
    this.setRotation(Math.atan2(vy, vx));
    this.spawnedAt = this.scene.time.now;
    this.lifetimeMs = ENEMY_PROJECTILE_LIFETIME_MS;
  }

  /**
   * Override the lifetime for this projectile in ms. Call after `fire()`.
   * Used by bosses whose attacks need a longer-lived projectile (e.g. orbit
   * patterns). Reset to the default on the next `fire()`.
   */
  setLifetime(ms: number): void {
    this.lifetimeMs = ms;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time - this.spawnedAt >= this.lifetimeMs) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}
