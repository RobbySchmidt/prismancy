import Phaser from 'phaser';
import {
  DOPPELGANGER_ATTACK_INTERVAL_MS,
  DOPPELGANGER_BLINK_FADE_MS,
  DOPPELGANGER_ENRAGED_ATTACK_INTERVAL_MS,
  DOPPELGANGER_ENRAGED_SPEED_MULT,
  DOPPELGANGER_ENRAGE_HP_FRACTION,
  DOPPELGANGER_FILLER_INTERVAL_MS,
  DOPPELGANGER_HOMING_LIFETIME_MS,
  DOPPELGANGER_HOMING_TURN_RATE_DEG,
  DOPPELGANGER_KITE_BAND,
  DOPPELGANGER_KITE_DISTANCE,
  DOPPELGANGER_TELEGRAPH_MS,
  DOPPELGANGER_VOLLEY_COUNT,
  DOPPELGANGER_VOLLEY_SPACING_MS,
  DOPPELGANGER_VOLLEY_SPREAD_DEG,
  ENEMY_PROJECTILE_SPEED,
  ROOM_HEIGHT_TILES,
  ROOM_WIDTH_TILES,
  TILE_SIZE,
  TextureKeys,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';

type Target = Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;

/**
 * Onyx miniboss — a dark mimic of the player wizard (same sprite layout,
 * onyx-mansion recolour with glowing amethyst eyes). Behaves like a player
 * would: kites at `DOPPELGANGER_KITE_DISTANCE`, strafes inside the comfort
 * band, casts straight filler shots at the player's own cadence between
 * volleys, and periodically BLINKS to a flanking position before channeling
 * a Marquis-style volley of three sequential homing missiles (fanned by
 * ±`DOPPELGANGER_VOLLEY_SPREAD_DEG` so they converge from different
 * vectors). Below half HP it soft-enrages: shorter volley interval, faster
 * strafing — same patterns, one gear up, deliberately not a phase system.
 *
 * Replaced the Headless Knight (2026-06-12); difficulty pass same day
 * after user-flag "zu einfach" (the passive inter-volley windows were
 * free damage).
 */
export class Doppelganger extends BaseEnemy {
  private readonly target: Target;
  private readonly pool: EnemyProjectilePool;
  /** Effective HP at spawn (post floor-mult) — anchor for the enrage check. */
  private readonly startingHp: number;
  private nextAttackAt: number;
  private nextFillerAt: number;
  /** While `time < castingUntil` the mimic is channeling (blink + volley)
   * and won't move or fire fillers. */
  private castingUntil = 0;
  /** Strafe direction inside the kite band; flips on a jittered timer so
   * the orbit doesn't look mechanical. */
  private strafeDir = 1;
  private nextStrafeFlipAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Target,
    pool: EnemyProjectilePool,
  ) {
    super(scene, x, y, ENEMIES['miniboss-doppelganger']);
    this.target = target;
    this.pool = pool;
    this.startingHp = this.hp;
    this.nextAttackAt = scene.time.now + DOPPELGANGER_ATTACK_INTERVAL_MS / 2;
    this.nextFillerAt = scene.time.now + DOPPELGANGER_FILLER_INTERVAL_MS;
  }

  private isEnraged(): boolean {
    return this.hp <= this.startingHp * DOPPELGANGER_ENRAGE_HP_FRACTION;
  }

  protected tickAI(time: number): void {
    if (time < this.castingUntil) {
      // Channeling blink + volley — rooted, like a player committing to a cast.
      this.setVelocity(0, 0);
      return;
    }

    this.tickKite(time);

    // Straight filler cast at the player's own cadence — the mimic never
    // just stands there waiting for its big spell.
    if (time >= this.nextFillerAt) {
      this.nextFillerAt = time + DOPPELGANGER_FILLER_INTERVAL_MS;
      this.fireStraightShot();
    }

    if (time >= this.nextAttackAt) {
      this.beginVolley(time);
    }
  }

  /** Player-style movement: approach when far, retreat when crowded,
   * strafe sideways inside the comfort band. Enrage speeds it all up. */
  private tickKite(time: number): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const speed =
      this.definition.moveSpeed * (this.isEnraged() ? DOPPELGANGER_ENRAGED_SPEED_MULT : 1);

    if (time >= this.nextStrafeFlipAt) {
      this.strafeDir *= -1;
      this.nextStrafeFlipAt = time + 1800 + Math.random() * 1200;
    }

    let vx: number;
    let vy: number;
    if (d > DOPPELGANGER_KITE_DISTANCE + DOPPELGANGER_KITE_BAND) {
      vx = nx * speed;
      vy = ny * speed;
    } else if (d < DOPPELGANGER_KITE_DISTANCE - DOPPELGANGER_KITE_BAND) {
      vx = -nx * speed;
      vy = -ny * speed;
    } else {
      // Inside the band: pure perpendicular strafe around the player.
      vx = -ny * speed * this.strafeDir;
      vy = nx * speed * this.strafeDir;
    }
    this.setVelocity(vx, vy);
  }

  /**
   * Blink to a flanking position (fade-out → reposition → fade-in), then
   * telegraph and fire the three homing missiles sequentially with a small
   * angular fan. Channel lock covers the entire sequence.
   */
  private beginVolley(time: number): void {
    const interval = this.isEnraged()
      ? DOPPELGANGER_ENRAGED_ATTACK_INTERVAL_MS
      : DOPPELGANGER_ATTACK_INTERVAL_MS;
    const blinkTotal = DOPPELGANGER_BLINK_FADE_MS * 2;
    this.nextAttackAt = time + interval;
    this.castingUntil =
      time +
      blinkTotal +
      DOPPELGANGER_TELEGRAPH_MS +
      (DOPPELGANGER_VOLLEY_COUNT - 1) * DOPPELGANGER_VOLLEY_SPACING_MS +
      200;
    this.setVelocity(0, 0);

    // Phase 1: fade out, snap to the flank, fade back in.
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: DOPPELGANGER_BLINK_FADE_MS,
      ease: 'Sine.In',
      onComplete: () => {
        // Deferred-callback guard (Bloomheart-freeze pattern) — the mimic
        // can die mid-blink.
        if (!this.active || !this.scene) return;
        const spot = this.pickBlinkSpot();
        this.setPosition(spot.x, spot.y);
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          duration: DOPPELGANGER_BLINK_FADE_MS,
          ease: 'Sine.Out',
          onComplete: () => {
            if (!this.active || !this.scene) return;
            this.beginTelegraphAndFire();
          },
        });
      },
    });
  }

  /** Flanking blink target: the player→mimic vector rotated by a random
   * ±(70..110)°, re-anchored at kite distance from the player, clamped
   * into the playable area. */
  private pickBlinkSpot(): { x: number; y: number } {
    const baseAngle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const rotation = Phaser.Math.DegToRad(70 + Math.random() * 40) * sign;
    const angle = baseAngle + rotation;
    const margin = TILE_SIZE * 1.5;
    const x = Phaser.Math.Clamp(
      this.target.x + Math.cos(angle) * DOPPELGANGER_KITE_DISTANCE,
      margin,
      ROOM_WIDTH_TILES * TILE_SIZE - margin,
    );
    const y = Phaser.Math.Clamp(
      this.target.y + Math.sin(angle) * DOPPELGANGER_KITE_DISTANCE,
      margin,
      ROOM_HEIGHT_TILES * TILE_SIZE - margin,
    );
    return { x, y };
  }

  private beginTelegraphAndFire(): void {
    EventBus.emit('enemy:charge');
    this.setTint(0xc864ff);
    for (let i = 0; i < DOPPELGANGER_VOLLEY_COUNT; i++) {
      this.scene.time.delayedCall(
        DOPPELGANGER_TELEGRAPH_MS + i * DOPPELGANGER_VOLLEY_SPACING_MS,
        () => {
          if (!this.active || !this.scene) return;
          if (i === 0) this.clearTint();
          // Fan the volley: -spread / 0 / +spread initial vectors so the
          // missiles converge from different directions.
          const spreadIndex = i - (DOPPELGANGER_VOLLEY_COUNT - 1) / 2;
          this.fireHomingMissile(
            Phaser.Math.DegToRad(DOPPELGANGER_VOLLEY_SPREAD_DEG) * spreadIndex,
          );
        },
      );
    }
  }

  /** Single straight aimed shot — the mimic's "normal cast". */
  private fireStraightShot(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const aim = Math.atan2(this.target.y - body.center.y, this.target.x - body.center.x);
    this.pool.fire(
      body.center.x,
      body.center.y,
      Math.cos(aim) * ENEMY_PROJECTILE_SPEED,
      Math.sin(aim) * ENEMY_PROJECTILE_SPEED,
      TextureKeys.MansionMissile,
    );
  }

  private fireHomingMissile(angleOffset: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const aim =
      Math.atan2(this.target.y - body.center.y, this.target.x - body.center.x) + angleOffset;
    const shot = this.pool.fire(
      body.center.x,
      body.center.y,
      Math.cos(aim) * ENEMY_PROJECTILE_SPEED,
      Math.sin(aim) * ENEMY_PROJECTILE_SPEED,
      TextureKeys.MansionMissile,
    );
    if (shot) {
      shot.setLifetime(DOPPELGANGER_HOMING_LIFETIME_MS);
      shot.setHoming(this.target, Phaser.Math.DegToRad(DOPPELGANGER_HOMING_TURN_RATE_DEG));
    }
  }
}
