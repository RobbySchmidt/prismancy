import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  LURKER_EMERGE_RADIAL_THORNS,
  LURKER_EMERGE_TELEGRAPH_MS,
  LURKER_FIRST_SUBMERGE_DELAY_MS,
  LURKER_SUBMERGED_ALPHA,
  LURKER_SUBMERGE_MS,
  LURKER_SURFACE_IDLE_MS,
  LURKER_SURFACE_SHOT_INTERVAL_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

type Target = Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;

type LurkerState = 'surfaced' | 'submerged' | 'emerging';

/**
 * Sapphire miniboss — a humped swamp shape that dives under the bog.
 * Submerged it's intangible (missiles + player pass through, Wraith-style
 * via `body.checkCollision.none`) and repositions toward the player fast;
 * it then emerges with a telegraphed radial and trades aimed shots while
 * surfaced. The fight rhythm is "punish the surfaced window" — shooting
 * the wake while it's under does nothing.
 */
export class MireLurker extends BaseEnemy {
  private readonly target: Target;
  private readonly pool: EnemyProjectilePool;
  private lurkerState: LurkerState = 'surfaced';
  private nextStateAt: number;
  private nextShotAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Target,
    pool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['miniboss-mire-lurker']);
    this.target = target;
    this.pool = pool;
    this.nextStateAt = scene.time.now + LURKER_FIRST_SUBMERGE_DELAY_MS;
  }

  protected tickAI(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    switch (this.lurkerState) {
      case 'surfaced': {
        this.setVelocity(0, 0);
        if (time >= this.nextShotAt) {
          this.nextShotAt = time + LURKER_SURFACE_SHOT_INTERVAL_MS;
          this.fireAimed();
        }
        if (time >= this.nextStateAt) {
          this.lurkerState = 'submerged';
          this.nextStateAt = time + LURKER_SUBMERGE_MS;
          this.setAlpha(LURKER_SUBMERGED_ALPHA);
          body.checkCollision.none = true;
        }
        break;
      }
      case 'submerged': {
        // Fast intangible glide toward the player — the dive is the
        // reposition tool, not an attack.
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        this.setVelocity(
          (dx / d) * this.definition.moveSpeed,
          (dy / d) * this.definition.moveSpeed,
        );
        if (time >= this.nextStateAt) {
          this.lurkerState = 'emerging';
          this.nextStateAt = time + LURKER_EMERGE_TELEGRAPH_MS;
          this.setVelocity(0, 0);
          EventBus.emit('enemy:charge');
          // Alpha swells back during the telegraph so the emerge point is
          // readable before the radial fires.
          this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: LURKER_EMERGE_TELEGRAPH_MS,
            ease: 'Sine.Out',
          });
        }
        break;
      }
      case 'emerging': {
        this.setVelocity(0, 0);
        if (time >= this.nextStateAt) {
          this.lurkerState = 'surfaced';
          this.nextStateAt = time + LURKER_SURFACE_IDLE_MS;
          this.nextShotAt = time + LURKER_SURFACE_SHOT_INTERVAL_MS;
          body.checkCollision.none = false;
          this.fireEmergeRadial();
        }
        break;
      }
    }
  }

  private fireAimed(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const aim = Math.atan2(this.target.y - body.center.y, this.target.x - body.center.x);
    this.pool.fire(
      body.center.x,
      body.center.y,
      Math.cos(aim) * ENEMY_PROJECTILE_SPEED,
      Math.sin(aim) * ENEMY_PROJECTILE_SPEED,
    );
  }

  private fireEmergeRadial(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < LURKER_EMERGE_RADIAL_THORNS; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / LURKER_EMERGE_RADIAL_THORNS;
      this.pool.fire(
        body.center.x,
        body.center.y,
        Math.cos(angle) * ENEMY_PROJECTILE_SPEED,
        Math.sin(angle) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }
}
