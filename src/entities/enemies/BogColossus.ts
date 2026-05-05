import type Phaser from 'phaser';
import {
  BOG_COLOSSUS_INITIAL_DELAY_MS,
  BOG_COLOSSUS_PHASE1_BURST_THORNS,
  BOG_COLOSSUS_PHASE1_CYCLE_MS,
  BOG_COLOSSUS_PHASE1_SECOND_WAVE_DELAY_MS,
  BOG_COLOSSUS_PHASE1_SECOND_WAVE_SPEED_FACTOR,
  BOG_COLOSSUS_PHASE1_WALK_FIRE_INTERVAL_MS,
  BOG_COLOSSUS_PHASE1_WALK_FIRE_SPEED,
  BOG_COLOSSUS_PHASE1_WALK_SPEED,
  BOG_COLOSSUS_PHASE2_AIMED_INTERVAL_MS,
  BOG_COLOSSUS_PHASE2_AIMED_SPEED,
  BOG_COLOSSUS_PHASE2_CYCLE_MS,
  BOG_COLOSSUS_PHASE2_INNER_RADIUS,
  BOG_COLOSSUS_PHASE2_INNER_SPEED_RAD,
  BOG_COLOSSUS_PHASE2_INNER_THORNS,
  BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS,
  BOG_COLOSSUS_PHASE2_ORBIT_RADIUS,
  BOG_COLOSSUS_PHASE2_ORBIT_RELEASE_SPEED,
  BOG_COLOSSUS_PHASE2_ORBIT_SPEED_RAD,
  BOG_COLOSSUS_PHASE2_ORBIT_THORNS,
  BOG_COLOSSUS_PHASE2_WALK_FIRE_INTERVAL_MS,
  BOG_COLOSSUS_PHASE2_WALK_SPEED,
  BOG_COLOSSUS_PHASE_FLASH_MS,
  BOG_COLOSSUS_SHELL_DURATION_MS,
  BOG_COLOSSUS_VISUAL_SCALE,
  ENEMY_PROJECTILE_SPEED,
} from '../../config/GameConfig';
import { ENEMIES } from '../../data/enemies';
import { type Vector2 } from '../../types';
import { type EnemyProjectile } from '../projectiles/EnemyProjectile';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { BossEnemy, type BossPhaseDefinition } from './BossEnemy';

export interface BogColossusHost {
  enemyProjectilePool: EnemyProjectilePool;
  getPlayer(): Player;
}

type WalkState = 'walk' | 'shell';

interface OrbitingThorn {
  projectile: EnemyProjectile;
  angle: number;
  radius: number;
  /** Angular velocity in rad/s. Positive = clockwise (in screen-space). */
  angularSpeed: number;
}

/**
 * Bog Colossus — Sapphire Swamp boss based on Bog Tortoise. Slow walker
 * that periodically retracts into its shell (invulnerable + stationary)
 * then pops out with a radial-thorn burst. Phase 2 (≤ 50 % HP) replaces
 * the burst with 6 thorns that orbit the boss for ~1.8 s before releasing
 * outward — the player has to position around the rotating ring rather
 * than just dodge a one-frame radial.
 *
 * The shell phase rejects damage (mirrors the Bog Tortoise mob); a small
 * spark particle plays at the hit so the player can read the block.
 */
export class BogColossus extends BossEnemy {
  override readonly displayName = 'Bog Colossus';
  override readonly maxHp = ENEMIES['boss-bog-colossus'].hp;
  protected override readonly phases: readonly BossPhaseDefinition[] = [
    { hpThresholdFraction: 0.5, phaseIndex: 2 },
  ];

  private readonly host: BogColossusHost;
  private walkState: WalkState = 'walk';
  private nextStateChangeAt: number;
  private invulnerable = false;
  /** Active orbiting thorns (phase 2 only). Updated each tick. */
  private orbitingThorns: OrbitingThorn[] = [];
  /** Phase 2 only: while > 0, fire an aimed thorn at the player on a timer. */
  private aimedFireUntil = 0;
  private nextAimedFireAt = 0;
  /** Walk-snipe timer — phase-aware cadence (P1 slow, P2 fast). */
  private nextWalkFireAt: number;

