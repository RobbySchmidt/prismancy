import { ActiveItemKind, ItemPool, type ItemDefinition } from '../types';
import { TextureKeys } from '../config/GameConfig';
import { MetaProgress } from '../systems/MetaProgress';
import { type RNG } from '../utils/RNG';

/**
 * Static item catalogue. New items are a config-only addition: add an entry
 * here, generate the icon in `PreloadScene`, register the texture key in
 * `TextureKeys`. ItemSystem reads `effects` + `missileTint` and pushes them
 * into the player's StatsSystem at pickup-time.
 */
export const ITEMS = {
  magicTome: {
    id: 'magicTome',
    displayName: 'Magic Tome',
    description: '+1 Damage, Missile is bigger.',
    textureKey: TextureKeys.ItemMagicTome,
    pools: [ItemPool.Treasure, ItemPool.Shop],
    effects: [
      { stat: 'damage', add: 1 },
      { stat: 'missileScale', add: 0.15 },
    ],
    shopPrice: 15,
  },
  hotTea: {
    id: 'hotTea',
    displayName: 'Hot Tea',
    description: '+30% Fire Rate.',
    textureKey: TextureKeys.ItemHotTea,
    pools: [ItemPool.Treasure, ItemPool.Shop],
    effects: [{ stat: 'fireRate', mult: 1.3 }],
    missileTint: 0xff8a3a, // warm orange
    shopPrice: 12,
  },
  wizardSneakers: {
    id: 'wizardSneakers',
    displayName: "Wizard's Sneakers",
    description: '+25 Move Speed.',
    textureKey: TextureKeys.ItemWizardSneakers,
    pools: [ItemPool.Treasure, ItemPool.Shop],
    effects: [{ stat: 'moveSpeed', add: 25 }],
    shopPrice: 12,
  },
  telescopicWand: {
    id: 'telescopicWand',
    displayName: 'Telescopic Wand',
    description: '+1 Damage, +15% Missile Speed.',
    textureKey: TextureKeys.ItemTelescopicWand,
    pools: [ItemPool.Treasure],
    effects: [
      { stat: 'damage', add: 1 },
      { stat: 'missileSpeed', mult: 1.15 },
    ],
  },
  leadCap: {
    id: 'leadCap',
    displayName: 'Lead Cap',
    description: '+50% Damage, -25% Fire Rate. Heavy missile.',
    textureKey: TextureKeys.ItemLeadCap,
    pools: [ItemPool.Treasure],
    effects: [
      { stat: 'damage', mult: 1.5 },
      { stat: 'fireRate', mult: 0.75 },
      { stat: 'missileScale', add: 0.3 },
    ],
  },
  magicPotion: {
    id: 'magicPotion',
    displayName: 'Magic Potion',
    description: '+0.5 Damage, +10 Move Speed.',
    textureKey: TextureKeys.ItemMagicPotion,
    pools: [ItemPool.Shop],
    effects: [
      { stat: 'damage', add: 0.5 },
      { stat: 'moveSpeed', add: 10 },
    ],
    shopPrice: 8,
  },
  pixieDust: {
    id: 'pixieDust',
    displayName: 'Pixie Dust',
    description: '+1 max HP, faster missiles, magic pink color.',
    textureKey: TextureKeys.ItemPixieDust,
    pools: [ItemPool.Treasure],
    effects: [{ stat: 'missileSpeed', add: 60 }],
    missileTint: 0xff44aa, // magenta
    /** 2 HP = one full heart (HP_PER_HEART). Pixie magic restores vitality. */
    maxHealthBonus: 2,
  },
  heartContainer: {
    id: 'heartContainer',
    displayName: 'Heart Container',
    description: '+1 max HP, fully heal new heart.',
    textureKey: TextureKeys.ItemHeartContainer,
    pools: [ItemPool.Treasure],
    effects: [],
    /** 2 HP = one full heart (HP_PER_HEART). */
    maxHealthBonus: 2,
  },
  crownOfTheVine: {
    id: 'crownOfTheVine',
    displayName: 'Crown of the Vine',
    description: '+1 dmg, missile glows toxic green.',
    textureKey: TextureKeys.ItemCrownOfTheVine,
    pools: [ItemPool.Boss],
    effects: [
      { stat: 'damage', add: 1 },
      { stat: 'missileScale', add: 0.2 },
    ],
    missileTint: 0x6effa0,
    floor: 'emerald-forest',
  },
  ancientHeart: {
    id: 'ancientHeart',
    displayName: 'Ancient Heart',
    description: '+1 max HP, +20% fire rate.',
    textureKey: TextureKeys.ItemAncientHeart,
    pools: [ItemPool.Boss],
    effects: [{ stat: 'fireRate', mult: 1.2 }],
    maxHealthBonus: 2,
    floor: 'emerald-forest',
  },
  witheredFang: {
    id: 'witheredFang',
    displayName: 'Withered Fang',
    description: '+50% damage, missiles slower but heavier.',
    textureKey: TextureKeys.ItemWitheredFang,
    pools: [ItemPool.Boss],
    effects: [
      { stat: 'damage', mult: 1.5 },
      { stat: 'missileSpeed', mult: 0.85 },
      { stat: 'missileScale', add: 0.3 },
    ],
    floor: 'emerald-forest',
  },
  spyglass: {
    id: 'spyglass',
    displayName: 'Spyglass',
    description: '+1 max HP, +10% Missile Speed.',
    textureKey: TextureKeys.ItemSpyglass,
    pools: [ItemPool.Treasure, ItemPool.Shop],
    effects: [{ stat: 'missileSpeed', mult: 1.1 }],
    /** 2 HP = one full heart (HP_PER_HEART). The spyglass spots danger
     * before it lands — translates to a vitality bump. */
    maxHealthBonus: 2,
    shopPrice: 14,
  },
  lilyDiadem: {
    id: 'lilyDiadem',
    displayName: 'Lily Diadem',
    description: '+1 max HP, +15% Fire Rate. Sapphire missile.',
    textureKey: TextureKeys.ItemLilyDiadem,
    pools: [ItemPool.Boss],
    effects: [{ stat: 'fireRate', mult: 1.15 }],
    missileTint: 0x4ad8ff,
    maxHealthBonus: 2,
    floor: 'sapphire-swamp',
  },
  mirePearl: {
    id: 'mirePearl',
    displayName: 'Mire Pearl',
    description: '+1 Damage, +20% Missile Speed. Pearl-blue missile.',
    textureKey: TextureKeys.ItemMirePearl,
    pools: [ItemPool.Boss],
    effects: [
      { stat: 'damage', add: 1 },
      { stat: 'missileSpeed', mult: 1.2 },
    ],
    missileTint: 0xb0e8ff,
    floor: 'sapphire-swamp',
  },
  frogTongue: {
    id: 'frogTongue',
    displayName: "Frog's Tongue",
    description: '+25% Missile Speed, +20% Fire Rate.',
    textureKey: TextureKeys.ItemFrogTongue,
    pools: [ItemPool.Boss],
    effects: [
      { stat: 'missileSpeed', mult: 1.25 },
      { stat: 'fireRate', mult: 1.2 },
    ],
    missileTint: 0xff7aa0,
    floor: 'sapphire-swamp',
  },
  bloodboundChalice: {
    id: 'bloodboundChalice',
    displayName: 'Bloodbound Chalice',
    description: '+1 max HP, +20% Damage. Crimson missile.',
    textureKey: TextureKeys.ItemBloodboundChalice,
    pools: [ItemPool.Boss],
    effects: [{ stat: 'damage', mult: 1.2 }],
    missileTint: 0xc8284a,
    maxHealthBonus: 2,
    floor: 'onyx-mansion',
  },
  vampireSignet: {
    id: 'vampireSignet',
    displayName: "Vampire's Signet",
    description: '+25% Fire Rate, +15% Missile Speed.',
    textureKey: TextureKeys.ItemVampireSignet,
    pools: [ItemPool.Boss],
    effects: [
      { stat: 'fireRate', mult: 1.25 },
      { stat: 'missileSpeed', mult: 1.15 },
    ],
    missileTint: 0xffb060,
    floor: 'onyx-mansion',
  },
  obsidianHeart: {
    id: 'obsidianHeart',
    displayName: 'Obsidian Heart',
    description: '+1 Damage, +1 Max HP. Amethyst missile.',
    textureKey: TextureKeys.ItemObsidianHeart,
    pools: [ItemPool.Boss],
    effects: [{ stat: 'damage', add: 1 }],
    maxHealthBonus: 2,
    missileTint: 0x8a4ad8,
    floor: 'onyx-mansion',
  },
  // --- Missile-Modifier-Items (Phase 6) -------------------------------------
  magicShard: {
    id: 'magicShard',
    displayName: 'Magic Shard',
    description: 'Pierce up to 2 enemies (100% / 75% / 50%).',
    textureKey: TextureKeys.ItemMagicShard,
    pools: [ItemPool.Shop],
    effects: [{ stat: 'piercingCount', add: 2 }],
    shopPrice: 15,
  },
  wizardGlasses: {
    id: 'wizardGlasses',
    displayName: 'Wizard Glasses',
    description: 'Cast two parallel bolts. Each does 80% damage. +10% missile speed.',
    textureKey: TextureKeys.ItemWizardGlasses,
    pools: [ItemPool.Boss],
    effects: [
      // +1 multishot → 2 parallel bolts pro Cast. Damage pro Shot wird
      // automatisch in Player.fire... auf MULTISHOT_DAMAGE_MULT (0.75)
      // skaliert wenn count > 1 — beide Hits zusammen ergeben 1.5× DPS
      // auf Boss-Hitboxen, ein Hit auf Trash ist 0.75× (Sniper-Trade-off).
      // Replaces the old homing-turn-rate effect (2026-05-09): user-flag
      // "homing macht keinen spass, ich skippe das item eigentlich immer.
      // und beim neuen char funktioniert es auch nicht gut" (Spellblade-
      // Bolt rotiert visuell zu seiner Velocity, mit Homing kurvt der
      // Diamond-Sprite weird durch die Bahn). Homing-Mechanik bleibt im
      // Code — wenn ein zukünftiges Item homingTurnRate granted, läuft
      // sie weiter durch MagicMissile.tickHoming.
      { stat: 'multishotCount', add: 1 },
      // +10% Missile-Speed statt eines klassischen Range-Stats — gibt
      // effektiv mehr Reichweite in der fixen MISSILE_LIFETIME_MS, ohne
      // den Range-Stat wieder einzuführen (Phase-5-Polish-Entscheidung:
      // Range trivialisierte Bosse).
      { stat: 'missileSpeed', mult: 1.1 },
    ],
    /** No `floor` tag — drops on every floor's boss-pool roll. */
  },
  fireOrb: {
    id: 'fireOrb',
    displayName: 'Fire Orb',
    description: 'Hits ignite enemies for a brief burn.',
    textureKey: TextureKeys.ItemFireOrb,
    pools: [ItemPool.Treasure],
    effects: [{ stat: 'burnDamageFactor', add: 0.3 }],
    missileTint: 0xff7030,
  },
  // --- Active-Item — Blood of Marquis ---------------------------------------
  bloodOfMarquis: {
    id: 'bloodOfMarquis',
    displayName: 'Blood of Marquis',
    description: 'Max HP locked at 2 hearts. +30% all stats. [Q] sacrifices blood for an AOE.',
    textureKey: TextureKeys.ItemBloodOfMarquis,
    /** Active-slot HUD swaps to the empty-vial variant when HP < 2 (player
     *  just spent the active or can't afford it yet). Re-pickup of a heart
     *  refills HP → slot swaps back to the full vial. */
    activeEmptyTextureKey: TextureKeys.ItemBloodOfMarquisEmpty,
    /** Treasure-Pool floor-agnostic (2026-05-09 rework): vorher
     *  Boss-Pool + Onyx-locked → das ergab effektiv nur einen einzigen
     *  sinnvollen Use-Case (Marquis im aktuellen Run hat's gedroppt
     *  → spart's für den Prismarch auf), und um's überhaupt zu sehen
     *  musste man den Marquis zweimal across-runs schlagen. Treasure-
     *  Pool macht das Item zu einem mid-run pivot pickup: man entscheidet
     *  früh ob man auf den Glass-Cannon-Build commitet (max HP locked
     *  auf 2 = die nächsten Heart-Container etc. sind dead picks) und
     *  hat dafür mehrere Floors um den +30%-Power-Spike auszuspielen.
     *  metaUnlock bleibt — first-run pickups sehen's nicht, ab dem
     *  zweiten run pro-Marquis-Kill rollt's. */
    pools: [ItemPool.Treasure],
    effects: [
      { stat: 'damage', mult: 1.3 },
      { stat: 'fireRate', mult: 1.3 },
      { stat: 'moveSpeed', mult: 1.3 },
      { stat: 'missileSpeed', mult: 1.3 },
    ],
    missileTint: 0xc8284a,
    /** 4 HP = exactly two full hearts (HP_PER_HEART × 2). [Q] drops to 1 HP
     *  (= 1/2 heart), so a 2-heart cap leaves the player one full heart of
     *  buffer between uses — heals from a heart pickup (+2 HP) bring them
     *  back into the activate-able range without need to chain pickups. */
    maxHealthCap: 4,
    active: {
      kind: ActiveItemKind.EchoesOfBlood,
      bossDamageFraction: 0.3,
    },
    /** No `floor` tag — Treasure-Pool ist sowieso floor-agnostic, der
     *  Floor-Filter in `pickItemFromPool` greift nur für Boss-Pool. */
    /** Meta-locked behind a Marquis-of-Mirages defeat: only appears in the
     *  pool after the player has beaten Marquis at least once across all
     *  runs. First-run pickups sehen's nicht. Same gating pattern wie
     *  die Prismancy-Skins benutzen. */
    metaUnlock: 'boss-marquis-of-mirages',
  },
} as const satisfies Record<string, ItemDefinition>;

