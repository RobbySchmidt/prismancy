import Phaser from 'phaser';
import { BloodTrail } from './BloodTrail';

/** 4 drops per dash × ~3 dashes alive at once = 12. Round up for safety. */
const BLOOD_TRAIL_POOL_SIZE = 16;

/**
 * Pre-allocated pool for blood trails. Lives on GameScene for the whole
 * scene lifetime; `deactivateAll()` is called on every room transition so
 * leftover trails don't carry over.
 */
export class BloodTrailGroup {
  private readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      classType: BloodTrail,
      maxSize: BLOOD_TRAIL_POOL_SIZE,
      runChildUpdate: true,
    });
    for (let i = 0; i < BLOOD_TRAIL_POOL_SIZE; i++) {
      this.group.create(0, 0, undefined, undefined, false, false);
    }
  }

  /** Drop a trail at `(x, y)`. No-op if the pool is full. */
  spawn(x: number, y: number, now: number): BloodTrail | null {
    const t = this.group.getFirstDead(false) as BloodTrail | null;
    if (!t) return null;
    t.ignite(x, y, now);
    return t;
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  deactivateAll(): void {
    this.group.children.iterate((child) => {
      const t = child as BloodTrail;
      if (t.active) t.deactivate();
      return true;
    });
  }
}
