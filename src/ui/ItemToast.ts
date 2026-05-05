import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { ITEMS, type ItemId } from '../data/items';
import { EventBus } from '../utils/EventBus';

const SHOW_DURATION_MS = 2000;
const FADE_IN_MS = 180;
const FADE_OUT_MS = 400;
const BG_WIDTH = 460;
const BG_HEIGHT = 64;

/**
 * Brief popup that announces the item the player just picked up. Listens to
 * `item:picked`, looks up the definition in `ITEMS`, fades a name + description
 * card in/out near the bottom of the screen. Re-triggering replaces the
 * current toast (no queue).
 */
export class ItemToast {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly descText: Phaser.GameObjects.Text;
  private readonly handler: (payload: { itemId: string }) => void;
  private hideEvent: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT * 0.78;

    this.bg = scene.add
      .rectangle(cx, cy, BG_WIDTH, BG_HEIGHT, 0x000000, 0.65)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 3)
      .setStrokeStyle(2, 0xffd84a, 0.9)
      .setVisible(false);

    this.nameText = scene.add
      .text(cx, cy - 12, '', {
        fontSize: '18px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4)
      .setVisible(false);

    this.descText = scene.add
      .text(cx, cy + 12, '', { fontSize: '13px', color: '#e9d5ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4)
      .setVisible(false);

    this.handler = (payload): void => {
      const item = ITEMS[payload.itemId as ItemId];
      if (!item) return;
      this.show(scene, item.displayName, item.description);
    };
    EventBus.on('item:picked', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('item:picked', this.handler);
      this.hideEvent?.remove();
    });
  }

  private show(scene: Phaser.Scene, name: string, desc: string): void {
    this.nameText.setText(name);
    this.descText.setText(desc);

    this.hideEvent?.remove();
    scene.tweens.killTweensOf([this.bg, this.nameText, this.descText]);

    for (const obj of [this.bg, this.nameText, this.descText]) {
      obj.setAlpha(0).setVisible(true);
    }

    scene.tweens.add({
      targets: [this.bg, this.nameText, this.descText],
      alpha: 1,
      duration: FADE_IN_MS,
      ease: 'Sine.Out',
    });

    this.hideEvent = scene.time.delayedCall(SHOW_DURATION_MS, () => {
      scene.tweens.add({
        targets: [this.bg, this.nameText, this.descText],
        alpha: 0,
        duration: FADE_OUT_MS,
        ease: 'Sine.In',
        onComplete: () => {
          this.bg.setVisible(false);
          this.nameText.setVisible(false);
          this.descText.setVisible(false);
        },
      });
    });
  }
}
