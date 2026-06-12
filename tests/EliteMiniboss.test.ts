import { describe, expect, it } from 'vitest';
import { DungeonGenerator } from '../src/dungeon/DungeonGenerator';
import { RoomKind, type RoomDescriptor } from '../src/types';

const eliteRooms = (rooms: Map<string, RoomDescriptor>): RoomDescriptor[] =>
  [...rooms.values()].filter((r) => r.elite === true);
const minibossRooms = (rooms: Map<string, RoomDescriptor>): RoomDescriptor[] =>
  [...rooms.values()].filter((r) => r.miniboss === true);

describe('DungeonGenerator elite & miniboss tagging', () => {
  it('tags exactly the requested number of elite rooms, all Normal kind', () => {
    const layout = DungeonGenerator.generate({
      seed: 'elite-1',
      targetRoomCount: 12,
      eliteRoomCount: 2,
    });
    const elites = eliteRooms(layout.rooms);
    expect(elites).toHaveLength(2);
    for (const room of elites) {
      expect(room.kind).toBe(RoomKind.Normal);
      // Elite rooms host exactly one champion.
      expect(room.enemySpawnCount).toBe(1);
      expect(room.miniboss).not.toBe(true);
    }
  });

  it('minibossChance 1 tags exactly one Normal room with enemySpawnCount 0', () => {
    const layout = DungeonGenerator.generate({
      seed: 'mini-1',
      targetRoomCount: 12,
      eliteRoomCount: 2,
      minibossChance: 1,
    });
    const minis = minibossRooms(layout.rooms);
    expect(minis).toHaveLength(1);
    expect(minis[0]?.kind).toBe(RoomKind.Normal);
    expect(minis[0]?.enemySpawnCount).toBe(0);
    expect(minis[0]?.elite).not.toBe(true);
  });

  it('minibossChance 0 / unset never tags a miniboss room', () => {
    for (let i = 0; i < 20; i++) {
      const layout = DungeonGenerator.generate({
        seed: `mini-zero-${i}`,
        targetRoomCount: 12,
        eliteRoomCount: 2,
        minibossChance: 0,
      });
      expect(minibossRooms(layout.rooms)).toHaveLength(0);
    }
  });

  it('never tags start / boss / treasure / shop rooms across many seeds', () => {
    for (let i = 0; i < 100; i++) {
      const layout = DungeonGenerator.generate({
        seed: `special-guard-${i}`,
        targetRoomCount: 12,
        eliteRoomCount: 2,
        minibossChance: 1,
      });
      for (const room of layout.rooms.values()) {
        if (room.elite || room.miniboss) {
          expect(room.kind).toBe(RoomKind.Normal);
          expect(room.id).not.toBe(layout.startId);
          expect(room.id).not.toBe(layout.bossId);
        }
      }
    }
  });

  it('tagging is deterministic per (seed, options)', () => {
    const opts = {
      seed: 'determinism-7',
      targetRoomCount: 14,
      eliteRoomCount: 2,
      minibossChance: 0.35,
    };
    const a = DungeonGenerator.generate(opts);
    const b = DungeonGenerator.generate(opts);
    expect(eliteRooms(a.rooms).map((r) => r.id)).toEqual(eliteRooms(b.rooms).map((r) => r.id));
    expect(minibossRooms(a.rooms).map((r) => r.id)).toEqual(
      minibossRooms(b.rooms).map((r) => r.id),
    );
  });

  it('the 0.35 chance produces miniboss floors only sometimes', () => {
    let withMini = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const layout = DungeonGenerator.generate({
        seed: `chance-${i}`,
        targetRoomCount: 12,
        minibossChance: 0.35,
      });
      if (minibossRooms(layout.rooms).length > 0) withMini++;
    }
    // Loose statistical bounds — the point is "sometimes, not always".
    expect(withMini).toBeGreaterThan(runs * 0.2);
    expect(withMini).toBeLessThan(runs * 0.55);
  });

  it('progressive room counts (10/12/14) generate successfully on the 5×5 grid', () => {
    for (const count of [10, 12, 14]) {
      const layout = DungeonGenerator.generate({
        seed: `roomcount-${count}`,
        targetRoomCount: count,
      });
      expect(layout.rooms.size).toBeGreaterThanOrEqual(count);
    }
  });
});