export type ItemId = keyof typeof ITEMS;

export function getItemsForPool(pool: ItemPool): readonly ItemDefinition[] {
  // The `as const satisfies` on ITEMS narrows each `pools` array to its
  // literal element types, which makes `Array.includes(pool: ItemPool)`
  // typecheck as `never`. Widen the array element back to `ItemPool` for
  // the lookup; the runtime data is untouched.
  return Object.values(ITEMS).filter((item) =>
    (item.pools as readonly ItemPool[]).includes(pool),
  );
}

/**
 * Pick an item from `pool`, optionally excluding ids the player already has
 * and optionally restricting to a specific floor. Floor filtering matches
 * items whose `floor` is unset (floor-agnostic) OR equals `currentFloor`,
 * and is currently meaningful only for the boss pool. Deterministic given
 * the same `rng` state. Returns null if no eligible item remains.
 */
export function pickItemFromPool(
  pool: ItemPool,
  rng: RNG,
  exclude?: ReadonlySet<ItemId>,
  currentFloor?: string,
): ItemDefinition | null {
  let eligible = getItemsForPool(pool).filter(
    (item) => !exclude?.has(item.id as ItemId),
  );
  if (currentFloor !== undefined) {
    eligible = eligible.filter(
      (item) => item.floor === undefined || item.floor === currentFloor,
    );
  }
  // Meta-progression gate — items with `metaUnlock` only roll once the
  // player has beaten the named boss at least once. Currently used by
  // Blood of Marquis (gated on `boss-marquis-of-mirages`).
  eligible = eligible.filter(
    (item) => item.metaUnlock === undefined || MetaProgress.hasBeatenBoss(item.metaUnlock),
  );
  if (eligible.length === 0) return null;
  return rng.pickWeighted(eligible, (item) => item.weight ?? 1);
}
