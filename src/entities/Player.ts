import Phaser from 'phaser';
import {
  HIT_FLASH_DURATION_MS,
  HIT_FLASH_TINT_PLAYER,
  KNOCKBACK_DURATION_MS,
  MISSILE_FIRE_INTERVAL_MS,
  MISSILE_LIFETIME_MS,
  PLAYER_HITBOX_OFFSET_Y,
  PLAYER_HITBOX_RADIUS,
  PLAYER_INVINCIBILITY_MS,
  PLAYER_MAX_HEALTH,
  TextureKeys,
  WORLD_SPRITE_SCALE,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type Direction, type Vector2 } from '../types';
import { type InputManager } from '../systems/InputManager';
import { MetaProgress } from '../systems/MetaProgress';
import { PlayerHealth } from '../systems/PlayerHealth';
import { getSfxSynth } from '../systems/SfxSynth';
import { type StatsSystem } from '../systems/StatsSystem';
import { type MagicMissilePool } from './projectiles/MagicMissilePool';

/**
 * Resolve the texture key for the player based on the persisted character
 * + skin selection. Defaults: wizard / default = TextureKeys.Player.
 *   wizard + prismancy    → TextureKeys.PlayerPrismancy
 *   spellblade + default  → TextureKeys.PlayerSpellblade
 *   spellblade + prismancy→ TextureKeys.PlayerSpellbladePrismarch (gated
 *                            on a Prismarch kill *as Spellblade*; falls
 *                            back to default if not earned)
 *
 * Lives at module scope so the MainMenu's preview render can call the
 * exact same resolver without duplicating the lookup table. Both call
 * sites are read-only of MetaProgress.
 */
export function resolvePlayerTextureKey(): string {
  const character = MetaProgress.getSelectedCharacter();
  // Skin resolution is character-aware — `getSelectedSkin(char)` checks
  // the per-character gate (Wizard Prismancy on any Prismarch kill,
  // Spellblade Prismancy on a Prismarch kill *as Spellblade*).
  const skin = MetaProgress.getSelectedSkin(character);
  if (character === 'spellblade') {
    return skin === 'prismancy'
      ? TextureKeys.PlayerSpellbladePrismarch
      : TextureKeys.PlayerSpellblade;
  }
  return skin === 'prismancy' ? TextureKeys.PlayerPrismancy : TextureKeys.Player;
}

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
    // Character + cosmetic skin lookup is one localStorage read at
    // construction. PreloadScene generates all variants up front (default
    // wizard, prismancy wizard, spellblade) so the swap is just a key
    // change with no runtime regeneration cost. Players cycle in the main
    // menu via left/right arrows; `resolvePlayerTextureKey` mirrors the
    // exact same resolution logic the MainMenu preview uses.
    super(scene, x, y, resolvePlayerTextureKey());
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.inputManager = input;
    this.missilePool = missilePool;
    this.stats = stats;
    this.health = new PlayerHealth(PLAYER_MAX_HEALTH, PLAYER_INVINCIBILITY_MS);

    this.setDepth(DepthLayers.Player);
    this.setScale(WORLD_SPRITE_SCALE);
    // Hitbox sits on the wizard's robe (lower body), not the texture center —
    // otherwise the player feels like he's "standing on his hat". Y offset
    // pushes the circle down ~12 px from the texture center so it covers the
    // belt + legs region of the sprite.
    //
    // Phaser scales the physics body by `gameObject.scale` automatically. We
    // want the body to stay at its authored *world* size (so collision +
    // door-trigger overlap behaves identically regardless of WORLD_SPRITE_SCALE),
    // so divide both radius and offsets by the scale before passing them in —
    // they'll then come out at the original world dimensions after Phaser's
    // auto-scale step.
    const invScale = 1 / WORLD_SPRITE_SCALE;
    const radius = PLAYER_HITBOX_RADIUS * invScale;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.setCircle(
      radius,
      halfW - radius,
      halfH + PLAYER_HITBOX_OFFSET_Y * invScale - radius,
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
    // Spawn from the body's world centre, not the texture origin. The hitbox
    // sits +12 px below the texture centre (so the robe is the hitbox, not the
    // hat) — when the player presses up against the top wall, the texture
    // origin ends up *inside* the wall body, which would spawn the missile
    // overlapping the wall and instantly deactivate it. Body centre is always
    // inside the playable area because that's what the wall collider stops.
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.missilePool.fire(body.center.x, body.center.y, dir, {
      speed: this.stats.getEffective('missileSpeed'),
      lifetime: MISSILE_LIFETIME_MS,
      damage: this.stats.getEffective('damage'),
      scale: this.stats.getEffective('missileScale'),
      tint: this.stats.getMissileTint(),
      piercing: this.stats.getEffective('piercingCount'),
      homingTurnRate: this.stats.getEffective('homingTurnRate'),
      burnDamageFactor: this.stats.getEffective('burnDamageFactor'),
    });
    this.nextFireAt = time + interval;
    this.spawnWandSparkle();
    getSfxSynth().playPlayerCast();
  }

  /**
   * Brief gold flash at the wand tip when the player casts. Position is
   * sprite-relative (the wand is drawn in the texture at grid 19,14 with PX
   * 2 and a centered 24×26 grid in a 64-px texture, so the tip sits ~+15 px
   * right and ~+3 px down from the sprite centre). Fades + shrinks over
   * ~150 ms; cheap and self-cleaning.
   */
  private spawnWandSparkle(): void {
    const sparkle = this.scene.add.circle(this.x + 15, this.y + 3, 3.5, 0xfff8c0, 1);
    sparkle.setDepth(DepthLayers.Player + 1);
    this.scene.tweens.add({
      targets: sparkle,
      alpha: 0,
      scale: 0.3,
      duration: 150,
      ease: 'Sine.Out',
      onComplete: () => sparkle.destroy(),
    });
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
    // Skip the blink during room-entry grace i-frames — the alpha pulse
    // looks identical to the post-hit blink and reads as "I just took
    // damage" when the player walks into a new room. User-flagged
    // 2026-05-08. The grace window is short (700 ms) and silent enemy
    // contact is enough cue that the player knows they're protected.
    if (this.health.getInvincibilitySource(time) === 'grace') {
      if (this.alpha !== 1) this.setAlpha(1);
      return;
    }
    // Blink at ~10 Hz between alpha 0.4 and 1.
    const phase = Math.floor(time / 100) % 2;
    this.setAlpha(phase === 0 ? 0.4 : 1);
  }
}
