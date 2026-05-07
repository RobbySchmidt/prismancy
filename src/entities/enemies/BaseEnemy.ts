import Phaser from 'phaser';
import {
  BURN_TICK_INTERVAL_MS,
  BURN_TINT,
  HIT_FLASH_DURATION_MS,
  HIT_FLASH_TINT_ENEMY,
  KNOCKBACK_DURATION_MS,
  WORLD_SPRITE_SCALE,
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
    // Per-floor mob HP scaling — Sapphire ×1.5, Onyx ×2.0 (see floors.ts).
    // BossEnemy and VampireBody overwrite this with their own DPS-ratio
    // scaling in their constructor bodies, so this only really hits mobs.
    const mobHpMult =
      (scene.registry.get('enemyHpMultiplier') as number | undefined) ?? 1.0;
    this.hp = Math.max(1, Math.round(definition.hp * mobHpMult));

    this.setDepth(DepthLayers.Enemy);
    this.setScale(WORLD_SPRITE_SCALE);
    // Counter-scale the physics body so its world size + position stay at
    // the authored values regardless of the visual scale. (Phaser scales
    // the body by sprite.scale automatically; without this division the
    // body grows + shifts and breaks fine collisions like door triggers.)
    const radius = definition.hitboxRadius / WORLD_SPRITE_SCALE;
    this.setCircle(
      radius,
      this.width / 2 - radius,
      this.height / 2 - radius,
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
    // Cancel any in-flight burn ticks so they don't fire after the death
    // tween destroys the sprite (active stays true for ~220 ms during the
    // tween — without this clearBurn the tick callback could re-enter
    // die() and double-emit `enemy:killed`).
    this.clearBurn();
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

  // --- Burn DoT (Fire Orb item) ---------------------------------------------

  private burnTimers: Phaser.Time.TimerEvent[] = [];

  /**
   * Apply a Burn-DoT: `tickCount` damage ticks of `damagePerTick` each,
   * `BURN_TICK_INTERVAL_MS` apart. Re-applying burn cancels any prior burn
   * (latest-wins) so multi-pierce hits stack predictably without
   * compounding into a runaway DoT. Each tick orange-flashes the sprite +
   * emits `enemy:burnTick` so GameScene can spawn a flame particle. Burn
   * ticks intentionally don't knock back — adding force per tick would
   * lock enemy AI for the entire DoT and make burnt mobs drift around.
   */
  applyBurn(damagePerTick: number, tickCount: number): void {
    if (!this.active || damagePerTick <= 0 || tickCount <= 0) return;
    this.clearBurn();
    for (let i = 0; i < tickCount; i++) {
      const ev = this.scene.time.delayedCall(BURN_TICK_INTERVAL_MS * (i + 1), () => {
        if (!this.active || this.hp <= 0) return;
        this.hp -= damagePerTick;
        this.setTintFill(BURN_TINT);
        this.scene.time.delayedCall(140, () => {
          if (this.active) this.clearTint();
        });
        EventBus.emit('enemy:burnTick', { x: this.x, y: this.y });
        if (this.hp <= 0) {
          this.clearBurn();
          this.die();
        }
      });
      this.burnTimers.push(ev);
    }
  }

  protected clearBurn(): void {
    for (const t of this.burnTimers) t.remove(false);
    this.burnTimers = [];
  }
}
