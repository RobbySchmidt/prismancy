import Phaser from 'phaser';
import { TextureKeys } from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';
import { BasePickup } from './BasePickup';
import { EventBus } from '../../utils/EventBus';
import { RNG } from '../../utils/RNG';
import { BROWN_CRATE_TABLE, rollCrateContents, type CrateOutcome } from '../../data/crateContents';

/**
 * Subset of GameScene the crate needs to spawn its loot. Defined here so
 * the crate stays decoupled from the full scene type and is testable in
 * isolation (no full Phaser scene required).
 */
export interface CrateHost {
  spawnPickup(kind: PickupKind, x: number, y: number): BasePickup | null;
  spawnTreasureItemAt?(x: number, y: number): BasePickup | null;
}

/** Random offset (px) for crate-loot spawn jitter. ±18 px in both axes. */
const CRATE_BURST_JITTER = 18;
/** Outward burst tween duration (ms) for crate loot. */
const CRATE_BURST_DURATION_MS = 220;
/**
 * Spawn protection (ms) applied to every loot pickup the crate burst-spawns.
 * Without this the player — who is by definition standing on the crate when
 * it opens — would instantly absorb every drop before it finishes tweening
 * outward. With it, the loot lands on the floor and the player has to walk
 * over each piece to collect it.
 */
export const CRATE_LOOT_PROTECTION_MS = 700;

/**
 * Spawn `count` glow particles flying outward from `(x, y)`. Shared between
 * brown / gold crates and modelled on `BaseEnemy.die()`'s sparkle burst.
 */
export function spawnCrateSparkles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number,
  baseDist: number,
  jitter: number,
): void {
  const baseAngle = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (Math.PI * 2 * i) / count;
    const dist = baseDist + Math.random() * jitter;
    const sparkle = scene.add
      .circle(x, y, 2, color, 1)
      .setDepth(DepthLayers.Particle);
    scene.tweens.add({
      targets: sparkle,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.3,
      duration: 360,
      ease: 'Sine.Out',
      onComplete: () => sparkle.destroy(),
    });
  }
}

/**
 * Brown crate — walks open on contact, no key required. Spits 1-3 normal
 * drops (heart / coin / key) in a small outward burst. Outcome is rolled
 * from `BROWN_CRATE_TABLE` against a deterministic seed (same crate
 * position in the same run always rolls the same loot).
 *
 * Crates do NOT bob — they read as static containers on the floor. We pass
 * `bobbing: false` to BasePickup instead of trying to kill the tween after
 * the fact.
 */
export class BrownCratePickup extends BasePickup {
  private readonly host: CrateHost;
  private readonly seed: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    host: CrateHost,
    seed: string,
  ) {
    super(scene, x, y, TextureKeys.BrownCrate, PickupKind.BrownCrate, { bobbing: false });
    this.host = host;
    this.seed = seed;
    this.setScale(1.3);
  }

  override onCollect(_scene: Phaser.Scene, _inventory: Inventory, _player: Player): boolean {
    this.openAndSpawn();
    return true; // crate disappears; loot is now on the floor.
  }

  /**
   * Roll the crate's contents and instantiate them via the host. Each spawned
   * pickup is jittered + burst-tweened outward from the crate's position so
   * the player gets a clear "boom, here's the loot" moment instead of a stack
   * of overlapping sprites.
   */
  private openAndSpawn(): void {
    EventBus.emit('crate:opened', { kind: this.kind, goldCrate: false });

    const outcome = rollCrateContents(BROWN_CRATE_TABLE, new RNG(this.seed));
    this.spawnOutcome(outcome);
    this.playOpenEffect();
  }

  private spawnOutcome(outcome: CrateOutcome): void {
    const cx = this.x;
    const cy = this.y;
    const burstRng = new RNG(`${this.seed}-burst`);
    for (const entry of outcome.entries) {
      for (let k = 0; k < entry.count; k++) {
        // Spread across an arc so combos don't pile on one side.
        const angle = burstRng.floatBetween(0, Math.PI * 2);
        const dist = burstRng.floatBetween(8, CRATE_BURST_JITTER);
        const targetX = cx + Math.cos(angle) * dist;
        const targetY = cy + Math.sin(angle) * dist;

        if (entry.kind === PickupKind.Item) {
          // Item crates only meaningful for gold crates; brown table never
          // contains Item entries, but guard anyway so a future table edit
          // doesn't silently swallow the drop.
          if (outcome.itemPool === 'treasure' && this.host.spawnTreasureItemAt) {
            const itemPickup = this.host.spawnTreasureItemAt(targetX, targetY);
            itemPickup?.setSpawnProtection(CRATE_LOOT_PROTECTION_MS);
          }
          continue;
        }

        const pickup = this.host.spawnPickup(entry.kind, cx, cy);
        if (!pickup) continue;
        // Spawn protection so the player can SEE the loot land before it
        // gets absorbed (otherwise the pickup spawns under the player's
        // feet and the overlap handler swallows it next frame).
        pickup.setSpawnProtection(CRATE_LOOT_PROTECTION_MS);
        // Tween from crate origin out to the jittered target so the burst
        // reads dramatically.
        this.scene.tweens.add({
          targets: pickup,
          x: targetX,
          y: targetY,
          duration: CRATE_BURST_DURATION_MS,
          ease: 'Quad.Out',
        });
      }
    }
  }

  private playOpenEffect(): void {
    this.scene.cameras.main.shake(120, 0.004);
    spawnCrateSparkles(this.scene, this.x, this.y, 0xffd84a, 6, 24, 14);
  }
}
