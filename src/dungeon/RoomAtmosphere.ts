import Phaser from 'phaser';
import {
  DOOR_TILE,
  ROOM_HEIGHT_TILES,
  ROOM_WIDTH_TILES,
  TILE_SIZE,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type FloorTheme, type RoomDescriptor } from '../types';
import { RNG } from '../utils/RNG';

/**
 * Painterly overlay for a single room — radial floor vignette + scattered
 * mossy / algae / parquet patches + light shafts + atmospheric mist + glowing
 * fireflies (or dust motes for mansion floors) + cinematic edge vignette.
 *
 * Layers are split into "floor" (depth 1-3, between tiles and decorations)
 * and "sky" (depth 75+, above walls / enemies but below the HUD) so the
 * scene reads as one painted composition rather than a tile grid.
 *
 * Driven entirely by `theme.palette` + `theme.decorationStyle` so the same
 * code paths produce a warm-green forest, a cool-cyan swamp, or a gold-and-
 * amethyst mansion — palette-only changes, no per-floor branching needed.
 */
export class RoomAtmosphere {
  private readonly graphics: Phaser.GameObjects.Graphics[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, theme: FloorTheme, descriptor: RoomDescriptor) {
    const w = ROOM_WIDTH_TILES * TILE_SIZE;
    const h = ROOM_HEIGHT_TILES * TILE_SIZE;
    const innerX = TILE_SIZE;
    const innerY = TILE_SIZE;
    const innerW = w - 2 * TILE_SIZE;
    const innerH = h - 2 * TILE_SIZE;
    const palette = stylePalette(theme);
    const rng = new RNG(`${descriptor.decorationSeed}-atmos`);

    this.paintFloorVignette(scene, innerX, innerY, innerW, innerH, palette);
    this.paintMossyPatches(scene, innerX, innerY, innerW, innerH, palette, rng);
    this.paintLightShafts(scene, innerX, innerY, innerW, innerH, palette);
    this.paintWallBands(scene, theme, descriptor, w, h);
    this.paintMistBands(scene, innerX, innerY, innerW, innerH, palette);
    this.paintFireflies(scene, innerX, innerY, innerW, innerH, palette, rng);
    this.paintEdgeVignette(scene, w, h);
  }

  /** Tear down every Graphics + Tween this overlay registered. */
  destroy(): void {
    for (const t of this.tweens) t.remove();
    this.tweens.length = 0;
    for (const g of this.graphics) g.destroy();
    this.graphics.length = 0;
  }

  /**
   * Paint a glow halo under a single decoration sprite. Called from Room
   * for each tree/rock/mushroom so the deco reads as "lit from within"
   * rather than placed flat. Returned graphics are tracked for destroy().
   */
  paintDecorationHalo(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    theme: FloorTheme,
    size: 'small' | 'medium',
  ): void {
    const palette = stylePalette(theme);
    const g = scene.add.graphics().setDepth(DepthLayers.FloorDecoration - 1);
    const s = size === 'small' ? 0.7 : 1.0;
    g.fillStyle(palette.glow, 0.10);
    g.fillEllipse(cx, cy + 8, 60 * s, 22 * s);
    g.fillStyle(palette.glow, 0.16);
    g.fillEllipse(cx, cy + 8, 38 * s, 14 * s);
    if (size === 'medium') {
      g.fillStyle(palette.haloHi, 0.22);
      g.fillEllipse(cx, cy + 8, 22 * s, 8 * s);
    }
    this.graphics.push(g);
  }

  // ---------------------------------------------------------------------------
  // Floor-level layers (depth 1-3)
  // ---------------------------------------------------------------------------

  /**
   * Radial vignette across the inner floor. Centered, warm core fading out
   * to deep ambient. Painted as 6 stacked ellipses tinted from `theme.palette`.
   */
  private paintFloorVignette(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    palette: StylePalette,
  ): void {
    const g = scene.add.graphics().setDepth(1);
    const cx = x + w / 2;
    const cy = y + h / 2 + 10;
    const layers: ReadonlyArray<readonly [number, number, number, number]> = [
      [w * 0.78, h * 0.78, palette.vignette[0], 1],
      [w * 0.66, h * 0.66, palette.vignette[1], 1],
      [w * 0.54, h * 0.54, palette.vignette[2], 1],
      [w * 0.42, h * 0.42, palette.vignette[3], 1],
      [w * 0.28, h * 0.28, palette.vignette[4], 0.7],
      [w * 0.16, h * 0.16, palette.vignette[5], 0.42],
    ];
    for (const [rx, ry, color, alpha] of layers) {
      g.fillStyle(color, alpha);
      g.fillEllipse(cx, cy, rx * 2, ry * 2);
    }
    this.graphics.push(g);
  }

