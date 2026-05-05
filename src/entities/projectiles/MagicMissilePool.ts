import Phaser from 'phaser';
import { MISSILE_POOL_SIZE } from '../../config/GameConfig';
import { type Direction } from '../../types';
import { EventBus } from '../../utils/EventBus';
import { MagicMissile, type MagicMissileFireOptions } from './MagicMissile';

/**
 * Pre-allocated pool for MagicMissiles. Missiles are spawned/destroyed many
 * times per second so we recycle them via Phaser's group instead of
 * allocating each time (per CLAUDE.md performance note).
 */
export class MagicMissilePool {
  private readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      classType: MagicMissile,
      maxSize: MISSILE_POOL_SIZE,
      runChildUpdate: true,
    });
    for (let i = 0; i < MISSILE_POOL_SIZE; i++) {
      this.group.create(0, 0, undefined, undefined, false, false);
    }
  }

  fire(
    x: number,
    y: number,
    direction: Direction,
    opts: MagicMissileFireOptions,
  ): MagicMissile | null {
    const missile = this.group.getFirstDead(false) as MagicMissile | null;
    if (!missile) return null;
    missile.fire(x, y, direction, opts);
    EventBus.emit('missile:fired', { x, y });
    return missile;
  }

  /** Phaser group used for collider registration. */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  /** Recall all in-flight missiles. Used when tearing down a room. */
  deactivateAll(): void {
    this.group.children.iterate((child) => {
      const missile = child as MagicMissile;
      if (missile.active) missile.deactivate();
      return true;
    });
  }
}
