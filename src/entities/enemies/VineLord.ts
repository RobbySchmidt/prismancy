import type Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_SPEED,
  VINE_LORD_BURROW_FADE_MS,
  VINE_LORD_BURROW_INTERVAL_MS,
  VINE_LORD_BURROW_MIN_PLAYER_DIST,
  VINE_LORD_BURROW_REEMERGE_DIST,
  VINE_LORD_CREEP_SPEED_P1,
  VINE_LORD_CREEP_SPEED_P2,
  VINE_LORD_ERUPT_INTERVAL_P1,
  VINE_LORD_ERUPT_INTERVAL_P2,
  VINE_LORD_ERUPT_OFFSET,
  VINE_LORD_ERUPT_RADIUS,
  VINE_LORD_ERUPT_TELEGRAPH_MS,
  VINE_LORD_ERUPT_THORNS,
  VINE_LORD_FAN_INTERVAL_P1,
  VINE_LORD_FAN_INTERVAL_P2,
  VINE_LORD_FAN_SPREAD_RAD,
  VINE_LORD_FAN_THORNS,
  VINE_LORD_FIRE_INITIAL_DELAY_MS,
  VINE_LORD_PHASE_FLASH_MS,
  VINE_LORD_VISUAL_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { ENEMIES } from '../../data/enemies';
import { EventBus } from '../../utils/EventBus';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

/**
 * Adapter so VineLord can read the player + room bounds + projectile pool
 * without grabbing GameScene directly. Implemented by GameScene at
 * construction time. (Kept compatible with the old host shape — `spawnEnemyAt`
 * is no longer used by the rework but other bosses still share the signature.)
 */
export interface VineLordHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

/** A pending ground eruption — warn-ring visual + its scheduled burst timer. */
interface PendingEruption {
  ring: Phaser.GameObjects.Arc;
  timer: Phaser.Time.TimerEvent;
}

/**
 * Vine Lord — Emerald Forest boss, "Burrower" rework. No longer a rooted
 * turret: it CREEPS toward the player while firing an aimed 5-thorn fan, and
 * periodically erupts a telegraphed ring of thorns from the ground under the
 * player's feet (warn-ring → radial burst). Phase 2 (≤ 50% HP) speeds the
 * creep + cadence up and adds a burrow-relocate: it dives underground and
 * re-surfaces at a flank of the player so it can't be kited into a corner.
 * The add-summoning was dropped — its threat is movement + ground control.
 */
export class VineLord extends BossEnemy {
  override readonly displayName = 'Vine Lord';
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: VineLordHost;
  private nextFanAt: number;
  private nextEruptAt: number;
  private nextBurrowAt = Number.POSITIVE_INFINITY;
  /** While burrowing the creep + attacks pause and the body is parked. */
  private burrowing = false;
  private readonly pendingEruptions: PendingEruption[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, host: VineLordHost) {
    super(scene, x, y, ENEMIES['boss-vine-lord']);
    this.host = host;
    const now = scene.time.now;
    this.nextFanAt = now + VINE_LORD_FIRE_INITIAL_DELAY_MS;
    // Hold the FIRST eruption back past the opening fan — an eruption-tell
    // landing on a player who just walked in (still orienting) read as unfair
    // (user 2026-06-13). The fan is always the opener; the eruption joins from
    // the second attack on, then keeps its normal cadence.
    this.nextEruptAt =
      now + VINE_LORD_FIRE_INITIAL_DELAY_MS + VINE_LORD_FAN_INTERVAL_P1 + 300;

    // Mobile now — let the arcade body move + collide with the room.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);
    body.moves = true;

    this.setScale(VINE_LORD_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (this.burrowing) return;

    if (this.currentPhase >= 2 && time >= this.nextBurrowAt) {
      this.beginBurrow();
      return;
    }

    this.creepTowardPlayer();

    if (time >= this.nextFanAt) {
      this.fireAimedFan();
      this.nextFanAt =
        time + (this.currentPhase >= 2 ? VINE_LORD_FAN_INTERVAL_P2 : VINE_LORD_FAN_INTERVAL_P1);
    }

    if (time >= this.nextEruptAt) {
      this.beginEruption();
      this.nextEruptAt =
        time + (this.currentPhase >= 2 ? VINE_LORD_ERUPT_INTERVAL_P2 : VINE_LORD_ERUPT_INTERVAL_P1);
    }
  }

  private creepTowardPlayer(): void {
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
    const speed = this.currentPhase >= 2 ? VINE_LORD_CREEP_SPEED_P2 : VINE_LORD_CREEP_SPEED_P1;
    this.setVelocity((dx / len) * speed, (dy / len) * speed);
  }

  /** Aimed fan: centre + symmetric pairs at ±FAN_SPREAD per step. */
  private fireAimedFan(): void {
    const player = this.host.getPlayer();
    if (!player.active) return;
    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const half = (VINE_LORD_FAN_THORNS - 1) / 2;
    for (let i = 0; i < VINE_LORD_FAN_THORNS; i++) {
      const a = baseAngle + (i - half) * VINE_LORD_FAN_SPREAD_RAD;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  /**
   * Telegraphed ground eruption: drop a pulsing warn-ring at the player's
   * current position, then after ERUPT_TELEGRAPH_MS fire a radial thorn burst
   * from that spot. The marker gives the player a clear "move off this tile"
   * cue (same fairness pattern as the Prismarch inward-wave markers).
   */
  private beginEruption(): void {
    const player = this.host.getPlayer();
    if (!player.active) return;
    // Nudge the marker off the player's exact spot so the tell never spawns
    // dead-on-top of them — combined with the thinned 6-thorn ring (clear
    // ~60° gaps), stepping off the marker is always a safe escape.
    const offAngle = Math.random() * Math.PI * 2;
    const ex = player.x + Math.cos(offAngle) * VINE_LORD_ERUPT_OFFSET;
    const ey = player.y + Math.sin(offAngle) * VINE_LORD_ERUPT_OFFSET;
    EventBus.emit('enemy:charge');

    const ring = this.scene.add
      .circle(ex, ey, VINE_LORD_ERUPT_RADIUS, 0x6effa0, 0.12)
      .setStrokeStyle(2, 0x9effb0, 0.9)
      .setDepth(DepthLayers.FloorDecoration + 1);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.4, to: 1 },
      alpha: { from: 0.35, to: 0.9 },
      duration: VINE_LORD_ERUPT_TELEGRAPH_MS,
      ease: 'Sine.In',
    });

    const timer = this.scene.time.delayedCall(VINE_LORD_ERUPT_TELEGRAPH_MS, () => {
      this.removePending(timer);
      ring.destroy();
      if (!this.active) return;
      const baseOffset = Math.random() * Math.PI * 2;
      for (let i = 0; i < VINE_LORD_ERUPT_THORNS; i++) {
        const a = baseOffset + (i / VINE_LORD_ERUPT_THORNS) * Math.PI * 2;
        this.host.enemyProjectilePool.fire(
          ex,
          ey,
          Math.cos(a) * ENEMY_PROJECTILE_SPEED,
          Math.sin(a) * ENEMY_PROJECTILE_SPEED,
        );
      }
    });
    this.pendingEruptions.push({ ring, timer });
  }

