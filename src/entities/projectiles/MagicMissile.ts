import Phaser from 'phaser';
import {
  DEFAULT_MISSILE_TINT,
  MISSILE_RADIUS,
  MISSILE_VELOCITY_INHERIT_FACTOR,
  TextureKeys,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { DIRECTION_VECTORS, type Direction } from '../../types';

/** Lookalike-Type für Homing-Targets — nimmt jede aktive Sprite-artige Entity
 * an, die x/y/active hat. Unterbricht den Import-Cycle gegen BaseEnemy. */
export interface HomingTarget {
  x: number;
  y: number;
  active: boolean;
}

/** Per-fire parameters resolved from the player's effective stats. */
export interface MagicMissileFireOptions {
  speed: number;
  /** Total flight time in ms before the missile auto-deactivates. */
  lifetime: number;
  /** Damage applied on enemy hit. Read by the GameScene overlap handler. */
  damage: number;
  /** Visual scale factor applied to the sprite. */
  scale: number;
  /** Tint colour (0xffffff = no tint / original sprite colour). */
  tint: number;
  /** Wie viele zusätzliche Pierces nach dem ersten Hit erlaubt sind. */
  piercing: number;
  /** Homing-Turnrate in Grad/Sekunde (0 = kein Homing). */
  homingTurnRate: number;
  /** Burn-Schadens-Anteil (0 = kein Burn). Im Overlap angewandt. */
  burnDamageFactor: number;
  /** Optional alternate texture key (Spellblade Bolt re-uses this pool
   *  with a sword-shaped sprite + direction rotation). When omitted the
   *  missile keeps the default `TextureKeys.MagicMissile` sprite. */
  textureKey?: string;
  /** When true the sprite rotates to match the flight direction (used by
   *  Spellblade Bolt so the blade points along its trajectory). The
   *  wizard's omni-directional orb leaves this off. */
  rotateToDirection?: boolean;
  /** Player body velocity at fire time. Multiplied by
   *  `MISSILE_VELOCITY_INHERIT_FACTOR` and added to the cardinal velocity
   *  so movement angles the shot. Defaults to (0, 0) when omitted —
   *  pre-2026-05-09 behaviour. */
  inheritVx?: number;
  inheritVy?: number;
  /** Override the body radius post-setScale. Used by the Spellblade Bolt
   *  to keep its hitbox at MISSILE_RADIUS even though the visual is
   *  scaled up 1.5× — without this, the bigger body extends past the
   *  player body when fired against the top/bottom wall and the bolt
   *  spawns mid-overlap with the wall (gets stuck / instantly killed).
   *  When omitted, the body stays at the auto-scaled value (= MISSILE_RADIUS
   *  × scale, the default Phaser behaviour the wizard relies on). */
  bodyRadiusOverride?: number;
}

/**
 * Player magic missile. Recycled via MagicMissilePool — never construct
 * directly from gameplay code; spawn via Pool.fire().
 */
export class MagicMissile extends Phaser.Physics.Arcade.Sprite {
  /** Damage dealt on hit. Set per fire(); read by missile↔enemy overlap. */
  damage = 0;
  /** Wie viele Pierces noch übrig sind. Decrementiert pro Hit. */
  piercingRemaining = 0;
  /** Wie viele Hits diese Missile bereits hatte. Index in PIERCING_DAMAGE_FACTORS. */
  hitCount = 0;
  /** Burn-Damage-Faktor (Anteil des Hit-Damages). 0 = kein Burn. */
  burnDamageFactor = 0;
  /** Set der bereits getroffenen Enemies. Verhindert dass eine pierce-Missile
   * denselben Gegner mehrfach pro Frame schadet (Phaser-Overlap feuert
   * jeden Frame solange die Bodies überlappen). */
  readonly hitEnemies = new Set<HomingTarget>();
  /** Setter wird vom Pool nach Konstruktion einmal gesetzt — gibt Zugriff
   * auf den nearest-enemy-Lookup für Homing. */
  homingTargetGetter: ((x: number, y: number) => HomingTarget | null) | null = null;

  private spawnedAt = 0;
  private lifetime = 0;
  private homingTurnRate = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.MagicMissile);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DepthLayers.Missile);
    this.setCircle(
      MISSILE_RADIUS,
      this.width / 2 - MISSILE_RADIUS,
      this.height / 2 - MISSILE_RADIUS,
    );
    this.deactivate();
  }

  fire(x: number, y: number, direction: Direction, opts: MagicMissileFireOptions): void {
    const v = DIRECTION_VECTORS[direction];
    this.enableBody(true, x, y, true, true);
    // Movement-angle: combine the cardinal cast-vector with a fraction of
    // the player's current body velocity so moving while firing tilts the
    // shot. Both wizard and Spellblade go through this — the inherit
    // factor is identical, the visible difference comes from the
    // cadence + size of each character's projectile.
    const finalVx =
      v.x * opts.speed + (opts.inheritVx ?? 0) * MISSILE_VELOCITY_INHERIT_FACTOR;
    const finalVy =
      v.y * opts.speed + (opts.inheritVy ?? 0) * MISSILE_VELOCITY_INHERIT_FACTOR;
    this.setVelocity(finalVx, finalVy);
    this.setScale(opts.scale);
    // Texture / rotation: pool members default to the wizard orb. When the
    // Spellblade fires we swap to the bolt sprite + rotate it along the
    // flight vector (using the FINAL velocity so the blade points along
    // its actual trajectory, not the cardinal cast direction). Reset
    // both on every fire so a recycled bolt-sprite doesn't carry over to
    // a wizard's next cast.
    this.setTexture(opts.textureKey ?? TextureKeys.MagicMissile);
    this.setRotation(opts.rotateToDirection ? Math.atan2(finalVy, finalVx) : 0);
    // Body-radius override (Spellblade Bolt path). Phaser auto-scales the
    // body with `setScale`, so to pin the *world-space* body radius at
    // MISSILE_RADIUS regardless of the visual scale, divide by the scale
    // before passing into setCircle — Phaser's auto-scale step then
    // multiplies it back out. Wizard skips this branch (omits
    // `bodyRadiusOverride`) so missileScale items keep growing the
    // hitbox normally.
    if (opts.bodyRadiusOverride !== undefined && opts.scale > 0) {
      const r = opts.bodyRadiusOverride / opts.scale;
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      this.setCircle(r, halfW - r, halfH - r);
    }
    if (opts.tint === DEFAULT_MISSILE_TINT) {
      this.clearTint();
    } else {
      this.setTint(opts.tint);
    }
    this.damage = opts.damage;
    this.lifetime = opts.lifetime;
    this.spawnedAt = this.scene.time.now;
    this.piercingRemaining = opts.piercing;
    this.hitCount = 0;
    this.burnDamageFactor = opts.burnDamageFactor;
    this.homingTurnRate = opts.homingTurnRate;
    this.hitEnemies.clear();
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (time - this.spawnedAt >= this.lifetime) {
      this.deactivate();
      return;
    }
    if (this.homingTurnRate > 0) {
      this.tickHoming(delta);
    }
  }

  /**
   * True iff the missile is still inside its spawn-grace window. Used by
   * the wall / barrier / blocker collider's processCallback to skip the
   * deactivate step on the very first frames after spawn — fixes the
   * Spellblade-bolt-stuck-in-wall bug at room edges where the bigger
   * 1.5× body overlaps the wall on spawn. After the grace expires the
   * collider works as before.
   */
  isInSpawnGrace(now: number, graceMs: number): boolean {
    return now - this.spawnedAt < graceMs;
  }

  /** Dreht die Velocity gradweise zum nächsten aktiven Enemy. Frame-by-frame
   * Cap auf turnRate verhindert Insta-Snaps und erhält das Geschoss-Gefühl
   * (Spieler kann immer noch durch Bewegung korrigieren wo es hingeht). */
  private tickHoming(delta: number): void {
    const target = this.homingTargetGetter?.(this.x, this.y) ?? null;
    if (!target || !target.active) return;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
    const desiredAngle = Math.atan2(target.y - this.y, target.x - this.x);
    const maxDelta = (this.homingTurnRate * Math.PI) / 180 * (delta / 1000);
    let diff = desiredAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = Math.max(-maxDelta, Math.min(maxDelta, diff));
    const newAngle = currentAngle + step;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    body.setVelocity(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
  }

  deactivate(): void {
    this.hitEnemies.clear();
    this.disableBody(true, true);
  }
}
