import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  PIXIE_QUEEN_FALLBACK_MIN_DISTANCE,
  PIXIE_QUEEN_PHASE1_TELEPORT_INTERVAL_MS,
  PIXIE_QUEEN_PHASE2_ADD_INTERVAL_MS,
  PIXIE_QUEEN_PHASE2_MAX_ADDS,
  PIXIE_QUEEN_PHASE2_TELEPORT_INTERVAL_MS,
  PIXIE_QUEEN_PHASE_FLASH_MS,
  PIXIE_QUEEN_TELEPORT_FADE_MS,
  PIXIE_QUEEN_TELEPORT_INITIAL_DELAY_MS,
  PIXIE_QUEEN_VISUAL_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { safeAddSpawnPosition } from '../../utils/bossSpawn';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { type BaseEnemy } from './BaseEnemy';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Adapter so PixieQueen can request adds + access the player + tree positions
 * without grabbing GameScene directly. Implemented by GameScene at construction
 * time.
 */
export interface PixieQueenHost {
  enemyProjectilePool: EnemyProjectilePool;
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
  /** Active-room tree positions (canopy decoration anchors) for teleport targets. */
  getTreePositions(): { x: number; y: number }[];
}

/**
 * Pixie Queen — Emerald Forest boss. Pulls in the long-pending Pixie-Dancer
 * teleport idea: she vanishes into a tree and re-emerges from another every
 * couple of seconds, firing thorn patterns on landing. Phase 1: 4-thorn plus,
 * 2.0s cadence. Phase 2 (≤ 50% HP): 6-thorn star, 1.4s cadence + Pixie-Dancer
 * adds. Falls back to a random safe position when no trees exist (open arena).
 */
export class PixieQueen extends BossEnemy {
  override readonly displayName = 'Pixie Queen';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: PixieQueenHost;
  private nextTeleportAt: number;
  private nextAddAt = 0;
  private adds: BaseEnemy[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, host: PixieQueenHost) {
    super(scene, x, y, ENEMIES['boss-pixie-queen']);
    this.host = host;
    this.nextTeleportAt = scene.time.now + PIXIE_QUEEN_TELEPORT_INITIAL_DELAY_MS;
    this.setScale(PIXIE_QUEEN_VISUAL_SCALE);

    // No arcade-velocity movement — the boss teleports. Body stays active so
    // overlap callbacks (player contact, missile damage) still fire.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
  }

  protected tickAI(time: number): void {
    if (time >= this.nextTeleportAt) {
      this.startTeleport(time);
    }
    if (this.currentPhase >= 2 && time >= this.nextAddAt) {
      this.adds = this.adds.filter((a) => a.active);
      if (this.adds.length < PIXIE_QUEEN_PHASE2_MAX_ADDS) {
        const bounds = this.host.getRoomBounds();
        const ax = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const ay = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
        // Player-proximity safety: random anywhere in bounds means the roll
        // can easily land on the player. Fall back to the farthest room
        // corner if it does.
        const player = this.host.getPlayer();
        const safe = safeAddSpawnPosition({ x: ax, y: ay }, bounds, player.x, player.y);
        const add = this.host.spawnEnemyAt('pixie-dancer', safe.x, safe.y);
        if (add) {
          this.adds.push(add);
          EventBus.emit('enemy:charge');
        }
      }
      this.nextAddAt = time + PIXIE_QUEEN_PHASE2_ADD_INTERVAL_MS;
    }
  }

