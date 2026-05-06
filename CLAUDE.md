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

- [x] `StatsSystem`: damage, fireRate, missileSpeed, range, moveSpeed, missileScale (additive + multiplicative modifiers, latest-wins missileTint)
- [x] `ItemSystem` (passive only — active items mit Cooldown/Space verschoben Phase 6)
- [x] Treasure-Räume mit Item-Pedestals (auto-spawn, deterministisch via Seed, `desc.looted` verhindert Doppel-Spawn)
- [x] Item-Pickup-Animation: Toast unten-mittig (Name gold + Description), 7 Start-Items
- [x] Items: `Magic Tome`, `Hot Tea`, `Wizard's Sneakers`, `Telescopic Wand`, `Lead Cap`, `Caffeine Pill`, `Pixie Dust`, `Spyglass` (+40% range, +10% missile speed) + Emerald-Boss-Pool (`Crown of the Vine`, `Ancient Heart`, `Withered Fang`) + Sapphire-Boss-Pool (`Lily Diadem`, `Mire Pearl`, `Frog's Tongue`) + `Heart Container` (HP-Up). Items modifizieren auch Missile-Visuals (`missileScale`, `missileTint`). Boss-Pool-Items haben `floor`-Tag und werden via `pickItemFromPool(..., currentFloor)` floor-spezifisch gepickt.
- [ ] Missile-Modifikatoren (Homing, Piercing, Splitting, Elemental) als Missile-Flags — verschoben Phase 6
- [x] Pickups: Hearts, Coins, Keys, Items, Gems (Bombs verschoben Phase 6)
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
- [x] Sapphire Bosse (4, random pick): **Toad Sovereign** (HP 70, idle-tongue-hop → Phase 2: 3-Hop-Combo + 5-Thorn radial je Landung + Bog-Frog-Adds), **Bloomheart** (HP 60, rooted 5-thorn fan → Phase 2: schneller + delayed-burst spore + Snapper-Adds), **Damselfly Empress** (HP 50, dash mit perpendicular trail → Phase 2: snappier rhythm — telegraph 260 / recovery 480 / trail 130 ms — plus 5-thorn landing radial wenn dash endet; **keine Adds** — Phase 2 ist rein deterministisch dodgbar), **Bog Colossus** (HP 75, **Phase 1 Gungeon-style dual radial**: 10-thorn radial + 350ms-versetzte zweite Welle 18° offset @ 70 % speed + 1400ms walk-snipe; **Phase 2 Mandala**: 6 outer thorns @ radius 96 spinnen 160°/s + 4 inner thorns @ radius 56 counter-rotating bei 220°/s + 600ms aimed-fire während Orbit-Window + 950ms walk-snipe; cycle 2700 ms)
- [x] Treppe/Trap-Door spawnt nach Boss-Kill (mit `hasNextFloor()`-Gate), walk-on transitiert zu Floor 2 mit Fade. Re-Entry des cleared Boss-Rooms respawnt Treppe.
- [x] **Run-Carry-Over:** Items (über `pickedItemIds`-Replay), HP/MaxHP, Coins, Keys, Gems werden über Floor-Wechsel persistiert. `RunCarryOver` Snapshot in `GameSceneInitData.carryOver`. Hydrate-Methoden auf `Inventory` / `ItemSystem` / `PlayerHealth` (event-stumm, kein Toast-Spam).
- [x] **Floor-themed Boss-Pool-Items:** `ItemDefinition.floor` Tag + `pickItemFromPool(pool, rng, exclude, currentFloor)` filtert Boss-Items nach Floor. Emerald-Pool (Crown of the Vine, Ancient Heart, Withered Fang) droppt nicht mehr auf Sapphire. Sapphire-Pool: **Lily Diadem** (+1 maxHP, +15% fireRate), **Mire Pearl** (+50% range, +1 dmg), **Frog's Tongue** (+25% missile speed, +20% fireRate).
- [x] Floor-Theme-Switch: Camera-Background (`theme.palette.ambient`), Wall-/Floor-Textures, Decorations alle per-floor in PreloadScene. Sapphire-Decos: **Lily Pad** (statt Tree, mit Bloom + Saphir-Wassertropfen) + **Mangroven-Wurzel** (statt Rock, verschlungene Wurzelbänder mit Saphir-Glow-Knoten + Algen-Strängen) via neuem `FloorTheme.decorationStyle: 'forest' | 'swamp'` Diskriminator.
- [ ] HP/Damage-Skalierung pro Floor — *noch nicht relevant*: neue Sapphire-Mobs/Bosse haben passende Werte direkt eingebacken. Wird interessant sobald Floor-1-Mobs auf Floor 3+ wiederkehren.

