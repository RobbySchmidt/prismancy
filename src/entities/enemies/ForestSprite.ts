import Phaser from 'phaser';
import { ENEMIES } from '../../data/enemies';
import { BaseEnemy } from './BaseEnemy';

/**
 * Forest Sprite: small glowing wisp that beelines straight at the player.
 * Emerald-Forest-themed equivalent of the classic "Fly" archetype.
 */
export class ForestSprite extends BaseEnemy {
  private readonly target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  ) {
    super(scene, x, y, ENEMIES['forest-sprite']);
    this.target = target;
  }

  protected tickAI(): void {
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
}
