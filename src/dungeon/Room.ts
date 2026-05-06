import Phaser from 'phaser';
import {
  DOOR_TILE,
  FLOOR_TILE_VARIANTS,
  ROOM_HEIGHT_TILES,
  ROOM_WIDTH_TILES,
  SPAWN_SAFE_RADIUS_TILES,
  TILE_SIZE,
  WORLD_SPRITE_SCALE,
  floorTileKey,
  mushroomDecoKey,
  rockDecoKey,
  treeDecoKey,
  wallTileKey,
} from '../config/GameConfig';
import { DepthLayers } from '../config/DepthLayers';
import { RoomKind, type Direction, type FloorTheme, type RoomDescriptor } from '../types';
import { RNG } from '../utils/RNG';
import { Door } from './Door';
import { RoomAtmosphere } from './RoomAtmosphere';

/**
 * Single rectangular room rendered into the active scene. Driven by a
 * `RoomDescriptor` (door config, decoration seed, etc.) and a `FloorTheme`
 * (palette, texture keys). Every GameObject the room creates is tracked so
 * `destroy()` can tear the whole room down on a transition.
 */
export class Room {
  readonly walls: Phaser.Physics.Arcade.StaticGroup;
  /**
   * Rocks and trees are purely visual decoration (no physics body) — player
   * and enemies walk through them freely. Tree positions are tracked so the
   * Pixie Queen can teleport between them.
   */
  readonly treePositions: { x: number; y: number }[] = [];
  /**
   * Invisible barriers at each door position, always present whether the
   * door is open or closed. Used to keep enemies + enemy projectiles inside
   * the room — the player + their missiles pass through these, so when the
   * door is open the player can still exit normally.
   */
  readonly enemyBlockers: Phaser.Physics.Arcade.StaticGroup;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly theme: FloorTheme;
  readonly descriptor: RoomDescriptor;
  readonly doors: Door[] = [];

  private readonly scene: Phaser.Scene;
  private readonly decorations: Phaser.GameObjects.GameObject[] = [];
  private readonly floorTiles: Phaser.GameObjects.GameObject[] = [];
  private readonly atmosphere: RoomAtmosphere;

  constructor(scene: Phaser.Scene, theme: FloorTheme, descriptor: RoomDescriptor) {
    this.scene = scene;
    this.theme = theme;
    this.descriptor = descriptor;
    this.widthPx = ROOM_WIDTH_TILES * TILE_SIZE;
    this.heightPx = ROOM_HEIGHT_TILES * TILE_SIZE;
    this.walls = scene.physics.add.staticGroup();
    this.enemyBlockers = scene.physics.add.staticGroup();

    const rng = new RNG(descriptor.decorationSeed);
    this.buildFloor(rng);
    this.buildWallsWithDoorGaps();
    this.buildDoors(descriptor.cleared);
    // Painterly overlay (radial vignette + patches + light shafts + mist +
    // fireflies + edge vignette). Per-floor palette-driven, applies to all
    // room kinds so treasure / shop / boss rooms also get the atmospheric
    // wash — they just don't get scattered decorations.
    this.atmosphere = new RoomAtmosphere(scene, theme, descriptor);
    // Treasure / Shop / Boss rooms stay clean so the pedestals, slots, or
    // boss have visual + physical priority — no rocks blocking shop slots.
    if (
      descriptor.kind !== RoomKind.Treasure &&
      descriptor.kind !== RoomKind.Shop &&
      descriptor.kind !== RoomKind.Boss
    ) {
      this.scatterDecorations(rng);
    }
  }

  private buildFloor(rng: RNG): void {
    for (let ty = 1; ty < ROOM_HEIGHT_TILES - 1; ty++) {
      for (let tx = 1; tx < ROOM_WIDTH_TILES - 1; tx++) {
        const variant = rng.intBetween(0, FLOOR_TILE_VARIANTS - 1);
        const tile = this.scene.add
          .image(
            tx * TILE_SIZE + TILE_SIZE / 2,
            ty * TILE_SIZE + TILE_SIZE / 2,
            floorTileKey(this.theme.id, variant),
          )
          .setDepth(DepthLayers.Floor);
        this.floorTiles.push(tile);
      }
    }
  }

