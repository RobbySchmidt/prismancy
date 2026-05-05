import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { TextureKeys } from '../config/GameConfig';
import { type FloorLayout } from '../dungeon/DungeonGenerator';
import { PickupKind, type Direction, type RoomDescriptor, RoomKind } from '../types';
import { EventBus } from '../utils/EventBus';

const DROP_ICON_TEXTURE: Partial<Record<PickupKind, string>> = {
  [PickupKind.Heart]: TextureKeys.HeartFull,
  [PickupKind.Coin]: TextureKeys.Coin,
  [PickupKind.Key]: TextureKeys.Key,
};
const DROP_ICON_PRIORITY: readonly PickupKind[] = [
  PickupKind.Heart,
  PickupKind.Key,
  PickupKind.Coin,
];

const NEIGHBOR_OFFSET: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * Top-right corner mini-map. Each room slot is a small rectangle:
 *  - hidden: unvisited and not adjacent to any visited room
 *  - greyed-out (preview): unvisited but reachable via a door from a visited
 *    room — shows "there's a room here you haven't been to yet"
 *  - dim green: visited but uncleared
 *  - bright cyan-green: cleared
 *  - red: current room
 *  - magenta accent border: boss room (once visited or previewed)
 *  - small dot: start room marker
 */
export class Minimap {
  private readonly scene: Phaser.Scene;
  private readonly layout: FloorLayout;
  private readonly cells = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly markers = new Map<string, Phaser.GameObjects.Arc[]>();
  private readonly dropIcons = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly cursor: Phaser.GameObjects.Rectangle;
  private currentRoomId: string;
  private cursorRoomId: string | null = null;

  private readonly cellSize = 14;
  private readonly cellGap = 2;
  private readonly anchorX: number;
  private readonly anchorY: number;

  private readonly enteredHandler = (payload: { roomId: string }): void => {
    this.currentRoomId = payload.roomId;
    this.refresh();
  };
  private readonly clearedHandler = (): void => this.refresh();

  constructor(scene: Phaser.Scene, anchorX: number, anchorY: number, layout: FloorLayout) {
    this.scene = scene;
    this.layout = layout;
    this.currentRoomId = layout.startId;
    this.anchorX = anchorX;
    this.anchorY = anchorY;

    const totalSize = this.cellSize + this.cellGap;
    for (const room of layout.rooms.values()) {
      const x = anchorX + room.gx * totalSize;
      const y = anchorY + room.gy * totalSize;
      const cell = scene.add
        .rectangle(x, y, this.cellSize, this.cellSize, 0x000000, 0)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD)
        .setStrokeStyle(1, 0x222222, 0);
      this.cells.set(room.id, cell);

      const tags: Phaser.GameObjects.Arc[] = [];
      if (room.kind === RoomKind.Start) {
        const dot = scene.add
          .circle(x + this.cellSize / 2, y + this.cellSize / 2, 1.5, 0xffffff, 1)
          .setScrollFactor(0)
          .setDepth(DepthLayers.HUD + 1);
        tags.push(dot);
      }
      this.markers.set(room.id, tags);
    }

    // Cursor for map-teleport mode. Hidden by default; shown via setCursor.
    this.cursor = scene.add
      .rectangle(0, 0, this.cellSize + 4, this.cellSize + 4, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5)
      .setStrokeStyle(2, 0xffe066, 1)
      .setVisible(false);

