import Phaser from 'phaser';
import { DepthLayers } from '../config/DepthLayers';
import { GAME_WIDTH } from '../config/GameConfig';
import { EventBus } from '../utils/EventBus';

const CARD_WIDTH = 320;
const CARD_HEIGHT = 80;
const ANCHOR_X_RIGHT_MARGIN = 16;
const ANCHOR_Y = 16;
const FADE_IN_MS = 220;
const FADE_OUT_MS = 320;
const AUTO_DISMISS_MS = 8000;
const ICON_SCALE = 1.2;
const ICON_PAD_X = 12;
/** Extra horizontal padding past the icon column before the text starts.
 *  Bumped 2026-05-09 — user-flagged that the figure (cape, wand silhouette)
 *  was crowding the title. Small nudge — keeps the title still close
 *  enough to the icon to read as one unit. */
const ICON_TEXT_GAP = 14;

interface UnlockPayload {
  id: string;
  title: string;
  subtitle?: string;
  textureKey?: string;
}

/**
 * Top-right toast that announces a meta-progression unlock (skin, character,
 * item-pool gate). Listens to `unlock:gained`, queues incoming unlocks so
 * each one gets read individually, and dismisses on click or after 8 s of
 * idle. Distinct from `ItemToast` (bottom-center, item-pickup) so a boss
 * kill that drops a pickup AND triggers an unlock doesn't visually merge
 * the two toasts.
 *
 * Sits one Depth layer above ItemToast so it's always on top in the rare
 * race where both fire on the same frame.
 */
export class UnlockToast {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly headerText: Phaser.GameObjects.Text;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly dismissText: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Image | null = null;
  private readonly handler: (payload: UnlockPayload) => void;
  private dismissEvent: Phaser.Time.TimerEvent | null = null;
  private active: UnlockPayload | null = null;
  private readonly queue: UnlockPayload[] = [];
  /** Per-session de-dup so the same unlock event doesn't show twice. The
   *  trigger sites are already first-time-only (snapshot before/after the
   *  recordBossDefeated call), but a defensive Set here means a future
   *  loose emit-site can't spam the toast. */
  private readonly shown = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const cardCx = GAME_WIDTH - ANCHOR_X_RIGHT_MARGIN - CARD_WIDTH / 2;
    const cardCy = ANCHOR_Y + CARD_HEIGHT / 2;

