import type Phaser from 'phaser';
import { gemTextureKey } from '../../config/GameConfig';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';

/**
 * Walk-over no-hit boss trophy. Adds the source floor's gem to the run
 * Inventory (`addGem`); the gem is purely a trophy in this chunk and doesn't
 * yet feed any other system. Texture is per-floor (`gemTextureKey`) so the
 * Emerald Forest gem reads as green, future floors get their own colour.
 */
export class GemPickup extends BasePickup {
  private readonly floorId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, floorId: string) {
    super(scene, x, y, gemTextureKey(floorId), PickupKind.Gem);
    this.floorId = floorId;
    this.setScale(1.4);
  }

  override onCollect(_scene: Phaser.Scene, inventory: Inventory, _player: Player): boolean {
    inventory.addGem(this.floorId);
    return true;
  }
}
