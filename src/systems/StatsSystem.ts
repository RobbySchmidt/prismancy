import { BASE_PLAYER_STATS, DEFAULT_MISSILE_TINT } from '../config/GameConfig';
import type { ItemModifier, PlayerStats, StatKey } from '../types';

/**
 * Per-run aggregator for player stats. Items push `ItemModifier`s in;
 * `getEffective` recomputes on demand using a deterministic two-pass formula:
 * `value = (base + Σ add) * Π mult`. This keeps order-independence for
 * additive stacks and makes multiplicative bonuses apply on top of the
 * already-buffed base, which matches how items typically read in Isaac-style
 * roguelikes.
 */
export class StatsSystem {
  private readonly base: PlayerStats;
  private readonly modifiers: ItemModifier[] = [];

  constructor() {
    this.base = { ...BASE_PLAYER_STATS };
  }

  applyModifier(modifier: ItemModifier): void {
    this.modifiers.push(modifier);
  }

  /**
   * Remove every modifier registered under `itemId`. Used by the active-item
   * swap (2026-06-12): dropping the equipped active must take its passive
   * stat package with it — otherwise re-picking the dropped item would
   * stack its effects a second time (pick Blood of Marquis → swap away →
   * keep +30% → re-pick → +30% again = infinite stat loop). The
   * latest-wins `missileTint` lookup self-corrects since it scans the
   * remaining modifiers.
   */
  removeModifiersByItemId(itemId: string): void {
    for (let i = this.modifiers.length - 1; i >= 0; i--) {
      if (this.modifiers[i]?.itemId === itemId) this.modifiers.splice(i, 1);
    }
  }

  /** Berechne effektiven Wert: base + Σ add, dann × Π mult. */
  getEffective(stat: StatKey): number {
    let value = this.base[stat];
    // First pass: additive
    for (const mod of this.modifiers) {
      for (const eff of mod.effects) {
        if (eff.stat === stat && eff.add !== undefined) value += eff.add;
      }
    }
    // Second pass: multiplicative
    for (const mod of this.modifiers) {
      for (const eff of mod.effects) {
        if (eff.stat === stat && eff.mult !== undefined) value *= eff.mult;
      }
    }
    return value;
  }

  /** Latest-wins für Missile-Tint. Default = DEFAULT_MISSILE_TINT. */
  getMissileTint(): number {
    for (let i = this.modifiers.length - 1; i >= 0; i--) {
      const t = this.modifiers[i]?.missileTint;
      if (t !== undefined) return t;
    }
    return DEFAULT_MISSILE_TINT;
  }

  /** Für Tests / Debug. */
  getModifierCount(): number {
    return this.modifiers.length;
  }
}
