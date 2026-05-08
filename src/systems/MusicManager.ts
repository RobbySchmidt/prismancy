import Phaser from 'phaser';

/**
 * Looping background-music manager.
 *
 * Singleton because Phaser sounds outlive scenes — when GameScene transitions
 * to EndScene, we want the playing track to keep ringing during the scene
 * swap (and the new scene gets a chance to fade it out). Holding the active
 * sound on a global keeps that simple.
 *
 * Usage:
 *   getMusicManager().playTrack(this, 'floor-emerald');
 *   getMusicManager().stop(this);
 *   getMusicManager().duck();   // pause-menu dim
 *   getMusicManager().unduck();
 *
 * `playTrack` is idempotent — calling with the same key while it's already
 * playing is a no-op. Calling with a different key crossfades over `fadeMs`
 * (default 1200 ms).
 *
 * If the requested track key isn't in the audio cache (file missing or load
 * failed), `playTrack` silently stops the current track and does nothing
 * else. That's how floor-onyx / boss-onyx / prismarch can be pre-wired
 * before their MP3s exist.
 */

export type MusicTrackKey =
  | 'title'
  | 'floor-emerald'
  | 'boss-emerald'
  | 'floor-sapphire'
  | 'boss-sapphire'
  | 'floor-onyx'
  | 'boss-marquis-of-mirages'
  | 'boss-the-prismarch'
  | 'victory-credits';

export const ALL_MUSIC_TRACKS: readonly MusicTrackKey[] = [
  'title',
  'floor-emerald',
  'boss-emerald',
  'floor-sapphire',
  'boss-sapphire',
  'floor-onyx',
  'boss-marquis-of-mirages',
  'boss-the-prismarch',
  'victory-credits',
] as const;

const DUCK_LEVEL = 0.3;
const DEFAULT_FADE_MS = 1200;
const DEFAULT_STOP_FADE_MS = 600;

/** Map a floor id to its idle-track key. */
export function floorIdToFloorTrack(floorId: string): MusicTrackKey | null {
  switch (floorId) {
    case 'emerald-forest':
      return 'floor-emerald';
    case 'sapphire-swamp':
      return 'floor-sapphire';
    case 'onyx-mansion':
      return 'floor-onyx';
    default:
      return null;
  }
}

/** Map a floor id (or Prismarch override) to its boss-track key. */
export function bossTrackForFloor(floorId: string, isPrismarch: boolean): MusicTrackKey | null {
  if (isPrismarch) return 'boss-the-prismarch';
  switch (floorId) {
    case 'emerald-forest':
      return 'boss-emerald';
    case 'sapphire-swamp':
      return 'boss-sapphire';
    case 'onyx-mansion':
      return 'boss-marquis-of-mirages';
    default:
      return null;
  }
}

/**
 * Sound surface we actually use. `Phaser.Sound.BaseSound` doesn't expose
 * `volume` in its public typings even though every concrete backend
 * (WebAudio / HTMLAudio / NoAudio) implements it. Cast through this when
 * we need to read or write the volume.
 */
type MusicSound = Phaser.Sound.BaseSound & {
  volume: number;
  setVolume(v: number): unknown;
};

class MusicManager {
  private current: Phaser.Sound.BaseSound | null = null;
  private currentKey: MusicTrackKey | null = null;
  private masterVolume = 0.55;
  private duckLevel = 1.0;
  /**
   * Per-sound generation counter. Each new fade on a sound bumps its token;
   * any in-flight RAF callback that sees a stale token bails out. Lets
   * fades supersede each other cleanly without scene-coupling.
   */
  private fadeTokens: WeakMap<Phaser.Sound.BaseSound, number> = new WeakMap();

  /** Effective per-sound volume = master × duck. */
  private effectiveVolume(): number {
    return this.masterVolume * this.duckLevel;
  }

  isPlaying(): boolean {
    return this.current?.isPlaying ?? false;
  }

  getCurrentKey(): MusicTrackKey | null {
    return this.currentKey;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.applyVolumeToCurrent();
  }

  duck(level: number = DUCK_LEVEL): void {
    this.duckLevel = Math.max(0, Math.min(1, level));
    this.applyVolumeToCurrent();
  }

  unduck(): void {
    this.duck(1.0);
  }

  private applyVolumeToCurrent(): void {
    const sound = this.current;
    if (!sound) return;
    // Bump the fade-token so any in-flight fade-in/out on this sound bails
    // out — user-driven volume changes win immediately.
    this.fadeTokens.set(sound, (this.fadeTokens.get(sound) ?? 0) + 1);
    (sound as MusicSound).setVolume(this.effectiveVolume());
  }

