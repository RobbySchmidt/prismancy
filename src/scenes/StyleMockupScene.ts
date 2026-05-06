import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SceneKeys,
  TextureKeys,
  TILE_SIZE,
  floorTileKey,
  mushroomDecoKey,
  rockDecoKey,
  treeDecoKey,
  wallTileKey,
} from '../config/GameConfig';
import { FLOORS } from '../data/floors';
import { RNG } from '../utils/RNG';

type MockupPage = 0 | 1 | 2 | 3;
const PAGE_COUNT = 4;

/**
 * Visual mockup with four pages, switched via TAB:
 *   - Page 0 (Backdrop comparison): left = current Emerald-Forest backdrop
 *     with actual in-game textures, right = painterly re-imagining pulling
 *     Title-Screen-DNA (gradient vignette, atmospheric layering, glow halos,
 *     fireflies, mist) into the same room footprint.
 *   - Page 1 (Emerald showcase): full-screen painterly room with wizard,
 *     Pixie Queen mid-fight, mobs, item pedestal, drops + combat trails.
 *   - Page 2 (Sapphire showcase): same composition recoloured for the
 *     Sapphire Swamp — lily pads, mangrove roots, Toad Sovereign, swamp mobs.
 *   - Page 3 (Onyx showcase): final-floor mockup, designed from scratch
 *     since the Onyx Mansion isn't implemented yet — gothic mansion
 *     parquet, candle-sconce walls, Lord Onyx + mansion mob roster all
 *     painted procedurally to scope the floor's identity.
 *
 * Reachable from the Main Menu via [M], cycled via [TAB], closed via [ESC].
 */
export class StyleMockupScene extends Phaser.Scene {
  private static readonly MOCK_TILES_W = 6;
  private static readonly MOCK_TILES_H = 5;
  private static readonly NATIVE_W = StyleMockupScene.MOCK_TILES_W * TILE_SIZE; // 384
  private static readonly NATIVE_H = StyleMockupScene.MOCK_TILES_H * TILE_SIZE; // 320
  private static readonly FLOOR_ID = 'emerald-forest';

  /** Deterministic tile-variant + decoration layout shared by both halves. */
  private static readonly LAYOUT = StyleMockupScene.computeLayout();

  private page: MockupPage = 0;

  constructor() {
    super({ key: SceneKeys.StyleMockup });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0a0612);
    this.renderPage();

