import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  FOREST_HEART_FIRE_INITIAL_DELAY_MS,
  FOREST_HEART_PHASE1_PULSE_DURATION_MS,
  FOREST_HEART_PHASE1_PULSE_HIGH,
  FOREST_HEART_PHASE1_PULSE_LOW,
  FOREST_HEART_PHASE1_WAVE_INTERVAL_MS,
  FOREST_HEART_PHASE2_ADD_INTERVAL_MS,
  FOREST_HEART_PHASE2_PULSE_DURATION_MS,
  FOREST_HEART_PHASE2_PULSE_HIGH,
  FOREST_HEART_PHASE2_PULSE_LOW,
  FOREST_HEART_PHASE2_WAVE_INTERVAL_MS,
  FOREST_HEART_PHASE_FLASH_MS,
  FOREST_HEART_VISUAL_SCALE,
  FOREST_HEART_WAVE_THORN_COUNT,
} from '../../config/GameConfig';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Adapter so ForestHeart can request adds + read player + room bounds without
 * grabbing GameScene directly. Implemented by GameScene at construction time.
 */
export interface ForestHeartHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Forest Heart — Emerald Forest boss. Stationary tree-core in the room
 * center. Phase 1: radial 6-thorn wave every 1.8s + gentle pulse tween. Phase
 * 2 (≤ 50% HP): faster waves (1.4s) + Forest Sprite adds spawned at the room
 * edge every 2.5s + intensified pulse.
 */
export class ForestHeart extends BossEnemy {
  override readonly displayName = 'Forest Heart';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: ForestHeartHost;
  private nextWaveAt: number;
  private nextAddAt = 0;
  private adds: BaseEnemy[] = [];
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, host: ForestHeartHost) {
    super(scene, x, y, ENEMIES['boss-forest-heart']);
    this.host = host;
    this.nextWaveAt = scene.time.now + FOREST_HEART_FIRE_INITIAL_DELAY_MS;
    this.setScale(FOREST_HEART_VISUAL_SCALE);

    // Stationary like the Vine Lord — body immovable, no movement.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;

    // Phase 1 pulse tween starts immediately.
    this.startPulseTween(
      FOREST_HEART_PHASE1_PULSE_LOW,
      FOREST_HEART_PHASE1_PULSE_HIGH,
      FOREST_HEART_PHASE1_PULSE_DURATION_MS,
    );
  }

  protected tickAI(time: number): void {
    if (time >= this.nextWaveAt) {
      this.fireRadialWave();
      const interval =
        this.currentPhase >= 2
          ? FOREST_HEART_PHASE2_WAVE_INTERVAL_MS
          : FOREST_HEART_PHASE1_WAVE_INTERVAL_MS;
      this.nextWaveAt = time + interval;
    }

    if (this.currentPhase >= 2 && time >= this.nextAddAt) {
      this.adds = this.adds.filter((a) => a.active);
      // No hard cap — adds aren't free, they cost the Heart a beat each spawn,
      // and the player can clean them up. We just throttle by interval.
      const bounds = this.host.getRoomBounds();
      const onLeftEdge = Math.random() < 0.5;
      const onTopEdge = Math.random() < 0.5;
      const spanX = bounds.maxX - bounds.minX;
      const spanY = bounds.maxY - bounds.minY;
      const edgeMargin = 0.12;
      const x = onLeftEdge
        ? bounds.minX + spanX * (Math.random() * edgeMargin)
        : bounds.maxX - spanX * (Math.random() * edgeMargin);
      const y = onTopEdge
        ? bounds.minY + spanY * (Math.random() * edgeMargin)
        : bounds.maxY - spanY * (Math.random() * edgeMargin);
      const add = this.host.spawnEnemyAt('forest-sprite', x, y);
      if (add) this.adds.push(add);
      this.nextAddAt = time + FOREST_HEART_PHASE2_ADD_INTERVAL_MS;
    }
  }

  /** Evenly spaced full-circle thorn wave centered on the boss. */
  private fireRadialWave(): void {
    const count = FOREST_HEART_WAVE_THORN_COUNT;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  /**
   * Build a yoyo'ing pulse tween between `low`-`high` scale (relative to the
   * boss's base scale) at `durationMs` per direction. Replaces any prior
   * tween so phase transitions can swap in a more intense pulse.
   */
  private startPulseTween(low: number, high: number, durationMs: number): void {
    this.pulseTween?.stop();
    const baseScale = FOREST_HEART_VISUAL_SCALE;
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      scale: { from: baseScale * low, to: baseScale * high },
      duration: durationMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.setTintFill(0x6effa0);
    this.scene.time.delayedCall(FOREST_HEART_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(220, 0.006);
    // Intensify pulse + reset wave / add cooldowns so the player feels the
    // shift immediately.
    this.startPulseTween(
      FOREST_HEART_PHASE2_PULSE_LOW,
      FOREST_HEART_PHASE2_PULSE_HIGH,
      FOREST_HEART_PHASE2_PULSE_DURATION_MS,
    );
    const now = this.scene.time.now;
    this.nextWaveAt = now + 400;
    this.nextAddAt = now + 1200;
  }

  protected override die(): void {
    this.pulseTween?.stop();
    this.pulseTween = null;
    super.die();
  }
}
