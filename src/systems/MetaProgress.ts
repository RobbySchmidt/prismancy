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
/** Playable characters. `wizard` is the original twin-stick magic-missile
 *  caster. `spellblade` is the melee Tattered-Knight unlocked after the
 *  first Prismarch defeat (lore: fallen knight of the Prismarch turning on
 *  his old master). `wizard` is always available; `spellblade` gates on
 *  `bossesDefeated.includes('boss-lord-onyx')`. */
export type CharacterId = 'wizard' | 'spellblade';

export interface MetaSave {
  version: typeof SCHEMA_VERSION;
  /** Stable enemy ids of bosses defeated at least once. */
  bossesDefeated: string[];
  /** Subset of `bossesDefeated` recorded specifically while playing as the
   *  Spellblade. Drives the Spellblade Prismarch-tier skin gate (kill the
   *  Prismarch *as Spellblade* unlocks the red-helm variant; killing him
   *  as Wizard only unlocks the character + the Wizard Prismancy skin).
   *  Added 2026-05-09. Backwards-compat: missing field on older v1 saves
   *  defaults to `[]` in `parseSave`. */
  bossesDefeatedAsSpellblade: string[];
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
  /** Player's skin preference (shared across characters — last explicit
   * pick wins). `null` means "no explicit pick yet" — the auto-apply rule
   * in `getSelectedSkin` then chooses based on unlock state (preserves
   * the trophy-reveal moment on first win). The `prismancy` skin is gated
   * per-character: Wizard Prismancy on any Prismarch defeat, Spellblade
   * Prismancy on a Prismarch defeat *as Spellblade*. If `prismancy` is
   * selected but the active character's gate isn't met, queries fall back
   * to `default` (defense-in-depth against manual save edits). */
  selectedSkin: SkinId | null;
  /** Player's character preference. `null` = no explicit pick (defaults to
   * `wizard`). `spellblade` is gated on a Prismarch defeat; if selected
   * but not earned, `getSelectedCharacter` falls back to `wizard` (same
   * defense-in-depth as the skin field). Added 2026-05-09. */
  selectedCharacter: CharacterId | null;
}

