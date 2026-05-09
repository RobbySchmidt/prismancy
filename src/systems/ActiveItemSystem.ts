import { type ActiveItemSpec, type ItemDefinition } from '../types';
import { EventBus } from '../utils/EventBus';

/**
 * Per-run owner of the equipped active item state. Active items are
 * triggered by [Q] (single-slot, like Isaac's spacebar item). Picking a
 * second active replaces the first — there's no inventory of multiple
 * actives.
 *
 * The actual activation logic lives in `GameScene.executeActiveItem`,
 * branched by `ActiveItemSpec.kind`. This system just owns the equip
 * state + emits `activeItem:equipped` so the HUD slot widget can render
 * the icon.
 */
export class ActiveItemSystem {
  private equipped: ActiveItemSpec | null = null;
  /** ItemDefinition that owns the equipped active. Stored so the HUD slot
   *  can read `textureKey` + `displayName` without a separate lookup table.
   *  Cleared together with `equipped`. */
  private equippedItem: ItemDefinition | null = null;

  /** Equip the given item's active. Replaces any previously-equipped active
   *  (one slot only). Idempotent on the same item. */
  equip(item: ItemDefinition): void {
    if (!item.active) return;
    if (this.equippedItem?.id === item.id) return;
    this.equipped = item.active;
    this.equippedItem = item;
    EventBus.emit('activeItem:equipped', { itemId: item.id });
  }

  /** Unequip without picking a new one. Currently only used by SHUTDOWN
   *  resets — gameplay never voluntarily unequips. */
  clear(): void {
    if (!this.equippedItem) return;
    this.equipped = null;
    this.equippedItem = null;
    EventBus.emit('activeItem:equipped', { itemId: null });
  }

  getEquipped(): ActiveItemSpec | null {
    return this.equipped;
  }

  getEquippedItem(): ItemDefinition | null {
    return this.equippedItem;
  }

  hasEquipped(): boolean {
    return this.equipped !== null;
  }
}
