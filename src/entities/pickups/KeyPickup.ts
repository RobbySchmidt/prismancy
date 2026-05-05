import Phaser from 'phaser';
import { TextureKeys } from '../../config/GameConfig';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';

/**
 * Key pickup. Always absorbed on contact (+1 key into the inventory).
 */
export class KeyPickup extends BasePickup {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.Key, PickupKind.Key);
    this.setScale(1.4);
  }

  onCollect(_scene: Phaser.Scene, inventory: Inventory, _player: Player): boolean {
    inventory.addKeys(1);
    return true;
  }
}
