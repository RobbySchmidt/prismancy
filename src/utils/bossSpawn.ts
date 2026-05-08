/**
 * Boss-add spawn safety. When a boss summons an enemy add, we don't want
 * the add to spawn on top of the player — it would land an instant
 * contact-damage hit before the player can react. Each boss has its own
 * "natural" spawn-position logic (room edge, near-boss jitter, random
 * anywhere etc.); these helpers wrap that logic with a min-distance check
 * + safe fallback.
 *
 * Lord Onyx implemented this inline first (Phase 2 wraith batch — sorts
 * 4 room corners by distance to player descending, takes the FAR ones).
 * The user flagged that all the other summoning bosses (Vine Lord, Forest
 * Heart, Mossy Behemoth, Pixie Queen) needed the same protection, so the
 * pattern got promoted out into this helper module 2026-05-08.
 */

export interface RoomBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Default min distance from player for an add spawn. 3 tiles at TILE_SIZE
 * 64. Same magnitude as the Pixie Queen's teleport-fallback min. */
export const ADD_SPAWN_MIN_PLAYER_DISTANCE = 3 * 64;

/**
 * Pick the room corner farthest from the player (with a small margin from
 * the wall so the spawned add isn't clipping into the wall tiles).
 * Deterministic when multiple corners are equidistant — picks the first one
 * iterated (top-left bias). Used as the "safe fallback" when a boss's
 * natural spawn position turned out to be too close to the player.
 */
export function pickRoomCornerFarthestFromPlayer(
  bounds: RoomBounds,
  playerX: number,
  playerY: number,
  margin = 80,
): Vec2 {
  const corners: Vec2[] = [
    { x: bounds.minX + margin, y: bounds.minY + margin },
    { x: bounds.maxX - margin, y: bounds.minY + margin },
    { x: bounds.minX + margin, y: bounds.maxY - margin },
    { x: bounds.maxX - margin, y: bounds.maxY - margin },
  ];
  let best = corners[0]!;
  let bestDistSq = -1;
  for (const c of corners) {
    const dx = c.x - playerX;
    const dy = c.y - playerY;
    const d = dx * dx + dy * dy;
    if (d > bestDistSq) {
      bestDistSq = d;
      best = c;
    }
  }
  return best;
}

/**
 * Wrap a "natural" candidate spawn position with a player-proximity check.
 * If the candidate is at least `minDistance` away from the player, return
 * it unchanged. Otherwise fall back to the farthest room corner so the add
 * never lands on top of the player.
 */
export function safeAddSpawnPosition(
  candidate: Vec2,
  bounds: RoomBounds,
  playerX: number,
  playerY: number,
  minDistance = ADD_SPAWN_MIN_PLAYER_DISTANCE,
): Vec2 {
  const dx = candidate.x - playerX;
  const dy = candidate.y - playerY;
  if (dx * dx + dy * dy >= minDistance * minDistance) return candidate;
  return pickRoomCornerFarthestFromPlayer(bounds, playerX, playerY);
}
