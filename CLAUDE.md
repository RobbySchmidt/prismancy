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

**Boss-System (Phase 5):** `RoomKind.Boss` triggert in `enterRoom` einen Boss-Spawn statt normaler Enemies (`enemySpawnCount = 0` für Boss-Räume). `pickBossForFloor(floorId, rng)` mit Seed `${dungeonSeed}-boss` wählt deterministisch 1 von 4 Bossen pro Floor (Emerald + Sapphire haben jeweils 4). `bossNoHitInProgress`-Flag wird auf `false` gesetzt sobald `player:tookDamage` während Boss-Room feuert. Bei `boss:killed`: Türen auf, Boss-Pool-Item-Pedestal + 2 Hearts in Mitte, Gem-Pickup wenn no-hit, **Treppe** wenn `hasNextFloor()`. Spawn-Protection 700 ms auf alle Reward-Pickups.

**Floor-Transition (Stairs):** `handleBossKilled` spawnt nach Loot eine Stairs-Image (oben-mittig im Boss-Raum) auf `DepthLayers.FloorDecoration` mit Pulse-Tween + Player-Overlap. Auf Overlap → `advanceToNextFloor()`: Snapshot `RunCarryOver`, Camera-Fade-Out 260ms, dann `scene.stop(UI) + scene.start(Game, {floorIndex+1, floorId, carryOver}) + scene.launch(UI)`. `FLOOR_ORDER = ['emerald-forest', 'sapphire-swamp']` — wird gegated für Win-Screen sobald Onyx kommt. Re-Entry des cleared Boss-Rooms respawnt die Treppe via `enterRoom`-Path. `tearDownActiveRoom` zerstört Sprite + Overlap.

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
- `__wiz.spawnBoss(id)` — force-spawnt Boss im aktuellen Raum, schließt Türen, killt vorhandene Enemies. Emerald: `'boss-vine-lord'`, `'boss-mossy-behemoth'`, `'boss-pixie-queen'`, `'boss-forest-heart'`. Sapphire: `'boss-toad-sovereign'`, `'boss-bloomheart'`, `'boss-damselfly-empress'`, `'boss-bog-colossus'`.
- `__wiz.gotoFloor(n)` — restart auf Floor n (1=Emerald, 2=Sapphire). Resettet alle Run-Stats; nur für Mob-/Theme-Testing.
- `__wiz.stats()`, `__wiz.itemSystem()` — Inspect

**`STARTING_COINS = 0`** in GameConfig.ts (war zwischenzeitlich 50 zum Testen). Spieler startet jetzt ohne Coins, muss alles von Gegnern + Crates + Drops sammeln.

**Geplante Progression:**
1. **Emerald Forest** (Floor 1) — implementiert inkl. 4 Bosse (Vine Lord, Mossy Behemoth, Pixie Queen, Forest Heart, random pick).
2. **Sapphire Swamp** (Floor 2) — implementiert. 4 Mobs (Bog Frog, Snapper Bloom, Damselfly, Bog Tortoise), 4 Bosse (Toad Sovereign, Bloomheart, Damselfly Empress, Bog Colossus). Eigene Decos (Lily Pad + Mangroven-Wurzel) statt der Forest-Decos via `decorationStyle`-Diskriminator.
3. **Onyx Mansion** (Endgame) — Phase 5 Chunk 4, finaler Boss + Secret Endboss (gem-locked) + Win-Screen.

Weitere Edelsteinfloors (Ruby/Topaz/...) können zwischen Sapphire und Onyx ergänzt werden. Floor-Reihenfolge wird in `FLOOR_ORDER` (`GameScene.ts`) gegated; Stairs verwenden den nächsten Eintrag.

**Door-System:** Türen rendern kind-aware Texturen wenn geschlossen, sodass der Spieler im Kampf sieht welche Räume anschließen. `Door.barrierTextureKey()` switch:
- `Boss` → `bossDoorKey(floorId)` (Totenkopf-Sigil, immer)
- `Treasure` → `treasureDoorKey(floorId)` (Goldtruhe), bei `locked` → `treasureDoorLockedKey` (Truhe + Eisen-Lock-Plate mit Schlüsselloch)
- `Shop` → `shopDoorKey(floorId)` (Goldmünze mit Tally-Marks — *nicht* "$"-Glyph, weil das beim Pixel-Scaling wie ein Schlüsselloch gelesen wurde), bei `locked` → `shopDoorLockedKey`
- `Normal` → `normalDoorKey(floorId)` (Holzplanken-Tür mit Eisenband + Ring-Griff)

Drawn in `PreloadScene` per Floor-Theme. `drawLockBadge` ist shared zwischen Treasure/Shop-Locked-Varianten.

