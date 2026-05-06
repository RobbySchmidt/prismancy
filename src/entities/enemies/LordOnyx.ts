import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  LORD_ONYX_HOMING_TURN_RATE_DEG,
  LORD_ONYX_P1_MISSILE_INITIAL_DELAY_MS,
  LORD_ONYX_P1_MISSILE_INTERVAL_MS,
  LORD_ONYX_P1_RADIAL_INTERVAL_MS,
  LORD_ONYX_P1_RADIAL_THORN_COUNT,
  LORD_ONYX_P2_ADD_COUNT,
  LORD_ONYX_P2_CROSS_INTERVAL_MS,
  LORD_ONYX_P2_MISSILE_INTERVAL_MS,
  LORD_ONYX_P2_RADIAL_INTERVAL_MS,
  LORD_ONYX_P3_ARM_COUNT,
  LORD_ONYX_P3_FIRE_INTERVAL_MS,
  LORD_ONYX_P3_MISSILE_INTERVAL_MS,
  LORD_ONYX_P3_SKIPPED_ARMS,
  LORD_ONYX_P3_SPIN_RATE_DEG_PER_SEC,
  LORD_ONYX_PHASE_FLASH_MS,
  LORD_ONYX_PROJECTILE_LIFETIME_MS,
  LORD_ONYX_VISUAL_SCALE,
  TextureKeys,
} from '../../config/GameConfig';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Host adapter for Lord Onyx — needs the player (homing target),
 * projectile pool, and `spawnEnemyAt` for Phase 2 Wraith adds.
 */
export interface LordOnyxHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Lord Onyx — secret endboss, rooted at the seal. Three phases:
 *
 * Phase 1 (HP > 66 %) — single homing missile every ~1.8 s + 8-thorn
 * radial wave every 4 s. Slow turn rate (60 °/s) so a moving player can
 * outmaneuver the missile.
 *
 * Phase 2 (33 % < HP ≤ 66 %) — on entry: spawn 2 Wraith adds + camera
 * shake. Cadence tightens (missile 1.3 s, radial 3 s) and a 4-thorn
 * spinning cross fires every 2 s.
 *
 * Phase 3 (HP ≤ 33 %) — on entry: room flash + heavy shake. Continuous
 * spinning stream (8 arms, 1 always skipped → 90° dodge gap rotates with
 * the spin) plus aimed homing every 2.4 s on top — gap-riding alone
 * isn't enough.
 */
