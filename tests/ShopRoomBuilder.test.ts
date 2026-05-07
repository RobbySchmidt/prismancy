import { describe, it, expect, vi } from 'vitest';

import { ShopRoomBuilder, type ShopRoomBuilderHost } from '../src/dungeon/ShopRoomBuilder';
import { DoorKind, RoomKind, type ItemDefinition, type RoomDescriptor } from '../src/types';
import { SHOP_PRICES } from '../src/config/GameConfig';

interface SpyHost {
  spawnHeartPickup: ReturnType<typeof vi.fn>;
  spawnKeyPickup: ReturnType<typeof vi.fn>;
  spawnItemPickup: ReturnType<typeof vi.fn>;
  drawPriceLabel: ReturnType<typeof vi.fn>;
}

function makeHost(): SpyHost & ShopRoomBuilderHost {
  // Each spawn / drawPriceLabel call returns a stub object so any caller
  // that inspects the return value doesn't blow up. The tests only inspect
  // the call args, so a plain object is enough.
  const stub = {} as never;
  return {
    spawnHeartPickup: vi.fn(() => stub),
    spawnKeyPickup: vi.fn(() => stub),
    spawnItemPickup: vi.fn(() => stub),
    drawPriceLabel: vi.fn(() => stub),
  };
}

function makeShopDescriptor(purchased?: number[]): RoomDescriptor {
  const noDoor = { exists: false, kind: DoorKind.Normal };
  const desc: RoomDescriptor = {
    id: 'r-2-2',
    gx: 2,
    gy: 2,
    kind: RoomKind.Shop,
    doors: { up: noDoor, down: noDoor, left: noDoor, right: noDoor },
    decorationSeed: 'seed-room',
    enemySpawnCount: 0,
    visited: true,
    cleared: true,
  };
  if (purchased !== undefined) desc.purchasedShopSlots = purchased;
  return desc;
}

