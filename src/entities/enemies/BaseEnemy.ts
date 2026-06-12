import Phaser from 'phaser';
import {
  BURN_TICK_INTERVAL_MS,
  BURN_TINT,
  ELITE_AURA_COLOR,
  ELITE_BURST_INITIAL_DELAY_MS,
  ELITE_BURST_INTERVAL_MS,
  ELITE_BURST_SECOND_WAVE_DELAY_MS,
  ELITE_BURST_THORN_COUNT,
  ELITE_DEATH_COIN_BURST,
  ELITE_HP_MULT,
  ELITE_MOVE_SPEED_MULT,
  ELITE_SCALE_MULT,
  MOB_HP_DPS_SCALING_FACTOR,
  ENEMY_PROJECTILE_SPEED,
  HIT_FLASH_DURATION_MS,
  HIT_FLASH_TINT_ENEMY,
  KNOCKBACK_DURATION_MS,
  WORLD_SPRITE_SCALE,
} from '../../config/GameConfig';
import { DepthLayers } from '../../config/DepthLayers';
import { type Vector2 } from '../../types';
import { EventBus } from '../../utils/EventBus';
import { type EnemyDefinition } from '../../data/enemies';
import { type EnemyProjectilePool } from '../projectiles/EnemyProjectilePool';

/**
 * Abstract base for enemies. Owns the universal stuff (HP, hitbox, hit
 * feedback, death event, knockback) and exposes one hook subclasses must
 * implement: `tickAI(time, delta)` for movement / behaviour each frame.
 */
