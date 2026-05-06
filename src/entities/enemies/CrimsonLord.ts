import type Phaser from 'phaser';
import {
  CRIMSON_LORD_BLOOD_TRAIL_DROPS,
  CRIMSON_LORD_CHASE_SPEED,
  CRIMSON_LORD_DASH_DURATION_MS,
  CRIMSON_LORD_DASH_GAP_PHASE1_MS,
  CRIMSON_LORD_DASH_GAP_PHASE2_MS,
  CRIMSON_LORD_DASH_GAP_PHASE3_MS,
  CRIMSON_LORD_DASH_RECOVERY_MS,
  CRIMSON_LORD_DASH_SPEED,
  CRIMSON_LORD_DASH_TELEGRAPH_MS,
  CRIMSON_LORD_VISUAL_SCALE,
  VAMPIRE_PHASE_FLASH_MS,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type BloodTrailGroup } from '../hazards/BloodTrailGroup';
import { type Player } from '../Player';
import { VampireBody } from './VampireBody';

/**
 * Host adapter for the Crimson Lord — needs the player (chase target) +
 * a blood-trail pool for the Phase 2+ dash trail.
 */
export interface CrimsonLordHost {
  getPlayer(): Player;
  bloodTrailGroup: BloodTrailGroup;
}

type DashState = 'idle' | 'telegraph' | 'dashing' | 'recovering';

/**
 * Crimson Lord — melee vampire warrior. State machine:
 *   idle (chase player) → telegraph (stop, flash) → dashing (charge through) →
 *   recovering (stop, vulnerable) → idle.
 *
 * Phase 1 (paired with Sapphire Marquis): standard dash cycle.
 * Phase 2 (Marquis dead, soloMode=true): tighter cycle + drops blood-trail
 *   hazards along the dash path.
 * Phase 3 (berserker, ≤30% HP): no telegraph, dash spam, no chase between
 *   dashes — silhouette + dash line is the only pattern.
 */
export class CrimsonLord extends VampireBody {
  override readonly displayName = 'Crimson Lord';
  override readonly maxHp = ENEMIES['boss-crimson-lord'].hp;

