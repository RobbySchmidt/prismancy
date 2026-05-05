import type Phaser from 'phaser';
import {
  BOG_COLOSSUS_INITIAL_DELAY_MS,
  BOG_COLOSSUS_PHASE1_BURST_THORNS,
  BOG_COLOSSUS_PHASE1_CYCLE_MS,
  BOG_COLOSSUS_PHASE2_CYCLE_MS,
  BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS,
  BOG_COLOSSUS_PHASE2_ORBIT_RADIUS,
  BOG_COLOSSUS_PHASE2_ORBIT_RELEASE_SPEED,
  BOG_COLOSSUS_PHASE2_ORBIT_SPEED_RAD,
  BOG_COLOSSUS_PHASE2_ORBIT_THORNS,
  BOG_COLOSSUS_PHASE_FLASH_MS,
  BOG_COLOSSUS_SHELL_DURATION_MS,
  BOG_COLOSSUS_VISUAL_SCALE,
  BOG_COLOSSUS_WALK_SPEED,
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

  constructor(scene: Phaser.Scene, x: number, y: number, host: BogColossusHost) {
    super(scene, x, y, ENEMIES['boss-bog-colossus']);
    this.host = host;
    this.nextStateChangeAt = scene.time.now + BOG_COLOSSUS_INITIAL_DELAY_MS;
    this.setScale(BOG_COLOSSUS_VISUAL_SCALE);
  }

  protected tickAI(time: number): void {
    if (this.walkState === 'walk') {
      this.tickWalk();
      if (time >= this.nextStateChangeAt) this.beginShell(time);
    } else {
      // Shell phase: hold position; pop on timeout.
      this.setVelocity(0, 0);
      if (time >= this.nextStateChangeAt) this.popOut(time);
    }
    this.tickOrbitingThorns();
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
    this.setVelocity((dx / len) * BOG_COLOSSUS_WALK_SPEED, (dy / len) * BOG_COLOSSUS_WALK_SPEED);
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

  private firePhase1Burst(): void {
    const count = BOG_COLOSSUS_PHASE1_BURST_THORNS;
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
   * Phase 2: spawn 6 thorns in a ring around the boss with zero velocity,
   * then `tickOrbitingThorns` repositions them along a rotating circle each
   * frame. After ORBIT_DURATION_MS the boss releases them outward so they
   * fly off and the player has to escape the ring.
   */
  private spawnOrbitingThorns(): void {
    const count = BOG_COLOSSUS_PHASE2_ORBIT_THORNS;
    const baseOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = baseOffset + (i / count) * Math.PI * 2;
      const px = this.x + Math.cos(angle) * BOG_COLOSSUS_PHASE2_ORBIT_RADIUS;
      const py = this.y + Math.sin(angle) * BOG_COLOSSUS_PHASE2_ORBIT_RADIUS;
      const projectile = this.host.enemyProjectilePool.fire(px, py, 0, 0);
      if (!projectile) continue;
      // Stretch the projectile lifetime so it survives the orbit. The pool's
      // default lifetime would expire mid-orbit otherwise.
      projectile.setLifetime(BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS + 4000);
      this.orbitingThorns.push({ projectile, angle });
    }
    // Schedule release: at orbit-duration end, set velocities outward.
    this.scene.time.delayedCall(BOG_COLOSSUS_PHASE2_ORBIT_DURATION_MS, () => {
      this.releaseOrbitingThorns();
    });
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
      ot.angle += BOG_COLOSSUS_PHASE2_ORBIT_SPEED_RAD * dt;
      const px = this.x + Math.cos(ot.angle) * BOG_COLOSSUS_PHASE2_ORBIT_RADIUS;
      const py = this.y + Math.sin(ot.angle) * BOG_COLOSSUS_PHASE2_ORBIT_RADIUS;
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
