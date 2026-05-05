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
  rockDecoKey,
  shopDoorKey,
  treasureDoorKey,
  treeDecoKey,
  wallTileKey,
} from '../config/GameConfig';
import { FLOORS } from '../data/floors';
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

    this.drawWizardTexture(g);
    this.drawMagicMissileTexture(g);
    this.drawForestSpriteTexture(g);
    this.drawMossySlimeTexture(g);
    this.drawVineSproutTexture(g);
    this.drawPixieDancerTexture(g);
    this.drawBossMossyBehemothTexture(g);
    this.drawBossPixieQueenTexture(g);
    this.drawBossForestHeartTexture(g);
    this.drawThornTexture(g);
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
    this.drawItemCaffeinePillTexture(g);
    this.drawItemPixieDustTexture(g);
    this.drawItemHeartContainerTexture(g);
    this.drawItemCrownOfTheVineTexture(g);
    this.drawItemAncientHeartTexture(g);
    this.drawItemWitheredFangTexture(g);

    for (const theme of Object.values(FLOORS)) {
      this.drawFloorTextures(g, theme);
      this.drawWallTexture(g, theme);
      this.drawBossDoorTexture(g, theme);
      this.drawTreasureDoorTexture(g, theme);
      this.drawShopDoorTexture(g, theme);
      this.drawMushroomTexture(g, theme);
      this.drawRockTexture(g, theme);
      this.drawTreeTexture(g, theme);
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
   */
  private drawWizardTexture(g: Phaser.GameObjects.Graphics): void {
    const size = TILE_SIZE;
    g.clear();

    // Mockup grid is ~24 cols × 26 rows. PX = 2 → 48 × 52, fits inside 64².
    const PX = 2;
    const GRID_W = 24;
    const GRID_H = 26;
    const offX = Math.floor((size - GRID_W * PX) / 2);
    const offY = Math.floor((size - GRID_H * PX) / 2);

    const OUT = 0x1a0828;
    const HAT = 0x5a1f9a;
    const HAT_DARK = 0x3a0f70;
    const HAT_HI = 0x7a3fbe;
    const SKIN = 0xf0c89a;
    const SKIN_SHADOW = 0xc89a6c;
    const ROBE = 0x7a2cb8;
    const ROBE_HI = 0x9a4cd8;
    const ROBE_SHADOW = 0x5a1c98;
    const BEARD = 0xe8e8e8;
    const BEARD_SHADOW = 0xa8a8a8;
    const BUCKLE = 0xffd84a;
    const WAND = 0xc89758;
    const TIP = 0xffd84a;
    const SHADOW = 0x3a2a4a;
    const BOOT = 0x2a1a0d;
    const BOOT_HI = 0x4a3a2d;
    const EYE = 0x222222;
    const TIP_SPARKLE = 0xfff8c0;

    const block = (x: number, y: number, w: number, h: number, color: number): void =>
      this.pxBlock(g, x, y, w, h, color, PX, offX, offY);
    const dot = (x: number, y: number, color: number): void =>
      this.px(g, x, y, color, PX, offX, offY);

    // Hat tip (gold orb at top)
    block(11, 5, 2, 1, TIP);
    block(11, 4, 1, 1, OUT);
    block(12, 4, 1, 1, OUT);

    // Hat — narrowing cone with outline + dark side + highlight
    // Row y=6
    block(10, 6, 1, 1, OUT);
    block(11, 6, 2, 1, HAT_DARK);
    block(13, 6, 1, 1, OUT);
    // Row y=7
    block(10, 7, 1, 1, OUT);
    block(11, 7, 2, 1, HAT_HI);
    block(13, 7, 1, 1, HAT_DARK);
    block(14, 7, 1, 1, OUT);
    // Row y=8
    block(9, 8, 1, 1, OUT);
    block(10, 8, 1, 1, HAT_HI);
    block(11, 8, 1, 1, HAT_HI);
    block(12, 8, 2, 1, HAT);
    block(14, 8, 1, 1, HAT_DARK);
    block(15, 8, 1, 1, OUT);
    // Row y=9
    block(9, 9, 1, 1, OUT);
    block(10, 9, 1, 1, HAT_HI);
    block(11, 9, 3, 1, HAT);
    block(14, 9, 1, 1, HAT_DARK);
    block(15, 9, 1, 1, OUT);
    // Hat brim
    block(7, 10, 1, 1, OUT);
    block(8, 10, 8, 1, HAT_DARK);
    block(16, 10, 1, 1, OUT);
    // Shadow under brim
    block(8, 11, 8, 1, SHADOW);

    // Face row y=11 outlines
    block(8, 11, 1, 1, OUT);
    block(15, 11, 1, 1, OUT);
    // Face row y=12: skin
    block(8, 12, 1, 1, OUT);
    block(15, 12, 1, 1, OUT);
    block(9, 12, 6, 1, SKIN);
    dot(10, 12, EYE);
    dot(13, 12, EYE);
    // Face row y=13
    block(8, 13, 1, 1, OUT);
    block(15, 13, 1, 1, OUT);
    block(9, 13, 6, 1, SKIN);
    dot(11, 13, SKIN_SHADOW);
    dot(12, 13, SKIN_SHADOW);

    // Beard — three rows tapering, with subtle shadow detail pixels
    block(8, 14, 1, 1, OUT);
    block(15, 14, 1, 1, OUT);
    block(9, 14, 6, 1, BEARD);
    dot(10, 14, BEARD_SHADOW);
    dot(13, 14, BEARD_SHADOW);
    block(8, 15, 1, 1, OUT);
    block(15, 15, 1, 1, OUT);
    block(9, 15, 6, 1, BEARD);
    dot(11, 15, BEARD_SHADOW);
    dot(12, 15, BEARD_SHADOW);
    block(9, 16, 1, 1, OUT);
    block(14, 16, 1, 1, OUT);
    block(10, 16, 4, 1, BEARD);

    // Robe — shoulders down to hem, highlight on the left, shadow on the right
    block(8, 17, 1, 1, OUT);
    block(15, 17, 1, 1, OUT);
    block(9, 17, 6, 1, ROBE);
    dot(9, 17, ROBE_HI);
    dot(14, 17, ROBE_SHADOW);
    block(7, 18, 1, 1, OUT);
    block(16, 18, 1, 1, OUT);
    block(8, 18, 8, 1, ROBE);
    dot(8, 18, ROBE_HI);
    block(14, 18, 2, 1, ROBE_SHADOW);
    block(7, 19, 1, 1, OUT);
    block(16, 19, 1, 1, OUT);
    block(8, 19, 8, 1, ROBE);
    dot(8, 19, ROBE_HI);
    block(14, 19, 2, 1, ROBE_SHADOW);
    // Belt
    block(7, 20, 1, 1, OUT);
    block(16, 20, 1, 1, OUT);
    block(8, 20, 8, 1, BOOT);
    dot(11, 20, BUCKLE);
    dot(12, 20, BUCKLE);
    // Robe lower
    block(7, 21, 1, 1, OUT);
    block(16, 21, 1, 1, OUT);
    block(8, 21, 8, 1, ROBE);
    dot(8, 21, ROBE_HI);
    block(14, 21, 2, 1, ROBE_SHADOW);
    block(6, 22, 1, 1, OUT);
    block(17, 22, 1, 1, OUT);
    block(7, 22, 10, 1, ROBE);
    dot(7, 22, ROBE_HI);
    block(14, 22, 3, 1, ROBE_SHADOW);
    block(6, 23, 1, 1, OUT);
    block(17, 23, 1, 1, OUT);
    block(7, 23, 10, 1, ROBE_SHADOW);

    // Wand peeking out on right side (rises behind shoulder)
    dot(17, 17, WAND);
    dot(18, 16, WAND);
    block(19, 14, 1, 1, OUT);
    block(19, 15, 1, 1, OUT);
    dot(19, 14, TIP);
    dot(19, 15, TIP);
    dot(18, 13, TIP_SPARKLE);

    // Feet
    block(9, 24, 2, 1, BOOT);
    block(13, 24, 2, 1, BOOT);
    dot(9, 24, BOOT_HI);
    dot(13, 24, BOOT_HI);

    // Ground shadow under boots (semi-transparent ellipse)
    const groundCx = offX + 12 * PX;
    const groundCy = offY + 25.4 * PX;
    this.groundShadow(g, groundCx, groundCy, 4 * PX, 1.2 * PX, 0.4);

    g.generateTexture(TextureKeys.Player, size, size);
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

    // Outer trail-glow halos (two soft rings)
    g.fillStyle(0xc084fc, 0.18);
    g.fillCircle(cx, cy, cx);
    g.fillStyle(0xc084fc, 0.4);
    g.fillCircle(cx, cy, cx - 2);
    // Mid violet
    g.fillStyle(0xa855f7, 0.85);
    g.fillCircle(cx, cy, cx - 4);
    // Bright lavender core
    g.fillStyle(0xe9d5ff, 1);
    g.fillCircle(cx, cy, cx - 6);
    // White-hot center
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, 2);
    // Outline
    g.lineStyle(1, 0x2a0c4a, 1);
    g.strokeCircle(cx, cy, cx - 3);
    // Specular highlight (top-left)
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx - 2, cy - 2, 1.5);

    g.generateTexture(TextureKeys.MagicMissile, size, size);
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

      // Base
      g.fillStyle(floorBase, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // Accent speckles (mid tone)
      const accentSpeckles = 14 + rng.intBetween(0, 8);
      g.fillStyle(floorAccent, 1);
      for (let i = 0; i < accentSpeckles; i++) {
        const x = rng.intBetween(2, TILE_SIZE - 3);
        const y = rng.intBetween(2, TILE_SIZE - 3);
        const s = rng.intBetween(1, 2);
        g.fillRect(x, y, s, s);
      }

      // Dark sprinkles (dirt clumps) — fall back on `ambient` so the colour
      // stays palette-driven for future floors.
      const darkSpeckles = 6 + rng.intBetween(0, 4);
      g.fillStyle(ambient, 1);
      for (let i = 0; i < darkSpeckles; i++) {
        const x = rng.intBetween(2, TILE_SIZE - 3);
        const y = rng.intBetween(2, TILE_SIZE - 3);
        g.fillRect(x, y, 1, 1);
      }

      // Grass tufts: a small vertical mid-toned blade with a brighter cap.
      const tufts = 2 + rng.intBetween(0, 2);
      for (let i = 0; i < tufts; i++) {
        const x = rng.intBetween(6, TILE_SIZE - 7);
        const y = rng.intBetween(6, TILE_SIZE - 7);
        g.fillStyle(floorAccent, 1);
        g.fillRect(x, y, 2, 3);
        g.fillStyle(glow, 0.55);
        g.fillRect(x, y, 2, 1);
      }

      // Occasional glowing sparkle pixel.
      if (rng.chance(0.5)) {
        const dots = rng.intBetween(1, 2);
        g.fillStyle(glow, 0.7);
        for (let i = 0; i < dots; i++) {
          const x = rng.intBetween(6, TILE_SIZE - 7);
          const y = rng.intBetween(6, TILE_SIZE - 7);
          g.fillCircle(x, y, 1.4);
        }
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
    const { wallBase, wallHighlight, ambient, glow } = theme.palette;
    const rng = new RNG(`${theme.id}-wall`);

    g.clear();

    // Base fill
    g.fillStyle(wallBase, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Brick pattern: two rows, second offset by half a brick.
    // Brick size: full width = TILE_SIZE/2 wide, TILE_SIZE/2 tall.
    const BRICK_W = TILE_SIZE / 2;
    const BRICK_H = TILE_SIZE / 2;
    const drawBrick = (bx: number, by: number): void => {
      // Brick face (slightly inset from mortar).
      g.fillStyle(wallBase, 1);
      g.fillRect(bx, by, BRICK_W - 1, BRICK_H - 1);
      // Top highlight strip.
      g.fillStyle(wallHighlight, 1);
      g.fillRect(bx, by, BRICK_W - 1, 3);
      // Bottom shadow strip.
      g.fillStyle(ambient, 1);
      g.fillRect(bx, by + BRICK_H - 3, BRICK_W - 1, 2);
    };

    // Mortar background (darker than wallBase).
    g.fillStyle(ambient, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Row 0 — flush bricks
    drawBrick(0, 0);
    drawBrick(BRICK_W, 0);
    // Row 1 — offset by half so vertical seams stagger
    drawBrick(-BRICK_W / 2, BRICK_H);
    drawBrick(BRICK_W / 2, BRICK_H);
    drawBrick((BRICK_W * 3) / 2, BRICK_H);

    // Mossy highlight patches — scattered, palette-driven via wallHighlight.
    g.fillStyle(wallHighlight, 0.9);
    const moss = 2 + rng.intBetween(0, 2);
    for (let i = 0; i < moss; i++) {
      const mx = rng.intBetween(4, TILE_SIZE - 6);
      const my = rng.intBetween(4, TILE_SIZE - 6);
      g.fillRect(mx, my, 2, 2);
      g.fillRect(mx + 1, my - 1, 1, 1);
    }

    // Glow crack — short broken polyline with bright pixel near the head.
    const cracks = 1 + rng.intBetween(0, 1);
    for (let c = 0; c < cracks; c++) {
      let x = rng.intBetween(8, TILE_SIZE - 10);
      let y = rng.intBetween(6, TILE_SIZE - 18);
      g.fillStyle(glow, 0.85);
      g.fillRect(x, y, 1, 1);
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(x, y, 1, 1);
      const segs = 4 + rng.intBetween(0, 2);
      g.fillStyle(glow, 0.55);
      for (let s = 0; s < segs; s++) {
        x += rng.intBetween(-1, 1);
        y += 1 + rng.intBetween(0, 1);
        if (y >= TILE_SIZE - 2 || x < 1 || x >= TILE_SIZE - 1) break;
        g.fillRect(x, y, 1, 1);
      }
    }

    // Outer outline so wall tiles separate cleanly from the floor / each other.
    g.lineStyle(2, 0x000000, 0.45);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(wallTileKey(theme.id), TILE_SIZE, TILE_SIZE);
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

    // Dark base
    g.fillStyle(0x1a0a14, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Stone frame (palette-driven)
    g.fillStyle(wallBase, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(ambient, 1);
    g.fillRect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12);

    // Frame highlight + shadow strips for chiseled feel
    g.fillStyle(0x4a3a2a, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, 2); // top hi
    g.fillRect(2, 2, 2, TILE_SIZE - 4); // left hi
    g.fillStyle(0x080404, 1);
    g.fillRect(2, TILE_SIZE - 4, TILE_SIZE - 4, 2); // bottom shadow
    g.fillRect(TILE_SIZE - 4, 2, 2, TILE_SIZE - 4); // right shadow

    // Gold corner studs
    const stud = (sx: number, sy: number): void => {
      g.fillStyle(0x7a5a1a, 1);
      g.fillRect(sx, sy, 4, 4);
      g.fillStyle(0xffd84a, 1);
      g.fillRect(sx, sy, 3, 3);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(sx, sy, 1, 1);
    };
    stud(4, 4);
    stud(TILE_SIZE - 8, 4);
    stud(4, TILE_SIZE - 8);
    stud(TILE_SIZE - 8, TILE_SIZE - 8);

    // Skull / sigil center — magenta glow ring + dark socket + gold cross-eyes.
    g.fillStyle(0xff44aa, 0.45);
    g.fillCircle(cx, cy, 16);
    g.fillStyle(0xff44aa, 0.8);
    g.fillCircle(cx, cy, 12);
    g.fillStyle(0x14040a, 1);
    g.fillCircle(cx, cy, 9);

    // Skull silhouette (rounded top + jaw notch)
    g.fillStyle(0xe0d0d8, 1);
    g.fillCircle(cx, cy - 1, 6);
    g.fillRect(cx - 4, cy + 2, 8, 4);
    // Eye sockets
    g.fillStyle(0x14040a, 1);
    g.fillRect(cx - 4, cy - 2, 2, 3);
    g.fillRect(cx + 2, cy - 2, 2, 3);
    // Glowing pupils
    g.fillStyle(0xff44aa, 1);
    g.fillRect(cx - 3, cy - 1, 1, 1);
    g.fillRect(cx + 3, cy - 1, 1, 1);
    // Tooth gap
    g.fillStyle(0x14040a, 1);
    g.fillRect(cx - 1, cy + 3, 2, 2);

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(bossDoorKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  /**
   * Treasure door — same chiseled stone frame as the boss door but the
   * sigil center is a golden padlock (gold body + dark keyhole) so the
   * player can read at a glance "key required, item room beyond".
   */
  private drawTreasureDoorTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, ambient } = theme.palette;
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2;

    g.clear();

    g.fillStyle(0x140e08, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.fillStyle(wallBase, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(ambient, 1);
    g.fillRect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12);

    // Frame highlight + shadow
    g.fillStyle(0x4a3a2a, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, 2);
    g.fillRect(2, 2, 2, TILE_SIZE - 4);
    g.fillStyle(0x080404, 1);
    g.fillRect(2, TILE_SIZE - 4, TILE_SIZE - 4, 2);
    g.fillRect(TILE_SIZE - 4, 2, 2, TILE_SIZE - 4);

    // Gold corner studs
    const stud = (sx: number, sy: number): void => {
      g.fillStyle(0x7a5a1a, 1);
      g.fillRect(sx, sy, 4, 4);
      g.fillStyle(0xffd84a, 1);
      g.fillRect(sx, sy, 3, 3);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(sx, sy, 1, 1);
    };
    stud(4, 4);
    stud(TILE_SIZE - 8, 4);
    stud(4, TILE_SIZE - 8);
    stud(TILE_SIZE - 8, TILE_SIZE - 8);

    // Gold halo behind the lock
    g.fillStyle(0xffd84a, 0.18);
    g.fillCircle(cx, cy, 16);
    g.fillStyle(0xffd84a, 0.32);
    g.fillCircle(cx, cy, 11);

    // Shackle (the curved bar on top of the lock body) — drawn as a thick
    // semicircle minus the inner cutout.
    g.fillStyle(0x7a5a1a, 1);
    g.fillCircle(cx, cy - 2, 7);
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx, cy - 2, 6);
    g.fillStyle(ambient, 1);
    g.fillCircle(cx, cy - 2, 4);
    // Cut the bottom of the shackle so it sits on the lock body
    g.fillStyle(ambient, 1);
    g.fillRect(cx - 7, cy, 14, 4);

    // Lock body — chunky rectangle below the shackle
    g.fillStyle(0x080404, 1);
    g.fillRect(cx - 7, cy - 1, 14, 11);
    g.fillStyle(0x7a5a1a, 1);
    g.fillRect(cx - 6, cy, 12, 9);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 5, cy + 1, 10, 7);
    // Top highlight on the lock
    g.fillStyle(0xfff0a0, 1);
    g.fillRect(cx - 5, cy + 1, 10, 1);
    g.fillRect(cx - 5, cy + 1, 1, 6);

    // Keyhole — dark circle + tail
    g.fillStyle(0x14080a, 1);
    g.fillCircle(cx, cy + 3, 2);
    g.fillRect(cx - 1, cy + 3, 2, 4);

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(treasureDoorKey(theme.id), TILE_SIZE, TILE_SIZE);
  }

  /**
   * Shop door — wooden brown accents on the chiseled stone frame, with a
   * stylised gold coin in the center (concentric circles + a "$" mark) so
   * the player reads "store / merchant" at a glance.
   */
  private drawShopDoorTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const { wallBase, ambient } = theme.palette;
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2;

    g.clear();

    // Dark base — wooden brown rather than the boss door's purple-black, so
    // the door reads warm.
    g.fillStyle(0x1a0e06, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Stone frame (palette-driven) with a wooden inset
    g.fillStyle(wallBase, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.fillStyle(0x4a2e1a, 1); // wooden inset
    g.fillRect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12);
    g.fillStyle(ambient, 0.6);
    g.fillRect(8, 8, TILE_SIZE - 16, TILE_SIZE - 16);

    // Wooden plank lines
    g.fillStyle(0x2e1c0c, 1);
    g.fillRect(8, 22, TILE_SIZE - 16, 1);
    g.fillRect(8, 40, TILE_SIZE - 16, 1);

    // Frame highlight + shadow
    g.fillStyle(0x5a3a2a, 1);
    g.fillRect(2, 2, TILE_SIZE - 4, 2);
    g.fillRect(2, 2, 2, TILE_SIZE - 4);
    g.fillStyle(0x080404, 1);
    g.fillRect(2, TILE_SIZE - 4, TILE_SIZE - 4, 2);
    g.fillRect(TILE_SIZE - 4, 2, 2, TILE_SIZE - 4);

    // Gold corner studs
    const stud = (sx: number, sy: number): void => {
      g.fillStyle(0x7a5a1a, 1);
      g.fillRect(sx, sy, 4, 4);
      g.fillStyle(0xffd84a, 1);
      g.fillRect(sx, sy, 3, 3);
      g.fillStyle(0xfff0a0, 1);
      g.fillRect(sx, sy, 1, 1);
    };
    stud(4, 4);
    stud(TILE_SIZE - 8, 4);
    stud(4, TILE_SIZE - 8);
    stud(TILE_SIZE - 8, TILE_SIZE - 8);

    // Gold coin halo
    g.fillStyle(0xffd84a, 0.22);
    g.fillCircle(cx, cy, 14);

    // Coin disc — outer gold rim, inner pale yellow face
    g.fillStyle(0x080404, 1);
    g.fillCircle(cx, cy, 11);
    g.fillStyle(0x7a5a1a, 1);
    g.fillCircle(cx, cy, 10);
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx, cy, 8);
    g.fillStyle(0xfff0a0, 1);
    g.fillCircle(cx, cy, 7);
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx, cy, 6);
    // Top-left highlight on the coin
    g.fillStyle(0xfff0a0, 0.8);
    g.fillCircle(cx - 2, cy - 2, 2);

    // "$" mark — pixel-style. Three short bars forming an S + a vertical line.
    const dark = 0x14080a;
    g.fillStyle(dark, 1);
    g.fillRect(cx - 1, cy - 5, 2, 11); // vertical bar
    g.fillRect(cx - 3, cy - 3, 6, 2);  // top bar
    g.fillRect(cx - 3, cy - 1, 6, 2);  // mid bar (offset for S-curve feel)
    g.fillRect(cx - 3, cy + 1, 6, 2);  // bottom bar

    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(shopDoorKey(theme.id), TILE_SIZE, TILE_SIZE);
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

    // Glow halo under the cap
    g.fillStyle(glow, 0.22);
    g.fillCircle(cx, 11, 9);
    g.fillStyle(glow, 0.4);
    g.fillCircle(cx, 11, 6);

    // Stem outline + fill + highlight
    g.fillStyle(ambient, 1);
    g.fillRect(cx - 2, 11, 4, 6); // outline-ish
    g.fillStyle(0xd6d0c2, 1);
    g.fillRect(cx - 1, 11, 2, 6);
    g.fillStyle(0xf2ecdc, 1);
    g.fillRect(cx - 1, 11, 1, 6);

    // Cap silhouette (dark outline)
    g.fillStyle(ambient, 1);
    g.fillRect(cx - 4, 6, 8, 1);
    g.fillRect(cx - 5, 7, 10, 1);
    g.fillRect(cx - 5, 8, 10, 1);
    g.fillRect(cx - 4, 9, 8, 1);
    // Cap fill — bright glow tone
    g.fillStyle(glow, 1);
    g.fillRect(cx - 4, 7, 8, 1);
    g.fillRect(cx - 4, 8, 8, 1);
    // Cap shadow band along bottom
    g.fillStyle(0x3aa86a, 1);
    g.fillRect(cx - 4, 9, 8, 1);
    // Highlight pixels on the cap
    g.fillStyle(0xa0ffc0, 1);
    g.fillRect(cx - 2, 7, 1, 1);
    // White spots
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 1, 8, 1, 1);
    g.fillRect(cx + 2, 8, 1, 1);

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
    const cy = h / 2;
    const { glow } = theme.palette;

    g.clear();

    // Drop shadow underneath
    this.groundShadow(g, cx, h - 3, w / 2 - 2, 3, 0.45);

    // Rock body — base, then progressively lighter ellipses for tone bands.
    g.fillStyle(0x14110d, 1);
    g.fillEllipse(cx, cy + 2, w - 4, h - 6);
    g.fillStyle(0x3a3631, 1);
    g.fillEllipse(cx, cy + 1, w - 6, h - 8);
    g.fillStyle(0x5a554c, 1);
    g.fillEllipse(cx, cy - 1, w - 10, h - 12);
    g.fillStyle(0x726b5e, 1);
    g.fillEllipse(cx - 4, cy - 4, 12, 5);
    // Tiny lighter highlight pixels
    g.fillStyle(0x9a9080, 1);
    g.fillRect(cx - 6, cy - 5, 2, 1);
    g.fillRect(cx - 2, cy - 6, 1, 1);

    // Outline
    g.lineStyle(1.5, 0x080604, 1);
    g.strokeEllipse(cx, cy, w - 4, h - 6);

    // Moss patches in floor's glow color
    g.fillStyle(glow, 0.9);
    g.fillCircle(cx - 8, cy - 2, 2);
    g.fillCircle(cx + 6, cy + 3, 1.5);
    g.fillCircle(cx + 2, cy - 6, 1.2);
    // Brighter moss pixel highlight
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(cx - 8, cy - 3, 1, 1);

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

    // Ground shadow
    this.groundShadow(g, cx, h - 3, 8, 2.5, 0.45);

    // Trunk outline + base + highlight + bark lines
    g.fillStyle(0x100a06, 1);
    g.fillRect(cx - 4, 25, 8, 17);
    g.fillStyle(0x3a2818, 1);
    g.fillRect(cx - 3, 26, 6, 16);
    g.fillStyle(0x5a3e22, 1);
    g.fillRect(cx - 3, 26, 1, 16); // left highlight
    g.fillStyle(0x1f1208, 1);
    g.fillRect(cx + 2, 26, 1, 16); // right shadow
    // Bark notches
    g.fillStyle(0x1f1208, 1);
    g.fillRect(cx - 2, 30, 2, 1);
    g.fillRect(cx, 35, 2, 1);

    // Foliage — three overlapping ellipses, dark to mid to highlight.
    g.fillStyle(0x040a05, 1); // outline
    g.fillEllipse(cx, 18, 26, 22);
    g.fillEllipse(cx - 8, 14, 16, 16);
    g.fillEllipse(cx + 8, 14, 16, 16);
    g.fillStyle(0x132014, 1);
    g.fillEllipse(cx, 18, 24, 20);
    g.fillEllipse(cx - 7, 14, 14, 14);
    g.fillEllipse(cx + 7, 14, 14, 14);
    // Mid green
    g.fillStyle(0x1f3a24, 1);
    g.fillEllipse(cx, 17, 20, 16);
    g.fillEllipse(cx - 6, 13, 11, 11);
    // Highlight cluster top-left
    g.fillStyle(0x2d6634, 1);
    g.fillEllipse(cx - 4, 11, 10, 8);
    // Sparkle pixel highlight
    g.fillStyle(0x88c060, 1);
    g.fillRect(cx - 6, 9, 2, 1);

    // Glow accents (palette-coloured berries / leaves)
    g.fillStyle(glow, 0.95);
    g.fillCircle(cx + 6, 10, 1.6);
    g.fillCircle(cx - 8, 18, 1.3);
    g.fillCircle(cx + 3, 22, 1.1);

    // Inner shadow at bottom of foliage so trunk reads as separate
    g.fillStyle(ambient, 0.5);
    g.fillEllipse(cx, 24, 20, 6);

    g.generateTexture(treeDecoKey(theme.id), w, h);
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

    // Outer + inner halo
    g.fillStyle(0x6effa0, 0.18);
    g.fillCircle(cx, cy, cx);
    g.fillStyle(0x6effa0, 0.32);
    g.fillCircle(cx, cy, cx - 4);

    // Mockup grid is 16×16 anchored around (10,10). PX=2 → 32×32, fits nicely.
    const PX = 2;
    const offX = 0;
    const offY = 0;

    const OUT = 0x1e4022;
    const BODY = 0x7ad068;
    const HI = 0xb8f098;
    const WING = 0xc0e0a0;
    const EYE = 0x0a0a0a;

    const block = (x: number, y: number, w: number, h: number, color: number): void =>
      this.pxBlock(g, x, y, w, h, color, PX, offX, offY);
    const dot = (x: number, y: number, color: number): void =>
      this.px(g, x, y, color, PX, offX, offY);

    // Wings
    block(5, 8, 2, 1, WING);
    dot(4, 8, OUT);
    dot(5, 9, OUT);
    block(13, 8, 2, 1, WING);
    dot(15, 8, OUT);
    dot(14, 9, OUT);

    // Body silhouette (outline ring)
    block(8, 6, 4, 1, OUT);
    dot(7, 7, OUT);
    dot(12, 7, OUT);
    dot(7, 8, OUT);
    dot(12, 8, OUT);
    dot(7, 9, OUT);
    dot(12, 9, OUT);
    dot(7, 10, OUT);
    dot(12, 10, OUT);
    dot(7, 11, OUT);
    dot(12, 11, OUT);
    block(8, 12, 4, 1, OUT);

    // Body fill
    block(8, 7, 4, 5, BODY);
    block(9, 6, 2, 1, BODY);
    block(9, 12, 2, 1, BODY);

    // Highlight (top-left)
    dot(8, 7, HI);
    dot(9, 7, HI);
    dot(8, 8, HI);

    // Eyes
    dot(9, 9, EYE);
    dot(11, 9, EYE);
    // Mouth
    dot(9, 10, EYE);
    dot(10, 10, EYE);
    dot(11, 10, EYE);

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

    // Mockup grid is 28 × 20. PX = 2 → 56 × 40, centered in 64 × 48 frame so
    // the slime renders at the same pixel density as the Wizard.
    const PX = 2;
    const offX = 4;
    const offY = 4;

    const OUT = 0x0e2a14;
    const BODY = 0x3a7a3a;
    const HI = 0x6cc06c;
    const HI_BRIGHT = 0xa0e0a0;
    const SHADOW = 0x244a26;
    const MOSS = 0x2a5e2a;
    const MOSS_HI = 0x56a04e;
    const EYE = 0x1a1a1a;

    const block = (x: number, y: number, w: number, h: number, color: number): void =>
      this.pxBlock(g, x, y, w, h, color, PX, offX, offY);
    const dot = (x: number, y: number, color: number): void =>
      this.px(g, x, y, color, PX, offX, offY);

    // Ground shadow
    this.groundShadow(g, offX + 14 * PX, offY + 16.5 * PX, 7 * PX, 1.3 * PX, 0.45);

    // Dome silhouette (outline ring)
    block(11, 6, 6, 1, OUT);
    block(9, 7, 10, 1, OUT);
    block(8, 8, 12, 1, OUT);
    block(7, 9, 14, 1, OUT);
    block(6, 15, 16, 1, OUT);
    dot(7, 10, OUT);
    dot(20, 10, OUT);
    dot(7, 11, OUT);
    dot(20, 11, OUT);
    dot(7, 12, OUT);
    dot(20, 12, OUT);
    dot(7, 13, OUT);
    dot(20, 13, OUT);
    dot(7, 14, OUT);
    dot(20, 14, OUT);

    // Body fill
    block(11, 6, 6, 1, BODY);
    block(10, 7, 8, 1, BODY);
    block(9, 8, 10, 1, BODY);
    block(8, 9, 12, 1, BODY);
    block(8, 10, 12, 1, BODY);
    block(8, 11, 12, 1, BODY);
    block(8, 12, 12, 1, BODY);
    block(8, 13, 12, 1, BODY);
    block(8, 14, 12, 1, SHADOW);
    block(7, 15, 14, 1, SHADOW);

    // Top highlight curve
    block(12, 7, 3, 1, HI);
    block(11, 8, 4, 1, HI);
    block(10, 9, 3, 1, HI);
    block(9, 10, 2, 1, HI);
    dot(12, 7, HI_BRIGHT);
    dot(11, 8, HI_BRIGHT);

    // Moss patches
    dot(14, 9, MOSS);
    block(15, 9, 2, 1, MOSS);
    dot(15, 8, MOSS);
    dot(16, 9, MOSS_HI);
    block(17, 11, 2, 1, MOSS);
    dot(18, 11, MOSS_HI);
    block(8, 13, 2, 1, MOSS);
    dot(9, 13, MOSS_HI);

    // Eyes with sparkle
    block(11, 11, 2, 2, EYE);
    block(15, 11, 2, 2, EYE);
    dot(11, 11, 0xffffff);
    dot(15, 11, 0xffffff);

    // Mouth
    block(12, 13, 4, 1, EYE);
    dot(13, 14, EYE);
    dot(14, 14, EYE);

    // Drip droplet
    dot(17, 16, BODY);
    dot(17, 17, BODY);
    dot(17, 18, OUT);

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

    // Ground shadow at base
    this.groundShadow(g, cx, h - 3, 9, 2.5, 0.5);

    // Base / root mound — outline + fill + highlight
    g.fillStyle(0x040a05, 1);
    g.fillEllipse(cx, h - 5, 20, 10);
    g.fillStyle(0x1a2818, 1);
    g.fillEllipse(cx, h - 5, 18, 8);
    g.fillStyle(0x2d4220, 1);
    g.fillEllipse(cx - 1, h - 6, 14, 5);
    // Two visible roots at the base
    g.fillStyle(0x040a05, 1);
    g.fillRect(cx - 8, h - 4, 3, 2);
    g.fillRect(cx + 5, h - 4, 3, 2);

    // Twisting vine — three tapered triangle segments with shading.
    const vineSeg = (
      tipX: number,
      tipY: number,
      baseLX: number,
      baseRX: number,
      baseY: number,
    ): void => {
      // Outline
      g.fillStyle(0x040a05, 1);
      g.fillTriangle(baseLX - 1, baseY, baseRX + 1, baseY, tipX, tipY - 1);
      // Mid green
      g.fillStyle(0x2a5a32, 1);
      g.fillTriangle(baseLX, baseY, baseRX, baseY, tipX, tipY);
      // Highlight
      g.fillStyle(0x4f8a44, 1);
      g.fillTriangle(baseLX, baseY, baseLX + 2, baseY - 1, tipX - 1, tipY + 1);
    };
    vineSeg(cx + 2, h - 16, cx - 2, cx + 4, h - 8);
    vineSeg(cx, h - 24, cx - 4, cx + 2, h - 16);
    vineSeg(cx + 1, h - 30, cx - 2, cx + 4, h - 24);

    // Bud (leafy head) — outline ring, dark green body, mid green inner
    g.fillStyle(0x040a05, 1);
    g.fillCircle(cx, h - 32, 10);
    g.fillStyle(0x1f4a26, 1);
    g.fillCircle(cx, h - 32, 9);
    g.fillStyle(0x2d6634, 1);
    g.fillCircle(cx, h - 32, 7);
    g.fillStyle(0x4f8a44, 1);
    g.fillCircle(cx - 2, h - 34, 4);

    // Eye in the bud (sclera + iris + pupil + sparkle)
    g.fillStyle(0xfff2c4, 1);
    g.fillCircle(cx, h - 32, 4);
    g.fillStyle(0xa64a1a, 1);
    g.fillCircle(cx, h - 32, 2.5);
    g.fillStyle(0x111111, 1);
    g.fillCircle(cx, h - 32, 1.2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 1, h - 33, 1, 1);

    // Side leaves — dark outline + mid green + highlight
    const leaf = (mirror: 1 | -1): void => {
      g.fillStyle(0x040a05, 1);
      g.fillTriangle(cx + mirror * 8, h - 30, cx + mirror * 15, h - 28, cx + mirror * 9, h - 25);
      g.fillStyle(0x2d6634, 1);
      g.fillTriangle(cx + mirror * 8, h - 30, cx + mirror * 13, h - 28, cx + mirror * 9, h - 26);
      g.fillStyle(0x6effa0, 0.85);
      g.fillTriangle(cx + mirror * 9, h - 29, cx + mirror * 12, h - 28, cx + mirror * 10, h - 26);
    };
    leaf(-1);
    leaf(1);

    // Thorn tip on top — outline + body + bright highlight
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

    // Halo (magenta-pink glow, two layers)
    g.fillStyle(0xff7ac0, 0.18);
    g.fillCircle(cx, cy, cx);
    g.fillStyle(0xff7ac0, 0.32);
    g.fillCircle(cx, cy, cx - 3);

    // Wings — translucent leaves with subtle outline
    const wing = (sx: number, sy: number, mirror: 1 | -1): void => {
      g.fillStyle(0xffd0e8, 0.55);
      g.fillEllipse(sx, sy, 10, 8);
      g.fillStyle(0xffffff, 0.4);
      g.fillEllipse(sx + mirror * 1, sy - 1, 6, 5);
      g.lineStyle(1, 0xa84080, 0.6);
      g.strokeEllipse(sx, sy, 10, 8);
    };
    wing(cx - 8, cy - 2, -1);
    wing(cx + 8, cy - 2, 1);
    g.fillStyle(0xfff8a0, 0.45);
    g.fillEllipse(cx - 8, cy + 4, 8, 6);
    g.fillEllipse(cx + 8, cy + 4, 8, 6);

    // Body (pink torso with outline + highlight)
    g.fillStyle(0x4d0d22, 1);
    g.fillEllipse(cx, cy + 1, 9, 12);
    g.fillStyle(0xff5577, 1);
    g.fillEllipse(cx, cy + 1, 7, 10);
    g.fillStyle(0xff90a8, 1);
    g.fillEllipse(cx - 1, cy - 1, 3, 5);

    // Head (skin, with outline + chin shadow)
    g.fillStyle(0x4d0d22, 1);
    g.fillCircle(cx, cy - 6, 4.5);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(cx, cy - 6, 3.5);
    g.fillStyle(0xc89a6c, 1);
    g.fillRect(cx - 2, cy - 4, 4, 1);

    // Hair tuft (auburn)
    g.fillStyle(0x4a1a08, 1);
    g.fillEllipse(cx, cy - 9, 8, 3);
    g.fillStyle(0xa64a1a, 1);
    g.fillEllipse(cx, cy - 9, 6, 2);

    // Eyes
    g.fillStyle(0x111111, 1);
    g.fillRect(cx - 2, cy - 6, 1, 1);
    g.fillRect(cx + 1, cy - 6, 1, 1);
    // Tiny smile
    g.fillStyle(0xa83048, 1);
    g.fillRect(cx - 1, cy - 4, 2, 1);

    // Sparkle pixels around the figure
    g.fillStyle(0xffffff, 0.95);
    g.fillRect(cx - 12, cy - 5, 1, 1);
    g.fillRect(cx + 11, cy + 3, 1, 1);
    g.fillRect(cx + 10, cy - 8, 1, 1);
    g.fillRect(cx - 10, cy + 7, 1, 1);
    g.fillStyle(0xfff8a0, 0.8);
    g.fillRect(cx + 12, cy - 2, 1, 1);
    g.fillRect(cx - 11, cy - 9, 1, 1);

    g.generateTexture(TextureKeys.PixieDancer, size, size);
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

    const PX = 3;
    // Grid is 28 × 20 (same as the slime). PX = 3 → 84 × 60. Centered in
    // 96 × 72 with offsets so the dome reads as a beefier sibling.
    const offX = Math.floor((w - 28 * PX) / 2);
    const offY = Math.floor((h - 20 * PX) / 2);

    const OUT = 0x041a08;
    const BODY = 0x2f6b30;
    const HI = 0x6cc06c;
    const HI_BRIGHT = 0xa0e0a0;
    const SHADOW = 0x1d3e1f;
    const MOSS = 0x244f24;
    const MOSS_HI = 0x56a04e;
    const EYE = 0x1a1a1a;

    const block = (x: number, y: number, gw: number, gh: number, color: number): void =>
      this.pxBlock(g, x, y, gw, gh, color, PX, offX, offY);
    const dot = (x: number, y: number, color: number): void =>
      this.px(g, x, y, color, PX, offX, offY);

    // Heavy ground shadow
    this.groundShadow(g, offX + 14 * PX, offY + 16.5 * PX, 11 * PX, 2 * PX, 0.55);

    // Outline ring (dome silhouette)
    block(11, 5, 6, 1, OUT);
    block(9, 6, 10, 1, OUT);
    block(8, 7, 12, 1, OUT);
    block(7, 8, 14, 1, OUT);
    block(6, 16, 16, 1, OUT);
    for (let y = 9; y <= 15; y++) {
      dot(6, y, OUT);
      dot(21, y, OUT);
    }

    // Body fill — bigger than the slime's 6→14 dome
    block(11, 5, 6, 1, BODY);
    block(10, 6, 8, 1, BODY);
    block(9, 7, 10, 1, BODY);
    block(8, 8, 12, 1, BODY);
    for (let y = 9; y <= 14; y++) block(7, y, 14, 1, BODY);
    block(7, 15, 14, 1, SHADOW);
    block(6, 16, 16, 1, SHADOW);

    // Top highlight curve
    block(12, 6, 4, 1, HI);
    block(11, 7, 6, 1, HI);
    block(10, 8, 4, 1, HI);
    block(9, 9, 3, 1, HI);
    dot(12, 6, HI_BRIGHT);
    dot(13, 6, HI_BRIGHT);
    dot(11, 7, HI_BRIGHT);

    // Heavy moss patches across the dome
    block(8, 9, 3, 1, MOSS);
    block(8, 10, 2, 1, MOSS);
    dot(8, 11, MOSS);
    dot(10, 9, MOSS_HI);
    block(15, 8, 3, 1, MOSS);
    dot(16, 7, MOSS);
    dot(17, 8, MOSS_HI);
    block(17, 12, 3, 1, MOSS);
    dot(18, 13, MOSS_HI);
    block(11, 13, 4, 1, MOSS);
    dot(12, 13, MOSS_HI);

    // THREE eyes (alien). Center eye sits between the side ones.
    block(9, 11, 2, 2, EYE);
    block(13, 11, 2, 2, EYE);
    block(17, 11, 2, 2, EYE);
    dot(9, 11, 0xffffff);
    dot(13, 11, 0xffffff);
    dot(17, 11, 0xffffff);

    // Wide angry mouth
    block(11, 14, 6, 1, EYE);
    dot(12, 15, EYE);
    dot(15, 15, EYE);

    // Big drip on the right shoulder
    dot(20, 17, BODY);
    dot(20, 18, BODY);
    dot(20, 19, OUT);

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

    // Halo — three concentric layers, larger and more saturated than the
    // regular Pixie Dancer's.
    g.fillStyle(0xff7ac0, 0.14);
    g.fillCircle(cx, cy, cx);
    g.fillStyle(0xff7ac0, 0.22);
    g.fillCircle(cx, cy, cx - 5);
    g.fillStyle(0xffaad8, 0.32);
    g.fillCircle(cx, cy, cx - 12);

    // Wings — two pairs (upper + lower), translucent leaves with outline.
    const wing = (sx: number, sy: number, mirror: 1 | -1, scale: number): void => {
      const wW = 16 * scale;
      const wH = 12 * scale;
      g.fillStyle(0xffd0e8, 0.55);
      g.fillEllipse(sx, sy, wW, wH);
      g.fillStyle(0xffffff, 0.4);
      g.fillEllipse(sx + mirror * 1, sy - 1, wW * 0.6, wH * 0.6);
      g.lineStyle(1, 0xa84080, 0.7);
      g.strokeEllipse(sx, sy, wW, wH);
    };
    // Upper wings (smaller, behind shoulders)
    wing(cx - 12, cy - 6, -1, 0.95);
    wing(cx + 12, cy - 6, 1, 0.95);
    // Lower wings (larger, behind hips) — yellow translucent leaves
    g.fillStyle(0xfff8a0, 0.5);
    g.fillEllipse(cx - 14, cy + 6, 14, 10);
    g.fillEllipse(cx + 14, cy + 6, 14, 10);
    g.lineStyle(1, 0xa84080, 0.55);
    g.strokeEllipse(cx - 14, cy + 6, 14, 10);
    g.strokeEllipse(cx + 14, cy + 6, 14, 10);

    // Dress — two-tone (deeper magenta lower, lighter pink upper)
    g.fillStyle(0x4d0d22, 1);
    g.fillEllipse(cx, cy + 4, 18, 22);
    g.fillStyle(0xb02468, 1);
    g.fillEllipse(cx, cy + 6, 15, 18);
    g.fillStyle(0xff5b86, 1);
    g.fillEllipse(cx, cy + 1, 13, 14);
    g.fillStyle(0xff90a8, 1);
    g.fillEllipse(cx - 2, cy - 1, 4, 6);

    // Head (skin + outline + chin shadow)
    g.fillStyle(0x4d0d22, 1);
    g.fillCircle(cx, cy - 10, 7);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(cx, cy - 10, 5.5);
    g.fillStyle(0xc89a6c, 1);
    g.fillRect(cx - 3, cy - 7, 6, 1);

    // Hair tuft (auburn, longer than the Dancer)
    g.fillStyle(0x4a1a08, 1);
    g.fillEllipse(cx, cy - 14, 13, 5);
    g.fillStyle(0xa64a1a, 1);
    g.fillEllipse(cx, cy - 14, 10, 3);

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

    // Eyes
    g.fillStyle(0x111111, 1);
    g.fillRect(cx - 3, cy - 10, 1, 2);
    g.fillRect(cx + 2, cy - 10, 1, 2);
    // Smile
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

    // Outer dark ring (outline of the disk)
    g.fillStyle(0x041a08, 1);
    g.fillCircle(cx, cy, 22);

    // Dark wood-ring tone
    g.fillStyle(0x1f4a26, 1);
    g.fillCircle(cx, cy, 20);

    // Mid green
    g.fillStyle(0x2d6634, 1);
    g.fillCircle(cx, cy, 17);

    // Concentric ring (slightly lighter) — gives the wood-grain feel
    g.lineStyle(1, 0x4f8a44, 0.85);
    g.strokeCircle(cx, cy, 14);
    g.strokeCircle(cx, cy, 10);
    g.strokeCircle(cx, cy, 6);

    // Bright glow core (uses the standard emerald glow color)
    g.fillStyle(0x6effa0, 0.85);
    g.fillCircle(cx, cy, 7);
    g.fillStyle(0xa8ffd0, 1);
    g.fillCircle(cx, cy, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 1, cy - 1, 1.6);

    // Top highlight crescent on the disk
    g.fillStyle(0x6effa0, 0.45);
    g.fillEllipse(cx - 6, cy - 12, 14, 6);

    // Two small "eye" pits to read as a face/heart on the trunk
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

    // Outer glow halo (two layers)
    g.fillStyle(0x6effa0, 0.2);
    g.fillEllipse(w / 2, cy, w - 4, h - 4);
    g.fillStyle(0x6effa0, 0.4);
    g.fillEllipse(w / 2, cy, w - 12, h - 12);

    // Outline triangle
    g.fillStyle(0x041a08, 1);
    g.fillTriangle(baseX - 1, cy - 7, tipX + 1, cy, baseX - 1, cy + 7);

    // Dark base body
    g.fillStyle(0x0e2a14, 1);
    g.fillTriangle(baseX, cy - 6, tipX, cy, baseX, cy + 6);

    // Mid-green body
    g.fillStyle(0x2d6634, 1);
    g.fillTriangle(baseX + 1, cy - 5, tipX - 1, cy, baseX + 1, cy + 5);

    // Bright top ridge highlight
    g.fillStyle(0x88ffaa, 1);
    g.fillTriangle(baseX + 3, cy - 3, tipX - 3, cy - 0.5, tipX - 3, cy + 0.5);

    // Tip glint (white-hot pixel)
    g.fillStyle(0xfaffe0, 1);
    g.fillCircle(tipX - 1, cy, 1.6);
    g.fillStyle(0xffffff, 1);
    g.fillRect(tipX - 1, cy - 1, 1, 1);

    // Two small base notches so it reads as a thorn / barb
    g.fillStyle(0x041a08, 1);
    g.fillRect(baseX + 4, cy - 5, 1, 1);
    g.fillRect(baseX + 4, cy + 5, 1, 1);

    g.generateTexture(TextureKeys.Thorn, w, h);
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
    const HEART_RED_SHADOW = 0x8a1a1a;
    const HEART_EMPTY = 0x3a2a2a;
    const OUTLINE = 0x180404;

    // 11×10 pixel-art heart on an 18×18 canvas (PX=1, centered).
    // Mask layout (1 = filled, 0 = empty):
    //   row 0:   .##...##.   (lobes top)
    //   row 1:   #####.#####  → uses 11 wide
    // We design on an 11×10 grid centered at offX=4, offY=3.
    const PX = 1;
    const offX = 4;
    const offY = 3;
    // Mask split into left half (cols 0-4) and right half (cols 6-10), col 5
    // is always part of both halves to avoid a center seam.
    // We'll iterate over each pixel and decide its color based on the mask
    // and which side it is on.
    const mask: number[][] = [
      [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0],
      [1, 2, 2, 1, 0, 1, 0, 1, 2, 2, 1],
      [1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    ];
    // Highlight pixels (top-left lobe) — overlaid on top of the fill.
    const highlight: ReadonlyArray<readonly [number, number]> = [
      [2, 1],
      [1, 2],
    ];
    // Subtle shadow pixels (bottom-right) — overlaid likewise.
    const shadow: ReadonlyArray<readonly [number, number]> = [
      [8, 4],
      [7, 6],
      [6, 7],
    ];

    const draw = (leftFill: number, rightFill: number, addHighlight: boolean): void => {
      for (let y = 0; y < mask.length; y++) {
        const row = mask[y];
        for (let x = 0; x < row.length; x++) {
          const cell = row[x];
          if (cell === 0) continue;
          const isLeft = x < 5 || (x === 5 && cell === 1);
          let color = OUTLINE;
          if (cell === 2) {
            color = isLeft ? leftFill : rightFill;
            // Center column 5 is the divider — fill matches whichever side is
            // "more lit" so half-hearts stay clean. We treat col 5 as left.
            if (x === 5) color = leftFill;
          }
          this.px(g, x, y, color, PX, offX, offY);
        }
      }
      if (addHighlight) {
        for (const [hx, hy] of highlight) {
          this.px(g, hx, hy, HEART_RED_HI, PX, offX, offY);
        }
        for (const [sx, sy] of shadow) {
          // Only paint shadow if the pixel under it is filled (non-empty fill).
          const row = mask[sy];
          const cell = row?.[sx];
          if (cell === 2) {
            const isLeft = sx < 5;
            const fill = isLeft ? leftFill : rightFill;
            if (fill !== HEART_EMPTY) {
              this.px(g, sx, sy, HEART_RED_SHADOW, PX, offX, offY);
            }
          }
        }
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

    // Drop shadow
    this.groundShadow(g, cx, h - 2, 4, 1.2, 0.45);

    // Outline ring
    g.fillStyle(0x4a3008, 1);
    g.fillCircle(cx, cy - 1, 6);

    // Main gold body
    g.fillStyle(0xc89a1a, 1);
    g.fillCircle(cx, cy - 1, 5);

    // Brighter gold top half (light from top)
    g.fillStyle(0xffd84a, 1);
    g.fillCircle(cx - 0.5, cy - 1.5, 4);

    // Inner star pixel — small bright cross + center
    g.fillStyle(0xfff8c0, 1);
    g.fillRect(cx - 1, cy - 1, 1, 1);
    g.fillRect(cx, cy - 1, 1, 1);
    g.fillRect(cx - 1, cy - 2, 1, 1);
    g.fillRect(cx, cy, 1, 1);

    // Specular sparkle (top-left)
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - 2, cy - 4, 1, 1);
    g.fillRect(cx - 3, cy - 3, 1, 1);

    // Outline rim accent (darker bottom)
    g.fillStyle(0x6a4012, 1);
    g.fillRect(cx - 1, cy + 3, 3, 1);

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

    // Drop shadow
    this.groundShadow(g, w / 2, h - 2, 5, 1, 0.4);

    const OUT = 0x4a3008;
    const GOLD = 0xffd84a;
    const GOLD_HI = 0xfff0a0;
    const GOLD_SHADOW = 0xc89a1a;

    // Bow outline (head circle)
    const bowCx = 4;
    const bowCy = 6;
    g.fillStyle(OUT, 1);
    g.fillCircle(bowCx, bowCy, 4);
    // Bow body (gold ring around dark center)
    g.fillStyle(GOLD, 1);
    g.fillCircle(bowCx, bowCy, 3);
    g.fillStyle(0x2a1a04, 1);
    g.fillCircle(bowCx, bowCy, 1.5);
    // Bow highlight
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(bowCx - 2, bowCy - 2, 1, 1);

    // Shaft (horizontal bar from bow to right edge)
    g.fillStyle(OUT, 1);
    g.fillRect(7, 5, 9, 3);
    g.fillStyle(GOLD, 1);
    g.fillRect(7, 6, 9, 1);
    g.fillStyle(GOLD_SHADOW, 1);
    g.fillRect(7, 7, 9, 1);
    // Shaft highlight stripe
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(8, 6, 6, 1);

    // Teeth — two rectangular notches hanging off the bottom of the shaft
    g.fillStyle(OUT, 1);
    g.fillRect(12, 8, 2, 3);
    g.fillRect(15, 8, 2, 3);
    g.fillStyle(GOLD, 1);
    g.fillRect(12, 8, 1, 2);
    g.fillRect(15, 8, 1, 2);

    // Tip cap on the far right
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(15, 5, 1, 1);

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

    const bx = 2; // body left
    const by = 4; // body top
    const bw = w - 4; // body width
    const bh = h - 6; // body height

    // Outline rectangle
    g.fillStyle(OUT, 1);
    g.fillRect(bx, by, bw, bh);

    // Inner body (mid wood tone)
    g.fillStyle(WOOD, 1);
    g.fillRect(bx + 1, by + 1, bw - 2, bh - 2);

    // Top highlight band — light coming from the top
    g.fillStyle(WOOD_HI, 1);
    g.fillRect(bx + 1, by + 1, bw - 2, 2);

    // Bottom shadow band
    g.fillStyle(WOOD_DARK, 1);
    g.fillRect(bx + 1, by + bh - 3, bw - 2, 2);

    // Vertical plank seams (dark thin lines so it reads as boards)
    g.fillStyle(WOOD_DARK, 1);
    g.fillRect(bx + 5, by + 1, 1, bh - 2);
    g.fillRect(bx + 10, by + 1, 1, bh - 2);
    g.fillRect(bx + 14, by + 1, 1, bh - 2);

    // Iron corner fittings — small dark squares
    g.fillStyle(IRON, 1);
    // Top-left
    g.fillRect(bx + 1, by + 1, 2, 2);
    // Top-right
    g.fillRect(bx + bw - 3, by + 1, 2, 2);
    // Bottom-left
    g.fillRect(bx + 1, by + bh - 3, 2, 2);
    // Bottom-right
    g.fillRect(bx + bw - 3, by + bh - 3, 2, 2);

    // Center seam pin (small dark dot in the middle for visual interest)
    g.fillStyle(IRON, 1);
    g.fillRect(bx + Math.floor(bw / 2) - 1, by + Math.floor(bh / 2) - 1, 2, 2);

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
    const GOLD_DARK = 0xc89a1a;
    const GOLD = 0xffd84a;
    const GOLD_HI = 0xfff0a0;
    const FITTING = 0x6a4a14;
    const KEYHOLE = 0x1a1208;

    const bx = 2;
    const by = 4;
    const bw = w - 4;
    const bh = h - 6;

    // Outline
    g.fillStyle(OUT, 1);
    g.fillRect(bx, by, bw, bh);

    // Body (mid gold)
    g.fillStyle(GOLD, 1);
    g.fillRect(bx + 1, by + 1, bw - 2, bh - 2);

    // Top highlight band
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(bx + 1, by + 1, bw - 2, 2);

    // Bottom shadow band
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(bx + 1, by + bh - 3, bw - 2, 2);

    // Iron-style corner fittings, tinted dark gold so they read as ornament
    // instead of black blots on a gold body.
    g.fillStyle(FITTING, 1);
    g.fillRect(bx + 1, by + 1, 2, 2);
    g.fillRect(bx + bw - 3, by + 1, 2, 2);
    g.fillRect(bx + 1, by + bh - 3, 2, 2);
    g.fillRect(bx + bw - 3, by + bh - 3, 2, 2);

    // Keyhole — small dark oval in the middle. Drawn as one wider block + a
    // narrow tail under it to suggest a teardrop key shape.
    const kx = bx + Math.floor(bw / 2);
    const ky = by + Math.floor(bh / 2);
    g.fillStyle(KEYHOLE, 1);
    g.fillRect(kx - 1, ky - 2, 3, 3);
    g.fillRect(kx, ky + 1, 1, 2);

    // Subtle highlight pixel on the top-left of the body for that polished feel.
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(bx + 2, by + 2, 1, 1);

    g.generateTexture(TextureKeys.GoldCrate, w, h);
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
    const STONE_SHADOW = 0x2c2e34;
    const STONE = 0x4a4d56;
    const STONE_HI = 0x707380;
    const TOP_HI = 0x9aa0b0;

    // Base block (wider trapezoid feel)
    g.fillStyle(OUT, 1);
    g.fillRect(2, 7, w - 4, 8);
    g.fillStyle(STONE_SHADOW, 1);
    g.fillRect(3, 8, w - 6, 6);
    g.fillStyle(STONE, 1);
    g.fillRect(3, 8, w - 6, 4);
    // Side highlights
    g.fillStyle(STONE_HI, 1);
    g.fillRect(3, 8, 1, 5);
    g.fillStyle(OUT, 1);
    g.fillRect(w - 4, 8, 1, 6);

    // Upper platform (slightly narrower, lighter — the altar top)
    g.fillStyle(OUT, 1);
    g.fillRect(5, 3, w - 10, 5);
    g.fillStyle(STONE, 1);
    g.fillRect(6, 4, w - 12, 3);
    g.fillStyle(STONE_HI, 1);
    g.fillRect(6, 4, w - 12, 1);
    g.fillStyle(TOP_HI, 1);
    g.fillRect(7, 4, w - 14, 1);

    // Front lip line
    g.fillStyle(OUT, 1);
    g.fillRect(5, 7, w - 10, 1);

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

  /** Caffeine Pill — half-red half-white capsule with highlight. */
  private drawItemCaffeinePillTexture(g: Phaser.GameObjects.Graphics): void {
    const w = 14;
    const h = 14;
    g.clear();

    const OUT = 0x1a0408;
    const RED = 0xd83a3a;
    const RED_HI = 0xff8888;
    const WHITE = 0xf0f0f0;
    const WHITE_HI = 0xffffff;

    // Capsule outline (rotated rounded rectangle, rendered as 2 ellipses + bar)
    g.fillStyle(OUT, 1);
    g.fillEllipse(4, 7, 7, 6);
    g.fillEllipse(10, 7, 7, 6);
    g.fillRect(4, 4, 6, 6);

    // Red half (left)
    g.fillStyle(RED, 1);
    g.fillEllipse(4, 7, 5, 4);
    g.fillRect(4, 5, 3, 4);
    // White half (right)
    g.fillStyle(WHITE, 1);
    g.fillEllipse(10, 7, 5, 4);
    g.fillRect(7, 5, 3, 4);

    // Highlights
    g.fillStyle(RED_HI, 1);
    g.fillRect(3, 5, 2, 1);
    g.fillStyle(WHITE_HI, 1);
    g.fillRect(8, 5, 3, 1);
    g.fillRect(11, 6, 1, 1);

    g.generateTexture(TextureKeys.ItemCaffeinePill, w, h);
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

    // Soft halo
    g.fillStyle(GLOW, 0.18);
    g.fillCircle(7, 7, 6);

    // Heart body — two top lobes + tapered bottom
    g.fillStyle(OUT, 1);
    g.fillRect(3, 3, 4, 1);
    g.fillRect(7, 3, 4, 1);
    g.fillRect(2, 4, 10, 1);
    g.fillRect(2, 5, 10, 3);
    g.fillRect(3, 8, 8, 1);
    g.fillRect(4, 9, 6, 1);
    g.fillRect(5, 10, 4, 1);
    g.fillRect(6, 11, 2, 1);

    g.fillStyle(HEART, 1);
    g.fillRect(3, 4, 3, 1);
    g.fillRect(8, 4, 3, 1);
    g.fillRect(3, 5, 8, 3);
    g.fillRect(4, 8, 6, 1);
    g.fillRect(5, 9, 4, 1);
    g.fillRect(6, 10, 2, 1);

    // Highlight specular
    g.fillStyle(HEART_HI, 1);
    g.fillRect(4, 5, 2, 1);
    g.fillRect(8, 5, 1, 1);

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

    // Heart body (same shape as Heart Container, different palette)
    g.fillStyle(OUT, 1);
    g.fillRect(3, 3, 4, 1);
    g.fillRect(7, 3, 4, 1);
    g.fillRect(2, 4, 10, 1);
    g.fillRect(2, 5, 10, 3);
    g.fillRect(3, 8, 8, 1);
    g.fillRect(4, 9, 6, 1);
    g.fillRect(5, 10, 4, 1);
    g.fillRect(6, 11, 2, 1);

    g.fillStyle(SHELL, 1);
    g.fillRect(3, 4, 3, 1);
    g.fillRect(8, 4, 3, 1);
    g.fillRect(3, 5, 8, 3);
    g.fillRect(4, 8, 6, 1);
    g.fillRect(5, 9, 4, 1);
    g.fillRect(6, 10, 2, 1);

    g.fillStyle(SHELL_HI, 1);
    g.fillRect(3, 5, 1, 2);
    g.fillRect(9, 5, 1, 2);

    // Glowing core in the middle
    g.fillStyle(CORE, 1);
    g.fillRect(6, 6, 2, 2);
    g.fillStyle(CORE_HI, 1);
    g.fillRect(6, 6, 1, 1);

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
   * Per-floor gem trophy. Diamond/crystal silhouette in the floor's glow
   * palette with a 3-tone shading + bright highlight pixel + dark outline.
   * Drawn at 14×14 (same canvas size as item icons) so the GemPickup's
   * default scaling reads consistently with the other pickups.
   */
  private drawGemTexture(g: Phaser.GameObjects.Graphics, theme: FloorTheme): void {
    const w = 14;
    const h = 14;
    g.clear();

    const glow = theme.palette.glow;
    const dark = this.shadeColor(glow, -0.45);
    const mid = this.shadeColor(glow, -0.15);
    const hi = this.shadeColor(glow, 0.4);
    const OUT = this.shadeColor(glow, -0.7);

    // Diamond outline
    g.fillStyle(OUT, 1);
    g.fillRect(6, 1, 2, 1);
    g.fillRect(4, 2, 6, 1);
    g.fillRect(2, 3, 10, 1);
    g.fillRect(2, 4, 10, 1);
    g.fillRect(2, 5, 10, 1);
    g.fillRect(3, 6, 8, 1);
    g.fillRect(4, 7, 6, 1);
    g.fillRect(4, 8, 6, 1);
    g.fillRect(5, 9, 4, 1);
    g.fillRect(5, 10, 4, 1);
    g.fillRect(6, 11, 2, 1);
    g.fillRect(6, 12, 2, 1);

    // Mid fill
    g.fillStyle(mid, 1);
    g.fillRect(6, 2, 2, 1);
    g.fillRect(4, 3, 6, 1);
    g.fillRect(3, 4, 8, 2);
    g.fillRect(4, 6, 6, 1);
    g.fillRect(5, 7, 4, 1);
    g.fillRect(6, 8, 2, 1);
    g.fillRect(6, 9, 2, 1);
    g.fillRect(6, 10, 2, 1);

    // Bright facet (top-left)
    g.fillStyle(hi, 1);
    g.fillRect(5, 3, 2, 1);
    g.fillRect(4, 4, 2, 1);
    g.fillRect(3, 5, 2, 1);

    // Dark facet (right side)
    g.fillStyle(dark, 1);
    g.fillRect(8, 4, 2, 1);
    g.fillRect(8, 5, 2, 1);
    g.fillRect(8, 6, 2, 1);
    g.fillRect(7, 7, 2, 1);

    // Sparkle pixel (single white pixel in the highlight band)
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 4, 1, 1);

    g.generateTexture(gemTextureKey(theme.id), w, h);
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
}
