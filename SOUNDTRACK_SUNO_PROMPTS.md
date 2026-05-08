# Prismancy — Suno Prompt Cheat-Sheet

Ergänzung zum `SOUNDTRACK_BRIEF.md`. **Direkt copy-paste-ready für Suno.** Pro Track: 1 Style-Prompt + optional Lyrics-Field-Struktur + Notes.

---

## Wie man Suno aus dem Cinematic-Default kriegt

Suno kippt automatisch in Hans-Zimmer-Modus, sobald du "boss", "epic", "dark fantasy", "orchestra", "choir", "buildup", "cinematic" benutzt. Auch indirekt — z.B. "pipe organ" triggert oft orchestrale Begleitung. **Das ist der Hauptgrund warum frühere Versuche zu episch waren.**

**Anti-Cinematic-Tricks:**

1. **Custom Mode benutzen** (nicht Quick / Simple Mode). Du brauchst Kontrolle über das Style-Feld.
2. **Style-Field-Format:** `[genre], [tempo], [3 instruments max], [mood], instrumental, [3-4 negative prompts]`
3. **Negative-Prompts ALWAYS:** mindestens `no orchestra, no choir, no movie trailer drums`. Bei Boss-Tracks zusätzlich `no buildup, no crescendo` — sonst macht Suno daraus eine 90-sec-Trailer-Komposition mit drop am Ende.
4. **Reference-Artists die Suno wirklich versteht:** Boards of Canada, Burial, Jon Hopkins, Stars of the Lid, Tim Hecker, Aphex Twin, Lustmord, Mortiis (für dungeon synth). **Vermeide:** Ridiculon, andere Indie-Game-Composer — die kennt Suno nicht und füllt den Slot mit Hollywood-Score.
5. **Genre-Tags die Suno gelernt hat:** `dungeon synth`, `dark ambient`, `dark folk`, `drone`, `post-rock instrumental`, `slowcore`, `ritual ambient`, `gothic baroque`, `dark waltz`. Diese Cluster sind sauber separiert.
6. **Lyrics-Feld:** Schreib `[Instrumental]` rein. Für Tracks mit Struktur (Title, Boss-Tracks, Prismarch) kannst du strukturelle Cues geben — siehe pro Track unten. Suno nimmt diese Tags ernst, auch ohne tatsächliche Lyrics.
7. **Generate 2 Variants pro Prompt** (Suno macht das automatisch wenn du auf Generate klickst — nutzt 2 Credits). Nimm die bessere, regenerier die andere wenn nötig.
8. **Track-Reihenfolge:** Fang mit **Track 1 (Title)** an — am charaktervollsten, dial den Vibe ein. Dann **Track 2 (Emerald Floor)** — gleicher Stil-Cluster, einfach zu treffen. Dann **Track 3 (Emerald Boss)** — testet ob du Boss-Cluster ohne Cinematic hinkriegst. Wenn das klappt, fließt der Rest. Wenn nicht: Tactic ändern.
9. **Don't over-iterate:** Nach 3 Generations ohne brauchbares Result, **Reference-Artist tauschen** oder **Genre-Tag wechseln** — nicht den ganzen Prompt umschreiben. Single-Variable-Iteration ist effizienter.

---

## Track 1: Title Theme — "Prismancy"

**Style-Field:**
```
dungeon synth, melancholic medieval folk, slow 75 bpm, lone fingerpicked acoustic guitar, soft string pad, distant music box chimes, warm tape hiss, instrumental, looping, no drums, no orchestra, no buildup
```

**Lyrics-Field:**
```
[Intro: pad alone]
[Verse: guitar lead enters with chime]
[Bridge: pad swells]
[Verse: guitar lead returns]
[Outro: fade to pad]
[Instrumental]
```

**Notes:** Ohne Drums + ohne Buildup ist das Wichtigste — Suno will sonst aus dem Pad eine Trailerkomposition machen. Falls Suno trotzdem Drums dazu macht: explizit `absolutely no percussion` reinpacken. Reference-Artist falls Variant brauchst: `in the style of Boards of Canada`.

---

## Track 2: Emerald Forest — Floor Theme

**Style-Field:**
```
dungeon synth folk, mid tempo 92 bpm, fingerpicked acoustic guitar, soft cello drone, sparse mallet bells, brushed snare, mossy forest atmosphere, instrumental, looping, no orchestral strings, no choir, no buildup
```

