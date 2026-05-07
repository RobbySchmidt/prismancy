import Phaser from 'phaser';
import {
  DUNGEON_GRID_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_MAX_HEALTH,
  SceneKeys,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { FLOORS, STARTING_FLOOR_ID, type FloorId } from '../data/floors';
import { type FloorLayout } from '../dungeon/DungeonGenerator';
import { type Direction, type RoomDescriptor } from '../types';
import { BossHealthBar } from '../ui/BossHealthBar';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { ExpandedMap } from '../ui/ExpandedMap';
import { HealthDisplay } from '../ui/HealthDisplay';
import { ItemToast } from '../ui/ItemToast';
import { Minimap } from '../ui/Minimap';
import { PickedItemsList } from '../ui/PickedItemsList';
import { EventBus } from '../utils/EventBus';

const NEIGHBOR_OFFSET: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * Runs in parallel to GameScene. Phase 3 wires up the minimap, HP display,
 * and the map-teleport mode (TAB to open, arrow keys to navigate, Enter to
 * teleport).
 */
export class UIScene extends Phaser.Scene {
  private layout: FloorLayout | null = null;
  private minimap: Minimap | null = null;
  private expandedMap: ExpandedMap | null = null;
  private pickedItemsList: PickedItemsList | null = null;
  private currentRoomId = '';

  private mapMode = false;
  private mapOverlay!: Phaser.GameObjects.Rectangle;
  private mapHelpText!: Phaser.GameObjects.Text;

  private readonly roomEnteredHandler = (payload: { roomId: string }): void => {
    this.currentRoomId = payload.roomId;
  };

  constructor() {
    super({ key: SceneKeys.UI, active: false });
  }

  create(): void {
    const floorId =
      (this.registry.get('currentFloorId') as FloorId | undefined) ?? STARTING_FLOOR_ID;
    const theme = FLOORS[floorId];

    this.add
      .text(8, 6, theme.displayName, {
        fontSize: '20px',
        color: '#e9d5ff',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD);

    // Pull the live PlayerHealth off the registry so the HUD comes up with
    // the ACTUAL current/max — a floor transition might launch this scene
    // after the carry-over HP has already been restored, in which case
    // `player:healthChanged` has already fired and the HUD would otherwise
    // sit at base PLAYER_MAX_HEALTH until the next damage event.
    const playerHealth = this.registry.get('playerHealth') as
      | { getCurrent(): number; getMax(): number }
      | undefined;
    const initialMax = playerHealth?.getMax() ?? PLAYER_MAX_HEALTH;
    const initialCurrent = playerHealth?.getCurrent() ?? PLAYER_MAX_HEALTH;
    new HealthDisplay(this, 8, 32, initialMax, initialCurrent);

    // Coin / key counters sit just below the hearts so the left-edge HUD
    // reads top-to-bottom: floor name → hearts → coins → keys.
    new CurrencyDisplay(this, 8, 56);

    // Pickup announcement toast (item name + effect).
    new ItemToast(this);

    this.add
      .text(8, GAME_HEIGHT - 22, 'WASD move · arrows cast · TAB map', {
        fontSize: '13px',
        color: '#aaaaaa',
      })
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD);

    this.layout = (this.registry.get('floorLayout') as FloorLayout | undefined) ?? null;
    if (this.layout) {
      this.currentRoomId = this.layout.startId;
      const totalSize = 14 + 2;
      const mapWidthPx = DUNGEON_GRID_SIZE * totalSize;
      const anchorX = GAME_WIDTH - mapWidthPx - 12;
      const anchorY = 12;
      this.minimap = new Minimap(this, anchorX, anchorY, this.layout);
      this.expandedMap = new ExpandedMap(this, this.layout);
    }

    this.pickedItemsList = new PickedItemsList(this);

    new BossHealthBar(this);

    this.buildMapOverlay();
    this.registerMapModeKeys();
    this.registerMapMouseHandlers();

    EventBus.on('floor:roomEntered', this.roomEnteredHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('floor:roomEntered', this.roomEnteredHandler);
    });
  }

  // --- Map mode ------------------------------------------------------------

  private buildMapOverlay(): void {
    this.mapOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 2)
      .setVisible(false);

    this.mapHelpText = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 28,
        'Arrows: move cursor · Enter: teleport · Tab/Esc: close',
        { fontSize: '14px', color: '#e9d5ff' },
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 6)
      .setVisible(false);
  }

  private registerMapModeKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture(['TAB']);
    kb.on('keydown-TAB', () => this.toggleMapMode());
    kb.on('keydown-ESC', () => {
      if (this.mapMode) this.closeMap();
    });
    kb.on('keydown-ENTER', () => {
      if (this.mapMode) this.attemptTeleport();
    });
    kb.on('keydown-UP', () => {
      if (this.mapMode) this.moveCursor('up');
    });
    kb.on('keydown-DOWN', () => {
      if (this.mapMode) this.moveCursor('down');
    });
    kb.on('keydown-LEFT', () => {
      if (this.mapMode) this.moveCursor('left');
    });
    kb.on('keydown-RIGHT', () => {
      if (this.mapMode) this.moveCursor('right');
    });
  }

  private registerMapMouseHandlers(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.mapMode || !this.layout) return;
      const map = this.activeMap();
      if (!map) return;
      const roomId = map.getRoomIdAtScreenPos(pointer.x, pointer.y);
      if (!roomId) return;
      const room = this.layout.rooms.get(roomId);
      if (!room || !room.visited) return;
      this.refreshCursor(roomId);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.mapMode || !this.layout) return;
      const map = this.activeMap();
      if (!map) return;
      const roomId = map.getRoomIdAtScreenPos(pointer.x, pointer.y);
      if (!roomId) return;
      this.refreshCursor(roomId);
      this.attemptTeleport();
    });
  }

  /**
   * Returns the currently-driving map widget — the small Minimap in normal
   * play (cursor unused), the big ExpandedMap in map-mode. Used by every
   * cursor / teleport / mouse-pos lookup so we don't have to branch on
   * `mapMode` at every call site.
   */
  private activeMap(): ExpandedMap | Minimap | null {
    if (this.mapMode) return this.expandedMap;
    return this.minimap;
  }

  private toggleMapMode(): void {
    if (this.mapMode) {
      this.closeMap();
      return;
    }
    if (!this.layout || !this.expandedMap) return;
    const current = this.layout.rooms.get(this.currentRoomId);
    if (!current || !current.cleared) return; // only openable mid-safe-room
    this.openMap();
  }

  private openMap(): void {
    if (!this.expandedMap) return;
    this.mapMode = true;
    this.mapOverlay.setVisible(true);
    this.mapHelpText.setVisible(true);
    // Hide the small top-right minimap so the screen real estate goes to the
    // expanded view, then show the expanded map and put the cursor on the
    // current room as a starting point.
    this.minimap?.setVisible(false);
    this.minimap?.clearCursor();
    this.expandedMap.show();
    this.refreshCursor(this.currentRoomId);
    this.pickedItemsList?.show();
    EventBus.emit('map:opened');
  }

  private closeMap(): void {
    if (!this.mapMode) return;
    this.mapMode = false;
    this.mapOverlay.setVisible(false);
    this.mapHelpText.setVisible(false);
    this.expandedMap?.hide();
    this.minimap?.setVisible(true);
    this.minimap?.clearCursor();
    this.pickedItemsList?.hide();
    EventBus.emit('map:closed');
  }

  private moveCursor(dir: Direction): void {
    if (!this.layout) return;
    const map = this.activeMap();
    if (!map) return;
    const cursorId = map.getCursorRoomId();
    if (!cursorId) return;
    const cursor = this.layout.rooms.get(cursorId);
    if (!cursor) return;
    const offset = NEIGHBOR_OFFSET[dir];
    const targetId = `r-${cursor.gx + offset.dx}-${cursor.gy + offset.dy}`;
    const target = this.layout.rooms.get(targetId);
    if (!target || !target.visited) return; // stay put if no visited room there
    this.refreshCursor(targetId);
  }

  private refreshCursor(roomId: string): void {
    if (!this.layout) return;
    const map = this.activeMap();
    if (!map) return;
    const target = this.layout.rooms.get(roomId);
    if (!target) return;
    const validTeleport = this.isValidTeleportTarget(target);
    map.setCursor(roomId, validTeleport);
  }

  private attemptTeleport(): void {
    if (!this.layout) return;
    const map = this.activeMap();
    if (!map) return;
    const cursorId = map.getCursorRoomId();
    if (!cursorId) return;
    const target = this.layout.rooms.get(cursorId);
    if (!target || !this.isValidTeleportTarget(target)) return;
    EventBus.emit('map:teleport', { roomId: cursorId });
    this.closeMap();
  }

  private isValidTeleportTarget(target: RoomDescriptor): boolean {
    if (!target.visited || !target.cleared) return false;
    if (target.id === this.currentRoomId) return false;
    return true;
  }
}
