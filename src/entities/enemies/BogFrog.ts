import Phaser from 'phaser';
import {
  BOG_FROG_HOP_DISTANCE,
  BOG_FROG_HOP_DURATION_MS,
  BOG_FROG_IDLE_MS,
  BOG_FROG_POST_SHOT_MS,
  BOG_FROG_TELEGRAPH_MS,
  BOG_FROG_TONGUE_SPEED,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

type FrogState = 'idle' | 'telegraph' | 'postShot' | 'hop';

/**
 * Bog Frog: idle-fire-hop loop. Sits still, telegraphs by tinting + briefly
 * scaling, fires a single fast tongue projectile in the cardinal direction
 * closest to the player, waits, then hops a short distance to a new spot
 * and re-arms. The cardinal-only aim mirrors the Vine Sprout so it reads as
 * dodgeable; the speed bump (BOG_FROG_TONGUE_SPEED > base ENEMY_PROJECTILE_SPEED)
 * is what makes it more aggressive than Floor 1 shooters.
 */
export class BogFrog extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly projectilePool: EnemyProjectilePool;

  private aiState: FrogState = 'idle';
  private nextStateChangeAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['bog-frog']);
    this.target = target;
    this.projectilePool = projectilePool;
    // Stagger first idle so multiple frogs don't fire in lockstep.
    this.nextStateChangeAt = scene.time.now + Phaser.Math.Between(0, BOG_FROG_IDLE_MS);
  }

  protected tickAI(time: number): void {
    if (time < this.nextStateChangeAt) return;
    if (!this.target.active) {
      this.setVelocity(0, 0);
      return;
    }

    switch (this.aiState) {
      case 'idle':
        this.beginTelegraph(time);
        break;
      case 'telegraph':
        this.fireTongue(time);
        break;
      case 'postShot':
        this.beginHop(time);
        break;
      case 'hop':
        this.endHop(time);
        break;
    }
  }

  private beginTelegraph(time: number): void {
    this.aiState = 'telegraph';
    this.nextStateChangeAt = time + BOG_FROG_TELEGRAPH_MS;
    EventBus.emit('enemy:charge');
    // Cheek-puff: scale up slightly so the player sees a wind-up.
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.12,
      scaleY: 0.94,
      duration: BOG_FROG_TELEGRAPH_MS,
      ease: 'Sine.Out',
    });
  }

  private fireTongue(time: number): void {
    // Reset scale from the telegraph tween.
    this.scene.tweens.killTweensOf(this);
    this.setScale(1, 1);

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    let vx = 0;
    let vy = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      vx = Math.sign(dx) * BOG_FROG_TONGUE_SPEED;
    } else {
      vy = Math.sign(dy) * BOG_FROG_TONGUE_SPEED;
    }
    this.projectilePool.fire(this.x, this.y, vx, vy);

    this.aiState = 'postShot';
    this.nextStateChangeAt = time + BOG_FROG_POST_SHOT_MS;
  }

  private beginHop(time: number): void {
    // Hop direction = away from current orientation toward player + jitter,
    // so the frog reposition isn't fully predictable but trends nearer.
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const baseAngle = Math.atan2(dy, dx);
    const jitter = (Math.random() - 0.5) * Math.PI; // ±90°
    const angle = baseAngle + jitter;
    const speed = BOG_FROG_HOP_DISTANCE / (BOG_FROG_HOP_DURATION_MS / 1000);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.aiState = 'hop';
    this.nextStateChangeAt = time + BOG_FROG_HOP_DURATION_MS;
  }

  private endHop(time: number): void {
    this.setVelocity(0, 0);
    this.aiState = 'idle';
    this.nextStateChangeAt = time + BOG_FROG_IDLE_MS;
  }
}
