import Phaser from 'phaser';
import {
  FLOOR_TILE_VARIANTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  SceneKeys,
  TILE_SIZE,
  TextureKeys,
  bossDoorKey,
  floorTileKey,
  gemTextureKey,
  mushroomDecoKey,
  normalDoorKey,
  rockDecoKey,
  shopDoorKey,
  shopDoorLockedKey,
  treasureDoorKey,
  treasureDoorLockedKey,
  treeDecoKey,
  wallTileKey,
} from '../config/GameConfig';
import { FLOORS } from '../data/floors';
import { ALL_MUSIC_TRACKS } from '../systems/MusicManager';
import { type FloorTheme } from '../types';
import { RNG } from '../utils/RNG';

/**
 * Loads / generates assets and shows a progress bar. All sprites are still
 * prozedural — no external PNGs — but each is now drawn in a polished
 * pixel-art style (1 px outline, 3-tone shading, detail pixels, ground
 * shadows, glow accents). The visual reference is `mockup.html` in the project
 * root: `drawWizardNew`, `drawSlimeNew`, `drawSpriteNew`, `drawSceneNew`. Any
 * sprite without a mockup (Vine Sprout, Pixie Dancer, Tree, Hearts, Boss Door,
 * Magic Missile, Thorn) follows the same conventions.
 *
 * Floor / wall / decoration textures are generated per-floor using each
 * floor's `FloorTheme.palette`. Adding a gemstone floor only requires a new
 * entry in `data/floors.ts` — no changes here.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Preload });
  }

  preload(): void {
    this.drawProgressBar();
    this.loadMusicTracks();
  }

  /**
   * Queue every known music track. Files missing from `public/audio/music/`
   * trigger a `loaderror` event on the loader but don't crash — Phaser just
   * leaves no cache entry, and `MusicManager.playTrack` checks `cache.audio
   * .exists` before playing, so the absence is silent ingame.
   */
  private loadMusicTracks(): void {
    for (const key of ALL_MUSIC_TRACKS) {
      this.load.audio(key, `audio/music/${key}.mp3`);
    }
  }

  create(): void {
    this.generatePlaceholderTextures();
    this.scene.start(SceneKeys.MainMenu);
  }

  private drawProgressBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const barWidth = 320;
    const barHeight = 24;

    const frame = this.add.rectangle(cx, cy, barWidth, barHeight).setStrokeStyle(2, 0xffffff);
    const fill = this.add
      .rectangle(cx - barWidth / 2 + 2, cy, 0, barHeight - 4, 0xffffff)
      .setOrigin(0, 0.5);
    const label = this.add
      .text(cx, cy - 32, 'Loading...', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fill.width = (barWidth - 4) * value;
    });
    this.load.on('complete', () => {
      frame.destroy();
      fill.destroy();
      label.destroy();
    });
  }

  private generatePlaceholderTextures(): void {
    const g = this.add.graphics();

    this.drawWizardTexture(g, this.DEFAULT_WIZARD_PALETTE, TextureKeys.Player);
    this.drawWizardTexture(g, this.PRISMANCY_WIZARD_PALETTE, TextureKeys.PlayerPrismancy);
    this.drawSpellbladeTexture(g, this.DEFAULT_SPELLBLADE_PALETTE, TextureKeys.PlayerSpellblade);
    this.drawSpellbladeTexture(g, this.PRISMARCH_SPELLBLADE_PALETTE, TextureKeys.PlayerSpellbladePrismarch);
    this.drawMagicMissileTexture(g);
    this.drawSpellbladeBoltTexture(g);
    this.drawForestSpriteTexture(g);
    this.drawMossySlimeTexture(g);
    this.drawVineSproutTexture(g);
    this.drawPixieDancerTexture(g);
    this.drawBogFrogTexture(g);
    this.drawSnapperBloomTexture(g);
    this.drawDamselflyTexture(g);
    this.drawBogTortoiseTexture(g);
    this.drawBossToadSovereignTexture(g);
    this.drawBossBloomheartTexture(g);
    this.drawBossDamselflyEmpressTexture(g);
    this.drawBossBogColossusTexture(g);
    this.drawBossMossyBehemothTexture(g);
    this.drawBossPixieQueenTexture(g);
    this.drawBossForestHeartTexture(g);
    this.drawWraithTexture(g);
    this.drawPossessedCandelabraTexture(g);
    this.drawCursedMirrorTexture(g);
    this.drawMinibossThornwoodShamblerTexture(g);
    this.drawMinibossMireLurkerTexture(g);
    // Doppelgänger = the player's own sprite layout in mansion colours.
    this.drawWizardTexture(g, this.DOPPELGANGER_WIZARD_PALETTE, TextureKeys.MinibossDoppelganger);
    this.drawMansionMissileTexture(g);
    this.drawCasterOrbTexture(g, TextureKeys.CasterOrbEmerald, 0x6effa0, 0x3ad86a, 0xc8ffd8);
    this.drawCasterOrbTexture(g, TextureKeys.CasterOrbSapphire, 0x4ad8ff, 0x2d9ad8, 0xc8f4ff);
    this.drawFlameMissileTexture(g);
    this.drawWaxPuddleTexture(g);
    // BossCrimsonLord + BossSapphireMarquis: dead-code from the pre-Marquis-
    // of-Mirages Vampire Twins design. Still drawn so the StyleMockupScene
    // Page 6 "design history" panel can render the old sprites + so TS
    // noUnusedLocals doesn't trip. Cleanup pass when the history page is no
    // longer needed.
    this.drawBossCrimsonLordTexture(g);
    this.drawBossSapphireMarquisTexture(g);
    this.drawBossMarquisOfMiragesTexture(g);
    this.drawMirrorPortalEntryTexture(g);
    this.drawMirrorPortalExitTexture(g);
    this.drawBloodProjectileTexture(g);
    this.drawBossLordOnyxTexture(g);
    this.drawThornTexture(g);
    this.drawSapphireThornTexture(g);
    this.drawHeartTextures(g);
    this.drawCoinTexture(g);
    this.drawKeyTexture(g);
    this.drawBrownCrateTexture(g);
    this.drawGoldCrateTexture(g);
    this.drawItemPedestalTexture(g);
    this.drawItemMagicTomeTexture(g);
    this.drawItemHotTeaTexture(g);
    this.drawItemWizardSneakersTexture(g);
    this.drawItemTelescopicWandTexture(g);
    this.drawItemLeadCapTexture(g);
    this.drawItemMagicPotionTexture(g);
    this.drawItemPixieDustTexture(g);
    this.drawItemHeartContainerTexture(g);
    this.drawItemCrownOfTheVineTexture(g);
    this.drawItemAncientHeartTexture(g);
    this.drawItemWitheredFangTexture(g);
    this.drawItemSpyglassTexture(g);
    this.drawItemLilyDiademTexture(g);
    this.drawItemMirePearlTexture(g);
    this.drawItemFrogTongueTexture(g);
    this.drawItemBloodboundChaliceTexture(g);
    this.drawItemVampireSignetTexture(g);
    this.drawItemObsidianHeartTexture(g);
    this.drawItemMagicShardTexture(g);
    this.drawItemWizardGlassesTexture(g);
    this.drawItemFireOrbTexture(g);
    this.drawItemBloodOfMarquisTexture(g);
    this.drawItemBloodOfMarquisEmptyTexture(g);
    this.drawItemBloodlettersPactTexture(g);
    this.drawItemTransmutationStoneTexture(g);
    this.drawItemHummingbirdFeatherTexture(g);
    this.drawStairsTexture(g);

    for (const theme of Object.values(FLOORS)) {
      this.drawFloorTextures(g, theme);
      this.drawWallTexture(g, theme);
      this.drawBossDoorTexture(g, theme);
      this.drawNormalDoorTexture(g, theme);
      this.drawTreasureDoorTexture(g, theme, false);
      this.drawTreasureDoorTexture(g, theme, true);
      this.drawShopDoorTexture(g, theme, false);
      this.drawShopDoorTexture(g, theme, true);
      this.drawMushroomTexture(g, theme);
      // Swamp floors use lily pads + mangrove roots; mansion floors use
      // candelabra + cracked vases. All variants write to the same texture
      // keys (treeDecoKey / rockDecoKey) so the consumer (Room) doesn't
      // need to know which silhouette it got.
      if (theme.decorationStyle === 'swamp') {
        this.drawLilyPadTexture(g, theme);
        this.drawMangroveRootTexture(g, theme);
      } else if (theme.decorationStyle === 'mansion') {
        this.drawCandelabrumTexture(g, theme);
        this.drawCrackedVaseTexture(g, theme);
      } else {
        this.drawRockTexture(g, theme);
        this.drawTreeTexture(g, theme);
      }
      this.drawGemTexture(g, theme);
    }

    g.destroy();
  }

  // ---------------------------------------------------------------------------
  // Pixel helpers
  //
  // Sprites are designed in a pixel grid (matching `mockup.html`) and rendered
  // by multiplying each grid cell up to a chosen scale. `PixelCtx` keeps the
  // origin offset + scale together so each sprite can have its own grid
  // independent of its texture dimensions.
  // ---------------------------------------------------------------------------

  /** Draw a `w × h` block of grid pixels at `(gx, gy)` in `color`. */
  private pxBlock(
    g: Phaser.GameObjects.Graphics,
    gx: number,
    gy: number,
    gw: number,
    gh: number,
    color: number,
    scale: number,
    offX = 0,
    offY = 0,
    alpha = 1,
  ): void {
    g.fillStyle(color, alpha);
    g.fillRect(offX + gx * scale, offY + gy * scale, gw * scale, gh * scale);
  }

  /** Single-pixel convenience wrapper. */
  private px(
    g: Phaser.GameObjects.Graphics,
    gx: number,
    gy: number,
    color: number,
    scale: number,
    offX = 0,
    offY = 0,
    alpha = 1,
  ): void {
    this.pxBlock(g, gx, gy, 1, 1, color, scale, offX, offY, alpha);
  }

  /**
   * Soft elliptical ground shadow at world-space `(cx, cy)`. Used under
   * characters and decorations to give them weight on the floor.
   */
  private groundShadow(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    alpha = 0.4,
  ): void {
    g.fillStyle(0x000000, alpha);
    g.fillEllipse(cx, cy, rx * 2, ry * 2);
    // Keep the pixel-grid helpers referenced — they remain available for
    // future pixel-art sprites even though the flat-vector repaint no longer
    // calls them directly.
    void this.px;
  }

  // ---------------------------------------------------------------------------
  // Wizard
  // ---------------------------------------------------------------------------

  /**
   * Wizard player sprite — pointy hat with gold tip + brim shadow, white
   * beard, robe with shaded sides, gold belt buckle, wand peeking out on the
   * right, soft ground shadow under the feet. Mirrors `drawWizardNew` from
   * `mockup.html`. Texture is `TILE_SIZE × TILE_SIZE` and the physics body is
   * a circle set in `Player.ts`, so the visual fits inside the existing frame
   * without affecting collision.
   *
   * Palette + texture key are parameterised so the same pixel layout can be
   * recoloured for cosmetic skins (e.g. the Prismancy red/gold unlock
   * earned by defeating Lord Onyx) without duplicating the per-row block
   * positions.
   */
  private drawWizardTexture(
    g: Phaser.GameObjects.Graphics,
    palette: {
      OUT: number;
      HAT: number;
      HAT_DARK: number;
      HAT_HI: number;
      SKIN: number;
      SKIN_SHADOW: number;
      ROBE: number;
      ROBE_HI: number;
      ROBE_SHADOW: number;
      BEARD: number;
      BEARD_SHADOW: number;
      BUCKLE: number;
      WAND: number;
      TIP: number;
      SHADOW: number;
      BOOT: number;
      BOOT_HI: number;
      EYE: number;
      TIP_SPARKLE: number;
    },
    textureKey: string,
  ): void {
    const size = TILE_SIZE;
    g.clear();

    // Painted version (Variant C "Compact Wizard" from StyleMockupScene Page 7).
    // Same vocabulary as the bosses — fillPoints silhouette + fillEllipse/
    // fillTriangle multi-tone shading + soft outline — instead of the old PX-2
    // pixel-block grid. Slightly smaller than the previous pixel-art so the
    // wizard reads as a hero rather than dominating the room.
    //
    // Palette mapping (mockup → palette field):
    //   ROBE_DARK → ROBE_SHADOW
    //   TIP_HALO  → TIP_SPARKLE
    // SHADOW + BOOT_HI + HAT (mid-tone) are kept in the palette interface
    // even though they're consumed sparingly here, so the existing two
    // skin palettes (default purple, prismancy crimson) keep working.
    const {
      OUT,
      HAT,
      HAT_DARK,
      HAT_HI,
      SKIN,
      SKIN_SHADOW,
      ROBE,
      ROBE_HI,
      ROBE_SHADOW,
      BEARD,
      BEARD_SHADOW,
      BUCKLE,
      WAND,
      TIP,
      BOOT,
      EYE,
      TIP_SPARKLE,
    } = palette;
    void HAT;
    void palette.SHADOW;
    void palette.BOOT_HI;
    void SKIN_SHADOW;
    void ROBE_SHADOW;

    const cx = size / 2;        // 32
    const top = 10;             // figure top y (hat tip) — shifted down vs.
                                 // the previous painterly pass so the figure
                                 // shrinks ~85 % without changing the world-
                                 // space hitbox (PLAYER_HITBOX_OFFSET_Y +
                                 // PLAYER_HITBOX_RADIUS in GameConfig stay
                                 // unchanged). User-flagged 2026-05-07.
    const figBot = 53;          // boots bottom y

    // FLAT-VECTOR REPAINT — bold dark outline + single flat tone per region
    // + one soft highlight per major form. Same silhouette + signature
    // features (bell robe, gold belt, pointed hat, wand with glowing tip).

    // Ground shadow under the boots (kept for visual ground parity).
    g.fillStyle(palette.SHADOW, 0.45);
    g.fillEllipse(cx, figBot, 14, 2);

    // 1) ROBE — bell silhouette. Outline then inset flat fill.
    const robe: Array<{ x: number; y: number }> = [
      { x: cx - 6, y: top + 19 },     // L shoulder
      { x: cx + 6, y: top + 19 },     // R shoulder
      { x: cx + 11, y: top + 38 },    // R hem corner
      { x: cx, y: top + 41 },         // hem center
      { x: cx - 11, y: top + 38 },    // L hem corner
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(robe, true);
    g.fillStyle(ROBE, 1);
    g.fillPoints(
      [
        { x: cx - 5, y: top + 20 },
        { x: cx + 5, y: top + 20 },
        { x: cx + 9, y: top + 37 },
        { x: cx, y: top + 39.5 },
        { x: cx - 9, y: top + 37 },
      ],
      true,
    );
    // Single soft highlight, upper-left.
    g.fillStyle(ROBE_HI, 0.7);
    g.fillEllipse(cx - 3, top + 25, 3, 7);

    // 2) BELT with buckle.
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(cx - 8, top + 30, 16, 4, 1.5);
    g.fillStyle(BUCKLE, 1);
    g.fillRect(cx - 2, top + 31, 4, 2);

    // 3) BOOTS peeking out at the hem.
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx - 3, top + 42, 5, 3);
    g.fillEllipse(cx + 3, top + 42, 5, 3);
    g.fillStyle(BOOT, 1);
    g.fillEllipse(cx - 3, top + 41.5, 3.5, 2);
    g.fillEllipse(cx + 3, top + 41.5, 3.5, 2);

    // 4) BEARD — soft rounded tuft (outline + flat fill).
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, top + 17, 10, 9);
    g.fillStyle(BEARD, 1);
    g.fillEllipse(cx, top + 17, 8, 7);
    g.fillStyle(BEARD_SHADOW, 0.5);
    g.fillEllipse(cx + 2, top + 19, 2.5, 3);

    // 5) FACE — flat skin band, cute eyes (dark dot + catch-light).
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, top + 12, 9, 6);
    g.fillStyle(SKIN, 1);
    g.fillEllipse(cx, top + 12, 7, 4.4);
    g.fillStyle(EYE, 1);
    g.fillCircle(cx - 2, top + 11.5, 1.1);
    g.fillCircle(cx + 2, top + 11.5, 1.1);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx - 2, top + 11, 1, 1);
    g.fillRect(cx + 2, top + 11, 1, 1);

    // 6) HAT — pointed cone + soft brim. Outline then flat fill.
    const hat: Array<{ x: number; y: number }> = [
      { x: cx, y: top - 1 },          // tip
      { x: cx + 9, y: top + 12 },     // brim corner R
      { x: cx, y: top + 11 },         // under center
      { x: cx - 9, y: top + 12 },     // brim corner L
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(hat, true);
    g.fillStyle(HAT_DARK, 1);
    g.fillPoints(
      [
        { x: cx, y: top + 1 },
        { x: cx + 7.5, y: top + 11 },
        { x: cx, y: top + 10 },
        { x: cx - 7.5, y: top + 11 },
      ],
      true,
    );
    // Single highlight stripe down the left of the cone.
    g.fillStyle(HAT_HI, 0.7);
    g.fillTriangle(cx - 1, top + 2, cx + 0.5, top + 2, cx - 3.5, top + 9);
    // Gold tip orb above the hat point.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, top - 2, 1.9);
    g.fillStyle(BUCKLE, 1);
    g.fillCircle(cx, top - 2, 1.2);

    // 7) WAND — clean shaft, outline + flat fill, glowing tip orb.
    g.fillStyle(OUT, 1);
    g.fillTriangle(cx + 2, top + 30, cx + 11, top + 16, cx + 12.5, top + 19);
    g.fillStyle(WAND, 1);
    g.fillTriangle(cx + 3, top + 30.5, cx + 10.5, top + 17, cx + 11.5, top + 19);

    // 8) HAND on the wand — flat circle + outline.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 6, top + 26, 2);
    g.fillStyle(SKIN, 1);
    g.fillCircle(cx + 6, top + 26, 1.3);

    // 9) WAND TIP — soft halo + outlined orb + catch-light.
    g.fillStyle(TIP_SPARKLE, 0.45);
    g.fillCircle(cx + 11, top + 16, 4);
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 11, top + 16, 2.4);
    g.fillStyle(TIP, 1);
    g.fillCircle(cx + 11, top + 16, 1.5);
    g.fillStyle(TIP_SPARKLE, 1);
    g.fillRect(cx + 10, top + 15, 1, 1);

    // 10) Ground shadow under the boots.
    this.groundShadow(g, cx, figBot + 2, 9, 1.4, 0.45);

    g.generateTexture(textureKey, size, size);
  }

  /**
   * Default purple+white wizard palette. The first time the player runs
   * the game they spawn with this skin; the Prismancy unlock swaps it
   * automatically once Lord Onyx is dead.
   */
  private readonly DEFAULT_WIZARD_PALETTE = {
    OUT: 0x1a0828,
    HAT: 0x5a1f9a,
    HAT_DARK: 0x3a0f70,
    HAT_HI: 0x7a3fbe,
    SKIN: 0xf0c89a,
    SKIN_SHADOW: 0xc89a6c,
    ROBE: 0x7a2cb8,
    ROBE_HI: 0x9a4cd8,
    ROBE_SHADOW: 0x5a1c98,
    BEARD: 0xe8e8e8,
    BEARD_SHADOW: 0xa8a8a8,
    BUCKLE: 0xffd84a,
    WAND: 0xc89758,
    TIP: 0xffd84a,
    SHADOW: 0x3a2a4a,
    BOOT: 0x2a1a0d,
    BOOT_HI: 0x4a3a2d,
    EYE: 0x222222,
    TIP_SPARKLE: 0xfff8c0,
  } as const;

  /**
   * Prismancy palette — deep crimson robe + gold trim + black hat with gold
   * band. Earned by defeating Lord Onyx; the wizard wears the slain lord's
   * colours as a trophy. Same pixel layout as the default skin.
   */
  private readonly PRISMANCY_WIZARD_PALETTE = {
    OUT: 0x1a0408,
    // Hat: deep black-crimson, gold-band feel via the highlight row.
    HAT: 0x3a0a18,
    HAT_DARK: 0x180408,
    HAT_HI: 0xffd84a,
    SKIN: 0xf0c89a,
    SKIN_SHADOW: 0xc89a6c,
    // Robe: rich crimson with gold highlight + dark blood-red shadow.
    ROBE: 0xb8202c,
    ROBE_HI: 0xffc850,
    ROBE_SHADOW: 0x6a0a14,
    BEARD: 0xf8f0e0,
    BEARD_SHADOW: 0xb0a890,
    BUCKLE: 0xfff0a8,
    WAND: 0xffc850,
    TIP: 0xffd84a,
    SHADOW: 0x3a1a14,
    BOOT: 0x2a1408,
    BOOT_HI: 0x6a3a14,
    EYE: 0x300008,
    TIP_SPARKLE: 0xffffff,
  } as const;

  /**
   * Doppelgänger palette (Onyx miniboss, 2026-06-12) — the player wizard's
   * exact pixel layout recoloured into the mansion's deep purple-black +
   * amethyst language. Ashen skin, shadowy beard, gold buckle as the one
   * mansion-gold accent, and GLOWING AMETHYST EYES — the tell that this is
   * not your reflection. Reuses `drawWizardTexture`, so any future change
   * to the player silhouette automatically updates the mimic.
   */
  private readonly DOPPELGANGER_WIZARD_PALETTE = {
    // Brightness pass 2026-06-12 (user-flagged "hebt sich kaum vom Floor
    // ab"): the original near-black robe family (0x2c1a3c base) vanished
    // against the mansion's dark parquet. Robe/hat lifted to a vivid
    // mid-amethyst with bright highlights — still clearly the player's
    // dark mirror (cool violet vs. the player's purple/white), but it
    // separates from the floor at a glance. Eyes/tip stay glowing
    // amethyst as the tell. A ground-glow in Doppelganger.ts backs it up.
    OUT: 0x0a0612,
    HAT: 0x5a3494,
    HAT_DARK: 0x3a1e64,
    HAT_HI: 0x8656cc,
    SKIN: 0xb0a6c0,
    SKIN_SHADOW: 0x7a7090,
    ROBE: 0x6a3aa4,
    ROBE_HI: 0x9a62e0,
    ROBE_SHADOW: 0x44246c,
    BEARD: 0x8a7ea4,
    BEARD_SHADOW: 0x5c5078,
    BUCKLE: 0xc8a040,
    WAND: 0x55456c,
    TIP: 0xc864ff,
    SHADOW: 0x140e1e,
    BOOT: 0x241430,
    BOOT_HI: 0x44286c,
    EYE: 0xc864ff,
    TIP_SPARKLE: 0xe8c8ff,
  } as const;

  /**
   * Spellblade — Tattered Knight palette. Lore: fallen knight of the
   * Prismarch, now turning on his old master. Shares the Prismarch's
   * tattered-cult visual DNA (windblown hem-streamers, dark cape, gold
   * accents) but with a silver knight helm + onyx longsword instead of
   * the cultist hood-void + chain-bound prism. Unlocked after the first
   * Prismarch defeat. Earned in the same beat as the Prismancy skin.
   */
  private readonly DEFAULT_SPELLBLADE_PALETTE = {
    OUT: 0x080a14,
    HELM: 0x9098a8,
    HELM_HI: 0xd8e0e8,
    HELM_SHADOW: 0x4a5060,
    HELM_TRIM: 0x7a5018,
    HELM_TRIM_HI: 0xffc850,
    VISOR_GLOW: 0xc864ff,
    BODY: 0x3a4050,
    BODY_HI: 0x6a7080,
    BODY_SHADOW: 0x1a1c28,
    CAPE_OUT: 0x0a0814,
    CAPE: 0x261438,
    CAPE_HI: 0x4a2a44,
    CAPE_SHADOW: 0x1a0a20,
    BLADE_OUT: 0x080010,
    BLADE: 0x2a1438,
    BLADE_HI: 0x6a4080,
    BLADE_GLOW: 0xc864ff,
    POMMEL_DARK: 0x7a5018,
    POMMEL: 0xffc850,
    POMMEL_HI: 0xfff0a8,
    BOOT: 0x1a1c28,
    BOOT_HI: 0x4a5060,
    SHADOW: 0x080a14,
  } as const;

  /**
   * Spellblade Prismarch-tier palette — black helm + crimson cape + gold
   * trim + crimson visor/blade glow. Earned by defeating the Prismarch
   * WHILE playing the Spellblade. Lore: the fallen knight reforges his
   * gear in the Prismarch's blood after the kill, claiming the throne's
   * regalia. Same painterly silhouette as the default skin (re-uses
   * `drawSpellbladeTexture`), only colours swap.
   */
  private readonly PRISMARCH_SPELLBLADE_PALETTE = {
    OUT: 0x0a0408,
    // Helm — true black with subtle gunmetal sheen on the polished side.
    HELM: 0x18181e,
    HELM_HI: 0x4a4a58,
    HELM_SHADOW: 0x080a0e,
    // Trim — gold to match the wizard's Prismancy band.
    HELM_TRIM: 0x7a5018,
    HELM_TRIM_HI: 0xffd84a,
    // Visor — crimson eye-channel instead of amethyst.
    VISOR_GLOW: 0xff4060,
    // Body — dark armor with a faint crimson cast so it reads as a
    // matching piece with the cape rather than disconnected steel.
    BODY: 0x2a1820,
    BODY_HI: 0x4a3038,
    BODY_SHADOW: 0x10080c,
    // Cape — deep crimson swap of the wizard Prismancy robe.
    CAPE_OUT: 0x1a0408,
    CAPE: 0xb8202c,
    CAPE_HI: 0xff5060,
    CAPE_SHADOW: 0x6a0a14,
    // Blade — onyx core bleeds crimson now (Prismarch-corrupted).
    BLADE_OUT: 0x100408,
    BLADE: 0x2a1018,
    BLADE_HI: 0x8a2030,
    BLADE_GLOW: 0xff4060,
    // Pommel — gold matches the helm trim.
    POMMEL_DARK: 0x7a5018,
    POMMEL: 0xffd84a,
    POMMEL_HI: 0xfff0a8,
    BOOT: 0x1a0a10,
    BOOT_HI: 0x4a2028,
    SHADOW: 0x180408,
  } as const;

  /**
   * Render the Spellblade (Tattered Knight) sprite at the player size. Uses
   * the same painterly silhouette vocabulary as the Wizard re-paint —
   * fillPoints + fillEllipse + fillTriangle — so both characters share
   * visual DNA. Figure spans y=10 (helm dome) to y=53 (boots), `cx=32`
   * matching the wizard's bounds.
   */
  private drawSpellbladeTexture(
    g: Phaser.GameObjects.Graphics,
    palette: {
      OUT: number;
      HELM: number;
      HELM_HI: number;
      HELM_SHADOW: number;
      HELM_TRIM: number;
      HELM_TRIM_HI: number;
      VISOR_GLOW: number;
      BODY: number;
      BODY_HI: number;
      BODY_SHADOW: number;
      CAPE_OUT: number;
      CAPE: number;
      CAPE_HI: number;
      CAPE_SHADOW: number;
      BLADE_OUT: number;
      BLADE: number;
      BLADE_HI: number;
      BLADE_GLOW: number;
      POMMEL_DARK: number;
      POMMEL: number;
      POMMEL_HI: number;
      BOOT: number;
      BOOT_HI: number;
      SHADOW: number;
    },
    textureKey: string,
  ): void {
    const size = TILE_SIZE;
    g.clear();
    const {
      OUT,
      HELM,
      HELM_HI,
      HELM_SHADOW,
      HELM_TRIM,
      HELM_TRIM_HI,
      VISOR_GLOW,
      BODY,
      BODY_HI,
      BODY_SHADOW,
      CAPE_OUT,
      CAPE,
      CAPE_HI,
      CAPE_SHADOW,
      BLADE_OUT,
      BLADE,
      BLADE_HI,
      BLADE_GLOW,
      POMMEL_DARK,
      POMMEL,
      POMMEL_HI,
      BOOT,
      BOOT_HI,
      SHADOW,
    } = palette;
    void HELM_SHADOW;
    void CAPE_SHADOW;
    void BODY_SHADOW;
    void HELM_TRIM;
    void POMMEL_DARK;
    void POMMEL_HI;
    void BOOT_HI;

    const cx = size / 2;
    const top = 10;
    const figBot = 53;

    // FLAT-VECTOR REPAINT — bold outline + single flat tone per region + one
    // soft highlight per major form. Keeps the validated B silhouette: dark
    // cape with hem-streamers, steel breastplate with pauldron cups + center
    // seam, silver helm with violet visor + two eye-glows, gold belt, angled
    // onyx longsword (gold crossguard + pommel).

    // Ground shadow.
    g.fillStyle(SHADOW, 0.45);
    g.fillEllipse(cx, figBot, 14, 2);

    // 1) CAPE — asymmetric windblown silhouette, outline + flat fill.
    const cape: Array<{ x: number; y: number }> = [
      { x: cx - 7, y: top + 16 },
      { x: cx + 7, y: top + 16 },
      { x: cx + 13, y: top + 32 },
      { x: cx + 9, y: top + 38 },
      { x: cx, y: top + 36 },
      { x: cx - 9, y: top + 38 },
      { x: cx - 13, y: top + 32 },
    ];
    g.fillStyle(CAPE_OUT, 1);
    g.fillPoints(cape, true);
    g.fillStyle(CAPE, 1);
    g.fillPoints(
      [
        { x: cx - 6, y: top + 17 },
        { x: cx + 6, y: top + 17 },
        { x: cx + 11, y: top + 31 },
        { x: cx + 8, y: top + 36 },
        { x: cx, y: top + 34.5 },
        { x: cx - 8, y: top + 36 },
        { x: cx - 11, y: top + 31 },
      ],
      true,
    );
    // Single highlight rim on the player-facing edge.
    g.fillStyle(CAPE_HI, 0.55);
    g.fillEllipse(cx - 5, top + 24, 3, 10);

    // 2) HEM-STREAMERS — windblown triangles past the cape hem.
    g.fillStyle(CAPE_OUT, 1);
    g.fillTriangle(cx - 13, top + 32, cx - 10, top + 38, cx - 14, top + 41);
    g.fillTriangle(cx + 13, top + 32, cx + 10, top + 38, cx + 12, top + 42);
    g.fillTriangle(cx + 8, top + 36, cx + 6, top + 41, cx + 7, top + 43);

    // 3) BODY — steel breastplate, outline + flat fill + center seam.
    const body: Array<{ x: number; y: number }> = [
      { x: cx - 6, y: top + 18 },
      { x: cx + 6, y: top + 18 },
      { x: cx + 7, y: top + 30 },
      { x: cx + 7, y: top + 37 },
      { x: cx, y: top + 38.5 },
      { x: cx - 7, y: top + 37 },
      { x: cx - 7, y: top + 30 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(body, true);
    g.fillStyle(BODY, 1);
    g.fillPoints(
      [
        { x: cx - 5, y: top + 19 },
        { x: cx + 5, y: top + 19 },
        { x: cx + 6, y: top + 36 },
        { x: cx, y: top + 37 },
        { x: cx - 6, y: top + 36 },
      ],
      true,
    );
    // Pauldron cups — two outlined flat discs at the shoulders.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx - 6, top + 20, 3);
    g.fillCircle(cx + 6, top + 20, 3);
    g.fillStyle(BODY, 1);
    g.fillCircle(cx - 6, top + 20, 2);
    g.fillCircle(cx + 6, top + 20, 2);
    g.fillStyle(BODY_HI, 1);
    g.fillRect(cx - 7, top + 19, 1, 1);
    g.fillRect(cx + 5, top + 19, 1, 1);
    // Center seam + single chest highlight.
    g.fillStyle(BODY_SHADOW, 0.8);
    g.fillRect(cx, top + 21, 1, 13);
    g.fillStyle(BODY_HI, 0.6);
    g.fillEllipse(cx - 2, top + 24, 2, 5);

    // 4) BELT with gold buckle.
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(cx - 7, top + 30, 14, 4, 1.5);
    g.fillStyle(POMMEL, 1);
    g.fillRect(cx - 2, top + 31, 4, 2);

    // 5) BOOTS / GREAVES.
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx - 3, top + 42, 5, 3);
    g.fillEllipse(cx + 3, top + 42, 5, 3);
    g.fillStyle(BOOT, 1);
    g.fillEllipse(cx - 3, top + 41.5, 3.5, 2);
    g.fillEllipse(cx + 3, top + 41.5, 3.5, 2);

    // 6) HELM — angular silver knight's helm, outline + flat fill.
    const helm: Array<{ x: number; y: number }> = [
      { x: cx - 6, y: top - 1 },
      { x: cx + 6, y: top - 1 },
      { x: cx + 7, y: top + 13 },
      { x: cx + 4, y: top + 17 },
      { x: cx - 4, y: top + 17 },
      { x: cx - 7, y: top + 13 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(helm, true);
    g.fillStyle(HELM, 1);
    g.fillPoints(
      [
        { x: cx - 5, y: top + 0 },
        { x: cx + 5, y: top + 0 },
        { x: cx + 6, y: top + 13 },
        { x: cx + 3.5, y: top + 16 },
        { x: cx - 3.5, y: top + 16 },
        { x: cx - 6, y: top + 13 },
      ],
      true,
    );
    // Single polished highlight on the upper-left.
    g.fillStyle(HELM_HI, 1);
    g.fillEllipse(cx - 3, top + 3, 2, 4);

    // Visor slit — dark band with violet glow + two eye-glows.
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(cx - 5, top + 9, 10, 2.5, 1);
    g.fillStyle(VISOR_GLOW, 0.7);
    g.fillRect(cx - 4, top + 10, 8, 1);
    g.fillStyle(VISOR_GLOW, 1);
    g.fillRect(cx - 3, top + 10, 1, 1);
    g.fillRect(cx + 2, top + 10, 1, 1);

    // Helm trim band — gold strip at the chin seam.
    g.fillStyle(HELM_TRIM_HI, 1);
    g.fillRect(cx - 5, top + 14, 11, 1);

    // 7) ANGLED ONYX LONGSWORD — pommel + grip + gold crossguard + blade.
    // Pommel.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 2, top + 30, 2);
    g.fillStyle(POMMEL, 1);
    g.fillCircle(cx + 2, top + 30, 1.3);

    // Grip.
    g.fillStyle(OUT, 1);
    g.fillTriangle(cx + 1, top + 29, cx + 3, top + 30, cx + 5, top + 25);
    g.fillTriangle(cx + 5, top + 25, cx + 3, top + 30, cx + 6, top + 26);
    g.fillStyle(BOOT, 1);
    g.fillTriangle(cx + 1.7, top + 29.1, cx + 2.7, top + 29.7, cx + 4.9, top + 25.5);
    g.fillTriangle(cx + 4.9, top + 25.5, cx + 2.7, top + 29.7, cx + 5.5, top + 26.2);

    // Crossguard — gold bar.
    g.fillStyle(OUT, 1);
    g.fillTriangle(cx + 2, top + 22, cx + 4, top + 21, cx + 8, top + 27);
    g.fillTriangle(cx + 2, top + 22, cx + 8, top + 27, cx + 6, top + 28);
    g.fillStyle(POMMEL, 1);
    g.fillTriangle(cx + 2.8, top + 22.2, cx + 3.8, top + 21.6, cx + 7.2, top + 26.8);
    g.fillTriangle(cx + 2.8, top + 22.2, cx + 7.2, top + 26.8, cx + 6, top + 27.5);

    // Blade — onyx triangle, outline + flat fill + single glow highlight.
    g.fillStyle(BLADE_OUT, 1);
    g.fillTriangle(cx + 4, top + 21, cx + 8, top + 26, cx + 19, top + 6);
    g.fillStyle(BLADE, 1);
    g.fillTriangle(cx + 4.8, top + 21.6, cx + 7, top + 25.3, cx + 17.8, top + 7.2);
    g.fillStyle(BLADE_HI, 1);
    g.fillTriangle(cx + 4.4, top + 20.8, cx + 5.6, top + 21.6, cx + 18, top + 6.6);
    g.fillStyle(BLADE_GLOW, 0.35);
    g.fillTriangle(cx + 12, top + 13, cx + 14, top + 16, cx + 18, top + 7);

    // Gauntlet hand on the grip.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 4, top + 27, 2);
    g.fillStyle(BODY, 1);
    g.fillCircle(cx + 4, top + 27, 1.3);

    // 8) Ground shadow.
    g.fillStyle(SHADOW, 0.45);
    g.fillEllipse(cx, figBot, 14, 2);

    g.generateTexture(textureKey, size, size);
  }

  // ---------------------------------------------------------------------------
  // Magic Missile
  // ---------------------------------------------------------------------------

  /**
   * Magic missile — glowing violet orb. Layered halo + outline + bright core +
   * specular highlight. Sized to `MISSILE_RADIUS`'s frame (24×24).
   */
  private drawMagicMissileTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 24;
    const cx = size / 2;
    const cy = size / 2;

    g.clear();

    // FLAT-VECTOR — soft halo, bold outline ring, flat violet body, one
    // top-left highlight. Cleaner cartoon orb.
    g.fillStyle(0xc084fc, 0.22);
    g.fillCircle(cx, cy, cx);
    // Bold dark outline disc.
    g.fillStyle(0x2a0c4a, 1);
    g.fillCircle(cx, cy, cx - 3);
    // Flat violet body.
    g.fillStyle(0xa855f7, 1);
    g.fillCircle(cx, cy, cx - 5);
    // Single soft highlight (top-left).
    g.fillStyle(0xe9d5ff, 1);
    g.fillCircle(cx - 1.5, cy - 1.5, 2.4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx - 2.5, cy - 2.5, 1.2);

    g.generateTexture(TextureKeys.MagicMissile, size, size);
  }

  // ---------------------------------------------------------------------------
  // Spellblade Bolt (Spellblade-character projectile)
  // ---------------------------------------------------------------------------

  /**
   * Spellblade Bolt — a small spell-sword shape pointing along +x so the
   * sprite can be rotated per-cast to face the flight direction. Same
   * 24×24 frame as the Magic Missile so the shared pool's hitbox math
   * (`MISSILE_RADIUS` setCircle in MagicMissile.constructor) stays valid.
   * Drawn pure white — `missileTint` plus per-skin glow colour the blade.
   *
   * Layered: faint outer halo → mid violet body diamond → bright blade
   * silhouette (elongated diamond, sharp +x tip) → white-hot edge highlight
   * along the leading edge → small pommel circle at the trailing end.
   */
  private drawSpellbladeBoltTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 24;
    const cx = size / 2;
    const cy = size / 2;
    g.clear();

    // FLAT-VECTOR — faint halo, bold outline diamond, flat violet body, one
    // leading-edge highlight, pommel orb. Clean directional spell-sword.
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(cx, cy, size, size * 0.5);

    // Outline (dark) — elongated diamond along +x.
    const blade: Array<{ x: number; y: number }> = [
      { x: cx + 11, y: cy },     // tip (right)
      { x: cx + 2, y: cy - 3 },  // upper shoulder
      { x: cx - 6, y: cy - 1.5 },// upper hilt taper
      { x: cx - 9, y: cy },      // pommel point (left)
      { x: cx - 6, y: cy + 1.5 },// lower hilt taper
      { x: cx + 2, y: cy + 3 },  // lower shoulder
    ];
    g.fillStyle(0x2a0c4a, 1);
    g.fillPoints(blade, true);

    // Flat violet body — inset so the outline shows.
    g.fillStyle(0xa855f7, 1);
    g.fillPoints(
      [
        { x: cx + 9.5, y: cy },
        { x: cx + 2, y: cy - 2.2 },
        { x: cx - 5.3, y: cy - 1 },
        { x: cx - 7.8, y: cy },
        { x: cx - 5.3, y: cy + 1 },
        { x: cx + 2, y: cy + 2.2 },
      ],
      true,
    );

    // Single leading-edge highlight along the top edge to the tip.
    g.fillStyle(0xe9d5ff, 1);
    g.fillTriangle(cx + 9, cy, cx + 1, cy - 1.6, cx + 1, cy - 0.4);
    g.fillStyle(0xffffff, 0.95);
    g.fillTriangle(cx + 8, cy - 0.2, cx + 2, cy - 1.2, cx + 2, cy - 0.4);

    // Pommel orb at the trailing end.
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(cx - 9, cy, 1.4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx - 9, cy - 0.4, 0.6);

    g.generateTexture(TextureKeys.SpellbladeBolt, size, size);
  }

  // ---------------------------------------------------------------------------
  // Floor tiles (per theme)
  // ---------------------------------------------------------------------------

  /**
   * Floor variants per theme. Dark base + accent + dark sprinkles, deterministic
   * grass-tuft + sparkle scatter for the "magisch-leuchtend" feel. Theme-driven
   * via `FloorPalette`.
   */
  private drawFloorTextures(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { floorBase, floorAccent, ambient, glow } = theme.palette;
    for (let variant = 0; variant < FLOOR_TILE_VARIANTS; variant++) {
      const rng = new RNG(`${theme.id}-floor-${variant}`);
      g.clear();

      // FLAT-VECTOR — flat base tone + a few clean rounded grass tufts +
      // soft accent blobs. No dithered speckle noise.
      g.fillStyle(floorBase, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // A couple of soft flat accent patches (single tone, rounded).
      const patches = 2 + rng.intBetween(0, 1);
      g.fillStyle(floorAccent, 0.55);
      for (let i = 0; i < patches; i++) {
        const x = rng.intBetween(6, TILE_SIZE - 7);
        const y = rng.intBetween(6, TILE_SIZE - 7);
        g.fillCircle(x, y, rng.intBetween(2, 4));
      }

      // Clean rounded grass tufts: a small blade with a bright cap.
      const tufts = 1 + rng.intBetween(0, 2);
      for (let i = 0; i < tufts; i++) {
        const x = rng.intBetween(6, TILE_SIZE - 7);
        const y = rng.intBetween(8, TILE_SIZE - 7);
        g.fillStyle(ambient, 1);
        g.fillRoundedRect(x - 1, y - 4, 4, 6, 1.5);
        g.fillStyle(floorAccent, 1);
        g.fillRoundedRect(x, y - 4, 2, 5, 1);
        g.fillStyle(glow, 0.7);
        g.fillCircle(x + 1, y - 4, 1.2);
      }

      // Occasional glowing sparkle.
      if (rng.chance(0.5)) {
        g.fillStyle(glow, 0.7);
        g.fillCircle(
          rng.intBetween(6, TILE_SIZE - 7),
          rng.intBetween(6, TILE_SIZE - 7),
          1.4,
        );
      }

      // Faint tile border so adjacent tiles read as a grid.
      g.lineStyle(1, 0x000000, 0.18);
      g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

      g.generateTexture(floorTileKey(theme.id, variant), TILE_SIZE, TILE_SIZE);
    }
  }

  // ---------------------------------------------------------------------------
  // Wall (per theme)
  // ---------------------------------------------------------------------------

  /**
   * Wall tile per theme. Stone-brick layout with mortar lines, top highlight on
   * each brick, dark under-shadow, mossy palette accent + glowing crack.
   */
  private drawWallTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    g.clear();
    if (theme.decorationStyle === 'swamp') {
      this.drawSwampWallTexture(g, theme);
    } else if (theme.decorationStyle === 'mansion') {
      this.drawMansionWallTexture(g, theme);
    } else {
      this.drawForestWallTexture(g, theme);
    }
    g.generateTexture(wallTileKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  /**
   * Forest wall — vertical bark planks with dark gaps between them, knot
   * details, a mossy crown along the top edge with leaf silhouettes peeking
   * out, and a few firefly-style glow accents in the bark. Reads as "the
   * forest has closed in around you" rather than a stone keep wall.
   */
  private drawForestWallTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, wallHighlight, ambient, glow } = theme.palette;
    const rng = new RNG(`${theme.id}-wall`);

    // FLAT-VECTOR — flat bark planks separated by dark gaps, a flat moss
    // crown along the top, clean knots + a firefly. No groove noise.
    g.fillStyle(ambient, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Three flat bark planks with bold dark gaps + one left-edge highlight.
    const PLANK_W = 18;
    const GAP = 3;
    for (let i = 0; i < 3; i++) {
      const px = i * (PLANK_W + GAP) + GAP;
      g.fillStyle(0x0a0604, 1);
      g.fillRect(px - 1, 0, PLANK_W + 2, TILE_SIZE);
      g.fillStyle(wallBase, 1);
      g.fillRect(px, 0, PLANK_W, TILE_SIZE);
      // Single soft highlight strip on the left.
      g.fillStyle(wallHighlight, 0.85);
      g.fillRect(px + 1, 0, 2, TILE_SIZE);
      // One bark knot per plank (flat outlined disc).
      const ky = 18 + rng.intBetween(0, 26);
      g.fillStyle(0x0a0604, 1);
      g.fillCircle(px + PLANK_W / 2, ky, 2.4);
      g.fillStyle(wallBase, 1);
      g.fillCircle(px + PLANK_W / 2, ky, 1.2);
    }

    // Flat moss crown along the top — overlapping flat domes + leaf points.
    g.fillStyle(0x081210, 1);
    g.fillRect(0, 0, TILE_SIZE, 7);
    g.fillStyle(0x14361a, 1);
    g.fillEllipse(10, 4, 20, 9);
    g.fillEllipse(32, 5, 22, 10);
    g.fillEllipse(54, 4, 18, 9);
    g.fillStyle(0x2d6634, 1);
    g.fillEllipse(14, 3, 12, 4);
    g.fillEllipse(46, 3, 12, 4);
    g.fillStyle(0x14361a, 1);
    g.fillTriangle(20, 0, 24, 4, 16, 4);
    g.fillTriangle(44, 0, 48, 4, 40, 4);

    // One firefly glow accent.
    const fx = rng.intBetween(8, TILE_SIZE - 8);
    const fy = rng.intBetween(20, TILE_SIZE - 8);
    g.fillStyle(0x040a05, 1);
    g.fillCircle(fx, fy, 2.2);
    g.fillStyle(glow, 1);
    g.fillCircle(fx, fy, 1.3);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(fx, fy - 1, 1, 1);

    // Outer outline so wall tiles separate cleanly from the floor.
    g.lineStyle(2, 0x000000, 0.45);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  }

  /**
   * Swamp wall — tangled mangrove-root wall: dark woody vertical roots of
   * varying widths intertwined with each other, slime-green algae filling
   * the gaps between them, sapphire-glow nodes at root joints, a few
   * hanging algae strands. Reads as wet, organic, swallowed-by-the-bog.
   */
  private drawSwampWallTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, wallHighlight, ambient, glow } = theme.palette;
    const rng = new RNG(`${theme.id}-wall`);

    // FLAT-VECTOR — flat algae base, bold-outlined flat mangrove roots
    // (one body tone + one left highlight strip), cyan glow nodes.
    g.fillStyle(0x0c2420, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // 5-6 vertical roots, each a single outlined flat band.
    const rootCount = 5 + rng.intBetween(0, 1);
    const rootXs: number[] = [];
    for (let r = 0; r < rootCount; r++) {
      const baseX = Math.floor((TILE_SIZE / rootCount) * r) + rng.intBetween(0, 4);
      rootXs.push(baseX);
      const width = 7 + rng.intBetween(0, 3);
      // Bold dark outline
      g.fillStyle(0x040408, 1);
      g.fillRect(baseX - 1, 0, width + 2, TILE_SIZE);
      // Flat woody body
      g.fillStyle(wallBase, 1);
      g.fillRect(baseX, 0, width, TILE_SIZE);
      // Single left highlight strip
      g.fillStyle(wallHighlight, 1);
      g.fillRect(baseX + 1, 0, 2, TILE_SIZE);
    }

    // A couple of thin teal algae threads draping across.
    g.lineStyle(1, 0x2c7060, 0.8);
    for (let a = 0; a < 2; a++) {
      const ay = 16 + rng.intBetween(0, TILE_SIZE - 32);
      g.beginPath();
      g.moveTo(0, ay);
      let lx = 0;
      let ly = ay;
      for (let s = 0; s < 8; s++) {
        lx += 8;
        ly += rng.intBetween(-2, 2);
        g.lineTo(lx, ly);
      }
      g.strokePath();
    }

    // Cyan glow nodes at root joints.
    const nodes = 2 + rng.intBetween(0, 2);
    for (let n = 0; n < nodes; n++) {
      const rx = rootXs[rng.intBetween(0, rootXs.length - 1)] + 3;
      const ry = 8 + rng.intBetween(0, 5) * 8;
      g.fillStyle(0x040408, 1);
      g.fillCircle(rx, ry, 2.4);
      g.fillStyle(glow, 1);
      g.fillCircle(rx, ry, 1.4);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(rx - 0.5, ry - 0.5, 0.6);
    }

    // Subtle ambient overlay so palette tints any flat areas.
    g.fillStyle(ambient, 0.16);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Outer outline so wall tiles separate cleanly from the floor.
    g.lineStyle(2, 0x000000, 0.5);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  }

  /**
   * Mansion wall — gothic stone-brick courses with gold molding + a candle
   * sconce inset every other tile. Reads as "ornate ballroom wall by
   * candlelight" rather than dungeon brick. Single tile is tilable: brick
   * courses align horizontally so a wall ring reads as one continuous wall.
   */
  private drawMansionWallTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, wallHighlight, ambient, glow } = theme.palette;
    const rng = new RNG(`${theme.id}-wall`);

    // Background mortar
    g.fillStyle(0x040208, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(ambient, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // FLAT-VECTOR — 4 courses of bricks, each a single flat body tone with
    // one top highlight strip; bold dark mortar gaps, no dithering speckle.
    const courseH = 16;
    const brickW = 22;
    for (let row = 0; row < 4; row++) {
      const offset = (row % 2) * (brickW / 2);
      const y = row * courseH;
      for (let bx = -brickW; bx < TILE_SIZE + brickW; bx += brickW) {
        const x = bx + offset;
        // Bold dark mortar gap
        g.fillStyle(0x040208, 1);
        g.fillRect(x, y, brickW, courseH);
        // Flat brick body
        g.fillStyle(wallBase, 1);
        g.fillRect(x + 1, y + 1, brickW - 2, courseH - 2);
        // Single top highlight strip
        g.fillStyle(wallHighlight, 1);
        g.fillRect(x + 1, y + 1, brickW - 2, 2);
      }
    }

    // Gold molding strip — runs across the center horizontally.
    const moldY = 30;
    g.fillStyle(0x402030, 1);
    g.fillRect(0, moldY, TILE_SIZE, 4);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(0, moldY + 1, TILE_SIZE, 2);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(0, moldY + 1, TILE_SIZE, 1);
    // Tally marks on the molding
    g.fillStyle(0xffd84a, 1);
    for (let mx = 4; mx < TILE_SIZE; mx += 8) {
      g.fillRect(mx, moldY + 2, 2, 1);
    }

    // Candle sconce — a small bracket with a flame, placed on a deterministic
    // horizontal slot. Visual interest without breaking tilability since it
    // sits inside a single tile (no wraparound).
    const sconceX = 30 + rng.intBetween(-4, 4);
    const sconceY = 44;
    // Bracket
    g.fillStyle(0x040208, 1);
    g.fillRect(sconceX - 4, sconceY - 1, 9, 5);
    g.fillStyle(0x402030, 1);
    g.fillRect(sconceX - 3, sconceY, 7, 3);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(sconceX - 2, sconceY, 5, 1);
    // Candle stub
    g.fillStyle(0xfff8c0, 1);
    g.fillRect(sconceX, sconceY - 5, 2, 4);
    g.fillStyle(0xc0c0a0, 1);
    g.fillRect(sconceX + 1, sconceY - 5, 1, 4);
    // Flame
    g.fillStyle(0xffd84a, 1);
    g.fillTriangle(sconceX + 1, sconceY - 11, sconceX - 1, sconceY - 5, sconceX + 3, sconceY - 5);
    g.fillStyle(0xfff8a0, 1);
    g.fillRect(sconceX + 1, sconceY - 9, 1, 3);
    // Flame halo
    g.fillStyle(0xffd84a, 0.18);
    g.fillCircle(sconceX + 1, sconceY - 8, 9);
    g.fillStyle(0xfff8a0, 0.20);
    g.fillCircle(sconceX + 1, sconceY - 8, 5);

    // Sparse amethyst-glow cracks — tiny purple sparkle in mortar gaps.
    const cracks = 1 + rng.intBetween(0, 1);
    for (let c = 0; c < cracks; c++) {
      const cx = rng.intBetween(8, TILE_SIZE - 8);
      const cy = rng.intBetween(8, TILE_SIZE - 8);
      g.fillStyle(0x040208, 1);
      g.fillCircle(cx, cy, 2);
      g.fillStyle(glow, 1);
      g.fillCircle(cx, cy, 1.2);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(cx, cy - 1, 1, 1);
    }

    // Outer outline so wall tiles separate cleanly from the floor.
    g.lineStyle(2, 0x000000, 0.5);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  }

  /**
   * Candelabrum — replaces the forest tree on mansion floors. Iron stand
   * with three candle arms, three lit candles at the top, gold-trim base,
   * a soft amber halo + ground shadow. Drawn into a `TILE_SIZE × TILE_SIZE`
   * canvas centered on its base so the consumer can drop it where a tree
   * would have gone.
   */
  private drawCandelabrumTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    g.clear();
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2 + 14;

    // Ground shadow
    this.groundShadow(g, cx, cy + 10, 14, 5, 0.4);
    // Amber halo
    g.fillStyle(0xffd84a, 0.16);
    g.fillEllipse(cx, cy - 6, 38, 30);
    g.fillStyle(0xfff8a0, 0.22);
    g.fillEllipse(cx, cy - 6, 22, 16);

    // Base — gold-trimmed iron pedestal
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 11, cy + 4, 22, 7);
    g.fillStyle(0x261438, 1);
    g.fillRect(cx - 10, cy + 5, 20, 5);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 8, cy + 4, 16, 1);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 8, cy + 4, 16, 1);
    g.fillStyle(0x180828, 1);
    g.fillRect(cx - 10, cy + 9, 20, 1);

    // Stem
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 2, cy - 22, 4, 27);
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 1, cy - 22, 2, 27);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 1, cy - 22, 1, 27);

    // Cross-arms — horizontal bar at the top, with hooked ends
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 14, cy - 22, 28, 2);
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 13, cy - 22, 26, 1);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 13, cy - 22, 26, 1);
    // Arm hooks (small upright stubs at each end + center)
    for (const ax of [cx - 13, cx, cx + 13]) {
      g.fillStyle(0x040208, 1);
      g.fillRect(ax - 1, cy - 26, 3, 4);
      g.fillStyle(0x402030, 1);
      g.fillRect(ax, cy - 26, 1, 4);
    }

    // 3 candles
    for (const px of [cx - 12, cx, cx + 12]) {
      // Wax body
      g.fillStyle(0xfff8c0, 1);
      g.fillRect(px - 1, cy - 32, 3, 6);
      g.fillStyle(0xc0c0a0, 1);
      g.fillRect(px + 1, cy - 32, 1, 6);
      // Wick
      g.fillStyle(0x040208, 1);
      g.fillRect(px, cy - 33, 1, 1);
      // Flame
      g.fillStyle(0xffd84a, 1);
      g.fillTriangle(px, cy - 40, px - 2, cy - 33, px + 2, cy - 33);
      g.fillStyle(0xfff8a0, 1);
      g.fillRect(px, cy - 38, 1, 4);
      // Bright tip
      g.fillStyle(0xffffff, 1);
      g.fillRect(px, cy - 37, 1, 1);
    }

    g.generateTexture(treeDecoKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  /**
   * Cracked vase — replaces the forest rock on mansion floors. Tall purple
   * ceramic with gold rim and visible vertical crack, with a faint amethyst
   * glow leaking from the crack. Floor decoration only — no hitbox.
   */
  private drawCrackedVaseTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { glow } = theme.palette;
    g.clear();
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2 + 4;

    // Ground shadow
    this.groundShadow(g, cx, cy + 16, 18, 6, 0.4);

    // Amethyst halo (subtle — leaks from the crack)
    g.fillStyle(glow, 0.10);
    g.fillEllipse(cx, cy + 4, 36, 30);
    g.fillStyle(glow, 0.18);
    g.fillEllipse(cx, cy + 4, 22, 18);

    // Vase silhouette — outline first
    g.fillStyle(0x040208, 1);
    g.fillEllipse(cx, cy, 22, 30);
    // Rim flair (slight bulge at top)
    g.fillEllipse(cx, cy - 14, 16, 6);
    // Base ring
    g.fillRect(cx - 11, cy + 14, 22, 4);

    // Body — flat purple ceramic + one soft top-left highlight
    g.fillStyle(0x33184c, 1);
    g.fillEllipse(cx, cy, 18, 26);
    g.fillStyle(0x4a2470, 1);
    g.fillEllipse(cx - 4, cy - 6, 6, 12);

    // Rim
    g.fillStyle(0x261438, 1);
    g.fillEllipse(cx, cy - 14, 14, 5);
    // Gold rim trim
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 7, cy - 14, 14, 1);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 7, cy - 15, 14, 1);

    // Base ring with gold trim
    g.fillStyle(0x180828, 1);
    g.fillRect(cx - 10, cy + 14, 20, 3);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 10, cy + 14, 20, 1);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 10, cy + 14, 20, 1);

    // Crack — jagged dark line down the body
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 1, cy - 10, 1, 4);
    g.fillRect(cx, cy - 6, 1, 4);
    g.fillRect(cx - 1, cy - 2, 1, 4);
    g.fillRect(cx, cy + 2, 1, 4);
    g.fillRect(cx - 1, cy + 6, 1, 4);
    // Glow leaking through the crack
    g.fillStyle(glow, 0.85);
    g.fillRect(cx - 1, cy - 4, 1, 1);
    g.fillRect(cx, cy + 1, 1, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx, cy - 3, 1, 1);

    // Small chip missing from the rim (top-right)
    g.fillStyle(0x040208, 1);
    g.fillTriangle(cx + 4, cy - 16, cx + 8, cy - 14, cx + 5, cy - 12);

    g.generateTexture(rockDecoKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  // ---------------------------------------------------------------------------
  // Boss door (per theme)
  // ---------------------------------------------------------------------------

  /**
   * Boss door tile — heavy stone frame with magenta + gold ornament so it
   * reads as "this leads somewhere bad". Stays palette-aware (frame uses
   * `wallBase` / `ambient`) so it sits naturally in any floor.
   */
  private drawBossDoorTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, ambient } = theme.palette;
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2;

    g.clear();

    // FLAT-VECTOR — flat stone frame with a bold inner outline, flat gold
    // corner studs, magenta sigil glow + clean skull.
    g.fillStyle(0x1a0a14, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x000000, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(wallBase, 1);
    g.fillRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    g.fillStyle(ambient, 1);
    g.fillRect(7, 7, TILE_SIZE - 14, TILE_SIZE - 14);

    // Gold corner studs (flat disc + highlight).
    const stud = (sx: number, sy: number): void => {
      g.fillStyle(0x000000, 1);
      g.fillCircle(sx, sy, 2.6);
      g.fillStyle(0xffd84a, 1);
      g.fillCircle(sx, sy, 1.8);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(sx - 1, sy - 1, 1, 1);
    };
    stud(6, 6);
    stud(TILE_SIZE - 6, 6);
    stud(6, TILE_SIZE - 6);
    stud(TILE_SIZE - 6, TILE_SIZE - 6);

    // Magenta sigil glow + dark socket.
    g.fillStyle(0xff44aa, 0.4);
    g.fillCircle(cx, cy, 16);
    g.fillStyle(0xff44aa, 0.8);
    g.fillCircle(cx, cy, 12);
    g.fillStyle(0x14040a, 1);
    g.fillCircle(cx, cy, 9);

    // Clean skull — rounded cranium + jaw, outlined eye sockets, glow pupils.
    g.fillStyle(0xe0d0d8, 1);
    g.fillCircle(cx, cy - 1, 6);
    g.fillRoundedRect(cx - 4, cy + 2, 8, 4, 1.5);
    g.fillStyle(0x14040a, 1);
    g.fillCircle(cx - 3, cy - 1, 1.6);
    g.fillCircle(cx + 3, cy - 1, 1.6);
    g.fillStyle(0xff44aa, 1);
    g.fillRect(cx - 3, cy - 1, 1, 1);
    g.fillRect(cx + 3, cy - 1, 1, 1);
    g.fillStyle(0x14040a, 1);
    g.fillRect(cx - 0.5, cy + 3, 1.5, 2);

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(bossDoorKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  /**
   * Normal-room door — same chiseled stone frame as the special doors, but
   * the inset is a plain wooden plank panel with iron straps and a small
   * iron handle. No corner studs (those are reserved for special rooms) so
   * the player can read at a glance "ordinary door, just walk through when
   * the room is cleared".
   */
  private drawNormalDoorTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, ambient } = theme.palette;
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2;

    g.clear();

    // FLAT-VECTOR — flat stone frame with a bold inner outline, flat wooden
    // plank panel with clean seams + two iron straps + a handle ring.
    g.fillStyle(0x14080a, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x000000, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(wallBase, 1);
    g.fillRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    g.fillStyle(ambient, 1);
    g.fillRect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12);

    // Wooden plank panel — bold outline + flat wood fill.
    const woodLeft = 8;
    const woodTop = 8;
    const woodRight = TILE_SIZE - 8;
    const woodBottom = TILE_SIZE - 8;
    const woodW = woodRight - woodLeft;
    const woodH = woodBottom - woodTop;
    g.fillStyle(0x1a0e06, 1);
    g.fillRect(woodLeft - 1, woodTop - 1, woodW + 2, woodH + 2);
    g.fillStyle(0x6a3e1e, 1);
    g.fillRect(woodLeft, woodTop, woodW, woodH);

    // Clean vertical plank seams.
    g.fillStyle(0x2e1a0a, 1);
    g.fillRect(woodLeft + Math.floor(woodW / 3), woodTop, 1.5, woodH);
    g.fillRect(woodLeft + Math.floor((woodW * 2) / 3), woodTop, 1.5, woodH);

    // Two flat iron straps + a rivet at each end.
    const strapH = 5;
    const drawStrap = (sy: number): void => {
      g.fillStyle(0x14141c, 1);
      g.fillRect(woodLeft, sy, woodW, strapH);
      g.fillStyle(0x3a3a44, 1);
      g.fillRect(woodLeft, sy + 1, woodW, 1.5);
      g.fillStyle(0x7a7a84, 1);
      g.fillCircle(woodLeft + 3, sy + strapH / 2, 1.2);
      g.fillCircle(woodRight - 3, sy + strapH / 2, 1.2);
    };
    drawStrap(woodTop + 5);
    drawStrap(woodBottom - 5 - strapH);

    // Iron handle ring on the right, between the straps.
    const handleX = cx + 10;
    g.fillStyle(0x080808, 1);
    g.fillCircle(handleX, cy, 4);
    g.fillStyle(0x3a3a44, 1);
    g.fillCircle(handleX, cy, 3);
    g.fillStyle(0x6a3e1e, 1);
    g.fillCircle(handleX, cy, 1.3);

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(normalDoorKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  /**
   * Treasure door — chiseled stone frame with a golden treasure chest as the
   * center sigil so the player reads "item room beyond" at a glance, even
   * during combat. When `locked`, an iron lock plate with a keyhole is
   * stamped over the lower part of the door — that's the visual cue from
   * floor 2 onwards that this door consumes a key.
   */
  private drawTreasureDoorTexture(
    g: Phaser.GameObjects.Graphics,
    theme: FloorTheme,
    locked: boolean,
  ): void {
    const { wallBase, ambient } = theme.palette;
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2;

    g.clear();

    // FLAT-VECTOR — flat stone frame + bold inner outline, gold halo, a
    // clean flat treasure chest with gold trim + clasp.
    g.fillStyle(0x140e08, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x000000, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(wallBase, 1);
    g.fillRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    g.fillStyle(ambient, 1);
    g.fillRect(7, 7, TILE_SIZE - 14, TILE_SIZE - 14);

    // Gold corner studs.
    const stud = (sx: number, sy: number): void => {
      g.fillStyle(0x000000, 1);
      g.fillCircle(sx, sy, 2.6);
      g.fillStyle(0xffd84a, 1);
      g.fillCircle(sx, sy, 1.8);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(sx - 1, sy - 1, 1, 1);
    };
    stud(6, 6);
    stud(TILE_SIZE - 6, 6);
    stud(6, TILE_SIZE - 6);
    stud(TILE_SIZE - 6, TILE_SIZE - 6);

    // Gold halo behind the chest.
    g.fillStyle(0xffd84a, 0.22);
    g.fillCircle(cx, cy, 15);

    // Treasure chest — bold outline + flat wood body + flat lid + gold trim.
    const chestLeft = cx - 12;
    const chestTop = cy - 9;
    const chestW = 24;
    const chestH = 19;
    const lidH = 7;
    g.fillStyle(0x080404, 1);
    g.fillRoundedRect(chestLeft - 1, chestTop - 1, chestW + 2, chestH + 2, 2);
    g.fillStyle(0x6a3e1e, 1);
    g.fillRect(chestLeft, chestTop + lidH, chestW, chestH - lidH);
    g.fillStyle(0x8a5a2e, 1);
    g.fillRoundedRect(chestLeft, chestTop, chestW, lidH + 1, 2);
    // Lid seam + gold trim bands.
    g.fillStyle(0xffd84a, 1);
    g.fillRect(chestLeft, chestTop + lidH, chestW, 1.5);
    g.fillRect(chestLeft, chestTop, 2, chestH);
    g.fillRect(chestLeft + chestW - 2, chestTop, 2, chestH);
    // Front clasp.
    g.fillStyle(0x080404, 1);
    g.fillRect(cx - 3, chestTop + lidH - 2, 6, 6);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 2, chestTop + lidH - 1, 4, 4);
    g.fillStyle(0xfff0a0, 1);
    g.fillRect(cx - 2, chestTop + lidH - 1, 1, 1);

    if (locked) {
      this.drawLockBadge(g);
    }

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(
      locked ? treasureDoorLockedKey(theme.id) : treasureDoorKey(theme.id),
      TILE_SIZE,
      TILE_SIZE,
    );
  }

  /**
   * Iron lock plate with a keyhole, stamped over the lower portion of a
   * special-room door to communicate "key required". Reused by both the
   * locked treasure and locked shop doors so the visual language stays
   * consistent.
   */
  private drawLockBadge(g: Phaser.GameObjects.Graphics): void {
    const cx = TILE_SIZE / 2;
    const plateW = 16;
    const plateH = 13;
    const plateLeft = cx - plateW / 2; // 24
    const plateTop = TILE_SIZE - 18; // 46

    // FLAT-VECTOR — bold outline plate + flat iron face + one highlight +
    // rivets + bold keyhole.
    g.fillStyle(0x080404, 1);
    g.fillRoundedRect(plateLeft, plateTop, plateW, plateH, 2);
    g.fillStyle(0x363842, 1);
    g.fillRoundedRect(plateLeft + 1.5, plateTop + 1.5, plateW - 3, plateH - 3, 1.5);
    g.fillStyle(0x5a5a64, 1);
    g.fillRect(plateLeft + 2, plateTop + 2, plateW - 4, 1.5);
    g.fillStyle(0x7a7a84, 1);
    g.fillCircle(plateLeft + 3, plateTop + 3, 0.9);
    g.fillCircle(plateLeft + plateW - 3, plateTop + 3, 0.9);

    // Keyhole — bold black circle + tail, centered on the plate.
    const khCx = cx;
    const khCy = plateTop + 5;
    g.fillStyle(0x000000, 1);
    g.fillCircle(khCx, khCy, 2.2);
    g.fillRect(khCx - 1, khCy + 1, 2, 5);
  }

  /**
   * Shop door — wooden brown accents on the chiseled stone frame, with a
   * stylised gold coin in the center (concentric circles + a "$" mark) so
   * the player reads "store / merchant" at a glance. When `locked`, the
   * iron keyhole plate is stamped over the lower part to signal "consumes a
   * key" from floor 2 onwards.
   */
  private drawShopDoorTexture(
    g: Phaser.GameObjects.Graphics,
    theme: FloorTheme,
    locked: boolean,
  ): void {
    const { wallBase, ambient } = theme.palette;
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2;

    g.clear();

    // FLAT-VECTOR — flat warm wooden inset in a stone frame + bold inner
    // outline, gold studs, a clean flat gold coin with tally marks.
    g.fillStyle(0x1a0e06, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x000000, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(wallBase, 1);
    g.fillRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    g.fillStyle(0x4a2e1a, 1);
    g.fillRect(7, 7, TILE_SIZE - 14, TILE_SIZE - 14);
    g.fillStyle(ambient, 0.5);
    g.fillRect(9, 9, TILE_SIZE - 18, TILE_SIZE - 18);

    // Gold corner studs.
    const stud = (sx: number, sy: number): void => {
      g.fillStyle(0x000000, 1);
      g.fillCircle(sx, sy, 2.6);
      g.fillStyle(0xffd84a, 1);
      g.fillCircle(sx, sy, 1.8);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(sx - 1, sy - 1, 1, 1);
    };
    stud(6, 6);
    stud(TILE_SIZE - 6, 6);
    stud(6, TILE_SIZE - 6);
    stud(TILE_SIZE - 6, TILE_SIZE - 6);

    // Gold coin halo.
    g.fillStyle(0xffd84a, 0.22);
    g.fillCircle(cx, cy, 14);

    // Coin disc — bold outline + flat gold + one highlight + tally marks.
    g.fillStyle(0x080404, 1);
    g.fillCircle(cx, cy, 11);
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx, cy, 9);
    g.fillStyle(0xfff0a0, 0.8);
    g.fillCircle(cx - 3, cy - 3, 2.5);
    const dark = 0x14080a;
    g.fillStyle(dark, 1);
    g.fillRect(cx - 3, cy - 1, 6, 1.2);
    g.fillRect(cx - 3, cy + 1.5, 6, 1.2);
    g.fillRect(cx - 3, cy + 4, 4, 1.2);

    if (locked) {
      this.drawLockBadge(g);
    }

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(
      locked ? shopDoorLockedKey(theme.id) : shopDoorKey(theme.id),
      TILE_SIZE,
      TILE_SIZE,
    );
  }

  // ---------------------------------------------------------------------------
  // Mushroom decoration (per theme)
  // ---------------------------------------------------------------------------

  /**
   * Glowing mushroom decoration — cap with dark rim + bright top + spots, stem
   * with highlight, ground shadow and palette-tinted glow halo underneath.
   */
  private drawMushroomTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 20;
    const h = 20;
    const cx = w / 2;
    const { glow, ambient } = theme.palette;

    g.clear();

    // Ground shadow
    this.groundShadow(g, cx, h - 3, 4, 1, 0.5);

    // FLAT-VECTOR — soft glow halo, outlined flat stem, outlined flat
    // domed cap with one highlight + white spots.
    g.fillStyle(glow, 0.3);
    g.fillCircle(cx, 11, 8);

    // Stem — outlined flat capsule.
    g.fillStyle(ambient, 1);
    g.fillRoundedRect(cx - 2, 10, 4, 7, 1.5);
    g.fillStyle(0xe8e2d2, 1);
    g.fillRoundedRect(cx - 1, 10, 2, 6, 1);

    // Cap — bold outline dome + flat glow fill.
    g.fillStyle(ambient, 1);
    g.fillEllipse(cx, 8, 12, 7);
    g.fillStyle(glow, 1);
    g.fillEllipse(cx, 8, 10, 5.5);
    // Single highlight (top-left).
    g.fillStyle(0xa0ffc0, 1);
    g.fillEllipse(cx - 2, 6.5, 3, 1.6);
    // White spots.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 1, 8, 1);
    g.fillCircle(cx + 2.5, 8.5, 0.9);

    g.generateTexture(mushroomDecoKey(theme.id), w, h);
  }

  // ---------------------------------------------------------------------------
  // Rock decoration (per theme)
  // ---------------------------------------------------------------------------

  /**
   * Rock — multi-tone stone with darker rim and lighter top, palette-coloured
   * moss patches, and a strong ground shadow. Acts as a solid obstacle in
   * `Room` (collides with player + missiles).
   */
  private drawRockTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 36;
    const h = 28;
    const cx = w / 2;
    const cy = h / 2 + 1;
    const { glow } = theme.palette;

    g.clear();

    // Drop shadow underneath
    this.groundShadow(g, cx, cy + 7, w / 2 - 2, 3, 0.5);

    // FLAT-VECTOR — asymmetric boulder (main body + side lump) as a bold
    // outline + single flat stone tone + one top-left highlight, a flat
    // moss cap, and the signature emerald crystal cluster on the crown.
    g.fillStyle(0x06070a, 1);
    g.fillEllipse(cx - 1, cy + 1, 30, 18);
    g.fillEllipse(cx + 9, cy + 3, 14, 10);
    g.fillStyle(0x4a463e, 1);
    g.fillEllipse(cx - 1, cy + 1, 27, 15);
    g.fillEllipse(cx + 9, cy + 3, 11, 7);
    // Single top-left highlight.
    g.fillStyle(0x827a6a, 1);
    g.fillEllipse(cx - 5, cy - 3, 11, 4);

    // Moss cap — flat outline + single green fill draped over the crown.
    g.fillStyle(0x12281a, 1);
    g.fillEllipse(cx - 2, cy - 3, 22, 7);
    g.fillStyle(0x2d6634, 1);
    g.fillEllipse(cx - 2, cy - 4, 18, 5);
    // Drip tendrils.
    g.fillStyle(0x1f4a26, 1);
    g.fillRect(cx - 8, cy - 2, 1.5, 3);
    g.fillRect(cx + 5, cy - 1, 1.5, 4);

    // Emerald crystal cluster on the crown — flat glow shards.
    const crystal = (sx: number, sy: number, hy: number): void => {
      g.fillStyle(0x040c08, 1);
      g.fillTriangle(sx - 1.8, sy + hy, sx + 1.8, sy + hy, sx, sy - hy);
      g.fillStyle(glow, 1);
      g.fillTriangle(sx - 1, sy + hy - 1, sx + 1, sy + hy - 1, sx, sy - hy + 1);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(sx, sy - hy + 2, 1, Math.max(1, hy - 2));
    };
    crystal(cx - 2, cy - 6, 4);
    crystal(cx + 1, cy - 5, 3);
    crystal(cx - 5, cy - 5, 2);

    // Glow node accent on the side lump.
    g.fillStyle(0x040c08, 1);
    g.fillCircle(cx + 11, cy + 1, 1.8);
    g.fillStyle(glow, 1);
    g.fillCircle(cx + 11, cy + 1, 1.2);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(cx + 11, cy, 1, 1);

    g.generateTexture(rockDecoKey(theme.id), w, h);
  }

  // ---------------------------------------------------------------------------
  // Tree decoration (per theme)
  // ---------------------------------------------------------------------------

  /**
   * Small tree decoration — dark trunk with bark lines, two-tone foliage with
   * highlight on top-left, palette-glow accent berries, ground shadow.
   * Decorative only (no physics body in Room).
   */
  private drawTreeTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 32;
    const h = 44;
    const cx = w / 2;
    const { glow, ambient } = theme.palette;

    g.clear();

    // FLAT-VECTOR — outlined tapered trunk + a flat rounded foliage crown
    // with one soft highlight + leaf points + glow berries.
    this.groundShadow(g, cx, h - 2, 10, 3, 0.5);

    // Trunk — outlined tapered rectangle, flat fill.
    g.fillStyle(0x100a06, 1);
    g.fillTriangle(cx - 5, 43, cx + 5, 43, cx + 4, 24);
    g.fillTriangle(cx - 5, 43, cx - 4, 24, cx + 4, 24);
    g.fillStyle(0x3a2818, 1);
    g.fillTriangle(cx - 3.5, 42, cx + 3.5, 42, cx + 2.5, 25);
    g.fillTriangle(cx - 3.5, 42, cx - 2.5, 25, cx + 2.5, 25);
    // Single bark highlight strip on the left.
    g.fillStyle(0x5a3e22, 1);
    g.fillRect(cx - 3, 27, 1.5, 13);

    // Foliage crown — bold outline silhouette, then a single flat green fill.
    g.fillStyle(0x040a05, 1);
    g.fillEllipse(cx, 17, 30, 26);
    g.fillEllipse(cx - 9, 12, 17, 17);
    g.fillEllipse(cx + 9, 12, 17, 17);
    g.fillEllipse(cx, 6, 15, 13);
    g.fillStyle(0x2d6634, 1);
    g.fillEllipse(cx, 17, 27, 23);
    g.fillEllipse(cx - 8, 12, 14, 14);
    g.fillEllipse(cx + 8, 12, 14, 14);
    g.fillEllipse(cx, 6, 12, 11);

    // Single soft highlight (top-left).
    g.fillStyle(0x4ea656, 1);
    g.fillEllipse(cx - 5, 9, 8, 5);

    // Leaf points poking out so it reads as foliage, not a blob.
    g.fillStyle(0x2d6634, 1);
    g.fillTriangle(cx + 12, 14, cx + 16, 12, cx + 14, 17);
    g.fillTriangle(cx - 13, 16, cx - 16, 14, cx - 14, 19);
    g.fillTriangle(cx + 2, 1, cx + 5, 5, cx, 5);

    // Glow berries in the floor palette.
    const glowAccent = (sx: number, sy: number, r: number): void => {
      g.fillStyle(0x040a05, 1);
      g.fillCircle(sx, sy, r + 0.9);
      g.fillStyle(glow, 1);
      g.fillCircle(sx, sy, r);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(sx, sy - 1, 1, 1);
    };
    glowAccent(cx + 6, 10, 1.5);
    glowAccent(cx - 8, 17, 1.3);

    // Inner shadow at bottom of foliage so trunk reads as separate.
    g.fillStyle(ambient, 0.5);
    g.fillEllipse(cx, 23, 20, 5);

    g.generateTexture(treeDecoKey(theme.id), w, h);
  }

  // ---------------------------------------------------------------------------
  // Lily Pad decoration (swamp-style replacement for tree)
  // ---------------------------------------------------------------------------

  /**
   * Top-down lily pad — flat oval body with radial veins, a small
   * pink-white bloom growing out one side, and a couple of sapphire-glow
   * water droplets. Sits on the same `treeDecoKey(theme.id)` slot the
   * forest tree uses, so swamp floors can reuse the existing scatter logic.
   */
  private drawLilyPadTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 36;
    const h = 32;
    const cx = w / 2;
    const cy = h / 2 + 2; // body sits slightly low so the bloom has room on top
    const { glow } = theme.palette;

    g.clear();

    // Soft shadow underneath the pad
    this.groundShadow(g, cx, cy + 5, 14, 3, 0.4);

    // FLAT-VECTOR — bold dark outline ellipse, one flat teal body tone,
    // one soft top-left highlight.
    g.fillStyle(0x040c10, 1);
    g.fillEllipse(cx, cy, 30, 16);
    g.fillStyle(0x2c8068, 1);
    g.fillEllipse(cx, cy, 27, 13);
    g.fillStyle(0x58b87a, 1);
    g.fillEllipse(cx - 5, cy - 3, 12, 4);

    // Radial dark veins from the center (fanning outward).
    g.lineStyle(1, 0x0a1820, 0.85);
    const veinAngles = [
      Math.PI * 0.15,
      Math.PI * 0.5,
      Math.PI * 0.85,
      -Math.PI * 0.15,
      -Math.PI * 0.5,
      -Math.PI * 0.85,
    ];
    for (const a of veinAngles) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 6);
      g.strokePath();
    }

    // Lily bloom on top — small white-pink rosette with yellow center.
    const bloomY = cy - 7;
    g.fillStyle(0x081020, 1); // outline
    g.fillCircle(cx, bloomY, 5);
    // Petals — 4 directional + 4 diagonal, two-tone
    const petal = (sx: number, sy: number, color: number): void => {
      g.fillStyle(color, 1);
      g.fillCircle(sx, sy, 1.8);
    };
    petal(cx, bloomY - 3, 0xffffff);
    petal(cx + 3, bloomY, 0xffffff);
    petal(cx, bloomY + 3, 0xffffff);
    petal(cx - 3, bloomY, 0xffffff);
    petal(cx + 2, bloomY - 2, 0xffd0e0);
    petal(cx - 2, bloomY - 2, 0xffd0e0);
    petal(cx + 2, bloomY + 2, 0xffd0e0);
    petal(cx - 2, bloomY + 2, 0xffd0e0);
    // Yellow stamen center + sparkle
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx, bloomY, 1.4);
    g.fillStyle(0xfff8a0, 1);
    g.fillRect(cx, bloomY - 1, 1, 1);

    // Sapphire glow droplets — small beads of water on the pad surface.
    g.fillStyle(glow, 0.95);
    g.fillCircle(cx + 8, cy + 1, 1.2);
    g.fillCircle(cx - 7, cy + 2, 1.0);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(cx + 8, cy, 1, 1);

    g.generateTexture(treeDecoKey(theme.id), w, h);
  }

  // ---------------------------------------------------------------------------
  // Mangrove Root decoration (swamp-style replacement for rock)
  // ---------------------------------------------------------------------------

  /**
   * Tangled mangrove-root / liana cluster — three thick curved root bands
   * radiating from a central knot, with sapphire-glow nodes at the bends
   * and a couple of algae strands draped between them. Sits on the
   * `rockDecoKey(theme.id)` slot.
   */
  private drawMangroveRootTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 36;
    const h = 28;
    const cx = w / 2;
    const cy = h / 2 + 1;
    const { glow } = theme.palette;

    g.clear();

    // Drop shadow underneath
    this.groundShadow(g, cx, cy + 5, w / 2 - 2, 2.5, 0.5);

    // Root bands — drawn as overlapping rotated thick capsules. Each is
    // outline + dark fill + lighter highlight on top.
    const drawRoot = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      thickness: number,
    ): void => {
      // Outline
      g.lineStyle(thickness + 2, 0x0a0a0a, 1);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();
      // Body (dark woody brown)
      g.lineStyle(thickness, 0x2a1a0e, 1);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokePath();
      // Highlight strip (lighter brown — top side)
      g.lineStyle(Math.max(1, thickness - 3), 0x5a3a1e, 1);
      g.beginPath();
      g.moveTo(ax, ay - 0.5);
      g.lineTo(bx, by - 0.5);
      g.strokePath();
    };

    // Three root bands fanning out from the central knot.
    drawRoot(cx, cy, cx - 14, cy + 4, 6); // left
    drawRoot(cx, cy, cx + 14, cy + 5, 6); // right
    drawRoot(cx, cy, cx - 6, cy - 8, 5);  // upper-left curling
    drawRoot(cx, cy, cx + 7, cy - 7, 5);  // upper-right curling

    // Central knot — bold outline disc, flat body, single highlight.
    g.fillStyle(0x080404, 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(0x3a240f, 1);
    g.fillCircle(cx, cy, 4);
    g.fillStyle(0x5a3a1e, 1);
    g.fillCircle(cx - 1.2, cy - 1.2, 1.6);

    // Sapphire glow nodes — at the joints where roots branch.
    const glowNode = (sx: number, sy: number): void => {
      g.fillStyle(0x080404, 1);
      g.fillCircle(sx, sy, 2);
      g.fillStyle(glow, 1);
      g.fillCircle(sx, sy, 1.4);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(sx, sy - 1, 1, 1);
    };
    glowNode(cx - 8, cy);
    glowNode(cx + 8, cy);
    glowNode(cx - 3, cy - 5);
    glowNode(cx + 3, cy - 4);

    // Algae strands — thin teal threads draped across two of the roots.
    g.lineStyle(1, glow, 0.55);
    g.beginPath();
    g.moveTo(cx - 11, cy + 2);
    g.lineTo(cx - 9, cy + 5);
    g.lineTo(cx - 5, cy + 6);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx + 6, cy + 6);
    g.lineTo(cx + 10, cy + 5);
    g.lineTo(cx + 13, cy + 7);
    g.strokePath();

    g.generateTexture(rockDecoKey(theme.id), w, h);
  }

  // ---------------------------------------------------------------------------
  // Forest Sprite
  // ---------------------------------------------------------------------------

  /**
   * Forest Sprite — small glowing wisp with halo, leaf-wing blobs, outlined
   * green body, eyes + mouth + inner-body highlight. Mirrors `drawSpriteNew`.
   */
  private drawForestSpriteTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 32;
    const cx = size / 2;
    const cy = size / 2;

    g.clear();

    // FLAT-VECTOR — soft glow halo, two flat wings, one round flat body with
    // a bold outline + single highlight + cute eyes + mouth.
    g.fillStyle(0x6effa0, 0.22);
    g.fillCircle(cx, cy, cx - 1);

    const OUT = 0x1e4022;
    const BODY = 0x7ad068;
    const HI = 0xb8f098;
    const WING = 0xc0e0a0;
    const EYE = 0x0a0a0a;

    // Wings — flat outlined leaves either side.
    for (const m of [-1, 1] as const) {
      g.fillStyle(OUT, 1);
      g.fillEllipse(cx + m * 9, cy - 1, 7, 5);
      g.fillStyle(WING, 0.9);
      g.fillEllipse(cx + m * 9, cy - 1, 5, 3.5);
    }

    // Body — bold outline circle + flat fill.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, cy, 6);
    g.fillStyle(BODY, 1);
    g.fillCircle(cx, cy, 4.6);
    // Single highlight (top-left).
    g.fillStyle(HI, 1);
    g.fillCircle(cx - 1.5, cy - 1.8, 1.6);

    // Cute eyes (dark dot + catch-light) + smile.
    g.fillStyle(EYE, 1);
    g.fillCircle(cx - 1.6, cy - 0.4, 1);
    g.fillCircle(cx + 1.6, cy - 0.4, 1);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx - 2, cy - 1, 1, 1);
    g.fillRect(cx + 1, cy - 1, 1, 1);
    g.fillStyle(EYE, 1);
    g.fillRect(cx - 2, cy + 2, 4, 1);

    g.generateTexture(TextureKeys.ForestSprite, size, size);
  }

  // ---------------------------------------------------------------------------
  // Mossy Slime
  // ---------------------------------------------------------------------------

  /**
   * Mossy Slime — outlined dome with top sheen highlight, moss patches,
   * eyes with sparkle, mouth, drip droplet, ground shadow. Mirrors
   * `drawSlimeNew` from the mockup.
   */
  private drawMossySlimeTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 64;
    const h = 48;
    g.clear();

    const cx = w / 2;
    const baseY = 34;

    const OUT = 0x0e2a14;
    const BODY = 0x3a7a3a;
    const HI = 0x9ce09c;
    const MOSS = 0x2a5e2a;
    const MOSS_HI = 0x56a04e;
    const EYE = 0x1a1a1a;

    // FLAT-VECTOR — rounded slime dome, bold outline + single flat tone +
    // one top sheen + flat moss patches + cute eyes + mouth + drip.
    // Sized to sit just above its 14px hitbox radius (user: "slimes zu groß").
    this.groundShadow(g, cx, baseY + 2, 13, 3, 0.45);

    // Dome — outline then flat fill. Built as an ellipse top + flat base.
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, 23, 30, 24);
    g.fillRect(cx - 15, 23, 30, baseY - 23);
    g.fillStyle(BODY, 1);
    g.fillEllipse(cx, 23, 26, 20);
    g.fillRect(cx - 13, 23, 26, baseY - 24);
    // Re-cap the bottom edge with the outline so it reads as a clean base.
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 13, baseY - 1, 26, 2);

    // Single top sheen highlight.
    g.fillStyle(HI, 1);
    g.fillEllipse(cx - 5, 15, 7, 3);

    // Flat moss patches.
    g.fillStyle(MOSS, 1);
    g.fillEllipse(cx + 7, 14, 5, 3);
    g.fillEllipse(cx - 8, 26, 4, 2.5);
    g.fillStyle(MOSS_HI, 1);
    g.fillCircle(cx + 8, 13, 1);
    g.fillCircle(cx - 7, 25, 0.9);

    // Cute eyes (dark + catch-light) + mouth.
    g.fillStyle(EYE, 1);
    g.fillCircle(cx - 4, 22, 2);
    g.fillCircle(cx + 4, 22, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 5, 21, 0.8);
    g.fillCircle(cx + 3, 21, 0.8);
    g.fillStyle(EYE, 1);
    g.fillRect(cx - 3, 27, 6, 1.3);
    g.fillRect(cx - 1.5, 28.3, 3, 1.3);

    // Drip droplet.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 10, baseY + 2, 1.8);
    g.fillStyle(BODY, 1);
    g.fillCircle(cx + 10, baseY + 1, 1);

    g.generateTexture(TextureKeys.MossySlime, w, h);
  }

  // ---------------------------------------------------------------------------
  // Vine Sprout
  // ---------------------------------------------------------------------------

  /**
   * Vine Sprout — rooted plant. Dark mound + zig-zag vine in three shaded
   * tones, leafy bud with a bright central eye, two side leaves, a thorn tip
   * on top, ground shadow. No mockup reference — built in the same outlined
   * 3-tone style as the rest.
   */
  private drawVineSproutTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 44;
    const cx = w / 2;

    g.clear();

    // FLAT-VECTOR — outlined flat root mound, flat tapered vine, leafy bud
    // with a cute eye, flat side leaves, thorn tip.
    this.groundShadow(g, cx, h - 3, 9, 2.5, 0.5);

    // Root mound — outline + single flat fill.
    g.fillStyle(0x040a05, 1);
    g.fillEllipse(cx, h - 5, 20, 10);
    g.fillStyle(0x2d4220, 1);
    g.fillEllipse(cx, h - 6, 16, 7);
    g.fillStyle(0x040a05, 1);
    g.fillRect(cx - 8, h - 4, 3, 2);
    g.fillRect(cx + 5, h - 4, 3, 2);

    // Twisting vine — flat tapered segments, outline + single fill.
    const vineSeg = (
      tipX: number,
      tipY: number,
      baseLX: number,
      baseRX: number,
      baseY: number,
    ): void => {
      g.fillStyle(0x040a05, 1);
      g.fillTriangle(baseLX - 1, baseY, baseRX + 1, baseY, tipX, tipY - 1);
      g.fillStyle(0x2a5a32, 1);
      g.fillTriangle(baseLX, baseY, baseRX, baseY, tipX, tipY);
    };
    vineSeg(cx + 2, h - 16, cx - 2, cx + 4, h - 8);
    vineSeg(cx, h - 24, cx - 4, cx + 2, h - 16);
    vineSeg(cx + 1, h - 30, cx - 2, cx + 4, h - 24);

    // Bud — bold outline + flat fill + single highlight.
    g.fillStyle(0x040a05, 1);
    g.fillCircle(cx, h - 32, 10);
    g.fillStyle(0x2d6634, 1);
    g.fillCircle(cx, h - 32, 8.5);
    g.fillStyle(0x4f8a44, 1);
    g.fillCircle(cx - 2.5, h - 34, 3);

    // Cute eye in the bud.
    g.fillStyle(0xfff2c4, 1);
    g.fillCircle(cx, h - 32, 4);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx, h - 32, 1.8);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 1, h - 33, 1, 1);

    // Side leaves — flat outlined triangles.
    const leaf = (mirror: 1 | -1): void => {
      g.fillStyle(0x040a05, 1);
      g.fillTriangle(cx + mirror * 8, h - 30, cx + mirror * 15, h - 28, cx + mirror * 9, h - 25);
      g.fillStyle(0x2d6634, 1);
      g.fillTriangle(cx + mirror * 8.5, h - 29.5, cx + mirror * 13, h - 28, cx + mirror * 9.5, h - 26);
    };
    leaf(-1);
    leaf(1);

    // Thorn tip on top.
    g.fillStyle(0x040a05, 1);
    g.fillTriangle(cx - 3, h - 38, cx + 3, h - 38, cx, h - 44);
    g.fillStyle(0x6effa0, 1);
    g.fillTriangle(cx - 2, h - 38, cx + 2, h - 38, cx, h - 43);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx, h - 42, 1, 2);

    g.generateTexture(TextureKeys.VineSprout, w, h);
  }

  // ---------------------------------------------------------------------------
  // Pixie Dancer
  // ---------------------------------------------------------------------------

  /**
   * Pixie Dancer — small fairy glass cannon. Pink-magenta glow halo, four
   * translucent wing leaves, outlined pink torso, head with hair + eyes,
   * sparkle pixels around the silhouette. No mockup — built in the same
   * outlined / detail-pixel style as the rest.
   */
  private drawPixieDancerTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 28;
    const cx = size / 2;
    const cy = size / 2;

    g.clear();

    // FLAT-VECTOR — soft pink halo, flat outlined wings, flat pink torso +
    // round head with hair tuft, cute eyes + smile, a few sparkles.
    g.fillStyle(0xff7ac0, 0.28);
    g.fillCircle(cx, cy, cx - 1);

    // Wings — flat translucent leaves with a thin outline.
    const wing = (sx: number, sy: number): void => {
      g.lineStyle(1, 0xa84080, 0.7);
      g.fillStyle(0xffd0e8, 0.6);
      g.fillEllipse(sx, sy, 10, 8);
      g.strokeEllipse(sx, sy, 10, 8);
    };
    wing(cx - 8, cy - 2);
    wing(cx + 8, cy - 2);
    g.lineStyle(0, 0, 0);

    // Torso — bold outline + flat pink fill + one highlight.
    g.fillStyle(0x4d0d22, 1);
    g.fillEllipse(cx, cy + 1, 10, 13);
    g.fillStyle(0xff5577, 1);
    g.fillEllipse(cx, cy + 1, 8, 11);
    g.fillStyle(0xff90a8, 1);
    g.fillEllipse(cx - 1.5, cy - 1, 2.5, 4);

    // Head — outline + flat skin.
    g.fillStyle(0x4d0d22, 1);
    g.fillCircle(cx, cy - 6, 4.5);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(cx, cy - 6, 3.5);

    // Hair tuft (auburn, flat).
    g.fillStyle(0x4a1a08, 1);
    g.fillEllipse(cx, cy - 9, 8, 3.5);
    g.fillStyle(0xa64a1a, 1);
    g.fillEllipse(cx, cy - 9.5, 5, 1.8);

    // Cute eyes (dot + catch-light) + smile.
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 1.4, cy - 6, 0.9);
    g.fillCircle(cx + 1.4, cy - 6, 0.9);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx - 2, cy - 6.5, 1, 1);
    g.fillRect(cx + 1, cy - 6.5, 1, 1);
    g.fillStyle(0xa83048, 1);
    g.fillRect(cx - 1, cy - 4, 2, 1);

    // Sparkles around the figure.
    g.fillStyle(0xffffff, 0.95);
    g.fillRect(cx - 12, cy - 5, 1, 1);
    g.fillRect(cx + 11, cy + 3, 1, 1);
    g.fillStyle(0xfff8a0, 0.8);
    g.fillRect(cx + 10, cy - 8, 1, 1);
    g.fillRect(cx - 10, cy + 7, 1, 1);

    g.generateTexture(TextureKeys.PixieDancer, size, size);
  }

  // ---------------------------------------------------------------------------
  // Bog Frog (Floor 2)
  // ---------------------------------------------------------------------------

  /**
   * Squat round frog with bulging eyes and a pink tongue. Built from
   * outlined ellipses + spots in the sapphire-swamp palette so it reads
   * as a swamp creature when placed against the floor 2 background.
   */
  private drawBogFrogTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 32;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    // Soft cyan glow halo so the frog reads as a swamp critter under the
    // sapphire palette's blue-tinted ambient lighting.
    g.fillStyle(0x4ad8ff, 0.15);
    g.fillEllipse(cx, cy + 1, w - 6, h - 8);

    // Ground shadow
    this.groundShadow(g, cx, h - 4, 11, 2.5, 0.5);

    // Body — bold outline + flat fill + one highlight (bolder pass)
    g.fillStyle(0x05180e, 1);
    g.fillEllipse(cx, cy + 3, 26, 20);
    g.fillStyle(0x368a52, 1);
    g.fillEllipse(cx, cy + 3, 22, 16);
    g.fillStyle(0x52b870, 1);
    g.fillEllipse(cx - 4, cy, 10, 6);

    // Belly (lighter underside)
    g.fillStyle(0x9ee0c0, 0.7);
    g.fillEllipse(cx, cy + 7, 16, 6);

    // Spots (darker green-blue speckle)
    g.fillStyle(0x16331f, 1);
    g.fillCircle(cx + 5, cy - 1, 1.5);
    g.fillCircle(cx - 6, cy + 4, 1.5);
    g.fillCircle(cx + 7, cy + 4, 1.2);
    g.fillCircle(cx - 2, cy + 1, 1.2);
    // Bold body outline.
    g.lineStyle(2, 0x05180e, 1);
    g.strokeEllipse(cx, cy + 3, 24, 18);

    // Eye sockets (raised bumps on the head)
    g.fillStyle(0x0e2a18, 1);
    g.fillCircle(cx - 5, cy - 5, 4.5);
    g.fillCircle(cx + 5, cy - 5, 4.5);
    g.fillStyle(0x4ea66a, 1);
    g.fillCircle(cx - 5, cy - 5, 3.5);
    g.fillCircle(cx + 5, cy - 5, 3.5);
    // Yellow eye + black pupil + sparkle
    g.fillStyle(0xfff0a0, 1);
    g.fillCircle(cx - 5, cy - 5, 2.5);
    g.fillCircle(cx + 5, cy - 5, 2.5);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 5, cy - 5, 1.3);
    g.fillCircle(cx + 5, cy - 5, 1.3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 6, cy - 6, 1, 1);
    g.fillRect(cx + 4, cy - 6, 1, 1);

    // Mouth — thin dark line + pink tongue tip
    g.fillStyle(0x111111, 1);
    g.fillRect(cx - 4, cy + 1, 8, 1);
    g.fillStyle(0xff7aa0, 1);
    g.fillRect(cx - 1, cy + 1, 2, 2);

    g.generateTexture(TextureKeys.BogFrog, w, h);
  }

  // ---------------------------------------------------------------------------
  // Snapper Bloom (Floor 2, rooted)
  // ---------------------------------------------------------------------------

  /**
   * Venus-flytrap-style rooted enemy. Stem is dark teal/blue, the bulbous
   * head is a cracked-open mouth in violet-pink with white tooth pixels.
   * Outlined like the rest so it sits in the floor 2 palette.
   */
  private drawSnapperBloomTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 44;
    const cx = w / 2;
    g.clear();

    // Ground shadow at the base
    this.groundShadow(g, cx, h - 3, 9, 2.5, 0.5);

    // FLAT-VECTOR — root mound: bold outline + one flat tone.
    g.fillStyle(0x040810, 1);
    g.fillEllipse(cx, h - 5, 20, 10);
    g.fillStyle(0x243248, 1);
    g.fillEllipse(cx, h - 5, 18, 8);

    // Stem — bold outline + flat body + one left highlight.
    g.fillStyle(0x040810, 1);
    g.fillRect(cx - 3, h - 22, 6, 18);
    g.fillStyle(0x274a5e, 1);
    g.fillRect(cx - 2, h - 22, 4, 18);
    g.fillStyle(0x3a607a, 1);
    g.fillRect(cx - 2, h - 22, 1, 18);

    // Side leaves (small fronds) — outline + flat fill.
    g.fillStyle(0x040810, 1);
    g.fillEllipse(cx - 8, h - 16, 8, 4);
    g.fillEllipse(cx + 8, h - 18, 8, 4);
    g.fillStyle(0x2c6e6e, 1);
    g.fillEllipse(cx - 8, h - 16, 7, 3);
    g.fillEllipse(cx + 8, h - 18, 7, 3);

    // Bulb / head — bold outline, flat violet body, one highlight.
    const headY = h - 28;
    g.fillStyle(0x0a0410, 1);
    g.fillEllipse(cx, headY, 22, 18);
    g.fillStyle(0x6a2a92, 1);
    g.fillEllipse(cx, headY, 20, 16);
    g.fillStyle(0x9a5ad8, 1);
    g.fillEllipse(cx - 4, headY - 4, 7, 4);

    // Mouth opening — dark cleft + white tooth pixels
    g.fillStyle(0x14040a, 1);
    g.fillEllipse(cx, headY + 1, 14, 6);
    g.fillStyle(0xff5aa8, 1);
    g.fillEllipse(cx, headY + 1, 11, 4);
    // Tooth ring
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 5, headY - 1, 1, 2);
    g.fillRect(cx - 2, headY - 2, 1, 2);
    g.fillRect(cx + 1, headY - 2, 1, 2);
    g.fillRect(cx + 4, headY - 1, 1, 2);
    g.fillRect(cx - 5, headY + 2, 1, 2);
    g.fillRect(cx - 2, headY + 3, 1, 2);
    g.fillRect(cx + 1, headY + 3, 1, 2);
    g.fillRect(cx + 4, headY + 2, 1, 2);

    // Glowing inner pupil — single sapphire dot in the throat
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(cx, headY + 1, 1.4);

    g.generateTexture(TextureKeys.SnapperBloom, w, h);
  }

  // ---------------------------------------------------------------------------
  // Damselfly (Floor 2)
  // ---------------------------------------------------------------------------

  /**
   * Long-bodied dragonfly silhouette: thin segmented body, four translucent
   * wings, oversized compound eye + warm magenta-pink accents so the
   * sprite pops against the cool Sapphire-Swamp palette instead of
   * disappearing into it.
   */
  private drawDamselflyTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 44;
    const h = 28;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    // Pink-magenta glow halo (warm contrast vs the cool floor)
    g.fillStyle(0xff7aa0, 0.2);
    g.fillEllipse(cx, cy, w - 4, h - 6);

    // Wings — translucent with magenta tips for visibility
    const wing = (sx: number, sy: number, rx: number, ry: number): void => {
      g.fillStyle(0xffd0e0, 0.5);
      g.fillEllipse(sx, sy, rx * 2, ry * 2);
      g.fillStyle(0xff7aa0, 0.55);
      g.fillEllipse(sx + (sx > cx ? 2 : -2), sy, rx, ry * 0.7);
      g.lineStyle(1, 0xa83458, 0.8);
      g.strokeEllipse(sx, sy, rx * 2, ry * 2);
    };
    wing(cx - 6, cy - 6, 7, 3);
    wing(cx + 6, cy - 6, 7, 3);
    wing(cx - 8, cy + 5, 7, 3);
    wing(cx + 8, cy + 5, 7, 3);

    // Body — long horizontal capsule, warm orange highlight
    g.fillStyle(0x0a0414, 1);
    g.fillEllipse(cx, cy, 31, 8);
    g.fillStyle(0x5e2a66, 1);
    g.fillEllipse(cx, cy, 28, 5);
    g.fillStyle(0xff7aa0, 1);
    g.fillEllipse(cx, cy - 1, 22, 2);
    g.lineStyle(1.5, 0x0a0414, 1);
    g.strokeEllipse(cx, cy, 28, 5);
    // Bright segment dots
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 8, cy - 1, 2, 1);
    g.fillRect(cx, cy - 1, 2, 1);
    g.fillRect(cx + 7, cy - 1, 2, 1);

    // Head bulb (warmer)
    g.fillStyle(0x140820, 1);
    g.fillCircle(cx - 14, cy, 4.5);
    g.fillStyle(0x6a204a, 1);
    g.fillCircle(cx - 14, cy, 3.5);
    // Compound eye — yellow for contrast
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx - 15, cy - 1, 2);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 15, cy - 1, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 16, cy - 2, 1, 1);

    // Tail tip — bright pink
    g.fillStyle(0xff7aa0, 1);
    g.fillRect(cx + 13, cy - 1, 3, 2);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx + 14, cy - 1, 1, 1);

    g.generateTexture(TextureKeys.Damselfly, w, h);
  }

  // ---------------------------------------------------------------------------
  // Bog Tortoise (Floor 2)
  // ---------------------------------------------------------------------------

  /**
   * Wide low-slung tortoise: dark purple shell with sapphire-blue plate
   * spots, head + four stubby feet poking out, ground shadow underneath.
   */
  private drawBogTortoiseTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 40;
    const h = 32;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    // Ground shadow
    this.groundShadow(g, cx, h - 4, 14, 3, 0.55);

    // Feet (four stubby legs)
    const foot = (sx: number, sy: number): void => {
      g.fillStyle(0x080410, 1);
      g.fillEllipse(sx, sy, 6, 4);
      g.fillStyle(0x2c3e58, 1);
      g.fillEllipse(sx, sy, 4, 3);
    };
    foot(cx - 12, cy + 6);
    foot(cx + 12, cy + 6);
    foot(cx - 9, cy + 8);
    foot(cx + 9, cy + 8);

    // Head — peeks out left side
    g.fillStyle(0x080410, 1);
    g.fillEllipse(cx - 14, cy, 8, 6);
    g.fillStyle(0x2a4a3a, 1);
    g.fillEllipse(cx - 14, cy, 6, 5);
    // Eye
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 16, cy - 1, 1.3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 16, cy - 2, 1, 1);

    // Shell — dark purple dome with a bold outline (bolder pass)
    g.fillStyle(0x06030c, 1);
    g.fillEllipse(cx, cy - 2, 28, 20);
    g.fillStyle(0x4a2470, 1);
    g.fillEllipse(cx, cy - 2, 24, 16);
    // Shell highlight strip
    g.fillStyle(0x7a4ab8, 1);
    g.fillEllipse(cx - 4, cy - 6, 10, 4);
    g.lineStyle(2, 0x06030c, 1);
    g.strokeEllipse(cx, cy - 2, 26, 18);

    // Sapphire shell plates — six glowing spots
    const plate = (sx: number, sy: number): void => {
      g.fillStyle(0x080410, 1);
      g.fillCircle(sx, sy, 2.6);
      g.fillStyle(0x4ad8ff, 1);
      g.fillCircle(sx, sy, 1.8);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(sx - 1, sy - 1, 1, 1);
    };
    plate(cx - 7, cy - 4);
    plate(cx, cy - 5);
    plate(cx + 7, cy - 4);
    plate(cx - 5, cy + 1);
    plate(cx + 5, cy + 1);
    plate(cx, cy + 3);

    g.generateTexture(TextureKeys.BogTortoise, w, h);
  }

  // ---------------------------------------------------------------------------
  // Boss: Toad Sovereign (Sapphire Swamp)
  // ---------------------------------------------------------------------------

  /**
   * Toad Sovereign — beefier swamp-frog silhouette with a gold crown + sapphire
   * gemstone, four bright eyes (boss-y), darker teal body. Same canvas as the
   * mob's so the boss reads as "same shape, more menacing".
   */
  private drawBossToadSovereignTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 48;
    const h = 44;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    g.fillStyle(0x4ad8ff, 0.18);
    g.fillEllipse(cx, cy + 2, w - 6, h - 8);

    this.groundShadow(g, cx, h - 4, 16, 3, 0.55);

    // FLAT-VECTOR — bold outline, flat teal body, one top-left highlight,
    // lighter belly region.
    g.fillStyle(0x06160e, 1);
    g.fillEllipse(cx, cy + 5, 36, 26);
    g.fillStyle(0x227d44, 1);
    g.fillEllipse(cx, cy + 5, 34, 24);
    g.fillStyle(0x5cc080, 1);
    g.fillEllipse(cx - 6, cy + 1, 13, 7);
    g.fillStyle(0x8fd8b0, 1);
    g.fillEllipse(cx, cy + 11, 22, 6);

    // Spots
    g.fillStyle(0x103022, 1);
    g.fillCircle(cx + 7, cy + 1, 1.8);
    g.fillCircle(cx - 8, cy + 7, 1.8);
    g.fillCircle(cx + 9, cy + 7, 1.6);
    g.fillCircle(cx - 3, cy + 3, 1.4);

    // Eye sockets — 4 eyes for a boss feel (two paired top, two below)
    const eye = (sx: number, sy: number, r: number): void => {
      g.fillStyle(0x06160e, 1);
      g.fillCircle(sx, sy, r + 1);
      g.fillStyle(0x4ea66a, 1);
      g.fillCircle(sx, sy, r);
      g.fillStyle(0xfff0a0, 1);
      g.fillCircle(sx, sy, r - 1);
      g.fillStyle(0x111111, 1);
      g.fillCircle(sx, sy, r * 0.55);
      g.fillStyle(0xffffff, 1);
      g.fillRect(sx - 1, sy - 1, 1, 1);
    };
    eye(cx - 7, cy - 6, 3);
    eye(cx + 7, cy - 6, 3);
    eye(cx - 11, cy - 1, 2);
    eye(cx + 11, cy - 1, 2);

    // Mouth + tongue tip
    g.fillStyle(0x111111, 1);
    g.fillRect(cx - 6, cy + 2, 12, 1);
    g.fillStyle(0xff7aa0, 1);
    g.fillRect(cx - 1, cy + 2, 2, 2);

    // Gold crown with sapphire gem
    const crownY = cy - 13;
    g.fillStyle(0x080404, 1);
    g.fillRect(cx - 9, crownY, 18, 6);
    g.fillStyle(0x7a5a1a, 1);
    g.fillRect(cx - 8, crownY + 1, 16, 5);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 8, crownY + 1, 16, 3);
    // Crown peaks (3 triangular bumps)
    const peak = (px: number, ph: number): void => {
      g.fillStyle(0x080404, 1);
      g.fillRect(px - 1, crownY - ph - 1, 4, ph + 1);
      g.fillStyle(0xffd84a, 1);
      g.fillRect(px, crownY - ph, 2, ph);
    };
    peak(cx - 6, 3);
    peak(cx - 1, 4);
    peak(cx + 4, 3);
    // Center sapphire gem
    g.fillStyle(0x080404, 1);
    g.fillCircle(cx, crownY + 3, 2.4);
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(cx, crownY + 3, 1.8);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(cx - 1, crownY + 2, 1, 1);

    g.generateTexture(TextureKeys.BossToadSovereign, w, h);
  }

  // ---------------------------------------------------------------------------
  // Boss: Bloomheart (Sapphire Swamp)
  // ---------------------------------------------------------------------------

  /**
   * Bloomheart — bigger snapper-bloom variant. Wider mouth with more teeth,
   * darker violet petals, sapphire-glowing throat, multiple side fronds.
   */
  private drawBossBloomheartTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 56;
    const h = 64;
    const cx = w / 2;
    g.clear();

    this.groundShadow(g, cx, h - 4, 14, 3, 0.55);

    // FLAT-VECTOR — root mound: bold outline + one flat tone + small sheen.
    g.fillStyle(0x040810, 1);
    g.fillEllipse(cx, h - 6, 32, 14);
    g.fillStyle(0x243248, 1);
    g.fillEllipse(cx, h - 6, 30, 12);
    g.fillStyle(0x3a607a, 1);
    g.fillEllipse(cx - 5, h - 8, 9, 2.5);

    // Stem — bold outline + flat body + one left highlight.
    g.fillStyle(0x040810, 1);
    g.fillRect(cx - 5, h - 30, 10, 24);
    g.fillStyle(0x274a5e, 1);
    g.fillRect(cx - 4, h - 30, 8, 24);
    g.fillStyle(0x3a607a, 1);
    g.fillRect(cx - 4, h - 30, 2, 24);

    // 4 fronds (paired sides)
    const frond = (sx: number, sy: number, rx: number, ry: number): void => {
      g.fillStyle(0x040810, 1);
      g.fillEllipse(sx, sy, rx + 2, ry + 2);
      g.fillStyle(0x2c6e6e, 1);
      g.fillEllipse(sx, sy, rx, ry);
      g.fillStyle(0x4ad8ff, 0.6);
      g.fillEllipse(sx - 1, sy - 1, rx * 0.4, ry * 0.4);
    };
    frond(cx - 13, h - 22, 9, 4);
    frond(cx + 13, h - 24, 9, 4);
    frond(cx - 11, h - 14, 7, 3);
    frond(cx + 11, h - 12, 7, 3);

    // Bulb / head — bigger
    const headY = h - 38;
    g.fillStyle(0x0a0410, 1);
    g.fillEllipse(cx, headY, 36, 30);
    g.fillStyle(0x6a2a92, 1);
    g.fillEllipse(cx, headY, 33, 27);
    g.fillStyle(0x9a5ad8, 1);
    g.fillEllipse(cx - 5, headY - 4, 13, 7);

    // Mouth — wide with teeth
    g.fillStyle(0x14040a, 1);
    g.fillEllipse(cx, headY + 1, 24, 12);
    g.fillStyle(0xff5aa8, 1);
    g.fillEllipse(cx, headY + 1, 21, 9);

    // Teeth ring (10 small white pixels)
    g.fillStyle(0xffffff, 1);
    const teeth = [-9, -6, -3, 0, 3, 6, 9];
    for (const tx of teeth) {
      g.fillRect(cx + tx, headY - 4, 1, 3);
      g.fillRect(cx + tx, headY + 5, 1, 3);
    }

    // Glowing sapphire throat
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(cx, headY + 1, 2.4);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(cx - 1, headY, 1, 1);

    g.generateTexture(TextureKeys.BossBloomheart, w, h);
  }

  // ---------------------------------------------------------------------------
  // Boss: Damselfly Empress (Sapphire Swamp)
  // ---------------------------------------------------------------------------

  /**
   * Damselfly Empress — bigger dragonfly with 4 large translucent wings,
   * elongated segmented abdomen, oversized compound eye + tiny gold crown.
   */
  private drawBossDamselflyEmpressTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 64;
    const h = 40;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    g.fillStyle(0x4ad8ff, 0.18);
    g.fillEllipse(cx, cy, w - 6, h - 6);

    // Wings — 4 (paired top + bottom), bigger than the mob's
    const wing = (sx: number, sy: number, rx: number, ry: number): void => {
      g.fillStyle(0xc0e8ff, 0.55);
      g.fillEllipse(sx, sy, rx * 2, ry * 2);
      g.lineStyle(1, 0x4080a0, 0.7);
      g.strokeEllipse(sx, sy, rx * 2, ry * 2);
    };
    wing(cx - 9, cy - 9, 10, 5);
    wing(cx + 9, cy - 9, 10, 5);
    wing(cx - 11, cy + 7, 10, 5);
    wing(cx + 11, cy + 7, 10, 5);

    // Body — long segmented capsule
    g.fillStyle(0x081a28, 1);
    g.fillEllipse(cx, cy, 42, 9);
    g.fillStyle(0x1f5e7a, 1);
    g.fillEllipse(cx, cy, 40, 7);
    // Segment bands
    g.fillStyle(0x4ad8ff, 1);
    for (const tx of [-12, -6, 0, 6, 12]) {
      g.fillRect(cx + tx, cy - 2, 1, 4);
    }

    // Head bulb (bigger)
    g.fillStyle(0x081a28, 1);
    g.fillCircle(cx - 19, cy, 6);
    g.fillStyle(0x1f5e7a, 1);
    g.fillCircle(cx - 19, cy, 5);
    // Big compound eye
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(cx - 21, cy - 1, 2.5);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 22, cy - 2, 1, 1);

    // Tiny gold crown above the head
    g.fillStyle(0x080404, 1);
    g.fillRect(cx - 22, cy - 8, 8, 3);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 21, cy - 7, 6, 2);
    g.fillStyle(0x080404, 1);
    g.fillRect(cx - 20, cy - 9, 1, 1);
    g.fillRect(cx - 18, cy - 10, 1, 2);
    g.fillRect(cx - 16, cy - 9, 1, 1);
    g.fillStyle(0x4ad8ff, 1);
    g.fillRect(cx - 18, cy - 8, 1, 1);

    // Tail glow
    g.fillStyle(0x4ad8ff, 1);
    g.fillRect(cx + 19, cy - 1, 3, 2);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(cx + 21, cy - 1, 1, 1);

    g.generateTexture(TextureKeys.BossDamselflyEmpress, w, h);
  }

  // ---------------------------------------------------------------------------
  // Boss: Bog Colossus (Sapphire Swamp)
  // ---------------------------------------------------------------------------

  /**
   * Bog Colossus — gigantic shelled tortoise with a ringed crown of sapphire
   * shell crystals, four chunky stub legs, a thicker neck/head poking out of
   * the front, and a heavy ground shadow.
   */
  private drawBossBogColossusTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 64;
    const h = 56;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    this.groundShadow(g, cx, h - 5, 24, 5, 0.6);

    // Feet (chunky)
    const foot = (sx: number, sy: number): void => {
      g.fillStyle(0x080410, 1);
      g.fillEllipse(sx, sy, 9, 6);
      g.fillStyle(0x2c3e58, 1);
      g.fillEllipse(sx, sy, 7, 4);
    };
    foot(cx - 18, cy + 12);
    foot(cx + 18, cy + 12);
    foot(cx - 14, cy + 14);
    foot(cx + 14, cy + 14);

    // Neck + head (peeks left)
    g.fillStyle(0x080410, 1);
    g.fillEllipse(cx - 22, cy + 3, 14, 10);
    g.fillStyle(0x2a4a3a, 1);
    g.fillEllipse(cx - 22, cy + 3, 12, 8);
    // Eye + sparkle
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 26, cy + 1, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 26, cy, 1, 1);
    // Snout
    g.fillStyle(0x080410, 1);
    g.fillRect(cx - 30, cy + 3, 3, 2);
    g.fillStyle(0x2a4a3a, 1);
    g.fillRect(cx - 30, cy + 3, 2, 1);

    // Shell — wide dome with bands
    g.fillStyle(0x0a0410, 1);
    g.fillEllipse(cx, cy - 2, 44, 30);
    g.fillStyle(0x3a1a5a, 1);
    g.fillEllipse(cx, cy - 2, 41, 27);
    g.fillStyle(0x6a3aa0, 1);
    g.fillEllipse(cx - 7, cy - 8, 16, 6);

    // Sapphire shell plates — bigger ring + crown plates
    const plate = (sx: number, sy: number, r: number): void => {
      g.fillStyle(0x080410, 1);
      g.fillCircle(sx, sy, r + 1);
      g.fillStyle(0x4ad8ff, 1);
      g.fillCircle(sx, sy, r);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(sx - 1, sy - 1, 1, 1);
    };
    // Ring of plates
    plate(cx - 12, cy - 6, 3);
    plate(cx, cy - 8, 3);
    plate(cx + 12, cy - 6, 3);
    plate(cx - 9, cy + 1, 2.5);
    plate(cx + 9, cy + 1, 2.5);
    plate(cx, cy + 5, 2.5);

    // Crown crystals (top of shell, sticking up)
    const crystal = (sx: number, sy: number, ph: number): void => {
      g.fillStyle(0x080410, 1);
      g.fillRect(sx - 1, sy - ph - 1, 4, ph + 1);
      g.fillStyle(0x4ad8ff, 1);
      g.fillRect(sx, sy - ph, 2, ph);
      g.fillStyle(0xb0e8ff, 1);
      g.fillRect(sx, sy - ph, 1, 1);
    };
    crystal(cx - 8, cy - 14, 5);
    crystal(cx - 1, cy - 16, 7);
    crystal(cx + 6, cy - 14, 5);

    g.generateTexture(TextureKeys.BossBogColossus, w, h);
  }

  // ---------------------------------------------------------------------------
  // Boss: Mossy Behemoth
  // ---------------------------------------------------------------------------

  /**
   * Mossy Behemoth — gigantic slime boss. Same outlined / 3-tone moss style as
   * the Mossy Slime but inflated to 96 × 72, with three eyes (alien feel),
   * heavier moss patches, a thick drip, and a dramatic ground shadow.
   */
  private drawBossMossyBehemothTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 96;
    const h = 72;
    g.clear();

    const cx = w / 2;
    const baseY = 54;

    const OUT = 0x041a08;
    const BODY = 0x2f6b30;
    const HI = 0x9ce09c;
    const MOSS = 0x244f24;
    const MOSS_HI = 0x56a04e;
    const EYE = 0x1a1a1a;

    // FLAT-VECTOR — beefy slime dome, bold outline + single flat tone + one
    // top sheen + flat moss patches + THREE alien eyes + angry mouth + drip.
    // Dome trimmed to ~original footprint (user: "slimes zu groß") — still
    // comfortably larger than the 30px hitbox radius.
    this.groundShadow(g, cx, baseY + 4, 24, 5, 0.55);

    // Dome — outline ellipse + flat base, then flat fill.
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, 32, 48, 40);
    g.fillRect(cx - 24, 32, 48, baseY - 32);
    g.fillStyle(BODY, 1);
    g.fillEllipse(cx, 32, 42, 34);
    g.fillRect(cx - 21, 32, 42, baseY - 34);
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 21, baseY - 2, 42, 3);

    // Single top sheen.
    g.fillStyle(HI, 1);
    g.fillEllipse(cx - 9, 18, 12, 5);

    // Flat moss patches.
    g.fillStyle(MOSS, 1);
    g.fillEllipse(cx - 13, 18, 8, 5);
    g.fillEllipse(cx + 13, 15, 7, 4);
    g.fillEllipse(cx + 14, 36, 6, 4);
    g.fillStyle(MOSS_HI, 1);
    g.fillCircle(cx - 11, 17, 1.3);
    g.fillCircle(cx + 15, 14, 1.3);

    // THREE alien eyes (dark + catch-light).
    for (const dx of [-10, 0, 10]) {
      g.fillStyle(EYE, 1);
      g.fillCircle(cx + dx, 30, 2.8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx + dx - 1, 29, 1);
    }

    // Wide angry mouth.
    g.fillStyle(EYE, 1);
    g.fillRect(cx - 8, 38, 16, 2.2);
    g.fillTriangle(cx - 8, 38, cx - 5, 42, cx - 2, 38);
    g.fillTriangle(cx + 2, 38, cx + 5, 42, cx + 8, 38);

    // Big drip on the right shoulder.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 19, baseY + 4, 2.6);
    g.fillStyle(BODY, 1);
    g.fillCircle(cx + 19, baseY + 3, 1.6);

    g.generateTexture(TextureKeys.BossMossyBehemoth, w, h);
  }

  // ---------------------------------------------------------------------------
  // Boss: Pixie Queen
  // ---------------------------------------------------------------------------

  /**
   * Pixie Queen — scaled-up Pixie Dancer with a gold crown, a much bigger
   * magenta-pink halo, four wings (two pairs), a richer two-tone dress, and
   * star-sparkles around her silhouette.
   */
  private drawBossPixieQueenTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 64;
    const cx = size / 2;
    const cy = size / 2;
    g.clear();

    // FLAT-VECTOR — soft pink halo, flat outlined wing pairs, flat dress +
    // round head with hair, three-spike gold crown, cute face, star sparkles.
    g.fillStyle(0xff7ac0, 0.2);
    g.fillCircle(cx, cy, cx);
    g.fillStyle(0xffaad8, 0.3);
    g.fillCircle(cx, cy, cx - 10);

    // Wings — flat translucent leaves with thin outline.
    const wing = (sx: number, sy: number, wW: number, wH: number, fill: number): void => {
      g.lineStyle(1, 0xa84080, 0.7);
      g.fillStyle(fill, 0.55);
      g.fillEllipse(sx, sy, wW, wH);
      g.strokeEllipse(sx, sy, wW, wH);
    };
    wing(cx - 12, cy - 6, 15, 11, 0xffd0e8);
    wing(cx + 12, cy - 6, 15, 11, 0xffd0e8);
    wing(cx - 14, cy + 6, 14, 10, 0xfff8a0);
    wing(cx + 14, cy + 6, 14, 10, 0xfff8a0);
    g.lineStyle(0, 0, 0);

    // Dress — bold outline + flat fill + one highlight.
    g.fillStyle(0x4d0d22, 1);
    g.fillEllipse(cx, cy + 4, 18, 22);
    g.fillStyle(0xb02468, 1);
    g.fillEllipse(cx, cy + 5, 15, 18);
    g.fillStyle(0xff5b86, 1);
    g.fillEllipse(cx, cy + 1, 12, 13);
    g.fillStyle(0xff90a8, 1);
    g.fillEllipse(cx - 2.5, cy - 1, 3.5, 5);

    // Head — outline + flat skin.
    g.fillStyle(0x4d0d22, 1);
    g.fillCircle(cx, cy - 10, 7);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(cx, cy - 10, 5.5);

    // Hair tuft (auburn, flat).
    g.fillStyle(0x4a1a08, 1);
    g.fillEllipse(cx, cy - 14, 13, 5);
    g.fillStyle(0xa64a1a, 1);
    g.fillEllipse(cx, cy - 14.5, 8, 2.4);

    // Crown (gold, three-spike)
    const crownY = cy - 18;
    g.fillStyle(0x664000, 1);
    g.fillRect(cx - 7, crownY, 14, 4);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 6, crownY + 1, 12, 3);
    // Spikes
    g.fillStyle(0x664000, 1);
    g.fillTriangle(cx - 7, crownY, cx - 4, crownY - 4, cx - 1, crownY);
    g.fillTriangle(cx - 2, crownY, cx, crownY - 5, cx + 2, crownY);
    g.fillTriangle(cx + 1, crownY, cx + 4, crownY - 4, cx + 7, crownY);
    g.fillStyle(0xffd84a, 1);
    g.fillTriangle(cx - 6, crownY, cx - 4, crownY - 3, cx - 2, crownY);
    g.fillTriangle(cx - 1, crownY, cx, crownY - 4, cx + 1, crownY);
    g.fillTriangle(cx + 2, crownY, cx + 4, crownY - 3, cx + 6, crownY);
    // Crown jewel
    g.fillStyle(0xff5577, 1);
    g.fillCircle(cx, crownY - 3, 1.4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx, crownY - 4, 1, 1);

    // Cute eyes (dot + catch-light) + smile.
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx - 2.4, cy - 10, 1.2);
    g.fillCircle(cx + 2.4, cy - 10, 1.2);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx - 3, cy - 11, 1, 1);
    g.fillRect(cx + 2, cy - 11, 1, 1);
    g.fillStyle(0xa83048, 1);
    g.fillRect(cx - 2, cy - 7, 4, 1);

    // Star sparkles around the silhouette (cross-shaped 5-pixel stars)
    const star = (sx: number, sy: number, color: number): void => {
      g.fillStyle(color, 1);
      g.fillRect(sx, sy, 1, 1);
      g.fillRect(sx - 1, sy, 1, 1);
      g.fillRect(sx + 1, sy, 1, 1);
      g.fillRect(sx, sy - 1, 1, 1);
      g.fillRect(sx, sy + 1, 1, 1);
    };
    star(cx - 26, cy - 14, 0xffffff);
    star(cx + 25, cy - 8, 0xfff8a0);
    star(cx - 24, cy + 12, 0xfff8a0);
    star(cx + 26, cy + 14, 0xffffff);
    star(cx + 22, cy - 22, 0xffffff);
    star(cx - 22, cy + 22, 0xfff8a0);
    star(cx, cy - 26, 0xffffff);

    g.generateTexture(TextureKeys.BossPixieQueen, size, size);
  }

  // ---------------------------------------------------------------------------
  // Boss: Forest Heart
  // ---------------------------------------------------------------------------

  /**
   * Forest Heart — stationary tree-core boss. Pulsating green disk with a
   * dark outline; bright glow-color core in the middle; four root/branch arms
   * spreading horizontally; ground shadow. Reads as a "heart of wood" — wider
   * than tall so it sits clearly on the floor.
   */
  private drawBossForestHeartTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 80;
    const h = 80;
    const cx = w / 2;
    const cy = h / 2 + 4; // shift down slightly so roots have headroom
    g.clear();

    // Ground shadow (wide ellipse)
    this.groundShadow(g, cx, cy + 22, 26, 4, 0.5);

    // Roots / branches — drawn first so the disk overlays them.
    const root = (mirror: 1 | -1, dx: number, dy: number, len: number): void => {
      g.lineStyle(4, 0x041a08, 1);
      g.beginPath();
      g.moveTo(cx + mirror * 4, cy);
      g.lineTo(cx + mirror * (4 + len * dx), cy + dy * len);
      g.strokePath();
      g.lineStyle(2, 0x4a3320, 1);
      g.beginPath();
      g.moveTo(cx + mirror * 4, cy);
      g.lineTo(cx + mirror * (4 + len * dx), cy + dy * len);
      g.strokePath();
    };
    root(-1, 1, 0.2, 22);
    root(1, 1, 0.2, 22);
    root(-1, 0.85, -0.45, 18);
    root(1, 0.85, -0.45, 18);
    root(-1, 0.6, 0.7, 16);
    root(1, 0.6, 0.7, 16);

    // Tiny leaf pixels at root tips for character
    const leafTip = (lx: number, ly: number): void => {
      g.fillStyle(0x6effa0, 1);
      g.fillRect(lx - 1, ly, 2, 1);
      g.fillRect(lx, ly - 1, 1, 2);
      g.fillStyle(0xa8ffd0, 1);
      g.fillRect(lx, ly, 1, 1);
    };
    leafTip(cx - 22, cy + 4);
    leafTip(cx + 22, cy + 4);
    leafTip(cx - 19, cy - 8);
    leafTip(cx + 19, cy - 8);

    // FLAT-VECTOR — bold outline disk + single flat green fill + two clean
    // wood-grain rings + bright glow core + one highlight + eye pits.
    g.fillStyle(0x041a08, 1);
    g.fillCircle(cx, cy, 22);
    g.fillStyle(0x2d6634, 1);
    g.fillCircle(cx, cy, 19.5);
    // Two clean concentric rings for the wood-grain read.
    g.lineStyle(1.5, 0x1f4a26, 1);
    g.strokeCircle(cx, cy, 14);
    g.strokeCircle(cx, cy, 9);
    g.lineStyle(0, 0, 0);

    // Single top-left highlight crescent.
    g.fillStyle(0x4ea656, 0.7);
    g.fillEllipse(cx - 6, cy - 11, 12, 5);

    // Bright glow core.
    g.fillStyle(0x6effa0, 0.9);
    g.fillCircle(cx, cy, 6.5);
    g.fillStyle(0xa8ffd0, 1);
    g.fillCircle(cx, cy, 3.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 1, cy - 1, 1.4);

    // Two eye pits to read as a face on the trunk.
    g.fillStyle(0x041a08, 1);
    g.fillCircle(cx - 8, cy - 4, 1.6);
    g.fillCircle(cx + 8, cy - 4, 1.6);

    g.generateTexture(TextureKeys.BossForestHeart, w, h);
  }

  // ---------------------------------------------------------------------------
  // Thorn projectile
  // ---------------------------------------------------------------------------

  /**
   * Thorn (Vine Sprout's projectile). Tip points right at +x so callers can
   * `setRotation(angle)` to face their velocity. Outlined dark body + mid
   * green + bright ridge highlight + tip glint + soft halo.
   */
  private drawThornTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 22;
    const cy = h / 2;
    const tipX = w - 4;
    const baseX = 4;

    g.clear();

    // FLAT-VECTOR — soft halo, bold outline triangle, flat green body, one
    // ridge highlight, tip glint.
    g.fillStyle(0x6effa0, 0.22);
    g.fillEllipse(w / 2, cy, w - 6, h - 6);

    // Bold outline triangle.
    g.fillStyle(0x041a08, 1);
    g.fillTriangle(baseX - 1, cy - 7, tipX + 1, cy, baseX - 1, cy + 7);

    // Flat green body.
    g.fillStyle(0x2d6634, 1);
    g.fillTriangle(baseX + 1, cy - 5, tipX - 1, cy, baseX + 1, cy + 5);

    // Single bright ridge highlight along the top edge.
    g.fillStyle(0x88ffaa, 1);
    g.fillTriangle(baseX + 3, cy - 3, tipX - 4, cy - 0.5, baseX + 4, cy - 0.5);

    // Tip glint.
    g.fillStyle(0xfaffe0, 1);
    g.fillCircle(tipX - 1, cy, 1.6);
    g.fillStyle(0xffffff, 1);
    g.fillRect(tipX - 1, cy - 1, 1, 1);

    g.generateTexture(TextureKeys.Thorn, w, h);
  }

  /**
   * Sapphire-Swamp counterpart of the default Thorn texture. Same silhouette
   * + dimensions so it slots into `EnemyProjectile` without any layout work
   * — only the palette swaps to a sapphire/cyan ramp so swamp bosses + mobs
   * don't fire visibly emerald-tinted shards. The pool defaults to this
   * texture whenever the active floor is `sapphire-swamp`.
   */
  private drawSapphireThornTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 22;
    const cy = h / 2;
    const tipX = w - 4;
    const baseX = 4;

    g.clear();

    // FLAT-VECTOR — soft cyan halo, bold dark outline triangle, single
    // flat sapphire body, one top-edge highlight + tip glint.
    g.fillStyle(0x4ad8ff, 0.3);
    g.fillEllipse(w / 2, cy, w - 8, h - 8);

    // Bold dark outline triangle
    g.fillStyle(0x041a30, 1);
    g.fillTriangle(baseX - 1, cy - 7, tipX + 1, cy, baseX - 1, cy + 7);

    // Flat sapphire body
    g.fillStyle(0x2d6ad0, 1);
    g.fillTriangle(baseX + 1, cy - 5, tipX - 2, cy, baseX + 1, cy + 5);

    // Single top-edge highlight ridge
    g.fillStyle(0x9ce4ff, 1);
    g.fillTriangle(baseX + 3, cy - 3, tipX - 4, cy - 0.5, tipX - 4, cy + 0.5);

    // Tip glint
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX - 1, cy, 1.4);

    g.generateTexture(TextureKeys.SapphireThorn, w, h);
  }

  // ---------------------------------------------------------------------------
  // Hearts
  // ---------------------------------------------------------------------------

  /**
   * Three heart variants (full / half / empty) used by the HUD's
   * HealthDisplay to render the player's HP at HP_PER_HEART granularity.
   * Pixel-art heart silhouette with explicit outline ring, two-tone fill, and
   * a top-left highlight. Half-heart fills only the left lobe; empty shows
   * just the dark inside.
   */
  private drawHeartTextures(g: Phaser.GameObjects.Graphics): void {
    const size = 18;
    const HEART_RED = 0xd83a3a;
    const HEART_RED_HI = 0xff8888;
    const HEART_EMPTY = 0x3a2a2a;
    const OUTLINE = 0x180404;
    const cx = size / 2;

    // FLAT-VECTOR heart — bold outline + flat fill per half + one highlight.
    // Built from two top lobes (circles) + a bottom triangle so each half can
    // be filled independently (full / half / empty hearts).
    const paintHalf = (side: -1 | 1, fill: number): void => {
      // Lobe (top) — circle on this side.
      g.fillStyle(fill, 1);
      g.fillCircle(cx + side * 2.6, 6, 3.6);
      // Body — a half-rectangle + tapering triangle to the bottom point.
      if (side === -1) {
        g.fillRect(cx - 6, 6, 6, 3);
        g.fillTriangle(cx - 6, 8.5, cx, 8.5, cx, 14.5);
      } else {
        g.fillRect(cx, 6, 6, 3);
        g.fillTriangle(cx + 6, 8.5, cx, 8.5, cx, 14.5);
      }
    };

    const draw = (leftFill: number, rightFill: number, addHighlight: boolean): void => {
      // Bold outline silhouette behind both halves.
      g.fillStyle(OUTLINE, 1);
      g.fillCircle(cx - 2.6, 6, 4.6);
      g.fillCircle(cx + 2.6, 6, 4.6);
      g.fillRect(cx - 7, 6, 14, 3);
      g.fillTriangle(cx - 7, 8, cx + 7, 8, cx, 16);
      // Flat fill per half.
      paintHalf(-1, leftFill);
      paintHalf(1, rightFill);
      if (addHighlight) {
        // Single highlight on the upper-left lobe.
        g.fillStyle(HEART_RED_HI, 1);
        g.fillCircle(cx - 3, 5, 1.4);
      }
    };

    g.clear();
    draw(HEART_RED, HEART_RED, true);
    g.generateTexture(TextureKeys.HeartFull, size, size);

    g.clear();
    draw(HEART_RED, HEART_EMPTY, true);
    g.generateTexture(TextureKeys.HeartHalf, size, size);

    g.clear();
    draw(HEART_EMPTY, HEART_EMPTY, false);
    g.generateTexture(TextureKeys.HeartEmpty, size, size);
  }

  // ---------------------------------------------------------------------------
  // Coin pickup
  // ---------------------------------------------------------------------------

  /**
   * Coin pickup — golden disk with dark outline, two-tone gold body, bright
   * sparkle highlight, and a soft drop shadow underneath. 16×16 frame.
   */
  private drawCoinTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 16;
    const h = 16;
    const cx = w / 2;
    const cy = h / 2;

    g.clear();

    // FLAT-VECTOR — drop shadow, bold outline ring, flat gold body, one
    // highlight + a tiny star + sparkle.
    this.groundShadow(g, cx, h - 2, 4, 1.2, 0.45);
    g.fillStyle(0x4a3008, 1);
    g.fillCircle(cx, cy - 1, 6);
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx, cy - 1, 4.8);
    // Single highlight (top-left).
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(cx - 1.5, cy - 2.5, 1.6);
    // Tiny center star.
    g.fillStyle(0xc89a1a, 1);
    g.fillRect(cx - 1.5, cy - 1, 3, 1);
    g.fillRect(cx - 0.5, cy - 2.5, 1, 4);
    // Specular sparkle.
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 2, cy - 4, 1, 1);

    g.generateTexture(TextureKeys.Coin, w, h);
  }

  // ---------------------------------------------------------------------------
  // Key pickup
  // ---------------------------------------------------------------------------

  /**
   * Key pickup — golden skeleton key. Round bow (head) on the left, shaft
   * stretching right, two teeth on the bottom. Outlined and shaded. 18×14
   * frame so the bow has room without clipping.
   */
  private drawKeyTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 18;
    const h = 14;

    g.clear();

    // FLAT-VECTOR — bold outline + flat gold body. Round bow + shaft + teeth.
    this.groundShadow(g, w / 2, h - 2, 5, 1, 0.4);

    const OUT = 0x4a3008;
    const GOLD = 0xffd84a;
    const GOLD_HI = 0xfff0a0;

    // Bow (head ring) — outline + gold + dark hole.
    const bowCx = 4;
    const bowCy = 6;
    g.fillStyle(OUT, 1);
    g.fillCircle(bowCx, bowCy, 4);
    g.fillStyle(GOLD, 1);
    g.fillCircle(bowCx, bowCy, 3);
    g.fillStyle(0x2a1a04, 1);
    g.fillCircle(bowCx, bowCy, 1.4);
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(bowCx - 2, bowCy - 2, 1, 1);

    // Shaft — outline + flat gold + highlight stripe.
    g.fillStyle(OUT, 1);
    g.fillRect(7, 5, 9, 4);
    g.fillStyle(GOLD, 1);
    g.fillRect(7, 6, 9, 2);
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(8, 6, 6, 1);

    // Teeth.
    g.fillStyle(OUT, 1);
    g.fillRect(12, 8, 2, 3);
    g.fillRect(15, 8, 2, 3);
    g.fillStyle(GOLD, 1);
    g.fillRect(12, 8, 1, 2);
    g.fillRect(15, 8, 1, 2);

    g.generateTexture(TextureKeys.Key, w, h);
  }

  // ---------------------------------------------------------------------------
  // Crates (brown — free, gold — key-locked)
  // ---------------------------------------------------------------------------

  /**
   * Brown crate — wooden box on the floor. Three-tone wood, dark outline,
   * vertical plank seams, dark iron corner fittings, soft drop shadow.
   * 24×22 frame so it reads as a chunky container next to the smaller
   * coin / heart / key pickups.
   */
  private drawBrownCrateTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 24;
    const h = 22;
    g.clear();

    // Drop shadow under the base.
    this.groundShadow(g, w / 2, h - 2, 9, 1.5, 0.45);

    const OUT = 0x2a1a08;
    const WOOD_DARK = 0x6a3a14;
    const WOOD = 0x8a5020;
    const WOOD_HI = 0xb27038;
    const IRON = 0x1a1208;

    const bx = 2;
    const by = 4;
    const bw = w - 4;
    const bh = h - 6;

    // FLAT-VECTOR — bold outline box + flat wood fill + one top highlight +
    // clean plank seams + iron corner fittings.
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(bx, by, bw, bh, 2);
    g.fillStyle(WOOD, 1);
    g.fillRoundedRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, 1.5);
    g.fillStyle(WOOD_HI, 1);
    g.fillRect(bx + 2, by + 2, bw - 4, 2);

    // Clean plank seams.
    g.fillStyle(WOOD_DARK, 1);
    g.fillRect(bx + 7, by + 2, 1.5, bh - 4);
    g.fillRect(bx + 13, by + 2, 1.5, bh - 4);

    // Iron corner fittings.
    g.fillStyle(IRON, 1);
    g.fillRect(bx + 1.5, by + 1.5, 2.5, 2.5);
    g.fillRect(bx + bw - 4, by + 1.5, 2.5, 2.5);
    g.fillRect(bx + 1.5, by + bh - 4, 2.5, 2.5);
    g.fillRect(bx + bw - 4, by + bh - 4, 2.5, 2.5);

    g.generateTexture(TextureKeys.BrownCrate, w, h);
  }

  /**
   * Gold crate — locked variant. Warm three-tone gold body, dark outline,
   * iron-coloured corner fittings tinted gold, oval keyhole in the centre,
   * soft golden glow halo beneath. Same 24×22 frame as the brown crate so
   * they read as the same object class.
   */
  private drawGoldCrateTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 24;
    const h = 22;
    g.clear();

    // Soft golden glow halo beneath the crate so it stands out from
    // ordinary props.
    g.fillStyle(0xffe066, 0.25);
    g.fillEllipse(w / 2, h - 1, 16, 4);

    // Drop shadow under the base (a bit darker than brown, sits under the glow).
    this.groundShadow(g, w / 2, h - 2, 9, 1.5, 0.4);

    const OUT = 0x3a2810;
    const GOLD = 0xffd84a;
    const GOLD_HI = 0xfff0a0;
    const FITTING = 0x6a4a14;
    const KEYHOLE = 0x1a1208;

    const bx = 2;
    const by = 4;
    const bw = w - 4;
    const bh = h - 6;

    // FLAT-VECTOR — bold outline box + flat gold fill + one top highlight +
    // ornament corner fittings + keyhole.
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(bx, by, bw, bh, 2);
    g.fillStyle(GOLD, 1);
    g.fillRoundedRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, 1.5);
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(bx + 2, by + 2, bw - 4, 2);

    // Corner fittings.
    g.fillStyle(FITTING, 1);
    g.fillRect(bx + 1.5, by + 1.5, 2.5, 2.5);
    g.fillRect(bx + bw - 4, by + 1.5, 2.5, 2.5);
    g.fillRect(bx + 1.5, by + bh - 4, 2.5, 2.5);
    g.fillRect(bx + bw - 4, by + bh - 4, 2.5, 2.5);

    // Keyhole — circle + tail.
    const kx = bx + Math.floor(bw / 2);
    const ky = by + Math.floor(bh / 2);
    g.fillStyle(KEYHOLE, 1);
    g.fillCircle(kx, ky - 1, 1.6);
    g.fillRect(kx - 0.5, ky, 1.5, 3);

    g.generateTexture(TextureKeys.GoldCrate, w, h);
  }

  // ---------------------------------------------------------------------------
  // Stairs / trapdoor — spawned after a boss kill, walks player to next floor.
  // ---------------------------------------------------------------------------

  /**
   * Top-down view of stone stairs descending into a dark pit. A faint
   * white rim glow telegraphs "you can interact with this". Floor-agnostic
   * (no theme palette) so the same sprite works on every floor.
   */
  /**
   * Magical sigil-portal — the descend-to-next-floor anchor. Top-down view
   * of an inscribed gold rune disc with a 6-pointed star, cardinal spikes,
   * and a soft glowing halo. Replaces the prior stone-stair texture, which
   * read as "dungeon steps" and felt out of place in the wizard-themed
   * forest / swamp / mansion floors. The disc itself is symmetric so an
   * in-scene rotation tween lands cleanly without visual hitching.
   *
   * Palette is intentionally floor-neutral (warm gold + ivory) so the same
   * texture works across every floor; adding a per-floor tint later only
   * needs `setTint` on the sprite, no per-floor texture variants.
   */
  private drawStairsTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 44;
    const h = 44;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    // 1) Soft halo — three concentric alpha discs, ascending opacity.
    g.fillStyle(0xffd84a, 0.10);
    g.fillCircle(cx, cy, 22);
    g.fillStyle(0xffd84a, 0.18);
    g.fillCircle(cx, cy, 17);
    g.fillStyle(0xfff4c0, 0.28);
    g.fillCircle(cx, cy, 12);

    // 2) Outer ring stroke (gold band, ~2 px). Drawn as filled-disc minus
    //    inner-disc so the ring sits cleanly on the dark interior.
    g.fillStyle(0xffe78a, 1);
    g.fillCircle(cx, cy, 19);
    g.fillStyle(0x14100a, 1);
    g.fillCircle(cx, cy, 17);

    // 3) Cardinal spikes — four small gold triangles poking outward at
    //    N/E/S/W. Visually "ties" the inscribed disc to the four directions.
    const drawSpike = (a: number): void => {
      const tipR = 22;
      const baseR = 18;
      const halfBase = 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const perpX = -sinA;
      const perpY = cosA;
      const tipX = cx + cosA * tipR;
      const tipY = cy + sinA * tipR;
      const aX = cx + cosA * baseR + perpX * halfBase;
      const aY = cy + sinA * baseR + perpY * halfBase;
      const bX = cx + cosA * baseR - perpX * halfBase;
      const bY = cy + sinA * baseR - perpY * halfBase;
      g.fillStyle(0xffe78a, 1);
      g.fillTriangle(tipX, tipY, aX, aY, bX, bY);
    };
    for (let i = 0; i < 4; i++) {
      // Start at -PI/2 (north) and step a quarter-turn.
      drawSpike(-Math.PI / 2 + (i / 4) * Math.PI * 2);
    }

    // 4) Six-pointed star (two overlapping equilateral triangles). The
    //    classic "wizard inscription" look. Slightly translucent so the
    //    dark interior shows through as a faint shadow.
    g.fillStyle(0xffe78a, 0.85);
    g.fillTriangle(cx, cy - 11, cx - 9, cy + 5, cx + 9, cy + 5);
    g.fillTriangle(cx, cy + 11, cx - 9, cy - 5, cx + 9, cy - 5);

    // 5) Inner ring — small gold band around the central glow dot.
    g.fillStyle(0xffe78a, 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(0x14100a, 1);
    g.fillCircle(cx, cy, 4);

    // 6) Central glow dot + sparkle pixel — the "step on me" beacon.
    g.fillStyle(0xfff4c0, 1);
    g.fillCircle(cx, cy, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 1, cy - 1, 1, 1);

    g.generateTexture(TextureKeys.Stairs, w, h);
  }

  // ---------------------------------------------------------------------------
  // Item pedestal (Treasure-room altar)
  // ---------------------------------------------------------------------------

  /**
   * Item pedestal — small grey stone altar drawn in the same outlined,
   * three-tone style as the rest. 28×16 frame. Items will be placed visually
   * on top of this in a later chunk; here it's just the static texture.
   */
  private drawItemPedestalTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 28;
    const h = 16;
    const cx = w / 2;

    g.clear();

    // Drop shadow under base
    this.groundShadow(g, cx, h - 2, 11, 2, 0.5);

    const OUT = 0x141416;
    const STONE = 0x4a4d56;
    const TOP_HI = 0x9aa0b0;

    // FLAT-VECTOR — bold outline + flat stone fill + one highlight strip.
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(2, 7, w - 4, 8, 1.5);
    g.fillStyle(STONE, 1);
    g.fillRect(3.5, 8, w - 7, 5.5);

    // Upper platform (altar top).
    g.fillStyle(OUT, 1);
    g.fillRoundedRect(5, 3, w - 10, 5, 1.5);
    g.fillStyle(STONE, 1);
    g.fillRect(6, 4, w - 12, 3);
    g.fillStyle(TOP_HI, 1);
    g.fillRect(7, 4, w - 14, 1);

    g.generateTexture(TextureKeys.ItemPedestal, w, h);
  }

  // ---------------------------------------------------------------------------
  // Item icons
  //
  // All seven sit on a 14×14 frame, drawn in the same outline + body + highlight
  // style as the rest of the sprite set. They're rendered floating above the
  // pedestal, so each leaves a 1–2 px transparent border for breathing room.
  // ---------------------------------------------------------------------------

  /** Magic Tome — closed book with golden bookmark + cover star. */
  private drawItemMagicTomeTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x1a0830;
    const COVER = 0x6a2cb8;
    const COVER_HI = 0x9460d8;
    const PAGE = 0xf0e8d0;
    const BOOKMARK = 0xffd84a;
    const STAR = 0xfff8c0;

    // Page block (peek along the right edge)
    g.fillStyle(PAGE, 1);
    g.fillRect(11, 3, 1, 9);

    // Cover outline + body + highlight column
    g.fillStyle(OUT, 1);
    g.fillRect(2, 2, 10, 11);
    g.fillStyle(COVER, 1);
    g.fillRect(3, 3, 8, 9);
    g.fillStyle(COVER_HI, 1);
    g.fillRect(3, 3, 1, 9);

    // Cover star
    g.fillStyle(STAR, 1);
    g.fillRect(6, 6, 2, 1);
    g.fillRect(7, 5, 1, 3);
    g.fillRect(5, 7, 1, 1);
    g.fillRect(8, 7, 1, 1);

    // Bookmark hanging from the top
    g.fillStyle(BOOKMARK, 1);
    g.fillRect(9, 2, 1, 4);
    g.fillStyle(0xc89a1a, 1);
    g.fillRect(9, 5, 1, 1);

    g.generateTexture(TextureKeys.ItemMagicTome, w, h);
  }

  /** Hot Tea — cup with handle, brown tea inside, two steam wisps. */
  private drawItemHotTeaTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x2a1208;
    const CUP = 0xf0e0c8;
    const CUP_HI = 0xffffff;
    const TEA = 0x8a4a1a;
    const TEA_HI = 0xb87040;
    const STEAM = 0xfff8e8;

    // Steam wisps
    g.fillStyle(STEAM, 0.85);
    g.fillRect(5, 1, 1, 2);
    g.fillRect(6, 2, 1, 1);
    g.fillRect(7, 3, 1, 1);
    g.fillRect(8, 1, 1, 2);
    g.fillRect(9, 2, 1, 1);

    // Cup outline
    g.fillStyle(OUT, 1);
    g.fillRect(3, 5, 8, 8);
    // Handle outline + interior
    g.fillRect(11, 7, 2, 4);
    g.fillStyle(CUP, 1);
    g.fillRect(11, 8, 1, 2);

    // Cup body
    g.fillStyle(CUP, 1);
    g.fillRect(4, 6, 6, 6);
    // Cup highlight (left edge)
    g.fillStyle(CUP_HI, 1);
    g.fillRect(4, 6, 1, 5);

    // Tea surface (top inner row + body)
    g.fillStyle(TEA, 1);
    g.fillRect(4, 6, 6, 2);
    g.fillStyle(TEA_HI, 1);
    g.fillRect(5, 6, 4, 1);

    g.generateTexture(TextureKeys.ItemHotTea, w, h);
  }

  /** Wizard's Sneakers — small boot with sole + tiny wing. */
  private drawItemWizardSneakersTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x100808;
    const BOOT = 0x4a2c4c;
    const BOOT_HI = 0x7a4c80;
    const SOLE = 0xd0d0d0;
    const WING = 0xfff8e0;
    const WING_OUT = 0x7a8090;

    // Wing on the back / heel
    g.fillStyle(WING_OUT, 1);
    g.fillRect(2, 5, 4, 3);
    g.fillStyle(WING, 1);
    g.fillRect(2, 6, 3, 1);
    g.fillRect(3, 7, 2, 1);

    // Boot outline
    g.fillStyle(OUT, 1);
    g.fillRect(4, 5, 8, 6);
    g.fillRect(3, 7, 9, 4);
    // Boot fill
    g.fillStyle(BOOT, 1);
    g.fillRect(5, 6, 6, 4);
    g.fillRect(4, 8, 7, 2);
    // Boot highlight
    g.fillStyle(BOOT_HI, 1);
    g.fillRect(5, 6, 5, 1);
    g.fillRect(5, 8, 1, 1);

    // Sole
    g.fillStyle(OUT, 1);
    g.fillRect(3, 11, 9, 1);
    g.fillStyle(SOLE, 1);
    g.fillRect(4, 11, 7, 1);

    g.generateTexture(TextureKeys.ItemWizardSneakers, w, h);
  }

  /** Telescopic Wand — slim shaft + golden orb tip + sparkle. */
  private drawItemTelescopicWandTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x1a0830;
    const SHAFT = 0xc89758;
    const SHAFT_HI = 0xf0c89a;
    const ORB = 0xffd84a;
    const ORB_HI = 0xfff8c0;

    // Shaft (diagonal from bottom-left to top-right)
    g.fillStyle(OUT, 1);
    for (let i = 0; i < 8; i++) {
      g.fillRect(2 + i, 11 - i, 2, 2);
    }
    g.fillStyle(SHAFT, 1);
    for (let i = 0; i < 7; i++) {
      g.fillRect(3 + i, 11 - i, 1, 1);
    }
    g.fillStyle(SHAFT_HI, 1);
    g.fillRect(4, 9, 1, 1);
    g.fillRect(6, 7, 1, 1);

    // Orb tip
    g.fillStyle(OUT, 1);
    g.fillCircle(11, 3, 2.6);
    g.fillStyle(ORB, 1);
    g.fillCircle(11, 3, 2);
    g.fillStyle(ORB_HI, 1);
    g.fillRect(10, 2, 1, 1);

    // Sparkle pixel
    g.fillStyle(0xffffff, 1);
    g.fillRect(13, 1, 1, 1);
    g.fillRect(8, 2, 1, 1);

    g.generateTexture(TextureKeys.ItemTelescopicWand, w, h);
  }

  /** Lead Cap — heavy grey skullcap with hatching for "weight". */
  private drawItemLeadCapTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x0a0a0e;
    const CAP_DARK = 0x2a2c34;
    const CAP = 0x4a4d56;
    const CAP_HI = 0x707380;
    const HATCH = 0x14141a;

    // Cap dome
    g.fillStyle(OUT, 1);
    g.fillEllipse(7, 7, 11, 9);
    g.fillStyle(CAP_DARK, 1);
    g.fillEllipse(7, 7, 9, 7);
    g.fillStyle(CAP, 1);
    g.fillEllipse(7, 6, 8, 5);
    // Highlight band (top-left)
    g.fillStyle(CAP_HI, 1);
    g.fillEllipse(6, 5, 4, 2);

    // Brim
    g.fillStyle(OUT, 1);
    g.fillRect(2, 9, 11, 2);
    g.fillStyle(CAP_DARK, 1);
    g.fillRect(3, 10, 9, 1);

    // Hatching to read as "heavy / lead"
    g.fillStyle(HATCH, 1);
    g.fillRect(5, 5, 1, 1);
    g.fillRect(7, 4, 1, 1);
    g.fillRect(9, 6, 1, 1);
    g.fillRect(6, 7, 1, 1);
    g.fillRect(8, 8, 1, 1);

    g.generateTexture(TextureKeys.ItemLeadCap, w, h);
  }

  /** Magic Potion — round flask with cork stopper, glowing arcane-blue
   * liquid, glass shine + halo + sparkle pixels. Distinct from Pixie Dust
   * (which is a magenta vertical vial) by silhouette + color: round body,
   * blue liquid, blue halo. */
  private drawItemMagicPotionTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x1a0414;
    const GLASS_HI = 0xc4e8ff;
    const LIQUID = 0x4080ff;
    const LIQUID_HI = 0xa0d4ff;
    const CORK = 0x8a5a2a;
    const CORK_HI = 0xc89758;
    const SPARK = 0xffffff;

    // Halo (subtle blue arcane glow behind the bottle)
    g.fillStyle(0x4080ff, 0.18);
    g.fillCircle(7, 8, 6);
    g.fillStyle(0x4080ff, 0.32);
    g.fillCircle(7, 8, 4);

    // Cork (top)
    g.fillStyle(OUT, 1);
    g.fillRect(5, 0, 4, 3);
    g.fillStyle(CORK, 1);
    g.fillRect(5, 1, 4, 1);
    g.fillStyle(CORK_HI, 1);
    g.fillRect(5, 1, 1, 1);

    // Neck outline (narrow, between cork and body)
    g.fillStyle(OUT, 1);
    g.fillRect(5, 3, 1, 2);
    g.fillRect(8, 3, 1, 2);

    // Bottle body outline (rounded flask shape)
    g.fillRect(4, 5, 1, 1); // top-left curve
    g.fillRect(9, 5, 1, 1); // top-right curve
    g.fillRect(3, 6, 1, 5); // left side
    g.fillRect(10, 6, 1, 5); // right side
    g.fillRect(4, 11, 1, 1); // bottom-left curve
    g.fillRect(9, 11, 1, 1); // bottom-right curve
    g.fillRect(5, 12, 4, 1); // bottom

    // Liquid filling neck + body
    g.fillStyle(LIQUID, 1);
    g.fillRect(6, 3, 2, 2); // neck interior
    g.fillRect(5, 5, 4, 1); // top of body
    g.fillRect(4, 6, 6, 5); // main body
    g.fillRect(5, 11, 4, 1); // bottom round

    // Liquid surface bubbles + highlights
    g.fillStyle(LIQUID_HI, 1);
    g.fillRect(5, 7, 1, 1);
    g.fillRect(7, 9, 1, 1);
    g.fillRect(8, 6, 1, 1);

    // Glass shine — subtle vertical streak on the left of the body
    g.fillStyle(GLASS_HI, 0.4);
    g.fillRect(4, 7, 1, 3);

    // Sparkle pixels around the bottle for magical aura
    g.fillStyle(SPARK, 1);
    g.fillRect(2, 4, 1, 1);
    g.fillRect(12, 6, 1, 1);
    g.fillRect(11, 11, 1, 1);

    g.generateTexture(TextureKeys.ItemMagicPotion, w, h);
  }

  /** Pixie Dust — magenta vial with sparkle + glow halo. */
  private drawItemPixieDustTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x1a0414;
    const GLASS = 0xff44aa;
    const GLASS_HI = 0xffa0d8;
    const CORK = 0x8a5a2a;
    const CORK_HI = 0xc89758;

    // Halo
    g.fillStyle(0xff44aa, 0.22);
    g.fillCircle(7, 8, 6);
    g.fillStyle(0xff44aa, 0.4);
    g.fillCircle(7, 8, 4);

    // Vial body outline
    g.fillStyle(OUT, 1);
    g.fillRect(4, 5, 6, 8);
    g.fillRect(5, 4, 4, 1);
    // Vial fill (magenta)
    g.fillStyle(GLASS, 1);
    g.fillRect(5, 6, 4, 6);
    // Highlight column
    g.fillStyle(GLASS_HI, 1);
    g.fillRect(5, 6, 1, 5);

    // Cork
    g.fillStyle(OUT, 1);
    g.fillRect(5, 2, 4, 3);
    g.fillStyle(CORK, 1);
    g.fillRect(5, 3, 4, 1);
    g.fillStyle(CORK_HI, 1);
    g.fillRect(5, 3, 1, 1);

    // Sparkle pixels
    g.fillStyle(0xffffff, 1);
    g.fillRect(7, 7, 1, 1);
    g.fillRect(2, 5, 1, 1);
    g.fillRect(11, 9, 1, 1);

    g.generateTexture(TextureKeys.ItemPixieDust, w, h);
  }

  /** Heart Container — outlined ruby heart with a soft gold glow halo. */
  private drawItemHeartContainerTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x2a0410;
    const HEART = 0xe0274a;
    const HEART_HI = 0xff7a90;
    const GLOW = 0xffd84a;
    const cx = 7;

    // FLAT-VECTOR — soft gold halo, bold outline heart + single flat ruby
    // fill + one highlight.
    g.fillStyle(GLOW, 0.2);
    g.fillCircle(7, 7, 6);
    g.fillStyle(OUT, 1);
    g.fillCircle(cx - 2.6, 5, 3.6);
    g.fillCircle(cx + 2.6, 5, 3.6);
    g.fillRect(cx - 5.5, 5, 11, 2.5);
    g.fillTriangle(cx - 5.5, 6.5, cx + 5.5, 6.5, cx, 13);
    g.fillStyle(HEART, 1);
    g.fillCircle(cx - 2.4, 5, 2.6);
    g.fillCircle(cx + 2.4, 5, 2.6);
    g.fillRect(cx - 4.4, 5, 9, 2);
    g.fillTriangle(cx - 4.4, 6.5, cx + 4.4, 6.5, cx, 11.5);
    g.fillStyle(HEART_HI, 1);
    g.fillCircle(cx - 3, 4, 1.2);

    g.generateTexture(TextureKeys.ItemHeartContainer, w, h);
  }

  /** Crown of the Vine — emerald-green spiked crown with leafy uprights. */
  private drawItemCrownOfTheVineTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x081a0e;
    const VINE = 0x2a8a44;
    const VINE_HI = 0x6effa0;
    const GEM = 0x9effc8;

    // Crown band
    g.fillStyle(OUT, 1);
    g.fillRect(2, 8, 10, 4);
    g.fillStyle(VINE, 1);
    g.fillRect(3, 9, 8, 2);
    g.fillStyle(VINE_HI, 1);
    g.fillRect(3, 9, 8, 1);

    // Three vine spikes (centre + two sides)
    g.fillStyle(OUT, 1);
    // Centre spike
    g.fillRect(6, 3, 2, 6);
    g.fillRect(5, 4, 4, 1);
    // Left spike
    g.fillRect(2, 5, 2, 4);
    // Right spike
    g.fillRect(10, 5, 2, 4);

    g.fillStyle(VINE, 1);
    g.fillRect(6, 4, 2, 4);
    g.fillRect(2, 6, 2, 2);
    g.fillRect(10, 6, 2, 2);
    g.fillStyle(VINE_HI, 1);
    g.fillRect(6, 4, 1, 4);
    g.fillRect(2, 6, 1, 2);
    g.fillRect(10, 6, 1, 2);

    // Centre gem dot
    g.fillStyle(GEM, 1);
    g.fillRect(6, 9, 2, 1);

    g.generateTexture(TextureKeys.ItemCrownOfTheVine, w, h);
  }

  /** Ancient Heart — desaturated bronze heart with a glowing inner core. */
  private drawItemAncientHeartTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x140808;
    const SHELL = 0x6a4828;
    const SHELL_HI = 0xa07840;
    const CORE = 0xff7a48;
    const CORE_HI = 0xfff8c0;
    const cx = 7;

    // FLAT-VECTOR — bold outline heart + single flat shell fill + one
    // highlight + a glowing core.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx - 2.4, 5, 3.4);
    g.fillCircle(cx + 2.4, 5, 3.4);
    g.fillRect(cx - 5, 5, 10, 2.5);
    g.fillTriangle(cx - 5, 6.5, cx + 5, 6.5, cx, 12.5);
    g.fillStyle(SHELL, 1);
    g.fillCircle(cx - 2.2, 5, 2.4);
    g.fillCircle(cx + 2.2, 5, 2.4);
    g.fillRect(cx - 4, 5, 8, 2);
    g.fillTriangle(cx - 4, 6.5, cx + 4, 6.5, cx, 11);
    g.fillStyle(SHELL_HI, 1);
    g.fillCircle(cx - 3, 4, 1);

    // Glowing core.
    g.fillStyle(CORE, 1);
    g.fillCircle(cx, 6, 1.6);
    g.fillStyle(CORE_HI, 1);
    g.fillRect(cx - 1, 5.5, 1, 1);

    g.generateTexture(TextureKeys.ItemAncientHeart, w, h);
  }

  /** Withered Fang — chipped bone-yellow tooth with a dark crack. */
  private drawItemWitheredFangTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x140a0a;
    const FANG = 0xe8d8a8;
    const FANG_HI = 0xfff8d0;
    const FANG_SHADOW = 0x9a805a;
    const CRACK = 0x3a1a0a;

    // Fang outline (taper from wide top to point at bottom)
    g.fillStyle(OUT, 1);
    g.fillRect(4, 2, 6, 1);
    g.fillRect(3, 3, 8, 1);
    g.fillRect(3, 4, 8, 5);
    g.fillRect(4, 9, 6, 1);
    g.fillRect(5, 10, 4, 1);
    g.fillRect(6, 11, 2, 1);

    g.fillStyle(FANG, 1);
    g.fillRect(4, 3, 6, 1);
    g.fillRect(4, 4, 6, 5);
    g.fillRect(5, 9, 4, 1);
    g.fillRect(6, 10, 2, 1);

    // Highlight column
    g.fillStyle(FANG_HI, 1);
    g.fillRect(4, 4, 1, 4);

    // Shadow column on the right side
    g.fillStyle(FANG_SHADOW, 1);
    g.fillRect(9, 5, 1, 4);

    // Crack (jagged dark line)
    g.fillStyle(CRACK, 1);
    g.fillRect(7, 4, 1, 1);
    g.fillRect(6, 5, 1, 1);
    g.fillRect(7, 6, 1, 1);
    g.fillRect(6, 7, 1, 1);

    g.generateTexture(TextureKeys.ItemWitheredFang, w, h);
  }

  /**
   * Spyglass — pixel telescope with brass barrel + bright lens. 14×14 to
   * match the rest of the item icon family.
   */
  private drawItemSpyglassTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();
    const OUT = 0x080604;
    const BARREL_DARK = 0x6a4a14;
    const BARREL = 0xc89a3a;
    const BARREL_HI = 0xffd84a;
    const LENS = 0x9ad8ff;
    const LENS_HI = 0xffffff;

    // Diagonal barrel from top-left to bottom-right.
    g.fillStyle(OUT, 1);
    g.fillRect(2, 3, 10, 1);
    g.fillRect(1, 4, 12, 1);
    g.fillRect(1, 9, 12, 1);
    g.fillRect(2, 10, 10, 1);
    g.fillRect(0, 4, 1, 5);
    g.fillRect(13, 4, 1, 5);

    g.fillStyle(BARREL_DARK, 1);
    g.fillRect(2, 4, 10, 6);
    g.fillStyle(BARREL, 1);
    g.fillRect(2, 5, 10, 4);
    g.fillStyle(BARREL_HI, 1);
    g.fillRect(2, 5, 10, 1);

    // Eyepiece flange (left)
    g.fillStyle(OUT, 1);
    g.fillRect(0, 3, 3, 7);
    g.fillStyle(BARREL_DARK, 1);
    g.fillRect(1, 4, 2, 5);
    g.fillStyle(BARREL, 1);
    g.fillRect(1, 5, 1, 3);

    // Lens flare (right end)
    g.fillStyle(LENS, 1);
    g.fillRect(11, 5, 2, 4);
    g.fillStyle(LENS_HI, 1);
    g.fillRect(11, 5, 1, 1);
    g.fillRect(12, 6, 1, 1);

    g.generateTexture(TextureKeys.ItemSpyglass, w, h);
  }

  /**
   * Lily Diadem — small sapphire-gem crown sitting on lily petals. Boss-
   * pool drop themed for Sapphire bosses.
   */
  private drawItemLilyDiademTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();
    const OUT = 0x080410;
    const PETAL = 0xffffff;
    const PETAL_PINK = 0xffd0e0;
    const STAMEN = 0xffd84a;
    const GOLD = 0xffd84a;
    const GOLD_DARK = 0x7a5a1a;
    const GEM = 0x4ad8ff;
    const GEM_HI = 0xb0e8ff;

    // Lily petal base (4 petals visible from above)
    g.fillStyle(OUT, 1);
    g.fillRect(3, 7, 8, 4);
    g.fillStyle(PETAL, 1);
    g.fillRect(4, 8, 6, 2);
    g.fillStyle(PETAL_PINK, 1);
    g.fillRect(4, 9, 6, 1);
    g.fillStyle(STAMEN, 1);
    g.fillRect(6, 8, 2, 1);

    // Crown band
    g.fillStyle(OUT, 1);
    g.fillRect(3, 4, 8, 4);
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(4, 5, 6, 3);
    g.fillStyle(GOLD, 1);
    g.fillRect(4, 5, 6, 2);

    // Crown peaks (3 points)
    g.fillStyle(OUT, 1);
    g.fillRect(3, 3, 1, 2);
    g.fillRect(6, 1, 1, 4);
    g.fillRect(7, 1, 1, 4);
    g.fillRect(10, 3, 1, 2);
    g.fillStyle(GOLD, 1);
    g.fillRect(6, 2, 2, 2);

    // Center sapphire gem
    g.fillStyle(OUT, 1);
    g.fillRect(6, 5, 2, 2);
    g.fillStyle(GEM, 1);
    g.fillRect(6, 5, 2, 2);
    g.fillStyle(GEM_HI, 1);
    g.fillRect(6, 5, 1, 1);

    g.generateTexture(TextureKeys.ItemLilyDiadem, w, h);
  }

  /**
   * Mire Pearl — sapphire pearl on a swamp-stem. Range-up themed item.
   */
  private drawItemMirePearlTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    const cx = w / 2;
    g.clear();
    const OUT = 0x040810;
    const PEARL_OUT = 0x183040;
    const PEARL = 0x4ad8ff;
    const PEARL_HI = 0xeaf8ff;
    const STEM = 0x1f3848;
    const STEM_HI = 0x3a607a;

    // Stem
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 1, 8, 2, 5);
    g.fillStyle(STEM, 1);
    g.fillRect(cx - 1, 9, 2, 3);
    g.fillStyle(STEM_HI, 1);
    g.fillRect(cx - 1, 9, 1, 3);
    // Stem leaves
    g.fillStyle(OUT, 1);
    g.fillRect(2, 10, 3, 1);
    g.fillRect(9, 11, 3, 1);
    g.fillStyle(STEM, 1);
    g.fillRect(2, 10, 2, 1);
    g.fillRect(10, 11, 2, 1);

    // Pearl orb
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, 5, 4);
    g.fillStyle(PEARL_OUT, 1);
    g.fillCircle(cx, 5, 3.4);
    g.fillStyle(PEARL, 1);
    g.fillCircle(cx, 5, 2.8);
    g.fillStyle(PEARL_HI, 1);
    g.fillCircle(cx - 1, 4, 1.4);

    g.generateTexture(TextureKeys.ItemMirePearl, w, h);
  }

  /**
   * Frog's Tongue — pink coiled tongue + tiny gold tip. Aggressive damage +
   * fire-rate item from the Sapphire boss pool.
   */
  private drawItemFrogTongueTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();
    const OUT = 0x4a0820;
    const TONGUE_DARK = 0xa83458;
    const TONGUE = 0xff7aa0;
    const TONGUE_HI = 0xffc0d8;
    const TIP = 0xffd84a;

    // Coiled tongue (S-shape)
    g.fillStyle(OUT, 1);
    g.fillRect(2, 4, 8, 1);
    g.fillRect(2, 5, 1, 4);
    g.fillRect(2, 8, 8, 1);
    g.fillRect(9, 9, 1, 3);
    g.fillRect(2, 11, 8, 1);

    g.fillStyle(TONGUE_DARK, 1);
    g.fillRect(3, 5, 7, 3);
    g.fillRect(3, 9, 7, 3);

    g.fillStyle(TONGUE, 1);
    g.fillRect(3, 5, 7, 2);
    g.fillRect(3, 9, 7, 2);
    g.fillStyle(TONGUE_HI, 1);
    g.fillRect(4, 5, 5, 1);
    g.fillRect(4, 9, 5, 1);

    // Stem connecting top + bottom (left edge)
    g.fillStyle(OUT, 1);
    g.fillRect(2, 6, 2, 4);
    g.fillStyle(TONGUE_DARK, 1);
    g.fillRect(3, 7, 1, 2);

    // Gold tongue-tip drop on right
    g.fillStyle(OUT, 1);
    g.fillRect(11, 4, 2, 2);
    g.fillStyle(TIP, 1);
    g.fillRect(11, 4, 1, 1);

    g.generateTexture(TextureKeys.ItemFrogTongue, w, h);
  }

  /**
   * Bloodbound Chalice — gold goblet brimming with crimson liquid.
   * Onyx boss-pool: +1 max HP, +20% damage. The blood-pact reward.
   */
  private drawItemBloodboundChaliceTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    const cx = w / 2;
    g.clear();
    const OUT = 0x100408;
    const GOLD_DARK = 0x7a5018;
    const GOLD = 0xffc850;
    const GOLD_HI = 0xfff0a8;
    const BLOOD_DARK = 0x6a0c1e;
    const BLOOD = 0xc8284a;
    const BLOOD_HI = 0xff6a80;

    // Stem + foot
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 2, 9, 4, 1);
    g.fillRect(cx - 1, 8, 2, 2);
    g.fillRect(cx - 3, 11, 6, 1);
    g.fillRect(cx - 3, 12, 6, 1);
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(cx - 1, 9, 2, 1);
    g.fillRect(cx - 2, 12, 4, 1);
    g.fillStyle(GOLD, 1);
    g.fillRect(cx - 2, 11, 4, 1);

    // Cup body (trapezoidal)
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 3, 2, 6, 6);
    g.fillRect(cx - 4, 3, 1, 4);
    g.fillRect(cx + 3, 3, 1, 4);
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(cx - 3, 3, 6, 5);
    g.fillStyle(GOLD, 1);
    g.fillRect(cx - 3, 3, 6, 3);
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(cx - 2, 3, 1, 3);

    // Blood surface + drip down side
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 2, 2, 4, 1);
    g.fillStyle(BLOOD_DARK, 1);
    g.fillRect(cx - 2, 2, 4, 2);
    g.fillStyle(BLOOD, 1);
    g.fillRect(cx - 2, 2, 4, 1);
    g.fillStyle(BLOOD_HI, 1);
    g.fillRect(cx - 1, 2, 1, 1);

    // Single blood drip on the rim
    g.fillStyle(OUT, 1);
    g.fillRect(cx + 2, 4, 1, 2);
    g.fillStyle(BLOOD, 1);
    g.fillRect(cx + 2, 4, 1, 1);

    g.generateTexture(TextureKeys.ItemBloodboundChalice, w, h);
  }

  /**
   * Vampire's Signet — gold ring with a crimson cabochon, lifted view so the
   * gem reads as the focal point. Onyx boss-pool: +25% fire rate, +15% missile
   * speed. The noble's pact reward.
   */
  private drawItemVampireSignetTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    const cx = w / 2;
    g.clear();
    const OUT = 0x100408;
    const GOLD_DARK = 0x7a5018;
    const GOLD = 0xffc850;
    const GOLD_HI = 0xfff0a8;
    const GEM_DARK = 0x6a0c1e;
    const GEM = 0xff4060;
    const GEM_HI = 0xffb0c0;

    // Outer band (ring profile, viewed from above, slightly oblique)
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, 8, 5);
    g.fillStyle(GOLD_DARK, 1);
    g.fillCircle(cx, 8, 4.4);
    g.fillStyle(GOLD, 1);
    g.fillCircle(cx, 8, 3.6);
    // Hollow center
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, 8, 2.2);
    g.fillStyle(0x1a0a14, 1);
    g.fillCircle(cx, 8, 1.6);

    // Top band highlight strip
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(cx - 2, 5, 4, 1);

    // Bezel + gem mounted on top of the band
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 3, 1, 6, 4);
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(cx - 2, 2, 4, 3);
    g.fillStyle(GOLD, 1);
    g.fillRect(cx - 2, 2, 4, 1);

    // Gem face (oval cabochon)
    g.fillStyle(OUT, 1);
    g.fillRect(cx - 2, 2, 4, 2);
    g.fillStyle(GEM_DARK, 1);
    g.fillRect(cx - 2, 2, 4, 2);
    g.fillStyle(GEM, 1);
    g.fillRect(cx - 1, 2, 3, 2);
    g.fillStyle(GEM_HI, 1);
    g.fillRect(cx - 1, 2, 1, 1);

    g.generateTexture(TextureKeys.ItemVampireSignet, w, h);
  }

  /**
   * Obsidian Heart — faceted amethyst-black crystal heart. Onyx boss-pool:
   * +1 damage, +40% range. The cursed-organ reward.
   */
  private drawItemObsidianHeartTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    const cx = w / 2;
    g.clear();
    const OUT = 0x080010;
    const STONE_DARK = 0x2a1838;
    const STONE = 0x4a2868;
    const STONE_MID = 0x6a3a90;
    const STONE_HI = 0x8a4ad8;
    const SPARK = 0xd0a8ff;
    const VEIN = 0xffb060;

    // FLAT-VECTOR — bold heart outline, single flat stone fill, one top-left
    // highlight facet, gold vein, sparkle.
    g.fillStyle(OUT, 1);
    g.fillCircle(cx - 2, 5, 3);
    g.fillCircle(cx + 2, 5, 3);
    g.fillRect(cx - 4, 5, 8, 4);
    g.fillTriangle(cx - 4, 7, cx + 4, 7, cx, 12);

    // Single flat stone body (inset).
    g.fillStyle(STONE, 1);
    g.fillCircle(cx - 2, 5, 2.4);
    g.fillCircle(cx + 2, 5, 2.4);
    g.fillRect(cx - 3, 5, 6, 3);
    g.fillTriangle(cx - 3, 7, cx + 3, 7, cx, 11);

    // Single top-left highlight facet.
    g.fillStyle(STONE_HI, 1);
    g.fillCircle(cx - 2, 4, 1.4);

    void STONE_DARK;
    void STONE_MID;

    // Gold vein crack (single thin diagonal — gothic "obsidian + gold inlay").
    g.fillStyle(VEIN, 1);
    g.fillRect(cx + 1, 6, 1, 1);
    g.fillRect(cx + 2, 7, 1, 1);

    // Sparkle pixel.
    g.fillStyle(SPARK, 1);
    g.fillRect(cx - 3, 4, 1, 1);

    g.generateTexture(TextureKeys.ItemObsidianHeart, w, h);
  }

  /**
   * Magic Shard — Pierce-Item-Icon. Schmaler, scharfer Crystal-Shard mit
   * Light-Cyan-Faceting + ein paar weißen Sparkle-Pixeln. Lese als
   * "schneidet sich durch Gegner".
   */
  private drawItemMagicShardTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    const cx = w / 2;
    g.clear();
    const OUT = 0x102838;
    const SHARD = 0x80c8e0;
    const SHARD_HI = 0xc8f0ff;
    const SPARK = 0xffffff;

    // FLAT-VECTOR — bold outline shard + single flat fill + one edge
    // highlight + sparkle.
    g.fillStyle(OUT, 1);
    g.fillTriangle(cx, 1, cx - 3, 9, cx + 3, 9);
    g.fillTriangle(cx - 3, 9, cx + 3, 9, cx + 1, 13);
    g.fillStyle(SHARD, 1);
    g.fillTriangle(cx, 3, cx - 2, 8.5, cx + 2, 8.5);
    g.fillTriangle(cx - 2, 8.5, cx + 2, 8.5, cx + 1, 11.5);
    // Single left-edge highlight.
    g.fillStyle(SHARD_HI, 1);
    g.fillRect(cx - 1, 4, 1, 5);
    // Sparkle.
    g.fillStyle(SPARK, 1);
    g.fillRect(cx + 1, 5, 1, 1);

    g.generateTexture(TextureKeys.ItemMagicShard, w, h);
  }

  /**
   * Wizard Glasses — Homing-Item-Icon. Zwei kleine runde Brillenkreise mit
   * goldenem Bügel + glühenden cyan-Linsen. Lese als "fokussiert auf das
   * Ziel" / weise Augen.
   */
  private drawItemWizardGlassesTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();
    const OUT = 0x101820;
    const GOLD = 0xd0a050;
    const GOLD_HI = 0xffd870;
    const LENS = 0x4ae0ff;
    const LENS_HI = 0xc0f8ff;
    const NOSE = 0xb08840;

    // Bridge bar between the lenses
    g.fillStyle(OUT, 1);
    g.fillRect(6, 7, 2, 1);
    g.fillStyle(GOLD, 1);
    g.fillRect(6, 7, 2, 1);

    // Outline rings
    g.fillStyle(OUT, 1);
    g.fillCircle(4, 7, 3);
    g.fillCircle(10, 7, 3);

    // Inner lens (cyan glow)
    g.fillStyle(LENS, 1);
    g.fillCircle(4, 7, 2);
    g.fillCircle(10, 7, 2);

    // Lens highlight
    g.fillStyle(LENS_HI, 1);
    g.fillRect(3, 6, 1, 1);
    g.fillRect(9, 6, 1, 1);

    // Gold rim accents
    g.fillStyle(GOLD, 1);
    g.fillRect(4, 4, 1, 1);
    g.fillRect(10, 4, 1, 1);
    g.fillRect(4, 10, 1, 1);
    g.fillRect(10, 10, 1, 1);

    // Bridge highlight
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(6, 7, 1, 1);

    // Tiny earpiece-like nose pads (hint of dimension)
    g.fillStyle(NOSE, 1);
    g.fillRect(1, 7, 1, 1);
    g.fillRect(12, 7, 1, 1);

    g.generateTexture(TextureKeys.ItemWizardGlasses, w, h);
  }

  /**
   * Fire Orb — Burn-DoT-Item-Icon. Orange-roter Glow-Orb mit drei Flame-
   * Tongues nach oben. Lese als "permanent brennende Ember".
   */
  private drawItemFireOrbTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    const cx = w / 2;
    g.clear();
    const OUT = 0x300800;
    const EMBER = 0xff5020;
    const FLAME = 0xff8030;
    const FLAME_HI = 0xfff060;
    const CORE = 0xffffd0;

    // FLAT-VECTOR — soft glow, bold outline orb + single flat ember fill +
    // one core highlight + three flat flame tongues.
    g.fillStyle(EMBER, 0.22);
    g.fillCircle(cx, 9, 6);
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, 9, 4);
    g.fillStyle(EMBER, 1);
    g.fillCircle(cx, 9, 3);
    g.fillStyle(CORE, 1);
    g.fillCircle(cx - 1, 8, 1.1);

    // Three flat flame tongues (outline + fill).
    g.fillStyle(OUT, 1);
    g.fillTriangle(cx - 1.5, 5, cx + 1.5, 5, cx, 0.5);
    g.fillTriangle(cx - 3.5, 6, cx - 1, 6, cx - 2.2, 2.5);
    g.fillTriangle(cx + 1, 6, cx + 3.5, 6, cx + 2.2, 2.5);
    g.fillStyle(FLAME, 1);
    g.fillTriangle(cx - 1, 5, cx + 1, 5, cx, 2);
    g.fillTriangle(cx - 3, 6, cx - 1.2, 6, cx - 2.1, 3.4);
    g.fillTriangle(cx + 1.2, 6, cx + 3, 6, cx + 2.1, 3.4);
    g.fillStyle(FLAME_HI, 1);
    g.fillRect(cx - 0.5, 3, 1, 2);

    g.generateTexture(TextureKeys.ItemFireOrb, w, h);
  }

  /**
   * Blood of Marquis — vial with crimson liquid, gold-trimmed wax cork,
   * crimson halo. Shape borrows the Magic Potion silhouette (rounded
   * flask) but the palette is much darker + the cork has a gold band so
   * it reads as the Marquis's signature item, not a generic potion.
   */
  private drawItemBloodOfMarquisTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x180408;
    const GLASS_HI = 0xffd0d8;
    const BLOOD_DARK = 0x500810;
    const BLOOD = 0xa01828;
    const BLOOD_HI = 0xe04050;
    const WAX = 0x300810;
    const WAX_HI = 0x5a1018;
    const GOLD_DARK = 0x7a5018;
    const GOLD = 0xffc850;
    const SPARK = 0xffa0a8;

    // Crimson halo — ominous glow, more intense than Magic Potion's blue
    g.fillStyle(0xa01828, 0.22);
    g.fillCircle(7, 8, 6);
    g.fillStyle(0xa01828, 0.36);
    g.fillCircle(7, 8, 4);

    // Wax-sealed cork (top) with gold trim band
    g.fillStyle(OUT, 1);
    g.fillRect(5, 0, 4, 3);
    g.fillStyle(WAX, 1);
    g.fillRect(5, 1, 4, 1);
    g.fillStyle(WAX_HI, 1);
    g.fillRect(5, 1, 1, 1);
    // Gold band wrapping the cork base
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(5, 2, 4, 1);
    g.fillStyle(GOLD, 1);
    g.fillRect(5, 2, 1, 1);

    // Neck outline (between cork and body)
    g.fillStyle(OUT, 1);
    g.fillRect(5, 3, 1, 2);
    g.fillRect(8, 3, 1, 2);

    // Bottle body outline (rounded flask)
    g.fillRect(4, 5, 1, 1);
    g.fillRect(9, 5, 1, 1);
    g.fillRect(3, 6, 1, 5);
    g.fillRect(10, 6, 1, 5);
    g.fillRect(4, 11, 1, 1);
    g.fillRect(9, 11, 1, 1);
    g.fillRect(5, 12, 4, 1);

    // Blood filling neck + body — darker base, brighter mid, brightest highlight
    g.fillStyle(BLOOD_DARK, 1);
    g.fillRect(6, 3, 2, 2);
    g.fillRect(5, 5, 4, 1);
    g.fillRect(4, 6, 6, 5);
    g.fillRect(5, 11, 4, 1);
    // Mid-tone surface band — sloshing meniscus
    g.fillStyle(BLOOD, 1);
    g.fillRect(5, 6, 4, 2);
    g.fillRect(4, 8, 6, 2);
    // Highlight droplets — small clots floating in the liquid
    g.fillStyle(BLOOD_HI, 1);
    g.fillRect(5, 7, 1, 1);
    g.fillRect(7, 9, 1, 1);
    g.fillRect(8, 6, 1, 1);

    // Glass shine — vertical streak on the left of the body
    g.fillStyle(GLASS_HI, 0.35);
    g.fillRect(4, 7, 1, 3);

    // Sparkle pixels around the bottle for ominous aura
    g.fillStyle(SPARK, 1);
    g.fillRect(2, 4, 1, 1);
    g.fillRect(12, 6, 1, 1);
    g.fillRect(11, 11, 1, 1);

    g.generateTexture(TextureKeys.ItemBloodOfMarquis, w, h);
  }

  /**
   * Empty-vial variant of Blood of Marquis. Same silhouette, cork, gold
   * trim band, glass shine — no liquid inside + dimmer halo. The active-
   * item slot swaps to this texture when the active is un-usable (HP < 2)
   * so the "spent" state reads visually, not just via greyed-out alpha.
   */
  private drawItemBloodOfMarquisEmptyTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x180408;
    const GLASS_HI = 0xffd0d8;
    const GLASS_DARK = 0x2a0810;
    const WAX = 0x300810;
    const WAX_HI = 0x5a1018;
    const GOLD_DARK = 0x7a5018;
    const GOLD = 0xffc850;
    const RESIDUE = 0x500810;

    // Dim crimson halo — much subtler than the full vial's, signals "spent"
    g.fillStyle(0xa01828, 0.1);
    g.fillCircle(7, 8, 6);
    g.fillStyle(0xa01828, 0.16);
    g.fillCircle(7, 8, 4);

    // Cork (top) — same as full vial
    g.fillStyle(OUT, 1);
    g.fillRect(5, 0, 4, 3);
    g.fillStyle(WAX, 1);
    g.fillRect(5, 1, 4, 1);
    g.fillStyle(WAX_HI, 1);
    g.fillRect(5, 1, 1, 1);
    // Gold band wrapping the cork base
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(5, 2, 4, 1);
    g.fillStyle(GOLD, 1);
    g.fillRect(5, 2, 1, 1);

    // Neck outline (between cork and body)
    g.fillStyle(OUT, 1);
    g.fillRect(5, 3, 1, 2);
    g.fillRect(8, 3, 1, 2);

    // Bottle body outline (rounded flask) — same as full vial
    g.fillRect(4, 5, 1, 1);
    g.fillRect(9, 5, 1, 1);
    g.fillRect(3, 6, 1, 5);
    g.fillRect(10, 6, 1, 5);
    g.fillRect(4, 11, 1, 1);
    g.fillRect(9, 11, 1, 1);
    g.fillRect(5, 12, 4, 1);

    // EMPTY interior — fill with the dark glass-back tint (no liquid).
    // Reads as a translucent glass void rather than blood.
    g.fillStyle(GLASS_DARK, 1);
    g.fillRect(6, 3, 2, 2);
    g.fillRect(5, 5, 4, 1);
    g.fillRect(4, 6, 6, 5);
    g.fillRect(5, 11, 4, 1);

    // Tiny residue droplet at the bottom — sells "this WAS blood"
    g.fillStyle(RESIDUE, 1);
    g.fillRect(6, 11, 2, 1);
    g.fillRect(7, 10, 1, 1);

    // Glass shine — vertical streak on the left (more pronounced now since
    // the empty vial reads as cleaner glass)
    g.fillStyle(GLASS_HI, 0.55);
    g.fillRect(4, 7, 1, 4);
    g.fillStyle(GLASS_HI, 0.3);
    g.fillRect(9, 7, 1, 3);

    g.generateTexture(TextureKeys.ItemBloodOfMarquisEmpty, w, h);
  }

  /**
   * Bloodletter's Pact — rolled parchment contract with a crimson wax seal
   * and a single blood drip. Parchment tones keep it visually distinct from
   * the all-crimson Blood-of-Marquis family while the seal + drip tie it to
   * the same "deal in blood" theme.
   */
  private drawItemBloodlettersPactTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x2a1408;
    const PARCH = 0xd8c090;
    const PARCH_SHADOW = 0xb09860;
    const PARCH_HI = 0xf0e0b8;
    const WAX_DARK = 0x701018;
    const WAX = 0xc8284a;
    const WAX_HI = 0xff5060;

    // Scroll silhouette
    g.fillStyle(OUT, 1);
    g.fillRect(2, 1, 10, 11);
    // Parchment face
    g.fillStyle(PARCH, 1);
    g.fillRect(3, 2, 8, 9);
    // Rolled caps (top + bottom read darker, like curled paper)
    g.fillStyle(PARCH_SHADOW, 1);
    g.fillRect(3, 2, 8, 1);
    g.fillRect(3, 10, 8, 1);
    // Left light edge
    g.fillStyle(PARCH_HI, 1);
    g.fillRect(3, 3, 1, 7);
    // Contract script lines
    g.fillStyle(PARCH_SHADOW, 1);
    g.fillRect(5, 4, 5, 1);
    g.fillRect(5, 6, 4, 1);

    // Crimson wax seal, bottom-center, overlapping the lower roll
    g.fillStyle(OUT, 1);
    g.fillCircle(7, 9, 3.4);
    g.fillStyle(WAX_DARK, 1);
    g.fillCircle(7, 9, 2.7);
    g.fillStyle(WAX, 1);
    g.fillCircle(7, 9, 1.9);
    g.fillStyle(WAX_HI, 1);
    g.fillRect(6, 8, 1, 1);

    // Single blood drip below the seal
    g.fillStyle(WAX, 1);
    g.fillRect(7, 12, 1, 2);

    g.generateTexture(TextureKeys.ItemBloodlettersPact, w, h);
  }

  /**
   * Transmutation Stone — faceted violet-grey stone with a molten gold core
   * (coins going in) and a single sparkle. The gold-in-stone contrast is the
   * transmutation read; silhouette stays a simple orb so it scans at 14 px.
   */
  private drawItemTransmutationStoneTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x1a1028;
    const STONE = 0x8878a8;
    const STONE_HI = 0xc0b0e0;
    const GOLD = 0xffd84a;
    const SPARKLE = 0xffffff;

    // FLAT-VECTOR — soft gold halo, bold outline + single flat stone fill +
    // one top-left highlight + molten gold core + sparkle.
    g.fillStyle(GOLD, 0.12);
    g.fillCircle(7, 7, 6.5);
    g.fillStyle(OUT, 1);
    g.fillCircle(7, 7, 5.5);
    g.fillStyle(STONE, 1);
    g.fillCircle(7, 7, 4.3);
    g.fillStyle(STONE_HI, 1);
    g.fillCircle(5.2, 5.2, 1.4);

    // Molten gold core.
    g.fillStyle(GOLD, 1);
    g.fillCircle(7, 7, 1.6);

    // Sparkle.
    g.fillStyle(SPARKLE, 1);
    g.fillRect(10, 3, 1, 1);

    g.generateTexture(TextureKeys.ItemTransmutationStone, w, h);
  }

  /**
   * Hummingbird Feather — diagonal teal feather with a magenta tip-blush and
   * a pale quill line, bottom-left to top-right. Teal + magenta is the
   * classic hummingbird iridescence pair and stays clear of the gold/crimson
   * item families.
   */
  private drawItemHummingbirdFeatherTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x081820;
    const TEAL_DARK = 0x107878;
    const TEAL = 0x20c0b0;
    const TEAL_HI = 0x80f0e0;
    const MAGENTA = 0xe060c0;
    const QUILL = 0xf0f0e8;

    // Feather silhouette — two triangles spanning the diagonal, barbs above
    // and below the quill line from (3,11) to (10,4)
    g.fillStyle(OUT, 1);
    g.fillTriangle(2, 12, 11, 1, 12, 6);
    g.fillTriangle(2, 12, 11, 1, 6, 2);

    // Lower barbs (lit side)
    g.fillStyle(TEAL, 1);
    g.fillTriangle(3, 11, 10, 2, 11, 6);
    // Upper barbs (shaded side)
    g.fillStyle(TEAL_DARK, 1);
    g.fillTriangle(3, 11, 10, 2, 7, 3);

    // Iridescent magenta blush at the tip
    g.fillStyle(MAGENTA, 1);
    g.fillRect(9, 2, 2, 2);

    // Sheen ticks on the lit side
    g.fillStyle(TEAL_HI, 1);
    g.fillRect(5, 8, 2, 1);
    g.fillRect(7, 6, 2, 1);

    // Quill line down the spine
    g.fillStyle(QUILL, 1);
    for (let i = 0; i < 8; i++) {
      g.fillRect(3 + i, 11 - i, 1, 1);
    }

    g.generateTexture(TextureKeys.ItemHummingbirdFeather, w, h);
  }

  /**
   * Per-floor gem trophy. 18 × 18 canvas with a cut-shape that varies by
   * floor so each gem reads as a real gemstone variety, not a recoloured
   * sticker:
   *   - emerald-forest → emerald-cut (rectangular step-cut)
   *   - sapphire-swamp → round brilliant (octagonal with radial facets)
   *   - onyx-mansion   → marquise (pointed oval with central spine)
   *
   * Shading is palette-driven: each gem derives 5 tones from `theme.palette.glow`
   * (outline, dark facet, mid fill, highlight facet, sparkle pixel) so adding a
   * new floor only needs a glow colour pick — no new pixel art.
   */
  private drawGemTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 18;
    const h = 18;
    g.clear();

    const glow = theme.palette.glow;
    const OUT = this.shadeColor(glow, -0.7);
    const dark = this.shadeColor(glow, -0.45);
    const mid = this.shadeColor(glow, -0.15);
    const hi = this.shadeColor(glow, 0.4);

    if (theme.id === 'emerald-forest') {
      this.drawEmeraldCutGem(g, OUT, dark, mid, hi);
    } else if (theme.id === 'sapphire-swamp') {
      this.drawBrilliantCutGem(g, OUT, dark, mid, hi);
    } else if (theme.id === 'onyx-mansion') {
      this.drawMarquiseCutGem(g, OUT, dark, mid, hi);
    } else {
      // Future floors fall back to the brilliant cut so they at least render.
      this.drawBrilliantCutGem(g, OUT, dark, mid, hi);
    }

    g.generateTexture(gemTextureKey(theme.id), w, h);
  }

  /**
   * Emerald-cut step gemstone — rectangular silhouette with parallel step
   * facets, the classic cut for green emeralds. 18 × 18 grid centred.
   */
  private drawEmeraldCutGem(
    g: Phaser.GameObjects.Graphics,
    OUT: number,
    dark: number,
    mid: number,
    hi: number,
  ): void {
    // Outline — rectangular with chamfered corners
    g.fillStyle(OUT, 1);
    g.fillRect(5, 2, 8, 1);
    g.fillRect(4, 3, 1, 1);
    g.fillRect(13, 3, 1, 1);
    g.fillRect(3, 4, 1, 11);
    g.fillRect(14, 4, 1, 11);
    g.fillRect(4, 15, 1, 1);
    g.fillRect(13, 15, 1, 1);
    g.fillRect(5, 16, 8, 1);
    // FLAT-VECTOR — single flat body fill + two clean step-facet lines + one
    // top-left highlight facet + sparkle. Reads as an emerald-cut stone.
    g.fillStyle(mid, 1);
    g.fillRect(5, 3, 8, 13);
    g.fillRect(4, 4, 1, 11);
    g.fillRect(13, 4, 1, 11);
    // Two clean step-facet lines.
    g.fillStyle(dark, 1);
    g.fillRect(4, 6, 10, 1);
    g.fillRect(4, 12, 10, 1);
    // Single top-left highlight facet.
    g.fillStyle(hi, 1);
    g.fillRect(5, 4, 4, 2);
    // Sparkle pixel.
    g.fillStyle(0xffffff, 1);
    g.fillRect(6, 4, 1, 1);
  }

  /**
   * Round-brilliant gemstone — octagonal silhouette with radial facets, the
   * classic cut for blue sapphires. 18 × 18 grid centred.
   */
  private drawBrilliantCutGem(
    g: Phaser.GameObjects.Graphics,
    OUT: number,
    dark: number,
    mid: number,
    hi: number,
  ): void {
    // Outline — octagonal silhouette
    g.fillStyle(OUT, 1);
    g.fillRect(6, 1, 6, 1);
    g.fillRect(4, 2, 2, 1);
    g.fillRect(12, 2, 2, 1);
    g.fillRect(3, 3, 1, 1);
    g.fillRect(14, 3, 1, 1);
    g.fillRect(2, 4, 1, 4);
    g.fillRect(15, 4, 1, 4);
    g.fillRect(3, 8, 1, 2);
    g.fillRect(14, 8, 1, 2);
    g.fillRect(4, 10, 1, 2);
    g.fillRect(13, 10, 1, 2);
    g.fillRect(5, 12, 1, 2);
    g.fillRect(12, 12, 1, 2);
    g.fillRect(6, 14, 1, 1);
    g.fillRect(11, 14, 1, 1);
    g.fillRect(7, 15, 4, 1);
    // FLAT-VECTOR — single flat body fill + a clean table-octagon facet line
    // + one top-left highlight facet + sparkle. Reads as a round-brilliant.
    g.fillStyle(mid, 1);
    g.fillRect(6, 2, 6, 1);
    g.fillRect(4, 3, 10, 1);
    g.fillRect(3, 4, 12, 4);
    g.fillRect(4, 8, 10, 2);
    g.fillRect(5, 10, 8, 2);
    g.fillRect(6, 12, 6, 2);
    g.fillRect(7, 14, 4, 1);
    // Clean facet table ring (dark girdle line + lower facet line).
    g.fillStyle(dark, 1);
    g.fillRect(5, 8, 8, 1);
    g.fillRect(6, 11, 6, 1);
    // Single top-left highlight facet.
    g.fillStyle(hi, 1);
    g.fillRect(5, 4, 4, 2);
    // Sparkle pixel.
    g.fillStyle(0xffffff, 1);
    g.fillRect(6, 5, 1, 1);
  }

  /**
   * Marquise-cut gemstone — pointed oval silhouette with a central facet
   * spine, classic for high-drama gemstones. 18 × 18 grid centred.
   */
  private drawMarquiseCutGem(
    g: Phaser.GameObjects.Graphics,
    OUT: number,
    dark: number,
    mid: number,
    hi: number,
  ): void {
    // Outline — pointed oval (top + bottom point, broad middle)
    g.fillStyle(OUT, 1);
    // Top point
    g.fillRect(8, 1, 2, 1);
    g.fillRect(7, 2, 1, 1);
    g.fillRect(10, 2, 1, 1);
    g.fillRect(6, 3, 1, 1);
    g.fillRect(11, 3, 1, 1);
    g.fillRect(5, 4, 1, 2);
    g.fillRect(12, 4, 1, 2);
    g.fillRect(4, 6, 1, 2);
    g.fillRect(13, 6, 1, 2);
    // Middle (broadest)
    g.fillRect(3, 8, 1, 2);
    g.fillRect(14, 8, 1, 2);
    g.fillRect(4, 10, 1, 2);
    g.fillRect(13, 10, 1, 2);
    g.fillRect(5, 12, 1, 2);
    g.fillRect(12, 12, 1, 2);
    // Bottom point
    g.fillRect(6, 14, 1, 1);
    g.fillRect(11, 14, 1, 1);
    g.fillRect(7, 15, 1, 1);
    g.fillRect(10, 15, 1, 1);
    g.fillRect(8, 16, 2, 1);
    // FLAT-VECTOR — single flat body fill + one central facet spine + two
    // clean side-facet lines + one top highlight + sparkle. Marquise read.
    g.fillStyle(mid, 1);
    g.fillRect(8, 2, 2, 1);
    g.fillRect(7, 3, 4, 1);
    g.fillRect(6, 4, 6, 2);
    g.fillRect(5, 6, 8, 2);
    g.fillRect(4, 8, 10, 2);
    g.fillRect(5, 10, 8, 2);
    g.fillRect(6, 12, 6, 2);
    g.fillRect(7, 14, 4, 1);
    g.fillRect(8, 15, 2, 1);
    // Two clean side-facet lines (dark) framing the spine.
    g.fillStyle(dark, 1);
    g.fillRect(5, 8, 8, 1);
    g.fillRect(6, 11, 6, 1);
    // Central facet spine — vertical highlight.
    g.fillStyle(hi, 1);
    g.fillRect(8, 3, 1, 12);
    // Sparkle pixel.
    g.fillStyle(0xffffff, 1);
    g.fillRect(8, 5, 1, 1);
  }

  /**
   * Tint a 0xRRGGBB hex by `factor` in [-1, 1] toward black/white. Helper for
   * the gem palette so each floor's glow auto-derives its 4 shading tones.
   */
  private shadeColor(rgb: number, factor: number): number {
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const adjust = (c: number): number => {
      if (factor >= 0) return Math.round(c + (255 - c) * factor);
      return Math.round(c * (1 + factor));
    };
    return ((adjust(r) << 16) | (adjust(g) << 8) | adjust(b)) >>> 0;
  }

  // ---------------------------------------------------------------------------
  // Mansion mob textures (Wraith / Possessed Candelabra / Cursed Mirror)
  // ---------------------------------------------------------------------------

  /**
   * Wraith — translucent hooded ghost. Tattered purple-black robe with a
   * darker hood and two glowing red eye dots. Default sprite alpha kept at
   * 1.0; the AI fades it during phase-mode by tweening alpha.
   */
  private drawWraithTexture(g: Phaser.GameObjects.Graphics): void {
    const size = TILE_SIZE;
    g.clear();
    const cx = size / 2;
    const cy = size / 2 + 4;

    this.groundShadow(g, cx, cy + 18, 14, 5, 0.4);

    // FLAT-VECTOR — ghostly hooded robe: bold dark outline, one flat body
    // tone, single top highlight, tattered hem, glowing eyes + catch-light.
    // Outline silhouette (robe triangle + hood as one form).
    g.fillStyle(0x0a0418, 1);
    g.fillTriangle(cx - 15, cy + 15, cx + 15, cy + 15, cx, cy - 16);
    g.fillEllipse(cx, cy - 10, 24, 22);
    // Flat body fill.
    g.fillStyle(0x3a1f58, 1);
    g.fillTriangle(cx - 12, cy + 13, cx + 12, cy + 13, cx, cy - 13);
    g.fillEllipse(cx, cy - 10, 20, 18);
    // Single soft highlight on the hood (top-left).
    g.fillStyle(0x5a3a82, 1);
    g.fillEllipse(cx - 5, cy - 14, 5, 6);
    // Tattered fringe pixels along the bottom hem.
    g.fillStyle(0x0a0418, 1);
    for (let i = -12; i <= 12; i += 4) {
      g.fillRect(cx + i, cy + 12, 2, 4);
    }

    // Hood interior shadow (face void).
    g.fillStyle(0x05020c, 1);
    g.fillEllipse(cx, cy - 9, 13, 13);

    // Glowing red eyes + catch-light.
    g.fillStyle(0xff5577, 1);
    g.fillCircle(cx - 3.5, cy - 10, 1.6);
    g.fillCircle(cx + 3.5, cy - 10, 1.6);
    g.fillStyle(0xffaad8, 1);
    g.fillRect(cx - 4, cy - 11, 1, 1);
    g.fillRect(cx + 3, cy - 11, 1, 1);

    g.generateTexture(TextureKeys.Wraith, size, size);
  }

  /**
   * Thornwood Shambler (Emerald miniboss) — a hulking mossy treant filling
   * most of the 64-px frame so it reads a clear size tier above the floor
   * mobs. Gnarled trunk body, root legs, thorny shoulder stubs, glowing
   * emerald eyes.
   */
  /**
   * Grovekeeper (Emerald miniboss) — antlered stag-druid: layered moss cloak
   * bell, bark-skinned face hollow with glowing eyes, a wide branching antler
   * crown, and a forest scepter with a glow tip. Reads as a caster guardian
   * (ported from StyleMockupScene Page 9 variant A, 2026-06-13). The internal
   * `MinibossThornwoodShambler` texture key + draw-fn name are kept to avoid a
   * churny rename (same approach as the Prismarch); only the art + the data
   * displayName changed.
   */
  private drawMinibossThornwoodShamblerTexture(g: Phaser.GameObjects.Graphics): void {
    const size = TILE_SIZE;
    g.clear();
    const cx = size / 2;
    const cy = size / 2 + 4;

    this.groundShadow(g, cx, cy + 24, 20, 6, 0.45);

    const OUT = 0x061a0c; // bold near-black moss outline
    const CLOAK = 0x2a7236; // brighter flat moss (popped vs old 0x215a2c)
    const CLOAK_HI = 0x58b85a;
    const SKIN = 0x7a5430;
    const SKIN_HI = 0xa87a3e;
    const ANTLER = 0xd8f0c8;
    const GLOW = 0x9effb0;

    // FLAT-VECTOR (bolder pass) — moss cloak as a flat fill with an explicit
    // thick stroked outline, flat hem fringe + seam, bark face with one
    // highlight + big cute glowing eyes, bold antler crown + glow scepter.
    const cloak = [
      { x: cx - 15, y: cy + 22 },
      { x: cx - 10, y: cy + 2 },
      { x: cx - 6, y: cy - 11 },
      { x: cx + 6, y: cy - 11 },
      { x: cx + 10, y: cy + 2 },
      { x: cx + 15, y: cy + 22 },
    ];
    g.fillStyle(CLOAK, 1);
    g.fillPoints(cloak, true);
    g.lineStyle(2.5, OUT, 1);
    g.strokePoints(cloak, true);
    // Flat ragged moss fringe along the hem.
    g.fillStyle(CLOAK_HI, 1);
    for (let i = -2; i <= 2; i++) {
      g.fillTriangle(cx + i * 6, cy + 21, cx + i * 6 - 3, cy + 15, cx + i * 6 + 3, cy + 15);
    }
    // Single centre seam highlight.
    g.fillStyle(CLOAK_HI, 0.6);
    g.fillRect(cx - 1, cy - 8, 2, 26);

    // Bark-skinned face hollow — flat skin + thick outline + one highlight.
    g.fillStyle(SKIN, 1);
    g.fillEllipse(cx, cy - 15, 12, 14);
    g.lineStyle(2.2, OUT, 1);
    g.strokeEllipse(cx, cy - 15, 12, 14);
    g.fillStyle(SKIN_HI, 1);
    g.fillEllipse(cx - 3, cy - 18, 3, 4);
    // Big cute glowing eyes (dot + bright catch-light).
    g.fillStyle(GLOW, 1);
    g.fillCircle(cx - 3.5, cy - 15, 2.2);
    g.fillCircle(cx + 3.5, cy - 15, 2.2);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx - 4.2, cy - 15.8, 0.9);
    g.fillCircle(cx + 2.8, cy - 15.8, 0.9);

    // Wide antler crown — two branching racks (bolder strokes).
    g.lineStyle(3, ANTLER, 1);
    for (const dir of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + dir * 3, cy - 22);
      g.lineTo(cx + dir * 10, cy - 28);
      g.lineTo(cx + dir * 16, cy - 26);
      g.moveTo(cx + dir * 10, cy - 28);
      g.lineTo(cx + dir * 12, cy - 32);
      g.moveTo(cx + dir * 6, cy - 24);
      g.lineTo(cx + dir * 9, cy - 30);
      g.strokePath();
    }
    g.fillStyle(GLOW, 0.9);
    g.fillCircle(cx - 16, cy - 26, 1.6);
    g.fillCircle(cx + 16, cy - 26, 1.6);
    g.fillCircle(cx - 12, cy - 32, 1.6);
    g.fillCircle(cx + 12, cy - 32, 1.6);

    // Forest scepter with a glow tip (bolder shaft).
    g.lineStyle(3, SKIN, 1);
    g.beginPath();
    g.moveTo(cx + 13, cy - 6);
    g.lineTo(cx + 16, cy + 18);
    g.strokePath();
    g.fillStyle(GLOW, 0.35);
    g.fillCircle(cx + 13, cy - 8, 6);
    g.fillStyle(GLOW, 1);
    g.fillCircle(cx + 13, cy - 8, 3.2);

    g.generateTexture(TextureKeys.MinibossThornwoodShambler, size, size);
  }

  /**
   * Bog Hag (Sapphire miniboss) — hunched swamp crone: tattered hood + robe
   * leaning to one side, shadowed face with a single glinting eye + a bony
   * nose, and a crooked staff raising a will-o-wisp lantern. Reads as a
   * ranged caster (ported from StyleMockupScene Page 9 variant A, 2026-06-13).
   * The internal `MinibossMireLurker` key + draw-fn name are kept (no churny
   * rename); only the art + the data displayName changed.
   */
  private drawMinibossMireLurkerTexture(g: Phaser.GameObjects.Graphics): void {
    const size = TILE_SIZE;
    g.clear();
    const cx = size / 2;
    const cy = size / 2 + 4;

    this.groundShadow(g, cx, cy + 22, 20, 6, 0.45);

    const OUT = 0x06141f; // bold near-black sapphire outline
    const ROBE = 0x265d80; // brighter flat robe (popped vs old 0x1c4a66)
    const ROBE_HI = 0x3f86a8;
    const SKIN = 0x7a9c86;
    const GLOW = 0x8ef0ff;
    const STAFF = 0x2a1d14;

    // FLAT-VECTOR (bolder pass) — hunched robe as a flat fill with an explicit
    // thick stroked outline; hood with a big cute glinting eye; bolder staff +
    // brighter will-o-wisp lantern.
    const robe = [
      { x: cx - 14, y: cy + 22 },
      { x: cx - 13, y: cy + 2 },
      { x: cx - 9, y: cy - 14 },
      { x: cx + 3, y: cy - 18 },
      { x: cx + 10, y: cy - 8 },
      { x: cx + 13, y: cy + 6 },
      { x: cx + 12, y: cy + 22 },
    ];
    g.fillStyle(ROBE, 1);
    g.fillPoints(robe, true);
    g.lineStyle(2.5, OUT, 1);
    g.strokePoints(robe, true);
    g.fillStyle(ROBE_HI, 0.75);
    g.fillEllipse(cx - 4, cy + 4, 5, 16);

    // Hood + shadowed face with a single big glinting eye.
    g.fillStyle(0x123246, 1);
    g.fillEllipse(cx - 2, cy - 16, 14, 13);
    g.lineStyle(2.2, OUT, 1);
    g.strokeEllipse(cx - 2, cy - 16, 14, 13);
    g.fillStyle(0x05121c, 1);
    g.fillEllipse(cx - 2, cy - 15, 8, 8);
    g.fillStyle(GLOW, 1);
    g.fillCircle(cx - 4, cy - 15, 2);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx - 4.6, cy - 15.7, 0.8);
    // Crooked bony nose poking out.
    g.fillStyle(SKIN, 1);
    g.fillTriangle(cx + 3, cy - 16, cx + 9, cy - 13, cx + 3, cy - 11);

    // Crooked staff + raised will-o-wisp lantern (bolder shaft).
    g.lineStyle(3, STAFF, 1);
    g.beginPath();
    g.moveTo(cx + 15, cy - 18);
    g.lineTo(cx + 13, cy - 2);
    g.lineTo(cx + 15, cy + 18);
    g.strokePath();
    g.fillStyle(GLOW, 0.32);
    g.fillCircle(cx + 15, cy - 21, 8);
    g.fillStyle(GLOW, 1);
    g.fillCircle(cx + 15, cy - 21, 4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx + 14, cy - 22, 1.2);

    // Bony reaching hand at the hem.
    g.fillStyle(SKIN, 1);
    g.fillCircle(cx - 13, cy + 2, 2.6);
    g.lineStyle(1.5, OUT, 1);
    g.strokeCircle(cx - 13, cy + 2, 2.6);

    g.generateTexture(TextureKeys.MinibossMireLurker, size, size);
  }

  /**
   * Possessed Candelabra — animated candle stand with a skull base. Slow
   * walking tank; drops wax puddles behind it as a hazard layer.
   */
  private drawPossessedCandelabraTexture(g: Phaser.GameObjects.Graphics): void {
    const size = TILE_SIZE;
    g.clear();
    const cx = size / 2;
    const cy = size / 2 + 6;

    this.groundShadow(g, cx, cy + 18, 18, 6, 0.45);

    // Skull base — small, staring upward (bolder outline)
    g.fillStyle(0x1a0e24, 1);
    g.fillEllipse(cx, cy + 14, 19, 11);
    g.fillStyle(0xe8d8c8, 1);
    g.fillEllipse(cx, cy + 12, 14, 10);
    g.lineStyle(2, 0x1a0e24, 1);
    g.strokeEllipse(cx, cy + 12, 14, 10);
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 4, cy + 10, 2, 2);
    g.fillRect(cx + 2, cy + 10, 2, 2);
    g.fillStyle(0xff5577, 1);
    g.fillRect(cx - 4, cy + 10, 1, 1);
    g.fillRect(cx + 2, cy + 10, 1, 1);
    // Tiny jaw line
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 3, cy + 16, 6, 1);

    // Spine stem (bone)
    g.fillStyle(0xe0d0c0, 1);
    g.fillRect(cx - 1, cy - 6, 2, 14);
    // Vertebra notches
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 1, cy - 2, 2, 1);
    g.fillRect(cx - 1, cy + 2, 2, 1);

    // Cross arms (bone)
    g.fillStyle(0xe0d0c0, 1);
    g.fillRect(cx - 12, cy - 10, 24, 2);
    g.fillRect(cx - 12, cy - 10, 1, 4);
    g.fillRect(cx + 11, cy - 10, 1, 4);

    // 3 candles
    for (const px of [cx - 11, cx, cx + 11]) {
      // Wax body
      g.fillStyle(0xfff8c0, 1);
      g.fillRect(px - 1, cy - 16, 3, 6);
      g.fillStyle(0xc0c0a0, 1);
      g.fillRect(px + 1, cy - 16, 1, 6);
      // Flame
      g.fillStyle(0xff7a30, 1);
      g.fillTriangle(px, cy - 24, px - 3, cy - 16, px + 3, cy - 16);
      g.fillStyle(0xffd84a, 1);
      g.fillTriangle(px, cy - 22, px - 2, cy - 16, px + 2, cy - 16);
      g.fillStyle(0xfff8a0, 1);
      g.fillRect(px, cy - 20, 1, 3);
    }
    // Soft amber halo
    g.fillStyle(0xffd84a, 0.16);
    g.fillEllipse(cx, cy - 18, 32, 14);

    g.generateTexture(TextureKeys.PossessedCandelabra, size, size);
  }

  /**
   * Cursed Mirror — rooted oval mirror with gold frame and a cracked
   * surface that leaks amethyst light. Telegraph-fires magic missiles.
   */
  private drawCursedMirrorTexture(g: Phaser.GameObjects.Graphics): void {
    const size = TILE_SIZE;
    g.clear();
    const cx = size / 2;
    const cy = size / 2 + 4;

    this.groundShadow(g, cx, cy + 18, 14, 5, 0.4);

    // Stand — wood base + iron foot
    g.fillStyle(0x261438, 1);
    g.fillRect(cx - 12, cy + 14, 24, 4);
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 11, cy + 14, 22, 1);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 8, cy + 14, 16, 1);

    // Frame — gilt oval with a bold dark outer rim (bolder pass)
    g.fillStyle(0x120a1e, 1);
    g.fillEllipse(cx, cy - 4, 28, 34);
    g.fillStyle(0x8a5a18, 1);
    g.fillEllipse(cx, cy - 4, 23, 29);
    g.lineStyle(2, 0x120a1e, 1);
    g.strokeEllipse(cx, cy - 4, 25, 31);
    g.lineStyle(1, 0xffd84a, 1);
    g.strokeEllipse(cx, cy - 4, 22, 28);

    // Mirror surface — dark with amethyst sheen
    g.fillStyle(0x0a0410, 1);
    g.fillEllipse(cx, cy - 4, 18, 24);
    g.fillStyle(0x261438, 0.85);
    g.fillEllipse(cx - 3, cy - 6, 7, 13);
    g.fillStyle(0xc864ff, 0.45);
    g.fillEllipse(cx + 3, cy - 9, 4, 6);

    // Cracks
    g.lineStyle(1, 0xc0c0c0, 0.85);
    g.lineBetween(cx - 5, cy - 13, cx + 2, cy + 4);
    g.lineBetween(cx + 2, cy + 4, cx - 7, cy + 8);
    g.lineBetween(cx - 1, cy - 9, cx + 5, cy - 2);

    // Subtle amethyst halo
    g.fillStyle(0xc864ff, 0.14);
    g.fillEllipse(cx, cy - 4, 32, 38);

    g.generateTexture(TextureKeys.CursedMirror, size, size);
  }

  /**
   * Mansion Missile — amethyst magic-missile-style projectile fired by the
   * Cursed Mirror. Round purple bullet with glow + sparkle pixel; mirrors
   * the player's MagicMissile aesthetic in onyx palette.
   */
  private drawMansionMissileTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 16;
    g.clear();
    const c = size / 2;

    // FLAT-VECTOR — soft halo, bold dark outline ring, flat body, one
    // top-left highlight + catch-light.
    g.fillStyle(0xc864ff, 0.32);
    g.fillCircle(c, c, 7);
    g.fillStyle(0x2a0840, 1);
    g.fillCircle(c, c, 5);
    g.fillStyle(0xc864ff, 1);
    g.fillCircle(c, c, 3.6);
    g.fillStyle(0xff9aff, 1);
    g.fillCircle(c - 1, c - 1, 1.4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(c - 1.6, c - 1.6, 0.8);

    g.generateTexture(TextureKeys.MansionMissile, size, size);
  }

  /**
   * Generic round caster-orb projectile (halo → mid glow → bright core +
   * sparkle), same silhouette as the MansionMissile but recoloured per floor.
   * Used by the Emerald + Sapphire minibosses now that they read as casters.
   */
  private drawCasterOrbTexture(
    g: Phaser.GameObjects.Graphics,
    key: string,
    halo: number,
    mid: number,
    core: number,
  ): void {
    const size = 16;
    g.clear();
    const c = size / 2;
    // FLAT-VECTOR — soft halo, bold dark outline ring, flat body, one
    // top-left highlight.
    g.fillStyle(halo, 0.32);
    g.fillCircle(c, c, 7);
    g.fillStyle(this.shadeColor(mid, -0.55), 1);
    g.fillCircle(c, c, 5);
    g.fillStyle(mid, 1);
    g.fillCircle(c, c, 3.6);
    g.fillStyle(core, 1);
    g.fillCircle(c - 0.6, c - 0.6, 2);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(c - 1.4, c - 1.4, 0.9);
    g.generateTexture(key, size, size);
  }

  /**
   * Flame Missile — small ember bullet fired by the Possessed Candelabra.
   * Warm orange-yellow with a dark outer ring so it reads against both
   * the bright candle aesthetic and the dark mansion floor.
   */
  private drawFlameMissileTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 16;
    g.clear();
    const c = size / 2;

    // FLAT-VECTOR — soft halo, bold dark ember ring, flat orange body,
    // bright yellow core + catch-light.
    g.fillStyle(0xff7a30, 0.32);
    g.fillCircle(c, c, 7);
    g.fillStyle(0x401004, 1);
    g.fillCircle(c, c, 5);
    g.fillStyle(0xff7a30, 1);
    g.fillCircle(c, c, 3.8);
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(c - 0.4, c - 0.4, 2.2);
    g.fillStyle(0xfff8a0, 1);
    g.fillCircle(c - 1.4, c - 1.4, 0.9);

    g.generateTexture(TextureKeys.FlameMissile, size, size);
  }

  /**
   * Wax Puddle — flickering flame-pool dropped behind a Possessed
   * Candelabra. Small radius (~14px), warm orange + yellow with a dark
   * wax outer ring. Damages the player on overlap.
   */
  private drawWaxPuddleTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 28;
    g.clear();
    const c = size / 2;

    // FLAT-VECTOR — bold dark wax-pool ring, flat orange body, bright
    // yellow core + single catch-light.
    g.fillStyle(0x180a08, 1);
    g.fillEllipse(c, c, 24, 20);
    g.fillStyle(0xff7a30, 1);
    g.fillEllipse(c, c, 18, 14);
    g.fillStyle(0xffd84a, 1);
    g.fillEllipse(c, c, 11, 8);
    g.fillStyle(0xfff8a0, 1);
    g.fillEllipse(c - 2, c - 2, 5, 3.5);

    g.generateTexture(TextureKeys.WaxPuddle, size, size);
  }

  /**
   * Crimson Lord (DEAD CODE) — half of the pre-Marquis-of-Mirages Vampire
   * Twins boss. Texture is still generated so the StyleMockupScene Page 6
   * design-history panel keeps a visible reference to the old sprite. No
   * runtime gameplay consumer.
   */
  private drawBossCrimsonLordTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 42;
    const cx = w / 2;
    g.clear();

    const OUT = 0x180408;
    const ROBE_DARK = 0x4a0814;
    const ROBE = 0x8a1424;
    const ROBE_HI = 0xc8284a;
    const TRIM_DARK = 0x7a5018;
    const TRIM = 0xffc850;
    const SKIN_OUT = 0x3a1818;
    const SKIN = 0xe8c8b8;
    const SKIN_HI = 0xffe8d8;
    const HAIR_OUT = 0x080000;
    const HAIR = 0x180410;
    const EYE_OUT = 0x080000;
    const EYE = 0xff2030;
    const EYE_HI = 0xffd040;
    const FANG = 0xfff0d0;
    const BLOOD = 0xc8284a;

    this.groundShadow(g, cx, h - 4, 14, 4, 0.55);

    // Bell-shape silhouette outer (rounded, replacing the old cone)
    const outerBell = [
      { x: cx + 8, y: 17 },
      { x: cx + 10, y: 22 },
      { x: cx + 12, y: 28 },
      { x: cx + 14, y: 34 },
      { x: cx + 16, y: 39 },
      { x: cx + 8, y: 40 },
      { x: cx, y: 40 },
      { x: cx - 8, y: 40 },
      { x: cx - 16, y: 39 },
      { x: cx - 14, y: 34 },
      { x: cx - 12, y: 28 },
      { x: cx - 10, y: 22 },
      { x: cx - 8, y: 17 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(outerBell, true);

    // Inner bell — main robe-dark color
    const innerBell = [
      { x: cx + 7, y: 18 },
      { x: cx + 9, y: 22 },
      { x: cx + 11, y: 28 },
      { x: cx + 13, y: 34 },
      { x: cx + 14, y: 38 },
      { x: cx, y: 39 },
      { x: cx - 14, y: 38 },
      { x: cx - 13, y: 34 },
      { x: cx - 11, y: 28 },
      { x: cx - 9, y: 22 },
      { x: cx - 7, y: 18 },
    ];
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(innerBell, true);

    // Mid-tone fills (stacked ellipses for soft body shading)
    g.fillStyle(ROBE, 1);
    g.fillEllipse(cx, 24, 14, 10);
    g.fillEllipse(cx, 30, 18, 10);
    g.fillEllipse(cx, 36, 24, 8);

    // Right-side rim highlight — soft red catch-light
    g.fillStyle(ROBE_HI, 1);
    g.fillTriangle(cx + 5, 20, cx + 9, 20, cx + 13, 36);

    // Gold-trim hem (curved with the bell)
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, 36, 30, 5);
    g.fillStyle(TRIM_DARK, 1);
    g.fillEllipse(cx, 36, 28, 4);
    g.fillStyle(TRIM, 1);
    g.fillEllipse(cx, 35, 26, 2);
    // Gold studs along the trim
    for (const tx of [-10, -4, 2, 8]) {
      g.fillStyle(0xfff0a8, 1);
      g.fillRect(cx + tx, 35, 1, 1);
    }

    // Ruby medallion at center-chest
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, 24, 2.5);
    g.fillStyle(TRIM, 1);
    g.fillCircle(cx, 24, 1.8);
    g.fillStyle(BLOOD, 1);
    g.fillCircle(cx, 24, 1);

    // Soft cape collar (rounded ellipse, no hard wedge)
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, 17, 14, 5);
    g.fillStyle(ROBE_DARK, 1);
    g.fillEllipse(cx, 17, 12, 4);
    g.fillStyle(ROBE, 1);
    g.fillEllipse(cx, 16, 10, 2);

    // Head — pale skin, sits naturally on shoulders
    g.fillStyle(SKIN_OUT, 1);
    g.fillCircle(cx, 11, 6);
    g.fillStyle(SKIN, 1);
    g.fillCircle(cx, 11, 5);
    g.fillStyle(SKIN_HI, 1);
    g.fillRect(cx - 3, 9, 1, 1);

    // Slicked-back hair (rounded cap)
    g.fillStyle(HAIR_OUT, 1);
    g.fillEllipse(cx, 6, 12, 5);
    g.fillStyle(HAIR, 1);
    g.fillEllipse(cx, 6, 10, 4);

    // Eyes — glowing red with gold spark
    g.fillStyle(EYE_OUT, 1);
    g.fillRect(cx - 4, 11, 2, 2);
    g.fillRect(cx + 2, 11, 2, 2);
    g.fillStyle(EYE, 1);
    g.fillRect(cx - 4, 11, 2, 2);
    g.fillRect(cx + 2, 11, 2, 2);
    g.fillStyle(EYE_HI, 1);
    g.fillRect(cx - 4, 11, 1, 1);
    g.fillRect(cx + 2, 11, 1, 1);

    // Fanged grin
    g.fillStyle(EYE_OUT, 1);
    g.fillRect(cx - 3, 14, 6, 1);
    g.fillStyle(FANG, 1);
    g.fillRect(cx - 2, 15, 1, 1);
    g.fillRect(cx + 1, 15, 1, 1);
    // Blood drip from corner
    g.fillStyle(BLOOD, 1);
    g.fillRect(cx + 2, 15, 1, 2);

    g.generateTexture(TextureKeys.BossCrimsonLord, w, h);
  }

  /**
   * Sapphire Marquis — vampire mage in deep blue robes with ornate gold
   * collar, holding a wand at the side. Pale face, single glowing red eye.
   * 32×42 px — slightly slimmer than the Lord so the duo reads as
   * "warrior + scholar" at a glance.
   */
  private drawBossSapphireMarquisTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 36;
    const h = 42;
    const cx = w / 2;
    g.clear();

    const OUT = 0x000814;
    const ROBE_DARK = 0x101e44;
    const ROBE = 0x1f3878;
    const ROBE_HI = 0x4870c8;
    const TRIM_DARK = 0x7a5018;
    const TRIM = 0xffc850;
    const SKIN_OUT = 0x281828;
    const SKIN = 0xd8c0d0;
    const SKIN_HI = 0xf0d8e0;
    const HAIR_OUT = 0x040208;
    const HAIR = 0x100614;
    const EYE_OUT = 0x080000;
    const EYE = 0xff2040;
    const EYE_HI = 0xffd040;
    const SCAR = 0x6a1818;
    const WAND_OUT = 0x080004;
    const WAND = 0x4a2a18;
    const WAND_TIP = 0xff4060;
    const WAND_HALO = 0xff80a0;
    const SAPPHIRE = 0x4ad8ff;

    this.groundShadow(g, cx, h - 4, 12, 4, 0.55);

    // Bell-shape silhouette outer (slimmer than the Lord — "scholar" frame)
    const outerBell = [
      { x: cx + 7, y: 17 },
      { x: cx + 9, y: 22 },
      { x: cx + 11, y: 28 },
      { x: cx + 12, y: 34 },
      { x: cx + 13, y: 39 },
      { x: cx + 6, y: 40 },
      { x: cx, y: 40 },
      { x: cx - 6, y: 40 },
      { x: cx - 13, y: 39 },
      { x: cx - 12, y: 34 },
      { x: cx - 11, y: 28 },
      { x: cx - 9, y: 22 },
      { x: cx - 7, y: 17 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(outerBell, true);

    // Inner bell — main robe-dark color
    const innerBell = [
      { x: cx + 6, y: 18 },
      { x: cx + 8, y: 22 },
      { x: cx + 10, y: 28 },
      { x: cx + 11, y: 34 },
      { x: cx + 11, y: 38 },
      { x: cx, y: 39 },
      { x: cx - 11, y: 38 },
      { x: cx - 11, y: 34 },
      { x: cx - 10, y: 28 },
      { x: cx - 8, y: 22 },
      { x: cx - 6, y: 18 },
    ];
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(innerBell, true);

    // Mid-tone fills (slimmer ellipses)
    g.fillStyle(ROBE, 1);
    g.fillEllipse(cx, 24, 12, 10);
    g.fillEllipse(cx, 30, 16, 10);
    g.fillEllipse(cx, 36, 20, 8);

    // Right-side rim highlight — soft sapphire catch-light
    g.fillStyle(ROBE_HI, 1);
    g.fillTriangle(cx + 4, 20, cx + 7, 20, cx + 11, 36);

    // Gold-trim hem with sapphire diamond pattern
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, 36, 26, 5);
    g.fillStyle(TRIM_DARK, 1);
    g.fillEllipse(cx, 36, 24, 4);
    g.fillStyle(TRIM, 1);
    g.fillEllipse(cx, 35, 22, 2);
    // Sapphire studs along the trim
    for (const tx of [-9, -3, 3, 9]) {
      g.fillStyle(SAPPHIRE, 1);
      g.fillRect(cx + tx, 35, 1, 1);
    }

    // Sapphire medallion at chest (balance to the Lord's ruby)
    g.fillStyle(OUT, 1);
    g.fillCircle(cx, 24, 2.5);
    g.fillStyle(TRIM, 1);
    g.fillCircle(cx, 24, 1.8);
    g.fillStyle(SAPPHIRE, 1);
    g.fillCircle(cx, 24, 1);

    // Soft V-cut collar (rounded ellipse with subtle V opening)
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, 18, 14, 5);
    g.fillStyle(TRIM_DARK, 1);
    g.fillEllipse(cx, 18, 12, 4);
    g.fillStyle(TRIM, 1);
    g.fillEllipse(cx, 17, 10, 2);
    // V-cut showing inner robe
    g.fillStyle(ROBE_DARK, 1);
    g.fillTriangle(cx - 2, 17, cx + 2, 17, cx, 21);
    g.fillStyle(ROBE, 1);
    g.fillTriangle(cx - 1, 17, cx + 1, 17, cx, 20);

    // Head — pale, slightly slimmer than the Lord
    g.fillStyle(SKIN_OUT, 1);
    g.fillCircle(cx, 11, 5.5);
    g.fillStyle(SKIN, 1);
    g.fillCircle(cx, 11, 4.5);
    g.fillStyle(SKIN_HI, 1);
    g.fillRect(cx - 2, 9, 1, 1);

    // Long combed-back hair with widow's peak
    g.fillStyle(HAIR_OUT, 1);
    g.fillEllipse(cx, 6, 12, 5);
    g.fillTriangle(cx - 1, 7, cx + 1, 7, cx, 10);
    g.fillStyle(HAIR, 1);
    g.fillEllipse(cx, 6, 10, 4);

    // Single glowing red eye + scarred closed eye
    g.fillStyle(EYE_OUT, 1);
    g.fillRect(cx - 3, 11, 2, 2);
    g.fillRect(cx + 1, 11, 2, 2);
    g.fillStyle(EYE, 1);
    g.fillRect(cx + 1, 11, 2, 2);
    g.fillStyle(EYE_HI, 1);
    g.fillRect(cx + 1, 11, 1, 1);
    // Scar across closed eye
    g.fillStyle(SCAR, 1);
    g.fillRect(cx - 4, 10, 1, 4);

    // Thin lips (no fangs — magic-wielder)
    g.fillStyle(EYE_OUT, 1);
    g.fillRect(cx - 2, 14, 4, 1);

    // Wand at right side — held at hip, blood-red crystal tip
    g.fillStyle(WAND_OUT, 1);
    g.fillRect(cx + 11, 22, 2, 13);
    g.fillStyle(WAND, 1);
    g.fillRect(cx + 11, 22, 1, 13);
    // Crystal tip (top) with halo
    g.fillStyle(WAND_HALO, 0.32);
    g.fillCircle(cx + 12, 20, 5);
    g.fillStyle(WAND_OUT, 1);
    g.fillRect(cx + 10, 18, 5, 4);
    g.fillStyle(WAND_TIP, 1);
    g.fillRect(cx + 11, 19, 3, 2);
    g.fillStyle(0xffc0d0, 1);
    g.fillRect(cx + 11, 19, 1, 1);

    g.generateTexture(TextureKeys.BossSapphireMarquis, w, h);
  }

  /**
   * Marquis of Mirages — single vampire-mage replacement for the Vampire
   * Twins. Ports the StyleMockupScene Page 6 Variant A "Caped Conjurer"
   * geometry (asymmetric cape billowing left + casting pose with raised
   * oval hand-mirror) down to a 44×46 pixel-art canvas.
   *
   * Asymmetric on purpose: breaks the symmetric-bell silhouette the
   * player flagged as chess-piece-like on the old V2 Marquis. Head sits
   * slightly right of center (lean), cape sweeps to the left, raised
   * arm + mirror push to the upper right.
   */
  private drawBossMarquisOfMiragesTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 44;
    const h = 46;
    const cx = w / 2;
    g.clear();

    const OUT = 0x000814;
    const ROBE_DARK = 0x0c1830;
    const ROBE = 0x1f3878;
    const ROBE_HI = 0x4870c8;
    const CAPE_DARK = 0x3a0810;
    const CAPE = 0x84142c;
    const CAPE_HI = 0xc8284a;
    const TRIM = 0xffd84a;
    const SKIN_OUT = 0x2a1828;
    const SKIN = 0xd8c0d0;
    const SKIN_HI = 0xf0d8e0;
    const HAIR = 0x100614;
    const EYE = 0xff2040;
    const SCAR = 0x6a1818;
    const SILVER = 0xd0d8e8;
    const SILVER_HI = 0xffffff;
    const SAPPHIRE = 0x4ad8ff;

    // Ground shadow.
    this.groundShadow(g, cx + 2, h - 3, 14, 4, 0.5);

    // 1) CAPE — billows wide to the LEFT (asymmetric). Drawn first so the
    // body sits on top.
    const capeOuter: Array<{ x: number; y: number }> = [
      { x: cx + 4, y: 14 },     // collar right
      { x: cx + 1, y: 16 },     // collar mid
      { x: cx - 3, y: 18 },     // shoulder left
      { x: cx - 11, y: 22 },    // upper billow
      { x: cx - 17, y: 28 },    // billow far edge
      { x: cx - 19, y: 34 },    // bottom-left tip
      { x: cx - 16, y: 39 },    // hem 1
      { x: cx - 8, y: 43 },     // hem 2
      { x: cx - 2, y: 42 },     // hem inner
      { x: cx - 1, y: 30 },     // crease back inside
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(capeOuter, true);
    // Inner cape fill — shifted slightly so the outline reads as a 1 px stroke.
    g.fillStyle(CAPE_DARK, 1);
    g.fillPoints(
      capeOuter.map((p) => ({ x: p.x + 1, y: p.y })),
      true,
    );
    // Mid-tone fold (carved triangle).
    g.fillStyle(CAPE, 1);
    g.fillTriangle(cx - 2, 19, cx - 14, 28, cx - 6, 40);
    // Wind-edge highlight rim along the left tip.
    g.fillStyle(CAPE_HI, 1);
    g.fillTriangle(cx - 12, 22, cx - 16, 30, cx - 18, 36);

    // 2) BODY — slim narrow torso, slight right-lean. No bell hem; cape
    // covers the bottom-left, body's right side carries the visible hem.
    const body: Array<{ x: number; y: number }> = [
      { x: cx - 4, y: 17 },
      { x: cx + 5, y: 17 },
      { x: cx + 6, y: 26 },
      { x: cx + 7, y: 35 },
      { x: cx + 6, y: 41 },
      { x: cx + 1, y: 43 },
      { x: cx - 2, y: 43 },
      { x: cx - 4, y: 35 },
      { x: cx - 4, y: 26 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(body, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      body.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(cx + 1, 28, 7, 12);
    g.fillStyle(ROBE, 1);
    g.fillEllipse(cx + 1, 36, 9, 9);
    // Right-side rim catch-light.
    g.fillStyle(ROBE_HI, 1);
    g.fillTriangle(cx + 4, 19, cx + 5, 19, cx + 6, 38);

    // 3) GOLD V-trim down the chest + sapphire chest pin.
    g.fillStyle(TRIM, 1);
    g.fillRect(cx, 19, 1, 18);
    g.fillStyle(OUT, 1);
    g.fillCircle(cx + 1, 25, 2);
    g.fillStyle(TRIM, 1);
    g.fillCircle(cx + 1, 25, 1.4);
    g.fillStyle(SAPPHIRE, 1);
    g.fillRect(cx + 1, 25, 1, 1);
    // Hem trim line.
    g.fillStyle(TRIM, 1);
    g.fillRect(cx - 3, 41, 9, 1);

    // 4) HEAD — GAUNT + ANGULAR with a pointed vampire chin (NOT a round
    // ball), slight right-of-center, leaning forward.
    const hx = cx + 1;
    const headPts: Array<{ x: number; y: number }> = [
      { x: hx - 4, y: 8 },   // temple left
      { x: hx + 4, y: 8 },   // temple right
      { x: hx + 5, y: 11 },  // cheekbone right
      { x: hx + 2, y: 14 },  // jaw right
      { x: hx, y: 16 },      // pointed chin
      { x: hx - 2, y: 14 },  // jaw left
      { x: hx - 5, y: 11 },  // cheekbone left
    ];
    g.fillStyle(SKIN_OUT, 1);
    g.fillPoints(headPts, true);
    g.fillStyle(SKIN, 1);
    g.fillPoints(
      headPts.map((p) => ({ x: p.x, y: p.y - 0.4 })),
      true,
    );
    g.fillStyle(SKIN_HI, 1);
    g.fillRect(hx - 1, 9, 1, 1);
    // Slicked-back hair with a widow's peak.
    g.fillStyle(HAIR, 1);
    g.fillEllipse(hx, 7, 11, 4);
    g.fillTriangle(hx - 2, 8, hx + 2, 8, hx, 11); // widow's peak point
    // Single glowing RED eye + scar over the other (vampire-mage signature).
    g.fillStyle(0x080000, 1);
    g.fillRect(hx - 3, 11, 2, 1);
    g.fillStyle(EYE, 1);
    g.fillRect(hx + 2, 11, 2, 1);
    g.fillStyle(0xffaab0, 1);
    g.fillRect(hx + 2, 11, 1, 1);
    g.fillStyle(SCAR, 1);
    g.fillRect(hx - 4, 10, 1, 3);
    // Thin lips + a tiny white fang.
    g.fillStyle(0x080000, 1);
    g.fillRect(hx - 1, 13, 3, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(hx, 14, 1, 1);

    // 5) RIGHT ARM extended forward + slightly upward (presenting pose).
    g.fillStyle(OUT, 1);
    g.fillTriangle(cx + 5, 17, cx + 14, 22, cx + 12, 27);
    g.fillStyle(ROBE_DARK, 1);
    g.fillTriangle(cx + 5, 18, cx + 13, 22, cx + 12, 26);
    // Sleeve cuff (gold trim).
    g.fillStyle(TRIM, 1);
    g.fillRect(cx + 12, 23, 3, 1);

    // 6) HAND-MIRROR — oval head + handle gripped DIRECTLY in the hand.
    // Mirror raised toward the player (presenting pose). Center of oval
    // sits up-and-right of the body's head. Handle runs DOWN through the
    // gripping fingers; oval head sits above.
    const mx = cx + 15;        // mirror oval center x
    const my = 14;             // mirror oval center y
    const rxOuter = 4;         // outer half-width
    const ryOuter = 6;         // outer half-height (taller-than-wide)

    // Soft silver halo around the oval (cosmetic glow).
    g.fillStyle(SILVER, 0.28);
    g.fillEllipse(mx, my, (rxOuter + 2) * 2, (ryOuter + 2) * 2);

    // Frame: outline → gold rim → black inner → silver glass.
    g.fillStyle(OUT, 1);
    g.fillEllipse(mx, my, rxOuter * 2 + 2, ryOuter * 2 + 2);
    g.fillStyle(TRIM, 1);
    g.fillEllipse(mx, my, rxOuter * 2, ryOuter * 2);
    g.fillStyle(OUT, 1);
    g.fillEllipse(mx, my, rxOuter * 2 - 2, ryOuter * 2 - 2);
    g.fillStyle(SILVER, 1);
    g.fillEllipse(mx, my - 1, rxOuter * 2 - 3, ryOuter * 2 - 3);
    // Catch-light highlight on the glass.
    g.fillStyle(SILVER_HI, 1);
    g.fillRect(mx - 2, my - 4, 1, 2);
    // Top crown gem on the frame.
    g.fillStyle(OUT, 1);
    g.fillRect(mx - 1, my - ryOuter - 2, 2, 1);
    g.fillStyle(SAPPHIRE, 1);
    g.fillRect(mx, my - ryOuter - 2, 1, 1);

    // Mirror handle running DOWN through the gripping hand.
    g.fillStyle(OUT, 1);
    g.fillRect(mx - 1, my + ryOuter, 2, 9);
    g.fillStyle(TRIM, 1);
    g.fillRect(mx, my + ryOuter, 1, 9);
    // Handle pommel.
    g.fillStyle(OUT, 1);
    g.fillRect(mx - 1, my + ryOuter + 9, 2, 2);
    g.fillStyle(TRIM, 1);
    g.fillRect(mx, my + ryOuter + 9, 1, 2);

    // 7) HAND gripping the handle — drawn LAST so it sits over the handle.
    g.fillStyle(SKIN_OUT, 1);
    g.fillEllipse(mx, my + ryOuter + 5, 5, 4);
    g.fillStyle(SKIN, 1);
    g.fillEllipse(mx, my + ryOuter + 5, 3, 3);

    g.generateTexture(TextureKeys.BossMarquisOfMirages, w, h);
  }

  /**
   * Mirror Portal — entry variant. Tall oval (~28×40 px). Active glow:
   * cyan rune-frame + bright sapphire glass + outer halo + 4 cardinal
   * rune-marks around the frame. The "active" reading is the player's
   * cue: this is the destructible portal whose destruction nullifies
   * linked homing projectiles during the Mirror Special.
   */
  private drawMirrorPortalEntryTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 32;
    const h = 44;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    const OUT = 0x000814;
    const TRIM = 0xffd84a;
    const TRIM_DEEP = 0x8a5a18;
    const RUNE = 0x4ad8ff;
    const RUNE_HI = 0xa0f0ff;
    const GLASS = 0x6090c8;
    const GLASS_HI = 0xc0e0ff;
    const SHADOW = 0x080820;

    // Halo (outermost glow).
    g.fillStyle(RUNE, 0.18);
    g.fillEllipse(cx, cy, 30, 42);
    g.fillStyle(RUNE_HI, 0.10);
    g.fillEllipse(cx, cy, 24, 36);

    // Frame — outer outline → gold trim → inner outline.
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, cy, 22, 36);
    g.fillStyle(TRIM, 1);
    g.fillEllipse(cx, cy, 20, 34);
    g.fillStyle(TRIM_DEEP, 1);
    g.fillEllipse(cx, cy, 18, 32);
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, cy, 16, 30);

    // Glass — sapphire-blue active surface with vertical highlight band.
    g.fillStyle(GLASS, 1);
    g.fillEllipse(cx, cy, 14, 28);
    g.fillStyle(GLASS_HI, 0.55);
    g.fillEllipse(cx - 2, cy - 4, 4, 16);
    // Reflected runic spark in glass.
    g.fillStyle(RUNE_HI, 0.85);
    g.fillRect(cx - 1, cy - 6, 1, 1);
    g.fillRect(cx + 2, cy + 2, 1, 1);

    // 4 cardinal rune-marks on the gold trim (cyan studs).
    for (const [rx, ry] of [
      [cx, 4],          // top
      [cx, h - 4],      // bottom
      [3, cy],          // left
      [w - 3, cy],      // right
    ]) {
      g.fillStyle(OUT, 1);
      g.fillRect(rx - 1, ry - 1, 3, 3);
      g.fillStyle(RUNE, 1);
      g.fillRect(rx - 1, ry - 1, 2, 2);
      g.fillStyle(RUNE_HI, 1);
      g.fillRect(rx - 1, ry - 1, 1, 1);
    }

    // Shadow under the bottom edge for floor-grip.
    g.fillStyle(SHADOW, 0.45);
    g.fillEllipse(cx, h - 1, 16, 3);

    g.generateTexture(TextureKeys.MirrorPortalEntry, w, h);
  }

  /**
   * Mirror Portal — exit variant. Same silhouette as entry, but drained:
   * dim trim, dark glass, no rune-glow. Visually communicates "this one
   * is the safe one, ignore" so the player intuits the entry as the
   * threat-source target.
   */
  private drawMirrorPortalExitTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 32;
    const h = 44;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    const OUT = 0x000814;
    const TRIM_DIM = 0x6a4a18;
    const TRIM_DEEPER = 0x402810;
    const GLASS_DIM = 0x202a3a;
    const GLASS_HI_DIM = 0x60708a;
    const SHADOW = 0x080820;

    // No outer halo (passive).

    // Frame — dimmer trim.
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, cy, 22, 36);
    g.fillStyle(TRIM_DIM, 1);
    g.fillEllipse(cx, cy, 20, 34);
    g.fillStyle(TRIM_DEEPER, 1);
    g.fillEllipse(cx, cy, 18, 32);
    g.fillStyle(OUT, 1);
    g.fillEllipse(cx, cy, 16, 30);

    // Glass — dark, almost opaque (drained / unlit).
    g.fillStyle(GLASS_DIM, 1);
    g.fillEllipse(cx, cy, 14, 28);
    g.fillStyle(GLASS_HI_DIM, 0.45);
    g.fillEllipse(cx - 2, cy - 4, 3, 12);

    // 4 cardinal rune-marks — drained: black-only, no cyan.
    for (const [rx, ry] of [
      [cx, 4],
      [cx, h - 4],
      [3, cy],
      [w - 3, cy],
    ]) {
      g.fillStyle(OUT, 1);
      g.fillRect(rx - 1, ry - 1, 3, 3);
      g.fillStyle(TRIM_DEEPER, 1);
      g.fillRect(rx - 1, ry - 1, 2, 2);
    }

    g.fillStyle(SHADOW, 0.45);
    g.fillEllipse(cx, h - 1, 16, 3);

    g.generateTexture(TextureKeys.MirrorPortalExit, w, h);
  }

  /**
   * Blood Projectile — crimson droplet/orb with dark outer ring + bright
   * core and a single white sparkle. Used by the Sapphire Marquis (his
   * blood-magic) and visually distinct from the amethyst Mansion Missile.
   */
  private drawBloodProjectileTexture(g: Phaser.GameObjects.Graphics): void {
    const size = 16;
    g.clear();
    const c = size / 2;

    // FLAT-VECTOR — soft halo, bold dark blood ring, flat crimson body,
    // pink catch-light.
    g.fillStyle(0xc8284a, 0.32);
    g.fillCircle(c, c, 7);
    g.fillStyle(0x340410, 1);
    g.fillCircle(c, c, 5);
    g.fillStyle(0xe02040, 1);
    g.fillCircle(c, c, 3.8);
    g.fillStyle(0xff7088, 1);
    g.fillCircle(c - 1, c - 1, 1.4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(c - 1.6, c - 1.6, 0.8);

    g.generateTexture(TextureKeys.BloodProjectile, size, size);
  }

  /**
   * Lord Onyx — secret endboss, High-Priest silhouette: tall hooded robe
   * with completely shadowed face (only two amethyst pinpoint eyes deep
   * in the hood-void), skeletal hands cradling a refracting prism in
   * front of him. The prism is the hero element — closes the thematic
   * ring with "Prismancy" + the three floor gems. No crown, no gold
   * trim, no scepter. 64×88 canvas, hovering posture (no feet, frayed
   * hem).
   */
  private drawBossLordOnyxTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 64;
    const h = 88; // matches V2 — the BaseEnemy hitbox-centering uses this
    const cx = w / 2;
    g.clear();

    // V3 = "Tattered Cultist" direction (chosen from StyleMockupScene
    // page 5 variant comparison). Same V2 bell-shape silhouette + V2 robe
    // colours so the figure stays continuous, but the face read swaps to
    // a Trinity of vertical eye pinpoints (one per consumed gem), the
    // chest carries three runic sigils stitched in dark amethyst thread
    // (Emerald cross / Sapphire wave / Amethyst diamond), the hem is more
    // aggressively shredded with long ragged streamers trailing past the
    // bell, and the prism is no longer "displayed" — it is bound, with
    // three coiling shadow chains wrapping it. Story beat: he absorbed
    // the gems and now imprisons the Prism rather than wielding it.
    const OUT = 0x000000;
    const ROBE_DARK = 0x070310;
    const ROBE = 0x110820;
    const ROBE_HI = 0x281244;
    const ROBE_RIM = 0x4a2070;
    const EYE = 0xc864ff;
    const EYE_HI = 0xff8aff;
    const HAND_OUT = 0x040208;
    const HAND = 0x4a3850;
    const HAND_HI = 0x806878;
    const PRISM_OUT = 0x000000;
    const PRISM_R = 0xff4060;
    const PRISM_G = 0x4afa80;
    const PRISM_B = 0x4a80fa;
    const PRISM_CORE = 0xffffff;
    const SHADOW = 0x100008;
    const RUNE_THREAD = 0x6a4080;
    const EMERALD = 0x4afa80;
    const SAPPHIRE = 0x4a80fa;
    const AMETHYST = 0xc864ff;

    // 1) Floating amethyst aura under the hem — he hovers, no ground feet
    g.fillStyle(0xc864ff, 0.10);
    g.fillEllipse(cx, h - 4, 56, 14);
    g.fillStyle(0xff8aff, 0.16);
    g.fillEllipse(cx, h - 4, 28, 8);

    // 2) Outer silhouette — V2 bell-shape, identical points so the
    //    overall figure stays continuous with previous runs.
    const outerPoints = [
      { x: cx, y: 1 },
      { x: cx + 5, y: 6 },
      { x: cx + 9, y: 14 },
      { x: cx + 12, y: 22 },
      { x: cx + 12, y: 32 },
      { x: cx + 14, y: 42 },
      { x: cx + 16, y: 52 },
      { x: cx + 19, y: 62 },
      { x: cx + 23, y: 72 },
      { x: cx + 28, y: 82 },
      // frayed ragged hem
      { x: cx + 24, y: 84 },
      { x: cx + 18, y: 80 },
      { x: cx + 12, y: 84 },
      { x: cx + 4, y: 80 },
      { x: cx - 4, y: 84 },
      { x: cx - 12, y: 80 },
      { x: cx - 18, y: 84 },
      { x: cx - 24, y: 80 },
      { x: cx - 28, y: 82 },
      { x: cx - 23, y: 72 },
      { x: cx - 19, y: 62 },
      { x: cx - 16, y: 52 },
      { x: cx - 14, y: 42 },
      { x: cx - 12, y: 32 },
      { x: cx - 12, y: 22 },
      { x: cx - 9, y: 14 },
      { x: cx - 5, y: 6 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(outerPoints, true);

    // 3) Inner silhouette — robe dark fill (inset 1-2 px from outline)
    const innerPoints = [
      { x: cx, y: 3 },
      { x: cx + 4, y: 8 },
      { x: cx + 8, y: 14 },
      { x: cx + 11, y: 22 },
      { x: cx + 11, y: 32 },
      { x: cx + 13, y: 42 },
      { x: cx + 15, y: 52 },
      { x: cx + 18, y: 62 },
      { x: cx + 22, y: 72 },
      { x: cx + 26, y: 80 },
      { x: cx + 18, y: 78 },
      { x: cx + 8, y: 80 },
      { x: cx, y: 78 },
      { x: cx - 8, y: 80 },
      { x: cx - 18, y: 78 },
      { x: cx - 26, y: 80 },
      { x: cx - 22, y: 72 },
      { x: cx - 18, y: 62 },
      { x: cx - 15, y: 52 },
      { x: cx - 13, y: 42 },
      { x: cx - 11, y: 32 },
      { x: cx - 11, y: 22 },
      { x: cx - 8, y: 14 },
      { x: cx - 4, y: 8 },
    ];
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(innerPoints, true);

    // 4) Mid-tone vertical band on right (suggests folds/depth)
    g.fillStyle(ROBE, 1);
    g.fillTriangle(cx + 2, 8, cx + 8, 8, cx + 14, 76);

    // 5) Right-edge rim highlight
    g.fillStyle(ROBE_HI, 1);
    g.fillTriangle(cx + 9, 18, cx + 12, 18, cx + 19, 60);
    g.fillStyle(ROBE_RIM, 0.5);
    g.fillTriangle(cx + 11, 20, cx + 12, 22, cx + 22, 70);

    // 6) Tattered hem streamers — short triangles trailing past the
    //    silhouette's deep-hem points (y=80) into the bottom 7 px of the
    //    canvas (texture bottom at y=88, kept identical to V2 so the
    //    BaseEnemy hitbox centring still aligns with the body). Slight
    //    side-bias on each tip so they look windblown, not symmetric.
    const streamerXs: ReadonlyArray<number> = [-22, -14, -5, 5, 14, 22];
    for (const offset of streamerXs) {
      const tx = cx + offset;
      const baseY = 80;
      const tipY = 87;
      const tipBias = offset < 0 ? -1 : 1;
      g.fillStyle(OUT, 1);
      g.fillTriangle(tx - 2, baseY, tx + 2, baseY, tx + tipBias, tipY);
      g.fillStyle(ROBE_DARK, 1);
      g.fillTriangle(tx - 1, baseY + 1, tx + 1, baseY + 1, tx + tipBias, tipY - 1);
    }

    // 7) Hood void — SMALL POINTED/peaked cowl (teardrop, taller than wide),
    //    NOT a round ball. Peak at top, narrowing chin-void at the bottom.
    g.fillStyle(OUT, 1);
    g.fillPoints(
      [
        { x: cx, y: 2 },        // peaked top of the cowl
        { x: cx + 6, y: 9 },    // right shoulder of the cowl
        { x: cx + 5, y: 17 },   // right cheek narrowing
        { x: cx, y: 22 },       // pointed chin-void
        { x: cx - 5, y: 17 },   // left cheek narrowing
        { x: cx - 6, y: 9 },    // left shoulder of the cowl
      ],
      true,
    );

    // 8) Trinity eyes — three vertical amethyst pinpoints deep in the
    //    hood shadow. One per consumed floor gem (Emerald / Sapphire /
    //    Amethyst). Centred horizontally instead of two side-by-side.
    for (let i = 0; i < 3; i++) {
      const ey = 11 + i * 3; // 11, 14, 17
      g.fillStyle(EYE, 0.32);
      g.fillCircle(cx, ey, 1.8);
      g.fillStyle(EYE, 0.7);
      g.fillCircle(cx, ey, 1);
      g.fillStyle(EYE_HI, 1);
      g.fillRect(cx, ey, 1, 1);
    }
    // Faint center-vertical glow strip linking the three eyes (subtle).
    g.fillStyle(EYE, 0.18);
    g.fillRect(cx, 11, 1, 7);

    // 9) Three runic sigils stitched into the chest in dark thread.
    //    Each ends in a tiny gem-coloured node so the sigils read as the
    //    "captured" gems. Positions sit just above the upper-chest level
    //    so they don't clash with the prism + bound-chains below.
    const sigilY = 26;
    // 9a) Emerald — leaf-cross sigil at left
    g.fillStyle(RUNE_THREAD, 1);
    g.fillRect(cx - 11, sigilY - 3, 1, 7);
    g.fillRect(cx - 13, sigilY, 5, 1);
    g.fillStyle(EMERALD, 0.95);
    g.fillRect(cx - 11, sigilY, 1, 1);
    // 9b) Sapphire — small sine wave at center
    g.fillStyle(RUNE_THREAD, 1);
    g.fillRect(cx - 3, sigilY + 1, 1, 1);
    g.fillRect(cx - 2, sigilY, 1, 1);
    g.fillRect(cx - 1, sigilY - 1, 1, 1);
    g.fillRect(cx, sigilY, 1, 1);
    g.fillRect(cx + 1, sigilY + 1, 1, 1);
    g.fillRect(cx + 2, sigilY, 1, 1);
    g.fillRect(cx + 3, sigilY - 1, 1, 1);
    g.fillStyle(SAPPHIRE, 0.95);
    g.fillRect(cx, sigilY, 1, 1);
    // 9c) Amethyst — 4-point diamond at right
    g.fillStyle(RUNE_THREAD, 1);
    g.fillRect(cx + 11, sigilY - 3, 1, 1);
    g.fillRect(cx + 10, sigilY - 2, 1, 1);
    g.fillRect(cx + 12, sigilY - 2, 1, 1);
    g.fillRect(cx + 9, sigilY - 1, 1, 1);
    g.fillRect(cx + 13, sigilY - 1, 1, 1);
    g.fillRect(cx + 8, sigilY, 1, 1);
    g.fillRect(cx + 14, sigilY, 1, 1);
    g.fillRect(cx + 9, sigilY + 1, 1, 1);
    g.fillRect(cx + 13, sigilY + 1, 1, 1);
    g.fillRect(cx + 10, sigilY + 2, 1, 1);
    g.fillRect(cx + 12, sigilY + 2, 1, 1);
    g.fillRect(cx + 11, sigilY + 3, 1, 1);
    g.fillStyle(AMETHYST, 0.95);
    g.fillRect(cx + 11, sigilY, 1, 1);

    // 10) Skeletal hands cradling the prism — kept from V2, but the
    //     prism is now wrapped in shadow chains so the hands read as the
    //     vessel that imprisons rather than the priest that displays.
    g.fillStyle(HAND_OUT, 1);
    g.fillRect(cx - 6, 46, 3, 5);
    g.fillRect(cx + 3, 46, 3, 5);
    g.fillStyle(HAND, 1);
    g.fillRect(cx - 5, 47, 2, 3);
    g.fillRect(cx + 4, 47, 2, 3);
    g.fillStyle(HAND_HI, 0.7);
    g.fillRect(cx - 5, 47, 1, 2);
    g.fillRect(cx + 4, 47, 1, 2);

    // 11) PRISM — same chromatic split as V2, but dimmed halo + bound by
    //     three coiling shadow chains that wrap it.
    const px = cx;
    const py = 54;
    const ph = 14;
    const pw = 12;

    // Dimmer halo (more ominous than V2's bright multi-tone ring).
    g.fillStyle(0x000000, 0.30);
    g.fillCircle(px, py, 12);
    g.fillStyle(AMETHYST, 0.18);
    g.fillCircle(px, py, 8);

    // 11a) Three shadow-chain loops coiling the prism. At native 64×88
    //      a full ellipse-loop would be ~7 px wide, so the chains are
    //      drawn as small dotted/ribbon segments along sine paths above,
    //      across, and below the prism.
    const chainY = py;
    g.fillStyle(SHADOW, 1);
    for (let loop = 0; loop < 3; loop++) {
      const yOff = (loop - 1) * 4; // -4, 0, +4
      const ySpan = chainY + yOff;
      // 12-segment ribbon scribbled across the prism width
      const segs = 12;
      for (let s = 0; s < segs; s++) {
        const t = s / (segs - 1);
        const ang = t * Math.PI * 2 + loop * 0.9;
        const r = 7 + Math.sin(ang * 2) * 1.5;
        const x = px + (t * 2 - 1) * r;
        const y = ySpan + Math.sin(ang) * 1.5;
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    // Faint amethyst leak between chain links so the prism is "trying
    // to escape".
    g.fillStyle(AMETHYST, 0.45);
    g.fillRect(px - 1, py - 6, 1, 1);
    g.fillRect(px + 1, py + 6, 1, 1);

    // 11b) Prism outline — equilateral-ish triangle, point up
    g.fillStyle(PRISM_OUT, 1);
    g.fillTriangle(px, py - ph / 2 - 1, px + pw / 2 + 1, py + ph / 2, px - pw / 2 - 1, py + ph / 2);
    // Inner prism — three vertical bands for chromatic split
    g.fillStyle(PRISM_R, 1);
    g.fillTriangle(px - 1, py - ph / 2 + 2, px - pw / 2 + 2, py + ph / 2 - 1, px + 1, py + ph / 2 - 1);
    g.fillStyle(PRISM_B, 1);
    g.fillTriangle(px + 1, py - ph / 2 + 2, px + pw / 2 - 2, py + ph / 2 - 1, px - 1, py + ph / 2 - 1);
    g.fillStyle(PRISM_G, 0.7);
    g.fillTriangle(px, py - ph / 2 + 3, px - 2, py + ph / 2 - 3, px + 2, py + ph / 2 - 3);
    // Top-vertex sparkle + bottom-edge highlight
    g.fillStyle(PRISM_CORE, 1);
    g.fillRect(px, py - ph / 2 + 1, 1, 2);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(px - pw / 2 + 2, py + ph / 2 - 1, pw - 4, 1);

    g.generateTexture(TextureKeys.BossLordOnyx, w, h);
  }
}
