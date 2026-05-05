import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.GameOver });
  }

  create(): void {
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

    this.input.keyboard?.once('keydown-R', () => {
      this.scene.stop(SceneKeys.UI);
      this.scene.stop(SceneKeys.GameOver);
      this.scene.start(SceneKeys.Game);
      this.scene.launch(SceneKeys.UI);
    });
  }
}
