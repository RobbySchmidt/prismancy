import {
  DUNGEON_GENERATOR_MAX_ITERATIONS,
  DUNGEON_GRID_SIZE,
  DUNGEON_TARGET_ROOM_COUNT,
  LOCK_FLOOR_THRESHOLD,
  ROOM_ENEMY_COUNT_MAX,
  ROOM_ENEMY_COUNT_MIN,
} from '../config/GameConfig';
import {
  Direction,
  type DoorMap,
  DoorKind,
  RoomKind,
  type RoomDescriptor,
} from '../types';
import { RNG } from '../utils/RNG';

/**
 * Hard cap on how many extra rooms the generator may add beyond
 * `targetRoomCount` while trying to find leaf candidates for treasure / shop.
 * Keeps pathologically small floors from ballooning if leafs are scarce.
 */
const MAX_RETRY_ROOMS = 10;

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'] as const;

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const cellKey = (gx: number, gy: number): string => `${gx},${gy}`;
const roomId = (gx: number, gy: number): string => `r-${gx}-${gy}`;

export interface FloorLayout {
  rooms: Map<string, RoomDescriptor>;
  startId: string;
  bossId: string;
  gridSize: number;
}

export interface GenerateOptions {
  seed: string | number;
  targetRoomCount?: number;
  gridSize?: number;
  /**
   * Floor the layout is being generated for (1-based). Drives whether
   * treasure / shop doors are locked: from `LOCK_FLOOR_THRESHOLD` onward
   * special-room doors require a key.
   */
  floorIndex?: number;
}

/**
 * Random-walk dungeon generator. Pure function over the seed: same seed
 * always produces the same layout, so runs are reproducible.
 *
 * Algorithm:
 *  1. Place the start room in the grid center.
 *  2. Repeatedly pick a random already-placed room + direction and place a
 *     new room in the adjacent slot (skip if out of bounds or occupied).
 *  3. Compute doors from adjacency.
 *  4. Mark the room with the largest Manhattan distance from start as boss.
 *     The doors connecting that room to the rest of the dungeon are tagged
 *     `boss` so the renderer knows to use the special texture on both sides.
 */
export class DungeonGenerator {
  static generate(options: GenerateOptions): FloorLayout {
    const gridSize = options.gridSize ?? DUNGEON_GRID_SIZE;
    const targetCount = options.targetRoomCount ?? DUNGEON_TARGET_ROOM_COUNT;
    const floorIndex = options.floorIndex ?? 1;
    if (targetCount < 1) throw new Error('targetRoomCount must be >= 1');
    if (targetCount > gridSize * gridSize) {
      throw new Error(`targetRoomCount (${targetCount}) exceeds grid (${gridSize}×${gridSize})`);
    }

    const rng = new RNG(options.seed);
    const center = Math.floor(gridSize / 2);
    const placed = new Map<string, { gx: number; gy: number }>();
    placed.set(cellKey(center, center), { gx: center, gy: center });

    const tryPlaceOne = (): boolean => {
      const candidates = Array.from(placed.values());
      const from = rng.pick(candidates);
      const dir = rng.pick(DIRECTIONS);
      const d = DELTA[dir];
      const nx = from.gx + d.dx;
      const ny = from.gy + d.dy;
      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) return false;
      const k = cellKey(nx, ny);
      if (placed.has(k)) return false;
      placed.set(k, { gx: nx, gy: ny });
      return true;
    };

    let iterations = 0;
    while (placed.size < targetCount && iterations < DUNGEON_GENERATOR_MAX_ITERATIONS) {
      iterations++;
      tryPlaceOne();
    }

    if (placed.size < targetCount) {
      throw new Error(
        `DungeonGenerator: only placed ${placed.size}/${targetCount} rooms in ${iterations} iterations`,
      );
    }

