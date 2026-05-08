/**
 * Procedural 8-bit-style SFX synthesiser.
 *
 * Uses the Web Audio API directly (not Phaser's sound system) because the
 * sounds are oscillator-based one-shots, not file-backed samples. Each
 * `play*` method is a hard-coded recipe: spin up oscillators + envelopes +
 * filters, schedule the envelope, let them decay, then auto-disconnect via
 * `onended`. No buffer caching — modern Web Audio handles thousands of
 * short voices per second cheaply.
 *
 * Singleton because the AudioContext is a per-page resource (browsers cap
 * us at ~6 active contexts) and we want every scene + entity to share one
 * master gain so the SoundSettings volume slider can drive both music and
 * SFX from a single place if we wire it that way later.
 *
 * Browser autoplay: the AudioContext starts in `suspended` state until the
 * user interacts. `play*` calls before that point are silently dropped.
 * Once any play call sees a `running` context (or successfully resumes one
 * after a user gesture), all subsequent calls play normally. Mirrors how
 * MusicManager handles its `sound.locked` situation.
 */

const MASTER_VOLUME_DEFAULT = 0.6;

/**
 * Throttle window for enemy-cast. Multi-projectile patterns (5-thorn fans,
 * Bog Colossus mandalas) call EnemyProjectilePool.fire() many times within
 * one frame — without a throttle each fan would emit a stack of 5+ overlapping
 * cast sounds. 60 ms means a single fan plays as one sound, but two separate
 * enemies firing 80+ ms apart still register independently.
 */
const ENEMY_CAST_THROTTLE_MS = 60;

/** Pickup-sound serializer. Pickups dropped together from a crate (or stacked
 * loot from boss reward) collide on the same frame — without staggering, two
 * pickup sounds scheduled at `ctx.currentTime` blend into one composite that
 * the player perceives as a single weird beep. We queue subsequent pickups
 * behind the previous one with a small gap so coin + key plays as "coin THEN
 * key", audibly distinguishable. Capped at 500 ms forward look so a flood of
 * 10 simultaneous pickups doesn't pile up into a half-second sequence. */
const PICKUP_SLOT_GAP_SEC = 0.04;
const PICKUP_SLOT_MAX_LOOKAHEAD_SEC = 0.5;

class SfxSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVolume = MASTER_VOLUME_DEFAULT;
  private lastEnemyCastAt = 0;
  private nextPickupSoundAt = 0;

  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      // Try to resume if suspended (autoplay policy). Best-effort, no await —
      // if this is the first play after a user gesture, resume() flips state
      // synchronously enough that the upcoming envelope schedules correctly.
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    }
    const Ctor =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.masterVolume;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Player magic-wand cast. Bright square-wave with a fast upward pitch
   * sweep + tiny noise bite at the front. ~150 ms total. Loud (0.55 of
   * master) — this is the player's primary action and shouldn't get drowned.
   */
  playPlayerCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: square-wave with fast upward pitch slide (the "magic" zap)
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(620, t0);
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.05);
    osc.frequency.exponentialRampToValueAtTime(820, t0 + 0.14);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.16);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: short noise bite at attack for "click" + magical sparkle
    const noiseDur = 0.04;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2200;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.13, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(noiseFilter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Enemy takes a hit. Soft thwack: filtered noise burst + low square
   * thump pitched down. ~120 ms. Quiet (0.32 of master) per the SFX brief —
   * enemy sounds shouldn't drown the player's cast even with multiple
   * overlapping hits.
   */
  playEnemyHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: low square thump, pitch sliding down (impact body)
    const thump = ctx.createOscillator();
    thump.type = 'square';
    thump.frequency.setValueAtTime(220, t0);
    thump.frequency.exponentialRampToValueAtTime(80, t0 + 0.09);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, t0);
    thumpGain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.005);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);

    thump.connect(thumpGain).connect(this.master);
    thump.start(t0);
    thump.stop(t0 + 0.12);
    thump.onended = (): void => {
      try {
        thump.disconnect();
        thumpGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: bandpassed noise burst (the "thwack" texture)
    const noiseDur = 0.07;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Enemy-projectile-shot. Darker mirror of player-cast: square wave pitching
   * DOWN instead of up (less magical, more "thwip" / menace), lowpassed-noise
   * tail instead of highpassed (muffled). Voice-Gain 0.24 — 86 % of player-
   * cast (0.28). Was 0.18 (~64 %) initially but during boss fights with
   * louder music + multiple simultaneous patterns the projectile sounds were
   * inaudible; user-flagged + bumped 2026-05-08. Throttled to one play per
   * ENEMY_CAST_THROTTLE_MS so multi-thorn fans don't stack into a wall.
   */
  playEnemyCast(): void {
    const now = performance.now();
    if (now - this.lastEnemyCastAt < ENEMY_CAST_THROTTLE_MS) return;
    this.lastEnemyCastAt = now;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: square wave with downward pitch slide
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.24, t0 + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);

    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.12);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: lowpassed noise — muffled "thwip" tail
    const noiseDur = 0.06;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.16, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Generic enemy charge / telegraph. Triangle wave rising 200 → 480 Hz over
   * ~340 ms, slight attack ramp + sustain + tail-off. Reads as "wind-up,
   * something is coming". Voice-Gain 0.13 (subtle — not a punch, just a
   * heads-up cue that complements the visual telegraph flash).
   */
  playEnemyCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Triangle is warmer + less aggressive than square — better fit for the
    // anticipation feel of a telegraph than a hard NES square buzz.
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t0);
    osc.frequency.exponentialRampToValueAtTime(480, t0 + 0.34);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.13, t0 + 0.08); // slow attack
    oscGain.gain.setValueAtTime(0.13, t0 + 0.26); // sustain
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.36); // quick tail

    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.38);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Player took damage. Lower-body / longer than enemy-hit for clear "ouch
   * me, not them" distinction. Triangle wave for warmer body + lowpassed
   * noise burst for the impact texture. ~190 ms total. Voice-Gain 0.36 —
   * deliberately the loudest hit-class sound because losing HP is the most
   * critical feedback in the game.
   */
  playPlayerHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: triangle thump pitching down — body of the impact
    const thump = ctx.createOscillator();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(320, t0);
    thump.frequency.exponentialRampToValueAtTime(90, t0 + 0.13);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, t0);
    thumpGain.gain.exponentialRampToValueAtTime(0.36, t0 + 0.005);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

    thump.connect(thumpGain).connect(this.master);
    thump.start(t0);
    thump.stop(t0 + 0.18);
    thump.onended = (): void => {
      try {
        thump.disconnect();
        thumpGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: lowpassed noise burst — softer impact texture than enemy-hit's
    // bandpass (we want body, not crack)
    const noiseDur = 0.09;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Pickup-coin. Classic NES-style two-note bleep (low → high). Square wave,
   * bright + clean, no noise. Voice-Gain 0.22.
   */
  playPickupCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = this.acquirePickupSlot(ctx, 0.135);
    this.playArpeggio(
      ctx,
      this.master,
      'square',
      [
        { freq: 880, offset: 0, duration: 0.05, gain: 0.22 },
        { freq: 1320, offset: 0.05, duration: 0.085, gain: 0.22 },
      ],
      t0,
    );
  }

  /**
   * Pickup-key. Metallic clink: short noise burst at front + two-note rising
   * square. Slightly more "structure" than a coin so the player can audibly
   * tell key vs coin without looking. Voice-Gain 0.24.
   */
  playPickupKey(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = this.acquirePickupSlot(ctx, 0.14);

    // Two-note square — same shape as coin but lower base + wider gap
    this.playArpeggio(
      ctx,
      this.master,
      'square',
      [
        { freq: 660, offset: 0, duration: 0.05, gain: 0.24 },
        { freq: 990, offset: 0.05, duration: 0.09, gain: 0.24 },
      ],
      t0,
    );

    // Front-loaded metallic clink — highpassed noise burst, very short
    const noiseDur = 0.03;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Pickup-heart. Warm two-note triangle ascending a perfect fifth (C5 → G5).
   * No noise — the cleanest of the pickups, reads as "soft, healing". Slower
   * decay than coin/key for warmth. Voice-Gain 0.26.
   */
  playPickupHeart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = this.acquirePickupSlot(ctx, 0.22);
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 523, offset: 0, duration: 0.1, gain: 0.26 },
        { freq: 783, offset: 0.07, duration: 0.15, gain: 0.26 },
      ],
      t0,
    );
  }

  /**
   * Pickup-item-normal. Punch-attack square blip + 4-note ascending triangle
   * arpeggio (C-E-A-C-octave) + parallel octave-up harmony voice + extended
   * highpassed-noise sparkle. Used for all standard items (Treasure-pedestal,
   * Shop-buy, Crate-drop). Voice-Gain 0.26 main, 0.13 harmony. Bumped from
   * 3-note to 4-note + harmony 2026-05-08 — User-flagged the original as
   * "could be more exciting" and wanted a bigger "you got something!" feel.
   * Stays distinct from `pickupGem` by being shorter overall (~340 ms vs
   * gem's ~420 ms) + faster note spacing + brighter (no deep starting note).
   */
  playPickupItem(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = this.acquirePickupSlot(ctx, 0.34);

    // Punch attack — square blip at the moment of pickup. Gives a percussive
    // "I got it!" hit before the melody plays, much like SNES item-grab
    // sounds layer a click on top of the chime.
    const attack = ctx.createOscillator();
    attack.type = 'square';
    attack.frequency.setValueAtTime(1320, t0);

    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(0.0001, t0);
    attackGain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.003);
    attackGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);

    attack.connect(attackGain).connect(this.master);
    attack.start(t0);
    attack.stop(t0 + 0.05);
    attack.onended = (): void => {
      try {
        attack.disconnect();
        attackGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // 4-note ascending triangle: C5-E5-A5-C6 (sixth chord arpeggio + octave)
    // Last note sustained + slightly louder for the "ta-da" finish
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 523, offset: 0.04, duration: 0.07, gain: 0.26 },
        { freq: 659, offset: 0.1, duration: 0.07, gain: 0.26 },
        { freq: 880, offset: 0.16, duration: 0.07, gain: 0.26 },
        { freq: 1046, offset: 0.22, duration: 0.13, gain: 0.3 },
      ],
      t0,
    );

    // Octave-up harmony — adds shimmer without doubling the melody. Half
    // volume so it stays a layer, not a competing voice.
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 1046, offset: 0.04, duration: 0.07, gain: 0.13 },
        { freq: 1318, offset: 0.1, duration: 0.07, gain: 0.13 },
        { freq: 1760, offset: 0.16, duration: 0.07, gain: 0.13 },
        { freq: 2093, offset: 0.22, duration: 0.13, gain: 0.13 },
      ],
      t0,
    );

    // Extended highpassed-noise sparkle — slightly louder + lasts through
    // the whole melody instead of fading early
    const noiseDur = 0.34;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Pickup-gem. Trophy-tier sound: 4-note ascending arpeggio (C-E-G-C octave)
   * with a parallel triangle voice an octave up for harmony, plus highpassed
   * noise sparkle. Loudest of all pickups (Voice-Gain 0.30) because gems are
   * earned through no-hit boss kills — the audio should celebrate.
   */
  playPickupGem(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = this.acquirePickupSlot(ctx, 0.4);

    // Main melodic arpeggio
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 523, offset: 0, duration: 0.09, gain: 0.3 },
        { freq: 659, offset: 0.08, duration: 0.09, gain: 0.3 },
        { freq: 783, offset: 0.16, duration: 0.09, gain: 0.3 },
        { freq: 1046, offset: 0.24, duration: 0.16, gain: 0.3 },
      ],
      t0,
    );

    // Octave-up harmony — half volume so it adds shimmer without doubling
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 1046, offset: 0, duration: 0.09, gain: 0.14 },
        { freq: 1318, offset: 0.08, duration: 0.09, gain: 0.14 },
        { freq: 1567, offset: 0.16, duration: 0.09, gain: 0.14 },
        { freq: 2093, offset: 0.24, duration: 0.16, gain: 0.14 },
      ],
      t0,
    );

    // Prismatic shimmer — long highpassed noise that lingers past the notes
    const noiseDur = 0.42;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Sequence one or more notes on a shared oscillator type. Each note schedules
   * its own oscillator + envelope at the given offset from "now", so the
   * resulting melody stays coherent even if the AudioContext clock jitters.
   */
  private playArpeggio(
    ctx: AudioContext,
    master: GainNode,
    oscType: OscillatorType,
    notes: ReadonlyArray<{
      freq: number;
      offset: number;
      duration: number;
      gain: number;
    }>,
    explicitBaseTime?: number,
  ): void {
    const baseTime = explicitBaseTime ?? ctx.currentTime;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      osc.type = oscType;
      osc.frequency.value = note.freq;

      const gainNode = ctx.createGain();
      const startAt = baseTime + note.offset;
      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, startAt + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);

      osc.connect(gainNode).connect(master);
      osc.start(startAt);
      osc.stop(startAt + note.duration + 0.02);
      osc.onended = (): void => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // already disconnected
        }
      };
    }
  }

  /**
   * Crate-open. Wooden creak (triangle thunk + lowpassed noise) followed by
   * a small "reveal" two-note bleep so the moment reads as "lid pops, loot
   * inside". Same sound for brown + gold crates per the brief — gold-crate
   * specialness is communicated visually. Voice-Gain ~0.26.
   */
  playChestOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: wooden creak body — triangle pitching slightly up
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(180, t0);
    body.frequency.exponentialRampToValueAtTime(280, t0 + 0.07);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, t0);
    bodyGain.gain.exponentialRampToValueAtTime(0.26, t0 + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

    body.connect(bodyGain).connect(this.master);
    body.start(t0);
    body.stop(t0 + 0.1);
    body.onended = (): void => {
      try {
        body.disconnect();
        bodyGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: wooden texture — lowpassed noise creak
    const noiseDur = 0.08;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 3: reveal-pop — small ascending square bleep, offset 80 ms
    this.playArpeggio(
      ctx,
      this.master,
      'square',
      [
        { freq: 660, offset: 0, duration: 0.05, gain: 0.18 },
        { freq: 990, offset: 0.05, duration: 0.1, gain: 0.18 },
      ],
      t0 + 0.08,
    );
  }

  /**
   * Door-open. Wooden creak: triangle pitching up + lowpassed-noise scrape.
   * Voice-Gain 0.34 — bumped 2026-05-08 from 0.20 because user-flagged it
   * was inaudible relative to music + player-cast. Now sits between
   * player-cast (0.28) and player-hit (0.36).
   */
  playDoorOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: triangle creak pitching up
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t0);
    osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.1);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.34, t0 + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);

    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.14);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: wood-scrape lowpassed noise
    const noiseDur = 0.09;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Door-close. Mirror of door-open: triangle pitching DOWN + lower-cutoff
   * lowpassed noise + brief square thump at the end for the "trapped now"
   * impact. Voice-Gain 0.36 — bumped 2026-05-08 from 0.22 because user-
   * flagged inaudible. Slightly louder than door-open (0.34) so "trapped"
   * registers harder than "freedom".
   */
  playDoorClose(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: triangle creak pitching down
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t0);
    osc.frequency.exponentialRampToValueAtTime(140, t0 + 0.1);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.36, t0 + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);

    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.15);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: wood-scrape lowpassed noise (lower cutoff = heavier)
    const noiseDur = 0.09;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 550;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.26, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 3: low square thump at the end — the "trapped" impact. Frequency
    // bumped from 80 Hz to 120 Hz so laptop speakers (which roll off below
    // ~100 Hz) can actually reproduce it.
    const thump = ctx.createOscillator();
    thump.type = 'square';
    thump.frequency.setValueAtTime(120, t0 + 0.09);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, t0 + 0.09);
    thumpGain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.095);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

    thump.connect(thumpGain).connect(this.master);
    thump.start(t0 + 0.09);
    thump.stop(t0 + 0.18);
    thump.onended = (): void => {
      try {
        thump.disconnect();
        thumpGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Door-unlock. Metallic click (highpassed-noise + brief square blip)
   * followed by an ascending magic-tail bleep. Plays BEFORE door-open when a
   * key is consumed on a locked door, AND when a key is spent on a gold
   * crate (same mechanic). Voice-Gain ~0.26.
   */
  playDoorUnlock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: metallic click — highpassed noise burst
    const noiseDur = 0.025;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3200;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: short square blip at the click moment — gives the click body
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.setValueAtTime(1320, t0);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.0001, t0);
    clickGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);

    click.connect(clickGain).connect(this.master);
    click.start(t0);
    click.stop(t0 + 0.04);
    click.onended = (): void => {
      try {
        click.disconnect();
        clickGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 3: magic-tail — ascending two-note triangle starting 80ms after
    // the click so the unlock reads as "click → magic"
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 660, offset: 0, duration: 0.08, gain: 0.26 },
        { freq: 990, offset: 0.07, duration: 0.13, gain: 0.26 },
      ],
      t0 + 0.08,
    );
  }

  /**
   * Floor-teleport. Big ascending arpeggio across two octaves with parallel
   * harmony voice + sustained highpassed noise sparkle that builds. Played
   * when the player walks onto the stairs/sigil to advance to the next
   * floor. ~600 ms total. Voice-Gain 0.30 — loud, the audio celebration of
   * progressing floors.
   */
  playFloorTeleport(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // 7-note ascending arpeggio across two octaves (C4 → C6 spaced by major
    // third / fifth / octave ratios — not strictly diatonic but reads as
    // "up". Each note 75 ms = 525 ms total melody.)
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 262, offset: 0.0, duration: 0.08, gain: 0.3 }, // C4
        { freq: 330, offset: 0.075, duration: 0.08, gain: 0.3 }, // E4
        { freq: 392, offset: 0.15, duration: 0.08, gain: 0.3 }, // G4
        { freq: 523, offset: 0.225, duration: 0.08, gain: 0.3 }, // C5
        { freq: 659, offset: 0.3, duration: 0.08, gain: 0.3 }, // E5
        { freq: 783, offset: 0.375, duration: 0.08, gain: 0.3 }, // G5
        { freq: 1046, offset: 0.45, duration: 0.18, gain: 0.3 }, // C6 — sustained
      ],
      t0,
    );

    // Octave-up harmony voice — quarter volume so it adds shimmer
    this.playArpeggio(
      ctx,
      this.master,
      'triangle',
      [
        { freq: 523, offset: 0.0, duration: 0.08, gain: 0.1 },
        { freq: 659, offset: 0.075, duration: 0.08, gain: 0.1 },
        { freq: 783, offset: 0.15, duration: 0.08, gain: 0.1 },
        { freq: 1046, offset: 0.225, duration: 0.08, gain: 0.1 },
        { freq: 1318, offset: 0.3, duration: 0.08, gain: 0.1 },
        { freq: 1567, offset: 0.375, duration: 0.08, gain: 0.1 },
        { freq: 2093, offset: 0.45, duration: 0.18, gain: 0.1 },
      ],
      t0,
    );

    // Sustained highpassed-noise sparkle that builds across the whole sweep
    const noiseDur = 0.65;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.4); // build through the rise
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Menu-switch. Subtle UI tick — brief square blip for hover/keyboard nav
   * in the main menu. Designed to be quiet enough that fast keyboard
   * scrolling doesn't become annoying. Voice-Gain 0.18.
   */
  playMenuSwitch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1100, t0);
    osc.frequency.exponentialRampToValueAtTime(1450, t0 + 0.025);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);

    osc.connect(oscGain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.05);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Boss-death. Heavy fall: square pitching way down + lowpassed-noise crash
   * texture, followed by a fading "ghost trail" triangle for emotional decay.
   * Voice-Gain 0.42 main / 0.18 ghost. Plays for all bosses including the
   * Prismarch — the cosmetic-unlock celebration layers on top, not over it.
   */
  playBossDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: square fall — pitch dives from low to sub
    const fall = ctx.createOscillator();
    fall.type = 'square';
    fall.frequency.setValueAtTime(200, t0);
    fall.frequency.exponentialRampToValueAtTime(50, t0 + 0.3);

    const fallGain = ctx.createGain();
    fallGain.gain.setValueAtTime(0.0001, t0);
    fallGain.gain.exponentialRampToValueAtTime(0.42, t0 + 0.005);
    fallGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);

    fall.connect(fallGain).connect(this.master);
    fall.start(t0);
    fall.stop(t0 + 0.34);
    fall.onended = (): void => {
      try {
        fall.disconnect();
        fallGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: lowpassed-noise crash texture
    const noiseDur = 0.22;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 3: ghost-trail triangle — descending tone offset 250ms, the
    // "soul leaving the body" decay
    const ghost = ctx.createOscillator();
    ghost.type = 'triangle';
    ghost.frequency.setValueAtTime(800, t0 + 0.25);
    ghost.frequency.exponentialRampToValueAtTime(100, t0 + 0.75);

    const ghostGain = ctx.createGain();
    ghostGain.gain.setValueAtTime(0.0001, t0 + 0.25);
    ghostGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.27);
    ghostGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.78);

    ghost.connect(ghostGain).connect(this.master);
    ghost.start(t0 + 0.25);
    ghost.stop(t0 + 0.8);
    ghost.onended = (): void => {
      try {
        ghost.disconnect();
        ghostGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Prism-Special-Cast. Building magical energy — triangle rising with
   * octave-up parallel voice + bandpassed-noise sweep. Used for both
   * Prismarch's per-phase prism charge AND GemSeal's 3/3 activation
   * cinematic (same sound, different trigger). **Toned down 2026-05-08**
   * after user-flagged the original as "nervig" — pitch range dropped from
   * 300→800 Hz to 220→520 Hz (less piercing rise), main gain 0.34 → 0.20,
   * octave-up gain 0.17 → 0.09, noise sweep dropped one octave (1k→4k →
   * 700→2500) with gain 0.14 → 0.07. Charge fires every 5–6 s during the
   * Prismarch fight, so even small reductions add up.
   */
  playPrismSpecialCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: rising triangle (the energy build)
    const main = ctx.createOscillator();
    main.type = 'triangle';
    main.frequency.setValueAtTime(220, t0);
    main.frequency.exponentialRampToValueAtTime(520, t0 + 0.6);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.0001, t0);
    mainGain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.05);
    mainGain.gain.setValueAtTime(0.2, t0 + 0.55);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);

    main.connect(mainGain).connect(this.master);
    main.start(t0);
    main.stop(t0 + 0.72);
    main.onended = (): void => {
      try {
        main.disconnect();
        mainGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: octave-up parallel (shimmer harmony)
    const harm = ctx.createOscillator();
    harm.type = 'triangle';
    harm.frequency.setValueAtTime(440, t0);
    harm.frequency.exponentialRampToValueAtTime(1040, t0 + 0.6);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.0001, t0);
    harmGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.05);
    harmGain.gain.setValueAtTime(0.09, t0 + 0.55);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);

    harm.connect(harmGain).connect(this.master);
    harm.start(t0);
    harm.stop(t0 + 0.72);
    harm.onended = (): void => {
      try {
        harm.disconnect();
        harmGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 3: bandpassed-noise sweep — filter cutoff climbs from 700 to 2500
    const noiseDur = 0.7;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(700, t0);
    filter.frequency.exponentialRampToValueAtTime(2500, t0 + 0.6);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Prism-Explosion. Burst at the moment the Prismarch's charged special
   * fires — sub-thump + lowpassed-noise blast. **Re-tuned 2026-05-08** after
   * user clarified the previous "nervig" complaint was about the SPECIAL-CAST
   * (charge build-up), not the explosion. The over-aggressive dim made
   * Phase-2 (Tide Mandala) inaudible because that pattern has no visual
   * burst. Restored: thump 0.22 → 0.34, noise 0.18 → 0.26. Flash-click voice
   * stays removed (that was the piercing 1500 Hz click). Net: punchy boom
   * that audibly cues "charge released" without the harsh crack.
   */
  playPrismExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: square sub-thump
    const thump = ctx.createOscillator();
    thump.type = 'square';
    thump.frequency.setValueAtTime(140, t0);
    thump.frequency.exponentialRampToValueAtTime(45, t0 + 0.18);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, t0);
    thumpGain.gain.exponentialRampToValueAtTime(0.34, t0 + 0.005);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);

    thump.connect(thumpGain).connect(this.master);
    thump.start(t0);
    thump.stop(t0 + 0.22);
    thump.onended = (): void => {
      try {
        thump.disconnect();
        thumpGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: wide-band noise burst — explosion texture
    const noiseDur = 0.25;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    // Lowpass at 2k for a "punchy boom" rather than a hiss-y crackle
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.26, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Marquis-Mirror-Special. Glassy spatial whoosh for the Mirror Portal
   * teleport — triangle wavering frequency + highpassed-noise sweep climbing
   * in cutoff. **Toned down 2026-05-08** after user-flagged the original as
   * "nervig" — pitch range dropped from 1100→700→900 Hz to 600→400→500 Hz
   * (less piercing top end), main gain 0.30 → 0.18, noise gain 0.16 → 0.08
   * with cutoff 2k→6k → 1500→3500 (less hiss). Special fires every 8–12 s
   * during Phase 1, so even small intensity reductions add up.
   */
  playMarquisMirrorSpecial(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;

    // Voice 1: wobbling triangle — three-segment pitch curve
    const main = ctx.createOscillator();
    main.type = 'triangle';
    main.frequency.setValueAtTime(600, t0);
    main.frequency.exponentialRampToValueAtTime(400, t0 + 0.25);
    main.frequency.exponentialRampToValueAtTime(500, t0 + 0.5);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.0001, t0);
    mainGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04);
    mainGain.gain.setValueAtTime(0.18, t0 + 0.46);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);

    main.connect(mainGain).connect(this.master);
    main.start(t0);
    main.stop(t0 + 0.58);
    main.onended = (): void => {
      try {
        main.disconnect();
        mainGain.disconnect();
      } catch {
        // already disconnected
      }
    };

    // Voice 2: highpassed-noise sweep — filter climbs (the "glassy shimmer")
    const noiseDur = 0.55;
    const noiseBuf = this.makeNoiseBuffer(ctx, noiseDur);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, t0);
    filter.frequency.exponentialRampToValueAtTime(3500, t0 + 0.5);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter).connect(noiseGain).connect(this.master);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);
    noise.onended = (): void => {
      try {
        noise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // already disconnected
      }
    };
  }

  /**
   * Reserve a time slot for a pickup sound. Returns the AudioContext time at
   * which the sound should start. If a previous pickup is still playing,
   * queues this one immediately after with a small gap. Capped at
   * PICKUP_SLOT_MAX_LOOKAHEAD_SEC into the future so a flood doesn't queue
   * infinitely.
   */
  private acquirePickupSlot(ctx: AudioContext, soundDurationSec: number): number {
    const now = ctx.currentTime;
    const cappedQueue = Math.min(this.nextPickupSoundAt, now + PICKUP_SLOT_MAX_LOOKAHEAD_SEC);
    const startAt = Math.max(now, cappedQueue);
    this.nextPickupSoundAt = startAt + soundDurationSec + PICKUP_SLOT_GAP_SEC;
    return startAt;
  }

  /** Generate a short white-noise buffer. Used by both pilot recipes. */
  private makeNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }
}

let singleton: SfxSynth | null = null;
export function getSfxSynth(): SfxSynth {
  if (!singleton) singleton = new SfxSynth();
  return singleton;
}
