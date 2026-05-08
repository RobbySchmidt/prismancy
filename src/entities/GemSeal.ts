import Phaser from 'phaser';
import { TILE_SIZE, gemTextureKey } from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { FLOORS, type FloorId } from '../data/floors';
import { EventBus, type GameEvents } from '../utils/EventBus';

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
/** Duration for the gem to fly from its altar socket into the boss's
 * prism when a Prism Special charges. Lands ~400ms before the charge
 * window ends, so the prism visibly absorbs the gem before the pattern
 * fires. */
const SPECIAL_GEM_FLY_DURATION_MS = 800;
/** Map a phase index (1/2/3) to the floor whose gem the special consumes.
 * Mirrors the floor-progression order so Phase 1 = Emerald (Floor 1)
 * etc — narratively, each gem powers the special tied to its origin. */
const PHASE_TO_FLOOR: Record<1 | 2 | 3, FloorId> = {
  1: 'emerald-forest',
  2: 'sapphire-swamp',
  3: 'onyx-mansion',
};

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
  /** Gems the player currently has in their inventory and could place into
   * the seal. Mutable — `markGemAvailable` adds when the player picks up
   * a gem mid-room, and `tryInteract` reads from this to decide whether
   * 3/3 placement can run. The seal's own `placedGems` is the separate
   * "what's actually in the sockets" set. */
  private readonly availableGems: Set<string>;
  /** Gems that have been physically placed into sockets (by [E] activation
   * animation). Drives the visuals + the consume-on-special pipeline. */
  private readonly placedGems = new Set<string>();
  private readonly visuals: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private activated = false;
  private nextHintAt = 0;
  /** Active hint label, kept so a re-show within cooldown can replace it. */
  private hintLabel: Phaser.GameObjects.Text | null = null;
  /** Floating "[E] PLACE GEMS" prompt. Visible whenever the player is in
   * range and the seal hasn't been activated yet. Owned + tweened by the
   * seal so its lifetime tracks `setInRange`. */
  private prompt: Phaser.GameObjects.Text | null = null;
  private inRange = false;
  /** Per-floor socket plate sprite + (optional) halo, kept so `addGem` can
   * upgrade an empty plate to filled in place. */
  private readonly socketSprites = new Map<
    string,
    { plate: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Arc | null }
  >();
  /** Sockets whose gem has already been consumed by a Prism Special.
   * Sticky so a stale `addGem` can't re-fill the slot. */
  private readonly consumedSockets = new Set<string>();
  private readonly specialFiredHandler: (
    payload: GameEvents['lordOnyx:specialFired'],
  ) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, ownedGems: ReadonlySet<string>) {
    this.scene = scene;
    this.availableGems = new Set(ownedGems);

    // Visuals — single Container at (x, y), depth slightly above floor decos
    // so the player + projectiles render *over* the seal (no occlusion).
    this.visuals = scene.add.container(x, y);
    this.visuals.setDepth(DepthLayers.FloorDecoration + 2);

    this.graphics = scene.add.graphics();
    this.drawFrame(this.graphics);
    this.visuals.add(this.graphics);

    // Socket gems (one per floor in REQUIRED_GEM_FLOORS). Spaced evenly
    // across the central socket band; offset is symmetric around 0 (the
    // container's local origin is the seal center). All sockets start
    // empty — even if the player carried gems in, they get placed on
    // [E] interact via the activation animation, never pre-rendered as
    // filled.
    const spacing = 24;
    const startX = -spacing;
    const socketY = -2;
    for (let i = 0; i < REQUIRED_GEM_FLOORS.length; i++) {
      const floorId = REQUIRED_GEM_FLOORS[i];
      const sx = startX + i * spacing;
      const plate = scene.add.image(sx, socketY, gemTextureKey(floorId));
      plate.setScale(1.0);
      // Empty — desaturated + dimmed so the missing slot reads as a void
      // socket waiting for its gem.
      plate.setAlpha(0.18);
      plate.setTintFill(0x1a0c20);
      this.visuals.add(plate);
      this.socketSprites.set(floorId, { plate, halo: null });
    }

    // Trigger zone — broader than the seal frame so the player doesn't have
    // to tap pixel-perfect. ~1.5 tiles in front of the seal.
    this.trigger = scene.add.zone(x, y + TILE_SIZE * 0.4, SEAL_WIDTH + 16, TILE_SIZE * 1.5);
    scene.physics.add.existing(this.trigger, true);

    // "[E] PLACE GEMS" prompt — sits above the seal, hidden until the player
    // walks into the trigger zone. Created once, alpha-tweened on enter/exit.
    this.prompt = this.scene.add
      .text(x, y - SEAL_HEIGHT / 2 - 14, '[E]  PLACE GEMS', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd0a0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(DepthLayers.HUD - 1)
      .setAlpha(0);

    // The Prismarch fires a Prism Special once per phase — the matching
    // gem flies from its socket into the boss's prism, then the socket
    // clears. We listen here so the seal stays the source of truth for
    // gem visuals.
    this.specialFiredHandler = ({ phase, x: bx, y: by }) => {
      this.consumeGemForPhase(phase, bx, by);
    };
    EventBus.on('lordOnyx:specialFired', this.specialFiredHandler);
  }

  /**
   * Register that the player has the named floor's gem in inventory and
   * could place it via [E]. Cheap bookkeeping only — does NOT animate
   * anything. Called from GameScene's `gem:pickedUp` handler so the seal
   * stays in sync with the live inventory if the player earns the Onyx
   * no-hit gem in the same room as the altar.
   */
  markGemAvailable(floorId: string): void {
    if (!REQUIRED_GEM_FLOORS.includes(floorId as FloorId)) return;
    this.availableGems.add(floorId);
  }

  /**
   * Animate one gem flying from `fromX/fromY` into its socket, then upgrade
   * the plate in place (empty → filled + halo). `delayMs` lets the caller
   * stagger multiple placements so 3 gems land in sequence rather than all
   * at once. Resolves the returned promise on land, so `placeAllGems` can
   * await the last one before triggering the activation cinematic.
   */
  private animateGemToSocket(
    floorId: FloorId,
    fromX: number,
    fromY: number,
    delayMs: number,
  ): Promise<void> {
    const socket = this.socketSprites.get(floorId);
    if (!socket) return Promise.resolve();

    const targetX = this.visuals.x + socket.plate.x;
    const targetY = this.visuals.y + socket.plate.y;

    const flyer = this.scene.add
      .image(fromX, fromY, gemTextureKey(floorId))
      .setScale(1.6)
      .setDepth(DepthLayers.HUD - 2)
      .setAlpha(0);
    const haloColor = FLOORS[floorId]?.palette.glow ?? 0xffffff;
    const flyerHalo = this.scene.add
      .circle(fromX, fromY, 12, haloColor, 0.5)
      .setDepth(DepthLayers.HUD - 3)
      .setAlpha(0);

    const midX = (fromX + targetX) / 2;
    const midY = Math.min(fromY, targetY) - 60;
    const duration = 520;

    return new Promise<void>((resolve) => {
      this.scene.time.delayedCall(delayMs, () => {
        flyer.setAlpha(1);
        flyerHalo.setAlpha(1);
        this.scene.tweens.add({
          targets: { t: 0 },
          t: 1,
          duration,
          ease: 'Sine.InOut',
          onUpdate: (tween) => {
            const t = tween.getValue() ?? 0;
            const u = 1 - t;
            const x = u * u * fromX + 2 * u * t * midX + t * t * targetX;
            const y = u * u * fromY + 2 * u * t * midY + t * t * targetY;
            flyer.setPosition(x, y);
            flyerHalo.setPosition(x, y);
            const s = 1.6 - t * 0.5;
            flyer.setScale(s);
            flyerHalo.setScale(s);
          },
          onComplete: () => {
            flyer.destroy();
            flyerHalo.destroy();
            this.placedGems.add(floorId);
            this.fillSocket(floorId);
            resolve();
          },
        });
      });
    });
  }

  /**
   * Place every available-but-not-yet-placed gem from `fromX/fromY` (the
   * player's position when [E] was pressed) into its socket, staggered so
   * they read as a sequence rather than a clump. Returns the list of
   * floor ids that were queued so the caller can react if it was empty
   * (the "press [E] with nothing new to place" branch).
   */
  private placeAllGems(fromX: number, fromY: number): {
    placed: FloorId[];
    done: Promise<void>;
  } {
    const STAGGER_MS = 220;
    const promises: Promise<void>[] = [];
    const placed: FloorId[] = [];
    let i = 0;
    for (const floorId of REQUIRED_GEM_FLOORS) {
      if (!this.availableGems.has(floorId)) continue;
      if (this.placedGems.has(floorId)) continue;
      placed.push(floorId);
      promises.push(this.animateGemToSocket(floorId, fromX, fromY, i * STAGGER_MS));
      i++;
    }
    return { placed, done: Promise.all(promises).then(() => undefined) };
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
   * Update the seal's "player is touching me" state. Called every frame from
   * GameScene's update loop with the result of an arcade overlap check
   * against this.trigger. When true the "[E] PLACE GEMS" prompt fades in;
   * when false it fades out. Activation no longer fires from overlap — the
   * player has to confirm with [E] (see `tryInteract`).
   */
  setInRange(inRange: boolean): void {
    if (this.activated) return;
    if (this.inRange === inRange) return;
    this.inRange = inRange;
    if (!this.prompt) return;
    this.scene.tweens.killTweensOf(this.prompt);
    this.scene.tweens.add({
      targets: this.prompt,
      alpha: inRange ? 1 : 0,
      duration: 180,
      ease: 'Sine.Out',
    });
  }

  /**
   * Player pressed the interact key while in range. Always places whatever
   * available-but-unplaced gems the player carries — partial placements
   * (1 or 2 of 3) are explicitly allowed so the player can see their
   * progress on the altar. The activation cinematic only fires once all
   * three sockets are full, so the boss spawn still gates on a complete
   * trophy set; partial states just leave the seal sitting with one or
   * two glowing sockets and the others dim.
   *
   * The "Slay thy fiends unscathed" hint shows when there's nothing new
   * to place (zero available gems, or every available gem is already in
   * its socket and the player still isn't at 3/3).
   *
   * `fromX/fromY` is the player's world position when [E] was pressed —
   * the placement animation springs from there so it reads as the wizard
   * laying his trophies on the altar.
   */
  tryInteract(fromX: number, fromY: number): void {
    if (this.activated) return;
    if (!this.inRange) return;
    const total = REQUIRED_GEM_FLOORS.length;

    const { placed, done } = this.placeAllGems(fromX, fromY);
    if (placed.length === 0) {
      // Nothing new to place — surface the hint so the player understands
      // why pressing [E] did nothing this time.
      const now = this.scene.time.now;
      if (now < this.nextHintAt) return;
      this.nextHintAt = now + HINT_COOLDOWN_MS;
      this.showHint(this.countAvailable(), total);
      EventBus.emit('seal:hintShown', { owned: this.countAvailable(), total });
      return;
    }

    // After this batch of placements lands, see if we're at 3/3 and (if so)
    // chain the activation cinematic. Partial placements (1 or 2 sockets
    // filled) just leave the seal as-is — re-press [E] later when the
    // player has earned more gems and we'll place those too.
    void done.then(() => {
      if (this.placedGems.size < total) return;
      this.activated = true;
      if (this.prompt) {
        this.scene.tweens.killTweensOf(this.prompt);
        this.prompt.setAlpha(0);
      }
      // Brief beat after the last gem settles before the cinematic kicks in.
      this.scene.time.delayedCall(200, () => {
        this.runActivationSequence();
        EventBus.emit('seal:activated', {
          x: this.visuals.x,
          y: this.visuals.y,
        });
      });
    });
  }

  destroy(): void {
    EventBus.off('lordOnyx:specialFired', this.specialFiredHandler);
    this.trigger.destroy();
    this.visuals.destroy();
    if (this.hintLabel) {
      this.hintLabel.destroy();
      this.hintLabel = null;
    }
    if (this.prompt) {
      this.scene.tweens.killTweensOf(this.prompt);
      this.prompt.destroy();
      this.prompt = null;
    }
  }

  /**
   * Prism Special fired — fly the matching gem from its altar socket into
   * the boss's prism position, then clear the socket. No-op if the player
   * never placed that floor's gem (player can summon Lord Onyx without
   * the consume animation if `consumedSockets` already covers — but this
   * is enforced by the seal only activating with 3/3, so all sockets are
   * filled on entry to the fight).
   */
  private consumeGemForPhase(
    phase: 1 | 2 | 3,
    targetX: number,
    targetY: number,
  ): void {
    const floorId = PHASE_TO_FLOOR[phase];
    if (!this.placedGems.has(floorId)) return;
    const socket = this.socketSprites.get(floorId);
    if (!socket) return;

    // Mark consumed immediately — sticky against any race + lets a
    // duplicate special-fire (defensive) become a no-op.
    this.placedGems.delete(floorId);
    this.consumedSockets.add(floorId);

    const fromX = this.visuals.x + socket.plate.x;
    const fromY = this.visuals.y + socket.plate.y;
    const haloColor = FLOORS[floorId]?.palette.glow ?? 0xffffff;

    // Flying gem copy — sibling sprite in world coords.
    const flyer = this.scene.add
      .image(fromX, fromY, gemTextureKey(floorId))
      .setScale(1.6)
      .setDepth(DepthLayers.HUD - 2);
    const flyerHalo = this.scene.add
      .circle(fromX, fromY, 14, haloColor, 0.5)
      .setDepth(DepthLayers.HUD - 3);

    // Quadratic Bézier with the mid-point lifted upward so the gem arcs
    // into the prism instead of dragging across the floor.
    const midX = (fromX + targetX) / 2;
    const midY = Math.min(fromY, targetY) - 80;

    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: SPECIAL_GEM_FLY_DURATION_MS,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const u = 1 - t;
        const x = u * u * fromX + 2 * u * t * midX + t * t * targetX;
        const y = u * u * fromY + 2 * u * t * midY + t * t * targetY;
        flyer.setPosition(x, y);
        flyerHalo.setPosition(x, y);
        // Scale grows toward the target so the gem reads as "feeding"
        // into the prism rather than landing.
        const s = 1.6 + t * 0.6;
        flyer.setScale(s);
        flyerHalo.setScale(s);
      },
      onComplete: () => {
        flyer.destroy();
        flyerHalo.destroy();
        this.clearSocket(floorId);
      },
    });
  }

  /**
   * Empty a socket after its gem has been consumed by a Prism Special.
   * Plate dims back to the empty-state look + halo destroyed + a small
   * burst at the socket so the consume reads visually.
   */
  private clearSocket(floorId: string): void {
    const socket = this.socketSprites.get(floorId);
    if (!socket) return;
    const haloColor = FLOORS[floorId as FloorId]?.palette.glow ?? 0xffffff;

    // Burst at the socket spot so the moment of consume reads.
    const burst = this.scene.add
      .circle(
        this.visuals.x + socket.plate.x,
        this.visuals.y + socket.plate.y,
        4,
        haloColor,
        1,
      )
      .setDepth(DepthLayers.HUD - 2);
    this.scene.tweens.add({
      targets: burst,
      scale: 8,
      alpha: 0,
      duration: 360,
      ease: 'Sine.Out',
      onComplete: () => burst.destroy(),
    });

    // Plate returns to empty state.
    socket.plate.setAlpha(0.18);
    socket.plate.setTintFill(0x1a0c20);
    if (socket.halo) {
      this.scene.tweens.killTweensOf(socket.halo);
      socket.halo.destroy();
      socket.halo = null;
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

  /** How many of the 3 required gems are currently in the player's
   * inventory and could be placed via [E]. Counts the snapshot from
   * construction plus any post-spawn `markGemAvailable` updates. */
  private countAvailable(): number {
    let n = 0;
    for (const floorId of REQUIRED_GEM_FLOORS) {
      if (this.availableGems.has(floorId)) n++;
    }
    return n;
  }

  /**
   * Floating "Slay thy fiends unscathed" message above the seal. Shown when
   * the player presses [E] without all 3 gems collected — cues the player
   * that the prerequisite is the no-hit boss runs that drop the gems.
   * Auto-fades after ~1.6s. Replaces an in-flight hint if one's still on
   * screen.
   */
  private showHint(owned: number, total: number): void {
    void owned;
    void total;
    if (this.hintLabel) {
      this.hintLabel.destroy();
      this.hintLabel = null;
    }
    const text = 'Slay thy fiends unscathed';
    // Float higher than the [E] prompt so the two don't overlap.
    const label = this.scene.add
      .text(this.visuals.x, this.visuals.y - SEAL_HEIGHT / 2 - 32, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'italic',
        color: '#c898d8',
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
      duration: 1600,
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
