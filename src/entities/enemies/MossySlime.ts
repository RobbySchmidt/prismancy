import Phaser from 'phaser';
import {
  MOSSY_SLIME_HOP_BIAS_RAD,
  MOSSY_SLIME_HOP_DURATION_MS,
  MOSSY_SLIME_WAIT_MAX_MS,
  MOSSY_SLIME_WAIT_MIN_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { BaseEnemy } from './BaseEnemy';

type SlimeState = 'wait' | 'hop';

/**
 * Mossy Slime: alternates between waiting (velocity 0) and hopping in a
 * direction biased toward the player. Adds positional pressure without
 * being a pure beeline like Forest Sprite.
 */
export class MossySlime extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;

  private aiState: SlimeState = 'wait';
  private nextStateChangeAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  ) {
    super(scene, x, y, ENEMIES['mossy-slime']);
    this.target = target;
    // First wait window so several slimes don't all jump in lockstep.
    this.nextStateChangeAt = scene.time.now + Phaser.Math.Between(0, MOSSY_SLIME_WAIT_MAX_MS);
  }

  protected tickAI(time: number): void {
    if (time < this.nextStateChangeAt) return;

    if (this.aiState === 'wait') {
      this.startHop(time);
    } else {
      this.endHop(time);
    }
  }

  private startHop(time: number): void {
    if (!this.target.active) {
      this.scheduleNextWait(time);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const baseAngle = Math.atan2(dy, dx);
    const noise = (Math.random() - 0.5) * 2 * MOSSY_SLIME_HOP_BIAS_RAD;
    const angle = baseAngle + noise;
    const speed = this.definition.moveSpeed;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.aiState = 'hop';
    this.nextStateChangeAt = time + MOSSY_SLIME_HOP_DURATION_MS;
  }

  private endHop(time: number): void {
    this.setVelocity(0, 0);
    this.aiState = 'wait';
    this.scheduleNextWait(time);
  }

  private scheduleNextWait(time: number): void {
    const wait = Phaser.Math.Between(MOSSY_SLIME_WAIT_MIN_MS, MOSSY_SLIME_WAIT_MAX_MS);
    this.nextStateChangeAt = time + wait;
  }
}
