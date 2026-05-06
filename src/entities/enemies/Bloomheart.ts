import Phaser from 'phaser';
import {
  BLOOMHEART_FAN_SPREAD_RAD,
  BLOOMHEART_INITIAL_DELAY_MS,
  BLOOMHEART_PHASE1_FAN_INTERVAL_MS,
  BLOOMHEART_PHASE1_TELEGRAPH_MS,
  BLOOMHEART_PHASE2_FAN_INTERVAL_MS,
  BLOOMHEART_PHASE2_SPORE_INTERVAL_MS,
  BLOOMHEART_PHASE_FLASH_MS,
  BLOOMHEART_SPORE_BURST_COUNT,
  BLOOMHEART_SPORE_LIFETIME_MS,
  BLOOMHEART_SPORE_SPEED,
  BLOOMHEART_VISUAL_SCALE,
  ENEMY_PROJECTILE_SPEED,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface BloomheartHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Bloomheart — Sapphire Swamp boss based on Snapper Bloom. Rooted carnivore
 * plant. Phase 1: a slow 5-thorn wide fan (±30°) every 1.6 s with a brief
 * mouth-open telegraph. Phase 2 (≤ 50 % HP): faster fan + a "spore" projectile
 * that drifts toward the player and bursts into 6 mini-thorns after a delay.
 *
 * The spore is a custom non-pooled visual sprite that the boss tracks; on
 * lifetime expiry it fires real EnemyProjectiles radially from the burst
 * position (so they damage on contact like any other enemy thorn).
 *
 * Phase-2 trash-mob adds (Snapper Bloom spawns) were removed in the
 * Floor-HP-Scaling pass — under the new mob multiplier the adds were
 * piling up while the player tried to dodge fan + spore, and the user
 * flagged it as "must go". The faster fan + spore alone is enough to
 * differentiate Phase 2.
 */
export class Bloomheart extends BossEnemy {
  override readonly displayName = 'Bloomheart';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: BloomheartHost;
  private nextFanAt: number;
  private telegraphScheduled = false;
  private nextSporeAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: BloomheartHost) {
    super(scene, x, y, ENEMIES['boss-bloomheart']);
    this.host = host;
    this.nextFanAt = scene.time.now + BLOOMHEART_INITIAL_DELAY_MS;
    this.setScale(BLOOMHEART_VISUAL_SCALE);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
  }

  protected tickAI(time: number): void {
    this.tickFan(time);
    if (this.currentPhase >= 2) {
      this.tickSpore(time);
    }
  }

  // --- Fan attack (both phases) ----------------------------------------------

  private tickFan(time: number): void {
    if (!this.telegraphScheduled && time >= this.nextFanAt - BLOOMHEART_PHASE1_TELEGRAPH_MS) {
      this.telegraphScheduled = true;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: BLOOMHEART_VISUAL_SCALE * 1.18,
        scaleY: BLOOMHEART_VISUAL_SCALE * 1.18,
        duration: BLOOMHEART_PHASE1_TELEGRAPH_MS,
        ease: 'Sine.Out',
      });
    }
    if (time < this.nextFanAt) return;

    const player = this.host.getPlayer();
    if (player.active) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const baseAngle = Math.atan2(dy, dx);
      // 5-thorn fan: centre + ±15° + ±30°.
      const offsets = [
        -BLOOMHEART_FAN_SPREAD_RAD,
        -BLOOMHEART_FAN_SPREAD_RAD / 2,
        0,
        BLOOMHEART_FAN_SPREAD_RAD / 2,
        BLOOMHEART_FAN_SPREAD_RAD,
      ];
      for (const off of offsets) {
        const a = baseAngle + off;
        this.host.enemyProjectilePool.fire(
          this.x,
          this.y,
          Math.cos(a) * ENEMY_PROJECTILE_SPEED,
          Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        );
      }
    }

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: BLOOMHEART_VISUAL_SCALE,
      scaleY: BLOOMHEART_VISUAL_SCALE,
      duration: 140,
      ease: 'Sine.In',
    });
    this.telegraphScheduled = false;
    const interval =
      this.currentPhase >= 2
        ? BLOOMHEART_PHASE2_FAN_INTERVAL_MS
        : BLOOMHEART_PHASE1_FAN_INTERVAL_MS;
    this.nextFanAt = time + interval;
  }

  // --- Phase 2 spore ---------------------------------------------------------

  private tickSpore(time: number): void {
    if (time < this.nextSporeAt) return;
    this.nextSporeAt = time + BLOOMHEART_PHASE2_SPORE_INTERVAL_MS;

    const player = this.host.getPlayer();
    if (!player.active) return;

    // Spore = small purple-glow circle that drifts toward the player. After
    // BLOOMHEART_SPORE_LIFETIME_MS we burst it into a 6-thorn radial via the
    // standard projectile pool (so the damage path matches every other enemy
    // shot). The spore visual itself is non-damaging — the burst is the threat.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy);
    const dirX = len > 0.01 ? dx / len : 1;
    const dirY = len > 0.01 ? dy / len : 0;
    const startX = this.x;
    const startY = this.y;

    const spore = this.scene.add.circle(startX, startY, 6, 0xb070ff, 1).setDepth(DepthLayers.Particle);
    const halo = this.scene.add
      .circle(startX, startY, 10, 0xb070ff, 0.35)
      .setDepth(DepthLayers.Particle);

    // Drift toward the player at SPORE_SPEED for SPORE_LIFETIME_MS.
    const distance = (BLOOMHEART_SPORE_SPEED * BLOOMHEART_SPORE_LIFETIME_MS) / 1000;
    const targetX = startX + dirX * distance;
    const targetY = startY + dirY * distance;
    this.scene.tweens.add({
      targets: [spore, halo],
      x: targetX,
      y: targetY,
      duration: BLOOMHEART_SPORE_LIFETIME_MS,
      ease: 'Sine.Out',
      onComplete: () => {
        // Mini-thorn radial burst from the spore's final position.
        const count = BLOOMHEART_SPORE_BURST_COUNT;
        const baseOffset = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          const a = baseOffset + (i / count) * Math.PI * 2;
          this.host.enemyProjectilePool.fire(
            spore.x,
            spore.y,
            Math.cos(a) * ENEMY_PROJECTILE_SPEED,
            Math.sin(a) * ENEMY_PROJECTILE_SPEED,
          );
        }
        // Pop visual: brief expanding ring before destroying the spore + halo.
        const ring = this.scene.add
          .circle(spore.x, spore.y, 4, 0xffffff, 0)
          .setStrokeStyle(2, 0xb070ff, 1)
          .setDepth(DepthLayers.Particle);
        this.scene.tweens.add({
          targets: ring,
          radius: 24,
          alpha: 0,
          duration: 220,
          ease: 'Sine.Out',
          onComplete: () => ring.destroy(),
        });
        spore.destroy();
        halo.destroy();
      },
    });
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setScale(BLOOMHEART_VISUAL_SCALE);
    this.setTintFill(0xff66cc);
    this.scene.time.delayedCall(BLOOMHEART_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    const now = this.scene.time.now;
    this.nextSporeAt = now + 600;
  }
}
