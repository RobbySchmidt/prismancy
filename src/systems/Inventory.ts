import { STARTING_COINS } from '../config/GameConfig';
import { EventBus } from '../utils/EventBus';

/**
 * Per-run resource purse. Holds coins (shop currency) and keys (door /
 * chest unlocks). Emits `inventory:changed` after every successful mutation
 * so the HUD can refresh without polling.
 *
 * Note: the constructor does NOT emit `inventory:changed`, even though
 * `coins` may be non-zero (`STARTING_COINS`). The HUD (`CurrencyDisplay`)
 * is built in `UIScene.create()` which runs *after* `GameScene.create()`
 * constructs the Inventory — so a constructor-time emit would have no
 * subscribers. Instead, `CurrencyDisplay` reads the current Inventory out
 * of the scene registry on construction and renders the initial values
 * itself.
 */
export class Inventory {
  private coins = STARTING_COINS;
  private keys = 0;
  /**
   * Floor IDs the player has earned a "no-hit boss" gem for. Storing as a Set
   * because gems are deduplicated (you can't earn the same floor's gem twice
   * in one run) and lookup needs to be O(1) for HUD repaints.
   */
  private readonly gems = new Set<string>();

  getCoins(): number {
    return this.coins;
  }

  getKeys(): number {
    return this.keys;
  }

  addCoins(n: number): void {
    if (n <= 0) return;
    this.coins += n;
    this.emitChange();
  }

  spendCoins(n: number): boolean {
    if (n <= 0) return false;
    if (this.coins < n) return false;
    this.coins -= n;
    this.emitChange();
    return true;
  }

  addKeys(n: number): void {
    if (n <= 0) return;
    this.keys += n;
    this.emitChange();
  }

  spendKey(): boolean {
    if (this.keys < 1) return false;
    this.keys -= 1;
    this.emitChange();
    return true;
  }

  // --- Gems (no-hit boss trophy per floor) ---------------------------------

  /**
   * Record a no-hit gem earned on `floorId`. Idempotent — a duplicate add for
   * the same floor is a no-op (no event re-fire). Emits `gem:collected` so
   * the HUD / picked-items list can update.
   */
  addGem(floorId: string): void {
    if (this.gems.has(floorId)) return;
    this.gems.add(floorId);
    EventBus.emit('gem:collected', { floorId });
  }

  hasGem(floorId: string): boolean {
    return this.gems.has(floorId);
  }

  getGems(): ReadonlySet<string> {
    return this.gems;
  }

  /**
   * Restore inventory state from a snapshot (floor-transition carry-over).
   * Bypasses the addCoins / addKeys / addGem event-emit paths so the next
   * scene's HUD doesn't see toast-style "+N coins" notifications for state
   * the player already had. One `inventory:changed` is fired at the end so
   * the HUD repaints with the final values.
   */
  hydrate(snapshot: { coins: number; keys: number; gems: ReadonlyArray<string> }): void {
    this.coins = Math.max(0, snapshot.coins);
    this.keys = Math.max(0, snapshot.keys);
    this.gems.clear();
    for (const floorId of snapshot.gems) this.gems.add(floorId);
    this.emitChange();
  }

  private emitChange(): void {
    EventBus.emit('inventory:changed', { coins: this.coins, keys: this.keys });
  }
}
