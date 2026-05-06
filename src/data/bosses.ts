import { type RNG } from '../utils/RNG';

/**
 * One eligible boss for a given floor. Picked weighted in `pickBossForFloor`
 * so multiple bosses on the same floor can roll with different odds (none yet
 * — Vine Lord is alone on Emerald Forest until later chunks add siblings).
 */
export interface BossRosterEntry {
  /** Matches the EnemyDefinition id (`'boss-vine-lord'`, etc.). */
  id: string;
  /** Pool weight for `pickBossForFloor`. Strictly positive. */
  weight: number;
  /** Floor id this boss is eligible for (matches `FloorId` in `data/floors.ts`). */
  floor: string;
}

export const BOSSES: Record<string, BossRosterEntry> = {
  'boss-vine-lord': { id: 'boss-vine-lord', weight: 1, floor: 'emerald-forest' },
  'boss-mossy-behemoth': { id: 'boss-mossy-behemoth', weight: 1, floor: 'emerald-forest' },
  'boss-pixie-queen': { id: 'boss-pixie-queen', weight: 1, floor: 'emerald-forest' },
  'boss-forest-heart': { id: 'boss-forest-heart', weight: 1, floor: 'emerald-forest' },
  'boss-toad-sovereign': { id: 'boss-toad-sovereign', weight: 1, floor: 'sapphire-swamp' },
  'boss-bloomheart': { id: 'boss-bloomheart', weight: 1, floor: 'sapphire-swamp' },
  'boss-damselfly-empress': {
    id: 'boss-damselfly-empress',
    weight: 1,
    floor: 'sapphire-swamp',
  },
  'boss-bog-colossus': { id: 'boss-bog-colossus', weight: 1, floor: 'sapphire-swamp' },
  // Virtual id — represents the Vampire Twins fight (Crimson Lord + Sapphire
  // Marquis), dispatched in `constructBossById` to a `VampireFight` coordinator
  // that spawns and manages both bodies as one logical boss.
  'boss-vampire-twins': { id: 'boss-vampire-twins', weight: 1, floor: 'onyx-mansion' },
};

/**
 * Pick a boss id for `floorId`, deterministic given `rng`. Returns `null` if
 * no boss is registered for the floor (so callers can no-op gracefully on a
 * floor whose boss hasn't been authored yet).
 */
export function pickBossForFloor(floorId: string, rng: RNG): string | null {
  const eligible = Object.values(BOSSES).filter((b) => b.floor === floorId);
  if (eligible.length === 0) return null;
  const picked = rng.pickWeighted(eligible, (b) => b.weight);
  return picked?.id ?? null;
}