  constructor(scene: Phaser.Scene, x: number, y: number, host: BogColossusHost) {
    super(scene, x, y, ENEMIES['boss-bog-colossus']);
    this.host = host;
    this.nextStateChangeAt = scene.time.now + BOG_COLOSSUS_INITIAL_DELAY_MS;
    // First snipe lands ~half a walk cycle into the fight so the player has
    // time to read the boss before getting shot at.
    this.nextWalkFireAt =
      scene.time.now + BOG_COLOSSUS_INITIAL_DELAY_MS + BOG_COLOSSUS_PHASE1_WALK_FIRE_INTERVAL_MS / 2;
    this.setScale(BOG_COLOSSUS_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (this.walkState === 'walk') {
      this.tickWalk();
      this.tickWalkSniper(time);
      if (time >= this.nextStateChangeAt) this.beginShell(time);
    } else {
      // Shell phase: hold position; pop on timeout.
      this.setVelocity(0, 0);
      if (time >= this.nextStateChangeAt) this.popOut(time);
    }
    this.tickOrbitingThorns();
    this.tickAimedFire(time);
  }

  /**
   * Snipes an aimed thorn at the player during the walk phase. Phase 1 uses
   * a slow cadence; Phase 2 uses a faster one. We skip while the orbit-ring
   * aimed-fire window is open so the patterns don't double up.
   */
  private tickWalkSniper(time: number): void {
    if (time < this.nextWalkFireAt) return;
    if (time <= this.aimedFireUntil) {
      // Orbit-ring aimed fire is already covering this window — defer.
      this.nextWalkFireAt = this.aimedFireUntil + 100;
      return;
    }
    const player = this.host.getPlayer();
    if (!player.active) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      (dx / len) * BOG_COLOSSUS_PHASE1_WALK_FIRE_SPEED,
      (dy / len) * BOG_COLOSSUS_PHASE1_WALK_FIRE_SPEED,
    );
    const interval =
      this.currentPhase >= 2
        ? BOG_COLOSSUS_PHASE2_WALK_FIRE_INTERVAL_MS
        : BOG_COLOSSUS_PHASE1_WALK_FIRE_INTERVAL_MS;
    this.nextWalkFireAt = time + interval;
  }

  private tickWalk(): void {
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
    const speed =
      this.currentPhase >= 2 ? BOG_COLOSSUS_PHASE2_WALK_SPEED : BOG_COLOSSUS_PHASE1_WALK_SPEED;
    this.setVelocity((dx / len) * speed, (dy / len) * speed);
  }

