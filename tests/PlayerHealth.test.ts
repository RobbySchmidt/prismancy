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

import { PlayerHealth } from '../src/systems/PlayerHealth';

describe('PlayerHealth', () => {
  beforeEach(() => {
    emitMock.mockClear();
  });

  it('starts at full HP and isAlive', () => {
    const h = new PlayerHealth(6, 800);
    expect(h.getCurrent()).toBe(6);
    expect(h.getMax()).toBe(6);
    expect(h.isAlive()).toBe(true);
  });

  it('throws if max <= 0', () => {
    expect(() => new PlayerHealth(0, 800)).toThrow();
    expect(() => new PlayerHealth(-1, 800)).toThrow();
  });

  it('takeDamage subtracts HP and emits healthChanged + tookDamage', () => {
    const h = new PlayerHealth(6, 800);
    expect(h.takeDamage(2, 1000)).toBe(true);
    expect(h.getCurrent()).toBe(4);

    const events = emitMock.mock.calls.map((c) => c[0]);
    expect(events).toContain('player:tookDamage');
    expect(events).toContain('player:healthChanged');
    expect(events).not.toContain('player:died');
  });

  it('returns false and does not subtract HP during i-frames', () => {
    const h = new PlayerHealth(6, 800);
    h.takeDamage(1, 1000); // sets vulnerable-at = 1800
    expect(h.takeDamage(1, 1100)).toBe(false);
    expect(h.takeDamage(1, 1500)).toBe(false);
    expect(h.takeDamage(1, 1799)).toBe(false);
    expect(h.getCurrent()).toBe(5);
  });

  it('accepts damage again exactly when i-frame window expires', () => {
    const h = new PlayerHealth(6, 800);
    h.takeDamage(1, 1000);
    expect(h.takeDamage(1, 1800)).toBe(true);
    expect(h.getCurrent()).toBe(4);
  });

  it('emits player:died exactly on the transition to 0 HP', () => {
    const h = new PlayerHealth(2, 0);
    h.takeDamage(1, 0);
    expect(emitMock.mock.calls.some((c) => c[0] === 'player:died')).toBe(false);
    h.takeDamage(1, 0);
    const diedEvents = emitMock.mock.calls.filter((c) => c[0] === 'player:died');
    expect(diedEvents).toHaveLength(1);
    expect(h.isAlive()).toBe(false);
  });

  it('does not emit player:died twice if takeDamage is called past 0', () => {
    const h = new PlayerHealth(1, 0);
    h.takeDamage(1, 0);
    h.takeDamage(1, 100);
    h.takeDamage(1, 200);
    const diedCount = emitMock.mock.calls.filter((c) => c[0] === 'player:died').length;
    expect(diedCount).toBe(1);
  });

  it('takeDamage(0) or negative returns false and does not emit', () => {
    const h = new PlayerHealth(6, 800);
    expect(h.takeDamage(0, 1000)).toBe(false);
    expect(h.takeDamage(-3, 1000)).toBe(false);
    expect(h.getCurrent()).toBe(6);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('overkill damage clamps to 0 HP', () => {
    const h = new PlayerHealth(2, 0);
    h.takeDamage(99, 0);
    expect(h.getCurrent()).toBe(0);
    expect(h.isAlive()).toBe(false);
  });

  it('heal restores HP up to max and emits healthChanged', () => {
    const h = new PlayerHealth(6, 0);
    h.takeDamage(4, 0);
    emitMock.mockClear();
    h.heal(2);
    expect(h.getCurrent()).toBe(4);
    expect(emitMock.mock.calls.some((c) => c[0] === 'player:healthChanged')).toBe(true);
  });

  it('heal cannot revive a dead player', () => {
    const h = new PlayerHealth(2, 0);
    h.takeDamage(2, 0);
    emitMock.mockClear();
    h.heal(2);
    expect(h.getCurrent()).toBe(0);
    expect(h.isAlive()).toBe(false);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('heal does not emit if HP did not change', () => {
    const h = new PlayerHealth(6, 0);
    emitMock.mockClear();
    h.heal(3); // already at max
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('resetToFull restores HP and clears i-frames', () => {
    const h = new PlayerHealth(4, 800);
    h.takeDamage(3, 1000);
    h.resetToFull();
    expect(h.getCurrent()).toBe(4);
    expect(h.isVulnerable(1000)).toBe(true);
  });

  it('addMaxHealth raises max + heals the same amount and emits healthChanged', () => {
    const h = new PlayerHealth(6, 0);
    h.takeDamage(3, 0); // current = 3, max = 6
    emitMock.mockClear();

    h.addMaxHealth(2);
    expect(h.getMax()).toBe(8);
    expect(h.getCurrent()).toBe(5); // healed by 2
    const events = emitMock.mock.calls.filter((c) => c[0] === 'player:healthChanged');
    expect(events).toHaveLength(1);
    expect(events[0]?.[1]).toEqual({ current: 5, max: 8 });
  });
});
