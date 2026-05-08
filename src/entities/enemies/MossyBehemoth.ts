import type Phaser from 'phaser';
import {
  MOSSY_BEHEMOTH_DEATH_SPLIT_MAX,
  MOSSY_BEHEMOTH_DEATH_SPLIT_MIN,
  MOSSY_BEHEMOTH_HOP_DURATION_MS,
  MOSSY_BEHEMOTH_HOP_INITIAL_DELAY_MS,
  MOSSY_BEHEMOTH_PHASE1_HOP_INTERVAL_MS,
  MOSSY_BEHEMOTH_PHASE2_HOP_INTERVAL_MS,
  MOSSY_BEHEMOTH_PHASE2_MAX_ADDS,
  MOSSY_BEHEMOTH_PHASE_FLASH_MS,
  MOSSY_BEHEMOTH_VISUAL_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { safeAddSpawnPosition } from '../../utils/bossSpawn';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

type HopState = 'wait' | 'hop';

/**
 * Adapter so MossyBehemoth can request adds + access the player without
 * grabbing GameScene directly. Implemented by GameScene at construction time.
 */
export interface MossyBehemothHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Mossy Behemoth — Emerald Forest boss. A scaled-up Mossy Slime that hops
 * around the room. Phase 1: heavy hops in the player's direction every 1.4s.
 * Phase 2 (≤ 50% HP): faster hops + on-landing slime adds. On death: splits
 * into 2-3 mossy-slime adds.
 */
export class MossyBehemoth extends BossEnemy {
  override readonly displayName = 'Mossy Behemoth';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: MossyBehemothHost;
  private hopState: HopState = 'wait';
  private nextStateChangeAt: number;
  private adds: BaseEnemy[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, host: MossyBehemothHost) {
    super(scene, x, y, ENEMIES['boss-mossy-behemoth']);
    this.host = host;
    this.nextStateChangeAt = scene.time.now + MOSSY_BEHEMOTH_HOP_INITIAL_DELAY_MS;
    this.setScale(MOSSY_BEHEMOTH_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (time < this.nextStateChangeAt) return;
    if (this.hopState === 'wait') this.startHop(time);
    else this.endHop(time);
  }

  private startHop(time: number): void {
    const player = this.host.getPlayer();
    if (!player.active) {
      this.scheduleNextWait(time);
      return;
    }
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
      this.scheduleNextWait(time);
      return;
    }
    const speed = this.definition.moveSpeed;
    this.setVelocity((dx / len) * speed, (dy / len) * speed);
    this.hopState = 'hop';
    this.nextStateChangeAt = time + MOSSY_BEHEMOTH_HOP_DURATION_MS;
    // Audio cue for the hop "leap" — Mossy Behemoth has no visual telegraph
    // (instant velocity change), so this is the only feedback the player gets
    // that the boss is acting rather than idling.
    EventBus.emit('enemy:charge');
  }

  private endHop(time: number): void {
    this.setVelocity(0, 0);
    this.hopState = 'wait';
    this.spawnLandingSparkles();

    // Phase 2 landing-add — capped to MAX_ADDS alive at once.
    if (this.currentPhase >= 2) {
      this.adds = this.adds.filter((a) => a.active);
      if (this.adds.length < MOSSY_BEHEMOTH_PHASE2_MAX_ADDS) {
        // Wrap the natural "spawn next to boss" position with player-proximity
        // check — boss can hop right onto the player, so without the check
        // the slime would spawn on top of them.
        const player = this.host.getPlayer();
        const candidate = {
          x: this.x + (Math.random() - 0.5) * 30,
          y: this.y + (Math.random() - 0.5) * 30,
        };
        const safe = safeAddSpawnPosition(
          candidate,
          this.host.getRoomBounds(),
          player.x,
          player.y,
        );
        const add = this.host.spawnEnemyAt('mossy-slime', safe.x, safe.y);
        if (add) {
          this.adds.push(add);
          EventBus.emit('enemy:charge');
        }
      }
    }

    this.scheduleNextWait(time);
  }

  private scheduleNextWait(time: number): void {
    const wait =
      this.currentPhase >= 2
        ? MOSSY_BEHEMOTH_PHASE2_HOP_INTERVAL_MS
        : MOSSY_BEHEMOTH_PHASE1_HOP_INTERVAL_MS;
    this.nextStateChangeAt = time + wait;
  }

  /**
   * Burst of green sparkles flying outward from the boss's feet on landing.
   * Purely cosmetic — gives the impact some weight.
   */
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
    this.setTintFill(0x9effb0);
    this.scene.time.delayedCall(MOSSY_BEHEMOTH_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    // Next hop fires shortly after the transition.
    this.nextStateChangeAt = this.scene.time.now + 400;
    this.hopState = 'wait';
  }

  /**
   * Death-split: spawn 2-3 mossy-slime adds before the base class disables
   * the body + tweens out + emits `boss:killed`. The adds become regular
   * enemies the player has to clean up (or can ignore — they despawn on room
   * teardown). The boss's own room-clear / reward flow is unaffected because
   * `boss:killed` flips `markCurrentRoomCleared` which opens the doors.
   *
   * `delayedCall(0, ...)` defers the spawns by one tick so we don't mutate
   * the enemies group from inside an in-progress physics callback that may
   * have triggered our death.
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