**Item-Pool-Floor-Filter:** `pickItemFromPool(pool, rng, exclude, currentFloor?)` filtert nur den Boss-Pool nach `ItemDefinition.floor`. Treasure/Shop-Items haben bewusst kein Floor-Tag (sind floor-agnostic). Beim Boss-Reward übergibt `spawnBossPoolItem` den `currentFloorId`. Items ohne `floor`-Tag werden in jedem Boss-Pool gefunden — derzeit haben aber alle 6 Boss-Items einen Floor-Tag.

---

## Visual / UX Polish

**Title Screen (Key-Art Illustration)** — `MainMenuScene.ts` ist als gemaltes Poster aufgebaut, nicht als Text-Menü. Layered Backdrop via `Phaser.GameObjects.Graphics`: Sky-Gradient (16-Strip Fake-Gradient von dunkellila → dunkelteal), pinker Mond-Halo (5 konzentrische Layer) hinter der Queen für ominöses Backlight, distanter Forest (Triangel-Tannen-Silhouetten) + mid-range Forest (Stamm + 3 überlappende Foliage-Circles), mossy Ground-Curve, Mist-Bands, ~15 Glühwürmchen (forest-grün + ein paar pixie-pink). **Wizard** (Player-Texture scaled 4x) links bei (240, GAME_HEIGHT/2+60) leicht nach rechts geneigt mit grün-goldener Glow-Aura unter den Füßen. **Pixie Queen** (BossPixieQueen-Texture scaled 4x) rechts bei (GAME_WIDTH-240, GAME_HEIGHT/2-30) leicht nach links geneigt, sanfter 1.8s Hover-Bob. **Action**: Magic-Missile-Streak (6 Beads entlang Quadratic Bézier vom Wand zur Queen, fade + Glow + Sparkle), Pixie-Thorn-Volley (3 Thorns mit Tracer-Streaks zurück). **Title** "PRISMANCY" 88px bold mit Stroke + Drop-Shadow + 2s Scale-Pulse. **Subtitle** pulst alpha 0.55→1 alle 900ms. Komposition rein prozedural, keine externen Assets.

**Themed Walls** (`PreloadScene.drawForestWallTexture` / `drawSwampWallTexture`) — gebrancht über `theme.decorationStyle`. **Forest**: 4 vertikale Bark-Planks (14 px Wide + 2 px Gap) mit Outline + Highlight-Strip + Bark-Grooves + 0-2 Astknoten pro Plank, Moos-Krone oben (4 überlappende dunkelgrüne Domes mit Highlights + 3 Blatt-Silhouetten die rauspeeken), 1-3 Glühwürmchen mit Outline+Sparkle-Pixel in palette-glow Farbe. **Swamp**: Algen-Slime-Background, 5-6 vertikale Mangroven-Wurzeln segmentiert (8 px Stack-Segmente mit per-Segment Drift für organischen Look), Highlight + Shadow Strip pro Wurzel, dünne Teal-Algen-Threads quer drüber, 2-4 Sapphir-Glow-Knoten an Wurzel-Joints, hängende Algen-Strähnen am Top-Edge.

**Forest Decoration Polish** (`drawTreeTexture` / `drawRockTexture`) — beide neu gezeichnet damit sie zur Sapphire-Polish-Latte (zentraler Anker + radiales Detail + 4 Tonbänder + Outline+Sparkle-Pixel) passen. **Tree**: asymmetrische Foliage-Crown mit 4 Tonbändern (deep shadow / mid green / upper highlight / brightest), Wurzelflanken am Stammbase, getaperter Stamm, herausragende Blatt-Silhouetten an der Krone, 3 Glühwürmchen mit Outline+Sparkle in Glow-Farbe. **Rock**: asymmetrischer Doppelkörper (Hauptkörper + side lump) statt Single-Ellipse, 4 Tonbänder, Moos-Cap mit Drip-Tendrils, **Smaragd-Kristall-Cluster** auf der Krone als Echo der Mangroven-Glow-Nodes (3 dreieckige Shards mit Glow-Fill + Highlight-Pixel).

**Wand Sparkle on Cast** (`Player.spawnWandSparkle`) — 3.5 px goldener Funke (`0xfff8c0`) am Wand-Tip (Sprite-relativ +15, +3 vom Center, eine Layer über `DepthLayers.Player`) bei jedem Schuss. Fadet alpha + scale via Tween über 150 ms, self-cleaning. **Wichtig**: Body-Animation (Walk-Bob via Scale + Rotation, Shoot-Kick via Lean) wurde versucht und verworfen — Sub-Pixel-Verzerrung auf Pixel-Art-Sprites sieht durchgehend falsch aus. Saubere zukünftige Path: Multi-Frame Sprite-Sheet (Walk-Cycle A/B + Cast-Frame), kommt in Phase 6.

**Music** — Phase 6 wartet auf echte Audio-Files (OGG/MP3). Ein prozeduraler Web-Audio-Versuch (3 Tracks, lookahead-Scheduler, crossfade) wurde gebaut und wieder entfernt — proceduraler Sound passte nicht zum Aesthetic. Git-History hat den Code falls jemand das später als Placeholder reaktivieren will.

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
