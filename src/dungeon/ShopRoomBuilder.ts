import Phaser from 'phaser';
import {
  SHOP_DEFAULT_ITEM_PRICE,
  SHOP_PRICES,
  SHOP_SLOT_COUNT,
  SHOP_SLOT_SPACING,
} from '../config/GameConfig';
import { type ItemDefinition, ItemPool, type RoomDescriptor } from '../types';
import { ITEMS, pickItemFromPool, type ItemId } from '../data/items';
import { RNG } from '../utils/RNG';
import { type BasePickup } from '../entities/pickups/BasePickup';

/**
 * GameScene-implemented hooks that the builder calls while it lays out a
 * shop room. Pulled out as an interface so the builder is unit-testable
 * without instantiating Phaser scenes — tests pass a `vi.fn()` host.
 */
export interface ShopRoomBuilderHost {
  spawnHeartPickup(x: number, y: number, price: number, slotIndex: number): BasePickup;
  spawnKeyPickup(x: number, y: number, price: number, slotIndex: number): BasePickup;
  spawnItemPickup(
    x: number,
    y: number,
    item: ItemDefinition,
    price: number,
    slotIndex: number,
  ): BasePickup;
  drawPriceLabel(x: number, y: number, price: number): Phaser.GameObjects.Container;
}

export interface ShopBuildResult {
  /** How many slots were freshly spawned this build (excludes already-bought). */
  spawnedSlots: number;
  /** True iff every slot was already in `purchasedShopSlots`. */
  allBought: boolean;
}

/**
 * Lays out a shop room's 4 purchasable slots: heart, key, two items from
 * `ItemPool.Shop`. Item slots are rolled once on the first visit (with
 * the player's `pickedIds` as the initial exclude so the shop never
 * spawns an item the player already owns at build time) and the result
 * is snapshotted into `desc.shopItemIds` — re-entry uses the snapshot,
 * never re-rolls. If the player picks up one of the snapshot's items
 * from somewhere else AFTER the shop was built, that slot is hidden on
 * re-entry (snapshot stays stable; the "owned" item just doesn't display).
 * Already-purchased slots in `desc.purchasedShopSlots` are skipped.
 */
export class ShopRoomBuilder {
  static build(
    host: ShopRoomBuilderHost,
    desc: RoomDescriptor,
    dungeonSeed: string,
    roomCenter: { x: number; y: number },
    pickedIds: ReadonlySet<string> = new Set<string>(),
    /**
     * Item ids already committed elsewhere on the floor (other shops,
     * treasure rooms, cleared boss rewards, currently-live pickups).
     * Folded into the roll-time exclude on first build so two pools can
     * never offer the same item simultaneously. Render-time hide-on-pickup
     * still uses `pickedIds` only — the snapshot must stay stable across
     * re-entries even after another room's identical item drops out.
     */
    floorReserved: ReadonlySet<string> = new Set<string>(),
  ): ShopBuildResult {
    const purchased = new Set(desc.purchasedShopSlots ?? []);

    const slotXs: number[] = [];
    const totalWidth = (SHOP_SLOT_COUNT - 1) * SHOP_SLOT_SPACING;
    for (let i = 0; i < SHOP_SLOT_COUNT; i++) {
      slotXs.push(roomCenter.x - totalWidth / 2 + i * SHOP_SLOT_SPACING);
    }
    const slotY = roomCenter.y;

    let spawned = 0;

    if (!purchased.has(0)) {
      host.spawnHeartPickup(slotXs[0]!, slotY, SHOP_PRICES.heart, 0);
      host.drawPriceLabel(slotXs[0]!, slotY - 30, SHOP_PRICES.heart);
      spawned++;
    }
    if (!purchased.has(1)) {
      host.spawnKeyPickup(slotXs[1]!, slotY, SHOP_PRICES.key, 1);
      host.drawPriceLabel(slotXs[1]!, slotY - 30, SHOP_PRICES.key);
      spawned++;
    }

    // Slots 2 + 3: snapshot or roll fresh.
    const itemDefs: [ItemDefinition | null, ItemDefinition | null] = [null, null];
    if (desc.shopItemIds) {
      const itemMap = ITEMS as Record<string, ItemDefinition | undefined>;
      itemDefs[0] = desc.shopItemIds[0] ? (itemMap[desc.shopItemIds[0]] ?? null) : null;
      itemDefs[1] = desc.shopItemIds[1] ? (itemMap[desc.shopItemIds[1]] ?? null) : null;
    } else {
      const rng = new RNG(`${dungeonSeed}-shop-${desc.id}`);
      const exclude = new Set<ItemId>(pickedIds as ReadonlySet<ItemId>);
      for (const id of floorReserved) exclude.add(id as ItemId);
      const slot2 = pickItemFromPool(ItemPool.Shop, rng, exclude);
      itemDefs[0] = slot2;
      if (slot2) exclude.add(slot2.id as ItemId);
      const slot3 = pickItemFromPool(ItemPool.Shop, rng, exclude);
      itemDefs[1] = slot3;
      desc.shopItemIds = [slot2?.id ?? '', slot3?.id ?? ''] as const;
    }

    for (let i = 0; i < 2; i++) {
      const slotIndex = (i + 2) as 2 | 3;
      const item = itemDefs[i];
      if (!item) continue;
      if (purchased.has(slotIndex)) continue;
      // Hide if the player picked the item up elsewhere after the shop
      // was first rolled — keeps the snapshot stable while still honouring
      // "owned items disappear from pools".
      if (pickedIds.has(item.id)) continue;
      const price = item.shopPrice ?? SHOP_DEFAULT_ITEM_PRICE;
      host.spawnItemPickup(slotXs[slotIndex]!, slotY, item, price, slotIndex);
      host.drawPriceLabel(slotXs[slotIndex]!, slotY - 30, price);
      spawned++;
    }

    // Mark the shop as exhausted once nothing's left to display, even if
    // some slots were never explicitly bought (heart fully owned, items
    // hidden because picked up elsewhere). This lets `looted` flip and
    // future re-entries skip the build entirely.
    const allBought = spawned === 0;
    return { spawnedSlots: spawned, allBought };
  }
}
