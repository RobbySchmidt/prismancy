import Phaser from 'phaser';
import { ENEMY_PROJECTILE_POOL_SIZE } from '../../config/GameConfig';
import { getSfxSynth } from '../../systems/SfxSynth';
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

  /**
   * Spawn an enemy projectile from the pool. `textureKey` overrides the
   * default Thorn sprite (used by the Cursed Mirror's amethyst shard, which
   * reads as a magic-missile-style bullet rather than a vine thorn). If
   * omitted the projectile is rendered with the default Thorn texture.
   */
  fire(
    x: number,
    y: number,
    vx: number,
    vy: number,
    textureKey?: string,
  ): EnemyProjectile | null {
    const p = this.group.getFirstDead(false) as EnemyProjectile | null;
    if (!p) return null;
    p.fire(x, y, vx, vy, textureKey);
    // Throttled inside SfxSynth so multi-thorn fans collapse to one cast sound.
    getSfxSynth().playEnemyCast();
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
