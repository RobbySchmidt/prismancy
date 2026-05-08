import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';

/**
 * Controls overlay launched from MainMenu's "CONTROLS" item. Static panel
 * listing keybindings — same overlay convention as StatsScene /
 * SoundSettingsScene.
 */

const ACCENT = '#fff8c0';
const TEXT_LIGHT = '#e9d5ff';
const TEXT_DIM = '#aab8c0';

interface ControlEntry {
  action: string;
  keys: string;
}

const CONTROLS: ControlEntry[] = [
  { action: 'Move', keys: 'W A S D' },
  { action: 'Cast Magic', keys: 'Arrow Keys' },
  { action: 'Map / Inventory', keys: 'TAB' },
  { action: 'Pause', keys: 'ESC' },
  { action: 'Restart Run', keys: 'Hold R (1 s)' },
  { action: 'Stats Overlay', keys: 'T (from Main Menu)' },
  { action: 'Skin Toggle', keys: 'S (from Main Menu, after unlock)' },
];

export class ControlsScene extends Phaser.Scene {
  private exited = false;
  private ready = false;

  constructor() {
    super({ key: SceneKeys.Controls });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const topY = 60;

    this.exited = false;
    this.ready = false;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setOrigin(0, 0);

    this.add
      .text(cx, topY, 'CONTROLS', {
        fontFamily: 'monospace',
        fontSize: '34px',
        fontStyle: 'bold',
        color: ACCENT,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Two-column layout: action label left-aligned, keys right-aligned.
    const colLeftX = cx - 200;
    const colRightX = cx + 200;
    const startY = topY + 70;
    const lineHeight = 30;

    CONTROLS.forEach((entry, i) => {
      const y = startY + i * lineHeight;
      this.add
        .text(colLeftX, y, entry.action, {
          fontFamily: 'monospace',
          fontSize: '16px',
          fontStyle: 'bold',
          color: TEXT_LIGHT,
        })
        .setOrigin(0, 0.5);
      this.add
        .text(colRightX, y, entry.keys, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: TEXT_DIM,
        })
        .setOrigin(1, 0.5);
    });

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
    this.scene.stop(SceneKeys.Controls);
  }
}