  private buildWallsWithDoorGaps(): void {
    for (let tx = 0; tx < ROOM_WIDTH_TILES; tx++) {
      if (!this.isDoorTile(tx, 0)) this.placeWall(tx, 0);
      if (!this.isDoorTile(tx, ROOM_HEIGHT_TILES - 1))
        this.placeWall(tx, ROOM_HEIGHT_TILES - 1);
    }
    for (let ty = 1; ty < ROOM_HEIGHT_TILES - 1; ty++) {
      if (!this.isDoorTile(0, ty)) this.placeWall(0, ty);
      if (!this.isDoorTile(ROOM_WIDTH_TILES - 1, ty))
        this.placeWall(ROOM_WIDTH_TILES - 1, ty);
    }
  }

  private isDoorTile(tx: number, ty: number): boolean {
    for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
      if (!this.descriptor.doors[dir].exists) continue;
      const t = DOOR_TILE[Room.directionToCardinal(dir)];
      if (t.tx === tx && t.ty === ty) return true;
    }
    return false;
  }

  private placeWall(tx: number, ty: number): void {
    const wall = this.scene.add
      .image(
        tx * TILE_SIZE + TILE_SIZE / 2,
        ty * TILE_SIZE + TILE_SIZE / 2,
        wallTileKey(this.theme.id),
      )
      .setDepth(DepthLayers.Wall);
    this.scene.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  private buildDoors(initiallyOpen: boolean): void {
    for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
      const info = this.descriptor.doors[dir];
      if (!info.exists) continue;
      const t = DOOR_TILE[Room.directionToCardinal(dir)];
      const pos = {
        x: t.tx * TILE_SIZE + TILE_SIZE / 2,
        y: t.ty * TILE_SIZE + TILE_SIZE / 2,
      };
      const door = new Door(
        this.scene,
        this.theme.id,
        dir,
        info.kind,
        pos,
        initiallyOpen,
        info.locked ?? false,
      );
      this.doors.push(door);

      // Invisible enemy-only blocker at the same position. Player + their
      // missiles never collide with this group, so they can still pass
      // through the door once it's open.
      const blocker = this.scene.add
        .image(pos.x, pos.y, wallTileKey(this.theme.id))
        .setVisible(false);
      this.scene.physics.add.existing(blocker, true);
      this.enemyBlockers.add(blocker);
    }
  }

  /** Open all doors. Called when the room is cleared. */
  openAllDoors(): void {
    for (const door of this.doors) door.open();
  }

  /** Close all doors. Called when the player enters an uncleared room. */
  closeAllDoors(): void {
    for (const door of this.doors) door.close();
  }

  private scatterDecorations(rng: RNG): void {
    const cxTile = Math.floor(ROOM_WIDTH_TILES / 2);
    const cyTile = Math.floor(ROOM_HEIGHT_TILES / 2);
    const d = this.theme.decorationDensities;

    for (let ty = 1; ty < ROOM_HEIGHT_TILES - 1; ty++) {
      for (let tx = 1; tx < ROOM_WIDTH_TILES - 1; tx++) {
        if (
          Math.abs(tx - cxTile) <= SPAWN_SAFE_RADIUS_TILES &&
          Math.abs(ty - cyTile) <= SPAWN_SAFE_RADIUS_TILES
        ) {
          continue;
        }
        // Don't decorate tiles directly in front of doors so the corridor
        // stays passable.
        if (this.isInFrontOfDoor(tx, ty)) continue;

        const roll = rng.next();
        let cum = d.rock;
        if (roll < cum) {
          this.placeRock(tx, ty);
          continue;
        }
        cum += d.tree;
        if (roll < cum) {
          this.placeTree(tx, ty, rng);
          continue;
        }
        cum += d.mushroom;
        if (roll < cum) {
          this.placeMushroom(tx, ty, rng);
        }
      }
    }
  }

  /** True for the single tile just inside each existing door. */
  private isInFrontOfDoor(tx: number, ty: number): boolean {
    const d = this.descriptor.doors;
    if (d.up.exists && tx === DOOR_TILE.N.tx && ty === 1) return true;
    if (d.down.exists && tx === DOOR_TILE.S.tx && ty === ROOM_HEIGHT_TILES - 2) return true;
    if (d.left.exists && ty === DOOR_TILE.W.ty && tx === 1) return true;
    if (d.right.exists && ty === DOOR_TILE.E.ty && tx === ROOM_WIDTH_TILES - 2) return true;
    return false;
  }

  private placeRock(tx: number, ty: number): void {
    const cx = tx * TILE_SIZE + TILE_SIZE / 2;
    const cy = ty * TILE_SIZE + TILE_SIZE / 2;
    this.atmosphere.paintDecorationHalo(this.scene, cx, cy, this.theme, 'medium');
    const rock = this.scene.add
      .image(cx, cy, rockDecoKey(this.theme.id))
      .setDepth(DepthLayers.FloorDecoration)
      .setScale(WORLD_SPRITE_SCALE);
    this.decorations.push(rock);
  }

  private placeTree(tx: number, ty: number, rng: RNG): void {
    const cx = tx * TILE_SIZE + TILE_SIZE / 2 + rng.intBetween(-6, 6);
    const cy = ty * TILE_SIZE + TILE_SIZE / 2 + rng.intBetween(-4, 4);
    this.atmosphere.paintDecorationHalo(this.scene, cx, cy, this.theme, 'medium');
    const tree = this.scene.add
      .image(cx, cy, treeDecoKey(this.theme.id))
      .setDepth(DepthLayers.FloorDecoration)
      .setScale(WORLD_SPRITE_SCALE);
    this.decorations.push(tree);
    this.treePositions.push({ x: cx, y: cy });
  }

  private placeMushroom(tx: number, ty: number, rng: RNG): void {
    const cx = tx * TILE_SIZE + TILE_SIZE / 2 + rng.intBetween(-12, 12);
    const cy = ty * TILE_SIZE + TILE_SIZE / 2 + rng.intBetween(-12, 12);
    this.atmosphere.paintDecorationHalo(this.scene, cx, cy, this.theme, 'small');
    const mushroom = this.scene.add
      .image(cx, cy, mushroomDecoKey(this.theme.id))
      .setDepth(DepthLayers.FloorDecoration)
      .setScale(WORLD_SPRITE_SCALE)
      .setAlpha(0.85);
    this.scene.tweens.add({
      targets: mushroom,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 0.95 * WORLD_SPRITE_SCALE, to: 1.08 * WORLD_SPRITE_SCALE },
      duration: 1200 + rng.intBetween(0, 800),
      delay: rng.intBetween(0, 600),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.decorations.push(mushroom);
  }

  /** Center of the playable area (used for player spawn). */
  getCenter(): { x: number; y: number } {
    return { x: this.widthPx / 2, y: this.heightPx / 2 };
  }

  /**
   * Returns the player's spawn position when entering this room from
   * `entryDirection` (the direction the player WAS moving / the door they
   * came from on the source side). The player should appear just inside
   * the OPPOSITE wall.
   */
  getEntryPosition(entryDirection: Direction): { x: number; y: number } {
    const offset = TILE_SIZE * (1 + 0.5);
    switch (entryDirection) {
      case 'up':
        // Came from north → enter through this room's S door → land near south wall.
        return {
          x: DOOR_TILE.S.tx * TILE_SIZE + TILE_SIZE / 2,
          y: this.heightPx - offset,
        };
      case 'down':
        return {
          x: DOOR_TILE.N.tx * TILE_SIZE + TILE_SIZE / 2,
          y: offset,
        };
      case 'left':
        return {
          x: this.widthPx - offset,
          y: DOOR_TILE.E.ty * TILE_SIZE + TILE_SIZE / 2,
        };
      case 'right':
        return {
          x: offset,
          y: DOOR_TILE.W.ty * TILE_SIZE + TILE_SIZE / 2,
        };
    }
  }

  /** Tear down every GameObject this room created. */
  destroy(): void {
    for (const door of this.doors) door.destroy();
    this.doors.length = 0;
    for (const deco of this.decorations) deco.destroy();
    this.decorations.length = 0;
    for (const tile of this.floorTiles) tile.destroy();
    this.floorTiles.length = 0;
    this.atmosphere.destroy();
    this.walls.clear(true, true);
    this.walls.destroy();
    this.treePositions.length = 0;
    this.enemyBlockers.clear(true, true);
    this.enemyBlockers.destroy();
  }

  private static directionToCardinal(dir: Direction): 'N' | 'S' | 'W' | 'E' {
    switch (dir) {
      case 'up':
        return 'N';
      case 'down':
        return 'S';
      case 'left':
        return 'W';
      case 'right':
        return 'E';
    }
  }
}
