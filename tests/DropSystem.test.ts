import { describe, it, expect, beforeEach, vi } from 'vitest';

const { onMock, offMock, emitMock } = vi.hoisted(() => ({
  onMock: vi.fn(),
  offMock: vi.fn(),
  emitMock: vi.fn(),
}));

vi.mock('../src/utils/EventBus', () => ({
  EventBus: {
    on: onMock,
    off: offMock,
    emit: emitMock,
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

import { DropSystem, type DropSystemHost } from '../src/systems/DropSystem';
import { PickupKind, RoomKind, type DropTable } from '../src/types';
import { type BasePickup } from '../src/entities/pickups/BasePickup';

interface FakeRoom {
  kind: RoomKind;
}

type SpawnSpy = ReturnType<
  typeof vi.fn<(kind: PickupKind, x: number, y: number) => BasePickup | null>
>;

function makeHost(opts: {
  room?: FakeRoom | undefined;
  center?: { x: number; y: number } | null;
  spawn?: SpawnSpy;
  heartsSuppressed?: boolean;
}): DropSystemHost {
  const room = opts.room;
  const center = opts.center === undefined ? { x: 480, y: 288 } : opts.center;
  return {
    getLayout: () => ({
      rooms: { get: (_id: string): FakeRoom | undefined => room },
    }),
    getCurrentRoomCenter: () => center,
    spawnPickup: opts.spawn ?? vi.fn(() => null),
    isHeartDropSuppressed: () => opts.heartsSuppressed ?? false,
  };
}

describe('DropSystem', () => {
  beforeEach(() => {
    onMock.mockClear();
    offMock.mockClear();
    emitMock.mockClear();
  });

  it('attach() subscribes to floor:roomCleared and detach() unsubscribes', () => {
    const host = makeHost({ room: { kind: RoomKind.Normal } });
    const sys = new DropSystem(host, 'seed-A');

    sys.attach();
    expect(onMock).toHaveBeenCalledTimes(1);
    expect(onMock.mock.calls[0]?.[0]).toBe('floor:roomCleared');
    const handler: unknown = onMock.mock.calls[0]?.[1];
    expect(typeof handler).toBe('function');

    sys.detach();
    expect(offMock).toHaveBeenCalledTimes(1);
    expect(offMock.mock.calls[0]?.[0]).toBe('floor:roomCleared');
    expect(offMock.mock.calls[0]?.[1]).toBe(handler);
  });

  it('skips drops for non-Normal rooms (boss)', () => {
    const spawn: SpawnSpy = vi.fn(() => null);
    const host = makeHost({ room: { kind: RoomKind.Boss }, spawn });
    const sys = new DropSystem(host, 'seed-B');
    sys.attach();
    const handler = onMock.mock.calls[0]?.[1] as (p: { roomId: string }) => void;

    handler({ roomId: 'r-2-2' });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('produces an identical drop for the same (seed, roomId)', () => {
    const spawnA: SpawnSpy = vi.fn(() => null);
    const spawnB: SpawnSpy = vi.fn(() => null);
    const hostA = makeHost({ room: { kind: RoomKind.Normal }, spawn: spawnA });
    const hostB = makeHost({ room: { kind: RoomKind.Normal }, spawn: spawnB });

    // chance: 1 so the rng-vs-chance roll always passes — we're testing the
    // determinism of the *weighted pick*, not the global drop coin flip.
    const table: DropTable = {
      chance: 1,
      entries: [
        { pickup: PickupKind.Heart, weight: 2 },
        { pickup: PickupKind.Coin, weight: 5 },
        { pickup: PickupKind.Key, weight: 1.5 },
      ],
    };

    const sysA = new DropSystem(hostA, 'shared-seed', table);
    const sysB = new DropSystem(hostB, 'shared-seed', table);
    sysA.attach();
    const handlerA = onMock.mock.calls.at(-1)?.[1] as (p: { roomId: string }) => void;
    sysB.attach();
    const handlerB = onMock.mock.calls.at(-1)?.[1] as (p: { roomId: string }) => void;

    handlerA({ roomId: 'r-3-1' });
    handlerB({ roomId: 'r-3-1' });

    expect(spawnA).toHaveBeenCalledTimes(1);
    expect(spawnB).toHaveBeenCalledTimes(1);
    expect(spawnA.mock.calls[0]).toEqual(spawnB.mock.calls[0]);
  });

  it('chance: 0 in the drop table never spawns a pickup', () => {
    const spawn: SpawnSpy = vi.fn(() => null);
    const host = makeHost({ room: { kind: RoomKind.Normal }, spawn });
    const table: DropTable = {
      chance: 0,
      entries: [{ pickup: PickupKind.Heart, weight: 1 }],
    };
    const sys = new DropSystem(host, 'seed-C', table);
    sys.attach();
    const handler = onMock.mock.calls[0]?.[1] as (p: { roomId: string }) => void;

    // Run the handler many times across different room ids — none should drop.
    for (let i = 0; i < 50; i++) handler({ roomId: `r-${i}-0` });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('spawns at the room center returned by the host', () => {
    const spawn: SpawnSpy = vi.fn(() => null);
    const host = makeHost({
      room: { kind: RoomKind.Normal },
      center: { x: 123, y: 456 },
      spawn,
    });
    const table: DropTable = {
      chance: 1, // guarantee we reach the spawn call
      entries: [{ pickup: PickupKind.Coin, weight: 1 }],
    };
    const sys = new DropSystem(host, 'seed-D', table);
    sys.attach();
    const handler = onMock.mock.calls[0]?.[1] as (p: { roomId: string }) => void;

    handler({ roomId: 'r-0-0' });
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0]?.[1]).toBe(123);
    expect(spawn.mock.calls[0]?.[2]).toBe(456);
  });

  it('forwards crate kinds to the host spawnPickup', () => {
    // A drop table containing only crate kinds must surface those kinds in
    // the spawn call — the system shouldn't filter or substitute them.
    const spawn: SpawnSpy = vi.fn(() => null);
    const host = makeHost({ room: { kind: RoomKind.Normal }, spawn });
    const table: DropTable = {
      chance: 1,
      entries: [
        { pickup: PickupKind.BrownCrate, weight: 1 },
        { pickup: PickupKind.GoldCrate, weight: 1 },
      ],
    };
    const sys = new DropSystem(host, 'crate-seed', table);
    sys.attach();
    const handler = onMock.mock.calls[0]?.[1] as (p: { roomId: string }) => void;

    handler({ roomId: 'r-0-0' });
    expect(spawn).toHaveBeenCalledTimes(1);
    const kind = spawn.mock.calls[0]?.[0];
    expect(kind === PickupKind.BrownCrate || kind === PickupKind.GoldCrate).toBe(true);
  });

  it("remaps heart rolls to coins while a Bloodletter's-Pact item is held", () => {
    const spawn: SpawnSpy = vi.fn(() => null);
    const host = makeHost({
      room: { kind: RoomKind.Normal },
      spawn,
      heartsSuppressed: true,
    });
    // Heart-only table so every successful roll exercises the remap.
    const table: DropTable = {
      chance: 1,
      entries: [{ pickup: PickupKind.Heart, weight: 1 }],
    };
    const sys = new DropSystem(host, 'pact-seed', table);
    sys.attach();
    const handler = onMock.mock.calls[0]?.[1] as (p: { roomId: string }) => void;

    handler({ roomId: 'r-1-1' });
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0]?.[0]).toBe(PickupKind.Coin);
  });

  it('heart remap keeps every non-heart drop identical (RNG sequence untouched)', () => {
    // Same seed + room with and without suppression: when the roll lands on
    // a non-heart entry, both hosts must produce the exact same pickup.
    const table: DropTable = {
      chance: 1,
      entries: [
        { pickup: PickupKind.Coin, weight: 5 },
        { pickup: PickupKind.Key, weight: 1.5 },
        { pickup: PickupKind.Heart, weight: 2 },
      ],
    };
    for (let i = 0; i < 30; i++) {
      onMock.mockClear();
      const spawnPlain: SpawnSpy = vi.fn(() => null);
      const spawnPact: SpawnSpy = vi.fn(() => null);
      const plain = new DropSystem(
        makeHost({ room: { kind: RoomKind.Normal }, spawn: spawnPlain }),
        'remap-seed',
        table,
      );
      const pact = new DropSystem(
        makeHost({
          room: { kind: RoomKind.Normal },
          spawn: spawnPact,
          heartsSuppressed: true,
        }),
        'remap-seed',
        table,
      );
      plain.attach();
      const handlerPlain = onMock.mock.calls.at(-1)?.[1] as (p: { roomId: string }) => void;
      pact.attach();
      const handlerPact = onMock.mock.calls.at(-1)?.[1] as (p: { roomId: string }) => void;

      handlerPlain({ roomId: `r-${i}-7` });
      handlerPact({ roomId: `r-${i}-7` });
      const plainKind = spawnPlain.mock.calls[0]?.[0];
      const pactKind = spawnPact.mock.calls[0]?.[0];
      if (plainKind === PickupKind.Heart) {
        expect(pactKind).toBe(PickupKind.Coin);
      } else {
        expect(pactKind).toBe(plainKind);
      }
    }
  });
});
