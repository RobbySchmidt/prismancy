import Phaser from 'phaser';
import {
  DEFAULT_MISSILE_TINT,
  MISSILE_RADIUS,
  TextureKeys,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { DIRECTION_VECTORS, type Direction } from '../../types';

/** Per-fire parameters resolved from the player's effective stats. */
export interface MagicMissileFireOptions {
  speed: number;
  /** Total flight time in ms before the missile auto-deactivates. */
  lifetime: number;
  /** Damage applied on enemy hit. Read by the GameScene overlap handler. */
  damage: number;
  /** Visual scale factor applied to the sprite. */
  scale: number;
  /** Tint colour (0xffffff = no tint / original sprite colour). */
  tint: number;
}

/**
 * Player magic missile. Recycled via MagicMissilePool — never construct
 * directly from gameplay code; spawn via Pool.fire().
 */
export class MagicMissile extends Phaser.Physics.Arcade.Sprite {
  /** Damage dealt on hit. Set per fire(); read by missile↔enemy overlap. */
  damage = 0;

  private spawnedAt = 0;
  private lifetime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.MagicMissile);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DepthLayers.Missile);
    this.setCircle(
      MISSILE_RADIUS,
      this.width / 2 - MISSILE_RADIUS,
      this.height / 2 - MISSILE_RADIUS,
    );
    this.deactivate();
  }

  fire(x: number, y: number, direction: Direction, opts: MagicMissileFireOptions): void {
    const v = DIRECTION_VECTORS[direction];
    this.enableBody(true, x, y, true, true);
    this.setVelocity(v.x * opts.speed, v.y * opts.speed);
    this.setScale(opts.scale);
    if (opts.tint === DEFAULT_MISSILE_TINT) {
      this.clearTint();
    } else {
      this.setTint(opts.tint);
    }
    this.damage = opts.damage;
    this.lifetime = opts.lifetime;
    this.spawnedAt = this.scene.time.now;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time - this.spawnedAt >= this.lifetime) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}