function emptySave(): MetaSave {
  return {
    version: SCHEMA_VERSION,
    bossesDefeated: [],
    bossesDefeatedAsSpellblade: [],
    itemsDiscovered: [],
    runs: { started: 0, died: 0, wonFull: 0, wonIncomplete: 0 },
    bestRunMs: null,
    selectedSkin: null,
    selectedCharacter: null,
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
  // selectedCharacter was added 2026-05-09 — older saves (still v1, the
  // schema-version stays the same since the field is forward-compatible
  // via fallback to null) won't have it. Accept missing/null/known values.
  let selectedCharacter: CharacterId | null = null;
  if (r.selectedCharacter === 'wizard' || r.selectedCharacter === 'spellblade') {
    selectedCharacter = r.selectedCharacter;
  } else if (r.selectedCharacter !== undefined && r.selectedCharacter !== null) {
    return null;
  }
  // bossesDefeatedAsSpellblade was added 2026-05-09 — older v1 saves
  // default to []. Wrong-typed (non-array) field invalidates the blob.
  let bossesDefeatedAsSpellblade: string[] = [];
  if (Array.isArray(r.bossesDefeatedAsSpellblade)) {
    bossesDefeatedAsSpellblade = r.bossesDefeatedAsSpellblade.filter(
      (x): x is string => typeof x === 'string',
    );
  } else if (r.bossesDefeatedAsSpellblade !== undefined) {
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    bossesDefeated: r.bossesDefeated.filter((x): x is string => typeof x === 'string'),
    bossesDefeatedAsSpellblade,
    itemsDiscovered: r.itemsDiscovered.filter((x): x is string => typeof x === 'string'),
    runs: {
      started: runs.started,
      died: runs.died,
      wonFull: runs.wonFull,
      wonIncomplete: runs.wonIncomplete,
    },
    bestRunMs: r.bestRunMs as number | null,
    selectedSkin: r.selectedSkin as SkinId | null,
    selectedCharacter,
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

  /** Record a boss defeat. If `character` is supplied and is `'spellblade'`,
   *  the kill is *also* recorded against the per-character ledger that
   *  drives the Spellblade Prismarch-tier skin gate. Idempotent on both
   *  ledgers — repeat kills no-op. Wizard kills only touch the shared
   *  ledger. */
  recordBossDefeated(enemyId: string, character?: CharacterId): void {
    const s = load();
    let dirty = false;
    if (!s.bossesDefeated.includes(enemyId)) {
      s.bossesDefeated.push(enemyId);
      dirty = true;
    }
    if (character === 'spellblade' && !s.bossesDefeatedAsSpellblade.includes(enemyId)) {
      s.bossesDefeatedAsSpellblade.push(enemyId);
      dirty = true;
    }
    if (dirty) persist();
  },

  hasBeatenBoss(enemyId: string): boolean {
    return load().bossesDefeated.includes(enemyId);
  },

  /** True iff the player has defeated the named boss while playing as the
   *  Spellblade. Used for the Spellblade Prismarch-tier skin gate. */
  hasBeatenBossAsSpellblade(enemyId: string): boolean {
    return load().bossesDefeatedAsSpellblade.includes(enemyId);
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
   * Wizard Prismancy red/gold skin unlock flag, computed from
   * `bossesDefeated` for rename-safety. The internal enemy id stays
   * `boss-lord-onyx` (the file/class are still pending a rename pass per
   * CLAUDE.md). */
  hasPrismancySkin(): boolean {
    return load().bossesDefeated.includes('boss-lord-onyx');
  },

  /** True iff the player has defeated the Prismarch *while playing as the
   * Spellblade* — the Spellblade Prismarch-tier (red-helm) skin unlock
   * flag. Strictly stronger than `hasPrismancySkin` (it implies a
   * Spellblade run, which already requires the character unlock, which
   * already requires a prior Prismarch kill). */
  hasSpellbladePrismarchSkin(): boolean {
    return load().bossesDefeatedAsSpellblade.includes('boss-lord-onyx');
  },

  /** The skin the player has chosen, resolved for `character` (defaults to
   * the active character if omitted). Explicit choice sticks (`'default'`
   * or `'prismancy'`); `null` means no explicit pick yet, in which case
   * the unlock state decides — fresh Prismarch unlock auto-applies
   * (trophy-reveal moment), everyone else gets the default skin. If
   * `'prismancy'` is stored but the active character's gate isn't met
   * (legit post-reset state or manual save edit), fall back to default.
   *
   * The `character` parameter lets the menu preview a specific (char,
   * skin) pair without persisting a setSelectedCharacter call first. */
  getSelectedSkin(character?: CharacterId): SkinId {
    const s = load();
    const targetChar = character ?? this.getSelectedCharacter();
    const unlocked =
      targetChar === 'spellblade'
        ? s.bossesDefeatedAsSpellblade.includes('boss-lord-onyx')
        : s.bossesDefeated.includes('boss-lord-onyx');
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

  // --- Character ----------------------------------------------------------

  /** True iff the player has unlocked the Spellblade character — gated on
   * a Prismarch defeat (= Lord Onyx kill, same gate as the Prismancy skin
   * since both are Prismarch-tier rewards). */
  hasSpellbladeCharacter(): boolean {
    return load().bossesDefeated.includes('boss-lord-onyx');
  },

  /** The character the player has chosen. Mirrors `getSelectedSkin`'s
   * resolution rules: explicit 'spellblade' sticks if unlocked, falls back
   * to 'wizard' if not earned (defense-in-depth). 'wizard' always
   * resolves. `null` (no explicit pick yet) → 'wizard'. */
  getSelectedCharacter(): CharacterId {
    const s = load();
    const unlocked = s.bossesDefeated.includes('boss-lord-onyx');
    if (s.selectedCharacter === 'spellblade') return unlocked ? 'spellblade' : 'wizard';
    return 'wizard';
  },

  /** Persist the player's character choice. Main-menu cycle calls this. */
  setSelectedCharacter(character: CharacterId): void {
    const s = load();
    s.selectedCharacter = character;
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
   * `recordBossDefeated('boss-lord-onyx', activeCharacter)` — the
   * character-aware variant ensures a Prismarch kill *as Spellblade* also
   * pops the Spellblade Prismarch-tier skin gate. */
  unlockPrismancySkin(): void {
    this.recordBossDefeated('boss-lord-onyx', this.getSelectedCharacter());
  },

  /**
   * **TEMPORARY beta-tester helper.** Flips every gate that affects what
   * a fresh-install player can see / play:
   *   - Adds `boss-lord-onyx` to both ledgers (shared + Spellblade-only)
   *     → unlocks Spellblade character + Wizard Prismancy skin + Spellblade
   *       Prismarch-tier skin
   *   - Adds `boss-marquis-of-mirages` to the shared ledger → unlocks
   *     Blood of Marquis from the Treasure-pool (after metaUnlock-gate)
   *   - Adds every known item id to `itemsDiscovered` → trophy/collection
   *     overlay shows "X / X items" — purely cosmetic, items are never
   *     gameplay-gated by discovery state
   * Wired from a [U] hotkey on the Main Menu so beta testers can flip
   * the full unlock state without grinding. Triggered manually only —
   * no in-game gameplay flow ever calls this. **Remove the [U] hotkey +
   * this method when the beta period ends.** Item ids are passed in by
   * the caller (rather than imported here) to keep MetaProgress
   * dependency-free of the item catalogue.
   */
  unlockAllForTesting(allItemIds: readonly string[]): void {
    const s = load();
    let dirty = false;
    const bossesToFlip = ['boss-lord-onyx', 'boss-marquis-of-mirages'];
    for (const id of bossesToFlip) {
      if (!s.bossesDefeated.includes(id)) {
        s.bossesDefeated.push(id);
        dirty = true;
      }
    }
    // Spellblade-skin gate is the Prismarch-as-Spellblade kill. Flip it
    // too so the red-helm Spellblade variant is selectable straight away.
    if (!s.bossesDefeatedAsSpellblade.includes('boss-lord-onyx')) {
      s.bossesDefeatedAsSpellblade.push('boss-lord-onyx');
      dirty = true;
    }
    for (const id of allItemIds) {
      if (!s.itemsDiscovered.includes(id)) {
        s.itemsDiscovered.push(id);
        dirty = true;
      }
    }
    if (dirty) persist();
  },
};
