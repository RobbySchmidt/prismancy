import Phaser from 'phaser';
import {
  BLOOMHEART_BLOOM_GAP_SLOTS,
  BLOOMHEART_BLOOM_INTERVAL_MS,
  BLOOMHEART_BLOOM_TELEGRAPH_MS,
  BLOOMHEART_BLOOM_THORNS,
  BLOOMHEART_FAN_SPREAD_RAD,
  BLOOMHEART_FAN_TELEGRAPH_MS,
  BLOOMHEART_INITIAL_DELAY_MS,
  BLOOMHEART_LEASH_RING_FRACTION,
  BLOOMHEART_PHASE1_FAN_INTERVAL_MS,
  BLOOMHEART_PHASE1_SPORE_INTERVAL_MS,
  BLOOMHEART_PHASE2_FAN_INTERVAL_MS,
  BLOOMHEART_PHASE2_SPORE_INTERVAL_MS,
  BLOOMHEART_PHASE_FLASH_MS,
  BLOOMHEART_REBLOOM_DIST,
  BLOOMHEART_SINK_FADE_MS,
  BLOOMHEART_SINK_INTERVAL_MS,
  BLOOMHEART_SINK_MIN_PLAYER_DIST,
  BLOOMHEART_SPORE_BURST_COUNT_P1,
  BLOOMHEART_SPORE_BURST_COUNT_P2,
  BLOOMHEART_SPORE_LIFETIME_MS,
  BLOOMHEART_SPORE_SPEED,
  BLOOMHEART_STALK_CIRCLE_RATIO,
  BLOOMHEART_STALK_FLIP_MS,
  BLOOMHEART_STALK_SPEED_P1,
  BLOOMHEART_STALK_SPEED_P2,
  BLOOMHEART_STALK_STANDOFF,
  BLOOMHEART_VISUAL_SCALE,
  ENEMY_PROJECTILE_SPEED,
  ROOM_HEIGHT_TILES,
  ROOM_WIDTH_TILES,
  TILE_SIZE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface BloomheartHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Bloomheart — Sapphire Swamp boss, "Stalking Bloom" rework (2026-06-13). No
 * longer rooted: a mobile ranged-zoner carnivore plant. It STALKS the player at
 * mid-range (closes when far, circles when at standoff — never fully static),
 * and in Phase 2 periodically SINKS into the mire and re-blooms elsewhere
 * (anti-corner relocate). Threat layers:
 *  - Petal Fan (both phases): aimed 5-thorn wide fan with a mouth-open tell.
 *  - Spore Mine (both phases — gives Phase 1 a second threat beyond the fan):
 *    a drifting glow that detonates into a small radial after its lifetime.
 *  - Bloom Burst (Phase 2 signature): the flower opens into a radial of petals
 *    with a contiguous safe GAP — always a reachable escape lane (the
 *    Forest-Heart fairness principle), telegraphed by a petal-preview + freeze.
 *
 * Freeze-safety: spores + bloom-telegraph graphics are loose scene objects with
 * deferred callbacks that touch `this.scene`; if the boss dies mid-flight those
 * would throw inside the update loop (see the 2026-06-06 spore freeze fix). All
 * loose objects are torn down in BOTH `die()` and `destroy()`, and in-flight
 * tweens on the boss itself are killed before the death tween starts.
 */
export class Bloomheart extends BossEnemy {
  override readonly displayName = 'Bloomheart';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: BloomheartHost;

  private nextFanAt: number;
  private fanTelegraphScheduled = false;
  private nextSporeAt: number;
  private nextBloomAt = Number.POSITIVE_INFINITY;
  private nextSinkAt = Number.POSITIVE_INFINITY;

  /** Tangential circle direction for the stalk; flips on a timer / wall block. */
  private circleDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  private nextFlipAt = 0;

  /** While charging a Bloom Burst the boss freezes + pauses other attacks. */
  private bloomCharging = false;
  /** While sinking the boss is invisible + all behaviour pauses. */
  private sinking = false;

  /** Live drift spores (see freeze-safety note). */
  private activeSpores: Array<{
    spore: Phaser.GameObjects.Arc;
    halo: Phaser.GameObjects.Arc;
    tween: Phaser.Tweens.Tween;
  }> = [];
  /** Live bloom-telegraph petal-preview graphics (cleaned on death). */
  private bloomTelegraphs: Phaser.GameObjects.Graphics[] = [];

  /** Movement leash ellipse (the floor's first vignette ring) — she may never
   *  cross past it. Centred on the room, half-axes = ring fraction × room size. */
  private readonly leashCx: number;
  private readonly leashCy: number;
  private readonly leashRx: number;
  private readonly leashRy: number;

  constructor(scene: Phaser.Scene, x: number, y: number, host: BloomheartHost) {
    super(scene, x, y, ENEMIES['boss-bloomheart']);
    this.host = host;
    const now = scene.time.now;
    this.nextFanAt = now + BLOOMHEART_INITIAL_DELAY_MS;
    this.nextSporeAt = now + BLOOMHEART_INITIAL_DELAY_MS + BLOOMHEART_PHASE1_SPORE_INTERVAL_MS;
    this.nextFlipAt = now + BLOOMHEART_STALK_FLIP_MS;
    this.setScale(BLOOMHEART_VISUAL_SCALE);

    const roomW = ROOM_WIDTH_TILES * TILE_SIZE;
    const roomH = ROOM_HEIGHT_TILES * TILE_SIZE;
    this.leashCx = roomW / 2;
    this.leashCy = roomH / 2;
    this.leashRx = roomW * BLOOMHEART_LEASH_RING_FRACTION;
    this.leashRy = roomH * BLOOMHEART_LEASH_RING_FRACTION;

    // Mobile now — stalk via arcade velocity, collide with the room.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);
    body.moves = true;
  }

  protected tickAI(time: number): void {
    if (this.sinking) return;
    if (this.bloomCharging) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.currentPhase >= 2 && time >= this.nextSinkAt) {
      this.beginSink();
      return;
    }
    if (this.currentPhase >= 2 && time >= this.nextBloomAt) {
      this.beginBloomBurst(time);
      return;
    }

    this.tickStalk(time);
    this.tickFan(time);
    this.tickSpore(time);
  }

  // --- Movement: stalk with standoff + anti-static circle ---------------------

  private tickStalk(time: number): void {
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
      this.circleDir = (this.circleDir * -1) as 1 | -1;
      this.nextFlipAt = time + BLOOMHEART_STALK_FLIP_MS;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const radX = dx / dist;
    const radY = dy / dist;
    const tanX = -radY * this.circleDir;
    const tanY = radX * this.circleDir;
    // Close in only when farther than the standoff; otherwise hold range and
    // circle. The tangential term is always present, so the boss is never
    // perfectly static even when it's sitting at its preferred distance.
    const approach = dist > BLOOMHEART_STALK_STANDOFF ? 1 : 0;
    const speed =
      this.currentPhase >= 2 ? BLOOMHEART_STALK_SPEED_P2 : BLOOMHEART_STALK_SPEED_P1;
    let vx = (radX * approach + tanX * BLOOMHEART_STALK_CIRCLE_RATIO) * speed;
    let vy = (radY * approach + tanY * BLOOMHEART_STALK_CIRCLE_RATIO) * speed;

    // Leash to the first vignette ring: at/beyond the boundary, cancel any
    // outward velocity + add a gentle inward pull, so she slides ALONG the
    // ring (chasing the player tangentially) instead of crossing it.
    const lx = (this.x - this.leashCx) / this.leashRx;
    const ly = (this.y - this.leashCy) / this.leashRy;
    if (lx * lx + ly * ly >= 1) {
      let nx = lx / this.leashRx;
      let ny = ly / this.leashRy;
      const nlen = Math.hypot(nx, ny) || 1;
      nx /= nlen;
      ny /= nlen;
      const outward = vx * nx + vy * ny;
      if (outward > 0) {
        vx -= outward * nx;
        vy -= outward * ny;
      }
      vx -= nx * speed * 0.6;
      vy -= ny * speed * 0.6;
    }
    this.setVelocity(vx, vy);

    // Hard backstop so she can never be left visibly past the ring.
    const clamped = this.clampToLeash(this.x, this.y);
    if (clamped.x !== this.x || clamped.y !== this.y) {
      this.setPosition(clamped.x, clamped.y);
    }
  }

  /** Clamp a point to within the leash ellipse (the first vignette ring). */
  private clampToLeash(x: number, y: number): { x: number; y: number } {
    const ex = (x - this.leashCx) / this.leashRx;
    const ey = (y - this.leashCy) / this.leashRy;
    const norm = ex * ex + ey * ey;
    if (norm <= 1) return { x, y };
    const s = 1 / Math.sqrt(norm);
    return {
      x: this.leashCx + (x - this.leashCx) * s,
      y: this.leashCy + (y - this.leashCy) * s,
    };
  }

  // --- Petal fan (both phases) -----------------------------------------------

  private tickFan(time: number): void {
    if (!this.fanTelegraphScheduled && time >= this.nextFanAt - BLOOMHEART_FAN_TELEGRAPH_MS) {
      this.fanTelegraphScheduled = true;
      EventBus.emit('enemy:charge');
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: BLOOMHEART_VISUAL_SCALE * 1.18,
        scaleY: BLOOMHEART_VISUAL_SCALE * 1.18,
        duration: BLOOMHEART_FAN_TELEGRAPH_MS,
        ease: 'Sine.Out',
      });
    }
    if (time < this.nextFanAt) return;

    const player = this.host.getPlayer();
    if (player.active) {
      const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
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
    this.fanTelegraphScheduled = false;
    this.nextFanAt =
      time +
      (this.currentPhase >= 2
        ? BLOOMHEART_PHASE2_FAN_INTERVAL_MS
        : BLOOMHEART_PHASE1_FAN_INTERVAL_MS);
  }

  // --- Spore mine (both phases) ----------------------------------------------

  private tickSpore(time: number): void {
    if (time < this.nextSporeAt) return;
    this.nextSporeAt =
      time +
      (this.currentPhase >= 2
        ? BLOOMHEART_PHASE2_SPORE_INTERVAL_MS
        : BLOOMHEART_PHASE1_SPORE_INTERVAL_MS);

    const player = this.host.getPlayer();
    if (!player.active) return;

    const burstCount =
      this.currentPhase >= 2 ? BLOOMHEART_SPORE_BURST_COUNT_P2 : BLOOMHEART_SPORE_BURST_COUNT_P1;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy);
    const dirX = len > 0.01 ? dx / len : 1;
    const dirY = len > 0.01 ? dy / len : 0;
    const startX = this.x;
    const startY = this.y;

    const spore = this.scene.add
      .circle(startX, startY, 6, 0xb070ff, 1)
      .setDepth(DepthLayers.Particle);
    const halo = this.scene.add
      .circle(startX, startY, 10, 0xb070ff, 0.35)
      .setDepth(DepthLayers.Particle);

    const distance = (BLOOMHEART_SPORE_SPEED * BLOOMHEART_SPORE_LIFETIME_MS) / 1000;
    const targetX = startX + dirX * distance;
    const targetY = startY + dirY * distance;
    const tween = this.scene.tweens.add({
      targets: [spore, halo],
      x: targetX,
      y: targetY,
      duration: BLOOMHEART_SPORE_LIFETIME_MS,
      ease: 'Sine.Out',
      onComplete: () => {
        this.activeSpores = this.activeSpores.filter((e) => e.spore !== spore);
        if (!this.active || !this.scene) {
          spore.destroy();
          halo.destroy();
          return;
        }
        const baseOffset = Math.random() * Math.PI * 2;
        for (let i = 0; i < burstCount; i++) {
          const a = baseOffset + (i / burstCount) * Math.PI * 2;
          this.host.enemyProjectilePool.fire(
            spore.x,
            spore.y,
            Math.cos(a) * ENEMY_PROJECTILE_SPEED,
            Math.sin(a) * ENEMY_PROJECTILE_SPEED,
          );
        }
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
    this.activeSpores.push({ spore, halo, tween });
  }

  // --- Bloom Burst (Phase 2 signature) ---------------------------------------

  /**
   * The flower "opens": freeze, draw faint petal-preview lines (skipping the
   * gap slots so the safe lane is readable BEFORE the burst), then fire a
   * radial with that contiguous gap. The gap guarantees a reachable escape.
   */
  private beginBloomBurst(time: number): void {
    this.bloomCharging = true;
    this.setVelocity(0, 0);
    this.nextBloomAt = time + BLOOMHEART_BLOOM_INTERVAL_MS;
    EventBus.emit('enemy:charge');

    this.setTintFill(0xff66cc);
    this.scene.time.delayedCall(BLOOMHEART_BLOOM_TELEGRAPH_MS, () => {
      if (this.active) this.clearTint();
    });

    const count = BLOOMHEART_BLOOM_THORNS;
    const gapStart = Math.floor(Math.random() * count);

    // Petal-preview: faint lines in each firing direction (gap omitted).
    const preview = this.scene.add.graphics().setDepth(DepthLayers.FloorDecoration + 1);
    const cx = this.x;
    const cy = this.y;
    preview.lineStyle(3, 0xff80d0, 0.5);
    for (let i = 0; i < count; i++) {
      if (this.isGapSlot(i, gapStart)) continue;
      const a = (i / count) * Math.PI * 2;
      preview.beginPath();
      preview.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
      preview.lineTo(cx + Math.cos(a) * 64, cy + Math.sin(a) * 64);
      preview.strokePath();
    }
    this.scene.tweens.add({
      targets: preview,
      alpha: { from: 0.4, to: 0.95 },
      duration: BLOOMHEART_BLOOM_TELEGRAPH_MS,
      ease: 'Sine.In',
    });
    this.bloomTelegraphs.push(preview);

    this.scene.time.delayedCall(BLOOMHEART_BLOOM_TELEGRAPH_MS, () => {
      this.bloomTelegraphs = this.bloomTelegraphs.filter((g) => g !== preview);
      this.scene.tweens.killTweensOf(preview);
      preview.destroy();
      if (!this.active || !this.scene) return;
      this.fireGappedRadial(this.x, this.y, count, gapStart);
      this.bloomCharging = false;
    });
  }

  private isGapSlot(i: number, gapStart: number): boolean {
    return (i - gapStart + BLOOMHEART_BLOOM_THORNS) % BLOOMHEART_BLOOM_THORNS < BLOOMHEART_BLOOM_GAP_SLOTS;
  }

  /** Radial of `count` thorns from (cx,cy) with a contiguous gap at gapStart. */
  private fireGappedRadial(cx: number, cy: number, count: number, gapStart: number): void {
    for (let i = 0; i < count; i++) {
      if (this.isGapSlot(i, gapStart)) continue;
      const a = (i / count) * Math.PI * 2;
      this.host.enemyProjectilePool.fire(
        cx,
        cy,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  // --- Sink & Re-Bloom relocate (Phase 2 anti-corner) ------------------------

  private beginSink(): void {
    this.sinking = true;
    this.setVelocity(0, 0);
    EventBus.emit('enemy:charge');
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: BLOOMHEART_VISUAL_SCALE * 0.45,
      scaleY: BLOOMHEART_VISUAL_SCALE * 0.2,
      duration: BLOOMHEART_SINK_FADE_MS,
      ease: 'Sine.In',
      onComplete: () => {
        if (!this.active || !this.scene) return;
        const dest = this.pickReemergeSpot();
        this.setPosition(dest.x, dest.y);
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        body?.reset(dest.x, dest.y);
        this.scene.cameras.main.shake(160, 0.004);
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          scaleX: BLOOMHEART_VISUAL_SCALE,
          scaleY: BLOOMHEART_VISUAL_SCALE,
          duration: BLOOMHEART_SINK_FADE_MS,
          ease: 'Back.Out',
          onComplete: () => {
            this.sinking = false;
            const gapStart = Math.floor(Math.random() * BLOOMHEART_BLOOM_THORNS);
            this.fireGappedRadial(this.x, this.y, BLOOMHEART_BLOOM_THORNS, gapStart);
            this.nextSinkAt = this.scene.time.now + BLOOMHEART_SINK_INTERVAL_MS;
          },
        });
      },
    });
  }

  /**
   * Pick a re-emerge spot at REBLOOM_DIST around the player, clamped to room
   * bounds, guaranteed ≥ SINK_MIN_PLAYER_DIST (3 tiles) away — never surfaces
   * on top of the player (same safe-zone pattern as the Vine Lord burrow).
   */
  private pickReemergeSpot(): { x: number; y: number } {
    const player = this.host.getPlayer();
    const bounds = this.host.getRoomBounds();
    const margin = 80;
    const minDistSq = BLOOMHEART_SINK_MIN_PLAYER_DIST * BLOOMHEART_SINK_MIN_PLAYER_DIST;
    const clampX = (x: number): number =>
      Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, x));
    const clampY = (y: number): number =>
      Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, y));

    const candidates: { x: number; y: number }[] = [];
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < 12; i++) {
      const a = baseAngle + (i / 12) * Math.PI * 2;
      // Confine the re-emerge spot to the leash ring first, then to the room
      // bounds — she never surfaces past the ring either.
      const leashed = this.clampToLeash(
        player.x + Math.cos(a) * BLOOMHEART_REBLOOM_DIST,
        player.y + Math.sin(a) * BLOOMHEART_REBLOOM_DIST,
      );
      candidates.push({ x: clampX(leashed.x), y: clampY(leashed.y) });
    }
    const safe = candidates.filter((c) => {
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      return dx * dx + dy * dy >= minDistSq;
    });
    if (safe.length > 0) {
      return safe[Math.floor(Math.random() * safe.length)]!;
    }
    let best = candidates[0]!;
    let bestSq = -1;
    for (const c of candidates) {
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > bestSq) {
        bestSq = distSq;
        best = c;
      }
    }
    return best;
  }

  // --- Cleanup / phases ------------------------------------------------------

  private clearSpores(): void {
    for (const { spore, halo, tween } of this.activeSpores) {
      tween.stop();
      spore.destroy();
      halo.destroy();
    }
    this.activeSpores = [];
  }

  private clearBloomTelegraphs(): void {
    for (const g of this.bloomTelegraphs) {
      this.scene.tweens.killTweensOf(g);
      g.destroy();
    }
    this.bloomTelegraphs = [];
  }

  protected override die(): void {
    this.clearSpores();
    this.clearBloomTelegraphs();
    // Kill any in-flight tween on the boss (e.g. a sink fade) so it can't fight
    // the death tween super.die() is about to start.
    this.scene.tweens.killTweensOf(this);
    super.die();
  }

  override destroy(fromScene?: boolean): void {
    this.clearSpores();
    this.clearBloomTelegraphs();
    super.destroy(fromScene);
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setScale(BLOOMHEART_VISUAL_SCALE);
    this.setAlpha(1);
    this.setTintFill(0xff66cc);
    this.scene.time.delayedCall(BLOOMHEART_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    const now = this.scene.time.now;
    // Stagger the three Phase-2 timers so they don't all open at once.
    this.nextSporeAt = now + 700;
    this.nextBloomAt = now + 1800;
    this.nextSinkAt = now + BLOOMHEART_SINK_INTERVAL_MS;
  }
}