  /**
   * Drive a volume fade on `sound` from `fromVol` to `toVol` over `durationMs`,
   * using `requestAnimationFrame` instead of a scene tween. Critical: scene
   * tweens are bound to the scene's TweenManager, which gets destroyed on
   * scene shutdown — so a crossfade started during `MainMenu.create` is
   * murdered the moment the user presses SPACE. RAF is browser-global and
   * survives scene transitions, so the fade plays out seamlessly across
   * MainMenu→Game, Game→EndScene, floor→floor, etc. Each fade tags `sound`
   * with a generation token so a later fade on the same sound supersedes
   * earlier in-flight ones cleanly.
   */
  private startFade(
    sound: MusicSound,
    fromVol: number,
    toVol: number,
    durationMs: number,
    onComplete?: () => void,
  ): void {
    const myToken = (this.fadeTokens.get(sound) ?? 0) + 1;
    this.fadeTokens.set(sound, myToken);
    const startTime = performance.now();
    const step = (now: number): void => {
      if (this.fadeTokens.get(sound) !== myToken) return;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const v = fromVol + (toVol - fromVol) * t;
      try {
        sound.setVolume(v);
      } catch {
        // Sound was destroyed (e.g., Phaser auto-cleanup on a scene shutdown
        // we don't control). Drop the fade silently.
        this.fadeTokens.delete(sound);
        return;
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this.fadeTokens.delete(sound);
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(step);
  }

  /**
   * Switch to `key`. If already playing the same key, no-op. Otherwise
   * crossfade over `fadeMs` (old fades out + new fades in simultaneously).
   * If `key` isn't in the audio cache, leaves the current track playing
   * (no abrupt stop).
   *
   * `firstPlayFadeMs` lets a caller override the near-instant ramp used when
   * there's no current track. Cinematic moments (e.g. the post-fade EndScene
   * credits theme) want this longer so the new track swells in instead of
   * snapping; the default 120 ms exists because for the title screen any
   * slower trap means a quick SPACE press cuts the title fade-out short.
   */
  playTrack(
    scene: Phaser.Scene,
    key: MusicTrackKey,
    opts: { fadeMs?: number; firstPlayFadeMs?: number } = {},
  ): void {
    if (this.currentKey === key && this.current?.isPlaying) return;

    if (!scene.cache.audio.exists(key)) {
      // Track not loaded — keep the current track playing. Better than a
      // sudden silence if a track is misnamed or was never generated.
      return;
    }

    const fadeMs = opts.fadeMs ?? DEFAULT_FADE_MS;

    const old = this.current;
    if (old) {
      const startV = (old as MusicSound).volume;
      this.startFade(old as MusicSound, startV, 0, fadeMs, () => {
        old.stop();
        old.destroy();
      });
    }

    const sound = scene.sound.add(key, { loop: true, volume: 0 });
    sound.play();
    if (old) {
      // Crossfade — fade in the new track in parallel to the old one fading out.
      this.startFade(sound as MusicSound, 0, this.effectiveVolume(), fadeMs);
    } else {
      // First play with nothing to crossfade against (e.g. opening MainMenu).
      // Default is a near-instant ramp; cinematic callers (EndScene credits)
      // can opt into a longer swell via `firstPlayFadeMs`.
      const firstPlayFade = opts.firstPlayFadeMs ?? 120;
      this.startFade(sound as MusicSound, 0, this.effectiveVolume(), firstPlayFade);
    }

    this.current = sound;
    this.currentKey = key;
  }

  /** Fade out and stop the active track. Safe even when nothing is playing. */
  stop(_scene: Phaser.Scene, opts: { fadeMs?: number } = {}): void {
    const fadeMs = opts.fadeMs ?? DEFAULT_STOP_FADE_MS;
    const old = this.current;
    if (!old) return;
    const startV = (old as MusicSound).volume;
    this.startFade(old as MusicSound, startV, 0, fadeMs, () => {
      old.stop();
      old.destroy();
    });
    this.current = null;
    this.currentKey = null;
  }

  /**
   * Hard stop without fade — use only when you actively want a cliff-edge
   * transition (currently unused but kept as an escape hatch).
   */
  hardStop(): void {
    const old = this.current;
    if (old) {
      this.fadeTokens.set(old, (this.fadeTokens.get(old) ?? 0) + 1);
      old.stop();
      old.destroy();
    }
    this.current = null;
    this.currentKey = null;
  }
}

let singleton: MusicManager | null = null;
export function getMusicManager(): MusicManager {
  if (!singleton) singleton = new MusicManager();
  return singleton;
}
