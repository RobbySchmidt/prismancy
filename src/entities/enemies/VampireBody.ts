import type Phaser from 'phaser';
import { VAMPIRE_BERSERKER_HP_FRACTION } from '../../config/GameConfig';
import { type EnemyDefinition } from '../../data/enemies';
import { type Vector2 } from '../../types';
import { BaseEnemy } from './BaseEnemy';

/**
 * Coordinator hooks the body uses to report state up to the `VampireFight`.
 * Implemented by `VampireFight`; passed to bodies via `attachCoordinator`.
 */
export interface VampireFightCoordinator {
  /** Called whenever the body's HP changes (and survives the hit). */
  onBodyDamaged(body: VampireBody): void;
  /** Called from `die()` BEFORE the death tween runs. */
  onBodyDied(body: VampireBody): void;
}

/**
 * Base class for the two Vampire Twins bodies (Crimson Lord + Sapphire
 * Marquis). Extends BaseEnemy directly (NOT BossEnemy) so the dual-fight
 * coordinator owns all `boss:*` event emissions — bodies don't fire those
 * themselves to avoid double bars and premature kill events.
 *
 * Adds:
 *  - knockback suppression (boss-tier behavior — sustained fire never pins
 *    the body)
 *  - coordinator notification on damage + death
 *  - HP-threshold-driven Berserker (Phase 3) trigger
 *  - external Phase 2 (`enterSoloMode`) hook fired by the coordinator when
 *    the OTHER body dies
 */
export abstract class VampireBody extends BaseEnemy {
  /** Display name shown in error logs / debugging only — combined fight uses
   * "Vampire Twins" via the coordinator. */
  abstract readonly displayName: string;
  /** Anchor for berserker-trigger fraction. Sourced from data definition by
   * the subclass so balancing lives in `data/enemies.ts`. */
  abstract readonly maxHp: number;

  protected coordinator: VampireFightCoordinator | null = null;
  protected berserkerEntered = false;
  protected soloMode = false;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition) {
    super(scene, x, y, definition);
  }

  attachCoordinator(coordinator: VampireFightCoordinator): void {
    this.coordinator = coordinator;
  }

  getHp(): number {
    return this.hp;
  }

  /**
   * Drop the knockback parameter (boss-tier — see BossEnemy.takeDamage for
   * the rationale on why knockback locks the AI under sustained fire).
   * After the hit lands, notify the coordinator so it can update the combined
   * HP bar, and check the berserker threshold for Phase 3.
   */
  override takeDamage(amount: number, _knockback?: Vector2): boolean {
    if (amount <= 0 || this.hp <= 0) return super.takeDamage(amount, undefined);
    const killed = super.takeDamage(amount, undefined);
    if (this.hp > 0) {
      this.coordinator?.onBodyDamaged(this);
      if (
        !this.berserkerEntered &&
        this.hp / this.maxHp <= VAMPIRE_BERSERKER_HP_FRACTION
      ) {
        this.berserkerEntered = true;
        this.enterBerserker();
      }
    }
    return killed;
  }

  /**
   * Tell the coordinator first (so it can decide whether to fire `boss:killed`
   * for the entire fight), then run BaseEnemy's death flow (sparkle + tween +
   * destroy + `enemy:killed`). Crucially does NOT emit `boss:killed` — that's
   * the coordinator's job, exactly once, when the LAST body dies.
   */
  protected override die(): void {
    this.coordinator?.onBodyDied(this);
    super.die();
  }

  /**
   * Coordinator hook — fired exactly once when the OTHER body dies. Subclass
   * uses this to swap into the "Phase 2 solo" attack pattern (faster
   * rhythm, new threats).
   */
  enterSoloMode(): void {
    this.soloMode = true;
    this.onEnterSoloMode();
  }

  /** Subclass hook for Phase 2 (other body just died). */
  protected abstract onEnterSoloMode(): void;
  /** Subclass hook for Phase 3 (own HP fell below berserker threshold). */
  protected abstract enterBerserker(): void;
}