    const close = (): void => {
      this.scene.start(SceneKeys.MainMenu);
    };
    this.input.keyboard?.on('keydown-ESC', close);
    this.input.keyboard?.on('keydown-M', close);
    this.input.keyboard?.on('keydown-TAB', () => {
      this.page = (((this.page + 1) % PAGE_COUNT) as MockupPage);
      this.renderPage();
    });
  }

  private renderPage(): void {
    // Tear down everything (children + tweens) so each page renders cleanly.
    this.tweens.killAll();
    this.children.removeAll(true);

    const cx = GAME_WIDTH / 2;
    switch (this.page) {
      case 0:
        this.paintComparisonPage(cx);
        break;
      case 1:
        this.paintHeader(
          cx,
          'STYLE MOCKUP — EMERALD FOREST',
          `Page 2/${PAGE_COUNT} · Wizard vs. Pixie Queen, painted`,
        );
        this.paintShowcaseEmerald();
        break;
      case 2:
        this.paintHeader(
          cx,
          'STYLE MOCKUP — SAPPHIRE SWAMP',
          `Page 3/${PAGE_COUNT} · Wizard vs. Toad Sovereign, painted`,
        );
        this.paintShowcaseSapphire();
        break;
      case 3:
        this.paintHeader(
          cx,
          'STYLE MOCKUP — ONYX MANSION',
          `Page 4/${PAGE_COUNT} · Wizard vs. Lord Onyx, painted (final floor)`,
        );
        this.paintShowcaseOnyx();
        break;
    }
    this.paintFooter(cx);
  }

  private paintComparisonPage(cx: number): void {
    this.paintHeader(
      cx,
      'STYLE MOCKUP — EMERALD FOREST BACKDROP',
      `Page 1/${PAGE_COUNT} · Backdrop comparison`,
    );

    const topY = 130;
    const leftX = 30;
    const rightX = GAME_WIDTH - 30 - StyleMockupScene.NATIVE_W;

    this.paintCurrent(leftX, topY);
    this.paintProposed(rightX, topY);

    this.paintCenterIndicator(cx, topY + StyleMockupScene.NATIVE_H / 2);

    this.add
      .text(leftX + StyleMockupScene.NATIVE_W / 2, topY - 26, 'CURRENT', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#aab8c0',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(rightX + StyleMockupScene.NATIVE_W / 2, topY - 26, 'PROPOSED', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#e9d5ff',
        stroke: '#1a0828',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  // ---------------------------------------------------------------------------
  // Header / Footer / Indicator
  // ---------------------------------------------------------------------------

  private paintHeader(cx: number, title: string, subtitle: string): void {
    this.add
      .text(cx, 50, title, {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#e9d5ff',
        stroke: '#1a0828',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 82, subtitle, {
        fontSize: '14px',
        color: '#88c060',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
  }

  private paintFooter(cx: number): void {
    this.add
      .text(cx, GAME_HEIGHT - 40, '[TAB] SWITCH PAGE     ·     [ESC] OR [M] CLOSE', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#aab8c0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
  }

  /** Glowing arrow + "VS" badge in the gap between the two halves. */
  private paintCenterIndicator(cx: number, cy: number): void {
    const g = this.add.graphics();
    // Soft glow halo
    g.fillStyle(0xff7ac0, 0.12);
    g.fillCircle(cx, cy, 38);
    g.fillStyle(0xff7ac0, 0.18);
    g.fillCircle(cx, cy, 26);
    g.fillStyle(0xffaad8, 0.25);
    g.fillCircle(cx, cy, 16);

    const arrow = this.add
      .text(cx, cy, '→', {
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#fff8c0',
        stroke: '#1a0828',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: arrow,
      x: cx + 4,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  // ---------------------------------------------------------------------------
  // CURRENT — actual in-game textures on a 6×5 mini room
  // ---------------------------------------------------------------------------

  private paintCurrent(originX: number, originY: number): void {
    const container = this.add.container(originX, originY);
    const { tilesW, tilesH } = StyleMockupScene.dimsTiles();
    const layout = StyleMockupScene.LAYOUT;
    const themeId = StyleMockupScene.FLOOR_ID;
    const half = TILE_SIZE / 2;

    // Floor tiles (inner 4×3 area)
    for (let ty = 1; ty < tilesH - 1; ty++) {
      for (let tx = 1; tx < tilesW - 1; tx++) {
        const variant = layout.floorVariants[ty * tilesW + tx]!;
        const tile = this.add.image(
          tx * TILE_SIZE + half,
          ty * TILE_SIZE + half,
          floorTileKey(themeId, variant),
        );
        container.add(tile);
      }
    }

    // Wall ring
    for (let tx = 0; tx < tilesW; tx++) {
      container.add(
        this.add.image(tx * TILE_SIZE + half, half, wallTileKey(themeId)),
      );
      container.add(
        this.add.image(
          tx * TILE_SIZE + half,
          (tilesH - 1) * TILE_SIZE + half,
          wallTileKey(themeId),
        ),
      );
    }
    for (let ty = 1; ty < tilesH - 1; ty++) {
      container.add(this.add.image(half, ty * TILE_SIZE + half, wallTileKey(themeId)));
      container.add(
        this.add.image(
          (tilesW - 1) * TILE_SIZE + half,
          ty * TILE_SIZE + half,
          wallTileKey(themeId),
        ),
      );
    }

    // Decorations
    for (const d of layout.decorations) {
      const key =
        d.kind === 'tree'
          ? treeDecoKey(themeId)
          : d.kind === 'rock'
            ? rockDecoKey(themeId)
            : mushroomDecoKey(themeId);
      const img = this.add.image(d.x, d.y, key);
      if (d.kind === 'mushroom') img.setAlpha(0.92);
      container.add(img);
    }

    this.paintBorderFrame(container, 0x444444, 0.6);
  }

  // ---------------------------------------------------------------------------
  // PROPOSED — painterly re-imagining (Title-Screen-DNA on a top-down room)
  // ---------------------------------------------------------------------------

  private paintProposed(originX: number, originY: number): void {
    const container = this.add.container(originX, originY);
    const w = StyleMockupScene.NATIVE_W;
    const h = StyleMockupScene.NATIVE_H;
    const layout = StyleMockupScene.LAYOUT;
    const half = TILE_SIZE / 2;

    // 1) Base floor — radial vignette, warm-green core fading to deep forest.
    const floorG = this.add.graphics();
    container.add(floorG);
    floorG.fillStyle(0x040a0a, 1);
    floorG.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2 + 10;
    const vignetteLayers: ReadonlyArray<readonly [number, number, number, number]> = [
      [w * 0.78, h * 0.74, 0x0a1a14, 1],
      [w * 0.66, h * 0.62, 0x0e2a1a, 1],
      [w * 0.54, h * 0.50, 0x143822, 1],
      [w * 0.40, h * 0.36, 0x1c4a2a, 1],
      [w * 0.26, h * 0.22, 0x256832, 0.7],
      [w * 0.14, h * 0.12, 0x3a8845, 0.45],
    ];
    for (const [rx, ry, color, alpha] of vignetteLayers) {
      floorG.fillStyle(color, alpha);
      floorG.fillEllipse(cx, cy, rx * 2, ry * 2);
    }

    // 2) Painterly mossy patches — scattered 3-tone blobs over the floor.
    const patchG = this.add.graphics();
    container.add(patchG);
    const patchRng = new RNG('mockup-patches');
    for (let i = 0; i < 22; i++) {
      const px = patchRng.intBetween(48, w - 48);
      const py = patchRng.intBetween(64, h - 64);
      // Skip patches that would land directly under/over the proposed wall bands.
      if (py < 56 || py > h - 60) continue;
      const size = patchRng.intBetween(8, 18);
      patchG.fillStyle(0x102a18, 0.85);
      patchG.fillEllipse(px, py, size * 1.6, size);
      patchG.fillStyle(0x1c4626, 0.85);
      patchG.fillEllipse(px - 2, py - 1, size * 1.2, size * 0.75);
      patchG.fillStyle(0x2d6634, 0.6);
      patchG.fillEllipse(px - 1, py - 2, size * 0.55, size * 0.32);
    }

    // 3) Top wall — distant-forest canopy band (Title-style, painterly).
    const canopyG = this.add.graphics();
    container.add(canopyG);
    // Ground anchor for canopy
    canopyG.fillStyle(0x040a0a, 1);
    canopyG.fillRect(0, 0, w, 30);
    // Distant treeline (small jagged triangles)
    canopyG.fillStyle(0x081210, 1);
    for (let x = 0; x < w; x += 12) {
      const th = 12 + ((x * 7919) % 14);
      canopyG.fillTriangle(x - 3, 30, x + 9, 30, x + 3, 30 - th);
    }
    // Mid canopy — overlapping foliage circles, three tones
    canopyG.fillStyle(0x0a1a18, 1);
    for (let x = -10; x < w + 10; x += 22) {
      const fh = 22 + ((x * 4421) % 16);
      canopyG.fillCircle(x + 8, 30 + fh * 0.15, fh * 0.55);
      canopyG.fillCircle(x - 2, 30 + fh * 0.05, fh * 0.45);
      canopyG.fillCircle(x + 18, 30 + fh * 0.08, fh * 0.5);
    }
    canopyG.fillStyle(0x14361a, 1);
    for (let x = 4; x < w; x += 28) {
      const fh = 18 + ((x * 5147) % 12);
      canopyG.fillCircle(x + 6, 30 + fh * 0.25, fh * 0.4);
      canopyG.fillCircle(x + 18, 30 + fh * 0.18, fh * 0.36);
    }
    canopyG.fillStyle(0x2d6634, 0.85);
    for (let x = 6; x < w; x += 36) {
      canopyG.fillEllipse(x + 8, 38, 12, 5);
    }
    // Bright foliage caps (ambient highlight)
    canopyG.fillStyle(0x4ea656, 0.7);
    for (let x = 8; x < w; x += 48) {
      canopyG.fillEllipse(x + 4, 32, 6, 2);
    }

    // 4) Bottom wall — grounded mossy band.
    const bottomG = this.add.graphics();
    container.add(bottomG);
    bottomG.fillStyle(0x040a0a, 1);
    bottomG.fillRect(0, h - 50, w, 50);
    bottomG.fillStyle(0x0e2a14, 1);
    bottomG.fillRect(0, h - 48, w, 46);
    bottomG.fillStyle(0x14361a, 1);
    for (let x = 0; x < w; x += 18) {
      bottomG.fillEllipse(x + 9, h - 46, 18, 8);
    }
    bottomG.fillStyle(0x2d6634, 1);
    for (let x = 0; x < w; x += 24) {
      bottomG.fillEllipse(x + 10, h - 47, 12, 4);
    }
    bottomG.fillStyle(0x4ea656, 0.9);
    for (let x = 0; x < w; x += 32) {
      bottomG.fillEllipse(x + 12, h - 48, 5, 1.6);
    }

    // 5) Side walls — vertical bark slivers with a moss-edge highlight.
    const sideG = this.add.graphics();
    container.add(sideG);
    for (const sx of [0, w - 36]) {
      sideG.fillStyle(0x040a0a, 1);
      sideG.fillRect(sx, 30, 36, h - 80);
      sideG.fillStyle(0x1a1208, 1);
      sideG.fillRect(sx + 2, 30, 32, h - 80);
      // Highlight strip on the inner edge
      const hiX = sx === 0 ? sx + 30 : sx + 2;
      sideG.fillStyle(0x3a2a14, 1);
      sideG.fillRect(hiX, 32, 3, h - 84);
      // Vertical bark grooves
      sideG.fillStyle(0x0a0604, 0.7);
      for (let gy = 36; gy < h - 56; gy += 18) {
        sideG.fillRect(sx + (sx === 0 ? 8 : 14), gy, 1, 12);
        sideG.fillRect(sx + (sx === 0 ? 18 : 24), gy + 8, 1, 10);
      }
      // Inner-edge mossy fringe (the bit that touches the floor)
      const mossX = sx === 0 ? sx + 32 : sx + 2;
      sideG.fillStyle(0x14361a, 0.85);
      sideG.fillRect(mossX, 30, 4, h - 80);
      sideG.fillStyle(0x2d6634, 0.9);
      for (let gy = 36; gy < h - 56; gy += 12) {
        sideG.fillEllipse(mossX + 2, gy + 4, 5, 3);
      }
    }

    // 6) Light shafts — 2 diagonal warm-green bands from the canopy.
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0x88c060, 0.07);
    this.fillSlantedBand(lightG, 80, 30, 80, h - 60, 60);
    lightG.fillStyle(0xb0e890, 0.08);
    this.fillSlantedBand(lightG, 90, 32, 80, h - 64, 30);
    lightG.fillStyle(0x88c060, 0.06);
    this.fillSlantedBand(lightG, w - 120, 30, 60, h - 60, 70);

    // 7) Decorations — actual textures + a glow halo painted underneath.
    for (const d of layout.decorations) {
      const haloG = this.add.graphics();
      haloG.fillStyle(0x88c060, 0.10);
      haloG.fillEllipse(d.x, d.y + 8, 60, 22);
      haloG.fillStyle(0x4ea656, 0.16);
      haloG.fillEllipse(d.x, d.y + 8, 40, 14);
      haloG.fillStyle(0xb0e890, 0.20);
      haloG.fillEllipse(d.x, d.y + 8, 22, 8);
      container.add(haloG);

      const key =
        d.kind === 'tree'
          ? treeDecoKey(StyleMockupScene.FLOOR_ID)
          : d.kind === 'rock'
            ? rockDecoKey(StyleMockupScene.FLOOR_ID)
            : mushroomDecoKey(StyleMockupScene.FLOOR_ID);
      const img = this.add.image(d.x, d.y, key);
      if (d.kind === 'mushroom') img.setAlpha(0.95);
      container.add(img);
    }

    // 8) Mist bands — thin alpha strips across the lower floor.
    const mistG = this.add.graphics();
    container.add(mistG);
    mistG.fillStyle(0xc0eadd, 0.06);
    mistG.fillRect(0, h - 110, w, 12);
    mistG.fillStyle(0xc0eadd, 0.08);
    mistG.fillRect(0, h - 90, w, 6);
    mistG.fillStyle(0xc0eadd, 0.05);
    mistG.fillRect(0, h - 70, w, 10);

    // 9) Fireflies — outline + glow + sparkle pixel.
    const flyG = this.add.graphics();
    container.add(flyG);
    const fireflies: ReadonlyArray<readonly [number, number, number, number]> = [
      [60, 110, 1.8, 0x88c060],
      [140, 80, 1.6, 0xb0e890],
      [220, 130, 2.0, 0x88c060],
      [300, 90, 1.6, 0xb0e890],
      [330, 170, 1.8, 0x88c060],
      [w - 70, 100, 1.6, 0xff7ac0],
      [w - 130, 150, 1.4, 0xffaad8],
      [80, 200, 2.0, 0x88c060],
      [200, 220, 1.6, 0xb0e890],
      [270, 250, 1.4, 0x88c060],
      [350, 230, 1.8, 0xff7ac0],
      [half * 2, h - 90, 1.6, 0x88c060],
    ];
    for (const [fx, fy, fr, color] of fireflies) {
      flyG.fillStyle(0x040a05, 1);
      flyG.fillCircle(fx, fy, fr + 0.8);
      flyG.fillStyle(color, 1);
      flyG.fillCircle(fx, fy, fr);
      flyG.fillStyle(0xffffff, 0.95);
      flyG.fillRect(fx, fy - 1, 1, 1);
    }
    this.tweens.add({
      targets: flyG,
      alpha: { from: 0.85, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 10) Vignette overlay — final cinematic edge dim.
    const vignG = this.add.graphics();
    container.add(vignG);
    for (let i = 0; i < 18; i++) {
      const a = 0.25 - i * 0.012;
      vignG.fillStyle(0x000000, Math.max(0, a));
      vignG.fillRect(i, i, w - i * 2, 1);
      vignG.fillRect(i, h - i - 1, w - i * 2, 1);
      vignG.fillRect(i, i, 1, h - i * 2);
      vignG.fillRect(w - i - 1, i, 1, h - i * 2);
    }

    this.paintBorderFrame(container, 0xff7ac0, 0.55);
  }

  // ---------------------------------------------------------------------------
  // PAGE 1 — full-screen Wizard-vs-Pixie-Queen showcase, painted
  // ---------------------------------------------------------------------------

  private paintShowcaseEmerald(): void {
    // Native canvas: 14 × 7 tiles = 896 × 448, anchored at (32, 100).
    const w = 14 * TILE_SIZE; // 896
    const h = 7 * TILE_SIZE; // 448
    const originX = (GAME_WIDTH - w) / 2; // 32
    const originY = 100;
    const container = this.add.container(originX, originY);

    // ---- 1) Floor base + radial vignette --------------------------------
    const floorG = this.add.graphics();
    container.add(floorG);
    floorG.fillStyle(0x040a0a, 1);
    floorG.fillRect(0, 0, w, h);
    const fcx = w / 2;
    const fcy = h / 2 + 20;
    const vignetteLayers: ReadonlyArray<readonly [number, number, number, number]> = [
      [w * 0.78, h * 0.78, 0x0a1a14, 1],
      [w * 0.66, h * 0.66, 0x0e2a1a, 1],
      [w * 0.54, h * 0.54, 0x143822, 1],
      [w * 0.42, h * 0.42, 0x1c4a2a, 1],
      [w * 0.28, h * 0.28, 0x256832, 0.7],
      [w * 0.16, h * 0.16, 0x3a8845, 0.42],
    ];
    for (const [rx, ry, color, alpha] of vignetteLayers) {
      floorG.fillStyle(color, alpha);
      floorG.fillEllipse(fcx, fcy, rx * 2, ry * 2);
    }

    // ---- 2) Mossy patches scattered over the floor ----------------------
    const patchG = this.add.graphics();
    container.add(patchG);
    const patchRng = new RNG('mockup-showcase-patches');
    for (let i = 0; i < 50; i++) {
      const px = patchRng.intBetween(60, w - 60);
      const py = patchRng.intBetween(80, h - 80);
      const size = patchRng.intBetween(8, 20);
      patchG.fillStyle(0x102a18, 0.85);
      patchG.fillEllipse(px, py, size * 1.6, size);
      patchG.fillStyle(0x1c4626, 0.85);
      patchG.fillEllipse(px - 2, py - 1, size * 1.2, size * 0.75);
      patchG.fillStyle(0x2d6634, 0.6);
      patchG.fillEllipse(px - 1, py - 2, size * 0.55, size * 0.32);
    }

    // ---- 3) Top wall — Title-style layered canopy -----------------------
    const canopyG = this.add.graphics();
    container.add(canopyG);
    canopyG.fillStyle(0x040a0a, 1);
    canopyG.fillRect(0, 0, w, 38);
    canopyG.fillStyle(0x081210, 1);
    for (let x = 0; x < w; x += 14) {
      const th = 14 + ((x * 7919) % 18);
      canopyG.fillTriangle(x - 3, 38, x + 11, 38, x + 4, 38 - th);
    }
    canopyG.fillStyle(0x0a1a18, 1);
    for (let x = -10; x < w + 10; x += 26) {
      const fh = 26 + ((x * 4421) % 18);
      canopyG.fillCircle(x + 8, 38 + fh * 0.15, fh * 0.55);
      canopyG.fillCircle(x - 2, 38 + fh * 0.05, fh * 0.45);
      canopyG.fillCircle(x + 18, 38 + fh * 0.08, fh * 0.5);
    }
    canopyG.fillStyle(0x14361a, 1);
    for (let x = 4; x < w; x += 32) {
      const fh = 22 + ((x * 5147) % 14);
      canopyG.fillCircle(x + 6, 38 + fh * 0.25, fh * 0.4);
      canopyG.fillCircle(x + 18, 38 + fh * 0.18, fh * 0.36);
    }
    canopyG.fillStyle(0x2d6634, 0.85);
    for (let x = 6; x < w; x += 40) {
      canopyG.fillEllipse(x + 8, 48, 14, 6);
    }
    canopyG.fillStyle(0x4ea656, 0.7);
    for (let x = 8; x < w; x += 56) {
      canopyG.fillEllipse(x + 4, 42, 7, 2);
    }

    // ---- 4) Bottom wall — grounded mossy band ---------------------------
    const bottomG = this.add.graphics();
    container.add(bottomG);
    bottomG.fillStyle(0x040a0a, 1);
    bottomG.fillRect(0, h - 56, w, 56);
    bottomG.fillStyle(0x0e2a14, 1);
    bottomG.fillRect(0, h - 54, w, 52);
    bottomG.fillStyle(0x14361a, 1);
    for (let x = 0; x < w; x += 22) {
      bottomG.fillEllipse(x + 11, h - 52, 22, 10);
    }
    bottomG.fillStyle(0x2d6634, 1);
    for (let x = 0; x < w; x += 28) {
      bottomG.fillEllipse(x + 12, h - 53, 14, 5);
    }
    bottomG.fillStyle(0x4ea656, 0.9);
    for (let x = 0; x < w; x += 36) {
      bottomG.fillEllipse(x + 14, h - 54, 6, 2);
    }

    // ---- 5) Side walls — vertical bark slivers --------------------------
    const sideG = this.add.graphics();
    container.add(sideG);
    for (const sx of [0, w - 38]) {
      sideG.fillStyle(0x040a0a, 1);
      sideG.fillRect(sx, 38, 38, h - 94);
      sideG.fillStyle(0x1a1208, 1);
      sideG.fillRect(sx + 2, 38, 34, h - 94);
      const hiX = sx === 0 ? sx + 32 : sx + 2;
      sideG.fillStyle(0x3a2a14, 1);
      sideG.fillRect(hiX, 40, 3, h - 98);
      sideG.fillStyle(0x0a0604, 0.7);
      for (let gy = 44; gy < h - 60; gy += 18) {
        sideG.fillRect(sx + (sx === 0 ? 8 : 14), gy, 1, 12);
        sideG.fillRect(sx + (sx === 0 ? 18 : 24), gy + 8, 1, 10);
      }
      const mossX = sx === 0 ? sx + 34 : sx + 2;
      sideG.fillStyle(0x14361a, 0.85);
      sideG.fillRect(mossX, 38, 4, h - 94);
      sideG.fillStyle(0x2d6634, 0.9);
      for (let gy = 44; gy < h - 60; gy += 12) {
        sideG.fillEllipse(mossX + 2, gy + 4, 5, 3);
      }
    }

    // ---- 6) Light shafts ------------------------------------------------
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0x88c060, 0.07);
    this.fillSlantedBand(lightG, 120, 38, 100, h - 80, 60);
    lightG.fillStyle(0xb0e890, 0.08);
    this.fillSlantedBand(lightG, 130, 40, 80, h - 84, 30);
    lightG.fillStyle(0x88c060, 0.06);
    this.fillSlantedBand(lightG, w - 240, 38, 90, h - 80, 70);

    // ---- 7) Decorations (trees / rocks / mushrooms) --------------------
    const decoSpec: ReadonlyArray<{
      kind: 'tree' | 'rock' | 'mushroom';
      x: number;
      y: number;
    }> = [
      { kind: 'tree', x: 90, y: 110 },
      { kind: 'tree', x: w - 110, y: 100 },
      { kind: 'rock', x: 320, y: 150 },
      { kind: 'rock', x: 600, y: 130 },
      { kind: 'mushroom', x: 130, y: 250 },
      { kind: 'mushroom', x: 230, y: 360 },
      { kind: 'mushroom', x: w - 170, y: 350 },
    ];
    for (const d of decoSpec) {
      const haloG = this.add.graphics();
      haloG.fillStyle(0x88c060, 0.08);
      haloG.fillEllipse(d.x, d.y + 10, 60, 22);
      haloG.fillStyle(0x4ea656, 0.14);
      haloG.fillEllipse(d.x, d.y + 10, 38, 14);
      container.add(haloG);
      const key =
        d.kind === 'tree'
          ? treeDecoKey(StyleMockupScene.FLOOR_ID)
          : d.kind === 'rock'
            ? rockDecoKey(StyleMockupScene.FLOOR_ID)
            : mushroomDecoKey(StyleMockupScene.FLOOR_ID);
      const img = this.add.image(d.x, d.y, key);
      if (d.kind === 'mushroom') img.setAlpha(0.95);
      container.add(img);
    }

    // ---- 8) Item Pedestal with floating Magic Tome ---------------------
    const pedestalX = 460;
    const pedestalY = 320;
    const altarG = this.add.graphics();
    altarG.fillStyle(0xfff0a0, 0.18);
    altarG.fillEllipse(pedestalX, pedestalY + 22, 70, 24);
    altarG.fillStyle(0xffd84a, 0.28);
    altarG.fillEllipse(pedestalX, pedestalY + 22, 46, 16);
    container.add(altarG);
    const pedestal = this.add.image(pedestalX, pedestalY, TextureKeys.ItemPedestal);
    container.add(pedestal);
    // Magic Tome floating above with a soft halo
    const tomeHaloG = this.add.graphics();
    tomeHaloG.fillStyle(0xff7ac0, 0.18);
    tomeHaloG.fillCircle(pedestalX, pedestalY - 12, 26);
    tomeHaloG.fillStyle(0xffaad8, 0.32);
    tomeHaloG.fillCircle(pedestalX, pedestalY - 12, 16);
    container.add(tomeHaloG);
    const tome = this.add.image(pedestalX, pedestalY - 12, TextureKeys.ItemMagicTome);
    container.add(tome);
    this.tweens.add({
      targets: tome,
      y: pedestalY - 18,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // ---- 9) Drops scattered in front of the pedestal -------------------
    const drops: Array<{ key: string; x: number; y: number; tint?: number }> = [
      { key: TextureKeys.HeartFull, x: 360, y: 380 },
      { key: TextureKeys.Coin, x: 410, y: 400 },
      { key: TextureKeys.Coin, x: 530, y: 395 },
      { key: TextureKeys.Key, x: 580, y: 372 },
    ];
    for (const drop of drops) {
      const haloG = this.add.graphics();
      const haloColor = drop.key === TextureKeys.HeartFull ? 0xff5577 : drop.key === TextureKeys.Coin ? 0xffd84a : 0xc0eaff;
      haloG.fillStyle(haloColor, 0.18);
      haloG.fillEllipse(drop.x, drop.y + 6, 22, 8);
      haloG.fillStyle(haloColor, 0.32);
      haloG.fillEllipse(drop.x, drop.y + 6, 12, 4);
      container.add(haloG);
      const img = this.add.image(drop.x, drop.y, drop.key);
      container.add(img);
    }

    // ---- 10) Mob roster ------------------------------------------------
    const mobs: Array<{ key: string; x: number; y: number; halo?: number; scale?: number }> = [
      { key: TextureKeys.ForestSprite, x: 360, y: 200, halo: 0x88c060 },
      { key: TextureKeys.ForestSprite, x: 540, y: 240, halo: 0x88c060 },
      { key: TextureKeys.MossySlime, x: 180, y: 360, halo: 0x4ea656 },
      { key: TextureKeys.VineSprout, x: 700, y: 360, halo: 0x4ea656 },
      { key: TextureKeys.PixieDancer, x: 280, y: 290, halo: 0xff7ac0 },
    ];
    for (const m of mobs) {
      if (m.halo !== undefined) {
        const haloG = this.add.graphics();
        haloG.fillStyle(m.halo, 0.10);
        haloG.fillEllipse(m.x, m.y + 14, 56, 20);
        haloG.fillStyle(m.halo, 0.18);
        haloG.fillEllipse(m.x, m.y + 14, 32, 12);
        container.add(haloG);
      }
      const img = this.add.image(m.x, m.y, m.key);
      if (m.scale !== undefined) img.setScale(m.scale);
      container.add(img);
    }

    // ---- 11) Wizard (left-center) --------------------------------------
    const wizardX = 200;
    const wizardY = 280;
    const wizAuraG = this.add.graphics();
    wizAuraG.fillStyle(0x88c060, 0.12);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 80, 22);
    wizAuraG.fillStyle(0x4ea656, 0.20);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 56, 16);
    wizAuraG.fillStyle(0xb0e890, 0.26);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 32, 8);
    container.add(wizAuraG);
    const wizard = this.add.image(wizardX, wizardY, TextureKeys.Player);
    wizard.setScale(1.4);
    wizard.setRotation(-0.06);
    container.add(wizard);

    // ---- 12) Pixie Queen (right-center) --------------------------------
    const queenX = w - 200;
    const queenY = 230;
    // Pink halo backdrop (Title-style)
    const queenHaloG = this.add.graphics();
    queenHaloG.fillStyle(0xff7ac0, 0.10);
    queenHaloG.fillCircle(queenX, queenY, 100);
    queenHaloG.fillStyle(0xff7ac0, 0.16);
    queenHaloG.fillCircle(queenX, queenY, 70);
    queenHaloG.fillStyle(0xffaad8, 0.22);
    queenHaloG.fillCircle(queenX, queenY, 44);
    container.add(queenHaloG);
    const queen = this.add.image(queenX, queenY, TextureKeys.BossPixieQueen);
    queen.setScale(1.8);
    queen.setRotation(0.06);
    container.add(queen);
    this.tweens.add({
      targets: queen,
      y: queenY - 6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // ---- 13) Combat — magic missile arc + thorn volley -----------------
    const combatG = this.add.graphics();
    container.add(combatG);
    const wandX = wizardX + 30;
    const wandY = wizardY - 20;
    const queenChestX = queenX - 30;
    const queenChestY = queenY + 6;
    const ctrlX = (wandX + queenChestX) / 2;
    const ctrlY = Math.min(wandY, queenChestY) - 70;
    const beads = 6;
    for (let i = 0; i < beads; i++) {
      const t = (i + 1) / (beads + 1);
      const px = quadBezier(wandX, ctrlX, queenChestX, t);
      const py = quadBezier(wandY, ctrlY, queenChestY, t);
      const alpha = 0.4 + (i / (beads - 1)) * 0.55;
      const radius = 3 + (i / (beads - 1)) * 5;
      combatG.fillStyle(0xc0eaff, alpha * 0.4);
      combatG.fillCircle(px, py, radius * 1.6);
      combatG.fillStyle(0xeaffff, alpha);
      combatG.fillCircle(px, py, radius);
      combatG.fillStyle(0xffffff, alpha);
      combatG.fillRect(px, py - 1, 1, 1);
    }
    // Queen's thorn volley flying left toward the wizard.
    const thorns: ReadonlyArray<readonly [number, number]> = [
      [queenX - 90, queenY - 40],
      [queenX - 150, queenY + 20],
      [queenX - 220, queenY + 80],
    ];
    for (const [tx, ty] of thorns) {
      combatG.fillStyle(0x040408, 1);
      combatG.fillTriangle(tx + 12, ty - 5, tx + 12, ty + 5, tx - 6, ty);
      combatG.fillStyle(0xff7ac0, 1);
      combatG.fillTriangle(tx + 10, ty - 3, tx + 10, ty + 3, tx - 4, ty);
      combatG.fillStyle(0xffaad8, 0.5);
      combatG.fillRect(tx + 12, ty - 1, 24, 2);
      combatG.fillStyle(0xffaad8, 0.25);
      combatG.fillRect(tx + 36, ty - 1, 28, 2);
    }

    // ---- 14) Mist bands --------------------------------------------------
    const mistG = this.add.graphics();
    container.add(mistG);
    mistG.fillStyle(0xc0eadd, 0.06);
    mistG.fillRect(0, h - 130, w, 14);
    mistG.fillStyle(0xc0eadd, 0.08);
    mistG.fillRect(0, h - 100, w, 8);
    mistG.fillStyle(0xc0eadd, 0.05);
    mistG.fillRect(0, h - 78, w, 12);

    // ---- 15) Fireflies sprinkled across the playfield ------------------
    const flyG = this.add.graphics();
    container.add(flyG);
    const fireflies: ReadonlyArray<readonly [number, number, number, number]> = [
      [80, 140, 1.8, 0x88c060],
      [180, 100, 1.6, 0xb0e890],
      [320, 90, 2.0, 0x88c060],
      [430, 130, 1.6, 0xb0e890],
      [560, 100, 1.8, 0x88c060],
      [680, 140, 1.6, 0xb0e890],
      [w - 80, 90, 1.8, 0xff7ac0],
      [w - 200, 110, 1.6, 0xffaad8],
      [60, 250, 2.0, 0x88c060],
      [310, 250, 1.6, 0xb0e890],
      [800, 230, 1.4, 0x88c060],
      [120, 360, 1.8, 0x88c060],
      [440, 250, 1.6, 0xff7ac0],
      [620, 290, 1.4, 0xffaad8],
      [770, 380, 1.6, 0x88c060],
      [380, 350, 1.4, 0xb0e890],
    ];
    for (const [fx, fy, fr, color] of fireflies) {
      flyG.fillStyle(0x040a05, 1);
      flyG.fillCircle(fx, fy, fr + 0.8);
      flyG.fillStyle(color, 1);
      flyG.fillCircle(fx, fy, fr);
      flyG.fillStyle(0xffffff, 0.95);
      flyG.fillRect(fx, fy - 1, 1, 1);
    }
    this.tweens.add({
      targets: flyG,
      alpha: { from: 0.85, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // ---- 16) Cinematic vignette overlay --------------------------------
    const vignG = this.add.graphics();
    container.add(vignG);
    for (let i = 0; i < 22; i++) {
      const a = 0.30 - i * 0.012;
      vignG.fillStyle(0x000000, Math.max(0, a));
      vignG.fillRect(i, i, w - i * 2, 1);
      vignG.fillRect(i, h - i - 1, w - i * 2, 1);
      vignG.fillRect(i, i, 1, h - i * 2);
      vignG.fillRect(w - i - 1, i, 1, h - i * 2);
    }
    this.paintBorderFrame(container, 0xff7ac0, 0.55);

    // ---- 17) Boss HP bar (Title-style) above the canvas ---------------
    this.paintBossHpBar(originX + w / 2, originY - 18, w * 0.55, {
      label: 'PIXIE QUEEN',
      fill: 0xff7ac0,
      highlight: 0xffaad8,
      labelColor: '#ffeaf2',
      strokeColor: '#1a0828',
    });
  }

  // ---------------------------------------------------------------------------
  // PAGE 2 — Sapphire Swamp showcase (Wizard vs. Toad Sovereign)
  // ---------------------------------------------------------------------------

  private paintShowcaseSapphire(): void {
    const w = 14 * TILE_SIZE;
    const h = 7 * TILE_SIZE;
    const originX = (GAME_WIDTH - w) / 2;
    const originY = 100;
    const container = this.add.container(originX, originY);

    // 1) Floor — murky teal pool with sapphire-glow vignette.
    const floorG = this.add.graphics();
    container.add(floorG);
    floorG.fillStyle(0x02060a, 1);
    floorG.fillRect(0, 0, w, h);
    const fcx = w / 2;
    const fcy = h / 2 + 20;
    const sapphireVignette: ReadonlyArray<readonly [number, number, number, number]> = [
      [w * 0.78, h * 0.78, 0x06121c, 1],
      [w * 0.66, h * 0.66, 0x0a1c2a, 1],
      [w * 0.54, h * 0.54, 0x0e2638, 1],
      [w * 0.42, h * 0.42, 0x143850, 1],
      [w * 0.28, h * 0.28, 0x1c5070, 0.7],
      [w * 0.16, h * 0.16, 0x2a78a0, 0.42],
    ];
    for (const [rx, ry, color, alpha] of sapphireVignette) {
      floorG.fillStyle(color, alpha);
      floorG.fillEllipse(fcx, fcy, rx * 2, ry * 2);
    }

    // 2) Algae patches — teal blobs with cyan highlight pixels.
    const patchG = this.add.graphics();
    container.add(patchG);
    const patchRng = new RNG('mockup-sapphire-patches');
    for (let i = 0; i < 50; i++) {
      const px = patchRng.intBetween(60, w - 60);
      const py = patchRng.intBetween(80, h - 80);
      const size = patchRng.intBetween(8, 22);
      patchG.fillStyle(0x081820, 0.85);
      patchG.fillEllipse(px, py, size * 1.6, size);
      patchG.fillStyle(0x143850, 0.85);
      patchG.fillEllipse(px - 2, py - 1, size * 1.2, size * 0.75);
      patchG.fillStyle(0x4ad8ff, 0.35);
      patchG.fillEllipse(px - 1, py - 2, size * 0.4, size * 0.22);
      // Sparkle pixel for the brightest patches
      if (patchRng.chance(0.3)) {
        patchG.fillStyle(0xc0f0ff, 0.9);
        patchG.fillRect(px - 1, py - 2, 1, 1);
      }
    }

    // 3) Top wall — dripping algae from a stone arch (cave-mouth feel).
    const archG = this.add.graphics();
    container.add(archG);
    archG.fillStyle(0x02060a, 1);
    archG.fillRect(0, 0, w, 38);
    archG.fillStyle(0x0a1218, 1);
    archG.fillRect(0, 0, w, 30);
    // Stone arch ridge — irregular dome silhouette
    archG.fillStyle(0x1a2230, 1);
    for (let x = 0; x < w; x += 16) {
      const fh = 14 + ((x * 7919) % 12);
      archG.fillRect(x, 30, 18, fh);
    }
    archG.fillStyle(0x2c3e58, 0.85);
    for (let x = 0; x < w; x += 22) {
      archG.fillRect(x + 4, 30, 12, 4);
    }
    // Hanging algae strands
    archG.fillStyle(0x143850, 1);
    const strandRng = new RNG('sapphire-strands');
    for (let i = 0; i < 36; i++) {
      const sx = strandRng.intBetween(2, w - 2);
      const sl = strandRng.intBetween(8, 24);
      archG.fillRect(sx, 42, 1, sl);
    }
    archG.fillStyle(0x4ad8ff, 0.9);
    for (let i = 0; i < 12; i++) {
      const sx = strandRng.intBetween(2, w - 2);
      archG.fillRect(sx, 42 + strandRng.intBetween(2, 14), 1, 2);
    }
    // Sapphire glow nodes hanging from the arch (like wet crystal pendants)
    const nodes: ReadonlyArray<readonly [number, number]> = [
      [80, 56],
      [220, 50],
      [380, 60],
      [540, 52],
      [700, 56],
      [840, 50],
    ];
    for (const [nx, ny] of nodes) {
      archG.fillStyle(0x4ad8ff, 0.18);
      archG.fillCircle(nx, ny, 10);
      archG.fillStyle(0x4ad8ff, 0.32);
      archG.fillCircle(nx, ny, 6);
      archG.fillStyle(0xc0f0ff, 0.85);
      archG.fillCircle(nx, ny, 2.4);
      archG.fillStyle(0xffffff, 1);
      archG.fillRect(nx, ny - 1, 1, 1);
    }

    // 4) Bottom wall — muddy bank with algae fringe.
    const bankG = this.add.graphics();
    container.add(bankG);
    bankG.fillStyle(0x02060a, 1);
    bankG.fillRect(0, h - 56, w, 56);
    bankG.fillStyle(0x0a1820, 1);
    bankG.fillRect(0, h - 54, w, 52);
    bankG.fillStyle(0x143850, 1);
    for (let x = 0; x < w; x += 22) {
      bankG.fillEllipse(x + 11, h - 52, 22, 10);
    }
    bankG.fillStyle(0x2a5878, 1);
    for (let x = 0; x < w; x += 28) {
      bankG.fillEllipse(x + 12, h - 53, 14, 5);
    }
    bankG.fillStyle(0x4ad8ff, 0.7);
    for (let x = 0; x < w; x += 38) {
      bankG.fillEllipse(x + 14, h - 54, 6, 2);
    }

    // 5) Side walls — mangrove root pillars with sapphire glow knots.
    const sideG = this.add.graphics();
    container.add(sideG);
    for (const sx of [0, w - 38]) {
      sideG.fillStyle(0x02060a, 1);
      sideG.fillRect(sx, 38, 38, h - 94);
      sideG.fillStyle(0x140820, 1);
      sideG.fillRect(sx + 2, 38, 34, h - 94);
      const hiX = sx === 0 ? sx + 32 : sx + 2;
      sideG.fillStyle(0x2a1838, 1);
      sideG.fillRect(hiX, 40, 3, h - 98);
      // Twisted root segments
      sideG.fillStyle(0x05060a, 0.85);
      for (let gy = 44; gy < h - 60; gy += 14) {
        const drift = (gy * 13) % 6;
        sideG.fillRect(sx + (sx === 0 ? 6 : 12) + drift, gy, 2, 10);
        sideG.fillRect(sx + (sx === 0 ? 22 : 28) - drift, gy + 6, 2, 8);
      }
      // Algae fringe at the inner edge
      const mossX = sx === 0 ? sx + 34 : sx + 2;
      sideG.fillStyle(0x143850, 0.85);
      sideG.fillRect(mossX, 38, 4, h - 94);
      sideG.fillStyle(0x4ad8ff, 0.6);
      for (let gy = 44; gy < h - 60; gy += 14) {
        sideG.fillEllipse(mossX + 2, gy + 4, 5, 3);
      }
      // Sapphire glow knots
      const knots = [60, 140, 220, 300];
      for (const ky of knots) {
        sideG.fillStyle(0x4ad8ff, 0.22);
        sideG.fillCircle(sx + (sx === 0 ? 18 : 20), ky, 5);
        sideG.fillStyle(0xc0f0ff, 0.85);
        sideG.fillCircle(sx + (sx === 0 ? 18 : 20), ky, 2);
      }
    }

    // 6) Light shafts — cool moonlight beams.
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0x4ad8ff, 0.05);
    this.fillSlantedBand(lightG, 120, 38, 100, h - 80, 60);
    lightG.fillStyle(0xc0f0ff, 0.06);
    this.fillSlantedBand(lightG, 130, 40, 80, h - 84, 30);
    lightG.fillStyle(0x4ad8ff, 0.05);
    this.fillSlantedBand(lightG, w - 240, 38, 90, h - 80, 70);

    // 7) Decorations — lily pads + mangrove root textures (sapphire variants).
    const decoSpec: ReadonlyArray<{
      kind: 'tree' | 'rock' | 'mushroom';
      x: number;
      y: number;
    }> = [
      { kind: 'tree', x: 90, y: 110 },
      { kind: 'tree', x: w - 110, y: 100 },
      { kind: 'rock', x: 320, y: 150 },
      { kind: 'rock', x: 600, y: 130 },
      { kind: 'mushroom', x: 130, y: 250 },
      { kind: 'mushroom', x: 230, y: 360 },
      { kind: 'mushroom', x: w - 170, y: 350 },
    ];
    for (const d of decoSpec) {
      const haloG = this.add.graphics();
      haloG.fillStyle(0x4ad8ff, 0.10);
      haloG.fillEllipse(d.x, d.y + 10, 60, 22);
      haloG.fillStyle(0x4ad8ff, 0.18);
      haloG.fillEllipse(d.x, d.y + 10, 38, 14);
      container.add(haloG);
      const key =
        d.kind === 'tree'
          ? treeDecoKey('sapphire-swamp')
          : d.kind === 'rock'
            ? rockDecoKey('sapphire-swamp')
            : mushroomDecoKey('sapphire-swamp');
      const img = this.add.image(d.x, d.y, key);
      if (d.kind === 'mushroom') img.setAlpha(0.95);
      container.add(img);
    }

    // 8) Item Pedestal with floating Mire Pearl (sapphire boss-pool item).
    const pedestalX = 460;
    const pedestalY = 320;
    const altarG = this.add.graphics();
    altarG.fillStyle(0x4ad8ff, 0.16);
    altarG.fillEllipse(pedestalX, pedestalY + 22, 70, 24);
    altarG.fillStyle(0xc0f0ff, 0.28);
    altarG.fillEllipse(pedestalX, pedestalY + 22, 46, 16);
    container.add(altarG);
    const pedestal = this.add.image(pedestalX, pedestalY, TextureKeys.ItemPedestal);
    container.add(pedestal);
    const tomeHaloG = this.add.graphics();
    tomeHaloG.fillStyle(0x4ad8ff, 0.18);
    tomeHaloG.fillCircle(pedestalX, pedestalY - 12, 26);
    tomeHaloG.fillStyle(0xc0f0ff, 0.32);
    tomeHaloG.fillCircle(pedestalX, pedestalY - 12, 16);
    container.add(tomeHaloG);
    const tome = this.add.image(pedestalX, pedestalY - 12, TextureKeys.ItemMirePearl);
    container.add(tome);
    this.tweens.add({
      targets: tome,
      y: pedestalY - 18,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 9) Drops scattered in front of the pedestal.
    const drops: Array<{ key: string; x: number; y: number }> = [
      { key: TextureKeys.HeartFull, x: 360, y: 380 },
      { key: TextureKeys.Coin, x: 410, y: 400 },
      { key: TextureKeys.Coin, x: 530, y: 395 },
      { key: TextureKeys.Key, x: 580, y: 372 },
    ];
    for (const drop of drops) {
      const haloG = this.add.graphics();
      const haloColor = drop.key === TextureKeys.HeartFull ? 0xff5577 : drop.key === TextureKeys.Coin ? 0xffd84a : 0xc0f0ff;
      haloG.fillStyle(haloColor, 0.18);
      haloG.fillEllipse(drop.x, drop.y + 6, 22, 8);
      haloG.fillStyle(haloColor, 0.32);
      haloG.fillEllipse(drop.x, drop.y + 6, 12, 4);
      container.add(haloG);
      const img = this.add.image(drop.x, drop.y, drop.key);
      container.add(img);
    }

    // 10) Sapphire mobs — bog frog, snapper bloom, damselfly, bog tortoise.
    const mobs: Array<{ key: string; x: number; y: number; halo: number }> = [
      { key: TextureKeys.BogFrog, x: 360, y: 200, halo: 0x4ad8ff },
      { key: TextureKeys.Damselfly, x: 540, y: 240, halo: 0x4ad8ff },
      { key: TextureKeys.SnapperBloom, x: 700, y: 360, halo: 0x4ad8ff },
      { key: TextureKeys.BogTortoise, x: 180, y: 360, halo: 0x4ad8ff },
      { key: TextureKeys.BogFrog, x: 280, y: 290, halo: 0x4ad8ff },
    ];
    for (const m of mobs) {
      const haloG = this.add.graphics();
      haloG.fillStyle(m.halo, 0.10);
      haloG.fillEllipse(m.x, m.y + 14, 56, 20);
      haloG.fillStyle(m.halo, 0.18);
      haloG.fillEllipse(m.x, m.y + 14, 32, 12);
      container.add(haloG);
      const img = this.add.image(m.x, m.y, m.key);
      container.add(img);
    }

    // 11) Wizard.
    const wizardX = 200;
    const wizardY = 280;
    const wizAuraG = this.add.graphics();
    wizAuraG.fillStyle(0x88c060, 0.12);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 80, 22);
    wizAuraG.fillStyle(0x4ea656, 0.20);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 56, 16);
    wizAuraG.fillStyle(0xb0e890, 0.26);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 32, 8);
    container.add(wizAuraG);
    const wizard = this.add.image(wizardX, wizardY, TextureKeys.Player);
    wizard.setScale(1.4);
    wizard.setRotation(-0.06);
    container.add(wizard);

    // 12) Toad Sovereign — chunky toad boss with cyan halo.
    const toadX = w - 200;
    const toadY = 250;
    const toadHaloG = this.add.graphics();
    toadHaloG.fillStyle(0x4ad8ff, 0.10);
    toadHaloG.fillCircle(toadX, toadY, 110);
    toadHaloG.fillStyle(0x4ad8ff, 0.16);
    toadHaloG.fillCircle(toadX, toadY, 76);
    toadHaloG.fillStyle(0xc0f0ff, 0.20);
    toadHaloG.fillCircle(toadX, toadY, 48);
    container.add(toadHaloG);
    const toad = this.add.image(toadX, toadY, TextureKeys.BossToadSovereign);
    toad.setScale(1.5);
    container.add(toad);
    this.tweens.add({
      targets: toad,
      y: toadY - 5,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 13) Combat — magic missile arc + sapphire spit globs.
    const combatG = this.add.graphics();
    container.add(combatG);
    const wandX = wizardX + 30;
    const wandY = wizardY - 20;
    const toadChestX = toadX - 40;
    const toadChestY = toadY + 6;
    const ctrlX = (wandX + toadChestX) / 2;
    const ctrlY = Math.min(wandY, toadChestY) - 70;
    const beads = 6;
    for (let i = 0; i < beads; i++) {
      const t = (i + 1) / (beads + 1);
      const px = quadBezier(wandX, ctrlX, toadChestX, t);
      const py = quadBezier(wandY, ctrlY, toadChestY, t);
      const alpha = 0.4 + (i / (beads - 1)) * 0.55;
      const radius = 3 + (i / (beads - 1)) * 5;
      combatG.fillStyle(0xc0eaff, alpha * 0.4);
      combatG.fillCircle(px, py, radius * 1.6);
      combatG.fillStyle(0xeaffff, alpha);
      combatG.fillCircle(px, py, radius);
      combatG.fillStyle(0xffffff, alpha);
      combatG.fillRect(px, py - 1, 1, 1);
    }
    // Toad spits — 3 sapphire-tinted globs flying toward the wizard.
    const globs: ReadonlyArray<readonly [number, number]> = [
      [toadX - 100, toadY - 30],
      [toadX - 170, toadY + 30],
      [toadX - 230, toadY + 80],
    ];
    for (const [gx, gy] of globs) {
      combatG.fillStyle(0x040408, 1);
      combatG.fillCircle(gx, gy, 6);
      combatG.fillStyle(0x4ad8ff, 1);
      combatG.fillCircle(gx, gy, 5);
      combatG.fillStyle(0xc0f0ff, 0.95);
      combatG.fillCircle(gx, gy, 2.5);
      combatG.fillStyle(0xffffff, 1);
      combatG.fillRect(gx - 1, gy - 1, 1, 1);
      // Streak trail
      combatG.fillStyle(0x4ad8ff, 0.5);
      combatG.fillRect(gx + 6, gy - 1, 16, 2);
      combatG.fillStyle(0x4ad8ff, 0.25);
      combatG.fillRect(gx + 22, gy - 1, 22, 2);
    }

    // 14) Mist bands.
    const mistG = this.add.graphics();
    container.add(mistG);
    mistG.fillStyle(0xc0eadd, 0.06);
    mistG.fillRect(0, h - 130, w, 14);
    mistG.fillStyle(0xc0eadd, 0.08);
    mistG.fillRect(0, h - 100, w, 8);
    mistG.fillStyle(0xc0eadd, 0.05);
    mistG.fillRect(0, h - 78, w, 12);

    // 15) Fireflies — sapphire + cyan with a few warm pricks.
    const flyG = this.add.graphics();
    container.add(flyG);
    const fireflies: ReadonlyArray<readonly [number, number, number, number]> = [
      [80, 140, 1.8, 0x4ad8ff],
      [180, 100, 1.6, 0xc0f0ff],
      [320, 90, 2.0, 0x4ad8ff],
      [430, 130, 1.6, 0xc0f0ff],
      [560, 100, 1.8, 0x4ad8ff],
      [680, 140, 1.6, 0xc0f0ff],
      [w - 80, 90, 1.8, 0x4ad8ff],
      [w - 200, 110, 1.6, 0xc0f0ff],
      [60, 250, 2.0, 0x4ad8ff],
      [310, 250, 1.6, 0xc0f0ff],
      [800, 230, 1.4, 0x4ad8ff],
      [120, 360, 1.8, 0x4ad8ff],
      [440, 250, 1.6, 0xc0f0ff],
      [620, 290, 1.4, 0xfff8a0],
      [770, 380, 1.6, 0x4ad8ff],
      [380, 350, 1.4, 0xfff8a0],
    ];
    for (const [fx, fy, fr, color] of fireflies) {
      flyG.fillStyle(0x040a05, 1);
      flyG.fillCircle(fx, fy, fr + 0.8);
      flyG.fillStyle(color, 1);
      flyG.fillCircle(fx, fy, fr);
      flyG.fillStyle(0xffffff, 0.95);
      flyG.fillRect(fx, fy - 1, 1, 1);
    }
    this.tweens.add({
      targets: flyG,
      alpha: { from: 0.85, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 16) Vignette overlay.
    this.paintEdgeVignette(container, w, h);
    this.paintBorderFrame(container, 0x4ad8ff, 0.55);

    // 17) Boss HP bar.
    this.paintBossHpBar(originX + w / 2, originY - 18, w * 0.55, {
      label: 'TOAD SOVEREIGN',
      fill: 0x4ad8ff,
      highlight: 0xc0f0ff,
      labelColor: '#eafcff',
      strokeColor: '#02101a',
    });
  }

  // ---------------------------------------------------------------------------
  // PAGE 3 — Onyx Mansion showcase (Wizard vs. Lord Onyx)
  //
  // Designed from scratch since Onyx Mansion isn't built yet — palette,
  // walls, decorations, mobs, and boss are all painted procedurally so this
  // mockup serves as a design proposal for Phase 5 Chunk 4.
  // ---------------------------------------------------------------------------

  private paintShowcaseOnyx(): void {
    const w = 14 * TILE_SIZE;
    const h = 7 * TILE_SIZE;
    const originX = (GAME_WIDTH - w) / 2;
    const originY = 100;
    const container = this.add.container(originX, originY);

    // 1) Floor — ornate parquet with amethyst vignette.
    const floorG = this.add.graphics();
    container.add(floorG);
    floorG.fillStyle(0x0a0410, 1);
    floorG.fillRect(0, 0, w, h);
    const fcx = w / 2;
    const fcy = h / 2 + 20;
    const onyxVignette: ReadonlyArray<readonly [number, number, number, number]> = [
      [w * 0.78, h * 0.78, 0x140820, 1],
      [w * 0.66, h * 0.66, 0x1c0e2c, 1],
      [w * 0.54, h * 0.54, 0x261438, 1],
      [w * 0.42, h * 0.42, 0x301a44, 1],
      [w * 0.28, h * 0.28, 0x402060, 0.65],
      [w * 0.16, h * 0.16, 0x583088, 0.42],
    ];
    for (const [rx, ry, color, alpha] of onyxVignette) {
      floorG.fillStyle(color, alpha);
      floorG.fillEllipse(fcx, fcy, rx * 2, ry * 2);
    }

    // 2) Parquet planks — diagonal wood pattern with gold inlay seams.
    const parquetG = this.add.graphics();
    container.add(parquetG);
    parquetG.fillStyle(0x140820, 0.55);
    // Diagonal seam grid (45°)
    for (let i = -h; i < w + h; i += 28) {
      parquetG.fillRect(i, 0, 1, h * 2);
    }
    // Counter-diagonal
    parquetG.fillStyle(0x261438, 0.4);
    for (let i = 0; i < w + h; i += 28) {
      parquetG.fillTriangle(i, 0, i + 4, 0, i, 4);
    }
    // Sparse gold inlay specks
    parquetG.fillStyle(0xffd84a, 0.5);
    const inlayRng = new RNG('onyx-inlay');
    for (let i = 0; i < 24; i++) {
      const ix = inlayRng.intBetween(60, w - 60);
      const iy = inlayRng.intBetween(80, h - 80);
      parquetG.fillRect(ix, iy, 2, 1);
      parquetG.fillRect(ix + 2, iy + 1, 1, 1);
    }
    // Shimmer pixels
    parquetG.fillStyle(0xfff8c0, 0.6);
    for (let i = 0; i < 40; i++) {
      const sx = inlayRng.intBetween(60, w - 60);
      const sy = inlayRng.intBetween(80, h - 80);
      parquetG.fillRect(sx, sy, 1, 1);
    }

    // 3) Top wall — stone vault with hanging chandelier.
    const vaultG = this.add.graphics();
    container.add(vaultG);
    vaultG.fillStyle(0x040208, 1);
    vaultG.fillRect(0, 0, w, 30);
    vaultG.fillStyle(0x18102a, 1);
    vaultG.fillRect(0, 0, w, 26);
    // Stone-brick pattern (top wall edge)
    vaultG.fillStyle(0x261438, 1);
    for (let bx = 0; bx < w; bx += 40) {
      vaultG.fillRect(bx + 2, 4, 36, 8);
      vaultG.fillRect(bx + 22, 14, 36, 8);
    }
    vaultG.fillStyle(0x402060, 0.7);
    for (let bx = 0; bx < w; bx += 40) {
      vaultG.fillRect(bx + 2, 4, 36, 1);
      vaultG.fillRect(bx + 22, 14, 36, 1);
    }
    // Gothic moldings — gold trim line
    vaultG.fillStyle(0x8a5a18, 1);
    vaultG.fillRect(0, 28, w, 2);
    vaultG.fillStyle(0xffd84a, 0.85);
    vaultG.fillRect(0, 28, w, 1);
    // Chandelier centered above the room
    this.paintChandelier(container, w / 2, 56);
    // Wall sconces
    const sconces = [180, 380, 580, 780];
    for (const sx of sconces) {
      this.paintWallSconce(container, sx, 38);
    }

    // 4) Bottom wall — red velvet runner edge.
    const bottomG = this.add.graphics();
    container.add(bottomG);
    bottomG.fillStyle(0x040208, 1);
    bottomG.fillRect(0, h - 56, w, 56);
    bottomG.fillStyle(0x180a18, 1);
    bottomG.fillRect(0, h - 54, w, 52);
    bottomG.fillStyle(0x402030, 1);
    bottomG.fillRect(0, h - 50, w, 8);
    // Velvet runner highlight
    bottomG.fillStyle(0x6a2840, 1);
    bottomG.fillRect(0, h - 50, w, 2);
    bottomG.fillStyle(0xa84860, 0.65);
    bottomG.fillRect(0, h - 50, w, 1);
    // Gold trim
    bottomG.fillStyle(0x8a5a18, 1);
    bottomG.fillRect(0, h - 42, w, 1);
    bottomG.fillStyle(0xffd84a, 0.7);
    for (let x = 0; x < w; x += 12) {
      bottomG.fillRect(x, h - 42, 6, 1);
    }
    // Tassels — small pendant shapes
    bottomG.fillStyle(0xffd84a, 0.85);
    for (let x = 12; x < w; x += 60) {
      bottomG.fillTriangle(x - 2, h - 40, x + 2, h - 40, x, h - 36);
    }

    // 5) Side walls — tall stone columns with portraits.
    const sideG = this.add.graphics();
    container.add(sideG);
    for (const sx of [0, w - 40]) {
      sideG.fillStyle(0x040208, 1);
      sideG.fillRect(sx, 30, 40, h - 86);
      sideG.fillStyle(0x18102a, 1);
      sideG.fillRect(sx + 2, 30, 36, h - 86);
      // Brick courses
      sideG.fillStyle(0x261438, 0.85);
      for (let by = 32; by < h - 60; by += 22) {
        sideG.fillRect(sx + 4, by, 30, 8);
      }
      sideG.fillStyle(0x402060, 0.65);
      for (let by = 32; by < h - 60; by += 22) {
        sideG.fillRect(sx + 4, by, 30, 1);
      }
      // Inner-edge gold molding
      const hiX = sx === 0 ? sx + 36 : sx + 2;
      sideG.fillStyle(0x8a5a18, 1);
      sideG.fillRect(hiX, 32, 2, h - 88);
      sideG.fillStyle(0xffd84a, 0.85);
      sideG.fillRect(hiX, 32, 1, h - 88);
    }
    // Portraits — gilt frames with painted figures
    this.paintPortrait(container, 20, 110);
    this.paintPortrait(container, w - 20, 110);
    this.paintPortrait(container, 20, 270);
    this.paintPortrait(container, w - 20, 270);

    // 6) Light shafts — warm candle-light beams from sconces.
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0xffd84a, 0.05);
    this.fillSlantedBand(lightG, 200, 38, 80, h - 80, 70);
    lightG.fillStyle(0xfff8a0, 0.06);
    this.fillSlantedBand(lightG, 600, 38, 80, h - 80, 110);

    // 7) Decorations — broken column, candelabrum stands, vase.
    this.paintBrokenColumn(container, 100, 170);
    this.paintCandelabrum(container, 280, 200);
    this.paintCandelabrum(container, w - 220, 180);
    this.paintCrackedVase(container, w - 110, 350);
    this.paintCrackedVase(container, 130, 360);

    // 8) Item Pedestal with floating Onyx Crown (mockup item).
    const pedestalX = 460;
    const pedestalY = 320;
    const altarG = this.add.graphics();
    altarG.fillStyle(0xffd84a, 0.18);
    altarG.fillEllipse(pedestalX, pedestalY + 22, 76, 26);
    altarG.fillStyle(0xfff8a0, 0.30);
    altarG.fillEllipse(pedestalX, pedestalY + 22, 50, 18);
    container.add(altarG);
    const pedestal = this.add.image(pedestalX, pedestalY, TextureKeys.ItemPedestal);
    container.add(pedestal);
    // Onyx Crown (painted, no texture). Halo is amethyst.
    const crownHaloG = this.add.graphics();
    crownHaloG.fillStyle(0xc864ff, 0.18);
    crownHaloG.fillCircle(pedestalX, pedestalY - 12, 28);
    crownHaloG.fillStyle(0xc864ff, 0.32);
    crownHaloG.fillCircle(pedestalX, pedestalY - 12, 18);
    container.add(crownHaloG);
    const crown = this.add.graphics();
    container.add(crown);
    this.drawOnyxCrownIcon(crown, pedestalX, pedestalY - 12);
    this.tweens.add({
      targets: crown,
      y: { from: 0, to: -6 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 9) Drops scattered.
    const drops: Array<{ key: string; x: number; y: number }> = [
      { key: TextureKeys.HeartFull, x: 360, y: 380 },
      { key: TextureKeys.Coin, x: 410, y: 400 },
      { key: TextureKeys.Coin, x: 530, y: 395 },
      { key: TextureKeys.Key, x: 580, y: 372 },
    ];
    for (const drop of drops) {
      const haloG = this.add.graphics();
      const haloColor = drop.key === TextureKeys.HeartFull ? 0xff5577 : drop.key === TextureKeys.Coin ? 0xffd84a : 0xc0eaff;
      haloG.fillStyle(haloColor, 0.18);
      haloG.fillEllipse(drop.x, drop.y + 6, 22, 8);
      haloG.fillStyle(haloColor, 0.32);
      haloG.fillEllipse(drop.x, drop.y + 6, 12, 4);
      container.add(haloG);
      const img = this.add.image(drop.x, drop.y, drop.key);
      container.add(img);
    }

    // 10) Mansion mobs (painted) — Wraith, Possessed Candelabra, Cursed Mirror.
    this.paintWraith(container, 360, 200);
    this.paintWraith(container, 560, 240);
    this.paintPossessedCandelabra(container, 700, 360);
    this.paintCursedMirror(container, 180, 320);

    // 11) Wizard.
    const wizardX = 200;
    const wizardY = 280;
    const wizAuraG = this.add.graphics();
    wizAuraG.fillStyle(0x88c060, 0.12);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 80, 22);
    wizAuraG.fillStyle(0x4ea656, 0.20);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 56, 16);
    wizAuraG.fillStyle(0xb0e890, 0.26);
    wizAuraG.fillEllipse(wizardX, wizardY + 30, 32, 8);
    container.add(wizAuraG);
    const wizard = this.add.image(wizardX, wizardY, TextureKeys.Player);
    wizard.setScale(1.4);
    wizard.setRotation(-0.06);
    container.add(wizard);

    // 12) Lord Onyx — final boss, painted.
    const onyxX = w - 200;
    const onyxY = 240;
    const lordHaloG = this.add.graphics();
    lordHaloG.fillStyle(0xc864ff, 0.10);
    lordHaloG.fillCircle(onyxX, onyxY, 110);
    lordHaloG.fillStyle(0xc864ff, 0.16);
    lordHaloG.fillCircle(onyxX, onyxY, 76);
    lordHaloG.fillStyle(0xff64ff, 0.20);
    lordHaloG.fillCircle(onyxX, onyxY, 48);
    container.add(lordHaloG);
    const lord = this.add.graphics();
    container.add(lord);
    this.drawLordOnyx(lord, onyxX, onyxY);
    this.tweens.add({
      targets: lord,
      y: { from: 0, to: -6 },
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 13) Combat — magic missile arc + Lord Onyx's amethyst-shard volley.
    const combatG = this.add.graphics();
    container.add(combatG);
    const wandX = wizardX + 30;
    const wandY = wizardY - 20;
    const lordChestX = onyxX - 40;
    const lordChestY = onyxY + 6;
    const ctrlX = (wandX + lordChestX) / 2;
    const ctrlY = Math.min(wandY, lordChestY) - 80;
    const beads = 6;
    for (let i = 0; i < beads; i++) {
      const t = (i + 1) / (beads + 1);
      const px = quadBezier(wandX, ctrlX, lordChestX, t);
      const py = quadBezier(wandY, ctrlY, lordChestY, t);
      const alpha = 0.4 + (i / (beads - 1)) * 0.55;
      const radius = 3 + (i / (beads - 1)) * 5;
      combatG.fillStyle(0xc0eaff, alpha * 0.4);
      combatG.fillCircle(px, py, radius * 1.6);
      combatG.fillStyle(0xeaffff, alpha);
      combatG.fillCircle(px, py, radius);
      combatG.fillStyle(0xffffff, alpha);
      combatG.fillRect(px, py - 1, 1, 1);
    }
    // Lord Onyx amethyst shards flying toward the wizard.
    const shards: ReadonlyArray<readonly [number, number]> = [
      [onyxX - 100, onyxY - 30],
      [onyxX - 170, onyxY + 30],
      [onyxX - 240, onyxY + 80],
    ];
    for (const [sx, sy] of shards) {
      // Shard body — small dark diamond
      combatG.fillStyle(0x040208, 1);
      combatG.fillTriangle(sx + 12, sy - 6, sx + 12, sy + 6, sx - 8, sy);
      combatG.fillStyle(0xc864ff, 1);
      combatG.fillTriangle(sx + 10, sy - 4, sx + 10, sy + 4, sx - 6, sy);
      combatG.fillStyle(0xff64ff, 0.9);
      combatG.fillTriangle(sx + 6, sy - 2, sx + 6, sy + 2, sx - 2, sy);
      combatG.fillStyle(0xffffff, 1);
      combatG.fillRect(sx + 2, sy - 1, 1, 1);
      // Tracer streak
      combatG.fillStyle(0xc864ff, 0.55);
      combatG.fillRect(sx + 12, sy - 1, 26, 2);
      combatG.fillStyle(0xff64ff, 0.30);
      combatG.fillRect(sx + 38, sy - 1, 30, 2);
    }

    // 14) Mist bands — purple-tinted dust drift.
    const mistG = this.add.graphics();
    container.add(mistG);
    mistG.fillStyle(0xc8a0e0, 0.06);
    mistG.fillRect(0, h - 130, w, 14);
    mistG.fillStyle(0xc8a0e0, 0.08);
    mistG.fillRect(0, h - 100, w, 8);
    mistG.fillStyle(0xc8a0e0, 0.05);
    mistG.fillRect(0, h - 78, w, 12);

    // 15) Dust motes / candle sparks instead of fireflies.
    const moteG = this.add.graphics();
    container.add(moteG);
    const motes: ReadonlyArray<readonly [number, number, number, number]> = [
      [80, 140, 1.6, 0xffd84a],
      [180, 100, 1.4, 0xfff8c0],
      [320, 90, 1.8, 0xc864ff],
      [430, 130, 1.4, 0xffd84a],
      [560, 100, 1.6, 0xfff8c0],
      [680, 140, 1.4, 0xc864ff],
      [w - 80, 90, 1.6, 0xffd84a],
      [w - 200, 110, 1.4, 0xfff8c0],
      [60, 250, 1.8, 0xc864ff],
      [310, 250, 1.4, 0xffd84a],
      [800, 230, 1.2, 0xfff8c0],
      [120, 360, 1.6, 0xc864ff],
      [440, 250, 1.4, 0xffd84a],
      [620, 290, 1.2, 0xc864ff],
      [770, 380, 1.4, 0xfff8c0],
      [380, 350, 1.2, 0xffd84a],
    ];
    for (const [fx, fy, fr, color] of motes) {
      moteG.fillStyle(0x040208, 1);
      moteG.fillCircle(fx, fy, fr + 0.8);
      moteG.fillStyle(color, 1);
      moteG.fillCircle(fx, fy, fr);
      moteG.fillStyle(0xffffff, 0.9);
      moteG.fillRect(fx, fy - 1, 1, 1);
    }
    this.tweens.add({
      targets: moteG,
      alpha: { from: 0.85, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 16) Vignette overlay.
    this.paintEdgeVignette(container, w, h);
    this.paintBorderFrame(container, 0xc864ff, 0.55);

    // 17) Boss HP bar.
    this.paintBossHpBar(originX + w / 2, originY - 18, w * 0.55, {
      label: 'LORD ONYX',
      fill: 0xc864ff,
      highlight: 0xff64ff,
      labelColor: '#f0d8ff',
      strokeColor: '#1a0828',
    });
  }

  // ---------------------------------------------------------------------------
  // Onyx Mansion painted assets — boss, mobs, props, decor.
  //
  // The Onyx Mansion has no in-game textures yet; everything below is
  // drawn directly into Graphics objects so the showcase can stand in
  // for "what the floor will feel like" before art exists.
  // ---------------------------------------------------------------------------

  private paintChandelier(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Chain
    g.fillStyle(0x402030, 1);
    g.fillRect(cx, 0, 2, cy - 16);
    // Halo
    g.fillStyle(0xffd84a, 0.16);
    g.fillCircle(cx, cy, 60);
    g.fillStyle(0xfff8a0, 0.22);
    g.fillCircle(cx, cy, 36);
    // Frame ring
    g.lineStyle(2, 0x8a5a18, 1);
    g.strokeCircle(cx, cy, 28);
    g.lineStyle(1, 0xffd84a, 0.85);
    g.strokeCircle(cx, cy, 28);
    // Candle stems around the ring
    const candles = 6;
    for (let i = 0; i < candles; i++) {
      const a = (i / candles) * Math.PI * 2;
      const px = cx + Math.cos(a) * 28;
      const py = cy + Math.sin(a) * 28;
      g.fillStyle(0xfff8c0, 1);
      g.fillRect(px - 1, py - 6, 2, 6);
      g.fillStyle(0xffd84a, 1);
      g.fillTriangle(px, py - 12, px - 2, py - 6, px + 2, py - 6);
      g.fillStyle(0xfff8a0, 1);
      g.fillRect(px, py - 9, 1, 2);
    }
  }

  private paintWallSconce(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xffd84a, 0.18);
    g.fillCircle(cx, cy, 14);
    g.fillStyle(0xfff8a0, 0.28);
    g.fillCircle(cx, cy, 8);
    // Wall mount
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 4, cy - 2, 8, 6);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 3, cy - 2, 6, 1);
    // Candle
    g.fillStyle(0xfff8c0, 1);
    g.fillRect(cx - 1, cy - 8, 2, 6);
    // Flame
    g.fillStyle(0xffd84a, 1);
    g.fillTriangle(cx, cy - 14, cx - 2, cy - 8, cx + 2, cy - 8);
    g.fillStyle(0xfff8a0, 1);
    g.fillRect(cx, cy - 12, 1, 3);
  }

  private paintPortrait(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Frame
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 14, cy - 18, 28, 36);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 13, cy - 17, 26, 34);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 13, cy - 17, 26, 1);
    g.fillRect(cx - 13, cy + 16, 26, 1);
    g.fillRect(cx - 13, cy - 17, 1, 33);
    g.fillRect(cx + 12, cy - 17, 1, 33);
    // Canvas
    g.fillStyle(0x18102a, 1);
    g.fillRect(cx - 11, cy - 15, 22, 30);
    // Sketchy figure — head + shoulders silhouette
    g.fillStyle(0x402060, 1);
    g.fillCircle(cx, cy - 4, 4);
    g.fillTriangle(cx - 8, cy + 14, cx + 8, cy + 14, cx, cy + 2);
    // Glowing red eyes
    g.fillStyle(0xff5577, 1);
    g.fillRect(cx - 2, cy - 5, 1, 1);
    g.fillRect(cx + 1, cy - 5, 1, 1);
  }

  private paintBrokenColumn(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xc864ff, 0.10);
    g.fillEllipse(cx, cy + 16, 50, 18);
    g.fillStyle(0x4ea656, 0.16);
    g.fillEllipse(cx, cy + 16, 30, 12);
    // Base
    g.fillStyle(0x180a18, 1);
    g.fillRect(cx - 14, cy + 10, 28, 8);
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 12, cy + 10, 24, 2);
    // Shaft (broken at top)
    g.fillStyle(0x261438, 1);
    g.fillRect(cx - 8, cy - 18, 16, 28);
    g.fillStyle(0x402060, 1);
    g.fillRect(cx - 7, cy - 18, 2, 28);
    g.fillStyle(0x140820, 1);
    g.fillRect(cx + 5, cy - 18, 2, 28);
    // Jagged break — replace the top row with diagonal jags
    g.fillStyle(0x0a0410, 1);
    g.fillTriangle(cx - 8, cy - 18, cx - 4, cy - 22, cx, cy - 18);
    g.fillTriangle(cx, cy - 18, cx + 4, cy - 14, cx + 8, cy - 18);
    // Cracked rubble scattered
    g.fillStyle(0x261438, 1);
    g.fillRect(cx + 16, cy + 14, 4, 3);
    g.fillRect(cx - 22, cy + 16, 5, 2);
  }

  private paintCandelabrum(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xffd84a, 0.16);
    g.fillEllipse(cx, cy + 14, 44, 16);
    g.fillStyle(0xfff8a0, 0.22);
    g.fillEllipse(cx, cy + 14, 24, 10);
    // Stand
    g.fillStyle(0x261438, 1);
    g.fillRect(cx - 10, cy + 10, 20, 4);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 8, cy + 9, 16, 2);
    // Stem
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 1, cy - 14, 2, 24);
    // Arms
    g.fillRect(cx - 10, cy - 12, 20, 1);
    g.fillRect(cx - 10, cy - 12, 1, 6);
    g.fillRect(cx + 9, cy - 12, 1, 6);
    // 3 candles
    for (const px of [cx - 10, cx, cx + 10]) {
      g.fillStyle(0xfff8c0, 1);
      g.fillRect(px - 1, cy - 18, 2, 6);
      g.fillStyle(0xffd84a, 1);
      g.fillTriangle(px, cy - 24, px - 2, cy - 18, px + 2, cy - 18);
      g.fillStyle(0xfff8a0, 1);
      g.fillRect(px, cy - 22, 1, 2);
    }
  }

  private paintCrackedVase(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xc864ff, 0.10);
    g.fillEllipse(cx, cy + 12, 38, 14);
    g.fillStyle(0xc864ff, 0.18);
    g.fillEllipse(cx, cy + 12, 22, 8);
    // Vase body
    g.fillStyle(0x140820, 1);
    g.fillEllipse(cx, cy, 22, 28);
    g.fillStyle(0x261438, 1);
    g.fillEllipse(cx, cy, 18, 24);
    g.fillStyle(0x402060, 1);
    g.fillEllipse(cx - 4, cy - 4, 6, 12);
    // Gold trim
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 8, cy - 12, 16, 1);
    g.fillRect(cx - 6, cy + 10, 12, 1);
    // Crack — jagged line
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 1, cy - 8, 1, 4);
    g.fillRect(cx, cy - 4, 1, 4);
    g.fillRect(cx - 1, cy, 1, 4);
    g.fillRect(cx, cy + 4, 1, 4);
  }

  private paintWraith(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xc864ff, 0.16);
    g.fillEllipse(cx, cy + 18, 42, 16);
    // Tattered robe — wispy bottom
    g.fillStyle(0x180a28, 0.88);
    g.fillTriangle(cx - 12, cy + 10, cx + 12, cy + 10, cx, cy - 12);
    g.fillStyle(0x261438, 0.82);
    g.fillTriangle(cx - 14, cy + 14, cx - 2, cy + 4, cx - 8, cy);
    g.fillTriangle(cx + 14, cy + 14, cx + 2, cy + 4, cx + 8, cy);
    // Tattered fringe
    g.fillStyle(0x180a28, 0.7);
    for (let i = -10; i <= 10; i += 4) {
      g.fillRect(cx + i, cy + 10, 2, 4);
    }
    // Hood
    g.fillStyle(0x0a0418, 1);
    g.fillEllipse(cx, cy - 8, 20, 18);
    g.fillStyle(0x180a28, 1);
    g.fillEllipse(cx, cy - 8, 16, 14);
    // Glowing eyes
    g.fillStyle(0xff5577, 1);
    g.fillRect(cx - 4, cy - 9, 2, 2);
    g.fillRect(cx + 2, cy - 9, 2, 2);
    g.fillStyle(0xffaad8, 1);
    g.fillRect(cx - 4, cy - 9, 1, 1);
    g.fillRect(cx + 2, cy - 9, 1, 1);
  }

  private paintPossessedCandelabra(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xffd84a, 0.16);
    g.fillEllipse(cx, cy + 16, 50, 18);
    g.fillStyle(0xff7a30, 0.22);
    g.fillEllipse(cx, cy + 16, 30, 12);
    // Skull base — staring upward
    g.fillStyle(0x261438, 1);
    g.fillEllipse(cx, cy + 8, 18, 10);
    g.fillStyle(0xe0d0c0, 1);
    g.fillEllipse(cx, cy + 6, 14, 10);
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 4, cy + 4, 2, 2);
    g.fillRect(cx + 2, cy + 4, 2, 2);
    g.fillStyle(0xff5577, 1);
    g.fillRect(cx - 4, cy + 4, 1, 1);
    g.fillRect(cx + 2, cy + 4, 1, 1);
    // Spine (stem)
    g.fillStyle(0xe0d0c0, 1);
    g.fillRect(cx - 1, cy - 10, 2, 14);
    // Arms — bone-y
    g.fillRect(cx - 10, cy - 8, 20, 1);
    g.fillRect(cx - 10, cy - 8, 1, 4);
    g.fillRect(cx + 9, cy - 8, 1, 4);
    // 3 candles with fire
    for (const px of [cx - 10, cx, cx + 10]) {
      g.fillStyle(0xfff8c0, 1);
      g.fillRect(px - 1, cy - 14, 2, 6);
      g.fillStyle(0xffd84a, 1);
      g.fillTriangle(px, cy - 22, px - 3, cy - 14, px + 3, cy - 14);
      g.fillStyle(0xff7a30, 1);
      g.fillTriangle(px, cy - 20, px - 2, cy - 14, px + 2, cy - 14);
      g.fillStyle(0xfff8a0, 1);
      g.fillRect(px, cy - 18, 1, 2);
    }
  }

  private paintCursedMirror(
    container: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
  ): void {
    const g = this.add.graphics();
    container.add(g);
    // Halo
    g.fillStyle(0xc864ff, 0.16);
    g.fillEllipse(cx, cy + 16, 40, 16);
    // Stand
    g.fillStyle(0x261438, 1);
    g.fillRect(cx - 10, cy + 10, 20, 4);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 8, cy + 10, 16, 1);
    // Frame
    g.fillStyle(0x402030, 1);
    g.fillEllipse(cx, cy - 4, 22, 30);
    g.fillStyle(0x8a5a18, 1);
    g.fillEllipse(cx, cy - 4, 20, 28);
    g.lineStyle(1, 0xffd84a, 1);
    g.strokeEllipse(cx, cy - 4, 20, 28);
    // Mirror surface — dark with gradient
    g.fillStyle(0x0a0410, 1);
    g.fillEllipse(cx, cy - 4, 16, 24);
    g.fillStyle(0x261438, 0.85);
    g.fillEllipse(cx - 2, cy - 6, 6, 12);
    g.fillStyle(0xc864ff, 0.45);
    g.fillEllipse(cx + 2, cy - 8, 4, 6);
    // Cracks
    g.lineStyle(1, 0xc0c0c0, 0.85);
    g.lineBetween(cx - 4, cy - 12, cx + 2, cy + 4);
    g.lineBetween(cx + 2, cy + 4, cx - 6, cy + 8);
    g.lineBetween(cx - 1, cy - 8, cx + 4, cy - 2);
  }

  private drawOnyxCrownIcon(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    // Gold band
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 12, cy + 4, 24, 4);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 11, cy + 4, 22, 4);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 11, cy + 4, 22, 1);
    // 5 spires — center tallest
    const spires = [
      { x: -10, h: 4 },
      { x: -5, h: 6 },
      { x: 0, h: 9 },
      { x: 5, h: 6 },
      { x: 10, h: 4 },
    ];
    for (const s of spires) {
      g.fillStyle(0x402030, 1);
      g.fillTriangle(cx + s.x - 2, cy + 4, cx + s.x + 2, cy + 4, cx + s.x, cy + 4 - s.h - 1);
      g.fillStyle(0x8a5a18, 1);
      g.fillTriangle(cx + s.x - 1, cy + 4, cx + s.x + 1, cy + 4, cx + s.x, cy + 4 - s.h);
    }
    // Center amethyst gem on the band
    g.fillStyle(0x040208, 1);
    g.fillTriangle(cx - 4, cy + 4, cx + 4, cy + 4, cx, cy);
    g.fillStyle(0xc864ff, 1);
    g.fillTriangle(cx - 3, cy + 4, cx + 3, cy + 4, cx, cy + 1);
    g.fillStyle(0xff64ff, 1);
    g.fillRect(cx - 1, cy + 2, 2, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx, cy + 2, 1, 1);
  }

  private drawLordOnyx(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    // Cloak shadow on the ground
    g.fillStyle(0x040208, 0.55);
    g.fillEllipse(cx, cy + 56, 68, 18);
    // Cloak body — tall trapezoidal silhouette
    g.fillStyle(0x140820, 1);
    g.fillTriangle(cx - 36, cy + 50, cx + 36, cy + 50, cx + 24, cy - 30);
    g.fillTriangle(cx - 36, cy + 50, cx - 24, cy - 30, cx + 24, cy - 30);
    // Inner shadow
    g.fillStyle(0x261438, 1);
    g.fillTriangle(cx - 28, cy + 46, cx + 28, cy + 46, cx + 18, cy - 24);
    g.fillTriangle(cx - 28, cy + 46, cx - 18, cy - 24, cx + 18, cy - 24);
    // Highlight strip on the right side of the cloak
    g.fillStyle(0x402060, 1);
    g.fillTriangle(cx + 14, cy + 44, cx + 22, cy + 44, cx + 14, cy - 22);
    // Cloak fringe at the bottom — wavy edge
    for (let i = -36; i <= 36; i += 8) {
      g.fillStyle(0x140820, 1);
      g.fillTriangle(cx + i - 4, cy + 50, cx + i + 4, cy + 50, cx + i, cy + 56);
    }
    // Gold cloak trim
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 24, cy - 30, 48, 1);
    // Robe collar
    g.fillStyle(0x402030, 1);
    g.fillTriangle(cx - 14, cy - 30, cx + 14, cy - 30, cx, cy - 12);
    g.fillStyle(0xffd84a, 0.85);
    g.fillRect(cx - 12, cy - 30, 24, 1);
    // Pale face
    g.fillStyle(0xe0d0e0, 1);
    g.fillEllipse(cx, cy - 36, 16, 22);
    g.fillStyle(0xc8a8c0, 1);
    g.fillEllipse(cx + 4, cy - 32, 6, 12);
    // Eye sockets — sunken with glowing red eyes
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 5, cy - 38, 4, 3);
    g.fillRect(cx + 1, cy - 38, 4, 3);
    g.fillStyle(0xff3344, 1);
    g.fillRect(cx - 4, cy - 37, 2, 1);
    g.fillRect(cx + 2, cy - 37, 2, 1);
    g.fillStyle(0xffaad8, 1);
    g.fillRect(cx - 4, cy - 37, 1, 1);
    g.fillRect(cx + 2, cy - 37, 1, 1);
    // Mouth — thin grim line
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 3, cy - 30, 6, 1);
    // Hair / shadow under the crown
    g.fillStyle(0x0a0410, 1);
    g.fillRect(cx - 8, cy - 46, 16, 2);
    // Crown (spires + central amethyst, larger version of the icon)
    g.fillStyle(0x402030, 1);
    g.fillRect(cx - 14, cy - 50, 28, 4);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx - 13, cy - 50, 26, 4);
    g.fillStyle(0xffd84a, 1);
    g.fillRect(cx - 13, cy - 50, 26, 1);
    const spires = [
      { x: -12, h: 5 },
      { x: -6, h: 8 },
      { x: 0, h: 12 },
      { x: 6, h: 8 },
      { x: 12, h: 5 },
    ];
    for (const s of spires) {
      g.fillStyle(0x402030, 1);
      g.fillTriangle(cx + s.x - 2, cy - 50, cx + s.x + 2, cy - 50, cx + s.x, cy - 50 - s.h - 1);
      g.fillStyle(0x8a5a18, 1);
      g.fillTriangle(cx + s.x - 1, cy - 50, cx + s.x + 1, cy - 50, cx + s.x, cy - 50 - s.h);
    }
    // Central amethyst
    g.fillStyle(0x040208, 1);
    g.fillTriangle(cx - 5, cy - 50, cx + 5, cy - 50, cx, cy - 56);
    g.fillStyle(0xc864ff, 1);
    g.fillTriangle(cx - 4, cy - 50, cx + 4, cy - 50, cx, cy - 55);
    g.fillStyle(0xff64ff, 1);
    g.fillRect(cx - 1, cy - 52, 2, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx, cy - 53, 1, 1);
    // Scepter in his right hand — long staff with amethyst orb
    g.fillStyle(0x402030, 1);
    g.fillRect(cx + 22, cy - 18, 3, 60);
    g.fillStyle(0x8a5a18, 1);
    g.fillRect(cx + 22, cy - 18, 1, 60);
    // Scepter orb
    g.fillStyle(0xc864ff, 0.32);
    g.fillCircle(cx + 24, cy - 22, 12);
    g.fillStyle(0x040208, 1);
    g.fillCircle(cx + 24, cy - 22, 7);
    g.fillStyle(0xc864ff, 1);
    g.fillCircle(cx + 24, cy - 22, 5);
    g.fillStyle(0xff64ff, 0.95);
    g.fillCircle(cx + 24, cy - 22, 2.5);
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx + 24, cy - 23, 1, 1);
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  /** Cinematic edge-vignette overlay shared by all showcase pages. */
  private paintEdgeVignette(
    container: Phaser.GameObjects.Container,
    w: number,
    h: number,
  ): void {
    const vignG = this.add.graphics();
    container.add(vignG);
    for (let i = 0; i < 22; i++) {
      const a = 0.30 - i * 0.012;
      vignG.fillStyle(0x000000, Math.max(0, a));
      vignG.fillRect(i, i, w - i * 2, 1);
      vignG.fillRect(i, h - i - 1, w - i * 2, 1);
      vignG.fillRect(i, i, 1, h - i * 2);
      vignG.fillRect(w - i - 1, i, 1, h - i * 2);
    }
  }

  /** Top-mounted boss-style HP bar, painted with stylized fill + frame. */
  private paintBossHpBar(
    cx: number,
    cy: number,
    width: number,
    style: {
      label: string;
      fill: number;
      highlight: number;
      labelColor: string;
      strokeColor: string;
    },
  ): void {
    const height = 14;
    const fillPercent = 0.62;
    const frameG = this.add.graphics();
    frameG.fillStyle(0x000000, 0.55);
    frameG.fillRect(cx - width / 2 - 3, cy - height / 2 - 3, width + 6, height + 6);
    frameG.fillStyle(0x1a0828, 1);
    frameG.fillRect(cx - width / 2, cy - height / 2, width, height);
    frameG.fillStyle(style.fill, 0.85);
    frameG.fillRect(cx - width / 2 + 2, cy - height / 2 + 2, (width - 4) * fillPercent, height - 4);
    frameG.fillStyle(style.highlight, 0.85);
    frameG.fillRect(cx - width / 2 + 2, cy - height / 2 + 2, (width - 4) * fillPercent, 2);
    frameG.lineStyle(2, style.fill, 0.85);
    frameG.strokeRect(cx - width / 2, cy - height / 2, width, height);

    this.add
      .text(cx, cy - height - 6, style.label, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: style.labelColor,
        stroke: style.strokeColor,
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Decorative outline frame around a half so its bounds read clearly. */
  private paintBorderFrame(
    container: Phaser.GameObjects.Container,
    color: number,
    alpha: number,
  ): void {
    const g = this.add.graphics();
    g.lineStyle(2, color, alpha);
    g.strokeRect(0, 0, StyleMockupScene.NATIVE_W, StyleMockupScene.NATIVE_H);
    container.add(g);
  }

  /** Paint a rotated rectangular band — used for diagonal light shafts. */
  private fillSlantedBand(
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

  // ---------------------------------------------------------------------------
  // Layout (deterministic — both sides paint the exact same composition)
  // ---------------------------------------------------------------------------

  private static dimsTiles(): { tilesW: number; tilesH: number } {
    return {
      tilesW: StyleMockupScene.MOCK_TILES_W,
      tilesH: StyleMockupScene.MOCK_TILES_H,
    };
  }

  private static computeLayout(): {
    floorVariants: number[];
    decorations: Array<{ kind: 'tree' | 'rock' | 'mushroom'; x: number; y: number }>;
  } {
    const tilesW = StyleMockupScene.MOCK_TILES_W;
    const tilesH = StyleMockupScene.MOCK_TILES_H;
    const theme = FLOORS[StyleMockupScene.FLOOR_ID];
    if (!theme) throw new Error(`Mockup theme ${StyleMockupScene.FLOOR_ID} not in FLOORS`);

    const rng = new RNG('mockup-layout');
    const floorVariants: number[] = new Array(tilesW * tilesH).fill(0);
    for (let ty = 1; ty < tilesH - 1; ty++) {
      for (let tx = 1; tx < tilesW - 1; tx++) {
        floorVariants[ty * tilesW + tx] = rng.intBetween(0, 3);
      }
    }

    const half = TILE_SIZE / 2;
    const decorations: Array<{ kind: 'tree' | 'rock' | 'mushroom'; x: number; y: number }> = [
      { kind: 'tree', x: 1 * TILE_SIZE + half + 4, y: 1 * TILE_SIZE + half - 2 },
      { kind: 'tree', x: 4 * TILE_SIZE + half - 6, y: 1 * TILE_SIZE + half + 4 },
      { kind: 'rock', x: 1 * TILE_SIZE + half, y: 3 * TILE_SIZE + half },
      { kind: 'mushroom', x: 4 * TILE_SIZE + half + 8, y: 3 * TILE_SIZE + half - 6 },
      { kind: 'mushroom', x: 3 * TILE_SIZE + half - 10, y: 2 * TILE_SIZE + half + 12 },
    ];

    return { floorVariants, decorations };
  }
}

/** Quadratic Bézier point on axis: p0 + (p1-p0)·2t(1-t) + (p2-p0)·t². */
function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}
