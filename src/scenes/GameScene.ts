import Phaser from 'phaser';
import {
  BASE_PLAYER_STATS,
  BURN_TICK_COUNT,
  CAMERA_ZOOM,
  ENEMY_PROJECTILE_DAMAGE,
  GAME_HEIGHT,
  GAME_WIDTH,
  KNOCKBACK_FORCE_ENEMY,
  KNOCKBACK_FORCE_PLAYER,
  PIERCING_DAMAGE_FACTORS,
  RESTART_HOLD_DURATION_MS,
  ROOM_ENTRY_GRACE_MS,
  ROOM_HEIGHT_TILES,
  ROOM_WIDTH_TILES,
  SAFE_SPAWN_DISTANCE,
  SAFE_SPAWN_MAX_ATTEMPTS,
  SCREEN_SHAKE_DURATION_MS,
  SCREEN_SHAKE_INTENSITY,
  SHOP_SLOT_COUNT,
  SceneKeys,
  TILE_SIZE,
  TextureKeys,
  WORLD_SPRITE_SCALE,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type EnemyId } from '../data/enemies';
import { FLOORS, STARTING_FLOOR_ID, type FloorId } from '../data/floors';
import { GemSeal } from '../entities/GemSeal';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { type BossEnemy } from '../entities/enemies/BossEnemy';
import { Bloomheart, type BloomheartHost } from '../entities/enemies/Bloomheart';
import { BogColossus, type BogColossusHost } from '../entities/enemies/BogColossus';
import { DamselflyEmpress, type DamselflyEmpressHost } from '../entities/enemies/DamselflyEmpress';
import { ForestHeart, type ForestHeartHost } from '../entities/enemies/ForestHeart';
import { LordOnyx, type LordOnyxHost } from '../entities/enemies/LordOnyx';
import {
  MarquisOfMirages,
  type MarquisOfMiragesHost,
} from '../entities/enemies/MarquisOfMirages';
import { MossyBehemoth, type MossyBehemothHost } from '../entities/enemies/MossyBehemoth';
import { PixieQueen, type PixieQueenHost } from '../entities/enemies/PixieQueen';
import { ToadSovereign, type ToadSovereignHost } from '../entities/enemies/ToadSovereign';
import { VineLord, type VineLordHost } from '../entities/enemies/VineLord';
import { MirrorPortal } from '../entities/MirrorPortal';
import { createEnemy } from '../entities/enemies';
import { BasePickup } from '../entities/pickups/BasePickup';
import { BrownCratePickup, type CrateHost } from '../entities/pickups/BrownCratePickup';
import { CoinPickup } from '../entities/pickups/CoinPickup';
import { GemPickup } from '../entities/pickups/GemPickup';
import { GoldCratePickup } from '../entities/pickups/GoldCratePickup';
import { HeartPickup } from '../entities/pickups/HeartPickup';
import { ItemPickup } from '../entities/pickups/ItemPickup';
import { KeyPickup } from '../entities/pickups/KeyPickup';
import { EnemyProjectile } from '../entities/projectiles/EnemyProjectile';
import { WaxPuddle } from '../entities/hazards/WaxPuddle';
import { WaxPuddleGroup } from '../entities/hazards/WaxPuddleGroup';
import { EnemyProjectilePool } from '../entities/projectiles/EnemyProjectilePool';
import { MagicMissile } from '../entities/projectiles/MagicMissile';
import { MagicMissilePool } from '../entities/projectiles/MagicMissilePool';
import { Door } from '../dungeon/Door';
import { DungeonGenerator, type FloorLayout } from '../dungeon/DungeonGenerator';
import { Room } from '../dungeon/Room';
import { ShopRoomBuilder, type ShopRoomBuilderHost } from '../dungeon/ShopRoomBuilder';
import { CombatSystem } from '../systems/CombatSystem';
import { Cosmetics } from '../systems/Cosmetics';
import { MetaProgress } from '../systems/MetaProgress';
import { DropSystem } from '../systems/DropSystem';
import { InputManager } from '../systems/InputManager';
import { Inventory } from '../systems/Inventory';
import { ItemSystem } from '../systems/ItemSystem';
import {
  bossTrackForFloor,
  floorIdToFloorTrack,
  getMusicManager,
} from '../systems/MusicManager';
import { getSfxSynth } from '../systems/SfxSynth';
import { StatsSystem } from '../systems/StatsSystem';
import {
  ItemPool,
  PickupKind,
  RoomKind,
  type Direction,
  type ItemDefinition,
  type PickupSnapshot,
  type RoomDescriptor,
} from '../types';
import { ITEMS, pickItemFromPool, type ItemId } from '../data/items';
import { pickBossForFloor } from '../data/bosses';
import { EventBus } from '../utils/EventBus';
import { RNG } from '../utils/RNG';

/**
 * Snapshot of run-wide state that survives a floor transition. Inventory,
 * picked items, max+current HP, and earned gems all carry over between
 * floors; only the layout / room-state / live entities are rebuilt fresh.
 * Set on the GameScene via `init` data when the player descends stairs.
 */
export interface RunCarryOver {
  healthCurrent: number;
  healthMax: number;
  coins: number;
  keys: number;
  pickedItemIds: readonly string[];
  gemFloorIds: readonly string[];
}

export interface GameSceneInitData {
  floorId?: FloorId;
  /** Seed for the dungeon generator. Defaults to a fresh random seed. */
  dungeonSeed?: string;
  /**
   * 1-based depth into the run. Drives whether treasure / shop doors start
   * locked. Defaults to 1 (Floor 1 = Emerald Forest, no locked doors).
   */
  floorIndex?: number;
  /**
   * Optional carry-over from a previous floor. When present, the new
   * GameScene rehydrates its stats / inventory / item-system / health
   * instead of starting from baseline.
   */
  carryOver?: RunCarryOver;
}

/** Canonical floor progression. Drives stairs descent in real play. */
const FLOOR_ORDER: readonly FloorId[] = [
  'emerald-forest',
  'sapphire-swamp',
  'onyx-mansion',
];

/**
 * Dev-only superset of `FLOOR_ORDER` — kept as a separate constant so
 * future floors that exist visually but aren't yet hooked into natural
 * progression can be reached via `__wiz.gotoFloor` without breaking real
 * runs. Currently identical to `FLOOR_ORDER` (Onyx has its full Vampire
 * fight wired in).
 */
