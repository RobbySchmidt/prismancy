import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  MOSSY_BEHEMOTH_DEATH_SPLIT_MAX,
  MOSSY_BEHEMOTH_DEATH_SPLIT_MIN,
  MOSSY_BEHEMOTH_HOP_DURATION_MS,
  MOSSY_BEHEMOTH_HOP_SPEED_P1,
  MOSSY_BEHEMOTH_HOP_SPEED_P2,
  MOSSY_BEHEMOTH_INITIAL_DELAY_MS,
  MOSSY_BEHEMOTH_LANDING_THORNS_P1,
  MOSSY_BEHEMOTH_LANDING_THORNS_P2,
  MOSSY_BEHEMOTH_P1_IDLE_MS,
  MOSSY_BEHEMOTH_P1_TELEGRAPH_MS,
  MOSSY_BEHEMOTH_P2_COMBO_GAP_MS,
  MOSSY_BEHEMOTH_P2_HOP_GAP_MS,
  MOSSY_BEHEMOTH_P2_HOPS_PER_COMBO,
  MOSSY_BEHEMOTH_PHASE_FLASH_MS,
  MOSSY_BEHEMOTH_VISUAL_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface MossyBehemothHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

type Phase1State = 'idle' | 'telegraph' | 'hop';
type Phase2State = 'comboHop' | 'comboLand' | 'comboGap';

/**
 * Mossy Behemoth — Emerald Forest boss, "Slam" rework. The hop IS the threat:
 * every landing erupts a radial shockwave of thorns. Phase 1 is a readable
 * idle → cheek-squash telegraph → hop → land-shockwave loop. Phase 2 (≤ 50%
 * HP) chains a 3-hop combo, each landing firing a denser dual-wave shockwave,
 * then a short rest. The Phase-2 slime-add summoning was dropped — it stands
 * on its movement + shockwave density now. Death-split kept as its signature.
 */
export class MossyBehemoth extends BossEnemy {
  override readonly displayName = 'Mossy Behemoth';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: MossyBehemothHost;

  private p1State: Phase1State = 'idle';
  private p1NextChangeAt: number;

