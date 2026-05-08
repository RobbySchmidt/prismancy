import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';
import { getMusicManager } from '../systems/MusicManager';

/**
 * Sound-settings overlay launched from MainMenu's "OPTIONS" item. Currently
 * exposes a single master-volume slider; future settings (SFX volume, music
 * mute, etc.) get added here.
 *
 * Same overlay pattern as StatsScene/PauseScene: translucent backdrop, ESC/Q
 * to close, 150 ms cool-off before the close keybind binds so the same key
 * that *opened* the overlay can't immediately *close* it again.
 */

const ACCENT = '#fff8c0';
const TEXT_LIGHT = '#e9d5ff';
const TEXT_DIM = '#aab8c0';

const SLIDER_WIDTH = 280;
const SLIDER_HEIGHT = 12;

export class SoundSettingsScene extends Phaser.Scene {
  private exited = false;
  private ready = false;
  private fill!: Phaser.GameObjects.Rectangle;
  private valueLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.SoundSettings });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.exited = false;
    this.ready = false;

    // Translucent black backdrop.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0, 0);

    // Title.
    this.add
      .text(cx, cy - 110, 'SOUND  SETTINGS', {
        fontFamily: 'monospace',
        fontSize: '34px',
        fontStyle: 'bold',
        color: ACCENT,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Master volume slider.
    this.add
      .text(cx - SLIDER_WIDTH / 2 - 8, cy - 30, 'MASTER  VOLUME', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: TEXT_LIGHT,
      })
      .setOrigin(0, 0);

    const sliderX = cx - SLIDER_WIDTH / 2;
    const sliderY = cy;
    this.add
      .rectangle(sliderX, sliderY, SLIDER_WIDTH, SLIDER_HEIGHT, 0x000000)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xc8a448);
    const startVol = getMusicManager().getMasterVolume();
    this.fill = this.add
      .rectangle(sliderX, sliderY, SLIDER_WIDTH * startVol, SLIDER_HEIGHT, 0xc8a448)
      .setOrigin(0, 0.5);
    const sliderHit = this.add
      .rectangle(sliderX, sliderY - 12, SLIDER_WIDTH, SLIDER_HEIGHT + 24, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    this.valueLabel = this.add
      .text(cx, sliderY + 26, `${Math.round(startVol * 100)}%`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: TEXT_DIM,
      })
      .setOrigin(0.5, 0);

    const setFromPointer = (pointer: Phaser.Input.Pointer): void => {
      const local = pointer.x - sliderX;
      const v = Math.max(0, Math.min(1, local / SLIDER_WIDTH));
      getMusicManager().setMasterVolume(v);
      this.fill.width = SLIDER_WIDTH * v;
      this.valueLabel.setText(`${Math.round(v * 100)}%`);
    };
    sliderHit.on('pointerdown', setFromPointer);
    sliderHit.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) setFromPointer(pointer);
    });

    // Close hint.
    this.add
      .text(cx, GAME_HEIGHT - 60, '[ESC] / [Q]   CLOSE', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: TEXT_DIM,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    // Cool-off — see PauseScene for the same pattern.
    this.time.delayedCall(150, () => {
      this.ready = true;
    });

    const tryClose = (): void => {
      if (this.ready) this.close();
    };
    this.input.keyboard?.on('keydown-ESC', tryClose);
    this.input.keyboard?.on('keydown-Q', tryClose);
  }

  private close(): void {
    if (this.exited) return;
    this.exited = true;
    this.scene.stop(SceneKeys.SoundSettings);
  }
}
