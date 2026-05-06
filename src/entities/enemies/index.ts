import Phaser from 'phaser';
import { type EnemyId } from '../../data/enemies';
import { type WaxPuddleGroup } from '../hazards/WaxPuddleGroup';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { BaseEnemy } from './BaseEnemy';
import { Bloomheart } from './Bloomheart';
import { BogColossus } from './BogColossus';
import { BogFrog } from './BogFrog';
import { BogTortoise } from './BogTortoise';
import { BossEnemy } from './BossEnemy';
import { CrimsonLord } from './CrimsonLord';
import { CursedMirror } from './CursedMirror';
import { LordOnyx } from './LordOnyx';
import { Damselfly } from './Damselfly';
import { DamselflyEmpress } from './DamselflyEmpress';
import { ForestHeart } from './ForestHeart';
import { ForestSprite } from './ForestSprite';
import { MossyBehemoth } from './MossyBehemoth';
import { MossySlime } from './MossySlime';
import { PixieDancer } from './PixieDancer';
import { PixieQueen } from './PixieQueen';
import { PossessedCandelabra } from './PossessedCandelabra';
import { SapphireMarquis } from './SapphireMarquis';
import { SnapperBloom } from './SnapperBloom';
import { ToadSovereign } from './ToadSovereign';
import { VampireFight } from './VampireFight';
import { VineLord } from './VineLord';
import { VineSprout } from './VineSprout';
import { Wraith } from './Wraith';

export interface EnemySpawnContext {
  scene: Phaser.Scene;
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
  enemyProjectilePool: EnemyProjectilePool;
  waxPuddleGroup: WaxPuddleGroup;
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
      return new PixieDancer(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'bog-frog':
      return new BogFrog(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'snapper-bloom':
      return new SnapperBloom(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'damselfly':
      return new Damselfly(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'bog-tortoise':
      return new BogTortoise(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'wraith':
      return new Wraith(ctx.scene, x, y, ctx.target);
    case 'possessed-candelabra':
      return new PossessedCandelabra(
        ctx.scene,
        x,
        y,
        ctx.target,
        ctx.waxPuddleGroup,
        ctx.enemyProjectilePool,
      );
    case 'cursed-mirror':
      return new CursedMirror(ctx.scene, x, y, ctx.target, ctx.enemyProjectilePool);
    case 'boss-vine-lord':
    case 'boss-mossy-behemoth':
    case 'boss-pixie-queen':
    case 'boss-forest-heart':
    case 'boss-toad-sovereign':
    case 'boss-bloomheart':
    case 'boss-damselfly-empress':
    case 'boss-bog-colossus':
    case 'boss-crimson-lord':
    case 'boss-sapphire-marquis':
    case 'boss-lord-onyx':
      throw new Error(
        'createEnemy: boss enemies must be constructed directly (e.g. `new VineLord(scene, x, y, host)`).',
      );
  }
}

export {
  BaseEnemy,
  Bloomheart,
  BogColossus,
  BogFrog,
  BogTortoise,
  BossEnemy,
  CrimsonLord,
  CursedMirror,
  Damselfly,
  DamselflyEmpress,
  ForestHeart,
  ForestSprite,
  LordOnyx,
  MossyBehemoth,
  MossySlime,
  PixieDancer,
  PixieQueen,
  PossessedCandelabra,
  SapphireMarquis,
  SnapperBloom,
  ToadSovereign,
  VampireFight,
  VineLord,
  VineSprout,
  Wraith,
};
