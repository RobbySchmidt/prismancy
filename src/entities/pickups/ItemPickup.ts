import Phaser from 'phaser';
import { ITEM_FLOAT_OFFSET, TextureKeys, WORLD_SPRITE_SCALE } from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { PickupKind, type ItemDefinition } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type ItemSystem } from '../../systems/ItemSystem';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';

/**
 * Walk-up item pedestal. The pedestal stone is rendered beneath, the item
 * icon floats slightly above its center, with a soft warm glow underneath.
 * Collecting applies the item's effects through `ItemSystem`. The room
 * descriptor's `looted` flag (set in GameScene's overlap handler) prevents
 * the pedestal from respawning on re-entry — Item-kind pickups are
 * deliberately not snapshotted into `pendingPickups`.
 */
export class ItemPickup extends BasePickup {
  private readonly pedestal: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Arc;
  private readonly itemDef: ItemDefinition;
  private readonly itemSystem: ItemSystem;

  /** Item id the pedestal currently displays — read by the boss-room teardown
   * snapshot so a re-entry can rebuild the same pedestal. */
  get itemId(): string {
    return this.itemDef.id;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    itemDef: ItemDefinition,
    itemSystem: ItemSystem,
  ) {
    // Item icon floats above the pedestal center. The base class also adds a
    // bobbing tween on `y`, which reads naturally for the floating icon.
    super(scene, x, y - ITEM_FLOAT_OFFSET, itemDef.textureKey, PickupKind.Item);
    this.itemDef = itemDef;
    this.itemSystem = itemSystem;
    // Item icons are 14×14 native — too tiny to read on the pedestal. Bumping
    // the visual scale here keeps the icon recognisable without touching the
    // physics hitbox (Arcade body stays at PICKUP_HITBOX_RADIUS).
    this.setScale(1.8 * WORLD_SPRITE_SCALE);

    // Pedestal sits at the original (x, y). One layer below the icon so the
    // icon clearly reads as "on top".
    this.pedestal = scene.add
      .image(x, y, TextureKeys.ItemPedestal)
      .setDepth(DepthLayers.Pickup - 1)
      .setScale(WORLD_SPRITE_SCALE);

    // Soft warm halo under the icon — same depth band as the pedestal so it
    // sits behind the icon but on top of the floor. Sized to roughly match
    // the scaled-up icon.
    this.glow = scene.add
      .circle(x, y - ITEM_FLOAT_OFFSET + 2, 14, 0xffe066, 0.18)
      .setDepth(DepthLayers.Pickup - 1);
  }

  override onCollect(_scene: Phaser.Scene, _inventory: Inventory, _player: Player): boolean {
    this.itemSystem.pickUp(this.itemDef);
    return true;
  }

  override destroy(fromScene?: boolean): void {
    this.pedestal.destroy();
    this.glow.destroy();
    super.destroy(fromScene);
  }
}