export class LordOnyx extends BossEnemy {
  override readonly displayName = 'Lord Onyx';
  override readonly maxHp = ENEMIES['boss-lord-onyx'].hp;
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 2 / 3, phaseIndex: 2 },
    { hpThresholdFraction: 1 / 3, phaseIndex: 3 },
  ];

  private readonly host: LordOnyxHost;
  /** Per-phase next-fire timestamps. */
  private nextMissileAt: number;
  private nextRadialAt = 0;
  private nextCrossAt = 0;
  /** Phase 3 spin state. */
  private spinAngle = 0;
  private nextStreamFireAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: LordOnyxHost) {
    super(scene, x, y, ENEMIES['boss-lord-onyx']);
    this.host = host;
    this.setScale(LORD_ONYX_VISUAL_SCALE);

    // Rooted — physics doesn't move or push him.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    const now = scene.time.now;
    this.nextMissileAt = now + LORD_ONYX_P1_MISSILE_INITIAL_DELAY_MS;
    this.nextRadialAt = now + LORD_ONYX_P1_RADIAL_INTERVAL_MS;
  }

  protected tickAI(time: number, delta: number): void {
    const player = this.host.getPlayer();
    if (!player.active) return;

    if (this.currentPhase === 3) {
      this.tickPhase3(time, delta, player);
      return;
    }

    // Phases 1 + 2 share the homing-missile + radial-wave structure with
    // different intervals; phase 2 also has the spinning cross attack.
    const missileInterval =
      this.currentPhase === 2
        ? LORD_ONYX_P2_MISSILE_INTERVAL_MS
        : LORD_ONYX_P1_MISSILE_INTERVAL_MS;
    const radialInterval =
      this.currentPhase === 2
        ? LORD_ONYX_P2_RADIAL_INTERVAL_MS
        : LORD_ONYX_P1_RADIAL_INTERVAL_MS;

    if (time >= this.nextMissileAt) {
      this.fireHomingMissile(player);
      this.nextMissileAt = time + missileInterval;
    }
    if (time >= this.nextRadialAt) {
      this.fireRadialWave(LORD_ONYX_P1_RADIAL_THORN_COUNT);
      this.nextRadialAt = time + radialInterval;
    }
    if (this.currentPhase === 2 && time >= this.nextCrossAt) {
      this.fireSpinningCross(time);
      this.nextCrossAt = time + LORD_ONYX_P2_CROSS_INTERVAL_MS;
    }
  }

  // --- Attacks -------------------------------------------------------------

  private fireHomingMissile(player: Player): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const vx = (dx / len) * ENEMY_PROJECTILE_SPEED;
    const vy = (dy / len) * ENEMY_PROJECTILE_SPEED;
    const shot = this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      vx,
      vy,
      TextureKeys.MansionMissile,
    );
    if (shot) {
      shot.setLifetime(LORD_ONYX_PROJECTILE_LIFETIME_MS);
      shot.setHoming(player, Phaser.Math.DegToRad(LORD_ONYX_HOMING_TURN_RATE_DEG));
    }
  }

  private fireRadialWave(count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.MansionMissile,
      );
    }
  }

  /** Phase 2 — 4-thorn cross at a slowly-rotating offset (every cross
   * advances ~25° so the cross orientation drifts, not predictable
   * cardinal-only). */
  private fireSpinningCross(time: number): void {
    // Use scene-time as the rotation seed so successive crosses don't
    // overlap in the same orientation.
    const baseAngle = ((time / 1000) * 25 * Math.PI) / 180;
    const arms = 4;
    for (let i = 0; i < arms; i++) {
      const a = baseAngle + (i / arms) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        TextureKeys.BloodProjectile,
      );
    }
  }

  // --- Phase 3 (Berserker) ------------------------------------------------

  private tickPhase3(time: number, delta: number, player: Player): void {
    // Continuous spinning stream — same gap-skipping pattern as the
    // Marquis berserker but with the Mansion Missile texture.
    const spinRateRad =
      (LORD_ONYX_P3_SPIN_RATE_DEG_PER_SEC * Math.PI) / 180;
    this.spinAngle += spinRateRad * (delta / 1000);

    if (time >= this.nextStreamFireAt) {
      const arms = LORD_ONYX_P3_ARM_COUNT;
      const skip = LORD_ONYX_P3_SKIPPED_ARMS;
      for (let i = skip; i < arms; i++) {
        const a = this.spinAngle + (i / arms) * Math.PI * 2;
        this.host.enemyProjectilePool.fire(
          this.x,
          this.y,
          Math.cos(a) * ENEMY_PROJECTILE_SPEED,
          Math.sin(a) * ENEMY_PROJECTILE_SPEED,
          TextureKeys.MansionMissile,
        );
      }
      this.nextStreamFireAt = time + LORD_ONYX_P3_FIRE_INTERVAL_MS;
    }

    // Aimed homing on top — standing in the gap forever isn't enough.
    if (time >= this.nextMissileAt) {
      this.fireHomingMissile(player);
      this.nextMissileAt = time + LORD_ONYX_P3_MISSILE_INTERVAL_MS;
    }
  }

  // --- Phase transitions --------------------------------------------------

  protected onPhaseChanged(newPhase: number): void {
    const now = this.scene.time.now;
    if (newPhase === 2) {
      this.flashPhaseTransition(0xff80a0);
      this.scene.cameras.main.shake(220, 0.006);
      // Spawn 2 Wraith adds at the room corners — keep the player honest
      // about positioning while Lord Onyx ramps up his attack rhythm.
      this.spawnPhase2Adds();
      // Reset the cadence to start the new pattern promptly.
      this.nextMissileAt = now + 600;
      this.nextRadialAt = now + 1200;
      this.nextCrossAt = now + 1800;
      return;
    }
    if (newPhase === 3) {
      this.flashPhaseTransition(0xffd040);
      this.scene.cameras.main.flash(220, 200, 60, 80, false);
      this.scene.cameras.main.shake(360, 0.012);
      // Reset the spin + first homing so the berserker pattern kicks in
      // immediately rather than on the previous cycle's leftover timer.
      this.spinAngle = 0;
      this.nextStreamFireAt = now + 200;
      this.nextMissileAt = now + 800;
    }
  }

  private spawnPhase2Adds(): void {
    const bounds = this.host.getRoomBounds();
    const margin = 64;
    const corners = [
      { x: bounds.minX + margin, y: bounds.minY + margin },
      { x: bounds.maxX - margin, y: bounds.minY + margin },
      { x: bounds.minX + margin, y: bounds.maxY - margin },
      { x: bounds.maxX - margin, y: bounds.maxY - margin },
    ];
    // Pick the first N corners (deterministic — adds always come from the
    // same spots, so the player learns the timing).
    for (let i = 0; i < LORD_ONYX_P2_ADD_COUNT && i < corners.length; i++) {
      const c = corners[i]!;
      this.host.spawnEnemyAt('wraith', c.x, c.y);
    }
  }

  private flashPhaseTransition(color: number): void {
    this.setTintFill(color);
    this.scene.time.delayedCall(LORD_ONYX_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
  }
}
