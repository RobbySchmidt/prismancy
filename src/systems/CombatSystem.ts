import { type Vector2 } from '../types';

/**
 * Combat utilities. Pure math + small helpers — no Phaser side-effects so
 * unit tests stay deterministic. Phaser-touching glue (tint flashes, screen
 * shakes) lives on the entities themselves.
 */
export class CombatSystem {
  /**
   * Compute a knockback velocity vector pointing from `source` toward
   * `target`. If the two positions coincide (zero distance) we pick a stable
   * fallback direction (down) so the target still gets pushed.
   */
  static knockbackVector(source: Vector2, target: Vector2, force: number): Vector2 {
    if (force <= 0) return { x: 0, y: 0 };
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: 0, y: force };
    const len = Math.sqrt(lenSq);
    return { x: (dx / len) * force, y: (dy / len) * force };
  }
}
