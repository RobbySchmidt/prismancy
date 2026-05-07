/**
 * Meta-progression persistence. Single-slot, versioned JSON blob in
 * localStorage tracking trophy/collection state across runs:
 *   - Bosses defeated at least once (enemy-id keyed for rename-safety)
 *   - Items discovered at least once (item-id keyed)
 *   - Run counters (started / died / won full / won incomplete)
 *   - Best full-victory run time in milliseconds
 *   - Selected wizard skin preference (null = no explicit pick yet)
 *
 * Designed for passive trophy display, NOT gameplay gating — every item
 * and floor is available from the first run. The Stats overlay in the
 * main menu reads this for the "X / N bosses defeated" / "fastest run
 * HH:MM:SS" summary.
 *
 * Storage is wrapped in try/catch the same way `Cosmetics.ts` was so a
 * private-browsing or storage-disabled environment degrades to "fresh
 * progress" rather than throwing on every access.
 */

const STORAGE_KEY = 'prismancy.save.v1';
const SCHEMA_VERSION = 1 as const;

// Legacy keys from the pre-MetaProgress Cosmetics-only era. Read once on
// first load to migrate forward, then ignored. Kept readable so an old
// install still surfaces its Lord-Onyx unlock + selected skin.
const LEGACY_KEY_LORD_ONYX = 'prismancy.unlocks.lordOnyxBeaten';
const LEGACY_KEY_SELECTED_SKIN = 'prismancy.cosmetics.selectedSkin';

export type SkinId = 'default' | 'prismancy';

export interface MetaSave {
  version: typeof SCHEMA_VERSION;
  /** Stable enemy ids of bosses defeated at least once. */
  bossesDefeated: string[];
  /** Item ids picked up at least once. */
  itemsDiscovered: string[];
  runs: {
    started: number;
    died: number;
    /** Beat the Prismarch (gem-seal path). */
    wonFull: number;
    /** Took the no-gems exit on Onyx (still a completion, separate counter). */
    wonIncomplete: number;
  };
  /** Shortest full-victory duration in ms, or null if none yet. */
  bestRunMs: number | null;
  /** Player's wizard-skin preference. `null` means "no explicit pick yet"
   * — the auto-apply rule in `getSelectedSkin` then chooses based on
   * unlock state (preserves the trophy-reveal moment on first win). The
   * `prismancy` skin is gated on a Prismarch defeat; if it's selected
   * but not earned, queries fall back to `default` (defense-in-depth
   * against manual save edits). */
  selectedSkin: SkinId | null;
}

function emptySave(): MetaSave {
  return {
    version: SCHEMA_VERSION,
    bossesDefeated: [],
    itemsDiscovered: [],
    runs: { started: 0, died: 0, wonFull: 0, wonIncomplete: 0 },
    bestRunMs: null,
    selectedSkin: null,
  };
}

function safeRead(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — silently no-op.
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Storage unavailable — silently no-op.
  }
}

/**
 * Pull whatever the pre-MetaProgress Cosmetics module wrote into the new
 * MetaSave shape. Called from `load()` when no v1 blob is present. The old
 * keys are NOT removed — leaving them lets a downgrade-then-upgrade still
 * find the original unlock. The new save is the source of truth from now
 * on; subsequent loads only see the v1 blob.
 */
function migrateFromLegacy(): MetaSave {
  const save = emptySave();
  if (safeRead(LEGACY_KEY_LORD_ONYX) === 'true') {
    save.bossesDefeated.push('boss-lord-onyx');
  }
  const legacySkin = safeRead(LEGACY_KEY_SELECTED_SKIN);
  if (legacySkin === 'prismancy' || legacySkin === 'default') {
    save.selectedSkin = legacySkin;
  }
  return save;
}

/**
 * Validate that an arbitrary JSON-parsed value matches our `MetaSave`
 * schema. Returns `null` when shape mismatches so the caller can fall back
 * to a fresh save instead of crashing. We're forgiving on extra unknown
 * fields — only the shape we depend on matters.
 */
function parseSave(raw: unknown): MetaSave | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== SCHEMA_VERSION) return null;
  if (!Array.isArray(r.bossesDefeated)) return null;
  if (!Array.isArray(r.itemsDiscovered)) return null;
  if (typeof r.runs !== 'object' || r.runs === null) return null;
  const runs = r.runs as Record<string, unknown>;
  if (typeof runs.started !== 'number') return null;
  if (typeof runs.died !== 'number') return null;
  if (typeof runs.wonFull !== 'number') return null;
  if (typeof runs.wonIncomplete !== 'number') return null;
  if (r.bestRunMs !== null && typeof r.bestRunMs !== 'number') return null;
  if (
    r.selectedSkin !== null &&
    r.selectedSkin !== 'default' &&
    r.selectedSkin !== 'prismancy'
  ) {
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    bossesDefeated: r.bossesDefeated.filter((x): x is string => typeof x === 'string'),
    itemsDiscovered: r.itemsDiscovered.filter((x): x is string => typeof x === 'string'),
    runs: {
      started: runs.started,
      died: runs.died,
      wonFull: runs.wonFull,
      wonIncomplete: runs.wonIncomplete,
    },
    bestRunMs: r.bestRunMs as number | null,
    selectedSkin: r.selectedSkin as SkinId | null,
  };
}

