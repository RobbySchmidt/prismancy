import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaProgress } from '../src/systems/MetaProgress';

// Vitest's default `node` env doesn't ship with localStorage. The
// MetaProgress module's safeRead/safeWrite helpers are wrapped in
// try/catch + a typeof-check, so they degrade to "no-op" when the global
// is missing — but for these tests we want REAL persistence behaviour, so
// we install a tiny in-memory shim before each case and tear it down
// after.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const STORAGE_KEY = 'prismancy.save.v1';
const LEGACY_KEY_LORD_ONYX = 'prismancy.unlocks.lordOnyxBeaten';
const LEGACY_KEY_SELECTED_SKIN = 'prismancy.cosmetics.selectedSkin';

describe('MetaProgress', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    MetaProgress.forceReload();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with an empty save when no storage exists', () => {
    const s = MetaProgress.get();
    expect(s.bossesDefeated).toEqual([]);
    expect(s.itemsDiscovered).toEqual([]);
    expect(s.runs).toEqual({ started: 0, died: 0, wonFull: 0, wonIncomplete: 0 });
    expect(s.bestRunMs).toBeNull();
    expect(s.selectedSkin).toBeNull();
  });

  it('records boss defeats idempotently', () => {
    MetaProgress.recordBossDefeated('boss-vine-lord');
    MetaProgress.recordBossDefeated('boss-vine-lord');
    MetaProgress.recordBossDefeated('boss-pixie-queen');
    const s = MetaProgress.get();
    expect(s.bossesDefeated).toEqual(['boss-vine-lord', 'boss-pixie-queen']);
    expect(MetaProgress.hasBeatenBoss('boss-vine-lord')).toBe(true);
    expect(MetaProgress.hasBeatenBoss('boss-bog-colossus')).toBe(false);
  });

  it('records item discoveries idempotently', () => {
    MetaProgress.recordItemDiscovered('magicTome');
    MetaProgress.recordItemDiscovered('magicTome');
    MetaProgress.recordItemDiscovered('hotTea');
    expect(MetaProgress.get().itemsDiscovered).toEqual(['magicTome', 'hotTea']);
  });

  it('increments run lifecycle counters', () => {
    MetaProgress.recordRunStarted();
    MetaProgress.recordRunStarted();
    MetaProgress.recordRunDied();
    MetaProgress.recordRunWonFull(120000);
    MetaProgress.recordRunWonIncomplete();
    const s = MetaProgress.get();
    expect(s.runs.started).toBe(2);
    expect(s.runs.died).toBe(1);
    expect(s.runs.wonFull).toBe(1);
    expect(s.runs.wonIncomplete).toBe(1);
  });

  it('updates bestRunMs only when a faster real run lands', () => {
    MetaProgress.recordRunWonFull(150000);
    expect(MetaProgress.get().bestRunMs).toBe(150000);
    MetaProgress.recordRunWonFull(180000);
    expect(MetaProgress.get().bestRunMs).toBe(150000);
    MetaProgress.recordRunWonFull(90000);
    expect(MetaProgress.get().bestRunMs).toBe(90000);
  });

  it('ignores zero/negative durations for bestRunMs (dev-hook guard)', () => {
    MetaProgress.recordRunWonFull(120000);
    expect(MetaProgress.get().bestRunMs).toBe(120000);
    // Dev-hook spawn: no real start time, duration falls through as 0.
    MetaProgress.recordRunWonFull(0);
    MetaProgress.recordRunWonFull(-50);
    // Counter still ticks but the time stays the legitimate one.
    expect(MetaProgress.get().runs.wonFull).toBe(3);
    expect(MetaProgress.get().bestRunMs).toBe(120000);
  });

  it('persists across forceReload (round-trip via storage)', () => {
    MetaProgress.recordBossDefeated('boss-vine-lord');
    MetaProgress.recordItemDiscovered('magicTome');
    MetaProgress.recordRunWonFull(60000);
    MetaProgress.forceReload();
    const s = MetaProgress.get();
    expect(s.bossesDefeated).toEqual(['boss-vine-lord']);
    expect(s.itemsDiscovered).toEqual(['magicTome']);
    expect(s.bestRunMs).toBe(60000);
  });

  it('migrates legacy Cosmetics keys on first load', () => {
    storage.setItem(LEGACY_KEY_LORD_ONYX, 'true');
    storage.setItem(LEGACY_KEY_SELECTED_SKIN, 'prismancy');
    MetaProgress.forceReload();
    const s = MetaProgress.get();
    expect(s.bossesDefeated).toContain('boss-lord-onyx');
    expect(s.selectedSkin).toBe('prismancy');
    // After the migration writes the v1 blob, the legacy keys are NOT
    // removed — a downgrade-then-upgrade still resurfaces the unlock.
    expect(storage.getItem(LEGACY_KEY_LORD_ONYX)).toBe('true');
    // The new save is now the source of truth.
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('falls back to a fresh save on a corrupt blob', () => {
    storage.setItem(STORAGE_KEY, 'not-json');
    MetaProgress.forceReload();
    const s = MetaProgress.get();
    expect(s.runs.started).toBe(0);
    expect(s.bossesDefeated).toEqual([]);
  });

  it('falls back to a fresh save on a wrong-version blob', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, garbage: true }));
    MetaProgress.forceReload();
    expect(MetaProgress.get().runs.started).toBe(0);
  });

  it('hasPrismancySkin reflects boss-lord-onyx defeat status', () => {
    expect(MetaProgress.hasPrismancySkin()).toBe(false);
    MetaProgress.recordBossDefeated('boss-vine-lord');
    expect(MetaProgress.hasPrismancySkin()).toBe(false);
    MetaProgress.recordBossDefeated('boss-lord-onyx');
    expect(MetaProgress.hasPrismancySkin()).toBe(true);
  });

  it('getSelectedSkin auto-applies prismancy on unlock without explicit pref', () => {
    expect(MetaProgress.getSelectedSkin()).toBe('default');
    MetaProgress.recordBossDefeated('boss-lord-onyx');
    // No explicit setSelectedSkin call → trophy auto-apply.
    expect(MetaProgress.getSelectedSkin()).toBe('prismancy');
  });

  it('getSelectedSkin honours explicit default after unlock', () => {
    MetaProgress.recordBossDefeated('boss-lord-onyx');
    MetaProgress.setSelectedSkin('default');
    expect(MetaProgress.getSelectedSkin()).toBe('default');
  });

  it('getSelectedSkin falls back to default when prismancy stored but unlock missing', () => {
    MetaProgress.setSelectedSkin('prismancy');
    // No boss-lord-onyx defeat — stored prismancy is invalid.
    expect(MetaProgress.getSelectedSkin()).toBe('default');
  });

  it('resetAll wipes the save + the legacy keys', () => {
    MetaProgress.recordBossDefeated('boss-lord-onyx');
    MetaProgress.recordItemDiscovered('magicTome');
    storage.setItem(LEGACY_KEY_LORD_ONYX, 'true');
    storage.setItem(LEGACY_KEY_SELECTED_SKIN, 'prismancy');
    MetaProgress.resetAll();
    const s = MetaProgress.get();
    expect(s.bossesDefeated).toEqual([]);
    expect(s.itemsDiscovered).toEqual([]);
    expect(storage.getItem(LEGACY_KEY_LORD_ONYX)).toBeNull();
    expect(storage.getItem(LEGACY_KEY_SELECTED_SKIN)).toBeNull();
  });
});
