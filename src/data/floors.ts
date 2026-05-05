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
    enemyRoster: [
      { id: 'forest-sprite', weight: 4 },
      { id: 'mossy-slime', weight: 3 },
      { id: 'pixie-dancer', weight: 2 },
      { id: 'vine-sprout', weight: 2 },
    ] satisfies readonly EnemyRosterEntry[],
  },
} as const satisfies Record<string, FloorTheme>;

export type FloorId = keyof typeof FLOORS;

export const STARTING_FLOOR_ID: FloorId = 'emerald-forest';

export function getFloor(id: FloorId): FloorTheme {
  return FLOORS[id];
}
