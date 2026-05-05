import Phaser from 'phaser';
import { type EnemyId } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';
import { BossEnemy } from './BossEnemy';
import { ForestHeart } from './ForestHeart';
import { ForestSprite } from './ForestSprite';
import { MossyBehemoth } from './MossyBehemoth';
import { MossySlime } from './MossySlime';
import { PixieDancer } from './PixieDancer';
import { PixieQueen } from './PixieQueen';
import { VineLord } from './VineLord';
import { VineSprout } from './VineSprout';

export interface EnemySpawnContext {
  scene: Phaser.Scene;
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
  enemyProjectilePool: EnemyProjectilePool;
}

/**
 * Factory mapping `EnemyId` → concrete enemy class. Centralised here so the
 * spawner doesn't need to know each constructor's signature; new enemy types
 * are wired in by adding a case here + a data entry + a class file. Boss IDs
 * are deliberately rejected — bosses need extra dependencies (e.g.
 * VineLordHost) and are constructed directly in GameScene.
 */
export function createEnemy(
  id: EnemyId,
  ctx: EnemySpawnContext,
  x: number,
  y: number,
): BaseEnemy {
  switch (id) {
    case 'forest-sprite':
      return new ForestSprite(ctx.scene, x, y, ctx.target);
    case 'mossy-slime':
      return new MossySlime(ctx.scene, x, y, ctx.target);
    case 'vine-sprout':
      return new VineSprout(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'pixie-dancer':
      return new PixieDancer(ctx.scene, x, y, ctx.target);
    case 'boss-vine-lord':
    case 'boss-mossy-behemoth':
    case 'boss-pixie-queen':
    case 'boss-forest-heart':
      throw new Error(
        'createEnemy: boss enemies must be constructed directly (e.g. `new VineLord(scene, x, y, host)`).',
      );
  }
}

export {
  BaseEnemy,
  BossEnemy,
  ForestHeart,
  ForestSprite,
  MossyBehemoth,
  MossySlime,
  PixieDancer,
  PixieQueen,
  VineLord,
  VineSprout,
};
