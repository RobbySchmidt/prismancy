import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.MainMenu });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 80, 'Prismancy', {
        fontSize: '56px',
        color: '#e9d5ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 10, 'Press [Space] or [Enter] to start', {
        fontSize: '22px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 60, 'Move: WASD   Cast: Arrow Keys', {
        fontSize: '16px',
        color: '#888888',
      })
      .setOrigin(0.5);

    const startGame = (): void => {
      this.scene.start(SceneKeys.Game);
      this.scene.launch(SceneKeys.UI);
    };

    this.input.keyboard?.once('keydown-SPACE', startGame);
    this.input.keyboard?.once('keydown-ENTER', startGame);
    this.input.once('pointerdown', startGame);
  }
}
