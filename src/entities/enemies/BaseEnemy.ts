import Phaser from 'phaser';
import {
  HIT_FLASH_DURATION_MS,
  HIT_FLASH_TINT_ENEMY,
  KNOCKBACK_DURATION_MS,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { type Vector2 } from '../../types';
import { EventBus } from '../../utils/EventBus';
import { type EnemyDefinition } from '../../data/enemies';

/**
 * Abstract base for enemies. Owns the universal stuff (HP, hitbox, hit
 * feedback, death event, knockback) and exposes one hook subclasses must
 * implement: `tickAI(time, delta)` for movement / behaviour each frame.
 */
export abstract class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly definition: EnemyDefinition;
  protected hp: number;
  protected knockbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition) {
    super(scene, x, y, definition.textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.definition = definition;
    this.hp = definition.hp;

    this.setDepth(DepthLayers.Enemy);
    this.setCircle(
      definition.hitboxRadius,
      this.width / 2 - definition.hitboxRadius,
      this.height / 2 - definition.hitboxRadius,
    );
    this.setCollideWorldBounds(true);
  }

  /** Called every frame from preUpdate while the enemy is active. */
  protected abstract tickAI(time: number, delta: number): void;

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active || this.hp <= 0) return;
    if (time < this.knockbackUntil) return; // knockback locks AI briefly
    this.tickAI(time, delta);
  }

  /**
   * Apply damage. Optionally pushes the enemy via `knockback` (a velocity
   * vector). Returns true if the hit killed the enemy.
   */
  takeDamage(amount: number, knockback?: Vector2): boolean {
    if (amount <= 0 || this.hp <= 0) return false;
    this.hp -= amount;
    this.flashHit();
    if (knockback) {
      this.setVelocity(knockback.x, knockback.y);
      this.knockbackUntil = this.scene.time.now + KNOCKBACK_DURATION_MS;
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private flashHit(): void {
    this.setTintFill(HIT_FLASH_TINT_ENEMY);
    this.scene.time.delayedCall(HIT_FLASH_DURATION_MS, () => {
      if (this.active) this.clearTint();
    });
  }

  /**
   * Disable the body so further overlaps don't fire, then play a brief death
   * effect (sparkle burst + scale/fade tween) before destroying. The body is
   * disabled but the sprite stays visible during the tween, so the player
   * sees the enemy "puff out" instead of popping. `countActive(true)` in
   * `GameScene.maybeMarkRoomCleared` ignores inactive members, so the
   * room-clear check still ticks immediately on kill — the tween is purely
   * visual.
   *
   * Marked `protected` so `BossEnemy` can override to additionally emit
   * `boss:killed` while reusing the same disable + tween + destroy flow.
   */
  protected die(): void {
    EventBus.emit('enemy:killed', { x: this.x, y: this.y });
    // Roll the per-enemy coin drop. Bosses set chance=0, so this is a no-op
    // for them — boss rewards go through the dedicated `boss:killed` flow.
    if (
      this.definition.coinDropChance > 0 &&
      Math.random() < this.definition.coinDropChance
    ) {
      EventBus.emit('enemy:droppedCoin', { x: this.x, y: this.y });
    }
    this.disableBody(true, false);

    // Sparkle burst — small glow particles flying outward.
    const sparkleCount = 6;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / sparkleCount;
      const dist = 28 + Math.random() * 14;
      const sparkle = this.scene.add
        .circle(this.x, this.y, 2, 0x6effa0, 1)
        .setDepth(DepthLayers.Particle);
      this.scene.tweens.add({
        targets: sparkle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: 320,
        ease: 'Sine.Out',
        onComplete: () => sparkle.destroy(),
      });
    }

    // Death puff — scale up + fade out, then destroy.
    this.scene.tweens.add({
      targets: this,
      scale: 1.4,
      alpha: 0,
      duration: 220,
      ease: 'Sine.Out',
      onComplete: () => this.destroy(),
    });
  }

  /** Contact damage this enemy deals to the player on touch. */
  getContactDamage(): number {
    return this.definition.contactDamage;
  }
}