**Chunk 4 — Onyx Mansion + Secret Endboss (mostly DONE — only Win-Screens + final tuning offen)**

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

*Vampire-Doppelboss (DONE — Standard-Boss auf Onyx):*
- [x] **Architektur**: zwei Bodies + Coordinator-Pattern. `VampireBody` (extends BaseEnemy) suppresst knockback + notifiziert Coordinator on damage/death. `CrimsonLord` (Melee Dash) + `SapphireMarquis` (Range Kite + Blood-Magic). **`VampireFight`** Coordinator (NICHT Phaser GameObject) owns beide Bodies, aggregates HP für combined Bar, fired `boss:killed` exakt einmal beim zweiten Tod, triggers Solo-Mode auf Survivor wenn first stirbt.
- [x] **`activeBoss`** Field-Type widened auf `BossEnemy | VampireFight | null` — beide implementieren `destroy()`.
- [x] **Crimson Lord** (Melee, HP 35): chase player at **70 px/s** (war 100, zu aggressiv) → telegraph **700ms** (war 400, point-blank dash war undodgeable) → dash **500 px/s** × 250ms → recovery 600ms → idle gap **1400ms** (Phase 1) / 600ms (Phase 2 solo) / 250ms (Phase 3 berserker, no telegraph). Phase 2+ droppt **Blood-Trail** (4 drops along dash path, 1.2s lifetime, 1 HP damage). Berserker re-aims direction at dash-start (snappier feel ohne homing).
- [x] **Sapphire Marquis** (Range/Mage, HP 35): kited bei **180 px** vom Player @ 60 px/s. Phase 1: **5-thorn fan** (60° spread) alle 1800ms + Teleport alle 4000ms (mit min **180 px PLAYER-distance** — bug-fix, vorher self-distance gemessen → materialized auf Spieler). Phase 2 solo: 7-thorn fan (90° spread) + 12-thorn radial **Bullet-Curtain** alle 3000ms mit 300ms Telegraph. Phase 3 berserker: stationär mit **8-arm rotating spinning stream**, **1 arm always skipped** → permanenter 90° Gap der mit-rotiert (`SAPPHIRE_MARQUIS_BERSERKER_SKIPPED_ARMS = 1`, war 0 = full ring → first wave dodgeable, später Gap closed). Spin 80°/s, fire 170ms.
- [x] Marquis-Body bleibt blau, Projektile sind **rot/Blut** (Blood-Magic-Theme; `BloodProjectile` texture).
- [x] **Phase 3 Berserker-Trigger** = Survivor unter 30 % HP via `VAMPIRE_BERSERKER_HP_FRACTION`. Tracked per body internally in `VampireBody.takeDamage`.
- [x] **Texturen** (PreloadScene): Crimson Lord 36×42 (rote Robes, gold Trim, Fanged-Grin, slicked-back hair, Ruby-Medaillon), Sapphire Marquis 36×42 (blaue Robes, gold V-Collar, single glowing red eye + Scar, Wand mit red-Crystal-Tip, Sapphire-Medaillon), BloodProjectile 16×16 crimson orb, BloodTrail 28×28 crimson splat.
- [x] **Spawn-Position**: Lord links + Marquis rechts vom Room-Center, offset `VAMPIRE_SPAWN_OFFSET_TILES = 1.8`. Boss-Roster `boss-vampire-twins` (virtueller ID) dispatcht in `spawnBossForRoom`/`devSpawnBoss` zum `VampireFight`. Display-Name "Vampire Twins". `VampireFight.destroy()` für tear-down.

