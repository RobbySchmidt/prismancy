import Phaser from 'phaser';
import { type DamageEvent, type Direction, type PickupKind } from '../types';

export interface GameEvents {
  'player:tookDamage': DamageEvent;
  'player:died': void;
  'player:healthChanged': { current: number; max: number };
  'enemy:killed': { x: number; y: number };
  'enemy:droppedCoin': { x: number; y: number };
  /** Burn-DoT (Fire Orb) tick landed on an enemy — GameScene spawns a small
   * flame particle at (x, y). Distinct from `enemy:hit` so missile-hit
   * blood and burn-tick flames stay visually separated. */
  'enemy:burnTick': { x: number; y: number };
  /** Missile-hit landed on an enemy — GameScene spawns blood splatter
   * particles at the impact point. Fired from the missile↔enemy overlap
   * (NOT from `BaseEnemy.takeDamage`) so it only triggers for player hits,
   * not for enemy-projectile or contact damage. */
  'enemy:hit': { x: number; y: number };
  'room:cleared': void;
  'missile:fired': { x: number; y: number };
  'floor:roomEntered': { roomId: string };
  'floor:roomCleared': { roomId: string };
  'map:opened': void;
  'map:closed': void;
  'map:teleport': { roomId: string };
  'inventory:changed': { coins: number; keys: number };
  'item:picked': { itemId: string };
  'pickup:collected': { kind: PickupKind };
  'door:unlocked': { roomId: string; direction: Direction };
  'shop:purchased': { kind: PickupKind; price: number };
  'shop:rejected': { price: number };
  'crate:opened': { kind: PickupKind; goldCrate: boolean };
  'boss:spawned': { name: string; maxHp: number };
  'boss:hpChanged': { current: number; max: number };
  'boss:killed': {
    x: number;
    y: number;
    name: string;
    /** Stable enemy id (matches `EnemyDefinition.id`). Used by
     * `MetaProgress.recordBossDefeated` so the trophy save survives a
     * future displayName-rename pass. */
    enemyId: string;
    noHit: boolean;
  };
  'boss:phaseChanged': { phase: number };
  'gem:collected': { floorId: string };
  /** Fired BEFORE `gem:collected`, with the pickup's world position. The
   * Onyx gem seal listens for this to animate the gem flying from the
   * pickup point into its empty socket. Distinct from `gem:collected`
   * because that one's payload is value-only (HUD / inventory don't need
   * coordinates). */
  'gem:pickedUp': { floorId: string; x: number; y: number };
  /** Player walked onto the gem seal in the Onyx vampire room with all
   * three floor gems — Lord-Onyx-room transition placeholder hooks here. */
  'seal:activated': { x: number; y: number };
  /** Player walked onto the seal without all three gems — HUD shows the
   * X-of-3 hint, no activation. */
  'seal:hintShown': { owned: number; total: number };
  /** Player took the no-gems exit stairs after the Onyx vampire kill —
   * win-screen-incomplete placeholder hooks here. */
  'run:onyxExitTaken': void;
  /** Lord Onyx is dead — full-victory win-screen hooks here, AND the
   * Prismancy red/gold cosmetic skin gets persisted to localStorage. */
  'run:onyxFullVictory': void;
  /** Per-phase Prism Special trigger fired. Phase-1/2/3 fires once per
   * phase. Payload includes the boss's prism position so the gem seal can
   * fly the matching gem (Phase 1=Emerald, 2=Sapphire, 3=Onyx) from the
   * altar socket into the prism during the charge window. After the gem
   * lands, the seal clears the socket. */
  'lordOnyx:specialFired': { phase: 1 | 2 | 3; x: number; y: number };
}

class TypedEventBus {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends keyof GameEvents>(
    event: K,
    handler: (payload: GameEvents[K]) => void,
    context?: unknown,
  ): this {
    this.emitter.on(event, handler, context);
    return this;
  }

  once<K extends keyof GameEvents>(
    event: K,
    handler: (payload: GameEvents[K]) => void,
    context?: unknown,
  ): this {
    this.emitter.once(event, handler, context);
    return this;
  }

  off<K extends keyof GameEvents>(
    event: K,
    handler?: (payload: GameEvents[K]) => void,
    context?: unknown,
  ): this {
    this.emitter.off(event, handler, context);
    return this;
  }

  emit<K extends keyof GameEvents>(
    event: K,
    ...payload: GameEvents[K] extends void ? [] : [GameEvents[K]]
  ): boolean {
    return this.emitter.emit(event, ...payload);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const EventBus = new TypedEventBus();
