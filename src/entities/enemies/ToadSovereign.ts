import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  TOAD_SOVEREIGN_INITIAL_DELAY_MS,
  TOAD_SOVEREIGN_PHASE1_HOP_DISTANCE,
  TOAD_SOVEREIGN_PHASE1_HOP_DURATION_MS,
  TOAD_SOVEREIGN_PHASE1_IDLE_MS,
  TOAD_SOVEREIGN_PHASE1_TELEGRAPH_MS,
  TOAD_SOVEREIGN_PHASE2_ADD_INTERVAL_MS,
  TOAD_SOVEREIGN_PHASE2_COMBO_GAP_MS,
  TOAD_SOVEREIGN_PHASE2_HOP_DURATION_MS,
  TOAD_SOVEREIGN_PHASE2_HOP_GAP_MS,
  TOAD_SOVEREIGN_PHASE2_HOPS_PER_COMBO,
  TOAD_SOVEREIGN_PHASE2_LANDING_THORNS,
  TOAD_SOVEREIGN_PHASE2_MAX_ADDS,
  TOAD_SOVEREIGN_PHASE_FLASH_MS,
  TOAD_SOVEREIGN_TONGUE_SPEED,
  TOAD_SOVEREIGN_TONGUE_SPREAD_RAD,
  TOAD_SOVEREIGN_VISUAL_SCALE,
} from '../../config/GameConfig';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface ToadSovereignHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

type Phase1State = 'idle' | 'telegraph' | 'hop';
type Phase2State = 'comboHop' | 'comboLand' | 'comboGap';

/**
 * Toad Sovereign — Sapphire Swamp boss based on Bog Frog. Phase 1: a slow
 * idle → cheek-puff telegraph → 3-tongue burst (centre + ±25°) toward the
 * player → hop to a new spot. Phase 2 (≤ 50 % HP): drops the telegraph in
 * favour of a 3-hop combo, each landing fires a 5-thorn radial burst, and
 * the boss summons up to 2 Bog Frog adds to harass the player.
 */
export class ToadSovereign extends BossEnemy {
  override readonly displayName = 'Toad Sovereign';
  override readonly maxHp = ENEMIES['boss-toad-sovereign'].hp;
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: ToadSovereignHost;

  // Phase 1 state machine
  private p1State: Phase1State = 'idle';
  private p1NextChangeAt: number;

