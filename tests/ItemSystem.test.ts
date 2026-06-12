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

import { ItemSystem } from '../src/systems/ItemSystem';
import { type StatsSystem } from '../src/systems/StatsSystem';
import { ItemPool, type ItemDefinition, type ItemModifier } from '../src/types';

class FakeStats {
  readonly applied: ItemModifier[] = [];
  applyModifier(mod: ItemModifier): void {
    this.applied.push(mod);
  }
}

const TEST_ITEM_PLAIN: ItemDefinition = {
  id: 'test-plain',
  displayName: 'Plain',
  description: '',
  textureKey: 'tex-test-plain',
  pools: [ItemPool.Treasure],
  effects: [
    { stat: 'damage', add: 1 },
    { stat: 'fireRate', mult: 1.5 },
  ],
};

const TEST_ITEM_TINTED: ItemDefinition = {
  id: 'test-tinted',
  displayName: 'Tinted',
  description: '',
  textureKey: 'tex-test-tinted',
  pools: [ItemPool.Treasure],
  effects: [{ stat: 'damage', add: 0.5 }],
  missileTint: 0xff44aa,
};

const TEST_ITEM_PACT: ItemDefinition = {
  id: 'test-pact',
  displayName: 'Pact',
  description: '',
  textureKey: 'tex-test-pact',
  pools: [ItemPool.Treasure],
  effects: [],
  suppressHeartDrops: true,
  coinDropMult: 1.6,
};

describe('ItemSystem', () => {
  beforeEach(() => {
    emitMock.mockClear();
  });

  it('pickUp forwards item effects to StatsSystem.applyModifier', () => {
    const stats = new FakeStats();
    // Cast: FakeStats implements just the slice ItemSystem reads.
    const sys = new ItemSystem(stats as unknown as StatsSystem);
    sys.pickUp(TEST_ITEM_PLAIN);

    expect(stats.applied).toHaveLength(1);
    expect(stats.applied[0]?.itemId).toBe('test-plain');
    expect(stats.applied[0]?.effects).toEqual(TEST_ITEM_PLAIN.effects);
  });

  it('pickUp emits item:picked with the item id', () => {
    const stats = new FakeStats();
    const sys = new ItemSystem(stats as unknown as StatsSystem);
    sys.pickUp(TEST_ITEM_PLAIN);

    const calls = emitMock.mock.calls.filter((c) => c[0] === 'item:picked');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toEqual({ itemId: 'test-plain' });
  });

  it('threads missileTint into the modifier when defined, omits it otherwise', () => {
    const stats = new FakeStats();
    const sys = new ItemSystem(stats as unknown as StatsSystem);

    sys.pickUp(TEST_ITEM_PLAIN);
    expect(stats.applied[0]).not.toHaveProperty('missileTint');

    sys.pickUp(TEST_ITEM_TINTED);
    expect(stats.applied[1]?.missileTint).toBe(0xff44aa);
  });

  it('hasPicked returns true after pickUp, false beforehand', () => {
    const stats = new FakeStats();
    const sys = new ItemSystem(stats as unknown as StatsSystem);
    expect(sys.hasPicked('test-plain')).toBe(false);
    sys.pickUp(TEST_ITEM_PLAIN);
    expect(sys.hasPicked('test-plain')).toBe(true);
    expect(sys.hasPicked('test-tinted')).toBe(false);
  });

  it('getPickedIds returns the cumulative set of picked-up ids', () => {
    const stats = new FakeStats();
    const sys = new ItemSystem(stats as unknown as StatsSystem);
    sys.pickUp(TEST_ITEM_PLAIN);
    sys.pickUp(TEST_ITEM_TINTED);

    const ids = sys.getPickedIds();
    expect(ids.has('test-plain')).toBe(true);
    expect(ids.has('test-tinted')).toBe(true);
    expect(ids.size).toBe(2);
  });

  it("aggregates drop-profile fields (Bloodletter's Pact) on pickUp, idempotent per id", () => {
    const stats = new FakeStats();
    const sys = new ItemSystem(stats as unknown as StatsSystem);

    expect(sys.isHeartDropSuppressed()).toBe(false);
    expect(sys.getCoinDropMultiplier()).toBe(1);

    sys.pickUp(TEST_ITEM_PACT);
    expect(sys.isHeartDropSuppressed()).toBe(true);
    expect(sys.getCoinDropMultiplier()).toBeCloseTo(1.6);

    // Re-picking the same id must not double-apply the multiplier.
    sys.pickUp(TEST_ITEM_PACT);
    expect(sys.getCoinDropMultiplier()).toBeCloseTo(1.6);
  });

  it('hydrate restores drop-profile fields for the floor-transition replay', () => {
    const stats = new FakeStats();
    const sys = new ItemSystem(stats as unknown as StatsSystem);
    sys.hydrate(['test-pact'], (id) => (id === 'test-pact' ? TEST_ITEM_PACT : undefined));

    expect(sys.isHeartDropSuppressed()).toBe(true);
    expect(sys.getCoinDropMultiplier()).toBeCloseTo(1.6);
  });
});
