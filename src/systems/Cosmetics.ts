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
  },
};
