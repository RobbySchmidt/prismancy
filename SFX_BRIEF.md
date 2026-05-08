# Prismancy — SFX Brief

Liste aller benötigten Sound-Effects, gegliedert nach Kategorie. Style wird zuerst über zwei Pilot-Sounds (Player-Cast + Enemy-Hit) festgenagelt, dann werden die anderen darauf aufgebaut.

## Volume-Konvention (gelernt aus Pilot-Sounds)
- **Cast (Player)**: bewusst **leiser** als Combat-Feedback. Voice-Gain 0.28. Begründung: das eigene Geballer feuert konstant alle ~250 ms — es soll als Hintergrund-Layer funktionieren, nicht als jedes-Mal-Vordergrund-Punch. Hit-Feedback (Treffer am Gegner) muss da durchschneiden, sonst nimmst du das Casten als "ich balle ins Leere" wahr.
- **Hit-Feedback (Enemy/Player)**: deutlicher als Cast. Voice-Gain ~0.32. Das ist der gameplay-relevante Audio-Cue.
- **Enemy-Cast/Charge**: leiser als Player-Cast (~50–70 % davon) — sonst übertönt 4 gleichzeitig schießende Mobs den Spieler.
- **UI-Sounds** (Menu-Switch, Door-Open): subtil.
- **Big-Moment-Sounds** (Boss-Death, Altar-Aktivierung, Boss-Special, Floor-Teleport): laut + impactvoll, dürfen über die Musik schneiden.
- **Master-Volume**: 0.6 default in `SfxSynth.ts`, alle Voice-Gains sind Ratios darauf.

---

## 1. UI / Menu

- [x] **menu-switch** — Hauptmenü-Item-Hover/Switch. **DONE.** Square 1100→1450 Hz Tick, 40 ms, Voice-Gain 0.18. Hooked an `setMenuFocus` mit `previousIndex !== idx` Guard damit Initial-Focus stumm bleibt.

## 2. Player

- [x] **player-cast** — Wizard schießt Magic Missile. **Pilot-Sound 1 — DONE.** Square 620→1180→820 Hz pitch-slide + highpassed-Noise-Bite. Voice-Gain 0.28 (bewusst leiser als Enemy-Hit weil das eigene Geballer als Hintergrund-Layer und nicht als Vordergrund-Punch funktionieren soll).
- [x] **player-hit** — Spieler nimmt Damage. **DONE.** Triangle 320→90 Hz body + lowpassed-noise burst (500 Hz). Voice-Gain 0.36 (lauteste der Hit-Family, weil HP-Verlust kritisches Feedback ist). Hooked als separater Listener auf `player:tookDamage` un-gated.
- [x] **pickup-coin** — Coin aufnehmen. **DONE.** Klassisch NES-style two-note bleep (square 880→1320 Hz). Voice-Gain 0.22.
- [x] **pickup-key** — Schlüssel aufnehmen. **DONE.** Two-note square 660→990 Hz + highpassed-noise clink (3000 Hz, 30 ms). Voice-Gain 0.24.
- [x] **pickup-heart** — Heart aufnehmen. **DONE.** Triangle perfect-fifth (C5→G5), kein Noise — cleanste der Pickups. Voice-Gain 0.26.
- [x] **pickup-item-normal** — Standard-Item vom Pedestal/Crate. **DONE + upgegraded 2026-05-08.** Punch-Attack Square-Blip (1320 Hz, 40 ms) + 4-note Triangle-Arpeggio C-E-A-C-octave (sixth chord + octave finish, last note sustained 130 ms + lauter) + parallel Octave-up Harmony-Voice (half-vol) + extended highpassed-Sparkle (3500 Hz, 340 ms). Voice-Gain 0.26 main / 0.30 finale-Note / 0.13 harmony. Total ~340 ms. Bleibt distinct vom Gem (kürzer + brighter + kein deep-start).
- [x] **pickup-gem** — Floor-Gem aufnehmen. **DONE.** 4-note Triangle-Arpeggio C-E-G-C-octave + parallel Octave-up-Voice (half-vol harmony) + 5000 Hz prismatic-shimmer-Tail (420 ms). Voice-Gain 0.30 (lautester Pickup, Trophy-Tier).
- [x] **chest-open** — Crate (brown + gold) öffnen. **DONE.** Triangle 180→280 Hz creak-body + lowpassed-noise wood-texture (600 Hz, 80 ms) + 80 ms später ein 2-note Square reveal-pop (660→990 Hz). Total ~180 ms. Hooked an `crate:opened` event.

## 3. Enemies