  /**
   * 30 painterly patches scattered across the floor — moss for forest,
   * algae for swamp, parquet shimmer for mansion. Each patch is a 3-tone
   * blob with a faint sparkle pixel for life.
   */
  private paintMossyPatches(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    palette: StylePalette,
    rng: RNG,
  ): void {
    const g = scene.add.graphics().setDepth(2);
    for (let i = 0; i < 30; i++) {
      const px = x + rng.intBetween(20, w - 20);
      const py = y + rng.intBetween(20, h - 20);
      const size = rng.intBetween(8, 18);
      g.fillStyle(palette.patch[0], 0.85);
      g.fillEllipse(px, py, size * 1.6, size);
      g.fillStyle(palette.patch[1], 0.85);
      g.fillEllipse(px - 2, py - 1, size * 1.2, size * 0.75);
      g.fillStyle(palette.patch[2], 0.55);
      g.fillEllipse(px - 1, py - 2, size * 0.55, size * 0.32);
      if (rng.chance(0.35)) {
        g.fillStyle(0xffffff, 0.85);
        g.fillRect(px - 1, py - 2, 1, 1);
      }
    }
    this.graphics.push(g);
  }

  /**
   * 3 diagonal light bands streaking across the floor. Warm green-gold for
   * forest, cool moonlight for swamp, candle-warm for mansion.
   */
  private paintLightShafts(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    palette: StylePalette,
  ): void {
    const g = scene.add.graphics().setDepth(3);
    g.fillStyle(palette.shaft, 0.07);
    fillSlantedBand(g, x + 80, y, 90, h, 60);
    g.fillStyle(palette.shaftHi, 0.08);
    fillSlantedBand(g, x + 90, y + 4, 70, h - 8, 30);
    g.fillStyle(palette.shaft, 0.06);
    fillSlantedBand(g, x + w - 220, y, 80, h, 70);
    this.graphics.push(g);
  }

  // ---------------------------------------------------------------------------
  // Wall-level layer (depth 71 — above wall tiles, below sky atmospherics)
  //
  // Replaces the visual of the wall tile ring with a continuous painterly
  // band per side (top canopy / arch / vault, bottom mossy / muddy / velvet,
  // left + right bark / mangrove / column). Each band paints around the
  // door-tile gap if a door exists in that direction so the door sprite
  // stays visible.
  // ---------------------------------------------------------------------------

  private paintWallBands(
    scene: Phaser.Scene,
    theme: FloorTheme,
    descriptor: RoomDescriptor,
    w: number,
    h: number,
  ): void {
    const doors = descriptor.doors;
    const topGap = doors.up.exists ? doorGap(DOOR_TILE.N.tx) : null;
    const bottomGap = doors.down.exists ? doorGap(DOOR_TILE.S.tx) : null;
    const leftGap = doors.left.exists ? doorGap(DOOR_TILE.W.ty) : null;
    const rightGap = doors.right.exists ? doorGap(DOOR_TILE.E.ty) : null;

    const g = scene.add.graphics().setDepth(DepthLayers.Wall + 1);
    this.graphics.push(g);

    switch (theme.decorationStyle) {
      case 'swamp':
        this.paintSwampTopBand(g, w, topGap);
        this.paintSwampBottomBand(g, w, h, bottomGap);
        this.paintSwampSideBands(g, w, h, leftGap, rightGap);
        break;
      case 'mansion':
        this.paintMansionTopBand(g, w, topGap);
        this.paintMansionBottomBand(g, w, h, bottomGap);
        this.paintMansionSideBands(g, w, h, leftGap, rightGap);
        break;
      case 'forest':
      default:
        this.paintForestTopBand(g, w, topGap);
        this.paintForestBottomBand(g, w, h, bottomGap);
        this.paintForestSideBands(g, w, h, leftGap, rightGap);
        break;
    }
  }

  // -- Forest --------------------------------------------------------------

