import { DEFAULT_DROP_TABLE_NORMAL } from '../config/GameConfig';
import { PickupKind, RoomKind, type DropTable } from '../types';
import { EventBus } from '../utils/EventBus';
import { RNG } from '../utils/RNG';
import { type BasePickup } from '../entities/pickups/BasePickup';

/**
 * Minimal slice of GameScene that DropSystem needs. Defining it here keeps
 * the test surface small (no need to mock all of Phaser) and breaks an
 * otherwise-circular import.
 */
export interface DropSystemHost {
  getLayout(): {
    rooms: { get: (id: string) => { kind: RoomKind } | undefined };
  } | null;
  getCurrentRoomCenter(): { x: number; y: number } | null;
  spawnPickup(kind: PickupKind, x: number, y: number): BasePickup | null;
}

/**
 * Listens for `floor:roomCleared` and rolls a single drop in the cleared
 * room's center using the run's `dungeonSeed` + the room id as the RNG
 * seed, so drops are deterministic per (seed, room).
 *
 * Only Normal rooms drop here — Boss / Treasure / Shop rooms have their
 * own reward paths in later chunks.
 */
export class DropSystem {
  constructor(
    private readonly host: DropSystemHost,
    private readonly dungeonSeed: string,
    private readonly table: DropTable = DEFAULT_DROP_TABLE_NORMAL,
  ) {}

  attach(): void {
    EventBus.on('floor:roomCleared', this.handleRoomCleared);
  }

  detach(): void {
    EventBus.off('floor:roomCleared', this.handleRoomCleared);
  }

  private readonly handleRoomCleared = (payload: { roomId: string }): void => {
    const layout = this.host.getLayout();
    if (!layout) return;
    const desc = layout.rooms.get(payload.roomId);
    if (!desc || desc.kind !== RoomKind.Normal) return;

    const rng = new RNG(`${this.dungeonSeed}-drop-${payload.roomId}`);
    if (!rng.chance(this.table.chance)) return;

    if (this.table.entries.length === 0) return;
    const entry = rng.pickWeighted(this.table.entries);
    if (!entry) return;

    const center = this.host.getCurrentRoomCenter();
    if (!center) return;

    this.host.spawnPickup(entry.pickup, center.x, center.y);
  };
}