    // Background card — translucent black with gold trim. Sits on
    // HUD + 4 (one above the ItemToast trim layer at HUD + 3).
    this.bg = scene.add
      .rectangle(cardCx, cardCy, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.82)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4)
      .setStrokeStyle(2, 0xffd84a, 0.95)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => this.dismissActive());

    // Original text-left = `cardCx - CARD_WIDTH/2 + ICON_PAD_X*2 + 24` =
    // 48 px into the card. Adding ICON_TEXT_GAP shifts text right so the
    // icon's painted right edge (cape / sword tip) doesn't visually touch
    // the title. The icon center stays at its original spot so the icon
    // column doesn't reflow.
    const textLeftX = cardCx - CARD_WIDTH / 2 + ICON_PAD_X * 2 + 24 + ICON_TEXT_GAP;

    // "UNLOCKED" header — small + gold, Isaac-style trophy banner.
    this.headerText = scene.add
      .text(textLeftX, cardCy - 24, 'UNLOCKED', {
        fontSize: '12px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5)
      .setVisible(false);

    // Main name — large, white, leans on the trophy moment.
    this.titleText = scene.add
      .text(textLeftX, cardCy - 6, '', {
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5)
      .setVisible(false);

    // Subtitle — italic dim, room for a short flavour line per unlock.
    // Pushed ~6 px below the title baseline so the two lines breathe
    // (title-fontsize 17 + subtitle-fontsize 12 sat almost flush before).
    this.subtitleText = scene.add
      .text(textLeftX, cardCy + 18, '', {
        fontSize: '12px',
        color: '#c8c0d8',
        fontStyle: 'italic',
        wordWrap: { width: CARD_WIDTH - (textLeftX - (cardCx - CARD_WIDTH / 2)) - 12 },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5)
      .setVisible(false);

    // Dismiss hint sits inside the card bottom-right corner — kept short
    // so it doesn't compete with the title/subtitle for attention.
    this.dismissText = scene.add
      .text(cardCx + CARD_WIDTH / 2 - 8, cardCy + CARD_HEIGHT / 2 - 4, '[click]', {
        fontSize: '10px',
        color: '#a8a0b8',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5)
      .setVisible(false);

    this.handler = (payload): void => this.enqueue(payload);
    EventBus.on('unlock:gained', this.handler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('unlock:gained', this.handler);
      this.dismissEvent?.remove();
      this.scene.tweens.killTweensOf([
        this.bg,
        this.headerText,
        this.titleText,
        this.subtitleText,
        this.dismissText,
      ]);
      if (this.icon) this.scene.tweens.killTweensOf(this.icon);
    });
  }

  private enqueue(payload: UnlockPayload): void {
    if (this.shown.has(payload.id)) return;
    this.shown.add(payload.id);
    if (this.active) {
      this.queue.push(payload);
      return;
    }
    this.show(payload);
  }

  private show(payload: UnlockPayload): void {
    this.active = payload;
    this.titleText.setText(payload.title);
    this.subtitleText.setText(payload.subtitle ?? '');

    const cardCx = GAME_WIDTH - ANCHOR_X_RIGHT_MARGIN - CARD_WIDTH / 2;
    const cardCy = ANCHOR_Y + CARD_HEIGHT / 2;

    // Rebuild the icon every show — texture key may differ per unlock and
    // re-using a single Image object would smear missing-texture frames.
    if (this.icon) {
      this.icon.destroy();
      this.icon = null;
    }
    if (payload.textureKey && this.scene.textures.exists(payload.textureKey)) {
      const iconX = cardCx - CARD_WIDTH / 2 + ICON_PAD_X + 16;
      this.icon = this.scene.add
        .image(iconX, cardCy, payload.textureKey)
        .setScale(ICON_SCALE)
        .setScrollFactor(0)
        .setDepth(DepthLayers.HUD + 5)
        .setAlpha(0);
    }

    const objs = [this.bg, this.headerText, this.titleText, this.subtitleText, this.dismissText];
    this.scene.tweens.killTweensOf(objs);
    if (this.icon) this.scene.tweens.killTweensOf(this.icon);

    for (const obj of objs) obj.setAlpha(0).setVisible(true);

    this.scene.tweens.add({
      targets: objs,
      alpha: 1,
      duration: FADE_IN_MS,
      ease: 'Sine.Out',
    });
    if (this.icon) {
      this.scene.tweens.add({
        targets: this.icon,
        alpha: 1,
        duration: FADE_IN_MS,
        ease: 'Sine.Out',
      });
    }

    // Subtle scale-pulse on the card itself to draw the eye. Kept gentle
    // (1.0 → 1.02) so it doesn't read as a UI glitch.
    this.scene.tweens.add({
      targets: this.bg,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 600,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
    });

    this.dismissEvent?.remove();
    this.dismissEvent = this.scene.time.delayedCall(AUTO_DISMISS_MS, () => {
      this.fadeOut();
    });
  }

  private dismissActive(): void {
    if (!this.active) return;
    this.dismissEvent?.remove();
    this.dismissEvent = null;
    this.fadeOut();
  }

  private fadeOut(): void {
    const objs = [this.bg, this.headerText, this.titleText, this.subtitleText, this.dismissText];
    this.scene.tweens.killTweensOf(objs);
    if (this.icon) this.scene.tweens.killTweensOf(this.icon);
    const targets = this.icon ? [...objs, this.icon] : objs;
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: FADE_OUT_MS,
      ease: 'Sine.In',
      onComplete: () => {
        for (const obj of objs) obj.setVisible(false);
        if (this.icon) {
          this.icon.destroy();
          this.icon = null;
        }
        this.active = null;
        // Drain the queue — next unlock (if any) shows after a tiny gap so
        // the fade-out frame has resolved and the card scale tween has
        // settled before the new one paints.
        const next = this.queue.shift();
        if (next) {
          this.scene.time.delayedCall(120, () => this.show(next));
        }
      },
    });
  }
}