  private paintForestTopBand(
    g: Phaser.GameObjects.Graphics,
    w: number,
    gap: DoorGap | null,
  ): void {
    fillRectGapped(g, 0, 0, w, 32, gap, 0x040a0a);
    g.fillStyle(0x081210, 1);
    for (let x = 0; x < w; x += 14) {
      if (inGap(x, gap)) continue;
      const th = 14 + ((x * 7919) % 18);
      g.fillTriangle(x - 3, 32, x + 11, 32, x + 4, 32 - th);
    }
    g.fillStyle(0x0a1a18, 1);
    for (let x = -10; x < w + 10; x += 26) {
      if (inGap(x, gap)) continue;
      const fh = 26 + ((x * 4421) % 18);
      g.fillCircle(x + 8, 32 + fh * 0.15, fh * 0.55);
      g.fillCircle(x - 2, 32 + fh * 0.05, fh * 0.45);
      g.fillCircle(x + 18, 32 + fh * 0.08, fh * 0.5);
    }
    g.fillStyle(0x14361a, 1);
    for (let x = 4; x < w; x += 32) {
      if (inGap(x, gap)) continue;
      const fh = 22 + ((x * 5147) % 14);
      g.fillCircle(x + 6, 32 + fh * 0.25, fh * 0.4);
      g.fillCircle(x + 18, 32 + fh * 0.18, fh * 0.36);
    }
    g.fillStyle(0x2d6634, 0.85);
    for (let x = 6; x < w; x += 40) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 8, 50, 14, 6);
    }
    g.fillStyle(0x4ea656, 0.7);
    for (let x = 8; x < w; x += 56) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 4, 44, 7, 2);
    }
  }

  private paintForestBottomBand(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    gap: DoorGap | null,
  ): void {
    fillRectGapped(g, 0, h - 64, w, 8, gap, 0x040a0a);
    fillRectGapped(g, 0, h - 56, w, 56, gap, 0x0e2a14);
    g.fillStyle(0x14361a, 1);
    for (let x = 0; x < w; x += 22) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 11, h - 54, 22, 10);
    }
    g.fillStyle(0x2d6634, 1);
    for (let x = 0; x < w; x += 28) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 12, h - 55, 14, 5);
    }
    g.fillStyle(0x4ea656, 0.9);
    for (let x = 0; x < w; x += 36) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 14, h - 56, 6, 2);
    }
  }

  private paintForestSideBands(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    leftGap: DoorGap | null,
    rightGap: DoorGap | null,
  ): void {
    for (const side of ['left', 'right'] as const) {
      const sx = side === 'left' ? 0 : w - 64;
      const gap = side === 'left' ? leftGap : rightGap;
      // Outer outline
      fillRectVertGapped(g, sx, 32, 64, h - 96, gap, 0x040a0a);
      fillRectVertGapped(g, sx + 4, 32, 56, h - 96, gap, 0x1a1208);
      // Highlight strip on inner edge
      const hiX = side === 'left' ? sx + 56 : sx + 4;
      fillRectVertGapped(g, hiX, 34, 4, h - 100, gap, 0x3a2a14);
      // Bark grooves
      g.fillStyle(0x0a0604, 0.7);
      for (let gy = 38; gy < h - 60; gy += 18) {
        if (inGap(gy, gap)) continue;
        g.fillRect(sx + (side === 'left' ? 14 : 24), gy, 1, 12);
        g.fillRect(sx + (side === 'left' ? 30 : 38), gy + 8, 1, 10);
      }
      // Inner-edge moss strip
      const mossX = side === 'left' ? sx + 60 : sx + 4;
      fillRectVertGapped(g, mossX, 32, 4, h - 96, gap, 0x14361a);
      g.fillStyle(0x2d6634, 0.9);
      for (let gy = 40; gy < h - 60; gy += 12) {
        if (inGap(gy, gap)) continue;
        g.fillEllipse(mossX + 2, gy + 4, 5, 3);
      }
    }
  }

  // -- Swamp ---------------------------------------------------------------

  private paintSwampTopBand(
    g: Phaser.GameObjects.Graphics,
    w: number,
    gap: DoorGap | null,
  ): void {
    fillRectGapped(g, 0, 0, w, 32, gap, 0x02060a);
    fillRectGapped(g, 0, 0, w, 24, gap, 0x0a1218);
    // Stone arch ridge
    g.fillStyle(0x1a2230, 1);
    for (let x = 0; x < w; x += 16) {
      if (inGap(x, gap)) continue;
      const fh = 14 + ((x * 7919) % 12);
      g.fillRect(x, 24, 18, fh);
    }
    g.fillStyle(0x2c3e58, 0.85);
    for (let x = 0; x < w; x += 22) {
      if (inGap(x, gap)) continue;
      g.fillRect(x + 4, 24, 12, 4);
    }
    // Hanging algae strands
    g.fillStyle(0x143850, 1);
    for (let i = 0; i < w / 12; i++) {
      const sx = i * 12 + ((i * 17) % 7);
      if (inGap(sx, gap)) continue;
      const sl = 8 + ((i * 13) % 16);
      g.fillRect(sx, 38, 1, sl);
    }
    g.fillStyle(0x4ad8ff, 0.9);
    for (let i = 0; i < w / 24; i++) {
      const sx = i * 24 + ((i * 23) % 9);
      if (inGap(sx, gap)) continue;
      g.fillRect(sx, 42 + ((i * 7) % 12), 1, 2);
    }
    // Sapphire glow nodes
    for (let x = 60; x < w; x += 140) {
      if (inGap(x, gap)) continue;
      g.fillStyle(0x4ad8ff, 0.18);
      g.fillCircle(x, 50, 10);
      g.fillStyle(0x4ad8ff, 0.32);
      g.fillCircle(x, 50, 6);
      g.fillStyle(0xc0f0ff, 0.85);
      g.fillCircle(x, 50, 2.4);
      g.fillStyle(0xffffff, 1);
      g.fillRect(x, 49, 1, 1);
    }
  }

  private paintSwampBottomBand(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    gap: DoorGap | null,
  ): void {
    fillRectGapped(g, 0, h - 64, w, 8, gap, 0x02060a);
    fillRectGapped(g, 0, h - 56, w, 56, gap, 0x0a1820);
    g.fillStyle(0x143850, 1);
    for (let x = 0; x < w; x += 22) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 11, h - 54, 22, 10);
    }
    g.fillStyle(0x2a5878, 1);
    for (let x = 0; x < w; x += 28) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 12, h - 55, 14, 5);
    }
    g.fillStyle(0x4ad8ff, 0.7);
    for (let x = 0; x < w; x += 38) {
      if (inGap(x, gap)) continue;
      g.fillEllipse(x + 14, h - 56, 6, 2);
    }
  }

  private paintSwampSideBands(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    leftGap: DoorGap | null,
    rightGap: DoorGap | null,
  ): void {
    for (const side of ['left', 'right'] as const) {
      const sx = side === 'left' ? 0 : w - 64;
      const gap = side === 'left' ? leftGap : rightGap;
      fillRectVertGapped(g, sx, 32, 64, h - 96, gap, 0x02060a);
      fillRectVertGapped(g, sx + 4, 32, 56, h - 96, gap, 0x140820);
      const hiX = side === 'left' ? sx + 56 : sx + 4;
      fillRectVertGapped(g, hiX, 34, 4, h - 100, gap, 0x2a1838);
      g.fillStyle(0x05060a, 0.85);
      for (let gy = 38; gy < h - 60; gy += 14) {
        if (inGap(gy, gap)) continue;
        const drift = (gy * 13) % 6;
        g.fillRect(sx + (side === 'left' ? 12 : 18) + drift, gy, 2, 10);
        g.fillRect(sx + (side === 'left' ? 36 : 42) - drift, gy + 6, 2, 8);
      }
      const mossX = side === 'left' ? sx + 60 : sx + 4;
      fillRectVertGapped(g, mossX, 32, 4, h - 96, gap, 0x143850);
      g.fillStyle(0x4ad8ff, 0.6);
      for (let gy = 40; gy < h - 60; gy += 14) {
        if (inGap(gy, gap)) continue;
        g.fillEllipse(mossX + 2, gy + 4, 5, 3);
      }
      // Sapphire glow knots at fixed intervals
      for (const ky of [80, 200, 340, 460]) {
        if (inGap(ky, gap)) continue;
        const cx = sx + (side === 'left' ? 30 : 34);
        g.fillStyle(0x4ad8ff, 0.22);
        g.fillCircle(cx, ky, 5);
        g.fillStyle(0xc0f0ff, 0.85);
        g.fillCircle(cx, ky, 2);
      }
    }
  }

  // -- Mansion -------------------------------------------------------------

  private paintMansionTopBand(
    g: Phaser.GameObjects.Graphics,
    w: number,
    gap: DoorGap | null,
  ): void {
    fillRectGapped(g, 0, 0, w, 24, gap, 0x040208);
    fillRectGapped(g, 0, 0, w, 22, gap, 0x18102a);
    // Stone-brick pattern on top wall edge
    g.fillStyle(0x261438, 1);
    for (let bx = 0; bx < w; bx += 40) {
      if (inGap(bx, gap)) continue;
      g.fillRect(bx + 2, 4, 36, 8);
      g.fillRect(bx + 22, 14, 36, 8);
    }
    g.fillStyle(0x402060, 0.7);
    for (let bx = 0; bx < w; bx += 40) {
      if (inGap(bx, gap)) continue;
      g.fillRect(bx + 2, 4, 36, 1);
      g.fillRect(bx + 22, 14, 36, 1);
    }
    // Gold molding
    fillRectGapped(g, 0, 26, w, 2, gap, 0x8a5a18);
    fillRectGapped(g, 0, 26, w, 1, gap, 0xffd84a);
    // Wall sconces
    for (const sx of [120, 320, 520, 720, 880]) {
      if (sx > w - 20) continue;
      if (inGap(sx, gap)) continue;
      this.paintSconceFlame(g, sx, 44);
    }
  }

  private paintMansionBottomBand(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    gap: DoorGap | null,
  ): void {
    fillRectGapped(g, 0, h - 64, w, 8, gap, 0x040208);
    fillRectGapped(g, 0, h - 56, w, 56, gap, 0x180a18);
    fillRectGapped(g, 0, h - 50, w, 8, gap, 0x402030);
    // Velvet runner highlight + tasseled gold trim
    fillRectGapped(g, 0, h - 50, w, 2, gap, 0x6a2840);
    fillRectGapped(g, 0, h - 50, w, 1, gap, 0xa84860);
    fillRectGapped(g, 0, h - 42, w, 1, gap, 0x8a5a18);
    g.fillStyle(0xffd84a, 0.7);
    for (let x = 0; x < w; x += 12) {
      if (inGap(x, gap)) continue;
      g.fillRect(x, h - 42, 6, 1);
    }
    // Tassels
    g.fillStyle(0xffd84a, 0.85);
    for (let x = 12; x < w; x += 60) {
      if (inGap(x, gap)) continue;
      g.fillTriangle(x - 2, h - 40, x + 2, h - 40, x, h - 36);
    }
  }

  private paintMansionSideBands(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    leftGap: DoorGap | null,
    rightGap: DoorGap | null,
  ): void {
    for (const side of ['left', 'right'] as const) {
      const sx = side === 'left' ? 0 : w - 64;
      const gap = side === 'left' ? leftGap : rightGap;
      fillRectVertGapped(g, sx, 32, 64, h - 96, gap, 0x040208);
      fillRectVertGapped(g, sx + 4, 32, 56, h - 96, gap, 0x18102a);
      // Brick courses
      g.fillStyle(0x261438, 0.85);
      for (let by = 32; by < h - 60; by += 22) {
        if (inGap(by, gap)) continue;
        g.fillRect(sx + 6, by, 52, 8);
      }
      g.fillStyle(0x402060, 0.65);
      for (let by = 32; by < h - 60; by += 22) {
        if (inGap(by, gap)) continue;
        g.fillRect(sx + 6, by, 52, 1);
      }
      // Inner-edge gold molding
      const hiX = side === 'left' ? sx + 60 : sx + 2;
      fillRectVertGapped(g, hiX, 34, 2, h - 100, gap, 0x8a5a18);
      fillRectVertGapped(g, hiX, 34, 1, h - 100, gap, 0xffd84a);
      // Portraits — every other course
      for (const py of [80, 200, 320, 440]) {
        if (inGap(py, gap)) continue;
        const portraitX = sx + (side === 'left' ? 30 : 34);
        this.paintPortraitMini(g, portraitX, py);
      }
    }
  }

  /** Tiny wall-sconce flame painter, used by the mansion top band. */
  private paintSconceFlame(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    // Halo
    g.fillStyle(0xffd84a, 0.18);
    g.fillCircle(cx, cy, 14);
    g.fillStyle(0xfff8a0, 0.28);
    g.fillCircle(cx, cy, 8);
    // Bracket + candle + flame
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 4, cy - 2, 8, 6);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 3, cy - 2, 6, 1);
    g.fillStyle(0xfff8c0, 1);
    g.fillRect(cx - 1, cy - 8, 2, 6);
    g.fillStyle(0xffd84a, 1);
    g.fillTriangle(cx, cy - 14, cx - 2, cy - 8, cx + 2, cy - 8);
    g.fillStyle(0xfff8a0, 1);
    g.fillRect(cx, cy - 12, 1, 3);
  }

  /** Tiny gilt-frame portrait painter, used by the mansion side bands. */
  private paintPortraitMini(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    // Frame
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 10, cy - 14, 20, 28);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 9, cy - 13, 18, 26);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 9, cy - 13, 18, 1);
    g.fillRect(cx - 9, cy + 12, 18, 1);
    g.fillRect(cx - 9, cy - 13, 1, 25);
    g.fillRect(cx + 8, cy - 13, 1, 25);
    // Canvas + sketchy figure
    g.fillStyle(0x18102a, 1);
    g.fillRect(cx - 8, cy - 12, 16, 24);
    g.fillStyle(0x402060, 1);
    g.fillCircle(cx, cy - 4, 3);
    g.fillTriangle(cx - 6, cy + 11, cx + 6, cy + 11, cx, cy);
    // Glowing red eyes
    g.fillStyle(0xff5577, 1);
    g.fillRect(cx - 1, cy - 5, 1, 1);
    g.fillRect(cx + 1, cy - 5, 1, 1);
  }

  // ---------------------------------------------------------------------------
  // Sky-level layers (depth 75+ — above walls, below HUD)
  // ---------------------------------------------------------------------------

  /** 3 horizontal alpha mist strips over the floor. */
  private paintMistBands(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    palette: StylePalette,
  ): void {
    const g = scene.add.graphics().setDepth(45);
    g.fillStyle(palette.mist, 0.06);
    g.fillRect(x, y + h * 0.5, w, 14);
    g.fillStyle(palette.mist, 0.08);
    g.fillRect(x, y + h * 0.7, w, 8);
    g.fillStyle(palette.mist, 0.05);
    g.fillRect(x, y + h * 0.85, w, 12);
    this.graphics.push(g);
  }

  /**
   * 14 fireflies (or dust motes for mansion) scattered through the room
   * with outline + palette-glow + sparkle pixel. The whole layer pulses
   * its alpha gently so the room feels alive.
   */
  private paintFireflies(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    palette: StylePalette,
    rng: RNG,
  ): void {
    const g = scene.add.graphics().setDepth(75);
    const count = 14;
    for (let i = 0; i < count; i++) {
      const fx = x + rng.intBetween(20, w - 20);
      const fy = y + rng.intBetween(20, h - 20);
      const fr = 1.4 + rng.next() * 0.8;
      // Pick from the palette firefly colour list (so two-three colours mix)
      const color = palette.firefly[rng.intBetween(0, palette.firefly.length - 1)]!;
      g.fillStyle(0x040a05, 1);
      g.fillCircle(fx, fy, fr + 0.8);
      g.fillStyle(color, 1);
      g.fillCircle(fx, fy, fr);
      g.fillStyle(0xffffff, 0.95);
      g.fillRect(fx, fy - 1, 1, 1);
    }
    const tween = scene.tweens.add({
      targets: g,
      alpha: { from: 0.85, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.graphics.push(g);
    this.tweens.push(tween);
  }

  /** Cinematic edge-darken overlay around the room outer edge. */
  private paintEdgeVignette(scene: Phaser.Scene, w: number, h: number): void {
    const g = scene.add.graphics().setDepth(990);
    for (let i = 0; i < 22; i++) {
      const a = 0.30 - i * 0.012;
      g.fillStyle(0x000000, Math.max(0, a));
      g.fillRect(i, i, w - i * 2, 1);
      g.fillRect(i, h - i - 1, w - i * 2, 1);
      g.fillRect(i, i, 1, h - i * 2);
      g.fillRect(w - i - 1, i, 1, h - i * 2);
    }
    this.graphics.push(g);
  }
}

// ---------------------------------------------------------------------------
// Per-style palette derivation
// ---------------------------------------------------------------------------

interface StylePalette {
  /** Six radial-vignette tint stops, dark→light from outer to inner. */
  vignette: [number, number, number, number, number, number];
  /** Three patch shading tones (deepest, mid, brightest). */
  patch: [number, number, number];
  /** Diagonal light-shaft base + highlight colours. */
  shaft: number;
  shaftHi: number;
  /** Mist band tint. */
  mist: number;
  /** Firefly / dust-mote palette pool. */
  firefly: readonly number[];
  /** Glow color used for decoration halos (fed from theme.palette.glow). */
  glow: number;
  /** Brighter halo accent for decorations. */
  haloHi: number;
}

/**
 * Pick the atmospheric palette that matches the floor's `decorationStyle`.
 * Forest = warm green-gold, swamp = cool moonlight blue, mansion = warm
 * candle-gold + amethyst accents. Each style uses the same `theme.palette.glow`
 * for decoration halos so the deco glow always matches the floor identity.
 */
function stylePalette(theme: FloorTheme): StylePalette {
  switch (theme.decorationStyle) {
    case 'swamp':
      return {
        vignette: [0x06121c, 0x0a1c2a, 0x0e2638, 0x143850, 0x1c5070, 0x2a78a0],
        patch: [0x081820, 0x143850, 0x4ad8ff],
        shaft: 0x4ad8ff,
        shaftHi: 0xc0f0ff,
        mist: 0xc0eadd,
        firefly: [0x4ad8ff, 0xc0f0ff, 0xfff8a0],
        glow: theme.palette.glow,
        haloHi: 0xc0f0ff,
      };
    case 'mansion':
      return {
        vignette: [0x140820, 0x1c0e2c, 0x261438, 0x301a44, 0x402060, 0x583088],
        patch: [0x180828, 0x2a1438, 0xc864ff],
        shaft: 0xffd84a,
        shaftHi: 0xfff8a0,
        mist: 0xc8a0e0,
        firefly: [0xffd84a, 0xfff8a0, 0xc864ff],
        glow: theme.palette.glow,
        haloHi: 0xfff8a0,
      };
    case 'forest':
    default:
      return {
        vignette: [0x0a1a14, 0x0e2a1a, 0x143822, 0x1c4a2a, 0x256832, 0x3a8845],
        patch: [0x102a18, 0x1c4626, 0x2d6634],
        shaft: 0x88c060,
        shaftHi: 0xb0e890,
        mist: 0xc0eadd,
        firefly: [0x88c060, 0xb0e890, 0xff7ac0],
        glow: theme.palette.glow,
        haloHi: 0xb0e890,
      };
  }
}

/**
 * Door-gap range in pixels along one axis (start..end). Used to skip the
 * door tile when painting wall bands so the door sprite stays visible.
 */
interface DoorGap {
  start: number;
  end: number;
}

/** Build a `DoorGap` for a tile-aligned door at the given tile index. */
function doorGap(tile: number): DoorGap {
  return { start: tile * TILE_SIZE, end: (tile + 1) * TILE_SIZE };
}

/** True if `coord` (px) falls inside the door gap. */
function inGap(coord: number, gap: DoorGap | null): boolean {
  if (!gap) return false;
  return coord >= gap.start - 4 && coord <= gap.end + 4;
}

/**
 * Fill a horizontal rectangular strip but skip the door-gap range. Splits
 * into 2 fillRect calls when a gap is present, 1 when not.
 */
function fillRectGapped(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  gap: DoorGap | null,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  if (!gap) {
    g.fillRect(x, y, width, height);
    return;
  }
  if (gap.start > x) g.fillRect(x, y, gap.start - x, height);
  if (gap.end < x + width) g.fillRect(gap.end, y, x + width - gap.end, height);
}

/**
 * Fill a vertical rectangular strip but skip the door-gap range. Used by
 * side wall bands where the door creates a vertical gap.
 */
function fillRectVertGapped(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  gap: DoorGap | null,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  if (!gap) {
    g.fillRect(x, y, width, height);
    return;
  }
  if (gap.start > y) g.fillRect(x, y, width, gap.start - y);
  if (gap.end < y + height) g.fillRect(x, gap.end, width, y + height - gap.end);
}

/** Paint a rotated rectangular band — used for diagonal light shafts. */
function fillSlantedBand(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  angleDeg: number,
): void {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners: Array<[number, number]> = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const rotated = corners.map(([px, py]): [number, number] => [
    x + px * cos - py * sin,
    y + px * sin + py * cos,
  ]);
  g.fillPoints(
    rotated.map(([px, py]) => ({ x: px, y: py })),
    true,
  );
}
