# Roguelike Game Project – "Prismancy"

## Overview

Ein 2D-Top-Down-Roguelike mit Terraria-inspiriertem Wizard-Theme. Der Spieler ist ein kleiner Zauberer mit Magic Wand, der durch prozedural generierte Dungeons zieht, Magic Missiles schießt, gegen Gegner kämpft, Items (Wands, Spellbooks, Potions) sammelt, die seine Stats und Zauber modifizieren, und bei jedem Run von vorn anfängt (Permadeath).

Die Struktur (Räume, Run-basiertes Gameplay, Item-Synergien, Floor-Progression) ist an *The Binding of Isaac* angelehnt. Look & Feel orientieren sich an *Terraria*.

**Ziel dieses Dokuments:** Claude Code als Single Source of Truth für Stack, Architektur, Konventionen und Roadmap dienen. Bei jeder Session sollte Claude Code dieses File konsultieren, bevor es Änderungen vornimmt.

---

## Tech Stack

- **Engine/Framework:** [Phaser 3](https://phaser.io/) (aktuelle Version 3.x)
- **Sprache:** TypeScript (strict mode)
- **Build-Tool:** Vite
- **Package Manager:** pnpm (oder npm/yarn – nach Wahl)
- **Asset-Format:** PNG für Sprites, Aseprite-Export bevorzugt; JSON für Tilemaps (Tiled Editor)
- **Audio:** OGG/MP3, geladen via Phaser Audio
- **Testing:** Vitest für Unit-Tests von Spiellogik (Damage-Berechnung, RNG, Item-Effekte)
- **Linting/Formatting:** ESLint + Prettier

### Warum dieser Stack?
Phaser 3 ist das ausgereifteste 2D-Game-Framework für Web. TypeScript fängt Bugs in komplexen Systemen wie Item-Synergien früh ab. Vite gibt extrem schnelles HMR, was beim Game-Dev Gold wert ist.

---

## Projektstruktur

```
src/
├── main.ts                    # Phaser Game-Konfig & Entry Point
├── config/
│   ├── GameConfig.ts          # Globale Konstanten (Tile-Size, Speed, etc.)
│   └── DepthLayers.ts         # Z-Order-Konstanten
├── scenes/
│   ├── BootScene.ts           # Asset-Preload-Init
│   ├── PreloadScene.ts        # Lädt alle Assets mit Progress-Bar
│   ├── MainMenuScene.ts       # Startmenü
│   ├── GameScene.ts           # Haupt-Gameplay-Scene
│   ├── UIScene.ts             # HUD (überlagert GameScene)
│   └── GameOverScene.ts
├── entities/
│   ├── Player.ts
│   ├── enemies/
│   │   ├── BaseEnemy.ts
│   │   ├── Fly.ts
│   │   ├── Spider.ts
│   │   └── ...
│   ├── projectiles/
│   │   ├── MagicMissile.ts    # Spieler-Zauber (Magic-Wand-Projektil)
│   │   ├── MagicMissilePool.ts # Object-Pool für Magic Missiles
│   │   └── EnemyProjectile.ts
│   └── pickups/
│       ├── Heart.ts
│       ├── Coin.ts
│       └── Item.ts
├── dungeon/
│   ├── DungeonGenerator.ts    # Floor-Layout-Generation (random walk, boss tagging)
│   ├── Room.ts                # Raumtypen & -Logik (walls/doors/decoration scatter)
│   ├── Door.ts                # Door-Klasse (barrier + trigger zone, open/close, boss kind)
│   └── RoomTemplates.ts       # Vordefinierte Raum-Layouts (kommt in Phase 3 Polish)
├── systems/
│   ├── CombatSystem.ts        # Damage, Knockback, I-Frames
│   ├── ItemSystem.ts          # Aktive/passive Item-Effekte
│   ├── StatsSystem.ts         # Spieler-Stats & Modifikatoren
│   ├── DropSystem.ts          # Loot-Tables
│   └── InputManager.ts
├── data/
│   ├── floors.ts              # FloorTheme-Definitionen (Emerald Forest, Sapphire Swamp, Onyx Mansion ...)
│   ├── items.ts               # Item-Definitionen
│   ├── enemies.ts             # Enemy-Stats (mit `floor`-Tag pro Gegner)
│   └── rooms.ts               # Raum-Templates
├── ui/
│   ├── HUD.ts
│   ├── HealthDisplay.ts
│   └── Minimap.ts
├── utils/
│   ├── RNG.ts                 # Seeded Random für reproduzierbare Runs
│   ├── Math.ts
│   └── EventBus.ts            # Globaler Event-Emitter
└── types/
    └── index.ts               # Shared TypeScript-Types
```

### Architektur-Prinzipien

1. **Composition over Inheritance:** Nutze Komponenten/Systems statt tiefer Vererbungsbäume.
2. **Event-Driven:** EventBus für Cross-Cutting-Concerns (z. B. "PlayerTookDamage" → UI updated, Sound spielt).
3. **Daten-getriebenes Design:** Items, Gegner, Räume in `data/`-Files, nicht hardcoded in Klassen.
4. **Seeded RNG:** Alle Zufallsentscheidungen über `utils/RNG.ts`, damit Runs reproduzierbar/debugbar sind.
5. **Scene-Trennung:** UIScene läuft parallel zu GameScene – HUD darf nie pausieren, wenn das Spiel pausiert.

---

## Coding-Konventionen

- **TypeScript strict mode an** (`"strict": true` in tsconfig).
- **Keine `any`** – im Zweifel `unknown` und narrowing.
- **Klassennamen:** PascalCase. **Files:** PascalCase für Klassen, camelCase für Utils.
- **Konstanten:** SCREAMING_SNAKE_CASE in Config-Files.
- **Phaser-Spezifika:**
  - Sprites werden über Klassen gewrappt, nie direkt aus Scenes manipuliert.
  - `update()`-Methoden bleiben schlank – Logik in Systems delegieren.
  - Texture-Keys als Konstanten, nicht als Magic Strings.
- **Kein globaler State außer EventBus + StatsSystem.** Scene-Daten via `scene.registry` oder Scene-Init-Daten.

---

## Roadmap

### Phase 1 – Foundation & Movement (ca. 1 Woche)

**Ziel:** Spielbarer Charakter in einem leeren Raum.

- [x] Vite + Phaser 3 + TypeScript Setup (Yarn Classic 1.22 — `yarn dev`, `yarn build`, `yarn test`, `yarn typecheck`)
- [x] Projekt-Ordnerstruktur anlegen
- [x] BootScene → PreloadScene → MainMenu → GameScene-Flow (UIScene parallel, GameOverScene vorbereitet)
- [x] Asset-Pipeline definieren (Placeholder-Sprites werden in `PreloadScene` programmatisch via `Graphics.generateTexture` erzeugt)
- [x] `Player`-Klasse mit 4-Wege-Bewegung (WASD), Diagonal-Bewegung normalisiert
- [x] Zaubern in 4 Richtungen (Pfeiltasten, twin-stick-style) mit Fire-Rate-Cooldown
- [x] `MagicMissile`-Projektil mit Lebensdauer + Bewegung (Object-Pool, `MagicMissilePool`)
- [x] Statischer Raum mit Wänden (Collision via Arcade Static Group)
- [x] Kamera folgt Spieler (mit Bounds = Raumgröße)

**Definition of Done:** Man kann sich bewegen und Magic Missiles zaubern. Kollision mit Wänden funktioniert.

---

### Phase 2 – Combat & Enemies (ca. 1–2 Wochen)

**Ziel:** Erste Gegner und Kampfsystem.

- [x] `BaseEnemy`-Klasse mit HP, Damage, Movement-Pattern (abstract `tickAI`-Hook)
- [x] `CombatSystem`: Knockback-Vektor-Berechnung; I-Frames in `PlayerHealth`
- [x] EventBus implementiert (typed via `GameEvents`-Map)
- [x] Erste forest-themed Gegnertypen (datengetriebener Roster pro Floor in `data/floors.ts`):
  - [x] **Forest Sprite**: fliegt direkt auf Spieler zu (Fly-Äquivalent)
  - [x] **Mossy Slime**: hüpft in zufällige Richtungen Richtung Spieler (Spider-Äquivalent)
  - [x] **Vine Sprout**: festgewachsen, schießt Dornen in cardinal direction (Shooter-Äquivalent)
  - [x] **Pixie Dancer**: orbited den Spieler statt direkt anzufliegen (glass-cannon Bonus-Typ)
- [x] Enemy-Projektile: `EnemyProjectile` + `EnemyProjectilePool` mit Wall/Rock/Door-Collisions und Player-Damage-Overlap
- [x] Spieler-HP-System (rote Herzen, halbe Herzen, `HealthDisplay` HUD)
- [x] Game Over bei 0 HP → GameOverScene (mit kurzer Death-Pause)
- [x] Hit-Feedback: Tint-Flash, Knockback (Spieler + Enemy), Screen-Shake. Sounds kommen in Phase 6.

**DoD:** Man kann in einem Raum gegen Gegner kämpfen, sie töten oder selbst sterben.

---

### Phase 3 – Rooms & Dungeon Generation (ca. 2 Wochen)

**Ziel:** Mehrere verbundene Räume, prozedural generiert.

- [x] `Room`-Klasse mit Raumtypen (Start, Normal, Boss). Treasure/Shop/Secret kommen in Phase 4
- [x] Türen-System (`Door`-Klasse mit barrier + trigger zone, öffnet bei Room-Clear)
- [x] Raum-zu-Raum-Übergang (Fade-out → Teardown → Build → Fade-in, ~240 ms)
- [x] `DungeonGenerator`:
  - 5×5 Grid, ~8 Räume per Default
  - Random-Walk-Algorithmus, deterministisch via Seed
  - Boss-Raum am weitesten Manhattan-Distanz vom Start; Boss-Door auf beiden Seiten markiert
- [x] Minimap in UIScene (zeigt besuchte Räume + current + cleared + Boss-Marker)
- [ ] Raum-Templates aus `data/rooms.ts` (verschiedene Layouts, hard-coded Gegner-Patterns) — momentan ist jedes Zimmer dieselbe Box mit zufällig gestreuten Decos
- [ ] Treppe/Trap-Door zum nächsten Floor — kommt mit Phase 5

**DoD:** Man kann ein komplettes Stockwerk durchspielen, Räume clearen und zum nächsten Floor wechseln.

---

### Phase 4 – Items & Stats — DONE

**Ziel:** Items, die Spieler-Stats und Schüsse modifizieren – das Herzstück eines Roguelikes.

- [x] `StatsSystem`: damage, fireRate, missileSpeed, moveSpeed, missileScale (additive + multiplicative modifiers, latest-wins missileTint). **`range` Stat wurde entfernt** (Phase 5 Polish) — trivialisierte Bosse (alle auf base-range balanced); Player-Missile-Lifetime ist jetzt fix `MISSILE_LIFETIME_MS`.
- [x] `ItemSystem` (passive only — active items absichtlich out of scope, kein User-Bedarf)
- [x] Treasure-Räume mit Item-Pedestals (auto-spawn, deterministisch via Seed, `desc.looted` verhindert Doppel-Spawn). **Treasure + Shop spawnen primär an Dead-End-Leaf-Räumen** (door-degree 1, nie adjacent zum Boss-Room). Der Fallback der einen 2-door Pass-Through-Raum als Special tagged wurde entfernt weil er auf locked floors das Boss-Room hinter einem Treasure-Schlüssel-Lock einsperren konnte. `MAX_RETRY_ROOMS = 16` damit der Generator genug Headroom hat um Leaves zu erzeugen. **Smart-Retry-Leaf-Bias (2026-05-07):** Pure-random `tryPlaceOne` produzierte ~3 % Seeds ohne Shop oder Treasure (User-Bug: "auf der letzten Ebene kein Shop und kein Item-Room"). Retry biased jetzt zu `tryPlaceLeaf` — Cells mit exakt 1 placed-Neighbor, präferiert nicht-boss-adjacent + nicht-boss-re-electing. **Non-leaf safety net** für die ~0.04 % Restfälle: `findSafeNonLeafs` picked non-leaf, non-boss-adjacent Räume die **keine articulation points** sind (BFS-without-them findet boss → start), so dass Locking ihrer Türen den Boss-Pfad nicht blockiert. Regression-Tests in `DungeonGenerator.test.ts`: dead-end-Invariante über 50 Seeds, special-coverage über 1000 Seeds, boss-reachability-without-specials über 200 Seeds.
- [x] Item-Pickup-Animation: Toast unten-mittig (Name gold + Description), 7 Start-Items
- [x] Items: `Magic Tome`, `Hot Tea`, `Wizard's Sneakers`, `Telescopic Wand` (**+1 dmg, +15% missileSpeed** — Post-Floor-Scaling-Pass-Tuning: war +20% fireRate, jetzt dmg weil Treasure/Shop-Pool zu fire-rate-lastig war), `Lead Cap`, `Magic Potion` (**+0.5 dmg, +10 moveSpeed** — Post-Floor-Scaling-Pass-Tuning: war +0.1 fireRate, jetzt dmg; **renamed 2026-05-08** von "Caffeine Pill" + Sprite redesign zu rundem Glasflakon mit arcane-blue Liquid + Cork + Halo, weil Caffeine Pill nicht zum Wizard-Setting passte. ID + Texture-Key + alle Refs gerenamed; Effekte unverändert), `Pixie Dust` (+1 max HP, +60 missileSpeed, magenta — **refactored mit Floor-Scaling-Pass: war +0.5 dmg, jetzt HP-Up**), `Spyglass` (+1 max HP, +10% missileSpeed — **refactored mit Floor-Scaling-Pass: war +1 dmg, jetzt HP-Up**) + Emerald-Boss-Pool (`Crown of the Vine`, `Ancient Heart`, `Withered Fang`) + Sapphire-Boss-Pool (`Lily Diadem`, `Mire Pearl`, `Frog's Tongue`) + `Heart Container` (HP-Up). Items modifizieren auch Missile-Visuals (`missileScale`, `missileTint`). Boss-Pool-Items haben `floor`-Tag und werden via `pickItemFromPool(..., currentFloor)` floor-spezifisch gepickt.
- [~] Missile-Modifikatoren (Homing, Piercing, Splitting, Elemental) als Missile-Flags — bewusst auf Phase 6 verschoben (User-Wunsch: "wäre super cool tatsächlich")
- [x] Pickups: Hearts, Coins, Keys, Items, Gems (Bombs out of scope — kein nicht-offensiver Use-Case sinnvoll)
- [x] **Crates** (brown + gold) als Room-Drops mit deterministischen Inhalten + Spawn-Protection 700ms damit der Spieler den Loot sieht
- [x] Shop-Logik: 4 Slots (Heart 3 Coins, Key 5 Coins, 2 Items 8-15 Coins), partial-buy via `RoomDescriptor.purchasedShopSlots`, Reject-Wackel bei zu wenig Coins
- [x] **Map-Mode-Overhaul**: TAB öffnet großen Map-View links + Items+Gems-Liste rechts; kleine Minimap blendet aus; Drop-Indikatoren auf Cells für Räume mit übrigen Pickups
- [x] **Türen-Lock** ab Floor 2 (Treasure + Shop), Schlüssel werden verbraucht
- [x] **HP-Up-Mechanik**: `ItemDefinition.maxHealthBonus` erhöht max HP + heilt um diesen Wert; HUD wächst dynamisch

**DoD:** Erfüllt — Items + Shop + Drops + HP-Ups funktionieren, Missile reagiert sichtbar auf Items.

---

### Phase 5 – Bosse & Floor-Progression (in progress)

**Ziel:** Bossfights und mehrere Stockwerke. Aufgeteilt in 4 Chunks.

**Chunk 1 — Boss-Foundation + Vine Lord (DONE)**
- [x] `BossEnemy`-Basisklasse mit Phasen-System (HP-Threshold-Trigger, `onPhaseChanged(phase)` Hook, override `die` emittet `boss:killed`)
- [x] Boss-HP-Leiste oben mittig
- [x] Boss-Room-Logik: Türen schließen beim Betreten, öffnen bei Kill
- [x] No-Hit-Tracking (Field `bossNoHitInProgress`, reset on `player:tookDamage` während Boss-Room)
- [x] Boss-Reward bei Kill: garantiertes Item aus `ItemPool.Boss`, 2 Hearts, **Gem** (Floor-eigener Edelstein) wenn no-hit. Alle mit Spawn-Protection.
- [x] Vine Lord (HP=60, Phase 1: 3-Thorn-Fächer, Phase 2: 8-Thorn-Welle + Vine-Sprout-Adds)

**Chunk 2 — 3 weitere Bosse (DONE)**
- [x] Mossy Behemoth (HP=60, hüpft, Phase 2: schnellere Hops + Slime-Adds, **spaltet sich beim Tod in 2-3 Slimes**)
- [x] Pixie Queen (HP=50, **teleportiert zwischen Bäumen** mit Sparkle-Wolke, 4-Thorn-Plus → Phase 2: 6-Thorn-Stern + Pixie-Adds)
- [x] Forest Heart (HP=70, stationär, pulsiert, 6-Thorn-Radial-Welle → Phase 2: häufiger + Forest-Sprite-Adds)
- [x] Random-Pick aus 4 Bossen pro Run via `pickBossForFloor` mit Seed `${dungeonSeed}-boss`
- [x] Boss-Roster `data/bosses.ts` data-driven

**Chunk 3 — Floor-Progression (mostly DONE)**
- [x] Sapphire Swamp als Floor 2: neue `FloorTheme` (Sapphire-Palette, eigener Enemy-Roster, Boss-Roster), 4 eigene Bosse
- [x] Sapphire Mobs (4): **Bog Frog** (idle-fire-hop tongue burst), **Snapper Bloom** (rooted, 3-thorn fan + telegraph), **Damselfly** (orbital strafe + dash-burst, V spread ±14°, projectile 280 px/s, burst-interval 2200ms mit 0-1000ms per-instance jitter damit mehrere Damselflies im Raum desyncen), **Bog Tortoise** (slow walk, shell-pop radial, invuln in shell)
- [x] Sapphire Bosse (4, random pick): **Toad Sovereign** (HP 70, idle-tongue-hop → Phase 2: 3-Hop-Combo + 5-Thorn radial je Landung. **Bog-Frog-Adds entfernt 2026-05-07** — User-flagged "unfair", Combo-Thorn-Density alleine ist ausreichend Threat), **Bloomheart** (HP 60, rooted 5-thorn fan → Phase 2: schneller + delayed-burst spore. **Keine Adds mehr** — Snapper-Bloom-Adds wurden mit dem Floor-HP-Scaling-Pass entfernt, weil die Mob-HP-Multiplikatoren die Adds zu zäh gemacht haben während der Spieler Fan + Spore dodgen muss; visual scale wurde gleichzeitig 2.4× → 1.8× weil die Texture 56×64 ist und damit deutlich größer als alle anderen 2.4×-Bosse wirkte), **Damselfly Empress** (HP 50, dash mit perpendicular trail → Phase 2: snappier rhythm — telegraph 260 / recovery 480 / trail 130 ms — plus 5-thorn landing radial wenn dash endet; **keine Adds** — Phase 2 ist rein deterministisch dodgbar), **Bog Colossus** (HP 75, **Phase 1 Gungeon-style dual radial**: 10-thorn radial + 350ms-versetzte zweite Welle 18° offset @ 70 % speed + 1400ms walk-snipe; **Phase 2 Mandala**: 6 outer thorns @ radius 96 spinnen 160°/s + 4 inner thorns @ radius 56 counter-rotating bei 220°/s + 600ms aimed-fire während Orbit-Window + 950ms walk-snipe; cycle 2700 ms)
- [x] Treppe/Trap-Door spawnt nach Boss-Kill (mit `hasNextFloor()`-Gate), walk-on transitiert zu Floor 2 mit Fade. Re-Entry des cleared Boss-Rooms respawnt Treppe.
- [x] **Run-Carry-Over:** Items (über `pickedItemIds`-Replay), HP/MaxHP, Coins, Keys, Gems werden über Floor-Wechsel persistiert. `RunCarryOver` Snapshot in `GameSceneInitData.carryOver`. Hydrate-Methoden auf `Inventory` / `ItemSystem` / `PlayerHealth` (event-stumm, kein Toast-Spam). **HUD-Sync-Fix (2026-05-07):** GameScene legt nach Player-Konstruktion + Carry-Over-Hydrate die `playerHealth`-Instanz in die Registry. UIScene liest sie in `create()` und passt das aktuelle current/max in den HealthDisplay-Konstruktor — sonst lief HealthDisplay's Subscription auf `player:healthChanged` zu spät an (Game.create + Hydrate emit feuern, **dann** erst Launch UI), und der HUD zeigte nach Floor-Transition base hearts bis zum nächsten Damage-Event.
- [x] **Floor-themed Boss-Pool-Items:** `ItemDefinition.floor` Tag + `pickItemFromPool(pool, rng, exclude, currentFloor)` filtert Boss-Items nach Floor. Emerald-Pool (Crown of the Vine, Ancient Heart, Withered Fang) droppt nicht mehr auf Sapphire. Sapphire-Pool: **Lily Diadem** (+1 maxHP, +15% fireRate), **Mire Pearl** (+1 dmg, +20% missileSpeed — vorher +50% range, gewechselt mit dem range-Cleanup), **Frog's Tongue** (+25% missile speed, +20% fireRate).
- [x] Floor-Theme-Switch: Camera-Background (`theme.palette.ambient`), Wall-/Floor-Textures, Decorations alle per-floor in PreloadScene. Sapphire-Decos: **Lily Pad** (statt Tree, mit Bloom + Saphir-Wassertropfen) + **Mangroven-Wurzel** (statt Rock, verschlungene Wurzelbänder mit Saphir-Glow-Knoten + Algen-Strängen) via neuem `FloorTheme.decorationStyle: 'forest' | 'swamp'` Diskriminator.
- [ ] HP/Damage-Skalierung pro Floor — *noch nicht relevant*: neue Sapphire-Mobs/Bosse haben passende Werte direkt eingebacken. Wird interessant sobald Floor-1-Mobs auf Floor 3+ wiederkehren.

**Chunk 4 — Onyx Mansion + Secret Endboss (DONE — End-Screens + Win-Flow live)**

*Foundation* (DONE):
- [x] `onyx-mansion` als `FloorTheme` in `data/floors.ts` mit eigener Palette (deep purple-black + gold/amethyst-glow accents)
- [x] `decorationStyle: 'mansion'` als dritter Diskriminator (forest / swamp / **mansion**)
- [x] Mansion wall texture (`drawMansionWallTexture`) — gothic stone-brick courses mit gold molding strip + candle sconce + amethyst-crack accent
- [x] Mansion-Decos: **Candelabrum** (statt Tree, gold-trim iron stand mit 3 lit candles + amber halo) + **Cracked Vase** (statt Rock, purple ceramic mit gold rim + visible crack mit amethyst glow leaking)
- [x] Boss/Treasure/Shop/Normal door textures funktionieren palette-driven für mansion (kein eigenes branching nötig)
- [x] **Gem-Texturen redesign** (alle 3 Floors): 18×18 Canvas (statt 14×14), per-Floor cut variant — Emerald = emerald-cut step, Sapphire = round brilliant, Onyx = marquise. Palette-driven 5-tone shading + per-floor halo color in `GemPickup` (statt vorher hardcoded grün)
- [x] **`onyx-mansion` in `FLOOR_ORDER`** — Sapphire-Boss-Kill spawnt jetzt natürliche Stairs nach Onyx. `DEV_FLOOR_ORDER` ist jetzt identisch mit `FLOOR_ORDER` (bleibt als separate Konstante für künftige half-built floors).

*Mansion-Mob-Roster (DONE, post-playtest activity bump):*
- [x] **Wraith** — Phasing-Chaser. Beelines auf Player, alle ~2.5s wechselt in Intangible-Phase (~1.5s, alpha 0.28, `body.checkCollision.none = true` → Player + Missiles passen durch, kein Contact-Damage). `takeDamage` no-ops während intangible. **HP 5** (war 2 — bei endgame damage one-shot, jetzt müssen Hits across Phasing-Cycles getimed werden), speed 100. Threat: Timing.
- [x] **Possessed Candelabra** — Slow Tank-Walker mit dual threat layer: (a) droppt alle **2.0s** eine WaxPuddle hinter sich (`WaxPuddleGroup` pool, 16 instances; puddle 3s lifetime, 12px hitbox, 1 HP damage, fade-out in den letzten 600ms) **+** (b) feuert alle **2.5s** einen 3-projektil **Flame-Cone** (`FlameMissile` orange ember texture, ±15° spread) toward player. Initial-Delay 1.4s + 0-600ms jitter so eine Welle nicht synchron feuert. **HP 9** (war 5), speed 55. Threat: Positional Control + Ranged Pressure.
- [x] **Cursed Mirror** — Rooted Homing Shooter (war: Predictive). State-Machine: idle → telegraph (**450ms**, alpha-flash) → fire (`MansionMissile` amethyst-purple texture, mit Homing) → cooldown **1100ms** (war 1500ms). Schießt auf aktuelle Player-Position und enabled Homing am Projektil (`MIRROR_HOMING_TURN_RATE_DEG = 110°/s`, `MIRROR_PROJECTILE_LIFETIME_MS = 2200ms`). Sharp 90°-Cuts dodgen, geradeaus laufen wird bestraft. **HP 7** (war 3). **`minPerRoom: 1`** — garantiert mindestens 1 Mirror pro Mansion-Room (sonst zu selten via weighted roll).
- [x] Onyx-Roster gewichtet: wraith ×4, candelabra ×2, mirror ×2 (mirror force-spawn 1) — Wraith dominiert numerisch wie Forest Sprite auf Emerald
- [x] **EnemyProjectilePool.fire** akzeptiert optional `textureKey` für andere bullets als Default-Thorn (used by Mirror = MansionMissile, Candelabra = FlameMissile, Marquis/Onyx = BloodProjectile/MansionMissile)
- [x] **EnemyProjectile.setHoming(target, turnRateRadPerSec)** — generisches Homing-Capability. Frame-by-frame rotation der Velocity Richtung Target, capped auf turn rate. Reset bei jedem `fire()` damit recycled Pool-Sprites nicht weiterhomen. Used by Cursed Mirror + Lord Onyx.
- [x] **WaxPuddle / WaxPuddleGroup + BloodTrail / BloodTrailGroup** in `src/entities/hazards/` — separate hazard layers, deaktiviert beim room-tear-down. Player↔hazard overlap room-scoped.
- [x] **Per-Roster `minPerRoom?: number`** in `EnemyRosterEntry` — force-spawnt N instances vor weighted-fill. Used für Mirror auf Mansion. Counts gegen `enemySpawnCount` (3-5 total bleibt).
- [x] **Per-Roster `maxPerRoom?: number`** in `EnemyRosterEntry` — caps wie oft ein Enemy-Type pro Raum spawnen darf. Weighted-Pick-Loop filtert kapazitätsausgeschöpfte Entries vor jedem Pick (`spawnedById`-Map trackt counts); wenn alles gecapped ist, bricht der Loop early ab (lieber weniger Enemies als Cap-Bruch). Aktuell gesetzt: **Snapper Bloom maxPerRoom: 2** auf Sapphire (drei rooted 3-Thorn-Fächer überlappten zu undodgeable Bullet-Patterns bei Endgame-Fire-Rates — User-Playtest-Feedback).

*Marquis of Mirages (DONE — Standard-Boss auf Onyx, replaces Vampire Twins):*

Vorgängerdesign **Vampire Twins** (Crimson Lord melee + Sapphire Marquis mage, dual-body via VampireFight coordinator) wurde komplett rausgebaut und durch einen **Single-Body-Boss** ersetzt — User-Feedback: der Doppelboss funktionierte nicht überzeugend. CrimsonLord/SapphireMarquis/VampireFight/VampireBody/BloodTrail-Files alle gelöscht; ENEMIES-Eintrag `boss-vampire-twins` durch `boss-marquis-of-mirages` ersetzt; `activeBoss` Field-Type wieder auf `BossEnemy | null` zurück (kein Coordinator mehr).

- [x] **Marquis of Mirages** (`MarquisOfMirages.ts`, extends `BossEnemy` direkt — keine VampireBody-Schicht mehr). HP **75** (combined Twins waren 70, leicht hoch wegen verlorener Dual-Target-Decision). DPS-scaling greift weiter via BossEnemy-Constructor.
- [x] **Phase 1** (>30 % HP): kited bei **180 px** vom Player @ 60 px/s. **5-thorn Fan** (60° spread) alle 1800ms + **Teleport** alle 4000ms (min 180 px Player-Distanz, fade 220ms — gleiche Patterns wie Sapphire-Marquis V1) + neue **Mirror-Special** (siehe unten).
- [x] **Phase 2** (≤30 % HP, "berserker"): stationär, 8-arm rotating spinning stream mit 1 arm skipped → 90° Dodge-Gap rotiert mit. Spin 80°/s, fire 170ms. Re-uses `SAPPHIRE_MARQUIS_BERSERKER_*` constants direkt (gleicher Pattern, kein Rename damit Cleanup-Pass-Surface klein bleibt). Patterns + Mirror-Special pausiert.
- [x] **Mirror-Special** (Phase 1 only):
  - Trigger: erste Special **10s** nach Spawn, danach random **8–12s** Window (User-Wunsch: nicht streng time-based, leicht random, nicht nervig).
  - State machine: `idle → summoning (380ms) → entering (460ms) → traveling (200ms) → exiting (360ms) → firing (3 × 320ms gaps) → recovering (700ms) → idle`.
  - 2 Portale spawnen — **Entry** perpendicular zum Boss vom Player weg (88 px Offset), **Exit** in der gegenüberliegenden Raum-Ecke vom Spieler aus.
  - Boss tweens IN das Entry-Portal (alpha 1→0 + scale shrink), invisible-window 200ms, snap zum Exit-Portal, fade-in.
  - **3 Homing-Missiles** (`MansionMissile`-Texture, Cursed-Mirror-Style mit `MARQUIS_OF_MIRAGES_HOMING_TURN_RATE_DEG = 110°/s`, lifetime 2200ms) sequentiell aus dem Exit-Portal nach 320ms Spacing. Tagged in `linkedProjectiles` Array.
  - **Counter-Strategy:** Player kann das **Entry-Portal zerstören** (3 HP, MIRROR_PORTAL_HP) während des Specials. Bei Destruction: alle linked Homing-Missiles werden via `deactivate()` instant entfernt (`handleEntryDestroyed`-Callback).
  - Entry-Portal lingert nach Firing-Ende `MARQUIS_OF_MIRAGES_ENTRY_LINGER_MS = 2500ms` damit Player Zeit hat zum reagieren. Exit despawnt nach 700ms.
  - Boss ist während des gesamten Specials gefroren (kein Velocity, base patterns paused).
- [x] **Phase-Transition Cancel**: Wenn Boss während eines Specials in Phase 2 (Berserker) übergeht, `cancelSpecialOnPhaseChange` deaktiviert linked Projectiles + despawnt beide Portale + cancel Pending-Despawn-Timer. Berserker-Pattern startet sauber.
- [x] **MirrorPortal-Klasse** (`src/entities/MirrorPortal.ts`, extends `Phaser.Physics.Arcade.Sprite`): zwei Modes via `isEntry: boolean`. **Entry**: cyan rune-glow + sapphire glass + outer halo + 4 cardinal rune-marks + scale-pulse-Tween. HP 3, destruktibel. **Exit**: dim trim + dark glass + keine rune-glow + keine pulse — passive Spawn-Anchor, exit's `takeDamage` short-circuits. Beide Variants: materialize-in mit `Back.Out` scale+alpha tween, despawn-out via `Sine.In` scale-down. Hitbox compensation für `WORLD_SPRITE_SCALE` analog zu BaseEnemy.
- [x] **GameScene-Wiring**: neue `mirrorPortals: Phaser.Physics.Arcade.Group` (separate von `enemies` damit Portale nicht in `checkRoomClearedSoon.countActive` zählen). Zwei neue Collider: `missileMirrorPortalOverlap` (Player-Missile damages Entry-Portal) + `playerMirrorPortalCollider` (solid block für Spieler — positional choice beim Zerstören). Boss-Host hat `addMirrorPortal(portal)` Method. Group-cleanup in `tearDownActiveRoom` via `mirrorPortals.clear(true, true)`.
- [x] **Texture** (`drawBossMarquisOfMiragesTexture` in PreloadScene, 44×46 px): Variant A "Caped Conjurer" aus dem StyleMockupScene Page 6 mockup. Asymmetrische Cape-Silhouette billowing nach links + slim body mit slight right-lean + casting pose mit raised oval Hand-Mirror direkt in der Hand gehalten (User-Iteration: oval statt rund + direkt-gehalten statt floating). Bricht die alte chess-piece-Bell-Silhouette der Twins-Marquis V2 komplett.
- [x] **Mockup-Page 6**: retitled zu "MARQUIS OF MIRAGES — DESIGN HISTORY", Slot 1 jetzt "OLD V2 (SAPPHIRE MARQUIS)" mit `BossSapphireMarquis`-Texture als Reference, Slot 2 "A — CAPED CONJURER (LIVE)". Restliche Variants (B/C/D) als nicht-implementierte Alternativen erhalten.
- [x] **Dead-code preserved**: `BossCrimsonLord` + `BossSapphireMarquis` Texture-Funktionen + Texture-Keys bleiben für die Mockup-History-Page erhalten (call-sites markiert mit Cleanup-Comment). `BloodTrail`-Texture komplett gelöscht (kein Consumer mehr da CrimsonLord-Dash-Trail weg ist). `SAPPHIRE_MARQUIS_BERSERKER_*` constants bleiben — werden vom neuen Boss noch genutzt.

*No-Hit-Tracking (FIXED):*
- [x] `playerTookDamageHandler` gated jetzt auf **`activeBoss !== null`** (war: `desc.kind === RoomKind.Boss`). Beim `__wiz.spawnBoss` außerhalb echter Boss-Rooms wurde der Damage nicht getrackt → Gem fälschlich gedroppt. Jetzt wahrer Predikat.
- [x] **`bossDamageCount`** field als sanity-check parallel zum boolean flag. Gem-Award braucht `flag === true && damageCount === 0`. Dev-Console-Log am Boss-Kill: `flag=… damageCount=… → noHit=…, hasGem=…`.

*Gem-Siegel (DONE):*
- [x] **`GemSeal`** in `src/entities/GemSeal.ts` — gothic Stone-Altar mit gold Trim + 3 Sockets (one per floor in `REQUIRED_GEM_FLOORS = ['emerald-forest', 'sapphire-swamp', 'onyx-mansion']`). **Sockets starten IMMER empty** (dim + tinted) — die Gems werden live über die `[E]`-Interaktion platziert, nie pre-filled selbst wenn der Spieler mit gefüllter Inventory ankommt. Filled Socket = full color + pulsing halo (per-floor glow color from FLOORS palette). Trigger-Zone größer als Frame damit Player nicht pixel-perfect tappen muss.
- [x] **Spawn**: nach Marquis-of-Mirages-Kill auf Onyx, am bottom-center des Boss-Rooms (center.y + 3 tiles). Stairs spawnen oben (no-gems Exit). Re-entry path respawnt beide.
- [x] **`[E]` Interact-Prompt** (kein Auto-Trigger mehr): Floating "[E] PLACE GEMS" Label über dem Seal blendet via Alpha-Tween ein/aus während der Spieler im Trigger-Zone ist. `GemSeal.setInRange(bool)` wird jeden Frame aus `GameScene.tickGemSealInteract` mit dem Ergebnis von `physics.overlap(player, seal.trigger)` gefüttert. `interactKey = E` wird in `GameScene.create` registered + per `JustDown` poll'd. Kein `gemSealOverlap`-Collider mehr.
- [x] **Two-Set State Split**: `availableGems: Set<string>` (was der Spieler in der Inventory hat und potentiell platzieren könnte — Snapshot aus dem Constructor + live Sync via `markGemAvailable`) vs. `placedGems: Set<string>` (was tatsächlich in den Sockets steckt). Activation gates auf `placedGems.size === 3`, nicht auf availability. `consumeGemForPhase` (Prism-Special) liest + mutiert `placedGems`.
- [x] **Activation Flow** (`tryInteract(playerX, playerY)`):
  - Place jede `availableGems - placedGems`-Differenz mit 220ms Stagger via `animateGemToSocket` — Gem fliegt vom Player-Position via 520ms quadratischer Bezier-Kurve in den Socket, scale shrinkt 1.6 → 1.1 für "settles in"-Feel, beim Land Plate clearTint + setAlpha(1) + makeFilledHalo() + 240ms Back.Out scale-pulse.
  - **Partial Placement ist erlaubt**: 1 oder 2 Gems platzieren funktioniert auf der Stelle, der Spieler sieht die Sockets live füllen. Erst wenn `placedGems.size === 3` nach dem Batch chained sich die Activation-Cinematic (Sockets E→S→O 180ms-Pulse + lila Burst + Camera-Flash + Shake) + emit `seal:activated`. Sonst bleibt das Seal stehen mit gefüllten + leeren Sockets bis der Spieler mehr Gems earned + zurückkommt.
  - **"Slay thy fiends unscathed"-Hint** (italic, dim amethyst `#c898d8`) wenn `placeAllGems` 0 neue Placements zurückgibt — also entweder availability = 0 oder alles bereits placed und Spieler hat noch keine neuen Gems. 1500ms Cooldown gegen Mash-Spam, emit `seal:hintShown`.
- [x] **`gem:pickedUp` → `markGemAvailable`** (kein Auto-Fly mehr): `GemPickup.onCollect` emittet `gem:pickedUp { floorId, x, y }` vor `inventory.addGem`. GameScene-Listener spielt SFX + ruft `seal?.markGemAvailable(floorId)` auf — pure bookkeeping, keine Animation. Spieler muss danach manuell zum Seal laufen + `[E]` drücken.
- [x] **No-Gems-Exit**: `spawnStairsInCurrentRoom(onOverlap)` parametrisierter Action-Callback. Onyx-Variante emittet `run:onyxExitTaken` und triggert `transitionToEndScene('incomplete')` → fade-to-black → `EndScene` zeigt "EVIL IS LURKING IN THE LIGHT" in dimmem Amethyst, auto-return zum MainMenu nach 6s (oder Space/Enter/click skip).

*The Prismarch (DONE — Secret Endboss, formerly "Lord Onyx"):*
- [x] **DisplayName** = `'The Prismarch'` (Boss-Bar, Banner "The Prismarch stirs...", `boss:killed` payload). Class `LordOnyx`, EnemyId `'boss-lord-onyx'`, TextureKey `BossLordOnyx`, file `LordOnyx.ts`, dev hook `__wiz.spawnLordOnyx()` — alle bleiben unverändert (full file/ID-rename als zukünftiger Cleanup-Pass). **DON'T** check `payload.name === 'Lord Onyx'` mehr — der Death-Handler in GameScene heißt jetzt `=== 'The Prismarch'`.
- [x] **`LordOnyx`** in `src/entities/enemies/LordOnyx.ts` — extends BossEnemy, rooted (body.moves=false, immovable). HP **90** base (gets DPS-scaled at spawn time, see Floor-HP-Scaling section).
- [x] **Texture redesign V3 — "Tattered Cultist" (PreloadScene 64×88)**: nach User-Auswahl aus dem Variants-Mockup (StyleMockupScene Page 5, `drawPrismarchVariantTattered` als Vorlage). Bell-shape silhouette + V2 robe-colors bleiben unverändert (so dass die Figur als Continuation der vorherigen Version liest), aber: **Trinity-Eyes** statt zwei seitlichen Pinpoints — drei vertikale Amethyst-Punkte zentriert im Hood-Void (y=11/14/17), je einer pro konsumierter Floor-Gem, plus dünner amethyst center-line zwischen den Augen. **3 runische Brust-Sigille** in dark-amethyst Thread (`RUNE_THREAD = 0x6a4080`) bei y=26: Emerald-Cross (links, x=cx-11), Sapphire-Sine-Wave (mitte, 7-pixel-Polyline), Amethyst-4-Punkt-Diamond (rechts, x=cx+11) — jede Sigille terminated in einem 1px-Gem-coloured Node. **Hem-Streamers**: 6 windblown short triangles (4 px wide, 7 px lang) trailing past dem deep-hem (y=80) bis y=87, alternating sideway-Tip-bias für asymmetrischen wind-look. **Shadow-Chain-Coil**: das Prism wird nicht mehr "displayed" — drei coiling chain-Loops (y-offset -4/0/+4) gezeichnet als 12-segment dotted-pixel ribbons mit sine-modulated Radius (7±1.5 px) wrapped um den Prism. Dimmed Halo (`0x000000 0.30` + `AMETHYST 0.18`) statt V2's bright multi-tone-ring. Kleine amethyst-leak-Pixel zwischen Chain-Links (oben/unten) damit der Prism "trying to escape" liest. Skeletal-Hands behalten (cradlen den gefangenen Prism statt ihn zu präsentieren). User-Story: er hat die Gems absorbed und imprisoned den Prism, statt ihn zu wielden.
- [x] **Teleport movement** (`tickTeleport`): jede 4500ms teleport an random Position im Raum (96 px Wall-Margin, ≥220 px Player-Distanz). Telegraph 700ms — Boss alpha 0.35 + schwarzer pulsierender Schatten (boss-Texture, tinted 0x000000) am Target. Snap nach Telegraph + Camera-Shake. Mutex mit Phase-2 Snipe (verhindert Beam/Position-Mismatch). Geblockt während aller Special-States.
- [x] **Phase 1 base** (HP > 66 %): aimed 5-Thorn Fan (32° Spread) alle **1600ms** + drifting 4-Thorn Cross alle **2400ms** (22°/s Orientation-Drift, BloodProjectile texture). Two overlapping rhythms.
- [x] **Phase 2 base** (33–66 %): on entry **2 Wraith-Adds** an den FAR corners (sortiert nach Player-Distanz descending — fix für "Wraith spawned auf Player"-Bug). 8-Arm Spinning Ring mit 90° rotating Gap (2 von 8 arms skipped, fire alle **220ms**, spin 56°/s) + telegraphed Walk-Snipe alle **2000ms** (locked-aim 380ms Beam Telegraph mit pink Core, dann 1.6× speed BloodProjectile entlang der locked Linie).
- [x] **Phase 3 base** (HP < 33 %): Enrolling Inward Waves alle **2800ms** — 12 Thorns spawnen am Perimeter (R=320 vom Boss), velocity inward, 110 px/s, 4s Lifetime. **Vor jedem Thorn-Spawn pulsiert 500ms ein roter passiver `MansionMissile`-sprite Warning-Marker (no-hitbox)** an der Spawn-Position (fix für "spawned on me"-Unfairness). Aimed Homing alle **1400ms** on top.
- [x] **Per-phase Prism Special Trigger** (`tickAI`): Timer-based, P1 6000ms / P2 5000ms / P3 4000ms ab Phase-Entry. Reset bei Phase-Change. Fires einmal pro Phase via `beginSpecial()`. Damage-skip-Phase Problem ist mit dem **Boss-DPS-Scaling** (siehe Floor-HP-Scaling section) gelöst: jede Phase HP-Block skaliert linear mit Player-DPS, also dauert sie immer ~base-time → alle 3 Specials feuern garantiert.

*Prism Special State Machine (Model B — invulnerable across all non-idle states):*
- [x] **State machine**: `idle → centering → charging → firing → recovering → idle`. `takeDamage` override returnt false + gold-Tint Cosmetic auf geblockte Hits wenn `specialState !== 'idle'`. Teleport blocked. Base patterns paused EXCEPT Phase 1 firing (Forest Wrath) wo `tickPhase1` weiterläuft (Boss feuert normal Fan + Cross während Homing-Swarm — homing turn rate auf 100°/s reduziert um zu kompensieren).
- [x] **`centering`** (400ms): jeder Special startet mit kurzem Teleport in Raum-Center (re-uses teleport telegraph machinery — alpha 0.35 + black shadow at center). Geskippt wenn Boss schon < 32 px vom Center weg. Garantiert Symmetrie bei radialen Patterns + festen Reference-Point für Player.
- [x] **`charging`** (1200ms): prism-glow Halo (Phaser.Arc) wächst von radius 4 → 56 in der Gem-Farbe (P1=Emerald 0x4afa80, P2=Sapphire 0x4a80fa, P3=Amethyst 0xc864ff), pulsiert alpha 0.45 → 0.85. Tint-Flash auf Boss + Camera-Shake. **Emit `lordOnyx:specialFired { phase, x, y }`** mit Boss-Center-Position (post-centering). GemSeal hört zu, fliegt den passenden Gem (Phase 1=Emerald, 2=Sapphire, 3=Onyx) vom Socket via 800ms Bezier-Bogen in den Prism, danach Socket clears (Plate dimmt + Halo destroyed + Burst-Visual). Sticky `consumedSockets` Set verhindert Re-Fill.
- [x] **`firing`** (per-special duration): Pattern fires via dedicated method (siehe unten). Tide Mandala + Crimson Web brauchen per-frame `tickSpecial`-Updates für Orbits / Bolt-Redraws.
- [x] **`recovering`** (400ms): brief invuln cooldown bevor zurück zu idle. Crimson-Web-Bolts werden hier zerstört wenn noch active.

*Prism Specials (3 gem-themed signature attacks):*
- [x] **Forest Wrath (P1, Emerald)** — `LORD_ONYX_FOREST_WRATH_PATTERN_MS = 10300`. Boss "ignites" 10 emerald-tinted (`MansionMissile`) Thorns am Prism. Initial radial Spread @ 160 px/s, dann setHoming(player, **100°/s**) — Player muss cutten/zigzaggen, Geradeauslauf wird gefangen. **10s Lifetime**. Boss feuert während des Windows base patterns weiter (multi-threat). Visual: Emerald Burst-Halo am Prism beim Ignite.
- [x] **Tide Mandala (P2, Sapphire)** — `LORD_ONYX_TIDE_PATTERN_MS = 3300`. 6 Outer-Thorns (radius 150, CW 90°/s) + 5 Inner-Thorns (radius 80, CCW 130°/s) orbiten 2.6s. `tickOrbitingThorns` updated Position jeden Frame (vy=0 setVelocity, manueller setPosition). Aimed Sapphire-Schüsse (BloodProjectile + sapphire-tint) alle **650ms** durch die Lücken (1.1× Standard-Speed). Outward Release am Orbit-Ende @ 220 px/s.
- [x] **Crimson Web (P3, Onyx)** — `LORD_ONYX_WEB_PATTERN_MS = 10000`. **14 pulsierende outward-expandierende Waves**, alle **700ms** spawnt eine neue. Pro Wave: 12 Slots (30° apart), 1 Slot ist die **Gap** (= Dodge-Opening, ~30° wide). **Erste Wave's Gap zeigt zum Spieler** via `computeGapSlotTowardPlayer` — Slot dessen Winkel am nächsten an Boss→Player-Richtung. Successive Waves driften Gap **+1 Slot pro Wave** in derselben Richtung — Player snake-pathed um den Boss (~420° Rotation total = ~1.17× komplett). Wave-Thorns: 110 px/s outward, 3.5s Lifetime, **`passThroughWalls = true`** (siehe unten — Bolts blieben sonst nicht volle Lifetime). Adjacent Thorns einer Wave verbunden mit zickzack Lightning-Bolts (white Core + crimson Halo, 7-Segment-Polyline, jeden Frame **re-jittered** an aktuellen Projektil-Positionen für moving wave tracking). Bolts in `clearCrimsonWebBolts` aufgeräumt am Pattern-Ende + Boss-Death.

*Floor-HP-Scaling (anti-melt — Phase 5 polish, replaced damage cap):*
- [x] **Mob-HP per floor**: `FloorTheme.enemyHpMultiplier` — Emerald **×1.0**, Sapphire **×1.5**, Onyx **×2.0**. `BaseEnemy.constructor` reads `scene.registry.get('enemyHpMultiplier')` (set in `GameScene.init`) and scales `definition.hp`. Keeps mob threat in line with player damage growth across floors.
- [x] **Boss-DPS-Scaling**: every boss instantiation calls `GameScene.updateBossHpScale()` first, computes `(currentDamage × currentFireRate) / (BASE_DAMAGE × BASE_FIRE_RATE)`, clamps ≥ 1.0, stores on registry. **`BossEnemy.constructor`** + **`VampireBody.constructor`** read it and override BaseEnemy's mob-mult-applied `this.hp` with `Math.round(definition.hp × scale)` (also sets `this.maxHp`). Result: bosses always feel like a base-stats fight regardless of build — Phase 1/2/3 special timers always fire because phase HP-blocks scale linearly with player DPS.
- [x] **Damage cap removed**: `EnemyDefinition.damageCap` field + per-boss values + `BaseEnemy.takeDamage` clamp all gone — DPS-scaling does the anti-melt job better (no plateau, just stretched HP). Damage items now scale linearly into bosses again.
- [x] **`override readonly maxHp = ENEMIES[...].hp;` removed** from all 12 boss subclass files (was redundant with the new BossEnemy/VampireBody constructor-side init). `maxHp` is the single source of truth set in the parent constructor.

*Spawn / Death Flow:*
- [x] **Spawn-Pfad**: `seal:activated` → close all doors + tear down exit-stairs + Banner "**The Prismarch stirs...**" → 900ms Delay → spawn LordOnyx zentral. Same `activeBoss` slot, same no-hit tracking, same boss bar.
- [x] **Death-Pfad**: `boss:killed` payload checks `name === 'The Prismarch'` → bypasses normal reward flow → calls `handleLordOnyxKilled` → `Cosmetics.unlockPrismancySkin()` + Camera-Flash + Shake + emit `run:onyxFullVictory` + recordRunWonFull + **900ms Delay → spawnt einen "[E] ENTER THE LIGHT"-Sigil im Raum-Center** (gleicher `spawnStairsInCurrentRoom`-Pfad wie der No-Gems-Exit, nur mit Action = `transitionToEndScene('full')`) → Spieler walkt zum Sigil + drückt E → fade-to-black → `EndScene` übernimmt die "VICTORY"-Beat. **2026-05-09 Rework**: Vorher direkter Auto-Fade nach 900ms — fühlte sich abrupt an, User wollte selbst ins Licht treten. **Der vorherige in-room VICTORY-Banner + "Prismancy Skin Unlocked"-Toast sind entfernt** (User-Feedback: doppelte Anzeige während der Camera-Fade hat den EndScene-Headline geclasht). Türen bleiben zu (handleLordOnyxKilled ruft kein openAllDoors auf), so dass der Sigil der einzige Fokus ist. Skin-Unlock recording bleibt unverändert; das EndScene zeigt den eigentlichen "VICTORY" + subtitle dann auf eigenem Screen.

*Cosmetic-Unlock-System (DONE):*
- [x] **`src/systems/Cosmetics.ts`** — localStorage-backed mit try/catch fallback (private browsing). Zwei Storage-Keys: `'prismancy.unlocks.lordOnyxBeaten'` (Unlock-Flag) + `'prismancy.cosmetics.selectedSkin'` (Spieler-Wahl). API: `hasPrismancySkin()`, `unlockPrismancySkin()`, `getSelectedSkin()`, `setSelectedSkin(skin)`, `resetAll()`. `SkinId = 'default' | 'prismancy'`.
- [x] **Prismancy Wizard-Skin**: Roter+goldener Skin als Trophy für Lord-Onyx-Kill. Same pixel-layout wie Default, refactored `drawWizardTexture` in PreloadScene nimmt jetzt `palette` + `textureKey` Parameter. Beide Texturen werden bei Preload generiert: `tex-player` (default purple/white) + `tex-player-prismancy` (deep crimson robe + gold trim + black hat mit gold band).
- [x] **Auto-Apply on first unlock + manual toggle**: `getSelectedSkin()` ist die einzige source of truth für die aktive Textur. Default-Auflösung: kein expliziter Storage + skin unlocked → `'prismancy'` (preserves trophy-reveal moment). Kein Storage + nicht unlocked → `'default'`. Explizit `'prismancy'` aber nicht unlocked → Fallback `'default'` (defense-in-depth wenn jemand localStorage manuell editiert oder Unlocks resettet). Player-Constructor + MainMenuScene-Wizard-Render lesen beide `getSelectedSkin()`.
- [x] **Main-Menu Character-Cycle + Skin-Toggle (final 2026-05-09)**: zwei separate Widgets statt eines Combined-Cycles. **Cycle** (Pfeiltasten links/rechts) wechselt nur zwischen Charakteren (Wizard / Spellblade), unsichtbar wenn nur Wizard unlocked. **`[S]`-Toggle** wechselt Skins für den aktuell ausgewählten Charakter — Wizard: default ↔ prismancy (wenn unlocked), Spellblade: nur default verfügbar (red-helm-Variante ist Future-TODO, siehe unten). Toggle-Hint unsichtbar wenn current character nur 1 Skin hat. Skin-Field wird auf den gültigen Wert geclamped wenn man zu einem Charakter wechselt der die persistente Skin-Wahl nicht supported (z.B. Wizard:Prismancy → Spellblade settled auf Spellblade:default). Player liest dieselbe Resolution via `resolvePlayerTextureKey()` Helper in [Player.ts](src/entities/Player.ts) (module-level, source of truth für beide call-sites).
- [x] **Spellblade Prismarch-Skin** (DONE 2026-05-09) — red cape + black helm + gold trim + crimson visor/blade glow als Prismarch-Equivalent für Spellblade. Re-uses dieselbe `SkinId = 'default' | 'prismancy'` als Wizard (kein zweites Set, das selectedSkin-Field bleibt geteilt) — `previewTextureKey` + `resolvePlayerTextureKey` branchen auf `(character, skin)` und mappen Spellblade+Prismancy → `TextureKeys.PlayerSpellbladePrismarch`. **Gate ist asymmetrisch zu Wizard**: `MetaProgress.hasSpellbladePrismarchSkin()` liest `bossesDefeatedAsSpellblade.includes('boss-lord-onyx')` — Prismarch-Kill **als Spellblade**, nicht jeder Prismarch-Kill. `recordBossDefeated(enemyId, character?)` pflegt zwei Ledger: shared (`bossesDefeated`) plus per-character (`bossesDefeatedAsSpellblade`); `unlockPrismancySkin()`-Alias passes `getSelectedCharacter()` durch. **`getSelectedSkin(character?)`** ist character-aware: explicit `'prismancy'` resolves nur wenn der Character-Gate metcht (Wizard: `bossesDefeated`, Spellblade: `bossesDefeatedAsSpellblade`); `null` (no explicit pick) auto-applied prismancy auf erstem Unlock pro-Character. MainMenu `applyCharacter` re-evaluiert `getSelectedSkin(character)` beim Switch — Wizard:Prismancy-Präferenz survived ein Toggle durch ein noch-nicht-Spellblade-Prismancy-Run zurück nach Wizard. Dev-Hook `__wiz.unlockSpellbladeSkin()` für Test ohne grind. StatsScene zeigt beide Skin-Status separat. Schema-bump: `MetaSave.bossesDefeatedAsSpellblade: string[]` — backward-compat default `[]` in `parseSave` für ältere v1-saves.

*Onyx Boss-Pool-Items (DONE — droppt vom Marquis-of-Mirages-Kill, NICHT The Prismarch):*
- [x] **Bloodbound Chalice** (`bloodboundChalice`): +1 max HP, +20 % damage (mult), Crimson missile tint (0xc8284a). Texture: gold goblet mit blood + side drip.
- [x] **Vampire's Signet** (`vampireSignet`): +25 % fire rate, +15 % missile speed, gold-red tint. Texture: gold ring mit ruby cabochon top-mounted.
- [x] **Obsidian Heart** (`obsidianHeart`): +1 dmg (add), **+1 max HP**, amethyst tint (0x8a4ad8). Texture: faceted black-amethyst heart mit gold vein crack + sparkle. (Range-Komponente entfernt mit dem range-Stat-Cleanup.)
- Alle drei mit `floor: 'onyx-mansion'` tag → werden nur aus Vampire-Boss-Pool gezogen via `pickItemFromPool(..., currentFloor)`. **The Prismarch gibt KEINE Items** — sein Reward ist der cosmetic Skin-Unlock.

*Noch offen:*
- [x] **End-Screens** (Phase 5 Chunk 4 #5 — DONE): `EndScene` in `src/scenes/EndScene.ts` mit `variant: 'incomplete' | 'full'`. Schwarzes Backdrop, **two-stage Sequence**: Stage 1 = grosses Headline (88 px, "VICTORY" full / "VICTORY?" incomplete) zentral fadet ein über 1400ms, hält 2200ms, fadet aus über 900ms. Stage 2 = Subtitle (32 px, "THE LIGHT HAS BEEN BANISHED" full / "IT'S STILL LURKING IN THE LIGHT" incomplete) fadet zentral ein gerade als das Headline cleart, 1400ms. Variant-Color: incomplete = dim amethyst `#a060c0`, full = gold `#ffd84a`. Back-to-menu Hint "[SPACE] / [ENTER]   BACK TO MENU" appeared nach Subtitle-Settle. **Kein Auto-Return**: EndScene bleibt indefinite stehen bis der Spieler Space/Enter/click drückt — User-Wunsch dass die Reflektions-Pause selbst-bestimmt ist. Wired über `GameScene.transitionToEndScene(variant)` der GameScene + UIScene stoppt und EndScene mit Init-Data startet. `inTransition`-Latch verhindert Doppel-Trigger. Run state cleart sich automatisch durch den Scene-Restart beim nächsten MainMenu → Game. **Music**: GameScene `stop(scene, { fadeMs: 600 })` parallel zum Camera-Fade-Out, dann startet EndScene `playTrack('victory-credits', { firstPlayFadeMs: 1600 })` exakt wenn das Headline appeared — User-Wunsch dass das Ending-Theme erst nach dem Fade-Out einsetzt synchron mit dem Text. `returnToMenu` fadet die Credits über 600ms und MainMenu's Title-Track picked up.
- [ ] **Full Prismarch rename pass** — File `LordOnyx.ts` → `Prismarch.ts`, Class `LordOnyx` → `Prismarch`, EnemyId `'boss-lord-onyx'` → `'boss-prismarch'`, TextureKey `BossLordOnyx` → `BossPrismarch`, Dev-Hook `__wiz.spawnLordOnyx()` → `__wiz.spawnPrismarch()`, internal comments. Display-Name + Death-Handler-Check sind schon umgestellt (= ingame fertig), aber das Internal-Naming ist Cleanup.
- [ ] **HP/Damage-Skalierung pro Floor systematisch** — Onyx-Mobs sind ad-hoc gebumped (5/9/7), aber kein generelles Scaling-System. Wird interessant sobald Floor-1-Mobs auf späteren Floors wiederkehren.
- [x] **Lord Onyx visual polish pass** — DONE in zwei Steps: V2 = High-Priest hooded silhouette mit Prism (rework von der ursprünglichen Crown-Scepter-Version). V3 = "Tattered Cultist" rework nach Variants-Mockup-Auswahl (siehe Texture-Block oben). Visual-Scale wurde gleichzeitig von **1.7× → 1.5×** (`LORD_ONYX_VISUAL_SCALE`) gedimmt — User-flagged dass V2 bei 1.7× im Vergleich zu anderen rooted Bossen (Forest Heart 1.0×, Bloomheart 1.8×) "ein mini bisschen zu groß" wirkte. 1.5× × `WORLD_SPRITE_SCALE` = 1.875× effective, sitzt zwischen Forest Heart und Bloomheart. Hitbox skaliert proportional mit (BaseEnemy `setCircle / WORLD_SPRITE_SCALE` Compensation greift identisch). Original-Mockup-Version `drawLordOnyx` in StyleMockupScene Page 4 ist veraltet aber harmlos. Page 5 (`paintShowcasePrismarchVariants`) hat die 4 Variants-Mockups + den V2-vs-V3-Vergleich als Reference, falls weitere Iterationen kommen.

**DoD:** Vollständiger Run vom Start bis zum finalen Boss möglich.

---

### Phase 6 – Polish, Audio & Meta (ca. 2 Wochen)

**Ziel:** Aus dem Prototyp ein Spiel machen.

- [x] **Sound-Effects** — komplett 2026-05-08. 20 prozedurale 8-bit Web-Audio-Recipes in `src/systems/SfxSynth.ts` (kein File-Asset). Player-Cast/Hit, Pickup-Family (coin/key/heart/item/gem), Enemy-Cast (throttled) + Hit + Charge (gehookt an 7+ Telegraph-Punkte), Boss-Death, Door-Open/Close/Unlock + Floor-Teleport, Marquis-Mirror-Special, Prism-Special-Cast (auch GemSeal-Activation), Prism-Explosion. Volle Recipe-Doku + Wiring-Spots in `SFX_BRIEF.md` Repo-Root. Siehe SFX-System-Block unten.
- [x] **Background-Music pro Floor** — komplett. 8 echte AI-generierte MP3-Tracks (Suno) in `public/audio/music/` + `MusicManager` singleton mit RAF-basierten Crossfades + Floor-/Boss-/EndScene-Wiring. Siehe Audio-System-Block.
- [~] Partikel-Effekte (Blut, Explosionen, Item-Aura) — **Blut** done (`spawnBloodParticles` aus `enemy:hit` event, 5 rote drops mit gravity-arc); **Burn-Flames** done (`spawnFlameParticle` aus `enemy:burnTick`, gold/orange flicker upward). Item-Aura + Explosions noch offen.
- [~] Hauptmenü, Pause-Menü, Settings (Volume, Keybindings) — **Pause-Menü** live (Phase 5 Polish), **Hauptmenü** komplett umgebaut (vertikales Menü mit Hover + Keyboard-Nav, siehe MainMenu-Block unten), **Sound-Settings** als Overlay live (Master-Volume-Slider in `SoundSettingsScene`), **Controls-Overlay** als read-only Liste live (`ControlsScene`). Echtes Keybinding-Remap noch nicht implementiert (UI-mäßig out-of-scope für die meisten Indie-Games).
- [x] **Missile-Modifikatoren (Homing, Piercing, Burn-DoT)** — Phase-6-Einstieg 2026-05-07. Splitting bewusst weggelassen. Drei Items: **Magic Shard** (Shop, 15 Coins, +piercingCount 2 → 100/75/50% damage über 3 Hits), **Wizard Glasses** (Boss-Pool floor-agnostic, +homingTurnRate 80°/s, +10% missileSpeed — Speed-Bump statt Range-Stat-Reintroduce), **Fire Orb** (Treasure, +burnDamageFactor 0.30 → 30% des Hit-Damages über 2 Ticks à 600 ms). Synergien (Pierce × Burn → jeder Pierce-Hit ignites; Pierce × Homing → Missile sucht nach Pierce neues Target) sind explizit erlaubt. Missile-Modifier sind reguläre StatsSystem-Stats (`piercingCount`, `homingTurnRate`, `burnDamageFactor`); Missile liest sie pro `fire()` aus, alle pro-Frame-Mechanik (Homing-Turning, Pierce-Tracking via `hitEnemies` Set) lebt auf der Missile-Instanz.
- [ ] Run-Stats-Tracking (Tode, Kills, Items gefunden)
- [x] Save/Load für Meta-Progression (Localstorage): Trophy/Collection-System (passiv, kein Gameplay-Gating). Tracked: bossesDefeated[], itemsDiscovered[], runs counters (started/died/wonFull/wonIncomplete), bestRunMs, selectedSkin. Single-slot versionierter JSON-Blob in `'prismancy.save.v1'`. Migration aus alten Cosmetics-Keys. StatsScene Overlay vom MainMenu via `[T]`-Key. Hold-`R` für reset (1s).
- [x] **Unlock-Toast** (DONE 2026-05-09) — top-right click-to-dismiss Toast für meta-progression unlocks. `EventBus`-event `unlock:gained` mit Payload `{ id, title, subtitle?, textureKey? }`; `UnlockToast`-widget in UIScene queue't sequentielle Unlocks (ein Prismarch-Kill kann gleichzeitig Wizard-Prismancy + Spellblade-Charakter triggern → 2 Toasts nacheinander). Auto-fade nach 8s, click anywhere on card dismisst sofort. Per-session `shown`-Set verhindert Doppel-Trigger. **Detection lebt in `GameScene.handleBossKilled`**: snapshot `wasPrismancySkinUnlocked` / `wasSpellbladeCharUnlocked` / `wasSpellbladePrismarchSkinUnlocked` / `wasBossPreviouslyBeaten` BEFORE `recordBossDefeated`, dann diff post-record und emit für jede locked→unlocked Transition. Items werden via `Object.values(ITEMS).filter(item.metaUnlock === enemyId)` gescannt wenn der Boss zum ersten Mal beaten wurde. Currently active Triggers: Prismarch-Kill (wizard prismancy / spellblade-char / spellblade-prismarch je nach Gate-State) + Marquis-of-Mirages-Kill (Blood of Marquis Item). Future Unlocks brauchen nur einen Snapshot-Field + Transition-Check in `emitUnlockToasts`. Dev-Hook `__wiz.testUnlockToast()` für Layout-Preview.
- [ ] Seeded-Run-Funktion (Seed eingeben für reproduzierbare Runs)
- [ ] Performance-Pass (Object-Pooling für Missiles/Projektile/Partikel)
- [x] **Active Items mit [Q]** — Scope-Pivot 2026-05-09. War vorher out-of-scope (Entscheidung 2026-05-07), jetzt reaktiviert mit minimaler Infrastruktur (`ItemDefinition.active`, `ActiveItemSystem`-Slot-Owner, `ActiveItemSlot`-HUD-Widget bottom-left, [Q]-Key-Polling in `tickActiveItem`). Erstes Active-Item: **Blood of Marquis** — Glass-Cannon-Trade, +30% all stats permanent, max HP locked auf 2 Hearts, [Q] feuert "Echoes of Blood" AOE die Trash-Mobs instant-killt + Bossen 30% max-HP-Damage zufügt (Phase-Threshold cross natürlich). Drop-Gate via `ItemDefinition.metaUnlock = 'boss-marquis-of-mirages'`. Siehe Active-Item-System-Block unten.
- [x] **Spellblade-Charakter (DONE 2026-05-09)** — zweiter spielbarer Charakter als Glass-Cannon-Swordmage-Variante des Wizards. Unlock-gated auf Prismarch-Kill (`MetaProgress.hasSpellbladeCharacter()`, gleicher Gate wie Prismancy-Skin). Vollständige Combat-Identität via Spell-Sword-Bolt + 8-way Dash. Siehe Spellblade-Combat-Block unten für Details.
- ~~Bombs als Pickup-Type~~ — out of scope (User-Entscheidung 2026-05-07: kein nicht-offensiver Use-Case)

---

## Spellblade-Combat (Phase 6 — 2026-05-09)

**Stack:** Zweiter spielbarer Charakter via Tattered-Knight-Sprite (silver helm + onyx blade, fallen knight of the Prismarch). Unlock-gated auf Prismarch-Kill. Kämpft mit einem **Spell-Sword-Projektil** (re-uses MagicMissile-Pool mit anderer Texture + slow cadence + chunky damage + baseline pierce) plus einem **8-way Dash** mit i-frames. Glass-cannon-Identity (2 Herzen baseline statt Wizard's 3).

**Pivot-History:** Phase B war ursprünglich als 180° Melee-Slash designed (SwordSlash + SwordSlashPool entities, parry-Mechanik, 80→120 px Range, ×3 Damage-Mult, +1 Heart). User-Playtest 2026-05-09: "das komplette game war eben free, basically alle ge-one-hitted". Komplett gelöscht (SwordSlash.ts + SwordSlashPool.ts + parry overlap + alle SLASH_*-Konstanten + DEFAULT_SLASH_TINT) und durch Projectile-basierte Spell-Sword-Variante ersetzt. Nur der Dash + die Texture (`drawSpellbladeTexture` in PreloadScene) + `MetaProgress.selectedCharacter` survived den Pivot.

### Spellblade-Bolt (replaces Magic-Missile)

Re-uses `MagicMissilePool` — kein eigener Pool. **`MagicMissile.fire`** nimmt jetzt vier optionale Parameter:
- `textureKey?: string` — wenn gesetzt, swappt die Pool-Sprite-Texture (Spellblade nutzt `TextureKeys.SpellbladeBolt`, Wizard ohne den Param fällt auf `TextureKeys.MagicMissile` zurück)
- `rotateToDirection?: boolean` — wenn true, rotiert das Sprite via `setRotation(atan2(finalVy, finalVx))` zum Flugvektor (Spell-Sword zeigt entlang seiner Trajektorie, Wizard-Orb bleibt rotation-free). Wichtig: rotiert auf den **finalen** Velocity-Vektor (nach Inherit-Add), nicht die reine Cardinal-Direction
- `inheritVx?` / `inheritVy?: number` — Player's body velocity at fire time, multiplied by `MISSILE_VELOCITY_INHERIT_FACTOR` und additiv zur Cardinal-Velocity. Siehe Movement-Velocity-Inheritance-Block unten
- `bodyRadiusOverride?: number` — wenn gesetzt, force-pinned der Body nach `setScale` auf einen absoluten World-Space-Radius via Inv-Scale-Compensation. Siehe Wall-Stuck-Bug-Block unten

Alle Werte werden bei jedem `fire()` gesetzt/zurückgesetzt damit ein recycled Pool-Member nicht den vorigen State trägt. Player branched zwischen `fireWizardMissile` (default opts) und `fireSpellbladeBolt` (bolt-specific opts) je nach `this.character`.

**Bolt-Stats** (aktuelles Tuning, mehrfach iteriert):
- **`SPELLBLADE_BOLT_FIRE_INTERVAL_MS = 500`** — 2× langsamer als Wizard's 250ms. Tuning-Verlauf 400→600→900→500: 900ms war heavy-swing-spot-on auf Emerald, aber Sapphire (1.5× Mob-HP × slow cadence) wurde unsurvivable — User-Bug 2026-05-09 "unmöglich den zweiten floor zu schaffen". 500ms behält den Schwertgewicht-Feel (Cast bleibt ein commit), schließt aber den Floor-2-DPS-Gap.
- **`SPELLBLADE_BOLT_DAMAGE_MULT = 1.5`** — applied auf `damage`-Stat. Base 1.0 dmg × 1.5 = 1.5/shot. Mossy Slime (HP 5) → 4 hits, Forest Sprite (HP 3) → 2 hits, Pixie (HP 2) → 2 hits. +damage-Items skalieren linear. War zwischenzeitlich ×3 in der Slash-Version (1-shotted alles, gerejected).
- **`SPELLBLADE_BOLT_BASELINE_PIERCE = 1`** — addiert auf den `piercingCount`-Stat **nur** beim Spellblade-Fire (Wizard kriegt keinen Bonus). Fresh-run pierces 1 enemy baseline; Magic Shard (+2) stackt auf 3 total. Damage-Taper folgt der Standard-`PIERCING_DAMAGE_FACTORS = [1.0, 0.75, 0.5]` Sequence — base bolt macht 1.5 → 1.125 dmg auf den zweiten Hit.
- **`SPELLBLADE_BOLT_VISUAL_SCALE = 1.5`** — multiplied auf den `missileScale`-Stat. Sprite-Frame ist dasselbe 24×24 wie Magic-Missile, aber `setScale(1.5)` skaliert das Visual auf 1.5×. **Body bleibt aber bei `MISSILE_RADIUS = 8`** via `bodyRadiusOverride` (siehe Wall-Stuck-Block unten) — also Spellblade-Bolt ist visuell 1.5× größer als Wizard-Orb, hat aber **identische** Hitbox-Größe (8 px). Side-Effect: `missileScale`-Items growen auf Spellblade nur das Visual, nicht den Body — auf Wizard skaliert der Body weiter mit (default Phaser auto-scale).

**DPS-Vergleich:**
- Wizard single-target: 1.0 / 0.25s = 4.0 dmg/s
- Spellblade single-target: 1.5 / 0.5s = 3.0 dmg/s (2× langsamer)
- Spellblade group-of-2 (lined up, beide pierced): (1.5 + 1.125) / 0.5 = 5.25 dmg/s — schlägt Wizard's single-target durch Pierce
- Wizard bleibt single-target-DPS-King; Spellblade gewinnt deutlich bei Group-Clear via Pierce-Baseline + bigger Hitbox + Damage-Burst pro Cast.

**Bolt-Texture** (`drawSpellbladeBoltTexture` in PreloadScene, 24×24): elongated diamond pointing along +x axis, drei Layer (mid-violet body → bright lavender core → white-hot leading-edge highlight) plus Pommel-orb am trailing-end. Authored pure white sodass `missileTint` (Items wie Pixie Dust → magenta, Mire Pearl → blue) das Blade-Glow direkt färbt.

### Movement-Velocity-Inheritance (asymmetric, Spellblade-only)

`MISSILE_VELOCITY_INHERIT_FACTOR = 0.25` definiert wie stark der Player's Body-Velocity an die finale Cardinal-Velocity gemultiplied + add'd wird. **`MagicMissile.fire`** wendet das auf jeden Bolt der `inheritVx`/`inheritVy` mitbringt.

**Asymmetrische Application** — nur `Player.fireSpellbladeBolt` passt `inheritVx: body.velocity.x` + `inheritVy: body.velocity.y` durch. **`Player.fireWizardMissile` lässt die Felder weg** sodass MagicMissile.fire sie auf 0 defaultet → Wizard schießt **pure cardinal**, Spellblade-Bolt winkelt mit Movement.

Effekt at base PLAYER_SPEED 220 px/s, perpendikulär:
- Inherit = 220 × 0.25 = 55
- Cardinal = 420 (MISSILE_SPEED)
- Angle = atan2(55, 420) ≈ 7.5° off-axis — subtil aber sichtbar
- Bei Dash (720 px/s) noch ~23° angle

Thematisch: Wand-Orb ist sniper-präzise, Spell-Sword-Bolt trägt Momentum. Tuning-History 0.5 → 0.25 (User-flag "der winkel ist zu stark", dash-cancel-bolt war bei 0.5 ~40° → fühlte sich unintentional an).

**Wichtig:** `setRotation` für `rotateToDirection: true` Bolts nutzt den **finalen** Velocity-Vektor (`Math.atan2(finalVy, finalVx)`), nicht die Cardinal-Direction. Ohne das würde der Bolt-Sprite cardinal zeigen aber angled fliegen — Disconnect zwischen Visual und Trajektorie.

### Wall-Stuck-Bug-Fix (bodyRadiusOverride)

User-Bug 2026-05-09: "spellblade kann nicht schießen wenn man komplett am rand des raumes steht". Bolt blieb in der Wand kleben oder wurde sofort beim Spawn deaktiviert.

**Root-Cause:** Spellblade-Bolt hatte initial Body 12 px (MISSILE_RADIUS × SPELLBLADE_BOLT_VISUAL_SCALE = 8 × 1.5). Player-Body ist 11 px. Wenn Spieler an die Top-Wall gepresst war, Player-Body-Center bei `top_wall_y + 11`. Bolt-Body-Top-Edge = body.center.y - 12 = `top_wall_y - 1` → 1 px **in** der Wand. Bei Sideways-Shoot (Cardinal-X-Velocity) bewegt sich der Bolt horizontal aus der Spawn-Position weg, vertikal **bleibt** er aber 1px in der Wand → Wall-Collider-Trigger → Bolt deaktiviert.

**Fehl-Versuch (entfernt-implizit):** Spawn-Grace via `MISSILE_SPAWN_GRACE_MS = 60` + `MagicMissile.isInSpawnGrace` + `playerMissileWallProcess` Process-Callback. Dachte das Problem sei eine 1-frame-Spawn-Overlap. War aber nicht — die vertikale Overlap **persistierte** über Sideways-Movement, und nach 60ms hat der Wall-Collider trotzdem deaktiviert. Der Code ist noch da als Defense-in-Depth (kostenlose 60ms grace für die seltene Case wo ein Bolt bei Spawn überlappt aber sich SCHNELL aus der Overlap heraus bewegt) — aber der echte Fix ist:

**Echter Fix — `bodyRadiusOverride`:** `MagicMissile.fire` nimmt jetzt einen optionalen `bodyRadiusOverride: number` Parameter. Wenn gesetzt, wird **nach** `setScale(opts.scale)` ein neues `setCircle(r, halfW - r, halfH - r)` mit `r = bodyRadiusOverride / opts.scale` ausgeführt — Inv-Scale-Compensation, weil Phaser's Auto-Scale den Body sonst wieder hochzieht. Resultat: Body-Radius im World-Space = absolute `bodyRadiusOverride`, unabhängig vom Visual-Scale.

`Player.fireSpellbladeBolt` passt `bodyRadiusOverride: MISSILE_RADIUS` (= 8) durch. Spellblade-Bolt-Body ist damit immer 8 px im World-Space — fits inside Player-Body (11 px) → spawnt nie überlappend mit der Wall. Visual bleibt 1.5× groß (Phaser's setScale handlet das Sprite-Rendering separat, nicht den Body).

Wizard fire-path lässt `bodyRadiusOverride` weg → Wizard-Body skaliert weiter mit `setScale` (= MISSILE_RADIUS × scale). missileScale-Items affecten Wizard-Hitbox wie früher.

### Item-Carry-Over

Alle existing Items wirken auf beiden Charakteren ohne Branch:
- **Damage-Items** (Telescopic Wand, Magic Potion, etc.) — skalieren linear in beide DPS-Curves
- **Fire-Rate-Items** (Hot Tea) — modulieren `SPELLBLADE_BOLT_FIRE_INTERVAL_MS / fireRate` analog zu `MISSILE_FIRE_INTERVAL_MS / fireRate`
- **Magic Shard (+2 Pierce)** — addiert auf die +1 Baseline → 3 total für Spellblade
- **Wizard Glasses (Homing 80°/s)** — funktioniert auch auf der Spellblade-Bolt (gleicher Pool)
- **Fire Orb (Burn-DoT 0.30)** — Burn appliziert per Hit, durchpiercend
- **`missileTint`-Items** (Pixie Dust, Mire Pearl, Bloodbound Chalice, etc.) — färben den Bolt
- **`missileScale`-Items** — multipliziert sich mit dem Bolt's eigenen 1.5× Visual-Scale-Faktor → Visual wächst (z.B. Magic Tome +0.15 → 1.5 × 1.15 = 1.725× Sprite). **Hitbox** wächst aber NICHT mit `missileScale` für den Spellblade (bodyRadiusOverride pinned ihn auf MISSILE_RADIUS). Wizard-Behavior unverändert: setScale auto-skaliert seine Hitbox.
- **HP-Up-Items** (Heart Container, Pixie Dust, Spyglass, Lily Diadem, Ancient Heart) — addieren über den Spellblade's 2-Heart-Baseline; max HP wächst dynamisch

### Spellblade-Dash ([Shift])

8-way directional. Re-uses `InputManager.getMovement()` (already-normalized 8-way Vektor mit √2-Diagonale-Normalization) statt einem cardinal-only `Direction`. NW-Dash deckt dieselbe Distanz wie N-Dash. Wenn kein WASD gehalten, fallback auf `getShootDirection()` (4-way arrow keys) damit Still-Aiming-Spieler trotzdem dashen können.

**Dash-Konstanten:**
- **`DASH_DURATION_MS = 160`** — Burst-Window
- **`DASH_SPEED = 720`** px/s — total ~115 px Distanz (~1.3 Tiles)
- **`DASH_COOLDOWN_MS = 1500`** — gemessen vom Dash-Ende, nicht vom Dash-Start
- **`DASH_INVINCIBILITY_MS = 220`** — slightly longer als Duration sodass der back-edge auch grace hat (Isaac-Style)

**Implementation in [Player.ts](src/entities/Player.ts):**
- `tickDashInput(time)` polled jeden Frame, gated auf `character === 'spellblade'` (Wizard skipped die Method komplett)
- `Phaser.Input.Keyboard.JustDown` auf Shift verhindert Auto-Repeat bei Held-Shift
- `startDash(vx, vy, time)` setzt Velocity (vx/vy sind unit-Vektor → × DASH_SPEED gibt selben total-burst-speed in jeder Richtung), `dashUntil` lock, cooldown-clock, `grantInvincibility(220)`, clears `knockbackUntil` damit Hit-mid-Dash den Burst nicht swallowed
- `preUpdate` skipped `handleMovement` während `time < dashUntil` damit WASD die Burst-Velocity nicht clobbed
- **Wall-stuck-fix (2026-05-09):** `preUpdate` checked am Anfang jedes Frame `body.velocity.lengthSq() < 1` während `time < dashUntil` und endet den Dash früh (`dashUntil = 0`) wenn die Burst-Velocity von einem Wall-Collider auf 0 separiert wurde. Sonst sitzt der Spieler den Rest des 160ms-Windows mit Zero-Velocity gegen die Wand fest weil `handleMovement` skipped bleibt und die Velocity-Quelle weg ist — User-Bug 2026-05-09 "stecken bleibt wenn man der wand dashed". Direction-agnostic, covered auch diagonale Dashes gegen Corner.

`InputManager.wasDashJustPressed()` ist die einzige neue Public-API (`getMoveDirection` wurde während des 8-way-Refactors gestrichen — war nur cardinal und wird nicht mehr gebraucht).

### Spellblade-Max-HP

**`SPELLBLADE_MAX_HEALTH = 4`** (= 2 Herzen, vs Wizard's `PLAYER_MAX_HEALTH = 6` = 3 Herzen). Glass-cannon trade — Spellblade hat +50% damage, baseline pierce-1, bigger hitbox UND dash i-frames; die niedrigere starting HP zwingt den Spieler den Dash defensiv zu nutzen statt als free dodge. Player-Constructor branched: `character === 'spellblade' ? SPELLBLADE_MAX_HEALTH : PLAYER_MAX_HEALTH`. HP-Up-Items skalieren on top.

### MainMenu Character Profile Card ([I]-Toggle)

`buildCharacterStatsPanel()` paintet ein zentriertes 232×252-Profil-Panel zwischen Wizard- und Pixie-Queen-Sprite. **Default hidden** — Title-Screen-Art darf nicht ständig verdeckt sein. **[I]**-Keybind togglt Sichtbarkeit; Hint-Label am Bottom (`y = GAME_HEIGHT - 22`) wechselt zwischen `[I] CHARACTER INFO` und `[I] HIDE INFO`.

Bottom-Hint-Stack-Reihenfolge (top→bottom): Char-Cycle (`< SPELLBLADE >` bei `y - 66`) → Skin-Toggle (`[S] SKIN: …` bei `y - 44`) → Info-Toggle (`[I] CHARACTER INFO` bei `y - 22`).

Panel-Inhalt: Char-Name (gold) + Flavor-Subtitle (italic dim) + 6 Stat-Rows (HP / CAST RATE / DAMAGE / PIERCE / PROJECTILE / DASH). Werte sind hardcoded (`PROFILES`-Map) statt live-computed weil wir ein klares Marketing-Read wollen statt der echten Stats-System-Numbers — Items werden nicht eingerechnet, das ist die *base profile* vor dem Run-Start.

`setupCharacterCycle` ruft `statsPanel.update(character)` in `applyCharacter` auf sodass Pfeiltasten-Cycle das Panel live aktualisiert. Container auf `setDepth(15)` damit das Panel über den Action-Effects (depth 10) liegt. Visibility-State persistiert über Overlay-Pause/Resume (Sound Settings, Stats, Controls), wird aber bei jedem Scene-Restart resettet (default hidden bei jedem MainMenu-Visit).

### Controls-Overlay

[ControlsScene.ts](src/scenes/ControlsScene.ts) listet jetzt zusätzlich:
- `Cast Magic` — Arrow Keys (gleicher Slot für Wizard-Missile + Spellblade-Bolt)
- `Active Item` — Q
- `Dash (Spellblade)` — Shift + WASD

### Files-Touched-Liste

- [Player.ts](src/entities/Player.ts) — `character`-Field, `fireWizardMissile` / `fireSpellbladeBolt` branch (Spellblade passt `inheritVx/Vy` + `bodyRadiusOverride` durch, Wizard nicht), `tickDashInput` / `startDash` (Spellblade-only)
- [MagicMissile.ts](src/entities/projectiles/MagicMissile.ts) — `MagicMissileFireOptions` mit `textureKey?` + `rotateToDirection?` + `inheritVx?` + `inheritVy?` + `bodyRadiusOverride?`. fire() setzt Texture, rotiert auf finale-Velocity-Vektor, addiert Inherit-Velocity, force-pinned Body wenn override gesetzt. Plus `isInSpawnGrace` Defense-in-Depth-Method.
- [InputManager.ts](src/systems/InputManager.ts) — `keyShift` + `wasDashJustPressed()` (`getMoveDirection` removed)
- [MainMenuScene.ts](src/scenes/MainMenuScene.ts) — `buildCharacterStatsPanel()` + [I]-Toggle + Bottom-Hint-Reorder
- [PreloadScene.ts](src/scenes/PreloadScene.ts) — `drawSpellbladeBoltTexture` (replaces drawSwordSlashTexture)
- [GameConfig.ts](src/config/GameConfig.ts) — `SPELLBLADE_BOLT_*` + `DASH_*` + `SPELLBLADE_MAX_HEALTH` + `MISSILE_VELOCITY_INHERIT_FACTOR` + `MISSILE_SPAWN_GRACE_MS` Konstanten + `TextureKeys.SpellbladeBolt`
- [GameScene.ts](src/scenes/GameScene.ts) — `playerMissileWallProcess` Process-Callback auf den 3 Missile-Wall-/Barrier-Collider-Registrierungs-Pfaden (`setupCollidersForActiveRoom`, `markCurrentRoomCleared`, `refreshBarrierColliders`). Plus Shop-[E]-Pattern (siehe unten).
- [ControlsScene.ts](src/scenes/ControlsScene.ts) — Cast/Active/Dash entries

### Future Polish (nicht priorisiert)

- Eigene SFX-Recipes für Spellblade-Bolt-Cast (aktuell re-uses `playPlayerCast`) — heavier "thwoom" mit lower pitch fits the heavy-sword-swing feel
- Eigene Dash-SFX (woosh + brief tonal whoosh) statt re-used cast-SFX
- Dash-Trail-Visual (afterimage sprite + alpha-fade) für mehr juice
- Possible: dedicated "Spellblade Bolt Empty"-Wand-Tip-Effekt sodass der Cast nicht wand-Flash sondern Sword-Flash zeigt
- Spawn-Grace-Cleanup: `MISSILE_SPAWN_GRACE_MS` + `isInSpawnGrace` + `playerMissileWallProcess` sind heute redundant (bodyRadiusOverride löst das Problem strukturell). Belt-and-suspenders aber 60ms grace könnte für künftige large-body-Edge-Cases (z.B. wenn Wizard mit max-stack missileScale eine Body-Größe > 11 px erreicht) noch hilfreich sein. Wenn Cleanup-Lust besteht: 4 Files (GameConfig, MagicMissile, GameScene, dazu Imports) — kein Risiko, der Hauptfix bleibt.

---

## Shop [E]-Press-Purchase-Pattern (2026-05-09)

User-Bug: in Shop-Räumen genügte das Hineinlaufen in einen Pickup um ihn zu kaufen — keine Confirmation, accidental Buys häufig. Pivot zum gleichen `[E]`-Confirm-Pattern wie GemSeal + Stairs.

**Implementation in [GameScene.ts](src/scenes/GameScene.ts):**

- **`tryCollectPickup(pickup, player)`** — extrahierte Method aus dem alten `playerPickupOverlap` Callback. Beinhaltet die komplette Pickup-Pipeline: `canCollect` → key-gate (gold crate) → `tryPurchase` → `onCollect` → bookkeeping (looted, purchasedShopSlots, EventBus, label cleanup, destroy). Wird jetzt von **zwei** Pfaden gerufen:
  1. `playerPickupOverlap` für **non-shop** Pickups (drops, pedestals, crates) — auto-collect bleibt
  2. `tickShopInteract` für **shop slots** — gegated auf [E]-Press
- **`playerPickupOverlap`** macht jetzt nur eine early-return wenn `pickup.shopSlotIndex !== undefined` (= shop slot). Sonst → tryCollectPickup.
- **`tickShopInteract()`** — pro-frame in `update()`. Iteriert `this.pickups.children`, findet ersten aktiven Pickup mit `shopSlotIndex !== undefined` der mit dem Player overlaps (`physics.overlap`). Wenn der "active slot" sich vom letzten Frame unterscheidet, retext + repositioniert den shared `shopPrompt` Text-Element (oder hidet ihn). Auf JustDown(E) → `tryCollectPickup(activeSlot, this.player)`.

**State:**
- `shopPrompt: Phaser.GameObjects.Text | null` — single shared Text-Element, recycled across slots
- `shopPromptSlot: BasePickup | null` — tracking ref damit der Prompt nur bei Slot-Change re-rendered wird (cheap)

**Prompt-Label-Format** (`buildShopPromptLabel`):
- Heart-Slot → `[E]  BUY  HEART`
- Key-Slot → `[E]  BUY  KEY`
- Item-Slot → `[E]  BUY  <ITEM_NAME_UPPERCASE>` via neuem `ItemPickup.displayName` Getter (returnt `itemDef.displayName`)

**Visual:** Floating 56 px über dem Slot, Gold-Tint (`#fff8c0`) + 4-px-Stroke (`#1a0828`), Monospace 13 px bold. Tween-fade 140 ms in/out auf Slot-Change.

**Cleanup:** `shopPrompt?.destroy()` + Refs nullen in `tearDownActiveRoom` UND im SHUTDOWN-Reset (per-run-Felder bug-Pattern aus dem CLAUDE.md SHUTDOWN-Block).

**TS-Quirk:** `let activeSlot: BasePickup | null = null` mit closure-write in `pickups.children.iterate` → TS narrowte den outer-var auf `null` after closure. Workaround: `slotBox: { value: ... }` als mutable container, unwrappen nach iteration.

**Files-Touched:**
- [GameScene.ts](src/scenes/GameScene.ts) — `tryCollectPickup` extrahiert, `playerPickupOverlap` skipped shop slots, neue `tickShopInteract` + `showShopPrompt` + `hideShopPrompt` + `buildShopPromptLabel` + `shopPrompt` / `shopPromptSlot` State, update()-Hook
- [ItemPickup.ts](src/entities/pickups/ItemPickup.ts) — `displayName` getter

---

**DoD:** Spiel fühlt sich rund an, ist deploybar.

---

## Anweisungen für Claude Code

Wenn du an diesem Projekt arbeitest:

1. **Lies dieses File zu Beginn jeder Session.** Wenn die Roadmap-Phase unklar ist, frag nach.
2. **Halte dich an die Projektstruktur.** Lege neue Files am vorgesehenen Ort an. Falls eine neue Kategorie nötig ist, schlage sie zuerst vor.
3. **Erst Datentypen definieren, dann Logik.** Bei neuen Features (Items, Gegner, Räume) erst die Type-Interfaces in `types/` oder `data/`, dann Implementierung.
4. **Kleine Commits, klare Messages.** Eine Aufgabe = ein Commit.
5. **Schreibe Tests für Spiellogik**, die nicht von Phaser abhängt: RNG, Damage-Berechnung, Loot-Tables, Dungeon-Generation-Algorithmen.
6. **Keine Magic Numbers.** Konstanten nach `config/GameConfig.ts`.
7. **Wenn etwas mehrdeutig ist, frag nach** statt anzunehmen. Besonders bei Game-Feel-Fragen (Bewegungsgeschwindigkeit, Damage-Werte, Item-Effekte).
8. **Performance:** Object-Pools für alles, was häufig gespawnt/zerstört wird (Missiles, Partikel, Projektile).
9. **Update diese Roadmap.** Wenn ein Schritt erledigt ist, hak ihn ab. Wenn neue Aufgaben auftauchen, ergänze sie an passender Stelle.

---

## Floor System

Floors sind nach Edelsteinen benannt. Jeder Floor hat einen `FloorTheme` in `src/data/floors.ts` mit eigener Palette (floor/wall/ambient/glow), eigenem Enemy-Roster und eigenem Boss. Texturen werden in `PreloadScene` pro Floor generiert; Texture-Keys sind `tex-floor-<id>-<variant>`, `tex-wall-<id>`, `tex-mushroom-<id>` (Helper in `GameConfig.ts`). Hinzufügen eines neuen Floors = Eintrag in `FLOORS` + Enemy-Roster, kein Code-Edit.

**Map-Mode (TAB, erweitert in Phase 4):** TAB pausiert GameScene und zeigt einen großen `ExpandedMap` (cellSize 36) zentriert links + `PickedItemsList` (Items + Gems) rechts. Kleine Minimap blendet aus. Pfeiltasten + Enter teleportieren zwischen besuchten + gecleared Räumen, Maus-Hover bewegt Cursor, Klick teleportiert direkt. Drop-Indikatoren auf Cells für Räume mit übrigen Pickups (Heart/Coin/Key icons).

**PickedItemsList-Layout (rewrite 2026-05-09):** Frühere Implementierung benutzte fixed `ROW_HEIGHT = 44` — bei 2-Zeilen-Description (z.B. Mire Pearl mit "Pearl-blue missile.") überlief die Description in den Gem-Section-Divider und in den nächsten Item-Row hinein, weil `descText.height` ~32 px erreichte und nur 26 px Platz war. Außerdem konnte die Liste bei vielen Items unten aus dem Panel rauslaufen. Fix: **Two-pass dynamic Y-Layout**. Erster Pass paint detail-Layout mit `cursorY` der pro Row um `nameText.height + descText.height + ROW_GAP=10` advanced (statt fixed 44). Wenn `cursorY + projektierter Gem-Block > PANEL_BOTTOM_Y` (= GAME_HEIGHT - 24), clear + zweiter Pass im **Compact-Mode**: nur Icon (1.2× statt 1.7×) + Name (14 px statt 16 px), keine Description, 4 px Row-Gap. Cursor wandert in `cursorAfterItems` zwischen `paintItems` und `paintGems` weiter, sodass die Gem-Section bündig unter der letzten Item-Row landet. Compact-Mode triggert nicht weiter (last-ditch layout).

**Gem-Flavor-Text (2026-05-09):** Frühere Implementation hatte einen Hover-Tooltip auf jedem Gem-Row der `'Crystallized from a flawless victory'` neben dem Cursor anzeigte — der wurde aber rechts vom Panel abgeschnitten ("Crystallized from a..."). User-Fix: Tooltip komplett raus, Flavor-Text als gepinnte italic-Zeile (12 px, dim teal `#a8c8b8`) direkt unter dem "No-Hit Gems"-Header. `GEM_HEADER_HEIGHT = 50` macht Platz für Header + Flavor + 4 px Gap zur ersten Gem-Row.

**Spawn-Safety:** Beim Betreten eines uncleared Raums hält der Spawner mindestens `SAFE_SPAWN_DISTANCE` (3 Tiles) vom Spieler-Spawn ein, und der Spieler kriegt `ROOM_ENTRY_GRACE_MS` (700 ms) I-Frames als Sicherheitsnetz.

**Pickup-Persistenz pro Raum:** `RoomDescriptor.pendingPickups` snapshottet uncollected Drops beim `tearDownActiveRoom`. Restore in `enterRoom` plus clear of the field (live group nimmt's auf). Item-Pickups (Treasure-Pedestals, Gold-Crate-Items) snapshotten standardmäßig NICHT — sie werden über `desc.looted` getrackt oder sind ephemerial (Gold Crate items: must collect immediately). **Boss-Room-Ausnahme (2026-05-07):** Boss-Pool-Items + No-Hit-Gems haben keinen separaten Re-Spawn-Pfad — sie werden in `handleBossKilled` einmal gesetzt und nie wieder. User-Bug: Boss clearen, Raum verlassen ohne Item/Gem zu picken → beim Re-Entry waren beide weg. `tearDownActiveRoom` snapshottet Item + Gem jetzt zusätzlich wenn `desc.kind === Boss && desc.cleared`, mit `PickupSnapshot.itemId` (für Re-Spawn via `ITEMS[itemId]` + neuem `ItemPickup`) bzw. `PickupSnapshot.gemFloorId` (für Re-Spawn via neuem `GemPickup`). Treasure/Shop/Crate-Pfade unverändert.

**Boss-System (Phase 5):** `RoomKind.Boss` triggert in `enterRoom` einen Boss-Spawn statt normaler Enemies (`enemySpawnCount = 0` für Boss-Räume). `pickBossForFloor(floorId, rng)` mit Seed `${dungeonSeed}-boss` wählt deterministisch einen Boss pro Floor (Emerald + Sapphire haben jeweils 4 alternativen, Onyx hat einen Single-Boss `boss-marquis-of-mirages` — vorher Vampire Twins). `bossNoHitInProgress`-Flag wird auf `false` gesetzt sobald `player:tookDamage` während aktivem Boss-Fight (`activeBoss !== null`) feuert — **gated auf activeBoss, nicht room-kind**, damit `__wiz.spawnBoss` außerhalb echter Boss-Rooms auch korrekt trackt. Parallel: `bossDamageCount` zählt Hits unabhängig vom Flag als sanity-check. Bei `boss:killed`: Türen auf, Boss-Pool-Item-Pedestal + 2 Hearts in Mitte, Gem-Pickup wenn `flag === true && damageCount === 0`, **Treppe** wenn `hasNextFloor()`. Spawn-Protection 700 ms auf alle Reward-Pickups.

**Floor-HP-Scaling (Anti-Melt — replaces damage cap):** Zwei Ebenen, beide registry-driven so der Schaden lokal in `BaseEnemy.constructor` / `BossEnemy.constructor` bleibt.

*Mobs (per-floor static):* `FloorTheme.enemyHpMultiplier` — Emerald **×1.0**, Sapphire **×1.5**, Onyx **×2.0**. `GameScene.init` schreibt den Wert nach `registry.set('enemyHpMultiplier', …)`. `BaseEnemy.constructor` reads + applies: `this.hp = round(definition.hp × mult)`. Hält Mob-Threat in line mit Player-Damage-Growth über die Floors.

*Bosses (dynamic DPS-ratio):* Vor jedem Boss-Spawn ruft `GameScene.updateBossHpScale()` → berechnet `(currentDamage × currentFireRate) / (BASE_DAMAGE × BASE_FIRE_RATE)`, clamp ≥ 1.0, schreibt nach `registry.set('bossHpScale', …)`. **`BossEnemy.constructor`** liest den Wert nach dem `super()`-Call und überschreibt BaseEnemy's mob-mult-applied `this.hp` mit `round(definition.hp × scale)` (setzt auch `this.maxHp` direkt — `maxHp` ist nicht mehr abstract, alle Boss-Subclass-Overrides wurden entfernt). **Effekt:** Bosse fühlen sich immer wie ein Base-Stats-Fight an, weil HP linear mit Player-DPS skaliert. Phase-1/2/3-Special-Timer (P1=6s, P2=5s, P3=4s) feuern garantiert weil jede Phase HP-Block dieselbe Time-to-Kill hat egal welcher Build.

*Damage Cap entfernt:* `EnemyDefinition.damageCap` field + per-Boss-Werte + `BaseEnemy.takeDamage`-Clamp sind alle weg. DPS-Scaling löst das Anti-Melt-Problem ohne Plateau (Cap führte dazu, dass +1-dmg-Items nach 2-3 Stack wertlos wurden — jetzt skalieren sie linear in Boss-HP rein).

*Spawn-Site-Hookup:* `updateBossHpScale()` muss vor jedem `new BossClass(...)` Aufruf passieren — gerade in `spawnBossForRoom`, `devSpawnBoss`, **und `spawnLordOnyxInCurrentRoom`**. Falls jemand einen neuen Boss-Spawn-Pfad hinzufügt, muss er den Helper davor callen, sonst kriegt der Boss Scale 1.0 (wirkt wie altes Verhalten — nicht broken, aber dann ist die HP-Anpassung off).

**Floor-Transition (Stairs / Sigil):** `handleBossKilled` spawnt nach Loot ein **Magisches Sigil-Portal** (oben-mittig im Boss-Raum) auf `DepthLayers.FloorDecoration`, gerendert über die `TextureKeys.Stairs`-Texture (44×44 gold rune-disc — soft halo + outer ring + 4 cardinal spikes + 6-zackiger Stern + central glow). Texture ist floor-neutral weiß-gold; per-floor-Tint via `setTint` wäre möglich falls gewünscht. Zwei Tweens in-Scene: Scale-Pulse (0.96↔1.04, 900ms yoyo) + Slow-Rotation (8s pro full turn, repeat). **[E]-Confirm statt Auto-Overlap (2026-05-09):** `spawnStairsInCurrentRoom(onConfirm?, promptText='ENTER NEXT FLOOR')` — der alte Overlap-Collider ist weg, stattdessen polled `tickStairsInteract` per Frame `physics.overlap(player, stairsSprite)` + `JustDown(E)`. Floating "[E] ENTER NEXT FLOOR"-Prompt-Label (analog zur GemSeal-`[E] PLACE GEMS`-Mechanik) fadet 180ms ein/aus mit der In-Range-State. `stairsActionFired`-Latch verhindert dass ein gehaltenes E während des Fade-Outs doppelt feuert. Begründung: Spieler liefen ausversehen in den Sigil rein (z.B. wenn der Boss-Raum von oben betreten wurde), bevor sie Loot sammeln konnten — jetzt müssen sie aktiv bestätigen. Onyx-Exit überschreibt mit `'ENTER THE LIGHT'`. Auf Confirm → `advanceToNextFloor()`: Snapshot `RunCarryOver`, Camera-Fade-Out 260ms, dann `scene.stop(UI) + scene.start(Game, {floorIndex+1, floorId, carryOver}) + scene.launch(UI)`. `FLOOR_ORDER = ['emerald-forest', 'sapphire-swamp', 'onyx-mansion']`. Re-Entry des cleared Boss-Rooms respawnt das Sigil via `enterRoom`-Path. `tearDownActiveRoom` zerstört Sprite + Prompt + Action. (Internal naming `stairsSprite` / `TextureKeys.Stairs` / `spawnStairsInCurrentRoom` ist nicht umbenannt worden — nur die Texture + Animation sind neu. Cleanup-Pass möglich falls jemand Lust hat.)

**Onyx-Endgame-Flow:** Onyx ist der letzte Floor in `FLOOR_ORDER` — kein `advanceToNextFloor` möglich. Stattdessen branched `handleBossKilled` für Onyx: spawnt **GemSeal unten + Exit-Stairs oben** (nach dem Marquis-of-Mirages-Kill). Exit-Stairs zeigen "[E] ENTER THE LIGHT"-Prompt — auf Confirm emittet `run:onyxExitTaken` → `transitionToEndScene('incomplete')`. Seal-Overlap mit 3/3 Gems → cinematic + emit `seal:activated` → `handleSealActivated` schließt Türen + tearDown Stairs + 900ms Delay → `spawnLordOnyxInCurrentRoom`. Prismarch Death (`name === 'The Prismarch'` in payload) bypassed normal reward flow → `handleLordOnyxKilled` → `Cosmetics.unlockPrismancySkin()` + Camera-Flash + Shake + emit `run:onyxFullVictory` + recordRunWonFull → **900ms Delay → spawnt einen "[E] ENTER THE LIGHT"-Sigil im Raum-Center** (gleicher `spawnStairsInCurrentRoom`-Pfad wie der No-Gems-Exit, nur mit anderer Action = `transitionToEndScene('full')`). User-Wunsch (2026-05-09): direkter Auto-Fade nach Prismarch-Kill fühlte sich abrupt an — Spieler soll selbst ins Licht treten. Türen bleiben zu (handleLordOnyxKilled ruft kein openAllDoors auf), so dass der Sigil der einzige Fokus ist. **The Prismarch droppt KEINE Items** — nur Skin-Unlock.

**Onyx Standard-Boss-Item-Drop-Gate:** Auf Onyx Mansion droppt das Boss-Pool-Item nach dem Marquis-of-Mirages-Kill nur dann, wenn der Spieler nach diesem Kill alle 3 Gems hat (`currentGems + (noHit && !hasOnyxGem ? 1 : 0) >= 3`). Ohne 3 Gems würde der Spieler eh die Exit-Stairs nehmen und der Item wäre verschwendet. Hearts droppen weiterhin unconditionally (HP für Stairs-Path oder Prismarch-Vorbereitung). Andere Floors haben das Gate nicht — dort kommt der Spieler unweigerlich zum nächsten Floor und nutzt das Item.

**GemSeal Special-Hookup:** Seal hört auf `lordOnyx:specialFired { phase, x, y }` (emit aus `LordOnyx.startSpecialCharge` post-centering). Phase→Floor-Mapping: 1→Emerald, 2→Sapphire, 3→Onyx. Match-Gem fliegt vom Socket via 800ms Bezier-Bogen in den Boss-Prism, danach `clearSocket(floorId)`: Plate dimmt zurück auf empty-state-look (alpha 0.18, dark tint), Halo destroyed, kleines Burst-Visual am Socket. Sticky `consumedSockets`-Set verhindert Re-Fill via `addGem`. Listener wird in `GemSeal.destroy()` gecleant.

**GemSeal-Hint-Timing (2026-05-09):** "Slay thy fiends unscathed"-Hint hold jetzt 2500ms volle Alpha + 900ms Fade-Out via Sine.In (statt vorher 1600ms Sine.Out das ab Frame 1 gedimmt hat — der User konnte den Hint nicht zu Ende lesen, ~400ms legible). Y-Drift läuft über die ganze 3400ms-Dauer als subtile "ascending whisper"-Cue. `HINT_COOLDOWN_MS = 3400` matched die Hint-Dauer damit ein Re-Press während der Anzeige nicht overlappt.

**Cosmetic-Unlock-System:** `src/systems/Cosmetics.ts` mit localStorage backing (try/catch fallback für private browsing). Zwei Storage-Keys: `'prismancy.unlocks.lordOnyxBeaten'` (Unlock-Flag) + `'prismancy.cosmetics.selectedSkin'` (Spieler-Wahl). API: `hasPrismancySkin()`, `unlockPrismancySkin()`, `getSelectedSkin()`, `setSelectedSkin(skin)`, `resetAll()`. `SkinId = 'default' | 'prismancy'`. **Prismancy-Skin** (red/gold wizard) = Trophy für Lord-Onyx-Kill. `drawWizardTexture` in PreloadScene refactored mit `palette` + `textureKey` Parametern, generiert beide Variants up-front (`tex-player` + `tex-player-prismancy`). Player-Constructor + MainMenuScene-Wizard-Render lesen beide `getSelectedSkin()`. **Auto-Apply on first unlock + manual toggle**: kein expliziter Storage + skin unlocked → `'prismancy'` (trophy-reveal moment); explizit `'prismancy'` aber nicht unlocked → Fallback `'default'` (defense-in-depth). Toggle-UI in MainMenu (`[S] SKIN: ...` Hint + `S`-Key, gated auf `hasPrismancySkin()`) — `wizard.setTexture` swap ist live, Player-Sprite re-rendered beim nächsten scene start.

**Run-Restart:** Drei Wege um einen Run zu reseten:
1. **Game-Over-R:** `GameOverScene` poll'd `R` (und `Enter`) via `JustDown` im update-loop statt `keyboard.once` (Bug-Fix: paused-scene + `scene.start` racet, once-listener feuerte unzuverlässig). `restartTriggered`-Flag verhindert Doppel-Restart. Übergibt explizit `{floorIndex: 1, floorId: STARTING_FLOOR_ID}` an `scene.start(Game, ...)` damit Phaser nicht die alte run-payload weitergibt.
2. **Hold-R im Run:** GameScene polled `R` mit `JustDown`-Guard (sonst Endlos-Loop wenn R nach Restart weiter gehalten wird), zeigt Fill-Bar unten-mittig (`buildRestartHoldWidget`), nach `RESTART_HOLD_DURATION_MS = 1200` → `restartRun()` (kein carryOver, Floor 1 fresh). Symmetric mit Game-Over-Restart, nur reachable mid-run.
3. **MainMenu → Start:** Nach EndScene (Win oder Incomplete-Exit) zurück im MainMenu drückt der Spieler Space/Enter/click → `scene.start(Game, {floorIndex: 1, floorId: STARTING_FLOOR_ID})` mit **explizitem Payload**. Ohne den Payload survivt Phaser's `settings.data` aus dem letzten `scene.start` und der Run startet auf Onyx mit alter Carry-Over (User-flagged Bug 2026-05-07). Selber Fix wie Game-Over-R.

**Pause-Menü (ESC):** Eigene `PauseScene` als Overlay, registriert in `main.ts`. GameScene polled in `update()` `JustDown(ESC)` (gegated auf `!scene.isPaused()` damit es mit der Map nicht kollidiert) → `openPauseMenu()`: reset Hold-R-Widget, `scene.pause(Game)`, `scene.launch(PauseScene)`. **150ms Delay** vor Keyboard-Listener-Bind verhindert dass der ESC-Keydown der die Pause öffnet sofort wieder triggert.

**Layout (umgebaut 2026-05-08, MainMenu-style):** PauseScene rendert translucent black overlay (alpha 0.65) + "PAUSED" gold-Header (52 px) + **vertikales Center-Menu** mit 4 Items: `RESUME` / `OPTIONS` / `CONTROLS` / `BACK TO MAIN MENU`. Selber Hover/Focus/SFX-Mechanismus wie MainMenu — Mouse-Over UND Pfeiltasten Up/Down setzen Focus, scale tween 1.0 → 1.25 über 120ms, `playMenuSwitch` SFX bei jedem Focus-Change (nur wenn `previousIndex !== idx`). Hit-Area pro Item ist explizite 360×42 Rectangle (analog zur MainMenu-full-row-rect-Lösung) damit Cursor-Sweeps zwischen Items keine `pointerover`-Lücke produzieren.

**Activations:**
- `RESUME` → `scene.stop(Pause) + scene.resume(Game)` (auch via direktem `[ESC]` keydown egal welcher Item gerade focused, sodass Muscle-Memory "ESC öffnet, ESC schließt" garantiert ist).
- `OPTIONS` → `launchOverlay(SoundSettings)` mit dem MainMenu-Pattern (`scene.pause()` + `scene.launch(...)` + `events.once(SHUTDOWN, resume)`) damit ein ENTER zum Schließen des Overlays nicht die Pause-Item-Activation re-triggert.
- `CONTROLS` → `launchOverlay(Controls)` analog.
- `BACK TO MAIN MENU` → `scene.stop(UI) + scene.stop(Game) + scene.stop(Pause) + scene.start(MainMenu)` (greift auf den expliziten-Payload-Fix oben zurück, also kein State-Bleed).

`getMusicManager().duck()` beim Open + `unduck()` beim Resume oder Quit hält die Background-Music sauber dim während das Menü offen ist.

**SHUTDOWN-Reset:** `scene.restart()` zerstört Phaser-Children, lässt aber Class-Felder (`this.currentRoom`, `this.enemies`, `this.pickups`, etc.) als JS-Refs auf tote Objekte stehen. Im `Phaser.Scenes.Events.SHUTDOWN`-Handler nullen wir die Per-Run-Felder explizit (`undefined as unknown as Room` für `!:`-Felder, `null` für Union-Felder). Sonst sieht der nächste `create()` einen truthy `currentRoom` und `tearDownActiveRoom` knallt auf `this.enemies.clear()`.

**Hitbox-Tuning (User-Validated):**
- `PLAYER_HITBOX_RADIUS = 11` (war 13, davor 18). Letzte Reduktion **2026-05-07** nach User-Feedback "tight dodges fühlen sich unfair an, man wird getroffen ohne visuell am Projektil gewesen zu sein". Gleichzeitig **`PLAYER_HITBOX_OFFSET_Y = 10`** (war als Magic-Number `+12` direkt im Player.ts). Net: bottom des Kreises schrumpft ~4 px (bis kurz oberhalb der Stiefelspitze statt drauf), top des Kreises bleibt bei der Robe-Schulter — Hut weiter Hitbox-frei. Konfiguriert in `GameConfig.ts`, gelesen in `Player.ts:setCircle`.
- **`DepthLayers.Player = 75`** (war 50, jetzt über `Wall = 70`). Folgekorrektur zur +12-Body-Verschiebung: ohne den Depth-Swap clipped der Wizard-Hut visuell in die Top-Wall-Pixel rein (Body stoppt 1 px innerhalb der Wand-Tile, aber Hut ragt ~32 px über den Body). User-Wunsch war "z-index vom wizard über die Wand legen" statt die Wand-Collider zu extenden — gameplay-Hitbox bleibt genau gleich, nur die Render-Reihenfolge ändert sich. Enemies bleiben auf `Depth = 40` weil ihre Sprites kleiner sind und kein Hat-Issue gemeldet wurde.
- Rocks + Trees: **keine Hitbox**, reine Boden-Deko auf `DepthLayers.FloorDecoration` (unter Spieler/Gegner) — User-Feedback: Steine machten als Hindernis im Bewegungsfluss keinen Sinn, Bäume verbargen Pixies hinter ihrer Krone, und alles soll unter Spieler/Gegnern sein. `Room.treePositions` trackt die Tree-Positionen weiter, damit Pixie Queen zwischen Bäumen teleportieren kann.

**Boss-Knockback:** `BossEnemy.takeDamage` ignoriert den `knockback`-Parameter — andernfalls verlängert jeder Treffer `knockbackUntil` und die Boss-AI bleibt unter Sustained Fire dauerhaft gelockt (Bug: Mossy Behemoth wurde in die Ecke geschoben und blieb inaktiv). Hits flashen + applizieren Damage wie gehabt, Bosse bewegen sich aber ausschließlich durch ihre eigene AI.

**Pixie Queen Teleport:** Ziel wird in `onComplete` des Fade-Out-Tweens gepickt (nicht beim Start), und `PIXIE_QUEEN_FALLBACK_MIN_DISTANCE = 3 * 64` (war 2 * 64 = 128 px) — sonst kann der Spieler während der 200 ms Fade ins Ziel reinlaufen und die Queen materialisiert direkt auf ihm. **Min-Distance gilt für beide Teleport-Pfade** (war vorher nur für den No-Tree-Fallback): `pickTeleportTarget` filtert Tree-Candidates jetzt nach `minDistSq` gegen Spieler-Position UND skipped die aktuelle Tree-Position. Wenn alle Trees in einem Raum zu nah am Spieler sind, picked sie best-effort den weitest entfernten Tree statt zufällig — User-Bug "queen spawnte mehrmals direkt neben mir bei vollem HP-Verlust". **No-tree-Fallback (2026-05-07):** Boss-Räume skippen `scatterDecorations`, also ist `treePositions = []` — der alte 12-attempt-bounds-random-Fallback landete häufig in der Center-Fallback und gab das Gefühl die Queen würde "immer an dieselben 2 Stellen porten". Jetzt pickt sie aus einem festen 8-Anker-Perimeter-Raster (TL/TM/TR/ML/MR/BL/BM/BR der playable bounds) mit derselben safe-far-Logik wie die Tree-Variante. Garantiert varied teleport spots und ≥ minDist vom Spieler.

**Pixie Dancer Projektile:** `PixieDancer.tickAI` feuert alle `PIXIE_FIRE_INTERVAL_MS = 2400` ms einen aimed Thorn entlang der Sichtlinie zum Spieler. Initial-Delay `PIXIE_FIRE_INITIAL_DELAY_MS = 1200`. Factory in `entities/enemies/index.ts` reicht den `enemyProjectilePool` durch (gleicher Mechanismus wie Vine Sprout).

**Missile-Spawn-Position:** `Player.handleShooting` spawnt Missiles am `body.center` (= +12 px unter `this.y`), nicht am Texture-Center. Hintergrund: die Hitbox-Tuning-Verschiebung des Body nach unten heißt, dass `this.y` an der Top-Wall *innerhalb* der Wand liegt — Missile-Spawn dort kollidiert sofort mit der Wand und wird deaktiviert.

**Coin Drops von Gegnern:** `EnemyDefinition.coinDropChance` (0..1) wird in `BaseEnemy.die()` per `Math.random()` gerollt. Bei Erfolg fired `enemy:droppedCoin` Event mit `{x, y}`; GameScene-Listener spawnt einen Coin-Pickup. Aktuelle Werte (nach Playtest hochgesetzt — vorher max ~8 Coins/Floor): forest-sprite 0.40, pixie-dancer 0.45, mossy-slime 0.55, vine-sprout 0.65, alle Bosse 0 (haben eigenen Reward-Flow).

**DEV-Hooks** (nur `import.meta.env.DEV`):
- `__wiz.spawnTreasure()` — Treasure-Pedestal im aktuellen Raum
- `__wiz.simulateFloor2()` — markiert Treasure/Shop-Türen als locked zum Lock-Test
- `__wiz.spawnBoss(id)` — force-spawnt Boss im aktuellen Raum, schließt Türen, killt vorhandene Enemies. Emerald: `'boss-vine-lord'`, `'boss-mossy-behemoth'`, `'boss-pixie-queen'`, `'boss-forest-heart'`. Sapphire: `'boss-toad-sovereign'`, `'boss-bloomheart'`, `'boss-damselfly-empress'`, `'boss-bog-colossus'`. Onyx: `'boss-marquis-of-mirages'` (Standard-Boss, Single-Body Vampire-Mage mit Mirror-Portal-Special), `'boss-lord-onyx'` (Secret Endboss / The Prismarch).
- `__wiz.spawnLordOnyx()` — Convenience-Wrapper für `__wiz.spawnBoss('boss-lord-onyx')`. Skippt Vampire + Seal komplett.
- `__wiz.gotoFloor(n)` — restart auf Floor n (1=Emerald, 2=Sapphire, **3=Onyx**). Resettet alle Run-Stats; nur für Mob-/Theme-Testing. `DEV_FLOOR_ORDER` ist jetzt identisch mit `FLOOR_ORDER` (Onyx ist natural progression).
- `__wiz.giveGems()` — granted alle 3 Floor-Gems instant. Test-Pfad für GemSeal mit 3/3 Sockets ohne perfect runs auf jedem Floor.
- `__wiz.unlockSkin()` / `__wiz.lockSkin()` — toggle Cosmetics.unlockPrismancySkin / resetAll. Greift erst nach next scene start (Player + MainMenu lesen Cosmetics nur im Constructor). Kombo: `__wiz.unlockSkin()` + `__wiz.gotoFloor(1)` → Player ist jetzt rot/gold.
- `__wiz.spawnCrate(gold?)` — spawnt eine Crate (brown default, gold mit `true`) im aktuellen Raum mit ±48 px Position-Jitter damit jede Invocation einen anderen `crateSeed(x, y)` produziert (sonst gibt jede Invocation am selben Spawn-Spot identischen Loot — Re-entry-Replay-Verhalten ist gewollt im normalen Game, im Dev-Hook aber nicht).
- `__wiz.stats()`, `__wiz.itemSystem()` — Inspect

**`STARTING_COINS = 0`** in GameConfig.ts (war zwischenzeitlich 50 zum Testen). Spieler startet jetzt ohne Coins, muss alles von Gegnern + Crates + Drops sammeln.

**Geplante Progression:**
1. **Emerald Forest** (Floor 1) — implementiert inkl. 4 Bosse (Vine Lord, Mossy Behemoth, Pixie Queen, Forest Heart, random pick).
2. **Sapphire Swamp** (Floor 2) — implementiert. 4 Mobs (Bog Frog, Snapper Bloom, Damselfly, Bog Tortoise), 4 Bosse (Toad Sovereign, Bloomheart, Damselfly Empress, Bog Colossus). Eigene Decos (Lily Pad + Mangroven-Wurzel) statt der Forest-Decos via `decorationStyle`-Diskriminator.
3. **Onyx Mansion** (Endgame) — Vollständig implementiert. 3 Mobs (Wraith, Possessed Candelabra, Cursed Mirror — letzterer mit `minPerRoom: 1`), Painterly Atmosphere, **Marquis of Mirages** (single-body Vampire-Mage mit Caped-Conjurer-Silhouette, asymmetrisch, hand-mirror oval gehalten — replaces the previous Vampire Twins) als Standard-Boss: Phase 1 = kite + 5-thorn fan + teleport + **Mirror-Portal-Special** (entry/exit portals, 3 sequential homing missiles, entry destructible to nullify linked projectiles), Phase 2 = 8-arm spinning ring berserker bei ≤30 % HP. **GemSeal** + Exit-Stairs nach Marquis-Kill, **The Prismarch** als Secret-Endboss hinter dem Siegel: 3-Phase-AI mit ETG-style snappy base patterns (aimed Fan + drifting Cross / spinning Ring + walk-snipe / enrolling inward Waves mit Telegraph-Markern) + per-Phase Prism-Special (Forest Wrath / Tide Mandala / Crimson Web — letzterer als 14 pulsierende outward-waves mit Lightning-Bolts und durchschlängelbaren Gaps die zum Spieler zeigen), Center-Teleport vor jedem Special, Invuln während Charge/Fire/Recover, Boss-Texture als hooded High-Priest mit Prism (kein Crown/Scepter), Damage-Cap 3. **Cosmetic-Skin-Unlock** (Prismancy red/gold wizard) bei Prismarch-Kill. In `FLOOR_ORDER` als Floor 3 — Sapphire-Stairs descenden natürlich nach Onyx. Win-Screen-Variants (no-gems exit + full-victory) implementiert via `EndScene`.

Weitere Edelsteinfloors (Ruby/Topaz/...) können zwischen Sapphire und Onyx ergänzt werden. Floor-Reihenfolge wird in `FLOOR_ORDER` (`GameScene.ts`) gegated; Stairs verwenden den nächsten Eintrag.

**Door-System:** Türen rendern kind-aware Texturen wenn geschlossen, sodass der Spieler im Kampf sieht welche Räume anschließen. `Door.barrierTextureKey()` switch:
- `Boss` → `bossDoorKey(floorId)` (Totenkopf-Sigil, immer)
- `Treasure` → `treasureDoorKey(floorId)` (Goldtruhe), bei `locked` → `treasureDoorLockedKey` (Truhe + Eisen-Lock-Plate mit Schlüsselloch)
- `Shop` → `shopDoorKey(floorId)` (Goldmünze mit Tally-Marks — *nicht* "$"-Glyph, weil das beim Pixel-Scaling wie ein Schlüsselloch gelesen wurde), bei `locked` → `shopDoorLockedKey`
- `Normal` → `normalDoorKey(floorId)` (Holzplanken-Tür mit Eisenband + Ring-Griff)

Drawn in `PreloadScene` per Floor-Theme. `drawLockBadge` ist shared zwischen Treasure/Shop-Locked-Varianten.

**Locked-Door-Unlock-Gate:** Im Door-Trigger-Overlap-Handler in GameScene wird vor `tryUnlock` zusätzlich `desc.cleared` geprüft. Locked Doors lassen sich also nur entriegeln wenn der Raum bereits cleared ist — ein Schlüssel im Inventar bypasst nicht die "Türen zu im Kampf"-Regel. Vor dem Fix konnte ein Spieler mit Schlüssel mid-fight in den Treasure/Shop-Raum spazieren, was den Kampf umgehbar machte.

**Door-Trigger-Commit-Check (2026-05-09):** Open-Door-Übergänge werden zusätzlich durch `playerHasCommittedToDoor(door)` gegated. Hintergrund: Door-Trigger-Zonen sind 64×64 (full tile) und sitzen auf der Wall-Row. Phaser Arcade-Overlap zählt sich-berührende AABBs als Intersect (`<` und `>`, nicht `<=`), und beim Wand-Sliding sitzt die Spieler-Body-Bounding-Box mit Top-Edge bei y=64 direkt an der Trigger-Bottom-Edge bei y=64 — der Trigger feuerte sofort wenn man an einer Tür-Öffnung vorbeilief. Fix: Spieler-Body-Mitte muss entlang der Door-Achse über den Door-Tile-Mittelpunkt hinaus sein (`up`: `cy < ty`, `down`: `cy > ty`, `left/right`: analog auf x). Heißt: Spieler muss mindestens halbwegs IN das Door-Tile reinlaufen bevor Transition feuert. Locked-Door-Branch (Touch-to-Unlock) bleibt unverändert (separater Branch davor); Wand-/Barrier-Hitbox ist nicht angefasst.

**Door-Barrier-Seam-Snag (2026-05-09 — UNRESOLVED):** User-Bug "an den ecken hängen bleiben" auf vertikalen Türen geschlossener Räume, **specifically rechte Wand**. Aktuelle Implementation in `Door.close()` deaktiviert die Cross-Axis-`checkCollision`-Faces der Barrier-Body — vertikale Türen kriegen `up = false; down = false`, horizontale `left = false; right = false`. Theorie war dass Phaser's `getOverlapY` 0 returnt wenn entweder Body's Cross-Axis-Side disabled ist → Barrier separated nur noch auf der Door-Achse, kein Wrong-Axis-Push am Seam mehr. Wand-Tiles drüber/drunter haben volle 4-Side-Collision so dass der Player trotzdem nicht durchkommt.

**Status:** beide bisherigen Fix-Versuche (erstens `setSize`-Shrink mit 2px Cross-Axis-Margin, dann checkCollision-disable) haben den Snag auf der rechten Wand **nicht** behoben. Ob die linke Wand jetzt sauber ist, ist nicht bestätigt. Code-Trace findet keine Asymmetrie zwischen linker und rechter Wand (DOOR_TILE.W/E sind symmetric, walls werden symmetrisch gesetzt, Door-Texture ist nicht flipped, Player-Hitbox ist X-symmetric). Mögliche unaufgeklärte Ursachen: Phaser circle-vs-AABB corner-rolling-Quirk, Vite HMR der die Phaser-Scene nicht clean reloaded, oder ein right-wall-spezifischer Code-Pfad den ich nicht gefunden habe. Nächster Schritt = User-Repro-Clip + Debug-Logging in `Player.preUpdate` für Body-Position + Overlap-Werte. Worst-case-Fallback: Wall-Säulen als zwei lange Static-Bodies (oben + unten der Tür) statt 6 einzelne Tile-Bodies — eliminiert alle inneren Nähte, ist ein ~30-LOC-Refactor in `Room.buildWallsWithDoorGaps`. Siehe `next_session.md`.

**Item-Pool-Floor-Filter:** `pickItemFromPool(pool, rng, exclude, currentFloor?)` filtert nur den Boss-Pool nach `ItemDefinition.floor`. Treasure/Shop-Items haben bewusst kein Floor-Tag (sind floor-agnostic). Beim Boss-Reward übergibt `spawnBossPoolItem` den `currentFloorId`. Items ohne `floor`-Tag werden in jedem Boss-Pool gefunden — derzeit haben aber alle 9 Boss-Items einen Floor-Tag (3 Emerald + 3 Sapphire + 3 Onyx). Onyx-Pool: **Bloodbound Chalice** (+1 maxHP, +20% damage), **Vampire's Signet** (+25% fire rate, +15% missile speed), **Obsidian Heart** (+1 dmg, **+1 max HP** — refactored mit range-removal). The Prismarch droppt **kein** Pool-Item — nur den Cosmetic-Skin-Unlock.

**Floor-wide Item-Uniqueness (2026-05-07):** User-Bug: dasselbe Item lag gleichzeitig im Shop und in einem Treasure-/Boss-Raum, beim Aufpicken aus einem Raum disappearte der andere Slot (Shop-Slot-Render hidet via `pickedIds.has(item.id)`). Ursache: Treasure/Boss/Shop-Rolls excludeten nur `pickedIds`, kannten sich gegenseitig nicht. Fix: `GameScene.getFloorReservedItemIds()` aggregiert alle currently committed Item-Ids floor-weit — Shop-Slots (`desc.shopItemIds` minus purchased), Boss-Rewards (`desc.pendingPickups[].itemId`), Treasure-Pedestals (neuer `desc.treasureItemId` snapshot, analog zu shop), und live `ItemPickup`s im aktiven Raum (covers crate-Drops). Alle drei Roll-Pfade unionen das mit `pickedIds` als roll-time exclude. **Treasure-Snapshot** ist neu: `spawnTreasureItemAt(x, y, pedestalRoom?)` snapshottet beim ersten Treasure-Raum-Roll auf `desc.treasureItemId` und replayt bei Re-Entry — re-rollt nur falls der gespeicherte Item zwischenzeitlich von woanders gepickt wurde. Crate-Aufrufe lassen `pedestalRoom` weg → kein Snapshot (Crate-Items bleiben ephemerial). Shop-Slot-Render-Hide via `pickedIds.has` bleibt unverändert (Snapshot muss stable bleiben). Regression-Test: `ShopRoomBuilder` Build mit `floorReserved` set excludet jeden in der Reservierung gelisteten Item-Id.

**Range-Stat-Removal (Phase 5 Polish):** `range` als PlayerStats-Field komplett entfernt — Bosse waren auf base-range balanced, +40-50% range buffs trivialisierten sie. `BASE_PLAYER_STATS` ohne `range`, `Player.handleShooting` nutzt fix `MISSILE_LIFETIME_MS`. **Vier Items refactored**, die vorher range-Effekte hatten: `Telescopic Wand` → +20% fireRate, +15% missileSpeed; `Spyglass` → ehemals +1 dmg / +10% missileSpeed, **mit Floor-Scaling-Pass weiter umgebaut auf +1 maxHP / +10% missileSpeed**; `Mire Pearl` → +1 dmg, +20% missileSpeed; `Obsidian Heart` → +1 dmg, +1 max HP. Item-Texturen + Namen bleiben — nur die Effekte sind ausgetauscht.

**Floor-Scaling Item-Pool-Rebalance:** Mit Boss-DPS-Scaling und Mob-HP-per-Floor war der dmg-Stack-Pool zu fett (9 von 17 Items granted dmg → in 3-Floor-Run easy 3+ dmg ups → Floor-Mobs 1-shot, Bosses gemeltet bevor Specials feuerten). Zwei Treasure/Shop-Items wurden auf HP-Up umgebaut um die dmg-Source-Count zu reduzieren: **`Spyglass`** (war +1 dmg / +10% missileSpeed → jetzt **+1 maxHP** / +10% missileSpeed) und **`Pixie Dust`** (war +0.5 dmg / +60 missileSpeed / magenta → jetzt **+1 maxHP** / +60 missileSpeed / magenta). Beide nutzen `maxHealthBonus: 2` (= 1 full heart). Effective dmg-Pool nach diesem Cut: 7 Items, Treasure/Shop-Pool hat jetzt 3 HP-Quellen (Heart Container + Spyglass + Pixie Dust).

**Post-Cut-Re-Balance** (User-flagged: Treasure/Shop wurde zu fire-rate-lastig — Hot Tea + Telescopic Wand + Magic Potion = 3 fire-rate-Quellen vs nur 2 dmg-Quellen): zwei fire-rate-Items zurück auf dmg geswapt — **`Telescopic Wand`** (war +20% fireRate / +15% missileSpeed → jetzt **+1 dmg** / +15% missileSpeed) und **`Magic Potion`** (war +0.1 fireRate / +10 moveSpeed → jetzt **+0.5 dmg** / +10 moveSpeed; **rename + sprite-redesign 2026-05-08** von "Caffeine Pill" weil thematisch unpassend, neuer Sprite ist runder Glasflakon mit arcane-blue Liquid + Cork + Halo). Final: 9 dmg-Items (4 floor-agnostic + 5 boss-locked), 5 fire-rate-Items (1 in Treasure/Shop = Hot Tea, 4 boss-locked). HP-Scaling fängt das ohne Plateau ab — Bosse werden nicht mehr gemeltet wie vor dem ganzen Pass.

**EnemyProjectile.passThroughWalls** — boolean Flag (default false, reset on `fire()`). GameScene's wall / blocker / door-barrier Collider haben einen `processCallback` der `false` returned wenn `passThroughWalls === true` — überspringt Separation + Deactivate. Player-Damage-Overlap ist eine separate `physics.add.overlap` (nicht processCallback-betroffen) → Schaden funktioniert weiter. Bisher nur von **Crimson Web Wave-Thorns** gesetzt: ohne den Flag würden die Wave-Bolts despawnen sobald ein Thorn die Wand erreicht (deactivateMissile-Callback), was den Lightning-Bolt-Visual zerreißt. Mit Pass-Through fliegen die Thorns durch und expirieren erst nach voller `WAVE_LIFETIME_MS`.

**Missile-Modifier-System (Phase 6 — 2026-05-07):** Drei neue PlayerStats-Felder steuern die Missile-Modifier, datengetrieben über reguläre `ItemEffect`s:
- **`piercingCount`** (base 0): zusätzliche Hits nach dem ersten. Damage-Faktoren in `PIERCING_DAMAGE_FACTORS = [1.0, 0.75, 0.5]` — Index 0 = erster Hit voll, Index 1 = nach erstem Pierce 75 %, Index 2 = 50 %. Magic-Shard setzt das auf 2 → 3 Hits total.
- **`homingTurnRate`** (base 0 deg/s): max Turnrate pro Frame. Wizard-Glasses setzt das auf 80°/s — bewusst sanfter als Cursed-Mirror (110°/s) damit harte 90°-Cuts vom Spieler relevant bleiben.
- **`burnDamageFactor`** (base 0): Anteil des Hit-Damages der zusätzlich als Burn-DoT appliziert wird, gleich verteilt auf `BURN_TICK_COUNT = 2` Ticks à `BURN_TICK_INTERVAL_MS = 600` ms. Fire-Orb setzt das auf 0.30 → +30 % Schaden über 1.2 s.

**Wo lebt der Modifier-State:** Player liest in `handleShooting` die effektiven Stats aus `StatsSystem.getEffective(...)` und steckt sie in `MagicMissileFireOptions`. **`MagicMissile.fire`** kopiert sie in pro-Instanz Felder (`piercingRemaining`, `hitCount`, `burnDamageFactor`, `homingTurnRate`, `hitEnemies` Set). Der Pool injiziert via `setHomingTargetGetter(getter)` einmal beim Build einen Closure auf `GameScene.findNearestEnemyTo(x, y)` in jede Pool-Missile — die liest ihn pro Frame in `tickHoming`, dreht die Velocity gradweise (Δrad = turnRate × Δt) zum nächsten aktiven Gegner. **Pierce-Hit-Tracking** läuft über `missile.hitEnemies: Set<HomingTarget>` — wird in `fire()` gecleared, in `deactivate()` gecleared, der missile↔enemy-Overlap skippt einen Enemy wenn `hitEnemies.has(enemy)` damit Phaser-Overlaps die jeden Frame solang die Bodies overlappen feuern nicht zu Multi-Damage werden.

**Missile↔Enemy-Overlap-Flow:** (1) Enemy bereits im hitEnemies → return. (2) `factor = PIERCING_DAMAGE_FACTORS[min(hitCount, len-1)]`, hitDamage = damage × factor. (3) `enemy:hit` event → blood-Particles. (4) `enemy.takeDamage(hitDamage, knockback)`. (5) Falls `burnDamageFactor > 0` und enemy noch active → `enemy.applyBurn(totalBurn / TICKS, TICKS)`. (6) hitCount++. Falls `piercingRemaining > 0` → decrement, Missile fliegt weiter; sonst `deactivate()`.

**Burn-DoT auf BaseEnemy:** `applyBurn(damagePerTick, tickCount)` cancelt vorhandene Burn-Timer (latest-wins, kein Compound), schedulet N delayedCalls. Jeder Tick: HP -= damagePerTick + brief Tint-Flash (`BURN_TINT = 0xff8030`) + emit `enemy:burnTick` (GameScene spawnt Flame-Particles). Bei Death während Burn ruft `BaseEnemy.die()` `clearBurn()` als ersten Schritt — sonst könnten Pending-Tick-Callbacks nach dem Death-Tween zünden und `enemy:killed` doppelt feuern.

**Particle-Effekte (Phase 6 Einstieg):** `spawnBloodParticles(x, y)` aus `enemy:hit` event — 5 rote 2-3px Drops (`0xb83020`), gravity-arc-Tween (outward + slight down) über 240-320ms. `spawnFlameParticle(x, y)` aus `enemy:burnTick` — 3 Drops (1 gold-core + 2 orange) drift upward, 360ms. Beide self-cleaning via Tween-onComplete.

**Dev-Hooks für Modifier-Testing:** `__wiz.give(itemId)` appliziert direkt auf ItemSystem (skip pedestal+toast). `__wiz.spawnItem(itemId)` spawned ein Pedestal im current-room-center (= triggert pickup-Flow + Toast). `__wiz.listItems()` printed alle Item-Ids + Display-Namen. Beispiel: `__wiz.give('magicShard'); __wiz.give('wizardGlasses'); __wiz.give('fireOrb')` für Maximum-Stack-Synergy-Test. Für Active-Item-Test: `__wiz.give('bloodOfMarquis')` — equipped sofort den [Q]-Slot, locked max HP auf 2, applied +30% all-stats. Bypasst den `metaUnlock`-Gate (give zieht direkt aus `ITEMS`, nicht aus dem Pool).

---

## Active-Item-System (Phase 6 — 2026-05-09)

**Stack:** Single-Slot-System (eine Active gleichzeitig equipped, wie Isaac's Spacebar-Item). Trigger via [Q]-Key. Scope-Pivot: war 2026-05-07 als out-of-scope markiert; reaktiviert 2026-05-09 für Blood of Marquis, mit dem Vorbehalt dass die Infrastruktur generisch genug bleibt für künftige Active-Items + Charakter-Specials (Spellblade-Plan).

**Daten-Modell:**
- `ActiveItemKind` discriminator (aktuell nur `'echoesOfBlood'`). Neue Active = ein Eintrag hier + ein switch-arm in `GameScene.tryActivateActiveItem` + ein `active: { kind: '...' }` Field auf einer ItemDefinition.
- `ActiveItemSpec`-Interface trägt kind-spezifische Params (z.B. `bossDamageFraction` für Echoes).
- `ItemDefinition.active?: ActiveItemSpec` — picking the item equipped automatisch den Slot (siehe ItemSystem-Wiring unten).

**`ItemDefinition.maxHealthCap`:** Glass-Cannon-Field. Wenn gesetzt, `PlayerHealth.setMaxHealthCap(cap)` wird beim Pickup gerufen → max HP wird auf cap clamped + alle künftigen `addMaxHealth`-Calls werden zu no-ops. Heart Container / Pixie Dust / Lily Diadem etc. sind dadurch zu wertlosen Picks geworden — bewusster Trade-off des Glass-Cannon-Themes (User-Entscheidung).

**`ItemDefinition.metaUnlock`:** Optional. Wenn gesetzt (= stable enemy id wie `'boss-marquis-of-mirages'`), filtert `pickItemFromPool` das Item aus dem Pool aus solange `MetaProgress.hasBeatenBoss(metaUnlock) === false` ist. Nach erstem Marquis-Kill in irgendeinem Run wird Blood of Marquis ab dem nächsten Run im Onyx-Boss-Pool sichtbar. Existing items (Bloodbound Chalice etc.) haben kein metaUnlock → sind von Anfang an verfügbar.

**Systems-Wiring:**
- `src/systems/ActiveItemSystem.ts` — owner of equipped state. API: `equip(item)`, `clear()`, `getEquipped()`, `getEquippedItem()`, `hasEquipped()`. Emit `activeItem:equipped { itemId | null }` bei state-change.
- `src/systems/ItemSystem.ts` — Constructor nimmt jetzt zusätzlich `activeItemSystem: ActiveItemSystem | null`. `pickUp(item)` ruft `activeItemSystem.equip(item)` wenn `item.active !== undefined`, plus `playerHealth.setMaxHealthCap(cap)` wenn `item.maxHealthCap` gesetzt ist. **`hydrate(...)` macht beides synchron** damit ein Floor-Transition-Replay den Slot + Cap restored ohne Toast/SFX-Spam.
- `src/systems/PlayerHealth.ts` — neuer `maxCap: number | null` Field. `setMaxHealthCap(cap)`, `getMaxHealthCap()`. `addMaxHealth(amount)` no-op'd wenn `maxCap !== null`. `restore(current, max)` clampt max defensiv gegen den cap (paranoid gegen ein hypothetisches Carry-Over das den Cap nicht snapshotted). Plus `forceSetCurrent(value)` für self-sacrifice-Costs (skipt `tookDamage`-Event, emittet nur `healthChanged`).

**HUD-Slot (`src/ui/ActiveItemSlot.ts`):** Bottom-left, 22-px-radius Stone-Circle-Backdrop mit Gold-Trim-Ring + Item-Icon (1.6× scale) im Center + "[Q]"-Label drunter. State-Branches:
- Nichts equipped → Slot komplett unsichtbar
- Equipped + usable (HP ≥ 2) → full color, Trim-Ring 0.85 Alpha
- Equipped + un-usable (HP < 2) → Icon tinted `0x404048` + alpha 0.55, Label alpha 0.4, Trim 0.35 Alpha
- `activateItem:activated` event triggert kurzes Trim-Ring-Punch-Up (4-px Stroke + alpha-tween, 280ms)

Slot listened auf `activeItem:equipped` (rebuild Icon), `player:healthChanged` (refresh greyed-out), `activeItem:activated` (flash). Constructor primed from `registry.get('activeItemSystem')` + `registry.get('playerHealth')` damit floor-transition-rebuilds sofort den korrekten State zeigen ohne auf erste Hit-/Equip-Event zu warten.

**[Q] Wiring (GameScene):** `activeItemKey = input.keyboard.addKey('Q')`, polled in `tickActiveItem` (called every frame from `update()`). `Phaser.Input.Keyboard.JustDown` damit gehaltenes Q nicht doppelfeuert. Skipped wenn `inTransition`. Validierung in `tryActivateActiveItem`:
- `activeItemSystem.hasEquipped()` muss true sein
- `playerHealth.getCurrent() >= 2` muss true sein (universal HP-gate, alle aktuellen Specials kosten HP)
- Switch on `equipped.kind` → execute-method
- Bei Erfolg: `EventBus.emit('activeItem:activated', { itemId })`

**Echoes of Blood Implementation (`GameScene.executeEchoesOfBlood(bossDamageFraction)`):**
1. `forceSetCurrent(1)` — pay HP cost first (drops to 1 HP = 1/2 heart)
2. Snapshot `enemies.getChildren().slice()` weil chain-`enemy:killed`-Events das Group während Iteration mutieren würden
3. Pro enemy:
   - Wenn `enemy === activeBoss` → `enemy.takeDamage(round(boss.maxHp * 0.30))` — Phase-Threshold cross natürlich via `BossEnemy.takeDamage`
   - Sonst → `enemy.takeDamage(99999)` — overkill, killt jeden Trash-Mob (boss-room adds wie Slimes/Wraiths/Pixies werden so auch instant-killed, User-bestätigt)
4. Visual: 2 expandierende Phaser-Arc-Circles (outer ring crimson `0xc8284a`, inner core `0xff5060`) tween scale + alpha 0 → ROOM_DIAGONAL über 280-360ms. **Damage wird NICHT per-frame radius-checked** — applied instantly, weil der Wave eh den ganzen Raum trifft binnen der Tween-Duration. Plus `cameras.main.flash(220, 200, 30, 50)` red-wash + `shake(280, 0.008)`.

**SFX:** noch keiner gewired — kann via `playPrismExplosion()` oder eigenem Recipe gemapped werden falls gewünscht.

**Edge Cases:**
- Empty room + [Q] → costs HP für nichts (User-Footgun, akzeptiert — keine "must have enemies"-Gate damit UX nicht durch hidden gates verwirrt wird)
- HP cap + Heart-Pickup → Heart heilt von 1 auf 2 (cap), füllt das eine Heart wieder auf. Die `heal()`-clamp läuft gegen `max`, das vom cap gleichgesetzt ist
- Carry-Over: `co.healthMax = 2` wird snapshotted weil cap aktiv war, `restore(current, max)` clamp via `effectiveMax = min(max, maxCap)` defensiv
- Hydrate-Order: `setMaxHealthCap(2)` läuft VOR `addMaxHealth(...)` wenn beide an einem Item wären — Cap wins, weitere Bonus-Calls werden gegated
- Active in non-Onyx-Pool: Blood of Marquis hat `floor: 'onyx-mansion'` Tag, droppt nur auf Onyx-Boss-Pool-Roll. Marquis selbst kann es daher droppen (sofern in Run beat → unlock fired), aber Emerald/Sapphire-Bosse nicht

**Meta-Progression (Phase 6 — 2026-05-07):** Trophy/Collection-System mit single-slot versioniertem JSON-Blob in localStorage (`'prismancy.save.v1'`). Schema:
```ts
interface MetaSave {
  version: 1;
  bossesDefeated: string[];     // stable enemy ids
  itemsDiscovered: string[];    // item ids
  runs: { started, died, wonFull, wonIncomplete };
  bestRunMs: number | null;
  selectedSkin: SkinId | null;  // null = no explicit pick yet (auto-apply rule)
}
```

**Source-of-truth: `src/systems/MetaProgress.ts`.** Cached load/persist mit safe-localStorage-wrappern (try/catch + typeof-check für Node-Tests). API: `recordBossDefeated`, `recordItemDiscovered`, `recordRunStarted`, `recordRunDied`, `recordRunWonFull(ms)`, `recordRunWonIncomplete`, `hasBeatenBoss`, `hasDiscoveredItem`, `hasPrismancySkin`, `getSelectedSkin`, `setSelectedSkin`, `resetAll`, `forceReload` (test helper), `get` (snapshot). Cosmetics.ts ist jetzt nur noch eine Fassade die durchreicht — die alten Cosmetics-Callsites in Player/MainMenu/Dev-Hooks bleiben unverändert.

**Trigger-Hooks (where the records fire):**
- **`recordRunStarted`** — `GameScene.init` wenn `data.carryOver === null` (Floor-Transitions re-initieren mit carryOver !== null und feuern NICHT). Stash `runStartedAt` als Date.now() in `scene.registry` für die spätere Best-Time-Berechnung.
- **`recordRunDied`** — `handlePlayerDied` (player:died event handler).
- **`recordRunWonFull(durationMs)`** — `handleLordOnyxKilled` direkt vor `transitionToEndScene('full')`. Liest `runStartedAt` aus registry, computed `Date.now() - runStartedAt`. **Guard:** `durationMs <= 0` (z.B. dev-hook spawn ohne run-start) feuert das counter-increment aber updatet `bestRunMs` nicht (zero-time würde sonst sofort den Best-Run "schlagen").
- **`recordRunWonIncomplete`** — `handleOnyxExit` (no-gems exit stairs).
- **`recordBossDefeated(enemyId)`** — `handleBossKilled` für JEDEN Boss-Kill inklusive Prismarch. Payload erweitert um `enemyId: string` (BossEnemy.die() emittet jetzt `{ x, y, name, enemyId, noHit }` — stable id für rename-safety, displayName war vorher das einzige unique-feld und wurde bei "Lord Onyx → The Prismarch" rename instabil).
- **`recordItemDiscovered(itemId)`** — `ItemSystem.pickUp` direkt vor dem `item:picked` event-emit. Hydrate (floor-transition replay) ruft `pickUp` NICHT auf, also wird ein bereits in Floor 1 entdeckter Item nicht beim Hydrate-auf-Floor-2 doppelt geloggt.

**Migration:** beim ersten `load()` ohne v1-Blob → `migrateFromLegacy` liest die alten Cosmetics-Keys (`'prismancy.unlocks.lordOnyxBeaten'` + `'prismancy.cosmetics.selectedSkin'`) und seedet das neue Save. Alte Keys bleiben in localStorage stehen (nicht removed) damit ein hypothetisches Downgrade die Unlocks nicht verliert. Korrupte/wrong-version-Blobs → fresh save fallback (no crash).

**Auto-apply Skin-Rule:** `selectedSkin: null` + `hasPrismancySkin() === true` → `getSelectedSkin()` returnt `'prismancy'` (trophy-reveal-moment beim ersten Win). Explicit `setSelectedSkin('default')` nach Unlock → bleibt default. `'prismancy'` stored aber nicht earned (post-reset oder manuelle Storage-Edit) → fallback default. Diese Logik liegt jetzt in MetaProgress.getSelectedSkin, Cosmetics.ts ist Fassade.

**StatsScene** (`src/scenes/StatsScene.ts`) — overlay vom MainMenu via `[T]`-Key (analog zu PauseScene's ESC). 8 Zeilen Stats-Body (runs/bosses/items/fastest/skin), `[T]/[ESC]/[Q]` close, **Hold-`R` 1 Sekunde für reset** (Fill-Bar visualisierung damit accidental keypress nicht alles wiped). 150ms cool-off vor Listener-Bind verhindert dass der `T`-Keydown der das Overlay öffnet sofort wieder schließt. Reset triggert `MetaProgress.resetAll()` + `scene.restart()` damit die UI auf 0 zurückspringt.

**Total-Counts in StatsScene:** Bosses-Total = `Object.keys(ENEMIES).filter(id => id.startsWith('boss-')).length` = 10 (9 random-pick-Bosse + Prismarch). Items-Total = `Object.keys(ITEMS).length`. Beide leiten sich aus den Daten-Files ab — neue Bosse/Items im Catalog erhöhen das Total automatisch.

**Test coverage** (`tests/MetaProgress.test.ts`, 15 cases): empty save initial, idempotent boss/item records, run counter increments, bestRunMs nur bei real-time-runs, persistence round-trip via forceReload, legacy-migration, corrupt-blob fallback, wrong-version fallback, hasPrismancySkin computed from defeats, skin auto-apply, explicit-default override, prismancy-without-unlock fallback, resetAll wipes legacy keys. Nutzt eine MemoryStorage-Implementation via `vi.stubGlobal('localStorage', ...)` weil vitest's Default-Env `node` ist (kein localStorage).

**`ENEMY_PROJECTILE_POOL_SIZE = 96`** (war 32) — bumped für Crimson Web Density (5 koexistierende Waves × 11 Thorns/Wave = 55 peak, plus Headroom für andere bullet-hell-Patterns wie Bog Colossus Mandala / Marquis Berserker Stream / Damselfly Empress Phase 2).

---

## Visual / UX Polish

**Title Screen (Key-Art Illustration)** — `MainMenuScene.ts` ist als gemaltes Poster aufgebaut, nicht als Text-Menü. Layered Backdrop via `Phaser.GameObjects.Graphics`: Sky-Gradient (16-Strip Fake-Gradient von dunkellila → dunkelteal), pinker Mond-Halo (5 konzentrische Layer) hinter der Queen für ominöses Backlight, distanter Forest (Triangel-Tannen-Silhouetten) + mid-range Forest (Stamm + 3 überlappende Foliage-Circles), mossy Ground-Curve, Mist-Bands, ~15 Glühwürmchen (forest-grün + ein paar pixie-pink). **Wizard** (Player-Texture scaled 4x) links bei (240, GAME_HEIGHT/2+60) leicht nach rechts geneigt mit grün-goldener Glow-Aura unter den Füßen. **Pixie Queen** (BossPixieQueen-Texture scaled 4x) rechts bei (GAME_WIDTH-240, GAME_HEIGHT/2-30) leicht nach links geneigt, sanfter 1.8s Hover-Bob. **Action**: Magic-Missile-Streak (6 Beads entlang Quadratic Bézier vom Wand zur Queen, fade + Glow + Sparkle), Pixie-Thorn-Volley (3 Thorns mit Tracer-Streaks zurück). **Title** "PRISMANCY" 88px bold mit Stroke + Drop-Shadow + 2s Scale-Pulse. **Subtitle** pulst alpha 0.55→1 alle 900ms. Komposition rein prozedural, keine externen Assets.

**Themed Walls** (`PreloadScene.drawForestWallTexture` / `drawSwampWallTexture` / `drawMansionWallTexture`) — gebrancht über `theme.decorationStyle`. **Forest**: 4 vertikale Bark-Planks (14 px Wide + 2 px Gap) mit Outline + Highlight-Strip + Bark-Grooves + 0-2 Astknoten pro Plank, Moos-Krone oben (4 überlappende dunkelgrüne Domes mit Highlights + 3 Blatt-Silhouetten die rauspeeken), 1-3 Glühwürmchen mit Outline+Sparkle-Pixel in palette-glow Farbe. **Swamp**: Algen-Slime-Background, 5-6 vertikale Mangroven-Wurzeln segmentiert (8 px Stack-Segmente mit per-Segment Drift für organischen Look), Highlight + Shadow Strip pro Wurzel, dünne Teal-Algen-Threads quer drüber, 2-4 Sapphir-Glow-Knoten an Wurzel-Joints, hängende Algen-Strähnen am Top-Edge. **Mansion**: 4 stone-brick courses (22-px brickW, alternating offset bond) mit top highlight + bottom shadow strip, gold molding strip horizontal mit tally marks, **candle sconce** inset (bracket + flame + halo) deterministisch positioniert pro tile, 1-2 amethyst-glow cracks im mortar.

**Painterly Atmosphere Overlay** (`src/dungeon/RoomAtmosphere.ts`) — applies to **all rooms on all floors**, palette-driven via `theme.decorationStyle`:
- *Floor-level layers* (depth 1-3): radial floor vignette (6 stacked ellipses warm-core → dark-edge), 30 painterly mossy/algae/parquet patches scattered (3-tone blobs + sparkle pixels via deterministic RNG keyed by `decorationSeed`), 3 diagonal light shafts (warm green-gold for forest / cool moonlight for swamp / candle-gold for mansion)
- *Wall-band overlay* (depth 71, **above** wall tiles): per-style continuous painterly band that visually replaces the repeating tile look. **Forest**: layered canopy (jagged distant treeline + 3-tone overlapping foliage circles + bright caps), mossy ground band, vertical bark slivers with moss-fringe inner edge. **Swamp**: stone-arch ridge with hanging algae strands + sapphire glow pendants top, muddy bank with cyan algae fringe bottom, mangrove root pillars with cyan glow knots sides. **Mansion**: stone-brick vault courses + gold molding + 5 wall sconces top, red velvet runner with gold trim + tassels bottom, brick courses with gilt molding + 4 mini-portraits (gilt frames with glowing red eyes) per side. **Door-aware gaps** — `paintWallBands` accepts `descriptor.doors`, computes per-tile gap ranges via `doorGap(tx)` + `inGap()` helpers; iterative painting loops skip door pixel range, solid strips split into 2 fillRects via `fillRectGapped` / `fillRectVertGapped` so the door sprite stays visible at its tile.
- *Sky-level layers* (depth 45+): 3 mist bands across lower floor, **14 fireflies** (forest = green+pink mix / swamp = cyan+sapphire / mansion = **gold+amethyst dust motes** instead of fireflies for theme) with outline + palette-glow + sparkle pixel, gentle alpha pulse 0.85→1, edge vignette overlay (depth 990, just below HUD).
- *Decoration glow halos* — `paintDecorationHalo(scene, cx, cy, theme, 'small'|'medium')` painted at depth `FloorDecoration - 1` under each tree/rock/mushroom in `Room.placeTree/Rock/Mushroom`, palette-driven. Hooked from `Room.atmosphere`.
- Lifetime: `RoomAtmosphere` instance owned by `Room`, all Graphics + tweens tracked, `destroy()` cleans up. Created after `buildFloor + buildWalls` in Room constructor.

**Forest Decoration Polish** (`drawTreeTexture` / `drawRockTexture`) — beide neu gezeichnet damit sie zur Sapphire-Polish-Latte (zentraler Anker + radiales Detail + 4 Tonbänder + Outline+Sparkle-Pixel) passen. **Tree**: asymmetrische Foliage-Crown mit 4 Tonbändern (deep shadow / mid green / upper highlight / brightest), Wurzelflanken am Stammbase, getaperter Stamm, herausragende Blatt-Silhouetten an der Krone, 3 Glühwürmchen mit Outline+Sparkle in Glow-Farbe. **Rock**: asymmetrischer Doppelkörper (Hauptkörper + side lump) statt Single-Ellipse, 4 Tonbänder, Moos-Cap mit Drip-Tendrils, **Smaragd-Kristall-Cluster** auf der Krone als Echo der Mangroven-Glow-Nodes (3 dreieckige Shards mit Glow-Fill + Highlight-Pixel).

**Wand Sparkle on Cast** (`Player.spawnWandSparkle`) — 3.5 px goldener Funke (`0xfff8c0`) am Wand-Tip (Sprite-relativ +15, +3 vom Center, eine Layer über `DepthLayers.Player`) bei jedem Schuss. Fadet alpha + scale via Tween über 150 ms, self-cleaning. **Wichtig**: Body-Animation (Walk-Bob via Scale + Rotation, Shoot-Kick via Lean) wurde versucht und verworfen — Sub-Pixel-Verzerrung auf Pixel-Art-Sprites sieht durchgehend falsch aus. Saubere zukünftige Path: Multi-Frame Sprite-Sheet (Walk-Cycle A/B + Cast-Frame), kommt in Phase 6.

**Wizard Sprite — Painterly V2 (2026-05-07)**: `drawWizardTexture` in PreloadScene wurde komplett umgebaut von der alten PX-2 pixel-block-Grid-Methode auf den painterly fillPoints-Silhouette-Stil der Boss-Texturen. User-flagged dass der pixel-art-Wizard nicht mehr zur upgegradeten Atmosphere + den painterly Bossen passte. Variant C "Compact Wizard" aus StyleMockupScene Page 7 wurde nach Iteration als finale Texture gewählt:
- **Wand-Pose**: D-style front-held (vor dem Körper) aber mit deutlich steilerem Tilt — Tip zeigt up-right über die Schulter statt fast horizontal. Hand auf Wand auf Brust-Höhe (D's idiom), kein Sleeve gerendert (Arm wird implied).
- **Größe**: Figur span y=8 (orb) bis y=54 (boots) = **46 px painted region** in der 64×64 texture (was 52 px in der pixel-art-Version, nochmal 4 px geshrinkt nach User-Feedback "etwas kleiner machen"). Heroischere Proportionen, Wizard wirkt nicht mehr dominant im Raum.
- **Hitbox unverändert**: `PLAYER_HITBOX_RADIUS = 11` + `PLAYER_HITBOX_OFFSET_Y = 10` leben in GameConfig und sind world-space-stabil — Texture-Größe-Änderungen ändern den Collider nicht. Die untersten ~8 px der Hitbox sind nach dem Shrink visuell unter den Stiefeln (war beim alten Pixel-Art-Wizard ähnlich, kein gameplay-relevanter Unterschied).
- **Palette-Interface** (OUT/HAT/HAT_DARK/HAT_HI/SKIN/SKIN_SHADOW/ROBE/ROBE_HI/ROBE_SHADOW/BEARD/BEARD_SHADOW/BUCKLE/WAND/TIP/SHADOW/BOOT/BOOT_HI/EYE/TIP_SPARKLE) bleibt unverändert — die Default-Purple und die Prismancy-Crimson-Skins picken automatisch beide den neuen Style auf. MainMenu-Title-Screen rendert über dieselbe `TextureKeys.Player` und zeigt automatisch die neue painterly Variante.

---

## Audio System (Phase 6 — 2026-05-08)

**Stack:** Echte AI-generierte MP3-Tracks (Suno) + ein scene-unabhängiger MusicManager-Singleton mit RAF-basierten Crossfades. Ersetzt einen früheren prozeduralen Web-Audio-Versuch (3 Tracks, lookahead-Scheduler) der wieder rausgeflogen ist — proceduraler Sound passte nicht zum painterly Aesthetic. Git-History hat den prozeduralen Code falls je benötigt; aktuell ist nur das echte-Track-System aktiv.

### Track-Files
**Location:** `public/audio/music/` (Vite serves `public/` als root). 9 erwartete Tracks:
- `title.mp3` — Title-Theme, läuft auf MainMenuScene
- `floor-emerald.mp3` / `boss-emerald.mp3` — Floor 1 idle / Boss
- `floor-sapphire.mp3` / `boss-sapphire.mp3` — Floor 2 idle / Boss
- `floor-onyx.mp3` — Floor 3 idle
- `boss-marquis-of-mirages.mp3` — Onyx Standard-Boss
- `boss-the-prismarch.mp3` — Secret Endboss
- `victory-credits.mp3` — Run-Finale-Theme, läuft auf EndScene (beide variants — full + incomplete)

Filenames sind **content-based** (nicht "boss-onyx" etc.) damit erkennbar bleibt was wo läuft. `MusicTrackKey` in `MusicManager.ts` ist auf diese Filenames gemappt — bei Rename muss beides synchronisiert werden.

### MusicManager (`src/systems/MusicManager.ts`)
**Singleton** (via `getMusicManager()`), hält das aktive Phaser-Sound-Object und einen Master-Volume + Duck-Level. API:
- `playTrack(scene, key, opts?)` — switches mit Crossfade. No-op wenn der Track schon läuft. Wenn Track im Cache fehlt: **bleibt der current Track weiterspielen** (kein abrupter Stop bei missing files). Opts: `fadeMs` (crossfade duration, default 1200) + `firstPlayFadeMs` (used wenn `current === null`, default 120ms snap; cinematic Callsites wie EndScene können das auf 1600ms hochsetzen für swell-in).
- `stop(scene, opts?)` — Fade-out + cleanup. Default 600 ms.
- `duck(level=0.3)` / `unduck()` — instant Volume-Multiplikator (für Pause-Menu).
- `setMasterVolume(0..1)` / `getMasterVolume()` — speichert auf der Singleton, nicht persistiert. SoundSettingsScene's Slider hängt hier dran.
- `getCurrentKey()` — returnt aktuellen `MusicTrackKey | null`. Used von MainMenu's `setupTitleMusicHint` um zu checken ob Title-Track schon spielt.
- `hardStop()` — escape hatch, no-op fade.

### RAF-basierte Fades — kritisches Detail
Frühere Implementierung verwendete `scene.tweens.add(...)` — das **bricht** beim Scene-Wechsel weil Phasers TweenManager scene-bound ist. Sichtbarstes Symptom: MainMenu→Game-Crossfade hatte keinen hörbaren Title-Fade-Out. Aktueller `startFade(sound, fromVol, toVol, durMs, onComplete?)` läuft als `requestAnimationFrame`-Loop — browser-global, scene-unabhängig. Pro-Sound-Generation-Token in einer `WeakMap<BaseSound, number>` invalidiert in-flight Fades wenn ein neuer auf demselben Sound startet. Try/catch um `setVolume` damit destroyed sounds keine Errors throwen.

**Default Fade-Durations:**
- Crossfade Track→Track: 1200 ms
- Stop (z.B. Game-Over, EndScene): 600 ms (800 ms beim Player-Death)
- First-Play (kein vorheriger Track): **120 ms** statt 1200 ms — sonst bleibt der Title-Track auf halber Lautstärke wenn der User schnell SPACE drückt, und der Title→Game-Fade-Out ist dann von der niedrigen Volume aus kaum hörbar. Mit 120 ms ist der Initial-Track in <1/8 Sek auf voller Lautstärke und der nächste Crossfade beginnt von 0.55.

### Browser-Autoplay-Workaround
WebAudio-Context bootet im `suspended` State, entsperrt nur bei erstem User-Gesture. Phaser handlet das via `sound.locked` Flag. Title-Musik-Logik in `MainMenuScene.create`:
```ts
if (!this.sound.locked) {
  getMusicManager().playTrack(this, 'title');
}
```
Erster Page-Load: Audio gesperrt → Title-Musik wird **nicht** abgespielt. Ein SPACE startet das Spiel direkt (keine Two-Step-Hürde). Nach dem ersten Run (User hat irgendwann interagiert → Audio entsperrt) → Title-Musik spielt sofort beim Rückkehr ins MainMenu. User-Decision (2026-05-08): "Title-Musik nur ab zweitem Visit" gegen Two-Step-Start mit Hint.

### Scene-Wiring
- **MainMenuScene** — Title-Track (siehe oben), plus 260 ms Camera-Fade-to-Black auf SPACE → GameScene mirror der Floor-Transition.
- **GameScene.create** — startet Floor-Track basierend auf `currentFloorId` via `floorIdToFloorTrack(floorId)`.
- **GameScene.spawnBossForRoom** + **devSpawnBoss** + **spawnLordOnyxInCurrentRoom** — alle rufen `switchToBossTrack(boss.displayName)` direkt nach `boss:spawned` Event. Predikat `displayName === 'The Prismarch'` routet auf `boss-the-prismarch`-Track, sonst pro Floor via `bossTrackForFloor(floorId, isPrismarch)`.
- **GameScene.handleBossKilled** — switcht zurück zum Floor-Track. Prismarch-Branch geht zu `handleLordOnyxKilled` der `transitionToEndScene('full')` triggert (kein switch-back).
- **GameScene.handlePlayerDied** — `stop(scene, { fadeMs: 800 })` damit der GameOver-Banner in Stille landet.
- **GameScene.transitionToEndScene** — `stop(scene, { fadeMs: 600 })` parallel zum Camera-Fade. EndScene picked das Credits-Theme mit cinematic swell-in auf der anderen Seite des Fades.
- **EndScene.create** — `playTrack(this, 'victory-credits', { firstPlayFadeMs: 1600 })` startet sofort wenn die Scene aufgeht (Headline-Fade-In synchron). **EndScene.returnToMenu** — `stop(this, { fadeMs: 600 })` beim manuellen Back-to-Menu, MainMenu's Title-Track picked up.
- **PauseScene.create** — `duck()` beim Open, **PauseScene.resumeGame** + **PauseScene.quitToMainMenu** — `unduck()` beim Schließen.
- **PreloadScene.preload** — `loadMusicTracks()` queue't alle 9 Tracks via `this.load.audio(key, ...)`. Fehlende Files werfen `loaderror` aber crashen nicht — `MusicManager.playTrack` checkt `cache.audio.exists` vor dem Switch und behält bei Miss den current Track.

### MainMenu-Redesign (Phase 6 — 2026-05-08)
Komplett vom alten "PRESS SPACE OR ENTER" Center-Prompt-Layout auf ein **vertikales Menü links** umgestellt. Items:
1. **START GAME** — existing fade + scene.start mit fresh-run Payload
2. **OPTIONS** — `launchOverlay(SceneKeys.SoundSettings)` (Master-Volume-Slider, ESC/Q schließt)
3. **STATS** — `launchOverlay(SceneKeys.Stats)` (existing trophy/collection-overlay)
4. **CONTROLS** — `launchOverlay(SceneKeys.Controls)` (read-only Liste der Keybindings)
5. **CLOSE GAME** — `try { window.close() }` + Fade-to-black overlay mit "THANKS FOR PLAYING" + "Refresh page to return". `window.close()` ist no-op in normalen Browser-Tabs aber funktioniert in Electron/Popup-Windows.

**Layout:** x=44, ab y=200, 38 px Line-Height, 22 px Bold-Monospace-Font. Text origin (0, 0.5) = left-aligned. Items überlappen leicht mit der Wizard-Aura (Wizard ist bei x=240) — strong stroke (`#1a0828`, thickness 4) + drop-shadow macht's lesbar. Default-Color `#aab8c0`, Hover/Focus-Color `#fff8c0` (Gold).

**Hover-Effekt:** Mouse-Over ODER Pfeiltasten Up/Down setzen Focus auf das Item, scale tweened auf **1.25×** über 120 ms via `tweens.add({ scale, duration: 120, ease: 'Sine.Out' })`. `tweens.killTweensOf` vor jedem Tween verhindert Queue-Up bei schnellen Mouse-Sweeps. **Hit-Area** ist explizite `Phaser.Geom.Rectangle(0, -hitH/2, hitW, hitH)` mit `hitW = GAME_WIDTH - MENU_ITEM_X * 2` und `hitH = MENU_ITEM_LINE_HEIGHT` — User-flagged Bug: ohne den expliziten Rect-HitArea schiebt der focus-scale-tween (1.0 → 1.25) die visible glyphs über die un-scaled tight text bounds raus, der Cursor zwischen Items fällt durch eine kurze Lücke und `pointerover` feuert nicht → menu-switch-SFX läuft nur auf Tastatur, nicht bei Mouse-Hover. Mit dem full-row-Rect immer reproducible. Identisch in PauseScene (siehe Pause-Menü-Block).

**Aktivierung:** Click auf Item ODER `keydown-ENTER` / `keydown-SPACE` triggert `activateMenuItem(focusIndex)`. `menuStarted` Boolean lockt das ganze Menü nach Start-Game oder Close-Game damit ein zweiter Klick keinen doppelten Start auslöst.

**Overlay-Pause-Pattern:** `launchOverlay(key)` ruft `this.scene.pause()` + `this.scene.launch(key)`, dann `events.once(SHUTDOWN, ...)` auf der Overlay-Scene um MainMenu beim Close wieder zu resumen. **Wichtig:** ohne den Pause würde ein ENTER-Druck zum Schließen der Overlay den darunter fokussierten MainMenu-Item gleichzeitig aktivieren.

**Was raus ist:** Pulsing "PRESS [SPACE] OR [ENTER]" Subtitle (`paintTitle`), "MOVE WASD · CAST ARROW KEYS" Bottom-Hint (jetzt in ControlsScene), "[T] STATS" Standalone-Hint (jetzt im Menü), **dev-only `[M] → StyleMockupScene`-Binding** (M ist jetzt für Title-Music re-purposed, siehe nächster Punkt). Geblieben: Title-Image + Title-Pulse + `[S] SKIN: ...` Toggle (User-Wunsch: bleibt als Hotkey, nicht im Menü).

**`[M] PLAY TITLE MUSIC`-Hint** (`setupTitleMusicHint`): bottom-right Hint-Label das **nur sichtbar ist wenn `getMusicManager().getCurrentKey() !== 'title'`**. Coverage-Case ist der erste Page-Load mit lockedem WebAudio-Context: die `if (!this.sound.locked) playTrack(...)` Guard im `create()` macht den Title-Track silent auf Visit 1, der Hint surface das + bindet `keydown-M` an `playTrack(this, 'title')` (key-press doubles als WebAudio-Unlock-User-Gesture). Sound startet, Hint fadet 400ms aus + destroy. Auf Visit 2+ ist der Track bereits am Spielen (Audio-Context unlocked, autoplay läuft) → `getCurrentKey() === 'title'` → Hint wird gar nicht gerendert.

### SoundSettingsScene (`src/scenes/SoundSettingsScene.ts`)
Overlay nach StatsScene/PauseScene-Konvention. Translucent Backdrop, "SOUND SETTINGS" Title, **Master-Volume-Slider** (280×12 px, Gold-Fill, klickbar + dragbar) mit `${Math.round(v*100)}%` Label. Hängt direkt an `MusicManager.setMasterVolume`. ESC/Q schließt. 150 ms Cool-off vor Listener-Bind verhindert Selbst-Schließen durch öffnenden Keydown.

**Future-Sub-Settings (nicht implementiert):** SFX-Volume-Slider (sobald Phase 6 SFX läuft), Music-Mute-Toggle, Audio-Settings-persist via `MetaProgress.save`. Aktuell ist Master-Volume **nicht persistiert** — beim Reload steht's wieder auf 0.55.

### ControlsScene (`src/scenes/ControlsScene.ts`)
Reine Read-Only-Anzeige der Keybindings als zwei-Spalten-Tabelle (Action | Keys). Items:
- Move: WASD
- Cast Magic: Arrow Keys
- Map / Inventory: TAB
- Pause: ESC
- Restart Run: Hold R (1 s)
- Stats Overlay: T (from Main Menu)
- Skin Toggle: S (from Main Menu, after unlock)

ESC/Q schließt. Wenn echtes Keybinding-Remap kommt (out-of-scope für aktuelle Iteration), würde diese Scene umgebaut werden zu interaktiven Bindings.

### SOUNDTRACK_BRIEF.md + SOUNDTRACK_SUNO_PROMPTS.md
Beide Dateien liegen weiterhin im Repo-Root als Reference für Track-Generation. `SOUNDTRACK_BRIEF.md` ist der ausführliche Briefing-Brief (Lore, Mood-Tags, Length-Vorschläge). `SOUNDTRACK_SUNO_PROMPTS.md` hat tight Suno-spezifische Style-Prompts mit Anti-Cinematic-Tricks. Beide sind nicht zur Build-Zeit relevant aber hilfreich falls Tracks neu generiert werden müssen.



**`WORLD_SPRITE_SCALE = 1.25`** in `GameConfig.ts` — visual-only sprite scale-up für **alle in-world entities** (Player, Enemies, Bosses, Pickups, Decorations, Item-Pedestals + Items, Stairs). Tile-Texturen (Floor, Wall, Door) werden **nicht** skaliert (würden Tile-Grid-Lücken erzeugen). Bosse haben eigene `*_VISUAL_SCALE`-Konstanten die alle mit `* WORLD_SPRITE_SCALE` multipliziert sind, damit ihre relative scale (z.B. VineLord 2.5×) erhalten bleibt + global mit-skaliert.

**Hitbox-Compensation für `WORLD_SPRITE_SCALE`** — Phaser skaliert Physics-Bodies automatisch mit `setScale`. Damit der Body in **World-Coords** identisch zu vor dem Visual-Bump bleibt (kritisch für door triggers, wall collision, pickup distance), dividieren `Player.ts`, `BaseEnemy.ts`, `BasePickup.ts` ihre `setCircle`-Inputs durch `WORLD_SPRITE_SCALE`. Phasers Auto-Scale multipliziert wieder zurück → effektive Hitbox = authored radius. Specifically:
```
const radius = AUTHORED_RADIUS / WORLD_SPRITE_SCALE;
this.setCircle(radius, halfW - radius, halfH - radius);
```
GemPickup + ItemPickup haben extra `setScale(1.8 * WORLD_SPRITE_SCALE)` für die größeren Trophy/Item-Icons. **Wenn diese Compensation fehlt, bricht das Locked-Door-Trigger-Overlap** (locked door barrier + trigger zone overlap on same tile, edge-touching gilt nicht zuverlässig als Phaser overlap → key won't unlock). 1× passiert in dieser Session, einmal gefixt — bleibt ein Trap if jemand neue scaled sprites hinzufügt ohne die Compensation.

**`CAMERA_ZOOM = 1.0`** in `GameConfig.ts` — bewusst NICHT 1.25, weil Camera-Zoom + scrollender Raum den Spielfeld-Überblick zerstört (kritisch für Bullet-Hell auf Floor 2+). Sprites werden via WORLD_SPRITE_SCALE größer dargestellt, der Raum bleibt immer komplett sichtbar.

**`StyleMockupScene`** (`src/scenes/StyleMockupScene.ts`) — dev-only mockup viewer im MainMenu via `M` taste (gegated mit `import.meta.env.DEV`). 4 pages, TAB cycles:
1. *Backdrop comparison*: links current (real in-game textures) vs rechts proposed (painterly redo). Useful für visual style discussions.
2. *Emerald Showcase*: Wizard vs. Pixie Queen full-screen painted gameplay frame mit allen Atmospheric Layers + Combat-Effects + Boss HP Bar.
3. *Sapphire Showcase*: Wizard vs. Toad Sovereign mit cyan halos + sapphire-themed atmospheres.
4. *Onyx Showcase*: Wizard vs. **Lord Onyx** mit gothic mansion atmosphere + dust motes + amethyst shards. **Lord Onyx visual hier ist die Vorlage** für den Boss in Phase 5 Chunk 4 — User hat geflagged dass die Optik einen Rework braucht. `paintLordOnyx` + helpers (`paintWraith`, `paintPossessedCandelabra`, `paintCursedMirror`, `paintChandelier`, `paintWallSconce`, `paintPortrait`, `paintBrokenColumn`, `paintCandelabrum`, `paintCrackedVase`, `drawOnyxCrownIcon`) sind alle in StyleMockupScene als prozedurale Graphics — ports auf `PreloadScene` als Texturen wenn die ingame versions fertig werden.

---

## SFX System (Phase 6 — 2026-05-08)

**Stack:** 20 procedural 8-bit-Synth Recipes via Web Audio API in `src/systems/SfxSynth.ts` — kein File-Asset, alles Square/Triangle-Oszillatoren + ADSR-Envelopes + gefilterter Noise. Singleton mit lazy-init AudioContext + Master-Gain. `getSfxSynth()` Accessor. Volle Recipe-Doku + Voice-Gains + Wiring-Spots in `SFX_BRIEF.md` (Repo-Root).

**Aesthetic-Decision:** User-Wunsch war 8-bit/chiptune passend zur als "8-bit-mäßig" empfundenen Music. Programmatisch (statt File-basiert) gewählt nach Pilot-Iteration weil's:
- Echtes 8-bit (nicht "8-bit-style sample"), 0 Bundle-Size, Instant-Iteration durch Code-Edit ohne File-Roundtrip
- Konsistenter Synth-Stack über alle 20 Sounds (selbe Square/Triangle-Family + Noise-Filter)
- Deterministisch + scene-shutdown-safe (Web-Audio-Nodes auf AudioContext, nicht Phaser)

**Sound-Family (20 sounds):**

*UI:* `playMenuSwitch` (1100→1450 Hz Square Tick, Hauptmenü-Hover, gain 0.18, gated auf `previousIndex !== idx` damit Initial-Focus stumm bleibt).

*Player:* `playPlayerCast` (Square 620→1180→820 Hz pitch-slide + highpassed-noise bite, gain 0.28), `playPlayerHit` (Triangle 320→90 Hz body + lowpassed-noise burst @ 500 Hz, gain 0.36 — *lauteste Hit-Family*).

*Pickups (5):* `playPickupCoin` (NES-style 880→1320 Hz two-note Square, gain 0.22), `playPickupKey` (Square 660→990 + highpassed-clink Noise, gain 0.24), `playPickupHeart` (Triangle C5→G5 perfect-fifth, gain 0.26), `playPickupItem` (Punch-Square-Blip + 4-note C-E-A-C Triangle-Arpeggio + Octave-up Half-vol Harmony + 3.5 kHz Sparkle, gain 0.26 main / 0.30 finale / 0.13 harmony — *upgegradet 2026-05-08* von 3-Note auf 4-Note + Harmony nach User-Feedback "etwas aufregender"), `playPickupGem` (4-note C-E-G-C Octave + Octave-up Harmony + 5 kHz Shimmer, gain 0.30 — *Trophy-Tier*).

*Crate/Container:* `playChestOpen` (Triangle 180→280 Hz Wood-Creak + lowpass-Noise + 80 ms später 2-note Reveal-Pop, gain 0.26).

*Enemies:* `playEnemyCast` (Square 480→220 Hz pitch-down + lowpassed-noise tail, gain **0.24** — bumped 2026-05-08 von 0.18 weil bei Boss-Music inaudible. **60 ms Throttle** in `lastEnemyCastAt` damit 5-Thorn-Fans zu einem Sound collapsen), `playEnemyHit` (Square 220→80 Hz Thump + bandpassed-noise burst @ 900 Hz, gain 0.32), `playEnemyCharge` (Triangle 200→480 Hz wind-up 340 ms, gain 0.13 — generisch für alle Telegraphs).

*Boss-Big-Moments:* `playBossDeath` (Square 200→50 Hz fall + lowpass crash + Triangle 800→100 Hz ghost-trail decay, gain 0.42 main / 0.18 ghost), `playPrismSpecialCast` (Triangle 220→520 Hz rise + Octave-up Half-vol + bandpass-noise sweep 700→2500 Hz, gain 0.20 main / 0.09 octave / 0.07 noise — *gedimmt 2026-05-08* nach User-Flag "nervig", Pitch eine Octave runter), `playPrismExplosion` (Sub-thump 140→45 Hz + lowpass-noise blast, gain 0.34 thump / 0.26 noise — Flash-Click voice **entfernt** weil piercing), `playMarquisMirrorSpecial` (Triangle 600→400→500 Hz Wobble + highpass-Noise-Sweep 1.5k→3.5k Hz, gain 0.18 main / 0.08 noise — *gedimmt 2026-05-08* von 1100→700→900 Hz / gain 0.30 wegen "schrill").

*Doors / Floor-Flow:* `playDoorOpen` (Triangle 200→320 Hz creak + lowpass-noise scrape, gain 0.34 — bumped von 0.20 nach User-Flag), `playDoorClose` (Triangle 320→140 Hz pitch-down + lowpass-scrape + 120 Hz Square-Thump @ 90ms, gain 0.36 + 0.30 thump — bumped + Thump-Frequenz von 80 → 120 Hz weil Laptop-Speaker unter 100 Hz wegrollen), `playDoorUnlock` (highpass-Noise-Click 3200 Hz + 1320 Hz Square-Blip + 80ms später ascending 660→990 Hz Triangle Magic-Tail, gain 0.26 — feuert auch direkt am Gold-Crate Key-Spend), `playFloorTeleport` (7-note Triangle ascending C4→C6 + parallel Octave-up Quarter-vol Harmony + sustained highpass-Sparkle, gain 0.30, ~650 ms).

**Pickup-Slot-Queue:** `acquirePickupSlot(ctx, durationSec)` serialisiert simultan absorbed Pickups. Wenn 2+ Pickups in einem Frame aufgehoben werden (z.B. coin+key aus Crate), schedulet sich der zweite Sound **nach** dem ersten + 40 ms Gap statt zu überlappen. 500 ms Forward-Look-Cap damit 10er-Floods nicht endlos queuen. `nextPickupSoundAt` field trackt den nächsten freien Slot. Ohne diesen Queue klangen 2 simultane Pickups wie ein einziger merkwürdiger Composite-Sound (User-Bug 2026-05-08).

**Enemy-Cast-Throttle:** `ENEMY_CAST_THROTTLE_MS = 60`. Multi-Thorn-Fans (5/8/12-Thorn-Patterns die alle in einem Frame `pool.fire()` callen) collapsen zu einem Sound. Tradeoff: für ne 12-Thorn-Wave (Phase 3 Lord Onyx) reicht ein einzelner thwip nicht — siehe nächster Punkt.

**Lord-Onyx-Phase-3-Override:** `fireInwardWave` callt `playPrismExplosion()` direkt am Wave-Start (statt enemy:charge), weil die 12-Thorn-Circular-Wave einen großen Audio-Cue braucht. Throttled enemy-cast feuert weiterhin am Projektil-Spawn 500ms später. Snipe-Telegraph (Phase 2) emittiert `enemy:charge` für den Single-Line-Beam (kleinerer Scale).

**Wiring-Patterns:**
- *Event-driven*: Listener in GameScene auf existing/new EventBus-Events (`enemy:hit`, `enemy:charge`, `room:doorsOpened/Closed`, `door:unlocked`, `boss:killed`, `lordOnyx:specialFired`, `seal:activated`, `pickup:collected`, `item:picked`, `crate:opened`, `gem:pickedUp`, `player:tookDamage`)
- *Direct calls*: `Player.handleShooting` → `playPlayerCast`; `EnemyProjectilePool.fire()` → `playEnemyCast`; `MarquisOfMirages.beginSpecial` → `playMarquisMirrorSpecial`; `LordOnyx.beginPatternFire` → `playPrismExplosion`; `LordOnyx.fireInwardWave` → `playPrismExplosion`; `MainMenuScene.setMenuFocus` → `playMenuSwitch`; `GameScene.advanceToNextFloor` → `playFloorTeleport`; Gold-Crate-spendKey-Path → `playDoorUnlock`
- *EventBus*-Events neu für SFX: `enemy:charge: void`, `room:doorsOpened: void`, `room:doorsClosed: void`

**Door-Open-Delay:** `doorsOpenedSfxHandler` schedulet `playDoorOpen` 250 ms gedelayt via `this.time.delayedCall` damit der Sound nicht mit dem letzten enemy-hit beim killing-blow überlappt (room cleared via `delayedCall(0)` nach dem letzten Kill = essentially same frame als enemy-hit-Sound).

**Door-Close-Construction-Emit:** `Room.constructor` emittiert `room:doorsClosed` (delayed 1 Frame) wenn `!cleared && doors.some(isClosed)`. Ohne diesen Emit würde der close-Sound nie spielen weil normale Room-Entry-Pfade `closeAllDoors()` nicht callen — Doors werden direkt im Constructor closed konstruiert. Nur Boss-spawn + Onyx-Seal-Activated callen explicit `closeAllDoors()`.

**Volume-Konvention (gelernt):** Cast-Sounds bewusst LEISER als Hit-Feedback — das eigene Geballer feuert konstant alle ~250 ms und soll Hintergrund-Layer sein, nicht jeder-Schuss-Vordergrund-Punch. Hit-Feedback (Treffer am Gegner) muss durchschneiden, sonst nimmt der Player Casten als "ins Leere" wahr. Master-Volume 0.6 default in SfxSynth.

**Boss-Telegraph-Charge-Hooks (8 sites):** Cursed Mirror (telegraph), Bog Frog (`beginTelegraph`), Bog Tortoise (`beginShell`), Pixie Queen (`startTeleport`), Damselfly Empress (`beginTelegraph`), Bloomheart (`tickFan` telegraph), Lord Onyx (`beginTeleportTelegraph` + Snipe-Telegraph), Mossy Behemoth (`startHop` + Phase-2 add-spawn). Add-Spawn-Hooks fired alle 5 summoning Bosses (Mossy/Vine/Forest/Pixie/LordOnyx) — siehe nächster Block.

**Boss-Add-Spawn-Safety:** `src/utils/bossSpawn.ts` mit `safeAddSpawnPosition(candidate, bounds, playerX, playerY, minDistance=192)` + `pickRoomCornerFarthestFromPlayer`. Alle 5 summoning Bosses (Mossy Behemoth Slimes, Vine Lord Sprouts, Forest Heart Sprites, Pixie Queen Dancers, Lord Onyx Wraiths) wrappen ihre natürliche Spawn-Position mit dem Helper — wenn Candidate < 192 px (3 Tiles) zum Player, fallback auf farthest room corner (margin 80 px). LordOnyx hatte sein eigenes 4-Corner-Sort-Pattern schon, der wurde nicht angetastet (sortiert nach Player-Distanz descending, picked die Top-N FAR corners).

**I-Frame-Source-Tracking:** `PlayerHealth.source: 'damage' | 'grace' | null` + `getInvincibilitySource(now)`-API. `takeDamage` setzt 'damage', `grantInvincibility` setzt 'grace' **nur wenn currently vulnerable** (sonst lässt es 'damage' stehen). `Player.tickInvincibilityBlink` skipped Alpha-Blink wenn Source = 'grace'. Vorher sah die Room-Entry-700ms-Grace-Period visuell identisch zum Post-Hit-Blink aus → User dachte er wurde getroffen wenn er einen Raum betrat. Jetzt: Grace-Period stumm (kein Blink), Damage-Period blinkt wie gewohnt.

**Marquis-Mirror-Phase-Transition Tween-Kill:** `cancelSpecialOnPhaseChange` callt jetzt `scene.tweens.killTweensOf(this)` als ersten Schritt. Vorher: wenn Boss in `entering` (alpha → 0 tween) phase-transitionte, killed der cancel den Tween nicht; das `setAlpha(1)` im Phase-Change-Handler wurde danach vom weiterlaufenden Tween überschrieben → Boss invisible in Berserker. User-flagged Bug 2026-05-08 ("wenn er im spiegel ist und ich den spiegel zerstöre, er währenddessen in die letzte phase geht, ist marquis unsichtbar").

**Dev-only:** Browser-Autoplay-Policy heißt erste Sounds spielen erst nach erstem User-Gesture. In der Praxis kein Problem weil alle SFX in Game-Action-Pfaden leben (Cast/Hit/Pickup) die immer nach Player-Input kommen.

---

## Open Questions / Decisions

Hier werden offene Designfragen gesammelt, die im Verlauf entschieden werden:

- [ ] Art-Style: eigene Sprites zeichnen, kostenlose Asset-Packs (z. B. Kenney.nl) oder AI-generiert?
- [x] Floor-Naming: Edelstein-Themen (Emerald Forest, Sapphire Swamp, Onyx Mansion ...). Anzahl insgesamt noch offen, aber Onyx Mansion ist Endgame.
- [ ] Mehrere spielbare Charaktere von Anfang an oder später?
- [ ] Multiplayer? (Eher nicht für v1)
- [ ] Mobile-Support oder Desktop-only?

---

## Resources

- Phaser 3 Docs: https://docs.phaser.io/
- Phaser 3 Examples: https://phaser.io/examples
- Tiled Editor: https://www.mapeditor.org/
- Aseprite: https://www.aseprite.org/
- Kenney Asset Packs: https://kenney.nl/assets
