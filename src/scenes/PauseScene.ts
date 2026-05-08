import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../config/GameConfig';
import { getMusicManager } from '../systems/MusicManager';
import { getSfxSynth } from '../systems/SfxSynth';

/**
 * Pause overlay launched in parallel to GameScene + UIScene. Translucent
 * dark backdrop, "PAUSED" header, and a centered vertical menu styled the
 * same way as MainMenuScene's left-anchored menu — mouse hover and arrow-key
 * navigation both update focus (and play a quiet menu-switch SFX), [ENTER]
 * / [SPACE] / click activates. Kept symmetric with MainMenu so the in-game
 * menu reads as a sibling.
 *
 * Why a 150 ms cool-off before the keyboard listener: the same ESC keydown
 * that triggered the pause from GameScene's update poll would otherwise
 * be observed by THIS scene's listener as soon as `create()` registers
 * it, instantly resuming. The cool-off guarantees the user has released
 * the key first regardless of how Phaser sequences the input events
 * between the two scenes.
 */

interface MenuEntry {
  label: string;
  action: () => void;
  text: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Text;
  baseY: number;
}

const MENU_ITEM_FONT_SIZE = 22;
const MENU_ITEM_HOVER_SCALE = 1.25;
const MENU_ITEM_LINE_HEIGHT = 42;
const MENU_COLOR_DEFAULT = '#aab8c0';
const MENU_COLOR_HOVER = '#fff8c0';

export class PauseScene extends Phaser.Scene {
  private exited = false;
  private ready = false;
  private menuFocusIndex = 0;
  private menuItems: MenuEntry[] = [];

  constructor() {
    super({ key: SceneKeys.Pause });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.exited = false;
    this.ready = false;
    this.menuFocusIndex = 0;
    this.menuItems = [];

    // Dim the background music while paused so the silence reads as a
    // "tab away from gameplay" beat. Both resume and quit unduck — quit
    // restarts MainMenu's title track which crossfades from current state.
    getMusicManager().duck();

    // Translucent black backdrop covering the viewport.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0, 0);

    // Title.
    this.add
      .text(cx, cy - 130, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffd84a',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.buildVerticalMenu();

    this.time.delayedCall(150, () => {
      this.ready = true;
    });

    // ESC always resumes from the pause screen, regardless of which menu
    // item is focused — the player's muscle memory expects "ESC opens, ESC
    // closes". Wired here separately from the menu activation flow.
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.ready) this.resumeGame();
    });
  }

  /** Center-aligned vertical menu, same focus/hover/SFX rules as MainMenu. */
  private buildVerticalMenu(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const items: { label: string; action: () => void }[] = [
      { label: 'RESUME', action: () => this.activateResume() },
      { label: 'OPTIONS', action: () => this.launchOverlay(SceneKeys.SoundSettings) },
      { label: 'CONTROLS', action: () => this.launchOverlay(SceneKeys.Controls) },
      { label: 'BACK  TO  MAIN  MENU', action: () => this.activateQuit() },
    ];

    const startY = cy - 30;
    this.menuItems = items.map((entry, idx) => {
      const baseY = startY + idx * MENU_ITEM_LINE_HEIGHT;
      const shadow = this.add
        .text(cx + 3, baseY + 3, entry.label, {
          fontFamily: 'monospace',
          fontSize: `${MENU_ITEM_FONT_SIZE}px`,
          fontStyle: 'bold',
          color: '#000000',
        })
        .setOrigin(0.5)
        .setAlpha(0.55);
      const text = this.add
        .text(cx, baseY, entry.label, {
          fontFamily: 'monospace',
          fontSize: `${MENU_ITEM_FONT_SIZE}px`,
          fontStyle: 'bold',
          color: MENU_COLOR_DEFAULT,
          stroke: '#1a0828',
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      // Wider rectangle hit area than the tight text bounds so the cursor
      // sweeping vertically between items doesn't briefly fall into a gap
      // and miss the pointerover transition. Same trick MainMenu uses.
      const hitW = 360;
      const hitH = MENU_ITEM_LINE_HEIGHT;
      text.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      text.on('pointerover', () => this.setMenuFocus(idx));
      text.on('pointerdown', () => this.activateMenuItem(idx));

      return { label: entry.label, action: entry.action, text, shadow, baseY };
    });

    this.setMenuFocus(0);

    this.input.keyboard?.on('keydown-UP', () => this.moveFocus(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveFocus(1));
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.ready) this.activateMenuItem(this.menuFocusIndex);
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.ready) this.activateMenuItem(this.menuFocusIndex);
    });
  }

  private setMenuFocus(idx: number): void {
    if (idx < 0 || idx >= this.menuItems.length) return;
    // Only fire the SFX on actual change so the initial setMenuFocus(0)
    // call + repeat pointerover events on the already-focused item stay
    // silent.
    if (this.menuFocusIndex !== idx) {
      getSfxSynth().playMenuSwitch();
    }
    this.menuFocusIndex = idx;
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i];
      const focused = i === idx;
      item.text.setColor(focused ? MENU_COLOR_HOVER : MENU_COLOR_DEFAULT);
      this.tweens.killTweensOf([item.text, item.shadow]);
      this.tweens.add({
        targets: [item.text, item.shadow],
        scale: focused ? MENU_ITEM_HOVER_SCALE : 1,
        duration: 120,
        ease: 'Sine.Out',
      });
    }
  }

  private moveFocus(delta: number): void {
    if (this.exited) return;
    const len = this.menuItems.length;
    if (len === 0) return;
    const next = (this.menuFocusIndex + delta + len) % len;
    this.setMenuFocus(next);
  }

  private activateMenuItem(idx: number): void {
    if (this.exited) return;
    const item = this.menuItems[idx];
    if (!item) return;
    this.setMenuFocus(idx);
    item.action();
  }

  /**
   * Pause this overlay while a sub-overlay (Sound Settings / Controls) is
   * up so the menu's keyboard / pointer listeners don't bleed through —
   * pressing Enter to dismiss the sub-overlay would otherwise also activate
   * whichever menu item is focused here. Resumes on the sub-overlay's
   * SHUTDOWN.
   */
  private launchOverlay(key: string): void {
    this.scene.pause();
    this.scene.launch(key);
    const overlayScene = this.scene.get(key);
    if (!overlayScene) {
      this.scene.resume();
      return;
    }
    overlayScene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isPaused()) this.scene.resume();
    });
  }

  private activateResume(): void {
    if (this.ready) this.resumeGame();
  }

  private activateQuit(): void {
    if (this.ready) this.quitToMainMenu();
  }

  private resumeGame(): void {
    if (this.exited) return;
    this.exited = true;
    getMusicManager().unduck();
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
    getMusicManager().unduck();
    this.scene.stop(SceneKeys.UI);
    this.scene.stop(SceneKeys.Game);
    this.scene.stop(SceneKeys.Pause);
    this.scene.start(SceneKeys.MainMenu);
  }
}
