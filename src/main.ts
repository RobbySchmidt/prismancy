import Phaser from 'phaser';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';
import { EndScene } from './scenes/EndScene';
import { PauseScene } from './scenes/PauseScene';
import { StatsScene } from './scenes/StatsScene';
import { StyleMockupScene } from './scenes/StyleMockupScene';
import { SoundSettingsScene } from './scenes/SoundSettingsScene';
import { ControlsScene } from './scenes/ControlsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameScene,
    UIScene,
    GameOverScene,
    EndScene,
    PauseScene,
    StatsScene,
    StyleMockupScene,
    SoundSettingsScene,
    ControlsScene,
  ],
};

new Phaser.Game(config);