    const buildDescriptors = (): Map<string, RoomDescriptor> => {
      const out = new Map<string, RoomDescriptor>();
      for (const pos of placed.values()) {
        const doors: Record<Direction, { exists: boolean; kind: DoorKind }> = {
          up: {
            exists: placed.has(cellKey(pos.gx, pos.gy - 1)),
            kind: DoorKind.Normal,
          },
          down: {
            exists: placed.has(cellKey(pos.gx, pos.gy + 1)),
            kind: DoorKind.Normal,
          },
          left: {
            exists: placed.has(cellKey(pos.gx - 1, pos.gy)),
            kind: DoorKind.Normal,
          },
          right: {
            exists: placed.has(cellKey(pos.gx + 1, pos.gy)),
            kind: DoorKind.Normal,
          },
        };
        out.set(roomId(pos.gx, pos.gy), {
          id: roomId(pos.gx, pos.gy),
          gx: pos.gx,
          gy: pos.gy,
          kind: RoomKind.Normal,
          doors: doors as DoorMap,
          decorationSeed: `${options.seed}-room-${pos.gx}-${pos.gy}`,
          enemySpawnCount: rng.intBetween(ROOM_ENEMY_COUNT_MIN, ROOM_ENEMY_COUNT_MAX),
          visited: false,
          cleared: false,
        });
      }
      return out;
    };

    let rooms = buildDescriptors();

    const startId = roomId(center, center);
    let startRoom = rooms.get(startId);
    if (!startRoom) throw new Error('start room missing after generation');
    startRoom.kind = RoomKind.Start;
    startRoom.enemySpawnCount = 0;
    startRoom.visited = true;
    startRoom.cleared = true;

    let bossId = startId;
    let maxDist = -1;
    for (const r of rooms.values()) {
      const d = Math.abs(r.gx - center) + Math.abs(r.gy - center);
      if (d > maxDist) {
        maxDist = d;
        bossId = r.id;
      }
    }

    // Try to expand the dungeon until we have at least 2 leaf rooms that
    // are eligible for treasure / shop placement. Caps out at MAX_RETRY_ROOMS
    // extra rooms so a starved grid doesn't loop forever — we then fall back
    // to non-leaf normal rooms. We only expand when the user actually asked
    // for a non-trivial dungeon (>= 4 rooms = start + boss + 2 specials);
    // tiny tests / debug calls deserve to keep the room count they asked for.
    let extras = 0;
    while (
      targetCount >= 4 &&
      DungeonGenerator.findEligibleLeafs(rooms, startId, bossId).length < 2 &&
      extras < MAX_RETRY_ROOMS &&
      placed.size < gridSize * gridSize
    ) {
      const before = placed.size;
      let attempt = 0;
      while (placed.size === before && attempt < DUNGEON_GENERATOR_MAX_ITERATIONS) {
        attempt++;
        if (tryPlaceOne()) break;
      }
      if (placed.size === before) break; // grid full / unable to place more
      extras++;
      // Rebuild descriptors so adjacency / doors are correct for the new room.
      rooms = buildDescriptors();
      startRoom = rooms.get(startId);
      if (!startRoom) throw new Error('start room missing after retry');
      startRoom.kind = RoomKind.Start;
      startRoom.enemySpawnCount = 0;
      startRoom.visited = true;
      startRoom.cleared = true;
      // Re-pick boss: distance metric may have shifted if a far cell appeared.
      bossId = startId;
      maxDist = -1;
      for (const r of rooms.values()) {
        const d = Math.abs(r.gx - center) + Math.abs(r.gy - center);
        if (d > maxDist) {
          maxDist = d;
          bossId = r.id;
        }
      }
    }

    const bossRoom = rooms.get(bossId);
    if (bossRoom && bossRoom.kind !== RoomKind.Start) {
      bossRoom.kind = RoomKind.Boss;
      bossRoom.enemySpawnCount = 0; // no boss yet — will be wired in Phase 5
      DungeonGenerator.markBossDoors(rooms, bossRoom);
    }

    // --- Treasure & Shop placement ---
    const eligibleLeafs = DungeonGenerator.findEligibleLeafs(rooms, startId, bossId);
    const shuffledLeafs = rng.shuffle(eligibleLeafs);

    const pickSpecial = (used: Set<string>): RoomDescriptor | null => {
      for (const r of shuffledLeafs) {
        if (!used.has(r.id)) return r;
      }
      // Fallback: any non-start, non-boss, non-already-special normal room.
      const fallbacks = Array.from(rooms.values()).filter(
        (r) =>
          r.kind === RoomKind.Normal &&
          r.id !== startId &&
          r.id !== bossId &&
          !used.has(r.id),
      );
      if (fallbacks.length === 0) return null;
      return rng.pick(fallbacks);
    };

