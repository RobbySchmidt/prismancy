import { describe, it, expect } from 'vitest';
import { DungeonGenerator } from '../src/dungeon/DungeonGenerator';
import { DoorKind, RoomKind } from '../src/types';

const baseSeed = 'prismancy-test-seed';

describe('DungeonGenerator', () => {
  it('produces identical layouts for the same seed', () => {
    const a = DungeonGenerator.generate({ seed: baseSeed });
    const b = DungeonGenerator.generate({ seed: baseSeed });
    expect(Array.from(a.rooms.keys()).sort()).toEqual(Array.from(b.rooms.keys()).sort());
    expect(a.startId).toBe(b.startId);
    expect(a.bossId).toBe(b.bossId);
  });

  it('produces different layouts for different seeds', () => {
    const a = DungeonGenerator.generate({ seed: 'seed-A' });
    const b = DungeonGenerator.generate({ seed: 'seed-B' });
    const aKeys = Array.from(a.rooms.keys()).sort().join('|');
    const bKeys = Array.from(b.rooms.keys()).sort().join('|');
    expect(aKeys).not.toBe(bKeys);
  });

  it('places exactly the requested number of rooms', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    expect(layout.rooms.size).toBe(8);
  });

  it('starts in the grid center', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, gridSize: 5 });
    const start = layout.rooms.get(layout.startId)!;
    expect(start.gx).toBe(2);
    expect(start.gy).toBe(2);
    expect(start.kind).toBe(RoomKind.Start);
  });

  it('marks exactly one start room and (for >1 rooms) one boss room', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const starts = Array.from(layout.rooms.values()).filter((r) => r.kind === RoomKind.Start);
    const bosses = Array.from(layout.rooms.values()).filter((r) => r.kind === RoomKind.Boss);
    expect(starts).toHaveLength(1);
    expect(bosses).toHaveLength(1);
    expect(starts[0]!.id).toBe(layout.startId);
    expect(bosses[0]!.id).toBe(layout.bossId);
  });

  it('boss is placed at the room with the largest Manhattan distance from start', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const start = layout.rooms.get(layout.startId)!;
    const boss = layout.rooms.get(layout.bossId)!;
    const bossDist = Math.abs(boss.gx - start.gx) + Math.abs(boss.gy - start.gy);
    for (const r of layout.rooms.values()) {
      const d = Math.abs(r.gx - start.gx) + Math.abs(r.gy - start.gy);
      expect(d).toBeLessThanOrEqual(bossDist);
    }
  });

  it('all doors are bidirectional (a door from A→B implies one from B→A)', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 9 });
    for (const room of layout.rooms.values()) {
      for (const [dir, info] of Object.entries(room.doors) as Array<
        ['up' | 'down' | 'left' | 'right', (typeof room.doors)['up']]
      >) {
        if (!info.exists) continue;
        const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
        const neighbor = layout.rooms.get(`r-${room.gx + dx}-${room.gy + dy}`);
        expect(neighbor).toBeDefined();
        const opposite =
          dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left';
        expect(neighbor!.doors[opposite].exists).toBe(true);
      }
    }
  });

  it('door kinds match on both sides (boss-tagged doors are tagged on both rooms)', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    for (const room of layout.rooms.values()) {
      for (const [dir, info] of Object.entries(room.doors) as Array<
        ['up' | 'down' | 'left' | 'right', (typeof room.doors)['up']]
      >) {
        if (!info.exists) continue;
        const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
        const neighbor = layout.rooms.get(`r-${room.gx + dx}-${room.gy + dy}`)!;
        const opposite =
          dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left';
        expect(neighbor.doors[opposite].kind).toBe(info.kind);
      }
    }
  });

  it('all rooms are reachable from start (the random walk preserves connectivity)', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const visited = new Set<string>();
    const queue = [layout.startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const room = layout.rooms.get(id);
      if (!room) continue;
      for (const [dir, info] of Object.entries(room.doors) as Array<
        ['up' | 'down' | 'left' | 'right', (typeof room.doors)['up']]
      >) {
        if (!info.exists) continue;
        const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
        const nid = `r-${room.gx + dx}-${room.gy + dy}`;
        if (!visited.has(nid)) queue.push(nid);
      }
    }
    expect(visited.size).toBe(layout.rooms.size);
  });

  it('start room is marked cleared and visited; boss room has 0 enemies', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const start = layout.rooms.get(layout.startId)!;
    const boss = layout.rooms.get(layout.bossId)!;
    expect(start.cleared).toBe(true);
    expect(start.visited).toBe(true);
    expect(start.enemySpawnCount).toBe(0);
    expect(boss.enemySpawnCount).toBe(0);
    expect(boss.cleared).toBe(false);
  });

  it('throws when targetRoomCount exceeds grid capacity', () => {
    expect(() =>
      DungeonGenerator.generate({ seed: baseSeed, gridSize: 3, targetRoomCount: 100 }),
    ).toThrow();
  });

  it('handles a 1-room dungeon (start = boss room is suppressed)', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 1 });
    expect(layout.rooms.size).toBe(1);
    const onlyRoom = layout.rooms.get(layout.startId)!;
    expect(onlyRoom.kind).toBe(RoomKind.Start);
    // Boss should not overwrite start
    expect(layout.bossId).toBe(layout.startId);
  });

  it('boss-tagged doors only exist on edges of the boss room', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 9 });
    for (const room of layout.rooms.values()) {
      const isBoss = room.id === layout.bossId;
      const isBossNeighbor = isAdjacentTo(layout, room, layout.bossId);
      for (const info of Object.values(room.doors)) {
        if (!info.exists) continue;
        if (info.kind === DoorKind.Boss) {
          expect(isBoss || isBossNeighbor).toBe(true);
        }
      }
    }
  });

  it('produces exactly one treasure room and one shop room', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const treasures = Array.from(layout.rooms.values()).filter(
      (r) => r.kind === RoomKind.Treasure,
    );
    const shops = Array.from(layout.rooms.values()).filter((r) => r.kind === RoomKind.Shop);
    expect(treasures).toHaveLength(1);
    expect(shops).toHaveLength(1);
  });

  it('treasure / shop / start / boss are four distinct rooms', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const treasure = Array.from(layout.rooms.values()).find(
      (r) => r.kind === RoomKind.Treasure,
    )!;
    const shop = Array.from(layout.rooms.values()).find((r) => r.kind === RoomKind.Shop)!;
    const ids = new Set([layout.startId, layout.bossId, treasure.id, shop.id]);
    expect(ids.size).toBe(4);
  });

  it('floor 1 leaves all doors unlocked', () => {
    const layout = DungeonGenerator.generate({
      seed: baseSeed,
      targetRoomCount: 8,
      floorIndex: 1,
    });
    for (const room of layout.rooms.values()) {
      for (const info of Object.values(room.doors)) {
        if (!info.exists) continue;
        expect(info.locked ?? false).toBe(false);
      }
    }
  });

  it('floor 2 locks treasure / shop doors, leaves the rest unlocked', () => {
    const layout = DungeonGenerator.generate({
      seed: baseSeed,
      targetRoomCount: 8,
      floorIndex: 2,
    });
    let lockedFound = 0;
    for (const room of layout.rooms.values()) {
      for (const info of Object.values(room.doors)) {
        if (!info.exists) continue;
        if (info.kind === DoorKind.Treasure || info.kind === DoorKind.Shop) {
          expect(info.locked).toBe(true);
          lockedFound++;
        } else {
          expect(info.locked ?? false).toBe(false);
        }
      }
    }
    // Each special-room connection contributes 2 sides (room + neighbor),
    // so we expect at least 2 locked door tags overall.
    expect(lockedFound).toBeGreaterThanOrEqual(2);
  });

  it('treasure / shop placement is deterministic for the same seed', () => {
    const a = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const b = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 8 });
    const findKind = (
      layout: ReturnType<typeof DungeonGenerator.generate>,
      kind: typeof RoomKind.Treasure | typeof RoomKind.Shop,
    ): string => {
      const r = Array.from(layout.rooms.values()).find((room) => room.kind === kind);
      if (!r) throw new Error(`expected a ${kind} room`);
      return r.id;
    };
    expect(findKind(a, RoomKind.Treasure)).toBe(findKind(b, RoomKind.Treasure));
    expect(findKind(a, RoomKind.Shop)).toBe(findKind(b, RoomKind.Shop));
  });

  it('guarantees treasure + shop even with a tiny targetRoomCount (5)', () => {
    const layout = DungeonGenerator.generate({ seed: baseSeed, targetRoomCount: 5 });
    const treasures = Array.from(layout.rooms.values()).filter(
      (r) => r.kind === RoomKind.Treasure,
    );
    const shops = Array.from(layout.rooms.values()).filter((r) => r.kind === RoomKind.Shop);
    expect(treasures).toHaveLength(1);
    expect(shops).toHaveLength(1);
  });

  // Regression: prior to the dead-end-only refactor, the generator's fallback
  // path could place a Treasure / Shop on a 2-door pass-through normal room
  // sitting between Start and Boss. On locked floors that turned the boss
  // unreachable without a key. Verify across many seeds that specials are
  // always leaves.
  it('treasure + shop rooms are always dead-ends (door-degree 1)', () => {
    for (let i = 0; i < 50; i++) {
      const layout = DungeonGenerator.generate({
        seed: `dead-end-invariant-${i}`,
        floorIndex: 1,
      });
      for (const room of layout.rooms.values()) {
        if (room.kind !== RoomKind.Treasure && room.kind !== RoomKind.Shop) continue;
        const doorCount = Object.values(room.doors).filter((d) => d.exists).length;
        expect(
          doorCount,
          `seed ${i} room ${room.id} (${room.kind}) has ${doorCount} doors`,
        ).toBe(1);
      }
    }
  });

  // Regression: ~3 % of seeds used to produce no shop and/or no treasure room
  // because the retry loop's pure-random placement frequently failed to grow
  // any new leaves before exhausting `MAX_RETRY_ROOMS`. The smart-retry leaf-
  // bias (with a non-articulation-point non-leaf safety net for the rare
  // remainder) brings this rate to zero. Run a wide sweep so we catch any
  // future regression that re-introduces the scarcity.
  it('treasure + shop spawn for every seed across a wide sweep', () => {
    let missing = 0;
    for (let i = 0; i < 1000; i++) {
      const layout = DungeonGenerator.generate({
        seed: `prismancy-special-coverage-${i}`,
        floorIndex: 3,
      });
      const has = (kind: typeof RoomKind.Treasure | typeof RoomKind.Shop): boolean =>
        Array.from(layout.rooms.values()).some((r) => r.kind === kind);
      if (!has(RoomKind.Treasure) || !has(RoomKind.Shop)) missing++;
    }
    expect(missing).toBe(0);
  });

  // Regression: when the smart-retry safety net kicks in (non-leaf room used
  // as a special) the chosen room must still leave the boss reachable from
  // start without spending a key. BFS the door graph while pretending the
  // special room doesn't exist; the boss must remain reachable.
  it('boss is always reachable from start without traversing specials', () => {
    for (let i = 0; i < 200; i++) {
      const layout = DungeonGenerator.generate({
        seed: `prismancy-boss-reachability-${i}`,
        floorIndex: 3,
      });
      const specials = Array.from(layout.rooms.values()).filter(
        (r) => r.kind === RoomKind.Treasure || r.kind === RoomKind.Shop,
      );
      for (const special of specials) {
        const visited = new Set<string>([special.id]);
        const queue: string[] = [layout.startId];
        let reached = false;
        while (queue.length > 0) {
          const id = queue.shift()!;
          if (id === layout.bossId) {
            reached = true;
            break;
          }
          if (visited.has(id)) continue;
          visited.add(id);
          const room = layout.rooms.get(id);
          if (!room) continue;
          for (const [dir, info] of Object.entries(room.doors) as Array<
            ['up' | 'down' | 'left' | 'right', (typeof room.doors)['up']]
          >) {
            if (!info.exists) continue;
            const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
            const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
            queue.push(`r-${room.gx + dx}-${room.gy + dy}`);
          }
        }
        expect(
          reached,
          `seed ${i} boss unreachable when ${special.kind} room ${special.id} is excluded`,
        ).toBe(true);
      }
    }
  });
});

function isAdjacentTo(
  layout: ReturnType<typeof DungeonGenerator.generate>,
  room: { gx: number; gy: number },
  otherId: string,
): boolean {
  const other = layout.rooms.get(otherId);
  if (!other) return false;
  return Math.abs(other.gx - room.gx) + Math.abs(other.gy - room.gy) === 1;
}
