import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys, TextureKeys } from '../config/GameConfig';
import { ITEMS } from '../data/items';
import { STARTING_FLOOR_ID } from '../data/floors';
import { Cosmetics } from '../systems/Cosmetics';
import { MetaProgress, type CharacterId, type SkinId } from '../systems/MetaProgress';
import { getMusicManager } from '../systems/MusicManager';
import { getSfxSynth } from '../systems/SfxSynth';

/**
 * Title screen styled as a key-art illustration: the wizard duels the
 * Pixie Queen across an Emerald-Forest scene at dusk. Backdrop is painted
 * with `Phaser.GameObjects.Graphics` (sky gradient, layered tree
 * silhouettes, moon-pink halo, fireflies); the wizard + Pixie Queen
 * sprites are reused from the in-game textures, scaled up 4× for poster
 * scale. Magic missiles + pixie thorns fly between them so the moment
 * reads as combat rather than two characters posing.
 *
 * Layered on top of the painting: a left-anchored vertical menu with five
 * items (Start Game / Options / Stats / Controls / Close Game). Mouse
 * hover or arrow-key navigation focuses an item (visualised by a yellow
 * tint + scale-up tween), Enter / Space / click activates it. Overlays
 * (Sound Settings / Stats / Controls) pause the menu so a stray
 * Enter-press doesn't bleed through.
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
const MENU_ITEM_X = 44;
const MENU_ITEM_TOP_Y = 200;
const MENU_ITEM_LINE_HEIGHT = 38;
const MENU_COLOR_DEFAULT = '#aab8c0';
const MENU_COLOR_HOVER = '#fff8c0';

export class MainMenuScene extends Phaser.Scene {
  private menuStarted = false;
  private menuFocusIndex = 0;
  private menuItems: MenuEntry[] = [];

  constructor() {
    super({ key: SceneKeys.MainMenu });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.menuStarted = false;
    this.menuFocusIndex = 0;
    this.menuItems = [];

    // 1) Sky + ground backdrop ------------------------------------------------
    const bg = this.add.graphics();
    this.paintBackdrop(bg);

    // 2) Pixie Queen (right side) — backlit by a pink halo so she pops.
    this.paintQueenHalo();
    const queen = this.add.image(GAME_WIDTH - 240, GAME_HEIGHT / 2 - 30, TextureKeys.BossPixieQueen);
    queen.setScale(4);
    queen.setRotation(0.08);
    this.tweens.add({
      targets: queen,
      y: queen.y - 8,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 3) Wizard / Spellblade (left side). Texture comes from the current
    //    character + skin cycle pick (see `setupCharacterCycle`). The aura
    //    is painted under whichever character is showing — same visual
    //    glow for both since it reads as "this is the player".
    this.paintWizardAura();
    const wizard = this.add.image(
      240,
      GAME_HEIGHT / 2 + 60,
      this.currentCycleTextureKey(),
    );
    wizard.setScale(4);
    wizard.setRotation(-0.08);

    // 4) Action effects between them.
    this.paintActionEffects();

    // 5) Character profile / stats card — sits in the gap between the
    //    wizard preview and the Pixie Queen. Updates when the player
    //    cycles characters so the stat trade-offs are visible at a
    //    glance (HP / cadence / damage / pierce / dash etc.).
    const statsPanel = this.buildCharacterStatsPanel();
    statsPanel.update(MetaProgress.getSelectedCharacter());

    // 6) Title (just the big text — the bottom prompts moved into the menu).
    this.paintTitle(cx);

    // 7) Vertical menu (left side).
    this.buildVerticalMenu();

    // 8) Character / skin cycle bottom-of-screen — left/right arrows step
    //    through every (character, skin) combination the player has
    //    unlocked. Replaces the old `[S]` skin toggle since unlocking the
    //    Spellblade introduced more than two preview options. The cycle
    //    is hidden when only the default wizard is available (no point
    //    showing arrows the player can't use).
    this.setupCharacterCycle(wizard, statsPanel);

    // Title music plays only on subsequent visits — the first page-load has a
    // locked WebAudio context, and we'd rather have a quick first-press start
    // than tease the user with half a second of music on a forced unlock.
    // After the first run, context is unlocked and the track plays immediately.
    if (!this.sound.locked) {
      getMusicManager().playTrack(this, 'title');
    }

    this.setupTitleMusicHint();

    // TEMPORARY beta-tester convenience: [U] flips every meta-progression
    // gate (Spellblade character, both Prismancy skins, Blood-of-Marquis
    // discovery filter, full item-trophy log) so testers don't have to
    // grind a Prismarch kill to access the late-game build space. **Remove
    // this hint + key handler when the beta period closes** — the hotkey
    // makes the game's progression rewards meaningless in production.
    this.setupBetaUnlockHint();
  }

  /**
   * Bottom-of-screen "[M] PLAY MUSIC" hint shown only when the title track
   * isn't currently playing (i.e. first page-load with a locked WebAudio
   * context). [M] starts the title track manually, which doubles as a
   * user-gesture unlock for the audio context. Once the music starts, the
   * hint fades out — there's nothing left to do.
   */
  private setupTitleMusicHint(): void {
    if (getMusicManager().getCurrentKey() === 'title') return;

    const hint = this.add
      .text(GAME_WIDTH - 18, GAME_HEIGHT - 18, '[M]  PLAY  TITLE  MUSIC', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e9d5ff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 1)
      .setAlpha(0.85);

    this.input.keyboard?.once('keydown-M', () => {
      getMusicManager().playTrack(this, 'title');
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 400,
        onComplete: () => hint.destroy(),
      });
    });
  }

  /**
   * **TEMPORARY beta-tester hotkey.** Top-right amber hint "[U] BETA:
   * UNLOCK ALL"; on press flips every meta-progression gate via
   * `MetaProgress.unlockAllForTesting`, plays a brief cyan flash + on-
   * screen confirmation, then restarts the menu so the character cycle
   * + skin toggle re-render with the now-available picks visible.
   * Distinct visual treatment (amber vs the regular [I]/[S]/[M] white)
   * marks it as out-of-band — beta testers see it as obviously "this is
   * not part of the normal game". **Delete this method + the call from
   * `create()` when the beta closes.**
   */
  private setupBetaUnlockHint(): void {
    const hint = this.add
      .text(GAME_WIDTH - 18, 18, '[U]  BETA:  UNLOCK  ALL', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        // Amber/orange so it visually reads "this is a debug affordance"
        // and doesn't blend in with the normal hint family.
        color: '#ffb84a',
        stroke: '#1a0828',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setAlpha(0.85)
      .setDepth(20);

    this.input.keyboard?.once('keydown-U', () => {
      const allItemIds = Object.keys(ITEMS);
      MetaProgress.unlockAllForTesting(allItemIds);

      // Visual confirmation — brief gold flash text bottom-of-screen,
      // then restart the scene so the character cycle / skin toggle
      // re-paint with all picks visible.
      const confirm = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'EVERYTHING  UNLOCKED', {
          fontFamily: 'monospace',
          fontSize: '36px',
          fontStyle: 'bold',
          color: '#ffd84a',
          stroke: '#1a0828',
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setAlpha(0);

      this.tweens.add({
        targets: confirm,
        alpha: 1,
        scale: { from: 0.85, to: 1.0 },
        duration: 220,
        ease: 'Sine.Out',
        onComplete: () => {
          this.tweens.add({
            targets: confirm,
            alpha: 0,
            duration: 600,
            delay: 600,
            onComplete: () => {
              confirm.destroy();
              this.scene.restart();
            },
          });
        },
      });

      // Hide the hint immediately — feedback should make the press feel
      // committed.
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 200,
        onComplete: () => hint.destroy(),
      });
    });
  }

  private buildVerticalMenu(): void {
    const items: { label: string; action: () => void }[] = [
      { label: 'START  GAME', action: () => this.activateStart() },
      { label: 'OPTIONS', action: () => this.launchOverlay(SceneKeys.SoundSettings) },
      { label: 'STATS', action: () => this.launchOverlay(SceneKeys.Stats) },
      { label: 'CONTROLS', action: () => this.launchOverlay(SceneKeys.Controls) },
      { label: 'CLOSE  GAME', action: () => this.activateClose() },
    ];

    this.menuItems = items.map((entry, idx) => {
      const baseY = MENU_ITEM_TOP_Y + idx * MENU_ITEM_LINE_HEIGHT;
      const shadow = this.add
        .text(MENU_ITEM_X + 3, baseY + 3, entry.label, {
          fontFamily: 'monospace',
          fontSize: `${MENU_ITEM_FONT_SIZE}px`,
          fontStyle: 'bold',
          color: '#000000',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0.55);
      const text = this.add
        .text(MENU_ITEM_X, baseY, entry.label, {
          fontFamily: 'monospace',
          fontSize: `${MENU_ITEM_FONT_SIZE}px`,
          fontStyle: 'bold',
          color: MENU_COLOR_DEFAULT,
          stroke: '#1a0828',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5);

      // Wider rectangle hit area than the tight text bounds. Without this
      // the focus-scale tween (1.0 → 1.25) shifts the visible glyphs above
      // the un-scaled hit rect, and the cursor sweeping between items can
      // briefly fall into a gap — that gap suppresses pointerover, which
      // is the user-visible "menu sound only fires on keyboard, not mouse"
      // bug. Spans the full row width so vertical hover always lands.
      const hitW = GAME_WIDTH - MENU_ITEM_X * 2;
      const hitH = MENU_ITEM_LINE_HEIGHT;
      text.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, -hitH / 2, hitW, hitH),
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
    this.input.keyboard?.on('keydown-ENTER', () => this.activateMenuItem(this.menuFocusIndex));
    this.input.keyboard?.on('keydown-SPACE', () => this.activateMenuItem(this.menuFocusIndex));
  }

  private setMenuFocus(idx: number): void {
    if (idx < 0 || idx >= this.menuItems.length) return;
    // Only play the switch SFX when focus actually changes — the initial
    // setMenuFocus(0) call during create() and pointerover events on the
    // already-focused item should stay silent.
    if (this.menuFocusIndex !== idx) {
      getSfxSynth().playMenuSwitch();
    }
    this.menuFocusIndex = idx;
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i];
      const focused = i === idx;
      item.text.setColor(focused ? MENU_COLOR_HOVER : MENU_COLOR_DEFAULT);
      // Tween scale + tracking shadow so the focus change reads as a soft
      // pop rather than a snap. Killing the previous tween on the same
      // target stops mid-flight scaling from queueing up if the user
      // sweeps the mouse fast.
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
    if (this.menuStarted) return;
    const len = this.menuItems.length;
    if (len === 0) return;
    const next = (this.menuFocusIndex + delta + len) % len;
    this.setMenuFocus(next);
  }

  private activateMenuItem(idx: number): void {
    if (this.menuStarted) return;
    const item = this.menuItems[idx];
    if (!item) return;
    this.setMenuFocus(idx);
    item.action();
  }

  /**
   * Pause MainMenu while an overlay (Sound Settings / Stats / Controls)
   * is up so the menu's keyboard / pointer listeners don't bleed through
   * — without this, pressing Enter to dismiss an overlay would also
   * activate whatever item happens to be focused on MainMenu underneath.
   * The overlay's `scene.stop` triggers SHUTDOWN, which we use to resume.
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

  private activateStart(): void {
    if (this.menuStarted) return;
    this.menuStarted = true;

    // Camera fade-to-black mirrors the floor-transition look so the descent
    // into Floor 1 reads as the same "going somewhere" beat the rest of
    // the game uses.
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Explicit fresh-run payload — see GameOverScene.handleRestart for the
      // full reasoning (without it, Phaser keeps the previous run's
      // settings.data and you'd respawn on Onyx with stale carry-over).
      this.scene.start(SceneKeys.Game, {
        floorIndex: 1,
        floorId: STARTING_FLOOR_ID,
      });
      this.scene.launch(SceneKeys.UI);
    });
  }

  /**
   * Best-effort window close. `window.close()` is a no-op in most modern
   * browsers (it only works on JS-opened popups, or in Electron / packaged
   * builds). The fallback is a fade-to-black + "thanks for playing" screen
   * — the user can refresh the page to come back.
   */
  private activateClose(): void {
    if (this.menuStarted) return;
    this.menuStarted = true;
    getMusicManager().stop(this, { fadeMs: 600 });
    try {
      window.close();
    } catch {
      // ignore — falls through to the fade-out overlay.
    }
    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(10000);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 800,
      ease: 'Sine.In',
      onComplete: () => {
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18, 'THANKS  FOR  PLAYING', {
            fontFamily: 'monospace',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(10001);
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, 'Refresh the page to return', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#aab8c0',
          })
          .setOrigin(0.5)
          .setDepth(10001);
      },
    });
  }


  /**
   * Build two stacked title-screen widgets:
   *   1. **Character cycle** (left/right arrow keys) — only for picking the
   *      character (wizard / spellblade). Hidden if only the wizard is
   *      unlocked since there's nothing to cycle.
   *   2. **Skin toggle** (`[S]` key, restored 2026-05-09 after the first
   *      cycle-rewrite collapsed both into one list and the user wanted
   *      them split). Toggles available skins for the currently-selected
   *      character. Hidden if the active character has only one skin
   *      available (e.g. Spellblade for now — red-helm Prismarch-tier
   *      skin coming in a later phase).
   *
   * Both widgets read + write through MetaProgress so a fresh scene reads
   * the same state. Pressing left/right re-evaluates the [S] visibility
   * since switching characters can change which skins are available.
   */
  private setupCharacterCycle(
    preview: Phaser.GameObjects.Image,
    statsPanel: { update: (character: CharacterId) => void },
  ): void {
    const cx = GAME_WIDTH / 2;
    // Bottom hint stack — cycle on top, then [S] skin toggle, then the
    // [I] info hint (rendered separately in `buildCharacterStatsPanel`
    // at GAME_HEIGHT - 22). Reading order top → bottom: pick character →
    // toggle skin → reveal stats. User-flagged 2026-05-09: previous
    // ordering had [I] at the top of the stack, which read as "info is
    // the primary action" rather than "info is an optional reveal".
    const cycleY = GAME_HEIGHT - 66;
    const skinHintY = GAME_HEIGHT - 44;

    // --- Skin toggle (set up first so the cycle can refresh its visibility)
    let currentSkin: SkinId = MetaProgress.getSelectedSkin();
    const skinLabel = this.add
      .text(cx, skinHintY, '', {
        fontSize: '14px',
        color: '#e9d5ff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    const refreshSkinLabel = (): void => {
      const character = MetaProgress.getSelectedCharacter();
      const skinsForChar = this.skinsForCharacter(character);
      if (skinsForChar.length <= 1) {
        skinLabel.setVisible(false);
        return;
      }
      skinLabel.setVisible(true);
      skinLabel.setText(this.skinHintText(currentSkin));
    };

    this.input.keyboard?.on('keydown-S', () => {
      const character = MetaProgress.getSelectedCharacter();
      const skinsForChar = this.skinsForCharacter(character);
      if (skinsForChar.length <= 1) return;
      const idx = skinsForChar.indexOf(currentSkin);
      currentSkin = skinsForChar[(idx + 1) % skinsForChar.length]!;
      MetaProgress.setSelectedSkin(currentSkin);
      preview.setTexture(this.previewTextureKey(character, currentSkin));
      refreshSkinLabel();
    });

    // --- Character cycle ----------------------------------------------------
    const characters = this.unlockedCharacters();
    if (characters.length <= 1) {
      // Single character — only the skin toggle matters. Initial label
      // refresh so [S] hint paints correctly on first frame.
      refreshSkinLabel();
      return;
    }

    let charIndex = characters.indexOf(MetaProgress.getSelectedCharacter());
    if (charIndex < 0) charIndex = 0;

    const arrowGap = 110;
    const arrowStyle = {
      fontSize: '18px',
      color: '#ffd0a0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    } as const;
    const labelStyle = {
      fontSize: '14px',
      color: '#e9d5ff',
      stroke: '#000000',
      strokeThickness: 3,
    } as const;

    this.add
      .text(cx - arrowGap, cycleY, '<', arrowStyle)
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.add
      .text(cx + arrowGap, cycleY, '>', arrowStyle)
      .setOrigin(0.5)
      .setAlpha(0.85);
    const charLabel = this.add
      .text(cx, cycleY, this.characterLabel(characters[charIndex]!), labelStyle)
      .setOrigin(0.5)
      .setAlpha(0.85);

    const applyCharacter = (newIndex: number): void => {
      charIndex = ((newIndex % characters.length) + characters.length) % characters.length;
      const character = characters[charIndex]!;
      MetaProgress.setSelectedCharacter(character);
      // Re-resolve the skin against the new character's gate. Character-
      // aware `getSelectedSkin(character)` returns Prismancy only if the
      // *new* character's gate is met (Wizard: any Prismarch kill;
      // Spellblade: a Prismarch kill *as Spellblade*). The persisted
      // selectedSkin preference is preserved — toggling through a
      // character without the Prismancy unlock displays default for that
      // pass, but switching back to a character that has it restores
      // Prismancy automatically. Only the explicit [S] toggle persists.
      currentSkin = MetaProgress.getSelectedSkin(character);
      preview.setTexture(this.previewTextureKey(character, currentSkin));
      charLabel.setText(this.characterLabel(character));
      statsPanel.update(character);
      refreshSkinLabel();
    };

    this.input.keyboard?.on('keydown-LEFT', () => applyCharacter(charIndex - 1));
    this.input.keyboard?.on('keydown-RIGHT', () => applyCharacter(charIndex + 1));

    // Initial paint — label content only renders correctly once both
    // widgets are constructed.
    refreshSkinLabel();
  }

  /**
   * Characters the player has unlocked, in cycle-display order. Always
   * starts with `'wizard'` (free); appends `'spellblade'` once the
   * Prismarch-tier gate is met.
   */
  private unlockedCharacters(): CharacterId[] {
    const list: CharacterId[] = ['wizard'];
    if (MetaProgress.hasSpellbladeCharacter()) list.push('spellblade');
    return list;
  }

  /**
   * Skin variants available for a given character, in toggle-cycle order.
   * Wizard: `default`, plus `prismancy` once any Prismarch defeat is on
   * record. Spellblade: `default`, plus `prismancy` (red-helm) once a
   * Prismarch has been defeated *while playing as Spellblade* — strictly
   * stronger gate than the Wizard variant, the trophy of "I conquered him
   * in his own image".
   */
  private skinsForCharacter(character: CharacterId): SkinId[] {
    const list: SkinId[] = ['default'];
    if (character === 'spellblade') {
      if (MetaProgress.hasSpellbladePrismarchSkin()) list.push('prismancy');
    } else {
      if (Cosmetics.hasPrismancySkin()) list.push('prismancy');
    }
    return list;
  }

  /**
   * Resolve the texture key for a (character, skin) pair. Both characters
   * branch on skin now that Spellblade has its Prismarch-tier variant.
   */
  private previewTextureKey(character: CharacterId, skin: SkinId): string {
    if (character === 'spellblade') {
      return skin === 'prismancy'
        ? TextureKeys.PlayerSpellbladePrismarch
        : TextureKeys.PlayerSpellblade;
    }
    return skin === 'prismancy' ? TextureKeys.PlayerPrismancy : TextureKeys.Player;
  }

  /**
   * Texture key for whichever (character, skin) is currently persisted.
   * Used for the very first paint before `setupCharacterCycle` runs.
   */
  private currentCycleTextureKey(): string {
    return this.previewTextureKey(
      MetaProgress.getSelectedCharacter(),
      MetaProgress.getSelectedSkin(),
    );
  }

  private characterLabel(character: CharacterId): string {
    return character === 'spellblade' ? 'SPELLBLADE' : 'WIZARD';
  }

  private skinHintText(skin: SkinId): string {
    const name = skin === 'prismancy' ? 'PRISMANCY' : 'DEFAULT';
    return `[S] SKIN: ${name}`;
  }

  /**
   * Character profile card painted in the gap between the wizard preview
   * and the Pixie Queen. Lists the trade-off-relevant stats for the
   * currently-cycled character so the player can compare Wizard vs
   * Spellblade at a glance instead of hunting them down via Controls.
   *
   * Returns an `update(character)` callback so the cycle handler can
   * refresh the panel without rebuilding it. Container groups everything
   * under a single depth + makes future repositioning easy.
   *
   * Stats shown: HP, cast rate (1/s), damage/shot, pierce baseline,
   * projectile size, dash availability. Items / picked-up modifiers are
   * NOT shown — this is the *base profile* before the run starts.
   */
  private buildCharacterStatsPanel(): { update: (character: CharacterId) => void } {
    const panelW = 232;
    const panelH = 252;
    // Centered horizontally — sits over the action effects but is hidden
    // by default so the title-screen art reads cleanly. Player toggles
    // it with [I] (see the [I] hint at the bottom of the menu).
    const panelX = Math.round((GAME_WIDTH - panelW) / 2);
    const panelY = 178;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0418, 0.86);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    bg.lineStyle(1, 0xfff8c0, 0.32);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const titleText = this.add
      .text(panelX + panelW / 2, panelY + 18, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fff8c0',
        stroke: '#1a0828',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);

    const subtitleText = this.add
      .text(panelX + panelW / 2, panelY + 46, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#aab8c0',
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);

    // Gold accent under the title.
    const accent = this.add.graphics();
    accent.fillStyle(0xfff8c0, 0.35);
    accent.fillRect(panelX + 24, panelY + 70, panelW - 48, 1);

    // Stat rows — label left, value right. Order matches the trade-off
    // narrative: defensive → offensive → utility.
    const ROW_LABELS = ['HP', 'CAST RATE', 'DAMAGE', 'PIERCE', 'PROJECTILE', 'DASH'] as const;
    const rowsY = panelY + 86;
    const rowGap = 24;

    const labelTexts: Phaser.GameObjects.Text[] = [];
    const valueTexts: Phaser.GameObjects.Text[] = [];

    for (let i = 0; i < ROW_LABELS.length; i++) {
      const y = rowsY + i * rowGap;
      labelTexts.push(
        this.add
          .text(panelX + 16, y, ROW_LABELS[i]!, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aab8c0',
          })
          .setOrigin(0, 0),
      );
      valueTexts.push(
        this.add
          .text(panelX + panelW - 16, y, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#e9d5ff',
          })
          .setOrigin(1, 0),
      );
    }

    // Container groups everything under one depth so the panel sits
    // above the action effects (depth 10) but below the title text and
    // menu items (default depth 0 — but they're outside the panel rect
    // anyway, so the visual layering only matters for the action arc /
    // thorns sweeping behind the card).
    const container = this.add.container(0, 0, [
      bg,
      accent,
      titleText,
      subtitleText,
      ...labelTexts,
      ...valueTexts,
    ]);
    container.setDepth(15);
    // Hidden by default — title-screen art shouldn't be obscured every
    // time you boot the game. Player opts in via [I] when curious.
    container.setVisible(false);

    // [I] toggle — bottom-of-screen hint mirrors the [S] / cycle hint
    // styling so both feel like part of the same widget family. Hint
    // sits above the character cycle so the bottom row stays focused on
    // character/skin pickers.
    const hintLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 22, '[I]  CHARACTER  INFO', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#aab8c0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.input.keyboard?.on('keydown-I', () => {
      const next = !container.visible;
      container.setVisible(next);
      // Swap the hint label so [I] always announces the *opposite* state.
      hintLabel.setText(next ? '[I]  HIDE  INFO' : '[I]  CHARACTER  INFO');
    });

    interface StatProfile {
      title: string;
      subtitle: string;
      values: readonly [string, string, string, string, string, string];
    }
    const PROFILES: Record<CharacterId, StatProfile> = {
      wizard: {
        title: 'WIZARD',
        subtitle: 'Sustained ranged caster',
        values: ['3 HEARTS', '4.0 / s', '1.0', '—', 'Small orb', '—'],
      },
      spellblade: {
        title: 'SPELLBLADE',
        subtitle: 'Glass-cannon swordmage',
        values: ['2 HEARTS', '1.1 / s', '1.5', '1 baseline', 'Large bolt', '[SHIFT] dodge'],
      },
    };

    const update = (character: CharacterId): void => {
      const profile = PROFILES[character];
      titleText.setText(profile.title);
      subtitleText.setText(profile.subtitle);
      for (let i = 0; i < valueTexts.length; i++) {
        valueTexts[i]!.setText(profile.values[i]!);
      }
    };

    return { update };
  }

  // ---------------------------------------------------------------------------
  // Painters
  // ---------------------------------------------------------------------------

  /**
   * Sky gradient (dark purple → deep teal-green), distant + mid forest
   * silhouettes, mossy ground curve, mist bands, scattered fireflies.
   * Painted with primitive shapes — no atlas fetching, deterministic.
   */
  private paintBackdrop(g: Phaser.GameObjects.Graphics): void {
    // Sky gradient — fake the gradient by stacking 12 horizontal strips.
    const skyTop = 0x1a0c2a;
    const skyBottom = 0x0e1a16;
    const horizonY = GAME_HEIGHT * 0.62;
    const strips = 16;
    for (let i = 0; i < strips; i++) {
      const t = i / (strips - 1);
      const color = lerpColor(skyTop, skyBottom, t);
      g.fillStyle(color, 1);
      const y = (i / strips) * horizonY;
      const h = Math.ceil(horizonY / strips) + 1;
      g.fillRect(0, y, GAME_WIDTH, h);
    }

    // Pink moon halo behind the queen — soft ominous backlight.
    const moonX = GAME_WIDTH - 240;
    const moonY = GAME_HEIGHT * 0.30;
    const haloLayers = [
      { r: 220, alpha: 0.06, color: 0xff7ac0 },
      { r: 170, alpha: 0.1, color: 0xff7ac0 },
      { r: 120, alpha: 0.16, color: 0xffaad8 },
      { r: 80, alpha: 0.22, color: 0xffd0e8 },
      { r: 50, alpha: 0.4, color: 0xffeaf2 },
    ];
    for (const layer of haloLayers) {
      g.fillStyle(layer.color, layer.alpha);
      g.fillCircle(moonX, moonY, layer.r);
    }

    // Distant forest silhouette layer (back) — small jagged triangle band
    // running across the horizon.
    g.fillStyle(0x040a0a, 1);
    g.fillRect(0, horizonY - 4, GAME_WIDTH, 6);
    for (let x = 0; x < GAME_WIDTH; x += 18) {
      const h = 14 + ((x * 7919) % 18); // pseudo-random, deterministic
      g.fillTriangle(x - 4, horizonY, x + 12, horizonY, x + 4, horizonY - h);
    }

    // Mid forest silhouette layer (closer) — larger, denser trees.
    g.fillStyle(0x081210, 1);
    g.fillRect(0, horizonY + 6, GAME_WIDTH, 22);
    for (let x = -10; x < GAME_WIDTH + 10; x += 36) {
      const h = 36 + ((x * 4421) % 28);
      // Trunk
      g.fillRect(x + 14, horizonY + 6, 4, h * 0.45);
      // Foliage — overlapping circles
      g.fillStyle(0x0a1a18, 1);
      g.fillCircle(x + 16, horizonY + 6 - h * 0.2, h * 0.28);
      g.fillCircle(x + 6, horizonY + 6 - h * 0.05, h * 0.22);
      g.fillCircle(x + 26, horizonY + 6, h * 0.24);
      g.fillStyle(0x081210, 1);
    }

    // Mossy ground curve — fills below horizon, slightly arched.
    g.fillStyle(0x0e2a22, 1);
    g.fillRect(0, horizonY + 20, GAME_WIDTH, GAME_HEIGHT - horizonY);
    g.fillStyle(0x14361a, 1);
    g.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT + 60, GAME_WIDTH * 1.4, 220);
    g.fillStyle(0x1f4a26, 1);
    g.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT + 100, GAME_WIDTH * 1.3, 200);

    // Mist bands — thin alpha strips just above the ground line.
    g.fillStyle(0xc0eadd, 0.06);
    g.fillRect(0, horizonY + 26, GAME_WIDTH, 14);
    g.fillStyle(0xc0eadd, 0.08);
    g.fillRect(0, horizonY + 44, GAME_WIDTH, 8);

    // Fireflies — palette-glow specks scattered through the lower scene.
    const fly = (x: number, y: number, size: number, color: number, alpha: number): void => {
      g.fillStyle(0x040a05, 1);
      g.fillCircle(x, y, size + 0.8);
      g.fillStyle(color, alpha);
      g.fillCircle(x, y, size);
      g.fillStyle(0xffffff, alpha * 0.9);
      g.fillRect(x, y - 1, 1, 1);
    };
    const fireflies: ReadonlyArray<readonly [number, number, number]> = [
      [120, 220, 2],
      [380, 180, 1.6],
      [460, 260, 2.2],
      [560, 200, 1.8],
      [680, 350, 1.6],
      [820, 240, 2],
      [180, 380, 1.4],
      [340, 460, 2],
      [580, 480, 1.8],
      [780, 460, 1.6],
      [880, 380, 2],
      [80, 320, 1.5],
    ];
    for (const [fx, fy, fr] of fireflies) {
      fly(fx, fy, fr, 0x88c060, 1);
    }
    // A few pink ones near the queen for tonal cohesion.
    fly(GAME_WIDTH - 320, 200, 1.6, 0xff7ac0, 1);
    fly(GAME_WIDTH - 180, 240, 2, 0xff7ac0, 1);
    fly(GAME_WIDTH - 280, 360, 1.4, 0xffaad8, 1);
  }

  /**
   * Pink swirl behind the queen so she reads as "powered up". Layered
   * concentric pink rings + a few orbiting sparkle pixels.
   */
  private paintQueenHalo(): void {
    const g = this.add.graphics();
    const x = GAME_WIDTH - 240;
    const y = GAME_HEIGHT / 2 - 30;
    g.fillStyle(0xff7ac0, 0.14);
    g.fillCircle(x, y, 180);
    g.fillStyle(0xff7ac0, 0.18);
    g.fillCircle(x, y, 130);
    g.fillStyle(0xffaad8, 0.18);
    g.fillCircle(x, y, 90);
  }

  /** Soft green-gold glow under the wizard's feet. */
  private paintWizardAura(): void {
    const g = this.add.graphics();
    const x = 240;
    const y = GAME_HEIGHT / 2 + 60;
    g.fillStyle(0x88c060, 0.12);
    g.fillEllipse(x, y + 110, 220, 60);
    g.fillStyle(0x4ea656, 0.18);
    g.fillEllipse(x, y + 110, 160, 40);
    g.fillStyle(0xb0e890, 0.22);
    g.fillEllipse(x, y + 110, 100, 24);
  }

  /**
   * Wizard's magic missile streak (left → right, arcing up) and queen's
   * thorn volley (right → left, straighter). Drawn statically — no
   * animation, this is a poster, not a cutscene.
   */
  private paintActionEffects(): void {
    const g = this.add.graphics();
    g.setDepth(10);

    const wizardWandX = 240 + 60; // wand tip + rotation
    const wizardWandY = GAME_HEIGHT / 2 + 60 - 50;
    const queenChestX = GAME_WIDTH - 240 - 30;
    const queenChestY = GAME_HEIGHT / 2 - 30 + 10;

    // --- Wizard's magic missile arc ---
    // 5 missile beads along a quadratic curve from wand → queen, fading
    // toward the back of the trail.
    const ctrlX = (wizardWandX + queenChestX) / 2;
    const ctrlY = Math.min(wizardWandY, queenChestY) - 80;
    const beads = 6;
    for (let i = 0; i < beads; i++) {
      const t = (i + 1) / (beads + 1);
      const px = quadBezier(wizardWandX, ctrlX, queenChestX, t);
      const py = quadBezier(wizardWandY, ctrlY, queenChestY, t);
      const alpha = 0.4 + (i / (beads - 1)) * 0.55;
      const radius = 3 + (i / (beads - 1)) * 5;
      // Outer glow
      g.fillStyle(0xc0eaff, alpha * 0.4);
      g.fillCircle(px, py, radius * 1.6);
      // Core
      g.fillStyle(0xeaffff, alpha);
      g.fillCircle(px, py, radius);
      // Sparkle pixel
      g.fillStyle(0xffffff, alpha);
      g.fillRect(px, py - 1, 1, 1);
    }

    // --- Queen's thorn volley (3 thorns flying at the wizard) ---
    const thorns: ReadonlyArray<readonly [number, number]> = [
      [GAME_WIDTH - 360, GAME_HEIGHT / 2 - 80],
      [GAME_WIDTH - 460, GAME_HEIGHT / 2 + 20],
      [GAME_WIDTH - 560, GAME_HEIGHT / 2 + 100],
    ];
    for (const [tx, ty] of thorns) {
      // Thorn body — small dark triangle pointing left toward the wizard
      g.fillStyle(0x040408, 1);
      g.fillTriangle(tx + 12, ty - 5, tx + 12, ty + 5, tx - 6, ty);
      g.fillStyle(0xff7ac0, 1);
      g.fillTriangle(tx + 10, ty - 3, tx + 10, ty + 3, tx - 4, ty);
      // Tracer streak behind the thorn
      g.fillStyle(0xffaad8, 0.5);
      g.fillRect(tx + 12, ty - 1, 24, 2);
      g.fillStyle(0xffaad8, 0.25);
      g.fillRect(tx + 36, ty - 1, 28, 2);
    }
  }

  private paintTitle(cx: number): void {
    // Drop shadow for depth — drawn as a duplicate text behind the main one.
    const titleShadow = this.add
      .text(cx + 4, 110 + 4, 'PRISMANCY', {
        fontSize: '88px',
        fontStyle: 'bold',
        color: '#000000',
      })
      .setOrigin(0.5)
      .setAlpha(0.55);

    const title = this.add
      .text(cx, 110, 'PRISMANCY', {
        fontSize: '88px',
        fontStyle: 'bold',
        color: '#e9d5ff',
        stroke: '#1a0828',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Subtle title pulse so it feels alive.
    this.tweens.add({
      targets: [title, titleShadow],
      scale: { from: 1, to: 1.03 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // The old SPACE / ENTER prompt + controls hint moved into the new
    // vertical menu (`buildVerticalMenu`) and the dedicated ControlsScene
    // overlay. [M] dev-only StyleMockup keybind is still wired in `create()`.
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Linear-interpolate between two RGB hex colours by `t` ∈ [0, 1]. */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gn = Math.round(ag + (bg - ag) * t);
  const bn = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gn << 8) | bn;
}

/** Quadratic Bézier point on axis: p0 + (p1-p0)*2t(1-t) + (p2-p0)*t². */
function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}
