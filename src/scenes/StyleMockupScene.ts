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

type MockupPage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const PAGE_COUNT = 7;

/**
 * Visual mockup with four pages, switched via TAB:
 *   - Page 0 (Backdrop comparison): left = current Emerald-Forest backdrop
 *     with actual in-game textures, right = painterly re-imagining pulling
 *     Title-Screen-DNA (gradient vignette, atmospheric layering, glow halos,
 *     fireflies, mist) into the same room footprint.
 *   - Page 1 (Emerald showcase): full-screen painterly room with wizard,
 *     Pixie Queen mid-fight, mobs, item pedestal, drops + combat trails.
 *   - Page 2 (Sapphire showcase): same composition recoloured for the
 *     Sapphire Swamp â€” lily pads, mangrove roots, Toad Sovereign, swamp mobs.
 *   - Page 3 (Onyx showcase): final-floor mockup, designed from scratch
 *     since the Onyx Mansion isn't implemented yet â€” gothic mansion
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
          'STYLE MOCKUP â€” EMERALD FOREST',
          `Page 2/${PAGE_COUNT} Â· Wizard vs. Pixie Queen, painted`,
        );
        this.paintShowcaseEmerald();
        break;
      case 2:
        this.paintHeader(
          cx,
          'STYLE MOCKUP â€” SAPPHIRE SWAMP',
          `Page 3/${PAGE_COUNT} Â· Wizard vs. Toad Sovereign, painted`,
        );
        this.paintShowcaseSapphire();
        break;
      case 3:
        this.paintHeader(
          cx,
          'STYLE MOCKUP â€” ONYX MANSION',
          `Page 4/${PAGE_COUNT} Â· Wizard vs. Lord Onyx, painted (final floor)`,
        );
        this.paintShowcaseOnyx();
        break;
      case 4:
        this.paintHeader(
          cx,
          'PRISMARCH VARIANT MOCKUP',
          `Page 5/${PAGE_COUNT} Â· Current vs. 3 design directions`,
        );
        this.paintShowcasePrismarchVariants();
        break;
      case 5:
        this.paintHeader(
          cx,
          'MARQUIS OF MIRAGES â€” DESIGN HISTORY',
          `Page 6/${PAGE_COUNT} Â· Old V2 vs. variants  (A = implemented)`,
        );
        this.paintShowcaseMarquisVariants();
        break;
      case 6:
        this.paintHeader(
          cx,
          'WIZARD SPRITE VARIANT MOCKUP',
          `Page 7/${PAGE_COUNT} Â· Current pixel-art vs. 4 painterly redesigns`,
        );
        this.paintShowcaseWizardVariants();
        break;
    }
    this.paintFooter(cx);
  }

  private paintComparisonPage(cx: number): void {
    this.paintHeader(
      cx,
      'STYLE MOCKUP â€” EMERALD FOREST BACKDROP',
      `Page 1/${PAGE_COUNT} Â· Backdrop comparison`,
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
      .text(cx, GAME_HEIGHT - 40, '[TAB] SWITCH PAGE     Â·     [ESC] OR [M] CLOSE', {
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
      .text(cx, cy, 'â†’', {
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
  // CURRENT â€” actual in-game textures on a 6Ã—5 mini room
  // ---------------------------------------------------------------------------

  private paintCurrent(originX: number, originY: number): void {
    const container = this.add.container(originX, originY);
    const { tilesW, tilesH } = StyleMockupScene.dimsTiles();
    const layout = StyleMockupScene.LAYOUT;
    const themeId = StyleMockupScene.FLOOR_ID;
    const half = TILE_SIZE / 2;

    // Floor tiles (inner 4Ã—3 area)
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
  // PROPOSED â€” painterly re-imagining (Title-Screen-DNA on a top-down room)
  // ---------------------------------------------------------------------------

  private paintProposed(originX: number, originY: number): void {
    const container = this.add.container(originX, originY);
    const w = StyleMockupScene.NATIVE_W;
    const h = StyleMockupScene.NATIVE_H;
    const layout = StyleMockupScene.LAYOUT;
    const half = TILE_SIZE / 2;

    // 1) Base floor â€” radial vignette, warm-green core fading to deep forest.
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

    // 2) Painterly mossy patches â€” scattered 3-tone blobs over the floor.
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

    // 3) Top wall â€” distant-forest canopy band (Title-style, painterly).
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
    // Mid canopy â€” overlapping foliage circles, three tones
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

    // 4) Bottom wall â€” grounded mossy band.
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

    // 5) Side walls â€” vertical bark slivers with a moss-edge highlight.
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

    // 6) Light shafts â€” 2 diagonal warm-green bands from the canopy.
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0x88c060, 0.07);
    this.fillSlantedBand(lightG, 80, 30, 80, h - 60, 60);
    lightG.fillStyle(0xb0e890, 0.08);
    this.fillSlantedBand(lightG, 90, 32, 80, h - 64, 30);
    lightG.fillStyle(0x88c060, 0.06);
    this.fillSlantedBand(lightG, w - 120, 30, 60, h - 60, 70);

    // 7) Decorations â€” actual textures + a glow halo painted underneath.
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

    // 8) Mist bands â€” thin alpha strips across the lower floor.
    const mistG = this.add.graphics();
    container.add(mistG);
    mistG.fillStyle(0xc0eadd, 0.06);
    mistG.fillRect(0, h - 110, w, 12);
    mistG.fillStyle(0xc0eadd, 0.08);
    mistG.fillRect(0, h - 90, w, 6);
    mistG.fillStyle(0xc0eadd, 0.05);
    mistG.fillRect(0, h - 70, w, 10);

    // 9) Fireflies â€” outline + glow + sparkle pixel.
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

    // 10) Vignette overlay â€” final cinematic edge dim.
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
  // PAGE 1 â€” full-screen Wizard-vs-Pixie-Queen showcase, painted
  // ---------------------------------------------------------------------------

  private paintShowcaseEmerald(): void {
    // Native canvas: 14 Ã— 7 tiles = 896 Ã— 448, anchored at (32, 100).
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

    // ---- 3) Top wall â€” Title-style layered canopy -----------------------
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

    // ---- 4) Bottom wall â€” grounded mossy band ---------------------------
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

    // ---- 5) Side walls â€” vertical bark slivers --------------------------
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

    // ---- 13) Combat â€” magic missile arc + thorn volley -----------------
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
  // PAGE 2 â€” Sapphire Swamp showcase (Wizard vs. Toad Sovereign)
  // ---------------------------------------------------------------------------

  private paintShowcaseSapphire(): void {
    const w = 14 * TILE_SIZE;
    const h = 7 * TILE_SIZE;
    const originX = (GAME_WIDTH - w) / 2;
    const originY = 100;
    const container = this.add.container(originX, originY);

    // 1) Floor â€” murky teal pool with sapphire-glow vignette.
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

    // 2) Algae patches â€” teal blobs with cyan highlight pixels.
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

    // 3) Top wall â€” dripping algae from a stone arch (cave-mouth feel).
    const archG = this.add.graphics();
    container.add(archG);
    archG.fillStyle(0x02060a, 1);
    archG.fillRect(0, 0, w, 38);
    archG.fillStyle(0x0a1218, 1);
    archG.fillRect(0, 0, w, 30);
    // Stone arch ridge â€” irregular dome silhouette
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

    // 4) Bottom wall â€” muddy bank with algae fringe.
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

    // 5) Side walls â€” mangrove root pillars with sapphire glow knots.
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

    // 6) Light shafts â€” cool moonlight beams.
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0x4ad8ff, 0.05);
    this.fillSlantedBand(lightG, 120, 38, 100, h - 80, 60);
    lightG.fillStyle(0xc0f0ff, 0.06);
    this.fillSlantedBand(lightG, 130, 40, 80, h - 84, 30);
    lightG.fillStyle(0x4ad8ff, 0.05);
    this.fillSlantedBand(lightG, w - 240, 38, 90, h - 80, 70);

    // 7) Decorations â€” lily pads + mangrove root textures (sapphire variants).
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

    // 10) Sapphire mobs â€” bog frog, snapper bloom, damselfly, bog tortoise.
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

    // 12) Toad Sovereign â€” chunky toad boss with cyan halo.
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

    // 13) Combat â€” magic missile arc + sapphire spit globs.
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
    // Toad spits â€” 3 sapphire-tinted globs flying toward the wizard.
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

    // 15) Fireflies â€” sapphire + cyan with a few warm pricks.
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
  // PAGE 3 â€” Onyx Mansion showcase (Wizard vs. Lord Onyx)
  //
  // Designed from scratch since Onyx Mansion isn't built yet â€” palette,
  // walls, decorations, mobs, and boss are all painted procedurally so this
  // mockup serves as a design proposal for Phase 5 Chunk 4.
  // ---------------------------------------------------------------------------

  private paintShowcaseOnyx(): void {
    const w = 14 * TILE_SIZE;
    const h = 7 * TILE_SIZE;
    const originX = (GAME_WIDTH - w) / 2;
    const originY = 100;
    const container = this.add.container(originX, originY);

    // 1) Floor â€” ornate parquet with amethyst vignette.
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

    // 2) Parquet planks â€” diagonal wood pattern with gold inlay seams.
    const parquetG = this.add.graphics();
    container.add(parquetG);
    parquetG.fillStyle(0x140820, 0.55);
    // Diagonal seam grid (45Â°)
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

    // 3) Top wall â€” stone vault with hanging chandelier.
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
    // Gothic moldings â€” gold trim line
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

    // 4) Bottom wall â€” red velvet runner edge.
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
    // Tassels â€” small pendant shapes
    bottomG.fillStyle(0xffd84a, 0.85);
    for (let x = 12; x < w; x += 60) {
      bottomG.fillTriangle(x - 2, h - 40, x + 2, h - 40, x, h - 36);
    }

    // 5) Side walls â€” tall stone columns with portraits.
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
    // Portraits â€” gilt frames with painted figures
    this.paintPortrait(container, 20, 110);
    this.paintPortrait(container, w - 20, 110);
    this.paintPortrait(container, 20, 270);
    this.paintPortrait(container, w - 20, 270);

    // 6) Light shafts â€” warm candle-light beams from sconces.
    const lightG = this.add.graphics();
    container.add(lightG);
    lightG.fillStyle(0xffd84a, 0.05);
    this.fillSlantedBand(lightG, 200, 38, 80, h - 80, 70);
    lightG.fillStyle(0xfff8a0, 0.06);
    this.fillSlantedBand(lightG, 600, 38, 80, h - 80, 110);

    // 7) Decorations â€” broken column, candelabrum stands, vase.
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

    // 10) Mansion mobs (painted) â€” Wraith, Possessed Candelabra, Cursed Mirror.
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

    // 12) Lord Onyx â€” final boss, painted.
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

    // 13) Combat â€” magic missile arc + Lord Onyx's amethyst-shard volley.
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
      // Shard body â€” small dark diamond
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

    // 14) Mist bands â€” purple-tinted dust drift.
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
  // Onyx Mansion painted assets â€” boss, mobs, props, decor.
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
    // Sketchy figure â€” head + shoulders silhouette
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
    // Jagged break â€” replace the top row with diagonal jags
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
    // Crack â€” jagged line
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
    // Tattered robe â€” wispy bottom
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
    // Skull base â€” staring upward
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
    // Arms â€” bone-y
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
    // Mirror surface â€” dark with gradient
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
    // 5 spires â€” center tallest
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
    // Cloak body â€” tall trapezoidal silhouette
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
    // Cloak fringe at the bottom â€” wavy edge
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
    // Eye sockets â€” sunken with glowing red eyes
    g.fillStyle(0x040208, 1);
    g.fillRect(cx - 5, cy - 38, 4, 3);
    g.fillRect(cx + 1, cy - 38, 4, 3);
    g.fillStyle(0xff3344, 1);
    g.fillRect(cx - 4, cy - 37, 2, 1);
    g.fillRect(cx + 2, cy - 37, 2, 1);
    g.fillStyle(0xffaad8, 1);
    g.fillRect(cx - 4, cy - 37, 1, 1);
    g.fillRect(cx + 2, cy - 37, 1, 1);
    // Mouth â€” thin grim line
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
    // Scepter in his right hand â€” long staff with amethyst orb
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
  // Prismarch variants (Page 5) — current ingame texture + 3 design directions
  // ---------------------------------------------------------------------------

  /**
   * Lays out four slots horizontally: the live ingame V2 texture on the
   * left, then three fully-redrawn design directions. Each slot shows the
   * boss centered with a subtle dark vignette frame, a title above and a
   * three-line description below so the user can compare silhouettes,
   * ornaments, and gem-references at a glance.
   */
  private paintShowcasePrismarchVariants(): void {
    const slots: Array<{
      title: string;
      lines: readonly string[];
      paint: (cx: number, cy: number) => void;
    }> = [
      {
        title: 'CURRENT  (V2)',
        lines: ['Hooded silhouette,', 'skeletal hands, prism.', 'Plain ragged hem.'],
        paint: (cx, cy) => this.paintPrismarchCurrent(cx, cy),
      },
      {
        title: 'A — RELIQUARY',
        lines: [
          'Gold trim + filigree cage.',
          '3 gem cabochons on chest.',
          'Holy / authority feel.',
        ],
        paint: (cx, cy) => this.drawPrismarchVariantReliquary(this.add.graphics(), cx, cy),
      },
      {
        title: 'B — TATTERED',
        lines: [
          'Trinity eyes, runic sigils.',
          'Shadow chains on prism.',
          'Cultist / sinister feel.',
        ],
        paint: (cx, cy) => this.drawPrismarchVariantTattered(this.add.graphics(), cx, cy),
      },
      {
        title: 'C — CROWNED',
        lines: [
          'Levitating prism + 3 shards.',
          'Channeling palms, gem clasps.',
          'Cosmic / mage feel.',
        ],
        paint: (cx, cy) => this.drawPrismarchVariantCrowned(this.add.graphics(), cx, cy),
      },
      {
        title: 'CURRENT + C',
        lines: [
          'Current robe + hood + eyes.',
          'Floating prism, channel threads.',
          'Orbit shards + diamond clasps.',
        ],
        paint: (cx, cy) =>
          this.drawPrismarchVariantCurrentHybrid(this.add.graphics(), cx, cy),
      },
    ];

    // Symmetric centers across GAME_WIDTH (960): step 192, margins 96 each side.
    const centers = [96, 288, 480, 672, 864];
    const slotHalfW = 86;
    const slotTopY = 110;
    const slotH = 350;
    const titleY = slotTopY + 14;
    const bossY = slotTopY + 200;
    const descTopY = slotTopY + 280;

    for (let i = 0; i < slots.length; i++) {
      const sx = centers[i];
      const slot = slots[i];

      // Frame box — subtle dark backdrop + amethyst border.
      const frame = this.add.graphics();
      frame.fillStyle(0x0a0418, 0.6);
      frame.fillRect(sx - slotHalfW, slotTopY, slotHalfW * 2, slotH);
      frame.lineStyle(1, 0xc864ff, 0.45);
      frame.strokeRect(sx - slotHalfW, slotTopY, slotHalfW * 2, slotH);

      // Floor shadow + amethyst pad — gives every variant the same "hover"
      // baseline so silhouette differences read clearly.
      const pad = this.add.graphics();
      pad.fillStyle(0x000000, 0.55);
      pad.fillEllipse(sx, bossY + 86, 76, 13);
      pad.fillStyle(0xc864ff, 0.16);
      pad.fillEllipse(sx, bossY + 86, 56, 9);
      pad.fillStyle(0xff8aff, 0.22);
      pad.fillEllipse(sx, bossY + 86, 26, 5);

      // Title above the slot.
      this.add
        .text(sx, titleY, slot.title, {
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#e9d5ff',
          stroke: '#1a0828',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0);

      // Hero rendering.
      slot.paint(sx, bossY);

      // Three-line description.
      for (let li = 0; li < slot.lines.length; li++) {
        this.add
          .text(sx, descTopY + li * 16, slot.lines[li], {
            fontSize: '11px',
            color: '#aab8c0',
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.9);
      }
    }
  }

  /**
   * Renders the live ingame V2 Prismarch texture as an Image so the
   * comparison against the three redrawn variants is honest. Scaled 2.5×
   * to roughly match the painted variants' apparent size.
   */
  private paintPrismarchCurrent(cx: number, cy: number): void {
    const img = this.add.image(cx, cy, TextureKeys.BossLordOnyx);
    img.setScale(2.5);
    // Soft amethyst glow behind the sprite for parity with the painted
    // variants (which all bake their own glow).
    const halo = this.add.graphics();
    halo.fillStyle(0xc864ff, 0.10);
    halo.fillCircle(cx, cy, 90);
    halo.fillStyle(0x4a2070, 0.18);
    halo.fillCircle(cx, cy, 60);
    halo.setDepth(img.depth - 1);
  }

  /**
   * Shared bell-shape silhouette + hood void used as the base layer for
   * all four painted variants. Geometry is the live ingame V2 texture's
   * exact outer + inner point list scaled by 2.05× (V2 is 64×88, this
   * helper paints at ~131×170) so the witch-hat hood point reads sharp
   * and identical to the actual sprite — the previous version
   * paraphrased the points and ended up rounding the hood's peak into a
   * dome. Returns the hood centre / radii so variants can drop eyes,
   * trim, ornaments at consistent positions.
   */
  private drawPrismarchBaseSilhouette(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    options: {
      robeOuter: number;
      robeInner: number;
      robeMid: number;
      robeRim: number;
    },
  ): { hoodCenterY: number; hoodRX: number; hoodRY: number } {
    const outline = 0x000000;
    // Scale so V2's 83-pixel silhouette span maps to ~170 px in mockup.
    // V2 first outer point is at y=1 (sharp peak) and last at y=84.
    const SCALE = 2.05;
    const top = cy - 85; // maps V2's silhouette-center to cy

    // V2 outer point list (from PreloadScene.drawBossLordOnyxTexture),
    // expressed as offsets-from-center + y-from-V2-top so the mockup
    // helper stays a strict scale of the ingame texture.
    const v2Outer: ReadonlyArray<readonly [number, number]> = [
      [0, 1], [5, 6], [9, 14], [12, 22], [12, 32],
      [14, 42], [16, 52], [19, 62], [23, 72], [28, 82],
      // ragged hem
      [24, 84], [18, 80], [12, 84], [4, 80], [-4, 84],
      [-12, 80], [-18, 84], [-24, 80], [-28, 82],
      [-23, 72], [-19, 62], [-16, 52], [-14, 42],
      [-12, 32], [-12, 22], [-9, 14], [-5, 6],
    ];
    const outer = v2Outer.map(([dx, y]) => ({
      x: cx + dx * SCALE,
      y: top + (y - 1) * SCALE,
    }));
    g.fillStyle(outline, 1);
    g.fillPoints(outer, true);

    // V2 inner point list — sits 1-2 px inside the outline; gives the
    // bell-shape its dark robe fill instead of staying outline-only.
    const v2Inner: ReadonlyArray<readonly [number, number]> = [
      [0, 3], [4, 8], [8, 14], [11, 22], [11, 32],
      [13, 42], [15, 52], [18, 62], [22, 72], [26, 80],
      [18, 78], [8, 80], [0, 78], [-8, 80], [-18, 78],
      [-26, 80], [-22, 72], [-18, 62], [-15, 52],
      [-13, 42], [-11, 32], [-11, 22], [-8, 14], [-4, 8],
    ];
    const inner = v2Inner.map(([dx, y]) => ({
      x: cx + dx * SCALE,
      y: top + (y - 1) * SCALE,
    }));
    g.fillStyle(options.robeOuter, 1);
    g.fillPoints(inner, true);

    // Mid-tone vertical band on right (V2: triangle 2,8 → 8,8 → 14,76).
    g.fillStyle(options.robeMid, 1);
    g.fillTriangle(
      cx + 2 * SCALE, top + (8 - 1) * SCALE,
      cx + 8 * SCALE, top + (8 - 1) * SCALE,
      cx + 14 * SCALE, top + (76 - 1) * SCALE,
    );

    // Right-edge rim highlight (V2: 9,18 → 12,18 → 19,60 + 11,20 → 12,22 → 22,70).
    g.fillStyle(options.robeInner, 1);
    g.fillTriangle(
      cx + 9 * SCALE, top + (18 - 1) * SCALE,
      cx + 12 * SCALE, top + (18 - 1) * SCALE,
      cx + 19 * SCALE, top + (60 - 1) * SCALE,
    );
    g.fillStyle(options.robeRim, 0.5);
    g.fillTriangle(
      cx + 11 * SCALE, top + (20 - 1) * SCALE,
      cx + 12 * SCALE, top + (22 - 1) * SCALE,
      cx + 22 * SCALE, top + (70 - 1) * SCALE,
    );

    // Hood void (V2: ellipse at y=14, rx=8, ry=7 → scaled 16.4 × 14.35).
    const hoodY = top + (14 - 1) * SCALE;
    const hoodRX = 8 * SCALE;
    const hoodRY = 7 * SCALE;
    g.fillStyle(outline, 1);
    g.fillEllipse(cx, hoodY, hoodRX * 2, hoodRY * 2);
    return { hoodCenterY: hoodY, hoodRX, hoodRY };
  }

  /**
   * VARIANT A — Reliquary High-Priest. Holy / authority direction:
   *  - Gold trim along hood opening + hem fringe (gold thread tassels).
   *  - 3 gem cabochons on a chest collar (Emerald top, Sapphire mid,
   *    Amethyst bottom — references the 3 floors the player consumed).
   *  - Skeletal hands hold the prism inside a curved gold filigree cage.
   *  - Eye pinpoints are flame-wick-shaped (vertical thin halos) instead
   *    of round, reinforcing the candlelit-cathedral feel.
   */
  private drawPrismarchVariantReliquary(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const GOLD = 0xffd84a;
    const GOLD_DEEP = 0xa56a18;
    const EMERALD = 0x4afa80;
    const SAPPHIRE = 0x4a80fa;
    const AMETHYST = 0xc864ff;
    const PRISM_R = 0xff4060;

    const hood = this.drawPrismarchBaseSilhouette(g, cx, cy, {
      robeOuter: 0x0c0418,
      robeInner: 0x2a1248,
      robeMid: 0x140828,
      robeRim: 0x4a2070,
    });

    // Gold hood-trim — runs around the hood opening.
    g.lineStyle(2, GOLD, 0.95);
    g.strokeEllipse(cx, hood.hoodCenterY, hood.hoodRX * 2, hood.hoodRY * 2);
    g.lineStyle(1, GOLD_DEEP, 0.7);
    g.strokeEllipse(cx, hood.hoodCenterY + 1, hood.hoodRX * 2 - 4, hood.hoodRY * 2 - 4);

    // Vertical flame-wick eyes (taller than wide).
    for (const eyeX of [cx - 6, cx + 6]) {
      g.fillStyle(AMETHYST, 0.4);
      g.fillEllipse(eyeX, hood.hoodCenterY, 3, 8);
      g.fillStyle(0xff8aff, 0.95);
      g.fillEllipse(eyeX, hood.hoodCenterY, 1.5, 5);
      g.fillStyle(0xffffff, 1);
      g.fillRect(eyeX, hood.hoodCenterY - 2, 1, 1);
    }

    // Chest collar — gold band with three gem cabochons.
    const collarY = cy - 28;
    g.fillStyle(GOLD_DEEP, 1);
    g.fillRect(cx - 22, collarY - 4, 44, 8);
    g.fillStyle(GOLD, 1);
    g.fillRect(cx - 21, collarY - 4, 42, 2);
    // Emerald cabochon (top of chain — but here arranged horizontally).
    const cabPositions = [
      { x: cx - 14, color: EMERALD },
      { x: cx, color: SAPPHIRE },
      { x: cx + 14, color: AMETHYST },
    ];
    for (const cab of cabPositions) {
      g.fillStyle(0x000000, 1);
      g.fillCircle(cab.x, collarY, 4);
      g.fillStyle(cab.color, 1);
      g.fillCircle(cab.x, collarY, 3);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(cab.x - 1, collarY - 2, 1, 1);
    }
    // Vertical chain dropping from collar to filigree cage.
    g.fillStyle(GOLD_DEEP, 1);
    g.fillRect(cx - 1, collarY + 4, 2, 10);
    g.fillStyle(GOLD, 0.9);
    g.fillRect(cx, collarY + 4, 1, 10);

    // Skeletal hands — bony fingers cradling the cage.
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - 14, cy + 10, 6, 9);
    g.fillRect(cx + 8, cy + 10, 6, 9);
    g.fillStyle(0x6a587a, 1);
    g.fillRect(cx - 13, cy + 11, 4, 6);
    g.fillRect(cx + 9, cy + 11, 4, 6);
    g.fillStyle(0xa898b8, 0.7);
    g.fillRect(cx - 13, cy + 11, 1, 5);
    g.fillRect(cx + 9, cy + 11, 1, 5);

    // Gold filigree cage around the prism (curved bracket lines).
    const px = cx;
    const py = cy + 18;
    g.lineStyle(2, GOLD, 0.95);
    g.strokeEllipse(px, py, 22, 28);
    g.lineStyle(1, GOLD_DEEP, 0.7);
    g.strokeEllipse(px, py, 18, 24);
    g.lineStyle(1, GOLD, 0.85);
    // Cross filigree
    g.beginPath();
    g.moveTo(px - 11, py - 8);
    g.lineTo(px + 11, py + 8);
    g.strokePath();
    g.beginPath();
    g.moveTo(px + 11, py - 8);
    g.lineTo(px - 11, py + 8);
    g.strokePath();

    // Halo behind the prism.
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(px, py, 22);
    g.fillStyle(AMETHYST, 0.22);
    g.fillCircle(px, py, 14);
    g.fillStyle(0xff8aff, 0.28);
    g.fillCircle(px, py, 8);

    // Prism itself — chromatic split.
    const ph = 18;
    const pw = 14;
    g.fillStyle(0x000000, 1);
    g.fillTriangle(px, py - ph / 2 - 1, px + pw / 2 + 1, py + ph / 2, px - pw / 2 - 1, py + ph / 2);
    g.fillStyle(PRISM_R, 1);
    g.fillTriangle(px - 1, py - ph / 2 + 2, px - pw / 2 + 2, py + ph / 2 - 1, px + 1, py + ph / 2 - 1);
    g.fillStyle(SAPPHIRE, 1);
    g.fillTriangle(px + 1, py - ph / 2 + 2, px + pw / 2 - 2, py + ph / 2 - 1, px - 1, py + ph / 2 - 1);
    g.fillStyle(EMERALD, 0.7);
    g.fillTriangle(px, py - ph / 2 + 3, px - 2, py + ph / 2 - 3, px + 2, py + ph / 2 - 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(px, py - ph / 2 + 1, 1, 2);

    // Gold-thread tassels on the hem (8 short tassels along bottom).
    for (let i = -3; i <= 3; i++) {
      const tx = cx + i * 14 + (i === 0 ? 0 : 0);
      const ty = cy + 78;
      g.fillStyle(GOLD_DEEP, 1);
      g.fillRect(tx - 1, ty, 1, 7);
      g.fillStyle(GOLD, 0.9);
      g.fillRect(tx, ty, 1, 5);
    }
  }

  /**
   * VARIANT B — Tattered Cultist. Sinister / twisted direction:
   *  - More aggressively shredded hem (long tail strips trailing past the
   *    bell silhouette).
   *  - Trinity eyes (3 vertical pinpoints) — one per consumed gem.
   *  - 3 distinct embroidered runes on the chest:
   *      • Emerald = leaf-cross sigil
   *      • Sapphire = wave / sine sigil
   *      • Amethyst = star / 4-point diamond sigil
   *  - Bone hands cradle the prism, but dark-smoke chains coil around the
   *    prism (the gems are imprisoned, not displayed).
   */
  private drawPrismarchVariantTattered(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const EMERALD = 0x4afa80;
    const SAPPHIRE = 0x4a80fa;
    const AMETHYST = 0xc864ff;
    const PRISM_R = 0xff4060;
    const SHADOW = 0x100008;
    const RUNE_THREAD = 0x6a4080;

    const hood = this.drawPrismarchBaseSilhouette(g, cx, cy, {
      robeOuter: 0x080210,
      robeInner: 0x1c0a30,
      robeMid: 0x0e0420,
      robeRim: 0x2a1248,
    });

    // Long tattered streamers trailing from the hem (past the silhouette).
    for (const offset of [-44, -26, -8, 12, 30, 46]) {
      const tx = cx + offset;
      const ty = cy + 78;
      const len = 16 + Math.abs(offset) * 0.15;
      g.fillStyle(0x000000, 1);
      g.fillTriangle(tx - 3, ty, tx + 3, ty, tx + (offset < 0 ? -1 : 1), ty + len);
      g.fillStyle(0x080210, 1);
      g.fillTriangle(tx - 2, ty + 1, tx + 2, ty + 1, tx + (offset < 0 ? -1 : 1), ty + len - 2);
    }

    // Three vertical eye pinpoints (trinity) inside the hood.
    for (let i = 0; i < 3; i++) {
      const ey = hood.hoodCenterY - 6 + i * 7;
      g.fillStyle(AMETHYST, 0.4);
      g.fillCircle(cx, ey, 2.4);
      g.fillStyle(0xff8aff, 1);
      g.fillCircle(cx, ey, 1.2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx, ey - 1, 1, 1);
    }

    // Chest sigils (3 stitched runes side-by-side).
    const sigilY = cy - 26;
    // Emerald — leaf-cross sigil
    g.lineStyle(1.5, RUNE_THREAD, 1);
    g.beginPath();
    g.moveTo(cx - 22, sigilY - 6);
    g.lineTo(cx - 22, sigilY + 6);
    g.strokePath();
    g.beginPath();
    g.moveTo(cx - 27, sigilY);
    g.lineTo(cx - 17, sigilY);
    g.strokePath();
    g.fillStyle(EMERALD, 0.95);
    g.fillCircle(cx - 22, sigilY, 1.6);
    // Sapphire — sine wave sigil
    g.lineStyle(1.5, RUNE_THREAD, 1);
    g.beginPath();
    g.moveTo(cx - 6, sigilY + 4);
    g.lineTo(cx - 3, sigilY - 4);
    g.lineTo(cx, sigilY + 4);
    g.lineTo(cx + 3, sigilY - 4);
    g.lineTo(cx + 6, sigilY + 4);
    g.strokePath();
    g.fillStyle(SAPPHIRE, 0.95);
    g.fillCircle(cx, sigilY, 1.4);
    // Amethyst — 4-point star/diamond sigil
    g.lineStyle(1.5, RUNE_THREAD, 1);
    g.beginPath();
    g.moveTo(cx + 22, sigilY - 6);
    g.lineTo(cx + 28, sigilY);
    g.lineTo(cx + 22, sigilY + 6);
    g.lineTo(cx + 16, sigilY);
    g.closePath();
    g.strokePath();
    g.fillStyle(AMETHYST, 0.95);
    g.fillCircle(cx + 22, sigilY, 1.6);

    // Bone hands cradling the prism.
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - 14, cy + 10, 6, 9);
    g.fillRect(cx + 8, cy + 10, 6, 9);
    g.fillStyle(0x504058, 1);
    g.fillRect(cx - 13, cy + 11, 4, 6);
    g.fillRect(cx + 9, cy + 11, 4, 6);

    // Prism with smoke-chain coil around it.
    const px = cx;
    const py = cy + 18;

    // Halo (dimmer, more ominous).
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(px, py, 22);
    g.fillStyle(AMETHYST, 0.18);
    g.fillCircle(px, py, 14);

    // Smoke chains — wavy dark bands wrapping the prism (3 loops).
    g.lineStyle(2.2, SHADOW, 0.95);
    for (let loop = 0; loop < 3; loop++) {
      const phase = loop * 0.9;
      g.beginPath();
      const segs = 24;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const ang = t * Math.PI * 2 + phase;
        const r = 14 + Math.sin(ang * 2) * 3;
        const x = px + Math.cos(ang) * r;
        const y = py + Math.sin(ang) * r * 0.6 + (loop - 1) * 4;
        if (s === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }

    // Prism itself.
    const ph = 18;
    const pw = 14;
    g.fillStyle(0x000000, 1);
    g.fillTriangle(px, py - ph / 2 - 1, px + pw / 2 + 1, py + ph / 2, px - pw / 2 - 1, py + ph / 2);
    g.fillStyle(PRISM_R, 1);
    g.fillTriangle(px - 1, py - ph / 2 + 2, px - pw / 2 + 2, py + ph / 2 - 1, px + 1, py + ph / 2 - 1);
    g.fillStyle(SAPPHIRE, 1);
    g.fillTriangle(px + 1, py - ph / 2 + 2, px + pw / 2 - 2, py + ph / 2 - 1, px - 1, py + ph / 2 - 1);
    g.fillStyle(EMERALD, 0.7);
    g.fillTriangle(px, py - ph / 2 + 3, px - 2, py + ph / 2 - 3, px + 2, py + ph / 2 - 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(px, py - ph / 2 + 1, 1, 2);
  }

  /**
   * VARIANT C — Crowned Conjurer. Cosmic / mage direction:
   *  - Prism levitates in front of the hood between the eyes (no hands
   *    holding it — telekinetic / channeled).
   *  - 3 small gem-shards orbit at chest level (Emerald left, Sapphire
   *    front-bottom, Amethyst right) — visualizes "consumed gems still
   *    answering to him".
   *  - Hands extended outward at sides, palms up, with energy threads
   *    rising from each palm to the floating prism.
   *  - 3 gem-shaped clasps run vertically down the chest (button-like).
   *  - Slimmer slit-style hood opening (two thin amethyst slits) so the
   *    prism reads as the face.
   */
  private drawPrismarchVariantCrowned(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const EMERALD = 0x4afa80;
    const SAPPHIRE = 0x4a80fa;
    const AMETHYST = 0xc864ff;
    const PRISM_R = 0xff4060;
    const GOLD = 0xffd84a;

    this.drawPrismarchBaseSilhouette(g, cx, cy, {
      robeOuter: 0x0a0420,
      robeInner: 0x2c1850,
      robeMid: 0x140830,
      robeRim: 0x5a2880,
    });

    // Slim slit eyes — two thin amethyst horizontal lines instead of round dots.
    const slitY = cy - 70;
    g.fillStyle(AMETHYST, 0.35);
    g.fillRect(cx - 9, slitY - 1, 7, 3);
    g.fillRect(cx + 2, slitY - 1, 7, 3);
    g.fillStyle(0xff8aff, 1);
    g.fillRect(cx - 8, slitY, 5, 1);
    g.fillRect(cx + 3, slitY, 5, 1);

    // 3 gem-shaped clasps vertically down the chest.
    const claspGems = [
      { y: cy - 30, color: EMERALD },
      { y: cy - 12, color: SAPPHIRE },
      { y: cy + 6, color: AMETHYST },
    ];
    for (const c of claspGems) {
      // Gold setting (small diamond shape).
      g.fillStyle(GOLD, 1);
      g.fillTriangle(cx, c.y - 5, cx + 5, c.y, cx - 5, c.y);
      g.fillTriangle(cx - 5, c.y, cx + 5, c.y, cx, c.y + 5);
      g.fillStyle(0xa56a18, 1);
      g.fillTriangle(cx, c.y - 4, cx + 4, c.y, cx - 4, c.y);
      g.fillTriangle(cx - 4, c.y, cx + 4, c.y, cx, c.y + 4);
      // Gem.
      g.fillStyle(c.color, 1);
      g.fillCircle(cx, c.y, 2);
      g.fillStyle(0xffffff, 0.95);
      g.fillRect(cx - 1, c.y - 1, 1, 1);
    }

    // Hands extended outward — palms-up channeling pose.
    const handLY = cy + 14;
    const handRY = cy + 14;
    const handLX = cx - 38;
    const handRX = cx + 38;
    // Outline
    g.fillStyle(0x000000, 1);
    g.fillRect(handLX - 4, handLY - 3, 8, 7);
    g.fillRect(handRX - 4, handRY - 3, 8, 7);
    // Pale skeletal palm
    g.fillStyle(0x6a587a, 1);
    g.fillRect(handLX - 3, handLY - 2, 6, 5);
    g.fillRect(handRX - 3, handRY - 2, 6, 5);
    // Palm highlight
    g.fillStyle(0xa898b8, 0.7);
    g.fillRect(handLX - 3, handLY - 2, 5, 1);
    g.fillRect(handRX - 3, handRY - 2, 5, 1);

    // Levitating prism between the eyes — moves up to the hood opening.
    const px = cx;
    const py = cy - 36;

    // Energy threads — 4-segment polyline from each palm rising up to the prism.
    const drawThread = (sx: number, sy: number, color: number): void => {
      g.lineStyle(1.5, color, 0.6);
      g.beginPath();
      const segs = 8;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const ux = sx + (px - sx) * t;
        const uy = sy + (py - sy) * t + Math.sin(t * Math.PI * 3) * 4;
        if (s === 0) g.moveTo(ux, uy);
        else g.lineTo(ux, uy);
      }
      g.strokePath();
    };
    drawThread(handLX, handLY - 2, EMERALD);
    drawThread(handRX, handRY - 2, SAPPHIRE);

    // 3 orbiting gem-shards around the boss at chest level.
    const orbitR = 50;
    const orbitY = cy + 4;
    const orbits = [
      { ang: -2.2, color: EMERALD },
      { ang: 0.4, color: SAPPHIRE },
      { ang: 2.6, color: AMETHYST },
    ];
    for (const o of orbits) {
      const ox = cx + Math.cos(o.ang) * orbitR;
      const oy = orbitY + Math.sin(o.ang) * orbitR * 0.45;
      // Glow
      g.fillStyle(o.color, 0.3);
      g.fillCircle(ox, oy, 6);
      // Shard — small triangle pointing outward.
      const angOut = Math.atan2(oy - orbitY, ox - cx);
      const tip = { x: ox + Math.cos(angOut) * 5, y: oy + Math.sin(angOut) * 5 };
      const baseA = {
        x: ox + Math.cos(angOut + Math.PI * 0.65) * 4,
        y: oy + Math.sin(angOut + Math.PI * 0.65) * 4,
      };
      const baseB = {
        x: ox + Math.cos(angOut - Math.PI * 0.65) * 4,
        y: oy + Math.sin(angOut - Math.PI * 0.65) * 4,
      };
      g.fillStyle(0x000000, 1);
      g.fillTriangle(tip.x, tip.y, baseA.x, baseA.y, baseB.x, baseB.y);
      g.fillStyle(o.color, 1);
      g.fillTriangle(
        tip.x * 0.85 + ox * 0.15,
        tip.y * 0.85 + oy * 0.15,
        baseA.x * 0.85 + ox * 0.15,
        baseA.y * 0.85 + oy * 0.15,
        baseB.x * 0.85 + ox * 0.15,
        baseB.y * 0.85 + oy * 0.15,
      );
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(Math.round(ox), Math.round(oy - 1), 1, 1);
    }

    // Prism halo — bigger because the prism is the focal point now.
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(px, py, 28);
    g.fillStyle(AMETHYST, 0.28);
    g.fillCircle(px, py, 18);
    g.fillStyle(0xff8aff, 0.32);
    g.fillCircle(px, py, 10);

    // Prism — slightly larger than other variants since it's the face.
    const ph = 22;
    const pw = 18;
    g.fillStyle(0x000000, 1);
    g.fillTriangle(px, py - ph / 2 - 1, px + pw / 2 + 1, py + ph / 2, px - pw / 2 - 1, py + ph / 2);
    g.fillStyle(PRISM_R, 1);
    g.fillTriangle(px - 1, py - ph / 2 + 2, px - pw / 2 + 2, py + ph / 2 - 1, px + 1, py + ph / 2 - 1);
    g.fillStyle(SAPPHIRE, 1);
    g.fillTriangle(px + 1, py - ph / 2 + 2, px + pw / 2 - 2, py + ph / 2 - 1, px - 1, py + ph / 2 - 1);
    g.fillStyle(EMERALD, 0.75);
    g.fillTriangle(px, py - ph / 2 + 3, px - 3, py + ph / 2 - 3, px + 3, py + ph / 2 - 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(px, py - ph / 2 + 1, 1, 2);
    g.fillRect(px - pw / 2 + 3, py + ph / 2 - 2, pw - 6, 1);
  }

  /**
   * CURRENT + C — keeps the live ingame V2 silhouette (robe colors,
   * hood void, two amethyst pinpoint eyes, ragged hem, floating amethyst
   * aura) and integrates the three Crowned-Conjurer prism systems:
   *  - Floating prism in front of the hood (no skeletal hands holding it).
   *  - Hands extended outward at sides palms-up, with two sine-wave
   *    energy threads (Emerald + Sapphire) rising from each palm to the
   *    floating prism.
   *  - Three orbiting gem-shards at chest level, small outward-pointing
   *    triangles in Emerald / Sapphire / Amethyst.
   *  - Three diamond-shaped gem-clasps vertically down the chest
   *    (Emerald top, Sapphire middle, Amethyst bottom).
   * Eye treatment stays the round V2 pinpoints — the user's spec called
   * out the prism / hands / orbits / clasps from C, not the slit eyes.
   */
  private drawPrismarchVariantCurrentHybrid(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const EMERALD = 0x4afa80;
    const SAPPHIRE = 0x4a80fa;
    const AMETHYST = 0xc864ff;
    const PRISM_R = 0xff4060;
    const GOLD = 0xffd84a;
    const GOLD_DEEP = 0xa56a18;

    // Reuse the shared bell-shape with the Current V2 robe colors so this
    // hybrid reads as a direct continuation of the ingame texture, not a
    // new direction.
    const hood = this.drawPrismarchBaseSilhouette(g, cx, cy, {
      robeOuter: 0x070310,
      robeInner: 0x281244,
      robeMid: 0x110820,
      robeRim: 0x4a2070,
    });

    // Two round amethyst pinpoint eyes deep in hood shadow — exact V2
    // treatment so the face read stays continuous.
    for (const eyeX of [cx - 7, cx + 7]) {
      g.fillStyle(AMETHYST, 0.30);
      g.fillCircle(eyeX, hood.hoodCenterY, 6);
      g.fillStyle(AMETHYST, 0.7);
      g.fillCircle(eyeX, hood.hoodCenterY, 3);
      g.fillStyle(0xff8aff, 1);
      g.fillRect(eyeX - 1, hood.hoodCenterY - 1, 2, 2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(eyeX, hood.hoodCenterY - 1, 1, 1);
    }

    // 3 diamond-shaped gem-clasps running vertically down the chest.
    // Pushed below the floating prism so the prism reads as the focal
    // element above them, the clasps as a matching column below.
    const claspGems = [
      { y: cy - 4, color: EMERALD },
      { y: cy + 14, color: SAPPHIRE },
      { y: cy + 32, color: AMETHYST },
    ];
    for (const c of claspGems) {
      // Gold setting (small diamond shape, two stacked triangles).
      g.fillStyle(GOLD, 1);
      g.fillTriangle(cx, c.y - 5, cx + 5, c.y, cx - 5, c.y);
      g.fillTriangle(cx - 5, c.y, cx + 5, c.y, cx, c.y + 5);
      g.fillStyle(GOLD_DEEP, 1);
      g.fillTriangle(cx, c.y - 4, cx + 4, c.y, cx - 4, c.y);
      g.fillTriangle(cx - 4, c.y, cx + 4, c.y, cx, c.y + 4);
      // Gem cabochon centered.
      g.fillStyle(c.color, 1);
      g.fillCircle(cx, c.y, 2);
      g.fillStyle(0xffffff, 0.95);
      g.fillRect(cx - 1, c.y - 1, 1, 1);
    }

    // Hands extended outward at sides — palms-up channeling pose.
    // Pushed slightly higher than C's pose (cy - 4 instead of cy + 14) so
    // the threads have a longer arc up to the prism above the hood.
    const handY = cy - 4;
    const handLX = cx - 38;
    const handRX = cx + 38;
    g.fillStyle(0x000000, 1);
    g.fillRect(handLX - 4, handY - 3, 8, 7);
    g.fillRect(handRX - 4, handY - 3, 8, 7);
    g.fillStyle(0x4a3850, 1);
    g.fillRect(handLX - 3, handY - 2, 6, 5);
    g.fillRect(handRX - 3, handY - 2, 6, 5);
    g.fillStyle(0x806878, 0.7);
    g.fillRect(handLX - 3, handY - 2, 5, 1);
    g.fillRect(handRX - 3, handY - 2, 5, 1);

    // Floating prism position — in front of the hood opening, between/
    // just below the eyes. cy - 50 places it overlapping the hood lower
    // edge so it reads as channeled-into-place rather than worn.
    const px = cx;
    const py = cy - 50;

    // Sine-wave energy threads from each palm rising up to the prism.
    // Emerald on the left palm, Sapphire on the right — the third gem
    // (Amethyst) is "stored" in the clasps + the prism core itself.
    const drawThread = (sx: number, sy: number, color: number, phase: number): void => {
      g.lineStyle(1.6, color, 0.65);
      g.beginPath();
      const segs = 12;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const ux = sx + (px - sx) * t;
        const baseY = sy + (py - sy) * t;
        const wobble = Math.sin(t * Math.PI * 3 + phase) * 5 * (1 - Math.abs(t - 0.5) * 0.6);
        const uy = baseY + wobble;
        if (s === 0) g.moveTo(ux, uy);
        else g.lineTo(ux, uy);
      }
      g.strokePath();
      // Bright core re-trace at half alpha, thinner — gives the thread a
      // glow-pixel core instead of a flat line.
      g.lineStyle(0.6, 0xffffff, 0.7);
      g.beginPath();
      const segs2 = 12;
      for (let s = 0; s <= segs2; s++) {
        const t = s / segs2;
        const ux = sx + (px - sx) * t;
        const baseY = sy + (py - sy) * t;
        const wobble = Math.sin(t * Math.PI * 3 + phase) * 5 * (1 - Math.abs(t - 0.5) * 0.6);
        const uy = baseY + wobble;
        if (s === 0) g.moveTo(ux, uy);
        else g.lineTo(ux, uy);
      }
      g.strokePath();
    };
    drawThread(handLX, handY - 2, EMERALD, 0);
    drawThread(handRX, handY - 2, SAPPHIRE, Math.PI);

    // 3 orbiting gem-shards at chest level — small outward-pointing
    // triangles in the three gem colors. Same orbit math as variant C
    // so the visual idiom matches.
    const orbitR = 44;
    const orbitY = cy + 8;
    const orbits = [
      { ang: Math.PI - 0.4, color: EMERALD }, // left side
      { ang: -Math.PI / 2 + 0.1, color: SAPPHIRE }, // bottom-front (slight offset so it's visible)
      { ang: 0.4, color: AMETHYST }, // right side
    ];
    for (const o of orbits) {
      const ox = cx + Math.cos(o.ang) * orbitR;
      const oy = orbitY + Math.sin(o.ang) * orbitR * 0.45;
      // Soft glow halo behind the shard.
      g.fillStyle(o.color, 0.32);
      g.fillCircle(ox, oy, 6);
      // Shard — triangle pointing radially outward from chest.
      const angOut = Math.atan2(oy - orbitY, ox - cx);
      const tip = { x: ox + Math.cos(angOut) * 6, y: oy + Math.sin(angOut) * 6 };
      const baseA = {
        x: ox + Math.cos(angOut + Math.PI * 0.65) * 4,
        y: oy + Math.sin(angOut + Math.PI * 0.65) * 4,
      };
      const baseB = {
        x: ox + Math.cos(angOut - Math.PI * 0.65) * 4,
        y: oy + Math.sin(angOut - Math.PI * 0.65) * 4,
      };
      g.fillStyle(0x000000, 1);
      g.fillTriangle(tip.x, tip.y, baseA.x, baseA.y, baseB.x, baseB.y);
      g.fillStyle(o.color, 1);
      g.fillTriangle(
        tip.x * 0.85 + ox * 0.15,
        tip.y * 0.85 + oy * 0.15,
        baseA.x * 0.85 + ox * 0.15,
        baseA.y * 0.85 + oy * 0.15,
        baseB.x * 0.85 + ox * 0.15,
        baseB.y * 0.85 + oy * 0.15,
      );
      g.fillStyle(0xffffff, 0.95);
      g.fillRect(Math.round(ox), Math.round(oy - 1), 1, 1);
    }

    // Prism halo — slightly larger than V2's so the floating prism reads
    // as the focal point even with all the new ornaments around it.
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(px, py, 24);
    g.fillStyle(AMETHYST, 0.24);
    g.fillCircle(px, py, 16);
    g.fillStyle(0xff8aff, 0.30);
    g.fillCircle(px, py, 9);

    // Prism — same chromatic-split treatment as the V2 ingame texture
    // so the prism itself reads identical, just floating instead of
    // hand-cradled.
    const ph = 18;
    const pw = 14;
    g.fillStyle(0x000000, 1);
    g.fillTriangle(px, py - ph / 2 - 1, px + pw / 2 + 1, py + ph / 2, px - pw / 2 - 1, py + ph / 2);
    g.fillStyle(PRISM_R, 1);
    g.fillTriangle(px - 1, py - ph / 2 + 2, px - pw / 2 + 2, py + ph / 2 - 1, px + 1, py + ph / 2 - 1);
    g.fillStyle(SAPPHIRE, 1);
    g.fillTriangle(px + 1, py - ph / 2 + 2, px + pw / 2 - 2, py + ph / 2 - 1, px - 1, py + ph / 2 - 1);
    g.fillStyle(EMERALD, 0.7);
    g.fillTriangle(px, py - ph / 2 + 3, px - 2, py + ph / 2 - 3, px + 2, py + ph / 2 - 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(px, py - ph / 2 + 1, 1, 2);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(px - pw / 2 + 2, py + ph / 2 - 1, pw - 4, 1);
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

  /** Paint a rotated rectangular band â€” used for diagonal light shafts. */
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
  // Layout (deterministic â€” both sides paint the exact same composition)
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

  // ===========================================================================
  // Page 6: Vampire-Mage boss variants (chess-piece break)
  //
  // Goal: explore silhouettes that DON'T read as a chess piece. The current
  // Sapphire Marquis is a symmetric vertical bell with a small head — the
  // user's "Schachfigur" critique. Each variant aims at a distinct silhouette
  // direction:
  //   A — Caped Conjurer  → asymmetric cape + casting pose (in-action)
  //   B — Hooded Specter  → slim tall rectangle, deep hood, hand-mirror prop
  //   C — Mirage-Wing Lord → wide horizontal bat-cape (breaks vertical entirely)
  //   D — Shard-Crowned   → tall narrow column + halo of mirror shards
  // ===========================================================================

  private paintShowcaseMarquisVariants(): void {
    const slots: Array<{
      title: string;
      lines: readonly string[];
      paint: (cx: number, cy: number) => void;
    }> = [
      {
        title: 'OLD V2  (SAPPHIRE MARQUIS)',
        lines: ['Twins-era bell silhouette.', 'Replaced by variant A.', 'Kept as design history.'],
        paint: (cx, cy) => this.paintMarquisCurrent(cx, cy),
      },
      {
        title: 'A — CAPED CONJURER  (LIVE)',
        lines: [
          'Asymmetric cape billow,',
          'casting pose w/ oval mirror,',
          'shipped on Onyx Mansion.',
        ],
        paint: (cx, cy) => this.drawMarquisVariantCaped(this.add.graphics(), cx, cy),
      },
      {
        title: 'B — HOODED SPECTER',
        lines: [
          'Slim tall rectangle,',
          'deep hood, faceless,',
          'ornate hand-mirror prop.',
        ],
        paint: (cx, cy) => this.drawMarquisVariantHooded(this.add.graphics(), cx, cy),
      },
      {
        title: 'C — MIRAGE-WING',
        lines: [
          'Wide horizontal bat-cape,',
          'asymmetric wing spread,',
          'breaks the vertical feel.',
        ],
        paint: (cx, cy) => this.drawMarquisVariantWinged(this.add.graphics(), cx, cy),
      },
      {
        title: 'D — SHARD-CROWN',
        lines: [
          'Tall narrow column robe,',
          'crown of mirror shards,',
          '3 orbital fragments.',
        ],
        paint: (cx, cy) => this.drawMarquisVariantShardCrown(this.add.graphics(), cx, cy),
      },
    ];

    const centers = [96, 288, 480, 672, 864];
    const slotHalfW = 86;
    const slotTopY = 110;
    const slotH = 350;
    const titleY = slotTopY + 14;
    const bossY = slotTopY + 200;
    const descTopY = slotTopY + 280;

    for (let i = 0; i < slots.length; i++) {
      const sx = centers[i];
      const slot = slots[i];

      // Frame box — sapphire/gold border instead of amethyst (vampire-mage palette).
      const frame = this.add.graphics();
      frame.fillStyle(0x040818, 0.65);
      frame.fillRect(sx - slotHalfW, slotTopY, slotHalfW * 2, slotH);
      frame.lineStyle(1, 0x4ad8ff, 0.45);
      frame.strokeRect(sx - slotHalfW, slotTopY, slotHalfW * 2, slotH);

      // Floor shadow + sapphire pad.
      const pad = this.add.graphics();
      pad.fillStyle(0x000000, 0.55);
      pad.fillEllipse(sx, bossY + 86, 78, 13);
      pad.fillStyle(0x4ad8ff, 0.16);
      pad.fillEllipse(sx, bossY + 86, 56, 9);
      pad.fillStyle(0xff80a0, 0.18);
      pad.fillEllipse(sx, bossY + 86, 26, 5);

      this.add
        .text(sx, titleY, slot.title, {
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#cfe6ff',
          stroke: '#040818',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0);

      slot.paint(sx, bossY);

      for (let li = 0; li < slot.lines.length; li++) {
        this.add
          .text(sx, descTopY + li * 16, slot.lines[li], {
            fontSize: '11px',
            color: '#a8c0d8',
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.9);
      }
    }
  }

  /**
   * Renders the live ingame Sapphire Marquis V2 texture as an Image, scaled
   * to roughly match the painted variants. The bell-shape + small head is
   * exactly what the user flagged as chess-piece-like.
   */
  private paintMarquisCurrent(cx: number, cy: number): void {
    const halo = this.add.graphics();
    halo.fillStyle(0x4ad8ff, 0.10);
    halo.fillCircle(cx, cy, 90);
    halo.fillStyle(0x1f3878, 0.18);
    halo.fillCircle(cx, cy, 60);
    const img = this.add.image(cx, cy, TextureKeys.BossSapphireMarquis);
    img.setScale(4.4);
    halo.setDepth(img.depth - 1);
  }

  /**
   * VARIANT A — Caped Conjurer.
   * Asymmetric: cape billows hard to the left, body leans into a forward
   * casting pose with the right hand extended palm-out, a small hand-mirror
   * floating just above it. Hem of the cape is wind-swept, not flared.
   * Reads as in-action rather than statue-like.
   */
  private drawMarquisVariantCaped(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x000814;
    const ROBE_DARK = 0x0c1830;
    const ROBE = 0x1f3878;
    const ROBE_HI = 0x4870c8;
    const CAPE_DARK = 0x3a0810;
    const CAPE = 0x84142c;
    const CAPE_HI = 0xc8284a;
    const TRIM = 0xffd84a;
    const SKIN = 0xd8c0d0;
    const EYE = 0xff2040;
    const SILVER = 0xd0d8e8;
    const SILVER_HI = 0xffffff;

    const bx = cx; // body center x
    const top = cy - 78;

    // 1) CAPE — billowing wide to the LEFT (asymmetric). Drawn before body.
    const capeOuter = [
      { x: bx + 14, y: top + 18 },     // collar right
      { x: bx + 6, y: top + 22 },      // collar mid
      { x: bx - 8, y: top + 26 },      // shoulder left
      { x: bx - 36, y: top + 38 },     // billow peak
      { x: bx - 58, y: top + 64 },     // billow far edge
      { x: bx - 64, y: top + 92 },     // bottom-left tip
      { x: bx - 50, y: top + 116 },    // hem 1
      { x: bx - 28, y: top + 138 },    // hem 2
      { x: bx - 10, y: top + 152 },    // hem 3 (tail)
      { x: bx + 4, y: top + 142 },     // tucking back behind body
      { x: bx - 4, y: top + 88 },      // inside crease
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(capeOuter, true);
    g.fillStyle(CAPE_DARK, 1);
    g.fillPoints(
      capeOuter.map((p) => ({ x: p.x + 1, y: p.y + 1 })),
      true,
    );
    // Cape mid-tone fold
    g.fillStyle(CAPE, 1);
    g.fillTriangle(bx - 6, top + 30, bx - 32, top + 70, bx - 22, top + 130);
    // Cape highlight rim along the wind-edge
    g.fillStyle(CAPE_HI, 0.85);
    g.fillTriangle(bx - 30, top + 38, bx - 50, top + 70, bx - 56, top + 90);

    // 2) BODY — narrow, leaning slightly right. Just a slim torso shape, no
    // bell hem; the cape covers the bottom.
    const bodyPts = [
      { x: bx - 10, y: top + 28 },
      { x: bx + 12, y: top + 28 },
      { x: bx + 16, y: top + 78 },
      { x: bx + 18, y: top + 130 },
      { x: bx + 4, y: top + 144 },
      { x: bx - 4, y: top + 130 },
      { x: bx - 6, y: top + 78 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(bodyPts, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      bodyPts.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(bx + 5, top + 80, 14, 50);
    g.fillStyle(ROBE_HI, 1);
    g.fillTriangle(bx + 8, top + 40, bx + 12, top + 40, bx + 14, top + 120);

    // 3) GOLD V-trim down the chest
    g.fillStyle(TRIM, 1);
    g.fillRect(bx + 2, top + 32, 2, 48);
    // Gold cabochon mid-chest
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 3, top + 46, 4);
    g.fillStyle(TRIM, 1);
    g.fillCircle(bx + 3, top + 46, 3);
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(bx + 3, top + 46, 1.6);

    // 4) HEAD — slightly tilted forward (lean)
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 2, top + 16, 11);
    g.fillStyle(SKIN, 1);
    g.fillCircle(bx + 2, top + 16, 9);
    // Slicked hair
    g.fillStyle(0x100614, 1);
    g.fillEllipse(bx + 2, top + 8, 20, 8);
    // Single red eye
    g.fillStyle(EYE, 1);
    g.fillRect(bx + 4, top + 16, 3, 2);
    // Closed eye (scar)
    g.fillStyle(0x6a1818, 1);
    g.fillRect(bx - 5, top + 15, 4, 1);

    // 5) RIGHT ARM extended forward + UP (casting / presenting pose).
    // Sleeve runs from shoulder out + slightly upward so the held mirror
    // reads as raised toward the player.
    g.fillStyle(OUT, 1);
    g.fillTriangle(bx + 14, top + 34, bx + 38, top + 50, bx + 32, top + 64);
    g.fillStyle(ROBE_DARK, 1);
    g.fillTriangle(bx + 14, top + 36, bx + 36, top + 50, bx + 32, top + 62);
    // Sleeve cuff (gold trim)
    g.fillStyle(TRIM, 1);
    g.fillRect(bx + 32, top + 52, 6, 2);

    // 6) HAND-MIRROR — oval head, handle gripped DIRECTLY in the hand.
    // Mirror is raised toward the player. Handle runs vertically through
    // the gripping fingers; oval head sits above.
    const mx = bx + 38;       // mirror center x
    const my = top + 36;      // mirror oval center y (above the hand)
    const rx = 7;             // oval half-width
    const ry = 11;            // oval half-height (taller than wide → hand-mirror)

    // Soft silver halo around the oval
    g.fillStyle(SILVER, 0.28);
    g.fillEllipse(mx, my, rx * 2 + 8, ry * 2 + 8);

    // Mirror frame (oval): outline → gold rim → glass
    g.fillStyle(OUT, 1);
    g.fillEllipse(mx, my, rx * 2 + 2, ry * 2 + 2);
    g.fillStyle(TRIM, 1);
    g.fillEllipse(mx, my, rx * 2, ry * 2);
    g.fillStyle(OUT, 1);
    g.fillEllipse(mx, my, rx * 2 - 3, ry * 2 - 3);
    g.fillStyle(SILVER, 1);
    g.fillEllipse(mx, my - 1, rx * 2 - 5, ry * 2 - 5);
    // Catchlight on glass
    g.fillStyle(SILVER_HI, 1);
    g.fillRect(mx - 3, my - 6, 2, 4);
    g.fillStyle(SILVER_HI, 0.7);
    g.fillRect(mx - 4, my - 1, 1, 3);

    // Top crown gem on the frame
    g.fillStyle(OUT, 1);
    g.fillCircle(mx, my - ry - 2, 2.5);
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(mx, my - ry - 2, 1.6);

    // Mirror handle — runs DOWN from the oval base through the hand grip.
    g.fillStyle(OUT, 1);
    g.fillRect(mx - 1.5, my + ry, 3, 18);
    g.fillStyle(TRIM, 1);
    g.fillRect(mx - 1, my + ry, 2, 18);
    // Handle pommel at bottom
    g.fillStyle(OUT, 1);
    g.fillCircle(mx, my + ry + 19, 2.5);
    g.fillStyle(TRIM, 1);
    g.fillCircle(mx, my + ry + 19, 1.8);

    // 7) HAND gripping the handle — drawn LAST so it sits over the handle.
    // Two skin-tone bumps suggest fingers wrapping around the metal.
    const hx = mx;
    const hy = my + ry + 9;
    g.fillStyle(0x402028, 1);  // hand outline (dark skin shadow)
    g.fillEllipse(hx, hy, 9, 6);
    g.fillStyle(SKIN, 1);
    g.fillEllipse(hx, hy, 7, 5);
    // Knuckle line
    g.fillStyle(0x402028, 0.6);
    g.fillRect(hx - 3, hy - 1, 6, 1);
  }

  /**
   * VARIANT B — Hooded Specter.
   * Slim tall vertical silhouette (no bell flare). Deep hood pulled fully
   * over the face, leaving a black void with two glowing pinpoints. Robe
   * falls in straight vertical panels with subtle vertical creases. Holds
   * an ornate hand-mirror at chest level — the "indirect-mirror" prop is
   * the signature element. Reads as ominous / quiet rather than dramatic.
   */
  private drawMarquisVariantHooded(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x000814;
    const ROBE_DARK = 0x0a0420;
    const ROBE = 0x281450;
    const ROBE_HI = 0x583890;
    const TRIM = 0xc0a050;
    const SILVER = 0xd0d8e8;
    const SILVER_HI = 0xffffff;
    const EYE = 0xff4060;

    const bx = cx;
    const top = cy - 86;

    // 1) HOOD + ROBE silhouette — narrow tall trapezoid, slight widening at
    // shoulders, straight-falling hem. NO flared bell.
    const outer = [
      { x: bx, y: top + 0 },           // hood peak (slight)
      { x: bx + 8, y: top + 8 },       // hood side
      { x: bx + 14, y: top + 28 },     // shoulder
      { x: bx + 20, y: top + 56 },     // arm-flare
      { x: bx + 18, y: top + 100 },    // taper
      { x: bx + 22, y: top + 158 },    // hem right
      { x: bx + 14, y: top + 168 },    // hem corner
      { x: bx, y: top + 166 },         // hem center
      { x: bx - 14, y: top + 168 },    // hem corner
      { x: bx - 22, y: top + 158 },    // hem left
      { x: bx - 18, y: top + 100 },
      { x: bx - 20, y: top + 56 },
      { x: bx - 14, y: top + 28 },
      { x: bx - 8, y: top + 8 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(outer, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      outer.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    // Mid robe tone vertical strip
    g.fillStyle(ROBE, 1);
    g.fillRect(bx - 12, top + 30, 24, 130);
    g.fillStyle(ROBE_HI, 0.55);
    g.fillRect(bx + 6, top + 30, 4, 120);

    // 2) HOOD VOID — face is a pure-black ellipse with two glowing pinpoints.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx, top + 24, 22, 26);
    // Trim on hood opening
    g.lineStyle(2, TRIM, 1);
    g.strokeEllipse(bx, top + 24, 22, 26);
    // Eyes — two narrow vertical pinpoints
    g.fillStyle(EYE, 1);
    g.fillRect(bx - 5, top + 22, 2, 4);
    g.fillRect(bx + 3, top + 22, 2, 4);

    // 3) Vertical robe creases — silver thread, suggests panel construction.
    g.fillStyle(TRIM, 0.6);
    for (const dx of [-12, -4, 4, 12]) {
      g.fillRect(bx + dx, top + 60, 1, 100);
    }

    // 4) GOLD chest sash + sapphire pin
    g.fillStyle(TRIM, 1);
    g.fillRect(bx - 14, top + 68, 28, 3);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top + 70, 3.5);
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(bx, top + 70, 2.2);

    // 5) ORNATE HAND-MIRROR held at chest level — signature prop.
    // Held in left hand peeking out from sleeve.
    const mx = bx - 10;
    const my = top + 100;
    // Sleeve cuff
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 16, top + 92, 8, 10);
    g.fillStyle(ROBE_DARK, 1);
    g.fillRect(bx - 15, top + 94, 7, 8);
    // Hand
    g.fillStyle(0xd8c0d0, 1);
    g.fillCircle(bx - 12, top + 102, 3);
    // Mirror handle
    g.fillStyle(OUT, 1);
    g.fillRect(mx - 1, my - 2, 2, 16);
    g.fillStyle(TRIM, 1);
    g.fillRect(mx, my - 2, 1, 16);
    // Mirror oval head
    g.fillStyle(OUT, 1);
    g.fillEllipse(mx, my - 8, 14, 18);
    g.fillStyle(SILVER, 1);
    g.fillEllipse(mx, my - 8, 11, 15);
    g.fillStyle(SILVER_HI, 1);
    g.fillRect(mx - 3, my - 12, 2, 3);
    // Mirror frame trim
    g.lineStyle(2, TRIM, 1);
    g.strokeEllipse(mx, my - 8, 14, 18);
    // Crowning gem on the frame
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(mx, my - 18, 1.8);
  }

  /**
   * VARIANT C — Mirage-Wing Lord.
   * Wide horizontal silhouette: bat-like cape spread asymmetrically wide
   * (left wing higher, right lower). Body itself is a slim rod in the
   * middle. Breaks the vertical-chess-piece feel ENTIRELY — the player
   * reads "wide creature" the moment they see it.
   */
  private drawMarquisVariantWinged(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x000814;
    const ROBE_DARK = 0x0a1020;
    const ROBE = 0x202c4c;
    const CAPE_DARK = 0x180020;
    const CAPE = 0x382850;
    const CAPE_HI = 0x6a4ad0;
    const TRIM = 0xc0a050;
    const SKIN = 0xc8b0c0;
    const EYE = 0xff4060;

    const bx = cx;
    const top = cy - 70;

    // 1) BAT-WING CAPE — drawn first, wide horizontal spread.
    // Left wing (higher, longer)
    const leftWing = [
      { x: bx - 4, y: top + 22 },
      { x: bx - 28, y: top + 12 },     // tip 1 — finger 1
      { x: bx - 38, y: top + 24 },     // valley
      { x: bx - 60, y: top + 16 },     // tip 2
      { x: bx - 64, y: top + 38 },     // valley
      { x: bx - 76, y: top + 36 },     // tip 3 (far end)
      { x: bx - 70, y: top + 56 },     // bottom edge
      { x: bx - 50, y: top + 60 },
      { x: bx - 30, y: top + 50 },
      { x: bx - 10, y: top + 56 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(leftWing, true);
    g.fillStyle(CAPE_DARK, 1);
    g.fillPoints(
      leftWing.map((p) => ({ x: p.x + 1, y: p.y })),
      true,
    );
    g.fillStyle(CAPE, 1);
    g.fillTriangle(bx - 8, top + 26, bx - 64, top + 30, bx - 16, top + 52);
    // Wing-bone struts (cape fingers)
    g.lineStyle(1.5, CAPE_HI, 0.8);
    g.beginPath();
    g.moveTo(bx - 6, top + 28);
    g.lineTo(bx - 28, top + 14);
    g.moveTo(bx - 6, top + 30);
    g.lineTo(bx - 60, top + 18);
    g.moveTo(bx - 6, top + 32);
    g.lineTo(bx - 76, top + 38);
    g.strokePath();

    // Right wing (lower, shorter — asymmetric)
    const rightWing = [
      { x: bx + 4, y: top + 26 },
      { x: bx + 22, y: top + 24 },
      { x: bx + 32, y: top + 38 },     // valley
      { x: bx + 50, y: top + 30 },     // tip 2
      { x: bx + 56, y: top + 50 },     // valley
      { x: bx + 64, y: top + 56 },     // tip 3 (far end, lower)
      { x: bx + 56, y: top + 76 },     // bottom edge
      { x: bx + 38, y: top + 78 },
      { x: bx + 18, y: top + 70 },
      { x: bx + 6, y: top + 70 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(rightWing, true);
    g.fillStyle(CAPE_DARK, 1);
    g.fillPoints(
      rightWing.map((p) => ({ x: p.x - 1, y: p.y })),
      true,
    );
    g.fillStyle(CAPE, 1);
    g.fillTriangle(bx + 8, top + 30, bx + 56, top + 44, bx + 12, top + 68);
    g.lineStyle(1.5, CAPE_HI, 0.8);
    g.beginPath();
    g.moveTo(bx + 6, top + 32);
    g.lineTo(bx + 22, top + 24);
    g.moveTo(bx + 6, top + 34);
    g.lineTo(bx + 50, top + 30);
    g.moveTo(bx + 6, top + 36);
    g.lineTo(bx + 64, top + 56);
    g.strokePath();

    // Mirror-glint accents — small white sparkles on cape edges
    for (const [px, py] of [
      [bx - 50, top + 24],
      [bx - 70, top + 44],
      [bx + 38, top + 36],
      [bx + 58, top + 60],
    ]) {
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(px, py, 1, 1);
    }

    // 2) BODY — slim vertical rod in the middle, no flare.
    const body = [
      { x: bx - 7, y: top + 24 },
      { x: bx + 7, y: top + 24 },
      { x: bx + 8, y: top + 80 },
      { x: bx + 10, y: top + 130 },
      { x: bx + 4, y: top + 142 },
      { x: bx - 4, y: top + 142 },
      { x: bx - 10, y: top + 130 },
      { x: bx - 8, y: top + 80 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(body, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      body.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillRect(bx - 6, top + 30, 12, 100);

    // Gold chest sash
    g.fillStyle(TRIM, 1);
    g.fillRect(bx - 7, top + 50, 14, 2);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top + 51, 2.5);
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(bx, top + 51, 1.5);

    // 3) HEAD — slim, slightly wider for vampire fang silhouette
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top + 14, 9);
    g.fillStyle(SKIN, 1);
    g.fillCircle(bx, top + 14, 7);
    // Slick hair top
    g.fillStyle(0x100614, 1);
    g.fillEllipse(bx, top + 8, 14, 5);
    // Two glowing eyes (fanged silhouette)
    g.fillStyle(EYE, 1);
    g.fillRect(bx - 4, top + 13, 2, 2);
    g.fillRect(bx + 2, top + 13, 2, 2);
    // Hint of bared fangs
    g.fillStyle(0xffffff, 1);
    g.fillRect(bx - 2, top + 17, 1, 2);
    g.fillRect(bx + 1, top + 17, 1, 2);
  }

  /**
   * VARIANT D — Shard-Crowned Sorcerer.
   * Tall narrow column robe, no flare. Above the head: a fan-crown of 5
   * mirror shards spiking up like a halo of broken glass. 3 free-floating
   * shard fragments orbit the body at chest level. Reads as cosmic-mage,
   * not figurine. Heavy emphasis on mirror motif.
   */
  private drawMarquisVariantShardCrown(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x000814;
    const ROBE_DARK = 0x0c1030;
    const ROBE = 0x1f2864;
    const ROBE_HI = 0x4858a0;
    const TRIM = 0xffd84a;
    const SKIN = 0xd8c0d0;
    const SILVER = 0xd0d8e8;
    const SILVER_HI = 0xffffff;
    const SHARD_DARK = 0x6890b0;
    const EYE = 0xff2040;

    const bx = cx;
    const top = cy - 90;

    // 1) SHARD-CROWN halo behind the head — 5 sharp triangle spikes fanning up.
    g.fillStyle(SILVER, 0.18);
    g.fillCircle(bx, top + 26, 36);
    const shards: Array<{ angle: number; len: number }> = [
      { angle: -Math.PI / 2 - 0.6, len: 30 },
      { angle: -Math.PI / 2 - 0.3, len: 36 },
      { angle: -Math.PI / 2, len: 42 },          // tallest center spike
      { angle: -Math.PI / 2 + 0.3, len: 36 },
      { angle: -Math.PI / 2 + 0.6, len: 30 },
    ];
    const cax = bx;
    const cay = top + 26;
    for (const s of shards) {
      const tipX = cax + Math.cos(s.angle) * s.len;
      const tipY = cay + Math.sin(s.angle) * s.len;
      const baseW = 4;
      const px1 = cax + Math.cos(s.angle + Math.PI / 2) * baseW;
      const py1 = cay + Math.sin(s.angle + Math.PI / 2) * baseW;
      const px2 = cax - Math.cos(s.angle + Math.PI / 2) * baseW;
      const py2 = cay - Math.sin(s.angle + Math.PI / 2) * baseW;
      g.fillStyle(OUT, 1);
      g.fillTriangle(tipX, tipY, px1, py1, px2, py2);
      g.fillStyle(SHARD_DARK, 1);
      g.fillTriangle(
        tipX, tipY,
        px1 + Math.cos(s.angle) * 2, py1 + Math.sin(s.angle) * 2,
        px2 + Math.cos(s.angle) * 2, py2 + Math.sin(s.angle) * 2,
      );
      g.fillStyle(SILVER, 1);
      g.fillTriangle(
        tipX - Math.cos(s.angle) * 2, tipY - Math.sin(s.angle) * 2,
        cax + Math.cos(s.angle) * 4, cay + Math.sin(s.angle) * 4,
        cax + Math.cos(s.angle + 0.2) * 8, cay + Math.sin(s.angle + 0.2) * 8,
      );
      // Crisp catchlight dot near tip
      g.fillStyle(SILVER_HI, 1);
      g.fillRect(
        tipX - Math.cos(s.angle) * 4 - 1,
        tipY - Math.sin(s.angle) * 4 - 1,
        1,
        1,
      );
    }

    // 2) ROBE — tall narrow straight column, no flare.
    const robe = [
      { x: bx - 12, y: top + 42 },
      { x: bx + 12, y: top + 42 },
      { x: bx + 14, y: top + 80 },
      { x: bx + 16, y: top + 130 },
      { x: bx + 16, y: top + 168 },
      { x: bx + 8, y: top + 174 },
      { x: bx, y: top + 172 },
      { x: bx - 8, y: top + 174 },
      { x: bx - 16, y: top + 168 },
      { x: bx - 16, y: top + 130 },
      { x: bx - 14, y: top + 80 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(robe, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      robe.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillRect(bx - 10, top + 46, 20, 124);
    g.fillStyle(ROBE_HI, 0.6);
    g.fillRect(bx + 4, top + 46, 4, 120);

    // Vertical gold embroidery stripes — pure mage-robe feel
    g.fillStyle(TRIM, 0.85);
    g.fillRect(bx - 10, top + 50, 1, 116);
    g.fillRect(bx + 9, top + 50, 1, 116);
    g.fillRect(bx - 1, top + 50, 1, 116);

    // 3) HEAD — pale, calm
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top + 32, 9);
    g.fillStyle(SKIN, 1);
    g.fillCircle(bx, top + 32, 7);
    // Long flowing hair behind shoulders
    g.fillStyle(0x100614, 1);
    g.fillEllipse(bx, top + 26, 16, 4);
    // Single red eye, calm
    g.fillStyle(EYE, 1);
    g.fillRect(bx - 4, top + 32, 2, 2);
    g.fillRect(bx + 2, top + 32, 2, 2);

    // 4) Gold collar
    g.fillStyle(TRIM, 1);
    g.fillRect(bx - 10, top + 42, 20, 2);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top + 50, 3);
    g.fillStyle(0x4ad8ff, 1);
    g.fillCircle(bx, top + 50, 1.8);

    // 5) ORBITAL SHARDS — 3 floating mirror fragments around the body.
    const orbs: Array<readonly [number, number, number, number]> = [
      [bx - 32, top + 90, 8, 0.5],     // x, y, size, angle
      [bx + 36, top + 110, 7, -0.4],
      [bx - 24, top + 142, 6, 0.2],
    ];
    for (const [ox, oy, sz, angle] of orbs) {
      const tipX = ox + Math.cos(angle) * sz;
      const tipY = oy + Math.sin(angle) * sz;
      const tipX2 = ox - Math.cos(angle) * sz;
      const tipY2 = oy - Math.sin(angle) * sz;
      g.fillStyle(SILVER, 0.30);
      g.fillCircle(ox, oy, sz + 4);
      g.fillStyle(OUT, 1);
      g.fillTriangle(tipX, tipY, tipX2, tipY2, ox + sz * 0.4, oy + sz * 1.2);
      g.fillStyle(SHARD_DARK, 1);
      g.fillTriangle(
        tipX - Math.cos(angle) * 0.7,
        tipY - Math.sin(angle) * 0.7,
        tipX2 + Math.cos(angle) * 0.7,
        tipY2 + Math.sin(angle) * 0.7,
        ox + sz * 0.3,
        oy + sz * 1.0,
      );
      g.fillStyle(SILVER_HI, 1);
      g.fillRect(ox - 1, oy - 1, 1, 1);
    }
  }

  // ===========================================================================
  // Page 7: Wizard sprite painterly redesigns
  //
  // Goal: bring the player sprite up to the same painted-silhouette quality
  // as the bosses + the room atmospheres. The current sprite is hard pixel-
  // art (PX-2 grid blocks, flat shading, hard outlines), which clashes with
  // the rest of the visual style now that levels + bosses have moved to
  // soft fillPoints silhouettes + multi-tone shading.
  //
  //   CURRENT  — live `tex-player` rendered at 4×, pixel-art reference
  //   A — SMOOTH PAINTER  : same wizard concept (witch hat, beard, robe),
  //                          painted with fillPoints + ellipses + 4-tone
  //                          shading. Same height as current.
  //   B — HOODED SAGE     : concept change — deep hood replaces witch hat,
  //                          face partially in shadow, mansion-floor mood.
  //   C — COMPACT WIZARD  : same painterly redesign as A but ~85 % scale,
  //                          tighter belt cinch, more heroic stance.
  //   D — APPRENTICE      : ~70 % scale, rounder proportions, wand actively
  //                          casting in front, "young mage" reading.
  // ===========================================================================

  private paintShowcaseWizardVariants(): void {
    const slots: Array<{
      title: string;
      lines: readonly string[];
      paint: (cx: number, cy: number) => void;
    }> = [
      {
        title: 'CURRENT  (PIXEL-ART)',
        lines: ['Hard PX-2 block grid,', 'flat shading + outlines,', 'clashes with painted bosses.'],
        paint: (cx, cy) => this.paintWizardCurrent(cx, cy),
      },
      {
        title: 'A — SMOOTH PAINTER',
        lines: [
          'Same concept, painterly.',
          'fillPoints silhouette,',
          '4-tone robe shading.',
        ],
        paint: (cx, cy) => this.drawWizardVariantSmooth(this.add.graphics(), cx, cy),
      },
      {
        title: 'B — HOODED SAGE',
        lines: [
          'Deep hood, face in shadow,',
          'mansion-floor mood.',
          'Beard tip + glowing eyes.',
        ],
        paint: (cx, cy) => this.drawWizardVariantHooded(this.add.graphics(), cx, cy),
      },
      {
        title: 'C — COMPACT WIZARD',
        lines: [
          '~85 % size, tighter cinch,',
          'heroic stance, painted.',
          'Most familiar redesign.',
        ],
        paint: (cx, cy) => this.drawWizardVariantCompact(this.add.graphics(), cx, cy),
      },
      {
        title: 'D — APPRENTICE',
        lines: [
          '~70 % size, rounder shape,',
          'wand casting forward,',
          '"young mage" reading.',
        ],
        paint: (cx, cy) => this.drawWizardVariantApprentice(this.add.graphics(), cx, cy),
      },
    ];

    const centers = [96, 288, 480, 672, 864];
    const slotHalfW = 86;
    const slotTopY = 110;
    const slotH = 350;
    const titleY = slotTopY + 14;
    const wizardY = slotTopY + 210;
    const descTopY = slotTopY + 280;

    for (let i = 0; i < slots.length; i++) {
      const sx = centers[i];
      const slot = slots[i];

      // Frame box — purple border to match wizard palette.
      const frame = this.add.graphics();
      frame.fillStyle(0x0a0418, 0.65);
      frame.fillRect(sx - slotHalfW, slotTopY, slotHalfW * 2, slotH);
      frame.lineStyle(1, 0x9a4cd8, 0.45);
      frame.strokeRect(sx - slotHalfW, slotTopY, slotHalfW * 2, slotH);

      // Floor shadow + warm pad.
      const pad = this.add.graphics();
      pad.fillStyle(0x000000, 0.55);
      pad.fillEllipse(sx, wizardY + 70, 78, 13);
      pad.fillStyle(0x9a4cd8, 0.16);
      pad.fillEllipse(sx, wizardY + 70, 56, 9);
      pad.fillStyle(0xffd84a, 0.20);
      pad.fillEllipse(sx, wizardY + 70, 26, 5);

      this.add
        .text(sx, titleY, slot.title, {
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#e9d5ff',
          stroke: '#1a0828',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0);

      slot.paint(sx, wizardY);

      for (let li = 0; li < slot.lines.length; li++) {
        this.add
          .text(sx, descTopY + li * 16, slot.lines[li], {
            fontSize: '11px',
            color: '#aab8c0',
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.9);
      }
    }
  }

  /**
   * Renders the live ingame Player texture at 4× scale so the comparison
   * against the painted variants is honest. Halo behind the sprite for
   * parity with the painted variants (which all bake their own glow).
   */
  private paintWizardCurrent(cx: number, cy: number): void {
    const halo = this.add.graphics();
    halo.fillStyle(0x9a4cd8, 0.10);
    halo.fillCircle(cx, cy, 80);
    halo.fillStyle(0x5a1f9a, 0.16);
    halo.fillCircle(cx, cy, 50);
    const img = this.add.image(cx, cy, TextureKeys.Player);
    img.setScale(4);
    halo.setDepth(img.depth - 1);
  }

  /**
   * VARIANT A — Smooth Painter.
   * Same wizard concept (pointed witch hat + white beard + purple robe +
   * gold belt + wand) but rendered with fillPoints silhouette + 4-tone
   * shading instead of the PX-2 pixel-block grid. Reads as the same
   * character, just painted in the same vocabulary as the bosses + walls.
   */
  private drawWizardVariantSmooth(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x1a0828;
    const HAT_DARK = 0x3a0f70;
    const HAT = 0x5a1f9a;
    const HAT_HI = 0x8a4fce;
    const ROBE_DARK = 0x3a0c68;
    const ROBE = 0x7a2cb8;
    const ROBE_HI = 0xa672e0;
    const SKIN = 0xf0c89a;
    const SKIN_SHADOW = 0xc89a6c;
    const BEARD = 0xf0f0f0;
    const BEARD_HI = 0xffffff;
    const BEARD_SHADOW = 0xb0b0b8;
    const BUCKLE = 0xffd84a;
    const WAND = 0xc89758;
    const TIP = 0xffd84a;
    const TIP_HALO = 0xfff8c0;
    const EYE = 0x222222;
    const BOOT = 0x2a1a0d;

    const bx = cx;
    const top = cy - 80;

    // 1) ROBE — bell silhouette, rounded shoulders, slight hem flare.
    const robeOuter = [
      { x: bx - 14, y: top + 64 },     // left shoulder
      { x: bx + 14, y: top + 64 },     // right shoulder
      { x: bx + 22, y: top + 100 },    // mid-side
      { x: bx + 32, y: top + 134 },    // hem-corner
      { x: bx + 26, y: top + 148 },    // hem inner
      { x: bx + 12, y: top + 152 },    // hem center-right
      { x: bx, y: top + 150 },         // hem center
      { x: bx - 12, y: top + 152 },    // hem center-left
      { x: bx - 26, y: top + 148 },    // hem inner left
      { x: bx - 32, y: top + 134 },
      { x: bx - 22, y: top + 100 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(robeOuter, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      robeOuter.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(bx, top + 110, 38, 60);
    g.fillEllipse(bx, top + 140, 50, 22);
    g.fillStyle(ROBE_HI, 0.7);
    g.fillEllipse(bx - 8, top + 100, 8, 36);

    // Belt with buckle — cinches the bell silhouette.
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 24, top + 116, 48, 7);
    g.fillStyle(BOOT, 1);
    g.fillRect(bx - 22, top + 117, 44, 5);
    g.fillStyle(BUCKLE, 1);
    g.fillRect(bx - 5, top + 117, 10, 6);
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 3, top + 119, 6, 2);

    // Hem outline accent (gold trim).
    g.fillStyle(BUCKLE, 0.85);
    g.fillRect(bx - 30, top + 144, 60, 2);

    // 2) BOOTS peeking out at the hem.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx - 9, top + 156, 12, 7);
    g.fillEllipse(bx + 9, top + 156, 12, 7);
    g.fillStyle(BOOT, 1);
    g.fillEllipse(bx - 9, top + 156, 10, 5);
    g.fillEllipse(bx + 9, top + 156, 10, 5);

    // 3) BEARD — soft rounded shape, multi-tone.
    const beardPts = [
      { x: bx - 10, y: top + 50 },
      { x: bx + 10, y: top + 50 },
      { x: bx + 14, y: top + 60 },
      { x: bx + 8, y: top + 72 },
      { x: bx, y: top + 76 },
      { x: bx - 8, y: top + 72 },
      { x: bx - 14, y: top + 60 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(beardPts, true);
    g.fillStyle(BEARD, 1);
    g.fillPoints(
      beardPts.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(BEARD_HI, 0.7);
    g.fillEllipse(bx - 4, top + 56, 4, 6);
    g.fillStyle(BEARD_SHADOW, 0.6);
    g.fillEllipse(bx + 5, top + 66, 5, 8);

    // 4) FACE strip above the beard.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx, top + 46, 18, 10);
    g.fillStyle(SKIN, 1);
    g.fillEllipse(bx, top + 46, 16, 8);
    g.fillStyle(SKIN_SHADOW, 0.8);
    g.fillRect(bx - 6, top + 49, 12, 1);
    // Eyes.
    g.fillStyle(EYE, 1);
    g.fillRect(bx - 5, top + 44, 2, 2);
    g.fillRect(bx + 3, top + 44, 2, 2);

    // 5) HAT — pointed cone with rounded brim, gold tip orb.
    const hat = [
      { x: bx, y: top + 0 },           // tip
      { x: bx + 4, y: top + 14 },
      { x: bx + 10, y: top + 28 },
      { x: bx + 16, y: top + 38 },     // brim corner right
      { x: bx + 22, y: top + 44 },     // brim outer right
      { x: bx + 14, y: top + 46 },     // brim under right
      { x: bx, y: top + 45 },          // brim under center
      { x: bx - 14, y: top + 46 },
      { x: bx - 22, y: top + 44 },
      { x: bx - 16, y: top + 38 },
      { x: bx - 10, y: top + 28 },
      { x: bx - 4, y: top + 14 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(hat, true);
    g.fillStyle(HAT_DARK, 1);
    g.fillPoints(
      hat.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(HAT, 1);
    g.fillTriangle(
      bx - 1, top + 4,
      bx + 8, top + 36,
      bx - 14, top + 38,
    );
    g.fillStyle(HAT_HI, 0.7);
    g.fillTriangle(
      bx - 2, top + 8,
      bx + 2, top + 8,
      bx - 8, top + 32,
    );
    // Gold tip orb at apex.
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top - 3, 4);
    g.fillStyle(BUCKLE, 1);
    g.fillCircle(bx, top - 3, 3);
    g.fillStyle(TIP_HALO, 1);
    g.fillRect(bx - 1, top - 5, 1, 1);
    // Brim shadow under hat.
    g.fillStyle(OUT, 0.6);
    g.fillEllipse(bx, top + 47, 32, 3);

    // 6) WAND peeking from behind the right shoulder.
    g.fillStyle(OUT, 1);
    g.fillRect(bx + 22, top + 32, 4, 38);
    g.fillStyle(WAND, 1);
    g.fillRect(bx + 23, top + 32, 2, 36);
    // Wand tip with halo.
    g.fillStyle(TIP_HALO, 0.45);
    g.fillCircle(bx + 24, top + 26, 9);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 24, top + 28, 5);
    g.fillStyle(TIP, 1);
    g.fillCircle(bx + 24, top + 28, 3.5);
    g.fillStyle(TIP_HALO, 1);
    g.fillRect(bx + 23, top + 27, 1, 1);
  }

  /**
   * VARIANT B — Hooded Sage.
   * Same robe/body but the pointed hat is replaced with a deep hood. Face
   * sits in shadow with only the beard tip and a pair of glowing eyes
   * visible. Reads as a more cryptic / sinister mage — fits the mansion
   * floor mood, but might be too "boss-aligned" for a player avatar.
   */
  private drawWizardVariantHooded(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x1a0828;
    const ROBE_DARK = 0x3a0c68;
    const ROBE = 0x7a2cb8;
    const ROBE_HI = 0xa672e0;
    const ROBE_HOOD = 0x2a0844;
    const SKIN = 0xf0c89a;
    const BEARD = 0xf0f0f0;
    const BEARD_SHADOW = 0xb0b0b8;
    const BUCKLE = 0xffd84a;
    const WAND = 0xc89758;
    const TIP = 0xffd84a;
    const TIP_HALO = 0xfff8c0;
    const EYE_GLOW = 0xa0d8ff;
    const BOOT = 0x2a1a0d;

    const bx = cx;
    const top = cy - 76;

    // 1) ROBE bell silhouette (same shape as A, slightly slimmer).
    const robeOuter = [
      { x: bx - 16, y: top + 56 },
      { x: bx + 16, y: top + 56 },
      { x: bx + 22, y: top + 92 },
      { x: bx + 30, y: top + 124 },
      { x: bx + 24, y: top + 142 },
      { x: bx, y: top + 146 },
      { x: bx - 24, y: top + 142 },
      { x: bx - 30, y: top + 124 },
      { x: bx - 22, y: top + 92 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(robeOuter, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      robeOuter.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(bx, top + 100, 38, 56);
    g.fillStyle(ROBE_HI, 0.6);
    g.fillEllipse(bx - 8, top + 92, 8, 32);

    // Hem trim.
    g.fillStyle(BUCKLE, 0.8);
    g.fillRect(bx - 28, top + 138, 56, 2);

    // Belt + buckle.
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 22, top + 110, 44, 6);
    g.fillStyle(BOOT, 1);
    g.fillRect(bx - 21, top + 111, 42, 4);
    g.fillStyle(BUCKLE, 1);
    g.fillRect(bx - 4, top + 111, 8, 4);

    // Boots.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx - 8, top + 150, 11, 6);
    g.fillEllipse(bx + 8, top + 150, 11, 6);
    g.fillStyle(BOOT, 1);
    g.fillEllipse(bx - 8, top + 150, 9, 4);
    g.fillEllipse(bx + 8, top + 150, 9, 4);

    // 2) HOOD + COWL — pulled deep over the head.
    const hood = [
      { x: bx - 6, y: top + 0 },       // hood crown peak
      { x: bx + 6, y: top + 0 },
      { x: bx + 14, y: top + 8 },
      { x: bx + 20, y: top + 24 },
      { x: bx + 22, y: top + 42 },     // shoulder-cowl right
      { x: bx + 16, y: top + 56 },     // hood meets robe
      { x: bx + 8, y: top + 50 },      // hood mouth right
      { x: bx, y: top + 48 },
      { x: bx - 8, y: top + 50 },
      { x: bx - 16, y: top + 56 },
      { x: bx - 22, y: top + 42 },
      { x: bx - 20, y: top + 24 },
      { x: bx - 14, y: top + 8 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(hood, true);
    g.fillStyle(ROBE_HOOD, 1);
    g.fillPoints(
      hood.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(bx, top + 26, 22, 36);
    g.fillStyle(ROBE_HI, 0.5);
    g.fillTriangle(bx - 12, top + 16, bx - 6, top + 16, bx - 14, top + 38);

    // Hood opening — pure-black void where the face sits.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx, top + 32, 18, 22);

    // Glowing eyes inside the void.
    g.fillStyle(EYE_GLOW, 1);
    g.fillRect(bx - 4, top + 30, 2, 3);
    g.fillRect(bx + 2, top + 30, 2, 3);

    // Beard tip peeking out the bottom of the hood.
    g.fillStyle(OUT, 1);
    g.fillTriangle(bx - 5, top + 42, bx + 5, top + 42, bx, top + 54);
    g.fillStyle(BEARD, 1);
    g.fillTriangle(bx - 4, top + 42, bx + 4, top + 42, bx, top + 52);
    g.fillStyle(BEARD_SHADOW, 0.7);
    g.fillRect(bx - 1, top + 46, 2, 5);
    void SKIN;

    // Wand peeking from right shoulder.
    g.fillStyle(OUT, 1);
    g.fillRect(bx + 22, top + 30, 4, 36);
    g.fillStyle(WAND, 1);
    g.fillRect(bx + 23, top + 30, 2, 34);
    g.fillStyle(TIP_HALO, 0.45);
    g.fillCircle(bx + 24, top + 24, 9);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 24, top + 26, 5);
    g.fillStyle(TIP, 1);
    g.fillCircle(bx + 24, top + 26, 3.5);
  }

  /**
   * VARIANT C — Compact Wizard.
   * Same painterly redesign as A but ~85 % scale, with a tighter belt
   * cinch and a slightly more heroic stance (legs visible, hat brim
   * pulled down). Best blend of "still recognisably the wizard" + "less
   * dominant on screen".
   */
  private drawWizardVariantCompact(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x1a0828;
    const HAT_DARK = 0x3a0f70;
    const HAT = 0x5a1f9a;
    const HAT_HI = 0x8a4fce;
    const ROBE_DARK = 0x3a0c68;
    const ROBE = 0x7a2cb8;
    const ROBE_HI = 0xa672e0;
    const SKIN = 0xf0c89a;
    const SKIN_SHADOW = 0xc89a6c;
    const BEARD = 0xf0f0f0;
    const BEARD_SHADOW = 0xb0b0b8;
    const BUCKLE = 0xffd84a;
    const WAND = 0xc89758;
    const TIP = 0xffd84a;
    const TIP_HALO = 0xfff8c0;
    const EYE = 0x222222;
    const BOOT = 0x2a1a0d;

    const bx = cx;
    const top = cy - 68;

    // ROBE — slightly shorter + tighter than A.
    const robeOuter = [
      { x: bx - 12, y: top + 54 },
      { x: bx + 12, y: top + 54 },
      { x: bx + 19, y: top + 84 },
      { x: bx + 28, y: top + 116 },
      { x: bx + 22, y: top + 130 },
      { x: bx, y: top + 132 },
      { x: bx - 22, y: top + 130 },
      { x: bx - 28, y: top + 116 },
      { x: bx - 19, y: top + 84 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(robeOuter, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      robeOuter.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(bx, top + 92, 32, 50);
    g.fillStyle(ROBE_HI, 0.65);
    g.fillEllipse(bx - 6, top + 86, 7, 28);

    // Tighter belt cinch.
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 18, top + 100, 36, 7);
    g.fillStyle(BOOT, 1);
    g.fillRect(bx - 17, top + 101, 34, 5);
    g.fillStyle(BUCKLE, 1);
    g.fillRect(bx - 4, top + 102, 8, 5);
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 2, top + 104, 4, 1);

    // Gold hem trim.
    g.fillStyle(BUCKLE, 0.85);
    g.fillRect(bx - 26, top + 124, 52, 2);

    // Boots — slightly more visible (heroic stance).
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx - 8, top + 136, 11, 7);
    g.fillEllipse(bx + 8, top + 136, 11, 7);
    g.fillStyle(BOOT, 1);
    g.fillEllipse(bx - 8, top + 136, 9, 5);
    g.fillEllipse(bx + 8, top + 136, 9, 5);

    // BEARD — slightly shorter.
    const beardPts = [
      { x: bx - 8, y: top + 42 },
      { x: bx + 8, y: top + 42 },
      { x: bx + 12, y: top + 50 },
      { x: bx + 6, y: top + 60 },
      { x: bx, y: top + 62 },
      { x: bx - 6, y: top + 60 },
      { x: bx - 12, y: top + 50 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(beardPts, true);
    g.fillStyle(BEARD, 1);
    g.fillPoints(
      beardPts.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(BEARD_SHADOW, 0.55);
    g.fillEllipse(bx + 4, top + 54, 4, 6);

    // FACE.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx, top + 38, 16, 9);
    g.fillStyle(SKIN, 1);
    g.fillEllipse(bx, top + 38, 14, 7);
    g.fillStyle(SKIN_SHADOW, 0.8);
    g.fillRect(bx - 5, top + 41, 10, 1);
    g.fillStyle(EYE, 1);
    g.fillRect(bx - 4, top + 36, 2, 2);
    g.fillRect(bx + 2, top + 36, 2, 2);

    // HAT — slightly smaller cone.
    const hat = [
      { x: bx, y: top + 0 },
      { x: bx + 3, y: top + 12 },
      { x: bx + 8, y: top + 22 },
      { x: bx + 14, y: top + 30 },
      { x: bx + 20, y: top + 36 },
      { x: bx + 12, y: top + 38 },
      { x: bx, y: top + 37 },
      { x: bx - 12, y: top + 38 },
      { x: bx - 20, y: top + 36 },
      { x: bx - 14, y: top + 30 },
      { x: bx - 8, y: top + 22 },
      { x: bx - 3, y: top + 12 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(hat, true);
    g.fillStyle(HAT_DARK, 1);
    g.fillPoints(
      hat.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(HAT, 1);
    g.fillTriangle(
      bx - 1, top + 3,
      bx + 6, top + 28,
      bx - 12, top + 30,
    );
    g.fillStyle(HAT_HI, 0.7);
    g.fillTriangle(
      bx - 2, top + 6,
      bx + 1, top + 6,
      bx - 6, top + 26,
    );
    // Gold tip orb.
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top - 3, 3.5);
    g.fillStyle(BUCKLE, 1);
    g.fillCircle(bx, top - 3, 2.5);
    // Brim shadow.
    g.fillStyle(OUT, 0.6);
    g.fillEllipse(bx, top + 39, 28, 2);

    // WAND held FORWARD in front of the body, hand at chest level — same
    // pose-idiom as D but with a less extreme tilt: tip points up-right
    // toward the upper edge of the figure instead of nearly horizontal.
    // Tapered triangle: narrow held-end (lower-left), wider at the tip
    // (upper-right) so the gold orb reads as a natural cap on the wand.
    g.fillStyle(OUT, 1);
    g.fillTriangle(bx + 6, top + 86, bx + 28, top + 50, bx + 30, top + 56);
    g.fillStyle(WAND, 1);
    g.fillTriangle(bx + 6, top + 87, bx + 27, top + 51, bx + 28, top + 55);

    // HAND on the wand at chest level — no full arm/sleeve, the arm is
    // implied to come from the body to the wand grip (D's idiom).
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 14, top + 74, 4);
    g.fillStyle(SKIN, 1);
    g.fillCircle(bx + 14, top + 74, 3);
    g.fillStyle(SKIN_SHADOW, 0.7);
    g.fillRect(bx + 13, top + 75, 3, 1);

    // WAND TIP — gold orb + halo + sparkle ring. Sits OVER the wand wide
    // end so the magical glow reads as "tip lit up".
    g.fillStyle(TIP_HALO, 0.55);
    g.fillCircle(bx + 29, top + 53, 11);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 29, top + 53, 5);
    g.fillStyle(TIP, 1);
    g.fillCircle(bx + 29, top + 53, 3.5);
    g.fillStyle(TIP_HALO, 1);
    g.fillRect(bx + 28, top + 52, 1, 1);
    // Sparkle ring around the tip.
    for (const [dx, dy] of [
      [-8, -3],
      [9, -2],
      [3, -10],
      [-2, 9],
      [10, 6],
    ] as const) {
      g.fillStyle(TIP_HALO, 0.85);
      g.fillRect(bx + 29 + dx, top + 53 + dy, 1, 1);
    }
  }

  /**
   * VARIANT D — Apprentice.
   * Significantly smaller (~70 %), rounder proportions, wand actively
   * casting forward (one hand visible holding the wand mid-air with a
   * bright tip burst). Reads "young mage" / hero-pose. Most distinct
   * from the bosses' tall bell silhouettes.
   */
  private drawWizardVariantApprentice(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ): void {
    const OUT = 0x1a0828;
    const HAT_DARK = 0x3a0f70;
    const HAT = 0x5a1f9a;
    const HAT_HI = 0x8a4fce;
    const ROBE_DARK = 0x3a0c68;
    const ROBE = 0x7a2cb8;
    const ROBE_HI = 0xa672e0;
    const SKIN = 0xf0c89a;
    const SKIN_SHADOW = 0xc89a6c;
    const BEARD = 0xf0f0f0;
    const BUCKLE = 0xffd84a;
    const WAND = 0xc89758;
    const TIP = 0xffd84a;
    const TIP_HALO = 0xfff8c0;
    const EYE = 0x222222;
    const BOOT = 0x2a1a0d;

    const bx = cx;
    const top = cy - 56;

    // SHORT ROBE — egg-shaped, no exaggerated hem.
    const robeOuter = [
      { x: bx - 10, y: top + 44 },
      { x: bx + 10, y: top + 44 },
      { x: bx + 17, y: top + 70 },
      { x: bx + 22, y: top + 96 },
      { x: bx + 14, y: top + 108 },
      { x: bx, y: top + 110 },
      { x: bx - 14, y: top + 108 },
      { x: bx - 22, y: top + 96 },
      { x: bx - 17, y: top + 70 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(robeOuter, true);
    g.fillStyle(ROBE_DARK, 1);
    g.fillPoints(
      robeOuter.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(ROBE, 1);
    g.fillEllipse(bx, top + 78, 28, 38);
    g.fillStyle(ROBE_HI, 0.7);
    g.fillEllipse(bx - 5, top + 72, 6, 22);

    // Belt with buckle.
    g.fillStyle(OUT, 1);
    g.fillRect(bx - 15, top + 84, 30, 5);
    g.fillStyle(BOOT, 1);
    g.fillRect(bx - 14, top + 85, 28, 3);
    g.fillStyle(BUCKLE, 1);
    g.fillRect(bx - 3, top + 85, 6, 3);

    // Boots.
    g.fillStyle(OUT, 1);
    g.fillEllipse(bx - 7, top + 113, 9, 5);
    g.fillEllipse(bx + 7, top + 113, 9, 5);
    g.fillStyle(BOOT, 1);
    g.fillEllipse(bx - 7, top + 113, 7, 3);
    g.fillEllipse(bx + 7, top + 113, 7, 3);

    // Smaller beard — short tuft.
    const beardPts = [
      { x: bx - 5, y: top + 36 },
      { x: bx + 5, y: top + 36 },
      { x: bx + 7, y: top + 42 },
      { x: bx, y: top + 50 },
      { x: bx - 7, y: top + 42 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(beardPts, true);
    g.fillStyle(BEARD, 1);
    g.fillPoints(
      beardPts.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );

    // ROUND face.
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top + 32, 8);
    g.fillStyle(SKIN, 1);
    g.fillCircle(bx, top + 32, 7);
    g.fillStyle(SKIN_SHADOW, 0.7);
    g.fillRect(bx - 4, top + 35, 8, 1);
    g.fillStyle(EYE, 1);
    g.fillRect(bx - 3, top + 30, 2, 2);
    g.fillRect(bx + 1, top + 30, 2, 2);

    // SHORTER HAT.
    const hat = [
      { x: bx, y: top + 0 },
      { x: bx + 2, y: top + 8 },
      { x: bx + 7, y: top + 18 },
      { x: bx + 14, y: top + 26 },
      { x: bx + 8, y: top + 28 },
      { x: bx, y: top + 27 },
      { x: bx - 8, y: top + 28 },
      { x: bx - 14, y: top + 26 },
      { x: bx - 7, y: top + 18 },
      { x: bx - 2, y: top + 8 },
    ];
    g.fillStyle(OUT, 1);
    g.fillPoints(hat, true);
    g.fillStyle(HAT_DARK, 1);
    g.fillPoints(
      hat.map((p) => ({ x: p.x, y: p.y + 1 })),
      true,
    );
    g.fillStyle(HAT, 1);
    g.fillTriangle(bx - 1, top + 2, bx + 5, top + 22, bx - 8, top + 24);
    g.fillStyle(HAT_HI, 0.7);
    g.fillTriangle(bx - 2, top + 4, bx + 0, top + 4, bx - 5, top + 20);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx, top - 2, 3);
    g.fillStyle(BUCKLE, 1);
    g.fillCircle(bx, top - 2, 2);
    // Brim shadow.
    g.fillStyle(OUT, 0.5);
    g.fillEllipse(bx, top + 29, 22, 2);

    // 6) WAND held forward + hand visible. Wand crosses the body diagonally
    // at chest height — clearer "casting" hero-read than the over-shoulder
    // peek of A/C.
    g.fillStyle(OUT, 1);
    g.fillTriangle(bx + 4, top + 60, bx + 32, top + 50, bx + 30, top + 56);
    g.fillStyle(WAND, 1);
    g.fillTriangle(bx + 4, top + 61, bx + 30, top + 51, bx + 28, top + 55);
    // Hand wrapping wand mid-shaft.
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 14, top + 56, 4.5);
    g.fillStyle(SKIN, 1);
    g.fillCircle(bx + 14, top + 56, 3.5);
    // Wand tip burst.
    g.fillStyle(TIP_HALO, 0.55);
    g.fillCircle(bx + 32, top + 50, 11);
    g.fillStyle(OUT, 1);
    g.fillCircle(bx + 32, top + 50, 5);
    g.fillStyle(TIP, 1);
    g.fillCircle(bx + 32, top + 50, 3.5);
    g.fillStyle(TIP_HALO, 1);
    g.fillRect(bx + 31, top + 49, 1, 1);
    // Sparkle ring.
    for (const [dx, dy] of [
      [-8, -4],
      [9, -3],
      [4, -10],
      [-3, 9],
      [10, 6],
    ] as const) {
      g.fillStyle(TIP_HALO, 0.85);
      g.fillRect(bx + 32 + dx, top + 50 + dy, 1, 1);
    }
  }
}

/** Quadratic BÃ©zier point on axis: p0 + (p1-p0)Â·2t(1-t) + (p2-p0)Â·tÂ². */
function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}
