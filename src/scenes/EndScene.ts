import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';

/**
 * Two distinct end states for an Onyx Mansion run:
 *   - `incomplete`: player took the exit stairs without all 3 gems → never
 *     fought The Prismarch. The dark light survived.
 *   - `full`: player activated the seal and defeated The Prismarch. The run
 *     is fully complete.
 */
export type EndSceneVariant = 'incomplete' | 'full';

interface EndSceneInitData {
  variant: EndSceneVariant;
}

const VARIANT_TEXT: Record<EndSceneVariant, string> = {
  incomplete: 'HE IS STILL LURKING IN THE LIGHT',
  full: 'THE LIGHT HAS BEEN BANISHED',
};

/**
 * Per-variant tint. Incomplete = dim amethyst (the prism remains, ominous);
 * full = warm gold (triumph, daylight).
 */
const VARIANT_COLOR: Record<EndSceneVariant, string> = {
  incomplete: '#a060c0',
  full: '#ffd84a',
};

/** Auto-return-to-MainMenu timer. Player can skip earlier with Space / Enter / click. */
const AUTO_RETURN_MS = 6000;

/**
 * Run-finale screen. Black backdrop, single line of text in variant tone,
 * auto-returns to the main menu after 6 s (or on key / click). Used for both
 * the Onyx no-gems exit and the post-Prismarch full-victory paths.
 */
export class EndScene extends Phaser.Scene {
  private variant: EndSceneVariant = 'incomplete';
  /**
   * Cached so the scene-stop / scene-start chain doesn't fire twice if the
   * auto-return timer and a player keystroke land in the same frame.
   */
  private returned = false;

  constructor() {
    super({ key: SceneKeys.End });
  }

  init(data: EndSceneInitData): void {
    this.variant = data.variant;
    this.returned = false;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Solid black backdrop covering the entire viewport.
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setOrigin(0, 0);

    // Main message — center-aligned, fades in from 0.
    const message = this.add
      .text(cx, cy, VARIANT_TEXT[this.variant], {
        fontFamily: 'monospace',
        fontSize: '34px',
        fontStyle: 'bold',
        color: VARIANT_COLOR[this.variant],
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 1200,
      ease: 'Sine.Out',
    });

    // Hint to skip — appears after a beat so the player reads the line first.
    const hint = this.add
      .text(cx, GAME_HEIGHT - 60, 'PRESS  [SPACE]  TO  CONTINUE', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 0.7,
      delay: 2200,
      duration: 700,
    });

    this.time.delayedCall(AUTO_RETURN_MS, () => this.returnToMenu());

    this.input.keyboard?.once('keydown-SPACE', () => this.returnToMenu());
    this.input.keyboard?.once('keydown-ENTER', () => this.returnToMenu());
    this.input.once('pointerdown', () => this.returnToMenu());
  }

  private returnToMenu(): void {
    if (this.returned) return;
    this.returned = true;
    this.scene.stop(SceneKeys.End);
    this.scene.start(SceneKeys.MainMenu);
  }
}