let cached: MetaSave | null = null;

/** Read the current save from storage (or migrate / fresh-create). The
 * result is cached across calls within a session — re-reads only happen
 * after `forceReload()` (used by tests). */
function load(): MetaSave {
  if (cached) return cached;
  const raw = safeRead(STORAGE_KEY);
  if (raw === null) {
    cached = migrateFromLegacy();
    persist();
    return cached;
  }
  try {
    const parsed = parseSave(JSON.parse(raw));
    if (parsed) {
      cached = parsed;
      return cached;
    }
  } catch {
    // Corrupt blob — fall through to fresh save below.
  }
  cached = emptySave();
  persist();
  return cached;
}

function persist(): void {
  if (!cached) return;
  safeWrite(STORAGE_KEY, JSON.stringify(cached));
}

export const MetaProgress = {
  /** Snapshot the current state. Returned object is a shallow read-only
   * view; mutate via the `recordX` helpers, never directly. */
  get(): MetaSave {
    return load();
  },

  /** Force a re-read from storage. Tests use this to reset between cases
   * without having to reload the module. */
  forceReload(): void {
    cached = null;
  },

  // --- Discovery / kill log ------------------------------------------------

  recordBossDefeated(enemyId: string): void {
    const s = load();
    if (s.bossesDefeated.includes(enemyId)) return;
    s.bossesDefeated.push(enemyId);
    persist();
  },

  hasBeatenBoss(enemyId: string): boolean {
    return load().bossesDefeated.includes(enemyId);
  },

  recordItemDiscovered(itemId: string): void {
    const s = load();
    if (s.itemsDiscovered.includes(itemId)) return;
    s.itemsDiscovered.push(itemId);
    persist();
  },

  hasDiscoveredItem(itemId: string): boolean {
    return load().itemsDiscovered.includes(itemId);
  },

  // --- Run lifecycle counters ----------------------------------------------

  recordRunStarted(): void {
    const s = load();
    s.runs.started++;
    persist();
  },

  recordRunDied(): void {
    const s = load();
    s.runs.died++;
    persist();
  },

  /** Record a Prismarch victory + update `bestRunMs` if `durationMs` beats
   * the current best (or there's no best yet). A `durationMs` of zero or
   * less is treated as "no measurement" (e.g. a dev-hook skipped the
   * fresh-run-init timestamp); the win counter still increments but the
   * best-time stays at whatever real run produced it. */
  recordRunWonFull(durationMs: number): void {
    const s = load();
    s.runs.wonFull++;
    if (durationMs > 0 && (s.bestRunMs === null || durationMs < s.bestRunMs)) {
      s.bestRunMs = durationMs;
    }
    persist();
  },

  /** Record a no-gems-exit completion (took the easy way out on Onyx). */
  recordRunWonIncomplete(): void {
    const s = load();
    s.runs.wonIncomplete++;
    persist();
  },

  // --- Cosmetic / skin -----------------------------------------------------

  /** True iff the player has ever defeated the Prismarch (Lord Onyx) — the
   * Prismancy red/gold skin unlock flag, computed from `bossesDefeated`
   * for rename-safety. The internal enemy id stays `boss-lord-onyx`
   * (the file/class are still pending a rename pass per CLAUDE.md). */
  hasPrismancySkin(): boolean {
    return load().bossesDefeated.includes('boss-lord-onyx');
  },

  /** The skin the player has chosen for the wizard. Mirrors the prior
   * Cosmetics.ts behaviour: explicit choice sticks (`'default'` or
   * `'prismancy'`); `null` means no explicit pick yet, in which case the
   * unlock state decides — fresh Prismarch unlock auto-applies (trophy-
   * reveal moment), everyone else gets the default purple wizard. If
   * `'prismancy'` is stored but not earned (legitimate post-reset state,
   * or manual storage edit), fall back to default. */
  getSelectedSkin(): SkinId {
    const s = load();
    const unlocked = s.bossesDefeated.includes('boss-lord-onyx');
    if (s.selectedSkin === 'prismancy') return unlocked ? 'prismancy' : 'default';
    if (s.selectedSkin === 'default') return 'default';
    return unlocked ? 'prismancy' : 'default';
  },

  /** Persist the player's skin choice. The main-menu toggle calls this. */
  setSelectedSkin(skin: SkinId): void {
    const s = load();
    s.selectedSkin = skin;
    persist();
  },

  // --- Reset ---------------------------------------------------------------

  /** Wipe the whole save. Dev / testing helper. Also clears legacy keys so
   * a re-install doesn't surface old unlocks. */
  resetAll(): void {
    cached = emptySave();
    persist();
    safeRemove(LEGACY_KEY_LORD_ONYX);
    safeRemove(LEGACY_KEY_SELECTED_SKIN);
  },

  /** Aliased recorder so the old `Cosmetics.unlockPrismancySkin` callsite
   * (Lord-Onyx death handler in GameScene) keeps working. Equivalent to
   * `recordBossDefeated('boss-lord-onyx')`. */
  unlockPrismancySkin(): void {
    this.recordBossDefeated('boss-lord-onyx');
  },
};
