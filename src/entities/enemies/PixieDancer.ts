import Phaser from 'phaser';
import {
  PIXIE_IDEAL_DISTANCE,
  PIXIE_RADIAL_GAIN,
  PIXIE_TANGENT_RATIO,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { BaseEnemy } from './BaseEnemy';

/**
 * Pixie Dancer: tries to maintain `PIXIE_IDEAL_DISTANCE` from the player
 * while strafing tangentially around them. Each pixie picks a random
 * rotation direction at construction so multiple pixies don't all orbit
 * the same way.
 */
export class PixieDancer extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  private readonly rotationDir: 1 | -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  ) {
    super(scene, x, y, ENEMIES['pixie-dancer']);
    this.target = target;
    this.rotationDir = Math.random() < 0.5 ? -1 : 1;
  }

  protected tickAI(): void {
    if (!this.target.active) {
      this.setVelocity(0, 0);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < 1) {
      this.setVelocity(0, 0);
      return;
    }
    const dist = Math.sqrt(distSq);
    const speed = this.definition.moveSpeed;

    // Radial component: toward player if too far, away if too close.
    // Clamped to ±1 then scaled by RADIAL_GAIN, so close-range pull is firm.
    const radialUnitX = dx / dist;
    const radialUnitY = dy / dist;
    const offset = (dist - PIXIE_IDEAL_DISTANCE) / PIXIE_IDEAL_DISTANCE;
    const radial = Math.max(-1, Math.min(1, offset)) * PIXIE_RADIAL_GAIN;

    // Tangent: 90° rotation of the radial unit, scaled by rotation direction.
    const tangentX = -radialUnitY * this.rotationDir;
    const tangentY = radialUnitX * this.rotationDir;

    const vx = (radialUnitX * radial + tangentX * PIXIE_TANGENT_RATIO) * speed;
    const vy = (radialUnitY * radial + tangentY * PIXIE_TANGENT_RATIO) * speed;
    this.setVelocity(vx, vy);
  }
}
