# Prismancy — Website Content

> Zusammengestellt aus `CLAUDE.md` + `src/data/` (floors, items, bosses, enemies) als Vorlage für die Spiel-Website. Werte sind der aktuelle Stand im Code.

---

## 1. Kurzbeschreibung (Tagline / Hero)

**Prismancy** — ein 2D-Top-Down-Roguelike mit Terraria-inspiriertem Wizard-Theme.

Du bist ein kleiner Zauberer mit Magic Wand, der sich durch prozedural generierte, edelsteinbenannte Dungeons kämpft. Schieße Magic Missiles, weiche Bullet-Hell-Mustern aus, sammle Wands, Spellbooks und Tränke, die deine Zauber verändern — und fang bei jedem Tod von vorne an. Permadeath. Jeder Run ist anders.

**Kurz-Tagline-Optionen:**
- „Ein Zauberer. Drei Edelstein-Welten. Ein Licht, das gebannt werden will."
- „Top-Down-Magie-Roguelike mit Permadeath."
- „Cast. Dodge. Die. Repeat."

---

## 2. Genre & Eckdaten

| | |
|---|---|
| **Genre** | Top-Down Action-Roguelike (Bullet-Hell-Light) |
| **Inspiration** | Struktur: *The Binding of Isaac* · Look & Feel: *Terraria* |
| **Perspektive** | 2D Top-Down |
| **Kernschleife** | Run-basiert, Permadeath, prozedurale Dungeons |
| **Plattform** | Browser / Desktop (Web-Tech) |
| **Stil** | Flat-Vector / Cartoon-Look (komplett prozedural gezeichnet) |
| **Steuerung** | WASD bewegen · Pfeiltasten zaubern (Twin-Stick) · TAB Karte · Q Aktiv-Item · ESC Pause |

---

## 3. Story & Setting

Die Welt von Prismancy gliedert sich in **edelsteinbenannte Ebenen (Floors)**, jede mit eigener Atmosphäre, eigenen Gegnern und eigenem Boss. Der Zauberer steigt von der lebendigen **Smaragd-Wald** über den nebligen **Saphir-Sumpf** bis in die verfluchte **Onyx-Villa** ab.

Im Zentrum des Endgames steht **das Licht** — und das, was darin lauert. Hinter der Onyx-Villa wartet **das Gem-Siegel**: Wer alle drei Edelsteine eines makellosen (No-Hit-)Sieges gesammelt hat, kann das Siegel aktivieren und den geheimen Endboss herausfordern — **The Prismarch**, eine zerlumpte Kultisten-Gestalt, die die Edelsteine absorbiert und das Prisma gefangen hält.

**Zwei Enden:**
- **VICTORY (Full)** — Den Prismarch besiegen. „The light has been banished." Schaltet einen kosmetischen Skin frei.
- **VICTORY? (Incomplete)** — Die Villa ohne alle Gems verlassen. „It's still lurking in the light."

---

## 4. Charaktere (spielbar)

### Der Zauberer (Wizard) — Standard
Kleiner Magier mit Magic Wand. Schießt präzise, geradlinige Magic Missiles. **3 Herzen** Start-HP. Allrounder, single-target-DPS-König.

- **Skin „Prismancy"** (rot/gold) — Trophäe für den Prismarch-Kill.

### Der Spellblade (Schwertmagier) — freischaltbar
Glass-Cannon-Variante, freigeschaltet nach dem ersten Prismarch-Sieg. Kämpft mit einem **Spell-Sword-Bolt** (langsamer, schwerer, durchschlägt Gegner) plus einem **8-Wege-Dash mit i-Frames**. Nur **2 Herzen** Start-HP — zwingt zum aktiven Ausweichen.

- **+50 % Schaden**, baseline Pierce-1, größere Hit-Visuals, Dash-Ausweichen
- Eigener Prismarch-Skin (rot/schwarz/gold), gegated auf einen Prismarch-Kill *als Spellblade*

---

## 5. Floors (Ebenen)

Drei vollständig ausgearbeitete Ebenen, prozedural generiert, progressiv länger und härter.

### 🟢 Emerald Forest (Smaragd-Wald) — Floor 1
Magisch-leuchtender Wald, dunkles Moos mit cyan-grünem Glow. Glühwürmchen, Bäume, Pilze. Der sanfte Einstieg.
- **Räume:** ~10 · **Gegner:** Forest Sprite, Mossy Slime, Vine Sprout, Pixie Dancer
- **Miniboss:** Grovekeeper · **Bosse:** 4 (zufällig)

### 🔵 Sapphire Swamp (Saphir-Sumpf) — Floor 2
Trüber tiefblauer Sumpf bei Nacht, Saphir-blaue Lichter, Mangrovenwurzeln & Seerosen. Mehr Bullet-Hell-Druck.
- **Räume:** ~12 · **Gegner:** Bog Frog, Snapper Bloom, Damselfly, Bog Tortoise
- **Miniboss:** Bog Hag · **Bosse:** 4 (zufällig)