  /**
   * Pop a sparkle cloud at the current spot, fade out, teleport to a tree
   * (or random safe spot), fade back in, fire a thorn pattern. The body is
   * left active throughout — the brief invisibility is purely visual so the
   * player can still tell where she is between flashes.
   *
   * The target is picked AT THE END of the fade-out, not the start, so the
   * player can't predict-and-walk into the destination during the 200 ms fade
   * (which used to drop the boss right on top of the player).
   */
  private startTeleport(time: number): void {
    this.spawnTeleportSparkles(this.x, this.y);
    EventBus.emit('enemy:charge');

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: PIXIE_QUEEN_TELEPORT_FADE_MS,
      ease: 'Sine.In',
      onComplete: () => {
        if (!this.active) return;
        const targetPos = this.pickTeleportTarget();
        this.setPosition(targetPos.x, targetPos.y);
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        body?.reset(targetPos.x, targetPos.y);
        this.spawnTeleportSparkles(targetPos.x, targetPos.y);
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          duration: PIXIE_QUEEN_TELEPORT_FADE_MS,
          ease: 'Sine.Out',
          onComplete: () => {
            if (this.active) this.fireThornPattern();
          },
        });
      },
    });

    const interval =
      this.currentPhase >= 2
        ? PIXIE_QUEEN_PHASE2_TELEPORT_INTERVAL_MS
        : PIXIE_QUEEN_PHASE1_TELEPORT_INTERVAL_MS;
    this.nextTeleportAt = time + interval;
  }

  /**
   * Pick a tree position at random, avoiding the current one AND any tree
   * that's too close to the player (the prior version skipped that check
   * for the tree path, so if the player happened to be parked next to a
   * tree the queen could materialize directly on top of him for free
   * contact damage). Falls back to the FARTHEST tree from the player when
   * no safe candidate exists, then to a perimeter-anchor grid when there
   * are no trees at all (boss rooms skip `scatterDecorations`, so the queen
   * has no real trees to teleport between — the anchor grid keeps her
   * teleport spots varied instead of bouncing between two random points
   * the bounds-fallback happened to land on).
   */
  private pickTeleportTarget(): { x: number; y: number } {
    const trees = this.host.getTreePositions();
    const player = this.host.getPlayer();
    const minDistSq =
      PIXIE_QUEEN_FALLBACK_MIN_DISTANCE * PIXIE_QUEEN_FALLBACK_MIN_DISTANCE;

    if (trees.length > 0) {
      // Reject trees the queen is already at (she'd appear to not move) and
      // trees within the safe distance of the player.
      const safe = trees.filter((t) => {
        if (Math.hypot(t.x - this.x, t.y - this.y) <= 16) return false;
        const dx = t.x - player.x;
        const dy = t.y - player.y;
        return dx * dx + dy * dy >= minDistSq;
      });
      if (safe.length > 0) {
        const pick = safe[Math.floor(Math.random() * safe.length)]!;
        return { x: pick.x, y: pick.y };
      }
      // No safe tree available (player is parked in the middle of a
      // tree-dense room). Pick the FARTHEST tree as best-effort instead of
      // re-using the random tree pool — keeps the queen out of the player's
      // immediate hitbox at the cost of a less random teleport.
      let farthest = trees[0]!;
      let farthestSq = -1;
      for (const t of trees) {
        const dx = t.x - player.x;
        const dy = t.y - player.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > farthestSq) {
          farthestSq = distSq;
          farthest = t;
        }
      }
      return { x: farthest.x, y: farthest.y };
    }

    // No trees in this room (every boss room skips decoration scatter).
    // Use a fixed 8-anchor perimeter grid: TL, TM, TR, ML, MR, BL, BM, BR
    // around the playable bounds. Reject anchors the queen is already on
    // and anchors within the safe distance of the player. Pick farthest as
    // the last-resort tier — same shape as the tree path above.
    const bounds = this.host.getRoomBounds();
    const ax = (t: number): number => bounds.minX + (bounds.maxX - bounds.minX) * t;
    const ay = (t: number): number => bounds.minY + (bounds.maxY - bounds.minY) * t;
    const anchors: { x: number; y: number }[] = [
      { x: ax(0.15), y: ay(0.2) },
      { x: ax(0.5), y: ay(0.2) },
      { x: ax(0.85), y: ay(0.2) },
      { x: ax(0.15), y: ay(0.5) },
      { x: ax(0.85), y: ay(0.5) },
      { x: ax(0.15), y: ay(0.8) },
      { x: ax(0.5), y: ay(0.8) },
      { x: ax(0.85), y: ay(0.8) },
    ];
    const safeAnchors = anchors.filter((a) => {
      if (Math.hypot(a.x - this.x, a.y - this.y) <= 16) return false;
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      return dx * dx + dy * dy >= minDistSq;
    });
    if (safeAnchors.length > 0) {
      return safeAnchors[Math.floor(Math.random() * safeAnchors.length)]!;
    }
    let farthest = anchors[0]!;
    let farthestSq = -1;
    for (const a of anchors) {
      if (Math.hypot(a.x - this.x, a.y - this.y) <= 16) continue;
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > farthestSq) {
        farthestSq = distSq;
        farthest = a;
      }
    }
    return { x: farthest.x, y: farthest.y };
  }

  private spawnTeleportSparkles(cx: number, cy: number): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 18 + Math.random() * 14;
      const color = i % 2 === 0 ? 0xff7ac0 : 0xfff8a0;
      const sparkle = this.scene.add
        .circle(cx, cy, 2, color, 1)
        .setDepth(DepthLayers.Particle);
      this.scene.tweens.add({
        targets: sparkle,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: 320,
        ease: 'Sine.Out',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  /**
   * Phase 1: 4-thorn plus (cardinal). Phase 2: 6-thorn star (radial sweep).
   */
  private fireThornPattern(): void {
    const count = this.currentPhase >= 2 ? 6 : 4;
    const baseAngle = this.currentPhase >= 2 ? 0 : 0;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.setTintFill(0xff90c8);
    this.scene.time.delayedCall(PIXIE_QUEEN_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    const now = this.scene.time.now;
    this.nextTeleportAt = now + 400;
    this.nextAddAt = now + 1200;
  }
}
