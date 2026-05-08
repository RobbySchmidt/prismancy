import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';
import { getMusicManager } from '../systems/MusicManager';

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

/**
 * Big headline shown first. Incomplete keeps the question mark so it reads
 * as "...but at what cost?"; full plays it straight.
 */
const VARIANT_HEADLINE: Record<EndSceneVariant, string> = {
  incomplete: 'VICTORY?',
  full: 'VICTORY',
};

const VARIANT_SUBTITLE: Record<EndSceneVariant, string> = {
  incomplete: "IT'S STILL LURKING IN THE LIGHT",
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

/** Headline fade-in duration. */
const HEADLINE_FADE_IN_MS = 1400;
/** How long the headline holds at full alpha before crossfading to the subtitle. */
const HEADLINE_HOLD_MS = 2200;
/** Headline fade-out duration (also = subtitle fade-in delay base). */
const HEADLINE_FADE_OUT_MS = 900;
/** Subtitle fade-in duration after the headline has cleared. */
const SUBTITLE_FADE_IN_MS = 1400;

/**
 * Run-finale screen. Black backdrop, two sequential screens in variant
 * tone — first the headline ("VICTORY?" / "VICTORY") on its own, then a
 * crossfade to the subtitle ("IT'S STILL LURKING IN THE LIGHT" / "THE
 * LIGHT HAS BEEN BANISHED"). Credits track plays from the moment the scene
 * opens (the GameScene faded its own track + the camera out before starting
 * us, so the music kicks in exactly as the headline appears). Stays up
 * indefinitely; returns to the main menu only on a [SPACE] / [ENTER] /
 * click input — no auto-timer, the player decides when to leave.
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

    // Credits theme — starts the moment the scene opens, which (because
    // GameScene faded out music + camera before transitioning) lines up with
    // the headline appearing. Cinematic swell-in over 1.6 s rather than the
    // default 120 ms snap so the music feels like it's rising under the text.
    getMusicManager().playTrack(this, 'victory-credits', { firstPlayFadeMs: 1600 });

    // Stage 1 — headline alone, centered. Holds at full alpha for a beat,
    // then fades out before the subtitle takes the screen.
    const headline = this.add
      .text(cx, cy, VARIANT_HEADLINE[this.variant], {
        fontFamily: 'monospace',
        fontSize: '88px',
        fontStyle: 'bold',
        color: VARIANT_COLOR[this.variant],
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: headline,
      alpha: 1,
      duration: HEADLINE_FADE_IN_MS,
      ease: 'Sine.Out',
    });

    // Stage 2 — pre-build the subtitle invisible, fade it in after the
    // headline clears. Centered like the headline so the screen swaps
    // cleanly between two centered single lines.
    const subtitle = this.add
      .text(cx, cy, VARIANT_SUBTITLE[this.variant], {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: VARIANT_COLOR[this.variant],
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Fade out the headline once the player has sat with it.
    const headlineFadeOutDelay = HEADLINE_FADE_IN_MS + HEADLINE_HOLD_MS;
    this.tweens.add({
      targets: headline,
      alpha: 0,
      delay: headlineFadeOutDelay,
      duration: HEADLINE_FADE_OUT_MS,
      ease: 'Sine.In',
    });

    // Bring the subtitle in just as the headline finishes its fade-out.
    const subtitleStartDelay = headlineFadeOutDelay + HEADLINE_FADE_OUT_MS;
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      delay: subtitleStartDelay,
      duration: SUBTITLE_FADE_IN_MS,
      ease: 'Sine.Out',
    });

    // Back-to-menu hint — appears after the subtitle has settled so the
    // player can sit with the moment first. Click anywhere also triggers
    // the return (see `pointerdown` listener at the bottom of `create`).
    const hint = this.add
      .text(cx, GAME_HEIGHT - 60, '[SPACE] / [ENTER]   BACK  TO  MENU', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#aab8c0',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: 0.85,
      delay: subtitleStartDelay + SUBTITLE_FADE_IN_MS + 600,
      duration: 700,
    });

    this.input.keyboard?.once('keydown-SPACE', () => this.returnToMenu());
    this.input.keyboard?.once('keydown-ENTER', () => this.returnToMenu());
    this.input.once('pointerdown', () => this.returnToMenu());
  }

  private returnToMenu(): void {
    if (this.returned) return;
    this.returned = true;
    // Fade the credits track out as we leave for the main menu — MainMenu's
    // title track will pick up after.
    getMusicManager().stop(this, { fadeMs: 600 });
    this.scene.stop(SceneKeys.End);
    this.scene.start(SceneKeys.MainMenu);
  }
}