### 🟣 Onyx Mansion (Onyx-Villa) — Endgame
Tiefviolett-schwarze Spukvilla bei Kerzenlicht, Amethyst-Glow + Goldverzierungen, Gemälde mit glühenden Augen. Der finale Floor.
- **Räume:** ~14 · **Gegner:** Wraith, Possessed Candelabra, Cursed Mirror
- **Miniboss:** Doppelgänger · **Boss:** Marquis of Mirages · **Geheim-Endboss:** The Prismarch

---

## 6. Bosse

Pro Floor wird (auf Emerald & Sapphire) zufällig einer von vier Bossen gezogen. Onyx hat einen festen Standard-Boss plus den geheimen Endboss.

### Emerald Forest
| Boss | HP | Kurzbeschreibung |
|---|---|---|
| **Vine Lord** | 60 | Festgewachsen. Phase 1: 3-Dornen-Fächer · Phase 2: 8-Dornen-Welle + Vine-Sprout-Adds, taucht ab & wieder auf |
| **Mossy Behemoth** | 60 | Hüpfender Koloss. Phase 2: schnellere Hops + Slime-Adds. Spaltet sich beim Tod in 2–3 Slimes |
| **Pixie Queen** | 50 | Teleportiert zwischen Bäumen mit Sparkle-Wolke. Pinke runde Orbs, 4- → 6-Dornen-Stern + Pixie-Adds |
| **Forest Heart** | 70 | Stationär, pulsierend. 6-Dornen-Radialwellen, Phase 2 häufiger + Forest-Sprite-Adds |

### Sapphire Swamp
| Boss | HP | Kurzbeschreibung |
|---|---|---|
| **Toad Sovereign** | 70 | Zungen-Hop-Angriffe → Phase 2: 3-Hop-Combo + 5-Dornen-Radial pro Landung |
| **Bloomheart** | 60 | Festgewachsen, 5-Dornen-Fächer → Phase 2: schneller + verzögerte Sporen-Bursts |
| **Damselfly Empress** | 50 | Dash mit senkrechter Spur → Phase 2: schnellerer Rhythmus + 5-Dornen-Landungs-Radial |
| **Bog Colossus** | 75 | Gungeon-Style Dual-Radial → Phase 2: rotierendes Mandala aus inneren/äußeren Dornen |

### Onyx Mansion
| Boss | HP | Kurzbeschreibung |
|---|---|---|
| **Marquis of Mirages** | 75 | Standard-Boss. Caped-Conjurer-Magier. Phase 1: Kiten + 5-Dornen-Fächer + Teleport + **Spiegel-Portal-Special** (homing Missiles, Eingangsportal zerstörbar) · Phase 2: 8-Arm rotierender Berserker-Stream |
| **The Prismarch** | 90 | **Geheimer Endboss** hinter dem Gem-Siegel. 3-Phasen-AI mit Center-Teleport vor jedem Special: **Forest Wrath** (Emerald-Homing-Schwarm), **Tide Mandala** (Saphir-Orbit-Dornen), **Crimson Web** (14 pulsierende Wellen mit Blitz-Verbindungen & durchschlängelbaren Lücken). Während Charge/Fire unverwundbar |

---

## 7. Gegner (Mobs)

### Emerald Forest
- **Forest Sprite** — fliegt direkt auf dich zu (HP 3)
- **Mossy Slime** — hüpft in Richtung Spieler (HP 5)
- **Vine Sprout** — festgewachsen, schießt Dornen in eine Richtung (HP 4)
- **Pixie Dancer** — umkreist dich statt anzufliegen, Glass-Cannon (HP 2)

### Sapphire Swamp
- **Bog Frog** — hüpft zwischen Schüssen, schnelle Zungen-Projektile (HP 5)
- **Snapper Bloom** — festgewachsen, 3-Dornen-Fächer mit Telegraph (HP 6)
- **Damselfly** — schnelles Strafen + Dash-Burst-Doppelprojektile (HP 4)
- **Bog Tortoise** — langsamer Tank, zieht sich in Panzer zurück (unverwundbar) und ploppt mit 6-Dornen-Radial heraus (HP 8)

### Onyx Mansion
- **Wraith** — Phasing-Verfolger, wird periodisch immateriell (HP 5)
- **Possessed Candelabra** — langsamer Tank, hinterlässt Wachs-Pfützen + feuert Flammen-Cone (HP 9)
- **Cursed Mirror** — festgewachsen, telegraphiert dann zielsuchende Homing-Missile (HP 7)

### Minibosse (35 % Chance pro Floor)
- **Grovekeeper** (Emerald) — langsamer Walker mit 3-Dornen-Fächern + 8-Dornen-Radial-Volleys
- **Bog Hag** (Sapphire) — taucht ab (immateriell), surfaced kurz mit aimed Shots + 6-Dornen-Radial
- **Doppelgänger** (Onyx) — dunkles Spiegelbild des Spielers. Kitet wie ein Spieler, feuert gerade Casts + gefächerte Homing-Salven, Soft-Enrage unter 50 % HP

