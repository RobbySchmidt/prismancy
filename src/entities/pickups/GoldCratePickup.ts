import Phaser from 'phaser';
import { TextureKeys } from '../../config/GameConfig';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';
import { CRATE_LOOT_PROTECTION_MS, type CrateHost, spawnCrateSparkles } from './BrownCratePickup';
import { EventBus } from '../../utils/EventBus';
import { RNG } from '../../utils/RNG';
import { GOLD_CRATE_TABLE, rollCrateContents, type CrateOutcome } from '../../data/crateContents';

/**
 * Gold crate — locked. The GameScene overlap handler honours
 * `requiresKey = true` and spends 1 inventory key before invoking
 * `onCollect`. Loot pool is richer than brown and includes a rare
 * treasure-pool item slot.
 *
 * We deliberately go around BrownCrate's `super(...)` — the texture +
 * `kind` differ — so the inheritance is for shared spawn / sparkle helpers
 * only, not the constructor.
 */
export class GoldCratePickup extends BasePickup {
  private readonly host: CrateHost;
  private readonly seed: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    host: CrateHost,
    seed: string,
  ) {
    super(scene, x, y, TextureKeys.GoldCrate, PickupKind.GoldCrate, { bobbing: false });
    this.host = host;
    this.seed = seed;
    this.setScale(1.3);
    this.requiresKey = true;
  }

  override onCollect(_scene: Phaser.Scene, _inventory: Inventory, _player: Player): boolean {
    this.openAndSpawn();
    return true;
  }

  private openAndSpawn(): void {
    EventBus.emit('crate:opened', { kind: this.kind, goldCrate: true });

    const outcome = rollCrateContents(GOLD_CRATE_TABLE, new RNG(this.seed));
    this.spawnOutcome(outcome);
    this.playOpenEffect();
  }

  /**
   * Identical burst behaviour to BrownCrate, but we duplicate it on
   * GoldCrate rather than chaining via inheritance so an edit to one crate's
   * VFX doesn't silently change the other. Small price for clarity.
   */
  private spawnOutcome(outcome: CrateOutcome): void {
    const cx = this.x;
    const cy = this.y;
    const burstRng = new RNG(`${this.seed}-burst`);
    for (const entry of outcome.entries) {
      for (let k = 0; k < entry.count; k++) {
        const angle = burstRng.floatBetween(0, Math.PI * 2);
        const dist = burstRng.floatBetween(10, 22);
        const targetX = cx + Math.cos(angle) * dist;
        const targetY = cy + Math.sin(angle) * dist;

        if (entry.kind === PickupKind.Item) {
          if (outcome.itemPool === 'treasure' && this.host.spawnTreasureItemAt) {
            const itemPickup = this.host.spawnTreasureItemAt(targetX, targetY);
            // Same protection as the other crate loot so the rare item is
            // visible on the floor before the player can absorb it.
            itemPickup?.setSpawnProtection(CRATE_LOOT_PROTECTION_MS);
          }
          continue;
        }

        const pickup = this.host.spawnPickup(entry.kind, cx, cy);
        if (!pickup) continue;
        // Match the brown crate's spawn-protection so the player can see the
        // loot before walking onto it.
        pickup.setSpawnProtection(CRATE_LOOT_PROTECTION_MS);
        this.scene.tweens.add({
          targets: pickup,
          x: targetX,
          y: targetY,
          duration: 240,
          ease: 'Quad.Out',
        });
      }
    }
  }

  private playOpenEffect(): void {
    this.scene.cameras.main.shake(180, 0.006);
    spawnCrateSparkles(this.scene, this.x, this.y, 0xffe066, 12, 28, 18);
  }
}
