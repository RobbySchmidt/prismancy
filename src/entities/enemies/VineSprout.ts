import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  VINE_SPROUT_FIRE_INITIAL_DELAY_MS,
  VINE_SPROUT_FIRE_INTERVAL_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

/**
 * Vine Sprout: rooted enemy that fires a single thorn at the player on a
 * cooldown, in whichever cardinal direction is closest to the player. Body
 * is set to immovable + non-moving so knockback doesn't push it around.
 */
export class VineSprout extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly projectilePool: EnemyProjectilePool;
  private nextFireAt: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['vine-sprout']);
    this.target = target;
    this.projectilePool = projectilePool;
    this.nextFireAt = scene.time.now + VINE_SPROUT_FIRE_INITIAL_DELAY_MS;

    // Stationary: physics doesn't push or move us.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
  }

  protected tickAI(time: number): void {
    if (time < this.nextFireAt) return;
    if (!this.target.active) return;

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    let vx = 0;
    let vy = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      vx = Math.sign(dx) * ENEMY_PROJECTILE_SPEED;
    } else {
      vy = Math.sign(dy) * ENEMY_PROJECTILE_SPEED;
    }
    this.projectilePool.fire(this.x, this.y, vx, vy);
    this.nextFireAt = time + VINE_SPROUT_FIRE_INTERVAL_MS;
  }
}
