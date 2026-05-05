import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  VINE_LORD_FAN_SPREAD_RAD,
  VINE_LORD_FIRE_INITIAL_DELAY_MS,
  VINE_LORD_PHASE1_INTERVAL_MS,
  VINE_LORD_PHASE2_ADD_INTERVAL_MS,
  VINE_LORD_PHASE2_MAX_ADDS,
  VINE_LORD_PHASE2_WAVE_INTERVAL_MS,
  VINE_LORD_PHASE_FLASH_MS,
  VINE_LORD_VISUAL_SCALE,
} from '../../config/GameConfig';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Adapter so VineLord can request adds + access the player without grabbing
 * GameScene directly. Implemented by GameScene at construction time.
 */
export interface VineLordHost {
  enemyProjectilePool: EnemyProjectilePool;
  /**
   * Spawn an enemy of `id` at world `(x, y)`. Returns the enemy or `null`
   * if the host refused (e.g. the active room changed underneath us).
   */
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  /** World-space (x, y) bounds the host can spawn an add inside. */
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Vine Lord — Emerald Forest boss. A scaled-up Vine Sprout that's rooted to
 * the room center. Phase 1: 3-thorn fan aimed at the player. Phase 2 (≤ 50%
 * HP): radial 8-thorn wave + summons up to 3 vine-sprout adds to harass the
 * player.
 */
export class VineLord extends BossEnemy {
  override readonly displayName = 'Vine Lord';
  // Sourced from the data definition so HP balancing lives in `data/enemies.ts`.
  override readonly maxHp = ENEMIES['boss-vine-lord'].hp;
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: VineLordHost;
  /** Earliest scene-time (ms) at which the next phase-1 fan may fire. */
  private nextFanAt: number;
  /** Earliest scene-time (ms) at which the next phase-2 wave may fire. */
  private nextWaveAt = 0;
  /** Earliest scene-time (ms) at which the next phase-2 add may spawn. */
  private nextAddAt = 0;
  /** Live phase-2 adds the boss has summoned (filtered to active each tick). */
  private adds: BaseEnemy[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, host: VineLordHost) {
    super(scene, x, y, ENEMIES['boss-vine-lord']);
    this.host = host;
    this.nextFanAt = scene.time.now + VINE_LORD_FIRE_INITIAL_DELAY_MS;

    // Stationary like a vanilla Vine Sprout, but contact-damageable: setting
    // the body immovable + moves=false stops knockback from sliding the boss
    // around without disabling overlap callbacks (player still takes contact
    // damage if they walk into the hitbox).
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    // Visual scale: 2.5× to read as a beefier sibling of the Vine Sprout. The
    // Arcade body radius set by BaseEnemy is in source-pixel units; Phaser
    // scales the body together with the sprite, so the resulting hitbox
    // already grows with the visual without an explicit re-`setCircle` here.
    this.setScale(VINE_LORD_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (this.currentPhase === 1) {
      this.tickPhase1(time);
    } else {
      this.tickPhase2(time);
    }
  }

  private tickPhase1(time: number): void {
    if (time < this.nextFanAt) return;
    const player = this.host.getPlayer();
    if (!player.active) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const nx = dx / len;
    const ny = dy / len;
    const baseAngle = Math.atan2(ny, nx);
    // Centre + ±15° fan.
    for (const offset of [-VINE_LORD_FAN_SPREAD_RAD, 0, VINE_LORD_FAN_SPREAD_RAD]) {
      const a = baseAngle + offset;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
    this.nextFanAt = time + VINE_LORD_PHASE1_INTERVAL_MS;
  }

  private tickPhase2(time: number): void {
    // Radial 8-thorn wave: full circle, evenly spaced.
    if (time >= this.nextWaveAt) {
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        this.host.enemyProjectilePool.fire(
          this.x,
          this.y,
          Math.cos(a) * ENEMY_PROJECTILE_SPEED,
          Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        );
      }
      this.nextWaveAt = time + VINE_LORD_PHASE2_WAVE_INTERVAL_MS;
    }

    // Vine-sprout adds — clamped to MAX_ADDS alive at once. We filter by
    // `active` each tick so destroyed/killed adds free up a slot for new ones.
    if (time >= this.nextAddAt) {
      this.adds = this.adds.filter((a) => a.active);
      if (this.adds.length < VINE_LORD_PHASE2_MAX_ADDS) {
        const bounds = this.host.getRoomBounds();
        // Pick a spawn near the room edge so adds visibly summon "out of the
        // room" rather than appearing on top of the player.
        const edgeMargin = 0.15;
        const onLeftEdge = Math.random() < 0.5;
        const onTopEdge = Math.random() < 0.5;
        const spanX = bounds.maxX - bounds.minX;
        const spanY = bounds.maxY - bounds.minY;
        const x = onLeftEdge
          ? bounds.minX + spanX * (Math.random() * edgeMargin)
          : bounds.maxX - spanX * (Math.random() * edgeMargin);
        const y = onTopEdge
          ? bounds.minY + spanY * (Math.random() * edgeMargin)
          : bounds.maxY - spanY * (Math.random() * edgeMargin);
        const add = this.host.spawnEnemyAt('vine-sprout', x, y);
        if (add) this.adds.push(add);
      }
      this.nextAddAt = time + VINE_LORD_PHASE2_ADD_INTERVAL_MS;
    }
  }

  /**
   * Phase-change feedback: a brief light-green tint flash + reset the phase 2
   * cooldowns so the wave fires shortly after the transition (instead of
   * waiting a full interval).
   */
  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    // Light-green flash to read as "the boss is angry now".
    this.setTintFill(0x9effb0);
    this.scene.time.delayedCall(VINE_LORD_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    // Light camera-shake punctuation. Scoped to the active scene's camera.
    this.scene.cameras.main.shake(180, 0.005);
    // First wave fires ~400 ms after the transition; first add ~1.2 s after
    // (so the player has a beat to reposition).
    const now = this.scene.time.now;
    this.nextWaveAt = now + 400;
    this.nextAddAt = now + 1200;
  }
}
