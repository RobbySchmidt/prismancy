import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';

export class GameOverScene extends Phaser.Scene {
  /**
   * Cached so we don't re-trigger the restart while the scene-stop /
   * scene-start chain is still in flight (which would launch a second
   * GameScene start).
   */
  private restartTriggered = false;

  constructor() {
    super({ key: SceneKeys.GameOver });
  }

  create(): void {
    this.restartTriggered = false;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    this.add
      .text(cx, cy - 40, 'Game Over', {
        fontSize: '64px',
        color: '#ff5555',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 30, 'Press [R] to restart', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Why polling instead of `keyboard.once('keydown-R')`: the GameScene
    // gets paused (not stopped) on death, and Phaser keeps its keyboard
    // input plugin attached during the pause. In some focus / launch-order
    // cases the `once` listener on this overlay scene never resolves —
    // polling a Key in `update` sidesteps the question entirely.
    this.input.keyboard?.addKey('R');
    // Also expose Enter as an accessible alternative.
    this.input.keyboard?.addKey('ENTER');
  }

  override update(): void {
    if (this.restartTriggered) return;
    const kb = this.input.keyboard;
    if (!kb) return;
    const rKey = kb.addKey('R');
    const enterKey = kb.addKey('ENTER');
    if (Phaser.Input.Keyboard.JustDown(rKey) || Phaser.Input.Keyboard.JustDown(enterKey)) {
      this.triggerRestart();
    }
  }

  private triggerRestart(): void {
    if (this.restartTriggered) return;
    this.restartTriggered = true;
    // Stop everything related to the dead run, then start a fresh GameScene.
    // Stopping the paused GameScene first is important — `scene.start` on a
    // paused scene doesn't reliably re-run its lifecycle.
    this.scene.stop(SceneKeys.UI);
    this.scene.stop(SceneKeys.Game);
    this.scene.start(SceneKeys.Game);
    this.scene.launch(SceneKeys.UI);
    this.scene.stop(SceneKeys.GameOver);
  }
}