**Lyrics-Field:**
```
[Instrumental]
[Loop: 2 minute structure, no drops]
```

**Notes:** "Brushed snare" ist der Trick um Drums OHNE harten Backbeat zu kriegen — Suno macht damit einen jazzy-organic feel statt rock-Backbeat. Falls zu drum-lastig: `minimal percussion` reinpacken. In-the-Style-Of-Variant: Boards of Canada (warmth) oder Mount Eerie (folk-ambient).

---

## Track 3: Emerald Forest — Boss Theme

**Style-Field:**
```
dark folk rock instrumental, driving 108 bpm, distorted electric bass, tribal toms and snare, repetitive cello riff in phrygian mode, intense looping, no vocals, no choir, no orchestra, no movie trailer drums, no buildup
```

**Lyrics-Field:**
```
[Instrumental]
[Loop: maintain intensity, no drops, no climax]
```

**Notes:** Hier ist der Anti-Cinematic-Push am wichtigsten. "No buildup, no climax" + "maintain intensity" + "loop" — alle drei Cues sagen Suno: kein Trailer-Arc, sondern eine Loop-Schleife. Falls Suno trotzdem mit langsamem Intro startet: `cold open, immediately full intensity` reinpacken.

---

## Track 4: Sapphire Swamp — Floor Theme

**Style-Field:**
```
dark ambient drone, slow 80 bpm, bowed double bass, glass marimba, distant water drips, tape hiss, eerie swamp atmosphere, looping instrumental, in the style of Tim Hecker, no drums, no melody, no buildup
```

**Lyrics-Field:**
```
[Instrumental]
[Drone: continuous, no sections]
```

**Notes:** "No melody" ist hier wichtig — Suno will sonst eine wiedererkennbare Hook reinmacheln. Wir wollen *Atmosphäre*, keine Phrase. Tim Hecker als Reference-Artist gibt den washy-distorted-Ambient-Vibe. Falls zu langweilig (Variant 1 zu statisch): `slowly evolving, new texture every 30 seconds` ergänzen.

---

## Track 5: Sapphire Swamp — Boss Theme

**Style-Field:**
```
ritualistic dark ambient with tribal drums, 95 bpm, deep taiko hits, distorted sub bass drone, wordless ahh choir layers, bowed contrabass, ceremonial heavy looping, no orchestra, no fanfare, no movie trailer
```

**Lyrics-Field:**
```
[Vocalise: wordless ahh chants]
[Instrumental otherwise]
[Loop: ritualistic intensity throughout]
```

**Notes:** Choir hier ist OK — wordless "ahh" Chants sind klassisch ritual-ambient (ähnlich Lustmord), nicht Hollywood-Choir. Trick ist `wordless` + `chants` statt `choir`. "Tribal drums" + "taiko" lassen Suno auf akustische Drums gehen, nicht auf orchestrale Pauken. Reference-Artist falls nötig: `in the style of Lustmord`.

---

## Track 6: Onyx Mansion — Floor Theme

**Style-Field:**
```
gothic dungeon synth, harpsichord lead, slow 78 bpm, soft pipe organ pad, distant music box bells, decaying mansion atmosphere, instrumental looping, in the style of Mortiis, no drums, no choir, no orchestral strings, no cinematic buildup
```

**Lyrics-Field:**
```
[Instrumental]
[Slow harpsichord melody, looping]
[No buildup, no climax]
```

**Notes:** Mortiis als Reference-Artist ist gold für gothic dungeon synth — Suno kennt ihn und der Vibe ist exakt das was wir brauchen. "Soft pipe organ pad" (nicht "pipe organ") ist der Unterschied zwischen "Bach-Style-Lead" und "Atmosphere-Bett". Falls der Harpsichord zu fast wird: `slow harpsichord with sustained notes` reinpacken.

---

## Track 7: Onyx Mansion — Boss (Marquis of Mirages)

**Style-Field:**
```
dark gothic waltz, 3/4 time, 108 bpm, harpsichord and pizzicato strings, kettle drums, vampire ballroom theatrical mood, instrumental, no vocals, no orchestra, no movie trailer, looping with two phases
```

**Lyrics-Field:**
```
[Phase 1: 3/4 waltz, harpsichord lead]
[Phase 2: tempo locks 4/4, drums dominate]
[Instrumental]
```

