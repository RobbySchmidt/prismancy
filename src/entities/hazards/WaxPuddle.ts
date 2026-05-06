import Phaser from 'phaser';
import {
  TextureKeys,
  WAX_PUDDLE_DAMAGE,
  WAX_PUDDLE_HITBOX_RADIUS,
  WAX_PUDDLE_LIFETIME_MS,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';

/**
 * Hazard tile dropped behind a Possessed Candelabra. Stays on the floor for
 * `WAX_PUDDLE_LIFETIME_MS`, deals `WAX_PUDDLE_DAMAGE` to the player on
 * overlap (player's normal i-frames apply), then fades out and self-destroys.
 *
 * Pre-allocated by `WaxPuddleGroup` for pooling — game code should always
 * spawn via `WaxPuddleGroup.spawn(x, y)` rather than constructing directly.
 */
export class WaxPuddle extends Phaser.Physics.Arcade.Sprite {
  /** HP-equivalent damage dealt on overlap with the player. */
  readonly damage = WAX_PUDDLE_DAMAGE;
  private fadeAt = 0;
  private deactivateAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.WaxPuddle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DepthLayers.FloorDecoration + 1);

    // Centered circular sensor — uses the puddle's authored radius regardless
    // of any later scale tween.
    this.setCircle(
      WAX_PUDDLE_HITBOX_RADIUS,
      this.width / 2 - WAX_PUDDLE_HITBOX_RADIUS,
      this.height / 2 - WAX_PUDDLE_HITBOX_RADIUS,
    );
    // Static hazard — never moves, never gets pushed.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    this.deactivate();
  }

  /** Light up the puddle at `(x, y)` for its full lifetime. */
  ignite(x: number, y: number, now: number): void {
    this.enableBody(true, x, y, true, true);
    this.setAlpha(1);
    this.setScale(0.6);
    this.fadeAt = now + WAX_PUDDLE_LIFETIME_MS - 600;
    this.deactivateAt = now + WAX_PUDDLE_LIFETIME_MS;
    // Quick "flame whoof" on spawn so the drop reads as deliberate.
    this.scene.tweens.add({
      targets: this,
      scale: 1.0,
      duration: 220,
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
      // Linear fade across the last 600 ms — keep it cheap, no tween needed.
      const remain = Math.max(0, this.deactivateAt - time);
      this.setAlpha(Math.max(0.2, remain / 600));
    }
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}
