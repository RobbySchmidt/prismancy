import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  PIXIE_QUEEN_FALLBACK_MIN_DISTANCE,
  PIXIE_QUEEN_INITIAL_DELAY_MS,
  PIXIE_QUEEN_ORBIT_RADIUS,
  PIXIE_QUEEN_PHASE_FLASH_MS,
  PIXIE_QUEEN_RADIAL_GAIN,
  PIXIE_QUEEN_SHOT_INTERVAL_P1,
  PIXIE_QUEEN_SHOT_INTERVAL_P2,
  PIXIE_QUEEN_SHOT_SPREAD_RAD,
  PIXIE_QUEEN_SHOT_THORNS_P1,
  PIXIE_QUEEN_SHOT_THORNS_P2,
  PIXIE_QUEEN_STRAFE_FLIP_MS,
  PIXIE_QUEEN_STRAFE_SPEED_P1,
  PIXIE_QUEEN_STRAFE_SPEED_P2,
  PIXIE_QUEEN_TELEPORT_FADE_MS,
  PIXIE_QUEEN_TELEPORT_INTERVAL_P1,
  PIXIE_QUEEN_TELEPORT_INTERVAL_P2,
  PIXIE_QUEEN_TELEPORT_LAND_THORNS,
  PIXIE_QUEEN_TELEPORT_TELEGRAPH_MS,
  PIXIE_QUEEN_VISUAL_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Adapter so PixieQueen can read player + room bounds + projectile pool.
 * Implemented by GameScene.
 */
export interface PixieQueenHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Pixie Queen — Emerald Forest boss, "Strafe" rework. De-annoyed: instead of
 * the old blink-spam (vanish/reappear every ~2 s, hard to pin down), she now
 * ORBITS the player at a readable distance — always visible, always hittable —
 * firing aimed thorn spreads while she strafes. She only TELEPORTS occasionally
 * to reposition, and always telegraphs the destination with a sparkle marker
 * first. Phase 2 (≤ 50% HP) strafes faster + fires wider spreads. No more adds.
 */
