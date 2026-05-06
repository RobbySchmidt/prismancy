import { type FloorTheme } from '../types';
import { type EnemyRosterEntry } from './enemies';

/**
 * Gemstone-themed floors. Confirmed progression: Emerald Forest → Sapphire
 * Swamp → Onyx Mansion (final boss). Sapphire Swamp and Onyx Mansion will be
 * added when their palettes are designed; Emerald Forest is the only fully
 * authored floor right now.
 *
 * `FloorId` is derived from this map's keys, so adding a new gemstone is a
 * config-only change — no code edits beyond this file.
 */
export const FLOORS = {
  'emerald-forest': {
    id: 'emerald-forest',
    displayName: 'Emerald Forest',
    palette: {
      // Magisch-leuchtend: dark mossy base + bright cyan-green glow accents.
      floorBase: 0x142818,
      floorAccent: 0x1f3a24,
      wallBase: 0x1a2818,
      wallHighlight: 0x2d4220,
      ambient: 0x080f0a,
      glow: 0x6effa0,
    },
    // Per-tile chances. Total ~22 % across types; with 82 candidate tiles
    // (interior minus 3×3 spawn zone) we expect ~18 decorations per room.
    decorationDensities: {
      mushroom: 0.06,
      rock: 0.08,
      tree: 0.08,
    },
    decorationStyle: 'forest',
    enemyRoster: [
      { id: 'forest-sprite', weight: 4 },
      { id: 'mossy-slime', weight: 3 },
      { id: 'pixie-dancer', weight: 2 },
      { id: 'vine-sprout', weight: 2 },
    ] satisfies readonly EnemyRosterEntry[],
  },
  'sapphire-swamp': {
    id: 'sapphire-swamp',
    displayName: 'Sapphire Swamp',
    palette: {
      // Murky deep teal water + sapphire-blue glow accents. Walls lean
      // navy-stone so the floor reads "swamp at night with magical lights".
      floorBase: 0x0e1d24,
      floorAccent: 0x183038,
      wallBase: 0x1a2230,
      wallHighlight: 0x2c3e58,
      ambient: 0x05090f,
      glow: 0x4ad8ff,
    },
    decorationDensities: {
      mushroom: 0.07,
      rock: 0.07,
      tree: 0.06,
    },
    decorationStyle: 'swamp',
    enemyRoster: [
      { id: 'bog-frog', weight: 4 },
      { id: 'snapper-bloom', weight: 2 },
      { id: 'damselfly', weight: 2 },
      { id: 'bog-tortoise', weight: 1 },
    ] satisfies readonly EnemyRosterEntry[],
  },
  'onyx-mansion': {
    id: 'onyx-mansion',
    displayName: 'Onyx Mansion',
    palette: {
      // Deep purple-black mansion with amethyst glow accents + gold trim.
      // Walls lean dark-purple-stone so the floor reads "haunted ballroom
      // by candlelight" rather than the wet-stone of the swamp.
      floorBase: 0x1a0e22,
      floorAccent: 0x2a1a3a,
      wallBase: 0x261438,
      wallHighlight: 0x4a2a44,
      ambient: 0x080418,
      glow: 0xc864ff,
    },
    decorationDensities: {
      mushroom: 0.07,
      rock: 0.07,
      tree: 0.06,
    },
    decorationStyle: 'mansion',
    // Roster left empty until the mansion mob set (Wraith / Possessed
    // Candelabra / Cursed Mirror) is implemented in the next session.
    // The Sapphire roster is reused for any visual-test runs that need
    // mob spawns before the real mansion enemies exist.
    enemyRoster: [
      { id: 'bog-frog', weight: 4 },
      { id: 'snapper-bloom', weight: 2 },
      { id: 'damselfly', weight: 2 },
      { id: 'bog-tortoise', weight: 1 },
    ] satisfies readonly EnemyRosterEntry[],
  },
} as const satisfies Record<string, FloorTheme>;

export type FloorId = keyof typeof FLOORS;

export const STARTING_FLOOR_ID: FloorId = 'emerald-forest';

export function getFloor(id: FloorId): FloorTheme {
  return FLOORS[id];
}
