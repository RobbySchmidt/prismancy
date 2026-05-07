import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';

/**
 * Pause overlay launched in parallel to GameScene + UIScene. Translucent
 * dark backdrop, large "PAUSED" label, resume hint. Resume on ESC / SPACE
 * / ENTER.
 *
 * Why a delayedCall before the keyboard listener: the same ESC keydown
 * that triggered the pause from GameScene's update poll would otherwise
 * be observed by THIS scene's listener as soon as `create()` registers
 * it, instantly resuming. The 150 ms cool-off guarantees the user has
 * released the key first regardless of how Phaser sequences the input
 * events between the two scenes.
 */
export class PauseScene extends Phaser.Scene {
  private exited = false;
  private ready = false;

  constructor() {
    super({ key: SceneKeys.Pause });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.exited = false;
    this.ready = false;

    // Translucent black backdrop covering the viewport.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0, 0);

    // Title.
    this.add
      .text(cx, cy - 50, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // Resume hint.
    this.add
      .text(cx, cy + 16, '[ESC]  /  [SPACE]   RESUME', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e9d5ff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    // Quit-to-menu hint.
    this.add
      .text(cx, cy + 44, '[Q]   BACK TO MAIN MENU', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a8c0d8',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.75);

    this.time.delayedCall(150, () => {
      this.ready = true;
    });

    const tryResume = (): void => {
      if (this.ready) this.resumeGame();
    };
    const tryQuit = (): void => {
      if (this.ready) this.quitToMainMenu();
    };

    this.input.keyboard?.on('keydown-ESC', tryResume);
    this.input.keyboard?.on('keydown-SPACE', tryResume);
    this.input.keyboard?.on('keydown-ENTER', tryResume);
    this.input.keyboard?.on('keydown-Q', tryQuit);
  }

  private resumeGame(): void {
    if (this.exited) return;
    this.exited = true;
    this.scene.stop(SceneKeys.Pause);
    this.scene.resume(SceneKeys.Game);
  }

  /**
   * Tear down the active run + UI + this overlay, then start the main
   * menu. The new run launched from MainMenu carries an explicit fresh
   * `floorIndex: 1` payload, so abandoning a run mid-Onyx and starting
   * over correctly drops you on Floor 1.
   */
  private quitToMainMenu(): void {
    if (this.exited) return;
    this.exited = true;
    this.scene.stop(SceneKeys.UI);
    this.scene.stop(SceneKeys.Game);
    this.scene.stop(SceneKeys.Pause);
    this.scene.start(SceneKeys.MainMenu);
  }
}
