import type Phaser from 'phaser';
import {
  TILE_SIZE,
  VAMPIRE_SPAWN_OFFSET_TILES,
} from '../../config/GameConfig';
import { EventBus } from '../../utils/EventBus';
import { type BloodTrailGroup } from '../hazards/BloodTrailGroup';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';
import { type Player } from '../Player';
import { CrimsonLord } from './CrimsonLord';
import { SapphireMarquis } from './SapphireMarquis';
import { type VampireBody } from './VampireBody';

/**
 * Combined host that satisfies both vampire bodies' adapters at once.
 * GameScene builds this via its `bossHost()` helper.
 */
export interface VampireFightHost {
  getPlayer(): Player;
  enemyProjectilePool: EnemyProjectilePool;
  bloodTrailGroup: BloodTrailGroup;
  getRoomBounds(): { minX: number; maxX: number; minY: number; maxY: number };
}

const FIGHT_DISPLAY_NAME = 'Vampire Twins';

/**
 * Coordinator for the Vampire Twins boss fight. NOT a Phaser GameObject —
 * lives in `GameScene.activeBoss` (typed wide enough to hold a `destroy()`
 * handle). Spawns and owns both bodies, manages the combined HP bar, fires
 * `boss:killed` exactly once when the second body dies, and cascades the
 * Phase 2 trigger to the survivor.
 */
export class VampireFight {
  readonly displayName = FIGHT_DISPLAY_NAME;
  private readonly bodies: Set<VampireBody>;
  private readonly maxHpTotal: number;
  private readonly scene: Phaser.Scene;
  /** Last position of the body that died — used as the loot-drop anchor. */
  private lastDeathX = 0;
  private lastDeathY = 0;
  private killEmitted = false;

  constructor(scene: Phaser.Scene, x: number, y: number, host: VampireFightHost) {
    this.scene = scene;
    const offset = VAMPIRE_SPAWN_OFFSET_TILES * TILE_SIZE;
    const lord = new CrimsonLord(scene, x - offset, y, host);
    const marquis = new SapphireMarquis(scene, x + offset, y, host);
    lord.attachCoordinator(this);
    marquis.attachCoordinator(this);
    this.bodies = new Set<VampireBody>([lord, marquis]);
    this.maxHpTotal = lord.maxHp + marquis.maxHp;

    EventBus.emit('boss:spawned', {
      name: this.displayName,
      maxHp: this.maxHpTotal,
    });
    // Initial bar fill — emit once so the HUD lights up at full immediately
    // even before the first hit lands.
    EventBus.emit('boss:hpChanged', {
      current: this.maxHpTotal,
      max: this.maxHpTotal,
    });
  }

  /** GameScene reads this to add both bodies to its `enemies` group. */
  getBodies(): VampireBody[] {
    return [...this.bodies];
  }

  /** Sum of all live bodies' HP. Used for the combined HP bar. */
  private getCombinedHp(): number {
    let total = 0;
    for (const b of this.bodies) total += b.getHp();
    return total;
  }

  // --- Coordinator hooks (called by VampireBody) ---------------------------

  onBodyDamaged(_body: VampireBody): void {
    EventBus.emit('boss:hpChanged', {
      current: this.getCombinedHp(),
      max: this.maxHpTotal,
    });
  }

  /**
   * Phase 1 cross-body danger-zone gate. The querying body wants to know
   * whether the OTHER live body is in a high-pressure state right now
   * (Crimson Lord telegraph / dash). Used by Sapphire Marquis to defer his
   * fan + teleport so "Lord telegraph + Marquis fan" doesn't overlap, which
   * was the unfair-RNG bug the user flagged. Returns false once the partner
   * has died — solo mode has nothing to defer for.
   */
  isPartnerInDangerZone(self: VampireBody): boolean {
    const partner = this.getPartner(self);
    return partner !== null && partner.isInDangerZone();
  }

  /** Returns the OTHER live body, or null. See interface doc. */
  getPartner(self: VampireBody): VampireBody | null {
    for (const partner of this.bodies) {
      if (partner === self) continue;
      if (!partner.active) continue;
      return partner;
    }
    return null;
  }

  /**
   * Shared-pool gate: the Sapphire Marquis is invulnerable while the
   * Crimson Lord is alive. The combined HP bar then drains through the
   * Lord's HP first; once the Lord dies, hits register on the Marquis
   * normally. Player-facing feedback comes from `flashShielded` in
   * VampireBody.takeDamage.
   */
  shouldBlockDamage(body: VampireBody): boolean {
    if (!(body instanceof SapphireMarquis)) return false;
    for (const partner of this.bodies) {
      if (partner instanceof CrimsonLord && partner.active) return true;
    }
    return false;
  }

  onBodyDied(body: VampireBody): void {
    this.lastDeathX = body.x;
    this.lastDeathY = body.y;
    this.bodies.delete(body);

    if (this.bodies.size === 1) {
      // Phase 2: surviving body enters solo mode (faster cadence, new
      // pattern). Combined HP bar continues to drain — the dead body just
      // contributes 0 to the sum from now on.
      const survivor = [...this.bodies][0];
      survivor.enterSoloMode();
      EventBus.emit('boss:hpChanged', {
        current: this.getCombinedHp(),
        max: this.maxHpTotal,
      });
      return;
    }

    if (this.bodies.size === 0 && !this.killEmitted) {
      this.killEmitted = true;
      EventBus.emit('boss:hpChanged', { current: 0, max: this.maxHpTotal });
      // Read the no-hit flag at emit-time so the answer reflects the entire
      // fight up to and including the last hit (mirrors BossEnemy.die()).
      const noHit = this.scene.registry.get('bossNoHitInProgress') === true;
      EventBus.emit('boss:killed', {
        x: this.lastDeathX,
        y: this.lastDeathY,
        name: this.displayName,
        noHit,
      });
    }
  }

  /**
   * Called from GameScene's `__wiz.spawnBoss` cleanup or other forced
   * teardown paths. Idempotent — bodies that have already died are simply
   * skipped. Does NOT emit `boss:killed` (forced teardown isn't a kill).
   */
  destroy(): void {
    for (const body of this.bodies) {
      if (body.active) body.destroy();
    }
    this.bodies.clear();
  }
}