describe('ShopRoomBuilder', () => {
  const center = { x: 480, y: 288 };

  it('spawns 4 slots with correct kinds and prices on a fresh shop', () => {
    const host = makeHost();
    const desc = makeShopDescriptor();
    const result = ShopRoomBuilder.build(host, desc, 'dungeon-seed-1', center);

    expect(result.spawnedSlots).toBe(4);
    expect(result.allBought).toBe(false);

    expect(host.spawnHeartPickup).toHaveBeenCalledTimes(1);
    expect(host.spawnKeyPickup).toHaveBeenCalledTimes(1);
    expect(host.spawnItemPickup).toHaveBeenCalledTimes(2);
    expect(host.drawPriceLabel).toHaveBeenCalledTimes(4);

    // Slot 0 = Heart at SHOP_PRICES.heart, slot 1 = Key at SHOP_PRICES.key
    const heartCall = host.spawnHeartPickup.mock.calls[0]!;
    expect(heartCall[2]).toBe(SHOP_PRICES.heart); // price
    expect(heartCall[3]).toBe(0); // slot index

    const keyCall = host.spawnKeyPickup.mock.calls[0]!;
    expect(keyCall[2]).toBe(SHOP_PRICES.key);
    expect(keyCall[3]).toBe(1);

    // Item slots use indices 2 + 3
    const itemSlotIndices = host.spawnItemPickup.mock.calls.map((c) => c[4]);
    expect(itemSlotIndices.sort()).toEqual([2, 3]);
  });

  it('item slots are deterministic for the same (seed, room id)', () => {
    const host1 = makeHost();
    const host2 = makeHost();
    const desc1 = makeShopDescriptor();
    const desc2 = makeShopDescriptor();

    ShopRoomBuilder.build(host1, desc1, 'shared-seed', center);
    ShopRoomBuilder.build(host2, desc2, 'shared-seed', center);

    const ids1 = host1.spawnItemPickup.mock.calls.map((c) => (c[2] as ItemDefinition).id);
    const ids2 = host2.spawnItemPickup.mock.calls.map((c) => (c[2] as ItemDefinition).id);
    expect(ids1).toEqual(ids2);
  });

  it('item slots roll two distinct items (exclude works)', () => {
    const host = makeHost();
    const desc = makeShopDescriptor();
    ShopRoomBuilder.build(host, desc, 'distinct-test-seed', center);

    const ids = host.spawnItemPickup.mock.calls.map((c) => (c[2] as ItemDefinition).id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('skips already-purchased slots on re-entry', () => {
    const host = makeHost();
    const desc = makeShopDescriptor([0, 2]); // heart + first item already bought
    const result = ShopRoomBuilder.build(host, desc, 'partial-buy-seed', center);

    expect(result.spawnedSlots).toBe(2);
    expect(result.allBought).toBe(false);
    expect(host.spawnHeartPickup).not.toHaveBeenCalled();
    expect(host.spawnKeyPickup).toHaveBeenCalledTimes(1);
    expect(host.spawnItemPickup).toHaveBeenCalledTimes(1);
    // The remaining item slot is index 3.
    expect(host.spawnItemPickup.mock.calls[0]?.[4]).toBe(3);
    expect(host.drawPriceLabel).toHaveBeenCalledTimes(2);
  });

  it('item slot 3 stays consistent after slot 2 is bought (deterministic re-entry)', () => {
    // Build a fresh shop, capture which item slot 3 rolled. Mark slot 2 as
    // purchased and rebuild — slot 3 must still be the same item, otherwise
    // re-entering a partial-bought shop would change the offering.
    const host1 = makeHost();
    const desc1 = makeShopDescriptor();
    ShopRoomBuilder.build(host1, desc1, 'reentry-determinism', center);
    const slot3InitialId = (
      host1.spawnItemPickup.mock.calls.find((c) => c[4] === 3)?.[2] as ItemDefinition
    ).id;

    const host2 = makeHost();
    const desc2 = makeShopDescriptor([2]);
    ShopRoomBuilder.build(host2, desc2, 'reentry-determinism', center);
    const slot3AfterId = (
      host2.spawnItemPickup.mock.calls.find((c) => c[4] === 3)?.[2] as ItemDefinition
    ).id;

    expect(slot3AfterId).toBe(slot3InitialId);
  });

  it('returns allBought=true when every slot is already in purchasedShopSlots', () => {
    const host = makeHost();
    const desc = makeShopDescriptor([0, 1, 2, 3]);
    const result = ShopRoomBuilder.build(host, desc, 'fully-bought', center);

    expect(result.spawnedSlots).toBe(0);
    expect(result.allBought).toBe(true);
    expect(host.spawnHeartPickup).not.toHaveBeenCalled();
    expect(host.spawnKeyPickup).not.toHaveBeenCalled();
    expect(host.spawnItemPickup).not.toHaveBeenCalled();
    expect(host.drawPriceLabel).not.toHaveBeenCalled();
  });

  // Regression: shop slots used to roll without knowing about items already
  // committed elsewhere on the floor (treasure pedestals, boss-room rewards),
  // so the same id could appear twice on a single floor. Picking up the
  // duplicate from the other room then made the shop slot vanish on re-entry
  // (slot-render-time hide-on-pickup gating). The `floorReserved` parameter
  // folds those ids into the roll-time exclude.
  it('excludes ids in `floorReserved` from rolled item slots', () => {
    // First, find which two ids the shop would normally roll for this seed.
    const probeHost = makeHost();
    const probeDesc = makeShopDescriptor();
    ShopRoomBuilder.build(probeHost, probeDesc, 'reserve-clash', center);
    const baselineIds = probeHost.spawnItemPickup.mock.calls.map(
      (c) => (c[2] as ItemDefinition).id,
    );
    expect(baselineIds).toHaveLength(2);

    // Now reserve the first of those ids and rebuild — the shop must roll a
    // different pair (at minimum, the reserved id must not appear).
    const host = makeHost();
    const desc = makeShopDescriptor();
    const reserved = new Set<string>([baselineIds[0]!]);
    ShopRoomBuilder.build(host, desc, 'reserve-clash', center, new Set(), reserved);
    const ids = host.spawnItemPickup.mock.calls.map((c) => (c[2] as ItemDefinition).id);
    expect(ids).not.toContain(baselineIds[0]);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
