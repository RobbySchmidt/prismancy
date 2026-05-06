import Phaser from 'phaser';
import {
  WRAITH_ALPHA_INTANGIBLE,
  WRAITH_ALPHA_SOLID,
  WRAITH_PHASE_INTANGIBLE_MS,
  WRAITH_PHASE_SOLID_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type Vector2 } from '../../types';
import { BaseEnemy } from './BaseEnemy';

/**
 * Wraith: hooded ghost that beelines toward the player, periodically
 * cycling into a translucent intangible state where it can't be hit and
 * doesn't deal contact damage. The Wraith *keeps moving* through the
 * intangible window, so the player has to time their volley around the
 * solid window rather than burning it down with sustained fire.
 *
 * Mansion-floor mob. Threat axis: pressure + timing (not bullet-hell).
 */
export class Wraith extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;

  private intangible = false;
  /** Scene-time at which the current phase ends and we flip state. */
  private nextPhaseFlipAt: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  ) {
    super(scene, x, y, ENEMIES.wraith);
    this.target = target;
    this.setAlpha(WRAITH_ALPHA_SOLID);
    this.nextPhaseFlipAt = scene.time.now + WRAITH_PHASE_SOLID_MS;
  }

  protected tickAI(time: number): void {
    if (time >= this.nextPhaseFlipAt) {
      this.flipPhase(time);
    }

    if (!this.target.active) {
      this.setVelocity(0, 0);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) {
      this.setVelocity(0, 0);
      return;
    }
    const speed = this.definition.moveSpeed;
    this.setVelocity((dx / len) * speed, (dy / len) * speed);
  }

  /**
   * Flip between solid / intangible. Intangible disables collision detection
   * (player passes through, missiles pass through, no contact damage); body
   * stays *enabled* for movement so the wraith keeps tracking through the
   * phase window.
   */
  private flipPhase(time: number): void {
    this.intangible = !this.intangible;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.intangible) {
      this.setAlpha(WRAITH_ALPHA_INTANGIBLE);
      body.checkCollision.none = true;
      this.nextPhaseFlipAt = time + WRAITH_PHASE_INTANGIBLE_MS;
    } else {
      this.setAlpha(WRAITH_ALPHA_SOLID);
      body.checkCollision.none = false;
      this.nextPhaseFlipAt = time + WRAITH_PHASE_SOLID_MS;
    }
  }

  /**
   * Damage is no-op while intangible — even a Phaser overlap that slips
   * through (e.g. body.checkCollision.none doesn't apply to the missile
   * direction) gets absorbed here so the wraith reads consistently as
   * "untouchable while phased".
   */
  override takeDamage(amount: number, knockback?: Vector2): boolean {
    if (this.intangible) return false;
    return super.takeDamage(amount, knockback);
  }
}
