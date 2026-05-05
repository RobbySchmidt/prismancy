import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  SNAPPER_BLOOM_FAN_SPREAD_RAD,
  SNAPPER_BLOOM_FIRE_INITIAL_DELAY_MS,
  SNAPPER_BLOOM_FIRE_INTERVAL_MS,
  SNAPPER_BLOOM_TELEGRAPH_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

/**
 * Snapper Bloom: rooted plant whose mouth opens (visual telegraph) before
 * spitting a 3-thorn aimed fan at the player. Always-vulnerable (no
 * shell-up phase) — the burst-with-telegraph rhythm is the difficulty,
 * not invulnerability windows.
 */
export class SnapperBloom extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly projectilePool: EnemyProjectilePool;
  private nextFireAt: number;
  private telegraphScheduled = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['snapper-bloom']);
    this.target = target;
    this.projectilePool = projectilePool;
    this.nextFireAt = scene.time.now + SNAPPER_BLOOM_FIRE_INITIAL_DELAY_MS;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
  }

  protected tickAI(time: number): void {
    if (!this.target.active) return;

    // Schedule the open-mouth telegraph one window before the actual shot.
    if (!this.telegraphScheduled && time >= this.nextFireAt - SNAPPER_BLOOM_TELEGRAPH_MS) {
      this.telegraphScheduled = true;
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: SNAPPER_BLOOM_TELEGRAPH_MS,
        ease: 'Sine.Out',
      });
    }

    if (time < this.nextFireAt) return;
    this.fireFan();
    this.nextFireAt = time + SNAPPER_BLOOM_FIRE_INTERVAL_MS;
    this.telegraphScheduled = false;

    // Snap the mouth shut after the burst.
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: 'Sine.In',
    });
  }

  private fireFan(): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const baseAngle = Math.atan2(dy, dx);
    const offsets = [-SNAPPER_BLOOM_FAN_SPREAD_RAD, 0, SNAPPER_BLOOM_FAN_SPREAD_RAD];
    for (const off of offsets) {
      const a = baseAngle + off;
      this.projectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }
}