    const specialUsed = new Set<string>();
    const locked = floorIndex >= LOCK_FLOOR_THRESHOLD;

    const treasureRoom = pickSpecial(specialUsed);
    if (treasureRoom) {
      treasureRoom.kind = RoomKind.Treasure;
      treasureRoom.enemySpawnCount = 0;
      DungeonGenerator.markSpecialDoors(rooms, treasureRoom, DoorKind.Treasure, locked);
      specialUsed.add(treasureRoom.id);
    }

    const shopRoom = pickSpecial(specialUsed);
    if (shopRoom) {
      shopRoom.kind = RoomKind.Shop;
      shopRoom.enemySpawnCount = 0;
      DungeonGenerator.markSpecialDoors(rooms, shopRoom, DoorKind.Shop, locked);
      specialUsed.add(shopRoom.id);
    }

    return { rooms, startId, bossId, gridSize };
  }

  /**
   * Leaf rooms (door-degree 1) excluding the start and boss rooms, and
   * excluding leafs whose only door connects to the boss room (otherwise we'd
   * have to either retag that door or leave a treasure room hanging off the
   * boss arena). These are the natural candidates for treasure / shop
   * placement: the player has to make a deliberate detour to reach them.
   */
  private static findEligibleLeafs(
    rooms: Map<string, RoomDescriptor>,
    startId: string,
    bossId: string,
  ): RoomDescriptor[] {
    const out: RoomDescriptor[] = [];
    for (const r of rooms.values()) {
      if (r.id === startId || r.id === bossId) continue;
      const existingDirs: Direction[] = [];
      for (const dir of DIRECTIONS) {
        if (r.doors[dir].exists) existingDirs.push(dir);
      }
      if (existingDirs.length !== 1) continue;
      const dir = existingDirs[0]!;
      const d = DELTA[dir];
      const neighborId = roomId(r.gx + d.dx, r.gy + d.dy);
      if (neighborId === bossId) continue;
      out.push(r);
    }
    return out;
  }

  /**
   * Tag both sides of every existing door of `room` as `kind` and set their
   * `locked` flag. Used for treasure / shop rooms so renderers pick the
   * special texture and the unlock logic finds them on entry.
   */
  private static markSpecialDoors(
    rooms: Map<string, RoomDescriptor>,
    room: RoomDescriptor,
    kind: DoorKind,
    locked: boolean,
  ): void {
    for (const dir of DIRECTIONS) {
      const door = room.doors[dir];
      if (!door.exists) continue;
      const d = DELTA[dir];
      const neighborId = roomId(room.gx + d.dx, room.gy + d.dy);
      const neighbor = rooms.get(neighborId);
      if (!neighbor) continue;
      const updatedSelf = {
        ...room.doors,
        [dir]: { ...door, kind, locked },
      };
      const updatedNeighbor = {
        ...neighbor.doors,
        [OPPOSITE[dir]]: { ...neighbor.doors[OPPOSITE[dir]], kind, locked },
      };
      room.doors = updatedSelf as DoorMap;
      neighbor.doors = updatedNeighbor as DoorMap;
    }
  }

  /**
   * For each door of the boss room that connects to a neighbor, tag both
   * sides as `boss` so renderers can use the special texture.
   */
  private static markBossDoors(
    rooms: Map<string, RoomDescriptor>,
    bossRoom: RoomDescriptor,
  ): void {
    for (const dir of DIRECTIONS) {
      const door = bossRoom.doors[dir];
      if (!door.exists) continue;
      const d = DELTA[dir];
      const neighborId = roomId(bossRoom.gx + d.dx, bossRoom.gy + d.dy);
      const neighbor = rooms.get(neighborId);
      if (!neighbor) continue;
      // Mutate via a fresh object to keep DoorMap's Readonly contract honest.
      const updatedSelf = { ...bossRoom.doors, [dir]: { ...door, kind: DoorKind.Boss } };
      const updatedNeighbor = {
        ...neighbor.doors,
        [OPPOSITE[dir]]: { ...neighbor.doors[OPPOSITE[dir]], kind: DoorKind.Boss },
      };
      bossRoom.doors = updatedSelf as DoorMap;
      neighbor.doors = updatedNeighbor as DoorMap;
    }
  }
}
