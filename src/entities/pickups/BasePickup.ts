import Phaser from 'phaser';
import {
  PICKUP_HITBOX_RADIUS,
  SHOP_REJECT_COOLDOWN_MS,
  WORLD_SPRITE_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { type PickupKind } from '../../types';
import { type Inventory } from '../../systems/Inventory';
import { type Player } from '../Player';

/**
 * Walk-over pickup baseline. Subclasses (Heart / Coin / Key / Item) provide the
 * `onCollect` behaviour and a texture key. The pickup gets a circular
 * hitbox and a gentle bobbing tween so it reads as interactive on the floor.
 *
 * `onCollect` returns a boolean: true = absorbed (caller destroys the
 * sprite), false = stay on the floor. The GameScene overlap handler honours
 * this.
 *
 * Shop slots set `price` + `shopSlotIndex` after construction; the overlap
 * handler then calls `tryPurchase` before `onCollect` so the coin spend
 * sits in front of the actual pickup behaviour.
 *
 * Phaser-property-collision note: we deliberately avoid field names like
 * `state` / `input` / `scene` (Phaser already owns those on Sprite). `kind`
 * is fine.
 */
export abstract class BasePickup extends Phaser.Physics.Arcade.Sprite {
  readonly kind: PickupKind;

  /**
   * Price in coins for shop slots. Undefined for free / dropped pickups —
   * `tryPurchase` then short-circuits to `'free'`.
   */
  price?: number;
  /**
   * Slot index this pickup occupies in its shop room (0..SHOP_SLOT_COUNT-1).
   * Undefined for free pickups. Used to write back into
   * `RoomDescriptor.purchasedShopSlots` so a partial-bought shop only
   * re-spawns the unbought slots on re-entry.
   */
  shopSlotIndex?: number;
  /**
   * Original X for shop slots. The reject wackel-tween nudges `x` and we
   * snap back here on completion so a series of rejects doesn't drift the
   * pickup out of its slot.
   */
  shopBaseX?: number;

  /**
   * When true, the GameScene overlap handler spends an inventory key before
   * calling `onCollect`. Used by gold crates. Like `price`, also opts the
   * pickup into reject feedback (`flashRejected`) when the gate fails.
   */
  requiresKey?: boolean;

  /**
   * Earliest scene-time (ms) at which this pickup may be collected. Used by
   * crate-spawned drops so the player can see what just popped out of the
   * crate instead of instantly absorbing pickups that materialised under
   * their feet. Default: 0 (no protection).
   */
  protectionUntil = 0;

  private lastRejectAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    kind: PickupKind,
    options?: { bobbing?: boolean },
  ) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = kind;
    this.setDepth(DepthLayers.Pickup);
    this.setScale(WORLD_SPRITE_SCALE);

    // Counter-scale the body so its world size stays at the authored radius
    // regardless of WORLD_SPRITE_SCALE. Centered circular hitbox — fits all
    // three pickup textures since they're smaller than 32 px and visually
    // centered.
    const radius = PICKUP_HITBOX_RADIUS / WORLD_SPRITE_SCALE;
    this.setCircle(
      radius,
      this.width / 2 - radius,
      this.height / 2 - radius,
    );

    // Idle bobbing — ±2 px on the y axis, yoyo, looping forever. Used to
    // distinguish pickups from static decorations on the floor. Crates opt
    // out via `bobbing: false` (they sit on the floor like containers).
    if (options?.bobbing !== false) {
      scene.tweens.add({
        targets: this,
        y: y - 2,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  /**
   * Resolve a walk-over collection. Implementations apply their effect
   * (heal, add coin, add key, ...) and return whether the pickup should
   * disappear. `false` keeps it on the floor.
   */
  abstract onCollect(scene: Phaser.Scene, inventory: Inventory, player: Player): boolean;

  /**
   * Pre-collection check so the overlap handler can refuse "no-op" pickups
   * (e.g. a heart at full HP) without spending coins. Default: always
   * collectable. Heart overrides this to gate on current/max HP.
   */
  canCollect(_player: Player): boolean {
    return this.scene.time.now >= this.protectionUntil;
  }

  /**
   * Make this pickup uncollectable for `ms` milliseconds from now. Crates use
   * this so their burst loot is visible on the floor before the player can
   * walk over it.
   */
  setSpawnProtection(ms: number): void {
    this.protectionUntil = this.scene.time.now + ms;
  }

  /**
   * Charge the player for this pickup if it has a price, returning the
   * outcome:
   *   - `'free'`     — no price set, proceed straight to onCollect
   *   - `'paid'`     — price spent, proceed to onCollect
   *   - `'too-poor'` — coins insufficient, no spend, no onCollect
   */
  tryPurchase(inventory: Inventory): 'free' | 'paid' | 'too-poor' {
    if (this.price === undefined) return 'free';
    return inventory.spendCoins(this.price) ? 'paid' : 'too-poor';
  }

  /**
   * Brief shake + red tint so a rejected purchase reads as "you can't afford
   * that". Throttled by `SHOP_REJECT_COOLDOWN_MS` because the overlap fires
   * every frame the player is on the slot.
   */
  flashRejected(scene: Phaser.Scene): void {
    if (scene.time.now < this.lastRejectAt + SHOP_REJECT_COOLDOWN_MS) return;
    this.lastRejectAt = scene.time.now;
    const baseX = this.shopBaseX ?? this.x;
    scene.tweens.add({
      targets: this,
      x: baseX + 4,
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.setX(baseX);
      },
    });
    this.setTint(0xff5566);
    scene.time.delayedCall(180, () => this.clearTint());
  }
}
