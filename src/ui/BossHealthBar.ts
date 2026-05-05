import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { EventBus } from '../utils/EventBus';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 14;
const FRAME_PADDING = 2;
/** Distance from the top of the screen to the top of the bar frame. */
const ANCHOR_Y = 28;

/**
 * Top-centre boss HP bar. Shows the boss's display name above a red fill bar
 * (background = dark grey). Driven by EventBus events:
 *  - `boss:spawned` → set name + max + show
 *  - `boss:hpChanged` → update fill width
 *  - `boss:killed` → hide
 *
 * Initially hidden; only ever visible while a boss fight is in progress.
 * All owned GameObjects are torn down on scene SHUTDOWN.
 */
export class BossHealthBar {
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private maxHp = 1;

  private readonly spawnedHandler = (payload: { name: string; maxHp: number }): void => {
    this.maxHp = Math.max(1, payload.maxHp);
    this.nameText.setText(payload.name);
    this.refreshFill(payload.maxHp);
    this.setVisible(true);
  };

  private readonly hpChangedHandler = (payload: { current: number; max: number }): void => {
    // Trust the boss's emitted max in case the boss adjusts it mid-fight (no
    // current boss does, but the contract allows it).
    this.maxHp = Math.max(1, payload.max);
    this.refreshFill(payload.current);
  };

  private readonly killedHandler = (): void => {
    this.setVisible(false);
  };

  constructor(scene: Phaser.Scene) {
    const cx = GAME_WIDTH / 2;
    const barTopY = ANCHOR_Y;

    this.nameText = scene.add
      .text(cx, barTopY - 18, '', {
        fontSize: '18px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5);

    // Frame (dark border) + background fill (dim grey) + red HP fill, all
    // anchored top-left so the fill grows naturally to the right.
    this.frame = scene.add
      .rectangle(
        cx - BAR_WIDTH / 2 - FRAME_PADDING,
        barTopY - FRAME_PADDING,
        BAR_WIDTH + FRAME_PADDING * 2,
        BAR_HEIGHT + FRAME_PADDING * 2,
        0x000000,
        0.85,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffd84a, 0.9)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4);

    this.background = scene.add
      .rectangle(cx - BAR_WIDTH / 2, barTopY, BAR_WIDTH, BAR_HEIGHT, 0x2a1015, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5);

    this.fill = scene.add
      .rectangle(cx - BAR_WIDTH / 2, barTopY, BAR_WIDTH, BAR_HEIGHT, 0xc4133a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 6);

    this.setVisible(false);

    EventBus.on('boss:spawned', this.spawnedHandler);
    EventBus.on('boss:hpChanged', this.hpChangedHandler);
    EventBus.on('boss:killed', this.killedHandler);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('boss:spawned', this.spawnedHandler);
      EventBus.off('boss:hpChanged', this.hpChangedHandler);
      EventBus.off('boss:killed', this.killedHandler);
      this.nameText.destroy();
      this.frame.destroy();
      this.background.destroy();
      this.fill.destroy();
    });
  }

  private refreshFill(current: number): void {
    const ratio = Math.max(0, Math.min(1, current / this.maxHp));
    this.fill.width = BAR_WIDTH * ratio;
  }

  private setVisible(v: boolean): void {
    this.nameText.setVisible(v);
    this.frame.setVisible(v);
    this.background.setVisible(v);
    this.fill.setVisible(v);
  }
}
