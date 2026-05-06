import Phaser from 'phaser';
import { TILE_SIZE, gemTextureKey } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { FLOORS, type FloorId } from '../data/floors';
import { EventBus } from '../utils/EventBus';

/** Floor gems that count toward sealing the Onyx fight, in display order. */
const REQUIRED_GEM_FLOORS: readonly FloorId[] = [
  'emerald-forest',
  'sapphire-swamp',
  'onyx-mansion',
];

const SEAL_WIDTH = 84;
const SEAL_HEIGHT = 60;
/** Cooldown between hint-text reshows so a player parked on the trigger
 * doesn't spam the toast. */
const HINT_COOLDOWN_MS = 1500;

/**
 * Stone altar that sits in the back of the Onyx Vampire room after the
 * Twins die. Has 3 sockets (one per floor gem). Player overlap with all 3
 * gems collected → activation animation + `seal:activated` event (Lord
 * Onyx room transition wires here, Phase 5 Chunk 4 #3). Without all 3 →
 * floating "X / 3" hint.
 *
 * Owns its own visual (Container with frame + socket sprites), an Arcade
 * physics zone for the trigger overlap, and the activation/hint state
 * machine. `destroy()` cleans both up.
 */
export class GemSeal {
  /** Trigger zone the player physics-overlaps with. */
  readonly trigger: Phaser.GameObjects.Zone;

  private readonly scene: Phaser.Scene;
  /** Mutable internal copy — `addGem` mutates after construction so the
   * seal can flip a socket from empty → filled live when the player picks
   * up the Onyx gem in the same room. */
  private readonly ownedGems: Set<string>;
  private readonly visuals: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private activated = false;
  private nextHintAt = 0;
  /** Active hint label, kept so a re-show within cooldown can replace it. */
  private hintLabel: Phaser.GameObjects.Text | null = null;
  /** Per-floor socket plate sprite + (optional) halo, kept so `addGem` can
   * upgrade an empty plate to filled in place. */
  private readonly socketSprites = new Map<
    string,
    { plate: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Arc | null }
  >();

  constructor(scene: Phaser.Scene, x: number, y: number, ownedGems: ReadonlySet<string>) {
    this.scene = scene;
    this.ownedGems = new Set(ownedGems);

    // Visuals — single Container at (x, y), depth slightly above floor decos
    // so the player + projectiles render *over* the seal (no occlusion).
    this.visuals = scene.add.container(x, y);
    this.visuals.setDepth(DepthLayers.FloorDecoration + 2);

    this.graphics = scene.add.graphics();
    this.drawFrame(this.graphics);
    this.visuals.add(this.graphics);

    // Socket gems (one per floor in REQUIRED_GEM_FLOORS). Spaced evenly
    // across the central socket band; offset is symmetric around 0 (the
    // container's local origin is the seal center).
    const spacing = 24;
    const startX = -spacing;
    const socketY = -2;
    for (let i = 0; i < REQUIRED_GEM_FLOORS.length; i++) {
      const floorId = REQUIRED_GEM_FLOORS[i];
      const sx = startX + i * spacing;
      const plate = scene.add.image(sx, socketY, gemTextureKey(floorId));
      plate.setScale(1.0);
      let halo: Phaser.GameObjects.Arc | null = null;
      if (this.ownedGems.has(floorId)) {
        plate.setAlpha(1);
        halo = this.makeFilledHalo(sx, socketY, floorId);
      } else {
        // Empty — desaturated + dimmed so the missing slot is obvious
        plate.setAlpha(0.18);
        plate.setTintFill(0x1a0c20);
      }
      this.visuals.add(plate);
      this.socketSprites.set(floorId, { plate, halo });
    }

    // Trigger zone — broader than the seal frame so the player doesn't have
    // to tap pixel-perfect. ~1.5 tiles in front of the seal.
    this.trigger = scene.add.zone(x, y + TILE_SIZE * 0.4, SEAL_WIDTH + 16, TILE_SIZE * 1.5);
    scene.physics.add.existing(this.trigger, true);
  }

