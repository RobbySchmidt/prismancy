import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { Inventory } from '../src/systems/Inventory';
import { STARTING_COINS } from '../src/config/GameConfig';

/**
 * Inventory starts with STARTING_COINS (currently a temporary debug value),
 * so each test resets the coin balance to 0 with `spendCoins(STARTING_COINS)`
 * before exercising the actual logic — keeps the assertions invariant to
 * future changes of that constant.
 */
function freshInventory(): Inventory {
  const inv = new Inventory();
  if (STARTING_COINS > 0) inv.spendCoins(STARTING_COINS);
  emitMock.mockClear();
  return inv;
}

describe('Inventory', () => {
  beforeEach(() => {
    emitMock.mockClear();
  });

  it('starts with STARTING_COINS and 0 keys, without emitting from the constructor', () => {
    const inv = new Inventory();
    expect(inv.getCoins()).toBe(STARTING_COINS);
    expect(inv.getKeys()).toBe(0);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('addCoins increases the balance and emits inventory:changed', () => {
    const inv = freshInventory();
    inv.addCoins(5);
    expect(inv.getCoins()).toBe(5);
    inv.addCoins(3);
    expect(inv.getCoins()).toBe(8);

    const changeEvents = emitMock.mock.calls.filter((c) => c[0] === 'inventory:changed');
    expect(changeEvents).toHaveLength(2);
    expect(changeEvents[1]?.[1]).toEqual({ coins: 8, keys: 0 });
  });

  it('spendCoins succeeds when balance is sufficient and fails otherwise without mutating', () => {
    const inv = freshInventory();
    inv.addCoins(10);
    emitMock.mockClear();

    expect(inv.spendCoins(4)).toBe(true);
    expect(inv.getCoins()).toBe(6);
    expect(emitMock.mock.calls.some((c) => c[0] === 'inventory:changed')).toBe(true);

    emitMock.mockClear();
    expect(inv.spendCoins(99)).toBe(false);
    expect(inv.getCoins()).toBe(6); // unchanged
    expect(emitMock).not.toHaveBeenCalled(); // no event when spend fails
  });

  it('addKeys increases key count and emits inventory:changed', () => {
    const inv = freshInventory();
    inv.addKeys(2);
    expect(inv.getKeys()).toBe(2);

    const last = emitMock.mock.calls.at(-1);
    expect(last?.[0]).toBe('inventory:changed');
    expect(last?.[1]).toEqual({ coins: 0, keys: 2 });
  });

  it('spendKey decrements when keys are available and refuses when empty', () => {
    const inv = freshInventory();
    inv.addKeys(1);
    emitMock.mockClear();

    expect(inv.spendKey()).toBe(true);
    expect(inv.getKeys()).toBe(0);
    expect(emitMock.mock.calls.some((c) => c[0] === 'inventory:changed')).toBe(true);

    emitMock.mockClear();
    expect(inv.spendKey()).toBe(false);
    expect(inv.getKeys()).toBe(0);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('inventory:changed payload reflects both coin and key state on every emit', () => {
    const inv = freshInventory();
    inv.addCoins(7);
    inv.addKeys(2);
    inv.spendCoins(3);

    const payloads = emitMock.mock.calls
      .filter((c) => c[0] === 'inventory:changed')
      .map((c) => c[1]);
    expect(payloads).toEqual([
      { coins: 7, keys: 0 },
      { coins: 7, keys: 2 },
      { coins: 4, keys: 2 },
    ]);
  });

  it('addGem records the floor and emits gem:collected', () => {
    const inv = freshInventory();
    inv.addGem('emerald-forest');
    expect(inv.hasGem('emerald-forest')).toBe(true);
    expect(inv.hasGem('sapphire-swamp')).toBe(false);

    const calls = emitMock.mock.calls.filter((c) => c[0] === 'gem:collected');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toEqual({ floorId: 'emerald-forest' });
  });

  it('addGem is idempotent — duplicate add for same floor does not re-emit', () => {
    const inv = freshInventory();
    inv.addGem('emerald-forest');
    emitMock.mockClear();

    inv.addGem('emerald-forest');
    expect(inv.hasGem('emerald-forest')).toBe(true);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('getGems returns the cumulative set of earned floor ids', () => {
    const inv = freshInventory();
    expect(inv.getGems().size).toBe(0);

    inv.addGem('emerald-forest');
    inv.addGem('sapphire-swamp');

    const gems = inv.getGems();
    expect(gems.size).toBe(2);
    expect(gems.has('emerald-forest')).toBe(true);
    expect(gems.has('sapphire-swamp')).toBe(true);
  });
});
