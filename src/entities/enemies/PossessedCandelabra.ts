import Phaser from 'phaser';
import {
  CANDELABRA_FIRE_INITIAL_DELAY_MS,
  CANDELABRA_FIRE_INTERVAL_MS,
  CANDELABRA_PROJECTILE_COUNT,
  CANDELABRA_PROJECTILE_SPREAD_DEG,
  CANDELABRA_PUDDLE_DROP_INTERVAL_MS,
  ENEMY_PROJECTILE_SPEED,
  TextureKeys,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type WaxPuddleGroup } from '../hazards/WaxPuddleGroup';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

/**
 * Possessed Candelabra: slow tanky walker that:
 *   - drops a wax-puddle hazard behind itself every 2 s, AND
 *   - fires a 3-projectile flame cone toward the player every 2.5 s.
 *
 * Multi-axis threat: positional pressure (puddle trail) + ranged pressure
 * (cone fire). High HP (5) so the player can't burn it down before the
 * trail builds up.
 *
 * Mansion-floor mob.
 */
export class PossessedCandelabra extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly waxPuddleGroup: WaxPuddleGroup;
  private readonly projectilePool: EnemyProjectilePool;

  private nextPuddleAt: number;
  private nextFireAt: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    waxPuddleGroup: WaxPuddleGroup,
    projectilePool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['possessed-candelabra']);
    this.target = target;
    this.waxPuddleGroup = waxPuddleGroup;
    this.projectilePool = projectilePool;
    // Stagger first puddle + fire so a wave of candelabras doesn't all
    // discharge in the same frame.
    this.nextPuddleAt =
      scene.time.now + CANDELABRA_PUDDLE_DROP_INTERVAL_MS * (0.5 + Math.random() * 0.5);
    this.nextFireAt =
      scene.time.now + CANDELABRA_FIRE_INITIAL_DELAY_MS + Math.random() * 600;
  }

  protected tickAI(time: number): void {
    // Movement — straight chase, slow.
    if (!this.target.active) {
      this.setVelocity(0, 0);
    } else {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) {
        this.setVelocity(0, 0);
      } else {
        const speed = this.definition.moveSpeed;
        this.setVelocity((dx / len) * speed, (dy / len) * speed);
      }
    }

    // Puddle drop — at the candelabra's current position, on a fixed cadence.
    if (time >= this.nextPuddleAt) {
      this.waxPuddleGroup.spawn(this.x, this.y + 6, time);
      this.nextPuddleAt = time + CANDELABRA_PUDDLE_DROP_INTERVAL_MS;
    }

    // Cone fire — N flame projectiles toward the player, evenly spread.
    if (time >= this.nextFireAt && this.target.active) {
      this.fireFlameCone();
      this.nextFireAt = time + CANDELABRA_FIRE_INTERVAL_MS;
    }
  }

  private fireFlameCone(): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return; // skip degenerate aim
    const baseAngle = Math.atan2(dy, dx);
    const spread = (CANDELABRA_PROJECTILE_SPREAD_DEG * Math.PI) / 180;
    const count: number = CANDELABRA_PROJECTILE_COUNT;
    // Even fan: -spread/2 ... +spread/2 across (count - 1) steps. The
    // single-projectile case (count === 1) would divide by zero, so guard.
    const denom = count > 1 ? count - 1 : 1;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / denom - 0.5 : 0; // -0.5 .. +0.5
      const angle = baseAngle + t * spread;
      const vx = Math.cos(angle) * ENEMY_PROJECTILE_SPEED;
      const vy = Math.sin(angle) * ENEMY_PROJECTILE_SPEED;
      this.projectilePool.fire(this.x, this.y - 4, vx, vy, TextureKeys.FlameMissile);
    }
  }
}