    EventBus.on('floor:roomEntered', this.enteredHandler);
    EventBus.on('floor:roomCleared', this.clearedHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('floor:roomEntered', this.enteredHandler);
      EventBus.off('floor:roomCleared', this.clearedHandler);
    });

    this.refresh();
  }

  private refresh(): void {
    const previewIds = this.computePreviewIds();

    for (const [id, cell] of this.cells) {
      const room = this.layout.rooms.get(id);
      if (!room) continue;
      const isCurrent = id === this.currentRoomId;
      const isVisited = room.visited;
      const isPreview = !isVisited && previewIds.has(id);
      const showCell = isVisited || isPreview;
      const isBoss = room.kind === RoomKind.Boss;
      const isTreasure = room.kind === RoomKind.Treasure;
      const isShop = room.kind === RoomKind.Shop;

      // Special-room border colours — kept distinct from boss-magenta and
      // current-cell red so all four states are readable on the same map.
      const specialBorder = isBoss
        ? 0xff4477
        : isTreasure
          ? 0xffd84a
          : isShop
            ? 0x88ccff
            : null;
      const specialPreviewBorder = isBoss
        ? 0x6a2233
        : isTreasure
          ? 0x806118
          : isShop
            ? 0x3d5a78
            : null;
      const isSpecial = specialBorder !== null;

      cell.setVisible(showCell);
      if (!showCell) {
        cell.setFillStyle(0, 0);
        cell.setStrokeStyle(1, 0x111111, 0);
      } else if (isPreview) {
        cell.setFillStyle(0x2a2a2a, 0.55);
        cell.setStrokeStyle(
          isSpecial ? 1.5 : 1,
          specialPreviewBorder ?? 0x666666,
          0.7,
        );
      } else {
        cell.setFillStyle(this.fillFor(room.cleared, isCurrent), 0.92);
        cell.setStrokeStyle(isSpecial ? 1.5 : 1, specialBorder ?? 0x111111, 1);
      }

      const tags = this.markers.get(id);
      if (tags) for (const t of tags) t.setVisible(showCell);

      this.refreshDropIcons(id, room, showCell && id !== this.currentRoomId);
    }
  }

  /**
   * Render up to 3 small icons in the corner of a cell, one per distinct
   * pickup kind currently waiting in that room. The current room is excluded
   * (player can see those drops directly), and `pendingPickups` is cleared
   * on entry so it only ever lists drops in rooms the player has left.
   */
  private refreshDropIcons(roomId: string, room: RoomDescriptor, eligible: boolean): void {
    const existing = this.dropIcons.get(roomId);
    if (existing) for (const img of existing) img.destroy();
    this.dropIcons.set(roomId, []);

    if (!eligible) return;
    const pending = room.pendingPickups;
    if (!pending || pending.length === 0) return;

    const kindsPresent = new Set<PickupKind>();
    for (const snap of pending) kindsPresent.add(snap.kind);

    const cell = this.cells.get(roomId);
    if (!cell) return;

    // Stack icons in a vertical column on the right edge of the cell so the
    // central fill colour stays readable.
    const icons: Phaser.GameObjects.Image[] = [];
    let row = 0;
    for (const kind of DROP_ICON_PRIORITY) {
      if (!kindsPresent.has(kind)) continue;
      const tex = DROP_ICON_TEXTURE[kind];
      if (!tex) continue;
      const ix = cell.x + this.cellSize - 4;
      const iy = cell.y + 4 + row * 5;
      const icon = this.scene.add
        .image(ix, iy, tex)
        .setOrigin(1, 0)
        .setScale(0.45)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 2);
      icons.push(icon);
      row++;
    }
    this.dropIcons.set(roomId, icons);
  }

  /**
   * Compute the set of unvisited rooms that border at least one visited
   * room via an existing door — i.e. rooms the player can directly reach.
   */
  private computePreviewIds(): Set<string> {
    const result = new Set<string>();
    for (const room of this.layout.rooms.values()) {
      if (!room.visited) continue;
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        if (!room.doors[dir].exists) continue;
        const offset = NEIGHBOR_OFFSET[dir];
        const targetId = `r-${room.gx + offset.dx}-${room.gy + offset.dy}`;
        const target = this.layout.rooms.get(targetId);
        if (target && !target.visited) result.add(targetId);
      }
    }
    return result;
  }

  private fillFor(cleared: boolean, isCurrent: boolean): number {
    if (isCurrent) return 0xff5566;
    if (cleared) return 0x6effa0;
    return 0x2a4a2e;
  }

  // --- Cursor (map-teleport mode) ------------------------------------------

  /**
   * Highlight a room with the teleport cursor. Color encodes whether the
   * room is a valid teleport target (yellow) or just a navigation hop
   * (grey: visited but not valid, e.g. current room).
   */
  setCursor(roomId: string, validTarget: boolean): void {
    this.cursorRoomId = roomId;
    const totalSize = this.cellSize + this.cellGap;
    const room = this.layout.rooms.get(roomId);
    if (!room) {
      this.cursor.setVisible(false);
      return;
    }
    const x = this.anchorX + room.gx * totalSize - 2;
    const y = this.anchorY + room.gy * totalSize - 2;
    this.cursor.setPosition(x, y);
    this.cursor.setStrokeStyle(2, validTarget ? 0xffe066 : 0x888888, 1);
    this.cursor.setVisible(true);
  }

  clearCursor(): void {
    this.cursorRoomId = null;
    this.cursor.setVisible(false);
  }

  getCursorRoomId(): string | null {
    return this.cursorRoomId;
  }

  /**
   * Toggle visibility of every game object owned by the minimap (cells,
   * marker dots, drop icons, cursor). Used to hide the small top-right
   * minimap while the expanded map overlay is open and re-show it on close.
   *
   * On show: runs `refresh()` so per-room visibility (visited / preview /
   * hidden) is reapplied — we can't just blanket-show every cell because
   * unvisited non-preview cells need to stay hidden.
   * On hide: force-hide everything, including the cursor.
   */
  setVisible(visible: boolean): void {
    if (visible) {
      this.refresh();
    } else {
      for (const cell of this.cells.values()) cell.setVisible(false);
      for (const tags of this.markers.values()) for (const t of tags) t.setVisible(false);
      for (const icons of this.dropIcons.values()) for (const i of icons) i.setVisible(false);
      this.cursor.setVisible(false);
    }
  }

  /**
   * Returns the roomId at the given screen position if the pointer lands on
   * a visible cell. Used by UIScene to drive map-mode mouse interactions.
   */
  getRoomIdAtScreenPos(x: number, y: number): string | null {
    const totalSize = this.cellSize + this.cellGap;
    const localX = x - this.anchorX;
    const localY = y - this.anchorY;
    if (localX < 0 || localY < 0) return null;
    const gx = Math.floor(localX / totalSize);
    const gy = Math.floor(localY / totalSize);
    const cellLocalX = localX - gx * totalSize;
    const cellLocalY = localY - gy * totalSize;
    if (cellLocalX > this.cellSize || cellLocalY > this.cellSize) return null;
    const roomId = `r-${gx}-${gy}`;
    const cell = this.cells.get(roomId);
    if (!cell || !cell.visible) return null;
    return roomId;
  }
}
