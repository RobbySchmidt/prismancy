import Phaser from 'phaser';
import {
  CRIMSON_LORD_BLOOD_TRAIL_LIFETIME_MS,
  TextureKeys,
  WAX_PUDDLE_DAMAGE,
  WAX_PUDDLE_HITBOX_RADIUS,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';

/**
 * Hazard tile dropped along the Crimson Lord's dash path in Phase 2+.
 * Mirrors the WaxPuddle (timed hazard, damage on overlap, fade then
 * deactivate) but with a shorter lifetime so a row of trail drops doesn't
 * permanently lock down the room. Pre-allocated by `BloodTrailGroup`.
 */
export class BloodTrail extends Phaser.Physics.Arcade.Sprite {
  readonly damage = WAX_PUDDLE_DAMAGE;
  private fadeAt = 0;
  private deactivateAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.BloodTrail);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DepthLayers.FloorDecoration + 1);

    this.setCircle(
      WAX_PUDDLE_HITBOX_RADIUS,
      this.width / 2 - WAX_PUDDLE_HITBOX_RADIUS,
      this.height / 2 - WAX_PUDDLE_HITBOX_RADIUS,
    );
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    this.deactivate();
  }

  /** Spawn at `(x, y)` for the trail's full lifetime. */
  ignite(x: number, y: number, now: number): void {
    this.enableBody(true, x, y, true, true);
    this.setAlpha(1);
    this.setScale(0.6);
    this.fadeAt = now + CRIMSON_LORD_BLOOD_TRAIL_LIFETIME_MS - 400;
    this.deactivateAt = now + CRIMSON_LORD_BLOOD_TRAIL_LIFETIME_MS;
    this.scene.tweens.add({
      targets: this,
      scale: 1.0,
      duration: 180,
      ease: 'Sine.Out',
    });
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time >= this.deactivateAt) {
      this.deactivate();
      return;
    }
    if (time >= this.fadeAt && this.alpha > 0.2) {
      const remain = Math.max(0, this.deactivateAt - time);
      this.setAlpha(Math.max(0.2, remain / 400));
    }
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}