- [x] **enemy-cast** — Enemy-Projektil-Schuss. **DONE.** Square 480→220 Hz pitch-down + lowpassed-noise tail. Voice-Gain **0.24** (86 % vom Player-Cast — bumped 2026-05-08 von 0.18 auf 0.24, weil's bei Boss-Fights mit lauterer Boss-Music + multi-pattern Action zu leise war). Hooked an `EnemyProjectilePool.fire()` mit 60 ms Throttle damit Multi-Thorn-Fans collapsen. Feuert für ALLE Enemy-Projektile.
- [x] **enemy-hit** — Enemy nimmt Damage. **Pilot-Sound 2 — DONE.** Square-Thump 220→80 Hz + bandpassed-Noise-Burst (900 Hz). Voice-Gain 0.32. Klingt durch overlapping Hits noch durchhörbar.
- [x] **enemy-charge** — Charge / Telegraph-Sound, generisch für alle Wind-ups. **DONE.** Triangle 200→480 Hz wind-up, 340 ms, Voice-Gain 0.13. **Wiring**: Cursed Mirror telegraph + Bog Frog tongue (`beginTelegraph`) + Bog Tortoise shell-pop (`beginShell`) + Pixie Queen teleport-fade (`startTeleport`) + Damselfly Empress dash (`beginTelegraph`) + Bloomheart fan-telegraph (`tickFan`-block) + Lord Onyx teleport (`beginTeleportTelegraph`). Kein Throttle — overlapping charges signalisieren correctly "mehrere Mobs charging gleichzeitig". Prismarch-Special-Charges sind absichtlich NICHT gehookt (eigener prism-special-cast Sound geplant).
- [x] **boss-death** — Boss stirbt. **DONE.** Square 200→50 Hz fall + lowpassed-noise crash (800 Hz, 220 ms) + 250 ms später Triangle 800→100 Hz "ghost trail" für emotionalen Decay. Voice-Gain 0.42 main / 0.18 ghost. ~750 ms total. Hooked an `boss:killed` Event (feuert für alle 10 Bosse inkl. Prismarch — Cosmetic-Unlock-Celebration layered on top, nicht over).

## 4. Doors / Floor

- [x] **door-open** — Tür geht auf. **DONE.** Triangle 200→320 Hz creak + lowpassed-noise scrape (700 Hz, 90 ms). Voice-Gain 0.20. Hooked an `room:doorsOpened` Event (Room.openAllDoors emittet einmal pro Action wenn mind. 1 Tür wirklich state-changed — verhindert 4× Stack pro Room-Clear).
- [x] **door-close** — Tür schließt sich. **DONE.** Triangle 320→140 Hz pitch-down + lowpassed-noise scrape (550 Hz heavier) + 80 Hz Square-thump @ 90 ms (impact "trapped now"). Voice-Gain 0.22. Hooked an `room:doorsClosed`.
- [x] **door-unlock** — Locked-Door wird mit Schlüssel aufgeschlossen. **DONE.** Highpassed-noise click (3200 Hz, 25 ms) + 1320 Hz Square-blip (Click-body) + 80 ms später ascending Triangle 660→990 Hz (Magic-Tail). Voice-Gain 0.26. Hooked an `door:unlocked` Event UND direkt an Gold-Crate spendKey-Path (Crate bypassed das Event, also direkter Call).
- [x] **floor-teleport** — Stairs/Sigil-Aktivierung. **DONE.** 7-note Triangle ascending C4→C6 (262→1046 Hz, 75ms each, last sustained 180ms) + parallel Octave-up Quarter-vol Harmony + sustained highpassed-noise sparkle (4000 Hz) der über 400 ms baut. Total ~650 ms. Voice-Gain 0.30. Direkter Call in `advanceToNextFloor` vor dem fade-out.

## 5. Boss-Specials

- [x] **marquis-mirror-special** — Marquis Portal-Special. **DONE.** Triangle 1100→700→900 Hz wobble (3-segment Glassy-Pitch-Curve) + highpassed-noise sweep (Filter 2000→6000 Hz). Voice-Gain 0.30 main / 0.16 noise. ~600 ms. Direkter Call in `MarquisOfMirages.beginSpecial()`.
- [x] **prism-special-cast** — Prismarch Phase-Charge + GemSeal-3/3-Aktivierung. **DONE.** Triangle 300→800 Hz building rise + parallel Octave-up Triangle (half-vol harmony) + bandpassed-noise sweep mit climbing cutoff (1000→4000 Hz). Voice-Gain 0.34 main / 0.17 octave / 0.14 noise. ~700 ms. Hooked an `lordOnyx:specialFired` UND `seal:activated` (selber Listener, beide Trigger).
- [x] **prism-explosion** — Charge → Fire-Transition. **DONE.** Square 140→45 Hz sub-thump + lowpassed-noise blast (2000 Hz cutoff, 250 ms) + bright 1500 Hz Square flash-click (60 ms decay). Voice-Gain 0.42 thump / 0.34 noise / 0.20 flash. ~300 ms (lautester Sound der Familie). Direkter Call in `LordOnyx.beginPatternFire()`.

---

## Pilot-Sounds (zuerst)

1. **player-cast** — definiert den magischen Wand-Charakter
2. **enemy-hit** — definiert wie "Treffer" generell klingen sollen

Wenn diese zwei stehen und vom User abgenommen sind, wird der Rest darauf aufgebaut (Style-Konsistenz: gleiche Synth-Familie, gleicher Reverb-Charakter, gleiche Bit-Crush-Ebene falls retro pixel-art-feel gewollt).

---

## Style-Fragen (offen — werden mit Pilot-Sounds geklärt)

- **Aesthetic:** lo-fi/8-bit chiptune vs. lush painterly synthwave vs. orchestral-magical? (Music ist painterly-AI-orchestral, also würde matching Style heißen: warme Synths + leichtes Reverb statt 8-bit-Beep)
- **Tool:** Suno wie für Music? Oder dedizierter SFX-Generator (ElevenLabs Sound Effects, Freesound, Audacity self-made)? Suno ist nicht ideal für one-shots <2 sec.
- **Format:** MP3 (wie Music) oder OGG (Phaser empfohlen für SFX)?
- **Variations:** Pro Sound 1 Variant oder 2-3 (z.B. enemy-hit-1/2/3 randomisiert bei jedem Treffer um Repetition zu vermeiden)?