export abstract class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * Not readonly for ONE reason: `promoteToElite` swaps in a per-instance
   * COPY with a scaled moveSpeed (subclass AIs read
   * `this.definition.moveSpeed` per frame, so the copy buffs them without
   * touching every tickAI). Never mutate the shared `ENEMIES` entry —
   * always replace the reference with a spread copy.
   */
  definition: EnemyDefinition;
  protected hp: number;
  protected knockbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: EnemyDefinition) {
    super(scene, x, y, definition.textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.definition = definition;
    // Per-floor mob HP scaling — Sapphire ×1.5, Onyx ×2.0 (see floors.ts).
    // BossEnemy and VampireBody overwrite this with their own DPS-ratio
    // scaling in their constructor bodies, so this only really hits mobs.
    const mobHpMult =
      (scene.registry.get('enemyHpMultiplier') as number | undefined) ?? 1.0;
    // Player DPS-ratio (damage × fireRate vs. base), refreshed by
    // GameScene.updateBossHpScale before every spawn batch. Two tiers:
    //  - Minibosses: FULL ratio on top of the floor mult (user decision
    //    2026-06-12 — their time-to-kill is build-invariant, like bosses).
    //  - Regular mobs: DAMPENED ratio (`MOB_HP_DPS_SCALING_FACTOR`, 0.5)
    //    on top of the floor mult — stacked builds still feel faster than
    //    base, but trash stops evaporating ("jeden run absolut OP" flag).
    //    At base stats the ratio is 1.0 → both tiers collapse to the
    //    plain floor-mult value, so fresh runs are untouched.
    // BossEnemy overwrites this.hp in its own constructor (full ratio,
    // NO floor mult — boss HP is authored absolute), so this only really
    // hits mobs + minibosses. The `miniboss:spawned` emit below snapshots
    // maxHp AFTER this, so the silver HP bar shows the scaled value.
    const rawScale = scene.registry.get('bossHpScale') as number | undefined;
    const dpsRatio =
      rawScale !== undefined && Number.isFinite(rawScale) && rawScale >= 1 ? rawScale : 1.0;
    const dpsScale = definition.miniboss
      ? dpsRatio
      : 1 + (dpsRatio - 1) * MOB_HP_DPS_SCALING_FACTOR;
    this.hp = Math.max(1, Math.round(definition.hp * mobHpMult * dpsScale));

    this.setDepth(DepthLayers.Enemy);
    this.setScale(WORLD_SPRITE_SCALE);
    // Counter-scale the physics body so its world size + position stay at
    // the authored values regardless of the visual scale. (Phaser scales
    // the body by sprite.scale automatically; without this division the
    // body grows + shifts and breaks fine collisions like door triggers.)
    const radius = definition.hitboxRadius / WORLD_SPRITE_SCALE;
    this.setCircle(
      radius,
      this.width / 2 - radius,
      this.height / 2 - radius,
    );
    this.setCollideWorldBounds(true);

    // Miniboss tier: announce to the small silver HP bar in the UIScene.
    // Captured AFTER the floor mob multiplier so the bar's max matches the
    // effective HP. (Minibosses never go through promoteToElite, so this
    // snapshot stays correct for their whole lifetime.)
    if (definition.miniboss) {
      this.minibossMaxHp = this.hp;
      EventBus.emit('miniboss:spawned', {
        name: definition.displayName,
        maxHp: this.hp,
      });
    }
  }

  // --- Miniboss HP bar wiring (2026-06-12) -----------------------------------

  private minibossMaxHp = 0;
  private minibossGoneEmitted = false;

  /** Push the current HP to the miniboss bar (no-op for regular mobs). */
  private emitMinibossHp(): void {
    if (!this.definition.miniboss || this.hp <= 0) return;
    EventBus.emit('miniboss:hpChanged', {
      current: this.hp,
      max: this.minibossMaxHp,
    });
  }

  /**
   * Hide the miniboss bar exactly once — fired from `die()` (kill) AND
   * `destroy()` (despawn without death, e.g. dev-menu room clear). The
   * flag guards the die→tween→destroy double-path.
   */
  private emitMinibossGone(): void {
    if (!this.definition.miniboss || this.minibossGoneEmitted) return;
    this.minibossGoneEmitted = true;
    EventBus.emit('miniboss:gone');
  }

  /** Called every frame from preUpdate while the enemy is active. */
  protected abstract tickAI(time: number, delta: number): void;

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active || this.hp <= 0) return;
    if (this.eliteAura) {
      this.eliteAura.setPosition(this.x, this.y + this.displayHeight * 0.3);
    }
    // The champion burst keeps firing through knockback on purpose — a
    // promoted mob shouldn't be silenceable by sustained knockback hits.
    this.tickEliteBurst(time);
    if (time < this.knockbackUntil) return; // knockback locks AI briefly
    this.tickAI(time, delta);
  }

  // --- Champion promotion (elite rooms, 2026-06-12) --------------------------

  private isElite = false;
  private eliteBurstPool: EnemyProjectilePool | null = null;
  private nextEliteBurstAt = 0;
  private eliteAura: Phaser.GameObjects.Arc | null = null;

  /**
   * Promote this mob into an elite-room champion: HP × `ELITE_HP_MULT` (on
   * top of the floor's mob multiplier already applied in the constructor),
   * bigger sprite (hitbox grows with it — a champion is deliberately a
   * bigger target), pulsing gold aura, and a universal radial thorn burst
   * every `ELITE_BURST_INTERVAL_MS`. The burst is what makes ANY roster
   * pick threatening — a tanky chaser alone would just be kited to death.
   */
  promoteToElite(pool: EnemyProjectilePool): void {
    if (this.isElite) return;
    this.isElite = true;
    this.eliteBurstPool = pool;
    // Per-floor elite HP multiplier (registry-mirrored from
    // `FloorTheme.eliteHpMult` in GameScene.init, fallback ELITE_HP_MULT):
    // Onyx runs ×4.5 instead of ×6 — the high authored Onyx mob HP ×2.0
    // floor mult ×6 compounded into way too fat champions (user-flagged
    // 2026-06-12, "mindestens 20% weniger").
    const eliteMult =
      (this.scene.registry.get('eliteHpMultiplier') as number | undefined) ?? ELITE_HP_MULT;
    this.hp = Math.max(1, Math.round(this.hp * eliteMult));
    this.setScale(this.scale * ELITE_SCALE_MULT);
    this.nextEliteBurstAt = this.scene.time.now + ELITE_BURST_INITIAL_DELAY_MS;
    // Per-instance definition copy with a buffed moveSpeed — every subclass
    // AI reads `this.definition.moveSpeed` per frame, so the copy speeds
    // them all up without touching the shared ENEMIES entry. Rooted mobs
    // (moveSpeed 0) are unaffected. `knockbackFactor: 0` makes champions
    // knockback-IMMUNE (same reasoning as bosses): a solo champion that
    // can be corner-pushed by sustained fire is no encounter at all
    // (user-flagged with the candelabra champion).
    this.definition = {
      ...this.definition,
      moveSpeed: Math.round(this.definition.moveSpeed * ELITE_MOVE_SPEED_MULT),
      knockbackFactor: 0,
    };

    this.eliteAura = this.scene.add
      .circle(this.x, this.y, this.displayWidth * 0.55, ELITE_AURA_COLOR, 0.18)
      .setDepth(DepthLayers.FloorDecoration);
    this.scene.tweens.add({
      targets: this.eliteAura,
      alpha: { from: 0.1, to: 0.24 },
      scale: { from: 0.92, to: 1.08 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private tickEliteBurst(time: number): void {
    if (!this.isElite || !this.eliteBurstPool) return;
    if (time < this.nextEliteBurstAt) return;
    this.nextEliteBurstAt = time + ELITE_BURST_INTERVAL_MS;
    EventBus.emit('enemy:charge');
    // Random base rotation per burst so the safe lanes shift every volley.
    const baseAngle = Math.random() * Math.PI * 2;
    this.fireEliteRadial(baseAngle);
    // Gungeon-style dual radial (aggression pass 2026-06-12): second wave
    // rotated a half-step so wave 1's safe lanes are exactly where wave 2's
    // thorns fly — the player has to MOVE between waves, not pick a lane.
    // Deferred callback guards against death/teardown mid-delay (the
    // Bloomheart freeze pattern).
    this.scene.time.delayedCall(ELITE_BURST_SECOND_WAVE_DELAY_MS, () => {
      if (!this.active || !this.scene || this.hp <= 0) return;
      this.fireEliteRadial(baseAngle + Math.PI / ELITE_BURST_THORN_COUNT);
    });
  }

  private fireEliteRadial(baseAngle: number): void {
    if (!this.eliteBurstPool) return;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    const cx = body ? body.center.x : this.x;
    const cy = body ? body.center.y : this.y;
    for (let i = 0; i < ELITE_BURST_THORN_COUNT; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / ELITE_BURST_THORN_COUNT;
      this.eliteBurstPool.fire(
        cx,
        cy,
        Math.cos(angle) * ENEMY_PROJECTILE_SPEED,
        Math.sin(angle) * ENEMY_PROJECTILE_SPEED,
      );
    }
  }

  private destroyEliteAura(): void {
    if (!this.eliteAura) return;
    this.scene.tweens.killTweensOf(this.eliteAura);
    this.eliteAura.destroy();
    this.eliteAura = null;
  }

  override destroy(fromScene?: boolean): void {
    // Aura is a loose scene object (not a child) — clean it on BOTH the
    // death path and the room-teardown path, same pattern as the
    // Bloomheart spore cleanup.
    this.destroyEliteAura();
    this.emitMinibossGone();
    super.destroy(fromScene);
  }

  /**
   * Apply damage. Optionally pushes the enemy via `knockback` (a velocity
   * vector). Returns true if the hit killed the enemy.
   */
  takeDamage(amount: number, knockback?: Vector2): boolean {
    if (amount <= 0 || this.hp <= 0) return false;
    this.hp -= amount;
    this.emitMinibossHp();
    this.flashHit();
    if (knockback) {
      // `knockbackFactor` scales the shove (default 1). 0 = fully immune:
      // no velocity AND no AI-lock — otherwise a sustained-fire stream
      // would still stun-lock an "immune" enemy via knockbackUntil even
      // though it never moves. Champions are pinned to 0 in promoteToElite.
      const factor = this.definition.knockbackFactor ?? 1;
      if (factor > 0) {
        this.setVelocity(knockback.x * factor, knockback.y * factor);
        this.knockbackUntil = this.scene.time.now + KNOCKBACK_DURATION_MS;
      }
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private flashHit(): void {
    this.setTintFill(HIT_FLASH_TINT_ENEMY);
    this.scene.time.delayedCall(HIT_FLASH_DURATION_MS, () => {
      if (this.active) this.clearTint();
    });
  }

  /**
   * Disable the body so further overlaps don't fire, then play a brief death
   * effect (sparkle burst + scale/fade tween) before destroying. The body is
   * disabled but the sprite stays visible during the tween, so the player
   * sees the enemy "puff out" instead of popping. `countActive(true)` in
   * `GameScene.maybeMarkRoomCleared` ignores inactive members, so the
   * room-clear check still ticks immediately on kill — the tween is purely
   * visual.
   *
   * Marked `protected` so `BossEnemy` can override to additionally emit
   * `boss:killed` while reusing the same disable + tween + destroy flow.
   */
  protected die(): void {
    // Cancel any in-flight burn ticks so they don't fire after the death
    // tween destroys the sprite (active stays true for ~220 ms during the
    // tween — without this clearBurn the tick callback could re-enter
    // die() and double-emit `enemy:killed`).
    this.clearBurn();
    this.emitMinibossGone();
    EventBus.emit('enemy:killed', { x: this.x, y: this.y });
    // Roll the per-enemy coin drop. Bosses set chance=0, so this is a no-op
    // for them — boss rewards go through the dedicated `boss:killed` flow.
    // `coinDropMultiplier` (registry, maintained by GameScene from the
    // ItemSystem aggregate) scales the chance — Bloodletter's Pact trades
    // heart drops for a fatter coin stream. Same registry pattern as
    // `enemyHpMultiplier` in the constructor.
    const coinMult =
      (this.scene.registry.get('coinDropMultiplier') as number | undefined) ?? 1;
    if (
      this.definition.coinDropChance > 0 &&
      Math.random() < this.definition.coinDropChance * coinMult
    ) {
      EventBus.emit('enemy:droppedCoin', { x: this.x, y: this.y });
    }
    // Champions burst a guaranteed coin spray on top of the normal roll —
    // elite rooms have to visibly pay out (staged-rewards decision).
    if (this.isElite) {
      for (let i = 0; i < ELITE_DEATH_COIN_BURST; i++) {
        EventBus.emit('enemy:droppedCoin', {
          x: this.x + (i - (ELITE_DEATH_COIN_BURST - 1) / 2) * 22,
          y: this.y + (Math.random() - 0.5) * 18,
        });
      }
    }
    this.destroyEliteAura();
    this.disableBody(true, false);

    // Sparkle burst — small glow particles flying outward.
    const sparkleCount = 6;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / sparkleCount;
      const dist = 28 + Math.random() * 14;
      const sparkle = this.scene.add
        .circle(this.x, this.y, 2, 0x6effa0, 1)
        .setDepth(DepthLayers.Particle);
      this.scene.tweens.add({
        targets: sparkle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: 320,
        ease: 'Sine.Out',
        onComplete: () => sparkle.destroy(),
      });
    }

    // Death puff — scale up + fade out, then destroy.
    this.scene.tweens.add({
      targets: this,
      scale: 1.4,
      alpha: 0,
      duration: 220,
      ease: 'Sine.Out',
      onComplete: () => this.destroy(),
    });
  }

  /** Contact damage this enemy deals to the player on touch. */
  getContactDamage(): number {
    return this.definition.contactDamage;
  }

  // --- Burn DoT (Fire Orb item) ---------------------------------------------

  private burnTimers: Phaser.Time.TimerEvent[] = [];

  /**
   * Apply a Burn-DoT: `tickCount` damage ticks of `damagePerTick` each,
   * `BURN_TICK_INTERVAL_MS` apart. Re-applying burn cancels any prior burn
   * (latest-wins) so multi-pierce hits stack predictably without
   * compounding into a runaway DoT. Each tick orange-flashes the sprite +
   * emits `enemy:burnTick` so GameScene can spawn a flame particle. Burn
   * ticks intentionally don't knock back — adding force per tick would
   * lock enemy AI for the entire DoT and make burnt mobs drift around.
   */
  applyBurn(damagePerTick: number, tickCount: number): void {
    if (!this.active || damagePerTick <= 0 || tickCount <= 0) return;
    this.clearBurn();
    for (let i = 0; i < tickCount; i++) {
      const ev = this.scene.time.delayedCall(BURN_TICK_INTERVAL_MS * (i + 1), () => {
        if (!this.active || this.hp <= 0) return;
        this.hp -= damagePerTick;
        this.emitMinibossHp();
        this.setTintFill(BURN_TINT);
        this.scene.time.delayedCall(140, () => {
          if (this.active) this.clearTint();
        });
        EventBus.emit('enemy:burnTick', { x: this.x, y: this.y });
        if (this.hp <= 0) {
          this.clearBurn();
          this.die();
        }
      });
      this.burnTimers.push(ev);
    }
  }

  protected clearBurn(): void {
    for (const t of this.burnTimers) t.remove(false);
    this.burnTimers = [];
  }
}