export class PixieQueen extends BossEnemy {
  override readonly displayName = 'Pixie Queen';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: PixieQueenHost;
  private strafeDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  private nextFlipAt = 0;
  private nextShotAt: number;
  private nextTeleportAt: number;
  /** True while a teleport sequence is running — strafe + shots pause. */
  private teleporting = false;
  private teleportMarker: Phaser.GameObjects.Arc | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, host: PixieQueenHost) {
    super(scene, x, y, ENEMIES['boss-pixie-queen']);
    this.host = host;
    const now = scene.time.now;
    this.nextShotAt = now + PIXIE_QUEEN_INITIAL_DELAY_MS;
    this.nextFlipAt = now + PIXIE_QUEEN_STRAFE_FLIP_MS;
    this.nextTeleportAt = now + PIXIE_QUEEN_TELEPORT_INTERVAL_P1;
    this.setScale(PIXIE_QUEEN_VISUAL_SCALE);

    // Mobile now — strafe via arcade velocity, collide with the room.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);
    body.moves = true;
  }

  protected tickAI(time: number): void {
    if (this.teleporting) return;

    if (time >= this.nextTeleportAt) {
      this.beginTeleport();
      return;
    }

    this.tickStrafe(time);

    if (time >= this.nextShotAt) {
      this.fireAimedSpread();
      this.nextShotAt =
        time +
        (this.currentPhase >= 2 ? PIXIE_QUEEN_SHOT_INTERVAL_P2 : PIXIE_QUEEN_SHOT_INTERVAL_P1);
    }
  }

  /**
   * Orbit the player: tangential strafe + a radial correction that pulls her
   * back toward the ideal orbit radius. Combined vector is normalized to the
   * strafe speed so she circles at constant pace. Flips direction on a timer
   * and whenever a wall blocks her, so she never grinds against an edge.
   */
  private tickStrafe(time: number): void {
    const player = this.host.getPlayer();
    if (!player.active) {
      this.setVelocity(0, 0);
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (
      time >= this.nextFlipAt ||
      body.blocked.left ||
      body.blocked.right ||
      body.blocked.up ||
      body.blocked.down
    ) {
      this.strafeDir = (this.strafeDir * -1) as 1 | -1;
      this.nextFlipAt = time + PIXIE_QUEEN_STRAFE_FLIP_MS;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const radX = dx / dist;
    const radY = dy / dist;
    // Tangential unit (perpendicular), spun by strafe direction.
    const tanX = -radY * this.strafeDir;
    const tanY = radX * this.strafeDir;
    // Normalized radius error: + = too far (pull inward), - = too close.
    const err = (dist - PIXIE_QUEEN_ORBIT_RADIUS) / PIXIE_QUEEN_ORBIT_RADIUS;
    const radialW = Math.max(-1, Math.min(1, err * PIXIE_QUEEN_RADIAL_GAIN));
    let vx = tanX + radX * radialW;
    let vy = tanY + radY * radialW;
    const vlen = Math.hypot(vx, vy) || 1;
    const speed =
      this.currentPhase >= 2 ? PIXIE_QUEEN_STRAFE_SPEED_P2 : PIXIE_QUEEN_STRAFE_SPEED_P1;
    vx = (vx / vlen) * speed;
    vy = (vy / vlen) * speed;
    this.setVelocity(vx, vy);
  }

  /** Aimed spread of thorns toward the player (centre + symmetric pairs). */
  private fireAimedSpread(): void {
    const player = this.host.getPlayer();
    if (!player.active) return;
    const count =
      this.currentPhase >= 2 ? PIXIE_QUEEN_SHOT_THORNS_P2 : PIXIE_QUEEN_SHOT_THORNS_P1;
    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const half = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - half) * PIXIE_QUEEN_SHOT_SPREAD_RAD;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  /**
   * Teleport-reposition: show a sparkle marker at the destination, hold it
   * for the telegraph window, then fade out → snap → fade in → radial burst.
   * The pre-telegraph + slow cadence make this a readable reposition rather
   * than the old "can't pin her down" blink-spam.
   */
  private beginTeleport(): void {
    this.teleporting = true;
    this.setVelocity(0, 0);
    const dest = this.pickTeleportTarget();

    this.teleportMarker = this.scene.add
      .circle(dest.x, dest.y, 16, 0xff7ac0, 0.18)
      .setStrokeStyle(2, 0xffa0d8, 0.9)
      .setDepth(DepthLayers.FloorDecoration + 1);
    this.scene.tweens.add({
      targets: this.teleportMarker,
      scale: { from: 0.5, to: 1.15 },
      alpha: { from: 0.4, to: 0.95 },
      duration: PIXIE_QUEEN_TELEPORT_TELEGRAPH_MS,
      ease: 'Sine.In',
    });
    EventBus.emit('enemy:charge');

    this.scene.time.delayedCall(PIXIE_QUEEN_TELEPORT_TELEGRAPH_MS, () => {
      if (!this.active) {
        this.clearTeleportMarker();
        return;
      }
      this.spawnTeleportSparkles(this.x, this.y);
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: PIXIE_QUEEN_TELEPORT_FADE_MS,
        ease: 'Sine.In',
        onComplete: () => {
          if (!this.active) {
            this.clearTeleportMarker();
            return;
          }
          this.setPosition(dest.x, dest.y);
          const body = this.body as Phaser.Physics.Arcade.Body | null;
          body?.reset(dest.x, dest.y);
          this.clearTeleportMarker();
          this.spawnTeleportSparkles(dest.x, dest.y);
          this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: PIXIE_QUEEN_TELEPORT_FADE_MS,
            ease: 'Sine.Out',
            onComplete: () => {
              this.teleporting = false;
              this.fireLandingBurst();
              const now = this.scene.time.now;
              this.nextTeleportAt =
                now +
                (this.currentPhase >= 2
                  ? PIXIE_QUEEN_TELEPORT_INTERVAL_P2
                  : PIXIE_QUEEN_TELEPORT_INTERVAL_P1);
            },
          });
        },
      });
    });
  }

  private fireLandingBurst(): void {
    const count = PIXIE_QUEEN_TELEPORT_LAND_THORNS;
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
  }

  /**
   * Pick a perimeter anchor at least FALLBACK_MIN_DISTANCE from the player,
   * preferring the candidate farthest from them. Keeps her teleport spots
   * varied + never on top of the player.
   */
  private pickTeleportTarget(): { x: number; y: number } {
    const player = this.host.getPlayer();
    const bounds = this.host.getRoomBounds();
    const ax = (t: number): number => bounds.minX + (bounds.maxX - bounds.minX) * t;
    const ay = (t: number): number => bounds.minY + (bounds.maxY - bounds.minY) * t;
    const anchors: { x: number; y: number }[] = [
      { x: ax(0.18), y: ay(0.22) },
      { x: ax(0.5), y: ay(0.18) },
      { x: ax(0.82), y: ay(0.22) },
      { x: ax(0.18), y: ay(0.5) },
      { x: ax(0.82), y: ay(0.5) },
      { x: ax(0.18), y: ay(0.78) },
      { x: ax(0.5), y: ay(0.82) },
      { x: ax(0.82), y: ay(0.78) },
    ];
    const minDistSq =
      PIXIE_QUEEN_FALLBACK_MIN_DISTANCE * PIXIE_QUEEN_FALLBACK_MIN_DISTANCE;
    const safe = anchors.filter((a) => {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      return dx * dx + dy * dy >= minDistSq;
    });
    const pool = safe.length > 0 ? safe : anchors;
    // Prefer the farthest of the eligible anchors.
    let best = pool[0]!;
    let bestSq = -1;
    for (const a of pool) {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > bestSq) {
        bestSq = distSq;
        best = a;
      }
    }
    return best;
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

  private clearTeleportMarker(): void {
    if (!this.teleportMarker) return;
    this.scene.tweens.killTweensOf(this.teleportMarker);
    this.teleportMarker.destroy();
    this.teleportMarker = null;
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.setTintFill(0xff90c8);
    this.scene.time.delayedCall(PIXIE_QUEEN_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
  }

  protected override die(): void {
    this.clearTeleportMarker();
    super.die();
  }
}