  private beginShell(time: number): void {
    this.walkState = 'shell';
    this.invulnerable = true;
    this.setVelocity(0, 0);
    this.nextStateChangeAt = time + BOG_COLOSSUS_SHELL_DURATION_MS;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.65,
      duration: BOG_COLOSSUS_SHELL_DURATION_MS / 2,
      yoyo: true,
      ease: 'Sine.InOut',
    });
  }

  private popOut(time: number): void {
    this.invulnerable = false;
    this.setAlpha(1);
    this.walkState = 'walk';
    const cycle =
      this.currentPhase >= 2 ? BOG_COLOSSUS_PHASE2_CYCLE_MS : BOG_COLOSSUS_PHASE1_CYCLE_MS;
    this.nextStateChangeAt = time + (cycle - BOG_COLOSSUS_SHELL_DURATION_MS);

    if (this.currentPhase >= 2) {
      this.spawnOrbitingThorns();
    } else {
      this.firePhase1Burst();
    }
  }

  /**
   * Gungeon-style dual radial: wave 1 fires immediately at full speed; wave
   * 2 fires `SECOND_WAVE_DELAY_MS` later, offset by half a step (so it
   * threads the gaps in wave 1) and at `SECOND_WAVE_SPEED_FACTOR` speed.
   * The two rings expand at different rates, so dodging the first wave
   * doesn't clear the second — the player has to read both layers.
   */
  private firePhase1Burst(): void {
    const count = BOG_COLOSSUS_PHASE1_BURST_THORNS;
    const step = (Math.PI * 2) / count;
    const baseOffset = Math.random() * Math.PI * 2;
    // Wave 1
    for (let i = 0; i < count; i++) {
      const a = baseOffset + i * step;
      this.host.enemyProjectilePool.fire(
        this.x,
        this.y,
        Math.cos(a) * ENEMY_PROJECTILE_SPEED,
        Math.sin(a) * ENEMY_PROJECTILE_SPEED,
      );
    }
    // Wave 2 — capture origin so the offset ring spawns from the boss's
    // location at the moment of the first wave (he might have started
    // moving by the time the delayed callback runs, but the pattern still
    // reads as a layered burst from the original pop).
    const ox = this.x;
    const oy = this.y;
    const wave2Speed = ENEMY_PROJECTILE_SPEED * BOG_COLOSSUS_PHASE1_SECOND_WAVE_SPEED_FACTOR;
    this.scene.time.delayedCall(BOG_COLOSSUS_PHASE1_SECOND_WAVE_DELAY_MS, () => {
      if (!this.active) return;
      for (let i = 0; i < count; i++) {
        const a = baseOffset + i * step + step / 2;
        this.host.enemyProjectilePool.fire(
          ox,
          oy,
          Math.cos(a) * wave2Speed,
          Math.sin(a) * wave2Speed,
        );
      }
    });
  }

  /**
   * Phase 2: spawn two concentric thorn rings around the boss with zero
   * velocity, then `tickOrbitingThorns` repositions each thorn along its
   * own rotating circle every frame. Outer ring spins clockwise; inner ring
   * counter-rotates faster — the player has to read both layers. After
   * ORBIT_DURATION_MS all thorns release outward so they fly off and the
   * player has to escape the layered ring.
   */
  private spawnOrbitingThorns(): void {
    const baseOffset = Math.random() * Math.PI * 2;

    const spawnRing = (
      count: number,
      radius: number,
      angularSpeed: number,
      angleOffset: number,
    ): void => {
      for (let i = 0; i < count; i++) {
        const angle = angleOffset + (i / count) * Math.PI * 2;
        const px = this.x + Math.cos(angle) * radius;
        const py = this.y + Math.sin(angle) * radius;
        const projectile = this.host.enemyProjectilePool.fire(px, py, 0, 0);
        if (!projectile) continue;
        // Stretch the projectile lifetime so it survives the orbit. The
        // pool's default lifetime would expire mid-orbit otherwise.
        projectile.setLifetime(BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS + 4000);
        this.orbitingThorns.push({ projectile, angle, radius, angularSpeed });
      }
    };

    // Outer ring (clockwise, slower).
    spawnRing(
      BOG_COLOSSUS_PHASE2_ORBIT_THORNS,
      BOG_COLOSSUS_PHASE2_ORBIT_RADIUS,
      BOG_COLOSSUS_PHASE2_ORBIT_SPEED_RAD,
      baseOffset,
    );
    // Inner ring (counter-rotating, faster). Half-step phase offset so the
    // two rings don't line up radially at t=0.
    spawnRing(
      BOG_COLOSSUS_PHASE2_INNER_THORNS,
      BOG_COLOSSUS_PHASE2_INNER_RADIUS,
      BOG_COLOSSUS_PHASE2_INNER_SPEED_RAD,
      baseOffset + Math.PI / BOG_COLOSSUS_PHASE2_INNER_THORNS,
    );

    // Schedule release: at orbit-duration end, set velocities outward.
    this.scene.time.delayedCall(BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS, () => {
      this.releaseOrbitingThorns();
    });
    // Open the aimed-thorn window for the orbit duration so "stand outside the
    // ring" is no longer a free zone — the player has to dodge thrown thorns
    // while reading the rotating ring.
    this.aimedFireUntil = this.scene.time.now + BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS;
    this.nextAimedFireAt = this.scene.time.now + BOG_COLOSSUS_PHASE2_AIMED_INTERVAL_MS;
  }

  /**
   * Phase 2 overlay: while the orbit ring is active, periodically fire a thorn
   * straight at the player. Cheap aim — direction is computed at fire time.
   */
  private tickAimedFire(time: number): void {
    if (time > this.aimedFireUntil) return;
    if (time < this.nextAimedFireAt) return;
    const player = this.host.getPlayer();
    if (!player.active) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.host.enemyProjectilePool.fire(
      this.x,
      this.y,
      (dx / len) * BOG_COLOSSUS_PHASE2_AIMED_SPEED,
      (dy / len) * BOG_COLOSSUS_PHASE2_AIMED_SPEED,
    );
    this.nextAimedFireAt = time + BOG_COLOSSUS_PHASE2_AIMED_INTERVAL_MS;
  }

  /**
   * Update the position of every active orbiting thorn each frame so it
   * traces a circle around the (potentially moving) boss. We move the
   * physics body directly via setPosition; velocity stays zero until release.
   */
  private tickOrbitingThorns(): void {
    if (this.orbitingThorns.length === 0) return;
    const dt = this.scene.game.loop.delta / 1000;
    const live: OrbitingThorn[] = [];
    for (const ot of this.orbitingThorns) {
      if (!ot.projectile.active) continue;
      ot.angle += ot.angularSpeed * dt;
      const px = this.x + Math.cos(ot.angle) * ot.radius;
      const py = this.y + Math.sin(ot.angle) * ot.radius;
      ot.projectile.setPosition(px, py);
      live.push(ot);
    }
    this.orbitingThorns = live;
  }

  private releaseOrbitingThorns(): void {
    for (const ot of this.orbitingThorns) {
      if (!ot.projectile.active) continue;
      const vx = Math.cos(ot.angle) * BOG_COLOSSUS_PHASE2_ORBIT_RELEASE_SPEED;
      const vy = Math.sin(ot.angle) * BOG_COLOSSUS_PHASE2_ORBIT_RELEASE_SPEED;
      ot.projectile.setVelocity(vx, vy);
    }
    this.orbitingThorns = [];
  }

  /**
   * Reject damage while in shell phase — the shell tint pulse already
   * tells the player "hits are wasted right now". Spark particle for hit
   * feedback (matches the Bog Tortoise mob's UX).
   */
  override takeDamage(amount: number, knockback?: Vector2): boolean {
    if (this.invulnerable) {
      const spark = this.scene.add.circle(
        this.x + (Math.random() - 0.5) * 28,
        this.y + (Math.random() - 0.5) * 16,
        2.5,
        0xc0e8ff,
        1,
      );
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0.3,
        duration: 220,
        ease: 'Sine.Out',
        onComplete: () => spark.destroy(),
      });
      return false;
    }
    return super.takeDamage(amount, knockback);
  }

  protected onPhaseChanged(newPhase: number): void {
    if (newPhase !== 2) return;
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.setScale(BOG_COLOSSUS_VISUAL_SCALE);
    this.setTintFill(0x9ad8ff);
    this.scene.time.delayedCall(BOG_COLOSSUS_PHASE_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
    this.scene.cameras.main.shake(180, 0.005);
  }
}