  private p2State: Phase2State = 'comboGap';
  private p2NextChangeAt = 0;
  private p2HopsTaken = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: MossyBehemothHost) {
    super(scene, x, y, ENEMIES['boss-mossy-behemoth']);
    this.host = host;
    this.p1NextChangeAt = scene.time.now + MOSSY_BEHEMOTH_INITIAL_DELAY_MS;
    this.setScale(MOSSY_BEHEMOTH_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (this.currentPhase === 1) this.tickPhase1(time);
    else this.tickPhase2(time);
  }

  // --- Phase 1 ---------------------------------------------------------------

  private tickPhase1(time: number): void {
    if (time < this.p1NextChangeAt) return;
    switch (this.p1State) {
      case 'idle':
        this.p1BeginTelegraph(time);
        break;
      case 'telegraph':
        this.p1Launch(time);
        break;
      case 'hop':
        this.p1Land(time);
        break;
    }
  }

  private p1BeginTelegraph(time: number): void {
    this.p1State = 'telegraph';
    this.p1NextChangeAt = time + MOSSY_BEHEMOTH_P1_TELEGRAPH_MS;
    EventBus.emit('enemy:charge');
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: MOSSY_BEHEMOTH_VISUAL_SCALE * 1.14,
      scaleY: MOSSY_BEHEMOTH_VISUAL_SCALE * 0.86,
      duration: MOSSY_BEHEMOTH_P1_TELEGRAPH_MS,
      ease: 'Sine.Out',
    });
  }

  private p1Launch(time: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(MOSSY_BEHEMOTH_VISUAL_SCALE);
    this.launchHopToward(MOSSY_BEHEMOTH_HOP_SPEED_P1);
    this.p1State = 'hop';
    this.p1NextChangeAt = time + MOSSY_BEHEMOTH_HOP_DURATION_MS;
  }

  private p1Land(time: number): void {
    this.setVelocity(0, 0);
    this.spawnLandingSparkles();
    this.fireShockwave(MOSSY_BEHEMOTH_LANDING_THORNS_P1);
    this.p1State = 'idle';
    this.p1NextChangeAt = time + MOSSY_BEHEMOTH_P1_IDLE_MS;
  }

  // --- Phase 2 ---------------------------------------------------------------

  private tickPhase2(time: number): void {
    if (time < this.p2NextChangeAt) return;
    switch (this.p2State) {
      case 'comboGap':
        this.p2BeginCombo(time);
        break;
      case 'comboHop':
        this.p2Land(time);
        break;
      case 'comboLand':
        this.p2NextHopOrRest(time);
        break;
    }
  }

  private p2BeginCombo(time: number): void {
    this.p2HopsTaken = 0;
    this.p2BeginHop(time);
  }

  private p2BeginHop(time: number): void {
    this.launchHopToward(MOSSY_BEHEMOTH_HOP_SPEED_P2);
    this.p2State = 'comboHop';
    this.p2NextChangeAt = time + MOSSY_BEHEMOTH_HOP_DURATION_MS;
  }

  private p2Land(time: number): void {
    this.setVelocity(0, 0);
    this.p2HopsTaken += 1;
    this.spawnLandingSparkles();
    this.fireShockwave(MOSSY_BEHEMOTH_LANDING_THORNS_P2);
    this.p2State = 'comboLand';
    this.p2NextChangeAt = time + MOSSY_BEHEMOTH_P2_HOP_GAP_MS;
  }

  private p2NextHopOrRest(time: number): void {
    if (this.p2HopsTaken >= MOSSY_BEHEMOTH_P2_HOPS_PER_COMBO) {
      this.p2State = 'comboGap';
      this.p2NextChangeAt = time + MOSSY_BEHEMOTH_P2_COMBO_GAP_MS;
    } else {
      this.p2BeginHop(time);
    }
  }

  // --- Shared ----------------------------------------------------------------

  /** Hop toward the player with jitter so consecutive landings don't stack. */
  private launchHopToward(speed: number): void {
    const player = this.host.getPlayer();
    if (!player.active) {
      this.setVelocity(0, 0);
      return;
    }
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      this.setVelocity(0, 0);
      return;
    }
    const jitter = (Math.random() - 0.5) * Math.PI * 0.6;
    const a = Math.atan2(dy, dx) + jitter;
    this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    EventBus.emit('enemy:charge');
  }

  /**
   * Single radial shockwave of thorns on landing, random base rotation so the
   * safe lanes shift each time. Thinned to 6 (P1) / 8 (P2) thorns — the old
   * Phase-2 dual-wave (10+10 ≈ 20) left no dodge-room (2026-06-13 fairness).
   */
  private fireShockwave(count: number): void {
    const step = (Math.PI * 2) / count;
    const baseOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = baseOffset + i * step;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  /** Burst of green sparkles flying outward from the boss's feet on landing. */
  private spawnLandingSparkles(): void {
    const count = 8;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / count;
      const dist = 22 + Math.random() * 14;
      const sparkle = this.scene.add
        .circle(this.x, this.y + 8, 2, 0x6effa0, 0.95)
        .setDepth(DepthLayers.Particle);
      this.scene.tweens.add({
        targets: sparkle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + 8 + Math.sin(angle) * dist * 0.6,
        alpha: 0,
        scale: 0.4,
        duration: 280,
        ease: 'Sine.Out',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setScale(MOSSY_BEHEMOTH_VISUAL_SCALE);
    this.setTintFill(0x9effb0);
    this.scene.time.delayedCall(MOSSY_BEHEMOTH_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    // Drop straight into a fresh combo shortly after the flash.
    this.p2State = 'comboGap';
    this.p2NextChangeAt = this.scene.time.now + 420;
    this.p2HopsTaken = 0;
  }

  /**
   * Death-split: spawn 2-3 mossy-slime adds before the base class tween-out.
   * `delayedCall(0)` defers the spawns one tick so we don't mutate the
   * enemies group from inside the physics callback that triggered death.
   */
  protected override die(): void {
    const splitCount =
      MOSSY_BEHEMOTH_DEATH_SPLIT_MIN +
      Math.floor(
        Math.random() *
          (MOSSY_BEHEMOTH_DEATH_SPLIT_MAX - MOSSY_BEHEMOTH_DEATH_SPLIT_MIN + 1),
      );
    const spawnX = this.x;
    const spawnY = this.y;
    const host = this.host;
    this.scene.time.delayedCall(0, () => {
      for (let i = 0; i < splitCount; i++) {
        const angle = (Math.PI * 2 * i) / splitCount + Math.random() * 0.4;
        const offset = 24;
        host.spawnEnemyAt(
          'mossy-slime',
          spawnX + Math.cos(angle) * offset,
          spawnY + Math.sin(angle) * offset,
        );
      }
    });
    super.die();
  }
}