  // Phase 2 state machine
  private p2State: Phase2State = 'comboHop';
  private p2NextChangeAt = 0;
  private p2HopsTakenInCombo = 0;
  private p2NextAddAt = 0;
  private adds: BaseEnemy[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, host: ToadSovereignHost) {
    super(scene, x, y, ENEMIES['boss-toad-sovereign']);
    this.host = host;
    this.p1NextChangeAt = scene.time.now + TOAD_SOVEREIGN_INITIAL_DELAY_MS;
    this.setScale(TOAD_SOVEREIGN_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (this.currentPhase === 1) {
      this.tickPhase1(time);
    } else {
      this.tickPhase2(time);
    }
  }

  // --- Phase 1 ---------------------------------------------------------------

  private tickPhase1(time: number): void {
    if (time < this.p1NextChangeAt) return;
    switch (this.p1State) {
      case 'idle':
        this.p1BeginTelegraph(time);
        break;
      case 'telegraph':
        this.p1FireTongueBurstAndHop(time);
        break;
      case 'hop':
        this.p1EndHop(time);
        break;
    }
  }

  private p1BeginTelegraph(time: number): void {
    this.p1State = 'telegraph';
    this.p1NextChangeAt = time + TOAD_SOVEREIGN_PHASE1_TELEGRAPH_MS;
    // Cheek-puff squash so the windup reads.
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: TOAD_SOVEREIGN_VISUAL_SCALE * 1.12,
      scaleY: TOAD_SOVEREIGN_VISUAL_SCALE * 0.92,
      duration: TOAD_SOVEREIGN_PHASE1_TELEGRAPH_MS,
      ease: 'Sine.Out',
    });
  }

  private p1FireTongueBurstAndHop(time: number): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(TOAD_SOVEREIGN_VISUAL_SCALE);

    const player = this.host.getPlayer();
    if (!player.active) {
      this.p1State = 'idle';
      this.p1NextChangeAt = time + TOAD_SOVEREIGN_PHASE1_IDLE_MS;
      return;
    }
    // Fire the 3-tongue burst: centre + ±spread.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const baseAngle = Math.atan2(dy, dx);
    for (const off of [-TOAD_SOVEREIGN_TONGUE_SPREAD_RAD, 0, TOAD_SOVEREIGN_TONGUE_SPREAD_RAD]) {
      const a = baseAngle + off;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * TOAD_SOVEREIGN_TONGUE_SPEED,
        Math.sin(a) * TOAD_SOVEREIGN_TONGUE_SPEED,
      );
    }

    // Hop toward the player but with jitter so consecutive hops don't all
    // converge on top of them.
    const jitter = (Math.random() - 0.5) * Math.PI * 0.6;
    const angle = baseAngle + jitter;
    const speed =
      TOAD_SOVEREIGN_PHASE1_HOP_DISTANCE / (TOAD_SOVEREIGN_PHASE1_HOP_DURATION_MS / 1000);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.p1State = 'hop';
    this.p1NextChangeAt = time + TOAD_SOVEREIGN_PHASE1_HOP_DURATION_MS;
  }

  private p1EndHop(time: number): void {
    this.setVelocity(0, 0);
    this.p1State = 'idle';
    this.p1NextChangeAt = time + TOAD_SOVEREIGN_PHASE1_IDLE_MS;
  }

  // --- Phase 2 ---------------------------------------------------------------

  private tickPhase2(time: number): void {
    if (time >= this.p2NextChangeAt) {
      switch (this.p2State) {
        case 'comboHop':
          this.p2EndHopWithBurst(time);
          break;
        case 'comboLand':
          this.p2BeginNextHopOrGap(time);
          break;
        case 'comboGap':
          this.p2BeginCombo(time);
          break;
      }
    }
    this.tickPhase2Adds(time);
  }

  private p2BeginCombo(time: number): void {
    this.p2HopsTakenInCombo = 0;
    this.p2BeginHop(time);
  }

  private p2BeginHop(time: number): void {
    const player = this.host.getPlayer();
    const aimX = player.active ? player.x : this.x;
    const aimY = player.active ? player.y : this.y;
    const dx = aimX - this.x;
    const dy = aimY - this.y;
    const len = Math.hypot(dx, dy);
    const speed = this.definition.moveSpeed;
    if (len < 1) {
      this.setVelocity(0, 0);
    } else {
      // Wider jitter than phase 1 so the 3-hop combo doesn't land in a
      // perfectly straight line — gives the player escape gaps.
      const jitter = (Math.random() - 0.5) * Math.PI * 0.7;
      const a = Math.atan2(dy, dx) + jitter;
      this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    }
    this.p2State = 'comboHop';
    this.p2NextChangeAt = time + TOAD_SOVEREIGN_PHASE2_HOP_DURATION_MS;
  }

  private p2EndHopWithBurst(time: number): void {
    this.setVelocity(0, 0);
    this.p2HopsTakenInCombo += 1;
    // Radial 5-thorn burst on each landing.
    const count = TOAD_SOVEREIGN_PHASE2_LANDING_THORNS;
    const baseOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = baseOffset + (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
    this.p2State = 'comboLand';
    this.p2NextChangeAt = time + TOAD_SOVEREIGN_PHASE2_HOP_GAP_MS;
  }

  private p2BeginNextHopOrGap(time: number): void {
    if (this.p2HopsTakenInCombo >= TOAD_SOVEREIGN_PHASE2_HOPS_PER_COMBO) {
      this.p2State = 'comboGap';
      this.p2NextChangeAt = time + TOAD_SOVEREIGN_PHASE2_COMBO_GAP_MS;
    } else {
      this.p2BeginHop(time);
    }
  }

  private tickPhase2Adds(time: number): void {
    if (time < this.p2NextAddAt) return;
    this.adds = this.adds.filter((a) => a.active);
    if (this.adds.length < TOAD_SOVEREIGN_PHASE2_MAX_ADDS) {
      const bounds = this.host.getRoomBounds();
      const margin = 0.2;
      const onLeft = Math.random() < 0.5;
      const onTop = Math.random() < 0.5;
      const x = onLeft
        ? bounds.minX + (bounds.maxX - bounds.minX) * margin * Math.random()
        : bounds.maxX - (bounds.maxX - bounds.minX) * margin * Math.random();
      const y = onTop
        ? bounds.minY + (bounds.maxY - bounds.minY) * margin * Math.random()
        : bounds.maxY - (bounds.maxY - bounds.minY) * margin * Math.random();
      const add = this.host.spawnEnemyAt('bog-frog', x, y);
      if (add) this.adds.push(add);
    }
    this.p2NextAddAt = time + TOAD_SOVEREIGN_PHASE2_ADD_INTERVAL_MS;
  }

  // --- Phase change ----------------------------------------------------------

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setScale(TOAD_SOVEREIGN_VISUAL_SCALE);
    this.setTintFill(0x9ad8ff);
    this.scene.time.delayedCall(TOAD_SOVEREIGN_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);

    // Drop into a fresh combo right after the flash; first add fires a beat later.
    const now = this.scene.time.now;
    this.p2State = 'comboGap';
    this.p2NextChangeAt = now + 400;
    this.p2HopsTakenInCombo = 0;
    this.p2NextAddAt = now + 1500;
  }
}
