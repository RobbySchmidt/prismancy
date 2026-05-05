import type Phaser from 'phaser';
import {
  DAMSELFLY_EMPRESS_DASH_DURATION_MS,
  DAMSELFLY_EMPRESS_DASH_SPEED,
  DAMSELFLY_EMPRESS_INITIAL_DELAY_MS,
  DAMSELFLY_EMPRESS_PHASE1_CYCLE_MS,
  DAMSELFLY_EMPRESS_PHASE2_ADD_INTERVAL_MS,
  DAMSELFLY_EMPRESS_PHASE2_CYCLE_MS,
  DAMSELFLY_EMPRESS_PHASE2_MAX_ADDS,
  DAMSELFLY_EMPRESS_PHASE_FLASH_MS,
  DAMSELFLY_EMPRESS_RECOVERY_MS,
  DAMSELFLY_EMPRESS_TELEGRAPH_MS,
  DAMSELFLY_EMPRESS_TRAIL_INTERVAL_MS,
  DAMSELFLY_EMPRESS_TRAIL_SPEED,
  DAMSELFLY_EMPRESS_VISUAL_SCALE,
} from '../../config/GameConfig';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface DamselflyEmpressHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

type DashState = 'idle' | 'telegraph' | 'dash' | 'recovery';

/**
 * Damselfly Empress — Sapphire Swamp boss based on Damselfly. Dashes
 * straight across the room, dropping projectiles perpendicular to the dash
 * direction at fixed intervals (so the trail forms a "cross-thorn fence"
 * the player has to thread). Phase 2 (≤ 50 % HP): faster dash cycle + up
 * to 3 Damselfly adds.
 */
export class DamselflyEmpress extends BossEnemy {
  override readonly displayName = 'Damselfly Empress';
  override readonly maxHp = ENEMIES['boss-damselfly-empress'].hp;
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: DamselflyEmpressHost;

  private dashState: DashState = 'idle';
  private nextStateChangeAt: number;
  /** Direction unit vector captured at telegraph end; locked for the dash. */
  private dashDirX = 1;
  private dashDirY = 0;
  /** Scene time for the next perpendicular projectile drop during a dash. */
  private nextTrailDropAt = 0;

  private nextAddAt = 0;
  private adds: BaseEnemy[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, host: DamselflyEmpressHost) {
    super(scene, x, y, ENEMIES['boss-damselfly-empress']);
    this.host = host;
    this.nextStateChangeAt = scene.time.now + DAMSELFLY_EMPRESS_INITIAL_DELAY_MS;
    this.setScale(DAMSELFLY_EMPRESS_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    this.tickDashCycle(time);
    if (this.currentPhase >= 2) {
      this.tickAdds(time);
    }
    if (this.dashState === 'dash' && time >= this.nextTrailDropAt) {
      this.dropTrailProjectile();
      this.nextTrailDropAt = time + DAMSELFLY_EMPRESS_TRAIL_INTERVAL_MS;
    }
  }

  private tickDashCycle(time: number): void {
    if (time < this.nextStateChangeAt) return;
    switch (this.dashState) {
      case 'idle':
        this.beginTelegraph(time);
        break;
      case 'telegraph':
        this.beginDash(time);
        break;
      case 'dash':
        this.beginRecovery(time);
        break;
      case 'recovery':
        this.endCycle(time);
        break;
    }
  }

  private beginTelegraph(time: number): void {
    this.dashState = 'telegraph';
    this.nextStateChangeAt = time + DAMSELFLY_EMPRESS_TELEGRAPH_MS;
    this.setVelocity(0, 0);
    // Wing-flutter feel: alpha pulse so the player reads "wind-up incoming".
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.55,
      duration: DAMSELFLY_EMPRESS_TELEGRAPH_MS / 2,
      yoyo: true,
    });
  }

  private beginDash(time: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.dashState = 'dash';
    this.nextStateChangeAt = time + DAMSELFLY_EMPRESS_DASH_DURATION_MS;
    this.nextTrailDropAt = time;

    const player = this.host.getPlayer();
    if (player.active) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy);
      this.dashDirX = len > 0.01 ? dx / len : 1;
      this.dashDirY = len > 0.01 ? dy / len : 0;
    }
    this.setVelocity(
      this.dashDirX * DAMSELFLY_EMPRESS_DASH_SPEED,
      this.dashDirY * DAMSELFLY_EMPRESS_DASH_SPEED,
    );
  }

  private beginRecovery(time: number): void {
    this.dashState = 'recovery';
    this.setVelocity(0, 0);
    this.nextStateChangeAt = time + DAMSELFLY_EMPRESS_RECOVERY_MS;
  }

  private endCycle(time: number): void {
    this.dashState = 'idle';
    const cycle =
      this.currentPhase >= 2
        ? DAMSELFLY_EMPRESS_PHASE2_CYCLE_MS
        : DAMSELFLY_EMPRESS_PHASE1_CYCLE_MS;
    // The cycle constants represent "telegraph → dash → recovery → idle"
    // length, so the next state change is the remaining idle window
    // (cycle - telegraph - dash - recovery), clamped at 0.
    const idle =
      cycle -
      DAMSELFLY_EMPRESS_TELEGRAPH_MS -
      DAMSELFLY_EMPRESS_DASH_DURATION_MS -
      DAMSELFLY_EMPRESS_RECOVERY_MS;
    this.nextStateChangeAt = time + Math.max(0, idle);
  }

  /**
   * Drop two projectiles perpendicular to the dash direction at the boss's
   * current position — one going each way from the dash line. The result is
   * a "fence" the player has to thread between or arc around.
   */
  private dropTrailProjectile(): void {
    const px = -this.dashDirY;
    const py = this.dashDirX;
    this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      px * DAMSELFLY_EMPRESS_TRAIL_SPEED,
      py * DAMSELFLY_EMPRESS_TRAIL_SPEED,
    );
    this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      -px * DAMSELFLY_EMPRESS_TRAIL_SPEED,
      -py * DAMSELFLY_EMPRESS_TRAIL_SPEED,
    );
  }

  private tickAdds(time: number): void {
    if (time < this.nextAddAt) return;
    this.adds = this.adds.filter((a) => a.active);
    if (this.adds.length < DAMSELFLY_EMPRESS_PHASE2_MAX_ADDS) {
      const bounds = this.host.getRoomBounds();
      const margin = 0.2;
      const x =
        Math.random() < 0.5
          ? bounds.minX + (bounds.maxX - bounds.minX) * margin * Math.random()
          : bounds.maxX - (bounds.maxX - bounds.minX) * margin * Math.random();
      const y =
        Math.random() < 0.5
          ? bounds.minY + (bounds.maxY - bounds.minY) * margin * Math.random()
          : bounds.maxY - (bounds.maxY - bounds.minY) * margin * Math.random();
      const add = this.host.spawnEnemyAt('damselfly', x, y);
      if (add) this.adds.push(add);
    }
    this.nextAddAt = time + DAMSELFLY_EMPRESS_PHASE2_ADD_INTERVAL_MS;
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.setScale(DAMSELFLY_EMPRESS_VISUAL_SCALE);
    this.setTintFill(0x9ad8ff);
    this.scene.time.delayedCall(DAMSELFLY_EMPRESS_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    const now = this.scene.time.now;
    this.nextStateChangeAt = now + 400;
    this.dashState = 'idle';
    this.nextAddAt = now + 1500;
  }
}
