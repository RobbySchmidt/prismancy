import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  MIRROR_FIRE_INITIAL_DELAY_MS,
  MIRROR_FIRE_INTERVAL_MS,
  MIRROR_HOMING_TURN_RATE_DEG,
  MIRROR_PROJECTILE_LIFETIME_MS,
  MIRROR_TELEGRAPH_MS,
  TextureKeys,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

/**
 * Cursed Mirror: rooted homing shooter. Plays a brief telegraph flash as a
 * "missile incoming" warning, then fires a mansion-themed magic missile that
 * tracks the player at a capped turn rate. Outrun it with sharp direction
 * changes; drift in a straight line and it catches you.
 *
 * Mansion-floor mob. Threat axis: real-time evasion (not bullet-hell, not
 * pre-emptive prediction).
 */
export class CursedMirror extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly projectilePool: EnemyProjectilePool;

  /** Scene-time at which the next telegraph window starts. */
  private nextTelegraphAt: number;
  /** Scene-time at which the current telegraph fires (or 0 if idle). */
  private fireAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['cursed-mirror']);
    this.target = target;
    this.projectilePool = projectilePool;
    this.nextTelegraphAt = scene.time.now + MIRROR_FIRE_INITIAL_DELAY_MS;

    // Stationary: physics doesn't push or move us.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
  }

  protected tickAI(time: number): void {
    if (!this.target.active) return;

    // Idle → telegraph: brief flash so the player gets a heads-up that a
    // homing shot is incoming.
    if (this.fireAt === 0 && time >= this.nextTelegraphAt) {
      this.fireAt = time + MIRROR_TELEGRAPH_MS;
      this.startTelegraphFlash();
      EventBus.emit('enemy:charge');
      return;
    }

    // Telegraph → fire: aim at the player's current position, then enable
    // homing on the projectile so it tracks them in flight.
    if (this.fireAt !== 0 && time >= this.fireAt) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const vx = len > 0.5 ? (dx / len) * ENEMY_PROJECTILE_SPEED : ENEMY_PROJECTILE_SPEED;
      const vy = len > 0.5 ? (dy / len) * ENEMY_PROJECTILE_SPEED : 0;
      const shot = this.projectilePool.fire(this.x, this.y, vx, vy, TextureKeys.MansionMissile);
      if (shot) {
        shot.setLifetime(MIRROR_PROJECTILE_LIFETIME_MS);
        shot.setHoming(this.target, Phaser.Math.DegToRad(MIRROR_HOMING_TURN_RATE_DEG));
      }
      this.fireAt = 0;
      this.nextTelegraphAt = time + MIRROR_FIRE_INTERVAL_MS;
    }
  }

  /**
   * Brief alpha flash on the mirror so the player gets a visible "I'm
   * locking onto your position" cue. Tween targets the sprite directly;
   * the AI's `fireAt` timer is what actually drives the shot.
   */
  private startTelegraphFlash(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.55 },
      duration: MIRROR_TELEGRAPH_MS / 2,
      yoyo: true,
      repeat: 0,
      ease: 'Sine.InOut',
      onComplete: () => {
        if (this.active) this.setAlpha(1);
      },
    });
  }
}
