import { describe, it, expect, vi } from 'vitest';

const { emitMock } = vi.hoisted(() => ({ emitMock: vi.fn() }));

vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    emit: emitMock,
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

// Stub Phaser before importing BasePickup so the abstract base class doesn't
// pull in the whole engine. We only test `tryPurchase` here, which doesn't
// touch any Phaser API on `this`.
vi.mock('phaser', () => ({
  default: {
    Physics: {
      Arcade: {
        Sprite: class {},
      },
    },
  },
}));

import { Inventory } from '../src/systems/Inventory';
import { BasePickup } from '../src/entities/pickups/BasePickup';
import { STARTING_COINS } from '../src/config/GameConfig';

/**
 * `tryPurchase` is purely a function over `this.price` + inventory state, so
 * a Phaser-less stub suffices. We invoke the method through its prototype
 * with a hand-rolled `this`.
 */
function callTryPurchase(price: number | undefined, inventory: Inventory) {
  const self = { price } as unknown as BasePickup;
  return BasePickup.prototype.tryPurchase.call(self, inventory);
}

/**
 * Inventory has a non-zero starting balance (debug constant); these tests
 * want a clean slate so they can dial the balance precisely. Drain
 * STARTING_COINS off the top so the assertions stay invariant to it.
 */
function freshInventory(): Inventory {
  const inv = new Inventory();
  if (STARTING_COINS > 0) inv.spendCoins(STARTING_COINS);
  return inv;
}

describe('BasePickup.tryPurchase', () => {
  it('returns "free" when no price is set', () => {
    const inv = freshInventory();
    inv.addCoins(10);
    expect(callTryPurchase(undefined, inv)).toBe('free');
    expect(inv.getCoins()).toBe(10); // untouched
  });

  it('returns "paid" and deducts coins when the player can afford the price', () => {
    const inv = freshInventory();
    inv.addCoins(10);
    expect(callTryPurchase(3, inv)).toBe('paid');
    expect(inv.getCoins()).toBe(7);
  });

  it('returns "too-poor" without deducting when the player cannot afford', () => {
    const inv = freshInventory();
    inv.addCoins(2);
    expect(callTryPurchase(5, inv)).toBe('too-poor');
    expect(inv.getCoins()).toBe(2);
  });

  it('returns "paid" when coins exactly equal the price', () => {
    const inv = freshInventory();
    inv.addCoins(15);
    expect(callTryPurchase(15, inv)).toBe('paid');
    expect(inv.getCoins()).toBe(0);
  });
});