  /**
   * Live-insert a gem into the matching socket. Called by GameScene when
   * the player picks up a gem while the seal exists in the same room (the
   * Onyx no-hit drop). Animates a copy of the gem flying from the pickup
   * point into the socket, then upgrades the empty plate in place.
   * No-op if the floor isn't a required gem or the gem is already inserted.
   */
  addGem(floorId: string, fromX: number, fromY: number): void {
    if (!REQUIRED_GEM_FLOORS.includes(floorId as FloorId)) return;
    if (this.ownedGems.has(floorId)) return;
    const socket = this.socketSprites.get(floorId);
    if (!socket) return;
    this.ownedGems.add(floorId);

    // World-space socket position (container is at this.visuals.x/y; the
    // socket plate is at local sx/socketY relative to it).
    const targetX = this.visuals.x + socket.plate.x;
    const targetY = this.visuals.y + socket.plate.y;

    // Flying gem: a sibling sprite in world coords (NOT in the container
    // — we want it to live in the world transform until it lands).
    const flyer = this.scene.add
      .image(fromX, fromY, gemTextureKey(floorId))
      .setScale(1.6 * 1)
      .setDepth(DepthLayers.HUD - 2);
    const haloColor = FLOORS[floorId as FloorId]?.palette.glow ?? 0xffffff;
    const flyerHalo = this.scene.add
      .circle(fromX, fromY, 12, haloColor, 0.5)
      .setDepth(DepthLayers.HUD - 3);

    // Curve via a quadratic-ish path: midpoint lifted upward so the gem
    // arcs into the socket instead of dragging across the floor.
    const midX = (fromX + targetX) / 2;
    const midY = Math.min(fromY, targetY) - 60;
    const duration = 520;
    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        // Quadratic Bézier: (1-t)²P0 + 2(1-t)tP1 + t²P2
        const u = 1 - t;
        const x = u * u * fromX + 2 * u * t * midX + t * t * targetX;
        const y = u * u * fromY + 2 * u * t * midY + t * t * targetY;
        flyer.setPosition(x, y);
        flyerHalo.setPosition(x, y);
        // Scale shrinks slightly toward the socket so it "settles in".
        const s = 1.6 - t * 0.5;
        flyer.setScale(s);
        flyerHalo.setScale(s);
      },
      onComplete: () => {
        flyer.destroy();
        flyerHalo.destroy();
        this.fillSocket(floorId);
      },
    });
  }

  /**
   * Upgrade a socket from empty (dim/tinted) to filled (bright + halo).
   * Splits out from `addGem` so the activation cinematic could call it
   * directly without a fly-in if needed.
   */
  private fillSocket(floorId: string): void {
    const socket = this.socketSprites.get(floorId);
    if (!socket) return;
    socket.plate.clearTint();
    socket.plate.setAlpha(1);
    socket.halo = this.makeFilledHalo(socket.plate.x, socket.plate.y, floorId);
    // Punch-in pulse on socket fill so the moment of insertion reads.
    this.scene.tweens.add({
      targets: socket.plate,
      scale: { from: 1.6, to: 1.0 },
      duration: 240,
      ease: 'Back.Out',
    });
  }

  private makeFilledHalo(
    sx: number,
    sy: number,
    floorId: string,
  ): Phaser.GameObjects.Arc {
    const haloColor = FLOORS[floorId as FloorId]?.palette.glow ?? 0xffffff;
    const halo = this.scene.add.circle(sx, sy, 14, haloColor, 0.18);
    this.visuals.add(halo);
    // Place halo behind plate (containers preserve add order — plate added
    // first means halo lands on top; move halo to slot 1 to put it under).
    // Phaser's `moveBelow` types want the same subtype for both args; cast
    // to GameObject so a circle vs image pair compiles.
    const plate = this.socketSprites.get(floorId)?.plate;
    if (plate) {
      this.visuals.moveBelow(
        halo as Phaser.GameObjects.GameObject,
        plate as Phaser.GameObjects.GameObject,
      );
    }
    this.scene.tweens.add({
      targets: halo,
      alpha: { from: 0.18, to: 0.32 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return halo;
  }

  /**
   * Player walked onto the trigger. If all 3 gems are present → run the
   * activation sequence + emit `seal:activated`. Otherwise → show the
   * "X / 3" hint (rate-limited so it doesn't spam).
   */
  tryActivate(): void {
    if (this.activated) return;
    const owned = this.countOwned();
    const total = REQUIRED_GEM_FLOORS.length;
    if (owned === total) {
      this.activated = true;
      this.runActivationSequence();
      EventBus.emit('seal:activated', {
        x: this.visuals.x,
        y: this.visuals.y,
      });
      return;
    }
    const now = this.scene.time.now;
    if (now < this.nextHintAt) return;
    this.nextHintAt = now + HINT_COOLDOWN_MS;
    this.showHint(owned, total);
    EventBus.emit('seal:hintShown', { owned, total });
  }

  destroy(): void {
    this.trigger.destroy();
    this.visuals.destroy();
    if (this.hintLabel) {
      this.hintLabel.destroy();
      this.hintLabel = null;
    }
  }

  // --- Drawing -------------------------------------------------------------

  private drawFrame(g: Phaser.GameObjects.Graphics): void {
    const w = SEAL_WIDTH;
    const h = SEAL_HEIGHT;
    const x0 = -w / 2;
    const y0 = -h / 2;
    const STONE_OUT = 0x080014;
    const STONE_DARK = 0x1a0c28;
    const STONE = 0x261438;
    const STONE_HI = 0x4a2a44;
    const GOLD_DARK = 0x7a5018;
    const GOLD = 0xffc850;
    const GOLD_HI = 0xfff0a8;
    const RUNE = 0xc864ff;

    // Footing / base shadow
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(0, h / 2 + 6, w - 8, 8);

    // Outer stone slab
    g.fillStyle(STONE_OUT, 1);
    g.fillRect(x0, y0, w, h);
    g.fillStyle(STONE_DARK, 1);
    g.fillRect(x0 + 1, y0 + 1, w - 2, h - 2);
    g.fillStyle(STONE, 1);
    g.fillRect(x0 + 3, y0 + 3, w - 6, h - 6);
    // Stone highlight (top-left lighting)
    g.fillStyle(STONE_HI, 1);
    g.fillRect(x0 + 3, y0 + 3, w - 6, 1);
    g.fillRect(x0 + 3, y0 + 3, 1, h - 6);

    // Gold molding around the frame
    g.fillStyle(GOLD_DARK, 1);
    g.fillRect(x0 + 2, y0 + 2, w - 4, 2);
    g.fillRect(x0 + 2, y0 + h - 4, w - 4, 2);
    g.fillRect(x0 + 2, y0 + 2, 2, h - 4);
    g.fillRect(x0 + w - 4, y0 + 2, 2, h - 4);
    g.fillStyle(GOLD, 1);
    g.fillRect(x0 + 2, y0 + 2, w - 4, 1);
    g.fillRect(x0 + 2, y0 + 2, 1, h - 4);
    g.fillStyle(GOLD_HI, 1);
    g.fillRect(x0 + 4, y0 + 3, w - 8, 1);

    // Socket recesses — 3 dark inset rectangles where the gem sprites sit
    const spacing = 24;
    const startX = -spacing;
    for (let i = 0; i < REQUIRED_GEM_FLOORS.length; i++) {
      const sx = startX + i * spacing - 11;
      const sy = -13;
      g.fillStyle(STONE_OUT, 1);
      g.fillRect(sx, sy, 22, 22);
      g.fillStyle(0x100620, 1);
      g.fillRect(sx + 1, sy + 1, 20, 20);
      // Gold socket trim
      g.fillStyle(GOLD_DARK, 1);
      g.fillRect(sx, sy, 22, 1);
      g.fillRect(sx, sy + 21, 22, 1);
      g.fillRect(sx, sy, 1, 22);
      g.fillRect(sx + 21, sy, 1, 22);
    }

    // Bottom rune band — 3 small carved sigils
    const runeY = h / 2 - 8;
    for (const rx of [-22, 0, 22]) {
      g.fillStyle(STONE_OUT, 1);
      g.fillRect(rx - 2, runeY, 5, 5);
      g.fillStyle(RUNE, 0.55);
      g.fillRect(rx - 1, runeY + 1, 3, 3);
      g.fillStyle(RUNE, 1);
      g.fillRect(rx, runeY + 2, 1, 1);
    }
  }

  // --- Interaction ---------------------------------------------------------

  private countOwned(): number {
    let n = 0;
    for (const floorId of REQUIRED_GEM_FLOORS) {
      if (this.ownedGems.has(floorId)) n++;
    }
    return n;
  }

  /**
   * Floating "X / 3 trophies" message above the seal. Auto-fades after
   * ~1.4s. Replaces an in-flight hint if one's still on screen.
   */
  private showHint(owned: number, total: number): void {
    if (this.hintLabel) {
      this.hintLabel.destroy();
      this.hintLabel = null;
    }
    const text = `${owned} / ${total} trophies`;
    const label = this.scene.add
      .text(this.visuals.x, this.visuals.y - SEAL_HEIGHT / 2 - 14, text, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffd0a0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(DepthLayers.HUD - 1);
    this.hintLabel = label;
    this.scene.tweens.add({
      targets: label,
      y: label.y - 12,
      alpha: { from: 1, to: 0 },
      duration: 1400,
      ease: 'Sine.Out',
      onComplete: () => {
        label.destroy();
        if (this.hintLabel === label) this.hintLabel = null;
      },
    });
  }

  /**
   * Activation cinematic — sockets pulse-flash gold one by one (E → S → O),
   * then a big radial burst + camera shake. Fast enough that the
   * `seal:activated` event downstream can react quickly.
   */
  private runActivationSequence(): void {
    const flashes = [-24, 0, 24]; // socket x positions
    flashes.forEach((sx, idx) => {
      this.scene.time.delayedCall(idx * 180, () => {
        const ring = this.scene.add
          .circle(this.visuals.x + sx, this.visuals.y - 2, 4, 0xfff0a8, 1)
          .setDepth(DepthLayers.HUD - 2);
        this.scene.tweens.add({
          targets: ring,
          radius: 18,
          alpha: 0,
          duration: 360,
          ease: 'Sine.Out',
          onUpdate: () => ring.setScale(ring.scale),
          onComplete: () => ring.destroy(),
        });
      });
    });

    // Final burst after the 3 socket pulses (3 × 180 ms + buffer = 700 ms)
    this.scene.time.delayedCall(700, () => {
      const burst = this.scene.add
        .circle(this.visuals.x, this.visuals.y, 6, 0xc864ff, 1)
        .setDepth(DepthLayers.HUD - 2);
      this.scene.tweens.add({
        targets: burst,
        scale: 14,
        alpha: 0,
        duration: 520,
        ease: 'Sine.Out',
        onComplete: () => burst.destroy(),
      });
      this.scene.cameras.main.flash(220, 200, 100, 240, false);
      this.scene.cameras.main.shake(280, 0.008);
    });
  }
}