  private readonly host: CrimsonLordHost;
  private dashState: DashState = 'idle';
  /** Scene-time at which the current state ends (transitions to the next). */
  private stateEndsAt = 0;
  /** Cached dash direction (unit vector), set on telegraph entry. */
  private dashDirX = 0;
  private dashDirY = 0;
  /** Distance between blood-trail drops along the dash, computed per dash. */
  private trailNextDropAt = 0;
  private trailDropsRemaining = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, host: CrimsonLordHost) {
    super(scene, x, y, ENEMIES['boss-crimson-lord']);
    this.host = host;
    this.setScale(CRIMSON_LORD_VISUAL_SCALE);

    // Initial idle gap so both bodies don't dash on frame 1.
    this.stateEndsAt = scene.time.now + 800;
  }

  protected tickAI(time: number): void {
    const player = this.host.getPlayer();
    if (!player.active) return;

    switch (this.dashState) {
      case 'idle':
        this.tickIdle(time, player);
        break;
      case 'telegraph':
        this.tickTelegraph(time);
        break;
      case 'dashing':
        this.tickDashing(time);
        break;
      case 'recovering':
        this.tickRecovering(time);
        break;
    }
  }

  // --- States --------------------------------------------------------------

  private tickIdle(time: number, player: Player): void {
    // Berserker skips chase + telegraph: just dash on the cycle gap.
    if (this.berserkerEntered) {
      if (time >= this.stateEndsAt) this.beginDash(time, player);
      return;
    }

    // Chase: head toward the player at chase speed.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) {
      this.setVelocity(
        (dx / len) * CRIMSON_LORD_CHASE_SPEED,
        (dy / len) * CRIMSON_LORD_CHASE_SPEED,
      );
    } else {
      this.setVelocity(0, 0);
    }

    if (time >= this.stateEndsAt) this.beginTelegraph(time, player);
  }

  private beginTelegraph(time: number, player: Player): void {
    this.dashState = 'telegraph';
    this.setVelocity(0, 0);
    // Lock dash direction NOW so the player has the full telegraph window
    // to step out of the line.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.5) {
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;
    } else {
      this.dashDirX = 1;
      this.dashDirY = 0;
    }
    this.stateEndsAt = time + CRIMSON_LORD_DASH_TELEGRAPH_MS;

    // Visual flash — body alpha pulse to read as "incoming dash".
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.55 },
      duration: CRIMSON_LORD_DASH_TELEGRAPH_MS / 2,
      yoyo: true,
      onComplete: () => {
        if (this.active) this.setAlpha(1);
      },
    });
  }

  private tickTelegraph(time: number): void {
    if (time >= this.stateEndsAt) this.beginDash(time, this.host.getPlayer());
  }

  private beginDash(time: number, player: Player): void {
    this.dashState = 'dashing';
    // Berserker re-aims direction at dash start (no telegraph window above
    // already cached the direction). Locks last-second trajectory which
    // makes berserker feel snappier without homing.
    if (this.berserkerEntered) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0.5) {
        this.dashDirX = dx / len;
        this.dashDirY = dy / len;
      }
    }
    this.setVelocity(
      this.dashDirX * CRIMSON_LORD_DASH_SPEED,
      this.dashDirY * CRIMSON_LORD_DASH_SPEED,
    );
    this.stateEndsAt = time + CRIMSON_LORD_DASH_DURATION_MS;

    // Plan blood-trail drops for Phase 2+ (soloMode OR berserker — a Lord
    // that hits berserker before the Marquis dies still drops trail since
    // the boss's threat budget is asymmetrically loaded onto him).
    if (this.soloMode || this.berserkerEntered) {
      this.trailDropsRemaining = CRIMSON_LORD_BLOOD_TRAIL_DROPS;
      // First drop fires after a small delay (so it doesn't spawn under the
      // body's start position right on top of itself).
      const interval = CRIMSON_LORD_DASH_DURATION_MS / (CRIMSON_LORD_BLOOD_TRAIL_DROPS + 1);
      this.trailNextDropAt = time + interval;
    } else {
      this.trailDropsRemaining = 0;
    }
  }

  private tickDashing(time: number): void {
    // Velocity stays at dash speed (set in beginDash) — Phaser carries it
    // until the next setVelocity call.
    if (this.trailDropsRemaining > 0 && time >= this.trailNextDropAt) {
      this.host.bloodTrailGroup.spawn(this.x, this.y, time);
      this.trailDropsRemaining--;
      const interval = CRIMSON_LORD_DASH_DURATION_MS / (CRIMSON_LORD_BLOOD_TRAIL_DROPS + 1);
      this.trailNextDropAt = time + interval;
    }
    if (time >= this.stateEndsAt) this.beginRecover(time);
  }

  private beginRecover(time: number): void {
    this.dashState = 'recovering';
    this.setVelocity(0, 0);
    // Berserker has a near-zero recovery; Phase 1/2 use the standard window.
    const recovery = this.berserkerEntered ? 100 : CRIMSON_LORD_DASH_RECOVERY_MS;
    this.stateEndsAt = time + recovery;
  }

  private tickRecovering(time: number): void {
    if (time >= this.stateEndsAt) this.beginIdle(time);
  }

  private beginIdle(time: number): void {
    this.dashState = 'idle';
    let gap = CRIMSON_LORD_DASH_GAP_PHASE1_MS;
    if (this.berserkerEntered) gap = CRIMSON_LORD_DASH_GAP_PHASE3_MS;
    else if (this.soloMode) gap = CRIMSON_LORD_DASH_GAP_PHASE2_MS;
    this.stateEndsAt = time + gap;
  }

  // --- Phase hooks ---------------------------------------------------------

  protected override onEnterSoloMode(): void {
    this.flashPhaseTransition(0xff80a0);
    this.scene.cameras.main.shake(180, 0.005);
  }

  protected override enterBerserker(): void {
    this.flashPhaseTransition(0xffd040);
    this.scene.cameras.main.shake(260, 0.008);
    // Reset the cycle so the berserker pattern starts fresh — kicks in the
    // very next frame regardless of where in the previous cycle we were.
    this.dashState = 'idle';
    this.stateEndsAt = this.scene.time.now;
  }

  private flashPhaseTransition(color: number): void {
    this.setTintFill(color);
    this.scene.time.delayedCall(VAMPIRE_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
  }
}
