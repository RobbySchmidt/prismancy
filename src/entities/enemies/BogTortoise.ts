import Phaser from 'phaser';
import {
  BOG_TORTOISE_BURST_INITIAL_DELAY_MS,
  BOG_TORTOISE_BURST_INTERVAL_MS,
  BOG_TORTOISE_BURST_THORN_COUNT,
  BOG_TORTOISE_SHELL_DURATION_MS,
  BOG_TORTOISE_WALK_SPEED,
  ENEMY_PROJECTILE_SPEED,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type Vector2 } from '../../types';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

type TortoiseState = 'walk' | 'shell';

/**
 * Bog Tortoise: slow walker that periodically retracts into its shell —
 * stops moving and rejects damage — then pops out with a 6-thorn radial
 * burst before resuming the walk. The invulnerable window is short
 * (BOG_TORTOISE_SHELL_DURATION_MS) and immediately followed by the burst,
 * so it acts as a positioning cue rather than a frustrating stalemate.
 */
export class BogTortoise extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly projectilePool: EnemyProjectilePool;

  private aiState: TortoiseState = 'walk';
  private nextStateChangeAt: number;
  private invulnerable = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['bog-tortoise']);
    this.target = target;
    this.projectilePool = projectilePool;
    this.nextStateChangeAt = scene.time.now + BOG_TORTOISE_BURST_INITIAL_DELAY_MS;
  }

  protected tickAI(time: number): void {
    if (!this.target.active) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.aiState === 'walk') {
      this.tickWalk();
      if (time >= this.nextStateChangeAt) this.beginShell(time);
    } else {
      // Shell phase: stationary + invuln. Pop on timeout.
      this.setVelocity(0, 0);
      if (time >= this.nextStateChangeAt) this.popOut(time);
    }
  }

  private tickWalk(): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity(
      (dx / len) * BOG_TORTOISE_WALK_SPEED,
      (dy / len) * BOG_TORTOISE_WALK_SPEED,
    );
  }

  private beginShell(time: number): void {
    this.aiState = 'shell';
    this.invulnerable = true;
    this.setVelocity(0, 0);
    this.nextStateChangeAt = time + BOG_TORTOISE_SHELL_DURATION_MS;
    EventBus.emit('enemy:charge');
    // Pulse-tint so the player reads "shell is up — I'm wasting shots".
    this.scene.tweens.add({
      targets: this,
      alpha: 0.65,
      duration: BOG_TORTOISE_SHELL_DURATION_MS / 2,
      yoyo: true,
      ease: 'Sine.InOut',
    });
  }

  private popOut(time: number): void {
    this.invulnerable = false;
    this.setAlpha(1);
    this.aiState = 'walk';
    this.nextStateChangeAt = time + BOG_TORTOISE_BURST_INTERVAL_MS;
    // 6-thorn radial burst (cardinal + diagonal).
    const step = (Math.PI * 2) / BOG_TORTOISE_BURST_THORN_COUNT;
    for (let i = 0; i < BOG_TORTOISE_BURST_THORN_COUNT; i++) {
      const a = i * step;
      this.projectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  /**
   * While the shell is up, completely reject damage + knockback. Visual
   * feedback (the shell pulse) tells the player to back off; the alternative
   * — letting damage through — would make the shell purely cosmetic.
   */
  override takeDamage(amount: number, knockback?: Vector2): boolean {
    if (this.invulnerable) {
      // Spark particle at a random spot on the shell so the player can read
      // "your hit landed but the shell absorbed it" without burning camera shake.
      const spark = this.scene.add.circle(
        this.x + (Math.random() - 0.5) * 18,
        this.y - 2 + (Math.random() - 0.5) * 8,
        2,
        0xc0e8ff,
        1,
      );
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0.3,
        duration: 200,
        ease: 'Sine.Out',
        onComplete: () => spark.destroy(),
      });
      return false;
    }
    return super.takeDamage(amount, knockback);
  }
}
