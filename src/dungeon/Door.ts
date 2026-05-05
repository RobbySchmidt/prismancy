import Phaser from 'phaser';
import {
  TILE_SIZE,
  bossDoorKey,
  shopDoorKey,
  treasureDoorKey,
  wallTileKey,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type Direction, DoorKind } from '../types';

/**
 * Door at the edge of a room. Owns:
 *  - a barrier sprite + static physics body that blocks the player while
 *    the room is uncleared (closed) or while the door is locked,
 *  - a Zone with a static body the GameScene uses as an overlap trigger to
 *    detect "player walked through this door".
 *
 * Boss doors render with the special boss-door texture in both states.
 * Treasure / shop doors render with their own dedicated textures so the
 * player can tell at a glance which room is on the other side. Locked doors
 * stay closed even after the room is cleared — they only open via
 * `tryUnlock`, which the GameScene calls when the player has a key.
 */
export class Door {
  readonly direction: Direction;
  readonly kind: DoorKind;
  readonly trigger: Phaser.GameObjects.Zone;

  private barrier: Phaser.Physics.Arcade.Image | null = null;
  private isOpen = true;
  private locked: boolean;
  private readonly scene: Phaser.Scene;
  private readonly position: { x: number; y: number };
  private readonly floorId: string;

  constructor(
    scene: Phaser.Scene,
    floorId: string,
    direction: Direction,
    kind: DoorKind,
    position: { x: number; y: number },
    initiallyOpen: boolean,
    locked: boolean = false,
  ) {
    this.scene = scene;
    this.floorId = floorId;
    this.direction = direction;
    this.kind = kind;
    this.position = position;
    this.locked = locked;

    this.trigger = scene.add.zone(position.x, position.y, TILE_SIZE, TILE_SIZE);
    scene.physics.add.existing(this.trigger, true);
    this.trigger.setDataEnabled();
    this.trigger.setData('door', this);

    // Locked doors always start closed regardless of `initiallyOpen` — the
    // room may be cleared but the special-room door still requires a key.
    if (!initiallyOpen || locked) {
      this.close();
    }
  }

  isClosed(): boolean {
    return !this.isOpen;
  }

  isLocked(): boolean {
    return this.locked;
  }

  open(): void {
    // Locked doors ignore plain `open()` — only `tryUnlock` can clear them.
    if (this.locked) return;
    if (this.isOpen) return;
    this.isOpen = true;
    if (this.barrier) {
      this.barrier.destroy();
      this.barrier = null;
    }
  }

  /**
   * Consume the lock and open the door. Returns `true` if the lock was
   * cleared (caller should debit a key), `false` if the door wasn't locked
   * or was already open.
   */
  tryUnlock(): boolean {
    if (!this.locked) return false;
    this.locked = false;
    if (this.isOpen) return true;
    this.isOpen = true;
    if (this.barrier) {
      this.barrier.destroy();
      this.barrier = null;
    }
    return true;
  }

  close(): void {
    if (!this.isOpen && this.barrier) return;
    this.isOpen = false;
    const textureKey = this.barrierTextureKey();
    this.barrier = this.scene.physics.add.staticImage(
      this.position.x,
      this.position.y,
      textureKey,
    );
    this.barrier.setDepth(DepthLayers.Wall);
  }

  /**
   * Pick the barrier texture by (kind, locked). Locked treasure / shop doors
   * get their own dedicated textures so the player sees the lock + room hint
   * at a glance; everything else falls back to the wall-tile look.
   */
  private barrierTextureKey(): string {
    if (this.kind === DoorKind.Boss) return bossDoorKey(this.floorId);
    if (this.locked && this.kind === DoorKind.Treasure) return treasureDoorKey(this.floorId);
    if (this.locked && this.kind === DoorKind.Shop) return shopDoorKey(this.floorId);
    return wallTileKey(this.floorId);
  }

  getBarrier(): Phaser.Physics.Arcade.Image | null {
    return this.barrier;
  }

  destroy(): void {
    this.barrier?.destroy();
    this.barrier = null;
    this.trigger.destroy();
  }
}
