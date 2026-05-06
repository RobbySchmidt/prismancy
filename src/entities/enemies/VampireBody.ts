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
  /**
   * Phase 1 attack-overlap gating. `self` asks whether the OTHER live body
   * is currently in a high-pressure state (e.g. Crimson Lord's dash
   * telegraph / dash). Used by Sapphire Marquis to defer his fan + teleport
   * so the player isn't hit with "Lord telegraph + Marquis fan" simultaneously,
   * which the user flagged as pure-RNG dodging in Phase 1. Returns false
   * when the partner is dead (solo mode), so it has no effect post Phase 1.
   */
  isPartnerInDangerZone(self: VampireBody): boolean;
  /**
   * Returns the OTHER live body, or null if `self` is alone (solo mode) or
   * the partner is somehow inactive. Marquis uses this to read Lord's
   * position + berserker state for predictable teleport placement (Phase 1
   * = behind the Lord on the player axis; Lord-in-berserker = lock to room
   * center).
   */
  getPartner(self: VampireBody): VampireBody | null;
  /**
   * Shared-pool damage gate — coordinator returns true when `body` should
   * not take any damage right now. Used to make the Sapphire Marquis
   * invulnerable while the Crimson Lord is alive: the fight has one
   * effective HP pool that drains through the Lord first, then the
   * Marquis. Bodies that take this hit visually flash a "shielded" tint
   * so the player gets feedback that their missiles aren't working on
   * the Marquis yet.
   */
  shouldBlockDamage(body: VampireBody): boolean;
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
  /**
   * Anchor for berserker-trigger fraction + the combined HP bar in
   * VampireFight. Set in the constructor from `definition.hp × bossHpScale`
   * (same DPS-ratio scaling BossEnemy uses) so the dual-body fight obeys the
   * same "always feels like base" contract as solo bosses.
   */
  readonly maxHp: number;

  protected coordinator: VampireFightCoordinator | null = null;
  protected berserkerEntered = false;
  protected soloMode = false;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition) {
    super(scene, x, y, definition);
    // Override BaseEnemy's mob-multiplier-applied hp with DPS-ratio scaling
    // (registry value set by GameScene before the boss spawn). See BossEnemy
    // for the rationale.
    const raw = scene.registry.get('bossHpScale') as number | undefined;
    const scale =
      raw === undefined || !Number.isFinite(raw) || raw < 1 ? 1.0 : raw;
    this.maxHp = Math.max(1, Math.round(definition.hp * scale));
    this.hp = this.maxHp;
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
   *
   * Shared-pool gating: if the coordinator says this body's damage should
   * be blocked (e.g. Marquis while Lord is alive), the hit short-circuits
   * with a "shielded" gold flash and zero HP loss. Player gets visual
   * feedback that this body isn't currently a valid target.
   *
   * After the hit lands, notify the coordinator so it can update the
   * combined HP bar, and check the berserker threshold for Phase 3.
   */
  override takeDamage(amount: number, _knockback?: Vector2): boolean {
    if (amount <= 0 || this.hp <= 0) return false;
    if (this.coordinator?.shouldBlockDamage(this) === true) {
      this.flashShielded();
      return false;
    }
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

  /** Brief gold tint on shielded hits — same visual idiom Prismarch uses
   * for its invulnerable-during-special hits, so the player reads "this
   * target isn't taking damage right now". */
  private flashShielded(): void {
    this.setTintFill(0xffd84a);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
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
  /**
   * Subclass hook for the cross-body danger-zone check. Returns true when
   * THIS body is in a state where the partner should defer their own
   * attacks to avoid unfair simultaneous threats. Crimson Lord returns
   * true during dash telegraph + dash itself; Marquis returns false (his
   * fan / curtain don't have a discrete "incoming" window the partner
   * needs to defer for).
   */
  abstract isInDangerZone(): boolean;

  /**
   * Public accessor for `berserkerEntered`. Marquis reads this off the Lord
   * to switch its teleport target into "lock at room center" mode when the
   * Lord enters berserker (Phase 3-of-Lord while Marquis still alive).
   */
  isBerserker(): boolean {
    return this.berserkerEntered;
  }
}
