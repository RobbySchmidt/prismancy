import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { ITEMS, type ItemId } from '../data/items';
import { type ActiveItemSystem } from '../systems/ActiveItemSystem';
import { type PlayerHealth } from '../systems/PlayerHealth';
import { type ItemDefinition } from '../types';
import { EventBus } from '../utils/EventBus';

const SLOT_X = 14;
/** Distance from the bottom HUD edge to the slot's center. The bottom-most
 *  HUD element is the "WASD move · arrows cast · TAB map" hint at
 *  GAME_HEIGHT - 22, plus its own ~14 px line height — so the [Q] label
 *  needs to clear roughly y = GAME_HEIGHT - 40. With label at center+28 and
 *  radius 22, center y = GAME_HEIGHT - 90 lands the label cleanly above
 *  the hint with a few px breathing room. */
const SLOT_Y_FROM_BOTTOM = 96;
const SLOT_RADIUS = 22;
const ICON_SCALE = 1.6;
/** HP threshold below which the slot is greyed out — Blood of Marquis's
 *  active drops the player to 1 HP, so activating at 1 HP would self-kill.
 *  We block use entirely at HP < 2 (= less than one full heart). */
const MIN_HP_TO_ACTIVATE = 2;

/**
 * Bottom-left HUD widget showing the equipped active item:
 *   - Dark stone-circle backdrop with gold trim
 *   - Item icon centered inside
 *   - "[Q]" key prompt below
 *
 * State:
 *   - No active equipped: hidden entirely
 *   - Equipped + usable: full color, slight pulse
 *   - Equipped + un-usable (HP too low): icon greyed out, "[Q]" prompt dim
 *
 * Listens for `activeItem:equipped` (rebuild the icon) and
 * `player:healthChanged` (update grey-out state). Activation flash hooks
 * onto `activeItem:activated`.
 */
export class ActiveItemSlot {
  private readonly scene: Phaser.Scene;
  private readonly backdrop: Phaser.GameObjects.Graphics;
  private readonly trimRing: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly keyLabel: Phaser.GameObjects.Text;
  private currentItemId: string | null = null;
  /** Cached ItemDefinition for `refreshUsable` so we can swap texture
   *  between `textureKey` (full) and `activeEmptyTextureKey` (spent) per
   *  HP gate without re-looking-up ITEMS each frame. */
  private currentItemDef: ItemDefinition | null = null;
  /** Cached so `refreshUsable` knows when to flip greyed → usable without
   *  forcing the caller to pass HP every time. */
  private currentHp = 0;
  private readonly playerHealth: PlayerHealth | null;

  private readonly equippedHandler: (payload: { itemId: string | null }) => void;
  private readonly healthHandler: (payload: { current: number }) => void;
  private readonly activatedHandler: (payload: { itemId: string }) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cy = GAME_HEIGHT - SLOT_Y_FROM_BOTTOM;
    const cx = SLOT_X + SLOT_RADIUS;

    // Stone-circle backdrop: 3-tone radial fill (outer dark / mid stone /
    // inner darker hole) so the icon sits in a recessed socket rather than
    // floating on flat color. Drawn with Graphics so depth + scale work
    // identical to the rest of the HUD.
    this.backdrop = scene.add.graphics();
    this.backdrop.setScrollFactor(0).setDepth(DepthLayers.HUD);
    this.backdrop.fillStyle(0x080014, 1);
    this.backdrop.fillCircle(cx, cy, SLOT_RADIUS);
    this.backdrop.fillStyle(0x1a0c28, 1);
    this.backdrop.fillCircle(cx, cy, SLOT_RADIUS - 2);
    this.backdrop.fillStyle(0x0c0418, 1);
    this.backdrop.fillCircle(cx, cy, SLOT_RADIUS - 5);

    // Gold trim ring — drawn as a dedicated arc so we can tween its alpha
    // for the activation flash without having to redraw the backdrop.
    this.trimRing = scene.add
      .circle(cx, cy, SLOT_RADIUS - 1)
      .setStrokeStyle(2, 0xffc850, 0.85)
      .setFillStyle(0x000000, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 1);