*No-Hit-Tracking (FIXED):*
- [x] `playerTookDamageHandler` gated jetzt auf **`activeBoss !== null`** (war: `desc.kind === RoomKind.Boss`). Beim `__wiz.spawnBoss` außerhalb echter Boss-Rooms wurde der Damage nicht getrackt → Gem fälschlich gedroppt. Jetzt wahrer Predikat.
- [x] **`bossDamageCount`** field als sanity-check parallel zum boolean flag. Gem-Award braucht `flag === true && damageCount === 0`. Dev-Console-Log am Boss-Kill: `flag=… damageCount=… → noHit=…, hasGem=…`.

*Gem-Siegel (DONE):*
- [x] **`GemSeal`** in `src/entities/GemSeal.ts` — gothic Stone-Altar mit gold Trim + 3 Sockets (one per floor in `REQUIRED_GEM_FLOORS = ['emerald-forest', 'sapphire-swamp', 'onyx-mansion']`). Render: empty Socket = dim+tinted, filled Socket = full color + pulsing halo (per-floor glow color from FLOORS palette). Trigger-Zone größer als Frame damit Player nicht pixel-perfect tappen muss.
- [x] **Spawn**: nach Vampire-Kill auf Onyx, am bottom-center des Boss-Rooms (center.y + 3 tiles). Stairs spawnen oben (no-gems Exit). Re-entry path respawnt beide.
- [x] **Activation**: Player-Overlap → wenn 3/3 Gems → Cinematic (Sockets E→S→O pulsen pro 180ms, lila Burst, Camera-Flash + Shake) → emit `seal:activated`. Wenn <3 → Floating "X / 3 trophies" Hint mit 1500ms Cooldown + emit `seal:hintShown`.
- [x] **Auto-Insert** beim Gem-Pickup während Seal lebt: neuer Event `gem:pickedUp { floorId, x, y }` aus `GemPickup.onCollect` (vor `inventory.addGem`). `GemSeal.addGem(floorId, fromX, fromY)` animiert Gem-Sprite per **quadratischer Bezier-Kurve** (steigt nach oben, dann runter ins Socket) → empty Plate wird live zu filled (clearTint + alpha + Halo) + Back.Out-Punch beim Settle.
- [x] **No-Gems-Exit**: `spawnStairsInCurrentRoom(onOverlap)` parametrisierter Action-Callback. Onyx-Variante emittet `run:onyxExitTaken` statt `advanceToNextFloor`. Placeholder-Reaction = Camera-Flash + Console-Log (Win-Screen kommt in #5).

*Lord Onyx (DONE — Secret Endboss):*
- [x] **`LordOnyx`** in `src/entities/enemies/LordOnyx.ts` — extends BossEnemy, rooted at room center. HP **90** (highest of any boss).
- [x] **Phase 1** (HP > 66 %): Aimed Homing Missile alle **1800ms** (turn rate **60°/s** — easier als Mirror's 110, end-game player kann mit gestackten move-stats outmaneuvern) + 8-Thorn Radial alle 4000ms.
- [x] **Phase 2** (33-66 %): on entry **2 Wraith-Adds** an deterministic Room-Corners + Camera-Shake. Cadence tightens: missile 1300ms, radial 3000ms, **+ 4-thorn spinning Cross** alle 2000ms (drift orientation each cycle).
- [x] **Phase 3** (< 33 %): Camera-Flash + heavy Shake. **Continuous Marquis-style spinning stream** (8 arms, 1 skipped → 90° Gap rotates @ 60°/s, fire 180ms) **+ aimed Homing alle 2400ms** on top — Gap-Riding allein reicht nicht.
- [x] **Texture** (PreloadScene 64×88): gothic Vampire-King silhouette. Gold 5-spire crown mit central amethyst gem at peak, sunken glowing red eyes mit halos, pale skin, dark Cloak mit gold Trim + tatter fringe (kein "festen Boden" — er floated), inner robe collar mit gold pendant, Scepter rechts mit Amethyst-Orb + halo, faint amethyst aura ringsum. (StyleMockupScene-Vorlage existiert noch in `drawLordOnyx` für Reference, aber neue Texture ist die canonical.)
- [x] **Spawn-Pfad**: `seal:activated` → close all doors + tear down exit-stairs + Banner "Lord Onyx stirs..." → 900ms Delay → spawn LordOnyx zentral. Same `activeBoss` slot, same no-hit tracking, same boss bar.
- [x] **Death-Pfad**: `boss:killed` payload checks `name === 'Lord Onyx'` → bypasses normal reward flow → calls `handleLordOnyxKilled` → Cosmetics.unlockPrismancySkin() + VICTORY-Banner + "Prismancy Skin Unlocked" Toast (only wenn neu) + Camera-Flash + Shake + emit `run:onyxFullVictory` (Win-Screen wires here in #5).

*Cosmetic-Unlock-System (DONE):*
- [x] **`src/systems/Cosmetics.ts`** — localStorage-backed mit try/catch fallback (private browsing). Storage-Key `'prismancy.unlocks.lordOnyxBeaten'`. API: `hasPrismancySkin()`, `unlockPrismancySkin()`, `resetAll()`.
- [x] **Prismancy Wizard-Skin**: Roter+goldener Skin als Trophy für Lord-Onyx-Kill. Same pixel-layout wie Default, refactored `drawWizardTexture` in PreloadScene nimmt jetzt `palette` + `textureKey` Parameter. Beide Texturen werden bei Preload generiert: `tex-player` (default purple/white) + `tex-player-prismancy` (deep crimson robe + gold trim + black hat mit gold band).
- [x] **Auto-Apply**: `Player`-Constructor + `MainMenuScene` checken `Cosmetics.hasPrismancySkin()` und wählen entsprechende Textur. Kein Toggle/Settings — once unlocked = always applied.

*Onyx Boss-Pool-Items (DONE — droppt vom Vampire-Kill, NICHT Lord Onyx):*
- [x] **Bloodbound Chalice** (`bloodboundChalice`): +1 max HP, +20 % damage (mult), Crimson missile tint (0xc8284a). Texture: gold goblet mit blood + side drip.
- [x] **Vampire's Signet** (`vampireSignet`): +25 % fire rate, +15 % missile speed, gold-red tint. Texture: gold ring mit ruby cabochon top-mounted.
- [x] **Obsidian Heart** (`obsidianHeart`): +1 dmg (add), +40 % range, amethyst tint (0x8a4ad8). Texture: faceted black-amethyst heart mit gold vein crack + sparkle.
- Alle drei mit `floor: 'onyx-mansion'` tag → werden nur aus Vampire-Boss-Pool gezogen via `pickItemFromPool(..., currentFloor)`. **Lord Onyx gibt KEINE Items** — sein Reward ist der cosmetic Skin-Unlock.

*Noch offen:*
- [ ] **Win-Screen** (Phase 5 Chunk 4 #5): zwei Varianten — `run:onyxExitTaken` (no-gems incomplete-victory mit subtle hint "the dark light survived") + `run:onyxFullVictory` (full-victory mit Lord Onyx defeated + maybe stats display). Currently beide nur Placeholder (Camera-Flash + Banner-Text in GameScene).
- [ ] **HP/Damage-Skalierung pro Floor systematisch** — Onyx-Mobs sind ad-hoc gebumped (5/9/7), aber kein generelles Scaling-System. Wird interessant sobald Floor-1-Mobs auf späteren Floors wiederkehren.
- [ ] **Lord Onyx visual polish pass** — current texture funktioniert, aber User flagged ursprünglich für Rework. Wenn das spätere Sound/Polish-Phase erreicht, ggf. Iteration.

**DoD:** Vollständiger Run vom Start bis zum finalen Boss möglich.

---

### Phase 6 – Polish, Audio & Meta (ca. 2 Wochen)

**Ziel:** Aus dem Prototyp ein Spiel machen.

- [ ] Sound-Effects für alle relevanten Actions
- [ ] Background-Music pro Floor
- [ ] Partikel-Effekte (Blut, Explosionen, Item-Aura)
- [ ] Hauptmenü, Pause-Menü, Settings (Volume, Keybindings)
- [ ] Run-Stats-Tracking (Tode, Kills, Items gefunden)
- [ ] Save/Load für Meta-Progression (Localstorage): freigeschaltete Items/Charaktere
- [ ] Seeded-Run-Funktion (Seed eingeben für reproduzierbare Runs)
- [ ] Performance-Pass (Object-Pooling für Missiles/Projektile/Partikel)

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

**Spawn-Safety:** Beim Betreten eines uncleared Raums hält der Spawner mindestens `SAFE_SPAWN_DISTANCE` (3 Tiles) vom Spieler-Spawn ein, und der Spieler kriegt `ROOM_ENTRY_GRACE_MS` (700 ms) I-Frames als Sicherheitsnetz.

**Pickup-Persistenz pro Raum:** `RoomDescriptor.pendingPickups` snapshottet uncollected Drops beim `tearDownActiveRoom`. Restore in `enterRoom` plus clear of the field (live group nimmt's auf). Item-Pickups (Treasure-Pedestals, Gold-Crate-Items) snapshotten NICHT — sie werden über `desc.looted` getrackt oder sind ephemerial (Gold Crate items: must collect immediately).

**Boss-System (Phase 5):** `RoomKind.Boss` triggert in `enterRoom` einen Boss-Spawn statt normaler Enemies (`enemySpawnCount = 0` für Boss-Räume). `pickBossForFloor(floorId, rng)` mit Seed `${dungeonSeed}-boss` wählt deterministisch einen Boss pro Floor (Emerald + Sapphire haben jeweils 4 alternativen, Onyx hat den virtuellen `boss-vampire-twins` der zum `VampireFight` Coordinator dispatcht). `bossNoHitInProgress`-Flag wird auf `false` gesetzt sobald `player:tookDamage` während aktivem Boss-Fight (`activeBoss !== null`) feuert — **gated auf activeBoss, nicht room-kind**, damit `__wiz.spawnBoss` außerhalb echter Boss-Rooms auch korrekt trackt. Parallel: `bossDamageCount` zählt Hits unabhängig vom Flag als sanity-check. Bei `boss:killed`: Türen auf, Boss-Pool-Item-Pedestal + 2 Hearts in Mitte, Gem-Pickup wenn `flag === true && damageCount === 0`, **Treppe** wenn `hasNextFloor()`. Spawn-Protection 700 ms auf alle Reward-Pickups.

**Floor-Transition (Stairs):** `handleBossKilled` spawnt nach Loot eine Stairs-Image (oben-mittig im Boss-Raum) auf `DepthLayers.FloorDecoration` mit Pulse-Tween + Player-Overlap. `spawnStairsInCurrentRoom(onOverlap?)` nimmt optionales Action-Callback — default = `advanceToNextFloor()`. Auf Overlap → `advanceToNextFloor()`: Snapshot `RunCarryOver`, Camera-Fade-Out 260ms, dann `scene.stop(UI) + scene.start(Game, {floorIndex+1, floorId, carryOver}) + scene.launch(UI)`. `FLOOR_ORDER = ['emerald-forest', 'sapphire-swamp', 'onyx-mansion']`. Re-Entry des cleared Boss-Rooms respawnt die Treppe via `enterRoom`-Path. `tearDownActiveRoom` zerstört Sprite + Overlap.

**Onyx-Endgame-Flow:** Onyx ist der letzte Floor in `FLOOR_ORDER` — kein `advanceToNextFloor` möglich. Stattdessen branched `handleBossKilled` für Onyx: spawnt **GemSeal unten + Exit-Stairs oben**. Stairs-Action emittet `run:onyxExitTaken` (no-gems incomplete-victory path; Win-Screen-Placeholder). Seal-Overlap mit 3/3 Gems → cinematic + emit `seal:activated` → `handleSealActivated` schließt Türen + tearDown Stairs + 900ms Delay → `spawnLordOnyxInCurrentRoom`. Lord Onyx Death (`name === 'Lord Onyx'` in payload) bypassed normal reward flow → `handleLordOnyxKilled` → `Cosmetics.unlockPrismancySkin()` + VICTORY-Banner + emit `run:onyxFullVictory` (Win-Screen-Placeholder). **Lord Onyx droppt KEINE Items** — nur Skin-Unlock.

**Cosmetic-Unlock-System:** `src/systems/Cosmetics.ts` mit localStorage backing (try/catch fallback für private browsing). Storage-Key `'prismancy.unlocks.lordOnyxBeaten'`. API: `hasPrismancySkin()`, `unlockPrismancySkin()`, `resetAll()`. **Prismancy-Skin** (red/gold wizard) = Trophy für Lord-Onyx-Kill. `drawWizardTexture` in PreloadScene refactored mit `palette` + `textureKey` Parametern, generiert beide Variants up-front (`tex-player` + `tex-player-prismancy`). Player-Constructor + MainMenuScene checken Cosmetics und wählen entsprechende Textur. Auto-Apply, kein Toggle. Greift erst nach next scene start.

**Run-Restart:** Zwei Wege um einen Run zu reseten:
1. **Game-Over-R:** `GameOverScene` poll'd `R` (und `Enter`) via `JustDown` im update-loop statt `keyboard.once` (Bug-Fix: paused-scene + `scene.start` racet, once-listener feuerte unzuverlässig). `restartTriggered`-Flag verhindert Doppel-Restart.
2. **Hold-R im Run:** GameScene polled `R` mit `JustDown`-Guard (sonst Endlos-Loop wenn R nach Restart weiter gehalten wird), zeigt Fill-Bar unten-mittig (`buildRestartHoldWidget`), nach `RESTART_HOLD_DURATION_MS = 1200` → `restartRun()` (kein carryOver, Floor 1 fresh). Symmetric mit Game-Over-Restart, nur reachable mid-run.

**SHUTDOWN-Reset:** `scene.restart()` zerstört Phaser-Children, lässt aber Class-Felder (`this.currentRoom`, `this.enemies`, `this.pickups`, etc.) als JS-Refs auf tote Objekte stehen. Im `Phaser.Scenes.Events.SHUTDOWN`-Handler nullen wir die Per-Run-Felder explizit (`undefined as unknown as Room` für `!:`-Felder, `null` für Union-Felder). Sonst sieht der nächste `create()` einen truthy `currentRoom` und `tearDownActiveRoom` knallt auf `this.enemies.clear()`.

**Hitbox-Tuning (User-Validated):**
- `PLAYER_HITBOX_RADIUS = 13` (war 18 — zu groß für Squeeze zwischen Rocks). Body-Center +12 px nach unten so der Hut nicht die Hitbox ist, sondern die Robe.
- Rocks + Trees: **keine Hitbox**, reine Boden-Deko auf `DepthLayers.FloorDecoration` (unter Spieler/Gegner) — User-Feedback: Steine machten als Hindernis im Bewegungsfluss keinen Sinn, Bäume verbargen Pixies hinter ihrer Krone, und alles soll unter Spieler/Gegnern sein. `Room.treePositions` trackt die Tree-Positionen weiter, damit Pixie Queen zwischen Bäumen teleportieren kann.

**Boss-Knockback:** `BossEnemy.takeDamage` ignoriert den `knockback`-Parameter — andernfalls verlängert jeder Treffer `knockbackUntil` und die Boss-AI bleibt unter Sustained Fire dauerhaft gelockt (Bug: Mossy Behemoth wurde in die Ecke geschoben und blieb inaktiv). Hits flashen + applizieren Damage wie gehabt, Bosse bewegen sich aber ausschließlich durch ihre eigene AI.

**Pixie Queen Teleport:** Ziel wird in `onComplete` des Fade-Out-Tweens gepickt (nicht beim Start), und `PIXIE_QUEEN_FALLBACK_MIN_DISTANCE = 3 * 64` (war 2 * 64 = 128 px) — sonst kann der Spieler während der 200 ms Fade ins Ziel reinlaufen und die Queen materialisiert direkt auf ihm.

**Pixie Dancer Projektile:** `PixieDancer.tickAI` feuert alle `PIXIE_FIRE_INTERVAL_MS = 2400` ms einen aimed Thorn entlang der Sichtlinie zum Spieler. Initial-Delay `PIXIE_FIRE_INITIAL_DELAY_MS = 1200`. Factory in `entities/enemies/index.ts` reicht den `enemyProjectilePool` durch (gleicher Mechanismus wie Vine Sprout).

**Missile-Spawn-Position:** `Player.handleShooting` spawnt Missiles am `body.center` (= +12 px unter `this.y`), nicht am Texture-Center. Hintergrund: die Hitbox-Tuning-Verschiebung des Body nach unten heißt, dass `this.y` an der Top-Wall *innerhalb* der Wand liegt — Missile-Spawn dort kollidiert sofort mit der Wand und wird deaktiviert.

**Coin Drops von Gegnern:** `EnemyDefinition.coinDropChance` (0..1) wird in `BaseEnemy.die()` per `Math.random()` gerollt. Bei Erfolg fired `enemy:droppedCoin` Event mit `{x, y}`; GameScene-Listener spawnt einen Coin-Pickup. Aktuelle Werte (nach Playtest hochgesetzt — vorher max ~8 Coins/Floor): forest-sprite 0.40, pixie-dancer 0.45, mossy-slime 0.55, vine-sprout 0.65, alle Bosse 0 (haben eigenen Reward-Flow).

**DEV-Hooks** (nur `import.meta.env.DEV`):
- `__wiz.spawnTreasure()` — Treasure-Pedestal im aktuellen Raum
- `__wiz.simulateFloor2()` — markiert Treasure/Shop-Türen als locked zum Lock-Test
- `__wiz.spawnBoss(id)` — force-spawnt Boss im aktuellen Raum, schließt Türen, killt vorhandene Enemies. Emerald: `'boss-vine-lord'`, `'boss-mossy-behemoth'`, `'boss-pixie-queen'`, `'boss-forest-heart'`. Sapphire: `'boss-toad-sovereign'`, `'boss-bloomheart'`, `'boss-damselfly-empress'`, `'boss-bog-colossus'`. Onyx: `'boss-vampire-twins'` (dispatcht zu VampireFight), `'boss-lord-onyx'`.
- `__wiz.spawnLordOnyx()` — Convenience-Wrapper für `__wiz.spawnBoss('boss-lord-onyx')`. Skippt Vampire + Seal komplett.
- `__wiz.gotoFloor(n)` — restart auf Floor n (1=Emerald, 2=Sapphire, **3=Onyx**). Resettet alle Run-Stats; nur für Mob-/Theme-Testing. `DEV_FLOOR_ORDER` ist jetzt identisch mit `FLOOR_ORDER` (Onyx ist natural progression).
- `__wiz.giveGems()` — granted alle 3 Floor-Gems instant. Test-Pfad für GemSeal mit 3/3 Sockets ohne perfect runs auf jedem Floor.
- `__wiz.unlockSkin()` / `__wiz.lockSkin()` — toggle Cosmetics.unlockPrismancySkin / resetAll. Greift erst nach next scene start (Player + MainMenu lesen Cosmetics nur im Constructor). Kombo: `__wiz.unlockSkin()` + `__wiz.gotoFloor(1)` → Player ist jetzt rot/gold.
- `__wiz.stats()`, `__wiz.itemSystem()` — Inspect

**`STARTING_COINS = 0`** in GameConfig.ts (war zwischenzeitlich 50 zum Testen). Spieler startet jetzt ohne Coins, muss alles von Gegnern + Crates + Drops sammeln.

**Geplante Progression:**
1. **Emerald Forest** (Floor 1) — implementiert inkl. 4 Bosse (Vine Lord, Mossy Behemoth, Pixie Queen, Forest Heart, random pick).
2. **Sapphire Swamp** (Floor 2) — implementiert. 4 Mobs (Bog Frog, Snapper Bloom, Damselfly, Bog Tortoise), 4 Bosse (Toad Sovereign, Bloomheart, Damselfly Empress, Bog Colossus). Eigene Decos (Lily Pad + Mangroven-Wurzel) statt der Forest-Decos via `decorationStyle`-Diskriminator.
3. **Onyx Mansion** (Endgame) — Vollständig implementiert. 3 Mobs (Wraith, Possessed Candelabra, Cursed Mirror — letzterer mit `minPerRoom: 1`), Painterly Atmosphere, **Vampire Twins** (Crimson Lord melee dash + Sapphire Marquis range/blood-magic, dual-body via VampireFight Coordinator) als Standard-Boss, **GemSeal** + Exit-Stairs nach Vampire-Kill, **Lord Onyx** als Secret-Endboss hinter dem Siegel mit 3-Phase-AI, **Cosmetic-Skin-Unlock** (Prismancy red/gold wizard) bei Lord-Onyx-Kill. In `FLOOR_ORDER` als Floor 3 — Sapphire-Stairs descenden natürlich nach Onyx. Win-Screen-Variants (no-gems exit + full-victory) sind noch Placeholder-Banner — `run:onyxExitTaken` + `run:onyxFullVictory` Events sind die hooks für #5.

Weitere Edelsteinfloors (Ruby/Topaz/...) können zwischen Sapphire und Onyx ergänzt werden. Floor-Reihenfolge wird in `FLOOR_ORDER` (`GameScene.ts`) gegated; Stairs verwenden den nächsten Eintrag.

**Door-System:** Türen rendern kind-aware Texturen wenn geschlossen, sodass der Spieler im Kampf sieht welche Räume anschließen. `Door.barrierTextureKey()` switch:
- `Boss` → `bossDoorKey(floorId)` (Totenkopf-Sigil, immer)
- `Treasure` → `treasureDoorKey(floorId)` (Goldtruhe), bei `locked` → `treasureDoorLockedKey` (Truhe + Eisen-Lock-Plate mit Schlüsselloch)
- `Shop` → `shopDoorKey(floorId)` (Goldmünze mit Tally-Marks — *nicht* "$"-Glyph, weil das beim Pixel-Scaling wie ein Schlüsselloch gelesen wurde), bei `locked` → `shopDoorLockedKey`
- `Normal` → `normalDoorKey(floorId)` (Holzplanken-Tür mit Eisenband + Ring-Griff)

Drawn in `PreloadScene` per Floor-Theme. `drawLockBadge` ist shared zwischen Treasure/Shop-Locked-Varianten.

**Item-Pool-Floor-Filter:** `pickItemFromPool(pool, rng, exclude, currentFloor?)` filtert nur den Boss-Pool nach `ItemDefinition.floor`. Treasure/Shop-Items haben bewusst kein Floor-Tag (sind floor-agnostic). Beim Boss-Reward übergibt `spawnBossPoolItem` den `currentFloorId`. Items ohne `floor`-Tag werden in jedem Boss-Pool gefunden — derzeit haben aber alle 9 Boss-Items einen Floor-Tag (3 Emerald + 3 Sapphire + 3 Onyx). Onyx-Pool: **Bloodbound Chalice** (+1 maxHP, +20% damage), **Vampire's Signet** (+25% fire rate, +15% missile speed), **Obsidian Heart** (+1 dmg, +40% range). Lord Onyx droppt **kein** Pool-Item — nur den Cosmetic-Skin-Unlock.

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

**Music** — Phase 6 wartet auf echte Audio-Files (OGG/MP3). Ein prozeduraler Web-Audio-Versuch (3 Tracks, lookahead-Scheduler, crossfade) wurde gebaut und wieder entfernt — proceduraler Sound passte nicht zum Aesthetic. Git-History hat den Code falls jemand das später als Placeholder reaktivieren will.

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
