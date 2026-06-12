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

  /**
   * Authored scale captured at the first telegraph — WORLD_SPRITE_SCALE
   * for a normal bloom, the elite-promoted scale for a champion. The
   * open-mouth tween + the snap-shut reset MUST be relative to this:
   * absolute values (tween to 1.18, reset to 1) shrank every bloom to
   * scale 1.0 after its first fan and nuked the champion's ×1.5 — same
   * scale-trap as the Bog Frog cheek-puff (user-flagged twice 2026-06-12).
   */
  private baseScaleX = 0;
  private baseScaleY = 0;

  protected tickAI(time: number): void {
    if (!this.target.active) return;

    // Schedule the open-mouth telegraph one window before the actual shot.
    if (!this.telegraphScheduled && time >= this.nextFireAt - SNAPPER_BLOOM_TELEGRAPH_MS) {
      this.telegraphScheduled = true;
      // Lazy capture (promoteToElite runs right after construction, well
      // before the first telegraph, so this sees the final scale).
      if (this.baseScaleX === 0) {
        this.baseScaleX = this.scaleX;
        this.baseScaleY = this.scaleY;
      }
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScaleX * 1.18,
        scaleY: this.baseScaleY * 1.18,
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
      scaleX: this.baseScaleX,
      scaleY: this.baseScaleY,
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
