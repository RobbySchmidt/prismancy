import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import {
  MIRROR_PORTAL_HITBOX_RADIUS,
  MIRROR_PORTAL_HP,
  TextureKeys,
  WORLD_SPRITE_SCALE,
} from '../config/GameConfig';

/**
 * Mirror Portal — Marquis-of-Mirages Mirror-Special prop. Two roles:
 *  - **Entry portal** (`isEntry = true`): the boss fades into this. Active
 *    visual (cyan rune-glow + sapphire glass + pulsing halo). HP-bearing,
 *    destructible by player missiles. Destruction triggers `onDestroyed`,
 *    which the boss uses to nullify all linked homing projectiles spawned
 *    during this special.
 *  - **Exit portal** (`isEntry = false`): the boss emerges from this. Drained
 *    visual (dim trim + dark glass). NOT destructible — pure spawn anchor.
 *
 * Lives in its own scene group (`mirrorPortals`) so the missile↔portal
 * overlap can fire without polluting the room-clear enemy count.
 */
export class MirrorPortal extends Phaser.Physics.Arcade.Sprite {
  readonly isEntry: boolean;
  hp: number;
  readonly maxHp: number;

  /**
   * Fired exactly once when the portal's HP reaches 0 from player damage.
   * The boss subscribes to this to deactivate any homing projectiles that
   * were tagged as linked to this entry portal during the special. Set via
   * `onDestroyed`. NOT fired for natural-lifetime despawns (`despawn()`).
   */
  private destroyedCallback: (() => void) | null = null;
  private destroyed = false;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, isEntry: boolean) {
    super(
      scene,
      x,
      y,
      isEntry ? TextureKeys.MirrorPortalEntry : TextureKeys.MirrorPortalExit,
    );
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.isEntry = isEntry;
    this.maxHp = MIRROR_PORTAL_HP;
    this.hp = this.maxHp;

    this.setDepth(DepthLayers.FloorDecoration + 5);
    this.setScale(WORLD_SPRITE_SCALE);

    // Hitbox compensation: setCircle is in *texture* space, but the sprite is
    // scaled by WORLD_SPRITE_SCALE → divide the radius so the world-space body
    // matches the configured radius (same idiom as Player / BaseEnemy).
    const radius = MIRROR_PORTAL_HITBOX_RADIUS / WORLD_SPRITE_SCALE;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.setCircle(radius, halfW - radius, halfH - radius);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    // Materialize-in tween: fast scale-up + alpha-up so portals appear with
    // a "pop" instead of just popping into existence.
    this.setAlpha(0);
    this.setScale(WORLD_SPRITE_SCALE * 0.4);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: WORLD_SPRITE_SCALE,
      scaleY: WORLD_SPRITE_SCALE,
      duration: 260,
      ease: 'Back.Out',
    });

    // Entry-only: gentle scale pulse to signal "active / destructible target".
    if (isEntry) {
      this.pulseTween = scene.tweens.add({
        targets: this,
        scaleX: WORLD_SPRITE_SCALE * 1.06,
        scaleY: WORLD_SPRITE_SCALE * 1.06,
        duration: 700,
        yoyo: true,
        repeat: -1,
        delay: 280,
        ease: 'Sine.InOut',
      });
    }
  }

  onDestroyed(callback: () => void): void {
    this.destroyedCallback = callback;
  }

  /**
   * Player-missile damage entry point. Returns `true` iff this hit killed
   * the portal. Exit portals are non-destructible — return false without
   * any visual feedback so missiles passing through don't read as "hits".
   */
  takeDamage(amount: number): boolean {
    if (!this.isEntry || this.destroyed || this.hp <= 0) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.shatter();
      return true;
    }
    // Hit flash (cyan flash to keep on-theme).
    this.setTintFill(0xb0f0ff);
    this.scene.time.delayedCall(70, () => {
      if (this.active) this.clearTint();
    });
    return false;
  }

  /**
   * Player destroyed it. Fire the callback (boss nullifies linked projectiles),
   * play a shatter cosmetic, then destroy the sprite.
   */
  private shatter(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pulseTween?.stop();
    this.pulseTween = null;
    this.destroyedCallback?.();
    this.destroyedCallback = null;
    // Disable the body immediately so subsequent hits don't queue up.
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) body.enable = false;
    this.setTintFill(0xffffff);
    this.scene.cameras.main.shake(120, 0.005);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: WORLD_SPRITE_SCALE * 1.4,
      scaleY: WORLD_SPRITE_SCALE * 1.4,
      duration: 280,
      ease: 'Cubic.Out',
      onComplete: () => {
        if (this.active) this.destroy();
      },
    });
  }

  /**
   * Natural lifetime end (special completed without destruction). Fades out
   * smoothly without firing the destroyedCallback.
   */
  despawn(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pulseTween?.stop();
    this.pulseTween = null;
    this.destroyedCallback = null;
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) body.enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: WORLD_SPRITE_SCALE * 0.85,
      scaleY: WORLD_SPRITE_SCALE * 0.85,
      duration: 240,
      ease: 'Sine.In',
      onComplete: () => {
        if (this.active) this.destroy();
      },
    });
  }
}
