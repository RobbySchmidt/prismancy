import Phaser from 'phaser';
import {
  ENEMY_PROJECTILE_DAMAGE,
  KNOCKBACK_FORCE_ENEMY,
  KNOCKBACK_FORCE_PLAYER,
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
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { type EnemyId } from '../data/enemies';
import { FLOORS, STARTING_FLOOR_ID, type FloorId } from '../data/floors';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { type BossEnemy } from '../entities/enemies/BossEnemy';
import { ForestHeart, type ForestHeartHost } from '../entities/enemies/ForestHeart';
import { MossyBehemoth, type MossyBehemothHost } from '../entities/enemies/MossyBehemoth';
import { PixieQueen, type PixieQueenHost } from '../entities/enemies/PixieQueen';
import { VineLord, type VineLordHost } from '../entities/enemies/VineLord';
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
import { EnemyProjectilePool } from '../entities/projectiles/EnemyProjectilePool';
import { MagicMissile } from '../entities/projectiles/MagicMissile';
import { MagicMissilePool } from '../entities/projectiles/MagicMissilePool';
import { Door } from '../dungeon/Door';
import { DungeonGenerator, type FloorLayout } from '../dungeon/DungeonGenerator';
import { Room } from '../dungeon/Room';
import { ShopRoomBuilder, type ShopRoomBuilderHost } from '../dungeon/ShopRoomBuilder';
import { CombatSystem } from '../systems/CombatSystem';
import { DropSystem } from '../systems/DropSystem';
import { InputManager } from '../systems/InputManager';
import { Inventory } from '../systems/Inventory';
import { ItemSystem } from '../systems/ItemSystem';
import { StatsSystem } from '../systems/StatsSystem';
import {
  ItemPool,
  PickupKind,
  RoomKind,
  type Direction,
  type ItemDefinition,
  type RoomDescriptor,
} from '../types';
import { pickItemFromPool, type ItemId } from '../data/items';
import { pickBossForFloor } from '../data/bosses';
import { EventBus } from '../utils/EventBus';
import { RNG } from '../utils/RNG';

export interface GameSceneInitData {
  floorId?: FloorId;
  /** Seed for the dungeon generator. Defaults to a fresh random seed. */
  dungeonSeed?: string;
  /**
   * 1-based depth into the run. Drives whether treasure / shop doors start
   * locked. Defaults to 1 (Floor 1 = Emerald Forest, no locked doors).
   */
  floorIndex?: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private missilePool!: MagicMissilePool;
  private enemyProjectilePool!: EnemyProjectilePool;
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
  private enemyBlockerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyProjectileBlockerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyWallCollider: Phaser.Physics.Arcade.Collider | null = null;

  private readonly playerDiedHandler = (): void => this.handlePlayerDied();
  private readonly enemyKilledHandler = (): void => this.checkRoomClearedSoon();
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
  /** The boss currently active in the room, or null if no boss fight is live. */
  private activeBoss: BossEnemy | null = null;

  private readonly playerTookDamageHandler = (): void => {
    if (!this.bossNoHitInProgress) return;
    const desc = this.layout?.rooms.get(this.currentRoomId);
    if (!desc || desc.kind !== RoomKind.Boss) return;
    this.bossNoHitInProgress = false;
    this.registry.set('bossNoHitInProgress', false);
  };

  private readonly bossKilledHandler = (payload: {
    x: number;
    y: number;
    name: string;
    noHit: boolean;
  }): void => this.handleBossKilled(payload);

  constructor() {
    super({ key: SceneKeys.Game });
  }

  init(data: GameSceneInitData): void {
    this.currentFloorId = data.floorId ?? STARTING_FLOOR_ID;
    this.dungeonSeed =
      data.dungeonSeed ?? `prismancy-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    this.floorIndex = data.floorIndex ?? 1;
    this.registry.set('currentFloorId', this.currentFloorId);
    this.registry.set('dungeonSeed', this.dungeonSeed);
    this.registry.set('floorIndex', this.floorIndex);
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
    this.enemyProjectilePool = new EnemyProjectilePool(this);
    this.inputManager = new InputManager(this);
    this.player = new Player(this, 0, 0, this.inputManager, this.missilePool, this.stats);

    this.itemSystem = new ItemSystem(this.stats, this.player.health);
    // Expose to other scenes (HUD reads coin/key counters from here once
    // the inventory HUD lands).
    this.registry.set('stats', this.stats);
    this.registry.set('inventory', this.inventory);
    this.registry.set('itemSystem', this.itemSystem);

    // Pickups live for the full run (one group, cleared on room teardown so
    // un-collected pickups don't leak into the next room).
    this.pickups = this.physics.add.group();

    this.physics.world.setBounds(0, 0, ROOM_WIDTH_TILES * TILE_SIZE, ROOM_HEIGHT_TILES * TILE_SIZE);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH_TILES * TILE_SIZE, ROOM_HEIGHT_TILES * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.enterRoom(this.layout.startId, null);

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
    EventBus.on('map:opened', this.mapOpenedHandler);
    EventBus.on('map:closed', this.mapClosedHandler);
    EventBus.on('map:teleport', this.mapTeleportHandler);
    EventBus.on('player:tookDamage', this.playerTookDamageHandler);
    EventBus.on('boss:killed', this.bossKilledHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dropSystem.detach();
      EventBus.off('player:died', this.playerDiedHandler);
      EventBus.off('enemy:killed', this.enemyKilledHandler);
      EventBus.off('map:opened', this.mapOpenedHandler);
      EventBus.off('map:closed', this.mapClosedHandler);
      EventBus.off('map:teleport', this.mapTeleportHandler);
      EventBus.off('player:tookDamage', this.playerTookDamageHandler);
      EventBus.off('boss:killed', this.bossKilledHandler);
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
      };
    }
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
    this.spawnTreasureItemAt(center.x, center.y);
  }

  /**
   * Spawn a treasure-pool item pedestal at world-space `(x, y)`. Factored
   * out of `spawnTreasureItem()` so gold crates can drop a pedestal at the
   * crate's location instead of the room center. Same deterministic seed
   * scheme as the room-center spawn. Returns the spawned ItemPickup so
   * callers (e.g. gold crate) can apply spawn-protection.
   */
  spawnTreasureItemAt(x: number, y: number): ItemPickup | null {
    if (!this.currentRoom) return null;
    const pickedIds = this.itemSystem.getPickedIds();
    const seedSuffix = Array.from(pickedIds).sort().join(',');
    const rng = new RNG(
      `${this.dungeonSeed}-treasure-${this.currentRoomId}-${Math.floor(x)}-${Math.floor(y)}-${seedSuffix}`,
    );
    // ItemSystem.picked is a Set<string> — the picker accepts a stricter
    // ReadonlySet<ItemId>, but `has` only consumes ids it knows about, so
    // narrowing the element type here is safe.
    const exclude = pickedIds as ReadonlySet<ItemId>;
    const itemDef = pickItemFromPool(ItemPool.Treasure, rng, exclude);
    if (!itemDef) return null;
    const pickup = new ItemPickup(this, x, y, itemDef, this.itemSystem);
    this.pickups.add(pickup);
    return pickup;
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
        const result = ShopRoomBuilder.build(this.shopHost(), desc, this.dungeonSeed, center);
        if (result.allBought) desc.looted = true;
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

    // If we were in a boss fight, the boss was just destroyed along with the
    // enemies group — drop the references + clear the no-hit flag so the next
    // boss spawn (e.g. on a re-entry) starts from a clean slate.
    this.activeBoss = null;
    this.bossNoHitInProgress = false;
    this.registry.set('bossNoHitInProgress', false);

    // Snapshot uncollected pickups into the room descriptor so they reappear
    // when the player comes back. The group itself persists across rooms — we
    // only destroy the live children here.
    const leavingDesc = this.layout.rooms.get(this.currentRoomId);
    if (leavingDesc) {
      const snapshots = [];
      for (const child of this.pickups.getChildren()) {
        // Item pedestals are tracked via `desc.looted`, not via
        // `pendingPickups`, so skip them here. Shop slots are tracked via
        // `desc.purchasedShopSlots` — the shop builder rebuilds the room on
        // re-entry, so snapshotting them would double up. Gems carry a
        // floorId we don't store in the snapshot — since a gem only ever
        // exists in the current floor's boss room and the room is cleared
        // by the time the gem appears, we keep gems in-scene only.
        if (
          child instanceof BasePickup &&
          child.kind !== PickupKind.Item &&
          child.kind !== PickupKind.Gem &&
          child.shopSlotIndex === undefined
        ) {
          snapshots.push({ kind: child.kind, x: child.x, y: child.y });
        }
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

    const roster = FLOORS[this.currentFloorId].enemyRoster;
    const ctx = {
      scene: this,
      target: this.player,
      enemyProjectilePool: this.enemyProjectilePool,
    };

    for (let i = 0; i < desc.enemySpawnCount; i++) {
      const pick = rng.pickWeighted(roster);
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
      const enemy = createEnemy(pick.id as EnemyId, ctx, x, y);
      this.enemies.add(enemy);
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
    };
    const enemy = createEnemy(id, ctx, x, y);
    this.enemies.add(enemy);
    return enemy;
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

    const boss = this.constructBossById(bossId, center.x, center.y);
    if (!boss) return;
    this.enemies.add(boss);
    this.activeBoss = boss;
    this.bossNoHitInProgress = true;
    this.registry.set('bossNoHitInProgress', true);
    EventBus.emit('boss:spawned', { name: boss.displayName, maxHp: boss.maxHp });
  }

  /**
   * Shared host adapter for every boss. All four current bosses need a
   * superset of the same dependencies (`enemyProjectilePool`, `spawnEnemyAt`,
   * `getPlayer`, `getRoomBounds`, `getTreePositions`). Building a single host
   * keeps `constructBossById` flat — each `case` just hands the boss its
   * host-typed view of this object.
   */
  private bossHost(): VineLordHost & MossyBehemothHost & PixieQueenHost & ForestHeartHost {
    return {
      enemyProjectilePool: this.enemyProjectilePool,
      spawnEnemyAt: (id, sx, sy) => this.spawnEnemyAt(id, sx, sy),
      getPlayer: () => this.player,
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
  private handleBossKilled(payload: { x: number; y: number; name: string; noHit: boolean }): void {
    this.markCurrentRoomCleared();

    const center = this.currentRoom?.getCenter();
    if (center) {
      // Reward pedestal: boss-pool item.
      this.spawnBossPoolItem(center.x, center.y);
      // Two hearts flanking the pedestal.
      const heartOffset = TILE_SIZE * 1.5;
      const leftHeart = this.spawnPickup(PickupKind.Heart, center.x - heartOffset, center.y);
      leftHeart?.setSpawnProtection(700);
      const rightHeart = this.spawnPickup(PickupKind.Heart, center.x + heartOffset, center.y);
      rightHeart?.setSpawnProtection(700);

      // No-hit gem — only awarded if the no-hit flag survived the fight AND
      // the player hasn't already earned this floor's gem.
      if (this.bossNoHitInProgress && !this.inventory.hasGem(this.currentFloorId)) {
        const gem = new GemPickup(this, center.x, center.y - heartOffset, this.currentFloorId);
        gem.setSpawnProtection(700);
        this.pickups.add(gem);
      }
    }

    this.activeBoss = null;
    this.bossNoHitInProgress = false;
    this.registry.set('bossNoHitInProgress', false);
    void payload; // payload.noHit is also available; we trust our own flag
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
    const exclude = pickedIds as ReadonlySet<ItemId>;
    const itemDef = pickItemFromPool(ItemPool.Boss, rng, exclude);
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

    this.playerWallCollider = this.physics.add.collider(this.player, this.currentRoom.walls);
    this.enemyWallCollider = this.physics.add.collider(this.enemies, this.currentRoom.walls);
    this.missileWallCollider = this.physics.add.collider(
      this.missilePool.getGroup(),
      this.currentRoom.walls,
      deactivateMissile,
    );

    // Enemy projectiles share the same wall kill behaviour.
    this.enemyProjectileWallCollider = this.physics.add.collider(
      this.enemyProjectilePool.getGroup(),
      this.currentRoom.walls,
      deactivateMissile,
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
        ),
      );
    }

    // Missile ↔ enemy: use instanceof to be safe against arg-order swaps.
    this.missileEnemyOverlap = this.physics.add.overlap(
      this.missilePool.getGroup(),
      this.enemies,
      (a, b) => {
        try {
          const missile = (a instanceof MagicMissile ? a : b) as MagicMissile;
          const enemy = (a instanceof BaseEnemy ? a : b) as BaseEnemy;
          if (!missile.active || !enemy.active) return;
          const mx = missile.x;
          const my = missile.y;
          missile.deactivate();
          const knockback = CombatSystem.knockbackVector(
            { x: mx, y: my },
            { x: enemy.x, y: enemy.y },
            KNOCKBACK_FORCE_ENEMY,
          );
          enemy.takeDamage(missile.damage, knockback);
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
            // Key spent — fall through to the normal pay/onCollect path.
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
          // them (we don't snapshot Items into pendingPickups).
          if (pickup.kind === PickupKind.Item) {
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
        ),
      );
    }
  }

  private handlePlayerDied(): void {
    this.time.delayedCall(400, () => {
      this.scene.launch(SceneKeys.GameOver);
      this.scene.pause();
    });
  }
}
