import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  SHAMBLER_FAN_SPREAD_DEG,
  SHAMBLER_INITIAL_DELAY_MS,
  SHAMBLER_RADIAL_EVERY_N,
  SHAMBLER_RADIAL_TELEGRAPH_MS,
  SHAMBLER_RADIAL_THORNS,
  SHAMBLER_VOLLEY_INTERVAL_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

type Target = Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;

/**
 * Emerald miniboss — a lumbering thorn-covered treant. Walks at the player
 * relentlessly (slow enough to back away from) while cycling volleys: an
 * aimed 3-thorn fan, and every `SHAMBLER_RADIAL_EVERY_N`-th volley a
 * telegraphed full radial instead. The pressure is the combination —
 * kiting the walk eats screen space, and the radial punishes hugging it.
 */
export class ThornwoodShambler extends BaseEnemy {
  private readonly target: Target;
  private readonly pool: EnemyProjectilePool;
  private nextVolleyAt: number;
  private volleyCount = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Target,
    pool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['miniboss-thornwood-shambler']);
    this.target = target;
    this.pool = pool;
    this.nextVolleyAt = scene.time.now + SHAMBLER_INITIAL_DELAY_MS;
  }

  protected tickAI(time: number): void {
    // Relentless slow walk toward the player.
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.setVelocity(
      (dx / d) * this.definition.moveSpeed,
      (dy / d) * this.definition.moveSpeed,
    );

    if (time < this.nextVolleyAt) return;
    this.volleyCount++;
    if (this.volleyCount % SHAMBLER_RADIAL_EVERY_N === 0) {
      // Telegraphed radial — charge cue + flash, thorns after the delay.
      this.nextVolleyAt = time + SHAMBLER_VOLLEY_INTERVAL_MS + SHAMBLER_RADIAL_TELEGRAPH_MS;
      EventBus.emit('enemy:charge');
      this.setTintFill(0xa8ffc0);
      this.scene.time.delayedCall(SHAMBLER_RADIAL_TELEGRAPH_MS, () => {
        // Deferred-callback guard (Bloomheart-freeze pattern): the shambler
        // may die during the telegraph.
        if (!this.active || !this.scene) return;
        this.clearTint();
        this.fireRadial();
      });
    } else {
      this.nextVolleyAt = time + SHAMBLER_VOLLEY_INTERVAL_MS;
      this.fireFan();
    }
  }

  private fireFan(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const aim = Math.atan2(this.target.y - body.center.y, this.target.x - body.center.x);
    const spread = Phaser.Math.DegToRad(SHAMBLER_FAN_SPREAD_DEG);
    for (const offset of [-spread, 0, spread]) {
      this.pool.fire(
        body.center.x,
        body.center.y,
        Math.cos(aim + offset) * ENEMY_PROJECTILE_SPEED,
        Math.sin(aim + offset) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  private fireRadial(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < SHAMBLER_RADIAL_THORNS; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / SHAMBLER_RADIAL_THORNS;
      this.pool.fire(
        body.center.x,
        body.center.y,
        Math.cos(angle) * ENEMY_PROJECTILE_SPEED,
        Math.sin(angle) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }
}
