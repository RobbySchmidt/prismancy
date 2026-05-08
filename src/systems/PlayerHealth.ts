import { EventBus } from '../utils/EventBus';

/**
 * Player health + invincibility-window tracking. Pure class with no Phaser
 * dependency: takes the current time as a parameter so it can be unit-tested
 * deterministically. Emits health/death events via the EventBus.
 */
export type InvincibilitySource = 'damage' | 'grace';

export class PlayerHealth {
  private current: number;
  private max: number;
  private readonly invincibilityMs: number;
  private nextVulnerableAt = 0;
  /**
   * Why the current i-frame window is active. Lets the Player visual layer
   * pick a different feedback for "you just took a hit" (alpha-blink) vs
   * "you just walked into a new room and have a grace window" (no blink —
   * looks too much like the post-hit blink and reads as taking damage,
   * which the user flagged as confusing 2026-05-08). `null` whenever
   * vulnerable.
   */
  private source: InvincibilitySource | null = null;

  constructor(max: number, invincibilityMs: number) {
    if (max <= 0) throw new Error(`PlayerHealth: max must be > 0 (got ${max})`);
    this.current = max;
    this.max = max;
    this.invincibilityMs = invincibilityMs;
  }

  getCurrent(): number {
    return this.current;
  }

  getMax(): number {
    return this.max;
  }

  isAlive(): boolean {
    return this.current > 0;
  }

  isVulnerable(now: number): boolean {
    return now >= this.nextVulnerableAt;
  }

  /** Reason the i-frame window is active, or `null` when vulnerable. */
  getInvincibilitySource(now: number): InvincibilitySource | null {
    if (this.isVulnerable(now)) return null;
    return this.source;
  }

  /**
   * Apply damage if currently vulnerable. Returns true if the hit landed,
   * false if it was absorbed by i-frames. Emits `player:tookDamage`,
   * `player:healthChanged` and `player:died` (the latter only on the
   * transition to 0 HP).
   */
  takeDamage(amount: number, now: number): boolean {
    if (amount <= 0) return false;
    if (!this.isVulnerable(now)) return false;
    if (!this.isAlive()) return false;

    const before = this.current;
    this.current = Math.max(0, this.current - amount);
    this.nextVulnerableAt = now + this.invincibilityMs;
    this.source = 'damage';

    EventBus.emit('player:tookDamage', { amount, source: 'enemy' });
    EventBus.emit('player:healthChanged', { current: this.current, max: this.max });

    if (before > 0 && this.current === 0) {
      EventBus.emit('player:died');
    }
    return true;
  }

  /** Refill (used by hearts pickups in Phase 4). Capped at max. */
  heal(amount: number): void {
    if (amount <= 0 || !this.isAlive()) return;
    const before = this.current;
    this.current = Math.min(this.max, this.current + amount);
    if (this.current !== before) {
      EventBus.emit('player:healthChanged', { current: this.current, max: this.max });
    }
  }

  /**
   * Raise max HP by `amount` and heal the same amount, so the freshly added
   * heart spawns already filled. Used by HP-up items (Heart Container, etc.).
   * No-op for non-positive `amount` or on a dead player.
   */
  addMaxHealth(amount: number): void {
    if (amount <= 0 || !this.isAlive()) return;
    this.max += amount;
    this.current = Math.min(this.max, this.current + amount);
    EventBus.emit('player:healthChanged', { current: this.current, max: this.max });
  }

  /**
   * Grant invincibility for the next `durationMs` from `now`. Used by
   * GameScene to give the player a brief grace period when entering a new
   * uncleared room. Never shortens an already-running window.
   */
  grantInvincibility(durationMs: number, now: number): void {
    if (durationMs <= 0) return;
    const candidate = now + durationMs;
    if (candidate > this.nextVulnerableAt) {
      // Only flip the source if the previous window was already over (player
      // is vulnerable now). If a damage window is still running, leave the
      // source as 'damage' so the post-hit blink doesn't get suppressed mid-
      // recovery just because grantInvincibility extended it.
      if (this.isVulnerable(now)) {
        this.source = 'grace';
      }
      this.nextVulnerableAt = candidate;
    }
  }

  /** Used by the game-over reset path. */
  resetToFull(): void {
    this.current = this.max;
    this.nextVulnerableAt = 0;
    EventBus.emit('player:healthChanged', { current: this.current, max: this.max });
  }

  /**
   * Restore health state from a snapshot (floor-transition carry-over).
   * `max` may exceed the constructor default if the player picked up HP-up
   * items on previous floors. `current` is clamped to `[0, max]`. Emits
   * `player:healthChanged` so the HUD repaints.
   */
  restore(current: number, max: number): void {
    if (max <= 0) throw new Error(`PlayerHealth.restore: max must be > 0 (got ${max})`);
    this.max = max;
    this.current = Math.max(0, Math.min(current, max));
    this.nextVulnerableAt = 0;
    EventBus.emit('player:healthChanged', { current: this.current, max: this.max });
  }
}
