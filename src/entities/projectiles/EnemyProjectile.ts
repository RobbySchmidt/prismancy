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
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time - this.spawnedAt >= ENEMY_PROJECTILE_LIFETIME_MS) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}
