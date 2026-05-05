import Phaser from 'phaser';
import {
  HIT_FLASH_DURATION_MS,
  HIT_FLASH_TINT_PLAYER,
  KNOCKBACK_DURATION_MS,
  MISSILE_FIRE_INTERVAL_MS,
  MISSILE_LIFETIME_MS,
  PLAYER_HITBOX_RADIUS,
  PLAYER_INVINCIBILITY_MS,
  PLAYER_MAX_HEALTH,
  TextureKeys,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type Direction, type Vector2 } from '../types';
import { type InputManager } from '../systems/InputManager';
import { PlayerHealth } from '../systems/PlayerHealth';
import { type StatsSystem } from '../systems/StatsSystem';
import { type MagicMissilePool } from './projectiles/MagicMissilePool';

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly health: PlayerHealth;

  private readonly inputManager: InputManager;
  private readonly missilePool: MagicMissilePool;
  private readonly stats: StatsSystem;
  private nextFireAt = 0;
  private knockbackUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    input: InputManager,
    missilePool: MagicMissilePool,
    stats: StatsSystem,
  ) {
    super(scene, x, y, TextureKeys.Player);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.inputManager = input;
    this.missilePool = missilePool;
    this.stats = stats;
    this.health = new PlayerHealth(PLAYER_MAX_HEALTH, PLAYER_INVINCIBILITY_MS);

    this.setDepth(DepthLayers.Player);
    // Hitbox sits on the wizard's robe (lower body), not the texture center —
    // otherwise the player feels like he's "standing on his hat". Y offset
    // pushes the circle down ~12 px from the texture center so it covers the
    // belt + legs region of the sprite.
    const hitboxCenterY = this.height / 2 + 12;
    this.setCircle(
      PLAYER_HITBOX_RADIUS,
      this.width / 2 - PLAYER_HITBOX_RADIUS,
      hitboxCenterY - PLAYER_HITBOX_RADIUS,
    );
    this.setCollideWorldBounds(true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active || !this.health.isAlive()) return;
    this.handleMovement(time);
    this.handleShooting(time);
    this.tickInvincibilityBlink(time);
  }

  private handleMovement(time: number): void {
    if (time < this.knockbackUntil) return; // knockback locks input briefly
    const move = this.inputManager.getMovement();
    const speed = this.stats.getEffective('moveSpeed');
    this.setVelocity(move.x * speed, move.y * speed);
  }

  private handleShooting(time: number): void {
    if (time < this.nextFireAt) return;
    const dir: Direction | null = this.inputManager.getShootDirection();
    if (!dir) return;
    const fireRate = this.stats.getEffective('fireRate');
    const interval = fireRate > 0 ? MISSILE_FIRE_INTERVAL_MS / fireRate : MISSILE_FIRE_INTERVAL_MS;
    this.missilePool.fire(this.x, this.y, dir, {
      speed: this.stats.getEffective('missileSpeed'),
      lifetime: MISSILE_LIFETIME_MS * this.stats.getEffective('range'),
      damage: this.stats.getEffective('damage'),
      scale: this.stats.getEffective('missileScale'),
      tint: this.stats.getMissileTint(),
    });
    this.nextFireAt = time + interval;
  }

  /**
   * Apply damage from a contact source. Returns true if the hit landed
   * (false if absorbed by i-frames). Caller is responsible for spawning
   * scene-level feedback (screen shake) since Player can't reach the camera.
   */
  takeDamage(amount: number, knockback: Vector2 | undefined, now: number): boolean {
    const landed = this.health.takeDamage(amount, now);
    if (!landed) return false;

    if (knockback) {
      this.setVelocity(knockback.x, knockback.y);
      this.knockbackUntil = now + KNOCKBACK_DURATION_MS;
    }
    this.flashHit();
    return true;
  }

  private flashHit(): void {
    this.setTintFill(HIT_FLASH_TINT_PLAYER);
    this.scene.time.delayedCall(HIT_FLASH_DURATION_MS, () => {
      if (this.active) this.clearTint();
    });
  }

  /** Subtle alpha blink while i-frames are active (visual cue). */
  private tickInvincibilityBlink(time: number): void {
    if (this.health.isVulnerable(time)) {
      if (this.alpha !== 1) this.setAlpha(1);
      return;
    }
    // Blink at ~10 Hz between alpha 0.4 and 1.
    const phase = Math.floor(time / 100) % 2;
    this.setAlpha(phase === 0 ? 0.4 : 1);
  }
}
