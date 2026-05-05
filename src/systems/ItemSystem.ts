import { type ItemDefinition, type ItemModifier } from '../types';
import { type PlayerHealth } from './PlayerHealth';
import { type StatsSystem } from './StatsSystem';
import { EventBus } from '../utils/EventBus';

/**
 * Per-run owner of pickup-driven item state. Translates an `ItemDefinition`
 * into an `ItemModifier`, hands it to `StatsSystem`, and records the id so
 * future spawn logic (Phase 4 Polish, Phase 6) can avoid re-rolling items the
 * player already owns. Emits `item:picked` so HUD / SFX can react.
 *
 * `playerHealth` is optional so unit tests (which don't construct a Player)
 * can still drive ItemSystem in isolation; HP-up items just no-op on max-HP
 * adjustments when the reference is missing.
 */
export class ItemSystem {
  private readonly picked = new Set<string>();

  constructor(
    private readonly stats: StatsSystem,
    private readonly playerHealth: PlayerHealth | null = null,
  ) {}

  /**
   * Apply an item's effects + emit `item:picked`. Conditionally includes the
   * `missileTint` field on the modifier so StatsSystem's latest-wins lookup
   * isn't tripped by an explicit `undefined`. Items that bump max HP
   * (`maxHealthBonus`) also heal the player by the same amount so the new
   * heart spawns full.
   */
  pickUp(item: ItemDefinition): void {
    const modifier: ItemModifier = {
      itemId: item.id,
      effects: item.effects,
      ...(item.missileTint !== undefined ? { missileTint: item.missileTint } : {}),
    };
    this.stats.applyModifier(modifier);
    if (item.maxHealthBonus !== undefined && item.maxHealthBonus > 0) {
      this.playerHealth?.addMaxHealth(item.maxHealthBonus);
    }
    this.picked.add(item.id);
    EventBus.emit('item:picked', { itemId: item.id });
  }

  hasPicked(itemId: string): boolean {
    return this.picked.has(itemId);
  }

  getPickedIds(): ReadonlySet<string> {
    return this.picked;
  }

  /**
   * Re-apply the effects from a list of previously-picked item ids without
   * emitting `item:picked`. Used by the floor-transition carry-over flow
   * to restore the run's item state on a fresh GameScene without firing
   * toast / SFX / UI updates the player has already seen. `lookup`
   * resolves an id to its full ItemDefinition (typically from `data/items`);
   * ids missing from it are silently skipped (resilient to data drift).
   *
   * `maxHealthBonus` items intentionally DO bump max HP here — without
   * that, an HP-up item picked on Floor 1 would shrink the player's max HP
   * back to baseline on Floor 2.
   */
  hydrate(
    itemIds: ReadonlyArray<string>,
    lookup: (id: string) => ItemDefinition | undefined,
  ): void {
    for (const id of itemIds) {
      const item = lookup(id);
      if (!item) continue;
      const modifier: ItemModifier = {
        itemId: item.id,
        effects: item.effects,
        ...(item.missileTint !== undefined ? { missileTint: item.missileTint } : {}),
      };
      this.stats.applyModifier(modifier);
      if (item.maxHealthBonus !== undefined && item.maxHealthBonus > 0) {
        this.playerHealth?.addMaxHealth(item.maxHealthBonus);
      }
      this.picked.add(item.id);
    }
  }
}
