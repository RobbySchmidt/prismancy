import Phaser from 'phaser';
import { HP_PER_HEART, TextureKeys } from '../../config/GameConfig';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';

/**
 * Walk-over heart. Heals one full heart (HP_PER_HEART) on contact. The
 * full-HP gate lives in `canCollect` so the GameScene overlap handler can
 * refuse the purchase BEFORE charging coins for shop hearts (otherwise the
 * player would pay and not heal).
 */
export class HeartPickup extends BasePickup {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.HeartFull, PickupKind.Heart);
    this.setScale(1.4);
  }

  override canCollect(player: Player): boolean {
    if (!super.canCollect(player)) return false;
    return player.health.getCurrent() < player.health.getMax();
  }

  onCollect(_scene: Phaser.Scene, _inventory: Inventory, player: Player): boolean {
    player.health.heal(HP_PER_HEART);
    return true;
  }
}
