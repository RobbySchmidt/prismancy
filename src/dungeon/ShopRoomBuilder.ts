import Phaser from 'phaser';
import {
  SHOP_DEFAULT_ITEM_PRICE,
  SHOP_PRICES,
  SHOP_SLOT_COUNT,
  SHOP_SLOT_SPACING,
} from '../config/GameConfig';
import { type ItemDefinition, ItemPool, type RoomDescriptor } from '../types';
import { pickItemFromPool, type ItemId } from '../data/items';
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
 * `ItemPool.Shop`. Item slots are deterministic per (dungeonSeed, room id)
 * so re-entry rolls the same items, and they're distinct via the
 * `pickItemFromPool` exclude set. Already-purchased slots in
 * `desc.purchasedShopSlots` are skipped so a partial-bought shop only shows
 * what's left.
 */
export class ShopRoomBuilder {
  static build(
    host: ShopRoomBuilderHost,
    desc: RoomDescriptor,
    dungeonSeed: string,
    roomCenter: { x: number; y: number },
  ): ShopBuildResult {
    const purchased = new Set(desc.purchasedShopSlots ?? []);
    const rng = new RNG(`${dungeonSeed}-shop-${desc.id}`);

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

    // Item slots 2 + 3: deterministic + distinct via the exclude set. We
    // always advance the RNG for slot 2's pick even if slot 2 is already
    // bought, so slot 3 picks the same item it did on the first build.
    const exclude = new Set<ItemId>();
    for (const slotIndex of [2, 3] as const) {
      const item = pickItemFromPool(ItemPool.Shop, rng, exclude);
      if (!item) break;
      exclude.add(item.id as ItemId);
      if (purchased.has(slotIndex)) continue;
      const price = item.shopPrice ?? SHOP_DEFAULT_ITEM_PRICE;
      host.spawnItemPickup(slotXs[slotIndex]!, slotY, item, price, slotIndex);
      host.drawPriceLabel(slotXs[slotIndex]!, slotY - 30, price);
      spawned++;
    }

    const allBought = purchased.size >= SHOP_SLOT_COUNT;
    return { spawnedSlots: spawned, allBought };
  }
}
