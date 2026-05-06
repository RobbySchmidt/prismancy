import Phaser from 'phaser';
import { gemTextureKey } from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { FLOORS, type FloorId } from '../../data/floors';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';

/**
 * Cryptic flavour lines that float up from the gem on pickup. Picked at random
 * each collect — the player should rarely see the same one twice in a run.
 * Tone: hint at something older watching, without committing to a specific
 * lore beat (those slot in once Onyx Mansion + the secret endboss exist).
 */
const GEM_MESSAGES: readonly string[] = [
  'The forest remembers...',
  'Roots whisper of older days.',
  'A green pulse stirs beneath.',
  'Bark and bone, leaf and stone.',
  'Something ancient is watching.',
  'You are seen.',
  'The seal weakens.',
  'It hums in the dark.',
];

/**
 * Walk-over no-hit boss trophy. Adds the source floor's gem to the run
 * Inventory (`addGem`); the gem is purely a trophy in this chunk and doesn't
 * yet feed any other system. Texture is per-floor (`gemTextureKey`) so the
 * Emerald Forest gem reads as green, future floors get their own colour.
 *
 * Visual treatment is intentionally heavy so the no-hit reward feels rare:
 * 1.8× scale, a pulsating green halo behind the gem, and a floating cryptic
 * message that drifts up from the pickup spot when collected.
 */
export class GemPickup extends BasePickup {
  private readonly floorId: string;
  private readonly glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, floorId: string) {
    super(scene, x, y, gemTextureKey(floorId), PickupKind.Gem);
    this.floorId = floorId;
    this.setScale(1.8);

    // Pulsating halo behind the gem — uses the source floor's palette glow
    // so each gem reads in its own colour (emerald green, sapphire cyan,
    // onyx amethyst). Falls back to the emerald glow if the floor id isn't
    // in `FLOORS`, which would only happen for a malformed save file.
    const haloColor = FLOORS[floorId as FloorId]?.palette.glow ?? 0x6effa0;
    this.glow = scene.add
      .circle(x, y, 26, haloColor, 0.45)
      .setDepth(DepthLayers.Pickup - 1);
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.25, to: 0.7 },
      scale: { from: 0.85, to: 1.45 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Tear the glow + its tween down whenever the gem itself is destroyed
    // (collect, room teardown, scene shutdown — all funnel through DESTROY).
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.tweens.killTweensOf(this.glow);
      this.glow.destroy();
    });
  }

  override onCollect(scene: Phaser.Scene, inventory: Inventory, _player: Player): boolean {
    inventory.addGem(this.floorId);
    this.spawnCrypticMessage(scene);
    return true;
  }

  /**
   * Floating italic line that fades up from the gem position then drifts
   * further up while fading out. Lives on the GameScene so it persists past
   * the pickup destroy and scrolls with the world.
   */
  private spawnCrypticMessage(scene: Phaser.Scene): void {
    const message =
      GEM_MESSAGES[Math.floor(Math.random() * GEM_MESSAGES.length)] ?? GEM_MESSAGES[0]!;
    const startY = this.y - 18;
    const text = scene.add
      .text(this.x, startY, message, {
        fontSize: '15px',
        color: '#cefad0',
        fontStyle: 'italic',
        align: 'center',
        stroke: '#0a1f0d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(DepthLayers.HUD)
      .setAlpha(0);

    scene.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 },
      y: startY - 18,
      duration: 320,
      ease: 'Sine.Out',
      onComplete: () => {
        scene.tweens.add({
          targets: text,
          alpha: 0,
          y: startY - 56,
          duration: 1800,
          delay: 1200,
          ease: 'Sine.In',
          onComplete: () => text.destroy(),
        });
      },
    });
  }
}
