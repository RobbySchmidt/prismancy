/**
 * Persistent cosmetic-unlock storage. Backed by localStorage so the unlock
 * survives reloads + browser sessions. All access is wrapped in try/catch
 * so private-browsing or disabled-storage environments degrade silently to
 * "no unlocks" rather than throwing.
 *
 * Currently tracks one unlock: the Prismancy red/gold wizard skin earned
 * by defeating Lord Onyx. Future cosmetics / item unlocks slot in as
 * additional getter/setter pairs against new keys.
 */
const STORAGE_KEY_LORD_ONYX = 'prismancy.unlocks.lordOnyxBeaten';
const STORAGE_KEY_SELECTED_SKIN = 'prismancy.cosmetics.selectedSkin';

export type SkinId = 'default' | 'prismancy';

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — silently no-op.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable — silently no-op.
  }
}

export const Cosmetics = {
  /** True if the player has ever defeated Lord Onyx (= red/gold skin
   * unlocked + auto-applied to the player sprite). */
  hasPrismancySkin(): boolean {
    return safeRead(STORAGE_KEY_LORD_ONYX) === 'true';
  },

  /** Mark the Prismancy skin as unlocked. Idempotent. */
  unlockPrismancySkin(): void {
    safeWrite(STORAGE_KEY_LORD_ONYX, 'true');
  },

  /** Dev-only: clear all unlocks so testing the unlock flow + the locked
   * default state is one console call away. */
  resetAll(): void {
    safeRemove(STORAGE_KEY_LORD_ONYX);
    safeRemove(STORAGE_KEY_SELECTED_SKIN);
  },

  /**
   * The skin the player has chosen for the wizard. If no explicit choice
   * has ever been made, the unlock-state decides the default: a fresh
   * Prismancy unlock auto-applies (preserves the trophy reveal moment),
   * everyone else gets the default purple/white wizard. Once the player
   * makes a manual choice via the main-menu toggle, that choice sticks
   * across sessions until they toggle again.
   *
   * If the player has Prismancy stored as their preference but the skin
   * isn't unlocked (e.g. localStorage edited / unlocks reset), we fall
   * back to the default skin so the cosmetic stays earned.
   */
  getSelectedSkin(): SkinId {
    const stored = safeRead(STORAGE_KEY_SELECTED_SKIN);
    const unlocked = safeRead(STORAGE_KEY_LORD_ONYX) === 'true';
    if (stored === 'prismancy') return unlocked ? 'prismancy' : 'default';
    if (stored === 'default') return 'default';
    // No explicit preference yet — auto-apply the unlock.
    return unlocked ? 'prismancy' : 'default';
  },

  /** Persist the player's skin choice. The main-menu toggle calls this. */
  setSelectedSkin(skin: SkinId): void {
    safeWrite(STORAGE_KEY_SELECTED_SKIN, skin);
  },
};
