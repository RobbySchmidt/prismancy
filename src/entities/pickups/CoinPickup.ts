import Phaser from 'phaser';
import { TextureKeys } from '../../config/GameConfig';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';

/**
 * Coin pickup. Always absorbed on contact (+1 coin into the inventory).
 */
export class CoinPickup extends BasePickup {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.Coin, PickupKind.Coin);
    this.setScale(1.4);
  }

  onCollect(_scene: Phaser.Scene, inventory: Inventory, _player: Player): boolean {
    inventory.addCoins(1);
    return true;
  }
}
