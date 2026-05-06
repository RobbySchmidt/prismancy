import type Phaser from 'phaser';
import { type EnemyDefinition } from '../../data/enemies';
import { type Vector2 } from '../../types';
import { EventBus } from '../../utils/EventBus';
import { BaseEnemy } from './BaseEnemy';

/**
 * Read the per-spawn boss HP scale factor from the scene registry. GameScene
 * computes this from the player's current effective DPS (damage × fireRate)
 * before each boss spawn, so the fight always has the same time-to-kill
 * regardless of which damage / fire-rate items the player picked up.
 * Floors with weak / no items → 1.0 (= base feel). Heavily stacked builds
 * scale up linearly. Floor mob multiplier does NOT apply to bosses.
 */
function readBossHpScale(scene: Phaser.Scene): number {
  const raw = scene.registry.get('bossHpScale') as number | undefined;
  if (raw === undefined || !Number.isFinite(raw) || raw < 1) return 1.0;
  return raw;
}

/**
 * One phase transition trigger for a boss. The boss starts in phase 1
 * implicitly; phases listed here flip in order as the boss takes damage.
 */
export interface BossPhaseDefinition {
  /**
   * Triggered when boss HP <= this fraction of max (e.g. 0.5 = 50% HP). Should
   * be in (0, 1).
   */
  hpThresholdFraction: number;
  /**
   * 1-based phase index. Phase 1 is implicit (active from spawn until the
   * first listed phase triggers), so subclasses should only list 2+ here.
   */
  phaseIndex: number;
}

/**
 * Foundation for boss-tier enemies. Adds:
 *  - `boss:hpChanged` emit on every damage tick (HUD reads this for the boss
 *    bar),
 *  - phase-transition machinery driven by HP thresholds (`onPhaseChanged`
 *    fires once per crossing, in subclass-defined order),
 *  - `boss:killed` event on death so GameScene can drop the reward pedestal +
 *    optional no-hit gem.
 *
 * `BaseEnemy.die()` is reused via `super.die()` so we keep the existing
 * disable + tween + destroy flow (which is what `enemy:killed` listeners
 * expect — the room-clear check runs off that event).
 */
export abstract class BossEnemy extends BaseEnemy {
  /** Human-readable name for the boss-bar title + the kill event payload. */
  abstract readonly displayName: string;
  /**
   * Anchor for HP-fraction calculations (UI ratio = current / maxHp). Set in
   * the constructor from `definition.hp × bossHpScale` so subclasses don't
   * need their own initializer (and can't drift from the data file).
   */
  readonly maxHp: number;
  /**
   * Sorted ascending by `phaseIndex`. Only phases 2+ should be listed;
   * phase 1 is implicit from spawn. Subclasses are responsible for the sort.
   */
  protected abstract readonly phases: readonly BossPhaseDefinition[];

  protected currentPhase = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition) {
    super(scene, x, y, definition);
    // Override BaseEnemy's mob-multiplier-applied hp with DPS-ratio scaling so
    // bosses always feel like a base-stats fight regardless of player build.
    const scale = readBossHpScale(scene);
    this.maxHp = Math.max(1, Math.round(definition.hp * scale));
    this.hp = this.maxHp;
  }

  /**
   * Subclass hook — fired exactly once per phase transition with the new
   * phase index. Implementations should swap their attack patterns here.
   */
  protected abstract onPhaseChanged(newPhase: number): void;

  /**
   * Override `BaseEnemy.takeDamage` to (a) drop the knockback velocity + AI
   * lock so sustained missile fire doesn't pin the boss in a corner with its
   * AI permanently locked (a single hit lasts KNOCKBACK_DURATION_MS; under
   * fast firerate the lock never expires and the boss stops attacking),
   * (b) emit `boss:hpChanged` for the HUD, (c) check whether the latest hit
   * crossed any phase threshold. The death branch additionally emits
   * `boss:killed` (see `die()` below).
   */
  override takeDamage(amount: number, _knockback?: Vector2): boolean {
    if (amount <= 0 || this.hp <= 0) return super.takeDamage(amount, undefined);
    const killed = super.takeDamage(amount, undefined);

    if (this.hp > 0) {
      EventBus.emit('boss:hpChanged', { current: this.hp, max: this.maxHp });
      this.checkPhaseTransitions();
    } else if (killed) {
      // Final HP delta (down to 0) so the bar drains visually before the
      // `boss:killed` event hides it.
      EventBus.emit('boss:hpChanged', { current: 0, max: this.maxHp });
    }
    return killed;
  }

  /**
   * Walk the phase list in order; trigger each one whose threshold has been
   * crossed and that hasn't fired yet. Done as a loop so a single big hit can
   * skip multiple phases without leaving them queued.
   */
  private checkPhaseTransitions(): void {
    const fraction = this.hp / this.maxHp;
    for (const phase of this.phases) {
      if (phase.phaseIndex <= this.currentPhase) continue;
      if (fraction <= phase.hpThresholdFraction) {
        this.currentPhase = phase.phaseIndex;
        this.onPhaseChanged(phase.phaseIndex);
        EventBus.emit('boss:phaseChanged', { phase: phase.phaseIndex });
      }
    }
  }

  /**
   * Override death so we additionally emit `boss:killed`. The base class
   * `die()` still runs (sparkle + tween + destroy + `enemy:killed`), so the
   * existing room-clear logic in GameScene continues to tick off this event.
   * `noHit` is read from a flag GameScene flips on `player:tookDamage` while
   * the boss room is in progress — read at emit-time so the "did the player
   * take damage?" answer reflects the entire fight up to the killing blow.
   */
  protected override die(): void {
    const noHit = this.scene.registry.get('bossNoHitInProgress') === true;
    super.die();
    EventBus.emit('boss:killed', {
      x: this.x,
      y: this.y,
      name: this.displayName,
      noHit,
    });
  }
}