**Notes:** **3/4 time signature** ist der Schlüssel — Suno respektiert das überraschend gut wenn du es deutlich angibst. "Vampire ballroom" ist genau der Vibe für den Marquis (caped conjurer, Hand-Spiegel, theatrical). "Kettle drums" statt "drum kit" hält's klassisch-Pauke statt Rock-Backbeat. Falls Suno Phase-2-Wechsel ignoriert (wahrscheinlich): mach zwei separate Tracks (Phase 1 + Phase 2) und cross-fade im Spiel selbst.

---

## Track 8: The Prismarch — Endboss Theme

**Style-Field:**
```
apocalyptic doom drone with post rock crescendo, 100 bpm, distorted guitar drone, tribal drums slowly building, wordless ahh choir layers, three phase escalation, in the style of Sunn O))) and Godspeed You Black Emperor, instrumental, no vocals, no movie trailer
```

**Lyrics-Field:**
```
[Phase 1: drone alone, sparse drums, 60 sec]
[Phase 2: choir enters, drums double, 60 sec]
[Phase 3: full wall of sound, 60 sec]
[Resolution: brief tail]
[Instrumental]
```

**Notes:** Endboss ist der einzige Track wo *kontrollierter* Buildup gewollt ist — drei Phasen, jede härter. Sunn O))) (drone-doom) + Godspeed You! Black Emperor (post-rock crescendo) sind beide Suno-bekannt und liefern den richtigen Build-Ohne-Hollywood. **WICHTIG:** "movie trailer" trotzdem als Negative-Prompt drin, sonst rutscht Suno in den Trailer-Pattern. Falls Track zu kurz für drei Phasen: zwei separate Tracks (Phase 1+2 als ein Track, Phase 3 als zweiter) und im Spiel switchen.

---

## Falls Suno hartnäckig in Cinematic kippt

Wenn ein Track nach 3 Generations nicht passt, eskaliere die Negative-Prompts:

**Standard-Negative-Prompts:**
```
no orchestra, no choir, no movie trailer drums, no buildup
```

**Verstärkte Negative-Prompts (Stufe 2):**
```
no symphony, no string section, no brass, no timpani, no Hans Zimmer, no Two Steps From Hell, no epic, no cinematic, no trailer music, no Marvel score
```

**Nuklear-Option (Stufe 3) — wenn nichts hilft, Genre komplett wechseln:**
- Statt "dungeon synth" → "lo-fi hip hop instrumental, dark mood" (treibt Suno in chillhop-Cluster, sehr different von Hollywood)
- Statt "dark ambient" → "noise music, harsh ambient, in the style of Merzbow restrained"
- Statt "boss music" → "industrial techno, slow tempo"

Die letzte Option ist drastisch aber funktioniert — Genre-Switch ist immer effektiver als Prompt-Tuning innerhalb des Genres, wenn das Modell den Default nicht loslassen will.

---

## Quick-Reference: Was kostet ein voller Soundtrack-Run?

- 8 Tracks × 2 Variants × 1 Generation = **16 Generations**
- Suno Free: 50 Credits/Tag = **3 Tage** wenn alle Generations beim ersten Mal sitzen
- Realistisch (mit 2-3 Iterationen pro Track): **40-60 Generations = 1 Woche bei Free-Tier**
- Suno Pro ($8/Monat, 2500 Credits): einmalig zahlen, dann reicht das easy

Wenn du auf Free-Tier bist und ein Track gar nicht klappen will, lieber **liegen lassen + nächsten Tag versuchen** statt heute alle Credits in einen Track verbrennen. Anderer Wahrnehmungs-Zustand am Folgetag hilft beim Beurteilen welche Variant tatsächlich passt.

---

## Wenn alle Stricke reißen

Falls Suno mit allen Tricks weiter in Cinematic kippt:

1. **Wechsel zu Udio** — laut Reports weniger Bias zu Hollywood, mehr instrumental control
2. **Wechsel zu Stable Audio** (free tier, 45 sec Snippets) — kürzere Tracks generieren weniger Buildup-Druck
3. **CC0-Source-Browse** — `freemusicarchive.org` (CC0 + CC-BY filter), `pixabay.com/music`, `opengameart.org`
4. **Soundfont-Pipeline ins Spiel** — wir nehmen die existierende prozedurale Engine und tauschen die Synth-Voices durch Sample-Buffers aus echten Instrumenten (kostenlose SF2 Soundfonts gibts massenhaft). Wäre Code-Arbeit, aber liefert garantiert spielmusik-tauglichen Output ohne externe Tools.
