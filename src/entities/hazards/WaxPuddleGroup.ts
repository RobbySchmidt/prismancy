import Phaser from 'phaser';
import { WaxPuddle } from './WaxPuddle';

const WAX_PUDDLE_POOL_SIZE = 16;

/**
 * Pre-allocated pool for wax puddles. Lives on GameScene for the whole
 * scene lifetime; `deactivateAll()` is called on every room transition so
 * leftover puddles don't carry over.
 */
export class WaxPuddleGroup {
  private readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      classType: WaxPuddle,
      maxSize: WAX_PUDDLE_POOL_SIZE,
      runChildUpdate: true,
    });
    for (let i = 0; i < WAX_PUDDLE_POOL_SIZE; i++) {
      this.group.create(0, 0, undefined, undefined, false, false);
    }
  }

  /** Drop a puddle at `(x, y)`. No-op if the pool is full. */
  spawn(x: number, y: number, now: number): WaxPuddle | null {
    const p = this.group.getFirstDead(false) as WaxPuddle | null;
    if (!p) return null;
    p.ignite(x, y, now);
    return p;
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  deactivateAll(): void {
    this.group.children.iterate((child) => {
      const p = child as WaxPuddle;
      if (p.active) p.deactivate();
      return true;
    });
  }
}
