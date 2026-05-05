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
- [x] Items: `Magic Tome`, `Hot Tea`, `Wizard's Sneakers`, `Telescopic Wand`, `Lead Cap`, `Caffeine Pill`, `Pixie Dust` + 4 Boss-Pool-Items (`Crown of the Vine`, `Ancient Heart`, `Withered Fang`) + `Heart Container` (HP-Up). Items modifizieren auch Missile-Visuals (`missileScale`, `missileTint`). 15-20 Items kommen iterativ.
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

**Chunk 3 — Floor-Progression (TODO)**
- [ ] Sapphire Swamp als Floor 2: neue `FloorTheme` (Palette, Enemy-Roster, Boss-Roster), eigener Boss
- [ ] Treppe/Trap-Door spawnt nach Boss-Kill, walk-on transitiert zu Floor 2
- [ ] HP/Damage-Skalierung pro Floor (z.B. enemy.hp *= 1.3, contactDamage * 1.2)
- [ ] Floor-Theme-Switch: Camera-Background, Sprites, Decorations, Wall-Texturen

**Chunk 4 — Onyx Mansion + Secret Endboss (TODO)**
- [ ] Onyx Mansion als Final Floor mit Endboss
- [ ] Secret Gem-Door: wenn alle Floor-Gems gesammelt (no-hit auf jedem Floor) → Door öffnet sich → Secret Endboss
- [ ] Win-Screen

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

**Boss-System (Phase 5):** `RoomKind.Boss` triggert in `enterRoom` einen Boss-Spawn statt normaler Enemies (`enemySpawnCount = 0` für Boss-Räume). `pickBossForFloor(floorId, rng)` mit Seed `${dungeonSeed}-boss` wählt deterministisch 1 von 4 Bossen für Emerald Forest. `bossNoHitInProgress`-Flag wird auf `false` gesetzt sobald `player:tookDamage` während Boss-Room feuert. Bei `boss:killed`: Türen auf, Boss-Pool-Item-Pedestal + 2 Hearts in Mitte, Gem-Pickup wenn no-hit. Spawn-Protection 700 ms auf alle Reward-Pickups.

**Hitbox-Tuning (User-Validated):**
- `PLAYER_HITBOX_RADIUS = 13` (war 18 — zu groß für Squeeze zwischen Rocks). Body-Center +12 px nach unten so der Hut nicht die Hitbox ist, sondern die Robe.
- Rocks: Circle-Body Radius 12 (statt voller 36×28 Texture-Frame). Adjacent Rocks lassen 40 px Lücke für Spieler.
- Trees: 12×14 Trunk-Body am unteren Sprite-Rand. Krone überlappt visuell ohne Kollision.

**DEV-Hooks:** `__wiz.spawnTreasure()`, `__wiz.simulateFloor2()` (markiert Treasure/Shop-Türen als locked zum Lock-Test), `__wiz.stats()`, `__wiz.itemSystem()` — nur in `import.meta.env.DEV`. **`STARTING_COINS = 50`** als Test-Konstante in GameConfig.ts (Standard wird später 0 oder Meta-Progression).

**Geplante Progression:**
1. **Emerald Forest** (Floor 1) — implementiert inkl. 4 Bosse (Vine Lord, Mossy Behemoth, Pixie Queen, Forest Heart, random pick).
2. **Sapphire Swamp** (Floor 2) — Phase 5 Chunk 3, Palette TBD, eigener Enemy-Roster + Boss.
3. **Onyx Mansion** (Endgame) — Phase 5 Chunk 4, finaler Boss + Secret Endboss (gem-locked).

Weitere Edelsteinfloors (Ruby/Topaz/...) können zwischen Sapphire und Onyx ergänzt werden.

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
