import Phaser from 'phaser';
import { ENEMY_PROJECTILE_POOL_SIZE } from '../../config/GameConfig';
import { EnemyProjectile } from './EnemyProjectile';

/**
 * Pre-allocated pool for EnemyProjectiles. Lives on GameScene for the entire
 * scene lifetime; deactivateAll() is called on every room transition.
 */
export class EnemyProjectilePool {
  private readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      classType: EnemyProjectile,
      maxSize: ENEMY_PROJECTILE_POOL_SIZE,
      runChildUpdate: true,
    });
    for (let i = 0; i < ENEMY_PROJECTILE_POOL_SIZE; i++) {
      this.group.create(0, 0, undefined, undefined, false, false);
    }
  }

  fire(x: number, y: number, vx: number, vy: number): EnemyProjectile | null {
    const p = this.group.getFirstDead(false) as EnemyProjectile | null;
    if (!p) return null;
    p.fire(x, y, vx, vy);
    return p;
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  deactivateAll(): void {
    this.group.children.iterate((child) => {
      const p = child as EnemyProjectile;
      if (p.active) p.deactivate();
      return true;
    });
  }
}
