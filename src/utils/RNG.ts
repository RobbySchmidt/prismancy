/**
 * Seeded RNG using mulberry32. Reproducible across runs given the same seed,
 * so dungeons, loot rolls and item drops can be replayed for debugging.
 */
export class RNG {
  private state: number;

  constructor(seed: number | string) {
    this.state = RNG.normalizeSeed(seed);
  }

  static normalizeSeed(seed: number | string): number {
    if (typeof seed === 'number') {
      return Math.floor(seed) >>> 0;
    }
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  intBetween(min: number, max: number): number {
    if (max < min) throw new Error(`RNG.intBetween: max (${max}) < min (${min})`);
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max). */
  floatBetween(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('RNG.pick: array is empty');
    return items[this.intBetween(0, items.length - 1)]!;
  }

  /**
   * Pick an item by weight. By default items must have a positive `weight`
   * field; pass a `getWeight` selector to source the weight from elsewhere
   * (useful when the items are read-only data with optional weights).
   * An item with weight 0 is never picked. Throws on empty input or
   * all-zero weights.
   */
  pickWeighted<T extends { weight: number }>(items: readonly T[]): T;
  pickWeighted<T>(items: readonly T[], getWeight: (item: T) => number): T;
  pickWeighted<T>(items: readonly T[], getWeight?: (item: T) => number): T {
    if (items.length === 0) throw new Error('RNG.pickWeighted: array is empty');
    const weightOf = getWeight ?? ((item: T) => (item as { weight: number }).weight);
    let total = 0;
    for (const item of items) {
      const w = weightOf(item);
      if (w < 0) throw new Error('RNG.pickWeighted: negative weight');
      total += w;
    }
    if (total <= 0) throw new Error('RNG.pickWeighted: all weights are zero');
    let r = this.next() * total;
    for (const item of items) {
      r -= weightOf(item);
      if (r <= 0) return item;
    }
    return items[items.length - 1]!;
  }

  /** Returns true with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Fisher-Yates shuffle into a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.intBetween(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }

  /** Snapshot/restore for save-states or branching simulations. */
  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}
