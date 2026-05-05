import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { GAME_HEIGHT, GAME_WIDTH, TextureKeys } from '../config/GameConfig';
import { type FloorLayout } from '../dungeon/DungeonGenerator';
import { PickupKind, type Direction, type RoomDescriptor, RoomKind } from '../types';
import { EventBus } from '../utils/EventBus';

const DROP_ICON_TEXTURE: Partial<Record<PickupKind, string>> = {
  [PickupKind.Heart]: TextureKeys.HeartFull,
  [PickupKind.Coin]: TextureKeys.Coin,
  [PickupKind.Key]: TextureKeys.Key,
  [PickupKind.GoldCrate]: TextureKeys.GoldCrate,
  [PickupKind.BrownCrate]: TextureKeys.BrownCrate,
};
const DROP_ICON_PRIORITY: readonly PickupKind[] = [
  PickupKind.Heart,
  PickupKind.GoldCrate,
  PickupKind.BrownCrate,
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
 * Big map view shown in the centre-left of the screen while the player is
 * in map-mode (TAB). Same content model as the small top-right `Minimap`,
 * just rendered with larger cells so room state + drop icons are clearly
 * legible. The right half of the screen stays free for `PickedItemsList`.
 *
 * Initial state is hidden — UIScene calls `show()` / `hide()` when entering
 * / leaving map-mode.
 */
export class ExpandedMap {
  private readonly scene: Phaser.Scene;
  private readonly layout: FloorLayout;
  private readonly cells = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly markers = new Map<string, Phaser.GameObjects.Arc[]>();
  private readonly dropIcons = new Map<string, Phaser.GameObjects.Image[]>();
  private readonly cursor: Phaser.GameObjects.Rectangle;
  private currentRoomId: string;
  private cursorRoomId: string | null = null;

  // Bigger cells than the small minimap (14 px) so the map is clearly
  // legible while paused. Cell-block stride = cellSize + cellGap.
  private readonly cellSize = 36;
  private readonly cellGap = 6;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private visible = false;

  private readonly enteredHandler = (payload: { roomId: string }): void => {
    this.currentRoomId = payload.roomId;
    if (this.visible) this.refresh();
  };
  private readonly clearedHandler = (): void => {
    if (this.visible) this.refresh();
  };

  constructor(scene: Phaser.Scene, layout: FloorLayout) {
    this.scene = scene;
    this.layout = layout;
    this.currentRoomId = layout.startId;

    // Centre the map on the left half of the screen (right half is reserved
    // for PickedItemsList). Total map width/height is 5 * (36+6) = 210 px,
    // so anchor at (centreX - 105, centreY - 105) for the requested
    // (GAME_WIDTH * 0.32, GAME_HEIGHT * 0.45) centre.
    const totalSize = this.cellSize + this.cellGap;
    const mapPx = 5 * totalSize;
    const centreX = GAME_WIDTH * 0.32;
    const centreY = GAME_HEIGHT * 0.45;
    this.anchorX = Math.round(centreX - mapPx / 2);
    this.anchorY = Math.round(centreY - mapPx / 2);

    for (const room of layout.rooms.values()) {
      const x = this.anchorX + room.gx * totalSize;
      const y = this.anchorY + room.gy * totalSize;
      const cell = scene.add
        .rectangle(x, y, this.cellSize, this.cellSize, 0x000000, 0)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 3)
        .setStrokeStyle(2, 0x222222, 0)
        .setVisible(false);
      this.cells.set(room.id, cell);

      const tags: Phaser.GameObjects.Arc[] = [];
      if (room.kind === RoomKind.Start) {
        // Bigger start dot scaled to the bigger cells.
        const dot = scene.add
          .circle(x + this.cellSize / 2, y + this.cellSize / 2, 3.5, 0xffffff, 1)
          .setScrollFactor(0)
          .setDepth(DepthLayers.HUD + 4)
          .setVisible(false);
        tags.push(dot);
      }
      this.markers.set(room.id, tags);
    }

    // Cursor for map-teleport mode. Hidden by default; shown via setCursor.
    this.cursor = scene.add
      .rectangle(0, 0, this.cellSize + 6, this.cellSize + 6, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 8)
      .setStrokeStyle(3, 0xffe066, 1)
      .setVisible(false);

    EventBus.on('floor:roomEntered', this.enteredHandler);
    EventBus.on('floor:roomCleared', this.clearedHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('floor:roomEntered', this.enteredHandler);
      EventBus.off('floor:roomCleared', this.clearedHandler);
    });
  }

  /** Reveal the map and re-render every cell from current layout state. */
  show(): void {
    this.visible = true;
    this.refresh();
  }

  /** Hide every owned game object, clear cursor selection. */
  hide(): void {
    this.visible = false;
    for (const cell of this.cells.values()) cell.setVisible(false);
    for (const tags of this.markers.values()) for (const t of tags) t.setVisible(false);
    for (const icons of this.dropIcons.values()) for (const i of icons) i.setVisible(false);
    this.cursor.setVisible(false);
    this.cursorRoomId = null;
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
        cell.setStrokeStyle(2, 0x111111, 0);
      } else if (isPreview) {
        cell.setFillStyle(0x2a2a2a, 0.55);
        cell.setStrokeStyle(
          isSpecial ? 3 : 2,
          specialPreviewBorder ?? 0x666666,
          0.7,
        );
      } else {
        cell.setFillStyle(this.fillFor(room.cleared, isCurrent), 0.92);
        cell.setStrokeStyle(isSpecial ? 3 : 2, specialBorder ?? 0x111111, 1);
      }

      const tags = this.markers.get(id);
      if (tags) for (const t of tags) t.setVisible(showCell);

      this.refreshDropIcons(id, room, showCell && id !== this.currentRoomId);
    }
  }

  /**
   * Render up to 3 drop icons stacked along the right edge of the cell,
   * matching the small-minimap layout but at a larger scale so the icons
   * are clearly readable on the bigger cells.
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

    const icons: Phaser.GameObjects.Image[] = [];
    let row = 0;
    for (const kind of DROP_ICON_PRIORITY) {
      if (!kindsPresent.has(kind)) continue;
      const tex = DROP_ICON_TEXTURE[kind];
      if (!tex) continue;
      const ix = cell.x + this.cellSize - 4;
      const iy = cell.y + 4 + row * 12;
      const icon = this.scene.add
        .image(ix, iy, tex)
        .setOrigin(1, 0)
        .setScale(0.95)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 5);
      icons.push(icon);
      row++;
    }
    this.dropIcons.set(roomId, icons);
  }

  /** Mirror of Minimap's preview-set computation. */
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

  // --- Cursor (map-teleport mode) -------------------------------------------

  setCursor(roomId: string, validTarget: boolean): void {
    if (!this.visible) return;
    this.cursorRoomId = roomId;
    const totalSize = this.cellSize + this.cellGap;
    const room = this.layout.rooms.get(roomId);
    if (!room) {
      this.cursor.setVisible(false);
      return;
    }
    const x = this.anchorX + room.gx * totalSize - 3;
    const y = this.anchorY + room.gy * totalSize - 3;
    this.cursor.setPosition(x, y);
    this.cursor.setStrokeStyle(3, validTarget ? 0xffe066 : 0x888888, 1);
    this.cursor.setVisible(true);
  }

  clearCursor(): void {
    this.cursorRoomId = null;
    this.cursor.setVisible(false);
  }

  getCursorRoomId(): string | null {
    return this.cursorRoomId;
  }

  /** Returns the roomId at the given screen pos if it lands on a visible cell. */
  getRoomIdAtScreenPos(x: number, y: number): string | null {
    if (!this.visible) return null;
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