    this.icon = scene.add
      .image(cx, cy, '')
      .setOrigin(0.5, 0.5)
      .setScale(ICON_SCALE)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 2)
      .setVisible(false);

    this.keyLabel = scene.add
      .text(cx, cy + SLOT_RADIUS + 6, '[Q]', {
        fontSize: '12px',
        color: '#ffd0a0',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 2)
      .setVisible(false);

    this.setVisibleAll(false);

    this.equippedHandler = ({ itemId }) => this.handleEquipped(itemId);
    this.healthHandler = ({ current }) => {
      this.currentHp = current;
      this.refreshUsable();
    };
    this.activatedHandler = ({ itemId }) => {
      if (itemId === this.currentItemId) this.playActivationFlash();
    };

    EventBus.on('activeItem:equipped', this.equippedHandler);
    EventBus.on('player:healthChanged', this.healthHandler);
    EventBus.on('activeItem:activated', this.activatedHandler);

    // Prime from current state — equipped item from registry, current HP
    // from PlayerHealth — so the slot renders correctly on a floor-
    // transition rebuild without waiting for a fresh equip / hit event.
    const activeItemSystem = scene.registry.get('activeItemSystem') as
      | ActiveItemSystem
      | undefined;
    const equipped = activeItemSystem?.getEquippedItem();
    if (equipped) this.handleEquipped(equipped.id);

    this.playerHealth = (scene.registry.get('playerHealth') as PlayerHealth | undefined) ?? null;
    if (this.playerHealth) {
      this.currentHp = this.playerHealth.getCurrent();
      this.refreshUsable();
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('activeItem:equipped', this.equippedHandler);
      EventBus.off('player:healthChanged', this.healthHandler);
      EventBus.off('activeItem:activated', this.activatedHandler);
      this.backdrop.destroy();
      this.trimRing.destroy();
      this.icon.destroy();
      this.keyLabel.destroy();
    });
  }

  private handleEquipped(itemId: string | null): void {
    this.currentItemId = itemId;
    if (itemId === null) {
      this.currentItemDef = null;
      this.setVisibleAll(false);
      return;
    }
    const def = ITEMS[itemId as ItemId];
    if (!def) {
      this.currentItemDef = null;
      this.setVisibleAll(false);
      return;
    }
    this.currentItemDef = def;
    this.setVisibleAll(true);
    this.refreshUsable();
  }

  private refreshUsable(): void {
    if (this.currentItemId === null || !this.currentItemDef) return;
    const usable = this.currentHp >= MIN_HP_TO_ACTIVATE;
    const def = this.currentItemDef;
    // If the item provides a dedicated "spent" texture (Blood of Marquis
    // empty vial), texture-swap reads much cleaner than the generic
    // tint+alpha fallback. The full sprite snaps back the moment the
    // player heals back to ≥2 HP.
    if (def.activeEmptyTextureKey) {
      this.icon.setTexture(usable ? def.textureKey : def.activeEmptyTextureKey);
      this.icon.clearTint();
      this.icon.setAlpha(1);
      this.keyLabel.setAlpha(usable ? 1 : 0.5);
      this.trimRing.setStrokeStyle(2, 0xffc850, usable ? 0.85 : 0.45);
      return;
    }
    // Fallback for actives without an empty variant — old greyed-out
    // tint+alpha behaviour. Currently no other actives exist.
    if (usable) {
      this.icon.setTexture(def.textureKey);
      this.icon.clearTint();
      this.icon.setAlpha(1);
      this.keyLabel.setAlpha(1);
      this.trimRing.setStrokeStyle(2, 0xffc850, 0.85);
    } else {
      this.icon.setTexture(def.textureKey);
      this.icon.setTint(0x404048);
      this.icon.setAlpha(0.55);
      this.keyLabel.setAlpha(0.4);
      this.trimRing.setStrokeStyle(2, 0xffc850, 0.35);
    }
  }

  private playActivationFlash(): void {
    // Brief gold ring punch so the activation reads visually even without
    // a screen-tinted SFX. Stroke width pumps up + alpha pulses, then
    // settles back to base.
    this.trimRing.setStrokeStyle(4, 0xfff0a8, 1);
    this.scene.tweens.add({
      targets: this.trimRing,
      alpha: { from: 1, to: 0.85 },
      duration: 280,
      ease: 'Sine.Out',
      onComplete: () => {
        this.trimRing.setStrokeStyle(2, 0xffc850, 0.85);
      },
    });
  }

  private setVisibleAll(visible: boolean): void {
    this.backdrop.setVisible(visible);
    this.trimRing.setVisible(visible);
    this.icon.setVisible(visible);
    this.keyLabel.setVisible(visible);
  }
}