### Elite-/Champion-Räume
Pro Floor 1–2 Räume mit **einem** elite-promoteten Mob: ×5–6 HP, rote Aura, Dual-Wave-Radial-Bursts, schneller, knockback-immun. Garantierte Coin-Belohnung.

---

## 8. Items

Items modifizieren Stats und die Magic Missiles selbst. Gefunden in Treasure-Räumen, Shops und als Boss-Belohnung.

### Treasure / Shop (floor-agnostisch)
| Item | Effekt |
|---|---|
| **Magic Tome** | +1 Schaden, größere Missile |
| **Hot Tea** | +30 % Feuerrate |
| **Wizard's Sneakers** | +25 Bewegungstempo |
| **Telescopic Wand** | +1 Schaden, +15 % Missile-Tempo |
| **Lead Cap** | +50 % Schaden, −25 % Feuerrate, schwere Missile |
| **Magic Potion** | +0,5 Schaden, +10 Bewegungstempo |
| **Pixie Dust** | +1 max HP, schnellere pinke Missiles |
| **Heart Container** | +1 max HP, voll geheilt |
| **Spyglass** | +1 max HP, +10 % Missile-Tempo |
| **Magic Shard** | Durchschlägt bis zu 2 Gegner (100/75/50 %) |
| **Fire Orb** | Treffer entzünden Gegner (Burn-DoT) |

### Trade-Items (Sidegrades)
| Item | Effekt |
|---|---|
| **Bloodletter's Pact** | [Q] Opfere einen Herz-Container für +20 % auf einen zufälligen Stat |
| **Transmutation Stone** | [Q] 5 Coins → 1 Schlüssel, oder ab 30 Coins → zufälliges Item |
| **Hummingbird Feather** | Casts kommen als schnelle Dreier-Salven |

### Boss-Belohnungen (floor-spezifisch)
- **Emerald:** Crown of the Vine, Ancient Heart, Withered Fang
- **Sapphire:** Lily Diadem, Mire Pearl, Frog's Tongue
- **Onyx:** Bloodbound Chalice, Vampire's Signet, Obsidian Heart
- **Boss-übergreifend:** Wizard Glasses (zwei parallele Bolts)

### Aktiv-Item ([Q])
- **Blood of Marquis** — max HP auf 2 Herzen fixiert, +30 % auf alle Stats, [Q] opfert Blut für eine AOE, die Trash sofort tötet und Bossen 30 % max-HP-Schaden zufügt. Freigeschaltet nach erstem Marquis-Sieg.

---

## 9. Kern-Mechaniken (Feature-Liste für die Website)

- **Prozedural generierte Dungeons** — seeded RNG, jeder Run einzigartig
- **Permadeath** — bei 0 HP geht's zurück zum Start
- **Twin-Stick-Combat** — bewegen + in vier Richtungen zaubern
- **Floor-Progression** — drei thematische Edelstein-Welten mit eigenen Gegnern, Bossen und Atmosphäre
- **Boss-Vielfalt** — 9 reguläre Bosse (zufällig gezogen) + 1 geheimer Endboss
- **Item-Synergien** — Pierce × Burn × Multishot stacken
- **Missile-Modifikatoren** — Piercing, Multishot, Burn-DoT, Homing
- **Zwei spielbare Charaktere** — Wizard (Allrounder) & Spellblade (Glass-Cannon mit Dash)
- **Special-Räume** — Treasure, Shop, Elite/Champion, Miniboss
- **Gem-Siegel-Endgame** — sammle drei No-Hit-Edelsteine, um den Geheim-Endboss zu öffnen
- **Meta-Progression** — Trophäen/Collection-System, freischaltbare Skins & Charaktere
- **Zwei Enden** — Full Victory vs. Incomplete Exit
- **8-Bit-Soundtrack** — 10 originale Tracks (pro Floor, pro Boss, Title, Credits) + 20 prozedurale SFX

---

## 10. Audio

- **Musik:** 10 originale Tracks — Title-Theme, je ein Floor- und Boss-Track pro Welt, geteiltes Miniboss-Theme, Marquis-, Prismarch- und Credits-Track. Nahtlose Crossfades.
- **SFX:** 20 prozedurale 8-Bit-Synth-Sounds (Cast, Hit, Pickups, Türen, Boss-Specials …).

---

## 11. Mögliche Website-Sektionen (Vorschlag)

1. **Hero** — Titel „PRISMANCY" + Tagline + Key-Art (Wizard vs. Pixie Queen)
2. **Was ist Prismancy?** — Genre, Kernschleife, Inspiration
3. **Die Welten** — drei Floor-Karten mit Palette/Atmosphäre
4. **Charaktere** — Wizard & Spellblade
5. **Bosse** — Gallery der 10 Bosse
6. **Items & Build-Vielfalt** — Synergien hervorheben
7. **Features** — Bullet-Liste aus Abschnitt 9
8. **Soundtrack** — Audio-Player/Embed
9. **Call to Action** — „Jetzt spielen" / Download / Wishlist

---

*Stand: 2026-06-17. Quelle: `CLAUDE.md`, `src/data/{floors,items,bosses,enemies}.ts`.*