const DEV_FLOOR_ORDER: readonly FloorId[] = [
  'emerald-forest',
  'sapphire-swamp',
  'onyx-mansion',
];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private missilePool!: MagicMissilePool;
  private enemyProjectilePool!: EnemyProjectilePool;
  private waxPuddleGroup!: WaxPuddleGroup;
  /** Mirror Portals spawned by the Marquis of Mirages boss. Tracked here
   * (not in `enemies`) so the missile↔portal overlap fires without the
   * portals counting against `checkRoomClearedSoon`'s active-enemies
   * test. Cleared on room teardown + boss-death. */
  private mirrorPortals!: Phaser.Physics.Arcade.Group;
  private inputManager!: InputManager;
  private stats!: StatsSystem;
  private inventory!: Inventory;
  private itemSystem!: ItemSystem;
  private currentRoom!: Room;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private dropSystem!: DropSystem;
  /**
   * Shop slot price labels for the active room. Tracked separately from
   * `pickups` so we can tear them down on room exit and on individual
   * purchases (the matching pickup destroys itself but the label is a
   * different game object). Cleared in `tearDownActiveRoom`.
   */
  private currentShopPriceLabels: Phaser.GameObjects.Container[] = [];

  private layout!: FloorLayout;
  private currentFloorId: FloorId = STARTING_FLOOR_ID;
  private currentRoomId!: string;
  private dungeonSeed = '';
  private floorIndex = 1;
  private inTransition = false;

  private playerEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;
  private playerWallCollider: Phaser.Physics.Arcade.Collider | null = null;
  private playerBarrierColliders: Phaser.Physics.Arcade.Collider[] = [];
  private missileWallCollider: Phaser.Physics.Arcade.Collider | null = null;
  private missileBarrierColliders: Phaser.Physics.Arcade.Collider[] = [];
  private missileEnemyOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private playerEnemyOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private playerPickupOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private doorTriggerOverlaps: Phaser.Physics.Arcade.Collider[] = [];
  private enemyProjectileWallCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyProjectileBarrierColliders: Phaser.Physics.Arcade.Collider[] = [];
  private enemyProjectilePlayerOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private waxPuddlePlayerOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private missileMirrorPortalOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private playerMirrorPortalCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyBlockerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyProjectileBlockerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyWallCollider: Phaser.Physics.Arcade.Collider | null = null;

  private readonly playerDiedHandler = (): void => this.handlePlayerDied();
  private readonly enemyKilledHandler = (): void => this.checkRoomClearedSoon();
  private readonly enemyDroppedCoinHandler = (payload: { x: number; y: number }): void => {
    this.spawnPickup(PickupKind.Coin, payload.x, payload.y);
  };
  private readonly enemyHitHandler = (payload: { x: number; y: number }): void => {
    this.spawnBloodParticles(payload.x, payload.y);
    getSfxSynth().playEnemyHit();
  };
  private readonly enemyChargeHandler = (): void => {
    getSfxSynth().playEnemyCharge();
  };
  /**
   * SFX-only listener on `player:tookDamage`. Separate from
   * `playerTookDamageHandler` because that one is gated on active boss for
   * no-hit tracking — but the hit sound should always play, regardless of
   * room kind or boss state.
   */
  private readonly playerHitSfxHandler = (): void => {
    getSfxSynth().playPlayerHit();
  };
  private readonly enemyBurnTickHandler = (payload: { x: number; y: number }): void => {
    this.spawnFlameParticle(payload.x, payload.y);
  };
  private readonly mapOpenedHandler = (): void => {
    if (!this.scene.isPaused()) this.scene.pause();
  };
  private readonly mapClosedHandler = (): void => {
    if (this.scene.isPaused()) this.scene.resume();
  };
  private readonly mapTeleportHandler = (payload: { roomId: string }): void => {
    if (this.scene.isPaused()) this.scene.resume();
    if (this.inTransition) return;
    this.teleportToRoom(payload.roomId);
  };

  /**
   * True between boss spawn and boss death iff the player has not yet been
   * hit during the fight. The first `player:tookDamage` while the boss room
   * is in progress flips it to false. Mirrored into `scene.registry` so
   * BossEnemy.die can read it without a direct GameScene reference.
   */
  private bossNoHitInProgress = false;
  /** Total damage events received during the current boss fight. Independent
   * of the boolean flag — used as a sanity check at boss-killed time so a
   * stuck-true flag can't silently award a no-hit gem. */
  private bossDamageCount = 0;
  /** The boss currently active in the room, or null if no boss fight is live.
   * Onyx Mansion went from a coordinator-driven dual-body fight (Vampire
   * Twins) to a single-body Marquis of Mirages, so this slot is back to
   * the plain `BossEnemy | null` it was on every other floor. */
  private activeBoss: BossEnemy | null = null;

  /** Gem seal placed in the Onyx vampire room after the Twins die. Holds
   * the activation state + tear-down handle. Null on every other floor. */
  private gemSeal: GemSeal | null = null;
  /** Phaser Key for the [E] interact (used for placing gems on the seal).
   * Polled in update(); see `tickGemSealInteract`. */
  private interactKey: Phaser.Input.Keyboard.Key | null = null;

  /**
   * Stairs sprite spawned in the boss room after a kill. Held as a field
   * (not just `pickups` membership) so the player↔stairs overlap can fire
   * a transition instead of a normal pickup-collect path.
   */
  private stairsSprite: Phaser.GameObjects.Image | null = null;
  private stairsOverlap: Phaser.Physics.Arcade.Collider | null = null;
  /** Floating "[E] ENTER NEXT FLOOR" prompt rendered above the stairs sprite,
   * fades in/out with overlap. Like the GemSeal prompt, the player must
   * confirm with [E] — walking onto the sigil no longer auto-advances. */
  private stairsPrompt: Phaser.GameObjects.Text | null = null;
  /** Callback fired when the player confirms with [E] while standing on the
   * stairs. Default: `advanceToNextFloor`. Onyx exit overrides to fire the
   * incomplete-victory EndScene path. */
  private stairsAction: (() => void) | null = null;
  /** Mirror of the live player↔stairs overlap. Polled by `tickStairsInteract`
   * each frame so the [E] press fires only when the wizard is on the sigil. */
  private stairsInRange = false;
  /** Set true the first frame the action fires so a long [E] press doesn't
   * re-fire the transition mid-fade-out. Cleared on next stairs spawn. */
  private stairsActionFired = false;
  /** Pending carry-over snapshot from the previous floor's `init` call. */
  private carryOverFromInit: RunCarryOver | null = null;

  // --- Hold-R-to-restart-run ---------------------------------------------------

  /** Phaser Key for the R restart-hold; created in create(). */
  private restartKey: Phaser.Input.Keyboard.Key | null = null;
  /** Phaser Key for ESC pause-menu; polled in update(). */
  private pauseKey: Phaser.Input.Keyboard.Key | null = null;
  /** Timestamp the player started holding R, or null if not currently held. */
  private restartHoldStartedAt: number | null = null;
  /** Background bar of the hold-R fill widget. */
  private restartHoldBg: Phaser.GameObjects.Rectangle | null = null;
  /** Foreground (filling) bar of the hold-R fill widget. */
  private restartHoldFill: Phaser.GameObjects.Rectangle | null = null;
  /** "Hold R to restart…" label above the bar. */
  private restartHoldLabel: Phaser.GameObjects.Text | null = null;

  private readonly playerTookDamageHandler = (): void => {
    // Gate on active boss fight, NOT on room kind — `__wiz.spawnBoss` can
    // host a fight outside a real boss room, and the no-hit tracker has to
    // count those hits the same way. `activeBoss !== null` is the true
    // "boss fight in progress" predicate.
    if (!this.activeBoss) return;
    // Increment unconditionally even if the flag is already false — this is
    // the source of truth for the gem-award sanity check at boss-killed time.
    this.bossDamageCount++;
    if (!this.bossNoHitInProgress) return;
    this.bossNoHitInProgress = false;
    this.registry.set('bossNoHitInProgress', false);
  };

  private readonly bossKilledHandler = (payload: {
    x: number;
    y: number;
    name: string;
    enemyId: string;
    noHit: boolean;
  }): void => this.handleBossKilled(payload);

  private readonly sealActivatedHandler = (payload: { x: number; y: number }): void =>
    this.handleSealActivated(payload);

  private readonly gemPickedUpHandler = (payload: {
    floorId: string;
    x: number;
    y: number;
  }): void => {
    // Always play the gem SFX (Floor-1 / Floor-2 gems get picked up before
    // the seal exists, but the sound should still fire).
    getSfxSynth().playPickupGem();
    // Sync the seal's availability set if it exists in this room — the gem
    // doesn't auto-fly into a socket anymore, but [E] later needs to know
    // the player has it. No animation here.
    this.gemSeal?.markGemAvailable(payload.floorId);
  };

  /**
   * SFX router for non-item, non-gem pickups (heart / coin / key). Items + Gems
   * have dedicated listeners (`item:picked` + `gem:pickedUp`) because both
   * fire `pickup:collected` AND their own event — handling them here would
   * double-play. Crates also fire pickup:collected but their open-sound is
   * deferred to the chest-open SFX batch.
   */
  private readonly pickupCollectedHandler = (payload: { kind: PickupKind }): void => {
    const sfx = getSfxSynth();
    switch (payload.kind) {
      case PickupKind.Heart:
      case PickupKind.HalfHeart:
        sfx.playPickupHeart();
        return;
      case PickupKind.Coin:
        sfx.playPickupCoin();
        return;
      case PickupKind.Key:
        sfx.playPickupKey();
        return;
      case PickupKind.Item:
      case PickupKind.Gem:
      case PickupKind.BrownCrate:
      case PickupKind.GoldCrate:
        // Handled by dedicated listeners or pending batch.
        return;
    }
  };

  private readonly itemPickedSfxHandler = (): void => {
    getSfxSynth().playPickupItem();
  };
  private readonly crateOpenedSfxHandler = (): void => {
    getSfxSynth().playChestOpen();
  };
  private readonly doorsOpenedSfxHandler = (): void => {
    // Delay the open SFX so it doesn't pile on top of the last-hit feedback.
    // `markCurrentRoomCleared` runs on `delayedCall(0)` after the last enemy
    // dies — basically the same frame as the kill — so without a delay the
    // door creak overlaps the enemy-hit + (any final) enemy-cast sounds and
    // gets muddied. 250 ms is enough for the kill audio to decay first.
    this.time.delayedCall(250, () => getSfxSynth().playDoorOpen());
  };
  private readonly doorsClosedSfxHandler = (): void => {
    getSfxSynth().playDoorClose();
  };
  private readonly doorUnlockedSfxHandler = (): void => {
    getSfxSynth().playDoorUnlock();
  };
  private readonly bossKilledSfxHandler = (): void => {
    getSfxSynth().playBossDeath();
  };
  /** Both Prismarch's per-phase prism charge AND the GemSeal 3/3 cinematic
   * play the same prism-special-cast sound (per the SFX brief — same audio,
   * different trigger). Hooked on both events so either path fires it. */
  private readonly prismSpecialCastSfxHandler = (): void => {
    getSfxSynth().playPrismSpecialCast();
  };

  constructor() {
    super({ key: SceneKeys.Game });
  }

  init(data: GameSceneInitData): void {
    this.currentFloorId = data.floorId ?? STARTING_FLOOR_ID;
    this.dungeonSeed =
      data.dungeonSeed ?? `prismancy-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    this.floorIndex = data.floorIndex ?? 1;
    this.carryOverFromInit = data.carryOver ?? null;
    // Trophy/collection: a fresh init (no carry-over) marks the start of a
    // new run. Floor transitions re-enter `init` with `data.carryOver` set
    // and must NOT increment the started counter — only the player's
    // first arrival on Floor 1 counts as a run start. Stash the start
    // timestamp on the global game registry (survives scene restarts but
    // gets overwritten by the next fresh init) so the win-screen handler
    // can compute duration without threading it through carry-over.
    if (this.carryOverFromInit === null) {
      MetaProgress.recordRunStarted();
      this.registry.set('runStartedAt', Date.now());
    }
    this.registry.set('currentFloorId', this.currentFloorId);
    this.registry.set('dungeonSeed', this.dungeonSeed);
    this.registry.set('floorIndex', this.floorIndex);
    // Mob HP multiplier read by BaseEnemy.constructor — Sapphire ×1.5, Onyx
    // ×2.0 keeps mob threat in line with player damage growth across floors.
    // Defaults to 1.0 if the floor doesn't declare one.
    const theme = FLOORS[this.currentFloorId];
    this.registry.set('enemyHpMultiplier', theme.enemyHpMultiplier ?? 1.0);
  }

  create(): void {
    const theme = FLOORS[this.currentFloorId];
    this.cameras.main.setBackgroundColor(theme.palette.ambient);

    this.layout = DungeonGenerator.generate({
      seed: this.dungeonSeed,
      floorIndex: this.floorIndex,
    });
    this.registry.set('floorLayout', this.layout);

    // Per-run systems must exist before the player is constructed (the
    // player reads its move/fire/missile values from `stats` every frame).
    this.stats = new StatsSystem();
    this.inventory = new Inventory();

    // Player + projectile pools persist across rooms. Player is constructed
    // before ItemSystem so the latter can hold a `playerHealth` reference for
    // HP-up items.
    this.missilePool = new MagicMissilePool(this);
    // Wizard Glasses (Homing): missiles need a way to find the nearest
    // active enemy each frame. We hand them a closure that peeks at the
    // current enemies group — the group itself is rebuilt per room
    // (see `enterRoom`), so we go through `this.enemies` lazily.
    this.missilePool.setHomingTargetGetter((x, y) => this.findNearestEnemyTo(x, y));
    this.enemyProjectilePool = new EnemyProjectilePool(this);
    this.waxPuddleGroup = new WaxPuddleGroup(this);
    this.mirrorPortals = this.physics.add.group({
      classType: MirrorPortal,
      runChildUpdate: false,
    });
    this.inputManager = new InputManager(this);
    this.player = new Player(this, 0, 0, this.inputManager, this.missilePool, this.stats);

    this.itemSystem = new ItemSystem(this.stats, this.player.health);

    // Floor-transition rehydrate: if the previous floor handed us a
    // carry-over snapshot, replay item effects (silently — no item:picked
    // toast spam), restore inventory + gems, then clamp current/max HP.
    // `restore` runs LAST so item-driven max-HP bonuses are baked in
    // before we set the actual current value.
    if (this.carryOverFromInit) {
      const co = this.carryOverFromInit;
      this.itemSystem.hydrate(
        co.pickedItemIds,
        (id) => (ITEMS as Record<string, ItemDefinition | undefined>)[id],
      );
      this.inventory.hydrate({ coins: co.coins, keys: co.keys, gems: co.gemFloorIds });
      this.player.health.restore(co.healthCurrent, co.healthMax);
    }
    // Expose to other scenes (HUD reads coin/key counters from here once
    // the inventory HUD lands).
    this.registry.set('stats', this.stats);
    this.registry.set('inventory', this.inventory);
    this.registry.set('itemSystem', this.itemSystem);
    // Expose player health so UIScene can seed its HealthDisplay with the
    // ACTUAL current/max HP at construction time. Without this the floor-
    // transition launches UIScene AFTER GameScene's `restore()` has emitted
    // `player:healthChanged`, so the HUD shows base PLAYER_MAX_HEALTH until
    // the next damage event re-fires the change. Bug user flagged on
    // 2026-05-07.
    this.registry.set('playerHealth', this.player.health);

    // Pickups live for the full run (one group, cleared on room teardown so
    // un-collected pickups don't leak into the next room).
    this.pickups = this.physics.add.group();

    this.physics.world.setBounds(0, 0, ROOM_WIDTH_TILES * TILE_SIZE, ROOM_HEIGHT_TILES * TILE_SIZE);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH_TILES * TILE_SIZE, ROOM_HEIGHT_TILES * TILE_SIZE);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // Start the floor track for the current floor. If `enterRoom` immediately
    // hits a boss room (only happens via dev hooks like __wiz.gotoFloor + a
    // tiny seed where the start IS the boss room — not normal play),
    // `spawnBossForRoom` below will swap to the boss track via crossfade.
    const floorTrack = floorIdToFloorTrack(this.currentFloorId);
    if (floorTrack) getMusicManager().playTrack(this, floorTrack);

    this.enterRoom(this.layout.startId, null);

    // Hold-R-to-restart: dedicated key (separate from InputManager so
    // movement keys don't get tangled with the restart hold) plus a small
    // hidden UI widget that fades in while the player holds the key.
    this.restartKey = this.input.keyboard?.addKey('R') ?? null;
    this.restartHoldStartedAt = null;
    this.buildRestartHoldWidget();

    // ESC opens the pause overlay. Polled in update() via JustDown so we
    // don't get repeat-firing while the key is held.
    this.pauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ?? null;

    // [E] interact for the gem seal on Onyx Mansion. Same JustDown poll
    // pattern as ESC so a held key doesn't repeat-fire activation.
    this.interactKey = this.input.keyboard?.addKey('E') ?? null;

    this.dropSystem = new DropSystem(
      {
        getLayout: () => this.getLayout(),
        getCurrentRoomCenter: () => this.getCurrentRoomCenter(),
        spawnPickup: (kind, x, y) => this.spawnPickup(kind, x, y),
      },
      this.dungeonSeed,
    );
    this.dropSystem.attach();

    EventBus.on('player:died', this.playerDiedHandler);
    EventBus.on('enemy:killed', this.enemyKilledHandler);
    EventBus.on('enemy:droppedCoin', this.enemyDroppedCoinHandler);
    EventBus.on('enemy:hit', this.enemyHitHandler);
    EventBus.on('enemy:charge', this.enemyChargeHandler);
    EventBus.on('enemy:burnTick', this.enemyBurnTickHandler);
    EventBus.on('map:opened', this.mapOpenedHandler);
    EventBus.on('map:closed', this.mapClosedHandler);
    EventBus.on('map:teleport', this.mapTeleportHandler);
    EventBus.on('player:tookDamage', this.playerTookDamageHandler);
    EventBus.on('player:tookDamage', this.playerHitSfxHandler);
    EventBus.on('boss:killed', this.bossKilledHandler);
    EventBus.on('seal:activated', this.sealActivatedHandler);
    EventBus.on('gem:pickedUp', this.gemPickedUpHandler);
    EventBus.on('pickup:collected', this.pickupCollectedHandler);
    EventBus.on('item:picked', this.itemPickedSfxHandler);
    EventBus.on('crate:opened', this.crateOpenedSfxHandler);
    EventBus.on('room:doorsOpened', this.doorsOpenedSfxHandler);
    EventBus.on('room:doorsClosed', this.doorsClosedSfxHandler);
    EventBus.on('door:unlocked', this.doorUnlockedSfxHandler);
    EventBus.on('boss:killed', this.bossKilledSfxHandler);
    EventBus.on('lordOnyx:specialFired', this.prismSpecialCastSfxHandler);
    EventBus.on('seal:activated', this.prismSpecialCastSfxHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dropSystem.detach();
      EventBus.off('player:died', this.playerDiedHandler);
      EventBus.off('enemy:killed', this.enemyKilledHandler);
      EventBus.off('enemy:droppedCoin', this.enemyDroppedCoinHandler);
      EventBus.off('enemy:hit', this.enemyHitHandler);
      EventBus.off('enemy:charge', this.enemyChargeHandler);
      EventBus.off('enemy:burnTick', this.enemyBurnTickHandler);
      EventBus.off('map:opened', this.mapOpenedHandler);
      EventBus.off('map:closed', this.mapClosedHandler);
      EventBus.off('map:teleport', this.mapTeleportHandler);
      EventBus.off('player:tookDamage', this.playerTookDamageHandler);
      EventBus.off('player:tookDamage', this.playerHitSfxHandler);
      EventBus.off('boss:killed', this.bossKilledHandler);
      EventBus.off('seal:activated', this.sealActivatedHandler);
      EventBus.off('gem:pickedUp', this.gemPickedUpHandler);
      EventBus.off('pickup:collected', this.pickupCollectedHandler);
      EventBus.off('item:picked', this.itemPickedSfxHandler);
      EventBus.off('crate:opened', this.crateOpenedSfxHandler);
      EventBus.off('room:doorsOpened', this.doorsOpenedSfxHandler);
      EventBus.off('room:doorsClosed', this.doorsClosedSfxHandler);
      EventBus.off('door:unlocked', this.doorUnlockedSfxHandler);
      EventBus.off('boss:killed', this.bossKilledSfxHandler);
      EventBus.off('lordOnyx:specialFired', this.prismSpecialCastSfxHandler);
      EventBus.off('seal:activated', this.prismSpecialCastSfxHandler);
      // Phaser destroys child GameObjects on scene shutdown, but our class
      // fields are still pointing at them. If the scene is restarted (e.g.
      // via `__wiz.gotoFloor`), the next `create()` would see a truthy but
      // dead `currentRoom` and `enterRoom` would call tearDown on it. Wipe
      // the per-run references here so a fresh `create()` rebuilds from
      // scratch. The `!` fields use cast-to-undefined to honour TypeScript's
      // definite-assignment contract while still clearing the slot.
      this.currentRoom = undefined as unknown as Room;
      this.enemies = undefined as unknown as Phaser.Physics.Arcade.Group;
      this.pickups = undefined as unknown as Phaser.Physics.Arcade.Group;
      this.activeBoss = null;
      this.bossNoHitInProgress = false;
      this.bossDamageCount = 0;
      this.registry.set('bossNoHitInProgress', false);
      this.inTransition = false;
      this.currentShopPriceLabels = [];
      this.stairsSprite = null;
      this.stairsOverlap = null;
      this.stairsPrompt = null;
      this.stairsAction = null;
      this.stairsInRange = false;
      this.stairsActionFired = false;
      this.gemSeal = null;
      this.interactKey = null;
      this.restartHoldStartedAt = null;
      this.restartKey = null;
      this.pauseKey = null;
      this.restartHoldBg = null;
      this.restartHoldFill = null;
      this.restartHoldLabel = null;
    });

    // Dev-only browser console hook so the user can spawn a treasure-pool
    // item, force-lock special-room doors etc. without burning through real
    // floors. Stripped out of production builds by `import.meta.env.DEV`.
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__wiz = {
        spawnTreasure: () => this.spawnTreasureItem(),
        stats: () => this.stats,
        itemSystem: () => this.itemSystem,
        simulateFloor2: () => this.simulateFloor2(),
        /**
         * Force-spawn a specific boss in the current room. Bypasses the
         * `pickBossForFloor` weighted roll — handy for testing a boss whose
         * 25 % chance per run hasn't come up. Emerald: `'boss-vine-lord'`,
         * `'boss-mossy-behemoth'`, `'boss-pixie-queen'`, `'boss-forest-heart'`.
         * Sapphire: `'boss-toad-sovereign'`, `'boss-bloomheart'`,
         * `'boss-damselfly-empress'`, `'boss-bog-colossus'`. Onyx:
         * `'boss-marquis-of-mirages'`, `'boss-lord-onyx'`.
         * Run `__wiz.spawnBoss('boss-bloomheart')` in the browser console.
         */
        spawnBoss: (bossId: string) => this.devSpawnBoss(bossId),
        /**
         * Restart the run on the requested floor. Useful before stairs +
         * boss-pool exist for Floor 2: lets you test new mob rosters /
         * palettes without grinding through Floor 1 first.
         * Usage: `__wiz.gotoFloor(2)`.
         */
        gotoFloor: (floorIndex: number) => this.devGotoFloor(floorIndex),
        /**
         * Grant all 3 floor gems instantly. Use to test the gem seal in the
         * Onyx vampire room without running a perfect no-hit on every floor
         * first. Usage: `__wiz.giveGems()`.
         */
        giveGems: () => {
          this.inventory.addGem('emerald-forest');
          this.inventory.addGem('sapphire-swamp');
          this.inventory.addGem('onyx-mansion');
          // eslint-disable-next-line no-console
          console.log('[__wiz.giveGems] Granted Emerald, Sapphire, Onyx.');
        },
        /** Spawn Lord Onyx in the current room, regardless of seal state.
         * Replaces any existing boss. Useful for boss-pattern tuning
         * without grinding through Vampires + 3-gem requirement. */
        spawnLordOnyx: () => this.devSpawnBoss('boss-lord-onyx'),
        /** Toggle the Prismancy red/gold cosmetic skin unlock state. The
         * change applies on the NEXT scene start (Player reads Cosmetics
         * at construction). Restart with `__wiz.gotoFloor(1)` to see it. */
        unlockSkin: () => {
          Cosmetics.unlockPrismancySkin();
          // eslint-disable-next-line no-console
          console.log(
            '[__wiz.unlockSkin] Prismancy skin unlocked. Restart for it to take effect.',
          );
        },
        lockSkin: () => {
          Cosmetics.resetAll();
          // eslint-disable-next-line no-console
          console.log(
            '[__wiz.lockSkin] All cosmetic unlocks cleared. Restart for default skin.',
          );
        },
        /**
         * Apply an item's effects directly to the player's stats without
         * spawning a pedestal. Skips the pickup toast + sound but does count
         * as picked (item enters `pickedIds` so the duplicate-prevention
         * paths know about it). Useful for stress-testing modifiers like
         * Magic Shard / Wizard Glasses / Fire Orb without rolling them out
         * of a pool. Usage: `__wiz.give('magicShard')`.
         */
        give: (itemId: string) => {
          const def = (ITEMS as Record<string, ItemDefinition | undefined>)[itemId];
          if (!def) {
            // eslint-disable-next-line no-console
            console.warn(`[__wiz.give] Unknown item id: ${itemId}`);
            return;
          }
          this.itemSystem.pickUp(def);
          // eslint-disable-next-line no-console
          console.log(`[__wiz.give] Applied ${def.displayName}.`);
        },
        /**
         * Spawn a pedestal for the named item in the current room (center).
         * Goes through the standard ItemPickup constructor so the pickup
         * triggers the toast + sound when the player walks over it. Lets you
         * test the actual pickup flow + visual rather than just the stat
         * application. Usage: `__wiz.spawnItem('wizardGlasses')`.
         */
        spawnItem: (itemId: string) => {
          const def = (ITEMS as Record<string, ItemDefinition | undefined>)[itemId];
          if (!def || !this.currentRoom) {
            // eslint-disable-next-line no-console
            console.warn(`[__wiz.spawnItem] Unknown item id or no active room: ${itemId}`);
            return;
          }
          const center = this.currentRoom.getCenter();
          const pickup = new ItemPickup(this, center.x, center.y, def, this.itemSystem);
          pickup.setSpawnProtection(700);
          this.pickups.add(pickup);
          // eslint-disable-next-line no-console
          console.log(`[__wiz.spawnItem] Pedestal for ${def.displayName} spawned.`);
        },
        /**
         * List all items in the catalogue (id → displayName) so you can pick
         * a target for `__wiz.give` / `__wiz.spawnItem`. Pure-read helper.
         */
        listItems: () => {
          const out = Object.entries(ITEMS).map(([id, def]) => `${id} — ${def.displayName}`);
          // eslint-disable-next-line no-console
          console.log(out.join('\n'));
        },
        /**
         * Spawn a crate at the current room's center. `gold=true` spawns a
         * gold crate (rarer loot pool); default is brown. Walk over it to
         * open + drop loot. Useful for testing chest-open SFX, crate loot
         * tables, and the pickup-slot serializer with simultaneous drops.
         * Usage: `__wiz.spawnCrate()` or `__wiz.spawnCrate(true)`.
         *
         * The position is randomly jittered ±48 px from the room center so
         * each invocation produces different loot. (`crateSeed(x, y)` is
         * deterministic on integer position — without jitter every spawn at
         * the same room center would replay the identical drops, defeating
         * the purpose of a test hook.)
         */
        spawnCrate: (gold = false) => {
          if (!this.currentRoom) {
            // eslint-disable-next-line no-console
            console.warn('[__wiz.spawnCrate] No active room.');
            return;
          }
          const center = this.currentRoom.getCenter();
          const jitterX = (Math.random() - 0.5) * 96;
          const jitterY = (Math.random() - 0.5) * 96;
          const kind = gold ? PickupKind.GoldCrate : PickupKind.BrownCrate;
          this.spawnPickup(kind, center.x + jitterX, center.y + jitterY);
          // eslint-disable-next-line no-console
          console.log(`[__wiz.spawnCrate] ${gold ? 'Gold' : 'Brown'} crate spawned (jittered).`);
        },
      };
    }
  }

  /**
   * Dev helper: restart GameScene on a specific floor index. Maps the index
   * to a FloorId via the canonical progression order. Items / coins / HP
   * reset because GameScene's init wipes those — this is for visual /
   * mechanic testing, not for piping a save through.
   */
  private devGotoFloor(floorIndex: number): void {
    const idx = Math.max(1, Math.min(DEV_FLOOR_ORDER.length, Math.floor(floorIndex)));
    const floorId = DEV_FLOOR_ORDER[idx - 1]!;
    // eslint-disable-next-line no-console
    console.log(`[__wiz.gotoFloor] Restarting on floor ${idx} (${floorId})`);
    // Restart both scenes — UIScene reads `currentFloorId` from registry only
    // in `create()`, so without the explicit stop/launch the floor title text
    // would stay stuck on the previous floor's name.
    this.scene.stop(SceneKeys.UI);
    this.scene.start(SceneKeys.Game, { floorIndex: idx, floorId });
    this.scene.launch(SceneKeys.UI);
  }

  /**
   * Snapshot the run-wide state into a `RunCarryOver` object, ready to hand
   * to the next GameScene's `init`. Only data that should survive a floor
   * transition is captured — live entities (player sprite, enemies, layout)
   * are deliberately excluded since the next scene rebuilds them.
   */
  private snapshotRunCarryOver(): RunCarryOver {
    return {
      healthCurrent: this.player.health.getCurrent(),
      healthMax: this.player.health.getMax(),
      coins: this.inventory.getCoins(),
      keys: this.inventory.getKeys(),
      pickedItemIds: Array.from(this.itemSystem.getPickedIds()),
      gemFloorIds: Array.from(this.inventory.getGems()),
    };
  }

  /**
   * Walk through the stairs spawned after a boss kill: snapshot run state,
   * advance the floor index, restart GameScene + UIScene with the next
   * floor's data. If there is no next floor in `FLOOR_ORDER` the call is a
   * no-op (Phase 5 Chunk 4 will hook this to the win screen).
   */
  private advanceToNextFloor(): void {
    if (this.inTransition) return;
    const currentIdx = FLOOR_ORDER.indexOf(this.currentFloorId);
    if (currentIdx === -1 || currentIdx + 1 >= FLOOR_ORDER.length) {
      // eslint-disable-next-line no-console
      console.log(
        `[advanceToNextFloor] No next floor after ${this.currentFloorId} (would be the win condition).`,
      );
      return;
    }
    const nextFloorId = FLOOR_ORDER[currentIdx + 1]!;
    const carryOver = this.snapshotRunCarryOver();
    this.inTransition = true;

    // SFX before fade so the magical-rise sound covers the transition window.
    getSfxSynth().playFloorTeleport();

    // Brief fade so the descent reads as "going somewhere", not a snap-cut.
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SceneKeys.UI);
      this.scene.start(SceneKeys.Game, {
        floorIndex: this.floorIndex + 1,
        floorId: nextFloorId,
        carryOver,
      });
      this.scene.launch(SceneKeys.UI);
    });
  }

  /**
   * Hold-R-during-run reset. Wipes the entire run (no carry-over) and drops
   * the player on a fresh Floor 1 with a new seed. Symmetric with the
   * post-game-over restart, but reachable mid-run via input.
   */
  private restartRun(): void {
    if (this.inTransition) return;
    this.inTransition = true;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SceneKeys.UI);
      this.scene.start(SceneKeys.Game, {
        floorIndex: 1,
        floorId: STARTING_FLOOR_ID,
      });
      this.scene.launch(SceneKeys.UI);
    });
  }

  /**
   * Dev helper: lock every treasure / shop door in the current layout. The
   * Door instance for the active room is rebuilt only on re-entry, so the
   * caller has to leave + come back to those rooms (or walk through any
   * door, which rebuilds the next room's doors fresh).
   */
  private simulateFloor2(): void {
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    const opposite = (d: Direction): Direction =>
      d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
    for (const room of this.layout.rooms.values()) {
      if (room.kind !== RoomKind.Treasure && room.kind !== RoomKind.Shop) continue;
      for (const dir of dirs) {
        if (!room.doors[dir].exists) continue;
        room.doors = {
          ...room.doors,
          [dir]: { ...room.doors[dir], locked: true },
        };
        const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
        const neighbor = this.layout.rooms.get(`r-${room.gx + dx}-${room.gy + dy}`);
        if (neighbor) {
          const op = opposite(dir);
          neighbor.doors = {
            ...neighbor.doors,
            [op]: { ...neighbor.doors[op], locked: true },
          };
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      '[__wiz.simulateFloor2] Treasure/Shop doors marked locked. Leave and re-enter those rooms to see the effect.',
    );
  }

  /**
   * Spawn an item pedestal in the center of the current room. Public so
   * future Treasure-room generation (Chunk 4) and the dev hook above can
   * both call it. Deterministic per (dungeonSeed, currentRoomId, picked-set)
   * so the same room always rolls the same pool on first entry.
   */
  spawnTreasureItem(): void {
    if (!this.currentRoom) return;
    const center = this.currentRoom.getCenter();
    const desc = this.layout.rooms.get(this.currentRoomId);
    this.spawnTreasureItemAt(center.x, center.y, desc?.kind === RoomKind.Treasure ? desc : undefined);
  }

  /**
   * Spawn a treasure-pool item pedestal at world-space `(x, y)`. Factored
   * out of `spawnTreasureItem()` so gold crates can drop a pedestal at the
   * crate's location instead of the room center. Same deterministic seed
   * scheme as the room-center spawn. Returns the spawned ItemPickup so
   * callers (e.g. gold crate) can apply spawn-protection.
   *
   * `pedestalRoom`: when provided, the rolled item id is snapshotted to
   * `desc.treasureItemId` so re-entry rebuilds the same pedestal (and
   * other roll paths can exclude it via `getFloorReservedItemIds`). Crate
   * callers omit it — crate items are intentionally ephemeral.
   */
  spawnTreasureItemAt(
    x: number,
    y: number,
    pedestalRoom?: RoomDescriptor,
  ): ItemPickup | null {
    if (!this.currentRoom) return null;
    const pickedIds = this.itemSystem.getPickedIds();

    // If this is a treasure-room pedestal AND we already rolled an item for
    // this room on a previous visit, replay it from the snapshot. We only
    // discard the snapshot if the player has since picked the item up
    // elsewhere (then it would silently no-op into a stat re-application).
    if (pedestalRoom?.treasureItemId) {
      const snap = ITEMS[pedestalRoom.treasureItemId as ItemId];
      if (snap && !pickedIds.has(snap.id)) {
        const pickup = new ItemPickup(this, x, y, snap, this.itemSystem);
        this.pickups.add(pickup);
        return pickup;
      }
    }

    const reserved = this.getFloorReservedItemIds();
    const exclude = new Set<ItemId>(pickedIds as ReadonlySet<ItemId>);
    for (const id of reserved) exclude.add(id as ItemId);

    const seedSuffix = Array.from(pickedIds).sort().join(',');
    const rng = new RNG(
      `${this.dungeonSeed}-treasure-${this.currentRoomId}-${Math.floor(x)}-${Math.floor(y)}-${seedSuffix}`,
    );
    const itemDef = pickItemFromPool(ItemPool.Treasure, rng, exclude);
    if (!itemDef) return null;
    if (pedestalRoom) pedestalRoom.treasureItemId = itemDef.id;
    const pickup = new ItemPickup(this, x, y, itemDef, this.itemSystem);
    this.pickups.add(pickup);
    return pickup;
  }

  /**
   * Item ids the floor has already committed to: every shop slot's snapshot,
   * every cleared boss room's snapshotted reward (in `pendingPickups`), every
   * treasure-room pedestal's snapshot, plus everything currently displayed
   * in the active room's live pickup group (covers e.g. crate-dropped items
   * that haven't been picked up yet). Roll paths (treasure / shop / boss)
   * union this with `pickedIds` so the same id can never appear twice on a
   * floor — the user-flagged bug "shop slot vanished after I picked the same
   * item up from the boss / treasure room" is the symptom of two pools
   * rolling the same id without knowing about each other.
   */
  private getFloorReservedItemIds(): Set<string> {
    const out = new Set<string>();
    if (!this.layout) return out;
    for (const desc of this.layout.rooms.values()) {
      if (desc.shopItemIds) {
        const purchased = new Set(desc.purchasedShopSlots ?? []);
        // Slot 2 maps to shopItemIds[0], slot 3 to shopItemIds[1].
        if (desc.shopItemIds[0] && !purchased.has(2)) out.add(desc.shopItemIds[0]);
        if (desc.shopItemIds[1] && !purchased.has(3)) out.add(desc.shopItemIds[1]);
      }
      if (desc.treasureItemId && !desc.looted) out.add(desc.treasureItemId);
      if (desc.pendingPickups) {
        for (const snap of desc.pendingPickups) {
          if (snap.itemId) out.add(snap.itemId);
        }
      }
    }
    for (const child of this.pickups.getChildren()) {
      if (child instanceof ItemPickup) out.add(child.itemId);
    }
    return out;
  }

  // --- DropSystem host hooks --------------------------------------------------

  /** Used by DropSystem to look up the cleared room's descriptor. */
  getLayout(): FloorLayout | null {
    return this.layout ?? null;
  }

  /** World-space center of the active room (target for drops + center spawns). */
  getCurrentRoomCenter(): { x: number; y: number } | null {
    if (!this.currentRoom) return null;
    return this.currentRoom.getCenter();
  }

  /**
   * Instantiate a pickup of the given kind at world-space `(x, y)` and
   * register it with the run-wide pickups group. Returns the spawned
   * pickup, or `null` for kinds we don't physically drop yet (HalfHeart /
   * Item).
   */
  spawnPickup(kind: PickupKind, x: number, y: number): BasePickup | null {
    let pickup: BasePickup | null = null;
    switch (kind) {
      case PickupKind.Heart:
        pickup = new HeartPickup(this, x, y);
        break;
      case PickupKind.Coin:
        pickup = new CoinPickup(this, x, y);
        break;
      case PickupKind.Key:
        pickup = new KeyPickup(this, x, y);
        break;
      case PickupKind.BrownCrate:
        pickup = new BrownCratePickup(this, x, y, this.crateHost(), this.crateSeed(x, y));
        break;
      case PickupKind.GoldCrate:
        pickup = new GoldCratePickup(this, x, y, this.crateHost(), this.crateSeed(x, y));
        break;
      // HalfHeart / Item have no walk-over physical drop in this chunk.
      default:
        return null;
    }
    this.pickups.add(pickup);
    return pickup;
  }

  /**
   * Find the active enemy nearest to (x, y) within the current room. Used
   * by Wizard-Glasses-equipped missiles to acquire a homing target each
   * frame. Returns null if no active enemy exists. The lookup is O(n) on
   * a small group (≤10 enemies per room), well below any frame budget.
   */
  private findNearestEnemyTo(x: number, y: number): BaseEnemy | null {
    if (!this.enemies) return null;
    let best: BaseEnemy | null = null;
    let bestSq = Infinity;
    for (const child of this.enemies.getChildren()) {
      const e = child as BaseEnemy;
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const sq = dx * dx + dy * dy;
      if (sq < bestSq) {
        bestSq = sq;
        best = e;
      }
    }
    return best;
  }

  /**
   * Spawn 5 small red drops at (x, y) flying outward + slightly downward
   * (gravity-arc feel) and fading. Triggered by `enemy:hit` from the
   * missile↔enemy overlap, NOT from contact damage — only player damage
   * gets blood feedback. Each drop is a Phaser.GameObjects.Arc with a
   * tween; cleans itself up onComplete. Total ~250 ms lifetime.
   */
  private spawnBloodParticles(x: number, y: number): void {
    const count = 5;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist = 14 + Math.random() * 10;
      const drop = this.scene
        ? this.add.circle(x, y, 2 + Math.random() * 1.2, 0xb83020, 1)
        : null;
      if (!drop) continue;
      drop.setDepth(DepthLayers.Particle);
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 6,
        alpha: 0,
        scale: 0.4,
        duration: 240 + Math.random() * 80,
        ease: 'Sine.Out',
        onComplete: () => drop.destroy(),
      });
    }
  }

  /**
   * Spawn a single small flame flicker at (x, y). Triggered by
   * `enemy:burnTick` (Fire Orb DoT). Same cheap-tween idiom as the blood
   * particles but with an orange palette and an upward drift.
   */
  private spawnFlameParticle(x: number, y: number): void {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const flame = this.add
        .circle(
          x + (Math.random() - 0.5) * 14,
          y + (Math.random() - 0.5) * 8,
          2.5,
          i === 0 ? 0xfff2a0 : 0xff8030,
          1,
        )
        .setDepth(DepthLayers.Particle);
      this.tweens.add({
        targets: flame,
        y: flame.y - 18 - Math.random() * 8,
        alpha: 0,
        scale: 0.4,
        duration: 360,
        ease: 'Sine.Out',
        onComplete: () => flame.destroy(),
      });
    }
  }

  /**
   * Adapter exposing only what crate pickups need from the scene. Re-creates
   * the host on each spawn (cheap) so `this` binding stays clean if `spawnPickup`
   * gets reassigned by some future system.
   */
  private crateHost(): CrateHost {
    return {
      spawnPickup: (kind, x, y) => this.spawnPickup(kind, x, y),
      spawnTreasureItemAt: (x, y) => this.spawnTreasureItemAt(x, y),
    };
  }

  /**
   * Deterministic seed for a crate's contents. Anchored to (run, room, position)
   * so re-entering a room with an unopened crate rolls the same loot.
   */
  private crateSeed(x: number, y: number): string {
    return `${this.dungeonSeed}-crate-${this.currentRoomId}-${Math.floor(x)}-${Math.floor(y)}`;
  }

  // --- Shop slot host hooks (ShopRoomBuilderHost) -----------------------------

  private spawnShopHeart(
    x: number,
    y: number,
    price: number,
    slotIndex: number,
  ): BasePickup {
    const pickup = new HeartPickup(this, x, y);
    pickup.price = price;
    pickup.shopSlotIndex = slotIndex;
    pickup.shopBaseX = x;
    this.pickups.add(pickup);
    return pickup;
  }

  private spawnShopKey(
    x: number,
    y: number,
    price: number,
    slotIndex: number,
  ): BasePickup {
    const pickup = new KeyPickup(this, x, y);
    pickup.price = price;
    pickup.shopSlotIndex = slotIndex;
    pickup.shopBaseX = x;
    this.pickups.add(pickup);
    return pickup;
  }

  private spawnShopItem(
    x: number,
    y: number,
    item: ItemDefinition,
    price: number,
    slotIndex: number,
  ): BasePickup {
    const pickup = new ItemPickup(this, x, y, item, this.itemSystem);
    pickup.price = price;
    pickup.shopSlotIndex = slotIndex;
    pickup.shopBaseX = x;
    this.pickups.add(pickup);
    return pickup;
  }

  /**
   * Render a "<coin> N" price tag above a shop slot. Returns the container
   * so the builder + the overlap handler can find + destroy individual
   * labels by position.
   */
  private drawShopPriceLabel(
    x: number,
    y: number,
    price: number,
  ): Phaser.GameObjects.Container {
    const icon = this.add.image(0, 0, TextureKeys.Coin).setScale(0.7);
    const text = this.add
      .text(icon.displayWidth * 0.6, 0, `${price}`, {
        fontSize: '16px',
        color: '#ffd84a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const container = this.add
      .container(x, y, [icon, text])
      .setDepth(DepthLayers.Pickup + 1);
    this.currentShopPriceLabels.push(container);
    return container;
  }

  private shopHost(): ShopRoomBuilderHost {
    return {
      spawnHeartPickup: (x, y, price, slotIndex) =>
        this.spawnShopHeart(x, y, price, slotIndex),
      spawnKeyPickup: (x, y, price, slotIndex) =>
        this.spawnShopKey(x, y, price, slotIndex),
      spawnItemPickup: (x, y, item, price, slotIndex) =>
        this.spawnShopItem(x, y, item, price, slotIndex),
      drawPriceLabel: (x, y, price) => this.drawShopPriceLabel(x, y, price),
    };
  }

  /**
   * Enter `roomId`. `entryDirection` is the direction the player moved
   * through the previous room's door (so the new room knows which wall to
   * place them next to). Pass null for the starting room.
   */
  private enterRoom(roomId: string, entryDirection: Direction | null): void {
    const desc = this.layout.rooms.get(roomId);
    if (!desc) throw new Error(`enterRoom: unknown room id ${roomId}`);

    if (this.currentRoom) {
      this.tearDownActiveRoom();
    }

    this.currentRoomId = roomId;
    desc.visited = true;

    const theme = FLOORS[this.currentFloorId];
    this.currentRoom = new Room(this, theme, desc);
    this.enemies = this.physics.add.group({ runChildUpdate: false });

    // Player position
    const spawnPos =
      entryDirection !== null
        ? this.currentRoom.getEntryPosition(entryDirection)
        : this.currentRoom.getCenter();
    this.player.setPosition(spawnPos.x, spawnPos.y);
    this.player.setVelocity(0, 0);

    // Spawn enemies if this room hasn't been cleared yet. Grant the player
    // a brief grace window so an enemy that beelines at them on entry
    // doesn't land an instant hit.
    if (!desc.cleared && desc.enemySpawnCount > 0) {
      this.spawnEnemiesForRoom(desc, spawnPos);
      this.player.health.grantInvincibility(ROOM_ENTRY_GRACE_MS, this.time.now);
    }

    this.setupCollidersForActiveRoom();

    // Boss spawn: uncleared boss room → instantiate the boss at room center,
    // arm the no-hit tracking flag, and let `boss:spawned` propagate to the
    // HUD. The boss-room descriptor has `enemySpawnCount = 0`, so the
    // generic enemy spawner above is a no-op for these rooms.
    if (desc.kind === RoomKind.Boss && !desc.cleared && this.activeBoss === null) {
      this.spawnBossForRoom();
    }

    // Restore pickups left behind on a previous visit. The player↔pickup
    // overlap registered above watches the group dynamically, so re-spawned
    // pickups are picked up the moment the player walks over them. Clear
    // `pendingPickups` afterwards so the minimap doesn't show stale drop
    // markers for the room the player is currently standing in — the next
    // teardown will refresh it from the live state.
    if (desc.pendingPickups) {
      for (const snap of desc.pendingPickups) {
        if (snap.kind === PickupKind.Item && snap.itemId) {
          // Boss-room item reward round-trip. Look up the item id and rebuild
          // the pedestal at its original position. Skip silently if the id no
          // longer resolves (data drift between runs / dev edits).
          const def = ITEMS[snap.itemId as ItemId];
          if (!def) continue;
          const pickup = new ItemPickup(this, snap.x, snap.y, def, this.itemSystem);
          this.pickups.add(pickup);
          continue;
        }
        if (snap.kind === PickupKind.Gem && snap.gemFloorId) {
          const gem = new GemPickup(this, snap.x, snap.y, snap.gemFloorId);
          this.pickups.add(gem);
          continue;
        }
        this.spawnPickup(snap.kind, snap.x, snap.y);
      }
      delete desc.pendingPickups;
    }

    // Treasure rooms auto-spawn a single pedestal item on first entry. The
    // `looted` flag is the source of truth here — Item-kind pickups are not
    // snapshotted into `pendingPickups` (see tearDownActiveRoom), so we'd
    // otherwise respawn an already-taken item.
    if (desc.kind === RoomKind.Treasure && !desc.looted) {
      this.spawnTreasureItem();
    }

    // Shop rooms lay out 4 purchasable slots on first entry. On re-entry,
    // already-bought slots in `desc.purchasedShopSlots` are skipped.
    // ShopRoomBuilder also flips `looted = true` for us when every slot is
    // gone so future re-entries skip this block entirely.
    if (desc.kind === RoomKind.Shop && !desc.looted) {
      const center = this.getCurrentRoomCenter();
      if (center) {
        const result = ShopRoomBuilder.build(
          this.shopHost(),
          desc,
          this.dungeonSeed,
          center,
          this.itemSystem.getPickedIds(),
          this.getFloorReservedItemIds(),
        );
        if (result.allBought) desc.looted = true;
      }
    }

    // Re-entry into a cleared boss room: respawn the stairs so the player
    // can still descend after returning from a side trip. Onyx is special:
    // both the gem seal AND the no-gems exit stairs respawn (the seal so
    // the player can still trigger the Lord-Onyx path, the stairs so
    // they can take the no-gems exit instead).
    if (desc.kind === RoomKind.Boss && desc.cleared) {
      if (this.currentFloorId === 'onyx-mansion') {
        this.spawnGemSealInCurrentRoom();
        this.spawnStairsInCurrentRoom(() => this.handleOnyxExit(), 'ENTER THE LIGHT');
      } else if (this.hasNextFloor()) {
        this.spawnStairsInCurrentRoom();
      }
    }

    // If the room starts cleared (start room or already-visited room), doors
    // are already open. Otherwise the Room constructor builds them closed.

    EventBus.emit('floor:roomEntered', { roomId });

    // If a re-entered room had no enemies but was somehow not marked cleared,
    // settle that now (shouldn't happen, but safe). Boss rooms are excluded:
    // they always have `enemySpawnCount = 0` (the boss is spawned separately
    // via `spawnBossForRoom`), so without this guard the doors would pop open
    // the moment the player walks in instead of staying shut until kill.
    if (!desc.cleared && desc.enemySpawnCount === 0 && desc.kind !== RoomKind.Boss) {
      this.markCurrentRoomCleared();
    }
  }

  private tearDownActiveRoom(): void {
    // Remove colliders before destroying their targets.
    this.playerWallCollider?.destroy();
    this.playerEnemyCollider?.destroy();
    this.missileWallCollider?.destroy();
    this.missileEnemyOverlap?.destroy();
    this.playerEnemyOverlap?.destroy();
    this.playerPickupOverlap?.destroy();
    this.enemyProjectileWallCollider?.destroy();
    this.enemyProjectilePlayerOverlap?.destroy();
    this.waxPuddlePlayerOverlap?.destroy();
    this.missileMirrorPortalOverlap?.destroy();
    this.missileMirrorPortalOverlap = null;
    this.playerMirrorPortalCollider?.destroy();
    this.playerMirrorPortalCollider = null;
    this.enemyBlockerCollider?.destroy();
    this.enemyProjectileBlockerCollider?.destroy();
    this.enemyWallCollider?.destroy();
    for (const c of this.playerBarrierColliders) c.destroy();
    for (const c of this.missileBarrierColliders) c.destroy();
    for (const c of this.enemyProjectileBarrierColliders) c.destroy();
    for (const c of this.doorTriggerOverlaps) c.destroy();
    this.playerBarrierColliders = [];
    this.missileBarrierColliders = [];
    this.enemyProjectileBarrierColliders = [];
    this.doorTriggerOverlaps = [];

    // Destroy enemies + deactivate any in-flight projectiles (both factions).
    this.enemies.clear(true, true);
    this.enemies.destroy();
    this.missilePool.deactivateAll();
    this.enemyProjectilePool.deactivateAll();
    this.waxPuddleGroup.deactivateAll();
    // Destroy any live mirror portals (Marquis-of-Mirages special leftovers).
    this.mirrorPortals.clear(true, true);

    // Stairs sprite + overlap are room-scoped: reborn via the boss-room
    // re-entry path in `enterRoom` so we always destroy them on teardown.
    this.stairsOverlap?.destroy();
    this.stairsOverlap = null;
    this.stairsSprite?.destroy();
    this.stairsSprite = null;
    this.stairsPrompt?.destroy();
    this.stairsPrompt = null;
    this.stairsAction = null;
    this.stairsInRange = false;
    this.stairsActionFired = false;

    // Gem seal — same room-scoped lifecycle as the stairs.
    this.gemSeal?.destroy();
    this.gemSeal = null;

    // If we were in a boss fight, the boss was just destroyed along with the
    // enemies group — drop the references + clear the no-hit flag so the next
    // boss spawn (e.g. on a re-entry) starts from a clean slate.
    this.activeBoss = null;
    this.bossNoHitInProgress = false;
    this.bossDamageCount = 0;
    this.registry.set('bossNoHitInProgress', false);

    // Snapshot uncollected pickups into the room descriptor so they reappear
    // when the player comes back. The group itself persists across rooms — we
    // only destroy the live children here.
    //
    // Item / Gem pickups are usually skipped: treasure pedestals are tracked
    // via `desc.looted`, shop slots via `desc.purchasedShopSlots`, gold-crate
    // items are intentionally ephemeral. Boss-room rewards are the exception:
    // there's no separate re-spawn path for them, so leaving the boss room
    // without picking the boss-pool item or the no-hit gem used to delete
    // them outright. For cleared boss rooms we capture the item id / gem
    // floor id so re-entry rebuilds the exact same pedestal / gem.
    const leavingDesc = this.layout.rooms.get(this.currentRoomId);
    const captureBossRewards =
      leavingDesc?.kind === RoomKind.Boss && leavingDesc.cleared === true;
    if (leavingDesc) {
      const snapshots: PickupSnapshot[] = [];
      for (const child of this.pickups.getChildren()) {
        if (!(child instanceof BasePickup)) continue;
        if (child.shopSlotIndex !== undefined) continue;
        if (child.kind === PickupKind.Item) {
          if (captureBossRewards && child instanceof ItemPickup) {
            snapshots.push({
              kind: child.kind,
              x: child.x,
              y: child.y,
              itemId: child.itemId,
            });
          }
          continue;
        }
        if (child.kind === PickupKind.Gem) {
          if (captureBossRewards && child instanceof GemPickup) {
            snapshots.push({
              kind: child.kind,
              x: child.x,
              y: child.y,
              gemFloorId: child.gemFloorId,
            });
          }
          continue;
        }
        snapshots.push({ kind: child.kind, x: child.x, y: child.y });
      }
      leavingDesc.pendingPickups = snapshots;
    }
    this.pickups.clear(true, true);

    // Tear down shop slot price labels — they're not part of `pickups` and
    // would otherwise leak into the next room.
    for (const label of this.currentShopPriceLabels) label.destroy();
    this.currentShopPriceLabels = [];

    this.currentRoom.destroy();
  }

  private spawnEnemiesForRoom(
    desc: RoomDescriptor,
    playerSpawn: { x: number; y: number },
  ): void {
    const rng = new RNG(`spawn-${desc.id}`);
    const interiorMinX = 2 * TILE_SIZE;
    const interiorMaxX = (ROOM_WIDTH_TILES - 2) * TILE_SIZE;
    const interiorMinY = 2 * TILE_SIZE;
    const interiorMaxY = (ROOM_HEIGHT_TILES - 2) * TILE_SIZE;
    const minDistSq = SAFE_SPAWN_DISTANCE * SAFE_SPAWN_DISTANCE;

    // Widen each floor's `as const`-narrowed roster so a single
    // `rng.pickWeighted` call accepts every floor — without the cast,
    // TypeScript treats every floor's tuple type as incompatible with the
    // others.
    const roster = FLOORS[this.currentFloorId]
      .enemyRoster as readonly {
        id: EnemyId;
        weight: number;
        minPerRoom?: number;
        maxPerRoom?: number;
      }[];
    const ctx = {
      scene: this,
      target: this.player,
      enemyProjectilePool: this.enemyProjectilePool,
      waxPuddleGroup: this.waxPuddleGroup,
    };

    // Track how many of each id have spawned so `maxPerRoom` caps can be
    // enforced both during forced spawns and weighted-pick fills.
    const spawnedById = new Map<EnemyId, number>();

    const spawnAt = (id: EnemyId): void => {
      let x = 0;
      let y = 0;
      // Try multiple positions until we find one outside the safe radius
      // around the player spawn. Falls back to the last roll if cramped.
      for (let attempt = 0; attempt < SAFE_SPAWN_MAX_ATTEMPTS; attempt++) {
        x = rng.intBetween(interiorMinX, interiorMaxX);
        y = rng.intBetween(interiorMinY, interiorMaxY);
        const dx = x - playerSpawn.x;
        const dy = y - playerSpawn.y;
        if (dx * dx + dy * dy >= minDistSq) break;
      }
      this.enemies.add(createEnemy(id, ctx, x, y));
      spawnedById.set(id, (spawnedById.get(id) ?? 0) + 1);
    };

    // Force-spawn `minPerRoom` instances of any roster entry that requests
    // them (e.g. mansion's Cursed Mirror). These count against the room's
    // total enemy budget; the weighted loop fills the remainder.
    let forcedCount = 0;
    for (const entry of roster) {
      const min = entry.minPerRoom ?? 0;
      for (let i = 0; i < min; i++) {
        spawnAt(entry.id);
        forcedCount++;
      }
    }

    const remaining = Math.max(0, desc.enemySpawnCount - forcedCount);
    for (let i = 0; i < remaining; i++) {
      // Build the eligible roster for this slot — drop any entry whose
      // `maxPerRoom` cap is already reached. If everything is capped out,
      // we'd rather spawn fewer enemies than violate a cap.
      const eligible = roster.filter((entry) => {
        const cap = entry.maxPerRoom;
        if (cap == null) return true;
        return (spawnedById.get(entry.id) ?? 0) < cap;
      });
      if (eligible.length === 0) break;
      const pick = rng.pickWeighted(eligible);
      spawnAt(pick.id as EnemyId);
    }
  }

  /**
   * Spawn a regular enemy at world `(x, y)` and register it with the active
   * room's enemy group. Used by boss-add summoning (Vine Lord phase 2). Boss
   * IDs are deliberately rejected; bosses are constructed directly.
   */
  spawnEnemyAt(id: EnemyId, x: number, y: number): BaseEnemy | null {
    if (!this.enemies) return null;
    const ctx = {
      scene: this,
      target: this.player,
      enemyProjectilePool: this.enemyProjectilePool,
      waxPuddleGroup: this.waxPuddleGroup,
    };
    const enemy = createEnemy(id, ctx, x, y);
    this.enemies.add(enemy);
    return enemy;
  }

  /**
   * Compute the current boss-HP scale factor (player effective DPS / base
   * DPS) and stash it on the registry so BossEnemy + VampireBody pick it up
   * during construction. Call this RIGHT BEFORE every boss instantiation —
   * the value reflects whichever items the player has picked up so far,
   * making the upcoming boss take roughly the same time to kill as a
   * base-stats fight regardless of build. Scale is clamped to ≥ 1.0 so a
   * weaker-than-base build doesn't shrink boss HP below the data value.
   */
  private updateBossHpScale(): void {
    const dmg = this.stats.getEffective('damage');
    const fr = this.stats.getEffective('fireRate');
    const baseDps = BASE_PLAYER_STATS.damage * BASE_PLAYER_STATS.fireRate;
    const ratio = baseDps > 0 ? (dmg * fr) / baseDps : 1.0;
    const scale = Math.max(1.0, ratio);
    this.registry.set('bossHpScale', scale);
  }

  /**
   * Resolve the floor's boss roster, instantiate the matching boss class at
   * the room center, and arm the no-hit tracker. Currently only Vine Lord
   * exists; future bosses get added to the switch as they're authored.
   */
  private spawnBossForRoom(): void {
    if (!this.currentRoom) return;
    const bossId = pickBossForFloor(
      this.currentFloorId,
      new RNG(`${this.dungeonSeed}-boss`),
    );
    if (!bossId) return; // floor has no authored boss yet
    const center = this.currentRoom.getCenter();
    this.updateBossHpScale();

    const boss = this.constructBossById(bossId, center.x, center.y);
    if (!boss) return;
    this.enemies.add(boss);
    this.activeBoss = boss;
    this.bossNoHitInProgress = true;
    this.registry.set('bossNoHitInProgress', true);
    this.bossDamageCount = 0;
    EventBus.emit('boss:spawned', { name: boss.displayName, maxHp: boss.maxHp });
    this.switchToBossTrack(boss.displayName);
  }

  /**
   * Crossfade to the boss-track that matches the active floor (or to
   * `prismarch` if the spawned boss IS the Prismarch — checked via
   * displayName since that's the same predicate the death-handler uses).
   */
  private switchToBossTrack(displayName: string): void {
    const isPrismarch = displayName === 'The Prismarch';
    const trackKey = bossTrackForFloor(this.currentFloorId, isPrismarch);
    if (trackKey) getMusicManager().playTrack(this, trackKey);
  }

  /**
   * DEV-only: force-spawn a boss in the current room, regardless of room kind
   * or whether a boss already exists. Removes any previous active boss + the
   * room's enemies first so encounters don't stack. Useful when a specific
   * boss's 25% roll never lines up.
   */
  private devSpawnBoss(bossId: string): void {
    if (!this.currentRoom) {
      // eslint-disable-next-line no-console
      console.warn('[__wiz.spawnBoss] No active room.');
      return;
    }
    if (this.activeBoss) {
      this.activeBoss.destroy();
      this.activeBoss = null;
    }
    this.enemies.clear(true, true);
    const center = this.currentRoom.getCenter();
    this.updateBossHpScale();

    const boss = this.constructBossById(bossId, center.x, center.y);
    if (!boss) return;
    this.enemies.add(boss);
    this.activeBoss = boss;
    this.bossNoHitInProgress = true;
    this.registry.set('bossNoHitInProgress', true);
    this.bossDamageCount = 0;
    EventBus.emit('boss:spawned', { name: boss.displayName, maxHp: boss.maxHp });
    this.switchToBossTrack(boss.displayName);
    this.currentRoom.closeAllDoors();
    // eslint-disable-next-line no-console
    console.log(`[__wiz.spawnBoss] Spawned ${boss.displayName}.`);
  }

  /**
   * Shared host adapter for every boss. All four current bosses need a
   * superset of the same dependencies (`enemyProjectilePool`, `spawnEnemyAt`,
   * `getPlayer`, `getRoomBounds`, `getTreePositions`). Building a single host
   * keeps `constructBossById` flat — each `case` just hands the boss its
   * host-typed view of this object.
   */
  private bossHost(): VineLordHost &
    MossyBehemothHost &
    PixieQueenHost &
    ForestHeartHost &
    ToadSovereignHost &
    BloomheartHost &
    DamselflyEmpressHost &
    BogColossusHost &
    MarquisOfMiragesHost &
    LordOnyxHost {
    return {
      enemyProjectilePool: this.enemyProjectilePool,
      spawnEnemyAt: (id, sx, sy) => this.spawnEnemyAt(id, sx, sy),
      getPlayer: () => this.player,
      addMirrorPortal: (portal) => this.mirrorPortals.add(portal),
      getRoomBounds: () => ({
        minX: 2 * TILE_SIZE,
        maxX: (ROOM_WIDTH_TILES - 2) * TILE_SIZE,
        minY: 2 * TILE_SIZE,
        maxY: (ROOM_HEIGHT_TILES - 2) * TILE_SIZE,
      }),
      getTreePositions: () => {
        if (!this.currentRoom) return [];
        return this.currentRoom.treePositions.map((p) => ({ x: p.x, y: p.y }));
      },
    };
  }

  /**
   * Boss-id → concrete instance dispatch. Bosses need ad-hoc construction
   * arguments (e.g. VineLord's host adapter) so they can't go through the
   * generic `createEnemy` factory. Returns `null` (with a console warning)
   * for unknown ids so the boss-room enter flow is forgiving on data drift.
   */
  private constructBossById(bossId: string, x: number, y: number): BossEnemy | null {
    const host = this.bossHost();
    switch (bossId) {
      case 'boss-vine-lord':
        return new VineLord(this, x, y, host);
      case 'boss-mossy-behemoth':
        return new MossyBehemoth(this, x, y, host);
      case 'boss-pixie-queen':
        return new PixieQueen(this, x, y, host);
      case 'boss-forest-heart':
        return new ForestHeart(this, x, y, host);
      case 'boss-toad-sovereign':
        return new ToadSovereign(this, x, y, host);
      case 'boss-bloomheart':
        return new Bloomheart(this, x, y, host);
      case 'boss-damselfly-empress':
        return new DamselflyEmpress(this, x, y, host);
      case 'boss-bog-colossus':
        return new BogColossus(this, x, y, host);
      case 'boss-marquis-of-mirages':
        return new MarquisOfMirages(this, x, y, host);
      case 'boss-lord-onyx':
        return new LordOnyx(this, x, y, host);
      default:
        console.warn(`[GameScene] Unknown boss id: ${bossId}`);
        return null;
    }
  }

  /**
   * React to `boss:killed`: open the doors (room cleared), drop the reward
   * pedestal + 2 hearts in the room center, and award the no-hit gem if the
   * player took zero damage during the fight. Spawn-protection is applied
   * to every reward so they don't auto-collect under the player's feet.
   */
  private handleBossKilled(payload: {
    x: number;
    y: number;
    name: string;
    enemyId: string;
    noHit: boolean;
  }): void {
    this.markCurrentRoomCleared();
    // Trophy/collection: log this boss as defeated, keyed by stable enemy
    // id so the save survives any future displayName rename pass (e.g.
    // 'Lord Onyx' → 'The Prismarch' renamed only the displayName, the id
    // is still 'boss-lord-onyx'). Idempotent — repeat kills no-op.
    MetaProgress.recordBossDefeated(payload.enemyId);

    // The Prismarch is the run finale — no reward pedestal, no exit stairs,
    // no further boss-rooms. Persist the cosmetic unlock and emit the
    // full-victory event so the win screen (Phase 5 Chunk 4 #5) can hook
    // in. Bypass the normal reward flow entirely.
    if (payload.name === 'The Prismarch') {
      this.handleLordOnyxKilled(payload);
      return;
    }

    // Crossfade back from the boss track to the floor track. EndScene's own
    // music handling kicks in if/when the player descends stairs or activates
    // the seal; until then the floor track plays for stair-walk-up + reward
    // collection.
    const floorTrack = floorIdToFloorTrack(this.currentFloorId);
    if (floorTrack) getMusicManager().playTrack(this, floorTrack);

    const center = this.currentRoom?.getCenter();
    if (center) {
      // No-hit gem gating + (Onyx) gem-count check both want the noHit flag
      // computed up-front. Boolean + damage counter both have to agree; a
      // mismatch indicates a tracking bug and is logged in dev.
      const noHit = this.bossNoHitInProgress && this.bossDamageCount === 0;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(
          `[boss:killed] flag=${this.bossNoHitInProgress} damageCount=${this.bossDamageCount} → noHit=${noHit}, hasGem(${this.currentFloorId})=${this.inventory.hasGem(this.currentFloorId)}`,
        );
      }

      // Reward pedestal: boss-pool item. On Onyx Mansion the only path that
      // makes the item useful is the Prismarch route — taking the exit
      // stairs ends the run without consuming items, so a freshly-picked
      // Onyx-pool item gets wasted. Only drop it if the player will have
      // all 3 gems for the seal (counting the gem this fight may award via
      // the no-hit reward). Other floors keep the unconditional drop.
      let shouldSpawnItem = true;
      if (this.currentFloorId === 'onyx-mansion') {
        const currentGems = this.inventory.getGems().size;
        const willGainOnyxGem = noHit && !this.inventory.hasGem('onyx-mansion');
        shouldSpawnItem = currentGems + (willGainOnyxGem ? 1 : 0) >= 3;
      }
      if (shouldSpawnItem) {
        this.spawnBossPoolItem(center.x, center.y);
      }

      // Two hearts flanking the pedestal — drop unconditionally on every
      // boss kill including the no-item Onyx case (player may need HP for
      // the run-end stairs anyway, or for the impending Prismarch fight).
      const heartOffset = TILE_SIZE * 1.5;
      const leftHeart = this.spawnPickup(PickupKind.Heart, center.x - heartOffset, center.y);
      leftHeart?.setSpawnProtection(700);
      const rightHeart = this.spawnPickup(PickupKind.Heart, center.x + heartOffset, center.y);
      rightHeart?.setSpawnProtection(700);

      // No-hit gem — Player must not already own this floor's gem.
      if (noHit && !this.inventory.hasGem(this.currentFloorId)) {
        const gem = new GemPickup(this, center.x, center.y - heartOffset, this.currentFloorId);
        gem.setSpawnProtection(700);
        this.pickups.add(gem);
      }

      // Onyx Mansion = end-of-progression. After the Vampire Twins die,
      // the run forks: gem seal (3 trophies → Lord Onyx room, Phase 5
      // Chunk 4 #3) OR exit stairs (no-gems early-out → win-screen-
      // incomplete, #5). Both spawn so the player chooses. For other
      // floors, fall back to the normal "stairs to next floor" path.
      if (this.currentFloorId === 'onyx-mansion') {
        this.spawnGemSealInCurrentRoom();
        this.spawnStairsInCurrentRoom(() => this.handleOnyxExit(), 'ENTER THE LIGHT');
      } else if (this.hasNextFloor()) {
        this.spawnStairsInCurrentRoom();
      }
    }

    this.activeBoss = null;
    this.bossNoHitInProgress = false;
    this.bossDamageCount = 0;
    this.registry.set('bossNoHitInProgress', false);
    void payload; // payload.noHit is also available; we trust our own flag
  }

  /**
   * True if there's a floor after `this.currentFloorId` in `FLOOR_ORDER`.
   * Used to gate stairs spawning + the floor-transition path.
   */
  private hasNextFloor(): boolean {
    const idx = FLOOR_ORDER.indexOf(this.currentFloorId);
    return idx >= 0 && idx + 1 < FLOOR_ORDER.length;
  }

  /**
   * Place the stairs sprite in the current room (above the loot, so the
   * player picks rewards up first then walks onto the stairs to descend).
   * Wires a player-overlap that the per-frame `tickStairsInteract` reads to
   * gate an [E]-confirmed action — defaults to `advanceToNextFloor` for
   * normal floors. The Onyx exit path overrides both `onConfirm` (to fire
   * the incomplete-victory EndScene) and `promptText` ("ENTER THE LIGHT").
   * Idempotent.
   */
  private spawnStairsInCurrentRoom(
    onConfirm?: () => void,
    promptText: string = 'ENTER NEXT FLOOR',
  ): void {
    const center = this.currentRoom?.getCenter();
    if (!center) return;

    // Tear down a previous stairs instance (re-entry / paranoia).
    this.stairsOverlap?.destroy();
    this.stairsOverlap = null;
    this.stairsSprite?.destroy();
    this.stairsSprite = null;
    this.stairsPrompt?.destroy();
    this.stairsPrompt = null;
    this.stairsAction = null;
    this.stairsInRange = false;
    this.stairsActionFired = false;

    // Stairs sit ~2.5 tiles above center, above the gem-reward slot, so the
    // boss-pool item + hearts read first as the player walks up.
    const stairsX = center.x;
    const stairsY = center.y - TILE_SIZE * 2.5;

    this.stairsSprite = this.add
      .image(stairsX, stairsY, TextureKeys.Stairs)
      .setDepth(DepthLayers.FloorDecoration)
      .setScale(WORLD_SPRITE_SCALE);
    this.physics.add.existing(this.stairsSprite, true);

    // Subtle pulse so the sigil telegraphs "step on me".
    this.tweens.add({
      targets: this.stairsSprite,
      scale: { from: 0.96 * WORLD_SPRITE_SCALE, to: 1.04 * WORLD_SPRITE_SCALE },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    // Slow rotation so the rune-disc reads as "actively channelling magic"
    // rather than a static decal. Independent tween from the scale pulse —
    // Phaser merges them on the same target without conflict.
    this.tweens.add({
      targets: this.stairsSprite,
      rotation: Math.PI * 2,
      duration: 8000,
      repeat: -1,
    });

    // [E] interact prompt — same pattern as GemSeal. Sits above the sigil,
    // fades in only when the player overlaps the stairs sprite.
    this.stairsPrompt = this.add
      .text(stairsX, stairsY - 28, `[E]  ${promptText}`, {
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

    this.stairsAction = onConfirm ?? (() => this.advanceToNextFloor());
  }

  /**
   * Per-frame stairs interaction tick — mirror of `tickGemSealInteract`.
   * Updates the `[E] ENTER NEXT FLOOR` prompt's alpha based on the live
   * player↔stairs overlap, then fires `stairsAction` on a fresh [E] press.
   * `stairsActionFired` latches the call so a long [E] press across the
   * fade-out doesn't double-fire. Skipped during room transitions.
   */
  private tickStairsInteract(): void {
    const sprite = this.stairsSprite;
    if (!sprite) return;
    if (this.inTransition) return;

    const inRange = !!this.physics.overlap(this.player, sprite);
    if (inRange !== this.stairsInRange) {
      this.stairsInRange = inRange;
      if (this.stairsPrompt) {
        this.tweens.killTweensOf(this.stairsPrompt);
        this.tweens.add({
          targets: this.stairsPrompt,
          alpha: inRange ? 1 : 0,
          duration: 180,
          ease: 'Sine.Out',
        });
      }
    }
    if (
      inRange &&
      !this.stairsActionFired &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      this.stairsActionFired = true;
      this.stairsAction?.();
    }
  }

  /**
   * Spawn the Gem Seal at the bottom-center of the current (Onyx vampire)
   * room. Reads the player's earned gems at spawn-time so the seal renders
   * the right number of lit sockets. Idempotent — re-spawn destroys any
   * previous seal first.
   */
  private spawnGemSealInCurrentRoom(): void {
    const center = this.currentRoom?.getCenter();
    if (!center) return;

    // Tear down a previous instance (re-entry).
    this.gemSeal?.destroy();
    this.gemSeal = null;

    const sealX = center.x;
    const sealY = center.y + TILE_SIZE * 3;

    this.gemSeal = new GemSeal(this, sealX, sealY, this.inventory.getGems());
    // No overlap-driven auto-activation — the player has to confirm with [E].
    // `tickGemSealInteract` polls overlap + the interact key each frame.
  }

  /**
   * Per-frame gem-seal interaction tick. Walks two state branches:
   *   1. Mirror the live overlap into the seal so the "[E] PLACE GEMS" prompt
   *      tracks the player.
   *   2. On a fresh [E] press while in range, hand off to `tryInteract` —
   *      that's where the 3/3 vs missing-gems branch lives.
   * Skipped during room transitions so a stale key press across a fade
   * doesn't fire on the next room. Inexpensive when no seal is alive (early
   * return after the null check).
   */
  private tickGemSealInteract(): void {
    const seal = this.gemSeal;
    if (!seal) return;
    if (this.inTransition) return;
    const inRange = this.physics.overlap(this.player, seal.trigger);
    seal.setInRange(inRange);
    if (
      inRange &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      // Pass the player's current position so the placement animation
      // springs from the wizard rather than from a hardcoded point.
      seal.tryInteract(this.player.x, this.player.y);
    }
  }

  /**
   * Lord Onyx dead → Prismancy red/gold cosmetic skin unlocks (persists
   * to localStorage; auto-applies on the next Player construction). Then
   * placeholder full-victory feedback + `run:onyxFullVictory` event — the
   * win screen wires in here for #5.
   */
  private handleLordOnyxKilled(payload: {
    x: number;
    y: number;
    name: string;
    noHit: boolean;
  }): void {
    const wasAlreadyUnlocked = Cosmetics.hasPrismancySkin();
    Cosmetics.unlockPrismancySkin();

    this.activeBoss = null;
    this.bossNoHitInProgress = false;
    this.bossDamageCount = 0;
    this.registry.set('bossNoHitInProgress', false);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[run:onyxFullVictory] Lord Onyx defeated. Skin newly unlocked: ${!wasAlreadyUnlocked}`,
      );
    }

    // Brief celebratory flash + shake, then immediately into the EndScene.
    // The banner / unlock toast that used to live here was pulled — the
    // EndScene's "VICTORY" headline owns that beat now, and the in-room text
    // duplicated against the camera fade.
    this.cameras.main.flash(420, 240, 200, 100, false);
    this.cameras.main.shake(360, 0.006);

    EventBus.emit('run:onyxFullVictory');
    // Trophy/collection: count the win + update best run time. The start
    // timestamp comes from the registry slot we set at fresh-run init —
    // floor transitions don't reset it, so this measures the full
    // start-to-Prismarch span. If the registry has no start (e.g. dev
    // hooks like `__wiz.spawnLordOnyx` skipped the normal flow) we still
    // count the win but pass a zero duration which `recordRunWonFull`
    // treats as "don't update bestRunMs" via the strict-greater-zero
    // gate below — `bestRunMs` should only ever reflect real runs.
    const runStartedAt = (this.registry.get('runStartedAt') as number | undefined) ?? null;
    const durationMs = runStartedAt !== null ? Math.max(0, Date.now() - runStartedAt) : 0;
    MetaProgress.recordRunWonFull(durationMs);
    // Short window so the flash + shake reads, then spawn the exit sigil
    // with the same [E] confirm pattern as the no-gems Onyx exit. Auto-fade
    // to EndScene felt abrupt — the player should walk into the light on
    // their own beat. Doors stay closed (handleLordOnyxKilled bypasses the
    // normal openAllDoors path), which funnels attention to the sigil.
    this.time.delayedCall(900, () => {
      this.spawnStairsInCurrentRoom(
        () => this.transitionToEndScene('full'),
        'ENTER THE LIGHT',
      );
    });
    void payload;
  }

  /**
   * No-gems exit on Onyx Mansion. Fade to black, fire the
   * `run:onyxExitTaken` event for any listeners, then transition to the
   * EndScene with the "incomplete" variant — the run is over but the
   * player skipped the Prismarch fight.
   */
  private handleOnyxExit(): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[run:onyxExitTaken] No-gems exit taken on Onyx Mansion.');
    }
    EventBus.emit('run:onyxExitTaken');
    MetaProgress.recordRunWonIncomplete();
    this.transitionToEndScene('incomplete');
  }

  /**
   * Tear down GameScene + UIScene and start EndScene with the given
   * variant, gated by an `inTransition` latch so a double-trigger (e.g.
   * stairs overlap firing twice in a frame) doesn't double-stop the
   * scenes. Camera fades to black first so the EndScene's all-black
   * backdrop reads as a continuous fade rather than a hard cut.
   */
  private transitionToEndScene(variant: 'incomplete' | 'full'): void {
    if (this.inTransition) return;
    this.inTransition = true;
    // Fade music out together with the camera fade so the EndScene starts
    // in cinematic silence. EndScene re-uses MainMenu's title track when it
    // auto-returns; nothing plays during the EndScene itself.
    getMusicManager().stop(this, { fadeMs: 600 });
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop(SceneKeys.UI);
      this.scene.stop(SceneKeys.Game);
      this.scene.start(SceneKeys.End, { variant });
    });
  }

  /**
   * Seal activation → Lord Onyx spawn. After the seal's own activation
   * cinematic, we close the room doors, drop a brief "Lord Onyx stirs"
   * banner, then spawn the boss after a short dramatic delay so the
   * player has a moment to register the transition.
   */
  private handleSealActivated(payload: { x: number; y: number }): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[seal:activated] All 3 gems at (${payload.x}, ${payload.y}).`);
    }
    // Close the doors immediately — the Lord Onyx fight is committed the
    // moment the seal lights up; no walking out.
    this.currentRoom?.closeAllDoors();
    // Tear down the no-gems exit stairs — they shouldn't compete with the
    // boss arena. Re-entry path won't respawn them either since the boss
    // re-arms `bossNoHitInProgress` (different flag than vampire kill).
    this.stairsOverlap?.destroy();
    this.stairsOverlap = null;
    this.stairsSprite?.destroy();
    this.stairsSprite = null;
    this.stairsPrompt?.destroy();
    this.stairsPrompt = null;
    this.stairsAction = null;
    this.stairsInRange = false;
    this.stairsActionFired = false;

    const banner = this.add
      .text(payload.x, payload.y - 56, 'The Prismarch stirs...', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff80ff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(DepthLayers.HUD - 1);
    // Fade the banner out so it doesn't linger over the boss bar.
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      delay: 1400,
      duration: 600,
      onComplete: () => banner.destroy(),
    });

    // Brief dramatic delay after the seal's cinematic so the room transitions
    // mentally from "puzzle solved" to "boss arena" before the bar appears.
    this.time.delayedCall(900, () => this.spawnLordOnyxInCurrentRoom());
  }

  /**
   * Spawn Lord Onyx at the room center. Uses the same `activeBoss` slot as
   * the regular boss path, so the existing no-hit tracking, HP-bar, and
   * `boss:killed` plumbing all flow through unchanged. Differentiation is
   * by `displayName` in `handleBossKilled`.
   */
  private spawnLordOnyxInCurrentRoom(): void {
    if (!this.currentRoom) return;
    if (this.activeBoss) {
      // Defensive: shouldn't happen (vampires are dead, no other boss
      // could exist) but if it does, don't double-spawn.
      return;
    }
    const center = this.currentRoom.getCenter();
    this.updateBossHpScale();
    const boss = new LordOnyx(this, center.x, center.y, this.bossHost());
    this.enemies.add(boss);
    this.activeBoss = boss;
    this.bossNoHitInProgress = true;
    this.registry.set('bossNoHitInProgress', true);
    this.bossDamageCount = 0;
    EventBus.emit('boss:spawned', { name: boss.displayName, maxHp: boss.maxHp });
    this.switchToBossTrack(boss.displayName);
  }

  /**
   * Spawn a boss-pool item pedestal at world `(x, y)`. Same deterministic
   * seed scheme as treasure rooms so re-rolling the same kill produces the
   * same item. Applies a brief spawn-protection so the player can't absorb
   * it on the killing-blow tick.
   */
  private spawnBossPoolItem(x: number, y: number): ItemPickup | null {
    if (!this.currentRoom) return null;
    const pickedIds = this.itemSystem.getPickedIds();
    const seedSuffix = Array.from(pickedIds).sort().join(',');
    const rng = new RNG(
      `${this.dungeonSeed}-boss-${this.currentRoomId}-${Math.floor(x)}-${Math.floor(y)}-${seedSuffix}`,
    );
    const exclude = new Set<ItemId>(pickedIds as ReadonlySet<ItemId>);
    for (const id of this.getFloorReservedItemIds()) exclude.add(id as ItemId);
    const itemDef = pickItemFromPool(ItemPool.Boss, rng, exclude, this.currentFloorId);
    if (!itemDef) return null;
    const pickup = new ItemPickup(this, x, y, itemDef, this.itemSystem);
    pickup.setSpawnProtection(700);
    this.pickups.add(pickup);
    return pickup;
  }

  private setupCollidersForActiveRoom(): void {
    const deactivateMissile = (missileObj: unknown): void => {
      const missile = missileObj as Phaser.Physics.Arcade.Sprite & {
        deactivate?: () => void;
      };
      missile.deactivate?.();
    };
    /** processCallback for enemy-projectile wall/barrier/blocker colliders:
     * if a projectile sets `passThroughWalls = true` (used by The Prismarch's
     * Crimson Web waves so the wave-bolts aren't kills the moment a thorn
     * touches a wall), the collider returns false → no separation, no
     * deactivate callback. Player overlaps still trigger normally. */
    const enemyProjectileProcess = (proj: unknown): boolean => {
      const p = proj as { passThroughWalls?: boolean };
      return !p.passThroughWalls;
    };

    this.playerWallCollider = this.physics.add.collider(this.player, this.currentRoom.walls);
    this.enemyWallCollider = this.physics.add.collider(this.enemies, this.currentRoom.walls);
    this.missileWallCollider = this.physics.add.collider(
      this.missilePool.getGroup(),
      this.currentRoom.walls,
      deactivateMissile,
    );

    // Enemy projectiles share the same wall kill behaviour. Crimson-Web
    // wave thorns opt out via `passThroughWalls` (see processCallback).
    this.enemyProjectileWallCollider = this.physics.add.collider(
      this.enemyProjectilePool.getGroup(),
      this.currentRoom.walls,
      deactivateMissile,
      enemyProjectileProcess,
    );

    // Enemy-only door blockers: keep enemies + their projectiles inside the
    // room even when doors are open. Player + their missiles aren't part of
    // these colliders, so they can pass through normally.
    this.enemyBlockerCollider = this.physics.add.collider(
      this.enemies,
      this.currentRoom.enemyBlockers,
    );
    this.enemyProjectileBlockerCollider = this.physics.add.collider(
      this.enemyProjectilePool.getGroup(),
      this.currentRoom.enemyBlockers,
      deactivateMissile,
      enemyProjectileProcess,
    );

    // Door barriers: each closed door has its own barrier image with a static
    // body. Register colliders for each so player + projectiles bounce off.
    for (const door of this.currentRoom.doors) {
      const barrier = door.getBarrier();
      if (!barrier) continue;
      this.playerBarrierColliders.push(this.physics.add.collider(this.player, barrier));
      this.missileBarrierColliders.push(
        this.physics.add.collider(this.missilePool.getGroup(), barrier, deactivateMissile),
      );
      this.enemyProjectileBarrierColliders.push(
        this.physics.add.collider(
          this.enemyProjectilePool.getGroup(),
          barrier,
          deactivateMissile,
          enemyProjectileProcess,
        ),
      );
    }

    // Missile ↔ enemy: use instanceof to be safe against arg-order swaps.
    // Piercing (Magic Shard): a missile with `piercingRemaining > 0` keeps
    // flying after a hit, with damage tapering via `PIERCING_DAMAGE_FACTORS`
    // (1.0 → 0.75 → 0.5). The same enemy can't be hit twice by one missile —
    // `missile.hitEnemies` tracks who's been processed and Phaser overlaps
    // fire every frame the bodies overlap.
    // Burn (Fire Orb): if `missile.burnDamageFactor > 0`, the hit splits
    // `factor × hitDamage` evenly across `BURN_TICK_COUNT` ticks via
    // `BaseEnemy.applyBurn`.
    this.missileEnemyOverlap = this.physics.add.overlap(
      this.missilePool.getGroup(),
      this.enemies,
      (a, b) => {
        try {
          const missile = (a instanceof MagicMissile ? a : b) as MagicMissile;
          const enemy = (a instanceof BaseEnemy ? a : b) as BaseEnemy;
          if (!missile.active || !enemy.active) return;
          if (missile.hitEnemies.has(enemy)) return;
          missile.hitEnemies.add(enemy);

          const factorIdx = Math.min(
            missile.hitCount,
            PIERCING_DAMAGE_FACTORS.length - 1,
          );
          const factor = PIERCING_DAMAGE_FACTORS[factorIdx]!;
          const hitDamage = missile.damage * factor;

          const mx = missile.x;
          const my = missile.y;
          const knockback = CombatSystem.knockbackVector(
            { x: mx, y: my },
            { x: enemy.x, y: enemy.y },
            KNOCKBACK_FORCE_ENEMY,
          );
          EventBus.emit('enemy:hit', { x: enemy.x, y: enemy.y });
          enemy.takeDamage(hitDamage, knockback);
          if (missile.burnDamageFactor > 0 && enemy.active) {
            const totalBurn = hitDamage * missile.burnDamageFactor;
            enemy.applyBurn(totalBurn / BURN_TICK_COUNT, BURN_TICK_COUNT);
          }

          missile.hitCount++;
          if (missile.piercingRemaining > 0) {
            missile.piercingRemaining--;
          } else {
            missile.deactivate();
          }
        } catch (err) {
          console.error('[missile↔enemy overlap] error:', err);
        }
      },
    );

    this.playerEnemyOverlap = this.physics.add.overlap(this.player, this.enemies, (a, b) => {
      try {
        const enemy = (a instanceof BaseEnemy ? a : b) as BaseEnemy;
        if (!enemy.active) return;
        if (!this.player.health.isVulnerable(this.time.now)) return;
        const knockback = CombatSystem.knockbackVector(
          { x: enemy.x, y: enemy.y },
          { x: this.player.x, y: this.player.y },
          KNOCKBACK_FORCE_PLAYER,
        );
        const landed = this.player.takeDamage(
          enemy.getContactDamage(),
          knockback,
          this.time.now,
        );
        if (landed) {
          this.cameras.main.shake(SCREEN_SHAKE_DURATION_MS, SCREEN_SHAKE_INTENSITY);
        }
      } catch (err) {
        console.error('[player↔enemy overlap] error:', err);
      }
    });

    // Enemy projectile ↔ player: damage with i-frames, knockback away from
    // the projectile's travel direction, and deactivate the projectile.
    this.enemyProjectilePlayerOverlap = this.physics.add.overlap(
      this.player,
      this.enemyProjectilePool.getGroup(),
      (a, b) => {
        try {
          const proj = (a instanceof EnemyProjectile ? a : b) as EnemyProjectile;
          if (!proj.active) return;
          if (!this.player.health.isVulnerable(this.time.now)) return;
          const px = proj.x;
          const py = proj.y;
          proj.deactivate();
          const knockback = CombatSystem.knockbackVector(
            { x: px, y: py },
            { x: this.player.x, y: this.player.y },
            KNOCKBACK_FORCE_PLAYER,
          );
          const landed = this.player.takeDamage(
            ENEMY_PROJECTILE_DAMAGE,
            knockback,
            this.time.now,
          );
          if (landed) {
            this.cameras.main.shake(SCREEN_SHAKE_DURATION_MS, SCREEN_SHAKE_INTENSITY);
          }
        } catch (err) {
          console.error('[enemyProjectile↔player overlap] error:', err);
        }
      },
    );

    // Wax puddle ↔ player: contact damage with the player's normal i-frames.
    // The puddle is a hazard tile (no destroy on hit) — it just keeps
    // burning for its full lifetime, so a player who stands in it gets
    // ticked once per i-frame window.
    this.waxPuddlePlayerOverlap = this.physics.add.overlap(
      this.player,
      this.waxPuddleGroup.getGroup(),
      (a, b) => {
        try {
          const puddle = (a instanceof WaxPuddle ? a : b) as WaxPuddle;
          if (!puddle.active) return;
          if (!this.player.health.isVulnerable(this.time.now)) return;
          // Knockback away from the puddle so the player at least gets
          // nudged out of repeated tick stacking on the same frame.
          const knockback = CombatSystem.knockbackVector(
            { x: puddle.x, y: puddle.y },
            { x: this.player.x, y: this.player.y },
            KNOCKBACK_FORCE_PLAYER,
          );
          const landed = this.player.takeDamage(puddle.damage, knockback, this.time.now);
          if (landed) {
            this.cameras.main.shake(SCREEN_SHAKE_DURATION_MS, SCREEN_SHAKE_INTENSITY);
          }
        } catch (err) {
          console.error('[waxPuddle↔player overlap] error:', err);
        }
      },
    );

    // Mirror Portal ↔ player missile: lets the player damage the entry
    // portal (HP 3) during the Marquis-of-Mirages Mirror Special. Exit
    // portals also overlap but their `takeDamage` short-circuits to false
    // → missile passes through visually but deactivates on hit (same idiom
    // as enemy hits). This is fine because the exit's role is purely the
    // boss-emerge anchor; the player has no incentive to shoot it.
    this.missileMirrorPortalOverlap = this.physics.add.overlap(
      this.missilePool.getGroup(),
      this.mirrorPortals,
      (a, b) => {
        try {
          const missile = (a instanceof MagicMissile ? a : b) as MagicMissile;
          const portal = (a instanceof MirrorPortal ? a : b) as MirrorPortal;
          if (!missile.active || !portal.active) return;
          if (!portal.isEntry) return;
          missile.deactivate();
          portal.takeDamage(missile.damage);
        } catch (err) {
          console.error('[missile↔mirrorPortal overlap] error:', err);
        }
      },
    );

    // Mirror Portal ↔ player: solid collider so the player can't walk
    // through portals (positional choice — destroying the entry portal
    // requires committing to a position). Exit portal also blocks; that's
    // intentional, the exit is briefly in-room during the special.
    this.playerMirrorPortalCollider = this.physics.add.collider(
      this.player,
      this.mirrorPortals,
    );

    // Door triggers: walking onto an OPEN door zone transitions to the
    // neighbor. Closed doors are blocked by their barrier so the player
    // can't reach the trigger directly — but a LOCKED door's trigger zone
    // sits underneath its barrier, so the overlap still fires. We treat
    // that case as an unlock attempt: spend a key to drop the lock, then
    // wait for the next overlap (the player has to walk through again now
    // that the barrier is gone).
    for (const door of this.currentRoom.doors) {
      const c = this.physics.add.overlap(this.player, door.trigger, () => {
        if (this.inTransition) return;
        if (door.isLocked()) {
          // Block unlock attempts during combat — locked treasure / shop
          // doors should obey the same "no exits while uncleared" rule as
          // every other door. Without this gate a player with a key could
          // bail mid-fight into the safe room, which the user flagged as
          // a bug ("walking through a locked door during the fight").
          const desc = this.layout.rooms.get(this.currentRoomId);
          if (!desc?.cleared) return;
          if (!this.inventory.spendKey()) return;
          if (!door.tryUnlock()) return;
          this.markDoorUnlockedInLayout(door.direction);
          // Drop the now-stale barrier collider so the next overlap can
          // reach the trigger cleanly. Easiest: tear all barrier colliders
          // and re-register against the remaining locked barriers, same
          // strategy as `markCurrentRoomCleared`.
          this.refreshBarrierColliders();
          EventBus.emit('door:unlocked', {
            roomId: this.currentRoomId,
            direction: door.direction,
          });
          return;
        }
        if (door.isClosed()) return;
        // Require the player's body center to have crossed past the door
        // tile's center along the door axis before transitioning. Without
        // this gate, walking along the inside of the wall and brushing the
        // edge of the door tile (whose 64x64 trigger zone touches the wall
        // tiles flanking it) instantly transitions — the player has to
        // actually step *into* the doorway.
        if (!this.playerHasCommittedToDoor(door)) return;
        this.transitionThroughDoor(door);
      });
      this.doorTriggerOverlaps.push(c);
    }

    // Player ↔ pickups: walk-over collection. Three short-circuits before
    // the actual `onCollect`:
    //   1. `canCollect` — refuses no-op pickups (heart at full HP). Free
    //      drops just stay on the floor; shop slots additionally flash red.
    //   2. `tryPurchase` — for shop slots, charges coins. `'too-poor'`
    //      flashes the slot and emits `shop:rejected` so the HUD can react.
    //   3. `onCollect` — applies the actual pickup effect; `false` keeps
    //      the pickup on the floor (currently unused since `canCollect`
    //      already covers the full-HP heart case).
    this.playerPickupOverlap = this.physics.add.overlap(
      this.player,
      this.pickups,
      (a, b) => {
        try {
          const pickup = (a instanceof BasePickup ? a : b) as BasePickup;
          const player = (a instanceof Player ? a : b) as Player;
          if (!pickup.active) return;

          if (!pickup.canCollect(player)) {
            // Shop slot at full HP / similar, or a locked crate — tell the
            // player. Free drops (no price + no key gate) just stay silent
            // like before.
            if (pickup.price !== undefined || pickup.requiresKey) {
              pickup.flashRejected(this);
            }
            return;
          }

          // Key-gated pickup (gold crate). Walking up without a key in the
          // inventory wackels the crate but doesn't open it.
          if (pickup.requiresKey) {
            if (!this.inventory.spendKey()) {
              pickup.flashRejected(this);
              return;
            }
            // Key spent — same unlock SFX as locked doors (door:unlocked
            // doesn't fire here because the gold crate path bypasses that
            // event, so we trigger the SFX directly).
            getSfxSynth().playDoorUnlock();
            // Fall through to the normal pay/onCollect path.
          }

          const purchase = pickup.tryPurchase(this.inventory);
          if (purchase === 'too-poor') {
            pickup.flashRejected(this);
            EventBus.emit('shop:rejected', { price: pickup.price ?? 0 });
            return;
          }

          const absorbed = pickup.onCollect(this, this.inventory, player);
          if (!absorbed) return;

          EventBus.emit('pickup:collected', { kind: pickup.kind });

          // Pedestal items mark the room looted so re-entry doesn't respawn
          // them (we don't snapshot Items into pendingPickups). Shop-slot
          // items are EXCLUDED here — they're tracked per-slot via
          // `purchasedShopSlots`, and flipping `looted` would make the
          // ShopRoomBuilder skip the entire shop on re-entry instead of
          // just the bought slot.
          if (pickup.kind === PickupKind.Item && pickup.shopSlotIndex === undefined) {
            const desc = this.layout.rooms.get(this.currentRoomId);
            if (desc) desc.looted = true;
          }

          // Shop slot purchase: persist the slot index + tear down the
          // matching price label, and flip `looted` once every slot is bought.
          if (purchase === 'paid' && pickup.shopSlotIndex !== undefined) {
            const desc = this.layout.rooms.get(this.currentRoomId);
            if (desc) {
              const purchased = desc.purchasedShopSlots ?? [];
              if (!purchased.includes(pickup.shopSlotIndex)) {
                desc.purchasedShopSlots = [...purchased, pickup.shopSlotIndex];
              }
              if ((desc.purchasedShopSlots ?? []).length >= SHOP_SLOT_COUNT) {
                desc.looted = true;
              }
            }
            const labelIndex = this.currentShopPriceLabels.findIndex(
              (l) => Math.abs(l.x - pickup.x) < 1,
            );
            if (labelIndex >= 0) {
              this.currentShopPriceLabels[labelIndex]?.destroy();
              this.currentShopPriceLabels.splice(labelIndex, 1);
            }
            EventBus.emit('shop:purchased', {
              kind: pickup.kind,
              price: pickup.price ?? 0,
            });
          }

          pickup.destroy();
        } catch (err) {
          console.error('[player↔pickup overlap] error:', err);
        }
      },
    );
  }

  /**
   * Map-teleport entry path: same fade transition as a door walk-through but
   * the player lands in the center of the target room (no entry direction).
   */
  private teleportToRoom(targetRoomId: string): void {
    if (targetRoomId === this.currentRoomId) return;
    if (!this.layout.rooms.has(targetRoomId)) return;
    this.inTransition = true;
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.enterRoom(targetRoomId, null);
      this.cameras.main.fadeIn(120, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.inTransition = false;
      });
    });
  }

  private transitionThroughDoor(door: Door): void {
    this.inTransition = true;
    const dir = door.direction;
    const nextRoomId = this.neighborRoomId(this.currentRoomId, dir);
    if (!nextRoomId) {
      this.inTransition = false;
      return;
    }
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.enterRoom(nextRoomId, dir);
      this.cameras.main.fadeIn(120, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.inTransition = false;
      });
    });
  }

  /**
   * Has the player's body center crossed past the door tile's center along
   * the door axis? Used to gate door-overlap transitions so the player
   * actually has to walk into the doorway, not just slide their body's
   * bounding box against its edge from the inside of the wall.
   *
   * The door trigger zone is one full tile (64x64) sitting on the wall row
   * of the room. Walking along the inside of the wall puts the player's
   * body adjacent to that zone — Phaser arcade overlap considers touching
   * AABBs as overlap, so without this gate the trigger fires immediately
   * on a wall-slide. Requiring center.crossed-axis-past-trigger means the
   * player must step at least halfway into the door tile to transition.
   */
  private playerHasCommittedToDoor(door: Door): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return false;
    const cx = body.center.x;
    const cy = body.center.y;
    const tx = door.trigger.x;
    const ty = door.trigger.y;
    switch (door.direction) {
      case 'up':
        return cy < ty;
      case 'down':
        return cy > ty;
      case 'left':
        return cx < tx;
      case 'right':
        return cx > tx;
    }
  }

  private neighborRoomId(fromRoomId: string, dir: Direction): string | null {
    const from = this.layout.rooms.get(fromRoomId);
    if (!from) return null;
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const id = `r-${from.gx + dx}-${from.gy + dy}`;
    return this.layout.rooms.has(id) ? id : null;
  }

  /**
   * Schedule a room-cleared check on the next tick so the enemy that just
   * triggered `enemy:killed` is fully torn down before we count survivors.
   */
  private checkRoomClearedSoon(): void {
    this.time.delayedCall(0, () => this.maybeMarkRoomCleared());
  }

  private maybeMarkRoomCleared(): void {
    const desc = this.layout.rooms.get(this.currentRoomId);
    if (!desc || desc.cleared) return;
    if (this.enemies.countActive(true) > 0) return;
    this.markCurrentRoomCleared();
  }

  private markCurrentRoomCleared(): void {
    const desc = this.layout.rooms.get(this.currentRoomId);
    if (!desc || desc.cleared) return;
    desc.cleared = true;
    this.currentRoom.openAllDoors();
    // Some barriers (locked treasure / shop doors) are still standing — only
    // their colliders are stale because Phaser invalidates colliders whose
    // body is destroyed. Drop everything and re-register colliders against
    // whatever barriers survived the open call.
    for (const c of this.playerBarrierColliders) c.destroy();
    for (const c of this.missileBarrierColliders) c.destroy();
    for (const c of this.enemyProjectileBarrierColliders) c.destroy();
    this.playerBarrierColliders = [];
    this.missileBarrierColliders = [];
    this.enemyProjectileBarrierColliders = [];
    const deactivateMissile = (missileObj: unknown): void => {
      const missile = missileObj as Phaser.Physics.Arcade.Sprite & {
        deactivate?: () => void;
      };
      missile.deactivate?.();
    };
    const enemyProjectileProcess = (proj: unknown): boolean => {
      const p = proj as { passThroughWalls?: boolean };
      return !p.passThroughWalls;
    };
    for (const door of this.currentRoom.doors) {
      const barrier = door.getBarrier();
      if (!barrier) continue;
      this.playerBarrierColliders.push(this.physics.add.collider(this.player, barrier));
      this.missileBarrierColliders.push(
        this.physics.add.collider(this.missilePool.getGroup(), barrier, deactivateMissile),
      );
      this.enemyProjectileBarrierColliders.push(
        this.physics.add.collider(
          this.enemyProjectilePool.getGroup(),
          barrier,
          deactivateMissile,
          enemyProjectileProcess,
        ),
      );
    }
    EventBus.emit('floor:roomCleared', { roomId: this.currentRoomId });
  }

  /**
   * After a locked door is unlocked, mark both sides of that connection in
   * the layout so re-entering the neighbor doesn't rebuild the door as
   * locked. We mutate via fresh DoorInfo objects to keep `DoorMap`'s
   * Readonly contract honest (same pattern as the generator).
   */
  private markDoorUnlockedInLayout(dir: Direction): void {
    const desc = this.layout.rooms.get(this.currentRoomId);
    if (!desc) return;
    const opposite: Direction =
      dir === 'up' ? 'down' : dir === 'down' ? 'up' : dir === 'left' ? 'right' : 'left';
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const neighborId = `r-${desc.gx + dx}-${desc.gy + dy}`;
    const neighbor = this.layout.rooms.get(neighborId);

    desc.doors = {
      ...desc.doors,
      [dir]: { ...desc.doors[dir], locked: false },
    };
    if (neighbor) {
      neighbor.doors = {
        ...neighbor.doors,
        [opposite]: { ...neighbor.doors[opposite], locked: false },
      };
    }
  }

  /**
   * Tear down all barrier colliders and re-register against whatever
   * barriers are still alive. Used after a door unlock so the freshly
   * destroyed barrier's collider doesn't reference a dead body, and so any
   * still-locked siblings keep blocking the player.
   */
  private refreshBarrierColliders(): void {
    for (const c of this.playerBarrierColliders) c.destroy();
    for (const c of this.missileBarrierColliders) c.destroy();
    for (const c of this.enemyProjectileBarrierColliders) c.destroy();
    this.playerBarrierColliders = [];
    this.missileBarrierColliders = [];
    this.enemyProjectileBarrierColliders = [];
    const deactivateMissile = (missileObj: unknown): void => {
      const missile = missileObj as Phaser.Physics.Arcade.Sprite & {
        deactivate?: () => void;
      };
      missile.deactivate?.();
    };
    const enemyProjectileProcess = (proj: unknown): boolean => {
      const p = proj as { passThroughWalls?: boolean };
      return !p.passThroughWalls;
    };
    for (const door of this.currentRoom.doors) {
      const barrier = door.getBarrier();
      if (!barrier) continue;
      this.playerBarrierColliders.push(this.physics.add.collider(this.player, barrier));
      this.missileBarrierColliders.push(
        this.physics.add.collider(this.missilePool.getGroup(), barrier, deactivateMissile),
      );
      this.enemyProjectileBarrierColliders.push(
        this.physics.add.collider(
          this.enemyProjectilePool.getGroup(),
          barrier,
          deactivateMissile,
          enemyProjectileProcess,
        ),
      );
    }
  }

  private handlePlayerDied(): void {
    MetaProgress.recordRunDied();
    // Stop the current track with a slow fade so the death sting (the
    // GameOver overlay's fade-in + R-restart hint) lands in silence.
    getMusicManager().stop(this, { fadeMs: 800 });
    this.time.delayedCall(400, () => {
      this.scene.launch(SceneKeys.GameOver);
      this.scene.pause();
    });
  }

  /**
   * Open the pause overlay scene. Pauses Game (UIScene + the running
   * tweens / physics step), then launches PauseScene on top. Resume is
   * handled inside PauseScene which calls `scene.resume(Game)` and stops
   * itself. Any in-flight restart-hold widget is reset so the bar doesn't
   * sit visible behind the pause overlay.
   */
  private openPauseMenu(): void {
    this.restartHoldStartedAt = null;
    this.setRestartHoldWidgetVisible(false);
    this.scene.pause();
    this.scene.launch(SceneKeys.Pause);
  }

  /**
   * Hold-R-during-run polling. The widget fades in as the user holds R, the
   * fill bar tracks elapsed time, and on threshold we kick a fresh run.
   * Releasing R before the threshold cleanly resets the widget. Skipped
   * during room transitions so the bar doesn't appear mid-fade.
   */
  override update(time: number, _delta: number): void {
    void _delta;
    if (this.inTransition) return;

    // ESC → pause overlay. Skip if the map is already pausing the scene
    // (TAB owns the map-mode pause flow, ESC shouldn't double-pause).
    if (
      this.pauseKey &&
      Phaser.Input.Keyboard.JustDown(this.pauseKey) &&
      !this.scene.isPaused()
    ) {
      this.openPauseMenu();
      return;
    }

    this.tickGemSealInteract();
    this.tickStairsInteract();

    if (!this.restartKey) return;

    // Start tracking only on a fresh keydown — `JustDown` returns true only
    // for the first frame after a press transition. Without this guard,
    // holding R through a hold-R reset would immediately re-arm tracking on
    // the new scene and loop forever (user reports a 1.2 s flicker).
    if (this.restartHoldStartedAt === null) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.restartHoldStartedAt = time;
        this.setRestartHoldWidgetVisible(true);
      }
      return;
    }

    if (this.restartKey.isDown) {
      const elapsed = time - this.restartHoldStartedAt;
      const progress = Math.min(1, elapsed / RESTART_HOLD_DURATION_MS);
      this.updateRestartHoldFill(progress);
      if (progress >= 1) {
        this.restartHoldStartedAt = null;
        this.setRestartHoldWidgetVisible(false);
        this.restartRun();
      }
    } else {
      this.restartHoldStartedAt = null;
      this.setRestartHoldWidgetVisible(false);
    }
  }

  /**
   * Build the screen-fixed "Hold R to restart..." widget — a label above a
   * thin progress bar, both invisible by default. ScrollFactor 0 + high
   * depth pin them to the camera so they ride over the world.
   */
  private buildRestartHoldWidget(): void {
    const cx = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 60;
    const barW = 180;
    const barH = 6;

    this.restartHoldLabel = this.add
      .text(cx, y - 14, 'Hold R to restart run', {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD)
      .setAlpha(0);

    this.restartHoldBg = this.add
      .rectangle(cx, y, barW, barH, 0x222222, 0.85)
      .setStrokeStyle(1, 0xffffff, 0.7)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD)
      .setAlpha(0);

    this.restartHoldFill = this.add
      .rectangle(cx - barW / 2 + 1, y, 0, barH - 2, 0xff6677, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(DepthLayers.HUD)
      .setAlpha(0);
  }

  private setRestartHoldWidgetVisible(visible: boolean): void {
    const a = visible ? 1 : 0;
    this.restartHoldLabel?.setAlpha(a);
    this.restartHoldBg?.setAlpha(a);
    this.restartHoldFill?.setAlpha(a);
    if (!visible && this.restartHoldFill) this.restartHoldFill.width = 0;
  }

  private updateRestartHoldFill(progress: number): void {
    if (!this.restartHoldFill) return;
    const fullW = 180 - 2;
    this.restartHoldFill.width = Math.max(0, Math.min(1, progress)) * fullW;
  }
}
