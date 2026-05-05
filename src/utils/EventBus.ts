import Phaser from 'phaser';
import { type DamageEvent, type Direction, type PickupKind } from '../types';

export interface GameEvents {
  'player:tookDamage': DamageEvent;
  'player:died': void;
  'player:healthChanged': { current: number; max: number };
  'enemy:killed': { x: number; y: number };
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
  'boss:killed': { x: number; y: number; name: string; noHit: boolean };
  'boss:phaseChanged': { phase: number };
  'gem:collected': { floorId: string };
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
