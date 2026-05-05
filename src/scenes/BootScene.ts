import Phaser from 'phaser';
import { SceneKeys } from '../config/GameConfig';

/**
 * Entry scene. Currently hands off to PreloadScene immediately; later this is
 * the right place for engine-wide setup (input plugins, save-data load, etc.).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Boot });
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