  private removePending(timer: Phaser.Time.TimerEvent): void {
    const idx = this.pendingEruptions.findIndex((p) => p.timer === timer);
    if (idx >= 0) this.pendingEruptions.splice(idx, 1);
  }

  /** Phase 2: dive underground, re-surface at a flank of the player. */
  private beginBurrow(): void {
    this.burrowing = true;
    this.setVelocity(0, 0);
    EventBus.emit('enemy:charge');
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: VINE_LORD_VISUAL_SCALE * 0.6,
      scaleY: VINE_LORD_VISUAL_SCALE * 0.3,
      duration: VINE_LORD_BURROW_FADE_MS,
      ease: 'Sine.In',
      onComplete: () => {
        if (!this.active) return;
        const dest = this.pickReemergeSpot();
        this.setPosition(dest.x, dest.y);
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        body?.reset(dest.x, dest.y);
        this.scene.cameras.main.shake(140, 0.004);
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          scaleX: VINE_LORD_VISUAL_SCALE,
          scaleY: VINE_LORD_VISUAL_SCALE,
          duration: VINE_LORD_BURROW_FADE_MS,
          ease: 'Back.Out',
          onComplete: () => {
            this.burrowing = false;
            const now = this.scene.time.now;
            this.nextBurrowAt = now + VINE_LORD_BURROW_INTERVAL_MS;
            // Re-surface punctuated with an immediate radial burst.
            const baseOffset = Math.random() * Math.PI * 2;
            for (let i = 0; i < VINE_LORD_ERUPT_THORNS; i++) {
              const a = baseOffset + (i / VINE_LORD_ERUPT_THORNS) * Math.PI * 2;
              this.host.enemyProjectilePool.fire(
                this.x,
                this.y,
                Math.cos(a) * ENEMY_PROJECTILE_SPEED,
                Math.sin(a) * ENEMY_PROJECTILE_SPEED,
              );
            }
          },
        });
      },
    });
  }

  /**
   * Pick a re-emerge spot at REEMERGE_DIST around the player, clamped to room
   * bounds. Guarantees the result is at least BURROW_MIN_PLAYER_DIST (3 tiles)
   * from the player — the old version returned the first in-bounds angle (and
   * fell back to room center, which could be right next to a centred player),
   * so the boss occasionally surfaced on top of you. Now: keep only clamped
   * candidates that are still ≥ min distance and pick one at random; if none
   * qualify (player jammed in a tight spot), best-effort the farthest one.
   */
  private pickReemergeSpot(): { x: number; y: number } {
    const player = this.host.getPlayer();
    const bounds = this.host.getRoomBounds();
    const margin = 70;
    const minDistSq = VINE_LORD_BURROW_MIN_PLAYER_DIST * VINE_LORD_BURROW_MIN_PLAYER_DIST;
    const clampX = (x: number): number =>
      Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, x));
    const clampY = (y: number): number =>
      Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, y));

    const candidates: { x: number; y: number }[] = [];
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < 12; i++) {
      const a = baseAngle + (i / 12) * Math.PI * 2;
      candidates.push({
        x: clampX(player.x + Math.cos(a) * VINE_LORD_BURROW_REEMERGE_DIST),
        y: clampY(player.y + Math.sin(a) * VINE_LORD_BURROW_REEMERGE_DIST),
      });
    }

    const safe = candidates.filter((c) => {
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      return dx * dx + dy * dy >= minDistSq;
    });
    if (safe.length > 0) {
      return safe[Math.floor(Math.random() * safe.length)]!;
    }
    // Best effort: the farthest clamped candidate from the player.
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

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.setTintFill(0x9effb0);
    this.scene.time.delayedCall(VINE_LORD_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
    // First burrow ~1.4 s after the transition so the player gets a beat.
    this.nextBurrowAt = this.scene.time.now + 1400;
  }

  protected override die(): void {
    // Clean up any pending eruption warn-rings + their timers so a death
    // mid-telegraph doesn't leave a ghost ring on the floor (the timer's
    // own `this.active` guard would skip the ring.destroy()).
    for (const p of this.pendingEruptions) {
      p.timer.remove(false);
      p.ring.destroy();
    }
    this.pendingEruptions.length = 0;
    super.die();
  }
}
