import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { EventBus } from '../utils/EventBus';

const BAR_WIDTH = 200;
const BAR_HEIGHT = 10;
const FRAME_PADDING = 2;
/**
 * Distance from the top of the screen to the top of the bar frame. Sits
 * BELOW the main boss bar zone (boss name y=10, boss bar y=28..42) so the
 * two never overlap even if a dev-menu spawn puts both on screen.
 */
const ANCHOR_Y = 64;
/** Silver tier-coding — the main boss bar is gold-framed and twice as wide. */
const FRAME_COLOR = 0xb8c4d0;
const NAME_COLOR = '#cdd8e4';

/**
 * Top-centre miniboss HP bar — the main boss bar's little sibling: half the
 * width, silver frame instead of gold, smaller name. Driven by EventBus:
 *  - `miniboss:spawned` → set name + max + show
 *  - `miniboss:hpChanged` → update fill width
 *  - `miniboss:gone` → hide (kill AND despawn-without-death)
 *
 * Initially hidden; only ever visible while a miniboss is on the field.
 * All owned GameObjects are torn down on scene SHUTDOWN.
 */
export class MinibossHealthBar {
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private maxHp = 1;

  private readonly spawnedHandler = (payload: { name: string; maxHp: number }): void => {
    this.maxHp = Math.max(1, payload.maxHp);
    this.nameText.setText(payload.name.toUpperCase());
    this.refreshFill(payload.maxHp);
    this.setVisible(true);
  };

  private readonly hpChangedHandler = (payload: { current: number; max: number }): void => {
    this.maxHp = Math.max(1, payload.max);
    this.refreshFill(payload.current);
  };

  private readonly goneHandler = (): void => {
    this.setVisible(false);
  };

  constructor(scene: Phaser.Scene) {
    const cx = GAME_WIDTH / 2;
    const barTopY = ANCHOR_Y;

    this.nameText = scene.add
      .text(cx, barTopY - 12, '', {
        fontSize: '13px',
        color: NAME_COLOR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5);

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
      .setStrokeStyle(1, FRAME_COLOR, 0.9)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 4);

    this.background = scene.add
      .rectangle(cx - BAR_WIDTH / 2, barTopY, BAR_WIDTH, BAR_HEIGHT, 0x20242a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 5);

    this.fill = scene.add
      .rectangle(cx - BAR_WIDTH / 2, barTopY, BAR_WIDTH, BAR_HEIGHT, 0xc4133a, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD + 6);

    this.setVisible(false);

    EventBus.on('miniboss:spawned', this.spawnedHandler);
    EventBus.on('miniboss:hpChanged', this.hpChangedHandler);
    EventBus.on('miniboss:gone', this.goneHandler);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('miniboss:spawned', this.spawnedHandler);
      EventBus.off('miniboss:hpChanged', this.hpChangedHandler);
      EventBus.off('miniboss:gone', this.goneHandler);
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
