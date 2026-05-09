import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { ITEMS, type ItemId } from '../data/items';
import { EventBus } from '../utils/EventBus';

const SHOW_DURATION_MS = 2000;
const FADE_IN_MS = 180;
const FADE_OUT_MS = 400;
const BG_WIDTH = 460;
/** Inner padding from the BG-rectangle border to the text. Affects both
 * the wordWrap clip width for the description AND the vertical breathing
 * room above name / below desc. */
const BG_PAD_X = 24;
const BG_PAD_Y = 12;
/** Vertical gap between the name and description text. */
const NAME_DESC_GAP = 4;

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

    // Initial height is just a placeholder — `show()` recomputes it after
    // the description text has been laid out (long descs wrap to 2+ lines
    // and need a taller card).
    this.bg = scene.add
      .rectangle(cx, cy, BG_WIDTH, 64, 0x000000, 0.65)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 3)
      .setStrokeStyle(2, 0xffd84a, 0.9)
      .setVisible(false);

    this.nameText = scene.add
      .text(cx, cy, '', {
        fontSize: '18px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4)
      .setVisible(false);

    // Description wraps to keep long item text from overflowing the
    // card border. align: center so wrapped lines stack nicely
    // beneath the name.
    this.descText = scene.add
      .text(cx, cy, '', {
        fontSize: '13px',
        color: '#e9d5ff',
        align: 'center',
        wordWrap: { width: BG_WIDTH - BG_PAD_X * 2 },
      })
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

    // Resize the BG to fit the (possibly wrapped) description and
    // re-center name + desc inside it. Without this, long descriptions
    // (Wizard Glasses, Blood of Marquis) bleed past the gold border on
    // a single line. `desc.height` reflects the wrapped layout because
    // we set wordWrap on the Text style in the constructor.
    const cy = GAME_HEIGHT * 0.78;
    const nameH = this.nameText.height;
    const descH = this.descText.height;
    const innerH = nameH + NAME_DESC_GAP + descH;
    this.bg.setSize(BG_WIDTH, innerH + BG_PAD_Y * 2);
    this.nameText.setY(cy - innerH / 2 + nameH / 2);
    this.descText.setY(cy + innerH / 2 - descH / 2);

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
